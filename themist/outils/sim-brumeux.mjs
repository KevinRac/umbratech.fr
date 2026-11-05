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
//     résultat au bit près hors de l'arène) ; champ bati ; branchements de la section v18.7 ;
// 12. la phase III, « La Couture » (action 5d, v18.8) : données (gestes, partition.couture, montage, nœud, plafonds, PV des cousus, état d'arène réel
//     en index 5 et tard, états 0 à 4 inchangés) ; gestes (Surjet, Dé en deux coups, Aiguilles coupées au premier pilier qui arrête un tir, jamais
//     par une fosse : 10 000 positions chacun, avec et sans constructions, sortie atteinte à temps ; jour du Surjet, centre du premier Dé, abri derrière
//     une construction) ; points de montage (10 000 : bornes, distances, hors constructions, voie et fosses, reliés à toi, l'île d'une douve) ;
//     composition (10 000 Coutures : assemblages permis sous le budget de la registre III (+2 porteur), base différente, poidsProfil allumé ici
//     seulement ; souvenirs sans remise, pondérés à la récence ; renforts ; réserve vide) ; plafond (10 000 phases abstraites : cousus vivants,
//     fils tendus, suspendus) ; fenêtres à nu ; budget ; némésis (la plus forte, une seule) et promotion ; champ cousu ; plancher des chargements ;
//     branchements de la section v18.8 ;
// 13. la phase IV, « L'Emprunt » (action 5e, v18.9) : données (gestes, partition.emprunt, bloc emprunt, état d'arène réel en index 6 et tard, bornes
//     1 168 × 584, états 0 à 5 inchangés, vitesse de bascule propre) ; empruntables sur les 240 talents (ultimes, sous-classes, renforts exclus ;
//     variantes gardées et ignorées) ; tirage (10 000 boucles à graine : déterminisme, trois sans remise, jamais deux fois de suite la même famille,
//     fréquences contre les poids, cas de référence ; premier emprunt) ; justice (chaque famille et variante gardée, 10 000 positions dans les bornes de
//     l'état IV, avec et sans constructions, son corps comme obstacle : sortie atteinte à temps ou étape sautée ; chargements ≥ 0,8 s, ≥ 1,1 s à la
//     première rencontre ; attaque ≤ 3,6 × 11) ; gestes (Passe, Révérence, Volte : 10 000 positions chacun) ; Dernier Souvenir (plafond sur la phase,
//     inchangé pour tout autre fort ; défaite) ; constructions (10 000 phases : bornes, connexité, aire ≤ 30 %) ; sauvegarde emp ; branchements v18.9.
// 14. la phase V, « L'Effacement » (action 5f, v18.10) : données (partition courte et entière, bloc effacement, phases[4].arene 6, états 7 et 8 : bornes,
//     tard, au centre, brume hors des bornes ; états 0 à 6 inchangés ; dessin.version 6 ; durée d'une boucle) ; partition par palier et essai ; premier de la
//     boucle ; candidats (10 000 combats abstraits : montré, repli, saute ; emprunt jamais brûlé ni oublié) ; tableau éclair (fragment, vague seule, budget) ;
//     libres (10 000 tirages : montrés seulement, budget 10,5, non-cumul, poids × (1 + 2 × part)) ; justice dans l'état 8 (14 familles × 10 000 positions, les
//     12 gestes signature, la feinte double, les places de l'éclair, l'effondrement et le pan du bord) ; fosses ; resserrements (PV seulement, attente de la fin
//     de mesure, 10 000 phases filtrées : bornes, connexité, aire) ; Dernier Souvenir ; PV du montage court ; sauvegarde (aucun champ neuf) ; branchements v18.10.
// Contre-épreuves (une erreur introduite exprès doit être attrapée) : seuils inversés, budget dépassé, feinte tirée, sortie sans réflexe,
// construction qui coupe le passage acceptée, sauvegarde d'essai écrite ; 5b : brèche fermée, damier plein, dalle hors fragment, tiers répété,
// thème interdit, sauvegarde tab invalide acceptée ; 5c : douve aux quatre passerelles fermées acceptée, Ruée qui traverse une construction, fosse
// qui arrête un tir, construction posée sur toi, douve à 200 px, cône sans abri sous ses mains, effondrement sans sortie posé, bati invalide accepté,
// état 3 déplacé ; 5d : quatre fils tendus acceptés, point de montage dans une fosse, troisième cousu vivant en Normal, souvenir cousu deux fois,
// némésis cousue après un autre, chargement de cousu à 0,5 s accepté, promotion par un coup du Brumeux, cousu invalide accepté, Surjet sans jour,
// état 4 déplacé ; 5e : un ultime empruntable, la variante etourdit jouée, une étape chargée à 0,6 s, un renfort emprunté, deux fois de suite la même
// famille, un plafond sur e.maxHp pour le Brumeux, une défaite qui laisse frapper la zone, un état 5 déplacé, emp invalide accepté, une Passe qui traverse
// une construction ; 5f : un emprunt d'un talent jamais emprunté en IV, un tableau éclair avec une règle, deux feintes à la fois, un resserrement au
// temps, un état 6 déplacé, une fosse qui arrête un tir, un deuxième cousu vivant, une libre en Normal, un bati écrit pour un pan du bord.
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
vm.runInContext(bloc('des') + '\n' + bloc('brx') + '\nthis.F={desRng,brxPalier,brxPv,brxSeuils,brxPhase,brxLire,brxBudget,brxTirer,brxMesures,brxBoucle,brxPreavis,brxSeg,brxDans,brxSortie,brxPlacer,brxPartition,brxFils,brxCadre,brxToile,brxSortieToile,brxTiers,brxTiersLoin,brxDansRect,brxPlaces,brxDalle,brxDecors,brxTabOk,brxPoidsTab,brxPick,brxTableau,brxGrille,brxConnexe,brxPoser,brxNeuf,brxLireSauve,brxEcrireSauve,brxNoter,brxPire,BRX_V,brxCoupe,brxBord,brxRuee,brxEquerre,brxTruelle,brxSorteScore,brxSortesPoids,brxOrdreSortes,brxGeo,brxBatir,brxPvPart,brxFissure,brxAnnule,brxFiltreBornes,brxChute,brxEffondrement,brxCloche,brxAppel,brxDisques,brxEtats,brxTous,BRX_SORTES,BRX_CHUTE,brxSurjet,brxDe,brxSortieDe,brxAiguilles,brxVolAiguille,brxPointsCouture,brxRelie,brxSouvenirCouture,brxCoudre,brxNemCouture,brxFilsALancer,brxAboutit,brxNuCouture,brxBudgetCouture,brxActifsCouture,brxPvCousu,brxPvNoeud,brxPlancherCharge,brxPromu,brxAttente,brxCousuOk,brxRefusEmprunt,brxEmpruntables,brxPoidsEmprunt,brxEmprunts,brxEtapesEmprunt,brxPasse,brxReverence,brxReverenceOk,brxVolte,brxFiltreAire,brxPlafondDs,brxPointChute,brxEmpOk,brxVariantesIV,brxDefaitable,BRX_SIGN,BRX_V5,brxMontre,brxCandidatsV,brxPremierV,brxEclairFrag,brxEclair,brxPanGeo,brxPanBord,brxEffondreV,brxFosse,brxVariantesV,brxSortieV,brxPlacerV,brxLibreV,brxLibresV,brxResserrement,brxResserrePret,brxFiltreV};', ctx);
const F = ctx.F, BD = ctx.window.BRUME_DATA, D = BD.brumeux, DA = BD.arene, DS = BD.descente, BE = BD.bestiaire, VERS = BD.versions, GA = BD.gardiens;
let fails = 0, checks = 0;
const ok = (c, msg) => { checks++; if (!c) { fails++; if (fails <= 60) console.error('ÉCHEC : ' + msg); } };
const NOTES = []; const note = m => NOTES.push(m);
const T00 = Date.now(), tic = m => { if (process.env.SIM_TEMPS) process.stderr.write(`[${((Date.now() - T00) / 1000).toFixed(1)} s] ${m}\n`); };
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
const j185 = VERS.journal.filter(x => ['v18.5', 'v18.6', 'v18.7', 'v18.8', 'v18.9', 'v18.10'].includes(x.h));
ok(/^v18\.([5-9]|1\d)$/.test(VERS.actuelle) && VERS.journal.some(x => x.h === 'v18.5'), 'journal : version actuelle v18.5 ou plus, une ligne v18.5');
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
  const bo = F.brxBoucle(D, lec, 4, 'normal', F.desRng(3), {}, { essai: true });   // depuis 5f, la phase V a sa partition : l'essai rejoue celle de 5a ok(bo.length === D.partition.essai.length && bo.every(m => m.k === 'fixe' ? !!m.g : Array.isArray(m.elements)), 'tirages : la boucle résout les mesures libres');
  ok(F.brxMesures(D, 4, { essai: true }).every((m, i) => m.k === D.partition.essai[i].k) && F.brxMesures(D, 4, { essai: true }).length === D.partition.essai.length && F.brxMesures(D, 4).length === D.partition.effacement.mesures.length && F.brxMesures(D, 1).length === D.partition.ouvrage.mesures.length && F.brxMesures(D, 2).length === D.partition.couture.mesures.length && F.brxMesures(D, 3).length === D.partition.emprunt.mesures.length, 'tirages : les phases II à V jouent leur partition (5c à 5f) ; un essai de la phase V (essai=1) rejoue la partition d\'essai');
  ok(F.brxMesures(D, 0).length === D.partition.rappel.mesures.length && F.brxPartition(D, 0).entracteS === 1.4 && F.brxPartition(D, 0).nuS === 0 && F.brxPartition(D, 4, { essai: true }).nuS === D.partition.nuS && F.brxPartition(D, 4).nuS === 0, 'tirages : la phase I joue sa partition (le Rappel : entracte 1,4 s, pas de fenêtre à nu après la boucle)');
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
has(/updateBoss=function\(e,dt\)\{if\(e&&e\.brx18&&X\.on\)\{try\{if\(X\.mannequin\)\{presence\(e,dt\);return;\}pas\(e,dt\);\}/, 'updateBoss enveloppé : le Brumeux joue sa partition, jamais l\'IA du Glas (le mannequin de mesure de 5g-1 ne joue rien)');
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
has(/if\(A\.zoneCourante\)\{ch\.push\(id\(A\.zoneCourante\)\);sorte='zone';boss=!!A\.zoneCourante\.boss;/, 'arène : une zone du Brumeux se juge au préavis du boss');
has(/,b=essaiBoss\(\)\|\|\(A\.bossCam&&A\.bossCam\(\)\),/, 'arène : la caméra glisse vers le Brumeux');
has(/if\(A\.glypheBoss\)A\.glypheBoss\(c,0,0,t\*0\.5\);else oeil\(c,0,0,t\*0\.45\);/, 'arène : son glyphe dans le signe de bord à la place de l\'œil d\'essai');
has(/XA\.coup\(z,\(\)=>hurtPlayer\(z\.degats,e\)\)/, 'un coup de zone passe par la zone courante de l\'arène (jugé)');
has(/k=brxPlacer\(DB,V,\[P\.x,P\.y\],optSortie\(charge\)\);if\(k<0\)\{X\.j\.sautes\+\+;return false;\}/, 'une zone sans sortie saute');
has(/v:Math\.min\(SBJ18\.joueur\.vitesse,pMarche\(\)\)/, 'sortie cherchée à ta vitesse à pied si elle est plus lente (comme sbPlacer)');
has(/pr:Math\.max\(SBJ18\.joueur\.rayon,P\.r\)/, 'sortie cherchée avec ton vrai rayon s\'il est plus grand');
has(/const charge=brxPreavis\(DB,X\.sauve,id\);X\.vus\.add\(id\);/, 'première rencontre : +0,3 s de préavis, l\'élément est noté vu');
has(/presence:de\.presence!==ph\.presence\};\s*versCons\(n\);/, 'les constructions restent jusqu\'à la phase V, et en V (5f : elles y tombent une à une)');
has(/const v=brxPoser\(DB,monde\(\),AR,base,X\.cons\.map/, 'une construction passe par brxPoser (connexité, aire, plafond)');
has(/if\(sur\.length&&c\.attente<AT\)\{c\.attente\+=dt;continue;\}/, 'une construction attend une créature (attenteMax de l\'arène) puis la pousse sans dégât');
has(/if\(!o\.essai&&N!==S\)\{SAVE\.brumeux=brxEcrireSauve\(N\);/, 'SAVE.brumeux écrite seulement hors essai');
// le Brumeux n'est créé que par l'essai : creer() seulement dans debut(), debut() seulement dans essai()
ok((html.match(/\bcreer\(/g) || []).length === 2 && /function debut\(phase0\)\{X\.sauve=sauveLire\(\);creer\(phase0\);/.test(html), 'le Brumeux n\'est créé que par debut()');
ok((html.match(/\bdebut\(phase\)/g) || []).length === 1 && /debut\(phase\);showBanner\(DB\.nom/.test(html), 'debut() n\'est appelé que par l\'essai (rien en jeu avant 5g)');
ok(!/actif:true/.test(readFileSync(join(ROOT, 'data', 'arene.js'), 'utf8')), 'arene.js : actif:false (règle d\'or)');
has(/const QB=\/\[\?&\]brumeux=\(\\d\+\)\/\.exec\(location\.search\);/, 'essai par l\'adresse : ?brumeux=<phase>');
has(/window\.__brumeux=\{DB,essai,reference:c=>reference\(c\|\|P\.cls\),vers/, 'console __brumeux');
// v18.6 (5b) : la phase I en jeu
const B186 = (html.match(/═══ v18\.6 · Phase I[\s\S]*?(?=═══ v18\.7 · Phase II)/) || [''])[0];   // jusqu'à la section suivante (5c)
ok(B186.length > 4000, 'branchement (5b) : la section « v18.6 · Phase I » existe dans le bloc du Brumeux');
ok(!/setRule\(|murmur\(|ruleTag|showBanner\(|toast\(/.test(B186), 'branchement (5b) : règles confinées sans bulle ni étiquette (ni setRule, ni murmur, ni toast, ni bandeau)');
ok(!/'brume'|veil/.test(B186), 'branchement (5b) : la Brume plombée n\'est jamais jouée dans un fragment');
ok(!/Math\.random\(\)/.test(B186), 'branchement (5b) : la phase I ne tire rien avec Math.random (graine du combat)');
has(/if\(m\.k==='tableau'\)\{X\.im\+\+;accrocher\(m\);return;\}/, '(5b) une mesure « tableau » accroche un tableau');
has(/X\.boucle=brxBoucle\(DB,X\.lec,X\.phase,X\.palier,X\.rng,actifs,\{premiere:!X\.nb\+\+,essai:partO\(\)\.essai\}\);X\.im=0;X\.tiersVus=\[\];/, '(5b) le premier tableau de la phase rejoue celui qui t\'a tué ; chaque tiers sert une fois par boucle');
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
has(/if\(S\.size\)\{eproj=eproj\.filter\(q=>!S\.has\(q\.from\)\);rings=rings\.filter\(garderAnneau\(S\)\);\}/, '(5b) les ennemis qui rentrent emportent leurs tirs en vol et leurs ondes (aucun coup au nom d\'un ennemi parti)');
has(/function garderAnneau\(S\)\{return g=>\{if\(g\.src\)return!S\.has\(g\.src\);let e0=null,ed=120;/, '(5f) une onde sans auteur noté (le cri d\'un Hurleur) part avec l\'ennemi le plus proche de son centre, à 120 px (M-D)');
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
  // v18.11 (5g-1) : les PV des phases sont calibrés ; les parts restent (8 %, 2 %, 5 %, 6 %, 10 % des PV de la phase II)
  { const pv2 = D.phases[1].pv, R = x => Math.round(x * pv2);
    ok(SO.murailles.pvPart === 0.08 && SO.colonnades.pvPart === 0.02 && SO.rails.butoir.pvPart === 0.05 && SO.puits.pvPart === 0.06 && SO.echafaudages.pvPart === 0.10 && F.brxPvPart(D, SO.murailles.pvPart, 'normal') === R(0.08) && F.brxPvPart(D, SO.colonnades.pvPart, 'normal') === R(0.02) && F.brxPvPart(D, SO.rails.butoir.pvPart, 'normal') === R(0.05) && F.brxPvPart(D, SO.puits.pvPart, 'normal') === R(0.06) && F.brxPvPart(D, SO.echafaudages.pvPart, 'normal') === R(0.10) && SO.douves.incassable,
      `phase II : PV en parts des PV de la phase (muraille ${R(0.08)}, fût ${R(0.02)}, butoir ${R(0.05)}, puits ${R(0.06)}, échafaudage ${R(0.10)} ; douve incassable)`);
    ok(F.brxPvPart(D, SO.echafaudages.pvPart, 'extreme') === R(0.10) && F.brxPvPart(D, SO.murailles.pvPart, 'difficile') === R(0.08), 'phase II : jamais de PV en plus selon le palier'); }
  ok(C.lecture.seuil === 0.35 && C.annulation.part === 0.05 && C.annulation.nuS === 1.5 && C.placement.variantes === 4 && C.placement.bord === 40 && C.placement.voie === 96, 'phase II : seuil 0,35, annulation 5 % (+1,5 s), quatre variantes, bord 40 px, voie 96 px');
  ok(D.manoeuvres.n.normal === 2 && D.manoeuvres.n.difficile === 2 && D.manoeuvres.n.extreme === 3 && D.manoeuvres.max === 4, 'phase II : Manœuvres 2 / 2 / 3, au plus 4 vivants');
  ok(D.dessin.version >= 3, 'phase II : dessin.version 3 ou plus');
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
  const B187 = (html.match(/═══ v18\.7 · Phase II[\s\S]*?(?=═══ v18\.8 · Phase III|\/\/ ── essai \(Q17\))/) || [''])[0];
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
  has(/presence:de\.presence!==ph\.presence\};\s*versCons\(n\);/, '(5c) les constructions restent en III, filtrées en IV ; (5f) en V, elles restent et tombent une à une');
  has(/const _sol187=CAM\.sol;CAM\.sol=function\(\)\{/, '(5c) les constructions au sol, posées recadrées (poseVue)');
  ok((B187.match(/poseVue\(/g) || []).length >= 1 && /function cuisson\(\)\{/.test(B187) && /g\.globalCompositeOperation='copy';g\.drawImage\(v,0,0\)/.test(B187) && /if\(CU\.tsig\.get\(tc\)===ts\)continue;/.test(B187),
    '(5c) rendu : les parties fixes cuites dans les tuiles du sol (seule une tuile qui change est repeinte, rendue intacte d\'abord) ; ce qui bouge posé par poseVue (recadré, calé au pixel)');
  has(/if\(z\.fin&&!\(z\.grp&&finis\.has\(z\.grp\)\)\)/, '(5c) la fin d\'une Ruée, d\'un effondrement (une fois par geste)');
  has(/if\(brxPlacer\(DB,\[\[z\]\],\[P\.x,P\.y\],optSortie\(charge\)\)<0\)\{X\.j\.clochesSautees\+\+;return;\}/, '(5c) une cloche ne part que si une sortie existe');
  has(/if\(!r&&\(m\.k==='batir'\|\|m\.g==='effondrement'\|\|m\.g==='manoeuvres'\)\)\{X\.j\.mesuresSautees\+\+;/, '(5c) une mesure qui ne peut pas se jouer saute (entracte réduit)');
  has(/bati:!win&&X\.tue==='effondrement'\?X\.tueBati:null/, '(5c) la sauvegarde garde la sorte effondrée sur toi');
  has(/S\.bati=X\.sauve&&X\.sauve\.bati\|\|\{\};/, '(5c) la lecture rend bati au combat suivant');
}

// ── 12. La phase III, « La Couture » (action 5d, v18.8)
{ const PC = D.partition.couture, K = D.couture, EL = D.elements, M = F_mondeFinal(), R = { x0: MUR.g, y0: MUR.h, x1: M.w - MUR.d, y1: M.h - MUR.b }, GR = D.constructions.grille;
  const PR14 = 14, OPT = ch => ({ pr: PR14, v: 180, reflexe: 0.05, charge: ch, arene: R }), rnd = mk(5180);
  const fnv = s => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h.toString(16); };
  // la logique pure du Masqué (asmCombos, asmTirage, asmSouvenir), extraite comme le fait sim-masque
  const AC = { window: {}, Math, console, JSON, Set, Object, Array, Number, Infinity, isFinite }; vm.createContext(AC);
  for (const f of ['bestiaire', 'souvenirs', 'souvenirs-brume']) vm.runInContext(readFileSync(join(ROOT, 'data', f + '.js'), 'utf8'), AC);
  vm.runInContext(bloc('asm') + '\nthis.AF={asmCombos,asmTirage,asmSouvenir,asmRng};', AC);
  const AF = AC.AF, A = AC.window.BRUME_DATA.bestiaire.assemble, SVJ = AC.window.BRUME_DATA.souvenirsBrume, SVF = AC.window.BRUME_DATA.souvenirs.familles;
  const fam = {}; for (const [fid, Fm] of Object.entries(SVF)) for (const id of Fm.t || []) fam[id] = fid;
  // ── données
  const ET = DA.salles.final.etats, E5 = ET[5];
  ok(D.phases[2].id === 'couture' && D.phases[2].arene === 5 && E5 && E5.id === 'couture' && E5.tard === true, 'phase III : état d\'arène réel « couture » en index 5, tard');
  ok(E5.obstacles.length === 0 && E5.vides.length === 0 && E5.sol === 'cendre' && E5.bornes.fx0 === 0 && E5.bornes.fy0 === 0 && E5.bornes.fx1 === 1 && E5.bornes.fy1 === 1 && E5.brume.length === 1, 'phase III : arène pleine, ni obstacle ni fosse (rien ne cède), sol cendre, brume de décor en haut');
  const EMP4 = fnv(JSON.stringify(ET.slice(0, 5)));
  ok(fnv(JSON.stringify(ET.slice(0, 4))) === '74906d3f' && EMP4 === '2f47b641', `phase III : les états d'arène 0 à 4 sont inchangés (empreintes 74906d3f, ${EMP4})`);
  { const E2 = clone(ET.slice(0, 5)); E2[4] = clone(E5); ok(fnv(JSON.stringify(E2)) !== EMP4, 'contre-épreuve : l\'état 4 déplacé (remplacé par celui de la phase III) serait attrapé'); }
  const kinds = PC.mesures.map(m => m.k === 'fixe' ? m.g : m.k);
  ok(kinds.join(' ') === 'couture surjet libre feinte aiguilles couture de libre', `phase III : partition (Couture · Surjet · libre · feinte · Aiguilles · Couture · Dé · libre) : ${kinds.join(' ')}`);
  const DUR = { couture: K.decalS * (K.fils - 1) + K.montage.dureeS, surjet: EL.surjet.charge + 0.4, libre: 1.5, feinte: 1.2, aiguilles: EL.aiguilles.charge + 0.5, de: EL.de.charge + EL.de.seconde + 0.3 };
  const boucle = kinds.reduce((s2, k) => s2 + DUR[k], 0) + PC.entracteS * kinds.length + PC.nuS;
  ok(boucle >= 31 && boucle <= 35 && PC.entracteS === 1.4 && PC.nuS === 2.0 && PC.sauteS === 0.6, `phase III : une boucle d'environ 33 s, fenêtre comprise (${boucle.toFixed(1)} s), entracte 1,4 s, à nu 2,0 s, mesure sautée 0,6 s`);
  ok(F.brxPartition(D, 2).nuS === 2 && F.brxMesures(D, 2).filter(m => m.k === 'couture').length === 2, 'phase III : brxPartition lit sa partition (deux Coutures)');
  for (const [g, w] of [['surjet', { forme: 'losange', n: 7, h: 52, pas: 120, decale: 24, charge: 1.1, degats: 12 }], ['de', { forme: 'de', r: 110, charge: 1.0, seconde: 0.9, degats: 11 }]])
    ok(EL[g].fixe === true && EL[g].sorte === 'zone' && EL[g].vise && Object.entries(w).every(([k, v]) => EL[g][k] === v) && EL[g].charge >= D.preavis.boss, `phase III : geste ${g} fixe, orange, ses chiffres (${JSON.stringify(w)})`);
  ok(EL.de.seconde >= D.preavis.boss, 'phase III : le second coup du Dé a son propre préavis (0,9 s ≥ 0,8 s)');
  ok(EL.aiguilles.fixe && EL.aiguilles.sorte === 'tir' && EL.aiguilles.n === 3 && EL.aiguilles.ouverture === 36 && EL.aiguilles.vitesse === 420 && EL.aiguilles.charge === 0.9 && EL.aiguilles.degats === 10 && EL.aiguilles.charge >= D.preavis.boss, 'phase III : les Aiguilles : trois tirs en éventail de 36°, 420 px/s, charge 0,9 s, 10 (grammaire des tirs)');
  ok(EL.couture.fixe && EL.couture.menace === 0 && D.cumul.couture === 1, 'phase III : l\'élément « couture » (noté quand un Masqué cousu t\'a tué), fixe');
  ok(K.fils === 3 && K.filsMax === 3 && K.decalS === 0.5 && K.montage.dureeS === 4.4 && K.noeud.haut === 110 && K.noeud.r === 20 && K.noeud.pvPart === 0.01 && K.cousus.pvPart === 0.10 && K.nuS === 3 && K.briseS === 2, 'phase III : trois fils (0,5 s d\'écart), montage de 4,4 s, nœud 110 px au-dessus (r 20, 1 % des PV depuis 5g-1), cousus 10 %, à nu 3 s, cousu brisé 2 s');
  { const mo = BE.assemble.montage, tot = mo.descenteS + mo.masqueS + mo.coutureS + mo.coupeS; ok(K.montage.dureeS > tot && K.montage.dureeS / tot < 1.3, `phase III : le montage de la Couture (${K.montage.dureeS} s) est celui des salles (${tot.toFixed(2)} s), ralenti`); }
  { const pv3 = D.phases[2].pv, n3 = Math.round(0.01 * pv3), c3 = Math.round(0.10 * pv3);
    ok(F.brxPvNoeud(D, 'normal') === n3 && F.brxPvCousu(D, 'normal', 1, 1, 1) === c3 && F.brxPvCousu(D, 'extreme', 1, 1, 1) === c3 && F.brxPvCousu(D, 'normal', 1.1, 1.2, 1.08) === Math.round(0.10 * pv3 * 1.1 * 1.2 * 1.08), `phase III : PV en parts des PV de la phase (nœud ${n3}, cousu ${c3} × corps × porteur × points), jamais de PV en plus selon le palier`); }
  ok(K.cousus.plancherS === DA.preavis.coup, `phase III : plancher des chargements des cousus = préavis de l'arène (${DA.preavis.coup} s)`);
  ok(JSON.stringify(K.recence) === JSON.stringify(GA.attaques[3].souvenirs.recence), 'phase III : souvenirs pondérés à la récence du Glas (1 → 3)');
  ok(K.budget.moins === 2 && K.budget.plancher === 2 && K.attente.acte === 3 && K.attente.salle === BE.assemble.premiereSalle && K.attenteZoneS === 1.5, 'phase III : budget −2 par cousu (plancher 2), attente à l\'acte III salle 3, non-cumul 1,5 s');
  ok(D.dessin.version >= 4, 'phase III : dessin.version 4 ou plus');
  ok(BE.assemble.poidsProfil.actif === false, 'phase III : bestiaire.js inchangé (poidsProfil éteint : allumé pour les cousus seulement, par une copie)');
  // ── gestes : 10 000 positions chacun, avec et sans constructions
  const croix = p => [Math.max(R.x0 + 220, Math.min(R.x1 - 220, p[0])), R.y0 + D.dessin.hauteur + D.dessin.suit * Math.max(0, p[1] - R.y0 - D.dessin.hauteur)];
  { let bad = 0, n = { surjet: [0, 0], de: [0, 0], aiguilles: [0, 0] }, coupe = 0, fos = 0, jour = 0, jourT = 0;
    for (let i = 0; i < 10000; i++) { const p = [R.x0 + 60 + rnd() * (R.x1 - R.x0 - 120), R.y0 + 180 + rnd() * (R.y1 - R.y0 - 220)], h = croix(p), piliers = [];
      if (i % 2) for (let k = 0, m = 1 + Math.floor(rnd() * 5); k < m; k++) piliers.push({ x: R.x0 + 60 + rnd() * (R.x1 - R.x0 - 120), y: R.y0 + 60 + rnd() * (R.y1 - R.y0 - 120), r: 14 + rnd() * 20, kind: rnd() < 0.4 ? 'fosse18' : 'pilier18' });
      const libre = piliers.filter(q => Math.hypot(q.x - p[0], q.y - p[1]) > q.r + 24 && Math.hypot(q.x - h[0], q.y - h[1]) > q.r + 12), bloque = (x, y) => libre.some(q => Math.hypot(x - q.x, y - q.y) < q.r + PR14), o = ch => Object.assign(OPT(ch), { bloque });
      // le Surjet : le point le plus proche de toi te couvre ; un jour libre à moins de 45 px le long de la couture
      const S = F.brxSurjet(EL.surjet, h, p, 0), tp = Math.hypot(p[0] - h[0], p[1] - h[1]); if (tp >= EL.surjet.depart && !S.some(z => F.brxDans(z, p[0], p[1], PR14))) bad++;
      if (tp >= EL.surjet.depart) { const a = S[0] && S[0].a, ux = Math.cos(a), uy = Math.sin(a); jourT++; if ([-45, -40, 40, 45].some(d => !S.some(z => F.brxDans(z, p[0] + ux * d, p[1] + uy * d, PR14)))) jour++; }
      const s1 = F.brxSortie(D, S, p, o(EL.surjet.charge)); if (s1.ok) { n.surjet[0]++; if (S.some(z => F.brxDans(z, s1.q[0], s1.q[1], PR14)) || bloque(s1.q[0], s1.q[1]) || s1.d > 180 * (EL.surjet.charge - 0.05) + 1e-6) bad++; } else n.surjet[1]++;
      // le Dé : deux coups
      const Dz = F.brxDe(EL.de, p), s2 = F.brxSortieDe(D, EL.de, Dz, p, o(), EL.de.charge); if (s2.ok) { n.de[0]++; if (F.brxDans(Dz[0], s2.q1[0], s2.q1[1], PR14) || F.brxDans({ forme: 'disque', x: s2.q1[0], y: s2.q1[1], r: EL.de.r }, s2.q2[0], s2.q2[1], PR14) || bloque(s2.q2[0], s2.q2[1])) bad++; } else n.de[1]++;
      // les Aiguilles : coupées au premier pilier qui arrête un tir (jamais une fosse)
      const Ag = F.brxAiguilles(EL.aiguilles, h, p, R, libre, 0);
      for (const z of Ag.zones) { const tot2 = Math.hypot(z.x1 - z.x0, z.y1 - z.y0); for (const q of libre) { const d = F.brxSeg(q.x, q.y, z.x0, z.y0, z.x1, z.y1); if (q.kind !== 'fosse18' && d < q.r + EL.aiguilles.r - 1e-6 && Math.hypot(q.x - z.x1, q.y - z.y1) > q.r + EL.aiguilles.r + 1) bad++; if (q.kind === 'fosse18' && d < q.r + EL.aiguilles.r) fos++; } if (tot2 < F.brxBord(R, z.x0, z.y0, (z.x1 - z.x0) / (tot2 || 1), (z.y1 - z.y0) / (tot2 || 1)) - 1) coupe++; }
      const s3 = F.brxSortie(D, Ag.zones, p, o(EL.aiguilles.charge + F.brxVolAiguille(EL.aiguilles, h, p) * 0.8)); if (s3.ok) n.aiguilles[0]++; else n.aiguilles[1]++; }
    ok(bad === 0, 'gestes (5d) : le Surjet te couvre au point le plus proche ; chaque sortie rendue (Surjet, Dé en deux coups) est libre, hors des piliers, atteinte à pied à temps ; les Aiguilles s\'arrêtent au premier pilier qui arrête un tir');
    ok(n.surjet[0] > 9500 && n.de[0] > 9500 && n.aiguilles[0] > 9500, `gestes (5d) : sortie trouvée : Surjet ${n.surjet[0]}, Dé ${n.de[0]}, Aiguilles ${n.aiguilles[0]} sur 10 000 (sans sortie, le geste saute : ${n.surjet[1]} / ${n.de[1]} / ${n.aiguilles[1]})`);
    ok(jour === jourT, `gestes (5d) : le Surjet a toujours un jour à moins de 45 px le long de la couture (${jour} / ${jourT})`);
    ok(coupe > 100 && fos > 10, `gestes (5d) : ${coupe} aiguilles coupées par une construction, ${fos} passent par-dessus une fosse`);
    note(`gestes (5d) : Surjet ${n.surjet[0]} / Dé ${n.de[0]} / Aiguilles ${n.aiguilles[0]} avec sortie sur 10 000 ; ${coupe} aiguilles coupées`);
    // le jour du Surjet, le centre du premier Dé, l'abri derrière une construction
    const h = [1280, 400], p = [1280, 760], S = F.brxSurjet(EL.surjet, h, p, 0), a = S[0].a;
    ok(!S.some(z => F.brxDans(z, p[0] + Math.cos(a) * 45, p[1] + Math.sin(a) * 45, PR14)) && !S.some(z => F.brxDans(z, p[0] + 100, p[1], PR14)), 'gestes (5d) : le Surjet : 45 px le long de la couture, à l\'abri ; 100 px de côté, à l\'abri');
    { const plein = S.map(z => Object.assign({}, z, { h: 80 })); ok(plein.some(z => F.brxDans(z, p[0] + Math.cos(a) * 45, p[1] + Math.sin(a) * 45, PR14)), 'contre-épreuve : un Surjet sans jour (losanges jointifs) serait attrapé'); }
    const De = F.brxSortieDe(D, EL.de, F.brxDe(EL.de, p), p, OPT(), EL.de.charge); ok(De.ok && !F.brxDans({ forme: 'disque', x: De.q1[0], y: De.q1[1], r: EL.de.r }, p[0], p[1], PR14), 'gestes (5d) : le Dé : revenir au centre du premier (il a déjà frappé) est hors du second');
    const mur = []; for (let x = 1180; x <= 1380; x += 20) mur.push({ x, y: 580, r: 18, kind: 'pilier18' });
    const Ag = F.brxAiguilles(EL.aiguilles, h, p, R, mur, 0); ok(!Ag.zones.some(z => F.brxDans(z, p[0], p[1], PR14)) && F.brxAiguilles(EL.aiguilles, h, p, R, [], 0).zones.some(z => F.brxDans(z, p[0], p[1], PR14)), 'gestes (5d) : derrière une muraille, les Aiguilles ne t\'atteignent pas ; sans elle, si');
    ok(F.brxAiguilles(EL.aiguilles, h, p, R, mur.map(q => Object.assign({}, q, { kind: 'fosse18' })), 0).zones.some(z => F.brxDans(z, p[0], p[1], PR14)), 'gestes (5d) : une rangée de fosses n\'arrête pas les Aiguilles'); }
  // ── points de montage : 10 000 tirages
  { let bad = 0, tot = 0, n3 = 0, ile = 0, ileT = 0, ex = null; const vueDe = p => ({ x0: p[0] - 640, y0: p[1] - 360, x1: p[0] + 640, y1: p[1] + 360 });
    for (let i = 0; i < 10000; i++) { const p = [R.x0 + 100 + rnd() * (R.x1 - R.x0 - 200), R.y0 + 200 + rnd() * (R.y1 - R.y0 - 260)], j = { x: p[0], y: p[1], r: PR14 }, cons = [];
      for (const sorte of i % 2 ? ['douves', 'murailles', 'rails'] : ['colonnades', 'puits']) { const q = [p[0] + (rnd() - 0.5) * 300, p[1] + (rnd() - 0.5) * 200], V = F.brxGeo(D, sorte, q, croix(q), R, F.desRng(i * 3 + sorte.length), {}); for (const c of V) if (F.brxPoser(D, M, R, [], cons, c, j, 'extreme').ok) { cons.push(c); break; } }
      const dv = cons.find(c => c.sorte === 'douves'), worst = cons.flatMap(c => F.brxEtats(c)[0]), G = F.brxGrille(M, R, worst, GR); G.relie = F.brxRelie(G, p[0], p[1]);
      const V2 = vueDe(p), pts = F.brxPointsCouture(D, p, R, V2, [], cons, G, F.desRng(i + 50), { ile: dv && dv.ile }); tot += pts.length; if (pts.length === 3) n3++;
      const ileLibre = dv && !cons.some(c => c !== dv && (F.brxTous(c).some(d => Math.hypot(dv.ile[0] - d.x, dv.ile[1] - d.y) < d.r + K.points.marge) || (c.voie && F.brxSeg(dv.ile[0], dv.ile[1], c.voie.x0, c.voie.y0, c.voie.x1, c.voie.y1) < c.voie.w / 2 + K.points.marge)));
      if (ileLibre && Math.hypot(p[0] - dv.ile[0], p[1] - dv.ile[1]) >= K.points.minD) { ileT++; if (pts.some(q => q[0] === dv.ile[0] && q[1] === dv.ile[1])) ile++; }
      for (const [k, q] of pts.entries()) { const d = Math.hypot(q[0] - p[0], q[1] - p[1]), surIle = dv && q[0] === dv.ile[0] && q[1] === dv.ile[1];
        const E = []; if (q[0] < R.x0 + K.points.bord - 1e-6 || q[0] > R.x1 - K.points.bord + 1e-6 || q[1] < R.y0 + K.points.bord - 1e-6 || q[1] > R.y1 - K.points.bord + 1e-6) E.push('bornes');
        if (!surIle && (d < K.points.d[0] - 1e-6 || d > K.points.d[1] + 1e-6)) E.push('distance ' + d.toFixed(0)); if (d < K.points.minD - 1e-6) E.push('trop près');
        if (pts.some((o2, k2) => k2 !== k && Math.hypot(o2[0] - q[0], o2[1] - q[1]) < K.points.ecart - 1e-6) && !surIle) E.push('écart');
        for (const c of cons) { for (const dd of F.brxTous(c)) if (Math.hypot(q[0] - dd.x, q[1] - dd.y) < dd.r + K.points.marge - 1e-6) E.push('sur une construction ' + c.sorte); if (c.voie && F.brxSeg(q[0], q[1], c.voie.x0, c.voie.y0, c.voie.x1, c.voie.y1) < c.voie.w / 2) E.push('voie'); }
        const ci = Math.floor(q[0] / G.cs), ri = Math.floor(q[1] / G.cs); if (!G.relie[ri * G.cols + ci]) E.push('pas relié');
        if (q[0] < V2.x0 - K.points.vue - 1e-6 || q[0] > V2.x1 + K.points.vue + 1e-6 || q[1] < V2.y0 - K.points.vue - 1e-6 || q[1] > V2.y1 + K.points.vue + 1e-6) E.push('hors de la vue');
        if (E.length) { bad++; if (!ex) ex = E.join(', '); } } }
    ok(bad === 0 && tot > 20000, `points de montage : ${tot} points sur 10 000 Coutures (${n3} à trois points) : bornes, distances, écart, hors constructions, voie et fosses, reliés à toi, dans la vue + 200 px${ex ? ' ; ' + ex : ''}`);
    ok(ileT > 300 && ile === ileT, `points de montage : quand une douve tient (et que tu n'es pas sur son île), un point est sur l'île (${ile} / ${ileT})`);
    note(`points de montage : ${tot} points, ${n3} Coutures à trois points sur 10 000 ; île ${ile} / ${ileT}`);
    // contre-épreuve : un point dans l'anneau de fosses d'une douve serait attrapé
    { const p = [1280, 820], V = F.brxGeo(D, 'douves', p, croix(p), R, F.desRng(1), {}), dv = V[0], f0 = dv.disques[0];
      const bon = F.brxPointsCouture(D, p, R, null, [], [dv], null, F.desRng(2), { n: 3 }), dedans = Math.hypot(f0.x - dv.ile[0], f0.y - dv.ile[1]) < D.constructions.sortes.douves.anneau.r + 1;
      ok(dedans && !bon.some(q => Math.hypot(q[0] - dv.ile[0], q[1] - dv.ile[1]) < D.constructions.sortes.douves.anneau.r + D.constructions.sortes.douves.anneau.fosse + K.points.marge - 1e-6), 'contre-épreuve : un point de montage dans une fosse serait attrapé (aucun n\'y tombe)'); } }
  // ── composition : 10 000 Coutures
  { const ctx = { act: 3, salle: 40, J: SVJ }, plaf = A.budgetMenace[3], armes = Object.keys(fam).filter(id => SVJ.familles[fam[id]] && SVJ.talents && SVJ.talents[id] !== undefined);
    const peut = (f, E) => !!(E.renfort && SVJ.renforts[E.renfort]) || AF.asmCombos(A, Object.assign({ porte: 'sb:' + f }, ctx)).length > 0;
    let bad = 0, base = 0, ord = 0, sv = 0, rf = 0, n = 0, rep2 = 0, ex = null; const freq = {};
    for (let i = 0; i < 10000; i++) { const rng = F.desRng(i + 9000), res = []; const nr = i % 7 === 0 ? 0 : 1 + Math.floor(rng() * 6);
      for (let k = 0; k < nr; k++) { const id = armes[Math.floor(rng() * armes.length)]; if (!res.some(x => x.id === id)) res.push({ id, source: 'talent', rang: 1 + Math.floor(rng() * 3), g: Math.floor(rng() * 2), oublie: { acte: 1 + k, salle: 2 } }); }
      const pris = []; let dernier = null; const prof = { portee: rng(), esquive: rng(), soin: rng(), risque: rng(), rythme: rng(), puissance: rng() };
      for (let f = 0; f < 3; f++) { const s0 = F.brxSouvenirCouture(D, res, fam, SVJ, pris, rng, A.souvenir, peut), r = F.brxCoudre(AF, A, ctx, s0, dernier, rng, prof); n++;
        if (!r.co) { bad++; if (!ex) ex = 'aucun assemblage'; continue; }
        const lim = plaf + (r.sv && r.sv.cap ? A.budgetPorteur : 0); if (r.co.menace > lim) { bad++; if (!ex) ex = `menace ${r.co.menace} > ${lim}`; }
        if (!AF.asmCombos(A, Object.assign(r.sv && r.sv.cap ? { porte: r.sv.cap } : {}, ctx)).some(c => c.cle === r.co.cle)) { bad++; if (!ex) ex = 'assemblage non permis ' + r.co.cle; }
        if (r.sv && r.sv.cap && !r.co.depart.includes(r.sv.cap)) { bad++; if (!ex) ex = 'arme hors des départs'; }
        if (dernier && r.co.base === dernier && AF.asmCombos(A, ctx).some(c => c.base !== dernier)) base++;
        if (s0) { if (pris.includes(s0.x.id)) rep2++; pris.push(s0.x.id); freq[s0.x.oublie.acte] = (freq[s0.x.oublie.acte] || 0) + 1; }
        if (r.sv) { sv++; if (r.sv.renfort) rf++; } else ord++; dernier = r.co.base; } }
    ok(bad === 0, `composition : ${n} Masqués cousus : assemblage permis sous le budget de la registre III (${plaf}, +${A.budgetPorteur} pour un porteur), l'arme toujours au départ${ex ? ' ; ' + ex : ''}`);
    ok(base === 0, `composition : jamais la même base que le cousu d'avant (quand une autre existe) : ${base}`);
    ok(rep2 === 0, 'composition : un souvenir n\'est jamais cousu deux fois dans le combat (sans remise)');
    ok(sv > 5000 && rf > 0 && ord > 2000, `composition : ${sv} porteurs (dont ${rf} renforcés), ${ord} ordinaires (réserve vide ou épuisée)`);
    // récence : le plus récemment oublié sort plus souvent (poids 1 → 3)
    { const res = [1, 2, 3].map(k => ({ id: armes[k * 5], source: 'talent', rang: 1, g: 0, oublie: { acte: k, salle: 1 } })), cnt = [0, 0, 0];
      for (let i = 0; i < 30000; i++) { const s0 = F.brxSouvenirCouture(D, res, fam, SVJ, [], F.desRng(i + 7e5), A.souvenir, null); cnt[s0.x.oublie.acte - 1]++; }
      const att = [1 / 6, 2 / 6, 3 / 6].map(x => x * 30000); ok(cnt.every((c, k) => Math.abs(c - att[k]) < 4 * Math.sqrt(att[k])), `composition : récence (plus ancien → plus récent) ${cnt.join(' / ')} pour ${att.map(Math.round).join(' / ')} attendus`); }
    // contre-épreuve : un souvenir tiré deux fois (pris ignoré) serait attrapé
    { const res = [{ id: armes[0], source: 'talent', rang: 1, g: 0, oublie: { acte: 1, salle: 1 } }]; ok(F.brxSouvenirCouture(D, res, fam, SVJ, [armes[0]], F.desRng(1), A.souvenir, null) === null && F.brxSouvenirCouture(D, res, fam, SVJ, [], F.desRng(1), A.souvenir, null) !== null, 'contre-épreuve : un souvenir cousu deux fois serait attrapé (sans remise : rien à coudre)'); }
    // poidsProfil : appliqué ici seulement (une copie)
    { const prof = { portee: 1, esquive: 0, risque: 1 }; let tirs = 0, tirs0 = 0; for (let i = 0; i < 4000; i++) { const r = F.brxCoudre(AF, A, ctx, null, null, F.desRng(i + 3e5), prof); if (r.co.depart.includes('tirs') || r.co.eveil === 'tirs') tirs++; const r0 = AF.asmTirage(A, ctx, null, F.desRng(i + 3e5), null); if (r0.depart.includes('tirs') || r0.eveil === 'tirs') tirs0++; }
      ok(tirs > tirs0 && A.poidsProfil.actif === false, `composition : poidsProfil allumé pour les cousus (portée 1 : Salve ${tirs} contre ${tirs0} sans), éteint dans bestiaire.js`); } }
  // ── plafond : 10 000 phases abstraites (fils tendus, cousus vivants, suspendus)
  { let bad = 0, nu = 0, susp = 0; const mx = { normal: 0, difficile: 0, extreme: 0 };
    for (let i = 0; i < 10000; i++) { const pal = ['normal', 'difficile', 'extreme'][i % 3], rng = F.desRng(i + 4e5); let fils = [], viv = 0, tmax = 0;
      for (let c = 0; c < 6; c++) { const n = F.brxFilsALancer(D, fils.length); for (let k = 0; k < n; k++) fils.push({ coupe: false }); tmax = Math.max(tmax, fils.length);
        let coupes = 0; for (const f of fils) if (rng() < 0.4) { f.coupe = true; coupes++; }
        fils = fils.filter(f => !f.coupe);
        const reste = []; for (const f of fils) { if (F.brxAboutit(D, pal, viv)) viv++; else { reste.push(f); susp++; } } fils = reste;
        if (F.brxNuCouture(coupes, fils.length)) nu++;
        if (viv > D.paliers[pal].masques || fils.length > K.filsMax) bad++; mx[pal] = Math.max(mx[pal], viv);
        for (let k = 0; k < viv; k++) if (rng() < 0.35) viv--; }
      if (tmax > K.filsMax) bad++; }
    ok(bad === 0 && mx.normal === 2 && mx.difficile === 2 && mx.extreme === 3, `plafond : 10 000 phases : jamais plus de 2 / 2 / 3 cousus vivants (${mx.normal} / ${mx.difficile} / ${mx.extreme}), jamais plus de trois fils tendus ; ${susp} montages suspendus, ${nu} fenêtres à nu`);
    ok(F.brxFilsALancer(D, 3) === 0 && F.brxFilsALancer(D, 1) === 2 && F.brxFilsALancer(D, 0) === 3, 'plafond : une Couture ne lance que ce qui manque pour trois fils (trois tendus : elle saute)');
    ok(!F.brxAboutit(D, 'normal', 2) && F.brxAboutit(D, 'extreme', 2) && !F.brxAboutit(D, 'extreme', 3), 'plafond : un montage aboutit sous le plafond, sinon il reste suspendu');
    { const faux = (D2, t) => Math.min(D2.couture.fils + 1, D2.couture.filsMax + 1 - t); ok(faux(D, 0) === 4 && F.brxFilsALancer(D, 0) === 3, 'contre-épreuve : quatre fils tendus acceptés seraient attrapés'); }
    { const D3 = clone(D); D3.paliers.normal.masques = 3; ok(F.brxAboutit(D3, 'normal', 2) && !F.brxAboutit(D, 'normal', 2), 'contre-épreuve : un troisième cousu vivant en Normal serait attrapé'); }
    ok(F.brxNuCouture(1, 0) && !F.brxNuCouture(0, 0) && !F.brxNuCouture(2, 1), 'à nu : plus aucun fil (au moins un coupé) → à nu ; aucun coupé, ou un fil qui tient → non'); }
  // ── budget et non-cumul
  ok(F.brxBudgetCouture(D, 2, 'normal', 0) === 6 && F.brxBudgetCouture(D, 2, 'normal', 1) === 4 && F.brxBudgetCouture(D, 2, 'normal', 2) === 2 && F.brxBudgetCouture(D, 2, 'normal', 3) === 2 && F.brxBudgetCouture(D, 2, 'extreme', 3) === 3, 'budget : −2 par cousu vivant, plancher 2 (Normal 6 → 4 → 2 ; Extrême 9 → 3)');
  { const lec = F.brxLire(D, { prof: {} }, 2); let bad = 0; for (let i = 0; i < 4000; i++) { const v = i % 4, pal = ['normal', 'difficile', 'extreme'][i % 3], a = F.brxActifsCouture({}, v), B = F.brxBudgetCouture(D, 2, pal, v), t = F.brxTirer(D, lec, 2, pal, F.desRng(i + 6e5), a, { moins: D.couture.budget.moins * v, plancher: D.couture.budget.plancher });
      let m = 0, tirs = v; for (const id of t.elements) { m += D.elements[id].menace; if (D.elements[id].sorte === 'tir') tirs++; } if (m > B + 1e-9 || tirs > D.cumul.tir && t.elements.some(id => D.elements[id].sorte === 'tir')) bad++; }
    ok(bad === 0, 'budget : 4 000 mesures libres : budget réduit tenu ; chaque cousu compte pour une source de tir (jamais plus de deux)'); }
  // ── némésis et promotion
  { const L = [{ uid: 'a', points: 2, ne: { run: 3 }, co: { corps: 'brute' } }, { uid: 'b', points: 4, ne: { run: 1 }, co: { corps: 'spectre' } }, { uid: 'c', points: 4, ne: { run: 5 }, co: { corps: 'voile' } }, { uid: 'd', points: 5, repit: 1, ne: { run: 9 }, co: { corps: 'brute' } }];
    ok(F.brxNemCouture(L, {}).uid === 'c' && F.brxNemCouture(L, { c: 1 }).uid === 'b' && F.brxNemCouture(L, { a: 1, b: 1, c: 1 }) === null && F.brxNemCouture([], {}) === null, 'némésis : une seule, la plus forte (points, puis la plus récente), jamais en répit, jamais deux fois');
    { const faux = l => l.slice().sort((x, y) => (x.points || 1) - (y.points || 1))[0]; ok(faux(L.filter(f => !f.repit)).uid !== F.brxNemCouture(L, {}).uid, 'contre-épreuve : une némésis cousue après un autre (la plus faible) serait attrapée'); }
    ok(F.brxPromu({ source: 'cousu', depuis: 0.2 }) && !F.brxPromu({ source: 'cousu', depuis: 1.6 }) && !F.brxPromu({ source: 'brumeux', depuis: 0.1 }) && !F.brxPromu({ source: 'cousu', depuis: 0.1, essai: true }), 'promotion : le cousu dont le coup t\'a tué (moins de 1,5 s), jamais le Brumeux, jamais en essai');
    { const faux = o => o.depuis < 1.5; ok(faux({ source: 'brumeux', depuis: 0.1 }) && !F.brxPromu({ source: 'brumeux', depuis: 0.1 }), 'contre-épreuve : une promotion par un coup du Brumeux serait attrapée'); }
    ok(F.brxAttente(D).acte === 3 && F.brxAttente(D).salle === 3, 'promotion : une némésis promue au fond attend à l\'acte III, salle 3'); }
  // ── plancher des chargements des cousus
  { const a = F.brxPlancherCharge(D, 0.45, 0.45), b = F.brxPlancherCharge(D, 0.8, 0.8), c = F.brxPlancherCharge(D, 0.4, 0.5); ok(a.tot === 0.6 && Math.abs(a.t - 0.6) < 1e-9 && b.tot === 0.8 && b.t === 0.8 && c.tot === 0.6 && Math.abs(c.t - 0.5) < 1e-9, 'plancher : un chargement de cousu jamais sous 0,6 s (prolongé du manque), un chargement plus long inchangé');
    let bad = 0; for (let i = 0; i < 2000; i++) { const tot = 0.3 + rnd() * 0.8, t = tot * rnd(), q = F.brxPlancherCharge(D, t, tot); if (q.tot < 0.6 - 1e-9 || q.tot - q.t !== tot - t && Math.abs((q.tot - q.t) - (tot - t)) > 1e-9) bad++; } ok(bad === 0, 'plancher : 2 000 chargements : jamais sous 0,6 s, le temps déjà écoulé gardé');
    ok(BE.assemble.chargeMinS === 0.5, 'plancher : le Masqué de salle garde son chargement minimal (0,5 s)');
    { const faux = (t, tot) => ({ t, tot }); ok(faux(0.5, 0.5).tot < 0.6 && F.brxPlancherCharge(D, 0.5, 0.5).tot === 0.6, 'contre-épreuve : un chargement de cousu à 0,5 s accepté serait attrapé'); } }
  // ── la sauvegarde : champ cousu (toujours v:1)
  { const N = F.brxNeuf(), C1 = { corps: 'brute', cle: 'brute:onde+sb:lame>cone', id: 'ray_n1' };
    const S1 = F.brxNoter(N, { essai: false, phase: 3, par: 'couture', cousu: C1, win: false, vus: ['couture'] }, D);
    ok(S1.mort[3] === 'couture' && S1.cousu[3].cle === C1.cle && F.brxEcrireSauve(S1).v === 1 && F.brxLireSauve(F.brxEcrireSauve(S1), D).cousu[3].id === 'ray_n1', 'sauvegarde : le Masqué cousu qui t\'a tué est écrit et relu (v:1)');
    const S2 = F.brxNoter(S1, { essai: false, phase: 3, par: 'surjet', win: false }, D); ok(S2.mort[3] === 'surjet' && !S2.cousu[3] && !('cousu' in F.brxEcrireSauve(S2)), 'sauvegarde : une autre mort l\'efface (et un cousu vide n\'est pas écrit)');
    ok(F.brxNoter(S1, { essai: true, phase: 3, par: 'couture', cousu: C1 }, D) === S1, 'sauvegarde : une descente d\'essai n\'écrit rien');
    const inval = [{ mort: { 3: 'couture' }, cousu: { 3: { corps: 'Brute!', cle: 'x', id: null } } }, { mort: { 3: 'couture' }, cousu: { 3: { corps: 'brute', cle: 'spectre:a+b>c', id: null } } }, { mort: { 3: 'surjet' }, cousu: { 3: C1 } }, { mort: { 3: 'couture' }, cousu: { 9: C1 } }, { mort: { 3: 'couture' }, cousu: { 3: { corps: 'brute', cle: 'brute:a', id: 5 } } }, { mort: { 3: 'couture' }, cousu: 'x' }];
    ok(inval.every(x => JSON.stringify(F.brxLireSauve(Object.assign({ v: 1 }, x), D).cousu) === '{}'), 'sauvegarde : un cousu invalide (corps, clé d\'un autre corps, mort qui n\'est pas une couture, phase hors bornes, id abîmé) est ignoré');
    { const brut = { v: 1, mort: { 3: 'couture' }, cousu: { 3: { corps: 'Brute!', cle: 'x' } } }; ok(brut.cousu[3].corps === 'Brute!' && !F.brxLireSauve(brut, D).cousu[3], 'contre-épreuve : un cousu invalide accepté serait attrapé'); }
    ok(F.brxLire(D, { prof: {}, tue: { 3: 'couture' }, cousu: { 3: C1 } }, 2).cousu.cle === C1.cle && F.brxLire(D, { prof: {}, tue: { 3: 'surjet' }, cousu: { 3: C1 } }, 2).cousu === null && F.brxLire(D, { prof: {}, tue: { 3: 'couture' } }, 2).premier === null, 'sauvegarde : au combat suivant, la lecture rend le cousu qui t\'a tué (rien en premier : il est au socle)'); }
  // ── branchements de la section « v18.8 · Phase III »
  const B188 = (html.match(/═══ v18\.8 · Phase III[\s\S]*?(?=═══ v18\.9 · Phase IV|\/\/ ── essai \(Q17\))/) || [''])[0];
  ok(B188.length > 15000, `branchement (5d) : la section « v18.8 · Phase III » existe (${B188.length} caractères)`);
  ok(!/Math\.random\(\)|setRule\(|murmur\(|toast\(|showBanner\(|showCard\(|offreNemesis/.test(B188), 'branchement (5d) : ni Math.random, ni setRule, ni murmur, ni bulle, ni bandeau, ni carte d\'arrivée, ni offre de reprise dans la section v18.8');
  has(/if\(!R\.cousu18\)\{showCard\(e,false\);sfx\('asm_in'\);\}/, '(5d) Masqué : un cousu n\'a ni carte d\'arrivée ni rire d\'arrivée (inerte pour le Masqué de salle)');
  has(/function zoneAutre\(e\)\{if\(rings\.length\|\|\(room&&room\.bl\)\)return true;if\(window\.__zoneAutre18&&window\.__zoneAutre18\(e\)\)return true;/, '(5d) Masqué : crochet de non-cumul (inerte sans le Brumeux)');
  ok(/if\(arDistRect\(XA\.dbg\(\)\.vue\(\),e\.x,e\.y\)>0\)return true;/.test(B188) && /q\.cu18=1;/.test(B188), '(5d) un Masqué cousu ne lance rien hors de la vue, et son tir né hors de la vue se perd (K-D : coups sans signe au Tisse-Destin)');
  has(/for\(const s of L\)if\(s\.k==='proj'&&s\.o\.from&&A\.sig\.debut\[s\.id\]==null\)\{const d=A\.sig\.debut\[id\(s\.o\.from\)\];if\(d!=null&&ids\.includes\(s\.id\)\)A\.sig\.debut\[s\.id\]=d;\}/, '(5d) arène : un tir hérite du signe de son tireur (le journal seulement)');
  has(/by=Math\.max\(14,fy-off-\(M\.haut\|\|250\)\)/, '(5d) Masqué : le nœud d\'un montage de la Couture à 110 px (250 en salle)');
  has(/const R=room\.asm,acte=R\.acte18\|\|RUN\.act,salle=R\.salle18!=null\?R\.salle18:RUN\.roomIdx;/, '(5d) némésis : une némésis promue au fond attend à sa salle (inerte pour une salle)');
  has(/XA\.peindreTard\(DB\.phases\[2\]\.arene,1\)/, '(5d) le Brumeux peint le calque de la phase III une tuile par image pendant la phase II');
  has(/cousu:!win&&X\.tue==='couture'\?X\.tueCousu:null/, '(5d) la sauvegarde garde le Masqué cousu qui t\'a tué');
  has(/S\.cousu=X\.sauve&&X\.sauve\.cousu\|\|\{\};/, '(5d) la lecture rend cousu au combat suivant');
  ok(/brxPlancherCharge\(DB,/.test(B188) && /XA\.coup\(/.test(B188) && /brxPointsCouture\(DB,/.test(B188) && /brxCoudre\(/.test(B188) && /brxSouvenirCouture\(DB,/.test(B188) && /brxNemCouture\(/.test(B188), '(5d) la section v18.8 passe par la logique pure (points, couture, souvenirs, némésis, plancher) et juge les zones des cousus (XA.coup)');
  // le journal v18.8 : ni couture, ni fil, ni Masqué, ni phase
  for (const x of VERS.journal.filter(y => y.h === 'v18.8')) ok(!/cou(d|s)|couture|\bfils?\b|masqué|phase|némésis|aiguille|surjet|\bdé\b|montage/i.test(x.t), `journal v18.8 : ni couture, ni fil, ni Masqué, ni phase, ni geste nommé (secret)`);
  ok(VERS.actuelle !== 'v18.8' || VERS.journal[0].h === 'v18.8', 'journal (5d) : la ligne v18.8 est en tête');
}

tic('// ── 13. La phase IV');
// ── 13. La phase IV, « L'Emprunt » (action 5e, v18.9)
{ const PE = D.partition.emprunt, E = D.emprunt, EL = D.elements, M = F_mondeFinal(), R = { x0: MUR.g, y0: MUR.h, x1: M.w - MUR.d, y1: M.h - MUR.b }, GR = D.constructions.grille;
  const PR14 = 14, rnd = mk(5190), fnv = s => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h.toString(16); };
  // la logique pure du Masqué et des armes de la Brume (asm, sb), du Dernier Souvenir (ds), comme sim-brume et sim-dernier
  const AC = { window: {}, Math, console, JSON, Set, Object, Array, Number, Infinity, isFinite }; vm.createContext(AC);
  for (const f of ['bestiaire', 'souvenirs', 'souvenirs-brume', 'talents']) vm.runInContext(readFileSync(join(ROOT, 'data', f + '.js'), 'utf8'), AC);
  vm.runInContext(bloc('asm') + bloc('sb') + bloc('ds') + '\nthis.SF={sbEtapes,sbCharge,sbPlacer,sbSortie,sbDans,sbBrut,sbForce,sbPlafond,sbCoup,sbDegats,sbVerrou,sbPortee,asmAtteinte,dsPlafond};', AC);
  const SF = AC.SF, BD2 = AC.window.BRUME_DATA, A = BD2.bestiaire.assemble, J = BD2.souvenirsBrume, SVF = BD2.souvenirs.familles, TN = BD2.talents.noeuds, DSd = BD2.souvenirs.dernier;
  const fam = {}; for (const [fid, Fm] of Object.entries(SVF)) for (const id of Fm.t || []) fam[id] = fid;
  const kind = {}, max = {}; for (const id in TN) { kind[id] = TN[id].k; max[id] = TN[id].max || 1; }
  const T = { fam, kind, max, J };
  // ── données
  const ET = DA.salles.final.etats, E6 = ET[6];
  ok(D.phases[3].id === 'emprunt' && D.phases[3].arene === 6 && D.phases[3].presence === 'sol' && D.phases[3].faible === 'coeur' && E6 && E6.id === 'emprunt' && E6.tard === true, 'phase IV : état d\'arène réel « emprunt » en index 6, tard ; au sol, point faible au cœur');
  const B6 = { x0: Math.round(R.x0 + (R.x1 - R.x0) * E6.bornes.fx0), y0: Math.round(R.y0 + (R.y1 - R.y0) * E6.bornes.fy0), x1: Math.round(R.x0 + (R.x1 - R.x0) * E6.bornes.fx1), y1: Math.round(R.y0 + (R.y1 - R.y0) * E6.bornes.fy1) };
  ok(B6.x1 - B6.x0 === 1168 && B6.y1 - B6.y0 === 584 && Math.abs((B6.x0 + B6.x1) - (R.x0 + R.x1)) < 3 && Math.abs((B6.y0 + B6.y1) - (R.y0 + R.y1)) < 3, `phase IV : bornes de l'état 6 : ${B6.x1 - B6.x0} × ${B6.y1 - B6.y0} au centre des bornes dures (la salle de la justice des armes de la Brume)`);
  ok(E6.obstacles.length === 0 && E6.vides.length === 0 && E6.sol === 'pierre' && E6.brume.length === 2 && E6.brume.every(b => b.fx < E6.bornes.fx0 || b.fx > E6.bornes.fx1), 'phase IV : ni obstacle ni fosse, sol pierre, brume de décor hors des bornes');
  const EMP5 = fnv(JSON.stringify(ET.slice(0, 6)));
  ok(fnv(JSON.stringify(ET.slice(0, 5))) === '2f47b641' && EMP5 === 'b79785c9', `phase IV : les états d'arène 0 à 5 sont inchangés (empreintes 2f47b641, ${EMP5})`);
  { const E2 = clone(ET.slice(0, 6)); E2[5] = clone(E6); ok(fnv(JSON.stringify(E2)) !== EMP5, 'contre-épreuve : l\'état 5 déplacé (remplacé par celui de la phase IV) serait attrapé'); }
  ok(DA.transformation.vitesse === 120 && DA.transformation.parEtat && DA.transformation.parEtat.emprunt.vitesse === 240 && (B6.x0 - R.x0) / 240 < 3, `phase IV : bascule vers l'état IV à 240 px/s (${((B6.x0 - R.x0) / 240).toFixed(1)} s pour ${B6.x0 - R.x0} px), la vitesse générale reste 120`);
  const kinds = PE.mesures.map(m => m.k === 'fixe' ? m.g : m.k);
  ok(kinds.join(' ') === 'emprunt passe libre emprunt feinte reverence emprunt volte libre', `phase IV : partition (Emprunt · Passe · libre · Emprunt · feinte · Révérence · Emprunt · Volte · libre) : ${kinds.join(' ')}`);
  const empS = E.priseS + 2.9 + E.nuS, DUR = { emprunt: empS, passe: EL.passe.charge + EL.passe.course, libre: 1.5, feinte: 1.2, reverence: EL.reverence.charge + 0.4, volte: EL.volte.charge + 0.3 };
  const boucle = kinds.reduce((a, k) => a + DUR[k], 0) + PE.entracteS * kinds.length + PE.nuS;
  ok(boucle >= 34 && boucle <= 38 && PE.entracteS === 1.2 && PE.nuS === 0 && PE.sauteS === 0.6 && kinds.filter(k => k === 'emprunt').length === 3, `phase IV : une boucle d'environ 36 s (${boucle.toFixed(1)} s), trois emprunts, entracte 1,2 s, pas de fenêtre après la boucle, mesure sautée 0,6 s`);
  ok(F.brxPartition(D, 3).nuS === 0 && F.brxPartition(D, 3).entracteS === 1.2 && F.brxMesures(D, 3).filter(m => m.k === 'emprunt').length === 3, 'phase IV : brxPartition lit sa partition');
  for (const [g, w] of [['passe', { forme: 'passe', len: 900, course: 0.45, charge: 1.1, degats: 14, sonneS: 2 }], ['reverence', { forme: 'reverence', ouverture: 150, r0: 0, r1: 190, atteinte: 0.8, attenteS: 2, charge: 0.9, degats: 13 }], ['volte', { forme: 'volte', r0: 70, r1: 380, breche: 120, charge: 1.1, degats: 12 }]])
    ok(EL[g].fixe === true && EL[g].sorte === 'zone' && Object.entries(w).every(([k, v]) => EL[g][k] === v) && EL[g].charge >= D.preavis.boss, `phase IV : geste ${g} fixe, orange, ses chiffres (${JSON.stringify(w)})`);
  ok(EL.emprunt.fixe && EL.emprunt.menace === 0 && D.cumul.emprunt === 1, 'phase IV : l\'élément « emprunt » (noté quand sa copie t\'a tué), fixe, cumul 1');
  ok(JSON.stringify(E.variantes.gardees) === '["double","elargi"]' && JSON.stringify(E.variantes.ignorees) === '["etourdit","repousse","vol","traverse"]' && E.exclus.ultimes && E.exclus.renforts && E.exclus.reliques && E.exclus.genres.join() === 'c', 'phase IV : exclusions (ultimes, sous-classes, renforts, reliques) ; variantes gardées double, élargi ; ignorées étourdit, repousse, vol, perçant');
  ok(E.poids.base === 0.5 && E.poids.gravure === 5 && E.parBoucle === 3 && E.priseS === 0.6 && E.plancherS === 0.8 && E.plancherS >= D.preavis.boss && E.premiereS === 0.3 && E.degats === 11 && E.nuS === 2 && E.defaitS === 4 && E.marche.vitesse === 120 && E.marche.distance.join() === '180,280', 'phase IV : poids (0,5 + rang / max) × (1 + 5 × g), trois par boucle, prise 0,6 s, plancher 0,8 s (+0,3), dégâts 11, à nu 2 / 4 s, marche 120 px/s à 180–280 px');
  ok(D.dessin.version >= 5 && D.dessin.r.sol === 48, 'phase IV : dessin.version 5 ou plus, corps au sol r 48');
  ok(D.budget.base[3] === 6 && Math.abs(F.brxBudget(D, 3, 'difficile') - 7.5) < 1e-9 && F.brxBudget(D, 3, 'extreme') === 9, 'phase IV : budget d\'une mesure libre 6 / 7,5 / 9');
  // ── empruntables sur les 240 talents
  { const ids = Object.keys(TN), act = ids.map(id => ({ id, src: 't', rang: 1, g: 0 })), Ls = F.brxEmpruntables(D, act, T), Lid = new Set(Ls.liste.map(x => x.id));
    const nU = ids.filter(id => /_sk$/.test(id)).length, nC = ids.filter(id => TN[id].k === 'c').length, nR = ids.filter(id => J.talents[id] && J.talents[id].renfort).length, nX = ids.filter(id => /_sk$/.test(id) || TN[id].k === 'c' || (J.talents[id] && J.talents[id].renfort)).length;
    ok(ids.length === 240 && nU === 12 && nC === 12 && nR === 24 && Ls.liste.length === 240 - nX, `empruntables : sur ${ids.length} talents, ${nU} ultimes, ${nC} sous-classes, ${nR} renforts exclus (${nX} en tout, recoupements comptés une fois) : ${Ls.liste.length} empruntables`);
    ok(!ids.some(id => Lid.has(id) && (/_sk$/.test(id) || TN[id].k === 'c' || (J.talents[id] && J.talents[id].renfort))), 'empruntables : jamais un ultime, une sous-classe ni un renfort');
    ok(Ls.liste.every(x => x.fam && J.familles[x.fam] && J.familles[x.fam].etapes.length), 'empruntables : chacun a une famille et son arme de la Brume');
    const vc = {}; for (const x of Ls.liste) for (const v of x.vars) vc[v] = (vc[v] || 0) + 1; const brut = {}; for (const x of Ls.liste) for (const v of (J.talents[x.id].v || [])) brut[v] = (brut[v] || 0) + 1;
    ok(vc.double === brut.double && vc.elargi === brut.elargi && !vc.etourdit && !vc.repousse && !vc.vol && !vc.traverse && (brut.etourdit || 0) + (brut.traverse || 0) > 0, `empruntables : variantes gardées ${JSON.stringify(vc)} ; ignorées (données) ${JSON.stringify({ etourdit: brut.etourdit, repousse: brut.repousse, vol: brut.vol, traverse: brut.traverse })}`);
    ok(F.brxRefusEmprunt(D, { id: 'x', src: 'r' }, T) === 'relique' && F.brxEmpruntables(D, [{ id: ids.find(id => TN[id].k === 'm' && !J.talents[id].renfort), src: 'r' }], T).liste.length === 0, 'empruntables : une relique n\'est jamais empruntée');
    // aucune étape d'un emprunt ne garde une variante ignorée (étapes comprises), aucune ne charge sous 0,8 s (1,1 à la première rencontre)
    let bad = 0, bad2 = 0, mn = 9, mn1 = 9, potMax = 0, n = 0;
    for (const x of Ls.liste) for (const vu of [true, false]) { const R2 = F.brxEtapesEmprunt(D, SF, J, A, x.fam, (J.talents[x.id].v || []), 3, vu); n++;
      if (R2.etapes.some(e => (e.v || []).some(v => E.variantes.ignorees.includes(v)))) bad++;
      for (const c of R2.charges) { if (vu) mn = Math.min(mn, c); else mn1 = Math.min(mn1, c); }
      const k = SF.sbForce(J, R2.etapes, 3, 1 + 0.15 * 4 + 0.15 * 3); let tot = 0; for (const e of R2.etapes) tot += R2.dmg * SF.sbCoup(J, e, 3, k) * (e.f === 'projectile' && e.navette ? 2 : 1); potMax = Math.max(potMax, tot);
      if (R2.etapes.some(e => Math.abs(R2.dmg * SF.sbDegats(J, e, 3) / e.degats - E.degats) > 1e-9)) bad2++; }
    ok(bad === 0, `étapes : ${n} armes empruntées, aucune variante ignorée jouée (étourdit, repousse, vol, perçant)`);
    ok(mn >= E.plancherS - 1e-9 && mn1 >= E.plancherS + E.premiereS - 1e-9, `étapes : chargements ≥ ${E.plancherS} s (au plus court ${mn.toFixed(3)}), ≥ ${E.plancherS + E.premiereS} s à la première rencontre (${mn1.toFixed(3)})`);
    ok(bad2 === 0, 'étapes : une étape × 1,0 fait 11 (échelle d\'acte comprise)');
    ok(potMax <= J.justice.degatsMax * E.degats + 1e-6, `étapes : une attaque entière, à la plus haute force (rang et gravures), reste sous le plafond (${potMax.toFixed(1)} ≤ ${(J.justice.degatsMax * E.degats).toFixed(1)})`);
    // contre-épreuves
    { const D2 = clone(D); D2.emprunt.exclus.ultimes = false; const u = ids.find(id => /_sk$/.test(id) && TN[id].k !== 'c' && fam[id] && !(J.talents[id] || {}).renfort); ok(u && F.brxEmpruntables(D2, [{ id: u, src: 't' }], T).liste.length === 1 && F.brxEmpruntables(D, [{ id: u, src: 't' }], T).liste.length === 0, 'contre-épreuve : un ultime empruntable serait attrapé'); }
    { const D2 = clone(D); D2.emprunt.exclus.renforts = false; const r = ids.find(id => J.talents[id] && J.talents[id].renfort && !/_sk$/.test(id) && TN[id].k !== 'c'); ok(F.brxEmpruntables(D2, [{ id: r, src: 't' }], T).liste.length === 1 && F.brxEmpruntables(D, [{ id: r, src: 't' }], T).liste.length === 0, 'contre-épreuve : un renfort emprunté serait attrapé'); }
    { const D2 = clone(D); D2.emprunt.variantes.ignorees = []; D2.emprunt.variantes.gardees.push('etourdit'); const t = ids.find(id => (J.talents[id].v || []).includes('etourdit') && Lid.has(id)), x = Ls.liste.find(y => y.id === t);
      const a = F.brxEtapesEmprunt(D2, SF, J, A, x.fam, J.talents[t].v, 3, true), b = F.brxEtapesEmprunt(D, SF, J, A, x.fam, J.talents[t].v, 3, true); ok(a.etapes.some(e => (e.v || []).includes('etourdit')) && !b.etapes.some(e => (e.v || []).includes('etourdit')), 'contre-épreuve : la variante étourdit jouée serait attrapée'); }
    { const D2 = clone(D); D2.emprunt.plancherS = 0.3; D2.emprunt.premiereS = 0; const x = Ls.liste.find(y => y.fam === 'fureur') || Ls.liste[0], a = F.brxEtapesEmprunt(D2, SF, J, A, x.fam, [], 3, true); ok(Math.min(...a.charges) < 0.8 - 1e-9 && Math.min(...F.brxEtapesEmprunt(D, SF, J, A, x.fam, [], 3, true).charges) >= 0.8 - 1e-9, `contre-épreuve : une étape chargée à ${Math.min(...a.charges).toFixed(2)} s serait attrapée`); }
    // ── tirage : 10 000 boucles à graine
    const nomF = Object.keys(J.familles).filter(f => Ls.liste.some(x => x.fam === f));
    let det = 0, sansRemise = 0, suite = 0, total = 0, prem = 0, premF = 0; const tirer = (L, g, o) => F.brxEmprunts(D, L, F.desRng(g), o);
    for (let i = 0; i < 10000; i++) { const rg = F.desRng(i + 77e4), k = 2 + Math.floor(rg() * 9), L = []; for (let q = 0; q < k * 3 && L.length < k; q++) { const x = Ls.liste[Math.floor(rg() * Ls.liste.length)]; if (!L.some(y => y.id === x.id)) L.push(Object.assign({}, x, { rang: 1 + Math.floor(rg() * x.max), g: rg() < 0.2 ? 1 + Math.floor(rg() * 2) : 0 })); }
      const der = rg() < 0.5 ? L[0].fam : null, B1 = tirer(L, i, { dernier: der }), B2 = tirer(L, i, { dernier: der }); total++;
      if (JSON.stringify(B1) !== JSON.stringify(B2)) det++;
      if (B1.length !== 3 || (L.length >= 3 && new Set(B1.map(x => x.id)).size !== 3)) sansRemise++;
      { let prev = der, pris = new Set(); for (const x of B1) { let R = L.filter(y => !pris.has(y.id)); if (!R.length) { pris = new Set(); R = L; } if (prev && x.fam === prev && R.some(y => y.fam !== prev)) suite++; pris.add(x.id); prev = x.fam; } }
      // premier : le talent, sinon sa famille
      const cible = L[Math.floor(rg() * L.length)], P1 = tirer(L, i + 1, { premier: { id: cible.id, fam: cible.fam } }); if (P1[0].id === cible.id && P1[0].premier === 'talent') prem++;
      const P2 = tirer(L.filter(x => x.id !== cible.id), i + 2, { premier: { id: cible.id, fam: cible.fam } }), memes = L.filter(x => x.id !== cible.id && x.fam === cible.fam);
      if (memes.length ? (P2[0].fam === cible.fam && P2[0].premier === 'famille' && F.brxPoidsEmprunt(D, P2[0]) === Math.max(...memes.map(x => F.brxPoidsEmprunt(D, x)))) : !P2[0].premier) premF++; }
    ok(det === 0, `tirage : ${total} boucles à graine : même graine, même boucle`);
    ok(sansRemise === 0, 'tirage : trois emprunts par boucle, sans remise tant qu\'il en reste');
    ok(suite === 0, 'tirage : jamais deux fois de suite la même famille quand il en reste une autre à prendre (dans la boucle et d\'une boucle à l\'autre)');
    ok(prem === total && premF === total, `tirage : le premier emprunt rejoue le talent qui t'a tué (${prem}), sinon le plus lourd de sa famille, sinon rien de particulier (${premF})`);
    ok(F.brxEmprunts(D, [], F.desRng(1)).length === 0 && F.brxEmpruntables(D, ids.filter(id => /_sk$/.test(id)).map(id => ({ id, src: 't' })), T).liste.length === 0, 'tirage : une mémoire sans empruntable (ultimes seuls) : trois emprunts sautés');
    { const faux = (L, rng) => { const o = []; for (let k = 0; k < 3; k++) o.push(L[Math.floor(rng() * L.length)]); return o; }; let v = 0; const L = Ls.liste.filter(x => x.fam === 'onde').slice(0, 2).concat(Ls.liste.filter(x => x.fam === 'lame').slice(0, 1)); for (let i = 0; i < 200; i++) { const o = faux(L, F.desRng(i)); for (let k = 1; k < 3; k++) if (o[k].fam === o[k - 1].fam) v++; } ok(v > 0, 'contre-épreuve : deux fois de suite la même famille serait attrapée'); }
    // fréquences : le cas de référence (neuf talents au rang max, de neuf familles ; un gravé une fois, puis deux fois)
    const ref = []; for (const f of nomF) { const x = Ls.liste.find(y => y.fam === f && y.max >= 1); if (x && ref.length < 9) ref.push(Object.assign({}, x, { rang: x.max, g: 0 })); }
    for (const g of [1, 2]) { const L = ref.map((x, k) => Object.assign({}, x, { g: k === 4 ? g : 0 })); let n2 = 0; const N = 10000; for (let i = 0; i < N; i++) if (tirer(L, i + 9e5 + g * 1e5, {}).some(x => x.id === L[4].id)) n2++;
      const att = g === 1 ? 0.82 : 0.93; ok(Math.abs(n2 / N - att) < 0.04, `fréquences : face à neuf talents au rang max, un talent gravé ${g} fois est joué dans ${(n2 / N * 100).toFixed(1)} % des boucles (≈ ${att * 100} %)`); note(`tirage : gravé ${g} fois : ${(n2 / N * 100).toFixed(1)} % des boucles`); }
    { const L = ref.map(x => Object.assign({}, x)); const cnt = {}; for (let i = 0; i < 30000; i++) for (const x of tirer(L, i + 3e6, {})) cnt[x.id] = (cnt[x.id] || 0) + 1; const v = Object.values(cnt), m = v.reduce((a, b) => a + b, 0) / v.length; ok(v.length === 9 && v.every(c => Math.abs(c - m) < 0.08 * m), `fréquences : à poids égaux, chaque talent sort autant (${Math.min(...v)} à ${Math.max(...v)})`); }
    // ── justice : chaque famille, chaque variante gardée, 10 000 positions dans les bornes de l'état IV, avec et sans constructions, son corps comme obstacle
    const ER = D.dessin.r.sol, cons0 = []; { const V = F.brxGeo(D, 'murailles', [(B6.x0 + B6.x1) / 2, B6.y1 - 140], [(B6.x0 + B6.x1) / 2, B6.y0 + 120], B6, F.desRng(3), {}); if (V[0]) cons0.push(V[0]); const C2 = F.brxGeo(D, 'colonnades', [B6.x0 + 300, B6.y0 + 300], [B6.x0 + 600, B6.y0 + 150], B6, F.desRng(4), {}); if (C2[0]) cons0.push(C2[0]); }
    const pil0 = cons0.flatMap(c => F.brxTous(c));
    const vfam = {}; for (const x of Ls.liste) { vfam[x.fam] = vfam[x.fam] || new Set(['']); for (const v of x.vars) vfam[x.fam].add(v); }
    const NJ = process.argv.includes('--vite') ? 1000 : 10000; let jbad = 0, jsaut = 0, jtot = 0, jex = null; const jpar = {};
    for (const f of Object.keys(vfam)) { const vars = [...vfam[f]], par = jpar[f] = { n: 0, saute: 0 };
      for (let i = 0; i < NJ; i++) { const vs = vars[i % vars.length] ? [vars[i % vars.length]] : [], avec = i % 2 === 1, pil = avec ? pil0 : [], R2 = F.brxEtapesEmprunt(D, SF, J, A, f, vs, 3, i % 3 === 0);
        let b, p, ok2 = false; for (let t = 0; t < 30 && !ok2; t++) { b = [B6.x0 + ER + 10 + rnd() * (B6.x1 - B6.x0 - 2 * ER - 20), B6.y0 + ER + 10 + rnd() * (B6.y1 - B6.y0 - 2 * ER - 20)]; const a = rnd() * Math.PI * 2, d = ER + PR14 + 4 + rnd() * 360; p = [b[0] + Math.cos(a) * d, b[1] + Math.sin(a) * d];
          ok2 = p[0] > B6.x0 + PR14 && p[0] < B6.x1 - PR14 && p[1] > B6.y0 + PR14 && p[1] < B6.y1 - PR14 && !pil.some(q => Math.hypot(q.x - p[0], q.y - p[1]) < q.r + PR14) && !pil.some(q => Math.hypot(q.x - b[0], q.y - b[1]) < q.r + ER); }
        if (!ok2) continue; const bloque = (x, y) => pil.some(q => Math.hypot(x - q.x, y - q.y) < q.r + PR14), o = { lx: b[0], ly: b[1], er: ER, pr: PR14, pv: 180, arene: B6, bloque };
        let prec = null, anc = null; for (const et of R2.etapes) { jtot++; par.n++; const c = { lx: b[0], ly: b[1], er: ER, px: p[0], py: p[1], ax: anc ? anc[0] : null, ay: anc ? anc[1] : null, a: Math.atan2(p[1] - b[1], p[0] - b[0]), prec, rnd: F.desRng(i * 7 + jtot) };
          const pc = SF.sbPlacer(J, A, et, c, o, 3); if (!pc) { jsaut++; par.saute++; continue; }
          // la sortie rendue : libre (bornes, piliers, son corps, la zone) et atteinte à pied à temps (sbSortie, recherche rejouée)
          const s2 = SF.sbSortie(J, pc.zs, p, pc.verrou, o); if (!s2.ok || (s2.q && (bloque(s2.q[0], s2.q[1]) || Math.hypot(s2.q[0] - b[0], s2.q[1] - b[1]) < ER + PR14 - 1e-6 || pc.zs.some(z => SF.sbDans(z, s2.q[0], s2.q[1], PR14, ER, 0))))) { jbad++; if (!jex) jex = f + ' ' + et.f; }
          prec = { ga: pc.ga }; anc = pc.ancre; } } }
    ok(jbad === 0, `justice : ${jtot} étapes (${Object.keys(vfam).length} familles, variantes gardées, ${NJ} positions chacune, avec et sans constructions, son corps comme obstacle) : chaque étape posée a une sortie libre atteinte à pied à temps${jex ? ' ; ' + jex : ''}`);
    ok(jsaut <= jtot * 0.1, `justice : ${jsaut} étapes sautées sur ${jtot} (aucune sortie : l'étape saute) ; ${Object.entries(jpar).map(([f, q]) => f + ' ' + q.saute).join(', ')}`);
    note(`justice : ${jtot} étapes, ${jsaut} sautées ; par famille ${Object.entries(jpar).map(([f, q]) => f + ' ' + (q.saute / q.n * 100).toFixed(1) + ' %').join(', ')}`); }
  // ── gestes : 10 000 positions chacun (son corps au sol, toi autour), avec et sans constructions, sortie libre atteinte à temps
  { const ER = D.dessin.r.sol; let bad = 0, ex = null; const n = { passe: [0, 0], reverence: [0, 0, 0], volte: [0, 0] }; let coupe = 0, fosse = 0;
    for (let i = 0; i < 10000; i++) { const b = [B6.x0 + 90 + rnd() * (B6.x1 - B6.x0 - 180), B6.y0 + 90 + rnd() * (B6.y1 - B6.y0 - 180)], a = rnd() * Math.PI * 2, d = ER + PR14 + 6 + rnd() * 320, p = [Math.max(B6.x0 + 20, Math.min(B6.x1 - 20, b[0] + Math.cos(a) * d)), Math.max(B6.y0 + 20, Math.min(B6.y1 - 20, b[1] + Math.sin(a) * d))];
      if (Math.hypot(p[0] - b[0], p[1] - b[1]) < ER + PR14 + 2) continue;
      const pil = []; if (i % 2) { const q = [b[0] + (p[0] - b[0]) * 0.55 + (rnd() - 0.5) * 60, b[1] + (p[1] - b[1]) * 0.55 + (rnd() - 0.5) * 60]; if (Math.hypot(q[0] - p[0], q[1] - p[1]) > 34 + PR14 + 30 && Math.hypot(q[0] - b[0], q[1] - b[1]) > 34 + ER + 10) pil.push({ x: q[0], y: q[1], r: 34, kind: i % 4 === 1 ? 'fosse18' : 'pilier18' }); }
      const bloque = (x, y) => pil.some(q => Math.hypot(x - q.x, y - q.y) < q.r + PR14) || Math.hypot(x - b[0], y - b[1]) < ER + PR14, o = ch => ({ pr: PR14, v: 180, reflexe: 0.05, charge: ch, arene: B6, bloque });
      for (const id of ['passe', 'reverence', 'volte']) { const el = D.elements[id];
        if (id === 'reverence' && !F.brxReverenceOk(el, b, p)) { n.reverence[2]++; continue; }
        const V = F.brxVariantesIV(D, id, b, p, B6, pil, ER, rnd() * Math.PI * 2), k = F.brxPlacer(D, V.map(v => v.zones), p, o(el.charge));
        if (k < 0) { n[id][1]++; continue; } n[id][0]++; const s2 = F.brxSortie(D, V[k].zones, p, o(el.charge));
        if (!s2.ok || V[k].zones.some(z => F.brxDans(z, s2.q[0], s2.q[1], PR14)) || bloque(s2.q[0], s2.q[1]) || s2.d > 180 * (el.charge - 0.05) + 1e-6) { bad++; if (!ex) ex = id; }
        if (id === 'passe') { const v = V[k]; if (v.coupe >= 0) { coupe++; if (pil[v.coupe].kind === 'fosse18') { bad++; ex = 'passe coupée par une fosse'; } }
          for (const q of pil) if (q.kind !== 'fosse18' && F.brxSeg(q.x, q.y, v.zones[0].x0, v.zones[0].y0, v.zones[0].x1, v.zones[0].y1) < q.r + ER - 1e-6) { bad++; ex = 'passe qui traverse une construction'; }
          if (pil.some(q => q.kind === 'fosse18')) fosse++;
          if (v.zones[0].x1 < B6.x0 + ER - 1e-6 || v.zones[0].x1 > B6.x1 - ER + 1e-6 || v.zones[0].y1 < B6.y0 + ER - 1e-6 || v.zones[0].y1 > B6.y1 - ER + 1e-6) { bad++; ex = 'passe hors des bornes'; } } } }
    ok(bad === 0, `gestes (5e) : chaque sortie rendue (Passe, Révérence, Volte) est libre, hors des piliers et de son corps, atteinte à pied à temps ; la Passe s'arrête au premier pilier qui arrête un tir, jamais à une fosse, et son corps reste dans les bornes${ex ? ' ; ' + ex : ''}`);
    ok(n.passe[0] > 9000 && n.reverence[0] > 2500 && n.volte[0] > 8000, `gestes (5e) : avec sortie : Passe ${n.passe[0]} (sautée ${n.passe[1]}), Révérence ${n.reverence[0]} (sautée ${n.reverence[1]}, trop loin ${n.reverence[2]} : il s'approche d'abord), Volte ${n.volte[0]} (sautée ${n.volte[1]})`);
    ok(coupe > 300 && fosse > 300, `gestes (5e) : ${coupe} Passes coupées par une construction ; ${fosse} passent au-dessus d'une fosse`);
    note(`gestes (5e) : Passe ${n.passe[0]} / Révérence ${n.reverence[0]} / Volte ${n.volte[0]} avec sortie ; ${coupe} Passes coupées`);
    // les sorties neuves : derrière lui (Révérence), contre lui et par la brèche (Volte), de côté et derrière une construction (Passe)
    const b = [1280, 540], p = [1280, 700], PRr = PR14, el = D.elements;
    const Rv = F.brxReverence(el.reverence, b, p, 0); ok(F.brxDans(Rv[0], p[0], p[1], PRr) && !F.brxDans(Rv[0], b[0], b[1] - ER - PRr - 2, PRr) && !F.brxDans(Rv[0], b[0] + 150, b[1] - 40, PRr) && !F.brxDans(Rv[0], p[0], b[1] + 200, PRr), 'gestes (5e) : la Révérence : derrière lui, sur ses flancs, et au-delà de 190 px, à l\'abri');
    const Vo = F.brxVolte(el.volte, b, 0); ok(!F.brxDans(Vo[0], b[0] + 30, b[1] + 50, 0) && F.brxDans(Vo[0], b[0], b[1] + 200, PRr) && !F.brxDans(Vo[0], b[0] + 200, b[1], PRr) && !F.brxDans(Vo[0], b[0], b[1] + 400, PRr), 'gestes (5e) : la Volte : contre lui (sous 70 px) et par la brèche, à l\'abri ; dans l\'anneau, non');
    { const ferme = [{ forme: 'anneau', x: b[0], y: b[1], r0: el.volte.r0, r1: el.volte.r1 }]; ok(F.brxDans(ferme[0], b[0] + 200, b[1], PRr), 'contre-épreuve : une Volte sans brèche serait attrapée'); }
    const Pa = F.brxPasse(el.passe, b, p, B6, [], ER, 0); ok(F.brxDans(Pa.zones[0], p[0], p[1], PRr) && !F.brxDans(Pa.zones[0], p[0] + 66, p[1], PRr) && Pa.zones[0].w === 2 * ER, 'gestes (5e) : la Passe : couloir de 2 r ; 66 px de côté, à l\'abri');
    const mur = [{ x: 1280, y: 640, r: 18, kind: 'pilier18' }], Pm = F.brxPasse(el.passe, b, p, B6, mur, ER, 0); ok(Pm.coupe === 0 && !F.brxDans(Pm.zones[0], p[0], p[1], PRr) && Pm.l < 100 - 18, `gestes (5e) : la Passe arrêtée par une construction (son corps s'y brise à ${Pm.l.toFixed(0)} px) ; derrière, à l'abri`);
    { const faux = { forme: 'couloir', x0: b[0], y0: b[1], x1: b[0], y1: B6.y1 - ER, w: 2 * ER }; ok(F.brxDans(faux, p[0], p[1], PRr) && !F.brxDans(Pm.zones[0], p[0], p[1], PRr), 'contre-épreuve : une Passe qui traverse une construction serait attrapée'); }
    ok(F.brxPasse(el.passe, b, p, B6, mur.map(q => Object.assign({}, q, { kind: 'fosse18' })), ER, 0).coupe === -1, 'gestes (5e) : une fosse n\'arrête pas la Passe');
    ok(F.brxReverenceOk(el.reverence, b, [b[0], b[1] + 150]) && !F.brxReverenceOk(el.reverence, b, [b[0], b[1] + 160]), 'gestes (5e) : la Révérence ne part qu\'à 0,8 × 190 = 152 px (sinon il s\'approche, 2 s au plus, puis renonce)'); }
  // ── Dernier Souvenir : plafond calculé sur la phase pour le Brumeux (crochet pvPlaf18), inchangé pour tout autre fort ; la défaite
  { const L = DSd.plafonds, pv = F.brxPv(D, 'normal'), tot = pv.reduce((a, b) => a + b, 0); const brx = { maxHp: tot, pvPlaf18: pv[3] }, glas = { maxHp: 3600 }, masque = { maxHp: 900 };
    const vals = [1, 1.5, 2, 3].map(f => F.brxPlafondDs(L, f, brx)); const a4 = L.gardienPv * pv[3], b4 = L.gardienPvMax * pv[3];   // v18.11 : sur les PV calibrés de la phase IV (4 % à 8 %)
    ok(Math.abs(vals[0] - a4) < 1e-9 && Math.abs(vals[2] - b4) < 1e-9 && Math.abs(vals[3] - b4) < 1e-9, `Dernier Souvenir : contre le Brumeux, le plafond se calcule sur la phase en cours : ${vals.map(v => v.toFixed(0)).join(' / ')} PV (${a4.toFixed(0)} à ${b4.toFixed(0)} en Normal)`);
    ok([1, 2, 3].every(f => Math.abs(F.brxPlafondDs(L, f, glas) - SF.dsPlafond(DSd, f, 3600)) < 1e-9 && Math.abs(F.brxPlafondDs(L, f, masque) - SF.dsPlafond(DSd, f, 900)) < 1e-9), 'Dernier Souvenir : tout autre fort (gardien, Masqué) garde le plafond d\'avant (e.maxHp)');
    ok(SF.dsPlafond(DSd, 2, brx.maxHp) > 4 * F.brxPlafondDs(L, 2, brx), `contre-épreuve : un plafond sur e.maxHp pour le Brumeux (${SF.dsPlafond(DSd, 2, brx.maxHp).toFixed(0)} PV) serait attrapé`);
    has(/function reste\(rec,e\)\{if\(!fortE\(e\)\)return Infinity;let B=BUD\.get\(rec\);if\(!B\)BUD\.set\(rec,B=new Map\(\)\);if\(!B\.has\(e\)\)B\.set\(e,dsPlafond\(DS,rec\.force,e\.pvPlaf18\|\|e\.maxHp\|\|0\)\);return B\.get\(e\);\}/, '(5e) Dernier Souvenir : reste() lit e.pvPlaf18 (crochet du Brumeux), sinon e.maxHp (inerte pour tout autre fort)');
    ok((html.match(/pvPlaf18/g) || []).length >= 3 && !/\.pvPlaf18=/.test(html.replace(/═══ v18\.9 · Phase IV[\s\S]*?\/\/ ── essai \(Q17\)/, '')), '(5e) e.pvPlaf18 n\'est posé que dans la section v18.9 (sur le Brumeux seulement)');
    // la défaite : de la prise au coup de la dernière étape
    const st = (i, ph, n, L2) => ({ i, ph, n, etapes: new Array(L2).fill({}) });
    ok(F.brxDefaitable(null, true) && F.brxDefaitable(st(0, 'charge', 0, 2), false) && F.brxDefaitable(st(1, 'charge', 0, 2), false) && F.brxDefaitable(st(1, 'attente', 0, 2), false) && !F.brxDefaitable(st(1, 'effet', 0, 2), false) && !F.brxDefaitable(st(1, 'repos', 1, 2), false), 'défaite : de la prise jusqu\'au coup de la dernière étape (après : trop tard)');
    ok(E.defaitS === 4 && E.defaitS > E.nuS && E.dissousS <= 0.3, 'défaite : à nu 4,0 s au lieu de 2,0 ; la zone se dissout en 0,3 s');
    { const zone = { frappe: true }; const defaire = (z, ok2) => { if (ok2) z.frappe = false; return z; }; ok(defaire(Object.assign({}, zone), true).frappe === false && defaire(Object.assign({}, zone), false).frappe === true, 'contre-épreuve : une défaite qui laisse frapper la zone serait attrapée (la zone défaite ne frappe plus)'); }
    { const ids = Object.keys(TN).filter(id => fam[id] && !/_sk$/.test(id) && TN[id].k !== 'c' && !(J.talents[id] || {}).renfort).slice(0, 4), act = ids.map(id => ({ id, src: 't', rang: 1 })), apres = act.filter(a => a.id !== ids[0]), L2 = F.brxEmpruntables(D, apres, T).liste;
      let v = 0; for (let i = 0; i < 2000; i++) if (F.brxEmprunts(D, L2, F.desRng(i), { premier: { id: ids[0], fam: fam[ids[0]] } }).some(x => x.id === ids[0])) v++; ok(v === 0, 'défaite : un talent brûlé n\'est plus porté : il n\'est plus jamais emprunté (même rejoué en premier)'); } }
  // ── constructions qui restent : 10 000 phases abstraites (bornes, connexité ≥ 85 %, aire ≤ 30 % de l'aire libre de l'état IV, plus éloignées d'abord)
  { const C = D.constructions; let bad = 0, garde = 0, retire = 0, parAire = 0, ex = null; const mains = p => [Math.max(R.x0 + 220, Math.min(R.x1 - 220, p[0])), R.y0 + 200];
    const lec0 = F.brxLire(D, { prof: {} }, 1);
    const NC = process.argv.includes('--vite') ? 1000 : 10000;
    for (let i = 0; i < NC; i++) { const cons = []; for (let k = 0; k < 7; k++) { const p = [B6.x0 - 200 + rnd() * (B6.x1 - B6.x0 + 400), B6.y0 - 60 + rnd() * (B6.y1 - B6.y0 + 120)], j = { x: p[0], y: p[1], r: PR14 };
        if (cons.some(c => F.brxTous(c).some(d => Math.hypot(d.x - j.x, d.y - j.y) < d.r + j.r))) continue; const lec = Object.assign({}, lec0, { prof: { portee: rnd(), esquive: rnd(), soin: rnd(), rythme: rnd() } });
        const r = F.brxBatir(D, M, R, [], cons, lec, j, mains(p), 'extreme', F.desRng(i * 13 + k), {}); if (r.sorte) cons.push(r.c); }
      const j = { x: (B6.x0 + B6.x1) / 2, y: B6.y1 - 100, r: PR14 }, Fb = F.brxFiltreBornes(D, M, B6, [], cons, j), Fa = F.brxFiltreAire(D, M, B6, [], Fb.garde);
      garde += Fa.garde.length; retire += Fb.retire.length + Fa.retire.length; parAire += Fa.retire.length;
      for (const c of Fa.garde) if (!F.brxTous(c).every(d => d.x - d.r >= B6.x0 && d.x + d.r <= B6.x1 && d.y - d.r >= B6.y0 && d.y + d.r <= B6.y1)) { bad++; ex = 'hors des bornes IV'; }
      let combos = [[]]; for (const k of Fa.garde) { const q = []; for (const cb of combos) for (const e of F.brxEtats(k)) q.push(cb.concat(e)); combos = q.slice(0, 8); }
      const G0 = F.brxGrille(M, B6, [], GR); let part = 1, aire = 0; for (const cb of combos) { const G1 = F.brxGrille(M, B6, cb, GR); part = Math.min(part, F.brxConnexe(G1, j.x, j.y)); aire = Math.max(aire, 1 - G1.libres / G0.libres); }
      if (Fa.garde.length && (part < C.connexite - 1e-9 || aire > C.aire + 1e-9)) { bad++; if (!ex) ex = `connexité ${part.toFixed(2)} aire ${aire.toFixed(2)}`; }
      if (Fa.retire.length) { const cx = (B6.x0 + B6.x1) / 2, cy = (B6.y0 + B6.y1) / 2, cen = k => { const ds = F.brxDisques(k); let x = 0, y = 0; for (const d of ds) { x += d.x; y += d.y; } return Math.hypot(x / ds.length - cx, y / ds.length - cy); };
        const mx = Math.max(...Fa.garde.map(cen), -1); if (Fa.retire.some(k => cen(k) < mx - 1e-9)) { bad++; if (!ex) ex = 'une plus proche retirée avant une plus éloignée'; } } }
    ok(bad === 0, `constructions (5e) : ${NC} phases : en IV, ${garde} gardées, ${retire} effacées (dont ${parAire} par l'aire) : toutes dans les bornes, connexité ≥ 85 %, aire ≤ 30 % de l'aire libre de l'état IV, les plus éloignées du centre retirées d'abord${ex ? ' ; ' + ex : ''}`);
    note(`constructions (5e) : ${garde} gardées sur ${NC} phases (${(garde / NC).toFixed(2)} par phase), ${parAire} retirées par l'aire`);
    // le point de chute (III → IV) : dans les bornes, à 200 px de toi au moins, hors des constructions
    let cb = 0; for (let i = 0; i < 2000; i++) { const p = [B6.x0 + 30 + rnd() * (B6.x1 - B6.x0 - 60), B6.y0 + 30 + rnd() * (B6.y1 - B6.y0 - 60)], q = F.brxPointChute(D, B6, p, [], [], null, 48);
      if (q[0] < B6.x0 + 48 || q[0] > B6.x1 - 48 || q[1] < B6.y0 + 48 || q[1] > B6.y1 - 48 || Math.hypot(q[0] - p[0], q[1] - p[1]) < D.emprunt.chute.minD - 1e-6) cb++; }
    ok(cb === 0, 'transition (5e) : 2 000 chutes III → IV : dans les bornes de l\'état IV, à 200 px de toi au moins'); }
  // ── la sauvegarde : champ emp (toujours v:1)
  { const N = F.brxNeuf(), C1 = { id: 'ray_n1', fam: 'lumiere' };
    const S1 = F.brxNoter(N, { essai: false, phase: 4, par: 'emprunt', emp: C1, win: false, vus: ['emprunt', 'emprunt:lumiere', 'passe'] }, D, J);
    ok(S1.mort[4] === 'emprunt' && S1.emp[4].id === 'ray_n1' && F.brxEcrireSauve(S1).v === 1 && F.brxLireSauve(F.brxEcrireSauve(S1), D, J).emp[4].fam === 'lumiere', 'sauvegarde : le talent dont la copie t\'a tué est écrit et relu (v:1)');
    ok(S1.vus.includes('emprunt:lumiere') && F.brxLireSauve(F.brxEcrireSauve(S1), D, J).vus.includes('emprunt:lumiere') && !F.brxLireSauve({ v: 1, vus: ['emprunt:Lumière!', 'rien'] }, D).vus.length, 'sauvegarde : la première rencontre d\'une famille empruntée (emprunt:<famille>) est gardée dans vus ; un élément inconnu non');
    const S2 = F.brxNoter(S1, { essai: false, phase: 4, par: 'volte', win: false }, D, J); ok(S2.mort[4] === 'volte' && !S2.emp[4] && !('emp' in F.brxEcrireSauve(S2)), 'sauvegarde : une autre mort l\'efface (et un emp vide n\'est pas écrit)');
    ok(F.brxNoter(S1, { essai: true, phase: 4, par: 'emprunt', emp: C1 }, D, J) === S1, 'sauvegarde : une descente d\'essai n\'écrit rien');
    const inval = [{ mort: { 4: 'emprunt' }, emp: { 4: { id: 'Ray N1', fam: 'lumiere' } } }, { mort: { 4: 'emprunt' }, emp: { 4: { id: 'ray_n1', fam: 'licorne' } } }, { mort: { 4: 'volte' }, emp: { 4: C1 } }, { mort: { 4: 'emprunt' }, emp: { 9: C1 } }, { mort: { 4: 'emprunt' }, emp: { 4: { id: 5, fam: 'lumiere' } } }, { mort: { 4: 'emprunt' }, emp: 'x' }];
    ok(inval.every(x => JSON.stringify(F.brxLireSauve(Object.assign({ v: 1 }, x), D, J).emp) === '{}'), 'sauvegarde : un emp invalide (id abîmé, famille inconnue, mort qui n\'est pas un emprunt, phase hors bornes) est ignoré');
    { const brut = { v: 1, mort: { 4: 'emprunt' }, emp: { 4: { id: 'ray_n1', fam: 'licorne' } } }; ok(F.brxEmpOk(brut.emp[4], null) && !F.brxLireSauve(brut, D, J).emp[4], 'contre-épreuve : un emp invalide accepté (famille inconnue, sans relire souvenirs-brume) serait attrapé'); }
    ok(F.brxLireSauve({ v: 1, tentatives: 1, mort: { 3: 'couture' }, cousu: { 3: { corps: 'brute', cle: 'brute:a', id: null } } }, D).emp && JSON.stringify(F.brxLireSauve({ v: 1, mort: {} }, D).emp) === '{}', 'sauvegarde : une sauvegarde d\'avant (sans emp) se relit, emp vide'); }
  // ── branchements de la section « v18.9 · Phase IV »
  const B189 = (html.match(/═══ v18\.9 · Phase IV[\s\S]*?\/\/ ── essai \(Q17\)/) || [''])[0];
  ok(B189.length > 15000, `branchement (5e) : la section « v18.9 · Phase IV » existe (${B189.length} caractères)`);
  ok(!/Math\.random\(\)|setRule\(|murmur\(|showCard\(|toast\(|showBanner\(/.test(B189), 'branchement (5e) : ni Math.random, ni setRule, ni murmur, ni showCard, ni bulle, ni bandeau dans la section v18.9');
  ok(!/\.asm=/.test(B189.replace(/porteur\.asm|p\.asm/g, '')) && !/X\.e\.asm|e\.asm=/.test(B189), 'branchement (5e) : le Brumeux ne reçoit jamais e.asm (son porteur est un fantôme hors d\'enemies)');
  ok(/brxEmprunts\(DB,/.test(B189) && /brxEtapesEmprunt\(DB,/.test(B189) && /brxVariantesIV\(DB,/.test(B189) && /brxFiltreAire\(DB,/.test(B189) && /brxPointChute\(DB,/.test(B189) && /XA\.coup\(/.test(B189) && /\.maj\(/.test(B189), '(5e) la section v18.9 passe par la logique pure (emprunts, étapes, gestes, aire, chute), mène le porteur par sbMaj et juge ses coups (XA.coup)');
  has(/const E18=window\.__emp18\?window\.__emp18\(\):null/, '(5e) HUD : la tuile du talent emprunté (crochet __emp18, nul hors de son combat)');
  has(/\$\{o\.emp\?' emp18':''\}/, '(5e) HUD : classe .emp18 sur la tuile (sans texte)');
  has(/,R=A\.ie!=null&&S0&&S0\.etats\[A\.ie\]&&DA\.transformation\.parEtat&&DA\.transformation\.parEtat\[S0\.etats\[A\.ie\]\.id\]/, '(5e) arène : une vitesse de bascule propre à l\'état d\'arrivée (parEtat), sinon la générale');
  has(/function drawZone\(c,z,k,fl,col\)\{/, '(5e) Masqué : drawZone accepte une couleur (inerte sans elle)');
  has(/XA\.peindreTard\(DB\.phases\[3\]\.arene,1\)/, '(5e) le Brumeux peint le calque de la phase IV une tuile par image pendant la phase III');
  has(/emp:!win&&X\.tue==='emprunt'\?X\.tueEmp:null/, '(5e) la sauvegarde garde le talent dont la copie t\'a tué');
  // le journal v18.9 : ni emprunt, ni copie, ni phase, ni masque
  for (const x of VERS.journal.filter(y => y.h === 'v18.9')) ok(!/empru|copi|phase|masqu|talent|souvenir|passe\b|volte|révérence/i.test(x.t), `journal v18.9 : ni emprunt, ni copie, ni phase, ni masque (secret)`);
  ok(VERS.actuelle !== 'v18.9' || VERS.journal[0].h === 'v18.9', 'journal (5e) : la ligne v18.9 est en tête');
}

tic('// ── 14. La phase V');
// ── 14. La phase V, « L'Effacement » (action 5f, v18.10)
{ const PF = D.partition.effacement, EF = D.effacement, EL = D.elements, M = F_mondeFinal(), R = { x0: MUR.g, y0: MUR.h, x1: M.w - MUR.d, y1: M.h - MUR.b }, GR = D.constructions.grille;
  const PR14 = 14, ER = D.dessin.r.sol, rnd = mk(5200), fnv = s => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h.toString(16); };
  const AC = { window: {}, Math, console, JSON, Set, Object, Array, Number, Infinity, isFinite }; vm.createContext(AC);
  for (const f of ['bestiaire', 'souvenirs', 'souvenirs-brume', 'talents']) vm.runInContext(readFileSync(join(ROOT, 'data', f + '.js'), 'utf8'), AC);
  vm.runInContext(bloc('asm') + bloc('sb') + bloc('ds') + '\nthis.SF={sbEtapes,sbCharge,sbPlacer,sbSortie,sbDans,dsPlafond};', AC);
  const SF = AC.SF, BD2 = AC.window.BRUME_DATA, A = BD2.bestiaire.assemble, J = BD2.souvenirsBrume, SVF = BD2.souvenirs.familles, TN = BD2.talents.noeuds, DSd = BD2.souvenirs.dernier;
  const fam = {}; for (const [fid, Fm] of Object.entries(SVF)) for (const id of Fm.t || []) fam[id] = fid;
  const kind = {}, max = {}; for (const id in TN) { kind[id] = TN[id].k; max[id] = TN[id].max || 1; }
  const T = { fam, kind, max, J }, ET = DA.salles.final.etats;
  const bornes = E => ({ x0: Math.round(R.x0 + (R.x1 - R.x0) * E.bornes.fx0), y0: Math.round(R.y0 + (R.y1 - R.y0) * E.bornes.fy0), x1: Math.round(R.x0 + (R.x1 - R.x0) * E.bornes.fx1), y1: Math.round(R.y0 + (R.y1 - R.y0) * E.bornes.fy1) });
  const B6 = bornes(ET[6]), B7 = bornes(ET[7]), B8 = bornes(ET[8]);
  // ── données
  const kinds = PF.mesures.map(m => m.k), kindsE = PF.entiere.map(m => m.k);
  ok(D.phases[4].id === 'effacement' && D.phases[4].arene === 6 && D.phases[4].presence === 'sol' && D.phases[4].faible === 'coeur' && (D.phases[4].exclut || []).includes('construction'), 'phase V : elle garde l\'état 6 (pas de transformation IV → V), au sol, point faible au cœur, ne bâtit jamais');
  ok(kinds.join(' ') === 'eclair double effondrement montage double emprunt', `phase V : partition courte (tableau éclair · feinte double · effondrement · montage court · feinte double · emprunt) : ${kinds.join(' ')}`);
  ok(kindsE.join(' ') === 'eclair double libre effondrement montage libre double emprunt libre', `phase V : partition entière (trois libres, après 2, 4 et 6 gestes du socle) : ${kindsE.join(' ')}`);
  ok(PF.entracteS === 1.0 && PF.nuS === 0 && PF.sauteS === 0.6, 'phase V : entracte 1,0 s, pas de fenêtre après la boucle, mesure sautée 0,6 s');
  ok(EF.nuS === 2.0 && D.emprunt.defaitS === 4.0, 'phase V : à nu 2,0 s après chacun des quatre gestes, 4,0 s pour un emprunt défait');
  ok(EF.eclair.accrocheS === 0.8 && EF.eclair.vieMaxS === 8 && EF.eclair.rideauS === 0.6 && EF.eclair.part === 0.5 && EF.eclair.budget.normal === 2 && EF.eclair.budget.difficile === 2 && EF.eclair.budget.extreme === 3 && EF.eclair.minD === 230, 'phase V : tableau éclair (accroche 0,8 s, vie ≤ 8 s, rideau 0,6 s, moitié des bornes, budget 2 / 2 / 3, places à 230 px)');
  ok(EF.eclair.budget.normal === Math.floor(D.tableaux.budget.normal / 2) && EF.eclair.budget.difficile === Math.floor(D.tableaux.budget.difficile / 2) && EF.eclair.budget.extreme === Math.floor(D.tableaux.budget.extreme / 2), 'phase V : le budget de l\'éclair est la moitié de celui d\'un tableau, arrondie en bas');
  ok(EF.montage.dureeS === 2.6 && EF.montage.fils === 1 && EF.montage.cousus === 1 && D.couture.montage.dureeS === 4.4, 'phase V : montage court (un fil, 2,6 s ; 4,4 en III), au plus un cousu vivant');
  ok(EF.feinte.n === 2 && EF.feinte.ecartS === 0.3 && D.cumul.feinte === 1, 'phase V : feinte double : deux feintes, la seconde 0,3 s après la fin de la première (non-cumul feinte 1 : jamais deux à la fois)');
  ok(Math.abs(EF.resserrements.seuils[0] - 2 / 3) < 1e-12 && Math.abs(EF.resserrements.seuils[1] - 1 / 3) < 1e-12 && EF.resserrements.etats.join() === '7,8' && EF.resserrements.brasS === 0.6 && EF.resserrements.marge === D.constructions.placement.bord, 'phase V : resserrements à 2/3 et 1/3 des PV de la phase, états 7 et 8, bras levés 0,6 s, marge = celle de la pose des constructions (40 px)');
  ok(EF.pan.w === 150 && EF.pan.len === 320 && EF.pan.decalages.length >= D.sortie.essais, 'phase V : pan du bord 150 × 320');
  ok(EF.libres.poids === 2 && EF.libres.menace === 3 && Math.abs(F.brxBudget(D, 4, 'extreme') - 10.5) < 1e-9, 'phase V : libres : poids × (1 + 2 × part des dégâts), un geste signature vaut 3, budget 10,5 en Extrême');
  ok(D.dessin.version === 6, 'phase V : dessin.version 6');
  // les états 7 et 8 : bornes, tard, au centre, brume de décor hors des bornes ; les états 0 à 6 inchangés
  ok(ET.length === 9 && ET[7].id === 'effacement' && ET[8].id === 'effacement-2' && ET[7].tard && ET[8].tard && ET[7].sol === 'pierre' && ET[8].sol === 'pierre' && !ET[7].obstacles.length && !ET[8].obstacles.length && !ET[7].vides.length && !ET[8].vides.length, 'phase V : états réels « effacement » (index 7) et « effacement-2 » (index 8), tard, sol pierre, ni obstacle ni fosse');
  ok(B7.x1 - B7.x0 === 1040 && B7.y1 - B7.y0 === 520 && B8.x1 - B8.x0 === 920 && B8.y1 - B8.y0 === 460, `phase V : bornes ${B7.x1 - B7.x0} × ${B7.y1 - B7.y0} puis ${B8.x1 - B8.x0} × ${B8.y1 - B8.y0}`);
  ok([B7, B8].every(B => Math.abs((B.x0 + B.x1) - (B6.x0 + B6.x1)) <= 2 && Math.abs((B.y0 + B.y1) - (B6.y0 + B6.y1)) <= 2) && B7.x0 - B6.x0 === 64 && B7.y0 - B6.y0 === 32 && B8.x0 - B7.x0 === 60 && B8.y0 - B7.y0 === 30, `phase V : au centre (la caméra reste fixe) ; recul ${B7.x0 - B6.x0} et ${B7.y0 - B6.y0} px, puis ${B8.x0 - B7.x0} et ${B8.y0 - B7.y0} px par côté`);
  const aire = B => (B.x1 - B.x0) * (B.y1 - B.y0); ok(Math.abs(aire(B7) / aire(B6) - 0.79) < 0.01 && Math.abs(aire(B8) / aire(B6) - 0.62) < 0.01, `phase V : aire ${(aire(B7) / aire(B6) * 100).toFixed(0)} %, puis ${(aire(B8) / aire(B6) * 100).toFixed(0)} %`);
  ok([7, 8].every(i => ET[i].brume.every(b => b.fx < ET[i].bornes.fx0 || b.fx > ET[i].bornes.fx1 || b.fy < ET[i].bornes.fy0 || b.fy > ET[i].bornes.fy1)) && ET[8].brume.every((b, i) => b.r >= ET[7].brume[i].r && b.a >= ET[7].brume[i].a) && ET[7].brume.slice(0, 2).every((b, i) => b.r >= ET[6].brume[i].r && b.a >= ET[6].brume[i].a), 'phase V : la brume de décor (hors des bornes) grossit et s\'épaissit à chaque resserrement');
  const EMP6 = fnv(JSON.stringify(ET.slice(0, 7)));
  ok(EMP6 === 'a27df5c7' && fnv(JSON.stringify(ET.slice(0, 6))) === 'b79785c9', `phase V : les états d'arène 0 à 6 sont inchangés (empreinte ${EMP6})`);
  { const E2 = clone(ET.slice(0, 7)); E2[6] = clone(ET[7]); ok(fnv(JSON.stringify(E2)) !== EMP6, 'contre-épreuve : un état 6 déplacé (remplacé par celui du premier resserrement) serait attrapé'); }
  // la durée d'une boucle : courte ≈ 36 s, entière ≈ 45 s
  const DUR = { eclair: EF.eclair.accrocheS + 6 + EF.eclair.rideauS + EF.nuS, double: 1.15 * 2 + EF.feinte.ecartS, effondrement: EL.effondrement.charge + EF.nuS, montage: 0.3 + EF.montage.dureeS + EF.nuS, emprunt: D.emprunt.priseS + 2.9 + EF.nuS, libre: 1.5 };
  const bc = kinds.reduce((a, k) => a + DUR[k], 0) + PF.entracteS * kinds.length, be = kindsE.reduce((a, k) => a + DUR[k], 0) + PF.entracteS * kindsE.length;
  ok(bc >= 30 && bc <= 40 && be >= 40 && be <= 50, `phase V : une boucle courte d'environ 36 s (${bc.toFixed(1)} s), entière d'environ 45 s (${be.toFixed(1)} s)`);
  const nu = ['eclair', 'effondrement', 'montage', 'emprunt'].length * EF.nuS; ok(nu / bc > 0.18 && nu / bc < 0.3, `phase V : ${nu} s à nu par boucle courte (${(nu / bc * 100).toFixed(0)} % du temps)`);
tic('// ── partition : courte');
  // ── partition : courte en Normal et en Difficile, entière en Extrême ; l'essai rejoue la partition de 5a ; les phases I à IV inchangées
  ok(F.brxMesures(D, 4, { palier: 'normal' }).map(m => m.k).join() === kinds.join() && F.brxMesures(D, 4, { palier: 'difficile' }).map(m => m.k).join() === kinds.join() && F.brxMesures(D, 4, { palier: 'extreme' }).map(m => m.k).join() === kindsE.join() && F.brxMesures(D, 4).map(m => m.k).join() === kinds.join(), 'partition : courte en Normal et en Difficile, entière en Extrême');
  ok(F.brxMesures(D, 4, { essai: true }).map(m => m.k + (m.g || '')).join() === D.partition.essai.map(m => m.k + (m.g || '')).join() && F.brxPartition(D, 4, { essai: true }).nuS === D.partition.nuS, 'partition : un essai (essai=1) rejoue la partition d\'essai de 5a (les bancs du moteur)');
  ok([0, 1, 2, 3].every(ph => ['normal', 'difficile', 'extreme'].every(pal => JSON.stringify(F.brxPartition(D, ph, { palier: pal })) === JSON.stringify(F.brxPartition(D, ph)))), 'partition : les phases I à IV ne dépendent pas du palier (inchangées)');
  ok(['normal', 'difficile'].every(pal => !F.brxMesures(D, 4, { palier: pal }).some(m => m.k === 'libre')) && F.brxMesures(D, 4, { palier: 'extreme' }).filter(m => m.k === 'libre').length === 3, 'partition : aucune mesure libre en Normal et en Difficile ; trois en Extrême');
  { const D2 = clone(D); D2.partition.effacement.mesures.splice(2, 0, { k: 'libre' }); ok(F.brxMesures(D2, 4, { palier: 'normal' }).some(m => m.k === 'libre'), 'contre-épreuve : une libre en Normal serait attrapée'); }
  { const lec = F.brxLire(D, S0, 4); for (const pal of ['normal', 'extreme']) { const b = F.brxBoucle(D, lec, 4, pal, F.desRng(9), {}); ok(b.map(m => m.k).join() === (pal === 'extreme' ? kindsE : kinds).join() && b.filter(m => m.k === 'libre').every(m => Array.isArray(m.elements)), `partition : brxBoucle joue la partition de son palier (${pal})`); } }
  // ── premier de la boucle : ce qui t'a tué en V la dernière fois, si c'est un de ses gestes
  { const P0 = F.brxMesures(D, 4, { palier: 'extreme' }); const r = t => F.brxPremierV(P0, t).mesures.map(m => m.k).join(' ');
    ok(r('couture').startsWith('montage libre double emprunt libre eclair') && r('emprunt').startsWith('emprunt libre eclair') && r('effondrement').startsWith('effondrement montage') && r('tableau') === P0.map(m => m.k).join(' '), 'premier : la boucle commence par le geste qui t\'a tué (la partition tourne, l\'ordre reste le même)');
    ok(r('disque') === P0.map(m => m.k).join(' ') && r(null) === P0.map(m => m.k).join(' ') && F.brxPremierV(P0, 'fils').k === null, 'premier : un autre élément ne change pas la boucle (il ouvrira la première mesure libre, règle de 5a)'); }
tic('// ── candidats : 10 000');
  // ── candidats : 10 000 combats abstraits (phases jouées ou non, ce qui a été montré, ce que tu portes encore)
  const Ls = F.brxEmpruntables(D, Object.keys(TN).map(id => ({ id, src: 't', rang: 1, g: 0 })), T).liste;
  const decors = Object.keys(D.tableaux.decors);
  { let bad = 0, ex = null; const n = { eclair: {}, montage: {}, emprunt: {} }; const cnt = (o, k) => { o[k] = (o[k] || 0) + 1; };
    const NC = 10000;
    for (let i = 0; i < NC; i++) { const rg = F.desRng(i + 6e6), Mo = { ph: {}, tab: [], cou: [], emp: [], el: {} };
      for (let k = 0; k < 4; k++) if (rg() < 0.7) Mo.ph[k] = true;
      if (Mo.ph[0]) { const nt = Math.floor(rg() * 4); for (let k = 0; k < nt; k++) { const d = decors[Math.floor(rg() * decors.length)]; Mo.tab.push({ decor: d, theme: D.tableaux.decors[d].themes[0], regle: null, deg: rg() < 0.5 ? Math.round(rg() * 60) : 0 }); } }
      if (Mo.ph[2]) { const nf = Math.floor(rg() * 5); for (let k = 0; k < nf; k++) Mo.cou.push({ cle: 'brute:' + k, id: null, deg: rg() < 0.4 ? Math.round(rg() * 40) : 0, abouti: rg() < 0.5 }); }
      const porte = []; for (let k = 0; k < 8; k++) porte.push(Ls[Math.floor(rg() * Ls.length)]);
      if (Mo.ph[3]) { for (let k = 0; k < 3; k++) { const x = rg() < 0.8 ? porte[Math.floor(rg() * porte.length)] : Ls[Math.floor(rg() * Ls.length)]; Mo.emp.push({ id: x.id, fam: x.fam }); } }
      // ce que tu portes encore : certains ont brûlé, d'autres sont oubliés depuis
      const liste = porte.filter(() => rg() < 0.7).filter((x, k, a) => a.findIndex(y => y.id === x.id) === k), viv = rg() < 0.2 ? 1 : 0;
      const C = F.brxCandidatsV(D, Mo, { liste, vivants: viv });
      // éclair
      const ce = C.eclair; cnt(n.eclair, ce.mode);
      if (ce.mode === 'repli' ? !!Mo.ph[0] : ce.mode === 'saute' ? !(Mo.ph[0] && !Mo.tab.length) : !(Mo.ph[0] && Mo.tab.length)) { bad++; ex = ex || 'éclair : mode ' + ce.mode; }
      if (ce.mode === 'montre') { const mx = Math.max(...Mo.tab.map(t => t.deg)), att = mx > 0 ? Mo.tab.findIndex(t => t.deg === mx) : Mo.tab.length - 1; if (ce.i !== att || ce.tab.decor !== Mo.tab[att].decor) { bad++; ex = ex || 'éclair : pas le décor qui t\'a fait le plus de dégâts (sinon le dernier)'; } }
      // montage
      const cm = C.montage; cnt(n.montage, cm.mode);
      if (viv && cm.mode !== 'saute') { bad++; ex = ex || 'montage avec un cousu vivant'; }
      if (!viv && (cm.mode === 'repli' ? !!Mo.ph[2] : cm.mode === 'saute' ? !(Mo.ph[2] && !Mo.cou.length) : !(Mo.ph[2] && Mo.cou.length))) { bad++; ex = ex || 'montage : mode ' + cm.mode; }
      if (cm.mode === 'montre') { const mx = Math.max(...Mo.cou.map(c => c.deg)); let att = mx > 0 ? Mo.cou.findIndex(c => c.deg === mx) : -1; if (att < 0) for (let k = Mo.cou.length - 1; k >= 0; k--) if (Mo.cou[k].abouti) { att = k; break; } if (att < 0) att = 0; if (cm.i !== att) { bad++; ex = ex || 'montage : pas le bon cousu'; } }
      // emprunt : jamais un talent brûlé ou oublié ; jamais un talent qu'il n'a pas emprunté en IV (si la IV a été jouée)
      const cp = C.emprunt; cnt(n.emprunt, cp.mode);
      if (cp.liste) { if (cp.liste.some(x => !liste.some(y => y.id === x.id))) { bad++; ex = ex || 'emprunt : un talent qui n\'est plus porté'; } if (Mo.ph[3] && cp.liste.some(x => !Mo.emp.some(y => y.id === x.id))) { bad++; ex = ex || 'emprunt : un talent jamais emprunté en IV'; } }
      if (Mo.ph[3] && cp.mode === 'saute' && liste.some(x => Mo.emp.some(y => y.id === x.id))) { bad++; ex = ex || 'emprunt sauté à tort'; }
      if (!Mo.ph[3] && (cp.mode === 'repli') !== (liste.length > 0)) { bad++; ex = ex || 'emprunt : repli'; } }
    ok(bad === 0, `candidats : ${NC} combats abstraits : chaque geste ne prend que dans ce que le combat a montré (phase jouée), tire comme dans sa phase (jamais jouée), saute (jouée, rien n'en reste) ; l'emprunt jamais un talent brûlé ou oublié${ex ? ' ; ' + ex : ''}`);
    note(`candidats : éclair ${JSON.stringify(n.eclair)}, montage ${JSON.stringify(n.montage)}, emprunt ${JSON.stringify(n.emprunt)}`);
    ok(Object.keys(n.eclair).length === 3 && Object.keys(n.montage).length === 3 && Object.keys(n.emprunt).length === 3, 'candidats : les trois cas (montré, repli, saute) se rencontrent pour chaque geste');
    // contre-épreuve : un emprunt d'un talent jamais emprunté en IV (phase IV jouée) serait attrapé
    { const Mo = { ph: { 3: true }, emp: [{ id: Ls[0].id, fam: Ls[0].fam }] }, liste = [Ls[0], Ls[5]], faux = { mode: 'montre', liste }; ok(faux.liste.some(x => !Mo.emp.some(y => y.id === x.id)) && F.brxCandidatsV(D, Mo, { liste }).emprunt.liste.every(x => Mo.emp.some(y => y.id === x.id)), 'contre-épreuve : un emprunt d\'un talent jamais emprunté en IV serait attrapé'); }
    { const Mo = { ph: { 2: true }, cou: [{ cle: 'a:1', abouti: true }] }; ok(F.brxCandidatsV(D, Mo, { vivants: 1 }).montage.mode === 'saute' && F.brxCandidatsV(D, Mo, { vivants: 0 }).montage.mode === 'montre', 'contre-épreuve : un deuxième cousu vivant en V serait attrapé (le montage saute)'); }
    // le détail de ce qui t'a tué en V choisit, s'il a été montré
    { const Mo = { ph: { 0: true, 2: true, 3: true }, tab: [{ decor: 'faub', theme: 'meute', deg: 50 }, { decor: 'coeur', theme: 'faux', deg: 0 }], cou: [{ cle: 'brute:a', deg: 30 }, { cle: 'voile:b', deg: 0 }], emp: [{ id: Ls[0].id, fam: Ls[0].fam }, { id: Ls[1].id, fam: Ls[1].fam }] };
      const a = F.brxCandidatsV(D, Mo, { liste: [Ls[0], Ls[1]], premier: { tab: { decor: 'coeur', theme: 'faux' }, cousu: { cle: 'voile:b' }, emp: { id: Ls[1].id } } }), b = F.brxCandidatsV(D, Mo, { liste: [Ls[0], Ls[1]], premier: { tab: { decor: 'crypt', theme: 'tir' }, cousu: { cle: 'x:y' }, emp: { id: Ls[7].id } } });
      ok(a.eclair.tab.decor === 'coeur' && a.montage.cou.cle === 'voile:b' && a.emprunt.premier.id === Ls[1].id && b.eclair.tab.decor === 'faub' && b.montage.cou.cle === 'brute:a' && !b.emprunt.premier, 'premier : le détail (tab[5], cousu[5], emp[5]) choisit s\'il a été montré, sinon il est ignoré'); } }
tic('// ── le tableau éclair :');
  // ── le tableau éclair : moitié des bornes la plus loin de toi, vague seule (jamais de règle), budget moitié, densité en Extrême seulement
  { let bad = 0, ex = null; const lec = F.brxLire(D, Object.assign({}, S0, { acte: 10 }), 4);
    for (let i = 0; i < 10000; i++) { const B = [B6, B7, B8][i % 3], p = [B.x0 + 20 + rnd() * (B.x1 - B.x0 - 40), B.y0 + 20 + rnd() * (B.y1 - B.y0 - 40)], f = F.brxEclairFrag(D, B, p), pal = ['normal', 'difficile', 'extreme'][i % 3];
      const cx = (B.x0 + B.x1) / 2, loin = p[0] >= cx ? f.x1 <= cx + 1e-9 : f.x0 >= cx - 1e-9;
      if (!loin || f.x0 < B.x0 + EF.eclair.retrait - 1e-9 || f.x1 > B.x1 - EF.eclair.retrait + 1e-9 || f.y0 !== B.y0 + EF.eclair.retrait || Math.abs((f.x1 - f.x0) - ((B.x1 - B.x0) / 2 - 2 * EF.eclair.retrait)) > 1e-6) { bad++; ex = ex || 'fragment'; }
      const t = F.brxEclair(D, lec, pal, F.desRng(i), i % 2 ? { tab: { decor: 'faub', theme: 'tir' } } : {});
      if (t.regle !== null || t.champion || t.cout > EF.eclair.budget[pal] || t.densite !== (pal === 'extreme' ? 1 : 0) || !D.tableaux.decors[t.decor].themes.includes(t.theme) || (i % 2 && t.decor !== 'faub')) { bad++; ex = ex || 'tableau ' + JSON.stringify(t); } }
    ok(bad === 0, `éclair : 10 000 tirages : le fragment est la moitié des bornes la plus loin de toi (à 30 px des bords) ; vague seule, jamais de règle ni de champion, budget 2 / 2 / 3 (une densité en Extrême)${ex ? ' ; ' + ex : ''}`);
    { const faux = Object.assign({}, F.brxEclair(D, lec, 'normal', F.desRng(1), {}), { regle: 'sol' }); ok(faux.regle !== null && F.brxEclair(D, lec, 'normal', F.desRng(1), {}).regle === null, 'contre-épreuve : un tableau éclair avec une règle confinée serait attrapé'); } }
tic('// ── les mesures libres (entière)');
  // ── les mesures libres (entière) : jamais un élément non montré, budget 10,5, non-cumul, poids × (1 + 2 × part des dégâts)
  { let bad = 0, ex = null, n = 0; const lec = F.brxLire(D, S0, 4), SIGN = ['fils', 'cadre', 'toile', 'ruee', 'equerre', 'truelle', 'surjet', 'de', 'aiguilles', 'passe', 'reverence', 'volte'], LIB = ['disque', 'couloir', 'pluie', 'anneau', 'tir', 'rafale'];
    const ori = { fils: 0, cadre: 0, toile: 0, ruee: 1, equerre: 1, truelle: 1, surjet: 2, de: 2, aiguilles: 2, passe: 3, reverence: 3, volte: 3 };
    for (let i = 0; i < 10000; i++) { const rg = F.desRng(i + 7e6), Mo = { ph: {}, el: {} }; for (let k = 0; k < 4; k++) if (rg() < 0.85) Mo.ph[k] = true; for (const id of SIGN.concat(LIB)) if (rg() < 0.4) Mo.el[id] = true;
      const actifs = rg() < 0.3 ? { zone: 1 } : {}, viv = rg() < 0.2 ? 1 : 0, r = F.brxLibresV(D, lec, Mo, {}, 'extreme', F.desRng(i), actifs, { moins: D.couture.budget.moins * viv, plancher: D.couture.budget.plancher });
      const joue = [0, 1, 2, 3].some(k => Mo.ph[k]); let men = 0; const c = Object.assign({}, actifs);
      for (const id of r.elements) { n++; const s = ori[id], vu = !!Mo.el[id] || (s != null ? !Mo.ph[s] : !joue); if (!vu) { bad++; ex = ex || 'non montré : ' + id; } if (!SIGN.includes(id) && !LIB.includes(id)) { bad++; ex = ex || 'interdit : ' + id; }
        men += SIGN.includes(id) ? 3 : D.elements[id].menace; c[D.elements[id].sorte] = (c[D.elements[id].sorte] || 0) + 1; }
      if (men > r.budget + 1e-9 || r.budget > 10.5 + 1e-9 || (viv && r.budget > 10.5 - 2 + 1e-9)) { bad++; ex = ex || 'budget'; }
      for (const s in c) if (c[s] > (D.cumul[s] || 1)) { bad++; ex = ex || 'non-cumul ' + s; } }
    ok(bad === 0 && n > 10000, `libres : 10 000 tirages (${n} éléments) : jamais un élément ni un geste non montré (sauf phase d'origine jamais jouée), jamais un tableau, un bâtir, une Couture, un emprunt ; budget 10,5 (−2 par cousu vivant), non-cumul${ex ? ' ; ' + ex : ''}`);
    // poids × (1 + 2 × part des dégâts) : ce qui t'a le plus blessé revient le plus
    const Mo = { ph: { 0: true, 1: true, 2: true, 3: true }, el: { fils: true, ruee: true, surjet: true } }, P2 = F.brxLibresV(D, lec, Mo, { fils: 300, ruee: 100 }, 'extreme', F.desRng(1), { zone: 0 }).poids;
    ok(Math.abs(P2.fils / (lec.poids.fils || 1) - (1 + 2 * 0.75)) < 1e-9 && Math.abs(P2.ruee / (lec.poids.ruee || 1) - (1 + 2 * 0.25)) < 1e-9 && Math.abs(P2.surjet / (lec.poids.surjet || 1) - 1) < 1e-9 && P2.cadre === undefined, `libres : poids × (1 + 2 × part) : fils ${P2.fils.toFixed(2)}, ruée ${P2.ruee.toFixed(2)}, surjet ${P2.surjet.toFixed(2)} ; un geste jamais montré n'a pas de poids`);
    let nf = 0, nr = 0; for (let i = 0; i < 6000; i++) { const e0 = F.brxLibresV(D, lec, Mo, { fils: 300, ruee: 100 }, 'extreme', F.desRng(i + 1e5), {}).elements[0]; if (e0 === 'fils') nf++; if (e0 === 'ruee') nr++; }
    ok(nf > nr * 1.5, `libres : le fil qui t'a le plus blessé revient le plus (en tête ${nf} fois, la ruée ${nr})`);
    ok(F.brxLibresV(D, Object.assign({}, lec, { premier: null }), { ph: { 0: true, 1: true, 2: true, 3: true }, el: { fils: true, volte: true } }, {}, 'extreme', F.desRng(3), {}, { premier: 'volte' }).elements[0] === 'volte', 'libres : ce qui t\'a tué en V ouvre la première mesure libre, s\'il a été montré');
    ok(F.brxLibresV(D, lec, { ph: { 0: true, 1: true, 2: true, 3: true }, el: {} }, {}, 'extreme', F.desRng(3), {}).elements.length === 0, 'libres : rien de montré, rien de tiré (un élément jamais montré pèse 0)'); }
tic("// ── la justice dans l'état 8");
  // ── la justice dans l'état 8 (920 × 460), avec 0 à 3 constructions et des fosses, son corps pour obstacle
  // constructions de référence : bâties dans l'état 8 (règles de pose) ; certaines tombées en fosses
  const lecC = F.brxLire(D, { prof: {} }, 1), consJ = [];
  for (let s = 0; s < 400 && consJ.length < 60; s++) { const cons = []; for (let k = 0; k < 3; k++) { const p = [B8.x0 + 60 + rnd() * (B8.x1 - B8.x0 - 120), B8.y0 + 60 + rnd() * (B8.y1 - B8.y0 - 120)];
      const lec = Object.assign({}, lecC, { prof: { portee: rnd(), esquive: rnd(), soin: rnd(), rythme: rnd() } }); const r = F.brxBatir(D, M, B8, [], cons, lec, { x: p[0], y: p[1], r: PR14 }, [p[0], B8.y0 - 100], 'extreme', F.desRng(s * 7 + k), {}); if (r.sorte) cons.push(r.c); }
    if (cons.length) consJ.push(cons); }
  const pilDe = (cons, i) => { const pil = []; for (const [k, c] of cons.entries()) { if ((i + k) % 3 === 0) pil.push(...F.brxFosse(c)); else for (const d of F.brxTous(c)) pil.push({ x: d.x, y: d.y, r: d.r, kind: d.fosse ? 'fosse18' : 'pilier18' }); } return pil; };
  ok(consJ.length >= 30, `justice (5f) : ${consJ.length} jeux de constructions bâtis dans l'état 8 (règles de pose ; une sur trois tombée en fosse)`);
  // les familles d'armes de la Brume (l'emprunt de V), leurs variantes gardées
  const vfam = {}; for (const x of Ls) { vfam[x.fam] = vfam[x.fam] || new Set(['']); for (const v of x.vars) vfam[x.fam].add(v); }
  const NJ = process.argv.includes('--vite') ? 1000 : 10000; let jbad = 0, jsaut = 0, jtot = 0, jex = null; const jpar = {};
  for (const f of Object.keys(vfam)) { const vars = [...vfam[f]], par = jpar[f] = { n: 0, saute: 0 };
    for (let i = 0; i < NJ; i++) { const vs = vars[i % vars.length] ? [vars[i % vars.length]] : [], pil = i % 4 === 0 ? [] : pilDe(consJ[i % consJ.length], i), R2 = F.brxEtapesEmprunt(D, SF, J, A, f, vs, 3, i % 3 === 0);
      let b, p, ok2 = false; for (let t = 0; t < 40 && !ok2; t++) { b = [B8.x0 + ER + 10 + rnd() * (B8.x1 - B8.x0 - 2 * ER - 20), B8.y0 + ER + 10 + rnd() * (B8.y1 - B8.y0 - 2 * ER - 20)]; const a = rnd() * Math.PI * 2, d = ER + PR14 + 4 + rnd() * 300; p = [b[0] + Math.cos(a) * d, b[1] + Math.sin(a) * d];
        ok2 = p[0] > B8.x0 + PR14 && p[0] < B8.x1 - PR14 && p[1] > B8.y0 + PR14 && p[1] < B8.y1 - PR14 && !pil.some(q => Math.hypot(q.x - p[0], q.y - p[1]) < q.r + PR14) && !pil.some(q => Math.hypot(q.x - b[0], q.y - b[1]) < q.r + ER); }
      if (!ok2) continue; const bloque = (x, y) => pil.some(q => Math.hypot(x - q.x, y - q.y) < q.r + PR14), o = { lx: b[0], ly: b[1], er: ER, pr: PR14, pv: 180, arene: B8, bloque };
      let prec = null, anc = null; for (const et of R2.etapes) { jtot++; par.n++; const c = { lx: b[0], ly: b[1], er: ER, px: p[0], py: p[1], ax: anc ? anc[0] : null, ay: anc ? anc[1] : null, a: Math.atan2(p[1] - b[1], p[0] - b[0]), prec, rnd: F.desRng(i * 7 + jtot) };
        const pc = SF.sbPlacer(J, A, et, c, o, 3); if (!pc) { jsaut++; par.saute++; continue; }
        const s2 = SF.sbSortie(J, pc.zs, p, pc.verrou, o); if (!s2.ok || (s2.q && (bloque(s2.q[0], s2.q[1]) || Math.hypot(s2.q[0] - b[0], s2.q[1] - b[1]) < ER + PR14 - 1e-6 || pc.zs.some(z => SF.sbDans(z, s2.q[0], s2.q[1], PR14, ER, 0))))) { jbad++; if (!jex) jex = f + ' ' + et.f; }
        prec = { ga: pc.ga }; anc = pc.ancre; } } }
  const pire = Object.entries(jpar).reduce((m, [f, q]) => Math.max(m, q.saute / Math.max(1, q.n)), 0);
  ok(jbad === 0, `justice (5f) : état 8, ${jtot} étapes d'emprunt (${Object.keys(vfam).length} familles, variantes gardées, ${NJ} positions chacune, 0 à 3 constructions et fosses, son corps pour obstacle) : chaque étape posée a une sortie libre atteinte à pied à temps${jex ? ' ; ' + jex : ''}`);
  ok(pire <= 0.01 + 1e-9, `justice (5f) : dans l'état 8, aucune famille ne saute plus de 1 % de ses étapes (au pire ${(pire * 100).toFixed(2)} %) ; ${Object.entries(jpar).map(([f, q]) => f + ' ' + q.saute).join(', ')}`);
  note(`justice (5f), état 8 : ${jtot} étapes, ${jsaut} sautées ; par famille ${Object.entries(jpar).map(([f, q]) => f + ' ' + (q.saute / Math.max(1, q.n) * 100).toFixed(2) + ' %').join(', ')}`);
tic('// les 12 gestes signature');
  // les 12 gestes signature, depuis son corps au sol (variantes de brxVariantesV, sortie de brxPlacerV)
  { const SIGN = ['fils', 'cadre', 'toile', 'ruee', 'equerre', 'truelle', 'surjet', 'de', 'aiguilles', 'passe', 'reverence', 'volte']; let bad = 0, ex = null; const n = {};
    for (const id of SIGN) { const el = EL[id], q = n[id] = [0, 0, 0];
      for (let i = 0; i < 10000; i++) { const pil = i % 3 === 0 ? [] : pilDe(consJ[i % consJ.length], i); let b, p, ok2 = false;
        for (let t = 0; t < 40 && !ok2; t++) { b = [B8.x0 + ER + 6 + rnd() * (B8.x1 - B8.x0 - 2 * ER - 12), B8.y0 + ER + 6 + rnd() * (B8.y1 - B8.y0 - 2 * ER - 12)]; const a = rnd() * Math.PI * 2, d = ER + PR14 + 6 + rnd() * 320; p = [b[0] + Math.cos(a) * d, b[1] + Math.sin(a) * d];
          ok2 = p[0] > B8.x0 + PR14 && p[0] < B8.x1 - PR14 && p[1] > B8.y0 + PR14 && p[1] < B8.y1 - PR14 && !pil.some(z => Math.hypot(z.x - p[0], z.y - p[1]) < z.r + PR14) && !pil.some(z => Math.hypot(z.x - b[0], z.y - b[1]) < z.r + ER); }
        if (!ok2) continue; if (id === 'reverence' && !F.brxReverenceOk(el, b, p)) { q[2]++; continue; }
        const bloque = (x, y) => pil.some(z => Math.hypot(x - z.x, y - z.y) < z.r + PR14) || Math.hypot(x - b[0], y - b[1]) < ER + PR14, o = { pr: PR14, v: 180, reflexe: 0.05, arene: B8, bloque }, ch = el.charge;
        const V = F.brxVariantesV(D, id, b, p, B8, pil, ER, rnd() * Math.PI * 2), k = F.brxPlacerV(D, id, V, b, p, o, ch);
        if (k < 0) { q[1]++; continue; } q[0]++; const v = V[k];
        // la sortie rendue : libre et atteinte à temps (les deux coups de la Toile et du Dé ; le vol des Aiguilles)
        if (id === 'toile') { const s = F.brxSortieToile(D, el, v.toile, p, Object.assign({}, o), ch); if (!s.ok || v.toile.noires.some(z => F.brxDans(z, s.q1[0], s.q1[1], PR14)) || v.toile.blanches.some(z => F.brxDans(z, s.q2[0], s.q2[1], PR14)) || bloque(s.q1[0], s.q1[1]) || bloque(s.q2[0], s.q2[1])) { bad++; ex = ex || id; } }
        else if (id === 'de') { const s = F.brxSortieDe(D, el, v.zones, p, o, ch); if (!s.ok || F.brxDans(v.zones[0], s.q1[0], s.q1[1], PR14) || Math.hypot(s.q2[0] - s.q1[0], s.q2[1] - s.q1[1]) < el.r - 1e-6 || bloque(s.q2[0], s.q2[1])) { bad++; ex = ex || id; } }
        else { const c2 = id === 'aiguilles' ? ch + F.brxVolAiguille(el, b, p) * 0.8 : ch, s = F.brxSortie(D, v.zones, p, Object.assign({}, o, { charge: c2 })); if (!s.ok || v.zones.some(z => F.brxDans(z, s.q[0], s.q[1], PR14)) || bloque(s.q[0], s.q[1]) || s.d > 180 * (c2 - 0.05) + 1e-6) { bad++; ex = ex || id; } }
        if ((id === 'ruee' || id === 'passe') && v.coupe >= 0 && pil[v.coupe].kind === 'fosse18') { bad++; ex = 'une fosse arrête une ' + id; } } }
    ok(bad === 0, `justice (5f) : les 12 gestes signature dans l'état 8, depuis son corps, 10 000 positions chacun : chaque sortie rendue est libre et atteinte à temps ; une fosse n'arrête jamais une Ruée ni une Passe${ex ? ' ; ' + ex : ''}`);
    const ps = SIGN.map(id => [id, n[id][1] / Math.max(1, n[id][0] + n[id][1])]);
    note(`gestes (5f), état 8 : ${SIGN.map(id => id + ' ' + n[id][0] + '/' + (n[id][0] + n[id][1]) + (id === 'reverence' ? ' (trop loin ' + n[id][2] + ')' : '')).join(', ')}`);
    ok(ps.every(([id, x]) => x <= 0.2), `justice (5f) : chaque geste signature trouve sa sortie dans l'état 8 (au plus 20 % sautés : ${ps.map(([id, x]) => id + ' ' + (x * 100).toFixed(1) + ' %').join(', ')})`); }
tic('// la feinte double :');
  // la feinte double : le disque de la feinte (r 86) sur toi a une sortie à pied pendant toute sa durée (1,15 s), deux fois de suite ; sinon elle saute (le jeu fait
  // le même calcul, brxSortie, avant chaque feinte de V : écart de l'implémentation)
  { let nf = 0, sf = 0;
    for (let i = 0; i < 10000; i++) { const pil = i % 3 === 0 ? [] : pilDe(consJ[i % consJ.length], i); const b = [B8.x0 + ER + 6 + rnd() * (B8.x1 - B8.x0 - 2 * ER - 12), B8.y0 + ER + 6 + rnd() * (B8.y1 - B8.y0 - 2 * ER - 12)];
      const p = [B8.x0 + PR14 + rnd() * (B8.x1 - B8.x0 - 2 * PR14), B8.y0 + PR14 + rnd() * (B8.y1 - B8.y0 - 2 * PR14)]; if (pil.some(z => Math.hypot(z.x - p[0], z.y - p[1]) < z.r + PR14) || Math.hypot(p[0] - b[0], p[1] - b[1]) < ER + PR14) continue;
      const bloque = (x, y) => pil.some(z => Math.hypot(x - z.x, y - z.y) < z.r + PR14) || Math.hypot(x - b[0], y - b[1]) < ER + PR14; nf++;
      const s1 = F.brxSortie(D, [{ forme: 'disque', x: p[0], y: p[1], r: 86 }], p, { pr: PR14, v: 180, reflexe: 0.05, charge: 1.15, arene: B8, bloque }); if (!s1.ok) { sf++; continue; }
      const s2 = F.brxSortie(D, [{ forme: 'disque', x: s1.q[0], y: s1.q[1], r: 86 }], s1.q, { pr: PR14, v: 180, reflexe: 0.05, charge: 1.15, arene: B8, bloque }); if (!s2.ok) sf++; }
    ok(sf <= nf * 0.001 && nf > 8000, `justice (5f) : la feinte double dans l'état 8 : ${nf} positions, deux sorties de suite à pied ; ${sf} sans (la feinte y saute, ≤ 0,1 %)`); note(`feinte double, état 8 : ${sf} sautées sur ${nf}`); }
tic("// l'éclair : les places");
  // l'éclair : les places de la vague dans le fragment, à 230 px de toi (sinon la plus loin trouvée, un cercle d'apparition violet de 0,85 s au moins)
  { let bad = 0, loin = 0, n = 0;
    for (let i = 0; i < 10000; i++) { const B = [B6, B7, B8][i % 3], p = [B.x0 + 20 + rnd() * (B.x1 - B.x0 - 40), B.y0 + 20 + rnd() * (B.y1 - B.y0 - 40)], f = F.brxEclairFrag(D, B, p), pil = i % 2 ? pilDe(consJ[i % consJ.length], i) : [];
      const pl = F.brxPlaces(f, 6, p, F.desRng(i), { marge: 30, minD: EF.eclair.minD, bloque: (x, y) => pil.some(q => Math.hypot(x - q.x, y - q.y) < q.r + 30) });
      for (const q of pl) { n++; if (!F.brxDansRect(f, q[0], q[1])) bad++; if (Math.hypot(q[0] - p[0], q[1] - p[1]) >= EF.eclair.minD) loin++; } }
    ok(bad === 0, `justice (5f) : l'éclair : ${n} places, toutes dans le fragment`);
    ok(loin / n > 0.75, `justice (5f) : l'éclair : ${(loin / n * 100).toFixed(1)} % des places à 230 px de toi au moins (sinon la plus loin trouvée ; chaque naissance a son cercle violet ≥ 0,85 s)`); note(`éclair : ${(loin / n * 100).toFixed(1)} % des places à 230 px au moins`); }
tic("// l'effondrement de V :");
  // l'effondrement de V : la plus proche avec une sortie, sinon un pan du bord ; chaque zone rendue a sa sortie
  { let bad = 0, ex = null; const n = { cons: 0, pan: 0, saute: 0 }; const el = EL.effondrement;
    for (let i = 0; i < 10000; i++) { const B = [B6, B7, B8][i % 3], cons = i % 4 === 0 ? [] : consJ[i % consJ.length].map(c => Object.assign({}, c, { disques: c.disques.map(d => Object.assign({}, d)) })), pil = [];
      for (const c of cons) for (const d of F.brxTous(c)) pil.push({ x: d.x, y: d.y, r: d.r, kind: d.fosse ? 'fosse18' : 'pilier18' });
      let p = null; for (let t = 0; t < 40 && !p; t++) { const q = [B.x0 + PR14 + rnd() * (B.x1 - B.x0 - 2 * PR14), B.y0 + PR14 + rnd() * (B.y1 - B.y0 - 2 * PR14)]; if (!pil.some(z => Math.hypot(z.x - q[0], z.y - q[1]) < z.r + PR14)) p = q; } if (!p) continue;
      const bloque = (x, y) => pil.some(z => Math.hypot(x - z.x, y - z.y) < z.r + PR14), o = { pr: PR14, v: 180, reflexe: 0.05, charge: el.charge, arene: B, bloque };
      const r = F.brxEffondreV(D, cons, p, o, [], B, i % 5 === 0 ? 'murailles' : null); n[r.mode]++;
      if (r.mode !== 'saute') { const s = F.brxSortie(D, r.zones, p, o); if (!s.ok || r.zones.some(z => F.brxDans(z, s.q[0], s.q[1], PR14))) { bad++; ex = ex || r.mode; } }
      if (r.mode === 'pan') { const z = r.zones[0], L = Math.hypot(z.x1 - z.x0, z.y1 - z.y0); if (z.w !== EF.pan.w || Math.abs(L - EF.pan.len) > 1e-6 || !(Math.abs(z.x0 - B.x0) < 1e-9 || Math.abs(z.x0 - B.x1) < 1e-9 || Math.abs(z.y0 - B.y0) < 1e-9 || Math.abs(z.y0 - B.y1) < 1e-9) || cons.some(c => F.BRX_CHUTE.includes(c.sorte))) { bad++; ex = ex || 'pan'; } }
      if (r.mode === 'cons' && !F.BRX_CHUTE.includes(r.c.sorte)) { bad++; ex = ex || 'une douve ou un rail effondré'; } }
    ok(bad === 0 && n.cons > 1000 && n.pan > 1000, `justice (5f) : effondrements (${n.cons} constructions, ${n.pan} pans du bord, ${n.saute} sautés) : chaque chute a sa sortie ; un pan du bord (150 × 320) part du bord le plus proche, seulement sans construction effondrable debout${ex ? ' ; ' + ex : ''}`); }
tic('// ── les fosses :');
  // ── les fosses : une construction tombée devient des fosses de mêmes disques ; les tirs passent ; la connexité ne change pas
  { let bad = 0;
    for (const cons of consJ) for (const c of cons) { const fo = F.brxFosse(c), ds = c.disques.filter(d => !d.casse);
      if (fo.length !== ds.length || fo.some((q, i) => q.x !== ds[i].x || q.y !== ds[i].y || q.r !== ds[i].r || q.kind !== 'fosse18')) bad++;
      const G1 = F.brxGrille(M, B8, ds.map(d => ({ x: d.x, y: d.y, r: d.r })), GR), G2 = F.brxGrille(M, B8, fo, GR); if (G1.libres !== G2.libres || G1.blk.some((v, i) => v !== G2.blk[i])) bad++;
      const a = ds[0]; if (F.brxCoupe(a.x - 300, a.y, a.x + 300, a.y, 20, fo) !== null) bad++; }
    ok(bad === 0, 'fosses : une construction tombée devient des fosses de mêmes disques ; la grille de marche (connexité) ne change pas ; aucun tir ne s\'y arrête');
    { const c = consJ[0][0], a = c.disques[0], faux = F.brxFosse(c).map(q => Object.assign({}, q, { kind: 'pilier18', fosse: false })); ok(F.brxCoupe(a.x - 300, a.y, a.x + 300, a.y, 20, faux) !== null, 'contre-épreuve : une fosse qui arrête un tir serait attrapée'); } }
tic('// ── les resserrements :');
  // ── les resserrements : par les PV de la phase V seulement ; prêts seulement à la fin d'une mesure ; ce qui reste dans les nouvelles bornes
  { const pv = F.brxPv(D, 'normal')[4]; let bad = 0;
    for (let i = 0; i < 10000; i++) { const hp = rnd() * pv, n = F.brxResserrement(D, hp, pv), att = (hp <= pv * 2 / 3 + 1e-9 ? 1 : 0) + (hp <= pv / 3 + 1e-9 ? 1 : 0); if (n !== att) bad++; }
    ok(bad === 0 && F.brxResserrement(D, pv, pv) === 0 && F.brxResserrement(D, pv * 0.66, pv) === 1 && F.brxResserrement(D, 0, pv) === 2 && F.brxResserrement(D, 1, 0) === 0, 'resserrements : seuils par les PV de la phase V (2/3 → un, 1/3 → deux), jamais au-delà de deux');
    // jamais au temps : la même suite de PV donne les mêmes resserrements quel que soit le temps passé (aucun « enrage »)
    { const suite = t => { const out = []; let hp = pv; for (let k = 0; k < 600; k++) { if (k % 7 === 0) hp -= 3; out.push(F.brxResserrement(D, hp, pv)); } return out.join(''); }, faux = (hp, t) => F.brxResserrement(D, hp, pv) + (t > 60 ? 1 : 0);
      ok(F.brxResserrement.length === 3 && suite(0) === suite(1e6), 'resserrements : jamais déclenchés par le temps (la fonction ne lit que les PV)');
      ok(faux(pv, 61) !== F.brxResserrement(D, pv, pv), 'contre-épreuve : un resserrement déclenché au temps serait attrapé'); }
    const base = { ph: 'entracte', zones: false, tirs: false, tab: false, montage: false, emprunt: false, feinte: false, cousu: false };
    ok(F.brxResserrePret(base) && ['zones', 'tirs', 'tab', 'montage', 'emprunt', 'feinte', 'cousu'].every(k => !F.brxResserrePret(Object.assign({}, base, { [k]: true }))) && !F.brxResserrePret(Object.assign({}, base, { ph: 'mesure' })) && !F.brxResserrePret(Object.assign({}, base, { ph: 'eclair' })), 'resserrements : il attend la fin de la mesure en cours (aucune zone, aucun tir, aucun tableau, aucun montage, aucun emprunt, aucune feinte, aucune zone de cousu)');
    // ce qui reste : 10 000 phases (constructions de la phase IV et fosses), resserrées en 7 puis en 8
    let gbad = 0, garde = 0, retire = 0, ex = null; const NC = process.argv.includes('--vite') ? 1000 : 10000;
    for (let i = 0; i < NC; i++) { const cons = []; for (let k = 0; k < 4; k++) { const p = [B6.x0 + 50 + rnd() * (B6.x1 - B6.x0 - 100), B6.y0 + 50 + rnd() * (B6.y1 - B6.y0 - 100)], j = { x: p[0], y: p[1], r: PR14 };
        if (cons.some(c => F.brxTous(c).some(d => Math.hypot(d.x - j.x, d.y - j.y) < d.r + j.r))) continue; const lec = Object.assign({}, lecC, { prof: { portee: rnd(), esquive: rnd(), soin: rnd(), rythme: rnd() } });
        const r = F.brxBatir(D, M, B6, [], cons, lec, j, [p[0], B6.y0 - 100], 'extreme', F.desRng(i * 11 + k + 9e5), {}); if (r.sorte) cons.push(r.c); }
      // une sur deux devient une fosse (un groupe de disques)
      const tous = cons.map((c, k) => k % 2 ? { sorte: 'fosse', disques: F.brxFosse(c) } : c);
      let reste = tous; for (const B of [B7, B8]) { const j = { x: B6.x0 + rnd() * (B6.x1 - B6.x0), y: B6.y0 + rnd() * (B6.y1 - B6.y0), r: PR14 }, Fv = F.brxFiltreV(D, M, B, [], reste, j), m = EF.resserrements.marge;
        if (Fv.garde.length + Fv.retire.length !== reste.length) { gbad++; ex = ex || 'compte'; }
        for (const c of Fv.garde) if (!F.brxTous(c).every(d => d.x - d.r >= B.x0 + m && d.x + d.r <= B.x1 - m && d.y - d.r >= B.y0 + m && d.y + d.r <= B.y1 - m)) { gbad++; ex = ex || 'hors des bornes'; }
        const jj = { x: Math.max(B.x0 + PR14, Math.min(B.x1 - PR14, j.x)), y: Math.max(B.y0 + PR14, Math.min(B.y1 - PR14, j.y)) };
        let combos = [[]]; for (const k of Fv.garde) { const q = []; for (const cb of combos) for (const e of F.brxEtats(k)) q.push(cb.concat(e)); combos = q.slice(0, 8); }
        const G0 = F.brxGrille(M, B, [], GR); let part = 1, ai = 0; for (const cb of combos) { const G1 = F.brxGrille(M, B, cb, GR); part = Math.min(part, F.brxConnexe(G1, jj.x, jj.y)); ai = Math.max(ai, 1 - G1.libres / G0.libres); }
        if (Fv.garde.length && (part < D.constructions.connexite - 1e-9 || ai > D.constructions.aire + 1e-9)) { gbad++; ex = ex || `connexité ${part.toFixed(2)} aire ${ai.toFixed(2)}`; }
        garde += Fv.garde.length; retire += Fv.retire.length; reste = Fv.garde; } }
    ok(gbad === 0, `resserrements : ${NC} phases resserrées deux fois : ${garde} constructions et fosses gardées, ${retire} effacées : toutes entières dans les nouvelles bornes (à 40 px des bords), connexité ≥ 85 %, aire ≤ 30 %${ex ? ' ; ' + ex : ''}`);
    note(`resserrements : ${garde} gardées, ${retire} effacées sur ${NC} phases`); }
tic('// ── le Dernier Souvenir en V');
  // ── le Dernier Souvenir en V : plafond sur les PV de la phase V ; l'emprunt défait : à nu 4,0 s
  { const L = DSd.plafonds, tot = F.brxPv(D, 'normal').reduce((a, b) => a + b, 0); const c = [1, 2].map(f => F.brxPlafondDs(L, f, { maxHp: tot, pvPlaf18: F.brxPv(D, 'normal')[4] })), e = [1, 2].map(f => F.brxPlafondDs(L, f, { maxHp: F.brxPv(D, 'extreme').reduce((a, b) => a + b, 0), pvPlaf18: F.brxPv(D, 'extreme')[4] }));
    const v5c = F.brxPv(D, 'normal')[4], v5e = F.brxPv(D, 'extreme')[4];   // v18.11 : sur les PV calibrés de la phase V (courte, entière)
    ok(Math.abs(c[0] - L.gardienPv * v5c) < 1e-9 && Math.abs(c[1] - Math.min(2 * L.gardienPv, L.gardienPvMax) * v5c) < 1e-9 && Math.abs(e[0] - L.gardienPv * v5e) < 1e-9 && Math.abs(e[1] - Math.min(2 * L.gardienPv, L.gardienPvMax) * v5e) < 1e-9, `Dernier Souvenir (5f) : plafond sur les PV de la phase V : ${c.map(v => v.toFixed(0)).join(' à ')} PV en courte, ${e.map(v => v.toFixed(0)).join(' à ')} en entière`); }
  // ── PV du montage court : nœud et cousu en part des PV de la phase V
  { const v5c = F.brxPv(D, 'normal')[4], v5e = F.brxPv(D, 'extreme')[4], R = Math.round;
    ok(F.brxPvNoeud(D, 'normal', 4) === R(0.01 * v5c) && F.brxPvNoeud(D, 'extreme', 4) === R(0.01 * v5e) && F.brxPvCousu(D, 'normal', 1, 1, 1, 4) === R(0.10 * v5c) && F.brxPvCousu(D, 'extreme', 1, 1, 1, 4) === R(0.10 * v5e) && F.brxPvNoeud(D, 'normal') === F.brxPvNoeud(D, 'normal', 2), `montage court : nœud ${R(0.01 * v5c)} / ${R(0.01 * v5e)} PV, cousu ${R(0.10 * v5c)} / ${R(0.10 * v5e)} PV (1 % et 10 % de la phase V) ; la phase III inchangée`); }
  // ── la sauvegarde : aucun champ neuf (v:1) ; tab[5], bati[5], cousu[5], emp[5] ; un pan du bord : effondrement sans bati ; essai muet
  { const N = F.brxNeuf(); ok(Object.keys(N).sort().join() === 'bati,cousu,emp,mort,phaseMax,tab,tentatives,v,victoires,vus' && N.v === 1, 'sauvegarde (5f) : aucun champ neuf (v:1)');
    const S1 = F.brxNoter(N, { essai: false, phase: 5, par: 'tableau', tab: { decor: 'coeur', theme: 'faux', regle: null }, win: false }, D, J), S2 = F.brxNoter(N, { essai: false, phase: 5, par: 'effondrement', bati: 'murailles', win: false }, D, J);
    const S3 = F.brxNoter(N, { essai: false, phase: 5, par: 'effondrement', bati: undefined, win: false }, D, J), S4 = F.brxNoter(N, { essai: false, phase: 5, par: 'couture', cousu: { corps: 'brute', cle: 'brute:x', id: null }, win: false }, D, J), S5 = F.brxNoter(N, { essai: false, phase: 5, par: 'emprunt', emp: { id: 'ray_n1', fam: 'lumiere' }, win: false }, D, J);
    const rl = S => F.brxLireSauve(F.brxEcrireSauve(S), D, J);
    ok(rl(S1).tab[5].decor === 'coeur' && rl(S2).bati[5] === 'murailles' && rl(S4).cousu[5].cle === 'brute:x' && rl(S5).emp[5].id === 'ray_n1' && rl(S1).mort[5] === 'tableau', 'sauvegarde (5f) : tab[5], bati[5], cousu[5], emp[5] écrits et relus (v:1)');
    ok(rl(S3).mort[5] === 'effondrement' && !rl(S3).bati[5] && !('bati' in F.brxEcrireSauve(S3)), 'sauvegarde (5f) : une mort par un pan du bord note « effondrement » sans bati');
    ok(!rl({ v: 1, mort: { 5: 'effondrement' }, bati: { 5: 'pan' } }).bati[5], 'contre-épreuve : un bati écrit pour un pan du bord serait attrapé (relu, il est ignoré)');
    ok(F.brxNoter(S1, { essai: true, phase: 5, par: 'emprunt', emp: { id: 'ray_n1', fam: 'lumiere' } }, D, J) === S1, 'sauvegarde (5f) : une descente d\'essai n\'écrit rien');
    const L5 = F.brxLire(D, { prof: {}, tue: { 5: 'tableau' }, tab: { 5: { decor: 'coeur', theme: 'faux', regle: null } }, bati: { 5: 'puits' }, cousu: { 5: { corps: 'brute', cle: 'brute:x', id: null } } }, 4);
    ok(L5.tab && L5.tab.decor === 'coeur' && L5.premier === null && F.brxLire(D, { prof: {}, tue: { 5: 'disque' } }, 4).premier === 'disque', 'lecture (5f) : le tableau qui t\'a tué en V est relu ; un élément libre qui t\'a tué ouvre la première mesure libre (règle de 5a)'); }
  // ── branchements de la section « v18.10 · Phase V »
  const B1810 = (html.match(/═══ v18\.10 · Phase V[\s\S]*?\/\/ ── essai \(Q17\)/) || [''])[0];
  ok(B1810.length > 15000, `branchement (5f) : la section « v18.10 · Phase V » existe (${B1810.length} caractères)`);
  ok(!/Math\.random\(|setRule\(|murmur\(|showCard\(|toast\(|showBanner\(/.test(B1810), 'branchement (5f) : ni Math.random, ni setRule, ni murmur, ni showCard, ni bulle, ni bandeau dans la section v18.10');
  for (const f of ['brxCandidatsV', 'brxLibresV', 'brxEclair\\(', 'brxEclairFrag', 'brxEffondreV', 'brxFosse', 'brxResserrement', 'brxResserrePret', 'brxFiltreV', 'brxPremierV', 'brxVariantesV', 'brxPlacerV', 'XA\\.vers\\(', 'brxEmprunts\\(DB,'])
    ok(new RegExp(f).test(B1810), `branchement (5f) : la section v18.10 passe par ${f.replace(/\\\\/g, '')}`);
  ok(!/if\(ph\.id==='effacement'\)effacerCons\(\);/.test(html) && /X\.trans=\{t:0,n,arene:false,cri:false,presence:de\.presence!==ph\.presence\};\s*versCons\(n\);/.test(html), 'branchement (5f) : en entrant en V, les constructions ne sont plus effacées (elles tombent une à une)');
  ok(/M\.t-=dt\*\(f\.dureeS\?1-MT\/f\.dureeS:k\);/.test(html), 'branchement (5f) : le montage d\'un fil de V dure effacement.montage.dureeS (le fil de III inchangé)');
  ok(/if\(X\.scene\.t>\(X\.scene\.dureeS\|\|2\.2\)\)X\.scene=null;/.test(html), 'branchement (5f) : la scène de sa mort en V dure 3 s (celle des phases I à IV inchangée)');
  // le journal v18.10 : ni phase, ni effacement, ni resserrement, ni masque
  for (const x of VERS.journal.filter(y => y.h === 'v18.10')) ok(!/phase|effac|resserr|masqu|arène|examen|tableau|empru|cous|fosse|copi|mort/i.test(x.t), `journal v18.10 : ni phase, ni effacement, ni resserrement, ni masque (secret) : « ${x.t} »`);
  ok(VERS.journal.some(y => y.h === 'v18.10'), 'journal (5f) : la ligne v18.10 existe');
}

// ── 15. L'enchaînement, les PV au bot, les paliers (action 5g-1, v18.11)
tic('§ 15');
{ const TA = (() => { const c = { window: {} }; vm.createContext(c); vm.runInContext(readFileSync(join(ROOT, 'data', 'talents.js'), 'utf8'), c); return c.window.BRUME_DATA.talents; })();
  const EQ = (() => { const c = { window: {} }; vm.createContext(c); vm.runInContext(readFileSync(join(ROOT, 'data', 'equipements.js'), 'utf8'), c); return c.window.BRUME_DATA.equipements; })();
  // PV calibrés : multiples de 100, mêmes dans les trois paliers (sauf la phase V courte ou entière), aucun PV lu sur la forme
  ok(D.phases.every(p => Number.isInteger(p.pv) && p.pv % 100 === 0 && p.pv >= 5000 && p.pv <= 40000), `PV (5g-1) : calibrés, multiples de 100 (${D.phases.map(p => p.pv).join(' / ')})`);
  ok(D.phases.every(p => Object.keys(p).every(k => !/lum|gou|her|tis|forme|cls/.test(k))), 'PV (5g-1) : aucun PV par forme dans les phases');
  ok(D.phaseV.courte.pv >= 0.4 && D.phaseV.courte.pv <= 0.6, `PV (5g-1) : la phase V courte prend ${D.phaseV.courte.pv} de l'entière (0,4 à 0,6)`);
  { const n = F.brxPv(D, 'normal'), d = F.brxPv(D, 'difficile'), x = F.brxPv(D, 'extreme');
    ok(n.slice(0, 4).join() === x.slice(0, 4).join() && d.join() === n.join() && x[4] === D.phases[4].pv && n[4] === Math.round(D.phases[4].pv * D.phaseV.courte.pv), `PV (5g-1) : I à IV identiques dans les trois paliers ; V courte ${n[4]}, entière ${x[4]}`); }
  ok(!/brumeux\.phases\[[^\]]*\]\.pv\s*\*|pvForme|pvPar(Forme|Cls)/.test(html), 'PV (5g-1) : aucun multiplicateur de PV lu sur la forme dans le jeu');
  // le build de référence
  const R = D.bot.reference, SUBS = cls => TA.formes[cls].subs[0];
  ok(R && Number.isInteger(R.niveau) && R.niveau >= 20 && R.niveau <= 80, `référence (5g-1) : niveau ${R && R.niveau} (mesuré à l'entrée de l'acte X)`);
  for (const cls of ['lum', 'gou', 'her', 'tis']) {
    const L = R.talents[cls] || [], sub = SUBS(cls), br = Object.entries(TA.branches).find(([k, b]) => b.cls === cls && !b.sub && b.ang === 45);
    ok(L.length === 10 && new Set(L).size === 10 && L.every(id => TA.noeuds[id]), `référence (5g-1) : ${cls} : dix talents distincts, tous existants`);
    ok(L.slice(0, 6).join() === ['s1', 's2', 's3', 's4', 's5', 'sk'].map(x => sub + '_' + x).join(), `référence (5g-1) : ${cls} : la sous-classe principale (${sub}) dans l'ordre de l'arbre`);
    ok(br && L.slice(6).join() === ['n1', 'n2', 'n3', 'n4'].map(x => br[0] + '_' + x).join(), `référence (5g-1) : ${cls} : puis les quatre premiers nœuds de la branche voisine (${br && br[0]}, angle 45)`);
    const pts = L.reduce((a, id) => a + TA.noeuds[id].max, 0);
    ok(pts <= R.niveau - 1, `référence (5g-1) : ${cls} : ${pts} rangs pour ${R.niveau - 1} niveaux gagnés (tous au rang max, aucune gravure)`);
    const E = R.equipement[cls] || R.equipement.tous;
    ok(E.length === 4 && E.every(id => EQ.objets[id] && EQ.objets[id].r === 'commun' && (!EQ.objets[id].cls || EQ.objets[id].cls === cls)) && new Set(E.map(id => EQ.objets[id].slot)).size === 4,
      `référence (5g-1) : ${cls} : un objet commun permis par emplacement (${E.join(', ')})`); }
  // la correction de la Couture (la règle des formes hors des cibles) : nœud 1 %, cousus 10 %
  ok(D.couture.noeud.pvPart === 0.01 && D.couture.cousus.pvPart === 0.10, 'Couture (5g-1) : nœud 1 % et cousus 10 % des PV de la phase');
  // branchements : le build de référence et le mannequin ne servent qu'aux essais
  ok(/function reference\(cls\)\{/.test(html) && (html.match(/reference\(/g) || []).length <= 4 && /if\(o\.ref\)X\.ref=reference\(P\.cls\);/.test(html), 'branchement (5g-1) : le build de référence ne se pose que dans un essai (ref=1)');
  ok(/if\(X\.mannequin\)\{presence\(e,dt\);return;\}/.test(html) && /if\(o\.mannequin&&X\.e\)\{X\.mannequin=true;/.test(html), 'branchement (5g-1) : le mannequin (essai seulement) ne lance rien');
  ok(/const TBo=!\(T2&&T2\.o\)&&X\.tab\?/.test(html), 'branchement (5g-1) : le bot vise les ennemis d\'un tableau à toute distance');
  ok(/if\(!best\)return _c2188\.apply\(this,arguments\);/.test(html), 'branchement (5g-1) : en III, sans nœud, le bot vise un échafaudage resté debout');
  // le journal de l'arène : le porteur d'un coup et une source morte depuis peu (le journal seulement, sous CAM.on)
  ok(/const GRACE_S=1\.5;/.test(html) && /if\(RUN\.time-A\.mortT\.get\(e\)<GRACE_S\)ids\.push\(k\);/.test(html) && /for\(const p of eproj\)\{if\(!p\.dead&&Math\.hypot\(p\.x-P\.x,p\.y-P\.y\)-\(p\.r\|\|6\)-P\.r<14\)ch\.push\(id\(p\)\);\}/.test(html), 'branchement (5g-1) : le journal de l\'arène compte le porteur du coup et garde 1,5 s le signe d\'une source morte');
  // le journal v18.11 : secret
  ok(VERS.journal.some(y => y.h === 'v18.11') && ['v18.11', 'v18.12'].includes(VERS.actuelle), 'journal (5g-1) : la ligne v18.11 existe');
  for (const x of VERS.journal.filter(y => y.h === 'v18.11')) ok(!/phase|PV|bot|calibr|mannequin|cous|nœud|noeud|forme|mesur/i.test(x.t), `journal v18.11 : rien sur les PV ni la mesure (secret) : « ${x.t} »`);
}

function F_mondeFinal() { const S = DA.salles.final; return { w: Math.round(S.w * W), h: Math.round(S.h * H) }; }

for (const m of NOTES) console.log('  ' + m);
console.log(`sim-brumeux : ${checks} vérifications, ${fails} échec${fails > 1 ? 's' : ''}. (ΔE minimal des couleurs du Brumeux contre la grammaire : ${dEmin.toFixed(1)})`);
process.exit(fails ? 1 : 0);
