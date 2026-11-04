/**
 * Écran de combat rapproché (jalon M8, GDD §11, décisions n°204 à n°222).
 *
 * Scène superposée au combat : `BattleScene` la lance au début du combat et lui
 * confie chaque échange (`play`) sous forme de données (`CloseupSpec`) ; elle
 * ne connaît pas l'état du combat. La chronologie vient de `logic/anim/closeup.ts`.
 *
 * Mise en page (n°206, n°207) : fond du terrain du défenseur peint par code
 * (×3), un socle par combattant, la compagnie et les alliés à gauche, les
 * ennemis à droite ; bandeaux du haut (nom, classe, niveau) et du bas (arme,
 * Préc / Dég / Crit, PV en chiffres et en barre à crans façon GBA), aux couleurs du camp.
 *
 * Entrée, Espace, Échap ou un clic passent l'échange : tout se pose aussitôt.
 */
import Phaser from 'phaser';
import type { BackdropId, CloseupTimings, FighterAnim, FighterDef, ProjectileId } from '../data/schemas';
import { exchangeShapes, frameAt, strikeSteps, type AttackKind, type Step } from '../logic/anim/closeup';
import type { Strike, Team } from '../logic/tactics/types';
import { BATTLE_TEX } from '../render/battleTextures';
import { fighterFrame, fighterKey, hasFighterSheet } from '../render/closeupFighters';
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
  /** Couleur de l'élément de l'arme (étincelles, cercle runique, sort), ou null. */
  readonly elementColor: number | null;
  /** Prévision affichée ; null = ne peut pas frapper (pas de riposte). */
  readonly odds: { readonly hit: number; readonly damage: number; readonly crit: number; readonly doubles: boolean } | null;
  readonly kind: AttackKind;
  readonly projectile: ProjectileId | null;
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
  /** Unités qui tombent à la fin de l'échange (dissolution). */
  readonly falls: readonly string[];
  readonly timings: CloseupTimings;
  /** Facteur de vitesse au moment de l'appel (Rapides, Maj maintenue, ralenti de debug). */
  readonly factor: () => number;
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
  private root!: Phaser.GameObjects.Container;
  private veil!: Phaser.GameObjects.Rectangle;
  private flash!: Phaser.GameObjects.Rectangle;
  /** Assombrit le fond seul (critique, GDD §11.3) : entre le décor et les combattants. */
  private dim: Phaser.GameObjects.Rectangle | null = null;
  private sparks!: Phaser.GameObjects.Particles.ParticleEmitter;
  private views = new Map<string, FighterView>();
  private spec: CloseupSpec | null = null;
  private skipping = false;
  private pending = new Set<() => void>();
  private busy = false;

  constructor() {
    super(SCENES.battleCloseup);
  }

  create(): void {
    this.cameras.main.setVisible(false);
    this.root = this.add.container(0, 0);
    this.veil = this.add.rectangle(0, 0, this.scale.width, this.scale.height, PALETTE.ombreProfonde, 0).setOrigin(0, 0).setDepth(50);
    this.flash = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0xffffff, 0).setOrigin(0, 0).setDepth(60);
    this.sparks = this.add.particles(0, 0, BATTLE_TEX.spark, {
      emitting: false,
      lifespan: { min: 200, max: 420 },
      speed: { min: 90, max: 260 },
      scale: { start: 3, end: 0.5 },
      alpha: { start: 1, end: 0 },
    });
    this.sparks.setDepth(40);
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

  /** Joue un échange ; se résout quand l'écran est refermé. */
  async play(spec: CloseupSpec): Promise<void> {
    this.busy = true;
    this.spec = spec;
    this.skipping = false;
    try {
      this.build(spec);
      await this.entry(spec);
      const kindOf = (id: string): AttackKind => (id === spec.left.id ? spec.left.kind : spec.right.kind);
      const shapes = exchangeShapes(spec.strikes, kindOf);
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
    cam.setVisible(true);
    cam.filters.internal.clear();
    cam.filters.external.clear();
    if (spec.grade) {
      cam.filters.internal.addColorMatrix().colorMatrix.set([...spec.grade.matrix]);
      if (spec.grade.vignette) cam.filters.external.addVignette(0.5, 0.5, spec.grade.vignette.radius, spec.grade.vignette.strength);
    }
    ensureImageTexture(this, BACKDROP_KEY(spec.backdrop), () => paintBackdrop(spec.backdrop));
    const bg = this.add.image(0, 0, BACKDROP_KEY(spec.backdrop)).setOrigin(0, 0).setScale(ART);
    this.root.add(bg);
    const far = spec.distance > 1;
    const platforms: Phaser.GameObjects.Image[] = [];
    const bodies: Phaser.GameObjects.GameObject[] = [];
    for (const fighter of [spec.left, spec.right]) {
      const side = fighter === spec.left ? 'left' : 'right';
      const x = (far ? X_FAR : X_NEAR)[side];
      ensureImageTexture(this, PLATFORM_KEY(fighter.platform), () => paintPlatform(fighter.platform));
      platforms.push(this.add.image(x, PLATFORM_Y, PLATFORM_KEY(fighter.platform)).setOrigin(0.5, 0).setScale(ART));
      const shadow = this.add.ellipse(x, FEET_Y, 54, 12, PALETTE.ombreProfonde, 0.35);
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
        sprite = this.add.sprite(x, FEET_Y + 2, BATTLE_TEX.ms(fighter.sprite, fighter.team), BATTLE_TEX.msFrame('side', 0)).setOrigin(0.5, 1).setScale(scale);
      }
      sprite.setFlipX(side === 'right');
      bodies.push(shadow, sprite);
      const bar = this.buildPanels(fighter, side);
      this.views.set(fighter.id, { spec: fighter, side, sprite, shadow, home: { x, y: FEET_Y + 2 }, dir: side === 'left' ? 1 : -1, bar, scale, painted });
    }
    this.dim = this.add.rectangle(0, 0, this.scale.width, this.scale.height, PALETTE.ombreProfonde, 1).setOrigin(0, 0).setAlpha(0);
    // Ordre : décor, socles, voile du critique, combattants, puis les bandeaux (déjà ajoutés, ramenés devant).
    const panels = this.root.list.filter((o) => o !== bg);
    this.root.removeAll(false);
    this.root.add([bg, ...platforms, this.dim, ...bodies, ...panels]);
    this.root.setAlpha(1);
    this.veil.setFillStyle(PALETTE.encre, 1).setAlpha(1);
    this.flash.setAlpha(0);
  }

  /** Bandeau du haut (nom, classe et niveau) et du bas (arme, prévision, PV) d'un combattant. */
  private buildPanels(f: CloseupFighter, side: 'left' | 'right'): HpBar {
    const W = this.scale.width;
    const color = TEAM_COLOR[f.team];
    const fill = mixColor(0x14121f, color, 0.18);
    // Haut : nom et titre.
    const tw = 330;
    const tx = side === 'left' ? 16 : W - 16 - tw;
    this.root.add(drawPanel(this, tx, 12, tw, TOP_H, { scale: 2, fill, fillAlpha: 0.92 }));
    this.root.add(this.add.rectangle(tx + 10, 18, 4, TOP_H - 12, color, 1).setOrigin(0, 0));
    const name = addText(this, tx + 22, 16, f.name, { scale: 1, color: PALETTE.parchemin });
    this.root.add(fitText(name, tw - 34));
    const title = addText(this, tx + 22, 36, f.title + (f.isBoss ? ' · Boss' : ''), { scale: 1, color: f.isBoss ? PALETTE.braise : PALETTE.metalClair });
    this.root.add(fitText(title, tw - 34));
    // Bas : arme, prévision, PV.
    const bw = W / 2 - 18;
    const bx = side === 'left' ? 12 : W / 2 + 6;
    const bh = this.scale.height - BOTTOM_Y - 10;
    this.root.add(drawPanel(this, bx, BOTTOM_Y, bw, bh, { scale: 2, fill, fillAlpha: 0.94 }));
    this.root.add(this.add.rectangle(bx + 8, BOTTOM_Y + 8, bw - 16, 3, color, 0.9).setOrigin(0, 0));
    const weapon = addText(this, bx + 16, BOTTOM_Y + 14, f.weaponName, { scale: 1, color: f.elementColor ?? PALETTE.parchemin });
    this.root.add(fitText(weapon, bw / 2));
    const stats = f.odds ? `Préc ${f.odds.hit}   Dég ${f.odds.damage}${f.odds.doubles ? ' ×2' : ''}   Crit ${f.odds.crit}` : 'Pas de riposte';
    this.root.add(addText(this, bx + bw - 16, BOTTOM_Y + 14, stats, { scale: 1, color: PALETTE.metalClair, align: 'right' }));
    // PV : chiffre puis barre à crans (un cran par PV, façon GBA).
    const label = addText(this, bx + 16, BOTTOM_Y + 52, `${f.hp}`, { scale: 2, color: PALETTE.parchemin });
    this.root.add(addText(this, bx + 16, BOTTOM_Y + 40, 'PV', { scale: 1, color: PALETTE.metalClair }));
    this.root.add(label);
    const barX = bx + 86;
    const barW = bw - 104;
    const perRow = Math.min(f.maxHp, 40);
    const rows = Math.ceil(f.maxHp / perRow);
    const tickW = Math.max(3, Math.floor(barW / perRow) - 1);
    const tickH = rows > 1 ? 9 : 16;
    const ticks: Phaser.GameObjects.Rectangle[] = [];
    this.root.add(this.add.rectangle(barX - 3, BOTTOM_Y + 50, perRow * (tickW + 1) + 5, rows * (tickH + 2) + 4, PALETTE.encre, 1).setOrigin(0, 0));
    for (let i = 0; i < f.maxHp; i++) {
      const r = Math.floor(i / perRow);
      const c = i % perRow;
      const tick = this.add.rectangle(barX + c * (tickW + 1), BOTTOM_Y + 52 + r * (tickH + 2), tickW, tickH, 0, 1).setOrigin(0, 0);
      ticks.push(tick);
      this.root.add(tick);
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
    this.root.removeAll(true);
    this.dim = null;
    this.views.clear();
    this.cameras.main.setVisible(false);
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
          if (this.dim) await this.tween({ targets: this.dim, alpha: 0.65, duration: step.ms });
          break;
        case 'prep':
          await this.tween({ targets: a.sprite, x: a.home.x - a.dir * 10, scaleY: a.scale * 0.94, duration: step.ms, ease: 'Quad.easeOut' });
          break;
        case 'dash': {
          const contact = d.home.x - a.dir * 96;
          await this.tween({ targets: a.sprite, x: contact, scaleY: a.scale, duration: step.ms, ease: 'Quad.easeIn' });
          break;
        }
        case 'draw':
          await this.tween({ targets: a.sprite, x: a.home.x, y: a.home.y - 6, scaleY: a.scale, duration: step.ms, ease: 'Quad.easeOut' });
          break;
        case 'rune':
          this.rune(a);
          await this.tween({ targets: a.sprite, x: a.home.x, y: a.home.y - 4, scaleY: a.scale, duration: step.ms });
          break;
        case 'fly':
          await this.projectile(a, d, step.ms);
          break;
        case 'strike':
        case 'cut':
          if (strike.hit) {
            // Silhouette blanche et flash d'écran sur deux images (GDD §11.2, §11.5).
            this.whiteFlash(d.sprite, true);
            this.time.delayedCall(34, () => this.whiteFlash(d.sprite, false));
            this.flash.setAlpha(step.name === 'cut' ? 0.9 : 0.55);
            void this.tween({ targets: this.flash, alpha: 0, duration: Math.max(40, step.ms) });
          }
          await this.wait(step.ms);
          break;
        case 'impact':
          await this.impact(strike, a, d, step.ms, t);
          break;
        case 'recoil':
          if (strike.hit) this.pose(d, 'coup');
          if (strike.hit) await this.tween({ targets: d.sprite, x: d.home.x + a.dir * 14, duration: step.ms / 2, yoyo: true, ease: 'Quad.easeOut' });
          else await this.wait(step.ms);
          break;
        case 'pose':
          await this.wait(step.ms);
          break;
        case 'back':
        case 'settle':
          if (this.dim && this.dim.alpha > 0) void this.tween({ targets: this.dim, alpha: 0, duration: step.ms });
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
      this.number(d, 'Raté', PALETTE.metalClair);
      await this.tween({ targets: d.sprite, x: d.home.x + a.dir * 34, y: d.home.y - 8, duration: ms, yoyo: true, ease: 'Quad.easeOut' });
      return;
    }
    const color = a.spec.elementColor ?? PALETTE.lumiereDoree;
    this.sparks.setParticleTint(color);
    this.sparks.explode(strike.crit ? 24 : 12, d.home.x - a.dir * 10, d.home.y - 60);
    const px = strike.crit ? t.shake.crit : t.shake.hit;
    this.cameras.main.shake(strike.crit ? t.shake.critMs : 140, px / this.scale.width);
    if (strike.crit) this.number(d, 'CRITIQUE !', PALETTE.jauneBle, -40);
    this.number(d, `${strike.damage}`, strike.crit ? PALETTE.jauneBle : PALETTE.parchemin);
    // Arrêt sur image (hit-stop), puis la barre de PV descend cran par cran.
    await this.wait(t.hitStop);
    this.drain(d.bar, strike.targetHp, Math.max(120, ms + t.recoil));
    await this.wait(Math.max(0, ms - t.hitStop));
  }

  /** La barre de PV descend cran par cran (GBA). */
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

  private rune(a: FighterView): void {
    const color = a.spec.elementColor ?? PALETTE.cyanEclat;
    const ring = this.add.ellipse(a.home.x, a.home.y - 2, 30, 8, color, 0).setStrokeStyle(3, color, 0.95);
    const inner = this.add.ellipse(a.home.x, a.home.y - 2, 16, 4, color, 0.35);
    this.root.add([ring, inner]);
    void this.tween({ targets: [ring, inner], scaleX: 4, scaleY: 4, alpha: 0, duration: this.scaled(420) }).then(() => {
      ring.destroy();
      inner.destroy();
    });
  }

  private async projectile(a: FighterView, d: FighterView, ms: number): Promise<void> {
    const kind = a.spec.projectile ?? 'orbe';
    const sx = a.home.x + a.dir * 34;
    const sy = a.home.y - 64;
    const ex = d.home.x - a.dir * 14;
    const ey = d.home.y - 60;
    const color = a.spec.elementColor ?? PALETTE.parchemin;
    const shot = this.add.graphics({ x: sx, y: sy });
    const len = kind === 'javeline' || kind === 'harpon' ? 44 : kind === 'carreau' ? 22 : 30;
    if (kind === 'orbe') {
      shot.fillStyle(color, 0.3).fillCircle(0, 0, 22);
      shot.fillStyle(color, 0.6).fillCircle(0, 0, 15);
      shot.fillStyle(color, 1).fillCircle(0, 0, 10);
      shot.fillStyle(0xffffff, 1).fillCircle(-3, -3, 4);
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
    shot.setScale(a.dir, 1);
    this.root.add(shot);
    if (kind === 'harpon') {
      const chain = this.add.graphics();
      this.root.add(chain);
      await this.tween({
        targets: shot,
        x: ex,
        y: ey,
        duration: ms,
        onUpdate: () => {
          chain.clear().lineStyle(2, PALETTE.metal, 1).lineBetween(sx, sy, shot.x, shot.y);
        },
      });
      chain.destroy();
    } else {
      await this.tween({ targets: shot, x: ex, y: ey, duration: ms, ease: kind === 'orbe' ? 'Sine.easeIn' : 'Linear' });
    }
    shot.destroy();
  }

  /** Chute d'une unité (GDD §11.4) : elle clignote en blanc, puis s'efface par paliers. */
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

  private number(v: FighterView, text: string, color: number, offsetY = 0): void {
    const label = addText(this, v.home.x, v.home.y - 150 + offsetY, text, { scale: 2, color, align: 'center', shadow: PALETTE.encre });
    label.setDepth(45);
    const duration = this.scaled(700);
    this.tweens.add({ targets: label, y: label.y - 36, duration: duration * 0.5, ease: 'Quad.easeOut' });
    this.tweens.add({ targets: label, alpha: 0, delay: duration * 0.7, duration: duration * 0.3, onComplete: () => label.destroy() });
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
