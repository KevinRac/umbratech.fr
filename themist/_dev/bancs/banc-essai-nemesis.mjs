// Banc Chromium, némésis (v17.25), action 6 : le mode d'essai ?nemesis= (fiche en mémoire, rien d'écrit, reprise à sa mort). Usage : node banc-essai-nemesis.mjs [port]
import { createRequire } from 'node:module';
const require = createRequire('/opt/npm-tools/node_modules/');
const { chromium } = require('playwright');
const PORT = process.argv[2] || 8765, BASE = `http://127.0.0.1:${PORT}/index.html`;
let fails = 0, checks = 0; const ok = (c, m) => { checks++; if (!c) { fails++; console.error('ÉCHEC : ' + m); } };
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
async function ouvre(qs) { const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }); const errs = []; page.on('pageerror', e => errs.push(String(e).slice(0, 300)));
  await page.goto(BASE + (qs ? '?' + qs : '')); await page.waitForFunction(() => !!(window.__brume && window.__nemesis && window.__asm), null, { timeout: 30000 }); return { page, errs }; }
const cas = async (nom, qs, fn) => { const { page, errs } = await ouvre(qs); try { await fn(page); } catch (e) { ok(false, nom + ' : ' + e.message); } ok(!errs.length, nom + ' : erreurs ' + errs.join(' | ')); await page.close(); };
const lire = p => p.evaluate(() => { const g = window.__glas.dbg(), R = g.room.asm, e = R && R.e; return { nem: R && R.nem, pts: R && R.nemPoints, mont: !!(e && e.asm.mont), pv: e && e.maxHp, nb: !!(e && e.asm.trou), save: window.__nemesis.essaiEtat(), essai: g.RUN.essai }; });

// E1. par l'URL : une némésis à 3 points, montage compris, rien d'écrit dans SAVE
await cas('E1', 'nemesis=ray_n1&points=3&acte=2', async page => {
  await page.waitForTimeout(1800);
  const r = await lire(page); console.log('E1', JSON.stringify(r));
  ok(r.nem && r.pts === 3, 'E1 : la némésis est dans la salle, 3 points'); ok(r.essai === 1, 'E1 : descente d’essai');
  ok(r.save.on && r.save.fiche && r.save.fiche.points === 3 && r.save.fiche.sv && r.save.fiche.sv.id === 'ray_n1', 'E1 : fiche en mémoire, souvenir ray_n1');
  ok(!r.save.sauve, 'E1 : SAVE.nemesis vide');
  const k = await page.evaluate(() => { const B = window.__brume, g = () => window.__glas.dbg(); for (let i = 0; i < 1800; i++) { g().P.iT = 99; B.step(1 / 60); const e = g().room.asm.e; if (e && !e.asm.mont) break; }
    const e = g().room.asm.e; return { fin: !e.asm.mont, trou: !!e.asm.trou, n: e.asm.nem && e.asm.nem.points }; });
  ok(k.fin && k.n === 3, 'E1 : montage fini, 3 points portés (' + JSON.stringify(k) + ')');
  // sa mort : la reprise, la fiche reste en mémoire, SAVE intact
  await page.evaluate(() => { const g = window.__glas.dbg(), d = window.__asm.dbg(); for (const x of g.enemies) if (!x.dead && x !== g.room.asm.e) d.kill(x); g.room.waves = []; d.kill(g.room.asm.e); for (let i = 0; i < 400; i++) { g.P.iT = 99; window.__brume.step(1 / 60); } });
  await page.waitForTimeout(900);
  const a = await page.evaluate(() => ({ b: window.__nemesis.essaiEtat(), rep: /Le laisser/.test(document.body.innerText) || !!document.querySelector('#mrps'), nb: window.__glas.dbg().RUN.nemBrisees }));
  console.log('E1 mort', JSON.stringify(a));
  ok(a.b.brisee, 'E1 : brisée'); ok(!a.b.sauve, 'E1 : toujours rien dans SAVE'); ok(a.rep, 'E1 : l’écran de reprise s’ouvre');
});
// E2. corps demandé, points 0 → 1, talent sans arme → refus clair, talent inconnu
await cas('E2', '', async page => {
  const r = await page.evaluate(() => ({ a: window.__nemesis.essai('ray_n1', { corps: 'voile', points: 0, acte: 3 }), f: window.__nemesis.essaiEtat().fiche, b: window.__nemesis.essai('nimporte'), c: window.__nemesis.essai('ray_n1', { corps: 'zzz' }) }));
  console.log('E2', JSON.stringify({ a: r.a, b: r.b, c: r.c, corps: r.f && r.f.corps, pts: r.f && r.f.points }));
  ok(r.f && r.f.corps === 'voile' && r.f.points === 1, 'E2 : corps voile, points 0 → 1'); ok(/inconnu/.test(r.b), 'E2 : talent inconnu'); ok(/aucun assemblage/.test(r.c), 'E2 : corps inconnu');
});
// E3. ?demo= : l'essai ne démarre pas ; hors essai, rien ne change
await cas('E3', 'nemesis=ray_n1&demo=1', async page => { await page.waitForTimeout(1500); const r = await lire(page); ok(!r.save.on, 'E3 : pas d’essai en démo'); });
console.log(`${checks} vérifications, ${fails} échec(s).`); await browser.close(); process.exit(fails ? 1 : 0);
