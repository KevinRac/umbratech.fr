/**
 * Plan de l'île (GDD §3) : dimensions, zones, rivière, passages, lieux.
 * Toutes les coordonnées sont en cases de 16 px.
 */

export const MAP_W = 160;
export const MAP_H = 120;
export const SEED = 1;

export type Pt = readonly [number, number];

/** Polygones des zones (priorité Z5 > Z4 > Z3 > Z1 ; le reste est Z2). */
export const Z4_POLY: readonly Pt[] = [[36, -1], [161, -1], [161, 37], [144, 39], [126, 34], [108, 41], [94, 35], [76, 42], [62, 38], [48, 31], [36, 21]];
export const Z3_POLY: readonly Pt[] = [[27, 87], [58, 91], [80, 88], [90, 92], [112, 92], [116, 82], [134, 77], [161, 74], [161, 121], [27, 121]];
export const Z1_POLY: readonly Pt[] = [[-1, 63], [30, 61], [56, 64], [80, 62], [94, 63], [113, 71], [118, 100], [-1, 100]];

/** Îlot de la Citadelle (Z5) : x ≤ 28 et y ≥ 84 (le chenal fait partie de la zone). */
export const Z5_MAX_X = 28;
export const Z5_MIN_Y = 84;

export const RIVER: readonly Pt[] = [[101, 14], [98, 26], [96, 38], [92, 48], [94, 58], [90, 68], [92, 78], [89, 90], [92, 101], [90, 115]];

/** Franchissements de la rivière : deux rangées à partir de `y`. */
export const CROSSINGS: readonly { readonly y: number; readonly kind: 'bridge' | 'ford' }[] = [
  { y: 26, kind: 'ford' },
  { y: 44, kind: 'bridge' },
  { y: 66, kind: 'bridge' },
  { y: 78, kind: 'ford' },
  { y: 100, kind: 'ford' },
];

/** Chaussée vers l'îlot (barrée par un passage de Z5). */
export const CAUSEWAY = { x0: 25, x1: 28, y0: 99, y1: 100 } as const;
/** Chenal qui isole l'îlot. */
export const CHANNEL = { x0: 25, x1: 28, y0: 84, y1: 113 } as const;

export type LocationKind = 'village' | 'ville' | 'camp' | 'donjon' | 'poi' | 'autel';

export interface LocationPlan {
  readonly id: string;
  readonly name: string;
  readonly kind: LocationKind;
  /** Centre en cases. */
  readonly cx: number;
  readonly cy: number;
  /** Taille du rectangle en cases. */
  readonly w: number;
  readonly h: number;
  /** Style de la mise en scène (voir `generate.ts`). */
  readonly style: string;
}

export const LOCATIONS: readonly LocationPlan[] = [
  { id: 'haut_gue', name: 'Haut-Gué', kind: 'village', cx: 72, cy: 80, w: 22, h: 16, style: 'haut_gue' },
  { id: 'ronceval', name: 'Ronceval', kind: 'village', cx: 30, cy: 46, w: 22, h: 16, style: 'ronceval' },
  { id: 'port_brume', name: 'Port-Brume', kind: 'village', cx: 108, cy: 100, w: 24, h: 16, style: 'port_brume' },
  { id: 'pierre_haute', name: 'Pierre-Haute', kind: 'village', cx: 62, cy: 22, w: 22, h: 16, style: 'pierre_haute' },
  { id: 'valcendre', name: 'Valcendre', kind: 'ville', cx: 122, cy: 52, w: 32, h: 24, style: 'valcendre' },
  { id: 'camp_ecumeurs', name: "Camp des Écumeurs", kind: 'camp', cx: 104, cy: 80, w: 16, h: 12, style: 'camp' },
  { id: 'bosquet_roi_cerf', name: 'Bosquet du Roi-Cerf', kind: 'donjon', cx: 20, cy: 26, w: 14, h: 12, style: 'bosquet' },
  { id: 'tour_noye', name: 'Tour du Noyé', kind: 'donjon', cx: 46, cy: 100, w: 12, h: 12, style: 'tour_noye' },
  { id: 'aiguille_brisee', name: "Aiguille Brisée", kind: 'donjon', cx: 126, cy: 16, w: 14, h: 12, style: 'aiguille' },
  { id: 'citadelle', name: 'Citadelle Engloutie', kind: 'donjon', cx: 14, cy: 100, w: 16, h: 18, style: 'citadelle' },
  { id: 'pont_trois_arches', name: 'Pont des Trois Arches', kind: 'poi', cx: 89, cy: 67, w: 10, h: 8, style: 'pont_arches' },
  { id: 'pont_vieux', name: 'Vieux Pont', kind: 'poi', cx: 93, cy: 45, w: 10, h: 8, style: 'pont_vieux' },
  { id: 'plage_epaves', name: 'Plage des Épaves', kind: 'poi', cx: 70, cy: 110, w: 10, h: 6, style: 'epaves' },
  { id: 'menhir_aubemer', name: "Menhir d'Aubemer", kind: 'poi', cx: 50, cy: 74, w: 5, h: 5, style: 'menhir' },
  { id: 'menhir_foret', name: 'Menhir de la Forêt', kind: 'poi', cx: 58, cy: 42, w: 5, h: 5, style: 'menhir' },
  { id: 'menhir_cendre', name: 'Menhir de Cendre', kind: 'poi', cx: 112, cy: 28, w: 5, h: 5, style: 'menhir' },
  { id: 'autel_aubemer', name: "Autel d'Aubemer", kind: 'autel', cx: 62, cy: 70, w: 4, h: 4, style: 'autel' },
  { id: 'autel_racine', name: 'Autel de la Forêt-Racine', kind: 'autel', cx: 38, cy: 34, w: 4, h: 4, style: 'autel' },
  { id: 'autel_valcendre', name: 'Autel du Val', kind: 'autel', cx: 108, cy: 62, w: 4, h: 4, style: 'autel' },
  { id: 'autel_cote', name: 'Autel de la Côte', kind: 'autel', cx: 82, cy: 106, w: 4, h: 4, style: 'autel' },
  { id: 'autel_monts', name: 'Autel des Monts', kind: 'autel', cx: 84, cy: 18, w: 4, h: 4, style: 'autel' },
  { id: 'autel_citadelle', name: 'Autel de la Citadelle', kind: 'autel', cx: 14, cy: 90, w: 4, h: 4, style: 'autel' },
];

export const START = { id: 'start', cx: 72, cy: 87 } as const;

/** Routes : paires de lieux reliés (tracées par A*). */
export const ROADS: readonly (readonly [string, string])[] = [
  ['haut_gue', 'pont_trois_arches'],
  ['pont_trois_arches', 'camp_ecumeurs'],
  ['camp_ecumeurs', 'haut_gue'],
  ['haut_gue', 'ronceval'],
  ['ronceval', 'bosquet_roi_cerf'],
  ['ronceval', 'pont_vieux'],
  ['pont_vieux', 'valcendre'],
  ['camp_ecumeurs', 'port_brume'],
  ['port_brume', 'tour_noye'],
  ['tour_noye', 'citadelle'],
  ['ronceval', 'pierre_haute'],
  ['pierre_haute', 'aiguille_brisee'],
  ['valcendre', 'aiguille_brisee'],
];
