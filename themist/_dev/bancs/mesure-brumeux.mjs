// Outil de mesure (hors régression) : v18.11, action 5g-1 (fiche `_dev/cadrages/la-brume-v18-5g-enchainement-fiche.md`, § 2).
// Les PV des phases du Brumeux, mesurés au bot qui frappe sur le build de référence de l'acte X. Usage :
//   node mesure-brumeux.mjs <port> niveau [formes]                  niveau atteint à l'entrée de l'acte X (descente purgée comme banc-descente A, Normal)
//   node mesure-brumeux.mjs <port> mannequin [formes]               DPS de chaque forme contre le mannequin (présence haut et sol, 60 s chacune)
//   node mesure-brumeux.mjs <port> combat [formes] [paliers] [graines] [pv JSON]
//                                                                    combats entiers (I à V) au bot (ref=1, bot=2, dieu) : durée de chaque phase
// formes : lum,gou,her,tis (défaut : les quatre) ; paliers : normal,difficile,extreme (défaut : normal) ; graines : 101,202,303,404,505 (défaut) ;
// pv : [I, II, III, IV, V] pour essayer d'autres PV sans toucher aux données (V : PV de la phase entière ; la courte en prend phaseV.courte.pv).
// Variables d'environnement : PH=<phase de départ> (défaut 1), SEUL=1 (s'arrêter à la fin de cette phase), PATCH='{…}' (fusion profonde dans
// BRUME_DATA.brumeux, pour essayer un réglage sans toucher aux données).
// Sortie : un tableau par forme et par phase, la médiane des quatre formes, et une ligne JSON (MESURE …) à recopier dans memoire.md.
import { createRequire } from 'node:module';
const require = createRequire('/opt/npm-tools/node_modules/');
const { chromium } = require('playwright');
const PORT = process.argv[2] || 8765, MODE = process.argv[3] || 'combat';
const FORMES = (process.argv[4] || 'lum,gou,her,tis').split(',');
const PALIERS = (process.argv[5] || 'normal').split(',');
const GRAINES = (process.argv[6] || '101,202,303,404,505').split(',').map(Number);
const PVX = process.argv[7] ? JSON.parse(process.argv[7]) : null;
const PH = +(process.env.PH || 1), SEUL = process.env.SEUL === '1', PATCH = process.env.PATCH ? JSON.parse(process.env.PATCH) : null;
const BASE = `http://127.0.0.1:${PORT}/index.html`;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', args: ['--autoplay-policy=no-user-gesture-required'] });
async function ouvre(qs) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  await ctx.addInitScript(() => { window.__raf = []; window.requestAnimationFrame = cb => { window.__raf.push(cb); return 1; }; });
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 300)));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text().slice(0, 300)); });
  await page.goto(`${BASE}${qs ? '?' + qs : ''}`);
  await page.waitForFunction(() => !!(window.__arene && window.__brume && window.__descente && window.__brumeux), null, { timeout: 30000 });
  await page.evaluate(() => { const q = window.__raf.splice(0); for (const f of q) f(performance.now()); });
  return { page, errs, ctx };
}
const med = a => { const s = a.filter(x => x != null).sort((x, y) => x - y); if (!s.length) return null; const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const f1 = x => x == null ? '—' : (Math.round(x * 10) / 10).toString().replace('.', ',');

// ── niveau : la descente purgée (tout tué, portes de combat d'abord), comme banc-descente A ; le niveau à l'entrée de l'acte X
if (MODE === 'niveau') {
  const res = {};
  for (const cls of FORMES) {
    const { page, ctx } = await ouvre('');
    const r = await page.evaluate(cls => {
      const B = window.__brume, X = window.__descente; X.effacer(); B.cls(cls); B.start();
      const purge = () => { for (let i = 0; i < 6000; i++) { X.vider(); const P = B.P; if (P) { P.hp = P.s.maxHp; P.iT = 2; }
        const r = B.room; if (r.cleared && r.doors && r.doors.length && r.doors.every(d => d.open >= 1)) return true;
        if (r.cleared && (r.type === 'boss' || r.gardeK === 'final') && (!r.doors || !r.doors.length)) return true;
        if (!r.cleared && (i % 3 === 0)) B.killAll(); B.step(1 / 30, 1); } return false; };
      let entree = null;
      for (let pas = 0; pas < 80; pas++) {
        if (!purge()) return { erreur: 'salle non purgée', acte: X.dbg().acte };
        const e = X.dbg(); if (!e.portes.length) break;
        const forc = e.portes.length === 1 ? e.portes[0] : (e.portes.includes('combat') ? 'combat' : e.portes.find(t => !['raccourci', 'direct', 'breche'].includes(t)) || e.portes[0]);
        window.__asm.dbg().entrer(forc);
        if (X.dbg().acte === 10 && !entree) entree = { niveau: B.P.level, attente: B.P.pendingLv, g: B.RUN.g };
      }
      return { entree, fin: { niveau: B.P.level } };
    }, cls);
    res[cls] = r; console.log(`${cls} : à l'entrée de l'acte X, niveau ${r.entree && r.entree.niveau} (salle ${r.entree && r.entree.g}) ; à la fin, niveau ${r.fin && r.fin.niveau}${r.erreur ? ' · ' + r.erreur : ''}`);
    await ctx.close();
  }
  const n = med(Object.values(res).map(r => r.entree && r.entree.niveau));
  console.log(`médiane à l'entrée de l'acte X : ${n} → niveau de référence ${Math.floor(n)}`);
  console.log('MESURE ' + JSON.stringify({ mode: 'niveau', res, reference: Math.floor(n) }));
}

// ── mannequin : la forme frappe le Brumeux qui ne fait rien (présence de la phase 1 : haut ; de la phase 4 : sol), 60 s chacune
if (MODE === 'mannequin') {
  const res = {};
  for (const cls of FORMES) {
    res[cls] = {};
    for (const phase of (process.env.MPH || '1,4').split(',').map(Number)) {
      const { page, errs, ctx } = await ouvre('');
      const r = await page.evaluate(([cls, phase]) => { const B = window.__brume; B.cls(cls);
        const e0 = window.__brumeux.essai(phase, { cls, muet: true, bot: 2, dieu: true, ref: true, mannequin: true, graine: 101 });
        const D = window.__brumeux.dbg(), X = D.X; let hp0 = X.e.hp; const t0 = D.RUN.time;
        for (let i = 0; i < 60 * 60; i++) { const o = document.querySelector('#overlay'); if (!o.hidden) { const b = o.querySelector('#bok') || o.querySelector('.card:not([disabled])') || o.querySelector('button.primary:not([disabled])'); if (b) b.click(); } B.step(1 / 60, 1); }
        return { dps: (hp0 - X.e.hp) / (D.RUN.time - t0), t: D.RUN.time - t0, phase: X.phase + 1, niveau: B.P.level, talents: (D.RUN.memoire.actifs || []).map(a => a.id + ':' + a.rang) }; }, [cls, phase]);
      res[cls]['p' + phase] = r.dps; if (!res[cls].talents) res[cls].talents = r.talents;
      console.log(`${cls} · phase ${phase} : ${f1(r.dps)} PV/s sur ${f1(r.t)} s (phase ${r.phase}, niveau ${r.niveau})${errs.length ? ' · ' + errs[0] : ''}`);
      await ctx.close();
    }
  }
  console.log('MESURE ' + JSON.stringify({ mode: 'mannequin', res }));
}

// ── combat : I à V au bot, build de référence, dieu ; la durée de chaque phase (de la fin de la transition qui l'ouvre à l'entrée dans la suivante)
if (MODE === 'combat') {
  const out = [];
  for (const palier of PALIERS) for (const cls of FORMES) for (const graine of GRAINES) {
    const { page, errs, ctx } = await ouvre('');
    const r = await page.evaluate(([cls, palier, graine, PVX, PH, SEUL, PATCH]) => { const B = window.__brume; B.cls(cls);
      const DBr = window.BRUME_DATA.brumeux; if (PVX) PVX.forEach((v, i) => { DBr.phases[i].pv = v; });
      const fus = (a, b) => { for (const k in b) { if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && a[k] && typeof a[k] === 'object') fus(a[k], b[k]); else a[k] = b[k]; } }; if (PATCH) fus(DBr, PATCH);
      window.__brumeux.essai(PH, { cls, muet: true, bot: 2, dieu: true, ref: true, graine, palier });
      const D = window.__brumeux.dbg(); let X = D.X; const ph = {}; let prev = PH - 1, debut = D.RUN.time, trans = 0, transT = 0, fin = null;
      for (let i = 0; i < 60 * 1500; i++) { const o = document.querySelector('#overlay'); if (!o.hidden) { const b = o.querySelector('#bok') || o.querySelector('.card:not([disabled])') || o.querySelector('button.primary:not([disabled])'); if (b) b.click(); }
        B.step(1 / 60, 1); X = D.X;
        if (X.trans && !trans) { trans = 1; transT = D.RUN.time; ph[prev + 1] = D.RUN.time - debut; if (SEUL) { fin = D.RUN.time; break; } }
        if (!X.trans && trans) { trans = 0; prev = X.phase; debut = D.RUN.time; (ph.trans || (ph.trans = [])).push(D.RUN.time - transT); }
        if ((X.scene || !X.on || (X.e && X.e.dead)) && fin == null) { fin = D.RUN.time; ph[prev + 1] = D.RUN.time - debut; break; } }
      const st = window.__brumeux.statsRun(), j = window.__arene.journal();
      return { ph, fin, victoire: !!(st && st.fin === 'victoire') || SEUL, sansSigne: j.sansSigne, pv: X.pv, eff: st && st.effacement, j: { tableaux: st && st.tableaux, vides: st && st.vides, rentres: st && st.rentres, bati: st && st.bati, cassees: st && st.cassees, couture: st && st.couture, liste: j.liste && j.liste.slice(0, 3) } }; }, [cls, palier, graine, PVX, PH, SEUL, PATCH]);
    r.cls = cls; r.palier = palier; r.graine = graine; out.push(r);
    console.log(`${palier} · ${cls} · ${graine} : ${r.victoire ? 'victoire' : 'NON FINI'} ; ${[1, 2, 3, 4, 5].map(k => f1(r.ph[k])).join(' / ')} s ; transitions ${(r.ph.trans || []).map(f1).join(' ')} ; sans signe ${r.sansSigne}${errs.length ? ' · ' + errs[0] : ''}`);
    await ctx.close();
  }
  for (const palier of PALIERS) {
    console.log(`\n${palier} : médianes par forme (I / II / III / IV / V / total)`);
    const M = {};
    for (const cls of FORMES) { const L = out.filter(r => r.palier === palier && r.cls === cls);
      M[cls] = [1, 2, 3, 4, 5].map(k => med(L.map(r => r.ph[k]))); M[cls].push(med(L.map(r => [1, 2, 3, 4, 5].reduce((s, k) => s + (r.ph[k] || 0), 0) + (r.ph.trans || []).reduce((s, x) => s + x, 0))));
      console.log(`  ${cls} : ${M[cls].map(f1).join(' / ')}`); }
    const four = [0, 1, 2, 3, 4, 5].map(i => med(FORMES.map(c => M[c][i])));
    console.log(`  médiane des formes : ${four.map(f1).join(' / ')}`);
  }
  console.log('MESURE ' + JSON.stringify({ mode: 'combat', pv: PVX, out: out.map(r => ({ c: r.cls, p: r.palier, g: r.graine, v: r.victoire, ph: r.ph, s: r.sansSigne, j: r.j })) }));
}
await browser.close();
