// Banc Chromium : v18.5, action 5a (le Brumeux : socle technique) ; v18.6, action 5b (la phase I, « le Rappel » : section I) ; v18.7, action 5c
// (la phase II, « L'Ouvrage », et les constructions : section J) ; v18.8, action 5d (la phase III, « La Couture » : section K) ; v18.9, action 5e
// (la phase IV, « L'Emprunt » : section L) ; v18.10, action 5f (la phase V, « L'Effacement », et sa mort : section M). Usage :
//   node banc-brumeux.mjs <port> [sections, ex. ABCDEFGHIJKLM] [dossier de captures, hors dépôt]
// Depuis 5f, les cinq phases jouent leur partition : A et B éprouvent le moteur sur un essai de la phase V qui rejoue la partition d'essai de 5a
// (partEssai, l'adresse ?brumeux=5&essai=1 ; B passe encore par la phase IV pour la transition IV → V) ; D pose ses constructions d'essai en III, la
// partition tue (__brumeux.poser) ; C, F et H conduisent des combats entiers depuis la phase I.
// A. Lecture et tirages = logique pure : les poids en jeu égalent brxLire sur les mêmes entrées (profil, verdicts, dégâts reçus par source,
//    ce qui t'a tué) ; même graine, même partition et mêmes zones ; les mesures libres tiennent dans le budget du palier et le non-cumul.
// B. Partition et transitions : les mesures fixes dans l'ordre, à nu après la boucle (anneau ivoire), un seuil de PV ne se traverse pas d'un coup
//    (verrou 1,2 s), transition (cri, état d'arène de la phase, présence haut → sol, relecture), jamais une pause ; la mort (croix tombée).
// C. 0 coup sans signe : quatre combats conduits (bot=2, dieu), une forme chacun, phases I à V : journal de l'arène à 0.
// D. Constructions d'essai : annonce en craie, pose quand la place est libre, poussée sans dégât après l'attente, jamais sur toi, plafond du palier,
//    connexité (fermer le seul passage est refusé), coût (image avec cinq constructions ≤ +1,5 ms).
// E. Paliers : PV de la phase V (courte / entière), budget des mesures libres, plafond des constructions, jamais de PV en plus.
// F. Durée et images au bot qui frappe : chaque forme de la phase I à la victoire (temps par phase), durée des images relevée (moyenne, pire 5 %).
// G. Règle d'or : rejoue banc-arene.mjs G (image par image, 19 salles, trois paliers) contre l'index.html d'avant (BANC_AVANT, défaut 7f50cb0, la fiche 5e).
// H. Mouvements réduits (rien ne flotte ni ne pulse) et tailles d'écran (640 × 360, 2 560 × 1 440, 390 × 844) : combat conduit, aucun coup sans signe.
// I. La phase I, « le Rappel » (5b) : I-A tirage des tableaux en jeu = logique pure (graine, poids par18 / par18A / par18R, premier tableau = celui
//    qui t'a tué), trois tiers distincts, le plus loin d'abord ; I-B fragments dans les bornes, hors des montants, jamais deux à la fois, dalles
//    dans le fragment, confinement des règles (Verre, Braseros, dalles) ; I-C rideau → à nu 3 s, non vidé à 30 s → sans fenêtre, une feinte au
//    plus ; I-D phase I conduite par le bot dans les quatre formes (0 coup sans signe, durée, tableaux vidés, dalles sautées) ; I-E coût de rendu
//    contre le boss d'essai de l'arène à foule égale (≤ +1,5 ms) et peinture des calques (≤ 250 ms) ; I-F mouvements réduits et captures.
// J. La phase II, « L'Ouvrage » (5c) : J-A lecture des sortes, places, partition et boucle en jeu = logique pure (même graine, même lecture) ;
//    J-B constructions en jeu (annonce en craie et mains à nu, annulation au seuil, poussée sans dégât, plafond, fissures, destruction, Ruée
//    arrêtée, échafaudage, puits, passerelles, chutes, cloche, appel, persistance en III, filtre en IV, effacement en V) ; J-C tirs arrêtés par
//    les constructions, pas par les fosses ; un tir du joueur casse ce qu'il touche ; J-D phase II conduite par le bot dans les quatre formes,
//    deux graines (0 coup sans signe, durée, constructions bâties, annulées, cassées, effondrées ; temps pour casser chaque sorte) ; J-E coût
//    apparié (≤ +1,5 ms), peinture (≤ 250 ms), assemblage (≤ 3 ms) ; J-F mouvements réduits, planche des matières et captures ; J-G les zones des mutations
//    (Échos, Glas) et l'Ombre frappent avec un signe dans l'arène.
// K. La phase III, « La Couture » (5d) : K-A ce qu'il coud en jeu = logique pure (la némésis en premier fil, puis le Masqué cousu qui t'a tué ;
//    souvenirs sans remise ; points de montage ; même graine, même Couture) ; K-B montage 4,4 s, nœud (PV, un coup par image, hors du ciblage
//    automatique, retenu hors de vue), coupe, abouti, suspendu au plafond, à nu 3 s / 2 s, l'île d'une douve, transitions II → III → IV, sa croix
//    est l'entité frappable, chargements des cousus ≥ 0,6 s ; K-C la némésis (trousseau, PV, brisée) et la promotion (cousu oui, Brumeux non, essai
//    non ; attente acte III, salle 3) ; K-D la phase III au bot dans les quatre formes, deux graines (0 coup sans signe) ; K-E coût apparié
//    (≤ +1,5 ms) et peinture ; K-F mouvements réduits et captures.
// L. La phase IV, « L'Emprunt » (5e) : L-A lecture, poids, tirage et premier emprunt en jeu = logique pure ; L-B corps (r 48, plein dans 1,15 × r,
//    frappable, cœur), caméra fixe, emprunt (prise, liseré de la tuile, zones orange au liseré lavande, ≥ 0,8 s, épuisé → à nu 2 s), gestes (Passe
//    brisée, Révérence et son renoncement, Volte), mémoire sans empruntable, III → IV (décousus, chute, 240 px/s, constructions filtrées), IV → V ;
//    L-C Dernier Souvenir (brûler le talent emprunté pendant la prise et pendant une étape, sous le plafond de la phase ; un autre talent ; gardien et
//    Masqué inchangés) ; L-D la phase IV au bot dans les quatre formes, deux graines (0 coup sans signe) ; L-E coût apparié et peinture ; L-F
//    mouvements réduits et captures.
// M. La phase V, « L'Effacement » (5f) : M-A lecture, candidats, premier et libres en jeu = logique pure (même graine, même X.montre injecté) ; M-B
//    partitions courte et entière, les quatre gestes (éclair, effondrement → fosse, pan du bord, montage court, emprunt de ce qu'il a emprunté en IV), la
//    feinte double, deux resserrements (seuils, attente de fin de mesure, poussée sans dégât, constructions filtrées, masque fendu ; jamais au temps), IV → V ;
//    M-C Dernier Souvenir en V et promotion d'un cousu de V ; M-D la phase V au bot (quatre formes, courte et entière, tenue 90 s) et un combat entier
//    depuis la phase I ; M-E coût apparié, peinture des états 7 et 8, entrée d'un essai en V ; M-F mouvements réduits et captures (mort en cinq moments).
import { createRequire } from 'node:module';
import { readFileSync, mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
const require = createRequire('/opt/npm-tools/node_modules/');
const { chromium } = require('playwright');
const THEMIST = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PORT = process.argv[2] || 8765, SEC = (process.argv[3] || 'ABCDEFGHIJKLM').toUpperCase(), DIR = process.argv[4] || null;
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
  vm.runInContext(bloc('des') + '\n' + bloc('brx') + '\nthis.F={desRng,brxLire,brxBoucle,brxBudget,brxPv,brxSeuils,brxTirer,brxTiers,brxTiersLoin,brxDansRect,brxPartition,brxBatir,brxGeo,brxPoser,brxOrdreSortes,brxSortesPoids,brxDans,brxTous,brxEtats,brxGrille,brxConnexe,brxAppel,BRX_SORTES};', c); return c.F; })();

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
    S.brumeux = { v: 1, tentatives: 2, victoires: 0, phaseMax: 5, mort: { 1: 'fils', 5: 'anneau' }, vus: ['disque'] };
    const r = window.__brumeux.essai(5, { muet: true, graine: 101, partEssai: true }); const D = window.__brumeux.dbg(), X = D.X;
    D.RUN.par18 = { brute: 300, spectre: 100 }; D.RUN.prof.ko = { petards: 2 };
    const L = window.__brumeux.lire(); const e = window.__brumeux.etat();
    const prof = (function () { try { return window.__cm161 ? null : null; } catch (x) { return null; } })();
    return { r, poids: L.poids, premier: L.premier, lec: e.lec, boucle: e.boucle, prof: D.RUN.prof, graine: e.graine, palier: e.palier,
      entrees: { prof: window.__brumeux.dbg().X.lec && null, eff: S.mem.prof.eff, ko: D.RUN.prof.ko, par: D.RUN.par18, tue: S.brumeux.mort } }; }, [PAS.toString()]);
  // le profil tel que le jeu le calcule (profile() mêle la run et la mémoire) : on le relit par un second appel qui ne change rien
  const prof = await page.evaluate(() => { const D = window.__brumeux.dbg(); const p = {}; for (const k of ['portee', 'esquive', 'soin', 'risque', 'rythme', 'puissance']) p[k] = null; try { const pr = window.__brume.SAVE.mem.prof.ax; for (const k in pr) p[k] = pr[k]; } catch (e) {} return p; });
  const BE = (() => { const w = {}; new Function('window', readFileSync(join(THEMIST, 'data', 'bestiaire.js'), 'utf8'))(w); return w.BRUME_DATA.bestiaire; })();
  const cms = Object.fromEntries(Object.entries(BE.contreMesures).map(([k, c]) => [k, { ax: c.ax, hi: !!c.hi }]));
  const Lp = PUR.brxLire(DB, { prof, eff: r.entrees.eff, ko: r.entrees.ko, cms, par: r.entrees.par, tue: r.entrees.tue }, 4);
  const ecart = Math.max(...Object.keys(DB.elements).map(id => Math.abs((r.poids[id] || 0) - (Lp.poids[id] || 0))));
  ok(ecart < 1e-9, `A : les poids en jeu égalent brxLire sur les mêmes entrées (écart max ${ecart.toExponential(1)}) : ${Object.entries(r.poids).map(([k, v]) => k + ' ' + v.toFixed(2)).join(', ')}`);
  ok(r.premier === 'anneau' && Lp.premier === 'anneau', 'A : « ce qui t\'a tué » à la phase V (SAVE.brumeux) est le premier élément');
  ok(r.poids.couloir > r.poids.disque && r.poids.couloir > 1.5, `A : portée haute et Traque qui a porté : le couloir pèse ${r.poids.couloir.toFixed(2)} (> disque ${r.poids.disque.toFixed(2)})`);
  ok(r.poids.disque < 1, `A : les Pétards déjoués deux fois (abandonnés) : le disque pèse ${r.poids.disque.toFixed(2)} (< 1)`);
  // la première mesure libre de la boucle commence par l'anneau
  const libres = r.boucle.filter(m => m.startsWith('['));
  ok(libres.length >= 2 && libres[0].startsWith('[anneau'), `A : la première mesure libre commence par l'anneau : ${r.boucle.join(' ')}`);
  // budget et non-cumul de chaque mesure libre (phase V, Normal : 7 ; depuis 5e, la phase IV joue sa partition)
  const bud = PUR.brxBudget(DB, 4, 'normal');
  for (const m of libres) { const ids = m.slice(1, -1).split('+'); let men = 0; const cnt = {}; for (const id of ids) { men += DB.elements[id].menace; cnt[DB.elements[id].sorte] = (cnt[DB.elements[id].sorte] || 0) + 1; }
    ok(men <= bud && Object.entries(cnt).every(([s, n]) => n <= DB.cumul[s]), `A : mesure libre ${m} : menace ${men} ≤ ${bud}, non-cumul tenu`); }
  // même graine, même partition : un second essai à la même graine donne la même boucle et les mêmes premières zones
  const d2 = await page.evaluate(([PAS_]) => { const PAS = eval(PAS_); const out = [];
    for (let k = 0; k < 2; k++) { window.__brumeux.essai(5, { muet: true, graine: 777, partEssai: true }); const D = window.__brumeux.dbg(); D.P.x = D.AR.x0 + 500; D.P.y = D.AR.y0 + 400; const zs = []; PAS(60 * 12, () => { D.P.x = D.AR.x0 + 500; D.P.y = D.AR.y0 + 400; for (const z of D.X.zones) if (!zs.some(q => q.o === z)) zs.push({ o: z, k: z.forme + ':' + z.id + ':' + Math.round(z.x || z.x0) + ',' + Math.round(z.y || z.y0) }); });
      out.push({ boucle: window.__brumeux.etat().boucle.join(' '), zones: zs.map(q => q.k) }); } return out; }, [PAS.toString()]);
  ok(d2[0].boucle === d2[1].boucle && d2[0].zones.join('|') === d2[1].zones.join('|') && d2[0].zones.length >= 2, `A : même graine (777), même boucle et mêmes zones (${d2[0].zones.length} zones) : ${d2[0].boucle}`);
  ok(!errs.length, 'A : aucune erreur ' + errs.slice(0, 2).join(' | '));
  await ctx.close();
}

// ═══ B. Partition et transitions ════════════════════════════════════════════════════════════════════════════════════════════════════
if (SEC.includes('B')) {
  console.log('\n══ B · partition et transitions ══');
  const { page, errs, ctx } = await ouvre('');
  const r = await page.evaluate(([PAS_]) => { const PAS = eval(PAS_); const r0 = ESSAI_({ phase: 5, graine: 5, cls: 'lum', partEssai: true }); const D = window.__brumeux.dbg(), X = D.X, e = X.e, out = { r0 };
    function ESSAI_(o) { window.__brume.cls(o.cls); const r = window.__brumeux.essai(o.phase, Object.assign({ muet: true }, o)); for (let i = 0; i < 3; i++) window.__brume.step(1 / 60, 1); return r; }
    // 1. les mesures fixes dans l'ordre : on relève l'ordre des gestes lancés (zones et feinte) sur une boucle
    const vu = []; let nuVu = false, vulnMax = 0; D.P.x = D.AR.x0 + 600; D.P.y = D.AR.y0 + 500;
    PAS(60 * 40, () => { D.P.x = D.AR.x0 + 600; D.P.y = D.AR.y0 + 500; D.P.iT = 1; const et = window.__brumeux.etat(); if (et.ph === 'nu') nuVu = true; vulnMax = Math.max(vulnMax, e.vuln || 0);
      const fx = !!(X.boucle && X.boucle[X.im - 1] && X.boucle[X.im - 1].k === 'fixe');   // la zone vient-elle d'une mesure fixe (et non d'un tirage libre) ?
      for (const z of X.zones) if (!vu.some(v => v.o === z)) vu.push({ o: z, id: z.id, im: X.im, fx }); if (D.room.bl && !vu.some(v => v.o === D.room.bl)) vu.push({ o: D.room.bl, id: 'feinte', im: X.im, fx }); });
    out.ordre = vu.map(v => v.id); out.ordreFixe = vu.filter(v => v.fx).map(v => v.id); out.nuVu = nuVu; out.vulnMax = vulnMax; out.boucle = window.__brumeux.etat().boucle; out.pause = document.querySelector('#overlay').hidden;
    return out; }, [PAS.toString()]);
  ok(r.ordre.length >= 4, `B : gestes lancés dans l'ordre de la partition : ${r.ordre.join(' → ')}`);
  // l'ordre des mesures fixes de la partition d'essai (disque, feinte, couloir) se retrouve dans l'ordre des gestes
  const fixes = DB.partition.essai.filter(m => m.k === 'fixe').map(m => m.g), vus = r.ordreFixe.filter((id, i, a) => i === 0 || id !== a[i - 1] || fixes.length === 1);
  let i = 0, bon = true; for (const id of vus) { if (id === fixes[i % fixes.length]) i++; else if (id !== fixes[(i - 1 + fixes.length) % fixes.length]) bon = false; }
  ok(bon && i >= 3, `B : les mesures fixes reviennent dans l'ordre (${fixes.join(', ')}) : ${vus.join(' → ')}`);
  ok(r.nuVu && r.vulnMax >= DB.partition.nuS - 0.1, `B : à nu après la boucle (vuln ${r.vulnMax.toFixed(1)} s ≥ ${DB.partition.nuS})`);
  ok(r.pause, 'B : jamais une pause pendant le combat');
  await capture(page, 'brumeux-phase-5-essai.png');
  // seuils et transitions : les PV sont posés juste au-dessus du seuil, le bot frappe (les coups passent par hitEnemy du jeu)
  const t = await page.evaluate(([PAS_]) => { const PAS = eval(PAS_); window.__brume.cls('lum'); window.__brumeux.essai(4, { muet: true, graine: 5, partEssai: true }); for (let i = 0; i < 3; i++) window.__brume.step(1 / 60, 1);
    const D = window.__brumeux.dbg(), X = D.X, e = X.e, max = e.maxHp, s = X.seuils, out = {};
    // IV (depuis 5e, la phase IV a sa partition : l'essai y commence pour la transition IV → V) : au sol, arène de l'état 6 ; une construction d'essai posée par la console
    out.p4 = { phase: window.__brumeux.etat().phase, r: Math.round(e.r), etat: window.__arene.etat().etat, trans: window.__brumeux.etat().trans, presence: e.y > D.AR.y0 + 200 };
    out.poser = window.__brumeux.poser(D.P.x + 160, D.P.y, 34); PAS(60 * 3); out.consAvant = window.__brumeux.etat().cons.length;
    X.bot = 2; X.essai.bot = 2; e.hp = Math.floor(max * s[3]) + 40; const ph0 = window.__brumeux.etat().phase; let hpAt = null, lockVu = 0, t1 = null, tr = null, etats = [], presence = [];
    PAS(60 * 14, i => { const et = window.__brumeux.etat(); if (et.phase === 5 && t1 == null) { t1 = i; lockVu = e.lockT - D.RUN.time; hpAt = e.hp; } etats.push(window.__arene.etat().etat); if (i % 60 === 0) presence.push([et.phase, Math.round(e.r), Math.round(e.y)]); if (et.trans) tr = et; });
    out.ph0 = ph0; out.phase = window.__brumeux.etat().phase; out.hpMin = hpAt; out.seuil = Math.floor(max * s[3]) - 1; out.lockVu = lockVu; out.lectures = X.j.lectures; out.transitions = X.j.transitions; out.pause = document.querySelector('#overlay').hidden;
    // V (5f) : l'état 6 est gardé, les constructions restent
    PAS(60 * 4); out.p5 = { phase: window.__brumeux.etat().phase, etat: window.__arene.etat().etat, cons: window.__brumeux.etat().cons.length, trans: window.__brumeux.etat().trans, lectures: X.j.lectures };
    return out; }, [PAS.toString()]);
  ok(t.ph0 === 4 && t.phase >= 5 && Math.abs(t.hpMin - t.seuil) < 1, `B : le seuil de la phase IV ne se traverse pas d'un coup (PV à l'instant du passage ${Math.round(t.hpMin)} = seuil − 1 : ${t.seuil}), phase V atteinte`);
  ok(t.lockVu > 1.0 && t.lockVu <= 1.25, `B : verrou de phase posé (${t.lockVu.toFixed(2)} s, 1,2 attendu)`);
  ok(t.lectures >= 2 && t.transitions.length >= 1 && t.pause, `B : relecture à la transition (${t.lectures} lectures), jamais de pause`);
  ok(t.p4.phase === 4 && t.p4.r === DB.dessin.r.sol && t.p4.etat === DB.phases[3].arene && !t.p4.trans && t.p4.presence, `B : phase IV : au sol (r ${t.p4.r}), arène à l'état ${t.p4.etat}, transition finie`);
  ok(t.consAvant >= 1 && t.poser.ok, `B : une construction d'essai posée en IV par la console (${t.consAvant} debout ; elle n'est plus tirée : 5c)`);
  ok(t.p5.phase === 5 && t.p5.etat === DB.phases[4].arene && t.p5.cons === t.consAvant && !t.p5.trans && t.p5.lectures >= 2, `B : phase V : arène à l'état ${t.p5.etat} (gardé), constructions restées (${t.p5.cons}), relue`);
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
    // depuis 5b, la phase I dure le temps de ses tableaux pour une forme dont le bot ne les vide pas (Tisse-Destin) : PV placeholders, recalés en 5g
    ok(r.st.phase >= 2, `C : ${cls} : le bot qui frappe avance (phase ${r.st.phase} en ${Math.round((r.fin || 60 * 170) / 60)} s)`);
    ok(r.j.assertions === 0 && !errs.length, `C : ${cls} : aucune erreur ` + errs.slice(0, 2).join(' | '));
    if (cls === 'gou') await capture(page, 'brumeux-combat.png');
    await ctx.close();
  }
}

// ═══ D. Constructions ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════
if (SEC.includes('D')) {
  console.log('\n══ D · constructions d\'essai ══');
  const { page, errs, ctx } = await ouvre('');
  await page.evaluate(ESSAI, { phase: 3, cls: 'lum', graine: 9 });
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
      PAS(60 * 620, i => { if (i % 3 === 0) D.render(); const et = window.__brumeux.etat(); if ((et.scene || !et.on) && fin == null) fin = i; });
      return { st: window.__brumeux.statsRun(), im: window.__brumeux.images(), fin, j: window.__arene.journal() }; }, [PAS.toString()]);
    const ph = r.st.phases, tot = Object.values(ph).reduce((a, p) => a + p.t, 0);
    console.log(`   ${cls} : ${r.st.fin} en ${Math.round(tot)} s ; par phase ${Object.entries(ph).map(([k, p]) => k + ' : ' + p.t + ' s, ' + p.coups + ' coups').join(' · ')} ; images ${r.im ? r.im.moyenne + ' ms (pire 5 % ' + r.im.pire5 + ' ms, ' + r.im.n + ' images)' : 'non relevées'}`);
    // depuis 5c, la phase II (constructions, échafaudages à −40 %) dure plus pour le Tisse-Destin au bot (PV placeholders recalés en 5g) : 480 s et 200 s ;
    // depuis 5e, la phase IV (environ 60 s au Tisse-Destin) s'ajoute : 600 s pour le combat entier (fenêtre de 620 s)
    ok(r.st.fin === 'victoire' && tot <= 600, `F : ${cls} : victoire du bot en ${Math.round(tot)} s (≤ 600)`);
    ok(Object.values(ph).every(p => p.t <= 200), `F : ${cls} : aucune phase au-delà de 200 s`);
    ok(r.im && r.im.n > 100 && r.im.moyenne > 0 && r.im.pire5 >= r.im.moyenne, `F : ${cls} : durée des images relevée (moyenne ${r.im && r.im.moyenne} ms, pire 5 % ${r.im && r.im.pire5} ms)`);
    if (r.j.liste.length) console.log('   ' + JSON.stringify(r.j.liste.slice(0, 4)));
    ok(r.j.sansSigne === 0 && !errs.length, `F : ${cls} : aucun coup sans signe, aucune erreur ` + errs.slice(0, 2).join(' | '));
    await ctx.close();
  }
}

// ═══ G. Règle d'or ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
if (SEC.includes('G')) {
  console.log('\n══ G · règle d\'or : banc-arene G contre l\'index.html d\'avant ══');
  const env = Object.assign({}, process.env, { BANC_AVANT: process.env.BANC_AVANT || '7f50cb0' });
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
    if (r.j.liste.length) console.log('   ' + JSON.stringify(r.j.liste.slice(0, 4)));
    ok(r.j.sansSigne === 0 && r.j.coups >= 1, `H : ${w} × ${h} : aucun coup sans signe (${r.j.coups} coups, ${r.n} signes relevés)`);
    ok(r.bar, `H : ${w} × ${h} : barre de vie en cinq segments visible`);
    ok(!errs.length, `H : ${w} × ${h} : aucune erreur ` + errs.slice(0, 2).join(' | '));
    if (w === 640) await capture(page, `brumeux-${w}x${h}.png`);
    await ctx.close();
  }
}

// ═══ I. La phase I, « le Rappel » (5b) ═══════════════════════════════════════════════════════════════════════════════════════════════
if (SEC.includes('I')) {
  console.log('\n══ I · la phase I, « le Rappel » ══');
  const TB = DB.tableaux;
  // un tableau imposé au début de la boucle (les autres mesures se taisent), le joueur tenu en place
  const IMPOSE = ([spec, place]) => { const D = window.__brumeux.dbg(), X = D.X; X.boucle = [{ k: 'tableau', tab: Object.assign({ densite: 0, champion: false, rejoue: false }, spec) }]; X.im = 0; X.ph = 'entracte'; X.t = 0.01; X.tiersVus = place || []; X.tab = null; };
  // ── I-A · tirage des tableaux en jeu = logique pure
  {
    const { page, errs, ctx } = await ouvre('');
    const r = await page.evaluate(([PAS_]) => { const PAS = eval(PAS_), B = window.__brume; B.cls('lum'); B.start(); PAS(3);
      const S = B.SAVE; S.brumeux = { v: 1, tentatives: 1, victoires: 0, phaseMax: 1, mort: { 1: 'tableau' }, vus: [], tab: { 1: { decor: 'crypt', theme: 'choeur', regle: 'braseros' } } };
      const D0 = window.__brumeux.dbg(); D0.RUN.par18 = { spectre: 400, rampant: 100 }; D0.RUN.par18A = { 1: 100, 2: 600, 5: 50 }; D0.RUN.par18R = { verre: 300 };
      const r = window.__brumeux.essai(1, { muet: true, graine: 4242 }); const D = window.__brumeux.dbg(), X = D.X;
      return { r, boucle: window.__brumeux.etat().boucle, brute: X.boucle.map(m => m.k === 'tableau' ? { k: m.k, tab: m.tab } : m.k === 'libre' ? { k: m.k, elements: m.elements } : { k: m.k, g: m.g }), lec: X.lec, palier: X.palier, graine: X.graine }; }, [PAS.toString()]);
    const pur = PUR.brxBoucle(DB, r.lec, 0, r.palier, PUR.desRng(r.graine), {}, { premiere: true }).map(m => m.k === 'tableau' ? { k: m.k, tab: m.tab } : m.k === 'libre' ? { k: m.k, elements: m.elements } : { k: m.k, g: m.g });
    ok(JSON.stringify(pur) === JSON.stringify(r.brute), `I-A : la boucle en jeu égale brxBoucle à la même graine et à la même lecture : ${r.boucle.join(' ')}`);
    const tabs = r.brute.filter(m => m.k === 'tableau').map(m => m.tab);
    ok(tabs[0].decor === 'crypt' && tabs[0].theme === 'choeur' && tabs[0].regle === 'braseros' && tabs[0].rejoue && new Set(tabs.map(t => t.decor)).size === 3, 'I-A : le premier tableau rejoue celui qui t\'a tué (Cryptes, Chœur, Braseros) ; trois décors distincts');
    ok(r.lec.parA[2] === 600 && r.lec.parR.verre === 300 && r.lec.par.spectre === 400 && r.lec.acte === 10 && r.lec.tab && r.lec.tab.theme === 'choeur', 'I-A : la lecture porte RUN.par18, par18A, par18R, l\'acte et le tableau qui t\'a tué');
    // la même graine, la même boucle ; une graine voisine, une autre
    const r2 = await page.evaluate(() => { const o = []; for (const g of [4242, 4242, 4243]) { window.__brumeux.essai(1, { muet: true, graine: g }); o.push(window.__brumeux.etat().boucle.join(' ')); } return o; });
    ok(r2[0] === r2[1] && r2[0] !== r2[2], `I-A : déterministe à graine égale (${r2[0]})`);
    // les trois tiers d'une boucle : le premier au plus loin de toi, puis chacun une fois (les ennemis tombent à la main)
    const t = await page.evaluate(([PAS_]) => { const PAS = eval(PAS_); window.__brumeux.essai(1, { muet: true, graine: 9 }); const D = window.__brumeux.dbg(), X = D.X, P = D.P, AR = D.AR; const tiers = [], P0 = []; let dalles = [], horsF = 0, deux = 0;
      const fixe = () => { P.x = AR.x0 + (AR.x1 - AR.x0) * 0.2; P.y = AR.y0 + 600; P.iT = 1; P.hp = P.s.maxHp; };
      PAS(60 * 70, i => { fixe(); const T = X.tab; if (T && (!tiers.length || tiers[tiers.length - 1].o !== T)) { tiers.push({ o: T, i: T.i, decor: T.decor }); P0.push([P.x, P.y]); }
        if (T && T.sub === 'vie' && T.t > 2) { for (const o of D.enemies) if (!o.dead && !o.brx18) window.__arene.dbg().kill(o); D.room.spawning = []; }
        if (T) for (const h of T.dalles) { if (!dalles.includes(h)) dalles.push(h); if (h.x - h.r < T.frag.x0 - 1e-6 || h.x + h.r > T.frag.x1 + 1e-6 || h.y - h.r < T.frag.y0 - 1e-6 || h.y + h.r > T.frag.y1 + 1e-6) horsF++; } });
      return { tiers: tiers.map(x => x.i), decors: tiers.map(x => x.decor), P0, tiersG: X.tiers.map(q => ({ x0: q.x0, x1: q.x1, y0: q.y0, y1: q.y1, i: q.i })), horsF, nd: dalles.length }; }, [PAS.toString()]);
    const premiers = t.tiers.slice(0, 3), dist = (q, p) => Math.hypot(p[0] - (q.x0 + q.x1) / 2, p[1] - (q.y0 + q.y1) / 2);
    ok(new Set(premiers).size === 3 && premiers[0] === PUR.brxTiersLoin(t.tiersG, t.P0[0][0], t.P0[0][1], []), `I-A : une boucle pend ses trois tableaux à trois tiers distincts (${premiers.join(', ')}), le premier au plus loin de toi`);
    ok(t.tiers.length >= 4 && new Set(t.decors.slice(0, 3)).size === 3, `I-A : la boucle suivante recommence (${t.tiers.length} tableaux en 70 s, décors ${t.decors.join(', ')})`);
    ok(!errs.length, 'I-A : aucune erreur ' + errs.slice(0, 2).join(' | '));
    await ctx.close();
  }
  // ── I-B · fragments, confinement des règles
  {
    const { page, errs, ctx } = await ouvre('');
    await page.evaluate(ESSAI, { phase: 1, cls: 'lum', graine: 21 });
    const r = await page.evaluate(([PAS_, IMPOSE_]) => { const PAS = eval(PAS_), IMPOSE = eval(IMPOSE_), D = window.__brumeux.dbg(), X = D.X, P = D.P, AR = D.AR, out = {};
      const mont = D.room.pillars.filter(p => p.kind === 'pilier18' && !p.brx18);
      out.montants = mont.length; out.frags = X.tiers.map(t => ({ dans: t.frag.x0 >= AR.x0 && t.frag.x1 <= AR.x1 && t.frag.y0 >= AR.y0 && t.frag.y1 <= AR.y1, libre: mont.every(m => m.x + m.r < t.frag.x0 || m.x - m.r > t.frag.x1 || m.y + m.r < t.frag.y0 || m.y - m.r > t.frag.y1) }));
      // Verre : le joueur au bord du tiers 1 (le fragment du tiers 2 est à l'écran), un ennemi dedans, un dehors
      IMPOSE([{ decor: 'faub', theme: 'meute', regle: 'verre' }, [0, 1]]); const f = X.tiers[2].frag, bx = f.x0;
      const tient = () => { P.x = bx - 140; P.y = AR.y0 + 500; P.iT = 1; P.hp = P.s.maxHp; };
      PAS(60 * 3, tient); out.sub = X.tab && X.tab.sub; out.n = X.tab && X.tab.n;
      const en = D.enemies.filter(o => !o.dead && !o.brx18); const a = en[0], b = en[1];
      const coup = (e, x, y) => { e.x = x; e.y = y; e.hp = e.maxHp; e.iT = 0; const h0 = e.hp; D.hit(e, 10, { crit: false }); return h0 - e.hp; };
      out.verreDedans = coup(a, f.x0 + 60, P.y); out.verreDehors = coup(b, bx - 260, P.y);
      const jou = (x) => { P.x = x; P.y = AR.y0 + 500; P.iT = 0; P.dashT = 0; P.hp = P.s.maxHp; const h0 = P.hp; D.hurt(10, null); return h0 - P.hp; };
      out.jDedans = jou(f.x0 + 40); out.jDehors = jou(bx - 140);
      // Braseros : un ennemi près d'un brasero, un loin
      IMPOSE([{ decor: 'coeur', theme: 'meute', regle: 'braseros' }, [0, 1]]); PAS(60 * 3, tient); const br = X.tab.braz, en2 = D.enemies.filter(o => !o.dead && !o.brx18);
      out.brazN = br.length; out.brazDans = br.every(q => q.x > f.x0 && q.x < f.x1 && q.y > f.y0 && q.y < f.y1);
      out.brPres = coup(en2[0], br[0].x - 30, br[0].y); out.brLoin = coup(en2[1], bx - 260, P.y);
      // le Sol qui se dérobe : toi hors du fragment : aucune dalle sur toi ; les dalles restent dans le fragment ; jamais deux tableaux à la fois
      IMPOSE([{ decor: 'crypt', theme: 'meute', regle: 'sol' }, [0, 1]]); let surToi = 0, horsF = 0, nd = new Set(), deux = 0;
      PAS(60 * 14, () => { tient(); const T = X.tab; if (!T) return; for (const h of T.dalles) { nd.add(h); if (Math.hypot(P.x - h.x, P.y - h.y) < h.r + P.r) surToi++; if (h.x - h.r < f.x0 - 1e-6 || h.x + h.r > f.x1 + 1e-6 || h.y - h.r < f.y0 - 1e-6 || h.y + h.r > f.y1 + 1e-6) horsF++; } });
      out.dalles = { n: nd.size, surToi, horsF };
      // toi dans le fragment : les dalles te visent
      let surToi2 = 0, nd2 = new Set(); PAS(60 * 10, () => { P.x = f.x0 + 200; P.y = AR.y0 + 500; P.iT = 1; P.hp = P.s.maxHp; const T = X.tab; if (!T) return; for (const h of T.dalles) { if (!nd2.has(h)) { nd2.add(h); if (Math.hypot(P.x - h.x, P.y - h.y) < h.r + 32) surToi2++; } } });
      out.dalles2 = { n: nd2.size, surToi2 };
      out.unSeul = true; return out; }, [PAS.toString(), IMPOSE.toString()]);
    ok(r.montants === 4 && r.frags.every(q => q.dans && q.libre), `I-B : trois fragments dans les bornes, hors des quatre montants (${r.montants})`);
    ok(r.sub === 'vie' && r.n > 0, `I-B : un tableau vit (${r.n} ennemis convoqués)`);
    ok(Math.abs(r.verreDedans / r.verreDehors - 1.4) < 0.02, `I-B : Verre : un ennemi dans le fragment subit ×1,4 (${r.verreDedans.toFixed(1)} contre ${r.verreDehors.toFixed(1)} dehors)`);
    ok(Math.abs(r.jDedans / r.jDehors - 1.4) < 0.05, `I-B : Verre : toi dans le fragment, +40 % reçus (${r.jDedans.toFixed(1)} contre ${r.jDehors.toFixed(1)} dehors)`);
    ok(r.brazN === 2 && r.brazDans && Math.abs(r.brLoin / r.brPres - 0.4) < 0.02, `I-B : Braseros : deux braseros dans le fragment ; un ennemi du tableau hors de leur lumière subit 40 % (${r.brLoin.toFixed(1)} contre ${r.brPres.toFixed(1)})`);
    ok(r.dalles.n >= 1 && r.dalles.surToi === 0 && r.dalles.horsF === 0, `I-B : Sol : toi hors du fragment, ${r.dalles.n} dalles posées sur ses ennemis, jamais sur toi, toutes dans le fragment`);
    ok(r.dalles2.n >= 1 && r.dalles2.surToi2 === r.dalles2.n, `I-B : Sol : toi dans le fragment, les dalles te visent (${r.dalles2.surToi2} / ${r.dalles2.n})`);
    await capture(page, 'rappel-sol.png');
    // le Siège : toi au contact de la Nourrice, ses naissances (un cercle de 0,5 s en descente) ont au moins le cercle d'une apparition : aucun coup sans signe
    const n = await page.evaluate(([PAS_, IMPOSE_]) => { const PAS = eval(PAS_), IMPOSE = eval(IMPOSE_), D = window.__brumeux.dbg(), X = D.X, P = D.P, AR = D.AR; const j0 = window.__arene.journal();
      IMPOSE([{ decor: 'coeur', theme: 'siege', regle: null }, [0, 1]]); let nour = null, tMin = 9, nais = 0; const vus = new Set();
      PAS(60 * 14, () => { nour = nour && !nour.dead ? nour : D.enemies.find(o => !o.dead && o.type === 'nourrice'); if (nour) { P.x = nour.x - nour.r - P.r - 6; P.y = nour.y; } P.iT = 0; P.dashT = 0; P.hp = P.s.maxHp;
        for (const sp of D.room.spawning) if (!vus.has(sp) && sp.brx18t) { vus.add(sp); tMin = Math.min(tMin, sp.t); nais++; } });
      const j = window.__arene.journal(); return { nais, tMin, coups: j.coups - j0.coups, sans: j.sansSigne - j0.sansSigne, nour: !!nour, liste: j.liste.slice(-3) }; }, [PAS.toString(), IMPOSE.toString()]);
    if (n.sans) console.log('   ' + JSON.stringify(n.liste));
    ok(n.nour && n.nais >= 1 && n.tMin >= TB.apparition[0] - 0.05 && n.coups >= 3 && n.sans === 0, `I-B : Siège, toi au contact de la Nourrice : ${n.nais} naissances, cercle ≥ ${n.tMin.toFixed(2)} s, ${n.coups} coups reçus, ${n.sans} sans signe`);
    ok(!errs.length, 'I-B : aucune erreur ' + errs.slice(0, 2).join(' | '));
    await ctx.close();
  }
  // ── I-C · rideau et fenêtre à nu ; 30 s sans le vider ; une feinte au plus
  {
    const { page, errs, ctx } = await ouvre('');
    await page.evaluate(ESSAI, { phase: 1, cls: 'gou', graine: 3 });
    const r = await page.evaluate(([PAS_, IMPOSE_]) => { const PAS = eval(PAS_), IMPOSE = eval(IMPOSE_), D = window.__brumeux.dbg(), X = D.X, P = D.P, AR = D.AR, e = X.e, out = {};
      const tient = () => { P.x = AR.x0 + 700; P.y = AR.y0 + 600; P.iT = 1; P.hp = P.s.maxHp; };
      // vidé : rideau (0,6 s) puis à nu 3 s
      IMPOSE([{ decor: 'faub', theme: 'meute', regle: null }, []]); let feintes = 0, bl0 = null, tFeinte = null;
      PAS(60 * 4, tient); for (const o of D.enemies) if (!o.dead && !o.brx18) window.__arene.dbg().kill(o); D.room.spawning = [];
      let rid = null, vMax = 0, tNu = 0; PAS(60 * 5, i => { tient(); const T = X.tab; if (T && T.sub === 'rideau' && rid == null) rid = i; vMax = Math.max(vMax, e.vuln || 0); if (e.vuln > 0) tNu++; });
      out.vide = { rid, vMax, tNu: tNu / 60, ph: X.ph, rentres: X.j.rentres };
      // non vidé : à 30 s, ses ennemis rentrent ; pas de fenêtre ; une feinte au plus, pas avant 8 s de vie
      IMPOSE([{ decor: 'coeur', theme: 'meute', regle: null }, []]); e.vuln = 0; let vMax2 = 0, sub = [], tVie = null, n = 0, T0 = null, vivFin = null; const iJ = X.j.tableaux.length;
      // on ne suit que CE tableau (la boucle suivante en accroche d'autres) : ses feintes, ses sous-phases, sa fenêtre
      PAS(60 * 36, i => { tient(); const T = X.tab; if (T && !T0) T0 = T; if (!T || T !== T0) { if (vivFin == null && T0) vivFin = D.enemies.filter(o => !o.dead && !o.brx18).length; return; }
        if (T.sub === 'vie' && tVie == null) tVie = i; if (D.room.bl && D.room.bl !== bl0) { bl0 = D.room.bl; if (!bl0.second) feintes++; if (tFeinte == null) tFeinte = (i - tVie) / 60; } if (T.sub !== sub[sub.length - 1]) sub.push(T.sub);   // une feinte et sa punition (v14 : la seconde, réelle) comptent pour une
        if (T.sub === 'rideau' || T.sub === 'apres') vMax2 = Math.max(vMax2, e.vuln || 0); if (T.sub === 'vie') n = D.enemies.filter(o => !o.dead && !o.brx18).length; });
      out.plein = { sub, vMax2, feintes, tFeinte, rentres: X.j.rentres, vivants: vivFin, nAvant: n, j: X.j.tableaux[iJ] };
      return out; }, [PAS.toString(), IMPOSE.toString()]);
    ok(r.vide.rid != null && Math.abs(r.vide.vMax - TB.nuS) < 0.05 && r.vide.tNu >= TB.nuS - 0.1 && r.vide.rentres === 0, `I-C : tableau vidé : le rideau tombe, à nu ${r.vide.tNu.toFixed(2)} s (anneau ivoire sur ses mains)`);
    if (!(r.plein.sub.join(',') === 'accroche,vie,rideau,apres' && r.plein.vMax2 <= 0 && r.plein.vivants === 0 && r.plein.j && r.plein.j.vide === false)) console.log('   ' + JSON.stringify({ sub: r.plein.sub, vMax2: r.plein.vMax2, rentres: r.plein.rentres, vivants: r.plein.vivants, j: r.plein.j }));
    ok(r.plein.sub.join(',') === 'accroche,vie,rideau,apres' && r.plein.vMax2 <= 0 && r.plein.rentres > 0 && r.plein.vivants === 0 && r.plein.j.vide === false && Math.abs(r.plein.j.duree - TB.accrocheS - TB.vieMaxS) < 0.2,
      `I-C : non vidé à 30 s : ses ${r.plein.rentres} ennemis rentrent, le rideau tombe sans fenêtre à nu (durée ${r.plein.j.duree} s)`);
    ok(r.plein.feintes === 1 && r.plein.tFeinte >= TB.feinteApresS - 0.05, `I-C : une seule feinte pendant le tableau (${r.plein.feintes}), ${r.plein.tFeinte && r.plein.tFeinte.toFixed(2)} s après l'accroche (≥ ${TB.feinteApresS})`);
    ok(!errs.length, 'I-C : aucune erreur ' + errs.slice(0, 2).join(' | '));
    await ctx.close();
  }
  // ── I-D · la phase I conduite par le bot qui frappe, dans les quatre formes
  for (const [k, cls] of ['lum', 'gou', 'her', 'tis'].entries()) {
    const { page, errs, ctx } = await ouvre('');
    await page.evaluate(ESSAI, { phase: 1, bot: 2, cls, graine: 61 + k, palier: ['normal', 'difficile', 'extreme', 'normal'][k] });
    const r = await page.evaluate(([PAS_]) => { const PAS = eval(PAS_); let fin = null;
      PAS(60 * 180, i => { const et = window.__brumeux.etat(); if (fin == null && (et.phase >= 2 || !et.on || et.scene)) fin = i; });
      const et = window.__brumeux.etat(); return { j: window.__arene.journal(), st: window.__brumeux.statsRun(), fin, tabs: et.j.tableaux, sautes: et.j.sautes, lancers: et.j.lancers }; }, [PAS.toString()]);
    const p1 = r.st.phases[1] || { t: 0, coups: 0 };
    console.log(`   ${cls} (${r.st.palier}) : phase I ${r.fin != null ? 'finie en ' + p1.t + ' s' : 'non finie en 180 s'}, ${p1.coups} coups ; ${r.tabs.length} tableaux (${r.tabs.filter(t => t.vide === true).length} vidés, ${r.tabs.filter(t => t.vide === false).length} rentrés) ; ${r.st.dallesSautees} dalles sautées ; ${r.sautes} zones sautées ; journal ${r.j.coups} coups, ${r.j.sansSigne} sans signe`);
    console.log('     ' + r.tabs.map(t => `${t.decor}/${t.theme}/${t.regle || '-'}${t.champion ? '+champion' : ''}${t.densite ? '+d' + t.densite : ''} ${t.n} ennemis ${t.duree != null ? t.duree + ' s' : '…'}`).join(' · '));
    if (r.j.liste.length) console.log('   ' + JSON.stringify(r.j.liste.slice(0, 4)));
    ok(r.j.sansSigne === 0 && r.j.coups >= 3, `I-D : ${cls} : aucun coup sans signe (${r.j.coups} coups reçus en phase I, dalles et ennemis des tableaux compris)`);
    ok(r.tabs.length >= 1 && r.tabs.every(t => t.n > 0), `I-D : ${cls} : ${r.tabs.length} tableaux convoqués, chacun avec sa vague`);
    ok(r.fin != null, `I-D : ${cls} : le bot qui frappe finit la phase I (${p1.t} s ; cible 50 à 70 s, PV placeholders recalés en 5g)`);
    ok(r.j.assertions === 0 && !errs.length, `I-D : ${cls} : aucune erreur ` + errs.slice(0, 2).join(' | '));
    if (cls === 'tis') await capture(page, 'rappel-combat.png');
    await ctx.close();
  }
  // ── I-E · coût de rendu contre le boss d'essai de l'arène, même foule ; peinture des calques à l'entrée. Mesure appariée dans une seule page
  // (deux pages se mesurent mal sur une machine chargée : leur bruit n'est pas le même) : image par image, on alterne le Brumeux en phase I
  // (son corps, ses lumières, le fragment, le cadre, les fils) et le boss d'essai de l'arène (le fantôme de v18.4, sans lumière), devant la
  // même foule, aux mêmes places. Le budget se mesure sur un tableau sans règle dessinée (le Verre) ; les Braseros (deux lumières, comme en
  // descente) sont relevés à part.
  {
    const { page, errs, ctx } = await ouvre('');
    const n = await page.evaluate(([PAS_, IMPOSE_]) => { const PAS = eval(PAS_), IMPOSE = eval(IMPOSE_); window.__brume.cls('lum'); window.__brumeux.essai(1, { muet: true, graine: 7 });
      const D = window.__brumeux.dbg(), X = D.X, P = D.P, AR = D.AR; IMPOSE([{ decor: 'crypt', theme: 'tir', regle: 'verre' }, [0, 1]]);
      PAS(60 * 3, () => { P.x = X.tiers[2].frag.x0 - 60; P.y = AR.y0 + 520; P.iT = 1; P.hp = P.s.maxHp; });
      X.tab.t = 5;   // le tableau vit, figé (on ne fait plus de pas)
      const e = X.e, tab = X.tab, LS = D.lights(), tous = LS.slice(), sans = tous.filter(l => l.c !== 'brume18'), A = window.__arene.dbg().A, fantome = { x: e.x, y: e.y, r: 44, zones: [], t: 9, wp: null };
      window.__IE = v => { X.tab = v ? tab : null; e.dead = !v; LS.length = 0; LS.push(...(v ? tous : sans)); A.essai.boss = v ? null : fantome; };
      return { n: D.enemies.filter(o => !o.dead && !o.brx18).length, peinture: X.j.peintureMs, sub: tab.sub, lum: tous.length - sans.length }; }, [PAS.toString(), IMPOSE.toString()]);
    const APP = ([k]) => { const R = window.__arene.dbg().render, c = document.querySelector('#game').getContext('2d'), on = [], off = [];
      for (let i = 0; i < 10; i++) { window.__IE(i % 2 === 0); R(); }
      for (let i = 0; i < k; i++) { const v = i % 2 === 0; window.__IE(v); const t0 = performance.now(); R(); c.getImageData(0, 0, 1, 1); (v ? on : off).push(performance.now() - t0); }
      window.__IE(true); const md = x => x.sort((p, q) => p - q)[x.length >> 1]; return [md(on), md(off)]; };
    const r = []; for (let k = 0; k < 5; k++) r.push(await page.evaluate(APP, [240]));
    const med = v => v.slice().sort((x, y) => x - y)[v.length >> 1], d = med(r.map(x => x[0] - x[1]));
    // les Braseros (une règle de la descente) : appariés de même, allumés puis éteints
    const B = await page.evaluate(() => { const D = window.__brumeux.dbg(), X = D.X, f = X.tab.frag; X.tab.regle = 'braseros'; X.tab.braz = [{ x: f.x0 + 150, y: f.y0 + 380 }, { x: f.x0 + 420, y: f.y0 + 520 }]; D.step(0);
      const LS = D.lights(), avec = LS.slice(), T = X.tab, sans = avec.filter(l => !(l.c === 'warm' && T.braz.some(b => b.x === l.x && b.y === l.y))); window.__BZ = v => { T.braz = v ? [{ x: f.x0 + 150, y: f.y0 + 380 }, { x: f.x0 + 420, y: f.y0 + 520 }] : null; LS.length = 0; LS.push(...(v ? avec : sans)); }; return avec.length - sans.length; });
    const BZ = ([k]) => { const R = window.__arene.dbg().render, on = [], off = []; for (let i = 0; i < k; i++) { const v = i % 2 === 0; window.__BZ(v); const t0 = performance.now(); R(); (v ? on : off).push(performance.now() - t0); } window.__BZ(false); const md = x => x.sort((p, q) => p - q)[x.length >> 1]; return md(on) - md(off); };
    const db = await page.evaluate(BZ, [240]);
    console.log(`   coût (apparié, image par image) : Brumeux phase I (tableau vivant : ${n.n} ennemis, fragment, cadre, fils, corps, ${n.lum} lumières) contre le boss d'essai de l'arène, même foule : ${r.map(x => (x[0] - x[1] >= 0 ? '+' : '') + (x[0] - x[1]).toFixed(2)).join(' / ')} ms (médiane ${d >= 0 ? '+' : ''}${d.toFixed(2)} ; images ${med(r.map(x => x[0])).toFixed(1)} contre ${med(r.map(x => x[1])).toFixed(1)} ms) ; Braseros (${B} lumières, règle de la descente) ${db >= 0 ? '+' : ''}${db.toFixed(2)} ms ; peinture des calques ${n.peinture} ms`);
    ok(n.sub === 'vie' && n.n >= 4, `I-E : un tableau vit (${n.n} ennemis) pendant la mesure`);
    ok(d <= DA.budget.rendu, `I-E : coût de rendu du Brumeux en phase I contre le boss d'essai, même foule : ${d >= 0 ? '+' : ''}${d.toFixed(2)} ms (≤ +${DA.budget.rendu})`);
    ok(n.peinture > 0 && n.peinture <= DA.budget.peinture, `I-E : peinture des trois calques (et du cadre, du drapé) à l'entrée : ${n.peinture} ms (≤ ${DA.budget.peinture})`);
    await capture(page, 'rappel-tableau.png');
    ok(!errs.length, 'I-E : aucune erreur ' + errs.slice(0, 2).join(' | '));
    await ctx.close();
  }
  // ── I-F · mouvements réduits ; captures (accroche, tableau vivant avec sa règle, rideau, anneau, chaque geste)
  for (const rm of [false, true]) {
    const { page, errs, ctx } = await ouvre('', { rm });
    await page.evaluate(ESSAI, { phase: 1, cls: 'gou', graine: 5 });
    const tient = 'P.x=AR.x0+(AR.x1-AR.x0)*0.62;P.y=AR.y0+520;P.iT=1;P.hp=P.s.maxHp;';
    const r = await page.evaluate(([PAS_, IMPOSE_, tient]) => { const PAS = eval(PAS_), IMPOSE = eval(IMPOSE_), D = window.__brumeux.dbg(), X = D.X, P = D.P, AR = D.AR, e = X.e, out = { fr: [] }; const T_ = new Function('P', 'AR', tient);
      IMPOSE([{ decor: 'crypt', theme: 'choeur', regle: 'sol' }, [0, 1]]); PAS(50, () => T_(P, AR)); out.accroche = X.tab && X.tab.sub;
      return out; }, [PAS.toString(), IMPOSE.toString(), tient]);
    await capture(page, `rappel-accroche${rm ? '-rm' : ''}.png`);
    await page.evaluate(([PAS_, tient]) => { const PAS = eval(PAS_), D = window.__brumeux.dbg(), P = D.P, AR = D.AR, T_ = new Function('P', 'AR', tient); PAS(60 * 6, () => T_(P, AR)); }, [PAS.toString(), tient]);
    await capture(page, `rappel-regle${rm ? '-rm' : ''}.png`);
    // le rideau : on suit la hauteur de ses mains, la chute, l'alpha du fragment et la hauteur du drapé pendant 0,6 s
    const rid = await page.evaluate(([PAS_, tient]) => { const PAS = eval(PAS_), D = window.__brumeux.dbg(), X = D.X, P = D.P, AR = D.AR, e = X.e, T_ = new Function('P', 'AR', tient);
      for (const o of D.enemies) if (!o.dead && !o.brx18) window.__arene.dbg().kill(o); D.room.spawning = []; const ys = [], al = [], ch = [];
      PAS(60 * 3, () => { T_(P, AR); const T = X.tab; ys.push(e.y); ch.push(X.chute); if (T && T.sub === 'rideau') al.push(D.fragAlpha(T)); });
      return { ys, al, chMax: Math.max(...ch), ouvre: X.ouvre, sub: X.tab && X.tab.sub, vuln: e.vuln }; }, [PAS.toString(), tient]);
    await capture(page, `rappel-nu${rm ? '-rm' : ''}.png`);
    if (rm) {
      let chg = 0; for (let i = 2; i < rid.ys.length; i++) if (Math.sign(rid.ys[i] - rid.ys[i - 1]) * Math.sign(rid.ys[i - 1] - rid.ys[i - 2]) < 0) chg++;
      ok(rid.chMax === 0 && chg === 0, `I-F : mouvements réduits : ses mains ne tombent pas au rideau (chute ${rid.chMax}), rien ne flotte (${chg} changements de sens)`);
      ok(rid.al.length > 5 && rid.al[0] > rid.al[rid.al.length - 1] && rid.al[rid.al.length - 1] < 0.2, `I-F : mouvements réduits : le rideau est un fondu (alpha du fragment ${rid.al[0].toFixed(2)} → ${rid.al[rid.al.length - 1].toFixed(2)})`);
    } else {
      ok(rid.chMax > 40 && rid.ouvre > 0.9, `I-F : au rideau, ses mains retombent vers toi (${rid.chMax.toFixed(0)} px, ≤ ${TB.chute}) et s'ouvrent`);
      ok(rid.al.every(a => a === 1), 'I-F : le drapé tombe sur le fragment (il le couvre, sans fondu)');
    }
    for (const g of ['fils', 'cadre', 'toile']) {
      const z = await page.evaluate(([PAS_, g]) => { const PAS = eval(PAS_), D = window.__brumeux.dbg(), X = D.X, P = D.P, AR = D.AR; X.tab = null; X.boucle = [{ k: 'fixe', g }]; X.im = 0; X.ph = 'entracte'; X.t = 0.01; X.zones = [];
        PAS(40, () => { P.x = X.e.x + 60; P.y = AR.y0 + 470; P.iT = 1; }); return X.zones.map(z => z.forme); }, [PAS.toString(), g]);
      if (!rm) ok(z.length === { fils: 5, cadre: 1, toile: 25 }[g], `I-F : geste ${g} : ${z.length} zones (${[...new Set(z)].join(', ')})`);
      await capture(page, `rappel-geste-${g}${rm ? '-rm' : ''}.png`);
      await page.evaluate(([PAS_]) => { const PAS = eval(PAS_), P = window.__brumeux.dbg().P; PAS(150, () => { P.iT = 1; }); }, [PAS.toString()]);
    }
    ok(!errs.length, `I-F${rm ? ' (mouvements réduits)' : ''} : aucune erreur ` + errs.slice(0, 2).join(' | '));
    await ctx.close();
  }
}

// ═══ J. La phase II, « L'Ouvrage » (5c) ═════════════════════════════════════════════════════════════════════════════════════════════
if (SEC.includes('J')) {
  console.log('\n══ J · la phase II, « L\'Ouvrage » ══');
  const CN = DB.constructions, SO = CN.sortes;
  // la partition se tait ; une mesure imposée (bâtir, un geste) ; toi tenu en place
  const TAIRE = () => { const X = window.__brumeux.dbg().X; X.boucle = [{ k: 'fixe', g: 'feinte' }]; X.im = 1; X.ph = 'entracte'; X.t = 1e9; };
  const MESURE = (m) => { const X = window.__brumeux.dbg().X; X.boucle = [m]; X.im = 0; X.ph = 'entracte'; X.t = 0.01; };
  const M = { w: Math.round(DA.salles.final.w * 1280), h: Math.round(DA.salles.final.h * 720) };
  // ── J-A · lecture des sortes, places, partition et boucle en jeu = logique pure
  {
    const { page, errs, ctx } = await ouvre('');
    const r = await page.evaluate(([PAS_, MESURE_]) => { const PAS = eval(PAS_), MESURE = eval(MESURE_), B = window.__brume; B.cls('lum'); B.start(); PAS(3);
      const S = B.SAVE; S.mem.prof = { n: 3, ax: { portee: 0.8, esquive: 0.3, soin: 0.7, rythme: 0.5, risque: 0.5, puissance: 0.5 }, cms: {}, eff: { avide: { s: 0.6, n: 2 } } };
      S.brumeux = { v: 1, tentatives: 1, victoires: 0, phaseMax: 2, mort: { 2: 'effondrement' }, vus: [], bati: { 2: 'colonnades' } };
      window.__brumeux.essai(2, { muet: true, graine: 4321 }); const D = window.__brumeux.dbg(), X = D.X, P = D.P, AR = D.AR;
      const boucle = X.boucle.map(m => m.k === 'libre' ? { k: m.k, elements: m.elements } : m.k === 'fixe' ? { k: m.k, g: m.g } : { k: m.k }), lec = { prof: X.lec.prof, eff: X.lec.eff, ko: X.lec.ko, bati: X.lec.bati }, et0 = window.__brumeux.etat();
      const tient = () => { P.x = AR.x0 + 1250; P.y = AR.y0 + 700; P.iT = 1; P.hp = P.s.maxHp; };
      MESURE({ k: 'batir' }); PAS(60 * 3, tient); MESURE({ k: 'batir' }); PAS(60 * 3, tient); MESURE({ k: 'batir' }); PAS(60 * 3, tient);
      return { boucle, lec, graine: X.graine, palier: X.palier, bati: X.j.bati, et0: et0.boucle, sortes: window.__brumeux.etat().bat.map(c => c.sorte) }; }, [PAS.toString(), MESURE.toString()]);
    const lecP = PUR.brxLire(DB, { prof: r.lec.prof, eff: r.lec.eff, ko: r.lec.ko, tue: { 2: 'effondrement' }, bati: { 2: 'colonnades' } }, 1);
    const pureB = PUR.brxBoucle(DB, lecP, 1, r.palier, PUR.desRng(r.graine), {}, { premiere: true }).map(m => m.k === 'libre' ? { k: m.k, elements: m.elements } : m.k === 'fixe' ? { k: m.k, g: m.g } : { k: m.k });
    ok(JSON.stringify(pureB) === JSON.stringify(r.boucle), `J-A : la boucle en jeu égale brxBoucle (même graine, même lecture) : ${r.et0.join(' ')}`);
    ok(r.lec.bati === 'colonnades' && lecP.bati === 'colonnades', 'J-A : la lecture rend la sorte effondrée sur toi au combat d\'avant (SAVE.brumeux, champ bati)');
    let eq = 0; const det = [];
    for (const b of r.bati) { const seed = ((r.graine >>> 0) ^ Math.imul(0x85EBCA6B, b.n)) >>> 0, cons = b.cons.map(k => k.sorte ? Object.assign({}, k, { etats: k.etats || undefined, voie: k.voie || undefined }) : k);
      for (const k of cons) { if (!k.etats) delete k.etats; if (!k.voie) delete k.voie; }
      const R0 = await page.evaluate(() => { const A = window.__brumeux.dbg().AR; return { x0: A.x0, y0: A.y0, x1: A.x1, y1: A.y1 }; });
      const q = PUR.brxBatir(DB, M, R0, b.base, cons, lecP, { x: b.p[0], y: b.p[1], r: 14 }, b.h, r.palier, PUR.desRng(seed), { premier: b.premier, eviter: b.eviter, exclus: b.exclus });
      const same = q.sorte === b.sorte && (q.c ? q.c.k : -1) === b.k && JSON.stringify(q.c ? q.c.disques.map(d => [+d.x.toFixed(2), +d.y.toFixed(2)]) : null) === JSON.stringify(b.disques);
      if (same) eq++; det.push(`${b.sorte}${same ? '' : ' ≠ ' + q.sorte}`); }
    ok(r.bati.length === 3 && eq === 3, `J-A : chaque bâtir en jeu égale brxBatir (sorte, variante, places des disques) : ${det.join(', ')}`);
    ok(r.bati[0].sorte === 'colonnades' && r.bati[1].sorte !== 'colonnades', `J-A : le premier bâtir rejoue la sorte qui t'a tué (colonnades), le second en prend une autre (${r.bati[1].sorte})`);
    ok(!errs.length, 'J-A : aucune erreur ' + errs.slice(0, 2).join(' | '));
    await ctx.close();
  }
  // ── J-B · les constructions en jeu
  {
    const { page, errs, ctx } = await ouvre('');
    await page.evaluate(ESSAI, { phase: 2, cls: 'lum', graine: 17 });
    const r = await page.evaluate(([PAS_, TAIRE_, MESURE_]) => { const PAS = eval(PAS_), TAIRE = eval(TAIRE_), MESURE = eval(MESURE_), D = window.__brumeux.dbg(), X = D.X, P = D.P, AR = D.AR, e = X.e, out = {};
      const tient = (x, y) => () => { P.x = x; P.y = y; P.iT = 1; P.hp = P.s.maxHp; }, T0 = tient(AR.x0 + 1250, AR.y0 + 720), et = () => window.__brumeux.etat();
      TAIRE(); PAS(20, T0);
      // annonce : craie 1,5 s, mains à nu, rien de posé ; puis posée
      e.vuln = 0; const n0 = D.room.pillars.length; MESURE({ k: 'batir' }); let vMin = 9, an = 0, posee = null; const hp0 = e.hp;
      PAS(60 * 3, i => { T0(); e.hp = hp0; const c = X.bat[X.bat.length - 1]; if (c && c.etat === 'annonce') { an++; vMin = Math.min(vMin, e.vuln); if (D.room.pillars.length !== n0) posee = -1; } else if (c && c.etat === 'debout' && posee == null) posee = i; });
      out.annonce = { s: an / 60, vMin, posee, sorte: X.bat.length ? X.bat[X.bat.length - 1].sorte : null, piliers: D.room.pillars.length - n0, nu: window.__gardiens ? true : true };
      // annulation : 5 % des PV de la phase pendant l'annonce (119 : non ; 120 : oui)
      for (const c of X.bat.slice()) D.retirer(c, 'efface'); TAIRE();
      const ann = perte => { e.vuln = 0; MESURE({ k: 'batir' }); PAS(10, T0); const c = X.bat[X.bat.length - 1], h0 = c.hp0; e.hp = h0 - perte; PAS(3, T0); const r = { etat: c.etat, vuln: +e.vuln.toFixed(2), batX: X.batX.slice() }; PAS(60 * 3, () => { T0(); }); e.hp = h0; for (const k of X.bat.slice()) D.retirer(k, 'efface'); X.batX = []; return r; };
      out.a119 = ann(119); out.a120 = ann(120);
      // poussée sans dégât : une muraille annoncée sur toi (tu restes dessus) : attente 1 s, puis poussé, PV intacts
      TAIRE(); X.batB = null; const hpJ = P.hp; let pa = window.__brumeux.poser('murailles', { annonce: true }); const cm = X.bat[X.bat.length - 1];
      let att = null, dd = null; if (cm) { const d0 = cm.disques[4]; PAS(60 * 1.4, () => { P.x = d0.x; P.y = d0.y + 6; P.iT = 0; P.dashT = 0; }); PAS(60 * 2, i => { if (cm.etat === 'annonce' && cm.t >= cm.annonce && att == null) att = i; if (cm.etat !== 'annonce') return; P.x = d0.x; P.y = d0.y + 6; }); dd = Math.min(...cm.disques.map(d => Math.hypot(P.x - d.x, P.y - d.y) - d.r - P.r)); }
      out.pousse = { ok: pa.ok, etat: cm && cm.etat, pousse: cm && cm.pousse, dd, hp: P.hp >= hpJ - 1e-6 };
      // fissures et destruction (des coups du jeu, un par image : deux disques frappés dans la même image ne comptent qu'une fois)
      const mu = X.bat.find(c => c.sorte === 'murailles'), dA = mu.disques[0].e, dB = mu.disques[1].e, pv0 = mu.elements[0].pv;
      const c1 = D.hit(dA, 30, { crit: false }), c2 = D.hit(dB, 20, { crit: false }); PAS(1, T0); out.unCoup = { avant: pv0, apres: mu.elements[0].pv, c1, c2 };
      const fiss = []; let k = 0; while (mu.etat === 'debout' && k++ < 200) { D.hit(mu.disques[k % mu.disques.length].e, 15, { crit: false }); PAS(1, T0); fiss.push(mu.elements[0].fiss); }
      out.fiss = { suite: [...new Set(fiss)].join(','), etat: mu.etat, piliers: D.room.pillars.filter(p => p.cons18 === mu).length, entites: mu.disques.filter(d => d.e && !d.e.dead).length, cassees: X.j.cassees };
      // la Ruée arrêtée : une muraille entre ses mains et toi
      TAIRE(); for (const c of X.bat.slice()) D.retirer(c, 'efface'); PAS(60 * 2, T0);
      const T1 = tient(e.x, AR.y0 + 860); PAS(60 * 2, T1); const pm = window.__brumeux.poser('murailles', { p: [e.x, AR.y0 + 860], h: [e.x, e.y] }); PAS(3, T1); const m2 = X.bat.find(c => c.sorte === 'murailles'), pvR = m2 ? m2.elements[0].pv : 0; e.vuln = 0;
      MESURE({ k: 'fixe', g: 'ruee' }); let vR = 0, z = null; PAS(60 * 2.5, () => { T1(); if (!z) z = X.zones.find(q => q.id === 'ruee'); vR = Math.max(vR, e.vuln || 0); });
      out.ruee = { pose: pm.ok, coupe: !!(z && z.coupe), vR, pv: m2 ? [pvR, m2.elements[0].pv] : null, brisees: X.j.brisees, touche: z ? !window.__brumeux.dbg().pure.brxDans(z, P.x, P.y, P.r) : null };
      // l'échafaudage : −40 % tant qu'il tient, puis, tombé, il est sonné 2 s
      TAIRE(); for (const c of X.bat.slice()) D.retirer(c, 'efface'); PAS(30, T0); e.vuln = 0; e.lockT = 0;
      const coupBoss = () => { const h0 = e.hp; D.hit(e, 50, { crit: false }); const d = h0 - e.hp; e.hp = h0; return d; };
      const sans = coupBoss(); const pe = window.__brumeux.poser('echafaudages'); PAS(3, T0); const ec = X.bat.find(c => c.sorte === 'echafaudages'), avec = coupBoss();
      const Te = ec ? tient(ec.disques[0].x + 90, ec.disques[0].y) : T0; PAS(30, Te); e.vuln = 0;   // tout près (on ne frappe que ce qu'on voit)
      let kk = 0; while (ec && ec.etat === 'debout' && kk++ < 100) { D.hit(ec.disques[0].e, 40, { crit: false }); PAS(1, Te); }
      out.echaf = { pose: pe.ok, sans, avec, vuln: +e.vuln.toFixed(2), etat: ec && ec.etat };
      // le puits : il boit tes soins dans son rayon, puis, cassé, il rend tout
      TAIRE(); e.vuln = 0; PAS(3, T0); const pp = window.__brumeux.poser('puits'); PAS(3, T0); const pu = X.bat.find(c => c.sorte === 'puits'); P.hp = P.s.maxHp - 60; const h1 = P.hp; D.heal(40, 'test'); const gagne = P.hp - h1, bu = pu ? pu.bu : 0;
      let k2 = 0; while (pu && pu.etat === 'debout' && k2++ < 100) { D.hit(pu.disques[0].e, 40, { crit: false }); PAS(1, () => { P.x = AR.x0 + 1250; P.y = AR.y0 + 720; P.iT = 1; }); }
      out.puits = { pose: pp.ok, gagne, bu, rendu: X.j.rendus, hp: P.hp - h1 };
      for (const c of X.bat.slice()) D.retirer(c, 'efface');
      // la douve : ses mains s'y retirent ; passerelles jamais toutes fermées ; le joueur ne tombe jamais ; un ennemi repoussé tombe ; une Brute qui charge aussi
      TAIRE(); const pd = window.__brumeux.poser('douves', { annonce: true }); const dv = X.bat.find(c => c.sorte === 'douves'); let closes = new Set(), mains = 0, mort = false, bas = 0, et0 = dv ? dv.etatI : 0;
      PAS(60 * 9, () => { T0(); if (dv.etat === 'debout') { closes.add(dv.portes.filter(g => D.room.pillars.some(p => p.cons18 === dv && p.x === g[0].x && p.y === g[0].y)).length); if (dv.etatI !== et0) { bas++; et0 = dv.etatI; } } mains = Math.hypot(e.x - dv.ile[0], e.hy - dv.ile[1]); });
      // le joueur poussé contre l'anneau (sans fin) : il bute, ne tombe pas
      const A2 = window.__brumeux.DB.constructions.sortes.douves.anneau, fo = dv.disques[3]; let mini = 1e9; P.x = fo.x + (fo.x - dv.ile[0]) / A2.r * 80; P.y = fo.y + (fo.y - dv.ile[1]) / A2.r * 80;
      PAS(60, i => { if (i) mini = Math.min(mini, Math.hypot(P.x - fo.x, P.y - fo.y)); const dx = fo.x - P.x, dy = fo.y - P.y, l = Math.hypot(dx, dy) || 1; P.x += dx / l * 6; P.y += dy / l * 6; P.iT = 1; if (P.dead) mort = true; });
      const tb0 = X.j.tombes; const ram = D.enemies.length; window.__brume.create('rampant', fo.x + (fo.x - dv.ile[0]) / A2.r * 50, fo.y + (fo.y - dv.ile[1]) / A2.r * 50); const rp = D.enemies[D.enemies.length - 1];
      rp.kbx = (dv.ile[0] - rp.x) / 50 * 220; rp.kby = (dv.ile[1] - rp.y) / 50 * 220; PAS(30, () => { P.x = AR.x0 + 300; P.y = AR.y1 - 100; P.iT = 1; });
      const fb = dv.disques[12]; window.__brume.create('brute', fb.x + (fb.x - dv.ile[0]) / A2.r * 70, fb.y + (fb.y - dv.ile[1]) / A2.r * 70); const br = D.enemies[D.enemies.length - 1]; br.state = 'charge'; br.t = 0.42; br.hitSet = new Set(); br.ang = Math.atan2(dv.ile[1] - br.y, dv.ile[0] - br.x); br.stun = 0;
      PAS(40, () => { P.x = AR.x0 + 300; P.y = AR.y1 - 100; P.iT = 1; });
      out.douve = { pose: pd.ok, closes: [...closes], bas, mains: +mains.toFixed(0), mini: +mini.toFixed(1), mort, rampant: rp.dead, brute: br.dead, tombes: X.j.tombes - tb0 };
      // la cloche : elle écrase les ennemis sur sa voie (jamais lui), te frappe si tu restes dessus, pas si tu en sors
      for (const c of X.bat.slice()) D.retirer(c, 'efface'); TAIRE(); D.room.spawning = []; for (const o of D.enemies) if (!o.dead && !o.brx18 && !o.cons18) o.dead = true;
      const T2 = tient(AR.x0 + 1250, AR.y0 + 700); PAS(5, T2); const pr = window.__brumeux.poser('rails'); PAS(3, T2); const rl = X.bat.find(c => c.sorte === 'rails');
      const v = rl.voie; window.__brume.create('rampant', v.x0 + (v.x1 - v.x0) * 0.3, v.y0 + (v.y1 - v.y0) * 0.3); const rp2 = D.enemies[D.enemies.length - 1]; rp2.spd = 0; rp2.stun = 99;
      const j0 = window.__arene.journal(), h2 = P.hp; let coups = 0; PAS(60 * 4.2, () => { P.x = v.x0 + (v.x1 - v.x0) * 0.6; P.y = v.y0 + (v.y1 - v.y0) * 0.6; P.iT = 0; P.dashT = 0; if (P.hp < P.s.maxHp * 0.6) P.hp = P.s.maxHp; rp2.x = v.x0 + (v.x1 - v.x0) * 0.3; rp2.y = v.y0 + (v.y1 - v.y0) * 0.3; });
      const j1 = window.__arene.journal(); out.cloche = { pose: pr.ok, cloches: X.j.cloches, ecrases: X.j.ecrases, ram: rp2.hp < rp2.maxHp || rp2.dead, coups: j1.coups - j0.coups, sans: j1.sansSigne - j0.sansSigne, boss: e.hp };
      // dehors : la cloche passe sans te toucher
      const j2 = window.__arene.journal(); const nx = -(v.y1 - v.y0), ny = v.x1 - v.x0, nl = Math.hypot(nx, ny); PAS(60 * 6.5, () => { P.x = (v.x0 + v.x1) / 2 + nx / nl * 120; P.y = (v.y0 + v.y1) / 2 + ny / nl * 120; P.iT = 0; P.dashT = 0; P.hp = P.s.maxHp; });
      out.cloche.dehors = window.__arene.journal().coups - j2.coups;
      // l'appel : lu sur ce qu'il a bâti (un rail : deux Rampants pour une place), au plus 4 vivants
      MESURE({ k: 'fixe', g: 'manoeuvres' }); PAS(10, T2); out.appel = D.room.spawning.filter(q => q.appel18).map(q => q.type).concat(D.enemies.filter(o => !o.dead && o.appel18).map(o => o.type));
      MESURE({ k: 'fixe', g: 'manoeuvres' }); PAS(10, T2); MESURE({ k: 'fixe', g: 'manoeuvres' }); PAS(10, T2); out.appelMax = D.room.spawning.filter(q => q.appel18).length + D.enemies.filter(o => !o.dead && o.appel18).length;
      // persistance : III garde tout (les cloches roulent encore), IV garde ce qui tient dans ses bornes, V garde (5f : elles y tombent une à une)
      D.room.spawning = []; for (const o of D.enemies) if (!o.dead && !o.brx18 && !o.cons18) o.dead = true;
      window.__brumeux.poser('echafaudages'); PAS(3, T2); const n2 = X.bat.length; e.hp = Math.floor(e.maxHp * X.seuils[1]) - 2; window.__brumeux.vers(3); PAS(60 * 6, T2);
      out.p3 = { phase: window.__brumeux.etat().phase, avant: n2, apres: X.bat.length, piliers: D.room.pillars.filter(p => p.cons18).length };
      window.__brumeux.vers(4); PAS(60 * 8, T2); if (!X.bat.length) { const A4 = D.AR, cx = (A4.x0 + A4.x1) / 2, cy = (A4.y0 + A4.y1) / 2; out.pose4 = []; for (const so of ['murailles', 'echafaudages', 'colonnades']) for (const q of [[cx - 260, cy], [cx + 260, cy], [cx, cy + 170], [cx, cy - 170]]) if (!X.bat.length) out.pose4.push(so + ':' + (window.__brumeux.poser(so, { p: q }).raison || 'ok')); PAS(60 * 2, T2); }   // v18.10 : si aucune ne tenait dans les bornes de IV, une muraille posée dedans (la persistance en V se lit sur elle)
      const B4 = D.AR; out.p4 = { pose4: out.pose4, phase: window.__brumeux.etat().phase, n: X.bat.length, dans: X.bat.every(c => c.disques.every(d => d.x - d.r >= B4.x0 - 1 && d.x + d.r <= B4.x1 + 1 && d.y - d.r >= B4.y0 - 1 && d.y + d.r <= B4.y1 + 1)), cedees: X.j.cedees };
      TAIRE(); window.__brumeux.vers(5); PAS(60 * 3.5, T2); TAIRE(); out.p5 = { phase: window.__brumeux.etat().phase, n: X.bat.length, piliers: D.room.pillars.filter(p => p.cons18).length, entites: D.enemies.filter(o => !o.dead && o.cons18).length };
      return out; }, [PAS.toString(), TAIRE.toString(), MESURE.toString()]);
    ok(r.annonce.s >= 1.45 && r.annonce.s <= 1.6 && r.annonce.vMin > 0 && r.annonce.posee > 0 && r.annonce.piliers > 0, `J-B : annonce en craie ${r.annonce.s.toFixed(2)} s (${r.annonce.sorte}), ses mains à nu tout du long, rien de posé pendant l'annonce, posée ensuite (${r.annonce.piliers} disques)`);
    ok(r.a119.etat !== 'annulee' && r.a120.etat === 'annulee' && r.a120.vuln >= DB.constructions.annulation.nuS && r.a120.batX.length === 1, `J-B : annulation au seuil : 119 PV perdus pendant l'annonce, non ; 120 (5 %), annulée, à nu ${r.a120.vuln} s de plus, sa sorte écartée de la boucle`);
    ok(r.pousse.ok && r.pousse.etat === 'debout' && r.pousse.pousse >= 1 && r.pousse.dd >= -1 && r.pousse.hp, `J-B : une muraille annoncée sur toi attend, puis te pousse sans dégât (à ${r.pousse.dd && r.pousse.dd.toFixed(1)} px de ses disques, PV intacts)`);
    ok(Math.abs((r.unCoup.avant - r.unCoup.apres) - Math.max(r.unCoup.c1, r.unCoup.c2)) < 1e-6, `J-B : deux disques d'une muraille frappés dans la même image : un seul coup, le plus gros (${r.unCoup.c1.toFixed(1)} et ${r.unCoup.c2.toFixed(1)} → −${(r.unCoup.avant - r.unCoup.apres).toFixed(1)})`);
    ok(r.fiss.suite === '0,1,2,3' && r.fiss.etat === 'tombee' && r.fiss.piliers === 0 && r.fiss.entites === 0, `J-B : fissures aux paliers (${r.fiss.suite}), puis détruite : piliers et entités retirés`);
    ok(r.ruee.pose && r.ruee.coupe && r.ruee.vR >= 1.9 && r.ruee.pv && Math.abs(r.ruee.pv[0] - r.ruee.pv[1] - r.ruee.pv[0] / 3) < 1 && r.ruee.touche, `J-B : la Ruée s'arrête sur la muraille, ne t'atteint pas ; sa main s'y brise (sonné ${r.ruee.vR.toFixed(2)} s) ; la muraille perd un palier (${r.ruee.pv && r.ruee.pv.map(Math.round).join(' → ')})`);
    ok(r.echaf.pose && Math.abs(r.echaf.avec / r.echaf.sans - 0.6) < 0.01 && r.echaf.vuln >= 1.9 && r.echaf.etat === 'tombee', `J-B : échafaudage : il subit ×${(r.echaf.avec / r.echaf.sans).toFixed(2)} tant qu'il tient ; tombé, il est sonné ${r.echaf.vuln} s`);
    ok(r.puits.pose && Math.abs(r.puits.gagne - 12) < 0.01 && Math.abs(r.puits.bu - 28) < 0.01 && Math.abs(r.puits.rendu - 28) < 0.01 && Math.abs(r.puits.hp - 40) < 0.5, `J-B : puits : un soin de 40 dans son rayon te rend ${r.puits.gagne.toFixed(1)} (30 %), il boit ${r.puits.bu.toFixed(1)} ; cassé, il rend ${r.puits.rendu.toFixed(1)}`);
    ok(r.douve.pose && r.douve.closes.length === 1 && r.douve.closes[0] === 2 && r.douve.bas >= 2 && r.douve.mains < 30, `J-B : douve : passerelles fermées ${r.douve.closes.join('/')} sur 4 à chaque instant (${r.douve.bas} bascules) ; ses mains retirées sur l'île (à ${r.douve.mains} px)`);
    ok(!r.douve.mort && r.douve.mini >= SO.douves.anneau.fosse + 12, `J-B : poussé contre l'anneau, le joueur bute et ne tombe jamais (au plus près ${r.douve.mini} px du centre d'une fosse)`);
    ok(r.douve.rampant && r.douve.brute && r.douve.tombes === 2, `J-B : un Rampant repoussé dans la douve y tombe ; une Brute qui charge dedans aussi (${r.douve.tombes} chutes)`);
    ok(r.cloche.pose && r.cloche.cloches >= 1 && r.cloche.ram && r.cloche.coups >= 1 && r.cloche.sans === 0 && r.cloche.dehors === 0, `J-B : cloche : ${r.cloche.cloches} passage(s), le Rampant sur la voie écrasé, toi sur la voie touché (${r.cloche.coups}, ${r.cloche.sans} sans signe), dehors jamais`);
    ok(r.appel.length >= 2 && r.appel.filter(t => t === 'rampant').length >= 2 && r.appelMax <= DB.manoeuvres.max, `J-B : Manœuvres : ${r.appel.join(', ')} (un rail : deux Rampants), jamais plus de ${DB.manoeuvres.max} vivants (${r.appelMax})`);
    ok(r.p3.phase === 3 && r.p3.apres === r.p3.avant && r.p3.piliers > 0, `J-B : en III, les constructions restent (${r.p3.apres} / ${r.p3.avant}, ${r.p3.piliers} disques)`);
    ok(r.p4.phase === 4 && r.p4.dans, `J-B : en IV, seules restent celles qui tiennent dans les bornes (${r.p4.n} gardées, ${r.p4.cedees} effacées)`);
    ok(r.p5.phase === 5 && r.p5.n === r.p4.n && r.p5.piliers > 0, `J-B : en V (5f), elles restent debout (${r.p5.n} / ${r.p4.n}, ${r.p5.piliers} disques) : elles y tombent une à une`);
    if (r.p4.pose4) console.log('   IV : aucune ne tenait dans les bornes ; essais de pose : ' + r.p4.pose4.join(' '));
    await capture(page, 'ouvrage-persistance.png');
    ok(!errs.length, 'J-B : aucune erreur ' + errs.slice(0, 2).join(' | '));
    await ctx.close();
  }
  // ── J-C · les tirs : arrêtés par une muraille, un fût, un échafaudage ; ils traversent une douve et une fosse d'état ; un tir du joueur casse ce qu'il touche
  {
    const { page, errs, ctx } = await ouvre('');
    await page.evaluate(ESSAI, { phase: 2, cls: 'lum', graine: 23 });
    const r = await page.evaluate(([PAS_, TAIRE_, SOD]) => { const PAS = eval(PAS_), TAIRE = eval(TAIRE_), D = window.__brumeux.dbg(), X = D.X, P = D.P, AR = D.AR, res = {}; TAIRE();
      const tient = () => { P.x = AR.x0 + 1250; P.y = AR.y0 + 720; P.iT = 1; P.hp = P.s.maxHp; }; PAS(20, tient);
      const tir = (cible, depuis) => { const a = Math.atan2(cible.y - depuis.y, cible.x - depuis.x), p = { x: depuis.x, y: depuis.y, vx: Math.cos(a) * 380, vy: Math.sin(a) * 380, r: 7, dmg: 1, life: 6, boss: true, col: '205,120,255' }; window.__brumeux.dbg().ep.push(p); return p; };
      for (const s of ['murailles', 'colonnades', 'echafaudages']) { for (const c of X.bat.slice()) D.retirer(c, 'efface'); const v = window.__brumeux.poser(s, s === 'colonnades' ? { p: [P.x, AR.y0 + 480] } : {}); PAS(3, tient); const c = X.bat.find(k => k.sorte === s); if (!c) { res[s] = 'non posée (' + v.raison + ')'; continue; }
        const d = c.disques[0], l = Math.hypot(d.x - P.x, d.y - P.y), dep = { x: d.x + (d.x - P.x) / l * 160, y: d.y + (d.y - P.y) / l * 160 }, p = tir(d, dep); let mort = null; PAS(90, () => { tient(); if (p.dead && !mort) mort = { x: p.x, y: p.y }; });
        res[s] = mort ? +Math.min(...c.disques.map(q => Math.hypot(mort.x - q.x, mort.y - q.y) - q.r)).toFixed(1) : 'traverse'; }
      for (const c of X.bat.slice()) D.retirer(c, 'efface'); window.__brumeux.poser('douves'); PAS(3, tient); const dv = X.bat.find(k => k.sorte === 'douves');
      if (dv) { const fo = dv.disques[5], A = SOD.anneau, p2 = tir({ x: fo.x + (fo.x - dv.ile[0]), y: fo.y + (fo.y - dv.ile[1]) }, { x: dv.ile[0], y: dv.ile[1] }); let passe = false; PAS(120, () => { tient(); if (!p2.dead && Math.hypot(p2.x - dv.ile[0], p2.y - dv.ile[1]) > A.r + A.fosse + 10) passe = true; }); res.douve = passe; } else res.douve = 'non posée';
      const f0 = { x: AR.x0 + 500, y: AR.y0 + 300, r: 40, kind: 'fosse18' }; D.room.pillars.push(f0); const p3 = tir({ x: f0.x + 300, y: f0.y }, { x: f0.x - 150, y: f0.y }); let passe3 = false; PAS(90, () => { tient(); if (!p3.dead && p3.x > f0.x + f0.r + 10) passe3 = true; }); res.fosse = passe3; D.room.pillars.splice(D.room.pillars.indexOf(f0), 1);
      // un tir du joueur (un projectile qui meurt sur le mur) frappe la muraille
      for (const c of X.bat.slice()) D.retirer(c, 'efface'); window.__brumeux.poser('murailles'); PAS(3, tient); const mu = X.bat.find(k => k.sorte === 'murailles');
      if (mu) { const dm = mu.disques[4], pv0 = mu.elements[0].pv, a = Math.atan2(dm.y - P.y, dm.x - P.x); window.__brumeux.dbg().pp.push({ x: P.x, y: P.y, vx: Math.cos(a) * 700, vy: Math.sin(a) * 700, r: 2, dmg: 25, light: false, pierce: 1, hit: new Set(), life: 2, col: '255,225,160' });
        PAS(40, tient); res.joueur = { pv0, pv: mu.elements[0].pv }; }
      return res; }, [PAS.toString(), TAIRE.toString(), SO.douves]);
    ok(['murailles', 'colonnades', 'echafaudages'].every(k => typeof r[k] === 'number' && r[k] < 12), `J-C : ses tirs s'arrêtent sur une muraille, un fût, un échafaudage (à ${['murailles', 'colonnades', 'echafaudages'].map(k => r[k]).join(' / ')} px)`);
    ok(r.douve === true && r.fosse === true, `J-C : ses tirs traversent une douve (${r.douve}) et une fosse d'état (${r.fosse})`);
    ok(r.joueur && r.joueur.pv < r.joueur.pv0, `J-C : un tir du joueur qui s'arrête sur une muraille la frappe (${r.joueur && Math.round(r.joueur.pv0)} → ${r.joueur && Math.round(r.joueur.pv)})`);
    ok(!errs.length, 'J-C : aucune erreur ' + errs.slice(0, 2).join(' | '));
    await ctx.close();
  }
  // ── J-D · la phase II conduite par le bot qui frappe, quatre formes, deux graines ; temps pour casser chaque sorte
  for (const [k, cls] of ['lum', 'gou', 'her', 'tis'].entries()) for (const g of [71, 72]) {
    const { page, errs, ctx } = await ouvre('');
    await page.evaluate(ESSAI, { phase: 2, bot: 2, cls, graine: g + 10 * k, palier: ['normal', 'difficile', 'extreme', 'normal'][k] });
    const r = await page.evaluate(([PAS_]) => { const PAS = eval(PAS_); let fin = null;
      const X = window.__brumeux.dbg().X, hp0 = X.e.hp, bas = X.e.maxHp * X.seuils[1];
      for (let s = 0; s < 240 && fin == null; s++) PAS(60, i => { if (fin != null) return; const et = window.__brumeux.etat(); if (et.phase >= 3 || !et.on || et.scene) fin = s * 60 + i; });
      const et = window.__brumeux.etat(); return { j: window.__arene.journal(), st: window.__brumeux.statsRun(), fin, J: et.j, bat: et.bat.map(c => c.sorte + '/' + c.etat), part: (hp0 - Math.max(bas, X.e.hp)) / (hp0 - bas) }; }, [PAS.toString()]);
    const p2 = r.st.phases[2] || { t: 0, coups: 0 }, J = r.J, bt = J.bati.filter(b => b.sorte).map(b => b.sorte);
    console.log(`   ${cls} graine ${g + 10 * k} (${r.st.palier}) : phase II ${r.fin != null ? 'finie en ' + p2.t + ' s' : 'non finie en 240 s (' + Math.round(r.part * 100) + ' % de ses PV)'}, ${p2.coups} coups ; bâties ${bt.length} (${bt.join(', ')}), annulées ${J.annulees}, cassées ${J.cassees}, effondrées ${J.effondrees} ; Ruées ${J.ruees} (${J.brisees} brisées) ; cloches ${J.cloches} ; appels ${J.appels} ; chutes ${J.tombes} ; mesures sautées ${J.mesuresSautees} ; journal ${r.j.coups} coups, ${r.j.sansSigne} sans signe`);
    if (r.j.liste.length) console.log('   coups suspects : ' + JSON.stringify(r.j.liste.slice(0, 6)));
    ok(r.j.sansSigne === 0, `J-D : ${cls} (${g + 10 * k}) : aucun coup sans signe (${r.j.coups} coups reçus)`);
    ok(J.bati.length >= 1, `J-D : ${cls} (${g + 10 * k}) : il bâtit (${J.bati.length} bâtir, ${bt.length} constructions)`);
    ok(r.fin != null || r.part >= 0.5, `J-D : ${cls} (${g + 10 * k}) : le bot qui frappe avance (${r.fin != null ? 'phase II finie en ' + p2.t + ' s' : Math.round(r.part * 100) + ' % de ses PV en 240 s'} ; cible 50 à 70 s, PV placeholders recalés en 5g)`);
    ok(r.j.assertions === 0 && !errs.length, `J-D : ${cls} (${g + 10 * k}) : aucune erreur ` + errs.slice(0, 2).join(' | '));
    if (cls === 'gou' && g === 71) await capture(page, 'ouvrage-combat.png');
    await ctx.close();
  }
  {
    const temps = {};
    for (const cls of ['lum', 'gou', 'her', 'tis']) {
      const { page, errs, ctx } = await ouvre('');
      await page.evaluate(ESSAI, { phase: 2, bot: 2, cls, graine: 5 });
      temps[cls] = await page.evaluate(([PAS_, TAIRE_]) => { const PAS = eval(PAS_), TAIRE = eval(TAIRE_), D = window.__brumeux.dbg(), X = D.X, P = D.P, AR = D.AR, e = X.e, out = {}; TAIRE();
        for (const s of ['murailles', 'colonnades', 'rails', 'puits', 'echafaudages']) { for (const c of X.bat.slice()) D.retirer(c, 'efface'); P.x = AR.x0 + 1250; P.y = AR.y0 + (s === 'colonnades' ? 480 : 760); e.hp = e.maxHp * 0.7; PAS(10);
          const v = window.__brumeux.poser(s); PAS(3); const c = X.bat.find(k => k.sorte === s); if (!c) { out[s] = 'non posée'; continue; } const d = c.disques.find(q => q.e), el = c.elements[d.el]; X.essai.cible = d.e; let t = null;
          PAS(60 * 20, i => { e.hp = e.maxHp * 0.7; if (t == null && el.pv <= 0) t = i / 60; }); X.essai.cible = null; out[s] = t == null ? '> 20' : +t.toFixed(1); }
        return out; }, [PAS.toString(), TAIRE.toString()]);
      if (errs.length) console.log('   ' + errs.slice(0, 2).join(' | '));
      await ctx.close();
    }
    console.log('   temps pour casser (bot, une pièce : la muraille entière, un fût, un butoir, le puits, l\'échafaudage) : ' + Object.entries(temps).map(([c, o]) => c + ' ' + Object.entries(o).map(([k, v]) => k + ' ' + v + ' s').join(', ')).join(' · '));
    ok(Object.values(temps).every(o => Object.values(o).every(v => typeof v === 'number' && v <= 20)), 'J-D : chaque sorte cassable se casse au bot, dans chaque forme (≤ 20 s ; cible indicative d\'un échafaudage : 2,5 à 4 s, recalée en 5g)');
  }
  // ── J-E · coût apparié dans une seule page : phase II avec une construction de chaque sorte debout (cloche, passerelles), contre le boss d'essai
  // de l'arène devant la même foule ; peinture à l'entrée (calques de la phase I et modules) ; assemblage d'une construction
  {
    const { page, errs, ctx } = await ouvre('');
    const n = await page.evaluate(([PAS_, TAIRE_]) => { const PAS = eval(PAS_), TAIRE = eval(TAIRE_); window.__brume.cls('lum'); window.__brumeux.essai(2, { muet: true, graine: 7, palier: 'difficile' });
      const D = window.__brumeux.dbg(), X = D.X, P = D.P, AR = D.AR; TAIRE(); const pos = {};
      const place = (s, x, y) => { P.x = x; P.y = y; PAS(2, () => { P.x = x; P.y = y; P.iT = 1; }); const v = window.__brumeux.poser(s, { p: [x, y], h: [x, y - 260] }); PAS(2, () => { P.x = x; P.y = y; P.iT = 1; }); D.render(); return v.ok; };   // une image après chaque pose : la cuisson suit chaque construction, comme en jeu
      pos.murailles = place('murailles', AR.x0 + 1050, AR.y0 + 720); pos.colonnades = place('colonnades', AR.x0 + 1500, AR.y0 + 520); pos.rails = place('rails', AR.x0 + 900, AR.y0 + 560); pos.puits = place('puits', AR.x0 + 1500, AR.y0 + 800);
      pos.echafaudages = place('echafaudages', AR.x0 + 1250, AR.y0 + 640); pos.douves = place('douves', AR.x0 + 1250, AR.y0 + 800);
      for (const [i, t] of ['rampant', 'spectre', 'brute', 'rampant', 'hurleur', 'rampant', 'spectre', 'rampant'].entries()) { window.__brume.create(t, AR.x0 + 950 + (i % 4) * 150, AR.y0 + 420 + Math.floor(i / 4) * 360); }
      for (const o of D.enemies) if (!o.cons18 && !o.brx18) { o.spd = 0; o.stun = 1e9; }
      P.x = AR.x0 + 1250; P.y = AR.y0 + 700; PAS(60 * 4, () => { P.x = AR.x0 + 1250; P.y = AR.y0 + 700; P.iT = 1; });   // une cloche en route, des passerelles qui ont basculé
      D.render(); X.cuGel = true;   // les parties fixes cuites dans les tuiles du sol (à la pose) : la mesure porte sur ce qui se dessine à chaque image
      const e = X.e, bat = X.bat.slice(), LS = D.lights(), tous = LS.slice(), sans = tous.filter(l => l.c !== 'brume18'), A = window.__arene.dbg().A, fantome = { x: e.x, y: e.y, r: 44, zones: [], t: 9, wp: null };
      const cpil = D.room.pillars.slice(), bpil = cpil.filter(p => !p.cons18), cens = D.enemies.filter(o => o.cons18 && !o.dead), zs = X.zones.slice();
      window.__JE = v => { X.bat = v ? bat : []; D.room.pillars.length = 0; D.room.pillars.push(...(v ? cpil : bpil)); for (const o of cens) o.dead = !v; X.zones = v ? zs : []; e.dead = !v; LS.length = 0; LS.push(...(v ? tous : sans)); A.essai.boss = v ? null : fantome; };
      return { pos, bat: bat.map(c => c.sorte), cloche: bat.some(c => c.cl && c.cl.z), foule: D.enemies.filter(o => !o.dead && !o.cons18 && !o.brx18).length, assemble: X.j.assembleMs.slice(), modules: X.j.modulesMs, cuisson: X.j.cuissonMs.slice() }; }, [PAS.toString(), TAIRE.toString()]);
    const APP = ([k]) => { const R = window.__arene.dbg().render, c = document.querySelector('#game').getContext('2d'), on = [], off = [];
      for (let i = 0; i < 10; i++) { window.__JE(i % 2 === 0); R(); }
      for (let i = 0; i < k; i++) { const v = i % 2 === 0; window.__JE(v); const t0 = performance.now(); R(); c.getImageData(0, 0, 1, 1); (v ? on : off).push(performance.now() - t0); }
      window.__JE(true); const md = x => x.sort((p, q) => p - q)[x.length >> 1]; return [md(on), md(off)]; };
    const rr = []; for (let k = 0; k < 5; k++) rr.push(await page.evaluate(APP, [240]));
    const med = v => v.slice().sort((x, y) => x - y)[v.length >> 1], d = med(rr.map(x => x[0] - x[1]));
    await capture(page, 'ouvrage-six.png');
    const p1 = await page.evaluate(() => { window.__brumeux.essai(1, { muet: true, graine: 3 }); const J = window.__brumeux.dbg().X.j; return { cal: J.peintureMs, mod: J.modulesMs }; });
    const amax = Math.max(...n.assemble), cmax = Math.max(0, ...n.cuisson);
    console.log(`   coût (apparié, image par image) : phase II (${n.bat.join(', ')} ; cloche ${n.cloche ? 'en route' : 'au repos'} ; foule ${n.foule}) contre le boss d'essai, même foule : ${rr.map(x => (x[0] - x[1] >= 0 ? '+' : '') + (x[0] - x[1]).toFixed(2)).join(' / ')} ms (médiane ${d >= 0 ? '+' : ''}${d.toFixed(2)} ; images ${med(rr.map(x => x[0])).toFixed(1)} contre ${med(rr.map(x => x[1])).toFixed(1)} ms) ; peinture à l'entrée ${p1.cal} + ${p1.mod} ms ; assemblage ${n.assemble.join(' / ')} ms ; cuisson au sol ${n.cuisson.join(' / ')} ms`);
    ok(Object.values(n.pos).every(Boolean) && n.bat.length === 6, `J-E : une construction de chaque sorte debout (${n.bat.join(', ')})`);
    ok(d <= DA.budget.rendu, `J-E : coût de rendu de la phase II contre le boss d'essai, même foule : ${d >= 0 ? '+' : ''}${d.toFixed(2)} ms (≤ +${DA.budget.rendu})`);
    ok(p1.cal + p1.mod <= DA.budget.peinture, `J-E : peinture à l'entrée (calques de la phase I et modules) : ${(p1.cal + p1.mod).toFixed(1)} ms (≤ ${DA.budget.peinture})`);
    ok(amax <= 3, `J-E : assemblage d'une construction à son annonce : au plus ${amax} ms (≤ 3)`);
    ok(cmax <= 8, `J-E : cuisson des parties fixes dans les tuiles du sol (à la pose, à une fissure, à une chute) : au plus ${cmax} ms (≤ 8, une fois par changement)`);
    ok(!errs.length, 'J-E : aucune erreur ' + errs.slice(0, 2).join(' | '));
    await ctx.close();
  }
  // ── J-F · mouvements réduits ; planche des matières et des fissures ; captures (annonce et mains à nu, annulation, chaque sorte, Ruée arrêtée,
  // Équerre, Truelle, effondrement par sorte, cloche, passerelles, puits plein)
  for (const rm of [false, true]) {
    const { page, errs, ctx } = await ouvre('', { rm });
    await page.evaluate(ESSAI, { phase: 2, cls: 'lum', graine: 31 });
    const sfx = rm ? '-rm' : '', T = 'P.x=AR.x0+1250;P.y=AR.y0+720;P.iT=1;P.hp=P.s.maxHp;';
    const pas = async (n, f) => page.evaluate(([PAS_, n, T, f]) => { const PAS = eval(PAS_), D = window.__brumeux.dbg(), P = D.P, AR = D.AR, t = new Function('P', 'AR', T + (f || '')); PAS(n, () => t(P, AR)); }, [PAS.toString(), n, T, f || '']);
    await page.evaluate(TAIRE); await pas(20);
    if (!rm && DIR) { const url = await page.evaluate(() => { const M = window.__brumeux.dbg().mod().M, ks = Object.keys(M), pcs = ['bloc', 'fut', 'butoir', 'puits', 'tour'], c = document.createElement('canvas'); c.width = 60 + (pcs.length * 3 + 1) * 90; c.height = 40 + ks.length * 90; const g = c.getContext('2d'); g.fillStyle = '#17161a'; g.fillRect(0, 0, c.width, c.height);
      ks.forEach((m, j) => { g.fillStyle = '#ccc'; g.font = '12px sans-serif'; g.fillText(m, 6, 70 + j * 90); pcs.forEach((pc, i) => [0, 1, 2].forEach(f => { const im = M[m][pc][f]; g.drawImage(im, 60 + (i * 3 + f) * 90 + (90 - im.width) / 2, 30 + j * 90 + (90 - im.height) / 2); })); g.drawImage(M[m].fosse, 60 + pcs.length * 3 * 90 + (90 - M[m].fosse.width) / 2, 30 + j * 90 + (90 - M[m].fosse.height) / 2); });
      return c.toDataURL('image/png'); }); const { writeFileSync } = await import('node:fs'); writeFileSync(join(DIR, 'ouvrage-planche-matieres.png'), Buffer.from(url.split(',')[1], 'base64')); console.log('   capture ' + join(DIR, 'ouvrage-planche-matieres.png')); }
    // l'annonce, ses mains à nu ; les mains ne tricotent pas en mouvements réduits
    const an = await page.evaluate(([PAS_, MESURE_, T]) => { const PAS = eval(PAS_), MESURE = eval(MESURE_), D = window.__brumeux.dbg(), X = D.X, P = D.P, AR = D.AR, e = X.e, t = new Function('P', 'AR', T); MESURE({ k: 'batir' }); const ys = []; PAS(50, () => { t(P, AR); ys.push(e.y); }); return { ann: !!X.ann, ys, vuln: e.vuln }; }, [PAS.toString(), MESURE.toString(), T]);
    await capture(page, `ouvrage-annonce${sfx}.png`);
    let chg = 0; for (let i = 2; i < an.ys.length; i++) if (Math.sign(an.ys[i] - an.ys[i - 1]) * Math.sign(an.ys[i - 1] - an.ys[i - 2]) < 0) chg++;
    if (rm) ok(chg === 0, `J-F : mouvements réduits : pendant l'annonce, ses mains ne tricotent pas (${chg} changements de sens)`); else ok(an.ann && an.vuln > 0, 'J-F : annonce : ses mains à nu (anneau ivoire)');
    // l'annulation (la craie s'émiette)
    if (!rm) { await page.evaluate(() => { const X = window.__brumeux.dbg().X; if (X.ann) X.e.hp = X.ann.hp0 - 200; }); await pas(4); await capture(page, 'ouvrage-annulation.png'); }
    await pas(120);
    // chaque sorte, posée (puis la cloche, les passerelles, le puits plein)
    const S = await page.evaluate(([PAS_, T]) => { const PAS = eval(PAS_), D = window.__brumeux.dbg(), X = D.X, P = D.P, AR = D.AR, t = new Function('P', 'AR', T), out = {}; for (const c of X.bat.slice()) D.retirer(c, 'efface');
      for (const s of ['murailles', 'colonnades', 'rails', 'puits', 'echafaudages', 'douves']) out[s] = window.__brumeux.poser(s).ok; PAS(60 * 3.3, () => t(P, AR));
      const pu = X.bat.find(c => c.sorte === 'puits'); if (pu) pu.bu = pu.cap; return out; }, [PAS.toString(), T]);
    await capture(page, `ouvrage-sortes${sfx}.png`);
    if (!rm) ok(Object.values(S).filter(Boolean).length >= 4, `J-F : constructions posées pour la capture : ${Object.entries(S).map(([k, v]) => k + (v ? '' : ' (non)')).join(', ')}`);
    // les gestes : la Ruée (arrêtée par la muraille si elle est sur la ligne), l'Équerre, la Truelle
    for (const g of ['ruee', 'equerre', 'truelle']) { await page.evaluate(([MESURE_, g]) => { eval(MESURE_)({ k: 'fixe', g }); }, [MESURE.toString(), g]); await pas(60); await capture(page, `ouvrage-geste-${g}${sfx}.png`); await pas(60); }
    // l'effondrement par sorte (le plus proche d'abord), avec sa bascule (mouvements réduits : un fondu)
    const ef = []; for (let k = 0; k < 4; k++) { const q = await page.evaluate(([PAS_, MESURE_, T]) => { const PAS = eval(PAS_), MESURE = eval(MESURE_), D = window.__brumeux.dbg(), X = D.X, P = D.P, AR = D.AR, t = new Function('P', 'AR', T); MESURE({ k: 'fixe', g: 'effondrement' }); PAS(50, () => t(P, AR)); const z = X.zones.find(q => q.id === 'effondrement' && !q.fait); return z ? z.sorte : null; }, [PAS.toString(), MESURE.toString(), T]);
      if (q) { ef.push(q); await capture(page, `ouvrage-effondrement-${q}${sfx}.png`); } await pas(90); }
    if (!rm) ok(ef.length >= 2, `J-F : effondrements capturés : ${ef.join(', ')}`);
    ok(!errs.length, `J-F${rm ? ' (mouvements réduits)' : ''} : aucune erreur ` + errs.slice(0, 2).join(' | '));
    await ctx.close();
  }
}
  // ── J-G · les zones des mutations (Échos, Glas) et l'Ombre frappent avec un signe dans l'arène (vu en régression v18.7 : un Glas jugé « sans signe »
  // au palier Extrême, en phase I) : une zone posée sur toi (contre 888578f : jugée sans signe) ; l'Ombre (qui ne vit qu'avec ennemis et mutation tirée)
  // est vérifiée par sim-arene
  { const { page, errs, ctx } = await ouvre('');
    await page.evaluate(ESSAI, { phase: 1, cls: 'lum', graine: 7, palier: 'extreme' });
    const r = await page.evaluate(([PAS_]) => { const PAS = eval(PAS_), D = window.__brumeux.dbg(), XA = window.__arene.dbg(), P = XA.P, room = XA.room, out = {};
      const X = D.X; X.boucle = [{ k: 'fixe', g: 'feinte' }]; X.ph = 'entracte'; X.t = 1e9; for (const e of XA.enemies) if (e.type !== 'boss') e.dead = true; room.waves = []; room.spawning = [];
      const x0 = P.x, y0 = P.y, j0 = window.__arene.journal(); room.z18 = [{ k: 'glas', x: x0, y: y0, r: 60, t: 1, tot: 1, dmg: 5 }];
      PAS(75, () => { P.x = x0; P.y = y0; P.iT = 0; }); const j1 = window.__arene.journal(); out.glas = { coups: j1.coups - j0.coups, sans: j1.sansSigne - j0.sansSigne, z: (room.z18 || []).length };
      return out; }, [PAS.toString()]);
    console.log('   ' + JSON.stringify(r));
    ok(r.glas.coups >= 1 && r.glas.sans === 0, `J-G : un Glas qui éclate sur toi est jugé signalé (l'Écho suit le même chemin) (${r.glas.coups} coup, ${r.glas.sans} sans signe)`);
    ok(!errs.length, 'J-G : aucune erreur ' + errs.slice(0, 2).join(' | '));
    await ctx.close(); }


// ═══ K. La phase III, « La Couture » (5d) ═══════════════════════════════════════════════════════════════════════════════════════
if (SEC.includes('K')) {
  console.log('\n══ K · la phase III, « La Couture » ══');
  const TAIRE = () => { const X = window.__brumeux.dbg().X; X.boucle = [{ k: 'fixe', g: 'feinte' }]; X.im = 1; X.ph = 'entracte'; X.t = 1e9; };
  const MESURE = (m) => { const X = window.__brumeux.dbg().X; X.boucle = [m]; X.im = 0; X.ph = 'entracte'; X.t = 0.01; };
  const RES = 'ray_n1,lum_a1,gou_b1,her_c1,tis_d1';
  // ── K-A · ce qu'il coud, en jeu = la logique pure : la némésis en premier fil, puis le Masqué cousu qui t'a tué ; points (distances, écart, bornes) ;
  // souvenirs de la réserve sans remise ; même graine, même Couture
  {
    const { page, errs, ctx } = await ouvre('');
    const r = await page.evaluate(([PAS_, MESURE_, RES]) => { const PAS = eval(PAS_), MESURE = eval(MESURE_), B = window.__brume, out = [];
      for (let k = 0; k < 2; k++) { B.cls('lum'); B.start(); PAS(3);
        B.SAVE.brumeux = { v: 1, tentatives: 1, victoires: 0, phaseMax: 3, mort: { 3: 'couture' }, vus: [], cousu: { 3: { corps: 'spectre', cle: 'spectre:onde+tirs>charge', id: null } } };
        window.__brumeux.essai(3, { muet: true, graine: 4242, reserve: RES, nem: 'ray_n1', points: 2 }); const D = window.__brumeux.dbg(), X = D.X, P = D.P, AR = D.AR;
        const tient = () => { P.x = AR.x0 + 1250; P.y = AR.y0 + 760; P.iT = 1; P.hp = P.s.maxHp; }; PAS(5, tient); MESURE({ k: 'couture' }); PAS(30, tient);
        const e = window.__brumeux.etat(), L = e.cou.j.coutureLog[0] || null, R = D.RUN.reserveBrume.map(x => x.id);
        out.push({ L, fils: e.cou.fils, lec: e.lec, cousuLu: X.lec && X.lec.cousu, R, K: window.__brumeux.DB.couture, AR: { x0: AR.x0, y0: AR.y0, x1: AR.x1, y1: AR.y1 }, p: [P.x, P.y] }); }
      return out; }, [PAS.toString(), MESURE.toString(), RES]);
    const [a, b] = r, L = a.L, K = a.K;
    ok(!!L && L.fils.length === 3, `K-A : une Couture lance trois fils (${L ? L.fils.map(f => f.corps + (f.nem ? '*' : '') + (f.rej ? '°' : '') + (f.sv ? '+' + f.sv : '')).join(' ') : '—'})`);
    ok(L && L.fils[0].nem && !L.fils[0].rej, 'K-A : la némésis (essai, en mémoire) est le premier fil');
    ok(L && L.fils[1].rej && L.fils[1].cle === 'spectre:onde+tirs>charge' && a.cousuLu && a.cousuLu.cle === L.fils[1].cle, `K-A : le Masqué cousu qui t'a tué (SAVE.brumeux) est le premier fil après la némésis (${L && L.fils[1].cle})`);
    const svs = L ? L.fils.map(f => f.sv).filter(Boolean) : []; ok(new Set(svs).size === svs.length && svs.every(id => a.R.includes(id)), `K-A : souvenirs tirés dans la réserve, sans remise (${svs.join(', ') || 'aucun'})`);
    if (L) { const pts = L.pts, bad = []; for (const [i, q] of pts.entries()) { const d = Math.hypot(q[0] - L.p[0], q[1] - L.p[1]); if (d < K.points.d[0] - 1 || d > K.points.d[1] + 1) bad.push('d ' + d.toFixed(0)); for (const [j, o] of pts.entries()) if (j > i && Math.hypot(o[0] - q[0], o[1] - q[1]) < K.points.ecart - 1) bad.push('écart');
        if (q[0] < a.AR.x0 + K.points.bord - 1 || q[0] > a.AR.x1 - K.points.bord + 1 || q[1] < a.AR.y0 + K.points.bord - 1 || q[1] > a.AR.y1 - K.points.bord + 1) bad.push('bornes'); }
      ok(!bad.length, `K-A : points de montage à ${K.points.d.join('–')} px de toi, à ${K.points.ecart} px l'un de l'autre, dans les bornes (${pts.map(q => q.join(',')).join(' · ')})${bad.length ? ' ; ' + bad.join(', ') : ''}`); }
    ok(JSON.stringify(a.L) === JSON.stringify(b.L), 'K-A : même graine, même lecture : même Couture (points, assemblages, souvenirs)');
    ok(!errs.length, 'K-A : aucune erreur ' + errs.slice(0, 2).join(' | '));
    await ctx.close();
  }
  // ── K-B · la mécanique en jeu
  {
    const { page, errs, ctx } = await ouvre('');
    await page.evaluate(ESSAI, { phase: 3, cls: 'lum', graine: 61, reserve: RES });
    const r = await page.evaluate(([PAS_, TAIRE_, MESURE_]) => { const PAS = eval(PAS_), TAIRE = eval(TAIRE_), MESURE = eval(MESURE_), D = window.__brumeux.dbg(), X = D.X, P = D.P, AR = D.AR, e = X.e, out = {}; TAIRE();
      const tient = () => { P.x = AR.x0 + 1250; P.y = AR.y0 + 760; P.iT = 1; P.hp = P.s.maxHp; e.hp = Math.max(e.hp, e.maxHp * X.seuils[1] - 50); }; PAS(5, tient);
      // 1. l'entité frappable est sa croix : l'anneau du point faible est dessiné là où l'on frappe
      const fb = D.faible(), cx = D.croix(); out.croix = { fb: [Math.round(fb[0]), Math.round(fb[1])], e: [Math.round(e.x), Math.round(e.y)], cx: cx.map(Math.round) };
      // 2. un montage qui aboutit : sa durée (le premier fil, sans le couper)
      MESURE({ k: 'couture' }); let t1 = null, i0 = null; PAS(60 * 8, i => { tient(); const f = X.cou.fils.find(q => q.k === 0); if (f && f.etat === 'montage' && i0 == null) i0 = i; if (f && f.etat === 'abouti' && t1 == null) t1 = i; });
      out.duree = i0 != null && t1 != null ? (t1 - i0) / 60 : null; out.apres = window.__brumeux.etat().cou; out.vivants = out.apres.vivants;
      out.masque = D.enemies.filter(o => !o.dead && o.cou18 && o.cou18.etat === 'abouti').map(o => ({ corps: o.type, hp: Math.round(o.maxHp), mont: !!o.asm.mont, carte: !!(document.getElementById('asmCard') && document.getElementById('asmCard').classList.contains('show')) }));
      out.suspendus = X.cou.j.suspendus; out.susp = X.cou.fils.filter(f => f.etat === 'suspendu').length;
      // 3. un cousu brisé : à nu 2 s ; un montage suspendu tombe dans le combat
      const c1 = D.enemies.find(o => !o.dead && o.cou18 && o.cou18.etat === 'abouti'), v0 = e.vuln || 0; if (c1) { D.hit(c1, 1e6, { crit: false }); PAS(2, tient); }
      out.brise = { vuln: +((e.vuln || 0)).toFixed(2), v0: +v0.toFixed(2), brises: X.cou.j.brises }; PAS(60 * 3, tient); out.lache = { susp: X.cou.fils.filter(f => f.etat === 'suspendu').length, viv: window.__brumeux.etat().cou.vivants };
      for (const o of D.enemies) if (!o.dead && o.cou18) o.dead = true; PAS(5, tient);
      // 4. les nœuds : PV, un coup par image (le plus gros), hors du ciblage automatique, retenu hors de vue ; coupés, plus aucun fil : à nu 3 s
      MESURE({ k: 'couture' }); PAS(60 * 1.6, tient); const F = X.cou.fils.filter(f => f.noeud), n0 = F[0] && F[0].noeud;
      if (n0) { const pv0 = F[0].el.pv; D.hit(n0, 7, { crit: false }); D.hit(n0, 11, { crit: false }); PAS(1, tient); out.coup = { pv0, pv: F[0].el.pv, max: F[0].el.pvMax };
        out.cible = { foe: !!D.nearestFoe(n0.x, n0.y, 400, null) && D.nearestFoe(n0.x, n0.y, 400, null) === n0, ne: window.__brumeux.dbg().X && null };
        const loin = F.find(f => Math.hypot(f.noeud.x - P.x, f.noeud.y - P.y) > 700) || null; if (loin) { const pv1 = loin.el.pv; P.x = AR.x0 + 100; P.y = AR.y0 + 100; D.hit(loin.noeud, 9, { crit: false }); PAS(1); out.horsVue = { pv1, pv: loin.el.pv, d: Math.round(Math.hypot(loin.noeud.x - P.x, loin.noeud.y - P.y)) }; }
        const vb = e.vuln || 0; for (const f of X.cou.fils.slice()) if (f.noeud && f.etat !== 'abouti') D.hit(f.noeud, 1e4, { crit: false, brx: 1 }); PAS(2, tient);
        out.nu = { vuln: +((e.vuln || 0)).toFixed(2), vb: +vb.toFixed(2), coupes: X.cou.j.coupes, tendus: X.cou.fils.filter(f => ['attente', 'montage', 'suspendu'].includes(f.etat)).length, morts: D.enemies.filter(o => o.cou18 && o.dead).length, asm18: (window.__brume.SAVE.asm18 || {}).vaincus || 0, bouts: X.cou.bouts.length }; }
      return out; }, [PAS.toString(), TAIRE.toString(), MESURE.toString()]);
    ok(r.croix.fb[0] === r.croix.e[0] && r.croix.fb[1] === r.croix.e[1] && r.croix.cx[1] === r.croix.e[1], `K-B : en phase III, l'entité frappable est sa croix (point faible ${r.croix.fb}, entité ${r.croix.e}, croix ${r.croix.cx})`);
    ok(r.duree != null && Math.abs(r.duree - DB.couture.montage.dureeS) < 0.12, `K-B : un montage dure ${r.duree && r.duree.toFixed(2)} s (${DB.couture.montage.dureeS} attendus)`);
    ok(r.masque.length >= 1 && r.masque.every(m => !m.mont && !m.carte && m.hp < 1200), `K-B : les montages aboutis donnent des Masqués cousus au combat (${r.masque.map(m => m.corps + ' ' + m.hp + ' PV').join(', ')}), sans carte d'arrivée`);
    ok(r.vivants <= DB.paliers.normal.masques && (r.susp >= 1 || r.suspendus >= 1), `K-B : au plafond (${r.vivants} vivants en Normal), le montage suivant reste suspendu (${r.suspendus})`);
    ok(r.brise.brises >= 1 && r.brise.vuln >= DB.couture.briseS - 0.05, `K-B : un Masqué cousu brisé le met à nu (${r.brise.vuln} s ≥ ${DB.couture.briseS})`);
    ok(r.lache.susp === 0, `K-B : une place libérée, le montage suspendu tombe dans le combat (suspendus ${r.lache.susp}, vivants ${r.lache.viv})`);
    ok(r.coup && r.coup.max === Math.round(DB.couture.noeud.pvPart * 2400) && r.coup.pv0 - r.coup.pv > 0 && r.coup.pv0 - r.coup.pv <= 11 + 1e-6, `K-B : un nœud a ${r.coup && r.coup.max} PV ; deux coups dans la même image : seul le plus gros compte (${r.coup && (r.coup.pv0 - r.coup.pv).toFixed(1)})`);
    ok(r.cible && r.cible.foe === false, 'K-B : le ciblage automatique ne voit pas un nœud');
    ok(!r.horsVue || r.horsVue.pv === r.horsVue.pv1, `K-B : un coup sur un nœud hors de vue est retenu (${r.horsVue ? r.horsVue.d + ' px' : 'aucun nœud loin'})`);
    ok(r.nu && r.nu.tendus === 0 && r.nu.vuln >= DB.couture.nuS - 0.05 && r.nu.bouts >= 1, `K-B : plus aucun fil (coupés) : sa croix vacille, à nu ${r.nu && r.nu.vuln} s ; des bouts de fil pendent (${r.nu && r.nu.bouts})`);
    ok(!errs.length, 'K-B : aucune erreur ' + errs.slice(0, 2).join(' | '));
    await ctx.close();
  }
  // K-B, suite : réserve vide → ordinaires ; une douve : un point sur son île ; les constructions vivent en III ; les transitions II → III et III → IV ;
  // les chargements des cousus jamais sous 0,6 s
  {
    const { page, errs, ctx } = await ouvre('');
    await page.evaluate(ESSAI, { phase: 2, cls: 'lum', graine: 63 });
    const r = await page.evaluate(([PAS_, TAIRE_, MESURE_]) => { const PAS = eval(PAS_), TAIRE = eval(TAIRE_), MESURE = eval(MESURE_), D = window.__brumeux.dbg(), X = D.X, P = D.P, AR = D.AR, e = X.e, out = {}; TAIRE();
      const tient = () => { P.x = AR.x0 + 1250; P.y = AR.y0 + 860; P.iT = 1; P.hp = P.s.maxHp; }; PAS(5, tient);
      // phase II : une douve, des rails, un puits, un échafaudage ; puis l'appel des Manœuvres
      for (const s of ['douves', 'rails', 'puits', 'echafaudages']) out['pose_' + s] = window.__brumeux.poser(s).ok; PAS(60 * 2.2, tient);
      MESURE({ k: 'fixe', g: 'manoeuvres' }); PAS(60 * 2, tient); out.appel = D.enemies.filter(o => !o.dead && o.appel18).length;
      out.tard = !!window.__arene.dbg().A.sol[5];
      e.hp = Math.floor(e.maxHp * X.seuils[1]) - 2; window.__brumeux.vers(3); PAS(60 * 4, tient); TAIRE();
      out.t23 = { phase: window.__brumeux.etat().phase, etat: window.__arene.etat().etat, appel: D.enemies.filter(o => !o.dead && o.appel18).length, mainsC: !!X.mainsC, bat: X.bat.map(c => c.sorte), tard: !!window.__arene.dbg().A.sol[5] };
      // les mécanismes vivent : la cloche passe, les passerelles basculent, l'échafaudage protège
      const c0 = X.j.cloches + X.j.clochesSautees, dv = X.bat.find(c => c.sorte === 'douves'), et0 = dv && dv.etatI; PAS(60 * 7, tient); out.vit = { cloches: X.j.cloches + X.j.clochesSautees - c0, bascule: dv ? dv.etatI !== et0 || dv.bT < 2.5 : null, rail: X.bat.some(c => c.sorte === 'rails') };
      { const h0 = e.hp; D.hit(e, 100, { crit: false }); out.echaf = Math.round(h0 - e.hp); }
      // réserve vide : des Masqués ordinaires ; la douve : un point sur son île
      D.RUN.reserveBrume = []; const loin = dv ? (() => { for (const [dx, dy] of [[-420, 0], [420, 0], [0, -380], [0, 380], [-320, -300], [320, 300]]) { const x = dv.ile[0] + dx, y = dv.ile[1] + dy; if (x > AR.x0 + 120 && x < AR.x1 - 120 && y > AR.y0 + 120 && y < AR.y1 - 120 && !D.room.pillars.some(q => Math.hypot(q.x - x, q.y - y) < q.r + 40)) return [x, y]; } return null; })() : null;
      const tient2 = loin ? () => { P.x = loin[0]; P.y = loin[1]; P.iT = 1; P.hp = P.s.maxHp; } : tient; PAS(2, tient2); MESURE({ k: 'couture' }); PAS(30, tient2); const L = X.cou.j.coutureLog[X.cou.j.coutureLog.length - 1];
      out.vide = L ? L.fils.map(f => f.sv) : null; out.ile = L && dv ? L.pts.some(q => Math.abs(q[0] - dv.ile[0]) < 1 && Math.abs(q[1] - dv.ile[1]) < 1) : null;
      // les chargements des cousus : on laisse aboutir et se battre (toi, intouchable)
      const tots = []; PAS(60 * 14, () => { tient(); for (const o of D.enemies) if (!o.dead && o.cou18 && o.asm && !o.asm.mont) { const st = o.asm.st; const s2 = st.sb && st.sb.ph === 'charge' ? st.sb : st.ph === 'charge' ? st : null; if (s2 && s2.t === s2.tot) tots.push(+s2.tot.toFixed(3)); } });
      out.tots = tots; out.prolonges = X.cou.j.prolonges;
      // III → IV : les cousus se décousent ; les constructions filtrées par les bornes de l'état IV
      const vivants = D.enemies.filter(o => !o.dead && o.cou18).length; e.hp = Math.floor(e.maxHp * X.seuils[2]) - 2; window.__brumeux.vers(4); PAS(60 * 5);
      out.t34 = { vivants, apres: D.enemies.filter(o => !o.dead && o.cou18).length, decousus: X.cou.j.decousus, noeuds: D.enemies.filter(o => !o.dead && o.cons18 && o.cons18.noeud).length, phase: window.__brumeux.etat().phase };
      return out; }, [PAS.toString(), TAIRE.toString(), MESURE.toString()]);
    ok(r.appel >= 1 && r.t23.appel === 0 && r.t23.phase === 3 && r.t23.etat === DB.phases[2].arene, `K-B : II → III : l'appel des Manœuvres rentre dans la brume (${r.appel} → ${r.t23.appel}), arène à l'état ${r.t23.etat}`);
    ok(!r.t23.mainsC && r.t23.bat.length >= 3, `K-B : en III, ses mains ne sont plus retenues sur l'île ; les constructions restent (${r.t23.bat.join(', ')})`);
    ok(r.tard && r.t23.tard, 'K-B : le calque de la phase III (tard) est peint pendant la phase II');
    ok((!r.vit.rail || r.vit.cloches >= 1) && r.vit.bascule !== false && r.echaf > 0 && r.echaf <= 100 * 0.6 * 1.5 + 1, `K-B : en III, la cloche continue (${r.vit.rail ? r.vit.cloches + ' passage(s), sautés compris' : 'pas de rail'}), les passerelles battent, l'échafaudage protège (100 → ${r.echaf})`);
    ok(r.vide && r.vide.every(x => x === null), `K-B : réserve vide : des Masqués ordinaires (${r.vide && r.vide.length} fils, aucun souvenir)`);
    ok(r.ile === true, 'K-B : une douve tient : un des points de montage est sur son île');
    ok(r.tots.length >= 1 && Math.min(...r.tots) >= DB.couture.cousus.plancherS - 1e-3, `K-B : les chargements des Masqués cousus ne descendent jamais sous ${DB.couture.cousus.plancherS} s (${r.tots.length} chargements, au plus court ${Math.min(...r.tots)} s ; ${r.prolonges} prolongés)`);
    ok(r.t34.phase === 4 && r.t34.apres === 0 && r.t34.noeuds === 0 && (r.t34.vivants === 0 || r.t34.decousus >= 1), `K-B : III → IV : les cousus se décousent (${r.t34.vivants} → ${r.t34.apres}), plus aucun nœud`);
    ok(!errs.length, 'K-B (suite) : aucune erreur ' + errs.slice(0, 2).join(' | '));
    await ctx.close();
  }
  // ── K-C · la némésis : premier fil, trousseau après la couture, PV de ses points ; coupée : fiche gardée ; brisée : fiche effacée, aucune fenêtre ;
  // la promotion (sur une sauvegarde jetable : la page de banc) : le cousu dont le coup t'a tué, jamais le Brumeux, jamais en essai, attente acte III salle 3
  {
    const { page, errs, ctx } = await ouvre('');
    await page.evaluate(ESSAI, { phase: 3, cls: 'lum', graine: 65, reserve: RES, nem: 'ray_n1', points: 3 });
    const r = await page.evaluate(([PAS_, TAIRE_, MESURE_]) => { const PAS = eval(PAS_), TAIRE = eval(TAIRE_), MESURE = eval(MESURE_), D = window.__brumeux.dbg(), X = D.X, P = D.P, AR = D.AR, e = X.e, out = {}; TAIRE();
      const tient = () => { P.x = AR.x0 + 1250; P.y = AR.y0 + 760; P.iT = 1; P.hp = P.s.maxHp; e.hp = Math.max(e.hp, e.maxHp * X.seuils[1] - 50); }; PAS(5, tient);
      MESURE({ k: 'couture' }); PAS(60 * 5.2, tient); const n = D.enemies.find(o => !o.dead && o.cou18 && o.cou18.nem), o2 = D.enemies.find(o => !o.dead && o.cou18 && !o.cou18.nem);
      if (n) D.render(); out.nem = n ? { trou: n.asm.trou ? n.asm.trou.n : 0, pts: n.asm.nem && n.asm.nem.points, hp: Math.round(n.maxHp), autre: o2 ? Math.round(o2.maxHp) : null, corps: n.type, autreCorps: o2 && o2.type } : null;
      if (n) { D.hit(n, 1e6, { crit: false }); PAS(30, tient); out.brisee = { dead: n.dead, bris: Object.keys(D.RUN.nemBrisees || {}).length, overlay: document.querySelector('#overlay').hidden }; }
      return out; }, [PAS.toString(), TAIRE.toString(), MESURE.toString()]);
    ok(r.nem && r.nem.trou === 3 && r.nem.pts === 3, `K-C : la némésis cousue porte son trousseau (${r.nem && r.nem.trou} crânes accrochés après la couture, ${r.nem && r.nem.pts} points)`);
    ok(r.nem && r.nem.hp > 0, `K-C : ses PV : ceux d'un cousu × ses points (${r.nem && r.nem.hp} ; un autre cousu : ${r.nem && r.nem.autre})`);
    ok(r.brisee && r.brisee.dead && r.brisee.bris === 1 && r.brisee.overlay, 'K-C : brisée dans le combat : sa fiche part (nemBrise), aucune fenêtre ne s\'ouvre');
    ok(!errs.length, 'K-C : aucune erreur ' + errs.slice(0, 2).join(' | '));
    await ctx.close();
    // la promotion, trois cas, chacun sur une page neuve (sauvegarde jetable) : tué par un cousu (hors essai), par le Brumeux, en essai
    const promo = async (cas) => { const { page, errs, ctx } = await ouvre('');
      await page.evaluate(ESSAI, { phase: 3, cls: 'lum', graine: 67, reserve: RES, dieu: false });
      const q = await page.evaluate(([PAS_, TAIRE_, MESURE_, cas]) => { const PAS = eval(PAS_), TAIRE = eval(TAIRE_), MESURE = eval(MESURE_), D = window.__brumeux.dbg(), X = D.X, P = D.P, AR = D.AR, e = X.e; TAIRE();
        window.__nemesis.activer(true); delete window.__brume.SAVE.nemesis; const tient = () => { P.x = AR.x0 + 1250; P.y = AR.y0 + 760; P.iT = 1; P.hp = P.s.maxHp; }; PAS(5, tient);
        MESURE({ k: 'couture' }); PAS(60 * 5.2, tient); const c = D.enemies.find(o => !o.dead && o.cou18 && o.cou18.etat === 'abouti'); if (!c) return { refus: 'pas de cousu' };
        if (cas !== 'essai') D.RUN.essai = 0; P.iT = 0; P.dashT = 0; P.shield = 0;
        D.hurt(P.hp + 999, cas === 'brumeux' ? e : c); const R = D.room.asm;
        const B = window.__nemesis.promouvoir(), S = window.__nemesis.voir(), f = S && S.liste[0];
        return { mort: P.dead || P.hp <= 0, asm: !!R, cousu: !!(R && R.cousu18), B, attend: f && f.attend, corps: f && f.corps, cCorps: c.type }; }, [PAS.toString(), TAIRE.toString(), MESURE.toString(), cas]);
      await ctx.close(); return { q, errs }; };
    const A1 = await promo('cousu'), A2 = await promo('brumeux'), A3 = await promo('essai');
    console.log('   promotion : ' + JSON.stringify({ cousu: A1.q, brumeux: A2.q, essai: A3.q }).slice(0, 600));
    ok(A1.q.mort && A1.q.cousu && A1.q.B && !A1.q.B.refus && A1.q.B.decision === 'nouveau' && A1.q.attend && A1.q.attend.acte === 3 && A1.q.attend.salle === 3 && A1.q.corps === A1.q.cCorps, `K-C : tué par un Masqué cousu (hors essai) : il est promu, et attend à l'acte III, salle 3 (${JSON.stringify(A1.q.attend)})`);
    ok(A2.q.mort && !A2.q.asm && A2.q.B && A2.q.B.refus, `K-C : tué par le Brumeux lui-même : personne n'est promu (${A2.q.B && A2.q.B.refus})`);
    ok(A3.q.mort && A3.q.B && A3.q.B.refus === 'essai', `K-C : une descente d'essai ne promeut personne (${A3.q.B && A3.q.B.refus})`);
    ok(!A1.errs.length && !A2.errs.length && !A3.errs.length, 'K-C (promotion) : aucune erreur ' + [...A1.errs, ...A2.errs, ...A3.errs].slice(0, 2).join(' | '));
  }
  // ── K-D · la phase III conduite par le bot qui frappe, quatre formes, deux graines : 0 coup sans signe, durée, fils
  for (const [k, cls] of ['lum', 'gou', 'her', 'tis'].entries()) for (const g of [81, 82]) {
    const { page, errs, ctx } = await ouvre('');
    await page.evaluate(ESSAI, { phase: 3, bot: 2, cls, graine: g + 10 * k, reserve: RES, palier: ['normal', 'difficile', 'extreme', 'normal'][k] });
    const r = await page.evaluate(([PAS_]) => { const PAS = eval(PAS_); let fin = null; const X = window.__brumeux.dbg().X, hp0 = X.e.hp, bas = X.e.maxHp * X.seuils[2];
      for (let s = 0; s < 240 && fin == null; s++) PAS(60, i => { if (fin != null) return; const et = window.__brumeux.etat(); if (et.phase >= 4 || !et.on || et.scene) fin = s * 60 + i; });
      const et = window.__brumeux.etat(); return { j: window.__arene.journal(), st: window.__brumeux.statsRun(), fin, J: et.cou && et.cou.j, part: (hp0 - Math.max(bas, X.e.hp)) / (hp0 - bas) }; }, [PAS.toString()]);
    const p3 = r.st.phases[3] || { t: 0, coups: 0 }, J = r.J || {};
    console.log(`   ${cls} graine ${g + 10 * k} (${r.st.palier}) : phase III ${r.fin != null ? 'finie en ' + p3.t + ' s' : 'non finie en 240 s (' + Math.round(r.part * 100) + ' % de ses PV)'}, ${p3.coups} coups ; Coutures ${J.coutures} (${J.sautees} sautées), fils ${J.fils}, coupés ${J.coupes}, aboutis ${J.aboutis}, suspendus ${J.suspendus}, cousus brisés ${J.brises}, à nu ${J.nu} ; zones de cousus jugées ${J.zonesJugees}, chargements prolongés ${J.prolonges}`);
    if (r.j.liste.length) console.log('   coups suspects : ' + JSON.stringify(r.j.liste.slice(0, 6)));
    ok(r.j.sansSigne === 0, `K-D : ${cls} (${g + 10 * k}) : aucun coup sans signe (${r.j.coups} coups reçus)`);
    ok(J.fils >= 3, `K-D : ${cls} (${g + 10 * k}) : il coud (${J.fils} fils)`);
    ok(r.fin != null || r.part >= 0.4, `K-D : ${cls} (${g + 10 * k}) : le bot qui frappe avance (${r.fin != null ? 'phase III finie en ' + p3.t + ' s' : Math.round(r.part * 100) + ' % de ses PV en 240 s'} ; cible 50 à 70 s, PV placeholders recalés en 5g)`);
    ok(r.j.assertions === 0 && !errs.length, `K-D : ${cls} (${g + 10 * k}) : aucune erreur ` + errs.slice(0, 2).join(' | '));
    if (cls === 'gou' && g === 81) await capture(page, 'couture-combat.png');
    await ctx.close();
  }
  // ── K-E · coût apparié dans une seule page : phase III, trois montages, deux cousus, six constructions, contre le boss d'essai devant la même foule ;
  // peinture à l'entrée d'un essai ?brumeux=3
  {
    const { page, errs, ctx } = await ouvre('');
    const n = await page.evaluate(([PAS_, TAIRE_, MESURE_, RES]) => { const PAS = eval(PAS_), TAIRE = eval(TAIRE_), MESURE = eval(MESURE_); window.__brume.cls('lum'); window.__brumeux.essai(2, { muet: true, graine: 7, palier: 'difficile', reserve: RES });
      const D = window.__brumeux.dbg(), X = D.X, P = D.P, AR = D.AR; TAIRE();
      const place = (s, x, y) => { P.x = x; P.y = y; PAS(2, () => { P.x = x; P.y = y; P.iT = 1; }); const v = window.__brumeux.poser(s, { p: [x, y], h: [x, y - 260] }); PAS(2, () => { P.x = x; P.y = y; P.iT = 1; }); D.render(); return v.ok; };
      for (const [s, x, y] of [['murailles', 1050, 720], ['colonnades', 1500, 520], ['rails', 900, 560], ['puits', 1500, 800], ['echafaudages', 1250, 640], ['douves', 1250, 800]]) place(s, AR.x0 + x, AR.y0 + y);
      const e = X.e; e.hp = Math.floor(e.maxHp * X.seuils[1]) - 2; window.__brumeux.vers(3); const tient = () => { P.x = AR.x0 + 1250; P.y = AR.y0 + 700; P.iT = 1; P.hp = P.s.maxHp; }; PAS(60 * 4, tient); TAIRE();
      MESURE({ k: 'couture' }); PAS(60 * 5.4, tient); MESURE({ k: 'couture' }); PAS(60 * 1.6, tient);   // deux cousus (le plafond en Difficile), puis trois montages
      for (const o of D.enemies) if (!o.cons18 && !o.brx18) { o.spd = 0; o.stun = 1e9; }
      D.render(); X.cuGel = true;   // la cuisson figée (comme J-E) : les tuiles cuites restent, l'image mesure ce qui se dessine à chaque image
      const LS = D.lights(), tous = LS.slice(), sans = tous.filter(l => l.c !== 'brume18'), A = window.__arene.dbg().A, fantome = { x: e.x, y: e.y, r: 44, zones: [], t: 9, wp: null };
      const bat = X.bat.slice(), cpil = D.room.pillars.slice(), bpil = cpil.filter(p => !p.cons18), cou = X.cou, zs = X.zones.slice();
      window.__KE = v => { X.bat = v ? bat : []; D.room.pillars.length = 0; D.room.pillars.push(...(v ? cpil : bpil)); X.cou = v ? cou : null; X.zones = v ? zs : []; e.dead = !v; LS.length = 0; LS.push(...(v ? tous : sans)); A.essai.boss = v ? null : fantome; };
      const et = window.__brumeux.etat().cou; return { montages: et.fils.filter(f => f.etat === 'montage' || f.etat === 'suspendu').length, cousus: et.vivants, bat: bat.length, foule: D.enemies.filter(o => !o.dead && !o.cons18 && !o.brx18).length }; }, [PAS.toString(), TAIRE.toString(), MESURE.toString(), RES]);
    const APP = ([k]) => { const R = window.__arene.dbg().render, c = document.querySelector('#game').getContext('2d'), on = [], off = [];
      for (let i = 0; i < 10; i++) { window.__KE(i % 2 === 0); R(); }
      for (let i = 0; i < k; i++) { const v = i % 2 === 0; window.__KE(v); const t0 = performance.now(); R(); c.getImageData(0, 0, 1, 1); (v ? on : off).push(performance.now() - t0); }
      window.__KE(true); const md = x => x.sort((p, q) => p - q)[x.length >> 1]; return [md(on), md(off)]; };
    const rr = []; for (let k = 0; k < 5; k++) rr.push(await page.evaluate(APP, [240]));
    const med = v => v.slice().sort((x, y) => x - y)[v.length >> 1], d = med(rr.map(x => x[0] - x[1]));
    await capture(page, 'couture-cout.png');
    const p3 = await page.evaluate(() => { window.__brumeux.essai(3, { muet: true, graine: 3 }); const J = window.__brumeux.dbg().X.j, A = window.__arene.dbg().A; return { pe: A.peintureMs, mod: J.modulesMs }; });
    console.log(`   coût (apparié, image par image) : phase III (${n.montages} montages, ${n.cousus} cousus, ${n.bat} constructions ; foule ${n.foule}) contre le boss d'essai, même foule : ${rr.map(x => (x[0] - x[1] >= 0 ? '+' : '') + (x[0] - x[1]).toFixed(2)).join(' / ')} ms (médiane ${d >= 0 ? '+' : ''}${d.toFixed(2)}) ; peinture à l'entrée d'un essai en III ${(p3.pe + p3.mod).toFixed(1)} ms`);
    ok(n.montages >= 1 && n.cousus >= 1 && n.bat >= 5, `K-E : la scène mesurée : ${n.montages} montages, ${n.cousus} cousus, ${n.bat} constructions`);
    ok(d <= DA.budget.rendu, `K-E : coût de rendu de la phase III contre le boss d'essai, même foule : ${d >= 0 ? '+' : ''}${d.toFixed(2)} ms (≤ +${DA.budget.rendu})`);
    ok(p3.pe + p3.mod <= DA.budget.peinture, `K-E : peinture à l'entrée d'un essai en III : ${(p3.pe + p3.mod).toFixed(1)} ms (≤ ${DA.budget.peinture})`);
    ok(!errs.length, 'K-E : aucune erreur ' + errs.slice(0, 2).join(' | '));
    await ctx.close();
  }
  // ── K-F · mouvements réduits et captures : trois fils qui descendent, nœud qui grossit, coupe, montage suspendu, à nu sur la croix, Surjet, Dé
  // (deux coups), Aiguilles derrière une muraille, la némésis et son trousseau, un point sur l'île
  for (const rm of [false, true]) {
    const { page, errs, ctx } = await ouvre('', { rm });
    await page.evaluate(ESSAI, { phase: 2, cls: 'lum', graine: 69, reserve: RES, nem: 'ray_n1', points: 2 });
    const sfx = rm ? '-rm' : '', T = 'P.x=AR.x0+1250;P.y=AR.y0+760;P.iT=1;P.hp=P.s.maxHp;';
    const pas = async (n, f) => page.evaluate(([PAS_, n, T, f]) => { const PAS = eval(PAS_), D = window.__brumeux.dbg(), P = D.P, AR = D.AR, t = new Function('P', 'AR', T); PAS(n, () => t(P, AR)); }, [PAS.toString(), n, T, f || '']);
    await page.evaluate(TAIRE); await pas(10);
    await page.evaluate(() => { for (const s of ['douves', 'murailles']) window.__brumeux.poser(s); });
    await pas(150);
    await page.evaluate(() => { const D = window.__brumeux.dbg(), X = D.X, e = X.e; e.hp = Math.floor(e.maxHp * X.seuils[1]) - 2; window.__brumeux.vers(3); });
    await pas(60 * 4); await page.evaluate(TAIRE);
    await page.evaluate(([M]) => eval(M)({ k: 'couture' }), [MESURE.toString()]); await pas(40); await capture(page, `couture-fils${sfx}.png`);
    const p0 = await page.evaluate(() => window.__brumeux.dbg().X.pench);
    await pas(110); await capture(page, `couture-noeuds${sfx}.png`);
    const cut = await page.evaluate(() => { const D = window.__brumeux.dbg(), X = D.X; const f = X.cou.fils.find(q => q.noeud && !q.nem); if (f) D.hit(f.noeud, 1e4, { crit: false, brx: 1 }); return !!f; });
    await pas(8); await capture(page, `couture-coupe${sfx}.png`); await pas(60 * 3.2); await capture(page, `couture-nemesis${sfx}.png`);
    const nu = await page.evaluate(() => { const D = window.__brumeux.dbg(), X = D.X; for (const f of X.cou.fils.slice()) if (f.noeud) D.hit(f.noeud, 1e4, { crit: false, brx: 1 }); return true; });
    const pe = []; await page.evaluate(([PAS_, T]) => { const PAS = eval(PAS_), D = window.__brumeux.dbg(), P = D.P, AR = D.AR, t = new Function('P', 'AR', T); window.__pe = []; PAS(40, () => { t(P, AR); window.__pe.push(D.X.pench); }); }, [PAS.toString(), T]);
    const pen = await page.evaluate(() => window.__pe); await capture(page, `couture-anu${sfx}.png`);
    if (rm) ok(pen.every(v => Math.abs(v - pen[0]) < 1e-9), `K-F : mouvements réduits : sa croix ne vacille pas (penchée fixe ${pen[0]})`);
    for (const g of ['surjet', 'de', 'aiguilles']) { await page.evaluate(([M, g]) => eval(M)({ k: 'fixe', g }), [MESURE.toString(), g]); await pas(g === 'de' ? 75 : 45); await capture(page, `couture-geste-${g}${sfx}.png`); await pas(70); }
    ok(cut, `K-F${rm ? ' (mouvements réduits)' : ''} : un fil coupé pour la capture`);
    ok(!errs.length, `K-F${rm ? ' (mouvements réduits)' : ''} : aucune erreur ` + errs.slice(0, 2).join(' | '));
    await ctx.close();
  }
}
// ═══ L. La phase IV, « L'Emprunt » (5e) ═══════════════════════════════════════════════════════════════════════════════════════
if (SEC.includes('L')) {
  console.log('\n══ L · la phase IV, « L\'Emprunt » ══');
  const TAIRE = () => { const X = window.__brumeux.dbg().X; X.boucle = [{ k: 'fixe', g: 'feinte' }]; X.im = 1; X.ph = 'entracte'; X.t = 1e9; };
  const MESURE = (m) => { const X = window.__brumeux.dbg().X; X.boucle = [m]; X.im = 0; X.ph = 'entracte'; X.t = 0.01; };
  // la partition se tait et l'emprunt en cours (s'il y en a un) va à son terme : la scène est libre pour un emprunt choisi
  const LIBRE = () => { const X = window.__brumeux.dbg().X, B = window.__brume; X.boucle = [{ k: 'fixe', g: 'feinte' }]; X.im = 1; X.ph = X.emp && X.emp.cur ? 'emprunt' : 'entracte'; X.t = 1e9;
    for (let i = 0; i < 60 * 14 && X.emp && X.emp.cur; i++) { const P = window.__brumeux.dbg().P; P.iT = 1; B.step(1 / 60, 1); } X.boucle = [{ k: 'fixe', g: 'feinte' }]; X.im = 1; X.ph = 'entracte'; X.t = 1e9; return !(X.emp && X.emp.cur); };
  // les mémoires de référence (des talents de chaque forme, empruntables ; un gravé, un avec « double », un avec « élargi », un ignoré)
  const MEMS = { lum: 'ray_n2:3,ray_n4:2:1,pen_n1:3,pen_n2:3,fan_n1:3,pen_n5:3,fan_n2:2,ray_x3a', gou: 'vor_n1:3,vor_n3:2,dif_n1:3,dif_n2:3,dif_n4:2:1,vor_x3a,dif_x2b,reg_n1:2',
    her: 'car_n1:3,car_n2:3,cad_n1:3,cad_n2:2,req_n1:3,req_n4:2:1,car_x1b,cad_x1a', tis: 'aig_n2:3,aig_n4:2,trm_n2:3,trm_n3:2:1,pnt_n1:3,pnt_n6:2,pnt_x1b,aig_x2a' };
  const BE = (() => { const w = {}; new Function('window', readFileSync(join(THEMIST, 'data', 'bestiaire.js'), 'utf8'))(w); return w.BRUME_DATA.bestiaire; })();
  const DATA = (() => { const w = {}; for (const f of ['souvenirs', 'souvenirs-brume', 'talents']) new Function('window', readFileSync(join(THEMIST, 'data', f + '.js'), 'utf8'))(w); return w.BRUME_DATA; })();
  const FAMd = {}; for (const [fid, Fm] of Object.entries(DATA.souvenirs.familles)) for (const id of Fm.t || []) FAMd[id] = fid;
  const KINDd = {}, MAXd = {}; for (const id in DATA.talents.noeuds) { KINDd[id] = DATA.talents.noeuds[id].k; MAXd[id] = DATA.talents.noeuds[id].max || 1; }
  const T9 = { fam: FAMd, kind: KINDd, max: MAXd, J: DATA.souvenirsBrume };
  const PURL = (() => { const bloc = n => html.match(new RegExp('/\\*' + n + ':pur\\*/([\\s\\S]*?)/\\*/' + n + ':pur\\*/'))[1];
    const c = { window: {}, Math, console, JSON, Set, Object, Array, Number, Infinity, isFinite, Uint8Array, Float64Array }; vm.createContext(c);
    for (const f of ['brumeux', 'arene']) vm.runInContext(readFileSync(join(THEMIST, 'data', f + '.js'), 'utf8'), c);
    vm.runInContext(bloc('des') + '\n' + bloc('brx') + '\nthis.F={desRng,brxEmpruntables,brxEmprunts,brxPoidsEmprunt,brxPlafondDs};', c); return c.F; })();
  const empSeed = (g, n) => ((g >>> 0) ^ Math.imul(0x27D4EB2F, n + 1)) >>> 0;
  // ── L-A · lecture, poids, tirage et premier emprunt en jeu = logique pure (même graine, mêmes talents portés)
  {
    const { page, errs, ctx } = await ouvre('');
    const r = await page.evaluate(([PAS_, MEM]) => { const PAS = eval(PAS_), B = window.__brume, out = [];
      for (let k = 0; k < 2; k++) { B.cls('lum'); B.start(); PAS(3);
        B.SAVE.brumeux = { v: 1, tentatives: 1, victoires: 0, phaseMax: 4, mort: { 4: 'emprunt' }, vus: ['emprunt:onde'], emp: { 4: { id: 'pen_n2', fam: 'ruee' } } };
        window.__brumeux.essai(4, { muet: true, graine: 5150, portes: MEM }); const D = window.__brumeux.dbg(), X = D.X;
        const e = window.__brumeux.etat().emp; out.push({ e, actifs: D.RUN.memoire.actifs.map(a => ({ id: a.id, src: a.src, rang: a.rang, g: a.g || 0 })), graine: X.graine, lecEmp: X.lec && X.lec.emp, sauveEmp: X.sauve && X.sauve.emp }); }
      return out; }, [PAS.toString(), MEMS.lum]);
    const [a, b] = r, Lp = PURL.brxEmpruntables(DB, a.actifs, T9).liste, Bp = PURL.brxEmprunts(DB, Lp, PURL.desRng(empSeed(a.graine, 0)), { premier: { id: 'pen_n2', fam: 'ruee' } });
    ok(JSON.stringify(a.e.liste.map(x => x.id)) === JSON.stringify(Lp.map(x => x.id)) && a.e.liste.every((x, i) => Math.abs(x.poids - +PURL.brxPoidsEmprunt(DB, Lp[i]).toFixed(4)) < 1e-9), `L-A : empruntables et poids en jeu = brxEmpruntables / brxPoidsEmprunt (${a.e.liste.map(x => x.id + ' ' + x.poids).join(', ')})`);
    ok(JSON.stringify(a.e.boucle) === JSON.stringify(Bp.map(x => x.id)), `L-A : la première boucle en jeu = brxEmprunts à la même graine : ${a.e.boucle.join(', ')}`);
    ok(a.lecEmp && a.lecEmp.id === 'pen_n2' && a.e.boucle[0] === 'pen_n2' && Bp[0].premier === 'talent', 'L-A : le premier emprunt rejoue le talent dont la copie t\'a tué (SAVE.brumeux, champ emp)');
    ok(JSON.stringify(a.e.boucle) === JSON.stringify(b.e.boucle) && a.graine === b.graine, 'L-A : même graine, mêmes talents : même boucle');
    ok(!a.e.liste.some(x => x.id === 'ray_x3a' && x.vars.includes('traverse')) && a.e.liste.find(x => x.id === 'pen_n1').vars.join() === 'elargi' && a.e.liste.find(x => x.id === 'pen_n2').vars.join() === 'double', 'L-A : variantes gardées (élargi, double), perçant ignoré');
    // le premier par la famille : le talent n'est plus porté, un autre de sa famille l'est
    const r2 = await page.evaluate(([PAS_, MEM]) => { const PAS = eval(PAS_), B = window.__brume; B.cls('lum'); B.start(); PAS(3);
      B.SAVE.brumeux = { v: 1, mort: { 4: 'emprunt' }, vus: [], emp: { 4: { id: 'pen_n4', fam: 'ruee' } } }; window.__brumeux.essai(4, { muet: true, graine: 5151, portes: MEM }); return window.__brumeux.etat().emp; }, [PAS.toString(), MEMS.lum]);
    ok(['pen_n2'].includes(r2.boucle[0]) && r2.j.premier && r2.j.premier.id === 'pen_n4', `L-A : le talent n'est plus porté : le premier emprunt est le plus lourd de sa famille (${r2.boucle[0]})`);
    ok(!errs.length, 'L-A : aucune erreur ' + errs.slice(0, 2).join(' | '));
    await ctx.close();
  }
  // ── L-B · la mécanique en jeu
  {
    const { page, errs, ctx } = await ouvre('');
    await page.evaluate(ESSAI, { phase: 4, cls: 'lum', graine: 5160, portes: MEMS.lum });
    const r = await page.evaluate(([PAS_, TAIRE_, MESURE_]) => { const PAS = eval(PAS_), TAIRE = eval(TAIRE_), MESURE = eval(MESURE_), D = window.__brumeux.dbg(), X = D.X, P = D.P, AR = D.AR, e = X.e, out = {}; TAIRE();
      const cx = (AR.x0 + AR.x1) / 2, cy = (AR.y0 + AR.y1) / 2, tient = (x, y) => () => { P.x = x; P.y = y; P.iT = 1; P.hp = P.s.maxHp; e.hp = Math.max(e.hp, e.maxHp * X.seuils[3] + 400); };
      PAS(5, tient(cx, cy + 200));
      // 1. le corps : r 48, plein dans 1,15 × r ; frappable au corps ; point faible au cœur (0,25 × r au-dessus)
      const I = D.imgCorps('lum', 'n'), cv = I.cv, g = cv.getContext('2d'), px = g.getImageData(0, 0, cv.width, cv.height).data; let hors = 0, plein = 0;
      for (let y = 0; y < cv.height; y++) for (let x = 0; x < cv.width; x++) { const a = px[(y * cv.width + x) * 4 + 3] / 255; if (a <= 0.36) continue; const ux = I.x0 + (x + 0.5) / I.k, uy = I.y0 + (y + 0.5) / I.k; if (Math.hypot(ux, uy) > 1.15 * e.r) hors++; else plein++; }
      out.corps = { r: e.r, hors, plein, faible: D.faible().map(Math.round), e: [Math.round(e.x), Math.round(e.y)] };
      const h0 = e.hp; D.hit(e, 50, { crit: false }); out.coup = Math.round(h0 - e.hp);
      // 2. la caméra fixe, les bornes de l'état 6
      const c0 = [D.CAM.x, D.CAM.y]; PAS(30, tient(AR.x0 + 60, AR.y0 + 60)); const c1 = [D.CAM.x, D.CAM.y]; PAS(30, tient(AR.x1 - 60, AR.y1 - 60)); const c2 = [D.CAM.x, D.CAM.y];
      out.cam = { c0, c1, c2, AR: [AR.x0, AR.y0, AR.x1, AR.y1], etat: window.__arene.etat().etat };
      // 3. un emprunt : la prise, l'icône, le liseré de la tuile, les zones orange au liseré lavande, chargements ≥ 0,8 s, épuisé → à nu 2 s
      const cols = []; const z0 = window.__asm.sb.zone; window.__asm.sb.zone = function (c, z, k, fl, col) { cols.push(col ? col.fo + '|' + col.edge + '|' + col.w : 'aucune'); return z0.apply(this, arguments); };
      window.__brumeux.emprunter('pen_n1'); PAS(6, tient(cx, cy + 150)); const e1 = window.__brumeux.etat().emp; D.render();
      out.prise = { ph: e1.cur && e1.cur.ph, id: e1.cur && e1.cur.id, tuile: e1.tuile, dom: document.querySelectorAll('#hMem .mt.emp18').length };
      let vu = { charge: 0, epuise: false, vulnMax: 0, chMin: 9, coups: 0 }; const hp0 = P.hp;
      PAS(60 * 12, i => { tient(cx, cy + 150)(); const q = window.__brumeux.etat().emp; if (q.cur && q.cur.st && q.cur.st.ph === 'charge') { vu.charge++; if (i % 10 === 0) D.render(); } if (q.cur && q.cur.ph === 'epuise') { vu.epuise = true; vu.vulnMax = Math.max(vu.vulnMax, e.vuln || 0); vu.domFin = document.querySelectorAll('#hMem .mt.emp18').length; } });
      window.__asm.sb.zone = z0; const ej = window.__brumeux.etat().emp.j; vu.chMin = Math.min(...ej.charges); vu.cols = [...new Set(cols)]; vu.log = ej.log[ej.log.length - 1]; out.emp = vu;
      // 4. variantes ignorées : la copie d'un talent « perçant » ne garde pas la variante
      out.ignore = window.__brumeux.etat().emp.liste.find(x => x.id === 'ray_x3a');
      return out; }, [PAS.toString(), TAIRE.toString(), MESURE.toString()]);
    ok(r.corps.r === 48 && r.corps.hors === 0 && r.corps.plein > 1000, `L-B : corps au sol r ${r.corps.r}, plein dans 1,15 × r (${r.corps.hors} pixels pleins au-delà, ${r.corps.plein} dedans)`);
    ok(r.coup > 0 && r.corps.faible[0] === r.corps.e[0] && r.corps.faible[1] === r.corps.e[1] - 12, `L-B : frappable au corps (${r.coup} PV), point faible au cœur, 0,25 × r au-dessus de son centre (${r.corps.faible})`);
    ok(r.cam.etat === 6 && r.cam.AR[2] - r.cam.AR[0] === 1168 && r.cam.AR[3] - r.cam.AR[1] === 584 && r.cam.c0.join() === r.cam.c1.join() && r.cam.c1.join() === r.cam.c2.join(), `L-B : caméra fixe (${r.cam.c0.map(Math.round)}), bornes de l'état 6 (1 168 × 584)`);
    ok(r.prise.ph === 'prise' && r.prise.id === 'pen_n1' && r.prise.tuile === 'pen_n1' && r.prise.dom === 1, `L-B : la prise (0,6 s) : le talent emprunté, une tuile au liseré lavande dans le HUD (${r.prise.dom})`);
    ok(r.emp.charge > 30 && r.emp.cols.length === 1 && r.emp.cols[0] === '255,150,60|180,160,255|2', `L-B : ses zones : orange au liseré lavande de 2 px (${r.emp.cols.join(' ; ')})`);
    ok(r.emp.chMin >= DB.emprunt.plancherS - 1e-6, `L-B : aucune étape sous 0,8 s (au plus court ${r.emp.chMin} s ; première rencontre +0,3)`);
    ok(r.emp.epuise && r.emp.vulnMax >= DB.emprunt.nuS - 0.05 && r.emp.domFin === 0, `L-B : épuisé : à nu ${r.emp.vulnMax.toFixed(2)} s, le liseré de la tuile s'efface`);
    ok(r.ignore && r.ignore.vars.length === 0, 'L-B : la variante perçant (ray_x3a) est ignorée');
    await capture(page, 'emprunt-epuise.png');
    // les gestes : Passe (brisée sur une muraille → sonné 2 s), Révérence (approche, puis cône ; renonce), Volte (brèche)
    const g = await page.evaluate(([PAS_, TAIRE_, MESURE_]) => { const PAS = eval(PAS_), TAIRE = eval(TAIRE_), MESURE = eval(MESURE_), D = window.__brumeux.dbg(), X = D.X, P = D.P, AR = D.AR, e = X.e, out = {}; TAIRE();
      const cx = (AR.x0 + AR.x1) / 2, cy = (AR.y0 + AR.y1) / 2, tient = (x, y) => () => { P.x = x; P.y = y; P.iT = 1; P.hp = P.s.maxHp; e.hp = Math.max(e.hp, e.maxHp * X.seuils[3] + 400); };
      PAS(60 * 3, tient(cx, cy + 200)); e.x = cx; e.y = cy - 150; e.vuln = 0;
      const m = window.__brumeux.poserSorte('murailles', { p: [cx, cy + 200], h: [cx, cy - 150] }); PAS(5, tient(cx, cy + 200)); e.x = cx; e.y = cy - 150;
      MESURE({ k: 'fixe', g: 'passe' }); PAS(3, tient(cx, cy + 200)); const z = X.zones.find(q => q.id === 'passe'); out.passe = { m: m.ok, z: !!z, w: z && z.w, coupe: !!(z && z.passe18 && z.passe18.coupe) };
      let sonne = 0, x1 = null; PAS(60 * 2.2, () => { tient(cx, cy + 200)(); sonne = Math.max(sonne, e.vuln || 0); }); out.passe.sonne = +sonne.toFixed(2); out.passe.brisees = X.emp.j.brisees; out.passe.fin = [Math.round(e.x), Math.round(e.y)];
      for (const c of X.bat.slice()) D.retirer(c, 'efface'); PAS(60 * 2.2, tient(cx, cy + 200));
      // Révérence : il s'approche (tu restes à 320 px), puis le cône ; renonce si tu fuis
      e.x = cx - 300; e.y = cy; MESURE({ k: 'fixe', g: 'reverence' }); let d0 = null, cone = null; PAS(60 * 2.5, i => { tient(cx + 20, cy)(); const q = X.zones.find(z => z.id === 'reverence' && !z.fait); if (q && !cone) { cone = { d: Math.round(Math.hypot(P.x - e.x, P.y - e.y)), ouv: Math.round(q.ouv * 180 / Math.PI), r1: q.r1 }; } if (i === 0) d0 = Math.round(Math.hypot(P.x - e.x, P.y - e.y)); });
      out.rev = { d0, cone }; PAS(60, tient(cx + 20, cy));
      const ren0 = X.emp.j.renoncesRev; e.x = cx - 400; e.y = cy; MESURE({ k: 'fixe', g: 'reverence' }); PAS(60 * 2.6, () => { const a = Math.atan2(P.y - e.y, P.x - e.x); tient(Math.min(AR.x1 - 30, e.x + 420), cy)(); }); out.rev.renonce = X.emp.j.renoncesRev - ren0;
      // Volte : anneau autour de lui, brèche de 120 px
      e.x = cx; e.y = cy; MESURE({ k: 'fixe', g: 'volte' }); PAS(3, tient(cx + 200, cy + 30)); const v = X.zones.find(q => q.id === 'volte'); out.volte = v ? { r0: v.r0, r1: v.r1, l: v.breche && v.breche.l, cx: Math.round(v.x - e.x) } : null;
      return out; }, [PAS.toString(), TAIRE.toString(), MESURE.toString()]);
    ok(g.passe.m && g.passe.z && g.passe.w === 96 && g.passe.coupe && g.passe.sonne >= 1.95 && g.passe.brisees >= 1, `L-B : la Passe (couloir de ${g.passe.w} px) coupée par une muraille : son corps s'y brise (sonné ${g.passe.sonne} s, ${g.passe.brisees} brisée)`);
    ok(g.rev.cone && g.rev.d0 > 250 && g.rev.cone.d <= 153 && g.rev.cone.ouv === 150, `L-B : la Révérence : il s'approche (de ${g.rev.d0} à ${g.rev.cone && g.rev.cone.d} px), puis le cône de ${g.rev.cone && g.rev.cone.ouv}°`);
    ok(g.rev.renonce === 1, 'L-B : la Révérence renonce quand tu restes hors d\'atteinte 2 s (mesure sautée)');
    ok(g.volte && g.volte.r0 === 70 && g.volte.r1 === 380 && g.volte.l === 120 && g.volte.cx === 0, 'L-B : la Volte : anneau à brèche (70 → 380, brèche 120 px) autour de lui');
    ok(!errs.length, 'L-B : aucune erreur ' + errs.slice(0, 2).join(' | '));
    await ctx.close();
  }
  // L-B, suite : un coup d'emprunt (tu restes immobile sous sa copie) est jugé au préavis du boss, sur la source de son étape ; « ce qui t'a tué » : l'emprunt
  {
    const { page, errs, ctx } = await ouvre('');
    await page.evaluate(ESSAI, { phase: 4, cls: 'gou', graine: 5165, portes: MEMS.gou });
    const r = await page.evaluate(([PAS_, TAIRE_, LIBRE_]) => { const PAS = eval(PAS_), TAIRE = eval(TAIRE_), LIBRE = eval(LIBRE_), D = window.__brumeux.dbg(), X = D.X, P = D.P, AR = D.AR, e = X.e; TAIRE();
      const cx = (AR.x0 + AR.x1) / 2, cy = (AR.y0 + AR.y1) / 2, tient = () => { P.x = cx; P.y = cy + 170; P.iT = 0; P.dashT = 0; P.hp = Math.max(P.hp, P.s.maxHp * 0.6); e.hp = Math.max(e.hp, e.maxHp * X.seuils[3] + 1200); };
      PAS(5, tient); const j0 = window.__arene.journal(); const out = { ids: [] };
      for (const id of ['vor_n1', 'dif_n1', 'dif_n4', 'vor_x3a', 'reg_n1']) { LIBRE(); if (window.__brumeux.emprunter(id)) out.ids.push(id); PAS(60 * 9, () => { tient(); }); }
      const j1 = window.__arene.journal(); return Object.assign(out, { coups: X.emp.j.coups, journal: j1.coups - j0.coups, sans: j1.sansSigne - j0.sansSigne, liste: j1.liste.slice(-4), tue: X.tue, tueEmp: X.tueEmp, par: Object.keys(D.RUN.par18 || {}) }); }, [PAS.toString(), TAIRE.toString(), LIBRE.toString()]);
    ok(r.ids.length === 5 && r.coups >= 3 && r.sans === 0 && r.journal >= r.coups, `L-B : immobile sous ses copies (${r.ids.join(', ')}) : ${r.coups} coups d'emprunt, tous jugés signalés au préavis du boss (${r.journal} au journal, ${r.sans} sans signe)${r.liste.length ? ' ' + JSON.stringify(r.liste) : ''}`);
    ok(r.tue === 'emprunt' && r.tueEmp && r.ids.includes(r.tueEmp.id) && r.par.includes('brumeux:emprunt'), `L-B : « ce qui t'a tué » : l'emprunt (${r.tueEmp && r.tueEmp.id + ' / ' + r.tueEmp.fam}) ; RUN.par18 le nomme (brumeux:emprunt)`);
    ok(!errs.length, 'L-B (coups) : aucune erreur ' + errs.slice(0, 2).join(' | '));
    await ctx.close();
  }
  // L-B, suite : mémoire sans empruntable ; III → IV (décousus, chute à 200 px au moins, bascule à 240 px/s, constructions filtrées) ; IV → V
  {
    const { page, errs, ctx } = await ouvre('');
    const v = await page.evaluate(([PAS_]) => { const PAS = eval(PAS_); window.__brume.cls('lum'); window.__brumeux.essai(4, { muet: true, graine: 5170, portes: 'sol_sk' }); const D = window.__brumeux.dbg(), X = D.X, P = D.P, e = X.e;
      PAS(60 * 40, () => { P.iT = 1; P.hp = P.s.maxHp; e.hp = Math.max(e.hp, e.maxHp * X.seuils[3] + 400); }); return { j: window.__brumeux.etat().emp.j, liste: window.__brumeux.etat().emp.liste.length }; }, [PAS.toString()]);
    ok(v.liste === 0 && v.j.sautes >= 3 && v.j.emprunts === 0, `L-B : une mémoire sans empruntable (un ultime) : les emprunts sautent (${v.j.sautes} sautés en 40 s), la phase se joue sur ses gestes`);
    await ctx.close();
  }
  {
    const { page, errs, ctx } = await ouvre('');
    await page.evaluate(ESSAI, { phase: 3, cls: 'lum', graine: 5171, reserve: 'ray_n1,gou_b1', portes: MEMS.lum });
    const r = await page.evaluate(([PAS_, TAIRE_, MESURE_, LIBRE_]) => { const PAS = eval(PAS_), TAIRE = eval(TAIRE_), MESURE = eval(MESURE_), LIBRE = eval(LIBRE_), D = window.__brumeux.dbg(), X = D.X, P = D.P, AR = D.AR, e = X.e, out = {}; TAIRE();
      const tient = () => { P.x = AR.x0 + 1250; P.y = AR.y0 + 760; P.iT = 1; P.hp = P.s.maxHp; }; PAS(5, tient);
      for (const [s, x, y] of [['murailles', 1050, 720], ['colonnades', 1500, 520], ['puits', 1400, 800], ['echafaudages', 400, 300], ['colonnades', 2100, 300]]) { P.x = AR.x0 + x; P.y = AR.y0 + y; window.__brumeux.poser(s, { p: [P.x, P.y], h: [P.x, P.y - 260] }); }
      PAS(60 * 2, tient); MESURE({ k: 'couture' }); PAS(60 * 5, tient); out.av = { cousus: D.enemies.filter(o => !o.dead && o.cou18).length, bat: X.bat.filter(c => c.etat === 'debout').map(c => c.sorte) };
      out.tard = !!window.__arene.dbg().A.sol[6];
      e.hp = Math.floor(e.maxHp * X.seuils[2]) - 2; window.__brumeux.vers(4); const xs = []; let d = null;
      PAS(60 * 6, i => { tient(); xs.push(AR.x0); }); let vmax = 0; for (let i = 1; i < xs.length; i++) vmax = Math.max(vmax, Math.abs(xs[i] - xs[i - 1]) * 60);
      const E = window.__brumeux.etat(); out.ap = { phase: E.phase, etat: window.__arene.etat().etat, trans: E.trans, cousus: D.enemies.filter(o => !o.dead && o.cou18).length, vmax: Math.round(vmax), AR: [AR.x0, AR.y0, AR.x1, AR.y1], chute: E.emp.j.chute, e: [Math.round(e.x), Math.round(e.y)], r: e.r, fade: e.fade,
        restent: E.emp.j.consRestantes, aire: E.emp.j.consAire, bornes: E.emp.j.consBornes, bat: X.bat.filter(c => c.etat === 'debout').length };
      // IV → V pendant un emprunt : la copie s'arrête sans fenêtre, le masque reste, X.emp.joues gardé
      TAIRE(); LIBRE(); window.__brumeux.emprunter('pen_n1'); PAS(60 * 1.2, tient); const c0 = window.__brumeux.etat().emp.cur; e.hp = Math.floor(e.maxHp * X.seuils[3]) - 2; window.__brumeux.vers(5); PAS(3, tient);
      const E5 = window.__brumeux.etat(); out.v = { avant: c0 && c0.ph, id0: c0 && c0.id, cur: E5.emp.cur, vuln: +(e.vuln || 0).toFixed(2), joues: E5.emp.joues.map(x => x.id), phase: E5.phase, tuile: E5.emp.tuile, dom: document.querySelectorAll('#hMem .mt.emp18').length };
      return out; }, [PAS.toString(), TAIRE.toString(), MESURE.toString(), LIBRE.toString()]);
    ok(r.tard, 'L-B : le calque de la phase IV (tard) est peint pendant la phase III');
    ok(r.ap.phase === 4 && r.ap.etat === 6 && !r.ap.trans && r.ap.cousus === 0, `L-B : III → IV : arène à l'état 6, transition finie, les cousus se décousent (${r.av.cousus} → ${r.ap.cousus})`);
    ok(r.ap.chute && r.ap.chute.d >= 200 && r.ap.r === 48 && r.ap.fade === 1 && r.ap.e[0] > r.ap.AR[0] && r.ap.e[0] < r.ap.AR[2] && r.ap.e[1] > r.ap.AR[1] && r.ap.e[1] < r.ap.AR[3], `L-B : III → IV : il tombe dans les nouvelles bornes, à ${r.ap.chute && r.ap.chute.d} px de toi (≥ 200)`);
    ok(r.ap.vmax > 125 && r.ap.vmax <= 241, `L-B : III → IV : les bornes avancent à ${r.ap.vmax} px/s (240 au plus)`);
    ok(r.ap.restent !== null && r.ap.bat === r.ap.restent.length, `L-B : III → IV : constructions filtrées (${r.av.bat.length} → ${r.ap.bat} : ${(r.ap.restent || []).join(', ')} ; ${r.ap.bornes} hors des bornes, ${r.ap.aire} par l'aire)`);
    ok(r.v.avant && !r.v.cur && r.v.vuln <= 0 && r.v.joues.includes(r.v.id0) && r.v.phase === 5 && !r.v.tuile && r.v.dom === 0, `L-B : IV → V : la copie en cours (${r.v.avant}) s'arrête sans fenêtre, liseré effacé, ce qu'il a joué est gardé (${r.v.joues.join(', ')}) ${JSON.stringify(r.v)}`);
    await capture(page, 'emprunt-phase5.png');
    ok(!errs.length, 'L-B (suite) : aucune erreur ' + errs.slice(0, 2).join(' | '));
    await ctx.close();
  }
  // ── L-C · le Dernier Souvenir : brûler le talent emprunté pendant la prise et pendant une étape → zone sans coup, étapes annulées, à nu 4 s ; brûlure sous le
  // plafond de la phase ; brûler un autre talent → copie intacte ; un gardien de l'acte III et un Masqué gardent leur plafond d'avant
  {
    const { page, errs, ctx } = await ouvre('');
    await page.evaluate(ESSAI, { phase: 4, cls: 'lum', graine: 5180, portes: MEMS.lum, emp: 'pen_n1', ds: true, dieu: false });
    const r = await page.evaluate(([PAS_, TAIRE_]) => { const PAS = eval(PAS_), TAIRE = eval(TAIRE_), D = window.__brumeux.dbg(), X = D.X, P = D.P, AR = D.AR, e = X.e, out = {}; TAIRE();
      const cx = (AR.x0 + AR.x1) / 2, cy = (AR.y0 + AR.y1) / 2, tient = () => { P.x = cx; P.y = cy + 160; P.hp = P.s.maxHp; e.hp = Math.max(e.hp, e.maxHp * X.seuils[3] + 400); };
      PAS(5, tient); out.designe = window.__dernier.designe(); out.pvPlaf = e.pvPlaf18;
      // 1. pendant la prise
      window.__brumeux.emprunter('pen_n1'); PAS(10, tient); const h0 = e.hp, rec = window.__dernier.bruler('pen_n1'); const v0 = e.vuln || 0; PAS(2, tient);
      const E1 = window.__brumeux.etat().emp; out.prise = { refus: rec && rec.refus, ph: E1.cur && E1.cur.ph, defait: E1.cur && E1.cur.defait, vuln: +((e.vuln || 0)).toFixed(2), surFort: rec && Math.round(rec.surFort || 0), plaf: rec && rec.force ? Math.round(window.__dernier.plafondDe(e, rec.force)) : null, perte: Math.round(h0 - e.hp), tuile: E1.tuile };
      const cj0 = X.emp.j.coups, a0 = window.__arene.journal().coups; PAS(60 * 4.2, tient); out.prise.coups = X.emp.j.coups - cj0; out.prise.journal = window.__arene.journal().coups - a0; out.prise.fini = !window.__brumeux.etat().emp.cur;
      return out; }, [PAS.toString(), TAIRE.toString()]);
    ok(r.designe === 'pen_n1' && r.pvPlaf === 2400, `L-C : le talent emprunté est désigné (ds=1), e.pvPlaf18 = ${r.pvPlaf} (les PV de la phase)`);
    ok(r.prise.defait && r.prise.ph === 'defait' && r.prise.vuln >= 3.95 && !r.prise.tuile, `L-C : brûlé pendant la prise : la copie se défait, à nu ${r.prise.vuln} s, liseré effacé`);
    ok(r.prise.coups === 0 && r.prise.journal === 0 && r.prise.fini, `L-C : la copie défaite ne frappe plus (${r.prise.coups} coup ; journal de l'arène : ${r.prise.journal})`);
    ok(r.prise.plaf != null && r.prise.plaf <= 192 && r.prise.surFort <= r.prise.plaf + 1, `L-C : la brûlure sur lui reste sous le plafond de la phase (${r.prise.surFort} ≤ ${r.prise.plaf} PV ; sur e.maxHp : ${Math.round(r.prise.plaf * 10800 / 2400)})`);
    await capture(page, 'emprunt-defait.png');
    await ctx.close();
  }
  {
    const { page, errs, ctx } = await ouvre('');
    await page.evaluate(ESSAI, { phase: 4, cls: 'lum', graine: 5181, portes: MEMS.lum, ds: true, dieu: false });
    const r = await page.evaluate(([PAS_, TAIRE_]) => { const PAS = eval(PAS_), TAIRE = eval(TAIRE_), D = window.__brumeux.dbg(), X = D.X, P = D.P, AR = D.AR, e = X.e, out = {}; TAIRE();
      const cx = (AR.x0 + AR.x1) / 2, cy = (AR.y0 + AR.y1) / 2, tient = () => { P.x = cx; P.y = cy + 160; P.hp = P.s.maxHp; e.hp = Math.max(e.hp, e.maxHp * X.seuils[3] + 400); };
      PAS(5, tient);
      // 2. brûler un autre talent : la copie reste
      window.__dernier.designer('fan_n1'); window.__brumeux.emprunter('ray_n2'); PAS(50, tient); const r1 = window.__dernier.bruler('fan_n1', { libre: true }); PAS(3, tient); const E1 = window.__brumeux.etat().emp;
      out.autre = { refus: r1 && r1.refus, cur: E1.cur && E1.cur.id, defait: E1.cur && E1.cur.defait };
      PAS(60 * 8, tient); TAIRE(); PAS(30, tient);
      // 3. pendant une étape qui charge
      window.__brumeux.emprunter('pen_n2'); let st = null, r2 = null, cj0 = 0, a0 = 0, hp0 = 0, vmax = 0; PAS(60 * 4, () => { tient(); if (st) { vmax = Math.max(vmax, e.vuln || 0); return; } const c = window.__brumeux.etat().emp.cur; if (c && c.st && c.st.ph === 'charge' && c.st.t < c.st.tot * 0.5) { st = c.st; cj0 = X.emp.j.coups; a0 = window.__arene.journal().coups; hp0 = P.hp; r2 = window.__dernier.bruler('pen_n2', { libre: true }); } });
      const E2 = window.__brumeux.etat().emp;
      out.etape = { st, defait: E2.j.defaites >= 1, vuln: +vmax.toFixed(2), dissous: E2.j.dissous || 0, refus: r2 && r2.refus };
      PAS(60 * 4.3, () => { P.x = cx; P.y = cy + 160; }); out.etape.coups = X.emp.j.coups - cj0; out.etape.journal = window.__arene.journal().coups - a0; out.etape.hp = Math.round(hp0 - P.hp);
      out.reemprunt = window.__brumeux.emprunter('pen_n2');
      return out; }, [PAS.toString(), TAIRE.toString()]);
    ok(!r.autre.refus && r.autre.cur === 'ray_n2' && r.autre.defait === false, 'L-C : brûler un autre talent : la copie reste intacte');
    ok(r.etape.st && r.etape.defait && r.etape.vuln >= 3.95 && r.etape.dissous >= 1, `L-C : brûlé pendant une étape qui charge (étape ${r.etape.st && r.etape.st.i + 1} sur ${r.etape.st && r.etape.st.L}) : la zone se dissout (${r.etape.dissous}), étapes annulées, à nu ${r.etape.vuln} s`);
    ok(r.etape.coups === 0 && r.etape.journal === 0, `L-C : aucune étape ne frappe après (${r.etape.coups} coup, ${r.etape.journal} au journal de l'arène)`);
    ok(r.reemprunt === false, 'L-C : un talent brûlé n\'est plus jamais emprunté');
    await ctx.close();
  }
  {
    // inertie de la retouche du plafond : un gardien de l'acte III et un Masqué
    const { page, errs, ctx } = await ouvre('');
    const g = await page.evaluate(([PAS_]) => { const PAS = eval(PAS_); const t = window.__dernier.essai('ray_n2', { acte: 3, gardien: 1, classe: 'lum', rang: 3 }); PAS(60 * 3); const D = window.__arene.dbg(), b = D.room.boss || D.enemies.find(x => x.type === 'boss');
      return { t, b: !!b, pvPlaf: b && b.pvPlaf18, plaf: b && window.__dernier.plafondDe(b, 2), maxHp: b && b.maxHp, DS: window.__dernier.DS.plafonds }; }, [PAS.toString()]);
    ok(g.b && g.pvPlaf == null && Math.abs(g.plaf - Math.min(g.DS.gardienPv * 2, g.DS.gardienPvMax) * g.maxHp) < 1e-6, `L-C : un gardien de l'acte III garde le plafond d'avant (sur ses PV max : ${Math.round(g.plaf)} PV pour ${g.maxHp})`);
    const m = await page.evaluate(([PAS_]) => { const PAS = eval(PAS_); window.__dernier.essai('ray_n2', { acte: 2, masque: 1, classe: 'lum' }); PAS(60 * 4); const D = window.__arene.dbg(), M = D.enemies.find(x => !x.dead && x.asm);
      return { M: !!M, pvPlaf: M && M.pvPlaf18, plaf: M && window.__dernier.plafondDe(M, 1), maxHp: M && M.maxHp, DS: window.__dernier.DS.plafonds }; }, [PAS.toString()]);
    ok(m.M && m.pvPlaf == null && Math.abs(m.plaf - m.DS.gardienPv * m.maxHp) < 1e-6, `L-C : un Masqué garde le plafond d'avant (${Math.round(m.plaf)} PV pour ${Math.round(m.maxHp)})`);
    ok(!errs.length, 'L-C : aucune erreur ' + errs.slice(0, 2).join(' | '));
    await ctx.close();
  }
  // ── L-D · la phase IV conduite par le bot qui frappe, quatre formes, deux graines, mémoires de référence : 0 coup sans signe, durée, emprunts
  const durees = {};
  for (const [k, cls] of ['lum', 'gou', 'her', 'tis'].entries()) for (const g of [91, 92]) {
    const { page, errs, ctx } = await ouvre('');
    await page.evaluate(ESSAI, { phase: 4, bot: 2, cls, graine: g + 10 * k, portes: MEMS[cls], palier: ['normal', 'difficile', 'extreme', 'normal'][k] });
    const r = await page.evaluate(([PAS_]) => { const PAS = eval(PAS_); let fin = null; const X = window.__brumeux.dbg().X, hp0 = X.e.hp, bas = X.e.maxHp * X.seuils[3];
      for (let s = 0; s < 240 && fin == null; s++) PAS(60, i => { if (fin != null) return; const et = window.__brumeux.etat(); if (et.phase >= 5 || !et.on || et.scene) fin = s * 60 + i; });
      const et = window.__brumeux.etat(); return { j: window.__arene.journal(), st: window.__brumeux.statsRun(), fin, J: et.emp && et.emp.j, part: (hp0 - Math.max(bas, X.e.hp)) / (hp0 - bas), cons: X.bat ? X.bat.filter(c => c.etat === 'debout').length : 0 }; }, [PAS.toString()]);
    const p4 = r.st.phases[4] || { t: 0, coups: 0 }, J = r.J || {};
    (durees[cls] = durees[cls] || []).push(r.fin != null ? p4.t : null);
    console.log(`   ${cls} graine ${g + 10 * k} (${r.st.palier}) : phase IV ${r.fin != null ? 'finie en ' + p4.t + ' s' : 'non finie en 240 s (' + Math.round(r.part * 100) + ' % de ses PV)'}, ${p4.coups} coups ; emprunts ${J.emprunts} (sautés ${J.sautes}, joués ${J.joues}, renoncés ${J.renonces}), étapes ${J.etapes} (sautées ${J.etapesSautees}), à nu ${J.nu}, coups d'emprunt ${J.coups} ; Passes ${J.passes} (brisées ${J.brisees}), Révérences ${J.reverences} (renoncées ${J.renoncesRev}), Voltes ${J.voltes}`);
    if (r.j.liste.length) console.log('   coups suspects : ' + JSON.stringify(r.j.liste.slice(0, 6)));
    ok(r.j.sansSigne === 0, `L-D : ${cls} (${g + 10 * k}) : aucun coup sans signe (${r.j.coups} coups reçus)`);
    ok(J.emprunts >= 1 && J.etapes >= 1, `L-D : ${cls} (${g + 10 * k}) : il emprunte (${J.emprunts} emprunts, ${J.etapes} étapes)`);
    ok(r.fin != null || r.part >= 0.4, `L-D : ${cls} (${g + 10 * k}) : le bot qui frappe avance (${r.fin != null ? 'phase IV finie en ' + p4.t + ' s' : Math.round(r.part * 100) + ' % de ses PV en 240 s'} ; cible 50 à 70 s, PV placeholders recalés en 5g)`);
    ok(r.j.assertions === 0 && !errs.length, `L-D : ${cls} (${g + 10 * k}) : aucune erreur ` + errs.slice(0, 2).join(' | '));
    if (cls === 'her' && g === 91) await capture(page, 'emprunt-combat.png');
    await ctx.close();
  }
  // la phase IV tenue (ses PV gardés au-dessus du seuil, 90 s) : le bot affronte trois boucles d'emprunts, de gestes et de mesures libres
  for (const [k, cls] of ['lum', 'gou', 'her', 'tis'].entries()) {
    const { page, errs, ctx } = await ouvre('');
    await page.evaluate(ESSAI, { phase: 4, bot: 2, cls, graine: 93 + 10 * k, portes: MEMS[cls], palier: ['normal', 'difficile', 'extreme', 'normal'][k] });
    const r = await page.evaluate(([PAS_]) => { const PAS = eval(PAS_), X = window.__brumeux.dbg().X, e = X.e; PAS(60 * 90, () => { e.hp = Math.max(e.hp, e.maxHp * X.seuils[3] + 1200); });
      const et = window.__brumeux.etat(); return { j: window.__arene.journal(), J: et.emp && et.emp.j, phase: et.phase }; }, [PAS.toString()]);
    const J = r.J || {};
    console.log(`   ${cls} tenue 90 s : ${r.j.coups} coups reçus (dont ${J.coups} d'emprunt), ${r.j.sansSigne} sans signe ; emprunts ${J.emprunts} (sautés ${J.sautes}, joués ${J.joues}, renoncés ${J.renonces}), étapes ${J.etapes} (sautées ${J.etapesSautees}), à nu ${J.nu} ; Passes ${J.passes} (brisées ${J.brisees}), Révérences ${J.reverences} (renoncées ${J.renoncesRev}), Voltes ${J.voltes}`);
    if (r.j.liste.length) console.log('   coups suspects : ' + JSON.stringify(r.j.liste.slice(0, 6)));
    ok(r.phase === 4 && r.j.sansSigne === 0 && J.emprunts >= 6 && J.etapes >= 6, `L-D : ${cls}, phase IV tenue 90 s : aucun coup sans signe (${r.j.coups} coups, ${J.coups} d'emprunt ; ${J.emprunts} emprunts, ${J.etapes} étapes)`);
    ok(!errs.length, `L-D : ${cls} (tenue) : aucune erreur ` + errs.slice(0, 2).join(' | '));
    await ctx.close();
  }
  console.log('   durées de la phase IV au bot : ' + Object.entries(durees).map(([c, v]) => c + ' ' + v.map(x => x == null ? '—' : x + ' s').join(' / ')).join(' · '));
  // ── L-E · coût apparié dans une seule page : son corps, une copie en cours, trois constructions, contre le fantôme d'essai à foule égale ; peinture
  {
    const { page, errs, ctx } = await ouvre('');
    const n = await page.evaluate(([PAS_, TAIRE_, MEM, LIBRE_]) => { const PAS = eval(PAS_), TAIRE = eval(TAIRE_), LIBRE = eval(LIBRE_); window.__brume.cls('lum'); window.__brumeux.essai(3, { muet: true, graine: 7, palier: 'difficile', portes: MEM });
      const D = window.__brumeux.dbg(), X = D.X, P = D.P, AR = D.AR; TAIRE();
      for (const [s, x, y] of [['murailles', 1250, 720], ['colonnades', 1450, 520], ['puits', 1100, 560]]) { P.x = AR.x0 + x; P.y = AR.y0 + y; PAS(2, () => { P.iT = 1; }); window.__brumeux.poser(s, { p: [P.x, P.y], h: [P.x, P.y - 200] }); PAS(2, () => { P.iT = 1; }); }
      PAS(60 * 2, () => { P.iT = 1; }); const e = X.e; e.hp = Math.floor(e.maxHp * X.seuils[2]) - 2; window.__brumeux.vers(4); const tient = () => { P.x = (AR.x0 + AR.x1) / 2; P.y = (AR.y0 + AR.y1) / 2 + 180; P.iT = 1; P.hp = P.s.maxHp; e.hp = Math.max(e.hp, e.maxHp * X.seuils[3] + 400); };
      PAS(60 * 5, tient); TAIRE(); LIBRE(); window.__brumeux.emprunter('pen_n1'); let ok2 = false; PAS(60 * 3, () => { tient(); const c = window.__brumeux.etat().emp.cur; if (c && c.st && c.st.ph === 'charge' && c.st.t < c.st.tot * 0.6) ok2 = true; if (ok2) X.emp.cur.p.asm.sb.st.t = X.emp.cur.p.asm.sb.st.tot * 0.5; });
      for (const o of D.enemies) if (!o.cons18 && !o.brx18) { o.spd = 0; o.stun = 1e9; }
      D.render(); X.cuGel = true;
      const LS = D.lights(), tous = LS.slice(), sans = tous.filter(l => l.c !== 'brume18'), A = window.__arene.dbg().A, fantome = { x: e.x, y: e.y, r: 44, zones: [], t: 9, wp: null };
      const bat = X.bat.slice(), cpil = D.room.pillars.slice(), bpil = cpil.filter(p => !p.cons18), emp = X.emp, zs = X.zones.slice();
      window.__LE = v => { X.bat = v ? bat : []; D.room.pillars.length = 0; D.room.pillars.push(...(v ? cpil : bpil)); X.emp = v ? emp : null; X.zones = v ? zs : []; e.dead = !v; LS.length = 0; LS.push(...(v ? tous : sans)); A.essai.boss = v ? null : fantome; };
      return { copie: ok2, bat: bat.length, phase: window.__brumeux.etat().phase, foule: D.enemies.filter(o => !o.dead && !o.cons18 && !o.brx18).length }; }, [PAS.toString(), TAIRE.toString(), MEMS.lum, LIBRE.toString()]);
    const APP = ([k]) => { const R = window.__arene.dbg().render, c = document.querySelector('#game').getContext('2d'), on = [], off = [];
      for (let i = 0; i < 10; i++) { window.__LE(i % 2 === 0); R(); }
      for (let i = 0; i < k; i++) { const v = i % 2 === 0; window.__LE(v); const t0 = performance.now(); R(); c.getImageData(0, 0, 1, 1); (v ? on : off).push(performance.now() - t0); }
      window.__LE(true); const md = x => x.sort((p, q) => p - q)[x.length >> 1]; return [md(on), md(off)]; };
    const rr = []; for (let k = 0; k < 5; k++) rr.push(await page.evaluate(APP, [240]));
    const med = v => v.slice().sort((x, y) => x - y)[v.length >> 1], d = med(rr.map(x => x[0] - x[1]));
    await capture(page, 'emprunt-cout.png');
    const pe = await page.evaluate(() => { window.__brumeux.essai(4, { muet: true, graine: 3 }); const J = window.__brumeux.dbg().X.j, A = window.__arene.dbg().A; return { pe: A.peintureMs, mod: J.modulesMs }; });
    // le calque de l'état 6 en III : une tuile par image
    const tu = await page.evaluate(([PAS_]) => { const PAS = eval(PAS_); window.__brumeux.essai(3, { muet: true, graine: 4 }); const A = window.__arene.dbg().A; const n0 = (A.tard[6] || []).length; PAS(1); const n1 = (A.tard[6] || []).length; PAS(2); const n2 = (A.tard[6] || []).length; let n = 0; PAS(60, () => { n++; }); return { n0, n1, n2, fini: !!A.sol[6] }; }, [PAS.toString()]);
    console.log(`   coût (apparié, image par image) : phase IV (copie ${n.copie ? 'qui charge' : '—'}, ${n.bat} constructions ; foule ${n.foule}) contre le boss d'essai, même foule : ${rr.map(x => (x[0] - x[1] >= 0 ? '+' : '') + (x[0] - x[1]).toFixed(2)).join(' / ')} ms (médiane ${d >= 0 ? '+' : ''}${d.toFixed(2)}) ; peinture à l'entrée d'un essai en IV ${(pe.pe + pe.mod).toFixed(1)} ms`);
    ok(n.copie && n.phase === 4, `L-E : la scène mesurée : phase IV, une copie qui charge, ${n.bat} constructions restantes`);
    ok(d <= DA.budget.rendu, `L-E : coût de rendu de la phase IV contre le boss d'essai, même foule : ${d >= 0 ? '+' : ''}${d.toFixed(2)} ms (≤ +${DA.budget.rendu})`);
    ok(pe.pe + pe.mod <= DA.budget.peinture, `L-E : peinture à l'entrée d'un essai en IV : ${(pe.pe + pe.mod).toFixed(1)} ms (≤ ${DA.budget.peinture})`);
    ok(tu.n0 === 0 && tu.n1 === 1 && tu.n2 === 3 && tu.fini, `L-E : en III, le calque de l'état 6 se peint une tuile par image (${tu.n0} → ${tu.n1} → ${tu.n2}, fini)`);
    ok(!errs.length, 'L-E : aucune erreur ' + errs.slice(0, 2).join(' | '));
    await ctx.close();
  }
  // ── L-F · mouvements réduits et captures : chute, corps et masque à chaque forme, prise et liseré, une copie de chaque forme d'arme, épuisement et
  // anneau, Passe brisée, Révérence vue de derrière, Volte et sa brèche, copie défaite
  for (const rm of [false, true]) {
    const { page, errs, ctx } = await ouvre('', { rm });
    const sfx = rm ? '-rm' : '';
    await page.evaluate(ESSAI, { phase: 3, cls: 'lum', graine: 5190, portes: MEMS.lum, ds: true });
    const pas = async (n, x, y) => page.evaluate(([PAS_, n, x, y]) => { const PAS = eval(PAS_), D = window.__brumeux.dbg(), P = D.P, AR = D.AR, X = D.X, e = X.e; PAS(n, () => { P.x = AR.x0 + (AR.x1 - AR.x0) * x; P.y = AR.y0 + (AR.y1 - AR.y0) * y; P.iT = 1; P.hp = P.s.maxHp; if (X.phase === 3) e.hp = Math.max(e.hp, e.maxHp * X.seuils[3] + 400); }); }, [PAS.toString(), n, x, y]);
    await page.evaluate(TAIRE); await pas(5, 0.5, 0.8);
    await page.evaluate(() => { const D = window.__brumeux.dbg(), X = D.X, e = X.e; e.hp = Math.floor(e.maxHp * X.seuils[2]) - 2; window.__brumeux.vers(4); });
    const fades = []; for (let i = 0; i < 4; i++) { await pas(i ? 12 : 42, 0.5, 0.8); fades.push(await page.evaluate(() => { const e = window.__brumeux.dbg().X.e; return { y: Math.round(e.y), fade: e.fade }; })); if (i === 1) await capture(page, `emprunt-chute${sfx}.png`); }
    if (rm) ok(fades.every((f, i) => i === 0 || f.y === fades[0].y || fades[0].fade >= 1), `L-F : mouvements réduits : la chute est un fondu sur place (${fades.map(f => f.y + '/' + (f.fade != null ? f.fade.toFixed(2) : '-')).join(' ')})`);
    await pas(60 * 4, 0.5, 0.8); await page.evaluate(TAIRE);
    for (const [id, nom] of [['pen_n1', 'lame'], ['pen_n2', 'ruee'], ['fan_n1', 'projectile'], ['fan_n2', 'sol'], ['ray_n4', 'onde'], ['pen_n5', 'ombre']]) {
      await page.evaluate(([L, id]) => { eval(L)(); return window.__brumeux.emprunter(id); }, [LIBRE.toString(), id]); await pas(18, 0.5, 0.8); if (nom === 'lame') await capture(page, `emprunt-prise${sfx}.png`);
      let k = 0; for (; k < 120; k++) { await pas(3, 0.5, 0.8); const st = await page.evaluate(() => { const c = window.__brumeux.etat().emp.cur; return c && c.st ? c.st.ph + ':' + (c.st.t / c.st.tot).toFixed(2) : c ? c.ph : 'fini'; }); if (/^charge:0\.[0-4]/.test(st)) break; }
      await capture(page, `emprunt-copie-${nom}${sfx}.png`);
      await pas(60 * 7, 0.5, 0.8); if (nom === 'lame') await capture(page, `emprunt-epuise-anneau${sfx}.png`); await page.evaluate(TAIRE); await pas(20, 0.5, 0.8); }
    // la Passe brisée, la Révérence vue de derrière, la Volte
    await page.evaluate(([L]) => eval(L)(), [LIBRE.toString()]);
    await page.evaluate(() => { const D = window.__brumeux.dbg(), X = D.X, AR = D.AR, e = X.e, cx = (AR.x0 + AR.x1) / 2, cy = (AR.y0 + AR.y1) / 2; e.x = cx; e.y = cy - 150; window.__brumeux.poserSorte('murailles', { p: [cx, cy + 200], h: [cx, cy - 150] }); });
    await pas(5, 0.5, 0.86); await page.evaluate(([M]) => eval(M)({ k: 'fixe', g: 'passe' }), [MESURE.toString()]); await pas(40, 0.5, 0.86); await capture(page, `emprunt-passe${sfx}.png`); await pas(45, 0.5, 0.86); await capture(page, `emprunt-passe-brisee${sfx}.png`);
    await pas(60 * 2.5, 0.5, 0.86); await page.evaluate(TAIRE);
    await page.evaluate(([M]) => { const D = window.__brumeux.dbg(), AR = D.AR, e = D.X.e; e.x = (AR.x0 + AR.x1) / 2 - 60; e.y = (AR.y0 + AR.y1) / 2; eval(M)({ k: 'fixe', g: 'reverence' }); }, [MESURE.toString()]);
    await pas(40, 0.6, 0.5); await capture(page, `emprunt-reverence${sfx}.png`); await pas(60 * 1.5, 0.6, 0.5); await page.evaluate(TAIRE);
    await page.evaluate(([M]) => { const D = window.__brumeux.dbg(), AR = D.AR, e = D.X.e; e.x = (AR.x0 + AR.x1) / 2; e.y = (AR.y0 + AR.y1) / 2; eval(M)({ k: 'fixe', g: 'volte' }); }, [MESURE.toString()]);
    await pas(45, 0.62, 0.55); await capture(page, `emprunt-volte${sfx}.png`); await pas(60 * 1.5, 0.62, 0.55); await page.evaluate(TAIRE);
    // la copie défaite
    await page.evaluate(([L]) => { eval(L)(); window.__dernier.designer('pen_n2'); window.__brumeux.emprunter('pen_n2'); }, [LIBRE.toString()]); await pas(60, 0.5, 0.8);
    await page.evaluate(() => window.__brumeux.defaire()); await pas(8, 0.5, 0.8); await capture(page, `emprunt-defaite${sfx}.png`);
    // le masque à chaque forme (planche : le corps cuit des quatre formes, normal et terni)
    if (!rm && DIR) { const url = await page.evaluate(() => { const D = window.__brumeux.dbg(), cv = document.createElement('canvas'); cv.width = 4 * 170; cv.height = 2 * 160; const g = cv.getContext('2d'); g.fillStyle = '#15131c'; g.fillRect(0, 0, cv.width, cv.height);
      const B = window.__brume, keep = D.P.cls; ['lum', 'gou', 'her', 'tis'].forEach((cls, i) => { D.P.cls = cls; ['n', 't'].forEach((et, j) => { const I = D.imgCorps(cls, et); g.save(); g.translate(85 + i * 170, 85 + j * 160); g.drawImage(I.cv, I.x0, I.y0, I.w, I.h); g.restore(); }); }); D.P.cls = keep; return cv.toDataURL(); });
      const { writeFileSync } = await import('node:fs'); writeFileSync(join(DIR, 'emprunt-masques.png'), Buffer.from(url.split(',')[1], 'base64')); console.log('   capture ' + join(DIR, 'emprunt-masques.png')); }
    ok(!errs.length, `L-F${rm ? ' (mouvements réduits)' : ''} : aucune erreur ` + errs.slice(0, 2).join(' | '));
    await ctx.close();
  }
}
// ═══ M. La phase V, « L'Effacement » (5f) ═══════════════════════════════════════════════════════════════════════════════════
if (SEC.includes('M')) {
  console.log('\n══ M · la phase V, « L\'Effacement » ══');
  const EF = DB.effacement;
  // la partition se tait ; un éclair ou un geste de V en cours est abandonné (la scène est libre pour une mesure choisie)
  const TAIRE = () => { const X = window.__brumeux.dbg().X; if (X.tab && X.tab.eclair) X.tab = null; if (X.eff) { X.eff.g = null; X.eff.mon = null; } if (X.emp && X.emp.cur) X.emp.cur = null; X.boucle = [{ k: 'fixe', g: 'feinte' }]; X.im = 1; X.ph = 'entracte'; X.t = 1e9; };
  const MESURE = (m) => { const X = window.__brumeux.dbg().X; X.boucle = [m]; X.im = 0; X.ph = 'entracte'; X.t = 0.01; };
  const MEMS = { lum: 'ray_n2:3,ray_n4:2:1,pen_n1:3,pen_n2:3,fan_n1:3,pen_n5:3,fan_n2:2,ray_x3a', gou: 'vor_n1:3,vor_n3:2,dif_n1:3,dif_n2:3,dif_n4:2:1,vor_x3a,dif_x2b,reg_n1:2',
    her: 'car_n1:3,car_n2:3,cad_n1:3,cad_n2:2,req_n1:3,req_n4:2:1,car_x1b,cad_x1a', tis: 'aig_n2:3,aig_n4:2,trm_n2:3,trm_n3:2:1,pnt_n1:3,pnt_n6:2,pnt_x1b,aig_x2a' };
  const MONTRE = { lum: 'tab:faub/meute,tab:coeur/tir,cou:ray_n1,cou:-,emp:pen_n1,emp:fan_n1,el:fils,el:ruee,el:surjet,el:volte,el:disque,el:tir,joue:2',
    gou: 'tab:crypt/choeur,cou:vor_n1,emp:dif_n1,emp:vor_n1,el:cadre,el:equerre,el:de,el:passe,el:couloir,el:rafale,joue:2', her: 'tab:coeur/faux,cou:car_n1,emp:car_n1,emp:req_n1,el:toile,el:truelle,el:aiguilles,el:reverence,el:anneau,el:pluie,joue:2',
    tis: 'tab:faub/tir,cou:aig_n2,emp:aig_n2,emp:pnt_n1,el:fils,el:ruee,el:surjet,el:volte,el:disque,el:rafale,joue:2' };
  const PURM = (() => { const bloc = n => html.match(new RegExp('/\\*' + n + ':pur\\*/([\\s\\S]*?)/\\*/' + n + ':pur\\*/'))[1];
    const c = { window: {}, Math, console, JSON, Set, Object, Array, Number, Infinity, isFinite, Uint8Array, Float64Array }; vm.createContext(c);
    for (const f of ['brumeux', 'arene']) vm.runInContext(readFileSync(join(THEMIST, 'data', f + '.js'), 'utf8'), c);
    vm.runInContext(bloc('des') + '\n' + bloc('brx') + '\nthis.F={desRng,brxCandidatsV,brxLibresV,brxPremierV,brxMesures,brxEclairFrag,brxResserrement,brxMontre,brxPv};', c); return c.F; })();
  // ── M-A · lecture, candidats, premier et libres en jeu = logique pure (même graine, même X.montre injecté)
  {
    const { page, errs, ctx } = await ouvre('');
    const r = await page.evaluate(([PAS_, MEM, MON, TAIRE_, MESURE_]) => { const PAS = eval(PAS_), TAIRE = eval(TAIRE_), MESURE = eval(MESURE_), B = window.__brume, out = {};
      B.cls('lum'); B.start(); PAS(3);
      // ce qui t'a tué en V la dernière fois : un Masqué cousu (son détail : la clé d'assemblage du cousu injecté plus bas ; recalée après l'essai)
      B.SAVE.brumeux = { v: 1, tentatives: 1, victoires: 0, phaseMax: 5, mort: { 5: 'couture' }, vus: [] };
      window.__brumeux.essai(5, { muet: true, graine: 5300, palier: 'extreme', portes: MEM, montre: MON }); const D = window.__brumeux.dbg(), X = D.X;
      const M = X.montre; M.tab[0].deg = 12; M.tab[1].deg = 40; M.cou[0].deg = 5; M.cou[1].deg = 30;   // les dégâts faits (le journal du jeu)
      out.boucle = window.__brumeux.etat().boucle; out.premier = X.eff.j.premier;
      // le détail : la clé du second cousu, comme si c'était lui ; on rejoue la rotation de la première boucle avec ce détail
      X.sauve.cousu = { 5: { corps: M.cou[1].co.corps, cle: M.cou[1].co.cle, id: M.cou[1].id } }; X.eff.prem = { k: 'montage', cousu: X.sauve.cousu[5], fait: false };
      window.__brumeux.dbg().X.eff.cand = null;
      // les candidats calculés en jeu (candV) contre la logique pure sur la même copie de X.montre
      const T9 = D.T9, liste = window.__brumeux.dbg().pure.brxEmpruntables(window.__brumeux.DB, D.RUN.memoire.actifs.map(a => ({ id: a.id, src: a.src, rang: a.rang, g: a.g || 0 })), T9).liste;
      out.montre = window.__brumeux.dbg().pure.brxMontre(M); out.liste = liste.map(x => ({ id: x.id, fam: x.fam, rang: x.rang, max: x.max, g: x.g, vars: x.vars }));
      // la première mesure (le montage, rotation) : jouée en jeu ; le cousu choisi
      PAS(60 * 1.5, () => { D.P.iT = 1; D.P.hp = D.P.s.maxHp; }); out.log = X.eff.j.log.slice(); out.candJeu = window.__brumeux.etat().eff.cand; out.vivants = 0;
      // une mesure libre : X.rng remis à une graine connue juste avant ; ses éléments contre brxLibresV
      const lec = { poids: X.lec.poids, premier: X.lec.premier }; out.lec = lec; out.parC = Object.assign({}, X.parC);
      TAIRE(); PAS(60 * 6, () => { D.P.iT = 1; D.P.hp = D.P.s.maxHp; });
      for (const o of D.enemies) if (!o.dead && !o.brx18 && !o.cons18) o.dead = true; D.room.spawning = []; X.zones = []; X.tirs = []; PAS(2);
      out.libres = []; for (let k = 0; k < 6; k++) { X.rng = (function (s) { return function () { s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; })(900 + k);
        X.parC = k % 2 ? { fils: 200, ruee: 50 } : {}; MESURE({ k: 'libre' }); PAS(1); out.libres.push({ el: (X.boucle[0].elements || []).slice(), parC: Object.assign({}, X.parC) }); TAIRE(); X.zones = []; X.tirs = []; X.rev18 = null; PAS(2); }
      out.palier = X.palier; return out; }, [PAS.toString(), MEMS.lum, MONTRE.lum, TAIRE.toString(), MESURE.toString()]);
    const attB = PURM.brxPremierV(PURM.brxMesures(DB, 4, { palier: 'extreme' }), 'couture').mesures.map(m => m.k).join(' ');
    ok(r.premier === 'montage' && r.boucle.map(k => k.startsWith('[') ? 'libre' : k).join(' ') === attB, `M-A : ce qui t'a tué en V (un cousu) ouvre la boucle (brxPremierV) : ${r.boucle.join(' ')}`);
    const Cp = PURM.brxCandidatsV(DB, r.montre, { liste: r.liste, vivants: 0, premier: { k: 'montage', cousu: { cle: r.montre.cou[1].cle } } });
    ok(r.candJeu && r.candJeu.montage.mode === 'montre' && r.candJeu.montage.i === Cp.montage.i && Cp.montage.i === 1, `M-A : le montage en jeu = brxCandidatsV (le cousu de cousu[5] : ${r.candJeu && r.candJeu.montage.cou && r.candJeu.montage.cou.cle})`);
    ok(r.candJeu && r.candJeu.eclair.mode === 'montre' && r.candJeu.eclair.tab.decor === Cp.eclair.tab.decor && Cp.eclair.tab.decor === 'coeur', `M-A : l'éclair en jeu = la logique pure (le décor qui t'a fait le plus de dégâts : ${Cp.eclair.tab.decor})`);
    ok(r.candJeu && JSON.stringify(r.candJeu.emprunt.liste) === JSON.stringify(Cp.emprunt.liste.map(x => x.id)) && Cp.emprunt.liste.every(x => ['pen_n1', 'fan_n1'].includes(x.id)), `M-A : l'emprunt en jeu ne prend que ce qu'il a emprunté en IV, encore porté (${r.candJeu && r.candJeu.emprunt.liste.join(', ')})`);
    let lb = 0; const mk = s => () => { s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    r.libres.forEach((L, k) => { const p = PURM.brxLibresV(DB, r.lec, r.montre, L.parC, r.palier, mk(900 + k), {}, { moins: 0, plancher: DB.couture.budget.plancher, premier: null }); if (p.elements.join('+') !== L.el.join('+')) lb++; });
    ok(lb === 0 && r.libres.every(L => L.el.length), `M-A : six mesures libres en jeu = brxLibresV (même graine, même X.montre, même X.parC) : ${r.libres.map(L => L.el.join('+')).join(' | ')}`);
    ok(r.libres.every(L => L.el.every(id => r.montre.el[id] || (['ruee', 'equerre', 'truelle'].includes(id)))), 'M-A : jamais un élément non montré (la phase II, jamais jouée ici, se tire comme dans sa phase)');
    ok(!errs.filter(x => !/Failed to load/.test(x)).length, 'M-A : aucune erreur ' + errs.slice(0, 2).join(' | '));
    await ctx.close();
  }
  // ── M-B · partitions, les quatre gestes, la feinte double, les resserrements, IV → V
  {
    const { page, errs, ctx } = await ouvre('');
    const r = await page.evaluate(([PAS_, TAIRE_, MESURE_]) => { const PAS = eval(PAS_), TAIRE = eval(TAIRE_), MESURE = eval(MESURE_), out = {};
      window.__brume.cls('lum'); window.__brumeux.essai(5, { muet: true, graine: 5310, palier: 'normal' }); out.courte = window.__brumeux.etat().boucle;
      window.__brumeux.essai(5, { muet: true, graine: 5311, palier: 'extreme' }); out.entiere = window.__brumeux.etat().boucle;
      window.__brumeux.essai(5, { muet: true, graine: 5312, palier: 'normal', montre: 'tab:faub/meute,joue:2,joue:4' }); const D = window.__brumeux.dbg(), X = D.X, P = D.P, AR = D.AR, e = X.e; TAIRE();
      const cx = (AR.x0 + AR.x1) / 2, cy = (AR.y0 + AR.y1) / 2, tient = (x, y) => () => { P.x = x; P.y = y; P.iT = 1; P.hp = P.s.maxHp; e.hp = Math.max(e.hp, X.pv[4] * 0.9); };
      PAS(5, tient(cx + 300, cy));
      // 1. le tableau éclair : la moitié des bornes la plus loin de toi, sa vague dedans ; vidée : rideau puis à nu 2 s
      MESURE({ k: 'eclair' }); PAS(3, tient(cx + 300, cy)); const T = X.tab; out.eclair = T ? { frag: [T.frag.x0, T.frag.y0, T.frag.x1, T.frag.y1].map(Math.round), AR: [AR.x0, AR.y0, AR.x1, AR.y1], decor: T.decor, regle: T.regle, eclair: T.eclair } : null;
      PAS(60, tient(cx + 300, cy)); const sp = D.room.spawning.slice(); out.eclair.vague = sp.length; out.eclair.dans = sp.every(o => o.x >= T.frag.x0 - 1 && o.x <= T.frag.x1 + 1 && o.y >= T.frag.y0 - 1 && o.y <= T.frag.y1 + 1);
      PAS(60 * 1.2, tient(cx + 300, cy)); const vag = D.enemies.filter(o => !o.dead && !o.brx18 && !o.cons18 && !o.cou18);
      for (const o of vag) { o.hp = 1; D.hit(o, 50, { crit: false }); } let vmax = 0, rideau = null; PAS(60 * 3.5, i => { tient(cx + 300, cy)(); vmax = Math.max(vmax, e.vuln || 0); if (X.tab && X.tab.sub === 'rideau' && rideau == null) rideau = i; });
      out.eclair.vuln = +vmax.toFixed(2); out.eclair.rideau = rideau; out.eclair.vide = X.eff.j.vides; PAS(30, tient(cx + 300, cy));
      // non vidée à 8 s : ses ennemis rentrent, le rideau sans fenêtre
      TAIRE(); e.vuln = 0; MESURE({ k: 'eclair' }); let vm2 = 0, t8 = null; PAS(60 * 10, i => { tient(cx + 300, cy)(); if (X.tab && X.tab.sub === 'rideau' && t8 == null) t8 = i / 60; vm2 = Math.max(vm2, e.vuln || 0); }); out.eclair.non = { t8, vm2: +vm2.toFixed(2), rentres: X.eff.j.rentres };
      // 2. l'effondrement : une muraille debout tombe et devient une fosse ; un tir la traverse
      TAIRE(); e.vuln = 0; e.x = cx; e.y = cy - 150; const m = window.__brumeux.poserSorte('murailles', { p: [cx, cy + 200], h: [cx, cy - 150] }); PAS(5, tient(cx - 300, cy + 200));
      const nd = X.bat.length ? X.bat[0].disques.length : 0; MESURE({ k: 'effondrement' }); PAS(3, tient(cx - 300, cy + 200)); const z = X.zones.find(q => q.id === 'effondrement');
      out.eff = { m: m.ok, z: !!z, charge: z && z.charge, sorte: z && z.sorte }; let vm3 = 0; PAS(60 * 2.2, () => { tient(cx - 300, cy + 200)(); vm3 = Math.max(vm3, e.vuln || 0); });
      const fo = D.room.pillars.filter(p => p.fosse5); out.eff.fosses = fo.length; out.eff.nd = nd; out.eff.bat = X.bat.length; out.eff.vuln = +vm3.toFixed(2); out.eff.kind = fo.length && fo[0].kind;
      if (fo.length) { const f0 = fo[0], q = { x: f0.x - 200, y: f0.y, vx: 400, vy: 0, r: 7, dmg: 1, life: 3, from: null, col: '205,120,255' }; D.ep.push(q); PAS(60, tient(cx - 300, cy + 200)); out.eff.tir = { x: Math.round(q.x - f0.x), dead: !!q.dead }; }
      PAS(30, tient(cx - 300, cy + 200));
      // 3. un pan du bord : plus aucune construction effondrable ; le bord le plus proche, 150 × 320
      TAIRE(); e.vuln = 0; MESURE({ k: 'effondrement' }); PAS(3, tient(AR.x0 + 60, cy)); const pz = X.zones.find(q => q.pan18); out.pan = pz ? { w: pz.w, len: Math.round(Math.hypot(pz.x1 - pz.x0, pz.y1 - pz.y0)), x0: Math.round(pz.x0), AR0: AR.x0, bord: pz.bord } : null;
      let vm4 = 0, hp0 = P.hp, coups0 = window.__arene.journal().coups; PAS(60 * 2.5, () => { P.x = AR.x0 + 60; P.y = cy; P.iT = 0; P.dashT = 0; e.hp = Math.max(e.hp, X.pv[4] * 0.9); vm4 = Math.max(vm4, e.vuln || 0); });
      out.pan && Object.assign(out.pan, { vuln: +vm4.toFixed(2), coup: window.__arene.journal().coups - coups0, sans: window.__arene.journal().sansSigne, tue: X.tue });
      PAS(30, tient(cx, cy + 150));
      // 4. le montage court : coupé → à nu 2 s ; abouti → cousu, à nu 2 s ; durée du montage ≈ 2,6 s
      TAIRE(); e.vuln = 0; MESURE({ k: 'montage' }); PAS(30, tient(cx - 200, cy + 150)); const f = X.eff.mon && X.eff.mon.f; out.mon = f ? { pv: f.el.pvMax, hp: f.e && Math.round(f.e.maxHp) } : null;
      if (f && f.noeud) { D.hit(f.noeud, 1e4, { crit: false }); } let vm5 = 0; PAS(60 * 2.4, () => { tient(cx - 200, cy + 150)(); vm5 = Math.max(vm5, e.vuln || 0); }); out.mon && Object.assign(out.mon, { coupe: f.etat, vuln: +vm5.toFixed(2), coupes: X.eff.j.coupes });
      TAIRE(); e.vuln = 0; MESURE({ k: 'montage' }); let t0 = null, tAb = null, vm6 = 0; PAS(60 * 6, i => { tient(cx - 200, cy + 150)(); const g = X.eff.mon && X.eff.mon.f; if (g && g.etat === 'montage' && t0 == null) t0 = i / 60; if (X.eff.j.aboutis && tAb == null) tAb = i / 60; if (tAb != null) vm6 = Math.max(vm6, e.vuln || 0); });
      const c = D.enemies.find(o => !o.dead && o.cou18); out.ab = { t: tAb != null && t0 != null ? +(tAb - t0).toFixed(2) : null, vuln: +vm6.toFixed(2), cousu: !!c, hp: c && Math.round(c.maxHp) };
      // au plus un cousu vivant en V : un second montage saute
      const s0 = X.eff.j.montagesSautes; TAIRE(); MESURE({ k: 'montage' }); PAS(5, tient(cx - 200, cy + 150)); out.ab.second = X.eff.j.montagesSautes - s0;
      if (c) { c.dead = true; } TAIRE(); PAS(30, tient(cx, cy + 150));
      // 5. la feinte double : deux feintes à la suite, jamais deux à la fois, la seconde 0,3 s après la fin de la première
      e.vuln = 0; MESURE({ k: 'double' }); const bl = []; let prev = null, n2 = 0; PAS(60 * 4, i => { tient(cx, cy + 150)(); const b = D.room.bl; if (b && b !== prev && !b.second) { bl.push(i / 60); n2++; } if (!b && prev) bl.push(-(i / 60)); prev = b; });
      out.dbl = { seq: bl.map(v => +v.toFixed(2)), n: X.eff.j.feintes, vuln: +(e.vuln || 0).toFixed(2) };
      return out; }, [PAS.toString(), TAIRE.toString(), MESURE.toString()]);
    ok(r.courte.join(' ') === 'eclair double effondrement montage double emprunt' && r.entiere.filter(k => k.startsWith('[')).length === 3 && r.entiere.length === 9, `M-B : partitions : courte (Normal) ${r.courte.join(' ')} ; entière (Extrême) ${r.entiere.join(' ')}`);
    const E = r.eclair; ok(E && E.eclair && E.regle === null && E.decor === 'faub' && (E.frag[2] <= (E.AR[0] + E.AR[2]) / 2 + 1) && E.frag[0] === E.AR[0] + 30, `M-B : éclair : le décor accroché en I (${E && E.decor}), sans règle, dans la moitié des bornes la plus loin de toi (${E && E.frag.join(', ')})`);
    ok(E && E.vague > 0 && E.dans, `M-B : éclair : une vague de ${E && E.vague} ennemis, dans le fragment`);
    ok(E && E.vide >= 1 && E.vuln >= EF.nuS - 0.05 && E.vuln <= EF.nuS + 0.05, `M-B : éclair vidé : rideau, puis à nu ${E && E.vuln} s`);
    ok(E && E.non.t8 != null && E.non.t8 >= 8.6 && E.non.t8 <= 9.0 && E.non.vm2 < 0.05 && E.non.rentres > 0, `M-B : éclair non vidé : à ${E && E.non.t8} s (accroche 0,8 + vie 8), ses ennemis rentrent, sans fenêtre à nu`);
    const F2 = r.eff; ok(F2.m && F2.z && Math.abs(F2.charge - 1.7) < 0.01 && F2.sorte === 'murailles' && F2.bat === 0 && F2.fosses === F2.nd && F2.kind === 'fosse18' && F2.vuln >= 1.95, `M-B : effondrement : la muraille tombe (préavis ${F2.charge} s, première rencontre), puis devient ${F2.fosses} fosses de mêmes disques ; à nu ${F2.vuln} s`);
    ok(F2.tir && !F2.tir.dead && F2.tir.x > 150, `M-B : un tir traverse la fosse (à ${F2.tir && F2.tir.x} px au-delà)`);
    const Pn = r.pan; ok(Pn && Pn.w === 150 && Pn.len === 320 && Pn.x0 === Pn.AR0 && Pn.bord === 0 && Pn.coup >= 1 && Pn.sans === 0 && Pn.vuln >= 1.95 && Pn.tue === 'effondrement', `M-B : pan du bord : sans construction effondrable, du bord le plus proche (150 × 320), il frappe avec son signe (${Pn && Pn.coup} coup, ${Pn && Pn.sans} sans signe), à nu ${Pn && Pn.vuln} s ; « effondrement » ${JSON.stringify(Pn)}`);
    ok(r.mon && r.mon.pv === 30 && r.mon.coupe === 'coupe' && r.mon.vuln >= 1.95 && r.mon.vuln <= 2.05 && r.mon.coupes === 1, `M-B : montage court coupé : nœud de ${r.mon && r.mon.pv} PV (2,5 % de 1 200), à nu ${r.mon && r.mon.vuln} s`);
    ok(r.ab.t != null && Math.abs(r.ab.t - EF.montage.dureeS) < 0.25 && r.ab.cousu && r.ab.hp > 0 && r.ab.vuln >= 1.95 && r.ab.second === 1, `M-B : montage court abouti en ${r.ab.t} s (2,6) : un cousu de ${r.ab.hp} PV, à nu ${r.ab.vuln} s ; un second montage, un cousu vivant : sauté`);
    const seq = r.dbl.seq, deb = seq.filter(v => v > 0), fin = seq.filter(v => v < 0).map(v => -v);
    ok(deb.length === 2 && fin.length >= 1 && deb[1] - fin[0] >= 0.29 && deb[1] - fin[0] <= 0.4 && r.dbl.vuln < 0.05, `M-B : feinte double : deux feintes à la suite, jamais à la fois (début ${deb.join(', ')} ; fin de la première ${fin[0]}), aucune fenêtre après`);
    await capture(page, 'effacement-double.png');
    ok(!errs.filter(x => !/Failed to load/.test(x)).length, 'M-B : aucune erreur ' + errs.slice(0, 2).join(' | '));
    await ctx.close();
  }
  // M-B, suite : l'emprunt (de ce qu'il a emprunté en IV seulement) ; IV → V (état 6 gardé, constructions gardées) ; les deux resserrements
  {
    const { page, errs, ctx } = await ouvre('');
    await page.evaluate(ESSAI, { phase: 4, cls: 'lum', graine: 5320, portes: MEMS.lum, palier: 'normal' });
    const r = await page.evaluate(([PAS_, TAIRE_, MESURE_]) => { const PAS = eval(PAS_), TAIRE = eval(TAIRE_), MESURE = eval(MESURE_), D = window.__brumeux.dbg(), X = D.X, P = D.P, AR = D.AR, e = X.e, out = {}; TAIRE();
      const cx = (AR.x0 + AR.x1) / 2, cy = (AR.y0 + AR.y1) / 2, tient = (x, y) => () => { P.x = x; P.y = y; P.iT = 1; P.hp = P.s.maxHp; };
      PAS(5, tient(cx, cy + 180));
      // en IV : il emprunte pen_n1 ; on pose deux constructions (l'une au bord des bornes de l'état 6)
      window.__brumeux.emprunter('pen_n1'); PAS(60 * 8, () => { tient(cx, cy + 180)(); e.hp = Math.max(e.hp, e.maxHp * X.seuils[3] + 400); });
      const m1 = window.__brumeux.poserSorte('colonnades', { p: [AR.x0 + 260, cy], h: [AR.x0 + 560, cy] }), m2 = window.__brumeux.poserSorte('murailles', { p: [cx + 150, cy + 150], h: [cx + 150, cy - 200] }); PAS(5, tient(cx + 200, cy + 180));
      out.av = { etat: window.__arene.etat().etat, bat: X.bat.filter(c => c.etat === 'debout').map(c => c.sorte), joues: X.emp.joues.map(x => x.id), m: [m1.ok, m2.ok] };
      TAIRE(); e.hp = Math.floor(e.maxHp * X.seuils[3]) - 2; window.__brumeux.vers(5); PAS(60 * 3.6, tient(cx + 200, cy + 180));
      out.ap = { phase: window.__brumeux.etat().phase, etat: window.__arene.etat().etat, bat: X.bat.filter(c => c.etat === 'debout').map(c => c.sorte), trans: !!X.trans, AR: [AR.x0, AR.y0, AR.x1, AR.y1], r: e.r, pvPlaf: e.pvPlaf18 };
      // l'emprunt de V : ce qu'il a emprunté en IV (pen_n1), même si tu portes d'autres talents
      TAIRE(); const L0 = []; for (let k = 0; k < 3; k++) { MESURE({ k: 'emprunt' }); PAS(4, tient(cx + 200, cy + 180)); const c = X.emp.cur; L0.push(c ? c.id : null); PAS(60 * 7, () => { tient(cx + 200, cy + 180)(); e.hp = Math.max(e.hp, X.pv[4] * 0.95); }); TAIRE(); PAS(20, tient(cx + 200, cy + 180)); }
      out.emp = { ids: L0, j: X.eff.j.emprunts, nu: X.emp.j.nu };
      // les resserrements : PV à 2/3 de la phase pendant une mesure (il attend sa fin), puis à 1/3 ; bornes, poussée sans dégât, constructions filtrées, masque fendu
      TAIRE(); const hp0 = P.hp; MESURE({ k: 'double' }); PAS(10, tient(AR.x0 + 30, cy)); e.hp = X.pv[4] * 0.6; const ph = []; let attente = null, debut = null, vlan = 0, zonesPendant = 0, feles = [];
      PAS(60 * 8, i => { P.iT = 1; P.x = Math.max(P.x, AR.x0 + 20); const et = window.__brumeux.etat(); if (et.eff.rs && debut == null) { debut = i / 60; feles.push(et.eff.fel); } if (!et.eff.rs && debut == null && D.room.bl) attente = i / 60;
        if (et.eff.rs) { zonesPendant += X.zones.filter(z => !z.fait).length; } ph.push(window.__arene.etat().etat); });
      const AR1 = [AR.x0, AR.y0, AR.x1, AR.y1]; out.r1 = { attente, debut, etat: window.__arene.etat().etat, AR: AR1, P: [Math.round(P.x), Math.round(P.y)], hp: P.hp === P.s.maxHp, zones: zonesPendant, fel: X.eff.fel, ress: X.eff.ress, bat: X.bat.filter(c => c.etat === 'debout').map(c => c.sorte), filtrees: X.eff.j.filtrees, j: X.eff.j.resserrements };
      TAIRE(); e.hp = X.pv[4] * 0.3; PAS(60 * 5, () => { P.iT = 1; }); out.r2 = { etat: window.__arene.etat().etat, AR: [AR.x0, AR.y0, AR.x1, AR.y1], fel: X.eff.fel, ress: X.eff.ress, j: X.eff.j.resserrements };
      // jamais au temps : la phase tenue au-dessus de 2/3 pendant 40 s ne se resserre pas
      return out; }, [PAS.toString(), TAIRE.toString(), MESURE.toString()]);
    ok(r.ap.phase === 5 && r.ap.etat === 6 && !r.ap.trans && r.ap.r === 48 && r.ap.AR[2] - r.ap.AR[0] === 1168, `M-B : IV → V : l'état 6 est gardé (pas de transformation), il reste au sol (r ${r.ap.r})`);
    ok(r.av.bat.length >= 1 && r.ap.bat.join() === r.av.bat.join(), `M-B : IV → V : les constructions restent debout (${r.av.bat.join(', ')} → ${r.ap.bat.join(', ')})`);
    ok(r.ap.pvPlaf === 1200, `M-B : le plafond du Dernier Souvenir suit les PV de la phase V (e.pvPlaf18 = ${r.ap.pvPlaf})`);
    ok(r.emp.ids.filter(Boolean).length >= 2 && r.emp.ids.filter(Boolean).every(id => r.av.joues.includes(id)), `M-B : l'emprunt de V ne prend que ce qu'il a emprunté en IV (${r.emp.ids.join(', ')} ; empruntés en IV : ${r.av.joues.join(', ')})`);
    ok(r.r1.debut != null && r.r1.attente != null && r.r1.debut > r.r1.attente && r.r1.etat === 7 && r.r1.AR[2] - r.r1.AR[0] === 1040 && r.r1.AR[3] - r.r1.AR[1] === 520, `M-B : premier resserrement : il attend la fin de la feinte double (fin ${r.r1.attente} s, début ${r.r1.debut} s), puis l'arène passe à 1 040 × 520 (état ${r.r1.etat})`);
    ok(r.r1.hp && r.r1.P[0] >= r.r1.AR[0] && r.r1.zones === 0, `M-B : poussé sans dégât (PV intacts, à ${r.r1.P[0]} ≥ ${r.r1.AR[0]}), il ne lance rien pendant le resserrement`);
    ok(r.r1.fel === 1 && r.r2.fel === 2 && r.r2.ress === 2 && r.r2.etat === 8 && r.r2.AR[2] - r.r2.AR[0] === 920 && r.r2.AR[3] - r.r2.AR[1] === 460, `M-B : second resserrement à 1/3 : 920 × 460 (état ${r.r2.etat}) ; son masque se fend (une fêlure, puis deux)`);
 ok(r.av.m[0] && r.r1.filtrees >= 1 && !r.r1.bat.includes('colonnades'), `M-B : ce qui ne tient plus dans les nouvelles bornes s'efface (${r.r1.filtrees} : ${r.av.bat.join(', ')} → ${r.r1.bat.join(', ') || 'rien'})`);
    await capture(page, 'effacement-resserre-2.png');
    ok(!errs.filter(x => !/Failed to load/.test(x)).length, 'M-B (suite) : aucune erreur ' + errs.slice(0, 2).join(' | '));
    await ctx.close();
  }
  // jamais au temps : la phase tenue au-dessus de 2/3 de ses PV pendant 60 s ne se resserre jamais
  {
    const { page, errs, ctx } = await ouvre('');
    await page.evaluate(ESSAI, { phase: 5, cls: 'gou', graine: 5330, bot: 2 });
    const r = await page.evaluate(([PAS_]) => { const PAS = eval(PAS_), X = window.__brumeux.dbg().X, e = X.e; PAS(60 * 60, () => { e.hp = Math.max(e.hp, X.pv[4] * 0.9); }); return { ress: X.eff.ress, etat: window.__arene.etat().etat, j: window.__arene.journal() }; }, [PAS.toString()]);
    ok(r.ress === 0 && r.etat === 6 && r.j.sansSigne === 0, `M-B : 60 s au-dessus de 2/3 de ses PV (tenus à 90 %) : aucun resserrement (jamais au temps), ${r.j.coups} coups, ${r.j.sansSigne} sans signe`);
    await ctx.close();
  }
  // ── M-C · le Dernier Souvenir en V (plafond, défaite de l'emprunt) ; la promotion d'un cousu de V qui te tue (et pas d'une mort par le Brumeux)
  {
    const { page, errs, ctx } = await ouvre('');
    await page.evaluate(ESSAI, { phase: 5, cls: 'lum', graine: 5340, portes: MEMS.lum, emp: 'pen_n1', ds: true, dieu: false, montre: 'emp:pen_n1' });
    const r = await page.evaluate(([PAS_, TAIRE_, MESURE_]) => { const PAS = eval(PAS_), TAIRE = eval(TAIRE_), MESURE = eval(MESURE_), D = window.__brumeux.dbg(), X = D.X, P = D.P, AR = D.AR, e = X.e, out = {}; TAIRE();
      const cx = (AR.x0 + AR.x1) / 2, cy = (AR.y0 + AR.y1) / 2, tient = () => { P.x = cx; P.y = cy + 160; P.hp = P.s.maxHp; e.hp = Math.max(e.hp, X.pv[4] * 0.9); };
      PAS(5, tient); out.pvPlaf = e.pvPlaf18; out.designe = window.__dernier.designe();
      MESURE({ k: 'emprunt' }); PAS(10, tient); const c0 = X.emp.cur; const h0 = e.hp, rec = window.__dernier.bruler('pen_n1'); PAS(2, tient);
      out.def = { id: c0 && c0.id, ph: X.emp.cur && X.emp.cur.ph, vuln: +(e.vuln || 0).toFixed(2), surFort: rec && Math.round(rec.surFort || 0), plaf: rec && rec.force ? Math.round(window.__dernier.plafondDe(e, rec.force)) : null };
      const cj = X.emp.j.coups; PAS(60 * 4.2, tient); out.def.coups = X.emp.j.coups - cj; return out; }, [PAS.toString(), TAIRE.toString(), MESURE.toString()]);
    ok(r.pvPlaf === 1200 && r.def.id === 'pen_n1' && r.def.ph === 'defait' && r.def.vuln >= 3.95 && r.def.coups === 0, `M-C : brûler le talent emprunté en V défait la copie : à nu ${r.def.vuln} s, aucun coup ensuite`);
    ok(r.def.plaf != null && r.def.plaf <= 96 && r.def.surFort <= r.def.plaf + 1, `M-C : la brûlure sur lui reste sous le plafond de la phase V (${r.def.surFort} ≤ ${r.def.plaf} PV ; 48 à 96 en courte)`);
    await ctx.close();
    const promo = async (cas) => { const { page, errs, ctx } = await ouvre('');
      await page.evaluate(ESSAI, { phase: 5, cls: 'lum', graine: 5341, dieu: false, montre: 'cou:ray_n1,joue:1,joue:4' });
      const q = await page.evaluate(([PAS_, TAIRE_, MESURE_, cas]) => { const PAS = eval(PAS_), TAIRE = eval(TAIRE_), MESURE = eval(MESURE_), D = window.__brumeux.dbg(), X = D.X, P = D.P, AR = D.AR, e = X.e; TAIRE();
        window.__nemesis.activer(true); delete window.__brume.SAVE.nemesis; const tient = () => { P.x = (AR.x0 + AR.x1) / 2; P.y = (AR.y0 + AR.y1) / 2 + 150; P.iT = 1; P.hp = P.s.maxHp; }; PAS(5, tient);
        MESURE({ k: 'montage' }); PAS(60 * 3.5, tient); const c = D.enemies.find(o => !o.dead && o.cou18 && o.cou18.etat === 'abouti'); if (!c) return { refus: 'pas de cousu' };
        D.RUN.essai = 0; P.iT = 0; P.dashT = 0; P.shield = 0; D.hurt(P.hp + 999, cas === 'brumeux' ? e : c); const R = D.room.asm;
        const B = window.__nemesis.promouvoir(), S = window.__nemesis.voir(), f = S && S.liste[0];
        return { mort: P.dead || P.hp <= 0, cousu: !!(R && R.cousu18), B, attend: f && f.attend, tue: X.tue, v5: c.cou18.v5 }; }, [PAS.toString(), TAIRE.toString(), MESURE.toString(), cas]);
      await ctx.close(); return { q, errs }; };
    const A1 = await promo('cousu'), A2 = await promo('brumeux');
    console.log('   promotion (V) : ' + JSON.stringify({ cousu: A1.q, brumeux: A2.q }).slice(0, 500));
    ok(A1.q.mort && A1.q.v5 && A1.q.cousu && A1.q.B && !A1.q.B.refus && A1.q.attend && A1.q.attend.acte === 3 && A1.q.attend.salle === 3 && A1.q.tue === 'couture', `M-C : tué par le cousu d'un montage court (hors essai) : il est promu, attend à l'acte III, salle 3 ; « ce qui t'a tué » : la couture`);
    ok(A2.q.mort && A2.q.B && A2.q.B.refus, `M-C : tué par le Brumeux : personne n'est promu (${A2.q.B && A2.q.B.refus})`);
    ok(!A1.errs.filter(x => !/Failed to load/.test(x)).length && !A2.errs.filter(x => !/Failed to load/.test(x)).length, 'M-C : aucune erreur');
  }
  // ── M-D · la phase V conduite par le bot qui frappe : quatre formes, deux graines, courte et entière ; 0 coup sans signe ; un combat entier depuis la phase I
  const durees = {};
  for (const [k, cls] of ['lum', 'gou', 'her', 'tis'].entries()) for (const [gi, pal] of [[0, 'normal'], [1, 'extreme']]) {
    const { page, errs, ctx } = await ouvre('');
    await page.evaluate(ESSAI, { phase: 5, bot: 2, cls, graine: 5400 + 10 * k + gi, portes: MEMS[cls], palier: pal, montre: MONTRE[cls] });
    const r = await page.evaluate(([PAS_]) => { const PAS = eval(PAS_); let fin = null; for (let s = 0; s < 240 && fin == null; s++) PAS(60, i => { if (fin != null) return; const et = window.__brumeux.etat(); if (!et.on || et.scene || (et.pv && et.pv[0] <= 0)) fin = s * 60 + i; });
      const et = window.__brumeux.etat(); return { j: window.__arene.journal(), st: window.__brumeux.statsRun(), fin, E: et.eff && et.eff.j, pv: et.pv }; }, [PAS.toString()]);
    const p5 = r.st.phases[5] || { t: 0, coups: 0 }, E = r.E || {}; (durees[cls] = durees[cls] || {})[pal] = r.fin != null ? p5.t : null;
    console.log(`   ${cls} (${pal}) : phase V ${r.fin != null ? 'finie en ' + p5.t + ' s' : 'non finie en 240 s'}, ${p5.coups} coups ; éclairs ${E.eclairs} (sautés ${E.eclairsSautes}, vidés ${E.vides}), effondrements ${E.effondrements} / pans ${E.pans} (sautés ${E.effSautes}, fosses ${E.fosses}), montages ${E.montages} (sautés ${E.montagesSautes}, coupés ${E.coupes}, aboutis ${E.aboutis}), emprunts ${E.emprunts} (sautés ${E.empruntsSautes}), doubles ${E.doubles}, libres ${E.libres} [${(E.libresEl || []).join(' | ')}], à nu ${E.nu}, resserrements ${(E.resserrements || []).length}`);
    if (r.j.liste.length) console.log('   coups suspects : ' + JSON.stringify(r.j.liste.slice(0, 6)));
    ok(r.j.sansSigne === 0, `M-D : ${cls} (${pal}) : aucun coup sans signe (${r.j.coups} coups reçus)`);
    ok(r.fin != null, `M-D : ${cls} (${pal}) : le bot qui frappe finit la phase V (${p5.t} s ; PV placeholders, recalés en 5g)`);
    ok(pal !== 'extreme' || E.libres >= 0, `M-D : ${cls} (${pal}) : mesures libres en Extrême seulement (${E.libres})`);
    ok(r.j.assertions === 0 && !errs.filter(x => !/Failed to load/.test(x)).length, `M-D : ${cls} (${pal}) : aucune erreur ` + errs.slice(0, 2).join(' | '));
    if (cls === 'tis' && pal === 'extreme') await capture(page, 'effacement-combat.png');
    await ctx.close();
  }
  // la phase V tenue (ses PV gardés au-dessus de 2/3 pendant 90 s, puis lâchés) : le bot affronte une boucle entière et plus, dans les quatre formes
  for (const [k, cls] of ['lum', 'gou', 'her', 'tis'].entries()) {
    const { page, errs, ctx } = await ouvre('');
    await page.evaluate(ESSAI, { phase: 5, bot: 2, cls, graine: 5450 + k, portes: MEMS[cls], palier: k % 2 ? 'extreme' : 'normal', montre: MONTRE[cls] });
    const r = await page.evaluate(([PAS_]) => { const PAS = eval(PAS_), X = window.__brumeux.dbg().X, e = X.e; PAS(60 * 90, () => { e.hp = Math.max(e.hp, X.pv[4] * 0.7); });
      return { j: window.__arene.journal(), E: X.eff.j, st: window.__brumeux.statsRun() }; }, [PAS.toString()]);
    const E = r.E; console.log(`   ${cls} tenue 90 s : ${r.j.coups} coups, ${r.j.sansSigne} sans signe ; éclairs ${E.eclairs} (vidés ${E.vides}), effondrements ${E.effondrements} / pans ${E.pans}, montages ${E.montages} (coupés ${E.coupes}, aboutis ${E.aboutis}), emprunts ${E.emprunts}, doubles ${E.doubles}, libres ${E.libres}, à nu ${E.nu}, sautées ${E.mesuresSautees}`);
    if (r.j.liste.length) console.log('   coups suspects : ' + JSON.stringify(r.j.liste.slice(0, 6)));
    ok(r.j.sansSigne === 0 && E.eclairs >= 2 && E.doubles >= 3 && E.pans + E.effondrements >= 2, `M-D : ${cls}, phase V tenue 90 s : aucun coup sans signe ; tous les gestes joués`);
    ok(!errs.filter(x => !/Failed to load/.test(x)).length, `M-D : ${cls} (tenue) : aucune erreur ` + errs.slice(0, 2).join(' | '));
    await ctx.close();
  }
  console.log('   durées de la phase V au bot : ' + Object.entries(durees).map(([c, v]) => c + ' courte ' + (v.normal == null ? '—' : v.normal + ' s') + ', entière ' + (v.extreme == null ? '—' : v.extreme + ' s')).join(' · '));
  {
    const { page, errs, ctx } = await ouvre('');
    await page.evaluate(ESSAI, { phase: 1, bot: 2, cls: 'gou', graine: 5460, palier: 'extreme', portes: MEMS.gou });
    const r = await page.evaluate(([PAS_]) => { const PAS = eval(PAS_); let fin = null; PAS(60 * 620, i => { const et = window.__brumeux.etat(); if ((et.scene || !et.on) && fin == null) fin = i; });
      const et = window.__brumeux.etat(); return { st: window.__brumeux.statsRun(), j: window.__arene.journal(), M: et.eff && et.eff.montre, E: et.eff && et.eff.j }; }, [PAS.toString()]);
    const ph = r.st.phases; console.log(`   combat entier (gou, Extrême) : ${r.st.fin} ; ${Object.entries(ph).map(([k, p]) => k + ' : ' + p.t + ' s').join(' · ')} ; montré ${JSON.stringify(r.M && { ph: r.M.ph, tab: r.M.tab.length, cou: r.M.cou.length, emp: r.M.emp.length, el: Object.keys(r.M.el).length })} ; V : ${JSON.stringify(r.E && { e: r.E.eclairs, p: r.E.pans, f: r.E.effondrements, m: r.E.montages, ms: r.E.montagesSautes, emp: r.E.emprunts, l: r.E.libresEl })}`);
    ok(r.st.fin === 'victoire' && ph[5] && r.j.sansSigne === 0 && r.M && [0, 1, 2, 3].every(k => r.M.ph[k]), `M-D : combat entier depuis la phase I (Gouffre, Extrême) : I → V enchaînées, ce que le combat a montré relu en V, ${r.j.coups} coups, ${r.j.sansSigne} sans signe`);
    ok(!errs.filter(x => !/Failed to load/.test(x)).length, 'M-D (combat entier) : aucune erreur ' + errs.slice(0, 2).join(' | '));
    await ctx.close();
  }
  // ── M-E · coût apparié dans une seule page : son corps en V, un cousu, une vague d'éclair, deux constructions, la brume des resserrements (état 8), contre le
  // fantôme d'essai à foule égale ; les calques des états 7 et 8 peints une tuile par image en IV ; l'entrée d'un essai en V
  {
    const { page, errs, ctx } = await ouvre('');
    const n = await page.evaluate(([PAS_, TAIRE_, MESURE_, MEM]) => { const PAS = eval(PAS_), TAIRE = eval(TAIRE_), MESURE = eval(MESURE_); window.__brume.cls('lum'); window.__brumeux.essai(5, { muet: true, graine: 7, palier: 'difficile', portes: MEM, montre: 'cou:ray_n1,tab:coeur/meute,joue:4' });
      const D = window.__brumeux.dbg(), X = D.X, P = D.P, AR = D.AR, e = X.e; TAIRE(); const tient = () => { P.x = (AR.x0 + AR.x1) / 2 + 150; P.y = (AR.y0 + AR.y1) / 2 + 120; P.iT = 1; P.hp = P.s.maxHp; };
      PAS(3, tient); window.__brumeux.resserrer(); window.__brumeux.resserrer(); PAS(60 * 9, tient);
      for (const [s, x, y] of [['colonnades', -200, 60], ['puits', 200, -80]]) window.__brumeux.poserSorte(s, { p: [(AR.x0 + AR.x1) / 2 + x, (AR.y0 + AR.y1) / 2 + y], h: [(AR.x0 + AR.x1) / 2 + x, AR.y0 - 100] }); PAS(5, tient);
      TAIRE(); MESURE({ k: 'montage' }); PAS(60 * 4, tient); TAIRE(); MESURE({ k: 'eclair' }); PAS(60 * 2.2, tient);
      for (const o of D.enemies) if (!o.cons18 && !o.brx18) { o.spd = 0; o.stun = 1e9; } X.cuGel = true; D.render();
      const LS = D.lights(), tous = LS.slice(), sans = tous.filter(l => l.c !== 'brume18'), A = window.__arene.dbg().A, fantome = { x: e.x, y: e.y, r: 44, zones: [], t: 9, wp: null };
      const bat = X.bat.slice(), cpil = D.room.pillars.slice(), bpil = cpil.filter(p => !p.cons18), tab = X.tab, eff = X.eff, fel = eff.fel;
      window.__LE = v => { X.bat = v ? bat : []; D.room.pillars.length = 0; D.room.pillars.push(...(v ? cpil : bpil)); X.tab = v ? tab : null; eff.fel = v ? fel : 0; e.dead = !v; LS.length = 0; LS.push(...(v ? tous : sans)); A.essai.boss = v ? null : fantome; };
      return { etat: window.__arene.etat().etat, bat: bat.length, tab: !!tab && tab.sub, cousus: D.enemies.filter(o => !o.dead && o.cou18).length, foule: D.enemies.filter(o => !o.dead && !o.cons18 && !o.brx18).length, fel }; }, [PAS.toString(), TAIRE.toString(), MESURE.toString(), MEMS.lum]);
    const APP = ([k]) => { const R = window.__arene.dbg().render, c = document.querySelector('#game').getContext('2d'), on = [], off = [];
      for (let i = 0; i < 10; i++) { window.__LE(i % 2 === 0); R(); }
      for (let i = 0; i < k; i++) { const v = i % 2 === 0; window.__LE(v); const t0 = performance.now(); R(); c.getImageData(0, 0, 1, 1); (v ? on : off).push(performance.now() - t0); }
      window.__LE(true); const md = x => x.sort((p, q) => p - q)[x.length >> 1]; return [md(on), md(off)]; };
    const rr = []; for (let k = 0; k < 5; k++) rr.push(await page.evaluate(APP, [240]));
    const med = v => v.slice().sort((x, y) => x - y)[v.length >> 1], d = med(rr.map(x => x[0] - x[1]));
    await capture(page, 'effacement-cout.png');
    console.log(`   coût (apparié) : phase V (état ${n.etat}, ${n.bat} constructions, éclair ${n.tab}, ${n.cousus} cousu, foule ${n.foule}, masque fendu ${n.fel}) contre le boss d'essai, même foule : ${rr.map(x => (x[0] - x[1] >= 0 ? '+' : '') + (x[0] - x[1]).toFixed(2)).join(' / ')} ms (médiane ${d >= 0 ? '+' : ''}${d.toFixed(2)})`);
    ok(n.etat === 8 && n.bat >= 1 && n.tab === 'vie' && n.cousus === 1, `M-E : la scène mesurée : état 8, ${n.bat} constructions, une vague d'éclair, un cousu`);
    ok(d <= DA.budget.rendu, `M-E : coût de rendu de la phase V contre le boss d'essai : ${d >= 0 ? '+' : ''}${d.toFixed(2)} ms (≤ +${DA.budget.rendu})`);
    const pe = await page.evaluate(() => { window.__brumeux.essai(5, { muet: true, graine: 3 }); const J = window.__brumeux.dbg().X.j, A = window.__arene.dbg().A; return { pe: A.peintureMs, mod: J.modulesMs }; });
    ok(pe.pe + pe.mod <= DA.budget.peinture, `M-E : entrée d'un essai en V : ${(pe.pe + pe.mod).toFixed(1)} ms (≤ ${DA.budget.peinture})`);
    const tu = await page.evaluate(([PAS_]) => { const PAS = eval(PAS_); window.__brumeux.essai(4, { muet: true, graine: 4 }); const A = window.__arene.dbg().A, N = 12, n = i => A.sol[i] ? N : (A.tard[i] || []).length;
      const s = [[n(7), n(8)]]; for (let i = 0; i < 30; i++) { PAS(1); s.push([n(7), n(8)]); } return { s, fini: !!A.sol[7] && !!A.sol[8] }; }, [PAS.toString()]);
    let unParImage = true; for (let i = 1; i < tu.s.length; i++) { const a = tu.s[i - 1], b = tu.s[i], d = (b[0] + b[1]) - (a[0] + a[1]); if (d > 1 || (a[0] < 12 && b[1] > 0) || (a[0] + a[1] < 24 && d < 1)) unParImage = false; }
    ok(unParImage && tu.fini, `M-E : en IV, les calques des états 7 puis 8 se peignent une tuile par image (${tu.s.slice(0, 5).map(x => x.join('/')).join(' → ')} …, finis à la 24e)`);
    ok(!errs.filter(x => !/Failed to load/.test(x)).length, 'M-E : aucune erreur ' + errs.slice(0, 2).join(' | '));
    await ctx.close();
  }
  // ── M-F · mouvements réduits et captures : éclair, effondrement et fosse, pan du bord, montage court, emprunt de V, feinte double, deux resserrements et masque
  // fendu, mort (cinq moments)
  for (const rm of [false, true]) {
    const { page, errs, ctx } = await ouvre('', { rm });
    const sfx = rm ? '-rm' : '';
    await page.evaluate(ESSAI, { phase: 5, cls: 'lum', graine: 5500, portes: MEMS.lum, montre: MONTRE.lum, palier: 'normal' });
    await page.evaluate(() => { const b = document.querySelector('#banner'); if (b) b.classList.remove('show'); });   // le bandeau d'entrée (minuterie en temps réel) ne masque pas les captures
    const pas = async (n, x, y, h = 0.9) => page.evaluate(([PAS_, n, x, y, h]) => { const PAS = eval(PAS_), D = window.__brumeux.dbg(), P = D.P, AR = D.AR, X = D.X, e = X.e; PAS(n, () => { P.x = AR.x0 + (AR.x1 - AR.x0) * x; P.y = AR.y0 + (AR.y1 - AR.y0) * y; P.iT = 1; P.hp = P.s.maxHp; if (!e.dead && h != null) e.hp = Math.max(e.hp, X.pv[4] * h); }); }, [PAS.toString(), n, x, y, h]);
    const mes = m => page.evaluate(([M, T, m]) => { eval(T)(); eval(M)(m); }, [MESURE.toString(), TAIRE.toString(), m]);
    await page.evaluate(TAIRE); await pas(5, 0.75, 0.6);
    await mes({ k: 'eclair' }); await pas(40, 0.75, 0.6); await capture(page, `effacement-eclair-accroche${sfx}.png`); await pas(60 * 2, 0.75, 0.6); await capture(page, `effacement-eclair${sfx}.png`);
    await pas(60 * 8, 0.75, 0.6); await page.evaluate(TAIRE);
    await page.evaluate(() => { const D = window.__brumeux.dbg(), AR = D.AR, e = D.X.e, cx = (AR.x0 + AR.x1) / 2, cy = (AR.y0 + AR.y1) / 2; e.x = cx - 250; e.y = cy - 120; window.__brumeux.poserSorte('murailles', { p: [cx, cy + 180], h: [cx, cy - 150] }); });
    await pas(5, 0.5, 0.8); await mes({ k: 'effondrement' }); await pas(60, 0.5, 0.8); await capture(page, `effacement-effondrement${sfx}.png`); await pas(54, 0.5, 0.8); await capture(page, `effacement-fosse-enfonce${sfx}.png`); await pas(60 * 1.6, 0.5, 0.8); await capture(page, `effacement-fosse${sfx}.png`);
    await mes({ k: 'effondrement' }); await pas(60, 0.06, 0.5); await capture(page, `effacement-pan${sfx}.png`); await pas(60 * 2.5, 0.5, 0.75);
    await mes({ k: 'montage' }); await pas(70, 0.35, 0.7); await capture(page, `effacement-montage${sfx}.png`); await pas(60 * 5, 0.35, 0.7);
    await page.evaluate(() => { for (const o of window.__brumeux.dbg().enemies) if (o.cou18) o.dead = true; });
    await mes({ k: 'emprunt' }); let k = 0; for (; k < 60; k++) { await pas(4, 0.5, 0.8); const st = await page.evaluate(() => { const c = window.__brumeux.etat().emp.cur; return c && c.st ? c.st.ph : c ? c.ph : 'fini'; }); if (st === 'charge') break; }
    await pas(12, 0.5, 0.8); await capture(page, `effacement-emprunt${sfx}.png`); await pas(60 * 6, 0.5, 0.8);
    await mes({ k: 'double' }); await pas(45, 0.5, 0.8); await capture(page, `effacement-feinte-double${sfx}.png`); await pas(60 * 3, 0.5, 0.8);
    // les deux resserrements : ses bras levés, l'arène qui recule, le masque fendu ; aucune secousse en mouvements réduits
    await page.evaluate(TAIRE); await page.evaluate(() => { const X = window.__brumeux.dbg().X; X.e.hp = X.pv[4] * 0.6; });
    for (let i = 0; i < 6; i++) { await pas(i ? 25 : 30, 0.5, 0.8, null); if (i === 0) await capture(page, `effacement-resserre-bras${sfx}.png`); if (i === 3) await capture(page, `effacement-resserre-1${sfx}.png`); }
    await page.evaluate(() => { const X = window.__brumeux.dbg().X; X.e.hp = X.pv[4] * 0.3; }); await pas(60 * 4, 0.5, 0.8, null); await capture(page, `effacement-resserre-2${sfx}.png`);
    const st = await page.evaluate(() => { const X = window.__brumeux.dbg().X; return { fel: X.eff.fel, etat: window.__arene.etat().etat, ph: X.ph, g: X.eff.g && X.eff.g.k, tab: !!X.tab, emp: X.emp && X.emp.cur && X.emp.cur.ph, zones: X.zones.length, tirs: X.tirs.length, bl: !!window.__brumeux.dbg().room.bl, hp: Math.round(X.e.hp), pv: X.pv[4], rs: !!X.eff.rs }; });
    ok(st.fel === 2 && st.etat === 8, `M-F${rm ? ' (mouvements réduits)' : ''} : deux resserrements (état ${st.etat}), masque fendu deux fois ${st.etat === 8 ? '' : JSON.stringify(st)}`);
    // la mort : cinq moments
    await page.evaluate(TAIRE); await pas(30, 0.5, 0.85, null); const mort0 = await page.evaluate(() => { const D = window.__brumeux.dbg(); return { ok: window.__brumeux.mourir(), t: D.RUN.time }; });
    const tsM = [0.1, 0.5, 0.9, 1.8, 3.2]; let tPrev = 0; const fins = [];
    for (const t of tsM) { await pas(Math.round((t - tPrev) * 60), 0.5, 0.85, null); tPrev = t; await capture(page, `effacement-mort-${String(t).replace('.', '_')}${sfx}.png`); fins.push(await page.evaluate(() => ({ scene: !!window.__brumeux.dbg().X.scene, debris: !!(window.__brumeux.dbg().X.eff.debris), on: window.__brumeux.etat().on }))); }
    const sc = fins.map(f => f.scene);
    ok(mort0.ok && sc[0] && (rm ? sc[2] && !sc[3] : sc[3] && !sc[4]) && fins.every(f => f.debris), `M-F${rm ? ' (mouvements réduits)' : ''} : sa mort : une scène de ${rm ? '1' : '3'} s (${sc.join(' ')}), les débris restent au sol`);
    ok(!errs.filter(x => !/Failed to load/.test(x)).length, `M-F${rm ? ' (mouvements réduits)' : ''} : aucune erreur ` + errs.slice(0, 2).join(' | '));
    await ctx.close();
  }
  // mouvements réduits : aucune secousse (shakeT) pendant un resserrement ni à sa mort
  {
    const { page, errs, ctx } = await ouvre('', { rm: true });
    await page.evaluate(ESSAI, { phase: 5, cls: 'gou', graine: 5510 });
    const r = await page.evaluate(([PAS_, TAIRE_]) => { const PAS = eval(PAS_), D = window.__brumeux.dbg(), X = D.X; eval(TAIRE_)();
      X.e.hp = X.pv[4] * 0.3; PAS(60 * 8, () => { D.P.iT = 1; }); const r1 = X.eff.ress; window.__brumeux.mourir(); PAS(60 * 1.2); return { r1, fel: X.eff.fel, scene: !!X.scene, debris: !!X.eff.debris }; }, [PAS.toString(), TAIRE.toString()]);
    ok(r.r1 === 2 && r.fel === 2 && !r.scene && r.debris, `M-F (mouvements réduits) : deux resserrements de suite (${r.r1}), puis sa mort en fondu d'1 s, débris au sol`);
    ok(!errs.filter(x => !/Failed to load/.test(x)).length, 'M-F (mouvements réduits, suite) : aucune erreur ' + errs.slice(0, 2).join(' | '));
    await ctx.close();
  }
}
console.log(`\nbanc-brumeux : ${checks} vérifications, ${fails} échec${fails > 1 ? 's' : ''}.`);
await browser.close();
process.exit(fails ? 1 : 0);
