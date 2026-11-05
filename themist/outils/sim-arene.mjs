#!/usr/bin/env node
// La Brume · vérification hors navigateur de l'arène large (v18.4, chantier v18, action 4 ; cadrage Q1–Q12)
// Extrait la logique pure d'index.html (bloc /*arene:pur*/) et la fait tourner avec data/arene.js. Vérifie :
//  0. les données : éteinte, boss final seulement, taille, caméra, couleurs de la grammaire (recopiées d'index.html) et leurs ΔE, secret du wiki ;
//  1. l'identité : monde = écran → la caméra reste à 0 à chaque pas, versEcran / versMonde sont l'identité au bit près ;
//  2. la caméra : 10 000 trajets (marche, ruées à 900 px/s, téléportations) : garde-fou, vue dans ses limites, sans dépassement, rejouable ;
//     mouvements réduits sans avance ; bornes plus petites que l'écran : caméra fixe, centrée ;
//  3. les signes de bord : chaque source hors vue qui doit en avoir un l'a, sur le bord de la vue sûre, hors des coins et des blocs du HUD,
//     regroupés, fusionnés, triés, plafonnés à 10 ;
//  4. le préavis : aucun coup sans signe depuis 0,6 s (0,8 s : boss) dans les scénarios du cadrage (zone hors vue, projectile rapide, ruée) ;
//  5. la transformation : annonce → bascule → fondu, vitesse des bornes, jamais d'obstacle sur une créature, carte de distances à refaire ;
//  6. les tuiles : celles qui coupent la vue, jamais plus de 9 ;
//  7. les branchements lus dans index.html (retouches de base réduites à l'identité quand CAM est nul, enveloppes, gardes d'essai).
//   node themist/outils/sim-arene.mjs
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
const m = html.match(/\/\*arene:pur\*\/([\s\S]*?)\/\*\/arene:pur\*\//);
if (!m) { console.error('Bloc /*arene:pur*/ introuvable'); process.exit(1); }
const ctx = { window: {}, Math, console, JSON, Set, Object, Infinity, isFinite };
vm.createContext(ctx);
vm.runInContext(readFileSync(join(ROOT, 'data', 'arene.js'), 'utf8'), ctx);
vm.runInContext(m[1] + '\nthis.F={arCamR,arMonde,arEtat,arVue,arSure,versEcran,versMonde,arLimites,arBorner,arCible,arPas,arDistRect,arApproche,arBord,arIndic,arSignes,arJuge,arTransNouveau,arTransPas,arTransObstacles,arTuiles,AR_RANG};', ctx);
const F = ctx.F, DA = ctx.window.BRUME_DATA.arene;
let fails = 0, checks = 0;
const ok = (c, msg) => { checks++; if (!c) { fails++; if (fails <= 60) console.error('ÉCHEC : ' + msg); } };
const W = 1280, H = 720, V = { w: W, h: H }, AR0 = { x0: 56, y0: 92, x1: W - 56, y1: H - 44 };
// hasard rejouable
const mk = s => () => { s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

// ── 0. Données
ok(DA.actif === false, 'données : l’arène est éteinte (actif:false) jusqu’à l’action 5');
ok(JSON.stringify(Object.keys(DA.salles)) === '["final"]', 'données : une seule salle, le boss final (Q1)');
const S = DA.salles.final;
ok(S.w === 2 && S.h === 1.5, 'données : 2 × 1,5 écrans');
ok(S.entree.fx > 0 && S.entree.fx < 1 && S.entree.fy > 0 && S.entree.fy < 1, 'données : point d’entrée dans le monde');
ok(Array.isArray(S.etats) && S.etats.length >= 2, 'données : au moins deux états d’essai (transformation)');
ok(JSON.stringify(DA.mur) === JSON.stringify({ g: 56, h: 92, d: 56, b: 44 }), 'données : bornes dures à la distance d’AR');
const C = DA.camera;
ok(C.zone.w === 200 && C.zone.h === 120 && C.tau === 0.15 && C.avance.px === 70 && C.avance.tau === 0.3 && C.avance.vise === 0 && C.biaisBoss === 0.3 && C.garde.x === 180 && C.garde.y === 140, 'données : réglages de caméra du cadrage (Q3)');
ok(C.rm.avance === 0 && C.rm.zone.w === 320 && C.rm.zone.h === 180 && C.rm.tau === 0.25 && C.rm.biais === 0, 'données : mouvements réduits sans avance ni biais, zone morte 320 × 180, τ 0,25 s');
const mg = DA.vue.marges;
ok(H - mg.h - mg.b - 2 * C.garde.y > C.zone.h && W - mg.g - mg.d - 2 * C.garde.x > C.zone.w, 'données : le garde-fou laisse la place à la zone morte dans la vue sûre');
ok(DA.preavis.coup === 0.6 && DA.preavis.boss === 0.8, 'données : préavis 0,6 / 0,8 s');
ok(DA.tuiles.w === 640 && DA.tuiles.h === 360 && DA.tuiles.max === 9, 'données : tuiles 640 × 360, au plus 9');
ok(DA.budget.rendu === 1.5 && DA.budget.peinture === 250, 'données : budget ≤ +1,5 ms, ≤ 250 ms de peinture');
ok(DA.transformation.annonceS >= 1.2 && DA.transformation.vitesse <= 120 && DA.transformation.fonduS === 0.6, 'données : annonce ≥ 1,2 s, bornes ≤ 120 px/s, fondu 0,6 s');
ok(DA.indicateurs.max === 10 && DA.indicateurs.fusion === 28 && DA.indicateurs.retrait === 24 && DA.indicateurs.coin === 40, 'données : signes de bord (plafond 10, fusion 28, retrait 24, coin 40)');
for (const [k, c] of Object.entries(DA.indicateurs.cat)) ok(DA.indicateurs.couleurs[c.c] && c.min >= 14 && c.max <= 22 && c.min <= c.max, `données : signe « ${k} », couleur connue, 14 à 22 px`);
ok(DA.indicateurs.cat.elite.dist === 900 && DA.indicateurs.cat.ord.dist === 600, 'données : élites à 900 px, ordinaires à 600 px de la vue');
// couleurs recopiées d'index.html (la grammaire existante)
const tele = /const TELE=\{zone:'([\d,]+)',proj:'([\d,]+)',grab:'([\d,]+)'\}/.exec(html), foe = /const FOE='([\d,]+)'/.exec(html);
const CO = DA.indicateurs.couleurs;
ok(tele && CO.zone === tele[1] && CO.proj === tele[2] && CO.grab === tele[3], 'couleurs : zone, tirs et saisie = TELE d’index.html');
ok(foe && CO.foe === foe[1] && CO.foeDoux === foe[1], 'couleurs : rouge des ennemis = FOE d’index.html');
ok(CO.lavande === '180,160,255' && CO.ivoire === '255,250,235', 'couleurs : lavande des souvenirs et ivoire du point faible');
const lab = ([R, G, B]) => { const f = v => { v /= 255; return v > 0.04045 ? ((v + 0.055) / 1.055) ** 2.4 : v / 12.92; }; const [r, g, b] = [f(R), f(G), f(B)];
  const X = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047, Y = r * 0.2126 + g * 0.7152 + b * 0.0722, Z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
  const h = t => t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116; return [116 * h(Y) - 16, 500 * (h(X) - h(Y)), 200 * (h(Y) - h(Z))]; };
const dE = (a, b) => { const A = lab(a.split(',').map(Number)), B = lab(b.split(',').map(Number)); return Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]); };
const dist = [...new Set(Object.values(CO))];
let dEmin = 1e9;
for (let i = 0; i < dist.length; i++) for (let j = i + 1; j < dist.length; j++) { const d = dE(dist[i], dist[j]); dEmin = Math.min(dEmin, d); ok(d >= 25, `couleurs : ${dist[i]} et ${dist[j]} à ΔE ${d.toFixed(1)} ≥ 25`); }
// secret du wiki (Q9) : rien sur l'arène hors du journal ; la ligne du journal ne dit ni phase chiffrée, ni « invente », ni le nom des états
const vers = (() => { const c = { window: {} }; vm.createContext(c); vm.runInContext(readFileSync(join(ROOT, 'data', 'versions.js'), 'utf8'), c); return c.window.BRUME_DATA.versions; })();
const j184 = vers.journal.filter(x => x.h === 'v18.4');
ok(/^v18\.([4-9]|1\d)$/.test(vers.actuelle) && j184.length === 1, 'journal : une ligne v18.4, version actuelle v18.4 ou plus (v18.5 : le Brumeux)');
const sols = [...new Set(S.etats.map(e => e.sol))];
for (const x of j184) {
  ok(!/phase\s*\d|\d\s*phases?|invent/i.test(x.t), 'journal v18.4 : ni phase chiffrée, ni invention');
  ok(!sols.some(s => new RegExp('\\b' + s + '\\b', 'i').test(x.t)), 'journal v18.4 : aucun nom d’état');
}
const wiki = readFileSync(join(ROOT, 'wiki.html'), 'utf8').replace(/<!-- gen:journal -->[\s\S]*?<!-- \/gen:journal -->/, '');
ok(!/arène|caméra/i.test(wiki.replace(/<[^>]+>/g, ' ')), 'wiki : rien sur l’arène ni la caméra hors du journal');

// ── 1. Identité : monde = écran
const M1 = { w: W, h: H, bornes: AR0 }, R = F.arCamR(C, false), Rr = F.arCamR(C, true);
const lim1 = F.arLimites(AR0, M1, DA.mur);
ok(lim1.x0 === 0 && lim1.y0 === 0 && lim1.x1 === W && lim1.y1 === H, 'identité : les limites d’une salle d’un écran sont exactement l’écran');
{
  const rnd = mk(1); let c = { x: 0, y: 0, ax: 0, ay: 0 }, zero = true, ident = true, id2 = true;
  for (let i = 0; i < 10000; i++) {
    const j = { x: 56 + rnd() * (W - 112), y: 92 + rnd() * (H - 136), vx: (rnd() - 0.5) * 1800, vy: (rnd() - 0.5) * 1800 };
    const boss = rnd() < 0.5 ? { x: rnd() * W, y: rnd() * H } : null;
    c = F.arPas(c, j, rnd() * 0.05, rnd() < 0.5 ? R : Rr, { V, lim: lim1, sure: mg, boss, vise: { x: rnd() * 2 - 1, y: rnd() * 2 - 1 }, saut: rnd() < 0.05 });
    if (!Object.is(c.x, 0) || !Object.is(c.y, 0)) zero = false;
    const x = rnd() * 4000 - 1000, y = rnd() * 4000 - 1000, e = F.versEcran({ x: 0, y: 0 }, x, y), w = F.versMonde({ x: 0, y: 0 }, x, y);
    if (!Object.is(e.x, x) || !Object.is(e.y, y) || !Object.is(w.x, x) || !Object.is(w.y, y)) ident = false;
    // les retouches de base : offX+(sx-CAM.x)*scale et mouse.sx+CAM.x avec CAM nul redonnent les valeurs d'avant
    const sx = (rnd() - 0.5) * 14, off = rnd() * 300, sc = 0.3 + rnd() * 2, ms = (rnd() - 0.2) * 1500;
    if (!Object.is(off + (sx - 0) * sc, off + sx * sc) || !Object.is(ms + 0, ms) || 0 + W / 2 !== W / 2) id2 = false;
  }
  ok(zero, 'identité : 10 000 pas de caméra dans une salle d’un écran, CAM reste exactement à 0, 0');
  ok(ident, 'identité : versEcran et versMonde sont l’identité au bit près quand CAM est nul');
  ok(id2, 'identité : transformation de render, souris et ECR() réduites à l’identité quand CAM est nul (au bit près)');
}

// ── 2. La caméra
const M = F.arMonde(S, V, DA.mur, {}), E0 = F.arEtat(S.etats[0], M);
ok(M.w === 2560 && M.h === 1080, 'monde : 2 560 × 1 080');
ok(JSON.stringify(E0.bornes) === JSON.stringify(M.bornes), 'état plein : ses bornes sont les bornes dures');
const lim = F.arLimites(M.bornes, M, DA.mur);
ok(lim.x0 === 0 && lim.y0 === 0 && lim.x1 === M.w && lim.y1 === M.h, 'monde : la vue peut aller jusqu’aux murs, pas au-delà');
function trajet(seed, Rc, n, opts) {
  const rnd = mk(seed), B = (opts && opts.bornes) || M.bornes, li = F.arLimites(B, M, DA.mur);
  let j = { x: M.entree.x, y: M.entree.y }, c = F.arPas({ x: 0, y: 0, ax: 0, ay: 0 }, Object.assign({ vx: 0, vy: 0 }, j), 0, Rc, { V, lim: li, sure: mg, boss: null, saut: true });
  const out = { garde: 0, limites: 0, sig: [], avance: 0, pas: 0 }, b = opts && opts.boss ? { x: M.w * 0.8, y: M.h * 0.3 } : null;
  let mode = 'marche', t = 0, dx = 1, dy = 0;
  for (let i = 0; i < n; i++) {
    const dt = 1 / 60; t -= dt;
    if (t <= 0) { const r = rnd(); mode = r < 0.6 ? 'marche' : r < 0.9 ? 'ruee' : 'tele'; t = mode === 'ruee' ? 0.2 : 0.4 + rnd() * 1.2; const a = rnd() * Math.PI * 2; dx = Math.cos(a); dy = Math.sin(a);
      if (mode === 'tele') { j = { x: B.x0 + 20 + rnd() * (B.x1 - B.x0 - 40), y: B.y0 + 20 + rnd() * (B.y1 - B.y0 - 40) }; } }
    const v = mode === 'ruee' ? 900 : mode === 'marche' ? 220 : 0, x0 = j.x, y0 = j.y;
    j = { x: Math.min(Math.max(j.x + dx * v * dt, B.x0 + 13), B.x1 - 13), y: Math.min(Math.max(j.y + dy * v * dt, B.y0 + 13), B.y1 - 13) };
    c = F.arPas(c, { x: j.x, y: j.y, vx: (j.x - x0) / dt, vy: (j.y - y0) / dt }, dt, Rc, { V, lim: li, sure: mg, boss: b, saut: false });
    out.pas++;
    const vu = F.arVue(c, V), s = F.arSure(vu, mg), G = Rc.garde, e = 1e-6;
    const gok = (j.x - s.x0 >= G.x - e || Math.abs(c.x - F.arBorner(-1e9, li.x0, li.x1, W)) < e) && (s.x1 - j.x >= G.x - e || Math.abs(c.x - F.arBorner(1e9, li.x0, li.x1, W)) < e)
      && (j.y - s.y0 >= G.y - e || Math.abs(c.y - F.arBorner(-1e9, li.y0, li.y1, H)) < e) && (s.y1 - j.y >= G.y - e || Math.abs(c.y - F.arBorner(1e9, li.y0, li.y1, H)) < e);
    if (!gok) out.garde++;
    const lw = li.x1 - li.x0 >= W, lh = li.y1 - li.y0 >= H;
    if ((lw && (vu.x0 < li.x0 - e || vu.x1 > li.x1 + e)) || (lh && (vu.y0 < li.y0 - e || vu.y1 > li.y1 + e))) out.limites++;
    if (!lw && Math.abs(c.x - ((li.x0 + li.x1) / 2 - W / 2)) > e) out.limites++;
    if (!lh && Math.abs(c.y - ((li.y0 + li.y1) / 2 - H / 2)) > e) out.limites++;
    out.avance = Math.max(out.avance, Math.hypot(c.ax, c.ay));
    if (i % 97 === 0) out.sig.push(c.x.toFixed(6) + ',' + c.y.toFixed(6));
  }
  return out;
}
{
  let g = 0, l = 0, n = 0, rejoue = true, avMax = 0, avRm = 0;
  for (let k = 0; k < 10000; k++) {
    const rm = k % 4 === 3, a = trajet(100 + k, rm ? Rr : R, 120, { boss: k % 2 === 0 });
    g += a.garde; l += a.limites; n += a.pas; if (rm) avRm = Math.max(avRm, a.avance); else avMax = Math.max(avMax, a.avance);
    if (k % 500 === 0) { const b = trajet(100 + k, rm ? Rr : R, 120, { boss: k % 2 === 0 }); if (b.sig.join('|') !== a.sig.join('|')) rejoue = false; }
  }
  ok(g === 0, `caméra : 10 000 trajets (${n} pas : marche, ruées à 900 px/s, téléportations), le joueur toujours dans le garde-fou (${g} écarts)`);
  ok(l === 0, `caméra : la vue jamais hors de ses limites (${l} écarts)`);
  ok(rejoue, 'caméra : mêmes trajets, mêmes résultats');
  ok(avMax <= C.avance.px + 1e-9 && avMax > C.avance.px * 0.6, `caméra : avance jusqu’à ${C.avance.px} px (mesurée ${avMax.toFixed(1)})`);
  ok(avRm === 0, 'caméra : aucune avance en mouvements réduits');
}
// sans dépassement : le joueur s'arrête, la caméra va vers sa place de repos sans jamais la dépasser (sur chaque axe, mouvement monotone)
{
  let depasse = 0;
  for (let k = 0; k < 2000; k++) {
    const rnd = mk(9000 + k), Rc = k % 2 ? R : Rr, j = { x: 400 + rnd() * 1700, y: 300 + rnd() * 500, vx: 0, vy: 0 };
    let c = { x: rnd() * (M.w - W), y: rnd() * (M.h - H), ax: (rnd() - 0.5) * 100, ay: (rnd() - 0.5) * 100 };
    const xs = [], ys = [];
    for (let i = 0; i < 240; i++) { c = F.arPas(c, j, 1 / 60, Rc, { V, lim, sure: mg, boss: null }); xs.push(c.x); ys.push(c.y); }
    const mono = a => { let s = 0; for (let i = 1; i < a.length; i++) { const d = a[i] - a[i - 1]; if (Math.abs(d) < 1e-9) continue; const sg = Math.sign(d); if (s && sg !== s) return false; s = sg; } return true; };
    if (!mono(xs.slice(20)) || !mono(ys.slice(20))) depasse++;   // les 20 premières images : l'avance retombe (elle peut changer le sens)
  }
  ok(depasse === 0, `caméra : jamais de dépassement ni de rebond (${depasse} sur 2 000)`);
}
// bornes plus petites que l'écran : caméra fixe, centrée
{
  const E1 = F.arEtat(S.etats[1], M), li = F.arLimites(E1.bornes, M, DA.mur), a = trajet(77, R, 600, { bornes: E1.bornes });
  ok(a.limites === 0 && a.garde === 0, 'caméra : bornes de phase plus étroites que la vue (état 1), caméra centrée et garde-fou tenu (ou contre sa borne)');
  ok(li.x1 - li.x0 < W === (E1.bornes.x1 - E1.bornes.x0 + 112 < W), 'caméra : les limites de l’état 1 suivent ses bornes et leurs murs');
}
// entrée : saut (aucun glissement d'ouverture)
{
  const c = F.arPas({ x: 0, y: 0 }, { x: M.entree.x, y: M.entree.y }, 0, R, { V, lim, sure: mg, saut: true }), s = F.arSure(F.arVue(c, V), mg);
  ok(c.x === F.arBorner(M.entree.x - W / 2, 0, M.w, W) && M.entree.x > s.x0 && M.entree.x < s.x1 && M.entree.y > s.y0 - 1e-9 && M.entree.y <= s.y1 + 1e-9, 'caméra : à l’entrée, saut sur le joueur');
}
// cadrage partagé : jamais au prix du garde-fou ; la cible glisse vers le boss de 30 % au plus
{
  const t = F.arCible({ x: 1000, y: 500 }, { ax: 0, ay: 0 }, R, { boss: { x: 2000, y: 500 } });
  ok(Math.abs(t.x - 1300) < 1e-9 && t.y === 500, 'caméra : la cible glisse de 30 % vers le boss');
  const tr = F.arCible({ x: 1000, y: 500 }, { ax: 0, ay: 0 }, Rr, { boss: { x: 2000, y: 500 } });
  ok(tr.x === 1000, 'caméra : pas de biais animé en mouvements réduits');
}

// ── 3. Les signes de bord
const I = Object.assign({}, DA.indicateurs, { blocs: [] });
{
  const rnd = mk(5);
  let manque = 0, horsBord = 0, coin = 0, tropPres = 0, ordre = 0, plafond = 0, total = 0, regroupe = 0, bloc = 0;
  for (let k = 0; k < 4000; k++) {
    const c = { x: rnd() * (M.w - W), y: rnd() * (M.h - H) }, vue = F.arVue(c, V), sure = F.arSure(vue, mg), joueur = { x: sure.x0 + 200 + rnd() * (sure.x1 - sure.x0 - 400), y: sure.y0 + 150 + rnd() * (sure.y1 - sure.y0 - 300) };
    const blocs = k % 2 ? [{ x0: vue.x0 + 1028, y0: vue.y0, x1: vue.x1, y1: vue.y0 + 269 }] : [];
    const Ik = Object.assign({}, I, { blocs }), L = [], n = 1 + Math.floor(rnd() * (k % 5 === 0 ? 30 : 8));
    for (let i = 0; i < n; i++) {
      const kd = ['tele', 'proj', 'saisie', 'boss', 'elite', 'ord'][Math.floor(rnd() * 6)], a = rnd() * Math.PI * 2, d = 700 + rnd() * 900;
      const s = { id: i + 1, k: kd, x: joueur.x + Math.cos(a) * d, y: joueur.y + Math.sin(a) * d, r: 10 };
      if (kd === 'proj' || kd === 'saisie') { const sp = 300 + rnd() * 500, aim = Math.atan2(joueur.y - s.y, joueur.x - s.x) + (rnd() - 0.5) * 0.3; s.vx = Math.cos(aim) * sp; s.vy = Math.sin(aim) * sp; }
      if (kd === 'tele') { s.vise = rnd() < 0.5; s.rempli = rnd(); }
      L.push(s);
    }
    const out = F.arIndic(L, { vue, sure, joueur }, Ik); total += out.length;
    if (out.length > I.max) plafond++;
    // chaque source qui devait en avoir un l'a (si le plafond n'est pas atteint)
    if (out.length < I.max) for (const s of L) {
      const dv = F.arDistRect(vue, s.x, s.y); if (dv <= s.r) continue; let doit;
      if (s.k === 'tele') doit = s.vise || dv <= s.r + I.marge; else if (s.k === 'proj' || s.k === 'saisie') doit = F.arApproche(s, joueur, I.horizon).d <= I.frole + s.r;
      else if (s.k === 'boss') doit = true; else doit = dv <= I.cat[s.k].dist;
      const a = out.some(x => x.ids.includes(s.id)); if (doit !== a) manque++;
    }
    const q = { x0: sure.x0 + I.retrait, y0: sure.y0 + I.retrait, x1: sure.x1 - I.retrait, y1: sure.y1 - I.retrait }, e = 1e-6;
    for (const x of out) {
      const surBord = (Math.abs(x.x - q.x0) < e || Math.abs(x.x - q.x1) < e) && x.y >= q.y0 - e && x.y <= q.y1 + e || (Math.abs(x.y - q.y0) < e || Math.abs(x.y - q.y1) < e) && x.x >= q.x0 - e && x.x <= q.x1 + e;
      if (!surBord) horsBord++;
      if ((x.x - q.x0 < I.coin - e || q.x1 - x.x < I.coin - e) && (x.y - q.y0 < I.coin - e || q.y1 - x.y < I.coin - e)) coin++;
      for (const B of blocs) if (x.x > B.x0 - I.retrait + e && x.x < B.x1 + I.retrait - e && x.y > B.y0 - I.retrait + e && x.y < B.y1 + I.retrait - e) bloc++;
      if (x.n > 1 && x.k === 'ord') regroupe++;
    }
    for (let i = 0; i < out.length; i++) { for (let j2 = i + 1; j2 < out.length; j2++) if (Math.hypot(out[i].x - out[j2].x, out[i].y - out[j2].y) < I.fusion) tropPres++; if (i && out[i].rang < out[i - 1].rang) ordre++; }
  }
  ok(manque === 0, `bords : chaque source hors vue qui doit avoir son signe l’a, et seulement elle (${manque} écarts)`);
  ok(horsBord === 0, `bords : sur le bord de la vue sûre, rentrés de ${I.retrait} px (${horsBord} écarts)`);
  ok(coin === 0, `bords : jamais dans un coin (${coin})`);
  ok(bloc === 0, `bords : jamais sous un bloc du HUD (${bloc})`);
  ok(tropPres === 0, `bords : deux signes jamais à moins de ${I.fusion} px (fusion) (${tropPres})`);
  ok(ordre === 0, `bords : triés par danger (télégraphe, projectile, saisie, boss, élite, ordinaires) (${ordre})`);
  ok(plafond === 0, 'bords : jamais plus de 10 signes');
  ok(regroupe > 0, 'bords : les ordinaires d’un même segment de bord sont regroupés, avec leur nombre');
  ok(total > 0, 'bords : des signes posés');
}
// les sources à l'écran n'ont pas de signe ; un télégraphe loin qui ne vise pas, non plus ; un élite à 950 px, non
{
  const c = { x: 600, y: 200 }, vue = F.arVue(c, V), sure = F.arSure(vue, mg), j = { x: 1240, y: 560 };
  const L = [{ id: 1, k: 'ord', x: 1000, y: 500, r: 12 }, { id: 2, k: 'tele', x: vue.x1 + 600, y: 500, r: 60, vise: false }, { id: 3, k: 'elite', x: vue.x1 + 950, y: 500, r: 20 }, { id: 4, k: 'boss', x: vue.x1 + 1400, y: 500, r: 40 }];
  const o = F.arIndic(L, { vue, sure, joueur: j }, I);
  ok(o.length === 1 && o[0].k === 'boss' && o[0].cote === 'd', 'bords : à l’écran, rien ; télégraphe loin sans viser, rien ; élite trop loin, rien ; le boss, toujours');
  const p = F.arIndic([{ id: 5, k: 'proj', x: vue.x0 - 400, y: j.y, r: 7, vx: 800, vy: 0 }], { vue, sure, joueur: j }, I);
  const p2 = F.arIndic([{ id: 6, k: 'proj', x: vue.x0 - 400, y: j.y, r: 7, vx: -800, vy: 0 }], { vue, sure, joueur: j }, I);
  const p3 = F.arIndic([{ id: 7, k: 'proj', x: vue.x0 - 400, y: j.y, r: 7, vx: 380, vy: 0 }], { vue, sure, joueur: j }, I);
  ok(p.length === 1 && p[0].cote === 'g' && p2.length === 0 && p3.length === 0, 'bords : un projectile qui t’atteindra dans 1,5 s a son signe ; plus lent, ou qui s’éloigne, pas encore');
}

// petit écran : le HUD couvre tout le bord droit ; le signe se pose juste devant le bloc, dans la vue sûre
{
  const vue = { x0: 0, y0: 0, x1: W, y1: H }, sure = { x0: 16, y0: 184, x1: W - 16, y1: H - 216 }, bl = { x0: 860, y0: 0, x1: W, y1: 532 };
  const b = F.arBord(sure, { x: 640, y: 330 }, { x: 2400, y: 330 }, Object.assign({}, I, { blocs: [bl] }));
  ok(b.x <= bl.x0 - I.retrait + 1e-9 && b.y >= sure.y0 && b.y <= sure.y1 && b.x >= sure.x0, `bords : petit écran, le bord droit couvert par le HUD : signe posé devant le bloc (${b.x}, ${b.y.toFixed(0)})`);
}

// ── 4. Le préavis : aucun coup sans signe
function scenario(seed, kind) {
  const rnd = mk(seed), c = { x: 640, y: 180 }, vue = F.arVue(c, V), sure = F.arSure(vue, mg), j = { x: c.x + W / 2 + (rnd() - 0.5) * 300, y: c.y + H / 2 + (rnd() - 0.5) * 120 };
  const E = { debut: {} }, dt = 1 / 60; let t = 0, juge = null;
  if (kind === 'zone') {   // une zone du boss naît hors vue et vise le joueur (charge 1,2 s) ; ou naît sur lui (à l'écran)
    const sur = rnd() < 0.5, z = { id: 1, k: 'tele', x: sur ? j.x : vue.x1 + 300, y: j.y, r: 90, vise: true }, b = { id: 2, k: 'boss', x: vue.x1 + 700, y: j.y, r: 44 };
    for (; t < DA.essai.boss.charge - 1e-9; t += dt) { const o = F.arIndic([z, b], { vue, sure, joueur: j }, I), ids = o.flatMap(x => x.ids); if (F.arDistRect(vue, z.x, z.y) <= z.r) ids.push(1); F.arSignes(E, t, ids); }
    juge = F.arJuge(E, t, [1, 2], true, DA.preavis);
  } else if (kind === 'proj') {   // projectile rapide depuis le hors-champ
    const sp = 380 + rnd() * 520, a = Math.PI * 2 * rnd(), d = 900 + rnd() * 400, p = { id: 1, k: 'proj', x: j.x + Math.cos(a) * d, y: j.y + Math.sin(a) * d, r: 7 };
    p.vx = -Math.cos(a) * sp; p.vy = -Math.sin(a) * sp;
    for (; Math.hypot(p.x - j.x, p.y - j.y) > 20; t += dt) { const o = F.arIndic([p], { vue, sure, joueur: j }, I), ids = o.flatMap(x => x.ids); if (F.arDistRect(vue, p.x, p.y) <= p.r) ids.push(1); F.arSignes(E, t, ids); p.x += p.vx * dt; p.y += p.vy * dt; }
    juge = F.arJuge(E, t, [1], false, DA.preavis);
  } else {   // ruée d'un élite (900 px/s) depuis le hors-champ, sans jeton hors de la vue élargie : il frappe au contact
    const a = Math.PI * 2 * rnd(), e = { id: 1, k: 'elite', x: j.x + Math.cos(a) * 1900, y: j.y + Math.sin(a) * 1900, r: 20 };
    for (; Math.hypot(e.x - j.x, e.y - j.y) > 34; t += dt) { const o = F.arIndic([e], { vue, sure, joueur: j }, I), ids = o.flatMap(x => x.ids); if (F.arDistRect(vue, e.x, e.y) <= e.r) ids.push(1); F.arSignes(E, t, ids);
      const sp = F.arDistRect(vue, e.x, e.y) > DA.horsVue.jeton ? 160 : 900; e.x -= Math.cos(a) * sp * dt; e.y -= Math.sin(a) * sp * dt; }
    juge = F.arJuge(E, t, [1], false, DA.preavis);
  }
  return juge;
}
for (const kind of ['zone', 'proj', 'ruee']) {
  let mauvais = 0, pire = 1e9; for (let k = 0; k < 500; k++) { const J = scenario(300 + k, kind); if (!J.ok) mauvais++; pire = Math.min(pire, J.depuis); }
  ok(mauvais === 0, `préavis : ${kind}, 500 scénarios, aucun coup sans signe (préavis le plus court : ${pire.toFixed(2)} s)`);
}
{
  const E = { debut: {} }; F.arSignes(E, 0, [1]); F.arSignes(E, 0.2, [1]); F.arSignes(E, 0.3, []); F.arSignes(E, 0.4, [1]);
  ok(!F.arJuge(E, 0.7, [1], false, DA.preavis).ok && F.arJuge(E, 1.0, [1], false, DA.preavis).ok, 'préavis : un signe interrompu repart de zéro (contre-épreuve)');
  ok(!F.arJuge(E, 1.0, [1], true, DA.preavis).ok && F.arJuge(E, 1.2, [1], true, DA.preavis).ok, 'préavis : 0,8 s pour une attaque du boss');
  ok(!F.arJuge({ debut: {} }, 5, [], false, DA.preavis).ok, 'préavis : un coup sans source connue est compté sans signe');
}

// ── 5. La transformation
{
  const E1 = F.arEtat(S.etats[0], M), E2 = F.arEtat(S.etats[1], M), TR = DA.transformation;
  let ordre = 0, vite = 0, sous = 0, annonce = 0, ffManque = 0, n = 0, calme = 0;
  for (let k = 0; k < 400; k++) {
    const rnd = mk(700 + k), de = k % 2 ? E1 : E2, vers = k % 2 ? E2 : E1;
    let T = F.arTransNouveau(de, vers); const cre = [];
    for (let i = 0; i < 6; i++) { const o = vers.obstacles.concat(vers.vides)[i % Math.max(1, vers.obstacles.length)]; cre.push(rnd() < 0.3 && o ? { x: o.x + 5, y: o.y, r: 13, part: rnd() * 3 } : { x: 300 + rnd() * 1900, y: 200 + rnd() * 700, r: 13, part: 0 }); }
    let t = 0, tAnn = 0;
    while (T.ph !== 'fini' && t < 30) {
      const dt = 1 / 60, vivants = cre.filter(c => c.part <= 0 || t < c.part), av = T;
      T = F.arTransPas(T, dt, vivants, TR); t += dt; n++;
      if (T.ph === 'annonce') tAnn = t;
      if ((av.ph === 'annonce' || av.ph === 'bascule') && !av.calme) calme++;
      for (const k2 of ['x0', 'y0', 'x1', 'y1']) if (Math.abs(T.bornes[k2] - av.bornes[k2]) > TR.vitesse * dt + 1e-9) vite++;
      if (T.bornes.x0 !== av.bornes.x0 && !T.ff) ffManque++;
      for (const o of T.poses) if (!av.poses.includes(o) && !T.pousse.includes(o.cle) && vivants.some(c => Math.hypot(c.x - o.x, c.y - o.y) < o.r + c.r)) sous++;
      for (const o of T.poses) if (!av.poses.includes(o) && T.pousse.includes(o.cle) && (av.attente[o.cle] || 0) + dt < TR.attenteMax - 1e-9) sous++;
      for (const c of T.poses) if (!av.poses.includes(c) && !T.ff) ffManque++;
    }
    if (T.journal.join(',') !== 'annonce,bascule,fondu,fini') ordre++;
    if (tAnn + 1e-9 < TR.annonceS - 1 / 60) annonce++;
    if (JSON.stringify(T.bornes) !== JSON.stringify(vers.bornes)) ordre++;
    const obs = F.arTransObstacles(T).map(o => o.cle).sort().join('|'), att = vers.obstacles.concat(vers.vides).map(o => o.cle).sort().join('|');
    if (obs !== att) ordre++;
  }
  ok(ordre === 0, `transformation : annonce → bascule → fondu → fini, bornes et obstacles d’arrivée (${ordre} écarts sur 400)`);
  ok(annonce === 0, 'transformation : annonce d’au moins 1,2 s');
  ok(vite === 0, `transformation : les bornes ne bougent jamais plus vite que ${TR.vitesse} px/s`);
  ok(sous === 0, `transformation : jamais d’obstacle posé sur une créature avant d’avoir attendu ${TR.attenteMax} s (${sous})`);
  ok(ffManque === 0, 'transformation : la carte de distances est marquée à refaire dès que les bornes ou les obstacles changent');
  ok(calme === 0, 'transformation : le boss se tait pendant l’annonce et la bascule (calme)');
  const T0 = F.arTransNouveau(E1, E2);
  ok(F.arTransObstacles(T0).length === E1.obstacles.length + E1.vides.length, 'transformation : pendant l’annonce, les obstacles d’avant restent');
}

// ── 6. Les tuiles
{
  const rnd = mk(11); let trop = 0, faux = 0, trous = 0, maxN = 0;
  for (const o of [{}, { w: 2.5, h: 1.5 }]) {
    const Mo = F.arMonde(S, V, DA.mur, o);
    for (let k = 0; k < 20000; k++) {
      const c = { x: rnd() * (Mo.w - W), y: rnd() * (Mo.h - H) }, v = F.arVue(c, V), ts = F.arTuiles(v, Mo, DA.tuiles); maxN = Math.max(maxN, ts.length);
      if (ts.length > DA.tuiles.max) trop++;
      for (const t of ts) if (t.x >= v.x1 || t.x + DA.tuiles.w <= v.x0 || t.y >= v.y1 || t.y + DA.tuiles.h <= v.y0) faux++;
      for (let q = 0; q < 6; q++) { const x = v.x0 + rnd() * W, y = v.y0 + rnd() * H; if (!ts.some(t => x >= t.x && x < t.x + DA.tuiles.w && y >= t.y && y < t.y + DA.tuiles.h)) trous++; }
    }
  }
  ok(trop === 0 && maxN === 9, `tuiles : jamais plus de 9 posées (au plus ${maxN})`);
  ok(faux === 0, 'tuiles : seulement celles qui coupent la vue');
  ok(trous === 0, 'tuiles : toute la vue est couverte');
  const Mx = F.arMonde(S, V, DA.mur, {}); ok(Math.ceil(Mx.w / 640) * Math.ceil(Mx.h / 360) === 12, 'tuiles : 12 tuiles par calque à 2 × 1,5');
}

// ── 7. Branchements (lecture d'index.html)
const has = (s, m) => ok(html.includes(s), 'branchement : ' + m);
const nb = (s, n, m) => ok(html.split(s).length - 1 === n, `branchement : ${m} (${html.split(s).length - 1} au lieu de ${n})`);
has('<script src="data/arene.js"></script>', 'data/arene.js chargé');
has('const AR0=Object.freeze(Object.assign({},AR)),MONDE={w:W,h:H},CAM={x:0,y:0,on:false', 'AR0 figé, MONDE = écran, CAM nul et éteint');
has('const ECR=()=>({x:CAM.x+W/2,y:CAM.y+H/2});', 'ECR() = centre de la vue');
has(' ctx.setTransform(scale,0,0,scale,offX+(sx-CAM.x)*scale,offY+(sy-CAM.y)*scale);\n ctx.save();ctx.beginPath();ctx.rect(CAM.x,CAM.y,W,H);ctx.clip();\n if(CAM.on)CAM.sol();else ctx.drawImage(room.canvas,0,0);', 'render : transformation, découpe et sol réduits à l’identité quand CAM est nul');
has("if(CAM.on){ctx.save();ctx.translate(CAM.x,CAM.y);}drawVignette();if(room&&room.drainT>0){ctx.fillStyle='rgba(6,0,12,.28)';ctx.fillRect(0,0,W,H);}if(CAM.on)ctx.restore();", 'render : vignette et voile dans le repère de l’écran, seulement si CAM est allumé');
has('mouse.sx=((e.clientX-r.left)*dpr-offX)/scale;mouse.sy=((e.clientY-r.top)*dpr-offY)/scale;mouse.x=mouse.sx+CAM.x;mouse.y=mouse.sy+CAM.y;', 'updMouse : position écran gardée, monde = écran + CAM');
nb('{...ECR(),', 7, 'ECR() sur les sept lumières « plein écran » (Zénith, Grande Toile ×2, cris du Brumeux ×3, Balancier)');
ok(!/\{x:W\/2,y:H\/2,r:(760|700|520|780)/.test(html), 'branchement : plus aucune lumière plein écran posée en W/2, H/2');
has('arene:CAM.on&&CAM.sbAr?CAM.sbAr():AR,', 'sbOrigine : sorties du Masqué dans la vue sûre (AR hors de l’arène)');
has('const cw=Math.ceil(MONDE.w/CS),rh=Math.ceil(MONDE.h/CS);if(cw!==COLS||rh!==ROWS)', 'carte de distances dimensionnée par le monde (mêmes tableaux hors de l’arène)');
has('||CAM.ff){CAM.ff=0;ffBlk();}', 'carte de distances refaite quand les bornes bougent');
has('ESSAI_URL=/[?&](masque|brume|glas|dernier|nemesis|arene|brumeux)=/', 'garde d’essai de la némésis (ESSAI_URL) : arene (v18.5 : brumeux)');
has('ESSAI18=/[?&](masque|brume|glas|dernier|nemesis|demo|descente|arene|brumeux)=/', 'garde d’essai de la descente (ESSAI18) : arene (v18.5 : brumeux)');
const bloc = html.slice(html.indexOf("// v18.4 · L'arène (chantier v18, action 4"), html.indexOf('\nconst DEMO_CLS='));
ok(bloc.length > 1000, 'bloc « v18.4 · L’arène » en fin de fichier, avant le démarrage');
ok(/makeRoom=function\(type\)\{const ouv=[\s\S]{0,200}remettre\(\);/.test(bloc), 'bloc : toute nouvelle salle remet AR, MONDE et CAM avant d’être construite');
ok(/function remettre\(\)\{Object\.assign\(AR,AR0\);MONDE\.w=W;MONDE\.h=H;CAM\.x=0;CAM\.y=0;CAM\.on=false;/.test(bloc), 'bloc : remettre() rend AR0, l’écran et CAM nul');
ok(/A\.j\.assertions\+\+/.test(bloc), 'bloc : assertion de développement à chaque entrée hors arène');
ok(/actif\(\)&&RUN&&!RUN\.hub&&!ESSAI_U&&RUN\.gardeNow==='final'/.test(bloc) && /const actif=\(\)=>A\.actif!=null\?A\.actif:!!DA\.actif;/.test(bloc), 'bloc : en jeu, l’arène ne s’ouvre que si actif (boss final) ; le mode d’essai l’ouvre même éteinte');
ok(/RUN\.essai=1;/.test(bloc), 'bloc : l’essai pose RUN.essai');
// v18.7 : le crochet jetonTir (combat du Brumeux : un tireur ne prend son jeton que dans la vue ; null ailleurs : HV.jeton, comme avant) ;
// les coups des mécanismes du Brumeux (o.brx) sont exemptés de la règle « on ne frappe que ce qu'on voit », comme les brûlures (o.dot)
ok(/tryTok=function\(e,k\)\{if\(CAM\.on&&e&&e\.type!=='boss'&&arDistRect\(vue\(\),e\.x,e\.y\)>\(k==='r'&&A\.jetonTir!=null\?A\.jetonTir:HV\.jeton\)\)return false;/.test(bloc), 'bloc : pas de jeton d’attaque hors de la vue élargie (le boss n’est pas concerné ; crochet jetonTir du Brumeux, nul ailleurs)');
ok(/hitEnemy=function\(e,base,o\)\{if\(CAM\.on&&e&&!\(o&&\(o\.dot\|\|o\.brx\)\)&&arDistRect\(vue\(\),e\.x,e\.y\)>HV\.coup/.test(bloc), 'bloc : le joueur frappe ce qu’il voit (vue + 60 px ; les mécanismes du Brumeux, o.brx, exemptés)');
ok(/solTrou:null,jetonTir:null\};/.test(bloc), 'bloc : jetonTir est nul par défaut (seul le combat du Brumeux le pose)');
ok(/setRule=function\(\)\{if\(room&&room\.arene\)return;/.test(bloc), 'bloc : aucune règle de salle v14 dans l’arène');
for (const f of ['findSpawn', 'themePos', 'drawFog', 'drawVignette', 'drawParts', 'drawNums', 'hurtPlayer', 'step', 'enterRoom', 'arrowPos', 'drawTelegraphs'])
  ok(new RegExp(`\\b${f}=function`).test(bloc), `bloc : ${f} enveloppé`);
// v18.7 : les zones des mutations (Échos, Glas) et l'Ombre sont des sources de signe et le juge les reconnaît (un Glas frappait « sans signe »)
ok(/if\(room\.z18\)for\(const z of room\.z18\)if\(!z\.fini\)L\.push\(\{id:id\(z\),o:z,k:'tele'/.test(bloc) && /if\(room\.ombre18&&room\.ombre18\.x!=null\)L\.push\(/.test(bloc), 'sources : zones des mutations et Ombre (v18.7)');
ok(/room\.z18\.find\(z=>z\.fini&&Math\.hypot\(P\.x-z\.x,P\.y-z\.y\)<z\.r\+P\.r\)/.test(bloc) && /sorte='mutation:ombre'/.test(bloc), 'juge : la zone de mutation qui éclate, l\'Ombre qui passe (v18.7)');
ok(!/\b(toast|showMur|murmur|msgPush)\(/.test(bloc), 'bloc : aucune bulle ni message (image d’abord)');
ok(/window\.__arene=\{/.test(bloc) && ['etat:', 'cam:', 'vers', 'indic:', 'journal:', 'mesure:'].every(k => bloc.includes(k)), 'bloc : console __arene (etat, cam, vers, indic, journal, mesure)');

console.log(`sim-arene : ${checks} vérifications, ${fails} échec${fails > 1 ? 's' : ''}. (ΔE minimal entre couleurs de signes : ${dEmin.toFixed(1)})`);
process.exit(fails ? 1 : 0);
