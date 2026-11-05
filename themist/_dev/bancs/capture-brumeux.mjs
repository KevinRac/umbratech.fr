// Capture (v18.12, action 5g-2) : le portrait du Brumeux pour la carte « Au fond de la Brume » du wiki. C'est son portrait de présentation
// (BRX_SVG d'index.html, la fenêtre qui le présente avant le premier pacte : silhouette encapuchonnée sans visage, deux yeux pâles, main tendue),
// rendu à 480 × 600 (3 × 3 : 1 440 × 1 800 avant réduction) et écrit en WebP : themist/img/brumeux/brumeux-v<dessin.version>.webp.
// Usage : node capture-brumeux.mjs   (aucun serveur : le SVG est autonome). wiki.mjs --check réclame le portrait de la version courante.
import { createRequire } from 'node:module';
import { readFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire('/opt/npm-tools/node_modules/');
const { chromium } = require('playwright'); const sharp = require('sharp');
const THEMIST = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const html = readFileSync(join(THEMIST, 'index.html'), 'utf8');
const m = html.match(/const BRX_SVG=`(<svg[\s\S]*?<\/svg>)`;/); if (!m) { console.error('BRX_SVG introuvable'); process.exit(1); }
const DB = (() => { const w = {}; new Function('window', readFileSync(join(THEMIST, 'data', 'brumeux.js'), 'utf8'))(w); return w.BRUME_DATA.brumeux; })();
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
const page = await (await browser.newContext({ viewport: { width: 480, height: 600 }, deviceScaleFactor: 3 })).newPage();
await page.setContent(`<!doctype html><html><body style="margin:0;background:#05040a"><div style="width:480px;height:600px">${m[1].replace('<svg ', '<svg width="480" height="600" ')}</div></body></html>`);
await page.waitForTimeout(300);
const png = await page.screenshot({ clip: { x: 0, y: 0, width: 480, height: 600 } });
const dir = join(THEMIST, 'img', 'brumeux'); mkdirSync(dir, { recursive: true });
const out = join(dir, `brumeux-v${DB.dessin.version}.webp`);
await sharp(png).resize(480, 600).webp({ quality: 82 }).toFile(out);
console.log('portrait : ' + out);
await browser.close();
