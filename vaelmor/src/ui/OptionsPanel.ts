/**
 * Liste des réglages (jalon M10, décision n°232), posée dans un rectangle :
 * titres de section, une ligne par réglage (libellé à gauche, valeur entre deux
 * flèches à droite), et l'aide de la ligne choisie en bas. La liste défile
 * quand elle est plus haute que le rectangle (lot E : sections Texte,
 * Commandes, Accessibilité), et son texte suit « Taille du texte » (n°242).
 *
 * Clavier : Haut/Bas choisissent, Gauche/Droite (si `horizontal`) et Entrée
 * changent la valeur. Souris : survol = choix ; clic sur la flèche de gauche =
 * valeur précédente, ailleurs = valeur suivante ; molette = défilement. Une
 * ligne qui ouvre un écran (« Touches ») s'ouvre par Entrée ou clic.
 * Utilisée par l'écran Options et par l'onglet Options du menu (où
 * Gauche/Droite changent d'onglet).
 */
import { playSfx } from '../audio/sfx';
import Phaser from 'phaser';
import type { ActionInput } from '../core/input';
import { PALETTE } from '../render/palette';
import { OPTION_SECTIONS, optionRows, stepValue, valueLabel, type OptionRow } from './optionsModel';
import { addText, setText, sizableLineHeight, type PixelText } from './text';

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
  /** Une ligne `opens` est activée (l'hôte ouvre l'écran correspondant). */
  readonly onOpen?: (what: NonNullable<OptionRow['opens']>) => void;
}

interface RowView {
  readonly row: OptionRow;
  readonly line: Line;
  readonly label: PixelText;
  readonly value: PixelText;
}

/** Une ligne de la liste (titre de section ou réglage) et ses objets, à leur hauteur sans défilement. */
interface Line {
  readonly y: number;
  readonly h: number;
  readonly parts: { readonly obj: Phaser.GameObjects.Components.Transform & Phaser.GameObjects.Components.Visible; readonly baseY: number }[];
  readonly zone: Phaser.GameObjects.Zone | null;
}

const HEADER_H = 24;
const VALUE_W = 190;
/** Hauteur d'une ligne de réglage : 26 px, plus si le texte est agrandi. */
const rowHeight = (): number => Math.max(26, sizableLineHeight() + 9);

export class OptionsPanel {
  private readonly objects: Phaser.GameObjects.GameObject[] = [];
  private readonly rows: RowView[] = [];
  private readonly lines: Line[] = [];
  private readonly highlight: Phaser.GameObjects.Rectangle;
  private readonly help: PixelText;
  private readonly upMark: Phaser.GameObjects.Triangle;
  private readonly downMark: Phaser.GameObjects.Triangle;
  /** Fenêtre visible de la liste (au-dessus de l'aide). */
  private readonly viewTop: number;
  private readonly viewBottom: number;
  private readonly rowH: number;
  private cursor = 0;
  private scroll = 0;
  private readonly onWheel = (_p: unknown, _o: unknown, _dx: number, dy: number): void => this.scrollBy(Math.sign(dy) * this.rowH);

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly input: ActionInput,
    private readonly o: OptionsPanelOptions,
  ) {
    const S = o.scale;
    const ROW_H = (this.rowH = rowHeight());
    const all = optionRows();
    this.highlight = scene.add.rectangle(o.x, o.y, o.width, (ROW_H - 2) * S, PALETTE.violetBrume, 0.55).setOrigin(0, 0).setDepth(o.depth);
    this.objects.push(this.highlight);
    const helpY = o.y + o.height - 44 * S;
    this.viewTop = o.y;
    this.viewBottom = helpY - 12 * S;
    let y = o.y;
    const valueX = o.x + o.width - (VALUE_W / 2 + 8) * S;
    const track = <T extends Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Transform & Phaser.GameObjects.Components.Visible>(obj: T, parts: Line['parts']): T => {
      this.objects.push(obj);
      parts.push({ obj, baseY: obj.y });
      return obj;
    };
    for (const section of OPTION_SECTIONS) {
      const rows = all.filter((r) => r.section === section.id);
      if (rows.length === 0) continue;
      const headParts: Line['parts'] = [];
      track(addText(scene, o.x + 4 * S, y + 4 * S, section.label.toUpperCase(), { font: 'small', scale: 2 * S, color: PALETTE.lumiereDoree }).setDepth(o.depth + 1), headParts);
      track(scene.add.rectangle(o.x + 4 * S, y + (HEADER_H - 3) * S, o.width - 8 * S, S, PALETTE.metal, 0.8).setOrigin(0, 0).setDepth(o.depth + 1), headParts);
      this.lines.push({ y, h: HEADER_H * S, parts: headParts, zone: null });
      y += HEADER_H * S;
      for (const row of rows) {
        const index = this.rows.length;
        const parts: Line['parts'] = [];
        const textY = y + Math.round((ROW_H * S - sizableLineHeight() * S) / 2);
        const label = track(addText(scene, o.x + 16 * S, textY, row.label, { scale: S, sizable: true }).setDepth(o.depth + 1), parts);
        const value = track(addText(scene, valueX, textY, valueLabel(row), { scale: S, color: PALETTE.cyanEclat, align: 'center', sizable: true }).setDepth(o.depth + 1), parts);
        const arrowY = y + (ROW_H / 2 - 1) * S;
        if (!row.opens) {
          track(scene.add.triangle(valueX - (VALUE_W / 2 - 6) * S, arrowY, 0, 4 * S, 6 * S, 0, 6 * S, 8 * S, PALETTE.metalClair).setDepth(o.depth + 1), parts);
          track(scene.add.triangle(valueX + (VALUE_W / 2 - 6) * S, arrowY, 6 * S, 4 * S, 0, 0, 0, 8 * S, PALETTE.metalClair).setDepth(o.depth + 1), parts);
        }
        const zone = track(scene.add.zone(o.x, y, o.width, ROW_H * S).setOrigin(0, 0).setDepth(o.depth + 2).setInteractive({ useHandCursor: true }), parts);
        zone.on('pointerover', () => this.select(index));
        zone.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
          this.select(index);
          if (row.opens) {
            this.open(row);
            return;
          }
          const back = pointer.x < valueX - (VALUE_W / 2 - 18) * S && pointer.x > valueX - (VALUE_W / 2 + 4) * S;
          this.change(back ? -1 : 1);
        });
        const line: Line = { y, h: ROW_H * S, parts, zone };
        this.lines.push(line);
        this.rows.push({ row, line, label, value });
        y += ROW_H * S;
      }
      y += 6 * S;
    }
    this.contentBottom = y;
    const mid = o.x + o.width / 2;
    this.upMark = scene.add.triangle(mid, this.viewTop - 2 * S, 0, 6 * S, 6 * S, 6 * S, 3 * S, 0, PALETTE.ambre).setOrigin(0.5, 1).setDepth(o.depth + 3).setVisible(false);
    this.downMark = scene.add.triangle(mid, this.viewBottom + 2 * S, 0, 0, 6 * S, 0, 3 * S, 6 * S, PALETTE.ambre).setOrigin(0.5, 0).setDepth(o.depth + 3).setVisible(false);
    const sep = scene.add.rectangle(o.x + 4 * S, helpY - 8 * S, o.width - 8 * S, S, PALETTE.metal, 0.8).setOrigin(0, 0).setDepth(o.depth + 1);
    this.help = addText(scene, o.x + 8 * S, helpY, '', { scale: S, color: PALETTE.metalClair, maxWidth: o.width - 16 * S }).setDepth(o.depth + 1);
    this.objects.push(this.upMark, this.downMark, sep, this.help);
    scene.input.on(Phaser.Input.Events.POINTER_WHEEL, this.onWheel);
    this.setScroll(0);
    this.select(0);
  }

  private readonly contentBottom: number;

  /** À appeler à chaque image. */
  update(): void {
    if (this.input.justPressed('up')) this.move((this.cursor + this.rows.length - 1) % this.rows.length);
    if (this.input.justPressed('down')) this.move((this.cursor + 1) % this.rows.length);
    if (this.o.horizontal && this.input.justPressed('left')) this.change(-1);
    if (this.o.horizontal && this.input.justPressed('right')) this.change(1);
    if (this.input.justPressed('confirm')) this.change(1, true);
  }

  /** Relit toutes les valeurs (un réglage changé ailleurs). */
  refresh(): void {
    for (const view of this.rows) setText(view.value, valueLabel(view.row));
  }

  /** Identifiant de la ligne choisie (pour reconstruire le panneau au même endroit). */
  get selectedId(): string | null {
    return this.rows[this.cursor]?.row.id ?? null;
  }

  /** Choisit une ligne par son identifiant (après reconstruction). */
  selectId(id: string | null): void {
    const i = this.rows.findIndex((r) => r.row.id === id);
    if (i >= 0) this.select(i);
  }

  destroy(): void {
    this.scene.input.off(Phaser.Input.Events.POINTER_WHEEL, this.onWheel);
    for (const object of this.objects) object.destroy();
    this.objects.length = 0;
    this.rows.length = 0;
    this.lines.length = 0;
  }

  private move(index: number): void {
    if (index !== this.cursor) playSfx('cursor');
    this.select(index);
  }

  private select(index: number): void {
    const view = this.rows[index];
    if (!view) return;
    this.cursor = index;
    // Défilement : la ligne choisie reste visible, avec son titre de section quand il précède.
    const before = this.lines[this.lines.indexOf(view.line) - 1];
    const top = before && before.zone === null ? before.y : view.line.y;
    if (top - this.scroll < this.viewTop) this.setScroll(top - this.viewTop);
    if (view.line.y + view.line.h - this.scroll > this.viewBottom) this.setScroll(view.line.y + view.line.h - this.viewBottom);
    this.highlight.setY(view.line.y - this.scroll + this.o.scale);
    this.rows.forEach((r, i) => r.label.setTint(i === index ? PALETTE.lumiereDoree : PALETTE.parchemin));
    setText(this.help, view.row.help);
  }

  private scrollBy(dy: number): void {
    this.setScroll(this.scroll + dy);
    const view = this.rows[this.cursor];
    if (view) this.highlight.setY(view.line.y - this.scroll + this.o.scale).setVisible(this.lineShown(view.line));
  }

  private setScroll(value: number): void {
    const max = Math.max(0, this.contentBottom - (this.viewBottom - this.viewTop) - this.viewTop);
    this.scroll = Math.max(0, Math.min(max, Math.round(value)));
    for (const line of this.lines) {
      const shown = this.lineShown(line);
      for (const p of line.parts) p.obj.setY(p.baseY - this.scroll).setVisible(shown);
      if (line.zone?.input) line.zone.input.enabled = shown;
    }
    this.highlight.setVisible(true);
    this.upMark.setVisible(this.scroll > 0);
    this.downMark.setVisible(this.scroll < max);
  }

  private lineShown(line: Line): boolean {
    return line.y - this.scroll >= this.viewTop - 1 && line.y + line.h - this.scroll <= this.viewBottom + 1;
  }

  private change(step: number, wrap?: boolean): void {
    const view = this.rows[this.cursor];
    if (!view) return;
    if (view.row.opens) {
      // Gauche/Droite ne font rien sur une ligne qui ouvre un écran ; Entrée ou clic l'ouvrent.
      if (wrap === true) this.open(view.row);
      return;
    }
    const before = view.row.get();
    view.row.set(stepValue(view.row, step, wrap ?? view.row.wrap !== false));
    // Le son suit le réglage : un volume d'effets changé s'entend tout de suite à son nouveau niveau.
    if (view.row.get() !== before) playSfx('cursor');
    this.refresh();
  }

  private open(row: OptionRow): void {
    if (!row.opens || !this.o.onOpen) return;
    playSfx('confirm');
    this.o.onOpen(row.opens);
  }
}
