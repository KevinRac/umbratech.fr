// Banc Chromium : action 3 du Dernier Souvenir (les 14 effets, invulnérabilité, plafonds, contrôles, Accoutumance).
// Usage : node banc-effets.mjs [port]
import { createRequire } from 'node:module';
const require = createRequire('/opt/npm-tools/node_modules/');
const { chromium } = require('playwright');
const PORT = process.argv[2] || 8765, BASE = `http://127.0.0.1:${PORT}/index.html`;
let fails = 0, checks = 0;
const ok = (c, m) => { checks++; if (!c) { fails++; console.error('ÉCHEC : ' + m); } };
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
const log = [];

async function ouvrir(url, attente) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 300)));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text().slice(0, 300)); });
  await page.goto(url);
  await page.waitForFunction(attente || (() => { try { const d = window.__asm.dbg(); return d.RUN && !d.RUN.hub && d.state === 'play'; } catch (e) { return false; } }), null, { timeout: 25000 });
  await page.waitForTimeout(300);
  // outils communs dans la page
  await page.evaluate(() => {
    const B = window.__brume, X = window.__dernier, SV = window.BRUME_DATA.souvenirs, N = window.BRUME_DATA.talents.noeuds, BRs = window.BRUME_DATA.talents.branches;
    const W = window.__T = {};
    W.B = B; W.X = X;
    // le talent de cette famille et de cette forme, le plus fort ou le plus faible
    W.talent = (f, cls, fort) => { const L = (SV.familles[f].t || []).filter(k => BRs[k.split('_')[0]].cls === cls && N[k].k !== 'c');
      if (!L.length) return null; const w = k => /_sk$/.test(k) ? 3 : N[k].k === 'k' ? 3 : N[k].k === 'x' || N[k].k === 's' ? 2 : 1; L.sort((a, b) => fort ? w(b) - w(a) : w(a) - w(b)); return L[0]; };
    W.vider = () => { for (const e of B.enemies) if (!e.dead && !e.asm && e.type !== 'boss') e.dead = true; const r = B.room; if (r) { r.spawning = []; r.cleared = false; } };
    W.creer = (type, dx, dy, o) => { const P = B.P, e = B.create(type, P.x + dx, P.y + dy, !!(o && o.elite)); if (o && o.pv) { e.maxHp = o.pv; e.hp = o.pv; } if (o && o.hp != null) e.hp = e.maxHp * o.hp; return e; };
    W.dieu = () => { B.P.iT = 99; };
    W.bruler = (id, rang, g) => { if (!X.prendre(id, rang || 1, g || 0)) { /* déjà porté */ } return X.bruler(id, { libre: true }); };
    W.pas = (s) => B.step(1 / 60, Math.round(s * 60));
    // le joueur garde ses autres talents (cloches, Volée sourde…) qui peuvent étourdir un gardien : on ne retient que l'étourdi posé par la brûlure
    W.espion = (e) => { if (e.__esp) { e.__dsStun = 0; return; } let st = e.stun || 0; e.__esp = 1; e.__dsStun = 0; e.__autre = 0;
      Object.defineProperty(e, 'stun', { configurable: true, get() { return st; }, set(v) { if (v > st) { if (/embraser|dsTick|dsHit/.test(new Error().stack)) e.__dsStun = Math.max(e.__dsStun, v); else e.__autre = Math.max(e.__autre, v); } st = v; } }); };
  });
  return { page, errs };
}

// ── A. Contre une vague ordinaire : chaque famille de chaque forme
for (const cls of ['lum', 'gou', 'her', 'tis']) {
  const { page, errs } = await ouvrir(`${BASE}?masque=fan_n2&classe=${cls}&acte=2`, () => { try { const d = window.__asm.dbg(); return d.RUN && !d.RUN.hub && d.state === 'play' && d.enemies.some(e => !e.dead && e.asm); } catch (e) { return false; } });
  const R = await page.evaluate((cls) => {
    const { B, X } = window.__T, W = window.__T, out = {};
    const P = B.P, SV = window.BRUME_DATA.souvenirs;
    // le Masqué part loin et ne bouge plus (on juge les ennemis ordinaires)
    const M = B.enemies.find(e => !e.dead && e.asm); if (M) { M.x = 1180; M.y = 120; }
    for (const f of Object.keys(SV.dernier.familles)) {
      const id = W.talent(f, cls, false); if (!id) continue;
      P.x = 640; P.y = 420; P.hp = P.s.maxHp; P.iT = 0; P.shield = 0; P.dashT = 0; W.vider();
      if (M) { M.x = 1180; M.y = 120; M.stun = 99; }
      const o = { id };
      // la scène : quatre ennemis robustes autour, un affaibli tout près, un champion affaibli tout près
      const es = [W.creer('rampant', 90, 0, { pv: 6000 }), W.creer('spectre', -150, 60, { pv: 6000 }), W.creer('rampant', 0, -200, { pv: 6000 }), W.creer('hurleur', 260, 160, { pv: 6000 }),
        W.creer('rampant', -60, -50, { pv: 3000, hp: 0.15 }), W.creer('rampant', 40, 70, { pv: 3000, hp: 0.15, elite: true })];
      const d0 = es.map(e => Math.hypot(e.x - P.x, e.y - P.y)), hp0 = es.map(e => e.hp);
      // Accoutumance : total avant
      // un projectile d'ennemi ordinaire et un tir de gardien en vol (Lumière les trie)
      const ep = window.__asm.dbg().RUN && (window.__glas && window.__glas.dbg().eproj);
      if (f === 'lumiere' && ep) { ep.push({ x: P.x + 200, y: P.y, vx: -10, vy: 0, r: 7, dmg: 1, life: 5, from: es[1] }); ep.push({ x: P.x + 220, y: P.y, vx: -10, vy: 0, r: 8, dmg: 1, life: 5, boss: true }); }
      if (f === 'soin') P.hp = P.s.maxHp * 0.3;
      const cad0 = X.cadence(), hpP0 = P.hp;
      const ref = (f === 'lumiere' || f === 'fureur' || f === 'ombre') ? B.hit(es[0], 10, { crit: false }) : 0;
      const mem = B.RUN.mem, tot0 = mem ? mem.tot : null;
      const r = W.bruler(id);
      o.refus = r.refus || ''; o.force = r.force;
      o.iT = P.iT; o.hitIT = P.hitIT;
      const h1 = P.hp; B.hurt(25); o.invuln = P.hp === h1;
      o.totInstant = mem ? Math.abs(mem.tot - tot0) < 1e-6 : null;   // les coups instantanés de la brûlure ne comptent pas
      W.dieu();
      if (f === 'lumiere' && ep) { o.dissipe = !ep.some(p => p.from === es[1] && !p.dead); o.gardeTirBoss = ep.some(p => p.boss && !p.dead); o.dissipes = r.dissipes;
        o.expose = es.every(e => e.dsExp && e.dsExp.v > 0); o.ratioExp = B.hit(es[0], 10, { crit: false }) / ref; }
      if (f === 'fureur') { o.ratioFur = B.hit(es[0], 10, { crit: false }) / ref; o.cadence = X.cadence() / cad0; }
      if (f === 'ombre') { const d = B.hit(es[0], 10, {}); o.ratioOmb = d / ref; o.critMult = P.s.critMult; o.invisible = P.invisible; }
      if (f === 'soin') o.soin = (P.hp - hpP0) / P.s.maxHp;
      if (f === 'garde') o.bouclier = P.shield / P.s.maxHp;
      if (f === 'cloche') o.stun = es.map(e => +(e.stun || 0).toFixed(2));
      if (f === 'fil') o.stun = es.map(e => +(e.stun || 0).toFixed(2));
      if (f === 'devoration') { o.avales = r.avales; o.morts = es.map(e => e.dead); }
      if (f === 'lame') { o.acheves = r.acheves; o.morts = es.map(e => e.dead); }
      if (f === 'ruee') { // une esquive qui traverse un ennemi
        const e = es[0]; P.x = e.x - 10; P.y = e.y; P.dashT = 0.15; P.dashHit = new Set(); P.dashCh = 0; W.pas(0.1); o.chargesPleines = P.dashCh === P.s.dashCharges; o.toucheEsq = r.touches; }
      if (f === 'sol') { W.pas(0.5); o.ralenti = es.slice(0, 3).map(e => +(e.slowK || 0).toFixed(2)); }
      if (f === 'onde') { const mx = es.map(() => 0); for (let k = 0; k < 30; k++) { W.pas(1 / 60); es.forEach((e, i) => { mx[i] = Math.max(mx[i], Math.hypot(e.kbx || 0, e.kby || 0)); }); } o.recul = mx.slice(0, 4).map(v => Math.round(v)); }
      if (f === 'devoration') { W.pas(0.4); o.attire = es.slice(0, 4).map((e, i) => +(Math.hypot(e.x - P.x, e.y - P.y) - d0[i]).toFixed(0)); }
      if (f === 'ombre') { W.pas(1); o.invisible1s = P.invisible; W.pas(2.3); o.invisibleFin = P.invisible; }
      if (f === 'garde') { W.pas(4.8); o.bouclier48 = P.shield / P.s.maxHp; W.pas(1.2); o.bouclierFin = P.shield / P.s.maxHp; W.pas(8); }
      else W.pas(5.2);
      o.effetsFin = X.effets().length;
      o.degats = Math.round(r.degats); o.touches = r.touches; o.surFort = Math.round(r.surFort);
      o.dmg = es.map((e, i) => Math.round(hp0[i] - Math.max(0, e.hp)));
      out[f] = o;
    }
    return out;
  }, cls);
  log.push([cls, R]);
  for (const [f, o] of Object.entries(R)) {
    const t = `${cls}/${f} (${o.id})`;
    ok(!o.refus, `${t} : refus ${o.refus}`);
    ok(o.iT >= 0.5 - 1e-9 && o.hitIT === 0 && o.invuln, `${t} : invulnérabilité à l'embrasement (iT ${o.iT}, coup ${o.invuln ? 'paré' : 'reçu'})`);
    if (o.totInstant !== null) ok(o.totInstant, `${t} : la brûlure a compté dans l'Accoutumance`);
    ok(o.effetsFin === 0, `${t} : un effet dure encore après 5 s (${o.effetsFin})`);
    if (['projectile', 'faisceau', 'lame', 'onde', 'sol', 'cloche'].includes(f)) ok(o.degats > 0 && o.touches + (f === 'sol' ? 1 : 0) > 0, `${t} : aucun dégât`);
    if (f === 'projectile') ok(o.touches >= 10, `${t} : ${o.touches} traits ont touché sur 12`);
    if (f === 'faisceau') ok(o.dmg.slice(0, 4).every(d => d > 0), `${t} : le rayon a manqué un ennemi à portée ${o.dmg}`);
    if (f === 'lame') { ok(o.morts[4] && o.acheves >= 1, `${t} : l'ennemi affaibli n'est pas achevé`); ok(!o.morts[5], `${t} : un champion a été achevé`); }
    if (f === 'ruee') ok(o.chargesPleines && o.toucheEsq >= 1, `${t} : esquive (charges ${o.chargesPleines}, touches ${o.toucheEsq})`);
    if (f === 'onde') ok(o.recul.every(d => d > 60), `${t} : recul ${o.recul}`);
    if (f === 'sol') ok(o.ralenti.every(k => k >= 0.4 - 1e-9), `${t} : ralenti ${o.ralenti}`);
    if (f === 'fil') ok(o.stun.slice(0, 5).every(s => s >= 2.4) && Math.abs(o.stun[5] - 1.5) < 0.05, `${t} : immobiles ${o.stun}`);
    if (f === 'cloche') ok(o.stun.slice(0, 5).every(s => s >= 1.1) && o.stun[5] > 0.6, `${t} : étourdis ${o.stun}`);
    if (f === 'devoration') { ok(o.avales >= 1 && o.morts[4] && !o.morts[5], `${t} : avalés ${o.avales}, champion ${o.morts[5] ? 'avalé' : 'épargné'}`); ok(o.attire.slice(0, 2).every(d => d < -5), `${t} : attirés ${o.attire}`); }
    if (f === 'lumiere') { ok(o.expose, `${t} : tous exposés`); ok(o.dissipe && o.gardeTirBoss, `${t} : tir ordinaire dissipé, tir de gardien gardé`); ok(Math.abs(o.ratioExp - 1.25) < 0.02, `${t} : +25 % sur un exposé (${o.ratioExp})`); }
    if (f === 'fureur') { ok(Math.abs(o.ratioFur - 1 - 0.4 * o.force) < 0.02 || Math.abs(o.ratioFur - 2) < 0.02, `${t} : dégâts ×${o.ratioFur}`); ok(o.cadence < 0.9, `${t} : cadence ×${o.cadence}`); }
    if (f === 'ombre') { ok(o.ratioOmb > 1.5, `${t} : critique forcé ×${o.ratioOmb}`); ok(o.invisible && o.invisible1s && !o.invisibleFin, `${t} : invisible pendant 3 s (${o.invisible}, ${o.invisible1s}, fin ${o.invisibleFin})`); }
    if (f === 'soin') ok(Math.abs(o.soin - Math.min(0.4, 0.25 * o.force)) < 0.01, `${t} : soin ${o.soin}`);
    if (f === 'garde') { ok(Math.abs(o.bouclier - Math.min(0.4, 0.3 * o.force)) < 0.01, `${t} : bouclier ${o.bouclier}`); ok(Math.abs(o.bouclier48 - o.bouclier) < 0.01 && o.bouclierFin < o.bouclier - 0.02, `${t} : le bouclier tient 5 s puis s'use (${o.bouclier48}, ${o.bouclierFin})`); }
  }
  ok(!errs.length, `${cls} : erreurs ${errs.join(' | ')}`);
  await page.close();
}

// ── B. Contre un Masqué : chaque famille, force maximale de la forme ; plafond, aucun contrôle
const ESSAI = { lum: 'ray_n4', gou: 'dif_n4', her: 'cad_n4', tis: 'aig_k1' };
for (const kind of ['porteur', 'ordinaire']) for (const cls of ['lum', 'gou', 'her', 'tis']) {
  const url = kind === 'porteur' ? `${BASE}?masque=fan_n2&classe=${cls}&acte=2` : `${BASE}?dernier=${ESSAI[cls]}&masque=1&classe=${cls}&acte=2`;
  const { page, errs } = await ouvrir(url, () => { try { const d = window.__asm.dbg(); return d.RUN && !d.RUN.hub && d.state === 'play' && d.enemies.some(e => !e.dead && e.asm); } catch (e) { return false; } });
  const porte = await page.evaluate(() => { const d = window.__asm.dbg(), m = d.enemies.find(e => !e.dead && e.asm); return !!(m && m.asm.sv); });
  ok(porte === (kind === 'porteur'), `Masqué ${kind} ${cls} : porteur ${porte}`);
  const R = await page.evaluate((cls) => {
    const { B, X } = window.__T, W = window.__T, out = {}, P = B.P, SV = window.BRUME_DATA.souvenirs;
    W.dieu(); W.pas(4.5);   // fin du montage du Masqué (3,85 s, intouchable pendant)
    for (const f of Object.keys(SV.dernier.familles)) {
      const id = W.talent(f, cls, true); if (!id) continue;
      const M = B.enemies.find(e => !e.dead && e.asm); if (!M) { out[f] = { perdu: true }; continue; }
      W.vider(); P.iT = 0; P.hp = P.s.maxHp;
      M.hp = M.maxHp * 0.5; M.stun = 0; M.kbx = M.kby = 0; M.slowK = 0; W.espion(M);
      P.x = M.x - 70; P.y = M.y + 10;   // au contact (Lame, Dévoration)
      const g = /_sk$/.test(id) || window.BRUME_DATA.talents.noeuds[id].k === 'k' ? 2 : 2;
      const hp0 = M.hp;
      const ref = (f === 'lumiere' || f === 'fureur' || f === 'ombre') ? (M.hp = M.maxHp * 0.5, B.hit(M, 10, { crit: false })) : 0; M.hp = hp0;
      const r = W.bruler(id, 1, g);
      const plaf = X.plafondDe(M, r.force);
      const o = { id, force: r.force, plaf: Math.round(plaf), refus: r.refus || '' };
      o.instant = Math.round(hp0 - M.hp);
      o.stun = +(M.__dsStun || 0).toFixed(2); o.kb = Math.round(Math.hypot(M.kbx || 0, M.kby || 0));
      W.dieu();
      // les coups d'après, boostés par la brûlure : jusqu'à épuiser le plafond
      if (f === 'lumiere' || f === 'fureur' || f === 'ombre') { let extra = 0, n = 0; const s = P.s, c = Math.min(1, s.crit), exp = f === 'ombre' ? 1 + c * (s.critMult - 1) : 1;
        for (let i = 0; i < 60; i++) { M.hp = M.maxHp * 0.5; const d = B.hit(M, 10, f === 'ombre' ? {} : { crit: false }); extra += d - ref * exp; n++; }
        o.extra = Math.round(extra); o.boost = Math.round(r.boost); }
      W.pas(5.2);
      o.surFort = Math.round(r.surFort + r.boost); o.mort = M.dead; o.slowK = +(M.slowK || 0).toFixed(2);
      out[f] = o;
      M.hp = M.maxHp * 0.5;
    }
    return out;
  }, cls);
  log.push(['masque ' + kind + ' ' + cls, R]);
  for (const [f, o] of Object.entries(R)) {
    const t = `Masqué ${kind} ${cls}/${f} (${o.id}, force ${o.force})`;
    if (o.perdu) { ok(false, `${t} : plus de Masqué`); continue; }
    ok(!o.refus, `${t} : refus ${o.refus}`);
    ok(o.surFort <= o.plaf + 1, `${t} : ${o.surFort} PV perdus pour un plafond de ${o.plaf}`);
    ok(o.instant <= o.plaf + 1, `${t} : coup instantané ${o.instant} > plafond ${o.plaf}`);
    ok(o.stun === 0, `${t} : étourdi ou immobilisé (${o.stun})`);
    if (['onde', 'devoration', 'lame', 'cloche', 'faisceau'].includes(f)) ok(o.kb === 0, `${t} : repoussé ou attiré (${o.kb})`);
    ok(!o.mort, `${t} : achevé ou avalé`);
    if (f === 'sol') ok(o.slowK === 0, `${t} : ralenti (${o.slowK})`);
    if (['projectile', 'faisceau', 'lame', 'onde', 'sol', 'fil', 'cloche', 'devoration'].includes(f)) ok(o.surFort > 0, `${t} : aucun dégât sur le Masqué`);
    if (o.extra != null) { ok(o.extra <= o.plaf + 2, `${t} : surplus des coups boostés ${o.extra} > plafond ${o.plaf}`); ok(o.boost <= o.plaf + 1 && o.boost > 0, `${t} : surplus compté ${o.boost}`); }
  }
  ok(!errs.length, `Masqué ${kind} ${cls} : erreurs ${errs.join(' | ')}`);
  await page.close();
}

// ── C. Contre les gardiens : Mère-Brume (gou), Héraut Noyé (her), Glas temps 2 (lum) et temps 3 (tis) ; verrou de phase, Reflet
const GARDIENS = [
  { nom: 'Mère-Brume', cls: 'gou', acte: 1, fam: ['faisceau', 'lame', 'onde', 'devoration', 'fureur'] },
  { nom: 'Héraut Noyé', cls: 'her', acte: 2, fam: ['cloche', 'onde', 'lame', 'sol', 'fureur'] },
  { nom: 'Glas t2', cls: 'lum', glas: 'onde', temps: 2, fam: ['faisceau', 'onde', 'lumiere', 'ombre', 'projectile'] },
  { nom: 'Glas t3', cls: 'tis', glas: 'projectile', temps: 3, fam: ['fil', 'projectile', 'sol', 'onde'] }];
for (const G of GARDIENS) {
  const url = G.glas ? `${BASE}?glas=${G.glas}&temps=${G.temps}&classe=${G.cls}` : `${BASE}`;
  const { page, errs } = await ouvrir(url, G.glas ? () => { try { const d = window.__glas.dbg(); return d.RUN && !d.RUN.hub && d.state === 'play' && d.enemies.some(e => !e.dead && e.type === 'boss'); } catch (e) { return false; } } : () => !!window.__glas);
  if (!G.glas) await page.evaluate(({ cls, acte }) => { const d = window.__glas.dbg(); d.lancer(cls); }, G);
  if (!G.glas) { await page.waitForFunction(() => { try { const d = window.__glas.dbg(); return d.RUN && !d.RUN.hub && d.state === 'play'; } catch (e) { return false; } }, null, { timeout: 20000 });
    await page.evaluate(({ acte }) => { const d = window.__glas.dbg(); d.RUN.act = acte; d.entrer('boss'); }, G);
    await page.waitForFunction(() => { try { const d = window.__glas.dbg(); return d.enemies.some(e => !e.dead && e.type === 'boss'); } catch (e) { return false; } }, null, { timeout: 20000 }); }
  const R = await page.evaluate((G) => {
    const { B, X } = window.__T, W = window.__T, out = {}, P = B.P;
    W.pas(2.5);   // fin de l'arrivée
    const boss = B.enemies.find(e => !e.dead && e.type === 'boss');
    for (const f of G.fam) {
      const id = W.talent(f, G.cls, true); if (!id) { out[f] = { manque: true }; continue; }
      P.iT = 0; P.hp = P.s.maxHp; boss.immuneT = 0; boss.stun = 0; W.espion(boss);
      const ph = boss.phase || 1, haut = [0, 0.95, 0.6, 0.3][ph];
      boss.hp = boss.maxHp * haut; boss.lockT = 0;
      P.x = boss.x; P.y = boss.y + boss.r + 60;
      const ref = (f === 'lumiere' || f === 'fureur' || f === 'ombre') ? B.hit(boss, 10, { crit: false }) : 0; boss.hp = boss.maxHp * haut;
      const hp0 = boss.hp, r = W.bruler(id, 1, 2), plaf = X.plafondDe(boss, r.force);
      const o = { id, force: r.force, plaf: Math.round(plaf), refus: r.refus || '', instant: Math.round(hp0 - boss.hp) };
      W.dieu();
      if (f === 'lumiere' || f === 'fureur' || f === 'ombre') { let extra = 0; const s = P.s, c = Math.min(1, s.crit), exp = f === 'ombre' ? 1 + c * (s.critMult - 1) : 1;
        for (let i = 0; i < 60; i++) { boss.hp = boss.maxHp * haut; boss.lockT = 0; const d = B.hit(boss, 10, f === 'ombre' ? {} : { crit: false }); extra += d - ref * exp; }
        o.extra = Math.round(extra); boss.hp = boss.maxHp * haut; }
      W.pas(5.2);
      o.surFort = Math.round(r.surFort + r.boost); o.stun = +(boss.__dsStun || 0).toFixed(2); o.autre = +(boss.__autre || 0).toFixed(2);
      out[f] = o;
    }
    // verrou de phase : une brûlure juste au-dessus du seuil ne le franchit pas
    { const fam = ['lame', 'cloche', 'onde', 'faisceau', 'fil'].find(f => W.talent(f, G.cls, true)), id = W.talent(fam, G.cls, true);
      const ph = boss.phase || 1; if (ph < 3) { const th = [0, 0.66, 0.33][ph] * boss.maxHp; boss.hp = th + 15; boss.lockT = 0; boss.immuneT = 0;
        P.x = boss.x; P.y = boss.y + boss.r + 60; const r = W.bruler(id, 1, 2); W.pas(1); out.verrou = { ok: boss.hp >= th - 1.5 && r.surFort > 0, hp: Math.round(boss.hp), th: Math.round(th), fam, touche: Math.round(r.surFort) }; } }
    out.reflet = !B.enemies.some(e => e.reflet);
    out.phase = boss.phase;
    return out;
  }, G);
  log.push([G.nom, R]);
  for (const [f, o] of Object.entries(R)) {
    if (f === 'verrou') { ok(o.ok, `${G.nom} : le verrou de phase a cédé (${o.hp} < ${o.th})`); continue; }
    if (f === 'reflet' || f === 'phase') continue;
    const t = `${G.nom}/${f} (${o.id}, force ${o.force})`;
    if (o.manque) { ok(false, `${t} : pas de talent`); continue; }
    ok(!o.refus, `${t} : refus ${o.refus}`);
    ok(o.surFort <= o.plaf + 1, `${t} : ${o.surFort} PV perdus pour un plafond de ${o.plaf}`);
    ok(o.instant <= o.plaf + 1, `${t} : coup instantané ${o.instant} > plafond ${o.plaf}`);
    if (o.extra != null) ok(o.extra <= o.plaf + 2, `${t} : surplus des coups boostés ${o.extra} > plafond ${o.plaf}`);
    if (['faisceau', 'lame', 'onde', 'cloche', 'devoration', 'sol', 'fil', 'projectile'].includes(f)) ok(o.surFort > 0, `${t} : aucun dégât`);
    ok(o.stun === 0, `${t} : étourdi (${o.stun})`);
  }
  ok(R.reflet, `${G.nom} : le Reflet est dans enemies`);
  ok(!errs.length, `${G.nom} : erreurs ${errs.join(' | ')}`);
  await page.close();
}

// ── D. Changement de salle : ce qui dure s'éteint ; mort pendant un effet
{
  const { page, errs } = await ouvrir(`${BASE}?masque=fan_n2&classe=gou&acte=2`);
  const R = await page.evaluate(() => {
    const { B, X } = window.__T, W = window.__T, P = B.P, o = {};
    W.dieu(); W.creer('rampant', 100, 0, { pv: 5000 });
    W.bruler('dif_n6'); o.avant = X.effets().join(','); const c0 = X.cadence();
    window.__glas.dbg().entrer('combat'); W.pas(0.1);
    o.apres = X.effets().length; o.cadence = X.cadence() / c0;
    return o;
  });
  log.push(['salle', R]);
  ok(R.avant === 'fureur' && R.apres === 0 && R.cadence > 1.2, `changement de salle : ${JSON.stringify(R)}`);
  ok(!errs.length, `salle : erreurs ${errs.join(' | ')}`);
  await page.close();
}

// ── E. Régression : écran titre, descente sans brûlure
{
  const { page, errs } = await ouvrir(`${BASE}`, () => !!window.__glas);
  await page.waitForTimeout(800);
  ok(!errs.length, `écran titre : ${errs.join(' | ')}`);
  await page.close();
}
await browser.close();
for (const [k, v] of log) console.log(k, JSON.stringify(v));
console.log(`\n${checks} vérifications, ${fails} échec(s)`);
process.exit(fails ? 1 : 0);
