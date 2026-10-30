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
        AS.forcer = 1; AS.souv = opt.souv || null;
        try { g.entrer('elite'); } finally { AS.forcer = 0; AS.souv = null; }
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
    T.lancer('her', { acte: 1, salle: 5 }); T.attendre(true); const k3 = T.tuer('masque');
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

await browser.close();
console.log(`${checks} vérifications, ${fails} échec${fails > 1 ? 's' : ''}.`);
process.exit(fails ? 1 : 0);
