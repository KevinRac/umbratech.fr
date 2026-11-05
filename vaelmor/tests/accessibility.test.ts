/**
 * Lot E de M10 — accessibilité (GDD §13.8) : remappage des touches (n°241,
 * n°257), taille du texte (n°242, n°258), mode daltonien (n°243), effets
 * réduits et vitesse du texte (n°244).
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import {
  ACTION_LABEL,
  DEBUG_BINDINGS,
  DEFAULT_BINDINGS,
  KEY_LABEL,
  LOCKED_KEY,
  REMAPPABLE,
  SLOTS,
  actionUsing,
  bindKey,
  clearKey,
  defaultBindings,
  keyHint,
  resolveBindings,
  storedBindings,
  type KeyBindings,
} from '../src/logic/input/keymap';
import {
  CAMP_SHAPE,
  INSTANT_CPS,
  TILE_PATTERN,
  TEXT_SIZE_FACTOR,
  patternAt,
  difficultyPips,
  flashStrength,
  parseReducedMotion,
  parseTextSize,
  parseTextSpeed,
  reducedActive,
  shakeIntensity,
  typingFor,
  worldMotion,
} from '../src/logic/settings/accessibility';
import { loadGameData } from '../src/data';

const ok = (r: ReturnType<typeof bindKey>): KeyBindings => {
  if (!r.ok) throw new Error(r.message);
  return r.bindings;
};

describe('touches : liaisons et remappage (n°241, n°257)', () => {
  it('chaque touche connue existe dans Phaser, et les liaisons d’origine ne se chevauchent pas', () => {
    // Table des codes de Phaser lue directement (le paquet n'exporte pas ce fichier).
    const require = createRequire(import.meta.url);
    const codes = require(fileURLToPath(new URL('../node_modules/phaser/src/input/keyboard/keys/KeyCodes.js', import.meta.url))) as Record<string, number>;
    for (const name of Object.keys(KEY_LABEL)) expect(codes[name], name).toBeTypeOf('number');
    const all = [...Object.values(DEFAULT_BINDINGS).flat(), ...Object.values(DEBUG_BINDINGS).flat()];
    expect(new Set(all).size).toBe(all.length);
    for (const a of REMAPPABLE) {
      expect(DEFAULT_BINDINGS[a].length).toBeLessThanOrEqual(SLOTS);
      expect(ACTION_LABEL[a].length).toBeGreaterThan(2);
      const locked = LOCKED_KEY[a];
      if (locked) expect(DEFAULT_BINDINGS[a][0]).toBe(locked);
    }
  });

  it('sans réglage, ou réglage illisible : les touches d’origine (ZQSD et WASD)', () => {
    expect(resolveBindings(undefined)).toEqual(defaultBindings());
    expect(resolveBindings('n’importe quoi')).toEqual(defaultBindings());
    expect(resolveBindings({ up: 'Z', menu: [42] })).toEqual(defaultBindings());
    expect(storedBindings(defaultBindings())).toEqual({});
  });

  it('poser une touche libre, la retrouver après enregistrement, seule l’action changée est écrite', () => {
    const b = ok(bindKey(defaultBindings(), 'sprint', 1, 'CTRL'));
    expect(b.sprint).toEqual(['SHIFT', 'CTRL']);
    expect(storedBindings(b)).toEqual({ sprint: ['SHIFT', 'CTRL'] });
    expect(resolveBindings(storedBindings(b))).toEqual(b);
    const replaced = ok(bindKey(b, 'sprint', 0, 'L'));
    expect(replaced.sprint).toEqual(['L', 'CTRL']);
  });

  it('une touche déjà prise est refusée, avec le nom de l’action qui l’utilise', () => {
    const r = bindKey(defaultBindings(), 'map', 1, 'E');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe('conflict');
      expect(r.message).toContain('Valider');
    }
    expect(actionUsing(defaultBindings(), 'TAB')).toBe('menu');
  });

  it('flèches, Entrée et Échap restent verrouillées en première case ; F1 à F12 réservées', () => {
    expect(bindKey(defaultBindings(), 'confirm', 0, 'K').ok).toBe(false);
    expect(clearKey(defaultBindings(), 'cancel', 0).ok).toBe(false);
    const reserved = bindKey(defaultBindings(), 'journal', 0, 'F10');
    expect(reserved.ok === false && reserved.reason).toBe('reserved');
    expect(bindKey(defaultBindings(), 'journal', 0, 'NOPE').ok).toBe(false);
    // Un fichier modifié à la main ne retire jamais la touche verrouillée.
    expect(resolveBindings({ up: ['K'] }).up).toEqual(['UP', 'K']);
  });

  it('on ne retire jamais la dernière touche d’une action', () => {
    const r = clearKey(defaultBindings(), 'map', 0);
    expect(r.ok === false && r.reason).toBe('last');
    const two = ok(bindKey(defaultBindings(), 'map', 1, 'K'));
    expect(ok(clearKey(two, 'map', 0)).map).toEqual(['K']);
  });

  it('libérer une touche puis la donner à une autre action', () => {
    const freed = ok(clearKey(defaultBindings(), 'confirm', 2)); // E
    expect(freed.confirm).toEqual(['ENTER', 'SPACE']);
    const moved = ok(bindKey(freed, 'journal', 1, 'E'));
    expect(moved.journal).toEqual(['J', 'E']);
    expect(keyHint(moved, 'journal')).toBe('J');
    expect(keyHint(moved, 'confirm', 'last')).toBe('Espace');
    expect(keyHint(defaultBindings(), 'confirm', 'last')).toBe('E');
    expect(keyHint(defaultBindings(), 'up', 'free')).toBe('Z');
  });

  it('une touche enregistrée deux fois (à la main) ne sert qu’à la première action', () => {
    const b = resolveBindings({ menu: ['TAB', 'J'], journal: ['J', 'K'] });
    expect(b.menu).toEqual(['TAB', 'J']);
    expect(b.journal).toEqual(['K']);
    // Une action qui perdrait toutes ses touches les garde.
    const c = resolveBindings({ menu: ['TAB', 'N'] });
    expect(c.map).toEqual(['N']);
    for (const a of REMAPPABLE) expect(c[a].length).toBeGreaterThanOrEqual(1);
  });
});

describe('taille et vitesse du texte (n°242, n°244, n°258)', () => {
  it('×1 / ×1,25', () => {
    expect(TEXT_SIZE_FACTOR).toEqual({ normal: 1, large: 1.25 });
    expect(parseTextSize('large')).toBe('large');
    expect(parseTextSize(3)).toBe('normal');
  });

  it('vitesse : lente, normale, rapide, instantanée', () => {
    const base = loadGameData().balance.dialogue;
    expect(typingFor(base, 'normal')).toEqual(base);
    expect(typingFor(base, 'slow').charsPerSecond).toBeLessThan(base.charsPerSecond);
    expect(typingFor(base, 'fast').charsPerSecond).toBe(base.charsPerSecond * 2);
    expect(typingFor(base, 'instant').charsPerSecond).toBe(INSTANT_CPS);
    // Une réplique de 400 caractères s'affiche dès la première image (16 ms).
    expect(INSTANT_CPS * 0.016).toBeGreaterThan(400);
    expect(parseTextSpeed('vite')).toBe('normal');
  });
});

describe('effets réduits (n°221, n°244)', () => {
  it('« Selon le système » par défaut ; l’ancien booléen reste compris', () => {
    expect(parseReducedMotion(undefined)).toBe('auto');
    expect(parseReducedMotion(true)).toBe('on');
    expect(parseReducedMotion(false)).toBe('off');
    expect(reducedActive('auto', true)).toBe(true);
    expect(reducedActive('auto', false)).toBe(false);
    expect(reducedActive('off', true)).toBe(false);
    expect(reducedActive('on', false)).toBe(true);
  });

  it('mêmes facteurs que l’écran rapproché : secousses ÷ 3, flashs à 30 %, monde sans zoom ni poussière', () => {
    expect(shakeIntensity(0.006, true)).toBeCloseTo(0.002);
    expect(shakeIntensity(0.006, false)).toBe(0.006);
    expect(flashStrength(true)).toBe(0.3);
    expect(flashStrength(false)).toBe(1);
    expect(worldMotion(true)).toEqual({ battleZoom: false, dust: false, flicker: 0.25, bob: false });
    expect(worldMotion(false).battleZoom).toBe(true);
  });
});

describe('mode daltonien (n°243)', () => {
  it('chaque sens de case a son motif, distinct des autres, et chaque camp sa forme', () => {
    const patterns = Object.values(TILE_PATTERN);
    expect(new Set(patterns).size).toBe(patterns.length);
    const shapes = Object.values(CAMP_SHAPE);
    expect(new Set(shapes).size).toBe(shapes.length);
  });

  it('les motifs se dessinent dans la case, et deux motifs ne couvrent jamais les mêmes pixels', () => {
    const sig = (p: (typeof TILE_PATTERN)[keyof typeof TILE_PATTERN]): string => {
      let out = '';
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) out += patternAt(p, x, y) ? '1' : '0';
      return out;
    };
    const sigs = Object.values(TILE_PATTERN).map(sig);
    expect(new Set(sigs).size).toBe(sigs.length);
    for (const p of Object.values(TILE_PATTERN)) {
      const n = [...sig(p)].filter((c) => c === '1').length;
      if (p === 'plain') expect(n).toBe(0);
      else {
        expect(n, p).toBeGreaterThanOrEqual(6);
        expect(n, p).toBeLessThan(90);
      }
      // Jamais sur le liseré (0, 1, 14, 15) : le contour de la case reste lisible.
      for (const edge of [0, 1, 14, 15]) for (let i = 0; i < 16; i++) expect(patternAt(p, edge, i) || patternAt(p, i, edge)).toBe(false);
    }
  });

  it('crans de difficulté : le rang de la bande, de 1 (Facile) à 5 (Mortel)', () => {
    const bands = loadGameData().balance.foes.difficulty.map((b) => b.id);
    expect(difficultyPips(bands, bands[0] as string)).toBe(1);
    expect(difficultyPips(bands, bands[bands.length - 1] as string)).toBe(bands.length);
    expect(difficultyPips(bands, 'boss')).toBe(0);
  });
});

describe('réglages enregistrés (vaelmor:settings)', () => {
  const store = new Map<string, string>();
  beforeAll(() => {
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    });
  });
  afterAll(() => vi.unstubAllGlobals());

  it('touches, texte, daltonien et effets réduits se relisent ; les options les montrent', async () => {
    const settings = await import('../src/core/settings');
    const { optionRows, valueLabel } = await import('../src/ui/optionsModel');
    settings.saveKeyBindings(ok(bindKey(defaultBindings(), 'map', 1, 'K')));
    expect(settings.loadKeyBindings().map).toEqual(['N', 'K']);
    settings.saveTextSize('large');
    settings.saveTextSpeed('fast');
    settings.saveColorBlind(true);
    settings.saveReducedMotion('on');
    expect(settings.loadTextSize()).toBe('large');
    expect(settings.loadReducedEffects()).toBe(true);
    const rows = optionRows();
    const label = (id: string): string => valueLabel(rows.find((r) => r.id === id) as (typeof rows)[number]);
    expect(label('textSize')).toBe('×1,25');
    expect(label('textSpeed')).toBe('Rapide');
    expect(label('colorBlind')).toBe('Oui');
    expect(label('reducedFx')).toBe('Oui');
    expect(rows.find((r) => r.id === 'keys')?.opens).toBe('keys');
    // L'ancien réglage (booléen du jalon M8) reste lu.
    settings.writeSetting('reducedFx', false);
    expect(settings.loadReducedMotion()).toBe('off');
  });
});
