/**
 * Schéma des sauvegardes, version courante (GDD §14, décisions n°151 à n°158).
 *
 * Les objets sont stricts : une clé inconnue est une erreur. Ainsi, un champ
 * ajouté à `Progress` ou à `WorldState` sans être déclaré ici fait échouer le
 * test d'aller-retour, au lieu d'être perdu en silence au chargement.
 * Chaque changement de ce schéma demande une nouvelle version et une
 * migration (`migrations.ts`). Module pur.
 */
import { z } from 'zod';
import { STAT_KEYS } from '../../data/schemas';
import { GAME_MODES } from '../game/progress';
import { OATH_KINDS } from '../progression/traits';

/** Version courante du format (n°158). */
export const SAVE_VERSION = 1;

/** Marque du jeu dans l'enveloppe : un fichier d'un autre jeu est refusé net. */
export const SAVE_GAME = 'vaelmor';

const id = z.string().min(1).max(80);
const count = z.number().int().min(0);
const ms = z.number().finite().min(0);

const statBlock = z.strictObject(Object.fromEntries(STAT_KEYS.map((k) => [k, z.number().int()])) as Record<(typeof STAT_KEYS)[number], z.ZodNumber>);

const member = z.strictObject({
  id,
  name: z.string().min(1).max(60),
  class: id,
  hero: z.boolean(),
  level: z.number().int().min(1).max(99),
  xp: z.number().int().min(0).max(99),
  stats: statBlock,
  levelCap: z.number().int().min(1).max(99),
  woundedDay: z.number().int().nullable(),
  passive: id.nullable(),
  oath: z.enum(OATH_KINDS).nullable(),
  evolution: id.nullable(),
  counters: z.record(z.string(), z.number().finite()),
});

const itemStack = z.strictObject({ item: id, qty: z.number().int().min(1) });

const progress = z.strictObject({
  gold: count,
  inventory: z.array(itemStack),
  reputation: z.record(z.string(), z.number().int().min(-100).max(100)),
  touched: z.array(z.string()),
  day: z.number().int().min(1),
  donated: z.record(z.string(), z.strictObject({ day: z.number().int(), total: count })),
  quests: z.record(z.string(), z.enum(['active', 'done'])),
  recruited: z.array(z.string()),
  rewarded: z.array(z.string()),
  heard: z.array(z.string()),
  foes: z.record(z.string(), z.strictObject({ day: z.number().int(), clock: ms, visits: count })),
  clock: ms,
  zoneVisits: count,
  lastVillage: z.string().nullable(),
  wounded: z.record(z.string(), z.number().int()).optional(),
  company: z.array(member).min(1),
  errants: z.record(z.string(), z.strictObject({ level: z.number().int().min(1), xp: z.number().int().min(0) })),
  bought: z.record(z.string(), count).optional(),
  mode: z.enum(GAME_MODES),
  fallen: z.array(z.string()),
});

const world = z.strictObject({
  player: z.strictObject({ x: z.number().finite(), y: z.number().finite(), facing: z.enum(['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw']) }),
  openFlags: z.array(z.string()),
  discoveredZones: z.array(z.string()),
  discoveredLocations: z.array(z.string()),
  progress,
  gameId: z.string().min(1).max(64),
  playMs: ms,
});

const loadout = z.strictObject({ weapon: id.nullable(), accessory: id.nullable(), items: z.array(itemStack) });

/** Ce que `core/session.ts` garde entre deux combats (n°154). */
const session = z.strictObject({
  loadouts: z.record(z.string(), loadout),
  lastDeployed: z.array(z.string()).nullable(),
});

export const saveDataSchema = z.strictObject({ world, session });

/** Résumé affiché dans la liste des emplacements (n°162). */
export const saveMetaSchema = z.strictObject({
  heroName: z.string().max(60),
  heroClass: z.string().max(80),
  evolution: z.string().max(80).nullable(),
  heroLevel: z.number().int().min(1),
  place: z.string().max(80),
  gold: count,
  playMs: ms,
  mode: z.enum(GAME_MODES),
  companySize: count,
});

export const saveEnvelopeSchema = z.strictObject({
  game: z.literal(SAVE_GAME),
  saveVersion: z.literal(SAVE_VERSION),
  savedAt: z.iso.datetime(),
  meta: saveMetaSchema,
  data: saveDataSchema,
  checksum: z.string().regex(/^[0-9a-f]{8}$/),
});

export type SaveData = z.infer<typeof saveDataSchema>;
export type SaveMeta = z.infer<typeof saveMetaSchema>;
export type SaveEnvelope = z.infer<typeof saveEnvelopeSchema>;
export type SessionSave = SaveData['session'];
