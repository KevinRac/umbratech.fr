/**
 * Écran de combat rapproché (jalon M8, GDD §11, décisions n°204 à n°222) :
 * logique pure, sans Phaser ni DOM.
 *
 * - `planSegments` : découpe les événements d'une commande en morceaux joués
 *   sur la carte ou dans l'écran rapproché (un échange, et les chutes qui le suivent).
 * - `strikeSteps` / `exchangeDuration` : chronologie d'un coup et d'un échange
 *   (GDD §11.2 pour la mêlée, §11.3 pour le critique), réglée dans
 *   `balance.json › closeup` ; elle sert au rendu et au critère « vitesse acceptable ».
 * - `attackKind`, `projectileFor`, `backdropFor` : ce que l'écran montre,
 *   d'après l'arme, la distance, le terrain et la zone (`battleAnims.json`).
 */
import type { BackdropId, BattleAnimsFile, CloseupTimings, ProjectileId } from '../../data/schemas';
import type { BattleEvent, Strike } from '../tactics/types';

/* ---------- Ce que l'écran montre ---------- */

/** Geste d'un coup : mêlée (dash), distance (projectile d'arme), magie (cercle runique et projectile). */
export type AttackKind = 'melee' | 'ranged' | 'magic';

interface WeaponLike {
  readonly type: string;
  readonly damage: 'physique' | 'magique';
}

/** Une arme magique lance un sort ; une arme physique frappe au contact à 1 case, tire ou lance au-delà. */
export function attackKind(weapon: WeaponLike, distance: number): AttackKind {
  if (weapon.damage === 'magique') return 'magic';
  return distance > 1 ? 'ranged' : 'melee';
}

/** Projectile d'un coup à distance ou d'un sort (null pour la mêlée). */
export function projectileFor(weapon: WeaponLike, kind: AttackKind, anims: BattleAnimsFile): ProjectileId | null {
  if (kind === 'melee') return null;
  if (kind === 'magic') return anims.projectiles.byWeaponType[weapon.type] === 'fiole' ? 'fiole' : anims.projectiles.magic;
  return anims.projectiles.byWeaponType[weapon.type] ?? anims.projectiles.physical;
}

/** Fond de l'écran : celui de la zone s'il en impose un, sinon celui du terrain du défenseur (n°208). */
export function backdropFor(terrainId: string, zoneId: string, anims: BattleAnimsFile): BackdropId {
  return anims.backdrops.zones[zoneId] ?? anims.backdrops.terrains[terrainId] ?? anims.backdrops.default;
}

/* ---------- Chronologie ---------- */

export type StepName = 'dark' | 'prep' | 'dash' | 'draw' | 'rune' | 'fly' | 'strike' | 'cut' | 'impact' | 'recoil' | 'pose' | 'back' | 'settle';

/** Une étape d'un coup : début (ms depuis le début du coup) et durée, à la vitesse « Normales ». */
export interface Step {
  readonly name: StepName;
  readonly at: number;
  readonly ms: number;
}

export interface StrikeShape {
  readonly kind: AttackKind;
  readonly crit: boolean;
  readonly hit: boolean;
  /** Deuxième coup de la même unité (double attaque) : pas de préparation. */
  readonly repeat: boolean;
}

/**
 * Étapes d'un coup (GDD §11.2) : préparation, approche (dash, arme levée ou
 * cercle runique), vol du projectile, frappe, impact, recul, pose, retour.
 * Critique (§11.3) : écran assombri d'abord, plusieurs coupes au lieu de la
 * frappe (mêlée) ou un projectile plus appuyé, pose tenue plus longtemps.
 * Un coup raté garde la même chronologie (l'impact devient l'esquive).
 */
export function strikeSteps(shape: StrikeShape, t: CloseupTimings): Step[] {
  const out: Step[] = [];
  let at = 0;
  const push = (name: StepName, ms: number): void => {
    out.push({ name, at, ms });
    at += ms;
  };
  if (shape.crit && shape.hit) push('dark', t.critDark);
  if (!shape.repeat) push('prep', t.prep);
  if (shape.kind === 'melee') {
    push('dash', t.dash);
    if (shape.crit && shape.hit) for (let i = 0; i < t.critCuts; i++) push('cut', t.critCut);
    else push('strike', t.strike);
  } else {
    push(shape.kind === 'magic' ? 'rune' : 'draw', shape.kind === 'magic' ? t.rune : t.draw);
    push('fly', t.fly);
  }
  push('impact', t.impact);
  push('recoil', t.recoil);
  push('pose', shape.crit && shape.hit ? t.critPose : t.pose);
  push(shape.kind === 'melee' ? 'back' : 'settle', shape.kind === 'melee' ? t.back : t.settle);
  return out;
}

/** Durée d'un coup (ms, à la vitesse « Normales »). */
export function strikeDuration(shape: StrikeShape, t: CloseupTimings): number {
  const steps = strikeSteps(shape, t);
  const last = steps[steps.length - 1];
  return last ? last.at + last.ms : 0;
}

/**
 * Forme des coups d'un échange : chaque coup prend le geste de son auteur ;
 * le second coup d'une même unité (double attaque) est un coup répété.
 */
export function exchangeShapes(strikes: readonly Strike[], kindOf: (unitId: string) => AttackKind): StrikeShape[] {
  const struck = new Set<string>();
  return strikes.map((s) => {
    const repeat = struck.has(s.attackerId);
    struck.add(s.attackerId);
    return { kind: kindOf(s.attackerId), crit: s.crit, hit: s.hit, repeat };
  });
}

/**
 * Durée d'un échange dans l'écran rapproché, transitions comprises (n°209) :
 * entrée, coups séparés par `between`, sortie ; `factor` = vitesse
 * (1 « Normales », 0,5 « Rapides », ×0,5 de plus avec Maj maintenue).
 */
export function exchangeDuration(shapes: readonly StrikeShape[], t: CloseupTimings, factor = 1): number {
  if (shapes.length === 0) return 0;
  const strikes = shapes.reduce((n, s) => n + strikeDuration(s, t), 0);
  return Math.round((t.entry + strikes + t.between * (shapes.length - 1) + t.exit) * factor);
}

/** Étape en cours à l'instant `ms` d'un coup (la dernière une fois le coup fini). */
export function stepAt(steps: readonly Step[], ms: number): Step | null {
  let current: Step | null = null;
  for (const s of steps) if (ms >= s.at) current = s;
  return current;
}

/**
 * Image d'une animation peinte à l'instant `ms` du coup : les images avant
 * l'impact se répartissent de la préparation jusqu'à la frappe, l'image
 * d'impact tombe au début de la frappe (ou de la première coupe), les
 * suivantes se répartissent sur le recul et la pose ; le retour reste sur la dernière.
 */
export function frameAt(steps: readonly Step[], ms: number, frames: number, impact: number): number {
  if (frames <= 1) return 0;
  const hitStep = steps.find((s) => s.name === 'strike' || s.name === 'cut' || s.name === 'impact');
  const start = steps.find((s) => s.name === 'prep' || s.name === 'dash' || s.name === 'draw' || s.name === 'rune');
  const pose = steps.find((s) => s.name === 'pose');
  if (!hitStep || !start || !pose) return 0;
  const i = Math.max(0, Math.min(frames - 1, impact));
  if (ms < hitStep.at) {
    if (i === 0) return 0;
    const span = Math.max(1, hitStep.at - start.at);
    return Math.max(0, Math.min(i - 1, Math.floor(((ms - start.at) / span) * i)));
  }
  const after = frames - 1 - i;
  const end = pose.at + pose.ms;
  if (after <= 0 || ms >= end) return frames - 1;
  const span = Math.max(1, end - hitStep.at);
  return Math.min(frames - 1, i + Math.floor(((ms - hitStep.at) / span) * (after + 1)));
}

/* ---------- Découpage des événements ---------- */

export type CombatEvent = Extract<BattleEvent, { type: 'combat' }>;

export type Segment =
  | { readonly kind: 'event'; readonly event: BattleEvent }
  /** Un échange dans l'écran rapproché, et la chute (KO) des unités de l'échange qui la suit aussitôt. */
  | { readonly kind: 'closeup'; readonly combat: CombatEvent; readonly falls: readonly string[] };

/**
 * Découpe les événements d'une commande (n°205) : un échange que `inCloseup`
 * accepte (pas une compétence de zone) ouvre l'écran rapproché ; les KO des
 * deux unités de l'échange qui le suivent directement s'y jouent aussi.
 * Une citation de mort entre l'échange et la chute garde son ordre : l'écran
 * se ferme avant elle et la chute se joue sur la carte (cut-ins : lot 6).
 */
export function planSegments(events: readonly BattleEvent[], inCloseup: (combat: CombatEvent) => boolean): Segment[] {
  const out: Segment[] = [];
  for (let i = 0; i < events.length; i++) {
    const event = events[i] as BattleEvent;
    if (event.type !== 'combat' || !inCloseup(event)) {
      out.push({ kind: 'event', event });
      continue;
    }
    const pair = new Set([event.attackerId, event.defenderId]);
    const falls: string[] = [];
    while (i + 1 < events.length) {
      const next = events[i + 1] as BattleEvent;
      if (next.type !== 'ko' || !pair.has(next.unitId) || falls.includes(next.unitId)) break;
      falls.push(next.unitId);
      i++;
    }
    out.push({ kind: 'closeup', combat: event, falls });
  }
  return out;
}
