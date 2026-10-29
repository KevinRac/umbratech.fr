// Banc Chromium, action 8 : les correctifs issus de la relecture du Dernier Souvenir. Usage : node banc-relecture.mjs [port]
import { createRequire } from 'node:module';
const require = createRequire('/opt/npm-tools/node_modules/');
const { chromium } = require('playwright');
const PORT = process.argv[2] || 8765, BASE = `http://127.0.0.1:${PORT}/index.html`;
let fails = 0, checks = 0;
const ok = (c, m) => { checks++; if (!c) { fails++; console.error('ÉCHEC : ' + m); } };
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
async function ouvre(qs, attente) {
  const page = await browser.newPage(); const errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 300)));
  await page.goto(`${BASE}?${qs}`);
  await page.waitForFunction(attente, null, { timeout: 30000 });
  await page.waitForTimeout(300);
  return { page, errs };
}
const avecMasque = () => { try { const d = window.__asm.dbg(); return d.state === 'play' && d.enemies.some(e => !e.dead && e.asm); } catch (e) { return false; } };
const avecVague = () => { try { return window.__dernier.essaiEtat().on && window.__asm.dbg().enemies.some(e => !e.dead); } catch (e) { return false; } };

// 1. Fureur contre un Masqué : en 5 s, la cadence en plus et les dégâts en plus ne dépassent pas le plafond
{
  const { page, errs } = await ouvre('dernier=dif_n4&masque=1&classe=gou&acte=2', avecMasque);
  const r = await page.evaluate(() => {
    const B = window.__brume, X = window.__dernier, P = B.P; P.iT = 99; B.step(1 / 60, 270);   // fin du montage
    const M = B.enemies.find(e => !e.dead && e.asm); M.hp = M.maxHp * 0.6;
    const ref = B.hit(M, 10, { crit: false }); M.hp = M.maxHp * 0.6;
    X.prendre('dif_k2', 1, 2); const rec = X.bruler('dif_k2', { libre: true });
    const plaf = X.plafondDe(M, rec.force), v = rec.vf.vitesse || 0, N = 150, n = Math.round(N * (1 + v));
    let tot = 0; for (let i = 0; i < n; i++) { M.hp = M.maxHp * 0.6; tot += B.hit(M, 10, { crit: false }); }
    return { force: rec.force, v, plaf: Math.round(plaf), surplus: Math.round(tot - N * ref), boost: Math.round(rec.boost), dmg: rec.vf.dmg };
  });
  ok(r.v > 0, 'Fureur : la cadence est bien accélérée contre un fort (' + r.v + ')');
  ok(r.surplus <= r.plaf + 2, `Fureur : surplus des coups en plus et plus forts ${r.surplus} ≤ plafond ${r.plaf}`);
  ok(r.boost <= r.plaf + 1, `Fureur : surplus compté ${r.boost} ≤ ${r.plaf}`);
  ok(!errs.length, 'Fureur : erreurs ' + errs.join('|'));
  console.log('fureur', JSON.stringify(r));
  await page.close();
}
// 2. Rempart puis changement de salle : il s'use quand même ; 3. Carillon brûlé : ses cloches s'éteignent ; 4. Fureur puis mort / hub : rien ne traîne
{
  const { page, errs } = await ouvre('dernier=car_n4&classe=her&acte=2', avecVague);
  const r = await page.evaluate(() => {
    const B = window.__brume, X = window.__dernier, D = window.__glas.dbg(), P = B.P, o = {};
    // cloches posées, puis Carillon brûlé
    P.aCd = 0; window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyQ' }));
    for (let i = 0; i < 3; i++) { P.aCd = 0; window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyQ' })); }
    o.cloches0 = X.cloches();
    const rc = X.bruler('car_n4', { libre: true }); o.refusCar = rc.refus || '';
    o.cloches1 = X.cloches();
    // rempart
    X.prendre('cad_x3b', 1, 2); P.shield = 0; const rg = X.bruler('cad_x3b', { libre: true }); o.bouclier0 = Math.round(P.shield);
    D.entrer('combat'); B.step(1 / 60, 60); o.bouclier1 = Math.round(P.shield); o.effets1 = X.effets().join();
    B.step(1 / 60, 60 * 9); o.bouclier2 = Math.round(P.shield); o.effets2 = X.effets().join();
    // fureur puis hub
    X.prendre('req_k2', 1, 0); X.bruler('req_k2', { libre: true }); o.effets3 = X.effets().join(); o.cad0 = X.cadence();
    D.RUN.hub = true; B.step(1 / 60, 2); o.effets4 = X.effets().join(); D.RUN.hub = false;
    return o;
  });
  console.log('salle', JSON.stringify(r));
  ok(r.cloches0 > 0, `cloches posées (${r.cloches0})`); ok(r.cloches1 === 0, `Carillon brûlé : cloches ${r.cloches0} → ${r.cloches1}`);
  ok(r.bouclier0 > 0 && r.bouclier1 > 0 && /garde/.test(r.effets1), `rempart gardé au changement de salle ${r.bouclier0} → ${r.bouclier1} (${r.effets1})`);
  ok(r.bouclier2 === 0 && !/garde/.test(r.effets2), `rempart usé ensuite (${r.bouclier2}, ${r.effets2})`);
  ok(/fureur/.test(r.effets3) && r.effets4 === '', `Fureur éteinte au hub (${r.effets3} → « ${r.effets4} »)`);
  ok(!errs.length, 'salle : erreurs ' + errs.join('|'));
  await page.close();
}
// 5. Un talent brûlé ne revient pas par la console
{
  const { page, errs } = await ouvre('dernier=ray_n4&classe=lum&acte=2', avecVague);
  const r = await page.evaluate(() => { const X = window.__dernier; X.bruler('ray_n4', { libre: true }); return X.prendre('ray_n4'); });
  ok(r === false, 'prendre() refuse un talent brûlé');
  ok(!errs.length, 'console : erreurs ' + errs.join('|'));
  await page.close();
}
await browser.close();
console.log(`${checks} vérifications, ${fails} échec(s)`);
process.exit(fails ? 1 : 0);
