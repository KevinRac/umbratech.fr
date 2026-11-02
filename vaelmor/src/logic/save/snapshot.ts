/**
 * Instantané de la partie et restauration (décisions n°152 à n°155).
 *
 * L'instantané est une copie profonde : la partie en cours peut continuer de
 * changer sans toucher à ce qui a été écrit. Ne sont pas sauvés : la position
 * des ennemis, PNJ et errants (ils reprennent leur poste), les réglages (clé
 * `vaelmor:settings`) et le niveau d'essai du debug (`testLevel`). Module pur.
 */
import type { GameData } from '../../data/validate';
import type { Loadout } from '../tactics/units';
import type { WorldState } from '../world/worldState';
import type { SaveData, SaveEnvelope, SaveMeta, SessionSave } from './schema';

/** Ce que `core/session.ts` garde entre deux combats, indexé par membre (n°154). */
export interface SessionState {
  loadouts: Record<string, Loadout>;
  lastDeployed: string[] | null;
}

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

/** Copie sauvegardable de la partie. */
export function snapshotGame(world: WorldState, session: SessionState): SaveData {
  const { testLevel: _debugOnly, ...kept } = world;
  const members = new Set(world.progress.company.map((m) => m.id));
  const loadouts: Record<string, Loadout> = {};
  for (const [id, l] of Object.entries(session.loadouts)) if (members.has(id)) loadouts[id] = clone(l);
  return {
    world: clone(kept),
    session: { loadouts, lastDeployed: session.lastDeployed ? session.lastDeployed.filter((id) => members.has(id)) : null },
  };
}

/** État de jeu reconstruit depuis une sauvegarde (copie : la sauvegarde reste intacte). */
export function restoreGame(save: SaveData): { world: WorldState; session: SessionState } {
  const data = clone(save);
  return { world: data.world, session: data.session as SessionSave & SessionState };
}

/** Résumé de la partie pour la liste des emplacements (n°162). `place` : lieu ou zone, déjà en toutes lettres. */
export function summarize(world: WorldState, game: GameData, place: string): SaveMeta {
  const p = world.progress;
  const hero = p.company.find((m) => m.hero) ?? p.company[0];
  const cls = hero ? game.classes.find((c) => c.id === hero.class) : undefined;
  const evolution = hero?.evolution ? (cls?.evolutions.find((e) => e.id === hero.evolution)?.name ?? null) : null;
  return {
    heroName: hero?.name ?? '?',
    heroClass: cls?.name ?? hero?.class ?? '?',
    evolution,
    heroLevel: hero?.level ?? 1,
    place,
    gold: p.gold,
    playMs: Math.round(world.playMs),
    mode: p.mode,
    companySize: p.company.length,
  };
}

/** Temps de jeu lisible : « 2 h 14 », « 37 min ». */
export function formatPlayTime(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h} h ${String(m).padStart(2, '0')}` : `${m} min`;
}

/** La plus récente de plusieurs sauvegardes lisibles (« Continuer », n°162). */
export function latestOf<T extends { readonly save: SaveEnvelope }>(entries: readonly T[]): T | null {
  let best: T | null = null;
  for (const e of entries) if (!best || e.save.savedAt > best.save.savedAt) best = e;
  return best;
}
