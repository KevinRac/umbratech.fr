// v17.27 · Les gardiens redessinés (cadrage G1–G18), action 4 : banc de captures de la Mère-Brume (G6).
// Usage : node capture-mere.mjs [port] [dossier de sortie] [zoom]   (serveur local sur themist/, comme les autres bancs)
// Produit : mere-planche.png (avant / après × trois temps, au repos, puis une ligne de moments : l'enfant se défait, la couronne se brise,
// l'étreinte (le ballot contre la poitrine, le bras qui s'étire en brume), la ruée, la copie (masque à ta couleur et ton emblème) pour chaque forme,
// sonnée et à nu, fondu de l'esquive), mere-t<n>-avant.png / -apres.png, mere-rm.png (mouvements réduits).
// Vérifie : aucune erreur de script, rien du combat ne change avec l'interrupteur (PV, rayon, dégâts, vitesse, temps, position), corps plein dans
// 1,15 × le rayon (rendu complet du corps, tous temps et états), couleurs loin des télégraphes (ΔE ≥ 25), coût du dessin par image (≤ 1 ms de plus).
import { createRequire } from 'node:module';
const require = createRequire('/opt/npm-tools/node_modules/');
const { chromium } = require('playwright');
const PORT = process.argv[2] || 8765, OUT = process.argv[3] || '.', ZOOM = +(process.argv[4] || 2), BASE = `http://127.0.0.1:${PORT}/index.html`;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
let fails = 0, checks = 0;
const ok = (c, m) => { checks++; if (!c) { fails++; console.error('ÉCHEC : ' + m); } else console.log('ok · ' + m); };
const BX = 640, BY = 330;   // la Mère-Brume au milieu de la salle ; toi à 250 px sous elle (elle ne bouge pas à cette distance)
const CLIP = { x: BX - 150, y: BY - 150, w: 300, h: 260 };

async function ouvrir(url, opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: ZOOM, reducedMotion: opts.rm ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 300)));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text().slice(0, 300)); });
  await page.goto(url);
  await page.waitForFunction(() => { try { const d = window.__glas.dbg(); return d.state === 'play' && d.enemies.some(e => !e.dead && e.type === 'boss'); } catch (e) { return false; } }, null, { timeout: 40000 });
  await page.addStyleTag({ content: 'body *{visibility:hidden!important} #game{visibility:visible!important}' });
  return { page, errs, ctx };
}
// vide la salle (invoqués, tirs) et remet la Mère-Brume au repos, toi en bas
const calme = page => page.evaluate(([BX, BY]) => {
  const D = window.__glas.dbg(), B = window.__brume, P = B.P, K = window.__asm.dbg().kill, b = D.enemies.find(e => e.type === 'boss' && !e.dead);
  for (const x of D.enemies) if (x !== b && !x.dead) K(x);
  D.eproj.length = 0; D.rings.length = 0; if (D.room.spawning) D.room.spawning.length = 0;
  b.state = 'idle'; b.patT = 99; b.queue = []; b.vuln = 0; b.stun = 0; b.fade = 1; b.reach = b.reachTo = 0; b.grabbing = false; b.armT = null; b.reachSide = 1;
  b.x = BX; b.y = BY; P.x = BX; P.y = BY + 250; P.iT = 99; P.grabT = 0; P.hp = P.s.maxHp; B.hideMsg();
}, [BX, BY]);
async function temps(page, t, attendre = 900) {
  await page.evaluate(t => {
    const D = window.__glas.dbg(), B = window.__brume, P = B.P, b = D.enemies.find(e => e.type === 'boss' && !e.dead);
    b.hp = b.maxHp * [1, 0.95, 0.5, 0.2][t];
    for (let i = 0; i < 150; i++) { P.iT = 99; P.hp = P.s.maxHp; B.step(1 / 60); }
  }, t);
  await calme(page); await page.waitForTimeout(attendre); await calme(page); await page.waitForTimeout(120);
}
async function capture(page, nom, clip = CLIP) {
  const box = await page.evaluate(() => { const c = document.querySelector('#game'), b = c.getBoundingClientRect(), s = Math.min(b.width / 1280, b.height / 720); return { x: b.left, y: b.top, s, ox: (b.width - 1280 * s) / 2, oy: (b.height - 720 * s) / 2 }; });
  const path = `${OUT}/${nom}.png`;
  await page.screenshot({ path, clip: { x: box.x + box.ox + clip.x * box.s, y: box.y + box.oy + clip.y * box.s, width: clip.w * box.s, height: clip.h * box.s } });
  return path;
}
const actif = (page, v) => page.evaluate(v => { window.BRUME_DATA.gardiens.dessin.actif[1] = v; }, v);
const combat = page => page.evaluate(() => { const D = window.__glas.dbg(), b = D.enemies.find(e => e.type === 'boss' && !e.dead); return { hp: b.hp, maxHp: b.maxHp, r: b.r, dmg: b.dmg, spd: b.spd, phase: b.phase, x: b.x, y: b.y, act: D.RUN.act, copy: b.copy, mk: +b.mk.toFixed(2) }; });   // mk arrondi : la brume qui se retire converge encore entre les deux lectures
const boss = (page, f, arg) => page.evaluate(([src, arg]) => { const b = window.__glas.dbg().enemies.find(e => e.type === 'boss' && !e.dead); return (0, eval)(src)(b, arg); }, [String(f), arg]);

// 1. Avant / après, trois temps (même salle, même instant de combat)
const { page, errs, ctx } = await ouvrir(`${BASE}?dernier=ray_n4&acte=1&gardien=1`);
const imgs = {};
for (const t of [1, 2, 3]) {
  await actif(page, true); await temps(page, t, 1200);
  const a = await combat(page); imgs['apres' + t] = await capture(page, `mere-t${t}-apres`);
  await actif(page, false); await page.waitForTimeout(150);
  const v = await combat(page); imgs['avant' + t] = await capture(page, `mere-t${t}-avant`);
  ok(JSON.stringify(a) === JSON.stringify(v), `temps ${t} : rien du combat ne change avec l'interrupteur (${JSON.stringify(a)})`);
  ok(a.phase === t && a.act === 1, `temps ${t} atteint, acte I (${a.phase})`);
  ok(a.r === 48, `rayon de touche inchangé (${a.r})`);
}
await actif(page, true);

// 2. Les moments (temps et état posés à la main ; la transformation est rejouée)
const moments = {};
const remet = (t) => boss(page, (b, t) => { b.hp = b.maxHp * [1, 0.95, 0.5, 0.2][t]; b.phase = t; b.g27 = null; b.mk = [1, 1, 0.8, 0.25][t]; }, t);
await temps(page, 2, 300);
await boss(page, b => { b.g27 = null; b.phase = 1; window.__gardiens.mere.etat(b); b.phase = 2; });
await page.waitForTimeout(260); await calme(page); moments.defait = await capture(page, 'mere-enfant-defait'); await page.waitForTimeout(700);
await temps(page, 3, 300);
await boss(page, b => { b.g27 = null; b.phase = 2; window.__gardiens.mere.etat(b); b.phase = 3; });
await page.waitForTimeout(280); await calme(page); moments.brise = await capture(page, 'mere-couronne-brisee'); await page.waitForTimeout(700);
// un temps ne redescend pas en combat : pour ces moments, le banc remet les PV et le temps à la main (dessin rejoué de zéro)
await remet(1); await calme(page);
await boss(page, b => { b.state = 'mgrab'; b.t = b.tt = 99; b.reachSide = 1; b.armT = { x: b.x + 150, y: b.y + 120 }; b.gx = b.x + 150; b.gy = b.y + 120; b.gr = 72; b.reach = b.reachTo = 0.85; });
await page.waitForTimeout(400); await boss(page, b => { b.reach = 0.85; });
moments.etreinte = await capture(page, 'mere-etreinte', { x: BX - 150, y: BY - 150, w: 340, h: 320 });
await calme(page);
await boss(page, b => { b.state = 'mwind'; b.t = b.tt = 99; b.ang = 0.4; });
await page.waitForTimeout(400); moments.ruee = await capture(page, 'mere-ruee');
await remet(2); await calme(page);
for (const cls of ['lum', 'gou', 'her', 'tis']) {
  await page.evaluate(c => { window.__brume.P.cls = c; }, cls);
  await boss(page, b => { b.copy = 'volee'; b.state = 'mvolley'; b.vn = 99; b.t = b.tt = 99; });
  await page.waitForTimeout(350); moments['copie_' + cls] = await capture(page, 'mere-copie-' + cls);
  await calme(page);
}
await page.evaluate(() => { window.__brume.P.cls = 'lum'; });
await page.waitForTimeout(400);
await remet(3); await calme(page); await page.waitForTimeout(400);
await boss(page, b => { b.stun = 99; b.vuln = 99; });
await page.waitForTimeout(200); moments.nu = await capture(page, 'mere-a-nu');
await calme(page); await boss(page, b => { b.fade = 0.3; b.state = 'mblink'; b.t = b.tt = 99; b.bx = b.x; b.by = b.y; });
await page.waitForTimeout(120); moments.fondu = await capture(page, 'mere-fondu');
await calme(page);

// 3. Corps plein : le corps complet rendu sur un canevas transparent (tous temps, au repos, ruée, étreinte, balayage, copie) ;
// aucun pixel opaque (alpha > 200) au-delà de 1,15 × r du centre de touche. Les prolongements (brume, traînes, filets, bras étirés) restent sous le seuil.
const plein = await boss(page, b => {
  const M = window.__gardiens.mere, r = b.r, K = 3, S = 8 * r, out = {}, keep = { ph: b.phase, st: b.state, g: b.g27, mk: b.mk, rs: b.reachSide, armT: b.armT, reach: b.reach, ang: b.ang, t: b.t, tt: b.tt, gr: b.grabbing, copy: b.copy };
  const rendu = (nom, prep) => {
    const cv = document.createElement('canvas'); cv.width = cv.height = S * K; const o = cv.getContext('2d');
    b.g27 = null; b.armT = null; b.reach = 0; b.grabbing = false; prep(); M.etat(b); b.g27.serre = b.state === 'mgrab' || b.state === 'mwind' ? 1 : 0;
    o.setTransform(K, 0, 0, K, S * K / 2, S * K / 2); o.lineCap = 'round'; o.lineJoin = 'round'; M.corps(o, b);
    const d = o.getImageData(0, 0, cv.width, cv.height).data; let m = 0;
    for (let y = 0; y < cv.height; y++) for (let x = 0; x < cv.width; x++) if (d[(y * cv.width + x) * 4 + 3] > 200) m = Math.max(m, Math.hypot(x / K - S / 2, y / K - S / 2));
    out[nom] = +(m / r).toFixed(3);
  };
  for (const t of [1, 2, 3]) rendu('t' + t, () => { b.phase = t; b.state = 'idle'; b.mk = [1, 1, 0.8, 0.25][t]; });
  rendu('ruee1', () => { b.phase = 1; b.state = 'mwind'; b.ang = 0; b.mk = 1; });
  rendu('ruee3', () => { b.phase = 3; b.state = 'mwind'; b.ang = 0; b.mk = 0.25; });
  for (const rs of [-1, 1]) rendu('etreinte' + rs, () => { b.phase = 1; b.state = 'mgrab'; b.reachSide = rs; b.armT = { x: b.x + rs * 160, y: b.y + 100 }; b.reach = 1; b.mk = 1; });
  rendu('balayage2', () => { b.phase = 2; b.state = 'msweep'; b.t = 0.3; b.tt = 0.65; b.ang = 0.8; b.mk = 0.8; b.copy = 'balayage'; });
  rendu('copie2', () => { b.phase = 2; b.state = 'mvolley'; b.mk = 0.8; b.copy = 'volee'; });
  Object.assign(b, { phase: keep.ph, state: keep.st, g27: keep.g, mk: keep.mk, reachSide: keep.rs, armT: keep.armT, reach: keep.reach, ang: keep.ang, t: keep.t, tt: keep.tt, grabbing: keep.gr, copy: keep.copy });
  return out;
});
for (const k in plein) ok(plein[k] <= 1.15, `corps plein ${k} : ${plein[k]} × r (≤ 1,15)`);

// 4. Couleurs (G3) : matière, lueur, yeux et lumière loin de chaque couleur de télégraphe et de la lavande des souvenirs (ΔE ≥ 25, CIE76 en Lab)
const D = await page.evaluate(() => { const g = window.BRUME_DATA.gardiens.dessin[1]; return { brume: g.matiere.brume, lueur: g.lueur, os: g.matiere.os, or: g.matiere.or }; });
const lab = ([R, G, B]) => { const f = v => { v /= 255; return v > 0.04045 ? ((v + 0.055) / 1.055) ** 2.4 : v / 12.92; }; const [r, g, b] = [f(R), f(G), f(B)];
  const X = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047, Y = r * 0.2126 + g * 0.7152 + b * 0.0722, Z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
  const h = t => t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116; return [116 * h(Y) - 16, 500 * (h(X) - h(Y)), 200 * (h(Y) - h(Z))]; };
const dE = (a, b) => { const A = lab(a), B = lab(b); return Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]); };
const TELE = { zone: [255, 150, 60], tirs: [205, 120, 255], saisie: [90, 220, 255], souvenirs: [180, 160, 255] };
const yeux = await page.evaluate(() => window.EYE ? null : null);
for (const [n, c] of Object.entries(D)) for (const [t, tc] of Object.entries(TELE)) { const d = dE(c, tc); ok(d >= 25, `couleur ${n} / ${t} : ΔE ${d.toFixed(1)} (≥ 25)`); }
ok(dE(D.brume, TELE.tirs) > dE([124, 112, 178], TELE.tirs), `la brume s'éloigne du violet des tirs plus que l'ancien mauve (${dE(D.brume, TELE.tirs).toFixed(1)} contre ${dE([124, 112, 178], TELE.tirs).toFixed(1)})`);

// 5. Coût du dessin par image (G14), temps 1 (le plus chargé : l'enfant, le voile) et temps 3
for (const t of [1, 3]) {
  await remet(t); await calme(page); await page.waitForTimeout(300);
  const cout = await boss(page, b => window.__gardiens.mere.mesure(b, 100));
  console.log(`coût par image, temps ${t} (ms) :`, JSON.stringify(cout));
  ok(cout.apres - cout.avant <= 1, `coût temps ${t} : +${(cout.apres - cout.avant).toFixed(3)} ms par image (≤ 1 ms)`);
}
ok(!errs.length, `aucune erreur de script (${errs.join(' | ')})`);
await ctx.close();

// 6. Mouvements réduits : temps 3, sans transformation animée, pas d'erreur
{
  const { page, errs, ctx } = await ouvrir(`${BASE}?dernier=ray_n4&acte=1&gardien=1`, { rm: true });
  await temps(page, 3, 300);
  await capture(page, 'mere-rm');
  ok(!errs.length, `mouvements réduits : aucune erreur (${errs.join(' | ')})`);
  await ctx.close();
}

// 7. La planche : avant (ancien dessin) et après, aux trois temps ; puis les moments
{
  const fs = await import('node:fs');
  const p = await (await browser.newContext({ viewport: { width: 1600, height: 1400 }, deviceScaleFactor: 1 })).newPage();
  const src = f => 'data:image/png;base64,' + fs.readFileSync(f).toString('base64');
  const titres = ['', 'Temps 1 · Observation', 'Temps 2 · Adaptation', 'Temps 3 · Désespoir'];
  const cell = (f, t, w = 330) => `<figure><img src="${src(f)}" style="width:${w}px"><figcaption>${t}</figcaption></figure>`;
  const M = [['defait', 'L’enfant se défait (2e temps, 0,26 s)'], ['brise', 'La couronne se brise (3e temps, 0,28 s)'], ['etreinte', 'L’étreinte (le bras s’étire en brume)'], ['ruee', 'La ruée (l’enfant contre elle)']];
  const M2 = [['copie_lum', 'Copie · Lanterne'], ['copie_gou', 'Copie · Gouffre'], ['copie_her', 'Copie · Héraut'], ['copie_tis', 'Copie · Tisseuse'], ['nu', 'Sonnée, à nu'], ['fondu', 'Fondu de l’esquive']];
  await p.setContent(`<html><body style="margin:0;background:#0c0a10;color:#d8cfe6;font:14px system-ui,sans-serif">
   <div id="pl" style="padding:18px 20px;display:inline-block">
   <div style="font-size:18px;margin-bottom:10px">La Mère-Brume · v17.27 · avant / après (même salle, même instant de combat)</div>
   <style>figure{margin:0 8px 0 0;display:inline-block;text-align:center}img{display:block;border:1px solid #2a2433}figcaption{margin-top:5px;color:#a99cbf}.r{display:flex;align-items:flex-end;margin-bottom:10px}.l{width:72px;font-weight:600;align-self:center}</style>
   <div class="r"><div class="l">Avant</div>${[1, 2, 3].map(t => cell(imgs['avant' + t], titres[t], 420)).join('')}</div>
   <div class="r"><div class="l">Après</div>${[1, 2, 3].map(t => cell(imgs['apres' + t], titres[t], 420)).join('')}</div>
   <div class="r"><div class="l">Moments</div>${M.map(([k, t]) => cell(moments[k], t, 300)).join('')}</div>
   <div class="r"><div class="l"></div>${M2.map(([k, t]) => cell(moments[k], t, 205)).join('')}</div></div></body></html>`);
  await p.waitForTimeout(300);
  await (await p.$('#pl')).screenshot({ path: `${OUT}/mere-planche.png` });
}
await browser.close();
console.log(`${checks} vérifications, ${fails} échec(s)`);
process.exit(fails ? 1 : 0);
