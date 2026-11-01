#!/usr/bin/env node
// La Brume · vérification hors navigateur de la grande descente (v18, action 2 : la charpente)
// Extrait la logique pure d'index.html (bloc /*des:pur*/) et la fait tourner avec data/gardiens.js, data/descente.js,
// data/bestiaire.js (montee) et data/icones.js. Vérifie :
//  0. les données : 10 actes, fins d'acte, paliers chaînés, icônes, règles vides, aucun mot du secret ;
//  1. les actes : I à III identiques à gardiens.js (nom, salles, gardien), registres, total des salles ;
//  2. la montée des ennemis : exactement la formule d'avant jusqu'à la fin de l'acte III, puis la pente douce, continue et croissante ;
//  3. les portes imposées, acte par acte : I à III comme avant (sauf la sortie du Glas, qui mène à l'acte IV), IV à IX élite de fin, X antichambre et gardien ;
//  4. la sauvegarde (SAVE.descente) : état neuf, sauvegardes abîmées, version future, trous, ancienne sauvegarde ;
//  5. le déblocage : Normal ouvre Difficile, Difficile ouvre Extrême ; ni l'essai, ni la mort, ni l'abandon n'ouvrent rien ;
//  6. les branchements du jeu (lecture d'index.html) : registre, Paliers de Brume retirés, montée, victoire au dernier acte, garde de l'essai.
//   node themist/outils/sim-descente.mjs
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
const bloc = n => { const m = html.match(new RegExp(`\\/\\*${n}:pur\\*\\/([\\s\\S]*?)\\/\\*\\/${n}:pur\\*\\/`)); if (!m) { console.error(`Bloc /*${n}:pur*/ introuvable`); process.exit(1); } return m[1]; };
const ctx = { window: {}, Math, console, JSON };
vm.createContext(ctx);
for (const f of ['gardiens.js', 'descente.js', 'bestiaire.js', 'icones.js']) vm.runInContext(readFileSync(join(ROOT, 'data', f), 'utf8'), ctx);
vm.runInContext(bloc('des') + '\nthis.F={DES_V,desActes,desSeuil,desMontee,desPorte,desPorteActe,desNeuf,desLire,desEcrire,desChoix,desFin};', ctx);
const F = ctx.F, D = ctx.window.BRUME_DATA, GA = D.gardiens, DS = D.descente, BE = D.bestiaire;
let fails = 0, checks = 0;
const ok = (c, msg) => { checks++; if (!c) { fails++; if (fails <= 60) console.error('ÉCHEC : ' + msg); } };
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// ── 0. Données
ok(DS.nombre === 10, 'données : la descente compte 10 actes');
ok(GA.actes.length === 3 && DS.actes.length === DS.nombre - 3, 'données : 3 actes dans gardiens.js, 7 dans descente.js');
DS.actes.forEach((a, i) => {
  const n = i + 4;
  ok(typeof a.name === 'string' && a.name.length > 2, `acte ${n} : nom`);
  ok(Number.isInteger(a.rooms) && a.rooms >= 2 && a.rooms <= 7, `acte ${n} : 2 à 7 salles`);
  ok(a.fin === 'elite' || a.fin === 'gardien', `acte ${n} : fin élite ou gardien`);
  ok(!a.entree || ['combat', 'halte'].includes(a.entree), `acte ${n} : première salle combat ou halte`);
  ok(typeof a.done === 'string' && a.done.length > 2, `acte ${n} : phrase de fin`);
  if (a.fin === 'elite') { ok(DS.fin.pv[n] >= 1 && DS.fin.pv[n] <= 3, `acte ${n} : PV de l'élite de fin bornés`); ok(DS.fin.vague[n] >= 0 && DS.fin.vague[n] <= 1.5, `acte ${n} : vague en plus bornée`); ok(!a.antichambre, `acte ${n} : pas d'antichambre avant une élite`); }
  else { ok(typeof a.boss === 'string' && a.boss.length > 2, `acte ${n} : nom du gardien`); ok(a.antichambre === true, `acte ${n} : antichambre avant le gardien`); }
});
ok(DS.actes.slice(0, 6).every(a => a.fin === 'elite'), 'actes IV à IX : une élite de fin d’acte (provisoire)');
ok(DS.actes[6].fin === 'gardien', 'acte X : un gardien (provisoire)');
for (let n = 4; n <= 9; n++) ok(n === 4 || DS.fin.pv[n] > DS.fin.pv[n - 1], `élite de fin : plus endurante d'acte en acte (${n})`);
ok(DS.gardien.pv >= 1 && DS.gardien.pv <= 2 && DS.gardien.degats >= 1 && DS.gardien.degats <= 1.5, 'gardien provisoire de l’acte X : multiplicateurs bornés');
ok(DS.registre === 3, 'actes IV à X : registre de l’acte III');
ok(DS.montee.apresActe === 3, 'montée : la pente change après l’acte III');
ok(DS.montee.pvParSalle > 0 && DS.montee.pvParSalle < BE.montee.pvParSalle && DS.montee.degatsParSalle > 0 && DS.montee.degatsParSalle < BE.montee.degatsParSalle, 'montée : pente plus douce après l’acte III');
ok(eq(DS.ordre, ['normal', 'difficile', 'extreme']), 'paliers : Normal, Difficile, Extrême, dans cet ordre');
ok(!DS.paliers.normal.ouvrePar && DS.paliers.difficile.ouvrePar === 'normal' && DS.paliers.extreme.ouvrePar === 'difficile', 'paliers : chaîne de déblocage');
const icTxt = readFileSync(join(ROOT, 'data', 'icones.js'), 'utf8');
for (const p of DS.ordre) {
  const X = DS.paliers[p];
  ok(X && X.n && X.court && X.ic, `palier ${p} : nom, ligne, icône`);
  ok(new RegExp(`\\b${X.ic}:`).test(icTxt), `palier ${p} : icône ${X.ic} présente dans icones.js`);
  ok(DS.regles[p] && typeof DS.regles[p] === 'object' && Object.keys(DS.regles[p]).length === 0, `palier ${p} : aucune règle pour l'instant (action 3)`);
}
// secret (cadrage D8) : rien dans les textes de la descente ne parle du Brumeux ni de règles mutantes
const textes = [...DS.actes.flatMap(a => [a.name, a.done, a.boss || '']), ...DS.ordre.flatMap(p => [DS.paliers[p].n, DS.paliers[p].court])].join(' ');
ok(!/brumeux|mutant|mutation/i.test(textes), 'secret : aucun texte de la descente ne nomme le Brumeux ni les règles mutantes');
ok(DS.dureeCible && DS.dureeCible.normale === 40 && DS.dureeCible.rapide === 30, 'durée visée : 40 min, 30 min pour un joueur rapide');

// ── 1. Actes
const L = F.desActes(GA, DS);
ok(L.length === 11 && L[0] === null, 'actes : 10 entrées (1 à 10)');
for (let n = 1; n <= 3; n++) {
  const a = GA.actes[n - 1], b = L[n];
  ok(b.name === a.name && b.rooms === a.rooms && b.boss === a.boss && b.done === a.done, `acte ${n} : identique à gardiens.js`);
  ok(b.registre === n && b.fin === 'gardien' && b.antichambre === true, `acte ${n} : son propre registre, un gardien, une antichambre`);
}
for (let n = 4; n <= 10; n++) ok(L[n].registre === 3 && L[n].n === n, `acte ${n} : registre 3`);
const total = L.slice(1).reduce((s, a) => s + a.rooms, 0);
ok(total === 20 + 6 * 4 + 2, `actes : 46 salles en tout, fins comprises (${total})`);
ok(L.slice(1).filter(a => a.fin === 'gardien').length === 4 && L.slice(1).filter(a => a.fin === 'elite').length === 6, 'actes : 4 gardiens (I, II, III, X) et 6 élites de fin');
// salles « hors fin » : ce qui fixe la durée (cible : 40 min en Normal)
const horsFin = L.slice(1).reduce((s, a) => s + a.rooms - 1, 0);
ok(horsFin === 36, `actes : 36 salles hors fins d'acte (${horsFin})`);

// ── 2. Montée
const seuil = F.desSeuil(L, DS);
ok(seuil === 20, `montée : seuil à la salle 20, dernière de l'acte III (${seuil})`);
const base = { pvParSalle: BE.montee.pvParSalle, degatsParSalle: BE.montee.degatsParSalle };
for (let g = -1; g <= seuil; g++) {
  const m = F.desMontee(base, DS, seuil, g);
  ok(m.pv === 1 + base.pvParSalle * (g - 1) && m.degats === 1 + base.degatsParSalle * (g - 1), `montée : salle ${g}, exactement la formule d'avant (règle d'or)`);
}
let prev = F.desMontee(base, DS, seuil, seuil);
for (let g = seuil + 1; g <= 70; g++) {
  const m = F.desMontee(base, DS, seuil, g);
  ok(Math.abs(m.pv - prev.pv - DS.montee.pvParSalle) < 1e-9 && Math.abs(m.degats - prev.degats - DS.montee.degatsParSalle) < 1e-9, `montée : salle ${g}, la pente douce (continue)`);
  prev = m;
}
const fin9 = seuil + 6 * 4, mX = F.desMontee(base, DS, seuil, fin9), mI = F.desMontee(base, DS, seuil, seuil);
ok(Math.abs(mI.pv - 2.615) < 1e-9 && Math.abs(mI.degats - 1.57) < 1e-9, 'montée : ×2,615 PV et ×1,57 dégâts en fin d’acte III');
ok(Math.abs(mX.pv - 3.575) < 1e-9 && Math.abs(mX.degats - 1.93) < 1e-9, `montée : ×3,575 PV et ×1,93 dégâts en fin d'acte IX (salle ${fin9})`);
const ancien = 1 + base.pvParSalle * (fin9 - 1);
ok(mX.pv < ancien * 0.8, `montée : bien sous l'ancienne pente prolongée (×${ancien.toFixed(2)} en fin d'acte IX)`);

// ── 3. Portes imposées
// L'ancienne règle (index.html avant v18, makeDoors) : boss → act / act3 / rien (fin) ; salle suivante = rooms → boss ; rooms − 1 → halte
const ancienne = (acte, A, next, type) => type === 'boss' ? (acte < 3 ? 'suite' : 'fin') : next === A.rooms ? 'boss' : next === A.rooms - 1 ? 'halte' : null;
const parcours = [];
for (let n = 1; n <= 10; n++) {
  const A = L[n];
  let type = n === 1 ? 'combat' : (A.entree || 'combat'), garde = false;
  const vu = [type];
  for (let i = 1; i <= A.rooms; i++) {
    const next = i + 1;
    const p = F.desPorte(A, { acte: n, N: 10, next, type, garde });
    if (n <= 3) {
      const old = ancienne(n, A, next, type);
      ok(p === old || (n === 3 && type === 'boss' && old === 'fin' && p === 'suite'), `portes : acte ${n}, salle ${i} → ${next}, comme avant (${p} / ${old})`);
    }
    if (i < A.rooms) {
      if (p === 'garde') { type = 'elite'; garde = true; } else if (p) { type = p; } else type = 'combat';
      vu.push(p === 'garde' ? 'garde' : type);
    } else {
      ok(p === (n < 10 ? 'suite' : 'fin'), `portes : acte ${n}, la dernière salle mène ${n < 10 ? 'à l’acte suivant' : 'à la victoire'}`);
    }
  }
  parcours.push(vu);
  ok(vu.length === A.rooms, `portes : acte ${n}, ${A.rooms} salles parcourues`);
  if (A.fin === 'elite') { ok(vu[vu.length - 1] === 'garde', `portes : acte ${n}, l'élite de fin en dernière salle`); ok(!vu.includes('halte') || vu.indexOf('halte') !== vu.length - 2, `portes : acte ${n}, pas d'antichambre imposée`); ok(!vu.includes('boss'), `portes : acte ${n}, pas de gardien`); }
  else ok(vu[vu.length - 1] === 'boss' && vu[vu.length - 2] === 'halte', `portes : acte ${n}, antichambre puis gardien`);
}
ok(eq(parcours[9], ['halte', 'boss']), 'portes : acte X = antichambre, puis le gardien');
ok(F.desPorteActe(2) === 'act' && F.desPorteActe(3) === 'act3' && [4, 5, 6, 7, 8, 9, 10].every(n => F.desPorteActe(n) === 'acte'), 'portes : act, act3 (comme avant), puis acte');
// une élite ordinaire (pas de fin) ne termine pas l'acte
ok(F.desPorte(L[5], { acte: 5, N: 10, next: 3, type: 'elite', garde: false }) === null, 'portes : une élite ordinaire laisse les portes au choix');
ok(F.desPorte(L[10], { acte: 10, N: 10, next: 3, type: 'boss', garde: false }) === 'fin', 'portes : le dernier gardien termine la descente');

// ── 4. Sauvegarde
const neuf = F.desNeuf(DS);
ok(eq(neuf, { v: 1, ouverts: ['normal'], choisi: 'normal', victoires: {} }), 'sauvegarde : état neuf = Normal seul');
for (const raw of [undefined, null, 0, 'x', [], {}, { v: 'a' }, { v: 0 }, { v: NaN }])
  ok(eq(F.desLire(raw, DS), neuf), `sauvegarde : ${JSON.stringify(raw)} → état neuf`);
ok(F.desLire({ v: 2, ouverts: ['normal', 'difficile'] }, DS) === null, 'sauvegarde : version future → null (on n’y touche pas)');
ok(eq(F.desLire({ v: 1, ouverts: ['extreme'], choisi: 'extreme' }, DS).ouverts, ['normal']), 'sauvegarde : pas de trou (Extrême sans Difficile → Normal seul)');
ok(F.desLire({ v: 1, ouverts: ['extreme'], choisi: 'extreme' }, DS).choisi === 'normal', 'sauvegarde : un palier fermé choisi retombe sur Normal');
ok(eq(F.desLire({ v: 1, ouverts: ['difficile', 'normal', 'inconnu'], choisi: 'difficile' }, DS), { v: 1, ouverts: ['normal', 'difficile'], choisi: 'difficile', victoires: {} }), 'sauvegarde : ordre rétabli, inconnu écarté');
ok(eq(F.desLire({ v: 1, ouverts: ['normal'], victoires: { normal: { lum: 2, gou: -1, her: 'x', tis: 1.7 }, bidon: { lum: 3 } } }, DS).victoires, { normal: { lum: 2, tis: 1 } }), 'sauvegarde : victoires nettoyées');
// une sauvegarde d'avant la v18 : pas de SAVE.descente, des Paliers de Brume ouverts, des victoires sur trois actes → Normal seul
const vieille = { v: 1, wins: 5, palierMax: 8, palier: 3 };
ok(eq(F.desLire(vieille.descente, DS), neuf), 'sauvegarde : une sauvegarde d’avant la v18 n’ouvre que Normal');
const ecrit = F.desEcrire({ v: 1, ouverts: ['normal', 'difficile'], choisi: 'difficile', victoires: { normal: { lum: 1 } } });
ok(eq(F.desLire(JSON.parse(JSON.stringify(ecrit)), DS), ecrit), 'sauvegarde : écrire puis relire rend la même chose');

// ── 5. Déblocage
const S0 = F.desLire({ v: 1, ouverts: ['normal'], choisi: 'normal' }, DS), gel = JSON.stringify(S0);
let r = F.desFin(S0, DS, { win: true, essai: false, palier: 'normal', cls: 'lum' });
ok(r.ouvert === 'difficile' && eq(r.S.ouverts, ['normal', 'difficile']) && r.S.victoires.normal.lum === 1, 'déblocage : gagner en Normal ouvre Difficile');
ok(JSON.stringify(S0) === gel, 'déblocage : l’état d’entrée n’est pas modifié');
r = F.desFin(r.S, DS, { win: true, essai: false, palier: 'normal', cls: 'tis' });
ok(r.ouvert === null && eq(r.S.ouverts, ['normal', 'difficile']) && r.S.victoires.normal.tis === 1, 'déblocage : une seconde victoire en Normal n’ouvre rien de plus, mais compte');
r = F.desFin(r.S, DS, { win: true, essai: false, palier: 'difficile', cls: 'her' });
ok(r.ouvert === 'extreme' && eq(r.S.ouverts, ['normal', 'difficile', 'extreme']), 'déblocage : gagner en Difficile ouvre Extrême');
r = F.desFin(r.S, DS, { win: true, essai: false, palier: 'extreme', cls: 'gou' });
ok(r.ouvert === null && r.S.victoires.extreme.gou === 1, 'déblocage : gagner en Extrême compte la victoire, rien à ouvrir');
for (const o of [{ win: true, essai: true }, { win: false, essai: false }, { win: false, essai: true }]) {
  const x = F.desFin(S0, DS, Object.assign({ palier: 'normal', cls: 'lum' }, o));
  ok(x.S === S0 && x.ouvert === null, `déblocage : ${o.essai ? 'essai' : ''}${o.win ? ' gagné' : ' perdu'} → rien ne change`);
}
ok(F.desFin(S0, DS, { win: true, essai: false, palier: 'difficile', cls: 'lum' }).ouvert === null, 'déblocage : une victoire à un palier fermé n’ouvre rien');
ok(F.desFin(null, DS, { win: true, essai: false, palier: 'normal', cls: 'lum' }).S === null, 'déblocage : sauvegarde d’une version future intacte');
ok(F.desChoix(S0, 'extreme', DS) === 'normal' && F.desChoix(r.S, 'extreme', DS) === 'extreme' && F.desChoix(null, 'difficile', DS) === 'normal', 'choix : un palier fermé retombe sur Normal');

// ── 6. Branchements du jeu
const has = (re, msg) => ok(re.test(html), 'jeu : ' + msg);
has(/<script src="data\/descente\.js"><\/script>/, 'data/descente.js est chargé');
has(/function newRun\(hub\)\{return\{acteD:1,get act\(\)\{const A=ACTD\[this\.acteD\];return A\?A\.registre:this\.acteD;\},set act\(v\)\{this\.acteD=v;\}/, 'RUN.act est le registre de RUN.acteD');
has(/palier:0,goldF:0/, 'les Paliers de Brume ne sont plus proposés (palier 0)');
has(/hpMul=function\(\)\{return desMontee\(DES_BASE\(\),DES_D,DES_SEUIL,G\(\)\)\.pv\*/, 'PV des ennemis : desMontee');
has(/dmgMul=function\(\)\{return desMontee\(DES_BASE\(\),DES_D,DES_SEUIL,G\(\)\)\.degats\*/, 'dégâts des ennemis : desMontee');
has(/const imp=desPorte\(A,\{acte:ACTE\(\),N:ACTES_N,next,type:room\.type,garde:!!room\.garde\}\);/, 'makeDoors : portes imposées par desPorte');
has(/else if\(ACTE\(\)<ACTES_N\)\{enqueue\(\(\)=>openRelics\(ACTD\[ACTE\(\)\]\.done/, 'après le Glas Originel, la descente continue');
has(/if\(a===3&&ACTE\(\)>=ACTES_N\)R\.won=true;/, 'la victoire de la mémoire au dernier acte seulement');
has(/win:!!win&&ACTE\(\)>=ACTES_N,essai:!!\(RUN\.essai\|\|ESSAI18\)/, 'déblocage : victoire au dernier acte, hors essai');
has(/ESSAI18=\/\[\?&\]\(masque\|brume\|glas\|dernier\|nemesis\|demo\|descente\)=\//, 'déblocage : les paramètres d’essai (et la démo) n’ouvrent rien');
has(/RUN\.final\.palUp=false;/, 'les Paliers de Brume ne se débloquent plus');
has(/function essai\(n,o\)\{[^]*?RUN\.essai=1;/, 'l’essai de la descente pose RUN.essai');
has(/ACTD\[ACTE\(\)\]\.rooms-1;/, 'l’antichambre suit l’acte de la descente');
ok(!/ACTS\[RUN\.act\]\.rooms/.test(html.replace(/AA=ACTS\[RUN\.act\][^;]*;/g, '')), 'jeu : plus de nombre de salles lu sur le registre (hors némésis)');

console.log(`sim-descente : ${checks} vérifications, ${fails} échec${fails > 1 ? 's' : ''}.`);
console.log(`  actes : ${L.slice(1).map(a => `${a.rooms}${a.fin === 'elite' ? 'É' : 'G'}`).join(' · ')} (46 salles, 36 hors fins) ; montée fin III ×${mI.pv.toFixed(3)} PV ×${mI.degats.toFixed(2)} dégâts, fin IX ×${mX.pv.toFixed(3)} ×${mX.degats.toFixed(2)} (ancienne pente : ×${ancien.toFixed(2)})`);
process.exit(fails ? 1 : 0);
