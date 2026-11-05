/**
 * Quels bruits jouent où (jalon M10, lot D, décisions n°239 et n°240). Module
 * pur : il lit les règles de `sounds.json` et rend une ambiance, une matière de
 * pas ou le son d'une notification ; les scènes jouent ce qu'il rend.
 */
import type { AmbienceSoundId, SoundsFile, StepMaterialId } from '../../data/schemas';
import type { Notice } from '../game';

export interface AmbienceContext {
  readonly zone: string | null;
  readonly place: string | null;
  /** Nombre de cases de chaque terrain autour du héros (`radius` de `sounds.json`). */
  readonly terrains: ReadonlyMap<string, number>;
}

/**
 * Ambiance du monde ouvert : celle du lieu s'il en impose une, sinon celle du
 * terrain qui couvre assez les alentours (le plus présent), sinon celle de la zone.
 */
export function ambienceFor(rules: SoundsFile, ctx: AmbienceContext): AmbienceSoundId | null {
  const a = rules.ambience;
  if (ctx.place && a.places[ctx.place]) return a.places[ctx.place] ?? null;
  let total = 0;
  for (const n of ctx.terrains.values()) total += n;
  if (total > 0) {
    let best: { id: AmbienceSoundId; share: number } | null = null;
    const byAmbience = new Map<AmbienceSoundId, number>();
    for (const [terrain, n] of ctx.terrains) {
      const id = a.terrains[terrain];
      if (id) byAmbience.set(id, (byAmbience.get(id) ?? 0) + n);
    }
    for (const [id, n] of byAmbience) {
      const share = n / total;
      if (share >= a.terrainShare && (!best || share > best.share)) best = { id, share };
    }
    if (best) return best.id;
  }
  return ctx.zone ? (a.zones[ctx.zone] ?? null) : null;
}

/** Matière des pas sur un terrain. */
export function stepMaterial(rules: SoundsFile, terrain: string | null): StepMaterialId {
  return (terrain ? rules.steps.terrains[terrain] : undefined) ?? rules.steps.default;
}

/** Intervalle (ms) entre deux pas. */
export function stepInterval(rules: SoundsFile, sprinting: boolean): number {
  return sprinting ? rules.steps.sprintMs : rules.steps.walkMs;
}

export type NoticeSound = 'quest' | 'repUp' | 'repDown' | 'item' | 'buy' | 'notify';

/**
 * Un seul son pour une série de notifications, la plus marquante : quête
 * terminée ou recrue, puis réputation (la baisse avant la hausse), objet, or,
 * le reste.
 */
export function noticeSound(notices: readonly Notice[]): NoticeSound | null {
  if (notices.length === 0) return null;
  const has = (pred: (n: Notice) => boolean): boolean => notices.some(pred);
  if (has((n) => n.kind === 'recruit' || (n.kind === 'quest' && n.event === 'completed'))) return 'quest';
  if (has((n) => n.kind === 'rep' && n.delta < 0)) return 'repDown';
  if (has((n) => n.kind === 'rep' && n.delta > 0)) return 'repUp';
  if (has((n) => n.kind === 'item' && n.qty > 0)) return 'item';
  if (has((n) => n.kind === 'gold' && n.amount > 0)) return 'buy';
  return 'notify';
}
