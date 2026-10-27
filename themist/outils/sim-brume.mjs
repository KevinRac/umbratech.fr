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
const asm = html.match(/\/\*asm:pur\*\/([\s\S]*?)\/\*\/asm:pur\*\//), sb = html.match(/\/\*sb:pur\*\/([\s\S]*?)\/\*\/sb:pur\*\//);
if (!asm || !sb) { console.error('Bloc /*asm:pur*/ ou /*sb:pur*/ introuvable'); process.exit(1); }
const ctx = { window: {}, Math, console };
vm.createContext(ctx);
for (const f of ['bestiaire.js', 'souvenirs.js', 'souvenirs-brume.js', 'icones.js']) vm.runInContext(readFileSync(join(ROOT, 'data', f), 'utf8'), ctx);
vm.runInContext(asm[1] + sb[1] + '\nthis.F={asmDuree,sbVerifier,sbEtapes,sbPieces,sbSortie,sbPlacer,sbCharge,sbPlancher,sbVerrou,sbPotentiel,sbIncompatibles,sbNouveau,sbPas,sbDegats,sbCoup,sbPlafond,sbDans,sbArrivee,sbEtourdit};', ctx);
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

console.log(`\n${checks} vérifications, ${fails} échec(s)`);
process.exit(fails ? 1 : 0);
