/**
 * Outil de debug superposé à toutes les scènes (GDD §16.2, module Debug).
 * F3 (ou `?debug` dans l'URL) : affiche/masque FPS, échelle, scène active et version.
 * Quand il est visible, il lève le drapeau `debug.enabled` du registre : les scènes
 * y branchent leurs outils (monde : F2 téléportation, F4 collisions, F9 passages)
 * et y publient leurs lignes de diagnostic (`debug.info`).
 */
import Phaser from 'phaser';
import { GAME_VERSION, MILESTONE } from '../core/config';
import { ActionInput } from '../core/input';
import { getDisplayInfo } from '../render/displayScaler';
import { PALETTE } from '../render/palette';
import { addText, setText, type PixelText } from '../ui/text';
import { SCENES } from './keys';

export class DebugScene extends Phaser.Scene {
  private actions!: ActionInput;
  private label!: PixelText;
  private background!: Phaser.GameObjects.Rectangle;
  private elapsed = 0;

  constructor() {
    super({ key: SCENES.debug, active: false });
  }

  create(): void {
    this.actions = new ActionInput(this);
    this.background = this.add.rectangle(4, 4, 10, 10, PALETTE.encre, 0.75).setOrigin(0, 0);
    this.label = addText(this, 10, 8, '', { font: 'small', scale: 2, color: PALETTE.cyanEclat, shadow: false });
    this.setVisible(new URLSearchParams(window.location.search).has('debug'));
    this.scene.bringToTop();
  }

  override update(_time: number, delta: number): void {
    if (this.actions.justPressed('debug')) this.setVisible(!this.label.visible);
    if (!this.label.visible) return;
    this.elapsed += delta;
    if (this.elapsed < 250) return;
    this.elapsed = 0;

    const size = getDisplayInfo();
    const active = this.game.scene
      .getScenes(true)
      .map((s) => s.scene.key)
      .filter((k) => k !== SCENES.debug)
      .join(', ');
    const info = this.registry.get('debug.info') as string | undefined;
    const extra = info ? [info] : [];
    setText(
      this.label,
      [
        `FPS ${Math.round(this.game.loop.actualFps)}`,
        `ZOOM ÉCRAN ×${size.cssZoom.toFixed(2)} (DPR ${size.dpr})`,
        `SCÈNE ${active || '-'}`,
        `V${GAME_VERSION} ${MILESTONE}`,
        ...extra,
      ].join('\n'),
    );
    this.background.setSize(Math.ceil(this.label.width) + 12, Math.ceil(this.label.height) + 8);
    this.scene.bringToTop();
  }

  private setVisible(visible: boolean): void {
    this.label.setVisible(visible);
    this.background.setVisible(visible);
    this.registry.set('debug.enabled', visible);
    this.elapsed = 1000;
  }
}
