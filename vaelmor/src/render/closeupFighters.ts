/**
 * Feuilles peintes de l'écran de combat rapproché (jalon M8, `battleAnims.json › fighters`).
 * Une feuille par apparence (`assets/combat/<sheet>.png`) : une rangée par
 * animation, des images de `frame` pixels tournées vers l'est.
 */
import type Phaser from 'phaser';
import { assetUrl } from '../core/config';
import { EMBEDDED_DATA } from '../data';
import type { BattleAnimsFile, FighterAnim, FighterDef } from '../data/schemas';
import { SKIN_REV } from '../data/skins';

export const fighterKey = (sheet: string): string => `closeup:fighter:${sheet}`;

/** À appeler dans `preload()` (les données ne sont pas encore validées : on lit le fichier embarqué). */
export function preloadCloseupFighters(scene: Phaser.Scene): void {
  const fighters = (EMBEDDED_DATA.battleAnims as BattleAnimsFile).fighters ?? {};
  const loaded = new Set<string>();
  for (const def of Object.values(fighters)) {
    if (loaded.has(def.sheet)) continue;
    loaded.add(def.sheet);
    scene.load.spritesheet(fighterKey(def.sheet), assetUrl(`assets/combat/${def.sheet}.png?v=${SKIN_REV}`), { frameWidth: def.frame[0], frameHeight: def.frame[1] });
  }
}

/** Numéro d'image dans la feuille (rangée de l'animation, image `frame` bornée à l'animation). */
export function fighterFrame(scene: Phaser.Scene, def: FighterDef, anim: FighterAnim, frame = 0): number | null {
  const a = def.anims[anim];
  if (!a) return null;
  const texture = scene.textures.get(fighterKey(def.sheet));
  const cols = Math.max(1, Math.floor((texture.getSourceImage() as HTMLImageElement).width / def.frame[0]));
  return a.row * cols + Math.max(0, Math.min(a.frames - 1, frame));
}

export function hasFighterSheet(scene: Phaser.Scene, def: FighterDef): boolean {
  return scene.textures.exists(fighterKey(def.sheet));
}
