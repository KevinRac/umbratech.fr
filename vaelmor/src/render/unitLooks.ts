/**
 * Apparences des unités sur la carte de combat (jalon M4) : une apparence du
 * gabarit commun des personnages (`characterSprite.ts`, décision n°48) par
 * classe jouable et par type d'ennemi. Aucune image dessinée à la main : une
 * apparence = des couleurs, une coiffure, une tenue, un accessoire.
 *
 * Lisibilité : les alliés portent des tons froids ou clairs (bleus, verts,
 * parchemin), les Écumeurs des rouges et des bruns (bandanas rouge cendre,
 * GDD §12.4). Le héros garde l'apparence du monde ouvert.
 */
import { ramp3, type CharacterLook } from './characterSprite';
import { HERO_LOOK } from './heroSprite';
import { PALETTE as P, mixColor } from './palette';

const SKIN = ramp3(mixColor(P.sable, P.orangeForge, 0.2), P.rougeCendre, P.parchemin, 0.9);
const SKIN_PALE = ramp3(mixColor(P.parchemin, P.sable, 0.5), P.terreCuite, 0xfff8ee, 0.9);
const SKIN_DARK = ramp3(mixColor(P.terreCuite, P.terreSombre, 0.35), P.ombreViolette, P.ocre, 0.9);
const EYE = mixColor(P.nuitBleue, P.ombreProfonde, 0.4);
const METAL = ramp3(P.metal, P.ombreProfonde, P.metalClair);
const BOOTS = ramp3(mixColor(P.terreSombre, P.brique, 0.3), P.ombreProfonde, P.terreSeche);
const BELT = ramp3(mixColor(P.ambre, P.terreSombre, 0.45), P.ombreProfonde, P.ocreClair);

const r = (base: number): ReturnType<typeof ramp3> => ramp3(base);

function look(partial: Partial<CharacterLook> & Pick<CharacterLook, 'top' | 'tunic' | 'accent' | 'head' | 'outfit' | 'accessory'>): CharacterLook {
  return {
    skin: SKIN,
    hair: r(mixColor(P.terreSombre, P.brique, 0.25)),
    belt: BELT,
    pants: r(mixColor(P.grisRoux, P.terreSombre, 0.45)),
    boots: BOOTS,
    metal: METAL,
    eye: EYE,
    ...partial,
  };
}

export const UNIT_LOOKS: Readonly<Record<string, CharacterLook>> = {
  heros: HERO_LOOK,
  gardien_des_marees: look({
    hair: r(mixColor(P.sable, P.ocre, 0.4)),
    top: r(mixColor(P.bleuGris, P.ardoise, 0.4)),
    tunic: r(mixColor(P.metalClair, P.pierre, 0.4)),
    accent: r(P.ciel),
    pants: r(P.ardoiseSombre),
    head: 'short',
    outfit: 'tunic',
    accessory: 'sword',
  }),
  lame_du_serment: look({
    skin: SKIN_PALE,
    hair: r(mixColor(P.braise, P.ocre, 0.5)),
    top: r(mixColor(P.parchemin, P.pierre, 0.45)),
    tunic: r(mixColor(P.bleuNuit, P.ardoise, 0.5)),
    accent: r(P.jauneBle),
    head: 'long',
    outfit: 'cloak',
    accessory: 'sword',
  }),
  veilleur_des_falaises: look({
    top: r(mixColor(P.vertProfond, P.mousse, 0.5)),
    tunic: r(mixColor(P.olive, P.sable, 0.35)),
    accent: r(P.ocreClair),
    head: 'hood',
    outfit: 'cloak',
    accessory: 'satchel',
  }),
  heritier_des_cendres: look({
    skin: SKIN_PALE,
    hair: r(P.parchemin),
    top: r(mixColor(P.ombreViolette, P.violetBrume, 0.4)),
    tunic: r(mixColor(P.violetBrume, P.bleuNuit, 0.35)),
    accent: r(P.orangeForge),
    head: 'hood',
    outfit: 'dress',
    accessory: 'none',
  }),
  porte_lanterne: look({
    hair: r(mixColor(P.jauneBle, P.ocreClair, 0.5)),
    top: r(mixColor(P.parchemin, P.sable, 0.2)),
    tunic: r(mixColor(P.parchemin, P.jauneBle, 0.25)),
    accent: r(P.ambre),
    head: 'bun',
    outfit: 'dress',
    accessory: 'lantern',
  }),
  heraut_des_bannieres: look({
    skin: SKIN_DARK,
    hair: r(mixColor(P.terreSombre, P.ombreProfonde, 0.3)),
    top: r(mixColor(P.bleuNuit, P.ciel, 0.3)),
    tunic: r(mixColor(P.jauneBle, P.ambre, 0.4)),
    accent: r(P.ciel),
    head: 'short',
    outfit: 'tunic',
    accessory: 'sword',
  }),
  alchimiste_des_saisons: look({
    hair: r(mixColor(P.ecume, P.pierre, 0.3)),
    top: r(mixColor(P.olive, P.terreCuite, 0.3)),
    tunic: r(mixColor(P.sable, P.oliveClair, 0.3)),
    accent: r(P.cyanEclat),
    head: 'long',
    outfit: 'cloak',
    accessory: 'satchel',
  }),
  danseur_des_courants: look({
    skin: SKIN_DARK,
    hair: r(mixColor(P.bleuNuit, P.ardoise, 0.3)),
    top: r(mixColor(P.cyanEclat, P.bleuGris, 0.45)),
    tunic: r(mixColor(P.ecume, P.ciel, 0.4)),
    accent: r(P.cyanEclat),
    head: 'short',
    outfit: 'tunic',
    accessory: 'none',
  }),
  invocateur_de_pierres_anciennes: look({
    top: r(mixColor(P.grisRoux, P.pierre, 0.35)),
    tunic: r(mixColor(P.pierre, P.sable, 0.3)),
    accent: r(P.cyanEclat),
    head: 'hood',
    outfit: 'dress',
    accessory: 'none',
  }),
  faconneur_de_racines: look({
    hair: r(mixColor(P.mousse, P.olive, 0.4)),
    top: r(mixColor(P.mousse, P.vertProfond, 0.3)),
    tunic: r(mixColor(P.terreSeche, P.olive, 0.3)),
    accent: r(P.vertDore),
    head: 'long',
    outfit: 'dress',
    accessory: 'none',
  }),
  ingenieur_des_ruines: look({
    hair: r(mixColor(P.terreSombre, P.ocre, 0.3)),
    top: r(mixColor(P.ocre, P.terreSeche, 0.4)),
    tunic: r(mixColor(P.ardoise, P.bleuGris, 0.3)),
    accent: r(P.cyanEclat),
    head: 'short',
    outfit: 'tunic',
    accessory: 'satchel',
  }),
  chasseur_de_serpents_de_mer: look({
    skin: SKIN_DARK,
    hair: r(mixColor(P.ecume, P.pierre, 0.5)),
    top: r(mixColor(P.ardoiseSombre, P.bleuGris, 0.35)),
    tunic: r(mixColor(P.sable, P.terreSeche, 0.4)),
    accent: r(P.bleuGris),
    head: 'bun',
    outfit: 'cloak',
    accessory: 'sword',
  }),

  /* ---------- Écumeurs du Gué ---------- */
  ecumeur_sabreur: look({
    hair: r(P.rougeCendre),
    top: r(mixColor(P.terreSombre, P.brique, 0.35)),
    tunic: r(mixColor(P.terreSeche, P.terreCuite, 0.35)),
    accent: r(P.rougeCendre),
    head: 'short',
    outfit: 'tunic',
    accessory: 'sword',
  }),
  ecumeur_archer: look({
    top: r(mixColor(P.rougeCendre, P.brique, 0.5)),
    tunic: r(mixColor(P.oliveSombre, P.terreSombre, 0.35)),
    accent: r(P.ocre),
    head: 'hood',
    outfit: 'cloak',
    accessory: 'satchel',
  }),
  ecumeur_lancier: look({
    skin: SKIN_DARK,
    hair: r(mixColor(P.terreSombre, P.ombreProfonde, 0.3)),
    top: r(mixColor(P.metal, P.brique, 0.35)),
    tunic: r(mixColor(P.metalClair, P.grisRoux, 0.5)),
    accent: r(P.rougeCendre),
    head: 'short',
    outfit: 'tunic',
    accessory: 'sword',
  }),
  ecumeur_incendiaire: look({
    top: r(mixColor(P.ombreProfonde, P.brique, 0.4)),
    tunic: r(mixColor(P.brique, P.terreCuite, 0.3)),
    accent: r(P.orangeForge),
    head: 'hood',
    outfit: 'dress',
    accessory: 'lantern',
  }),
  brakk: look({
    skin: SKIN_DARK,
    hair: r(mixColor(P.rougeCendre, P.orangeForge, 0.3)),
    top: r(mixColor(P.terreSeche, P.grisRoux, 0.3)),
    tunic: r(mixColor(P.brique, P.rougeCendre, 0.4)),
    accent: r(P.jauneBle),
    pants: r(mixColor(P.terreSombre, P.ombreProfonde, 0.2)),
    head: 'long',
    outfit: 'cloak',
    accessory: 'sword',
  }),
};

/** Apparence d'une unité ; une apparence inconnue retombe sur l'Écumeur (et le test le signale). */
export function unitLook(sprite: string): CharacterLook {
  return UNIT_LOOKS[sprite] ?? (UNIT_LOOKS['ecumeur_sabreur'] as CharacterLook);
}
