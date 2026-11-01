// Banc Chromium : v18.3, action 3b (les règles mutantes de l'Extrême). Usage : node banc-mutations.mjs <port> [sections, ex. ABCDEF] [dossier de captures]
// A. Normal et Difficile : aucune mutation (ni état, ni HUD, ni sceau), soins jamais retenus.
// B. Extrême : une mutation aux actes I à III, deux aux IV à VI, trois aux VII à X ; liste rejouée depuis la graine ; sceaux à l'entrée de l'acte
//    (la nouvelle s'imprime, la plus ancienne se brise), HUD (une icône par mutation, une ligne au survol), pause (une ligne et la réponse).
// C. Les huit effets, chacun seul dans une salle de combat de l'acte II (temps avancé à la main) : échos, vagues pressées, brume qui serre,
//    couronne, dernier souffle, glas, ombre, cœur fermé.
// D. Salles : jamais au gardien (actes I à III, places provisoires IV à IX), ni au boss final ; brume qui serre suspendue sous Brume plombée ;
//    icônes éteintes là où elles ne jouent pas ; gardiens I à III identiques à Normal.
// E. Captures (si un dossier est donné) : sceaux, HUD, zones, couronne, rage, ombre, brume, soin en attente.
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire('/opt/npm-tools/node_modules/');
const { chromium } = require('playwright');
const PORT = process.argv[2] || 8765, SEC = (process.argv[3] || 'ABCD').toUpperCase(), DIR = process.argv[4] || '';
let fails = 0, checks = 0;
const ok = (c, m) => { checks++; if (!c) { fails++; console.error('ÉCHEC : ' + m); } };
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', args: ['--autoplay-policy=no-user-gesture-required'] });
async function ouvre() {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });
  await page.goto(`http://127.0.0.1:${PORT}/index.html`);
  await page.waitForFunction(() => !!(window.__descente && window.__brume && window.__asm && window.__mutations), null, { timeout: 25000 });
  await page.waitForTimeout(300);
  return { page, errs, ctx };
}
const DEPART = p => { const X = window.__descente, B = window.__brume;
  B.SAVE.descente = { v: 1, ouverts: ['normal', 'difficile', 'extreme'], choisi: 'normal', victoires: {} };
  X.choisir(p); B.cls('lum'); B.start(); X.vider(); B.step(1 / 30, 2); return B.RUN.palierD; };
// salle de combat de l'acte n avec la seule mutation k ; attend la première vague sur le terrain
const SALLE = ([n, k]) => { const X = window.__descente, B = window.__brume, MU = window.__mutations;
  X.essai(n); X.vider(); MU.forcer(k ? [k] : []); B.room.rule = null;
  for (let i = 0; i < 120; i++) { const P = B.P; P.iT = 2; P.hp = P.s.maxHp; X.vider(); B.step(1 / 30, 1); if (B.enemies.some(e => !e.dead && e.type !== 'boss') && !B.room.spawning.length) break; }
  return { type: B.room.type, waves: B.room.waves.length, waveI: B.room.waveI, actives: MU.actives(), ennemis: B.enemies.filter(e => !e.dead).length }; };

// ── A. Normal et Difficile : rien
if (SEC.includes('A')) {
  for (const p of ['normal', 'difficile']) {
    const { page, errs, ctx } = await ouvre();
    ok(await page.evaluate(DEPART, p) === p, `A : ${p} joué`);
    const s = await page.evaluate(SALLE, [2, null]);
    const r = await page.evaluate(() => { const B = window.__brume, MU = window.__mutations, P = B.P; P.hp = P.s.maxHp * 0.5; const h = P.hp; window.__descente.soin(10, 'devour');
      const hud = document.querySelector('#hMut18'), sc = document.querySelector('#sceaux18');
      return { etat: MU.etat() || null, act: MU.actives(), gain: P.hp - h, hud: hud ? hud.hidden || !hud.children.length : true, sc: sc ? sc.classList.contains('show') : false, regles: MU.regles() }; });
    ok(r.etat === null && !r.act.length && r.regles === null, `A : ${p}, aucune mutation ` + JSON.stringify({ e: r.etat, a: r.act }));
    ok(Math.abs(r.gain - 10) < 0.01, `A : ${p}, le soin n'est pas retenu (${r.gain})`);
    ok(r.hud && !r.sc, `A : ${p}, ni icône ni sceau`);
    ok(!errs.length, `A : ${p}, aucune erreur ` + errs.slice(0, 3).join(' | '));
    await ctx.close();
  }
}

// ── B. Extrême : liste par acte, sceaux, HUD, pause
if (SEC.includes('B')) {
  const { page, errs, ctx } = await ouvre();
  ok(await page.evaluate(DEPART, 'extreme') === 'extreme', 'B : Extrême joué');
  const e1 = await page.evaluate(() => { const S = window.__mutations.etat(), sc = document.querySelector('#sceaux18'), hud = document.querySelector('#hMut18');
    return { S: JSON.parse(JSON.stringify(S)), sc: sc ? { show: sc.classList.contains('show'), n: sc.querySelectorAll('i').length, nw: sc.querySelectorAll('i.nw').length } : null,
      hud: hud ? [...hud.querySelectorAll('i')].map(i => ({ m: i.dataset.m, t: i.title, off: i.classList.contains('off') })) : [] }; });
  ok(e1.S && e1.S.acte === 1 && e1.S.liste.length === 1 && e1.S.entre === e1.S.liste[0] && !e1.S.sort, 'B : acte I, une mutation ' + JSON.stringify(e1.S && e1.S.liste));
  ok(e1.sc && e1.sc.show && e1.sc.n === 1 && e1.sc.nw === 1, 'B : acte I, le sceau s’imprime ' + JSON.stringify(e1.sc));
  ok(e1.hud.length === 1 && e1.hud[0].m === e1.S.liste[0] && / · /.test(e1.hud[0].t), 'B : HUD, une icône et sa ligne au survol ' + JSON.stringify(e1.hud));
  const gr = e1.S.graine, vus = {};
  for (const n of [2, 3, 4, 5, 6, 7, 8, 9, 10]) {
    vus[n] = await page.evaluate(n => { const X = window.__descente, B = window.__brume; X.essai(n); X.vider(); B.step(1 / 30, 2); const S = window.__mutations.etat(), sc = document.querySelector('#sceaux18');
      return { liste: S.liste.slice(), entre: S.entre, sort: S.sort, acte: S.acte, sc: sc ? { nw: [...sc.querySelectorAll('i.nw')].map(i => i.dataset.m), sort: [...sc.querySelectorAll('i.sort')].map(i => i.dataset.m) } : null, hud: document.querySelectorAll('#hMut18 i').length }; }, n);
    const pl = n >= 7 ? 3 : n >= 4 ? 2 : 1;
    ok(vus[n].acte === n && vus[n].liste.length === pl && vus[n].hud === pl, `B : acte ${n}, ${pl} mutation(s) ${JSON.stringify(vus[n].liste)}`);
    ok(vus[n].sc && vus[n].sc.nw.length === 1 && vus[n].sc.nw[0] === vus[n].entre && (!vus[n].sort || vus[n].sc.sort[0] === vus[n].sort), `B : acte ${n}, sceaux (nouvelle ${vus[n].entre}, sortie ${vus[n].sort}) ${JSON.stringify(vus[n].sc)}`);
  }
  const rejoue = await page.evaluate(g => [4, 7, 10].map(n => window.__mutations.rejouer(g, n)), gr);
  ok((JSON.stringify(rejoue) === JSON.stringify([vus[4].liste, vus[7].liste, vus[10].liste])), 'B : la liste de chaque acte se rejoue depuis la graine');
  const pz = await page.evaluate(() => { window.__brume.openPause(); const b = document.querySelector('.mut18p'); const r = b ? { n: b.querySelectorAll('.mr').length, t: b.textContent } : null; window.__descente.vider(); return r; });
  ok(pz && pz.n === 3 && /Règles mutantes/.test(pz.t), 'B : la pause dit une ligne et la réponse par mutation ' + JSON.stringify(pz && pz.n));
  const st = await page.evaluate(() => { const B = window.__brume; return B.RUN.mut18 && Object.keys(B.RUN.mut18.hist).length; });
  ok(st === 10, 'B : l’historique des dix actes est gardé (statistiques) ' + st);
  ok(!errs.length, 'B : aucune erreur ' + errs.slice(0, 3).join(' | '));
  await ctx.close();
}

// ── C. Les huit effets
if (SEC.includes('C')) {
  const { page, errs, ctx } = await ouvre();
  await page.evaluate(DEPART, 'extreme');
  // Échos funèbres
  { await page.evaluate(SALLE, [2, 'echo']);
    const r = await page.evaluate(() => { const B = window.__brume, MU = window.__mutations, P = B.P;
      const e = B.enemies.find(x => !x.dead && x.type !== 'boss' && !x.asm && !x.elite && !x.fixed); if (!e) return null;
      const x = e.x, y = e.y; MU.frapper(e, 99999); const z = MU.salle().z;
      for (const o of B.enemies) if (!o.dead) { o.spd = 0; o.dmg = 0; }
      P.x = x; P.y = y; P.iT = 0; P.dashT = 0; P.hp = P.s.maxHp; const h = P.hp; let pris = 0;
      for (let i = 0; i < 45; i++) { P.x = x; P.y = y; P.iT = 0; const a = P.hp; B.step(1 / 30, 1); pris += Math.max(0, a - P.hp); }
      return { z, pris, reste: MU.salle().z.length }; });
    ok(r && r.z.length === 1 && r.z[0].k === 'echo' && Math.abs(r.z[0].t - 1.2) < 0.05, 'C : échos, un écho au sol (1,2 s) ' + JSON.stringify(r && r.z));
    ok(r && r.pris > 0 && r.reste === 0, `C : échos, il éclate et blesse qui reste dessus (${r && r.pris.toFixed(1)} PV)`); }
  // Vagues pressées
  { const s = await page.evaluate(SALLE, [2, 'presse']);
    const r = await page.evaluate(() => { const B = window.__brume, MU = window.__mutations, P = B.P, R = B.room;
      if (R.waves.length < 2) return { skip: true };
      const w0 = R.waveI, al = B.enemies.filter(e => !e.dead && e.type !== 'boss'), n = al.length, tuer = Math.ceil(n * 0.5);
      for (let i = 0; i < tuer; i++) MU.frapper(al[i], 99999);
      let t = 0; for (let i = 0; i < 60 && R.waveI === w0; i++) { P.iT = 2; P.hp = P.s.maxHp; B.step(1 / 30, 1); t += 1 / 30; }
      return { n, tues: tuer, w0, w1: R.waveI, t }; });
    ok(r.skip || (r.w1 === r.w0 + 1 && r.t < 1.6), `C : vagues pressées, la suivante entre à la moitié (${JSON.stringify(r)})`); }
  // Brume qui serre
  { await page.evaluate(SALLE, [2, 'serre']);
    const r = await page.evaluate(() => { const B = window.__brume, MU = window.__mutations, P = B.P;
      for (const o of B.enemies) if (!o.dead) o.dmg = 0;
      for (let i = 0; i < 30 * 26; i++) { P.iT = 2; P.hp = P.s.maxHp; if (!B.enemies.some(e => !e.dead && e.type !== 'boss')) break; B.step(1 / 30, 1); }
      const k = MU.salle().serre; P.x = 60; B.step(1 / 30, 1); const px = P.x;
      return { k, px, ennemis: B.enemies.filter(e => !e.dead).length }; });
    ok(r.k > 0.1 && r.k <= 0.15 + 1e-9, `C : brume qui serre, l’arène se resserre (${(r.k * 100).toFixed(1)} %)`);
    ok(r.px > 56 + (1280 - 112) * 0.04, `C : brume qui serre, le joueur est repoussé hors de la brume (x ${r.px.toFixed(0)})`);
    const r2 = await page.evaluate(() => { const B = window.__brume, MU = window.__mutations, P = B.P; B.killAll(); for (let i = 0; i < 90; i++) { P.iT = 2; window.__descente.vider(); B.step(1 / 30, 1); } return MU.salle().serre; });
    ok(r2 < 0.01, `C : brume qui serre, elle se retire à la purge (${r2})`); }
  // Couronne
  { await page.evaluate(SALLE, [2, 'couronne']);
    const r = await page.evaluate(() => { const B = window.__brume, MU = window.__mutations, P = B.P;
      for (let i = 0; i < 10; i++) { P.iT = 2; B.step(1 / 30, 1); }
      const al = B.enemies.filter(e => !e.dead && e.type !== 'boss' && !e.asm), cr = al.filter(e => e.couronne18), pr = al.find(e => !e.couronne18);
      if (!cr.length || !pr) return { cr: cr.length, n: al.length };
      const h1 = pr.hp; MU.frapper(pr, 10); const d1 = h1 - pr.hp;
      const h2 = cr[0].hp; MU.frapper(cr[0], 10); const d2 = h2 - cr[0].hp;
      MU.frapper(cr[0], 99999); B.step(1 / 30, 1); const h3 = pr.hp; MU.frapper(pr, 10); const d3 = h3 - pr.hp;
      return { cr: cr.length, n: al.length, d1, d2, d3, cour: MU.salle().cour }; });
    ok(r.n < 3 || r.cr === 1, `C : couronne, un seul ennemi couronné (${JSON.stringify(r)})`);
    ok(r.n < 3 || (Math.abs(r.d1 / r.d2 - 0.5) < 0.05 && Math.abs(r.d3 / r.d2 - 1) < 0.05 && r.cour === false), `C : couronne, les autres ne prennent que la moitié, puis tout une fois la couronne tombée (${JSON.stringify(r)})`); }
  // Dernier souffle
  { await page.evaluate(SALLE, [2, 'dernier']);
    const r = await page.evaluate(() => { const B = window.__brume, MU = window.__mutations, P = B.P, R = B.room;
      const w = R.waveI - 1, g = B.enemies.filter(e => !e.dead && e.type !== 'boss' && !e.asm && e.vague18 === w);
      if (g.length < 3) return { n: g.length };
      const der = g[g.length - 1], v0 = der.spd; for (const e of g.slice(0, -1)) MU.frapper(e, 99999);
      for (let i = 0; i < 4; i++) { P.iT = 2; B.step(1 / 30, 1); }
      return { n: g.length, rage: !!der.rage18, k: der.spd / v0 }; });
    ok(r.n < 3 || (r.rage && Math.abs(r.k - 1.3) < 0.02), `C : dernier souffle, le dernier enrage (+30 % de vitesse) ${JSON.stringify(r)}`); }
  // Glas lointain
  { await page.evaluate(SALLE, [2, 'glas']);
    const r = await page.evaluate(() => { const B = window.__brume, MU = window.__mutations, P = B.P; let z = [], t = 0;
      for (const o of B.enemies) if (!o.dead) { o.dmg = 0; o.spd = 0; }
      for (let i = 0; i < 30 * 10 && !z.length; i++) { P.iT = 2; P.hp = P.s.maxHp; B.step(1 / 30, 1); t += 1 / 30; z = MU.salle().z.filter(x => x.k === 'glas'); }
      const x = P.x, y = P.y; let pris = 0; P.iT = 0; P.dashT = 0;
      for (let i = 0; i < 40; i++) { P.x = x; P.y = y; P.iT = 0; const a = P.hp; B.step(1 / 30, 1); pris += Math.max(0, a - P.hp); }
      return { n: z.length, t, pris, preavis: z[0] && z[0].t }; });
    ok(r.n === 3 && r.t > 8.5 && r.t < 9.6, `C : glas, trois cercles toutes les 9 s (${r.n} à ${r.t.toFixed(2)} s)`);
    ok(r.pris > 0, `C : glas, il frappe qui reste dans son cercle (${r.pris.toFixed(1)} PV)`); }
  // Ombre
  { await page.evaluate(SALLE, [2, 'ombre']);
    const r = await page.evaluate(() => { const B = window.__brume, MU = window.__mutations, P = B.P; let o = null, t = 0;
      for (const e of B.enemies) if (!e.dead) { e.dmg = 0; e.spd = 0; }
      const cx = 640, cy = 420;
      for (let i = 0; i < 30 * 14 && !o; i++) { P.iT = 2; P.hp = P.s.maxHp; P.x = cx + Math.cos(t * 2) * 150; P.y = cy + Math.sin(t * 2) * 90; B.step(1 / 30, 1); t += 1 / 30; o = MU.salle().ombre; }
      const T0 = t; let pris = 0, touche = false;
      for (let i = 0; i < 30 * 3.2; i++) { const s = B.room.ombre18; if (s && s.age > 0.6) { P.x = s.x; P.y = s.y; } P.iT = 0; P.dashT = 0; const a = P.hp; B.step(1 / 30, 1); pris += Math.max(0, a - P.hp); if (B.room.ombre18 && B.room.ombre18.touche) touche = true; }
      return { t: T0, pris, touche }; });
    ok(r.t > 11.5 && r.t < 12.6, `C : ombre, elle sort toutes les 12 s (${r.t.toFixed(2)} s)`);
    ok(r.touche && r.pris > 0, `C : ombre, la toucher blesse (${r.pris.toFixed(1)} PV)`); }
  // Cœur fermé
  { await page.evaluate(SALLE, [2, 'differe']);
    const r = await page.evaluate(() => { const B = window.__brume, MU = window.__mutations, X = window.__descente, P = B.P;
      P.hp = P.s.maxHp * 0.4; const h0 = P.hp; X.soin(10, 'devour'); X.soin(10, 'steal'); const h1 = P.hp, w = MU.attente();
      const bar = document.querySelector('.bar.hp .d18'); window.__brume.step(1 / 30, 1); const barOk = bar && !bar.hidden && parseFloat(bar.style.width) > 0;
      let pendant = 0; for (let i = 0; i < 900; i++) { P.iT = 2; X.vider(); if (!B.room.cleared && i % 3 === 0) B.killAll(); const a = P.hp; B.step(1 / 30, 1); if (!B.room.cleared) pendant += Math.max(0, P.hp - a); if (B.room.cleared && !B.room.diff18) break; }
      return { retenu: h1 - h0, w, apres: P.hp - h0, pendant, cleared: B.room.cleared, bar: !!barOk }; });
    ok(Math.abs(r.retenu) < 0.01 && Math.abs(r.w - 20) < 0.01, `C : cœur fermé, le soin attend (${JSON.stringify(r)})`);
    ok(r.bar, 'C : cœur fermé, le soin en attente se lit sur la barre de PV');
    ok(r.cleared && r.apres >= 19.9 && r.pendant < 0.01, `C : cœur fermé, rien pendant le combat, tout à la purge (+${r.apres.toFixed(1)}, pendant ${r.pendant.toFixed(1)})`); }
  ok(!errs.length, 'C : aucune erreur ' + errs.slice(0, 3).join(' | '));
  await ctx.close();
}

// ── D. Salles où elles ne jouent pas ; gardiens I à III
if (SEC.includes('D')) {
  const { page, errs, ctx } = await ouvre();
  await page.evaluate(DEPART, 'extreme');
  const r = await page.evaluate(() => { const X = window.__descente, B = window.__brume, MU = window.__mutations, out = {};
    const tous = Object.keys(MU.regles().liste);
    for (const [k, n, fin] of [['g1', 1, true], ['g3', 3, true], ['g4', 4, true], ['g9', 9, true], ['mini', 10, false], ['final', 10, true]]) {
      X.essai(n, { fin }); X.vider(); MU.forcer(['echo', 'glas', 'differe']); for (let i = 0; i < 6; i++) B.step(1 / 30, 1);
      const hud = [...document.querySelectorAll('#hMut18 i')].map(i => i.classList.contains('off'));
      out[k] = { type: B.room.type, gk: B.room.gardeK || '', act: MU.actives(), off: hud }; }
    X.essai(2); X.vider(); MU.forcer(['serre', 'glas']); B.room.rule = 'brume'; B.step(1 / 30, 2); out.brume = MU.actives();
    B.room.rule = 'verre'; B.step(1 / 30, 2); out.verre = MU.actives();
    return out; });
  for (const k of ['g1', 'g3', 'g4', 'g9', 'final']) ok(r[k].act.length === 0 && r[k].off.every(Boolean), `D : ${k} (${r[k].type} ${r[k].gk}), aucune mutation, icônes éteintes ` + JSON.stringify(r[k]));
  ok(r.mini.gk === 'mini' && r.mini.act.length === 3 && r.mini.off.every(x => !x), 'D : miniboss de l’acte X, elles jouent ' + JSON.stringify(r.mini));
  ok(JSON.stringify(r.brume) === '["glas"]' && JSON.stringify(r.verre) === '["serre","glas"]', `D : brume qui serre suspendue sous Brume plombée (${JSON.stringify(r.brume)} / ${JSON.stringify(r.verre)})`);
  ok(!errs.length, 'D : aucune erreur ' + errs.slice(0, 3).join(' | '));
  await ctx.close();
}

// ── E. Captures
if (SEC.includes('E') && DIR) {
  mkdirSync(DIR, { recursive: true });
  const { page, ctx } = await ouvre();
  await page.evaluate(DEPART, 'extreme');
  await page.evaluate(() => { const X = window.__descente, B = window.__brume; X.essai(4); X.vider(); B.step(1 / 30, 3); });
  await page.waitForTimeout(250); await page.screenshot({ path: `${DIR}/mut-sceaux.png` });
  await page.evaluate(SALLE, [7, null]);
  await page.evaluate(() => { const B = window.__brume, MU = window.__mutations, P = B.P; MU.forcer(['couronne', 'glas', 'serre', 'ombre', 'differe', 'echo']);
    for (const e of B.enemies) if (!e.dead) { e.dmg = 0; }
    let t = 0; for (let i = 0; i < 30 * 12.4; i++) { P.iT = 2; P.hp = P.s.maxHp * 0.55; P.x = 640 + Math.cos(t * 1.6) * 170; P.y = 440 + Math.sin(t * 1.6) * 100; B.step(1 / 30, 1); t += 1 / 30; }
    const al = B.enemies.filter(e => !e.dead && !e.asm); if (al[1]) { al[1].rage18 = true; }
    if (al[2]) MU.frapper(al[2], 99999); window.__descente.soin(25, 'devour'); B.step(1 / 30, 3); });
  await page.waitForTimeout(150); await page.screenshot({ path: `${DIR}/mut-salle.png` });
  await ctx.close();
  console.log(`  captures : ${DIR}/mut-sceaux.png, ${DIR}/mut-salle.png`);
}
console.log(`banc-mutations : ${checks} vérifications, ${fails} échec${fails > 1 ? 's' : ''}.`);
await browser.close();
process.exit(fails ? 1 : 0);
