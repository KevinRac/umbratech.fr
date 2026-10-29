// Banc Chromium : action 4 du Dernier Souvenir (touche X, HUD de la braise, embrasement, aide). Usage : node banc-touche.mjs <port>
import { createRequire } from 'node:module';
const require = createRequire('/opt/npm-tools/node_modules/');
const { chromium } = require('playwright');
const PORT = process.argv[2] || 8765;
let fails = 0, checks = 0;
const ok = (c, m) => { checks++; if (!c) { fails++; console.error('ÉCHEC : ' + m); } };
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', args: ['--autoplay-policy=no-user-gesture-required'] });
async function scene(opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: opts.rm ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });
  await page.goto(`http://127.0.0.1:${PORT}/index.html?masque=fan_n2&classe=${opts.cls || 'lum'}&acte=2`);
  await page.waitForFunction(() => { try { const d = window.__asm.dbg(); return d.RUN && !d.RUN.hub && d.state === 'play' && d.enemies.some(e => !e.dead); } catch (e) { return false; } }, null, { timeout: 25000 });
  await page.waitForTimeout(500);
  return { page, errs, ctx };
}
const choisir = (page) => page.evaluate(() => {
  const B = window.__brume, X = window.__dernier, SV = window.BRUME_DATA.souvenirs, N = window.BRUME_DATA.talents.noeuds, BRs = window.BRUME_DATA.talents.branches, cls = B.P.cls;
  for (const F of Object.values(SV.familles)) { const id = (F.t || []).find(k => BRs[k.split('_')[0]].cls === cls && N[k].k !== 'c'); if (id) { X.prendre(id); if (!X.refus(id)) { return id; } } }
  return null;
});
const etat = (page) => page.evaluate(() => { const X = window.__dernier, M = window.__memoire.M; return { brules: M.brules.length, braise: X.braises(), tient: X.tient.on, t: X.tient.t, designe: X.designe(), actifs: M.actifs.length }; });
const toastTxt = (page) => page.evaluate(() => (document.querySelector('#toast') || {}).textContent || '');

// ── 1. dernier.actif faux : rien ne se passe, rien n'est visible
{
  const { page, errs, ctx } = await scene();
  const id = await choisir(page);
  ok(!!id, 'un talent brûlable existe');
  await page.keyboard.down('KeyX'); await page.waitForTimeout(600); await page.keyboard.up('KeyX');
  const e = await etat(page);
  ok(e.brules === 0 && !e.tient, 'inactif : X ne brûle rien');
  ok(await page.evaluate(() => !document.querySelector('#hBraise') || document.querySelector('#hBraise').hidden), 'inactif : aucune braise au HUD');
  ok(await page.evaluate(() => !window.__dsAide()), 'inactif : pas de ligne d\'aide');
  ok(errs.length === 0, 'inactif : aucune erreur ' + errs.join('|'));
  await ctx.close();
}

// ── 2. actif : le geste complet
{
  const { page, errs, ctx } = await scene();
  await page.evaluate(() => { window.__dernier.activer(); window.__asm.dbg().P.iT = 999; });
  const id = await choisir(page);
  await page.evaluate(() => window.__memoire.M && 0);
  // sans désignation : refus avec message, rien ne brûle
  await page.evaluate(() => { document.querySelector('#toast') ; });
  await page.keyboard.down('KeyX'); await page.waitForTimeout(150);
  let e = await etat(page);
  ok(!e.tient && e.brules === 0, 'sans désignation : pas de maintien');
  ok(await page.evaluate(() => document.querySelector('#hBraise').classList.contains('palpite')), 'sans désignation : la braise palpite');
  ok(!/désign|brûl|braise/i.test(await toastTxt(page)), 'sans désignation : aucun texte (« ' + await toastTxt(page) + ' »)');
  await page.keyboard.up('KeyX'); await page.waitForTimeout(1300);
  // la braise est visible, allumée
  await page.evaluate(i => { window.__dernier.designer(i); }, id);
  await page.waitForTimeout(100);
  const h = await page.evaluate(() => { const h = document.querySelector('#hBraise'); return h && { hid: h.hidden, cls: h.className, svg: !!h.querySelector('svg'), kbd: (h.querySelector('kbd') || {}).textContent, title: h.title }; });
  ok(h && !h.hid && /pret/.test(h.cls) && h.svg && h.kbd === 'X', 'braise au HUD prête avec son icône et X : ' + JSON.stringify(h));
  ok(await page.evaluate(() => !!document.querySelector('#hMem .mt.ds')), 'la tuile désignée est marquée au HUD');
  ok(await page.evaluate(() => /maintenir : brûler/.test(document.querySelector('#hHint').textContent)), 'la ligne d\'aide du bas apparaît');
  // un maintien trop court
  await page.keyboard.down('KeyX'); await page.waitForTimeout(150);
  e = await etat(page);
  ok(e.tient && e.t > 0 && e.t < 0.35, 'maintien en cours (t=' + e.t.toFixed(2) + ')');
  const jauge = await page.evaluate(() => parseFloat(document.querySelector('#hBraise').style.getPropertyValue('--h')));
  ok(jauge > 0 && jauge < 1, 'la jauge se remplit (' + jauge + ')');
  await page.keyboard.up('KeyX'); await page.waitForTimeout(100);
  e = await etat(page);
  ok(!e.tient && e.brules === 0 && e.braise === 1, 'lâcher annule : rien de brûlé, braise intacte ' + JSON.stringify(e));
  ok(await page.evaluate(() => parseFloat(document.querySelector('#hBraise').style.getPropertyValue('--h')) === 0), 'la jauge retombe à 0');
  // capture : maintien ralenti à 4 s pour avoir le temps de photographier
  await page.evaluate(() => { window.__dernier.DS.maintienS = 4; });
  await page.keyboard.down('KeyX'); await page.waitForTimeout(1400);
  await page.screenshot({ path: 'touche-maintien.png' });
  await page.keyboard.up('KeyX'); await page.evaluate(() => { window.__dernier.DS.maintienS = 0.35; });
  ok((await etat(page)).brules === 0, 'maintien ralenti puis lâché : rien de brûlé');
  // le maintien complet
  await page.keyboard.down('KeyX'); await page.waitForTimeout(700);
  const fx = await page.evaluate(() => ({ box: document.querySelectorAll('.oubli.brulefx').length, em: document.querySelectorAll('.brulefx .of-e').length }));
  e = await etat(page);
  ok(e.brules === 1 && e.braise === 0 && !e.tient, 'maintien complet : brûlé, braise consumée');
  ok(e.designe === null, 'la désignation est levée');
  ok(fx.box === 1 && fx.em > 0, 'la tuile s\'embrase (braises ' + fx.em + ')');
  await page.keyboard.up('KeyX');
  ok(await page.evaluate(() => /vide/.test(document.querySelector('#hBraise').className)), 'la braise s\'éteint au HUD');
  await page.waitForTimeout(1700);
  ok(await page.evaluate(() => document.querySelectorAll('.oubli.brulefx').length === 0), 'l\'effet visuel disparaît de lui-même');
  // une seconde fois : braise consumée
  const id2 = await choisir(page);
  await page.evaluate(i => { window.__dernier.designer(i); }, id2);
  await page.keyboard.down('KeyX'); await page.waitForTimeout(500);
  e = await etat(page);
  ok(e.brules === 1 && !e.tient, 'braise consumée : pas de seconde brûlure');
  ok(await page.evaluate(() => document.querySelector('#hBraise').classList.contains('palpite') && document.querySelector('#hBraise').classList.contains('vide')), 'braise consumée : elle palpite, éteinte');
  await page.keyboard.up('KeyX');
  ok(errs.length === 0, 'geste complet : aucune erreur ' + errs.join('|'));
  await ctx.close();
}

// ── 3. hors combat, pause, mort : le maintien tombe
{
  const { page, errs, ctx } = await scene();
  await page.evaluate(() => { window.__dernier.activer(); window.__asm.dbg().P.iT = 999; });
  const id = await choisir(page);
  await page.evaluate(i => window.__dernier.designer(i), id);
  // pause en plein maintien
  await page.keyboard.down('KeyX'); await page.waitForTimeout(120);
  ok((await etat(page)).tient, 'maintien lancé');
  await page.keyboard.press('Escape'); await page.waitForTimeout(200);
  ok(!(await etat(page)).tient, 'la pause coupe le maintien');
  ok((await etat(page)).brules === 0, 'la pause ne brûle rien');
  await page.keyboard.up('KeyX');
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  // salle purifiée : plus de combat
  await page.evaluate(() => { const B = window.__brume; for (const e of B.enemies) e.dead = true; });
  await page.waitForTimeout(100);
  await page.keyboard.down('KeyX'); await page.waitForTimeout(500); await page.keyboard.up('KeyX');
  const e = await etat(page);
  ok(e.brules === 0 && !e.tient, 'hors combat : rien ne brûle');
  ok(errs.length === 0, 'hors combat : aucune erreur ' + errs.join('|'));
  await ctx.close();
}

// ── 4. refus d'une compétence à effet en cours, mouvements réduits, un autre acte
{
  const { page, errs, ctx } = await scene({ rm: true });
  await page.evaluate(() => { window.__dernier.activer(); window.__asm.dbg().P.iT = 999; });
  const id = await choisir(page);
  await page.evaluate(i => window.__dernier.designer(i), id);
  await page.keyboard.down('KeyX'); await page.waitForTimeout(600);
  const fx = await page.evaluate(() => ({ em: document.querySelectorAll('.brulefx .of-e').length, box: document.querySelectorAll('.oubli.brulefx').length }));
  ok((await etat(page)).brules === 1, 'mouvements réduits : brûle quand même');
  ok(fx.em === 0, 'mouvements réduits : pas de braises volantes (' + fx.em + ')');
  await page.keyboard.up('KeyX');
  ok(errs.length === 0, 'mouvements réduits : aucune erreur ' + errs.join('|'));
  await ctx.close();
}

// ── 5. l'aide : écran titre et guide
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(`http://127.0.0.1:${PORT}/index.html`);
  await page.waitForTimeout(1500);
  ok(await page.evaluate(() => !/Brûler le souvenir/.test(document.body.innerText)), 'écran titre : pas d\'aide tant que c\'est inactif');
  ok(errs.length === 0, 'écran titre : aucune erreur ' + errs.join('|'));
  await ctx.close();
}
await browser.close();
console.log(`${checks} vérifications, ${fails} échec(s)`);
process.exit(fails ? 1 : 0);
