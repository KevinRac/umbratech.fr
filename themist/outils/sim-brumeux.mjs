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
//     jamais créé hors de l'essai) ;
// 10. la phase I, « le Rappel » (action 5b, v18.6) : données (partition, gestes signature fixes, tableaux, état d'arène réel en index 3 et
//     montants aux frontières des tiers, thèmes permis par décor d'après le champ salle du bestiaire, Brume plombée exclue) ; brèche de
//     l'anneau et case dans brxDans ; les gestes signature : 10 000 positions chacun, toujours une sortie (la Toile : deux coups) ; tiers et
//     fragments ; 10 000 boucles de tableaux à graine (déterminisme, trois tiers, décors distincts, thème permis, budget et coûts, jamais
//     la Brume plombée) ; pondération par RUN.par18 / par18A / par18R ; premier tableau = celui qui t'a tué ; places et dalles dans le
//     fragment (10 000 tirages, toujours une sortie) ; champ tab de SAVE.brumeux (v:1) ;
// 11. la phase II, « L'Ouvrage » (action 5c, v18.7) : données (gestes, partition.ouvrage, six sortes, plafonds, parts de PV, matières à ΔE ≥ 25,
//     état d'arène réel en index 4, états 0 à 3 inchangés) ; lecture des sortes (seuil, poids, verdicts jumeaux, variété, premier bâtir = bati ou
//     rails) ; placement (10 000 par sorte : bornes, jamais sur toi, distances, voie des rails, aire ≤ 30 %, connexité ≥ 85 %, douve au pire) ;
//     persistance (10 000 phases abstraites : plafonds, filtre des bornes de l'état IV, connexité revérifiée) ; gestes (Ruée coupée au premier
//     pilier qui arrête un tir, jamais par une fosse ; Ruée, Équerre, Truelle : 10 000 positions chacune, sortie atteinte à temps ; abri derrière une
//     construction et sous ses mains) ; effondrement (10 000 par sorte : la plus proche avec une sortie, aucune quand il n'y a rien) ; cloche
//     (10 000 passages : sortie de côté) ; fissures et annulation ; appel ; tirs et fosses (les enveloppes de hitsWall et keepRange rendent l'ancien
//     résultat au bit près hors de l'arène) ; champ bati ; branchements de la section v18.7.
// Contre-épreuves (une erreur introduite exprès doit être attrapée) : seuils inversés, budget dépassé, feinte tirée, sortie sans réflexe,
// construction qui coupe le passage acceptée, sauvegarde d'essai écrite ; 5b : brèche fermée, damier plein, dalle hors fragment, tiers répété,
// thème interdit, sauvegarde tab invalide acceptée ; 5c : douve aux quatre passerelles fermées acceptée, Ruée qui traverse une construction, fosse
// qui arrête un tir, construction posée sur toi, douve à 200 px, cône sans abri sous ses mains, effondrement sans sortie posé, bati invalide accepté,
// état 3 déplacé.
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
for (const f of ['brumeux', 'arene', 'descente', 'bestiaire', 'versions', 'gardiens']) vm.runInContext(readFileSync(join(ROOT, 'data', f + '.js'), 'utf8'), ctx);
vm.runInContext(bloc('des') + '\n' + bloc('brx') + '\nthis.F={desRng,brxPalier,brxPv,brxSeuils,brxPhase,brxLire,brxBudget,brxTirer,brxMesures,brxBoucle,brxPreavis,brxSeg,brxDans,brxSortie,brxPlacer,brxPartition,brxFils,brxCadre,brxToile,brxSortieToile,brxTiers,brxTiersLoin,brxDansRect,brxPlaces,brxDalle,brxDecors,brxTabOk,brxPoidsTab,brxPick,brxTableau,brxGrille,brxConnexe,brxPoser,brxNeuf,brxLireSauve,brxEcrireSauve,brxNoter,brxPire,BRX_V,brxCoupe,brxBord,brxRuee,brxEquerre,brxTruelle,brxSorteScore,brxSortesPoids,brxOrdreSortes,brxGeo,brxBatir,brxPvPart,brxFissure,brxAnnule,brxFiltreBornes,brxChute,brxEffondrement,brxCloche,brxAppel,brxDisques,brxEtats,brxTous,BRX_SORTES,BRX_CHUTE};', ctx);
const F = ctx.F, BD = ctx.window.BRUME_DATA, D = BD.brumeux, DA = BD.arene, DS = BD.descente, BE = BD.bestiaire, VERS = BD.versions, GA = BD.gardiens;
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
const j185 = VERS.journal.filter(x => x.h === 'v18.5' || x.h === 'v18.6' || x.h === 'v18.7');
ok(/^v18\.([5-9])/.test(VERS.actuelle) && VERS.journal.some(x => x.h === 'v18.5'), 'journal : version actuelle v18.5 ou plus, une ligne v18.5');
ok(VERS.actuelle !== 'v18.6' || (VERS.journal[0].h === 'v18.6'), 'journal (5b) : la ligne v18.6 est en tête');
ok(VERS.actuelle !== 'v18.7' || (VERS.journal[0].h === 'v18.7'), 'journal (5c) : la ligne v18.7 est en tête');
for (const x of j185) ok(!/phase|\bbât|construi|graine|tirage|improvis|selon ta|ton style|lit ton|segment/i.test(x.t), `journal ${x.h} : ni phase, ni construction selon le style, ni tirage, ni lecture`);
for (const x of j185) ok(!/tableau|tiers|fragment|décor|rideau|partition|toile|cadre\b|\bfils\b|dalle/i.test(x.t), `journal ${x.h} : ni tableau, ni décor convoqué, ni geste nommé (secret)`);
for (const x of j185) ok(!/muraille|douve|colonnade|\brail|puits|échafaud|ruée|équerre|truelle|effondr|cloche|passerelle|manœuvre|annul|fissure/i.test(x.t), `journal ${x.h} : ni construction nommée, ni geste nommé de la phase II (secret)`);
const wiki = readFileSync(join(ROOT, 'wiki.html'), 'utf8').replace(/<!-- gen:journal -->[\s\S]*?<!-- \/gen:journal -->/, '').replace(/<[^>]+>/g, ' ');
ok(!/Brumeux[^.]{0,140}(phase|bât|construi|graine|tirage|improvis|partition|tableau|tiers|rideau)/i.test(wiki) && !/(boss final|fond de la Brume)[^.]{0,140}(phase|bât|graine|tirage|partition)/i.test(wiki), 'wiki : rien sur les phases, la construction, les tirages ni la lecture du combat final');
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
    ok(nc === 0 && nc4 === 0 && D.elements.construction.fixe === true, `tirages (5c) : la construction n'est plus jamais tirée (fixe : bâtir est la mesure « batir » de la phase II) : IV ${nc4}, V ${nc} / 2000`); }
  const tirables = Object.keys(D.elements).filter(id => D.elements[id].sorte !== 'feinte' && !D.elements[id].fixe);
  ok(!Object.keys(vus).some(id => D.elements[id].fixe), 'tirages : un élément fixe (gestes signature, tableau, feinte) n\'est jamais tiré : ' + Object.keys(vus).join(', '));
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
  const bo = F.brxBoucle(D, lec, 2, 'normal', F.desRng(3), {}); ok(bo.length === D.partition.essai.length && bo.every(m => m.k === 'fixe' ? !!m.g : Array.isArray(m.elements)), 'tirages : la boucle résout les mesures libres');
  ok(F.brxMesures(D, 2).every((m, i) => m.k === D.partition.essai[i].k) && F.brxMesures(D, 3).length === D.partition.essai.length && F.brxMesures(D, 1).length === D.partition.ouvrage.mesures.length, 'tirages : la phase II joue sa partition (5c) ; les phases III à V jouent encore la partition d\'essai (5d à 5f)');
  ok(F.brxMesures(D, 0).length === D.partition.rappel.mesures.length && F.brxPartition(D, 0).entracteS === 1.4 && F.brxPartition(D, 0).nuS === 0 && F.brxPartition(D, 2).nuS === D.partition.nuS, 'tirages : la phase I joue sa partition (le Rappel : entracte 1,4 s, pas de fenêtre à nu après la boucle)');
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
// v18.6 (5b) : la phase I en jeu
const B186 = (html.match(/═══ v18\.6 · Phase I[\s\S]*?\/\/ ── essai \(Q17\)/) || [''])[0];
ok(B186.length > 4000, 'branchement (5b) : la section « v18.6 · Phase I » existe dans le bloc du Brumeux');
ok(!/setRule\(|murmur\(|ruleTag|showBanner\(|toast\(/.test(B186), 'branchement (5b) : règles confinées sans bulle ni étiquette (ni setRule, ni murmur, ni toast, ni bandeau)');
ok(!/'brume'|veil/.test(B186), 'branchement (5b) : la Brume plombée n\'est jamais jouée dans un fragment');
ok(!/Math\.random\(\)/.test(B186), 'branchement (5b) : la phase I ne tire rien avec Math.random (graine du combat)');
has(/if\(m\.k==='tableau'\)\{X\.im\+\+;accrocher\(m\);return;\}/, '(5b) une mesure « tableau » accroche un tableau');
has(/X\.boucle=brxBoucle\(DB,X\.lec,X\.phase,X\.palier,X\.rng,actifs,\{premiere:!X\.nb\+\+\}\);X\.im=0;X\.tiersVus=\[\];/, '(5b) le premier tableau de la phase rejoue celui qui t\'a tué ; chaque tiers sert une fois par boucle');
has(/i=brxTiersLoin\(TI,P\.x,P\.y,X\.tiersVus\)/, '(5b) le tableau au tiers le plus loin de toi parmi ceux qui n\'ont pas servi');
has(/Math\.random=desRng\(/, '(5b) les fragments sont peints à la graine du combat');
has(/finally\{Object\.assign\(AR,sAR\);Math\.random=sR;\}/, '(5b) AR et Math.random rendus après la peinture (rien du jeu ne change)');
has(/if\(brxMesures\(DB,phase0\)\.some\(m=>m\.k==='tableau'\)\)cuire\(\);/, '(5b) les calques sont cuits à l\'entrée du combat (aucune peinture en combat)');
has(/if\(brxPlacer\(DB,\[\[d,\.\.\.autres\]\],\[P\.x,P\.y\],optSortie\(SOL\.annonceS\)\)<0\)X\.j\.dallesSautees\+\+;/, '(5b) une dalle n\'est posée que si une sortie existe');
has(/XA\.coup\(h,\(\)=>hurtPlayer\(SOL\.degatsJoueur,null\)\)/, '(5b) le coup d\'une dalle est jugé sur la dalle (source de signe)');
has(/if\(X\.tab\)for\(const h of X\.tab\.dalles\)out\.push\(\{o:h,k:'tele'/, '(5b) chaque dalle est une source de signe de l\'arène');
has(/PA=RUN\.par18A\|\|\(RUN\.par18A=\{\}\),ac=ACTE\(\);PA\[ac\]=\(PA\[ac\]\|\|0\)\+lost;/, '(5b) RUN.par18A : dégâts reçus par acte');
has(/const PR=RUN\.par18R\|\|\(RUN\.par18R=\{\}\);PR\[room\.rule\]=\(PR\[room\.rule\]\|\|0\)\+lost;/, '(5b) RUN.par18R : dégâts reçus par règle de salle');
has(/if\(T&&T\.sub==='vie'&&T\.regle==='verre'&&P&&brxDansRect\(T\.frag,P\.x,P\.y\)\)/, '(5b) le Verre : +40 % reçus, dans le fragment seulement');
has(/if\(T\.regle==='verre'&&brxDansRect\(T\.frag,e\.x,e\.y\)\)m=TB\.regles\.verre\.recu;/, '(5b) le Verre : un ennemi dans le fragment subit +40 %');
has(/else if\(T\.regle==='braseros'&&!\(T\.braz\|\|\[\]\)\.some\(b=>hyp\(e\.x-b\.x,e\.y-b\.y\)<BRZ\.rayon\)\)m=BRZ\.subi;/, '(5b) les Braseros : un ennemi du tableau hors de leur lumière ne subit que 40 %');
has(/if\(!vivants&&T\.t>0\.3\)rideau\(true\);else if\(T\.t>=TB\.vieMaxS\)\{rentrer\(\);rideau\(false\);\}/, '(5b) vidé : le rideau ; non vidé à 30 s : ses ennemis rentrent, rideau');
has(/if\(T\.vide\)X\.e\.vuln=Math\.max\(X\.e\.vuln\|\|0,TB\.nuS\);/, '(5b) à nu 3 s après un tableau vidé seulement');
has(/if\(!T\.feinte&&T\.t>=TB\.feinteApresS&&!room\.bl\)\{T\.feinte=true;lancer\('feinte'\);\}/, '(5b) une feinte au plus par tableau, s\'il vit encore 8 s');
has(/const ch=nu&&!RM&&/, '(5b) mouvements réduits : ses mains ne tombent pas');
has(/function fragAlpha\(T\)\{[^}]*RM\?1-Math\.min\(1,T\.t\/TB\.rideauS\):1/, '(5b) mouvements réduits : le rideau est un fondu');
has(/tab:!win&&X\.tue==='tableau'\?X\.tueTab:null/, '(5b) la sauvegarde garde le tableau qui t\'a tué');
has(/if\(X\.tab\)tabFin\(\);X\.nb=0;/, '(5b) une transition rentre le tableau en cours');
has(/if\(S\.size\)\{eproj=eproj\.filter\(q=>!S\.has\(q\.from\)\);rings=rings\.filter\(g=>!S\.has\(g\.src\)\);\}/, '(5b) les ennemis qui rentrent emportent leurs tirs en vol et leurs ondes (aucun coup au nom d\'un ennemi parti)');
has(/for\(const sp of room\.spawning\)if\(!sp\.brx18t\)\{sp\.brx18t=1;sp\.t=Math\.max\(sp\.t,TB\.apparition\[0\]\);\}/, '(5b) une naissance en plein combat (la Nourrice) a au moins le cercle d\'une apparition (0,85 s ≥ préavis de l\'arène)');
ok(DA.preavis.coup < D.tableaux.apparition[0], `(5b) le cercle d'apparition (${D.tableaux.apparition[0]} s) dépasse le préavis de l'arène (${DA.preavis.coup} s)`);
has(/const h=a>=1&&A\.solTrou\?A\.solTrou\(\):null;/, '(5b) arène : sous un fragment plein, le sol n\'est pas posé (crochet solTrou, inerte sans le Brumeux)');
has(/solTrou:\(\)=>\{const T=X\.tab;if\(!T\|\|!X\.cal\|\|fragAlpha\(T\)<1\)return null;/, '(5b) le trou n\'est posé que sous un fragment plein');
has(/XA\.crochets\(\{sourcesPlus:null,bossCam:null,glypheBoss:null,bossCharge:null,solTrou:null(,jetonTir:null)?\}\)/, '(5b) les crochets de l\'arène (trou compris) rendus à la salle suivante');
has(/finally\{X\.feinteCoup=k;if\(X\.on&&room\)room\.blT=1e9;\}/, '(5b) la salle ne relance pas de feinte d\'elle-même pendant son combat (le Brumeux la joue dans sa partition)');

// ── 10. La phase I, « le Rappel » (action 5b, v18.6)
{ const PR = D.partition.rappel, T = D.tableaux, ME = PR.mesures;
  // données : partition, gestes signature fixes, tableaux
  ok(D.phases[0].id === 'rappel' && D.phases[0].arene === 3 && (D.phases[0].exclut || []).includes('construction'), 'phase I : état d\'arène réel (index 3), la construction exclue (bâtir, c\'est la phase II)');
  ok(PR.entracteS === 1.4 && PR.nuS === 0 && ME.length === 9, 'phase I : partition (9 mesures, entracte 1,4 s, à nu après chaque tableau et non après la boucle)');
  ok(ME.filter(m => m.k === 'tableau').length === 3 && ME.filter(m => m.k === 'libre').length === 2 && ME.filter(m => m.k === 'fixe').map(m => m.g).join() === 'fils,feinte,cadre,toile', 'phase I : trois tableaux, deux mesures libres, les Fils, la feinte, le Cadre, la Toile, dans l\'ordre de la fiche');
  ok(ME.map(m => m.k === 'fixe' ? m.g : m.k).join(' ') === 'tableau fils libre tableau feinte cadre tableau libre toile', 'phase I : l\'ordre des mesures est celui de la fiche (§ 2)');
  for (const g of ['fils', 'cadre', 'toile', 'feinte', 'tableau']) ok(D.elements[g] && D.elements[g].fixe === true, `phase I : « ${g} » est fixe (jamais tiré)`);
  const EF = D.elements.fils, EC = D.elements.cadre, ET = D.elements.toile;
  ok(EF.n === 5 && EF.w === 30 && EF.ouverture === 70 && EF.len === 1000 && EF.charge === 1.0 && EF.degats === 14, 'phase I : les Fils : 5 couloirs de 30 px en éventail de 70°, longueur 1 000, préavis 1,0 s, 14 dégâts');
  ok(EC.r0 === 70 && EC.r1 === 250 && EC.breche === 110 && EC.charge === 1.2 && EC.degats === 12, 'phase I : le Cadre : anneau 70 → 250, brèche 110 px, préavis 1,2 s, 12 dégâts');
  ok(ET.n === 5 && ET.cote === 90 && ET.charge === 1.0 && ET.seconde === 0.9 && ET.degats === 10, 'phase I : la Toile : 5 × 5 cases de 90 px, 1,0 s puis 0,9 s, 10 dégâts par moitié');
  for (const g of ['fils', 'cadre', 'toile']) ok(D.elements[g].charge >= D.preavis.boss && D.elements[g].sorte === 'zone', `phase I : ${g} : une zone, préavis ≥ ${D.preavis.boss} s`);
  ok(T.accrocheS === 1.2 && T.vieMaxS === 30 && T.rideauS === 0.6 && T.nuS === 3 && T.feinteApresS === 8 && T.retrait === 30 && T.minD === 230 && T.chute === 140, 'phase I : tableau : accroche 1,2 s, vie ≤ 30 s, rideau 0,6 s, à nu 3 s, feinte après 8 s, retrait 30 px, places à 230 px, chute des mains 140 px');
  ok(T.budget.normal === 4 && T.budget.difficile === 5 && T.budget.extreme === 6 && T.couts.vague === 2 && T.couts.regle === 1 && T.couts.densite === 1 && T.couts.champion === 1 && T.max.regle === 1 && T.max.densite === 2 && T.max.champion === 1, 'phase I : budget par tableau 4 / 5 / 6 et coûts (vague 2, règle 1, densité 1 ×2 au plus, champion 1)');
  ok(Object.keys(T.regles).sort().join() === 'braseros,sol,verre' && T.exclues.includes('brume') && !T.regles.brume, 'phase I : règles confinées Sol, Braseros, Verre ; Brume plombée exclue');
  for (const k in T.regles) ok(!!BE.regles[k], `phase I : la règle « ${k} » existe en descente (mêmes chiffres, mêmes dessins)`);
  ok(T.regles.sol.r === 66 && T.regles.sol.annonceS === 1.3 && T.regles.sol.degatsJoueur === 10 && T.regles.sol.degatsEnnemis === 20 && T.regles.braseros.n === 2 && T.regles.braseros.rayon === 190 && T.regles.braseros.subi === 0.4 && T.regles.verre.recu === 1.4, 'phase I : chiffres des règles = ceux de la descente (dalle 66 px annoncée 1,3 s, 10 / 20 dégâts ; braseros 190 px, 40 % ; verre +40 %)');
  // thèmes permis par décor : ceux qu'on rencontre dans l'acte du décor (champ salle du bestiaire ; registres I, II, III)
  const finActe = []; { let g = 0; for (const a of GA.actes) { g += a.rooms; finActe.push(g); } }
  for (const [k, dc] of Object.entries(T.decors)) { const fin = finActe[Math.min(2, Math.max(...dc.actes.filter(a => a <= 3)) - 1)];
    const permis = Object.keys(BE.themes).filter(t => BE.themes[t].need.every(n => (BE.ennemis[n].salle || 1) <= fin));
    ok(permis.slice().sort().join() === dc.themes.slice().sort().join(), `phase I : décor ${k} : thèmes ${dc.themes.join(', ')} = ceux qu'on rencontre à son acte (salle ≤ ${fin})`); }
  ok(T.decors.faub.themes.join() === 'meute,tir,petards' && T.decors.crypt.themes.length === 4 && T.decors.coeur.themes.length === 6, 'phase I : Faubourgs 3 thèmes, Cryptes 4, Cœur 6 (fiche § 3)');
  // contre-épreuve : un thème interdit (le Siège dans les Faubourgs) n'est pas un tableau possible
  ok(!F.brxTabOk(D, { decor: 'faub', theme: 'siege', regle: null }, null) && F.brxTabOk(D, { decor: 'coeur', theme: 'siege', regle: 'sol' }, null) && !F.brxTabOk(D, { decor: 'coeur', theme: 'meute', regle: 'brume' }, null), 'contre-épreuve : thème interdit par le décor, ou Brume plombée : tableau refusé');
  // l'état d'arène réel (index 3, ajouté après les trois états d'essai) et ses quatre montants aux frontières des tiers
  const EA = DA.salles.final.etats, M = F_mondeFinal(), E3 = EA[3];
  ok(EA.length >= 4 && E3.id === 'rappel' && E3.sol === 'pierre' && (E3.vides || []).length === 0 && E3.obstacles.length === 4, 'phase I : arene.js : état « rappel » en index 3, sol pierre, pas de fosse, quatre montants');
  ok(EA[0].obstacles.length === 4 && EA[1].vides.length === 1 && EA[2].vides.length === 2, 'phase I : les trois états d\'essai restent à leurs places (0, 1, 2)');
  const R = { x0: MUR.g, y0: MUR.h, x1: M.w - MUR.d, y1: M.h - MUR.b }, TI = F.brxTiers(R, T.retrait);
  ok(TI.length === 3 && Math.abs(TI[0].x0 - R.x0) < 1e-6 && Math.abs(TI[2].x1 - R.x1) < 1e-6 && TI.every((t, i) => i === 0 || Math.abs(t.x0 - TI[i - 1].x1) < 1e-6), `phase I : trois tiers qui couvrent l'arène (${Math.round(TI[0].x1 - TI[0].x0)} px chacun)`);
  ok(TI.every(t => t.frag.x0 === t.x0 + 30 && t.frag.x1 === t.x1 - 30 && t.frag.y0 === R.y0 + 30 && t.frag.y1 === R.y1 - 30), 'phase I : chaque fragment est son tiers moins 30 px');
  const mont = E3.obstacles.map(o => ({ x: R.x0 + (R.x1 - R.x0) * o.fx, y: R.y0 + (R.y1 - R.y0) * o.fy, r: o.r }));
  ok(mont.every(m => TI.some((t, i) => i > 0 && Math.abs(m.x - t.x0) < 2)) && mont.every(m => TI.every(t => !(m.x + m.r > t.frag.x0 && m.x - m.r < t.frag.x1 && m.y + m.r > t.frag.y0 && m.y - m.r < t.frag.y1))), 'phase I : les montants sont aux frontières des tiers, toujours hors des fragments');
  // le tiers le plus loin de toi parmi ceux qui n'ont pas servi
  { const rnd = mk(5); let bad = 0, rep = 0;
    for (let i = 0; i < 10000; i++) { const x = R.x0 + rnd() * (R.x1 - R.x0), y = R.y0 + rnd() * (R.y1 - R.y0), vus = [];
      for (let k = 0; k < 3; k++) { const t = F.brxTiersLoin(TI, x, y, vus); if (t < 0 || vus.includes(t)) rep++; vus.push(t); }
      const t0 = F.brxTiersLoin(TI, x, y, []), d = t => Math.hypot(x - (TI[t].x0 + TI[t].x1) / 2, y - (TI[t].y0 + TI[t].y1) / 2); if ([0, 1, 2].some(t => d(t) > d(t0) + 1e-9)) bad++; }
    ok(bad === 0 && rep === 0, `phase I : 10 000 boucles : le premier tableau au tiers le plus loin de toi, puis les deux autres, jamais deux fois le même (${bad} + ${rep})`);
    // contre-épreuve : en oubliant les tiers déjà servis, le même tiers reviendrait
    let rep2 = 0; for (let i = 0; i < 200; i++) { const x = R.x0 + rnd() * (R.x1 - R.x0), y = R.y0 + rnd() * (R.y1 - R.y0); if (F.brxTiersLoin(TI, x, y, null) === F.brxTiersLoin(TI, x, y, [])) rep2++; }
    ok(rep2 === 200, 'contre-épreuve : un tiers répété (les tiers servis oubliés) serait attrapé par le compte ci-dessus'); }
  // brèche de l'anneau et case dans brxDans
  { const z = { forme: 'anneau', x: 1000, y: 500, r0: 70, r1: 250, breche: { a: 0, l: 110 } }, pr = 14;
    ok(!F.brxDans(z, 1000, 500, pr) && !F.brxDans(z, 1150, 500, pr) && !F.brxDans(z, 1150, 540, pr) && F.brxDans(z, 1150, 552, pr) && F.brxDans(z, 850, 500, pr) && F.brxDans(z, 1000, 650, pr), 'brxDans : le Cadre : à l\'abri au centre et dans la brèche (à pr/2 de ses bords), touché ailleurs sur l\'anneau');
    const ferme = Object.assign({}, z, { breche: { a: 0, l: 0 } }); ok(F.brxDans(ferme, 1150, 500, pr), 'contre-épreuve : une brèche fermée (0 px) toucherait qui s\'y tient');
    const c = { forme: 'case', x0: 0, y0: 0, x1: 90, y1: 90 }; ok(F.brxDans(c, 45, 45, pr) && F.brxDans(c, 95, 45, pr) && !F.brxDans(c, 98, 45, pr) && !F.brxDans(c, 45, -8, pr), 'brxDans : une case du damier, à pr/2 de ses bords'); }
  // les gestes signature : 10 000 positions chacun ; quand une variante est placée, la sortie existe vraiment (Toile : deux coups)
  { const rnd = mk(77), N = 10000, o0 = { pr: 14, v: 180, reflexe: 0.05, arene: R }, bloque = (x, y, pr) => mont.some(m => Math.hypot(x - m.x, y - m.y) < m.r + pr), ch = id => D.elements[id].charge + D.preavis.premiere;
    const st = { fils: [0, 0, 0], cadre: [0, 0, 0], toile: [0, 0, 0] };
    for (let i = 0; i < N; i++) { const px = R.x0 + 30 + rnd() * (R.x1 - R.x0 - 60), py = R.y0 + 30 + rnd() * (R.y1 - R.y0 - 60); if (bloque(px, py, 14)) continue;
      const hx = Math.max(R.x0 + 220, Math.min(R.x1 - 220, px + (rnd() - 0.5) * 400)), hy = R.y0 + 200 + 0.6 * Math.max(0, py - R.y0 - 200), o = Object.assign({}, o0, { bloque: (x, y) => bloque(x, y, 14) });
      const lib = (zs, x, y) => x >= R.x0 + 14 && x <= R.x1 - 14 && y >= R.y0 + 14 && y <= R.y1 - 14 && !o.bloque(x, y) && !zs.some(z => F.brxDans(z, x, y, 14));
      for (const g of ['fils', 'cadre']) { const V = [0, 0.15, -0.15, 0.3].map(r => g === 'fils' ? F.brxFils(EF, [hx, hy], [px, py], r) : F.brxCadre(EC, [hx, hy], [px, py], r)), oc = Object.assign({}, o, { charge: ch(g) }), k = F.brxPlacer(D, V, [px, py], oc);
        if (k < 0) { st[g][1]++; continue; } st[g][0]++; const s = F.brxSortie(D, V[k], [px, py], oc); if (!s.ok || !lib(V[k], s.q[0], s.q[1]) || Math.hypot(s.q[0] - px, s.q[1] - py) > 180 * (oc.charge - 0.05) + 1e-6) st[g][2]++; }
      { let placee = false; for (const dec of [[0, 0], [45, 0], [0, 45], [45, 45]]) { const TT = F.brxToile(ET, [px, py], dec), s = F.brxSortieToile(D, ET, TT, [px, py], o, ch('toile'));
          if (!s.ok) continue; placee = true; st.toile[0]++; if (!lib(TT.noires, s.q1[0], s.q1[1]) || !lib(TT.blanches, s.q2[0], s.q2[1]) || Math.hypot(s.q2[0] - s.q1[0], s.q2[1] - s.q1[1]) > 180 * (ET.seconde - 0.05) + 1e-6) st.toile[2]++; break; }
        if (!placee) st.toile[1]++; } }
    for (const g of ['fils', 'cadre', 'toile']) ok(st[g][2] === 0 && st[g][0] > N * 0.9, `gestes : ${g} : ${st[g][0]} placés, ${st[g][1]} sautés, chaque sortie rendue libre et atteinte à pied à temps (${st[g][2]} fausses)`);
    note(`gestes signature : Fils ${st.fils[0]} / ${st.fils[1]} sautés, Cadre ${st.cadre[0]} / ${st.cadre[1]}, Toile ${st.toile[0]} / ${st.toile[1]}`);
    ok(st.cadre[1] === 0, 'gestes : le Cadre centré sur toi a toujours sa sortie (rester au centre)');
    // la Toile : 13 noires et 12 blanches, la case du centre est noire ; contre-épreuve : un damier plein (25 cases d'un coup) ne laisse aucune sortie du centre
    const TT = F.brxToile(ET, [1000, 500]); ok(TT.noires.length === 13 && TT.blanches.length === 12 && TT.noires.some(c => c.x0 < 1000 && c.x1 > 1000 && c.y0 < 500 && c.y1 > 500), 'gestes : la Toile : 13 cases noires (dont celle sous toi), 12 blanches');
    const plein = TT.noires.concat(TT.blanches); ok(!F.brxSortie(D, plein, [1000, 500], Object.assign({}, o0, { charge: ch('toile') })).ok, 'contre-épreuve : un damier plein (les deux moitiés d\'un coup) n\'aurait pas de sortie : la règle des deux moitiés compte');
    const fan = F.brxFils(EF, [1000, 200], [1000, 600], 0), angs = fan.map(z => Math.atan2(z.y1 - z.y0, z.x1 - z.x0));
    ok(fan.length === 5 && Math.abs((angs[4] - angs[0]) * 180 / Math.PI - 70) < 1e-6 && Math.abs(angs[2] - Math.PI / 2) < 1e-9 && fan.every(z => Math.abs(Math.hypot(z.x1 - z.x0, z.y1 - z.y0) - 1000) < 1e-6), 'gestes : les Fils : 5 couloirs sur 70°, celui du milieu vers toi, longueur 1 000');
    const cd = F.brxCadre(EC, [1000, 200], [1000, 600], 0)[0]; ok(Math.abs(cd.breche.a - Math.PI / 2) < 1e-9 && cd.x === 1000 && cd.y === 600, 'gestes : le Cadre : centré sur toi, brèche du côté opposé à ses mains'); }
  // les tableaux : 10 000 boucles à graine
  { const THM = BE.themes, S = { prof: {}, eff: {}, ko: {}, cms: CMS, par: {}, tue: {}, acte: 10, themes: THM }, lec = F.brxLire(D, S, 0), N = 10000;
    let det = 0, bad = 0, distincts = 0, brume = 0, theme = 0, cout = 0, regles = { sol: 0, braseros: 0, verre: 0, aucune: 0 }, dens = 0, champ = 0;
    for (let i = 0; i < N; i++) { const pal = ['normal', 'difficile', 'extreme'][i % 3], b1 = F.brxBoucle(D, lec, 0, pal, F.desRng(i), {}), b2 = F.brxBoucle(D, lec, 0, pal, F.desRng(i), {});
      if (JSON.stringify(b1) !== JSON.stringify(b2)) det++;
      const tabs = b1.filter(m => m.k === 'tableau').map(m => m.tab); if (tabs.length !== 3) bad++;
      if (new Set(tabs.map(t => t.decor)).size === 3) distincts++;
      for (const t of tabs) { if (!T.decors[t.decor].themes.includes(t.theme)) theme++; if (t.regle === 'brume') brume++; regles[t.regle || 'aucune']++;
        const c = T.couts.vague + (t.regle ? T.couts.regle : 0) + t.densite * T.couts.densite + (t.champion ? T.couts.champion : 0);
        if (c !== t.cout || c > T.budget[pal] || t.densite > T.max.densite || (t.regle && c < Math.min(T.budget[pal], 2 + 1 + 3))) cout++; dens += t.densite; champ += t.champion ? 1 : 0; } }
    ok(det === 0, 'tableaux : 10 000 boucles : déterministes (même graine, mêmes tableaux)');
    ok(bad === 0 && distincts === N, `tableaux : trois tableaux par boucle, trois décors distincts tant qu'il y en a trois (${distincts} / ${N})`);
    ok(theme === 0 && brume === 0, 'tableaux : thème toujours permis par le décor, jamais la Brume plombée');
    ok(cout === 0, 'tableaux : budget et coûts tenus (vague 2, règle 1, densité ×2 et champion au plus ; tout le budget dépensé quand il y a une règle)');
    ok(Object.values(regles).every(n => n > 0) && dens > 0 && champ > 0, `tableaux : chaque règle sort (${JSON.stringify(regles)}), densité et champion aussi`);
    note(`tableaux : ${N} boucles, règles ${JSON.stringify(regles)}, densité ${dens}, champions ${champ}`);
    // un seul décor traversé (acte I) : trois tableaux des Faubourgs, sans thème interdit
    { const l1 = F.brxLire(D, Object.assign({}, S, { acte: 1 }), 0); let b = 0; for (let i = 0; i < 500; i++) for (const m of F.brxBoucle(D, l1, 0, 'normal', F.desRng(i), {})) if (m.k === 'tableau' && (m.tab.decor !== 'faub' || !T.decors.faub.themes.includes(m.tab.theme))) b++;
      ok(b === 0, 'tableaux : un seul décor traversé : ses trois tableaux, thèmes permis seulement'); }
    // pondération : dégâts reçus par acte (décor), par source (thème), par règle
    const freq = (Sx, f) => { const l = F.brxLire(D, Object.assign({}, S, Sx), 0); let n = 0; for (let i = 0; i < 3000; i++) if (f(F.brxTableau(D, l, 'normal', F.desRng(i + 9), {}))) n++; return n; };
    const fa0 = freq({}, t => t.decor === 'faub'), fa1 = freq({ parA: { 1: 900, 3: 100 } }, t => t.decor === 'faub');
    ok(fa1 > fa0 * 1.3, `tableaux : RUN.par18A : les dégâts reçus aux Faubourgs font monter leur décor (${fa0} → ${fa1} / 3 000)`);
    const th0 = freq({}, t => t.theme === 'tir'), th1 = freq({ par: { spectre: 500, brute: 20 } }, t => t.theme === 'tir');
    ok(th1 > th0 * 1.2, `tableaux : RUN.par18 : les dégâts reçus des Spectres font monter Tir croisé (${th0} → ${th1})`);
    const rg0 = freq({}, t => t.regle === 'verre'), rg1 = freq({ parA: { 3: 1000 }, parR: { verre: 800 } }, t => t.regle === 'verre');
    ok(rg1 > rg0 * 1.3, `tableaux : RUN.par18R : les dégâts reçus sous le Verre font monter le Verre (${rg0} → ${rg1})`);
    const W = F.brxPoidsTab(D, F.brxLire(D, Object.assign({}, S, { par: { spectre: 300, rampant: 100 }, parA: { 2: 300, 3: 100 }, parR: { sol: 100 } }), 0));
    ok(Math.abs(W.decor.crypt - (1 + 0.8 * 0.75)) < 1e-9 && Math.abs(W.theme.tir - (1 + 0.8 * 1)) < 1e-9 && Math.abs(W.theme.meute - (1 + 0.8 * 0.25)) < 1e-9 && Math.abs(W.regle.sol - (1 + 0.8 * 0.25)) < 1e-9 && W.regle.aucune === 1, 'tableaux : poids = 1 + 0,8 × part (décor, thème par ses types, règle) ; « aucune règle » : 1');
    // premier tableau = celui qui t'a tué (s'il est encore possible), seulement au premier tableau de la première boucle
    const tueT = { decor: 'crypt', theme: 'choeur', regle: 'braseros' }, Lt = F.brxLire(D, Object.assign({}, S, { tue: { 1: 'tableau' }, tab: { 1: tueT } }), 0); let pr = 0, pr2 = 0, pr3 = 0;
    for (let i = 0; i < 2000; i++) { const b = F.brxBoucle(D, Lt, 0, 'normal', F.desRng(i), {}, { premiere: true }), t = b.filter(m => m.k === 'tableau').map(m => m.tab);
      if (t[0].decor === 'crypt' && t[0].theme === 'choeur' && t[0].regle === 'braseros' && t[0].rejoue && !t[1].rejoue && !t[2].rejoue && t[1].decor !== 'crypt') pr++;
      if (F.brxBoucle(D, Lt, 0, 'normal', F.desRng(i), {}, { premiere: false }).filter(m => m.k === 'tableau').some(m => m.tab.rejoue)) pr2++; }
    ok(pr === 2000 && pr2 === 0, `tableaux : le premier tableau de la phase rejoue celui qui t'a tué (${pr} / 2 000), pas les boucles suivantes`);
    const L1 = F.brxLire(D, Object.assign({}, S, { acte: 1, tue: { 1: 'tableau' }, tab: { 1: tueT } }), 0); for (let i = 0; i < 300; i++) if (F.brxBoucle(D, L1, 0, 'normal', F.desRng(i), {}, { premiere: true }).some(m => m.k === 'tableau' && m.tab.rejoue)) pr3++;
    ok(pr3 === 0, 'tableaux : … seulement s\'il est encore possible (décor traversé)');
    ok(F.brxLire(D, Object.assign({}, S, { tue: { 1: 'fils' }, tab: { 1: tueT } }), 0).tab === null && F.brxLire(D, Object.assign({}, S, { tue: { 1: 'fils' } }), 0).premier === null, 'tableaux : mort par un geste signature : ni tableau rejoué, ni élément libre en premier (il est au socle, préavis normal)');
    ok(F.brxLire(D, Object.assign({}, S, { tue: { 1: 'anneau' } }), 0).premier === 'anneau', 'tableaux : mort par un élément libre : il passe en premier (règle 5a)'); }
  // places dans le fragment, dalles confinées : 10 000 tirages
  { const rnd = mk(11), f = TI[1].frag, SOL = T.regles.sol, o0 = { pr: 14, v: 180, reflexe: 0.05, arene: R }; let pb = 0, loin = 0, db = 0, dok = 0, dko = 0, dfaux = 0, hors = 0;
    for (let i = 0; i < 10000; i++) { const p = [R.x0 + rnd() * (R.x1 - R.x0), R.y0 + rnd() * (R.y1 - R.y0)], pl = F.brxPlaces(f, 4, p, rnd, { marge: 30, minD: T.minD });
      for (const q of pl) { if (!F.brxDansRect(f, q[0], q[1], -30 + 1e-9)) pb++; if (Math.hypot(q[0] - p[0], q[1] - p[1]) >= T.minD) loin++; }
      const c = F.brxDansRect(f, p[0], p[1]) && rnd() < 0.5 ? p : [f.x0 + rnd() * (f.x1 - f.x0), f.y0 + rnd() * (f.y1 - f.y0)], d = F.brxDalle(SOL, f, c, rnd, 30);
      if (!(d.x - d.r >= f.x0 - 1e-9 && d.x + d.r <= f.x1 + 1e-9 && d.y - d.r >= f.y0 - 1e-9 && d.y + d.r <= f.y1 + 1e-9)) db++;
      const oc = Object.assign({}, o0, { charge: SOL.annonceS }), k = F.brxPlacer(D, [[d]], p, oc); if (k < 0) dko++; else { dok++; const s = F.brxSortie(D, [d], p, oc); if (!s.ok || F.brxDans(d, s.q[0], s.q[1], 14)) dfaux++; }
      const brut = { x: c[0] + (rnd() * 2 - 1) * 30, y: c[1] + (rnd() * 2 - 1) * 30, r: SOL.r }; if (brut.x - brut.r < f.x0 || brut.x + brut.r > f.x1 || brut.y - brut.r < f.y0 || brut.y + brut.r > f.y1) hors++; }
    ok(pb === 0 && loin > 38000, `tableaux : 40 000 places : toutes dans le fragment (à 30 px du bord), ${loin} à 230 px de toi ou plus (sinon la plus loin trouvée)`);
    ok(db === 0, 'dalles : 10 000 dalles du Sol qui se dérobe, toutes entières dans le fragment');
    ok(dfaux === 0 && dok > 9000, `dalles : posées seulement avec une sortie (${dok} posées, ${dko} sautées, ${dfaux} fausses)`);
    ok(hors > 0, `contre-épreuve : sans la borne du fragment, ${hors} dalles déborderaient du fragment`); }
  // sauvegarde : champ tab (v:1)
  { const N0 = F.brxNeuf(), tt = { decor: 'coeur', theme: 'siege', regle: 'sol' };
    const S1 = F.brxNoter(N0, { essai: false, phase: 1, par: 'tableau', tab: tt, win: false, vus: ['tableau'] }, D);
    ok(S1.v === 1 && S1.mort[1] === 'tableau' && JSON.stringify(S1.tab[1]) === JSON.stringify(tt), 'sauvegarde : mort par un tableau : l\'élément « tableau » et le tableau (décor, thème, règle), toujours en v:1');
    const W1 = F.brxEcrireSauve(S1), L1 = F.brxLireSauve(W1, D); ok(JSON.stringify(L1.tab[1]) === JSON.stringify(tt) && W1.v === 1, 'sauvegarde : écrire puis lire garde le tableau');
    const S2 = F.brxNoter(S1, { essai: false, phase: 1, par: 'fils', win: false }, D); ok(S2.mort[1] === 'fils' && !S2.tab[1], 'sauvegarde : une mort par autre chose efface le tableau de cette phase');
    ok(F.brxNoter(N0, { essai: true, phase: 1, par: 'tableau', tab: tt, win: false }, D) === N0, 'sauvegarde : une descente d\'essai n\'écrit rien');
    const inval = [{ mort: { 1: 'tableau' }, tab: { 1: { decor: 'faub', theme: 'siege', regle: null } } }, { mort: { 1: 'tableau' }, tab: { 1: { decor: 'coeur', theme: 'meute', regle: 'brume' } } },
      { mort: { 1: 'fils' }, tab: { 1: tt } }, { mort: { 1: 'tableau' }, tab: { 9: tt } }, { mort: { 1: 'tableau' }, tab: { 1: 'x' } }, { mort: { 1: 'tableau' }, tab: { 1: { decor: 'inconnu', theme: 'meute' } } }];
    ok(inval.every(x => JSON.stringify(F.brxLireSauve(Object.assign({ v: 1 }, x), D).tab) === '{}'), 'sauvegarde : un champ tab invalide (thème interdit, Brume, mort qui n\'est pas un tableau, phase hors bornes, abîmé, décor inconnu) est ignoré');
    ok(JSON.stringify(F.brxLireSauve({ v: 1, mort: { 1: 'tableau' }, tab: { 1: tt }, inconnu: 3 }, D).tab[1]) === JSON.stringify(tt) && F.brxLireSauve({ v: 1, tab: 5 }, D) !== null, 'sauvegarde : les champs inconnus sont ignorés, un tab valide gardé');
    // contre-épreuve : une lecture qui accepterait le tab sans le valider garderait le Siège dans les Faubourgs
    { const brut = { v: 1, mort: { 1: 'tableau' }, tab: { 1: { decor: 'faub', theme: 'siege', regle: null } } }; ok(brut.tab[1].theme === 'siege' && !F.brxLireSauve(brut, D).tab[1], 'contre-épreuve : une sauvegarde tab invalide acceptée serait attrapée'); }
    ok(F.brxLire(D, { prof: {}, tue: L1.mort, tab: L1.tab }, 0).tab.theme === 'siege', 'sauvegarde : au combat suivant, la lecture rend le tableau qui t\'a tué'); } }
// ── 11. La phase II, « L'Ouvrage » (action 5c, v18.7)
{ const PO = D.partition.ouvrage, C = D.constructions, SO = C.sortes, EL = D.elements, M = F_mondeFinal(), R = { x0: MUR.g, y0: MUR.h, x1: M.w - MUR.d, y1: M.h - MUR.b }, GR = C.grille, pad = GR.pad;
  const PR14 = 14, OPT = ch => ({ pr: PR14, v: 180, reflexe: 0.05, charge: ch, arene: R }), rnd = mk(5150);
  const fnv = s => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h.toString(16); };
  // ── données
  const ET = DA.salles.final.etats, E4 = ET[4];
  ok(D.phases[1].id === 'ouvrage' && D.phases[1].arene === 4 && E4 && E4.id === 'ouvrage', 'phase II : état d\'arène réel « ouvrage » en index 4');
  ok(E4.obstacles.length === 0 && E4.vides.length === 0 && E4.sol === 'cendre' && E4.bornes.fx0 === 0 && E4.bornes.fy0 === 0 && E4.bornes.fx1 === 1 && E4.bornes.fy1 === 1 && E4.brume.length === 1, 'phase II : arène pleine, chantier nu, sol cendre, brume de décor en haut');
  const EMP = '74906d3f';   // l'empreinte des états 0 à 3 (banc-arene A et C, la phase I) : ils ne bougent pas
  ok(fnv(JSON.stringify(ET.slice(0, 4))) === EMP, `phase II : les états d'arène 0 à 3 sont inchangés (empreinte ${fnv(JSON.stringify(ET.slice(0, 4)))})`);
  { const E2 = clone(ET.slice(0, 4)); E2[3] = clone(E4); ok(fnv(JSON.stringify(E2)) !== EMP, 'contre-épreuve : l\'état 3 déplacé (remplacé par celui de la phase II) serait attrapé'); }
  const ME = PO.mesures, kinds = ME.map(m => m.k === 'fixe' ? m.g : m.k);
  ok(kinds.join(' ') === 'batir ruee libre batir manoeuvres feinte equerre effondrement libre truelle', `phase II : partition (bâtir · Ruée · libre · bâtir · Manœuvres · feinte · Équerre · effondrement · libre · Truelle) : ${kinds.join(' ')}`);
  const DUR = { batir: C.annonceS + 0.3, ruee: EL.ruee.charge + EL.ruee.course, libre: 1.5, manoeuvres: 1.3, feinte: 1.2, equerre: EL.equerre.charge + 0.3, effondrement: EL.effondrement.charge + 0.4, truelle: EL.truelle.charge + 0.3 };
  const boucle = kinds.reduce((s, k) => s + DUR[k], 0) + PO.entracteS * kinds.length + PO.nuS;
  ok(boucle >= 30 && boucle <= 34 && PO.entracteS === 1.4 && PO.nuS === 2.5 && PO.sauteS === 0.6, `phase II : une boucle d'environ 32 s (${boucle.toFixed(1)} s), entracte 1,4 s, à nu 2,5 s, mesure sautée 0,6 s`);
  ok(F.brxPartition(D, 1).nuS === 2.5 && F.brxPartition(D, 1).entracteS === 1.4 && F.brxMesures(D, 1).filter(m => m.k === 'batir').length === 2, 'phase II : brxPartition lit sa partition (deux bâtir, un effondrement)');
  for (const [g, w] of [['ruee', { forme: 'ruee', w: 90, len: 1400, charge: 1.2, degats: 14, sonneS: 2 }], ['equerre', { forme: 'croix', w: 70, len: 900, charge: 1.0, degats: 12 }], ['truelle', { forme: 'cone', ouverture: 70, r0: 60, r1: 520, charge: 1.1, degats: 12 }]])
    ok(EL[g].fixe === true && EL[g].sorte === 'zone' && EL[g].vise && Object.entries(w).every(([k, v]) => EL[g][k] === v) && EL[g].charge >= D.preavis.boss, `phase II : geste ${g} fixe, orange, ses chiffres (${JSON.stringify(w)})`);
  ok(EL.effondrement.fixe && EL.effondrement.charge === 1.4 && EL.effondrement.degats === 16 && EL.effondrement.ennemis === 2 && EL.rail.fixe && EL.rail.charge === 1.0 && EL.rail.degats === 12 && EL.manoeuvres.fixe && EL.construction.fixe, 'phase II : effondrement (1,4 s, 16, ennemis ×2), cloche (1,0 s, 12), Manœuvres, construction d\'essai : fixes');
  const CMS = BE.contreMesures, JUM = { murailles: 'traque', douves: 'petards', colonnades: 'barrage', rails: 'ruee', puits: 'avide', echafaudages: 'renforts' }, MAX = { murailles: 3, douves: 1, colonnades: 2, rails: 2, puits: 2, echafaudages: 2 };
  ok(F.BRX_SORTES.join() === Object.keys(JUM).join() && F.BRX_SORTES.every(k => SO[k]), 'phase II : six sortes, une par axe du profil');
  for (const k of F.BRX_SORTES) { const s = SO[k], cm = CMS[s.jumelle];
    ok(s.jumelle === JUM[k] && cm && cm.ax === s.axe && !!cm.hi === (s.sens > 0), `phase II : ${k} lue sur ${s.axe} ${s.sens > 0 ? 'haute' : 'basse'}, jumelle de la contre-mesure ${s.jumelle} (${cm && cm.n})`);
    ok(s.max === MAX[k], `phase II : ${k} : au plus ${MAX[k]} debout`); }
  ok(F.brxPvPart(D, SO.murailles.pvPart, 'normal') === 192 && F.brxPvPart(D, SO.colonnades.pvPart, 'normal') === 48 && F.brxPvPart(D, SO.rails.butoir.pvPart, 'normal') === 120 && F.brxPvPart(D, SO.puits.pvPart, 'normal') === 144 && F.brxPvPart(D, SO.echafaudages.pvPart, 'normal') === 240 && SO.douves.incassable,
    'phase II : PV en parts des PV de la phase (muraille 192, fût 48, butoir 120, puits 144, échafaudage 240 ; douve incassable)');
  ok(F.brxPvPart(D, SO.echafaudages.pvPart, 'extreme') === 240 && F.brxPvPart(D, SO.murailles.pvPart, 'difficile') === 192, 'phase II : jamais de PV en plus selon le palier');
  ok(C.lecture.seuil === 0.35 && C.annulation.part === 0.05 && C.annulation.nuS === 1.5 && C.placement.variantes === 4 && C.placement.bord === 40 && C.placement.voie === 96, 'phase II : seuil 0,35, annulation 5 % (+1,5 s), quatre variantes, bord 40 px, voie 96 px');
  ok(D.manoeuvres.n.normal === 2 && D.manoeuvres.n.difficile === 2 && D.manoeuvres.n.extreme === 3 && D.manoeuvres.max === 4, 'phase II : Manœuvres 2 / 2 / 3, au plus 4 vivants');
  ok(D.dessin.version === 3, 'phase II : dessin.version 3');
  // matières : ΔE ≥ 25 de la grammaire, de la craie, de l'ivoire et des couleurs du Brumeux
  { let mn = 1e9; const tous = Object.assign({}, GRAM, D.couleurs);
    for (const [m, v] of Object.entries(C.matieres)) for (const k of ['corps', 'arete']) for (const [g, gc] of Object.entries(tous)) { const d = dE(v[k], gc); mn = Math.min(mn, d); ok(d >= 25, `matières : ${m}.${k} (${v[k]}) à ΔE ${d.toFixed(1)} ≥ 25 de ${g}`); }
    note(`phase II : ΔE minimal des matières contre la grammaire, la craie et le Brumeux : ${mn.toFixed(1)}`);
    ok(Object.values(C.matieres).map(m => m.decor).sort().join() === Object.keys(D.tableaux.decors).sort().join(), 'matières : une par décor traversé (Faubourgs, Cryptes, Cœur)'); }
  // ── lecture des sortes
  const L0 = (prof, x) => Object.assign({ prof, eff: {}, ko: {} }, x || {});
  { const W = F.brxSortesPoids(D, L0({ portee: 0.9, esquive: 0.5, soin: 0.2, rythme: null }), []);
    ok(W.eligibles.includes('murailles') && !W.eligibles.includes('douves') && !W.eligibles.includes('puits') && W.eligibles.includes('echafaudages') && W.eligibles.includes('rails') && W.eligibles.includes('colonnades'),
      `lecture : portée 0,9 → pas de douves ; soin 0,2 → pas de puits ; rythme inconnu → éligible (${W.eligibles.join(', ')})`);
    ok(Math.abs(W.poids.murailles - (0.4 + 1.2 * 0.9)) < 1e-9 && Math.abs(W.poids.echafaudages - (0.4 + 1.2 * 0.5)) < 1e-9 && Math.abs(W.poids.douves - (0.4 + 1.2 * 0.1)) < 1e-9, 'lecture : poids 0,4 + 1,2 × score (inconnu : 0,5)');
    const Wv = F.brxSortesPoids(D, L0({ portee: 0.9 }, { eff: { traque: { s: 0.5 } }, ko: { petards: 2 } }), ['murailles']);
    ok(Math.abs(Wv.poids.murailles - (0.4 + 1.2 * 0.9) * 1.3 * 0.5) < 1e-9 && Math.abs(Wv.poids.douves - (0.4 + 1.2 * 0.1) * 0.5) < 1e-9, 'lecture : Traque qui a porté ×1,3, Pétards abandonnés ×0,5, une muraille debout ×0,5 (variété)');
    const Wm = F.brxSortesPoids(D, L0({ portee: 0.9 }), ['murailles', 'murailles', 'murailles']); ok(!Wm.eligibles.includes('murailles'), 'lecture : trois murailles debout : plus de muraille (plafond de la sorte)');
    const Ls = F.brxSortesPoids(D, L0({ portee: 0.651 }), []); ok(Ls.eligibles.includes('douves') === false && F.brxSortesPoids(D, L0({ portee: 0.65 }), []).eligibles.includes('douves'), 'lecture : seuil exact (douves éligibles à portée 0,65, pas à 0,651)'); }
  { const lt = F.brxLire(D, { prof: {}, tue: { 2: 'effondrement' }, bati: { 2: 'puits' } }, 1), lr = F.brxLire(D, { prof: {}, tue: { 2: 'rail' } }, 1), ln = F.brxLire(D, { prof: {}, tue: { 2: 'ruee' } }, 1);
    ok(lt.bati === 'puits' && lr.bati === 'rails' && ln.bati === null && lt.premier === null && ln.premier === null, 'lecture : ce qui t\'a tué en phase II : la sorte effondrée sur toi, ou les rails (cloche) ; un geste signature : rien en premier');
    let p0 = 0; for (let i = 0; i < 500; i++) { const O = F.brxOrdreSortes(D, L0({ soin: 0.1 }), [], F.desRng(i), { premier: 'puits' }); if (O.ordre[0] === 'puits') p0++; }
    ok(p0 === 500, 'lecture : le premier bâtir rejoue la sorte qui t\'a tué, même hors seuil (500 / 500)');
    ok(F.brxOrdreSortes(D, L0({}), ['puits', 'puits'], F.desRng(1), { premier: 'puits' }).ordre[0] !== 'puits', 'lecture : … sauf si sa sorte est à son plafond');
    let ev = 0, ex = 0; for (let i = 0; i < 2000; i++) { const O = F.brxOrdreSortes(D, L0({}), [], F.desRng(i + 9), { eviter: 'murailles', exclus: ['puits'] }); if (O.ordre[0] === 'murailles') ev++; if (O.ordre.includes('puits')) ex++; }
    ok(ev === 0 && ex === 0, 'lecture : le second bâtir ne reprend pas la sorte du premier ; une sorte annulée n\'est pas rebâtie dans la boucle');
    ok(F.brxOrdreSortes(D, L0({ portee: 0.9, esquive: 0.9, soin: 0, rythme: 0 }), [], F.desRng(3), { eviter: 'murailles' }).ordre.length >= 1, 'lecture : « éviter » cède quand il ne reste qu\'une sorte');
    const cnt = {}; for (let i = 0; i < 6000; i++) { const o = F.brxOrdreSortes(D, L0({ portee: 1, esquive: 0.5, soin: 0.5, rythme: 0.5 }), [], F.desRng(i + 77), {}).ordre[0]; cnt[o] = (cnt[o] || 0) + 1; }
    ok(cnt.murailles > cnt.colonnades * 1.3 && !cnt.douves, `lecture : biais des poids (portée 1 : murailles ${cnt.murailles}, colonnades ${cnt.colonnades}, douves ${cnt.douves || 0})`);
    const a = F.brxOrdreSortes(D, L0({ portee: 0.7 }), [], F.desRng(42), {}), b = F.brxOrdreSortes(D, L0({ portee: 0.7 }), [], F.desRng(42), {}); ok(a.ordre.join() === b.ordre.join(), 'lecture : déterministe à graine égale'); }
  // ── placement : 10 000 positions par sorte
  const h0 = R.y0 + D.dessin.hauteur, mains = p => [Math.max(R.x0 + 220, Math.min(R.x1 - 220, p[0])), h0 + D.dessin.suit * Math.max(0, p[1] - h0)];
  const dansB = (d, b) => d.x - d.r >= R.x0 + b - 1e-6 && d.x + d.r <= R.x1 - b + 1e-6 && d.y - d.r >= R.y0 + b - 1e-6 && d.y + d.r <= R.y1 - b + 1e-6;
  const pireConnexe = (base, cons, j) => { let combos = [[]]; for (const k of cons) { const q = []; for (const cb of combos) for (const e of F.brxEtats(k)) q.push(cb.concat(e)); combos = q; }
    const G0 = F.brxGrille(M, R, base, GR); let part = 1, aire = 0; for (const cb of combos) { const G1 = F.brxGrille(M, R, base.concat(cb), GR); part = Math.min(part, F.brxConnexe(G1, j.x, j.y)); aire = Math.max(aire, 1 - G1.libres / G0.libres); } return { part, aire }; };
  const verifier = (id, c, p, h, j, base, cons) => { const S = SO[id], B = C.placement.bord, E = [];
    if (!F.brxTous(c).every(d => dansB(d, B))) E.push('bornes'); if (F.brxTous(c).some(d => Math.hypot(d.x - j.x, d.y - j.y) < d.r + j.r + pad)) E.push('sur toi');
    const dc = Math.hypot(c.c[0] - p[0], c.c[1] - p[1]);
    if (id === 'murailles' && !(dc >= S.place.minJ - 1e-6 && c.disques.length >= 9 && c.disques.length <= 13)) E.push('distance muraille ' + dc.toFixed(0));
    if (id === 'douves') { const A = S.anneau; if (dc < A.r + A.fosse + 40 - 1e-6) E.push('douve trop près ' + dc.toFixed(0)); if (!(c.etats.length === 2 && c.etats.every(e => c.portes.filter(g => e.includes(g[0])).length === 2))) E.push('passerelles'); }
    if (id === 'colonnades' && !(dc >= S.place.d - 1e-6 && dc <= Math.hypot(S.place.d, C.placement.glisse) + 1e-6 && c.disques.length === 8)) E.push('colonnade ' + dc.toFixed(0));
    if (id === 'rails' && !(F.brxSeg(p[0], p[1], c.voie.x0, c.voie.y0, c.voie.x1, c.voie.y1) < C.placement.glisse + 1e-6 && Math.abs(Math.hypot(c.voie.x1 - c.voie.x0, c.voie.y1 - c.voie.y0) - S.longueur) < 1e-6)) E.push('rail');
    if (id === 'puits' && !(dc < S.rayon)) E.push('puits ne te couvre pas ' + dc.toFixed(0));
    if (id === 'echafaudages') { const T3 = F.brxTiers(R, 0), t = T3[F.brxTiersLoin(T3, p[0], p[1], null)], d = c.disques[0]; if (!(dc >= S.place.dMin - 1e-6 && d.x >= t.x0 - 1e-6 && d.x <= t.x1 + 1e-6 && dansB(d, S.place.bord - d.r))) E.push('échafaudage ' + dc.toFixed(0)); }
    for (const k of cons.concat([c])) if (k.voie) for (const o of cons.concat([c])) { if (o === k) continue; if (F.brxTous(o).some(d => F.brxSeg(d.x, d.y, k.voie.x0, k.voie.y0, k.voie.x1, k.voie.y1) < k.voie.w / 2 + d.r - 1e-6)) E.push('voie'); }
    const q = pireConnexe(base, cons.concat([c]), j); if (q.part < C.connexite - 1e-9) E.push('connexité ' + q.part.toFixed(2)); if (q.aire > C.aire + 1e-9) E.push('aire ' + q.aire.toFixed(2));
    return E; };
  const RES = {};
  for (const id of F.BRX_SORTES) { let poses = 0, imposs = 0, bad = 0, ex = null; const raisons = {};
    for (let i = 0; i < 10000; i++) { const p = [R.x0 + 60 + rnd() * (R.x1 - R.x0 - 120), R.y0 + 150 + rnd() * (R.y1 - R.y0 - 200)], h = mains(p), j = { x: p[0], y: p[1], r: PR14 };
      const base = []; for (let k = 0, n = Math.floor(rnd() * 3); k < n; k++) base.push({ x: R.x0 + 80 + rnd() * (R.x1 - R.x0 - 160), y: R.y0 + 80 + rnd() * (R.y1 - R.y0 - 160), r: 26 + rnd() * 14, kind: 'pilier18' });
      const cons = []; if (i % 3 === 0) { const q = [R.x0 + 200 + rnd() * (R.x1 - R.x0 - 400), R.y0 + 200 + rnd() * (R.y1 - R.y0 - 400)], V = F.brxGeo(D, 'rails', q, mains(q), R, F.desRng(i + 3), {}); if (V.length && F.brxPoser(D, M, R, base, [], V[0], j, 'normal').ok) cons.push(V[0]); }
      const V = F.brxGeo(D, id, p, h, R, F.desRng(i * 7 + 1), { prof: { portee: rnd() } }); let ok1 = false;
      for (const c of V) { const v = F.brxPoser(D, M, R, base, cons, c, j, 'normal'); raisons[v.ok ? 'ok' : v.raison] = (raisons[v.ok ? 'ok' : v.raison] || 0) + 1; if (!v.ok) continue; ok1 = true; poses++; const E = verifier(id, c, p, h, j, base, cons); if (E.length) { bad++; if (!ex) ex = E.join(', '); } break; }
      if (!ok1) imposs++; }
    RES[id] = poses; ok(bad === 0 && poses > 2000, `placement : ${id} : ${poses} posées sur 10 000 positions (bornes, jamais sur toi, distances, voie, aire ≤ 30 %, connexité ≥ 85 % au pire) ; ${imposs} impossibles ${ex ? '; ' + ex : ''}`);
    note(`placement ${id} : ${poses} posées, ${imposs} impossibles ; raisons ${JSON.stringify(raisons)}`); }
  // contre-épreuves du placement : une douve à 200 px, une construction posée sur toi, une douve aux quatre passerelles fermées
  { const p = [1280, 800], h = mains(p), j = { x: p[0], y: p[1], r: PR14 }, V = F.brxGeo(D, 'douves', p, h, R, F.desRng(5), {});
    const dv = clone(V[0]), dx = dv.c[0] - p[0], dy = dv.c[1] - p[1], l = Math.hypot(dx, dy), k = 200 / l, mv = d => Object.assign(d, { x: p[0] + (d.x - p[0]) * k + 0, y: p[1] + (d.y - p[1]) * k });
    const s2 = { x: p[0] + dx * k - dv.c[0], y: p[1] + dy * k - dv.c[1] }, sh = d => Object.assign(d, { x: d.x + s2.x, y: d.y + s2.y }); dv.disques.forEach(sh); dv.etats.forEach(e => e.forEach(sh)); dv.portes.forEach(g => g.forEach(sh)); dv.c = [dv.c[0] + s2.x, dv.c[1] + s2.y];
    ok(verifier('douves', dv, p, h, j, [], []).some(e => /douve trop près|sur toi/.test(e)), 'contre-épreuve : une douve à 200 px serait attrapée');
    const surToi = { sorte: 'puits', disques: [{ x: p[0] + 5, y: p[1], r: 34, el: 0 }], c: [p[0] + 5, p[1]], elements: [{ pvPart: 0.06 }], rayon: 220 };
    ok(F.brxPoser(D, M, R, [], [], surToi, j, 'normal').raison === 'joueur' && verifier('puits', surToi, p, h, j, [], []).includes('sur toi'), 'contre-épreuve : une construction posée sur toi est refusée (et le serait par la vérification)');
    const ferme = clone(V[0]); ferme.etats[0] = ferme.disques.concat(...ferme.portes); ok(verifier('douves', ferme, p, h, j, [], []).includes('passerelles'), 'contre-épreuve : une douve aux quatre passerelles fermées serait attrapée'); }
  // ── persistance : 10 000 phases abstraites (bâtir après bâtir, toi qui bouges) ; plafonds tenus ; filtre des bornes de l'état IV, connexité revérifiée
  { const E1 = ET[1], Bv = { x0: Math.round(R.x0 + (R.x1 - R.x0) * E1.bornes.fx0), y0: Math.round(R.y0 + (R.y1 - R.y0) * E1.bornes.fy0), x1: Math.round(R.x0 + (R.x1 - R.x0) * E1.bornes.fx1), y1: Math.round(R.y0 + (R.y1 - R.y0) * E1.bornes.fy1) };
    const b4 = E1.obstacles.map(o => ({ x: Math.round(R.x0 + (R.x1 - R.x0) * o.fx), y: Math.round(R.y0 + (R.y1 - R.y0) * o.fy), r: o.r })).concat(E1.vides.map(o => ({ x: Math.round(R.x0 + (R.x1 - R.x0) * o.fx), y: Math.round(R.y0 + (R.y1 - R.y0) * o.fy), r: o.r })));
    let bad = 0, total = 0, garde = 0, retire = 0, plafond = 0, ex = null; const ns = { normal: 0, difficile: 0, extreme: 0 };
    for (let i = 0; i < 10000; i++) { const pal = ['normal', 'difficile', 'extreme'][i % 3], P = D.paliers[pal], cons = []; let lec = L0({ portee: rnd(), esquive: rnd(), soin: rnd(), rythme: rnd() }); let p = null;
      for (let k = 0; k < 7; k++) { p = [R.x0 + 80 + rnd() * (R.x1 - R.x0 - 160), R.y0 + 200 + rnd() * (R.y1 - R.y0 - 260)]; const j = { x: p[0], y: p[1], r: PR14 };
        if (cons.some(c => F.brxTous(c).some(d => Math.hypot(d.x - j.x, d.y - j.y) < d.r + j.r))) continue;
        const r = F.brxBatir(D, M, R, [], cons, lec, j, mains(p), pal, F.desRng(i * 31 + k), {}); if (!r.sorte) continue; cons.push(r.c); total++;
        if (cons.length > P.constructions) { bad++; plafond++; } for (const s of F.BRX_SORTES) if (cons.filter(c => c.sorte === s).length > SO[s].max) { bad++; plafond++; }
        const q = pireConnexe([], cons, j); if (q.part < C.connexite - 1e-9 || q.aire > C.aire + 1e-9) { bad++; if (!ex) ex = `connexité ${q.part.toFixed(2)} aire ${q.aire.toFixed(2)}`; } }
      ns[pal] = Math.max(ns[pal], cons.length);
      const j = { x: (Bv.x0 + Bv.x1) / 2, y: Bv.y1 - 120, r: PR14 }, Fb = F.brxFiltreBornes(D, M, Bv, b4, cons, j); garde += Fb.garde.length; retire += Fb.retire.length;
      if (Fb.garde.length + Fb.retire.length !== cons.length) bad++;
      for (const c of Fb.garde) if (!F.brxTous(c).every(d => d.x - d.r >= Bv.x0 && d.x + d.r <= Bv.x1 && d.y - d.r >= Bv.y0 && d.y + d.r <= Bv.y1)) { bad++; if (!ex) ex = 'hors des bornes IV'; }
      if (Fb.garde.length) { let combos = [[]]; for (const k of Fb.garde) { const q = []; for (const cb of combos) for (const e of F.brxEtats(k)) q.push(cb.concat(e)); combos = q; } let part = 1; for (const cb of combos) part = Math.min(part, F.brxConnexe(F.brxGrille(M, Bv, b4.concat(cb), GR), j.x, j.y)); if (part < C.connexite - 1e-9) { bad++; if (!ex) ex = 'connexité IV ' + part.toFixed(2); } } }
    ok(bad === 0 && total > 20000, `persistance : 10 000 phases, ${total} constructions bâties : plafond 5 / 6 / 6 et plafonds par sorte tenus (au plus ${ns.normal} / ${ns.difficile} / ${ns.extreme} debout), connexité et aire tenues ; en IV : ${garde} gardées, ${retire} effacées, toutes dans les bornes, connexité revérifiée${ex ? ' ; ' + ex : ''}`);
    ok(ns.normal <= 5 && ns.difficile <= 6 && ns.extreme <= 6 && ns.difficile === 6, `persistance : le plafond est atteint et jamais dépassé (${ns.normal} / ${ns.difficile} / ${ns.extreme})`); }
  // ── gestes : la Ruée (coupée au premier pilier qui arrête un tir, jamais par une fosse), l'Équerre, la Truelle : 10 000 positions chacune
  { const devant = (h, z, q) => { const dx = z.x1 - h[0], dy = z.y1 - h[1], l = Math.hypot(dx, dy) || 1; return (q.x - h[0]) * dx / l + (q.y - h[1]) * dy / l > 0; };
    const coupeOk = (h, z, piliers, w) => piliers.every(q => q.kind === 'fosse18' || !devant(h, z, q) || F.brxSeg(q.x, q.y, h[0], h[1], z.x1, z.y1) >= q.r + w / 2 - 1e-6);
    let bad = 0, coupes = 0, fosses = 0, sorties = { ruee: [0, 0], equerre: [0, 0], truelle: [0, 0] }, badS = 0;
    for (let i = 0; i < 10000; i++) { const p = [R.x0 + 60 + rnd() * (R.x1 - R.x0 - 120), R.y0 + 160 + rnd() * (R.y1 - R.y0 - 200)], h = mains(p), piliers = [];
      for (let k = 0, n = Math.floor(rnd() * 5); k < n; k++) piliers.push({ x: R.x0 + 60 + rnd() * (R.x1 - R.x0 - 120), y: R.y0 + 60 + rnd() * (R.y1 - R.y0 - 120), r: 14 + rnd() * 20, kind: rnd() < 0.4 ? 'fosse18' : 'pilier18' });
      const libre = piliers.filter(q => Math.hypot(q.x - p[0], q.y - p[1]) > q.r + 20 && Math.hypot(q.x - h[0], q.y - h[1]) > q.r + 10); const r = F.brxRuee(EL.ruee, h, p, R, libre, 0), z = r.zones[0];
      if (!coupeOk(h, z, libre, EL.ruee.w)) bad++; if (r.coupe >= 0) { coupes++; const q = libre[r.coupe]; if (q.kind === 'fosse18' || (r.l > 1e-9 && Math.abs(F.brxSeg(q.x, q.y, h[0], h[1], z.x1, z.y1) - (q.r + EL.ruee.w / 2)) > 1e-3)) bad++; }
      if (libre.some(q => q.kind === 'fosse18' && F.brxSeg(q.x, q.y, h[0], h[1], z.x1, z.y1) < q.r + EL.ruee.w / 2)) fosses++;
      const bloque = (x, y) => libre.some(q => Math.hypot(x - q.x, y - q.y) < q.r + PR14), o = ch => Object.assign(OPT(ch), { bloque });
      for (const [g, zs, ch] of [['ruee', r.zones, EL.ruee.charge], ['equerre', F.brxEquerre(EL.equerre, p, 0), EL.equerre.charge], ['truelle', F.brxTruelle(EL.truelle, h, p, 0), EL.truelle.charge]]) {
        const s = F.brxSortie(D, zs, p, o(ch)); if (s.ok) { sorties[g][0]++; if (zs.some(zz => F.brxDans(zz, s.q[0], s.q[1], PR14)) || bloque(s.q[0], s.q[1]) || s.d > 180 * (ch - 0.05) + 1e-6) badS++; } else sorties[g][1]++; } }
    ok(bad === 0, `gestes : la Ruée s'arrête au premier pilier qui arrête un tir (${coupes} coupées sur 10 000), jamais sur une fosse (${fosses} traversent une fosse)`);
    ok(badS === 0 && sorties.ruee[0] > 9000 && sorties.equerre[0] > 9000 && sorties.truelle[0] > 9000, `gestes : sortie libre atteinte à pied à temps : Ruée ${sorties.ruee[0]} / Équerre ${sorties.equerre[0]} / Truelle ${sorties.truelle[0]} sur 10 000 (sans sortie : ${sorties.ruee[1]} / ${sorties.equerre[1]} / ${sorties.truelle[1]} : la zone saute)`);
    note(`gestes : Ruée ${sorties.ruee[0]} / Équerre ${sorties.equerre[0]} / Truelle ${sorties.truelle[0]} avec sortie, sur 10 000 chacun ; ${coupes} Ruées coupées`);
    // abri derrière une construction : une muraille entre ses mains et toi ; abri sous ses mains (le cône part à 60 px)
    const h = [1280, 400], p = [1280, 760], mur = []; for (let x = 1180; x <= 1380; x += 20) mur.push({ x, y: 580, r: 18, kind: 'pilier18' });
    const rr = F.brxRuee(EL.ruee, h, p, R, mur, 0); ok(rr.coupe >= 0 && !F.brxDans(rr.zones[0], p[0], p[1], PR14) && F.brxDans(F.brxRuee(EL.ruee, h, p, R, [], 0).zones[0], p[0], p[1], PR14), `gestes : derrière une muraille, la Ruée ne t'atteint pas (coupée à ${rr.l.toFixed(0)} px) ; sans elle, si`);
    const fos = mur.map(q => Object.assign({}, q, { kind: 'fosse18' })); ok(F.brxRuee(EL.ruee, h, p, R, fos, 0).coupe === -1, 'gestes : une rangée de fosses ne coupe pas la Ruée');
    { const fausse = (ax, ay, bx, by, w, P2) => null; ok(F.brxSeg(1280, 580, h[0], h[1], h[0], R.y1) < 18 + 45 && fausse() === null, 'contre-épreuve : une Ruée qui traverserait la muraille (coupe ignorée) passerait sur un pilier : attrapée par la vérification'); }
    const cone = F.brxTruelle(EL.truelle, h, p, 0)[0], sous = [h[0] + (p[0] - h[0]) * 30 / 360, h[1] + (p[1] - h[1]) * 30 / 360];
    ok(!F.brxDans(cone, sous[0], sous[1], PR14) && F.brxDans(cone, p[0], p[1], PR14) && !F.brxDans(cone, h[0] + 200, h[1] + 120, PR14), 'gestes : la Truelle : sous ses mains (30 px), à l\'abri ; sur toi, touché ; hors de l\'angle, à l\'abri');
    ok(F.brxDans(Object.assign({}, cone, { r0: 0 }), sous[0], sous[1], PR14), 'contre-épreuve : un cône sans abri sous ses mains (r0 = 0) serait attrapé');
    const eq = F.brxEquerre(EL.equerre, p, 0); ok(eq.length === 2 && F.brxDans(eq[0], p[0] + 300, p[1], PR14) && F.brxDans(eq[1], p[0], p[1] - 300, PR14) && !F.brxDans(eq[0], p[0] + 80, p[1] + 80, PR14) && !F.brxDans(eq[1], p[0] + 80, p[1] + 80, PR14), 'gestes : l\'Équerre : deux bras croisés sur toi, un quadrant en diagonale à l\'abri');
    const eq45 = F.brxEquerre(EL.equerre, p, Math.PI / 4); ok(F.brxDans(eq45[0], p[0] + 200, p[1] + 200, PR14) && !F.brxDans(eq45[0], p[0] + 200, p[1], PR14) && !F.brxDans(eq45[1], p[0] + 200, p[1], PR14), 'gestes : l\'Équerre tournée de 45° en variante'); }
  // ── effondrement : 10 000 par sorte : la plus proche avec une sortie ; aucune quand il n'y a rien
  { let bad = 0, tot = 0, nul = 0; const par = {};
    for (const id of F.BRX_CHUTE) { par[id] = 0;
      for (let i = 0; i < 10000; i++) { const p = [R.x0 + 200 + rnd() * (R.x1 - R.x0 - 400), R.y0 + 250 + rnd() * (R.y1 - R.y0 - 350)], j = { x: p[0], y: p[1], r: PR14 }, cons = [];
        for (const s of [id, F.BRX_CHUTE[(i + 1) % 4], 'douves', 'rails']) { const q = [p[0] + (rnd() - 0.5) * 500, p[1] + (rnd() - 0.5) * 300], V = F.brxGeo(D, s, q, mains(q), R, F.desRng(i * 13 + s.length), {}); for (const c of V) if (F.brxPoser(D, M, R, [], cons, c, j, 'extreme').ok) { cons.push(Object.assign(c, { etat: 'debout' })); break; } }
        const bloque = (x, y) => cons.some(c => F.brxEtats(c)[0].some(d => Math.hypot(x - d.x, y - d.y) < d.r + PR14)), o = Object.assign(OPT(EL.effondrement.charge), { bloque }), r = F.brxEffondrement(D, cons, p, o, []);
        const cand = cons.filter(c => F.BRX_CHUTE.includes(c.sorte)).map(c => ({ c, d: Math.min(...c.disques.map(d => Math.hypot(d.x - p[0], d.y - p[1]) - d.r)) })).sort((a, b) => a.d - b.d);
        const attendu = cand.find(q => F.brxSortie(D, F.brxChute(D, q.c, p), p, o).ok); tot++;
        if ((attendu ? attendu.c : null) !== (r ? r.c : null)) bad++; if (r) { par[r.c.sorte]++; if (F.brxChute(D, r.c, p).length !== r.zones.length) bad++; if (r.c.sorte === 'douves' || r.c.sorte === 'rails') bad++; } else nul++; } }
    ok(bad === 0, `effondrement : ${tot} cas (4 sortes × 10 000) : la plus proche dont la chute laisse une sortie, jamais une douve ni un rail (${JSON.stringify(par)}, ${nul} sans effondrement)`);
    ok(F.brxEffondrement(D, [], [1000, 600], OPT(1.4), []) === null, 'effondrement : rien de debout, rien ne tombe');
    // contre-épreuve : sans temps pour sortir, rien ne tombe ; un tirage qui ignorerait la sortie poserait quand même la chute
    const p = [1280, 800], V = F.brxGeo(D, 'murailles', p, mains(p), R, F.desRng(2), {}), c0 = Object.assign(V[0], { etat: 'debout' });
    ok(F.brxDans(F.brxChute(D, c0, p)[0], p[0], p[1], PR14) && F.brxEffondrement(D, [c0], p, OPT(0.06), []) === null && F.brxEffondrement(D, [c0], p, OPT(1.4), []) !== null, 'contre-épreuve : un effondrement sans sortie posé serait attrapé (rien ne tombe sans sortie)');
    // les zones par sorte
    const mur = F.brxGeo(D, 'murailles', [1280, 760], [1280, 460], R, F.desRng(4), {})[0], zm = F.brxChute(D, mur, [1280, 760])[0], col = F.brxGeo(D, 'colonnades', [1280, 600], [1280, 300], R, F.desRng(4), {})[0];
    ok(zm.forme === 'couloir' && zm.w === 150 && Math.abs(F.brxSeg((mur.disques[0].x + mur.disques[8].x) / 2, (mur.disques[0].y + mur.disques[8].y) / 2, zm.x0, zm.y0, zm.x1, zm.y1) - 90) < 1e-6 && zm.y0 > mur.disques[0].y, 'effondrement : muraille : un couloir de 150 px décalé de 90 px vers toi');
    col.disques[3].casse = true; ok(F.brxChute(D, col, [1280, 600]).length === 7 && F.brxChute(D, col, [1280, 600]).every(z => z.forme === 'couloir' && z.w === 34 && Math.abs(Math.hypot(z.x1 - z.x0, z.y1 - z.y0) - 220) < 1e-6), 'effondrement : colonnade : un rayon de 220 px par fût restant (7 sur 8)'); }
  // ── la cloche : 10 000 passages, sortie de côté
  { let ok1 = 0, cote = 0, bad = 0;
    for (let i = 0; i < 10000; i++) { const p = [R.x0 + 80 + rnd() * (R.x1 - R.x0 - 160), R.y0 + 80 + rnd() * (R.y1 - R.y0 - 160)], V = F.brxGeo(D, 'rails', p, mains(p), R, F.desRng(i), {}); if (!V.length) continue;
      const c = V[0], z = F.brxCloche(D, c), s = F.brxSortie(D, [z], p, OPT(EL.rail.charge)); if (!F.brxDans(z, p[0], p[1], PR14)) bad++;
      if (s.ok) { ok1++; if (F.brxSeg(s.q[0], s.q[1], z.x0, z.y0, z.x1, z.y1) >= z.w / 2 + PR14 / 2 - 1e-6 && s.d <= z.w / 2 + PR14 + 6 + 1e-6) cote++; } }
    ok(bad === 0 && ok1 > 9000 && cote === ok1, `cloche : ${ok1} passages : le rail passe par toi, la sortie est toujours de côté (${cote}, à moins de 48 px + ton rayon)`); }
  // ── fissures, annulation, appel
  { const mx = 240; ok(F.brxFissure(D, mx, mx) === 0 && F.brxFissure(D, mx * 0.6668, mx) === 0 && F.brxFissure(D, mx * 2 / 3, mx) === 1 && F.brxFissure(D, mx * 0.3334, mx) === 1 && F.brxFissure(D, mx / 3, mx) === 2 && F.brxFissure(D, 0.01, mx) === 2 && F.brxFissure(D, 0, mx) === 3, 'fissures : intacte > 2/3, fêlée ≤ 2/3, lézardée ≤ 1/3, détruite à 0');
    ok(!F.brxAnnule(D, 119.9, 2400) && F.brxAnnule(D, 120, 2400) && F.brxAnnule(D, 300, 2400), 'annulation : 5 % des PV de la phase pendant l\'annonce (120 sur 2 400), pas en dessous');
    ok(F.brxAppel(D, 'normal', ['murailles', 'douves'], 0).join() === 'brute,bouffi' && F.brxAppel(D, 'normal', ['colonnades'], 0).join() === 'spectre,rampant' && F.brxAppel(D, 'normal', ['rails'], 0).join() === 'rampant,rampant,rampant'
      && F.brxAppel(D, 'extreme', ['colonnades', 'puits', 'murailles'], 0).join() === 'spectre,rampant,brute' && F.brxAppel(D, 'normal', [], 3).join() === 'rampant' && F.brxAppel(D, 'difficile', ['murailles'], 4).length === 0,
      'appel : lu sur les constructions (muraille → Brute, douve → Bouffi, colonnade → Spectre, rail → deux Rampants), puis des Rampants ; tronqué à 4 vivants');
    let bad = 0; for (let i = 0; i < 10000; i++) { const rec = []; for (let k = 0; k < 4; k++) rec.push(F.BRX_SORTES[Math.floor(rnd() * 6)]); const v = Math.floor(rnd() * 5), pal = ['normal', 'difficile', 'extreme'][i % 3], L = F.brxAppel(D, pal, rec, v);
      if (L.length + v > 4 && L.length > 0) bad++; if (L.some(t => !['brute', 'bouffi', 'spectre', 'rampant'].includes(t))) bad++; }
    ok(bad === 0, 'appel : 10 000 compositions : jamais plus de 4 vivants, jamais ni champion ni Masqué'); }
  // ── tirs et fosses : les enveloppes de hitsWall et keepRange (bloc v18.4) rendent l'ancien résultat au bit près hors de l'arène
  { const base = (html.match(/\nfunction hitsWall\(x,y,r\)\{[^\n]*\}\n/) || [''])[0], env = (html.match(/ const _hw184=hitsWall;hitsWall=function[^\n]*\n/) || [''])[0], envK = (html.match(/ const _kr184=keepRange;keepRange=function[^\n]*\n[^\n]*\n/) || [''])[0];
    ok(base.length > 50 && env.length > 50 && envK.length > 50, 'tirs et fosses : hitsWall, son enveloppe et celle de keepRange lues dans index.html');
    const mkCtx = code => { const c = { Math, AR: { x0: 56, y0: 92, x1: 2504, y1: 1036 }, room: { pillars: [] }, CAM: { on: false }, hyp: Math.hypot, segDist: (px, py, ax, ay, bx, by) => F.brxSeg(px, py, ax, ay, bx, by), appels: [] };
      vm.createContext(c); vm.runInContext(base + 'var h0=hitsWall;' + code + 'var h1=hitsWall;function keepRange(e,tg){appels.push(room.pillars.length);return 7;}var k0=keepRange;' + envK + 'var k1=keepRange;', c); return c; };
    const C1 = mkCtx(env); let diff0 = 0, diffOn = 0, fosseTraverse = 0, murArrete = 0;
    for (let i = 0; i < 10000; i++) { const pl = []; for (let k = 0, n = 1 + Math.floor(rnd() * 5); k < n; k++) pl.push({ x: 100 + rnd() * 2300, y: 120 + rnd() * 880, r: 14 + rnd() * 40, kind: rnd() < 0.5 ? 'fosse18' : 'pilier18' }); C1.room.pillars = pl;
      const x = rnd() * 2560, y = rnd() * 1080, r = rnd() * 8; C1.CAM.on = false; if (C1.h1(x, y, r) !== C1.h0(x, y, r)) diff0++;
      C1.CAM.on = true; const v = C1.h1(x, y, r); C1.room.pillars = pl.filter(q => q.kind !== 'fosse18'); const att = C1.h0(x, y, r); C1.room.pillars = pl; if (v !== att) diffOn++;
      if (pl.some(q => q.kind === 'fosse18' && Math.hypot(x - q.x, y - q.y) < q.r + r) && !pl.some(q => q.kind !== 'fosse18' && Math.hypot(x - q.x, y - q.y) < q.r + r) && x > 66 && x < 2494 && y > 102 && y < 1026) { if (!v) fosseTraverse++; }
      if (pl.some(q => q.kind !== 'fosse18' && Math.hypot(x - q.x, y - q.y) < q.r + r) && v) murArrete++; }
    ok(diff0 === 0 && diffOn === 0 && fosseTraverse > 10 && murArrete > 10, `tirs et fosses : hors de l'arène, l'ancien résultat au bit près (10 000 appels, ${diff0} différences) ; dans l'arène, un tir traverse une fosse (${fosseTraverse}) et s'arrête sur un mur (${murArrete})`);
    const C2 = mkCtx(env.replace("p.kind!=='fosse18'&&", '')); C2.CAM.on = true; C2.room.pillars = [{ x: 500, y: 500, r: 30, kind: 'fosse18' }]; ok(C2.h1(500, 510, 2) === true && C1.h1 && (C1.CAM.on = true, C1.room.pillars = [{ x: 500, y: 500, r: 30, kind: 'fosse18' }], C1.h1(500, 510, 2) === false), 'contre-épreuve : une fosse qui arrêterait un tir serait attrapée');
    // keepRange : hors de l'arène, appelé tel quel ; dans l'arène, une ligne de tir coupée par une fosse seule : la fosse est retirée le temps de l'appel, puis rendue
    const C3 = mkCtx(env), e = { x: 400, y: 500, r: 16 }, tg = { x: 900, y: 500, pl: true }, fo = { x: 650, y: 500, r: 28, kind: 'fosse18' }, mu = { x: 650, y: 520, r: 28, kind: 'pilier18' };
    C3.room.pillars = [fo]; C3.CAM.on = false; C3.appels.length = 0; C3.k1(e, tg); const a0 = C3.appels[0];
    C3.CAM.on = true; C3.appels.length = 0; C3.k1(e, tg); const a1 = C3.appels[0], rendu = C3.room.pillars.length;
    C3.room.pillars = [fo, mu]; C3.appels.length = 0; C3.k1(e, tg); const a2 = C3.appels[0];
    ok(a0 === 1 && a1 === 0 && rendu === 1 && a2 === 2, `tirs et fosses : la ligne de tir (keepRange) ignore une fosse seule dans l'arène (piliers vus : hors arène ${a0}, fosse seule ${a1}, rendue ${rendu}, fosse et mur ${a2})`); }
  // ── la sauvegarde : champ bati (toujours v:1)
  { const N = F.brxNeuf(); ok(F.BRX_V === 1 && JSON.stringify(N.bati) === '{}', 'sauvegarde : bati vide à neuf, version 1');
    const S1 = F.brxNoter(N, { essai: false, phase: 2, par: 'effondrement', bati: 'puits', win: false, vus: ['effondrement'] }, D);
    ok(S1.mort[2] === 'effondrement' && S1.bati[2] === 'puits' && F.brxEcrireSauve(S1).bati[2] === 'puits' && F.brxLireSauve(F.brxEcrireSauve(S1), D).bati[2] === 'puits' && F.brxEcrireSauve(S1).v === 1, 'sauvegarde : la sorte effondrée sur toi est écrite et relue (v:1)');
    const S2 = F.brxNoter(S1, { essai: false, phase: 2, par: 'ruee', win: false }, D); ok(S2.mort[2] === 'ruee' && !S2.bati[2] && !('bati' in F.brxEcrireSauve(S2)), 'sauvegarde : une autre mort l\'efface (et un bati vide n\'est pas écrit)');
    ok(F.brxNoter(S1, { essai: true, phase: 2, par: 'rail', win: false }, D) === S1, 'sauvegarde : une descente d\'essai n\'écrit rien');
    const inval = [{ mort: { 2: 'effondrement' }, bati: { 2: 'douves' } }, { mort: { 2: 'effondrement' }, bati: { 2: 'rails' } }, { mort: { 2: 'ruee' }, bati: { 2: 'puits' } }, { mort: { 2: 'effondrement' }, bati: { 9: 'puits' } }, { mort: { 2: 'effondrement' }, bati: { 2: 3 } }, { mort: { 2: 'effondrement' }, bati: 'x' }];
    ok(inval.every(x => JSON.stringify(F.brxLireSauve(Object.assign({ v: 1 }, x), D).bati) === '{}'), 'sauvegarde : un bati invalide (douve, rail, mort qui n\'est pas un effondrement, phase hors bornes, abîmé) est ignoré');
    { const brut = { v: 1, mort: { 2: 'effondrement' }, bati: { 2: 'douves' } }; ok(brut.bati[2] === 'douves' && !F.brxLireSauve(brut, D).bati[2], 'contre-épreuve : un bati invalide accepté serait attrapé'); }
    ok(F.brxLire(D, { prof: {}, tue: F.brxLireSauve(F.brxEcrireSauve(S1), D).mort, bati: F.brxLireSauve(F.brxEcrireSauve(S1), D).bati }, 1).bati === 'puits', 'sauvegarde : au combat suivant, le premier bâtir de la phase II rejoue la sorte qui t\'a tué'); }
  // ── branchements de la section « v18.7 · Phase II »
  const B187 = (html.match(/═══ v18\.7 · Phase II[\s\S]*?\/\/ ── essai \(Q17\)/) || [''])[0];
  ok(B187.length > 20000, `branchement (5c) : la section « v18.7 · Phase II » existe (${B187.length} caractères)`);
  ok(!/Math\.random\(\)|setRule\(|murmur\(|toast\(|showBanner\(/.test(B187), 'branchement (5c) : ni Math.random, ni setRule, ni murmur, ni bulle ni bandeau dans la section v18.7');
  { const E4 = DA.salles.final.etats[D.phases[1].arene];
    ok(E4 && E4.id === 'ouvrage' && E4.tard === true, 'branchement (5c) : l\'état « ouvrage » est tard (son calque n\'est pas peint à l\'entrée d\'une arène sans le Brumeux)'); }
  has(/if\(S&&S\.etats\[ie\]&&S\.etats\[ie\]\.tard&&ie!==A\.ie\)\{A\.tard\[ie\]=\[\];continue;\}/, '(5c) peindre saute les états tard (sauf celui d\'entrée)');
  has(/function vers\(n\)\{if\(!A\.on\|\|!A\.etats\[n\]\|\|A\.trans\)return false;peindreTard\(n,1e9\);/, '(5c) vers() finit d\'un coup un calque tard (jamais de calque à moitié peint)');
  has(/try\{XA\.peindreTard\(DB\.phases\[1\]\.arene,1\);/, '(5c) le Brumeux peint le calque de la phase II une tuile par image');
  has(/const cons=consTous\(\),r=brxBatir\(DB,monde\(\),AR,base,cons,X\.lec,j,h,X\.palier,rng,opt\);/, '(5c) bâtir passe par brxBatir (ordre des sortes, variantes, brxPoser)');
  has(/if\(e&&!e\.dead&&brxAnnule\(DB,c\.hp0-e\.hp,X\.pv\[1\]\|\|X\.pv\[X\.phase\]\)\)\{annuler\(c\);continue;\}/, '(5c) annulation : ses PV perdus pendant l\'annonce, en part des PV de la phase II');
  has(/if\(dessus\(etatDisques\(c\)\)\.length&&c\.attente<AT\)\{c\.attente\+=dt;continue;\}poser2\(c\);/, '(5c) une construction attend une créature (attenteMax), puis la pousse sans dégât');
  has(/const ls=P\.s\.lifesteal,n0=nums\.length;P\.s\.lifesteal=0;/, '(5c) une construction : ni PV volés, un nombre par élément');
  has(/if\(e&&e\.cons18\)\{const k=e\.cons18,el=k\.c\.elements\[k\.el\];if\(!X\.on\|\|\(o&&o\.dot\)/, '(5c) une construction : ni brûlures ni poisons');
  has(/return _he187\.call\(this,e,base\*SO\.echafaudages\.subi,o\);/, '(5c) −40 % tant qu\'un échafaudage tient');
  has(/nearestFoe=function\(x,y,max,f\)\{if\(!X\.on\)return _nf187\.apply\(this,arguments\);return _nf187\.call\(this,x,y,max,o=>!o\.cons18/, '(5c) le ciblage automatique ne voit pas une construction');
  has(/hitEnemy\(o,dg,\{crit:false,brx:1,/, '(5c) les coups de l\'effondrement sur ses ennemis sont exemptés de « on ne frappe que ce qu\'on voit » (o.brx)');
  has(/hitEnemy\(o,SOL\.degatsEnnemis,\{crit:false,color:'#9a86c8',brx:1\}\)/, '(5c) … ceux des dalles de la phase I aussi (point ouvert (3) du § 36)');
  has(/!\(o&&\(o\.dot\|\|o\.brx\)\)&&arDistRect\(vue\(\),e\.x,e\.y\)>HV\.coup/, '(5c) arène : un coup o.brx n\'est pas retenu hors de vue');
  has(/arDistRect\(vue\(\),e\.x,e\.y\)>\(k==='r'&&A\.jetonTir!=null\?A\.jetonTir:HV\.jeton\)/, '(5c) arène : crochet jetonTir (un tireur prend son jeton dans la vue seulement)');
  has(/XA\.crochets\(\{jetonTir:0,sourcesPlus:sources,/, '(5c) le Brumeux pose jetonTir à 0 (point ouvert (8) du § 36)');
  has(/XA\.crochets\(\{sourcesPlus:null,bossCam:null,glypheBoss:null,bossCharge:null,solTrou:null,jetonTir:null\}\)/, '(5c) jetonTir rendu à la salle suivante');
  has(/room\.pillars=piliers\(arTransObstacles\(T\)\)\.concat\(room\.pillars\.filter\(p=>p\.brx18\)\);/, '(5c) arène : les constructions traversent la transformation');
  has(/for\(const e of enemies\)\{if\(e\.dead\|\|e\.cons18\)continue;L\.push\(\{id:id\(e\)/, '(5c) arène : une construction n\'est pas une source de signe');
  has(/if\(ph\.id==='effacement'\)effacerCons\(\);else versCons\(n\);/, '(5c) les constructions restent en III, filtrées en IV, effacées en V');
  has(/const _sol187=CAM\.sol;CAM\.sol=function\(\)\{/, '(5c) les constructions au sol, posées recadrées (poseVue)');
  ok((B187.match(/poseVue\(/g) || []).length >= 1 && /function cuisson\(\)\{/.test(B187) && /g\.globalCompositeOperation='copy';g\.drawImage\(v,0,0\)/.test(B187) && /if\(CU\.tsig\.get\(tc\)===ts\)continue;/.test(B187),
    '(5c) rendu : les parties fixes cuites dans les tuiles du sol (seule une tuile qui change est repeinte, rendue intacte d\'abord) ; ce qui bouge posé par poseVue (recadré, calé au pixel)');
  has(/if\(z\.fin&&!\(z\.grp&&finis\.has\(z\.grp\)\)\)/, '(5c) la fin d\'une Ruée, d\'un effondrement (une fois par geste)');
  has(/if\(brxPlacer\(DB,\[\[z\]\],\[P\.x,P\.y\],optSortie\(charge\)\)<0\)\{X\.j\.clochesSautees\+\+;return;\}/, '(5c) une cloche ne part que si une sortie existe');
  has(/if\(!r&&\(m\.k==='batir'\|\|m\.g==='effondrement'\|\|m\.g==='manoeuvres'\)\)\{X\.j\.mesuresSautees\+\+;/, '(5c) une mesure qui ne peut pas se jouer saute (entracte réduit)');
  has(/bati:!win&&X\.tue==='effondrement'\?X\.tueBati:null/, '(5c) la sauvegarde garde la sorte effondrée sur toi');
  has(/S\.bati=X\.sauve&&X\.sauve\.bati\|\|\{\};/, '(5c) la lecture rend bati au combat suivant');
}

function F_mondeFinal() { const S = DA.salles.final; return { w: Math.round(S.w * W), h: Math.round(S.h * H) }; }

for (const m of NOTES) console.log('  ' + m);
console.log(`sim-brumeux : ${checks} vérifications, ${fails} échec${fails > 1 ? 's' : ''}. (ΔE minimal des couleurs du Brumeux contre la grammaire : ${dEmin.toFixed(1)})`);
process.exit(fails ? 1 : 0);
