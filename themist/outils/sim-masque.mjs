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
for (const f of ['bestiaire.js', 'masque.js']) vm.runInContext(readFileSync(join(ROOT, 'data', f), 'utf8'), ctx);
vm.runInContext(m[1] + '\nthis.F={asmRng,asmEligible,asmCombos,asmTirage,asmCycle,asmDuree,asmEffet,asmNouveau,asmPas,asmFin,asmNom};', ctx);
const F = ctx.F, A = ctx.window.BRUME_DATA.bestiaire.assemble;
let fails = 0, checks = 0;
const ok = (c, msg) => { checks++; if (!c) { fails++; console.error('ÉCHEC : ' + msg); } };
const zones = new Set([...Object.keys(A.capacites), ...Object.keys(A.signatures)]);

// 1. Combinaisons
for (const [act, salle] of [[2, 9], [2, 13], [2, 14], [3, 16], [3, 20]]) {
  const L = F.asmCombos(A, { act, salle });
  const bases = new Set(L.map(c => c.base));
  console.log(`acte ${act}, salle ${salle} : ${bases.size} combinaisons (${L.length} avec la capacité d'éveil) — ${[...bases].join(', ')}`);
  ok(bases.size >= 2, `acte ${act} salle ${salle} : au moins deux combinaisons pour pouvoir alterner`);
  for (const c of L) {
    const C = A.corps[c.corps], all = [...c.depart, c.eveil];
    ok(new Set(all).size === 3, `${c.cle} : trois capacités distinctes`);
    ok(all.every(k => !(C.exclut || []).includes(k)), `${c.cle} : exclusion du corps`);
    for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++)
      ok(!A.incompatibles.some(([x, y]) => (x === all[i] && y === all[j]) || (x === all[j] && y === all[i])), `${c.cle} : incompatibilité ${all[i]}/${all[j]}`);
    ok(c.menace <= A.budgetMenace[act], `${c.cle} : budget de menace`);
    ok(!C.salle || salle >= C.salle, `${c.cle} : corps disponible à cette salle`);
  }
}
// 2. Tirage : jamais deux fois la même combinaison de suite (10 000 apparitions par contexte)
for (const [act, salle] of [[2, 10], [3, 18]]) {
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

// 3. File de sorts : simulation d'un combat complet par combinaison, à pas de temps irréguliers
let combats = 0;
for (const act of [2, 3]) for (const co of F.asmCombos(A, { act, salle: 18 })) for (let rep = 0; rep < 25; rep++) {
  combats++;
  const rnd = F.asmRng(rep * 97 + co.cle.length), st = F.asmNouveau(A, co);
  let t = 0, pv = 100, active = null, lastEnd = -1e9, lastCast = null, cycle = [], eveilAt = null, casts = 0, sigs = 0;
  const dur = 60 + rep;
  while (t < dur) {
    const dt = 0.004 + rnd() * 0.03; t += dt;
    pv = Math.max(1, 100 - t * (100 / dur) * 1.4);
    const env = { dt, act, pv, dist: 60 + rnd() * 300, autre: rnd() < 0.02, fige: rnd() < 0.01 };
    for (const [ev, k] of F.asmPas(A, st, env, rnd)) {
      if (ev === 'eveil') { eveilAt = pv; ok(st.caps.length === 3, `${co.cle} : trois capacités après l'éveil`); }
      if (ev === 'charge') {
        ok(active === null, `${co.cle} : deux zones à la fois (${active} puis ${k})`);
        ok(t - lastEnd >= A.pauseS - 1e-9, `${co.cle} : pause entre deux zones ${(t - lastEnd).toFixed(3)} s < ${A.pauseS} s`);
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
  ok(eveilAt !== null && eveilAt <= A.eveilPV, `${co.cle} : éveil à mi-vie (${eveilAt})`);
  ok(sigs >= 2, `${co.cle} : signature lancée (${sigs})`);
  ok(F.asmNom(A, co).split(' ').length <= 5, `${co.cle} : nom court`);
}
console.log(`file de sorts : ${combats} combats simulés`);
// durées de chargement : jamais sous les planchers, même à l'acte III et au-delà
for (const act of [2, 3, 4, 6]) { for (const k of Object.keys(A.signatures)) ok(F.asmDuree(A, k, act) >= A.signatureMinS, `signature ${k} acte ${act}`);
  for (const k of Object.keys(A.capacites)) ok(F.asmDuree(A, k, act) >= A.chargeMinS, `capacité ${k} acte ${act}`); }
{ const B = JSON.parse(JSON.stringify(A)); for (const s of Object.values(B.signatures)) s.chargeS = 0.2; for (const k of Object.keys(B.signatures)) ok(F.asmDuree(B, k, 3) >= B.signatureMinS, 'plancher de la signature même si sa durée propre est plus courte'); }

// 4. Éligibilité des salles
const R = (o) => Object.assign({ type: 'elite', act: 2, roomIdx: 2, actRooms: 6, breche: false, demo: false, hub: false }, o);
ok(F.asmEligible(A, R({})), 'élite d\'acte II éligible');
ok(!F.asmEligible(A, R({ act: 1 })), 'jamais à l\'acte I');
ok(!F.asmEligible(A, R({ type: 'combat' })), 'seulement en salle d\'élite');
ok(!F.asmEligible(A, R({ breche: true })), 'jamais en Brèche');
ok(!F.asmEligible(A, R({ demo: true })), 'jamais en ?demo=');
ok(!F.asmEligible(A, R({ roomIdx: 4 })) && !F.asmEligible(A, R({ roomIdx: 5 })) && !F.asmEligible(A, R({ roomIdx: 6 })), 'ni au gardien ni dans les deux salles d\'avant');
ok(F.asmEligible(A, R({ roomIdx: 3 })), 'trois salles avant le gardien : possible');

console.log(fails ? `${fails} échec(s) sur ${checks} contrôles` : `${checks} contrôles : tout est bon.`);
process.exit(fails ? 1 : 0);
