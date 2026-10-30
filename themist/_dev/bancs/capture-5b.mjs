// Captures de l'action 5b (suite) : écran de mort (crâne qui s'accroche), carte d'arrivée, crâne sur la porte et infobulle.
// Usage : node capture-5b.mjs [port] [dossier]. Réutilise les outils de banc-nemesis.mjs (copiés ici, en petit).
import { createRequire } from 'node:module';
const require = createRequire('/opt/npm-tools/node_modules/');
const { chromium } = require('playwright');
const PORT = process.argv[2] || 8765, OUT = process.argv[3] || '.', BASE = `http://127.0.0.1:${PORT}/index.html`;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errs = []; page.on('pageerror', e => errs.push(String(e).slice(0, 300)));
await page.goto(BASE);
await page.waitForFunction(() => !!(window.__brume && window.__asm && window.__nemesis && window.__glas && window.__nemesisUI), null, { timeout: 30000 });
await page.waitForTimeout(300);
await page.evaluate(() => {
  const B = window.__brume, NE = window.__nemesis, G = () => window.__glas.dbg(), AS = window.__asm;
  window.T = {
    lancer(cls, acte, salle) { NE.activer(true); B.cls(cls); B.start(); const g = G(), R = g.RUN; R.act = acte; R.g = 10; R.roomIdx = salle;
      window.__dernier.prendre('ray_n1', 1, 0); window.__dernier.prendre('ray_s1', 1, 0);
      R.reserveBrume.push({ id: 'ray_k1', source: 'talent', rang: 1, g: 0, oublie: { acte, salle: 1 }, porte: 0 });
      AS.forcer = 1; try { g.entrer('elite'); } finally { AS.forcer = 0; } const r = G().room; if (r.asm && r.waves.length > 1) r.waves.shift(); },
    attendre() { const P = B.P; for (let i = 0; i < 720; i++) { P.iT = 99; B.step(1 / 60); const R = G().room.asm, e = R && R.e; if (e && !e.asm.mont) return true; } return false; },
    tuer() { const g = G(), P = g.P, e = G().room.asm.e; for (const x of g.enemies) if (!x.dead && x !== e && !x.fixed) AS.dbg().kill(x); g.room.waves = [];
      for (let i = 0; i < 90 && !P.dead; i++) { P.iT = 0; P.dashT = 0; P.hp = Math.min(P.hp, 3); g.eproj.push({ x: P.x, y: P.y, vx: 0, vy: 0, r: 9, dmg: 999, life: 0.5, from: e }); B.step(1 / 60); }
      B.step(1 / 60, 100); return NE.voir(); }
  };
});
// 1. première mort : promue, un crâne s'accroche sur l'écran de mort
const s1 = await page.evaluate(() => { T.lancer('lum', 2, 3); T.attendre(); return T.tuer(); });
console.log('fiches', s1.liste.length, 'points', s1.liste[0] && s1.liste[0].points);
await page.waitForTimeout(300); await page.screenshot({ path: `${OUT}/mort-avant.png` });
await page.waitForTimeout(1400); await page.screenshot({ path: `${OUT}/mort-apres.png` });
console.log('nemFin', await page.evaluate(() => { const b = document.querySelector('.nemFin'); return b ? { on: b.classList.contains('on'), crânes: b.querySelectorAll('.trk').length } : null; }));
// 2. la descente suivante : la porte et l'infobulle
const att = await page.evaluate(() => { const NE = window.__nemesis, B = window.__brume, G = () => window.__glas.dbg(); const f = NE.voir().liste[0];
  NE.activer(true); B.cls('lum'); B.start(); const R = G().RUN; R.act = f.attend.acte; R.g = 10; R.roomIdx = f.attend.salle - 2;
  G().entrer('combat');
  const rm = G().room; rm.doors = [{ type: 'combat', x: 1280 / 2 - 320, open: 1 }, { type: 'autel', x: 1280 / 2, open: 1 }, { type: 'elite', x: 1280 / 2 + 320, open: 1 }];
  window.paused = false; B.step(1 / 60, 2); return f.attend; });
console.log('attend', JSON.stringify(att));
const box = await page.evaluate(() => { const r = document.querySelector('#game').getBoundingClientRect(); return { x: r.left, y: r.top, s: r.width / 1280 }; });
await page.waitForTimeout(300);
await page.screenshot({ path: `${OUT}/porte.png`, clip: { x: box.x + 200 * box.s, y: box.y + 60 * box.s, width: 880 * box.s, height: 260 * box.s } });
await page.mouse.move(box.x + (1280 / 2 - 320) * box.s, box.y + (94 - 40) * box.s);
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/porte-survol.png`, clip: { x: box.x + 200 * box.s, y: box.y + 60 * box.s, width: 880 * box.s, height: 260 * box.s } });
console.log('tip', await page.evaluate(() => { const t = document.getElementById('nemTip'); return t ? { show: t.classList.contains('show'), crânes: t.querySelectorAll('.trk').length, txt: t.innerText } : null; }),
  'portes', await page.evaluate(() => window.__glas.dbg().room.doors.map(d => d.type + ':' + (d.nemF ? 'crâne' : '-')).join(' ')));
// 3. sa carte d'arrivée dans sa salle
const r3 = await page.evaluate(() => { const B = window.__brume, G = () => window.__glas.dbg(); G().entrer('combat'); const rm = G().room; const nem = !!(rm.asm && rm.asm.nem);
  for (let i = 0; i < 1200; i++) { G().P.iT = 99; B.step(1 / 60); const c = document.getElementById('asmCard'); if (c && c.classList.contains('show')) return { nem, carte: true, crânes: c.querySelectorAll('.trk').length, t: i }; } return { nem, carte: false }; });
console.log('carte', JSON.stringify(r3));
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/carte.png`, clip: { x: 300, y: 60, width: 680, height: 130 } });
console.log('erreurs :', errs.length ? errs.join(' | ') : 'aucune');
await browser.close();
