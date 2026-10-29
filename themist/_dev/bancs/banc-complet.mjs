// Banc Chromium, action 7 du Dernier Souvenir : ce que les bancs des actions 1 à 6 ne couvraient pas (DS18, points 4 à 6).
// A. refus pendant les 14 effets en cours, lancés pour de bon (touche F ou E), sablier ; puis brûlure, touche vidée, icône au-dessus du héros
// B. D4 : compétence brûlée → touche A vidée ; C. mode ?demo= ; D. oubli par Tab ; E. reprise au Masqué ;
// F. descente des quatre formes (trois actes, une brûlure par acte, braise rendue, réserve à l'entrée du Glas, victoire, statistiques)
// Usage : node banc-complet.mjs [port] [section…]
import { createRequire } from 'node:module';
const require = createRequire('/opt/npm-tools/node_modules/');
const { chromium } = require('playwright');
const PORT = process.argv[2] || 8765, BASE = `http://127.0.0.1:${PORT}/index.html`, SEC = process.argv.slice(3).join('') || 'ABCDEF';
let fails = 0, checks = 0;
const ok = (c, m) => { checks++; if (!c) { fails++; console.error('ÉCHEC : ' + m); } };
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', args: ['--autoplay-policy=no-user-gesture-required'] });
const mesures = {};
async function ouvre(qs, attente) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 300)));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text().slice(0, 300)); });
  await page.goto(`${BASE}?${qs}`);
  if (attente !== false) await page.waitForFunction(attente || (() => { try { return window.__dernier.essaiEtat().on && window.__asm.dbg().enemies.some(e => !e.dead); } catch (e) { return false; } }), null, { timeout: 30000 });
  await page.waitForTimeout(300);
  return { page, errs, ctx };
}
const passer = async (page) => { for (let i = 0; i < 4; i++) { const b = await page.evaluate(() => { const b = document.querySelector('#overlay:not([hidden]) #bok'); if (b) { b.click(); return true; } return false; }); if (!b) return; await page.waitForTimeout(350); } };
// fermer ce qui s'ouvre (principes, niveaux, reliques, ascension) : une carte, sinon le bouton principal, jamais relance ni abandon
const vider = async (page, garder) => { for (let i = 0; i < 12; i++) { const r = await page.evaluate((garder) => { const o = document.querySelector('#overlay'); if (o.hidden) return 'vide'; if (garder && new RegExp(garder).test(o.innerText)) return 'garde'; if (o.querySelector('.endmem')) return 'fin';
    const b = o.querySelector('#bok') || o.querySelector('.card:not([disabled])') || o.querySelector('button.primary:not([disabled])') || [...o.querySelectorAll('button:not([disabled])')].find(b => !/reroll|quit|mute/.test(b.id)); if (b) { b.click(); return 'clic'; } return 'rien'; }, garder || null); if (r !== 'clic') return r; await page.waitForTimeout(350); } return 'boucle'; };
const tenir = async (page, ms = 650) => { await page.keyboard.down('KeyX'); await page.waitForTimeout(ms); await page.keyboard.up('KeyX'); await page.waitForTimeout(60); };
const slot = (page, k) => page.evaluate(k => { const s = [...document.querySelectorAll('#hSkills .slot')].find(x => [...x.querySelectorAll('*')].some(c => !c.children.length && c.textContent.trim() === k));   /* la touche exacte (« E », pas « Espace ») */ return s ? { cls: s.className, txt: s.textContent.trim() } : null; }, k);
// un ennemi robuste près du héros, et la salle rouverte si l'effet l'a purifiée (le banc a besoin d'un combat)
const combat = page => page.evaluate(() => { const B = window.__brume, D = window.__asm.dbg(), P = B.P; if (D.room.cleared) D.room.cleared = false; if (!B.enemies.some(e => !e.dead)) { const e = B.create('rampant', P.x + 160, P.y, false); e.maxHp = e.hp = 50000; } });

// ── A. les 14 effets en cours
const COURS = { lum: ['sol_sk', 'omb_sk', 'pha_sk'], gou: ['sai_sk', 'abe_sk', 'aby_sk', 'dif_n4'], her: ['dgl_sk', 'chd_sk', 'val_sk', 'cad_n4'], tis: ['gts_sk', 'mdp_sk', 'bro_sk'] };
if (SEC.includes('A')) for (const [cls, ids] of Object.entries(COURS)) for (const id of ids) {
  const { page, errs, ctx } = await ouvre(`dernier=${id}&classe=${cls}&acte=2`);
  const t = `${cls}/${id}`;
  await page.evaluate(id => { const X = window.__dernier, B = window.__brume, P = B.P; X.prendre(id.split('_')[0] + '_s1'); const e = B.create('rampant', P.x + 90, P.y, false); e.maxHp = e.hp = 50000; }, id);
  let touche = null;
  for (const k of ['KeyF', 'KeyE']) { await page.evaluate(() => { const P = window.__brume.P; P.ultCd = 0; P.eCd = 0; P.res = P.lueur = 999; }); await page.keyboard.press(k); await page.waitForTimeout(200); if (await page.evaluate(id => window.__dernier.enCours(id), id)) { touche = k; break; } }
  ok(!!touche, `${t} : l'effet a été lancé`);
  const avant = await slot(page, touche === 'KeyF' ? 'F' : 'E');
  await page.waitForTimeout(250);
  const sab = await page.evaluate(() => { const t = document.querySelector('#hMem .mt.ds'); return t && t.classList.contains('attend') && getComputedStyle(t.querySelector('.dsh')).display !== 'none'; });
  ok(sab, `${t} : sablier sur la tuile pendant l'effet`);
  await combat(page); await tenir(page);
  let e = await page.evaluate(() => window.__dernier.essaiEtat());
  const palp = await page.evaluate(() => { const t = document.querySelector('#hMem .mt.ds'); return !!(t && t.classList.contains('palpite')); });
  ok(e.brules === 0 && e.braises === 1, `${t} : refusé pendant l'effet ${JSON.stringify(e)}`);
  ok(palp, `${t} : la tuile palpite au refus`);
  // attendre la fin de l'effet
  const t0 = Date.now();
  await page.waitForFunction(id => !window.__dernier.enCours(id), id, { timeout: 40000, polling: 100 }).catch(() => {});
  const duree = (Date.now() - t0) / 1000;
  ok(!(await page.evaluate(id => window.__dernier.enCours(id), id)), `${t} : l'effet finit (${duree.toFixed(1)} s)`);
  await page.waitForTimeout(300);
  ok(await page.evaluate(() => { const t = document.querySelector('#hMem .mt.ds'); return t && !t.classList.contains('attend'); }), `${t} : le sablier s'en va`);
  await combat(page); await tenir(page);
  e = await page.evaluate(() => window.__dernier.essaiEtat());
  const ic = await page.evaluate(() => window.__dernier.icone);
  ok(e.brules === 1, `${t} : brûlé après l'effet ${JSON.stringify(e)}`);
  ok(ic.ic && ic.t > 0, `${t} : icône de la famille au-dessus du héros ${JSON.stringify(ic)}`);
  await page.waitForTimeout(350);   // les touches du HUD se redessinent à leur rythme
  const apres = await slot(page, touche === 'KeyF' ? 'F' : 'E');
  ok(avant && apres && !/lock|off|vide|empty/.test(avant.cls) && /lock|off|vide|empty/.test(apres.cls), `${t} : touche ${touche} vidée (${avant && avant.cls} → ${apres && apres.cls})`);
  // relancer la touche ne fait rien et ne casse rien
  await page.keyboard.press(touche); await page.waitForTimeout(300);
  ok(!(await page.evaluate(id => window.__dernier.enCours(id), id)), `${t} : la touche vidée ne relance rien`);
  (mesures.durees = mesures.durees || {})[id] = +duree.toFixed(1);
  ok(errs.length === 0, `${t} : aucune erreur ${errs.join('|')}`);
  await ctx.close();
}

// ── B. D4 : Nova brûlée (touche A), ses majeurs s'éteignent
if (SEC.includes('B')) {
  const { page, errs, ctx } = await ouvre('dernier=ray_n4&classe=lum&acte=2');
  const avant = await slot(page, 'A') || await slot(page, 'Q');
  const maj = await page.evaluate(() => { const N = window.BRUME_DATA.talents.noeuds, X = window.__dernier; const L = Object.keys(N).filter(k => X.noeud(k) && X.noeud(k).kind === 'x' && X.noeud(k).br === X.noeud('ray_n4').br); for (const k of L) X.prendre(k); return window.__memoire.M.eff.filter(a => L.includes(a.id)).map(a => a.id); });
  await tenir(page);
  const r = await page.evaluate(() => ({ eff: window.__memoire.M.eff.map(a => a.id), brules: window.__dernier.essaiEtat().brules }));
  await page.waitForTimeout(350);
  const apres = await slot(page, 'A') || await slot(page, 'Q');
  ok(r.brules === 1, 'Nova brûlée');
  ok(avant && apres && !/lock|off|vide|empty/.test(avant.cls) && /lock|off|vide|empty/.test(apres.cls), `touche A vidée (${avant && avant.cls} → ${apres && apres.cls})`);
  mesures.novaMajeurs = { avant: maj, eteints: maj.filter(k => !r.eff.includes(k)) };
  ok(errs.length === 0, 'Nova : aucune erreur ' + errs.join('|'));
  await ctx.close();
}

// ── C. ?demo= : pas de brûlure, pas de braise
if (SEC.includes('C')) {
  const { page, errs, ctx } = await ouvre('demo=lum', false);
  await page.waitForTimeout(4000);
  const r = await page.evaluate(() => { const X = window.__dernier; if (!X) return { absent: true }; X.activer(); const M = window.__memoire && window.__memoire.M; return { actif: X.actif(), hud: !!document.querySelector('#hBraise:not([hidden])') && getComputedStyle(document.querySelector('#hBraise')).display !== 'none', mem: !!M }; });
  ok(!r.actif, 'démo : le Dernier Souvenir reste éteint même activé ' + JSON.stringify(r));
  ok(!r.hud, 'démo : aucune braise affichée');
  ok(errs.length === 0, 'démo : aucune erreur ' + errs.join('|'));
  await ctx.close();
}

// ── D. oubli par Tab, mémoire pleine, avec une désignation
if (SEC.includes('D')) {
  const { page, errs, ctx } = await ouvre('dernier=ray_n4&classe=lum&acte=2');
  const n0 = await page.evaluate(() => { const X = window.__dernier, N = window.BRUME_DATA.talents.noeuds, M = window.__memoire.M; for (const k of Object.keys(N)) { if (M.actifs.length >= 10) break; if (X.noeud(k) && X.noeud(k).br && window.BRUME_DATA.talents.branches[k.split('_')[0]].cls === 'lum' && N[k].k === 'm') X.prendre(k); } window.__brume.P.pendingLv = 1; return M.actifs.length; });
  ok(n0 === 10, 'mémoire pleine (' + n0 + ')');
  await page.keyboard.press('Tab'); await page.waitForTimeout(500); await passer(page);
  const carte = await page.evaluate(() => { const c = [...document.querySelectorAll('#overlay .card')].find(b => !b.disabled && b.querySelector('.mbadge.swap')); if (c) c.click(); return !!c; });
  ok(carte, 'écran de niveau : une carte qui prend une place');
  await page.waitForTimeout(400); await passer(page);
  // oublier la tuile désignée (Nova) : son chiffre, puis le même chiffre pour confirmer
  const i = await page.evaluate(() => window.__memoire.M.actifs.filter(a => !a.trophee).findIndex(a => a.id === 'ray_n4'));
  const k = 'Digit' + ((i + 1) % 10);
  await page.waitForTimeout(900);   // l'écran d'oubli s'arme après un court délai (anti-clic involontaire)
  await page.keyboard.press(k); await page.waitForTimeout(300); await page.keyboard.press(k); await page.waitForTimeout(800);
  const r = await page.evaluate(() => { const M = window.__memoire.M; return { reserve: window.__memoire.reserve.length, actifs: M.actifs.length, designe: window.__dernier.designe(), overlay: !document.querySelector('#overlay').hidden, brules: M.brules.length }; });
  ok(r.reserve === 1 && r.actifs === 10 && r.brules === 0, 'oubli par Tab : un souvenir dans la réserve, mémoire à 10 ' + JSON.stringify(r));
  ok(r.designe === null, 'la désignation tombe avec l\'oubli');
  ok(errs.length === 0, 'oubli par Tab : aucune erreur ' + errs.join('|'));
  await ctx.close();
}

// ── E. reprise au Masqué porteur, avec le Dernier Souvenir actif
if (SEC.includes('E')) {
  const { page, errs, ctx } = await ouvre('masque=fan_n2&classe=lum&acte=2', () => { try { const d = window.__asm.dbg(); return d.state === 'play' && d.enemies.some(e => !e.dead && e.asm); } catch (e) { return false; } });
  await page.evaluate(() => { window.__dernier.activer(); window.__asm.dbg().P.iT = 999; });
  await page.waitForTimeout(4200);
  await page.evaluate(() => { const D = window.__asm.dbg(); for (const e of D.enemies) if (!e.dead) { e.hp = 1; D.kill(e); } });
  for (let i = 0; i < 20; i++) { await page.waitForTimeout(400); if (await vider(page, 'eprendre') === 'garde') break; }
  const vu = await page.evaluate(() => document.querySelector('#overlay').innerText.slice(0, 200));
  ok(/eprendre/.test(vu), 'reprise proposée : ' + vu.replace(/\s+/g, ' ').slice(0, 80));
  await page.waitForTimeout(900);
  const clic = await page.evaluate(() => { const b = [...document.querySelectorAll('#overlay button')].find(b => /eprendre/.test(b.textContent)); if (b) b.click(); return b ? b.outerHTML.slice(0, 160) : [...document.querySelectorAll('#overlay button')].map(b => b.textContent.trim().slice(0, 30)).join(' | '); });
  console.log('reprise', clic);
  await page.waitForTimeout(800);
  const r = await page.evaluate(() => ({ porte: window.__memoire.M.actifs.some(a => a.id === 'fan_n2'), reserve: window.__memoire.reserve.length }));
  ok(clic && r.porte, 'reprise faite : fan_n2 porté ' + JSON.stringify(r));
  ok(errs.length === 0, 'reprise : aucune erreur ' + errs.join('|'));
  await ctx.close();
}

// ── F. descente des quatre formes : trois actes, une brûlure par acte
const BRULE = { lum: ['ray_n4', 'fan_n2', 'sol_s4'], gou: ['dif_n4', 'sai_s4', 'abe_s4'], her: ['cad_n4', 'dgl_s4', 'chd_s4'], tis: ['aig_k1', 'gts_s4', 'mdp_s4'] };
if (SEC.includes('F')) for (const cls of ['lum', 'gou', 'her', 'tis']) {
  const { page, errs, ctx } = await ouvre('', false);
  await page.waitForFunction(() => !!(window.__glas && window.__glas.dbg), null, { timeout: 20000 });
  await page.evaluate(cls => { window.__glas.dbg().lancer(cls); }, cls);
  await page.waitForFunction(() => { try { const d = window.__glas.dbg(); return d.RUN && !d.RUN.hub && d.state === 'play'; } catch (e) { return false; } }, null, { timeout: 20000 });
  await page.evaluate(() => { window.__dernier.activer(); });
  const journal = [];
  const tuer = () => page.evaluate(() => { const D = window.__asm.dbg(); D.P.iT = 999; D.P.hp = D.P.s.maxHp; for (const e of D.enemies) if (!e.dead && e.type !== 'boss') { e.hp = 1; D.kill(e); } });
  const attendre = async () => { for (let i = 0; i < 60; i++) { await vider(page); if (await page.evaluate(() => { const d = window.__asm.dbg(); return d.state === 'play' && document.querySelector('#overlay').hidden && d.enemies.some(e => !e.dead); })) return true; await page.waitForTimeout(500); } return false; };
  for (let acte = 1; acte <= 3; acte++) {
    const ids = BRULE[cls];
    const entrer = t => page.evaluate(t => { const D = window.__glas.dbg(); D.entrer(t); }, t);
    if (acte > 1) await entrer(acte === 2 ? 'act' : 'act3');
    else await entrer('combat');
    const vu = await attendre();
    ok(vu, `${cls} acte ${acte} : une salle de combat s'ouvre`);
    const etat0 = await page.evaluate(() => ({ act: window.__asm.dbg().RUN.act, braises: window.__dernier.braises() }));
    ok(etat0.act === acte && etat0.braises === 1, `${cls} acte ${acte} : braise rendue ${JSON.stringify(etat0)}`);
    await page.evaluate(id => { window.__dernier.prendre(id); window.__dernier.designer(id); window.__asm.dbg().P.iT = 999; }, ids[acte - 1]);
    await page.waitForTimeout(1300);   // la palpitation d'acte
    const pal = await page.evaluate(() => document.querySelector('#hBraise').classList.contains('palpite'));
    if (acte > 1) ok(pal, `${cls} acte ${acte} : la braise palpite à l'entrée de l'acte`);
    await tenir(page);
    const e1 = await page.evaluate(() => ({ brules: window.__memoire.M.brules.length, braises: window.__dernier.braises() }));
    ok(e1.brules === acte && e1.braises === 0, `${cls} acte ${acte} : brûlure ${JSON.stringify(e1)}`);
    for (let k = 0; k < 2; k++) { await tuer(); await page.waitForTimeout(500); await vider(page); await entrer(k ? 'elite' : 'combat'); await attendre(); }
    await tuer(); await page.waitForTimeout(400); await vider(page);
    await entrer('boss'); await page.waitForTimeout(2600);
    if (acte === 3) {
      const rg = await page.evaluate(() => window.__memoire.M.reserveGlas);
      ok(typeof rg === 'number', `${cls} : réserve mesurée à l'entrée du Glas (${rg})`);
      journal.push({ reserveGlas: rg });
    }
    // le gardien tombe
    await page.evaluate(() => { const D = window.__asm.dbg(); D.P.iT = 999; for (const e of D.enemies) if (!e.dead) { e.hp = 1; D.kill(e); } });
    await page.waitForTimeout(1500);
    for (let i = 0; i < 8; i++) { await page.evaluate(() => { const D = window.__asm.dbg(); for (const e of D.enemies) if (!e.dead) { e.hp = 1; D.kill(e); } }); await page.waitForTimeout(500); if (acte < 3) await vider(page); else if (await page.evaluate(() => !!document.querySelector('.endmem'))) break; else await vider(page); }
  }
  // fin : victoire et statistiques
  await page.waitForTimeout(1500);
  const fin = await page.evaluate(() => { const S = window.__memoire.stats(), r = S[S.length - 1]; return { n: S.length, fin: r && r.fin, brules: r && r.brules && r.brules.map(b => b.acte + ':' + b.id + ':' + b.contre), rg: r && r.reserveGlas, end: !!document.querySelector('.endmem .endbru'), etat: window.__asm.dbg().state }; });
  ok(fin.n >= 1 && fin.brules && fin.brules.length === 3, `${cls} : trois brûlures dans les statistiques ${JSON.stringify(fin)}`);
  ok(typeof fin.rg === 'number', `${cls} : reserveGlas dans les statistiques`);
  (mesures.descentes = mesures.descentes || {})[cls] = fin;
  ok(errs.length === 0, `${cls} descente : aucune erreur ${errs.join('|')}`);
  await ctx.close();
}
await browser.close();
console.log('MESURES', JSON.stringify(mesures));
console.log(`${checks} vérifications, ${fails} échec(s)`);
process.exit(fails ? 1 : 0);
