/**
 * Alliés verts : qui rejoint un combat (jalon M5, GDD §7.8). Pur : le hasard
 * vient d'un `Rng` (tirages reproductibles avec une graine).
 *
 * - **Gardes de village** (fixes, non aléatoires) : un combat à moins de
 *   `guardRange` cases d'un village (son rectangle) appelle ses gardes : un à
 *   « Amical », deux à partir d'« Allié », aucun en dessous (à « Hostile »,
 *   ce sont eux qui tendent l'embuscade, décision n°65). Ils arrivent au tour 1
 *   (Allié et plus) ou 2 (Amical), depuis le village.
 * - **Allié de passage** (aléatoire) : au lancement du combat, tirage selon le
 *   palier du village de la zone (Neutre 0 %, Amical 10 %, Allié 20 %, Héros
 *   local 35 %) ; un PNJ du village entre au bord de la carte au tour 2 ou 3.
 * - **Allié errant** : s'il marche à moins de `errantJoinRange` cases du
 *   combat, il le rejoint d'office ; sinon, s'il le voit (à moins de
 *   `errantSightRange` cases), il le rejoint une fois sur deux. Un errant blessé
 *   (tombé au combat) ne revient qu'après un repos à l'auberge.
 * Le niveau d'un allié dépend de la zone (milieu des niveaux + écart du modèle).
 */
import type { TierId } from '../../data/townSchemas';
import type { GameData } from '../../data/validate';
import type { Rng } from '../rng';
import type { AllyJoin } from '../tactics/encounter';
import type { Cell } from '../tactics/types';
import type { Progress } from './progress';

export interface VillageArea {
  readonly id: string;
  readonly name: string;
  /** Rectangle du lieu, en cases du monde (bornes incluses). */
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
  /** Zone (valeur de la couche `zones`) au centre du lieu. */
  readonly zone: number;
  readonly tier: TierId;
}

export interface ErrantPosition {
  readonly id: string;
  readonly cell: Cell;
}

export interface AllyPlanInput {
  readonly data: GameData;
  /** Point de contact (cases du monde). */
  readonly site: Cell;
  /** Zone (valeur) au point de contact. */
  readonly zoneValue: number;
  readonly villages: readonly VillageArea[];
  readonly errants: readonly ErrantPosition[];
  readonly rng: Rng;
}

/** Distance (cases) d'une case au rectangle d'un village (0 dedans). */
export function distanceToArea(v: VillageArea, c: Cell): number {
  const dx = c.x < v.x0 ? v.x0 - c.x : c.x > v.x1 ? c.x - v.x1 : 0;
  const dy = c.y < v.y0 ? v.y0 - c.y : c.y > v.y1 ? c.y - v.y1 : 0;
  return Math.max(dx, dy);
}

const center = (v: VillageArea): Cell => ({ x: Math.round((v.x0 + v.x1) / 2), y: Math.round((v.y0 + v.y1) / 2) });

/** Niveau d'un allié : milieu des niveaux de la zone + écart du modèle. */
export function allyLevel(data: GameData, zoneValue: number, template: string): number {
  const zone = data.zones.find((z) => z.value === zoneValue) ?? data.zones[0];
  const offset = data.allyTemplates.find((t) => t.id === template)?.levelOffset ?? 0;
  const mid = zone ? Math.round((zone.levelMin + zone.levelMax) / 2) : 1;
  return Math.max(1, mid + offset);
}

/** Alliés verts qui rejoindront un combat engagé en `site`. */
export function planAllies(input: AllyPlanInput): AllyJoin[] {
  const { data, site, rng } = input;
  const cfg = data.balance.allies;
  const joins: AllyJoin[] = [];

  // Gardes : le village le plus proche à portée, seulement à partir d'« Amical ».
  const near = input.villages.filter((v) => distanceToArea(v, site) <= cfg.guardRange).sort((a, b) => distanceToArea(a, site) - distanceToArea(b, site))[0];
  if (near) {
    const def = data.allyVillages.find((v) => v.location === near.id);
    const count = cfg.guardCount[near.tier];
    if (def && count > 0) {
      for (let i = 0; i < count; i++) {
        const template = def.guards[i % def.guards.length] as string;
        joins.push({ template, level: allyLevel(data, input.zoneValue, template), turn: cfg.guardTurn[near.tier], worldCell: center(near), source: 'garde', errantId: null, label: `Les gardes de ${near.name} accourent !` });
      }
    }
  }

  // Allié de passage : village de la zone le plus proche (tirage selon son palier).
  const home = input.villages.filter((v) => v.zone === input.zoneValue).sort((a, b) => distanceToArea(a, site) - distanceToArea(b, site))[0];
  if (home) {
    const def = data.allyVillages.find((v) => v.location === home.id);
    const chance = cfg.passerChance[home.tier];
    if (def && chance > 0 && rng.chance(chance)) {
      const template = rng.pick(def.passers);
      joins.push({ template, level: allyLevel(data, input.zoneValue, template), turn: rng.pick(cfg.passerTurns), worldCell: null, source: 'passage', errantId: null, label: `Renfort ! Un habitant de ${home.name} vient à l'aide.` });
    }
  }

  // Alliés errants : d'office à portée, une fois sur deux s'ils voient le combat.
  for (const errant of input.errants) {
    const d = Math.max(Math.abs(errant.cell.x - site.x), Math.abs(errant.cell.y - site.y));
    const joinsFight = d <= cfg.errantJoinRange || (d <= cfg.errantSightRange && rng.chance(cfg.errantSightChance));
    if (!joinsFight) continue;
    const def = data.wanderers.find((w) => w.id === errant.id);
    if (!def) continue;
    joins.push({ template: def.template, level: allyLevel(data, input.zoneValue, def.template), turn: cfg.errantTurn, worldCell: errant.cell, source: 'errant', errantId: errant.id, label: `${def.name} se joint au combat !` });
  }
  return joins;
}

/** Un allié errant est-il dans le monde ? (absent tant qu'il est blessé : jusqu'au repos suivant.) */
export function errantPresent(progress: Progress, id: string): boolean {
  const wounded = progress.wounded?.[id];
  return wounded === undefined || progress.day > wounded;
}

/** Les errants tombés au combat sont blessés jusqu'au prochain repos à l'auberge. */
export function woundErrants(progress: Progress, ids: readonly string[]): void {
  if (ids.length === 0) return;
  progress.wounded = { ...(progress.wounded ?? {}) };
  for (const id of ids) progress.wounded[id] = progress.day;
}
