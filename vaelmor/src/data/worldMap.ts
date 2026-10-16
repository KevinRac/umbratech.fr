/**
 * Carte du monde : lecture et validation d'un fichier au format Tiled (JSON).
 *
 * Le fichier `assets/maps/world.json` est un export Tiled standard, éditable
 * dans Tiled. Les couches sont lues ainsi (GDD §4.4, §16.3) :
 *
 * | Couche      | Type     | Contenu                                                        |
 * |-------------|----------|----------------------------------------------------------------|
 * | `ground`    | tuiles   | Sol visible. Chaque tuile porte une propriété `terrain`.       |
 * | `decor`     | tuiles   | Décors dessinés SOUS le héros (troncs, murs, rochers).         |
 * | `canopy`    | tuiles   | Décors dessinés SUR le héros (cimes d'arbres).                 |
 * | `collision` | tuiles   | Valeur brute 0 libre · 1 bloqué · 2 eau · 3 lent · 4 passage.  |
 * | `zones`     | tuiles   | Valeur brute = `value` d'une zone de `zones.json` (0 = aucune).|
 * | `locations` | objets   | Villages, camps, donjons, autels (rectangles).                 |
 * | `gates`     | objets   | Passages verrouillés (rectangles, propriété `flag`).           |
 * | `spawns`    | objets   | Points de départ et de téléportation (points).                 |
 *
 * Les couches `collision` et `zones` contiennent des valeurs brutes (pas des
 * identifiants de tuile) : elles sont invisibles dans Tiled.
 *
 * Module pur : ni DOM ni Phaser.
 */
import { z } from 'zod';
import type { TerrainDef, ZoneDef } from './schemas';

/** Valeurs de la couche `collision` (GDD §4.4). */
export const COLLISION = { free: 0, blocked: 1, water: 2, slow: 3, gate: 4 } as const;
export type CollisionValue = (typeof COLLISION)[keyof typeof COLLISION];

export const LOCATION_KINDS = ['village', 'ville', 'camp', 'donjon', 'poi', 'autel'] as const;
export type LocationKind = (typeof LOCATION_KINDS)[number];

export const SPAWN_KINDS = ['start', 'altar', 'lair', 'poi'] as const;
export type SpawnKind = (typeof SPAWN_KINDS)[number];

export const WORLD_LAYERS = {
  ground: 'ground',
  decor: 'decor',
  canopy: 'canopy',
  collision: 'collision',
  zones: 'zones',
  locations: 'locations',
  gates: 'gates',
  spawns: 'spawns',
} as const;

/* ---------- Schéma du sous-ensemble de Tiled lu par le jeu ---------- */

const propertySchema = z.looseObject({
  name: z.string(),
  type: z.string().optional(),
  value: z.union([z.string(), z.number(), z.boolean()]),
});

const tilesetSchema = z.looseObject({
  firstgid: z.number().int().min(1),
  name: z.string(),
  image: z.string(),
  imagewidth: z.number().int().positive(),
  imageheight: z.number().int().positive(),
  tilewidth: z.number().int().positive(),
  tileheight: z.number().int().positive(),
  columns: z.number().int().positive(),
  tilecount: z.number().int().positive(),
  tiles: z.array(z.looseObject({ id: z.number().int().min(0), properties: z.array(propertySchema).optional() })).optional(),
});

const objectSchema = z.looseObject({
  id: z.number().int(),
  name: z.string(),
  type: z.string().optional(),
  x: z.number(),
  y: z.number(),
  width: z.number().optional(),
  height: z.number().optional(),
  properties: z.array(propertySchema).optional(),
});

const layerSchema = z.looseObject({
  name: z.string(),
  type: z.enum(['tilelayer', 'objectgroup']),
  data: z.array(z.number().int().min(0)).optional(),
  objects: z.array(objectSchema).optional(),
});

export const tiledMapSchema = z.looseObject({
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  tilewidth: z.number().int().positive(),
  tileheight: z.number().int().positive(),
  orientation: z.literal('orthogonal'),
  infinite: z.boolean().optional(),
  tilesets: z.array(tilesetSchema).length(1, 'la carte du monde utilise un seul tileset'),
  layers: z.array(layerSchema),
});

/* ---------- Carte lue ---------- */

export type MapProps = Readonly<Record<string, string | number | boolean>>;

export interface MapObject {
  readonly id: number;
  readonly name: string;
  /** Champ `type` de Tiled : genre du lieu ou du point d'apparition. */
  readonly kind: string;
  /** Rectangle en pixels (largeur et hauteur nulles pour un point). */
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly props: MapProps;
}

export interface WorldMap {
  readonly width: number;
  readonly height: number;
  readonly tileSize: number;
  readonly ground: Uint16Array;
  readonly decor: Uint16Array;
  readonly canopy: Uint16Array;
  readonly collision: Uint8Array;
  readonly zones: Uint8Array;
  /** Terrain (`terrains.json`) de chaque identifiant de tuile de sol. */
  readonly terrainByGid: ReadonlyMap<number, string>;
  readonly locations: readonly MapObject[];
  readonly gates: readonly MapObject[];
  readonly spawns: readonly MapObject[];
  /** Pour chaque case de passage (collision 4) : drapeau qui l'ouvre. */
  readonly gateFlagByCell: ReadonlyMap<number, string>;
}

export type WorldMapResult = { readonly ok: true; readonly map: WorldMap; readonly issues: readonly [] } | { readonly ok: false; readonly issues: readonly string[] };

export interface WorldMapContext {
  readonly zones: readonly ZoneDef[];
  readonly terrains: readonly TerrainDef[];
  /** Taille de tuile attendue (`balance.json`). */
  readonly tileSize: number;
}

const ID_PATTERN = /^[a-z][a-z0-9_]*$/;

function toProps(list: readonly { name: string; value: string | number | boolean }[] | undefined): MapProps {
  return Object.fromEntries((list ?? []).map((p) => [p.name, p.value]));
}

function toObject(o: z.infer<typeof objectSchema>): MapObject {
  return { id: o.id, name: o.name, kind: o.type ?? '', x: o.x, y: o.y, width: o.width ?? 0, height: o.height ?? 0, props: toProps(o.properties) };
}

/** Numéro de case (ligne par ligne) : clé commune de toutes les recherches par case. */
export const cellIndex = (map: { readonly width: number }, tx: number, ty: number): number => ty * map.width + tx;

/** Valide un export Tiled et le convertit en grilles typées. Ne lève jamais. */
export function parseWorldMap(raw: unknown, context: WorldMapContext): WorldMapResult {
  const parsed = tiledMapSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, issues: parsed.error.issues.map((i) => `world.json › ${i.path.join('.') || '(racine)'} : ${i.message}`) };
  }
  const tiled = parsed.data;
  const issues: string[] = [];
  const { width, height } = tiled;
  const cells = width * height;
  const tileset = tiled.tilesets[0];
  if (!tileset) return { ok: false, issues: ['world.json › tileset manquant'] };

  if (tiled.tilewidth !== context.tileSize || tiled.tileheight !== context.tileSize) {
    issues.push(`world.json › tuiles de ${tiled.tilewidth}×${tiled.tileheight} px, ${context.tileSize}×${context.tileSize} attendus`);
  }
  if (tileset.tilewidth !== context.tileSize || tileset.tileheight !== context.tileSize) {
    issues.push(`world.json › tileset « ${tileset.name} » : tuiles de ${tileset.tilewidth}×${tileset.tileheight} px, ${context.tileSize} attendus`);
  }
  if (tiled.infinite === true) issues.push('world.json › les cartes infinies ne sont pas prises en charge');

  // Couches
  const byName = new Map(tiled.layers.map((l) => [l.name, l]));
  const tileLayer = (name: string): number[] => {
    const layer = byName.get(name);
    if (!layer || layer.type !== 'tilelayer' || !layer.data) {
      issues.push(`world.json › couche de tuiles « ${name} » absente`);
      return [];
    }
    if (layer.data.length !== cells) {
      issues.push(`world.json › couche « ${name} » : ${layer.data.length} cases, ${cells} attendues (${width}×${height})`);
      return [];
    }
    return layer.data;
  };
  const objectLayer = (name: string): MapObject[] => {
    const layer = byName.get(name);
    if (!layer || layer.type !== 'objectgroup') {
      issues.push(`world.json › couche d'objets « ${name} » absente`);
      return [];
    }
    return (layer.objects ?? []).map(toObject);
  };

  const ground = tileLayer(WORLD_LAYERS.ground);
  const decor = tileLayer(WORLD_LAYERS.decor);
  const canopy = tileLayer(WORLD_LAYERS.canopy);
  const collision = tileLayer(WORLD_LAYERS.collision);
  const zones = tileLayer(WORLD_LAYERS.zones);
  const locations = objectLayer(WORLD_LAYERS.locations);
  const gates = objectLayer(WORLD_LAYERS.gates);
  const spawns = objectLayer(WORLD_LAYERS.spawns);
  if (issues.length > 0) return { ok: false, issues };

  // Identifiants de tuiles : bornés par le tileset
  const maxGid = tileset.firstgid + tileset.tilecount - 1;
  for (const [name, data] of [[WORLD_LAYERS.ground, ground], [WORLD_LAYERS.decor, decor], [WORLD_LAYERS.canopy, canopy]] as const) {
    const bad = data.findIndex((gid) => gid > maxGid);
    if (bad >= 0) issues.push(`world.json › couche « ${name} » : tuile ${data[bad]} inexistante (case ${bad % width},${Math.floor(bad / width)}) ; le tileset en compte ${tileset.tilecount}`);
  }

  // Terrain de chaque tuile de sol
  const terrainIds = new Set(context.terrains.map((t) => t.id));
  const terrainByGid = new Map<number, string>();
  for (const tile of tileset.tiles ?? []) {
    const terrain = toProps(tile.properties)['terrain'];
    if (terrain === undefined) continue;
    if (typeof terrain !== 'string' || !terrainIds.has(terrain)) {
      issues.push(`world.json › tuile ${tile.id} : terrain « ${String(terrain)} » inconnu (voir terrains.json)`);
      continue;
    }
    terrainByGid.set(tileset.firstgid + tile.id, terrain);
  }
  const noTerrain = ground.findIndex((gid) => !terrainByGid.has(gid));
  if (noTerrain >= 0) {
    issues.push(`world.json › couche « ground » : la tuile ${ground[noTerrain]} (case ${noTerrain % width},${Math.floor(noTerrain / width)}) n'a pas de propriété « terrain »`);
  }

  // Collision et zones
  const zoneValues = new Set(context.zones.map((z) => z.value));
  const badCollision = collision.findIndex((v) => v > COLLISION.gate);
  if (badCollision >= 0) issues.push(`world.json › couche « collision » : valeur ${collision[badCollision]} invalide (0 à 4)`);
  const badZone = zones.findIndex((v) => v !== 0 && !zoneValues.has(v));
  if (badZone >= 0) issues.push(`world.json › couche « zones » : valeur ${zones[badZone]} absente de zones.json (case ${badZone % width},${Math.floor(badZone / width)})`);

  // Objets
  const checkObjects = (layer: string, list: readonly MapObject[], needsRect: boolean): void => {
    const seen = new Set<string>();
    for (const o of list) {
      const id = o.props['id'];
      if (typeof id !== 'string' || !ID_PATTERN.test(id)) {
        issues.push(`world.json › ${layer} › « ${o.name} » : propriété « id » manquante ou mal formée (snake_case ASCII)`);
        continue;
      }
      if (seen.has(id)) issues.push(`world.json › ${layer} › identifiant « ${id} » en double`);
      seen.add(id);
      const inside = o.x >= 0 && o.y >= 0 && o.x + o.width <= width * context.tileSize && o.y + o.height <= height * context.tileSize;
      if (!inside) issues.push(`world.json › ${layer} › « ${id} » sort de la carte`);
      if (needsRect && (o.width <= 0 || o.height <= 0)) issues.push(`world.json › ${layer} › « ${id} » doit être un rectangle`);
    }
  };
  checkObjects('locations', locations, true);
  checkObjects('gates', gates, true);
  checkObjects('spawns', spawns, false);
  for (const o of locations) {
    if (!(LOCATION_KINDS as readonly string[]).includes(o.kind)) issues.push(`world.json › locations › « ${String(o.props['id'])} » : genre « ${o.kind} » inconnu`);
  }
  for (const o of spawns) {
    if (!(SPAWN_KINDS as readonly string[]).includes(o.kind)) issues.push(`world.json › spawns › « ${String(o.props['id'])} » : genre « ${o.kind} » inconnu`);
  }
  if (!spawns.some((o) => o.kind === 'start')) issues.push('world.json › spawns › aucun point « start » (départ de la nouvelle partie)');

  // Passages : drapeau connu, cases de collision 4 couvertes par un passage
  const flags = new Set(context.zones.flatMap((z) => (z.unlockFlag === null ? [] : [z.unlockFlag])));
  const gateFlagByCell = new Map<number, string>();
  const tile = context.tileSize;
  for (const gate of gates) {
    const flag = gate.props['flag'];
    if (typeof flag !== 'string' || !flags.has(flag)) {
      issues.push(`world.json › gates › « ${String(gate.props['id'])} » : drapeau « ${String(flag)} » inconnu (voir unlockFlag dans zones.json)`);
      continue;
    }
    const x0 = Math.floor(gate.x / tile);
    const y0 = Math.floor(gate.y / tile);
    const x1 = Math.ceil((gate.x + gate.width) / tile);
    const y1 = Math.ceil((gate.y + gate.height) / tile);
    let covered = 0;
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        if (collision[y * width + x] === COLLISION.gate) {
          gateFlagByCell.set(y * width + x, flag);
          covered++;
        }
      }
    }
    if (covered === 0) issues.push(`world.json › gates › « ${String(gate.props['id'])} » ne couvre aucune case de collision 4`);
  }
  collision.forEach((value, i) => {
    if (value === COLLISION.gate && !gateFlagByCell.has(i)) {
      issues.push(`world.json › collision › case ${i % width},${Math.floor(i / width)} de valeur 4 hors de tout objet de la couche « gates »`);
    }
  });

  if (issues.length > 0) return { ok: false, issues: issues.slice(0, 40) };

  return {
    ok: true,
    issues: [],
    map: {
      width,
      height,
      tileSize: context.tileSize,
      ground: Uint16Array.from(ground),
      decor: Uint16Array.from(decor),
      canopy: Uint16Array.from(canopy),
      collision: Uint8Array.from(collision),
      zones: Uint8Array.from(zones),
      terrainByGid,
      locations,
      gates,
      spawns,
      gateFlagByCell,
    },
  };
}

/** Lève une erreur lisible si la carte est invalide (chargement du jeu). */
export class WorldMapError extends Error {
  constructor(readonly issues: readonly string[]) {
    super(`Carte du monde invalide (${issues.length} problème(s)) :\n- ${issues.join('\n- ')}`);
    this.name = 'WorldMapError';
  }
}

export function loadWorldMap(raw: unknown, context: WorldMapContext): WorldMap {
  const result = parseWorldMap(raw, context);
  if (!result.ok) throw new WorldMapError(result.issues);
  return result.map;
}
