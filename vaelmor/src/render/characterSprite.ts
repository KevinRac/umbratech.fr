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

/* ---------- Formes (une lettre par matière, « . » = vide) ---------- */

type Rows = readonly string[];

/**
 * s peau · h cheveux · c cape/manches · t tunique · a écharpe/col · l ceinture
 * g boucle · p pantalon · b bottes · m métal (i : arête claire) · e œil · k joue · w reflet.
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
};

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
/** Sous une robe, seules les bottes dépassent. */
const LEGS_DRESS: readonly Rows[] = [
  ['..TTTTTTTTTTTT..', '....bbb..bbB....', '....bbb..bbB....', '................', '................'],
  ['..TTTTTTTTTTTT..', '....bbb..bbB....', '.........bbB....', '................', '................'],
  ['..TTTTTTTTTTTT..', '....bbb..bbB....', '....bbb..bbB....', '................', '................'],
  ['..TTTTTTTTTTTT..', '....bbb..bbB....', '....bbb.........', '................', '................'],
];
const LEGS_DRESS_SIDE: readonly Rows[] = [
  ['..TTTTTTTTTT....', '......bbbB......', '......bbbBb.....', '................', '................'],
  ['..TTTTTTTTTT....', '....bbB...bbB...', '...bbB....bbBb..', '................', '................'],
  ['..TTTTTTTTTT....', '......bbbB......', '......bbbBb.....', '................', '................'],
  ['..TTTTTTTTTT....', '.....bbB..bbB...', '....bbB...bbBb..', '................', '................'],
];

export const CHARACTER_SHAPES = { HEAD, BODY, LEGS_FRONT, LEGS_SIDE, LEGS_DRESS, LEGS_DRESS_SIDE } as const;

/* ---------- Peinture ---------- */

interface Cell {
  /** Lettre de matière (minuscule) ou `null` si vide. */
  m: string | null;
  dark: boolean;
}

type Canvas = Cell[];

const at = (cv: Canvas, x: number, y: number): Cell | undefined => (x >= 0 && y >= 0 && x < CHAR_W && y < CHAR_H ? cv[y * CHAR_W + x] : undefined);

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
function drawLimbs(cv: Canvas, look: CharacterLook, pose: CharPose, frame: number, bob: number): void {
  const swing = frame === 1 ? -1 : frame === 3 ? 1 : 0;
  const y = 20 - bob;
  if (pose === 'side') {
    // Bras avant : manche le long du corps, la main avance et recule.
    const hx = 8 + swing * 2;
    const sleeve = look.outfit === 'cloak' ? 'c' : 'c';
    for (let j = 14; j <= 19; j++) put(cv, j < 17 ? 8 : 8 + Math.round((swing * (j - 16)) / 2), j - bob, sleeve, j > 17);
    put(cv, hx, y, 's');
    put(cv, hx, y - 1, sleeve);
  } else {
    // Face / dos : les mains montent et descendent en alternance.
    put(cv, 2, y + swing, 's');
    put(cv, 13, y - swing, 's', true);
    put(cv, 2, y + swing - 1, look.outfit === 'cloak' ? 'c' : 'c');
    put(cv, 13, y - swing - 1, 'c', true);
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

function colorOf(look: CharacterLook, cv: Canvas, x: number, y: number): number {
  const c = at(cv, x, y) as Cell;
  const m = c.m as string;
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
export function paintCharacterFrame(sink: PixelSink, ox: number, oy: number, look: CharacterLook, pose: CharPose, frame: number): void {
  const cv: Canvas = Array.from({ length: CHAR_W * CHAR_H }, () => ({ m: null, dark: false }));
  const f = ((frame % CHAR_WALK_FRAMES) + CHAR_WALK_FRAMES) % CHAR_WALK_FRAMES;
  const bob = f === 1 || f === 3 ? 1 : 0;
  const dress = look.outfit === 'dress';
  const legs = pose === 'side' ? (dress ? LEGS_DRESS_SIDE : LEGS_SIDE) : dress ? LEGS_DRESS : LEGS_FRONT;
  stamp(cv, legs[f] as Rows, 22);
  stamp(cv, BODY[pose][look.outfit], 13 - bob);
  stamp(cv, HEAD[pose][look.head], 2 - bob);
  drawLimbs(cv, look, pose, f, bob);

  const colors = new Map<number, number>();
  for (let y = 0; y < CHAR_H; y++) for (let x = 0; x < CHAR_W; x++) if (at(cv, x, y)?.m) colors.set(y * CHAR_W + x, colorOf(look, cv, x, y));

  for (let y = 0; y < CHAR_H; y++) {
    for (let x = 0; x < CHAR_W; x++) {
      const own = colors.get(y * CHAR_W + x);
      if (own !== undefined) {
        sink.set(ox + x, oy + y, own);
        continue;
      }
      // Contour : 1 pixel d'art (2 pixels d'écran au zoom ×2), plus sombre que celui des décors.
      for (const [dx, dy] of [[0, 1], [-1, 0], [1, 0], [0, -1]] as const) {
        const n = colors.get((y + dy) * CHAR_W + (x + dx));
        if (n === undefined || x + dx < 0 || x + dx >= CHAR_W || y + dy < 0 || y + dy >= CHAR_H) continue;
        sink.set(ox + x, oy + y, mixColor(n, INK, 0.78));
        break;
      }
    }
  }
}
