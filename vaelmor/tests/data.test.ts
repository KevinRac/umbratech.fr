import { describe, expect, it } from 'vitest';
import { EMBEDDED_DATA, loadGameData } from '../src/data';
import { DATA_KEYS, validateGameData, type RawGameData } from '../src/data/validate';

/** Copie profonde modifiable des données embarquées. */
function rawCopy(): Record<string, any> {
  return structuredClone(EMBEDDED_DATA) as Record<string, any>;
}

function issuesOf(raw: Record<string, any>): readonly string[] {
  return validateGameData(raw as RawGameData).issues;
}

describe('données embarquées', () => {
  it('sont valides', () => {
    const result = validateGameData(EMBEDDED_DATA);
    expect(result.issues).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it('le registre importe exactement les fichiers déclarés', () => {
    expect(Object.keys(EMBEDDED_DATA).sort()).toEqual([...DATA_KEYS].sort());
  });

  it('respectent le GDD : 12 classes, 24 évolutions, 12 rôles distincts', () => {
    const data = loadGameData();
    expect(data.classes).toHaveLength(12);
    expect(data.classes.flatMap((c) => c.evolutions)).toHaveLength(24);
    expect(new Set(data.classes.map((c) => c.role)).size).toBe(12);
  });

  it('reprennent les valeurs du GDD §10.3 et §10.4', () => {
    const gardien = loadGameData().classes.find((c) => c.id === 'gardien_des_marees');
    expect(gardien?.baseStats).toEqual({ pv: 24, fo: 6, mag: 0, dex: 4, vit: 3, def: 8, res: 3, chc: 3, mob: 4 });
    const danseur = loadGameData().classes.find((c) => c.id === 'danseur_des_courants');
    expect(danseur?.baseStats.mob).toBe(7);
    expect(danseur?.growths.vit).toBe(65);
  });

  it('le triangle élémentaire est Marée > Cendre > Racine > Marée', () => {
    const beats = Object.fromEntries(loadGameData().elements.map((e) => [e.id, e.beats]));
    expect(beats).toMatchObject({ maree: 'cendre', cendre: 'racine', racine: 'maree', pierre: null, lanterne: null });
  });
});

describe('détection des erreurs de données', () => {
  it('signale une clé inconnue (faute de frappe)', () => {
    const raw = rawCopy();
    raw.classes.classes[0].baseStat = {};
    expect(issuesOf(raw).join('\n')).toMatch(/classes\.json › classes\[0\]/);
  });

  it('signale un identifiant mal formé', () => {
    const raw = rawCopy();
    raw.terrains.terrains[0].id = 'Plaine Verte';
    expect(issuesOf(raw).join('\n')).toMatch(/snake_case/);
  });

  it('signale un identifiant en double, y compris entre classe et évolution', () => {
    const raw = rawCopy();
    raw.classes.classes[1].evolutions[0].id = 'gardien_des_marees';
    expect(issuesOf(raw).join('\n')).toMatch(/« gardien_des_marees » en double/);
  });

  it('signale une référence d’élément inconnue', () => {
    const raw = rawCopy();
    raw.classes.classes[0].element = 'foudre';
    expect(issuesOf(raw).join('\n')).toMatch(/élément inconnu : « foudre »/);
  });

  it('signale un trou entre deux paliers de réputation', () => {
    const raw = rawCopy();
    raw.reputation.tiers[2].max = 18;
    expect(issuesOf(raw).join('\n')).toMatch(/trou ou chevauchement/);
  });

  it('signale un rôle du GDD non couvert', () => {
    const raw = rawCopy();
    raw.classes.classes[11].role = 'tank';
    expect(issuesOf(raw).join('\n')).toMatch(/aucun rôle « tueur_de_boss »/);
  });

  it('exige exactement deux évolutions par classe', () => {
    const raw = rawCopy();
    raw.classes.classes[0].evolutions.pop();
    expect(issuesOf(raw).join('\n')).toMatch(/exactement 2 évolutions/);
  });

  it('signale une portée d’arme incohérente', () => {
    const raw = rawCopy();
    raw.classes.classes[0].weapon.range = [3, 1];
    expect(issuesOf(raw).join('\n')).toMatch(/portée min > portée max/);
  });
});
