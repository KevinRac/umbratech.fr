/**
 * Sprite du héros (GDD §4.2, §12.4 — décision n°48) : voyageur encapuchonné,
 * cape bleu nuit, écharpe rouge cendre, épée dans le dos. 16×28 px.
 *
 * Le héros est une apparence du gabarit commun (`render/characterSprite.ts`) :
 * les PNJ du jalon M2 réutiliseront ce gabarit avec leurs propres couleurs,
 * coiffure, tenue et accessoire. Pieds et boîte de collision inchangés
 * (pieds sur la rangée 26, boîte 10×8 de `balance.json`).
 */
import { CHAR_H, CHAR_POSES, CHAR_W, CHAR_WALK_FRAMES, paintCharacterFrame, ramp3, type CharacterLook, type CharPose } from './characterSprite';
import { PALETTE as P, mixColor } from './palette';
import type { PixelSink } from './waterTile';

export const HERO_W = CHAR_W;
export const HERO_H = CHAR_H;
export const HERO_WALK_FRAMES = CHAR_WALK_FRAMES;
export const HERO_POSES = CHAR_POSES;
export type HeroPose = CharPose;

export const HERO_LOOK: CharacterLook = {
  skin: ramp3(mixColor(P.sable, P.orangeForge, 0.2), P.rougeCendre, P.parchemin, 0.9),
  hair: ramp3(mixColor(P.terreSombre, P.brique, 0.25), P.ombreProfonde, P.ocre),
  top: ramp3(mixColor(P.bleuNuit, P.bleuGris, 0.5), P.ombreProfonde, mixColor(P.ciel, P.lumiereChaude, 0.3)),
  tunic: ramp3(mixColor(P.sable, P.terreSeche, 0.4), P.terreSombre, P.parchemin),
  accent: ramp3(mixColor(P.rougeCendre, P.brique, 0.15), P.ombreViolette, P.orangeForge),
  belt: ramp3(mixColor(P.ambre, P.terreSombre, 0.45), P.ombreProfonde, P.ocreClair),
  pants: ramp3(mixColor(P.grisRoux, P.terreSombre, 0.45), P.ombreProfonde, P.pierre),
  boots: ramp3(mixColor(P.terreSombre, P.brique, 0.3), P.ombreProfonde, P.terreSeche),
  metal: ramp3(P.metal, P.ombreProfonde, P.metalClair),
  eye: mixColor(P.nuitBleue, P.ombreProfonde, 0.4),
  head: 'hood',
  outfit: 'cloak',
  accessory: 'sword',
};

/** Peint une image du héros au coin (ox, oy) du puits de pixels. */
export function paintHeroFrame(sink: PixelSink, ox: number, oy: number, pose: HeroPose, frame: number): void {
  paintCharacterFrame(sink, ox, oy, HERO_LOOK, pose, frame);
}
