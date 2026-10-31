// v17.27 · Les gardiens redessinés (cadrage G1–G18), action 3 : banc de captures du Héraut Noyé (G7).
// Usage : node capture-heraut.mjs [port] [dossier de sortie] [zoom]   (serveur local sur themist/, comme les autres bancs)
// Produit : heraut-planche.png (avant / après × trois temps, au repos, puis une ligne de moments : la corde casse, la cloche se fend, il chante,
// il te copie, sonné et à nu, fondu de l'esquive), heraut-t<n>-avant.png / -apres.png, heraut-rm.png (mouvements réduits).
// Vérifie : aucune erreur de script, rien du combat ne change avec l'interrupteur (PV, rayon, dégâts, vitesse, temps, yeux), corps plein dans
// 1,15 × le rayon (rendu complet du corps, tous temps et états), couleurs loin des télégraphes (ΔE ≥ 25), coût du dessin par image (≤ 1 ms de plus).
import { createRequire } from 'node:module';
const require = createRequire('/opt/npm-tools/node_modules/');
const { chromium } = require('playwright');
const PORT = process.argv[2] || 8765, OUT = process.argv[3] || '.', ZOOM = +(process.argv[4] || 2), BASE = `http://127.0.0.1:${PORT}/index.html`;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
let fails = 0, checks = 0;
const ok = (c, m) => { checks++; if (!c) { fails++; console.error('ÉCHEC : ' + m); } else console.log('ok · ' + m); };
const BX = 640, BY = 330;   // le Héraut, au repos au milieu de la salle ; toi à 250 px sous lui (il ne bouge pas à cette distance)
const CLIP = { x: BX - 190, y: 0, w: 380, h: 430 };   // ses cordes jusqu'au haut, sa flaque

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
// vide la salle (invoqués, tirs, anneaux, marées, cloches) et remet le Héraut au repos, toi en bas
const calme = page => page.evaluate(([BX, BY]) => {
  const D = window.__glas.dbg(), B = window.__brume, P = B.P, K = window.__asm.dbg().kill, b = D.enemies.find(e => e.type === 'boss' && !e.dead);
  for (const x of D.enemies) if (x !== b && !x.dead) K(x);
  D.eproj.length = 0; D.rings.length = 0; if (window.__glasHZ) window.__glasHZ().length = 0; if (D.room.spawning) D.room.spawning.length = 0;
  b.state = 'idle'; b.patT = 99; b.queue = []; b.vuln = 0; b.stun = 0; b.fade = 1; b.x = BX; b.y = BY; P.x = BX; P.y = BY + 250; P.iT = 99; P.hp = P.s.maxHp; B.hideMsg();
}, [BX, BY]);
async function temps(page, t, attendre = 900) {
  await page.evaluate(t => {
    const D = window.__glas.dbg(), B = window.__brume, P = B.P, b = D.enemies.find(e => e.type === 'boss' && !e.dead);
    b.hp = b.maxHp * [1, 0.95, 0.5, 0.2][t];
    for (let i = 0; i < 150; i++) { P.iT = 99; P.hp = P.s.maxHp; B.step(1 / 60); }
  }, t);
  await calme(page); await page.waitForTimeout(attendre); await calme(page); await page.waitForTimeout(120);
}
async function capture(page, nom) {
  const box = await page.evaluate(() => { const c = document.querySelector('#game'), b = c.getBoundingClientRect(), s = Math.min(b.width / 1280, b.height / 720); return { x: b.left, y: b.top, s, ox: (b.width - 1280 * s) / 2, oy: (b.height - 720 * s) / 2 }; });
  const path = `${OUT}/${nom}.png`;
  await page.screenshot({ path, clip: { x: box.x + box.ox + CLIP.x * box.s, y: box.y + box.oy + CLIP.y * box.s, width: CLIP.w * box.s, height: CLIP.h * box.s } });
  return path;
}
const actif = (page, v) => page.evaluate(v => { window.BRUME_DATA.gardiens.dessin.actif[2] = v; }, v);
const combat = page => page.evaluate(() => { const D = window.__glas.dbg(), b = D.enemies.find(e => e.type === 'boss' && !e.dead); return { hp: b.hp, maxHp: b.maxHp, r: b.r, dmg: b.dmg, spd: b.spd, phase: b.phase, x: b.x, y: b.y, act: D.RUN.act }; });
const boss = (page, f, arg) => page.evaluate(([src, arg]) => { const b = window.__glas.dbg().enemies.find(e => e.type === 'boss' && !e.dead); return (0, eval)(src)(b, arg); }, [String(f), arg]);

// 1. Avant / après, trois temps (même salle, même instant de combat)
const { page, errs, ctx } = await ouvrir(`${BASE}?dernier=ray_n4&acte=2&gardien=1`);
const imgs = {};
for (const t of [1, 2, 3]) {
  await actif(page, true); await temps(page, t);
  const a = await combat(page); imgs['apres' + t] = await capture(page, `heraut-t${t}-apres`);
  await actif(page, false); await page.waitForTimeout(150);
  const v = await combat(page); imgs['avant' + t] = await capture(page, `heraut-t${t}-avant`);
  ok(JSON.stringify(a) === JSON.stringify(v), `temps ${t} : rien du combat ne change avec l'interrupteur (${JSON.stringify(a)})`);
  ok(a.phase === t && a.act === 2, `temps ${t} atteint, acte II (${a.phase})`);
  ok(a.r === 48, `rayon de touche inchangé (${a.r})`);
}
await actif(page, true);

// 3. Les moments (temps et état posés à la main ; la transformation est rejouée)
const moments = {};
await temps(page, 2, 300);
await boss(page, b => { b.g27 = null; b.phase = 1; window.__gardiens.heraut.etat(b); b.phase = 2; });
await page.waitForTimeout(230); await calme(page); moments.casse = await capture(page, 'heraut-corde-casse'); await page.waitForTimeout(700);
await temps(page, 3, 300);
await boss(page, b => { b.g27 = null; b.phase = 2; window.__gardiens.heraut.etat(b); b.phase = 3; });
await page.waitForTimeout(260); await calme(page); moments.fente = await capture(page, 'heraut-fente'); await page.waitForTimeout(700);
// un temps ne redescend pas en combat : pour ces deux moments, le banc remet les PV et le temps à la main (dessin rejoué de zéro)
const remet = (t) => boss(page, (b, t) => { b.hp = b.maxHp * [1, 0.95, 0.5, 0.2][t]; b.phase = t; b.g27 = null; }, t);
await temps(page, 3, 300); await remet(1); await calme(page);
await boss(page, b => { b.state = 'chant'; b.chantN = 99; b.t = 99; });
await page.waitForTimeout(160); moments.chant = await capture(page, 'heraut-chant');
await remet(2); await calme(page);
await boss(page, b => { b.copy = b.copy || 'volee'; b.state = 'mvolley'; b.vn = 99; b.t = b.tt = 99; });
await page.waitForTimeout(160); moments.copie = await capture(page, 'heraut-copie');
await temps(page, 3, 300);
await boss(page, b => { b.stun = 99; b.vuln = 99; });
await page.waitForTimeout(200); moments.nu = await capture(page, 'heraut-a-nu');
await calme(page); await boss(page, b => { b.fade = 0.3; b.state = 'mblink'; b.t = b.tt = 99; b.bx = b.x; b.by = b.y; });
await page.waitForTimeout(120); moments.fondu = await capture(page, 'heraut-fondu');
await calme(page);

// 4. Corps plein : le corps complet rendu sur un canevas transparent (tous temps, au repos, en chant, penché, sonné, cloche ouverte) ;
// aucun pixel opaque (alpha > 200) au-delà de 1,15 × r du centre de touche. Les prolongements (cordes, flaque, gouttes, brume) restent sous le seuil.
const plein = await boss(page, b => {
  const H = window.__gardiens.heraut, r = b.r, K = 3, S = 6 * r, out = {}, keep = { ph: b.phase, st: b.state, g: b.g27, stun: b.stun, y: b.y };
  const rendu = (nom, prep) => {
    const cv = document.createElement('canvas'); cv.width = cv.height = S * K; const o = cv.getContext('2d');
    b.g27 = null; prep(); H.etat(b);
    o.setTransform(K, 0, 0, K, S * K / 2, S * K / 2); o.lineCap = 'round'; o.lineJoin = 'round'; H.corps(o, b);
    const d = o.getImageData(0, 0, cv.width, cv.height).data; let m = 0;
    for (let y = 0; y < cv.height; y++) for (let x = 0; x < cv.width; x++) if (d[(y * cv.width + x) * 4 + 3] > 200) m = Math.max(m, Math.hypot(x / K - S / 2, y / K - S / 2));
    out[nom] = +(m / r).toFixed(3);
  };
  b.y = 3 * r;   // les cordes montent jusqu'au bord du canevas
  for (const t of [1, 2, 3]) rendu('t' + t, () => { b.phase = t; b.state = 'idle'; b.stun = 0; });
  rendu('chant1', () => { b.phase = 1; b.state = 'chant'; });
  rendu('sonne3', () => { b.phase = 3; b.state = 'idle'; b.stun = 2; });
  b.phase = keep.ph; b.state = keep.st; b.g27 = keep.g; b.stun = keep.stun; b.y = keep.y;
  return out;
});
// le rendu penché se refait avec l'inclinaison posée avant le dessin
const penche = await boss(page, b => { const ang0 = b.ang;
  const H = window.__gardiens.heraut, r = b.r, K = 3, S = 6 * r, keep = { g: b.g27, y: b.y, st: b.state };
  const cv = document.createElement('canvas'); cv.width = cv.height = S * K; const o = cv.getContext('2d');
  b.y = 3 * r; b.g27 = null; H.etat(b); b.g27.lean = 0.1; b.g27.tl = null; b.state = 'charge'; b.ang = 0;   // la ruée penche au plus de 0,1 rad (cos(ang) = 1)
  o.setTransform(K, 0, 0, K, S * K / 2, S * K / 2); H.corps(o, b);
  const d = o.getImageData(0, 0, cv.width, cv.height).data; let m = 0;
  for (let y = 0; y < cv.height; y++) for (let x = 0; x < cv.width; x++) if (d[(y * cv.width + x) * 4 + 3] > 200) m = Math.max(m, Math.hypot(x / K - S / 2, y / K - S / 2));
  b.g27 = keep.g; b.y = keep.y; b.state = keep.st; b.ang = ang0; return +(m / r).toFixed(3);
});
plein.charge = penche;
for (const k in plein) ok(plein[k] <= 1.15, `corps plein ${k} : ${plein[k]} × r (≤ 1,15)`);

// 5. Couleurs (G3) : la lueur (lampe), l'eau et les reflets loin de chaque couleur de télégraphe (ΔE ≥ 25, CIE76 en Lab)
const D = await page.evaluate(() => { const g = window.BRUME_DATA.gardiens.dessin[2]; return { lueur: g.lueur, eau: g.matiere.eau, reflets: g.reflets }; });
const lab = ([R, G, B]) => { const f = v => { v /= 255; return v > 0.04045 ? ((v + 0.055) / 1.055) ** 2.4 : v / 12.92; }; const [r, g, b] = [f(R), f(G), f(B)];
  const X = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047, Y = r * 0.2126 + g * 0.7152 + b * 0.0722, Z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
  const h = t => t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116; return [116 * h(Y) - 16, 500 * (h(X) - h(Y)), 200 * (h(Y) - h(Z))]; };
const dE = (a, b) => { const A = lab(a), B = lab(b); return Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]); };
const TELE = { zone: [255, 150, 60], tirs: [205, 120, 255], saisie: [90, 220, 255], souvenirs: [180, 160, 255] };
for (const [n, c] of Object.entries(D)) for (const [t, tc] of Object.entries(TELE)) { const d = dE(c, tc); ok(d >= 25, `couleur ${n} / ${t} : ΔE ${d.toFixed(1)} (≥ 25)`); }
ok(dE(D.eau, TELE.saisie) > dE([90, 220, 210], TELE.saisie), `l'eau s'éloigne du cyan de saisie plus que l'ancien sarcelle (${dE(D.eau, TELE.saisie).toFixed(1)} contre ${dE([90, 220, 210], TELE.saisie).toFixed(1)})`);

// 6. Coût du dessin par image (G14), temps 3
await temps(page, 3, 300);
const cout = await boss(page, b => window.__gardiens.heraut.mesure(b, 100));
console.log('coût par image (ms) :', JSON.stringify(cout));
ok(cout.apres - cout.avant <= 1, `coût : +${(cout.apres - cout.avant).toFixed(3)} ms par image (≤ 1 ms)`);
ok(!errs.length, `aucune erreur de script (${errs.join(' | ')})`);
await ctx.close();

// 7. Mouvements réduits : temps 3, la corde et la cloche sans transformation, pas d'erreur
{
  const { page, errs, ctx } = await ouvrir(`${BASE}?dernier=ray_n4&acte=2&gardien=1`, { rm: true });
  await temps(page, 3, 300);
  await capture(page, 'heraut-rm');
  ok(!errs.length, `mouvements réduits : aucune erreur (${errs.join(' | ')})`);
  await ctx.close();
}

// 8. La planche : avant (ancien dessin) et après, aux trois temps ; puis les moments
{
  const fs = await import('node:fs');
  const p = await (await browser.newContext({ viewport: { width: 1500, height: 1200 }, deviceScaleFactor: 1 })).newPage();
  const src = f => 'data:image/png;base64,' + fs.readFileSync(f).toString('base64');
  const titres = ['', 'Temps 1 · Il t’écoute', 'Temps 2 · une corde casse', 'Temps 3 · La cloche se fend'];
  const cell = (f, t, w = 330) => `<figure><img src="${src(f)}" style="width:${w}px"><figcaption>${t}</figcaption></figure>`;
  const M = [['casse', 'La corde casse (2e temps, 0,23 s)'], ['fente', 'La cloche s’ouvre (3e temps, 0,26 s)'], ['chant', 'Il chante (la cloche vibre)'], ['copie', 'Il te copie (battant à ta couleur)'], ['nu', 'Sonné, à nu (anneau ivoire)'], ['fondu', 'Fondu de l’esquive']];
  await p.setContent(`<html><body style="margin:0;background:#0c0a10;color:#d8cfe6;font:14px system-ui,sans-serif">
   <div id="pl" style="padding:18px 20px;display:inline-block">
   <div style="font-size:18px;margin-bottom:10px">Le Héraut Noyé · v17.27 · avant / après (même salle, même instant de combat)</div>
   <style>figure{margin:0 8px 0 0;display:inline-block;text-align:center}img{display:block;border:1px solid #2a2433}figcaption{margin-top:5px;color:#a99cbf}.r{display:flex;align-items:center;margin-bottom:10px}.l{width:72px;font-weight:600}</style>
   <div class="r"><div class="l">Avant</div>${[1, 2, 3].map(t => cell(imgs['avant' + t], titres[t])).join('')}</div>
   <div class="r"><div class="l">Après</div>${[1, 2, 3].map(t => cell(imgs['apres' + t], titres[t])).join('')}</div>
   <div class="r"><div class="l">Moments</div>${M.map(([k, t]) => cell(moments[k], t, 200)).join('')}</div></div></body></html>`);
  await p.waitForTimeout(300);
  await (await p.$('#pl')).screenshot({ path: `${OUT}/heraut-planche.png` });
}
await browser.close();
console.log(`${checks} vérifications, ${fails} échec(s)`);
process.exit(fails ? 1 : 0);
