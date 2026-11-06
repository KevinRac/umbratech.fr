/**
 * Verdict automatique sur un journal de session (lot H de M10, décision n°279).
 *
 * Le banc automatique (`tools/session-bench.mjs`) joue une session, relit le journal
 * que le kit de test a tenu (`logic/testkit/journal.ts`) et en tire un verdict : le
 * critère de sortie de M10 demande que le banc « échoue sur toute ligne erreur, toute
 * sauvegarde en échec ou tout blocage ». Module pur : le banc lui donne les lignes
 * recueillies et l'instant de fin de la session ; rien ici ne touche au navigateur.
 *
 * Trois motifs d'échec :
 *  - `erreur` : toute ligne de type « erreur » (exception, promesse rejetée,
 *    `console.error`), regroupée par message ;
 *  - `sauvegarde` : toute ligne de type « save » qui dit un échec (`ok: false` ou
 *    « ÉCHEC » dans le texte) ;
 *  - `blocage` : un trou de plus de `STALL_MS` entre deux mesures de fluidité d'une même
 *    session (le jeu en tire une toutes les 20 s de jeu : un trou, c'est qu'il ne tournait
 *    plus), ou une session qui s'arrête sans que la dernière mesure soit récente.
 *
 * Les autres constats (avertissements, baisse de qualité, fluidité, session précédente
 * « interrompue ») sont remontés comme notes : ils ne font pas échouer le banc.
 */
import { REPEAT_WINDOW_MS as REPEAT_MERGE_MS, type JournalEntry } from './journal';

/** Trou maximal toléré entre deux mesures de fluidité d'une même session (la mesure tombe toutes les 20 s de jeu). */
export const STALL_MS = 90_000;

export interface CheckOptions {
  /** Instant de fin de chaque session connue du banc (`t` en millisecondes depuis son début), pour repérer un jeu figé à la fin. */
  readonly sessionEnds?: Readonly<Record<number, number>>;
  /** Sessions que le banc a lui-même fermées (rechargement de page voulu) : leur fin attendue est « propre ». */
  readonly plannedReloads?: readonly number[];
  readonly stallMs?: number;
}

export interface Finding {
  readonly kind: 'erreur' | 'sauvegarde' | 'blocage';
  readonly session: number;
  /** Millisecondes depuis le début de la session. */
  readonly t: number;
  readonly message: string;
  /** Nombre de lignes identiques regroupées. */
  readonly count: number;
}

export interface PerfSummary {
  readonly samples: number;
  readonly fpsMin: number;
  readonly fpsMedian: number;
  readonly fpsMax: number;
  readonly worstFrameMs: number;
  readonly heapFirstMb: number | null;
  readonly heapLastMb: number | null;
  readonly heapMaxMb: number | null;
}

export interface SessionVerdict {
  readonly ok: boolean;
  readonly findings: readonly Finding[];
  /** Constats qui ne font pas échouer le banc. */
  readonly notes: readonly string[];
  readonly counts: {
    readonly lines: number;
    readonly sessions: number;
    readonly errors: number;
    readonly warnings: number;
    readonly savesOk: number;
    readonly savesFailed: number;
    readonly loads: number;
    readonly battlesStarted: number;
    readonly victories: number;
    readonly defeats: number;
  };
  readonly perf: PerfSummary;
}

const SAVE_FAILURE = /échec|échou|impossible|refus/i;

function median(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? (sorted[mid] as number) : ((sorted[mid - 1] as number) + (sorted[mid] as number)) / 2;
}

const num = (entry: JournalEntry, key: string): number | null => {
  const v = entry.d?.[key];
  return typeof v === 'number' ? v : null;
};

/** Regroupe les lignes identiques (même session, même texte) en gardant la première heure. */
function group(kind: Finding['kind'], entries: readonly JournalEntry[]): Finding[] {
  const out = new Map<string, Finding>();
  for (const e of entries) {
    const key = `${e.s}|${e.m}`;
    const seen = out.get(key);
    const count = e.n ?? 1;
    out.set(key, seen ? { ...seen, count: seen.count + count } : { kind, session: e.s, t: e.t, message: e.m, count });
  }
  return [...out.values()];
}

function perfSummary(entries: readonly JournalEntry[]): PerfSummary {
  const perf = entries.filter((e) => e.k === 'perf' && num(e, 'fps') !== null);
  const fps = perf.map((e) => num(e, 'fps') as number);
  const worst = perf.map((e) => num(e, 'pire') ?? 0);
  const heap = perf.map((e) => num(e, 'tas')).filter((v): v is number => v !== null);
  return {
    samples: perf.length,
    fpsMin: fps.length ? Math.min(...fps) : 0,
    fpsMedian: Math.round(median(fps) * 10) / 10,
    fpsMax: fps.length ? Math.max(...fps) : 0,
    worstFrameMs: worst.length ? Math.max(...worst) : 0,
    heapFirstMb: heap.length ? (heap[0] as number) : null,
    heapLastMb: heap.length ? (heap[heap.length - 1] as number) : null,
    heapMaxMb: heap.length ? Math.max(...heap) : null,
  };
}

/** Trous de plus de `stallMs` entre deux mesures de fluidité d'une même session, et jeu figé à la fin d'une session. */
function stalls(entries: readonly JournalEntry[], options: CheckOptions): Finding[] {
  const stallMs = options.stallMs ?? STALL_MS;
  const found: Finding[] = [];
  const sessions = [...new Set(entries.map((e) => e.s))].sort((a, b) => a - b);
  for (const s of sessions) {
    const mine = entries.filter((e) => e.s === s);
    const times = mine.filter((e) => e.k === 'perf' && num(e, 'fps') !== null).map((e) => e.t);
    // Le premier repère est le début de la session (les mesures ne commencent qu'après 20 s de jeu).
    const marks = [0, ...times];
    for (let i = 1; i < marks.length; i++) {
      const gap = (marks[i] as number) - (marks[i - 1] as number);
      if (gap > stallMs) found.push({ kind: 'blocage', session: s, t: marks[i - 1] as number, message: `aucune mesure de fluidité pendant ${Math.round(gap / 1000)} s : le jeu ne tournait plus`, count: 1 });
    }
    const end = options.sessionEnds?.[s];
    if (end !== undefined) {
      const last = marks[marks.length - 1] as number;
      if (end - last > stallMs) found.push({ kind: 'blocage', session: s, t: last, message: `plus aucune mesure de fluidité depuis ${Math.round((end - last) / 1000)} s à la fin de la session : le jeu s'est arrêté`, count: 1 });
    }
  }
  return found;
}

/** Verdict du banc : échoue sur une erreur, une sauvegarde en échec ou un blocage. */
export function checkSession(entries: readonly JournalEntry[], options: CheckOptions = {}): SessionVerdict {
  const errors = entries.filter((e) => e.k === 'erreur');
  const saves = entries.filter((e) => e.k === 'save');
  const failedSaves = saves.filter((e) => e.d?.['ok'] === false || SAVE_FAILURE.test(e.m));
  const warnings = entries.filter((e) => e.k === 'avert');
  const findings: Finding[] = [...group('erreur', errors), ...group('sauvegarde', failedSaves), ...stalls(entries, options)];

  const notes: string[] = [];
  for (const w of group('erreur', warnings)) notes.push(`avertissement (${w.count}×, session ${w.session}, ${Math.round(w.t / 1000)} s) : ${w.message}`);
  const planned = new Set(options.plannedReloads ?? []);
  for (const e of entries) {
    if (e.k === 'session' && e.d?.['precedente'] === 'interrompue' && !planned.has(e.s - 1) && e.s > 1) notes.push(`session ${e.s} : la précédente s'est arrêtée sans fermeture propre`);
    if (e.k === 'session' && e.d?.['precedente'] === 'interrompue' && planned.has(e.s - 1)) notes.push(`session ${e.s} : la précédente, fermée par un rechargement voulu du banc, n'a pas écrit sa ligne de fermeture`);
  }
  const drops = entries.filter((e) => e.k === 'perf' && typeof e.d?.['baisse'] === 'string');
  if (drops.length > 0) notes.push(`qualité automatique baissée ${drops.length} fois (${drops.map((e) => String(e.d?.['baisse'])).join(', ')})`);

  const combat = entries.filter((e) => e.k === 'combat');
  const battlesStarted = combat.filter((e) => e.d?.['ev'] === 'debut').length;
  const victories = combat.filter((e) => e.d?.['ev'] === 'fin' && e.d?.['issue'] === 'victoire').length;
  const defeats = combat.filter((e) => e.d?.['ev'] === 'fin' && e.d?.['issue'] !== 'victoire').length;

  return {
    ok: findings.length === 0,
    findings,
    notes,
    counts: {
      lines: entries.length,
      sessions: new Set(entries.map((e) => e.s)).size,
      errors: errors.reduce((n, e) => n + (e.n ?? 1), 0),
      warnings: warnings.reduce((n, e) => n + (e.n ?? 1), 0),
      savesOk: saves.length - failedSaves.length,
      savesFailed: failedSaves.length,
      loads: entries.filter((e) => e.k === 'charge').length,
      battlesStarted,
      victories,
      defeats,
    },
    perf: perfSummary(entries),
  };
}

/**
 * Fusionne un nouveau relevé du journal (circulaire : 600 lignes) avec ce que le banc
 * a déjà recueilli. Une ligne est identifiée par sa session, son type, son texte et son heure ;
 * une ligne répétée (`n`) voit son heure et son compte avancer d'un relevé à l'autre : elle
 * remplace la version qu'on connaissait déjà au lieu de s'y ajouter.
 */
export function mergeJournal(known: readonly JournalEntry[], snapshot: readonly JournalEntry[]): JournalEntry[] {
  const out = [...known];
  for (const e of snapshot) {
    const same = (x: JournalEntry): boolean => x.s === e.s && x.k === e.k && x.m === e.m;
    let at = out.findIndex((x) => same(x) && x.t === e.t);
    if (at < 0 && (e.n ?? 1) > 1) {
      for (let i = out.length - 1; i >= 0; i--) {
        const x = out[i] as JournalEntry;
        if (same(x) && x.t <= e.t && e.t - x.t <= REPEAT_MERGE_MS * (e.n ?? 1)) {
          at = i;
          break;
        }
      }
    }
    if (at >= 0) {
      if ((e.n ?? 1) >= ((out[at] as JournalEntry).n ?? 1)) out[at] = e;
      continue;
    }
    out.push(e);
  }
  return out.sort((a, b) => a.s - b.s || a.t - b.t);
}
