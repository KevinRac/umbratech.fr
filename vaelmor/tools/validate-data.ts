/**
 * `npm run validate-data` — valide les fichiers de `vaelmor/data/` tels qu'ils
 * sont sur le disque (schémas + références croisées). Code de sortie 1 en cas
 * d'erreur : le build s'arrête avant de produire un jeu aux données cassées.
 */
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
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
      console.log(
        `✓ Données valides : ${d.classes.length} classes, ` +
          `${d.classes.reduce((n, c) => n + c.evolutions.length, 0)} évolutions, ` +
          `${d.terrains.length} terrains, ${d.elements.length} éléments, ${d.reputation.tiers.length} paliers de réputation.`,
      );
      return 0;
    }
    problems.push(...result.issues);
  }

  console.error(`✗ ${problems.length} problème(s) dans les données :`);
  for (const p of problems) console.error(`  - ${p}`);
  return 1;
}

process.exitCode = await main();
