// Banc Chromium : actions 1 et 2 du Dernier Souvenir (brûler, désigner, état brûlé). Usage : node banc-dernier.mjs <port>
import { createRequire } from 'node:module';
const require = createRequire('/opt/npm-tools/node_modules/');
const { chromium } = require('playwright');
const PORT = process.argv[2] || 8765;
let fails = 0, checks = 0;
const ok = (c, m) => { checks++; if (!c) { fails++; console.error('ÉCHEC : ' + m); } };
const CLASSES = { lum: { skill: 'ray_n4', root: 'sol_s1', ult: 'sol_sk', cours: 'zenithT' }, gou: { root: 'sai_s1', ult: 'abe_sk', cours: 'metaT' }, her: { root: 'dgl_s1', ult: 'dgl_sk', cours: 'funN' }, tis: { root: 'gts_s1', ult: 'bro_sk', cours: 'stopT' } };
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', args: ['--autoplay-policy=no-user-gesture-required'] });
for (const [cls, C] of Object.entries(CLASSES)) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });
  await page.goto(`http://127.0.0.1:${PORT}/index.html?masque=fan_n2&classe=${cls}&acte=2`);
  await page.waitForFunction(() => { try { const d = window.__asm.dbg(); return d.RUN && !d.RUN.hub && d.state === 'play' && d.enemies.some(e => !e.dead); } catch (e) { return false; } }, null, { timeout: 20000 });
  await page.waitForTimeout(600);
  const r = await page.evaluate(({ cls, C }) => {
    const out = {}, D = window.__asm.dbg(), X = window.__dernier, MM = window.__memoire;
    const P = D.P, RUN = D.RUN, M = () => MM.M;
    D.P.iT = 999;   // le banc ne veut pas mourir
    out.actifData = X.DS.actif; out.actifAvant = X.actif();
    // une compétence et un majeur qui en dépend, de la forme
    const N = window.BRUME_DATA.talents.noeuds;
    const ids = Object.keys(N);
    const maj = ids.map(id => X.noeud(id)).find(n => n && n.kind === 'x' && n.reqS && ids.some(k => X.noeud(k).kind === 's' && X.noeud(k).br === n.br) && ids.filter(k => X.noeud(k).br === n.br)[0] && (window.BRUME_DATA.talents.branches[n.br] || {}).cls === cls);
    // trouver la compétence liée : celle de la branche dont l'effet pose reqS (on essaie chaque compétence de la branche)
    let skill = null;
    if (maj) for (const k of ids.filter(k => X.noeud(k).br === maj.br && X.noeud(k).kind === 's')) { const s0 = !!P.s[maj.reqS]; X.prendre(k); if (P.s[maj.reqS] && !s0) { skill = k; break; } MM.forget(M().actifs.findIndex(a => a.id === k)); }
    out.maj = maj && maj.id; out.skill = skill;
    if (skill) X.prendre(maj.id);
    // d'autres talents de la forme, mineurs à 3 rangs
    const mins = ids.filter(k => X.noeud(k).kind === 'm' && (window.BRUME_DATA.talents.branches[X.noeud(k).br] || {}).cls === cls).slice(0, 3);
    mins.forEach((k, i) => X.prendre(k, 3, i));   // gravures 0, 1, 2
    X.prendre(C.root);
    X.prendre(C.ult);
    out.portes = M().actifs.map(a => a.id);
    out.majOn = skill ? !MM.M.eff.every(e => e.id !== maj.id) : null;
    // 1. inerte tant que dernier.actif est faux
    out.hudDsAvant = document.querySelectorAll('#hMem .mt.ds').length;
    // refus
    out.refusRoot = X.refus(C.root);
    out.refusUlt = X.refus(C.ult);
    P[C.cours] = 2; out.refusCours = X.refus(C.ult); P[C.cours] = 0;
    // trophée
    const tx = { id: mins[0] + '_inexistant' };
    // 2. activer : désignation dans la pause
    X.activer(true);
    out.actifApres = X.actif();
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape' }));
    return out;
  }, { cls, C });
  await page.waitForTimeout(300);
  const pz = await page.evaluate(({ C }) => {
    const out = {}, X = window.__dernier;
    out.pause = !!document.querySelector('#pzmem');
    out.braise = !!document.querySelector('#pzmem .pzbr:not(.vide)');
    out.dsok = document.querySelectorAll('#pzmem .mcell.dsok').length;
    out.dsno = document.querySelectorAll('#pzmem .mcell.dsno').length;
    return out;
  }, { C });
  // clic sur la compétence (si elle existe), sinon sur le premier mineur
  const cible = r.skill || r.portes.find(id => /_n\d$/.test(id));
  await page.click(`#pzmem .mcell[data-ds="${cible}"]`);
  const ap = await page.evaluate(() => ({ designe: window.__dernier.designe(), pzDs: document.querySelectorAll('#pzmem .mt.ds').length, pzFel: document.querySelectorAll('#pzmem .mt.fel').length, hudDs: document.querySelectorAll('#hMem .mt.ds').length, hudFel: document.querySelectorAll('#hMem .mt.fel').length }));
  await page.click(`#pzmem .mcell[data-ds="${cible}"]`);
  const ap2 = await page.evaluate(() => ({ designe: window.__dernier.designe(), pzDs: document.querySelectorAll('#pzmem .mt.ds').length }));
  await page.click(`#pzmem .mcell[data-ds="${cible}"]`);
  await page.screenshot({ path: `/tmp/claude-0/-home-claude/14ce4a6c-54f7-5ef2-a136-14c041eb6c8a/scratchpad/pause-${cls}.png` });
  // fermer la pause, brûler en combat
  await page.keyboard.press('Escape');
  await page.waitForTimeout(250);
  console.log("avant b", cls, JSON.stringify({ r, pz, ap, ap2 }));
  const b = await page.evaluate(({ C, cible, maj }) => {
    const out = {}, D = window.__asm.dbg(), X = window.__dernier, MM = window.__memoire, P = D.P, RUN = D.RUN, M = MM.M;
    out.enCombat = X.enCombat();
    out.braises0 = X.braises();
    const hp0 = P.hp, max0 = P.s.maxHp, a = M.actifs.find(x => x.id === cible), n0 = M.actifs.length, res0 = RUN.reserveBrume.length;
    out.force = X.force(cible);
    const res = X.bruler();   // la tuile désignée
    out.res = res && { refus: res.refus, id: res.id, famille: res.famille, force: res.force, contre: res.contre, eteints: res.eteints, valeurs: res.valeurs };
    out.n = [n0, M.actifs.length]; out.res = Object.assign(out.res || {}, { reserve: [res0, RUN.reserveBrume.length] });
    out.rank = P.ranks[cible]; out.trace = M.traces[cible]; out.brules = M.brules.map(x => x.id); out.designe = X.designe();
    out.soin = P.hp <= hp0 + 1e-9; out.hpOk = P.hp <= P.s.maxHp + 1e-9;
    out.dispo = X.dispo(cible); let vu = 0; for (let i = 0; i < 300; i++) if (X.offres().includes(cible)) vu++; out.offert = vu;
    out.gravable = X.gravables().includes(cible);
    out.arbre = X.arbre(cible); out.legende = X.legende();
    out.majEteint = maj ? !M.eff.some(e => e.id === maj) : null;
    out.braises1 = X.braises();
    // une deuxième brûlure dans le même acte : refusée
    const autre = M.actifs.find(x => x.id !== 'x' && !/_s1$/.test(x.id));
    out.refus2 = X.bruler(autre.id).refus;
    // reconstruction : P.s = mémoire efficace rejouée (sans équipement dans cette salle d'essai)
    const R = MM.replay(MM.effOf(M.actifs)); let diff = [];
    const cmp = (a, b, p) => { for (const k of new Set([...Object.keys(a || {}), ...Object.keys(b || {})])) { const x = a ? a[k] : undefined, y = b ? b[k] : undefined; if (typeof x === 'number' || typeof y === 'number') { if (Math.abs((x || 0) - (y || 0)) > 1e-6) diff.push(p + k + ':' + x + '≠' + y); } else if (x && typeof x === 'object' && !Array.isArray(x)) cmp(x, y, p + k + '.'); } };
    const eq = ['eq', 'eq2', 'eq3', 'eq4'].some(k => P[k]);
    cmp(P.s, R, ''); out.diff = eq ? 'équipement porté' : diff.slice(0, 6);
    // acte suivant : la braise revient (une)
    const act = RUN.act; RUN.act = act + 1; out.braisesActeSuivant = X.braises(); RUN.act = act;
    // hors combat : refusé
    const cl = D.room.cleared; D.room.cleared = true; out.horsCombat = X.bruler(autre.id).refus; D.room.cleared = cl;
    // la désignation tombe quand le talent part autrement
    const m2 = M.actifs.find(x => x.id !== cible && !/_s1$|_sk$/.test(x.id)); X.designer(m2.id); out.desAvant = X.designe(); MM.forget(M.actifs.indexOf(m2)); out.desApres = X.designe();
    out.reserveSansBrule = !RUN.reserveBrume.some(x => out.brules.includes(x.id));
    out.chronique = (RUN.ch && RUN.ch.notes || []).some(n => n.k === 'brule');
    return out;
  }, { C, cible, maj: r.maj });
  // trophée : inbrûlable, non désignable
  const t = await page.evaluate(() => { const D = window.__asm.dbg(), X = window.__dernier, MM = window.__memoire, RUN = D.RUN, M = MM.M;
    const N = window.BRUME_DATA.talents.noeuds; const id = Object.keys(N).find(k => N[k].k === 'm' && !M.actifs.some(a => a.id === k) && !(M.traces[k]));
    const x = { id, source: 'talent', rang: 1, g: 0, oublie: { acte: RUN.act, salle: 0 }, porte: 0 }; RUN.reserveBrume.push(x); MM.restore(x, true);
    return { refus: X.refus(id), designer: X.designer(id) }; });
  await page.screenshot({ path: `/tmp/claude-0/-home-claude/14ce4a6c-54f7-5ef2-a136-14c041eb6c8a/scratchpad/hud-${cls}.png` });
  await page.close();
  console.log(cls, JSON.stringify({ r, pz, ap, ap2, b, t, errs: errs.slice(0, 4) }));
  ok(r.actifData === false && r.actifAvant === false, `${cls} : inerte tant que dernier.actif est faux`);
  ok(r.hudDsAvant === 0, `${cls} : aucune marque au HUD avant activation`);
  ok(r.refusRoot === 'genre', `${cls} : racine refusée (${r.refusRoot})`);
  ok(r.refusUlt === '', `${cls} : ultime brûlable (${r.refusUlt})`);
  ok(r.refusCours === 'enCours', `${cls} : ultime en cours refusé (${r.refusCours})`);
  ok(r.actifApres === true, `${cls} : activation de développement`);
  ok(pz.pause && pz.braise, `${cls} : pause avec la braise`);
  ok(pz.dsno === 1, `${cls} : une tuile non brûlable (la racine), ${pz.dsno}`);
  ok(ap.designe === cible && ap.pzDs === 1 && ap.hudDs === 1, `${cls} : désignation par clic (pause et HUD) ${JSON.stringify(ap)}`);
  if (r.skill) ok(ap.pzFel >= 1 && ap.hudFel >= 1, `${cls} : la compétence désignée fêle ${r.maj}`);
  ok(ap2.designe === null && ap2.pzDs === 0, `${cls} : second clic retire`);
  ok(b.enCombat && b.braises0 === 1, `${cls} : en combat, une braise`);
  ok(b.res && !b.res.refus && b.res.id === cible, `${cls} : brûlure faite ${JSON.stringify(b.res)}`);
  ok(b.n[1] === b.n[0] - 1, `${cls} : la place se libère`);
  ok(b.res.reserve[0] === b.res.reserve[1] && b.reserveSansBrule, `${cls} : rien dans la réserve`);
  ok(b.rank === undefined && b.trace > 0, `${cls} : rang retiré, trace gardée`);
  ok(b.brules.includes(cible) && b.designe === null, `${cls} : M.brules, désignation tombée`);
  ok(b.soin && b.hpOk, `${cls} : aucun soin, PV bornés`);
  ok(!b.dispo && b.offert === 0 && !b.gravable, `${cls} : jamais offert ni gravé (${b.offert} offres)`);
  ok(b.arbre.b === 1 && b.arbre.t === 1 && b.legende, `${cls} : arbre « brûlé » et légende`);
  if (r.skill) ok(b.majEteint === true && b.res.eteints.includes(r.maj), `${cls} : ${r.maj} s'éteint avec ${r.skill}`);
  ok(b.braises1 === 0 && b.refus2 === 'braise', `${cls} : une braise par acte (${b.refus2})`);
  ok(Array.isArray(b.diff) ? b.diff.length === 0 : true, `${cls} : P.s = reconstruction ${JSON.stringify(b.diff)}`);
  ok(b.braisesActeSuivant === 1, `${cls} : la braise revient à l'acte suivant`);
  ok(b.horsCombat === 'combat', `${cls} : hors combat refusé (${b.horsCombat})`);
  ok(b.desAvant && b.desApres === null, `${cls} : désignation tombée à l'oubli`);
  ok(b.chronique, `${cls} : ligne de chronique`);
  ok(t.refus === 'trophee' && t.designer === false, `${cls} : trophée ni brûlé ni désigné`);
  ok(!errs.length, `${cls} : erreurs ${errs.join(' | ')}`);
}
// régression : descente ordinaire, écran titre, sans activation
const page = await browser.newPage(); const errs = []; page.on('pageerror', e => errs.push(String(e)));
await page.goto(`http://127.0.0.1:${PORT}/index.html`); await page.waitForTimeout(1500);
ok(!errs.length, 'écran titre : ' + errs.join(' | '));
await browser.close();
console.log(`\n${checks} vérifications, ${fails} échec(s)`);
process.exit(fails ? 1 : 0);
