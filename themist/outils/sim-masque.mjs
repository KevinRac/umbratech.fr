#!/usr/bin/env node
// La Brume · vérification hors navigateur du Masqué (élite assemblé, v16.24)
// Extrait la logique pure d'index.html (entre /*asm:pur*/ et /*/asm:pur*/) et la fait tourner avec data/bestiaire.js.
// Vérifie : le tirage (jamais deux fois la même combinaison de suite, incompatibilités et exclusions respectées,
// budget de menace), la file de sorts (jamais deux zones à la fois, pause fixe respectée, signature jamais sous sa durée
// minimale, jamais deux fois la même capacité de suite, signature en fin de cycle, éveil à mi-vie) et l'éligibilité des salles.
//   node themist/outils/sim-masque.mjs
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
const m = html.match(/\/\*asm:pur\*\/([\s\S]*?)\/\*\/asm:pur\*\//);
if (!m) { console.error('Bloc /*asm:pur*/ introuvable'); process.exit(1); }
const ctx = { window: {}, Math, console };
vm.createContext(ctx);
for (const f of ['bestiaire.js', 'masque.js', 'souvenirs.js']) vm.runInContext(readFileSync(join(ROOT, 'data', f), 'utf8'), ctx);
vm.runInContext(m[1] + '\nthis.F={asmRng,asmEligible,asmAppel,asmCombos,asmTirage,asmCycle,asmDuree,asmEffet,asmNouveau,asmPas,asmFin,asmNom,asmSouvenir};', ctx);
const F = ctx.F, A = ctx.window.BRUME_DATA.bestiaire.assemble, SV = ctx.window.BRUME_DATA.souvenirs;
let fails = 0, checks = 0;
const ok = (c, msg) => { checks++; if (!c) { fails++; console.error('ÉCHEC : ' + msg); } };
const zones = new Set([...Object.keys(A.capacites), ...Object.keys(A.signatures)]);
const SOUV = Object.keys(A.capacites).filter(k => A.capacites[k].souvenir);

// règles communes à toute combinaison
function regles(c, act, salle, porte) {
  const C = A.corps[c.corps], all = [...c.depart, c.eveil];
  ok(new Set(all).size === 3, `${c.cle} : trois capacités distinctes`);
  ok(all.every(k => !(C.exclut || []).includes(k)), `${c.cle} : exclusion du corps`);
  for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++)
    ok(!A.incompatibles.some(([x, y]) => (x === all[i] && y === all[j]) || (x === all[j] && y === all[i])), `${c.cle} : incompatibilité ${all[i]}/${all[j]}`);
  ok(c.menace <= A.budgetMenace[act], `${c.cle} : budget de menace`);
  ok(!C.salle || salle >= C.salle, `${c.cle} : corps disponible à cette salle`);
  if (porte) ok(c.depart.includes(porte), `${c.cle} : la capacité portée (${porte}) est au départ`);
  ok(all.every(k => !A.capacites[k].souvenir || k === porte), `${c.cle} : capacité de souvenir sans souvenir`);
}

// 1. Combinaisons
for (const [act, salle] of [[1, 3], [1, 6], [2, 9], [2, 13], [2, 14], [3, 16], [3, 20]]) {
  const L = F.asmCombos(A, { act, salle });
  const bases = new Set(L.map(c => c.base));
  console.log(`acte ${act}, salle ${salle} : ${bases.size} combinaisons (${L.length} avec la capacité d'éveil) — ${[...bases].join(', ')}`);
  ok(bases.size >= 2, `acte ${act} salle ${salle} : au moins deux combinaisons pour pouvoir alterner`);
  for (const c of L) regles(c, act, salle, null);
}

// 1 bis (v17.9). Souvenir porté : chaque famille portable a une capacité connue, et chaque capacité portée trouve des combinaisons
ok(SOUV.length >= 1, 'au moins une capacité de souvenir');
for (const [fam, cap] of Object.entries(A.souvenir.familles)) {
  ok(SV.familles[fam], `famille ${fam} : absente de data/souvenirs.js`);
  ok(A.capacites[cap], `famille ${fam} : capacité ${cap} inconnue`);
}
for (const k of SOUV) ok(Object.values(A.souvenir.familles).includes(k), `capacité de souvenir ${k} : aucune famille ne la donne`);
// 1 ter (v17.11). Géométrie des zones qui durent : on doit toujours pouvoir s'en sortir ou s'y glisser
{ const PR = 11, VMIN = 190;   // rayon du joueur ; vitesse la plus basse envisagée (Gouffre en dévoration ≈ 0,6 × vitesse de base)
  const T = A.capacites.tourbillon, C = A.capacites.cercles;
  ok(T && T.coeur < T.rayon && T.attire > 0 && T.tic > 0.65 * 0.7 && T.effetS > 0, 'tourbillon : champs et cœur dans le disque');
  ok(T.finS >= 0.65 && T.finS < T.effetS, `tourbillon : finS (${T.finS}) doit couvrir l'invulnérabilité du joueur (0,65 s)`);
  ok(T.attire < VMIN * 0.7, `tourbillon : l'attraction (${T.attire}) doit rester sous 70 % de la vitesse la plus basse (${VMIN})`);
  ok(T.rayon / (VMIN - T.attire) <= T.effetS + T.chargeS + 0.2, `tourbillon : on doit pouvoir sortir du disque à temps (${(T.rayon / (VMIN - T.attire)).toFixed(2)} s)`);
  ok(C && C.nombre >= 2 && C.pas - C.largeur >= 2 * PR * 0.5 + 24, `cercles : l'espace entre deux anneaux (${C.pas - C.largeur} px) doit laisser passer le joueur`);
  ok(Math.abs(C.effetS - ((C.nombre - 1) * C.battueS + 0.55)) < 0.2, `cercles : effetS (${C.effetS}) ≈ (nombre-1) × battueS + 0,55`);
  ok(C.battueS >= 0.4, 'cercles : une battue plus courte que l’invulnérabilité du joueur la rendrait injuste'); }
// 1 quater (v17.13). Fil et Faisceau
{ const PR = 11, VMIN = 190, F = A.capacites.fil, Q = A.capacites.faisceau;
  const chargeMin = Math.max(A.chargeMinS, Math.min(F.chargeS, Q.chargeS) * Math.pow(A.accelerationActe, 2));
  ok(F && F.largeur >= 2 * PR && F.suivi > 0 && F.suivi < 1, `fil : largeur (${F.largeur}) au moins un joueur, suivi entre 0 et 1`);
  ok(F.tire < VMIN, `fil : la traction (${F.tire}) doit rester sous la vitesse la plus basse (${VMIN}) : on peut toujours résister`);
  ok(F.tire * F.effetS <= F.longueur, 'fil : on n’est pas tiré plus loin que la longueur du fil');
  const s = Math.sin(Q.balayage * Math.PI / 360), pire = Q.longueur * s / (1 + s);   // pire distance de fuite (latérale = radiale), au plus favorable des deux
  ok(Q && Q.balayage > 0 && Q.balayage < 180 && Q.largeur >= 2 * PR, 'faisceau : balayage et largeur raisonnables');
  ok(pire <= VMIN * (chargeMin + 0.3), `faisceau : la pire fuite du secteur (${pire.toFixed(0)} px) doit tenir dans le chargement le plus court (${(chargeMin + 0.3).toFixed(2)} s à ${VMIN} px/s)`);
  ok(Q.effetS >= 1, 'faisceau : un balayage plus court que 1 s serait trop rapide à lire'); }
for (const [act, salle] of [[1, 3], [2, 9], [2, 14], [3, 18]]) {
  const parts = [];
  for (const cap of new Set(Object.values(A.souvenir.familles))) {
    const L = F.asmCombos(A, { act, salle, porte: cap });
    ok(L.length >= 1, `acte ${act} salle ${salle} : aucune combinaison ne peut porter ${cap}`);
    for (const c of L) regles(c, act, salle, cap);
    parts.push(`${cap} ${new Set(L.map(c => c.base)).size}`);
  }
  console.log(`porteur, acte ${act} salle ${salle} : ${parts.join(' · ')} combinaisons`);
}
// 2. Tirage : jamais deux fois la même combinaison de suite (10 000 apparitions par contexte)
for (const [act, salle] of [[1, 4], [2, 10], [3, 18]]) {
  let last = null, seen = {};
  for (let i = 0; i < 10000; i++) {
    const rnd = F.asmRng((i * 2654435761) >>> 0), co = F.asmTirage(A, { act, salle }, last, rnd, null);
    ok(co && co.base !== last, `tirage ${i} : même combinaison deux fois de suite (${co && co.base})`);
    seen[co.base] = (seen[co.base] || 0) + 1; last = co.base;
  }
  const n = Object.values(seen);
  console.log(`tirage acte ${act} : ${n.length} combinaisons tirées, de ${Math.min(...n)} à ${Math.max(...n)} fois sur 10 000`);
}
// la pondération par profil, coupée par défaut, ne change rien ; allumée, elle déplace le tirage sans casser les règles
{ const B = JSON.parse(JSON.stringify(A)); B.poidsProfil.actif = true;
  let last = null, tirs = 0; for (let i = 0; i < 4000; i++) { const co = F.asmTirage(B, { act: 3, salle: 18 }, last, F.asmRng(i + 7), { portee: 1, esquive: 0.5, risque: 0.5 }); ok(co.base !== last, 'tirage pondéré : répétition'); last = co.base; if ([...co.depart, co.eveil].includes('tirs')) tirs++; }
  let t0 = 0, last2 = null; for (let i = 0; i < 4000; i++) { const co = F.asmTirage(A, { act: 3, salle: 18 }, last2, F.asmRng(i + 7), { portee: 1 }); last2 = co.base; if ([...co.depart, co.eveil].includes('tirs')) t0++; }
  console.log(`profil « frappe de loin » : Salve dans ${t0} tirages sans pondération, ${tirs} avec`);
  ok(tirs > t0, 'la pondération par profil favorise la capacité visée'); }

// 2 bis (v17.9). Choix du souvenir dans la réserve
{
  const fam = {}; for (const [k, f] of Object.entries(SV.familles)) (f.t || []).forEach(id => { fam[id] = k; });
  const de = f => SV.familles[f].t[0], ent = (id, o) => Object.assign({ id, source: 'talent', rang: 1, g: 0, porte: 0 }, o);
  const portable = Object.keys(A.souvenir.familles), nonPortable = Object.keys(SV.familles).filter(f => !portable.includes(f) && (SV.familles[f].t || []).length);
  const S100 = Object.assign({}, A, { souvenir: Object.assign({}, A.souvenir, { chance: 100 }) });
  ok(F.asmSouvenir(S100, [], fam, F.asmRng(1), 0) === null, 'réserve vide : rien');
  if (nonPortable.length) ok(F.asmSouvenir(S100, nonPortable.map(f => ent(de(f))), fam, F.asmRng(2), 0) === null, `familles sans capacité (${nonPortable.join(', ')}) : rien`);
  ok(F.asmSouvenir(S100, [ent('chain', { source: 'relique' })], fam, F.asmRng(3), 0) === null, 'une relique ne se porte pas');
  ok(F.asmSouvenir(S100, [ent(de('sol'))], fam, F.asmRng(4), A.souvenir.parActe) === null, 'plafond de porteurs par acte');
  for (const f of portable) { const r = F.asmSouvenir(S100, [ent(de(f))], fam, F.asmRng(5), 0); ok(r && r.cap === A.souvenir.familles[f], `famille ${f} : capacité ${A.souvenir.familles[f]}`); }
  { const r = F.asmSouvenir(S100, [ent(de('sol'), { rang: 3, g: 2 })], fam, F.asmRng(6), 0);
    ok(Math.abs(r.force - (1 + 2 * A.souvenir.parRang + 2 * A.souvenir.parGravure)) < 1e-9, `force au rang 3, gravé deux fois (${r.force})`); }
  let n = 0; const N = 20000, res = [ent(de('sol'))];
  for (let i = 0; i < N; i++) if (F.asmSouvenir(A, res, fam, F.asmRng(i * 7 + 11), 0)) n++;
  console.log(`porteur : ${(n / N * 100).toFixed(1)} % des Masqués quand la réserve a un souvenir portable (réglé à ${A.souvenir.chance} %)`);
  ok(Math.abs(n / N * 100 - A.souvenir.chance) < 2, 'fréquence des porteurs');
  // usure : un souvenir déjà porté trois fois revient (1 + 3 × usure) fois moins souvent
  const neuf = ent(de('sol')), use = ent(de('lame'), { porte: 3 }); let a = 0, b = 0;
  for (let i = 0; i < N; i++) { const r = F.asmSouvenir(S100, [neuf, use], fam, F.asmRng(i + 99), 0); if (r.x === neuf) a++; else b++; }
  const att = 1 + 3 * A.souvenir.usure;
  console.log(`usure : neuf ${a}, porté trois fois ${b} (rapport ${(a / b).toFixed(2)}, attendu ${att})`);
  ok(Math.abs(a / b - att) < 0.4, 'usure');
}

// 3. File de sorts : simulation d'un combat complet par combinaison, à pas de temps irréguliers (avec les porteurs de souvenir)
let combats = 0;
const filesDe = act => [...F.asmCombos(A, { act, salle: 18 }), ...[...new Set(Object.values(A.souvenir.familles))].flatMap(cap => F.asmCombos(A, { act, salle: 18, porte: cap }).filter(c => A.capacites[cap].souvenir))];
for (const act of [2, 3]) for (const co of filesDe(act)) for (let rep = 0; rep < 25; rep++) {
  combats++;
  const rnd = F.asmRng(rep * 97 + co.cle.length), st = F.asmNouveau(A, co);
  let t = 0, pv = 100, active = null, lastEnd = -1e9, lastCast = null, cycle = [], eveilAt = null, casts = 0, sigs = 0, rageAt = null;
  const dur = 60 + rep;
  while (t < dur) {
    const dt = 0.004 + rnd() * 0.03; t += dt;
    pv = Math.max(1, 100 - t * (100 / dur) * 1.4);
    const env = { dt, act, pv, dist: 60 + rnd() * 300, autre: rnd() < 0.02, fige: rnd() < 0.01 };
    for (const [ev, k] of F.asmPas(A, st, env, rnd)) {
      if (ev === 'eveil') { eveilAt = pv; ok(st.caps.length === 3, `${co.cle} : trois capacités après l'éveil`); }
      if (ev === 'rage') { ok(rageAt === null, `${co.cle} : rage deux fois`); ok(eveilAt !== null, `${co.cle} : rage avant l'éveil`); rageAt = pv; }
      if (ev === 'charge') {
        ok(active === null, `${co.cle} : deux zones à la fois (${active} puis ${k})`);
        { const pmin = rageAt !== null && A.rage ? A.rage.pauseS : A.pauseS; ok(t - lastEnd >= pmin - 1e-9, `${co.cle} : pause entre deux zones ${(t - lastEnd).toFixed(3)} s < ${pmin} s`); }
        ok(k !== lastCast, `${co.cle} : ${k} deux fois de suite`);
        ok(zones.has(k), `${co.cle} : sort inconnu ${k}`);
        if (A.signatures[k]) { ok(st.tot >= A.signatureMinS - 1e-9, `${co.cle} : signature chargée en ${st.tot} s`); sigs++;
          ok(cycle.length >= 1 && new Set(cycle).size === cycle.length, `${co.cle} : cycle avant la signature (${cycle.join(',')})`); cycle = []; }
        else { ok(st.tot >= A.chargeMinS - 1e-9, `${co.cle} : capacité chargée en ${st.tot} s`); ok(st.caps.includes(k), `${co.cle} : ${k} hors de ses capacités`); cycle.push(k); }
        ok(st.ph === 'charge', `${co.cle} : état après chargement`);
        active = k; lastCast = k; casts++;
      }
      if (ev === 'fin') { active = null; lastEnd = t; }
    }
    if (st.ph === 'effet' && st.k === 'charge' && rnd() < 0.01) { F.asmFin(A, st, null); active = null; lastEnd = t; }   // la charge heurte un mur (le jeu le fait après le pas)
  }
  ok(eveilAt !== null && eveilAt <= A.eveilPV, `${co.cle} : éveil à ${A.eveilPV} % (${eveilAt})`);
  if (A.rage) ok(rageAt !== null && rageAt <= A.rage.pv, `${co.cle} : rage sous ${A.rage.pv} % (${rageAt})`);
  ok(sigs >= 2, `${co.cle} : signature lancée (${sigs})`);
  ok(F.asmNom(A, co).split(' ').length <= 5, `${co.cle} : nom court`);
}
console.log(`file de sorts : ${combats} combats simulés`);
// durées de chargement : jamais sous les planchers, même à l'acte III et au-delà
for (const act of [2, 3, 4, 6]) { for (const k of Object.keys(A.signatures)) ok(F.asmDuree(A, k, act) >= A.signatureMinS, `signature ${k} acte ${act}`);
  for (const k of Object.keys(A.capacites)) ok(F.asmDuree(A, k, act) >= A.chargeMinS, `capacité ${k} acte ${act}`); }
{ const B = JSON.parse(JSON.stringify(A)); for (const s of Object.values(B.signatures)) s.chargeS = 0.2; for (const k of Object.keys(B.signatures)) ok(F.asmDuree(B, k, 3) >= B.signatureMinS, 'plancher de la signature même si sa durée propre est plus courte'); }

// 4. Éligibilité des salles : toute salle de combat (combat, élite, Brèche), jamais au gardien ni en ?demo=
const R = (o) => Object.assign({ type: 'combat', act: 1, roomIdx: A.premiereSalle, actRooms: 7, breche: false, demo: false, hub: false, depuis: 9 }, o);
ok(F.asmEligible(A, R({})), 'salle de combat éligible');
ok(F.asmEligible(A, R({ type: 'elite', act: 2 })), 'salle d\'élite éligible');
ok(F.asmEligible(A, R({ breche: true })) === !!A.dansBreche, 'Brèche selon dansBreche');
ok(F.asmEligible(A, R({ breche: true, roomIdx: 1, depuis: 0 })) === !!A.dansBreche, 'Brèche : ni salle minimale ni écart');
ok(A.chanceBreche === 100, 'Brèche : il vient à chaque fois');
ok(!F.asmEligible(A, R({ type: 'boss', roomIdx: 7 })), 'jamais au gardien');
for (const t of ['autel', 'halte', 'marchand', 'sanctuaire']) ok(!F.asmEligible(A, R({ type: t })), `jamais en salle ${t}`);
ok(!F.asmEligible(A, R({ demo: true })) && !F.asmEligible(A, R({ hub: true })), 'jamais en ?demo= ni au Sanctuaire');
ok(!F.asmEligible(A, R({ roomIdx: A.premiereSalle - 1 })), 'pas avant la première salle prévue');
ok(F.asmEligible(A, R({ depuis: 0 })) === (A.ecartSalles <= 0), 'écart entre deux apparitions');
// 5. Appel : vite OU intact, puis une chance sur deux
const V = A.vite, I = A.intact;
ok(F.asmAppel(A, { salles: V.sallesMin, tempsS: V.sallesMin * V.salleMaxS, sansDegatsS: 0 }).ok, 'rapide : il vient');
ok(!F.asmAppel(A, { salles: V.sallesMin - 1, tempsS: 1, sansDegatsS: 0 }).ok, 'pas assez de salles pour juger la vitesse');
ok(!F.asmAppel(A, { salles: 4, tempsS: 4 * (V.salleMaxS + 5), sansDegatsS: I.sansDegatsS - 1 }).ok, 'lent et blessé : il ne vient pas');
ok(F.asmAppel(A, { salles: 4, tempsS: 4 * (V.salleMaxS + 5), sansDegatsS: I.sansDegatsS }).ok, 'lent mais intact : il vient');
{ let n = 0; const N = 20000; for (let i = 0; i < N; i++) if (F.asmAppel(A, { salles: 3, tempsS: 30, sansDegatsS: 0 }).ok && Math.random() * 100 < A.chance) n++;
  console.log(`appel rempli : il vient ${(n / N * 100).toFixed(1)} % du temps (réglé à ${A.chance} %)`); ok(Math.abs(n / N * 100 - A.chance) < 2, 'fréquence'); }

console.log(fails ? `${fails} échec(s) sur ${checks} contrôles` : `${checks} contrôles : tout est bon.`);
process.exit(fails ? 1 : 0);
