/**
 * Fenêtre de confirmation en plusieurs étapes (décision n°163) : écraser,
 * supprimer, nouvelle partie, import, chargement en cours de partie.
 *
 * Chaque étape a un titre, quelques lignes et deux choix. À la dernière étape
 * le refus est présélectionné : il faut descendre d'un cran pour accepter.
 * Échap refuse à toutes les étapes. Les valeurs sont en pixels de la scène
 * (déjà multipliées par l'échelle `S`).
 */
import { playSfx } from '../audio/sfx';
import type Phaser from 'phaser';
import type { ActionInput } from '../core/input';
import { PALETTE } from '../render/palette';
import { drawPanel } from './panel';
import { addText } from './text';
import { VerticalMenu } from './VerticalMenu';

export interface ConfirmStep {
  readonly title: string;
  readonly lines: readonly string[];
  /** Libellé du choix qui accepte (« Continuer », « Oui, écraser »). */
  readonly yes: string;
  /** Libellé du choix qui refuse (« Annuler », « Non »). */
  readonly no: string;
}

export interface ConfirmBoxOptions {
  /** Centre de la fenêtre. */
  readonly x: number;
  readonly y: number;
  readonly width: number;
  /** Échelle de l'interface (cadre, marges). */
  readonly scale: number;
  /** Échelle du texte (par défaut : `scale`). */
  readonly textScale?: number;
  readonly depth: number;
  /** Ligne des choix (par défaut 18 × échelle). */
  readonly lineHeight?: number;
}

export class ConfirmBox {
  private parts: Phaser.GameObjects.GameObject[] = [];
  private menu: VerticalMenu | null = null;
  private steps: readonly ConfirmStep[] = [];
  private at = 0;
  private onYes: (() => void) | null = null;
  private onNo: (() => void) | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly input: ActionInput,
    private readonly options: ConfirmBoxOptions,
  ) {}

  get active(): boolean {
    return this.menu !== null;
  }

  /** Pose les étapes ; `onYes` n'est appelé qu'après la dernière. */
  ask(steps: readonly ConfirmStep[], onYes: () => void, onNo: () => void = () => {}): void {
    this.steps = steps;
    this.at = 0;
    this.onYes = onYes;
    this.onNo = onNo;
    this.show();
  }

  update(): void {
    if (!this.menu) return;
    if (this.input.consume('cancel')) {
      playSfx('cancel');
      this.finish(false);
      return;
    }
    this.menu.update();
  }

  destroy(): void {
    this.clear();
  }

  private show(): void {
    this.clear();
    const step = this.steps[this.at];
    if (!step) return;
    const { x, y, width, scale: k, depth } = this.options;
    const ts = this.options.textScale ?? k;
    const pad = 12 * k;
    const lh = this.options.lineHeight ?? 18 * k;
    const last = this.at === this.steps.length - 1;
    const title = addText(this.scene, 0, 0, step.title, { scale: ts, color: PALETTE.lumiereDoree, maxWidth: width - 2 * pad });
    const body = addText(this.scene, 0, 0, step.lines.join('\n'), { scale: ts, color: PALETTE.parchemin, maxWidth: width - 2 * pad });
    const height = Math.ceil(pad + title.height + 8 * k + body.height + 10 * k + 2 * lh + pad);
    const left = Math.round(x - width / 2);
    const top = Math.round(y - height / 2);
    const dim = this.scene.add.rectangle(0, 0, this.scene.scale.width, this.scene.scale.height, PALETTE.nuit, 0.55).setOrigin(0, 0).setDepth(depth).setInteractive();
    const panel = drawPanel(this.scene, left, top, width, height, { scale: k, fillAlpha: 0.98 }).setDepth(depth + 1);
    title.setPosition(left + pad, top + pad).setDepth(depth + 2);
    body.setPosition(left + pad, top + pad + title.height + 8 * k).setDepth(depth + 2);
    this.parts.push(dim, panel, title, body);
    // Dernière étape : « Non » d'abord, pour qu'Entrée par réflexe ne détruise rien.
    const items = last
      ? [
          { label: step.no, onSelect: () => this.finish(false), sound: 'cancel' as const },
          { label: step.yes, onSelect: () => this.next() },
        ]
      : [
          { label: step.yes, onSelect: () => this.next() },
          { label: step.no, onSelect: () => this.finish(false), sound: 'cancel' as const },
        ];
    this.menu = new VerticalMenu(this.scene, left + pad, top + height - pad - 2 * lh, items, this.input, { width: width - 2 * pad, lineHeight: lh, depth: depth + 2, scale: k, textScale: ts });
    this.input.consume('confirm');
  }

  private next(): void {
    if (this.at < this.steps.length - 1) {
      this.at += 1;
      this.show();
    } else this.finish(true);
  }

  private finish(yes: boolean): void {
    const callback = yes ? this.onYes : this.onNo;
    this.clear();
    this.onYes = null;
    this.onNo = null;
    callback?.();
  }

  private clear(): void {
    this.menu?.destroy();
    this.menu = null;
    for (const p of this.parts) p.destroy();
    this.parts = [];
  }
}
