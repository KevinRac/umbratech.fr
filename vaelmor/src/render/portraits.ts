/**
 * Portraits peints de la compagnie (64×64, générés avec Pixellab à partir des personnages de la carte).
 * Un portrait par apparence (`assets/portraits/<id>.png`, mêmes ids que `data/skins.ts`) et une feuille
 * d'expressions (`assets/portraits/expressions/<id>.png` : humeurs × positions de bouche, voir `PORTRAIT_MOODS`).
 * Affichés à l'échelle de l'interface, recadrés dans la case prévue (visage et épaules), sans flou.
 */
import Phaser from 'phaser';
import { assetUrl } from '../core/config';
import { FOE_PORTRAITS, PORTRAIT_MOODS, PORTRAIT_MOUTHS, SKINS, SKIN_REV, type PortraitMood } from '../data/skins';
import { parseSprite } from '../logic/skinFrames';
import { paintDetails } from './skinDetails';

export const PORTRAIT_SIZE = 64;
export const portraitKey = (id: string): string => `portrait:skin:${id}`;
export const expressionKey = (id: string): string => `portrait:expr:${id}`;

const FOE_PORTRAIT_REV = 1;
export const foePortraitKey = (id: string): string => `portrait:foe:${id}`;

/** À appeler dans `preload()`. */
export function preloadPortraits(scene: Phaser.Scene): void {
  for (const skin of SKINS) {
    scene.load.image(portraitKey(skin.id), assetUrl(`assets/portraits/${skin.id}.png?v=${SKIN_REV}`));
    scene.load.spritesheet(expressionKey(skin.id), assetUrl(`assets/portraits/expressions/${skin.id}.png?v=${SKIN_REV}`), { frameWidth: PORTRAIT_SIZE, frameHeight: PORTRAIT_SIZE });
  }
  for (const id of FOE_PORTRAITS) scene.load.image(foePortraitKey(id), assetUrl(`assets/portraits/ennemis/${id}.png?v=${FOE_PORTRAIT_REV}`));
}

export function hasPortrait(scene: Phaser.Scene, id: string): boolean {
  ensureVariantPortrait(scene, id);
  return scene.textures.exists(portraitKey(id));
}

/** Portrait et expressions d'une recrue avec un détail (`lame_du_serment#2`) : copies peintes, créées une fois. */
function ensureVariantPortrait(scene: Phaser.Scene, id: string): void {
  const { base, variant } = parseSprite(id);
  if (variant === 0) return;
  const copy = (from: string, to: string, frames: number): void => {
    if (scene.textures.exists(to) || !scene.textures.exists(from)) return;
    const source = scene.textures.get(from).getSourceImage() as HTMLImageElement;
    const canvas = scene.textures.createCanvas(to, source.width, source.height);
    if (!canvas) return;
    const ctx = canvas.getContext();
    ctx.drawImage(source, 0, 0);
    const image = ctx.getImageData(0, 0, source.width, source.height);
    const cols = Math.floor(source.width / PORTRAIT_SIZE);
    for (let f = 0; f < frames; f++) paintDetails(image, (f % cols) * PORTRAIT_SIZE, Math.floor(f / cols) * PORTRAIT_SIZE, PORTRAIT_SIZE, PORTRAIT_SIZE, variant, true, base);
    ctx.putImageData(image, 0, 0);
    canvas.refresh();
    if (frames > 1) for (let f = 0; f < frames; f++) canvas.add(f, 0, (f % cols) * PORTRAIT_SIZE, Math.floor(f / cols) * PORTRAIT_SIZE, PORTRAIT_SIZE, PORTRAIT_SIZE);
  };
  copy(portraitKey(base), portraitKey(id), 1);
  copy(expressionKey(base), expressionKey(id), PORTRAIT_MOODS.length * PORTRAIT_MOUTHS.length);
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
  const { key, frame } = moodFrame(scene, id, mood);
  return imageInBox(scene, key, frame, x, y, w, h, scale, depth);
}

/** Portrait d'un boss ou d'un ennemi nommé dans une case (voir `portraitInBox`), ou null s'il n'en a pas. */
export function foePortraitInBox(scene: Phaser.Scene, id: string, x: number, y: number, w: number, h: number, scale: number, depth: number, dark = false): Phaser.GameObjects.Image | null {
  if (!scene.textures.exists(foePortraitKey(id))) return null;
  const image = imageInBox(scene, foePortraitKey(id), undefined, x, y, w, h, scale, depth);
  // Phase 2 : le visage s'assombrit et se teinte de Brume.
  if (dark) image.setTint(0x8f7fa8);
  return image;
}

function imageInBox(scene: Phaser.Scene, key: string, frame: number | undefined, x: number, y: number, w: number, h: number, scale: number, depth: number): Phaser.GameObjects.Image {
  const cw = Math.min(PORTRAIT_SIZE, Math.floor(w / scale));
  const ch = Math.min(PORTRAIT_SIZE, Math.floor(h / scale));
  const cx = Math.floor((PORTRAIT_SIZE - cw) / 2);
  // Un peu plus de coupe en haut (capuche, cheveux) qu'en bas (épaules).
  const cy = Math.floor(((PORTRAIT_SIZE - ch) * 2) / 5);
  const ox = x + Math.round((w - cw * scale) / 2);
  const oy = y + Math.round((h - ch * scale) / 2);
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
