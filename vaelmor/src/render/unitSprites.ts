/**
 * Unités du combat (décision n°60) : le gabarit commun des personnages 16×28
 * (`characterSprite.ts`, décision n°48 — proportions *Eastward*, 3 tons par
 * matière, contour coloré, lumière en haut à gauche), avec l'équipement qui
 * dit la classe au premier coup d'œil et la **couleur du camp** sur la cape,
 * les manches, la coiffe et le champ du bouclier : bleu ardoise pour la
 * compagnie, rouge cendre pour l'ennemi. Le reste des couleurs (tunique,
 * cheveux, écharpe) appartient à la classe.
 *
 * Module sans DOM.
 */
import { CHAR_WALK_FRAMES, GEAR_H, GEAR_W, paintCharacterFrame, ramp3, type CharacterGear, type CharacterLook, type CharPose, type Ramp3 } from './characterSprite';
import { HERO_LOOK } from './heroSprite';
import { PALETTE as P, mixColor } from './palette';
import type { PixelSink } from './waterTile';

export type UnitTeam = 'player' | 'enemy';

export const UNIT_W = GEAR_W;
export const UNIT_H = GEAR_H;
/** Respiration de l'attente : debout, puis le haut du corps descend d'un pixel. */
export const UNIT_IDLE_FRAMES = 2;
export const UNIT_WALK_FRAMES = CHAR_WALK_FRAMES;

/** Couleur du camp (cape, manches, coiffe, bouclier, drapeau), dans la palette « fin d'après-midi ». */
export const TEAM_TOP: Readonly<Record<UnitTeam, Ramp3>> = {
  player: ramp3(mixColor(P.bleuGris, mixColor(P.ciel, P.bleuNuit, 0.55), 0.45), P.ombreProfonde, mixColor(P.ciel, P.lumiereChaude, 0.35)),
  enemy: ramp3(mixColor(P.rougeCendre, P.brique, 0.2), P.ombreViolette, P.orangeForge),
};

const r = (base: number): Ramp3 => ramp3(base);
const SKIN = ramp3(mixColor(P.sable, P.orangeForge, 0.2), P.rougeCendre, P.parchemin, 0.9);
const SKIN_PALE = ramp3(mixColor(P.parchemin, P.sable, 0.5), P.terreCuite, 0xfff8ee, 0.9);
const SKIN_DARK = ramp3(mixColor(P.terreCuite, P.terreSombre, 0.35), P.ombreViolette, P.ocre, 0.9);
const EYE = mixColor(P.nuitBleue, P.ombreProfonde, 0.4);

function look(partial: Partial<CharacterLook> & Pick<CharacterLook, 'tunic' | 'accent' | 'head' | 'outfit'>): CharacterLook {
  return {
    skin: SKIN,
    hair: r(mixColor(P.terreSombre, P.brique, 0.25)),
    top: TEAM_TOP.player,
    belt: r(mixColor(P.ambre, P.terreSombre, 0.45)),
    pants: r(mixColor(P.grisRoux, P.terreSombre, 0.45)),
    boots: r(mixColor(P.terreSombre, P.brique, 0.3)),
    // Acier clair : les lames et les casques doivent se lire sur l'herbe comme sur la pierre.
    metal: ramp3(mixColor(P.metalClair, P.pierre, 0.3), P.ombreProfonde, 0xfff8ee),
    eye: EYE,
    accessory: 'none',
    ...partial,
  };
}

export interface UnitSpriteSpec {
  readonly look: CharacterLook;
  readonly gear: CharacterGear;
}

/** Fiches : classes jouables, héros, ennemis. */
export const UNIT_SPRITES: Readonly<Record<string, UnitSpriteSpec>> = {
  heros: { look: HERO_LOOK, gear: { headgear: 'none', weapon: 'none' } },
  gardien_des_marees: {
    look: look({ hair: r(P.sable), tunic: r(mixColor(P.metalClair, P.pierre, 0.4)), accent: r(P.ciel), pants: r(P.ardoiseSombre), head: 'short', outfit: 'tunic' }),
    gear: { headgear: 'greathelm', weapon: 'spear', shield: true, build: 'armored' },
  },
  lame_du_serment: {
    look: look({ skin: SKIN_PALE, hair: r(mixColor(P.braise, P.ocre, 0.5)), tunic: r(mixColor(P.parchemin, P.pierre, 0.45)), accent: r(P.jauneBle), head: 'long', outfit: 'cloak' }),
    gear: { headgear: 'circlet', weapon: 'sword', cape: true },
  },
  veilleur_des_falaises: {
    look: look({ tunic: r(mixColor(P.olive, P.sable, 0.35)), accent: r(P.vertDore), head: 'hood', outfit: 'cloak' }),
    gear: { headgear: 'none', weapon: 'bow', quiver: true },
  },
  heritier_des_cendres: {
    look: look({ skin: SKIN_PALE, hair: r(P.parchemin), tunic: r(mixColor(P.ombreViolette, P.violetBrume, 0.4)), accent: r(P.orangeForge), head: 'hood', outfit: 'dress' }),
    gear: { headgear: 'cowl', weapon: 'tome', glow: P.braise, build: 'robed' },
  },
  porte_lanterne: {
    look: look({ hair: r(mixColor(P.jauneBle, P.ocreClair, 0.5)), tunic: r(mixColor(P.parchemin, P.jauneBle, 0.25)), accent: r(P.ambre), head: 'bun', outfit: 'dress' }),
    gear: { headgear: 'circlet', weapon: 'staff_lantern', glow: P.lumiereDoree, build: 'robed' },
  },
  heraut_des_bannieres: {
    look: look({ skin: SKIN_DARK, hair: r(mixColor(P.terreSombre, P.ombreProfonde, 0.3)), tunic: r(mixColor(P.jauneBle, P.ambre, 0.4)), accent: r(P.parchemin), head: 'short', outfit: 'tunic' }),
    gear: { headgear: 'none', weapon: 'banner' },
  },
  alchimiste_des_saisons: {
    look: look({ hair: r(P.ecume), tunic: r(mixColor(P.sable, P.oliveClair, 0.3)), accent: r(P.vertDore), head: 'long', outfit: 'dress' }),
    gear: { headgear: 'hat', weapon: 'flask', glow: P.cyanEclat },
  },
  danseur_des_courants: {
    look: look({ skin: SKIN_DARK, hair: r(mixColor(P.bleuNuit, P.ardoise, 0.3)), tunic: r(mixColor(P.ecume, P.ciel, 0.4)), accent: r(P.cyanEclat), head: 'short', outfit: 'tunic' }),
    gear: { headgear: 'bandana', weapon: 'daggers', scarf: true },
  },
  invocateur_de_pierres_anciennes: {
    look: look({ hair: r(P.grisRoux), tunic: r(mixColor(P.pierre, P.sable, 0.3)), accent: r(P.cyanEclat), head: 'hood', outfit: 'dress' }),
    gear: { headgear: 'cowl', weapon: 'staff_stone', glow: P.cyanEclat, build: 'robed' },
  },
  faconneur_de_racines: {
    look: look({ hair: r(mixColor(P.mousse, P.olive, 0.4)), tunic: r(mixColor(P.terreSeche, P.olive, 0.3)), accent: r(P.vertDore), head: 'long', outfit: 'dress' }),
    gear: { headgear: 'leaves', weapon: 'staff_branch', build: 'robed' },
  },
  ingenieur_des_ruines: {
    look: look({ hair: r(mixColor(P.terreSombre, P.ocre, 0.3)), tunic: r(mixColor(P.ocre, P.terreSeche, 0.4)), accent: r(P.cyanEclat), head: 'short', outfit: 'tunic' }),
    gear: { headgear: 'goggles', weapon: 'crossbow', quiver: true },
  },
  chasseur_de_serpents_de_mer: {
    look: look({ skin: SKIN_DARK, hair: r(mixColor(P.ecume, P.pierre, 0.5)), tunic: r(mixColor(P.sable, P.terreSeche, 0.4)), accent: r(P.bleuGris), head: 'bun', outfit: 'tunic' }),
    gear: { headgear: 'bandana', weapon: 'harpoon', build: 'brute' },
  },

  /* ---------- Écumeurs du Gué ---------- */
  ecumeur_sabreur: {
    look: look({ tunic: r(mixColor(P.terreSeche, P.terreCuite, 0.35)), accent: r(P.ocre), head: 'short', outfit: 'tunic' }),
    gear: { headgear: 'bandana', weapon: 'axe', build: 'brute' },
  },
  ecumeur_archer: {
    look: look({ tunic: r(mixColor(P.oliveSombre, P.terreSombre, 0.35)), accent: r(P.ocre), head: 'hood', outfit: 'cloak' }),
    gear: { headgear: 'none', weapon: 'bow', quiver: true },
  },
  ecumeur_lancier: {
    look: look({ skin: SKIN_DARK, tunic: r(mixColor(P.metalClair, P.grisRoux, 0.5)), accent: r(P.ocre), head: 'short', outfit: 'tunic' }),
    gear: { headgear: 'helmet', weapon: 'spear', shield: true, build: 'armored' },
  },
  ecumeur_incendiaire: {
    look: look({ tunic: r(mixColor(P.brique, P.terreSombre, 0.3)), accent: r(P.orangeForge), head: 'hood', outfit: 'dress' }),
    gear: { headgear: 'cowl', weapon: 'torch', glow: P.braise, build: 'robed' },
  },
  brakk: {
    look: look({ skin: SKIN_DARK, hair: r(mixColor(P.rougeCendre, P.orangeForge, 0.3)), tunic: r(mixColor(P.terreSeche, P.grisRoux, 0.3)), accent: r(P.jauneBle), pants: r(mixColor(P.terreSombre, P.ombreProfonde, 0.2)), head: 'long', outfit: 'cloak' }),
    gear: { headgear: 'horned', weapon: 'greataxe', build: 'brute', cape: true },
  },
};

/** Fiche d'un sprite ; une fiche inconnue retombe sur l'Écumeur (le test le signale). */
export function unitSpriteSpec(sprite: string): UnitSpriteSpec {
  return UNIT_SPRITES[sprite] ?? (UNIT_SPRITES['ecumeur_sabreur'] as UnitSpriteSpec);
}

/**
 * Peint une image (UNIT_W × UNIT_H) au coin (ox, oy). `kind` : « idle »
 * (respiration, 2 images) ou une pose de marche (4 images). Les pieds sont sur
 * la rangée UNIT_H − 2, le contour sur la dernière.
 */
export function paintUnitSprite(sink: PixelSink, ox: number, oy: number, sprite: string, team: UnitTeam, kind: 'idle' | CharPose, frame: number): void {
  const spec = unitSpriteSpec(sprite);
  const lookForTeam: CharacterLook = { ...spec.look, top: TEAM_TOP[team] };
  if (kind === 'idle') paintCharacterFrame(sink, ox, oy, lookForTeam, 'down', frame, { gear: spec.gear, breathe: frame % UNIT_IDLE_FRAMES === 1 });
  else paintCharacterFrame(sink, ox, oy, lookForTeam, kind, frame, { gear: spec.gear });
}
