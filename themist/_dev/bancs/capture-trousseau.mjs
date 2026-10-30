// Vidéo du trousseau de la némésis (v17.25, action 5b) : une Brute avec n crânes marche, s'arrête, fonce, s'arrête.
// Usage : node capture-trousseau.mjs [port] [dossier] [n] [corps]  →  <dossier>/trousseau.webm (convertir ensuite, voir memoire.md § 28)
import { createRequire } from 'node:module';
const require = createRequire('/opt/npm-tools/node_modules/');
const { chromium } = require('playwright');
const PORT = process.argv[2] || 8765, OUT = process.argv[3] || '.', N = +(process.argv[4] || 5), CORPS = process.argv[5] || 'brute';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, recordVideo: { dir: OUT, size: { width: 1280, height: 720 } } });
const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(String(e).slice(0, 200)));
await page.goto(`http://127.0.0.1:${PORT}/index.html`);
await page.waitForFunction(() => !!(window.__nemesis && window.__nemesis.crane && window.__asm), null, { timeout: 30000 });
const t0 = await page.evaluate(({ N, CORPS }) => {
  const A = window.BRUME_DATA.bestiaire.assemble, J = window.BRUME_DATA.souvenirsBrume;
  const co = window.__asm.asmCombos(A, { act: 3, salle: 99, J }).find(c => c.corps === CORPS);
  window.__asm.essai(co.cle, 3, true, null, 'lum'); window.__nemesis.crane.essai(N);
  const B = window.__brume, P = B.P, G = () => window.__glas.dbg();
  for (let i = 0; i < 60 * 8; i++) { P.iT = 99; B.step(1 / 60); const R = G().room.asm; if (R && R.e && !R.e.asm.mont) break; }
  const e = G().room.asm.e; for (const x of G().enemies) if (x !== e && !x.dead) window.__asm.dbg().kill(x); G().room.waves = [];
  e.x = 520; e.y = 400; P.x = 300; P.y = 600;
  // trajet scripté (temps de jeu) : marche à droite, arrêt, ruée à gauche, arrêt, marche lente à droite ; il ne lance rien
  const t0 = G().RUN.time; let x = 520;
  window.__glas.hook = dt => { const t = G().RUN.time - t0; P.iT = 99; P.x = 300; P.y = 600; e.asm.st.ph = 'pause'; e.asm.st.t = 99;
    const v = t < 1.2 ? 0 : t < 2.6 ? 130 : t < 3.4 ? 0 : t < 3.75 ? -620 : t < 5.2 ? 0 : t < 7 ? 70 : 0; x += v * dt; e.x = x; e.y = 400 + (v ? Math.sin(t * 9) * 1.5 : 0); };
  return t0;
}, { N, CORPS });
await page.waitForTimeout(8500);
const etat = await page.evaluate(() => window.__nemesis.crane.etat());
console.log(JSON.stringify(etat).slice(0, 300));
await page.evaluate(() => { const e = window.__glas.dbg().room.asm.e; window.__glas.hook = null; window.__asm.dbg().kill(e); });
await page.waitForTimeout(1500);
console.log('erreurs :', errs.length ? errs.join(' | ') : 'aucune');
await page.close(); await ctx.close(); await browser.close();
