// Mesures de l'action 10 (v17.24) : deux effets du Dernier Souvenir contre un fort (Masqué), avant / après.
// node mesure-forts.mjs <port> [acte=2] [essais=12]
// A. Dernière ombre contre un Masqué : sorts lancés et dégâts reçus en 3 s, avec et sans la brûlure.
//    Le joueur ne bouge pas et « attaque » (P.lastAtk tenu) pour que l'invisibilité de son propre kit n'entre pas en compte.
// B. Dernier élan contre un Masqué : le joueur (Gouffre, Charge brutale rang 3) traverse le Masqué en esquive, aller-retour, 3 s ;
//    PV perdus par le Masqué avec et sans la brûlure, part des coups du kit, plafond de la brûlure.
import { createRequire } from 'node:module';
const require = createRequire('/opt/npm-tools/node_modules/');
const { chromium } = require('playwright');
const port = process.argv[2] || 8765, acte = +(process.argv[3] || 2), N = +(process.argv[4] || 12);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
const avecMasque = () => { try { const d = window.__asm.dbg(); return d.state === 'play' && d.enemies.some(e => !e.dead && e.asm); } catch (e) { return false; } };
const errs = [];
async function ouvre(qs) {
  const page = await browser.newPage();
  page.on('pageerror', e => errs.push(String(e).slice(0, 300)));
  await page.goto(`http://127.0.0.1:${port}/index.html?${qs}`);
  await page.waitForFunction(avecMasque, null, { timeout: 30000 });
  await page.waitForTimeout(300);
  return page;
}
// A
{
  const page = await ouvre(`dernier=pen_k1&masque=1&classe=lum&acte=${acte}`);
  const r = await page.evaluate((N) => {
    const B = window.__brume, X = window.__dernier, P = B.P, RUN = B.RUN;
    P.iT = 99; B.step(1 / 60, 270);   // fin du montage
    const M = B.enemies.find(e => !e.dead && e.asm);
    const fenetre = (avec) => {
      if (avec) { const Me = window.__memoire.M; if (Me.brules) Me.brules = Me.brules.filter(x => x.id !== 'pen_k1'); X.prendre('pen_k1', 1, 2); X.bruler('pen_k1', { libre: true }); }
      let charges = 0, recu = 0, invis = 0, ph = M.asm.st.ph, perdu = 0;
      for (let i = 0; i < 180; i++) {
        P.lastAtk = RUN.time; P.dashInvisT = 0; P.nightT = 0; P.iT = 0; P.hitIT = 0;
        const h0 = P.hp + (P.shield || 0); B.step(1 / 60, 1);
        recu += Math.max(0, h0 - P.hp - (P.shield || 0)); P.hp = P.s.maxHp; P.shield = 0;
        if (M.asm.st.ph === 'charge' && ph !== 'charge') charges++; ph = M.asm.st.ph;
        if (P.invisible) invis++;
        if (M.hp < M.maxHp * 0.5) M.hp = M.maxHp * 0.6;   // ni rage ni mort
      }
      B.step(1 / 60, 30); P.hp = P.s.maxHp;   // la brûlure est finie
      return { charges, recu, invis: invis / 60 };
    };
    const sans = [], avec = [];
    for (let k = 0; k < N; k++) { sans.push(fenetre(false)); avec.push(fenetre(true)); }
    const moy = (a, f) => Math.round(a.reduce((n, x) => n + x[f], 0) / a.length * 100) / 100;
    return { sans: { charges: moy(sans, 'charges'), recu: moy(sans, 'recu'), invis: moy(sans, 'invis') }, avec: { charges: moy(avec, 'charges'), recu: moy(avec, 'recu'), invis: moy(avec, 'invis') }, cible: avec.map(x => x.charges).join(',') };
  }, N);
  console.log(`A. Dernière ombre (force 3) contre le Masqué, acte ${acte}, ${N} fenêtres de 3 s :`, JSON.stringify(r));
  await page.close();
}
// B
{
  const page = await ouvre(`dernier=dif_n2&masque=1&classe=gou&acte=${acte}`);
  const r = await page.evaluate((N) => {
    const B = window.__brume, X = window.__dernier, P = B.P;
    P.iT = 99; B.step(1 / 60, 270);
    const M = B.enemies.find(e => !e.dead && e.asm);
    X.prendre('dif_n8', 3, 0);   // Charge brutale rang 3 : la ruée du Gouffre la plus forte
    const mx = 640, my = 360;
    const fenetre = (avec, id, g) => {
      let rec = null;
      if (avec) { const Me = window.__memoire.M; if (Me.brules) Me.brules = Me.brules.filter(x => x.id !== id); X.prendre(id, 1, g); rec = X.bruler(id, { libre: true }); }
      P.dashCh = P.s.dashCharges; P.dashRecT = P.s.dashCd; P.x = mx - 120; P.y = my; P.face = 0;
      M.hp = M.maxHp * 0.6; let perdu = 0, esq = 0;
      for (let i = 0; i < 180; i++) {
        M.x = mx; M.y = my; M.kbx = M.kby = 0; M.stun = 0; P.iT = 99;
        if (P.dashT <= 0 && P.dashCh > 0) { P.face = P.x < mx ? 0 : Math.PI; P.vx = P.vy = 0; window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' })); window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space' })); esq++; }
        const h0 = M.hp; B.step(1 / 60, 1); perdu += Math.max(0, h0 - M.hp); M.hp = M.maxHp * 0.6; P.hp = P.s.maxHp;
        P.y = my;
      }
      B.step(1 / 60, 30);
      return { perdu: Math.round(perdu), esq, brule: rec ? Math.round(rec.surFort) : 0, plaf: rec ? Math.round(X.plafondDe(M, rec.force)) : 0, force: rec ? rec.force : 0 };
    };
    const out = {};
    for (const [nom, id, g] of [['f1', 'dif_n2', 0], ['fmax', 'dif_x2a', 2]]) {
      const s = [], a = [];
      for (let k = 0; k < N; k++) { s.push(fenetre(false)); a.push(fenetre(true, id, g)); }
      const moy = (t, f) => Math.round(t.reduce((n, x) => n + x[f], 0) / t.length);
      out[nom] = { force: a[0].force, pvMasque: Math.round(M.maxHp), plafond: a[0].plaf, sans: { perdu: moy(s, 'perdu'), esq: moy(s, 'esq') }, avec: { perdu: moy(a, 'perdu'), esq: moy(a, 'esq'), dontBrulure: moy(a, 'brule') }, enPlus: moy(a, 'perdu') - moy(s, 'perdu') };
    }
    return out;
  }, N);
  console.log(`B. Dernier élan contre le Masqué (Gouffre, Charge brutale 3), acte ${acte}, ${N} fenêtres de 3 s :`, JSON.stringify(r));
  await page.close();
}
await browser.close();
console.log(errs.length ? 'ERREURS : ' + errs.join(' | ') : 'aucune erreur de script');
