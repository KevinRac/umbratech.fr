// Banc Chromium : les gardiens de la descente (v18.14, chantier v18, action 6.1a : le socle commun ; v18.15, action 6.1b : le Guet Sans-Nom allumé ;
// cadrage _dev/cadrages/la-brume-v18-6-gardiens-cadrage.md, Q14). Usage : node banc-gardiens18.mjs <port> [ABCDEFGH] [dossier de captures, hors dépôt]
// A · aiguillage : l'essai ?gardien=4 ouvre une vraie salle de gardien à l'acte IV, et rien du Glas Originel n'y paraît (ni sa mémoire, ni son cœur,
//     ni son glyphe, ni sa lumière qui bat, ni ses vaisseaux, ni la réserve notée à son entrée) ; son nom, ses PV, son rayon ; son sol (Q4) ; son
//     glyphe sur la porte et la barre ; ses coups (journal, la mort nomme le gardien) ; sa victoire (temps de gardien et Mémoire sous la clé de l'acte,
//     relique et phrase de l'acte, soin du palier, scène de mort à lui).
// B · temps : seuils (trois temps en Normal, quatre en Difficile et en Extrême), verrou de 1,2 s, temps de plus ; relâche (sonné, anneau ivoire) ;
//     Accoutumance (anneau de runes, fenêtre « à nu »).
// C · aucun coup sans signe : quatre formes × trois paliers au bot qui frappe (build de référence, dieu) : chaque coup reçu est signé.
// D · attaques (6.1b) : chacune jouée seule (essai attaque=) : la herse (les corps arrêtés, pas les tirs ; lui la traverse ; ses invoqués arrêtés),
//     le Contrôle (ta section), la Rafle (deux sections voisines), la Vouge (portée, renoncement), Garde ! (collé à lui), les Feuillets (ligne violette,
//     tirs qui passent les barreaux), l'Appel (par les guichets, au plus cinq), la Relève (sonné 2 s), le Couvre-feu (au plus deux herses gardées).
// E · PV au bot (6.1b, Q9) : une descente d'essai par forme (Normal, build de référence, bot qui frappe) : durée, friction (durée × DPS au mannequin
//     ÷ PV ; le DPS de memoire.md § 45) ; chacune finit.
// F · dessin (6.1b, Q7) : corps plein ≤ 1,15 × r à chaque temps ; contraste corps / sol ≥ 4,5 ; mouvements réduits (12 instants, rien ne bouge) ;
//     coût du dessin ≤ 1 ms par image (le gardien, ses herses, ses feuillets).
// G · règle d'or : l'index.html d'avant (BANC_AVANT, défaut 3f1dc75 : la v18.14) et celui d'après, chacun avec ses données des gardiens de la descente,
//     rejouent 20 salles (les 19 de banc-arene G, plus la salle « boss » de l'acte IV) dans les trois paliers, image par image : gardien ÉTEINT (servi
//     actif:false des deux côtés), aucune image ne diffère ; ALLUMÉ, seule la salle du gardien de l'acte IV diffère. BANC_IMAGES=n (180),
//     BANC_MODES=eteint,allume.
// H · repli et wiki : éteint, la dernière salle de l'acte IV est la place provisoire (porte « garde », Masqué renforcé) ; allumé, la salle du gardien ;
//     wiki.mjs --check à jour, le wiki nomme le Guet allumé ; éteint (données servies actif:false), les sections du wiki redeviennent celles de la v18.14.
import { createRequire } from 'node:module';
import { readFileSync, mkdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire('/opt/npm-tools/node_modules/');
const { chromium } = require('playwright');
const THEMIST = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PORT = process.argv[2] || 8765, SEC = (process.argv[3] || 'ABCDEFGH').toUpperCase(), OUT = process.argv[4] || null;
if (OUT) mkdirSync(OUT, { recursive: true });
const BASE = `http://127.0.0.1:${PORT}/index.html`;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', args: ['--autoplay-policy=no-user-gesture-required'] });
let checks = 0, fails = 0;
const ok = (c, msg) => { checks++; if (!c) fails++; console.log(`${c ? '  ok ' : '  ÉCHEC '} ${msg}`); };
const GD_SRC = readFileSync(join(THEMIST, 'data', 'gardiens-descente.js'), 'utf8');
const actifG = (src, v) => src.replace(/\b4:\{actif:(?:true|false),/, `4:{actif:${v},`);
const ALLUME = actifG(GD_SRC, true), ETEINT = actifG(GD_SRC, false);
async function ouvre(qs, o = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  await ctx.addInitScript(() => { window.__raf = []; window.requestAnimationFrame = cb => { window.__raf.push(cb); return 1; }; });
  if (o.allume != null) await ctx.route(u => u.pathname.endsWith('/data/gardiens-descente.js'), r => r.fulfill({ status: 200, contentType: 'text/javascript; charset=utf-8', body: o.allume ? ALLUME : ETEINT }));
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
    ok(JSON.stringify(r0.actifs) === '{"4":"Le Guet Sans-Nom"}', 'A : le Guet Sans-Nom est allumé (6.1b), les autres éteints');
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
    ok(r.nom === 'Le Guet Sans-Nom' && r.pv === 19600 && r.r === 50, `A : son nom, ses PV (règle Q9 : ${r.pv}), son rayon (${r.r}, pas les 62 du Glas)`);
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
    ok(c.coups.length > 0 && c.coups.every(x => x.signe) && ['zone', 'contact'].includes(c.coups[0].k) && c.sans === 0, `A : un coup reçu, rattaché à sa source, signé (${JSON.stringify(c.coups[0])})`);
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
      window.__pas(60, () => { const s = G.etat(); if (s.ph === 'relache') { relache = { vuln: +e.vuln.toFixed(2), releves: G.journal().releves, herses: B.room.g18s.herses.filter(h => h.etat === 'debout').length, pil: B.room.pillars.filter(p => p.herse18).length }; return true; } return false; });
      return { relache }; });
    ok(r.relache && r.relache.vuln > 1.9 && r.relache.releves === 1 && r.relache.herses === 0 && r.relache.pil === 0, `B : la Relève : après une Fermeture, ses herses relevées (plus aucun obstacle), il est sonné 2 s (${JSON.stringify(r.relache)}) : +50 %, anneau ivoire`);
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
if (SEC.includes('D')) {
  console.log('\n══ D · attaques du Guet, chacune seule ══');
  // joue une attaque seule (attaque=<id>), le joueur immobile (bot éteint) ou au bot ; rend l'état au moment voulu
  const seule = async (id, o, fn) => { const { page, errs, ctx } = await ouvre('');
    await essai(page, Object.assign({ cls: 'lum', dieu: true, attaque: id }, o || {}));
    const r = await page.evaluate(fn); ok(!errs.length, `D · ${id} : aucune erreur de script ` + errs.slice(0, 2).join(' | ')); await ctx.close(); return r; };
  // la herse : annoncée (couloirs orange, un guichet), tombée : obstacle des corps, pas des tirs ; lui la traverse ; ses invoqués arrêtés ; relevée
  { const r = await seule('herse', {}, () => { const B = window.__brume, G = window.__gardiens18, D = G.dbg(), s = B.room.g18s, e = B.room.boss;
      const ann = window.__pas(8, () => s.herses.some(h => h.etat === 'annonce')); const h = s.herses[0]; const zones = s.zones.filter(z => z.herse === h).length;
      window.__pas(4, () => h.etat === 'debout'); const pil = B.room.pillars.filter(p => p.herse18 === h);
      const d = pil[Math.floor(pil.length / 2)], P = B.P; const out = { ann, zones, guichets: h.guichets.length, pil: pil.length, debout: h.etat === 'debout' };
      // un corps (toi) poussé hors des barreaux ; un tir n'y est pas arrêté
      P.x = d.x; P.y = d.y; D.step(1 / 60); out.pousse = Math.hypot(P.x - d.x, P.y - d.y) >= d.r + P.r - 0.5;
      out.tirPasse = !D.hitsWall(d.x, d.y, 2);
      // lui : collideEnemy ne le pousse pas hors de sa herse ; un Rampant, si
      const ex = e.x, ey = e.y; e.x = d.x; e.y = d.y; D.collide(e); out.luiPasse = Math.hypot(e.x - d.x, e.y - d.y) < 1; e.x = ex; e.y = ey;
      const rp = D.creer('rampant', d.x, d.y); D.collide(rp); out.rampantArrete = Math.hypot(rp.x - d.x, rp.y - d.y) >= d.r + rp.r - 0.5; rp.dead = true;
      window.__pas(10, () => s.ph === 'relache'); out.releve = s.ph === 'relache' && !B.room.pillars.some(p => p.herse18) && +e.vuln.toFixed(1);
      return out; });
    ok(r.ann && r.zones >= 1 && r.guichets === 1, `D · herse : annoncée (${r.zones} couloir(s) orange, ${r.guichets} guichet)`);
    ok(r.debout && r.pil > 20, `D · herse : tombée, ${r.pil} barreaux d'obstacle`);
    ok(r.pousse && r.tirPasse, `D · herse : arrête les corps (tu es repoussé hors des barreaux : ${r.pousse}), pas les tirs (${r.tirPasse})`);
    ok(r.luiPasse && r.rampantArrete, `D · herse : lui la traverse (${r.luiPasse}) ; un Sans-Nom est arrêté (${r.rampantArrete})`);
    ok(r.releve >= 1.9, `D · herse : la Relève : ses herses relevées, sonné (${r.releve} s)`); }
  // le Contrôle : ta section, sortie au détour (par le guichet) ; la Rafle : deux sections voisines, la seconde 0,6 s plus tard, en pointillé
  { const r = await seule('controle', { bot: 2 }, () => { const B = window.__brume, s = B.room.g18s, P = B.P; let z = null, sec = null;
      window.__pas(10, () => { const c = s.zones.find(q => q.id === 'controle' && !q.fait); if (c && !z) { z = Object.assign({}, c); sec = [P.x, P.y]; return true; } return false; });
      const dans = z && sec[0] >= z.x0 - 8 && sec[0] <= z.x1 + 8 && sec[1] >= z.y0 - 8 && sec[1] <= z.y1 + 8;
      window.__pas(2, () => s.zones.every(q => q.fait)); const j = window.__gardiens18.journal(); return { z: !!z, dans, charge: z && z.charge, touche: j.coups.filter(c => c.id === 'controle').length, sans: j.sansSigne }; });
    ok(r.z && r.dans && r.charge >= 1.2 - 1e-9, `D · Contrôle : ta section s'emplit d'orange (préavis ${r.charge} s)`);
    ok(r.touche <= 1 && r.sans === 0, `D · Contrôle : le bot passe le guichet (${r.touche} coup reçu au plus un : le bot n'est pas parfait), aucun coup sans signe`); }
  { const r = await seule('rafle', { bot: 2, temps: 2 }, () => { const B = window.__brume, s = B.room.g18s; let Z = null;
      window.__pas(12, () => { const L = s.zones.filter(q => q.id === 'rafle' || (q.id === 'controle' && q.forme === 'case')); if (L.length && !Z) { Z = L.map(q => ({ x0: q.x0, y0: q.y0, x1: q.x1, y1: q.y1, charge: q.charge, pt: !!q.pointille, id: q.id })); return true; } return false; });
      window.__pas(3, () => s.zones.every(q => q.fait)); const j = window.__gardiens18.journal(); return { Z, sans: j.sansSigne, coups: j.coups.filter(c => c.id === 'rafle').length }; });
    const Z = r.Z || []; const adj = Z.length === 2 && (Z[0].x1 === Z[1].x0 || Z[1].x1 === Z[0].x0 || Z[0].y1 === Z[1].y0 || Z[1].y1 === Z[0].y0);
    ok(Z.length === 2 && adj && !Z[0].pt && Z[1].pt && Math.abs(Z[1].charge - Z[0].charge - 0.6) < 1e-6, `D · Rafle : deux sections voisines, la seconde en pointillé, 0,6 s plus tard (${JSON.stringify(Z.map(z => [z.pt, z.charge]))})`);
    ok(r.sans === 0, `D · Rafle : aucun coup sans signe (${r.coups} reçus)`); }
  // la Vouge : à portée, un cône ; hors de portée, il s'approche puis renonce
  { const r = await seule('vouge', {}, () => { const B = window.__brume, s = B.room.g18s, e = B.room.boss, P = B.P; P.x = e.x + 90; P.y = e.y + 30; let cone = null;
      window.__pas(4, () => { const c = s.zones.find(q => q.id === 'vouge'); if (c) { cone = { ouv: Math.round(c.ouv * 180 / Math.PI), r1: c.r1, charge: c.charge }; return true; } return false; });
      return { cone }; });
    ok(r.cone && r.cone.ouv === 110 && r.cone.r1 === 160 && r.cone.charge >= 0.8 - 1e-9, `D · Vouge : à portée, un cône de 110°, 160 px, préavis ${r.cone && r.cone.charge} s`); }
  { const r = await seule('vouge', {}, () => { const B = window.__brume, s = B.room.g18s, e = B.room.boss, P = B.P, G = window.__gardiens18; e.spd = 0;
      P.x = e.x > 640 ? 120 : 1160; P.y = 600; window.__pas(6, () => (G.journal().renonces || 0) > 0); return { renonces: G.journal().renonces || 0, zones: s.zones.length }; });
    ok(r.renonces >= 1, `D · Vouge : hors de portée, il s'approche puis renonce (${r.renonces})`); }
  { const r = await seule('vouge', { temps: 3 }, () => { const B = window.__brume, s = B.room.g18s, e = B.room.boss, P = B.P; P.x = e.x + 90; P.y = e.y + 30; let L = null;
      window.__pas(4, () => { const c = s.zones.filter(q => q.id === 'vouge'); if (c.length) { L = c.map(q => [+(q.a).toFixed(3), q.charge, !!q.pointille]); return true; } return false; }); return { L }; });
    ok(r.L && r.L.length === 2 && Math.abs(Math.abs(r.L[1][0] - r.L[0][0]) - 70 * Math.PI / 180) < 0.01 && Math.abs(r.L[1][1] - r.L[0][1] - 0.5) < 1e-6 && r.L[1][2], `D · Vouge (troisième temps) : aller et retour, deux cônes à 70° d'écart, 0,5 s (${JSON.stringify(r.L)})`); }
  // Garde ! : collé à lui 2,5 s, il plante sa vouge (disque de 130 px autour de lui)
  { const r = await seule('vouge', {}, () => { const B = window.__brume, s = B.room.g18s, e = B.room.boss, P = B.P, G = window.__gardiens18; let g = null;
      window.__pas(6, () => { P.x = e.x + 70; P.y = e.y; P.iT = 1; const z = s.zones.find(q => q.id === 'garde'); if (z) { g = { r: z.r, dx: Math.round(z.x - e.x), charge: z.charge }; return true; } return false; });
      return { g, colles: G.journal().colles || 0 }; });
    ok(r.g && r.g.r === 130 && r.g.dx === 0 && r.g.charge >= 0.9 - 1e-9 && r.colles >= 1, `D · Garde ! : collé à lui, un disque de 130 px autour de lui (${JSON.stringify(r.g)}, ${r.colles})`); }
  // les Feuillets : n lignes violettes ≥ 0,6 s, puis des tirs qui passent les barreaux ; un coup de page est signé (tir)
  { const r = await seule('feuillets', { temps: 2 }, () => { const B = window.__brume, s = B.room.g18s, D = window.__gardiens18.dbg(); let n = 0, ch = 0;
      window.__pas(6, () => { if (s.tirs.length) { n = s.tirs.length; ch = s.tirs[0].charge; return true; } return false; });
      window.__pas(2, () => D.eproj().some(p => p.g18f)); const pages = D.eproj().filter(p => p.g18f).length;
      window.__pas(6); const j = window.__gardiens18.journal(); return { n, ch, pages, tirs: j.coups.filter(c => c.k === 'tir').map(c => c.signe), sans: j.sansSigne }; });
    ok(r.n === 5 && r.ch >= 0.6 - 1e-9 && r.pages === 5, `D · Feuillets : cinq lignes violettes (${r.ch} s), puis cinq pages (${r.pages})`);
    ok(r.tirs.length >= 1 && r.tirs.every(x => x) && r.sans === 0, `D · Feuillets : le joueur immobile est touché, coup signé « tir » (${JSON.stringify(r.tirs)})`); }
  // l'Appel : les Sans-Nom entrent par les guichets d'une herse debout, au plus cinq vivants
  { const r = await seule('appel', { temps: 3 }, () => { const B = window.__brume, s = B.room.g18s, D = window.__gardiens18.dbg(); const g18 = B.room.g18;
      // une herse debout d'abord (pour les guichets)
      window.__pas(8, () => B.room.spawning.length > 0); const sp = B.room.spawning.map(x => [Math.round(x.x), Math.round(x.y), x.type]);
      for (let k = 0; k < 6; k++) { s.ph = 'entracte'; s.t = 0; window.__pas(1.2); }
      const viv = D.ens().filter(o => !o.dead && o.type !== "boss" && !o.fixed).length + B.room.spawning.length; return { sp, viv }; });
    ok(r.sp.length === 3 && r.sp.every(x => ['rampant', 'voile'].includes(x[2])), `D · Appel : trois Sans-Nom (Rampants et Voilés) au troisième temps (${JSON.stringify(r.sp)})`);
    ok(r.viv <= 5, `D · Appel : au plus cinq vivants (${r.viv})`); }
  { const r = await seule('croisee', { temps: 2 }, () => { const B = window.__brume, s = B.room.g18s; window.__pas(8, () => s.herses.filter(h => h.etat === 'debout').length === 2 && s.fer && s.fer.ph !== 'herse');
      s.file = ['appel']; s.ph = 'entracte'; s.t = 0; window.__pas(1, () => B.room.spawning.length > 0);
      const G = s.herses.flatMap(h => h.guichets.map(g => h.o === 'v' ? [h.c, g] : [g, h.c]));
      return { n: B.room.spawning.length, parGuichet: B.room.spawning.every(x => G.some(q => Math.hypot(q[0] - x.x, q[1] - x.y) < 1)) }; });
    ok(r.n >= 1 && r.parGuichet, `D · Appel : avec des herses debout, ils entrent par les guichets (${r.n})`); }
  // le Couvre-feu (Difficile, quatrième temps) : après une Relève, des herses restent debout (au plus deux) ; la Relève dure 1,5 s
  { const r = await seule('croisee', { palier: 'difficile', temps: 4, bot: 2 }, () => { const B = window.__brume, s = B.room.g18s, e = B.room.boss; const L = [];
      for (let k = 0; k < 4; k++) { window.__pas(14, () => s.ph === 'relache'); L.push({ debout: s.herses.filter(h => h.etat === 'debout').length, vuln: +e.vuln.toFixed(2) }); window.__pas(2, () => s.ph !== 'relache'); }
      return { L, temps: s.temps }; });
    ok(r.temps === 4 && r.L.length === 4 && r.L.every(x => x.debout >= 1 && x.debout <= 2 && x.vuln <= 1.5 + 1e-6 && x.vuln > 1.3), `D · Couvre-feu : des herses restent debout après chaque Relève (au plus deux), sonné 1,5 s (${JSON.stringify(r.L)})`); }
}

// ══════════════════════════════════════════════════════════════════════════════
if (SEC.includes('E')) {
  console.log('\n══ E · PV au bot (Normal, build de référence) ══');
  const DPS = { lum: 553.6, gou: 333.6, her: 450.2, tis: 112.3 }, fr = [];   // memoire.md, § 45 (mannequin, acte IV)
  for (const cls of ['lum', 'gou', 'her', 'tis']) {
    const { page, errs, ctx } = await ouvre('');
    await essai(page, { cls, dieu: true, bot: 2, ref: true });
    const r = await page.evaluate(() => { const B = window.__brume, e = B.room.boss, t0 = B.RUN.time; window.__pas(400, () => e.dead); return { dur: B.RUN.time - t0, mort: e.dead, pv: e.maxHp }; });
    const f = r.dur * DPS[cls] / r.pv; fr.push(f);
    ok(r.mort && r.pv === 19600, `E · ${cls} : vaincu en ${r.dur.toFixed(1)} s (friction ${f.toFixed(2)})`);
    ok(!errs.length, `E · ${cls} : aucune erreur de script ` + errs.slice(0, 2).join(' | '));
    await ctx.close(); }
  const m = fr.slice().sort((a, b) => a - b); console.log(`   friction médiane ${((m[1] + m[2]) / 2).toFixed(2)} (formes : ${fr.map(x => x.toFixed(2)).join(' · ')})`);
}

// ══════════════════════════════════════════════════════════════════════════════
if (SEC.includes('F')) {
  console.log('\n══ F · dessin du Guet ══');
  const { page, errs, ctx } = await ouvre('');
  await essai(page, { cls: 'lum', dieu: true });
  const r = await page.evaluate(() => { const G = window.__gardiens18, g = G.GD[4], r = g.rayon, out = { plein: {}, contraste: {} };
    const lum = (a, b, c) => { const f = v => { v /= 255; return v > 0.04045 ? ((v + 0.055) / 1.055) ** 2.4 : v / 12.92; }; return 0.2126 * f(a) + 0.7152 * f(b) + 0.0722 * f(c); };
    const med = L => { const s = L.slice().sort((a, b) => a - b); return s[s.length >> 1]; };
    // le sol de sa salle (le canevas du sol, sous la brume)
    const B = window.__brume, cv = B.room.canvas, o = cv.getContext('2d'), d = o.getImageData(200, 200, 600, 300).data, Ls = []; for (let i = 0; i < d.length; i += 16) Ls.push(lum(d[i], d[i + 1], d[i + 2])); const sol = med(Ls);
    for (const t of [1, 2, 3, 4]) { const I = G.guet.img(t, r), D = I.cv.getContext('2d').getImageData(0, 0, I.cv.width, I.cv.height).data; let m = 0; const Lc = [];
      for (let y = 0; y < I.cv.height; y++) for (let x = 0; x < I.cv.width; x++) { const k = (y * I.cv.width + x) * 4; if (D[k + 3] > 200) { const wx = I.x0 + x / I.k, wy = I.y0 + y / I.k; m = Math.max(m, Math.hypot(wx, wy)); Lc.push(lum(D[k], D[k + 1], D[k + 2])); } }
      out.plein['t' + t] = +(m / r).toFixed(3); out.contraste['t' + t] = +((med(Lc) + 0.05) / (sol + 0.05)).toFixed(2); }
    out.sol = sol; return out; });
  for (const k in r.plein) ok(r.plein[k] <= 1.15, `F : corps plein ${k} : ${r.plein[k]} × r (≤ 1,15)`);
  for (const k in r.contraste) ok(r.contraste[k] >= 4.5, `F : contraste corps / sol ${k} : ${r.contraste[k]} (≥ 4,5)`);
  // coût : le gardien, ses herses debout (une Croix) et ses feuillets, 200 images sur un canevas caché, contre le canevas vide
  const cout = await page.evaluate(() => { const G = window.__gardiens18, B = window.__brume, D = G.dbg(), s = B.room.g18s, e = B.room.boss;
    const cv = document.createElement('canvas'); cv.width = 1280; cv.height = 720; const c = cv.getContext('2d');
    const H = [{ o: 'v', c: 500, etat: 'debout', t: 9, segs: [[92, 300], [420, 676]] }, { o: 'h', c: 420, etat: 'debout', t: 9, segs: [[56, 380], [500, 1224]] }];
    const n = 200, t0 = performance.now(); for (let i = 0; i < n; i++) c.clearRect(0, 0, 1280, 720); const vide = performance.now() - t0;
    const t1 = performance.now(); for (let i = 0; i < n; i++) { c.clearRect(0, 0, 1280, 720); for (const h of H) G.guet.herse(c, h); G.guet.apercu(c, { x: 640, y: 300, temps: 2, t: i / 60 }); } const plein = performance.now() - t1;
    return { ms: (plein - vide) / n }; });
  ok(cout.ms <= 1, `F : coût du dessin (gardien, deux herses, feuillets) : ${cout.ms.toFixed(3)} ms par image (≤ 1 ms)`);
  ok(!errs.length, 'F : aucune erreur de script ' + errs.slice(0, 2).join(' | '));
  await ctx.close();
  // mouvements réduits : douze instants, le gardien (avec feuillets et page du Couvre-feu) dessiné à l'identique
  { const c2 = await browser.newContext({ viewport: { width: 1280, height: 720 }, reducedMotion: 'reduce' }); const p2 = await c2.newPage(); const e2 = [];
    p2.on('pageerror', e => e2.push(String(e))); await p2.goto(BASE); await p2.waitForFunction(() => !!window.__gardiens18, null, { timeout: 30000 });
    const rm = await p2.evaluate(() => { const G = window.__gardiens18, cv = document.createElement('canvas'); cv.width = 300; cv.height = 360; const c = cv.getContext('2d'); const H = [];
      for (const t of [0, 0.3, 0.7, 1.1, 1.6, 2.2, 2.9, 3.4, 4.0, 5.5, 7.1, 9.0]) { c.clearRect(0, 0, 300, 360); G.guet.apercu(c, { x: 150, y: 220, temps: 4, t }); const d = c.getImageData(0, 0, 300, 360).data; let h = 0; for (let i = 0; i < d.length; i += 7) h = (h * 31 + d[i]) >>> 0; H.push(h); }
      return { distincts: new Set(H).size, rm: matchMedia('(prefers-reduced-motion: reduce)').matches }; });
    ok(rm.rm && rm.distincts === 1, `F : mouvements réduits : douze instants, une seule image (${rm.distincts} distinctes)`);
    ok(!e2.length, 'F (mouvements réduits) : aucune erreur de script');
    await c2.close(); }
}

// ══════════════════════════════════════════════════════════════════════════════
if (SEC.includes('G')) {
  console.log('\n══ G · règle d’or : chaque image du canevas, avant / après, trois paliers, gardien éteint puis allumé ══');
  const NF = +(process.env.BANC_IMAGES || 180), AVANT_REV = process.env.BANC_AVANT || '3f1dc75';
  // chaque côté a ses propres données des gardiens de la descente (celles de son commit), servies éteintes ou allumées selon le mode
  const GD_AV = process.env.BANC_TEMOIN ? GD_SRC : execSync(`git -C ${JSON.stringify(THEMIST)} show ${AVANT_REV}:themist/data/gardiens-descente.js`, { maxBuffer: 16 << 20 }).toString('utf8');
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
    await ctx.route(u => u.pathname.endsWith('/data/gardiens-descente.js'), r => r.fulfill({ status: 200, contentType: 'text/javascript; charset=utf-8', body: actifG(ver === 'avant' ? GD_AV : GD_SRC, !!allume) }));
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
      const [a, b] = [await joue('avant', cls, palier, seed, allume), await joue('apres', cls, palier, seed, allume)];
      ok(!a.errs.length && !b.errs.length, `G (${mode}) : ${palier} : aucune erreur (avant ${a.errs.length}, après ${b.errs.length}) ` + a.errs.concat(b.errs).slice(0, 2).join(' | '));
      for (let i = 0; i < a.r.length; i++) {
        const x = a.r[i], y = b.r[i]; let premier = -1, n = 0;
        for (let f = 0; f < Math.max(x.hs.length, y.hs.length); f++) if (x.hs[f] !== y.hs[f]) { n++; if (premier < 0) premier = f; }
        images += x.hs.length; diff += n;
        if (allume && x.nom === 'gardien IV (salle boss)') { ok(y.g18 && x.g18 && y.type === 'boss' && n > 0, `G (allumé) : ${palier} (${cls}) · ${x.nom} : c'est le gardien de l'acte IV, et elle seule change (${n} images sur ${x.hs.length})`); continue; }
        ok(n === 0 && x.type === y.type && x.gardeK === y.gardeK && !y.g18 && !x.g18, `G (${mode}) : ${palier} (${cls}) · ${x.nom} [${x.etat === 'title' ? 'écran titre, ' : ''}${x.type}${x.gardeK ? ' ' + x.gardeK : ''}, acte ${x.acte}] : ${x.hs.length} images identiques${n ? ` — ${n} images différentes, la première à l’image ${premier}` : ''}`);
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
  ok(readFileSync(join(THEMIST, 'wiki.html'), 'utf8').includes('id="gardien-4"'), 'H : le wiki nomme le Guet allumé (sa sous-section)');
  // éteint : le wiki généré avec les données servies actif:false redevient celui de la v18.14 (sections « La descente », « Les gardiens » et le codex)
  { const tmp = join('/tmp', 'banc-g18-wiki-' + process.pid), sh = c => execSync(c, { stdio: 'pipe' }).toString();
    sh(`rm -rf ${tmp} && mkdir -p ${tmp}/outils ${tmp}/data && cp -r ${JSON.stringify(join(THEMIST, 'data'))}/. ${tmp}/data/ && cp ${JSON.stringify(join(THEMIST, 'outils'))}/*.mjs ${tmp}/outils/ && cp -r ${JSON.stringify(join(THEMIST, 'img'))} ${tmp}/img`);
    const { writeFileSync: wf } = await import('node:fs'); wf(join(tmp, 'data', 'gardiens-descente.js'), ETEINT);
    const v1814 = execSync(`git -C ${JSON.stringify(THEMIST)} show 3f1dc75:themist/wiki.html`, { maxBuffer: 64 << 20 }).toString('utf8'); wf(join(tmp, 'wiki.html'), v1814);
    try { sh(`node ${tmp}/outils/wiki.mjs`); } catch (e) {}
    const apres = readFileSync(join(tmp, 'wiki.html'), 'utf8');
    const sec = (h, id) => { const i = h.indexOf(`<section class="sec" id="${id}"`); return i < 0 ? null : h.slice(i, h.indexOf('</section>', i)); };
    const frag = (h, n) => { const m = h.match(new RegExp(`<!-- gen:${n} -->([\\s\\S]*?)<!-- /gen:${n} -->`)); return m ? m[1] : null; };
    for (const id of ['descente', 'gardiens']) ok(sec(apres, id) && sec(apres, id) === sec(v1814, id), `H : éteint, la section « ${id} » du wiki est exactement celle de la v18.14`);
    ok(frag(apres, 'codex') != null && frag(apres, 'codex') === frag(v1814, 'codex') && !apres.includes('Le Guet Sans-Nom'), 'H : éteint, le codex est celui de la v18.14 et le Guet n\'est nommé nulle part');
    sh(`rm -rf ${tmp}`); }
}

console.log(`\nbanc-gardiens18 : ${checks} vérifications, ${fails} échec${fails > 1 ? 's' : ''}.`);
await browser.close();
process.exit(fails ? 1 : 0);
