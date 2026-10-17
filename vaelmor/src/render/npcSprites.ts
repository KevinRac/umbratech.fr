/**
 * Apparence des PNJ (jalon M2, décision n°48) : une `LookDef` des données
 * devient un `CharacterLook` du gabarit commun 16×28, avec les mêmes rampes de
 * tons que le héros. Pas de corpulence de combat : tous les villageois ont la
 * silhouette « normale ». Module sans DOM : il peint dans un puits de pixels.
 */
import type { LookDef, NpcFacing } from '../data/townSchemas';
import { CHAR_H, CHAR_W, paintCharacterFrame, ramp3, type CharPose, type CharacterLook } from './characterSprite';
import { PALETTE as P, mixColor } from './palette';
import type { PixelSink } from './waterTile';

export const NPC_W = CHAR_W;
export const NPC_H = CHAR_H;
/** Images d'attente : debout, puis la respiration (le haut du corps descend d'un pixel). */
export const NPC_IDLE_FRAMES = 2;
export const NPC_POSES = ['down', 'up', 'side'] as const satisfies readonly CharPose[];

const parseHex = (hex: string): number => Number.parseInt(hex.slice(1), 16);

/** Couleur de la donnée, légèrement ramenée vers l'ocre : le ton « fin d'après-midi » (décision n°43). */
const warm = (hex: string): number => mixColor(parseHex(hex), P.terreSeche, 0.14);

export function lookFromDef(def: LookDef): CharacterLook {
  return {
    skin: ramp3(warm(def.skin), P.rougeCendre, P.parchemin, 0.9),
    hair: ramp3(warm(def.hair), P.ombreProfonde, P.ocre),
    top: ramp3(warm(def.top), P.ombreProfonde, mixColor(P.ciel, P.lumiereChaude, 0.3)),
    tunic: ramp3(warm(def.tunic), P.terreSombre, P.parchemin),
    accent: ramp3(warm(def.accent), P.ombreViolette, P.orangeForge),
    belt: ramp3(warm(def.belt), P.ombreProfonde, P.ocreClair),
    pants: ramp3(warm(def.pants), P.ombreProfonde, P.pierre),
    boots: ramp3(warm(def.boots), P.ombreProfonde, P.terreSeche),
    metal: ramp3(P.metal, P.ombreProfonde, P.metalClair),
    eye: mixColor(P.nuitBleue, P.ombreProfonde, 0.4),
    head: def.head,
    outfit: def.outfit,
    accessory: def.accessory,
  };
}

/** Pose et retournement horizontal pour un regard (le profil gauche est le profil droit retourné). */
export function facingPose(facing: NpcFacing): { pose: CharPose; flipX: boolean } {
  switch (facing) {
    case 'n':
      return { pose: 'up', flipX: false };
    case 's':
      return { pose: 'down', flipX: false };
    case 'e':
      return { pose: 'side', flipX: false };
    case 'w':
      return { pose: 'side', flipX: true };
  }
}

/** Direction (n, s, e, w) à regarder pour faire face à un point. */
export function facingToward(dx: number, dy: number): NpcFacing {
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'e' : 'w';
  return dy > 0 ? 's' : 'n';
}

/** Peint une image d'attente d'un PNJ au coin (ox, oy). */
export function paintNpcFrame(sink: PixelSink, ox: number, oy: number, look: CharacterLook, pose: CharPose, idleFrame: number): void {
  paintCharacterFrame(sink, ox, oy, look, pose, 0, { breathe: idleFrame % NPC_IDLE_FRAMES === 1 });
}
