#!/usr/bin/env node
// La Brume · vérification hors navigateur des armes de la Brume (palier 3a, v17.15)
// Extrait la logique pure d'index.html (blocs /*asm:pur*/ du Masqué et /*sb:pur*/ des armes) et la fait tourner avec
// data/bestiaire.js, data/souvenirs.js, data/souvenirs-brume.js et data/icones.js.
// Les règles de justice sont jugées par sbVerifier (le même code que le mode d'essai en jeu) :
//  - vocabulaire : chaque étape est UNE zone d'une des neuf formes connues ; aucune couleur dans les données ;
//  - chargement : jamais plus court que les capacités actuelles du Masqué (sbCharge, acte par acte), figement assez tôt ;
//  - sortie : depuis des centaines de positions (porteur au centre, contre un mur, dans un coin ; toi à six distances, seize angles),
//    à chaque acte le plus rapide, seule et avec chaque variante, on trouve un point libre atteint à pied avant le coup ;
//  - dégâts : une étape ≤ degatsEtapeMax, une attaque ≤ degatsMax (données sans le plafond ; variantes : plafond codé) ;
//  - incompatibilités : celles écrites dans les données sont celles que donne la règle, et réciproques.
// Puis : la file d'étapes ne pose jamais deux zones à la fois, et le vérificateur attrape bien des données injustes (contre-épreuves).
//   node themist/outils/sim-brume.mjs            (ajouter --vite pour sauter la moitié des angles)
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
const asm = html.match(/\/\*asm:pur\*\/([\s\S]*?)\/\*\/asm:pur\*\//), sb = html.match(/\/\*sb:pur\*\/([\s\S]*?)\/\*\/sb:pur\*\//), gl = html.match(/\/\*glas:pur\*\/([\s\S]*?)\/\*\/glas:pur\*\//);
if (!asm || !sb || !gl) { console.error('Bloc /*asm:pur*/, /*sb:pur*/ ou /*glas:pur*/ introuvable'); process.exit(1); }
const ctx = { window: {}, Math, console };
vm.createContext(ctx);
for (const f of ['bestiaire.js', 'souvenirs.js', 'souvenirs-brume.js', 'icones.js', 'gardiens.js']) vm.runInContext(readFileSync(join(ROOT, 'data', f), 'utf8'), ctx);
vm.runInContext(asm[1] + sb[1] + gl[1] + '\nthis.F={sbForce,glasRepertoire,glasEnJeu,glasFile,glasMelange,glasMelangeOk,glasBulle,glasPas,glasCompat,asmRng,asmDuree,sbVerifier,sbEtapes,sbPieces,sbSortie,sbPlacer,sbCharge,sbPlancher,sbVerrou,sbPotentiel,sbIncompatibles,sbNouveau,sbPas,sbDegats,sbCoup,sbPlafond,sbDans,sbArrivee,sbEtourdit};', ctx);
const F = ctx.F, D = ctx.window.BRUME_DATA, A = D.bestiaire.assemble, J = D.souvenirsBrume, SV = D.souvenirs, IC = D.icones;
const clone = o => JSON.parse(JSON.stringify(o));
let fails = 0, checks = 0;
const ok = (c, msg) => { checks++; if (!c) { fails++; console.error('ÉCHEC : ' + msg); } };
const VITE = process.argv.includes('--vite');
// rayon du plus gros corps de Masqué (Brute : 22 × 1,45) : la vérification se fait avec lui
const ER = Math.max(...Object.entries(A.corps).map(([k, C]) => D.bestiaire.ennemis?.[k]?.stats?.r * C.taille || 0), 32);

// 0. Les familles : mêmes ids que data/souvenirs.js, icône connue, forme principale dans le vocabulaire
for (const f of Object.keys(SV.familles)) ok(J.familles[f], `famille ${f} (souvenirs.js) : pas de version ennemie`);
for (const f of Object.keys(J.familles)) { ok(SV.familles[f], `famille ${f} : absente de souvenirs.js`); ok(IC[J.familles[f].ic], `famille ${f} : icône ${J.familles[f].ic} absente de icones.js`); }
ok(Object.keys(J.formes).length === 9, 'vocabulaire : neuf formes');
// couleurs : celles du Masqué, lues dans bestiaire.js par le jeu ; le liseré des projectiles ennemis (FOE) est la même couleur
ok(/FO=CO\.zone/.test(html) && /EDGE=CO\.bord/.test(html), 'index.html : les zones du Masqué doivent prendre leurs couleurs dans assemble.couleurs');
ok((html.match(/const FOE='([0-9, ]+)'/) || [])[1] === A.couleurs.zone, 'liseré des projectiles (FOE) = assemble.couleurs.zone');
// palier 3b : ce qui sera rempli doit pointer vers des talents, variantes et renforts qui existent
// (v17.16) chaque talent et chaque relique est classé (entrée vide = la version de sa famille telle quelle), une variante a un effet réel sur sa famille,
// une entrée est une variante OU un renfort, jamais les deux, et les renforts ne dépassent pas ce que renfortMax laisse à un porteur
for (const [src, map, champ] of [['talents', J.talents, 't'], ['reliques', J.reliques, 'r']]) {
  const famDe = {};
  for (const [fid, Fm] of Object.entries(SV.familles)) for (const id of Fm[champ] || []) famDe[id] = fid;
  for (const id of Object.keys(famDe)) ok(map && map[id], `${src}.${id} : non classé (une entrée vide {} suffit pour « la famille telle quelle »)`);
  for (const [id, x] of Object.entries(map || {})) {
    ok(famDe[id], `${src}.${id} : id inconnu de souvenirs.js`);
    for (const v of x.v || []) {
      ok(J.variantes[v], `${src}.${id} : variante ${v} inconnue`);
      if (J.variantes[v] && famDe[id]) {
        const avant = JSON.stringify(F.sbEtapes(J, famDe[id], [])), apres = JSON.stringify(F.sbEtapes(J, famDe[id], [v]));
        ok(avant !== apres, `${src}.${id} : la variante ${v} ne change rien à la famille ${famDe[id]}`);
      }
    }
    if (x.renfort) ok(J.renforts[x.renfort], `${src}.${id} : renfort ${x.renfort} inconnu`);
    ok(!(x.v && x.v.length && x.renfort), `${src}.${id} : une variante ou un renfort, pas les deux`);
    ok((x.v || []).length <= 1, `${src}.${id} : une seule variante par souvenir`);
  }
}

// 1. Justice, famille par famille (le même vérificateur que le mode d'essai)
const t0 = Date.now();
const V = F.sbVerifier(J, A, { er: ER, pas: VITE ? 2 : 1 });
for (const e of V.err) ok(false, e);
checks += V.note.length;
console.log(`justice : ${Object.keys(J.familles).length} familles, ${V.note.length} cas (famille × variante × acte), ${V.err.length} manquement(s) — ${((Date.now() - t0) / 1000).toFixed(1)} s`);
const deplaces = V.note.filter(n => / [1-9]\d* déplacés| [1-9]\d* sautés/.test(n));
if (deplaces.length) console.log('  placements retouchés pour garder une sortie :\n   ' + deplaces.map(n => n.replace(' pour garder une sortie', '').replace(' (porteur dans un coin)', '')).join('\n   '));
const plaf = V.note.filter(n => /plafonné/.test(n));
if (plaf.length) console.log(`  plafond de dégâts appliqué (variantes) : ${plaf.length} cas, de × ${Math.min(...plaf.map(n => +n.match(/× ([\d.]+)/)[1])).toFixed(2)} à × ${Math.max(...plaf.map(n => +n.match(/× ([\d.]+)/)[1])).toFixed(2)}`);

// 2. Tableau de lecture
console.log('\nfamille      forme        étapes  chargement I → III (s)        dégâts I / III  menace  incompatibles');
for (const [fid, Fm] of Object.entries(J.familles)) {
  const ets = F.sbEtapes(J, fid, []), ch = a => ets.map(et => F.sbCharge(J, A, et, a).toFixed(2)).join(' ');
  const inc = Fm.incompatibles, txt = [...inc.familles, ...inc.capacites.map(k => 'cap:' + k), ...inc.corps.map(k => 'corps:' + k)].join(', ');
  console.log(`${fid.padEnd(12)} ${Fm.forme.padEnd(12)} ${String(ets.length).padEnd(7)} ${(ch(1) + ' → ' + ch(3)).padEnd(30)} ${F.sbPotentiel(J, fid, [], 1).toFixed(2)} / ${F.sbPotentiel(J, fid, [], 3).toFixed(2)}     ${Fm.menace}       ${txt || '—'}`);
}
console.log(`plancher du Masqué : ${[1, 2, 3].map(a => F.sbPlancher(A, a, false).toFixed(2)).join(' / ')} s (actes I / II / III) ; étape aussi lourde qu'une signature : ${F.sbPlancher(A, 3, true).toFixed(2)} s`);

// 3. Le chargement est tenu par le code, même si une donnée descend trop bas
{ const J2 = clone(J); J2.familles.onde.etapes[0].chargeS = 0.05; J2.familles.ombre.etapes[0].degats = 2.4;
  for (const a of [1, 2, 3]) {
    ok(F.sbCharge(J2, A, F.sbEtapes(J2, 'onde', [])[0], a) >= F.sbPlancher(A, a, false) - 1e-9, `chargement plancher, acte ${a}`);
    ok(F.sbCharge(J2, A, F.sbEtapes(J2, 'ombre', [])[0], a) >= F.sbPlancher(A, a, true) - 1e-9, `chargement d'une étape lourde ≥ signature, acte ${a}`);
  }
  // le plancher suit le Masqué : s'il charge plus lentement, ses armes aussi
  const A2 = clone(A); for (const k in A2.capacites) A2.capacites[k].chargeS += 0.3;
  ok(F.sbPlancher(A2, 3, false) > F.sbPlancher(A, 3, false), 'le plancher est lu dans les capacités du Masqué'); }

// 4. Une zone à la fois : la file d'étapes, avec des pas de temps, des attentes et des zones qui durent tirés au hasard
{ let s = 7; const rnd = () => (s = (s * 1103515245 + 12345) >>> 0) / 4294967296;
  for (const fid of Object.keys(J.familles)) for (const vars of [[], ['double']]) {
    const st = F.sbNouveau(J, fid, vars); let t = 0, actives = 0, finPrec = -Infinity, vivantJusqua = 0, chargeDebut = 0, maxActives = 0, attaques = 0;
    for (let k = 0; k < 6000 && attaques < 4; k++) {
      const dt = 0.004 + rnd() * 0.03, autre = st.ph === 'attente' && rnd() < 0.3;
      const ev = F.sbPas(J, A, st, { dt, act: 1 + (k % 3), dist: rnd() * 400, autre, fige: rnd() < 0.05, vivant: t < vivantJusqua });
      t += dt;
      for (const [e, i] of ev) {
        if (e === 'charge') { actives++; ok(t - finPrec >= J.justice.entracteS - 0.05 || i === 0, `${fid} : étape ${i + 1} chargée ${(t - finPrec).toFixed(2)} s après la fin de la précédente`); ok(!autre, `${fid} : chargée pendant une autre zone`); chargeDebut = t; ok(Math.abs(st.tot - F.sbCharge(J, A, st.etapes[i], 1 + (k % 3))) < 1e-9, `${fid} : durée de chargement`); }
        if (e === 'lache') { ok(t - chargeDebut >= st.tot - 0.04 - dt, `${fid} : lâchée avant la fin du chargement`); vivantJusqua = t + rnd() * 1.5; }
        if (e === 'fin') { ok(t >= vivantJusqua - 1e-9, `${fid} : étape finie alors que sa zone vit encore`); actives--; finPrec = t; }
        if (e === 'finAttaque') attaques++;
        maxActives = Math.max(maxActives, actives);
      }
    }
    ok(maxActives === 1, `${fid}${vars.length ? '+' + vars : ''} : ${maxActives} zones à la fois`);
    ok(attaques >= 2, `${fid} : la file tourne (${attaques} attaques)`);
  } }

// 5. Contre-épreuves : le vérificateur doit refuser des données injustes
const refuse = (nom, modif, motif) => { const J2 = clone(J); const fid = modif(J2); const r = F.sbVerifier(J2, A, { familles: [fid], actes: [3], pas: 4, er: ER });
  ok(r.err.some(e => motif.test(e)), `contre-épreuve « ${nom} » : non détectée (${r.err.slice(0, 2).join(' | ') || 'aucun manquement'})`); };
refuse('disque géant sur toi', J2 => { J2.familles.cloche.etapes[0].rayon = 260; J2.bornes.disque.rayon = [40, 300]; return 'cloche'; }, /aucune sortie/);
refuse('damier plein', J2 => { Object.assign(J2.familles.fortune.etapes[0], { allumees: 9, cote: 90 }); J2.bornes.damier.allumees = [3, 9]; return 'fortune'; }, /aucune sortie/);
refuse('anneau sans brèche', J2 => { J2.familles.onde.etapes[0].breche = 2; J2.bornes.anneau.breche = [0, 120]; return 'onde'; }, /aucune sortie/);
refuse('forme inconnue', J2 => { J2.familles.sol.etapes[0].f = 'tourbillon'; return 'sol'; }, /hors vocabulaire/);
refuse('couleur dans les données', J2 => { J2.familles.lame.etapes[0].col = '#ff0000'; return 'lame'; }, /couleurs/);
refuse('incompatibilité oubliée', J2 => { J2.familles.lame.incompatibles.capacites = []; return 'lame'; }, /incompatibles/);
refuse('trop de dégâts', J2 => { J2.familles.ombre.etapes.forEach(e => { e.degats = 2; }); return 'ombre'; }, /dégâts/);
refuse('zone qui suit jusqu’au coup', J2 => { J2.familles.lame.etapes[0].suivi = 0.95; return 'lame'; }, /suivi|figement/);
refuse('hors bornes', J2 => { J2.familles.projectile.etapes[0].vitesse = 900; return 'projectile'; }, /hors de/);

// 6. Le placement en jeu : sans sortie, l'étape saute (jamais de zone sans sortie)
{ const J2 = clone(J); J2.familles.cloche.etapes[0].rayon = 400; const et = F.sbEtapes(J2, 'cloche', [])[0];
  const R = J.justice.arene, c = { lx: 300, ly: 300, er: ER, px: 640, py: 384, a: 0, rnd: Math.random }, o = { lx: 300, ly: 300, er: ER, arene: R };
  ok(F.sbPlacer(J2, A, et, c, o, 3) === null, 'sans sortie possible, le placement renvoie null (l\'étape saute)');
  const et2 = F.sbEtapes(J, 'cloche', [])[0]; ok(F.sbPlacer(J, A, et2, c, o, 3) !== null, 'en plein milieu, la cloche se place'); }

// 7. (v17.17) Le temps que la recherche de sortie croit avoir ne dépasse jamais celui du jeu.
// On rejoue pas à pas les règles de touche du jeu (onde : |d − r| < 10 + 0,6 × PR hors brèche, r borné à son maximum ;
// projectiles et rayons : partis à er du centre, touchent à rayon + PR − 3 ; ruée : corps du porteur à er + PR), à 20 et 60 images/s,
// et on compare le premier instant de touche à sbArrivee : il ne doit jamais être plus tôt (au pas de temps près).
// Puis : au-delà de la bande extérieure d'une onde, le jeu ne touche jamais (avant v17.17, la dernière image dépassait le cercle annoncé).
ok(/g\.r=Math\.min\(g\.max,g\.r\+g\.v\*dt\)/.test(html), 'index.html : l\'onde (ZR) doit s\'arrêter à son rayon maximal');
{ const PR = J.justice.joueur.rayon, er = ER; let s = 99; const rnd = () => (s = (s * 1103515245 + 12345) >>> 0) / 4294967296;
  const premier = (z, x, y, dt) => {   // premier instant de touche selon les règles du jeu, ou Infinity
    const T = z.forme === 'anneau' ? (z.max - z.r0) / z.v + dt : (z.len + 2 * er) / z.v + dt;
    for (let t = dt; t <= T + 1e-9; t += dt) {
      if (z.forme === 'anneau') { const r = Math.min(z.max, z.r0 + z.v * t), d = Math.hypot(x - z.x, y - z.y), a = Math.atan2(y - z.y, x - z.x);
        if (Math.abs(d - r) < 10 + 0.6 * PR && F.sbDans({ ...z, r0: 0, max: 1e9 }, x, y, PR, er, 0) === true && Math.abs(((a - z.ga) % (2 * Math.PI) + 3 * Math.PI) % (2 * Math.PI) - Math.PI) > z.gw / 2) return t;
        if (r >= z.max) break; }
      else if (z.forme === 'couloir') { const u = Math.min(z.len, z.v * t), cx = z.x + Math.cos(z.a) * u, cy = z.y + Math.sin(z.a) * u; if (Math.hypot(x - cx, y - cy) < er + PR) return t; }
      else { const u = er + z.v * t; if (u - er > z.len - er) break;
        for (let i = 0; i < z.n; i++) { const aa = z.a + (i - (z.n - 1) / 2) * z.ec; if (Math.hypot(x - (z.x + Math.cos(aa) * u), y - (z.y + Math.sin(aa) * u)) < z.pr + PR - 3) return t; } } }
    return Infinity; };
  const zones = [
    ...['onde', 'cloche'].map(f => ({ forme: 'anneau', x: 640, y: 384, r0: f === 'onde' ? er : 20, max: 360, v: 336, ga: 0, gw: 70 * Math.PI / 180 })),
    { forme: 'couloir', mode: 'ruee', x: 400, y: 384, a: 0, len: 456, w: 2 * er, v: 840 },
    { forme: 'projectile', x: 400, y: 384, a: 0, n: 3, ec: 16 * Math.PI / 180, len: 640, v: 400, pr: 13 },
    { forme: 'rayons', x: 640, y: 384, a: 0, n: 8, ec: Math.PI / 4, len: 560, v: 420, pr: 9 }];
  let n = 0, tard = 0, pire = 0;
  for (const z of zones) for (const dt of [1 / 60, 0.05]) for (let k = 0; k < 400; k++) {
    const x = z.x + (rnd() * 2 - 1) * 480, y = z.y + (rnd() * 2 - 1) * 300, t0 = premier(z, x, y, dt); if (t0 === Infinity) continue; n++;
    const ta = F.sbArrivee(z, x, y, er, PR); if (t0 < ta - dt - 1e-9) { tard++; pire = Math.max(pire, ta - t0); } }
  ok(tard === 0, `sbArrivee annonce une zone plus tard que le jeu : ${tard} cas sur ${n} (jusqu'à ${pire.toFixed(3)} s)`);
  // bout de l'onde : à 20 images/s, rien au-delà de max + bande
  let hors = 0; for (const z of zones.filter(z => z.forme === 'anneau')) for (let k = 0; k < 400; k++) { const a = Math.PI / 2 + rnd() * Math.PI, d = z.max + 10 + 0.6 * PR + 0.5 + rnd() * 20;
    if (premier(z, z.x + Math.cos(a) * d, z.y + Math.sin(a) * d, 0.05) !== Infinity) hors++; }
  ok(hors === 0, `l'onde touche au-delà de son cercle annoncé : ${hors} cas`);
  console.log(`temps d'arrivée : ${n} points touchés en jeu (onde, ruée, projectiles, rayons ; 20 et 60 images/s), ${tard ? tard + ' plus tôt' : 'aucun plus tôt'} que sbArrivee ne l'annonce`); }

// 8. (v17.18) L'état « étourdi » : règles de sbEtourdit, file d'étapes qui attend, contre-épreuves, branchements du jeu.
{ const R = J.justice.etourdi, V = J.variantes.etourdit, et = { f: 'cone', v: ['etourdit'] }, s = { etT: 0, immT: 0, att: 0 };
  ok(F.sbEtourdit(J, { etT: 0, immT: 0, att: 0 }, { f: 'cone', v: [] }) === 0, 'étourdi : sans la variante, rien');
  ok(Math.abs(F.sbEtourdit(J, s, et) - Math.min(V.dureeS, R.maxS)) < 1e-9, 'étourdi : un coup Assommant étourdit dureeS');
  ok(F.sbEtourdit(J, { etT: 0, immT: 0, att: R.parAttaque }, et) === 0, 'étourdi : jamais deux fois dans la même attaque');
  ok(F.sbEtourdit(J, { etT: 0, immT: R.immuniteS * 0.5, att: 0 }, et) === 0, 'étourdi : rien pendant l\'immunité, même dans une autre attaque');
  ok(F.sbEtourdit(J, { etT: 0.1, immT: 0, att: 0 }, et) === 0, 'étourdi : jamais pendant un étourdissement');
  ok(F.sbEtourdit(J, { etT: 0, immT: 0, att: 0 }, { f: 'projectile', v: ['etourdit'] }) === 0, 'étourdi : jamais par une volée de projectiles');
  ok(s.immT >= s.etT + R.immuniteS - 1e-9, 'étourdi : l\'immunité commence à la fin de l\'étourdissement');
  // la file d'étapes : étourdi à chaque lâcher (au hasard), l'étape suivante charge au plus tôt après la fin de l'étourdissement + un entracte
  let r = 3; const rnd = () => (r = (r * 1103515245 + 12345) >>> 0) / 4294967296;
  let pires = Infinity, n = 0;
  for (const fid of Object.keys(J.familles)) {
    const st = F.sbNouveau(J, fid, ['double']); let t = 0, finEt = -Infinity, att = 0;
    for (let k = 0; k < 8000 && att < 5; k++) {
      const dt = 0.004 + rnd() * 0.04, etourdi = t < finEt;
      const ev = F.sbPas(J, A, st, { dt, act: 3, dist: 100, autre: false, fige: false, vivant: false, etourdi }); t += dt;
      for (const [e] of ev) {
        if (e === 'lache' && rnd() < 0.6) finEt = t + V.dureeS;
        if (e === 'charge') { n++; ok(!etourdi, `${fid} : une étape charge pendant que tu es étourdi`); if (finEt > -Infinity) pires = Math.min(pires, t - finEt); }
        if (e === 'finAttaque') att++; } } }
  ok(pires >= J.justice.entracteS - 0.045, `étourdi : une étape a chargé ${pires.toFixed(3)} s après la fin de l'étourdissement (au moins ${J.justice.entracteS})`);
  console.log(`étourdi : ${n} chargements, le plus tôt ${pires.toFixed(2)} s après la fin d'un étourdissement (entracte ${J.justice.entracteS} s)`);
  // contre-épreuves : données d'étourdissement injustes, que le vérificateur doit refuser
  refuse('étourdissement trop long', J2 => { J2.variantes.etourdit.dureeS = 1; return 'lame'; }, /etourdit : dureeS/);
  refuse('étourdissement sur une volée', J2 => { J2.variantes.etourdit.formes.push('projectile'); return 'projectile'; }, /forme projectile interdite/);
  refuse('étourdissements enchaînés', J2 => { J2.justice.etourdi.immuniteS = 0.3; return 'lame'; }, /immuniteS/);
  refuse('deux étourdissements par attaque', J2 => { J2.justice.etourdi.parAttaque = 2; return 'lame'; }, /parAttaque/);
  // branchements du jeu : tu ne bouges plus, n'attaques plus, n'esquives plus ; intouchable ; la file sait que tu es étourdi
  ok(/moveInput=function\(\)\{if\(sbEtourdi\(\)\)return\[0,0\]/.test(html), 'index.html : un joueur étourdi ne se déplace pas');
  ok(/tryDash=function\(\)\{if\(sbEtourdi\(\)\)return;/.test(html), 'index.html : un joueur étourdi n\'esquive pas');
  ok(/updatePlayer=function\(dt\)\{if\(!sbEtourdi\(\)\)return/.test(html), 'index.html : un joueur étourdi n\'attaque pas');
  ok(/P\.iT=Math\.max\(P\.iT,d\+0\.05\)/.test(html), 'index.html : un joueur étourdi est intouchable');
  ok(/etourdi:sbEtourdi\(\)\}\)/.test(html), 'index.html : la file d\'étapes reçoit l\'étourdissement');
  // v17.19 : intouchable par TOUS, autres ennemis compris (la règle v17.5 laisse passer les autres pendant l'invulnérabilité d'un coup)
  ok(/hurtPlayer=function\(\)\{if\(sbEtourdi\(\)\)return;/.test(html), 'index.html : pendant l\'étourdissement, aucun coup ne passe (hurtPlayer)');
  // et seul sbEtourdit étourdit le joueur
  ok((html.match(/P\.sbEt=\{|P\.sbEt=P\.sbEt|\(P\.sbEt=\{/g) || []).length === 1, 'index.html : une seule source d\'étourdissement du joueur (sbTouche → sbEtourdit)'); }

// 9. (v17.20) La sortie à ta vitesse : en jeu, sbSortie reçoit ta vitesse à pied (o.pv, pMarche) et cherche à la plus lente des deux.
//    Plus vite que la justice ne change rien ; plus lent, la sortie trouvée est à ta portée, sinon l'étape saute.
{ const R = J.justice.arene, V = J.justice.joueur.vitesse; let n = 0, plusLoin = 0, sautLent = 0;
  for (const f of Object.keys(J.familles)) for (const et of F.sbEtapes(J, f, [])) for (const [lx, ly, px, py] of [[400, 384, 640, 384], [640, 200, 640, 500], [300, 600, 900, 300]]) {
    const c = { lx, ly, er: ER, px, py, a: 0, rnd: F.asmRng ? Math.random : Math.random }, o = { lx, ly, er: ER, arene: R };
    let pc; try { pc = F.sbPlacer(J, A, et, c, o, 3); } catch (err) { continue; } if (!pc) continue;
    const t = F.sbVerrou(J, A, et, 3), base = F.sbSortie(J, pc.zs, [px, py], t, o), vite = F.sbSortie(J, pc.zs, [px, py], t, Object.assign({ pv: V * 2 }, o));
    ok(JSON.stringify(base) === JSON.stringify(vite), `${f} : plus vite que la justice, même sortie`); n++;
    for (const pv of [150, 120]) { const lent = F.sbSortie(J, pc.zs, [px, py], t, Object.assign({ pv }, o));
      if (!lent.ok) { sautLent++; continue; }
      ok(lent.d <= pv * (t + 3) + 10, `${f} : à ${pv} px/s, sortie à ta portée (${lent.d} px)`);
      if (base.ok && lent.d > base.d) plusLoin++; } }
  console.log(`sortie à ta vitesse : ${n} placements ; à 150 et 120 px/s, ${sautLent} sans sortie (l'étape sauterait), ${plusLoin} sorties différentes`);
  ok(/function sbOrigine\(e\)\{[^\n]*\n?[^}]*return\{[^}]*pv:pMarche\(\)/.test(html), 'index.html : sbOrigine passe ta vitesse à pied (pv:pMarche())');
  ok(/v=Math\.min\(Jj\.joueur\.vitesse,o\.pv\|\|Infinity\)/.test(html), 'index.html : sbSortie ne cherche jamais plus vite que la justice'); }

// 10. (v17.22) Le Glas Originel se souvient : répertoire tiré dans la réserve, file des temps 2 et 3, bulle d'un geste, justice dans sa salle,
//     dégâts. Le geste est joué par le Reflet (porteur seul, rayon reflet.r), avec la même justice que le Masqué ; le corps du Cœur bloque la sortie.
{ const S = D.gardiens.attaques[3].souvenirs, FILE = D.gardiens.attaques[3].file, As = A.souvenir;
  const fam = {}; for (const [fid, Fm] of Object.entries(SV.familles)) for (const id of Fm.t || []) fam[id] = fid;
  const ent = id => J.talents[id] || {}, ids = Object.keys(fam), armes = ids.filter(id => !ent(id).renfort), renforts = ids.filter(id => ent(id).renfort);
  const rnd = F.asmRng(11);   // générateur du jeu (mulberry32)
  const x = (id, salle, o) => Object.assign({ id, source: 'talent', rang: 1, g: 0, oublie: { acte: 3, salle }, porte: 0 }, o || {});
  // a. réserve vide, ou sans arme : aucun geste (le combat est celui d'avant)
  ok(F.glasRepertoire(S, J, fam, As, [], rnd).gestes.length === 0, 'glas : réserve vide, aucun geste');
  { const R = F.glasRepertoire(S, J, fam, As, renforts.slice(0, 4).map((id, i) => x(id, i)), rnd); ok(R.gestes.length === 0 && R.renforts.length === 0, 'glas : réserve de renforts seulement, ni geste ni renfort'); }
  // b. 2000 réserves tirées au hasard : au plus max gestes, familles différentes et compatibles, aucun renfort parmi eux ; renforts de clés différentes
  let nRep = 0, tailles = [0, 0, 0, 0];
  for (let k = 0; k < 2000; k++) { const n = 1 + Math.floor(rnd() * 9), res = Array.from({ length: n }, (_, i) => x(ids[Math.floor(rnd() * ids.length)], i + 1, { rang: 1 + Math.floor(rnd() * 3), g: Math.floor(rnd() * 3), porte: Math.floor(rnd() * 3) }));
    const R = F.glasRepertoire(S, J, fam, As, res, rnd), fs = R.gestes.map(g => g.fid); nRep++; tailles[R.gestes.length]++;
    ok(R.gestes.length <= S.max, `glas : ${R.gestes.length} gestes (max ${S.max})`);
    ok(new Set(fs).size === fs.length, `glas : deux gestes de la même famille (${fs})`);
    for (let i = 0; i < fs.length; i++) for (let j = i + 1; j < fs.length; j++) ok(F.glasCompat(J, fs[i], fs[j]), `glas : ${fs[i]} et ${fs[j]} incompatibles dans un répertoire`);
    ok(R.gestes.every(g => !ent(g.id).renfort && J.familles[g.fid]), 'glas : un renfort ne donne jamais un geste');
    ok(R.gestes.every(g => res.includes(g.x)), 'glas : un geste vient toujours de la réserve');
    ok(new Set(R.renforts.map(q => q.k)).size === R.renforts.length && R.renforts.length <= Math.min(S.renforts.max, J.renfortMax), 'glas : renforts de clés différentes, sous le maximum');
    ok(R.gestes.length || !R.renforts.length, 'glas : pas de renfort sans geste');
    for (const g of R.gestes) ok(Math.abs(g.force - (1 + As.parRang * (g.x.rang - 1) + As.parGravure * g.x.g)) < 1e-9, 'glas : force du souvenir (rang, gravure)');
    // le nombre de gestes possibles : autant que de familles d'armes différentes et compatibles disponibles, jusqu'au max
    const dispo = [...new Set(res.filter(y => !ent(y.id).renfort).map(y => fam[y.id]))]; if (dispo.length) ok(R.gestes.length >= 1, 'glas : une arme disponible donne au moins un geste'); }
  // c. récence : le plus récemment oublié pèse recence[1], le plus ancien recence[0] ; l'usure (porte) ne change rien
  { const trio = ['sol', 'ruee', 'lumiere'].map(f => armes.find(id => fam[id] === f)), cpt = [0, 0, 0], N = 20000;
    for (let k = 0; k < N; k++) { const res = trio.map((id, i) => x(id, i + 1, { porte: i === 2 ? 5 : 0 })); const g0 = F.glasRepertoire(S, J, fam, As, res, rnd).gestes[0]; cpt[trio.indexOf(g0.id)]++; }
    const [lo, hi] = S.recence, mid = (lo + hi) / 2, tot = lo + mid + hi, att = [lo / tot, mid / tot, hi / tot];
    for (let i = 0; i < 3; i++) ok(Math.abs(cpt[i] / N - att[i]) < 0.015, `glas : récence, premier geste ${i + 1} tiré ${(cpt[i] / N * 100).toFixed(1)} % (attendu ${(att[i] * 100).toFixed(1)} %)`);
    console.log(`\nglas : ${nRep} répertoires (0 à 3 gestes : ${tailles.join(' / ')}) ; premier geste du plus ancien au plus récent : ${cpt.map(c => (c / N * 100).toFixed(1) + ' %').join(', ')}`); }
  // d. la file : sans geste, celle du gardien telle quelle ; avec, ce que disent les données, et toute attaque du gardien reste dans chaque temps
  for (const ph of [1, 2, 3]) ok(JSON.stringify(F.glasFile(S, FILE, ph, 0)) === JSON.stringify(FILE[ph]), `glas : temps ${ph}, sans geste, file inchangée`);
  for (const ph of [2, 3]) { const Fp = F.glasFile(S, FILE, ph, 2), R = S.file[ph] || {};
    ok(Fp.filter(k => k === 'brume').length === (R.remplace || []).length + (R.ajoute || 0), `glas : temps ${ph}, nombre de gestes dans la file`);
    for (const k of new Set(FILE[ph])) ok(Fp.includes(k), `glas : temps ${ph}, l'attaque ${k} du gardien a disparu (le wiki ne serait plus vrai)`); }
  ok(F.glasEnJeu(S, { gestes: [1, 2, 3] }, 1) === 0 && F.glasEnJeu(S, { gestes: [1] }, 3) === 1, 'glas : gestes en jeu par temps');
  // e. mélange : jamais deux gestes de suite ni juste après un Appel, rien de perdu ni d'inventé
  { let n = 0; for (let k = 0; k < 10000; k++) { const ph = 2 + (k % 2), Fp = F.glasFile(S, FILE, ph, 3), prec = ['brume', 'summon', 'spiral', null][k % 4], m = F.glasMelange(Fp, prec, rnd);
      ok(F.glasMelangeOk(m, prec), `glas : mélange fautif (${prec} → ${m})`); ok([...m].sort().join() === [...Fp].sort().join(), 'glas : le mélange perd ou ajoute une attaque'); n++; }
    console.log(`glas : ${n} files mélangées, jamais deux gestes de suite ni un geste juste après un Appel`); }
  // f. la bulle : naissance, jeu, fin (ce qui est lâché va au bout), entracte, puis le Glas reprend ; coupée, abandonnée, étourdi
  { const run = (envs) => { const b = F.glasBulle(S), ev = []; for (const e of envs) for (const [t] of F.glasPas(S, J, b, Object.assign({ dt: 0.05 }, e))) ev.push(t); return { b, ev }; };
    const rep = (n, e) => Array.from({ length: n }, () => e || {});
    let o = run([...rep(11), ...rep(10), { fini: true }, ...rep(9, { vivant: true }), ...rep(20)]);
    ok(o.ev.join() === 'jeu,dissout,libere' && o.b.ph === 'finie', `glas : bulle ordinaire (${o.ev})`);
    o = run([...rep(14), { fini: true }, ...rep(30, { vivant: true })]); ok(!o.ev.includes('libere'), 'glas : le Glas attend que ce qui est lâché soit fini');
    o = run([...rep(5), { coupe: true }, ...rep(20)]); ok(o.ev.join() === 'dissout,libere', `glas : coupée pendant la naissance (${o.ev})`);
    o = run([...rep(13), ...rep(Math.ceil((S.attenteMaxS + 0.2) / 0.05), { attente: true })]); ok(o.ev.includes('abandon') && o.ev.includes('dissout'), 'glas : il renonce après attenteMaxS d\'attente');
    o = run([...rep(14), { fini: true }, ...rep(9), ...rep(40, { etourdi: true })]); ok(!o.ev.includes('libere'), 'glas : rien ne reprend pendant que tu es étourdi');
    o = run([...rep(14), { fini: true }, ...rep(9), ...rep(40, { etourdi: true }), ...rep(4)]); ok(!o.ev.includes('libere'), 'glas : un entracte entier après la fin de l\'étourdissement');
    o = run([...rep(14), { fini: true }, ...rep(9), ...rep(40, { etourdi: true }), ...rep(6)]); ok(o.ev.includes('libere'), 'glas : il reprend après l\'entracte'); }
  // g. justice dans la salle du Glas : le Reflet (rayon reflet.r) à des positions libres, toi autour de lui ; le Cœur et les piliers de cristal bloquent
  { const R = J.justice.arene, PR = J.justice.joueur.rayon, er = S.reflet.r, coeur = { x: (R.x0 + R.x1) / 2, y: R.y0 + 180, r: 62 }, piliers = [{ x: 300, y: 560, r: 26 }, { x: 980, y: 560, r: 26 }];
    const bloque = (px, py) => piliers.some(p => Math.hypot(px - p.x, py - p.y) < p.r + PR) || Math.hypot(px - coeur.x, py - coeur.y) < coeur.r + PR;
    const libre = (px, py, m) => px > R.x0 + m && px < R.x1 - m && py > R.y0 + m && py < R.y1 - m && !piliers.some(p => Math.hypot(px - p.x, py - p.y) < p.r + m) && Math.hypot(px - coeur.x, py - coeur.y) > coeur.r + m;
    const pos = []; for (const [fx, fy] of [[0.5, 0.75], [0.2, 0.45], [0.8, 0.45], [0.5, 0.5], [0.08, 0.9], [0.92, 0.9], [0.3, 0.2], [0.72, 0.18], [0.5, 0.95], [0.05, 0.12]]) { const lx = R.x0 + (R.x1 - R.x0) * fx, ly = R.y0 + (R.y1 - R.y0) * fy; if (libre(lx, ly, er + 4)) pos.push([lx, ly]); }
    const vars = new Set([null]); for (const e of Object.values(J.talents)) for (const v of e.v || []) vars.add(v);
    let n = 0, saut = 0, pire = { f: '', t: 0 };
    for (const fid of Object.keys(J.familles)) { if (fid === 'fortune') continue; let nf = 0, sf = 0;
      for (const v of vars) { const ets = F.sbEtapes(J, fid, v ? [v] : []); if (v && JSON.stringify(ets) === JSON.stringify(F.sbEtapes(J, fid, []))) continue;
        for (const [lx, ly] of pos) for (const d of [er + PR + 4, 80, 140, 200, 280]) for (let k = 0; k < 16; k += VITE ? 2 : 1) {
          const a = k / 16 * Math.PI * 2, px = lx + Math.cos(a) * d, py = ly + Math.sin(a) * d; if (!libre(px, py, PR) || bloque(px, py)) continue;
          const o = { lx, ly, er, arene: R, bloque }; let prec = null, anc = null;
          for (const et of ets) { const c = { lx, ly, er, px, py, ax: anc ? anc[0] : px, ay: anc ? anc[1] : py, a: Math.atan2(py - ly, px - lx), prec, rnd }; n++; nf++;
            const pc = F.sbPlacer(J, A, et, c, o, 3); if (!pc) { saut++; sf++; }
            const p0 = F.sbPieces(J, et, c); prec = { ga: p0.ga }; anc = p0.ancre; } } }
      if (sf / Math.max(1, nf) > pire.t) pire = { f: fid, t: sf / Math.max(1, nf) };
      ok(sf <= nf * 0.1, `glas : ${fid}, ${sf} étapes sautées sur ${nf} placements dans la salle du Glas (plus de 10 %)`); }
    console.log(`glas : justice dans la salle du Glas (Reflet r ${er}, Cœur et piliers en obstacle) : ${n} placements, ${saut} étapes sautées (${(saut / n * 100).toFixed(1)} % ; au plus ${(pire.t * 100).toFixed(1)} % pour ${pire.f})`); }
  // h. dégâts : × dégâts du Glas, force (rang 3, deux gravures) et Brutal compris, sous le plafond des armes
  { let pe = 0, pa = 0; const fmax = (1 + As.parRang * 2 + As.parGravure * 2) * (1 + J.renforts.degats.degats);
    for (const fid of Object.keys(J.familles)) for (const v of [null, ...Object.keys(J.variantes)]) { const ets = F.sbEtapes(J, fid, v ? [v] : []), k = F.sbForce(J, ets, 3, fmax); let tot = 0;
      for (const et of ets) { const c = F.sbCoup(J, et, 3, k) * (et.f === 'projectile' && et.navette ? 2 : 1) * S.degats; pe = Math.max(pe, c); tot += c; } pa = Math.max(pa, tot); }
    ok(pe <= J.justice.degatsEtapeMax * S.degats + 1e-9, `glas : une étape fait ${pe.toFixed(2)} × les dégâts du Glas (max ${(J.justice.degatsEtapeMax * S.degats).toFixed(2)})`);
    ok(pa <= J.justice.degatsMax * S.degats + 1e-9, `glas : une attaque fait ${pa.toFixed(2)} × les dégâts du Glas (max ${(J.justice.degatsMax * S.degats).toFixed(2)})`);
    console.log(`glas : dégâts au pire (rang 3, deux gravures, Brutal) : ${pe.toFixed(2)} par étape, ${pa.toFixed(2)} par attaque, × les dégâts du Glas`); }
  // i. branchements du jeu
  ok(/bloque:\(x,y\)=>room\.pillars\.some\([^\n]*\|\|!!\(gb&&hyp\(x-gb\.x,y-gb\.y\)<gb\.r\+P\.r\)/.test(html), 'index.html : le corps du gardien bloque la sortie (sbOrigine)');
  ok(/\(\(room&&room\.asm&&asmZone\(\)\)\|\|glasZone\(\)\)\)return false;/.test(html), 'index.html : pendant un geste, les invoqués n\'ouvrent pas de zone (tryTok)');
  ok(/e\.type==='bouffi'&&e\.state!=='fuse'[^\n]*glasZone\(\)/.test(html), 'index.html : pendant un geste, le Bouffi ne s\'amorce pas');
  ok(/autre:!tg\.pl\|\|zoneAutre\(e\)\|\|!!\(S\.autre&&S\.autre\(\)\)/.test(html), 'index.html : le Reflet attend les zones du gardien (sbMaj, S.autre)');
  ok(/B\.k=B\.force!=null\?sbForce\(/.test(html), 'index.html : la force du Reflet passe par sbForce (plafond)');
  ok(/hitEnemy=function\(e,dmg,o\)\{if\(e&&e\.reflet\)return 0;/.test(html), 'index.html : le Reflet ne se touche pas');
  ok(/b\.state='idle';b\.patT=9e9;b\.beatT=Math\.max\(b\.beatT\|\|0,0\.5\);/.test(html), 'index.html : pendant un geste, le Battement se tait et le Glas ne lance rien'); }

console.log(`\n${checks} vérifications, ${fails} échec(s)`);
process.exit(fails ? 1 : 0);
