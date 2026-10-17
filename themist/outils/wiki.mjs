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
function equipements(E, F) {
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
    if (o.cls) tags.push(`<span class="tag" style="--t:${F[o.cls].col}">${esc(F[o.cls].n)}</span>`);
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

// ── Formes (nom court et couleur), lues dans index.html
function formes() {
  const src = readFileSync(GAME, 'utf8'), F = {};
  for (const m of src.matchAll(/(?:^ |CLS\.)(\w{3})[:=]\{name:'[^']*',short:'([^']*)',color:'(#[0-9a-fA-F]{6})'/gm)) F[m[1]] = { n: m[2], col: m[3] };
  if (Object.keys(F).length < 4) throw new Error('Formes introuvables dans index.html');
  return F;
}
const MOTS = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix'];
const mot = n => MOTS[n] || String(n);

// ── Section « Reliques »
function reliques(list, F) {
  const cards = list.map(r => {
    const forme = r.cls ? `<span class="tag" style="--t:${F[r.cls].col}">${esc(F[r.cls].n)}</span>` : '<span class="tag">Toutes formes</span>';
    const forge = r.lock ? `<span class="tag" style="--t:#f3b94d">Forge · ${r.lock} ✦</span>` : '';
    return `<article class="ent relic"${r.cls ? ` data-cls="${r.cls}"` : ''}><div class="eh"><h4><span class="glyph">${r.g}</span>${esc(r.name)}</h4><div class="tags">${forme}${forge}</div></div><p>${esc(r.desc)}</p></article>`;
  }).join('');
  return `<section class="sec" id="reliques" data-sec>${MARK('data/reliques.js')}<header class="sh"><p class="eyebrow">Équipement de run</p><h2>Reliques</h2><div class="lede"><p>Les reliques se trouvent sur les autels, les champions, chez Tobiah et dans la forge de Corbin. Elles <b>disparaissent à la mort</b>. Certaines ne sont proposées qu’à une forme précise ; d’autres se débloquent à la forge contre des Éclats (le prix est indiqué).</p></div></header>
<div class="grid g3">${cards}</div></section>`;
}

// ── Section « Pactes et aides »
function pactes(D) {
  const ent = o => `<article class="ent"><h4>${esc(o.n)}</h4><p>${esc(o.d)}</p></article>`;
  const A = D.aide;
  const offres = A.offresParRun === 1 ? 'une offre' : `${mot(A.offresParRun)} offres`;
  const refus = A.refusAvantArret === 1 ? 'un refus' : `${mot(A.refusAvantArret)} refus`;
  return `<section class="sec" id="pactes" data-sec>${MARK('data/pactes.js')}<header class="sh"><p class="eyebrow">Choix et risque</p><h2>Pactes et aides</h2><div class="lede"><p>À partir de la version 13, le <b>Brumeux</b> propose des pactes qui donnent un bénéfice et imposent une contrainte. Le jeu t’explique chaque pacte avant que tu acceptes.</p></div></header>
<h3 class="sub">Bénéfices du pacte</h3>
<div class="grid g3">${Object.values(D.benefices).map(ent).join('')}</div>
<h3 class="sub">Contraintes</h3>
<p>Le jeu propose une contrainte qui gêne ton style, ou qui épargne ton style. Le Brumeux peut bluffer : une contrainte peut se révéler différente de son annonce.</p>
<div class="grid g3">${Object.values(D.contraintes).map(c => `<article class="ent"><h4>${esc(c.n)}</h4><p>${esc(c.d)}</p><p class="k">Pénalise surtout si ${esc(c.why)}.</p></article>`).join('')}</div>
<h3 class="sub">Aides adaptatives</h3>
<p>Si tu échoues plusieurs fois au même endroit, la Brume t’offre un coup de pouce discret. Les raisons possibles : ${Object.values(D.raisons).map(w => `<i>${esc(w)}</i>`).join(', ')}</p>
<div class="grid g4">${Object.values(D.aides).map(ent).join('')}</div>
<p class="k">Au plus ${offres} par run, séparées d’au moins ${A.ecartS} secondes, et jamais avant le début d’un combat de gardien. Tu acceptes avec <kbd>G</kbd> ou tu refuses avec <kbd>B</kbd>. L’offre disparaît seule après ${A.dureeOffreS} secondes. Après ${refus} (ou « Ne plus proposer »), la Brume ne propose plus d’aide : tu la réactives à tout moment dans le menu de pause (bouton « Aide adaptative »).</p>
<h3 class="sub">La feinte du Brumeux</h3>
<p>Dès l’acte II (ou à partir de la 6e salle de la descente), le Brumeux dessine un cercle sous tes pieds dans les salles de combat et d’élite. Il revient toutes les 8 à 13 secondes (un peu plus vite à l’acte III). Le cercle te suit puis se fige juste avant de frapper. Tout se lit à sa couleur.</p>
<div class="grid g2"><article class="ent"><h4>Cercle ocre : sincère</h4><p>Le cercle détone. Sors de la zone ou esquive : si tu restes dedans, tu prends des dégâts qui grandissent avec les salles et les actes.</p></article><article class="ent"><h4>Cercle au noyau violet : feinte</h4><p>Il n’explose pas. Si tu esquives quand même et que tu n’as plus de charge d’esquive, le Brumeux te punit : une frappe réelle suit 0,6 s plus tard. Mieux vaut ne pas bouger.</p></article></div>
<h3 class="sub">Le Chroniqueur</h3>
<p>Pendant la run, la Brume note ce qui compte : pactes, équipements gagnés ou laissés, sets, salles à règle, aides acceptées ou refusées, gardiens vaincus, feintes subies. En fin de run, elle en tire une <b>chronique</b> : les neuf notes les plus marquantes, plus quelques bilans (salles sans une égratignure, coups reçus, feintes). La chronique se copie d’un clic. Les six dernières sont conservées et se relisent dans l’onglet Journal de la pause.</p>
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
  let out = replaceSection(html, 'equipements', equipements(D.equipements, formes()));
  out = replaceSection(out, 'reliques', reliques(D.reliques, formes()));
  out = replaceSection(out, 'pactes', pactes(D.pactes));
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
