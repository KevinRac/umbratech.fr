/**
 * Réglages d'accessibilité (GDD §13.8, décisions n°242 à n°244, lot E de M10).
 * Logique pure : lecture tolérante des valeurs enregistrées et règles chiffrées.
 * La lecture du stockage et de `prefers-reduced-motion` reste dans `core/`.
 */

/* ---------- Taille du texte (n°242) ---------- */

export type TextSize = 'normal' | 'large';
export const TEXT_SIZES: readonly TextSize[] = ['normal', 'large'];
export const TEXT_SIZE_LABEL: Readonly<Record<TextSize, string>> = { normal: '×1', large: '×1,25' };
/** Agrandissement de la police des dialogues, scènes et menus. */
export const TEXT_SIZE_FACTOR: Readonly<Record<TextSize, number>> = { normal: 1, large: 1.25 };

export const parseTextSize = (raw: unknown): TextSize => (raw === 'large' ? 'large' : 'normal');

/* ---------- Vitesse du texte (n°244) ---------- */

export type TextSpeed = 'slow' | 'normal' | 'fast' | 'instant';
export const TEXT_SPEEDS: readonly TextSpeed[] = ['slow', 'normal', 'fast', 'instant'];
export const TEXT_SPEED_LABEL: Readonly<Record<TextSpeed, string>> = { slow: 'Lente', normal: 'Normale', fast: 'Rapide', instant: 'Instantanée' };
/** Facteur appliqué à `balance.dialogue.charsPerSecond` (30 car/s : 18, 30, 60, tout de suite). */
export const TEXT_SPEED_FACTOR: Readonly<Record<Exclude<TextSpeed, 'instant'>, number>> = { slow: 0.6, normal: 1, fast: 2 };
/** « Instantanée » : assez rapide pour que toute réplique s'affiche à la première image. */
export const INSTANT_CPS = 100_000;

export const parseTextSpeed = (raw: unknown): TextSpeed => (TEXT_SPEEDS.includes(raw as TextSpeed) ? (raw as TextSpeed) : 'normal');

export interface Typing {
  readonly charsPerSecond: number;
  readonly fastMultiplier: number;
}

/** Machine à écrire réglée par le joueur, à partir des valeurs de `balance.dialogue`. */
export function typingFor(base: Typing, speed: TextSpeed): Typing {
  if (speed === 'instant') return { charsPerSecond: INSTANT_CPS, fastMultiplier: 1 };
  return { charsPerSecond: base.charsPerSecond * TEXT_SPEED_FACTOR[speed], fastMultiplier: base.fastMultiplier };
}

/* ---------- Effets réduits (n°221, étendus par n°244) ---------- */

/** « Auto » suit la préférence du système (`prefers-reduced-motion`). */
export type ReducedMotion = 'auto' | 'on' | 'off';
export const REDUCED_MOTIONS: readonly ReducedMotion[] = ['auto', 'on', 'off'];
export const REDUCED_MOTION_LABEL: Readonly<Record<ReducedMotion, string>> = { auto: 'Selon le système', on: 'Oui', off: 'Non' };

/** Valeur enregistrée → réglage ; l'ancien booléen (`true` / `false` du lot M8) reste compris. */
export function parseReducedMotion(raw: unknown): ReducedMotion {
  if (raw === true || raw === 'on') return 'on';
  if (raw === false || raw === 'off') return 'off';
  return 'auto';
}

/** Les effets sont-ils réduits, compte tenu du système ? */
export const reducedActive = (mode: ReducedMotion, systemPrefersReduced: boolean): boolean => (mode === 'auto' ? systemPrefersReduced : mode === 'on');

/** Mêmes facteurs que l'écran rapproché (n°221) : secousses ÷ 3, flashs à 30 %. */
export const REDUCED = { shake: 1 / 3, flash: 0.3 } as const;

export const shakeIntensity = (intensity: number, reduced: boolean): number => (reduced ? intensity * REDUCED.shake : intensity);
export const flashStrength = (reduced: boolean): number => (reduced ? REDUCED.flash : 1);

/**
 * Ce que « Effets réduits » change dans le monde ouvert : pas de zoom au passage
 * au combat, pas de poussière dans les rayons, scintillement des feux atténué,
 * pas de rebond des repères.
 */
export interface WorldMotion {
  readonly battleZoom: boolean;
  readonly dust: boolean;
  /** Part du scintillement gardée (0 : lumière fixe). */
  readonly flicker: number;
  readonly bob: boolean;
}

export const worldMotion = (reduced: boolean): WorldMotion => (reduced ? { battleZoom: false, dust: false, flicker: 0.25, bob: false } : { battleZoom: true, dust: true, flicker: 1, bob: true });

/* ---------- Mode daltonien (n°243) ---------- */

/** Ce qu'indique une case colorée sur la carte de combat. */
export type TileKind = 'move' | 'attack' | 'threat' | 'marked' | 'heal' | 'skill' | 'area' | 'slot' | 'pick' | 'talk';

/** Motif dessiné en plus de la couleur (la couleur ne change pas). */
export type TilePattern = 'plain' | 'hatch' | 'cross' | 'dots' | 'plus' | 'rings' | 'stripes' | 'corners' | 'frame' | 'bubble';

export const TILE_PATTERNS: readonly TilePattern[] = ['plain', 'hatch', 'cross', 'dots', 'plus', 'rings', 'stripes', 'corners', 'frame', 'bubble'];

/** Le motif couvre-t-il ce pixel (intérieur de la case, 2 à 13) ? */
export function patternAt(pattern: TilePattern, x: number, y: number): boolean {
  if (x < 2 || y < 2 || x > 13 || y > 13) return false;
  const cx = x - 7.5;
  const cy = y - 7.5;
  switch (pattern) {
    case 'plain':
      return false;
    case 'hatch':
      return (x + y) % 4 === 0;
    case 'cross':
      return (x + y) % 4 === 0 || (x - y + 16) % 4 === 0;
    case 'dots':
      return x % 4 === 1 && y % 4 === 1;
    case 'plus':
      return (Math.abs(cx) < 1 && Math.abs(cy) < 4) || (Math.abs(cy) < 1 && Math.abs(cx) < 4);
    case 'rings': {
      const d = Math.hypot(cx, cy);
      return d > 3.2 && d < 4.6;
    }
    case 'stripes':
      return y % 4 === 1;
    case 'corners':
      return (x <= 4 || x >= 11) && (y <= 4 || y >= 11) && (x === 2 || x === 13 || y === 2 || y === 13);
    case 'frame':
      return (x === 3 || x === 12 || y === 3 || y === 12) && x >= 3 && x <= 12 && y >= 3 && y <= 12;
    case 'bubble':
      return y === 8 && (x === 4 || x === 5 || x === 7 || x === 8 || x === 10 || x === 11);
  }
}

/** Un motif par sens : déplacement uni, attaque hachurée, menace croisée, soin en croix… Deux sens différents n'ont jamais le même motif. */
export const TILE_PATTERN: Readonly<Record<TileKind, TilePattern>> = {
  move: 'plain',
  attack: 'hatch',
  threat: 'cross',
  marked: 'dots',
  heal: 'plus',
  skill: 'rings',
  area: 'stripes',
  slot: 'corners',
  pick: 'frame',
  talk: 'bubble',
};

export type Camp = 'player' | 'ally' | 'enemy';
/** Forme sous les unités : rond pour la compagnie, losange pour les alliés, carré pour les ennemis. */
export type CampShape = 'circle' | 'diamond' | 'square';
export const CAMP_SHAPE: Readonly<Record<Camp, CampShape>> = { player: 'circle', ally: 'diamond', enemy: 'square' };

export const parseColorBlind = (raw: unknown): boolean => raw === true;

/**
 * Crans sous le crâne de difficulté du monde (GDD §7.5) : le rang de la bande
 * dans `balance.foes.difficulty` (1 = Facile … 5 = Mortel) ; un boss n'en a pas
 * (son crâne a déjà sa couronne de couleur et le cut-in).
 */
export function difficultyPips(bands: readonly string[], id: string): number {
  const i = bands.indexOf(id);
  return i < 0 ? 0 : i + 1;
}
