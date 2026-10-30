// Mesures de l'action 8 (v17.25) : PV d'une némésis selon ses points, pour chaque corps, face à un Masqué ordinaire ; temps pour la briser à un débit donné ;
// force de son souvenir (celle que sbForce borne). node mesure-nemesis.mjs <port> [acte=2] [dps=120]
import { createRequire } from 'node:module';
const require = createRequire('/opt/npm-tools/node_modules/');
const { chromium } = require('playwright');
const PORT = process.argv[2] || 8765, ACTE = +(process.argv[3] || 2), DPS = +(process.argv[4] || 120);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
const page = await browser.newPage(); const errs = []; page.on('pageerror', e => errs.push(String(e).slice(0, 200)));
await page.goto(`http://127.0.0.1:${PORT}/index.html`); await page.waitForFunction(() => !!(window.__nemesis && window.__asm), null, { timeout: 30000 });
const L = await page.evaluate(({ ACTE }) => {
  const NE = window.__nemesis, B = window.__brume, G = () => window.__glas.dbg(), A = window.BRUME_DATA.bestiaire.assemble, J = window.BRUME_DATA.souvenirsBrume, out = [];
  const lire = () => { for (let i = 0; i < 900 && !(G().room.asm && G().room.asm.e); i++) { G().P.iT = 99; B.step(1 / 60); } const e = G().room.asm.e; return e ? { pv: Math.round(e.maxHp), nom: G().room.asm.nom } : null; };
  for (const corps of ['brute', 'spectre', 'voile']) {
    const row = { corps, pts: [] };
    // un Masqué ordinaire de ce corps (porteur du même souvenir), même acte
    const co = window.__asm.asmCombos(A, { act: ACTE, salle: 99, J }).find(c => c.corps === corps); if (!co) { out.push({ corps, ordinaire: '—', pts: [] }); continue; }
    window.__asm.essai(co.cle, ACTE, true, 'ray_n1', 'lum'); const o = lire(); row.ordinaire = o && o.pv;
    for (let p = 1; p <= 5; p++) { const r = NE.essai('ray_n1', { points: p, acte: ACTE, corps }); const x = lire(); const f = NE.essaiEtat().fiche; row.pts.push({ p, pv: x && x.pv, force: NE.stats(f).force, rf: (NE.stats(f).renforts || []).join('+') }); }
    out.push(row);
  }
  return out;
}, { ACTE });
console.log(`Acte ${ACTE} · débit ${DPS} PV/s`); console.log('corps    ordinaire   p1   p2   p3   p4   p5   (PV)   | secondes pour la briser | force   | renforts');
for (const r of L) { if (!r.pts.length) { console.log(r.corps.padEnd(8), 'aucun assemblage à cet acte'); continue; } console.log(r.corps.padEnd(8), String(r.ordinaire).padStart(8), r.pts.map(x => String(x.pv).padStart(5)).join(''), ' |', r.pts.map(x => (x.pv / DPS).toFixed(1).padStart(5)).join(''), ' |', r.pts.map(x => (+x.force).toFixed(2)).join(' '), ' |', r.pts.map(x => x.rf || '-').join(' ')); }
console.log('erreurs :', errs.length ? errs.join(' | ') : 'aucune'); await browser.close();
