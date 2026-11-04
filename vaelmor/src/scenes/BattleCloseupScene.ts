/**
 * Écran de combat rapproché (jalon M8, GDD §11, décisions n°204 à n°222).
 *
 * Scène superposée au combat : `BattleScene` la lance au début du combat et lui
 * confie chaque échange ou soin au bâton (`play`) sous forme de données
 * (`CloseupSpec`) ; elle ne connaît pas l'état du combat. La chronologie vient
 * de `logic/anim/closeup.ts`.
 *
 * Deux caméras : la scène (décor, combattants, effets : elle zoome au critique
 * et tremble à l'impact) et l'interface (bandeaux, voile d'entrée, flash plein
 * écran : elle ne bouge jamais).
 *
 * Mise en page (n°206, n°207) : fond du terrain du défenseur peint par code
 * (×3), un socle par combattant, la compagnie et les alliés à gauche, les
 * ennemis à droite ; bandeaux du haut (nom, classe, niveau) et du bas (arme,
 * Préc / Dég / Crit, PV en chiffres et en barre à crans façon GBA), aux couleurs du camp.
 *
 * Effets (lot 3, GDD §11.3 à §11.5) : traînées fantômes au dash, coupures selon
 * l'arme, étincelles ou particules de l'élément, arrêt sur image, secousse,
 * chiffres colorés ; critique : fond assombri, attaquant en contre-jour, zoom
 * ×1,5, lignes de vitesse, coupes enchaînées, flash plein écran ; sort : cercle
 * runique, orbe à traînée, explosion ; soin : lueur douce et particules montantes.
 * « Effets réduits » (n°221) : flashs atténués, secousses divisées par trois, pas de zoom.
 *
 * Entrée, Espace, Échap ou un clic passent l'échange : tout se pose aussitôt.
 */
import Phaser from 'phaser';
import type { BackdropId, CloseupTimings, CritStyle, FighterAnim, FighterDef, ProjectileId, SlashId } from '../data/schemas';
import { critSlashes, exchangeShapes, frameAt, strikeSteps, type AttackKind, type Step } from '../logic/anim/closeup';
import type { Strike, Team } from '../logic/tactics/types';
import { BATTLE_TEX, ensureMapSprite } from '../render/battleTextures';
import { fighterFrame, fighterKey, hasFighterSheet } from '../render/closeupFighters';
import { FX_TEX, ensureCloseupFx } from '../render/closeupFx';
import { BACKDROP_H, BACKDROP_W, HORIZON, PLATFORM_TOP, PLATFORM_W, paintBackdrop, paintPlatform, type PaintedImage } from '../render/closeupBackdrop';
import { PALETTE, mixColor } from '../render/palette';
import { drawPanel } from '../ui/panel';
import { addText, fitText, setText, type PixelText } from '../ui/text';
import { TEAM_COLOR } from './BattleHudScene';
import { SCENES } from './keys';

/** Agrandissement du fond peint (320×180 → 960×540). */
const ART = 3;
/** Agrandissement d'un sprite de carte utilisé en repli (n°215). */
const MAP_SPRITE_SCALE = 4;
/** Haut des socles, en pixels d'écran ; les pieds se posent au milieu de leur dessus. */
const PLATFORM_Y = (HORIZON + 22) * ART;
const FEET_Y = PLATFORM_Y + Math.round((PLATFORM_TOP / 2) * ART);
/** Centres des socles : au contact (distance 1) ou à distance. */
const X_NEAR = { left: 330, right: 630 } as const;
const X_FAR = { left: 220, right: 740 } as const;
/** Bandeaux. */
const TOP_H = 52;
const BOTTOM_Y = 408;
/** Hauteur du torse au-dessus des pieds (impacts, projectiles, chiffres). */
const CHEST = 66;
/** Zoom du critique (GDD §11.3). */
const CRIT_ZOOM = 1.5;
const HEAL_COLOR = 0x8fdc7a;

export interface CloseupFighter {
  readonly id: string;
  readonly name: string;
  /** « Gardien des Marées · Niv 4 ». */
  readonly title: string;
  readonly team: Team;
  /** Apparence de carte (repli tant qu'il n'y a pas de feuille peinte). */
  readonly sprite: string;
  readonly isBoss: boolean;
  readonly hp: number;
  readonly maxHp: number;
  readonly weaponName: string;
  /** Élément de l'arme (particules) et sa couleur (étincelles, cercle runique, sort), ou null. */
  readonly element: string | null;
  readonly elementColor: number | null;
  /** Prévision affichée ; null = ne peut pas frapper (pas de riposte). */
  readonly odds: { readonly hit: number; readonly damage: number; readonly crit: number; readonly doubles: boolean } | null;
  readonly kind: AttackKind;
  readonly projectile: ProjectileId | null;
  /** Coupure dessinée à l'impact d'un coup de mêlée. */
  readonly slash: SlashId;
  /** Chorégraphie de son critique au corps à corps (assaut, tourbillon, bond). */
  readonly critStyle: CritStyle;
  /** Fond du socle (terrain de sa case). */
  readonly platform: BackdropId;
  /** Feuille peinte de l'écran rapproché (`battleAnims.json › fighters`), ou null : sprite de carte agrandi. */
  readonly painted: FighterDef | null;
}

export interface CloseupSpec {
  readonly left: CloseupFighter;
  readonly right: CloseupFighter;
  readonly backdrop: BackdropId;
  readonly distance: number;
  readonly strikes: readonly Strike[];
  /** Soin au bâton : `left` soigne `right` (pas de coups). */
  readonly heal?: { readonly amount: number; readonly hpAfter: number };
  /** Unités qui tombent à la fin de l'échange (dissolution). */
  readonly falls: readonly string[];
  readonly timings: CloseupTimings;
  /** Facteur de vitesse au moment de l'appel (Rapides, Maj maintenue, ralenti de debug). */
  readonly factor: () => number;
  /** « Effets réduits » (n°221). */
  readonly reduced: boolean;
  /** Étalonnage de la zone (matrice 5×4) et vignettage, selon la qualité ; null : aucun filtre. */
  readonly grade: { readonly matrix: readonly number[]; readonly vignette: { readonly radius: number; readonly strength: number } | null } | null;
}

interface FighterView {
  readonly spec: CloseupFighter;
  readonly side: 'left' | 'right';
  readonly sprite: Phaser.GameObjects.Sprite;
  readonly shadow: Phaser.GameObjects.Ellipse;
  readonly home: { x: number; y: number };
  /** Sens vers l'adversaire : +1 vers la droite. */
  readonly dir: 1 | -1;
  readonly bar: HpBar;
  /** Agrandissement à l'écran (feuille peinte : celui de ses données ; repli : ×4). */
  readonly scale: number;
  /** Feuille peinte chargée, ou null. */
  readonly painted: FighterDef | null;
}

interface HpBar {
  readonly ticks: Phaser.GameObjects.Rectangle[];
  readonly label: PixelText;
  shown: number;
  readonly max: number;
}

/** Mouvement des particules d'un impact selon l'élément de l'arme (GDD §11.5). */
interface Burst {
  readonly speed: { readonly min: number; readonly max: number };
  readonly gravityY: number;
  readonly lifespan: number;
  readonly scale: { readonly start: number; readonly end: number };
  readonly angle: { readonly min: number; readonly max: number };
}

const BURSTS: Readonly<Record<string, Burst>> = {
  /** Étincelles d'une arme sans élément. */
  aucun: { speed: { min: 140, max: 320 }, gravityY: 260, lifespan: 300, scale: { start: 2, end: 0.5 }, angle: { min: 0, max: 360 } },
  /** Braises qui montent. */
  cendre: { speed: { min: 50, max: 150 }, gravityY: -140, lifespan: 650, scale: { start: 2.5, end: 0.5 }, angle: { min: 200, max: 340 } },
  /** Bulles qui flottent. */
  maree: { speed: { min: 30, max: 110 }, gravityY: -60, lifespan: 750, scale: { start: 3, end: 1 }, angle: { min: 180, max: 360 } },
  /** Feuilles qui retombent. */
  racine: { speed: { min: 70, max: 180 }, gravityY: 220, lifespan: 700, scale: { start: 2.5, end: 1.5 }, angle: { min: 200, max: 340 } },
  /** Éclats dorés en étoile. */
  lanterne: { speed: { min: 120, max: 260 }, gravityY: 0, lifespan: 480, scale: { start: 2.5, end: 0.5 }, angle: { min: 0, max: 360 } },
  /** Poussière qui retombe. */
  pierre: { speed: { min: 80, max: 190 }, gravityY: 320, lifespan: 600, scale: { start: 3, end: 1.5 }, angle: { min: 190, max: 350 } },
};

const BACKDROP_KEY = (id: BackdropId): string => `closeup:bg:${id}`;
const PLATFORM_KEY = (id: BackdropId): string => `closeup:platform:${id}`;

/** Copie d'une image peinte dans une texture (une seule fois par clé). */
function ensureImageTexture(scene: Phaser.Scene, key: string, paint: () => PaintedImage): void {
  if (scene.textures.exists(key)) return;
  const img = paint();
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const data = ctx.createImageData(img.width, img.height);
  img.pixels.forEach((c, i) => {
    if (c < 0) return;
    data.data[i * 4] = (c >> 16) & 255;
    data.data[i * 4 + 1] = (c >> 8) & 255;
    data.data[i * 4 + 2] = c & 255;
    data.data[i * 4 + 3] = 255;
  });
  ctx.putImageData(data, 0, 0);
  scene.textures.addCanvas(key, canvas);
}

export class BattleCloseupScene extends Phaser.Scene {
  /** Décor, combattants et effets (caméra principale : zoom et secousse). */
  private stage!: Phaser.GameObjects.Container;
  /** Bandeaux (caméra d'interface, fixe). */
  private ui!: Phaser.GameObjects.Container;
  private uiCam!: Phaser.Cameras.Scene2D.Camera;
  private veil!: Phaser.GameObjects.Rectangle;
  private flash!: Phaser.GameObjects.Rectangle;
  /** Assombrit le fond seul (critique, GDD §11.3) : entre le décor et les combattants. */
  private dim: Phaser.GameObjects.Rectangle | null = null;
  /** Lignes de vitesse du critique (derrière les combattants). */
  private lines: Phaser.GameObjects.Graphics | null = null;
  private views = new Map<string, FighterView>();
  private spec: CloseupSpec | null = null;
  private skipping = false;
  private pending = new Set<() => void>();
  private busy = false;

  constructor() {
    super(SCENES.battleCloseup);
  }

  create(): void {
    const { width, height } = this.scale;
    ensureCloseupFx(this);
    this.stage = this.add.container(0, 0);
    this.ui = this.add.container(0, 0).setDepth(30);
    this.flash = this.add.rectangle(0, 0, width, height, 0xffffff, 0).setOrigin(0, 0).setDepth(60);
    this.veil = this.add.rectangle(0, 0, width, height, PALETTE.encre, 0).setOrigin(0, 0).setDepth(70);
    this.uiCam = this.cameras.add(0, 0, width, height);
    this.cameras.main.ignore([this.ui, this.flash, this.veil]);
    this.uiCam.ignore(this.stage);
    this.cameras.main.setVisible(false);
    this.uiCam.setVisible(false);
    const skip = (): void => this.skip();
    this.input.keyboard?.on('keydown-ENTER', skip);
    this.input.keyboard?.on('keydown-SPACE', skip);
    this.input.keyboard?.on('keydown-ESC', skip);
    this.input.on(Phaser.Input.Events.POINTER_DOWN, skip);
  }

  /** Vrai pendant qu'un échange se joue. */
  get playing(): boolean {
    return this.busy;
  }

  /** Joue un échange (ou un soin) ; se résout quand l'écran est refermé. */
  async play(spec: CloseupSpec): Promise<void> {
    this.busy = true;
    this.spec = spec;
    this.skipping = false;
    try {
      this.build(spec);
      await this.entry(spec);
      if (spec.heal) await this.playHeal(spec.heal.amount, spec.heal.hpAfter);
      const kindOf = (id: string): AttackKind => (id === spec.left.id ? spec.left.kind : spec.right.kind);
      const styleOf = (id: string): CritStyle => (id === spec.left.id ? spec.left.critStyle : spec.right.critStyle);
      const shapes = exchangeShapes(spec.strikes, kindOf, styleOf);
      for (let i = 0; i < spec.strikes.length; i++) {
        const strike = spec.strikes[i] as Strike;
        const shape = shapes[i];
        if (!shape) continue;
        await this.playStrike(strike, strikeSteps(shape, spec.timings));
        if (i < spec.strikes.length - 1) await this.wait(spec.timings.between);
      }
      for (const id of spec.falls) await this.dissolve(id);
      await this.wait(spec.timings.pose);
      await this.exit(spec);
    } finally {
      this.teardown();
      this.busy = false;
    }
  }

  /** Passe l'échange : les attentes en cours se terminent, les suivantes sont immédiates. */
  skip(): void {
    if (!this.busy || this.skipping) return;
    this.skipping = true;
    for (const tween of this.tweens.getTweens()) tween.complete();
    for (const resolve of [...this.pending]) resolve();
    this.pending.clear();
  }

  /* ---------- Construction ---------- */

  private build(spec: CloseupSpec): void {
    this.teardown();
    const cam = this.cameras.main;
    cam.setVisible(true).setZoom(1).setScroll(0, 0);
    this.uiCam.setVisible(true);
    cam.filters.internal.clear();
    cam.filters.external.clear();
    if (spec.grade) {
      cam.filters.internal.addColorMatrix().colorMatrix.set([...spec.grade.matrix]);
      if (spec.grade.vignette) cam.filters.external.addVignette(0.5, 0.5, spec.grade.vignette.radius, spec.grade.vignette.strength);
    }
    ensureImageTexture(this, BACKDROP_KEY(spec.backdrop), () => paintBackdrop(spec.backdrop));
    // Le fond déborde un peu : la secousse et le zoom ne découvrent jamais le bord.
    const bg = this.add.image(-24, -24, BACKDROP_KEY(spec.backdrop)).setOrigin(0, 0).setScale((BACKDROP_W * ART + 48) / BACKDROP_W, (BACKDROP_H * ART + 48) / BACKDROP_H);
    const far = spec.distance > 1;
    const platforms: Phaser.GameObjects.Image[] = [];
    const bodies: Phaser.GameObjects.GameObject[] = [];
    for (const fighter of [spec.left, spec.right]) {
      const side = fighter === spec.left ? 'left' : 'right';
      const x = (far ? X_FAR : X_NEAR)[side];
      ensureImageTexture(this, PLATFORM_KEY(fighter.platform), () => paintPlatform(fighter.platform));
      platforms.push(this.add.image(x, PLATFORM_Y, PLATFORM_KEY(fighter.platform)).setOrigin(0.5, 0).setScale(ART));
      const shadow = this.add.ellipse(x, FEET_Y, 60, 12, PALETTE.ombreProfonde, 0.35);
      const painted = fighter.painted && hasFighterSheet(this, fighter.painted) ? fighter.painted : null;
      let sprite: Phaser.GameObjects.Sprite;
      let scale = MAP_SPRITE_SCALE;
      if (painted) {
        scale = painted.scale;
        sprite = this.add.sprite(x, FEET_Y + 2, fighterKey(painted.sheet), fighterFrame(this, painted, 'garde') ?? 0);
        // Les pieds (`feet`) se posent sur le socle, quel que soit le côté.
        const fx = painted.feet[0] / painted.frame[0];
        sprite.setOrigin(side === 'right' ? 1 - fx : fx, (painted.feet[1] + 1) / painted.frame[1]).setScale(scale);
      } else {
        ensureMapSprite(this, fighter.sprite, fighter.team);
        sprite = this.add.sprite(x, FEET_Y + 2, BATTLE_TEX.ms(fighter.sprite, fighter.team), BATTLE_TEX.msFrame('side', 0)).setOrigin(0.5, 1).setScale(scale);
      }
      sprite.setFlipX(side === 'right');
      bodies.push(shadow, sprite);
      const bar = this.buildPanels(fighter, side);
      this.views.set(fighter.id, { spec: fighter, side, sprite, shadow, home: { x, y: FEET_Y + 2 }, dir: side === 'left' ? 1 : -1, bar, scale, painted });
    }
    this.dim = this.add.rectangle(-40, -40, this.scale.width + 80, this.scale.height + 80, PALETTE.ombreProfonde, 1).setOrigin(0, 0).setAlpha(0);
    this.lines = this.add.graphics();
    this.stage.add([bg, ...platforms, this.dim, this.lines, ...bodies]);
    this.veil.setFillStyle(PALETTE.encre, 1).setAlpha(1);
    this.flash.setAlpha(0);
  }

  /** Bandeau du haut (nom, classe et niveau) et du bas (arme, prévision, PV) d'un combattant. */
  private buildPanels(f: CloseupFighter, side: 'left' | 'right'): HpBar {
    const W = this.scale.width;
    const color = TEAM_COLOR[f.team];
    const fill = mixColor(0x14121f, color, 0.18);
    const add = (o: Phaser.GameObjects.GameObject): void => {
      this.ui.add(o);
    };
    // Haut : nom et titre.
    const tw = 330;
    const tx = side === 'left' ? 16 : W - 16 - tw;
    add(drawPanel(this, tx, 12, tw, TOP_H, { scale: 2, fill, fillAlpha: 0.92 }));
    add(this.add.rectangle(tx + 10, 18, 4, TOP_H - 12, color, 1).setOrigin(0, 0));
    add(fitText(addText(this, tx + 22, 16, f.name, { scale: 1, color: PALETTE.parchemin }), tw - 34));
    add(fitText(addText(this, tx + 22, 36, f.title + (f.isBoss ? ' · Boss' : ''), { scale: 1, color: f.isBoss ? PALETTE.braise : PALETTE.metalClair }), tw - 34));
    // Bas : arme, prévision, PV.
    const bw = W / 2 - 18;
    const bx = side === 'left' ? 12 : W / 2 + 6;
    const bh = this.scale.height - BOTTOM_Y - 10;
    add(drawPanel(this, bx, BOTTOM_Y, bw, bh, { scale: 2, fill, fillAlpha: 0.94 }));
    add(this.add.rectangle(bx + 8, BOTTOM_Y + 8, bw - 16, 3, color, 0.9).setOrigin(0, 0));
    add(fitText(addText(this, bx + 16, BOTTOM_Y + 14, f.weaponName, { scale: 1, color: f.elementColor ?? PALETTE.parchemin }), bw / 2));
    const stats = f.odds ? `Préc ${f.odds.hit}   Dég ${f.odds.damage}${f.odds.doubles ? ' ×2' : ''}   Crit ${f.odds.crit}` : this.spec?.heal ? '' : 'Pas de riposte';
    add(addText(this, bx + bw - 16, BOTTOM_Y + 14, stats, { scale: 1, color: PALETTE.metalClair, align: 'right' }));
    // PV : chiffre puis barre à crans (un cran par PV, façon GBA).
    const label = addText(this, bx + 16, BOTTOM_Y + 52, `${f.hp}`, { scale: 2, color: PALETTE.parchemin });
    add(addText(this, bx + 16, BOTTOM_Y + 40, 'PV', { scale: 1, color: PALETTE.metalClair }));
    add(label);
    const barX = bx + 86;
    const barW = bw - 104;
    const perRow = Math.min(f.maxHp, 40);
    const rows = Math.ceil(f.maxHp / perRow);
    const tickW = Math.max(3, Math.floor(barW / perRow) - 1);
    const tickH = rows > 1 ? 9 : 16;
    const ticks: Phaser.GameObjects.Rectangle[] = [];
    add(this.add.rectangle(barX - 3, BOTTOM_Y + 50, perRow * (tickW + 1) + 5, rows * (tickH + 2) + 4, PALETTE.encre, 1).setOrigin(0, 0));
    for (let i = 0; i < f.maxHp; i++) {
      const r = Math.floor(i / perRow);
      const c = i % perRow;
      const tick = this.add.rectangle(barX + c * (tickW + 1), BOTTOM_Y + 52 + r * (tickH + 2), tickW, tickH, 0, 1).setOrigin(0, 0);
      ticks.push(tick);
      add(tick);
    }
    const bar: HpBar = { ticks, label, shown: f.hp, max: f.maxHp };
    this.paintBar(bar, f.hp);
    return bar;
  }

  private paintBar(bar: HpBar, hp: number): void {
    const ratio = hp / bar.max;
    const on = ratio > 0.5 ? PALETTE.vertDore : ratio > 0.25 ? PALETTE.jauneBle : PALETTE.rougeCendre;
    bar.ticks.forEach((t, i) => t.setFillStyle(i < hp ? on : PALETTE.ombreProfonde, 1));
    setText(bar.label, `${Math.max(0, Math.round(hp))}`);
  }

  private teardown(): void {
    this.stage.removeAll(true);
    this.ui.removeAll(true);
    this.dim = null;
    this.lines = null;
    this.views.clear();
    this.cameras.main.setVisible(false).setZoom(1).setScroll(0, 0);
    this.uiCam.setVisible(false);
  }

  /* ---------- Entrée et sortie ---------- */

  private async entry(spec: CloseupSpec): Promise<void> {
    this.veil.setFillStyle(PALETTE.encre, 1).setAlpha(1);
    await this.tween({ targets: this.veil, alpha: 0, duration: spec.timings.entry });
  }

  private async exit(spec: CloseupSpec): Promise<void> {
    this.veil.setFillStyle(PALETTE.encre, 1);
    await this.tween({ targets: this.veil, alpha: 1, duration: spec.timings.exit });
  }

  /* ---------- Un coup ---------- */

  private async playStrike(strike: Strike, steps: readonly Step[]): Promise<void> {
    const a = this.views.get(strike.attackerId);
    const d = this.views.get(strike.targetId);
    const spec = this.spec;
    if (!a || !d || !spec) return;
    const t = spec.timings;
    const crit = strike.crit && strike.hit;
    const cuts = critSlashes(a.spec.slash, t.critCuts);
    let cut = 0;
    const anim = this.strikeAnim(a, strike);
    const multi = (a.painted?.anims[anim]?.frames ?? 1) > 1;
    // Animation peinte de plusieurs images : elle suit la chronologie du coup (image d'impact à la frappe).
    if (multi && a.painted) {
      const def = a.painted;
      const info = def.anims[anim];
      const last = steps[steps.length - 1];
      const total = last ? last.at + last.ms : 0;
      const clock = { ms: 0 };
      void this.tween({
        targets: clock,
        ms: total,
        duration: total,
        onUpdate: () => {
          const f = frameAt(steps, clock.ms, info?.frames ?? 1, info?.impact ?? 0);
          a.sprite.setFrame(fighterFrame(this, def, anim, f) ?? 0);
        },
      });
    }
    for (const step of steps) {
      if (!this.busy) return;
      // Poses d'une feuille d'une image par animation (le héros) : garde, geste, coup reçu.
      if (!multi) {
        if (step.name === 'dash' || step.name === 'draw' || step.name === 'rune' || step.name === 'strike' || step.name === 'cut') this.pose(a, anim);
        if (step.name === 'back' || step.name === 'settle') this.pose(a, 'garde');
      }
      switch (step.name) {
        case 'dark':
          await this.critIntro(a, step.ms);
          break;
        case 'prep':
          await this.tween({ targets: a.sprite, x: a.home.x - a.dir * 10, scaleY: a.scale * 0.94, duration: step.ms, ease: 'Quad.easeOut' });
          break;
        case 'dash': {
          const contact = d.home.x - a.dir * 96;
          this.ghosts(a, step.ms, crit ? 0xffffff : (a.spec.elementColor ?? 0xffffff));
          if (crit) this.speedLines(a.dir, step.ms + t.critCut * t.critCuts);
          await this.tween({ targets: a.sprite, x: contact, scaleY: a.scale, duration: step.ms, ease: 'Quad.easeIn' });
          break;
        }
        case 'draw':
          await this.tween({ targets: a.sprite, x: a.home.x, y: a.home.y - 6, scaleY: a.scale, duration: step.ms, ease: 'Quad.easeOut' });
          break;
        case 'rune':
          this.rune(a, step.ms);
          await this.tween({ targets: a.sprite, x: a.home.x, y: a.home.y - 4, scaleY: a.scale, duration: step.ms });
          break;
        case 'choreo':
          if (a.spec.critStyle === 'tourbillon') await this.tourbillon(a, d, strike, t);
          else await this.bond(a, d, t);
          break;
        case 'spell':
          await this.spell(a, d, crit, step.ms);
          break;
        case 'fly':
          await this.projectile(a, d, step.ms);
          break;
        case 'strike':
        case 'cut':
          if (strike.hit) {
            // Silhouette blanche et flash d'écran sur deux ou trois images (GDD §11.2, §11.5).
            this.whiteFlash(d.sprite, true);
            this.time.delayedCall(34, () => this.whiteFlash(d.sprite, false));
            this.screenFlash(step.name === 'cut' ? 0.85 : 0.45, step.name === 'cut' ? 50 : 34);
            if (a.spec.kind === 'melee') this.slash(d, step.name === 'cut' ? (cuts[cut++] ?? a.spec.slash) : a.spec.slash, a, step.name === 'cut');
          }
          await this.wait(step.ms);
          break;
        case 'impact':
          await this.impact(strike, a, d, step.ms, t);
          break;
        case 'recoil':
          if (strike.hit) {
            this.pose(d, 'coup');
            // Recul fort en mêlée, léger à distance (GDD §11.4).
            const push = crit ? 26 : a.spec.kind === 'melee' ? 16 : 8;
            await this.tween({ targets: d.sprite, x: d.home.x + a.dir * push, duration: step.ms / 2, yoyo: true, ease: 'Quad.easeOut' });
          } else await this.wait(step.ms);
          break;
        case 'pose':
          await this.wait(step.ms);
          break;
        case 'back':
        case 'settle':
          if (this.dim && this.dim.alpha > 0) void this.tween({ targets: this.dim, alpha: 0, duration: step.ms });
          if (crit) this.zoomTo(1, null, step.ms);
          await this.tween({ targets: a.sprite, x: a.home.x, y: a.home.y, scaleY: a.scale, duration: step.ms, ease: 'Quad.easeOut' });
          d.sprite.setPosition(d.home.x, d.home.y);
          if (strike.targetHp > 0 || !this.spec?.falls.includes(d.spec.id)) this.pose(d, 'garde');
          if (multi) this.pose(a, 'garde');
          break;
      }
    }
  }

  /** Animation du coup : critique (s'il touche), tir ou sort (`ranged`), sinon attaque. */
  private strikeAnim(a: FighterView, strike: Strike): FighterAnim {
    const def = a.painted;
    if (!def) return 'attaque';
    if (strike.crit && strike.hit && def.anims.critique) return 'critique';
    if (a.spec.kind !== 'melee' && def.ranged && def.anims[def.ranged]) return def.ranged;
    return 'attaque';
  }

  /** Pose une image fixe d'une animation (feuilles peintes seulement). */
  private pose(v: FighterView, anim: FighterAnim, frame = 0): void {
    if (!v.painted) return;
    const f = fighterFrame(this, v.painted, anim, frame);
    if (f !== null) v.sprite.setFrame(f);
  }

  private async impact(strike: Strike, a: FighterView, d: FighterView, ms: number, t: CloseupTimings): Promise<void> {
    if (!strike.hit) {
      // Esquive : la cible glisse en arrière (une traînée la suit), « Raté » en gris.
      this.number(d, 'Raté', PALETTE.metalClair);
      this.ghosts(d, ms, PALETTE.metalClair, 2);
      await this.tween({ targets: d.sprite, x: d.home.x + a.dir * 40, y: d.home.y - 10, duration: ms, yoyo: true, ease: 'Quad.easeOut' });
      return;
    }
    this.burst(d.home.x - a.dir * 12, d.home.y - CHEST, a.spec.kind === 'melee' ? null : a.spec.element, a.spec.elementColor, strike.crit ? 26 : 12);
    if (a.spec.kind === 'magic') this.ring(d.home.x, d.home.y - CHEST, a.spec.elementColor ?? PALETTE.cyanEclat);
    const px = (strike.crit ? t.shake.crit : t.shake.hit) / (this.spec?.reduced ? 3 : 1);
    this.cameras.main.shake(this.scaled(strike.crit ? t.shake.critMs : 140), px / this.scale.width);
    if (strike.crit) this.number(d, 'CRITIQUE !', PALETTE.jauneBle, -40, 2.5);
    this.number(d, `${strike.damage}`, strike.crit ? PALETTE.jauneBle : PALETTE.parchemin, 0, strike.crit ? 3 : 2);
    // Arrêt sur image (hit-stop), puis la barre de PV descend cran par cran.
    await this.wait(t.hitStop);
    this.drain(d.bar, strike.targetHp, Math.max(120, ms + t.recoil));
    await this.wait(Math.max(0, ms - t.hitStop));
  }

  /** La barre de PV descend (ou monte) cran par cran (GBA). */
  private drain(bar: HpBar, to: number, ms: number): void {
    const from = bar.shown;
    bar.shown = to;
    const counter = { hp: from };
    void this.tween({
      targets: counter,
      hp: to,
      duration: ms,
      onUpdate: () => this.paintBar(bar, Math.round(counter.hp)),
      onComplete: () => this.paintBar(bar, to),
    });
    if (this.skipping) this.paintBar(bar, to);
  }

  /* ---------- Critique ---------- */

  /**
   * Ouverture du critique (GDD §11.3) : le fond s'assombrit, l'attaquant passe
   * en contre-jour (silhouette) et la scène zoome ×1,5 sur lui.
   */
  private async critIntro(a: FighterView, ms: number): Promise<void> {
    a.sprite.setTint(PALETTE.ombreProfonde).setTintMode(Phaser.TintModes.FILL);
    if (a.spec.kind === 'magic') {
      // Sort critique (façon sage) : le décor plonge dans la couleur du sort, sans zoom.
      const color = a.spec.elementColor ?? PALETTE.violetBrume;
      this.dim?.setFillStyle(mixColor(color, PALETTE.encre, 0.72), 1);
      if (this.dim) await this.tween({ targets: this.dim, alpha: 0.88, duration: ms });
      else await this.wait(ms);
    } else {
      this.dim?.setFillStyle(PALETTE.ombreProfonde, 1);
      // Le bond se voit en entier : le zoom vient à l'atterrissage.
      if (a.spec.critStyle !== 'bond') this.zoomTo(CRIT_ZOOM, a, ms);
      if (this.dim) await this.tween({ targets: this.dim, alpha: 0.7, duration: ms });
      else await this.wait(ms);
    }
    a.sprite.setTintMode(Phaser.TintModes.MULTIPLY).clearTint();
  }

  /* ---------- Chorégraphies ---------- */

  /**
   * Critique « tourbillon » (façon Bretteur, Lyn) : l'attaquant s'efface dans un
   * éclair, ses doubles traversent la cible de tous les côtés en laissant de
   * grandes entailles, puis il réapparaît au contact dans sa pose finale.
   */
  private async tourbillon(a: FighterView, d: FighterView, strike: Strike, t: CloseupTimings): Promise<void> {
    const tb = t.tourbillon;
    this.burst(a.sprite.x, a.sprite.y - CHEST, 'lanterne', 0xffffff, 14);
    await this.tween({ targets: a.sprite, alpha: 0, duration: tb.vanish });
    const cx = d.home.x;
    const cy = d.home.y - CHEST;
    const angles = [195, 15, 135, -40, 250, 75, 160, -15, 225, 40];
    const color = a.spec.elementColor ?? 0xffffff;
    for (let i = 0; i < tb.passes; i++) {
      if (!this.busy) return;
      const ang = ((angles[i % angles.length] ?? 0) * Math.PI) / 180;
      const r = 230;
      const sx = cx + Math.cos(ang) * r;
      const sy = cy + Math.sin(ang) * r * 0.55;
      const ex = cx - Math.cos(ang) * r;
      const ey = cy - Math.sin(ang) * r * 0.55;
      const ghost = this.add.sprite(sx, sy + CHEST, a.sprite.texture.key, a.sprite.frame.name);
      ghost.setOrigin(a.sprite.originX, a.sprite.originY).setScale(a.scale).setFlipX(ex < sx);
      this.stage.addAt(ghost, this.stage.getIndex(d.sprite) + 1);
      ghost.setTint(mixColor(color, PALETTE.ciel, 0.4)).setAlpha(0.9);
      this.ghosts({ ...a, sprite: ghost }, tb.pass, mixColor(color, PALETTE.ciel, 0.5), 2, 0.22);
      this.cutLine(cx, cy, Math.atan2(ey - sy, ex - sx), color);
      this.whiteFlash(d.sprite, true);
      this.time.delayedCall(34, () => this.whiteFlash(d.sprite, false));
      this.burst(cx, cy, null, color, 6);
      this.cameras.main.shake(this.scaled(70), (this.spec?.reduced ? 1 : 3) / this.scale.width);
      if (strike.hit && i === tb.passes - 1) this.screenFlash(0.9, 60);
      await this.tween({ targets: ghost, x: ex, y: ey + CHEST, duration: tb.pass, ease: 'Linear' });
      ghost.destroy();
    }
    // Réapparition au contact, pose finale.
    a.sprite.setPosition(d.home.x - a.dir * 96, a.home.y).setAlpha(1);
    this.screenFlash(0.6, 50);
    const last = a.painted?.anims.critique;
    if (a.painted && last) this.pose(a, 'critique', last.frames - 1);
    await this.wait(tb.reappear);
  }

  /** Grande entaille qui traverse l'écran (blanche au cœur, liseré de l'élément). */
  private cutLine(x: number, y: number, angle: number, color: number): void {
    const glow = this.add.rectangle(x, y, 620, 16, color, 0.45).setRotation(angle).setBlendMode(Phaser.BlendModes.ADD);
    const core = this.add.rectangle(x, y, 620, 5, 0xffffff, 1).setRotation(angle).setBlendMode(Phaser.BlendModes.ADD);
    this.stage.add([glow, core]);
    glow.setScale(0.2, 1);
    core.setScale(0.2, 1);
    this.tweens.add({ targets: [glow, core], scaleX: 1, duration: this.scaled(60), ease: 'Quad.easeOut' });
    this.tweens.add({ targets: [glow, core], alpha: 0, scaleY: 0.2, delay: this.scaled(80), duration: this.scaled(200), onComplete: () => { glow.destroy(); core.destroy(); } });
  }

  /**
   * Critique « bond » (façon héros, Hector) : l'attaquant s'envole hors de
   * l'écran, un éclat brille au sommet, il s'abat sur la cible : onde de choc,
   * fissures, poussière et grosse secousse.
   */
  private async bond(a: FighterView, d: FighterView, t: CloseupTimings): Promise<void> {
    const b = t.bond;
    const contact = d.home.x - a.dir * 96;
    this.ghosts(a, b.rise, 0xffffff, 4);
    await this.tween({ targets: a.sprite, x: (a.home.x + contact) / 2, y: 150, scaleY: a.scale * 1.06, duration: b.rise, ease: 'Quad.easeOut' });
    // Éclat au sommet, au-dessus de la cible : le personnage y tient un instant, arme levée.
    const star = this.add.graphics({ x: (a.home.x + contact) / 2 + a.dir * 40, y: 48 });
    star.fillStyle(0xffffff, 1).fillTriangle(0, -26, 5, 0, -5, 0).fillTriangle(0, 26, 5, 0, -5, 0).fillTriangle(-26, 0, 0, 5, 0, -5).fillTriangle(26, 0, 0, 5, 0, -5);
    star.setBlendMode(Phaser.BlendModes.ADD).setScale(0.2);
    this.stage.add(star);
    this.tweens.add({ targets: star, scale: 1.4, angle: 45, alpha: 0, duration: this.scaled(b.apex + 80), onComplete: () => star.destroy() });
    await this.tween({ targets: a.sprite, y: 130, duration: b.apex, ease: 'Sine.easeInOut' });
    this.ghosts(a, b.fall, 0xffffff, 3);
    await this.tween({ targets: a.sprite, x: contact, y: a.home.y, scaleY: a.scale, duration: b.fall, ease: 'Quad.easeIn' });
    this.shockwave(d.home.x - a.dir * 30, d.home.y);
    // Coup de zoom à l'impact (le retour en garde dézoome).
    this.zoomTo(1.3, d, 70);
    this.cameras.main.shake(this.scaled(320), (this.spec?.reduced ? 4 : 13) / this.scale.width);
    this.screenFlash(0.7, 60);
  }

  /** Onde de choc au sol, fissures et poussière (atterrissage, coup de poing de golem). */
  private shockwave(x: number, y: number): void {
    const ring = this.add.ellipse(x, y, 60, 16, 0xffffff, 0).setStrokeStyle(5, PALETTE.lumiereDoree, 1).setBlendMode(Phaser.BlendModes.ADD);
    this.stage.add(ring);
    this.tweens.add({ targets: ring, scaleX: 6, scaleY: 4, alpha: 0, duration: this.scaled(420), ease: 'Quad.easeOut', onComplete: () => ring.destroy() });
    const cracks = this.add.graphics();
    cracks.lineStyle(4, mixColor(PALETTE.terreSombre, PALETTE.ombreProfonde, 0.5), 1);
    for (const dir of [-1, 1]) {
      let cx = x;
      let cy = y;
      cracks.beginPath().moveTo(cx, cy);
      for (let i = 0; i < 4; i++) {
        cx += dir * (26 + i * 8);
        cy += (i % 2 === 0 ? 3 : -2);
        cracks.lineTo(cx, cy);
      }
      cracks.strokePath();
    }
    this.stage.addAt(cracks, this.stage.getIndex(this.dim ?? ring) + 1);
    this.tweens.add({ targets: cracks, alpha: 0, delay: this.scaled(700), duration: this.scaled(400), onComplete: () => cracks.destroy() });
    this.burst(x - 40, y - 6, 'pierre', PALETTE.terreSeche, 14);
    this.burst(x + 40, y - 6, 'pierre', PALETTE.terreSeche, 14);
  }

  /* ---------- Sorts ---------- */

  /**
   * Sort mis en scène à la cible (façon sages GBA) selon l'élément : colonnes
   * de feu (Cendre), geysers (Marée), épines (Racine), rayons tombés du ciel
   * (Lanterne), rochers (Pierre) ; sans élément, l'orbe vole jusqu'à la cible.
   * Au critique, plus de colonnes, plus hautes, et une explosion finale.
   */
  private async spell(a: FighterView, d: FighterView, crit: boolean, ms: number): Promise<void> {
    const element = a.spec.element;
    const color = a.spec.elementColor ?? PALETTE.cyanEclat;
    if (!element || !['cendre', 'maree', 'racine', 'lanterne', 'pierre'].includes(element)) {
      await this.projectile(a, d, ms);
      this.ring(d.home.x, d.home.y - CHEST, color);
      return;
    }
    const x = d.home.x;
    const ground = d.home.y;
    const offsets = crit ? [0, -70, 70, -135, 135] : [0, -55, 55];
    const step = (ms * 0.45) / offsets.length;
    // Lueur de la couleur du sort sur toute la scène.
    const wash = this.add.rectangle(-40, -40, this.scale.width + 80, this.scale.height + 80, color, 0).setOrigin(0, 0).setBlendMode(Phaser.BlendModes.ADD);
    this.stage.add(wash);
    this.tweens.add({ targets: wash, fillAlpha: crit ? 0.22 : 0.12, duration: this.scaled(ms * 0.4), yoyo: true, hold: this.scaled(ms * 0.2), onComplete: () => wash.destroy() });
    offsets.forEach((dx, i) => {
      this.time.delayedCall(this.scaled(i * step), () => {
        if (!this.busy || this.skipping) return;
        if (element === 'cendre' || element === 'maree') this.column(x + dx, ground, element, color, crit, ms);
        else if (element === 'racine') this.thorn(x + dx, ground, crit);
        else if (element === 'lanterne') this.beam(x + dx, ground, color, crit, ms);
        else this.rock(x + dx, ground, crit, ms);
      });
    });
    await this.wait(ms * 0.75);
    this.ring(x, ground - CHEST, color);
    if (crit) {
      this.ring(x, ground - CHEST, 0xffffff);
      this.screenFlash(0.8, 70);
    }
    this.burst(x, ground - CHEST, element, color, crit ? 30 : 16);
    await this.wait(ms * 0.25);
  }

  /** Colonne de flammes (Cendre) ou geyser (Marée) qui jaillit du sol : langues de boules douces, lueur au pied. */
  private column(x: number, ground: number, element: string, color: number, crit: boolean, ms: number): void {
    const fire = element === 'cendre';
    const height = crit ? 340 : 250;
    const tints = fire ? [0xfff2a0, PALETTE.braise, PALETTE.orangeForge, PALETTE.rougeCendre] : [0xffffff, PALETTE.ecume, PALETTE.ciel, color];
    const base = this.add.ellipse(x, ground, crit ? 110 : 80, 22, fire ? PALETTE.braise : PALETTE.ciel, 0).setBlendMode(Phaser.BlendModes.ADD);
    this.stage.add(base);
    this.tweens.add({ targets: base, fillAlpha: 0.6, duration: this.scaled(100) });
    this.tweens.add({ targets: base, alpha: 0, delay: this.scaled(ms * 0.55), duration: this.scaled(240), onComplete: () => base.destroy() });
    const life = 420;
    const emitter = this.add.particles(x, ground, FX_TEX.puff, {
      x: { min: -18, max: 18 },
      speedY: { min: -(height / life) * 1000 * 1.15, max: -(height / life) * 1000 * 0.75 },
      speedX: { min: -24, max: 24 },
      lifespan: { min: life * 0.7, max: life },
      scale: { start: crit ? 3.6 : 3, end: 0.4 },
      alpha: { start: 1, end: 0.2 },
      tint: tints,
      frequency: 12,
      quantity: 2,
      blendMode: Phaser.BlendModes.ADD,
    });
    this.stage.add(emitter);
    this.time.delayedCall(this.scaled(ms * 0.55), () => emitter.stop());
    this.time.delayedCall(this.scaled(ms * 0.55) + life + 100, () => emitter.destroy());
  }

  /** Épine de racine qui perce le sol (Racine). */
  private thorn(x: number, ground: number, crit: boolean): void {
    const h = crit ? 190 : 140;
    const g = this.add.graphics({ x, y: ground });
    g.fillStyle(PALETTE.terreSombre, 1).fillTriangle(-16, 0, 16, 0, 2, -h);
    g.fillStyle(PALETTE.mousse, 1).fillTriangle(-10, 0, 4, 0, 0, -h * 0.92);
    g.fillStyle(PALETTE.oliveClair, 1).fillTriangle(-6, -8, -2, -8, 0, -h * 0.8);
    g.setScale(1, 0);
    this.stage.add(g);
    this.tweens.add({ targets: g, scaleY: 1, duration: this.scaled(110), ease: 'Back.easeOut' });
    this.tweens.add({ targets: g, alpha: 0, scaleY: 0, delay: this.scaled(520), duration: this.scaled(220), onComplete: () => g.destroy() });
    this.burst(x, ground - 20, 'racine', PALETTE.oliveClair, 8);
  }

  /** Rayon de lumière qui tombe du ciel (Lanterne). */
  private beam(x: number, ground: number, color: number, crit: boolean, ms: number): void {
    const w = crit ? 46 : 32;
    const outer = this.add.rectangle(x, ground, w, ground + 40, color, 0.4).setOrigin(0.5, 1).setBlendMode(Phaser.BlendModes.ADD);
    const core = this.add.rectangle(x, ground, w * 0.35, ground + 40, 0xffffff, 0.9).setOrigin(0.5, 1).setBlendMode(Phaser.BlendModes.ADD);
    this.stage.add([outer, core]);
    for (const r of [outer, core]) {
      r.setScale(0, 1);
      this.tweens.add({ targets: r, scaleX: 1, duration: this.scaled(90), ease: 'Quad.easeOut' });
      this.tweens.add({ targets: r, scaleX: 0, alpha: 0, delay: this.scaled(ms * 0.45), duration: this.scaled(220), onComplete: () => r.destroy() });
    }
    this.burst(x, ground - 12, 'lanterne', color, 10);
  }

  /** Rocher qui tombe sur la cible (Pierre). */
  private rock(x: number, ground: number, crit: boolean, ms: number): void {
    const s = crit ? 1.4 : 1;
    const g = this.add.graphics({ x, y: -60 });
    g.fillStyle(mixColor(PALETTE.grisRoux, PALETTE.ombreProfonde, 0.3), 1).fillCircle(0, 0, 24 * s);
    g.fillStyle(PALETTE.grisRoux, 1).fillCircle(-4 * s, -4 * s, 19 * s);
    g.fillStyle(PALETTE.pierre, 1).fillCircle(-9 * s, -9 * s, 7 * s);
    this.stage.add(g);
    this.tweens.add({
      targets: g,
      y: ground - CHEST + 20,
      angle: 160,
      duration: this.scaled(ms * 0.35),
      ease: 'Quad.easeIn',
      onComplete: () => {
        this.burst(x, ground - 20, 'pierre', PALETTE.terreSeche, 12);
        this.cameras.main.shake(this.scaled(120), (this.spec?.reduced ? 1 : 4) / this.scale.width);
        this.tweens.add({ targets: g, alpha: 0, duration: this.scaled(160), onComplete: () => g.destroy() });
      },
    });
  }

  private zoomTo(zoom: number, on: FighterView | null, ms: number): void {
    if (this.spec?.reduced) return;
    const cam = this.cameras.main;
    const cx = on ? on.home.x + on.dir * 60 : this.scale.width / 2;
    const cy = on ? on.home.y - 80 : this.scale.height / 2;
    void this.tween({ targets: cam, zoom, scrollX: cx - this.scale.width / 2, scrollY: cy - this.scale.height / 2, duration: ms, ease: 'Quad.easeOut' });
  }

  /** Lignes de vitesse horizontales qui filent à l'opposé de l'attaquant. */
  private speedLines(dir: 1 | -1, ms: number): void {
    const g = this.lines;
    if (!g) return;
    const rows = Array.from({ length: 14 }, (_, i) => ({ y: 70 + ((i * 97) % 300), len: 60 + ((i * 53) % 140), x: (i * 131) % 960 }));
    const clock = { t: 0 };
    void this.tween({
      targets: clock,
      t: 1,
      duration: ms,
      onUpdate: () => {
        g.clear();
        for (const r of rows) {
          const x = (((r.x - dir * clock.t * 1400) % 1100) + 1100) % 1100 - 70;
          g.fillStyle(0xffffff, 0.22 * (1 - clock.t * 0.5)).fillRect(x, r.y, r.len, 2);
        }
      },
      onComplete: () => g.clear(),
    });
  }

  /* ---------- Effets ---------- */

  /** Copies fantômes qui suivent un mouvement et s'effacent (GDD §11.5 : 3 à 4). */
  private ghosts(v: FighterView, ms: number, tint: number, count = 4, alpha = 0.45): void {
    for (let i = 1; i <= count; i++) {
      this.time.delayedCall(this.scaled((ms * i) / (count + 1)), () => {
        if (!this.busy || this.skipping) return;
        const g = this.add.sprite(v.sprite.x, v.sprite.y, v.sprite.texture.key, v.sprite.frame.name);
        g.setOrigin(v.sprite.originX, v.sprite.originY).setScale(v.sprite.scaleX, v.sprite.scaleY).setFlipX(v.sprite.flipX);
        g.setTint(tint).setTintMode(Phaser.TintModes.FILL).setAlpha(alpha).setBlendMode(Phaser.BlendModes.ADD);
        this.stage.addAt(g, this.stage.getIndex(v.sprite));
        this.tweens.add({ targets: g, alpha: 0, duration: this.scaled(240), onComplete: () => g.destroy() });
      });
    }
  }

  /** Coupure dessinée sur la cible (diagonale, croix, arc), teintée par l'élément de l'arme. */
  private slash(d: FighterView, shape: SlashId, a: FighterView, big: boolean): void {
    const img = this.add.image(d.home.x - a.dir * 6, d.home.y - CHEST, FX_TEX.slash(shape)).setScale(ART * (big ? 1.25 : 1)).setFlipX(a.dir < 0);
    if (a.spec.elementColor !== null) img.setTint(a.spec.elementColor);
    img.setBlendMode(Phaser.BlendModes.ADD);
    this.stage.add(img);
    img.setAlpha(0).setScale(ART * 0.5);
    this.tweens.add({ targets: img, alpha: 1, scale: ART * (big ? 1.3 : 1.05), duration: this.scaled(60), ease: 'Quad.easeOut' });
    this.tweens.add({ targets: img, alpha: 0, delay: this.scaled(90), duration: this.scaled(180), onComplete: () => img.destroy() });
  }

  /** Flash plein écran (atténué en « Effets réduits »). */
  private screenFlash(alpha: number, ms: number): void {
    this.flash.setAlpha(alpha * (this.spec?.reduced ? 0.3 : 1));
    void this.tween({ targets: this.flash, alpha: 0, duration: Math.max(30, ms) });
  }

  /** Particules d'impact selon l'élément de l'arme (étincelles sans élément). */
  private burst(x: number, y: number, element: string | null, color: number | null, count: number): void {
    const b = BURSTS[element ?? 'aucun'] ?? (BURSTS['aucun'] as Burst);
    const emitter = this.add.particles(x, y, element === 'cendre' || element === 'maree' ? FX_TEX.puff : FX_TEX.dot, {
      emitting: false,
      speed: b.speed,
      angle: b.angle,
      gravityY: b.gravityY,
      lifespan: b.lifespan,
      scale: b.scale,
      alpha: { start: 1, end: 0 },
      tint: color ?? PALETTE.lumiereDoree,
    });
    this.stage.add(emitter);
    emitter.explode(count);
    this.time.delayedCall(b.lifespan + 200, () => emitter.destroy());
  }

  /** Onde circulaire d'une explosion magique. */
  private ring(x: number, y: number, color: number): void {
    const r = this.add.circle(x, y, 18, color, 0).setStrokeStyle(4, color, 0.9).setBlendMode(Phaser.BlendModes.ADD);
    this.stage.add(r);
    this.tweens.add({ targets: r, scale: 4, alpha: 0, duration: this.scaled(380), ease: 'Quad.easeOut', onComplete: () => r.destroy() });
  }

  /** Cercle runique sous le lanceur (GDD §11.4 : 150 ms), à la couleur de l'élément. */
  private rune(a: FighterView, ms: number): void {
    const color = a.spec.elementColor ?? PALETTE.cyanEclat;
    const img = this.add.image(a.home.x, a.home.y - 4, FX_TEX.rune).setScale(ART * 0.4, ART * 0.4).setTint(color).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
    this.stage.addAt(img, this.stage.getIndex(a.sprite));
    this.tweens.add({ targets: img, alpha: 1, scaleX: ART * 1.3, scaleY: ART * 1.3, duration: this.scaled(ms), ease: 'Back.easeOut' });
    this.tweens.add({ targets: img, alpha: 0, delay: this.scaled(ms + 260), duration: this.scaled(240), onComplete: () => img.destroy() });
  }

  private async projectile(a: FighterView, d: FighterView, ms: number): Promise<void> {
    const kind = a.spec.projectile ?? 'orbe';
    const sx = a.home.x + a.dir * 34;
    const sy = a.home.y - CHEST;
    const ex = d.home.x - a.dir * 14;
    const ey = d.home.y - CHEST + 6;
    const color = a.spec.elementColor ?? PALETTE.parchemin;
    const shot = this.add.graphics({ x: sx, y: sy });
    const len = kind === 'javeline' || kind === 'harpon' ? 44 : kind === 'carreau' ? 22 : 30;
    if (kind === 'orbe') {
      shot.fillStyle(color, 0.25).fillCircle(0, 0, 30);
      shot.fillStyle(color, 0.55).fillCircle(0, 0, 20);
      shot.fillStyle(color, 1).fillCircle(0, 0, 13);
      shot.fillStyle(0xffffff, 1).fillCircle(-4, -4, 5);
    } else if (kind === 'fiole') {
      shot.fillStyle(color, 1).fillRect(-5, -4, 10, 10);
      shot.fillStyle(PALETTE.parchemin, 1).fillRect(-2, -9, 4, 5);
    } else if (kind === 'eclat') {
      shot.fillStyle(PALETTE.pierre, 1).fillTriangle(-10, -5, 12, 0, -10, 5);
    } else {
      shot.fillStyle(PALETTE.terreSombre, 1).fillRect(-len / 2, -1, len, 3);
      shot.fillStyle(PALETTE.metalClair, 1).fillTriangle(len / 2, -5, len / 2 + 10, 1, len / 2, 7);
      if (kind === 'fleche') shot.fillStyle(PALETTE.parchemin, 1).fillRect(-len / 2, -4, 6, 9);
    }
    // Traits d'arme agrandis ×2 (lisibles à l'échelle des combattants) ; l'orbe garde sa taille.
    const k = kind === 'orbe' ? 1 : 2;
    shot.setScale(a.dir * k, k);
    this.stage.add(shot);
    // Traînée : particules de l'élément pour un sort, filet clair pour un trait.
    const trail = this.add.particles(0, 0, FX_TEX.dot, {
      follow: shot,
      frequency: kind === 'orbe' ? 18 : 30,
      lifespan: kind === 'orbe' ? 320 : 160,
      speed: { min: 0, max: 20 },
      scale: { start: kind === 'orbe' ? 3 : 1.5, end: 0 },
      alpha: { start: 0.9, end: 0 },
      tint: kind === 'orbe' ? color : PALETTE.parchemin,
      blendMode: Phaser.BlendModes.ADD,
    });
    this.stage.add(trail);
    const chain = kind === 'harpon' ? this.add.graphics() : null;
    if (chain) this.stage.add(chain);
    await this.tween({
      targets: shot,
      x: ex,
      y: ey,
      duration: ms,
      ease: kind === 'orbe' ? 'Sine.easeIn' : 'Linear',
      onUpdate: () => {
        chain?.clear().lineStyle(2, PALETTE.metal, 1).lineBetween(sx, sy, shot.x, shot.y);
      },
    });
    trail.stop();
    this.time.delayedCall(400, () => trail.destroy());
    chain?.destroy();
    shot.destroy();
  }

  /* ---------- Soin au bâton ---------- */

  /**
   * Soin (GDD §11.4) : le soigneur lève son bâton sur un cercle doré, une lueur
   * douce enveloppe l'allié, des particules vertes montent, la barre se remplit.
   */
  private async playHeal(amount: number, hpAfter: number): Promise<void> {
    const spec = this.spec;
    if (!spec) return;
    const a = this.views.get(spec.left.id);
    const d = this.views.get(spec.right.id);
    if (!a || !d) return;
    const t = spec.timings;
    this.pose(a, a.painted?.ranged ?? 'attaque');
    this.rune(a, t.rune);
    await this.tween({ targets: a.sprite, y: a.home.y - 6, duration: t.prep + t.rune });
    const glow = this.add.ellipse(d.home.x, d.home.y - CHEST, 90, 150, HEAL_COLOR, 0).setBlendMode(Phaser.BlendModes.ADD);
    this.stage.add(glow);
    void this.tween({ targets: glow, fillAlpha: 0.35, duration: t.fly, yoyo: true, hold: t.impact });
    const rise = this.add.particles(d.home.x, d.home.y - 10, FX_TEX.dot, {
      emitting: false,
      x: { min: -36, max: 36 },
      speedY: { min: -140, max: -60 },
      speedX: { min: -10, max: 10 },
      lifespan: 700,
      scale: { start: 2.5, end: 0.5 },
      alpha: { start: 1, end: 0 },
      tint: [HEAL_COLOR, PALETTE.lumiereDoree],
      blendMode: Phaser.BlendModes.ADD,
    });
    this.stage.add(rise);
    rise.explode(26);
    this.time.delayedCall(1000, () => rise.destroy());
    await this.wait(t.fly);
    this.number(d, `+${amount}`, HEAL_COLOR);
    this.drain(d.bar, hpAfter, t.recoil + t.pose);
    await this.wait(t.impact + t.recoil + t.pose);
    this.pose(a, 'garde');
    await this.tween({ targets: a.sprite, y: a.home.y, duration: t.settle });
  }

  /** Chute d'une unité (GDD §11.4) : sa pose de KO, elle clignote en blanc, puis s'efface par paliers. */
  private async dissolve(id: string): Promise<void> {
    const v = this.views.get(id);
    if (!v) return;
    this.pose(v, 'ko');
    for (let i = 0; i < 3; i++) {
      this.whiteFlash(v.sprite, true);
      await this.wait(70);
      this.whiteFlash(v.sprite, false);
      await this.wait(60);
    }
    this.whiteFlash(v.sprite, true);
    await this.tween({ targets: [v.sprite, v.shadow], alpha: 0, duration: 520, ease: 'Stepped', easeParams: [6] });
  }

  /** Chiffre qui monte au-dessus d'une unité (GDD §11.5 : 12 px d'art en 400 ms). */
  private number(v: FighterView, text: string, color: number, offsetY = 0, scale = 2): void {
    const top = v.painted ? v.painted.frame[1] * v.scale * 0.9 : 150;
    const label = addText(this, v.home.x, v.home.y - Math.min(top, 170) + offsetY, text, { scale, color, align: 'center', shadow: PALETTE.encre });
    this.stage.add(label);
    const duration = this.scaled(700);
    this.tweens.add({ targets: label, y: label.y - 36, duration: duration * 0.55, ease: 'Quad.easeOut' });
    this.tweens.add({ targets: label, alpha: 0, delay: duration * 0.75, duration: duration * 0.25, onComplete: () => label.destroy() });
  }

  private whiteFlash(sprite: Phaser.GameObjects.Sprite, on: boolean): void {
    if (on) sprite.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
    else sprite.setTintMode(Phaser.TintModes.MULTIPLY).clearTint();
  }

  /* ---------- Temps ---------- */

  private scaled(ms: number): number {
    return this.skipping ? 0 : Math.round(ms * (this.spec?.factor() ?? 1));
  }

  private wait(ms: number): Promise<void> {
    const d = this.scaled(ms);
    if (d <= 0) return Promise.resolve();
    return new Promise((resolve) => {
      const done = (): void => {
        this.pending.delete(done);
        resolve();
      };
      this.pending.add(done);
      this.time.delayedCall(d, done);
    });
  }

  private tween(config: Phaser.Types.Tweens.TweenBuilderConfig): Promise<void> {
    const duration = this.scaled((config.duration as number | undefined) ?? 0);
    return new Promise((resolve) => {
      const done = (): void => {
        this.pending.delete(done);
        resolve();
      };
      this.pending.add(done);
      const user = config.onComplete as ((...a: unknown[]) => void) | undefined;
      const tween = this.tweens.add({
        ...config,
        duration: Math.max(1, duration),
        ...(config.hold !== undefined ? { hold: this.scaled(config.hold as number) } : {}),
        onComplete: (...args: unknown[]) => {
          user?.(...args);
          done();
        },
      });
      // Passé ou sans durée : l'interpolation se termine aussitôt.
      if (duration <= 0) tween.complete();
    });
  }
}

/** Taille du fond peint, pour les tests et le debug. */
export const CLOSEUP_ART = { width: BACKDROP_W * ART, height: BACKDROP_H * ART, platform: PLATFORM_W * ART } as const;
