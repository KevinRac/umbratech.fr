// v17.27 · Les gardiens redessinés (cadrage G1–G18), action 8 : le banc de vérification final (G17).
// Usage : node banc-gardiens-final.mjs [port] [dossier de sortie] [sections]   (serveur local sur themist/, comme les autres bancs)
//   sections (lettres, toutes par défaut) : R les bancs existants rejoués, D descente comparée, B Glas d'essai conduit (bot=1),
//   P planche finale, C coût par image, M mouvements réduits.
// Le dossier de sortie doit être HORS du dépôt (captures de contrôle) : le banc n'écrit rien dans themist/.
//
// Les neuf points de G17, et qui les vérifie :
//   1 planche ............ P (trois gardiens × trois temps × six états, avant / après, télégraphes par-dessus) + planches des bancs ci-dessous
//   2 corps plein ......... capture-gardiens, capture-heraut, capture-mere (relu ici : contour opaque / rayon de touche)
//   3 couleurs ............ capture-lisibilite (ses couleurs relevées, relues ici contre orange, violet, cyan et lavande une par une)
//   4 entrées et morts .... capture-scene (durées relues ici)
//   5 Reflet .............. capture-gardiens (glas-reflet) et B
//   6 copie, téléportation  capture-gardiens, capture-mere, capture-lisibilite
//   7 mouvements réduits .. M (rien ne balance, le battement ne grossit pas) + capture-scene (entrées et morts en fondu)
//   8 coût ................ C (la frame entière, salle chargée, porte et barre de vie avec glyphe) + coûts des bancs ci-dessus
//   9 régressions ......... D (descente des quatre formes jusqu'au Glas, dessin.actif vrai puis faux, même graine) + B ; aucune erreur de script
// Les bancs existants sont lancés tels quels (sous-processus), rien n'est recopié ; capture-glyphes et capture-portraits aussi (glyphes, portraits).
//
// Horloge : dans D, B, P et C, la page ne tourne pas d'elle-même (requestAnimationFrame retenu) ; le banc appelle frame() pas à pas, 60 images par seconde,
// et toutes les images sont dessinées. Le hasard est une graine (Math.random remplacé) ; le dessin (render) tire dans une suite à part, pour que la
// comparaison « actif vrai / faux » ne juge que le combat. Le nombre de tirages faits par le dessin est compté et rapporté.
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire('/opt/npm-tools/node_modules/');
const { chromium } = require('playwright');
const sharp = require('sharp');
const HERE = dirname(fileURLToPath(import.meta.url)), THEMIST = resolve(HERE, '..', '..');
const PORT = process.argv[2] || 8765, OUT = resolve(process.argv[3] || '/tmp/gardiens-final'), SEC = process.argv[4] || 'RDBPCM';
const BASE = `http://127.0.0.1:${PORT}/index.html`;
if (OUT.startsWith(resolve(THEMIST, '..'))) { console.error('Le dossier de sortie doit être hors du dépôt : ' + OUT); process.exit(2); }
mkdirSync(OUT, { recursive: true });
const CHROME = '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome';
let fails = 0, checks = 0; const defauts = [], observations = [], M = { date: new Date().toISOString() };
const ok = (c, m) => { checks++; if (!c) { fails++; console.error('ÉCHEC : ' + m); } else console.log('ok · ' + m); return c; };
const defaut = d => { defauts.push(d); console.log('DÉFAUT (action 9) · ' + JSON.stringify(d)); };
const ACTES = (process.env.BANC_ACTES || '1,2,3').split(',').map(Number);   // BANC_ACTES=3 pour un essai court
const NOMS = { 1: 'Mère-Brume', 2: 'Héraut Noyé', 3: 'Glas Originel' };
const FORMES = (process.env.BANC_FORMES || 'lum,gou,her,tis').split(',');   // BANC_FORMES=lum pour un essai court

// ═══ R. Les bancs existants, rejoués sur la version finale ═══════════════════════════════════════════════════════════════════
const BANCS = ['capture-gardiens', 'capture-heraut', 'capture-mere', 'capture-lisibilite', 'capture-scene', 'capture-glyphes', 'capture-portraits'];
function rejouer(nom) {
  const dir = join(OUT, 'bancs', nom); mkdirSync(dir, { recursive: true });
  const env = { ...process.env }; if (nom === 'capture-lisibilite') env.BANC_JSON = join(dir, 'couleurs.json');
  const args = [join(HERE, nom + '.mjs'), String(PORT), dir]; if (nom === 'capture-portraits') args.push('480', join(dir, 'portraits-planche.png'));
  const t0 = Date.now(), r = spawnSync('node', args, { env, encoding: 'utf8', maxBuffer: 64 << 20, timeout: 20 * 60e3 });
  const log = (r.stdout || '') + (r.stderr || ''); writeFileSync(join(dir, nom + '.log'), log);
  const bilan = (/(\d+) vérifications, (\d+) échec/.exec(log) || /(\d+)\/(\d+) vérifications passées/.exec(log) || []).slice(1).map(Number);
  return { nom, code: r.status, log, dir, s: ((Date.now() - t0) / 1000).toFixed(0), bilan };
}
const R = {};
if (SEC.includes('R')) {
  console.log('\n══ R · bancs existants ══');
  for (const n of BANCS) { const r = R[n] = rejouer(n); ok(r.code === 0, `${n} : ${r.bilan.join(' / ')} (${r.s} s, code ${r.code})`); if (r.code !== 0) { const L = r.log.split('\n').filter(l => /ÉCHEC|Error/.test(l)).slice(0, 8); console.error(L.join('\n')); for (const l of L) defaut({ banc: n, mesure: l.replace(/^ÉCHEC : /, ''), capture: `bancs/${n}/` }); } }
  // relevés : corps plein, coût du dessin seul, durées d'entrée et de mort, coût de la scène
  const num = s => +s;
  M.corps = {}; M.coutDessin = {};
  for (const [act, n] of [[3, 'capture-gardiens'], [2, 'capture-heraut'], [1, 'capture-mere']]) {
    const L = R[n].log; const pl = [...L.matchAll(/corps plein (\S+) : ([\d.]+) × r/g)].map(m => [m[1], num(m[2])]);
    M.corps[act] = { max: Math.max(...pl.map(p => p[1])), ou: (pl.find(p => p[1] === Math.max(...pl.map(q => q[1]))) || [])[0], n: pl.length };
    M.coutDessin[act] = [...L.matchAll(/coût par image(?:, temps (\d))? \(ms\) : (\{[^}]+\})/g)].map(m => ({ temps: m[1] ? +m[1] : 3, ...JSON.parse(m[2]) }));
  }
  {
    const L = R['capture-scene'].log, nes = [...L.matchAll(/née dans la bannière \(([\d.]+) s/g)].map(m => +m[1]), morts = [...L.matchAll(/dure ~1,5 s \(([\d.]+) s/g)].map(m => +m[1]),
      sc = [...L.matchAll(/scène ([\d.]+) ms\/image ≤ gardien vivant ([\d.]+)/g)].map(m => [+m[1], +m[2]]);
    M.scene = {}; for (const a of [1, 2, 3]) M.scene[a] = { entree: nes[a - 1], mort: morts[a - 1], scene: sc[a - 1] && sc[a - 1][0], vif: sc[a - 1] && sc[a - 1][1] };
  }
  // couleurs : celles que capture-lisibilite a relevées (données, lumières, halos et traits espionnés au dessin, copies), contre chaque référence
  const jf = join(OUT, 'bancs', 'capture-lisibilite', 'couleurs.json');
  if (ok(existsSync(jf), 'capture-lisibilite a écrit ses couleurs relevées (BANC_JSON)')) {
    const REFS = { orange: [255, 150, 60], violet: [205, 120, 255], cyan: [90, 220, 255], lavande: [180, 160, 255] };
    const lab = ([R, G, B]) => { const f = v => { v /= 255; return v > 0.04045 ? ((v + 0.055) / 1.055) ** 2.4 : v / 12.92; }; const [r, g, b] = [f(R), f(G), f(B)];
      const X = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047, Y = r * 0.2126 + g * 0.7152 + b * 0.0722, Z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
      const h = t => t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116; return [116 * h(Y) - 16, 500 * (h(X) - h(Y)), 200 * (h(Y) - h(Z))]; };
    const dE = (a, b) => { const A = lab(a), B = lab(b); return Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]); };
    const tele = new Set(Object.values(REFS).slice(0, 3).map(c => c.join(',')));
    const lignes = {};   // [gardien|copies][catégorie] → min par référence
    for (const [k, ou] of JSON.parse(readFileSync(jf, 'utf8'))) {
      if (tele.has(k)) continue; const c = k.split(',').map(Number);
      for (const o of ou) {
        let g = /dessin\[(\d)\]/.exec(o)?.[1] || (/Mère/.test(o) ? 1 : /Héraut/.test(o) ? 2 : /Glas Originel/.test(o) ? 3 : null) || ({ perle: 1, lampe: 2, glas: 3 })[/TINT\.(\w+)/.exec(o)?.[1]] || (/copie de la forme/.test(o) ? 'copies' : null);
        if (!g) continue;
        const cat = /matiere/.test(o) ? 'matière' : /TINT/.test(o) ? 'lumière de salle' : /^dessin/.test(o) ? 'lueurs (données)' : /copie de la forme|copie_/.test(o) ? 'copies des 4 formes' : /halo/.test(o) ? 'halos dessinés' : 'traits des lueurs';
        const L = ((lignes[g] = lignes[g] || {})[cat] = lignes[g][cat] || { n: 0, min: {}, pire: {} }); L.n++;
        for (const [rn, rc] of Object.entries(REFS)) { const d = dE(c, rc); if (L.min[rn] == null || d < L.min[rn]) { L.min[rn] = +d.toFixed(1); L.pire[rn] = k; } }
      }
    }
    M.couleurs = lignes;
    for (const [g, cats] of Object.entries(lignes)) for (const [cat, L] of Object.entries(cats)) for (const [rn, d] of Object.entries(L.min))
      if (d < 25) defaut({ gardien: NOMS[g] || g, ou: cat, mesure: `ΔE ${d} contre ${rn} (couleur ${L.pire[rn]})`, seuil: 'ΔE ≥ 25 (G3)', capture: 'bancs/capture-lisibilite/' });
  }
  // portraits : ceux du dépôt sont-ils encore ceux que le dessin final produit ?
  {
    const dir = join(OUT, 'bancs', 'capture-portraits'), ref = join(THEMIST, 'img', 'gardiens'), ecarts = [];
    for (const f of readdirSync(dir).filter(f => f.endsWith('.webp'))) {
      if (!existsSync(join(ref, f))) { ecarts.push(f + ' absent du dépôt'); continue; }
      const [a, b] = await Promise.all([join(dir, f), join(ref, f)].map(p => sharp(p).raw().toBuffer({ resolveWithObject: true })));
      let s = 0; for (let i = 0; i < a.data.length; i++) s += Math.abs(a.data[i] - b.data[i]);
      const mad = s / a.data.length; (M.portraits = M.portraits || {})[f] = +mad.toFixed(2); if (mad > 6) ecarts.push(`${f} : écart moyen ${mad.toFixed(1)}/255`);
    }
    ok(!ecarts.length, `portraits du dépôt identiques au dessin final (écart moyen ≤ 6/255) ${ecarts.join(' | ')}`);
  }
}

// ═══ Le harnais (D, B, P, C, M) ═════════════════════════════════════════════════════════════════════════════════════════════
// Le jeu vit dans une fermeture stricte : la page est servie en copie instrumentée (interception de Playwright, le fichier du dépôt n'est pas touché),
// le harnais injecté juste avant le démarrage du jeu, dans la fermeture (il lit frame, render, room, P… directement). Avant les scripts : la graine
// (Math.random) et l'horloge à la main (requestAnimationFrame retenu).
function AVANT(seed) {
  const mk = s => () => { s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const G = window.__hg = { mk, combat: mk(seed), dessin: mk(seed ^ 0x9e3779b9), nDessin: 0, raf: [], now: 1000, virt: true };
  Math.random = () => G.combat();
  // l'horloge du document suit l'horloge simulée (les boutons d'écran attendent 400 ms : armed) ; les mesures de coût lisent l'horloge réelle (G.virt = false)
  const reel = performance.now.bind(performance); G.reel = reel; performance.now = () => G.virt ? G.now : reel();
  window.requestAnimationFrame = cb => { G.raf.push(cb); return G.raf.length; };
  window.cancelAnimationFrame = () => {};
}
function DEDANS() {
  const G = window.__hg, H = window.__h = { perte: 0, ev: src => eval(src) };
  const r0 = render; render = function () { const k = Math.random; Math.random = () => { G.nDessin++; return G.dessin(); }; try { return r0.apply(this, arguments); } finally { Math.random = k; } };
  const l0 = loseHp; loseHp = function (n) { if (n > 0 && P && !P.dead) H.perte += n; return l0.apply(this, arguments); };
  // la mort d'un gardien avec l'ancien dessin : cinq explosions différées (later), qui tirent au hasard quand elles partent ; le dessin final n'en a pas.
  // Ces tirages sont cosmétiques (ni dégâts ni règle) : ils tirent ici dans la suite du dessin, sinon les récompenses tirées ensuite divergeraient pour cette
  // seule raison. Le nombre de minuteurs posés à la mort est rapporté à part (observation).
  let dansMort = false;
  const bd0 = bossDefeated; bossDefeated = function () { dansMort = true; try { return bd0.apply(this, arguments); } finally { dansMort = false; } };
  const la0 = later; later = function (t, fn) { if (!dansMort) return la0.call(this, t, fn); H.minuteursMort = (H.minuteursMort || 0) + 1;
    return la0.call(this, t, function () { const k = Math.random; Math.random = () => { G.nDessin++; return G.dessin(); }; try { return fn.apply(this, arguments); } finally { Math.random = k; } }); };
  H.graine = s => { G.combat = G.mk(s); G.dessin = G.mk(s ^ 0x9e3779b9); };
  H.nDessin = () => G.nDessin;
  H.pas = n => { for (let i = 0; i < (n || 1); i++) { G.now += 1000 / 60; frame(G.now); G.raf.length = 0; if (H.trace) H.trace.push(H.sig() + '|' + [state, paused ? 1 : 0, overlayEl.hidden ? 0 : (overlayEl.textContent || '').trim().slice(0, 40), freezeT.toFixed(3), trans ? trans.phase : '-', hintPaused ? 1 : 0].join(',') + '|' + (RUN ? RUN.time.toFixed(4) : '') + '|' + (P ? [P.level, Math.round(P.xp), P.s.maxHp, P.s.dmg.toFixed(3), (P.cor || 0).toFixed(3), (P.atkT || 0).toFixed(3), P.r.toFixed(3), enemies.length, timers.length].join(',') : '')); } };
  H.actif = v => { const A = GA_D.dessin.actif; for (const k of [1, 2, 3]) A[k] = typeof v === 'object' ? v[k] : v; };
  H.calmeMsg = () => { MSGQ.length = 0; hintPaused = false; msgCur = null; if (overlayEl.hidden && state === 'play') paused = false; };
  // fermer ce qui s'ouvre (niveaux, reliques, oubli) : le bouton OK, sinon la première carte, sinon le bouton principal (jamais relance ni abandon)
  H.vider = () => { const o = overlayEl; if (o.hidden) return 'vide'; if (o.querySelector('.endmem')) return 'fin';
    const b = o.querySelector('#bok') || o.querySelector('.card:not([disabled])') || o.querySelector('button.primary:not([disabled])') || [...o.querySelectorAll('button:not([disabled])')].find(b => !/reroll|quit|mute|hub|again/.test(b.id));
    if (b) { b.click(); return 'clic'; } return 'rien'; };
  H.boss = () => enemies.find(e => e.type === 'boss' && !e.dead && !e.reflet && !e.fantome);
  H.pret = () => !!(room && P && state === 'play');
  // pilote : vise le gardien, frappe, tourne autour à distance
  H.pilote = b => {
    for (const k of ['KeyW', 'KeyA', 'KeyS', 'KeyD']) keys.delete(k);
    if (!b || P.dead) { mouse.l = false; return; }
    mouse.x = b.x; mouse.y = b.y; mouse.l = true; mouse.r = false;
    const want = P.cls === 'gou' ? 130 : 210, a = Math.atan2(P.y - b.y, P.x - b.x) + 0.006, tx = clamp(b.x + Math.cos(a) * want, AR.x0 + 40, AR.x1 - 40), ty = clamp(b.y + Math.sin(a) * want, AR.y0 + 40, AR.y1 - 40);
    if (P.x < tx - 14) keys.add('KeyD'); else if (P.x > tx + 14) keys.add('KeyA'); if (P.y < ty - 14) keys.add('KeyS'); else if (P.y > ty + 14) keys.add('KeyW');
  };
  const f2 = v => Math.round(v * 100) / 100;
  H.sig = () => { const b = room && room.boss;
    return [room ? f2(room.bannerT) : '-', room && room.started ? 1 : 0, b ? [f2(b.x), f2(b.y), f2(b.hp), b.phase, b.state, b.r, b.dead ? 1 : 0, f2(b.vuln || 0), f2(b.stun || 0), f2(b.fade == null ? 1 : b.fade)].join(',') : '-',
      P ? [f2(P.x), f2(P.y), f2(P.hp)].join(',') : '-', enemies.filter(e => !e.dead).length, eproj.length, rings.length, room && room.spawning ? room.spawning.length : 0].join('|'); };
  // une salle ordinaire : tout ce qui vit meurt, puis la salle se vide et on referme ce qui s'ouvre
  H.salle = () => { for (let f = 0; f < 1200; f++) { H.calmeMsg(); if (!overlayEl.hidden) { if (H.vider() === 'fin') return 'fin'; }
    if (f % 10 === 0) { for (const e of enemies) if (!e.dead && e.type !== 'boss') killEnemy(e); if (room.spawning) room.spawning.length = 0; }
    H.pas(); if (P) { P.hp = P.s.maxHp; P.iT = Math.max(P.iT, 0.2); }
    if (f > 40 && room.cleared && overlayEl.hidden && !trans) return f; } return -1; };
  // le combat d'un gardien, joué : graine posée à l'entrée, puis une seconde après sa mort (les cinq explosions de l'ancien dessin tirent au hasard)
  H.gardien = (seed, max) => {
    const o = { sigs: [], phases: {}, rayons: {}, perte: 0, inflige: 0, mortF: -1, force: false, maxHp: 0, r: 0, nDessin: 0 };
    H.graine(seed); H.perte = 0; H.minuteursMort = 0; const n0 = G.nDessin, d0 = RUN.dmg; window.__glas.dbg().entrer('boss');
    for (let f = 0; f < max + 1200; f++) {
      H.calmeMsg(); if (!overlayEl.hidden && (o.mortF < 0 || f > o.mortF + 30)) H.vider();
      const b = H.boss(); H.pilote(o.mortF < 0 ? b : null);
      if (b && f % 30 === 0 && room.started) hitEnemy(b, b.maxHp * 0.012 / Math.max(0.2, P.s.dmg), { crit: false });
      if (b && f >= max && !o.force) { o.force = true; b.hp = 0; killEnemy(b); }
      H.pas(); if (P && !P.dead) P.hp = P.s.maxHp;
      const B = room.boss; if (B) { o.maxHp = B.maxHp; o.r = B.r; if (!o.phases[B.phase]) o.phases[B.phase] = f; }
      for (const e of enemies) if (!e.dead && e.type !== 'boss') o.rayons[e.type] = Math.max(o.rayons[e.type] || 0, +e.r.toFixed(2));
      if (o.mortF < 0) o.sigs.push(H.sig());
      if (o.mortF < 0 && room.bossDead) { o.mortF = f; o.tMort = RUN.time; o.minuteurs = H.minuteursMort || 0; H.minuteursMort = 0; o.perte = +H.perte.toFixed(2); o.inflige = +(RUN.dmg - d0).toFixed(2); }
      // nouvelle graine une seconde de jeu après la mort (le jeu est en pause tant que l'écran de récompense est ouvert) : l'ancien dessin tire encore
      // au hasard pendant ses cinq explosions (minuteurs `later`), le nouveau non ; sans cela, la suite du hasard décale les récompenses suivantes
      if (o.mortF >= 0 && o.regraine == null && RUN.time - o.tMort >= 1.0) { H.graine(seed * 7 + 1); o.regraine = f; }
      if (o.regraine != null && f >= o.regraine + 90) break;
    }
    o.apres = P ? [P.level, Math.round(P.xp), Math.round(P.elan || 0), RUN.kills, Math.round(P.hp)].join(',') : '-';
    o.nDessin = G.nDessin - n0; o.act = RUN.act; return o;
  };
  H.descente = (cls, seed, max, tracer) => {
    const res = { cls, gardiens: {}, salles: [] }; if (tracer) H.trace = res.trace = [];
    H.graine(seed); window.__glas.dbg().lancer(cls);
    for (let i = 0; i < 300 && !(RUN && !RUN.hub && state === 'play' && !trans); i++) { H.calmeMsg(); H.vider(); H.pas(); }
    for (let act = 1; act <= 3; act++) {
      if (act > 1) window.__glas.dbg().entrer(act === 2 ? 'act' : 'act3');
      res.salles.push(H.salle()); window.__glas.dbg().entrer('elite'); res.salles.push(H.salle());
      res.gardiens[act] = H.gardien(seed * 31 + act, max);
      for (let i = 0; i < 40; i++) { const v = H.vider(); if (v === 'vide' || v === 'fin') break; H.pas(); }
    }
    res.fin = !!document.querySelector('.endmem'); return res;
  };
  // le Glas d'essai (?glas=), pilote bot=1 (conduit vers la sortie de chaque geste du Reflet), dieu, sans l'Appel (comme au § 26 : ses Rampants touchent le pilote immobile)
  H.glasBot = (cls, liste, temps, seed, n) => {
    H.graine(seed); const nom = window.__glas.lancer(liste, temps, cls, { bot: true, dieu: true, appel: false }), sigs = []; let reflets = 0, vu = null;
    for (let f = 0; f < n; f++) { H.calmeMsg(); H.vider(); H.pas(); const Gl = room.glas, rf = Gl && Gl.reflet; if (rf && rf !== vu) { reflets++; vu = rf; }
      sigs.push(H.sig() + '|' + (rf ? [rf.asm.sb.st.ph, Math.round(rf.x), Math.round(rf.y)].join(',') : '-')); }
    const E = window.__glas.essai || {}; return { nom, sigs, reflets, E: { subis: Math.round(E.subis || 0), coups: E.coups, coupsBulle: E.coupsBulle, sup: E.sup, images: E.images, imagesZone: E.imagesZone } };
  };
  // salle du gardien au calme : invoqués, tirs, anneaux, Reflet effacés ; gardien au repos, toi en bas
  H.calme = () => { const b = H.boss(); for (const x of enemies) if (x !== b && !x.dead) killEnemy(x);
    eproj.length = 0; rings.length = 0; if (window.__glasHZ) window.__glasHZ().length = 0; if (room.spawning) room.spawning.length = 0; if (room.glas) room.glas.reflet = null; room.drainT = 0;
    b.state = 'idle'; b.patT = 99; b.beatT = 99; b.queue = []; b.beams = null; b.vuln = 0; b.rawT = 0; b.stun = 0; b.fade = 1; b.reach = b.reachTo = 0; b.grabbing = false; b.armT = null; b.copy = null;
    if (RUN.act !== 3) { b.x = 640; b.y = 300; } P.x = 640; P.y = 590; P.iT = 99; P.grabT = 0; P.hp = P.s.maxHp; shakeT = 0; };
  H.temps = t => { const b = H.boss(); b.hp = b.maxHp * [1, 0.95, 0.5, 0.2][t];
    for (let i = 0; i < 150; i++) { H.calmeMsg(); P.iT = 99; P.hp = P.s.maxHp; H.pas(); } H.calme(); for (let i = 0; i < 50; i++) { P.iT = 99; H.pas(); } H.calme(); return H.boss().phase; };
  // une case de la planche : l'état posé (code), quelques images de jeu (télégraphes et tirs partent), puis deux rendus au même instant
  H.tuile = (code, act, B) => {
    H.calme(); let b = H.boss(), N = 0, FIX = ''; eval(code);
    for (let i = 0; i < N; i++) { P.iT = 99; P.hp = P.s.maxHp; H.pas(); } b = H.boss(); eval(FIX); shakeT = 0;
    const grab = () => { const o = document.createElement('canvas'); o.width = Math.round(B.w * scale); o.height = Math.round(B.h * scale);
      o.getContext('2d').drawImage(cv, offX + B.x * scale, offY + B.y * scale, B.w * scale, B.h * scale, 0, 0, o.width, o.height); return o.toDataURL('image/png'); };
    const A = GA_D.dessin.actif; A[act] = true; render(); const apres = grab(); A[act] = false; render(); const avant = grab(); A[act] = true;
    return { apres, avant, st: b.state, ph: b.phase, tirs: eproj.length, anneaux: rings.length, bx: b.x, by: b.y, r: b.r, k: scale };
  };
  // le coût de l'image entière (render), salle chargée, ancien et nouveau dessin en alternance, sur la même image du jeu
  H.cout = (act, inv) => { G.virt = false; try { return H.cout0(act, inv); } finally { G.virt = true; } };
  H.cout0 = (act, inv) => {
    const b = H.boss();
    inv.forEach((t, i) => { const a = Math.PI * 0.15 + i / inv.length * Math.PI * 0.7, e = createEnemy(t, b.x + Math.cos(a) * 170, b.y + Math.sin(a) * 170); e.spd = 0; e.dmg = 0; e.state = 'walk'; e.t = e.cd = 999; });
    for (const R of [120, 260, 400]) rings.push({ x: b.x, y: b.y, r: R, v: 0, max: 640, dmg: 0, hit: true, boss: true }); bossRing(b, 0.1);
    for (let i = 0; i < 3; i++) H.pas(); b.state = 'idle'; b.patT = 99; shakeT = 0;
    const A = GA_D.dessin.actif, c0 = ctx, n = 40, L = { v: [], f1: [], f2: [] };
    const tour = (v, f) => { A[act] = v; for (let i = 0; i < 3; i++) f(); const t0 = performance.now(); for (let i = 0; i < n; i++) { f(); c0.getImageData(0, 0, 1, 1); } return (performance.now() - t0) / n; };
    const plein = () => render();
    // l'ancien dessin est mesuré deux fois (f1, f2) : leur écart est le bruit de la mesure
    for (let k = 0; k < (scale > 1.5 ? 6 : 12); k++) { const o = [['f1', false], ['v', true], ['f2', false]]; for (let j = 0; j < 3; j++) { const [cle, v] = o[(j + k) % 3]; L[cle].push(tour(v, plein)); } }
    const med = a => a.slice().sort((x, y) => x - y)[a.length >> 1];
    // les parties qui changent avec l'interrupteur, mesurées en place (même salle, même transformation de l'écran)
    const enPlace = f => () => { c0.setTransform(scale, 0, 0, scale, offX, offY); f(); };
    const parts = { gardien: enPlace(() => { drawEnemyBody(b); drawEnemyPost(b); }), brouillard: enPlace(() => drawFog()), scene: enPlace(() => { drawScene27('body'); drawScene27('post'); }) };
    if (act === 3) parts.vaisseaux = enPlace(() => drawCoeurPost());
    const D = {}; for (const [k, f] of Object.entries(parts)) { const a = [], z = []; for (let j = 0; j < (scale > 1.5 ? 4 : 8); j++) { z.push(tour(false, f)); a.push(tour(true, f)); } D[k] = { avant: +med(z).toFixed(3), apres: +med(a).toFixed(3) }; }
    A[act] = true; computeLights();
    return { avant: +med(L.f1.concat(L.f2)).toFixed(3), apres: +med(L.v).toFixed(3), bruit: +Math.abs(med(L.f1) - med(L.f2)).toFixed(3), parts: D, inv: enemies.filter(e => !e.dead).length - 1, anneaux: rings.length, tirs: eproj.length, phase: b.phase };
  };
  H.glyphePret = a => !!g27GlypheImg(a);
  // la porte du gardien (glyphe à la place de l'icône) et la barre de vie (glyphe à gauche du nom)
  H.porte = act => { G.virt = false; try { return H.porte0(act); } finally { G.virt = true; } };
  H.porte0 = act => {
    const A = GA_D.dessin.actif, keep = room.doors; room.doors = [{ x: 560, type: 'boss', open: 1 }, { x: 720, type: 'direct', open: 1 }];
    const med = a => a.slice().sort((x, y) => x - y)[a.length >> 1], L = { true: [], false: [] }, H2 = { true: [], false: [] };
    const porte = v => { A[act] = v; const t0 = performance.now(); for (let i = 0; i < 200; i++) { ctx.setTransform(scale, 0, 0, scale, offX, offY); drawDoorsPost(); ctx.getImageData(0, 0, 1, 1); } return (performance.now() - t0) / 200; };
    const barre = v => { A[act] = v; updateHud(); const t0 = performance.now(); for (let i = 0; i < 2000; i++) { updateHud(); void HUD.hBoss.offsetWidth; } return (performance.now() - t0) / 2000; };
    for (let k = 0; k < 10; k++) for (const v of (k % 2 ? [true, false] : [false, true])) { L[v].push(porte(v)); H2[v].push(barre(v)); }
    A[act] = true; updateHud(); const vu = !HUD.hBossGlyph.hidden && HUD.hBossGlyph.naturalWidth > 0; room.doors = keep;
    return { porte: { avant: +med(L.false).toFixed(4), apres: +med(L.true).toFixed(4) }, barre: { avant: +med(H2.false).toFixed(4), apres: +med(H2.true).toFixed(4) }, glypheImg: !!g27GlypheImg(act), barreGlyphe: vu };
  };
  // mouvements réduits : le corps (aperçu hors salle, comme les portraits) à 12 instants (T), silhouette et étendue des lueurs ; lumière de salle du gardien
  H.rm = act => {
    const b = H.boss(), Gd = window.__gardiens[{ 1: 'mere', 2: 'heraut', 3: 'glas' }[act]], S = Math.ceil(b.r * 10), c = document.createElement('canvas'); c.width = c.height = S;
    const o = c.getContext('2d', { willReadFrequently: true }), T0 = T, A = [], lum = [], lumiere = [];
    for (let k = 0; k < 12; k++) {
      T = T0 + k * 0.173; b.wob = T;   // 12 instants sur deux secondes (deux battements du Glas)
      for (const part of ['corps', 'lueurs']) {
        o.setTransform(1, 0, 0, 1, 0, 0); o.clearRect(0, 0, S, S); o.setTransform(1, 0, 0, 1, S / 2, S / 2); Gd.apercu(o, b, part);
        const d = o.getImageData(0, 0, S, S).data, al = new Uint8Array(S * S); for (let i = 0; i < S * S; i++) al[i] = d[i * 4 + 3];
        if (part === 'corps') A.push(al);
        else {   // taille des lueurs indépendante de leur éclat : rayon où l'alpha tombe sous la moitié de son maximum (profil radial)
          let mx = 0; for (let i = 0; i < al.length; i++) mx = Math.max(mx, al[i]); let R = 0;
          for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) if (al[y * S + x] >= mx * 0.5) R = Math.max(R, Math.hypot(x - S / 2, y - S / 2));
          lum.push(+R.toFixed(1));
        }
      }
      computeLights(); const l = lights.find(l => Math.abs(l.x - b.x) < 1 && Math.abs(l.y - b.y) < 1 && l.r > b.r * 2); lumiere.push(l ? +l.r.toFixed(1) : null);
    }
    T = T0;
    // la silhouette pleine (alpha > 200) : ce qui change d'un instant à l'autre, son étendue et son centre ; une variation de lumière ne la touche pas
    const plein = al => { let n = 0, sx = 0, sy = 0, R = 0; for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) if (al[y * S + x] > 200) { n++; sx += x; sy += y; R = Math.max(R, Math.hypot(x - S / 2, y - S / 2)); } return { n, cx: sx / n, cy: sy / n, R }; };
    const P0 = A.map(plein); let diff = 0, kmax = 0, diff64 = 0, kmax64 = 0;
    for (let k = 1; k < 12; k++) { let n = 0, n64 = 0; for (let i = 0; i < A[0].length; i++) { if ((A[0][i] > 200) !== (A[k][i] > 200)) n++; if ((A[0][i] > 64) !== (A[k][i] > 64)) n64++; } if (n > diff) { diff = n; kmax = k; } if (n64 > diff64) { diff64 = n64; kmax64 = k; } }
    // images des écarts (gris : commun ; rouge : seulement au premier instant ; cyan : seulement à l'instant le plus différent), silhouette pleine et voilée (alpha > 64)
    const img = (k, seuil) => { const dc = document.createElement('canvas'); dc.width = dc.height = S; const dx = dc.getContext('2d'), im = dx.createImageData(S, S);
      for (let i = 0; i < S * S; i++) { const a0 = A[0][i] > seuil, a1 = A[k][i] > seuil; const v = a0 && a1 ? [150, 150, 150] : a0 ? [255, 40, 40] : a1 ? [40, 230, 255] : [12, 10, 16]; im.data.set([...v, 255], i * 4); }
      dx.putImageData(im, 0, 0); return dc.toDataURL('image/png'); };
    const ecarts = img(kmax, 200), ecarts64 = img(kmax64, 64);
    const ext = a => +(Math.max(...a) - Math.min(...a)).toFixed(2);
    return { rmJeu: RM, silhouette: diff, silhouette64: diff64, encre64: A[0].reduce((n, v) => n + (v > 64), 0), encre: Math.max(...P0.map(p => p.n)), etendue: ext(P0.map(p => p.R)), centre: +Math.max(ext(P0.map(p => p.cx)), ext(P0.map(p => p.cy))).toFixed(2),
      lueurs: [Math.min(...lum), Math.max(...lum)], lumiere: lumiere[0] == null ? null : [Math.min(...lumiere), Math.max(...lumiere)], r: b.r, ecarts, ecarts64 };
  };
  // capture d'écran sans HUD : le canevas recadré sur la boîte du gardien
  H.cadre = B => { render(); const o = document.createElement('canvas'); o.width = Math.round(B.w * scale); o.height = Math.round(B.h * scale);
    o.getContext('2d').drawImage(cv, offX + B.x * scale, offY + B.y * scale, B.w * scale, B.h * scale, 0, 0, o.width, o.height); return o.toDataURL('image/png'); };
}
const SOURCE = readFileSync(join(THEMIST, 'index.html'), 'utf8'), ANCRE = '\nconst DEMO_CLS=';
if (!SOURCE.includes(ANCRE)) { console.error('Ancre d\'injection introuvable dans index.html'); process.exit(2); }
const INSTRUMENTE = SOURCE.replace(ANCRE, `\n(${DEDANS})();${ANCRE}`);
async function harnais(opts = {}) {
  const browser = opts.browser;
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: opts.dpr || 1, reducedMotion: opts.rm ? 'reduce' : 'no-preference' });
  await ctx.addInitScript({ content: `(${AVANT})(${opts.seed || 1});` });
  await ctx.route(u => u.pathname.endsWith('/index.html'), r => r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: INSTRUMENTE }));
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 300)));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text().slice(0, 300)); });
  await page.goto(opts.url || BASE);
  await page.waitForFunction(() => !!(window.__h && window.__glas && window.__glas.dbg && window.__gardiens), null, { timeout: 40000, polling: 100 });
  if (opts.actif != null) await page.evaluate(v => window.__h.actif(v), opts.actif);
  return { page, errs, ctx };
}
// une salle de gardien d'essai (?dernier=…&gardien=1), le gardien né, toi en bas
async function salleGardien(browser, act, o = {}) {
  const H = await harnais({ browser, url: `${BASE}?dernier=ray_n4&acte=${act}&gardien=1`, ...o });
  await H.page.waitForFunction(() => { try { return window.__h.pret() && window.__glas.dbg().room.type === 'boss'; } catch (e) { return false; } }, null, { timeout: 40000, polling: 100 });
  const ok2 = await H.page.evaluate(() => { const H = window.__h; for (let i = 0; i < 900 && !H.boss(); i++) { H.calmeMsg(); H.vider(); H.pas(); } return !!H.boss(); });
  if (!ok2) throw new Error(`acte ${act} : le gardien n'est pas né`);
  return H;
}

const browser = await chromium.launch({ executablePath: CHROME });

// ═══ D. Descente des quatre formes jusqu'au Glas, dessin.actif vrai puis faux, même graine ════════════════════════════════
if (SEC.includes('D')) {
  console.log('\n══ D · descente comparée (actif vrai / faux, même graine, toutes les images dessinées) ══');
  M.descente = {};
  for (const [i, cls] of FORMES.entries()) {
    const seed = 1000 + i * 17, runs = {};
    for (const actif of [true, false]) {
      const H = await harnais({ browser, seed, actif: process.env.BANC_AA ? true : actif });   // BANC_AA=1 : témoin, les deux passages avec le dessin final
      runs[actif] = await H.page.evaluate(([c, s, tr]) => window.__h.descente(c, s, 5400, tr), [cls, seed, !!process.env.BANC_TRACE]);
      runs[actif].errs = H.errs.slice(); await H.ctx.close();
    }
    const A = runs[true], B = runs[false];
    if (A.trace) { const k = A.trace.findIndex((x, j) => x !== B.trace[j]); console.log(`trace ${cls} : ${A.trace.length} images, première différence ${k}`); if (k >= 0) for (let j = Math.max(0, k - 2); j < k + 3; j++) console.log(`  ${j} A ${A.trace[j]}\n  ${j} B ${B.trace[j]}`); }
    ok(!A.errs.length && !B.errs.length, `${cls} : aucune erreur de script (${[...A.errs, ...B.errs].slice(0, 3).join(' | ')})`);
    ok(A.fin && B.fin, `${cls} : la descente va jusqu'à la victoire sur le Glas (écran de fin : ${A.fin} / ${B.fin} ; salles ${A.salles.join(',')})`);
    for (const act of [1, 2, 3]) {
      const a = A.gardiens[act], b = B.gardiens[act]; if (!a || !b) { ok(false, `${cls} acte ${act} : gardien combattu`); continue; }
      let i0 = -1; for (let k = 0; k < Math.max(a.sigs.length, b.sigs.length); k++) if (a.sigs[k] !== b.sigs[k]) { i0 = k; break; }
      const m = (M.descente[cls] = M.descente[cls] || {})[act] = { images: a.sigs.length, mortS: +(a.mortF / 60).toFixed(2), maxHp: a.maxHp, r: a.r, rayons: a.rayons, phases: a.phases, perte: a.perte, inflige: a.inflige, force: a.force, tiragesDessin: [a.nDessin, b.nDessin] };
      ok(a.act === act, `${cls} · ${NOMS[act]} : acte ${a.act}`);
      ok(i0 < 0, `${cls} · ${NOMS[act]} : combat identique image par image (${a.sigs.length} images)${i0 >= 0 ? ` ; première différence image ${i0} : ${a.sigs[i0]}  ≠  ${b.sigs[i0]}` : ''}`);
      ok(a.maxHp === b.maxHp && a.r === b.r && JSON.stringify(a.rayons) === JSON.stringify(b.rayons), `${cls} · ${NOMS[act]} : PV ${a.maxHp} / ${b.maxHp}, rayon ${a.r} / ${b.r}, invoqués ${JSON.stringify(a.rayons)}`);
      ok(a.mortF === b.mortF && JSON.stringify(a.phases) === JSON.stringify(b.phases), `${cls} · ${NOMS[act]} : même durée (${(a.mortF / 60).toFixed(2)} s / ${(b.mortF / 60).toFixed(2)} s), temps aux mêmes images ${JSON.stringify(a.phases)}`);
      ok(a.perte === b.perte && a.inflige === b.inflige, `${cls} · ${NOMS[act]} : mêmes dégâts (subis ${a.perte} / ${b.perte}, infligés ${a.inflige} / ${b.inflige})`);
      ok(a.phases[3] != null, `${cls} · ${NOMS[act]} : les trois temps sont joués (${Object.keys(a.phases).join(', ')})${a.force ? ' (achevé par le banc)' : ''}`);
      m.minuteursMort = [a.minuteurs, b.minuteurs];
      if (a.minuteurs !== b.minuteurs && !observations.some(x => x.gardien === NOMS[act] && /hasard/.test(x.ou))) observations.push({ gardien: NOMS[act], ou: 'mort du gardien, suite du hasard', mesure: `minuteurs posés par la mort : ${a.minuteurs} (dessin final) contre ${b.minuteurs} (ancien : les cinq explosions, qui tirent au hasard quand elles partent ; le banc les fait tirer dans la suite du dessin)`, note: 'aucune règle ne change ; avec une graine (Partition du jour), les récompenses tirées après la mort ne seraient plus les mêmes selon le dessin' });
      ok(a.apres === b.apres, `${cls} · ${NOMS[act]} : après la mort, même héros (niveau, XP, élan, morts, PV : ${a.apres} / ${b.apres})`);
      if (i0 >= 0) defaut({ gardien: NOMS[act], forme: cls, ou: `descente, image ${i0} (${(i0 / 60).toFixed(2)} s après l'entrée)`, mesure: `${a.sigs[i0]} ≠ ${b.sigs[i0]}`, seuil: 'combat identique (G17.9)' });
    }
  }
}

// ═══ B. Le Glas d'essai, conduit (bot=1), dessin actif vrai / faux : le Reflet et la bulle ne bougent pas ═════════════════════════
if (SEC.includes('B')) {
  console.log('\n══ B · Glas d\'essai conduit (bot=1) ══');
  M.glasBot = {};
  for (const [i, cls] of FORMES.entries()) for (const temps of [2, 3]) {
    const seed = 5000 + i * 10 + temps, runs = {};
    for (const actif of [true, false]) {
      const H = await harnais({ browser, seed, actif });
      await H.page.waitForFunction(() => { try { return !!window.__glas.lancer; } catch (e) { return false; } }, null, { polling: 100 });
      runs[actif] = await H.page.evaluate(([c, t, s]) => window.__h.glasBot(c, 'onde,sol,projectile', t, s, 60 * 35), [cls, temps, seed]); runs[actif].errs = H.errs.slice(); await H.ctx.close();
    }
    const a = runs[true], b = runs[false]; let i0 = -1; for (let k = 0; k < a.sigs.length; k++) if (a.sigs[k] !== b.sigs[k]) { i0 = k; break; }
    M.glasBot[cls + temps] = { reflets: a.reflets, E: a.E, gestes: a.nom };
    ok(!a.errs.length && !b.errs.length, `${cls} temps ${temps} : aucune erreur (${[...a.errs, ...b.errs].slice(0, 2).join(' | ')})`);
    ok(a.reflets > 0, `${cls} temps ${temps} : le Reflet sort (${a.reflets} geste(s) : ${a.nom})`);
    ok(i0 < 0 && JSON.stringify(a.E) === JSON.stringify(b.E), `${cls} temps ${temps} : 35 s identiques image par image, bilan ${JSON.stringify(a.E)}${i0 >= 0 ? ` ; image ${i0} : ${a.sigs[i0]} ≠ ${b.sigs[i0]}` : ''}`);
    ok(!a.E.coupsBulle && !a.E.sup, `${cls} temps ${temps} : 0 coup pendant un geste, 0 superposition (${a.E.coupsBulle}, ${a.E.sup})`);
    if (i0 >= 0) defaut({ gardien: 'Glas Originel', forme: cls, temps, ou: `essai bot=1, image ${i0}`, mesure: `${a.sigs[i0]} ≠ ${b.sigs[i0]}`, seuil: 'combat identique' });
  }
}

// ═══ P. La planche finale : trois gardiens × trois temps × six états, avant / après, au même instant (même image du jeu) ══════════════
const ETATS = {
  1: [['repos', 'Repos', ''], ['salve', 'Salve (anneaux)', `b.state='mvoile';b.rings=3;b.off=0;b.t=0.02;b.tt=0.45;N=14`], ['saisie', 'Saisie (étreinte)', `b.state='mgrab';b.gx=b.x+120;b.gy=b.y+110;b.gr=[0,72,72,62][b.phase];b.t=b.tt=1.0;b.reachSide=1;b.armT={x:b.gx,y:b.gy};b.reachTo=0;N=32`],
    ['copie', 'Copie (salve)', `b.copy='volee';b.state='mvolley';b.vn=99;b.t=b.tt=99;N=2`], ['nu', 'Sonnée, à nu', `b.stun=99;b.vuln=99;N=2`], ['fondu', 'Fondu d’esquive (0,3)', `b.state='mblink';b.t=b.tt=99;b.bx=b.x;b.by=b.y;N=1;FIX='b.fade=0.3'`]],
  2: [['repos', 'Repos', ''], ['chant', 'Chant', `b.state='chant';b.chantN=3;b.t=0.02;b.shotT=0;b.spinA=0;N=16`], ['ruee', 'Ruée annoncée', `b.state='wind';b.t=b.windTot=0.85;b.ang=Math.atan2(P.y-b.y,P.x-b.x);N=24`],
    ['copie', 'Copie (salve)', `b.copy='volee';b.state='mvolley';b.vn=99;b.t=b.tt=99;N=2`], ['nu', 'Sonné, à nu', `b.stun=99;b.vuln=99;N=2`], ['fondu', 'Fondu d’esquive (0,3)', `b.state='mblink';b.t=b.tt=99;b.bx=b.x;b.by=b.y;N=1;FIX='b.fade=0.3'`]],
  3: [['repos', 'Repos', ''], ['salve', 'Salve (spirale)', `b.state='spiral';b.t=2.6;b.shotT=0;b.spinA=0;b.spinDir=1;N=26`], ['faisceaux', 'Faisceaux annoncés', `b.state='sweepT';b.t=1.0;b.beams=Array.from({length:b.phase===3?3:2},(_,i)=>0.3+i*Math.PI*2/(b.phase===3?3:2));b.spinDir=1;N=20`],
    ['copie', 'Copie (salve)', `b.copy='volee';b.state='mvolley';b.vn=99;b.t=b.tt=99;N=2`], ['nu', 'Sonné, à nu', `b.stun=99;b.vuln=99;N=2`], ['fondu', 'Fondu d’esquive (0,3)', `b.fade=0.3;N=1;FIX='b.fade=0.3'`]],
};
const BOITE = { x: 400, y: 0, w: 480, h: 470 };   // en unités du monde : le gardien (640, 272–300), ses cordes et artères jusqu'au haut, ses télégraphes
if (SEC.includes('P')) {
  console.log('\n══ P · planche finale ══');
  const tuiles = {};
  for (const act of [1, 2, 3]) {
    const H = await salleGardien(browser, act, { dpr: 2, seed: 77 + act, actif: true });
    for (const t of [1, 2, 3]) {
      const ph = await H.page.evaluate(t => window.__h.temps(t), t); ok(ph === t, `${NOMS[act]} : temps ${t} atteint (${ph})`);
      for (const [cle, , code] of ETATS[act]) {
        const r = await H.page.evaluate(([code, act, B]) => window.__h.tuile(code, act, B), [code, act, BOITE]).catch(e => ({ err: String(e).slice(0, 300) }));
        if (r.err) { ok(false, `${NOMS[act]} t${t} ${cle} : ${r.err}`); continue; }
        tuiles[`${act}-${t}-${cle}`] = r;
      }
      await H.page.evaluate(() => window.__h.calme());
    }
    ok(!H.errs.length, `${NOMS[act]} planche : aucune erreur de script (${H.errs.slice(0, 2).join(' | ')})`);
    await H.ctx.close();
  }
  // lisibilité mesurée sur les cases (même image du jeu, avant / après) : contraste du corps contre le sol, et ce qui change à l'écran
  // quand il copie ou quand il est à nu (écart moyen par pixel, sur 0–255, dans un disque de 1,3 × r autour de lui)
  const px = async url => sharp(Buffer.from(url.split(',')[1], 'base64')).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const L = (d, i) => 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
  M.lisibilite = {};
  for (const act of [1, 2, 3]) for (const t of [1, 2, 3]) for (const l of ['avant', 'apres']) {
    const R0 = tuiles[`${act}-${t}-repos`]; if (!R0) continue;
    const k = R0.k, cx = (R0.bx - BOITE.x) * k, cy = (R0.by - BOITE.y) * k, r = R0.r * k, rep = await px(R0[l]), W = rep.info.width, Hh = rep.info.height;
    let sb = 0, nb = 0, sf = 0, nf = 0; for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) { const d = Math.hypot(x - cx, y - cy), i = (y * W + x) * 3; if (d < 0.8 * r) { sb += L(rep.data, i); nb++; } else if (d > 2.2 * r && d < 3 * r && y < cy + 2 * r) { sf += L(rep.data, i); nf++; } }
    const ecart = async cle => { const T2 = tuiles[`${act}-${t}-${cle}`]; if (!T2) return null; const o = await px(T2[l]); let s = 0, n = 0;
      for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) if (Math.hypot(x - cx, y - cy) < 1.3 * r) { const i = (y * W + x) * 3; s += Math.abs(o.data[i] - rep.data[i]) + Math.abs(o.data[i + 1] - rep.data[i + 1]) + Math.abs(o.data[i + 2] - rep.data[i + 2]); n += 3; } return +(s / n).toFixed(2); };
    ((M.lisibilite[act] = M.lisibilite[act] || {})[t] = M.lisibilite[act][t] || {})[l] = { corps: +(sb / nb).toFixed(1), sol: +(sf / nf).toFixed(1), contraste: +((sb / nb + 5) / (sf / nf + 5)).toFixed(2), copie: await ecart('copie'), nu: await ecart('nu') };
  }
  for (const act of [1, 2, 3]) for (const t of [1, 2, 3]) { const v = M.lisibilite[act][t], a = v.avant, p = v.apres;
    console.log(`lisibilité ${NOMS[act]} t${t} : contraste corps/sol ${a.contraste} → ${p.contraste} ; copie se voit ${a.copie} → ${p.copie} ; à nu se voit ${a.nu} → ${p.nu}`);
    if (p.contraste < 0.7 * a.contraste) observations.push({ gardien: NOMS[act], temps: t, ou: 'planche, repos', mesure: `contraste corps / sol ${a.contraste} → ${p.contraste} (luminance ${a.corps} → ${p.corps}, sol ${p.sol})`, note: 'à juger en relecture (pas de seuil au cadrage)' });
    if (p.copie != null && p.copie < Math.min(2, 0.5 * a.copie)) observations.push({ gardien: NOMS[act], temps: t, ou: 'planche, copie (forme lum)', mesure: `écart à l'écran ${a.copie} → ${p.copie} /255 dans 1,3 × r`, note: 'la copie se voit peu à l\'échelle du jeu' });
    if (p.nu != null && p.nu < 0.5 * a.nu) observations.push({ gardien: NOMS[act], temps: t, ou: 'planche, sonné à nu', mesure: `écart à l'écran ${a.nu} → ${p.nu} /255 dans 1,3 × r`, note: 'le point faible se voit moins qu\'avant' }); }
  // assemblage : une planche par gardien (lignes : temps × avant/après ; colonnes : les six états)
  const pc = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 }), pg = await pc.newPage();
  for (const act of [1, 2, 3]) {
    const cell = (k, l) => tuiles[k] ? `<figure><img src="${tuiles[k][l]}"><figcaption>${l === 'apres' ? 'après' : 'avant'} · ${tuiles[k].st}, ${tuiles[k].tirs} tirs, ${tuiles[k].anneaux} anneaux</figcaption></figure>` : '<figure>—</figure>';
    let rows = `<div class="r"><div class="l"></div>${ETATS[act].map(([, lab]) => `<div class="h">${lab}</div>`).join('')}</div>`;
    for (const t of [1, 2, 3]) for (const l of ['avant', 'apres']) rows += `<div class="r ${l}"><div class="l">Temps ${t}<br><small>${l === 'apres' ? 'après' : 'avant'}</small></div>${ETATS[act].map(([c]) => cell(`${act}-${t}-${c}`, l)).join('')}</div>`;
    await pg.setContent(`<html><body style="margin:0;background:#0c0a10;color:#d8cfe6;font:13px system-ui,sans-serif"><div id="pl" style="padding:16px 18px;display:inline-block">
      <div style="font-size:18px;margin-bottom:8px">${NOMS[act]} · v17.27, action 8 · avant (ancien dessin) / après (dessin final), même image du jeu, télégraphes par-dessus</div>
      <style>figure{margin:0 6px 0 0;width:236px;text-align:center}img{width:236px;display:block;border:1px solid #2a2433}figcaption{color:#8d82a1;font-size:11px;margin-top:2px}.r{display:flex;align-items:flex-start;margin-bottom:6px}.l{width:70px;font-weight:600;align-self:center}.h{width:242px;text-align:center;font-weight:600;color:#c8bde0}.apres{margin-bottom:16px}</style>
      ${rows}</div></body></html>`);
    await pg.waitForTimeout(250); const f = join(OUT, `gardien-${act}-planche-finale.png`); await (await pg.$('#pl')).screenshot({ path: f }); console.log('planche : ' + f);
  }
  await pc.close();
}

// ═══ C. Coût par image : la frame entière (render), salle chargée, avant / après ; porte et barre de vie avec glyphe ══════════════════
if (SEC.includes('C')) {
  console.log('\n══ C · coût par image ══');
  M.cout = {};
  const INV = { 1: ['rampant', 'rampant', 'rampant', 'rampant'], 2: ['rampant', 'hurleur', 'bouffi', 'bouffi', 'rampant'], 3: ['voile', 'rampant', 'rampant', 'bouffi', 'voile'] };
  for (const dpr of (process.env.BANC_DPR || '2,1').split(',').map(Number)) for (const act of ACTES) {
    const H = await salleGardien(browser, act, { dpr, seed: 31 + act, actif: true });
    H.page.on('crash', () => console.error(`page plantée : acte ${act}, ×${dpr}`));
    await H.page.evaluate(() => window.__h.temps(3));
    const r = await H.page.evaluate(([act, inv]) => window.__h.cout(act, inv), [act, INV[act]]);
    r.delta = +(r.apres - r.avant).toFixed(3); (M.cout['dpr' + dpr] = M.cout['dpr' + dpr] || {})[act] = r;
    ok(r.phase === 3 && r.inv >= 4 && r.anneaux >= 3, `${NOMS[act]} (×${dpr}) : salle chargée (temps ${r.phase}, ${r.inv} invoqués, ${r.anneaux} anneaux, ${r.tirs} tirs)`);
    const pt = Object.entries(r.parts).map(([k, v]) => `${k} ${v.avant} → ${v.apres}`).join(', '), dp = +Object.entries(r.parts).filter(([k]) => k !== 'brouillard').reduce((s, [, v]) => s + v.apres - v.avant, 0).toFixed(3);   // le brouillard ne change que de teinte (témoin du bruit), il n'entre pas dans la somme
    r.deltaParts = dp;
    // en rendu logiciel (sans carte graphique), l'image entière varie de plusieurs ms d'un passage à l'autre : elle ne compte que si elle dépasse
    // 1 ms au-delà de deux fois son bruit ; les parties qui changent avec l'interrupteur, mesurées en place, tranchent (G14 : ≤ 1 ms par gardien)
    const tropPlein = r.delta > 1 + 2 * r.bruit, tropParts = dp > 1;
    ok(!tropPlein && !tropParts, `${NOMS[act]} (×${dpr}) : parties en place ${dp >= 0 ? '+' : ''}${dp} ms (${pt}) ; image entière ${r.avant} → ${r.apres} ms (${r.delta >= 0 ? '+' : ''}${r.delta}, bruit ${r.bruit}) ; ≤ +1 ms`);
    if (tropPlein || tropParts) defaut({ gardien: NOMS[act], ou: `salle chargée, temps 3, densité ×${dpr}`, mesure: `parties en place ${dp >= 0 ? '+' : ''}${dp} ms (${pt}) ; image entière ${r.delta >= 0 ? '+' : ''}${r.delta} ms (${r.avant} → ${r.apres}, bruit ${r.bruit})`, seuil: '≤ 1 ms (G14)' });
    if (dpr === 2) {
      await H.page.waitForFunction(a => window.__h.glyphePret(a), act, { timeout: 10000, polling: 50 }).catch(() => {});
      const pd = await H.page.evaluate(act => window.__h.porte(act), act);
      M.cout.dpr2[act].porte = pd.porte; M.cout.dpr2[act].barre = pd.barre;
      ok(pd.glypheImg, `${NOMS[act]} : le glyphe est chargé (la porte le dessine)`);
      ok(pd.porte.apres - pd.porte.avant <= 0.5, `${NOMS[act]} : deux portes du gardien ${pd.porte.avant} → ${pd.porte.apres} ms par image`);
      ok(pd.barre.apres - pd.barre.avant <= 0.05, `${NOMS[act]} : barre de vie (updateHud + mise en page) ${pd.barre.avant} → ${pd.barre.apres} ms (glyphe visible : ${pd.barreGlyphe})`);
    }
    ok(!H.errs.length, `${NOMS[act]} coût : aucune erreur (${H.errs.slice(0, 2).join(' | ')})`);
    await H.ctx.close();
  }
}

// ═══ M. Mouvements réduits : rien ne balance, le battement du Glas ne grossit pas ═══════════════════════════════════════════════════
// Témoin : la même mesure sans mouvements réduits doit bouger (sinon la mesure ne verrait rien).
if (SEC.includes('M')) {
  console.log('\n══ M · mouvements réduits ══');
  M.rm = {};
  for (const rm of [true, false]) for (const act of ACTES) {
    const H = await salleGardien(browser, act, { dpr: 1, seed: 9 + act, rm, actif: true });
    for (const t of [1, 2, 3]) {
      await H.page.evaluate(t => window.__h.temps(t), t);
      const r = await H.page.evaluate(act => window.__h.rm(act), act);
      const ec = r.ecarts, ec64 = r.ecarts64; delete r.ecarts; delete r.ecarts64; (M.rm[rm ? 'reduits' : 'temoin'] = M.rm[rm ? 'reduits' : 'temoin'] || {})[`${act}-${t}`] = r;
      const nom = `${NOMS[act]} t${t}`, part = r.silhouette / r.encre, tag = `${rm ? 'reduits' : 'temoin'}-${act}-t${t}`;
      if (rm) { writeFileSync(join(OUT, `rm-ecarts-${tag}.png`), Buffer.from(ec.split(',')[1], 'base64')); writeFileSync(join(OUT, `rm-ecarts64-${tag}.png`), Buffer.from(ec64.split(',')[1], 'base64')); }
      if (rm) {
        ok(r.rmJeu === true, `${nom} : le jeu voit les mouvements réduits`);
        const part64 = r.silhouette64 / r.encre64, bon = part <= 0.005 && r.etendue <= 1 && r.centre <= 0.5, bon64 = part64 <= 0.01;
        ok(bon, `${nom} (réduits) : le corps plein ne bouge pas (alpha > 200 : ${r.silhouette} px sur ${r.encre} changent, ${(part * 100).toFixed(2)} % ; étendue ±${r.etendue} px ; centre ±${r.centre} px)`);
        ok(bon64, `${nom} (réduits) : rien ne balance, voiles compris (alpha > 64 : ${r.silhouette64} px sur ${r.encre64}, ${(part64 * 100).toFixed(2)} % ; ≤ 1 %)`);
        if (!bon) defaut({ gardien: NOMS[act], temps: t, ou: 'mouvements réduits, corps plein (aperçu hors salle, 12 instants sur 2 s)', mesure: `${r.silhouette} px changent (${(part * 100).toFixed(2)} % de ${r.encre}), étendue ±${r.etendue} px, centre ±${r.centre} px`, seuil: 'rien ne balance (G14)', capture: `rm-ecarts-${tag}.png` });
        if (!bon64) defaut({ gardien: NOMS[act], temps: t, ou: 'mouvements réduits, parties voilées du corps (alpha 64 à 200 : brume, franges, eau)', mesure: `${r.silhouette64} px changent d'un instant à l'autre (${(part64 * 100).toFixed(1)} % de ${r.encre64} ; sans réduction : ${'{TEMOIN}'})`, seuil: 'rien ne balance, ni la brume (G14)', capture: `rm-ecarts64-${tag}.png` });
        ok(r.lueurs[1] - r.lueurs[0] <= 1.5, `${nom} (réduits) : les lueurs ne grandissent pas (rayon à mi-éclat ${r.lueurs[0]} → ${r.lueurs[1]} px)`);
        if (r.lueurs[1] - r.lueurs[0] > 1.5) defaut({ gardien: NOMS[act], temps: t, ou: 'mouvements réduits, lueurs', mesure: `rayon à mi-éclat ${r.lueurs[0]} → ${r.lueurs[1]} px`, seuil: 'le battement ne grossit pas (G14)' });
        if (act === 3 && t === 1 && r.lumiere && r.lumiere[1] - r.lumiere[0] > 1) defaut({ gardien: NOMS[act], temps: 'tous', ou: 'mouvements réduits, lumière de salle du gardien (computeLights : r × 2,4 × (1 + 0,35 × beatK()), ligne antérieure à v17.27)', mesure: `rayon de la lumière ${r.lumiere[0]} → ${r.lumiere[1]} px au fil du battement`, seuil: 'G14 : le battement devient une variation de lumière sans changement de taille', note: 'hors dessin du corps ; à trancher en action 9' });
      } else { ok(r.silhouette64 > 0, `${nom} (témoin, sans réduction) : le dessin bouge (${r.silhouette} px pleins, ${r.silhouette64} px voilés, lueurs ${r.lueurs.join(' → ')})`); for (const d of defauts) if (d.gardien === NOMS[act] && d.temps === t && /\{TEMOIN\}/.test(d.mesure)) d.mesure = d.mesure.replace('{TEMOIN}', `${r.silhouette64} px`); }
    }
    const png = await H.page.evaluate(B => window.__h.cadre(B), BOITE);
    writeFileSync(join(OUT, `rm-${rm ? 'reduits' : 'temoin'}-${act}.png`), Buffer.from(png.split(',')[1], 'base64'));
    ok(!H.errs.length, `${NOMS[act]} ${rm ? 'mouvements réduits' : 'témoin'} : aucune erreur (${H.errs.slice(0, 2).join(' | ')})`);
    await H.ctx.close();
  }
}
await browser.close();

// ═══ Le bilan ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════
M.defauts = defauts; M.observations = observations; M.checks = checks; M.fails = fails;
writeFileSync(join(OUT, 'mesures-gardiens.json'), JSON.stringify(M, null, 1));
console.log(`\nmesures : ${join(OUT, 'mesures-gardiens.json')}`);
console.log(`défauts relevés pour l'action 9 : ${defauts.length}`); for (const d of defauts) console.log('  · ' + JSON.stringify(d));
console.log(`observations (à juger en relecture) : ${observations.length}`); for (const d of observations) console.log('  · ' + JSON.stringify(d));
console.log(`${checks} vérifications, ${fails} échec(s)`);
process.exit(fails ? 1 : 0);
