// Banc Chromium : v18.5, action 5a (le Brumeux : socle technique). Usage :
//   node banc-brumeux.mjs <port> [sections, ex. ABCDEFGH] [dossier de captures, hors dépôt]
// A. Lecture et tirages = logique pure : les poids en jeu égalent brxLire sur les mêmes entrées (profil, verdicts, dégâts reçus par source,
//    ce qui t'a tué) ; même graine, même partition et mêmes zones ; les mesures libres tiennent dans le budget du palier et le non-cumul.
// B. Partition et transitions : les mesures fixes dans l'ordre, à nu après la boucle (anneau ivoire), un seuil de PV ne se traverse pas d'un coup
//    (verrou 1,2 s), transition (cri, état d'arène de la phase, présence haut → sol, relecture), jamais une pause ; la mort (croix tombée).
// C. 0 coup sans signe : quatre combats conduits (bot=2, dieu), une forme chacun, phases I à V : journal de l'arène à 0.
// D. Constructions d'essai : annonce en craie, pose quand la place est libre, poussée sans dégât après l'attente, jamais sur toi, plafond du palier,
//    connexité (fermer le seul passage est refusé), coût (image avec cinq constructions ≤ +1,5 ms).
// E. Paliers : PV de la phase V (courte / entière), budget des mesures libres, plafond des constructions, jamais de PV en plus.
// F. Durée et images au bot qui frappe : chaque forme de la phase I à la victoire (temps par phase), durée des images relevée (moyenne, pire 5 %).
// G. Règle d'or : rejoue banc-arene.mjs G (image par image, 19 salles, trois paliers) contre l'index.html d'avant (BANC_AVANT, défaut 4aa788c).
// H. Mouvements réduits (rien ne flotte ni ne pulse) et tailles d'écran (640 × 360, 2 560 × 1 440, 390 × 844) : combat conduit, aucun coup sans signe.
import { createRequire } from 'node:module';
import { readFileSync, mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
const require = createRequire('/opt/npm-tools/node_modules/');
const { chromium } = require('playwright');
const THEMIST = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PORT = process.argv[2] || 8765, SEC = (process.argv[3] || 'ABCDEFGH').toUpperCase(), DIR = process.argv[4] || null;
const BASE = `http://127.0.0.1:${PORT}/index.html`;
if (DIR) mkdirSync(DIR, { recursive: true });
let fails = 0, checks = 0;
const ok = (c, m) => { checks++; if (!c) { fails++; console.error('ÉCHEC : ' + m); } else console.log('ok · ' + m); };
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', args: ['--autoplay-policy=no-user-gesture-required'] });
const html = readFileSync(join(THEMIST, 'index.html'), 'utf8');
const DB = (() => { const w = {}; new Function('window', readFileSync(join(THEMIST, 'data', 'brumeux.js'), 'utf8'))(w); return w.BRUME_DATA.brumeux; })();
const DA = (() => { const w = {}; new Function('window', readFileSync(join(THEMIST, 'data', 'arene.js'), 'utf8'))(w); return w.BRUME_DATA.arene; })();
// la logique pure, hors navigateur (comme le simulateur)
const PUR = (() => { const bloc = n => html.match(new RegExp('/\\*' + n + ':pur\\*/([\\s\\S]*?)/\\*/' + n + ':pur\\*/'))[1];
  const c = { window: {}, Math, console, JSON, Set, Object, Array, Number, Infinity, isFinite, Uint8Array, Float64Array }; vm.createContext(c);
  for (const f of ['brumeux', 'arene']) vm.runInContext(readFileSync(join(THEMIST, 'data', f + '.js'), 'utf8'), c);
  vm.runInContext(bloc('des') + '\n' + bloc('brx') + '\nthis.F={desRng,brxLire,brxBoucle,brxBudget,brxPv,brxSeuils,brxTirer};', c); return c.F; })();

async function ouvre(qs, o = {}) {
  const ctx = await browser.newContext({ viewport: o.vp || { width: 1280, height: 720 }, deviceScaleFactor: o.dpr || 1, reducedMotion: o.rm ? 'reduce' : 'no-preference' });
  await ctx.addInitScript(() => { window.__raf = []; window.requestAnimationFrame = cb => { window.__raf.push(cb); return 1; }; });
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 300)));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text().slice(0, 300)); });
  await page.goto(`${BASE}${qs ? '?' + qs : ''}`);
  await page.waitForFunction(() => !!(window.__arene && window.__brume && window.__descente && window.__brumeux), null, { timeout: 30000 });
  await page.evaluate(() => { const q = window.__raf.splice(0); for (const f of q) f(performance.now()); });
  return { page, errs, ctx };
}
// ouvrir le combat d'essai dans la page (muet : aucun son dans le banc)
const ESSAI = (o) => { if (o.cls) window.__brume.cls(o.cls); const r = window.__brumeux.essai(o.phase || 1, Object.assign({ muet: true }, o)); const B = window.__brume; for (let i = 0; i < 3; i++) B.step(1 / 60, 1); return r; };
const PAS = (n, f) => { const B = window.__brume; for (let i = 0; i < n; i++) { const o = document.querySelector('#overlay'); if (!o.hidden) { const b = o.querySelector('#bok') || o.querySelector('.card:not([disabled])') || o.querySelector('button.primary:not([disabled])'); if (b) b.click(); } if (f) f(i); B.step(1 / 60, 1); } };
async function capture(page, nom) { if (!DIR) return; await page.evaluate(() => window.__arene.dbg().frame()); await page.screenshot({ path: join(DIR, nom) }); console.log('   capture ' + join(DIR, nom)); }

// ═══ A. Lecture et tirages = logique pure ═══════════════════════════════════════════════════════════════════════════════════════════
if (SEC.includes('A')) {
  console.log('\n══ A · lecture et tirages ══');
  const { page, errs, ctx } = await ouvre('');
  // un profil, des verdicts, des dégâts reçus et une sauvegarde posés à la main avant l'entrée
  const r = await page.evaluate(([PAS_]) => { const PAS = eval(PAS_), B = window.__brume;
    B.cls('lum'); B.start(); PAS(3);
    const S = B.SAVE; S.mem.prof = { n: 3, ax: { portee: 0.9, esquive: 0.2, soin: 0.6 }, cms: {}, eff: { traque: { s: 0.7, n: 2 }, petards: { s: -0.4, n: 1 } } };
    S.brumeux = { v: 1, tentatives: 2, victoires: 0, phaseMax: 2, mort: { 1: 'anneau', 2: 'tir' }, vus: ['disque'] };
    const r = window.__brumeux.essai(1, { muet: true, graine: 101 }); const D = window.__brumeux.dbg(), X = D.X;
    D.RUN.par18 = { brute: 300, spectre: 100 }; D.RUN.prof.ko = { petards: 2 };
    const L = window.__brumeux.lire(); const e = window.__brumeux.etat();
    const prof = (function () { try { return window.__cm161 ? null : null; } catch (x) { return null; } })();
    return { r, poids: L.poids, premier: L.premier, lec: e.lec, boucle: e.boucle, prof: D.RUN.prof, graine: e.graine, palier: e.palier,
      entrees: { prof: window.__brumeux.dbg().X.lec && null, eff: S.mem.prof.eff, ko: D.RUN.prof.ko, par: D.RUN.par18, tue: S.brumeux.mort } }; }, [PAS.toString()]);
  // le profil tel que le jeu le calcule (profile() mêle la run et la mémoire) : on le relit par un second appel qui ne change rien
  const prof = await page.evaluate(() => { const D = window.__brumeux.dbg(); const p = {}; for (const k of ['portee', 'esquive', 'soin', 'risque', 'rythme', 'puissance']) p[k] = null; try { const pr = window.__brume.SAVE.mem.prof.ax; for (const k in pr) p[k] = pr[k]; } catch (e) {} return p; });
  const BE = (() => { const w = {}; new Function('window', readFileSync(join(THEMIST, 'data', 'bestiaire.js'), 'utf8'))(w); return w.BRUME_DATA.bestiaire; })();
  const cms = Object.fromEntries(Object.entries(BE.contreMesures).map(([k, c]) => [k, { ax: c.ax, hi: !!c.hi }]));
  const Lp = PUR.brxLire(DB, { prof, eff: r.entrees.eff, ko: r.entrees.ko, cms, par: r.entrees.par, tue: r.entrees.tue }, 0);
  const ecart = Math.max(...Object.keys(DB.elements).map(id => Math.abs((r.poids[id] || 0) - (Lp.poids[id] || 0))));
  ok(ecart < 1e-9, `A : les poids en jeu égalent brxLire sur les mêmes entrées (écart max ${ecart.toExponential(1)}) : ${Object.entries(r.poids).map(([k, v]) => k + ' ' + v.toFixed(2)).join(', ')}`);
  ok(r.premier === 'anneau' && Lp.premier === 'anneau', 'A : « ce qui t\'a tué » à la phase I (SAVE.brumeux) est le premier élément');
  ok(r.poids.couloir > r.poids.disque && r.poids.couloir > 1.5, `A : portée haute et Traque qui a porté : le couloir pèse ${r.poids.couloir.toFixed(2)} (> disque ${r.poids.disque.toFixed(2)})`);
  ok(r.poids.disque < 1, `A : les Pétards déjoués deux fois (abandonnés) : le disque pèse ${r.poids.disque.toFixed(2)} (< 1)`);
  // la première mesure libre de la boucle commence par l'anneau
  const libres = r.boucle.filter(m => m.startsWith('['));
  ok(libres.length >= 2 && libres[0].startsWith('[anneau'), `A : la première mesure libre commence par l'anneau : ${r.boucle.join(' ')}`);
  // budget et non-cumul de chaque mesure libre (phase I, Normal : 4)
  const bud = PUR.brxBudget(DB, 0, 'normal');
  for (const m of libres) { const ids = m.slice(1, -1).split('+'); let men = 0; const cnt = {}; for (const id of ids) { men += DB.elements[id].menace; cnt[DB.elements[id].sorte] = (cnt[DB.elements[id].sorte] || 0) + 1; }
    ok(men <= bud && Object.entries(cnt).every(([s, n]) => n <= DB.cumul[s]), `A : mesure libre ${m} : menace ${men} ≤ ${bud}, non-cumul tenu`); }
  // même graine, même partition : un second essai à la même graine donne la même boucle et les mêmes premières zones
  const d2 = await page.evaluate(([PAS_]) => { const PAS = eval(PAS_); const out = [];
    for (let k = 0; k < 2; k++) { window.__brumeux.essai(1, { muet: true, graine: 777 }); const D = window.__brumeux.dbg(); D.P.x = D.AR.x0 + 500; D.P.y = D.AR.y0 + 400; const zs = []; PAS(60 * 12, () => { D.P.x = D.AR.x0 + 500; D.P.y = D.AR.y0 + 400; for (const z of D.X.zones) if (!zs.some(q => q.o === z)) zs.push({ o: z, k: z.forme + ':' + z.id + ':' + Math.round(z.x || z.x0) + ',' + Math.round(z.y || z.y0) }); });
      out.push({ boucle: window.__brumeux.etat().boucle.join(' '), zones: zs.map(q => q.k) }); } return out; }, [PAS.toString()]);
  ok(d2[0].boucle === d2[1].boucle && d2[0].zones.join('|') === d2[1].zones.join('|') && d2[0].zones.length >= 2, `A : même graine (777), même boucle et mêmes zones (${d2[0].zones.length} zones) : ${d2[0].boucle}`);
  ok(!errs.length, 'A : aucune erreur ' + errs.slice(0, 2).join(' | '));
  await ctx.close();
}

// ═══ B. Partition et transitions ════════════════════════════════════════════════════════════════════════════════════════════════════
if (SEC.includes('B')) {
  console.log('\n══ B · partition et transitions ══');
  const { page, errs, ctx } = await ouvre('');
  const r = await page.evaluate(([PAS_]) => { const PAS = eval(PAS_); const r0 = ESSAI_({ phase: 1, graine: 5, cls: 'lum' }); const D = window.__brumeux.dbg(), X = D.X, e = X.e, out = { r0 };
    function ESSAI_(o) { window.__brume.cls(o.cls); const r = window.__brumeux.essai(o.phase, Object.assign({ muet: true }, o)); for (let i = 0; i < 3; i++) window.__brume.step(1 / 60, 1); return r; }
    // 1. les mesures fixes dans l'ordre : on relève l'ordre des gestes lancés (zones et feinte) sur une boucle
    const vu = []; let nuVu = false, vulnMax = 0; D.P.x = D.AR.x0 + 600; D.P.y = D.AR.y0 + 500;
    PAS(60 * 40, () => { D.P.x = D.AR.x0 + 600; D.P.y = D.AR.y0 + 500; D.P.iT = 1; const et = window.__brumeux.etat(); if (et.ph === 'nu') nuVu = true; vulnMax = Math.max(vulnMax, e.vuln || 0);
      for (const z of X.zones) if (!vu.some(v => v.o === z)) vu.push({ o: z, id: z.id, im: X.im }); if (D.room.bl && !vu.some(v => v.o === D.room.bl)) vu.push({ o: D.room.bl, id: 'feinte', im: X.im }); });
    out.ordre = vu.map(v => v.id); out.nuVu = nuVu; out.vulnMax = vulnMax; out.boucle = window.__brumeux.etat().boucle; out.pause = document.querySelector('#overlay').hidden;
    return out; }, [PAS.toString()]);
  ok(r.ordre.length >= 4, `B : gestes lancés dans l'ordre de la partition : ${r.ordre.join(' → ')}`);
  // l'ordre des mesures fixes de la partition d'essai (disque, feinte, couloir) se retrouve dans l'ordre des gestes
  const fixes = DB.partition.essai.filter(m => m.k === 'fixe').map(m => m.g), vus = r.ordre.filter(id => fixes.includes(id));
  let i = 0, bon = true; for (const id of vus) { if (id === fixes[i % fixes.length]) i++; else if (id !== fixes[(i - 1 + fixes.length) % fixes.length]) bon = false; }
  ok(bon && i >= 3, `B : les mesures fixes reviennent dans l'ordre (${fixes.join(', ')}) : ${vus.join(' → ')}`);
  ok(r.nuVu && r.vulnMax >= DB.partition.nuS - 0.1, `B : à nu après la boucle (vuln ${r.vulnMax.toFixed(1)} s ≥ ${DB.partition.nuS})`);
  ok(r.pause, 'B : jamais une pause pendant le combat');
  await capture(page, 'brumeux-phase-1.png');
  // seuils et transitions : les PV sont posés juste au-dessus du seuil, le bot frappe (les coups passent par hitEnemy du jeu)
  const t = await page.evaluate(([PAS_]) => { const PAS = eval(PAS_), D = window.__brumeux.dbg(), X = D.X, e = X.e, max = e.maxHp, s = X.seuils, out = {};
    X.bot = 2; X.essai.bot = 2; e.hp = Math.floor(max * s[0]) + 40; const ph0 = window.__brumeux.etat().phase; let hpAt = null, lockVu = 0, t1 = null, tr = null, etats = [], presence = [];
    PAS(60 * 14, i => { const et = window.__brumeux.etat(); if (et.phase === 2 && t1 == null) { t1 = i; lockVu = e.lockT - D.RUN.time; hpAt = e.hp; } etats.push(window.__arene.etat().etat); if (i % 60 === 0) presence.push([et.phase, Math.round(e.r), Math.round(e.y)]); if (et.trans) tr = et; });
    out.ph0 = ph0; out.phase = window.__brumeux.etat().phase; out.hpMin = hpAt; out.seuil = Math.floor(max * s[0]) - 1; out.lockVu = lockVu; out.lectures = X.j.lectures; out.transitions = X.j.transitions; out.pause = document.querySelector('#overlay').hidden;
    // IV : présence au sol, arène resserrée (état 1) ; V : état 2, constructions effacées
    window.__brumeux.vers(4); PAS(60 * 14); out.p4 = { phase: window.__brumeux.etat().phase, r: Math.round(e.r), etat: window.__arene.etat().etat, trans: window.__brumeux.etat().trans, presence: e.y > D.AR.y0 + 200 };
    out.poser = window.__brumeux.poser(D.P.x + 200, D.P.y, 34); PAS(60 * 3); out.consAvant = window.__brumeux.etat().cons.length;
    window.__brumeux.vers(5); PAS(60 * 14); out.p5 = { phase: window.__brumeux.etat().phase, etat: window.__arene.etat().etat, cons: window.__brumeux.etat().cons.length, trans: window.__brumeux.etat().trans, lectures: X.j.lectures };
    return out; }, [PAS.toString()]);
  ok(t.ph0 === 1 && t.phase >= 2 && Math.abs(t.hpMin - t.seuil) < 1, `B : le seuil de la phase I ne se traverse pas d'un coup (PV à l'instant du passage ${Math.round(t.hpMin)} = seuil − 1 : ${t.seuil}), phase II atteinte`);
  ok(t.lockVu > 1.0 && t.lockVu <= 1.25, `B : verrou de phase posé (${t.lockVu.toFixed(2)} s, 1,2 attendu)`);
  ok(t.lectures >= 2 && t.transitions.length >= 1 && t.pause, `B : relecture à la transition (${t.lectures} lectures), jamais de pause`);
  ok(t.p4.phase === 4 && t.p4.r === DB.dessin.r.sol && t.p4.etat === DB.phases[3].arene && !t.p4.trans && t.p4.presence, `B : phase IV : au sol (r ${t.p4.r}), arène à l'état ${t.p4.etat}, transition finie`);
  ok(t.consAvant >= 1 && t.poser.ok, `B : une construction posée en IV (${t.consAvant} debout)`);
  ok(t.p5.phase === 5 && t.p5.etat === DB.phases[4].arene && t.p5.cons === 0 && !t.p5.trans && t.p5.lectures >= 4, `B : phase V : arène à l'état ${t.p5.etat}, constructions effacées, relue`);
  await capture(page, 'brumeux-phase-5.png');
  // la mort : croix tombée, salle vidée, scène courte, barre de vie rendue
  const m = await page.evaluate(([PAS_]) => { const PAS = eval(PAS_), D = window.__brumeux.dbg(), X = D.X, e = X.e; e.hp = 1; X.bot = 2; let scene = false, t0 = null, hb = [];
    PAS(60 * 6, i => { const et = window.__brumeux.etat(); if (et.scene) { scene = true; if (t0 == null) t0 = i; } if (i % 30 === 0) { window.__arene.dbg().frame(); hb.push(document.querySelector('#hBoss').hidden); } });
    return { dead: !!e.dead, scene, t0, bossDead: !!D.room.bossDead, hb, pause: document.querySelector('#overlay').hidden, note: X.j.note, sauve: window.__brume.SAVE.brumeux || null }; }, [PAS.toString()]);
  ok(m.dead && m.scene && m.bossDead, 'B : à 1 PV, le bot l\'achève : scène de mort jouée, salle vidée');
  ok(m.hb[m.hb.length - 1] === true && m.pause, 'B : barre de vie rendue, aucune pause');
  ok(m.note && m.note.win && m.note.essai && m.sauve === null, 'B : la victoire est notée… mais une descente d\'essai n\'écrit rien dans SAVE.brumeux');
  await capture(page, 'brumeux-mort.png');
  ok(!errs.length, 'B : aucune erreur ' + errs.slice(0, 2).join(' | '));
  await ctx.close();
}

// ═══ C. 0 coup sans signe ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
if (SEC.includes('C')) {
  console.log('\n══ C · aucun coup sans signe : quatre combats conduits ══');
  for (const [k, cls] of ['lum', 'gou', 'her', 'tis'].entries()) {
    const { page, errs, ctx } = await ouvre('');
    await page.evaluate(ESSAI, { phase: 1, bot: 2, cls, graine: 31 + k, palier: ['normal', 'difficile', 'extreme', 'normal'][k] });
    const r = await page.evaluate(([PAS_]) => { const PAS = eval(PAS_), D = window.__brumeux.dbg(); let fin = null;
      PAS(60 * 170, i => { const et = window.__brumeux.etat(); if (!et.on || et.scene) { fin = fin == null ? i : fin; } });
      return { j: window.__arene.journal(), st: window.__brumeux.statsRun(), fin, cls: D.P.cls, palier: window.__brumeux.etat().palier }; }, [PAS.toString()]);
    console.log(`   ${cls} (${r.palier}) : ${r.j.coups} coups reçus, ${r.j.sansSigne} sans signe, ${r.st.lancers} éléments lancés (${r.st.sautes} zones sautées, ${r.st.posees} constructions), phase ${r.st.phase}, ${r.st.fin}`);
    if (r.j.liste.length) console.log('   ' + JSON.stringify(r.j.liste.slice(0, 4)));
    ok(r.cls === cls && r.j.coups >= 5, `C : ${cls} : combat conduit, des coups reçus (${r.j.coups})`);
    ok(r.j.sansSigne === 0, `C : ${cls} : aucun coup sans signe (zones du Brumeux jugées à 0,8 s, feinte à 0,6 s)`);
    ok(r.st.phase >= 3, `C : ${cls} : le bot qui frappe avance (phase ${r.st.phase} en ${Math.round((r.fin || 60 * 170) / 60)} s)`);
    ok(r.j.assertions === 0 && !errs.length, `C : ${cls} : aucune erreur ` + errs.slice(0, 2).join(' | '));
    if (cls === 'gou') await capture(page, 'brumeux-combat.png');
    await ctx.close();
  }
}

// ═══ D. Constructions ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════
if (SEC.includes('D')) {
  console.log('\n══ D · constructions d\'essai ══');
  const { page, errs, ctx } = await ouvre('');
  await page.evaluate(ESSAI, { phase: 2, cls: 'lum', graine: 9 });
  const r = await page.evaluate(([PAS_]) => { const PAS = eval(PAS_), D = window.__brumeux.dbg(), X = D.X, P = D.P, out = {};
    X.boucle = [{ k: 'fixe', g: 'feinte' }]; X.ph = 'entracte'; X.t = 1e9;   // la partition se tait : on pose à la main
    P.x = D.AR.x0 + 700; P.y = D.AR.y0 + 500; P.iT = 1; PAS(2);
    out.surToi = window.__brumeux.poser(P.x + 10, P.y + 10, 34);
    const v = window.__brumeux.poser(P.x + 260, P.y, 34, { annonce: true }); out.loin = v; const n0 = D.room.pillars.length;
    PAS(10); const c = window.__brumeux.etat().cons[0]; out.annonce = { pose: c && c.pose, n: D.room.pillars.length - n0 };
    PAS(60 * 2); out.posee = { pose: window.__brumeux.etat().cons[0].pose, n: D.room.pillars.length - n0, kind: D.room.pillars[D.room.pillars.length - 1].kind };
    // une créature dessus : toi. Pose à ta position + 20 (annonce), tu restes : après l'attente (1 s), tu es poussé sans dégât
    const hp0 = P.hp, tx = P.x + 70, ty = P.y; out.c2 = window.__brumeux.poser(P.x + 90, P.y, 34, { annonce: true });
    PAS(10, () => { P.x = tx; P.y = ty; P.iT = 1; }); PAS(95, () => { P.x = tx; P.y = ty; P.iT = 1; });   // l'annonce (1,5 s) est finie, tu es dessus : elle attend (jusqu'à 1 s)
    out.attend = { pose: window.__brumeux.etat().cons[1].pose };
    PAS(70, () => { P.iT = 1; }); const cc = window.__brumeux.etat().cons[1]; out.pousse = { pose: cc.pose, pousse: cc.pousse, d: Math.hypot(P.x - cc.x, P.y - cc.y), r: cc.r + P.r, hp: P.hp === hp0 };
    // plafond du palier (Normal : 5)
    const res = []; for (let i = 0; i < 6; i++) res.push(window.__brumeux.poser(D.AR.x0 + 300 + i * 150, D.AR.y1 - 200, 34).ok ? 'ok' : window.__brumeux.poser(D.AR.x0 + 300 + i * 150, D.AR.y1 - 200, 34).raison);
    out.plafond = { res, cons: window.__brumeux.etat().cons.length };
    return out; }, [PAS.toString()]);
  ok(!r.surToi.ok && r.surToi.raison === 'joueur', 'D : jamais sur toi (refus « joueur »)');
  ok(r.loin.ok && r.loin.part >= 0.85, `D : posée plus loin (${(r.loin.part * 100).toFixed(0)} % reliés)`);
  ok(r.annonce.pose === false && r.annonce.n === 0, 'D : pendant l\'annonce (craie), rien n\'est posé');
  ok(r.posee.pose && r.posee.n === 1 && r.posee.kind === 'pilier18', 'D : après l\'annonce, un pilier est posé (carte FF refaite)');
  ok(r.c2.ok && r.attend.pose === false, 'D : une créature dessus : la construction attend');
  ok(r.pousse.pose && r.pousse.pousse >= 1 && r.pousse.d >= r.pousse.r - 1 && r.pousse.hp, `D : après l'attente, elle pousse sans dégât (à ${r.pousse.d.toFixed(0)} px ≥ ${r.pousse.r.toFixed(0)}, PV intacts)`);
  ok(r.plafond.cons === DB.paliers.normal.constructions && r.plafond.res.slice(0, 3).every(x => x === 'ok') && r.plafond.res.slice(3).every(x => x === 'plafond'), `D : plafond de Normal (${DB.paliers.normal.constructions}) : ${r.plafond.res.join(' ')}`);
  await capture(page, 'brumeux-constructions.png');
  // connexité en jeu : un mur de piliers percé d'un passage ; la construction qui le ferme est refusée
  const c = await page.evaluate(([PAS_]) => { const PAS = eval(PAS_), D = window.__brumeux.dbg(), X = D.X, P = D.P, AR = D.AR;
    X.cons = []; D.room.pillars = D.room.pillars.filter(p => !p.brx18); D.CAM.ff = 1;
    const y = AR.y0 + (AR.y1 - AR.y0) * 0.55; for (let x = AR.x0 + 30; x <= AR.x1; x += 70) if (Math.abs(x - (AR.x0 + AR.x1) / 2) > 60) D.room.pillars.push({ x, y, r: 34, kind: 'pilier18' });
    P.x = (AR.x0 + AR.x1) / 2; P.y = AR.y0 + 200; P.iT = 1; PAS(2);
    const ferme = window.__brumeux.poser(P.x, y, 34), ailleurs = window.__brumeux.poser(P.x, AR.y0 + 350, 34); return { ferme, ailleurs }; }, [PAS.toString()]);
  ok(!c.ferme.ok && c.ferme.raison === 'connexite' && c.ferme.part < 0.6, `D : fermer le seul passage est refusé (${(c.ferme.part * 100).toFixed(0)} % reliés)`);
  ok(c.ailleurs.ok, 'D : la même construction ailleurs est posée');
  // coût : une image avec cinq constructions posées contre la même image sans (mesures appariées, médiane)
  const MESURE = ([n]) => { const D = window.__brumeux.dbg(); const cv = document.querySelector('#game'), c = cv.getContext('2d'); const t = []; for (let k = 0; k < 5; k++) D.render(); for (let k = 0; k < n; k++) { const t0 = performance.now(); D.render(); c.getImageData(0, 0, 1, 1); t.push(performance.now() - t0); } t.sort((a, b) => a - b); return t[n >> 1]; };
  await page.evaluate(([PAS_]) => { const PAS = eval(PAS_), D = window.__brumeux.dbg(), X = D.X, P = D.P, AR = D.AR; X.cons = []; D.room.pillars = D.room.pillars.filter(p => !p.brx18); D.CAM.ff = 1; P.x = (AR.x0 + AR.x1) / 2; P.y = AR.y0 + 450; PAS(2, () => { P.iT = 1; }); }, [PAS.toString()]);
  const sans = [], avec = [];
  for (let k = 0; k < 7; k++) {
    sans.push(await page.evaluate(MESURE, [60]));
    await page.evaluate(([PAS_]) => { const PAS = eval(PAS_), D = window.__brumeux.dbg(), X = D.X, P = D.P; X.cons = []; D.room.pillars = D.room.pillars.filter(p => !p.brx18); for (let i = 0; i < 5; i++) window.__brumeux.poser(P.x - 300 + i * 150, P.y - 180, 34); PAS(60 * 2, () => { P.iT = 1; }); }, [PAS.toString()]);
    avec.push(await page.evaluate(MESURE, [60]));
    await page.evaluate(([PAS_]) => { const PAS = eval(PAS_), D = window.__brumeux.dbg(), X = D.X; X.cons = []; D.room.pillars = D.room.pillars.filter(p => !p.brx18); D.CAM.ff = 1; PAS(2); }, [PAS.toString()]);
  }
  const med = v => v.slice().sort((a, b) => a - b)[v.length >> 1], d = med(avec.map((a, i) => a - sans[i]));
  console.log(`   coût : sans ${med(sans).toFixed(2)} ms, avec cinq constructions ${med(avec).toFixed(2)} ms, écart médian ${d >= 0 ? '+' : ''}${d.toFixed(2)} ms`);
  ok(d <= DA.budget.rendu, `D : cinq constructions coûtent ${d >= 0 ? '+' : ''}${d.toFixed(2)} ms par image (≤ +${DA.budget.rendu})`);
  ok(!errs.length, 'D : aucune erreur ' + errs.slice(0, 2).join(' | '));
  await ctx.close();
}

// ═══ E. Paliers ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
if (SEC.includes('E')) {
  console.log('\n══ E · paliers ══');
  for (const pal of ['normal', 'difficile', 'extreme']) {
    const { page, errs, ctx } = await ouvre('');
    const r = await page.evaluate(([pal, PAS_]) => { const PAS = eval(PAS_); window.__brume.cls('gou'); const r = window.__brumeux.essai(1, { muet: true, graine: 3, palier: pal }); PAS(3);
      const D = window.__brumeux.dbg(), X = D.X; const men = []; X.rng = (() => { let s = 5; return () => { s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; })();
      for (let k = 0; k < 40; k++) { const b = window.__brumeux.dbg().pure.brxBoucle(window.__brumeux.DB, X.lec, 0, X.palier, X.rng, {}); for (const m of b) if (m.k === 'libre') { let s = 0; for (const id of m.elements) s += window.__brumeux.DB.elements[id].menace; men.push(s); } }
      const res = []; for (let i = 0; i < 7; i++) res.push(window.__brumeux.poser(D.AR.x0 + 200 + i * 150, D.AR.y1 - 200, 34).ok ? 'ok' : 'non');
      return { r, palier: X.palier, maxMen: Math.max(...men), maxHp: X.e.maxHp, dmg: X.e.dmg, cons: res.filter(x => x === 'ok').length }; }, [pal, PAS.toString()]);
    const pv = PUR.brxPv(DB, pal), B = PUR.brxBudget(DB, 0, pal);
    ok(r.palier === pal && r.r.pv.join() === pv.join(), `E : ${pal} : PV par phase ${r.r.pv.join(' / ')} (phase V ${pal === 'extreme' ? 'entière' : 'courte'})`);
    ok(r.maxMen <= B && r.maxMen > B - 2, `E : ${pal} : mesures libres sous le budget ${B} (menace maximale tirée ${r.maxMen})`);
    ok(r.cons === DB.paliers[pal].constructions, `E : ${pal} : au plus ${DB.paliers[pal].constructions} constructions (${r.cons} posées sur 7)`);
    ok(r.maxHp === pv.reduce((a, b) => a + b, 0), `E : ${pal} : PV totaux ${r.maxHp} (jamais de PV en plus par palier)`);
    ok(!errs.length, `E : ${pal} : aucune erreur ` + errs.slice(0, 2).join(' | '));
    await ctx.close();
  }
}

// ═══ F. Durée et images au bot qui frappe ═══════════════════════════════════════════════════════════════════════════════════════════
if (SEC.includes('F')) {
  console.log('\n══ F · durée par phase et durée des images, au bot qui frappe ══');
  for (const cls of ['lum', 'gou', 'her', 'tis']) {
    const { page, errs, ctx } = await ouvre('');
    await page.evaluate(ESSAI, { phase: 1, bot: 2, cls, graine: 41 });
    const r = await page.evaluate(([PAS_]) => { const PAS = eval(PAS_), D = window.__brumeux.dbg(); let fin = null;
      // une image rendue toutes les 3 pas (la durée des images est relevée par render à l'acte X)
      PAS(60 * 420, i => { if (i % 3 === 0) D.render(); const et = window.__brumeux.etat(); if ((et.scene || !et.on) && fin == null) fin = i; });
      return { st: window.__brumeux.statsRun(), im: window.__brumeux.images(), fin, j: window.__arene.journal() }; }, [PAS.toString()]);
    const ph = r.st.phases, tot = Object.values(ph).reduce((a, p) => a + p.t, 0);
    console.log(`   ${cls} : ${r.st.fin} en ${Math.round(tot)} s ; par phase ${Object.entries(ph).map(([k, p]) => k + ' : ' + p.t + ' s, ' + p.coups + ' coups').join(' · ')} ; images ${r.im ? r.im.moyenne + ' ms (pire 5 % ' + r.im.pire5 + ' ms, ' + r.im.n + ' images)' : 'non relevées'}`);
    ok(r.st.fin === 'victoire' && tot <= 400, `F : ${cls} : victoire du bot en ${Math.round(tot)} s (≤ 400)`);
    ok(Object.values(ph).every(p => p.t <= 150), `F : ${cls} : aucune phase au-delà de 150 s`);
    ok(r.im && r.im.n > 100 && r.im.moyenne > 0 && r.im.pire5 >= r.im.moyenne, `F : ${cls} : durée des images relevée (moyenne ${r.im && r.im.moyenne} ms, pire 5 % ${r.im && r.im.pire5} ms)`);
    ok(r.j.sansSigne === 0 && !errs.length, `F : ${cls} : aucun coup sans signe, aucune erreur ` + errs.slice(0, 2).join(' | '));
    await ctx.close();
  }
}

// ═══ G. Règle d'or ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
if (SEC.includes('G')) {
  console.log('\n══ G · règle d\'or : banc-arene G contre l\'index.html d\'avant ══');
  const env = Object.assign({}, process.env, { BANC_AVANT: process.env.BANC_AVANT || '4aa788c' });
  const r = spawnSync(process.execPath, [join(THEMIST, '_dev', 'bancs', 'banc-arene.mjs'), String(PORT), 'G'], { env, encoding: 'utf8', maxBuffer: 64 << 20 });
  const out = (r.stdout || '') + (r.stderr || ''); const m = /banc-arene : (\d+) vérifications, (\d+) échec/.exec(out), im = /(\d+) images comparées, (\d+) différentes/.exec(out);
  for (const l of out.split('\n')) if (/images comparées|ÉCHEC/.test(l)) console.log('   ' + l);
  ok(m && +m[2] === 0 && im && +im[2] === 0 && +im[1] >= 10000, `G : ${im ? im[1] : '?'} images comparées, ${im ? im[2] : '?'} différentes (contre ${env.BANC_AVANT}) : ${m ? m[1] + ' vérifications, ' + m[2] + ' échec(s)' : 'banc-arene G non lu'}`);
}

// ═══ H. Mouvements réduits et tailles d'écran ═══════════════════════════════════════════════════════════════════════════════════════
if (SEC.includes('H')) {
  console.log('\n══ H · mouvements réduits, tailles d\'écran ══');
  {
    const { page, errs, ctx } = await ouvre('', { rm: true });
    await page.evaluate(ESSAI, { phase: 1, cls: 'lum', graine: 2 });
    const r = await page.evaluate(([PAS_]) => { const PAS = eval(PAS_), D = window.__brumeux.dbg(), X = D.X, e = X.e; const ys = new Set(); X.boucle = [{ k: 'fixe', g: 'feinte' }]; X.ph = 'entracte'; X.t = 1e9;
      D.P.x = e.x; D.P.y = D.AR.y0 + 500; const yl = []; PAS(60, () => { D.P.x = e.x; D.P.y = D.AR.y0 + 500; D.P.iT = 1; }); PAS(180, () => { D.P.x = e.x; D.P.y = D.AR.y0 + 500; D.P.iT = 1; yl.push(e.y); });
      // en mouvements réduits, ses mains descendent vers toi sans flotter : la hauteur est monotone (aucun changement de sens)
      let chg = 0; for (let i = 2; i < yl.length; i++) if (Math.sign(yl[i] - yl[i - 1]) * Math.sign(yl[i - 1] - yl[i - 2]) < 0) chg++;
      return { rm: matchMedia('(prefers-reduced-motion: reduce)').matches, ys: chg === 0 ? 1 : chg }; }, [PAS.toString()]);
    ok(r.rm && r.ys === 1, 'H : mouvements réduits : ses mains ne flottent pas (elles descendent vers toi sans changer de sens)');
    await capture(page, 'brumeux-rm.png');
    ok(!errs.length, 'H : aucune erreur ' + errs.slice(0, 2).join(' | '));
    await ctx.close();
  }
  for (const [w, h] of [[640, 360], [2560, 1440], [390, 844]]) {
    const { page, errs, ctx } = await ouvre('', { vp: { width: w, height: h } });
    await page.evaluate(ESSAI, { phase: 1, bot: 2, cls: 'tis', graine: 8 });
    const r = await page.evaluate(([PAS_]) => { const PAS = eval(PAS_); let n = 0, bar = false; PAS(60 * 30, i => { if (i % 20 === 0) { window.__arene.dbg().frame(); n += window.__arene.indic().length; bar = bar || !document.querySelector('#hBoss').hidden; } });
      return { j: window.__arene.journal(), bar, st: window.__brumeux.statsRun(), n }; }, [PAS.toString()]);
    ok(r.j.sansSigne === 0 && r.j.coups >= 1, `H : ${w} × ${h} : aucun coup sans signe (${r.j.coups} coups, ${r.n} signes relevés)`);
    ok(r.bar, `H : ${w} × ${h} : barre de vie en cinq segments visible`);
    ok(!errs.length, `H : ${w} × ${h} : aucune erreur ` + errs.slice(0, 2).join(' | '));
    if (w === 640) await capture(page, `brumeux-${w}x${h}.png`);
    await ctx.close();
  }
}

console.log(`\nbanc-brumeux : ${checks} vérifications, ${fails} échec${fails > 1 ? 's' : ''}.`);
await browser.close();
process.exit(fails ? 1 : 0);
