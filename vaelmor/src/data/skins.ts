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
  // Variantes générées (même classe, autre personnage) : voir SKIN_ALTS.
  { id: 'veilleur_des_falaises_v1', frames: 8 },
];

/**
 * Autres personnages d'une classe (générés avec Pixellab : même métier, autre visage) : le 2e membre de la
 * classe prend le premier, le 3e le deuxième… Au-delà, les recrues gardent le skin de la classe avec un
 * détail peint (`render/skinDetails.ts`). Chaque id doit être dans SKINS, avec son portrait et ses expressions.
 */
export const SKIN_ALTS: Readonly<Record<string, readonly string[]>> = {
  veilleur_des_falaises: ['veilleur_des_falaises_v1'],
};

/**
 * Ennemis du monde ouvert peints (n°281) : feuilles de marche `assets/ennemis/<sprite>.png`, au même format
 * que les personnages (3 rangées sud, nord, est × `frames` cellules `SKIN_CELL`, l'ouest est l'est retourné),
 * générées avec Pixellab à partir du personnage de leur feuille de combat (`assets/combat/<sprite>.png`).
 * Id = champ `sprite` de `data/worldEnemies.json`. Un ennemi absent de la liste (ou dont la feuille manque)
 * garde l'ancienne silhouette (`render/unitSprites.ts`). `cell` : cellule plus grande pour les boss (48).
 */
export interface FoeSkinDef {
  readonly id: string;
  readonly frames: number;
  readonly cell?: number;
}
export const FOE_SKINS: readonly FoeSkinDef[] = [
  // Z1
  { id: 'ecumeur_sabreur', frames: 8 },
  { id: 'ecumeur_archer', frames: 8 },
  { id: 'ecumeur_lancier', frames: 8 },
  { id: 'ecumeur_incendiaire', frames: 8 },
  { id: 'rodeur_timide', frames: 8 },
  { id: 'milicien', frames: 8 },
  // Z2
  { id: 'bucheron_corrompu', frames: 8 },
  { id: 'chasseur_de_ronces', frames: 8 },
  { id: 'esprit_des_ronces', frames: 8 },
  // Z3
  { id: 'harponneur', frames: 8 },
  { id: 'noye', frames: 8 },
  { id: 'pillard_des_epaves', frames: 8 },
  { id: 'voilee_de_brume', frames: 8 },
  // Z4 (le Golem de cendre, plus grand en combat, l'est aussi sur la carte ; Golem de pierre et Menhir-tour n'apparaissent pas dans le monde)
  { id: 'arbaletrier_de_cendre', frames: 8 },
  { id: 'golem_de_cendre', frames: 8, cell: 48 },
  { id: 'harpie', frames: 8 },
  { id: 'mercenaire_de_cendre', frames: 8 },
  // Z5
  { id: 'abyssal', frames: 8 },
  { id: 'garde_englouti', frames: 8 },
  { id: 'revenant', frames: 8 },
  // Boss (cellule de 48)
  { id: 'brakk', frames: 8, cell: 48 },
  { id: 'roi_cerf', frames: 8, cell: 48 },
  { id: 'soeur_merrow', frames: 8, cell: 48 },
  { id: 'mere_harpie', frames: 8, cell: 48 },
  { id: 'gardien_de_cendre', frames: 8, cell: 48 },
  { id: 'orvane', frames: 8, cell: 48 },
];

/** Durée d'une image de marche, en ms (réglage du dessin d'origine). */
export const SKIN_FRAME_MS = 170;

/** Versions réduites (×0,88, cellules de 30 px) pour le combat et la préparation : les silhouettes se chevauchent un peu moins. */
export const BATTLE_CELL = 30;

/**
 * Poses de combat (images fixes) ajoutées sous les rangées de marche de la version
 * réduite : trois rangées de cellules `BATTLE_CELL` (profil est, face sud, dos nord) à partir de la hauteur `3 × BATTLE_CELL`, dans l'ordre donné.
 * Sur la carte tactique seule `ready` (unité choisie) sert ; `attack`, `slash`, `skill`, `hit` et `ko` sont réservées aux futures animations de combat rapprochées (GDD §11).
 * `ready` attente, `attack` estoc, `slash` coup tranchant, `skill` compétence, `hit` coup reçu, `ko` à terre.
 */
export const SKIN_POSES: Readonly<Record<string, readonly string[]>> = {
  heros: ['ready', 'attack', 'slash', 'skill', 'hit', 'ko'],
};

/**
 * Révision des feuilles PNG : à incrémenter à chaque changement d'une image ou de sa taille.
 * Elle est ajoutée à l'adresse des fichiers (`?v=`) pour que le navigateur ne garde pas une ancienne
 * feuille avec un nouveau code (cellules décalées, unité invisible).
 */
export const SKIN_REV = 19;

/**
 * Expressions des portraits (générées avec Pixellab, `vocal-animation`, 3 positions de bouche) :
 * une feuille `assets/portraits/expressions/<id>.png` de 4 rangées (humeurs) × 3 colonnes (bouches) de 64 px.
 * L'humeur « neutre » est le portrait de base (`assets/portraits/<id>.png`).
 */
export const PORTRAIT_MOODS = ['happy', 'angry', 'sad', 'surprised'] as const;
export type PortraitMood = (typeof PORTRAIT_MOODS)[number] | 'neutral';
export const PORTRAIT_MOUTHS = ['rest', 'open', 'round'] as const;

/**
 * Portraits des boss et des ennemis nommés (jalon M7, n°198) : `assets/portraits/ennemis/<id>.png`,
 * 64×64, Pixellab (Pro Flash, style calé sur les portraits de la compagnie). Un seul portrait par
 * personnage, sans expressions ; la scène de phase 2 l'assombrit (`render/portraits.ts › foePortraitInBox`, `dark`).
 * Ids : ceux des scènes de combat (`battleQuotes.json › enemy`).
 */
export const FOE_PORTRAITS = [
  'brakk', 'roi_cerf', 'soeur_merrow', 'mere_harpie', 'gardien_de_cendre', 'orvane',
  'rik', 'gorm', 'hakon', 'oswin', 'aldo', 'hobb', 'ilse', 'orsen', 'alderic', 'drak', 'veilleur_de_pierre', 'maelis',
] as const;
