/**
 * Jalon M10, lot D : bruitages et mixage (n°239, n°240). Règles pures
 * (ambiance, pas, notifications), données `sounds.json` et recettes jouées sur
 * un faux synthétiseur (aucune API audio).
 */
import { describe, expect, it } from 'vitest';
import {
  AMBIENCE_DEFS,
  AMBIENCES,
  COMBAT_SFX,
  playRecipe,
  SPELL_TONES,
  STEP_MATERIALS,
  stepRecipe,
  UI_SFX,
  WORLD_SFX,
  type SfxId,
} from '../src/audio/sfxRecipes';
import type { NoiseParams, ToneParams, Voice } from '../src/audio/synth';
import { EMBEDDED_DATA, loadGameData } from '../src/data';
import { AMBIENCE_IDS, STEP_MATERIAL_IDS } from '../src/data/schemas';
import { validateGameData, type RawGameData } from '../src/data/validate';
import { ambienceFor, noticeSound, stepInterval, stepMaterial } from '../src/logic/audio/soundRules';
import { optionRows } from '../src/ui/optionsModel';

const data = loadGameData();
const rules = data.sounds;
const counts = (entries: Record<string, number>): Map<string, number> => new Map(Object.entries(entries));

/** Faux synthétiseur : garde les couches posées, hasard fixe. */
function fakeVoice(): Voice & { layers: (ToneParams | NoiseParams)[] } {
  let seed = 7;
  const layers: (ToneParams | NoiseParams)[] = [];
  return {
    layers,
    tone: (p) => layers.push(p),
    noise: (p) => layers.push(p),
    random: () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    },
  };
}

function checkLayers(layers: readonly (ToneParams | NoiseParams)[], label: string, t0: number): void {
  expect(layers.length, label).toBeGreaterThan(0);
  for (const l of layers) {
    expect(l.gain, label).toBeGreaterThan(0);
    expect(l.gain, label).toBeLessThanOrEqual(1);
    expect(l.dur, label).toBeGreaterThan(0);
    expect(l.dur, label).toBeLessThan(4);
    expect(l.at, label).toBeGreaterThanOrEqual(t0);
    expect(l.f, label).toBeGreaterThan(19);
    if (l.f1 !== undefined) expect(l.f1, label).toBeGreaterThan(19);
    if (l.attack !== undefined) expect(l.attack, label).toBeLessThan(l.dur);
  }
}

describe('ambiance du monde ouvert (n°239)', () => {
  it('chaque zone a son ambiance, et les listes de données suivent les recettes', () => {
    for (const z of data.zones) expect(rules.ambience.zones[z.id], z.id).toBeTruthy();
    expect([...AMBIENCE_IDS]).toEqual([...AMBIENCES]);
    expect([...STEP_MATERIAL_IDS]).toEqual([...STEP_MATERIALS]);
  });

  it('la zone donne l’ambiance, sauf terrain dominant ou lieu qui impose la sienne', () => {
    expect(ambienceFor(rules, { zone: 'z1', place: null, terrains: counts({ plaine: 100 }) })).toBe('plaine');
    expect(ambienceFor(rules, { zone: 'z1', place: null, terrains: counts({ plaine: 50, foret: 50 }) })).toBe('foret');
    // En dessous du seuil, la forêt ne l'emporte pas.
    expect(ambienceFor(rules, { zone: 'z1', place: null, terrains: counts({ plaine: 90, foret: 10 }) })).toBe('plaine');
    expect(ambienceFor(rules, { zone: 'z3', place: null, terrains: counts({ marais: 60, plaine: 40 }) })).toBe('marais');
    expect(ambienceFor(rules, { zone: 'z4', place: 'pierre_haute', terrains: counts({ village: 100 }) })).toBe('braises');
    expect(ambienceFor(rules, { zone: null, place: null, terrains: new Map() })).toBeNull();
  });

  it('plage et eau profonde comptent ensemble pour le ressac', () => {
    expect(ambienceFor(rules, { zone: 'z1', place: null, terrains: counts({ plage: 20, eau_profonde: 20, plaine: 60 }) })).toBe('ressac');
  });
});

describe('pas du héros', () => {
  it('chaque terrain praticable a une matière, et la course presse le pas', () => {
    expect(stepMaterial(rules, 'route')).toBe('terre');
    expect(stepMaterial(rules, 'pont')).toBe('bois');
    expect(stepMaterial(rules, 'marais')).toBe('boue');
    expect(stepMaterial(rules, null)).toBe(rules.steps.default);
    expect(stepMaterial(rules, 'inconnu')).toBe(rules.steps.default);
    for (const t of data.terrains) if (t.moveCost !== null && t.moveCost !== undefined) expect(rules.steps.terrains[t.id] ?? rules.steps.default, t.id).toBeTruthy();
    expect(stepInterval(rules, true)).toBeLessThan(stepInterval(rules, false));
  });
});

describe('son des notifications', () => {
  it('le plus marquant l’emporte', () => {
    expect(noticeSound([])).toBeNull();
    expect(noticeSound([{ kind: 'gold', amount: 30 }, { kind: 'quest', quest: 'q', event: 'completed' }])).toBe('quest');
    expect(noticeSound([{ kind: 'rep', target: 'haut_gue', delta: 10, after: 20, tierChanged: null }, { kind: 'rep', target: 'couronne', delta: -10, after: -5, tierChanged: null }])).toBe('repDown');
    expect(noticeSound([{ kind: 'rep', target: 'haut_gue', delta: 10, after: 20, tierChanged: null }])).toBe('repUp');
    expect(noticeSound([{ kind: 'item', item: 'potion', qty: 1, lost: 0 }])).toBe('item');
    expect(noticeSound([{ kind: 'gold', amount: 30 }])).toBe('buy');
    expect(noticeSound([{ kind: 'day', day: 3 }])).toBe('notify');
  });
});

describe('recettes des bruitages', () => {
  const ids: SfxId[] = [...COMBAT_SFX, ...UI_SFX, ...WORLD_SFX];

  it('chaque son pose des couches valides, à partir de son instant', () => {
    for (const id of ids) {
      const v = fakeVoice();
      const dur = playRecipe(v, id, 1);
      expect(dur, id).toBeGreaterThan(0);
      checkLayers(v.layers, id, 1);
    }
    for (const tone of SPELL_TONES) {
      const v = fakeVoice();
      playRecipe(v, 'spell', 0, tone);
      checkLayers(v.layers, `spell:${String(tone)}`, 0);
    }
    for (const m of STEP_MATERIALS) {
      const v = fakeVoice();
      stepRecipe(v, m, 2);
      checkLayers(v.layers, m, 2);
      // Un pas reste discret.
      for (const l of v.layers) expect(l.gain, m).toBeLessThan(0.3);
    }
  });

  it('le coup critique et le passage au combat sont les sons les plus forts', () => {
    const peak = (id: SfxId): number => {
      const v = fakeVoice();
      playRecipe(v, id, 0);
      return Math.max(...v.layers.map((l) => l.gain));
    };
    for (const id of [...UI_SFX, 'alert' as const, 'tick' as const]) expect(peak(id), id).toBeLessThan(peak('critHit'));
    expect(peak('battleStart')).toBeGreaterThan(peak('confirm'));
  });

  it('chaque ambiance a des nappes et des événements jouables', () => {
    for (const id of AMBIENCES) {
      const def = AMBIENCE_DEFS[id];
      expect(def.beds.length, id).toBeGreaterThan(0);
      expect(def.events.length, id).toBeGreaterThan(0);
      for (const e of def.events) {
        expect(e.every[0], e.name).toBeGreaterThan(0);
        expect(e.every[1], e.name).toBeGreaterThanOrEqual(e.every[0]);
        const v = fakeVoice();
        e.play(v, 5);
        checkLayers(v.layers, `${id}:${e.name}`, 5);
      }
    }
  });
});

describe('données et Options', () => {
  it('une zone ou un terrain inconnu dans sounds.json est signalé', () => {
    const raw = structuredClone(EMBEDDED_DATA) as Record<string, any>;
    raw['sounds'].ambience.zones.z9 = 'plaine';
    raw['sounds'].steps.terrains.lave = 'gravier';
    const issues = validateGameData(raw as RawGameData).issues.join('\n');
    expect(issues).toContain('zone inconnue « z9 »');
    expect(issues).toContain('terrain inconnu « lave »');
  });

  it('l’écran Options règle le volume de l’ambiance (n°240)', () => {
    const row = optionRows().find((r) => r.id === 'ambienceVolume');
    expect(row?.get()).toBe('50');
  });
});
