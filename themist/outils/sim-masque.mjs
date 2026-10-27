#!/usr/bin/env node
// La Brume · vérification hors navigateur du Masqué (élite assemblé, v16.24)
// Extrait la logique pure d'index.html (entre /*asm:pur*/ et /*/asm:pur*/) et la fait tourner avec data/bestiaire.js.
// Vérifie : le tirage (jamais deux fois la même combinaison de suite, incompatibilités et exclusions respectées,
// budget de menace), la file de sorts (jamais deux zones à la fois, pause fixe respectée, signature jamais sous sa durée
// minimale, jamais deux fois la même capacité de suite, signature en fin de cycle, éveil à mi-vie) et l'éligibilité des salles.
// v17.19 (palier 4) : le souvenir porté donne l'arme de la Brume de sa famille (data/souvenirs-brume.js) ou un renfort. On vérifie le tirage
// avec une réserve (fréquences, budget de menace, incompatibilités, renfort sans attaque, aucune capacité de souvenir v17.9–v17.14) et la file
// d'étapes intégrée au cycle (asmPas délègue à sbPas : jamais deux zones à la fois, éveil compris ; rien ne charge pendant un étourdissement).
//   node themist/outils/sim-masque.mjs
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
const m = html.match(/\/\*asm:pur\*\/([\s\S]*?)\/\*\/asm:pur\*\//), sbm = html.match(/\/\*sb:pur\*\/([\s\S]*?)\/\*\/sb:pur\*\//);
if (!m || !sbm) { console.error('Bloc /*asm:pur*/ ou /*sb:pur*/ introuvable'); process.exit(1); }
const ctx = { window: {}, Math, console };
vm.createContext(ctx);
for (const f of ['bestiaire.js', 'masque.js', 'souvenirs.js', 'souvenirs-brume.js', 'icones.js']) vm.runInContext(readFileSync(join(ROOT, 'data', f), 'utf8'), ctx);
vm.runInContext(m[1] + sbm[1] + '\nthis.F={asmRng,asmEligible,asmAppel,asmCombos,asmTirage,asmCycle,asmDuree,asmEffet,asmNouveau,asmPas,asmFin,asmNom,asmSouvenir,asmSb,asmMenace,asmIncomp,sbNouveau,sbPas,sbEtapes,sbForce,sbBrut,sbCoup,sbPlafond,sbCharge};', ctx);
const F = ctx.F, A = ctx.window.BRUME_DATA.bestiaire.assemble, SV = ctx.window.BRUME_DATA.souvenirs, J = ctx.window.BRUME_DATA.souvenirsBrume, IC = ctx.window.BRUME_DATA.icones;
let fails = 0, checks = 0;
const ok = (c, msg) => { checks++; if (!c) { fails++; console.error('ÉCHEC : ' + msg); } };
const zones = new Set([...Object.keys(A.capacites), ...Object.keys(A.signatures)]);
const RETIREES = ['taches', 'tourbillon', 'cercles', 'fil', 'faisceau', 'halo', 'voile', 'regen', 'carapace', 'fureur'];   // v17.9 à v17.14, remplacées en v17.19
const fam = {}; for (const [k, f] of Object.entries(SV.familles)) (f.t || []).forEach(id => { fam[id] = k; });

// règles communes à toute combinaison
function regles(c, act, salle, porte) {
  const C = A.corps[c.corps], all = [...c.depart, c.eveil];
  ok(new Set(all).size === 3, `${c.cle} : trois capacités distinctes`);
  ok(all.every(k => !(C.exclut || []).includes(k)), `${c.cle} : exclusion du corps`);
  for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++)
    ok(!A.incompatibles.some(([x, y]) => (x === all[i] && y === all[j]) || (x === all[j] && y === all[i])), `${c.cle} : incompatibilité ${all[i]}/${all[j]}`);
  const men = A.corps[c.corps].menace + A.signatures[C.signature].menace + all.reduce((s, k) => s + F.asmMenace(A, J, k), 0);
  ok(c.menace === men && c.menace <= A.budgetMenace[act], `${c.cle} : budget de menace (${c.menace}, recompté ${men}, budget ${A.budgetMenace[act]})`);
  ok(!C.salle || salle >= C.salle, `${c.cle} : corps disponible à cette salle`);
  ok(all.every(k => !RETIREES.includes(k)), `${c.cle} : capacité de souvenir retirée (v17.9–v17.14)`);
  ok(!F.asmSb(c.eveil), `${c.cle} : l'arme de la Brume n'est jamais la capacité d'éveil`);
  if (porte) {
    const f = F.asmSb(porte), I = J.familles[f].incompatibles;
    ok(c.depart.includes(porte), `${c.cle} : la capacité portée (${porte}) est au départ`);
    ok(!(I.corps || []).includes(c.corps), `${c.cle} : corps incompatible avec ${f}`);
    ok(all.every(k => !(I.capacites || []).includes(k)), `${c.cle} : capacité incompatible avec ${f}`);
    ok(all.every(k => k === porte || !F.asmSb(k)), `${c.cle} : deux armes de la Brume`);
  } else ok(all.every(k => A.capacites[k] && !F.asmSb(k)), `${c.cle} : arme de la Brume sans souvenir`);
}

// 1. Combinaisons
for (const [act, salle] of [[1, 3], [1, 6], [2, 9], [2, 13], [2, 14], [3, 16], [3, 20]]) {
  const L = F.asmCombos(A, { act, salle });
  const bases = new Set(L.map(c => c.base));
  console.log(`acte ${act}, salle ${salle} : ${bases.size} combinaisons (${L.length} avec la capacité d'éveil) — ${[...bases].join(', ')}`);
  ok(bases.size >= 2, `acte ${act} salle ${salle} : au moins deux combinaisons pour pouvoir alterner`);
  for (const c of L) regles(c, act, salle, null);
}

// 1 bis (v17.19). Arme de la Brume portée : les capacités de souvenir v17.9–v17.14 ont disparu ; chaque famille (15) trouve des
// combinaisons qui la portent, à chaque acte, sous le budget, avec ses incompatibilités (familles, capacités, corps)
ok(RETIREES.every(k => !A.capacites[k] && !(A.etats || {})[k]), 'capacités et états de souvenir v17.9–v17.14 retirés des données');
ok(!A.etats && !A.souvenir.familles && !A.souvenir.etats, 'assemble : plus de table famille → capacité ni d’états');
ok(!/souvenir:true/.test(readFileSync(join(ROOT, 'data', 'bestiaire.js'), 'utf8')), 'bestiaire.js : plus aucune capacité souvenir:true');
ok(F.asmCombos(A, { act: 2, salle: 10, porte: 'taches', J }).length === 0 && F.asmCombos(A, { act: 2, salle: 10, porte: 'sb:inconnue', J }).length === 0, 'un porte inconnu ne donne aucune combinaison');
for (const k of Object.keys(J.renforts)) ok(J.renforts[k].ic && IC[J.renforts[k].ic], `renfort ${k} : icône connue (data/icones.js)`);
// (le budget des actes I et II peut ne laisser aucune place à une arme lourde : elle n'est alors pas choisie, voir 2 bis ; à l'acte III, toutes passent)
const sansPlace = {};
for (const [act, salle] of [[1, 3], [2, 9], [2, 14], [3, 18]]) {
  const parts = [];
  for (const f of Object.keys(J.familles)) {
    const porte = 'sb:' + f, L = F.asmCombos(A, { act, salle, porte, J });
    if (act === 3) ok(L.length >= 1, `acte ${act} salle ${salle} : aucune combinaison ne peut porter ${f}`);
    else if (!L.length) (sansPlace[act] = sansPlace[act] || new Set()).add(f);
    for (const c of L) regles(c, act, salle, porte);
    parts.push(`${f} ${new Set(L.map(c => c.base)).size}`);
  }
  console.log(`porteur, acte ${act} salle ${salle} : ${parts.join(' · ')} combinaisons`);
}
for (const act in sansPlace) console.log(`acte ${act} : pas de place sous le budget (${A.budgetMenace[act]}) pour ${[...sansPlace[act]].join(', ')}`);
// l'incompatibilité entre familles (deux armes chez un même porteur, ce qui n'arrive pas aujourd'hui) est tenue par asmIncomp
for (const [f, Fm] of Object.entries(J.familles)) for (const g of Fm.incompatibles.familles || []) ok(F.asmIncomp(A, 'sb:' + f, 'sb:' + g, J), `asmIncomp : ${f} / ${g}`);
for (const [f, Fm] of Object.entries(J.familles)) for (const k of Fm.incompatibles.capacites || []) ok(F.asmIncomp(A, k, 'sb:' + f, J), `asmIncomp : ${k} / ${f}`);

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

// 2 bis (v17.19). Choix du souvenir dans la réserve : tout talent dont la famille a une arme se porte ; classé renfort, il ne donne pas d'attaque
{
  const de = f => SV.familles[f].t[0], ent = (id, o) => Object.assign({ id, source: 'talent', rang: 1, g: 0, porte: 0 }, o);
  const S100 = Object.assign({}, A, { souvenir: Object.assign({}, A.souvenir, { chance: 100 }) });
  ok(F.asmSouvenir(S100, [], fam, F.asmRng(1), 0, J) === null, 'réserve vide : rien');
  ok(F.asmSouvenir(S100, [ent('chain', { source: 'relique' })], fam, F.asmRng(3), 0, J) === null, 'une relique ne se porte pas');
  ok(F.asmSouvenir(S100, [ent(de('sol'))], fam, F.asmRng(4), A.souvenir.parActe, J) === null, 'plafond de porteurs par acte');
  let nAtt = 0, nRen = 0, nVar = 0;
  for (const id of Object.keys(fam)) { const r = F.asmSouvenir(S100, [ent(id)], fam, F.asmRng(5), 0, J), E = J.talents[id] || {};
    ok(r && r.fid === fam[id], `${id} : porté, famille ${fam[id]}`); if (!r) continue;
    if (E.renfort) { nRen++; ok(r.cap === null && r.renfort === E.renfort && !r.vars.length, `${id} : renfort ${E.renfort} sans attaque`); }
    else { nAtt++; ok(r.cap === 'sb:' + fam[id] && !r.renfort, `${id} : attaque de sa famille`); ok(JSON.stringify(r.vars) === JSON.stringify(E.v || []), `${id} : variantes ${E.v || '[]'}`); if ((E.v || []).length) nVar++; } }
  console.log(`souvenirs portables : ${nAtt} donnent une attaque (dont ${nVar} avec variante), ${nRen} un renfort`);
  { const r = F.asmSouvenir(S100, [ent(de('sol'), { rang: 3, g: 2 })], fam, F.asmRng(6), 0, J);
    ok(Math.abs(r.force - (1 + 2 * A.souvenir.parRang + 2 * A.souvenir.parGravure)) < 1e-9, `force au rang 3, gravé deux fois (${r.force})`); }
  // force sous le plafond : jamais plus que degatsMax pour l'attaque, ni degatsEtapeMax pour une étape
  for (const f of Object.keys(J.familles)) for (const v of [[], ...Object.keys(J.variantes).map(x => [x])]) for (const act of [1, 2, 3]) for (const force of [1, 1.15, 1.6, 2.2]) {
    const ets = F.sbEtapes(J, f, v), k = F.sbForce(J, ets, act, force); let tot = 0;
    for (const et of ets) { const c = F.sbCoup(J, et, act, k) * (et.f === 'projectile' && et.navette ? 2 : 1); tot += c; ok(c <= J.justice.degatsEtapeMax + 1e-9, `${f}+${v} acte ${act} force ${force} : une étape à ${c.toFixed(2)}`); }
    ok(tot <= J.justice.degatsMax + 1e-9, `${f}+${v} acte ${act} force ${force} : attaque à ${tot.toFixed(2)} (plafond ${J.justice.degatsMax})`);
    ok(k >= Math.min(force, F.sbPlafond(J, ets, act)) - 1e-9 && k <= force + 1e-9, `${f}+${v} acte ${act} : la force monte jusqu'au plafond`); }
  // tirage complet, comme en salle : réserve tirée au hasard, porteur → combinaison qui le porte, sinon Masqué ordinaire
  const ids = Object.keys(fam); let porteurs = 0, attaques = 0, renforts = 0, essais = 0, ordinaires = 0; const parFam = {};
  for (let i = 0; i < 30000; i++) {
    const rnd = F.asmRng(i * 131 + 7), act = 1 + (i % 3), salle = [4, 10, 18][act - 1], res = [];
    for (let k = 0, n = 1 + Math.floor(rnd() * 5); k < n; k++) res.push(ent(ids[Math.floor(rnd() * ids.length)], { rang: 1 + Math.floor(rnd() * 3), g: Math.floor(rnd() * 3), porte: Math.floor(rnd() * 3) }));
    const ctx = { act, salle, J }, peut = (f, E) => !!E.renfort || F.asmCombos(A, Object.assign({ porte: 'sb:' + f }, ctx)).length > 0;
    let sv = F.asmSouvenir(A, res, fam, rnd, 0, J, peut);
    if (res.some(x => peut(fam[x.id], J.talents[x.id] || {}))) essais++; else { ok(!sv, `tirage ${i} : souvenir sans place choisi`); continue; }
    if (sv && sv.cap) ok(peut(sv.fid, {}), `tirage ${i} : ${sv.fid} choisi sans place à l'acte ${act}`);
    const porte = sv && sv.cap ? { porte: sv.cap } : {};
    let co = F.asmTirage(A, Object.assign(porte, ctx), null, rnd, null);
    if (!co && sv) { ok(false, `tirage ${i} : ${sv.fid} choisi puis sans combinaison`); sv = null; co = F.asmTirage(A, ctx, null, rnd, null); }
    ok(co, `tirage ${i} : aucune combinaison`); if (!co) continue;
    regles(co, act, salle, sv && sv.cap);
    if (sv) { porteurs++; if (sv.cap) { attaques++; parFam[sv.fid] = (parFam[sv.fid] || 0) + 1; } else { renforts++; ok([...co.depart, co.eveil].every(k => !F.asmSb(k)), `tirage ${i} : un renfort ne donne pas d'attaque`); } }
    else { ordinaires++; ok([...co.depart, co.eveil].every(k => A.capacites[k]), `tirage ${i} : Masqué ordinaire avec une arme`); }
  }
  console.log(`tirage avec réserve (au moins un souvenir qui a sa place) : ${(porteurs / essais * 100).toFixed(1)} % de porteurs (réglé à ${A.souvenir.chance} %) — ${attaques} attaques, ${renforts} renforts ; familles : ${Object.entries(parFam).map(([f, n]) => f + ' ' + n).join(', ')}`);
  ok(Math.abs(porteurs / essais * 100 - A.souvenir.chance) < 2, 'fréquence des porteurs');
  ok(Object.keys(parFam).length === Object.keys(J.familles).filter(f => (SV.familles[f].t || []).length).length, 'toutes les familles qui ont des talents sont portées');
  // usure : un souvenir déjà porté trois fois revient (1 + 3 × usure) fois moins souvent
  const N = 20000, neuf = ent(de('sol')), use = ent(de('lame'), { porte: 3 }); let a = 0, b = 0;
  for (let i = 0; i < N; i++) { const r = F.asmSouvenir(S100, [neuf, use], fam, F.asmRng(i + 99), 0, J); if (r.x === neuf) a++; else b++; }
  const att = 1 + 3 * A.souvenir.usure;
  console.log(`usure : neuf ${a}, porté trois fois ${b} (rapport ${(a / b).toFixed(2)}, attendu ${att})`);
  ok(Math.abs(a / b - att) < 0.4, 'usure');
}

// 3. File de sorts : simulation d'un combat complet par combinaison, à pas de temps irréguliers. v17.19 : avec les porteurs d'une arme de
// la Brume (asmPas délègue à sbPas) : une zone à la fois (chargement → fin d'étape, éveil compris), entracte entre deux étapes, pause
// après l'attaque, aucune étape ni capacité qui charge pendant que tu es étourdi (ni moins d'un entracte après).
let combats = 0, attaquesSim = 0, etapesSim = 0;
const filesDe = act => [...F.asmCombos(A, { act, salle: 18, J }), ...Object.keys(J.familles).flatMap(f => F.asmCombos(A, { act, salle: 18, porte: 'sb:' + f, J }).filter((c, i) => i % 3 === 0).map(c => Object.assign({ vars: [] }, c)))];
for (const act of [1, 2, 3]) for (const co of filesDe(act)) for (let rep = 0; rep < (co.depart.some(F.asmSb) ? 6 : 25); rep++) {
  combats++;
  const rnd = F.asmRng(rep * 97 + co.cle.length), porte = co.depart.find(F.asmSb), vars = porte && rep % 2 ? ['double'] : [], st = F.asmNouveau(A, co, vars);
  let t = 0, pv = 100, active = null, lastEnd = -1e9, lastCast = null, cycle = [], eveilAt = null, casts = 0, sigs = 0, rageAt = null, vivantT = -1, etFin = -1e9, etT = -1e9, sbAtt = 0, finEtape = -1e9;
  const dur = 60 + rep;
  while (t < dur) {
    const dt = 0.004 + rnd() * 0.03; t += dt;
    pv = Math.max(1, 100 - t * (100 / dur) * 1.4);
    const etourdi = t < etT;
    const env = { dt, act, pv, dist: 60 + rnd() * 300, autre: rnd() < 0.02, fige: rnd() < 0.01, vivant: t < vivantT, etourdi };
    for (const [ev, k] of F.asmPas(A, st, env, rnd, J)) {
      if (ev === 'eveil') { eveilAt = pv; ok(st.caps.length === 3, `${co.cle} : trois capacités après l'éveil`); ok(!F.asmSb(st.reserve), `${co.cle} : éveil sur l'arme`); }
      if (ev === 'rage') { ok(rageAt === null, `${co.cle} : rage deux fois`); ok(eveilAt !== null, `${co.cle} : rage avant l'éveil`); rageAt = pv; }
      if (ev === 'charge' || ev === 'sbdebut') {
        ok(active === null, `${co.cle} : deux zones à la fois (${active} puis ${k})`);
        { const pmin = rageAt !== null && A.rage ? A.rage.pauseS : A.pauseS; ok(t - lastEnd >= pmin - 1e-9, `${co.cle} : pause entre deux sorts ${(t - lastEnd).toFixed(3)} s < ${pmin} s`); }
        ok(k !== lastCast, `${co.cle} : ${k} deux fois de suite`);
        ok(!etourdi, `${co.cle} : ${k} commence pendant un étourdissement`);
        if (etFin > -1e9 && t >= etFin) ok(t - etFin >= J.justice.entracteS - 0.04, `${co.cle} : ${k} ${(t - etFin).toFixed(3)} s après un étourdissement`);
        if (ev === 'sbdebut') { ok(k === porte && st.sb, `${co.cle} : arme inconnue ${k}`); sbAtt++; attaquesSim++; cycle.push(k); active = k; lastCast = k; casts++; finEtape = -1e9; }
        else {
          ok(zones.has(k), `${co.cle} : sort inconnu ${k}`);
          if (A.signatures[k]) { ok(st.tot >= A.signatureMinS - 1e-9, `${co.cle} : signature chargée en ${st.tot} s`); sigs++;
            ok(cycle.length >= 1 && new Set(cycle).size === cycle.length, `${co.cle} : cycle avant la signature (${cycle.join(',')})`); cycle = []; }
          else { ok(st.tot >= A.chargeMinS - 1e-9, `${co.cle} : capacité chargée en ${st.tot} s`); ok(st.caps.includes(k), `${co.cle} : ${k} hors de ses capacités`); cycle.push(k); }
          ok(st.ph === 'charge', `${co.cle} : état après chargement`);
          active = k; lastCast = k; casts++; }
      }
      if (ev === 'sbcharge') { etapesSim++; ok(active === porte && st.sb, `${co.cle} : étape hors de son attaque`); ok(!etourdi, `${co.cle} : étape qui charge pendant un étourdissement`);
        ok(t - finEtape >= J.justice.entracteS - 0.04, `${co.cle} : entracte ${(t - finEtape).toFixed(3)} s entre deux étapes`);
        if (etFin > -1e9 && t >= etFin) ok(t - etFin >= J.justice.entracteS - 0.04, `${co.cle} : étape ${(t - etFin).toFixed(3)} s après un étourdissement`);
        ok(st.ph === 'charge', `${co.cle} : l'étape qui charge tient la zone`); }
      if (ev === 'sblache') { if (rnd() < 0.5) vivantT = t + rnd() * 0.9; if (vars.length && rnd() < 0.4 && t >= etT + 3) { etT = t + 0.35; etFin = etT; } }
      if (ev === 'sbfin') { ok(t >= vivantT - 1e-9, `${co.cle} : étape finie pendant que sa zone vit`); finEtape = t; }
      if (ev === 'fin') { active = null; lastEnd = t; }
    }
    // tant qu'une attaque est en cours, les autres ennemis la voient (charge ou effet dès sa première charge)
    if (st.sb && st.sb.tient) ok(st.ph === 'charge' || st.ph === 'effet', `${co.cle} : attaque en cours invisible des autres (${st.ph})`);
    if (st.ph === 'effet' && st.k === 'charge' && rnd() < 0.01) { F.asmFin(A, st, null); active = null; lastEnd = t; }   // la charge heurte un mur (le jeu le fait après le pas)
  }
  ok(eveilAt !== null && eveilAt <= A.eveilPV, `${co.cle} : éveil à ${A.eveilPV} % (${eveilAt})`);
  if (A.rage) ok(rageAt !== null && rageAt <= A.rage.pv, `${co.cle} : rage sous ${A.rage.pv} % (${rageAt})`);
  ok(sigs >= 2, `${co.cle} : signature lancée (${sigs})`);
  if (porte) ok(sbAtt >= 2, `${co.cle} : arme lancée (${sbAtt})`);
  ok(F.asmNom(A, co, J).split(' ').length <= 5, `${co.cle} : nom court (${F.asmNom(A, co, J)})`);
}
console.log(`file de sorts : ${combats} combats simulés, dont ${attaquesSim} attaques de la Brume (${etapesSim} étapes)`);
// v17.19 · branchements du jeu : la feinte du Brumeux attend (asmZone), le Masqué l'attend (zoneAutre), une seule source d'étourdissement
ok(/function zoneAutre\(e\)\{if\(rings\.length\|\|\(room&&room\.bl\)\)return true;/.test(html), 'index.html : le Masqué attend la fin de la feinte du Brumeux');
ok(/bluffTick=function\(dt\)\{\s*if\(room&&room\.asm&&!room\.bl&&\(asmZone\(\)\|\|sbEtourdi\(\)\)\)/.test(html), 'index.html : la feinte attend la zone du Masqué');
{ const ecr = [...html.matchAll(/P\.sbEt\s*=(?!=)[^;]*/g)].map(x => x[0]), pose = [...html.matchAll(/\.etT\s*=(?!=)[^;,]*/g)].map(x => x[0]);
  ok(ecr.every(x => x === 'P.sbEt=null' || x === 'P.sbEt={etT:0,immT:0})') && pose.length === 1 && pose[0] === '.etT=d'
    && /P\.sbEt\|\|\(P\.sbEt=\{etT:0,immT:0\}\);s\.att=B\.etAtt\|\|0;const d=sbEtourdit\(/.test(html), `index.html : l\u2019étourdissement du joueur ne passe que par sbEtourdit (${ecr.join(' | ')} ; ${pose.join(' | ')})`); }
ok(/etourdi:sbEtourdi\(\)\},S\.rnd,SBJ\)/.test(html), 'index.html : le cycle du Masqué reçoit l’étourdissement');
ok(!/spdMul\(\)/.test(html.slice(html.indexOf('function sbLache('), html.indexOf('function sbSaute('))), 'index.html : pas d’accélération de salle sur les armes');
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
