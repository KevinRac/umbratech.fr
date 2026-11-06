// Outil de mesure (hors régression) : v18.14, action 6.1a (cadrage _dev/cadrages/la-brume-v18-6-gardiens-cadrage.md, Q9, Q10, Q25).
// Le build de référence de chaque acte et les mesures des gardiens de la descente, au bot qui frappe. Usage :
//   node mesure-gardiens.mjs <port> niveau [formes] [actes]          niveau atteint à l'entrée de la salle du gardien de chaque acte (descente purgée,
//                                                                     comme banc-descente A, Normal ; actes 4 à 9 par défaut)
//   node mesure-gardiens.mjs <port> mannequin [formes] [actes]       PV max du joueur au build de référence de l'acte (pvRef) et DPS de chaque forme
//                                                                     contre le gardien de l'acte en mannequin (60 s)
//   node mesure-gardiens.mjs <port> combat [formes] [actes] [paliers] combats au bot (ref=1, bot=2, dieu) : durée et durée de chaque temps, coups, friction
// formes : lum,gou,her,tis (défaut : les quatre). Sortie : un tableau, les médianes, et une ligne JSON (MESURE …) à recopier dans memoire.md.
import { createRequire } from 'node:module';
const require = createRequire('/opt/npm-tools/node_modules/');
const { chromium } = require('playwright');
const PORT = process.argv[2] || 8765, MODE = process.argv[3] || 'niveau';
const FORMES = (process.argv[4] || 'lum,gou,her,tis').split(',');
const ACTES = (process.argv[5] || '4,5,6,7,8,9').split(',').map(Number);
const PALIERS = (process.argv[6] || 'normal').split(',');
const BASE = `http://127.0.0.1:${PORT}/index.html`;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', args: ['--autoplay-policy=no-user-gesture-required'] });
async function ouvre(qs) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  await ctx.addInitScript(() => { window.__raf = []; window.requestAnimationFrame = cb => { window.__raf.push(cb); return 1; }; });
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 300)));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text().slice(0, 300)); });
  await page.goto(`${BASE}${qs ? '?' + qs : ''}`);
  await page.waitForFunction(() => !!(window.__gardiens18 && window.__brume && window.__brume.step && window.__descente), null, { timeout: 30000 });
  await page.evaluate(() => { const q = window.__raf.splice(0); for (const f of q) f(performance.now()); });
  return { page, errs, ctx };
}
const med = a => { const s = a.filter(x => x != null).sort((x, y) => x - y); if (!s.length) return null; const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const f1 = x => x == null ? '—' : (Math.round(x * 10) / 10).toString().replace('.', ',');

if (MODE === 'niveau') {
  const res = {};
  for (const cls of FORMES) {
    const { page, ctx } = await ouvre('');
    const r = await page.evaluate(([cls, actes]) => {
      const B = window.__brume, X = window.__descente; X.effacer(); B.cls(cls); B.start();
      const purge = () => { for (let i = 0; i < 6000; i++) { X.vider(); const P = B.P; if (P) { P.hp = P.s.maxHp; P.iT = 2; }
        const r = B.room; if (r.cleared && r.doors && r.doors.length && r.doors.every(d => d.open >= 1)) return true;
        if (r.cleared && (r.type === 'boss' || r.gardeK === 'final') && (!r.doors || !r.doors.length)) return true;
        if (!r.cleared && (i % 3 === 0)) B.killAll(); B.step(1 / 30, 1); } return false; };
      const out = {}; const fin = Math.max(...actes);
      for (let pas = 0; pas < 80; pas++) {
        if (!purge()) return { erreur: 'salle non purgée', acte: X.dbg().acte, out };
        const e = X.dbg(); if (!e.portes.length) break;
        const forc = e.portes.length === 1 ? e.portes[0] : (e.portes.includes('combat') ? 'combat' : e.portes.find(t => !['raccourci', 'direct', 'breche'].includes(t)) || e.portes[0]);
        window.__asm.dbg().entrer(forc);
        const d = X.dbg(); if (actes.includes(d.acte) && d.salle === d.rooms && !out[d.acte]) out[d.acte] = { niveau: B.P.level, attente: B.P.pendingLv, g: B.RUN.g, porte: forc };
        if (d.acte > fin) break;
      }
      return { out };
    }, [cls, ACTES]);
    res[cls] = r.out; console.log(`${cls} : ${ACTES.map(a => `acte ${a} → niveau ${r.out[a] ? r.out[a].niveau : '—'}`).join(' · ')}${r.erreur ? ' · ' + r.erreur : ''}`);
    await ctx.close();
  }
  const ref = {}; for (const a of ACTES) { const m = med(FORMES.map(c => res[c][a] && res[c][a].niveau)); ref[a] = m == null ? null : Math.floor(m); }
  console.log('médianes (niveau de référence) : ' + ACTES.map(a => `${a} : ${ref[a]}`).join(' · '));
  console.log('MESURE ' + JSON.stringify({ mode: 'niveau', res, reference: ref }));
}

if (MODE === 'mannequin') {
  const res = {};
  for (const a of ACTES) { res[a] = {};
    for (const cls of FORMES) {
      const { page, errs, ctx } = await ouvre('');
      const r = await page.evaluate(([cls, a]) => { const B = window.__brume, G = window.__gardiens18; B.cls(cls);
        if (!G.GD[a]) { B.start(); const ref = G.reference(a); return { dps: null, pvMax: ref && ref.pvMax, niveau: B.P.level, talents: ref && ref.talents.length }; }   // pas encore de gardien : les PV du build seulement
        const e0 = G.essai(a, { cls, bot: 2, dieu: true, ref: true, mannequin: true });
        const vide = () => { const o = document.querySelector('#overlay'); if (!o.hidden) { const b = o.querySelector('#bok') || o.querySelector('.card:not([disabled])') || o.querySelector('button.primary:not([disabled])'); if (b) b.click(); } };
        for (let i = 0; i < 60 * 4 && !(B.room.boss && !B.room.boss.dead); i++) { vide(); B.step(1 / 60, 1); }
        const e = B.room.boss; if (!e) return { erreur: 'pas de gardien' }; const hp0 = e.hp, t0 = B.RUN.time;
        for (let i = 0; i < 60 * 60; i++) { vide(); B.step(1 / 60, 1); }
        return { dps: (hp0 - e.hp) / (B.RUN.time - t0), pvMax: e0.ref && e0.ref.pvMax, niveau: B.P.level, talents: e0.ref && e0.ref.talents.length }; }, [cls, a]);
      res[a][cls] = r; console.log(`acte ${a} · ${cls} : ${f1(r.dps)} PV/s, PV max ${r.pvMax} (niveau ${r.niveau}, ${r.talents} talents)${r.erreur ? ' · ' + r.erreur : ''}${errs.length ? ' · ' + errs[0] : ''}`);
      await ctx.close(); }
    const dps = med(FORMES.map(c => res[a][c].dps)), pv = med(FORMES.map(c => res[a][c].pvMax));
    console.log(`acte ${a} : DPS médian ${f1(dps)} → PV (× 50 s) ${Math.round(dps * 50 / 100) * 100} ; PV max médian du build ${pv}`);
    res[a].med = { dps, pvRef: pv };
  }
  console.log('MESURE ' + JSON.stringify({ mode: 'mannequin', res }));
}

if (MODE === 'combat') {
  const res = [];
  for (const a of ACTES) for (const palier of PALIERS) for (const cls of FORMES) {
    const { page, errs, ctx } = await ouvre('');
    const r = await page.evaluate(([cls, a, palier]) => { const B = window.__brume, G = window.__gardiens18; B.cls(cls);
      G.essai(a, { cls, bot: 2, dieu: true, ref: true, palier });
      const vide = () => { const o = document.querySelector('#overlay'); if (!o.hidden) { const b = o.querySelector('#bok') || o.querySelector('.card:not([disabled])') || o.querySelector('button.primary:not([disabled])'); if (b) b.click(); } };
      for (let i = 0; i < 60 * 4 && !(B.room.boss && !B.room.boss.dead && B.room.started); i++) { vide(); B.step(1 / 60, 1); }
      const e = B.room.boss, t0 = B.RUN.time; const tps = [t0];
      let ph = 1; for (let i = 0; i < 60 * 600 && !e.dead; i++) { vide(); B.step(1 / 60, 1); if (e.phase > ph) { ph = e.phase; tps.push(B.RUN.time); } }
      const j = G.journal(); return { dur: B.RUN.time - t0, mort: e.dead, temps: tps.map((t, i) => (tps[i + 1] || B.RUN.time) - t), coups: j.coups.length, sans: j.sansSigne, lances: j.lances, sautes: j.sautes, pv: e.maxHp }; }, [cls, a, palier]);
    res.push(Object.assign({ acte: a, palier, cls }, r)); console.log(`acte ${a} · ${palier} · ${cls} : ${f1(r.dur)} s${r.mort ? '' : ' (pas fini)'} · temps ${r.temps.map(f1).join(' / ')} · ${r.coups} coups (${r.sans} sans signe) · ${r.lances} gestes, ${r.sautes} sautés${errs.length ? ' · ' + errs[0] : ''}`);
    await ctx.close();
  }
  for (const a of ACTES) for (const palier of PALIERS) { const L = res.filter(x => x.acte === a && x.palier === palier); console.log(`acte ${a} · ${palier} : médiane ${f1(med(L.map(x => x.dur)))} s`); }
  console.log('MESURE ' + JSON.stringify({ mode: 'combat', res }));
}
await browser.close();
