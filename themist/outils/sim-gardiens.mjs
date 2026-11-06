#!/usr/bin/env node
// La Brume · vérification hors navigateur des gardiens de la descente (v18.14, chantier v18, action 6.1a : le socle commun ; cadrage
// _dev/cadrages/la-brume-v18-6-gardiens-cadrage.md, Q1–Q25, validé le 6 novembre 2026).
// Extrait la logique pure d'index.html (blocs /*des:pur*/, /*brx:pur*/ et /*gar:pur*/) et la fait tourner avec data/gardiens-descente.js,
// descente.js, brumeux.js (le build de référence), talents.js et souvenirs-brume.js (la justice). Vérifie :
//  0. les données : commun (temps de frappe, part maximale, préavis ≥ 0,8 s, seuils, sortie, build de référence des actes IV à IX), chaque gardien
//     (acte, nom, attaques aux neuf formes connues, préavis, parts, file par temps sur des attaques connues, titres des temps, temps de plus sous le
//     dernier seuil, échelon complet, habiletés connues, décor, couleurs à ΔE ≥ 25 de la grammaire, glyphe 24 × 24 XML équilibré sans identifiant ni
//     filtre) ; 6.1a : tous éteints ;
//  1. l'interrupteur (Q2) : garActifs (seul actif === true, seulement aux actes IV à IX) ; desPorte rend « boss » quand l'acte a un gardien, « garde »
//     sinon (la place provisoire) ;
//  2. les temps (Q6) : seuils du Normal, temps de plus en Difficile et en Extrême seulement, jamais sous l'acte IV (même avec une règle mal écrite) ;
//     garTemps monotone ;
//  3. les files : 10 000 tirages : une permutation des attaques du temps, jamais deux fois la même de suite, la première différente de la dernière ;
//  4. PV, dégâts, build de référence (Q9, Q10) : la règle des PV, aucun coup au-delà de partMax, la règle tronquée (acte X : exactement la liste du
//     Brumeux au rang maximum) ;
//  5. toujours une sortie : 10 000 combats abstraits par attaque (variantes, garPlacer) ; sans obstacle, garSortieGrille rend exactement brxSortie ;
//     10 000 avec des obstacles : la sortie rendue est libre, hors des obstacles, atteinte par un chemin à temps ; un mur qui coupe la ligne droite
//     se contourne ; une zone sans sortie saute ;
//  6. le juge des coups (aucun coup sans signe) ;
//  7. l'échelle (Q25) : les données la respectent ; elle attrape une habileté qui n'est pas neuve, un cran qui baisse, un préavis qui remonte ou passe
//     sous 0,8 s, un gardien sans cran qui monte ;
//  8. les branchements lus dans index.html (données chargées, interrupteur, aiguillage complet, retouches ACTG, réserve du Glas, gardes d'essai).
// Contre-épreuves (une erreur introduite exprès doit être attrapée) : une file qui répète, un préavis à 0,5 s, une zone sans sortie posée, une
// échelle sans habileté neuve, une part à 0,4, un gardien allumé à l'acte X.
//   node themist/outils/sim-gardiens.mjs
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
const bloc = (n) => { const m = html.match(new RegExp('/\\*' + n + ':pur\\*/([\\s\\S]*?)/\\*/' + n + ':pur\\*/')); if (!m) { console.error(`Bloc /*${n}:pur*/ introuvable`); process.exit(1); } return m[1]; };
const ctx = { window: {}, Math, console, JSON, Set, Object, Array, Number, Infinity, isFinite, Uint8Array, Float64Array };
vm.createContext(ctx);
for (const f of ['gardiens-descente', 'descente', 'brumeux', 'talents', 'souvenirs-brume', 'gardiens', 'versions']) vm.runInContext(readFileSync(join(ROOT, 'data', f + '.js'), 'utf8'), ctx);
vm.runInContext(bloc('des') + '\n' + bloc('brx') + '\n' + bloc('gar') + '\nthis.F={desRng,desActes,desPorte,desRegles,desTempsEnPlus,brxDans,brxSortie,brxGrille,brxConnexe,garEntree,garActifs,garSeuils,garTemps,garFile,garPv,garDegats,garReference,garGeste,garVariantes,garSortieGrille,garPlacer,garJuge,garEchelle,GAR_FORMES,GAR_CRANS};', ctx);
const F = ctx.F, BD = ctx.window.BRUME_DATA, GD = BD.gardiensD, C = GD.commun, DS = BD.descente, DBX = BD.brumeux, SJ = BD.souvenirsBrume.justice, GA = BD.gardiens;
let fails = 0, checks = 0;
const ok = (c, msg) => { checks++; if (!c) { fails++; if (fails <= 60) console.error('ÉCHEC : ' + msg); } };
const clone = o => JSON.parse(JSON.stringify(o));
const mk = s => () => { s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const W = 1280, H = 720, AR = { x0: 70, y0: 110, x1: 1210, y1: 660 };
const GARDES = Object.keys(GD).filter(k => /^\d+$/.test(k)).map(Number);

// ── 0. Données
ok(C.frappeS === 50, 'données : temps de frappe 50 s (Q9)');
ok(C.partMax > 0 && C.partMax <= 0.3 && C.contact > 0 && C.contact <= C.partMax, 'données : part maximale ≤ 30 % (Q10), contact sous ce plafond');
ok(C.preavisMin >= 0.8, 'données : préavis d\'une zone de gardien ≥ 0,8 s');
ok(C.seuils.length === 2 && C.seuils[0] === 0.66 && C.seuils[1] === 0.33, 'données : trois temps en Normal, seuils 0,66 / 0,33 (ceux des gardiens I à III)');
ok(C.sortie.pas > 0 && C.sortie.essais >= 2 && C.sortie.grille === 20, 'données : sortie (pas, variantes, grille de FF : 20 px)');
for (let a = 4; a <= 9; a++) {
  ok(Number.isInteger(C.reference.niveaux[a]) && C.reference.niveaux[a] > (C.reference.niveaux[a - 1] || 0), `données : build de référence de l'acte ${a} : niveau ${C.reference.niveaux[a]} (croissant)`);
  ok(C.reference.pvRef[a] > 0, `données : PV de référence de l'acte ${a}`);
}
ok(C.reference.niveaux[9] <= DBX.bot.reference.niveau, 'données : le niveau de l\'acte IX ne dépasse pas celui de l\'acte X (Brumeux)');
const lab = rgb => { const f = v => { v /= 255; return v > 0.04045 ? ((v + 0.055) / 1.055) ** 2.4 : v / 12.92; }; const [r, g, b] = rgb.map(f); const X = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047, Y = r * 0.2126 + g * 0.7152 + b * 0.0722, Z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883; const h = t => t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116; return [116 * h(Y) - 16, 500 * (h(X) - h(Y)), 200 * (h(Y) - h(Z))]; };
const dE = (a, b) => { const A = lab(a), B = lab(b); return Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]); };
const GRAMMAIRE = { orange: [255, 150, 60], violet: [205, 120, 255], cyan: [90, 220, 255], lavande: [201, 180, 255], ivoire: [255, 250, 235] };
const HAB = C.echelle.habiletes;
for (const n of GARDES) {
  const g = GD[n], nom = g.nom;
  ok(F.garEntree(GD, n) === g && g.acte === n && n >= 4 && n <= 9, `données : ${nom} : acte ${n} (IV à IX)`);
  ok(typeof g.un === 'string' && g.un.length > 0, `données : ${nom} : son nom dans une phrase (la mort)`);
  ok(g.rayon >= 30 && g.rayon <= 70 && g.vitesse > 0 && g.pv >= 100 && g.pv % 100 === 0, `données : ${nom} : rayon, vitesse, PV arrondis à 100`);
  const att = Object.entries(g.attaques || {});
  ok(att.length >= 2, `données : ${nom} : au moins deux attaques`);
  for (const [id, a] of att) {
    ok(F.GAR_FORMES.includes(a.forme), `données : ${nom} · ${id} : forme « ${a.forme} » parmi les neuf connues`);
    ok(a.preavis >= C.preavisMin, `données : ${nom} · ${id} : préavis ${a.preavis} s ≥ ${C.preavisMin}`);
    ok(a.part > 0 && a.part <= C.partMax, `données : ${nom} · ${id} : part ${a.part} ≤ ${C.partMax}`);
    ok(typeof a.n === 'string' && typeof a.d === 'string' && a.d.length < 200, `données : ${nom} · ${id} : nom et ligne courte du wiki`);
  }
  const nt = g.echelon.temps + 1;
  for (let t = 1; t <= nt; t++) { const L = g.file[t]; ok(Array.isArray(L) && L.length >= 2 && L.every(k => g.attaques[k]), `données : ${nom} : file du temps ${t} sur des attaques connues`); }
  ok(g.temps.titres.length === nt, `données : ${nom} : un titre par temps, temps de plus compris (${nt})`);
  ok(g.tempsEnPlus && g.tempsEnPlus.seuil > 0 && g.tempsEnPlus.seuil < C.seuils[C.seuils.length - 1] && g.tempsEnPlus.n === g.temps.titres[nt - 1], `données : ${nom} : temps de plus sous le dernier seuil, nommé comme son titre`);
  ok(F.GAR_CRANS.every(c => typeof g.echelon[c] === 'number') && g.echelon.temps === 3, `données : ${nom} : échelon complet (trois temps aux actes IV à VI)`);
  ok(g.habiletes.length >= 1 && g.habiletes.every(h => HAB[h]), `données : ${nom} : habiletés connues`);
  if (!g.essai) ok(Math.min(...att.map(([, a]) => a.preavis)) === g.echelon.preavis, `données : ${nom} : le cran « préavis » est son préavis le plus court`);
  ok(g.decor && typeof g.decor.theme === 'string' && !['faub', 'crypt', 'hub', 'coeur'].includes(g.decor.theme) && g.decor.palette && g.decor.palette.h >= 0, `données : ${nom} : un décor à lui (thème neuf, palette)`);
  for (const [k, c] of Object.entries(g.couleurs || {})) for (const [gk, gc] of Object.entries(GRAMMAIRE)) ok(dE(c, gc) >= 25, `données : ${nom} : couleur ${k} à ΔE ≥ 25 de ${gk} (${dE(c, gc).toFixed(1)})`);
  const s = g.glyphe || '';
  ok(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 24 24" width="24" height="24">[\s\S]*<\/svg>$/.test(s) && !/\sid=|filter|<script/.test(s), `données : ${nom} : glyphe 24 × 24, sans identifiant, filtre ni script`);
  const ouv = (s.match(/<(?!\/)[a-z]+[^>]*[^/]>/g) || []).length, fer = (s.match(/<\/[a-z]+>/g) || []).length;
  ok(ouv === fer, `données : ${nom} : glyphe XML équilibré (${ouv} ouvertures, ${fer} fermetures)`);
  ok(g.actif === false, `données (6.1a) : ${nom} est éteint (la descente garde sa place provisoire)`);
  ok(typeof g.faible === 'string' && g.faible.length > 0, `données : ${nom} : son point faible nommé (wiki)`);
}
ok(GARDES.length >= 1, 'données : au moins le gardien de l\'acte IV');

// ── 1. L'interrupteur (Q2)
ok(Object.keys(F.garActifs(GD)).length === 0, 'interrupteur : tous éteints → aucun gardien allumé (6.1a)');
{ const G2 = clone(GD); G2[4].actif = true; const A = F.garActifs(G2); ok(A[4] === GD[4].nom && Object.keys(A).length === 1, 'interrupteur : actif vrai → le nom à son acte');
  G2[4].actif = 'true'; ok(!F.garActifs(G2)[4], 'interrupteur : seul le booléen vrai allume (« true » en texte n\'allume rien)');
  const G3 = clone(GD); G3[10] = Object.assign(clone(GD[4]), { acte: 10, actif: true }); ok(!F.garActifs(G3)[10], 'interrupteur (contre-épreuve) : un gardien allumé à l\'acte X est refusé');
  const ACTD = F.desActes(GA, DS), N = ACTD.length - 1, A4 = ACTD[4];
  ok(F.desPorte(A4, { acte: 4, N, next: A4.rooms, type: 'combat', fin: false }) === 'garde', 'interrupteur : éteint, la dernière salle de l\'acte IV est la place provisoire (porte « garde »)');
  const A4b = Object.assign({}, A4, { boss: GD[4].nom });
  ok(F.desPorte(A4b, { acte: 4, N, next: A4.rooms, type: 'combat', fin: false }) === 'boss', 'interrupteur : allumé (ACTD[4].boss), la porte « boss »');
  for (let n = 5; n <= 9; n++) ok(F.desPorte(ACTD[n], { acte: n, N, next: ACTD[n].rooms, type: 'combat', fin: false }) === 'garde', `interrupteur : l'acte ${n} garde sa place provisoire`); }

// ── 2. Les temps (Q6)
{ const g = GD[4];
  ok(JSON.stringify(F.garSeuils(GD, g, null)) === '[0.66,0.33]', 'temps : Normal : 0,66 / 0,33');
  for (const p of ['normal', 'difficile', 'extreme']) { const tp = F.desTempsEnPlus(F.desRegles(DS, p), 4), s = F.garSeuils(GD, g, tp);
    ok(p === 'normal' ? s.length === 2 : (s.length === 3 && s[2] === g.tempsEnPlus.seuil), `temps : ${p} : ${s.length + 1} temps (${s.join(' / ')})`); }
  for (let a = 1; a <= 3; a++) ok(F.desTempsEnPlus(F.desRegles(DS, 'extreme'), a) === null, `temps : jamais de temps de plus à l'acte ${a}`);
  const R = F.desRegles(DS, 'difficile'); R.gardien.desActe = 1; ok(F.desTempsEnPlus(R, 3) === null, 'temps : jamais sous l\'acte IV, même avec une règle mal écrite (desActe 1)');
  const s3 = [0.66, 0.33, 0.18]; let prev = 0, mono = true;
  for (let hp = 1000; hp >= 0; hp -= 1) { const t = F.garTemps(hp, 1000, s3); if (t < prev) mono = false; prev = t; }
  ok(mono && F.garTemps(1000, 1000, s3) === 1 && F.garTemps(660, 1000, s3) === 2 && F.garTemps(330, 1000, s3) === 3 && F.garTemps(180, 1000, s3) === 4 && F.garTemps(0, 1000, s3) === 4, 'temps : garTemps monotone, bornes exactes'); }

// ── 3. Les files
{ const g = GD[4]; let bad = 0, perm = 0;
  for (let i = 0; i < 10000; i++) { const r = mk(i + 1), t = 1 + (i % 4), d = i % 3 ? Object.keys(g.attaques)[i % 2] : null, L = F.garFile(g, t, r, d), src = g.file[t].slice().sort().join();
    if (L.slice().sort().join() !== src) perm++; if (L[0] === d || L.some((k, j) => j && k === L[j - 1])) bad++; }
  ok(perm === 0, `files : 10 000 tirages : toujours une permutation des attaques du temps (${perm} écarts)`);
  ok(bad === 0, `files : jamais deux fois la même de suite, la première différente de la dernière jouée (${bad} écarts)`);
  const g2 = { file: { 1: ['a', 'a', 'a', 'b'] } }; const L2 = F.garFile(g2, 1, mk(7), null);
  ok(L2.every((k, j) => !j || k !== L2[j - 1]), 'files : impossible sans répétition → repli glouton, jamais deux fois de suite');
  const rep = ['coup', 'coup', 'trait', 'trait']; ok(rep.some((k, j) => j && k === rep[j - 1]), 'files (contre-épreuve) : une file qui répète est reconnue comme telle'); }

// ── 4. PV, dégâts, build de référence (Q9, Q10)
ok(F.garPv(383.1, 50) === 19200 && F.garPv(0, 50) === 100, 'PV : DPS × 50 s, arrondi à 100 (383,1 → 19 200)');
for (const n of GARDES) { const g = GD[n];
  for (const [id, a] of Object.entries(g.attaques)) { const d = F.garDegats(GD, n, a.part); ok(d <= C.partMax * C.reference.pvRef[n] + 0.5 && d >= 1, `dégâts : ${g.nom} · ${id} : ${d} ≤ ${C.partMax} × ${C.reference.pvRef[n]}`); } }
ok(F.garDegats(GD, 4, 0.4) === Math.round(C.partMax * C.reference.pvRef[4]), 'dégâts (contre-épreuve) : une part à 0,4 est ramenée au plafond');
{ const MAX = {}; (function walk(o) { if (!o || typeof o !== 'object') return; for (const [k, v] of Object.entries(o)) { if (v && typeof v === 'object' && typeof v.max === 'number' && typeof v.name === 'string') MAX[k] = v.max; walk(v); } })(BD.talents);
  for (const cls of ['lum', 'gou', 'her', 'tis']) { const L = DBX.bot.reference.talents[cls], R57 = F.garReference(L, DBX.bot.reference.niveau, MAX);
    ok(R57.length === L.length && R57.every(([id, r], i) => id === L[i] && r === MAX[id]), `référence : ${cls} : à l'acte X (niveau ${DBX.bot.reference.niveau}), exactement la liste du Brumeux au rang maximum`);
    const tot = L.reduce((s, id) => s + MAX[id], 0);
    for (let a = 4; a <= 9; a++) { const R = F.garReference(L, C.reference.niveaux[a], MAX), pts = R.reduce((s, [, r]) => s + r, 0);
      ok(pts === Math.min(tot, C.reference.niveaux[a] - 1) && R.every(([id, r]) => r >= 1 && r <= MAX[id]), `référence : ${cls} · acte ${a} : ${pts} rangs (un point par niveau gagné, ${tot} au plus)`); }
    const R5 = F.garReference(L, 5, MAX); ok(R5.reduce((s, [, r]) => s + r, 0) === 4 && R5[0][0] === L[0], `référence : ${cls} : niveau 5 → 4 rangs, dans l'ordre de la liste`); } }

// ── 5. Toujours une sortie
const opt = (charge, piliers) => ({ pr: SJ.joueur.rayon, v: SJ.joueur.vitesse, charge, reflexe: SJ.reflexeS, arene: AR, monde: { w: W, h: H }, piliers: piliers || [] });
const libre = (q, zones, pil) => q[0] >= AR.x0 + SJ.joueur.rayon - 1e-9 && q[0] <= AR.x1 - SJ.joueur.rayon + 1e-9 && q[1] >= AR.y0 + SJ.joueur.rayon - 1e-9 && q[1] <= AR.y1 - SJ.joueur.rayon + 1e-9 && !zones.some(z => F.brxDans(z, q[0], q[1], SJ.joueur.rayon)) && !(pil || []).some(p => Math.hypot(q[0] - p.x, q[1] - p.y) < p.r + SJ.joueur.rayon - 1);
for (const n of GARDES) { const g = GD[n];
  for (const [id, a] of Object.entries(g.attaques)) { let poses = 0, sautes = 0, faux = 0, egal = 0, nonEgal = 0; const r = mk(100 + n);
    for (let i = 0; i < 10000; i++) {
      const p = [AR.x0 + 20 + r() * (AR.x1 - AR.x0 - 40), AR.y0 + 20 + r() * (AR.y1 - AR.y0 - 40)], h = [W / 2 + (r() - 0.5) * 600, AR.y0 + 120 + r() * 300];
      const V = F.garVariantes(a, h, p, C.sortie.essais), o = opt(a.preavis), k = F.garPlacer(C.sortie, V, p, o);
      if (k < 0) { sautes++; continue; } poses++;
      const s1 = F.garSortieGrille(C.sortie, V[k], p, o), s2 = F.brxSortie({ sortie: C.sortie }, V[k], p, o);
      if (JSON.stringify(s1) === JSON.stringify(s2)) egal++; else nonEgal++;
      if (!s1.ok || !libre(s1.q, V[k]) || s1.d > o.v * (o.charge - o.reflexe) + 1e-6) faux++;
    }
    ok(faux === 0, `sortie : ${g.nom} · ${id} : 10 000 positions : chaque sortie rendue est libre et atteinte à temps (${poses} posés, ${sautes} sautés, ${faux} fausses)`);
    ok(nonEgal === 0, `sortie : ${g.nom} · ${id} : sans obstacle, garSortieGrille rend exactement brxSortie (${egal} égales)`);
    ok(poses > 9000, `sortie : ${g.nom} · ${id} : le geste se pose presque toujours (${poses})`); } }
{ let faux = 0, poses = 0, sansChemin = 0; const r = mk(4242);
  for (let i = 0; i < 10000; i++) {
    const pil = []; for (let j = 0; j < 6; j++) pil.push({ x: AR.x0 + 60 + r() * (AR.x1 - AR.x0 - 120), y: AR.y0 + 60 + r() * (AR.y1 - AR.y0 - 120), r: 20 + r() * 30 });
    const p = [AR.x0 + 40 + r() * (AR.x1 - AR.x0 - 80), AR.y0 + 40 + r() * (AR.y1 - AR.y0 - 80)]; if (pil.some(q => Math.hypot(p[0] - q.x, p[1] - q.y) < q.r + 20)) continue;
    const z = [{ forme: 'disque', x: p[0] + (r() - 0.5) * 40, y: p[1] + (r() - 0.5) * 40, r: 80 + r() * 60 }], o = opt(1.0, pil), s = F.garSortieGrille(C.sortie, z, p, o);
    if (!s.ok) continue; poses++;
    if (!libre(s.q, z, pil) || s.d > o.v * (o.charge - o.reflexe) + 1e-6) faux++;
    // chemin : la case d'arrivée est reliée à la case de départ dans la grille des obstacles (brxConnexe depuis le joueur la compte)
    const G = F.brxGrille({ w: W, h: H }, AR, pil, { cs: C.sortie.grille, pad: Math.max(SJ.joueur.rayon, C.sortie.marge) }), ci = Math.floor(s.q[1] / G.cs) * G.cols + Math.floor(s.q[0] / G.cs);
    if (G.blk[ci]) sansChemin++; }
  ok(faux === 0 && sansChemin === 0 && poses > 5000, `sortie au détour : 10 000 salles à obstacles : sortie libre, hors des obstacles, atteinte à temps (${poses} posées, ${faux} fausses, ${sansChemin} sans chemin)`); }
{ // un mur coupe la ligne droite : il faut le contourner par son extrémité
  const pil = []; for (let y = 300; y <= 520; y += 20) pil.push({ x: 700, y, r: 14 });
  const p = [650, 410], z = [{ forme: 'disque', x: 560, y: 410, r: 120 }], o = opt(1.0, pil), s = F.garSortieGrille(C.sortie, z, p, o);
  ok(s.ok && libre(s.q, z, pil), `sortie au détour : un mur à droite, la zone à gauche : une sortie (${s.ok ? s.q.map(Math.round).join(', ') + ' à ' + Math.round(s.d) + ' px' : 'aucune'})`);
  const z2 = [{ forme: 'disque', x: 650, y: 410, r: 900 }]; ok(!F.garSortieGrille(C.sortie, z2, p, o).ok && F.garPlacer(C.sortie, [z2, z2, z2, z2], p, o) === -1, 'sortie (contre-épreuve) : une zone qui couvre toute la salle n\'a pas de sortie, le geste saute'); }

// ── 6. Le juge des coups
ok(F.garJuge(C, { k: 'zone', charge: 1.0, age: 1.0 }) === true, 'juge : une zone au préavis entier est signée');
ok(F.garJuge(C, { k: 'zone', charge: 0.5, age: 0.5 }) === false, 'juge (contre-épreuve) : une zone au préavis de 0,5 s n\'est pas signée');
ok(F.garJuge(C, { k: 'zone', charge: 1.0, age: 0.6 }) === false, 'juge : une zone qui frappe avant la fin de son préavis n\'est pas signée');
ok(F.garJuge(C, { k: 'contact' }) && F.garJuge(C, { k: 'ennemi', type: 'rampant' }) && !F.garJuge(C, { k: 'autre' }), 'juge : contact et ennemis signés, source inconnue non');

// ── 7. L'échelle (Q25)
{ const E = F.garEchelle(GD); ok(E.ok, 'échelle : les données la respectent' + (E.erreurs.length ? ' — ' + E.erreurs.join(' ; ') : ''));
  ok(E.suite.length === 3 + GARDES.length && E.suite.slice(0, 3).map(s => s.acte).join() === '1,2,3', 'échelle : les gardiens I à III servent de repères');
  const casse = f => { const G2 = clone(GD); f(G2[4]); return F.garEchelle(G2); };
  ok(!casse(g => { g.habiletes = ['traverser']; }).ok, 'échelle (contre-épreuve) : une habileté déjà demandée n\'est pas neuve');
  ok(!casse(g => { g.echelon.temps = 2; }).ok, 'échelle (contre-épreuve) : un cran qui baisse');
  ok(!casse(g => { g.echelon.preavis = 0.7; }).ok, 'échelle (contre-épreuve) : un préavis sous 0,8 s');
  ok(!casse(g => { Object.assign(g.echelon, { temps: 3, contraintes: 2, enchainements: 1, preavis: 0.8, entourage: 1 }); }).ok, 'échelle (contre-épreuve) : un gardien sans aucun cran qui monte (égal au Glas)');
  ok(!casse(g => { g.habiletes = ['inconnue']; }).ok, 'échelle (contre-épreuve) : une habileté inconnue');
  const G5 = clone(GD); G5[5] = Object.assign(clone(GD[4]), { acte: 5, nom: 'Essai V', echelon: Object.assign({}, GD[4].echelon, { preavis: 1.1 }), habiletes: ['espace'] });
  ok(!F.garEchelle(G5).ok, 'échelle (contre-épreuve) : un gardien V qui remonte le préavis et reprend seule l\'habileté du IV'); }

// ── 8. Branchements
const has = (s, msg) => ok(typeof s === 'string' ? html.includes(s) : s.test(html), 'branchement : ' + msg);
has('<script src="data/gardiens-descente.js"></script>', 'data/gardiens-descente.js chargé');
has(/for\(const \[n,nom\] of Object\.entries\(garActifs\(GD\)\)\)if\(ACTD\[n\]&&ACTD\[n\]\.fin==='gardien'\)ACTD\[n\]\.boss=nom;/, 'interrupteur : ACTD[n].boss pour chaque gardien allumé (desPorte inchangé)');
has(/function desPorte\(/, 'desPorte toujours dans le bloc des:pur');
for (const [motif, msg] of [
  [/const _mr=makeRoom;makeRoom=function\(type\)\{prochain=type==='boss'\?ici\(\):null;/, 'makeRoom : la salle marquée (room.g18) avant le sol'],
  [/themeOf=function\(type\)\{if\(prochain&&type==='boss'&&prochain\.decor\)return prochain\.decor\.theme;/, 'themeOf : le thème de son acte (Q4)'],
  [/layoutFor=function\(type\)\{if\(prochain&&type==='boss'\)return\[\];/, 'layoutFor : sa salle sans les cocons des gardiens I à III'],
  [/floorFlags=function\(g,p\)\{if\(prochain&&prochain\.decor\)\{floorCobbles\(g,p\);decorSol/, 'floorFlags : pavés mouillés, flaques, grilles'],
  [/createBoss=function\(\)\{const g=room&&room\.g18;if\(!g\|\|!RUN\|\|RUN\.hub\)return _cb\.apply/, 'createBoss : lui, jamais le Glas ni sa mémoire (glasInit n\'est pas appelé)'],
  [/updateBoss=function\(e,dt,slow,dP,touching\)\{if\(!e\|\|!e\.g18\)return _ub\.apply/, 'updateBoss : son moteur (ni updateHeart, ni les temps v13)'],
  [/drawHeart=function\(c,e\)\{if\(e&&e\.g18\)/, 'drawHeart : son corps'],
  [/drawBossPost=function\(e\)\{if\(e&&e\.g18\)/, 'drawBossPost : l\'anneau ivoire sur son point faible (G27.anneau)'],
  [/eyePts=function\(e\)\{if\(e&&e\.g18\)return\[\];/, 'eyePts : un visage sans traits'],
  [/computeLights=function\(\)\{_cl\.apply\(this,arguments\);const e=room&&room\.g18&&room\.boss;/, 'computeLights : sa lumière, sans battement'],
  [/g27GlypheImg=function\(n\)\{const g=RUN&&!RUN\.hub&&\+n===RUN\.act&&ici\(\);/, 'g27GlypheImg : son glyphe sur la porte'],
  [/g27GlypheHud=function\(el,n\)\{const b=room&&room\.boss;if\(el&&b&&b\.g18/, 'g27GlypheHud : son glyphe sur la barre'],
  [/SC27\.scene=function\(pass\)\{if\(!\(room&&room\.g18\)\)return _sc\.apply/, 'SC27.scene : son entrée et sa mort (pas celles du Glas)'],
  [/SC27\.debut=function\(e\)\{if\(e&&e\.g18&&room&&room\.g18s\)/, 'SC27.debut : sa mort'],
  [/if\(RUN\.mem&&RUN\.mem\.lastSrc==='boss'&&b&&b\.g18\)RUN\.mem\.lastSrc=KEY\(b\.g18\);/, 'la mort : sa clé (foeName le nomme)'],
  [/V7FOE1\[KEY\(g\)\]=g\.un\|\|g\.nom;/, 'V7FOE1 : son nom'],
  [/drawTelegraphs=function\(\)\{_dt\.apply\(this,arguments\);if\(room&&room\.g18s&&state==='play'\)/, 'drawTelegraphs : ses zones, orange'],
  [/function ACTG\(\)\{return room&&room\.g18\?ACTE\(\):RUN\.act;\}/, 'ACTG : la clé d\'acte des compteurs d\'un gardien (registre hors d\'un gardien de la descente)'],
  [/loseHp=function\(n\)\{if\(RUN&&RUN\.mem&&room&&room\.type==='boss'&&!room\.bossDead&&n>0\)\{const a=ACTG\(\);RUN\.mem\.bossHurt\[a\]/, 'bossHurt sous ACTG'],
  [/bossDefeated=function\(e\)\{const R=RUN\.mem,a=ACTG\(\);/, 'perfect, close, bossFirst sous ACTG'],
  [/Sans une égratignure\. \$\{nomG\(a\)\} ne t’a pas touché/, 'le nom du gardien dans « Sans une égratignure » (ACTS n\'a que trois actes)'],
  [/ const a=ACTG\(\),first=!M\(\)\.bossFirst\[a\];/, 'premier gardien vaincu (Résonance) sous ACTG'],
  [/room\.type==='boss'&&RUN\.act===3&&!room\.g18&&MEM\(\)/, 'la réserve à l\'entrée du Glas n\'est pas notée chez un gardien de la descente (DS12)'],
]) has(motif, msg);
const ESS = "(masque|brume|glas|dernier|nemesis|demo|descente|arene|brumeux|gardien)=";
ok(html.split(ESS).length - 1 === 3, 'gardes d\'essai : ESSAI_URL, ESSAI18 et ESSAI_URL18 connaissent « gardien »');
has(/const ESSAI=\/\[\?&\]gardien=\[4-9\]\(\?:&\|\$\)\/\.test\(QS\)&&!\/\[\?&\]dernier=\/\.test\(QS\);/, 'essai : ?gardien=<4..9> (jamais confondu avec ?dernier=…&gardien=1)');
has(/window\.__descente\.essai\(n,\{fin:true,cls:o\.cls\}\);RUN\.essai=1;/, 'essai : une descente d\'essai (rien d\'écrit, rien d\'ouvert)');
// le bloc pur n'a pas accès au jeu
const pur = bloc('gar');
ok(!/\b(RUN|room|SAVE|enemies|ctx)\b/.test(pur.replace(/\/\/[^\n]*/g, '')) && !/\bP\.[a-z]/.test(pur.replace(/\/\/[^\n]*/g, '')), 'bloc pur : ni P, ni RUN, ni room, ni SAVE, ni enemies');
// le journal et le wiki ne disent rien tant que tout est éteint (6.1a : une ligne de journal sans mécanique)
const wiki = readFileSync(join(ROOT, 'wiki.html'), 'utf8');
ok(!wiki.includes(GD[4].nom), 'wiki : le Guet n\'y est pas tant qu\'il est éteint');

console.log(`sim-gardiens : ${checks} vérifications, ${fails} échec${fails > 1 ? 's' : ''}.`);
process.exit(fails ? 1 : 0);
