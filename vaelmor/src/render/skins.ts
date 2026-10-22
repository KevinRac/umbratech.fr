/** Chargement des feuilles d'apparence (PNG) et de leurs animations de marche. */
import Phaser from 'phaser';
import { assetUrl } from '../core/config';
import { SKINS, SKIN_CELL, SKIN_FRAME_MS, SKIN_ROWS } from '../data/skins';
import { skinFrameIndex, skinWalkFrames } from '../logic/skinFrames';

export const skinKey = (id: string): string => `skin:${id}`;
export const skinWalkKey = (id: string, pose: string): string => `skin:${id}:walk:${pose}`;

/** À appeler dans `preload()`. */
export function preloadSkins(scene: Phaser.Scene): void {
  for (const skin of SKINS) {
    scene.load.spritesheet(skinKey(skin.id), assetUrl(`assets/personnages/${skin.id}.png`), { frameWidth: SKIN_CELL, frameHeight: SKIN_CELL });
  }
}

export function hasSkin(scene: Phaser.Scene, id: string): boolean {
  return scene.textures.exists(skinKey(id));
}

/** Crée (une fois) les animations de marche d'une apparence ; renvoie son nombre d'images. */
export function ensureSkinAnimations(scene: Phaser.Scene, id: string): number {
  const def = SKINS.find((s) => s.id === id);
  if (!def || !hasSkin(scene, id)) return 0;
  for (const pose of SKIN_ROWS) {
    const key = skinWalkKey(id, pose);
    if (scene.anims.exists(key)) continue;
    scene.anims.create({
      key,
      frames: skinWalkFrames(pose, def.frames).map((frame) => ({ key: skinKey(id), frame })),
      frameRate: 1000 / SKIN_FRAME_MS,
      repeat: -1,
    });
  }
  return def.frames;
}

/** Image fixe (arrêt) d'une pose. */
export function skinIdleFrame(id: string, pose: (typeof SKIN_ROWS)[number]): number {
  const def = SKINS.find((s) => s.id === id);
  return skinFrameIndex(pose, 0, def?.frames ?? 1);
}
