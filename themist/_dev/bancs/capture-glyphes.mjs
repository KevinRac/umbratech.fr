// v17.27 · Les gardiens redessinés (cadrage G1–G18), action 7 : glyphes des gardiens (G11).
// Usage : node capture-glyphes.mjs [port] [dossier de sortie]   (serveur local sur themist/, comme les autres bancs)
// Produit : <dossier>/glyphes-planche.png (les trois glyphes à 16, 24 et 64 px), glyphes-porte-<n>.png (la porte du gardien de chaque acte), glyphes-barre-<n>.png (sa barre de vie).
// Vérifie : chaque glyphe est du XML valide et autonome (ni identifiant, ni script, ni filtre ; 16 à 24 px), reste lisible à 16 px (couvre le disque d'une
// image de 16 × 16 et se distingue des deux autres), s'affiche à la porte du gardien (boss et raccourci direct) à la place de l'icône, sur la barre de vie
// à gauche du nom (image chargée, au moins 16 px), change avec l'acte, et que l'ancienne icône revient quand dessin.actif[n] est faux. Rien du combat ne change.
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire('/opt/npm-tools/node_modules/');
const { chromium } = require('playwright');
const PORT = process.argv[2] || 8765, OUT = process.argv[3] || '.', BASE = `http://127.0.0.1:${PORT}/index.html`;
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
let fails = 0, checks = 0;
const ok = (c, m) => { checks++; if (!c) { fails++; console.error('ÉCHEC : ' + m); } else console.log('ok · ' + m); };
const NOMS = { 1: 'La Mère-Brume', 2: 'Le Héraut Noyé', 3: 'Le Glas Originel' };

async function ouvrir(act) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 3, reducedMotion: 'no-preference' });
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 300)));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text().slice(0, 300)); });
  await page.goto(`${BASE}?dernier=ray_n4&acte=${act}&gardien=1`);
  await page.waitForFunction(() => { try { const d = window.__glas.dbg(); return d.state === 'play' && d.enemies.some(e => !e.dead && e.type === 'boss'); } catch (e) { return false; } }, null, { timeout: 40000 });
  return { page, errs, ctx };
}

// 1. Les données : XML valide, autonome, 16 à 24 px, lisible à 16 px (dans la page du jeu : le même navigateur que le HUD)
{
  const { page, errs, ctx } = await ouvrir(1);
  const R = await page.evaluate(async () => {
    const G = window.BRUME_DATA.gardiens.dessin.glyphes, out = {};
    const img = s => new Promise((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = ko; i.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s); });
    const px = async (s, n) => { const c = document.createElement('canvas'); c.width = c.height = n; const o = c.getContext('2d', { willReadFrequently: true }); o.drawImage(await img(s), 0, 0, n, n); return o.getImageData(0, 0, n, n).data; };
    const P = {};
    for (const n of [1, 2, 3]) {
      const s = G[n], doc = new DOMParser().parseFromString(s, 'image/svg+xml'), svg = doc.documentElement;
      const d = await px(s, 16); P[n] = d; let plein = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 128) plein++;
      out[n] = { xml: !doc.querySelector('parsererror') && svg.localName === 'svg' && svg.namespaceURI === 'http://www.w3.org/2000/svg', w: +svg.getAttribute('width'), h: +svg.getAttribute('height'), vb: svg.getAttribute('viewBox'),
        id: /\sid=|<script|<filter|<style|href=/i.test(s), plein: plein / 256, octets: s.length };
    }
    const dist = (a, b) => { let t = 0; for (let i = 0; i < a.length; i += 4) t += Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]) + Math.abs(a[i + 3] - b[i + 3]) * 0.5; return t / (a.length / 4) / 255; };
    out.d = { '12': dist(P[1], P[2]), '13': dist(P[1], P[3]), '23': dist(P[2], P[3]) };
    return out;
  });
  for (const n of [1, 2, 3]) { const g = R[n];
    ok(g.xml, `${NOMS[n]} : le glyphe est du XML valide (svg, espace de noms SVG)`);
    ok(!g.id, `${NOMS[n]} : autonome (ni identifiant, ni script, ni filtre, ni lien)`);
    ok(g.w >= 16 && g.w <= 24 && g.h >= 16 && g.h <= 24 && g.vb === '0 0 24 24', `${NOMS[n]} : ${g.w} × ${g.h} px, viewBox ${g.vb}`);
    ok(g.plein > 0.3 && g.plein < 0.85, `${NOMS[n]} : à 16 px, le glyphe couvre ${(g.plein * 100).toFixed(0)} % de l'image (ni tache, ni vide)`);
    ok(g.octets < 1500, `${NOMS[n]} : ${g.octets} octets`); }
  ok(R.d['12'] > 0.08 && R.d['13'] > 0.08 && R.d['23'] > 0.08, `à 16 px, les trois glyphes se distinguent (écarts moyens ${Object.values(R.d).map(v => v.toFixed(2)).join(' · ')})`);
  // planche de contrôle : 16, 24 et 64 px, fond sombre
  await page.evaluate(() => { const G = window.BRUME_DATA.gardiens.dessin.glyphes; const d = document.createElement('div'); d.id = 'planche'; d.style.cssText = 'position:fixed;left:0;top:0;z-index:99999;background:#17141b;padding:10px;display:flex;gap:14px;align-items:flex-end';
    for (const px of [16, 24, 64]) for (const n of [1, 2, 3]) { const i = document.createElement('img'); i.width = i.height = px; i.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(G[n]); d.appendChild(i); }
    document.body.appendChild(d); });
  await page.waitForTimeout(300); await page.locator('#planche').screenshot({ path: `${OUT}/glyphes-planche.png` });
  ok(errs.length === 0, `aucune erreur de script${errs.length ? ' : ' + errs.join(' | ') : ''}`);
  await ctx.close();
}

// 2. La porte et la barre de vie, acte par acte
const srcs = {};
for (const act of [1, 2, 3]) {
  const { page, errs, ctx } = await ouvrir(act);
  // la barre de vie : une image chargée, à gauche du nom, d'au moins 16 px
  await page.waitForTimeout(400);
  const hud = await page.evaluate(() => { const i = document.getElementById('hBossGlyph'), n = document.getElementById('hBossName'), b = document.getElementById('hBoss');
    const ri = i.getBoundingClientRect(), rn = n.getBoundingClientRect(); return { visible: !b.hidden && !i.hidden, complet: i.complete && i.naturalWidth > 0, src: i.src, w: ri.width, h: ri.height, gauche: ri.right <= rn.left + 1 && ri.left < rn.left, alt: i.getAttribute('alt'), nom: n.textContent }; });
  srcs[act] = hud.src;
  ok(hud.visible && hud.complet, `${NOMS[act]} : barre de vie, le glyphe est affiché et chargé`);
  ok(hud.w >= 16 && hud.h >= 16 && hud.w <= 24 && hud.h <= 24, `${NOMS[act]} : barre de vie, glyphe de ${hud.w} × ${hud.h} px`);
  ok(hud.gauche, `${NOMS[act]} : barre de vie, le glyphe est à gauche du nom (« ${hud.nom} »)`);
  ok(hud.alt === '', `${NOMS[act]} : barre de vie, image décorative (alt vide)`);
  await page.evaluate(() => { const b = document.getElementById('hBoss'); b.style.zIndex = 99999; });
  await page.locator('#hBoss .bossname').screenshot({ path: `${OUT}/glyphes-barre-${act}.png` });

  await page.addStyleTag({ content: 'body *{visibility:hidden!important} #game{visibility:visible!important}' });   // la porte, sans barre de vie ni bandeau par-dessus
  // la porte : une porte du gardien ouverte dans la salle ; on compte les images SVG posées par le canevas pendant un tour de rendu
  const porte = await page.evaluate(async type => {
    const D = window.__glas.dbg(); const room = D.room, sauve = room.doors;
    room.doors = [{ x: 640, type, open: 1 }];
    const n0 = { glyphe: 0, autres: 0 }, f0 = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage = function (im) { if (im instanceof HTMLImageElement && /^data:image\/svg/.test(im.src)) n0.glyphe++; return f0.apply(this, arguments); };
    await new Promise(r => setTimeout(r, 400));
    CanvasRenderingContext2D.prototype.drawImage = f0;
    return { n: n0.glyphe, sauve: sauve.length };
  }, 'boss');
  ok(porte.n > 0, `${NOMS[act]} : la porte du gardien pose son glyphe (${porte.n} dessins en 0,4 s)`);
  const box = await page.evaluate(() => { const c = document.querySelector('#game'), b = c.getBoundingClientRect(), s = Math.min(b.width / 1280, b.height / 720); return { x: b.left + (b.width - 1280 * s) / 2, y: b.top + (b.height - 720 * s) / 2, s, y0: 92 }; });   // y0 : le haut de l'arène (AR.y0, index.html)
  await page.screenshot({ path: `${OUT}/glyphes-porte-${act}.png`, clip: { x: box.x + (640 - 70) * box.s, y: box.y, width: 140 * box.s, height: (box.y0 + 60) * box.s } });
  // raccourci direct vers le gardien : même glyphe
  const direct = await page.evaluate(async () => { const D = window.__glas.dbg(); D.room.doors = [{ x: 640, type: 'direct', open: 1 }]; let n = 0; const f0 = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage = function (im) { if (im instanceof HTMLImageElement && /^data:image\/svg/.test(im.src)) n++; return f0.apply(this, arguments); }; await new Promise(r => setTimeout(r, 300)); CanvasRenderingContext2D.prototype.drawImage = f0; return n; });
  ok(direct > 0, `${NOMS[act]} : le raccourci direct au gardien pose aussi son glyphe`);
  // une porte ordinaire garde son icône
  const combat = await page.evaluate(async () => { const D = window.__glas.dbg(); D.room.doors = [{ x: 640, type: 'combat', open: 1 }]; let n = 0; const f0 = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage = function (im) { if (im instanceof HTMLImageElement && /^data:image\/svg/.test(im.src)) n++; return f0.apply(this, arguments); }; await new Promise(r => setTimeout(r, 300)); CanvasRenderingContext2D.prototype.drawImage = f0; return n; });
  ok(combat === 0, `${NOMS[act]} : une porte de combat n'a pas de glyphe de gardien`);
  // éteint : l'ancienne icône revient (barre de vie masquée, plus de glyphe à la porte)
  const eteint = await page.evaluate(async act => { const D = window.__glas.dbg(); window.BRUME_DATA.gardiens.dessin.actif[act] = false; D.room.doors = [{ x: 640, type: 'boss', open: 1 }]; let n = 0; const f0 = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage = function (im) { if (im instanceof HTMLImageElement && /^data:image\/svg/.test(im.src)) n++; return f0.apply(this, arguments); }; await new Promise(r => setTimeout(r, 400)); CanvasRenderingContext2D.prototype.drawImage = f0;
    const h = document.getElementById('hBossGlyph').hidden; window.BRUME_DATA.gardiens.dessin.actif[act] = true; return { n, h }; }, act);
  ok(eteint.n === 0 && eteint.h, `${NOMS[act]} : dessin.actif faux, l'ancienne icône revient (glyphe de porte : ${eteint.n}, image de la barre masquée : ${eteint.h})`);
  ok(errs.length === 0, `${NOMS[act]} : aucune erreur de script${errs.length ? ' : ' + errs.join(' | ') : ''}`);
  await ctx.close();
}
ok(new Set(Object.values(srcs)).size === 3, 'la barre de vie montre un glyphe différent à chaque acte');
await browser.close();
console.log(`\n${checks - fails}/${checks} vérifications passées`);
process.exit(fails ? 1 : 0);
