// Captures du crâne de la némésis (v17.25, action 5a) : planche des tailles et crânes posés sur les trois corps du Masqué, en salle.
// Usage : node capture-crane.mjs [port] [dossier de sortie]
import { createRequire } from 'node:module';
const require = createRequire('/opt/npm-tools/node_modules/');
const { chromium } = require('playwright');
const PORT = process.argv[2] || 8765, OUT = process.argv[3] || '.', BASE = `http://127.0.0.1:${PORT}/index.html`;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
const ZOOM = +(process.argv[4] || 1);   // 1 : taille réelle ; 3 : loupe
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: ZOOM });
const errs = []; page.on('pageerror', e => errs.push(String(e).slice(0, 200)));
await page.goto(BASE);
await page.waitForFunction(() => !!(window.__nemesis && window.__nemesis.crane && window.__asm), null, { timeout: 30000 });

// 1. Planche : le SVG en grand, puis le rendu du jeu (canevas) de 9 à 14 px, sur le fond du jeu et sur un fond clair
await page.evaluate(() => {
  const MQ = window.BRUME_DATA.masque, d = document.createElement('div');
  d.id = 'planche'; d.style.cssText = 'position:fixed;left:0;top:0;z-index:99999;background:#14121a;padding:18px;display:flex;gap:26px;align-items:flex-end;font:12px sans-serif;color:#cfc6e6';
  const box = (html, t) => `<div style="text-align:center">${html}<div style="margin-top:6px">${t}</div></div>`;
  let h = box(`<div style="width:96px">${MQ.svgCrane('pl1')}</div>`, 'SVG 96 px') + box(`<div style="width:48px">${MQ.svgCrane('pl2')}</div>`, 'SVG 48 px');
  for (const bg of ['#14121a', '#3b3646']) {
    let row = '';
    for (const px of [10, 12, 14, 16]) { const I = window.__nemesis.crane.img(px); row += box(`<img src="${I.cv.toDataURL()}" style="width:${I.cv.width / I.k}px;height:${I.cv.height / I.k}px;image-rendering:auto">`, px + ' px'); }
    h += `<div style="background:${bg};padding:10px 12px;display:flex;gap:16px;align-items:flex-end">${row}</div>`;
  }
  d.innerHTML = h; document.body.appendChild(d);
});
await page.waitForTimeout(200);
await (await page.$('#planche')).screenshot({ path: `${OUT}/crane-planche${ZOOM > 1 ? '-x' + ZOOM : ''}.png` });
await page.evaluate(() => document.getElementById('planche').remove());

// 2. En salle : un Masqué de chaque corps, 1, 3 puis 5 crânes à la taille du jeu (rayon × 0,5, 12 à 16 px)
const corps = ['voile', 'spectre', 'brute'];
for (const k of corps) {
  const r = await page.evaluate(k => {
    const A = window.BRUME_DATA.bestiaire.assemble, J = window.BRUME_DATA.souvenirsBrume;
    const co = window.__asm.asmCombos(A, { act: 3, salle: 99, J }).find(c => c.corps === k);
    paused = false; window.__asm.essai(co.cle, 3, true, null, 'lum');
    const B = window.__brume, P = B.P;
    for (let i = 0; i < 60 * 8; i++) { P.iT = 99; B.step(1 / 60); const R = window.__glas.dbg().room.asm; if (R && R.e && !R.e.asm.mont) break; }
    const e = window.__glas.dbg().room.asm.e; for (const x of window.__glas.dbg().enemies) if (x !== e && !x.dead) window.__asm.dbg().kill(x);
    e.x = 640; e.y = 400; P.x = 420; P.y = 560; e.spd = 0; B.step(1 / 60, 1); paused = true;   // la boucle s'arrête : l'image ne bouge plus
    return { r: e.r, h: window.__nemesis.crane.taille(e) };
  }, k);
  for (const n of [1, 3, 5]) {
    const box = await page.evaluate(n => { window.__nemesis.crane.essai(n); paused = false; window.__brume.step(1 / 60, 1); paused = true; const e = window.__glas.dbg().room.asm.e, c = document.querySelector('canvas'), b = c.getBoundingClientRect(); return { x: b.left, y: b.top, s: b.width / 1280, ex: e.x, ey: e.y }; }, n);
    await page.waitForTimeout(100);
    await page.screenshot({ path: `${OUT}/crane-${k}-${n}${ZOOM > 1 ? '-x' + ZOOM : ''}.png`, clip: { x: box.x + (box.ex - 90) * box.s, y: box.y + (box.ey - 75) * box.s, width: 180 * box.s, height: 150 * box.s } });
  }
  console.log(k, JSON.stringify(r));
}
await page.evaluate(() => window.__nemesis.crane.arret());
console.log('erreurs :', errs.length ? errs.join(' | ') : 'aucune');
await browser.close();
