/**
 * Textures procédurales du monde ouvert : héros, ombre, eau animée, brume des
 * passages, grains d'ambiance. Créées une fois (au premier passage dans la
 * scène Monde) ; les clés sont dans `WORLD_TEX`.
 */
import type Phaser from 'phaser';
import { HERO_H, HERO_POSES, HERO_W, HERO_WALK_FRAMES, paintHeroFrame, type HeroPose } from './heroSprite';
import { PALETTE } from './palette';
import { PixelCanvas } from './pixelCanvas';
import { WATER_FRAMES, WATER_TILE, paintWaterFrame } from './waterTile';

export const WORLD_TEX = {
  hero: 'world:hero',
  heroFrame: (pose: HeroPose, frame: number): string => `${pose}_${frame}`,
  shadow: 'world:shadow',
  water: (frame: number): string => `world:water:${frame}`,
  fog: 'world:fog',
  grain: 'world:grain',
  mist: 'world:mist',
} as const;

export const WORLD_TILESET_KEY = 'world_tiles';
export const WORLD_MAP_KEY = 'world_map';

export function ensureWorldTextures(scene: Phaser.Scene): void {
  if (scene.textures.exists(WORLD_TEX.hero)) return;

  // Héros : une feuille 4 × 3 images, découpée en cadres nommés « down_0 »…
  const sheet = new PixelCanvas(HERO_W * HERO_WALK_FRAMES, HERO_H * HERO_POSES.length);
  HERO_POSES.forEach((pose, row) => {
    for (let frame = 0; frame < HERO_WALK_FRAMES; frame++) {
      paintHeroFrame({ set: (x, y, color, alpha) => sheet.set(x, y, color, alpha ?? 255) }, frame * HERO_W, row * HERO_H, pose, frame);
    }
  });
  sheet.toTexture(scene, WORLD_TEX.hero);
  const heroTexture = scene.textures.get(WORLD_TEX.hero);
  HERO_POSES.forEach((pose, row) => {
    for (let frame = 0; frame < HERO_WALK_FRAMES; frame++) heroTexture.add(WORLD_TEX.heroFrame(pose, frame), 0, frame * HERO_W, row * HERO_H, HERO_W, HERO_H);
  });

  // Ombre : ellipse sombre translucide sous les pieds.
  const shadow = new PixelCanvas(12, 5);
  for (let y = 0; y < 5; y++) {
    for (let x = 0; x < 12; x++) {
      const dx = (x + 0.5 - 6) / 6;
      const dy = (y + 0.5 - 2.5) / 2.5;
      if (dx * dx + dy * dy <= 1) shadow.set(x, y, PALETTE.encre, dx * dx + dy * dy > 0.55 ? 70 : 110);
    }
  }
  shadow.toTexture(scene, WORLD_TEX.shadow);

  // Eau : 4 images de 16 × 16, répétées par un TileSprite sous la carte.
  for (let frame = 0; frame < WATER_FRAMES; frame++) {
    const water = new PixelCanvas(WATER_TILE, WATER_TILE);
    paintWaterFrame({ set: (x, y, color, alpha) => water.set(x, y, color, alpha ?? 255) }, frame);
    water.toTexture(scene, WORLD_TEX.water(frame));
  }

  // Brume des passages verrouillés : bruit tramé blanc translucide, répétable (32 × 32).
  const fog = new PixelCanvas(32, 32);
  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      const n = Math.sin(x * 0.55 + Math.sin(y * 0.35) * 2) * 0.5 + Math.sin(y * 0.5 + Math.cos(x * 0.3) * 2) * 0.5;
      const alpha = Math.max(0, Math.min(1, (n + 0.9) / 1.8));
      const threshold = ((x * 7 + y * 13) % 16) / 16;
      if (alpha > threshold) fog.set(x, y, 0xffffff, alpha > 0.7 ? 200 : 130);
    }
  }
  fog.toTexture(scene, WORLD_TEX.fog);

  // Grain d'ambiance : 2 × 2 pixels blancs.
  const grain = new PixelCanvas(2, 2);
  grain.fillRect(0, 0, 2, 2, 0xffffff);
  grain.toTexture(scene, WORLD_TEX.grain);

  // Brume flottante : bande douce tramée (64 × 24).
  const mist = new PixelCanvas(64, 24);
  for (let y = 0; y < 24; y++) {
    for (let x = 0; x < 64; x++) {
      const fall = 1 - Math.abs(y - 12) / 12;
      const wave = 0.5 + 0.5 * Math.sin(x * 0.2 + Math.sin(y * 0.5) * 1.5);
      const threshold = ((x * 5 + y * 11) % 16) / 16;
      if (fall * wave > threshold * 0.8 + 0.1) mist.set(x, y, 0xffffff, 140);
    }
  }
  mist.toTexture(scene, WORLD_TEX.mist);
}

/** Crée les animations de marche du héros (une fois). */
export function ensureHeroAnimations(scene: Phaser.Scene): void {
  for (const pose of HERO_POSES) {
    const key = `hero:walk:${pose}`;
    if (scene.anims.exists(key)) continue;
    scene.anims.create({
      key,
      frames: Array.from({ length: HERO_WALK_FRAMES }, (_, frame) => ({ key: WORLD_TEX.hero, frame: WORLD_TEX.heroFrame(pose, frame) })),
      frameRate: 8,
      repeat: -1,
    });
  }
}
