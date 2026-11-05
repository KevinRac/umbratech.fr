/**
 * Liste des réglages (jalon M10, décision n°232), posée dans un rectangle :
 * titres de section, une ligne par réglage (libellé à gauche, valeur entre deux
 * flèches à droite), et l'aide de la ligne choisie en bas.
 *
 * Clavier : Haut/Bas choisissent, Gauche/Droite (si `horizontal`) et Entrée
 * changent la valeur. Souris : survol = choix ; clic sur la flèche de gauche =
 * valeur précédente, ailleurs = valeur suivante. Utilisée par l'écran Options
 * et par l'onglet Options du menu (où Gauche/Droite changent d'onglet).
 */
import Phaser from 'phaser';
import type { ActionInput } from '../core/input';
import { PALETTE } from '../render/palette';
import { OPTION_SECTIONS, optionRows, stepValue, valueLabel, type OptionRow } from './optionsModel';
import { addText, setText, type PixelText } from './text';

export interface OptionsPanelOptions {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  /** Agrandissement entier de l'interface. */
  readonly scale: number;
  readonly depth: number;
  /** Vrai : Gauche/Droite changent la valeur (faux dans le menu, où elles changent d'onglet). */
  readonly horizontal: boolean;
}

interface RowView {
  readonly row: OptionRow;
  readonly y: number;
  readonly label: PixelText;
  readonly value: PixelText;
}

const ROW_H = 26;
const HEADER_H = 24;
const VALUE_W = 190;

export class OptionsPanel {
  private readonly objects: Phaser.GameObjects.GameObject[] = [];
  private readonly rows: RowView[] = [];
  private readonly highlight: Phaser.GameObjects.Rectangle;
  private readonly help: PixelText;
  private cursor = 0;

  constructor(
    scene: Phaser.Scene,
    private readonly input: ActionInput,
    private readonly o: OptionsPanelOptions,
  ) {
    const S = o.scale;
    const all = optionRows();
    this.highlight = scene.add.rectangle(o.x, o.y, o.width, (ROW_H - 2) * S, PALETTE.violetBrume, 0.55).setOrigin(0, 0).setDepth(o.depth);
    this.objects.push(this.highlight);
    let y = o.y;
    const valueX = o.x + o.width - (VALUE_W / 2 + 8) * S;
    for (const section of OPTION_SECTIONS) {
      const rows = all.filter((r) => r.section === section.id);
      if (rows.length === 0) continue;
      const head = addText(scene, o.x + 4 * S, y + 4 * S, section.label.toUpperCase(), { font: 'small', scale: 2 * S, color: PALETTE.lumiereDoree }).setDepth(o.depth + 1);
      const rule = scene.add.rectangle(o.x + 4 * S, y + (HEADER_H - 3) * S, o.width - 8 * S, S, PALETTE.metal, 0.8).setOrigin(0, 0).setDepth(o.depth + 1);
      this.objects.push(head, rule);
      y += HEADER_H * S;
      for (const row of rows) {
        const index = this.rows.length;
        const label = addText(scene, o.x + 16 * S, y + 4 * S, row.label, { scale: S }).setDepth(o.depth + 1);
        const value = addText(scene, valueX, y + 4 * S, valueLabel(row), { scale: S, color: PALETTE.cyanEclat, align: 'center' }).setDepth(o.depth + 1);
        const arrowY = y + (ROW_H / 2 - 1) * S;
        const left = scene.add.triangle(valueX - (VALUE_W / 2 - 6) * S, arrowY, 0, 4 * S, 6 * S, 0, 6 * S, 8 * S, PALETTE.metalClair).setDepth(o.depth + 1);
        const right = scene.add.triangle(valueX + (VALUE_W / 2 - 6) * S, arrowY, 6 * S, 4 * S, 0, 0, 0, 8 * S, PALETTE.metalClair).setDepth(o.depth + 1);
        const zone = scene.add.zone(o.x, y, o.width, ROW_H * S).setOrigin(0, 0).setDepth(o.depth + 2).setInteractive({ useHandCursor: true });
        zone.on('pointerover', () => this.select(index));
        zone.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
          this.select(index);
          const back = pointer.x < valueX - (VALUE_W / 2 - 18) * S && pointer.x > valueX - (VALUE_W / 2 + 4) * S;
          this.change(back ? -1 : 1);
        });
        this.objects.push(label, value, left, right, zone);
        this.rows.push({ row, y, label, value });
        y += ROW_H * S;
      }
      y += 6 * S;
    }
    const helpY = o.y + o.height - 44 * S;
    const sep = scene.add.rectangle(o.x + 4 * S, helpY - 8 * S, o.width - 8 * S, S, PALETTE.metal, 0.8).setOrigin(0, 0).setDepth(o.depth + 1);
    this.help = addText(scene, o.x + 8 * S, helpY, '', { scale: S, color: PALETTE.metalClair, maxWidth: o.width - 16 * S }).setDepth(o.depth + 1);
    this.objects.push(sep, this.help);
    this.select(0);
  }

  /** À appeler à chaque image. */
  update(): void {
    if (this.input.justPressed('up')) this.select((this.cursor + this.rows.length - 1) % this.rows.length);
    if (this.input.justPressed('down')) this.select((this.cursor + 1) % this.rows.length);
    if (this.o.horizontal && this.input.justPressed('left')) this.change(-1);
    if (this.o.horizontal && this.input.justPressed('right')) this.change(1);
    if (this.input.justPressed('confirm')) this.change(1);
  }

  /** Relit toutes les valeurs (un réglage changé ailleurs). */
  refresh(): void {
    for (const view of this.rows) setText(view.value, valueLabel(view.row));
  }

  destroy(): void {
    for (const object of this.objects) object.destroy();
    this.objects.length = 0;
    this.rows.length = 0;
  }

  private select(index: number): void {
    const view = this.rows[index];
    if (!view) return;
    this.cursor = index;
    this.highlight.setY(view.y + this.o.scale);
    this.rows.forEach((r, i) => r.label.setTint(i === index ? PALETTE.lumiereDoree : PALETTE.parchemin));
    setText(this.help, view.row.help);
  }

  private change(step: number): void {
    const view = this.rows[this.cursor];
    if (!view) return;
    view.row.set(stepValue(view.row, step));
    this.refresh();
  }
}
