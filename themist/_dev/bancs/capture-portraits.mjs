// v17.27 · Les gardiens redessinés (cadrage G1–G18), action 7 : portraits du wiki (G11).
// Usage : node capture-portraits.mjs [port] [dossier de sortie] [largeur en px, 480 par défaut] [planche.png]   (serveur local sur themist/, comme les autres bancs)
// Produit : <dossier>/gardien-<n>-t<temps>-v<dessin.version>.webp (LARG × LARG·1,25 px), 3 gardiens × 3 temps (par défaut themist/img/gardiens/) ; un 5e argument (chemin d'un PNG)
// écrit en plus une planche de contrôle des neuf portraits.
// Chaque portrait est le gardien tel que le jeu le dessine (fonctions d'aperçu hors salle, __gardiens.<gardien>.apercu : corps puis lueurs), au temps
// voulu, au repos, sur un fond sombre, dans le même cadre (prolongements compris : cordes du Héraut, artères du Glas). Rien du combat n'est lu ni changé.
// Vérifie : aucune erreur de script, chaque portrait existe et n'est pas vide, les trois temps d'un gardien se distinguent, rayon de touche inchangé.
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire('/opt/npm-tools/node_modules/');
const { chromium } = require('playwright');
const HERE = dirname(fileURLToPath(import.meta.url));
const PORT = process.argv[2] || 8765, OUT = process.argv[3] || join(HERE, '..', '..', 'img', 'gardiens'), LARG = +(process.argv[4] || 480), PLANCHE = process.argv[5] || '';
const BASE = `http://127.0.0.1:${PORT}/index.html`;
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
let fails = 0, checks = 0;
const ok = (c, m) => { checks++; if (!c) { fails++; console.error('ÉCHEC : ' + m); } else console.log('ok · ' + m); };
// le cadre de chaque gardien, en unités du monde (toujours 4:5, donc des portraits de même taille) : centre de touche à (w/2, cy) ; au-dessus, la place de ce qui
// monte (cordes du Héraut, artères du Glas), coupé en haut comme dans la salle
const ACTES = { 1: { cle: 'mere', nom: 'La Mère-Brume', r: 48, w: 190, cy: 135 }, 2: { cle: 'heraut', nom: 'Le Héraut Noyé', r: 48, w: 200, cy: 170 }, 3: { cle: 'glas', nom: 'Le Glas Originel', r: 62, w: 240, cy: 200 } };

async function ouvrir(act) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1, reducedMotion: 'no-preference' });
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 300)));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text().slice(0, 300)); });
  await page.goto(`${BASE}?dernier=ray_n4&acte=${act}&gardien=1`);
  await page.waitForFunction(() => { try { const d = window.__glas.dbg(); return d.state === 'play' && d.enemies.some(e => !e.dead && e.type === 'boss'); } catch (e) { return false; } }, null, { timeout: 40000 });
  return { page, errs, ctx };
}
// vide la salle et remet le gardien au repos, toi en bas (le dessin seul nous intéresse : aucun PV ni attaque n'est lu)
const calme = page => page.evaluate(() => {
  const D = window.__glas.dbg(), B = window.__brume, P = B.P, K = window.__asm.dbg().kill, b = D.enemies.find(e => e.type === 'boss' && !e.dead);
  for (const x of D.enemies) if (x !== b && !x.dead) K(x);
  D.eproj.length = 0; D.rings.length = 0; if (window.__glasHZ) window.__glasHZ().length = 0; if (D.room.spawning) D.room.spawning.length = 0; if (D.room.glas) D.room.glas.reflet = null;
  b.state = 'idle'; b.patT = 99; b.beatT = 99; b.queue = []; b.beams = null; b.vuln = 0; b.rawT = 0; b.stun = 0; b.fade = 1; b.reach = b.reachTo = 0; b.grabbing = false; b.armT = null; D.room.drainT = 0;
  P.x = 640; P.y = 620; P.iT = 99; P.grabT = 0; P.hp = P.s.maxHp; B.hideMsg(); P.cls = 'lum';
});
async function temps(page, t) {
  await page.evaluate(t => { const D = window.__glas.dbg(), B = window.__brume, P = B.P, b = D.enemies.find(e => e.type === 'boss' && !e.dead);
    b.hp = b.maxHp * [1, 0.95, 0.5, 0.2][t]; for (let i = 0; i < 150; i++) { P.iT = 99; P.hp = P.s.maxHp; B.step(1 / 60); } }, t);
  await calme(page); await page.waitForTimeout(1100); await calme(page); await page.waitForTimeout(150);
}
// peint un portrait dans un canevas hors écran : fond, gardien (corps puis lueurs, comme le jeu), puis renvoie le PNG et ses octets de couleur
const portrait = (page, cle, LARG, w, cy) => page.evaluate(([cle, LARG, w, cy]) => {
  const zoom = LARG / w, W = w, H = w * 1.25, CX = w / 2, CY = cy;
  const G = window.__gardiens, e = window.__glas.dbg().enemies.find(x => x.type === 'boss' && !x.dead);
  const cv = document.createElement('canvas'); cv.width = W * zoom; cv.height = H * zoom; const o = cv.getContext('2d', { willReadFrequently: true });
  o.fillStyle = '#17141b'; o.fillRect(0, 0, cv.width, cv.height);
  const fond = o.createRadialGradient(CX * zoom, (CY - 10) * zoom, 6 * zoom, CX * zoom, (CY - 10) * zoom, W * 0.85 * zoom); fond.addColorStop(0, 'rgba(96,84,112,.42)'); fond.addColorStop(1, 'rgba(23,20,27,0)');
  o.fillStyle = fond; o.fillRect(0, 0, cv.width, cv.height);
  o.save(); o.scale(zoom, zoom); o.translate(CX, CY); o.lineCap = 'round'; o.lineJoin = 'round';
  // l'aperçu hors salle dessine autour de l'origine = le centre de touche (les lueurs se recalent seules sur ses coordonnées du monde)
  G[cle].apercu(o, e); o.restore();
  const d = o.getImageData(0, 0, cv.width, cv.height).data; let vif = 0; for (let i = 0; i < d.length; i += 4) if (Math.abs(d[i] - 23) + Math.abs(d[i + 1] - 20) + Math.abs(d[i + 2] - 27) > 60) vif++;
  return { png: cv.toDataURL('image/webp', 0.9), vif: vif / (d.length / 4), r: e.r, phase: e.phase, w: cv.width, h: cv.height };
}, [cle, LARG, w, cy]);

const feuille = [];
for (const act of [1, 2, 3]) {
  const { cle, nom, r, w: cw, cy } = ACTES[act];
  const { page, errs, ctx } = await ouvrir(act);
  const version = await page.evaluate(() => window.BRUME_DATA.gardiens.dessin.version);
  const portraits = [];
  for (const t of [1, 2, 3]) {
    await temps(page, t);
    const p = await portrait(page, cle, LARG, cw, cy);
    const f = join(OUT, `gardien-${act}-t${t}-v${version}.webp`);
    writeFileSync(f, Buffer.from(p.png.split(',')[1], 'base64'));
    portraits.push(p);
    ok(p.phase === t, `${nom} : temps ${t} atteint (${p.phase})`);
    ok(p.r === r, `${nom} : rayon de touche inchangé (${p.r})`);
    ok(statSync(f).size > 4000 && statSync(f).size < 150000, `${nom} : portrait écrit, ${statSync(f).size} octets (${p.w} × ${p.h})`);
    ok(p.vif > 0.04 && p.vif < 0.6, `${nom} : temps ${t}, le gardien occupe ${(p.vif * 100).toFixed(1)} % du cadre (ni vide ni débordant)`);
  }
  // les trois temps doivent se distinguer à l'œil : l'image change réellement d'un temps au suivant
  const diff = (a, b) => page.evaluate(async ([a, b]) => { const im = async u => { const i = new Image(); i.src = u; await i.decode(); const c = document.createElement('canvas'); c.width = i.width; c.height = i.height; const o = c.getContext('2d'); o.drawImage(i, 0, 0); return o.getImageData(0, 0, c.width, c.height).data; };
    const A = await im(a), B = await im(b); let n = 0; for (let i = 0; i < A.length; i += 4) if (Math.abs(A[i] - B[i]) + Math.abs(A[i + 1] - B[i + 1]) + Math.abs(A[i + 2] - B[i + 2]) > 60) n++; return n / (A.length / 4); }, [a, b]);
  const d12 = await diff(portraits[0].png, portraits[1].png), d23 = await diff(portraits[1].png, portraits[2].png), d13 = await diff(portraits[0].png, portraits[2].png);
  ok(d12 > 0.01 && d23 > 0.01 && d13 > 0.02, `${nom} : les trois temps se distinguent (${(d12 * 100).toFixed(1)} % · ${(d23 * 100).toFixed(1)} % · ${(d13 * 100).toFixed(1)} % des pixels)`);
  ok(errs.length === 0, `${nom} : aucune erreur de script${errs.length ? ' : ' + errs.join(' | ') : ''}`);
  feuille.push(portraits.map(p => p.png));
  await ctx.close();
}
// planche de contrôle (facultative) : les neuf portraits côte à côte
if (PLANCHE) {
  const { page, ctx } = await (async () => { const c = await browser.newContext({ viewport: { width: 800, height: 600 } }); return { page: await c.newPage(), ctx: c }; })();
  const url = await page.evaluate(async ([feuille, L]) => { const W = L, H = L * 1.25, c = document.createElement('canvas'); c.width = 3 * W; c.height = 3 * H; const o = c.getContext('2d');
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) { const im = new Image(); im.src = feuille[i][j]; await im.decode(); o.drawImage(im, j * W, i * H); }
    return c.toDataURL('image/png'); }, [feuille, LARG]);
  writeFileSync(PLANCHE, Buffer.from(url.split(',')[1], 'base64')); console.log('planche : ' + PLANCHE); await ctx.close();
}
await browser.close();
console.log(`\n${checks - fails}/${checks} vérifications passées`);
process.exit(fails ? 1 : 0);
