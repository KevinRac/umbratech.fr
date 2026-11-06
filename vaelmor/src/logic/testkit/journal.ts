/**
 * Journal de session (lot H de M10, décision n°273). Logique pure : le journal
 * est un tampon circulaire de lignes courtes (`JournalEntry`) que `core/testkit.ts`
 * alimente (scènes ouvertes, combats, sauvegardes, erreurs, mesures de fluidité)
 * et que le rapport F10 et l'export de session recopient.
 *
 * Aucune horloge ici : l'appelant donne l'heure de chaque ligne (millisecondes
 * depuis le début de la session), ce qui rend le tampon rejouable en test.
 * Le journal ne contient jamais de données personnelles (ni adresse e-mail, ni
 * contenu de sauvegarde) et n'est envoyé nulle part : il reste dans le navigateur
 * jusqu'à ce que le testeur copie ou télécharge un rapport (n°247).
 */

/** Familles de lignes du journal. */
export const JOURNAL_KINDS = ['session', 'scene', 'monde', 'combat', 'save', 'charge', 'reglage', 'perf', 'erreur', 'avert', 'carnet', 'fin'] as const;
export type JournalKind = (typeof JOURNAL_KINDS)[number];

/** Données structurées facultatives d'une ligne : à plat, pour rester lisibles et faciles à compter. */
export type JournalData = Readonly<Record<string, string | number | boolean>>;

export interface JournalEntry {
  /** Millisecondes écoulées depuis le début de la session `s`. */
  readonly t: number;
  /** Numéro de la session (1, 2…) : une nouvelle page chargée ouvre une nouvelle session. */
  readonly s: number;
  readonly k: JournalKind;
  /** Texte court, sur une ligne. */
  readonly m: string;
  readonly d?: JournalData;
  /** Nombre de répétitions consécutives de la même ligne (absent = 1). */
  readonly n?: number;
}

/** Nombre maximal de lignes gardées (les plus anciennes tombent d'abord). */
export const JOURNAL_CAP = 600;
/** Longueur maximale d'une ligne de texte. */
export const MESSAGE_MAX = 220;
/** Deux lignes identiques de moins d'une seconde d'écart sont regroupées (une erreur qui boucle ne noie pas le journal). */
export const REPEAT_WINDOW_MS = 1000;

/** Comment la session précédente s'est terminée, vu au démarrage de celle-ci. */
export type PreviousEnd = 'aucune' | 'propre' | 'interrompue';

/** Ramène un texte quelconque à une ligne courte. */
export function oneLine(text: string, max = MESSAGE_MAX): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.length > max ? `${flat.slice(0, Math.max(0, max - 1))}…` : flat;
}

function cleanData(data: JournalData | undefined): JournalData | undefined {
  if (!data) return undefined;
  const out: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'number') {
      if (Number.isFinite(value)) out[key] = Math.round(value * 100) / 100;
    } else if (typeof value === 'boolean') out[key] = value;
    else if (typeof value === 'string') out[key] = oneLine(value, 80);
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

export class Journal {
  private list: JournalEntry[];
  private readonly cap: number;
  private session: number;

  constructor(entries: readonly JournalEntry[] = [], cap = JOURNAL_CAP) {
    this.cap = Math.max(10, cap);
    this.list = entries.slice(-this.cap);
    this.session = this.list.reduce((max, e) => Math.max(max, e.s), 0);
  }

  /** Numéro de la session en cours (0 tant qu'aucune n'a démarré). */
  get currentSession(): number {
    return this.session;
  }

  get size(): number {
    return this.list.length;
  }

  /** Dernière ligne de la dernière session : la session précédente a-t-elle fini proprement ? */
  previousEnd(): PreviousEnd {
    const last = this.list[this.list.length - 1];
    if (!last) return 'aucune';
    return last.k === 'fin' ? 'propre' : 'interrompue';
  }

  /** Ouvre une nouvelle session ; la première ligne dit comment la précédente s'est terminée. */
  startSession(info: { readonly version: string; readonly milestone: string }): JournalEntry {
    const previous = this.previousEnd();
    this.session += 1;
    return this.push({
      t: 0,
      s: this.session,
      k: 'session',
      m: `démarrage v${info.version} ${info.milestone} · session précédente : ${previous}`,
      d: { precedente: previous },
    });
  }

  /** Ajoute une ligne ; `t` : millisecondes depuis le début de la session. */
  add(kind: JournalKind, message: string, t: number, data?: JournalData): JournalEntry | null {
    if (this.session === 0) return null;
    const text = oneLine(message);
    if (text === '') return null;
    const last = this.list[this.list.length - 1];
    if (last && last.s === this.session && last.k === kind && last.m === text && t - last.t <= REPEAT_WINDOW_MS && kind !== 'perf') {
      const merged: JournalEntry = { ...last, t, n: (last.n ?? 1) + 1 };
      this.list[this.list.length - 1] = merged;
      return merged;
    }
    const entry: JournalEntry = { t: Math.max(0, Math.round(t)), s: this.session, k: kind, m: text, ...(data ? { d: cleanData(data) } : {}) };
    return this.push(entry);
  }

  private push(entry: JournalEntry): JournalEntry {
    const clean: JournalEntry = entry.d === undefined ? { t: entry.t, s: entry.s, k: entry.k, m: entry.m, ...(entry.n ? { n: entry.n } : {}) } : entry;
    this.list.push(clean);
    if (this.list.length > this.cap) this.list = this.list.slice(-this.cap);
    return clean;
  }

  entries(): readonly JournalEntry[] {
    return this.list;
  }

  /** Les `count` dernières lignes (toutes sessions confondues). */
  tail(count: number): readonly JournalEntry[] {
    return count <= 0 ? [] : this.list.slice(-count);
  }

  /** Lignes d'une session. */
  ofSession(session: number): readonly JournalEntry[] {
    return this.list.filter((e) => e.s === session);
  }

  serialize(): string {
    return JSON.stringify({ version: 1, entries: this.list });
  }

  /** Relit un journal enregistré ; tout ce qui est illisible est ignoré (jamais d'exception). */
  static parse(raw: string | null | undefined, cap = JOURNAL_CAP): Journal {
    if (!raw) return new Journal([], cap);
    try {
      const data = JSON.parse(raw) as unknown;
      const source = data && typeof data === 'object' ? (data as { entries?: unknown }).entries : null;
      if (!Array.isArray(source)) return new Journal([], cap);
      const entries: JournalEntry[] = [];
      for (const item of source) {
        const entry = readEntry(item);
        if (entry) entries.push(entry);
      }
      return new Journal(entries, cap);
    } catch {
      return new Journal([], cap);
    }
  }
}

function readEntry(item: unknown): JournalEntry | null {
  if (!item || typeof item !== 'object') return null;
  const o = item as Record<string, unknown>;
  const kind = o['k'];
  if (typeof o['t'] !== 'number' || typeof o['s'] !== 'number' || typeof o['m'] !== 'string') return null;
  if (!(JOURNAL_KINDS as readonly unknown[]).includes(kind)) return null;
  const data = o['d'] && typeof o['d'] === 'object' && !Array.isArray(o['d']) ? cleanData(o['d'] as JournalData) : undefined;
  const n = typeof o['n'] === 'number' && o['n'] > 1 ? Math.floor(o['n']) : undefined;
  return {
    t: Math.max(0, Math.round(o['t'])),
    s: Math.max(1, Math.floor(o['s'])),
    k: kind as JournalKind,
    m: oneLine(o['m']),
    ...(data ? { d: data } : {}),
    ...(n ? { n } : {}),
  };
}

/** « 03:27 » (minutes:secondes) ; au-delà d'une heure « 1:03:27 ». */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const two = (n: number): string => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${two(m)}:${two(s)}` : `${two(m)}:${two(s)}`;
}

/** Une ligne de journal mise en forme : « [03:27] combat   début : camp des Écumeurs (×3) ». */
export function formatEntry(entry: JournalEntry): string {
  const times = entry.n && entry.n > 1 ? ` (×${entry.n})` : '';
  return `[${formatClock(entry.t)}] ${entry.k.padEnd(7)} ${entry.m}${times}`;
}
