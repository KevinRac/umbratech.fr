/**
 * Fiche d'un membre de la compagnie à la préparation (clic droit) : portrait,
 * caractéristiques, équipement (arme, accessoire : un clic les change) et, en
 * dessous, le sac en cases : chaque objet porté occupe une case (5 au plus) ;
 * un clic sur une case rend l'objet au sac, un clic sur un objet du sac le donne.
 */
import Phaser from 'phaser';
import { PALETTE } from '../render/palette';
import { BATTLE_TEX } from '../render/battleTextures';
import { drawPanel } from './panel';
import { addText, fitText } from './text';

export interface SheetView {
  readonly name: string;
  readonly kind: string;
  readonly level: number;
  readonly sprite: string;
  readonly deployed: boolean;
  /** Caractéristiques (étiquette, valeur). */
  readonly stats: readonly (readonly [string, number])[];
  readonly weapon: { readonly name: string; readonly range: string; readonly canChange: boolean };
  readonly accessory: { readonly name: string; readonly canChange: boolean };
  readonly skill: string | null;
  /** Une entrée par case du sac (null : case vide). */
  readonly slots: readonly (string | null)[];
  /** Objets du sac que l'on peut donner. */
  readonly bag: readonly { readonly label: string; readonly left: number; readonly enabled: boolean }[];
  readonly count: string;
  readonly message: string | null;
}

export interface SheetCallbacks {
  readonly onWeapon: () => void;
  readonly onAccessory: () => void;
  readonly onTake: (slot: number) => void;
  readonly onGive: (bagIndex: number) => void;
  readonly onClose: () => void;
}

const SHEET_DEPTH = 60;

export class PrepSheet {
  private parts: Phaser.GameObjects.GameObject[] = [];
  private open = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly S: number,
  ) {}

  get isOpen(): boolean {
    return this.open;
  }

  close(): void {
    for (const p of this.parts) p.destroy();
    this.parts = [];
    this.open = false;
  }

  draw(view: SheetView, cb: SheetCallbacks): void {
    for (const p of this.parts) p.destroy();
    this.parts = [];
    this.open = true;
    const S = this.S;
    const width = this.scene.scale.width;
    const height = this.scene.scale.height;
    const parts = this.parts;
    const D = SHEET_DEPTH;
    const w = 600 * S;
    const h = 400 * S;
    const x = Math.round((width - w) / 2);
    const y = Math.round((height - h) / 2);

    // Voile : avale les clics destinés à la carte ; un clic droit dessus ferme la fiche.
    const veil = this.scene.add.rectangle(0, 0, width, height, PALETTE.nuit, 0.55).setOrigin(0, 0).setDepth(D).setInteractive();
    veil.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (p.rightButtonDown()) cb.onClose();
    });
    parts.push(veil);
    parts.push(drawPanel(this.scene, x, y, w, h, { scale: 2 * S, depth: D + 1 }));
    // Le panneau avale aussi les clics (un clic droit dedans ferme).
    const body = this.scene.add.zone(x, y, w, h).setOrigin(0, 0).setDepth(D + 1).setInteractive();
    body.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (p.rightButtonDown()) cb.onClose();
    });
    parts.push(body);

    // Une seule ligne par texte : trop long, il est tronqué par « … » plutôt que de sortir du cadre.
    const text = (tx: number, ty: number, t: string, color: number, extra: { maxWidth?: number; align?: 'left' | 'center' | 'right' } = {}): void => {
      const obj = addText(this.scene, tx, ty, t, { scale: S, color, ...(extra.align ? { align: extra.align } : {}) }).setDepth(D + 3);
      if (extra.maxWidth) fitText(obj, extra.maxWidth);
      parts.push(obj);
    };

    // En-tête : portrait, nom, classe.
    parts.push(this.scene.add.rectangle(x + 10 * S, y + 10 * S, 40 * S, 50 * S, 0x6fa8e8, 0.22).setOrigin(0, 0).setDepth(D + 2));
    parts.push(this.scene.add.image(x + 30 * S, y + 58 * S, BATTLE_TEX.ms(view.sprite, 'player'), BATTLE_TEX.msFrame('idle', 0)).setOrigin(0.5, 1).setScale(2 * S).setDepth(D + 3));
    text(x + 60 * S, y + 12 * S, `${view.name}  Niv ${view.level}`, PALETTE.parchemin, { maxWidth: w - 190 * S });
    text(x + 60 * S, y + 28 * S, view.kind, PALETTE.cyanEclat, { maxWidth: w - 190 * S });
    text(x + 60 * S, y + 44 * S, view.deployed ? 'Déployé' : 'Au camp', view.deployed ? 0x7fcf6a : PALETTE.desactive);
    text(x + w - 10 * S, y + 12 * S, 'Clic droit : fermer', PALETTE.ambre, { align: 'right' });

    // Caractéristiques : trois colonnes ; la compétence à droite.
    const sx = x + 10 * S;
    const sy = y + 78 * S;
    view.stats.forEach(([label, value], i) => {
      text(sx + (i % 3) * 78 * S, sy + Math.floor(i / 3) * 18 * S, `${label} ${value}`, PALETTE.parchemin);
    });
    if (view.skill) {
      text(x + 260 * S, sy, 'Compétence', PALETTE.cyanEclat);
      text(x + 260 * S, sy + 18 * S, view.skill, PALETTE.lumiereDoree, { maxWidth: w - 270 * S });
    }

    // Équipement : un clic change.
    const ey = y + 140 * S;
    text(x + 10 * S, ey, 'Équipement', PALETTE.cyanEclat);
    this.button(x + 10 * S, ey + 18 * S, 285 * S, 26 * S, `Arme : ${view.weapon.name} (${view.weapon.range})`, view.weapon.canChange, cb.onWeapon);
    this.button(x + 305 * S, ey + 18 * S, 285 * S, 26 * S, `Accessoire : ${view.accessory.name}`, view.accessory.canChange, cb.onAccessory);

    // Le sac : les cases, puis le contenu du sac de la compagnie.
    const by = y + 200 * S;
    text(x + 10 * S, by, 'Sac', PALETTE.cyanEclat);
    text(x + w - 10 * S, by, view.count, PALETTE.parchemin, { align: 'right' });
    const slotW = 108 * S;
    view.slots.forEach((item, i) => {
      const sxp = x + 10 * S + i * (slotW + 10 * S);
      const syp = by + 18 * S;
      const filled = item !== null;
      const box = this.scene.add.rectangle(sxp, syp, slotW, 30 * S, filled ? PALETTE.violetBrume : PALETTE.encre, filled ? 0.7 : 0.6).setOrigin(0, 0).setDepth(D + 2).setStrokeStyle(S, filled ? PALETTE.ambre : PALETTE.desactive, 0.9);
      parts.push(box);
      text(sxp + slotW / 2, syp + 7 * S, item ?? '·', filled ? PALETTE.parchemin : PALETTE.desactive, { align: 'center', maxWidth: slotW - 8 * S });
      if (filled) {
        const zone = this.scene.add.zone(sxp, syp, slotW, 30 * S).setOrigin(0, 0).setDepth(D + 4).setInteractive({ useHandCursor: true });
        zone.on('pointerdown', (p: Phaser.Input.Pointer) => (p.rightButtonDown() ? cb.onClose() : cb.onTake(i)));
        zone.on('pointerover', () => box.setStrokeStyle(S, PALETTE.jauneBle, 1));
        zone.on('pointerout', () => box.setStrokeStyle(S, PALETTE.ambre, 0.9));
        parts.push(zone);
      }
    });
    text(x + 10 * S, by + 60 * S, 'Sac de la compagnie (un clic donne l’objet)', PALETTE.ambre);
    if (view.bag.length === 0) text(x + 10 * S, by + 80 * S, 'Le sac est vide.', PALETTE.desactive);
    view.bag.forEach((b, i) => {
      this.button(x + 10 * S + (i % 3) * 196 * S, by + 80 * S + Math.floor(i / 3) * 30 * S, 186 * S, 26 * S, `${b.label} ×${b.left}`, b.enabled, () => cb.onGive(i));
    });
    if (view.message) text(x + w / 2, y + h - 20 * S, view.message, PALETTE.braise, { align: 'center' });
  }

  private button(bx: number, by: number, bw: number, bh: number, label: string, enabled: boolean, onClick: () => void): void {
    const S = this.S;
    const D = SHEET_DEPTH;
    const box = this.scene.add.rectangle(bx, by, bw, bh, PALETTE.violetBrume, enabled ? 0.55 : 0.2).setOrigin(0, 0).setDepth(D + 2).setStrokeStyle(S, enabled ? PALETTE.ambre : PALETTE.desactive, 0.8);
    this.parts.push(box);
    this.parts.push(fitText(addText(this.scene, bx + 8 * S, by + 5 * S, label, { scale: S, color: enabled ? PALETTE.parchemin : PALETTE.desactive }).setDepth(D + 3), bw - 16 * S));
    if (!enabled) return;
    const zone = this.scene.add.zone(bx, by, bw, bh).setOrigin(0, 0).setDepth(D + 4).setInteractive({ useHandCursor: true });
    zone.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (!p.rightButtonDown()) onClick();
    });
    zone.on('pointerover', () => box.setFillStyle(PALETTE.violetBrume, 0.9));
    zone.on('pointerout', () => box.setFillStyle(PALETTE.violetBrume, 0.55));
    this.parts.push(zone);
  }
}
