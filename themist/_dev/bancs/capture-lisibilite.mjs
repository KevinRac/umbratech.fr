// v17.27 · Les gardiens redessinés (cadrage G1–G18), action 5 : lisibilité des trois gardiens.
// Usage : node capture-lisibilite.mjs [port] [dossier de sortie] [zoom]   (serveur local sur themist/, comme les autres bancs)
// Vérifie, pour la Mère-Brume (acte I), le Héraut Noyé (acte II) et le Glas Originel (acte III), aux trois temps :
//   G3  : ΔE ≥ 25 (CIE76, Lab) entre chaque lueur du gardien et chaque couleur de télégraphe (orange des zones, violet des tirs, cyan de saisie) et la lavande
//         des souvenirs. Les couleurs mesurées sont celles que le jeu DESSINE (espion sur les halos, capture des traits des lueurs), plus les données
//         (dessin[n].lueur, yeux, reflets, nu, œil, matière), les lumières de salle (TINT) et les quatre couleurs de copie.
//   G5  : le point faible porte partout le même signe (G27.anneau) : une fois, à sa place (œil, battant, cœur-cloche), seulement quand le gardien est
//         à nu (sonné ou fenêtre de l'Accoutumance) et pas pendant un fondu d'esquive.
//   G13 : pendant une copie, la lueur est à la couleur de ta forme (les quatre formes) et seulement alors ; le fondu de l'esquive (e.fade) couvre tout le
//         dessin du corps, cache compris, ses lueurs et l'éclat d'un changement de temps (les débris tombés au sol restent, ils ne sont pas son corps).
// Produit : lisibilite-copies.png (trois gardiens × quatre formes, copie au deuxième temps), lisibilite-nu-fondu.png (troisième temps : repos, à nu,
// copie à fond, à demi, presque disparu), avec les trois couleurs de télégraphe en témoin dans chaque case.
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
const require = createRequire('/opt/npm-tools/node_modules/');
const { chromium } = require('playwright');
const sharp = require('sharp');
const PORT = process.argv[2] || 8765, OUT = process.argv[3] || '.', ZOOM = +(process.argv[4] || 2), BASE = `http://127.0.0.1:${PORT}/index.html`;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
let fails = 0, checks = 0;
const ok = (c, m) => { checks++; if (!c) { fails++; console.error('ÉCHEC : ' + m); } else console.log('ok · ' + m); };

// ── couleurs
const lab = ([R, G, B]) => { const f = v => { v /= 255; return v > 0.04045 ? ((v + 0.055) / 1.055) ** 2.4 : v / 12.92; }; const [r, g, b] = [f(R), f(G), f(B)];
  const X = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047, Y = r * 0.2126 + g * 0.7152 + b * 0.0722, Z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
  const h = t => t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116; return [116 * h(Y) - 16, 500 * (h(X) - h(Y)), 200 * (h(Y) - h(Z))]; };
const dE = (a, b) => { const A = lab(a), B = lab(b); return Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]); };
const REFS = { zone: [255, 150, 60], tirs: [205, 120, 255], saisie: [90, 220, 255], souvenirs: [180, 160, 255] };   // TELE (index.html) et lavande des souvenirs
const CRGB = { lum: '243,185,77', gou: '143,212,110', her: '159,208,255', tis: '255,120,160' };                    // la couleur de chaque forme (index.html, CRGB)
const FORMES = ['lum', 'gou', 'her', 'tis'];
const arr = s => s.split(',').map(Number), str = a => a.join(',');
const pire = c => Object.entries(REFS).map(([n, r]) => [n, dE(c, r)]).sort((a, b) => a[1] - b[1])[0];
const ACTES = { 1: { cle: 'mere', nom: 'La Mère-Brume' }, 2: { cle: 'heraut', nom: 'Le Héraut Noyé' }, 3: { cle: 'glas', nom: 'Le Glas Originel' } };

async function ouvrir(act) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1, reducedMotion: 'no-preference' });
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 300)));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text().slice(0, 300)); });
  await page.goto(`${BASE}?dernier=ray_n4&acte=${act}&gardien=1`);
  await page.waitForFunction(() => { try { const d = window.__glas.dbg(); return d.state === 'play' && d.enemies.some(e => !e.dead && e.type === 'boss'); } catch (e) { return false; } }, null, { timeout: 40000 });
  // aides du banc, dans la page : rien que des lectures et des mises en scène du dessin (jamais du combat)
  await page.evaluate(() => {
    const G = window.__gardiens, L = window.__lisi = {};
    L.boss = () => window.__glas.dbg().enemies.find(e => e.type === 'boss' && !e.dead);
    L.prep = () => { if (L.o) return L.o; const c = document.createElement('canvas'); c.width = 1280; c.height = 720; const o = c.getContext('2d', { willReadFrequently: true });
      const d = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(o), 'strokeStyle');
      Object.defineProperty(o, 'strokeStyle', { get() { return d.get.call(o); }, set(v) { if (L.capt && typeof v === 'string') L.capt.push(v); d.set.call(o, v); }, configurable: true });
      // journal des tracés : alpha effectif de chaque fill / stroke / drawImage = globalAlpha × alpha de la couleur (ou le plus haut des arrêts d'un dégradé)
      const alphaDe = s => { const m = /rgba\([^)]*,\s*([\d.]+)\s*\)/.exec(s); return m ? +m[1] : 1; };
      const tag = g => { g.__a = 0; const add = g.addColorStop.bind(g); g.addColorStop = (t, c) => { g.__a = Math.max(g.__a, typeof c === 'string' ? alphaDe(c) : 1); return add(t, c); }; return g; };
      for (const n of ['createRadialGradient', 'createLinearGradient']) { const f = o[n].bind(o); o[n] = (...a) => tag(f(...a)); }
      const eff = st => typeof st === 'string' ? alphaDe(st) : (st && st.__a != null ? st.__a : 1);
      const wrap = (n, sty) => { const f = o[n].bind(o); o[n] = function () { if (L.log) { const fr = new Error().stack.split('\n').slice(2, 6).map(s => (s.match(/:(\d+):\d+\)?\s*$/) || [])[1] || '?');
        L.log.push({ k: n, eff: o.globalAlpha * (sty ? eff(o[sty]) : 1), at: fr.join('<') }); } return f.apply(this, arguments); }; };
      wrap('fill', 'fillStyle'); wrap('fillRect', 'fillStyle'); wrap('stroke', 'strokeStyle'); wrap('strokeRect', 'strokeStyle'); wrap('drawImage', null);
      return (L.o = o); };
    // le journal des tracés d'une scène (corps puis lueurs, comme le jeu), pour comparer deux fondus
    L.ops = (cle, S) => { L.pose(cle, S); L.prep(); L.log = []; try { L.rendu(cle, null); } finally { var r = L.log; L.log = null; } return r; };
    L.opsFondus = (cle, S, fds) => fds.map(fd => L.ops(cle, { ...S, fd }));
    // met en scène : état de dessin et de combat minimal (jamais de PV ni d'attaque)
    L.pose = (cle, S) => {
      const e = L.boss(), P = window.__brume.P, g = G[cle].etat(e);
      P.cls = S.cls || 'lum'; e.state = S.state || 'idle'; e.copy = S.copy || null; e.vuln = S.vuln || 0; e.rawT = S.rawT || 0; e.stun = 0; e.fade = S.fd == null ? 1 : S.fd;
      if (g.sol) g.sol.length = 0; if (g.vole) g.vole.length = 0;   // les débris restent au sol : ils ne sont pas le corps
      g.t = S.flash ? G.T - 0.01 : -9; if (S.flash) g.de = e.phase - 1;
      if (cle === 'mere') { g.cop = S.copy ? 1 : 0; g.esq = -9; }
      return { e, g };
    };
    L.rendu = (cle, part, capt) => { const o = L.prep(), e = L.boss(); o.setTransform(1, 0, 0, 1, 0, 0); o.globalAlpha = 1; o.globalCompositeOperation = 'source-over'; o.clearRect(0, 0, 1280, 720);
      o.translate(e.x, e.y); L.capt = capt || null; try { G[cle].apercu(o, e, part); } finally { L.capt = null; } o.setTransform(1, 0, 0, 1, 0, 0); return o; };
    L.stats = o => { const d = o.getImageData(0, 0, 1280, 720).data; let sum = 0, max = 0; for (let i = 3; i < d.length; i += 4) { if (d[i] > max) max = d[i]; sum += d[i]; } return { sum: sum / 255, max: max / 255 }; };
    // une scène complète : halos (corps puis lueurs), traits des lueurs, appels de l'anneau, point faible attendu, alpha du dessin entier
    L.scen = (cle, S) => {
      const { e, g } = L.pose(cle, S), a0 = G.G27.anneau, A = [], strokes = [];
      G.G27.anneau = function (c, x, y, r) { A.push({ x, y, r }); return a0.apply(this, arguments); };
      let glC, glL;
      try { glC = G.G27.espion(() => L.rendu(cle, 'corps')); glL = G.G27.espion(() => L.rendu(cle, 'lueurs', strokes)); }
      finally { G.G27.anneau = a0; }
      const o = L.rendu(cle, null), st = L.stats(o), eye = G.EYE && G.EYE.boss;
      const faible = cle === 'glas' ? [e.x, e.y] : cle === 'heraut' ? g.batt : [e.x + g.R.core.x, e.y + g.R.core.y];
      return { glC, glL, strokes, A, faible, st, r: e.r, eye, copie: G.G27.copie() };
    };
    // une case de planche : fond sombre, le gardien tel que le jeu le dessine, les trois témoins de télégraphe
    L.tuile = (sheet, tx, ty, tw, th, zoom, cle, S, cx, cy, label, figer) => {
      const { e } = L.pose(cle, S), o = sheet.getContext('2d'), a0 = G.G27.anneau;
      if (figer) G.G27.anneau = function (c, x, y, r) { c.strokeStyle = 'rgba(255,250,235,.95)'; c.lineWidth = 2.5; c.beginPath(); c.arc(x, y, r * 0.3, 0, Math.PI * 2); c.stroke(); };
      o.save(); o.beginPath(); o.rect(tx, ty, tw * zoom, th * zoom); o.clip(); o.fillStyle = '#17141b'; o.fillRect(tx, ty, tw * zoom, th * zoom);
      o.save(); o.translate(tx + cx * zoom, ty + cy * zoom); o.scale(zoom, zoom); try { G[cle].apercu(o, e); } finally { G.G27.anneau = a0; } o.restore();
      o.font = '12px sans-serif'; o.fillStyle = '#d9d4e0'; o.fillText(label, tx + 8, ty + 16);
      ['255,150,60', '205,120,255', '90,220,255'].forEach((c, i) => { o.fillStyle = `rgb(${c})`; o.fillRect(tx + tw * zoom - 14 - i * 16, ty + th * zoom - 14, 10, 10); });
      o.restore(); e.fade = 1;
    };
    L.feuille = (cols, rows, tw, th, zoom) => { const c = document.createElement('canvas'); c.width = cols * tw * zoom; c.height = rows * th * zoom; L.sheet = c; return true; };
    L.png = () => L.sheet.toDataURL('image/png');
  });
  return { page, errs, ctx };
}
// vide la salle (invoqués, tirs) et remet le gardien au repos, toi en bas
const calme = page => page.evaluate(() => {
  const D = window.__glas.dbg(), B = window.__brume, P = B.P, K = window.__asm.dbg().kill, b = D.enemies.find(e => e.type === 'boss' && !e.dead);
  for (const x of D.enemies) if (x !== b && !x.dead) K(x);
  D.eproj.length = 0; D.rings.length = 0; if (window.__glasHZ) window.__glasHZ().length = 0; if (D.room.spawning) D.room.spawning.length = 0; if (D.room.glas) D.room.glas.reflet = null;
  b.state = 'idle'; b.patT = 99; b.beatT = 99; b.queue = []; b.beams = null; b.vuln = 0; b.rawT = 0; b.stun = 0; b.fade = 1; b.reach = b.reachTo = 0; b.grabbing = false; b.armT = null; D.room.drainT = 0;
  P.x = 640; P.y = 620; P.iT = 99; P.grabT = 0; P.hp = P.s.maxHp; B.hideMsg(); P.cls = 'lum';
});
async function temps(page, t) {
  await page.evaluate(t => { const D = window.__glas.dbg(), B = window.__brume, P = B.P, b = D.enemies.find(e => e.type === 'boss' && !e.dead);
    b.hp = b.maxHp * [1, 0.95, 0.5, 0.2][t]; for (let i = 0; i < 150; i++) { P.iT = 99; P.hp = P.s.maxHp; B.step(1 / 60); } }, t);
  await calme(page); await page.waitForTimeout(900); await calme(page); await page.waitForTimeout(150);
}
const parse = s => { const m = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)/.exec(s); return m ? { c: [+m[1], +m[2], +m[3]], a: m[4] == null ? 1 : +m[4] } : null; };

// ── la matière des données, une fois (les trois gardiens)
const rowsPng = { copies: [], nufondu: [] };
const dessinAll = {};
const trace = { tele: new Set(), couleurs: new Map() };   // couleur → d'où elle vient
const note = (c, ou) => { const k = str(c); if (!trace.couleurs.has(k)) trace.couleurs.set(k, new Set()); trace.couleurs.get(k).add(ou); };
const COULEUR_TELE = new Set(Object.values(REFS).slice(0, 3).map(str));

for (const act of [1, 2, 3]) {
  const { cle, nom } = ACTES[act], { page, errs, ctx } = await ouvrir(act);
  console.log(`\n══ ${nom} (acte ${act}) ══`);
  const D = await page.evaluate(() => JSON.parse(JSON.stringify(window.BRUME_DATA.gardiens.dessin)));
  dessinAll[act] = D[act]; if (act === 1) dessinAll.copie = D.copie;
  const tint = await page.evaluate(() => ({ glas: window.__gardiens.TINT.glas, lampe: window.__gardiens.TINT.lampe, perle: window.__gardiens.TINT.perle }));
  // 1. les données
  for (const k of ['lueur', 'yeux', 'reflets', 'nu', 'oeil']) if (D[act][k]) note(D[act][k], `dessin[${act}].${k}`);
  for (const [k, v] of Object.entries(D[act].matiere || {})) note(v, `dessin[${act}].matiere.${k}`);
  const tn = { 1: 'perle', 2: 'lampe', 3: 'glas' }[act]; note(arr(tint[tn]), `TINT.${tn} (lumière de salle)`);

  for (const ph of [1, 2, 3]) {
    await temps(page, ph);
    const etat = await page.evaluate(() => { const b = window.__lisi.boss(); return { phase: b.phase, r: b.r }; });
    ok(etat.phase === ph, `${nom} : temps ${ph} atteint`);
    const S = (o) => page.evaluate(([cle, o]) => window.__lisi.scen(cle, o), [cle, o]);

    // 2. G3 : ce que le jeu dessine, au repos, à nu, en copie (chaque forme), pendant l'éclat de changement de temps
    const scenes = {};
    scenes.repos = await S({});
    scenes.nu = await S({ vuln: 2 });
    if (ph >= 2) for (const f of FORMES) scenes['copie_' + f] = await S({ state: 'mvolley', copy: 'volee', cls: f });
    else scenes.copie_lum = await S({ state: 'mvolley', copy: 'volee', cls: 'lum' });   // (la copie vient au deuxième temps ; le dessin la sait déjà : on le mesure aussi)
    if (ph >= 2) scenes.flash = await S({ flash: 1 });
    for (const [n, s] of Object.entries(scenes)) {
      for (const h of [...s.glC, ...s.glL]) if (h.a > 0) note(arr(h.col), `halo · ${nom} t${ph} ${n}`);
      for (const t of s.strokes) { const p = parse(t); if (p && p.a >= 0.1) note(p.c, `trait des lueurs · ${nom} t${ph} ${n}`); }
    }

    // 3. G13 : la lueur de copie, pour chaque forme
    const dc = (dessinAll.copie || {});
    const attendu = f => dc[f] ? str(dc[f]) : CRGB[f];
    for (const f of (ph >= 2 ? FORMES : ['lum'])) {
      const s = scenes['copie_' + f], cols = new Set([...s.glC, ...s.glL].filter(h => h.a > 0).map(h => h.col));
      ok(s.copie === attendu(f), `${nom} t${ph} · forme ${f} : G27.copie() = ${s.copie} (attendu ${attendu(f)})`);
      ok(cols.has(attendu(f)), `${nom} t${ph} · copie ${f} : la lueur est à la couleur de la forme (${attendu(f)})`);
      for (const g of FORMES) if (g !== f) ok(!cols.has(attendu(g)) && !cols.has(CRGB[g]), `${nom} t${ph} · copie ${f} : aucune lueur à la couleur de la forme ${g}`);
      if (cle === 'mere') ok(s.eye === attendu(f), `${nom} t${ph} · copie ${f} : les sept yeux prennent la couleur de la forme (${s.eye})`);
    }
    {
      const s = scenes.repos, cols = new Set([...s.glC, ...s.glL].filter(h => h.a > 0).map(h => h.col));
      for (const f of FORMES) ok(!cols.has(attendu(f)) && !cols.has(CRGB[f]), `${nom} t${ph} · au repos : pas de lueur à la couleur de la forme ${f}`);
    }

    // 4. G5 : l'anneau du point faible
    {
      const R = scenes.repos, N = scenes.nu;
      ok(R.A.length === 0, `${nom} t${ph} · au repos : pas d'anneau`);
      ok(N.A.length === 1, `${nom} t${ph} · sonné : un seul anneau (${N.A.length})`);
      if (N.A.length) { const a = N.A[0]; ok(Math.hypot(a.x - N.faible[0], a.y - N.faible[1]) < 0.5, `${nom} t${ph} · l'anneau est sur le point faible (${a.x.toFixed(1)}, ${a.y.toFixed(1)} ; attendu ${N.faible.map(v => v.toFixed(1)).join(', ')})`); ok(a.r === N.r, `${nom} t${ph} · l'anneau est à l'échelle du gardien (r ${a.r})`); }
      const W = await S({ rawT: 2 }), F = await S({ vuln: 2, fd: 0.2 }), F2 = await S({ vuln: 2, fd: 0.5 });
      ok(W.A.length === 1, `${nom} t${ph} · fenêtre de l'Accoutumance (rawT) : un anneau`);
      ok(F.A.length === 0, `${nom} t${ph} · fondu d'esquive à 0,2 : pas d'anneau (le point faible disparaît avec lui)`);
      ok(F2.A.length === 1, `${nom} t${ph} · fondu à 0,5 : l'anneau reste`);
    }

    // 5. G13 : le fondu de l'esquive couvre tout le dessin, cache compris. Chaque tracé (fill, stroke, drawImage : le cache, les halos, les traits) est
    // comparé à lui-même à fondu 1 : son alpha effectif doit être au plus × fondu. (Pas de critère sur le pixel le plus opaque : plusieurs couches
    // empilées s'additionnent légitimement. L'anneau du point faible, qui n'existe qu'au-dessus de 0,3, est vérifié plus haut.)
    {
      const cas = { repos: {}, copie: { state: 'mvolley', copy: 'volee', cls: 'her' } };
      if (ph >= 2) cas.flash = { flash: 1 };
      for (const [n, o] of Object.entries(cas)) {
       const [A, ...Cs] = await page.evaluate(([cle, o]) => window.__lisi.opsFondus(cle, o, [1, 0.5, 0.08]), [cle, o]);   // le même instant de jeu pour les trois
       for (const [fd, C] of [[0.5, Cs[0]], [0.08, Cs[1]]]) {
        ok(A.length > 20 && A.length === C.length, `${nom} t${ph} · fondu ${n} ${fd} : même dessin, ${A.length} tracés (${C.length} au fondu)`);
        const mauvais = []; for (let i = 0; i < Math.min(A.length, C.length); i++) if (C[i].eff > A[i].eff * fd * 1.05 + 0.002) mauvais.push(`${C[i].k} ligne ${C[i].at} : ${A[i].eff.toFixed(3)} → ${C[i].eff.toFixed(3)} (attendu ≤ ${(A[i].eff * fd).toFixed(3)})`);
        ok(!mauvais.length, `${nom} t${ph} · fondu ${n} ${fd} : aucun tracé n'échappe au fondu${mauvais.length ? ' : ' + mauvais.slice(0, 6).join(' | ') + (mauvais.length > 6 ? ` | +${mauvais.length - 6}` : '') : ''}`);
       }
      }
      const P1 = await S({ ...cas.repos, fd: 1 }); ok(P1.st.sum > 50, `${nom} t${ph} · le dessin plein existe (${P1.st.sum.toFixed(0)} px opaques équivalents)`);
    }

    // 6. planches (cases)
    if (ph === 2 || ph === 3) {
      const TW = 280, TH = 300, CX = 140, CY = cle === 'glas' ? 150 : 120;
      if (ph === 2) {
        await page.evaluate(([n, tw, th, z]) => window.__lisi.feuille(n, 1, tw, th, z), [4, TW, TH, ZOOM]);
        for (let i = 0; i < 4; i++) await page.evaluate(([cle, i, f, TW, TH, Z, CX, CY, nom]) => window.__lisi.tuile(window.__lisi.sheet, i * TW * Z, 0, TW, TH, Z, cle, { state: 'mvolley', copy: 'volee', cls: f }, CX, CY, `${nom} · copie · ${f}`, false), [cle, i, FORMES[i], TW, TH, ZOOM, CX, CY, nom]);
        rowsPng.copies[act] = await page.evaluate(() => window.__lisi.png());
      } else {
        await page.evaluate(([n, tw, th, z]) => window.__lisi.feuille(n, 1, tw, th, z), [5, TW, TH, ZOOM]);
        const defs = [[{}, 'repos', false], [{ vuln: 2 }, 'à nu (anneau)', true], [{ state: 'mvolley', copy: 'volee', cls: 'lum' }, 'copie · fondu 1', false], [{ state: 'mvolley', copy: 'volee', cls: 'lum', fd: 0.5 }, 'fondu 0,5', false], [{ state: 'mvolley', copy: 'volee', cls: 'lum', fd: 0.15 }, 'fondu 0,15', false]];
        for (let i = 0; i < defs.length; i++) await page.evaluate(([cle, i, S, lab, fig, TW, TH, Z, CX, CY, nom]) => window.__lisi.tuile(window.__lisi.sheet, i * TW * Z, 0, TW, TH, Z, cle, S, CX, CY, `${nom} · ${lab}`, fig), [cle, i, defs[i][0], defs[i][1], defs[i][2], TW, TH, ZOOM, CX, CY, nom]);
        rowsPng.nufondu[act] = await page.evaluate(() => window.__lisi.png());
      }
    }
    await calme(page);
  }
  // les quatre couleurs de copie, telles que le jeu les rend (G13 + G3), une fois
  if (act === 1) {
    for (const f of FORMES) { const c = await page.evaluate(f => { window.__brume.P.cls = f; return window.__gardiens.G27.copie(); }, f); note(arr(c), `copie de la forme ${f}`); }
    await page.evaluate(() => { window.__brume.P.cls = 'lum'; });
    const cc = FORMES.map(f => arr(attenduF(f)));
    for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) ok(dE(cc[i], cc[j]) >= 25, `les copies ${FORMES[i]} et ${FORMES[j]} restent distinctes (ΔE ${dE(cc[i], cc[j]).toFixed(1)} ≥ 25)`);
  }
  ok(errs.length === 0, `${nom} : aucune erreur de script${errs.length ? ' : ' + errs.join(' | ') : ''}`);
  await ctx.close();
}
function attenduF(f) { const dc = dessinAll.copie || {}; return dc[f] ? str(dc[f]) : CRGB[f]; }

// ── G3 : toutes les couleurs relevées contre les quatre références
console.log('\n══ G3 · ΔE de chaque couleur relevée contre zone, tirs, saisie, souvenirs ══');
let n = 0;
for (const [k, ou] of [...trace.couleurs.entries()].sort()) {
  const c = arr(k); if (COULEUR_TELE.has(k)) { console.log(`   (${k} est un télégraphe lui-même : ${[...ou][0]})`); continue; }
  const [r, d] = pire(c), matiere = [...ou].every(o => /matiere/.test(o));
  n++; ok(d >= 25, `${k.padEnd(11)} ΔE ${d.toFixed(1).padStart(5)} (le plus proche : ${r}) · ${[...ou].slice(0, 2).join(' · ')}${ou.size > 2 ? ` · +${ou.size - 2}` : ''}${matiere ? ' [matière]' : ''}`);
}
console.log(`   ${n} couleurs distinctes relevées`);
if (process.env.BANC_JSON) (await import('node:fs')).writeFileSync(process.env.BANC_JSON, JSON.stringify([...trace.couleurs.entries()].map(([k, v]) => [k, [...v]])));   // banc-gardiens-final.mjs relit les couleurs relevées

// ── planches
async function assembler(rows, nom) {
  const ids = [1, 2, 3].filter(a => rows[a]); const bufs = ids.map(a => Buffer.from(rows[a].split(',')[1], 'base64'));
  const metas = await Promise.all(bufs.map(b => sharp(b).metadata())), W = Math.max(...metas.map(m => m.width)), H = metas.reduce((s, m) => s + m.height, 0);
  let y = 0; const comp = bufs.map((b, i) => { const c = { input: b, left: 0, top: y }; y += metas[i].height; return c; });
  await sharp({ create: { width: W, height: H, channels: 3, background: '#17141b' } }).composite(comp).png().toFile(`${OUT}/${nom}.png`);
  console.log(`planche : ${OUT}/${nom}.png (${W}×${H})`);
}
await assembler(rowsPng.copies, 'lisibilite-copies');
await assembler(rowsPng.nufondu, 'lisibilite-nu-fondu');

await browser.close();
console.log(`\n${checks} vérifications, ${fails} échec(s)`);
process.exit(fails ? 1 : 0);
