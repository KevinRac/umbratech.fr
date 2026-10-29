// Banc Chromium, action 8 : correctifs de la relecture du Glas (v17.22). Usage : node banc-glas-relecture.mjs [port]
import { createRequire } from 'node:module';
const require = createRequire('/opt/npm-tools/node_modules/');
const { chromium } = require('playwright');
const PORT = process.argv[2] || 8765;
let fails = 0, checks = 0;
const ok = (c, m) => { checks++; if (!c) { fails++; console.error('ÉCHEC : ' + m); } };
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
for (const [temps, cls] of [[2, 'lum'], [3, 'tis'], [3, 'gou']]) {
  const page = await browser.newPage(); const errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 300)));
  await page.goto(`http://127.0.0.1:${PORT}/index.html?glas=onde,sol,projectile&temps=${temps}&classe=${cls}&bot=1`);
  await page.waitForFunction(() => { try { const d = window.__glas.dbg(); return d.state === 'play' && d.enemies.some(e => !e.dead && e.type === 'boss'); } catch (e) { return false; } }, null, { timeout: 30000 });
  // 40 s de combat en accéléré (pas de 1/60 s), avec le Temps Suspendu lancé au milieu d'un geste pour le Tisse-Destin
  const r = await page.evaluate(() => {
    const B = window.__brume, D = window.__glas.dbg(), E = window.__glas.essai, P = B.P;
    let stopVu = 0, refletBouge = 0, cutWarnBulle = 0;
    for (let i = 0; i < 40 * 60; i++) {
      const G = D.room.glas, rf = G && G.reflet, b = D.enemies.find(e => e.type === 'boss' && !e.dead);
      if (P.cls === 'tis' && G && G.bulle && rf && !(P.stopT > 0) && !stopVu) { P.stopT = 2; stopVu = 1; }
      const x0 = rf && rf.x, y0 = rf && rf.y;
      B.step(1 / 60, 1);
      if (P.stopT > 0 && rf && D.room.glas && D.room.glas.reflet === rf && (rf.x !== x0 || rf.y !== y0)) refletBouge++;
      if (G && G.bulle && b && b.cutWarn > 0 && b.adapt && P.cls !== 'tis') cutWarnBulle++;
      P.hp = P.s.maxHp;
    }
    return { sup: E.sup, imagesZone: E.imagesZone, stopVu, refletBouge, cutWarnBulle, supJ: (E.supJ || []).slice(0, 3) };
  });
  console.log(temps, cls, JSON.stringify(r));
  ok(r.imagesZone > 0, `temps ${temps} ${cls} : des gestes ont été joués`);
  ok(r.sup === 0, `temps ${temps} ${cls} : aucune zone du Glas pendant une zone du Reflet (${r.sup}) ${JSON.stringify(r.supJ)}`);
  if (cls === 'tis') ok(r.stopVu && r.refletBouge === 0, `Temps Suspendu : le Reflet reste figé (${r.refletBouge} images)`);
  ok(r.cutWarnBulle === 0, `aucun signal « à nu » pendant la bulle (${r.cutWarnBulle})`);
  // une nouvelle descente efface l'essai
  const r2 = await page.evaluate(() => { const D = window.__glas.dbg(); D.lancer('lum'); window.__brume.step(1 / 60, 2); return window.__glas.essai; });
  ok(r2 === null || r2 === undefined, 'nouvelle descente : l\'essai du Glas est oublié');
  ok(!errs.length, `temps ${temps} ${cls} : erreurs ${errs.join('|')}`);
  await page.close();
}
await browser.close();
console.log(`${checks} vérifications, ${fails} échec(s)`);
process.exit(fails ? 1 : 0);
