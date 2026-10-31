// v17.27 · Les gardiens redessinés (cadrage G1–G18), action 6 : entrées (G9), morts (G10), mouvements réduits (G14).
// Usage : node capture-scene.mjs [port] [dossier de sortie]   (serveur local sur themist/, comme les autres bancs)
// Pour la Mère-Brume (acte I), le Héraut Noyé (acte II) et le Glas Originel (acte III) :
//   G9  : l'entrée est jouée par un fantôme dessiné pendant la bannière, jamais dans `enemies` ni dans room.boss ; elle tient dans la bannière (≤ 2,2 s de temps de
//         jeu), arrive à la pose pleine, et le vrai gardien naît à la même seconde qu'avant (createBoss inchangé).
//   G10 : la mort remplace seulement les cinq explosions ; elle dure ~1,5 s ; la salle est déjà purgée et déclarée vidée (portes, écran) pendant qu'elle se joue ;
//         e.fade du mort est rendu tel qu'il était ; rien dans la salle ne la pousse au-delà de sa durée.
//   G14 : mouvements réduits (reducedMotion) : entrée et mort en fondu seul (aucun déplacement, aucune échelle, aucune découpe) ; sans cette préférence, chacune
//         bouge (le test distingue donc les deux). Coût de la scène ≤ celui du gardien vivant (+ 1 ms).
//   Règle d'or : les champs de combat du gardien (PV, dégâts, rayon, position, temps, état) ne sont ni lus ni écrits par la scène.
// Produit : scene-entrees-morts.png (trois gardiens × trois instants d'entrée et trois instants de mort).
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire('/opt/npm-tools/node_modules/');
const { chromium } = require('playwright');
const sharp = require('sharp');
const PORT = process.argv[2] || 8765, OUT = process.argv[3] || '.', BASE = `http://127.0.0.1:${PORT}/index.html`;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
let fails = 0, checks = 0;
const ok = (c, m) => { checks++; if (!c) { fails++; console.error('ÉCHEC : ' + m); } else console.log('ok · ' + m); };
const NOMS = { 1: 'La Mère-Brume', 2: 'Le Héraut Noyé', 3: 'Le Glas Originel' };

async function ouvrir(act, reduit) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1, reducedMotion: reduit ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 300)));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text().slice(0, 300)); });
  await page.goto(`${BASE}?dernier=ray_n4&acte=${act}&gardien=1`);
  await page.waitForFunction(() => window.__scenes && window.__scenes.etat(), null, { timeout: 40000 });
  return { page, errs };
}
// vignette de la scène (rendu hors écran : les captures d'écran sont couvertes par la bannière et les fenêtres du HUD)
async function vignette(page, genre, v) {
  const url = await page.evaluate(([g, x]) => window.__scenes.vignette(g, x, window.__sc_b), [genre, v]);
  return Buffer.from(url.split(',')[1], 'base64');
}
const planche = {};

for (const act of [1, 2, 3]) {
  console.log(`\n── ${NOMS[act]} (acte ${act})`);
  const { page, errs } = await ouvrir(act, false);
  // ── G9 : l'entrée
  const S0 = await page.evaluate(() => { const S = window.__scenes.etat(), d = window.__glas.dbg(); return { k: S.k, boss: d.enemies.filter(e => e.type === 'boss').length, rb: !!d.room.boss, started: d.room.started, T: window.__scenes.ecran().T }; });
  ok(S0.boss === 0 && !S0.rb && !S0.started, `entrée : le gardien n'existe pas encore pendant la bannière (enemies sans boss, room.boss nul), mais la scène tourne (k=${S0.k.toFixed(2)})`);
  const entrees = [];
  for (const seuil of [0.25, 0.55, 0.9]) {
    await page.waitForFunction(s => { const S = window.__scenes.etat(); return !S || S.k >= s || window.__glas.dbg().room.started; }, seuil, { timeout: 8000, polling: 16 });
    const k = await page.evaluate(() => { const S = window.__scenes.etat(); return S ? S.k : 1; });
    entrees.push({ seuil, k });
  }
  console.log('  entrée : instants observés en jeu k ≈ ' + entrees.map(e => e.k.toFixed(2)).join(', '));
  const enc = await page.evaluate(() => [0.15, 0.4, 0.7, 0.95, 1].map(k => window.__scenes.encre('entree', k)));
  ok(enc.every((v, i) => i === 0 || v >= enc[i - 1] * 0.98) && enc[4] > enc[0] * 1.2, `entrée : le dessin se forme, sur fond transparent (encre ${enc.join(' → ')})`);
  ok(entrees.every((e, i) => i === 0 || e.k >= entrees[i - 1].k), `entrée : la progression ne recule pas`);
  await page.waitForFunction(() => window.__glas.dbg().room.started, null, { timeout: 8000, polling: 16 });
  const S1 = await page.evaluate(() => { const d = window.__glas.dbg(), b = d.enemies.find(e => e.type === 'boss'); return { T: window.__scenes.ecran().T, boss: d.enemies.filter(e => e.type === 'boss').length, fant: d.enemies.some(e => e.fantome), rb: d.room.boss && d.room.boss.fantome, fade: b.fade, x: b.x, y: b.y, r: b.r, phase: b.phase, hp: b.hp, maxHp: b.maxHp }; });
  ok(S1.boss === 1 && !S1.fant && !S1.rb, `entrée : un seul gardien vivant, jamais le fantôme (enemies ${S1.boss}, fantôme ${S1.fant})`);
  ok(S1.T - S0.T <= 2.3, `entrée : née dans la bannière (${(S1.T - S0.T).toFixed(2)} s de temps de jeu ≤ 2,2 s + marge d'une image)`);
  ok(S1.r === (act === 3 ? 62 : 48) && S1.phase === 1 && S1.hp === S1.maxHp, `entrée : rayon ${S1.r}, premier temps, PV pleins (combat inchangé)`);
  // pose pleine à la fin et nulle part avant, déplacements en mouvement normal
  const id = await page.evaluate(a => { const W = window.__scenes, e = W.fantome(a); const o1 = W.entree(a, 1, e, {}), o0 = W.mort(a, 0, e, {});
    const idt = o => o.a === 1 && o.dx === 0 && o.dy === 0 && o.sx === 1 && o.sy === 1 && (o.clip == null || o.clip === 1);
    const bouge = [0.2, 0.5, 0.8].some(k => { const o = W.entree(a, k, e, { m1: 1, m2: 1, c: 1 }); return o.dx || o.dy || o.sx !== 1 || o.sy !== 1 || o.clip != null; });
    const bougeM = [0.2, 0.5, 0.8].some(u => { const o = W.mort(a, u, e, { m0: 1, m1: 1, m2: 1 }); return o.dx || o.dy || o.sx !== 1 || o.sy !== 1; });
    return { fin: idt(o1), debut: idt(o0), bouge, bougeM }; }, act);
  ok(id.fin && id.debut, `entrée et mort : pose pleine à k=1 et u=0 (rien ne saute à la naissance ni au début de la mort)`);
  ok(id.bouge && id.bougeM, `mouvement normal : l'entrée et la mort déplacent ou découpent le dessin`);
  // ── coût (G14)
  const cout = await page.evaluate(() => window.__scenes.mesure(window.__glas.dbg().enemies.find(e => e.type === 'boss'), 120));
  ok(cout.scene <= cout.vif + 1, `coût : scène ${cout.scene} ms/image ≤ gardien vivant ${cout.vif} + 1 ms`);
  // ── G10 : la mort
  const av = await page.evaluate(() => { const b = window.__glas.dbg().enemies.find(e => e.type === 'boss'); return { fade: b.fade, hp: b.hp, dmg: b.dmg, r: b.r, spd: b.spd }; });
  const mort = await page.evaluate(async () => {
    const A = window.__asm.dbg(), d = window.__glas.dbg(), b = d.enemies.find(e => e.type === 'boss'), T0 = window.__scenes.ecran().T; window.__sc_b = b;
    A.kill(b); const o = { T0 };
    o.apres = { dead: b.dead, bossDead: d.room.bossDead, morts: window.__scenes.morts.length };
    return o; });
  ok(mort.apres.dead && mort.apres.bossDead && mort.apres.morts === 1, `mort : le gardien est mort pour le jeu (dead, bossDead) et la scène démarre (${mort.apres.morts})`);
  const vues = [];
  for (const seuil of [0.15, 0.5, 0.85]) {
    await page.waitForFunction(s => { const m = window.__scenes.morts[0]; return !m || (window.__scenes.ecran().T - m.t0) / window.__scenes.mortS() >= s; }, seuil, { timeout: 8000, polling: 16 });
    const u = await page.evaluate(() => { const m = window.__scenes.morts[0]; return m ? (window.__scenes.ecran().T - m.t0) / window.__scenes.mortS() : 1; });
    const etat = await page.evaluate(() => { const d = window.__glas.dbg(); return { cleared: d.room.cleared, portes: (d.room.doors || []).length, morts: window.__scenes.morts.length, restants: d.enemies.filter(e => !e.dead).length }; });
    vues.push({ seuil, u, ...etat });
  }
  console.log('  mort : instants observés en jeu u ≈ ' + vues.map(e => e.u.toFixed(2)).join(', '));
  ok(vues[0].cleared && (act === 3 || vues[0].portes > 0), `mort : la salle est déjà vidée (cleared${act === 3 ? '' : ', portes ouvertes ' + vues[0].portes}) alors que la scène joue encore (u≈${vues[0].u.toFixed(2)})`);
  ok(vues.every(v => v.restants === 0), `mort : plus aucun ennemi vivant dans la salle pendant la scène (purge faite)`);
  const encm = await page.evaluate(() => { const b = window.__sc_b; return [0, 0.3, 0.6, 0.9, 1].map(u => window.__scenes.encre('mort', u, b)); });
  ok(encm[0] > 0 && encm.every((v, i) => i === 0 || v <= encm[i - 1] + encm[0] * 0.05) && encm[4] < encm[0] * 0.05, `mort : le dessin s'efface jusqu'à rien, sur fond transparent (encre ${encm.join(' → ')})`);
  await page.waitForFunction(() => window.__scenes.morts.length === 0, null, { timeout: 8000, polling: 16 });
  const fin = await page.evaluate(() => ({ T: window.__scenes.ecran().T, fade: window.__sc_b.fade }));
  ok(fin.fade === av.fade, `mort : e.fade rendu tel qu'il était (${av.fade} → ${fin.fade})`);
  const dur = fin.T - mort.T0; ok(dur >= 1.45 && dur <= 1.75, `mort : dure ~1,5 s (${dur.toFixed(2)} s de temps de jeu)`);
  const vg = [];
  for (const k of [0.2, 0.5, 0.9]) vg.push(await vignette(page, 'entree', k));
  for (const u of [0.15, 0.5, 0.85]) vg.push(await vignette(page, 'mort', u));
  planche[act] = vg;
  ok(errs.length === 0, `aucune erreur de script (${errs.length}${errs.length ? ' : ' + errs[0] : ''})`);
  await page.context().close();

  // ── G14 : mouvements réduits
  const R = await ouvrir(act, true);
  const rm = await R.page.evaluate(a => { const W = window.__scenes, e = W.fantome(a), ev = {}; const m = [];
    for (const k of [0.1, 0.3, 0.5, 0.7, 0.9, 1]) { const o = W.entree(a, k, e, ev); m.push([o.dx, o.dy, o.sx, o.sy, o.clip == null ? 0 : 1, o.a]); }
    for (const u of [0, 0.2, 0.4, 0.6, 0.8, 1]) { const o = W.mort(a, u, e, ev); m.push([o.dx, o.dy, o.sx, o.sy, o.clip == null ? 0 : 1, o.a]); }
    return m; }, act);
  ok(rm.every(([dx, dy, sx, sy, cl]) => !dx && !dy && sx === 1 && sy === 1 && !cl), `mouvements réduits : ni déplacement, ni échelle, ni découpe (${rm.length} instants)`);
  ok(rm.slice(0, 6).every((v, i, t) => i === 0 || v[5] >= t[i - 1][5]) && rm.slice(6).every((v, i, t) => i === 0 || v[5] <= t[i - 1][5]) && rm[5][5] === 1 && rm[6][5] === 1 && rm[11][5] === 0, `mouvements réduits : entrée en fondu croissant jusqu'à 1, mort en fondu décroissant jusqu'à 0`);
  ok(R.errs.length === 0, `mouvements réduits : aucune erreur de script`);
  await R.page.context().close();
}
// règle d'or : bossDefeated garde tout sauf les cinq explosions
const src = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
const bd = /function bossDefeated\(e\)\{[\s\S]*?\n\}/.exec(src)[0];
ok(/if\(!SC27\.debut\(e\)\)for\(let i=0;i<5;i\+\+\)later\(i\*0\.16,\(\)=>explosion\(/.test(bd) && ['room.bossDead=true', 'mist(e.x,e.y,e.r*1.5)', 'shake(12,0.6)', 'freezeT=0.12', "heal(P.s.maxHp,'boss')", 'toast('].every(t => bd.includes(t)), `bossDefeated : seules les cinq explosions sont conditionnelles ; secousse, gel, soin, annonce, purge gardés`);
// planche
const cols = 6, W = 380, H = 420;
const imgs = []; [1, 2, 3].forEach((a, r) => planche[a].forEach((b, c) => imgs.push({ input: b, left: c * W, top: r * H })));
await sharp({ create: { width: cols * W, height: 3 * H, channels: 3, background: '#080a0d' } }).composite(imgs).png().toFile(`${OUT}/scene-entrees-morts.png`);
await browser.close();
console.log(`\n${checks} vérifications, ${fails} échec(s)`); process.exit(fails ? 1 : 0);
