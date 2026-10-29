// Mesures de l'action 7 : ce que chaque brûlure fait à une vague ordinaire de l'acte II (sans les autres coups du joueur), force 1 et force max.
import { createRequire } from 'node:module';
const require = createRequire('/opt/npm-tools/node_modules/');
const { chromium } = require('playwright');
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
const res = {};
for (const cls of ['lum', 'gou', 'her', 'tis']) {
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:8765/index.html?dernier=fan_n2&classe=lum&acte=2`.replace('fan_n2&classe=lum', { lum: 'ray_n4&classe=lum', gou: 'dif_n4&classe=gou', her: 'cad_n4&classe=her', tis: 'aig_k1&classe=tis' }[cls]));
  await page.waitForFunction(() => { try { return window.__dernier.essaiEtat().on && window.__asm.dbg().enemies.some(e => !e.dead); } catch (e) { return false; } }, null, { timeout: 30000 });
  const R = await page.evaluate((cls) => {
    const B = window.__brume, X = window.__dernier, SV = window.BRUME_DATA.souvenirs, N = window.BRUME_DATA.talents.noeuds, BRs = window.BRUME_DATA.talents.branches, P = B.P;
    const out = {};
    const L = f => (SV.familles[f].t || []).filter(k => BRs[k.split('_')[0]].cls === cls && N[k].k !== 'c');
    const kinds = ['rampant', 'spectre', 'hurleur', 'rampant', 'spectre', 'rampant'];
    for (const f of Object.keys(SV.dernier.familles)) {
      const ids = L(f); if (!ids.length) continue;
      out[f] = {};
      // force 1 : un mineur (ou le plus faible) au rang 1 ; force max : le plus lourd, gravé deux fois
      const w = k => /_sk$/.test(k) || N[k].k === 'k' ? 3 : N[k].k === 'x' || N[k].k === 's' ? 2 : 1;
      const faible = ids.slice().sort((a, b) => w(a) - w(b))[0], fort = ids.slice().sort((a, b) => w(b) - w(a))[0];
      for (const [nom, id, g] of [['f1', faible, 0], ['fmax', fort, 2]]) {
        for (const e of B.enemies) if (!e.dead) e.dead = true;
        const room = window.__asm.dbg().room; room.cleared = false; room.spawning = [];
        P.x = 640; P.y = 420; P.hp = P.s.maxHp; P.iT = 0; P.shield = 0;
        const es = kinds.map((k, i) => { const a = i / kinds.length * 6.283, d = 120 + (i % 3) * 90; return B.create(k, P.x + Math.cos(a) * d, P.y + Math.sin(a) * d, false); });
        const hp0 = es.reduce((n, e) => n + e.hp, 0);
        X.prendre(id, 1, g); const r = X.bruler(id, { libre: true });
        let ctrl = 0, slow = 0;
        for (let i = 0; i < 300; i++) { P.iT = 99; B.step(1 / 60, 1); for (const e of es) if (!e.dead) { if ((e.stun || 0) > 0) ctrl += 1 / 60; if ((e.slowT || 0) > 0) slow += 1 / 60; } }
        const hp1 = es.reduce((n, e) => n + (e.dead ? 0 : Math.max(0, e.hp)), 0);
        out[f][nom] = { id, force: Math.round(r.force * 100) / 100, pctPV: Math.round((hp0 - hp1) / hp0 * 100), morts: es.filter(e => e.dead).length, ctrlS: Math.round(ctrl * 10) / 10, ralentiS: Math.round(slow * 10) / 10, soin: Math.round(r.soin), bouclier: Math.round(r.bouclier), pvMax: Math.round(P.s.maxHp), vagueHp: Math.round(hp0) };
      }
    }
    return out;
  }, cls);
  res[cls] = R;
  await page.close();
}
await browser.close();
for (const [cls, R] of Object.entries(res)) for (const [f, o] of Object.entries(R)) console.log(cls.padEnd(4), f.padEnd(11), 'f1', JSON.stringify(o.f1), '\n                 fmax', JSON.stringify(o.fmax));
