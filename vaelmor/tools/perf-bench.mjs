#!/usr/bin/env node
/**
 * Banc de performance du lot G (n°246) : poids chargé et tas JS.
 *
 *   npx tsx tools/perf-bench.mjs [--combats 30] [--out rapport.json] [--poids-seulement] [--titre-seulement]
 *
 * Sert le dossier `vaelmor/` tel quel (le build `play/` et ses `assets/`), compressé en gzip comme le
 * ferait le serveur (JS, JSON, HTML, SVG), et pilote Chrome sans interface (SwiftShader : ~4 images par
 * seconde, donc les ips ne sont PAS mesurables ici ; le contrôle des 60 ips reste à faire par l'auteur, F3).
 *
 * Mesures :
 *  - poids : octets transférés et nombre de requêtes jusqu'au titre, puis jusqu'au monde, par type ;
 *  - tas : tas JS après ramasse-miettes forcé tous les 5 allers-retours monde ↔ combat (F8, F2), et dérive.
 *
 * puppeteer-core n'est pas une dépendance du jeu : chemin par `PUPPETEER_CORE` (défaut `/opt/npm-tools/node_modules/puppeteer-core`),
 * Chrome par `CHROME` (défaut `/usr/bin/google-chrome`).
 */
import { createReadStream, existsSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { extname, join, normalize, resolve } from 'node:path';
import { createGzip } from 'node:zlib';
import { heapReport } from '../src/logic/perf/heap.ts';

const ROOT = resolve(import.meta.dirname, '..');
const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const value = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const COMBATS = Number(value('--combats', '30'));
const ECHANGES = Number(value('--rapproche', '0'));
const OUT = value('--out', '');
const PAGE = value('--page', '/play/index.html');
const QUERY = value('--query', '?debug&prep=off');

const require = createRequire(import.meta.url);
const puppeteer = require(process.env.PUPPETEER_CORE ?? '/opt/npm-tools/node_modules/puppeteer-core');

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.webm': 'audio/webm', '.m4a': 'audio/mp4', '.mp3': 'audio/mpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.ttf': 'font/ttf' };
const GZIPPED = new Set(['.html', '.js', '.json', '.svg']);

/** Serveur statique avec gzip, comme un hébergeur ordinaire. */
function serve() {
  const server = createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://x');
    const path = normalize(join(ROOT, decodeURIComponent(url.pathname)));
    if (!path.startsWith(ROOT) || !existsSync(path) || !statSync(path).isFile()) {
      res.writeHead(404).end();
      return;
    }
    const ext = extname(path);
    const headers = { 'content-type': TYPES[ext] ?? 'application/octet-stream', 'cache-control': 'no-store' };
    if (GZIPPED.has(ext)) {
      res.writeHead(200, { ...headers, 'content-encoding': 'gzip' });
      createReadStream(path).pipe(createGzip({ level: 6 })).pipe(res);
    } else {
      res.writeHead(200, { ...headers, 'content-length': statSync(path).size });
      createReadStream(path).pipe(res);
    }
  });
  return new Promise((ok) => server.listen(0, '127.0.0.1', () => ok(server)));
}

const sleep = (ms) => new Promise((ok) => setTimeout(ok, ms));
const kind = (url) => {
  const ext = extname(new URL(url).pathname);
  if (ext === '.js') return 'js';
  if (['.png', '.webp'].includes(ext)) return 'images';
  if (['.webm', '.m4a', '.mp3'].includes(ext)) return 'musique';
  if (ext === '.json') return 'json';
  return 'autre';
};

const server = await serve();
const port = server.address().port;
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME ?? '/usr/bin/google-chrome',
  headless: 'new',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-precise-memory-info', '--js-flags=--expose-gc', '--autoplay-policy=no-user-gesture-required', '--window-size=960,540'],
});
const page = await browser.newPage();
await page.setViewport({ width: 960, height: 540 });
const cdp = await page.createCDPSession();
await cdp.send('Network.enable');

/** Requêtes terminées : { url, bytes }. */
const finished = [];
const urls = new Map();
cdp.on('Network.requestWillBeSent', (e) => urls.set(e.requestId, e.request.url));
cdp.on('Network.loadingFinished', (e) => finished.push({ url: urls.get(e.requestId) ?? '?', bytes: e.encodedDataLength }));
const missing = [];
page.on('response', (r) => r.status() >= 400 && missing.push(`${r.status()} ${r.url().replace(/^https?:\/\/[^/]+/, '')}`));
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

const weigh = (from) => {
  const rows = finished.slice(from);
  const by = {};
  for (const r of rows) {
    const k = kind(r.url);
    by[k] ??= { n: 0, bytes: 0 };
    by[k].n += 1;
    by[k].bytes += r.bytes;
  }
  return { requetes: rows.length, octets: rows.reduce((s, r) => s + r.bytes, 0), parType: by };
};

const scenes = () => page.evaluate(() => window.vaelmor?.scene.getScenes(true).map((s) => s.scene.key) ?? []);
const waitScene = async (key, timeoutMs = 120000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    if ((await scenes()).includes(key)) return Date.now() - t0;
    await sleep(250);
  }
  throw new Error(`scène « ${key} » jamais atteinte (actives : ${(await scenes()).join(', ')})`);
};
const heap = async () => {
  await cdp.send('HeapProfiler.collectGarbage');
  await cdp.send('HeapProfiler.collectGarbage');
  const { usedSize } = await cdp.send('Runtime.getHeapUsage');
  return usedSize;
};
const mo = (n) => Math.round((n / 1048576) * 100) / 100;

const report = { page: `${PAGE}${QUERY}`, date: new Date().toISOString() };
const t0 = Date.now();
await page.goto(`http://127.0.0.1:${port}${PAGE}${QUERY}`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => Boolean(window.vaelmor), { timeout: 60000 });
const direct = ECHANGES > 0 && QUERY.includes('closeup=');
if (!direct) await waitScene('Title');
report.titre = { ms: Date.now() - t0, ...weigh(0), tasMo: mo(await heap()) };
const afterTitle = finished.length;

if (!flag('--titre-seulement') && !direct) {
  // Nouvelle partie : titre → choix de la classe → (règle de mort) → monde.
  await page.mouse.click(480, 270);
  await page.keyboard.press('Enter');
  for (let i = 0; i < 40 && !(await scenes()).includes('World'); i++) {
    await sleep(700);
    await page.keyboard.press('Enter');
  }
  await waitScene('World');
  await sleep(2500);
  report.monde = { ...weigh(afterTitle), cumul: weigh(0), tasMo: mo(await heap()) };
}

if (!flag('--poids-seulement') && COMBATS > 0) {
  const samples = [{ combats: 0, tasMo: mo(await heap()) }];
  let done = 0;
  let sawBattle = false;
  const started = Date.now();
  while (done < COMBATS) {
    const active = await scenes();
    if (flag('--verbe')) console.error(`[${Math.round((Date.now() - started) / 1000)}s] combats=${done} scènes=${active.join(',')}`);
    if (active.includes('World') && !active.includes('Battle')) {
      await page.keyboard.press('F8');
      await sleep(1500);
    } else if (active.includes('Battle')) {
      const mode = await page.evaluate(() => window.vaelmor.scene.getScene('Battle')?.mode ?? '');
      if (flag('--verbe')) console.error(`   mode=${mode}`);
      if (mode === 'browse') await page.keyboard.press('F2');
      else await page.keyboard.press('Enter');
      await sleep(900);
    } else await sleep(600);
    // Un combat est compté quand le monde reprend la main après un combat commencé.
    const now = await scenes();
    if (now.includes('World') && !now.includes('Battle') && sawBattle) {
      done += 1;
      console.error(`combat ${done}/${COMBATS} (${Math.round((Date.now() - started) / 1000)} s)`);
      sawBattle = false;
      if (done % 5 === 0) samples.push({ combats: done, tasMo: mo(await heap()), s: Math.round((Date.now() - started) / 1000) });
    }
    if (now.includes('Battle')) sawBattle = true;
    if (Date.now() - started > 3 * 3600 * 1000) throw new Error('banc trop long');
  }
  const first = samples[1]?.tasMo ?? samples[0].tasMo;
  const last = samples.at(-1).tasMo;
  const verdict = heapReport(samples.map((x) => ({ combats: x.combats, bytes: x.tasMo * 1048576 })));
  report.tas = { stable: verdict.stable, ecartMaxPct: Math.round(verdict.maxDeviation * 1000) / 10, pentoKoParCombat: Math.round(verdict.bytesPerCombat / 1024), echantillons: samples, deriveApresCinqCombatsPct: Math.round(((last - first) / first) * 1000) / 10, deriveDepuisLeMondePct: Math.round(((last - samples[0].tasMo) / samples[0].tasMo) * 1000) / 10 };
}
if (ECHANGES > 0) {
  // Écran rapproché (le jeu s'ouvre directement sur le banc quand l'adresse porte `closeup=`) : un seul combat de banc (`--query '?debug&closeup=heros:&crit=1&double=1'`), échanges rejoués à la suite.
  if (!direct) await page.keyboard.press('F8');
  await waitScene('Battle');
  await page.waitForFunction(() => typeof window.vaelmorCloseupPlay === 'function', { timeout: 60000 });
  await sleep(4000);
  const samples = [{ combats: 0, tasMo: mo(await heap()) }];
  for (let i = 1; i <= ECHANGES; i++) {
    await page.evaluate(() => window.vaelmorCloseupPlay());
    await sleep(300);
    if (i % 10 === 0) {
      samples.push({ combats: i, tasMo: mo(await heap()) });
      console.error(`échange ${i}/${ECHANGES}`);
    }
  }
  const from = samples[1]?.tasMo ?? samples[0].tasMo;
  const verdict = heapReport(samples.map((x) => ({ combats: x.combats, bytes: x.tasMo * 1048576 })), 0.1, 10);
  report.rapproche = { stable: verdict.stable, ecartMaxPct: Math.round(verdict.maxDeviation * 1000) / 10, pentoKoParEchange: Math.round(verdict.bytesPerCombat / 1024), echantillons: samples, deriveApres10Pct: Math.round(((samples.at(-1).tasMo - from) / from) * 1000) / 10 };
}
report.introuvables = missing;
report.plusLourds = [...finished].sort((a, b) => b.bytes - a.bytes).slice(0, 8).map((r) => `${Math.round(r.bytes / 1024)} Ko ${r.url.replace(/^https?:\/\/[^/]+/, '')}`);
report.erreurs = errors.slice(0, 10);

console.log(JSON.stringify(report, null, 2));
if (OUT) writeFileSync(OUT, JSON.stringify(report, null, 2));
await browser.close();
server.close();
