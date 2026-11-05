/**
 * Écran Options (jalon M10, décision n°232), posé par-dessus le titre, la
 * pause du monde ou le menu de carte du combat : la même liste de réglages
 * partout (`ui/OptionsPanel.ts`). Un réglage s'enregistre dès qu'il change ;
 * la scène d'en dessous l'applique en écoutant `onSettingsChange`.
 */
import Phaser from 'phaser';
import { ActionInput } from '../core/input';
import { uiScaleFor } from '../core/viewport';
import { PALETTE } from '../render/palette';
import { OptionsPanel } from '../ui/OptionsPanel';
import { drawPanel } from '../ui/panel';
import { addText } from '../ui/text';
import { SCENES } from './keys';

export interface OptionsSceneData {
  readonly onClose: () => void;
}

const DEPTH = 800;

export class OptionsScene extends Phaser.Scene {
  private actions!: ActionInput;
  private panel: OptionsPanel | null = null;
  private params!: OptionsSceneData;
  private closed = false;

  constructor() {
    super(SCENES.options);
  }

  create(params: OptionsSceneData): void {
    this.params = params;
    this.closed = false;
    this.actions = new ActionInput(this);
    const S = uiScaleFor(this.scale.height);
    const { width, height } = this.scale;
    this.add.rectangle(0, 0, width, height, PALETTE.nuit, 0.9).setOrigin(0, 0).setDepth(DEPTH).setInteractive();
    addText(this, width / 2, 14 * S, 'OPTIONS', { scale: 2 * S, color: PALETTE.lumiereDoree, align: 'center', shadowOffset: 2 * S }).setDepth(DEPTH + 1);
    addText(this, width / 2, 46 * S, 'Chaque réglage est enregistré aussitôt.', { scale: S, color: PALETTE.metalClair, align: 'center' }).setDepth(DEPTH + 1);
    addText(this, width / 2, height - 22 * S, 'Haut/Bas : choisir    Gauche/Droite ou Entrée : changer    Échap : retour', { scale: S, color: PALETTE.metalClair, align: 'center' }).setDepth(DEPTH + 1);
    const panelW = 620 * S;
    const top = 70 * S;
    const panelH = height - top - 36 * S;
    const x = Math.round((width - panelW) / 2);
    drawPanel(this, x, top, panelW, panelH, { scale: 2 * S }).setDepth(DEPTH + 1);
    this.panel = new OptionsPanel(this, this.actions, { x: x + 14 * S, y: top + 12 * S, width: panelW - 28 * S, height: panelH - 20 * S, scale: S, depth: DEPTH + 2, horizontal: true });
    this.actions.consume('confirm');
    this.cameras.main.fadeIn(150, 0, 0, 0);
  }

  override update(): void {
    if (this.closed) return;
    if (this.actions.consume('cancel')) {
      this.close();
      return;
    }
    this.panel?.update();
  }

  private close(): void {
    this.closed = true;
    this.panel?.destroy();
    this.panel = null;
    this.scene.stop();
    this.params.onClose();
  }
}
