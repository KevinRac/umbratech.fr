// Banc Chromium : les gardiens de la descente (v18.14, chantier v18, action 6.1a : le socle commun ; cadrage
// _dev/cadrages/la-brume-v18-6-gardiens-cadrage.md, Q14). Usage : node banc-gardiens18.mjs <port> [ABCGH] [dossier de captures, hors dépôt]
// A · aiguillage : l'essai ?gardien=4 ouvre une vraie salle de gardien à l'acte IV, et rien du Glas Originel n'y paraît (ni sa mémoire, ni son cœur,
//     ni son glyphe, ni sa lumière qui bat, ni ses vaisseaux, ni la réserve notée à son entrée) ; son nom, ses PV, son rayon ; son sol (Q4) ; son
//     glyphe sur la porte et la barre ; ses coups (journal, la mort nomme le gardien) ; sa victoire (temps de gardien et Mémoire sous la clé de l'acte,
//     relique et phrase de l'acte, soin du palier, scène de mort à lui).
// B · temps : seuils (trois temps en Normal, quatre en Difficile et en Extrême), verrou de 1,2 s, temps de plus ; relâche (sonné, anneau ivoire) ;
//     Accoutumance (anneau de runes, fenêtre « à nu »).
// C · aucun coup sans signe : quatre formes × trois paliers au bot qui frappe (build de référence, dieu) : chaque coup reçu est signé.
// G · règle d'or : l'index.html d'avant (BANC_AVANT, défaut e397615 : le dernier commit avant la v18.14) et celui d'après rejouent 20 salles (les
//     19 de banc-arene G, plus la salle « boss » de l'acte IV) dans les trois paliers, image par image : gardien ÉTEINT, aucune image ne diffère ;
//     ALLUMÉ (gardiens-descente.js servi avec actif:true), seule la salle du gardien de l'acte IV diffère. BANC_IMAGES=n (180), BANC_MODES=eteint,allume.
// H · repli et wiki : éteint, la dernière salle de l'acte IV est la place provisoire (porte « garde », Masqué renforcé) ; allumé, la salle du gardien ;
//     wiki.mjs --check à jour, le wiki ne nomme pas un gardien éteint.
import { createRequire } from 'node:module';
import { readFileSync, mkdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire('/opt/npm-tools/node_modules/');
const { chromium } = require('playwright');
const THEMIST = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PORT = process.argv[2] || 8765, SEC = (process.argv[3] || 'ABCGH').toUpperCase(), OUT = process.argv[4] || null;
if (OUT) mkdirSync(OUT, { recursive: true });
const BASE = `http://127.0.0.1:${PORT}/index.html`;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', args: ['--autoplay-policy=no-user-gesture-required'] });
let checks = 0, fails = 0;
const ok = (c, msg) => { checks++; if (!c) fails++; console.log(`${c ? '  ok ' : '  ÉCHEC '} ${msg}`); };
const GD_SRC = readFileSync(join(THEMIST, 'data', 'gardiens-descente.js'), 'utf8');
const ALLUME = GD_SRC.replace(/\b4:\{actif:false,/, '4:{actif:true,');
async function ouvre(qs, o = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  await ctx.addInitScript(() => { window.__raf = []; window.requestAnimationFrame = cb => { window.__raf.push(cb); return 1; }; });
  if (o.allume) await ctx.route(u => u.pathname.endsWith('/data/gardiens-descente.js'), r => r.fulfill({ status: 200, contentType: 'text/javascript; charset=utf-8', body: ALLUME }));
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 300)));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text().slice(0, 300)); });
  await page.goto(`${BASE}${qs ? '?' + qs : ''}`);
  await page.waitForFunction(() => !!(window.__gardiens18 && window.__brume && window.__brume.step && window.__descente), null, { timeout: 30000 });
  await page.evaluate(() => { const q = window.__raf.splice(0); for (const f of q) f(performance.now()); });
  await page.evaluate(() => { window.__vide = () => { const o = document.querySelector('#overlay'); if (!o.hidden) { const b = o.querySelector('#bok') || o.querySelector('.card:not([disabled])') || o.querySelector('button.primary:not([disabled])'); if (b) b.click(); } };
    window.__pas = (s, f) => { const B = window.__brume; for (let i = 0; i < Math.round(s * 60); i++) { window.__vide(); B.step(1 / 60, 1); if (f && f()) return true; } return false; }; });
  return { page, errs, ctx };
}
// démarre l'essai et attend le gardien (la bannière de 2,2 s passée)
async function essai(page, o) {
  return page.evaluate(o => { const G = window.__gardiens18, B = window.__brume; const r = G.essai(4, o);
    window.__pas(5, () => B.room.boss && B.room.started); return { r, boss: !!B.room.boss }; }, o);
}

// ══════════════════════════════════════════════════════════════════════════════
if (SEC.includes('A')) {
  console.log('\n══ A · aiguillage : un gardien de l’acte IV, rien du Glas ══');
  { const { page, errs, ctx } = await ouvre('');
    const r0 = await page.evaluate(() => ({ actifs: window.__gardiens18.actifs(), boss4: null }));
    ok(Object.keys(r0.actifs).length === 0, 'A : tous les gardiens sont éteints (6.1a)');
    const e = await essai(page, { cls: 'lum', dieu: true });
    await page.waitForFunction(() => !!window.__gardiens18.dbg().g27GlypheImg(3), null, { timeout: 10000 }).catch(() => {});   // l'image du glyphe se décode hors de la boucle du jeu
    const r = await page.evaluate(() => { const B = window.__brume, G = window.__gardiens18, D = G.dbg(), room = B.room, e = room.boss;
      D.hud(); const L = D.cl().filter(l => l.x === e.x && l.y === e.y);
      const img = D.g27GlypheImg(3), hud = document.querySelector('#hBossGlyph');
      return { type: room.type, g18: !!room.g18, theme: room.theme, piliers: room.pillars.length, acte: window.__descente.dbg().acte, registre: B.RUN.act,
        nom: e.name, pv: e.maxHp, r: e.r, dmg: e.dmg, glas: !!room.glas, reserveGlas: B.RUN.memoire && B.RUN.memoire.reserveGlas, essai: B.RUN.essai,
        lumiere: L.map(l => [l.c, Math.round(l.r)]), porte: img ? img.src === G.glyphe(4) : null, hud: hud && !hud.hidden && hud.src === G.glyphe(4),
        banniere: document.querySelector('#bName') && document.querySelector('#bName').textContent, theme3: D.themeOf('combat') }; });
    ok(r.type === 'boss' && r.g18 && r.acte === 4 && r.registre === 3, `A : ?gardien=4 ouvre une vraie salle de gardien à l'acte IV (registre ${r.registre}) : ${r.type}, marquée`);
    ok(r.nom === 'Le Guet Sans-Nom' && r.pv === 19200 && r.r === 50, `A : son nom, ses PV (règle Q9 : ${r.pv}), son rayon (${r.r}, pas les 62 du Glas)`);
    ok(r.dmg === 8, `A : contact = 8 % des PV du build de référence (${r.dmg})`);
    ok(!r.glas, 'A : le Glas ne se souvient pas ici (glasInit jamais appelé : ni répertoire ni Reflet)');
    ok(r.reserveGlas == null, `A : la réserve à l'entrée du Glas n'est pas notée (DS12 ; ${r.reserveGlas})`);
    ok(r.theme === 'basfonds' && r.piliers === 0 && r.theme3 === 'coeur', `A : son sol (thème ${r.theme}, sans cocons) ; le reste de l'acte garde le Cœur (${r.theme3}) ; les vaisseaux du Cœur ne sont tracés que sur le thème coeur`);
    ok(r.lumiere.length === 1 && r.lumiere[0][0] === 'g18_4' && r.lumiere[0][1] === 120, `A : sa lumière, à lui, sans battement (${JSON.stringify(r.lumiere)})`);
    ok(r.porte === true && r.hud === true, `A : son glyphe sur la porte (${r.porte}) et la barre de vie (${r.hud})`);
    ok(r.essai === 1, 'A : une descente d\'essai');
    // un coup : une zone touche le joueur immobile (bot éteint), signé, et la mort nommerait le gardien
    const c = await page.evaluate(() => { const B = window.__brume, G = window.__gardiens18; window.__pas(20, () => G.journal().coups.length > 0); const j = G.journal();
      return { coups: j.coups.slice(0, 3), sans: j.sansSigne, src: B.RUN.mem.lastSrc }; });
    ok(c.coups.length > 0 && c.coups[0].k === 'zone' && c.coups[0].signe && c.sans === 0, `A : un coup reçu, rattaché à sa zone, signé (${JSON.stringify(c.coups[0])})`);
    ok(c.src === 'g18_4', `A : la mort le nommerait (lastSrc ${c.src})`);
    ok(!errs.length, 'A : aucune erreur de script ' + errs.slice(0, 2).join(' | '));
    if (OUT) await page.screenshot({ path: join(OUT, 'g18-A-combat.png') });
    await ctx.close(); }
  // la victoire, en Normal puis en Difficile
  for (const palier of ['normal', 'difficile']) {
    const { page, errs, ctx } = await ouvre('');
    await essai(page, { cls: 'her', dieu: true, palier });
    const r = await page.evaluate(() => { const B = window.__brume, G = window.__gardiens18, D = G.dbg(), e = B.room.boss; B.P.hp = B.P.s.maxHp * 0.5; const hp0 = B.P.hp;
      for (let k = 0; k < 400 && !e.dead; k++) { D.hit(e, 600, { crit: false }); for (let i = 0; i < 6; i++) B.step(1 / 60, 1); }
      const mort = !!(B.room.g18s && B.room.g18s.mort); for (let i = 0; i < 30; i++) B.step(1 / 60, 1); D.pump();
      const ov = document.querySelector('#overlay'), titre = ov && !ov.hidden ? ov.textContent.slice(0, 200) : '';
      return { dead: e.dead, bossT: B.RUN.bossT && B.RUN.bossT[4], bossT3: B.RUN.bossT && B.RUN.bossT[3], first: B.SAVE.mem.bossFirst && B.SAVE.mem.bossFirst[4], perfect: B.RUN.mem.perfect.slice(), hurt: B.RUN.mem.bossHurt,
        hp0, hp: B.P.hp, max: B.P.s.maxHp, mort, overlay: titre, cleared: B.room.cleared }; });
    ok(r.dead && r.mort, `A (${palier}) : vaincu, sa scène de mort à lui (pas celle du Glas)`);
    ok(r.bossT > 0 && r.bossT3 == null, `A (${palier}) : le temps de gardien sous la clé IV (${r.bossT && r.bossT.toFixed(1)} s), rien sous la clé III`);
    ok(r.first === 1, `A (${palier}) : premier gardien vaincu sous la clé IV (fragment, Résonance)`);
    ok(r.perfect.includes(4) && !r.perfect.includes(3), `A (${palier}) : « sans une égratignure » compté pour l'acte IV (${JSON.stringify(r.perfect)})`);
    const attendu = palier === 'normal' ? r.max : Math.min(r.max, r.hp0 + r.max * 0.65);
    ok(Math.abs(r.hp - attendu) < 1.5, `A (${palier}) : le soin après un gardien suit le palier (${r.hp.toFixed(1)} / ${r.max}, attendu ${attendu.toFixed(1)})`);
    ok(/Bas-Fonds se taisent/.test(r.overlay), `A (${palier}) : la relique et la phrase de l'acte (« ${r.overlay.slice(0, 60)}… »)`);
    ok(!errs.length, `A (${palier}) : aucune erreur de script ` + errs.slice(0, 2).join(' | '));
    await ctx.close(); }
}

// ══════════════════════════════════════════════════════════════════════════════
if (SEC.includes('B')) {
  console.log('\n══ B · temps, relâche, Accoutumance ══');
  for (const palier of ['normal', 'difficile', 'extreme']) {
    const { page, errs, ctx } = await ouvre('');
    await essai(page, { cls: 'lum', dieu: true, palier });
    const r = await page.evaluate(() => { const B = window.__brume, G = window.__gardiens18, D = G.dbg(), e = B.room.boss, out = { seuils: e.seuils18.slice() };
      const passer = th => { e.hp = Math.floor(e.maxHp * th) + 5; e.lockT = 0; D.hit(e, 400, { crit: false }); const apres = e.hp, lock = e.lockT - B.RUN.time; window.__pas(0.2); return { pile: apres === Math.floor(e.maxHp * th) - 1 || apres === Math.ceil(e.maxHp * th) - 1, lock: +lock.toFixed(2), temps: G.etat().temps }; };
      out.t = e.seuils18.map(passer); out.journal = G.journal().temps; return out; });
    const n = palier === 'normal' ? 2 : 3;
    ok(r.seuils.length === n && r.seuils[0] === 0.66 && r.seuils[1] === 0.33 && (n === 2 || r.seuils[2] === 0.18), `B (${palier}) : ${n + 1} temps, seuils ${r.seuils.join(' / ')}`);
    // le verrou de 1,2 s est posé par la retouche v18.5 (e.seuils18) ; au dernier seuil du Normal, un garde plus ancien (v11, à 0,33) arrête déjà le coup au
    // même PV, sans verrou, comme pour les gardiens I à III : on n'exige le verrou qu'aux seuils que la retouche tient seule
    ok(r.t.every((x, i) => x.pile && x.temps === i + 2 && (Math.abs(x.lock - 1.2) < 0.02 || (palier === 'normal' && i === r.t.length - 1))), `B (${palier}) : chaque seuil arrête le coup (PV = seuil − 1), verrou 1,2 s, temps suivant (${JSON.stringify(r.t)})`);
    ok(!errs.length, `B (${palier}) : aucune erreur de script ` + errs.slice(0, 2).join(' | '));
    await ctx.close(); }
  { const { page, errs, ctx } = await ouvre('');
    await essai(page, { cls: 'lum', dieu: true });
    const r = await page.evaluate(() => { const B = window.__brume, G = window.__gardiens18, e = B.room.boss; let relache = null;
      window.__pas(40, () => { const s = G.etat(); if (s.ph === 'relache') { relache = { vuln: +e.vuln.toFixed(2), lances: G.journal().lances }; return true; } return false; });
      return { relache }; });
    ok(r.relache && r.relache.vuln > 1.5 && r.relache.lances === 4, `B : après une file entière (4 gestes), il est sonné (relâche ${JSON.stringify(r.relache)}) : +50 %, anneau ivoire`);
    if (OUT) { await page.evaluate(() => window.__gardiens18.dbg().render()); await page.screenshot({ path: join(OUT, 'g18-B-relache.png') }); }
    ok(!errs.length, 'B (relâche) : aucune erreur de script ' + errs.slice(0, 2).join(' | '));
    await ctx.close(); }
  { const { page, errs, ctx } = await ouvre('');
    await page.evaluate(() => { const B = window.__brume; B.SAVE.mem = B.SAVE.mem || {}; });
    const r = await page.evaluate(() => { const G = window.__gardiens18, B = window.__brume; G.essai(4, { cls: 'lum', dieu: true }); B.SAVE.mem.adapt = Object.assign(B.SAVE.mem.adapt || {}, { lum: 1.2 });
      window.__pas(5, () => B.room.boss && B.room.started); const e = B.room.boss; let nu = false; window.__pas(30, () => { if (e.rawT > 0) { nu = true; return true; } return false; });
      return { adapt: e.adapt, nu }; });
    ok(r.adapt >= 1 && r.nu, `B : Accoutumance héritée (niveau ${r.adapt}) : sa fenêtre « à nu » s'ouvre (${r.nu})`);
    ok(!errs.length, 'B (Accoutumance) : aucune erreur de script ' + errs.slice(0, 2).join(' | '));
    await ctx.close(); }
}

// ══════════════════════════════════════════════════════════════════════════════
if (SEC.includes('C')) {
  console.log('\n══ C · aucun coup sans signe : quatre formes × trois paliers au bot ══');
  let tot = 0, sans = 0;
  for (const palier of ['normal', 'difficile', 'extreme']) for (const cls of ['lum', 'gou', 'her', 'tis']) {
    const { page, errs, ctx } = await ouvre('');
    await essai(page, { cls, dieu: true, bot: 2, ref: true, palier });
    const r = await page.evaluate(() => { const B = window.__brume, G = window.__gardiens18, e = B.room.boss, t0 = B.RUN.time; window.__pas(90, () => e.dead); const j = G.journal();
      return { dur: B.RUN.time - t0, mort: e.dead, coups: j.coups.length, sans: j.sansSigne, lances: j.lances, sautes: j.sautes, temps: j.temps.map(x => x.temps), pv: e.hp / e.maxHp, mauvais: j.coups.filter(c => !c.signe).slice(0, 3) }; });
    tot += r.coups; sans += r.sans;
    ok(r.sans === 0 && r.lances > 0, `C : ${palier} · ${cls} : ${r.coups} coups reçus, ${r.sans} sans signe ; ${r.lances} gestes, ${r.sautes} sautés ; ${r.mort ? `vaincu en ${r.dur.toFixed(0)} s` : `${Math.round(r.pv * 100)} % de PV à 90 s`} (temps ${r.temps.join(', ') || '—'})${r.mauvais.length ? ' ' + JSON.stringify(r.mauvais) : ''}`);
    ok(!errs.length, `C : ${palier} · ${cls} : aucune erreur de script ` + errs.slice(0, 2).join(' | '));
    await ctx.close(); }
  console.log(`   ${tot} coups reçus, ${sans} sans signe`);
}

// ══════════════════════════════════════════════════════════════════════════════
if (SEC.includes('G')) {
  console.log('\n══ G · règle d’or : chaque image du canevas, avant / après, trois paliers, gardien éteint puis allumé ══');
  const NF = +(process.env.BANC_IMAGES || 180), AVANT_REV = process.env.BANC_AVANT || 'e397615';
  const APRES = readFileSync(process.env.BANC_APRES || join(THEMIST, 'index.html'), 'utf8');
  const AVANT = process.env.BANC_TEMOIN ? APRES : execSync(`git -C ${JSON.stringify(THEMIST)} show ${AVANT_REV}:themist/index.html`, { maxBuffer: 64 << 20 }).toString('utf8');
  function HORLOGE(seed) {
    const mk = s => () => { s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    const G = window.__hg = { mk, combat: mk(seed), dessin: mk(seed ^ 0x9e3779b9), raf: [], now: 1000 };
    Math.random = () => G.combat(); performance.now = () => G.now; Date.now = () => 1767225600000 + G.now;
    window.requestAnimationFrame = cb => { G.raf.push(cb); return G.raf.length; }; window.cancelAnimationFrame = () => {};
    try { localStorage.clear(); } catch (e) {}
  }
  function DEDANS() {
    const G = window.__hg, H = window.__hgo = {};
    const r0 = render; render = function () { const k = Math.random; Math.random = () => G.dessin(); try { return r0.apply(this, arguments); } finally { Math.random = k; } };
    H.graine = s => { G.combat = G.mk(s); G.dessin = G.mk(s ^ 0x9e3779b9); };
    H.pas = () => { G.now += 1000 / 60; frame(G.now); G.raf.length = 0; };
    H.hash = () => { const d = ctx.getImageData(0, 0, cv.width, cv.height).data, u = new Uint32Array(d.buffer); let h = 2166136261, g = 0; for (let i = 0; i < u.length; i++) { h = Math.imul(h ^ u[i], 16777619); g = (g + u[i] * (i + 1)) >>> 0; } return (h >>> 0).toString(36) + (g >>> 0).toString(36); };
    H.calme = () => { MSGQ.length = 0; hintPaused = false; msgCur = null; if (overlayEl.hidden && state === 'play') paused = false; };
    H.vider = () => { const o = overlayEl; if (o.hidden) return; const b = o.querySelector('#bok') || o.querySelector('.card:not([disabled])') || o.querySelector('button.primary:not([disabled])') || [...o.querySelectorAll('button:not([disabled])')].find(b => !/reroll|quit|mute|hub|again/.test(b.id)); if (b) b.click(); };
    const ent = t => { closeOverlay(); queue.length = 0; trans = null; fade = 0; doEnter(t); };
    H.regle = (cls, palier, seed, nf) => {
      const out = []; let i = 0;
      const salle = (nom, fn) => { H.graine(seed * 1000 + (i++)); fn(); const hs = [];
        for (let f = 0; f < nf; f++) { H.calme(); if (!overlayEl.hidden && state !== 'title' && f % 15 === 14) H.vider(); H.pas(); if (P && !P.dead && state === 'play') P.hp = P.s.maxHp; hs.push(H.hash()); }
        out.push({ nom, etat: state, type: room && room.type, gardeK: room && room.gardeK || '', acte: typeof ACTE === 'function' ? ACTE() : 0, g18: !!(room && room.g18), hs }); };
      salle('titre', () => initTitle());
      salle('sanctuaire', () => enterHub());
      salle('combat I', () => { SAVE.descente = { v: 1, ouverts: ['normal', 'difficile', 'extreme'], choisi: palier, victoires: {} }; chosenCls = cls; startRun(); window.__descente.palier(palier); closeOverlay(); queue.length = 0; trans = null; fade = 0; });
      salle('élite I', () => ent('elite')); salle('Brèche I', () => ent('breche')); salle('halte I', () => ent('halte')); salle('autel I', () => ent('autel')); salle('colporteur I', () => ent('marchand'));
      salle('gardien I', () => ent('boss'));
      salle('combat II', () => ent('act')); salle('gardien II', () => ent('boss'));
      salle('combat III', () => ent('act3')); salle('élite III', () => ent('elite')); salle('gardien III', () => ent('boss'));
      salle('combat IV', () => ent('acte')); salle('gardien provisoire IV', () => ent('garde'));
      salle('gardien IV (salle boss)', () => ent('boss'));
      salle('miniboss X (1)', () => { RUN.acteD = 9; ent('acte'); }); salle('miniboss X (2)', () => ent('mini')); salle('boss final provisoire', () => ent('final'));
      return out; };
  }
  const ANCRE = '\nconst DEMO_CLS=';
  const instr = src => { if (!src.includes(ANCRE)) throw new Error('ancre d’injection introuvable'); return src.replace(ANCRE, `\n(${DEDANS})();${ANCRE}`); };
  const SRC = { avant: instr(AVANT), apres: instr(APRES) };
  async function joue(ver, cls, palier, seed, allume) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
    await ctx.addInitScript({ content: `(${HORLOGE})(${seed});` });
    await ctx.route(u => u.pathname.endsWith('/index.html'), r => r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: SRC[ver] }));
    if (allume) await ctx.route(u => u.pathname.endsWith('/data/gardiens-descente.js'), r => r.fulfill({ status: 200, contentType: 'text/javascript; charset=utf-8', body: ALLUME }));
    const page = await ctx.newPage(); const errs = [];
    page.on('pageerror', e => errs.push(String(e).slice(0, 300)));
    page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text().slice(0, 300)); });
    await page.goto(BASE);
    await page.waitForFunction(() => !!(window.__hgo && window.__descente && document.fonts), null, { timeout: 40000, polling: 100 });
    await page.evaluate(async () => { for (const f of ['500 19px "Grenze Gotisch"', '700 14px "Alegreya Sans"', '700 16px "Alegreya Sans"', '400 16px "Alegreya Sans"', '700 23px "Alegreya Sans"']) { try { await document.fonts.load(f); } catch (e) {} } await document.fonts.ready; });
    const r = await page.evaluate(([c, p, s, nf]) => window.__hgo.regle(c, p, s, nf), [cls, palier, seed, NF]);
    await ctx.close(); return { r, errs };
  }
  const t0 = Date.now(); let images = 0, diff = 0;
  for (const mode of (process.env.BANC_MODES || 'eteint,allume').split(',')) {
    const allume = mode === 'allume';
    for (const [k, palier] of ['normal', 'difficile', 'extreme'].entries()) {
      const cls = ['lum', 'gou', 'tis'][k], seed = 4100 + k * 7;
      const [a, b] = [await joue('avant', cls, palier, seed, false), await joue('apres', cls, palier, seed, allume)];
      ok(!a.errs.length && !b.errs.length, `G (${mode}) : ${palier} : aucune erreur (avant ${a.errs.length}, après ${b.errs.length}) ` + a.errs.concat(b.errs).slice(0, 2).join(' | '));
      for (let i = 0; i < a.r.length; i++) {
        const x = a.r[i], y = b.r[i]; let premier = -1, n = 0;
        for (let f = 0; f < Math.max(x.hs.length, y.hs.length); f++) if (x.hs[f] !== y.hs[f]) { n++; if (premier < 0) premier = f; }
        images += x.hs.length; diff += n;
        if (allume && x.nom === 'gardien IV (salle boss)') { ok(y.g18 && !x.g18 && y.type === 'boss' && n > 0, `G (allumé) : ${palier} (${cls}) · ${x.nom} : c'est le gardien de l'acte IV, et elle seule change (${n} images sur ${x.hs.length})`); continue; }
        ok(n === 0 && x.type === y.type && x.gardeK === y.gardeK && !y.g18, `G (${mode}) : ${palier} (${cls}) · ${x.nom} [${x.etat === 'title' ? 'écran titre, ' : ''}${x.type}${x.gardeK ? ' ' + x.gardeK : ''}, acte ${x.acte}] : ${x.hs.length} images identiques${n ? ` — ${n} images différentes, la première à l’image ${premier}` : ''}`);
      }
    }
  }
  console.log(`   ${images} images comparées, ${diff} différentes, ${((Date.now() - t0) / 1000).toFixed(0)} s${process.env.BANC_TEMOIN ? ' (témoin : d’après contre d’après)' : ` (avant : ${AVANT_REV})`}`);
}

// ══════════════════════════════════════════════════════════════════════════════
if (SEC.includes('H')) {
  console.log('\n══ H · repli et wiki ══');
  for (const allume of [false, true]) {
    const { page, errs, ctx } = await ouvre('', { allume });
    const r = await page.evaluate(() => { const B = window.__brume, D = window.__descente; B.cls('gou'); D.essai(4, { fin: true, cls: 'gou' });
      window.__pas(4, () => B.room.boss || (B.room.type === 'elite' && B.room.waves && B.room.waves.length));
      return { type: B.room.type, gardeK: B.room.gardeK || '', g18: !!B.room.g18, actifs: window.__gardiens18.actifs(), nom: B.room.boss && B.room.boss.name }; });
    if (!allume) ok(r.type === 'elite' && r.gardeK === 'garde' && !r.g18 && !Object.keys(r.actifs).length, `H : éteint, la dernière salle de l'acte IV est la place provisoire (${r.type} ${r.gardeK})`);
    else ok(r.type === 'boss' && r.g18 && r.actifs[4] === 'Le Guet Sans-Nom' && r.nom === 'Le Guet Sans-Nom', `H : allumé (actif:true), la porte « boss » et sa salle (${r.type}, ${r.nom})`);
    ok(!errs.length, `H (${allume ? 'allumé' : 'éteint'}) : aucune erreur de script ` + errs.slice(0, 2).join(' | '));
    await ctx.close(); }
  let chk = ''; try { chk = execSync(`node ${JSON.stringify(join(THEMIST, 'outils', 'wiki.mjs'))} --check`).toString(); } catch (e) { chk = 'ÉCHEC ' + String(e.stdout || e); }
  ok(/à jour/.test(chk), `H : wiki.mjs --check (${chk.trim().slice(0, 80)})`);
  ok(!readFileSync(join(THEMIST, 'wiki.html'), 'utf8').includes('Le Guet Sans-Nom'), 'H : le wiki ne nomme pas un gardien éteint');
}

console.log(`\nbanc-gardiens18 : ${checks} vérifications, ${fails} échec${fails > 1 ? 's' : ''}.`);
await browser.close();
process.exit(fails ? 1 : 0);
