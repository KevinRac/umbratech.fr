#!/usr/bin/env node
// La Brume · vérification hors navigateur de la némésis (v17.25, cadrage N1–N19 ; actions 1 et 2)
// Extrait la logique pure d'index.html (blocs /*asm:pur*/, /*sb:pur*/ et /*nem:pur*/, dans le bloc du Masqué) et la fait tourner avec
// data/bestiaire.js (assemble.nemesis), data/masque.js (crane), data/talents.js, data/souvenirs.js et data/souvenirs-brume.js. Vérifie :
//  0. les données : réglages présents et bornés, trousseau sans rouge, autant de crânes que de points ;
//  1. qui est promu (N2) : toutes les combinaisons de conditions ;
//  2. une par acte (N6) ;
//  3. le souvenir arraché (N3) : jamais une racine de voie, le plus fort, une attaque de préférence, repli renfort ou sans geste ;
//  4. l'assemblage avec l'arme (N3) : même corps, sous le budget de l'acte, une combinaison permise, le plus proche du sien ;
//  5. la fiche (N1) : porteur ou ordinaire, nom composé, identifiants distincts ;
//  6. les points et le répit (N4, N7) ; 7. ce que les points donnent, sous les plafonds (N4, N9) ;
//  8. la salle du retour (N5) ; 9. la reprise (N8) ; 10. la sauvegarde et sa relecture (N1) ;
//  11. les branchements du jeu (action 2) : promotion dans openEnd, gardes démo et essai, inertie tant qu'actif est faux.
//   node themist/outils/sim-nemesis.mjs
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
const bloc = n => { const m = html.match(new RegExp(`\\/\\*${n}:pur\\*\\/([\\s\\S]*?)\\/\\*\\/${n}:pur\\*\\/`)); if (!m) { console.error(`Bloc /*${n}:pur*/ introuvable`); process.exit(1); } return m[1]; };
const ctx = { window: {}, Math, console, JSON };
vm.createContext(ctx);
for (const f of ['bestiaire.js', 'masque.js', 'talents.js', 'souvenirs.js', 'souvenirs-brume.js']) vm.runInContext(readFileSync(join(ROOT, 'data', f), 'utf8'), ctx);
vm.runInContext(bloc('asm') + bloc('sb') + bloc('nem') + '\nthis.F={asmCombos,asmNom,asmRng,sbEtapes,sbForce,sbBrut,nemRefus,nemDecision,nemForce,nemArrache,nemCombo,nemUid,nemPromotion,nemPoint,nemStats,nemSalle,nemFin,nemReprise,nemForme,nemLire,nemEcrire,nemValide,NEM_V};', ctx);
const F = ctx.F, D = ctx.window.BRUME_DATA, A = D.bestiaire.assemble, N = A.nemesis, MQ = D.masque, SV = D.souvenirs, J = D.souvenirsBrume, T = D.talents;
let fails = 0, checks = 0;
const ok = (c, msg) => { checks++; if (!c) { fails++; if (fails <= 60) console.error('ÉCHEC : ' + msg); } };
const rnd = F.asmRng(20261030);

// talents : forme et genre (comme NODES en jeu : cls vient de la branche, ultime = _sk)
const BR = T.branches, NO = T.noeuds;
const clsDe = id => { const b = BR[id.split('_')[0]]; return b && (b.cls || b.forme) || null; };
const info = id => NO[id] ? { cls: clsDe(id), genre: /_sk$/.test(id) ? 'u' : (NO[id].k || 'm') } : null;
const FAM = {}; for (const [k, x] of Object.entries(SV.familles)) for (const id of x.t || []) FAM[id] = k;
const ids = Object.keys(NO);
ok(ids.every(id => clsDe(id)), 'talents : chaque talent a une forme (par sa branche)');
const formes = [...new Set(ids.map(clsDe))];

// 0. Données
ok(N, 'bestiaire.js : assemble.nemesis absent'); if (!N) process.exit(1);
ok(typeof N.actif === 'boolean', 'nemesis.actif : vrai ou faux');
ok(Number.isInteger(N.parActe) && N.parActe >= 1 && N.parActe <= 3, 'nemesis.parActe : 1 à 3');
ok(N.souvenir && (N.souvenir.exclus || []).includes('c'), 'nemesis.souvenir.exclus : la racine de voie (c) n’est jamais arrachée');
const PT = N.points || {};
ok(Number.isInteger(PT.max) && PT.max >= 1 && PT.max <= 6, 'nemesis.points.max : 1 à 6');
ok(PT.pv >= 0 && PT.pv * PT.max <= 0.4 + 1e-9, `nemesis.points : PV au plus +40 % (${PT.pv} × ${PT.max})`);
ok(PT.force >= 0 && PT.force <= 0.25, 'nemesis.points.force : 0 à 0,25 par point');
for (const [k, r] of Object.entries(PT.renforts || {})) { ok(J.renforts[r], `nemesis.points.renforts.${k} : renfort ${r} inconnu`); ok(+k >= 1 && +k <= PT.max, `nemesis.points.renforts.${k} : seuil hors des points`); }
ok(N.repit && N.repit.morts >= 2, 'nemesis.repit.morts : au moins 2');
ok(N.retour && N.retour.chance >= 0 && N.retour.chance <= 100, 'nemesis.retour.chance : 0 à 100');
ok(N.reprise && N.reprise.gravures === false, 'nemesis.reprise.gravures : faux (ses gravures restent au masque, N8)');
ok(N.reprise.eclats && N.reprise.eclats.base >= 0 && N.reprise.eclats.parPoint >= 0, 'nemesis.reprise.eclats : positifs');
const CR = MQ.crane;
ok(CR, 'masque.js : crane absent');
if (CR) {
  ok(CR.max === PT.max, `masque.js crane.max (${CR.max}) = points.max (${PT.max}) : un crâne par point`);
  ok(CR.min >= 8 && CR.min <= CR.maxPx && CR.maxPx <= 16, 'crane : de min à maxPx, entre 8 et 16 px');
  ok(CR.taille > 0 && CR.taille <= 0.5, 'crane.taille : au plus un demi-rayon');
  const [r, g, b] = String(CR.lueur).split(',').map(Number);
  ok(r <= Math.max(g, b), `crane.lueur ${CR.lueur} : jamais de rouge (réservé aux zones)`);
  ok(CR.balancement >= 0 && CR.balancement <= 15, 'crane.balancement : borné');
}
ok(Array.isArray(MQ.coutures) && MQ.coutures.length === 6, 'masque.js : le masque garde ses 6 points de couture (N10b)');

// 1. Qui est promu (N2) : toutes les combinaisons
const K = ['mort', 'victoire', 'abandon', 'demo', 'essai', 'test', 'hub', 'asm', 'reflet', 'present', 'brise'];
let promus = 0;
for (let m = 0; m < 1 << K.length; m++) {
  const c = {}; K.forEach((k, i) => { c[k] = !!(m >> i & 1); });
  const attendu = c.mort && !c.victoire && !c.abandon && !c.demo && !c.essai && !c.test && !c.hub && c.asm && !c.reflet && c.present && !c.brise;
  const r = F.nemRefus(c);
  ok((r === '') === attendu, `nemRefus ${JSON.stringify(c)} → « ${r} »`);
  if (r === '') promus++;
}
ok(promus === 1, `nemRefus : une seule combinaison promeut (${promus})`);
ok(F.nemRefus(null) === 'pasMort' && F.nemRefus({}) === 'pasMort', 'nemRefus : sans mort, rien');

// 2. Une par acte (N6)
{
  const f1 = { uid: 'a', attend: { acte: 2, salle: 4 } };
  ok(F.nemDecision(N, [], 2, null) === 'nouveau', 'acte libre : promu');
  ok(F.nemDecision(N, [f1], 2, 'a') === 'point', 'la némésis de l’acte t’a eu : un point');
  ok(F.nemDecision(N, [f1], 2, 'zz') === (N.parActe > 1 ? 'nouveau' : 'occupe'), 'un autre Masqué dans un acte occupé : rien');
  ok(F.nemDecision(N, [f1], 2, null) === (N.parActe > 1 ? 'nouveau' : 'occupe'), 'un Masqué ordinaire dans un acte occupé : rien');
  ok(F.nemDecision(N, [f1], 1, null) === 'nouveau' && F.nemDecision(N, [f1], 3, null) === 'nouveau', 'les autres actes restent libres');
}

// 3. Le souvenir arraché (N3)
const corpsL = Object.keys(A.corps);
const combos = {}; for (const act of [1, 2, 3]) combos[act] = F.asmCombos(A, { act, salle: 99, J });
const porteDe = (co, act) => fid => !!F.nemCombo(A, co, fid, { act, salle: 99, J });
{
  let n = 0, attaques = 0, renforts = 0, sans = 0;
  const parForme = {}; for (const id of ids) (parForme[clsDe(id)] = parForme[clsDe(id)] || []).push(id);
  for (let k = 0; k < 4000; k++) {
    const cls = formes[k % formes.length], pool = parForme[cls].slice(), m = 1 + Math.floor(rnd() * 10), act = 1 + (k % 3);
    const actifs = []; for (let i = 0; i < m && pool.length; i++) { const id = pool.splice(Math.floor(rnd() * pool.length), 1)[0], mx = NO[id].max || 1;
      actifs.push({ id, src: 't', rang: 1 + Math.floor(rnd() * mx), g: Math.floor(rnd() * 3), trophee: rnd() < 0.1 ? 1 : 0 }); }
    if (rnd() < 0.2) actifs.push({ id: 'eye', src: 'r', rang: 1, g: 0 });   // une relique : jamais prise
    const co = combos[act][Math.floor(rnd() * combos[act].length)];
    const porte = porteDe(co, act), x = F.nemArrache(N, SV, J, actifs, info, FAM, porte);
    const elig = actifs.filter(a => a.src === 't' && info(a.id) && !N.souvenir.exclus.includes(info(a.id).genre) && J.familles[FAM[a.id]]);
    if (!elig.length) { ok(x === null, `arraché sans candidat : ${JSON.stringify(x)}`); continue; }
    n++;
    ok(x && elig.some(a => a.id === x.id), 'arraché : un talent porté, jamais une relique');
    ok(!N.souvenir.exclus.includes(info(x.id).genre), `arraché : ${x.id} est une racine de voie`);
    ok(x.cls === cls && x.fid === FAM[x.id], `arraché : forme et famille de ${x.id}`);
    const a = actifs.find(y => y.id === x.id); ok(x.rang === a.rang && x.g === a.g, `arraché : ${x.id} garde rang et gravures`);
    const E = id => (J.talents[id] || {}), rf = id => !!(E(id).renfort && J.renforts[E(id).renfort]);
    const fx = F.nemForce(SV, info(x.id).genre, x.rang, x.g);
    const atk = elig.filter(y => !rf(y.id) && porte(FAM[y.id]));
    if (atk.length) { attaques++; ok(!x.renfort && !x.sansGeste, `arraché : ${x.id} devait être une attaque`);
      ok(atk.every(y => F.nemForce(SV, info(y.id).genre, y.rang, y.g) <= fx + 1e-9), `arraché : ${x.id} n’est pas l’attaque la plus forte`);
      ok(JSON.stringify(x.vars) === JSON.stringify(E(x.id).v || []), `arraché : variantes de ${x.id}`); }
    else if (elig.some(y => rf(y.id))) { renforts++; ok(x.renfort && rf(x.id), `arraché : ${x.id} devait être un renfort`); }
    else { sans++; ok(x.sansGeste && !x.renfort && !x.vars.length, `arraché : ${x.id} sans geste`);
      ok(elig.every(y => F.nemForce(SV, info(y.id).genre, y.rang, y.g) <= fx + 1e-9), `arraché : ${x.id} n’est pas le plus fort`); }
  }
  ok(n > 3000 && attaques > n * 0.8, `arraché : ${n} morts, ${attaques} attaques, ${renforts} renforts, ${sans} sans geste`);
  console.log(`  souvenir arraché : ${n} morts tirées · ${attaques} attaques · ${renforts} renforts · ${sans} sans geste`);
  // égalité : le plus récent ; racine seule : rien
  const m2 = ids.find(id => info(id).genre === 'm' && J.familles[FAM[id]] && !(J.talents[id] || {}).renfort);
  const m3 = ids.find(id => id !== m2 && info(id).genre === 'm' && clsDe(id) === clsDe(m2) && J.familles[FAM[id]] && !(J.talents[id] || {}).renfort);
  const co0 = combos[3][0], tout = () => true;
  ok(F.nemArrache(N, SV, J, [{ id: m2, src: 't', rang: 1, g: 0 }, { id: m3, src: 't', rang: 1, g: 0 }], info, FAM, tout).id === m3, 'égalité de force : le plus récent');
  const rac = ids.find(id => info(id).genre === 'c');
  ok(F.nemArrache(N, SV, J, [{ id: rac, src: 't', rang: 1, g: 2 }], info, FAM, tout) === null, 'une racine de voie seule : rien à prendre');
  ok(F.nemArrache(N, SV, J, [], info, FAM, tout) === null, 'mémoire vide : rien');
}

// 4. L'assemblage avec l'arme (N3)
{
  let essais = 0, portes = 0;
  for (const act of [1, 2, 3]) for (const co of combos[act]) for (const fid of Object.keys(J.familles)) {
    essais++;
    const c = F.nemCombo(A, co, fid, { act, salle: 99, J });
    const L = F.asmCombos(A, { act, salle: 99, J, porte: 'sb:' + fid }).filter(x => x.corps === co.corps);
    if (!L.length) { ok(c === null, `${co.cle} + ${fid} : aucun assemblage permis, null attendu`); continue; }
    portes++;
    ok(c && c.corps === co.corps, `${co.cle} + ${fid} : même corps`);
    ok(c.depart.includes('sb:' + fid), `${co.cle} + ${fid} : l’arme est une capacité de départ`);
    ok(L.some(x => x.cle === c.cle), `${co.cle} + ${fid} : combinaison permise (budget ${A.budgetMenace[act]} + ${A.budgetPorteur})`);
    const garde = x => x.depart.filter(k => co.depart.includes(k) || k === co.eveil).length * 2 + (x.eveil === co.eveil ? 1 : 0);
    ok(L.every(x => garde(x) <= garde(c)), `${co.cle} + ${fid} : il garde le plus possible de ses capacités`);
  }
  ok(portes > essais * 0.3, `assemblage : ${portes} sur ${essais} portent l’arme`);
  console.log(`  assemblage avec l’arme : ${essais} cas (3 actes × assemblages × 15 familles), ${portes} portés`);
}

// 5. La fiche (N1)
{
  const co = combos[2].find(c => c.corps === 'brute') || combos[2][0];
  const sv = { id: 'fan_n2', rang: 2, g: 1, fid: FAM.fan_n2, vars: [], renfort: null };
  const f = F.nemPromotion(A, N, SV, J, { co, sv }, { acte: 2, salle: 4, run: 12, palier: 1, cls: 'her', coup: true }, [], info, FAM, { act: 2, salle: 10, J }, rnd);
  ok(F.nemForme(f), 'fiche du porteur : forme valide');
  ok(f.co.cle === co.cle && f.corps === co.corps, 'porteur : son assemblage tel quel');
  ok(f.sv.id === 'fan_n2' && f.sv.rang === 2 && f.sv.g === 1 && f.sv.cls === clsDe('fan_n2'), 'porteur : son souvenir, rang, gravures, forme du talent');
  ok(f.points === 1 && f.morts === 1 && f.attend.acte === 2 && f.attend.salle === 4 && f.ne.cls === 'her' && f.coup === true, 'porteur : point, mort, rendez-vous, naissance');
  ok(f.nom === F.asmNom(A, f.co, J), 'porteur : nom composé');
  let arm = 0, total = 0;
  for (let k = 0; k < 600; k++) {
    const act = 1 + (k % 3), c0 = combos[act][Math.floor(rnd() * combos[act].length)], cls = formes[k % 4];
    const pool = ids.filter(id => clsDe(id) === cls), actifs = [];
    for (let i = 0; i < 8; i++) actifs.push({ id: pool[Math.floor(rnd() * pool.length)], src: 't', rang: 1, g: Math.floor(rnd() * 3) });
    const g = F.nemPromotion(A, N, SV, J, { co: c0, sv: null }, { acte: act, salle: 3 + (k % 3), cls }, actifs, info, FAM, { act, salle: 99, J }, rnd);
    total++;
    ok(F.nemForme(g) && g.corps === c0.corps, 'ordinaire : fiche valide, même corps');
    if (g.sv && !g.sv.renfort && !g.sv.sansGeste) { arm++; ok(g.co.depart.includes('sb:' + g.sv.fid), `ordinaire : ${g.sv.id} porté en départ`);
      ok(F.asmCombos(A, { act, salle: 99, J, porte: 'sb:' + g.sv.fid }).some(x => x.cle === g.co.cle), `ordinaire : ${g.co.cle} permis à l’acte ${act}`); }
    else ok(g.co.cle === c0.cle, 'ordinaire sans arme : ses capacités ne changent pas');
    ok(g.nom === F.asmNom(A, g.co, J), 'ordinaire : nom composé');
  }
  ok(arm > total * 0.8, `ordinaire : ${arm} sur ${total} portent ton souvenir en arme`);
  const u = new Set(); for (let i = 0; i < 2000; i++) u.add(F.nemUid(rnd));
  ok(u.size === 2000, 'identifiants : 2000 distincts');
}

// 6. Points et répit (N4, N7)
{
  const f = { uid: 'x', points: 1, morts: 1, repit: 0, attend: { acte: 2, salle: 4 } };
  ok(F.nemPoint(N, f, { salle: 5 }) && f.points === 2 && f.morts === 2 && f.attend.salle === 5, 'deuxième mort : point 2, il t’attend à la nouvelle salle');
  ok(F.nemPoint(N, f, { salle: 5 }) && f.points === 3 && f.repit === 1 && f.morts === 0, `troisième mort de suite : répit (repit.morts ${N.repit.morts})`);
  F.nemFin(f, {}); ok(f.repit === 0 && f.morts === 0, 'la descente sautée passe : il revient');
  for (let i = 0; i < 10; i++) F.nemPoint(N, f, {});
  ok(f.points === PT.max, `points plafonnés à ${PT.max}`);
  ok(F.nemPoint(N, f, {}) === false, 'au plafond : aucun point gagné');
  const g = { points: 2, morts: 2, repit: 0 }; F.nemFin(g, { passee: true, mortContre: false }); ok(g.morts === 0, 'sa salle franchie sans mourir contre lui : le compte repart');
  const h = { points: 2, morts: 2, repit: 0 }; F.nemFin(h, { passee: false }); ok(h.morts === 2, 'mort avant sa salle : le compte reste');
}

// 7. Ce que les points donnent, sous les plafonds (N4, N9)
{
  let pire = 0;
  for (const fid of Object.keys(J.familles)) for (const v of [null, ...Object.keys(J.variantes)]) {
    const ets = F.sbEtapes(J, fid, v ? [v] : []); if (!ets || !ets.length) continue;
    for (let p = 1; p <= PT.max; p++) for (const rang of [1, 3]) for (const g of [0, 2]) {
      const s = F.nemStats(A, N, J, { points: p, sv: { id: 'x', rang, g, fid, vars: v ? [v] : [], renfort: null } });
      ok(s.pv <= 1 + PT.pv * PT.max + 1e-9 && s.pv >= 1, `${fid} point ${p} : PV × ${s.pv}`);
      for (const act of [1, 2, 3]) { const k = F.sbForce(J, ets, act, s.force), tot = F.sbBrut(J, ets, act) * k;
        ok(tot <= J.justice.degatsMax + 1e-9, `${fid}${v ? '+' + v : ''} point ${p} acte ${act} : ${tot.toFixed(2)} > plafond ${J.justice.degatsMax}`); pire = Math.max(pire, tot); }
      ok(s.renforts.length <= (J.renfortMax || 2), `${fid} point ${p} : au plus ${J.renfortMax} renforts`);
    }
  }
  const s5 = F.nemStats(A, N, J, { points: PT.max, sv: { id: 'x', rang: 1, g: 0, fid: 'onde', vars: [], renfort: 'pv' } });
  ok(!s5.renforts.includes('pv') && s5.renforts.length + 1 <= (J.renfortMax || 2), 'son propre renfort n’est pas doublé, et compte dans le maximum');
  const s1 = F.nemStats(A, N, J, { points: 1, sv: null }); ok(s1.renforts.length === 0 && s1.force >= 1, 'point 1, sans souvenir : rien de plus');
  console.log(`  points : attaque entière au pire ${pire.toFixed(2)} (plafond ${J.justice.degatsMax}), PV au plus × ${(1 + PT.pv * PT.max).toFixed(2)}`);
}

// 8. La salle du retour (N5)
{
  const f = { attend: { acte: 2, salle: 4 }, repit: 0 }, r = o => Object.assign({ acte: 2, salle: 4, type: 'combat', actRooms: 6, breche: false }, o);
  ok(F.nemSalle(N, f, r({})), 'sa salle, en combat : il vient');
  ok(F.nemSalle(N, f, r({ salle: 5, type: 'elite' })), 'plus loin, en élite : il vient');
  ok(F.nemSalle(N, f, r({ salle: 5, type: 'shop', breche: true })), 'Brèche : il vient');
  ok(!F.nemSalle(N, f, r({ salle: 3 })), 'avant sa salle : non');
  ok(!F.nemSalle(N, f, r({ salle: 6 })), 'salle du gardien : jamais');
  ok(!F.nemSalle(N, f, r({ type: 'shop' })), 'boutique : non (il attend la suivante)');
  ok(!F.nemSalle(N, f, r({ acte: 3 })), 'un autre acte : non');
  ok(!F.nemSalle(N, f, r({ deja: true })), 'déjà venu dans cette descente : non');
  ok(!F.nemSalle(N, f, r({ demo: true })) && !F.nemSalle(N, f, r({ essai: true })), 'démo, essai : non');
  ok(!F.nemSalle(N, { attend: { acte: 2, salle: 4 }, repit: 1 }, r({})), 'répit : non');
}

// 9. La reprise (N8)
{
  const f = { points: 3, sv: { id: 'fan_n2', cls: 'lum', rang: 2, g: 2 } }, E = N.reprise.eclats, ecl = E.base + E.parPoint * 3;
  const j = o => Object.assign({ cls: 'lum', porte: null, brule: false, gravable: false, trophee: true, connu: true }, o);
  let r = F.nemReprise(N, f, j({})); ok(r.type === 'talent' && r.rang === 2 && r.g === 0 && r.trophee, 'même forme : le talent, son rang, sans gravures, en trophée');
  r = F.nemReprise(N, f, j({ trophee: false })); ok(r.type === 'talent' && !r.trophee, 'trophée pris : une place');
  r = F.nemReprise(N, f, j({ porte: { rang: 1 } })); ok(r.type === 'rang' && r.rang === 2, 'déjà porté plus bas : ton rang monte');
  r = F.nemReprise(N, f, j({ porte: { rang: 2 }, gravable: true })); ok(r.type === 'gravure', 'déjà porté aussi haut : une gravure');
  r = F.nemReprise(N, f, j({ porte: { rang: 3 }, gravable: false })); ok(r.type === 'eclats' && r.eclats === ecl, 'déjà porté, rien à graver : Éclats');
  r = F.nemReprise(N, f, j({ brule: true })); ok(r.type === 'eclats', 'brûlé dans la descente : Éclats');
  r = F.nemReprise(N, f, j({ cls: 'gou' })); ok(r.type === 'eclats' && r.eclats === ecl, `autre forme : ${ecl} Éclats (3 points)`);
  r = F.nemReprise(N, f, j({ connu: false })); ok(r.type === 'eclats', 'talent disparu : Éclats');
  r = F.nemReprise(N, { points: 1, sv: null }, j({})); ok(r.type === 'eclats' && r.eclats === E.base + E.parPoint, 'sans souvenir : Éclats');
}

// 10. La sauvegarde (N1)
{
  const co = combos[1][0], f = F.nemPromotion(A, N, SV, J, { co, sv: null }, { acte: 1, salle: 3, cls: 'tis' }, [], info, FAM, { act: 1, salle: 99, J }, rnd);
  const S = F.nemEcrire([f]), R = F.nemLire(JSON.parse(JSON.stringify(S)));
  ok(R && R.v === F.NEM_V && R.liste.length === 1 && JSON.stringify(R.liste[0]) === JSON.stringify(f), 'écrire puis relire : la même fiche');
  ok(F.nemLire(undefined).liste.length === 0 && F.nemLire('abc').liste.length === 0 && F.nemLire({ v: 'x' }).liste.length === 0, 'sauvegarde absente ou abîmée : liste vide');
  ok(F.nemLire({ v: F.NEM_V + 1, liste: [f] }) === null, 'version future : on n’y touche pas (null)');
  ok(F.nemLire({ v: 1, liste: [f, { uid: 3 }, null, Object.assign({}, f, { points: 0 })] }).liste.length === 1, 'fiches abîmées ignorées');
  ok(F.nemEcrire([f, { uid: '' }]).liste.length === 1, 'écrire : une fiche abîmée n’est pas écrite');
  // relecture contre les données (nemValide)
  let ko = 0, gardes = 0;
  for (const act of [1, 2, 3]) for (const c of combos[act]) {
    const g = F.nemValide(A, N, J, { uid: 'u', corps: c.corps, co: c, nom: '', sv: null, points: 1, morts: 1, attend: { acte: act, salle: 3 }, repit: 0 }, info);
    if (!g || g.co.cle !== c.cle) ko++; else gardes++;
  }
  ok(ko === 0, `relecture : ${ko} assemblages valides changés`);
  const c3 = combos[2][0], h = { uid: 'u', corps: c3.corps, co: Object.assign({}, c3, { depart: ['taches', c3.depart[1]], cle: 'vieux' }), sv: null, points: 9, morts: -2, attend: { acte: 2, salle: 4 }, repit: 0 };
  const hv = F.nemValide(A, N, J, h, info);
  ok(hv && hv.corps === c3.corps && F.asmCombos(A, { act: 2, salle: 99, J }).some(x => x.cle === hv.co.cle), 'capacité retirée (Taches, v17.19) : réassemblé, même corps');
  ok(hv.points === PT.max && hv.morts === 0, 'relecture : points et morts bornés');
  ok(F.nemValide(A, N, J, Object.assign({}, h, { corps: 'golem' }), info) === null, 'corps inconnu : fiche abandonnée');
  const sb = combos[3].find(x => x.corps === 'brute'), fid = Object.keys(J.familles).find(f2 => F.nemCombo(A, sb, f2, { act: 3, salle: 99, J }));
  const cA = F.nemCombo(A, sb, fid, { act: 3, salle: 99, J });
  const k = F.nemValide(A, N, J, { uid: 'u', corps: 'brute', co: cA, sv: { id: 'zzz_n9', cls: 'lum', rang: 1, g: 0, fid, vars: ['inexistante'], renfort: null }, points: 2, morts: 0, attend: { acte: 3, salle: 3 }, repit: 0 }, info);
  ok(k && k.sv.connu === false && k.co.cle === cA.cle && k.sv.vars.length === 0, 'talent disparu : il garde son arme de famille ; variante inconnue retirée');
  console.log(`  relecture : ${gardes} assemblages gardés tels quels`);
}

// 11. Les branchements du jeu (action 2)
{
  const has = (re, msg) => ok(re.test(html), 'index.html : ' + msg);
  has(/openEnd=function\(win,abandon\)\{try\{nemFinRun\(win,abandon\);/, 'la promotion passe par une enveloppe d’openEnd (nemFinRun)');
  has(/function nemFinRun\(win,abandon\)\{if\(!RUN\|\|RUN\.hub\|\|RUN\.nemFait\)return;RUN\.nemFait=true;if\(!nemActif\(\)\)return;/, 'une fois par descente, rien tant qu’actif est faux');
  has(/const nemActif=\(\)=>!!\(NM&&\(NM\.actif\|\|NDEV\.on\)\)&&!DEMO;/, 'jamais en démo ; actif ou essai de console');
  has(/essai:!!\(RUN\.essai\|\|ESSAI_URL\)/, 'les modes d’essai ne promeuvent personne');
  has(/ESSAI_URL=\/\[\?&\]\(masque\|brume\|glas\|dernier\|nemesis\)=\//, 'modes d’essai par l’adresse');
  ok((html.match(/RUN\.essai=1;/g) || []).length >= 3, 'index.html : RUN.essai posé par __asm.essai, le Glas et le Dernier Souvenir d’essai');
  has(/SAVE\.nemesis=nemEcrire\(/, 'SAVE.nemesis n’est écrit que par nemEcrire');
  ok(!/SAVE\.nemesis=(?!nemEcrire)/.test(html), 'index.html : aucune autre écriture de SAVE.nemesis');
  has(/NEMSRC=p\.from\|\|null;try\{hurtPlayer\(p\.dmg\);\}finally\{NEMSRC=null;\}/, 'les projectiles de la Brume (navette, perçant) disent de qui vient le coup');
  ok(/hurtPlayer=function\(dmg,src\)\{const R=room&&room\.asm/.test(html), 'index.html : attribution du coup sans toucher aux arguments de hurtPlayer');
}

console.log(`${checks} vérifications, ${fails} échec${fails > 1 ? 's' : ''}.`);
process.exit(fails ? 1 : 0);
