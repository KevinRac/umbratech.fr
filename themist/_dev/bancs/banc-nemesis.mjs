// Banc Chromium, némésis (v17.25), actions 1 et 2 : promotion et sauvegarde en jeu. Usage : node banc-nemesis.mjs [port]
// Chaque cas ouvre une page neuve (sauvegarde vide), lance une descente ordinaire (pas un mode d'essai), fait venir un Masqué, puis te tue
// par le chemin voulu et laisse l'écran de fin s'ouvrir. On lit SAVE.nemesis et le bilan (__nemesis.bilan()).
import { createRequire } from 'node:module';
const require = createRequire('/opt/npm-tools/node_modules/');
const { chromium } = require('playwright');
const PORT = process.argv[2] || 8765, BASE = `http://127.0.0.1:${PORT}/index.html`;
let fails = 0, checks = 0;
const ok = (c, m) => { checks++; if (!c) { fails++; console.error('ÉCHEC : ' + m); } };
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });

async function ouvre(qs = '') {
  const page = await browser.newPage(); const errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 300)));
  await page.goto(`${BASE}${qs ? '?' + qs : ''}`);
  await page.waitForFunction(() => !!(window.__brume && window.__asm && window.__nemesis && window.__glas), null, { timeout: 30000 });
  await page.waitForTimeout(300);
  // outils de la page : une descente ordinaire, un Masqué forcé (porteur si souv), une mort par le chemin voulu
  await page.evaluate(() => {
    const B = window.__brume, AS = window.__asm, NE = window.__nemesis, G = () => window.__glas.dbg();
    window.T = {
      lancer(cls, opt) {
        opt = opt || {};
        if (opt.activer !== false) NE.activer(true);
        B.cls(cls); B.start();
        const g = G(), R = g.RUN; R.act = opt.acte || 2; R.g = R.act >= 3 ? 18 : R.act >= 2 ? 10 : 3; R.roomIdx = opt.salle || 3;
        for (const [id, rang, gr] of opt.talents || []) window.__dernier.prendre(id, rang || 1, gr || 0);
        if (opt.souv) R.reserveBrume.push({ id: opt.souv, source: 'talent', rang: opt.rangSouv || 1, g: opt.gSouv || 0, oublie: { acte: R.act, salle: 1 }, porte: 0 });
        if (opt.sansMasque) { g.entrer('combat'); G().room.asm = null; return { ok: true }; }
        AS.forcer = 1; AS.souv = opt.souv || null; AS.combo = opt.combo || null;
        try { g.entrer('elite'); } finally { AS.forcer = 0; AS.souv = null; AS.combo = null; }
        const r = G().room; if (r.asm && r.waves.length > 1) r.waves.shift();
        return { ok: !!r.asm, nom: r.asm && r.asm.nom, sv: r.asm && r.asm.sv && r.asm.sv.x.id };
      },
      // jusqu'à l'arrivée du Masqué ; fin : jusqu'à la fin de son montage
      attendre(fin) {
        const P = B.P; for (let i = 0; i < 60 * 12; i++) { P.iT = 99; B.step(1 / 60); const R = G().room.asm, e = R && R.e;
          if (e && (!fin || !e.asm.mont)) return { ok: true, mont: !!e.asm.mont, t: i }; }
        return { ok: false };
      },
      masque: () => { const R = G().room.asm; return R && R.e; },
      // action 3 : une descente neuve à cet acte, salle 0 ; puis entrer dans une salle (sans rien forcer) et voir qui l'attend
      nouvelle(cls, acte) { NE.activer(true); B.cls(cls); B.start(); const R = G().RUN; R.act = acte; R.g = acte >= 3 ? 14 : acte >= 2 ? 7 : 0; R.roomIdx = 0; return R; },
      entrer(type) { G().entrer(type); const rm = G().room, a = rm.asm, vague = a ? (rm.waves[1] || []).some(x => x.asm) : false; if (a && rm.waves.length > 1) rm.waves.shift();
        return { s: G().RUN.roomIdx, nem: a && a.nem || null, asm: !!a, vague }; },
      fiche: uid => (NE.voir().liste || []).find(f => f.uid === uid),
      // action 4 : une némésis née dans une descente (forme clsA, porteur de souv), puis une descente (forme clsB) jusqu'à sa salle
      preparer(clsA, clsB, opt) {
        opt = opt || {};
        T.lancer(clsA, { acte: 2, salle: 3, souv: opt.souv, rangSouv: opt.rangSouv, gSouv: opt.gSouv, talents: opt.talentsA || [] }); T.attendre(true);
        const f = T.tuer('masque').save.liste[0];
        T.nouvelle(clsB, 2); for (const [id, rang, gr] of opt.talents || []) window.__dernier.prendre(id, rang || 1, gr || 0);
        if (opt.avant) opt.avant();
        for (let i = 1; i < f.attend.salle; i++) T.entrer('combat');
        const x = T.entrer('combat'); T.attendre(true); return { f, x };
      },
      // briser la némésis, puis purger la salle ; on laisse la file d'écrans s'ouvrir
      briser() {
        const g = G(), e = T.masque(), d = window.__asm.dbg(), sh0 = g.RUN.sh.elites; d.kill(e); B.step(1 / 60, 2);
        const apresMort = NE.voir();
        for (const x of g.enemies) if (!x.dead && !x.fixed) d.kill(x); g.room.waves = []; g.room.spawning = [];
        for (let i = 0; i < 40; i++) { B.P.iT = 99; B.step(1 / 60); }
        T.sh0 = sh0; return { apresMort: apresMort.liste.length };
      },
      ecran() { const o = document.getElementById('overlay') || document.querySelector('.overlay'); const t = document.body.innerText;
        return document.querySelector('#mrps') ? (/Le laisser/.test(t) && /Il retourne à la Brume/.test(t) ? 'nemesis' : 'reprise') : /une relique de plus/.test(t) ? 'relique' : /Prendre ou oublier/.test(t) ? 'oubli' : 'aucun'; },
      memoire() { const M = window.__memoire.M; return M.actifs.map(a => ({ id: a.id, rang: a.rang, g: a.g || 0, tro: !!a.trophee })); },
      // par : 'masque' (un tir du Masqué sur toi), 'autre' (un tir d'un autre ennemi), 'perte' (PV perdus sans source)
      // une : un seul tir (pour la Mèche de Phénix) ; masque : l'escorte est retirée d'abord, pour que le coup mortel vienne bien de lui
      tuer(par, une) {
        const g = G(), P = g.P, e = this.masque(), o = g.enemies.find(x => !x.dead && x !== e && !x.fixed);
        if (par === 'masque') { for (const x of g.enemies) if (!x.dead && x !== e && !x.fixed) window.__asm.dbg().kill(x); g.room.waves = []; }
        P.iT = 0; P.dashT = 0; P.hp = 3; const salle = g.RUN.roomIdx;
        const src = par === 'masque' ? e : par === 'autre' ? o : null;   // 'perte' : un tir sans source
        for (let i = 0; i < 90 && !P.dead; i++) {
          if (une && i) { B.step(1 / 60); continue; }
          P.iT = 0; P.dashT = 0;
          G().eproj.push(Object.assign({ x: P.x, y: P.y, vx: 0, vy: 0, r: 9, dmg: 999, life: 0.5 }, src ? { from: src } : {}));
          B.step(1 / 60);
        }
        const mort = P.dead; B.step(1 / 60, 100);
        return { mort, salle, etat: G().state, bilan: NE.bilan(), save: NE.voir(), coup: NE.coup() };
      },
      voir: () => NE.voir()
    };
  });
  return { page, errs };
}
const cas = async (nom, qs, fn) => { const { page, errs } = await ouvre(qs); try { await fn(page); } catch (e) { ok(false, nom + ' : ' + e.message); } ok(!errs.length, nom + ' : erreurs ' + errs.join(' | ')); await page.close(); };

// A. Masqué ordinaire, tué par son tir : promu, il t'arrache ton souvenir le plus fort et le porte en arme
await cas('A', '', async page => {
  const r = await page.evaluate(() => { const l = T.lancer('lum', { acte: 2, talents: [['ray_n1', 1, 0], ['ray_s1', 1, 0], ['ray_x1a', 1, 0], ['ray_k1', 1, 1]] }); const a = T.attendre(true); return { l, a, k: T.tuer('masque') }; });
  console.log('A', JSON.stringify({ nom: r.l.nom, bilan: r.k.bilan, coup: r.k.coup.masque, f: r.k.save && r.k.save.liste[0] && { nom: r.k.save.liste[0].nom, sv: r.k.save.liste[0].sv, cle: r.k.save.liste[0].co.cle } }));
  ok(r.l.ok && r.a.ok, 'A : Masqué venu');
  ok(r.k.mort && r.k.etat !== 'play', `A : mort et écran de fin (${r.k.etat})`);
  const L = r.k.save && r.k.save.liste;
  ok(r.k.bilan && r.k.bilan.refus === '' && r.k.bilan.decision === 'nouveau', 'A : promu (' + JSON.stringify(r.k.bilan) + ')');
  ok(L && L.length === 1, 'A : une fiche dans SAVE.nemesis');
  const f = L && L[0];
  ok(f && f.attend.acte === 2 && f.attend.salle === r.k.salle && f.points === 1 && f.morts === 1 && f.ne.cls === 'lum', `A : rendez-vous acte II salle ${r.k.salle} (${f && f.attend.salle}), un point`);
  ok(f && f.sv && ['ray_n1', 'ray_s1', 'ray_x1a', 'ray_k1'].includes(f.sv.id), 'A : un de tes talents arraché');
  ok(f && f.sv && f.sv.id === 'ray_k1' && f.sv.g === 1, 'A : le plus fort (nœud clé gravé) : ' + (f && f.sv && f.sv.id));
  ok(f && f.sv && (f.sv.sansGeste || f.sv.renfort || f.co.depart.includes('sb:' + f.sv.fid)), 'A : son arme en capacité de départ');
  ok(r.k.coup.masque === true && f && f.coup === true, 'A : le coup mortel vient bien de lui');
});

// B. Porteur : il garde le souvenir qu'il portait, son assemblage tel quel
await cas('B', '', async page => {
  const r = await page.evaluate(() => { const l = T.lancer('lum', { acte: 2, souv: 'fan_n2', rangSouv: 2, gSouv: 1, talents: [['ray_k1', 1, 2]] });
    const a = T.attendre(true); const cle = window.__glas.dbg().room.asm.co.cle; return { l, a, cle, k: T.tuer('masque') }; });
  const f = r.k.save && r.k.save.liste[0];
  ok(r.l.sv === 'fan_n2', 'B : le Masqué porte fan_n2');
  ok(f && f.sv && f.sv.id === 'fan_n2' && f.sv.rang === 2 && f.sv.g === 1, 'B : il garde le souvenir qu’il portait (pas ray_k1), rang et gravure');
  ok(f && f.co.cle === r.cle, 'B : assemblage inchangé');
});

// C. La némésis de l'acte te tue encore (uid posé sur la salle comme le fera l'action 3) : un point ; D. un autre Masqué du même acte : rien
await cas('C-D', '', async page => {
  const r = await page.evaluate(() => {
    T.lancer('her', { acte: 1, talents: [['car_n1', 1, 0]] }); T.attendre(true); const k1 = T.tuer('masque'); const uid = k1.save.liste[0].uid;
    T.lancer('her', { acte: 1, salle: 4 }); T.attendre(true); window.__glas.dbg().room.asm.nem = uid; const k2 = T.tuer('masque');
    T.lancer('her', { acte: 1, salle: 1 }); T.attendre(true); const k3 = T.tuer('masque');   // salle 2 : avant la sienne, un autre Masqué
    T.lancer('her', { acte: 3, salle: 3 }); T.attendre(true); const k4 = T.tuer('masque');
    return { uid, s2: k2.salle, k2: { bilan: k2.bilan, f: k2.save.liste }, k3: { bilan: k3.bilan, n: k3.save.liste.length }, k4: { bilan: k4.bilan, n: k4.save.liste.length, actes: k4.save.liste.map(f => f.attend.acte) } };
  });
  const f = r.k2.f.find(x => x.uid === r.uid);
  ok(r.k2.bilan.decision === 'point' && r.k2.bilan.point === true, 'C : la même némésis : un point (' + JSON.stringify(r.k2.bilan) + ')');
  ok(f && f.points === 2 && f.morts === 2 && f.attend.salle === r.s2, `C : point 2, deux morts de suite, elle t’attend salle ${r.s2}`);
  ok(r.k3.bilan.decision === 'occupe' && r.k3.n === 1, 'D : un autre Masqué dans l’acte I occupé : pas promu');
  ok(r.k4.bilan.decision === 'nouveau' && r.k4.n === 2 && r.k4.actes.join() === '1,3', 'D : l’acte III a la sienne');
});

// E. Masqué brisé avant ta mort ; F. salle sans Masqué ; G. mort pendant son montage ; H. tué par un autre ennemi de sa salle
await cas('E-H', '', async page => {
  const r = await page.evaluate(() => {
    const o = {};
    T.lancer('gou', { acte: 2 }); T.attendre(true); const e = T.masque(); window.__asm.dbg().kill(e); window.__brume.step(1 / 60, 10); o.E = T.tuer('perte').bilan;
    T.lancer('gou', { acte: 2, sansMasque: true }); window.__brume.step(1 / 60, 60); o.F = T.tuer('perte').bilan;
    T.lancer('gou', { acte: 2, talents: [['dif_n1', 1, 0]] }); const a = T.attendre(false); o.Gmont = a.mont; o.G = T.tuer('perte').bilan;
    window.__nemesis.effacer();
    T.lancer('gou', { acte: 2, talents: [['dif_n1', 1, 0]] }); T.attendre(true); const k = T.tuer('autre'); o.H = k.bilan; o.Hcoup = k.save.liste[0] && k.save.liste[0].coup;
    return o;
  });
  console.log('E-H', JSON.stringify(r));
  ok(r.E && r.E.refus === 'brise', 'E : Masqué brisé : pas promu (' + JSON.stringify(r.E) + ')');
  ok(r.F && r.F.refus === 'sansMasque', 'F : salle sans Masqué : rien');
  ok(r.Gmont === true && r.G && r.G.refus === '' && r.G.decision === 'nouveau', 'G : mort pendant son montage : promu');
  ok(r.H && r.H.refus === '' && r.Hcoup === false, 'H : tué par son escorte : promu, coup mortel pas de lui');
});

// I. Inactif : rien n'est écrit ; J. descente d'essai (__asm.essai) : refus ; K. Phénix : pas de mort, rien
await cas('I-K', '', async page => {
  const r = await page.evaluate(() => {
    const o = {};
    T.lancer('tis', { acte: 2, activer: false }); window.__nemesis.activer(false); T.attendre(true); const k = T.tuer('masque'); o.I = { bilan: k.bilan, save: window.__brume.SAVE.nemesis === undefined };
    window.__nemesis.activer(true);
    window.__asm.essai(null, 2, true, null, 'tis'); T.attendre(true); o.Jessai = window.__glas.dbg().RUN.essai; o.J = T.tuer('masque').bilan;
    T.lancer('tis', { acte: 2 }); T.attendre(true); const P = window.__brume.P; P.s.phoenix = true; P.phoenixUsed = false;
    const k2 = T.tuer('masque', true); o.K = { mort: k2.mort, phenix: P.phoenixUsed, bilan: k2.bilan, n: (k2.save.liste || []).length };
    return o;
  });
  console.log('I-K', JSON.stringify(r));
  ok(r.I.bilan === null && r.I.save, 'I : actif faux : aucun bilan, SAVE.nemesis absent');
  ok(r.Jessai === 1 && r.J && r.J.refus === 'essai', 'J : descente d’essai : pas de promotion');
  ok(r.K.phenix === true && r.K.mort === false && r.K.n === 0 && r.K.bilan === null, 'K : la Mèche de Phénix te relève : pas de mort, aucune fiche');
});

// L. Démo : jamais actif ; M. adresse d'essai (?masque=) : refus
await cas('L', 'demo=lum', async page => { const a = await page.evaluate(() => { window.__nemesis.activer(true); return window.__nemesis.actif(); }); ok(a === false, 'L : en démo, jamais actif'); });
await cas('M', 'masque=fan_n2&classe=lum&acte=2', async page => {
  await page.waitForTimeout(800);
  const r = await page.evaluate(() => { window.__nemesis.activer(true); T.attendre(true); return T.tuer('masque').bilan; });
  ok(r && r.refus === 'essai', 'M : ?masque= : pas de promotion (' + JSON.stringify(r) + ')');
});

// N. Relecture : la fiche écrite repasse nemValide sans changer ; une sauvegarde d'une version future n'est pas touchée
await cas('N', '', async page => {
  const r = await page.evaluate(() => {
    T.lancer('lum', { acte: 3, talents: [['sol_s4', 1, 0]] }); T.attendre(true); const k = T.tuer('masque');
    const v = window.__nemesis.valider(), f = k.save.liste[0];
    const S = window.__brume.SAVE; S.nemesis = { v: 99, liste: [{ futur: true }] };
    T.lancer('lum', { acte: 3 }); T.attendre(true); const k2 = T.tuer('masque');
    return { meme: JSON.stringify(Object.assign({}, v[0], { sv: Object.assign({}, v[0].sv, { connu: undefined }) })) === JSON.stringify(Object.assign({}, f, { sv: Object.assign({}, f.sv, { connu: undefined }) })), connu: v[0].sv && v[0].sv.connu, futur: k2.bilan, garde: JSON.stringify(S.nemesis) };
  });
  ok(r.meme && r.connu === true, 'N : la fiche écrite repasse la relecture telle quelle');
  ok(r.futur && r.futur.refus === 'version' && r.garde === '{"v":99,"liste":[{"futur":true}]}', 'N : version future : rien écrit, rien effacé');
});

// ── Action 3 : le retour en salle
// R1. Née à l'acte III, salle 4 : à la descente suivante, elle t'attend salle 4 de l'acte III, pas avant, pas après (une fois), pas dans les autres actes
await cas('R1', '', async page => {
  const r = await page.evaluate(() => {
    T.lancer('lum', { acte: 3, salle: 3, talents: [['ray_k1', 1, 1]] }); T.attendre(true); const k = T.tuer('masque'); const f = k.save.liste[0];
    const o = { f: { uid: f.uid, attend: f.attend, cle: f.co.cle, nom: f.nom, sv: f.sv && f.sv.id }, actes: {} };
    for (const acte of [1, 2, 3]) { T.nouvelle('gou', acte); const L = []; for (let s = 1; s < (acte === 2 ? 6 : 7); s++) L.push(T.entrer('combat')); o.actes[acte] = L; }
    o.vu = T.fiche(f.uid).vu;
    return o;
  });
  console.log('R1', JSON.stringify(r.f), JSON.stringify(r.actes[3]));
  const ici = r.actes[3].filter(x => x.nem === r.f.uid).map(x => x.s);
  ok(r.f.attend.acte === 3 && ici.length === 1 && ici[0] === r.f.attend.salle, `R1 : une seule fois, à sa salle (${r.f.attend.salle}) : ${ici.join(',')}`);
  ok(r.actes[1].every(x => !x.nem) && r.actes[2].every(x => !x.nem), 'R1 : jamais dans les autres actes');
  const sa = r.actes[3].find(x => x.nem); ok(sa && sa.asm, 'R1 : room.asm posé');
  ok(r.vu === 1, 'R1 : vu une fois (' + r.vu + ')');
});
// R2. Une boutique à sa salle : il attend la salle de combat suivante ; R3. son assemblage, son souvenir, sa force, ses PV ; il se bat
await cas('R2-R3', '', async page => {
  const r = await page.evaluate(() => {
    const B = window.__brume, NE = window.__nemesis, G = () => window.__glas.dbg();
    T.lancer('her', { acte: 1, salle: 3, talents: [['car_x1a', 1, 0], ['cad_k1', 1, 2]] }); T.attendre(true); const k = T.tuer('masque'); const f = k.save.liste[0];
    const o = { f: { uid: f.uid, attend: f.attend, cle: f.co.cle, nom: f.nom, sv: f.sv } };
    T.nouvelle('tis', 1); const L = []; for (let s = 1; s < f.attend.salle; s++) L.push(T.entrer('combat'));
    L.push(T.entrer('halte')); const nx = T.entrer('combat'); o.boutique = L[L.length - 1]; o.suivante = nx;
    // il arrive
    const a = T.attendre(true); const e = T.masque(); o.arrive = a.ok;
    if (e) { o.e = { uid: e.asm.nem && e.asm.nem.uid, points: e.asm.nem && e.asm.nem.points, sv: e.asm.sv && e.asm.sv.id, force: e.asm.sv && e.asm.sv.force, cle: e.asm.co.cle, nom: e.asm.nom, sb: e.asm.sb && e.asm.sb.fid, hp: e.maxHp };
      o.attendu = NE.stats(T.fiche(f.uid));
      // il se bat : 30 s, toi intouchable ; on compte ses sorts et ses attaques de souvenir
      let sbVu = 0, n0 = e.asm.st.n; const P = B.P; for (let i = 0; i < 60 * 30 && !e.dead; i++) { P.iT = 99; P.hp = P.s.maxHp; B.step(1 / 60); if (e.asm.st.sb) sbVu++; }
      o.sorts = e.asm.st.n - n0; o.sbVu = sbVu; o.k = e.asm.sb && e.asm.sb.k; }
    return o;
  });
  console.log('R2-R3', JSON.stringify({ boutique: r.boutique, suivante: r.suivante, e: r.e, attendu: r.attendu, sorts: r.sorts, sbVu: r.sbVu, k: r.k }));
  ok(!r.boutique.nem && r.suivante.nem === r.f.uid && r.suivante.s === r.f.attend.salle + 1, 'R2 : boutique à sa salle, il vient à la suivante');
  ok(r.suivante.vague, 'R2 : il arrive avec la deuxième vague');
  ok(r.arrive && r.e && r.e.uid === r.f.uid && r.e.points === 1, 'R3 : la némésis est là (uid, 1 point)');
  ok(r.e && r.e.cle === r.f.cle && r.e.nom === r.f.nom, 'R3 : même assemblage, même nom (' + (r.e && r.e.nom) + ')');
  ok(r.e && r.f.sv && r.e.sv === r.f.sv.id, 'R3 : son souvenir');
  ok(r.e && Math.abs(r.e.force - r.attendu.force) < 1e-9, `R3 : force ${r.e && r.e.force} = ${r.attendu && r.attendu.force}`);
  if (r.f.sv && !r.f.sv.renfort && !r.f.sv.sansGeste) { ok(r.e.sb === r.f.sv.fid, 'R3 : son arme de la Brume'); ok(r.sbVu > 0 && r.k > 0, `R3 : il joue ton souvenir (${r.sbVu} images, force bornée ${r.k})`); }
  ok(r.sorts >= 3, `R3 : il se bat (${r.sorts} sorts en 30 s)`);
});
// R4. PV et force : la némésis contre un porteur ordinaire de même assemblage et même souvenir, même salle ; puis point 2 (Robuste)
await cas('R4', '', async page => {
  const r = await page.evaluate(() => {
    const G = () => window.__glas.dbg(), NE = window.__nemesis;
    T.lancer('lum', { acte: 2, salle: 3, souv: 'fan_n2', rangSouv: 2, gSouv: 1 }); T.attendre(true); const k1 = T.tuer('masque'); const f = k1.save.liste[0];
    const mesure = () => { const e = T.masque(); return { hp: e.maxHp, force: e.asm.sv.force, nem: e.asm.nem, red: e.asm.sbReduit || 0, dmg: e.dmg }; };
    // la némésis, point 1
    T.nouvelle('lum', 2); for (let s = 1; s < f.attend.salle; s++) T.entrer('combat'); T.entrer('combat'); T.attendre(true); const n1 = mesure(); const g1 = G().RUN.g;
    // elle te tue : point 2
    const k2 = T.tuer('masque'); const b2 = k2.bilan;
    T.nouvelle('lum', 2); for (let s = 1; s < f.attend.salle; s++) T.entrer('combat'); T.entrer('combat'); T.attendre(true); const n2 = mesure();
    // le même porteur, ordinaire (némésis coupée), même salle
    NE.activer(false); window.__nemesis.activer(false);
    const R0 = { cls: 'lum' }; window.__brume.cls('lum'); window.__brume.start(); const R = G().RUN; R.act = 2; R.g = g1 - 1; R.roomIdx = f.attend.salle - 1;
    R.reserveBrume.push({ id: 'fan_n2', source: 'talent', rang: 2, g: 1, oublie: { acte: 2, salle: 1 }, porte: 0 });
    window.__asm.forcer = 1; window.__asm.souv = 'fan_n2'; window.__asm.combo = f.co.cle;
    try { G().entrer('combat'); } finally { window.__asm.forcer = 0; window.__asm.souv = null; window.__asm.combo = null; }
    const rr = G().room; if (rr.asm && rr.waves.length > 1) rr.waves.shift(); T.attendre(true); const o0 = mesure(); o0.cle = rr.asm.co.cle;
    return { f: { cle: f.co.cle, attend: f.attend }, n1, b2, n2, o0, g1, g0: G().RUN.g };
  });
  console.log('R4', JSON.stringify(r));
  ok(r.o0.cle === r.f.cle, 'R4 : le porteur de comparaison a le même assemblage');
  ok(r.g0 === r.g1, `R4 : même salle (${r.g0} / ${r.g1})`);
  ok(Math.abs(r.n1.hp / r.o0.hp - 1.08) < 0.005, `R4 : point 1, PV × ${(r.n1.hp / r.o0.hp).toFixed(3)} (× 1,08)`);
  ok(Math.abs(r.n1.force - r.o0.force - 0.15) < 1e-9, `R4 : point 1, force + 0,15 (${r.n1.force} / ${r.o0.force})`);
  ok(r.b2 && r.b2.decision === 'point' && r.b2.point, 'R4 : elle te tue dans sa salle : un point');
  ok(r.n2.nem && r.n2.nem.points === 2 && r.n2.nem.renforts.includes('pv'), 'R4 : point 2, renfort Robuste');
  ok(Math.abs(r.n2.hp / r.o0.hp - 1.16 * 1.15) < 0.006, `R4 : point 2, PV × ${(r.n2.hp / r.o0.hp).toFixed(3)} (× 1,16 × 1,15)`);
  ok(Math.abs(r.n2.dmg - r.o0.dmg) < 1e-9, 'R4 : point 2, pas de renfort de dégâts (il vient au point 4)');
});
// R5. Répit : troisième mort de suite, il saute une descente, puis revient ; R6. passer sa salle sans mourir contre lui remet le compte à zéro
await cas('R5-R6', '', async page => {
  const r = await page.evaluate(() => {
    const NE = window.__nemesis, o = {};
    T.lancer('gou', { acte: 1, salle: 3 }); T.attendre(true); const f = T.tuer('masque').save.liste[0]; const s = f.attend.salle;
    const aSaSalle = () => { T.nouvelle('gou', 1); let x = null; for (let i = 1; i <= s; i++) x = T.entrer('combat'); return x; };
    let x = aSaSalle(); T.attendre(true); o.m2 = T.tuer('masque').bilan;                    // 2e mort
    x = aSaSalle(); T.attendre(true); o.m3 = T.tuer('masque').bilan; o.f3 = T.fiche(f.uid);   // 3e mort : répit
    x = aSaSalle(); o.repitSalle = x.nem; T.tuer('perte'); o.f4 = T.fiche(f.uid);            // il ne vient pas ; la descente passe
    x = aSaSalle(); o.revient = x.nem === f.uid;
    // il est là ; tu passes sa salle (salle suivante) puis tu meurs ailleurs : compte remis à zéro
    const fx = T.fiche(f.uid); const S = window.__brume.SAVE; S.nemesis.liste.find(y => y.uid === f.uid).morts = 2;
    T.entrer('combat'); T.tuer('perte'); o.f6 = T.fiche(f.uid);
    o.uid = f.uid; return o;
  });
  console.log('R5-R6', JSON.stringify({ m2: r.m2, m3: r.m3, f3: r.f3 && { p: r.f3.points, m: r.f3.morts, r: r.f3.repit }, f4: r.f4 && { m: r.f4.morts, r: r.f4.repit }, revient: r.revient, f6: r.f6 && { m: r.f6.morts } }));
  ok(r.m2.decision === 'point' && r.m3.decision === 'point', 'R5 : deuxième et troisième morts face à elle : des points');
  ok(r.f3.points === 3 && r.f3.repit === 1 && r.f3.morts === 0, 'R5 : trois morts de suite : répit');
  ok(!r.repitSalle && r.f4.repit === 0, 'R5 : la descente suivante, pas là ; le répit passe');
  ok(r.revient, 'R5 : puis elle revient');
  ok(r.f6.morts === 0, 'R6 : sa salle franchie, mort ailleurs : compte remis à zéro');
});
// R7. Inactive, descente d'essai : elle ne vient pas ; R8. fiche périmée (capacité retirée) : réassemblée à la lecture, sauvegarde réécrite
await cas('R7-R8', '', async page => {
  const r = await page.evaluate(() => {
    const NE = window.__nemesis, G = () => window.__glas.dbg(), S = () => window.__brume.SAVE, o = {};
    T.lancer('tis', { acte: 2, salle: 3 }); T.attendre(true); const f = T.tuer('masque').save.liste[0]; const s = f.attend.salle;
    T.nouvelle('tis', 2); NE.activer(false); let x; for (let i = 1; i <= s; i++) x = T.entrer('combat'); o.inactif = x.nem;
    NE.activer(true); window.__asm.essai(null, 2, true, null, 'tis'); const R = G().RUN; R.act = 2; R.roomIdx = s - 1; x = T.entrer('combat'); o.essai = x.nem; o.essaiRun = R.essai;
    // fiche périmée
    const L = S().nemesis.liste, g = L.find(y => y.uid === f.uid); o.cle0 = g.co.cle; g.co = Object.assign({}, g.co, { depart: ['taches', g.co.depart[1]], cle: 'vieux' });
    T.nouvelle('tis', 2); for (let i = 1; i <= s; i++) x = T.entrer('combat'); o.perimee = x.nem; T.attendre(true); const e = T.masque(); o.cle = e && e.asm.co.cle; o.save = T.fiche(f.uid).co.cle;
    o.uid = f.uid; return o;
  });
  console.log('R7-R8', JSON.stringify(r));
  ok(!r.inactif, 'R7 : inactive : elle ne vient pas');
  ok(r.essaiRun === 1 && !r.essai, 'R7 : descente d’essai : elle ne vient pas');
  ok(r.perimee === r.uid && r.cle && r.cle !== 'vieux' && !r.cle.includes('taches') && r.save === r.cle, `R8 : réassemblée (${r.cle}) et réécrite`);
});

// ── Action 4 : la revanche
// la file d'écrans avance dans la boucle du jeu (requestAnimationFrame) : on rend la main au navigateur avant de lire
const lire = async page => { await page.waitForTimeout(700); return page.evaluate(() => ({ ecran: T.ecran(), rev: window.__glas.dbg().RUN.nemRevanche || null, mem: T.memoire(), sh: window.__glas.dbg().RUN.sh.elites - T.sh0 })); };
const appuie = async (page, k) => { await page.waitForTimeout(650); await page.keyboard.press(k); await page.waitForTimeout(700); return page.evaluate(() => { return { ecran: T.ecran(), mem: T.memoire(), rev: window.__glas.dbg().RUN.nemRevanche }; }); };
// V1. Même forme, talent absent : son souvenir à son rang, sans gravures, en trophée ; puis la relique ; la fiche est effacée à sa mort
await cas('V1', '', async page => {
  const r = await page.evaluate(() => { const p = T.preparer('lum', 'lum', { souv: 'fan_n2', rangSouv: 2, gSouv: 1 }); return { p: { nem: p.x.nem, uid: p.f.uid }, b: T.briser() }; });
  Object.assign(r.b, await lire(page));
  ok(r.p.nem === r.p.uid, 'V1 : la némésis est là');
  ok(r.b.apresMort === 0, 'V1 : brisée, sa fiche est effacée tout de suite');
  ok(r.b.ecran === 'nemesis', 'V1 : l’écran de son souvenir (' + r.b.ecran + ')');
  const k = await appuie(page, '1');
  const a = k.mem.find(x => x.id === 'fan_n2');
  ok(a && a.rang === 2 && a.g === 0 && a.tro, 'V1 : repris au rang 2, sans gravure, en trophée (' + JSON.stringify(a) + ')');
  ok(k.ecran === 'relique', 'V1 : puis la relique (' + k.ecran + ')');
  ok(k.rev && k.rev.type === 'talent' && k.rev.pris, 'V1 : revanche notée');
});
// V2. « Le laisser » : rien de plus que la relique
await cas('V2', '', async page => {
  await page.evaluate(() => { T.preparer('her', 'her', { talentsA: [['car_x1a', 1, 0]] }); return T.briser(); }); await lire(page);
  const id = await page.evaluate(() => window.__glas.dbg().RUN.nemRevanche && window.__glas.dbg().RUN.nemRevanche.id);
  const k = await appuie(page, '2');
  ok(id && !k.mem.some(x => x.id === id), 'V2 : laissé, pas dans ta mémoire');
  ok(k.ecran === 'relique' && k.rev.laisse, 'V2 : la relique reste');
});
// V3. Autre forme : des Éclats pour ce run (base + parPoint × points), aucun écran de souvenir ; V4. tu le portes plus bas : ton rang monte
await cas('V3-V4', '', async page => {
  const r = await page.evaluate(() => { const A = window.BRUME_DATA.bestiaire.assemble.nemesis;
    T.preparer('lum', 'gou', { souv: 'fan_n2', rangSouv: 2 }); T.briser();
    return { att: A.reprise.eclats.base + A.reprise.eclats.parPoint * 1, type: window.__glas.dbg().room.type }; });
  r.b3 = await lire(page);
  await page.evaluate(() => { T.preparer('lum', 'lum', { souv: 'fan_n2', rangSouv: 3, talents: [['fan_n2', 1, 0]] }); T.briser(); });
  r.b4 = await lire(page); r.mem4 = r.b4.mem.find(x => x.id === 'fan_n2');
  const bonus = r.type === 'elite' ? 0 : 6;
  ok(r.b3.ecran === 'relique' && r.b3.rev && r.b3.rev.type === 'eclats', 'V3 : autre forme : pas d’écran de souvenir, la relique');
  ok(r.b3.sh === r.att + bonus, `V3 : +${r.att} éclats (+${bonus} du Masqué) : ${r.b3.sh}`);
  ok(r.b4.rev && r.b4.rev.type === 'rang' && r.mem4 && r.mem4.rang === 3, 'V4 : tu le portais au rang 1, il passe au rang 3 (' + JSON.stringify(r.mem4) + ')');
  ok(r.b4.ecran === 'relique', 'V4 : puis la relique');
});
// V5. Mémoire pleine, trophée de l'acte déjà pris : l'écran d'oubli s'ouvre, oublier rend le souvenir (une place, pas un trophée)
await cas('V5', '', async page => {
  const r = await page.evaluate(() => {
    const NO = window.__brume.nodes(), ids = Object.keys(NO).filter(id => NO[id].cls === 'lum' && NO[id].kind !== 'c' && !/_sk$/.test(id) && id !== 'fan_n2').slice(0, 10);
    window.__brume.SAVE.flags.b_memoire = 1;   // la présentation de la Mémoire (une fois par sauvegarde) est déjà vue
    T.preparer('lum', 'lum', { souv: 'fan_n2', rangSouv: 2, talents: ids.map(id => [id, 1, 0]), avant: () => { const M = window.__memoire.M; M.trophees = Object.assign({}, M.trophees, { 2: 1 }); } });
    return { plein: window.__memoire.M.actifs.length, b: T.briser() };
  });
  Object.assign(r.b, await lire(page));
  ok(r.plein >= 10 && r.b.ecran === 'nemesis', `V5 : mémoire pleine (${r.plein}), écran du souvenir`);
  const k1 = await appuie(page, '1');
  ok(k1.ecran === 'oubli', 'V5 : reprendre, mémoire pleine : écran d’oubli (' + k1.ecran + ')');
  const k2 = await appuie(page, '1');
  const a = k2.mem.find(x => x.id === 'fan_n2');
  ok(a && a.rang === 2 && !a.tro && k2.mem.length === r.plein, 'V5 : un souvenir oublié, le sien repris à sa place (' + JSON.stringify(a) + ')');
  ok(k2.ecran === 'relique', 'V5 : puis la relique (' + k2.ecran + ')');
});
// V6. Brûlé dans cette descente : Éclats ; V7. tu la brises puis tu meurs dans sa salle : pas de nouvelle némésis, l'ancienne est partie
await cas('V6-V7', '', async page => {
  await page.evaluate(() => {
    T.preparer('lum', 'lum', { souv: 'fan_n2', rangSouv: 2, talents: [['fan_n2', 1, 0]], avant: () => window.__dernier.bruler('fan_n2', { libre: true }) });
    T.briser(); return null; });
  const b6 = await lire(page);
  const r = await page.evaluate(() => {
    T.preparer('tis', 'tis', {}); const e = T.masque(); window.__asm.dbg().kill(e); window.__brume.step(1 / 60, 2);
    const k = T.tuer('autre');
    return { k7: { bilan: k.bilan, n: (k.save.liste || []).length } };
  }); r.b6 = b6;
  ok(r.b6.rev && r.b6.rev.type === 'eclats', 'V6 : brûlé dans la descente : Éclats (' + JSON.stringify(r.b6.rev) + ')');
  ok(r.k7.bilan && r.k7.bilan.refus === 'brise' && r.k7.n === 0, 'V7 : brisée puis mort dans sa salle : aucune fiche (' + JSON.stringify(r.k7) + ')');
});

// S1-S3 (action 7) : statistiques de la descente. S1 : tué par le Masqué = promu, par:'asm:<corps>' ; S2 : tué par un autre (elle est promue quand même, sans le coup mortel) ;
// S3 : sa revanche (rencontrée, vaincue, reprise prise) dans la descente suivante.
await cas('S1', '', async page => {
  const r = await page.evaluate(() => { T.lancer('lum', { acte: 2, souv: 'ray_n1' }); T.attendre(true); const k = T.tuer('masque'); const S = window.__memoire.stats(); return { k, st: S[S.length - 1] }; });
  console.log('S1', JSON.stringify({ par: r.st && r.st.par, nem: r.st && r.st.nemesis }));
  ok(r.st && /^asm:(brute|spectre|voile)$/.test(r.st.par), 'S1 : par = asm:<corps> (' + (r.st && r.st.par) + ')');
  ok(r.st && r.st.nemesis && r.st.nemesis.promu === 'nouveau' && r.st.nemesis.points === 1 && r.st.nemesis.coup === true && r.st.nemesis.mortContre === false && r.st.nemesis.rencontree === false, 'S1 : promue, 1 point, coup mortel de sa main (neuve : pas de mort « contre » elle)');
});
await cas('S2', '', async page => {
  const r = await page.evaluate(() => { T.lancer('lum', { acte: 2, souv: 'ray_n1' }); T.attendre(true); T.tuer('autre'); const S = window.__memoire.stats(); return S[S.length - 1]; });
  console.log('S2', JSON.stringify({ par: r.par, nem: r.nemesis }));
  ok(r && !/^asm:/.test(r.par) && r.nemesis && r.nemesis.promu === 'nouveau' && r.nemesis.coup === false, 'S2 : tué par un autre : pas de par asm:, promue, coup:false');
});
await cas('S3', '', async page => {
  const r = await page.evaluate(() => { const p = T.preparer('lum', 'lum', { souv: 'ray_n1' }); T.briser(); window.__brume.step(1 / 60, 30); const R = window.__glas.dbg().RUN; return { v: Object.keys(R.nemVenus || {}).length, b: Object.keys(R.nemBrisees || {}).length, s: window.__nemesis.statsRun() }; });
  console.log('S3', JSON.stringify(r));
  ok(r.s && r.s.rencontree === true && r.s.vaincue === true && r.s.promu === null && r.s.mortContre === false, 'S3 : rencontrée et vaincue, pas promue (' + JSON.stringify(r.s) + ')');
});

await browser.close();
console.log(`${checks} vérifications, ${fails} échec${fails > 1 ? 's' : ''}.`);
process.exit(fails ? 1 : 0);
