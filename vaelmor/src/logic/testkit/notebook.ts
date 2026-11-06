/**
 * Carnet du testeur (lot H de M10, décisions n°247 et n°274). Logique pure.
 *
 * Chaque signalement saisi avec F10 est rangé dans le carnet, qui reste dans le
 * navigateur du testeur (`vaelmor:notebook`). À la fin de la session, le testeur
 * exporte le carnet avec le journal et l'envoie lui-même à l'auteur : rien ne part
 * tout seul.
 *
 * Les gravités reprennent le barème du jalon (n°230, `docs/TESTS_M10.md`) ; le
 * testeur propose, l'auteur tranche.
 */

export const NOTE_KINDS = ['bug', 'confusion', 'remarque', 'plaisir'] as const;
export type NoteKind = (typeof NOTE_KINDS)[number];

export const NOTE_KIND_LABEL: Readonly<Record<NoteKind, string>> = {
  bug: 'Problème',
  confusion: 'Je ne comprends pas',
  remarque: 'Remarque ou idée',
  plaisir: 'Ça m’a plu',
};

/** Aide en une ligne, sous le choix du type. */
export const NOTE_KIND_HINT: Readonly<Record<NoteKind, string>> = {
  bug: 'Le jeu se comporte de façon fausse, plante ou se fige.',
  confusion: 'Tu ne sais pas quoi faire, ou une règle te surprend.',
  remarque: 'Ce serait mieux autrement, ou il manque quelque chose.',
  plaisir: 'Un moment, une musique, une idée qui fonctionne.',
};

export const SEVERITIES = ['bloquant', 'majeur', 'mineur'] as const;
export type Severity = (typeof SEVERITIES)[number];

export const SEVERITY_LABEL: Readonly<Record<Severity, string>> = { bloquant: 'Bloquant', majeur: 'Majeur', mineur: 'Mineur' };

/** Définitions du barème (n°230), affichées sous le choix de la gravité. */
export const SEVERITY_HINT: Readonly<Record<Severity, string>> = {
  bloquant: 'On ne peut plus avancer, ou une sauvegarde est perdue.',
  majeur: 'Une règle est fausse, le jeu plante mais repart, ou de la progression est perdue.',
  mineur: 'Défaut de visuel, de texte ou de confort.',
};

export const NOTE_TEXT_MAX = 2000;
export const NOTE_MAX = 200;

export interface NoteDraft {
  readonly kind: NoteKind;
  /** Gravité proposée ; seulement pour un « problème » (ignorée sinon). */
  readonly severity: Severity | null;
  readonly text: string;
}

export interface NoteContext {
  /** Lieu ou zone en toutes lettres (« Haut-Gué »), ou « titre ». */
  readonly place: string;
  /** Scènes ouvertes (« World, WorldHud »). */
  readonly scenes: string;
  /** Temps de jeu de la partie en millisecondes (0 au titre). */
  readonly playMs: number;
  /** Millisecondes depuis le début de la session de test. */
  readonly sessionMs: number;
}

export interface NoteEntry {
  readonly id: number;
  readonly at: string;
  readonly kind: NoteKind;
  readonly severity: Severity | null;
  readonly text: string;
  readonly place: string;
  readonly scenes: string;
  readonly playMs: number;
  readonly sessionMs: number;
}

export interface Notebook {
  readonly version: 1;
  readonly nextId: number;
  readonly entries: readonly NoteEntry[];
}

export const emptyNotebook = (): Notebook => ({ version: 1, nextId: 1, entries: [] });

export const isNoteKind = (value: unknown): value is NoteKind => (NOTE_KINDS as readonly unknown[]).includes(value);
export const isSeverity = (value: unknown): value is Severity => (SEVERITIES as readonly unknown[]).includes(value);

/** Message d'erreur à montrer au testeur, ou null si le brouillon peut être enregistré. */
export function validateDraft(draft: NoteDraft): string | null {
  const text = draft.text.trim();
  if (text === '') return 'Écris au moins une phrase : que s’est-il passé ?';
  if (text.length > NOTE_TEXT_MAX) return `Texte trop long (${NOTE_TEXT_MAX} signes au plus).`;
  return null;
}

/** Ajoute un signalement ; le plus ancien tombe si le carnet est plein. Renvoie le carnet et la ligne créée. */
export function addNote(book: Notebook, draft: NoteDraft, context: NoteContext, nowIso: string): { readonly book: Notebook; readonly entry: NoteEntry } {
  const entry: NoteEntry = {
    id: book.nextId,
    at: nowIso,
    kind: draft.kind,
    severity: draft.kind === 'bug' ? draft.severity : null,
    text: draft.text.trim().slice(0, NOTE_TEXT_MAX),
    place: context.place,
    scenes: context.scenes,
    playMs: Math.max(0, Math.round(context.playMs)),
    sessionMs: Math.max(0, Math.round(context.sessionMs)),
  };
  const entries = [...book.entries, entry].slice(-NOTE_MAX);
  return { book: { version: 1, nextId: book.nextId + 1, entries }, entry };
}

export function removeNote(book: Notebook, id: number): Notebook {
  return { ...book, entries: book.entries.filter((e) => e.id !== id) };
}

export function serializeNotebook(book: Notebook): string {
  return JSON.stringify(book);
}

/** Relit le carnet enregistré ; une ligne illisible est ignorée, un fichier illisible donne un carnet vide. */
export function parseNotebook(raw: string | null | undefined): Notebook {
  if (!raw) return emptyNotebook();
  try {
    const data = JSON.parse(raw) as unknown;
    if (!data || typeof data !== 'object') return emptyNotebook();
    const source = (data as { entries?: unknown }).entries;
    if (!Array.isArray(source)) return emptyNotebook();
    const entries: NoteEntry[] = [];
    for (const item of source) {
      const entry = readNote(item);
      if (entry) entries.push(entry);
    }
    const maxId = entries.reduce((m, e) => Math.max(m, e.id), 0);
    const declared = (data as { nextId?: unknown }).nextId;
    const nextId = typeof declared === 'number' && Number.isFinite(declared) ? Math.max(Math.floor(declared), maxId + 1) : maxId + 1;
    return { version: 1, nextId, entries: entries.slice(-NOTE_MAX) };
  } catch {
    return emptyNotebook();
  }
}

function readNote(item: unknown): NoteEntry | null {
  if (!item || typeof item !== 'object') return null;
  const o = item as Record<string, unknown>;
  if (typeof o['id'] !== 'number' || typeof o['text'] !== 'string' || o['text'].trim() === '' || !isNoteKind(o['kind'])) return null;
  const kind = o['kind'];
  const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.round(v)) : 0);
  return {
    id: Math.floor(o['id']),
    at: typeof o['at'] === 'string' ? o['at'] : '',
    kind,
    severity: kind === 'bug' && isSeverity(o['severity']) ? o['severity'] : null,
    text: o['text'].slice(0, NOTE_TEXT_MAX),
    place: typeof o['place'] === 'string' ? o['place'] : '',
    scenes: typeof o['scenes'] === 'string' ? o['scenes'] : '',
    playMs: num(o['playMs']),
    sessionMs: num(o['sessionMs']),
  };
}

/** Nombre de signalements par type (pour le titre de l'écran F10 et le résumé d'export). */
export function countByKind(book: Notebook): Readonly<Record<NoteKind, number>> {
  const out: Record<NoteKind, number> = { bug: 0, confusion: 0, remarque: 0, plaisir: 0 };
  for (const e of book.entries) out[e.kind] += 1;
  return out;
}

/** Libellé de gravité d'un signalement (« — » hors problème). */
export const severityText = (severity: Severity | null): string => (severity ? SEVERITY_LABEL[severity] : '—');
