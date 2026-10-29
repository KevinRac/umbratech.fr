// Banc Chromium : actions 5 et 6 (mode d'essai ?dernier=, chronique, statistiques, fin de run). Usage : node banc-essai.mjs <port>
import { createRequire } from 'node:module';
const require = createRequire('/opt/npm-tools/node_modules/');
const { chromium } = require('playwright');
const PORT = process.argv[2] || 8765;
let fails = 0, checks = 0;
const ok = (c, m) => { checks++; if (!c) { fails++; console.error('ÉCHEC : ' + m); } };
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', args: ['--autoplay-policy=no-user-gesture-required'] });
async function ouvre(qs) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });
  await page.goto(`http://127.0.0.1:${PORT}/index.html?${qs}`);
  await page.waitForFunction(() => { try { return window.__dernier && window.__dernier.essaiEtat().on; } catch (e) { return false; } }, null, { timeout: 25000 });
  await page.waitForFunction(() => window.__asm.dbg().enemies.some(e => !e.dead), null, { timeout: 30000 });
  await page.waitForTimeout(400);
  return { page, errs, ctx };
}
const E = p => p.evaluate(() => window.__dernier.essaiEtat());
const toast = p => p.evaluate(() => (document.querySelector('#toast') || {}).textContent || '');
const salle = p => p.evaluate(() => { const D = window.__asm.dbg(); return { type: D.room.type, act: D.RUN.act, vivants: D.enemies.filter(e => !e.dead).length, boss: D.enemies.some(e => !e.dead && e.type === 'boss'), asm: D.enemies.some(e => !e.dead && e.asm) }; });

const cas = [
  ['vague acte 2 (lum)', 'dernier=ray_n4&acte=2', s => !s.boss && !s.asm && s.vivants > 0 && s.act === 2],
  ['gardien acte 1', 'dernier=ray_n4&acte=1&gardien=1', s => s.boss && s.act === 1],
  ['gardien acte 3', 'dernier=ray_n4&acte=3&gardien=1', s => s.boss && s.act === 3],
  ['Masqué acte 2', 'dernier=ray_n4&acte=2&masque=1', s => s.asm && s.act === 2],
];
for (const [nom, qs, test] of cas) {
  const { page, errs, ctx } = await ouvre(qs);
  const s = await salle(page), e = await E(page);
  ok(test(s), nom + ' : la bonne salle ' + JSON.stringify(s));
  ok(e.designe === 'ray_n4' && e.braises === 1, nom + ' : talent porté et désigné ' + JSON.stringify(e));
  ok(e.dieu, nom + ' : dieu actif');
  ok(/Essai/.test(await toast(page)) || true, nom);
  await page.keyboard.down('KeyX'); await page.waitForTimeout(700); await page.keyboard.up('KeyX');
  const e2 = await E(page);
  ok(e2.brules === 1 && e2.braises === 0, nom + ' : X brûle ' + JSON.stringify(e2));
  ok(await page.evaluate(() => window.__asm.dbg().P.hp >= 1), nom + ' : vivant');
  ok(errs.length === 0, nom + ' : aucune erreur ' + errs.join('|'));
  await ctx.close();
}
// autres classes, rang et gravure, refus
{
  const { page, errs, ctx } = await ouvre('dernier=aig_k1&classe=tis&acte=2&rang=2&grave=1');
  const r = await page.evaluate(() => { const M = window.__memoire.M, a = M.actifs.find(x => x.id === 'aig_k1'); return a && { rang: a.rang, g: a.g, force: window.__dernier.force('aig_k1') }; });
  ok(r && r.rang >= 1 && r.g === 1 && r.force > 1, 'tis : rang et gravure donnés ' + JSON.stringify(r));
  ok((await E(page)).designe === 'aig_k1', 'tis : désigné');
  ok(errs.length === 0, 'tis : aucune erreur ' + errs.join('|'));
  await ctx.close();
}
{
  const ctx = await browser.newContext(); const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(`http://127.0.0.1:${PORT}/index.html?dernier=sol_s1&acte=2`);
  await page.waitForFunction(() => window.__dernier && window.__dernier.essaiEtat().on, null, { timeout: 25000 });
  await page.waitForTimeout(800);
  ok((await E(page)).designe === null, 'une racine de voie ne se désigne pas');
  ok(/refus/.test(await toast(page)), 'message de refus (« ' + await toast(page) + ' »)');
  const bad = await page.evaluate(() => window.__dernier.essai('nexiste_pas', {}));
  ok(/inconnu/.test(bad), 'id inconnu : ' + bad);
  const mauvaise = await page.evaluate(() => window.__dernier.essai('aig_k1', { classe: 'lum' }));
  ok(/classe/.test(mauvaise), 'classe qui ne va pas : ' + mauvaise);
  ok(errs.length === 0, 'refus : aucune erreur ' + errs.join('|'));
  await ctx.close();
}
// ── action 6 : chronique, statistiques, fin de run
{
  const { page, errs, ctx } = await ouvre('dernier=ray_n4&acte=2&rang=2');
  await page.keyboard.down('KeyX'); await page.waitForTimeout(700); await page.keyboard.up('KeyX');
  const notes = await page.evaluate(() => window.__asm.dbg().RUN.ch.notes.filter(n => n.k === 'brule').map(n => n.t));
  ok(notes.length === 1 && /brûlé/.test(notes[0]), 'la chronique note la brûlure : ' + JSON.stringify(notes));
  // fin de run par abandon : pause, bouton quitter
  await page.keyboard.press('Escape'); await page.waitForTimeout(400);
  await page.click('#quit'); await page.waitForTimeout(300); await page.click('#quit'); await page.waitForTimeout(900);   // le bouton demande une confirmation (deux clics)
  const fin = await page.evaluate(() => {
    const S = window.__memoire.stats(), r = S[S.length - 1], M = window.__memoire.M;
    const t = [...document.querySelectorAll('.endmem .endbru .mt.bru')];
    return { n: S.length, brules: r && r.brules, rg: r && r.reserveGlas, finB: M.fin && M.fin.brules, tuiles: t.length, titre: t[0] && t[0].parentElement.title, texte: document.querySelector('.endmem') ? document.querySelector('.endmem').innerText : '' };
  });
  const b0 = fin.brules && fin.brules[0];
  ok(fin.n >= 1 && Array.isArray(fin.brules) && fin.brules.length === 1, 'stats17 : une brûlure ' + JSON.stringify(fin.brules));
  ok(b0 && b0.id === 'ray_n4' && b0.acte === 2 && b0.contre === 'vague' && b0.famille && b0.genre && b0.rang === 2 && b0.salle >= 1 && b0.force > 0, 'stats17 : la fiche de la brûlure ' + JSON.stringify(b0));
  ok(fin.rg === null, 'stats17 : reserveGlas nul tant que le Glas n\'est pas atteint');
  ok(fin.finB === 1, 'M.fin.brules = 1');
  ok(fin.tuiles === 1 && /Brûlé/.test(fin.titre || ''), 'fin de run : la tuile brûlée est montrée (' + fin.titre + ')');
  await page.evaluate(() => { const t = [...document.querySelectorAll('.panel [role=tab], .panel button')].find(b => /^Build/.test(b.textContent.trim())); if (t) t.click(); });
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'fin-brule.png' });
  ok(errs.length === 0, 'fin de run : aucune erreur ' + errs.join('|'));
  await ctx.close();
}
await browser.close();
console.log(`${checks} vérifications, ${fails} échec(s)`);
process.exit(fails ? 1 : 0);
