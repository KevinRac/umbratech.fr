/**
 * Décors multi-tuiles (« tampons ») : arbres, maisons, remparts, tentes,
 * falaises, autels… Chaque tampon est peint une fois puis découpé en tuiles.
 *
 * - `blocked` : cases de collision (ligne par ligne) ;
 * - `canopyRows` : nombre de rangées du haut posées sur la couche `canopy`
 *   (dessinée SUR le héros) ; les autres vont dans `decor` (SOUS le héros).
 */
import { hashString, mulberry32 } from './noise';
import { type Rnd } from './art';
import { Px } from './px';
import * as A from './accessories';
import { captureDoors, captureLights, type StampDoor, type StampLight } from './lights';
import { WHEAT_VARIANTS, paintWheat } from './wheat';
import { MILL_MS, paintCottage, paintForge, paintGuardTower, paintHut, paintInn, paintLogHouse, paintMill, paintSlateHouse, paintStoneHouse, paintTemple, paintTownHouse } from './buildings';
import { DEAD_FOOT, OAK_FOOT, PINE_FOOT, WIND_MS, paintBush, paintDarkPine, paintDeadTree, paintFlowers, paintLavender, paintOak, paintPine, paintReeds, paintSunflowers, paintTallGrass } from './flora';
const T = 16;

export interface Stamp {
  readonly name: string;
  readonly variant: number;
  readonly w: number;
  readonly h: number;
  readonly px: Px;
  readonly blocked: readonly boolean[];
  readonly canopyRows: number;
  /** Rangées du bas qui ne portent que l'ombre portée (jamais bloquantes). */
  readonly shadowRows: number;
  /** Sortie de cheminée (pixels du tampon) d'où monte la fumée animée, s'il y en a une. */
  readonly chimney: { readonly x: number; readonly y: number } | null;
  /** Bâtiment : ses rangées de toit (canopy) ne doivent pas surplomber une route ni une place. */
  readonly building: boolean;
  /** Images d'animation (vent, ailes du moulin) ; `px` est la première. */
  readonly frames: readonly Px[];
  /** Durée de chaque image (ms), vide si le tampon est fixe. */
  readonly frameMs: readonly number[];
  /** Case du pied (tronc) : point d'ancrage pour `placeFoot`. */
  readonly foot: { readonly x: number; readonly y: number };
  /** Végétation : peut chevaucher une autre végétation (composée pixel par pixel). */
  readonly overlap: boolean;
  /** Sources de lumière (fenêtres, lanternes, foyers, runes) : halos du jeu (n°47). */
  readonly lights: readonly StampLight[];
  /** Portes dessinées (pixels dans le tampon), recueillies comme les lumières (décision n°59). */
  readonly doors: readonly StampDoor[];
}

type Painter = (px: Px, rnd: Rnd, variant: number, frame: number) => void;

interface Def {
  readonly w: number;
  readonly h: number;
  readonly variants: number;
  readonly canopyRows: number;
  readonly shadowRows?: number;
  readonly chimney?: { readonly x: number; readonly y: number };
  /** Cases bloquées : `all`, `bottom` (rangée du bas) ou une liste « x,y ». */
  readonly block: 'all' | 'bottom' | 'none' | readonly string[];
  readonly paint: Painter;
  readonly building?: boolean;
  readonly frameMs?: readonly number[];
  readonly foot?: { readonly x: number; readonly y: number };
  readonly overlap?: boolean;
}

/** Végétation (tools/world/flora.ts, décision n°45) : collision au tronc, feuillage sur `canopy`, vent. */
function plant(w: number, h: number, canopy: number, paint: Painter, variants: number, foot: { x: number; y: number } | null, wind = true): Def {
  return {
    w,
    h,
    variants,
    canopyRows: canopy,
    block: foot ? [`${foot.x},${foot.y}`] : 'none',
    paint,
    overlap: true,
    ...(foot ? { foot } : {}),
    ...(wind ? { frameMs: WIND_MS } : {}),
  };
}

/** Accessoire (décision n°46) : bloque toutes ses cases par défaut, le haut des objets hauts passe sur `canopy`. */
function prop(w: number, h: number, paint: Painter, o: { variants?: number; canopy?: number; shadowRows?: number; block?: Def['block']; frameMs?: readonly number[] } = {}): Def {
  return { w, h, variants: o.variants ?? 1, canopyRows: o.canopy ?? 0, block: o.block ?? 'all', paint, ...(o.shadowRows ? { shadowRows: o.shadowRows } : {}), ...(o.frameMs ? { frameMs: o.frameMs } : {}) };
}

/** Cases bloquées « au pied » : toutes les colonnes (ou `cols`) des rangées `rows`. */
function foot(w: number, rows: readonly number[], cols?: readonly number[]): string[] {
  const out: string[] = [];
  for (const y of rows) for (let x = 0; x < w; x++) if (!cols || cols.includes(x)) out.push(`${x},${y}`);
  return out;
}

/**
 * Bâtiment (décision n°44) : `canopy` rangées de toit sur la couche haute, les
 * rangées de murs suivantes bloquent, la dernière ne porte que l'ombre.
 */
function building(w: number, h: number, canopy: number, paint: Painter, extra: { variants?: number; chimney?: { x: number; y: number }; cols?: readonly number[]; blockRows?: readonly number[] } = {}): Def {
  const rows = extra.blockRows ?? Array.from({ length: h - 1 - canopy }, (_, i) => canopy + i);
  return { w, h, variants: extra.variants ?? 1, canopyRows: canopy, shadowRows: 1, block: foot(w, rows, extra.cols), paint, building: true, ...(extra.chimney ? { chimney: extra.chimney } : {}) };
}

/* ---------- Catalogue ---------- */

export const STAMP_DEFS: Readonly<Record<string, Def>> = {
  pine: plant(3, 4, 3, paintPine, 4, PINE_FOOT),
  dark_pine: plant(3, 4, 3, paintDarkPine, 4, PINE_FOOT),
  oak: plant(3, 3, 2, paintOak, 5, OAK_FOOT),
  dead_tree: plant(3, 3, 2, paintDeadTree, 2, DEAD_FOOT, false),
  bush: plant(1, 1, 0, paintBush, 5, null, false),
  tall_grass: plant(1, 1, 0, paintTallGrass, 3, null),
  flowers: plant(1, 1, 0, paintFlowers, 4, null),
  lavender: plant(1, 1, 0, paintLavender, 2, null),
  sunflowers: plant(1, 2, 1, paintSunflowers, 2, null),
  rock: prop(1, 1, A.paintRock, { variants: 3 }),
  reeds: plant(1, 1, 0, paintReeds, 2, null),
  // Blé (décision n°49) : 1×2, les épis montent dans la case du dessus ; ondule au vent.
  wheat: plant(1, 2, 0, paintWheat, WHEAT_VARIANTS, null),
  // Bâtiments (tools/world/buildings.ts, décision n°44).
  house_thatch: building(3, 4, 1, paintCottage, { variants: 2, chimney: { x: 32, y: 0 } }),
  house_tile: building(3, 5, 2, paintTownHouse, { chimney: { x: 33, y: 3 } }),
  house_slate: building(3, 4, 1, paintSlateHouse, { chimney: { x: 9, y: 0 } }),
  house_wood: building(3, 4, 1, paintLogHouse, { chimney: { x: 33, y: 0 } }),
  house_stone: building(3, 4, 1, paintStoneHouse, { chimney: { x: 10, y: 0 } }),
  hut: building(2, 4, 1, paintHut, { variants: 2, chimney: { x: 19, y: 1 } }),
  inn: building(5, 5, 2, paintInn, { chimney: { x: 68, y: 0 } }),
  forge: building(4, 4, 1, paintForge, { chimney: { x: 10, y: 0 } }),
  temple: building(4, 5, 2, paintTemple),
  mill: { ...building(4, 5, 3, paintMill, { cols: [1, 2], blockRows: [2, 3] }), frameMs: MILL_MS },
  guard_tower: building(2, 5, 3, paintGuardTower, { variants: 2 }),
  // Petits décors et accessoires (tools/world/accessories.ts, décision n°46).
  tent: prop(2, 2, A.paintTent, { variants: 2, canopy: 1, block: 'bottom' }),
  campfire: prop(1, 1, A.paintCampfire, { frameMs: A.FIRE_MS }),
  wall_h: prop(1, 1, A.paintWallH, { variants: 2 }),
  wall_v: prop(1, 1, A.paintWallV),
  tower: prop(2, 2, A.paintTower),
  ruined_tower: prop(2, 4, A.paintRuinedTower, { canopy: 2, shadowRows: 1, block: ['0,2', '1,2'] }),
  palisade: prop(1, 1, A.paintPalisade, { variants: 2 }),
  fence: prop(1, 1, A.paintFence, { variants: 2 }),
  well: prop(1, 2, A.paintWell, { canopy: 1, block: 'bottom' }),
  barrel: prop(1, 1, A.paintBarrel, { variants: 2 }),
  crate: prop(1, 1, A.paintCrate, { variants: 2 }),
  sacks: prop(1, 1, A.paintSacks, { variants: 2 }),
  hay: prop(1, 1, A.paintHay),
  planter: prop(1, 1, A.paintPlanter, { variants: 3 }),
  tools: prop(1, 1, A.paintTools),
  woodpile: prop(2, 1, A.paintWoodpile),
  bench: prop(2, 1, A.paintBench),
  cart: prop(2, 2, A.paintCart, { canopy: 1, block: 'bottom' }),
  lamp_post: prop(1, 2, A.paintLampPost, { canopy: 1, block: 'bottom' }),
  laundry: prop(3, 2, A.paintLaundry, { variants: 2, canopy: 1, block: ['0,1', '2,1'], frameMs: WIND_MS }),
  stall: prop(2, 2, A.paintStall, { variants: 3, canopy: 1, block: 'bottom' }),
  sign: prop(1, 1, (px) => A.paintSign(px), { block: 'none' }),
  board: prop(2, 2, A.paintBoard, { canopy: 1, block: ['0,1', '1,1'] }),
  pots: prop(1, 1, A.paintPots),
  nets: prop(1, 1, A.paintNets),
  pebbles: prop(1, 1, A.paintPebbles, { variants: 3, block: 'none' }),
  stump: prop(1, 1, A.paintStump, { variants: 2 }),
  log: prop(2, 1, A.paintLog),
  mushrooms: prop(1, 1, A.paintMushrooms, { variants: 2, block: 'none' }),
  altar: prop(1, 1, A.paintAltar),
  menhir: prop(1, 2, A.paintMenhir, { canopy: 1, block: 'bottom' }),
  pillar: prop(1, 2, A.paintPillar, { variants: 2, canopy: 1, block: 'bottom' }),
  ruin_wall: prop(1, 1, A.paintRuinWall, { variants: 3 }),
  cliff: prop(1, 1, A.paintCliff, { variants: 3 }),
  cairn: prop(1, 1, A.paintCairn),
  boat: prop(2, 1, A.paintBoat),
  wreck: prop(2, 2, A.paintWreck, { block: 'bottom' }),
  cauldron: prop(1, 1, A.paintCauldron),
  banner: prop(1, 2, A.paintBanner, { variants: 2, canopy: 1, block: 'bottom', frameMs: WIND_MS }),
};

export type StampName = keyof typeof STAMP_DEFS;

const cache = new Map<string, Stamp>();

export function getStamp(name: string, variant = 0): Stamp {
  const def = STAMP_DEFS[name];
  if (!def) throw new Error(`Tampon inconnu : ${name}`);
  const v = ((variant % def.variants) + def.variants) % def.variants;
  const key = `${name}:${v}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const frames: Px[] = [];
  let lights: StampLight[] = [];
  let doors: StampDoor[] = [];
  for (let f = 0; f < Math.max(1, def.frameMs?.length ?? 0); f++) {
    const fpx = new Px(def.w * T, def.h * T);
    let found: StampLight[] = [];
    const foundDoors = captureDoors(() => {
      found = captureLights(() => def.paint(fpx, mulberry32(hashString(`stamp:${key}`)), v, f));
    });
    if (f === 0) {
      lights = found;
      doors = foundDoors;
    }
    frames.push(fpx);
  }
  const px = frames[0] as Px;
  const blocked: boolean[] = [];
  for (let y = 0; y < def.h; y++) {
    for (let x = 0; x < def.w; x++) {
      let b = false;
      if (def.block === 'all') b = y < def.h - (def.shadowRows ?? 0);
      else if (def.block === 'bottom') b = y === def.h - 1;
      else if (def.block !== 'none') b = def.block.includes(`${x},${y}`);
      blocked.push(b);
    }
  }
  const stamp: Stamp = { name, variant: v, w: def.w, h: def.h, px, blocked, canopyRows: def.canopyRows, shadowRows: def.shadowRows ?? 0, chimney: def.chimney ?? null, building: def.building ?? false, frames, frameMs: frames.length > 1 ? (def.frameMs ?? []) : [], foot: def.foot ?? { x: 0, y: def.h - 1 }, overlap: def.overlap ?? false, lights, doors };
  cache.set(key, stamp);
  return stamp;
}

export const variantCount = (name: string): number => (STAMP_DEFS[name] as Def).variants;
