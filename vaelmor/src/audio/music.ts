/**
 * Lecteur de musique (jalon M10, décisions n°236 à n°238).
 *
 * Les scènes disent où l'on est (`playMusic({ kind: 'world', … })`) ; les règles
 * de `music.json` choisissent la piste (`logic/audio/musicRules.ts`). Une piste
 * en boucle joue 0 → fin de boucle, puis début → fin de boucle sans fin (points
 * trouvés et raccord cuit par `npm run encode-music`). Deux pistes se croisent en
 * fondu (`fadeMs`). Une piste d'exploration quittée garde sa position : au retour
 * d'un combat, elle reprend où elle en était.
 *
 * Les fichiers (`music/web/<id>.webm`, Opus, ou `.m4a`, AAC, selon le navigateur)
 * sont chargés à la demande et gardés décodés tant que leur durée totale reste
 * sous `CACHE_SECONDS` (les plus anciens sont oubliés).
 */
import { assetUrl } from '../core/config';
import { loadGameData } from '../data';
import type { MusicTrack } from '../data/schemas';
import { musicFor, resumeOffset, type MusicContext } from '../logic/audio/musicRules';
import { audioContext, busInput, whenUnlocked } from './engine';

/** Durée totale (s) des pistes gardées décodées : environ 140 Mo au pire. */
const CACHE_SECONDS = 420;

interface Playing {
  readonly id: string;
  readonly track: MusicTrack;
  readonly source: AudioBufferSourceNode;
  readonly gain: GainNode;
  /** Instant (horloge audio) du départ, et position de la piste à cet instant. */
  readonly startedAt: number;
  readonly offset: number;
}

let current: Playing | null = null;
/** Piste demandée en dernier (un chargement qui finit trop tard est abandonné). */
let wanted: string | null = null;
const positions = new Map<string, { offset: number; at: number }>();
const buffers = new Map<string, AudioBuffer>();
const loading = new Map<string, Promise<AudioBuffer | null>>();
let extension: 'webm' | 'm4a' | null = null;

function music() {
  return loadGameData().music;
}

function preferredExtension(): 'webm' | 'm4a' {
  if (extension) return extension;
  const probe = typeof document !== 'undefined' ? document.createElement('audio') : null;
  extension = probe?.canPlayType('audio/webm; codecs="opus"') ? 'webm' : 'm4a';
  return extension;
}

async function fetchDecode(ctx: AudioContext, id: string, ext: 'webm' | 'm4a'): Promise<AudioBuffer> {
  const response = await fetch(assetUrl(`music/web/${id}.${ext}`));
  if (!response.ok) throw new Error(`${response.status}`);
  return ctx.decodeAudioData(await response.arrayBuffer());
}

/** Charge et décode une piste (une seule fois) ; null si elle est introuvable ou illisible. */
function load(id: string): Promise<AudioBuffer | null> {
  const ctx = audioContext();
  if (!ctx) return Promise.resolve(null);
  const ready = buffers.get(id);
  if (ready) {
    // Plus récemment utilisée : en fin de liste.
    buffers.delete(id);
    buffers.set(id, ready);
    return Promise.resolve(ready);
  }
  const pending = loading.get(id);
  if (pending) return pending;
  const promise = (async (): Promise<AudioBuffer | null> => {
    try {
      return await fetchDecode(ctx, id, preferredExtension());
    } catch {
      // Un navigateur qui dit lire l'Opus mais ne le décode pas : on retombe sur l'AAC.
      try {
        extension = 'm4a';
        return await fetchDecode(ctx, id, 'm4a');
      } catch (error) {
        console.warn(`Musique « ${id} » illisible :`, error);
        return null;
      }
    }
  })().then((buffer) => {
    loading.delete(id);
    if (buffer) {
      buffers.set(id, buffer);
      trimCache();
    }
    return buffer;
  });
  loading.set(id, promise);
  return promise;
}

function trimCache(): void {
  let total = [...buffers.values()].reduce((s, b) => s + b.duration, 0);
  for (const [id, buffer] of buffers) {
    if (total <= CACHE_SECONDS) break;
    if (id === current?.id || id === wanted) continue;
    buffers.delete(id);
    total -= buffer.duration;
  }
}

/** Position actuelle de la piste en cours (s). */
function positionOf(playing: Playing, now: number): number {
  return resumeOffset(playing.track, playing.offset, now - playing.startedAt);
}

function fadeOut(playing: Playing, ms: number): void {
  const ctx = audioContext();
  if (!ctx) return;
  const t = ctx.currentTime;
  playing.gain.gain.cancelScheduledValues(t);
  playing.gain.gain.setValueAtTime(playing.gain.gain.value, t);
  playing.gain.gain.linearRampToValueAtTime(0, t + ms / 1000);
  playing.source.stop(t + ms / 1000 + 0.05);
  // Une boucle quittée garde sa position (reprise au retour, n°236).
  if (playing.track.loop) positions.set(playing.id, { offset: positionOf(playing, t), at: t });
}

async function start(id: string, resume: boolean): Promise<void> {
  const track = music().tracks[id];
  if (!track) return;
  const buffer = await load(id);
  const ctx = audioContext();
  const out = busInput('music');
  if (!buffer || !ctx || !out || wanted !== id || current?.id === id) return;
  const fade = music().fadeMs;
  if (current) fadeOut(current, fade);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  if (track.loop && track.loopStart !== undefined && track.loopEnd !== undefined) {
    source.loop = true;
    source.loopStart = track.loopStart;
    source.loopEnd = track.loopEnd;
  }
  const gain = ctx.createGain();
  const level = music().volume;
  const saved = resume ? positions.get(id) : undefined;
  // Une piste reprise revient au même point de la boucle, comme si elle avait continué tout bas.
  const offset = saved ? resumeOffset(track, saved.offset, ctx.currentTime - saved.at) : 0;
  const t = ctx.currentTime;
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(level, t + (offset > 0 || current ? fade : 120) / 1000);
  source.connect(gain).connect(out);
  source.start(t, offset);
  const playing: Playing = { id, track, source, gain, startedAt: t, offset };
  current = playing;
  source.onended = () => {
    if (current === playing) current = null;
  };
}

/** Joue la musique du lieu ou du moment (rien ne change si c'est déjà elle, ou si la piste n'existe pas encore). */
export function playMusic(ctx: MusicContext): void {
  const choice = musicFor(music(), ctx);
  if (!choice) return;
  const id = choice.track;
  if (wanted === id && (current?.id === id || loading.has(id))) return;
  wanted = id;
  const resume = ctx.kind === 'world' || ctx.kind === 'title';
  whenUnlocked(() => void start(id, resume));
}

/** Coupe la musique en fondu. */
export function stopMusic(ms = music().fadeMs): void {
  wanted = null;
  if (current) fadeOut(current, ms);
  current = null;
}

/** Charge à l'avance des pistes probables (combat, boss), sans les jouer. */
export function prefetchMusic(contexts: readonly MusicContext[]): void {
  whenUnlocked(() => {
    for (const ctx of contexts) {
      const choice = musicFor(music(), ctx);
      if (choice) void load(choice.track);
    }
  });
}

/** Piste en cours (debug, tests de navigateur). */
export function currentMusic(): string | null {
  return current?.id ?? null;
}
