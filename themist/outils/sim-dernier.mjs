#!/usr/bin/env node
// La Brume · vérification hors navigateur du Dernier Souvenir (palier 5 de la Mémoire, cadrage v17.23 : DS1 à DS19)
// Extrait la logique pure d'index.html (bloc /*ds:pur*/, dans le bloc « v17 · La Mémoire ») et la fait tourner avec
// data/talents.js, data/souvenirs.js (dernier, familles, gravure), data/gardiens.js et data/bestiaire.js. Vérifie :
//  - les données : une entrée par famille qui a des talents (Fortune n'en a pas), clés connues, durées courtes et fixes, bornes ;
//  - ce qui brûle : les 240 talents, dans tous les états (actif, éteint, gravé, trophée, racine de voie, ultime, relique, effet en cours) ;
//  - la force : de 1 à 3 selon le genre, le rang et la gravure ;
//  - les braises : une par acte, rendue à l'acte suivant, jamais cumulée ;
//  - le combat : seulement en descente, salle non purifiée, ennemi vivant, sans écran, transition, mort ni étourdi ;
//  - les valeurs : quantités qui montent avec la force, durées qui ne montent pas, soin et bouclier plafonnés,
//    aucun contrôle contre un gardien ou un Masqué (remplacé par des dégâts), plafond de dégâts sur leurs PV ;
//  - le jeu : la table des effets en cours (DS_COURS) couvre les 12 ultimes et ne cite que des talents qui existent.
//   node themist/outils/sim-dernier.mjs
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
const pur = html.match(/\/\*ds:pur\*\/([\s\S]*?)\/\*\/ds:pur\*\//);
if (!pur) { console.error('Bloc /*ds:pur*/ introuvable'); process.exit(1); }
const ctx = { window: {}, Math, console };
vm.createContext(ctx);
for (const f of ['talents.js', 'souvenirs.js', 'gardiens.js', 'bestiaire.js']) vm.runInContext(readFileSync(join(ROOT, 'data', f), 'utf8'), ctx);
vm.runInContext(pur[1] + '\nthis.F={dsGenre,dsForce,dsRefus,dsBraises,dsDepense,dsCombat,dsValeurs,dsPlafond,dsMaintien};', ctx);
const F = ctx.F, D = ctx.window.BRUME_DATA, SV = D.souvenirs, DS = SV.dernier, N = D.talents.noeuds, G = D.gardiens, A = D.bestiaire.assemble;
let fails = 0, checks = 0;
const ok = (c, msg) => { checks++; if (!c) { fails++; console.error('ÉCHEC : ' + msg); } };
const fr = v => String(Math.round(v * 100) / 100).replace('.', ',');

ok(DS, 'souvenirs.js : dernier absent');
if (!DS) process.exit(1);
const FAM = {}; for (const [f, x] of Object.entries(SV.familles)) for (const id of x.t || []) FAM[id] = f;
const POIDS = SV.gravure.poids;

// 0. Données
ok(typeof DS.actif === 'boolean', 'dernier.actif : vrai ou faux');
ok(DS.parActe >= 1 && Number.isInteger(DS.parActe), 'dernier.parActe : entier ≥ 1');
ok(/^Key[A-Z]$/.test(DS.touche), 'dernier.touche : un code de touche (KeyX)');
ok(DS.maintienS > 0 && DS.maintienS <= 1, 'dernier.maintienS : entre 0 et 1 s');
ok(DS.invulS > 0 && DS.invulS <= 1, 'dernier.invulS : entre 0 et 1 s');
ok(DS.plafonds.gardienPv > 0 && DS.plafonds.gardienPvMax >= DS.plafonds.gardienPv, 'plafonds : gardienPv ≤ gardienPvMax');
ok(DS.plafonds.soinMax <= 0.5 && DS.plafonds.bouclierMax <= 0.5, 'plafonds : soin et bouclier ≤ 50 % des PV max');
// touches déjà prises en combat (index.html) : la touche du Dernier Souvenir ne doit pas en être une
const prises = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE', 'KeyR', 'KeyF', 'KeyC', 'KeyV', 'KeyP', 'KeyM', 'KeyH', 'KeyG', 'KeyB', 'KeyT', 'Space', 'Tab', 'Escape'];
ok(!prises.includes(DS.touche), `dernier.touche : ${DS.touche} est déjà prise en combat`);
for (const [f, x] of Object.entries(SV.familles)) {
  const E = DS.familles[f];
  if (!(x.t || []).length) { ok(!E, `famille ${f} : aucun talent, aucun effet attendu`); continue; }
  ok(E, `famille ${f} : ${x.t.length} talents mais pas d'effet de Dernier Souvenir`);
}
for (const [f, E] of Object.entries(DS.familles)) {
  ok(SV.familles[f], `dernier.familles.${f} : famille inconnue de souvenirs.js`);
  ok(E.n && E.d && E.n.length <= 22, `dernier.familles.${f} : nom (court) et texte`);
  const cles = { ...E.v, ...(E.fort || {}) };
  for (const k of E.monte || []) { ok(k in cles, `${f} : monte cite ${k}, absent des valeurs`); ok(!/S$/.test(k), `${f} : une durée (${k}) ne monte pas avec la force`); }
  for (const k of Object.keys(E.max || {})) ok((E.monte || []).includes(k), `${f} : max sur ${k}, qui ne monte pas`);
  for (const [k, v] of Object.entries(cles)) {
    ok(typeof v === 'number' && isFinite(v) && v >= 0, `${f}.${k} : nombre positif`);
    if (/S$/.test(k)) ok(v > 0 && v <= DS.dureeMaxS, `${f}.${k} : durée ${v} s (au plus ${DS.dureeMaxS})`);
  }
  for (const k of Object.keys(E.fort || {})) ok(!DS.controles.includes(k), `${f}.fort : ${k} est un contrôle`);
}

// 1. Ce qui brûle : 240 talents × états
const ids = Object.keys(N);
ok(ids.length === 240, `talents : ${ids.length} (240 attendus)`);
let brulables = 0;
const parGenre = {};
for (const id of ids) {
  const n = N[id], g = F.dsGenre(id, n.k), f = FAM[id];
  ok(f, `${id} : sans famille`);
  ok(['m', 's', 'x', 'k', 'c', 'u'].includes(g), `${id} : genre ${g}`);
  if (/_sk$/.test(id)) ok(g === 'u', `${id} : ultime`);
  const a = { id, src: 't', rang: 1, g: 0 };
  const r = F.dsRefus(DS, a, g, f, false);
  if (g === 'c') ok(r === 'genre', `${id} (racine de voie) : ne brûle pas (${r || 'brûle'})`);
  else ok(r === '', `${id} : devrait brûler (${r})`);
  if (!r) { brulables++; parGenre[g] = (parGenre[g] || 0) + 1; }
  ok(F.dsRefus(DS, { ...a, trophee: 1 }, g, f, false) === (g === 'c' ? 'trophee' : 'trophee'), `${id} : un trophée ne brûle pas`);
  if (g !== 'c') ok(F.dsRefus(DS, { ...a, g: 2, rang: n.max || 1 }, g, f, false) === '', `${id} gravé deux fois : brûle`);
  if (g !== 'c') ok(F.dsRefus(DS, a, g, f, true) === 'enCours', `${id} : son effet en cours, la brûlure attend`);
}
ok(F.dsRefus(DS, { id: 'wax', src: 'r', rang: 1 }, 'r', 'garde', false) === 'relique', 'une relique ne brûle pas');
ok(F.dsRefus(DS, { id: 'x', src: 't', rang: 1 }, 'm', 'fortune', false) === 'famille', 'une famille sans effet ne brûle pas');
ok(brulables === 228, `brûlables : ${brulables} (228 attendus : 240 moins 12 racines)`);

// 2. Force
let fmin = Infinity, fmax = 0;
for (const id of ids) {
  const n = N[id], g = F.dsGenre(id, n.k);
  for (let r = 1; r <= (n.max || 1); r++) for (let gv = 0; gv <= SV.gravure.max; gv++) {
    const v = F.dsForce(DS, POIDS, g, r, gv); fmin = Math.min(fmin, v); fmax = Math.max(fmax, v);
    if (gv > 0) ok(v > F.dsForce(DS, POIDS, g, r, gv - 1), `${id} : la gravure ${gv} renforce`);
    if (r > 1) ok(v > F.dsForce(DS, POIDS, g, r - 1, gv), `${id} : le rang ${r} renforce`);
  }
}
ok(Math.abs(fmin - 1) < 1e-9, `force minimale ${fmin} (1 attendu)`);
ok(Math.abs(fmax - 3) < 1e-9, `force maximale ${fmax} (3 attendu : nœud clé ou ultime gravé deux fois)`);

// 3. Braises
let st = null;
ok(F.dsBraises(st, 1, DS) === DS.parActe, 'acte I : une braise au départ');
st = F.dsDepense(st, 1, DS); ok(st && st.reste === DS.parActe - 1, 'dépenser : il en reste une de moins');
for (let k = 0; k < DS.parActe; k++) st = F.dsDepense(st, 1, DS) || st;
ok(F.dsBraises(st, 1, DS) === 0 && F.dsDepense(st, 1, DS) === null, 'acte I : plus de braise, la dépense est refusée');
ok(F.dsBraises(st, 2, DS) === DS.parActe, 'acte II : la braise revient');
ok(F.dsBraises({ acte: 1, reste: DS.parActe }, 2, DS) === DS.parActe, 'non cumulable : une braise gardée à l\'acte I ne s\'ajoute pas à celle de l\'acte II');
let total = 0; st = null;
for (let acte = 1; acte <= 3; acte++) for (let k = 0; k < 5; k++) { const n = F.dsDepense(st, acte, DS); if (n) { st = n; total++; } }
ok(total === 3 * DS.parActe, `une descente : ${total} brûlures au plus (${3 * DS.parActe} attendues)`);

// 4. Combat
const base = { jeu: true, hub: false, ecran: false, transition: false, mort: false, etourdi: false, purifiee: false, vivants: 3 };
ok(F.dsCombat(base), 'combat ordinaire : oui');
for (const k of ['hub', 'ecran', 'transition', 'mort', 'etourdi', 'purifiee']) ok(!F.dsCombat({ ...base, [k]: true }), `combat : non si ${k}`);
ok(!F.dsCombat({ ...base, jeu: false }), 'combat : non hors jeu');
ok(!F.dsCombat({ ...base, vivants: 0 }), 'combat : non sans ennemi vivant');
ok(!F.dsCombat(null), 'combat : non sans contexte');

// 5. Valeurs
const forces = [1, 1.5, 2, 2.5875, 3];
for (const [f, E] of Object.entries(DS.familles)) {
  for (const fort of [false, true]) {
    let prev = null;
    for (const fo of forces) {
      const v = F.dsValeurs(DS, f, fo, fort);
      ok(v && Object.keys(v).length, `${f} : valeurs vides (force ${fo}${fort ? ', gardien' : ''})`);
      for (const k of Object.keys(v)) {
        if (/S$/.test(k)) ok(v[k] === (fort ? { ...E.v, ...E.fort } : E.v)[k], `${f}.${k} : la durée ne change pas avec la force`);
        if (prev && (E.monte || []).includes(k)) ok(v[k] >= prev[k] - 1e-9, `${f}.${k} : ne baisse pas quand la force monte`);
        if (E.max && E.max[k] != null) ok(v[k] <= E.max[k] + 1e-9, `${f}.${k} : au plus ${E.max[k]}`);
      }
      if ('soin' in v) ok(v.soin <= DS.plafonds.soinMax + 1e-9, `${f} : soin ${v.soin} au plus ${DS.plafonds.soinMax}`);
      if ('bouclier' in v) ok(v.bouclier <= DS.plafonds.bouclierMax + 1e-9, `${f} : bouclier ${v.bouclier} au plus ${DS.plafonds.bouclierMax}`);
      if (fort) {
        for (const k of DS.controles) ok(!(k in v), `${f} contre un gardien : aucun contrôle (${k})`);
        ok((E.monte || []).some(k => k in v), `${f} contre un gardien : il reste un effet qui monte avec la force`);
      }
      prev = v;
    }
  }
}
ok(F.dsValeurs(DS, 'fortune', 1, false) === null, 'fortune : aucune valeur');

// 6. Plafonds sur les gardiens et le Masqué
const cibles = [['Mère-Brume', G.pv[1] * G.pvMul[1]], ['Héraut Noyé', G.pv[2] * G.pvMul[2]], ['Glas Originel', G.pv[3] * G.pvMul[3]]];
const pvMasque = A.pv || (A.stats && A.stats.pv);
if (pvMasque) cibles.push(['Masqué', pvMasque]);
for (const [nom, pv] of cibles) for (const fo of [1, 2, 3]) {
  const p = F.dsPlafond(DS, fo, pv);
  ok(p <= DS.plafonds.gardienPvMax * pv + 1e-6, `${nom} : plafond ${p} ≤ ${DS.plafonds.gardienPvMax * 100} % des PV`);
  ok(p > 0, `${nom} : plafond positif`);
  if (fo === 1) ok(Math.abs(p - DS.plafonds.gardienPv * pv) < 1e-6, `${nom} : force 1 → ${DS.plafonds.gardienPv * 100} % des PV`);
}

// 7. Maintien
ok(F.dsMaintien(0, DS) === 0 && F.dsMaintien(DS.maintienS, DS) === 1 && F.dsMaintien(DS.maintienS * 3, DS) === 1 && F.dsMaintien(-1, DS) === 0, 'maintien : de 0 à 1');

// 8. Le jeu : effets en cours
const m = html.match(/const DS_COURS=\{([\s\S]*?)\};/);
ok(m, 'index.html : table DS_COURS introuvable');
if (m) {
  const cles = [...m[1].matchAll(/(?:^|[,{\s])([a-z]{3}_[a-z0-9]+):/g)].map(x => x[1]);
  for (const k of cles) ok(N[k], `DS_COURS : ${k} n'est pas un talent`);
  for (const id of ids.filter(id => /_sk$/.test(id))) ok(cles.includes(id), `DS_COURS : l'ultime ${id} (${N[id].name}) manque`);
}
ok(/if\(inRes\('t',id\)\|\|brule\(id\)\)return false;/.test(html), 'index.html : nodeAvailable doit refuser un talent brûlé');
ok(!/function burn[\s\S]{0,1500}reserveBrume\.push/.test(html), 'index.html : burn ne doit rien pousser dans la réserve');

// Tableau de lecture
console.log(`Dernier Souvenir : ${DS.actif ? 'actif' : 'pas encore actif (données et logique prêtes)'} · touche ${DS.touche.replace('Key', '')} maintenue ${fr(DS.maintienS)} s · ${DS.parActe} braise par acte`);
console.log(`brûlables : ${brulables} talents (${Object.entries(parGenre).map(([g, n]) => g + ' ' + n).join(', ')}) ; force de ${fr(fmin)} à ${fr(fmax)}`);
console.log('\nfamille      effet               force 1                                   force 3                                   contre un gardien (force 1)');
const txt = v => Object.entries(v).map(([k, x]) => k + ' ' + fr(x)).join(', ');
for (const f of Object.keys(DS.familles)) {
  const E = DS.familles[f];
  console.log(`${f.padEnd(12)} ${E.n.padEnd(19)} ${txt(F.dsValeurs(DS, f, 1, false)).padEnd(41)} ${txt(F.dsValeurs(DS, f, 3, false)).padEnd(41)} ${txt(F.dsValeurs(DS, f, 1, true))}`);
}
console.log('\nplafond d\'une brûlure (PV) :  force 1 · 2 · 3');
for (const [nom, pv] of cibles) console.log(`  ${nom.padEnd(14)} ${Math.round(pv)} PV : ${[1, 2, 3].map(fo => Math.round(F.dsPlafond(DS, fo, pv))).join(' · ')}`);
console.log(`\n${checks} vérifications, ${fails} échec(s)`);
process.exit(fails ? 1 : 0);
