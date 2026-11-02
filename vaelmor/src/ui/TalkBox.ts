/**
 * Boîte de scène des dialogues de combat (GDD §7.9, §13.3, décision n°187),
 * dans l'esprit de *Fire Emblem : The Sacred Stones* : deux portraits face à
 * face au-dessus d'une boîte de texte, la compagnie à gauche, l'ennemi à
 * droite ; celui qui parle est éclairé, l'autre reste dans l'ombre. Texte en
 * machine à écrire (`balance.dialogue`), Entrée ou clic : finir la réplique
 * puis passer à la suivante, Échap : passer toute la scène.
 *
 * Le même composant sert en combat (BattleHudScene) et dans le journal des
 * rencontres (MenuScene). Les scènes, la logique et les données ne savent
 * rien de lui.
 */
import Phaser from 'phaser';
import type { ActionInput } from '../core/input';
import type { PortraitMood } from '../data/skins';
import { BATTLE_TEX, ensureMapSprite } from '../render/battleTextures';
import { PALETTE } from '../render/palette';
import { portraitInBox, speak } from '../render/portraits';
import { ALLY_OUTLINE } from '../render/unitSprites';
import { drawPanel } from './panel';
import { addText, fitText, setText, type PixelText } from './text';

export type TalkTeam = 'player' | 'ally' | 'enemy';

/** Un visage : nom, apparence (sprite de combat) et camp. */
export interface TalkFace {
  readonly key: string;
  readonly name: string;
  /** Titre sous le nom (« Lame du Serment », « le Cadet »), ou null. */
  readonly title: string | null;
  readonly sprite: string | null;
  readonly team: TalkTeam;
}

export interface TalkLineView {
  readonly face: TalkFace;
  readonly text: string;
  readonly mood: PortraitMood;
}

export interface TalkView {
  /** Petit cartouche au-dessus de la boîte (« Parler », « Rencontre »), ou null. */
  readonly tag: string | null;
  /** Visages à l'écran dès l'ouverture, même s'ils ne parlent pas (l'ennemi, l'unité liée). */
  readonly cast?: readonly TalkFace[];
  readonly lines: readonly TalkLineView[];
}

export interface TalkBoxOptions {
  readonly scale: number;
  readonly depth: number;
  readonly charsPerSecond: number;
  readonly fastMultiplier: number;
  /** Bas de la zone utilisable (au-dessus d'une barre d'interface). */
  readonly bottom: number;
  /**
   * Haut de la zone utilisable : si donné, la boîte se place en haut de l'écran
   * (visages en dessous), pour ne pas cacher les unités qui parlent.
   */
  readonly top?: number;
}

const TEAM_TINT: Readonly<Record<TalkTeam, number>> = { player: 0x6fa8dc, ally: ALLY_OUTLINE, enemy: 0xd9654b };
const FACE = 116;

interface FaceSlot {
  readonly face: TalkFace;
  readonly parts: Phaser.GameObjects.GameObject[];
  readonly image: Phaser.GameObjects.Image | null;
  readonly portrait: boolean;
}

export class TalkBox {
  readonly done: Promise<void>;
  private resolve!: () => void;
  private readonly root: Phaser.GameObjects.Container;
  private readonly body: PixelText;
  private readonly name: PixelText;
  private readonly title: PixelText;
  private readonly measure: PixelText;
  private readonly arrow: Phaser.GameObjects.Triangle;
  private readonly box: { x: number; y: number; w: number; h: number };
  private readonly slots: Partial<Record<'left' | 'right', FaceSlot>> = {};
  private index = -1;
  private text = '';
  private revealed = 0;
  private clock = 0;
  private finished = false;
  private clicked = false;
  private readonly onPointer = (): void => {
    this.clicked = true;
  };

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly actions: ActionInput,
    private readonly view: TalkView,
    private readonly options: TalkBoxOptions,
  ) {
    this.done = new Promise((resolve) => (this.resolve = resolve));
    const S = options.scale;
    const { width, height } = scene.scale;
    this.root = scene.add.container(0, 0).setDepth(options.depth);
    this.root.add(scene.add.rectangle(0, 0, width, height, PALETTE.nuit, 0.32).setOrigin(0, 0));
    const w = Math.min(width - 32 * S, 660 * S);
    const h = 86 * S;
    const x = Math.round((width - w) / 2);
    const y = options.top !== undefined ? Math.round(options.top + 6 * S) : Math.round(options.bottom - h - 6 * S);
    this.box = { x, y, w, h };
    // Les visages d'abord : la boîte passe par-dessus le bas des cadres.
    const firstOf = (side: 'left' | 'right'): TalkFace | undefined => view.lines.find((l) => sideOf(l.face) === side)?.face ?? view.cast?.find((f) => sideOf(f) === side);
    const firstLeft = firstOf('left');
    const firstRight = firstOf('right');
    if (firstLeft) this.place('left', firstLeft);
    if (firstRight) this.place('right', firstRight);
    this.root.add(drawPanel(scene, x, y, w, h, { scale: 2 * S, fillAlpha: 0.96 }));
    if (view.tag) {
      const ty = options.top !== undefined ? y + h - 2 * S : y - 20 * S;
      const tag = addText(scene, x + w / 2, ty + 6 * S, view.tag, { scale: S, color: PALETTE.lumiereDoree, align: 'center' });
      const tw = tag.width + 20 * S;
      this.root.add(drawPanel(scene, x + w / 2 - tw / 2, ty, tw, 22 * S, { scale: 2 * S, fillAlpha: 0.96 }));
      this.root.add(tag);
    }
    this.name = addText(scene, x + 14 * S, y + 8 * S, '', { scale: S, color: PALETTE.lumiereDoree });
    this.title = addText(scene, x + 14 * S, y + 8 * S, '', { scale: S, color: PALETTE.metalClair });
    this.body = addText(scene, x + 14 * S, y + 28 * S, '', { scale: S, color: PALETTE.parchemin });
    this.measure = addText(scene, 0, 0, '', { scale: S }).setVisible(false);
    this.arrow = scene.add.triangle(x + w - 18 * S, y + h - 14 * S, 0, 0, 10 * S, 0, 5 * S, 7 * S, PALETTE.lumiereDoree).setOrigin(0, 0).setVisible(false);
    scene.tweens.add({ targets: this.arrow, y: this.arrow.y + 3 * S, duration: 380, yoyo: true, repeat: -1 });
    this.root.add([this.name, this.title, this.body, this.measure, this.arrow]);
    this.root.setAlpha(0);
    scene.tweens.add({ targets: this.root, alpha: 1, duration: 140 });
    scene.input.on(Phaser.Input.Events.POINTER_DOWN, this.onPointer);
    this.next();
  }

  /** À appeler à chaque image tant que la scène est ouverte. */
  update(delta: number): void {
    if (this.finished) return;
    const clicked = this.clicked;
    this.clicked = false;
    if (this.actions.consume('cancel')) {
      this.close();
      return;
    }
    const confirm = this.actions.justPressed('confirm') || clicked;
    if (this.revealed < this.text.length) {
      const speed = this.options.charsPerSecond * (this.actions.isDown('confirm') ? this.options.fastMultiplier : 1);
      this.clock += (delta / 1000) * speed;
      const whole = Math.floor(this.clock);
      if (whole > 0) {
        this.clock -= whole;
        this.reveal(this.revealed + whole);
      }
      if (confirm) this.reveal(this.text.length);
      return;
    }
    if (confirm) this.next();
  }

  /** Ferme la scène (Échap, fin des répliques, ou départ de la scène hôte). */
  close(): void {
    if (this.finished) return;
    this.finished = true;
    this.scene.input.off(Phaser.Input.Events.POINTER_DOWN, this.onPointer);
    this.scene.tweens.add({ targets: this.root, alpha: 0, duration: 140, onComplete: () => this.root.destroy(true) });
    this.resolve();
  }

  private next(): void {
    this.index += 1;
    const line = this.view.lines[this.index];
    if (!line) {
      this.close();
      return;
    }
    const side = sideOf(line.face);
    if (this.slots[side]?.face.key !== line.face.key) this.place(side, line.face);
    for (const s of ['left', 'right'] as const) this.light(s, s === side);
    const slot = this.slots[side];
    if (slot?.image && slot.portrait) speak(this.scene, slot.image, line.face.sprite ?? '', line.mood, Math.min(1400, line.text.length * 40));
    else if (slot?.image && line.face.sprite) slot.image.setFrame(BATTLE_TEX.msFrame(line.mood === 'neutral' ? 'idle' : 'ready', line.mood === 'neutral' ? 0 : 2));
    setText(this.name, line.face.name);
    this.name.setTint(TEAM_TINT[line.face.team]);
    setText(this.title, line.face.title ? `· ${line.face.title}` : '');
    this.title.x = this.name.x + this.name.width + 6 * this.options.scale;
    this.text = this.wrap(line.text);
    this.revealed = 0;
    this.clock = 0;
    setText(this.body, '');
    this.arrow.setVisible(false);
  }

  private reveal(n: number): void {
    this.revealed = Math.min(this.text.length, n);
    setText(this.body, this.text.slice(0, this.revealed));
    if (this.revealed >= this.text.length) this.arrow.setVisible(true);
  }

  /** Coupe en lignes qui tiennent dans la boîte (les mots ne sautent pas pendant la frappe). */
  private wrap(text: string): string {
    const max = this.box.w - 40 * this.options.scale;
    const lines: string[] = [];
    let line = '';
    for (const word of text.split(' ')) {
      const candidate = line === '' ? word : `${line} ${word}`;
      setText(this.measure, candidate);
      if (this.measure.width > max && line !== '') {
        lines.push(line);
        line = word;
      } else line = candidate;
    }
    if (line !== '') lines.push(line);
    return lines.join('\n');
  }

  /** Cadre et visage d'un côté (remplace celui qui s'y trouvait). */
  private place(side: 'left' | 'right', face: TalkFace): void {
    const old = this.slots[side];
    if (old) for (const p of old.parts) p.destroy();
    const S = this.options.scale;
    const size = FACE * S;
    const { x, y, w, h } = this.box;
    const top = this.options.top !== undefined;
    const fx = side === 'left' ? x + 10 * S : x + w - 10 * S - size;
    const fy = top ? y + h - 10 * S : y - size + 10 * S;
    const parts: Phaser.GameObjects.GameObject[] = [];
    parts.push(drawPanel(this.scene, fx, fy, size, size, { scale: 2 * S, fillAlpha: 0.96 }));
    parts.push(this.scene.add.rectangle(fx + 6 * S, fy + 6 * S, size - 12 * S, size - 12 * S, TEAM_TINT[face.team], 0.22).setOrigin(0, 0));
    let image: Phaser.GameObjects.Image | null = null;
    let portrait = false;
    if (face.sprite) {
      image = face.team === 'enemy' ? null : portraitInBox(this.scene, face.sprite, fx + 8 * S, fy + 8 * S, size - 16 * S, size - 16 * S, 2 * S, 0);
      portrait = image !== null;
      if (!image) {
        // Sans portrait peint (ennemis, M7) : le sprite de combat agrandi.
        ensureMapSprite(this.scene, face.sprite, face.team);
        image = this.scene.add.image(fx + size / 2, fy + size - 4 * S, BATTLE_TEX.ms(face.sprite, face.team), BATTLE_TEX.msFrame('idle', 0)).setOrigin(0.5, 1).setScale(3 * S);
        if (side === 'right') image.setFlipX(true);
        image.setCrop(0, 0, image.width, image.height);
      }
      // Les visages se regardent : la compagnie tournée vers la droite, l'ennemi vers la gauche.
      if (portrait && side === 'right') image.setFlipX(true);
      parts.push(image);
    }
    parts.push(fitText(addText(this.scene, fx + size / 2, top ? fy + size + 3 * S : fy - 16 * S, face.name, { scale: S, color: TEAM_TINT[face.team], align: 'center' }), size + 40 * S));
    this.root.addAt(parts, 1);
    this.slots[side] = { face, parts, image, portrait };
  }

  /** Celui qui parle est éclairé, l'autre dans l'ombre. */
  private light(side: 'left' | 'right', on: boolean): void {
    const slot = this.slots[side];
    if (!slot) return;
    for (const p of slot.parts) {
      if (p instanceof Phaser.GameObjects.Image) p.setTint(on ? 0xffffff : 0x6a6478);
    }
    for (const p of slot.parts) (p as unknown as Phaser.GameObjects.Components.Alpha).setAlpha?.(on ? 1 : 0.8);
  }
}

/** La compagnie et les alliés à gauche, l'ennemi à droite. */
export const sideOf = (face: TalkFace): 'left' | 'right' => (face.team === 'enemy' ? 'right' : 'left');
