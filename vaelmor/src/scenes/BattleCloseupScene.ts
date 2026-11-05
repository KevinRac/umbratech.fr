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
 * Cut-ins (lot 6) : un boss est présenté par un bandeau à son nom au premier
 * échange du combat, et un autre bandeau marque son passage en seconde phase,
 * après quoi une aura rouge l'entoure (n°219, GDD §11.4) ; un boss ou un ennemi
 * nommé qui tombe vacille, dit sa citation de mort dans l'écran, puis se défait
 * en cendres (n°220).
 *
 * Entrée, Espace, Échap ou un clic passent l'échange : tout se pose aussitôt
 * (sauf une citation de mort, qui se lit réplique par réplique).
 */
import Phaser from 'phaser';
import type { BackdropId, CloseupTimings, CritStyle, FighterAnim, FighterDef, ProjectileId, SlashId, SpellId } from '../data/schemas';
import { castFrameAt, critSlashes, exchangeShapes, rhythmFrameAt, strikeSteps, type AttackKind, type Step } from '../logic/anim/closeup';
import { playSfx, type SfxTone } from '../audio/sfx';
import { duckMusic } from '../audio/engine';
import { ActionInput } from '../core/input';
import type { Strike, Team } from '../logic/tactics/types';
import { BATTLE_TEX, ensureMapSprite } from '../render/battleTextures';
import { fighterFrame, fighterKey, hasFighterSheet } from '../render/closeupFighters';
import { FX_TEX, SPARK_TICKS, ensureCloseupFx } from '../render/closeupFx';
import { BACKDROP_H, BACKDROP_W, HORIZON, PLATFORM_TOP, PLATFORM_W, paintBackdrop, paintPlatform, type PaintedImage } from '../render/closeupBackdrop';
import { PALETTE, mixColor } from '../render/palette';
import { foePortraitInBox } from '../render/portraits';
import { TalkBox, type TalkView } from '../ui/TalkBox';
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
  /** Arme lancée : le lanceur disparaît avec elle et réapparaît en garde à la fin du coup. */
  readonly thrown: boolean;
  /** Sort de son arme magique (n°223), ou null. */
  readonly spell: SpellId | null;
  /** Coupure dessinée à l'impact d'un coup de mêlée. */
  readonly slash: SlashId;
  /** Chorégraphie de son critique au corps à corps (assaut, tourbillon, bond). */
  readonly critStyle: CritStyle;
  /** Fond du socle (terrain de sa case). */
  readonly platform: BackdropId;
  /** Feuille peinte de l'écran rapproché (`battleAnims.json › fighters`), ou null : sprite de carte agrandi. */
  readonly painted: FighterDef | null;
  /** Portrait peint d'un boss ou d'un ennemi nommé (`assets/portraits/ennemis/`), pour ses bandeaux ; ou null. */
  readonly portrait: string | null;
  /** Boss ou ennemi nommé : sa chute se joue en « dernier souffle » (n°220). */
  readonly important: boolean;
  /** Boss en seconde phase : une aura rouge l'entoure (GDD §11.4). */
  readonly aura: boolean;
}

/** Cut-ins d'un échange (lot 6, n°219, n°220). */
export interface CloseupCutins {
  /** Boss présenté par un bandeau à son nom à l'ouverture (son premier échange du combat). */
  readonly intro: string | null;
  /** Boss qui passe en seconde phase à la fin de l'échange. */
  readonly phase: string | null;
  /** Citations de mort, par unité qui tombe : boîte de scène dans l'écran, avant la dissolution. */
  readonly quotes: ReadonlyMap<string, TalkView>;
  /** Machine à écrire des répliques (`balance.dialogue`). */
  readonly typing: { readonly charsPerSecond: number; readonly fastMultiplier: number };
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
  /** Bandeaux de boss et citations de mort (lot 6) ; absent : aucun. */
  readonly cutins?: CloseupCutins;
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
  /** Respiration en garde (arrêtée pendant un coup). */
  breath?: Phaser.Tweens.Tween | null;
  /** Aura de la seconde phase (lueur qui suit le corps). */
  aura?: Phaser.GameObjects.Image | null;
}

interface HpBar {
  readonly ticks: Phaser.GameObjects.Rectangle[];
  readonly label: PixelText;
  shown: number;
  readonly max: number;
  /** PV dessinés en ce moment (le tic sonne à chaque cran). */
  painted?: number;
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

/** Couleur du bruitage d'un sort selon l'élément. */
function toneOf(element: string | null): SfxTone {
  return element === 'cendre' || element === 'maree' || element === 'racine' || element === 'lanterne' || element === 'pierre' ? element : null;
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
  private actions: ActionInput | null = null;
  /** Citation de mort en cours : Entrée et le clic font avancer ses répliques au lieu de passer l'échange. */
  private talkBox: TalkBox | null = null;

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
    this.actions = new ActionInput(this);
    const skip = (): void => this.skip();
    this.input.keyboard?.on('keydown-ENTER', skip);
    this.input.keyboard?.on('keydown-SPACE', skip);
    this.input.keyboard?.on('keydown-ESC', skip);
    this.input.on(Phaser.Input.Events.POINTER_DOWN, skip);
  }

  override update(_time: number, delta: number): void {
    this.talkBox?.update(delta);
    // L'aura suit le corps (dash, bond, recul) et s'efface avec lui.
    for (const v of this.views.values()) {
      if (!v.aura) continue;
      v.aura.setPosition(v.sprite.x, v.sprite.y - this.bodyHeight(v) * 0.45).setVisible(v.sprite.visible && v.sprite.alpha > 0.05);
    }
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
      // Temps d'arrêt : les deux combattants face à face, en garde, avant le premier geste ;
      // au premier échange contre un boss, son bandeau occupe ce temps (GDD §11.4 : cut-in 400 ms).
      const intro = spec.cutins?.intro ? this.views.get(spec.cutins.intro) : undefined;
      if (intro) {
        duckMusic(-6, 1200);
        await this.band(intro, 'intro');
      }
      else await this.wait(spec.timings.opening);
      if (spec.heal) await this.playHeal(spec.heal.amount, spec.heal.hpAfter);
      const kindOf = (id: string): AttackKind => (id === spec.left.id ? spec.left.kind : spec.right.kind);
      const styleOf = (id: string): CritStyle => (id === spec.left.id ? spec.left.critStyle : spec.right.critStyle);
      // Critique « film » : ses images peintes jusqu'à l'impact fixent la durée de la chorégraphie.
      const filmOf = (id: string): number | undefined => {
        const f = id === spec.left.id ? spec.left : spec.right;
        const c = f.painted?.anims.critique;
        return f.critStyle === 'film' && c?.ms !== undefined ? c.ms * (c.impact ?? c.frames - 1) : undefined;
      };
      const shapes = exchangeShapes(spec.strikes, kindOf, styleOf, filmOf);
      for (let i = 0; i < spec.strikes.length; i++) {
        const strike = spec.strikes[i] as Strike;
        const shape = shapes[i];
        if (!shape) continue;
        await this.playStrike(strike, strikeSteps(shape, spec.timings));
        if (i < spec.strikes.length - 1) await this.wait(spec.timings.between);
      }
      const phase = spec.cutins?.phase ? this.views.get(spec.cutins.phase) : undefined;
      if (phase) {
        duckMusic(-6, 2000);
        await this.phaseCutIn(phase);
      }
      for (const id of spec.falls) {
        const v = this.views.get(id);
        if (v?.spec.important) await this.lastBreath(v, spec.cutins?.quotes.get(id) ?? null);
        else await this.dissolve(id);
      }
      await this.wait(spec.timings.pose);
      await this.exit(spec);
    } finally {
      this.teardown();
      this.busy = false;
    }
  }

  /** Passe l'échange : les attentes en cours se terminent, les suivantes sont immédiates. */
  skip(): void {
    if (!this.busy || this.skipping || this.talkBox) return;
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
      const view: FighterView = { spec: fighter, side, sprite, shadow, home: { x, y: FEET_Y + 2 }, dir: side === 'left' ? 1 : -1, bar, scale, painted };
      this.views.set(fighter.id, view);
      this.breathe(view);
      if (fighter.aura) bodies.splice(bodies.indexOf(sprite), 0, this.makeAura(view));
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
    bar.painted = hp;
    bar.ticks.forEach((t, i) => t.setFillStyle(i < hp ? on : PALETTE.ombreProfonde, 1));
    setText(bar.label, `${Math.max(0, Math.round(hp))}`);
  }

  private teardown(): void {
    this.talkBox?.close();
    this.talkBox = null;
    this.stage.removeAll(true).setPosition(0, 0);
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
    for (const v of [a, d]) {
      v.breath?.remove();
      v.breath = null;
      v.sprite.setScale(v.scale);
      if (Math.abs(v.sprite.y - v.home.y) <= 4) v.sprite.y = v.home.y;
    }
    try {
      await this.playStrikeSteps(strike, steps, a, d, spec);
    } finally {
      for (const v of [a, d]) if (this.busy && v.sprite.alpha > 0) this.breathe(v);
    }
  }

  private async playStrikeSteps(strike: Strike, steps: readonly Step[], a: FighterView, d: FighterView, spec: CloseupSpec): Promise<void> {
    const t = spec.timings;
    const crit = strike.crit && strike.hit;
    const cuts = critSlashes(a.spec.slash, t.critCuts);
    let cut = 0;
    const anim = this.strikeAnim(a, strike);
    const multi = (a.painted?.anims[anim]?.frames ?? 1) > 1;
    // Critique « film » : les images peintes portent toute la chorégraphie, à vitesse constante.
    const movie = crit && a.spec.critStyle === 'film' && a.spec.kind === 'melee' ? a.painted?.anims.critique : undefined;
    // Animation peinte de plusieurs images : elle suit les étapes au rythme GBA (n°225), gelée si une étape s'attarde.
    const film = multi && !movie ? this.drive(a, anim, steps) : null;
    // Les coups portés sans frappe au contact (tir, sort, critique chorégraphié) ont leur impact à l'arrivée.
    const contact = steps.some((st) => st.name === 'strike' || st.name === 'cut');
    try {
      for (const step of steps) {
        if (!this.busy) return;
        film?.sync(step);
        // Poses d'une feuille d'une image par animation (le héros) : garde, geste, coup reçu.
        if (!multi) {
          if (step.name === 'dash' || step.name === 'draw' || step.name === 'rune' || step.name === 'strike' || step.name === 'cut') this.pose(a, anim);
          if (step.name === 'back' || step.name === 'settle') this.pose(a, 'garde');
        }
        switch (step.name) {
          case 'dark':
            playSfx('crit');
            duckMusic(-6, 1400);
            await this.critIntro(a, step.ms);
            break;
          case 'prep':
            // Il se ramasse (anticipation).
            await this.tween({ targets: a.sprite, x: a.home.x - a.dir * 14, scaleX: a.scale * 1.04, scaleY: a.scale * 0.92, duration: step.ms, ease: 'Quad.easeOut' });
            break;
          case 'dash': {
            // Une fente peinte (`reach`) avance d'elle-même : la course s'arrête d'autant plus tôt.
            const reach = a.painted?.anims[this.strikeAnim(a, strike)]?.reach ?? 0;
            const to = d.home.x - a.dir * (96 + reach * a.scale);
            this.ghosts(a, step.ms, crit ? 0xffffff : (a.spec.elementColor ?? 0xffffff), 3, 0.3);
            if (crit) this.speedLines(a.dir, step.ms + t.arme.melee + t.critCut * t.critCuts);
            // Il s'arrache du sol (poussière) et s'étire dans sa course.
            this.dust(a.sprite.x, a.home.y, -a.dir, crit);
            playSfx('dash');
            await this.tween({ targets: a.sprite, x: to, scaleX: a.scale * 1.08, scaleY: a.scale * 0.97, duration: step.ms, ease: 'Quad.easeIn' });
            a.sprite.setScale(a.scale);
            // Il freine au contact : la poussière gicle devant lui.
            this.dust(to + a.dir * 20, a.home.y, a.dir, false);
            break;
          }
          case 'arme':
            // Armé tenu (GBA) : l'arme levée brille, il se tend en arrière ; puis la frappe part d'un coup.
            this.glint(this.weaponTip(a), crit ? 1.3 : 0.95, Math.min(320, step.ms + 80));
            playSfx(a.spec.kind === 'melee' ? 'arme' : 'bow');
            await this.tween({ targets: a.sprite, x: a.sprite.x - a.dir * 6, scaleY: a.scale * 1.02, duration: step.ms, ease: 'Sine.easeOut' });
            break;
          case 'draw':
            // Il bande son arme en se penchant en arrière.
            await this.tween({ targets: a.sprite, x: a.home.x - a.dir * 8, y: a.home.y - 6, scaleX: a.scale, scaleY: a.scale, duration: step.ms, ease: 'Quad.easeOut' });
            break;
          case 'rune':
            this.rune(a, step.ms);
            playSfx('charge');
            if (a.spec.kind === 'magic') {
              this.channel(a, step.ms + (steps.find((st) => st.name === 'spell')?.ms ?? 0), crit);
              // Le décor s'assombrit dans la couleur du sort (sorts GBA) ; le critique l'a déjà plongé dans le noir.
              if (!crit && this.dim) {
                this.dim.setFillStyle(mixColor(a.spec.elementColor ?? PALETTE.violetBrume, PALETTE.encre, 0.78), 1);
                void this.tween({ targets: this.dim, alpha: 0.55, duration: step.ms });
              }
            }
            // Le mage s'élève un peu au-dessus de son cercle.
            await this.tween({ targets: a.sprite, x: a.home.x, y: a.home.y - (a.spec.kind === 'magic' ? 14 : 4), scaleX: a.scale, scaleY: a.scale, duration: step.ms, ease: 'Sine.easeOut' });
            break;
          case 'choreo':
            if (movie) await this.movie(a, movie, 0, movie.impact ?? movie.frames - 1, step.ms);
            else if (a.spec.critStyle === 'tourbillon') await this.tourbillon(a, d, strike, t);
            else await this.bond(a, d, t);
            break;
          case 'spell':
            playSfx('spell', toneOf(a.spec.element));
            await this.spell(a, d, crit, step.ms);
            break;
          case 'fly':
            if (a.spec.thrown) {
              // Arme lancée (lanciers GBA) : le lanceur s'efface avec elle.
              this.ghosts(a, 90, 0xffffff, 2, 0.3);
              playSfx('throw');
              void this.tween({ targets: [a.sprite, a.shadow], alpha: 0, duration: Math.min(90, step.ms * 0.4), ease: 'Quad.easeIn' });
            } else {
              // Tir : éclat au départ du trait, recul sec du tireur, poussière sous ses pieds.
              this.glint(this.weaponTip(a), 0.9);
              this.dust(a.sprite.x, a.home.y, -a.dir, false);
              playSfx('release');
              a.sprite.x = a.home.x - a.dir * 22;
              this.tweens.add({ targets: a.sprite, x: a.home.x - a.dir * 8, delay: this.scaled(70), duration: this.scaled(140), ease: 'Quad.easeOut' });
            }
            await this.projectile(a, d, step.ms);
            break;
          case 'strike':
          case 'cut': {
            // La frappe part d'un coup (GBA : une ou deux images) : il se jette dans la cible.
            playSfx('swing');
            a.sprite.x += a.dir * (step.name === 'cut' ? 10 : 22);
            a.sprite.setScale(a.scale * 1.06, a.scale * 0.96);
            this.time.delayedCall(this.scaled(50), () => a.sprite.setScale(a.scale));
            if (strike.hit) {
              const last = step.name !== 'cut' || cut === t.critCuts - 1;
              if (a.spec.kind === 'melee') this.slash(d, step.name === 'cut' ? (cuts[cut] ?? a.spec.slash) : a.spec.slash, a, step.name === 'cut');
              this.hitFx(a, d, crit && last, step.name === 'cut');
            }
            if (step.name === 'cut') cut++;
            await this.wait(step.ms);
            break;
          }
          case 'impact':
            // La fin du film (pose finale, retour) se joue pendant l'impact, le recul et la pose.
            if (movie) void this.movie(a, movie, (movie.impact ?? 0) + 1, movie.frames - 1);
            if (strike.hit && !contact) this.hitFx(a, d, crit, false);
            await this.impact(strike, a, d, step.ms, t);
            break;
          case 'recoil':
            if (strike.hit) {
              this.pose(d, 'coup');
              this.dust(d.home.x, d.home.y, a.dir, crit);
            }
            await this.wait(step.ms);
            break;
          case 'pose':
            await this.wait(step.ms);
            break;
          case 'back':
          case 'settle':
            if (this.dim && this.dim.alpha > 0) void this.tween({ targets: this.dim, alpha: 0, duration: step.ms });
            if (crit) this.zoomTo(1, null, step.ms);
            if (a.spec.thrown && a.sprite.alpha < 1) {
              // Il réapparaît en garde à sa place, son arme en main.
              a.sprite.setPosition(a.home.x, a.home.y);
              film?.stop();
              if (multi) this.pose(a, 'garde');
              await this.tween({ targets: [a.sprite, a.shadow], alpha: 1, duration: step.ms, ease: 'Quad.easeOut' });
            } else if (step.name === 'back' && !movie) {
              // Retour en garde d'un bond en arrière (GBA), réception dans la poussière.
              const x0 = a.sprite.x;
              const y0 = a.sprite.y;
              const hop = { t: 0 };
              await this.tween({
                targets: hop,
                t: 1,
                duration: step.ms,
                ease: 'Sine.easeInOut',
                onUpdate: () => a.sprite.setPosition(x0 + (a.home.x - x0) * hop.t, y0 + (a.home.y - y0) * hop.t - Math.sin(hop.t * Math.PI) * 34),
              });
              a.sprite.setScale(a.scale * 1.05, a.scale * 0.92);
              this.dust(a.home.x, a.home.y, a.dir, false);
              void this.tween({ targets: a.sprite, scaleX: a.scale, scaleY: a.scale, duration: 110, ease: 'Back.easeOut' });
            } else await this.tween({ targets: a.sprite, x: a.home.x, y: a.home.y, scaleX: a.scale, scaleY: a.scale, duration: step.ms, ease: 'Quad.easeOut' });
            d.sprite.setPosition(d.home.x, d.home.y);
            if (strike.targetHp > 0 || !this.spec?.falls.includes(d.spec.id)) this.pose(d, 'garde');
            film?.stop();
            if (multi) this.pose(a, 'garde');
            break;
        }
      }
    } finally {
      film?.stop();
    }
  }

  /**
   * Fait défiler une animation peinte au rythme des étapes d'un coup (n°225) :
   * élan, armé tenu, frappe sèche, contact tenu, récupération (ou incantation
   * entretenue, `loop`), puis pose tenue animée (`after`) jusqu'au retour en
   * garde. L'horloge se recale au début de chaque étape et s'arrête à sa fin
   * prévue : si l'étape s'attarde (gel, sort), l'image ne bouge plus.
   */
  private drive(a: FighterView, anim: FighterAnim, steps: readonly Step[]): { sync: (step: Step) => void; stop: () => void } | null {
    const def = a.painted;
    const info = def?.anims[anim];
    if (!def || !info) return null;
    const recover = this.spec?.timings.recover ?? 50;
    const cast = info.loop && steps.some((st) => st.name === 'spell');
    let base = 0;
    let since = this.time.now;
    let cap = 0;
    let heldFrom: number | undefined;
    let stopped = false;
    const show = (): void => {
      if (stopped) return;
      const factor = Math.max(0.05, this.spec?.factor() ?? 1);
      const ms = this.skipping ? cap : Math.min(cap, base + (this.time.now - since) / factor);
      // Incantation entretenue : la boucle tourne tant que le sort se déroule.
      const f = cast && info.loop ? castFrameAt(steps, ms, info.frames, info.loop, info.impact ?? info.loop[1] + 1, 60) : rhythmFrameAt(steps, ms, info.frames, info.impact ?? 0, info.peak, recover, info.hold);
      const tenue = info.after ? def.anims[info.after] : undefined;
      if (tenue && info.after && f === info.frames - 1 && ms > (heldFrom ??= ms) + 60) {
        // Pose tenue après la dernière image : une fois en entier, puis aller-retour sur sa boucle (cheveux, étoffes au vent).
        const [lo, hi] = tenue.loop ?? [0, tenue.frames - 1];
        const k0 = Math.floor((ms - heldFrom) / 80);
        const n = hi - lo;
        const k = k0 <= hi ? k0 : n > 0 ? lo + (((k0 - hi) % (2 * n)) <= n ? n - ((k0 - hi) % (2 * n)) : ((k0 - hi) % (2 * n)) - n) : hi;
        a.sprite.setFrame(fighterFrame(this, def, info.after, Math.min(tenue.frames - 1, k)) ?? 0);
        return;
      }
      a.sprite.setFrame(fighterFrame(this, def, anim, f) ?? 0);
    };
    const clock = this.time.addEvent({ delay: 16, loop: true, callback: show });
    return {
      sync: (step) => {
        base = step.at;
        since = this.time.now;
        cap = step.at + step.ms;
        show();
      },
      stop: () => {
        stopped = true;
        clock.remove();
      },
    };
  }

  /**
   * Joue les images `from` à `to` d'un critique « film » à vitesse constante
   * (`ms` par image) ; `total` : durée imposée (l'étape de chorégraphie), sinon
   * `ms` par image. Des traînées suivent le corps dans les images rapides.
   */
  private async movie(a: FighterView, def: NonNullable<FighterDef['anims']['critique']>, from: number, to: number, total?: number): Promise<void> {
    const n = Math.max(1, to - from + 1);
    const per = total !== undefined ? total / n : (def.ms ?? 50);
    for (let i = from; i <= to; i++) {
      if (!this.busy) return;
      this.pose(a, 'critique', i);
      await this.wait(per);
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
      // Esquive : la cible bondit en arrière (traînée), « Raté » en gris.
      playSfx('miss');
      this.number(d, 'Raté', PALETTE.metalClair);
      this.ghosts(d, ms, PALETTE.metalClair, 3);
      this.dust(d.home.x, d.home.y, a.dir, false);
      await this.tween({ targets: d.sprite, x: d.home.x + a.dir * 56, y: d.home.y - 22, duration: ms, yoyo: true, ease: 'Quad.easeOut' });
      return;
    }
    if (strike.crit) this.number(d, 'CRITIQUE !', PALETTE.jauneBle, -40, 2.5);
    this.number(d, `${strike.damage}`, strike.crit ? PALETTE.jauneBle : PALETTE.parchemin, 0, strike.crit ? 3 : 2);
    // Gel (hit-stop) : tout se fige sur le contact, plus longtemps sur le coup fatal ; puis la barre de PV descend cran par cran.
    const fatal = strike.targetHp <= 0;
    if (fatal) {
      this.screenFlash(0.7, 110);
      this.quake(t.shake.crit, t.shake.critMs, true);
    }
    await this.wait(fatal ? t.hitStop * 2.5 : t.hitStop);
    this.drain(d.bar, strike.targetHp, Math.max(160, ms + t.recoil));
    await this.wait(Math.max(0, ms - t.hitStop));
  }

  /**
   * Le coup porte (GBA) : grande étincelle animée au point de contact,
   * particules de l'élément, la cible clignote en blanc et tressaute sèchement,
   * l'écran tremble par à-coups ; au critique, étincelle géante, stroboscope
   * et coup de cymbale.
   */
  private hitFx(a: FighterView, d: FighterView, crit: boolean, cut: boolean): void {
    const t = this.spec?.timings;
    if (!t) return;
    // Sur le corps de la cible, du côté du coup.
    const x = d.home.x - a.dir * 6;
    const y = d.home.y - CHEST + (cut ? Phaser.Math.Between(-14, 14) : 2);
    this.spark(x, y, crit, a.spec.kind === 'magic' ? a.spec.elementColor : null);
    this.burst(x, y, a.spec.kind === 'melee' ? null : a.spec.element, a.spec.elementColor, crit ? 26 : 12);
    if (a.spec.kind === 'magic') this.ring(d.home.x, d.home.y - CHEST, a.spec.elementColor ?? PALETTE.cyanEclat);
    this.blink(d.sprite, crit ? 3 : 2);
    this.jolt(d, a.dir, crit ? 18 : a.spec.kind === 'melee' ? 11 : 7, crit);
    this.quake(crit ? t.shake.crit : t.shake.hit + (cut ? 1 : 0), crit ? t.shake.critMs : 170, crit);
    this.screenFlash(crit ? 0.75 : cut ? 0.4 : 0.22, crit ? 60 : 40);
    if (crit) this.strobe();
    playSfx(crit ? 'critHit' : 'hit');
  }

  /** Étincelle d'impact peinte, image par image (durées en 60ᵉ de seconde, comme sur GBA). */
  private spark(x: number, y: number, big: boolean, tint: number | null): void {
    const img = this.add.image(x, y, FX_TEX.spark(0, big)).setScale(ART).setFlipX(Math.random() < 0.5);
    if (tint !== null) img.setTint(mixColor(tint, 0xffffff, 0.45));
    this.stage.add(img);
    let at = 0;
    SPARK_TICKS.forEach((ticks, f) => {
      if (f > 0) this.time.delayedCall(this.scaled(at), () => img.active && img.setTexture(FX_TEX.spark(f, big)));
      at += (ticks * 1000) / 60;
    });
    this.time.delayedCall(this.scaled(at), () => img.destroy());
    if (this.skipping) img.destroy();
  }

  /** La cible clignote en blanc (deux ou trois fois, 2 images allumée, 2 éteinte). */
  private blink(sprite: Phaser.GameObjects.Sprite, times: number): void {
    for (let i = 0; i < times; i++) {
      this.time.delayedCall(this.scaled(i * 67), () => this.whiteFlash(sprite, true));
      this.time.delayedCall(this.scaled(i * 67 + 34), () => this.whiteFlash(sprite, false));
    }
    if (this.skipping) this.whiteFlash(sprite, false);
  }

  /** La cible est projetée d'un coup puis tressaute en revenant (positions par paliers, pas d'interpolation). */
  private jolt(v: FighterView, dir: number, px: number, lift: boolean): void {
    const steps = [1, 0.55, 0.85, 0.4, 0.6, 0.22, 0.32, 0.08, 0];
    steps.forEach((k, i) => {
      this.time.delayedCall(this.scaled(i * 33), () => {
        if (!this.busy) return;
        v.sprite.setPosition(v.home.x + dir * px * k, v.home.y - (lift ? px * 0.6 * k : 0));
      });
    });
    if (this.skipping) v.sprite.setPosition(v.home.x, v.home.y);
  }

  /** Secousse de l'écran par à-coups qui s'amortissent (horizontale, ou verticale pour un choc lourd). */
  private quake(px: number, ms: number, vertical = false): void {
    const amp = px / (this.spec?.reduced ? 3 : 1);
    const n = Math.max(2, Math.round(ms / 33));
    for (let i = 0; i <= n; i++) {
      this.time.delayedCall(this.scaled(i * 33), () => {
        const k = i === n ? 0 : (1 - i / n) * (i % 2 === 0 ? 1 : -1) * amp;
        this.stage.setPosition(vertical ? 0 : Math.round(k), vertical ? Math.round(k) : Math.round(k * 0.3));
      });
    }
    if (this.skipping) this.stage.setPosition(0, 0);
  }

  /** Stroboscope du critique : trois éclairs blancs (un seul en « Effets réduits »). */
  private strobe(): void {
    const count = this.spec?.reduced ? 1 : 3;
    for (let i = 1; i < count; i++) this.time.delayedCall(this.scaled(i * 100), () => this.busy && !this.skipping && this.screenFlash(0.75, 45));
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
      onUpdate: () => {
        const hp = Math.round(counter.hp);
        if (hp !== bar.painted) playSfx('tick');
        this.paintBar(bar, hp);
      },
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
    // Un grand éclat brille sur l'arme de la silhouette (GBA).
    this.time.delayedCall(this.scaled(ms * 0.45), () => this.busy && !this.skipping && this.glint(this.weaponTip(a), 1.8, 320));
    if (a.spec.kind === 'magic') {
      // Sort critique (façon sage) : le décor plonge dans la couleur du sort, sans zoom.
      const color = a.spec.elementColor ?? PALETTE.violetBrume;
      this.dim?.setFillStyle(mixColor(color, PALETTE.encre, 0.72), 1);
      if (this.dim) await this.tween({ targets: this.dim, alpha: 0.88, duration: ms });
      else await this.wait(ms);
    } else {
      this.dim?.setFillStyle(PALETTE.ombreProfonde, 1);
      // Le bond se voit en entier : le zoom vient à l'atterrissage.
      // Zoom sur la zone du contact (l'attaquant et sa cible) ; le bond se voit en entier, le tir aussi.
      if (a.spec.critStyle !== 'bond' && a.spec.critStyle !== 'film' && a.spec.kind === 'melee') this.zoomTo(CRIT_ZOOM, a, ms, 130);
      if (this.dim) await this.tween({ targets: this.dim, alpha: 0.7, duration: ms });
      else await this.wait(ms);
    }
    a.sprite.setTintMode(Phaser.TintModes.MULTIPLY).clearTint();
    // La silhouette s'éclaire d'un coup avant de s'élancer (GBA).
    if (!this.skipping) {
      this.whiteFlash(a.sprite, true);
      this.time.delayedCall(50, () => this.whiteFlash(a.sprite, false));
    }
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
      this.quake(4, 66);
      playSfx('swing');
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
    this.glint({ x: (a.home.x + contact) / 2 + a.dir * 40, y: 48 }, 1.4, b.apex + 80);
    await this.tween({ targets: a.sprite, y: 130, duration: b.apex, ease: 'Sine.easeInOut' });
    this.ghosts(a, b.fall, 0xffffff, 3);
    await this.tween({ targets: a.sprite, x: contact, y: a.home.y, scaleY: a.scale, duration: b.fall, ease: 'Quad.easeIn' });
    this.shockwave(d.home.x - a.dir * 30, d.home.y);
    // Coup de zoom à l'impact (le retour en garde dézoome).
    this.zoomTo(1.3, d, 70);
    this.quake(13, 320, true);
    playSfx('land');
    this.screenFlash(0.7, 60);
  }

  /** Pointe de l'arme (à peu près) : devant le torse, côté adversaire. */
  private weaponTip(a: FighterView): { x: number; y: number } {
    return { x: a.sprite.x + a.dir * 46, y: a.sprite.y - CHEST - 8 };
  }

  /** Éclat en étoile à quatre branches qui tourne et s'éteint (lame qui brille, tir, critique). */
  private glint(at: { x: number; y: number }, size: number, ms = 260): void {
    const star = this.add.graphics({ x: at.x, y: at.y });
    star.fillStyle(0xffffff, 1).fillTriangle(0, -26, 5, 0, -5, 0).fillTriangle(0, 26, 5, 0, -5, 0).fillTriangle(-26, 0, 0, 5, 0, -5).fillTriangle(26, 0, 0, 5, 0, -5);
    star.fillStyle(PALETTE.lumiereDoree, 0.8).fillCircle(0, 0, 6);
    star.setBlendMode(Phaser.BlendModes.ADD).setScale(0.2);
    this.stage.add(star);
    this.tweens.add({ targets: star, scale: size, angle: 45, duration: this.scaled(ms * 0.45), ease: 'Quad.easeOut' });
    this.tweens.add({ targets: star, alpha: 0, scale: size * 0.3, angle: 90, delay: this.scaled(ms * 0.45), duration: this.scaled(ms * 0.55), onComplete: () => star.destroy() });
  }

  /** Poussière soulevée aux pieds (départ, réception, recul), chassée vers `dir`. */
  private dust(x: number, y: number, dir: number, big: boolean): void {
    if (this.skipping) return;
    const n = big ? 6 : 4;
    for (let i = 0; i < n; i++) {
      const p = this.add.image(x + dir * (i * 6 - 8), y - 4, FX_TEX.puff).setTint(i % 2 ? PALETTE.terreSeche : mixColor(PALETTE.parchemin, PALETTE.terreSeche, 0.5)).setAlpha(0.75).setScale(1.6);
      if (this.dim) this.stage.addAt(p, this.stage.getIndex(this.dim) + 1);
      else this.stage.add(p);
      this.tweens.add({ targets: p, x: p.x + dir * (24 + i * 12), y: p.y - 10 - (i % 3) * 7, scale: big ? 5 : 3.6, alpha: 0, duration: this.scaled(360 + i * 40), ease: 'Quad.easeOut', onComplete: () => p.destroy() });
    }
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

  /**
   * Incantation entretenue (façon sages GBA) : le lanceur ondule en lévitation,
   * une aura de l'élément pulse sur sa silhouette, des particules tournent
   * autour de lui puis se concentrent dans sa main ; au lancement, éclat et recul.
   */
  private channel(a: FighterView, ms: number, crit: boolean): void {
    const color = a.spec.elementColor ?? PALETTE.cyanEclat;
    const total = this.scaled(ms);
    if (total <= 0) return;
    // Aura : copie de la silhouette, remplie de la couleur de l'élément, qui pulse.
    const aura = this.add.sprite(a.sprite.x, a.sprite.y, a.sprite.texture.key, a.sprite.frame.name);
    aura.setOrigin(a.sprite.originX, a.sprite.originY).setFlipX(a.sprite.flipX).setScale(a.scale * 1.08, a.scale * 1.04);
    aura.setTint(color).setTintMode(Phaser.TintModes.FILL).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
    this.stage.addAt(aura, this.stage.getIndex(a.sprite));
    const follow = this.time.addEvent({
      delay: 16,
      loop: true,
      callback: () => {
        aura.setPosition(a.sprite.x, a.sprite.y).setFrame(a.sprite.frame.name);
      },
    });
    this.tweens.add({ targets: aura, alpha: crit ? 0.55 : 0.4, duration: Math.max(60, total * 0.2), yoyo: true, repeat: Math.max(0, Math.round(total / 260) - 1), ease: 'Sine.easeInOut' });
    // Ondulation en lévitation (après l'élévation du cercle runique).
    this.tweens.add({ targets: a.sprite, y: `-=${crit ? 10 : 6}`, delay: this.scaled(140), duration: Math.max(80, total * 0.22), yoyo: true, repeat: 1, ease: 'Sine.easeInOut' });
    // Particules en orbite qui se resserrent vers la main.
    const hx = (): number => a.sprite.x + a.dir * 42;
    const hy = (): number => a.sprite.y - CHEST - 6;
    const count = crit ? 16 : 10;
    const motes = Array.from({ length: count }, (_, i) => {
      const m = this.add.image(hx(), hy(), FX_TEX.puff).setTint(i % 3 === 0 ? 0xffffff : color).setBlendMode(Phaser.BlendModes.ADD).setScale(1.6);
      this.stage.add(m);
      return { m, phase: (i / count) * Math.PI * 2, r0: 70 + (i % 4) * 14 };
    });
    const clock = { t: 0 };
    this.tweens.add({
      targets: clock,
      t: 1,
      duration: total,
      onUpdate: () => {
        const r = (1 - clock.t) ** 1.4;
        for (const { m, phase, r0 } of motes) {
          const ang = phase + clock.t * Math.PI * 5 * a.dir;
          m.setPosition(hx() + Math.cos(ang) * r0 * r, hy() + Math.sin(ang) * r0 * 0.45 * r).setAlpha(0.35 + 0.65 * clock.t);
        }
      },
      onComplete: () => {
        for (const { m } of motes) m.destroy();
        follow.remove();
        aura.destroy();
        if (!this.busy || this.skipping) return;
        // Lancement : éclat dans la main, recul du lanceur.
        const flare = this.add.image(hx(), hy(), FX_TEX.puff).setTint(0xffffff).setBlendMode(Phaser.BlendModes.ADD).setScale(2);
        this.stage.add(flare);
        this.tweens.add({ targets: flare, scale: crit ? 9 : 6, alpha: 0, duration: this.scaled(220), onComplete: () => flare.destroy() });
        this.tweens.add({ targets: a.sprite, x: a.home.x - a.dir * 18, duration: this.scaled(90), yoyo: true, ease: 'Quad.easeOut' });
      },
    });
  }

  /** Respiration en garde : le combattant qui attend ne reste jamais figé. */
  private breathe(v: FighterView): void {
    v.breath?.remove();
    // Souffle (le torse se gonfle) et léger balancement : le combattant qui attend ne reste jamais figé.
    const clock = { p: 0 };
    v.sprite.setPosition(v.home.x, v.home.y);
    v.breath = this.tweens.add({
      targets: clock,
      p: Math.PI * 2,
      duration: 1100 + (v.side === 'left' ? 0 : 170),
      repeat: -1,
      onUpdate: () => {
        const k = (1 - Math.cos(clock.p)) / 2;
        v.sprite.setScale(v.scale, v.scale * (1 + 0.03 * k));
        v.sprite.y = v.home.y - 3 * k;
      },
    });
  }

  /* ---------- Sorts ---------- */

  /**
   * Sort mis en scène à la cible (façon sages GBA), choisi par l'arme ou le
   * tome équipé (`battleAnims.json › spells`, n°223) : colonnes de flammes,
   * boule de feu, geysers, vague, brume, lances d'eau, rayons tombés du ciel,
   * rochers, épines, ronces, fiole qui éclate, orbe. Au critique, plus de
   * colonnes (ou de lances), plus hautes, et une explosion finale.
   */
  private async spell(a: FighterView, d: FighterView, crit: boolean, ms: number): Promise<void> {
    const kind = a.spec.spell ?? 'orbe';
    const color = a.spec.elementColor ?? PALETTE.cyanEclat;
    const x = d.home.x;
    const ground = d.home.y;
    if (kind === 'orbe') {
      await this.projectile(a, d, ms);
      this.ring(x, ground - CHEST, color);
      return;
    }
    if (kind === 'boule_de_feu') return this.fireball(a, d, crit, ms);
    if (kind === 'fiole') return this.flask(a, d, crit, ms);
    // Lueur de la couleur du sort sur toute la scène.
    const wash = this.add.rectangle(-40, -40, this.scale.width + 80, this.scale.height + 80, kind === 'brume' ? PALETTE.ecume : color, 0).setOrigin(0, 0).setBlendMode(Phaser.BlendModes.ADD);
    this.stage.add(wash);
    this.tweens.add({ targets: wash, fillAlpha: crit ? 0.22 : 0.12, duration: this.scaled(ms * 0.4), yoyo: true, hold: this.scaled(ms * 0.2), onComplete: () => wash.destroy() });
    if (kind === 'vague') this.wave(a, d, color, crit, ms);
    else if (kind === 'brume') this.mist(d, color, crit, ms);
    else if (kind === 'lances') this.spears(a, d, color, crit, ms);
    else {
      const ronces = kind === 'ronces';
      const offsets = ronces ? (crit ? [-80, 80, -40, 40] : [-80, 80]) : crit ? [0, -70, 70, -135, 135] : [0, -55, 55];
      const step = (ms * 0.45) / offsets.length;
      offsets.forEach((dx, i) => {
        this.time.delayedCall(this.scaled(i * step), () => {
          if (!this.busy || this.skipping) return;
          if (kind === 'colonnes' || kind === 'geysers') this.column(x + dx, ground, kind === 'colonnes' ? 'cendre' : 'maree', color, crit, ms);
          else if (kind === 'epines') this.thorn(x + dx, ground, crit);
          // Ronces : les épines jaillissent de part et d'autre et se croisent sur la cible, comme des griffes.
          else if (ronces) this.thorn(x + dx, ground, crit, dx < 0 ? 34 - i * 6 : -34 + i * 6);
          else if (kind === 'rayons') this.beam(x + dx, ground, color, crit, ms);
          else this.rock(x + dx, ground, crit, ms);
        });
      });
    }
    await this.wait(ms * 0.75);
    this.ring(x, ground - CHEST, color);
    if (crit) {
      this.ring(x, ground - CHEST, 0xffffff);
      this.screenFlash(0.8, 70);
    }
    this.burst(x, ground - CHEST, a.spec.element, color, crit ? 30 : 16);
    await this.wait(ms * 0.25);
  }

  /** Point de lancement d'un sort : la main tendue du lanceur. */
  private hand(a: FighterView): { x: number; y: number } {
    return { x: a.sprite.x + a.dir * 42, y: a.sprite.y - CHEST - 6 };
  }

  /** Explosion de flammes : boules qui gonflent et s'éteignent, braises, onde, secousse. */
  private blast(x: number, y: number, crit: boolean, tints: readonly number[]): void {
    const n = crit ? 11 : 7;
    for (let i = 0; i < n; i++) {
      const p = this.add.image(x + Phaser.Math.Between(-40, 40), y + Phaser.Math.Between(-46, 30), FX_TEX.puff).setTint(tints[i % tints.length] as number).setBlendMode(Phaser.BlendModes.ADD).setScale(2);
      this.stage.add(p);
      this.tweens.add({ targets: p, scale: crit ? 11 : 8, alpha: 0, y: p.y - 30, delay: this.scaled(i * 18), duration: this.scaled(420), ease: 'Quad.easeOut', onComplete: () => p.destroy() });
    }
    this.quake(crit ? 8 : 5, crit ? 240 : 140, true);
  }

  /** Boule de feu (Brandon de poix) : elle grossit dans la main, file en cloche vers la cible et explose. */
  private async fireball(a: FighterView, d: FighterView, crit: boolean, ms: number): Promise<void> {
    const fire = [0xfff2a0, PALETTE.braise, PALETTE.orangeForge, PALETTE.rougeCendre];
    const from = this.hand(a);
    const to = { x: d.home.x - a.dir * 10, y: d.home.y - CHEST };
    const k = crit ? 1.8 : 1.35;
    const layers = [
      { tint: PALETTE.rougeCendre, scale: 10 * k, alpha: 0.45 },
      { tint: PALETTE.orangeForge, scale: 7 * k, alpha: 0.75 },
      { tint: PALETTE.braise, scale: 5 * k, alpha: 0.9 },
      { tint: 0xfff2a0, scale: 3 * k, alpha: 1 },
    ].map((l) => {
      const img = this.add.image(from.x, from.y, FX_TEX.puff).setTint(l.tint).setAlpha(l.alpha).setBlendMode(Phaser.BlendModes.ADD).setScale(0.5);
      this.stage.add(img);
      return { img, scale: l.scale };
    });
    const ball = { x: from.x, y: from.y, t: 0 };
    const trail = this.add.particles(0, 0, FX_TEX.puff, {
      follow: ball,
      frequency: 14,
      quantity: 2,
      lifespan: 360,
      speed: { min: 10, max: 50 },
      scale: { start: 3.4 * k, end: 0.3 },
      alpha: { start: 0.9, end: 0 },
      tint: fire,
      blendMode: Phaser.BlendModes.ADD,
    });
    this.stage.add(trail);
    const place = (): void => {
      const pulse = 1 + Math.sin(ball.t * 40) * 0.08;
      for (const { img, scale } of layers) img.setPosition(ball.x, ball.y).setScale(scale * pulse * Math.min(1, 0.35 + ball.t * 3));
    };
    await this.tween({
      targets: ball,
      t: 1,
      duration: ms * 0.6,
      ease: 'Quad.easeIn',
      onUpdate: () => {
        ball.x = from.x + (to.x - from.x) * ball.t;
        ball.y = from.y + (to.y - from.y) * ball.t - Math.sin(ball.t * Math.PI) * 50;
        place();
      },
    });
    trail.stop();
    this.time.delayedCall(500, () => trail.destroy());
    for (const { img } of layers) img.destroy();
    this.blast(to.x, to.y, crit, fire);
    this.screenFlash(crit ? 0.8 : 0.4, 60);
    this.ring(to.x, to.y, PALETTE.braise);
    if (crit) this.ring(to.x, to.y, 0xffffff);
    this.burst(to.x, to.y, 'cendre', PALETTE.braise, crit ? 30 : 18);
    await this.wait(ms * 0.4);
  }

  /** Fiole (Fioles d'automne) : lancée en cloche en tournoyant, elle éclate en nuage de couleurs d'automne. */
  private async flask(a: FighterView, d: FighterView, crit: boolean, ms: number): Promise<void> {
    const autumn = [PALETTE.ocre, PALETTE.braise, PALETTE.rougeCendre, PALETTE.jauneBle, PALETTE.vertDore];
    const from = this.hand(a);
    const to = { x: d.home.x - a.dir * 8, y: d.home.y - CHEST + 4 };
    const vial = this.add.graphics({ x: from.x, y: from.y });
    vial.fillStyle(PALETTE.ombreProfonde, 1).fillRect(-6, -5, 12, 12);
    vial.fillStyle(a.spec.elementColor ?? PALETTE.braise, 1).fillRect(-5, -3, 10, 9);
    vial.fillStyle(0xffffff, 0.8).fillRect(-3, -2, 2, 4);
    vial.fillStyle(PALETTE.parchemin, 1).fillRect(-2, -10, 4, 5);
    vial.setScale(2);
    this.stage.add(vial);
    const p = { t: 0 };
    await this.tween({
      targets: p,
      t: 1,
      duration: ms * 0.5,
      ease: 'Linear',
      onUpdate: () => {
        vial.setPosition(from.x + (to.x - from.x) * p.t, from.y + (to.y - from.y) * p.t - Math.sin(p.t * Math.PI) * 110).setAngle(p.t * 720 * a.dir);
      },
    });
    vial.destroy();
    // Éclats de verre, puis le nuage qui gonfle et dérive.
    const glass = this.add.particles(to.x, to.y, FX_TEX.dot, { emitting: false, speed: { min: 160, max: 340 }, gravityY: 500, lifespan: 380, scale: { start: 1.6, end: 0.6 }, tint: [0xffffff, PALETTE.ecume] });
    this.stage.add(glass);
    glass.explode(crit ? 20 : 12);
    this.time.delayedCall(600, () => glass.destroy());
    this.screenFlash(crit ? 0.7 : 0.3, 50);
    const n = crit ? 14 : 9;
    for (let i = 0; i < n; i++) {
      const c = this.add.image(to.x, to.y, FX_TEX.puff).setTint(autumn[i % autumn.length] as number).setAlpha(0.85).setScale(2);
      this.stage.add(c);
      const ang = (i / n) * Math.PI * 2;
      this.tweens.add({ targets: c, x: to.x + Math.cos(ang) * (crit ? 90 : 60), y: to.y + Math.sin(ang) * 40 - 20, scale: crit ? 9 : 7, alpha: 0, duration: this.scaled(ms * 0.95 + i * 12), ease: 'Quad.easeOut', onComplete: () => c.destroy() });
    }
    this.burst(to.x, to.y, 'racine', PALETTE.ocre, crit ? 24 : 14);
    if (crit) this.ring(to.x, to.y, 0xffffff);
    await this.wait(ms * 0.5);
  }

  /** Vague (Crosse de Sœur Mérrow) : l'eau déferle au ras du sol depuis le lanceur, enfle et s'abat sur la cible. */
  private wave(a: FighterView, d: FighterView, color: number, crit: boolean, ms: number): void {
    const ground = d.home.y;
    const front = { x: a.home.x + a.dir * 70, y: ground, t: 0 };
    const endX = d.home.x + a.dir * 40;
    const spray = this.add.particles(0, 0, FX_TEX.puff, {
      follow: front,
      x: { min: -26, max: 10 },
      speedY: { min: -380, max: -160 },
      speedX: { min: a.dir * 40, max: a.dir * 170 },
      gravityY: 640,
      lifespan: 620,
      scale: { start: crit ? 3.8 : 3.2, end: 0.6 },
      alpha: { start: 0.95, end: 0.1 },
      tint: [0xffffff, PALETTE.ecume, PALETTE.ciel, color],
      frequency: 8,
      quantity: crit ? 4 : 3,
      blendMode: Phaser.BlendModes.ADD,
    });
    this.stage.add(spray);
    const foam = this.add.graphics();
    this.stage.add(foam);
    const fromX = front.x;
    this.tweens.add({
      targets: front,
      t: 1,
      duration: this.scaled(ms * 0.55),
      ease: 'Quad.easeIn',
      onUpdate: () => {
        front.x = fromX + (endX - fromX) * front.t;
        const h = 30 + 110 * front.t * (crit ? 1.4 : 1);
        foam.clear();
        foam.fillStyle(color, 0.45).fillRect(Math.min(fromX, front.x), ground - 8, Math.abs(front.x - fromX), 14);
        foam.fillStyle(PALETTE.ecume, 0.7).fillRect(Math.min(fromX, front.x), ground - 10, Math.abs(front.x - fromX), 4);
        foam.fillStyle(color, 0.6).fillEllipse(front.x - a.dir * 20, ground - h / 2, 80, h);
        foam.fillStyle(0xffffff, 0.75).fillEllipse(front.x - a.dir * 8, ground - h + 8, 50, 16);
      },
      onComplete: () => {
        spray.stop();
        if (this.busy && !this.skipping) this.column(d.home.x, ground, 'maree', color, crit, ms * 0.7);
        this.tweens.add({ targets: foam, alpha: 0, duration: this.scaled(260), onComplete: () => foam.destroy() });
        this.time.delayedCall(800, () => spray.destroy());
      },
    });
  }

  /** Brume (Chant de brume) : un brouillard tournoie autour de la cible, se resserre sur elle et la saisit d'un éclat froid. */
  private mist(d: FighterView, color: number, crit: boolean, ms: number): void {
    const cx = d.home.x;
    const cy = d.home.y - CHEST + 10;
    const n = crit ? 22 : 15;
    const tints = [PALETTE.ecume, PALETTE.ciel, PALETTE.violetPale, color];
    const puffs = Array.from({ length: n }, (_, i) => {
      const img = this.add.image(cx, cy, FX_TEX.puff).setTint(tints[i % tints.length] as number).setAlpha(0).setScale(5 + (i % 3) * 1.5).setBlendMode(Phaser.BlendModes.ADD);
      this.stage.add(img);
      return { img, phase: (i / n) * Math.PI * 2, r0: 120 + (i % 4) * 22, dy: (i % 5) * 14 - 28 };
    });
    const clock = { t: 0 };
    this.tweens.add({
      targets: clock,
      t: 1,
      duration: this.scaled(ms * 0.7),
      ease: 'Sine.easeIn',
      onUpdate: () => {
        const r = 1 - clock.t * 0.85;
        for (const { img, phase, r0, dy } of puffs) {
          const ang = phase + clock.t * Math.PI * 3;
          img.setPosition(cx + Math.cos(ang) * r0 * r, cy + dy * r + Math.sin(ang) * r0 * 0.3 * r).setAlpha(Math.min(0.2, clock.t * 0.8));
        }
      },
      onComplete: () => {
        for (const { img } of puffs) this.tweens.add({ targets: img, alpha: 0, scale: img.scale * 1.6, duration: this.scaled(300), onComplete: () => img.destroy() });
        if (this.busy && !this.skipping) this.burst(cx, cy, 'lanterne', PALETTE.ecume, crit ? 24 : 14);
      },
    });
  }

  /** Lances d'eau (Trident de marée) : elles tombent en oblique du ciel, du côté du lanceur, et se fichent dans la cible. */
  private spears(a: FighterView, d: FighterView, color: number, crit: boolean, ms: number): void {
    const offs = crit ? [0, -46, 46, -22, 22] : [0, -40, 40];
    offs.forEach((dx, i) => {
      this.time.delayedCall(this.scaled(i * ms * 0.11), () => {
        if (!this.busy || this.skipping) return;
        const ex = d.home.x + dx * 0.6;
        const ey = d.home.y - CHEST + 20 + Math.abs(dx) * 0.3;
        const sx = ex - a.dir * 300 + dx;
        const sy = -60;
        const g = this.add.graphics({ x: sx, y: sy });
        g.fillStyle(color, 1).fillPoints([new Phaser.Math.Vector2(-40, -4), new Phaser.Math.Vector2(16, -4), new Phaser.Math.Vector2(36, 0), new Phaser.Math.Vector2(16, 4), new Phaser.Math.Vector2(-40, 4)], true);
        g.fillStyle(0xffffff, 0.9).fillRect(-34, -1, 54, 2);
        g.setRotation(Math.atan2(ey - sy, ex - sx)).setScale(crit ? 2.4 : 1.9).setBlendMode(Phaser.BlendModes.ADD);
        this.stage.add(g);
        const trail = this.add.particles(0, 0, FX_TEX.dot, { follow: g, frequency: 16, lifespan: 220, scale: { start: 2, end: 0 }, alpha: { start: 0.8, end: 0 }, tint: [PALETTE.ecume, color], blendMode: Phaser.BlendModes.ADD });
        this.stage.add(trail);
        this.tweens.add({
          targets: g,
          x: ex,
          y: ey,
          duration: this.scaled(ms * 0.24),
          ease: 'Quad.easeIn',
          onComplete: () => {
            trail.stop();
            this.time.delayedCall(300, () => trail.destroy());
            this.burst(ex, ey, 'maree', color, 8);
            this.tweens.add({ targets: g, alpha: 0, duration: this.scaled(200), delay: this.scaled(80), onComplete: () => g.destroy() });
          },
        });
      });
    });
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

  /** Épine de racine qui perce le sol (Racine), droite ou penchée de `angle` degrés (ronces). */
  private thorn(x: number, ground: number, crit: boolean, angle = 0): void {
    const h = crit ? 190 : 140;
    const g = this.add.graphics({ x, y: ground }).setAngle(angle);
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
        this.quake(4, 120, true);
        playSfx('land');
        this.tweens.add({ targets: g, alpha: 0, duration: this.scaled(160), onComplete: () => g.destroy() });
      },
    });
  }

  private zoomTo(zoom: number, on: FighterView | null, ms: number, ahead = 60): void {
    if (this.spec?.reduced) return;
    const cam = this.cameras.main;
    const { width: W, height: H } = this.scale;
    // Le cadre zoomé reste dans le fond peint (il déborde de 24 px de chaque côté).
    const hw = W / (2 * zoom);
    const hh = H / (2 * zoom);
    const cx = Phaser.Math.Clamp(on ? on.home.x + on.dir * ahead : W / 2, -24 + hw, W + 24 - hw);
    const cy = Phaser.Math.Clamp(on ? on.home.y - 80 : H / 2, -24 + hh, H + 24 - hh);
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
    a.breath?.remove();
    a.breath = null;
    a.sprite.setScale(a.scale);
    // Le soigneur joue son incantation : élan pendant le cercle, boucle pendant que la lumière enveloppe l'allié, puis lancement et pose tenue.
    const healAnim: FighterAnim = a.painted?.ranged ?? 'attaque';
    let film: { sync: (step: Step) => void; stop: () => void } | null = null;
    if ((a.painted?.anims[healAnim]?.frames ?? 1) > 1) {
      const healSteps: Step[] = [];
      let at = 0;
      for (const [name, ms] of [['prep', t.prep], ['rune', t.rune], ['spell', t.fly + t.impact], ['impact', t.impact], ['recoil', t.recoil], ['pose', t.pose], ['settle', t.settle]] as const) {
        healSteps.push({ name, at, ms });
        at += ms;
      }
      film = this.drive(a, healAnim, healSteps);
      // Une seule horloge pour tout le soin.
      film?.sync({ name: 'prep', at: 0, ms: at });
    } else this.pose(a, healAnim);
    this.rune(a, t.rune);
    this.channel({ ...a, spec: { ...a.spec, elementColor: HEAL_COLOR } }, t.prep + t.rune + t.fly, false);
    await this.tween({ targets: a.sprite, y: a.home.y - 14, duration: t.prep + t.rune, ease: 'Sine.easeOut' });
    playSfx('heal');
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
    film?.stop();
    this.pose(a, 'garde');
    await this.tween({ targets: a.sprite, y: a.home.y, duration: t.settle });
    this.breathe(a);
  }

  /** Chute d'une unité (GDD §11.4) : sa pose de KO, elle clignote en blanc, puis s'efface par paliers. */
  private async dissolve(id: string): Promise<void> {
    const v = this.views.get(id);
    if (!v) return;
    this.pose(v, 'ko');
    playSfx('ko');
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

  /* ---------- Cut-ins (lot 6, n°219, n°220) ---------- */

  /** Hauteur du corps à l'écran (feuille peinte ou sprite de carte agrandi). */
  private bodyHeight(v: FighterView): number {
    return v.painted ? Math.min(150, v.painted.frame[1] * v.scale * 0.62) : 120;
  }

  /** Lueur douce (dégradé radial) : une texture pour l'aura de la seconde phase. */
  private auraTexture(): string {
    const key = 'closeup:fx:aura';
    if (this.textures.exists(key)) return key;
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const g = ctx.createRadialGradient(size / 2, size / 2, 4, size / 2, size / 2, size / 2);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(0.45, 'rgba(255,255,255,0.45)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, size, size);
    }
    this.textures.addCanvas(key, canvas);
    return key;
  }

  /** Aura rouge d'un boss en seconde phase : elle bat, et des braises montent de lui. */
  private makeAura(v: FighterView): Phaser.GameObjects.Image {
    const h = this.bodyHeight(v);
    const glow = this.add.image(v.home.x, v.home.y - h * 0.45, this.auraTexture()).setBlendMode(Phaser.BlendModes.ADD).setTint(PALETTE.rougeCendre);
    glow.setDisplaySize(h * 1.15, h * 1.45).setAlpha(0.5);
    v.aura = glow;
    if (!this.spec?.reduced) this.tweens.add({ targets: glow, alpha: 0.85, scaleX: glow.scaleX * 1.08, scaleY: glow.scaleY * 1.05, duration: 520, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    const ember = (): void => {
      if (!this.busy || !v.aura || v.sprite.alpha <= 0.05) return;
      const x = v.sprite.x + Phaser.Math.Between(-28, 28);
      const y = v.sprite.y - Phaser.Math.Between(10, Math.round(h * 0.8));
      const dot = this.add.image(x, y, FX_TEX.dot).setScale(Phaser.Math.Between(2, 3)).setTint(Phaser.Math.RND.pick([PALETTE.braise, PALETTE.orangeForge, PALETTE.rougeCendre])).setBlendMode(Phaser.BlendModes.ADD);
      this.stage.add(dot);
      this.tweens.add({ targets: dot, y: y - Phaser.Math.Between(40, 90), x: x + Phaser.Math.Between(-10, 10), alpha: 0, duration: 700, ease: 'Quad.easeOut', onComplete: () => dot.destroy() });
      this.time.delayedCall(110, ember);
    };
    this.time.delayedCall(60, ember);
    return glow;
  }

  /**
   * Bandeau en biais (cut-in) : il traverse l'écran depuis le côté du boss,
   * avec son portrait peint, son nom et une ligne (titre à l'ouverture,
   * « Seconde phase » au changement de phase), sur des lignes de vitesse.
   */
  private async band(v: FighterView, mode: 'intro' | 'phase'): Promise<void> {
    const spec = this.spec;
    if (!spec) return;
    const cut = spec.timings.cutin;
    const { width: W } = this.scale;
    const phase = mode === 'phase';
    const h = phase ? 150 : 118;
    const cy = phase ? 236 : 220;
    const slant = 28;
    const fill = phase ? 0x2a0b12 : 0x14121f;
    const edge = phase ? PALETTE.braise : PALETTE.lumiereDoree;
    const c = this.add.container(0, 0).setDepth(55);
    this.cameras.main.ignore(c);
    const g = this.add.graphics();
    const y0 = cy - h / 2;
    const y1 = cy + h / 2;
    g.fillStyle(fill, 0.94);
    g.fillPoints([new Phaser.Math.Vector2(-60, y0 + slant), new Phaser.Math.Vector2(W + 60, y0 - slant), new Phaser.Math.Vector2(W + 60, y1 - slant), new Phaser.Math.Vector2(-60, y1 + slant)], true);
    g.lineStyle(4, edge, 1);
    g.lineBetween(-60, y0 + slant, W + 60, y0 - slant);
    g.lineBetween(-60, y1 + slant, W + 60, y1 - slant);
    g.lineStyle(2, edge, 0.45);
    g.lineBetween(-60, y0 + slant + 8, W + 60, y0 - slant + 8);
    g.lineBetween(-60, y1 + slant - 8, W + 60, y1 - slant - 8);
    c.add(g);
    // Lignes de vitesse dans le bandeau, qui filent vers le côté opposé au boss.
    const from = v.side === 'right' ? 1 : -1;
    for (let i = 0; i < 9; i++) {
      const ly = y0 + 14 + ((h - 28) * i) / 8;
      const tilt = ((cy - ly) / h) * slant * 2;
      const len = Phaser.Math.Between(60, 180);
      const line = this.add.rectangle(Phaser.Math.Between(0, W), ly - tilt * 0, len, 2, edge, phase ? 0.35 : 0.22).setOrigin(0.5, 0.5);
      line.setRotation(Math.atan2(-slant * 2, W + 120));
      c.add(line);
      if (!this.skipping) this.tweens.add({ targets: line, x: line.x - from * (W + 200), duration: Phaser.Math.Between(260, 420), repeat: -1, onRepeat: () => line.setX(from > 0 ? W + 100 : -100) });
    }
    // Portrait du côté du boss, tourné vers le centre ; le texte de l'autre côté.
    const pw = 150;
    const ph = h - 30;
    const px = v.side === 'right' ? W - pw - 110 : 110;
    // Milieu du bandeau à l'abscisse x (il monte vers la droite).
    const mid = (x: number): number => cy + slant * (1 - (2 * (x + 60)) / (W + 120));
    const portrait = v.spec.portrait ? foePortraitInBox(this, v.spec.portrait, px, Math.round(mid(px + pw / 2) - ph / 2), pw, ph, 3, 0, phase) : null;
    if (portrait) {
      if (v.side === 'left') portrait.setFlipX(true);
      this.cameras.main.ignore(portrait);
      c.add(portrait);
    }
    const tx = v.side === 'right' ? px - 26 : px + pw + 26;
    const align = v.side === 'right' ? 'right' : 'left';
    const ty = mid(tx);
    const name = addText(this, tx, ty - (phase ? 36 : 28), v.spec.name, { scale: 3, color: PALETTE.parchemin, align, shadow: PALETTE.encre });
    const sub = addText(this, tx, ty + (phase ? 16 : 12), phase ? 'Seconde phase' : v.spec.title, { scale: phase ? 2 : 1, color: phase ? PALETTE.braise : PALETTE.lumiereDoree, align, shadow: PALETTE.encre });
    c.add([name, sub]);
    c.setX(from * W);
    playSfx(phase ? 'critHit' : 'dash');
    await this.tween({ targets: c, x: 0, duration: cut.slide, ease: 'Cubic.easeOut' });
    await this.wait(phase ? cut.phase : cut.intro);
    await this.tween({ targets: c, x: -from * W, duration: cut.slide, ease: 'Cubic.easeIn' });
    c.destroy(true);
  }

  /** Passage en seconde phase (n°219) : le boss s'embrase, le bandeau passe, l'aura reste. */
  private async phaseCutIn(v: FighterView): Promise<void> {
    if (v.sprite.alpha <= 0) return;
    playSfx('charge');
    if (this.dim) this.tweens.add({ targets: this.dim, alpha: 0.55, duration: this.scaled(160) });
    for (let i = 0; i < 3; i++) {
      v.sprite.setTint(PALETTE.braise).setTintMode(Phaser.TintModes.FILL);
      await this.wait(70);
      this.whiteFlash(v.sprite, false);
      await this.wait(60);
    }
    this.quake(9, 420, true);
    this.screenFlash(0.5, 120);
    await this.band(v, 'phase');
    if (!v.aura) {
      const glow = this.makeAura(v);
      this.stage.addAt(glow, this.stage.getIndex(v.sprite));
      glow.setAlpha(0);
      this.tweens.add({ targets: glow, alpha: 0.6, duration: this.scaled(300) });
    }
    this.burst(v.home.x, v.home.y - this.bodyHeight(v) * 0.5, 'cendre', PALETTE.braise, 22);
    if (this.dim) await this.tween({ targets: this.dim, alpha: 0, duration: 220 });
  }

  /**
   * Dernier souffle d'un boss ou d'un ennemi nommé (n°220) : il vacille et se
   * fige, le décor s'assombrit, il dit sa citation de mort dans l'écran, puis
   * se défait en cendres qui montent.
   */
  private async lastBreath(v: FighterView, quote: TalkView | null): Promise<void> {
    const cut = this.spec?.timings.cutin;
    if (!cut) return this.dissolve(v.spec.id);
    v.breath?.remove();
    v.breath = null;
    this.pose(v, 'ko');
    if (this.dim) this.tweens.add({ targets: this.dim, alpha: 0.5, duration: this.scaled(320) });
    if (!this.spec?.reduced) this.zoomTo(1.18, v, cut.kneel + 200, 0);
    v.sprite.setTint(0xb8b0c8);
    await this.tween({ targets: v.sprite, y: v.home.y + 6, scaleY: v.scale * 0.94, x: v.home.x - v.dir * 8, duration: cut.kneel, ease: 'Quad.easeOut' });
    if (quote && quote.lines.length > 0) await this.talk(quote);
    else await this.wait(cut.kneel);
    playSfx('ko');
    for (let i = 0; i < 3; i++) {
      this.whiteFlash(v.sprite, true);
      await this.wait(60);
      this.whiteFlash(v.sprite, false);
      v.sprite.setTint(0xb8b0c8);
      await this.wait(70);
    }
    this.whiteFlash(v.sprite, true);
    this.quake(5, 260);
    this.ashes(v, cut.fade);
    await this.tween({ targets: [v.sprite, v.shadow, ...(v.aura ? [v.aura] : [])], alpha: 0, duration: cut.fade, ease: 'Stepped', easeParams: [8] });
    if (!this.spec?.reduced) this.zoomTo(1, null, 260);
    if (this.dim) await this.tween({ targets: this.dim, alpha: 0, duration: 260 });
  }

  /** Cendres qui se détachent du corps et montent pendant la dissolution. */
  private ashes(v: FighterView, ms: number): void {
    if (this.skipping) return;
    const h = this.bodyHeight(v);
    const tints = v.spec.team === 'enemy' ? [PALETTE.violetPale, PALETTE.metalClair, PALETTE.braise] : [PALETTE.lumiereDoree, PALETTE.parchemin, PALETTE.ciel];
    const count = this.spec?.reduced ? 14 : 34;
    for (let i = 0; i < count; i++) {
      this.time.delayedCall(this.scaled((ms * 0.8 * i) / count), () => {
        if (!this.busy) return;
        // Du bas vers le haut : le corps se défait par les pieds.
        const y = v.sprite.y - (h * i) / count - Phaser.Math.Between(0, 12);
        const x = v.sprite.x + Phaser.Math.Between(-26, 26);
        const bit = this.add.rectangle(x, y, Phaser.Math.Between(3, 6), Phaser.Math.Between(3, 6), Phaser.Math.RND.pick(tints), 1);
        this.stage.add(bit);
        this.tweens.add({ targets: bit, y: y - Phaser.Math.Between(50, 120), x: x + Phaser.Math.Between(-6, 22) * -v.dir, alpha: 0, angle: Phaser.Math.Between(-90, 90), duration: this.scaled(Phaser.Math.Between(600, 1000)), ease: 'Quad.easeOut', onComplete: () => bit.destroy() });
      });
    }
  }

  /** Citation de mort dans l'écran : la boîte de scène des dialogues, les bandeaux s'effacent le temps de la lire. */
  private async talk(view: TalkView): Promise<void> {
    const typing = this.spec?.cutins?.typing ?? { charsPerSecond: 30, fastMultiplier: 4 };
    if (!this.actions) return;
    this.tweens.add({ targets: this.ui, alpha: 0, duration: 140 });
    const before = new Set(this.children.list);
    const box = new TalkBox(this, this.actions, view, { scale: 1, depth: 58, bottom: this.scale.height - 8, ...typing });
    // La boîte appartient à l'interface : la caméra de la scène (zoom, secousse) ne la voit pas.
    for (const o of this.children.list) if (!before.has(o)) this.cameras.main.ignore(o);
    this.talkBox = box;
    await box.done;
    this.talkBox = null;
    this.tweens.add({ targets: this.ui, alpha: 1, duration: 160 });
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
