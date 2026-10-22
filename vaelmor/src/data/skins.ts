/**
 * Apparences des personnages sur la carte (feuilles PNG générées avec Pixellab).
 *
 * Une feuille = 3 rangées (sud, nord, est) × `frames` colonnes de cellules `SKIN_CELL`.
 * L'ouest est l'est retourné (flipX). Les feuilles vivent dans `assets/personnages/<id>.png`.
 * Ajouter une apparence : déposer le PNG, ajouter une ligne ici (rien d'autre à coder).
 */
export const SKIN_CELL = 34;
export const SKIN_ROWS = ['down', 'up', 'side'] as const;
export type SkinPose = (typeof SKIN_ROWS)[number];

export interface SkinDef {
  readonly id: string;
  /** Nombre d'images de marche par direction. */
  readonly frames: number;
}

export const SKINS: readonly SkinDef[] = [
  { id: 'heros', frames: 4 },
  { id: 'gardien_des_marees', frames: 8 },
  { id: 'lame_du_serment', frames: 8 },
  { id: 'veilleur_des_falaises', frames: 8 },
  { id: 'heritier_des_cendres', frames: 8 },
  { id: 'porte_lanterne', frames: 8 },
  { id: 'heraut_des_bannieres', frames: 8 },
  { id: 'alchimiste_des_saisons', frames: 8 },
  { id: 'danseur_des_courants', frames: 8 },
  { id: 'invocateur_de_pierres_anciennes', frames: 8 },
  { id: 'faconneur_de_racines', frames: 8 },
  { id: 'ingenieur_des_ruines', frames: 8 },
  { id: 'chasseur_de_serpents_de_mer', frames: 8 },
];

/** Durée d'une image de marche, en ms (réglage du dessin d'origine). */
export const SKIN_FRAME_MS = 170;

/** Versions réduites (×0,88, cellules de 30 px) pour le combat et la préparation : les silhouettes se chevauchent un peu moins. */
export const BATTLE_CELL = 30;

/**
 * Poses de combat (images fixes) ajoutées sous les rangées de marche de la version
 * réduite : trois rangées de cellules `BATTLE_CELL` (profil est, face sud, dos nord) à partir de la hauteur `3 × BATTLE_CELL`, dans l'ordre donné.
 * Sur la carte tactique seules `ready`, `hit` et `ko` servent ; `attack`, `slash` et `skill` sont réservées aux futures animations de combat rapprochées (GDD §11).
 * `ready` attente, `attack` estoc, `slash` coup tranchant, `skill` compétence, `hit` coup reçu, `ko` à terre.
 */
export const SKIN_POSES: Readonly<Record<string, readonly string[]>> = {
  heros: ['ready', 'attack', 'slash', 'skill', 'hit', 'ko'],
};
