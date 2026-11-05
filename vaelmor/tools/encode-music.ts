/**
 * Prépare les musiques Suno pour le navigateur (jalon M10, décisions n°236 à n°238).
 *
 *   npm run encode-music                 toutes les pistes de music/*.mp3
 *   npm run encode-music -- mus_z1_aubemer mus_boss
 *   npm run encode-music -- --preview <dossier>   + un fichier d'écoute des raccords
 *
 * Pour chaque `music/<id>.mp3` (l'original n'est jamais modifié) :
 *   1. décodage (ffmpeg doit être installé) ;
 *   2. boucle : recherche des points de boucle (`tools/music/loop.ts`), raccord
 *      en fondu de 50 ms cuit dans le son, coupe juste après la fin de boucle ;
 *      un jingle (victoire, défaite, fin) n'a pas de boucle : son silence final
 *      est retiré et il finit par un court fondu ;
 *   3. volume : toutes les pistes au même niveau (−18 dBFS efficaces, crête ≤ −1 dBFS) ;
 *   4. encodage : `music/web/<id>.webm` (Opus 96 kbit/s) et `music/web/<id>.m4a`
 *      (AAC 96 kbit/s, pour les navigateurs sans Opus) ;
 *   5. `data/music.json › tracks` : boucle (secondes) et durée. Les règles (`rules`)
 *      ne sont pas touchées.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { bakeCrossfade, findLoop } from './music/loop';

const ROOT = resolve(import.meta.dirname, '..');
const SRC = join(ROOT, 'music');
const OUT = join(SRC, 'web');
const DATA = join(ROOT, 'data', 'music.json');
const RATE = 44100;
const CH = 2;
/** Pistes jouées une fois (pas de boucle). */
const ONE_SHOT = new Set(['mus_victory', 'mus_defeat', 'mus_ending', 'mus_ending_nuit']);
const TARGET_RMS_DB = -18;
const PEAK_DB = -1;
const FADE_S = 0.05;

function ffmpeg(args: string[], input?: Buffer): Buffer {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', ...args], { input, maxBuffer: 1 << 30 });
  if (r.status !== 0) throw new Error(`ffmpeg ${args.join(' ')} : ${r.stderr?.toString()}`);
  return r.stdout;
}

function decode(file: string): Float32Array {
  const raw = ffmpeg(['-i', file, '-f', 'f32le', '-ac', String(CH), '-ar', String(RATE), '-']);
  return new Float32Array(raw.buffer, raw.byteOffset, raw.byteLength / 4).slice();
}

/** Mono à RATE / 4 (11 025 Hz) pour l'analyse. */
function monoQuarter(pcm: Float32Array): Float32Array {
  const frames = pcm.length / CH;
  const out = new Float32Array(Math.floor(frames / 4));
  for (let i = 0; i < out.length; i++) {
    let s = 0;
    for (let k = 0; k < 4; k++) for (let c = 0; c < CH; c++) s += pcm[(i * 4 + k) * CH + c] as number;
    out[i] = s / (4 * CH);
  }
  return out;
}

const db = (v: number): number => 20 * Math.log10(Math.max(v, 1e-9));

function rmsOf(pcm: Float32Array, from: number, to: number): number {
  let s = 0;
  const a = Math.round(from * RATE) * CH;
  const b = Math.round(to * RATE) * CH;
  for (let i = a; i < b; i++) s += (pcm[i] as number) ** 2;
  return Math.sqrt(s / Math.max(1, b - a));
}

function peakOf(pcm: Float32Array): number {
  let p = 0;
  for (const v of pcm) p = Math.max(p, Math.abs(v));
  return p;
}

/** Fin du son utile d'un jingle (dernier échantillon au-dessus de −50 dB). */
function lastSound(pcm: Float32Array): number {
  const floor = 10 ** (-50 / 20);
  for (let i = pcm.length - 1; i >= 0; i--) if (Math.abs(pcm[i] as number) > floor) return Math.floor(i / CH) / RATE;
  return pcm.length / CH / RATE;
}

function encode(id: string, pcm: Float32Array): { webm: number; m4a: number } {
  const input = Buffer.from(pcm.buffer, pcm.byteOffset, pcm.byteLength);
  const common = ['-y', '-f', 'f32le', '-ar', String(RATE), '-ac', String(CH), '-i', '-', '-map_metadata', '-1'];
  ffmpeg([...common, '-c:a', 'libopus', '-b:a', '96k', '-vbr', 'on', join(OUT, `${id}.webm`)], input);
  ffmpeg([...common, '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart', join(OUT, `${id}.m4a`)], input);
  return { webm: readFileSync(join(OUT, `${id}.webm`)).length, m4a: readFileSync(join(OUT, `${id}.m4a`)).length };
}

interface TrackEntry {
  loop: boolean;
  loopStart?: number;
  loopEnd?: number;
  duration: number;
  /** Similarité autour du raccord (0 à 1), pour repérer une boucle à écouter de près. */
  seamScore?: number;
}

function main(): void {
  const args = process.argv.slice(2);
  const previewIndex = args.indexOf('--preview');
  const previewDir = previewIndex >= 0 ? args[previewIndex + 1] : undefined;
  const wanted = args.filter((a, i) => !a.startsWith('--') && (previewIndex < 0 || i !== previewIndex + 1));
  mkdirSync(OUT, { recursive: true });
  const ids = readdirSync(SRC)
    .filter((f) => /^mus_[a-z0-9_]+\.mp3$/.test(f))
    .map((f) => f.replace(/\.mp3$/, ''))
    .filter((id) => wanted.length === 0 || wanted.includes(id))
    .sort();
  const data = existsSync(DATA) ? (JSON.parse(readFileSync(DATA, 'utf8')) as { tracks?: Record<string, TrackEntry> }) : {};
  const tracks: Record<string, TrackEntry> = { ...(data.tracks ?? {}) };
  const preview: Float32Array[] = [];
  const notes: string[] = [];
  let previewAt = 0;
  for (const id of ids) {
    let pcm = decode(join(SRC, `${id}.mp3`));
    let entry: TrackEntry;
    let level: number;
    if (ONE_SHOT.has(id)) {
      const end = Math.min(pcm.length / CH / RATE, lastSound(pcm) + 0.3);
      pcm = pcm.slice(0, Math.round(end * RATE) * CH);
      const fade = Math.round(0.3 * RATE);
      const frames = pcm.length / CH;
      for (let i = 0; i < fade; i++) for (let c = 0; c < CH; c++) pcm[(frames - fade + i) * CH + c] = (pcm[(frames - fade + i) * CH + c] as number) * (1 - i / fade);
      level = rmsOf(pcm, 0, end);
      entry = { loop: false, duration: round(end) };
    } else {
      const loop = findLoop(monoQuarter(pcm), RATE / 4);
      bakeCrossfade(pcm, CH, RATE, loop.start, loop.end, FADE_S);
      const keep = Math.min(pcm.length / CH, Math.round((loop.end + 0.25) * RATE));
      pcm = pcm.slice(0, keep * CH);
      level = rmsOf(pcm, loop.start, loop.end);
      entry = { loop: true, loopStart: round(loop.start), loopEnd: round(loop.end), duration: round(keep / RATE), seamScore: Math.round(loop.score * 1000) / 1000 };
      if (previewDir) {
        // Ce que le jeu fera : 6 s avant la fin de boucle, puis le saut au début de boucle et 6 s.
        const a = Math.round((loop.end - 6) * RATE) * CH;
        const b = Math.round(loop.end * RATE) * CH;
        const c = Math.round(loop.start * RATE) * CH;
        const clip = new Float32Array(b - a + 6 * RATE * CH);
        clip.set(pcm.subarray(a, b), 0);
        clip.set(pcm.subarray(c, c + 6 * RATE * CH), b - a);
        preview.push(clip, new Float32Array(Math.round(1.5 * RATE) * CH));
        notes.push(`${formatTime(previewAt + 6)}  ${id} : raccord ${formatTime(loop.end)} → ${formatTime(loop.start)} (similarité ${loop.score.toFixed(2)})`);
        previewAt += clip.length / CH / RATE + 1.5;
      }
    }
    // Volume commun, sans dépasser la crête.
    let gain = 10 ** ((TARGET_RMS_DB - db(level)) / 20);
    gain = Math.min(gain, 10 ** (PEAK_DB / 20) / Math.max(peakOf(pcm), 1e-9));
    for (let i = 0; i < pcm.length; i++) pcm[i] = (pcm[i] as number) * gain;
    const size = encode(id, pcm);
    tracks[id] = entry;
    console.log(
      `${id.padEnd(18)} ${entry.loop ? `boucle ${formatTime(entry.loopStart ?? 0)} → ${formatTime(entry.loopEnd ?? 0)} (similarité ${entry.seamScore})` : 'jingle'}  ` +
        `${entry.duration} s  gain ${db(gain).toFixed(1)} dB  webm ${(size.webm / 1024).toFixed(0)} Ko  m4a ${(size.m4a / 1024).toFixed(0)} Ko`,
    );
  }
  const file = existsSync(DATA) ? (JSON.parse(readFileSync(DATA, 'utf8')) as Record<string, unknown>) : {};
  const sorted = Object.fromEntries(Object.entries(tracks).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(DATA, `${JSON.stringify({ ...file, tracks: sorted }, null, 2)}\n`);
  if (previewDir && preview.length > 0) {
    mkdirSync(previewDir, { recursive: true });
    const total = new Float32Array(preview.reduce((n, p) => n + p.length, 0));
    let at = 0;
    for (const p of preview) {
      total.set(p, at);
      at += p.length;
    }
    const input = Buffer.from(total.buffer);
    ffmpeg(['-y', '-f', 'f32le', '-ar', String(RATE), '-ac', String(CH), '-i', '-', '-c:a', 'aac', '-b:a', '128k', join(previewDir, 'raccords.m4a')], input);
    writeFileSync(join(previewDir, 'raccords.txt'), `Écoute des raccords : chaque saut tombe au moment indiqué.\n\n${notes.join('\n')}\n`);
    console.log(`Écoute des raccords : ${join(previewDir, 'raccords.m4a')}`);
  }
}

const round = (v: number): number => Math.round(v * 1000) / 1000;
const formatTime = (s: number): string => `${Math.floor(s / 60)}:${(s % 60).toFixed(2).padStart(5, '0')}`;

main();
