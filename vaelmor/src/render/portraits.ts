/**
 * Portraits peints de la compagnie (64×64, générés avec Pixellab à partir des personnages de la carte).
 * Un portrait par apparence (`assets/portraits/<id>.png`, mêmes ids que `data/skins.ts`) et une feuille
 * d'expressions (`assets/portraits/expressions/<id>.png` : humeurs × positions de bouche, voir `PORTRAIT_MOODS`).
 * Affichés à l'échelle de l'interface, recadrés dans la case prévue (visage et épaules), sans flou.
 */
import Phaser from 'phaser';
import { assetUrl } from '../core/config';
import { PORTRAIT_MOODS, PORTRAIT_MOUTHS, SKINS, SKIN_REV, type PortraitMood } from '../data/skins';

export const PORTRAIT_SIZE = 64;
export const portraitKey = (id: string): string => `portrait:skin:${id}`;
export const expressionKey = (id: string): string => `portrait:expr:${id}`;

/** À appeler dans `preload()`. */
export function preloadPortraits(scene: Phaser.Scene): void {
  for (const skin of SKINS) {
    scene.load.image(portraitKey(skin.id), assetUrl(`assets/portraits/${skin.id}.png?v=${SKIN_REV}`));
    scene.load.spritesheet(expressionKey(skin.id), assetUrl(`assets/portraits/expressions/${skin.id}.png?v=${SKIN_REV}`), { frameWidth: PORTRAIT_SIZE, frameHeight: PORTRAIT_SIZE });
  }
}

export function hasPortrait(scene: Phaser.Scene, id: string): boolean {
  return scene.textures.exists(portraitKey(id));
}

/** Humeur selon les PV : abattu sous un quart, neutre sinon. */
export function moodForHp(hp: number, max: number): PortraitMood {
  return max > 0 && hp / max <= 0.25 ? 'sad' : 'neutral';
}

/** Texture et image d'une humeur (bouche fermée, ou autre position de bouche). */
function moodFrame(scene: Phaser.Scene, id: string, mood: PortraitMood, mouth = 0): { key: string; frame?: number } {
  const row = mood === 'neutral' ? -1 : PORTRAIT_MOODS.indexOf(mood);
  if (row < 0 || !scene.textures.exists(expressionKey(id))) return { key: portraitKey(id) };
  return { key: expressionKey(id), frame: row * PORTRAIT_MOUTHS.length + mouth };
}

/**
 * Portrait dans une case (x, y, w, h) en pixels d'écran, à l'échelle `scale` (1 pixel d'art = `scale` pixels) :
 * centré horizontalement, recadré en haut et en bas si la case est moins haute que le portrait. Renvoie null
 * si l'apparence n'a pas de portrait (l'appelant garde alors le sprite de carte).
 */
export function portraitInBox(scene: Phaser.Scene, id: string, x: number, y: number, w: number, h: number, scale: number, depth: number, mood: PortraitMood = 'neutral'): Phaser.GameObjects.Image | null {
  if (!hasPortrait(scene, id)) return null;
  const cw = Math.min(PORTRAIT_SIZE, Math.floor(w / scale));
  const ch = Math.min(PORTRAIT_SIZE, Math.floor(h / scale));
  const cx = Math.floor((PORTRAIT_SIZE - cw) / 2);
  // Un peu plus de coupe en haut (capuche, cheveux) qu'en bas (épaules).
  const cy = Math.floor(((PORTRAIT_SIZE - ch) * 2) / 5);
  const ox = x + Math.round((w - cw * scale) / 2);
  const oy = y + Math.round((h - ch * scale) / 2);
  const { key, frame } = moodFrame(scene, id, mood);
  return scene.add
    .image(ox - cx * scale, oy - cy * scale, key, frame)
    .setOrigin(0, 0)
    .setScale(scale)
    .setCrop(cx, cy, cw, ch)
    .setDepth(depth);
}

/**
 * Le portrait « parle » pendant `ms` : la bouche passe d'une position à l'autre, puis se ferme.
 * Sans feuille d'expressions (ou en humeur neutre), rien ne bouge.
 */
export function speak(scene: Phaser.Scene, image: Phaser.GameObjects.Image, id: string, mood: PortraitMood, ms: number): void {
  if (mood === 'neutral' || !scene.textures.exists(expressionKey(id))) return;
  const order = [1, 0, 2, 1, 0, 2, 0];
  const step = 110;
  const count = Math.max(1, Math.min(order.length, Math.floor(ms / step)));
  for (let i = 0; i <= count; i++) {
    scene.time.delayedCall(i * step, () => {
      if (!image.active) return;
      const { key, frame } = moodFrame(scene, id, mood, i === count ? 0 : (order[i] as number));
      image.setTexture(key, frame);
    });
  }
}
