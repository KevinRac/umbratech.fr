/**
 * `npm run validate-data` — valide les fichiers de `vaelmor/data/` tels qu'ils
 * sont sur le disque (schémas + références croisées). Code de sortie 1 en cas
 * d'erreur : le build s'arrête avant de produire un jeu aux données cassées.
 */
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseWorldMap } from '../src/data/worldMap';
import { DATA_KEYS, dataFileName, validateGameData, type RawGameData } from '../src/data/validate';

const dataDir = resolve(import.meta.dirname, '..', 'data');

async function main(): Promise<number> {
  const raw: Partial<RawGameData> = {};
  const problems: string[] = [];

  for (const key of DATA_KEYS) {
    const file = dataFileName(key);
    try {
      raw[key] = JSON.parse(await readFile(resolve(dataDir, file), 'utf8'));
    } catch (error) {
      problems.push(`${file} › illisible : ${(error as Error).message}`);
    }
  }

  const known = new Set(DATA_KEYS.map(dataFileName));
  const unknownFiles = (await readdir(dataDir)).filter((f) => f.endsWith('.json') && !known.has(f));
  for (const file of unknownFiles) {
    problems.push(`${file} › fichier non déclaré dans DATA_SCHEMAS (src/data/validate.ts) : il ne serait jamais chargé`);
  }

  if (problems.length === 0) {
    const result = validateGameData(raw as RawGameData);
    if (result.ok) {
      const d = result.data;
      // La carte du monde dépend des zones et des terrains : on la valide avec eux.
      let mapSummary = '';
      try {
        const rawMap = JSON.parse(await readFile(resolve(dataDir, '..', 'assets', 'maps', 'world.json'), 'utf8')) as unknown;
        const map = parseWorldMap(rawMap, { zones: d.zones, terrains: d.terrains, tileSize: d.balance.exploration.tileSize });
        if (map.ok) mapSummary = ` Carte du monde ${map.map.width}×${map.map.height} : ${map.map.locations.length} lieux, ${map.map.gates.length} passages.`;
        else problems.push(...map.issues);
      } catch (error) {
        problems.push(`assets/maps/world.json › illisible : ${(error as Error).message}`);
      }
      if (problems.length === 0) {
        console.log(
          `✓ Données valides : ${d.classes.length} classes, ` +
            `${d.classes.reduce((n, c) => n + c.evolutions.length, 0)} évolutions, ` +
            `${d.terrains.length} terrains, ${d.elements.length} éléments, ${d.reputation.tiers.length} paliers de réputation, ` +
            `${d.weapons.length} armes, ${d.enemies.length} ennemis, ${d.encounters.encounters.length} rencontres.${mapSummary}`,
        );
        return 0;
      }
    } else {
      problems.push(...result.issues);
    }
  }

  console.error(`✗ ${problems.length} problème(s) dans les données :`);
  for (const p of problems) console.error(`  - ${p}`);
  return 1;
}

process.exitCode = await main();
