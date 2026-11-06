/**
 * Rapports du kit de test (lot H de M10, décisions n°247, n°274 et n°276).
 * Logique pure : met en forme, en texte brut, ce que `core/testkit.ts` a
 * rassemblé (contexte du jeu, journal de session, carnet).
 *
 * Deux sorties :
 * - le **signalement** (F10) : un problème, son contexte et la fin du journal ;
 * - l'**export de session** : résumé, carnet entier et journal complet, à envoyer
 *   en fin de session.
 *
 * Rien ici ne contient d'adresse e-mail, de contenu de sauvegarde ni de réglage
 * du compte : le texte ne dépend que de ce qui est passé en argument.
 */
import { formatClock, formatEntry, type JournalEntry } from './journal';
import { NOTE_KIND_LABEL, SEVERITY_LABEL, countByKind, severityText, type NoteDraft, type NoteEntry, type Notebook } from './notebook';

/** Partie en cours, telle que le résumé des sauvegardes la décrit. */
export interface ReportGame {
  readonly heroName: string;
  readonly heroClass: string;
  readonly heroLevel: number;
  readonly place: string;
  readonly playMs: number;
  readonly gold: number;
  readonly mode: string;
  readonly companySize: number;
}

export interface ReportContext {
  readonly version: string;
  readonly milestone: string;
  readonly userAgent: string;
  readonly language: string;
  /** « 1920×1080 à ×1 » : fenêtre du navigateur et rapport de pixels. */
  readonly screen: string;
  /** Réglages utiles au diagnostic, nom → valeur lisible (jamais la liste des touches ni le compte). */
  readonly settings: Readonly<Record<string, string>>;
  readonly scenes: readonly string[];
  readonly game: ReportGame | null;
  readonly storage: 'disponible' | 'indisponible';
  /** Tas JavaScript en Mo (Chrome seulement), ou null. */
  readonly heapMb: number | null;
}

/** Nombre de lignes de journal jointes à un signalement. */
export const REPORT_TAIL = 60;

const RULE = '────────────────────────────────────────';

function indent(text: string, pad = '  '): string {
  return text
    .split('\n')
    .map((line) => (line === '' ? '' : `${pad}${line}`))
    .join('\n');
}

function playTime(ms: number): string {
  return `${Math.floor(ms / 60_000)} min`;
}

function gameLine(game: ReportGame | null): string {
  if (!game) return 'aucune partie en cours (écran titre ou menu)';
  return `${game.heroName}, ${game.heroClass} niv. ${game.heroLevel} · ${game.place} · ${playTime(game.playMs)} de jeu · ${game.gold} or · mode ${game.mode} · compagnie de ${game.companySize}`;
}

function contextBlock(ctx: ReportContext, sessionMs: number): string {
  const settings = Object.entries(ctx.settings)
    .map(([key, value]) => `${key} ${value}`)
    .join(' · ');
  return [
    `Version : ${ctx.version} (jalon ${ctx.milestone})`,
    `Session de test : ${formatClock(sessionMs)} depuis l’ouverture de la page`,
    `Partie : ${gameLine(ctx.game)}`,
    `Scènes ouvertes : ${ctx.scenes.length > 0 ? ctx.scenes.join(', ') : '—'}`,
    `Navigateur : ${ctx.userAgent}`,
    `Écran : ${ctx.screen} · langue ${ctx.language} · stockage local ${ctx.storage}${ctx.heapMb === null ? '' : ` · tas ${Math.round(ctx.heapMb)} Mo`}`,
    `Réglages : ${settings || '—'}`,
  ].join('\n');
}

/** Date et heure à la minute, en UTC, pour les en-têtes (« 2026-11-06 17:53 UTC »). */
export function stamp(iso: string): string {
  return `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC`;
}

export interface ReportInput {
  readonly draft: NoteDraft;
  readonly ctx: ReportContext;
  readonly journal: readonly JournalEntry[];
  readonly sessionMs: number;
  readonly nowIso: string;
  /** Numéro du signalement dans le carnet, s'il a déjà été rangé. */
  readonly noteId?: number;
}

/** Signalement F10 : texte brut prêt à être collé dans un message ou joint en fichier. */
export function buildReport(input: ReportInput): string {
  const { draft, ctx, journal, sessionMs, nowIso, noteId } = input;
  const severity = draft.kind === 'bug' ? (draft.severity ? `${SEVERITY_LABEL[draft.severity]} (proposée par le testeur)` : 'non précisée') : '—';
  const tail = journal.slice(-REPORT_TAIL);
  return [
    `VAELMOR — SIGNALEMENT${noteId === undefined ? '' : ` n° ${noteId}`}`,
    stamp(nowIso),
    '',
    `Type : ${NOTE_KIND_LABEL[draft.kind]}`,
    `Gravité : ${severity}`,
    'Description :',
    indent(draft.text.trim() || '(vide)'),
    '',
    RULE,
    contextBlock(ctx, sessionMs),
    '',
    RULE,
    `Journal — ${tail.length} dernière${tail.length > 1 ? 's' : ''} ligne${tail.length > 1 ? 's' : ''}`,
    ...(tail.length > 0 ? tail.map(formatEntry) : ['(vide)']),
    '',
  ].join('\n');
}

/* ---------- Résumé d'une session ---------- */

export interface SessionSummary {
  readonly durationMs: number;
  readonly scenes: readonly string[];
  readonly combats: number;
  readonly victories: number;
  readonly defeats: number;
  readonly saves: number;
  readonly saveFailures: number;
  readonly loads: number;
  readonly errors: number;
  readonly warnings: number;
  readonly samples: number;
  /** Moyenne des ips sur les mesures, ou null sans mesure. */
  readonly fpsMean: number | null;
  readonly fpsMin: number | null;
  readonly worstFrameMs: number | null;
  readonly heapMaxMb: number | null;
  /** Crans de qualité perdus pendant la session, dans l'ordre. */
  readonly qualityDrops: readonly string[];
}

const num = (value: unknown): number | null => (typeof value === 'number' && Number.isFinite(value) ? value : null);
const times = (e: JournalEntry): number => e.n ?? 1;

/** Résume les lignes d'une session (à passer : `journal.ofSession(n)`). */
export function summarizeSession(entries: readonly JournalEntry[]): SessionSummary {
  const scenes: string[] = [];
  let combats = 0;
  let victories = 0;
  let defeats = 0;
  let saves = 0;
  let saveFailures = 0;
  let loads = 0;
  let errors = 0;
  let warnings = 0;
  const fps: number[] = [];
  let worst: number | null = null;
  let heap: number | null = null;
  const drops: string[] = [];
  let duration = 0;
  for (const e of entries) {
    duration = Math.max(duration, e.t);
    const d = e.d ?? {};
    switch (e.k) {
      case 'scene': {
        const scene = typeof d['scene'] === 'string' ? d['scene'] : null;
        if (scene && d['ev'] === 'start' && !scenes.includes(scene)) scenes.push(scene);
        break;
      }
      case 'combat':
        if (d['ev'] === 'debut') combats += times(e);
        if (d['ev'] === 'fin') {
          if (d['issue'] === 'victoire') victories += times(e);
          else defeats += times(e);
        }
        break;
      case 'save':
        if (d['ok'] === false) saveFailures += times(e);
        else saves += times(e);
        break;
      case 'charge':
        loads += times(e);
        break;
      case 'erreur':
        errors += times(e);
        break;
      case 'avert':
        warnings += times(e);
        break;
      case 'perf': {
        const f = num(d['fps']);
        if (f !== null) fps.push(f);
        const w = num(d['pire']);
        if (w !== null) worst = worst === null ? w : Math.max(worst, w);
        const h = num(d['tas']);
        if (h !== null) heap = heap === null ? h : Math.max(heap, h);
        if (typeof d['baisse'] === 'string') drops.push(d['baisse']);
        break;
      }
      default:
        break;
    }
  }
  const mean = fps.length > 0 ? Math.round((fps.reduce((a, b) => a + b, 0) / fps.length) * 10) / 10 : null;
  return {
    durationMs: duration,
    scenes,
    combats,
    victories,
    defeats,
    saves,
    saveFailures,
    loads,
    errors,
    warnings,
    samples: fps.length,
    fpsMean: mean,
    fpsMin: fps.length > 0 ? Math.min(...fps) : null,
    worstFrameMs: worst,
    heapMaxMb: heap,
    qualityDrops: drops,
  };
}

const oneDecimal = (n: number): string => n.toFixed(1).replace('.', ',');

/** Résumé en lignes de texte (export de session). */
export function summaryLines(s: SessionSummary): string[] {
  const perf =
    s.samples === 0
      ? 'aucune mesure (session trop courte)'
      : `${s.samples} mesure${s.samples > 1 ? 's' : ''} · moyenne ${oneDecimal(s.fpsMean ?? 0)} ips · plus bas ${oneDecimal(s.fpsMin ?? 0)} ips · pire image ${s.worstFrameMs ?? 0} ms${s.heapMaxMb === null ? '' : ` · tas max ${Math.round(s.heapMaxMb)} Mo`}`;
  return [
    `Durée : ${formatClock(s.durationMs)}`,
    `Écrans parcourus : ${s.scenes.length > 0 ? s.scenes.join(', ') : '—'}`,
    `Combats : ${s.combats} (victoires ${s.victories}, défaites ${s.defeats})`,
    `Sauvegardes : ${s.saves} réussie${s.saves > 1 ? 's' : ''}, ${s.saveFailures} échec${s.saveFailures > 1 ? 's' : ''} · chargements ${s.loads}`,
    `Erreurs du jeu : ${s.errors} · avertissements : ${s.warnings}`,
    `Fluidité : ${perf}`,
    `Qualité des effets : ${s.qualityDrops.length === 0 ? 'jamais baissée' : `baissée ${s.qualityDrops.length} fois (${s.qualityDrops.join(' → ')})`}`,
  ];
}

/* ---------- Export de session ---------- */

function noteBlock(note: NoteEntry): string {
  const head = `#${note.id} · ${NOTE_KIND_LABEL[note.kind]}${note.kind === 'bug' ? ` · gravité ${severityText(note.severity).toLowerCase()}` : ''} · ${formatClock(note.sessionMs)} de session · ${playTime(note.playMs)} de jeu · ${note.place || '—'}`;
  return [head, indent(note.text), ''].join('\n');
}

export interface SessionExportInput {
  readonly ctx: ReportContext;
  readonly notebook: Notebook;
  /** Journal complet (toutes les sessions gardées). */
  readonly journal: readonly JournalEntry[];
  /** Numéro de la session en cours. */
  readonly session: number;
  readonly sessionMs: number;
  readonly nowIso: string;
}

/** Export de fin de session : résumé, carnet et journal complet. */
export function buildSessionExport(input: SessionExportInput): string {
  const { ctx, notebook, journal, session, sessionMs, nowIso } = input;
  const own = journal.filter((e) => e.s === session);
  const counts = countByKind(notebook);
  const countsText = (Object.keys(counts) as (keyof typeof counts)[]).map((k) => `${counts[k]} ${NOTE_KIND_LABEL[k].toLowerCase()}`).join(' · ');
  const bugs = notebook.entries.filter((e) => e.kind === 'bug');
  const blockers = bugs.filter((e) => e.severity === 'bloquant').length;
  const majors = bugs.filter((e) => e.severity === 'majeur').length;
  return [
    'VAELMOR — SESSION DE TEST',
    stamp(nowIso),
    '',
    contextBlock(ctx, sessionMs),
    '',
    RULE,
    'Résumé de la session',
    ...summaryLines(summarizeSession(own)).map((l) => `  ${l}`),
    '',
    RULE,
    `Carnet — ${notebook.entries.length} signalement${notebook.entries.length > 1 ? 's' : ''}${notebook.entries.length > 0 ? ` (${countsText})` : ''}`,
    ...(bugs.length > 0 ? [`Problèmes proposés : ${blockers} bloquant${blockers > 1 ? 's' : ''}, ${majors} majeur${majors > 1 ? 's' : ''}, ${bugs.length - blockers - majors} mineur${bugs.length - blockers - majors > 1 ? 's' : ''} ou non précisés`] : []),
    '',
    ...(notebook.entries.length > 0 ? notebook.entries.map(noteBlock) : ['(carnet vide)', '']),
    RULE,
    `Journal — ${journal.length} ligne${journal.length > 1 ? 's' : ''} (session ${session} en dernier)`,
    ...(journal.length > 0 ? journal.map((e) => (e.s === session ? formatEntry(e) : `s${e.s} ${formatEntry(e)}`)) : ['(vide)']),
    '',
  ].join('\n');
}

/** Nom de fichier : `vaelmor-signalement-2026-11-06-1753-n3.txt` ou `vaelmor-session-2026-11-06-1753.txt`. */
export function reportFileName(kind: 'signalement' | 'session' | 'capture', iso: string, noteId?: number): string {
  const day = iso.slice(0, 10);
  const hm = `${iso.slice(11, 13)}${iso.slice(14, 16)}`;
  const id = noteId === undefined ? '' : `-n${noteId}`;
  return `vaelmor-${kind}-${day}-${hm}${id}.${kind === 'capture' ? 'png' : 'txt'}`;
}
