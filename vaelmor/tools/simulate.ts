/**
 * `npm run simulate` — banc d'équilibrage (jalon M10, lot F, n°245/n°263).
 * Joue chaque rencontre des données avec la compagnie simulée (IA prudente par
 * défaut) et compare aux cibles. Options : --n=<graines> --ai=prudente|agressive|allie
 * --delta=<niveaux d'écart> --enc=<id,id> --classes=<id,id> --json
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadGameData } from '../src/data';
import { loadWorldMap } from '../src/data/worldMap';
import { meanEnemyLevel } from '../src/logic/game/foeRules';
import { simulateBattle, type BattleResult, type CompanyAi } from '../src/logic/sim/battle';
import { composeCompany } from '../src/logic/sim/company';
import { aggregate, combatsPerLevel, inTarget, pct, TARGETS } from '../src/logic/sim/stats';
import { worldTerrainSource } from '../src/logic/tactics/sampling';

const args = new Map(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k as string, v ?? '1']; }));
const N = Number(args.get('n') ?? 30);
const AI = (args.get('ai') ?? 'prudente') as CompanyAi;
const DELTA = Number(args.get('delta') ?? 0);
const only = args.get('enc')?.split(',');
const data = loadGameData();
const raw = JSON.parse(readFileSync(resolve(import.meta.dirname, '..', 'assets/maps/world.json'), 'utf8')) as unknown;
const world = worldTerrainSource(loadWorldMap(raw, { zones: data.zones, terrains: data.terrains, tileSize: data.balance.exploration.tileSize }));
const heroes = args.get('classes')?.split(',') ?? data.classes.map((c) => c.id);

/** Zone dont la compagnie a le matériel : celle de la rencontre, ou celle de son niveau si elle est plus loin. */
const kitZone = (zone: string, level: number): string => {
  const byLevel = data.zones.find((z) => z.levelMax >= level)?.id ?? zone;
  return Number(byLevel.slice(1)) > Number(zone.slice(1)) ? byLevel : zone;
};

/**
 * Niveau de la compagnie devant chaque rencontre (hypothèse n°263) : le niveau moyen
 * des soldats de la conception d'origine (v1.0 des données), figé ici pour que retoucher
 * les ennemis ne déplace pas la compagnie avec eux. Une rencontre nouvelle retombe sur
 * la moyenne de ses soldats.
 */
const PARTY_LEVEL: Readonly<Record<string, number>> = {
  embuscade_du_gue: 3,
  brigands_foret_racine: 4,
  camp_des_ecumeurs: 3,
  rodeurs_aubemer: 2,
  patrouille_ecumeurs: 3,
  sentinelles_ecumeurs: 3,
  embuscade_roseaux: 2,
  milice_aubemer: 3,
  chasseurs_de_ronces: 5,
  betes_de_la_foret: 5,
  sentinelles_de_ronces: 5,
  embuscade_sous_bois: 5,
  milice_racine: 6,
  roi_cerf_corrompu: 6,
  pillards_de_greve: 9,
  marees_mortes: 9,
  sentinelles_du_noye: 10,
  embuscade_noyes: 10,
  milice_brume: 10,
  soeur_merrow: 10,
  mercenaires_de_cendre: 13,
  eboulis_vivants: 13,
  sentinelles_de_cendre: 14,
  embuscade_harpies: 14,
  milice_cendre: 14,
  mere_harpie: 14,
  gardien_de_cendre: 15,
  revenants_de_la_citadelle: 17,
  gardes_engloutis: 18,
  embuscade_abysses: 18,
  arene_serie_1: 7,
  arene_serie_2: 12,
  arene_serie_3: 17,
  roi_maree_brise: 18
};

const rows: { id: string; zone: string; boss: boolean; level: number; agg: ReturnType<typeof aggregate>; byClass: Map<string, ReturnType<typeof aggregate>>; xp: number }[] = [];
const classAll = new Map<string, BattleResult[]>();

for (const enc of data.encounters.encounters) {
  if (only && !only.includes(enc.id)) continue;
  const level = Math.max(1, (PARTY_LEVEL[enc.id] ?? Math.round(meanEnemyLevel({ ...enc, enemies: enc.enemies.filter((m) => m.boss !== true) }))) + DELTA);
  const all: BattleResult[] = [];
  const byClass = new Map<string, BattleResult[]>();
  for (const hero of heroes) {
    for (let s = 0; s < N; s++) {
      const comp = composeCompany(data, hero, kitZone(enc.zone, level), level, enc.maxDeploy);
      const r = simulateBattle({ data, encounter: enc, members: comp.members, loadouts: comp.loadouts, world, seed: `${enc.id}:${hero}:${s}`, ai: AI });
      all.push(r);
      byClass.set(hero, [...(byClass.get(hero) ?? []), r]);
      classAll.set(hero, [...(classAll.get(hero) ?? []), r]);
    }
  }
  const xps = all.flatMap((r) => r.members.map((m) => m.xp));
  rows.push({ id: enc.id, zone: enc.zone, boss: enc.objective.type === 'boss', level, agg: aggregate(all), byClass: new Map([...byClass].map(([k, v]) => [k, aggregate(v)])), xp: xps.reduce((a, b) => a + b, 0) / Math.max(1, xps.length) });
}

if (args.has('json')) {
  console.log(JSON.stringify(rows.map((r) => ({ ...r, byClass: Object.fromEntries(r.byClass) })), null, 1));
  process.exit(0);
}
console.log(`Simulation : ${N} graines × ${heroes.length} classes de héros, IA ${AI}, niveau = moyenne ennemie ${DELTA >= 0 ? '+' : ''}${DELTA}\n`);
console.log('rencontre'.padEnd(28), 'zone niv  victoires  tours  héros♱  tombés  PV fin  XP/memb  cbt/niv  cible');
let bad = 0;
for (const r of rows) {
  const t = inTarget(r.boss, r.agg);
  if (!t.ok) bad++;
  console.log(`${(r.boss ? '★ ' : '  ') + r.id}`.padEnd(28), r.zone.padEnd(4), String(r.level).padStart(3), pct(r.agg.winRate).padStart(9), r.agg.turnsWin.toFixed(1).padStart(6), pct(r.agg.heroFellRate).padStart(7), r.agg.fallenMean.toFixed(1).padStart(7), pct(r.agg.hpLeftWin).padStart(7), r.xp.toFixed(0).padStart(8), (r.boss ? '-' : combatsPerLevel(r.xp, data.balance.xp.perLevel).toFixed(1)).padStart(8), t.ok ? ' ok' : ` ✗ ${t.why}`);
}
console.log('\nPar classe de héros (toutes rencontres ordinaires) :');
let weak = 0;
for (const [c, rs] of classAll) {
  const a = aggregate(rs.filter((r) => !r.boss));
  if (a.winRate < TARGETS.heroClassMin) weak++;
  console.log(' ', c.padEnd(34), pct(a.winRate).padStart(6), a.winRate < TARGETS.heroClassMin ? '✗' : '');
}
const avg = (xs: number[]): number => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const ord = rows.filter((r) => !r.boss), bos = rows.filter((r) => r.boss);
console.log(`\nMoyennes : ordinaires ${pct(avg(ord.map((r) => r.agg.winRate)))} en ${avg(ord.map((r) => r.agg.turnsWin)).toFixed(1)} tours ; boss ${pct(avg(bos.map((r) => r.agg.winRate)))}.`);
console.log(`\n${bad} rencontre(s) hors cible, ${weak} classe(s) sous ${pct(TARGETS.heroClassMin)}.`);
