#!/usr/bin/env node
// La Brume · vérification hors navigateur des gardiens de la descente (v18.14, chantier v18, action 6.1a : le socle commun ; cadrage
// _dev/cadrages/la-brume-v18-6-gardiens-cadrage.md, Q1–Q25, validé le 6 novembre 2026).
// Extrait la logique pure d'index.html (blocs /*des:pur*/, /*brx:pur*/ et /*gar:pur*/) et la fait tourner avec data/gardiens-descente.js,
// descente.js, brumeux.js (le build de référence), talents.js et souvenirs-brume.js (la justice). Vérifie :
//  0. les données : commun (temps de frappe, part maximale, préavis ≥ 0,8 s, seuils, sortie, build de référence des actes IV à IX), chaque gardien
//     (acte, nom, attaques aux neuf formes connues, préavis, parts, file par temps sur des attaques connues, titres des temps, temps de plus sous le
//     dernier seuil, échelon complet, habiletés connues, décor, couleurs à ΔE ≥ 25 de la grammaire, glyphe 24 × 24 XML équilibré sans identifiant ni
//     filtre) ; 6.1b : le Guet allumé (dessin, lecture, codex), les autres éteints ;
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
//  8. les branchements lus dans index.html (données chargées, interrupteur, aiguillage complet, retouches ACTG, réserve du Glas, gardes d'essai) ;
//  9. le Guet Sans-Nom (6.1b) : herses (10 000 Fermetures), Couvre-feu (2 000 suites), Contrôle (sortie par le guichet), Rafle, Vouge, Feuillets, parts,
//     Relève, branchements (tirs qui passent, il traverse ses herses, sol, journal des tirs, codex).
//  6.1c (relecture, v18.16) : la vraie salle (AR0) ; le rouge des ennemis dans la grammaire ; la herse en cases (un corps dans le guichet qui ne touche
//     aucun barreau n'est jamais frappé) ; au Couvre-feu, une herse qui tombe ne passe jamais dans le guichet d'une herse debout ; les branchements de
//     la relecture (C2 à C23, H1 : memoire.md, § 46).
// Contre-épreuves (une erreur introduite exprès doit être attrapée) : une file qui répète, un préavis à 0,5 s, une zone sans sortie posée, une
// échelle sans habileté neuve, une part à 0,4, un gardien allumé à l'acte X ; 6.1c : des couloirs à la place des cases frappent dans le guichet ; la
// logique pure sans la règle des guichets perpendiculaires (copie modifiée, garSans) entame des guichets.
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
for (const f of ['gardiens-descente', 'descente', 'brumeux', 'talents', 'souvenirs-brume', 'gardiens', 'versions', 'bestiaire', 'histoire']) vm.runInContext(readFileSync(join(ROOT, 'data', f + '.js'), 'utf8'), ctx);
vm.runInContext(bloc('des') + '\n' + bloc('brx') + '\n' + bloc('gar') + '\nthis.F={desRng,desActes,desPorte,desRegles,desTempsEnPlus,brxDans,brxSortie,brxGrille,brxConnexe,garEntree,garActifs,garSeuils,garTemps,garFile,garPv,garDegats,garReference,garGeste,garVariantes,garSortieGrille,garPlacer,garJuge,garEchelle,GAR_FORMES,GAR_CRANS,garTroncons,garHerse,garHerseC,garGuichets,garFermeture,garCoupes,garSection,garVoisines,garSortie2,garRafle,garVouge,garFeuillets,garVolPage,garCouvreAvant,garCouvreApres,garConnexe,garParTemps,garFermer};', ctx);
// 6.1c : une copie de la logique pure avec un morceau retiré (contre-épreuves)
const garSans = (morceau) => { const g = bloc('gar'); if (!g.includes(morceau)) { console.error('contre-épreuve : morceau introuvable : ' + morceau); process.exit(1); }
  const c2 = { window: {}, Math, console, JSON, Set, Object, Array, Number, Infinity, isFinite, Uint8Array, Float64Array }; vm.createContext(c2);
  vm.runInContext(bloc('des') + '\n' + bloc('brx') + '\n' + g.replace(morceau, '') + '\nthis.F={garFermer,garCouvreAvant,garCouvreApres,garConnexe,garFermeture,garHerse};', c2); return c2.F; };
const F = ctx.F, BD = ctx.window.BRUME_DATA, GD = BD.gardiensD, C = GD.commun, DS = BD.descente, DBX = BD.brumeux, SJ = BD.souvenirsBrume.justice, GA = BD.gardiens;
let fails = 0, checks = 0;
const ok = (c, msg) => { checks++; if (!c) { fails++; if (fails <= 60) console.error('ÉCHEC : ' + msg); } };
const clone = o => JSON.parse(JSON.stringify(o));
const mk = s => () => { s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
// 6.1c : la vraie salle (AR0 d'index.html : const AR={x0:56,y0:92,x1:W-56,y1:H-44}), vérifiée au § 8
const W = 1280, H = 720, AR = { x0: 56, y0: 92, x1: W - 56, y1: H - 44 };
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
// 6.1c : le rouge des ennemis ordinaires (FOE) entre dans la grammaire
const GRAMMAIRE = { orange: [255, 150, 60], violet: [205, 120, 255], cyan: [90, 220, 255], lavande: [201, 180, 255], ivoire: [255, 250, 235], rouge: [255, 58, 52] };
const HAB = C.echelle.habiletes;
for (const n of GARDES) {
  const g = GD[n], nom = g.nom;
  ok(F.garEntree(GD, n) === g && g.acte === n && n >= 4 && n <= 9, `données : ${nom} : acte ${n} (IV à IX)`);
  ok(typeof g.un === 'string' && g.un.length > 0, `données : ${nom} : son nom dans une phrase (la mort)`);
  ok(g.rayon >= 30 && g.rayon <= 70 && g.vitesse > 0 && g.pv >= 100 && g.pv % 100 === 0, `données : ${nom} : rayon, vitesse, PV arrondis à 100`);
  const att = Object.entries(g.attaques || {});
  ok(att.length >= 2, `données : ${nom} : au moins deux attaques`);
  for (const [id, a] of att) {
    ok(F.GAR_FORMES.includes(a.forme) || a.forme === 'invocation', `données : ${nom} · ${id} : forme « ${a.forme} » parmi les neuf connues (ou une invocation)`);
    // 6.1b : un tir à trajectoire annoncée a sa ligne violette (preavisTir) ; une zone, son préavis plancher ; une invocation, le signe d'arrivée du jeu
    const pmin = a.forme === 'projectile' ? C.preavisTir : a.forme === 'invocation' ? 0.8 : C.preavisMin;
    ok(a.preavis >= pmin && Object.values(a.preavisT || {}).every(v => v >= pmin), `données : ${nom} · ${id} : préavis ${a.preavis} s (par temps : ${JSON.stringify(a.preavisT || {})}) ≥ ${pmin}`);
    if (a.forme !== 'invocation') ok(a.part > 0 && a.part <= C.partMax && (a.forme !== 'projectile' || a.part <= 0.12), `données : ${nom} · ${id} : part ${a.part} ≤ ${C.partMax} (un tir isolé ≤ 12 %, Q10)`);
    else ok(a.max >= 1 && a.max <= 7 && a.types.every(t => BD.bestiaire.ennemis[t]), `données : ${nom} · ${id} : invocation de types connus, au plus ${a.max} vivants`);
    ok(typeof a.n === 'string' && typeof a.d === 'string' && a.d.length < 200, `données : ${nom} · ${id} : nom et ligne courte du wiki`);
  }
  const nt = g.echelon.temps + 1;
  for (let t = 1; t <= nt; t++) { const L = g.file[t]; ok(Array.isArray(L) && L.length >= 2 && L.every(k => g.attaques[k] || (g.fermetures || {})[k]), `données : ${nom} : file du temps ${t} sur des attaques (ou des Fermetures) connues`); }
  for (const [k, Fm] of Object.entries(g.fermetures || {})) ok(g.attaques[Fm.herse] && ['couloir', 'croix'].includes(g.attaques[Fm.herse].forme) && g.attaques[Fm.suite] && g.attaques[Fm.suite].forme === 'case' && !g.attaques[k], `données : ${nom} · Fermeture ${k} : une herse (ou une Croix) puis une section (case)`);
  ok(g.temps.titres.length === nt, `données : ${nom} : un titre par temps, temps de plus compris (${nt})`);
  ok(g.tempsEnPlus && g.tempsEnPlus.seuil > 0 && g.tempsEnPlus.seuil < C.seuils[C.seuils.length - 1] && g.tempsEnPlus.n === g.temps.titres[nt - 1], `données : ${nom} : temps de plus sous le dernier seuil, nommé comme son titre`);
  ok(F.GAR_CRANS.every(c => typeof g.echelon[c] === 'number') && g.echelon.temps === 3, `données : ${nom} : échelon complet (trois temps aux actes IV à VI)`);
  ok(g.habiletes.length >= 1 && g.habiletes.every(h => HAB[h]), `données : ${nom} : habiletés connues`);
  if (!g.essai) { const zs = att.filter(([, a]) => F.GAR_FORMES.includes(a.forme) && a.forme !== 'projectile'), pm = Math.min(...zs.flatMap(([, a]) => [a.preavis, ...Object.values(a.preavisT || {})]));
    ok(pm === g.echelon.preavis, `données : ${nom} : le cran « préavis » est son préavis de zone le plus court (${pm})`); }
  ok(g.decor && typeof g.decor.theme === 'string' && !['faub', 'crypt', 'hub', 'coeur'].includes(g.decor.theme) && g.decor.palette && g.decor.palette.h >= 0, `données : ${nom} : un décor à lui (thème neuf, palette)`);
  for (const [k, c] of Object.entries(g.couleurs || {})) for (const [gk, gc] of Object.entries(GRAMMAIRE)) ok(dE(c, gc) >= 25, `données : ${nom} : couleur ${k} à ΔE ≥ 25 de ${gk} (${dE(c, gc).toFixed(1)})`);
  const s = g.glyphe || '';
  ok(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 24 24" width="24" height="24">[\s\S]*<\/svg>$/.test(s) && !/\sid=|filter|<script/.test(s), `données : ${nom} : glyphe 24 × 24, sans identifiant, filtre ni script`);
  const ouv = (s.match(/<(?!\/)[a-z]+[^>]*[^/]>/g) || []).length, fer = (s.match(/<\/[a-z]+>/g) || []).length;
  ok(ouv === fer, `données : ${nom} : glyphe XML équilibré (${ouv} ouvertures, ${fer} fermetures)`);
  ok(n === 4 ? g.actif === true && g.essai === false : g.actif === false, `données (6.1b) : ${nom} : ${n === 4 ? 'allumé, plus un gardien d\'essai' : 'éteint'}`);
  if (g.actif) { ok(g.dessin && g.dessin.version >= 1 && typeof g.dessin.lecture === 'string' && g.wiki && g.wiki.done && g.wiki.journal, `données : ${nom} : allumé, il a son dessin (version ≥ 1), sa lecture et ses lignes de wiki`);
    ok(BD.histoire.codex.some(c => c.gardien === n), `données : ${nom} : allumé, il a son entrée de codex (Q13)`); }
  ok(typeof g.faible === 'string' && g.faible.length > 0, `données : ${nom} : son point faible nommé (wiki)`);
}
ok(GARDES.length >= 1, 'données : au moins le gardien de l\'acte IV');

// ── 1. L'interrupteur (Q2)
ok(JSON.stringify(F.garActifs(GD)) === JSON.stringify({ 4: GD[4].nom }), 'interrupteur : le Guet allumé à l\'acte IV, les autres éteints (6.1b)');
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
  // le moteur générique (garVariantes) : les attaques aux formes simples ; la herse, la section, la Vouge, les Feuillets et l'Appel ont leur section (9)
  const propre = (id, a) => !['disque', 'couloir', 'cone', 'anneau'].includes(a.forme) || a.atteinte || Object.values(g.fermetures || {}).some(Fm => Fm.herse === id || Fm.suite === id);
  for (const [id, a] of Object.entries(g.attaques)) { if (propre(id, a)) continue; let poses = 0, sautes = 0, faux = 0, egal = 0, nonEgal = 0; const r = mk(100 + n);
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
ok(F.garJuge(C, { k: 'tir', charge: 0.6 }) && !F.garJuge(C, { k: 'tir', charge: 0.3 }), 'juge (6.1b) : un tir dont la ligne a duré preavisTir est signé ; une ligne de 0,3 s ne l\'est pas (contre-épreuve)');

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
  [/computeLights=function\(\)\{_cl\.apply\(this,arguments\);const g=room&&room\.g18,s=S\(\);if\(!g\|\|!s\)return;/, 'computeLights : sa lumière, sans battement (6.1c : elle suit son entrée et sa mort)'],
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
has(/window\.__descente\.essai\(n,\{fin:true,cls:o\.cls\}\);\}finally\{ST\.enCours=false;\}RUN\.essai=1;ST\.run=RUN;/, 'essai : une descente d\'essai (RUN.essai), liée à sa descente (ST.run)');
// 6.1c : la relecture indépendante (memoire.md, § 46)
ok(/const AR=\{x0:56,y0:92,x1:W-56,y1:H-44\};/.test(html), 'branchement (6.1c) : le simulateur teste la vraie salle (AR0)');
for (const [motif, msg] of [
  [/return g\.actif===true\|\|\(ST\.force===g&&\(ST\.enCours\|\|ST\.run===RUN\)\)\?g:null;/, 'C2 : un essai ne vaut que pour sa descente (ici)'],
  [/const _sr18=startRun;startRun=function\(\)\{const r=_sr18\.apply\(this,arguments\);if\(!ST\.enCours&&ST\.run&&ST\.run!==RUN\)finEssai\(\);return r;\};/, 'C2 : la descente suivante défait l\'essai (finEssai)'],
  [/function essaiG18\(\)\{return !!\(RUN&&RUN\.essai&&room&&room\.g18\);\}/, 'C3 : essaiG18 (base)'],
  [/const m=M\(\);if\(essaiG18\(\)\)\{\}else if\(!m\.bossFirst\[a\]\)/, 'C3 : ni bossFirst ni fragment en essai'],
  [/ if\(essaiG18\(\)\)return;   \/\/ v18\.16 \(6\.1c\) : un essai d'un gardien de la descente n'ouvre pas le Portail/, 'C3 : ni Portail ni Résonance en essai'],
  [/const _dep=drawEproj;drawEproj=function\(\)\{if\(!\(room&&room\.g18s&&eproj\.some\(p=>p\.g18f\)\)\)return _dep\.apply/, 'C4 : ses pages dessinées à part (pas comme les tirs du Glas)'],
  [/L=lgTir\(q,G\.attaques\[q\.id\]\)/, 'C5 : la ligne violette couvre tout le vol (a.len, au mur)'],
  [/for\(let i=0;i<n;i\+\+\)\{P\.x\+=dx\/d\*k\/n;P\.y\+=dy\/d\*k\/n;collidePlayer\(\);\}/, 'C6 : le recul par pas (jamais à travers une herse)'],
  [/if\(\(P\.iT\|\|0\)>it0\+1e-6\|\|P\.hp<hp0-1e-6\)\{s\.contactT=/, 'C6 : le recul seulement si le coup a porté'],
  [/for\(const q of h\.pil\)room\.pillars\.push\(q\);CAM\.ff=1;/, 'C7 : la carte des chemins refaite quand une herse tombe'],
  [/room\.pillars=room\.pillars\.filter\(p=>p\.herse18!==h\);CAM\.ff=1;\}/, 'C7 : … et quand elle se relève'],
  [/if\(!RM&&TINT\[KEY\(g\)\]\)tlights\.push\(\{x:e\.x,y:e\.y,r:360,t:0\.5,max:0\.5,c:KEY\(g\)\}\);/, 'C9 : l\'éclat du changement de temps à sa teinte, aucun en mouvements réduits'],
  [/shadowAt\(c,0,r\*0\.9,r\*0\.6,r\*0\.16,0\.4\);/, 'C10 : l\'ombre resserrée'],
  [/G27\.poser\(c,imgPage\(g,r\)\)/, 'C10 : la page du Couvre-feu cuite avec sa lueur'],
  [/function titre\(s,txt,e\)\{s\.titre=/, 'C11 : ses titres fixes (plus addNum)'],
  [/mortGuet\(ctx,m\.e,u,m\.tp\|\|3,m\.mir\)/, 'C12 : sa mort tournée comme il l\'était'],
  [/else if\(P\.x<e\.x-20\)e\.mir18=true;else if\(P\.x>e\.x\+20\)e\.mir18=false;/, 'C13 : le miroir avec une marge de ±20 px'],
  [/function voiles\(s\)\{/, 'C14 : le Voilé ne cligne pas à travers une herse'],
  [/V7FOE\[KEY\(g\)\]=g\.un\|\|g\.nom;/, 'C15 : son nom dans les répliques (V7FOE)'],
  [/V7FOE\.brumeux='le Brumeux';/, 'C15 : le nom du Brumeux dans les répliques (V7FOE)'],
  [/const b=pts\[i%pts\.length\],d=\[0,30,-30\]/, 'C16 : les Sans-Nom décalés le long du guichet'],
  [/o=optSortie\(charge,e\);F\.ph='suite';/, 'C17 : la sortie du Contrôle et de la Rafle contourne son corps'],
  [/c\.strokeStyle=INK;c\.lineWidth=6;c\.stroke\(\);c\.strokeStyle=`rgb\(\$\{\(K\.etain/, 'C20 : les montants des guichets en étain cerné d\'encre'],
  [/if\(o\.palier&&DES_D\.paliers&&DES_D\.paliers\[o\.palier\]\)/, 'C22 : seulement un palier connu'],
  [/const faceA=n=>/, 'C23 : « face au »'],
  [/const L=\{n:SAVE\.runs,act:ACTE\(\),/, 'H1 : la chronique dit l\'acte de la descente'],
]) has(motif, msg);
for (const blanc of ["'rgba(240,242,246,.6)'", "'rgba(235,238,242,.75)'", "'rgba(245,247,250,.55)'"]) ok(!html.includes(blanc), `C19 : plus de blanc écrit dans son dessin (${blanc} : ΔE < 25 de l'ivoire)`);
ok(GD[4].couleurs.reflet && GD[4].dessin.version >= 2, 'C19 : la couleur reflet est dans ses données (vérifiée par la grammaire) ; dessin.version 2');
// le bloc pur n'a pas accès au jeu
const pur = bloc('gar');
ok(!/\b(RUN|room|SAVE|enemies|ctx)\b/.test(pur.replace(/\/\/[^\n]*/g, '')) && !/\bP\.[a-z]/.test(pur.replace(/\/\/[^\n]*/g, '')), 'bloc pur : ni P, ni RUN, ni room, ni SAVE, ni enemies');
// 6.1b : le wiki nomme le Guet allumé (carte, sous-section, la descente) ; il ne nomme aucun gardien éteint
const wiki = readFileSync(join(ROOT, 'wiki.html'), 'utf8');
for (const n of GARDES) ok(GD[n].actif ? wiki.includes(GD[n].nom) && wiki.includes(GD[n].tempsEnPlus.n) : !wiki.includes(GD[n].nom), `wiki : ${GD[n].nom} ${GD[n].actif ? 'y est (allumé), son temps de plus compris' : 'n\'y est pas (éteint)'}`);
// ── 9. Le Guet Sans-Nom (6.1b) : herses, sections, Rafle, Vouge, Feuillets, Couvre-feu, parts
{ const g = GD[4], HS = g.herse, M = { w: W, h: H }, pr = SJ.joueur.rayon, pad = Math.max(pr, C.sortie.marge), axe = h => d => h.o === 'v' ? d.y : d.x;
  const lo = h => h.o === 'v' ? AR.y0 : AR.x0, hi = h => h.o === 'v' ? AR.y1 : AR.x1;
  ok(HS.disque.pas - 2 * HS.disque.r < 2 * pr, `herse : barreaux jointifs (pas ${HS.disque.pas}, rayon ${HS.disque.r}) : on ne passe pas entre deux barreaux`);
  ok(HS.guichet >= 120 && HS.guichet - 2 * pad >= 2 * C.sortie.grille, `herse : guichet de ${HS.guichet} px (≥ 120, au moins deux cases de grille libres)`);
  ok(Object.values(HS.dureeS).every(v => v >= 4) && HS.couvreFeu.garde < HS.couvreFeu.total && HS.connexite >= 0.85, 'herse : durées, Couvre-feu (garde < total), connexité ≥ 85 %');
  // a. une Fermeture : d'un mur à l'autre, un guichet par tronçon, aucun barreau dans un guichet, à bord des murs ; jamais la salle coupée
  // les points du guichet où ton corps ne touche aucun barreau (sur la ligne et de part et d'autre) : combien seraient frappés par ces zones
  const guichetFrappe = (h, zones) => { let n = 0; for (const q of h.guichets) for (let t = q - HS.guichet / 2 + pr + 0.5; t <= q + HS.guichet / 2 - pr - 0.5; t += 3) for (const u of [-HS.w / 2, 0, HS.w / 2]) {
    const x = h.o === 'v' ? h.c + u : t, y = h.o === 'v' ? t : h.c + u; if (h.disques.some(d => Math.hypot(x - d.x, y - d.y) < d.r + pr)) continue; if (zones.some(z => F.brxDans(z, x, y, pr))) n++; } return n; };
  let gui = 0, gref = 0;
  { let mal = 0, n = 0, coupe = 0; const r = mk(9001);
    for (let i = 0; i < 10000; i++) { const p = [AR.x0 + 30 + r() * (AR.x1 - AR.x0 - 60), AR.y0 + 30 + r() * (AR.y1 - AR.y0 - 60)], kind = i % 2 ? 'croix' : 'herse';
      const L = F.garFermeture(HS, AR, kind, p, [], r); if (!L) continue; n++;
      if (L.length !== (kind === 'croix' ? 2 : 1) || (kind === 'croix' && L[0].o === L[1].o)) mal++;
      for (const h of L) { const T = F.garTroncons(lo(h), hi(h), L.filter(q => q !== h).map(q => q.c)), ts = h.disques.map(axe(h)).sort((a, b) => a - b);
        if (h.guichets.length !== T.length || !h.guichets.every(q => T.filter(([a, b]) => q > a && q < b).length === 1)) mal++;
        for (const q of h.guichets) if (h.disques.some(d => Math.abs(axe(h)(d) - q) < HS.guichet / 2 + d.r - 1e-6)) mal++;
        for (const [a, b] of h.segs) { const q = ts.filter(t => t >= a - 1e-6 && t <= b + 1e-6); for (let k = 1; k < q.length; k++) if (q[k] - q[k - 1] > HS.disque.pas + 1e-6) mal++; }
        if (h.c < (h.o === 'v' ? AR.x0 : AR.y0) + HS.bord[h.o] - 1e-6 || h.c > (h.o === 'v' ? AR.x1 : AR.y1) - HS.bord[h.o] + 1e-6) mal++;
        if (h.zones.length !== h.segs.length || !h.zones.every((z, k) => { const [a, b] = h.segs[k], w2 = HS.w / 2; return z.forme === 'case' && z.long === h.o && (h.o === 'v' ? z.x0 === h.c - w2 && z.x1 === h.c + w2 && z.y0 === a && z.y1 === b : z.y0 === h.c - w2 && z.y1 === h.c + w2 && z.x0 === a && z.x1 === b); })) mal++;
        // 6.1c : un corps dans le guichet qui ne touche aucun barreau n'est jamais frappé par la chute (la zone s'arrête net au bord du guichet)
        gui += guichetFrappe(h, h.zones); gref += guichetFrappe(h, h.segs.map(([a, b]) => { const q0 = h.o === 'v' ? [h.c, a] : [a, h.c], q1 = h.o === 'v' ? [h.c, b] : [b, h.c]; return { forme: 'couloir', x0: q0[0], y0: q0[1], x1: q1[0], y1: q1[1], w: HS.w }; })); }
      if (F.garConnexe(M, AR, L.flatMap(h => h.disques), p, pad) < HS.connexite) coupe++; }
    ok(n > 9900, `herse : 10 000 Fermetures : une place presque toujours (${n})`);
    ok(mal === 0, `herse : d'un mur à l'autre, un guichet clair par tronçon, aucun barreau dans un guichet, barreaux jointifs, à bord des murs (${mal} écarts)`);
    ok(coupe === 0, `herse : une Fermeture (herse ou Croix) ne coupe jamais la salle (connexité ≥ ${HS.connexite}) (${coupe} coupées)`);
    ok(gui === 0, `herse (6.1c) : un corps dans le guichet qui ne touche aucun barreau n'est jamais frappé par la chute (${gui} points frappés)`);
    ok(gref > 0, `herse (6.1c, contre-épreuve) : des couloirs à la place des cases frappent dans le guichet (${gref} points)`); }
  // b. le Couvre-feu : 2 000 suites de six Fermetures ; avant : les plus anciennes se relèvent (total) ; après la Relève : il en garde une de la Fermeture,
  // au plus « garde » en tout ; une Fermeture qui couperait la salle est refusée (le jeu en essaie une autre, puis saute) : jamais d'état coupé
  // 6.1c : chaque herse debout garde ses guichets entiers : aucune herse perpendiculaire ne passe à moins de guichet/2 + rayon d'un barreau de leur centre
  const entiers = hs => { let n = 0; for (const h of hs) for (const q of h.guichets) for (const k of hs) if (k !== h && k.o !== h.o && Math.abs(k.c - q) < HS.guichet / 2 + HS.disque.r - 1e-6) n++; return n; };
  const suites = (Fx, seed, N) => { let trop = 0, coupe = 0, refus = 0, poses = 0, casse = 0; const r = mk(seed);
    for (let i = 0; i < N; i++) { let deb = [], ne = 0;
      for (let k = 0; k < 6; k++) { const p = [AR.x0 + 40 + r() * (AR.x1 - AR.x0 - 80), AR.y0 + 40 + r() * (AR.y1 - AR.y0 - 80)], kind = r() < 0.5 ? 'croix' : 'herse', nn = kind === 'croix' ? 2 : 1;
        const A = Fx.garCouvreAvant(HS.couvreFeu, deb, nn); deb = A.garde;
        const X = Fx.garFermer(HS, AR, kind, p, deb, r, C.sortie.essais + 2, (D, L) => Fx.garConnexe(M, AR, D.concat(L).flatMap(h => h.disques), p, pad) >= HS.connexite);
        deb = X.garde; const L = X.L; if (!L) { refus++; continue; } poses++; L.forEach(h => h.ne = ++ne);
        if (deb.length + L.length > HS.couvreFeu.total) trop++;
        if (Fx.garConnexe(M, AR, deb.concat(L).flatMap(h => h.disques), p, pad) < HS.connexite) coupe++;
        casse += entiers(deb.concat(L));
        deb = deb.concat([L[L.length - 1]]); deb = Fx.garCouvreApres(HS.couvreFeu, deb).garde;
        if (deb.length > HS.couvreFeu.garde) trop++; } }
    return { trop, coupe, refus, poses, casse }; };
  { const Q = suites(F, 77, 2000);
    ok(Q.casse === 0, `Couvre-feu (6.1c) : 12 000 Fermetures : une herse qui tombe ne passe jamais dans le guichet d'une herse debout (${Q.casse} guichets entamés)`);
    ok(Q.poses > 0.99 * (Q.poses + Q.refus), `Couvre-feu (6.1c) : avec cette règle, la Fermeture se pose encore presque toujours (${Q.poses} posées, ${Q.refus} sautées)`);
    const F0 = garSans('&&gp.every(q=>Math.abs(q-c)>=mg)'), Q0 = suites(F0, 77, 400);
    ok(Q0.casse > 0, `Couvre-feu (6.1c, contre-épreuve) : sans la règle des guichets perpendiculaires, des guichets sont entamés (${Q0.casse})`); }
  { let trop = 0, coupe = 0, refus = 0, poses = 0; const r = mk(77);
    for (let i = 0; i < 2000; i++) { let deb = [], ne = 0;
      for (let k = 0; k < 6; k++) { const p = [AR.x0 + 40 + r() * (AR.x1 - AR.x0 - 80), AR.y0 + 40 + r() * (AR.y1 - AR.y0 - 80)], kind = r() < 0.5 ? 'croix' : 'herse', nn = kind === 'croix' ? 2 : 1;
        const A = F.garCouvreAvant(HS.couvreFeu, deb, nn); deb = A.garde;
        const X = F.garFermer(HS, AR, kind, p, deb, r, C.sortie.essais + 2, (D, L) => F.garConnexe(M, AR, D.concat(L).flatMap(h => h.disques), p, pad) >= HS.connexite);
        deb = X.garde; const L = X.L; if (!L) { refus++; continue; } poses++; L.forEach(h => h.ne = ++ne);
        if (deb.length + L.length > HS.couvreFeu.total) trop++;
        if (F.garConnexe(M, AR, deb.concat(L).flatMap(h => h.disques), p, pad) < HS.connexite) coupe++;
        deb = deb.concat([L[L.length - 1]]); deb = F.garCouvreApres(HS.couvreFeu, deb).garde;
        if (deb.length > HS.couvreFeu.garde) trop++; } }
    ok(trop === 0 && coupe === 0, `Couvre-feu : 12 000 Fermetures : jamais plus de ${HS.couvreFeu.total} herses debout (ni plus de ${HS.couvreFeu.garde} après une Relève), jamais la salle coupée (${trop} de trop, ${coupe} coupées)`);
    ok(poses > 0.99 * (poses + refus), `Couvre-feu : la Fermeture se pose presque toujours (au besoin, la plus ancienne herse se relève d'abord) (${poses} posées, ${refus} sautées)`);
    { const r2 = mk(5); const D = [F.garFermeture(HS, AR, 'herse', [640, 400], [], r2)[0]]; D[0].ne = 1; const X = F.garFermer(HS, AR, 'herse', [640, 400], D, r2, 3, () => false); ok(X.L === null && X.releve.length === 1 && X.garde.length === 0, 'Couvre-feu : rien ne tient → la plus ancienne se relève, puis la Fermeture saute (contre-épreuve)'); }
    const D = [{ ne: 1 }, { ne: 2 }]; ok(F.garCouvreAvant(HS.couvreFeu, D, 2).releve.map(h => h.ne).join() === '1' && F.garCouvreApres(HS.couvreFeu, [{ ne: 3 }, { ne: 1 }, { ne: 2 }]).garde.map(h => h.ne).join() === '2,3', 'Couvre-feu : les plus anciennes se relèvent d\'abord'); }
  // c. le Contrôle : ta section ; sa sortie passe par un guichet (au détour), libre, hors des barreaux, atteinte à temps
  { let faux = 0, poses = 0, autre = 0, tot = 0; const r = mk(31);
    for (let i = 0; i < 4000; i++) { const p0 = [AR.x0 + 40 + r() * (AR.x1 - AR.x0 - 80), AR.y0 + 40 + r() * (AR.y1 - AR.y0 - 80)], L = F.garFermeture(HS, AR, 'herse', p0, [], r); if (!L) continue;
      const h = L[0], q = h.guichets[0], s = r() < 0.5 ? -1 : 1, off = 30 + r() * 120, along = (r() - 0.5) * 220, p = h.o === 'v' ? [h.c + s * off, q + along] : [q + along, h.c + s * off];
      if (p[0] < AR.x0 + pr || p[0] > AR.x1 - pr || p[1] < AR.y0 + pr || p[1] > AR.y1 - pr) continue; tot++;
      const z = F.garSection(AR, L, p), charge = F.garParTemps(g.attaques.controle.preavis, g.attaques.controle.preavisT, 1), o = opt(charge, h.disques), x = F.garSortieGrille(C.sortie, [z], p, o);
      if (!(p[0] >= z.x0 && p[0] <= z.x1 && p[1] >= z.y0 && p[1] <= z.y1)) faux++;
      if (!x.ok) continue; poses++;
      if (!libre(x.q, [z], h.disques) || x.d > o.v * (o.charge - o.reflexe) + 1e-6) faux++;
      if (Math.sign((h.o === 'v' ? x.q[0] : x.q[1]) - h.c) === s) autre++; }
    ok(faux === 0, `Contrôle : ${tot} positions près d'un guichet : la section contient toujours le joueur ; chaque sortie rendue est libre, hors des barreaux, atteinte à temps (${faux} fausses)`);
    ok(autre === 0 && poses > 0.5 * tot, `Contrôle : la sortie est toujours de l'autre côté de la herse, par le guichet (${poses} sorties sur ${tot})`); }
  // d. la Rafle : ta section, puis une voisine ; deux coups qui laissent une sortie (garSortie2)
  { let faux = 0, poses = 0; const r = mk(55), a = g.attaques.rafle;
    for (let i = 0; i < 3000; i++) { const p0 = [AR.x0 + 60 + r() * (AR.x1 - AR.x0 - 120), AR.y0 + 60 + r() * (AR.y1 - AR.y0 - 120)], L = F.garFermeture(HS, AR, 'croix', p0, [], r); if (!L) continue;
      const p = [p0[0] + (r() - 0.5) * 160, p0[1] + (r() - 0.5) * 160]; if (L.some(h => h.disques.some(d => Math.hypot(p[0] - d.x, p[1] - d.y) < d.r + pr)) || p[0] < AR.x0 + pr || p[0] > AR.x1 - pr || p[1] < AR.y0 + pr || p[1] > AR.y1 - pr) continue;
      const o = opt(a.preavis, L.flatMap(h => h.disques)), R = F.garRafle(C.sortie, AR, L, p, o, a.preavis, a.seconde, r); if (!R) continue; poses++;
      const adj = Math.abs(R[0].i - R[1].i) + Math.abs(R[0].j - R[1].j) === 1, s2 = F.garSortie2(C.sortie, [R[0]], [R[1]], p, o, a.preavis, a.seconde);
      if (!adj || !s2.ok || !(p[0] >= R[0].x0 && p[0] <= R[0].x1 && p[1] >= R[0].y0 && p[1] <= R[0].y1)) faux++; }
    ok(faux === 0 && poses > 1000, `Rafle : ${poses} posées : ta section puis une voisine, et une sortie pour les deux coups (${faux} fausses)`); }
  // e. la Vouge : un cône vers toi ; au troisième temps, aller et retour (deux cônes à ±decale) ; f. les Feuillets : l'éventail, la ligne avant le vol
  { const a = g.attaques.vouge, G1 = F.garVouge(a, [600, 300], [700, 300], false, 0), G2 = F.garVouge(a, [600, 300], [700, 300], true, 0);
    ok(G1.length === 1 && Math.abs(G1[0][0].a) < 1e-9 && Math.abs(G1[0][0].ouv - a.ouv * Math.PI / 180) < 1e-9 && G1[0][0].r1 === a.r1, 'Vouge : un cône de 110° vers toi, 160 px');
    ok(G2.length === 2 && Math.abs(G2[1][0].a - G2[0][0].a - 2 * a.decale * Math.PI / 180) < 1e-9 && F.garParTemps(0, a.retourT, 3) > 0 && F.garParTemps(0, a.retourT, 1) === 0, 'Vouge : aller et retour au troisième temps seulement (deux cônes à ±35°)');
    ok(a.atteinte * a.r1 < a.r1 && a.approcheS > 0, 'Vouge : seulement à portée (il s\'approche, puis renonce)');
    const f = g.attaques.feuillets, Fe = F.garFeuillets(f, 7, [600, 300], [900, 300], 0), da = Fe.tirs.map((t, i) => i ? t.a - Fe.tirs[i - 1].a : 0).slice(1);
    ok(Fe.tirs.length === 7 && da.every(d => Math.abs(d - f.ecart * Math.PI / 180) < 1e-9) && Math.abs(Fe.tirs[3].a) < 1e-9 && Fe.zones.every(z => z.forme === 'couloir'), 'Feuillets : sept pages en éventail centré sur toi, un couloir par page (pour la sortie)');
    ok(F.garVolPage(f, [600, 300], [900, 300]) > f.preavis && f.preavis >= C.preavisTir && F.garParTemps(5, f.nT, 2) === 5 && F.garParTemps(5, f.nT, 3) === 7, 'Feuillets : la ligne violette (≥ preavisTir) avant le vol ; cinq pages au deuxième temps, sept au troisième'); }
  // g. les parts (décision de l'auteur, 6.1b) : zones principales à 25 % au plus, plafond de 30 % jamais dépassé ; contact plus rare, qui repousse
  ok(Object.values(g.attaques).filter(a => a.part).every(a => a.part <= 0.25) && Math.max(...Object.values(g.attaques).filter(a => a.part).map(a => a.part)) === 0.25, 'parts : zones principales à 25 % au plus (le Contrôle), aucune au-delà');
  ok(C.contactS >= 1 && C.contactRecul > 0 && C.contact <= 0.1, `contact : une fois par ${C.contactS} s au plus, recul de ${C.contactRecul} px`);
  ok(g.releve && g.releve.sonneS === 2 && F.garParTemps(g.releve.sonneS, g.releve.sonneT, 4) === 1.5 && g.rythme.relacheS === 0, 'la Relève : sonné 2 s (1,5 s au Couvre-feu) ; pas de relâche en fin de file');
  // h. branchements du Guet
  for (const [motif, msg] of [
    [/hitsWall=function\(x,y,r\)\{if\(!\(room&&room\.g18s&&room\.pillars\.some\(p=>p\.herse18\)\)\)return _hw\.apply/, 'les herses laissent passer les tirs (hitsWall, seulement dans sa salle)'],
    [/collideEnemy=function\(e\)\{if\(e&&e\.g18\)return sansHerses/, 'il traverse ses herses (collideEnemy)'],
    [/renderFloor=function\(rm\)\{if\(!rm\|\|!rm\.pillars\|\|!rm\.pillars\.some\(p=>p\.herse18\)\)return _rf\.apply/, 'le sol ne peint jamais ses herses'],
    [/const tir=!zc&&!src\?eproj\.find\(p=>p\.g18f/, 'le journal reconnaît ses tirs (Feuillets)'],
    [/SAVE\.flags\[KEY\(e\.g18\)\]=1;persist\(\);/, 'sa victoire (hors essai) débloque son entrée de codex'],
    [/guet:S=>!!\(S\.flags&&S\.flags\.g18_4\)/, 'codex : la condition du Guet (LORE_C)'],
    [/HI_D\.codex\.filter\(o=>!o\.gardien\|\|/, 'codex : une entrée de gardien éteint n\'est pas montrée'],
  ]) has(motif, msg); }


console.log(`sim-gardiens : ${checks} vérifications, ${fails} échec${fails > 1 ? 's' : ''}.`);
process.exit(fails ? 1 : 0);
