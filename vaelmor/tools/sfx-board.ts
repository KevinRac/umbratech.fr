/**
 * Fichier d'écoute des bruitages et des ambiances (jalon M10, lot D).
 *
 *   npm run sfx-board -- <dossier>
 *
 * Sert `tools/sfx/board.html` avec Vite, rend chaque son hors ligne dans Chrome
 * sans interface (contexte audio hors ligne : exactement les recettes et le
 * mixage du jeu), puis écrit dans <dossier> :
 *   - un WAV par son ;
 *   - `planche.mp3` : tous les sons à la suite, séparés par un silence ;
 *   - `planche.txt` : l'instant de chaque son dans `planche.mp3`, et son niveau
 *     (crête et volume perçu, mesurés par ffmpeg).
 *
 * Il faut ffmpeg, Google Chrome et puppeteer-core (variables CHROME et
 * PUPPETEER si ce ne sont pas les chemins par défaut).
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';
import { createServer } from 'vite';

const ROOT = resolve(import.meta.dirname, '..');
const out = resolve(process.argv[2] ?? join(ROOT, '..', 'sfx-board'));
const CHROME = process.env['CHROME'] ?? '/usr/bin/google-chrome';
const PUPPETEER = process.env['PUPPETEER'] ?? '/opt/npm-tools/node_modules/puppeteer-core';
const GAP_S = 0.8;

interface ClipInfo {
  id: string;
  group: string;
  label: string;
  seconds: number;
}

/** Ce que le script utilise de puppeteer-core (pas de dépendance du projet). */
interface Page {
  on(event: 'pageerror', fn: (e: unknown) => void): void;
  goto(url: string, opts: { waitUntil: string }): Promise<unknown>;
  evaluate<A, R>(fn: (arg: A) => R | Promise<R>, arg?: A): Promise<R>;
}
interface Puppeteer {
  launch(opts: { executablePath: string; headless: boolean; args: string[] }): Promise<{ newPage(): Promise<Page>; close(): Promise<void> }>;
}

function ffmpeg(args: string[]): string {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-nostats', ...args], { encoding: 'utf8', maxBuffer: 1 << 28 });
  if (r.status !== 0) throw new Error(r.stderr);
  return r.stderr;
}

/** Crête (dBFS) et volume perçu : maximum momentané (fenêtre de 400 ms, LUFS), comparable entre sons brefs et longs. */
function levels(file: string): { peak: number; lufs: number } {
  const log = ffmpeg(['-i', file, '-af', 'ebur128=peak=sample', '-f', 'null', '-']);
  const peak = Number(/Peak:\s+(-?[\d.]+|-inf)/.exec(log.split('Summary:')[1] ?? '')?.[1] ?? NaN);
  const shorts = [...log.matchAll(/M:\s*(-?[\d.]+)/g)].map((m) => Number(m[1])).filter(Number.isFinite);
  return { peak, lufs: Math.max(-99, ...shorts) };
}

async function main(): Promise<void> {
  mkdirSync(out, { recursive: true });
  const server = await createServer({ root: ROOT, configFile: join(ROOT, 'vite.config.ts'), server: { port: 5199, open: false }, logLevel: 'error' });
  await server.listen();
  const require = createRequire(import.meta.url);
  const puppeteer = require(PUPPETEER) as Puppeteer;
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  try {
    const page = await browser.newPage();
    page.on('pageerror', (e: unknown) => console.error('page :', e));
    await page.goto('http://localhost:5199/tools/sfx/board.html', { waitUntil: 'networkidle0' });
    const clips = await page.evaluate(() => window.vaelmorBoard.clips(), undefined);
    const lines: string[] = ['Vaelmor — planche d’écoute du lot D (volumes par défaut : effets 80, ambiance 50)', ''];
    const list: string[] = [];
    let at = 0;
    const silence = join(out, '_silence.wav');
    ffmpeg(['-y', '-f', 'lavfi', '-i', `anullsrc=r=48000:cl=stereo`, '-t', String(GAP_S), silence]);
    let group = '';
    for (const clip of clips as ClipInfo[]) {
      const b64 = await page.evaluate((id: string) => window.vaelmorBoard.render(id), clip.id);
      const file = join(out, `${clip.id}.wav`);
      writeFileSync(file, Buffer.from(b64, 'base64'));
      const lv = levels(file);
      if (clip.group !== group) {
        lines.push(`— ${clip.group} —`);
        group = clip.group;
      }
      const mm = Math.floor(at / 60);
      const ss = (at % 60).toFixed(1).padStart(4, '0');
      lines.push(`${mm}:${ss}  ${clip.label.padEnd(44)} crête ${lv.peak.toFixed(1).padStart(6)} dBFS  momentané ${lv.lufs.toFixed(1).padStart(6)} LUFS`);
      list.push(`file '${file}'`, `file '${silence}'`);
      at += clip.seconds + GAP_S;
      process.stdout.write('.');
    }
    writeFileSync(join(out, '_list.txt'), list.join('\n'));
    ffmpeg(['-y', '-f', 'concat', '-safe', '0', '-i', join(out, '_list.txt'), '-c:a', 'libmp3lame', '-b:a', '192k', join(out, 'planche.mp3')]);
    writeFileSync(join(out, 'planche.txt'), lines.join('\n') + '\n');
    console.log(`\n${clips.length} sons, ${Math.round(at)} s → ${join(out, 'planche.mp3')}`);
  } finally {
    await browser.close();
    await server.close();
  }
}

await main();
