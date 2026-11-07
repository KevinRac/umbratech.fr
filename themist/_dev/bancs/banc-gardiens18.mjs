// Banc Chromium : les gardiens de la descente (v18.14, chantier v18, action 6.1a : le socle commun ; v18.15, action 6.1b : le Guet Sans-Nom allumé ;
// cadrage _dev/cadrages/la-brume-v18-6-gardiens-cadrage.md, Q14). Usage : node banc-gardiens18.mjs <port> [ABCDEFGHI] [dossier de captures, hors dépôt]
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
// I · relecture (6.1c, v18.16 ; memoire.md § 46), un essai par constat : C1 le guichet n'est pas frappé (contre-épreuve : à 3 px des barreaux, il l'est) ;
//     C2 « Recommencer » défait l'essai (allumé : la vraie salle au temps 1, sans bot ; éteint : la place provisoire revient) ; C4 les pages en vol ne
//     sont plus les orbes du Glas (contre-épreuve sans leur marque) ; C5 la ligne couvre tout le vol ; C13 le miroir à ±20 px ; C6 le recul ne traverse
//     pas une herse (contre-épreuve : 40 px d'un coup la traversent), et aucun recul sans coup porté ; C7 la carte des chemins suit les herses ; C9, C11,
//     C12, C21 en mouvements réduits et sans (éclat, titres fixes, sa mort tournée comme lui, sa lumière à l'entrée et à sa mort) ; C14 le Voilé ; C16
//     l'Appel ; C15, C22, C23, H1 une mort au Guet (répliques, journal « face au », acte IV, palier inconnu ignoré). A (6.1c, C3) : en essai, ni bossFirst,
//     ni Résonance, ni Portail, ni fragment, ni codex ; la vraie victoire (RUN.essai à 0) les écrit. F (6.1c, C10) : le corps plein mesuré aussi sur le
//     rendu complet (ombre, feuillets, page du Couvre-feu ; miroir ; quatre instants).
import { createRequire } from 'node:module';
import { readFileSync, mkdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire('/opt/npm-tools/node_modules/');
const { chromium } = require('playwright');
const THEMIST = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PORT = process.argv[2] || 8765, SEC = (process.argv[3] || 'ABCDEFGHIK').toUpperCase(), OUT = process.argv[4] || null;
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
    // 6.1c : en Normal, la descente n'est plus une descente d'essai (RUN.essai à 0, le gardien reste là) : une vraie victoire ; en Difficile, un essai :
    // ni bossFirst, ni fragment, ni Résonance, ni Portail (C3)
    const r = await page.evaluate((vraie) => { const B = window.__brume, G = window.__gardiens18, D = G.dbg(), e = B.room.boss; B.P.hp = B.P.s.maxHp * 0.5; const hp0 = B.P.hp;
      if (vraie) B.RUN.essai = 0; const res0 = JSON.stringify(B.SAVE.res || {}), fr0 = (B.SAVE.mem.frags || []).length;
      for (let k = 0; k < 400 && !e.dead; k++) { D.hit(e, 600, { crit: false }); for (let i = 0; i < 6; i++) B.step(1 / 60, 1); }
      const mort = !!(B.room.g18s && B.room.g18s.mort); for (let i = 0; i < 30; i++) B.step(1 / 60, 1); D.pump();
      const ov = document.querySelector('#overlay'), titre = ov && !ov.hidden ? ov.textContent.slice(0, 200) : '';
      return { dead: e.dead, bossT: B.RUN.bossT && B.RUN.bossT[4], bossT3: B.RUN.bossT && B.RUN.bossT[3], first: B.SAVE.mem.bossFirst && B.SAVE.mem.bossFirst[4], perfect: B.RUN.mem.perfect.slice(), hurt: B.RUN.mem.bossHurt,
        hp0, hp: B.P.hp, max: B.P.s.maxHp, mort, overlay: titre, cleared: B.room.cleared, res: JSON.stringify(B.SAVE.res || {}) === res0, frags: (B.SAVE.mem.frags || []).length === fr0, codex: !!B.SAVE.flags.g18_4 }; }, palier === 'normal');
    ok(r.dead && r.mort, `A (${palier}) : vaincu, sa scène de mort à lui (pas celle du Glas)`);
    ok(r.bossT > 0 && r.bossT3 == null, `A (${palier}) : le temps de gardien sous la clé IV (${r.bossT && r.bossT.toFixed(1)} s), rien sous la clé III`);
    if (palier === 'normal') ok(r.first === 1 && r.codex, `A (${palier}, vraie victoire) : premier gardien vaincu sous la clé IV (fragment, Résonance), son entrée de codex`);
    else ok(r.first == null && r.res && r.frags && !r.codex, `A (${palier}, essai, C3) : ni bossFirst (${r.first}), ni Résonance ni Portail (res ${r.res ? 'inchangé' : 'changé'}), ni fragment, ni codex`);
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
  // 6.1c (C10) : sur le RENDU COMPLET (ombre, image cuite, feuillets, page du Couvre-feu ; avec et sans miroir, à plusieurs instants), rien au-delà de
  // 1,15 × r ne dépasse 35 % d'opacité (α ≤ 89) ; l'image cuite seule ne le voyait pas (deux calques voilés posés l'un sur l'autre, l'ombre sous l'eau)
  const rc = await page.evaluate(() => { const G = window.__gardiens18, r = G.GD[4].rayon, cv = document.createElement('canvas'); cv.width = 400; cv.height = 400; const c = cv.getContext('2d', { willReadFrequently: true }), out = {};
    for (const t of [1, 2, 3, 4]) { let am = 0; for (const mir of [false, true]) for (const tt of [0, 0.7, 1.3, 2.9]) { c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, 400, 400); G.guet.apercu(c, { x: 200, y: 220, temps: t, mir, t: tt, debris: false });
        const d = c.getImageData(0, 0, 400, 400).data; for (let y = 0; y < 400; y++) for (let x = 0; x < 400; x++) { if (Math.hypot(x + 0.5 - 200, y + 0.5 - 220) / r <= 1.15) continue; am = Math.max(am, d[(y * 400 + x) * 4 + 3]); } }
      out['t' + t] = +(am / 255).toFixed(3); } return out; });
  for (const k in rc) ok(rc[k] <= 0.35 + 1e-9, `F (6.1c) : rendu complet ${k} (ombre, feuillets, page ; miroir ; quatre instants) : au-delà de 1,15 × r, ${rc[k]} d'opacité au plus (≤ 0,35)`);
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
  const NF = +(process.env.BANC_IMAGES || 180), AVANT_REV = process.env.BANC_AVANT || 'ec6a62f';   // 6.2b-1 : contre la v18.16 (avant : 3f1dc75, la v18.14)
  // chaque côté a ses propres données des gardiens de la descente (celles de son commit), servies éteintes ou allumées selon le mode
  const GD_AV = process.env.BANC_TEMOIN ? GD_SRC : execSync(`git -C ${JSON.stringify(THEMIST)} show ${AVANT_REV}:themist/data/gardiens-descente.js`, { maxBuffer: 16 << 20 }).toString('utf8');
  // 6.2b-1 : si le Guet existait déjà avant (essai:false), sa salle allumée doit être identique des deux côtés (règle d'or du Guet)
  const GUET_AVANT = /\b4:\{actif:(?:true|false),essai:false/.test(GD_AV);
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
      salle('gardien V (salle boss, éteinte)', () => { RUN.acteD = 5; ent('boss'); });   // 6.2b-1 : la Passeuse éteinte n'y est pas
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
        if (allume && x.nom === 'gardien IV (salle boss)' && GUET_AVANT) { ok(y.g18 && x.g18 && y.type === 'boss' && n === 0, `G (allumé) : ${palier} (${cls}) · ${x.nom} : le Guet, identique à ${AVANT_REV} (${x.hs.length} images${n ? `, ${n} différentes, la première à l'image ${premier}` : ''})`); continue; }
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

// ══════════════════════════════════════════════════════════════════════════════
// I · relecture indépendante (6.1c, v18.16 ; memoire.md § 46) : un essai par constat corrigé, avec sa contre-épreuve quand elle se joue en jeu
if (SEC.includes('I')) {
  console.log('\n══ I · relecture (6.1c) ══');
  // une herse annoncée, puis tombée, dans un essai attaque=herse ; rend la herse
  const herse = (etat) => `(() => { const B = window.__brume, s = B.room.g18s; let h = null; window.__pas(8, () => { h = s.herses.find(q => q.etat === '${etat}'); return !!h; }); return h; })()`;
  // C1 : un corps dans le guichet, qui ne touche aucun barreau, n'est pas frappé par la chute ; à 3 px du bord des barreaux, il l'est (contre-épreuve)
  for (const [ecart, frappe] of [[14, false], [20, false], [3, true]]) {
    const { page, errs, ctx } = await ouvre('');
    await essai(page, { cls: 'lum', dieu: true, attaque: 'herse' });
    const r = await page.evaluate(([ecart, src]) => { const B = window.__brume, G = window.__gardiens18, s = B.room.g18s, HS = B.room.g18.herse; const h = eval(src); if (!h) return null;
      const q = h.guichets[0], t = q - HS.guichet / 2 + B.P.r + ecart - B.P.r, pose = () => { if (h.o === 'v') { B.P.x = h.c; B.P.y = t; } else { B.P.x = t; B.P.y = h.c; } B.P.iT = 0; B.P.dashT = 0; };
      const n0 = G.journal().coups.filter(c => c.id === 'herse').length; window.__pas(3, () => { pose(); return h.etat === 'debout'; });
      return { touche: G.journal().coups.filter(c => c.id === 'herse').length - n0, etat: h.etat }; }, [ecart, herse('annonce')]);
    ok(r && r.etat === 'debout' && (r.touche > 0) === frappe, `I · C1 : dans le guichet, à ${ecart} px du bord des barreaux : ${frappe ? 'frappé (le corps chevauche les barreaux : contre-épreuve)' : 'pas frappé'} (${r && r.touche} coup)`);
    ok(!errs.length, 'I · C1 : aucune erreur de script ' + errs.slice(0, 2).join(' | ')); await ctx.close(); }
  // C2 : l'essai ne vaut que pour sa descente : « Recommencer » défait le temps, le bot, dieu, le mannequin ; allumé, la vraie salle du Guet commence au temps 1 ;
  // éteint, la place provisoire revient (ACTD[4].boss remis)
  for (const allume of [true, false]) {
    const { page, errs, ctx } = await ouvre('', { allume });
    await essai(page, { cls: 'lum', dieu: true, bot: 2, temps: 3 });
    const r = await page.evaluate(() => { const B = window.__brume, G = window.__gardiens18, D = G.dbg(), A0 = { temps: B.room.g18s.temps, bot: D.ST.bot, boss: D.RUN && window.__descente && null };
      const boss0 = !!B.room.boss && B.room.boss.hp;
      B.start(); const ST = G.dbg().ST, apres = { force: ST.force, run: ST.run, bot: ST.bot, dieu: ST.dieu, mannequin: ST.mannequin, att: ST.essai_attaque, essai: B.RUN.essai };
      const descente = window.__descente.dbg ? window.__descente.dbg() : {}; const RUN = B.RUN; RUN.acteD = 4; const ici = !!G.ici();
      return { A0, apres, ici, actd: window.__gardiens18.dbg().actd4() || null }; });
    const a = r.apres;
    ok(r.A0.temps === 3 && r.A0.bot === 2, `I · C2 (${allume ? 'allumé' : 'éteint'}) : l'essai joue au temps 3, bot 2`);
    ok(a.force == null && a.run == null && a.bot === 0 && a.dieu === false && a.mannequin === false && a.att == null && !a.essai, `I · C2 (${allume ? 'allumé' : 'éteint'}) : la descente suivante défait l'essai (${JSON.stringify(a)})`);
    ok(allume ? r.ici && r.actd === 'Le Guet Sans-Nom' : !r.ici && r.actd == null, `I · C2 (${allume ? 'allumé' : 'éteint'}) : ${allume ? 'le Guet garde l\'acte IV' : 'la place provisoire revient (ACTD[4].boss vide)'} (ici ${r.ici}, ACTD ${r.actd})`);
    if (allume) { const v = await page.evaluate(() => { const B = window.__brume, G = window.__gardiens18; B.RUN.acteD = 4; window.__asm.dbg().entrer('boss'); window.__pas(5, () => B.room.boss && B.room.started); const e = B.room.boss, s = B.room.g18s;
        const x0 = B.P.x, y0 = B.P.y; window.__pas(1); return { g18: !!B.room.g18, temps: s && s.temps, plein: e && e.hp === e.maxHp && e.maxHp < 1e8, bouge: Math.hypot(B.P.x - x0, B.P.y - y0) }; });
      ok(v.g18 && v.temps === 1 && v.plein && v.bouge < 1, `I · C2 : la vraie salle du Guet après l'essai : temps ${v.temps}, PV pleins, aucun bot (déplacement ${v.bouge.toFixed(1)} px)`); }
    ok(!errs.length, 'I · C2 : aucune erreur de script ' + errs.slice(0, 2).join(' | ')); await ctx.close(); }
  // C4 : les pages en vol sont des pages (parchemin au liseré violet), pas les orbes du Glas ; contre-épreuve : sans la marque g18f, l'orbe lavande revient
  { const { page, errs, ctx } = await ouvre('');
    await essai(page, { cls: 'lum', dieu: true, attaque: 'feuillets', temps: 2 });
    const r = await page.evaluate(() => { const B = window.__brume, G = window.__gardiens18, D = G.dbg(); let p = null; window.__pas(6, () => { p = D.eproj().find(q => q.g18f); return !!p && Math.hypot(p.x - B.room.boss.x, p.y - B.room.boss.y) > 90; }); if (!p) return null;
      const cv = document.querySelector('canvas'), px = () => { D.render(); const c = cv.getContext('2d'), k = cv.width / 1280, d = c.getImageData(Math.round(p.x * k), Math.round(p.y * k), 1, 1).data; return [d[0], d[1], d[2]]; };
      const a = px(), f = p.g18f; delete p.g18f; const b = px(); p.g18f = f; return { a, b }; });
    const lab = rgb => { const f = v => { v /= 255; return v > 0.04045 ? ((v + 0.055) / 1.055) ** 2.4 : v / 12.92; }; const [R, Gg, Bb] = rgb.map(f); const X = (R * 0.4124 + Gg * 0.3576 + Bb * 0.1805) / 0.95047, Y = R * 0.2126 + Gg * 0.7152 + Bb * 0.0722, Z = (R * 0.0193 + Gg * 0.1192 + Bb * 0.9505) / 1.08883; const h = t => t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116; return [116 * h(Y) - 16, 500 * (h(X) - h(Y)), 200 * (h(Y) - h(Z))]; };
    const dE = (x, y) => { const A = lab(x), B2 = lab(y); return Math.hypot(A[0] - B2[0], A[1] - B2[1], A[2] - B2[2]); };
    ok(r && dE(r.a, [255, 245, 255]) > 25 && dE(r.a, [255, 250, 235]) > 25, `I · C4 : une page en vol (pixel ${r && r.a}) : loin du cœur blanc des tirs du Glas et de l'ivoire (ΔE ${r && dE(r.a, [255, 245, 255]).toFixed(1)})`);
    ok(r && dE(r.b, [255, 245, 255]) < dE(r.a, [255, 245, 255]) - 10, `I · C4 (contre-épreuve) : sans sa marque, drawEproj la dessine en orbe du Glas (pixel ${r && r.b})`);
    ok(!errs.length, 'I · C4 : aucune erreur de script ' + errs.slice(0, 2).join(' | ')); await ctx.close(); }
  // C5, C13 : la ligne d'une page couvre tout son vol (a.len, arrêtée au mur) ; le miroir a une marge de ±20 px
  { const { page, errs, ctx } = await ouvre('');
    await essai(page, { cls: 'lum', dieu: true, mannequin: true });
    const r = await page.evaluate(() => { const G = window.__gardiens18, D = G.dbg(), a = G.GD[4].attaques.feuillets, e = { x: 600 }, P = D.P, m = [];
      for (const x of [560, 595, 610, 625, 605, 570]) { P.x = x; m.push(D.miroir(e)); }
      return { l1: D.lgTir({ x: 160, y: 300, a: 0 }, a), l2: D.lgTir({ x: 600, y: 300, a: 0 }, a), l3: D.lgTir({ x: 600, y: 300, a: Math.PI / 2 }, a), len: a.len, m }; });
    ok(r.l1 === r.len && r.l1 > 839 && Math.abs(r.l2 - (1224 - 600)) < 1e-6 && Math.abs(r.l3 - (676 - 300)) < 1e-6, `I · C5 : la ligne violette couvre tout le vol (${r.l1} px depuis x 160 ; ${r.l2.toFixed(0)} et ${r.l3.toFixed(0)} px : arrêtée au mur)`);
    ok(JSON.stringify(r.m) === '[true,true,true,false,false,true]', `I · C13 : le miroir ne bascule qu'au-delà de ±20 px (${JSON.stringify(r.m)})`);
    ok(!errs.length, 'I · C5 : aucune erreur de script ' + errs.slice(0, 2).join(' | ')); await ctx.close(); }
  // C6 : collé à une herse, le recul du contact ne la fait pas traverser ; sans coup porté (invulnérable), aucun recul ; contre-épreuve : 40 px d'un coup la traversent
  { const { page, errs, ctx } = await ouvre('');
    await essai(page, { cls: 'lum', dieu: true, attaque: 'herse' });
    const r = await page.evaluate((src) => { const B = window.__brume, s = B.room.g18s, e = B.room.boss, P = B.P; const h = eval(src); if (!h) return null;
      const u = () => h.o === 'v' ? P.x - h.c : P.y - h.c, place = () => { const t = (h.segs[0][0] + h.segs[0][1]) / 2; if (h.o === 'v') { P.x = h.c + 25; P.y = t; e.x = P.x + e.r + P.r - 4; e.y = t; } else { P.y = h.c + 25; P.x = t; e.y = P.y + e.r + P.r - 4; e.x = t; } };
      const D = window.__gardiens18.dbg();
      s.contactT = 0; P.iT = 0; place(); window.__pas(1 / 60); const u1 = u();
      s.contactT = 0; P.iT = 5; place(); const c0 = s.contactT, x0 = P.x, y0 = P.y; window.__pas(1 / 60); const sans = { d: Math.hypot(P.x - x0, P.y - y0), c: s.contactT === c0 };
      P.iT = 5; e.x = 1000; e.y = 600; place(); e.x = 1100; e.y = 600; if (h.o === 'v') P.x -= 40; else P.y -= 40; window.__pas(1 / 60); const u3 = u();
      return { u1, sans, u3 }; }, herse('debout'));
    ok(r && r.u1 > 0, `I · C6 : collé à la herse, le recul ne la fait pas traverser (côté ${r && r.u1.toFixed(1)} px)`);
    ok(r && r.sans.d < 1 && r.sans.c, `I · C6 : sans coup porté (invulnérable), ni recul ni délai consommé (${r && r.sans.d.toFixed(1)} px)`);
    ok(r && r.u3 < 0, `I · C6 (contre-épreuve) : un saut de 40 px d'un coup traverse la herse (côté ${r && r.u3.toFixed(1)} px)`);
    ok(!errs.length, 'I · C6 : aucune erreur de script ' + errs.slice(0, 2).join(' | ')); await ctx.close(); }
  // C7 : la carte des chemins (FF) suit les herses à chaque image (au bot, 60 s au temps 2, deux formes)
  for (const cls of ['lum', 'gou']) {
    const { page, errs, ctx } = await ouvre('');
    await essai(page, { cls, dieu: true, bot: 2, temps: 2 });
    const r = await page.evaluate(() => { const B = window.__brume, FF = window.__v175.FF, a = { x0: 56, y0: 92, x1: 1224, y1: 676 }; let cmp = 0, stale = 0;
      for (let f = 0; f < 60 * 60; f++) { window.__vide(); B.step(1 / 60, 1); const e = B.room.boss; if (!e || e.dead || B.P.dead) break; if (e.hp < e.maxHp * 0.36) e.hp = e.maxHp * 0.6;
        // une reconstruction demandée (CAM.ff) se fait au prochain qui lit la carte : seule une carte tenue pour à jour compte
        const n = B.room.pillars.length; if (!(FF.room === B.room && FF.n === n && n) || window.__gardiens18.dbg().ffAttend()) continue; cmp++; let diff = 0;
        for (let rr = 0; rr < 36; rr++) for (let c = 0; c < 64; c++) { const x = (c + 0.5) * 20, y = (rr + 0.5) * 20; let b = x < a.x0 + 15 || x > a.x1 - 15 || y < a.y0 + 15 || y > a.y1 - 15;
          if (!b) for (const p of B.room.pillars) if (Math.hypot(x - p.x, y - p.y) < p.r + 15) { b = true; break; } if ((FF.blk[rr * 64 + c] ? 1 : 0) !== (b ? 1 : 0)) diff++; }
        if (diff) stale++; }
      return { cmp, stale }; });
    ok(r.cmp > 200 && r.stale === 0, `I · C7 (${cls}) : la carte des chemins suit les herses (${r.cmp} images comparées, ${r.stale} périmées)`);
    ok(!errs.length, 'I · C7 : aucune erreur de script ' + errs.slice(0, 2).join(' | ')); await ctx.close(); }
  // C9, C11, C12, C21 : en mouvements réduits puis sans : l'éclat du changement de temps (à sa teinte, aucun en mouvements réduits), son titre fixe,
  // sa lumière qui grandit à l'entrée et décroît à sa mort, sa mort tournée comme il l'était
  for (const rm of [false, true]) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, reducedMotion: rm ? 'reduce' : 'no-preference' });
    await ctx.addInitScript(() => { window.__raf = []; window.requestAnimationFrame = cb => { window.__raf.push(cb); return 1; }; });
    const page = await ctx.newPage(), errs = []; page.on('pageerror', e => errs.push(String(e).slice(0, 300)));
    await page.goto(BASE); await page.waitForFunction(() => !!(window.__gardiens18 && window.__brume && window.__brume.step && window.__descente), null, { timeout: 30000 });
    await page.evaluate(() => { const q = window.__raf.splice(0); for (const f of q) f(performance.now()); window.__vide = () => { const o = document.querySelector('#overlay'); if (!o.hidden) { const b = o.querySelector('#bok') || o.querySelector('.card:not([disabled])') || o.querySelector('button.primary:not([disabled])'); if (b) b.click(); } };
      window.__pas = (s, f) => { const B = window.__brume; for (let i = 0; i < Math.max(1, Math.round(s * 60)); i++) { window.__vide(); B.step(1 / 60, 1); if (f && f()) return true; } return false; };
      // la vraie boucle (horloge du dessin T, rendu) : des images de 1/60 s
      window.__t = performance.now(); window.__boucle = (s, f) => { for (let i = 0; i < Math.max(1, Math.round(s * 60)); i++) { window.__vide(); window.__t += 1000 / 60; const q = window.__raf.splice(0); for (const g of q) g(window.__t); if (f && f()) return true; } return false; }; });
    const r = await page.evaluate(() => { const B = window.__brume, G = window.__gardiens18, D = G.dbg(); G.essai(4, { cls: 'lum', dieu: true, mannequin: false, attaque: 'garde' });
      const lu = []; window.__boucle(5, () => { if (!B.room.started) { const L = D.cl().filter(l => l.c === 'g18_4'); lu.push(L.length ? Math.round(L[0].r) : 0); } return B.room.boss && B.room.started; });
      const e = B.room.boss, s = B.room.g18s, tit0 = D.titre();
      D.hit(e, e.hp - e.maxHp * 0.6, { crit: false }); window.__pas(0.1); const tl = D.tlights().map(l => l.c), t1 = D.titre(), y1 = t1 && t1.y; window.__pas(1); const t2 = D.titre();
      const raw = D.nums().filter(n => n.k === 'raw' && typeof n.v === 'string').map(n => n.v);
      B.P.x = e.x - 200; window.__boucle(0.2); const mir = e.mir18; for (let k = 0; k < 200 && !e.dead; k++) { D.hit(e, 2000, { crit: false }); window.__pas(0.1); }
      const m = s.mort, lm = []; for (let i = 0; i < 10; i++) { const L = D.cl().filter(l => l.c === 'g18_4'); lm.push(L.length ? Math.round(L[0].r) : 0); window.__boucle(0.2); }
      return { lu, tit0: tit0 && tit0.txt, tl, t1: t1 && t1.txt, fixe: !!t2 && t2.y === y1, raw, mir, mmir: m && m.mir, lm, rm: matchMedia('(prefers-reduced-motion: reduce)').matches }; });
    const L = rm ? 'mouvements réduits' : 'sans réglage';
    ok(r.rm === rm, `I (${L}) : le réglage est lu`);
    ok(rm ? !r.tl.includes('g18_4') && !r.tl.includes('rage') : r.tl.includes('g18_4') && !r.tl.includes('rage'), `I · C9 (${L}) : l'éclat du changement de temps ${rm ? 'absent' : 'à sa teinte (g18_4), pas « rage »'} (${JSON.stringify(r.tl)})`);
    ok(r.tit0 === 'Qui va là ?' && r.t1 === 'Il ne te reconnaît pas' && r.fixe && !r.raw.some(v => /Qui va|reconnaît/.test(v)), `I · C11 (${L}) : sa phrase d'entrée et le titre du temps, fixes (plus de chiffre qui monte) (${r.tit0} / ${r.t1})`);
    const croit = r.lu.filter(v => v > 0), dec = r.lm;
    ok(croit.length > 3 && croit[0] < croit[croit.length - 1] && croit[0] < 100, `I · C21 (${L}) : sa lumière grandit pendant l'entrée (${croit.slice(0, 3).join(', ')} … ${croit[croit.length - 1]})`);
    ok(dec[0] > 0 && dec.every((v, i) => !i || v <= dec[i - 1]) && dec[dec.length - 1] === 0, `I · C21 (${L}) : elle décroît pendant sa mort (${dec.join(', ')})`);
    ok(r.mir === true && r.mmir === true, `I · C12 (${L}) : sa mort est tournée comme il l'était (miroir ${r.mir} → ${r.mmir})`);
    ok(!errs.length, `I (${L}) : aucune erreur de script ` + errs.slice(0, 2).join(' | ')); await ctx.close(); }
  // C14, C16 : un Voilé ne cligne pas à travers une herse ; les Sans-Nom d'un Appel naissent décalés le long du guichet
  { const { page, errs, ctx } = await ouvre('');
    await essai(page, { cls: 'lum', dieu: true, attaque: 'herse' });
    const r = await page.evaluate((src) => { const B = window.__brume, G = window.__gardiens18, D = G.dbg(), s = B.room.g18s, P = B.P; const h = eval(src); if (!h) return null;
      const t = (h.segs[0][0] + h.segs[0][1]) / 2, cote = (x, y) => Math.sign(h.o === 'v' ? x - h.c : y - h.c);
      if (h.o === 'v') { P.x = h.c - 120; P.y = t; } else { P.y = h.c - 120; P.x = t; }
      const v = D.creer('voile', h.o === 'v' ? h.c + 80 : t, h.o === 'v' ? t : h.c + 80); v.state = 'blink'; v.t = 0.45; v.bx = h.o === 'v' ? h.c - 60 : t; v.by = h.o === 'v' ? t : h.c - 60;
      const avant = cote(v.bx, v.by); window.__pas(1 / 60); const apres = cote(v.bx, v.by), reste = v.bx === v.x && v.by === v.y;
      D.ST.essai_attaque = 'appel'; s.file = []; s.ph = 'entracte'; s.t = 0; const n0 = B.room.spawning.length; window.__pas(0.05);
      const sp = B.room.spawning.slice(n0).map(q => [Math.round(q.x), Math.round(q.y)]);
      return { avant, apres, reste, sp, cv: cote(v.x, v.y), voiles: G.journal().voiles || 0 }; }, herse('debout'));
    ok(r && r.avant === -1 && (r.apres === r.cv || r.reste) && r.voiles >= 1, `I · C14 : le Voilé ne cligne pas à travers la herse (arrivée ${r && r.apres}, son côté ${r && r.cv}${r && r.reste ? ', il reste' : ''})`);
    ok(r && r.sp.length >= 2 && new Set(r.sp.map(q => q.join())).size === r.sp.length, `I · C16 : les Sans-Nom d'un Appel naissent à des points distincts du guichet (${r && JSON.stringify(r.sp)})`);
    ok(!errs.length, 'I · C14 : aucune erreur de script ' + errs.slice(0, 2).join(' | ')); await ctx.close(); }
  // C15, C22, C23, H1 : une mort au Guet (dieu=0) : les répliques le nomment, le journal dit « face au Guet Sans-Nom » et l'acte IV ; un palier inconnu est ignoré
  { const { page, errs, ctx } = await ouvre('');
    await essai(page, { cls: 'lum', dieu: false, palier: 'zzz', attaque: 'garde' });
    const r = await page.evaluate(() => { const B = window.__brume, palier = B.RUN.palierD; for (let k = 0; k < 2400 && !B.P.dead; k++) { const e = B.room.boss; B.P.x = e.x + 40; B.P.y = e.y + 10; B.P.iT = 0; window.__pas(1 / 60); }
      window.__pas(4); const j = B.SAVE.mem.journal && B.SAVE.mem.journal[0], ov = document.querySelector('#overlay');
      const V = window.__gardiens18.dbg().V7FOE(); return { palier, mort: B.P.dead, j: j && j.t, foe: V.g18_4, brx: V.brumeux, ov: ov && !ov.hidden ? ov.textContent : '' }; });
    ok(r.palier === 'normal', `I · C22 : palier=zzz ignoré (palier ${r.palier})`);
    ok(r.foe === 'le Guet Sans-Nom' && r.brx === 'le Brumeux', `I · C15 : les répliques le nomment (« ${r.foe} », « ${r.brx} »), plus « la Brume » ni « undefined »`);
    ok(r.mort && /face au Guet Sans-Nom/.test(r.j || '') && /acte IV/.test(r.j || ''), `I · C23 : le journal (« ${r.j} »)`);
    ok(!/Acte III, salle/.test(r.ov) && !/undefined/.test(r.ov), `I · H1 : la fin de descente ne dit ni « Acte III » ni « undefined »`);
    ok(!errs.length, 'I · C23 : aucune erreur de script ' + errs.slice(0, 2).join(' | ')); await ctx.close(); }
}

// ══════════════════════════════════════════════════════════════════════════════
// K · le courant (6.2b-1, v18.17 ; fiche _dev/cadrages/la-brume-v18-6-2-passeuse-fiche.md, Q29, Q38, Q39) : la Passeuse éteinte, ouverte par l'essai
// (?gardien=5) avec ses deux gestes d'essai (le Bief et l'Abordage). K-A aiguillage (sa salle à l'acte V, rien du Glas, aucun obstacle) ; K-B temps et
// Échouage ; K-C aucun coup sans signe (quatre formes × trois paliers, bot qui compense) ; K-D la poussée (par pas, une collision à chaque pas, le mur,
// un pilier, la contre-épreuve d'un saut unique ; ses invoqués emportés, elle non) ; K-E mouvements réduits (flèches figées) ; K-F l'essai ne déteint
// pas (la descente suivante : ni courant, ni poussée ; rien d'écrit en essai) ; K-H éteinte, la place provisoire de l'acte V et le wiki sans son nom.
if (SEC.includes('K')) {
  console.log('\n══ K · le courant : la Passeuse d’essai (acte V) ══');
  const essai5 = (page, o) => page.evaluate(o => { const G = window.__gardiens18, B = window.__brume; const r = G.essai(5, o); window.__pas(5, () => B.room.boss && B.room.started); return { r, boss: !!B.room.boss }; }, o);
  // K-A
  { const { page, errs, ctx } = await ouvre('');
    await essai5(page, { cls: 'lum', dieu: true });
    await page.waitForFunction(() => !!window.__gardiens18.dbg().g27GlypheImg(3), null, { timeout: 10000 }).catch(() => {});
    const r = await page.evaluate(() => { const B = window.__brume, G = window.__gardiens18, D = G.dbg(), room = B.room, e = room.boss; D.hud(); const hud = document.querySelector('#hBossGlyph');
      return { actifs: G.actifs(), type: room.type, g18: !!room.g18, theme: room.theme, piliers: room.pillars.length, acte: window.__descente.dbg().acte, registre: B.RUN.act,
        nom: e.name, pv: e.maxHp, r: e.r, glas: !!room.glas, reserveGlas: B.RUN.memoire && B.RUN.memoire.reserveGlas, porte: !!D.g27GlypheImg(3), hud: hud && !hud.hidden && /svg/.test(hud.src), courants: G.courant.biefs().length }; });
    ok(JSON.stringify(r.actifs) === '{"4":"Le Guet Sans-Nom"}', 'K-A : la Passeuse est éteinte (seul le Guet est allumé)');
    ok(r.type === 'boss' && r.g18 && r.acte === 5 && r.registre === 3 && r.nom === 'La Passeuse' && r.pv === 19600 && r.r === 48, `K-A : l'essai ouvre sa salle à l'acte V (${r.type}, ${r.nom}, ${r.pv} PV, r ${r.r}, registre ${r.registre})`);
    ok(r.theme === 'eauxmortes' && r.piliers === 0, `K-A : son sol (${r.theme}) ; aucun obstacle dans sa salle (${r.piliers} piliers : la carte des chemins n'a rien à suivre)`);
    ok(!r.glas && !r.reserveGlas && r.porte && r.hud, `K-A : rien du Glas (mémoire ${r.glas}, réserve ${!!r.reserveGlas}) ; son glyphe sur la porte et la barre`);
    ok(!errs.length, 'K-A : aucune erreur de script ' + errs.slice(0, 2).join(' | ')); await ctx.close(); }
  // K-B : temps (trois en Normal, quatre en Difficile), la Traversée puis l'Échouage (sonnée 2 s, anneau ivoire)
  for (const palier of ['normal', 'difficile']) { const { page, errs, ctx } = await ouvre('');
    await essai5(page, { cls: 'gou', dieu: true, palier, attaque: 'traversee' });
    const r = await page.evaluate(() => { const B = window.__brume, G = window.__gardiens18, e = B.room.boss, vu = { annonce: 0, coule: 0, zone: 0, vuln: 0, nu: 0 }; let echoue = false;
      window.__pas(14, () => { const b = G.courant.biefs()[0], s = G.etat(); if (b) vu[b.ph] = (vu[b.ph] || 0) + 1; if (s.zones.some(z => z.id === 'abordage')) vu.zone++;
        if (s.ph === 'relache' && e.vuln > 0) { vu.vuln++; if (window.__gardiens.G27.aNu(e, 1)) vu.nu++; echoue = true; } return false; });
      return { seuils: e.seuils18, vu, echoue, j: G.journal() }; });
    ok(palier === 'normal' ? r.seuils.length === 2 : r.seuils.length === 3 && r.seuils[2] === 0.18, `K-B : ${palier} : ${r.seuils.length + 1} temps (${r.seuils.join(' / ')})`);
    ok(r.vu.annonce > 0 && r.vu.coule > 0 && r.vu.zone > 0, `K-B : ${palier} : la Traversée : le bief s'annonce (${r.vu.annonce} images), coule (${r.vu.coule}), puis l'Abordage (${r.vu.zone})`);
    ok(r.echoue && r.vu.nu > 0 && (r.j.echouages || 0) >= 1, `K-B : ${palier} : l'eau retombée, l'Échouage : sonnée, à nu (${r.j.echouages || 0} fois, anneau ivoire ${r.vu.nu} images)`);
    ok(!errs.length, `K-B : ${palier} : aucune erreur de script ` + errs.slice(0, 2).join(' | ')); await ctx.close(); }
  // K-C : aucun coup sans signe, au bot qui compense (BANC_K_SANS_C=1 pour le sauter)
  if (!process.env.BANC_K_SANS_C) { let tot = 0, sans = 0, auCourant = 0;
    for (const palier of ['normal', 'difficile', 'extreme']) for (const cls of ['lum', 'gou', 'her', 'tis']) {
      const { page, errs, ctx } = await ouvre('');
      await essai5(page, { cls, dieu: true, bot: 2, ref: true, palier });
      const r = await page.evaluate(() => { const B = window.__brume, G = window.__gardiens18, e = B.room.boss, t0 = B.RUN.time; window.__pas(70, () => e.dead); const j = G.journal();
        return { dur: B.RUN.time - t0, mort: e.dead, coups: j.coups.length, sans: j.sansSigne, cour: j.coups.filter(c => c.c > 0).length, lances: j.lances, sautes: j.sautes, biefs: j.biefs || 0, ech: j.echouages || 0, pv: e.hp / e.maxHp, mauvais: j.coups.filter(c => !c.signe).slice(0, 3) }; });
      tot += r.coups; sans += r.sans; auCourant += r.cour;
      ok(r.sans === 0 && r.biefs > 0, `K-C : ${palier} · ${cls} : ${r.coups} coups reçus (${r.cour} dans un courant), ${r.sans} sans signe ; ${r.biefs} biefs, ${r.lances} gestes, ${r.sautes} sautés, ${r.ech} échouages ; ${r.mort ? `vaincue en ${r.dur.toFixed(0)} s` : `${Math.round(r.pv * 100)} % de PV à 70 s`}${r.mauvais.length ? ' ' + JSON.stringify(r.mauvais) : ''}`);
      ok(!errs.length, `K-C : ${palier} · ${cls} : aucune erreur de script ` + errs.slice(0, 2).join(' | '));
      await ctx.close(); }
    console.log(`   ${tot} coups reçus (${auCourant} dans un courant), ${sans} sans signe`); }
  // K-D : la poussée
  { const { page, errs, ctx } = await ouvre('');
    await essai5(page, { cls: 'lum', dieu: true, mannequin: true });
    const r = await page.evaluate(() => { const B = window.__brume, G = window.__gardiens18, D = G.dbg(), P = D.P, room = B.room, AR = { x0: 56, y0: 92, x1: 1224, y1: 676 }, out = {};
      const j1 = (AR.y0 + (AR.y1 - AR.y0) / 4 * 1.5);   // le milieu de la rangée 1
      // a. à 90 px/s pendant 1 s, ton corps avance de 90 px dans le sens du courant (personne ne touche aux touches)
      G.courant.vider(); G.courant.poser('h', 1, 1, 90, 60); P.x = 300; P.y = j1; P.vx = 0; P.vy = 0; const x0 = P.x; window.__pas(1); out.avance = P.x - x0; out.dy = Math.abs(P.y - j1);
      // b. contre le mur : il s'arrête au mur
      P.x = 1150; window.__pas(3); out.mur = P.x; out.murMax = AR.x1 - P.r;
      // c. contre un barreau (r 10) : par pas, il s'arrête devant ; d'un seul saut de 40 px (contre-épreuve), il le traverse
      const bar = { x: 600, y: j1, r: 10 }; room.pillars.push(bar); P.x = 560; P.y = j1; window.__pas(2); out.devant = P.x < bar.x; out.xb = P.x;
      P.x = 585; G.courant.pousse(40 / 90); out.parPas = P.x < bar.x;
      P.x = 585; P.x += 40; D.colP(); out.saut = P.x > bar.x;
      room.pillars.splice(room.pillars.indexOf(bar), 1);
      // d. ses invoqués sont emportés ; elle, non
      const o = D.creer('rampant', 300, j1); o.spd = 0; const ox = o.x, e = room.boss, ex = e.x, ey = e.y; e.x = 900; e.y = j1; const ex2 = e.x;
      G.courant.pousse(1); out.invoque = o.x - ox; out.elle = e.x - ex2; e.x = ex; e.y = ey;
      G.courant.vider(); P.x = 300; const x1 = P.x; window.__pas(1); out.sans = Math.abs(P.x - x1);
      return out; });
    ok(Math.abs(r.avance - 90) < 4 && r.dy < 1, `K-D : à 90 px/s pendant 1 s, ton corps avance de ${r.avance.toFixed(1)} px dans son sens (écart ${r.dy.toFixed(1)} px de travers)`);
    ok(Math.abs(r.mur - r.murMax) < 0.5, `K-D : contre le mur, il s'arrête au mur (${r.mur.toFixed(1)} pour ${r.murMax.toFixed(1)})`);
    ok(r.devant && r.parPas, `K-D : par pas de 6 px, une collision à chaque pas : il s'arrête devant le barreau (${r.xb.toFixed(1)} < 600)`);
    ok(r.saut, 'K-D (contre-épreuve) : d\'un seul saut de 40 px, le corps passe de l\'autre côté du barreau');
    ok(r.invoque > 60 && Math.abs(r.elle) < 1e-9, `K-D : ses invoqués sont emportés (${r.invoque.toFixed(1)} px en 1 s), elle non (${r.elle} px)`);
    ok(r.sans < 1, `K-D : sans courant, rien ne pousse (${r.sans.toFixed(2)} px)`);
    ok(!errs.length, 'K-D : aucune erreur de script ' + errs.slice(0, 2).join(' | ')); await ctx.close(); }
  // K-E : mouvements réduits : les flèches et les stries ne bougent pas (deux instants du même courant, dessinés à part) ; sans, les stries glissent
  for (const reduit of [true, false]) {
    const ctxo = await browser.newContext({ viewport: { width: 1280, height: 720 }, reducedMotion: reduit ? 'reduce' : 'no-preference' });
    await ctxo.addInitScript(() => { window.__raf = []; window.requestAnimationFrame = cb => { window.__raf.push(cb); return 1; }; });
    const page = await ctxo.newPage(); const errs = []; page.on('pageerror', e => errs.push(String(e).slice(0, 300)));
    await page.goto(BASE); await page.waitForFunction(() => !!(window.__gardiens18 && window.__brume && window.__brume.step && window.__descente), null, { timeout: 30000 });
    await page.evaluate(() => { const q = window.__raf.splice(0); for (const f of q) f(performance.now());
      window.__vide = () => { const o = document.querySelector('#overlay'); if (!o.hidden) { const b = o.querySelector('#bok') || o.querySelector('.card:not([disabled])') || o.querySelector('button.primary:not([disabled])'); if (b) b.click(); } };
      window.__pas = (s, f) => { const B = window.__brume; for (let i = 0; i < Math.round(s * 60); i++) { window.__vide(); B.step(1 / 60, 1); if (f && f()) return true; } return false; }; });
    await essai5(page, { cls: 'lum', dieu: true, mannequin: true });
    const r = await page.evaluate(() => { const G = window.__gardiens18, D = G.dbg(), s = D.room.g18s; G.courant.vider(); G.courant.poser('v', 2, 1, 90, 60);
      const img = () => { const c = document.createElement('canvas'); c.width = 1280; c.height = 720; G.courant.dessin(c.getContext('2d')); const d = c.getContext('2d').getImageData(0, 0, 1280, 720).data; let h = 2166136261, n = 0; for (let i = 0; i < d.length; i++) { h = Math.imul(h ^ d[i], 16777619); if (d[i + 3 - (i % 4)]) n++; } return [h >>> 0, n]; };
      const a = img(); for (let k = 0; k < 7; k++) s.courants[0].t += 0.1; const b = img(); return { a, b }; });
    ok(reduit ? r.a[0] === r.b[0] : r.a[0] !== r.b[0], `K-E : ${reduit ? 'mouvements réduits : le courant dessiné à deux instants est la même image (flèches figées, stries immobiles)' : 'sans mouvements réduits : les stries glissent (deux images différentes)'} (${r.a[1]} px dessinés)`);
    ok(r.a[1] > 1000, 'K-E : le courant se voit');
    ok(!errs.length, `K-E (${reduit ? 'réduits' : 'normaux'}) : aucune erreur de script ` + errs.slice(0, 2).join(' | ')); await ctxo.close(); }
  // K-F : l'essai ne vaut que pour sa descente : vaincue en essai, rien d'écrit ; la descente suivante n'a ni courant ni poussée, et l'acte V garde sa
  // place provisoire (ACTD[5].boss rendu)
  { const { page, errs, ctx } = await ouvre('');
    await essai5(page, { cls: 'lum', dieu: true, attaque: 'traversee' });
    const r = await page.evaluate(() => { const B = window.__brume, G = window.__gardiens18, D = G.dbg(), e = B.room.boss;
      window.__pas(1.5); const pendant = G.courant.biefs().length; for (let k = 0; k < 400 && !e.dead; k++) { D.hit(e, 2000, { crit: false }); for (let i = 0; i < 6; i++) B.step(1 / 60, 1); } window.__pas(3);
      const ecrit = { flag: !!((B.SAVE.flags || {}).g18_5), mort: e.dead };
      B.start(); const ici = !!G.ici();
      return { pendant, ecrit, ici, st: { force: G.dbg().ST.force, bot: G.dbg().ST.bot }, biefs: G.courant.biefs().length }; });
    ok(r.pendant >= 1 && r.ecrit.mort, `K-F : en essai, un courant a coulé (${r.pendant}) et elle est vaincue`);
    ok(!r.ecrit.flag, 'K-F : vaincue en essai, rien d\'écrit (pas de drapeau g18_5 dans la sauvegarde)');
    ok(r.st.force == null && r.st.bot === 0 && !r.ici && r.biefs === 0, `K-F : la descente suivante défait l'essai (ni gardien forcé, ni bot ; ${r.biefs} courant)`);
    ok(!errs.length, 'K-F : aucune erreur de script ' + errs.slice(0, 2).join(' | ')); await ctx.close(); }
  // K-H : éteinte, la dernière salle de l'acte V est la place provisoire (porte « garde ») ; le wiki ne la nomme nulle part
  { const { page, errs, ctx } = await ouvre('');
    const r = await page.evaluate(() => { const B = window.__brume, D = window.__descente; B.cls('gou'); D.essai(5, { fin: true, cls: 'gou' });
      window.__pas(4, () => B.room.boss || (B.room.type === 'elite' && B.room.waves && B.room.waves.length));
      return { type: B.room.type, gardeK: B.room.gardeK || '', g18: !!B.room.g18 }; });
    ok(r.type === 'elite' && r.gardeK === 'garde' && !r.g18, `K-H : éteinte, la dernière salle de l'acte V est la place provisoire (${r.type} ${r.gardeK})`);
    ok(!readFileSync(join(THEMIST, 'wiki.html'), 'utf8').includes('Passeuse'), 'K-H : le wiki ne la nomme nulle part');
    ok(!errs.length, 'K-H : aucune erreur de script ' + errs.slice(0, 2).join(' | ')); await ctx.close(); }
}

console.log(`\nbanc-gardiens18 : ${checks} vérifications, ${fails} échec${fails > 1 ? 's' : ''}.`);
await browser.close();
process.exit(fails ? 1 : 0);
