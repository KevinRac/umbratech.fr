// Mesures du Dernier Souvenir contre une vague ordinaire (sans les autres coups du joueur), force 1 et force max.
// node mesure-vagues.mjs <port> [acte=2] [familles=toutes, séparées par des virgules] [valeurs d'essai en JSON, ex. '{"onde":{"degats":28}}']
// Action 7 : acte II seulement. Action 10 (v17.24) : acte au choix, familles filtrées, valeurs d'essai posées dans la page (sans toucher aux données),
// force max mesurée aussi quand la forme n'a qu'un talent dans la famille (il est retiré de la liste des brûlés entre les deux essais).
import { createRequire } from 'node:module';
const require = createRequire('/opt/npm-tools/node_modules/');
const { chromium } = require('playwright');
const port = process.argv[2] || 8765, acte = +(process.argv[3] || 2);
const filtre = process.argv[4] && process.argv[4] !== 'toutes' ? process.argv[4].split(',') : null;
const essai = process.argv[5] ? JSON.parse(process.argv[5]) : null;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
const res = {};
const depart = { lum: 'ray_n4&classe=lum', gou: 'dif_n4&classe=gou', her: 'cad_n4&classe=her', tis: 'aig_k1&classe=tis' };
for (const cls of ['lum', 'gou', 'her', 'tis']) {
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${port}/index.html?dernier=${depart[cls]}&acte=${acte}`);
  await page.waitForFunction(() => { try { return window.__dernier.essaiEtat().on && window.__asm.dbg().enemies.some(e => !e.dead); } catch (e) { return false; } }, null, { timeout: 30000 });
  res[cls] = await page.evaluate(([cls, filtre, essai]) => {
    const B = window.__brume, X = window.__dernier, SV = window.BRUME_DATA.souvenirs, N = window.BRUME_DATA.talents.noeuds, BRs = window.BRUME_DATA.talents.branches, P = B.P;
    if (essai) for (const f in essai) Object.assign(X.DS.familles[f].v, essai[f]);
    const out = {};
    const L = f => (SV.familles[f].t || []).filter(k => BRs[k.split('_')[0]].cls === cls && N[k].k !== 'c');
    const kinds = ['rampant', 'spectre', 'hurleur', 'rampant', 'spectre', 'rampant'];
    for (const f of Object.keys(SV.dernier.familles)) {
      if (filtre && !filtre.includes(f)) continue;
      const ids = L(f); if (!ids.length) continue;
      out[f] = {};
      // force 1 : le plus faible au rang 1 ; force max : le plus lourd, gravé deux fois
      const w = k => /_sk$/.test(k) || N[k].k === 'k' ? 3 : N[k].k === 'x' || N[k].k === 's' ? 2 : 1;
      const faible = ids.slice().sort((a, b) => w(a) - w(b))[0], fort = ids.slice().sort((a, b) => w(b) - w(a))[0];
      for (const [nom, id, g] of [['f1', faible, 0], ['fmax', fort, 2]]) {
        const M = window.__memoire.M; if (M.brules) M.brules = M.brules.filter(x => x.id !== id);
        for (const e of B.enemies) if (!e.dead) e.dead = true;
        const room = window.__asm.dbg().room; room.cleared = false; room.spawning = [];
        P.x = 640; P.y = 420; P.hp = P.s.maxHp; P.iT = 0; P.shield = 0;
        const es = kinds.map((k, i) => { const a = i / kinds.length * 6.283, d = 120 + (i % 3) * 90; return B.create(k, P.x + Math.cos(a) * d, P.y + Math.sin(a) * d, false); });
        const hp0 = es.reduce((n, e) => n + e.hp, 0), pvs = es.map(e => Math.round(e.maxHp));
        X.prendre(id, 1, g); const r = X.bruler(id, { libre: true });
        let ctrl = 0, slow = 0;
        for (let i = 0; i < 300; i++) { P.iT = 99; B.step(1 / 60, 1); for (const e of es) if (!e.dead) { if ((e.stun || 0) > 0) ctrl += 1 / 60; if ((e.slowT || 0) > 0) slow += 1 / 60; } }
        const hp1 = es.reduce((n, e) => n + (e.dead ? 0 : Math.max(0, e.hp)), 0);
        out[f][nom] = { id, force: r && r.force != null ? Math.round(r.force * 100) / 100 : null, refus: r && r.refus || '', pctPV: Math.round((hp0 - hp1) / hp0 * 100), morts: es.filter(e => e.dead).length, ctrlS: Math.round(ctrl * 10) / 10, ralentiS: Math.round(slow * 10) / 10, soin: Math.round(r.soin || 0), bouclier: Math.round(r.bouclier || 0), touches: r.touches || 0, pv: Math.min(...pvs) + '-' + Math.max(...pvs), vagueHp: Math.round(hp0) };
      }
    }
    return out;
  }, [cls, filtre, essai]);
  await page.close();
}
await browser.close();
console.log(`acte ${acte}${essai ? ' · essai ' + JSON.stringify(essai) : ''}`);
for (const [cls, R] of Object.entries(res)) for (const [f, o] of Object.entries(R)) {
  const l = x => x.refus ? `refus ${x.refus}` : `${x.id.padEnd(8)} f${String(x.force).padEnd(4)} ${String(x.pctPV).padStart(3)} % ${x.morts} morts${x.ctrlS ? ' ctrl ' + x.ctrlS + ' s' : ''}${x.ralentiS ? ' ralenti ' + x.ralentiS + ' s' : ''}${x.soin ? ' soin ' + x.soin : ''}${x.bouclier ? ' bouclier ' + x.bouclier : ''}`;
  console.log(cls.padEnd(4), f.padEnd(11), '|', l(o.f1), '|', l(o.fmax), '| PV', o.f1.pv, '(vague', o.f1.vagueHp + ')');
}
