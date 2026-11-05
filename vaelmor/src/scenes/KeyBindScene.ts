/**
 * Écran des touches (lot E de M10, décisions n°241 et n°257), ouvert depuis la
 * ligne « Touches » des Options : une ligne par action, trois cases de touche.
 * Règles dans `logic/input/keymap.ts` (conflit refusé, touche verrouillée,
 * dernière touche gardée) ; chaque changement est enregistré aussitôt et les
 * scènes ouvertes le suivent (`ActionInput` écoute `keys`).
 *
 * Cet écran lit le clavier lui-même, avec des touches fixes (flèches, Entrée,
 * Échap, Suppr / Retour arrière) : quoi qu'on ait remappé, on peut toujours y
 * revenir et réinitialiser.
 */
import Phaser from 'phaser';
import { playSfx } from '../audio/sfx';
import { keyNameOf } from '../core/input';
import { loadKeyBindings, saveKeyBindings } from '../core/settings';
import { uiScaleFor } from '../core/viewport';
import { ACTION_LABEL, KEY_LABEL, REMAPPABLE, SLOTS, bindKey, clearKey, defaultBindings, isLockedSlot, type KeyBindings } from '../logic/input/keymap';
import { PALETTE } from '../render/palette';
import { drawPanel } from '../ui/panel';
import { addText, setText, sizableLineHeight, type PixelText } from '../ui/text';
import { SCENES } from './keys';

export interface KeyBindSceneData {
  readonly onClose: () => void;
}

const DEPTH = 900;
const KC = Phaser.Input.Keyboard.KeyCodes;

export class KeyBindScene extends Phaser.Scene {
  private params!: KeyBindSceneData;
  private bindings!: KeyBindings;
  /** Ligne choisie : une action, ou la dernière ligne « Réinitialiser ». */
  private row = 0;
  private col = 0;
  /** En attente d'une touche pour la case choisie. */
  private capturing = false;
  private cells: PixelText[][] = [];
  private cellBoxes: Phaser.GameObjects.Rectangle[][] = [];
  private reset!: PixelText;
  private resetBox!: Phaser.GameObjects.Rectangle;
  private message!: PixelText;
  private closed = false;
  private readonly onKey = (event: KeyboardEvent): void => this.handleKey(event);

  constructor() {
    super(SCENES.keyBind);
  }

  create(params: KeyBindSceneData): void {
    this.params = params;
    this.closed = false;
    this.capturing = false;
    this.row = 0;
    this.col = 1;
    this.cells = [];
    this.cellBoxes = [];
    this.bindings = loadKeyBindings();
    const S = uiScaleFor(this.scale.height);
    const { width, height } = this.scale;
    this.add.rectangle(0, 0, width, height, PALETTE.nuit, 0.94).setOrigin(0, 0).setDepth(DEPTH).setInteractive();
    addText(this, width / 2, 12 * S, 'TOUCHES', { scale: 2 * S, color: PALETTE.lumiereDoree, align: 'center', shadowOffset: 2 * S }).setDepth(DEPTH + 1);
    addText(this, width / 2, height - 22 * S, 'Flèches : choisir    Entrée : changer    Suppr : effacer    Échap : retour', { scale: S, color: PALETTE.metalClair, align: 'center' }).setDepth(DEPTH + 1);
    const panelW = 760 * S;
    const top = 44 * S;
    const panelH = height - top - 34 * S;
    const x = Math.round((width - panelW) / 2);
    drawPanel(this, x, top, panelW, panelH, { scale: 2 * S }).setDepth(DEPTH + 1);
    const lh = sizableLineHeight();
    const rowH = Math.max(24, lh + 5) * S;
    const labelW = 200 * S;
    const colW = Math.floor((panelW - 28 * S - labelW) / SLOTS);
    const left = x + 14 * S;
    let y = top + 10 * S;
    ['Action', 'Touche 1', 'Touche 2', 'Touche 3'].forEach((h, i) =>
      addText(this, i === 0 ? left + 4 * S : left + labelW + colW * (i - 1) + colW / 2, y, h.toUpperCase(), { font: 'small', scale: 2 * S, color: PALETTE.lumiereDoree, align: i === 0 ? 'left' : 'center' }).setDepth(DEPTH + 2),
    );
    y += 20 * S;
    const textDy = Math.round((rowH - lh * S) / 2);
    REMAPPABLE.forEach((action, r) => {
      addText(this, left + 4 * S, y + textDy, ACTION_LABEL[action], { scale: S, sizable: true }).setDepth(DEPTH + 2);
      const row: PixelText[] = [];
      const boxes: Phaser.GameObjects.Rectangle[] = [];
      for (let c = 0; c < SLOTS; c++) {
        const cx = left + labelW + colW * c;
        const box = this.add.rectangle(cx + 3 * S, y + S, colW - 6 * S, rowH - 2 * S, PALETTE.violetBrume, 0).setOrigin(0, 0).setDepth(DEPTH + 2);
        box.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
          this.select(r, c);
          this.startCapture();
        });
        box.on('pointerover', () => !this.capturing && this.select(r, c));
        boxes.push(box);
        row.push(addText(this, cx + colW / 2, y + textDy, '', { scale: S, align: 'center', sizable: true }).setDepth(DEPTH + 3));
      }
      this.cells.push(row);
      this.cellBoxes.push(boxes);
      y += rowH;
    });
    y += 6 * S;
    this.resetBox = this.add.rectangle(left + labelW, y, colW * SLOTS, rowH, PALETTE.violetBrume, 0).setOrigin(0, 0).setDepth(DEPTH + 2);
    this.resetBox.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
      this.select(REMAPPABLE.length, 0);
      this.resetAll();
    });
    this.resetBox.on('pointerover', () => !this.capturing && this.select(REMAPPABLE.length, 0));
    this.reset = addText(this, left + labelW + (colW * SLOTS) / 2, y + textDy, 'Réinitialiser toutes les touches', { scale: S, align: 'center', sizable: true }).setDepth(DEPTH + 3);
    this.message = addText(this, width / 2, top + panelH - 26 * S, '', { scale: S, color: PALETTE.metalClair, align: 'center' }).setDepth(DEPTH + 3);
    this.keyboardRef().on('keydown', this.onKey);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.keyboardRef().off('keydown', this.onKey));
    this.refresh();
    this.say('Flèches, Entrée et Échap (en gris) restent toujours liées : on ne peut pas se bloquer.');
    this.cameras.main.fadeIn(150, 0, 0, 0);
  }

  private keyboardRef(): Phaser.Input.Keyboard.KeyboardPlugin {
    const keyboard = this.input.keyboard;
    if (!keyboard) throw new Error('Clavier indisponible.');
    return keyboard;
  }

  private handleKey(event: KeyboardEvent): void {
    if (this.closed || event.repeat) return;
    if (this.capturing) {
      event.preventDefault();
      if (event.keyCode === KC.ESC) {
        this.capturing = false;
        playSfx('cancel');
        this.say('Changement annulé.');
        this.refresh();
        return;
      }
      const name = keyNameOf(event);
      this.capturing = false;
      if (!name) {
        playSfx('refuse');
        this.say('Cette touche n’est pas prise en charge.', true);
      } else this.apply(bindKey(this.bindings, REMAPPABLE[this.row] as (typeof REMAPPABLE)[number], this.col, name));
      this.refresh();
      return;
    }
    const onReset = this.row === REMAPPABLE.length;
    switch (event.keyCode) {
      case KC.UP:
        this.select((this.row + REMAPPABLE.length) % (REMAPPABLE.length + 1), this.col, true);
        break;
      case KC.DOWN:
        this.select((this.row + 1) % (REMAPPABLE.length + 1), this.col, true);
        break;
      case KC.LEFT:
        if (!onReset) this.select(this.row, (this.col + SLOTS - 1) % SLOTS, true);
        break;
      case KC.RIGHT:
        if (!onReset) this.select(this.row, (this.col + 1) % SLOTS, true);
        break;
      case KC.ENTER:
      case KC.SPACE:
        if (onReset) this.resetAll();
        else this.startCapture();
        break;
      case KC.DELETE:
      case KC.BACKSPACE:
        if (!onReset) {
          this.apply(clearKey(this.bindings, REMAPPABLE[this.row] as (typeof REMAPPABLE)[number], this.col), 'Case vidée.');
          this.refresh();
        }
        break;
      case KC.ESC:
        this.close();
        break;
      default:
        return;
    }
    event.preventDefault();
  }

  private select(row: number, col: number, sound = false): void {
    if (sound && (row !== this.row || col !== this.col)) playSfx('cursor');
    this.row = row;
    this.col = col;
    this.refresh();
  }

  private startCapture(): void {
    const action = REMAPPABLE[this.row];
    if (!action) return;
    if (isLockedSlot(action, this.col)) {
      playSfx('refuse');
      this.say(`${KEY_LABEL[this.bindings[action][0] ?? ''] ?? ''} reste liée à « ${ACTION_LABEL[action]} » : choisis la case 2 ou 3.`, true);
      return;
    }
    playSfx('confirm');
    this.capturing = true;
    this.say(`Appuie sur la nouvelle touche pour « ${ACTION_LABEL[action]} » (Échap : annuler).`);
    this.refresh();
  }

  private apply(result: ReturnType<typeof bindKey>, okMessage = 'Touche enregistrée.'): void {
    if (!result.ok) {
      playSfx('refuse');
      this.say(result.message, true);
      return;
    }
    this.bindings = result.bindings;
    saveKeyBindings(this.bindings);
    playSfx('save');
    this.say(okMessage);
  }

  private resetAll(): void {
    this.bindings = defaultBindings();
    saveKeyBindings(this.bindings);
    playSfx('save');
    this.say('Touches d’origine rétablies (ZQSD et WASD, flèches, Entrée, Échap…).');
    this.refresh();
  }

  private say(text: string, warn = false): void {
    setText(this.message, text);
    this.message.setTint(warn ? PALETTE.ambre : PALETTE.metalClair);
  }

  private refresh(): void {
    REMAPPABLE.forEach((action, r) => {
      const keys = this.bindings[action];
      for (let c = 0; c < SLOTS; c++) {
        const text = this.cells[r]?.[c];
        const box = this.cellBoxes[r]?.[c];
        if (!text || !box) continue;
        const chosen = r === this.row && c === this.col;
        const key = keys[c];
        setText(text, chosen && this.capturing ? '…' : key ? (KEY_LABEL[key] ?? key) : '—');
        text.setTint(isLockedSlot(action, c) ? PALETTE.metalClair : chosen ? PALETTE.lumiereDoree : key ? PALETTE.cyanEclat : PALETTE.metal);
        box.setFillStyle(chosen && this.capturing ? PALETTE.ambre : PALETTE.violetBrume, chosen ? (this.capturing ? 0.35 : 0.6) : 0);
      }
    });
    const onReset = this.row === REMAPPABLE.length;
    this.resetBox.setFillStyle(PALETTE.violetBrume, onReset ? 0.6 : 0);
    this.reset.setTint(onReset ? PALETTE.lumiereDoree : PALETTE.parchemin);
  }

  private close(): void {
    this.closed = true;
    playSfx('menuClose');
    this.scene.stop();
    this.params.onClose();
  }
}
