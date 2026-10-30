// Banc Chromium, némésis (v17.25), action 8 : ce que N18 demande en plus de banc-nemesis.mjs (promotion par chaque chemin, retour et trousseau,
// plafond, modes d'essai, régressions, mouvements réduits, erreurs de script). Usage : node banc-nemesis-complet.mjs [port]
import { createRequire } from 'node:module';
const require = createRequire('/opt/npm-tools/node_modules/');
const { chromium } = require('playwright');
const PORT = process.argv[2] || 8765, BASE = `http://127.0.0.1:${PORT}/index.html`;
let fails = 0, checks = 0; const ok = (c, m) => { checks++; if (!c) { fails++; console.error('ÉCHEC : ' + m); } };
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
async function ouvre(qs = '', rm = false) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, reducedMotion: rm ? 'reduce' : 'no-preference' }); const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 300)));
  await page.goto(BASE + (qs ? '?' + qs : '')); await page.waitForFunction(() => !!(window.__brume && window.__asm && window.__nemesis && window.__glas), null, { timeout: 30000 });
  await page.evaluate(() => {
    const B = window.__brume, NE = window.__nemesis, G = () => window.__glas.dbg(), AS = window.__asm;
    window.T = {
      lancer(cls, acte, salle, activer = true) { NE.activer(activer); B.cls(cls); B.start(); const g = G(), R = g.RUN; R.act = acte; R.g = acte >= 3 ? 18 : 10; R.roomIdx = salle;
        window.__dernier.prendre('ray_n1', 1, 0); AS.forcer = 1; try { g.entrer('elite'); } finally { AS.forcer = 0; } const r = G().room; if (r.asm && r.waves.length > 1) r.waves.shift(); },
      attendre() { const P = B.P; for (let i = 0; i < 1800; i++) { P.iT = 99; B.step(1 / 60); const R = G().room.asm, e = R && R.e; if (e && !e.asm.mont) return true; } return false; },
      seul() { const g = G(), e = g.room.asm.e; for (const x of g.enemies) if (!x.dead && x !== e && !x.fixed) AS.dbg().kill(x); g.room.waves = []; return e; },
      // chemin : 'contact' (le Masqué te touche), 'tir' (un tir de lui), 'autre' (un tir d'un autre), 'perte' (PV perdus sans source), 'escorte' (contact d'un autre)
      mourir(chemin) { const g = G(), P = g.P; const e = chemin === 'escorte' ? g.enemies.find(x => !x.dead && x !== g.room.asm.e && !x.fixed) : T.seul(); const src = chemin === 'tir' ? e : chemin === 'autre' ? g.enemies.find(x => !x.dead && x !== g.room.asm.e && !x.fixed) : null;
        for (let i = 0; i < 400 && !P.dead; i++) { P.hp = Math.min(P.hp, 3); P.iT = 0; P.dashT = 0;
          if (chemin === 'contact') { P.x = g.room.asm.e.x; P.y = g.room.asm.e.y; }
          else if (chemin === 'escorte') { P.x = e.x; P.y = e.y; const M = g.room.asm.e; M.x = 1100; M.y = 150; }
          else g.eproj.push(Object.assign({ x: P.x, y: P.y, vx: 0, vy: 0, r: 9, dmg: 999, life: 0.5 }, src ? { from: src } : {}));
          B.step(1 / 60); }
        const dead = P.dead; B.step(1 / 60, 100); return { dead, coup: NE.coup().masque, liste: (NE.voir().liste || []).length, bilan: NE.bilan() }; }
    };
  });
  return { page, errs, ctx };
}
const cas = async (nom, qs, fn, rm) => { const { page, errs, ctx } = await ouvre(qs, rm); try { await fn(page); } catch (e) { ok(false, nom + ' : ' + e.message); } ok(!errs.length, nom + ' : erreurs ' + errs.join(' | ')); await ctx.close(); };

// P. Promotion par chaque chemin de mort dans la salle d'un Masqué : promue à chaque fois ; le coup mortel n'est noté que s'il vient de lui
for (const [ch, coup] of [['contact', true], ['tir', true], ['autre', false], ['perte', false], ['escorte', false]])
  await cas('P-' + ch, '', async page => {
    const r = await page.evaluate(ch => { T.lancer('lum', 2, 3); T.attendre(); return T.mourir(ch); }, ch);
    console.log('P', ch, JSON.stringify({ dead: r.dead, coup: r.coup, liste: r.liste, d: r.bilan && r.bilan.decision }));
    ok(r.dead, 'P-' + ch + ' : mort'); ok(r.liste === 1 && r.bilan && r.bilan.decision === 'nouveau', 'P-' + ch + ' : promue'); if (ch !== 'escorte') ok(!!r.coup === coup, `P-${ch} : coup mortel de sa main = ${coup} (${r.coup})`);
  });
// Q. Le retour et le trousseau (par l'essai : points 5) : en temps réel (le trousseau se met à jour au dessin), couture finie, crânes accrochés un à un,
// jamais plus de 5, côté opposé à la marche, figé pendant un chargement. Q-RM : en mouvements réduits, rien ne bouge.
const pompe = async (page, mode) => page.evaluate(mode => { const g = () => window.__glas.dbg(); window.__Q = { vus: [], max: 0, mode, fige: null };
  const e0 = () => g().room.asm && g().room.asm.e; let t0 = null, th = null, X = null;
  window.__glas.hook = dt => { const e = e0(), P = g().P; P.iT = 99; P.hp = 99; P.x = 300; P.y = 600;
    for (const x of g().enemies) if (x !== e && !x.dead && !x.fixed && !x.asm) window.__asm.dbg().kill(x);
    if (!e) return;
    if (e.asm.mont) return; if (t0 == null) t0 = g().RUN.time; const t = g().RUN.time - t0; e.asm.st.ph = 'pause'; e.asm.st.t = 99;
    const T = e.asm.trou; if (T) { const l = window.__Q.vus; if (!l.length || l[l.length - 1] !== T.vu) l.push(T.vu); window.__Q.n = T.n; window.__Q.cote = T.cote; for (const it of T.it) window.__Q.max = Math.max(window.__Q.max, Math.abs(it.th - it.th0), Math.abs(it.yaw - it.y0)); }
    if (X == null) X = e.x;
    if (mode === 'marche') { if (t > 2 && t < 3.5) X += 120 * dt; else if (t > 4 && t < 5.5) X -= 120 * dt; e.x = X; e.y = 400; if (t > 3.4 && t < 3.6) window.__Q.coteDroite = T && T.cote; if (t > 5.4 && t < 5.6) window.__Q.coteGauche = T && T.cote; }
    if (mode === 'marche' && t > 6 && t < 7) { e.asm.st.ph = 'charge'; if (!th && T) th = T.it.map(x => x.th); if (T && th) window.__Q.fige = T.it.every((x, i) => x.th === th[i]); } };
  return true; }, mode);
await cas('Q', 'nemesis=ray_n1&points=5&acte=2', async page => {
  await pompe(page, 'marche'); await page.waitForTimeout(24000);
  const q = await page.evaluate(() => { window.__glas.hook = null; return window.__Q; }); console.log('Q', JSON.stringify(q));
  ok(q.n === 5, 'Q : 5 crânes'); ok(q.vus[q.vus.length - 1] === 5 && q.vus[0] <= 1, 'Q : tous accrochés (' + q.vus.join(',') + ')'); ok(q.vus.every((v, i) => i === 0 || v === q.vus[i - 1] + 1), 'Q : un par un, sans saut');
  ok(q.coteDroite === -1 && q.coteGauche === 1, `Q : côté opposé à la marche (${q.coteDroite}/${q.coteGauche})`); ok(q.fige === true, 'Q : figé pendant un chargement'); ok(q.max > 0.01, 'Q : le trousseau bouge (' + q.max.toFixed(3) + ')');
});
await cas('Q-RM', 'nemesis=ray_n1&points=3&acte=2', async page => {
  await pompe(page, 'marche'); await page.waitForTimeout(10000);
  const q = await page.evaluate(() => { window.__glas.hook = null; return window.__Q; }); console.log('Q-RM', JSON.stringify(q));
  ok(q.n === 3 && q.vus[q.vus.length - 1] === 3, 'Q-RM : trousseau complet'); ok(q.max < 1e-9, 'Q-RM : figé (' + q.max + ')');
}, true);

// X. Plafond : une fiche à 5 points qui te tue encore reste à 5 ; points exacts à chaque palier (1 → 5)
await cas('X', '', async page => {
  const r = await page.evaluate(() => { const NE = window.__nemesis, out = [];
    T.lancer('lum', 2, 3); T.attendre(); T.mourir('tir'); const f = JSON.parse(JSON.stringify(NE.voir().liste[0])); out.push(f.points);
    for (let i = 0; i < 6; i++) { const d = NE.F.nemPoint(window.BRUME_DATA.bestiaire.assemble.nemesis, f, { salle: 3 }); out.push(d ? 1 : 0); f.repit = 0; }
    return { out, fin: f.points }; });
  console.log('X', JSON.stringify(r)); ok(r.out[0] === 1, 'X : 1 point à la promotion'); ok(r.out.slice(1).join('') === '111100' && r.fin === 5, 'X : 1 → 5 puis plus rien (' + r.out.join('') + ', ' + r.fin + ')');
});

// M. Modes : aucune apparition ni promotion dans les modes d'essai (?brume=, ?glas=, ?dernier=)
for (const qs of ['brume=faisceau&acte=2', 'glas=sol,onde,cloche&acte=3', 'dernier=ray_n1&acte=2&masque=1'])
  await cas('M-' + qs.split('=')[0], qs, async page => {
    await page.waitForTimeout(2200);
    const r = await page.evaluate(() => { window.__nemesis.activer(true); const R = window.__glas.dbg().RUN; return { essai: !!(R && R.essai) || /[?&](brume|glas|dernier)=/.test(location.search), n: (window.__nemesis.voir().liste || []).length, venus: Object.keys((R && R.nemVenus) || {}).length }; });
    console.log('M', qs, JSON.stringify(r)); ok(r.n === 0 && r.venus === 0, 'M-' + qs + ' : aucune fiche, aucune apparition');
  });

// Z. Régressions : les quatre formes, descente ordinaire (némésis active, aucune fiche) : salles de combat, élite, Masqué ; aucune erreur de script
for (const cls of ['lum', 'gou', 'her', 'tis'])
  await cas('Z-' + cls, '', async page => {
    const r = await page.evaluate(cls => { const NE = window.__nemesis, B = window.__brume, g = () => window.__glas.dbg(); NE.activer(true); B.cls(cls); B.start(); const R = g().RUN; R.act = 2; R.g = 10; R.roomIdx = 2; let n = 0;
      for (const t of ['combat', 'elite', 'combat']) { g().entrer(t); for (let i = 0; i < 600; i++) { g().P.iT = 99; B.step(1 / 60); } n++; }
      return { n, fiches: (NE.voir().liste || []).length, state: g().state }; }, cls);
    ok(r.n === 3 && r.fiches === 0, 'Z-' + cls + ' : trois salles, aucune fiche (' + JSON.stringify(r) + ')');
  });
await browser.close();
console.log(`${checks} vérifications, ${fails} échec${fails > 1 ? 's' : ''}.`); process.exit(fails ? 1 : 0);
