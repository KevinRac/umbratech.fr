#!/usr/bin/env node
// La Brume · vérification hors navigateur de la grande descente (v18, action 2 : la charpente)
// Extrait la logique pure d'index.html (bloc /*des:pur*/) et la fait tourner avec data/gardiens.js, data/descente.js,
// data/bestiaire.js (montee) et data/icones.js. Vérifie :
//  0. les données : 10 actes, un gardien par acte (I à IX), deux miniboss puis le boss final (X), places provisoires, paliers, icônes, secret ;
//  1. les actes : I à III identiques à gardiens.js (nom, salles, gardien), registres, total des salles ;
//  2. la montée des ennemis : exactement la formule d'avant jusqu'à la fin de l'acte III, puis la pente douce, continue et croissante ;
//  3. les portes imposées, acte par acte : I à III comme avant (sauf la sortie du Glas, qui mène à l'acte IV), IV à IX un gardien (provisoire), X deux miniboss et le boss final ;
//  4. la sauvegarde (SAVE.descente) : état neuf, sauvegardes abîmées, version future, trous, ancienne sauvegarde ;
//  5. le déblocage : Normal ouvre Difficile, Difficile ouvre Extrême ; ni l'essai, ni la mort, ni l'abandon n'ouvrent rien ;
//  6. les branchements du jeu (lecture d'index.html) : registre, Paliers de Brume retirés, montée, victoire au dernier acte, garde de l'essai.
//  7. les règles des paliers (v18.2, action 3a) : Normal vide, héritage, Masqué, némésis, soins, répit, temps de plus des places provisoires,
//     règle d'or (gardiens I à III jamais touchés), indice de pression par palier, branchements.
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
vm.runInContext(bloc('des') + '\nthis.F={DES_V,desActes,desSeuil,desMontee,desPorte,desPorteActe,desNeuf,desLire,desEcrire,desChoix,desFin,desFusion,desRegles,desMasque,desNemesis,desSoin,desHalteOk,desTempsEnPlus,desCapEnPlus};', ctx);
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
  ok(n < 10 ? a.fin === 'gardien' : a.fin === 'final', `acte ${n} : ${n < 10 ? 'un gardien' : 'le boss final'} en dernière salle`);
  ok(!a.boss, `acte ${n} : ${n < 10 ? 'gardien' : 'boss final'} pas encore créé (place provisoire)`);
  ok(!a.entree || ['combat', 'halte', 'mini'].includes(a.entree), `acte ${n} : première salle combat, halte ou miniboss`);
  ok(typeof a.done === 'string' && a.done.length > 2, `acte ${n} : phrase de fin`);
  ok(!a.antichambre, `acte ${n} : pas d'antichambre`);
  if (n < 10) { ok(DS.provisoire.fin.pv[n] >= 1 && DS.provisoire.fin.pv[n] <= 3, `acte ${n} : PV de la place provisoire bornés`); ok(DS.provisoire.fin.vague[n] >= 0 && DS.provisoire.fin.vague[n] <= 1.5, `acte ${n} : vague en plus bornée`); ok(!a.miniboss, `acte ${n} : pas de miniboss`); }
});
const X10 = DS.actes[6];
ok(X10.miniboss === 2 && X10.rooms === 3 && X10.entree === 'mini', 'acte X : deux salles de miniboss, puis le boss final (3 salles)');
ok(DS.provisoire.mini.pv.length === 2 && DS.provisoire.mini.pv[1] > DS.provisoire.mini.pv[0] && DS.provisoire.final.pv > DS.provisoire.mini.pv[1], 'acte X : miniboss puis boss final, de plus en plus endurants');
for (let n = 5; n <= 9; n++) ok(DS.provisoire.fin.pv[n] > DS.provisoire.fin.pv[n - 1], `places provisoires des gardiens : plus endurantes d'acte en acte (${n})`);
ok(DS.provisoire.final.pv > DS.provisoire.fin.pv[9], 'boss final provisoire : plus endurant que le dernier gardien provisoire');
ok(!('gardien' in DS) && !('fin' in DS), 'le Glas Originel n’est plus repris à l’acte X (plus de gardien provisoire)');
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
  ok(DS.regles[p] && typeof DS.regles[p] === 'object' && (p === 'normal') === (Object.keys(DS.regles[p]).length === 0), `palier ${p} : ${p === 'normal' ? 'aucune règle (Normal ne change pas)' : 'des règles (action 3)'}`);
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
for (let n = 4; n <= 10; n++) ok(L[n].registre === 3 && L[n].n === n && L[n].fin === (n < 10 ? 'gardien' : 'final'), `acte ${n} : registre 3, fin ${n < 10 ? 'gardien' : 'boss final'}`);
const total = L.slice(1).reduce((s, a) => s + a.rooms, 0);
ok(total === 20 + 6 * 4 + 3, `actes : 47 salles en tout, fins comprises (${total})`);
ok(L.slice(1).filter(a => a.fin === 'gardien').length === 9 && L.slice(1).filter(a => a.fin === 'final').length === 1, 'actes : 9 gardiens (I à IX) et le boss final');
// salles « hors fin » : ce qui fixe la durée (cible : 40 min en Normal)
const horsFin = L.slice(1).reduce((s, a) => s + a.rooms - 1, 0);
ok(horsFin === 37, `actes : 37 salles hors fins d'acte, dont 2 miniboss (${horsFin})`);

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
  if (type === 'mini') type = 'elite';
  for (let i = 1; i <= A.rooms; i++) {
    const next = i + 1;
    const p = F.desPorte(A, { acte: n, N: 10, next, type, fin: garde });
    if (n <= 3) {
      const old = ancienne(n, A, next, type);
      ok(p === old || (n === 3 && type === 'boss' && old === 'fin' && p === 'suite'), `portes : acte ${n}, salle ${i} → ${next}, comme avant (${p} / ${old})`);
    }
    if (i < A.rooms) {
      if (p === 'garde' || p === 'final') { type = 'elite'; garde = true; } else if (p === 'mini') { type = 'elite'; garde = false; } else if (p) { type = p; } else type = 'combat';
      vu.push(['garde', 'final', 'mini'].includes(p) ? p : type);
    } else {
      ok(p === (n < 10 ? 'suite' : 'fin'), `portes : acte ${n}, la dernière salle mène ${n < 10 ? 'à l’acte suivant' : 'à la victoire'}`);
    }
  }
  parcours.push(vu);
  ok(vu.length === A.rooms, `portes : acte ${n}, ${A.rooms} salles parcourues`);
  if (n <= 3) ok(vu[vu.length - 1] === 'boss' && vu[vu.length - 2] === 'halte', `portes : acte ${n}, antichambre puis gardien`);
  else if (n < 10) { ok(vu[vu.length - 1] === 'garde', `portes : acte ${n}, la place du gardien en dernière salle`); ok(!vu.includes('halte') || vu.indexOf('halte') !== vu.length - 2, `portes : acte ${n}, pas d'antichambre imposée`); ok(!vu.includes('boss') && !vu.includes('mini'), `portes : acte ${n}, ni le Glas ni miniboss`); }
  else ok(eq(vu, ['mini', 'mini', 'final']), `portes : acte X, deux miniboss puis le boss final ${JSON.stringify(vu)}`);
}
ok(!parcours.slice(3).some(v => v.includes('boss')), 'portes : le Glas Originel (salle « boss ») ne revient plus après l’acte III');
ok(F.desPorteActe(2) === 'act' && F.desPorteActe(3) === 'act3' && [4, 5, 6, 7, 8, 9, 10].every(n => F.desPorteActe(n) === 'acte'), 'portes : act, act3 (comme avant), puis acte');
// une élite ordinaire (pas de fin) ne termine pas l'acte
ok(F.desPorte(L[5], { acte: 5, N: 10, next: 3, type: 'elite', fin: false }) === null, 'portes : une élite ordinaire laisse les portes au choix');
ok(F.desPorte(L[10], { acte: 10, N: 10, next: 4, type: 'elite', fin: true }) === 'fin', 'portes : le boss final termine la descente');
ok(F.desPorte(L[10], { acte: 10, N: 10, next: 3, type: 'elite', fin: false }) === 'final', 'portes : un miniboss vaincu mène au suivant, puis au boss final');
ok(F.desPorte(Object.assign({}, L[4], { boss: 'Essai' }), { acte: 4, N: 10, next: 4, type: 'combat', fin: false }) === 'boss', 'portes : un gardien créé (boss nommé) prend la salle « boss »');

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
has(/const imp=desPorte\(A,\{acte:ACTE\(\),N:ACTES_N,next,type:room\.type,fin:room\.gardeK==='garde'\|\|room\.gardeK==='final'\}\);/, 'makeDoors : portes imposées par desPorte');
has(/else if\(room\.gardeK==='final'\)\{if\(RUN\.mem\)RUN\.mem\.won=true;later\(2\.2,\(\)=>openEnd\(true\)\);return;\}/, 'le boss final termine la descente (victoire)');
has(/e\.maxHp=\(GA_D\.pv\|\|\[0,1000,2300,3600\]\)\[RUN\.act\]\*\(PAL\(\)>=1\?1\.2:1\)\*\(PAL\(\)>=5\?1\.3:1\);e\.hp=e\.maxHp;e\.dmg=\[0,16,22,26\]\[RUN\.act\];e\.spd=58;e\.xp=\[0,70,90,0\]\[RUN\.act\];e\.name=ACTS\[RUN\.act\]\.boss;/, 'createBoss : exactement comme avant la v18');
ok(!/desGardienX|DES_D\.gardien/.test(html), 'jeu : plus de gardien provisoire repris du Glas');
has(/else if\(ACTE\(\)<ACTES_N\)\{enqueue\(\(\)=>openRelics\(ACTD\[ACTE\(\)\]\.done/, 'après le Glas Originel, la descente continue');
has(/if\(a===3&&ACTE\(\)>=ACTES_N\)R\.won=true;/, 'la mort du Glas ne compte plus comme la victoire de la descente');
has(/win:!!win&&ACTE\(\)>=ACTES_N,essai:!!\(RUN\.essai\|\|ESSAI18\)/, 'déblocage : victoire au dernier acte, hors essai');
has(/ESSAI18=\/\[\?&\]\(masque\|brume\|glas\|dernier\|nemesis\|demo\|descente\)=\//, 'déblocage : les paramètres d’essai (et la démo) n’ouvrent rien');
has(/RUN\.final\.palUp=false;/, 'les Paliers de Brume ne se débloquent plus');
has(/function essai\(n,o\)\{[^]*?RUN\.essai=1;/, 'l’essai de la descente pose RUN.essai');
has(/ACTD\[ACTE\(\)\]\.rooms-1;/, 'l’antichambre suit l’acte de la descente');
ok(!/ACTS\[RUN\.act\]\.rooms/.test(html.replace(/AA=ACTS\[RUN\.act\][^;]*;/g, '')), 'jeu : plus de nombre de salles lu sur le registre (hors némésis)');

// ── 7. Règles des paliers (v18.2, action 3a ; cadrage claude/la-brume-v18-3-paliers-cadrage.md)
const AS = BE.assemble, NM = AS.nemesis;
const R = { normal: F.desRegles(DS, 'normal'), difficile: F.desRegles(DS, 'difficile'), extreme: F.desRegles(DS, 'extreme') };
const CLES = ['masque', 'soins', 'gardien', 'nemesis', 'repit', 'brumeux'];
ok(eq(R.normal, {}), 'Normal : aucune règle (la descente de la v18.1, au bit près)');
ok(eq(F.desRegles(DS, 'inconnu'), {}), 'palier inconnu : aucune règle');
for (const p of DS.ordre) ok(Object.keys(R[p]).every(k => CLES.includes(k)), `${p} : seulement des règles connues (${Object.keys(R[p]).join(', ')})`);
ok(DS.regles.extreme.herite === 'difficile' && !('herite' in R.extreme), 'Extrême hérite de Difficile (Q1), la clé herite ne reste pas dans les règles');
ok(eq(R.extreme.masque, R.difficile.masque) && eq(R.extreme.gardien, R.difficile.gardien) && eq(R.extreme.soins.sources, R.difficile.soins.sources), 'Extrême reprend les Masqués, le temps de plus et les sources de soin de Difficile');
ok(R.extreme.soins.monde < R.difficile.soins.monde && R.difficile.soins.monde < 1, 'soins du monde : Normal > Difficile > Extrême');
ok(R.extreme.soins.gardien === 0 && R.difficile.soins.gardien > 0 && R.difficile.soins.gardien < 1, 'soin qui suit un gardien : réduit en Difficile, aucun en Extrême');
ok(!DS.regles.difficile.nemesis && !DS.regles.difficile.repit && !DS.regles.difficile.brumeux, 'Difficile : ni némésis, ni répit, ni Brumeux (Extrême seulement)');
ok(R.extreme.brumeux && R.extreme.brumeux.phaseEntiere === true, 'Extrême : le Brumeux a sa phase finale entière (lu à l’action 5)');
{ // héritage : copie neuve, sans effet de bord sur les données
  const a = F.desRegles(DS, 'extreme'); a.soins.sources.push('x'); a.masque.chance = 1;
  ok(DS.regles.difficile.soins.sources.length === 3 && DS.regles.difficile.masque.chance === 70 && F.desRegles(DS, 'extreme').masque.chance === 70, 'desRegles rend une copie neuve (les données ne bougent pas)');
  const boucle = { regles: { a: { herite: 'b', x: 1 }, b: { herite: 'a', y: 2 } } };
  ok(eq(F.desRegles(boucle, 'a'), { y: 2, x: 1 }), 'héritage en boucle : il s’arrête');
  ok(eq(F.desFusion({ a: { b: 1, c: [1, 2] } }, { a: { c: [3] } }), { a: { b: 1, c: [3] } }), 'fusion profonde : les tableaux remplacent');
}
// Masqué (Q2)
const baseM = { chance: AS.chance, souvenir: { chance: AS.souvenir.chance, parActe: AS.souvenir.parActe } };
ok(eq(F.desMasque(baseM, R.normal), baseM), 'Masqué, Normal : chance, souvenirs et porteurs par acte de bestiaire.js, inchangés');
ok(eq(F.desMasque(baseM, R.difficile), { chance: 70, souvenir: { chance: 75, parActe: 3 } }), 'Masqué, Difficile : 70 %, souvenir 75 %, 3 porteurs par acte');
ok(F.desMasque(baseM, R.extreme).chance === 70, 'Masqué, Extrême : comme Difficile');
ok(AS.chance === 50 && AS.souvenir.chance === 50 && AS.souvenir.parActe === 2, 'bestiaire.js garde les valeurs de Normal (le palier les pose en jeu, sans toucher aux données)');
// Némésis (Q8, secret)
const nb = { parActe: NM.parActe, repit: NM.repit };
ok(eq(F.desNemesis(nb, R.normal), { parActe: 1, repitMorts: 3 }) && eq(F.desNemesis(nb, R.difficile), { parActe: 1, repitMorts: 3 }), 'némésis : Normal et Difficile inchangés');
{ const n = F.desNemesis(nb, R.extreme); ok(n.parActe === 2 && n.repitMorts === Infinity, 'némésis, Extrême : deux par acte, plus de répit'); }
// Soins (Q3, Q8)
const sources = [...new Set([...html.matchAll(/\bheal\([^;]*?,'([a-z]+)'\)/g)].map(m => m[1]))];
const monde = R.difficile.soins.sources, constr = sources.filter(s => !monde.includes(s));
ok(monde.every(s => sources.includes(s)), `soins : chaque source du monde existe dans le jeu (${monde.join(', ')})`);
ok(['devour', 'steal', 'kill', 'rupture', 'carapace', 'ames', 'fil', 'boss'].every(s => constr.includes(s)), 'soins : les soins venus des talents (Dévoration, vol de vie, survie du Gouffre…) ne sont pas du monde');
for (const s of sources) {
  ok(F.desSoin(R.normal, s, false) === 1, `soin ${s}, Normal : ×1`);
  ok(F.desSoin(R.difficile, s, false) === (monde.includes(s) ? 0.65 : 1), `soin ${s}, Difficile : ×${monde.includes(s) ? 0.65 : 1}`);
  ok(F.desSoin(R.extreme, s, false) === (monde.includes(s) ? 0.5 : 1), `soin ${s}, Extrême : ×${monde.includes(s) ? 0.5 : 1}`);
}
ok(F.desSoin(R.normal, 'boss', true) === 1 && F.desSoin(R.difficile, 'boss', true) === 0.65 && F.desSoin(R.extreme, 'boss', true) === 0, 'soin complet après un gardien : ×1, ×0,65, ×0');
// Répit (Q8) : halte au choix seulement dans la seconde moitié de l'acte en Extrême ; l'antichambre (imposée) n'est jamais concernée
for (let n = 1; n <= DS.nombre; n++) {
  const A = L[n];
  for (let next = 1; next < A.rooms; next++) {
    ok(F.desHalteOk(R.normal, next, A.rooms) && F.desHalteOk(R.difficile, next, A.rooms), `halte, acte ${n} salle ${next} : Normal et Difficile inchangés`);
    ok(F.desHalteOk(R.extreme, next, A.rooms) === (next >= Math.ceil(A.rooms / 2)), `halte, acte ${n} salle ${next}, Extrême : ${next >= Math.ceil(A.rooms / 2) ? 'permise' : 'retirée'}`);
  }
  if (A.antichambre !== false) ok(F.desHalteOk(R.extreme, A.rooms - 1, A.rooms), `acte ${n} : l'antichambre reste en Extrême`);
}
// Temps de plus (Q4) et règle d'or : jamais aux actes I à III, dans aucun palier
for (const p of DS.ordre) for (let n = 1; n <= DS.nombre; n++) {
  const T = F.desTempsEnPlus(R[p], n), veut = p !== 'normal' && n >= 4;
  ok(!!T === veut, `temps de plus, ${p}, acte ${n} : ${veut ? 'oui' : 'non'}`);
}
ok(F.desTempsEnPlus({ gardien: { desActe: 1, tempsEnPlus: { pv: 35 } } }, 2) === null, 'règle d’or : même une règle mal écrite (desActe 1) ne touche pas les gardiens I à III');
{ // 4ᵉ capacité : sur toutes les combinaisons du Masqué au registre 3 (sans arme de la Brume), combien en reçoivent une ?
  const T = R.difficile.gardien.tempsEnPlus, inc = (a, b) => AS.incompatibles.some(([x, y]) => (x === a && y === b) || (x === b && y === a)), men = k => AS.capacites[k].menace;
  const K = Object.keys(AS.capacites), plaf = AS.budgetMenace[3];
  let n = 0, avec = 0; const parCap = {};
  for (const ck in AS.corps) {
    const C = AS.corps[ck], S = AS.signatures[C.signature]; if (!S) continue;
    const okK = K.filter(k => !(C.exclut || []).includes(k));
    for (let i = 0; i < okK.length; i++) for (let j = i + 1; j < okK.length; j++) for (const c of okK) {
      const a = okK[i], b = okK[j]; if (c === a || c === b || inc(a, b) || inc(a, c) || inc(b, c)) continue;
      const m = C.menace + S.menace + men(a) + men(b) + men(c); if (m > plaf) continue;
      const co = { corps: ck, depart: [a, b], eveil: c, menace: m }; n++;
      let seq = 0; const rnd = () => (seq++ * 0.37) % 1;
      const x = F.desCapEnPlus(AS, co, T, plaf, { incomp: inc, menace: men }, rnd);
      if (x) { avec++; parCap[x] = (parCap[x] || 0) + 1;
        ok(![a, b, c].includes(x) && !(C.exclut || []).includes(x) && ![a, b, c].some(y => inc(x, y)) && m + men(x) <= plaf + T.margeMenace, `4ᵉ capacité ${ck}:${a}+${b}>${c} → ${x} : nouvelle, permise, compatible, sous plafond + marge`); }
    }
  }
  ok(n > 0, `temps de plus : combinaisons du registre 3 (${n}) ; une 4ᵉ capacité pour ${avec}, la signature redoublée pour les autres`);
  ok(F.desCapEnPlus(AS, null, T, plaf, { incomp: inc, menace: men }, Math.random) === null && F.desCapEnPlus(AS, { corps: Object.keys(AS.corps)[0], depart: ['a', 'b'], eveil: 'c', menace: 0 }, null, plaf, {}, Math.random) === null, 'sans combinaison ou sans règle : pas de 4ᵉ capacité');
  globalThis.TEMPS = { n, avec, parCap };
}
{ // le temps de plus en jeu : asmPas et asmCycle (bloc /*asm:pur*/), sur toutes les combinaisons du registre 3 sans arme de la Brume
  const am = html.match(/\/\*asm:pur\*\/([\s\S]*?)\/\*\/asm:pur\*\//), sm = html.match(/\/\*sb:pur\*\/([\s\S]*?)\/\*\/sb:pur\*\//);
  const c2 = { window: {}, Math, console }; vm.createContext(c2);
  for (const f of ['bestiaire.js', 'souvenirs.js', 'souvenirs-brume.js']) vm.runInContext(readFileSync(join(ROOT, 'data', f), 'utf8'), c2);
  vm.runInContext(am[1] + sm[1] + '\nthis.F={asmRng,asmCombos,asmNouveau,asmPas,asmCycle,asmIncomp,asmMenace};', c2);
  const G = c2.F, A2 = c2.window.BRUME_DATA.bestiaire.assemble, J2 = c2.window.BRUME_DATA.souvenirsBrume, T = R.difficile.gardien.tempsEnPlus;
  let combats = 0, doubles = 0;
  for (const co of G.asmCombos(A2, { act: 3, salle: 18, J: J2 })) for (let rep = 0; rep < 20; rep++) {
    combats++;
    const rnd = G.asmRng(rep * 131 + co.cle.length), st = G.asmNouveau(A2, co, []), sig = st.sig;
    const cap = F.desCapEnPlus(A2, co, T, A2.budgetMenace[3], { incomp: (a, b) => G.asmIncomp(A2, a, b, J2), menace: k => G.asmMenace(A2, J2, k) }, rnd);
    st.temps = { cap: cap || sig, pv: T.pv, on: false };
    let t = 0, pv = 100, active = null, last = null, eveils = [], apres = [], dur = 70 + rep;
    while (t < dur) {
      const dt = 0.005 + rnd() * 0.03; t += dt; pv = Math.max(1, 100 - t * (100 / dur) * 1.3);
      for (const [ev, k] of G.asmPas(A2, st, { dt, act: 3, pv, er: 22, dist: 40, autre: rnd() < 0.02, fige: false, vivant: false, etourdi: false }, rnd, J2)) {
        if (ev === 'eveil') eveils.push([k, pv]);
        if (ev === 'charge') { ok(active === null, `temps de plus ${co.cle} : deux zones à la fois`); ok(k !== last, `temps de plus ${co.cle} : ${k} deux fois de suite`); active = k; last = k; if (st.temps.on) apres.push(k); }
        if (ev === 'fin') active = null;
      }
    }
    ok(eveils.length === 2 && eveils[0][0] === co.eveil && eveils[1][0] === st.temps.cap && eveils[1][1] <= T.pv && eveils[0][1] > eveils[1][1], `temps de plus ${co.cle} : l'éveil, puis le temps de plus sous ${T.pv} % (${eveils.map(e => e[0] + '@' + e[1].toFixed(0)).join(', ')})`);
    if (st.temps.cap === sig) { const n = apres.filter(k => k === sig).length, autres = apres.filter(k => k !== sig).length; if (autres >= 9) { ok(n >= 2 * Math.floor(autres / 3) - 2, `temps de plus ${co.cle} : signature redoublée (${n} signatures pour ${autres} capacités)`); doubles++; } }
  }
  ok(combats > 0 && doubles > combats / 2, `temps de plus : signature redoublée vérifiée sur ${doubles} combats sur ${combats}`);
  { // sans temps de plus, asmCycle tire exactement comme avant (même nombre de tirages, même ordre)
    const r1 = G.asmRng(7), r2 = G.asmRng(7); let same = true;
    for (let i = 0; i < 2000; i++) { const caps = ['explosion', 'cone', 'tirs'].slice(0, 2 + (i % 2)); const x = G.asmCycle(caps, 'fracas', i % 3 ? null : caps[0], r1);
      const a = caps.slice(); for (let j = a.length - 1; j > 0; j--) { const q = Math.floor(r2() * (j + 1)); const y = a[j]; a[j] = a[q]; a[q] = y; } if (a.length > 1 && a[0] === (i % 3 ? null : caps[0])) a.push(a.shift()); a.push('fracas');
      if (!eq(x, a)) same = false; }
    ok(same, 'asmCycle sans signature redoublée : le cycle d’avant la v18.2, tirage pour tirage');
  }
}
// Indice de pression par palier (Q13) : modèle grossier, à recaler sur le banc et sur des parties exportées.
// Charge : vagues de combat (1 par salle de combat), Masqués attendus (2 vagues chacun), porteurs de souvenir (+0,5), temps de plus (+0,5 par place provisoire).
// Soin : part du monde (60 % des soins reçus, hypothèse) × facteur + part des talents (40 %) ; le soin complet des gardiens I et II compte 2 salles de soin.
const pression = p => {
  const Rp = R[p], M = F.desMasque(baseM, Rp); let charge = 0, soin = 0;
  for (let n = 1; n <= DS.nombre; n++) {
    const A = L[n], fins = 1 + (A.miniboss || 0), comb = A.rooms - fins - (A.antichambre !== false ? 1 : 0);
    const elig = Math.max(0, comb - (AS.premiereSalle - 1)), masq = elig * M.chance / 100;
    const port = Math.min(M.souvenir.parActe, masq * M.souvenir.chance / 100);
    charge += comb + 2 * masq + 0.5 * port + (F.desTempsEnPlus(Rp, n) ? 0.5 * fins : 0);
    const fs = Rp.soins ? Rp.soins.monde : 1, fg = Rp.soins ? Rp.soins.gardien : 1;
    soin += comb * (0.6 * fs + 0.4) + (n <= 2 ? 2 * fg : 0);
  }
  return charge / soin;
};
const PRS = Object.fromEntries(DS.ordre.map(p => [p, pression(p)]));
const ecart = p => PRS[p] / PRS.normal - 1;
// le modèle ne juge pas l'équilibre (ses poids sont des hypothèses) : il garde l'ordre des paliers et borne l'écart ; le banc mesure
ok(ecart('difficile') > 0.1 && ecart('extreme') > ecart('difficile') + 0.1, `pression : Normal < Difficile < Extrême (+${(ecart('difficile') * 100).toFixed(0)} %, +${(ecart('extreme') * 100).toFixed(0)} %)`);
ok(ecart('extreme') <= 1.2, `pression, Extrême hors mutations : au plus +120 % (${(ecart('extreme') * 100).toFixed(0)} %)`);
// Branchements (bloc v18 d'index.html)
has(/const regles=p=>RGC\[p\]\|\|\(RGC\[p\]=desRegles\(DES_D,p\)\);/, 'les règles viennent de desRegles (data/descente.js)');
has(/function appliquer\(p\)\{if\(!BASE18\)return;const R=regles\(p\),M=desMasque\(BASE18,R\);/, 'Masqué : réglages posés depuis une copie des valeurs d’origine (desMasque)');
has(/startRun=function\(\)\{const r=_sr18b\.apply\(this,arguments\);try\{appliquer\(/, 'Masqué et némésis : réglages posés à chaque départ de descente');
has(/RUN\.palierD!==ORD\[0\]\)\{const R=RG\(\);/, 'soins : Normal ne passe pas par les règles');
has(/const f=desSoin\(R,src,g\);/, 'soins : desSoin');
has(/!desHalteOk\(RG\(\),next,A\.rooms\)/, 'répit : desHalteOk dans makeDoors');
has(/room\.gardeK&&room\.asm&&room\.asm\.e===e&&!e\.asm\.st\.temps\?desTempsEnPlus\(RG\(\),ACTE\(\)\)/, 'temps de plus : seulement le Masqué d’une place provisoire (porte garde, mini ou final)');
has(/e\.asm\.st\.temps=\{cap:cap\|\|e\.asm\.st\.sig,pv:T\.pv,on:false\}/, 'temps de plus : sans 4ᵉ capacité possible, la signature redoublée');
has(/if\(st\.temps&&!st\.temps\.on&&st\.eveil&&env\.pv<=st\.temps\.pv\)/, 'temps de plus : asmPas l’éveille après la troisième capacité, à st.temps.pv');
has(/Tes PV sont en partie restaurés\./, 'le message de victoire sur un gardien dit ce qui est rendu');
{ // wiki (Q11) : les règles des paliers sont dites, la némésis et la phase finale du boss final sont tues
  const W = readFileSync(join(ROOT, 'wiki.html'), 'utf8'), i = W.indexOf('id="descente"'), sec = i >= 0 ? W.slice(i, W.indexOf('</section>', i)) : '';
  ok(/Les paliers/.test(sec) && /un temps de plus/.test(sec) && /×0,65/.test(sec) && /×0,5/.test(sec) && /Aucun répit/.test(sec), 'wiki : les règles de Difficile et d’Extrême sont dites');
  ok(!/n[ée]m[ée]sis|brumeux|phase finale|mutant|mutation/i.test(sec), 'wiki : ni némésis, ni Brumeux, ni phase finale, ni mutation dans la section de la descente');
}
ok(!/regles\.(difficile|extreme)|palierD==='(difficile|extreme)'/.test(html), 'jeu : aucun palier écrit en dur (tout passe par les règles)');

console.log(`  paliers : pression Difficile +${(ecart('difficile') * 100).toFixed(0)} %, Extrême +${(ecart('extreme') * 100).toFixed(0)} % (modèle) ; temps de plus : ${TEMPS.avec}/${TEMPS.n} combinaisons (${Object.entries(TEMPS.parCap).map(([k, v]) => k + ' ' + v).join(', ')}) ; sources de soin du jeu : ${sources.join(', ')}`);
console.log(`sim-descente : ${checks} vérifications, ${fails} échec${fails > 1 ? 's' : ''}.`);
console.log(`  actes : ${L.slice(1).map(a => `${a.rooms}${a.fin === 'final' ? 'F' : 'G'}`).join(' · ')} (47 salles, 37 hors fins) ; montée fin III ×${mI.pv.toFixed(3)} PV ×${mI.degats.toFixed(2)} dégâts, fin IX ×${mX.pv.toFixed(3)} ×${mX.degats.toFixed(2)} (ancienne pente : ×${ancien.toFixed(2)})`);
process.exit(fails ? 1 : 0);
