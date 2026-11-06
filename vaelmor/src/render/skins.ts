/** Chargement des feuilles d'apparence (PNG) et de leurs animations de marche. */
import Phaser from 'phaser';
import { assetUrl } from '../core/config';
import { FOE_SKINS, SKINS, SKIN_CELL, SKIN_REV, SKIN_FRAME_MS, SKIN_ROWS } from '../data/skins';
import { skinFrameIndex, skinWalkFrames } from '../logic/skinFrames';

export const skinKey = (id: string): string => `skin:${id}`;
export const skinCombatKey = (id: string): string => `skin:combat:${id}`;
export const skinWalkKey = (id: string, pose: string): string => `skin:${id}:walk:${pose}`;

/** À appeler dans `preload()`. */
export function preloadSkins(scene: Phaser.Scene): void {
  for (const skin of SKINS) {
    scene.load.spritesheet(skinKey(skin.id), assetUrl(`assets/personnages/${skin.id}.png?v=${SKIN_REV}`), { frameWidth: SKIN_CELL, frameHeight: SKIN_CELL });
    scene.load.image(skinCombatKey(skin.id), assetUrl(`assets/personnages/combat/${skin.id}.png?v=${SKIN_REV}`));
  }
}

/** Ennemis du monde ouvert peints (n°281). */
export const foeSkinKey = (id: string): string => `foe:skin:${id}`;
export const foeSkinWalkKey = (id: string, pose: string): string => `foe:skin:${id}:walk:${pose}`;

/** À appeler dans `preload()` : une feuille manquante n'est pas une erreur fatale (l'ennemi garde sa silhouette). */
export function preloadFoeSkins(scene: Phaser.Scene): void {
  for (const skin of FOE_SKINS) {
    const cell = skin.cell ?? SKIN_CELL;
    scene.load.spritesheet(foeSkinKey(skin.id), assetUrl(`assets/ennemis/${skin.id}.png?v=${SKIN_REV}`), { frameWidth: cell, frameHeight: cell });
  }
}

/** Feuille peinte de l'ennemi `sprite` (variante d'un nommé `modele#n` comprise), si elle est chargée. */
export function foeSkinOf(scene: Phaser.Scene, sprite: string): { id: string; frames: number; cell: number } | null {
  const id = sprite.split('#')[0] as string;
  const def = FOE_SKINS.find((s) => s.id === id);
  if (!def || !scene.textures.exists(foeSkinKey(id))) return null;
  const cell = def.cell ?? SKIN_CELL;
  for (const pose of SKIN_ROWS) {
    const key = foeSkinWalkKey(id, pose);
    if (scene.anims.exists(key)) continue;
    scene.anims.create({
      key,
      frames: skinWalkFrames(pose, def.frames).map((frame) => ({ key: foeSkinKey(id), frame })),
      frameRate: 1000 / SKIN_FRAME_MS,
      repeat: -1,
    });
  }
  return { id, frames: def.frames, cell };
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
