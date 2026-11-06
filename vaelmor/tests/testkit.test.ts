import { describe, expect, it } from 'vitest';
import { JOURNAL_CAP, Journal, formatClock, formatEntry, oneLine, type JournalEntry } from '../src/logic/testkit/journal';
import { NOTE_MAX, NOTE_TEXT_MAX, addNote, countByKind, emptyNotebook, parseNotebook, removeNote, serializeNotebook, validateDraft, type NoteContext } from '../src/logic/testkit/notebook';
import { PERF_SAMPLE, PerfSampler, describeSample } from '../src/logic/testkit/perfSampler';
import { REPORT_TAIL, buildReport, buildSessionExport, reportFileName, summarizeSession, summaryLines, type ReportContext } from '../src/logic/testkit/report';

/** Kit de test du lot H (n°247, n°273 à n°278) : journal, carnet, mesure de fluidité, rapports. */

const INFO = { version: '0.1.0', milestone: 'M10' };
const NOW = '2026-11-06T17:53:21.000Z';

const ctx: ReportContext = {
  version: '0.1.0',
  milestone: 'M10',
  userAgent: 'Mozilla/5.0 (test)',
  language: 'fr-FR',
  screen: '1920×1080 à ×1',
  settings: { qualité: 'Automatique', texte: '×1' },
  scenes: ['World', 'WorldHud'],
  game: { heroName: 'Aldric', heroClass: 'Gardien des Marées', heroLevel: 7, place: 'Haut-Gué', playMs: 42 * 60_000, gold: 380, mode: 'Blessure', companySize: 5 },
  storage: 'disponible',
  heapMb: 118.4,
};

const here: NoteContext = { place: 'Haut-Gué', scenes: 'World, WorldHud', playMs: 42 * 60_000, sessionMs: 45 * 60_000 };

function started(): Journal {
  const j = new Journal();
  j.startSession(INFO);
  return j;
}

describe('journal de session', () => {
  it('refuse d’écrire avant le démarrage d’une session', () => {
    expect(new Journal().add('scene', 'x', 0)).toBeNull();
  });

  it('ouvre une session numérotée et dit comment la précédente a fini', () => {
    const j = new Journal();
    expect(j.previousEnd()).toBe('aucune');
    j.startSession(INFO);
    j.add('scene', 'Title', 10);
    // Pas de ligne « fin » : la page a été fermée brutalement.
    const next = Journal.parse(j.serialize());
    expect(next.previousEnd()).toBe('interrompue');
    const first = next.startSession(INFO);
    expect(first.s).toBe(2);
    expect(first.m).toContain('session précédente : interrompue');
    next.add('fin', 'fermeture de la page', 5000);
    expect(Journal.parse(next.serialize()).previousEnd()).toBe('propre');
  });

  it('regroupe les lignes identiques rapprochées, sauf les mesures', () => {
    const j = started();
    j.add('erreur', 'TypeError: x is undefined', 1000);
    j.add('erreur', 'TypeError: x is undefined', 1200);
    j.add('erreur', 'TypeError: x is undefined', 1900);
    j.add('erreur', 'TypeError: x is undefined', 5000);
    const errors = j.entries().filter((e) => e.k === 'erreur');
    expect(errors).toHaveLength(2);
    expect(errors[0]?.n).toBe(3);
    expect(formatEntry(errors[0] as JournalEntry)).toContain('(×3)');
    j.add('perf', 'mesure', 6000, { fps: 60 });
    j.add('perf', 'mesure', 6100, { fps: 60 });
    expect(j.entries().filter((e) => e.k === 'perf')).toHaveLength(2);
  });

  it('ne garde que les JOURNAL_CAP dernières lignes', () => {
    const j = started();
    for (let i = 0; i < JOURNAL_CAP + 50; i++) j.add('monde', `ligne ${i}`, i * 2000);
    expect(j.size).toBe(JOURNAL_CAP);
    expect(j.entries()[j.size - 1]?.m).toBe(`ligne ${JOURNAL_CAP + 49}`);
  });

  it('ramène les textes à une ligne courte et garde des données à plat', () => {
    expect(oneLine('a\n  b\t c')).toBe('a b c');
    expect(oneLine('x'.repeat(500)).length).toBe(220);
    const j = started();
    const entry = j.add('combat', 'début', 0, { ev: 'debut', tours: 1.23456, ok: true, bad: Number.NaN, long: 'y'.repeat(200) });
    expect(entry?.d?.['tours']).toBe(1.23);
    expect(entry?.d).not.toHaveProperty('bad');
    expect(String(entry?.d?.['long']).length).toBe(80);
  });

  it('relit un journal enregistré et ignore ce qui est illisible', () => {
    expect(Journal.parse(null).size).toBe(0);
    expect(Journal.parse('pas du json').size).toBe(0);
    expect(Journal.parse('{"entries": 3}').size).toBe(0);
    const raw = JSON.stringify({ version: 1, entries: [{ t: 5, s: 1, k: 'scene', m: 'ok' }, { t: 'x', s: 1, k: 'scene', m: 'non' }, { t: 5, s: 1, k: 'inconnu', m: 'non' }, 42] });
    const j = Journal.parse(raw);
    expect(j.entries().map((e) => e.m)).toEqual(['ok']);
    expect(j.currentSession).toBe(1);
  });

  it('formate les durées', () => {
    expect(formatClock(0)).toBe('00:00');
    expect(formatClock(207_000)).toBe('03:27');
    expect(formatClock(3_807_000)).toBe('1:03:27');
    expect(formatClock(-5)).toBe('00:00');
  });
});

describe('carnet du testeur', () => {
  it('exige une description et borne sa longueur', () => {
    expect(validateDraft({ kind: 'bug', severity: null, text: '   ' })).not.toBeNull();
    expect(validateDraft({ kind: 'bug', severity: null, text: 'a' })).toBeNull();
    expect(validateDraft({ kind: 'bug', severity: null, text: 'a'.repeat(NOTE_TEXT_MAX + 1) })).not.toBeNull();
  });

  it('numérote les signalements et ne garde la gravité que pour un problème', () => {
    let book = emptyNotebook();
    const a = addNote(book, { kind: 'bug', severity: 'majeur', text: ' XP non versée ' }, here, NOW);
    book = a.book;
    const b = addNote(book, { kind: 'remarque', severity: 'bloquant', text: 'Carte trop sombre' }, here, NOW);
    book = b.book;
    expect(a.entry.id).toBe(1);
    expect(a.entry.text).toBe('XP non versée');
    expect(a.entry.severity).toBe('majeur');
    expect(b.entry.id).toBe(2);
    expect(b.entry.severity).toBeNull();
    expect(countByKind(book)).toEqual({ bug: 1, confusion: 0, remarque: 1, plaisir: 0 });
    // Un numéro retiré n'est jamais réutilisé.
    book = removeNote(book, 2);
    expect(addNote(book, { kind: 'plaisir', severity: null, text: 'La musique du port' }, here, NOW).entry.id).toBe(3);
  });

  it('plafonne le carnet, le plus ancien tombe', () => {
    let book = emptyNotebook();
    for (let i = 0; i < NOTE_MAX + 5; i++) book = addNote(book, { kind: 'remarque', severity: null, text: `note ${i}` }, here, NOW).book;
    expect(book.entries).toHaveLength(NOTE_MAX);
    expect(book.entries[0]?.text).toBe('note 5');
  });

  it('se sérialise et se relit, et tolère un fichier abîmé', () => {
    const { book } = addNote(emptyNotebook(), { kind: 'bug', severity: 'bloquant', text: 'Écran figé au combat' }, here, NOW);
    const back = parseNotebook(serializeNotebook(book));
    expect(back.entries).toEqual(book.entries);
    expect(back.nextId).toBe(2);
    expect(parseNotebook('{').entries).toEqual([]);
    expect(parseNotebook(null).nextId).toBe(1);
    const messy = JSON.stringify({ nextId: 1, entries: [{ id: 9, kind: 'bug', severity: 'majeur', text: 'ok' }, { id: 4, kind: 'bug', text: '   ' }, { id: 5, kind: '???', text: 'x' }] });
    const read = parseNotebook(messy);
    expect(read.entries.map((e) => e.id)).toEqual([9]);
    expect(read.nextId).toBe(10);
  });
});

describe('mesure de fluidité', () => {
  const run = (sampler: PerfSampler, ms: number, frame: number) => {
    const out = [];
    for (let t = 0; t < ms; t += frame) {
      const s = sampler.feed(frame);
      if (s) out.push(s);
    }
    return out;
  };

  it('rend une mesure par fenêtre de jeu', () => {
    const samples = run(new PerfSampler(), 41_000, 16.7);
    expect(samples).toHaveLength(2);
    expect(samples[0]?.fps).toBeGreaterThan(59);
    expect(samples[0]?.slowShare).toBe(0);
  });

  it('compte les images lentes et la pire image', () => {
    const sampler = new PerfSampler();
    let sample = null;
    for (let i = 0; sample === null && i < 5000; i++) sample = sampler.feed(i % 10 === 0 ? 50 : 16);
    expect(sample?.slowShare).toBeCloseTo(0.1, 1);
    expect(sample?.worstMs).toBe(50);
  });

  it('ignore les pauses et ne mesure pas un jeu à l’arrêt', () => {
    const sampler = new PerfSampler();
    expect(sampler.feed(5000)).toBeNull();
    expect(sampler.feed(0)).toBeNull();
    // Quelques images très longues mais permises (900 ms) : fenêtre pleine, trop peu d'images.
    let got = null;
    for (let i = 0; i < Math.ceil(PERF_SAMPLE.windowMs / 900) + 1; i++) got = sampler.feed(900) ?? got;
    expect(got).toBeNull();
  });

  it('décrit une mesure en français', () => {
    const text = describeSample({ fps: 58.3, worstMs: 41, slowShare: 0.04, frames: 1100 }, 118.4);
    expect(text).toBe('58,3 ips · pire image 41 ms · 4 % d’images lentes · tas 118 Mo');
    expect(describeSample({ fps: 60, worstMs: 20, slowShare: 0, frames: 1200 }, null)).not.toContain('tas');
  });
});

describe('signalement F10', () => {
  it('met en forme le type, la gravité, la description, le contexte et la fin du journal', () => {
    const j = started();
    for (let i = 0; i < REPORT_TAIL + 20; i++) j.add('monde', `pas ${i}`, 1000 * (i + 1));
    const text = buildReport({ draft: { kind: 'bug', severity: 'majeur', text: 'Le boss ne meurt pas.\nIl reste à 1 PV.' }, ctx, journal: j.entries(), sessionMs: 45 * 60_000, nowIso: NOW, noteId: 3 });
    expect(text).toContain('VAELMOR — SIGNALEMENT n° 3');
    expect(text).toContain('2026-11-06 17:53 UTC');
    expect(text).toContain('Type : Problème');
    expect(text).toContain('Gravité : Majeur (proposée par le testeur)');
    expect(text).toContain('  Le boss ne meurt pas.\n  Il reste à 1 PV.');
    expect(text).toContain('Partie : Aldric, Gardien des Marées niv. 7 · Haut-Gué · 42 min de jeu · 380 or');
    expect(text).toContain('Session de test : 45:00');
    expect(text).toContain(`Journal — ${REPORT_TAIL} dernières lignes`);
    expect(text).toContain(`pas ${REPORT_TAIL + 19}`);
    expect(text).not.toContain('pas 0\n');
  });

  it('ne parle pas de gravité hors problème et décrit l’absence de partie', () => {
    const text = buildReport({ draft: { kind: 'plaisir', severity: 'bloquant', text: 'Belle musique' }, ctx: { ...ctx, game: null }, journal: [], sessionMs: 0, nowIso: NOW });
    expect(text).toContain('Gravité : —');
    expect(text).toContain('aucune partie en cours');
    expect(text).toContain('(vide)');
    expect(text).not.toContain('n° ');
  });

  it('ne laisse passer ni adresse e-mail ni contenu de compte', () => {
    const text = buildReport({ draft: { kind: 'bug', severity: null, text: 'x' }, ctx, journal: [], sessionMs: 0, nowIso: NOW });
    expect(text).not.toMatch(/@/);
  });
});

describe('résumé et export de session', () => {
  function played(): Journal {
    const j = started();
    j.add('scene', 'Title', 100, { ev: 'start', scene: 'Title' });
    j.add('scene', 'World', 500, { ev: 'start', scene: 'World' });
    j.add('scene', 'World', 90_000, { ev: 'start', scene: 'World' });
    j.add('combat', 'début', 120_000, { ev: 'debut' });
    j.add('combat', 'victoire', 200_000, { ev: 'fin', issue: 'victoire' });
    j.add('combat', 'début', 300_000, { ev: 'debut' });
    j.add('combat', 'défaite', 400_000, { ev: 'fin', issue: 'defaite' });
    j.add('save', 'auto ok', 410_000, { ok: true });
    j.add('save', 'échec', 420_000, { ok: false });
    j.add('charge', 'emplacement 1', 430_000);
    j.add('erreur', 'TypeError', 440_000);
    j.add('erreur', 'TypeError', 440_100);
    j.add('avert', 'WebGL lent', 450_000);
    j.add('perf', 'mesure', 460_000, { fps: 60, pire: 30, tas: 100 });
    j.add('perf', 'mesure', 480_000, { fps: 40, pire: 90, tas: 130 });
    j.add('perf', 'qualité baissée', 481_000, { baisse: 'low' });
    return j;
  }

  it('résume la session à partir des données structurées', () => {
    const s = summarizeSession(played().ofSession(1));
    expect(s.scenes).toEqual(['Title', 'World']);
    expect(s).toMatchObject({ combats: 2, victories: 1, defeats: 1, saves: 1, saveFailures: 1, loads: 1, errors: 2, warnings: 1, samples: 2, fpsMean: 50, fpsMin: 40, worstFrameMs: 90, heapMaxMb: 130 });
    expect(s.qualityDrops).toEqual(['low']);
    expect(s.durationMs).toBe(481_000);
    const lines = summaryLines(s).join('\n');
    expect(lines).toContain('Combats : 2 (victoires 1, défaites 1)');
    expect(lines).toContain('moyenne 50,0 ips · plus bas 40,0 ips · pire image 90 ms · tas max 130 Mo');
    expect(lines).toContain('baissée 1 fois (low)');
  });

  it('résume une session vide sans planter', () => {
    const lines = summaryLines(summarizeSession([])).join('\n');
    expect(lines).toContain('aucune mesure');
    expect(lines).toContain('jamais baissée');
  });

  it('exporte résumé, carnet et journal complet', () => {
    const j = played();
    let book = emptyNotebook();
    book = addNote(book, { kind: 'bug', severity: 'bloquant', text: 'Combat figé' }, here, NOW).book;
    book = addNote(book, { kind: 'bug', severity: null, text: 'Texte coupé' }, here, NOW).book;
    book = addNote(book, { kind: 'plaisir', severity: null, text: 'Belle lumière' }, here, NOW).book;
    const text = buildSessionExport({ ctx, notebook: book, journal: j.entries(), session: 1, sessionMs: 481_000, nowIso: NOW });
    expect(text).toContain('VAELMOR — SESSION DE TEST');
    expect(text).toContain('Résumé de la session');
    expect(text).toContain('Carnet — 3 signalements (2 problème · 0 je ne comprends pas · 0 remarque ou idée · 1 ça m’a plu)');
    expect(text).toContain('Problèmes proposés : 1 bloquant, 0 majeur, 1 mineur ou non précisés');
    expect(text).toContain('#1 · Problème · gravité bloquant');
    expect(text).toContain('#3 · Ça m’a plu');
    expect(text).toContain(`Journal — ${j.size} lignes`);
    expect(text).toContain('[08:01] perf');
  });

  it('préfixe les lignes des sessions précédentes dans l’export', () => {
    const j = new Journal();
    j.startSession(INFO);
    j.add('scene', 'Title', 10);
    const second = Journal.parse(j.serialize());
    second.startSession(INFO);
    const text = buildSessionExport({ ctx, notebook: emptyNotebook(), journal: second.entries(), session: 2, sessionMs: 0, nowIso: NOW });
    expect(text).toMatch(/^s1 \[00:00\] session/m);
    expect(text).toMatch(/^\[00:00\] session .*session précédente : interrompue/m);
    expect(text).toContain('(carnet vide)');
  });

  it('nomme les fichiers', () => {
    expect(reportFileName('signalement', NOW, 3)).toBe('vaelmor-signalement-2026-11-06-1753-n3.txt');
    expect(reportFileName('session', NOW)).toBe('vaelmor-session-2026-11-06-1753.txt');
    expect(reportFileName('capture', NOW, 3)).toBe('vaelmor-capture-2026-11-06-1753-n3.png');
  });
});
