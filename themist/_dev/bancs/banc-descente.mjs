// Banc Chromium : v18, action 2 (la charpente de la grande descente). Usage : node banc-descente.mjs <port> [sections, ex. ABCDE]
// A. Descente complète en Normal (pas de temps à la main, tout tué) : 10 actes, portes, salles, registre, HUD, montée, élites de fin,
//    gardien provisoire, pacte à chaque acte, victoire au dernier acte seulement, Difficile ouvert, note de fin.
// B. Règle d'or : actes I à III (PV et dégâts des gardiens, montée salle par salle, portes imposées) comme avant la v18.
// C. Essai : ?descente=10&fin=1 et __descente.essai() gagnés n'ouvrent rien.
// D. Sélecteur : écran titre (Normal seul ouvert, palier fermé inerte, choix enregistré), Portail (plus de Paliers de Brume), HUD.
// E. Sauvegardes : ancienne sauvegarde (Paliers de Brume ouverts, victoires) → Normal seul et palier 0 ; version future intacte.
import { createRequire } from 'node:module';
const require = createRequire('/opt/npm-tools/node_modules/');
const { chromium } = require('playwright');
const PORT = process.argv[2] || 8765, SEC = (process.argv[3] || 'ABCDE').toUpperCase();
let fails = 0, checks = 0;
const ok = (c, m) => { checks++; if (!c) { fails++; console.error('ÉCHEC : ' + m); } };
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', args: ['--autoplay-policy=no-user-gesture-required'] });
async function ouvre(qs = '', save) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  if (save !== undefined) await ctx.addInitScript(s => { try { if (!sessionStorage.getItem('banc-init')) { localStorage.setItem('la-brume-save-v1', s); sessionStorage.setItem('banc-init', '1'); } } catch (e) {} }, JSON.stringify(save));   // une fois : un rechargement garde ce que la page a écrit
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });
  await page.goto(`http://127.0.0.1:${PORT}/index.html${qs ? '?' + qs : ''}`);
  await page.waitForFunction(() => !!(window.__descente && window.__brume && window.__asm), null, { timeout: 25000 });
  await page.waitForTimeout(300);
  return { page, errs, ctx };
}
// purge la salle : fenêtres fermées, file vidée, tout tué, temps avancé à la main jusqu'à ce que la salle soit purgée et ses portes ouvertes
const PURGE = () => {
  const B = window.__brume, X = window.__descente, D = window.__asm.dbg();
  let boss = null, asm = null;
  for (let i = 0; i < 6000; i++) {
    X.vider(); const P = B.P; if (P) { P.hp = P.s.maxHp; P.iT = 2; }
    const r = B.room; if (r.cleared && r.doors && r.doors.length && r.doors.every(d => d.open >= 1)) return { ok: true, i, boss, asm };
    if (r.cleared && r.type === 'boss' && (!r.doors || !r.doors.length)) return { ok: true, i, fin: true, boss, asm };
    const b = B.enemies.find(e => e.type === 'boss' && !e.dead); if (b && !boss) boss = { name: b.name, maxHp: Math.round(b.maxHp), dmg: b.dmg, r: b.r };
    const m = r.asm && r.asm.e; if (m && !asm) asm = { garde: m.garde || 0, maxHp: Math.round(m.maxHp) };
    if (!r.cleared && (i % 3 === 0)) B.killAll();
    B.step(1 / 30, 1);
  }
  return { ok: false, type: B.room.type, cleared: B.room.cleared, boss, asm };
};
const ETAT = () => { const X = window.__descente, B = window.__brume, d = X.dbg(), r = B.room;
  const boss = B.enemies.find(e => e.type === 'boss'), asm = r.asm && r.asm.e;
  return Object.assign(d, { hAct: document.querySelector('#hAct').textContent, hRoom: document.querySelector('#hRoom').textContent,
    boss: boss ? { name: boss.name, maxHp: Math.round(boss.maxHp), dmg: boss.dmg } : null, asm: asm ? { garde: asm.garde || 0, maxHp: Math.round(asm.maxHp) } : null,
    pal: B.RUN.palier, fiole: B.RUN.fiole }); };

// ── A. Descente complète
if (SEC.includes('A')) {
  const { page, errs, ctx } = await ouvre();
  await page.evaluate(() => { window.__descente.effacer(); window.__brume.cls('lum'); window.__brume.start(); });
  await page.waitForTimeout(200);
  const vus = []; let pactes = 0, fini = null;
  for (let pas = 0; pas < 80; pas++) {
    const e0 = await page.evaluate(ETAT);
    const pg = await page.evaluate(PURGE);
    if (!pg.ok) { ok(false, `A : salle non purgée ${JSON.stringify(pg)} ${JSON.stringify(e0)}`); break; }
    const e = await page.evaluate(ETAT);
    vus.push({ acte: e.acte, reg: e.registre, g: e.g, salle: e.salle, rooms: e.rooms, type: e.type, garde: e.garde, portes: e.portes, pv: e.pv, boss: pg.boss, asm: pg.asm, hAct: e0.hAct, hRoom: e0.hRoom });
    if (!e.portes.length) { fini = e; break; }
    const forc = e.portes.length === 1 ? e.portes[0] : (e.portes.includes('combat') ? 'combat' : e.portes.find(t => !['raccourci', 'direct', 'breche'].includes(t)) || e.portes[0]);
    const avant = e.acte;
    await page.evaluate(t => { window.__asm.dbg().entrer(t); }, forc);
    const apres = await page.evaluate(() => ({ acte: window.__descente.dbg().acte, file: window.__descente.file(), fiole: window.__brume.RUN.fiole, larme: window.__brume.RUN.larme, ov: !document.querySelector('#overlay').hidden && (document.querySelector('#overlay').textContent || '').slice(0, 60) }));
    if (apres.acte > avant) { if (apres.file > 0 || /pacte/i.test(apres.ov || '')) pactes++; ok(apres.fiole === false && apres.larme === false, `A : acte ${apres.acte}, fiole et larme rendues`); }
  }
  // les 10 actes, dans l'ordre, au bon registre, le bon nombre de salles
  const actes = [...new Set(vus.map(v => v.acte))];
  ok(JSON.stringify(actes) === JSON.stringify([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]), 'A : les 10 actes dans l’ordre ' + JSON.stringify(actes));
  const rooms = { 1: 7, 2: 6, 3: 7, 4: 4, 5: 4, 6: 4, 7: 4, 8: 4, 9: 4, 10: 2 };
  for (let n = 1; n <= 10; n++) {
    const s = vus.filter(v => v.acte === n);
    ok(s.length === rooms[n] && s.every(v => v.rooms === rooms[n]), `A : acte ${n}, ${rooms[n]} salles (${s.length})`);
    ok(s.every(v => v.reg === Math.min(n, 3)), `A : acte ${n}, registre ${Math.min(n, 3)}`);
    ok(s.every(v => new RegExp(`^Acte ${['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][n]} · `).test(v.hAct)), `A : acte ${n}, HUD « Acte ${n} » ${s[0] && s[0].hAct}`);
    const der = s[s.length - 1];
    if (n <= 3 || n === 10) { ok(der.type === 'boss' && der.boss, `A : acte ${n}, un gardien en dernière salle`); ok(s[s.length - 2].type === 'halte', `A : acte ${n}, antichambre`); }
    else { ok(der.type === 'elite' && der.garde === n, `A : acte ${n}, élite de fin d'acte (${der.type}, ${der.garde})`); ok(!s.some(v => v.type === 'boss'), `A : acte ${n}, aucun gardien`); ok(/Élite de l’acte/.test(der.hRoom), `A : acte ${n}, HUD « Élite de l’acte » (${der.hRoom})`); }
    if (n < 10) ok(JSON.stringify(der.portes) === JSON.stringify([n === 1 ? 'act' : n === 2 ? 'act3' : 'acte']), `A : acte ${n}, une seule porte vers l'acte suivant ${JSON.stringify(der.portes)}`);
  }
  ok(vus.filter(v => v.acte >= 4 && v.acte <= 9 && v.asm && v.asm.garde === v.acte).length >= 5, `A : élites de fin : un Masqué imposé et renforcé (${vus.filter(v => v.asm && v.asm.garde).length} / 6)`);
  const bX = vus.find(v => v.acte === 10 && v.type === 'boss'), b3 = vus.find(v => v.acte === 3 && v.type === 'boss');
  ok(bX && bX.boss && bX.boss.name === 'L’Écho du Glas', 'A : acte X, le gardien provisoire ' + JSON.stringify(bX && bX.boss));
  ok(bX && b3 && Math.abs(bX.boss.maxHp / b3.boss.maxHp - 1.25) < 0.01 && Math.abs(bX.boss.dmg / b3.boss.dmg - 1.15) < 0.01, `A : acte X, PV ×1,25 et dégâts ×1,15 du Glas (${bX && bX.boss.maxHp} / ${b3 && b3.boss.maxHp})`);
  ok(vus.length === 46, `A : 46 salles parcourues (${vus.length})`);
  ok(pactes >= 9, `A : un pacte proposé à chaque nouvel acte (${pactes} / 9)`);
  // montée : salle 21 (première de l'acte IV) = la pente douce
  const g21 = vus.find(v => v.g === 21), g44 = vus.find(v => v.g === 44);
  ok(g21 && Math.abs(g21.pv - 2.655) < 1e-6, 'A : salle 21, PV ×2,655 ' + (g21 && g21.pv));
  ok(g44 && Math.abs(g44.pv - 3.575) < 1e-6, 'A : salle 44 (élite de l’acte IX), PV ×3,575 ' + (g44 && g44.pv));
  // victoire : fin de descente au dernier acte, Difficile ouvert, note de fin
  await page.evaluate(() => { for (let i = 0; i < 200; i++) window.__brume.step(1 / 30, 1); });
  const fin = await page.evaluate(() => ({ save: window.__brume.SAVE.descente, wins: window.__brume.SAVE.wins, note: (document.querySelector('.des-fin') || {}).textContent || '', titre: (document.querySelector('#overlay h2') || {}).textContent || '', palierMax: window.__brume.SAVE.palierMax }));
  ok(fini && fini.acte === 10, 'A : la descente s’arrête au dernier acte');
  ok(fin.save && JSON.stringify(fin.save.ouverts) === '["normal","difficile"]' && fin.save.victoires.normal.lum === 1, 'A : gagner en Normal ouvre Difficile ' + JSON.stringify(fin.save));
  ok(/Difficile/.test(fin.note), 'A : la fin dit « Palier Difficile ouvert » ' + fin.note);
  ok(fin.wins === 1 && fin.palierMax === 0, `A : une victoire comptée, aucun Palier de Brume (${fin.wins}, ${fin.palierMax})`);
  ok(!errs.length, 'A : aucune erreur de script ' + errs.slice(0, 3).join(' | '));
  console.log(`A · ${vus.length} salles ; actes : ${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => vus.filter(v => v.acte === n).map(v => v.type === 'elite' && v.garde ? 'É' : v.type[0].toUpperCase()).join('')).join(' | ')}`);
  await ctx.close();
}

// ── B. Règle d'or : actes I à III
if (SEC.includes('B')) {
  const { page, errs, ctx } = await ouvre();
  const r = await page.evaluate(() => {
    const X = window.__descente, B = window.__brume, out = { bosses: {}, montee: [], portes: [] };
    const base = window.BRUME_DATA.bestiaire.montee;
    for (let g = 1; g <= 20; g++) { const m = X.montee(g); out.montee.push(m.pv === 1 + base.pvParSalle * (g - 1) && m.degats === 1 + base.degatsParSalle * (g - 1)); }
    for (const n of [1, 2, 3]) {
      X.essai(n, { cls: 'her', fin: true });
      for (let i = 0; i < 120 && !B.enemies.some(e => e.type === 'boss'); i++) { X.vider(); B.step(1 / 30, 1); }
      const b = B.enemies.find(e => e.type === 'boss');
      out.bosses[n] = b ? { name: b.name, maxHp: Math.round(b.maxHp), dmg: b.dmg, r: b.r } : null;
      for (let next = 2; next <= X.ACTD[n].rooms; next++) out.portes.push([n, next, X.porte(n, next, 'combat', false)]);
    }
    return out;
  });
  ok(r.montee.every(Boolean), 'B : montée des salles 1 à 20 identique à la formule d’avant');
  ok(r.bosses[1] && r.bosses[1].maxHp === 2650 && r.bosses[1].dmg === 16 && r.bosses[1].name === 'La Mère-Brume', 'B : Mère-Brume 2 650 PV, 16 dégâts ' + JSON.stringify(r.bosses[1]));
  ok(r.bosses[2] && r.bosses[2].maxHp === 5750 && r.bosses[2].dmg === 22 && r.bosses[2].name === 'Le Héraut Noyé', 'B : Héraut Noyé 5 750 PV, 22 dégâts ' + JSON.stringify(r.bosses[2]));
  ok(r.bosses[3] && r.bosses[3].maxHp === 9000 && r.bosses[3].dmg === 26 && r.bosses[3].name === 'Le Glas Originel' && r.bosses[3].r === 62, 'B : Glas Originel 9 000 PV, 26 dégâts, rayon 62 ' + JSON.stringify(r.bosses[3]));
  const imp = r.portes.filter(p => p[2]);
  ok(JSON.stringify(imp) === JSON.stringify([[1, 6, 'halte'], [1, 7, 'boss'], [2, 5, 'halte'], [2, 6, 'boss'], [3, 6, 'halte'], [3, 7, 'boss']]), 'B : portes imposées des actes I à III comme avant ' + JSON.stringify(imp));
  ok(!errs.length, 'B : aucune erreur de script ' + errs.slice(0, 3).join(' | '));
  await ctx.close();
}

// ── C. Essai : rien ne s'ouvre
if (SEC.includes('C')) {
  for (const [nom, qs, viaConsole] of [['?descente=10&fin=1', 'descente=10&fin=1&classe=tis', false], ['__descente.essai(10)', '', true]]) {
    const { page, errs, ctx } = await ouvre(qs);
    await page.evaluate(() => window.__descente.effacer());
    if (viaConsole) await page.evaluate(() => { window.__brume.cls('gou'); window.__brume.start(); window.__descente.essai(10, { fin: true }); });
    else await page.waitForFunction(() => { try { return window.__descente.dbg().acte === 10; } catch (e) { return false; } }, null, { timeout: 15000 });
    const e = await page.evaluate(() => window.__descente.dbg());
    ok(e.acte === 10 && e.type === 'boss' && e.essai, `C ${nom} : dernière salle de l'acte X, en essai ${JSON.stringify(e)}`);
    const pg = await page.evaluate(PURGE);
    await page.evaluate(() => { for (let i = 0; i < 200; i++) window.__brume.step(1 / 30, 1); });
    const s = await page.evaluate(() => ({ d: window.__brume.SAVE.descente, note: !!document.querySelector('.des-fin'), titre: (document.querySelector('#overlay h2') || {}).textContent || '' }));
    ok(pg.ok, `C ${nom} : gardien abattu`);
    ok(JSON.stringify(s.d.ouverts) === '["normal"]' && !Object.keys(s.d.victoires).length && !s.note, `C ${nom} : une descente d'essai gagnée n'ouvre rien ${JSON.stringify(s)}`);
    ok(!errs.length, `C ${nom} : aucune erreur de script ` + errs.slice(0, 3).join(' | '));
    await ctx.close();
  }
}

// ── D. Sélecteur
if (SEC.includes('D')) {
  const { page, errs, ctx } = await ouvre('', { v: 1, shards: 0, total: 0, runs: 1, wins: 0, deaths: 1, kills: 0, bossKills: 0, best: 0, bestLabel: '', meta: {}, relics: [], palierMax: 0, palier: 0, cls: 'lum', flags: { guide: 1 }, loreSeen: [] });
  await page.waitForFunction(() => !!document.querySelector('.des-pal'), null, { timeout: 20000 });
  const s1 = await page.evaluate(() => [...document.querySelectorAll('.des-p')].map(b => ({ p: b.dataset.pal, off: b.classList.contains('off'), sel: b.classList.contains('sel'), ic: !!b.querySelector('svg') })));
  ok(s1.length === 3 && s1.every(b => b.ic), 'D : écran titre, trois pastilles à icône ' + JSON.stringify(s1));
  ok(!s1[0].off && s1[0].sel && s1[1].off && s1[2].off, 'D : seul Normal est ouvert et choisi');
  ok(await page.evaluate(() => /Gagne en Normal pour ouvrir Difficile/.test(document.querySelector('.des-pn').textContent)), 'D : la ligne dit comment ouvrir Difficile');
  await page.click('.des-p[data-pal=difficile]', { force: true });
  ok(await page.evaluate(() => window.__brume.SAVE.descente.choisi === 'normal' && document.querySelector('.des-p.sel').dataset.pal === 'normal'), 'D : un palier fermé ne se choisit pas');
  await page.evaluate(() => { const S = window.__brume.SAVE; S.descente = { v: 1, ouverts: ['normal', 'difficile'], choisi: 'normal', victoires: { normal: { lum: 1 } } }; localStorage.setItem('la-brume-save-v1', JSON.stringify(S)); });
  await page.reload(); await page.waitForFunction(() => !!document.querySelector('.des-pal'), null, { timeout: 20000 });
  await page.click('.des-p[data-pal=difficile]');
  const s2 = await page.evaluate(() => ({ choisi: window.__brume.SAVE.descente.choisi, sel: (document.querySelector('.des-p.sel') || {}).dataset.pal, pn: document.querySelector('.des-pn').textContent }));
  ok(s2.choisi === 'difficile' && s2.sel === 'difficile', 'D : Difficile ouvert se choisit ' + JSON.stringify(s2));
  ok(/ouvrir Extrême/.test(s2.pn), 'D : la ligne dit comment ouvrir Extrême');
  // Portail : le sélecteur à la place des Paliers de Brume
  await page.evaluate(() => { window.__brume.hub(); window.__brume.npc('portail'); });
  await page.waitForTimeout(300);
  const po = await page.evaluate(() => ({ pal: !!document.querySelector('#overlay .des-pal'), brume: /Palier de Brume/.test(document.querySelector('#overlay').textContent), chips: document.querySelectorAll('#overlay .pchip,#overlay .palbtn').length, go: (document.querySelector('#descend') || {}).textContent || '' }));
  ok(po.pal && !po.brume && !po.chips, 'D : Portail, le sélecteur remplace les Paliers de Brume ' + JSON.stringify(po));
  ok(/Difficile/.test(po.go), 'D : Portail, le bouton dit le palier ' + po.go);
  await page.click('#descend');
  await page.waitForTimeout(400);
  const run = await page.evaluate(() => ({ p: window.__brume.RUN.palierD, palier: window.__brume.RUN.palier, h: document.querySelector('#hAct').textContent }));
  ok(run.p === 'difficile' && run.palier === 0 && /Difficile/.test(run.h), 'D : la descente part en Difficile, palier de Brume 0, HUD ' + JSON.stringify(run));
  ok(!errs.length, 'D : aucune erreur de script ' + errs.slice(0, 3).join(' | '));
  await ctx.close();
}

// ── E. Sauvegardes
if (SEC.includes('E')) {
  const vieille = { v: 1, shards: 120, total: 500, runs: 12, wins: 5, deaths: 7, kills: 900, bossKills: 14, best: 20, bestLabel: 'Acte III · salle 7', meta: {}, relics: [], palierMax: 8, palier: 3, cls: 'her', flags: { act2: 1, act3: 1, guide: 1 }, loreSeen: [] };
  let { page, errs, ctx } = await ouvre('', vieille);
  const a = await page.evaluate(() => { const S = window.__brume.SAVE; window.__brume.start(); return { d: S.descente, pal: window.__brume.RUN.palier, palierD: window.__brume.RUN.palierD, hp: window.__descente.dbg().pv, wins: S.wins, palierMax: S.palierMax }; });
  ok(a.d && JSON.stringify(a.d.ouverts) === '["normal"]' && a.d.choisi === 'normal', 'E : ancienne sauvegarde → Normal seul ' + JSON.stringify(a.d));
  ok(a.pal === 0 && a.palierD === 'normal', 'E : ancienne sauvegarde → palier de Brume 0, palier Normal ' + JSON.stringify(a));
  ok(a.wins === 5 && a.palierMax === 8, 'E : le reste de la sauvegarde est gardé');
  ok(!errs.length, 'E : aucune erreur de script ' + errs.slice(0, 3).join(' | '));
  await ctx.close();
  const future = Object.assign({}, vieille, { descente: { v: 9, ouverts: ['normal', 'difficile', 'extreme'], choisi: 'extreme', autre: 1 } });
  ({ page, errs, ctx } = await ouvre('', future));
  const f = await page.evaluate(() => { window.__brume.start(); return { d: window.__brume.SAVE.descente, p: window.__brume.RUN.palierD }; });
  ok(f.d && f.d.v === 9 && f.d.autre === 1 && f.p === 'normal', 'E : sauvegarde d’une version future intacte, on joue en Normal ' + JSON.stringify(f));
  ok(!errs.length, 'E : version future, aucune erreur de script ' + errs.slice(0, 3).join(' | '));
  await ctx.close();
}

await browser.close();
console.log(`banc-descente : ${checks} vérifications, ${fails} échec${fails > 1 ? 's' : ''}.`);
process.exit(fails ? 1 : 0);
