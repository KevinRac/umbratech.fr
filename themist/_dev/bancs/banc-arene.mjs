// Banc Chromium : v18.4, action 4 (l'arène large, la caméra, les signes de bord). Usage :
//   node banc-arene.mjs <port> [sections, ex. ABCDEFG] [dossier de captures, hors dépôt]
// A. Caméra : coins, centre, boss loin, trajets scriptés ; vue dans ses limites, joueur dans le garde-fou ; bornes de phase ; sortie de l'arène
//    (AR, MONDE, CAM remis, aucune assertion) ; l'arène allumée à la main (__arene.activer(true)) s'ouvre au boss final, pas ailleurs.
// B. Signes de bord : tirs et télégraphes depuis le hors-champ, boss loin, élite, ordinaires regroupés ; captures relues.
// C. Coût : image de l'arène pleine (boss d'essai, 20 ennemis, 10 signes, 30 lumières) contre une salle d'élite au même contenu (≤ +1,5 ms) ;
//    peinture des tuiles à l'entrée (≤ 250 ms). Mesures rejouées si la machine est chargée.
// D. Mouvements réduits (sans avance, zone morte 320 × 180) et tailles d'écran (640 × 360, 1 280 × 720, 2 560 × 1 440, portrait 390 × 844) :
//    signes jamais sous le HUD, vue sûre tenable.
// E. Souris : la visée va sous le curseur après un glissement de caméra, sans bouger la souris.
// F. Journal des coups : 3 combats d'essai conduits (bot=1, dieu=1, boss d'essai, tirs), avec deux transformations : aucun coup sans signe.
// G. Règle d'or : l'index.html d'avant (BANC_AVANT, défaut 888578f depuis v18.7 : le clone peut ne pas avoir les commits plus anciens) et celui d'après rejouent la même descente (copie instrumentée : graine,
//    horloge à la main) et comparent CHAQUE image du canevas (titre, Sanctuaire, combat, élite, Brèche, halte, autel, colporteur, gardiens I à III,
//    gardiens provisoires, miniboss, boss final provisoire) dans les trois paliers : aucune différence de pixel. BANC_TEMOIN=1 : d'après contre d'après.
//    BANC_IMAGES=n : images par salle (défaut 180) ; BANC_APRES=<fichier> : comparer une autre copie (contre-épreuve).
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire('/opt/npm-tools/node_modules/');
const { chromium } = require('playwright');
const THEMIST = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PORT = process.argv[2] || 8765, SEC = (process.argv[3] || 'ABCDEFG').toUpperCase(), DIR = process.argv[4] || null;
const BASE = `http://127.0.0.1:${PORT}/index.html`;
if (DIR) mkdirSync(DIR, { recursive: true });
let fails = 0, checks = 0;
const ok = (c, m) => { checks++; if (!c) { fails++; console.error('ÉCHEC : ' + m); } else console.log('ok · ' + m); };
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', args: ['--autoplay-policy=no-user-gesture-required'] });
const DA = (() => { const w = {}; new Function('window', readFileSync(join(THEMIST, 'data', 'arene.js'), 'utf8'))(w); return w.BRUME_DATA.arene; })();

// la page réelle, horloge retenue (le banc fait les pas : __brume.step, et dessine : __arene.dbg().frame())
async function ouvre(qs, o = {}) {
  const ctx = await browser.newContext({ viewport: o.vp || { width: 1280, height: 720 }, deviceScaleFactor: o.dpr || 1, reducedMotion: o.rm ? 'reduce' : 'no-preference' });
  await ctx.addInitScript(() => { window.__raf = []; window.requestAnimationFrame = cb => { window.__raf.push(cb); return 1; }; });
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 300)));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text().slice(0, 300)); });
  await page.goto(`${BASE}${qs ? '?' + qs : ''}`);
  await page.waitForFunction(() => !!(window.__arene && window.__brume && window.__descente && window.__asm), null, { timeout: 30000 });
  // la boucle ne tourne pas d'elle-même : on lance le premier cadre pour démarrer, puis le banc fait les pas
  await page.evaluate(() => { const q = window.__raf.splice(0); for (const f of q) f(performance.now()); });
  return { page, errs, ctx };
}
// ouvrir l'arène d'essai dans une page (sans attendre le chargement différé du paramètre d'URL)
const ESSAI = (o) => { const r = window.__arene.essai('final', o); const B = window.__brume; for (let i = 0; i < 3; i++) B.step(1 / 60, 1); return r; };
const VIDE = () => { const o = document.querySelector('#overlay'); if (o.hidden) return; const b = o.querySelector('#bok') || o.querySelector('.card:not([disabled])') || o.querySelector('button.primary:not([disabled])'); if (b) b.click(); };
const PAS = (n, f) => { const B = window.__brume; for (let i = 0; i < n; i++) { const o = document.querySelector('#overlay'); if (!o.hidden) { const b = o.querySelector('#bok') || o.querySelector('.card:not([disabled])') || o.querySelector('button.primary:not([disabled])'); if (b) b.click(); } if (f) f(i); B.step(1 / 60, 1); } };
async function capture(page, nom) { if (!DIR) return; await page.evaluate(() => window.__arene.dbg().frame()); await page.screenshot({ path: join(DIR, nom) }); console.log('   capture ' + join(DIR, nom)); }

// ═══ A. Caméra ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
if (SEC.includes('A')) {
  console.log('\n══ A · caméra ══');
  const { page, errs, ctx } = await ouvre('');
  const e = await page.evaluate(ESSAI, { foule: 0, boss: true, dieu: true });
  ok(e && e.monde[0] === 2560 && e.monde[1] === 1080 && e.peintureMs < DA.budget.peinture, `A : l’arène d’essai s’ouvre (${e && e.monde.join(' × ')}, peinte en ${e && e.peintureMs} ms ≤ ${DA.budget.peinture})`);
  const r = await page.evaluate(([PAS_]) => { const PAS = eval(PAS_), X = window.__arene, D = X.dbg(), out = [];
    const G = X.DA.camera.garde, mg = X.DA.vue.marges, M = D.A.M;
    const verif = (nom) => { const c = X.cam(), s = c.sure, v = c.vue, P = D.P, e = 1e-6, li = { x0: Math.max(0, D.AR.x0 - 56), y0: Math.max(0, D.AR.y0 - 92), x1: Math.min(M.w, D.AR.x1 + 56), y1: Math.min(M.h, D.AR.y1 + 44) };
      const garde = (P.x - s.x0 >= G.x - e || v.x0 <= li.x0 + e) && (s.x1 - P.x >= G.x - e || v.x1 >= li.x1 - e) && (P.y - s.y0 >= G.y - e || v.y0 <= li.y0 + e) && (s.y1 - P.y >= G.y - e || v.y1 >= li.y1 - e);
      const dedans = v.x0 >= li.x0 - e && v.x1 <= li.x1 + e && v.y0 >= li.y0 - e && v.y1 <= li.y1 + e;
      out.push({ nom, garde, dedans, cam: [Math.round(c.x), Math.round(c.y)], P: [Math.round(P.x), Math.round(P.y)] }); };
    const tp = (x, y, n) => { const P = D.P; P.x = x; P.y = y; PAS(n || 90, () => { P.iT = 1; }); };
    const B = D.boss(); if (B) { B.x = M.w - 200; B.y = 150; B.wp = { x: B.x, y: B.y }; }
    tp(M.w / 2, M.h / 2); verif('centre');
    tp(80, 120); verif('coin haut-gauche'); tp(M.w - 80, 120); verif('coin haut-droit'); tp(M.w - 80, M.h - 60); verif('coin bas-droit'); tp(80, M.h - 60); verif('coin bas-gauche');
    // trajets scriptés : marche à droite (touches), ruée simulée (déplacement de 900 px/s), téléportation
    const P = D.P; let pire = true;
    D.keys.add('KeyD'); PAS(240, () => { P.iT = 1; const c = X.cam(), s = c.sure; if (P.x - s.x0 < G.x - 1e-6 && c.vue.x0 > 1e-6 || s.x1 - P.x < G.x - 1e-6 && c.vue.x1 < M.w - 1e-6) pire = false; }); D.keys.delete('KeyD');
    let ruee = true; PAS(40, i => { const c = X.cam(), s = c.sure; if (i && P.x - s.x0 < G.x - 1e-6 && c.vue.x0 > 1e-6) ruee = false; P.x = Math.max(D.AR.x0 + 20, P.x - 15); P.iT = 1; });
    verif('après ruée');
    // boss loin : son signe au bord, et le cadrage glisse vers lui sans perdre le joueur
    { P.x = 300; P.y = M.h / 2; PAS(120, () => { P.iT = 1; if (B) { B.x = M.w - 200; B.y = 150; } }); } const bossSigne = X.indic().some(s => s.ks.includes('boss')); verif('boss loin');
    return { out, marche: pire, ruee, bossSigne }; }, [PAS.toString()]);
  for (const o of r.out) ok(o.garde && o.dedans, `A : ${o.nom} : vue dans ses limites, joueur dans le garde-fou (caméra ${o.cam}, joueur ${o.P})`);
  ok(r.marche, 'A : marche continue : le garde-fou tient (ou la vue est contre le mur)');
  ok(r.ruee, 'A : ruée (15 px par image) : la caméra rattrape d’un coup, le joueur reste dans le garde-fou');
  ok(r.bossSigne, 'A : boss loin, son signe (glyphe dans l’anneau ivoire) est au bord');
  await capture(page, 'arene-boss-loin.png');
  // bornes de phase plus étroites que la vue : caméra centrée, fixe
  const b = await page.evaluate(([PAS_]) => { const PAS = eval(PAS_), X = window.__arene, D = X.dbg(); X.vers(1); PAS(60 * 10, () => { D.P.iT = 1; });
    const E = X.etat(), c1 = X.cam(); PAS(60, () => { D.P.x += 1; D.P.iT = 1; }); const c2 = X.cam(); return { E, c1: [c1.x, c1.y], c2: [c2.x, c2.y], AR: E.AR }; }, [PAS.toString()]);
  ok(!b.E.trans && b.E.etat === 1, 'A : transformation vers l’état 1 terminée');
  ok(b.c1[0] === b.c2[0] && b.c1[1] === b.c2[1], `A : bornes de phase plus petites que la vue : caméra fixe (${b.c1.map(Math.round)})`);
  await capture(page, 'arene-etat-1.png');
  // sortie de l'arène : une salle ordinaire, puis le Sanctuaire ; AR, MONDE et CAM remis, aucune assertion
  const s = await page.evaluate(([PAS_]) => { const PAS = eval(PAS_), X = window.__arene, D = X.dbg(); window.__asm.dbg().entrer('combat'); PAS(30);
    const d = X.dbg(), r1 = { AR: Object.assign({}, d.AR), AR0: Object.assign({}, d.AR0), M: Object.assign({}, d.MONDE), cam: [d.CAM.x, d.CAM.y, d.CAM.on], assertions: X.journal().assertions, type: d.room.type, arene: !!d.room.arene };
    return r1; }, [PAS.toString()]);
  ok(JSON.stringify(s.AR) === JSON.stringify(s.AR0) && s.M.w === 1280 && s.M.h === 720 && s.cam.join() === '0,0,false' && !s.arene, 'A : salle suivante : AR = AR0, monde = écran, CAM nul et éteint');
  ok(s.assertions === 0, 'A : aucune assertion levée (AR jamais gardé hors de l’arène)');
  ok(!errs.length, 'A : aucune erreur ' + errs.slice(0, 2).join(' | '));
  await ctx.close();
  // allumée à la main : l'arène s'ouvre au boss final (porte « final »), pas au miniboss ; éteinte (données), rien
  for (const allume of [false, true]) {
    const { page, errs, ctx } = await ouvre('');
    const r = await page.evaluate(([v, PAS_]) => { const PAS = eval(PAS_), X = window.__arene; if (v) X.activer(true);
      const B = window.__brume; B.SAVE.descente = { v: 1, ouverts: ['normal'], choisi: 'normal', victoires: {} }; B.cls('lum'); B.start(); PAS(5);
      window.__descente.essai(10); PAS(30); const mini = { type: X.dbg().room.type, arene: !!X.dbg().room.arene, cam: X.dbg().CAM.on };
      window.__descente.essai(10, { fin: true }); PAS(30); const fin = { type: X.dbg().room.type, gardeK: X.dbg().room.gardeK, arene: !!X.dbg().room.arene, cam: X.dbg().CAM.on, M: [X.dbg().MONDE.w, X.dbg().MONDE.h] };
      return { mini, fin }; }, [allume, PAS.toString()]);
    ok(!r.mini.arene && !r.mini.cam, `A : ${allume ? 'allumée' : 'éteinte'} : le miniboss reste une salle d’un écran`);
    ok(allume ? (r.fin.arene && r.fin.cam && r.fin.M.join() === '2560,1080' && r.fin.gardeK === 'final') : (!r.fin.arene && !r.fin.cam && r.fin.M.join() === '1280,720'), `A : ${allume ? 'allumée : le boss final ouvre l’arène' : 'éteinte (actif:false) : le boss final reste une salle d’un écran'} (${JSON.stringify(r.fin)})`);
    ok(!errs.length, 'A : aucune erreur ' + errs.slice(0, 2).join(' | '));
    await ctx.close();
  }
}

// ═══ B. Signes de bord ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════
if (SEC.includes('B')) {
  console.log('\n══ B · signes de bord ══');
  const { page, errs, ctx } = await ouvre('');
  await page.evaluate(ESSAI, { foule: 14, boss: true, tirs: true, dieu: true });
  const r = await page.evaluate(([PAS_]) => { const PAS = eval(PAS_), X = window.__arene, D = X.dbg(), M = D.A.M, P = D.P, vus = {}, coupes = [];
    P.x = M.w / 2; P.y = M.h / 2; const B = D.boss(); B.x = 150; B.y = 150; B.wp = { x: 150, y: 150 };
    let max = 0, horsSure = 0, n = 0, el = null;
    PAS(60 * 14, i => { P.iT = 1; P.x = M.w / 2; P.y = M.h / 2; const v = X.cam().vue;
      // un télégraphe qui naît juste hors de la vue, et le Masqué (élite) tenu hors de vue un moment
      if (i % 150 === 75) B.zones.push({ k: 'disque', x: v.x1 + 120, y: (v.y0 + v.y1) / 2, r: 80, t: 0, charge: 1.4, vise: false });
      if (!el || el.dead) { el = D.enemies.find(e => !e.dead && e.type !== 'boss'); if (el) el.elite = true; }
      if (el && i % 300 < 90) { el.x = Math.max(D.AR.x0 + 40, v.x0 - 500); el.y = (v.y0 + v.y1) / 2; }
      const L = X.indic(), c = X.cam(), sure = c.sure, hb = c.hud.blocs; max = Math.max(max, L.length);
      for (const s of L) { for (const k of s.ks) vus[k] = (vus[k] || 0) + 1; n++;
        const ins = s.x >= sure.x0 - 1e-6 && s.x <= sure.x1 + 1e-6 && s.y >= sure.y0 - 1e-6 && s.y <= sure.y1 + 1e-6; if (!ins) horsSure++;
        for (const b of hb) if (s.sx > b.x0 && s.sx < b.x1 && s.sy > b.y0 && s.sy < b.y1) horsSure++; }
      if (i === 60 * 6 || i === 60 * 11) coupes.push(L.map(s => s.k + (s.n > 1 ? '×' + s.n : '')).join(' ')); });
    return { vus, max, horsSure, n, coupes, j: X.journal() }; }, [PAS.toString()]);
  console.log('   signes vus (images) : ' + JSON.stringify(r.vus) + ' ; instantanés : ' + r.coupes.join(' | '));
  for (const k of ['tele', 'proj', 'boss', 'elite', 'ord']) ok((r.vus[k] || 0) > 0, `B : signe « ${k} » posé au bord`);
  ok(r.max <= 10, `B : jamais plus de 10 signes (au plus ${r.max})`);
  ok(r.horsSure === 0, `B : tous dans la vue sûre, hors des blocs du HUD (${r.n} signes relevés)`);
  ok(r.j.sansSigne === 0, `B : aucun coup sans signe (${r.j.coups} coups)`);
  await capture(page, 'arene-signes.png');
  // une capture contrôlée : un télégraphe qui vise hors champ, un tir, le boss, un élite, des ordinaires regroupés
  await page.evaluate(([PAS_]) => { const PAS = eval(PAS_), X = window.__arene, D = X.dbg(), P = D.P, M = D.A.M; P.x = M.w / 2; P.y = M.h / 2; PAS(30, () => { P.iT = 1; }); }, [PAS.toString()]);
  await capture(page, 'arene-signes-2.png');
  ok(!errs.length, 'B : aucune erreur ' + errs.slice(0, 2).join(' | '));
  await ctx.close();
}

// ═══ C. Coût ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
if (SEC.includes('C')) {
  console.log('\n══ C · coût ══');
  const MESURE = ([n]) => { const D = window.__arene.dbg(), cv = document.querySelector('#game'), c = cv.getContext('2d');
    const t = []; for (let k = 0; k < 5; k++) D.render(); for (let k = 0; k < n; k++) { const t0 = performance.now(); D.render(); c.getImageData(0, 0, 1, 1); t.push(performance.now() - t0); }
    t.sort((a, b) => a - b); return { med: t[Math.floor(n / 2)], moy: t.reduce((a, b) => a + b, 0) / n }; };
  // même contenu : 20 ennemis ordinaires, 30 lumières ; arène : + boss d'essai et ses zones, 10 signes
  async function salle(arene) {
    const { page, errs, ctx } = await ouvre('');
    const p = arene ? await page.evaluate(ESSAI, { foule: 0, boss: true, dieu: true }) : await page.evaluate(() => { const B = window.__brume; B.SAVE.descente = { v: 1, ouverts: ['normal'], choisi: 'normal', victoires: {} }; B.cls('lum'); B.start(); window.__descente.essai(10, { fin: true }); for (let i = 0; i < 3; i++) B.step(1 / 60, 1); return null; });
    // remplir : une vague posée à la main (le jeu crée lui-même les ennemis), étourdis pour rester en place
    const n = await page.evaluate(([arene, PAS_]) => { const PAS = eval(PAS_), X = window.__arene, D = X.dbg(), room = D.room, P = D.P;
      room.waves = []; room.waveI = 0; room.spawning = []; for (const e of D.enemies) e.dead = true;
      const t = ['rampant', 'spectre', 'brute', 'hurleur', 'voile'], cx = D.CAM.x, cy = D.CAM.y, w = [];
      // salle ordinaire : 20 à l'écran ; arène : 10 à l'écran, 10 hors de vue tout autour (gauche, droite, haut : un signe chacun)
      const hors = [[-260, 220], [-260, 420], [-260, 620], [1540, 220], [1540, 420], [1540, 620], [160, -150], [480, -150], [800, -150], [1120, -150]];
      for (let i = 0; i < 20; i++) { const dans = !arene || i < 10, h = hors[i - 10];
        w.push({ type: t[i % 5], x: dans ? cx + 180 + (i % 5) * 220 : Math.min(D.AR.x1 - 40, Math.max(D.AR.x0 + 40, cx + h[0])), y: dans ? cy + 210 + Math.floor((i % 10) / 5) * 150 + (i >= 10 ? 75 : 0) : Math.min(D.AR.y1 - 40, Math.max(D.AR.y0 + 40, cy + h[1])) }); }
      room.waves = [w]; room.sinceWave = 1; room.cleared = false;
      PAS(80, () => { P.iT = 2; P.x = cx + 640; P.y = cy + 420; for (const e of D.enemies) { e.stun = 1; e.tok = null; } });
      const L = D.tlights(); for (let i = 0; i < 30; i++) L.push({ x: cx + 80 + (i % 10) * 120, y: cy + 150 + Math.floor(i / 10) * 180, r: 90, t: 1e9, max: 1e9, c: ['warm', 'cold', 'violet'][i % 3] });
      if (arene) { const b = X.dbg().boss(); if (b) { b.x = cx + 1280 + 500; b.y = cy + 300; b.wp = { x: b.x, y: b.y }; b.zones = [{ k: 'disque', x: cx + 640, y: cy + 400, r: 90, t: 0.3, charge: 1e9, vise: true }, { k: 'disque', x: cx - 200, y: cy + 300, r: 90, t: 0.3, charge: 1e9, vise: true }]; } }
      PAS(2, () => { P.iT = 2; for (const e of D.enemies) e.stun = 1; });
      return { vivants: D.enemies.filter(e => !e.dead).length, signes: X.indic().length, lumieres: D.tlights().length }; }, [arene, PAS.toString()]);
    return { page, errs, ctx, p, n };
  }
  const A = await salle(true), O = await salle(false);
  console.log(`   contenu : arène ${JSON.stringify(A.n)} ; salle d’élite ${JSON.stringify(O.n)}`);
  ok(A.n.vivants >= 18 && O.n.vivants >= 18 && A.n.signes >= 8, `C : contenu comparable (20 ennemis, 30 lumières ; arène : ${A.n.signes} signes)`);
  // mesures appariées et alternées (arène, élite, arène, élite…) : la charge de la machine pèse pareil sur les deux ; médiane des écarts.
  // Rejouées (jusqu'à trois séries) si l'écart dépasse le budget : on a vu au § 33 que le coût mesuré varie de ±0,8 ms.
  let pire = null;
  for (let serie = 0; serie < 3; serie++) {
    const ds = [], ra = [], ro = [];
    for (let k = 0; k < 9; k++) { const a = (await A.page.evaluate(MESURE, [150])).med, o = (await O.page.evaluate(MESURE, [150])).med; ra.push(a); ro.push(o); ds.push(a - o); }
    const med = v => v.slice().sort((x, y) => x - y)[v.length >> 1], d = med(ds);
    console.log(`   série ${serie + 1} : arène ${med(ra).toFixed(2)} ms, salle d’élite ${med(ro).toFixed(2)} ms, écart médian ${d >= 0 ? '+' : ''}${d.toFixed(2)} ms (écarts ${ds.map(x => x.toFixed(1)).join(' ')})`);
    pire = { a: med(ra), o: med(ro), d }; if (d <= DA.budget.rendu) break;
  }
  ok(pire.d <= DA.budget.rendu, `C : une image de l’arène pleine coûte ${pire.d >= 0 ? '+' : ''}${pire.d.toFixed(2)} ms de plus qu’une salle d’élite au même contenu (≤ +${DA.budget.rendu})`);
  const t = await A.page.evaluate(() => window.__arene.mesure());
  const NE = DA.salles.final.etats.filter(E => !E.tard).length;   // v18.7 : un état « tard » (la phase II du Brumeux) n'est pas peint à l'entrée
  ok(t.tuilesPosees <= 9 && t.tuiles === 12 && t.calques === NE, `C : ${t.tuilesPosees} tuiles posées sur ${t.tuiles} (≤ 9), ${t.calques} calques (un par état d'arène peint à l'entrée : ${NE}, l'état réel de la phase I du Brumeux compris depuis v18.6 ; l'état « tard » de la phase II attend le Brumeux)`);
  // peinture à l'entrée, trois entrées
  const ps = []; for (let k = 0; k < 3; k++) { const p = await A.page.evaluate(ESSAI, { foule: 0 }); ps.push(p.peintureMs); }
  ok(Math.max(...ps) <= DA.budget.peinture, `C : peinture des tuiles à l’entrée ${ps.map(x => x.toFixed(0)).join(' / ')} ms (≤ ${DA.budget.peinture}, ${12 * DA.salles.final.etats.filter(E => !E.tard).length} tuiles)`);
  ok(!A.errs.length && !O.errs.length, 'C : aucune erreur ' + A.errs.concat(O.errs).slice(0, 2).join(' | '));
  await A.ctx.close(); await O.ctx.close();
}

// ═══ D. Mouvements réduits et tailles d'écran ═════════════════════════════════════════════════════════════════════════════════════════
if (SEC.includes('D')) {
  console.log('\n══ D · mouvements réduits, tailles d’écran ══');
  {
    const { page, errs, ctx } = await ouvre('', { rm: true });
    await page.evaluate(ESSAI, { foule: 0, boss: true, dieu: true });
    const r = await page.evaluate(([PAS_]) => { const PAS = eval(PAS_), X = window.__arene, D = X.dbg(), P = D.P, M = D.A.M; let av = 0;
      P.x = M.w / 2; P.y = M.h / 2; PAS(240, () => { P.iT = 1; av = Math.max(av, Math.hypot(D.A.cam.ax, D.A.cam.ay)); });
      const c0 = X.cam(), cx = c0.x + 640, cy = c0.y + 360; PAS(90, i => { P.iT = 1; P.x = cx + 150 * Math.sin(i / 10); P.y = cy + 80 * Math.cos(i / 10); });
      const c1 = X.cam(); D.keys.add('KeyD'); PAS(120, () => { P.iT = 1; av = Math.max(av, Math.hypot(D.A.cam.ax, D.A.cam.ay)); }); D.keys.delete('KeyD');
      return { rm: matchMedia('(prefers-reduced-motion: reduce)').matches, av, fixe: Math.abs(c0.x - c1.x) < 1e-6 && Math.abs(c0.y - c1.y) < 1e-6 }; }, [PAS.toString()]);
    ok(r.rm && r.av === 0, 'D : mouvements réduits : aucune avance de caméra');
    ok(r.fixe, 'D : mouvements réduits : de petits pas (±150 × ±80 px autour du centre de la vue) dans la zone morte 320 × 180 ne font pas bouger l’écran');
    ok(!errs.length, 'D : aucune erreur ' + errs.slice(0, 2).join(' | '));
    await capture(page, 'arene-rm.png');
    await ctx.close();
  }
  for (const [w, h] of [[640, 360], [1280, 720], [2560, 1440], [390, 844]]) {
    const { page, errs, ctx } = await ouvre('', { vp: { width: w, height: h } });
    await page.evaluate(ESSAI, { foule: 16, boss: true, tirs: true, dieu: true });
    const r = await page.evaluate(([PAS_]) => { const PAS = eval(PAS_), X = window.__arene, D = X.dbg(), P = D.P, M = D.A.M;
      const hud = () => { const cv = document.querySelector('#game').getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2), sc = Math.min(cv.width * dpr / 1280, cv.height * dpr / 720), ox = (cv.width * dpr - 1280 * sc) / 2, oy = (cv.height * dpr - 720 * sc) / 2;
        const g = (x, y) => [((x - cv.left) * dpr - ox) / sc, ((y - cv.top) * dpr - oy) / sc], out = [];
        for (const s of ['#hud .hud-tl', '#hud .hud-tr', '#hud .hud-bl', '#hSkills', '#hState']) { const e = document.querySelector(s); if (!e) continue; const q = e.getBoundingClientRect(); if (!q.width || !q.height || getComputedStyle(e).display === 'none') continue; const a = g(q.left, q.top), z = g(q.right, q.bottom); out.push({ s, x0: a[0], y0: a[1], x1: z[0], y1: z[1] }); }
        return out; };
      let sous = 0, n = 0, ex = null; P.x = M.w / 2; P.y = M.h / 2;
      PAS(60 * 8, i => { P.iT = 1; P.x = M.w / 2; P.y = M.h / 2; if (i % 20) return; const H = hud(); for (const s of X.indic()) { n++; const t = 8; for (const b of H) if (s.sx + t > b.x0 && s.sx - t < b.x1 && s.sy + t > b.y0 && s.sy - t < b.y1) { sous++; ex = ex || { k: s.k, at: [Math.round(s.sx), Math.round(s.sy)], sous: b.s }; } } });
      const c = X.cam(); return { sous, n, ex, m: c.hud.m, blocs: c.hud.blocs.length, j: X.journal().sansSigne }; }, [PAS.toString()]);
    console.log(`   ${w} × ${h} : marges mesurées h ${r.m.h.toFixed(0)} b ${r.m.b.toFixed(0)}, ${r.blocs} bloc(s), ${r.n} signes relevés${r.ex ? ', exemple sous le HUD : ' + JSON.stringify(r.ex) : ''}`);
    ok(r.sous === 0, `D : ${w} × ${h} : aucun signe sous le HUD (${r.sous} sur ${r.n})`);
    ok(r.n > 0 && r.j === 0, `D : ${w} × ${h} : des signes posés, aucun coup sans signe`);
    ok(!errs.length, `D : ${w} × ${h} : aucune erreur ` + errs.slice(0, 2).join(' | '));
    if (w === 390 || w === 640) await capture(page, `arene-${w}x${h}.png`);
    await ctx.close();
  }
}

// ═══ E. Souris ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
if (SEC.includes('E')) {
  console.log('\n══ E · souris ══');
  const { page, errs, ctx } = await ouvre('');
  await page.evaluate(ESSAI, { foule: 0, dieu: true });
  await page.mouse.move(900, 300);
  const r = await page.evaluate(([PAS_]) => { const PAS = eval(PAS_), X = window.__arene, D = X.dbg(), P = D.P, M = D.A.M, m = D.mouse, o = [];
    const lit = () => ({ sx: m.sx, sy: m.sy, x: m.x, y: m.y, cx: D.CAM.x, cy: D.CAM.y });
    P.x = 700; P.y = 600; PAS(90, () => { P.iT = 1; }); o.push(lit());
    // la caméra glisse (le joueur part à droite) ; la souris ne bouge pas
    D.keys.add('KeyD'); PAS(150, () => { P.iT = 1; }); D.keys.delete('KeyD'); o.push(lit());
    P.y = M.h - 200; PAS(90, () => { P.iT = 1; }); o.push(lit());
    // la visée : le faisceau / le regard va vers le point du monde sous le curseur
    const face = P.face, a = Math.atan2(m.y - P.y, m.x - P.x); let d = Math.abs(((face - a) % (2 * Math.PI) + 3 * Math.PI) % (2 * Math.PI) - Math.PI);
    return { o, d, face }; }, [PAS.toString()]);
  const [a, b, c] = r.o;
  ok(Math.abs(a.sx - 900) < 1 && Math.abs(a.sy - 300) < 1, `E : position écran gardée (${a.sx.toFixed(1)}, ${a.sy.toFixed(1)})`);
  ok(b.cx !== a.cx && Math.abs(b.sx - a.sx) < 1e-9, `E : la caméra a glissé (${a.cx.toFixed(0)} → ${b.cx.toFixed(0)}) sans que la souris bouge`);
  ok([a, b, c].every(q => Math.abs(q.x - (q.sx + q.cx)) < 1e-9 && Math.abs(q.y - (q.sy + q.cy)) < 1e-9), 'E : à chaque image, la visée = position écran + caméra (ce qui est sous le curseur)');
  ok(c.cy !== a.cy, `E : glissement vertical aussi (${a.cy.toFixed(0)} → ${c.cy.toFixed(0)})`);
  ok(r.d < 0.06, `E : le regard du héros va vers le point du monde sous le curseur (écart ${r.d.toFixed(3)} rad)`);
  ok(!errs.length, 'E : aucune erreur ' + errs.slice(0, 2).join(' | '));
  await ctx.close();
}

// ═══ F. Journal des coups ════════════════════════════════════════════════════════════════════════════════════════════════════════════
if (SEC.includes('F')) {
  console.log('\n══ F · journal des coups : 3 combats d’essai conduits ══');
  for (const cls of ['lum', 'gou', 'tis']) {
    const { page, errs, ctx } = await ouvre('');
    await page.evaluate(([c]) => { window.__brume.cls(c); }, [cls]);
    await page.evaluate(ESSAI, { foule: 20, boss: true, tirs: true, bot: true, dieu: true, cls });
    const r = await page.evaluate(([PAS_]) => { const PAS = eval(PAS_), X = window.__arene, D = X.dbg(); const tr = [];
      PAS(60 * 70, i => { if (i === 60 * 15) X.vers(1); if (i === 60 * 40) X.vers(2); if (i === 60 * 60) X.vers(0);
        const T = X.etat().trans; if (T && tr[tr.length - 1] !== T.ph) tr.push(T.ph); });
      const E = X.etat(), P = D.P, AR = D.AR;
      return { j: X.journal(), tr, etat: E.etat, dedans: P.x >= AR.x0 && P.x <= AR.x1 && P.y >= AR.y0 && P.y <= AR.y1, cls: P.cls, kills: D.RUN.kills }; }, [PAS.toString()]);
    console.log(`   ${cls} : ${r.j.coups} coups reçus, ${r.j.sansSigne} sans signe, ${r.j.horsVue} coups du joueur retenus hors vue, ${r.kills} ennemis abattus, transformations ${r.tr.join(' → ')}`);
    if (r.j.liste.length) console.log('   ' + JSON.stringify(r.j.liste.slice(0, 4)));
    ok(r.cls === cls && r.j.coups >= 5, `F : ${cls} : combat conduit, des coups reçus (${r.j.coups})`);
    ok(r.j.sansSigne === 0, `F : ${cls} : aucun coup sans signe depuis 0,6 s (0,8 s : boss)`);
    ok(r.etat === 0 && r.dedans && r.tr.filter(x => x === 'annonce').length >= 3, `F : ${cls} : trois transformations jouées en combat (annonce, bascule, fondu), le joueur dans les bornes`);
    ok(r.j.assertions === 0 && !errs.length, `F : ${cls} : aucune erreur ` + errs.slice(0, 2).join(' | '));
    if (cls === 'lum') await capture(page, 'arene-combat.png');
    await ctx.close();
  }
}

// ═══ G. Règle d'or : image par image, avant / après, trois paliers ═══════════════════════════════════════════════════════════════════
if (SEC.includes('G')) {
  console.log('\n══ G · règle d’or : chaque image du canevas, avant / après, trois paliers ══');
  const NF = +(process.env.BANC_IMAGES || 180), AVANT_REV = process.env.BANC_AVANT || '888578f';
  const APRES = readFileSync(process.env.BANC_APRES || join(THEMIST, 'index.html'), 'utf8');   // BANC_APRES=<fichier> : contre-épreuve (une copie modifiée doit être attrapée)
  const AVANT = process.env.BANC_TEMOIN ? APRES : execSync(`git -C ${JSON.stringify(THEMIST)} show ${AVANT_REV}:themist/index.html`, { maxBuffer: 64 << 20 }).toString('utf8');
  function HORLOGE(seed) {
    const mk = s => () => { s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    const G = window.__hg = { mk, combat: mk(seed), dessin: mk(seed ^ 0x9e3779b9), raf: [], now: 1000 };
    Math.random = () => G.combat(); performance.now = () => G.now; Date.now = () => 1767225600000 + G.now;
    window.requestAnimationFrame = cb => { G.raf.push(cb); return G.raf.length; }; window.cancelAnimationFrame = () => {};
    try { localStorage.clear(); } catch (e) {}
  }
  function DEDANS() {
    const G = window.__hg, H = window.__hgo = {};
    const r0 = render; render = function () { const k = Math.random; Math.random = () => G.dessin(); try { return r0.apply(this, arguments); } finally { Math.random = k; } };
    H.graine = s => { G.combat = G.mk(s); G.dessin = G.mk(s ^ 0x9e3779b9); };
    H.pas = () => { G.now += 1000 / 60; frame(G.now); G.raf.length = 0; };
    H.hash = () => { const d = ctx.getImageData(0, 0, cv.width, cv.height).data, u = new Uint32Array(d.buffer); let h = 2166136261, g = 0; for (let i = 0; i < u.length; i++) { h = Math.imul(h ^ u[i], 16777619); g = (g + u[i] * (i + 1)) >>> 0; } return (h >>> 0).toString(36) + (g >>> 0).toString(36); };
    H.calme = () => { MSGQ.length = 0; hintPaused = false; msgCur = null; if (overlayEl.hidden && state === 'play') paused = false; };
    H.vider = () => { const o = overlayEl; if (o.hidden) return; const b = o.querySelector('#bok') || o.querySelector('.card:not([disabled])') || o.querySelector('button.primary:not([disabled])') || [...o.querySelectorAll('button:not([disabled])')].find(b => !/reroll|quit|mute|hub|again/.test(b.id)); if (b) b.click(); };
    const ent = t => { closeOverlay(); queue.length = 0; trans = null; fade = 0; doEnter(t); };
    H.regle = (cls, palier, seed, nf) => {
      const out = []; let i = 0;
      const salle = (nom, fn) => { H.graine(seed * 1000 + (i++)); fn(); const hs = [];
        for (let f = 0; f < nf; f++) { H.calme(); if (!overlayEl.hidden && state !== 'title' && f % 15 === 14) H.vider(); H.pas(); if (P && !P.dead && state === 'play') P.hp = P.s.maxHp; hs.push(H.hash()); }
        out.push({ nom, etat: state, type: room && room.type, gardeK: room && room.gardeK || '', acte: typeof ACTE === 'function' ? ACTE() : 0, hs }); };
      salle('titre', () => initTitle());
      salle('sanctuaire', () => enterHub());
      salle('combat I', () => { SAVE.descente = { v: 1, ouverts: ['normal', 'difficile', 'extreme'], choisi: palier, victoires: {} }; chosenCls = cls; startRun(); window.__descente.palier(palier); closeOverlay(); queue.length = 0; trans = null; fade = 0; });
      salle('élite I', () => ent('elite')); salle('Brèche I', () => ent('breche')); salle('halte I', () => ent('halte')); salle('autel I', () => ent('autel')); salle('colporteur I', () => ent('marchand'));
      salle('gardien I', () => ent('boss'));
      salle('combat II', () => ent('act')); salle('gardien II', () => ent('boss'));
      salle('combat III', () => ent('act3')); salle('élite III', () => ent('elite')); salle('gardien III', () => ent('boss'));
      salle('combat IV', () => ent('acte')); salle('gardien provisoire IV', () => ent('garde'));
      salle('miniboss X (1)', () => { RUN.acteD = 9; ent('acte'); }); salle('miniboss X (2)', () => ent('mini')); salle('boss final provisoire', () => ent('final'));
      return out; };
  }
  const ANCRE = '\nconst DEMO_CLS=';
  const instr = src => { if (!src.includes(ANCRE)) throw new Error('ancre d’injection introuvable'); return src.replace(ANCRE, `\n(${DEDANS})();${ANCRE}`); };
  const SRC = { avant: instr(AVANT), apres: instr(APRES) };
  async function joue(ver, cls, palier, seed) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
    await ctx.addInitScript({ content: `(${HORLOGE})(${seed});` });
    await ctx.route(u => u.pathname.endsWith('/index.html'), r => r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: SRC[ver] }));
    const page = await ctx.newPage(); const errs = [];
    page.on('pageerror', e => errs.push(String(e).slice(0, 300)));
    page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text().slice(0, 300)); });
    await page.goto(BASE);
    await page.waitForFunction(() => !!(window.__hgo && window.__descente && document.fonts), null, { timeout: 40000, polling: 100 });
    // les polices du canevas chargées avant la première image comparée (sinon le texte change selon l'instant où elles arrivent)
    await page.evaluate(async () => { for (const f of ['500 19px "Grenze Gotisch"', '700 14px "Alegreya Sans"', '700 16px "Alegreya Sans"', '400 16px "Alegreya Sans"', '700 23px "Alegreya Sans"']) { try { await document.fonts.load(f); } catch (e) {} } await document.fonts.ready; });
    const r = await page.evaluate(([c, p, s, nf]) => window.__hgo.regle(c, p, s, nf), [cls, palier, seed, NF]);
    await ctx.close(); return { r, errs };
  }
  const t0 = Date.now(); let images = 0, diff = 0;
  for (const [k, palier] of ['normal', 'difficile', 'extreme'].entries()) {
    const cls = ['lum', 'gou', 'tis'][k], seed = 4100 + k * 7;
    const [a, b] = [await joue('avant', cls, palier, seed), await joue('apres', cls, palier, seed)];
    ok(!a.errs.length && !b.errs.length, `G : ${palier} : aucune erreur (avant ${a.errs.length}, après ${b.errs.length}) ` + a.errs.concat(b.errs).slice(0, 2).join(' | '));
    const salles = [];
    for (let i = 0; i < a.r.length; i++) {
      const x = a.r[i], y = b.r[i]; let premier = -1, n = 0;
      for (let f = 0; f < Math.max(x.hs.length, y.hs.length); f++) if (x.hs[f] !== y.hs[f]) { n++; if (premier < 0) premier = f; }
      images += x.hs.length; diff += n;
      salles.push(`${x.nom}${x.type !== y.type ? ' (type ≠)' : ''}`);
      ok(n === 0 && x.type === y.type && x.gardeK === y.gardeK, `G : ${palier} (${cls}) · ${x.nom} [${x.etat === 'title' ? 'écran titre, ' : ''}${x.type}${x.gardeK ? ' ' + x.gardeK : ''}, acte ${x.acte}] : ${x.hs.length} images identiques${n ? ` — ${n} images différentes, la première à l’image ${premier}` : ''}`);
    }
  }
  console.log(`   ${images} images comparées, ${diff} différentes, ${((Date.now() - t0) / 1000).toFixed(0)} s${process.env.BANC_TEMOIN ? ' (témoin : d’après contre d’après)' : ` (avant : ${AVANT_REV})`}`);
}

console.log(`\nbanc-arene : ${checks} vérifications, ${fails} échec${fails > 1 ? 's' : ''}.`);
await browser.close();
process.exit(fails ? 1 : 0);
