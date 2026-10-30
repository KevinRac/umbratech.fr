// Banc Chromium, némésis (v17.25), action 9 : les défauts de la relecture indépendante, un test chacun. Usage : node banc-nemesis-revue.mjs [port]
import { createRequire } from 'node:module';
const require = createRequire('/opt/npm-tools/node_modules/');
const { chromium } = require('playwright');
const PORT = process.argv[2] || 8765, BASE = `http://127.0.0.1:${PORT}/index.html`;
let fails = 0, checks = 0; const ok = (c, m) => { checks++; if (!c) { fails++; console.error('ÉCHEC : ' + m); } };
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
async function ouvre(w = 1280, h = 720) { const page = await browser.newPage({ viewport: { width: w, height: h } }); const errs = []; page.on('pageerror', e => errs.push(String(e).slice(0, 300)));
  await page.goto(BASE); await page.waitForFunction(() => !!(window.__brume && window.__nemesis && window.__memoire && window.__asm), null, { timeout: 30000 });
  await page.evaluate(() => { const B = window.__brume, NE = window.__nemesis, G = () => window.__glas.dbg(), AS = window.__asm;
    window.T = { dem() { NE.activer(true); B.cls('lum'); B.start(); const R = G().RUN; R.act = 2; R.g = 10; R.roomIdx = 3; },
      mourir() { NE.activer(true); B.cls('lum'); B.start(); const g = G(), R = g.RUN; R.act = 2; R.g = 10; R.roomIdx = 3; window.__dernier.prendre('ray_n1', 1, 0); AS.forcer = 1; try { g.entrer('elite'); } finally { AS.forcer = 0; } const r = G().room; if (r.asm && r.waves.length > 1) r.waves.shift();
        const P = B.P; for (let i = 0; i < 1800; i++) { P.iT = 99; B.step(1 / 60); const a = G().room.asm, e = a && a.e; if (e && !e.asm.mont) break; }
        const e = G().room.asm.e; for (const x of g.enemies) if (x !== e && !x.dead && !x.fixed) AS.dbg().kill(x); g.room.waves = [];
        for (let i = 0; i < 90 && !P.dead; i++) { P.iT = 0; P.dashT = 0; P.hp = Math.min(P.hp, 3); g.eproj.push({ x: P.x, y: P.y, vx: 0, vy: 0, r: 9, dmg: 999, life: 0.5, from: e }); B.step(1 / 60); } B.step(1 / 60, 100); return NE.voir(); },
      fiche(id, cls, rang) { return { uid: 'revueuid01', corps: 'brute', co: { corps: 'brute', depart: ['onde', 'tirs'], eveil: 'charge', menace: 11, base: 'brute:onde+tirs', cle: 'brute:onde+tirs>charge' }, nom: 'Brute', sv: { id, cls, rang: rang || 1, g: 0, fid: 'faisceau', vars: [], renfort: null }, points: 2, morts: 1, ne: { run: 0, acte: 2, salle: 3, palier: 0, cls }, attend: { acte: 2, salle: 3 }, vu: 1, repit: 0, coup: false }; } }; });
  return { page, errs }; }
const cas = async (nom, fn, w, h) => { const { page, errs } = await ouvre(w, h); try { await fn(page); } catch (e) { ok(false, nom + ' : ' + e.message); } ok(!errs.length, nom + ' : erreurs ' + errs.join(' | ')); await page.close(); };

// R1. Reprendre un talent oublié dans cette descente : en mémoire, plus dans la réserve
await cas('R1', async page => {
  await page.evaluate(() => { T.dem(); const R = window.__glas.dbg().RUN; R.reserveBrume.push({ id: 'ray_n1', source: 'talent', rang: 1, g: 0, oublie: { acte: 2, salle: 1 }, porte: 0 }); window.__memoire.offreNemesis(T.fiche('ray_n1', 'lum'), 'Test'); });
  await page.waitForTimeout(900); await page.click('#mrps'); await page.waitForTimeout(300);
  const a = await page.evaluate(() => ({ mem: window.__memoire.M.actifs.filter(x => x.id === 'ray_n1').length, res: (window.__glas.dbg().RUN.reserveBrume || []).filter(x => x.id === 'ray_n1').length, pris: window.__glas.dbg().RUN.nemRevanche.pris }));
  console.log('R1', JSON.stringify(a)); ok(a.mem === 1 && a.res === 0, 'R1 : en mémoire une fois, plus dans la réserve'); ok(a.pris === true, 'R1 : reprise notée une fois reçue');
});
// R2. Statistiques : Éclats (autre forme), rang (tu le portes plus bas), gravure (tu le portes déjà au même rang)
await cas('R2', async page => {
  const e = await page.evaluate(() => { T.dem(); window.__glas.dbg().RUN.nemBrisees = { revueuid01: 2 }; window.__memoire.offreNemesis(T.fiche('ray_n1', 'gou'), 'x'); return window.__nemesis.statsRun(); });
  console.log('R2 éclats', JSON.stringify(e)); ok(e && e.reprise === 'eclats' && e.eclats > 0, 'R2 : Éclats notés');
  const r = await page.evaluate(() => { window.__dernier.prendre('ray_n1', 1, 0); window.__memoire.offreNemesis(T.fiche('ray_n1', 'lum', 3), 'x'); return window.__nemesis.statsRun(); });
  console.log('R2 rang', JSON.stringify(r)); ok(r && r.reprise === 'rang', 'R2 : rang noté');
  const g = await page.evaluate(() => { window.__memoire.offreNemesis(T.fiche('ray_n1', 'lum', 3), 'x'); return window.__nemesis.statsRun(); });
  console.log('R2 gravure', JSON.stringify(g)); ok(g && (g.reprise === 'gravure' || g.reprise === 'eclats'), 'R2 : gravure (ou Éclats si rien à graver) notée');
});
// R3. « Le laisser » est noté 'laisse', pas 'talent'
await cas('R3', async page => {
  await page.evaluate(() => { T.dem(); window.__glas.dbg().RUN.nemBrisees = { revueuid01: 2 }; window.__memoire.offreNemesis(T.fiche('ray_n1', 'lum'), 'x'); }); await page.waitForTimeout(900); await page.click('#mrpr'); await page.waitForTimeout(300);
  const s = await page.evaluate(() => window.__nemesis.statsRun()); console.log('R3', JSON.stringify(s)); ok(s && s.reprise === 'laisse', 'R3 : laissé noté laissé');
});
// R4. Infobulle de la porte bien placée dans une fenêtre qui n'est pas en 16:9 (letterbox) : comparée à la formule du cadrage
for (const [w, h] of [[1280, 900], [1920, 900]])
  await cas('R4-' + w + 'x' + h, async page => {
    const fi = await page.evaluate(() => { const l = T.mourir(); return l.liste.length; }); ok(fi === 1, 'R4 : une fiche');
    await page.evaluate(() => { const NE = window.__nemesis, B = window.__brume, G = () => window.__glas.dbg(); const f = NE.voir().liste[0]; NE.activer(true); B.cls('lum'); B.start(); const R = G().RUN; R.act = f.attend.acte; R.g = 10; R.roomIdx = f.attend.salle - 2; G().entrer('combat');
      G().room.doors = [{ type: 'combat', x: 1280 / 2 - 320, open: 1 }, { type: 'autel', x: 1280 / 2, open: 1 }, { type: 'elite', x: 1280 / 2 + 320, open: 1 }]; window.paused = false; B.step(1 / 60, 2); });
    const sc = Math.min(w / 1280, h / 720), offX = (w - 1280 * sc) / 2, offY = (h - 720 * sc) / 2, dx = offX + (640 - 320) * sc, dy = offY + 60 * sc;
    await page.waitForTimeout(300); await page.mouse.move(dx, dy); await page.waitForTimeout(500);
    const t = await page.evaluate(() => { const e = document.getElementById('nemTip'); if (!e || !e.classList.contains('show')) return null; const r = e.getBoundingClientRect(); return { cx: r.left + r.width / 2, top: r.top }; });
    console.log('R4', w, h, JSON.stringify(t), 'attendu', Math.round(dx), Math.round(offY + (94 + 50) * sc));
    ok(t && Math.abs(t.cx - (offX + 320 * sc)) < 3 && Math.abs(t.top - (offY + 144 * sc)) < 3, `R4-${w}x${h} : infobulle à sa place`);
  }, w, h);
// R5. Fiche abîmée (sv.vars pas un tableau) : ignorée à la lecture, aucune erreur
await cas('R5', async page => {
  const r = await page.evaluate(() => { const f = T.fiche('ray_n1', 'lum'); f.sv.vars = 'x'; const ok0 = window.__nemesis.F.nemLire({ v: 1, liste: [f, T.fiche('ray_n1', 'lum')] }); return ok0.liste.length; });
  ok(r === 1, 'R5 : la fiche abîmée est écartée, l’autre gardée');
});
await browser.close();
console.log(`${checks} vérifications, ${fails} échec${fails > 1 ? 's' : ''}.`); process.exit(fails ? 1 : 0);
