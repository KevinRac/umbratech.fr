// v17.27 · Les gardiens redessinés (cadrage G1–G18), actions 1 et 2 : banc de captures du Glas Originel.
// Usage : node capture-gardiens.mjs [port] [dossier de sortie] [zoom]   (serveur local sur themist/, comme les autres bancs)
// Produit : glas-planche.png (avant / après × trois temps, au repos), glas-t<n>-avant.png / -apres.png, glas-chute.png (plaques en vol, 2 → 3),
// glas-teleporte.png (après une téléportation : les artères suivent, les plaques restent au sol), glas-reflet.png (le Reflet sort par la fente),
// glas-rm.png (mouvements réduits). Vérifie : aucune erreur de script, rien du combat ne change avec l'interrupteur (PV, rayon, dégâts),
// corps plein (images du cache) dans 1,15 × le rayon, coût du dessin par image (G14 : ≤ 1 ms de plus).
import { createRequire } from 'node:module';
const require = createRequire('/opt/npm-tools/node_modules/');
const { chromium } = require('playwright');
const PORT = process.argv[2] || 8765, OUT = process.argv[3] || '.', ZOOM = +(process.argv[4] || 2), BASE = `http://127.0.0.1:${PORT}/index.html`;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
let fails = 0, checks = 0;
const ok = (c, m) => { checks++; if (!c) { fails++; console.error('ÉCHEC : ' + m); } else console.log('ok · ' + m); };
const CLIP = { x: 640 - 230, y: 0, w: 460, h: 430 };   // en unités du monde : le Glas (640, 272), ses artères jusqu'au haut, ses plaques au sol

async function ouvrir(url, opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: ZOOM, reducedMotion: opts.rm ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 300)));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text().slice(0, 300)); });   // polices et musique absentes du serveur local : sans importance
  await page.goto(url);
  await page.waitForFunction(() => { try { const d = window.__glas.dbg(); return d.state === 'play' && d.enemies.some(e => !e.dead && e.type === 'boss'); } catch (e) { return false; } }, null, { timeout: 40000 });
  // rien que le canevas (ni HUD, ni messages)
  await page.addStyleTag({ content: 'body *{visibility:hidden!important} #game{visibility:visible!important}' });
  return { page, errs, ctx };
}
// met le Glas dans le temps demandé, au repos (ni attaque ni battement), sans invoqués ni tirs, toi en bas de salle (le jeu continue de tourner)
async function temps(page, t, attendre = 900) {
  await page.evaluate(t => {
    const D = window.__glas.dbg(), B = window.__brume, P = B.P, K = window.__asm.dbg().kill;
    const b = D.enemies.find(e => e.type === 'boss' && !e.dead);
    b.hp = b.maxHp * [1, 0.95, 0.5, 0.2][t];
    for (let i = 0; i < 150; i++) { P.iT = 99; P.hp = P.s.maxHp; B.step(1 / 60); }
    for (const x of D.enemies) if (x !== b && !x.dead) K(x);
    D.eproj.length = 0; D.rings.length = 0; if (D.room.glas) D.room.glas.reflet = null;
    b.state = 'idle'; b.patT = 99; b.beatT = 99; b.queue = []; b.beams = null; b.vuln = 0; b.rawT = 0; b.fade = 1; D.room.drainT = 0;
    P.x = 640; P.y = 610; B.hideMsg();
  }, t);
  await page.waitForTimeout(attendre);
}
async function capture(page, nom) {
  const box = await page.evaluate(() => { const c = document.querySelector('#game'), b = c.getBoundingClientRect(); return { x: b.left, y: b.top, s: Math.min(b.width / 1280, b.height / 720), ox: (b.width - 1280 * Math.min(b.width / 1280, b.height / 720)) / 2, oy: (b.height - 720 * Math.min(b.width / 1280, b.height / 720)) / 2 }; });
  const path = `${OUT}/${nom}.png`;
  await page.screenshot({ path, clip: { x: box.x + box.ox + CLIP.x * box.s, y: box.y + box.oy + CLIP.y * box.s, width: CLIP.w * box.s, height: CLIP.h * box.s } });
  return path;
}
const actif = (page, v) => page.evaluate(v => { window.BRUME_DATA.gardiens.dessin.actif[3] = v; }, v);
const combat = page => page.evaluate(() => { const b = window.__glas.dbg().enemies.find(e => e.type === 'boss' && !e.dead); return { hp: b.hp, maxHp: b.maxHp, r: b.r, dmg: b.dmg, spd: b.spd, phase: b.phase, hx: b.hx, hy: b.hy }; });

// 1. Planche avant / après, trois temps
const { page, errs, ctx } = await ouvrir(`${BASE}?dernier=ray_n4&acte=3&gardien=1`);
const imgs = {};
for (const t of [1, 2, 3]) {
  await actif(page, true); await temps(page, t);
  if (t === 3) {   // plaques en vol : on rejoue la chute du troisième temps
    await page.evaluate(() => { const b = window.__glas.dbg().enemies.find(e => e.type === 'boss' && !e.dead); b.g27 = null; b.phase = 2; window.__gardiens.glas.etat(b); b.phase = 3; });
    await page.waitForTimeout(260); await capture(page, 'glas-chute'); await page.waitForTimeout(700);
    await temps(page, 3, 300);   // de nouveau au repos (le changement de temps relance ses attaques)
  }
  const a = await combat(page); imgs['apres' + t] = await capture(page, `glas-t${t}-apres`);
  await actif(page, false); await page.waitForTimeout(150);
  const v = await combat(page); imgs['avant' + t] = await capture(page, `glas-t${t}-avant`);
  ok(JSON.stringify(a) === JSON.stringify(v), `temps ${t} : rien du combat ne change avec l'interrupteur (${JSON.stringify(a)})`);
  ok(a.phase === t, `temps ${t} atteint (${a.phase})`);
  ok(a.r === 62, `rayon de touche inchangé (${a.r})`);
}
await actif(page, true);

// 2. Corps plein : dans les images du cache (bronze de chaque temps, cœur au plus gros battement du temps 3), aucun pixel opaque au-delà de 1,15 × r
const plein = await page.evaluate(() => {
  const G = window.__gardiens.glas, r = 62, out = {};
  const loin = (I, sc) => { const o = I.cv.getContext('2d'), d = o.getImageData(0, 0, I.cv.width, I.cv.height).data; let m = 0;
    for (let y = 0; y < I.cv.height; y++) for (let x = 0; x < I.cv.width; x++) if (d[(y * I.cv.width + x) * 4 + 3] > 200) { const wx = I.x0 + x / I.k, wy = I.y0 + y / I.k; m = Math.max(m, Math.hypot(wx * sc, (wy + 0.05 * r) * sc - 0.05 * r)); }
    return +(m / r).toFixed(3); };
  for (const t of [1, 2, 3]) out['t' + t] = loin(G.imgTemps(t, r), 1);
  out.coeur3 = loin(G.imgCoeur(r), 1.06 * 1.045); out.dos = loin(G.imgDos(r), 1);
  return out;
});
for (const k in plein) ok(plein[k] <= 1.15, `corps plein ${k} : ${plein[k]} × r (≤ 1,15)`);

// 3. Coût du dessin par image (G14), temps 3, sur un canevas caché à la taille de l'écran
const cout = await page.evaluate(() => { const b = window.__glas.dbg().enemies.find(e => e.type === 'boss' && !e.dead); return window.__gardiens.glas.mesure(b, 100); });
console.log('coût par image (ms) :', JSON.stringify(cout));
ok(cout.apres - cout.avant <= 1, `coût : +${(cout.apres - cout.avant).toFixed(3)} ms par image (≤ 1 ms)`);

// 4. Téléportation (copie de ton esquive) : il se déplace, les artères suivent, les plaques tombées restent où elles sont
await page.evaluate(() => { const b = window.__glas.dbg().enemies.find(e => e.type === 'boss' && !e.dead); b.x = b.hx = 760; b.y = b.hy = 300; });
await page.waitForTimeout(200); await capture(page, 'glas-teleporte');
await page.evaluate(() => { const b = window.__glas.dbg().enemies.find(e => e.type === 'boss' && !e.dead); b.x = b.hx = 640; b.y = b.hy = 272; });
// fondu de l'esquive : rien ne jette d'erreur, tout s'efface ensemble
await page.evaluate(() => { const b = window.__glas.dbg().enemies.find(e => e.type === 'boss' && !e.dead); b.fade = 0.3; });
await page.waitForTimeout(120); await capture(page, 'glas-fondu');
await page.evaluate(() => { const b = window.__glas.dbg().enemies.find(e => e.type === 'boss' && !e.dead); b.fade = 1; b.vuln = 2; });
await page.waitForTimeout(120); await capture(page, 'glas-a-nu');
ok(!errs.length, `aucune erreur de script (${errs.join(' | ')})`);
await ctx.close();

// 5. Le Reflet sort par la fente (temps 2, essai ?glas=)
{
  const { page, errs, ctx } = await ouvrir(`${BASE}?glas=onde&temps=2&classe=lum&dieu=1`);
  const vu = await page.evaluate(() => { const D = window.__glas.dbg(), B = window.__brume, P = B.P;
    for (let i = 0; i < 60 * 40; i++) { P.iT = 99; B.step(1 / 60); const G = D.room.glas; if (G && G.reflet && D.RUN.time - G.reflet.nait > 0.2) { B.hideMsg(); return true; } }
    return false; });
  ok(vu, 'le Reflet est né pendant l\'essai');
  if (vu) { await page.waitForTimeout(80); await capture(page, 'glas-reflet'); }
  ok(!errs.length, `Reflet : aucune erreur (${errs.join(' | ')})`);
  await ctx.close();
}
// 6. Mouvements réduits : temps 3, rien ne vole, pas d'erreur
{
  const { page, errs, ctx } = await ouvrir(`${BASE}?dernier=ray_n4&acte=3&gardien=1`, { rm: true });
  await temps(page, 3, 300);
  const v = await page.evaluate(() => { const b = window.__glas.dbg().enemies.find(e => e.type === 'boss' && !e.dead); return { vole: b.g27 ? b.g27.vole.length : -1, sol: b.g27 ? b.g27.sol.length : -1 }; });
  ok(v.vole === 0 && v.sol === 7, `mouvements réduits : aucune plaque en vol, 7 au sol (${JSON.stringify(v)})`);
  await capture(page, 'glas-rm');
  ok(!errs.length, `mouvements réduits : aucune erreur (${errs.join(' | ')})`);
  await ctx.close();
}

// 7. La planche : avant (ancien dessin) et après, aux trois temps
{
  const fs = await import('node:fs');
  const p = await (await browser.newContext({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 1 })).newPage();
  const src = k => 'data:image/png;base64,' + fs.readFileSync(imgs[k]).toString('base64');
  const titres = ['', 'Temps 1 · Il bat pour toi', 'Temps 2', 'Temps 3 · La Brume se retire'];
  const cell = (k, t) => `<figure><img src="${src(k)}"><figcaption>${t}</figcaption></figure>`;
  await p.setContent(`<html><body style="margin:0;background:#0c0a10;color:#d8cfe6;font:14px system-ui,sans-serif">
   <div id="pl" style="padding:18px 20px;display:inline-block">
   <div style="font-size:18px;margin-bottom:10px">Le Glas Originel · v17.27 · avant / après (même salle, même battement, même instant de combat)</div>
   <style>figure{margin:0 8px 0 0;display:inline-block;text-align:center}img{width:400px;display:block;border:1px solid #2a2433}figcaption{margin-top:5px;color:#a99cbf}.r{display:flex;align-items:center;margin-bottom:10px}.l{width:64px;font-weight:600}</style>
   <div class="r"><div class="l">Avant</div>${[1, 2, 3].map(t => cell('avant' + t, titres[t])).join('')}</div>
   <div class="r"><div class="l">Après</div>${[1, 2, 3].map(t => cell('apres' + t, titres[t])).join('')}</div></div></body></html>`);
  await p.waitForTimeout(300);
  await (await p.$('#pl')).screenshot({ path: `${OUT}/glas-planche.png` });
}
await browser.close();
console.log(`${checks} vérifications, ${fails} échec(s)`);
process.exit(fails ? 1 : 0);
