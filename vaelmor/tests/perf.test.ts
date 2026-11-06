import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { parseQualitySetting, QUALITY_SETTINGS, QUALITY_SETTING_LABEL } from '../src/render/atmosphere';
import { AUTO_QUALITY, AutoQuality, lowerLevel, parsePerfLevel, windowVerdict } from '../src/logic/perf/autoQuality';
import { heapReport, type HeapSample } from '../src/logic/perf/heap';

/** Qualité automatique et tas stable (lot G, n°246). */

/** Nourrit le contrôleur avec `ms` de temps de jeu à `frame` ms par image ; renvoie les crans pris. */
function run(auto: AutoQuality, ms: number, frame: number): string[] {
  const changes: string[] = [];
  for (let t = 0; t < ms; t += frame) {
    const level = auto.feed(frame);
    if (level) changes.push(`${Math.round(t)}:${level}`);
  }
  return changes;
}

describe('qualité automatique', () => {
  it('ne touche à rien quand le jeu tient ses 60 ips', () => {
    const auto = new AutoQuality('high');
    expect(run(auto, 120_000, 16.7)).toEqual([]);
    expect(auto.level).toBe('high');
  });

  it('baisse d’un cran après deux fenêtres lentes, puis laisse un répit', () => {
    const auto = new AutoQuality('high');
    const changes = run(auto, 6_100, 40); // 25 ips
    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatch(/:low$/);
    expect(auto.level).toBe('low');
    expect(auto.inGrace).toBe(true);
    // Pendant le répit, rien n’est jugé même si c’est toujours lent.
    expect(run(auto, AUTO_QUALITY.graceMs - 200, 40)).toEqual([]);
    expect(auto.level).toBe('low');
  });

  it('descend jusqu’à « Désactivée » si la machine reste lente, et s’arrête là', () => {
    const auto = new AutoQuality('high');
    const changes = run(auto, 60_000, 60); // 16 ips
    expect(changes.map((c) => c.split(':')[1])).toEqual(['low', 'off']);
    expect(auto.level).toBe('off');
    expect(run(auto, 30_000, 100)).toEqual([]);
  });

  it('ne remonte jamais seul, même quand tout va très bien', () => {
    const auto = new AutoQuality('low');
    expect(run(auto, 300_000, 8)).toEqual([]);
    expect(auto.level).toBe('low');
  });

  it('une seule fenêtre lente isolée ne suffit pas', () => {
    const auto = new AutoQuality('high');
    run(auto, 3_050, 45); // une fenêtre lente
    run(auto, 3_050, 16.7); // puis une fenêtre saine : la série est remise à zéro
    run(auto, 3_050, 45); // une autre fenêtre lente
    expect(auto.level).toBe('high');
  });

  it('une saccade de chargement ou un onglet caché n’est pas une lenteur', () => {
    const auto = new AutoQuality('high');
    const changes: string[] = [];
    for (let i = 0; i < 40; i++) {
      // Une image sur dix dure 2 s (onglet caché), les autres sont fluides.
      for (let k = 0; k < 9; k++) auto.feed(16.7);
      const level = auto.feed(2000);
      if (level) changes.push(level);
    }
    expect(changes).toEqual([]);
  });

  it('juge lente une fenêtre fluide mais saccadée : plus de 10 % d’images à plus de 50 ms', () => {
    const stutter = (big: number): number[] => [...Array<number>(100 - big).fill(16.7), ...Array<number>(big).fill(120)];
    expect(windowVerdict(stutter(15), 0)).toBe('slow');
    expect(windowVerdict(stutter(10), 0)).toBe('ok'); // un hoquet de ramasse-miettes de temps en temps reste toléré
  });

  it('ne juge pas une fenêtre trop pauvre en images ou faite surtout de temps non mesuré', () => {
    expect(windowVerdict([50, 50, 50], 0)).toBe('void');
    expect(windowVerdict(Array<number>(20).fill(50), 5000)).toBe('void');
  });

  it('une machine à 4 ips (rendu logiciel) est reconnue lente avec peu d’images', () => {
    const auto = new AutoQuality('high');
    expect(run(auto, 12_000, 250)).not.toEqual([]);
    expect(auto.level).not.toBe('high');
  });

  it('reset() repart de zéro au cran demandé ; les valeurs inconnues donnent le repli', () => {
    const auto = new AutoQuality('high');
    run(auto, 6_100, 40);
    auto.reset('high');
    expect(auto.level).toBe('high');
    expect(auto.inGrace).toBe(false);
    expect(lowerLevel('high')).toBe('low');
    expect(lowerLevel('off')).toBe('off');
    expect(parsePerfLevel('low')).toBe('low');
    for (const bad of [undefined, null, 3, 'auto', {}]) expect(parsePerfLevel(bad)).toBe('high');
    expect(parsePerfLevel('ultra', 'low')).toBe('low');
  });

  it('ignore les durées nulles, négatives ou absurdes sans planter', () => {
    const auto = new AutoQuality('high');
    for (const d of [0, -5, Number.NaN, Number.POSITIVE_INFINITY]) expect(() => auto.feed(d)).not.toThrow();
    expect(auto.level).toBe('high');
  });
});

describe('tas stable', () => {
  const MO = 1048576;
  const samples = (values: number[]): HeapSample[] => values.map((v, i) => ({ combats: i * 5, bytes: v * MO }));

  it('un tas qui reste autour de sa valeur est stable', () => {
    const report = heapReport(samples([40, 52, 53, 52, 54, 53, 52]));
    expect(report.enough).toBe(true);
    expect(report.stable).toBe(true);
    expect(Math.abs(report.drift)).toBeLessThan(0.05);
  });

  it('la référence est le premier échantillon après le réchauffement, pas le tas du monde', () => {
    const report = heapReport(samples([40, 52, 53]));
    expect(report.baseline?.combats).toBe(5);
    expect(report.baseline?.bytes).toBe(52 * MO);
  });

  it('une fuite de 0,6 Mo par combat est détectée (A-01)', () => {
    const leak = Array.from({ length: 7 }, (_, i) => 52 + i * 5 * 0.6);
    const report = heapReport(samples([40, ...leak.slice(1)]));
    expect(report.stable).toBe(false);
    expect(report.bytesPerCombat / MO).toBeGreaterThan(0.5);
    expect(report.bytesPerCombat / MO).toBeLessThan(0.7);
  });

  it('une bosse au milieu qui redescend compte comme un écart (maxDeviation)', () => {
    const report = heapReport(samples([40, 50, 60, 52, 51]));
    expect(report.stable).toBe(false);
    expect(Math.abs(report.drift)).toBeLessThan(0.1);
  });

  it('pas assez d’échantillons : aucune conclusion', () => {
    expect(heapReport([]).enough).toBe(false);
    expect(heapReport(samples([40, 50])).enough).toBe(false);
    expect(heapReport(samples([40, 50])).stable).toBe(false);
  });
});

describe('réglage « Qualité » avec « Automatique »', () => {
  const store = new Map<string, string>();
  beforeAll(() => {
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    });
  });
  afterAll(() => vi.unstubAllGlobals());

  it('« Automatique » est le réglage par défaut ; une valeur illisible y ramène', () => {
    expect(QUALITY_SETTINGS[0]).toBe('auto');
    expect(QUALITY_SETTING_LABEL.auto).toBe('Automatique');
    expect(parseQualitySetting(undefined)).toBe('auto');
    expect(parseQualitySetting('ultra')).toBe('auto');
    expect(parseQualitySetting('low')).toBe('low');
  });

  it('en Automatique le cran appliqué suit le contrôleur ; un réglage fixe l’emporte ; le retour à Automatique repart de Haute', async () => {
    const settings = await import('../src/core/settings');
    const heard: string[] = [];
    const off = settings.onSettingsChange((key) => heard.push(key));
    expect(settings.loadQualitySetting()).toBe('auto');
    expect(settings.loadQuality()).toBe('high');

    settings.saveAutoLevel('low');
    expect(settings.loadQuality()).toBe('low');
    expect(heard).toContain('quality'); // les scènes ouvertes sont prévenues

    settings.saveQuality('high');
    expect(settings.loadQuality()).toBe('high'); // le choix du joueur passe avant le contrôleur
    expect(settings.loadAutoLevel()).toBe('low'); // le cran atteint est gardé en mémoire

    settings.saveQuality('auto');
    expect(settings.loadQualitySetting()).toBe('auto');
    expect(settings.loadQuality()).toBe('high'); // choisir « Automatique » repart de zéro
    off();
  });

  it('l’écran Options propose Automatique en premier et le relit', async () => {
    const { optionRows } = await import('../src/ui/optionsModel');
    const row = optionRows().find((r) => r.id === 'quality');
    expect(row?.values.map((v) => v.id)).toEqual(['auto', 'high', 'low', 'off']);
    expect(row?.get()).toBe('auto');
    row?.set('low');
    expect(row?.get()).toBe('low');
    row?.set('inconnu');
    expect(row?.get()).toBe('auto');
  });
});
