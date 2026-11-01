#!/usr/bin/env node
// La Brume · vérification hors navigateur du Brumeux (v18.5, chantier v18, action 5a : le socle technique ; cadrage Q1–Q17)
// Extrait la logique pure d'index.html (blocs /*des:pur*/ pour desRng et /*brx:pur*/) et la fait tourner avec data/brumeux.js, arene.js,
// descente.js, bestiaire.js (contre-mesures) et versions.js. Vérifie :
//  0. les données : cinq phases, PV, présence et point faible, état d'arène existant, partition d'essai, éléments (menace, sorte, préavis ≥ boss),
//     budgets par palier, phase V courte / entière (regles.extreme.brumeux.phaseEntiere), couleurs hors grammaire (ΔE ≥ 25, ivoire compris),
//     glyphe 24 × 24 XML équilibré sans identifiant ni filtre, journal v18.5 muet, wiki muet (secret) ;
//  1. PV, seuils et phase : seuils décroissants, phase de chaque PV, phase V courte en Normal et Difficile, entière en Extrême ;
//  2. la lecture : poids monotones en l'axe, verdicts (a porté, abandonnée), dégâts reçus par source, « ce qui t'a tué » en premier, plancher ;
//  3. les tirages : 10 000 tirages à graine : déterminisme (deux fois la même suite), budget jamais dépassé, non-cumul par sorte (ce qui est déjà
//     en jeu compris), feinte jamais tirée, premier tiré en tête, couverture, biais des poids ;
//  4. le préavis : jamais sous preavis.boss, +0,3 s à la première rencontre ;
//  5. toujours une sortie : 10 000 combats abstraits (1 à 3 zones aux formes connues près du joueur, piliers) : chaque sortie rendue est libre,
//     hors des piliers, atteinte à pied avant le coup ; quand il n'y en a pas, aucun point libre n'existe à portée (recherche fine) ; brxPlacer ;
//  6. la connexité : 10 000 constructions : posée ⇒ ≥ 85 % de l'aire libre reliée au joueur, ≤ 30 % de l'aire couverte, jamais sur lui, sous le
//     plafond du palier ; une construction qui ferme le seul passage est refusée ; la grille est celle de FF (pas 20, marge 15) ;
//  7. la sauvegarde : neuve, abîmée, version future ; brxNoter (essai : rien ; mort : l'élément par phase ; victoire ; vus ; phase atteinte) ;
//  8. les statistiques (brxPire) ;
//  9. les branchements lus dans index.html (enveloppes, seuils de phase, gardes d'essai, crochets de l'arène, arène toujours éteinte, le Brumeux
//     jamais créé hors de l'essai).
// Contre-épreuves (une erreur introduite exprès doit être attrapée) : seuils inversés, budget dépassé, feinte tirée, sortie sans réflexe,
// construction qui coupe le passage acceptée, sauvegarde d'essai écrite.
//   node themist/outils/sim-brumeux.mjs
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
const bloc = (n) => { const m = html.match(new RegExp('/\\*' + n + ':pur\\*/([\\s\\S]*?)/\\*/' + n + ':pur\\*/')); if (!m) { console.error(`Bloc /*${n}:pur*/ introuvable`); process.exit(1); } return m[1]; };
const ctx = { window: {}, Math, console, JSON, Set, Object, Array, Number, Infinity, isFinite, Uint8Array, Float64Array };
vm.createContext(ctx);
for (const f of ['brumeux', 'arene', 'descente', 'bestiaire', 'versions']) vm.runInContext(readFileSync(join(ROOT, 'data', f + '.js'), 'utf8'), ctx);
vm.runInContext(bloc('des') + '\n' + bloc('brx') + '\nthis.F={desRng,brxPalier,brxPv,brxSeuils,brxPhase,brxLire,brxBudget,brxTirer,brxMesures,brxBoucle,brxPreavis,brxSeg,brxDans,brxSortie,brxPlacer,brxGrille,brxConnexe,brxPoser,brxNeuf,brxLireSauve,brxEcrireSauve,brxNoter,brxPire,BRX_V};', ctx);
const F = ctx.F, BD = ctx.window.BRUME_DATA, D = BD.brumeux, DA = BD.arene, DS = BD.descente, BE = BD.bestiaire, VERS = BD.versions;
let fails = 0, checks = 0;
const ok = (c, msg) => { checks++; if (!c) { fails++; if (fails <= 60) console.error('ÉCHEC : ' + msg); } };
const NOTES = []; const note = m => NOTES.push(m);
const clone = o => JSON.parse(JSON.stringify(o));
const mk = s => () => { s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const W = 1280, H = 720, MUR = DA.mur;

// ── 0. Données
ok(D.phases.length === 5, 'données : cinq phases');
const ETATS = DA.salles.final.etats.length;
for (const [i, p] of D.phases.entries()) {
  ok(typeof p.id === 'string' && p.pv > 0 && ['haut', 'sol'].includes(p.presence) && ['mains', 'croix', 'coeur'].includes(p.faible), `données : phase ${i + 1} (${p.id}) : PV, présence, point faible`);
  ok(Number.isInteger(p.arene) && p.arene >= 0 && p.arene < ETATS, `données : phase ${i + 1} : état d'arène ${p.arene} existe dans arene.js (${ETATS} états)`);
}
ok(D.phases.slice(0, 3).every(p => p.presence === 'haut') && D.phases.slice(3).every(p => p.presence === 'sol'), 'données : au-dessus de l\'arène en I–III, au sol en IV–V (Q1)');
ok(DA.actif === false, 'données : l\'arène reste ÉTEINTE (arene.js, actif:false) : rien ne change en jeu');
ok(D.partition.essai.length >= 4 && D.partition.essai.some(m => m.k === 'libre') && D.partition.essai.every(m => m.k === 'libre' || (m.k === 'fixe' && D.elements[m.g])), 'données : partition d\'essai (mesures fixes sur des éléments connus, mesures libres)');
ok(D.partition.essai.some(m => m.k === 'fixe' && m.g === 'feinte'), 'données : la feinte est une mesure fixe de la partition (le fil rouge, Q1)');
ok(D.partition.entracteS > 0 && D.partition.nuS >= 1.5, 'données : entracte et fenêtre à nu');
for (const [id, el] of Object.entries(D.elements)) {
  ok(el.menace >= 0 && D.cumul[el.sorte] != null, `données : élément ${id} : menace, sorte connue du non-cumul`);
  if (el.sorte === 'zone' || el.sorte === 'tir') ok(el.charge >= D.preavis.boss && el.degats > 0, `données : élément ${id} : préavis ≥ ${D.preavis.boss} s, dégâts`);
  if (el.pond) ok(['portee', 'esquive', 'soin', 'risque', 'rythme', 'puissance'].includes(el.pond.axe) && Math.abs(el.pond.sens) === 1, `données : élément ${id} : axe de pondération connu`);
  for (const s of el.sources || []) ok(!!BE.ennemis[s], `données : élément ${id} : source « ${s} » est un ennemi du bestiaire`);
}
ok(D.elements.feinte && D.elements.feinte.sorte === 'feinte' && D.elements.feinte.menace === 0, 'données : la feinte est un élément de menace 0, jamais tirée');
ok(D.budget.base.length === D.phases.length && D.budget.base.every((b, i) => b > 0 && (i === 0 || b >= D.budget.base[i - 1])), 'données : budget de base par phase, croissant');
ok(D.budget.palier.normal === 1 && D.budget.palier.difficile === 1.25 && D.budget.palier.extreme === 1.5, 'données : budget ×1 / ×1,25 / ×1,5 (Q12)');
ok(D.paliers.normal.constructions === 5 && D.paliers.difficile.constructions === 6 && D.paliers.extreme.constructions === 6, 'données : constructions au plus 5 / 6 / 6 (Q12)');
ok(D.paliers.normal.masques === 2 && D.paliers.difficile.masques === 2 && D.paliers.extreme.masques === 3, 'données : Masqués vivants 2 / 2 / 3 (Q12)');
ok(D.paliers.normal.phaseV === 'courte' && D.paliers.difficile.phaseV === 'courte' && D.paliers.extreme.phaseV === 'entiere', 'données : phase V courte, courte, entière (Q12)');
const regles = F.desRng && (() => { const c = { window: {}, Math, JSON, Object }; vm.createContext(c); vm.runInContext(readFileSync(join(ROOT, 'data', 'descente.js'), 'utf8'), c); return c.window.BRUME_DATA.descente.regles; })();
ok(regles.extreme && regles.extreme.brumeux && regles.extreme.brumeux.phaseEntiere === true, 'données : descente.js dit que l\'Extrême a la phase finale entière (D3)');
ok(D.preavis.boss === DA.preavis.boss && D.preavis.premiere === 0.3, 'données : préavis du boss = celui de l\'arène (0,8 s), première rencontre +0,3 s');
ok(D.constructions.connexite === 0.85 && D.constructions.aire === 0.3 && D.constructions.grille.cs === 20 && D.constructions.grille.pad === 15, 'données : connexité 85 %, aire 30 %, grille de FF (20, 15)');
ok(D.sauvegarde.v === 1 && F.BRX_V === 1, 'données : sauvegarde versionnée v:1');
ok(D.dessin.version >= 1 && D.dessin.r.haut > 0 && D.dessin.r.sol > D.dessin.r.haut, 'données : dessin versionné, rayon au sol > rayon des mains');
// couleurs : hors grammaire, ΔE ≥ 25 (CIE76) de chaque couleur de la grammaire (ivoire compris) et entre elles
const lab = ([R, G, B]) => { const f = v => { v /= 255; return v > 0.04045 ? ((v + 0.055) / 1.055) ** 2.4 : v / 12.92; }; const [r, g, b] = [f(R), f(G), f(B)];
  const X = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047, Y = r * 0.2126 + g * 0.7152 + b * 0.0722, Z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
  const h = t => t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116; return [116 * h(Y) - 16, 500 * (h(X) - h(Y)), 200 * (h(Y) - h(Z))]; };
const dE = (a, b) => { const A = lab(a.split(',').map(Number)), B = lab(b.split(',').map(Number)); return Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]); };
const tele = /const TELE=\{zone:'([\d,]+)',proj:'([\d,]+)',grab:'([\d,]+)'\}/.exec(html), foe = /const FOE='([\d,]+)'/.exec(html);
const GRAM = { zone: tele[1], proj: tele[2], grab: tele[3], foe: foe[1], lavande: DA.indicateurs.couleurs.lavande, ivoire: DA.indicateurs.couleurs.ivoire };
let dEmin = 1e9;
for (const [k, c] of Object.entries(D.couleurs)) for (const [g, gc] of Object.entries(GRAM)) { const d = dE(c, gc); dEmin = Math.min(dEmin, d); ok(d >= 25, `couleurs : ${k} (${c}) à ΔE ${d.toFixed(1)} ≥ 25 de ${g}`); }
ok(dE(D.couleurs.craie, GRAM.ivoire) >= 25, 'couleurs : la craie (annonce d\'une construction) ne se confond pas avec l\'ivoire du point faible (Q9.8)');
// glyphe : 24 × 24, XML équilibré, autonome (ni id, ni filtre, ni url()), lisible : des traits épais
const G = D.dessin.glyphe;
ok(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 24 24" width="24" height="24">/.test(G) && G.endsWith('</svg>'), 'glyphe : SVG 24 × 24 autonome');
ok(!/\bid=|<filter|url\(|<script|<style/.test(G), 'glyphe : ni identifiant, ni filtre, ni style : balise inline du wiki et image du HUD');
{ const open = (G.match(/<([a-zA-Z]+)(?=[\s>])(?![^>]*\/>)/g) || []).map(x => x.slice(1)), close = (G.match(/<\/([a-zA-Z]+)>/g) || []).map(x => x.slice(2, -1));
  ok(open.length === close.length && open.every((t, i) => close.includes(t)), `glyphe : XML équilibré (${open.length} ouvertures, ${close.length} fermetures)`); }
ok(/stroke-width="4\.4"/.test(G) && /<circle/.test(G), 'glyphe : croix de manipulation (trait épais) et œil');
// journal et wiki (secret, Q16) : la ligne v18.5 ne dit ni phase, ni construction selon le style, ni tirage ; le wiki hors journal ne parle pas
// du combat final (ni du Brumeux qui bâtit, lit ou tire)
const j185 = VERS.journal.filter(x => x.h === 'v18.5');
ok(VERS.actuelle === 'v18.5' && j185.length >= 1, 'journal : version actuelle v18.5, une ligne v18.5');
for (const x of j185) ok(!/phase|\bbât|construi|graine|tirage|improvis|selon ta|ton style|lit ton|segment/i.test(x.t), 'journal v18.5 : ni phase, ni construction selon le style, ni tirage, ni lecture');
const wiki = readFileSync(join(ROOT, 'wiki.html'), 'utf8').replace(/<!-- gen:journal -->[\s\S]*?<!-- \/gen:journal -->/, '').replace(/<[^>]+>/g, ' ');
ok(!/Brumeux[^.]{0,140}(phase|bât|construi|graine|tirage|improvis|partition)/i.test(wiki) && !/(boss final|fond de la Brume)[^.]{0,140}(phase|bât|graine|tirage|partition)/i.test(wiki), 'wiki : rien sur les phases, la construction, les tirages ni la lecture du combat final');
for (const k of ['menace', 'cumul', 'budget', 'brumeux.js']) ok(!new RegExp('\\b' + k + '\\b[^.]{0,80}(Brumeux|boss final)', 'i').test(wiki), `wiki : « ${k} » n'est pas relié au Brumeux`);

// ── 1. PV, seuils, phase
for (const pal of ['normal', 'difficile', 'extreme']) {
  const pv = F.brxPv(D, pal), s = F.brxSeuils(pv), tot = pv.reduce((a, b) => a + b, 0);
  ok(pv.length === 5 && s.length === 4 && s.every((v, i) => v > 0 && v < 1 && (i === 0 || v < s[i - 1])), `PV ${pal} : seuils décroissants dans (0, 1) : ${s.join(' ')}`);
  ok(pal === 'extreme' ? pv[4] === D.phases[4].pv : pv[4] === Math.round(D.phases[4].pv * D.phaseV.courte.pv), `PV ${pal} : phase V ${pal === 'extreme' ? 'entière' : 'courte (' + D.phaseV.courte.pv * 100 + ' %)'}`);
  ok(F.brxPhase(tot, tot, s) === 0 && F.brxPhase(0, tot, s) === 4 && F.brxPhase(tot * s[0] - 1, tot, s) === 1 && F.brxPhase(tot * s[0] + 1, tot, s) === 0, `PV ${pal} : phase de chaque PV (bornes)`);
  for (let i = 0; i < 4; i++) ok(Math.abs(tot * (i ? s[i - 1] : 1) - tot * s[i] - pv[i]) < 1e-3 * tot, `PV ${pal} : le segment ${i + 1} vaut les PV de la phase (${pv[i]})`);
}
ok(F.brxPalier(D, 'inconnu') === 'normal' && F.brxPalier(D, 'extreme') === 'extreme', 'PV : palier inconnu = Normal');
{ const s = F.brxSeuils([2400, 2400, 2400, 2400, 2400]).slice().reverse(); ok(!(s.every((v, i) => i === 0 || v < s[i - 1])), 'contre-épreuve : des seuils inversés seraient attrapés'); }

// ── 2. La lecture
const CMS = Object.fromEntries(Object.entries(BE.contreMesures).map(([k, c]) => [k, { ax: c.ax, hi: !!c.hi }]));
const S0 = { prof: {}, eff: {}, ko: {}, cms: CMS, par: {}, tue: {} };
{ const L = F.brxLire(D, S0, 0); ok(Object.keys(L.poids).length === Object.keys(D.elements).length && Object.values(L.poids).every(v => Math.abs(v - 1) < 1e-9) && L.premier === null, 'lecture : rien de connu : tous les poids à 1, aucun premier'); }
for (const [id, el] of Object.entries(D.elements)) { if (!el.pond) continue; const lo = F.brxLire(D, Object.assign({}, S0, { prof: { [el.pond.axe]: 0 } }), 0).poids[id], hi = F.brxLire(D, Object.assign({}, S0, { prof: { [el.pond.axe]: 1 } }), 0).poids[id];
  ok(el.pond.sens > 0 ? hi > lo : lo > hi, `lecture : ${id} pèse plus quand ${el.pond.axe} est ${el.pond.sens > 0 ? 'haut' : 'bas'} (${lo.toFixed(2)} → ${hi.toFixed(2)})`);
  ok(Math.min(lo, hi) >= D.lecture.axe.plancher - 1e-9 && Math.max(lo, hi) <= D.lecture.axe.plancher + D.lecture.axe.pente + 1e-9, `lecture : ${id} entre plancher et plancher + pente`); }
{ // verdicts : « a porté » sur la Traque (portée haute) pèse sur le couloir (portée +1), pas sur le disque (portée −1) ; abandonnée : × abandon
  const k = Object.keys(CMS).find(k => CMS[k].ax === 'portee' && CMS[k].hi), base = F.brxLire(D, Object.assign({}, S0, { prof: { portee: 0.5 } }), 0).poids;
  const porte = F.brxLire(D, Object.assign({}, S0, { prof: { portee: 0.5 }, eff: { [k]: { s: 0.5, n: 1 } } }), 0).poids;
  ok(porte.couloir > base.couloir && Math.abs(porte.disque - base.disque) < 1e-9, `lecture : la contre-mesure « ${k} » qui a porté pèse sur le couloir (${base.couloir.toFixed(2)} → ${porte.couloir.toFixed(2)}), pas sur le disque`);
  const ab = F.brxLire(D, Object.assign({}, S0, { prof: { portee: 0.5 }, ko: { [k]: 2 } }), 0).poids;
  ok(Math.abs(ab.couloir - base.couloir * D.lecture.verdict.abandon) < 1e-9, 'lecture : une contre-mesure déjouée deux fois (abandonnée) pèse × abandon sur son axe');
  const ab1 = F.brxLire(D, Object.assign({}, S0, { prof: { portee: 0.5 }, ko: { [k]: 1 } }), 0).poids; ok(Math.abs(ab1.couloir - base.couloir) < 1e-9, 'lecture : déjouée une fois : rien');
  const inc = F.brxLire(D, Object.assign({}, S0, { eff: { [k]: { s: 0.9, n: 3 } } }), 0).poids; ok(Math.abs(inc.couloir - (1 + D.lecture.verdict.porte * 0.9)) < 1e-9 && Math.abs(inc.disque - 1) < 1e-9, 'lecture : axe inconnu : le verdict pèse seul (× (1 + porte × score)), sur son sens seulement'); }
{ const par = F.brxLire(D, Object.assign({}, S0, { par: { brute: 300, spectre: 100 } }), 0).poids;
  ok(par.couloir > par.tir && par.tir > 1 && Math.abs(par.construction - 1) < 1e-9, `lecture : les dégâts reçus des Brutes font monter le couloir (${par.couloir.toFixed(2)}) plus que le tir (${par.tir.toFixed(2)}) ; sans source : 1`);
  ok(Math.abs(par.couloir - (1 + D.lecture.par.poids * 300 / 400)) < 1e-9, 'lecture : × (1 + poids × part des dégâts)'); }
{ const L = F.brxLire(D, Object.assign({}, S0, { tue: { 2: 'pluie' } }), 1); ok(L.premier === 'pluie', 'lecture : ce qui t\'a tué à la phase 2 est joué en premier à la phase 2');
  ok(F.brxLire(D, Object.assign({}, S0, { tue: { 2: 'pluie' } }), 0).premier === null, 'lecture : pas à une autre phase');
  ok(F.brxLire(D, Object.assign({}, S0, { tue: { 1: 'inconnu' } }), 0).premier === null, 'lecture : un élément inconnu ne devient pas premier'); }
ok(F.brxLire(D, Object.assign({}, S0, { prof: { portee: 1 }, ko: { traque: 9 } }), 0).poids.couloir >= D.lecture.min, 'lecture : plancher des poids');
{ const L = F.brxLire(D, Object.assign({}, S0, { adapt: 2, portes: [{ id: 'a' }], reserve: [{ id: 'b' }], nemesis: true }), 0); ok(L.adapt === 2 && L.portes.length === 1 && L.reserve.length === 1 && L.nemesis === true, 'lecture : Accoutumance, portés, réserve et némésis gardés pour les phases III et IV'); }

// ── 3. Les tirages
{ const lec = F.brxLire(D, S0, 0), N = 10000; let ko = 0, feinte = 0, vus = {}, prem = 0, det = 0;
  for (const pal of ['normal', 'difficile', 'extreme']) for (let ph = 0; ph < 5; ph++) {
    const B = F.brxBudget(D, ph, pal); ok(Math.abs(B - D.budget.base[ph] * D.budget.palier[pal]) < 1e-9, `tirages : budget phase ${ph + 1} ${pal} = ${B}`); }
  ok(F.brxBudget(D, 0, 'normal') < F.brxBudget(D, 0, 'difficile') && F.brxBudget(D, 0, 'difficile') < F.brxBudget(D, 0, 'extreme'), 'tirages : budget croissant par palier');
  for (let i = 0; i < N; i++) { const ph = i % 5, pal = ['normal', 'difficile', 'extreme'][i % 3], actifs = i % 4 === 0 ? { zone: 1 } : {}, r1 = F.desRng(i), r2 = F.desRng(i);
    const t = F.brxTirer(D, lec, ph, pal, r1, actifs), t2 = F.brxTirer(D, lec, ph, pal, r2, actifs);
    if (t.elements.join() !== t2.elements.join()) det++;
    const B = F.brxBudget(D, ph, pal); let m = 0; const cnt = Object.assign({}, actifs); for (const id of t.elements) { const el = D.elements[id]; m += el.menace; cnt[el.sorte] = (cnt[el.sorte] || 0) + 1; vus[id] = (vus[id] || 0) + 1; if (el.sorte === 'feinte') feinte++; }
    if (m > B + 1e-9) ko++; for (const s in cnt) if (cnt[s] > D.cumul[s]) ko++;
    if (t.reste !== B - m) ko++; }
  ok(det === 0, 'tirages : déterminisme (même graine, même suite) sur 10 000 tirages');
  ok(ko === 0, 'tirages : budget jamais dépassé, non-cumul par sorte tenu (ce qui est déjà en jeu compris), reste juste');
  ok(feinte === 0, 'tirages : la feinte n\'est jamais tirée (mesure fixe)');
  { let nc = 0, nc4 = 0; for (let i = 0; i < 2000; i++) { if (F.brxTirer(D, lec, 4, 'extreme', F.desRng(i + 7), {}).elements.includes('construction')) nc++; if (F.brxTirer(D, lec, 3, 'extreme', F.desRng(i + 7), {}).elements.includes('construction')) nc4++; }
    ok(nc === 0 && nc4 > 0, `tirages : la phase V ne bâtit jamais (exclut), la phase IV oui (${nc4} / 2000)`); }
  const tirables = Object.keys(D.elements).filter(id => D.elements[id].sorte !== 'feinte');
  ok(tirables.every(id => (vus[id] || 0) > 0), 'tirages : chaque élément tirable sort au moins une fois (couverture) : ' + tirables.map(id => id + ' ' + (vus[id] || 0)).join(', '));
  // premier : ce qui t'a tué sort en tête quand il tient dans le budget et le non-cumul
  const lp = F.brxLire(D, Object.assign({}, S0, { tue: { 1: 'anneau' } }), 0);
  for (let i = 0; i < 2000; i++) { const t = F.brxTirer(D, lp, 0, 'normal', F.desRng(i), {}); if (t.elements[0] === 'anneau') prem++; }
  ok(prem === 2000, 'tirages : « ce qui t\'a tué » est tiré en premier (2 000 / 2 000)');
  let prem2 = 0; for (let i = 0; i < 500; i++) { const t = F.brxTirer(D, lp, 0, 'normal', F.desRng(i), { zone: 1 }); if (t.elements.includes('anneau')) prem2++; }
  ok(prem2 === 0, 'tirages : mais jamais si une zone est déjà en jeu (non-cumul)');
  // biais : un élément à poids 3 contre 1 sort nettement plus souvent
  const lb = clone(lec); for (const id in lb.poids) lb.poids[id] = id === 'rafale' ? 3 : 1; let nb = 0, nt = 0;
  for (let i = 0; i < 4000; i++) { const t = F.brxTirer(D, lb, 1, 'normal', F.desRng(i + 1e5), { zone: 1, construction: 1 }); if (t.elements[0] === 'rafale') nb++; if (t.elements[0] === 'tir') nt++; }
  ok(nb > nt * 2, `tirages : poids 3 contre 1 : la rafale sort en tête ${nb} fois, le tir ${nt} (≥ 2 fois plus)`);
  // boucle : les mesures libres sont résolues, les fixes gardent leur geste
  const bo = F.brxBoucle(D, lec, 0, 'normal', F.desRng(3), {}); ok(bo.length === D.partition.essai.length && bo.every(m => m.k === 'fixe' ? !!m.g : Array.isArray(m.elements)), 'tirages : la boucle résout les mesures libres');
  ok(F.brxMesures(D, 2).every((m, i) => m.k === D.partition.essai[i].k), 'tirages : 5a : la partition d\'essai sert aux cinq phases');
  // contre-épreuves : un budget dépassé ou une feinte tirée seraient attrapés par les comptes ci-dessus
  { const t = { elements: ['couloir', 'couloir', 'couloir'] }; let m = 0; for (const id of t.elements) m += D.elements[id].menace; ok(m > F.brxBudget(D, 0, 'normal'), 'contre-épreuve : trois couloirs dépasseraient le budget de la phase I (attrapé par le compte)'); } }

// ── 4. Préavis
ok(F.brxPreavis(D, { vus: [] }, 'disque') === D.elements.disque.charge + 0.3 && F.brxPreavis(D, { vus: ['disque'] }, 'disque') === D.elements.disque.charge, 'préavis : +0,3 s à la première rencontre, la charge ensuite');
ok(F.brxPreavis(D, null, 'tir') >= D.preavis.boss && F.brxPreavis(D, { vus: ['feinte'] }, 'feinte') === D.preavis.boss, 'préavis : jamais sous celui du boss (0,8 s), même sans charge');

// ── 5. Toujours une sortie : 10 000 combats abstraits
{ const rnd = mk(42), R = { x0: MUR.g, y0: MUR.h, x1: 2560 - MUR.d, y1: 1080 - MUR.b }, N = 10000; let nok = 0, nko = 0, bad = 0, badKo = 0, placeOk = 0, placeBad = 0, dmax = 0;
  const formes = ['disque', 'couloir', 'anneau'];
  for (let i = 0; i < N; i++) {
    const px = R.x0 + 20 + rnd() * (R.x1 - R.x0 - 40), py = R.y0 + 20 + rnd() * (R.y1 - R.y0 - 40), pil = [];
    for (let k = 0, n = Math.floor(rnd() * 4); k < n; k++) { const a = rnd() * Math.PI * 2, d = 80 + rnd() * 250, r = 24 + rnd() * 30; pil.push({ x: px + Math.cos(a) * d, y: py + Math.sin(a) * d, r }); }   // jamais sur le joueur (en jeu, tu n'es jamais dans un pilier)
    const zones = []; for (let k = 0, n = 1 + Math.floor(rnd() * 3); k < n; k++) { const f = formes[Math.floor(rnd() * 3)], a = rnd() * Math.PI * 2, d = rnd() * 60;
      if (f === 'disque') zones.push({ forme: 'disque', x: px + Math.cos(a) * d, y: py + Math.sin(a) * d, r: 60 + rnd() * 160 });
      else if (f === 'anneau') zones.push({ forme: 'anneau', x: px + Math.cos(a) * d, y: py + Math.sin(a) * d, r0: 20 + rnd() * 80, r1: 180 + rnd() * 200 });
      else { const b = rnd() * Math.PI * 2, x0 = px + Math.cos(a) * (200 + rnd() * 400), y0 = py + Math.sin(a) * (200 + rnd() * 400); zones.push({ forme: 'couloir', x0, y0, x1: x0 + Math.cos(b) * 900, y1: y0 + Math.sin(b) * 900, w: 60 + rnd() * 80 }); } }
    const pr = 14 + rnd() * 10, v = 120 + rnd() * 80, charge = 0.8 + rnd() * 0.9, reflexe = 0.05;
    const bloque = (x, y) => pil.some(p => Math.hypot(x - p.x, y - p.y) < p.r + pr);
    const o = { pr, v, reflexe, charge, arene: R, bloque };
    const s = F.brxSortie(D, zones, [px, py], o);
    const libre = (x, y) => x >= R.x0 + pr && x <= R.x1 - pr && y >= R.y0 + pr && y <= R.y1 - pr && !bloque(x, y) && !zones.some(z => F.brxDans(z, x, y, pr));
    const Rm = v * (charge - reflexe);
    if (s.ok) { nok++; dmax = Math.max(dmax, s.d);
      const [qx, qy] = s.q, d = Math.hypot(qx - px, qy - py); let chemin = true; for (let u = 0.05; u < 1; u += 0.05) if (bloque(px + (qx - px) * u, py + (qy - py) * u)) chemin = false;
      if (!libre(qx, qy) || d > Rm + 1e-6 || !chemin) bad++; }
    else { nko++; // recherche fine : aucun point libre et atteignable à moins de Rm − 8 px (la recherche par anneaux a un pas de 6 px)
      let trouve = false; for (let x = px - Rm; x <= px + Rm && !trouve; x += 4) for (let y = py - Rm; y <= py + Rm; y += 4) { const d = Math.hypot(x - px, y - py); if (d > Rm - 8 || !libre(x, y)) continue; let ch = true; for (let u = 0.05; u < 1; u += 0.05) if (bloque(px + (x - px) * u, py + (y - py) * u)) { ch = false; break; } if (ch) { trouve = true; break; } }
      if (trouve) badKo++; }
    // brxPlacer : la première variante qui laisse une sortie
    const V = [zones, zones.map(z => z.forme === 'disque' ? Object.assign({}, z, { x: z.x + 150 }) : z), []];
    const k = F.brxPlacer(D, V, [px, py], o); if (k < 0) placeBad++; else { if (!F.brxSortie(D, V[k], [px, py], o).ok) placeBad++; for (let j = 0; j < k; j++) if (F.brxSortie(D, V[j], [px, py], o).ok) placeBad++; placeOk++; } }
  ok(bad === 0, `sortie : ${nok} sorties rendues sur ${N} : toutes libres, hors des piliers, atteintes à pied avant le coup (${bad} fausses), au plus loin ${dmax.toFixed(0)} px`);
  // la recherche par anneaux (pas 6 px, ≥ 24 points par anneau, un point tous les ≤ 19 px) peut rater une poche libre plus étroite que son pas : la zone
  // saute alors (côté sûr). On mesure cette prudence : au plus 1 % des combats sans sortie.
  ok(badKo <= nko * 0.01, `sortie : ${nko} combats sans sortie : aucun point libre atteignable n'existait, hors ${badKo} poches plus étroites que le pas de recherche (≤ 1 %, côté sûr : la zone saute)`);
  ok(placeBad === 0 && placeOk === N, `sortie : brxPlacer garde la première variante qui laisse une sortie (${placeOk} / ${N})`);
  ok(nok > N * 0.5 && nko > 0, `sortie : les deux cas arrivent (${nok} avec sortie, ${nko} sans)`);
  note(`sortie : ${N} combats abstraits, ${nok} avec sortie (au plus loin ${dmax.toFixed(0)} px), ${nko} sans, ${badKo} poches ratées (côté sûr)`);
  // contre-épreuve : une sortie qui oublierait le réflexe accepterait des points trop loin
  let far = 0; for (let i = 0; i < 400; i++) { const zones = [{ forme: 'disque', x: 600, y: 500, r: 100 + i * 0.5 }], o = { pr: 14, v: 180, reflexe: 0.05, charge: 0.8, arene: R, bloque: null };
    const s = F.brxSortie(D, zones, [600, 500], o), s2 = F.brxSortie(D, zones, [600, 500], Object.assign({}, o, { reflexe: 0 })); if (s2.ok && !s.ok) far++; }
  ok(far > 0, `contre-épreuve : sans réflexe, ${far} sorties de plus seraient acceptées (le réflexe compte)`); }

// ── 6. Connexité : 10 000 constructions
{ const rnd = mk(7), M = { w: 2560, h: 1080 }, R = { x0: MUR.g, y0: MUR.h, x1: M.w - MUR.d, y1: M.h - MUR.b }, N = 10000; let nok = 0, nko = 0, bad = 0, raisons = {}, surJ = 0;
  const G0 = F.brxGrille(M, R, [], D.constructions.grille);
  ok(G0.cols === Math.ceil(M.w / 20) && G0.rows === Math.ceil(M.h / 20) && G0.libres > 0 && F.brxConnexe(G0, 600, 500) === 1, 'connexité : grille de FF (pas 20), arène vide entièrement reliée');
  for (let i = 0; i < N; i++) { const base = []; for (let k = 0, n = Math.floor(rnd() * 5); k < n; k++) base.push({ x: R.x0 + 60 + rnd() * (R.x1 - R.x0 - 120), y: R.y0 + 60 + rnd() * (R.y1 - R.y0 - 120), r: 28 + rnd() * 20 });
    const cons = []; for (let k = 0, n = Math.floor(rnd() * 7); k < n; k++) cons.push({ x: R.x0 + 60 + rnd() * (R.x1 - R.x0 - 120), y: R.y0 + 60 + rnd() * (R.y1 - R.y0 - 120), r: 34 });
    const j = { x: R.x0 + 30 + rnd() * (R.x1 - R.x0 - 60), y: R.y0 + 30 + rnd() * (R.y1 - R.y0 - 60), r: 14 }, pal = ['normal', 'difficile', 'extreme'][i % 3];
    const c = { x: j.x + (rnd() - 0.5) * 600, y: j.y + (rnd() - 0.5) * 400, r: 34 };
    const v = F.brxPoser(D, M, R, base, cons, c, j, pal); raisons[v.raison || 'ok'] = (raisons[v.raison || 'ok'] || 0) + 1;
    if (v.ok) { nok++; const Gb = F.brxGrille(M, R, base, D.constructions.grille), G1 = F.brxGrille(M, R, base.concat(cons, [c]), D.constructions.grille), part = F.brxConnexe(G1, j.x, j.y), aire = 1 - G1.libres / Gb.libres;
      if (part < 0.85 - 1e-9 || aire > 0.3 + 1e-9 || cons.length >= D.paliers[pal].constructions || Math.hypot(c.x - j.x, c.y - j.y) < c.r + j.r + 15) bad++; }
    else { nko++; if (v.raison === 'plafond' && cons.length < D.paliers[pal].constructions) bad++; if (v.raison === 'joueur') { surJ++; if (Math.hypot(c.x - j.x, c.y - j.y) >= c.r + j.r + 15) bad++; } if (v.raison === 'connexite' && !(v.part < 0.85)) bad++; if (v.raison === 'aire' && !(v.aire > 0.3)) bad++; } }
  ok(bad === 0, `connexité : ${nok} posées (≥ 85 % reliées, ≤ 30 % couverts, jamais sur le joueur, sous le plafond), ${nko} refusées pour la bonne raison (${JSON.stringify(raisons)})`);
  ok(raisons.plafond > 0 && surJ > 0, 'connexité : le plafond du palier et « sur le joueur » refusent');
  note(`connexité : ${N} constructions, ${nok} posées, refusées ${JSON.stringify(raisons)}`);
  // une construction qui ferme le seul passage est refusée (connexité) ; la même ailleurs est posée
  const murY = 540, base = []; for (let x = R.x0 + 30; x <= R.x1; x += 70) if (Math.abs(x - 1280) > 60) base.push({ x, y: murY, r: 34 });
  const j = { x: 1280, y: 300, r: 14 }, av = F.brxConnexe(F.brxGrille(M, R, base, D.constructions.grille), j.x, j.y);
  ok(av > 0.95, `connexité : un mur percé d'un seul passage laisse ${(av * 100).toFixed(0)} % reliés`);
  const ferme = F.brxPoser(D, M, R, base, [], { x: 1280, y: murY, r: 34 }, j, 'normal'), ailleurs = F.brxPoser(D, M, R, base, [], { x: 1280, y: 200, r: 34 }, j, 'normal');
  ok(!ferme.ok && ferme.raison === 'connexite' && ferme.part < 0.6, `connexité : fermer le passage est refusé (${(ferme.part * 100).toFixed(0)} % reliés)`);
  ok(ailleurs.ok && ailleurs.part > 0.95, 'connexité : la même construction ailleurs est posée');
  ok(F.brxPoser(D, M, R, [], [], { x: 1280, y: 300, r: 34 }, j, 'normal').raison === 'joueur', 'connexité : jamais sur toi');
  // aire : des constructions qui couvrent plus de 30 % de l'aire libre sont refusées
  const gros = []; for (let x = R.x0 + 120; x < R.x1 - 120; x += 180) for (let y = R.y0 + 120; y < R.y1 - 120; y += 180) gros.push({ x, y, r: 70 });
  const Dg = clone(D); Dg.paliers.normal.constructions = 999; const va = F.brxPoser(Dg, M, R, [], gros, { x: 400, y: 900, r: 34 }, { x: 150, y: 150, r: 14 }, 'normal');
  ok(!va.ok && (va.raison === 'aire' || va.raison === 'connexite'), `connexité : ${gros.length} gros piliers : refusé (${va.raison}, aire ${(va.aire * 100).toFixed(0)} %, ${(va.part * 100).toFixed(0)} % reliés)`);
  // contre-épreuve : une connexité qui ignorerait les diagonales coupées compterait le passage fermé comme ouvert
  { const G1 = F.brxGrille(M, R, base.concat([{ x: 1280, y: murY, r: 34 }]), D.constructions.grille); let n = 0; for (let i = 0; i < G1.blk.length; i++) if (!G1.blk[i]) n++; ok(n === G1.libres && F.brxConnexe(G1, 1280, 300) < 0.6, 'contre-épreuve : le compte des cases libres et l\'inondation s\'accordent ; le passage fermé reste fermé'); } }

// ── 7. La sauvegarde
{ const N = F.brxNeuf(); ok(N.v === 1 && N.tentatives === 0 && N.victoires === 0 && N.phaseMax === 0 && JSON.stringify(N.mort) === '{}' && N.vus.length === 0, 'sauvegarde : état neuf');
  ok(JSON.stringify(F.brxLireSauve(undefined, D)) === JSON.stringify(N) && JSON.stringify(F.brxLireSauve('abîmée', D)) === JSON.stringify(N) && JSON.stringify(F.brxLireSauve({ v: 0 }, D)) === JSON.stringify(N), 'sauvegarde : absente, abîmée ou d\'une autre version : neuve');
  ok(F.brxLireSauve({ v: 2 }, D) === null, 'sauvegarde : version future : null (on n\'y touche pas)');
  const ab = F.brxLireSauve({ v: 1, tentatives: -3, victoires: 'x', phaseMax: 9, mort: { 1: 'disque', 7: 'tir', 2: 'inconnu', a: 'pluie' }, vus: ['tir', 3, 'inconnu'] }, D);
  ok(ab.tentatives === 0 && ab.victoires === 0 && ab.phaseMax === 0 && JSON.stringify(ab.mort) === '{"1":"disque"}' && ab.vus.join() === 'tir', 'sauvegarde : champs abîmés nettoyés (phases hors 1..5, éléments inconnus)');
  const S1 = F.brxNoter(N, { essai: true, phase: 3, par: 'disque', win: false, vus: ['disque'] }, D); ok(S1 === N, 'sauvegarde : une descente d\'essai n\'écrit rien (même objet)');
  const S2 = F.brxNoter(N, { essai: false, phase: 3, par: 'disque', win: false, vus: ['disque', 'tir'] }, D);
  ok(S2 !== N && S2.tentatives === 1 && S2.phaseMax === 3 && S2.mort[3] === 'disque' && S2.vus.join() === 'disque,tir' && N.tentatives === 0, 'sauvegarde : une mort note la tentative, la phase atteinte, l\'élément qui a tué, les éléments vus (sans toucher l\'état d\'avant)');
  const S3 = F.brxNoter(S2, { essai: false, phase: 2, par: 'tir', win: false, vus: ['tir'] }, D); ok(S3.tentatives === 2 && S3.phaseMax === 3 && S3.mort[2] === 'tir' && S3.mort[3] === 'disque', 'sauvegarde : une autre mort, à une phase plus basse : la plus haute reste, l\'élément de sa phase est noté');
  const S4 = F.brxNoter(S3, { essai: false, phase: 5, par: null, win: true, vus: [] }, D); ok(S4.victoires === 1 && S4.tentatives === 3 && S4.phaseMax === 5 && S4.mort[3] === 'disque', 'sauvegarde : une victoire compte, sans effacer ce qui a tué');
  ok(JSON.stringify(F.brxLireSauve(F.brxEcrireSauve(S4), D)) === JSON.stringify(S4), 'sauvegarde : écrire puis lire rend le même état');
  ok(F.brxLireSauve(F.brxEcrireSauve(S4), D).mort[3] === 'disque' && F.brxLire(D, Object.assign({}, S0, { tue: F.brxLireSauve(F.brxEcrireSauve(S4), D).mort }), 2).premier === 'disque', 'sauvegarde : au combat suivant, ce qui t\'a tué à la phase III est joué en premier à la phase III');
  ok(F.brxNoter(N, { essai: false, phase: 2, par: 'inconnu', win: false }, D).mort[2] == null, 'sauvegarde : un élément inconnu n\'est pas noté');
  { const E = F.brxNoter(N, { essai: true, phase: 2, par: 'tir', win: false }, D); ok(E.tentatives === 0, 'contre-épreuve : une sauvegarde d\'essai écrite serait attrapée (tentatives reste 0)'); } }

// ── 8. Statistiques
ok(F.brxPire([], 0.05) === null && F.brxPire([5], 0.05) === 5 && Math.abs(F.brxPire([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 0.1) - 10) < 1e-9 && Math.abs(F.brxPire([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 0.5) - 8) < 1e-9, 'statistiques : moyenne de la pire part (5 %, 10 %, 50 %)');

// ── 9. Branchements lus dans index.html
const has = (re, msg) => ok(typeof re === 'string' ? html.includes(re) : re.test(html), 'branchement : ' + msg);
has('<script src="data/brumeux.js"></script>', 'data/brumeux.js chargé');
has(/const TH=e\.seuils18\|\|\[0\.66,0\.33\],hp0=e\.hp,guard=hp0>e\.maxHp\*\(e\.seuils18\?TH\[TH\.length-1\]\+0\.01:0\.34\)\?1e7:0;/, 'seuils de phase : ceux du gardien (0,66 / 0,33, garde 0,34) sans e.seuils18, ceux du Brumeux avec');
has(/for\(const t of TH\)\{const th=e\.maxHp\*t;if\(hp0>th&&e\.hp<th-1\)\{e\.hp=th-1;e\.lockT=RUN\.time\+BAL\.phaseLock;break;\}\}/, 'seuils de phase : les dégâts ne passent pas le seuil, verrou de phase posé');
has("ESSAI_URL=/[?&](masque|brume|glas|dernier|nemesis|arene|brumeux)=/", 'garde d\'essai de la némésis : brumeux');
has("ESSAI18=/[?&](masque|brume|glas|dernier|nemesis|demo|descente|arene|brumeux)=/", 'garde d\'essai de la descente : brumeux');
has(/updateBoss=function\(e,dt\)\{if\(e&&e\.brx18&&X\.on\)\{try\{pas\(e,dt\);\}/, 'updateBoss enveloppé : le Brumeux joue sa partition, jamais l\'IA du Glas');
has(/hitEnemy=function\(e,base,o\)\{if\(!\(e&&e\.brx18&&X\.on\)\)return _he\.apply/, 'hitEnemy enveloppé : changement de phase au seuil');
has(/bossDefeated=function\(e\)\{if\(e&&e\.brx18\)\{try\{mort\(e\);\}/, 'bossDefeated enveloppé : sa mort, pas celle d\'un gardien');
has(/drawEnemyBody=function\(e\)\{if\(!\(e&&e\.brx18\)\)return _deb\.apply/, 'drawEnemyBody enveloppé');
has(/drawEnemyPost=function\(e\)\{if\(!\(e&&e\.brx18\)\)return _dep\.apply/, 'drawEnemyPost enveloppé (anneau ivoire du point faible)');
has(/if\(G27\.aNu\(e,fd\)\)\{const \[x,y,r\]=faible\(e\);G27\.anneau\(c,x,y,r\);\}/, 'point faible : G27.anneau, seulement à nu (G27.aNu)');
has(/g27GlypheHud=function\(el,n\)\{const b=room&&room\.boss;if\(el&&b&&b\.brx18&&!b\.dead\)/, 'glyphe sur la barre de vie à la place de celui de l\'acte');
has(/render=function\(\)\{if\(!\(RUN&&!RUN\.hub&&P&&state==='play'&&ACTE\(\)===ACTES_N\)\)return _rd\.apply/, 'durée des images relevée à l\'acte X seulement');
has(/const reservoir=\(a,n,v\)=>\{if\(a\.length<RES\)a\.push\(v\);else\{const k=Math\.floor\(rr\(\)\*n\);/, 'échantillon réservoir sans Math.random (rien du jeu ne change)');
has(/images:window\.__brumeux&&window\.__brumeux\.images\?window\.__brumeux\.images\(\):null,brumeux:window\.__brumeux&&window\.__brumeux\.statsRun/, 'statistiques de fin de run : images et combat final');
has(/const Pa=RUN\.par18\|\|\(RUN\.par18=\{\}\);Pa\[k\]=\(Pa\[k\]\|\|0\)\+\(h0-P\.hp\);/, 'RUN.par18 : les dégâts reçus par source');
has(/if\(A\.sourcesPlus\)for\(const s of A\.sourcesPlus\(\)\)L\.push/, 'arène : les zones du Brumeux sont des sources de signe');
has(/if\(A\.zoneCourante\)\{ch\.push\(id\(A\.zoneCourante\)\);sorte='zone';boss=!!A\.zoneCourante\.boss;\}/, 'arène : une zone du Brumeux se juge au préavis du boss');
has(/,b=essaiBoss\(\)\|\|\(A\.bossCam&&A\.bossCam\(\)\),/, 'arène : la caméra glisse vers le Brumeux');
has(/if\(A\.glypheBoss\)A\.glypheBoss\(c,0,0,t\*0\.5\);else oeil\(c,0,0,t\*0\.45\);/, 'arène : son glyphe dans le signe de bord à la place de l\'œil d\'essai');
has(/XA\.coup\(z,\(\)=>hurtPlayer\(z\.degats,e\)\)/, 'un coup de zone passe par la zone courante de l\'arène (jugé)');
has(/k=brxPlacer\(DB,V,\[P\.x,P\.y\],optSortie\(charge\)\);if\(k<0\)\{X\.j\.sautes\+\+;return false;\}/, 'une zone sans sortie saute');
has(/v:Math\.min\(SBJ18\.joueur\.vitesse,pMarche\(\)\)/, 'sortie cherchée à ta vitesse à pied si elle est plus lente (comme sbPlacer)');
has(/pr:Math\.max\(SBJ18\.joueur\.rayon,P\.r\)/, 'sortie cherchée avec ton vrai rayon s\'il est plus grand');
has(/const charge=brxPreavis\(DB,X\.sauve,id\);X\.vus\.add\(id\);/, 'première rencontre : +0,3 s de préavis, l\'élément est noté vu');
has(/if\(ph\.id==='effacement'\)effacerCons\(\);/, 'les constructions restent jusqu\'à la phase V');
has(/const v=brxPoser\(DB,monde\(\),AR,base,X\.cons\.map/, 'une construction passe par brxPoser (connexité, aire, plafond)');
has(/if\(sur\.length&&c\.attente<AT\)\{c\.attente\+=dt;continue;\}/, 'une construction attend une créature (attenteMax de l\'arène) puis la pousse sans dégât');
has(/if\(!o\.essai&&N!==S\)\{SAVE\.brumeux=brxEcrireSauve\(N\);/, 'SAVE.brumeux écrite seulement hors essai');
// le Brumeux n'est créé que par l'essai : creer() seulement dans debut(), debut() seulement dans essai()
ok((html.match(/\bcreer\(/g) || []).length === 2 && /function debut\(phase0\)\{X\.sauve=sauveLire\(\);creer\(phase0\);/.test(html), 'le Brumeux n\'est créé que par debut()');
ok((html.match(/\bdebut\(phase\)/g) || []).length === 1 && /debut\(phase\);showBanner\(DB\.nom/.test(html), 'debut() n\'est appelé que par l\'essai (rien en jeu avant 5g)');
ok(!/actif:true/.test(readFileSync(join(ROOT, 'data', 'arene.js'), 'utf8')), 'arene.js : actif:false (règle d\'or)');
has(/const QB=\/\[\?&\]brumeux=\(\\d\+\)\/\.exec\(location\.search\);/, 'essai par l\'adresse : ?brumeux=<phase>');
has(/window\.__brumeux=\{DB,essai,vers/, 'console __brumeux');

for (const m of NOTES) console.log('  ' + m);
console.log(`sim-brumeux : ${checks} vérifications, ${fails} échec${fails > 1 ? 's' : ''}. (ΔE minimal des couleurs du Brumeux contre la grammaire : ${dEmin.toFixed(1)})`);
process.exit(fails ? 1 : 0);
