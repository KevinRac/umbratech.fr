#!/usr/bin/env node
// La Brume · générateur du wiki
// Réécrit dans wiki.html les sections qui viennent des données du jeu (data/*.js),
// et aligne le numéro de version du wiki sur celui du jeu (index.html).
//
//   node themist/outils/wiki.mjs           met wiki.html à jour
//   node themist/outils/wiki.mjs --check   échoue (code 1) si wiki.html n'est pas à jour
//
// Aucune dépendance : Node 18 ou plus suffit.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const WIKI = join(ROOT, 'wiki.html');
const GAME = join(ROOT, 'index.html');

// ── Chargement des données, exactement comme le navigateur les lit
function loadData() {
  const ctx = { window: {} };
  vm.createContext(ctx);
  for (const f of readdirSync(join(ROOT, 'data')).filter(f => f.endsWith('.js')).sort())
    vm.runInContext(readFileSync(join(ROOT, 'data', f), 'utf8'), ctx, { filename: f });
  return ctx.window.BRUME_DATA;
}

// ── Petits utilitaires
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const ROM = ['', 'I', 'II', 'III', 'IV', 'V'];
// « La Mère-Brume » → « à la Mère-Brume », « Le Héraut Noyé » → « au Héraut Noyé »
const aLa = s => s.replace(/^Le /, 'au ').replace(/^La /, 'à la ').replace(/^Les /, 'aux ').replace(/^L’/, 'à l’');
const lower = s => s.charAt(0).toLowerCase() + s.slice(1);
const MARK = src => `<!-- Section générée par outils/wiki.mjs depuis ${src} : ne pas modifier à la main -->`;

// ── Section « Équipements »
function equipements(E) {
  const R = E.raretes, O = E.objets, S = E.sets;
  const col = r => `rgb(${R[r].col})`;
  const setOf = id => Object.values(S).find(s => s.items.includes(id));
  const uniques = Object.values(O).filter(o => o.src);
  const order = ['commun', 'rare', 'epique', 'legendaire'];

  const chips = Object.keys(R).map(r => `<span class="chip" style="--cc:${col(r)}">${esc(R[r].n)}</span>`).join('');
  const tirage = Object.keys(E.tirage).map(a => {
    const t = E.tirage[a];
    const parts = order.filter(r => t[r]).map(r => `${t[r]} % ${lower(R[r].n)}`).join(' · ');
    return `<article class="ent"><h4>Acte ${ROM[a]}</h4><p>${parts}.</p></article>`;
  }).join('');
  const items = Object.entries(O).map(([id, o]) => {
    const st = setOf(id);
    const tags = [`<span class="tag" style="--t:${col(o.r)}">${esc(R[o.r].n)}</span>`, `<span class="tag">${esc(o.slot)}</span>`];
    if (st) tags.push(`<span class="tag">Set · ${esc(st.n)}</span>`);
    return `<article class="ent equip" data-r="${o.r}"><div class="eh"><h4 style="color:${col(o.r)}">${esc(o.n)}</h4><div class="tags">${tags.join('')}</div></div>\n`
      + `<p class="gain"><b>＋</b> ${esc(o.up)}</p><p class="cost"><b>－</b> ${esc(o.down)}</p>${o.src ? `<p class="src">Source : ${esc(o.src)}</p>` : ''}</article>`;
  }).join('');
  const sets = Object.values(S).map(s =>
    `<article class="ent"><h4>${esc(s.n)}</h4><p class="k">${s.items.map(i => esc(O[i].n)).join(' + ')}</p><p>${esc(s.d)}</p></article>`).join('');

  return `<section class="sec" id="equipements" data-sec>${MARK('data/equipements.js')}<header class="sh"><p class="eyebrow">Équipement</p><h2>Équipements</h2><div class="lede"><p>Chaque équipement apporte un <b>gain</b> et un <b>coût</b> : rien n’est gratuit. Ils se gèrent dans le menu de pause (onglet Équipement), qui offre 4 emplacements avec le détail au survol. Les raretés vont du commun à l’unique.</p></div></header>
<div class="chips">${chips}</div>
<h3 class="sub">Où les trouver</h3>
<p>Un champion (salle d’élite) laisse tomber un équipement dans ${E.chanceChampion} % des cas. La rareté dépend de l’acte : plus tu descends, plus les objets épiques et légendaires deviennent probables. Les objets uniques ne se tirent pas : ils s’arrachent à un gardien (${uniques.map(o => `<i>${esc(o.n)}</i> ${esc(aLa(o.src))}`).join(', ')}).</p>
<div class="grid g3">${tirage}</div>
<p>Tu disposes de quatre emplacements, et n’importe quel objet peut aller dans n’importe lequel. Remplacer un objet le fait <b>disparaître</b> pour la run. Deux pièces d’un même set portées ensemble déclenchent un bonus (messages « Set » en jeu). Les équipements disparaissent à la mort, comme les reliques.</p>
<div class="grid g2">${items}</div>
<h3 class="sub">Sets</h3>
<p>Équiper les deux pièces d’un même set active un bonus supplémentaire.</p>
<div class="grid g3">${sets}</div>
</section>`;
}

// ── Assemblage
function replaceSection(html, id, content) {
  const re = new RegExp(`<section class="sec" id="${id}"[^>]*>[\\s\\S]*?</section>`);
  if (!re.test(html)) throw new Error(`Section #${id} introuvable dans wiki.html`);
  return html.replace(re, () => content);
}
function gameVersion() {
  const vs = [...readFileSync(GAME, 'utf8').matchAll(/Prototype jouable · (v\d+(?:\.\d+)*)/g)].map(m => m[1]);
  if (!vs.length) throw new Error('Version du jeu introuvable dans index.html');
  if (new Set(vs).size > 1) throw new Error(`Versions différentes dans index.html : ${[...new Set(vs)].join(', ')}`);
  return vs[0];
}
function syncVersion(html, v) {
  return html
    .replace(/(Wiki · jeu )v\d+(?:\.\d+)*/g, `$1${v}`)
    .replace(/(à la version <strong>)v\d+(?:\.\d+)*(<\/strong>)/g, `$1${v}$2`)
    .replace(/(données de la version )v\d+(?:\.\d+)*/g, `$1${v}`)
    .replace(/(<b>La Brume )v\d+(?:\.\d+)*(<\/b>)/g, `$1${v}$2`);
}

export function build(html) {
  const D = loadData();
  let out = replaceSection(html, 'equipements', equipements(D.equipements));
  return syncVersion(out, gameVersion());
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const before = readFileSync(WIKI, 'utf8');
  const after = build(before);
  if (process.argv.includes('--check')) {
    if (after !== before) { console.error('wiki.html n’est pas à jour : lance « node themist/outils/wiki.mjs ».'); process.exit(1); }
    console.log('wiki.html est à jour.');
  } else if (after !== before) { writeFileSync(WIKI, after); console.log('wiki.html mis à jour.'); }
  else console.log('wiki.html déjà à jour.');
}
