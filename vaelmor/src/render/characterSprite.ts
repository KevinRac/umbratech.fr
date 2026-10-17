/**
 * Gabarit des personnages du monde ouvert (refonte graphique, étape 6 —
 * décision n°48) : 16×28 px, proportions *Eastward* (grosse tête : 11 rangées
 * sur 26), 3 tons par matière, contour sombre coloré, lumière en haut à gauche.
 *
 * Un personnage = une **apparence** (`CharacterLook`) : couleurs par matière,
 * tête (capuche, cheveux courts, longs ou chignon), tenue (cape, tunique,
 * robe) et accessoire (épée, besace, lanterne). Le héros est une apparence
 * parmi d'autres (`render/heroSprite.ts`) ; les PNJ du jalon M2 en déclareront
 * d'autres, sans redessiner une seule image.
 *
 * Les formes sont dessinées en « pixel art texte » : une lettre par matière.
 * L'ombrage à 3 tons est calculé (bord gauche/haut d'une zone = clair, bord
 * droit/bas = sombre), une majuscule force le ton sombre. Trois poses (face,
 * dos, profil droit ; le profil gauche est retourné par le moteur) × 4 images
 * de marche (le haut du corps monte d'un pixel sur les pas, bras et jambes
 * alternent). Module sans DOM : il peint dans un « puits de pixels ».
 *
 * Équipement de classe (combat, décision n°60) : une coiffe (casque, chapeau,
 * bandana…), une arme en main, un bouclier, un carquois s'ajoutent au même
 * dessin, avec les mêmes matières, le même ombrage à 3 tons et le même
 * contour ; l'image est alors élargie d'une marge (`GEAR_PAD`) pour que lance,
 * bannière ou chapeau pointu dépassent du cadre 16×28.
 */
import { PALETTE as P, mixColor } from './palette';
import type { PixelSink } from './waterTile';

export const CHAR_W = 16;
export const CHAR_H = 28;
export const CHAR_WALK_FRAMES = 4;
export const CHAR_POSES = ['down', 'up', 'side'] as const;
export type CharPose = (typeof CHAR_POSES)[number];

/** Trois tons d'une matière. */
export interface Ramp3 {
  readonly dark: number;
  readonly base: number;
  readonly light: number;
}

export type HeadStyle = 'hood' | 'short' | 'long' | 'bun';
export type Outfit = 'cloak' | 'tunic' | 'dress';
export type Accessory = 'none' | 'sword' | 'satchel' | 'lantern';

export interface CharacterLook {
  readonly skin: Ramp3;
  readonly hair: Ramp3;
  /** Cape, capuche ou manches. */
  readonly top: Ramp3;
  /** Tunique ou robe. */
  readonly tunic: Ramp3;
  /** Écharpe, col. */
  readonly accent: Ramp3;
  readonly belt: Ramp3;
  readonly pants: Ramp3;
  readonly boots: Ramp3;
  readonly metal: Ramp3;
  readonly eye: number;
  readonly head: HeadStyle;
  readonly outfit: Outfit;
  readonly accessory: Accessory;
}

/** Rampe de 3 tons : ombre poussée vers le bleu-violet, lumière vers le jaune chaud. */
export function ramp3(base: number, shade: number = P.ombreViolette, light: number = P.lumiereChaude, k = 1): Ramp3 {
  return { dark: mixColor(base, shade, 0.42 * k), base, light: mixColor(base, light, 0.32 * k) };
}

/* ---------- Équipement de classe (décision n°60) ---------- */

export type Headgear = 'none' | 'helmet' | 'greathelm' | 'horned' | 'hat' | 'bandana' | 'circlet' | 'leaves' | 'goggles' | 'cowl';

/**
 * Corpulence de la classe (la silhouette se lit avant les détails, comme les
 * classes des Fire Emblem GBA) : `normal` (gabarit commun), `armored` (armure
 * lourde, épaulières larges, jambières de métal), `brute` (bras nus massifs,
 * mantelet, pantalon bouffant, jambes écartées), `robed` (robe longue évasée,
 * manches en cloche, seuls les pieds dépassent).
 */
export type Build = 'normal' | 'armored' | 'brute' | 'robed';
export type HeldWeapon =
  | 'none'
  | 'sword'
  | 'spear'
  | 'axe'
  | 'greataxe'
  | 'bow'
  | 'crossbow'
  | 'tome'
  | 'staff_lantern'
  | 'staff_stone'
  | 'staff_branch'
  | 'harpoon'
  | 'banner'
  | 'daggers'
  | 'flask'
  | 'torch';

export interface CharacterGear {
  readonly headgear: Headgear;
  readonly weapon: HeldWeapon;
  readonly shield?: boolean;
  readonly quiver?: boolean;
  readonly build?: Build;
  /** Cape qui flotte derrière le personnage. */
  readonly cape?: boolean;
  /** Longue écharpe qui vole au vent. */
  readonly scarf?: boolean;
  /** Lueur de l'arme (flamme, magie, rune) : palpite d'une image à l'autre. */
  readonly glow?: number;
}

/** Marge autour du cadre 16×28 quand le personnage porte un équipement. */
export const GEAR_PAD = { x: 6, y: 7 } as const;
export const GEAR_W = CHAR_W + 2 * GEAR_PAD.x;
export const GEAR_H = CHAR_H + GEAR_PAD.y;

export interface PaintOptions {
  readonly gear?: CharacterGear;
  /** Respiration de l'attente : le haut du corps descend d'un pixel, jambes immobiles. */
  readonly breathe?: boolean;
}

/* ---------- Formes (une lettre par matière, « . » = vide) ---------- */

type Rows = readonly string[];

/**
 * s peau · h cheveux · c cape/manches · t tunique · a écharpe/col · l ceinture
 * g boucle · p pantalon · b bottes · m métal (i : arête claire) · e œil · k joue · w reflet.
 * Équipement : o bois · n os, ivoire, corde, pages · f lueur (flamme, magie, rune).
 * Majuscule = ton sombre forcé.
 */
const MATERIAL: Readonly<Record<string, keyof CharacterLook | 'fixed'>> = {
  s: 'skin',
  h: 'hair',
  c: 'top',
  t: 'tunic',
  a: 'accent',
  l: 'belt',
  p: 'pants',
  b: 'boots',
  m: 'metal',
  g: 'fixed',
  e: 'fixed',
  k: 'fixed',
  w: 'fixed',
  i: 'fixed',
  o: 'fixed',
  n: 'fixed',
  f: 'fixed',
};

const WOOD = ramp3(mixColor(P.ambre, P.terreSombre, 0.5), P.ombreProfonde, P.ocreClair);
const IVORY = ramp3(mixColor(P.parchemin, P.sable, 0.35), P.terreSeche, 0xfff8ee);

/** Têtes : 11 rangées (y 2 à 12). */
const HEAD: Readonly<Record<CharPose, Readonly<Record<HeadStyle, Rows>>>> = {
  down: {
    hood: [
      '......cccc......',
      '....cccccccc....',
      '...cccccccccc...',
      '..cccchhhhcccc..',
      '..ccchhhhhhccc..',
      '..cchhshhshhcc..',
      '..ccsesssseScc..',
      '..ccsesssseScc..',
      '..ccksssssskcc..',
      '...cssssssssc...',
      '....cSSSSSSc....',
    ],
    short: [
      '.....hhhhhh.....',
      '....hhhhhhhh....',
      '...hhhhhhhhhh...',
      '...hhhhhhhhhh...',
      '...hhsshhsshh...',
      '...hsesssseSh...',
      '...hsesssseSh...',
      '...hksssssskh...',
      '....ssssssss....',
      '....SssssssS....',
      '.....SSSSSS.....',
    ],
    long: [
      '.....hhhhhh.....',
      '....hhhhhhhh....',
      '...hhhhhhhhhh...',
      '..hhhhhhhhhhhh..',
      '..hhhsshhsshhh..',
      '..hhsesssseShh..',
      '..hhsesssseShh..',
      '..hhksssssskhh..',
      '..hhssssssssHh..',
      '..hhSssssssSHh..',
      '..Hh.SSSSSS.HH..',
    ],
    bun: [
      '......hhhh......',
      '.....hhhhhh.....',
      '....hhhhhhhh....',
      '...hhhhhhhhhh...',
      '...hhsshhsshh...',
      '...hsesssseSh...',
      '...hsesssseSh...',
      '...hksssssskh...',
      '....ssssssss....',
      '....SssssssS....',
      '.....SSSSSS.....',
    ],
  },
  up: {
    hood: [
      '......cccc......',
      '....cccccccc....',
      '...cccccccccc...',
      '..cccccccccccc..',
      '..cccccccccccc..',
      '..cccccccccccc..',
      '..cccccccccccc..',
      '..cccccccccccc..',
      '..ccccccccccCc..',
      '...ccccccccCc...',
      '....cccccccc....',
    ],
    short: [
      '.....hhhhhh.....',
      '....hhhhhhhh....',
      '...hhhhhhhhhh...',
      '...hhhhHhhhhh...',
      '...hhhhHHhhhh...',
      '...hhhhhhhhhh...',
      '...hhhhhhhhHh...',
      '...shhhhhhhhs...',
      '....hhhhhhhH....',
      '....SssssssS....',
      '.....SSSSSS.....',
    ],
    long: [
      '.....hhhhhh.....',
      '....hhhhhhhh....',
      '...hhhhhhhhhh...',
      '..hhhhhHhhhhhh..',
      '..hhhhhHHhhhhh..',
      '..hhhhhhhhhhhh..',
      '..hhhhhhhhhhHh..',
      '..hhhhhhhhhhHh..',
      '..hhhhhhhhhhHh..',
      '..hhhhhhhhhHHh..',
      '...HhhhhhhhHH...',
    ],
    bun: [
      '......hhhh......',
      '.....hhHHhh.....',
      '....hhhhhhhh....',
      '...hhhhhhhhhh...',
      '...hhhhHHhhhh...',
      '...hhhhhhhhhh...',
      '...hhhhhhhhHh...',
      '...shhhhhhhhs...',
      '....hhhhhhhH....',
      '....SssssssS....',
      '.....SSSSSS.....',
    ],
  },
  side: {
    hood: [
      '.....cccc.......',
      '...cccccccc.....',
      '..cccccccccc....',
      '..ccccccccccc...',
      '..cccccchhhhc...',
      '..ccccchhsssc...',
      '..cccccsssess...',
      '..cccccssseSss..',
      '..cccccsskSss...',
      '...cccccSsss....',
      '....cccSSS......',
    ],
    short: [
      '.....hhhhh......',
      '...hhhhhhhh.....',
      '..hhhhhhhhhh....',
      '..hhhhhhhhhhh...',
      '..hhhhhhhsssh...',
      '..hhhhhsssess...',
      '..hhhhhssseSss..',
      '..hhhhhsskSss...',
      '..hhhhhsssss....',
      '...hhhSsss......',
      '....hhSSS.......',
    ],
    long: [
      '.....hhhhh......',
      '...hhhhhhhh.....',
      '..hhhhhhhhhh....',
      '..hhhhhhhhhhh...',
      '..hhhhhhhsssh...',
      '..hhhhhsssess...',
      '..hhhhhssseSss..',
      '..hhhhhsskSss...',
      '..hhhhhsssss....',
      '..hhhhhSsss.....',
      '..HhhhhSSS......',
    ],
    bun: [
      '...hhhh.........',
      '..hhhhhhhhh.....',
      '..hhhhhhhhhh....',
      '...hhhhhhhhhh...',
      '...hhhhhhsssh...',
      '...hhhhsssess...',
      '...hhhhssseSss..',
      '...hhhhsskSss...',
      '...hhhssssss....',
      '....hhSsss......',
      '.....hSSS.......',
    ],
  },
};

/** Corps : 9 rangées (y 13 à 21), sans les mains (dessinées selon le pas). */
const BODY: Readonly<Record<CharPose, Readonly<Record<Outfit, Rows>>>> = {
  down: {
    cloak: [
      '....aaaaaaaa....',
      '...caaaaaaaac...',
      '..ccctaatttccc..',
      '..cccttatttccc..',
      '..cccttttttccc..',
      '..cccllggllccc..',
      '..cccttttttccc..',
      '..cccttttttccc..',
      '...cccccccccc...',
    ],
    tunic: [
      '.....aaaaaa.....',
      '...cttttttttc...',
      '..cctttttttTcc..',
      '..cctttttttTcc..',
      '..cctttttttTcc..',
      '..ccllllggllcc..',
      '..cctttttttTcc..',
      '...ttttttttTt...',
      '....ttttttTT....',
    ],
    dress: [
      '.....aaaaaa.....',
      '...cttttttttc...',
      '..cctttttttTcc..',
      '..cctttttttTcc..',
      '..ccllllggllcc..',
      '..cctttttttTcc..',
      '...tttttttttT...',
      '...tttttttttT...',
      '..ttttttttttTT..',
    ],
  },
  up: {
    cloak: [
      '....aaaaaaaa....',
      '...cccccccccc...',
      '..cccccccccccc..',
      '..cccccccccccc..',
      '..ccccccCccccc..',
      '..cccccCCccccc..',
      '..cccccCcccccC..',
      '..cccccccccccC..',
      '...cccccccccC...',
    ],
    tunic: [
      '.....aaaaaa.....',
      '...cttttttttc...',
      '..cctttttttTcc..',
      '..cctttttttTcc..',
      '..cctttttttTcc..',
      '..ccllllllllcc..',
      '..cctttttttTcc..',
      '...ttttttttTt...',
      '....ttttttTT....',
    ],
    dress: [
      '.....aaaaaa.....',
      '...cttttttttc...',
      '..cctttttttTcc..',
      '..cctttttttTcc..',
      '..ccllllllllcc..',
      '..cctttttttTcc..',
      '...tttttttttT...',
      '...tttttttttT...',
      '..ttttttttttTT..',
    ],
  },
  side: {
    cloak: [
      '.....aaaaaa.....',
      '...aacccccc.....',
      '..a.cccccttc....',
      '....cccccttc....',
      '...ccccccttc....',
      '...cccccllgc....',
      '..cccccccttc....',
      '..cccccccttc....',
      '...cccccccc.....',
    ],
    tunic: [
      '......aaaa......',
      '.....tttttt.....',
      '....tttttttT....',
      '....tttttttT....',
      '....tttttttT....',
      '....lllllllg....',
      '....tttttttT....',
      '....tttttttT....',
      '.....ttttttT....',
    ],
    dress: [
      '......aaaa......',
      '.....tttttt.....',
      '....tttttttT....',
      '....tttttttT....',
      '....lllllllg....',
      '....tttttttT....',
      '...ttttttttT....',
      '...tttttttttT...',
      '..ttttttttttT...',
    ],
  },
};

/** Jambes : 5 rangées (y 22 à 26) ; [debout, pas gauche, debout, pas droit]. */
const LEGS_FRONT: readonly Rows[] = [
  ['....ppp..ppP....', '....ppp..ppP....', '....bbb..bbB....', '....bbb..bbB....', '...bbbb..bbBB...'],
  ['....ppp..ppP....', '....bbb..ppP....', '....bbb..bbB....', '...bbbb..bbB....', '.........bbBB...'],
  ['....ppp..ppP....', '....ppp..ppP....', '....bbb..bbB....', '....bbb..bbB....', '...bbbb..bbBB...'],
  ['....ppp..ppP....', '....ppp..bbB....', '....bbb..bbB....', '....bbb..bbBB...', '...bbbb.........'],
];
const LEGS_SIDE: readonly Rows[] = [
  ['......pppP......', '......pppP......', '......bbbB......', '......bbbB......', '......bbbBBb....'],
  ['.....pppppP.....', '....ppP..ppP....', '...bbB....bbB...', '...bbB....bbB...', '..bbB......bbBb.'],
  ['......pppP......', '......pppP......', '......bbbB......', '......bbbB......', '......bbbBBb....'],
  ['.....pppppP.....', '.....ppP.ppP....', '....bbB...bbB...', '....bbB...bbB...', '...bbB.....bbBb.'],
];
/**
 * Sous une robe, seules les bottes dépassent ; l'ourlet descend jusqu'aux
 * chevilles pour que les pieds touchent la rangée 26 comme les autres tenues.
 */
const LEGS_DRESS: readonly Rows[] = LEGS_FRONT.map((legs) => ['..ttttttttttTT..', '..TTTTTTTTTTTT..', ...legs.slice(2)]);
const LEGS_DRESS_SIDE: readonly Rows[] = LEGS_SIDE.map((legs) => ['..tttttttttT....', '..TTTTTTTTTT....', ...legs.slice(2)]);

/* ---------- Corpulences de classe (combat) ---------- */

type BuildShapes = { readonly body: Readonly<Record<CharPose, Rows>>; readonly legsFront: readonly Rows[]; readonly legsSide: readonly Rows[] };

const swap = (rows: Rows, pairs: readonly (readonly [RegExp, string])[]): Rows => rows.map((row) => pairs.reduce((r, [re, to]) => r.replace(re, to), row));

/** Armure lourde : épaulières sur toute la largeur, bras de métal détachés du torse, tabard aux couleurs du camp. */
const ARMORED_DOWN: Rows = [
  '.....mmmmmm.....',
  '.mmmmmaaaammmmm.',
  'mmmmmmccccmmmmmM',
  'mmmm.mccccm.mmmM',
  '.mm.mmccccmm.mM.',
  '.mm.mmccccmm.mM.',
  '.mm.llllgllL.mM.',
  '.mm.cccccccC.mM.',
  '....cccccccC....',
];
const ARMORED: BuildShapes = {
  body: {
    down: ARMORED_DOWN,
    up: swap(ARMORED_DOWN, [[/a/g, 'm'], [/g/g, 'l']]),
    side: [
      '.....mmmmm......',
      '....mmmmmmmm....',
      '...mmmmmmmmmM...',
      '...mmcmmmmmmM...',
      '....ccmmmmmM....',
      '....ccmmmmmM....',
      '....cclllllg....',
      '...ccccccccC....',
      '....cccccccC....',
    ],
  },
  legsFront: [
    ['...mmmm..mmmM...', '...mmmm..mmmM...', '...mmmm..mmmM...', '...bbbb..bbbB...', '..bbbbb..bbbBB..'],
    ['...mmmm..mmmM...', '...bbbb..mmmM...', '..bbbbb..mmmM...', '.........bbbB...', '.........bbbBB..'],
    ['...mmmm..mmmM...', '...mmmm..mmmM...', '...mmmm..mmmM...', '...bbbb..bbbB...', '..bbbbb..bbbBB..'],
    ['...mmmm..mmmM...', '...mmmm..bbbB...', '...mmmm..bbbBB..', '...bbbb.........', '..bbbbb.........'],
  ],
  legsSide: LEGS_SIDE.map((legs) => swap(legs, [[/p/g, 'm'], [/P/g, 'M']])),
};

/** Brute : épaules massives, bras nus, mantelet de fourrure et baudrier aux couleurs du camp. */
const BRUTE_DOWN: Rows = [
  '....ssccccss....',
  '.ssscccccctsss..',
  'ssssccttttttssSS',
  'sss.tccttttt.sSS',
  'sss.ttcctttt.sSS',
  'sss.lllcclll.sSS',
  '.ss.ttttccTt.sS.',
  '.ss.pppppppP.sS.',
  '....pppppppP....',
];
const BRUTE: BuildShapes = {
  body: {
    down: BRUTE_DOWN,
    up: BRUTE_DOWN.map((row) => [...row].reverse().join('')).map((row) => row.replace(/S/g, 's')),
    side: [
      '.....sscc.......',
      '....scccccss....',
      '...ssttttttTss..',
      '...ssctttttTss..',
      '....sscttttTs...',
      '....llllcllll...',
      '....tttttttT....',
      '....ppppppppP...',
      '....pppppppP....',
    ],
  },
  legsFront: [
    ['...pppp..pppP...', '..ppppp..ppppP..', '..bbbb....bbbB..', '..bbbb....bbbB..', '.bbbbb....bbbBB.'],
    ['...pppp..pppP...', '..bbbb...ppppP..', '.bbbbb....bbbB..', '..........bbbB..', '..........bbbBB.'],
    ['...pppp..pppP...', '..ppppp..ppppP..', '..bbbb....bbbB..', '..bbbb....bbbB..', '.bbbbb....bbbBB.'],
    ['...pppp..pppP...', '..ppppp...bbbB..', '..bbbb....bbbBB.', '..bbbb..........', '.bbbbb..........'],
  ],
  legsSide: LEGS_SIDE,
};

/** Robe longue évasée, manches en cloche aux couleurs du camp, galon central. */
const ROBED_DOWN: Rows = [
  '.....aaaaaa.....',
  '...ccttaattcc...',
  '..ccctttattccc..',
  '..ccctttattccC..',
  '.cccctllgllcccC.',
  '.cccctttatttccC.',
  '.ccc.tttatttTcC.',
  '..c.ttttatttTT..',
  '...tttttatttTT..',
];
const ROBE_HEM = ['..tttttattttTT..', '..tttttattttTT..', '.tttttttatttTTT.', '.TTTTTTTTTTTTTT.'];
const ROBE_HEM_SIDE = ['...ttttttttttT..', '..tttttttttttT..', '..tttttttttttTT.', '..TTTTTTTTTTTTT.'];
const ROBED: BuildShapes = {
  body: {
    down: ROBED_DOWN,
    up: [ROBED_DOWN[0] as string, ...swap(ROBED_DOWN.slice(1), [[/a/g, 't'], [/g/g, 'l']])],
    side: [
      '......aaaa......',
      '.....cctttt.....',
      '....ccctttTT....',
      '....ccctttTT....',
      '....cccllgll....',
      '...cccctttttT...',
      '...ccc.tttttT...',
      '...c..ttttttT...',
      '...ttttttttttT..',
    ],
  },
  legsFront: ['...bbb....bbB...', '..bbb.....bbB...', '...bbb....bbB...', '....bbb...bbB...'].map((feet) => [...ROBE_HEM, feet]),
  legsSide: ['.....bbbBbbB....', '...bbB....bbbB..', '.....bbbBbbB....', '....bbB..bbbB...'].map((feet) => [...ROBE_HEM_SIDE, feet]),
};

const BUILDS: Readonly<Record<Exclude<Build, 'normal'>, BuildShapes>> = { armored: ARMORED, brute: BRUTE, robed: ROBED };

/** Abscisses des mains (gauche, droite à l'écran) de face et de dos, selon la corpulence. */
const HANDS: Readonly<Record<Build, readonly [number, number]>> = { normal: [2, 13], armored: [1, 14], brute: [1, 14], robed: [2, 13] };
/** Matière des bras : manches, métal ou peau nue. */
const SLEEVE: Readonly<Record<Build, string>> = { normal: 'c', armored: 'm', brute: 's', robed: 'c' };

export const CHARACTER_SHAPES = { HEAD, BODY, LEGS_FRONT, LEGS_SIDE, LEGS_DRESS, LEGS_DRESS_SIDE, BUILDS } as const;

/* ---------- Peinture ---------- */

interface Cell {
  /** Lettre de matière (minuscule) ou `null` si vide. */
  m: string | null;
  dark: boolean;
}

/** Grille de dessin ; les coordonnées sont celles du cadre 16×28, la marge `px`, `py` permet de déborder. */
interface Canvas {
  readonly cells: Cell[];
  readonly px: number;
  readonly py: number;
  readonly w: number;
  readonly h: number;
}

function newCanvas(px: number, py: number): Canvas {
  const w = CHAR_W + 2 * px;
  const h = CHAR_H + py;
  return { cells: Array.from({ length: w * h }, () => ({ m: null, dark: false })), px, py, w, h };
}

const at = (cv: Canvas, x: number, y: number): Cell | undefined => {
  const i = x + cv.px;
  const j = y + cv.py;
  return i >= 0 && j >= 0 && i < cv.w && j < cv.h ? cv.cells[j * cv.w + i] : undefined;
};

function stamp(cv: Canvas, rows: Rows, y0: number): void {
  rows.forEach((row, j) => {
    for (let x = 0; x < CHAR_W; x++) {
      const ch = row[x];
      if (!ch || ch === '.') continue;
      const cell = at(cv, x, y0 + j);
      if (!cell) continue;
      cell.m = ch.toLowerCase();
      cell.dark = ch !== ch.toLowerCase();
    }
  });
}

function put(cv: Canvas, x: number, y: number, m: string, dark = false): void {
  const cell = at(cv, x, y);
  if (!cell) return;
  cell.m = m;
  cell.dark = dark;
}

/** Mains, bras qui balancent et accessoire, selon la pose et le pas. */
function drawLimbs(cv: Canvas, look: CharacterLook, pose: CharPose, frame: number, bob: number, build: Build = 'normal'): void {
  const swing = frame === 1 ? -1 : frame === 3 ? 1 : 0;
  const y = 20 - bob;
  const sleeve = SLEEVE[build];
  const hand = build === 'armored' ? 'm' : 's';
  if (pose === 'side') {
    // Bras avant : manche le long du corps, la main avance et recule.
    const hx = 8 + swing * 2;
    for (let j = 14; j <= 19; j++) put(cv, j < 17 ? 8 : 8 + Math.round((swing * (j - 16)) / 2), j - bob, sleeve, j > 17);
    put(cv, hx, y, hand);
    put(cv, hx, y - 1, sleeve);
  } else {
    // Face / dos : les mains montent et descendent en alternance.
    const [l, r] = HANDS[build];
    put(cv, l, y + swing, hand);
    put(cv, r, y - swing, hand, true);
    put(cv, l, y + swing - 1, sleeve);
    put(cv, r, y - swing - 1, sleeve, true);
  }
  drawAccessory(cv, look, pose, swing, bob);
}

function drawAccessory(cv: Canvas, look: CharacterLook, pose: CharPose, swing: number, bob: number): void {
  const b = bob;
  switch (look.accessory) {
    case 'sword':
      if (pose === 'up') {
        // Épée en travers du dos : lame de métal, garde et poignée de cuir.
        // Lame claire (arête éclairée) du bas gauche vers l'épaule droite.
        for (let i = 0; i < 7; i++) {
          put(cv, 3 + i, 21 - i - b, 'i');
          put(cv, 4 + i, 21 - i - b, 'm');
        }
        put(cv, 9, 14 - b, 'g');
        put(cv, 11, 14 - b, 'g', true);
        put(cv, 11, 13 - b, 'l');
        put(cv, 12, 12 - b, 'l', true);
        put(cv, 13, 11 - b, 'g');
      } else if (pose === 'down') {
        // La poignée dépasse au-dessus de l'épaule gauche (à droite à l'écran).
        put(cv, 12, 12 - b, 'l');
        put(cv, 13, 11 - b, 'l', true);
        put(cv, 12, 13 - b, 'g');
      } else {
        // Fourreau à la hanche, côté arrière.
        put(cv, 4, 18 - b, 'l', true);
        put(cv, 3, 19 - b, 'm');
        put(cv, 2, 20 - b, 'm', true);
        put(cv, 2, 21 - b, 'm', true);
      }
      break;
    case 'satchel':
      if (pose === 'down') {
        for (let i = 0; i < 6; i++) put(cv, 4 + i, 14 + i - b, 'l', i > 3);
        put(cv, 10, 19 - b, 'l');
        put(cv, 11, 19 - b, 'l', true);
        put(cv, 10, 20 - b, 'l', true);
        put(cv, 11, 20 - b, 'l', true);
      } else if (pose === 'up') {
        for (let i = 0; i < 6; i++) put(cv, 11 - i, 14 + i - b, 'l', true);
      } else {
        put(cv, 4, 19 - b, 'l');
        put(cv, 4, 20 - b, 'l', true);
        put(cv, 3, 20 - b, 'l', true);
      }
      break;
    case 'lantern': {
      // Lanterne tenue à la main droite (à gauche à l'écran de face).
      const hx = pose === 'side' ? 8 + swing * 2 : 2;
      const hy = 21 - b + (pose === 'side' ? 0 : swing);
      put(cv, hx, hy, 'm', true);
      put(cv, hx, hy + 1, 'g');
      put(cv, hx, hy + 2, 'm', true);
      break;
    }
    case 'none':
      break;
  }
}

/** Ton d'une case : clair sur le bord gauche/haut de sa zone, sombre à droite/en bas. */
function shade(cv: Canvas, x: number, y: number): 'dark' | 'base' | 'light' {
  const c = at(cv, x, y) as Cell;
  if (c.dark) return 'dark';
  const same = (dx: number, dy: number): boolean => at(cv, x + dx, y + dy)?.m === c.m;
  // Position dans la rangée de la zone.
  let x0 = x;
  let x1 = x;
  while (at(cv, x0 - 1, y)?.m === c.m) x0--;
  while (at(cv, x1 + 1, y)?.m === c.m) x1++;
  const w = x1 - x0 + 1;
  const u = w <= 1 ? 0.5 : (x - x0) / (w - 1);
  if (w >= 3 && u <= 0.2) return 'light';
  if (!same(0, -1) && u < 0.7) return 'light';
  if (w >= 3 && u >= 0.8) return 'dark';
  if (!same(0, 1) && !same(1, 0)) return 'dark';
  return 'base';
}

function colorOf(look: CharacterLook, cv: Canvas, x: number, y: number, glow: number): number {
  const c = at(cv, x, y) as Cell;
  const m = c.m as string;
  if (m === 'o') return WOOD[shade(cv, x, y)];
  if (m === 'n') return IVORY[shade(cv, x, y)];
  if (m === 'f') return c.dark ? mixColor(glow, P.orangeForge, 0.25) : mixColor(glow, 0xfff8ee, 0.35);
  if (m === 'e') return look.eye;
  if (m === 'w') return 0xfff8ee;
  if (m === 'i') return look.metal.light;
  if (m === 'k') return mixColor(look.skin.base, P.rougeCendre, 0.35);
  if (m === 'g') return c.dark ? P.ambre : P.jauneBle;
  const key = MATERIAL[m];
  if (!key || key === 'fixed') return look.skin.base;
  return (look[key] as Ramp3)[shade(cv, x, y)];
}

/** Encre du contour : teinte sombre du voisin, poussée vers le bleu nuit (jamais noir pur). */
const INK = mixColor(P.nuitBleue, P.ombreProfonde, 0.5);

/**
 * Peint une image d'un personnage au coin (`ox`, `oy`) du puits de pixels :
 * 16×28, pieds sur la rangée 26, contour sur la rangée 27.
 */
export function paintCharacterFrame(sink: PixelSink, ox: number, oy: number, look: CharacterLook, pose: CharPose, frame: number, options: PaintOptions = {}): void {
  const gear = options.gear;
  const cv = gear ? newCanvas(GEAR_PAD.x, GEAR_PAD.y) : newCanvas(0, 0);
  const f = ((frame % CHAR_WALK_FRAMES) + CHAR_WALK_FRAMES) % CHAR_WALK_FRAMES;
  const breathe = options.breathe === true;
  const legFrame = breathe ? 0 : f;
  const bob = breathe ? 1 : f === 1 || f === 3 ? 1 : 0;
  const dress = look.outfit === 'dress';
  const build = gear?.build ?? 'normal';
  const shapes = build === 'normal' ? null : BUILDS[build];
  const legs = shapes ? (pose === 'side' ? shapes.legsSide : shapes.legsFront) : pose === 'side' ? (dress ? LEGS_DRESS_SIDE : LEGS_SIDE) : dress ? LEGS_DRESS : LEGS_FRONT;
  if (gear?.quiver) drawQuiver(cv, pose, bob, 'back');
  if (gear?.cape && pose !== 'up') drawCape(cv, pose, bob, f, build);
  stamp(cv, legs[legFrame] as Rows, 22);
  stamp(cv, shapes ? shapes.body[pose] : BODY[pose][look.outfit], 13 - bob);
  if (gear?.cape && pose === 'up') drawCape(cv, pose, bob, f, build);
  stamp(cv, HEAD[pose][gearHead(look, gear)], 2 - bob);
  if (gear) drawHeadgear(cv, gear.headgear, pose, bob);
  drawLimbs(cv, look, pose, legFrame, bob, build);
  if (gear?.scarf) drawScarf(cv, pose, bob, f);
  if (gear) drawGear(cv, gear, pose, legFrame, bob, f);

  const glow = gear?.glow ?? P.braise;
  const colors = new Map<number, number>();
  for (let j = 0; j < cv.h; j++) {
    for (let i = 0; i < cv.w; i++) {
      const x = i - cv.px;
      const y = j - cv.py;
      if (at(cv, x, y)?.m) colors.set(j * cv.w + i, colorOf(look, cv, x, y, glow));
    }
  }

  for (let j = 0; j < cv.h; j++) {
    for (let i = 0; i < cv.w; i++) {
      const own = colors.get(j * cv.w + i);
      if (own !== undefined) {
        sink.set(ox + i, oy + j, own);
        continue;
      }
      // Contour : 1 pixel d'art (2 pixels d'écran au zoom ×2), plus sombre que celui des décors.
      for (const [dx, dy] of [[0, 1], [-1, 0], [1, 0], [0, -1]] as const) {
        if (i + dx < 0 || i + dx >= cv.w || j + dy < 0 || j + dy >= cv.h) continue;
        const n = colors.get((j + dy) * cv.w + (i + dx));
        if (n === undefined) continue;
        sink.set(ox + i, oy + j, mixColor(n, INK, 0.78));
        break;
      }
    }
  }
}

/* ---------- Équipement : coiffes ---------- */

/** Tête de base sous la coiffe : cheveux courts sous un casque ou un bandana, longs sous un chapeau. */
function gearHead(look: CharacterLook, gear: CharacterGear | undefined): HeadStyle {
  if (!gear) return look.head;
  switch (gear.headgear) {
    case 'helmet':
    case 'greathelm':
    case 'horned':
    case 'bandana':
    case 'goggles':
      return look.head === 'hood' ? 'short' : look.head;
    case 'hat':
    case 'circlet':
    case 'leaves':
      return look.head === 'hood' ? 'long' : look.head;
    case 'cowl':
      return 'hood';
    default:
      return look.head;
  }
}

/** Remplace la matière des cases non vides d'une rangée de la tête (y absolu), entre x0 et x1. */
function recolorRow(cv: Canvas, y: number, x0: number, x1: number, from: string | null, to: string, dark = false): void {
  for (let x = x0; x <= x1; x++) {
    const c = at(cv, x, y);
    if (!c?.m || (from !== null && c.m !== from)) continue;
    c.m = to;
    c.dark = dark;
  }
}

function drawHeadgear(cv: Canvas, headgear: Headgear, pose: CharPose, bob: number): void {
  const top = 2 - bob; // première rangée de la tête
  const side = pose === 'side';
  const front = pose === 'down';
  switch (headgear) {
    case 'helmet':
    case 'horned': {
      // Calotte de métal sur les 4 premières rangées, bord sombre, protège-joues ; plumet ou cornes.
      for (let j = 0; j < 4; j++) recolorRow(cv, top + j, -2, 17, null, 'm');
      recolorRow(cv, top + 4, -2, 17, 'h', 'm', true);
      if (front) {
        for (let j = 4; j <= 8; j++) {
          put(cv, 2, top + j, 'm');
          put(cv, 13, top + j, 'm', true);
        }
        put(cv, 7, top + 4, 'm');
        put(cv, 7, top + 5, 'm');
      } else if (side) {
        for (let j = 4; j <= 7; j++) put(cv, 4, top + j, 'm', true);
      }
      put(cv, 7, top - 1, 'm');
      put(cv, 8, top - 1, 'm');
      if (headgear === 'helmet') {
        // Plumet aux couleurs de l'écharpe.
        for (const [x, y, d] of side ? ([[6, -2, false], [5, -3, false], [4, -3, true], [3, -2, true]] as const) : ([[7, -2, false], [8, -2, false], [8, -3, false], [9, -3, true], [9, -4, true]] as const)) put(cv, x, top + y, 'a', d);
      } else {
        // Cornes d'os recourbées.
        const horns: readonly (readonly [number, number])[] = side ? [[3, 1], [2, 0], [2, -1], [3, -2]] : [[1, 2], [0, 1], [-1, 0], [-1, -1], [0, -2], [14, 2], [15, 1], [16, 0], [16, -1], [15, -2]];
        for (const [x, y] of horns) put(cv, x, top + y, 'n', x > 8);
      }
      break;
    }
    case 'greathelm': {
      // Heaume de chevalier : calotte, nasal, protège-joues jusqu'au menton, grand cimier.
      for (let j = 0; j < 5; j++) recolorRow(cv, top + j, -2, 17, null, 'm');
      if (front) {
        for (let j = 5; j <= 9; j++) {
          put(cv, 2, top + j, 'm');
          put(cv, 3, top + j, 'm');
          put(cv, 12, top + j, 'm', true);
          put(cv, 13, top + j, 'm', true);
        }
        for (let j = 4; j <= 7; j++) put(cv, 7, top + j, 'm', j > 5);
        recolorRow(cv, top + 4, 4, 11, null, 'm', true);
      } else if (side) {
        for (let j = 4; j <= 9; j++) for (const x of [2, 3, 4]) put(cv, x, top + j, 'm', x === 4);
        recolorRow(cv, top + 4, 5, 13, null, 'm', true);
      } else {
        for (let j = 4; j <= 9; j++) recolorRow(cv, top + j, -2, 17, 'h', 'm', j > 7);
      }
      const crest: readonly (readonly [number, number])[] = side
        ? [[6, -1], [5, -1], [5, -2], [4, -2], [3, -2], [3, -3], [2, -3], [1, -3], [1, -2], [0, -2], [0, -1]]
        : [[6, -1], [7, -1], [8, -1], [9, -1], [7, -2], [8, -2], [8, -3], [9, -3], [9, -4], [10, -4], [10, -5], [11, -5], [11, -4]];
      for (const [x, y] of crest) put(cv, x, top + y, 'a', side ? x < 3 : x > 8);
      break;
    }
    case 'cowl': {
      // Capuche de mage à pointe tombante ; le front reste dans l'ombre.
      const tip: readonly (readonly [number, number])[] = side
        ? [[5, -1], [4, -1], [4, -2], [3, -2], [2, -3], [1, -3], [1, -2]]
        : [[6, -1], [7, -1], [8, -1], [8, -2], [9, -2], [9, -3], [10, -3], [11, -4], [11, -3]];
      for (const [x, y] of tip) put(cv, x, top + y, 'c', side ? x < 3 : x > 9);
      if (pose !== 'up') for (let j = 3; j <= 4; j++) recolorRow(cv, top + j, -2, 17, 'h', 'c', true);
      break;
    }
    case 'hat': {
      // Chapeau pointu à large bord, pointe penchée, ruban.
      const brimY = top + 3;
      for (let x = side ? 1 : 0; x <= (side ? 13 : 15); x++) put(cv, x, brimY, 'c', x > 11);
      for (let x = side ? 2 : 1; x <= (side ? 12 : 14); x++) put(cv, x, brimY + 1, 'c', true);
      const cone: readonly (readonly [number, number, number])[] = [
        [4, 2, 8],
        [4, 1, 8],
        [5, 0, 6],
        [5, -1, 5],
        [6, -2, 4],
        [7, -3, 3],
        [8, -4, 2],
        [9, -5, 2],
        [10, -6, 1],
      ];
      for (const [x0, y, w] of cone) for (let i = 0; i < w; i++) put(cv, x0 + i, top + y, 'c', i === w - 1 && w > 2);
      for (let x = 4; x <= 11; x++) put(cv, x, top + 2, 'a', x > 9);
      break;
    }
    case 'bandana':
      recolorRow(cv, top + 2, -2, 17, 'h', 'a');
      recolorRow(cv, top + 3, -2, 17, 'h', 'a', true);
      if (front) {
        put(cv, 13, top + 4, 'a');
        put(cv, 14, top + 5, 'a', true);
      } else if (side) {
        put(cv, 2, top + 3, 'a');
        put(cv, 1, top + 4, 'a', true);
        put(cv, 1, top + 5, 'a', true);
      } else {
        put(cv, 8, top + 4, 'a');
        put(cv, 7, top + 5, 'a', true);
        put(cv, 9, top + 5, 'a', true);
      }
      break;
    case 'circlet':
      if (pose !== 'up') recolorRow(cv, top + 3, -2, 17, 'h', 'g');
      if (front) put(cv, 7, top + 3, 'a');
      break;
    case 'leaves':
      for (const [x, y] of [[3, 0], [4, -1], [6, -1], [7, -2], [9, -1], [10, -2], [11, -1], [12, 0]] as const) put(cv, side ? x - 1 : x, top + y, 'a', x > 9);
      break;
    case 'goggles':
      if (pose === 'up') {
        recolorRow(cv, top + 4, -2, 17, 'h', 'l', true);
      } else if (front) {
        recolorRow(cv, top + 4, -2, 17, null, 'l', true);
        for (const x of [5, 6, 9, 10]) put(cv, x, top + 4, 'g', x === 6 || x === 10);
      } else {
        recolorRow(cv, top + 4, -2, 17, null, 'l', true);
        put(cv, 10, top + 4, 'g');
        put(cv, 11, top + 4, 'g', true);
      }
      break;
    case 'none':
      break;
  }
}

/* ---------- Équipement : armes, bouclier, carquois ---------- */

/** Cape : déborde du corps et ondule (derrière le corps de face et de profil, par-dessus de dos). */
function drawCape(cv: Canvas, pose: CharPose, bob: number, tick: number, build: Build): void {
  const b = bob;
  const wave = tick % 2 === 0 ? 0 : 1;
  const wide = build === 'brute' || build === 'armored' ? 1 : 0;
  if (pose === 'down') {
    for (let y = 14; y <= 24; y++) {
      const spread = y < 19 ? 0 : y < 22 ? 1 : 2;
      put(cv, 1 - wide - spread, y - b, 'c');
      put(cv, 14 + wide + spread, y - b, 'c', true);
      if (spread > 0) {
        put(cv, 2 - wide - spread, y - b, 'c');
        put(cv, 13 + wide + spread, y - b, 'c', true);
      }
    }
    put(cv, -1 - wide - wave, 25 - b, 'c', true);
    put(cv, 16 + wide + wave, 25 - b, 'c', true);
  } else if (pose === 'side') {
    for (let y = 14; y <= 25; y++) {
      const back = Math.floor((y - 14) / 3) + (y > 21 ? wave : 0);
      for (let x = 3 - back; x <= 5; x++) put(cv, x, y - b, 'c', x === 3 - back);
    }
  } else {
    for (let y = 13; y <= 24; y++) for (let x = 2 - wide; x <= 13 + wide; x++) put(cv, x, y - b, 'c', x >= 12 + wide || (y > 22 && (x + wave) % 3 === 0));
  }
}

/** Écharpe : un long pan qui vole au vent derrière le personnage. */
function drawScarf(cv: Canvas, pose: CharPose, bob: number, tick: number): void {
  const b = bob;
  const wave = tick % 2 === 0 ? 0 : 1;
  const tail: readonly (readonly [number, number])[] =
    pose === 'down'
      ? [[11, 13], [12, 14], [13, 14], [14, 14], [15, 15], [16, 15], [17, 15 + wave], [18, 16 + wave], [19, 16 + wave]]
      : pose === 'side'
        ? [[5, 13], [4, 13], [3, 14], [2, 14], [1, 14], [0, 15], [-1, 15 + wave], [-2, 16 + wave], [-3, 16 + wave]]
        : [[7, 14], [7, 15], [8, 16], [7, 17], [8, 18], [7 + wave, 19], [9, 14], [9, 15], [10, 16], [9, 17], [10 + wave, 18]];
  tail.forEach(([x, y], i) => put(cv, x, y - b, 'a', i % 3 === 2));
}

function drawQuiver(cv: Canvas, pose: CharPose, bob: number, _layer: 'back'): void {
  // Carquois de cuir en travers du dos, empennes claires qui dépassent de l'épaule.
  const b = bob;
  if (pose === 'up') {
    for (let j = 0; j < 8; j++) {
      put(cv, 9 + (j >> 2), 13 + j - b, 'l', j > 5);
      put(cv, 10 + (j >> 2), 13 + j - b, 'l', true);
    }
    for (const x of [9, 10, 11]) put(cv, x, 12 - b, 'n', x === 11);
  } else if (pose === 'down') {
    for (const x of [11, 12]) put(cv, x, 11 - b, 'n', x === 12);
    put(cv, 12, 12 - b, 'l', true);
  } else {
    for (let j = 0; j < 7; j++) put(cv, 3, 13 + j - b, 'l', true);
    for (const y of [11, 12]) put(cv, 3, y - b, 'n');
  }
}

/** Une hampe verticale de `y0` à `y1` en colonne `x`. */
function shaft(cv: Canvas, x: number, y0: number, y1: number, m = 'o'): void {
  for (let y = y0; y <= y1; y++) put(cv, x, y, m, y > y1 - 2);
}

function drawGear(cv: Canvas, gear: CharacterGear, pose: CharPose, frame: number, bob: number, tick: number): void {
  const swing = frame === 1 ? -1 : frame === 3 ? 1 : 0;
  const b = bob;
  const side = pose === 'side';
  // Main de l'arme : main droite du personnage (à gauche à l'écran de face, à droite de dos, devant de profil).
  const build = gear.build ?? 'normal';
  const armored = build === 'armored';
  const [handL, handR] = HANDS[build];
  const hand = side ? { x: 8 + swing * 2, y: 20 - b } : pose === 'down' ? { x: handL, y: 20 - b + swing } : { x: handR, y: 20 - b - swing };
  // Avec un bouclier de profil, l'arme passe derrière le corps.
  const wx = side ? (gear.shield ? 5 : hand.x + 1) : pose === 'down' ? hand.x - 1 : hand.x + 1;
  const out = pose === 'down' ? -1 : 1; // côté extérieur de la main
  const flick = tick % 2 === 0;

  switch (gear.weapon) {
    case 'sword':
      if (pose === 'down') {
        // Garde basse : lame tenue en avant, pointe vers le sol (posture de bretteur).
        for (let y = hand.y - 1; y <= hand.y + 1; y++) put(cv, hand.x - 1, y, 'g', y > hand.y);
        put(cv, hand.x + 1, hand.y - 1, 'g');
        for (let k = 0; k < 7; k++) {
          const x = hand.x - 2 - k;
          const y = hand.y + (k >> 1);
          put(cv, x, y, 'm', k > 4);
          put(cv, x, y - 1, 'i');
        }
        break;
      }
      shaft(cv, wx, hand.y - 9, hand.y - 2, 'm');
      for (let y = hand.y - 9; y <= hand.y - 3; y++) put(cv, wx + out, y, 'i');
      put(cv, wx, hand.y - 10, 'i');
      for (const dx of [-1, 0, 1]) put(cv, wx + dx, hand.y - 1, 'g', dx === 1);
      put(cv, wx, hand.y, 'l', true);
      break;
    case 'spear':
    case 'harpoon': {
      const tip = gear.weapon === 'spear' ? hand.y - 22 : hand.y - 23;
      shaft(cv, wx, tip + 3, hand.y + 3);
      put(cv, wx, tip, 'i');
      put(cv, wx, tip + 1, 'm');
      put(cv, wx, tip + 2, 'm', true);
      put(cv, wx - 1, tip + 2, 'm');
      put(cv, wx + 1, tip + 2, 'm', true);
      if (gear.weapon === 'harpoon') {
        put(cv, wx - 1, tip + 3, 'm');
        put(cv, wx + 1, tip + 3, 'm', true);
        // Corde enroulée.
        for (const [dx, dy] of [[1, 10], [2, 11], [1, 12], [2, 13]] as const) put(cv, wx + dx * out, tip + dy, 'n', dy > 11);
      }
      break;
    }
    case 'axe':
      // Hachette : fer en croissant tourné vers l'extérieur.
      shaft(cv, wx, hand.y - 10, hand.y + 1);
      for (let y = hand.y - 10; y <= hand.y - 5; y++) {
        const d = Math.abs(y - (hand.y - 7.5));
        const reach = d < 1.5 ? 3 : 2;
        for (let k = 1; k <= reach; k++) put(cv, wx + k * out, y, k === reach ? 'i' : 'm', k === reach - 1 && k > 1);
      }
      break;
    case 'greataxe':
      // Grande hache à double lame en croissant.
      shaft(cv, wx, hand.y - 15, hand.y + 2);
      put(cv, wx, hand.y - 16, 'i');
      for (let y = hand.y - 15; y <= hand.y - 6; y++) {
        const d = Math.abs(y - (hand.y - 10.5));
        const reach = d < 1.5 ? 4 : d < 3.5 ? 3 : 2;
        for (let k = 1; k <= reach; k++) put(cv, wx + k * out, y, k === reach ? 'i' : 'm', k === reach - 1);
        const back = d < 2.5 ? 2 : 1;
        for (let k = 1; k <= back; k++) put(cv, wx - k * out, y, k === back ? 'i' : 'm', true);
      }
      break;
    case 'bow':
      // Grand arc, plus haut que le personnage n'est large : la classe se lit de loin.
      for (let y = hand.y - 14; y <= hand.y + 5; y++) {
        const d = Math.abs(y - (hand.y - 4.5));
        const bend = d < 3 ? 3 : d < 6 ? 2 : d < 8.5 ? 1 : 0;
        put(cv, wx + bend * out, y, 'o', d > 7);
        if (bend > 0) put(cv, wx + (bend - 1) * out, y, 'o', true);
        put(cv, wx, y, bend > 0 ? 'n' : 'o');
      }
      put(cv, wx + 3 * out, hand.y - 4, 'l', true);
      put(cv, wx + 3 * out, hand.y - 5, 'l', true);
      break;
    case 'crossbow':
      for (let i = -3; i <= 3; i++) put(cv, wx + i * out, hand.y - 1, 'o', i > 1);
      for (let y = hand.y - 4; y <= hand.y + 2; y++) put(cv, wx + 3 * out, y, 'm', y > hand.y);
      put(cv, wx + 4 * out, hand.y - 1, 'i');
      put(cv, wx + 2 * out, hand.y - 2, 'n');
      break;
    case 'tome':
      if (pose === 'down') {
        // Grimoire ouvert tenu à deux mains devant la poitrine, flamme qui flotte au-dessus.
        const ty = 17 - b;
        for (let y = ty; y <= ty + 2; y++) for (let x = 5; x <= 10; x++) put(cv, x, y, x === 5 || x === 10 ? 'a' : 'n', x === 10 || x === 8 || y === ty + 2);
        put(cv, 4, ty + 2, 's');
        put(cv, 11, ty + 2, 's', true);
        put(cv, 7, ty - 2 - (flick ? 1 : 0), 'f');
        put(cv, 8, ty - 2, 'f', !flick);
        put(cv, 7, ty - 1, 'f', true);
        put(cv, 8, ty - 1, 'f');
        if (flick) put(cv, 9, ty - 4, 'f', true);
        else put(cv, 6, ty - 4, 'f', true);
        break;
      }
      for (let y = hand.y - 4; y <= hand.y - 1; y++) for (let i = 0; i <= 3; i++) put(cv, wx + (i - 1) * out, y, i === 0 ? 'n' : 'a', i === 3 || y === hand.y - 1);
      put(cv, wx + out, hand.y - 3, 'g');
      put(cv, wx + out, hand.y - 6 - (flick ? 1 : 0), 'f');
      if (flick) put(cv, wx + 2 * out, hand.y - 6, 'f', true);
      break;
    case 'staff_lantern':
      // Bâton surmonté d'une lanterne : cage de métal, flamme sur deux rangées.
      shaft(cv, wx, hand.y - 15, hand.y + 4);
      put(cv, wx, hand.y - 22, 'g');
      for (let i = -1; i <= 1; i++) put(cv, wx + i, hand.y - 21, 'm', i === 1);
      for (let y = hand.y - 20; y <= hand.y - 17; y++) {
        put(cv, wx - 2, y, 'm');
        put(cv, wx + 2, y, 'm', true);
        for (let i = -1; i <= 1; i++) put(cv, wx + i, y, 'f', (y === hand.y - 17 || i === 1) && !flick);
      }
      for (let i = -1; i <= 1; i++) put(cv, wx + i, hand.y - 16, 'm', true);
      break;
    case 'staff_stone':
      shaft(cv, wx, hand.y - 15, hand.y + 4);
      for (let y = hand.y - 20; y <= hand.y - 16; y++) for (let i = -1; i <= 1; i++) put(cv, wx + i, y, 'm', i === 1 || y === hand.y - 16);
      put(cv, wx, hand.y - 18, 'f', !flick);
      break;
    case 'staff_branch':
      shaft(cv, wx, hand.y - 16, hand.y + 4);
      for (const [dx, dy, m] of [[-1, -17, 'o'], [-2, -18, 'a'], [1, -18, 'o'], [2, -19, 'a'], [0, -19, 'a'], [1, -20, 'a'], [-1, -20, 'a'], [3, -18, 'a']] as const) put(cv, wx + dx * out, hand.y + dy, m, dx > 0);
      break;
    case 'banner': {
      const topY = hand.y - 25;
      shaft(cv, wx, topY + 1, hand.y + 4);
      put(cv, wx, topY, 'g');
      // Drapeau aux couleurs du camp, qui ondule ; emblème à l'écharpe ; frange dorée.
      for (let i = 1; i <= 6; i++) {
        const wave = (i + tick) % 4 < 2 ? 0 : 1;
        for (let y = topY + 1 + wave; y <= topY + 7 + wave; y++) put(cv, wx + i * out, y, y === topY + 7 + wave ? 'g' : 'c', i >= 5 || y > topY + 5 + wave);
      }
      put(cv, wx + 3 * out, topY + 4, 'a');
      put(cv, wx + 3 * out, topY + 3, 'a');
      put(cv, wx + 4 * out, topY + 4, 'a', true);
      break;
    }
    case 'daggers': {
      const blade = (x: number, y: number, dir: number): void => {
        for (let k = 1; k <= 4; k++) put(cv, x, y - k, k === 4 ? 'i' : 'm', dir > 0);
        put(cv, x, y, 'l', true);
        put(cv, x - 1, y - 1, 'g');
        put(cv, x + 1, y - 1, 'g', true);
      };
      blade(wx, hand.y, 1);
      if (!side) blade(pose === 'down' ? 14 : 1, 20 - b - swing * (pose === 'down' ? 1 : -1), -1);
      break;
    }
    case 'flask':
      put(cv, wx, hand.y - 6, 'l', true);
      put(cv, wx, hand.y - 5, 'n');
      for (let y = hand.y - 4; y <= hand.y - 1; y++) for (let i = -1; i <= 1; i++) put(cv, wx + i, y, 'f', i === 1 || y === hand.y - 1 ? !flick : false);
      // Fioles à la ceinture.
      if (pose === 'down') for (const x of [9, 11]) put(cv, x, 19 - b, 'f', true);
      break;
    case 'torch':
      shaft(cv, wx, hand.y - 7, hand.y + 1);
      for (let y = hand.y - 11; y <= hand.y - 8; y++) for (let i = -1; i <= 1; i++) if (!(y === hand.y - 11 && i !== (flick ? 0 : out))) put(cv, wx + i, y, 'f', y === hand.y - 8 || i === 1);
      break;
    case 'none':
      break;
  }
  // La main par-dessus le manche.
  if (gear.weapon !== 'none' && gear.weapon !== 'tome' && gear.weapon !== 'flask') put(cv, hand.x, hand.y, armored ? 'm' : 's');

  if (gear.shield) {
    // Bouclier-tour : bord de métal, champ aux couleurs du camp, umbo doré.
    // Une armure lourde porte un pavois plus grand.
    const box = armored
      ? pose === 'down' ? { x0: 12, x1: 17 } : pose === 'up' ? { x0: -2, x1: 2 } : { x0: 10, x1: 14 }
      : pose === 'down' ? { x0: 11, x1: 15 } : pose === 'up' ? { x0: 0, x1: 3 } : { x0: 10, x1: 13 };
    const y0 = (armored ? 12 : 13) - b;
    const y1 = (armored ? 24 : 23) - b;
    if (pose === 'up') {
      for (let y = y0 + 1; y <= y1 - 1; y++) for (let x = box.x0; x <= box.x1; x++) put(cv, x, y, 'm', true);
    } else {
      for (let y = y0; y <= y1; y++) {
        for (let x = box.x0; x <= box.x1; x++) {
          const rim = x === box.x0 || x === box.x1 || y === y0 || y === y1;
          put(cv, x, y, rim ? 'm' : 'c', !rim && x === box.x1 - 1);
        }
      }
      const cx = Math.round((box.x0 + box.x1) / 2);
      put(cv, cx, 18 - b, 'g');
      put(cv, cx, 17 - b, 'a');
      put(cv, cx, 19 - b, 'a', true);
    }
  }
}
