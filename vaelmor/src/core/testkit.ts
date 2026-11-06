/**
 * Kit de test (lot H de M10, décisions n°247 et n°273 à n°278) : relie la
 * logique pure de `logic/testkit/` au jeu en marche.
 *
 * - **Journal de session** : alimenté sans toucher aux scènes (ouvertures et
 *   fermetures de scènes, erreurs et avertissements du navigateur, réglages
 *   changés, mesures de fluidité toutes les 20 s) et par quelques appels
 *   explicites (`logEvent`) pour les combats, les sauvegardes et le monde.
 *   Il est enregistré dans le navigateur (`vaelmor:journal`) pour survivre à un
 *   plantage ou à un rechargement.
 * - **Carnet du testeur** : les signalements saisis avec F10 (`vaelmor:notebook`).
 * - **Rien n'est envoyé** : le testeur copie ou télécharge lui-même ses rapports.
 *
 * Toute fonction d'ici est sans danger : une erreur du kit ne doit jamais gêner le jeu.
 */
import Phaser from 'phaser';
import { loadVolume } from '../audio/engine';
import { loadGameData } from '../data';
import { SAVE_KEYS } from '../logic/save/keys';
import { summarize } from '../logic/save/snapshot';
import { ANIM_SPEED_LABEL, BATTLE_VIEW_LABEL, loadAnimSpeed, loadBattleView, loadColorBlind, loadQuality, loadQualitySetting, loadReducedMotion, loadTextSize, loadTextSpeed, onSettingsChange, readSetting } from './settings';
import { REDUCED_MOTION_LABEL, TEXT_SIZE_LABEL, TEXT_SPEED_LABEL } from '../logic/settings/accessibility';
import { Journal, type JournalData, type JournalEntry, type JournalKind } from '../logic/testkit/journal';
import { addNote, emptyNotebook, parseNotebook, serializeNotebook, validateDraft, type NoteDraft, type NoteEntry, type Notebook } from '../logic/testkit/notebook';
import { PerfSampler, describeSample } from '../logic/testkit/perfSampler';
import { buildReport, buildSessionExport, type ReportContext, type ReportGame } from '../logic/testkit/report';
import { QUALITY_LABEL, QUALITY_SETTING_LABEL } from '../render/atmosphere';
import { getDisplayInfo } from '../render/displayScaler';
import { GAME_VERSION, MILESTONE } from './config';
import { getWorldState } from './session';
import { isStorageAvailable, readRaw, writeRaw } from './storage';

/** Réglages dont le changement est écrit au journal (la liste des touches n'est jamais recopiée). */
const LOGGED_SETTINGS = new Set(['quality', 'battleAnim', 'battleView', 'reducedFx', 'textSize', 'textSpeed', 'colorBlind', 'musicVolume', 'sfxVolume', 'ambienceVolume', 'keys']);
const SAVE_EVERY_MS = 5000;

let journal = new Journal();
let notebook: Notebook = emptyNotebook();
let started = false;
let dirty = false;
let t0 = 0;
let place: string | null = null;
let gameRef: Phaser.Game | null = null;
let inHook = false;

/** Millisecondes depuis le début de la session. */
export function sessionMs(): number {
  return Math.max(0, Math.round(performance.now() - t0));
}

/** Écrit une ligne au journal ; sans effet avant `startTestkit`. */
export function logEvent(kind: JournalKind, message: string, data?: JournalData): void {
  if (!started || inHook) return;
  try {
    journal.add(kind, message, sessionMs(), data);
    dirty = true;
  } catch {
    /* le journal ne doit jamais gêner le jeu */
  }
}

/** Lieu ou zone où se trouve le héros (null : hors du monde). Appelé par la scène du monde. */
export function setPlace(name: string | null): void {
  place = name;
}

export const currentPlace = (): string | null => place;

function persist(): void {
  if (!dirty) return;
  dirty = false;
  writeRaw(SAVE_KEYS.journal, journal.serialize());
}

function heapMb(): number | null {
  const memory = (performance as unknown as { memory?: { usedJSHeapSize?: number } }).memory;
  return memory?.usedJSHeapSize ? memory.usedJSHeapSize / 1_048_576 : null;
}

/** Démarre le kit : appelé une fois par `main.ts`, juste après la création du jeu. */
export function startTestkit(game: Phaser.Game): void {
  if (started) return;
  try {
    gameRef = game;
    t0 = performance.now();
    journal = Journal.parse(readRaw(SAVE_KEYS.journal));
    notebook = parseNotebook(readRaw(SAVE_KEYS.notebook));
    journal.startSession({ version: GAME_VERSION, milestone: MILESTONE });
    started = true;
    dirty = true;
    persist();
    hookErrors();
    hookConsole();
    hookSettings();
    hookPage();
    hookPerf(game);
    hookScenes(game);
    window.setInterval(persist, SAVE_EVERY_MS);
    if (!isStorageAvailable()) logEvent('avert', 'stockage local indisponible : journal et carnet gardés en mémoire seulement');
  } catch {
    started = false;
  }
}

/* ---------- Sources du journal ---------- */

function hookErrors(): void {
  window.addEventListener('error', (event) => {
    const where = event.filename ? ` (${event.filename.split('/').pop() ?? ''}:${event.lineno})` : '';
    logEvent('erreur', `${event.message || 'erreur'}${where}`);
  });
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason as unknown;
    logEvent('erreur', `promesse rejetée : ${reason instanceof Error ? reason.message : String(reason)}`);
  });
}

/** `console.error` et `console.warn` passent aussi au journal (Phaser et le jeu y signalent leurs problèmes). */
function hookConsole(): void {
  for (const level of ['error', 'warn'] as const) {
    const original = console[level].bind(console);
    console[level] = (...args: unknown[]): void => {
      original(...args);
      if (inHook) return;
      inHook = true;
      try {
        const text = args.map((a) => (a instanceof Error ? a.message : typeof a === 'string' ? a : JSON.stringify(a))).join(' ');
        inHook = false;
        logEvent(level === 'error' ? 'erreur' : 'avert', text);
      } catch {
        /* rien */
      } finally {
        inHook = false;
      }
    };
  }
}

function hookSettings(): void {
  onSettingsChange((key) => {
    if (key === 'qualityAuto') {
      logEvent('perf', `qualité automatique baissée : ${String(readSetting('qualityAuto'))}`, { baisse: String(readSetting('qualityAuto')) });
      return;
    }
    if (!LOGGED_SETTINGS.has(key)) return;
    if (key === 'keys') logEvent('reglage', 'touches modifiées');
    else logEvent('reglage', `${key} = ${String(readSetting(key) ?? 'par défaut')}`, { cle: key });
  });
}

function hookPage(): void {
  document.addEventListener('visibilitychange', () => {
    logEvent('session', document.hidden ? 'onglet masqué' : 'onglet de nouveau visible');
    if (document.hidden) persist();
  });
  window.addEventListener('pagehide', () => {
    logEvent('fin', 'fermeture de la page');
    persist();
  });
}

function hookPerf(game: Phaser.Game): void {
  const sampler = new PerfSampler();
  game.events.on(Phaser.Core.Events.STEP, () => {
    const sample = sampler.feed(game.loop.rawDelta);
    if (!sample) return;
    const heap = heapMb();
    logEvent('perf', describeSample(sample, heap), { fps: sample.fps, pire: sample.worstMs, lente: sample.slowShare, ...(heap === null ? {} : { tas: Math.round(heap) }) });
  });
}

/**
 * Les scènes du jeu n'existent pas encore quand le journal démarre (Phaser les crée au démarrage du
 * jeu) : on les accroche dès qu'elles apparaissent, à chaque image jusqu'à ce que toutes le soient.
 */
function hookScenes(game: Phaser.Game): void {
  const hooked = new Set<string>();
  const attach = (): boolean => {
    const scenes = game.scene.getScenes(false);
    for (const scene of scenes) {
      const key = scene.scene.key;
      if (key === 'Debug' || hooked.has(key)) continue;
      hooked.add(key);
      scene.events.on(Phaser.Scenes.Events.START, () => logEvent('scene', `${key} démarre`, { ev: 'start', scene: key }));
      scene.events.on(Phaser.Scenes.Events.SHUTDOWN, () => logEvent('scene', `${key} s’arrête`, { ev: 'stop', scene: key }));
      // Une scène déjà démarrée avant l'accroche (l'écran titre) est notée une fois.
      if (scene.scene.isActive()) logEvent('scene', `${key} démarre`, { ev: 'start', scene: key });
    }
    return scenes.length > 0 && scenes.every((s) => s.scene.key === 'Debug' || hooked.has(s.scene.key));
  };
  if (attach()) return;
  const onStep = (): void => {
    if (attach()) game.events.off(Phaser.Core.Events.STEP, onStep);
  };
  game.events.on(Phaser.Core.Events.STEP, onStep);
}

/* ---------- Contexte d'un rapport ---------- */

function settingsSummary(): Record<string, string> {
  const quality = loadQualitySetting();
  const custom = readSetting('keys');
  const keys = custom && typeof custom === 'object' ? Object.keys(custom).length : 0;
  return {
    qualité: quality === 'auto' ? `${QUALITY_SETTING_LABEL.auto} (${QUALITY_LABEL[loadQuality()]})` : QUALITY_SETTING_LABEL[quality],
    texte: TEXT_SIZE_LABEL[loadTextSize()],
    'vitesse du texte': TEXT_SPEED_LABEL[loadTextSpeed()],
    daltonien: loadColorBlind() ? 'oui' : 'non',
    'effets réduits': REDUCED_MOTION_LABEL[loadReducedMotion()],
    animations: ANIM_SPEED_LABEL[loadAnimSpeed()],
    combat: BATTLE_VIEW_LABEL[loadBattleView()],
    volumes: `${loadVolume('music')}/${loadVolume('sfx')}/${loadVolume('ambience')}`,
    'touches changées': String(keys),
  };
}

function gameSummary(): ReportGame | null {
  const world = getWorldState();
  if (!world) return null;
  try {
    const s = summarize(world, loadGameData(), place ?? 'Vaelmor');
    return { heroName: s.heroName, heroClass: s.heroClass, heroLevel: s.heroLevel, place: s.place, playMs: s.playMs, gold: s.gold, mode: s.mode === 'classique' ? 'Classique' : 'Blessure', companySize: s.companySize };
  } catch {
    return null;
  }
}

export function activeScenes(): string[] {
  return (gameRef?.scene.getScenes(true) ?? []).map((s) => s.scene.key).filter((k) => k !== 'Debug');
}

export function currentContext(): ReportContext {
  const display = getDisplayInfo();
  return {
    version: GAME_VERSION,
    milestone: MILESTONE,
    userAgent: navigator.userAgent,
    language: navigator.language,
    screen: `${window.innerWidth}×${window.innerHeight} à ×${display.dpr}, jeu affiché à ×${display.cssZoom.toFixed(2)}`,
    settings: settingsSummary(),
    scenes: activeScenes(),
    game: gameSummary(),
    storage: isStorageAvailable() ? 'disponible' : 'indisponible',
    heapMb: heapMb(),
  };
}

/* ---------- Carnet et rapports ---------- */

export const getNotebook = (): Notebook => notebook;

export type RecordResult = { readonly ok: true; readonly entry: NoteEntry; readonly report: string } | { readonly ok: false; readonly message: string };

/** Range un signalement dans le carnet (enregistré tout de suite) et rend le texte du rapport. */
export function recordNote(draft: NoteDraft): RecordResult {
  const problem = validateDraft(draft);
  if (problem) return { ok: false, message: problem };
  const ctx = currentContext();
  const added = addNote(notebook, draft, { place: ctx.game?.place ?? place ?? 'hors partie', scenes: ctx.scenes.join(', '), playMs: ctx.game?.playMs ?? 0, sessionMs: sessionMs() }, new Date().toISOString());
  notebook = added.book;
  writeRaw(SAVE_KEYS.notebook, serializeNotebook(notebook));
  logEvent('carnet', `signalement n° ${added.entry.id} : ${draft.kind}${added.entry.severity ? ` (${added.entry.severity})` : ''}`, { id: added.entry.id, type: draft.kind });
  persist();
  const report = buildReport({ draft: { kind: added.entry.kind, severity: added.entry.severity, text: added.entry.text }, ctx, journal: journal.entries(), sessionMs: sessionMs(), nowIso: new Date().toISOString(), noteId: added.entry.id });
  return { ok: true, entry: added.entry, report };
}

/** Export de fin de session : résumé, carnet entier et journal complet. */
export function sessionExportText(): string {
  persist();
  return buildSessionExport({ ctx: currentContext(), notebook, journal: journal.entries(), session: journal.currentSession, sessionMs: sessionMs(), nowIso: new Date().toISOString() });
}

/** Lignes du journal (bancs d'essai et écran F10). */
export const journalEntries = (): readonly JournalEntry[] => journal.entries();

/** Vide le carnet et le journal (nouvelle session de test sur le même navigateur). */
export function clearTestkit(): void {
  notebook = emptyNotebook();
  journal = new Journal();
  // La session repart de zéro : on la rouvre pour que les lignes suivantes soient gardées.
  journal.startSession({ version: GAME_VERSION, milestone: MILESTONE });
  t0 = performance.now();
  writeRaw(SAVE_KEYS.notebook, serializeNotebook(notebook));
  dirty = true;
  persist();
}

/* ---------- Capture d'écran ---------- */

/** Capture du jeu (PNG en data-URL) prise après la prochaine image rendue ; null si le moteur n'y arrive pas en 600 ms. */
export function captureScreen(game: Phaser.Game): Promise<string | null> {
  return new Promise((resolve) => {
    let done = false;
    const finish = (value: string | null): void => {
      if (done) return;
      done = true;
      resolve(value);
    };
    window.setTimeout(() => finish(null), 600);
    try {
      game.renderer.snapshot((image) => finish(image instanceof HTMLImageElement ? image.src : null), 'image/png');
    } catch {
      finish(null);
    }
  });
}
