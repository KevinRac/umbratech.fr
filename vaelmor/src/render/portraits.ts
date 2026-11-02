/**
 * Portraits peints de la compagnie (64×64, générés avec Pixellab à partir des personnages de la carte).
 * Un portrait par apparence (`assets/portraits/<id>.png`, mêmes ids que `data/skins.ts`).
 * Affichés à l'échelle de l'interface, recadrés dans la case prévue (visage et épaules), sans flou.
 */
import Phaser from 'phaser';
import { assetUrl } from '../core/config';
import { SKINS, SKIN_REV } from '../data/skins';

export const PORTRAIT_SIZE = 64;
export const portraitKey = (id: string): string => `portrait:skin:${id}`;

/** À appeler dans `preload()`. */
export function preloadPortraits(scene: Phaser.Scene): void {
  for (const skin of SKINS) scene.load.image(portraitKey(skin.id), assetUrl(`assets/portraits/${skin.id}.png?v=${SKIN_REV}`));
}

export function hasPortrait(scene: Phaser.Scene, id: string): boolean {
  return scene.textures.exists(portraitKey(id));
}

/**
 * Portrait dans une case (x, y, w, h) en pixels d'écran, à l'échelle `scale` (1 pixel d'art = `scale` pixels) :
 * centré horizontalement, recadré en haut et en bas si la case est moins haute que le portrait. Renvoie null
 * si l'apparence n'a pas de portrait (l'appelant garde alors le sprite de carte).
 */
export function portraitInBox(scene: Phaser.Scene, id: string, x: number, y: number, w: number, h: number, scale: number, depth: number): Phaser.GameObjects.Image | null {
  if (!hasPortrait(scene, id)) return null;
  const cw = Math.min(PORTRAIT_SIZE, Math.floor(w / scale));
  const ch = Math.min(PORTRAIT_SIZE, Math.floor(h / scale));
  const cx = Math.floor((PORTRAIT_SIZE - cw) / 2);
  // Un peu plus de coupe en haut (capuche, cheveux) qu'en bas (épaules).
  const cy = Math.floor(((PORTRAIT_SIZE - ch) * 2) / 5);
  const ox = x + Math.round((w - cw * scale) / 2);
  const oy = y + Math.round((h - ch * scale) / 2);
  return scene.add
    .image(ox - cx * scale, oy - cy * scale, portraitKey(id))
    .setOrigin(0, 0)
    .setScale(scale)
    .setCrop(cx, cy, cw, ch)
    .setDepth(depth);
}
