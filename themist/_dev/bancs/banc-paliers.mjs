// Banc Chromium : v18.2, action 3a (règles des paliers Difficile et Extrême, sans les mutations). Usage : node banc-paliers.mjs <port> [sections, ex. ABCDE]
// A. Normal : rien ne change (Masqué, némésis, soins, soin complet du gardien et son message, haltes, aucun temps de plus).
// B. Difficile, choisi comme un joueur (sauvegarde ouverte, sélecteur, départ) : Masqué 70 / 75 / 3, soins du monde ×0,65, talents ×1,
//    gardien de l'acte I : soin ×0,65 et message ; place provisoire de l'acte IV : l'éveil, puis le temps de plus sous 35 % (signature redoublée).
// C. Extrême : némésis 2 par acte sans répit, soins du monde ×0,5, aucun soin après un gardien et son message, pas de halte au choix avant la moitié de l'acte.
// D. Règle d'or : les gardiens des actes I à III (PV, dégâts, rayon, vitesse, nom) identiques dans les trois paliers.
// E. Mesure (indicative) : actes I à V joués debout, le joueur ne bouge pas (PV remis à moitié avant chaque pas) : dégâts subis par minute,
//    Masqués et porteurs rencontrés, soins du monde reçus, par palier (15 s par salle de combat, les ennemis ordinaires abattus toutes les 4 s pour que les vagues avancent). Ce n'est pas une mesure de victoire (personne ne frappe).
import { createRequire } from 'node:module';
const require = createRequire('/opt/npm-tools/node_modules/');
const { chromium } = require('playwright');
const PORT = process.argv[2] || 8765, SEC = (process.argv[3] || 'ABCDE').toUpperCase();
let fails = 0, checks = 0;
const ok = (c, m) => { checks++; if (!c) { fails++; console.error('ÉCHEC : ' + m); } };
const near = (a, b, e = 0.6) => Math.abs(a - b) <= e;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', args: ['--autoplay-policy=no-user-gesture-required'] });
async function ouvre(qs = '') {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });
  await page.goto(`http://127.0.0.1:${PORT}/index.html${qs ? '?' + qs : ''}`);
  await page.waitForFunction(() => !!(window.__descente && window.__brume && window.__asm), null, { timeout: 25000 });
  await page.waitForTimeout(300);
  return { page, errs, ctx };
}
// départ au palier p : sauvegarde des trois paliers ouverts, choix au sélecteur (comme un joueur), départ
const DEPART = p => { const X = window.__descente, B = window.__brume;
  B.SAVE.descente = { v: 1, ouverts: ['normal', 'difficile', 'extreme'], choisi: 'normal', victoires: {} };
  X.choisir(p); B.cls('lum'); B.start(); X.vider(); return { palier: B.RUN.palierD, choisi: X.etat().choisi }; };
const SOINS = () => { const X = window.__descente, B = window.__brume, P = B.P, out = {};
  for (const src of ['room', 'level', 'halte', 'devour', 'steal', 'boss', 'kill']) { P.hp = P.s.maxHp * 0.3; const h = P.hp; X.soin(10, src); out[src] = +(P.hp - h).toFixed(3); }
  return out; };
// gardien d'un acte I à III à l'essai, PV mis à 30 %, gardien tué : PV rendus et message
const GARDIEN = n => { const X = window.__descente, B = window.__brume; X.essai(n, { fin: true }); X.vider();
  let msg = ''; const t0 = document.querySelector('#toast');
  for (let i = 0; i < 90; i++) { B.step(1 / 30, 1); X.vider(); if (B.enemies.some(e => e.type === 'boss' && !e.dead && e.state !== 'spawn')) break; }
  const b = B.enemies.find(e => e.type === 'boss'); const P = B.P; P.hp = P.s.maxHp * 0.02; const h0 = P.hp; const s0 = Object.assign({}, B.RUN.soins18 || {}), mx0 = P.s.maxHp;
  const vu = []; const obs = new MutationObserver(() => { const el = document.querySelector('#toast'); if (el) vu.push(el.textContent); });
  const el0 = document.querySelector('#toast'); if (el0) obs.observe(el0, { childList: true, subtree: true, characterData: true });
  let hMax = P.hp;
  for (let i = 0; i < 200 && !B.room.bossDead; i++) { P.iT = 2; if (P.hp < h0) P.hp = h0; B.killAll(); B.step(1 / 30, 1); hMax = Math.max(hMax, P.hp); }   // intouchable : il ne meurt pas avant le gardien
  for (let i = 0; i < 10; i++) { P.iT = 2; B.step(1 / 30, 1); hMax = Math.max(hMax, P.hp); }
  msg = B.RUN.msgGardien18 || ''; obs.disconnect(); P.hp = hMax;
  const s1 = B.RUN.soins18 || {}, ds = {}; for (const k in s1) if ((s1[k] || 0) - (s0[k] || 0) > 0.01) ds[k] = +((s1[k] - (s0[k] || 0)) / mx0).toFixed(3);
  return { boss: !!b, rendu: +((ds.boss || 0) * mx0 / P.s.maxHp).toFixed(3), plein: P.hp >= P.s.maxHp - 0.5, mort: !!P.dead, sources: ds, msg, type: B.room.type, palier: B.RUN.palierD }; };
// place provisoire de l'acte n : le Masqué, puis l'éveil (60 %) et le temps de plus (30 %)
const PROVISOIRE = n => { const X = window.__descente, B = window.__brume; X.essai(n, { fin: true }); X.vider();
  let m = null;
  for (let i = 0; i < 2400 && !m; i++) { const P = B.P; P.hp = P.s.maxHp; P.iT = 2; X.vider();
    const r = B.room; m = r.asm && r.asm.e && !r.asm.e.dead ? r.asm.e : null;
    if (!m && i % 20 === 0) for (const e of B.enemies) if (!e.dead && !e.asm && !e.fixed && e.type !== 'boss') e.hp = 0.01;
    B.step(1 / 30, 1); }
  if (!m) return { masque: false, gardeK: B.room.gardeK };
  const st = m.asm.st, T0 = st.temps ? Object.assign({}, st.temps) : null, ev = [];
  const avance = (pv, s) => { for (let i = 0; i < s * 30; i++) { const P = B.P; P.hp = P.s.maxHp; P.iT = 2; X.vider(); m.hp = m.maxHp * pv; const c = st.caps.length; B.step(1 / 30, 1); if (st.caps.length !== c) ev.push([st.caps[st.caps.length - 1], pv]); } };
  avance(0.6, 6); const apresEveil = st.caps.slice(); avance(0.3, 6);
  return { masque: true, gardeK: B.room.gardeK, garde: m.garde, T0, temps: st.temps, caps: st.caps.slice(), apresEveil, sig: st.sig, ev, carte: (document.querySelector('#asmCard') || {}).innerHTML || '' }; };

// ── A. Normal
if (SEC.includes('A')) {
  const { page, errs, ctx } = await ouvre();
  const d = await page.evaluate(DEPART, 'normal');
  ok(d.palier === 'normal', 'A : départ en Normal');
  const m = await page.evaluate(() => window.__descente.masque());
  ok(m.chance === 50 && m.souvenir.chance === 50 && m.souvenir.parActe === 2, 'A : Masqué de Normal (50 %, souvenir 50 %, 2 par acte) ' + JSON.stringify(m));
  ok(m.nemesis.parActe === 1 && m.nemesis.repit === 3, 'A : némésis de Normal (1 par acte, répit après 3 morts)');
  ok(JSON.stringify(await page.evaluate(() => window.__descente.regles())) === '{}', 'A : aucune règle');
  const s = await page.evaluate(SOINS);
  ok(Object.values(s).every(v => near(v, 10, 0.01)), 'A : tous les soins entiers ' + JSON.stringify(s));
  ok(await page.evaluate(() => [1, 2, 3, 4, 5, 6].every(n => window.__descente.halte(n, 7))), 'A : haltes permises partout');
  const g = await page.evaluate(GARDIEN, 1);
  ok(!g.mort && g.boss && g.plein, 'A : gardien de l’acte I, PV entièrement rendus ' + JSON.stringify(g));
  ok(/Tes PV sont restaurés\./.test(g.msg), 'A : message « Tes PV sont restaurés. » ' + g.msg);
  const pv = await page.evaluate(PROVISOIRE, 4);
  ok(pv.masque && pv.gardeK === 'garde' && pv.T0 === null && !pv.temps, 'A : place provisoire de l’acte IV sans temps de plus ' + JSON.stringify({ g: pv.gardeK, t: pv.T0 }));
  ok(pv.caps.length === 3, 'A : trois capacités après l’éveil, pas de quatrième');
  ok(!errs.length, 'A : aucune erreur ' + errs.slice(0, 3).join(' | '));
  await ctx.close();
}

// ── B. Difficile
if (SEC.includes('B')) {
  const { page, errs, ctx } = await ouvre();
  const d = await page.evaluate(DEPART, 'difficile');
  ok(d.palier === 'difficile' && d.choisi === 'difficile', 'B : Difficile choisi au sélecteur et joué ' + JSON.stringify(d));
  const m = await page.evaluate(() => window.__descente.masque());
  ok(m.chance === 70 && m.souvenir.chance === 75 && m.souvenir.parActe === 3, 'B : Masqué 70 %, souvenir 75 %, 3 par acte ' + JSON.stringify(m));
  ok(m.nemesis.parActe === 1 && m.nemesis.repit === 3, 'B : némésis inchangée');
  const s = await page.evaluate(SOINS);
  ok(near(s.room, 6.5, 0.01) && near(s.level, 6.5, 0.01) && near(s.halte, 6.5, 0.01), 'B : soins du monde ×0,65 ' + JSON.stringify(s));
  ok(near(s.devour, 10, 0.01) && near(s.steal, 10, 0.01) && near(s.boss, 10, 0.01) && near(s.kill, 10, 0.01), 'B : soins des talents entiers');
  const hud = await page.evaluate(() => document.querySelector('#hAct').textContent);
  ok(/Difficile/.test(hud), 'B : le palier se lit au HUD ' + hud);
  const g = await page.evaluate(GARDIEN, 1);
  ok(!g.mort && g.boss && near(g.rendu, 0.65, 0.01), 'B : gardien de l’acte I, PV rendus ×0,65 ' + JSON.stringify(g));
  ok(/Tes PV sont en partie restaurés\./.test(g.msg), 'B : message « en partie » ' + g.msg);
  const pv = await page.evaluate(PROVISOIRE, 4);
  ok(pv.masque && pv.gardeK === 'garde' && pv.T0 && pv.T0.pv === 35 && pv.T0.on === false, 'B : place provisoire de l’acte IV, temps de plus prévu à 35 % ' + JSON.stringify(pv.T0));
  ok(pv.temps && pv.temps.on && pv.ev.length === 2 && pv.ev[0][1] === 0.6 && pv.ev[1][1] === 0.3, 'B : l’éveil à 60 %, puis le temps de plus à 30 % ' + JSON.stringify(pv.ev));
  ok(pv.temps && pv.temps.cap === pv.sig && pv.caps.filter(k => k === pv.sig).length === 1 && pv.caps.length === 4, 'B : le temps de plus est la signature redoublée ' + JSON.stringify(pv.caps));
  ok((pv.carte.match(/class="[^"]*nw/g) || []).length >= 1, 'B : la carte du Masqué montre la nouveauté');
  for (const n of [5, 9]) { const q = await page.evaluate(PROVISOIRE, n); ok(q.masque && q.T0 && q.temps && q.temps.on, `B : acte ${n}, temps de plus`); }
  { const q = await page.evaluate(PROVISOIRE, 10); ok(q.masque && q.gardeK === 'final' && q.T0, 'B : acte X, boss final provisoire : temps de plus ' + JSON.stringify({ k: q.gardeK, t: q.T0 })); }
  ok(!errs.length, 'B : aucune erreur ' + errs.slice(0, 3).join(' | '));
  await ctx.close();
}

// ── C. Extrême
if (SEC.includes('C')) {
  const { page, errs, ctx } = await ouvre();
  const d = await page.evaluate(DEPART, 'extreme');
  ok(d.palier === 'extreme', 'C : Extrême joué');
  const m = await page.evaluate(() => window.__descente.masque());
  ok(m.chance === 70 && m.souvenir.chance === 75 && m.souvenir.parActe === 3, 'C : Masqué comme Difficile');
  ok(m.nemesis.parActe === 2 && m.nemesis.repit === Infinity, 'C : némésis 2 par acte, sans répit (Infinity) ' + JSON.stringify(m.nemesis));
  const s = await page.evaluate(SOINS);
  ok(near(s.room, 5, 0.01) && near(s.halte, 5, 0.01) && near(s.level, 5, 0.01) && near(s.devour, 10, 0.01) && near(s.steal, 10, 0.01), 'C : soins du monde ×0,5, talents entiers ' + JSON.stringify(s));
  const g = await page.evaluate(GARDIEN, 2);
  ok(!g.mort && g.boss && near(g.rendu, 0, 0.01), 'C : gardien de l’acte II, aucun PV rendu ' + JSON.stringify(g));
  ok(/La Brume ne te rend rien\./.test(g.msg) && !/restaurés/.test(g.msg), 'C : message « La Brume ne te rend rien. » ' + g.msg);
  const h = await page.evaluate(() => { const X = window.__descente; X.essai(1); X.vider();
    const out = { haltes: {} };
    for (let next = 1; next <= 5; next++) for (let k = 0; k < 150; k++) { const t = X.tirer(next); if (t.includes('halte')) out.haltes[next] = (out.haltes[next] || 0) + 1; }
    return out; }).catch(e => ({ err: String(e) }));
  ok(h && !h.err && !h.haltes[1] && !h.haltes[2] && !h.haltes[3] && (h.haltes[4] || 0) > 0, 'C : acte I (7 salles), pas de halte au choix avant la salle 4 ' + JSON.stringify(h));
  ok(!errs.length, 'C : aucune erreur ' + errs.slice(0, 3).join(' | '));
  await ctx.close();
}

// ── D. Règle d'or : gardiens I à III
if (SEC.includes('D')) {
  const { page, errs, ctx } = await ouvre();
  const vus = {};
  for (const p of ['normal', 'difficile', 'extreme']) {
    await page.evaluate(DEPART, p);
    vus[p] = await page.evaluate(() => { const X = window.__descente, B = window.__brume, out = [];
      for (const n of [1, 2, 3]) { X.essai(n, { fin: true }); X.vider();
        for (let i = 0; i < 90; i++) { B.step(1 / 30, 1); X.vider(); if (B.enemies.some(e => e.type === 'boss' && !e.dead)) break; }
        const b = B.enemies.find(e => e.type === 'boss'); out.push(b ? { n: b.name, pv: Math.round(b.maxHp), d: b.dmg, r: b.r, v: b.spd, temps: b.e27 ? 1 : 0, garde: !!b.garde, asm: !!b.asm } : null); }
      return { g: out, palier: B.RUN.palierD }; });
    ok(vus[p].palier === p, `D : ${p} joué`);
  }
  for (const n of [0, 1, 2]) {
    const a = JSON.stringify(vus.normal.g[n]);
    ok(vus.normal.g[n] && a === JSON.stringify(vus.difficile.g[n]) && a === JSON.stringify(vus.extreme.g[n]), `D : gardien de l'acte ${['I', 'II', 'III'][n]} identique dans les trois paliers ${a} | ${JSON.stringify(vus.extreme.g[n])}`);
    ok(vus.normal.g[n] && !vus.normal.g[n].asm, `D : gardien de l'acte ${['I', 'II', 'III'][n]} : le gardien lui-même, pas un Masqué`);
  }
  ok(!errs.length, 'D : aucune erreur ' + errs.slice(0, 3).join(' | '));
  await ctx.close();
}

// ── E. Mesure par palier (indicative)
if (SEC.includes('E')) {
  const res = {};
  for (const p of ['normal', 'difficile', 'extreme']) {
    const tot = { salles: 0, s: 0, deg: 0, masques: 0, porteurs: 0, temps: 0, monde: 0, gardien: 0 };
    for (let run = 0; run < 3; run++) {
      const { page, errs, ctx } = await ouvre();
      await page.evaluate(DEPART, p);
      const r = await page.evaluate(() => { const X = window.__descente, B = window.__brume, o = { salles: 0, s: 0, deg: 0, masques: 0, porteurs: 0, temps: 0 };
        X.essai(1); B.RUN.essai = 1; X.vider();
        for (let pas = 0; pas < 40; pas++) {
          const r = B.room, combat = ['combat', 'elite', 'boss'].includes(r.type);
          if (combat) { o.salles++;
            for (let i = 0; i < 450; i++) { const P = B.P; P.hp = P.s.maxHp * 0.5; P.iT = 0; X.vider(); const h = P.hp; B.step(1 / 30, 1); o.deg += Math.max(0, h - B.P.hp); o.s += 1 / 30;
              if (B.P.hp <= 0 || B.P.dead) { B.P.dead = false; }
              if (i % 120 === 119) for (const e of B.enemies) if (!e.dead && !e.asm && !e.fixed && e.type !== 'boss') e.hp = 0.01; } }   // les vagues avancent : le Masqué arrive
          if (r.asm) { o.masques++; if (r.asm.sv) o.porteurs++; }
          let fin = false;
          for (let i = 0; i < 6000; i++) { X.vider(); const P = B.P; P.hp = Math.max(P.hp, P.s.maxHp * 0.5); P.iT = 2; const q = B.room;
            if (q.cleared && q.doors && q.doors.length && q.doors.every(d => d.open >= 1)) break;
            if (q.cleared && (!q.doors || !q.doors.length)) { fin = true; break; }
            if (!q.cleared && i % 3 === 0) B.killAll(); B.step(1 / 30, 1); }
          if (r.asm && r.asm.e && r.asm.e.asm && r.asm.e.asm.st.temps) o.temps++;
          if (fin || X.dbg().acte > 5) break;
          const portes = X.dbg().portes; if (!portes.length) break;
          const t = portes.length === 1 ? portes[0] : portes.includes('combat') ? 'combat' : portes.find(x => !['raccourci', 'direct', 'breche'].includes(x)) || portes[0];
          window.__asm.dbg().entrer(t);
          if (X.dbg().acte > 5) break;
        }
        o.soins = Object.assign({}, B.RUN.soins18 || {}); o.acte = X.dbg().acte; return o; });
      tot.salles += r.salles; tot.s += r.s; tot.deg += r.deg; tot.masques += r.masques; tot.porteurs += r.porteurs; tot.temps += r.temps;
      tot.monde += (r.soins.room || 0) + (r.soins.level || 0) + (r.soins.halte || 0);
      ok(!errs.length, `E : ${p}, aucune erreur ` + errs.slice(0, 2).join(' | '));
      await ctx.close();
    }
    res[p] = { salles: tot.salles, degMin: tot.deg / (tot.s / 60), masques: tot.masques, porteurs: tot.porteurs, temps: tot.temps, mondeParSalle: tot.monde / Math.max(1, tot.salles) };
  }
  ok(res.difficile.masques >= res.normal.masques && res.extreme.masques >= res.normal.masques, 'E : plus de Masqués hors Normal ' + JSON.stringify([res.normal.masques, res.difficile.masques, res.extreme.masques]));
  ok(res.difficile.mondeParSalle < res.normal.mondeParSalle && res.extreme.mondeParSalle < res.difficile.mondeParSalle, 'E : soins du monde reçus : Normal > Difficile > Extrême');
  ok(res.normal.temps === 0 && res.difficile.temps > 0, 'E : temps de plus seulement hors Normal');
  console.log('  mesure (actes I à V, 3 descentes par palier, joueur immobile, 15 s par salle de combat, ennemis ordinaires abattus toutes les 4 s) :');
  for (const p of ['normal', 'difficile', 'extreme']) { const x = res[p];
    console.log(`   ${p.padEnd(9)} salles ${x.salles}, dégâts subis ${x.degMin.toFixed(0)} PV/min (${(x.degMin / res.normal.degMin * 100 - 100).toFixed(0)} %), Masqués ${x.masques} (porteurs ${x.porteurs}, temps de plus ${x.temps}), soins du monde ${x.mondeParSalle.toFixed(1)} PV/salle`); }
}
console.log(`banc-paliers : ${checks} vérifications, ${fails} échec${fails > 1 ? 's' : ''}.`);
await browser.close();
process.exit(fails ? 1 : 0);
