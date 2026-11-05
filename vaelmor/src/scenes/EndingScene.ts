/**
 * Écran de fin (jalon M7, décision n°196) : après la victoire sur Orvane, la
 * fin obtenue s'affiche — titre, sous-titre, portrait du héros, six lignes qui
 * apparaissent une à une sur un ciel de cendres — puis « Fin » et le jeu
 * continue (retour au monde, où la compagnie se tient).
 */
import Phaser from 'phaser';
import { setAmbience } from '../audio/ambience';
import { playMusic } from '../audio/music';
import { ActionInput } from '../core/input';
import { uiScaleFor } from '../core/viewport';
import type { EndingDef } from '../data/schemas';
import { PALETTE, mixColor } from '../render/palette';
import { portraitInBox } from '../render/portraits';
import { addText, type PixelText } from '../ui/text';
import { SCENES } from './keys';

export interface EndingSceneData {
  readonly ending: EndingDef;
  /** Ce que le monde reçoit ensuite (bilan du combat), tel que le combat l'aurait envoyé. */
  readonly battleReturn: object;
}

const LINE_MS = 2600;

export class EndingScene extends Phaser.Scene {
  private actions!: ActionInput;
  private data_!: EndingSceneData;
  private revealed = 0;
  private lines: PixelText[] = [];
  private prompt: PixelText | null = null;
  private done = false;
  private leaving = false;
  private clock = 0;

  constructor() {
    super({ key: SCENES.ending, active: false });
  }

  create(data: EndingSceneData): void {
    setAmbience(null, 800);
    this.data_ = data;
    this.actions = new ActionInput(this);
    this.revealed = 0;
    this.lines = [];
    this.prompt = null;
    this.done = false;
    this.leaving = false;
    this.clock = 0;
    const S = uiScaleFor(this.scale.height);
    const { width, height } = this.scale;
    const ending = data.ending;
    playMusic({ kind: 'ending', ending: ending.id });
    const warm = ending.id === 'lanterne';
    const bg = warm ? mixColor(PALETTE.nuit, PALETTE.ombreViolette, 0.35) : PALETTE.nuit;
    this.cameras.main.setBackgroundColor(bg);
    this.cameras.main.fadeIn(900, 0, 0, 0);

    // Cendres (ou lucioles d'or pour la lanterne) qui montent lentement.
    const dust = this.add.graphics().setDepth(0);
    const motes = Array.from({ length: 70 }, () => ({ x: Math.random() * width, y: Math.random() * height, v: 6 + Math.random() * 14, r: 1 + Math.random() * 1.5 }));
    const color = warm ? PALETTE.lumiereDoree : PALETTE.violetPale;
    this.events.on(Phaser.Scenes.Events.UPDATE, (_t: number, dt: number) => {
      dust.clear();
      for (const m of motes) {
        m.y -= (m.v * dt) / 1000;
        if (m.y < -4) {
          m.y = height + 4;
          m.x = Math.random() * width;
        }
        dust.fillStyle(color, 0.35).fillCircle(m.x, m.y, m.r * S);
      }
    });

    const title = addText(this, width / 2, 42 * S, ending.title.toUpperCase(), { scale: 3 * S, color: warm ? PALETTE.lumiereDoree : PALETTE.ambre, align: 'center', shadow: PALETTE.ombreProfonde, shadowOffset: 2 * S });
    title.setAlpha(0);
    this.tweens.add({ targets: title, alpha: 1, duration: 1200, delay: 400 });
    const sub = addText(this, width / 2, 96 * S, ending.subtitle, { scale: S, color: PALETTE.cyanEclat, align: 'center' });
    sub.setAlpha(0);
    this.tweens.add({ targets: sub, alpha: 1, duration: 1000, delay: 1200 });

    // Portrait du héros, content ou abattu selon la fin.
    const portrait = portraitInBox(this, 'heros', 52 * S, 150 * S, 64 * S, 70 * S, S, 1, warm ? 'happy' : ending.id === 'digue' ? 'neutral' : 'sad');
    if (portrait) {
      portrait.setAlpha(0);
      this.tweens.add({ targets: portrait, alpha: 1, duration: 900, delay: 1600 });
    }

    const x = 140 * S;
    const maxWidth = width - x - 40 * S;
    ending.lines.forEach((line, i) => {
      const t = addText(this, x, (150 + i * 36) * S, line, { scale: S, color: PALETTE.parchemin, maxWidth });
      t.setAlpha(0);
      this.lines.push(t);
    });
    this.scale.on(Phaser.Scale.Events.RESIZE, () => this.scene.restart(data), this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off(Phaser.Scale.Events.RESIZE, undefined, this));
  }

  override update(_time: number, delta: number): void {
    if (this.leaving) return;
    this.clock += delta;
    const wanted = Math.min(this.lines.length, Math.floor((this.clock - 2200) / LINE_MS) + 1);
    const skip = this.actions.consume('confirm') || this.actions.consume('cancel') || this.input.activePointer.isDown;
    if (skip && !this.done) {
      // Une touche révèle la ligne suivante tout de suite ; tout révélé, elle conclut.
      if (this.revealed >= this.lines.length) this.finish();
      else this.reveal(this.revealed + 1);
      return;
    }
    if (wanted > this.revealed) this.reveal(wanted);
    if (this.revealed >= this.lines.length && !this.done && this.clock > 2200 + this.lines.length * LINE_MS + 1500) this.finish();
    if (this.done && skip) this.leave();
  }

  private reveal(count: number): void {
    for (let i = this.revealed; i < count; i++) {
      const t = this.lines[i];
      if (t) this.tweens.add({ targets: t, alpha: 1, duration: 700 });
    }
    this.revealed = count;
    this.clock = Math.max(this.clock, 2200 + (count - 1) * LINE_MS);
  }

  private finish(): void {
    this.done = true;
    const S = uiScaleFor(this.scale.height);
    const { width, height } = this.scale;
    this.reveal(this.lines.length);
    const fin = addText(this, width / 2, height - 86 * S, 'FIN', { scale: 2 * S, color: PALETTE.lumiereDoree, align: 'center', shadow: PALETTE.ombreProfonde, shadowOffset: 2 * S });
    fin.setAlpha(0);
    this.tweens.add({ targets: fin, alpha: 1, duration: 900 });
    this.prompt = addText(this, width / 2, height - 46 * S, 'Vaelmor continue. Entrée ou clic : reprendre l’aventure.', { scale: S, color: PALETTE.metalClair, align: 'center' });
    this.prompt.setAlpha(0);
    this.tweens.add({ targets: this.prompt, alpha: 1, duration: 900, delay: 600 });
    this.actions.consume('confirm');
  }

  private leave(): void {
    if (this.leaving) return;
    this.leaving = true;
    this.cameras.main.fadeOut(600, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start(SCENES.world, this.data_.battleReturn));
  }
}
