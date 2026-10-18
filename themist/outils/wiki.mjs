#!/usr/bin/env node
// La Brume · générateur du wiki
// Réécrit dans wiki.html les sections et les fragments (<!-- gen:… -->) qui viennent des données
// du jeu (data/*.js), et aligne le numéro de version du wiki sur data/versions.js.
// Le reste du wiki (textes d'explication, FAQ, conseils) s'écrit à la main dans wiki.html.
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

// ── Section « Équipements » (v16.33 : emplacements fixes, icônes peintes, fiches façon infobulle)
function equipements(E, F, D) {
  const R = E.raretes, O = E.objets, S = E.sets, SL = E.emplacements;
  const col = r => `rgb(${R[r].col})`;
  const ico = (id, cls) => D.iconeObjet(id, { col: R[O[id].r].col, r: O[id].r, cls: cls || 'io' });
  const slotN = id => SL.find(x => x.id === O[id].slot).n;
  const setOf = id => Object.values(S).find(s => s.items.includes(id));
  const uniques = Object.values(O).filter(o => o.src);
  const order = ['commun', 'rare', 'epique', 'legendaire'];
  const line = (t, k) => { const m = String(t).match(/^([+−-]\s?\d[\d,]*(?:\s?%)?)\s+(.+)$/);
    return m ? `<li class="${k} st"><b>${esc(m[1])}</b> ${esc(m[2])}</li>` : `<li class="${k}">${esc(t)}</li>`; };

  const chips = Object.keys(R).map(r => `<span class="chip" style="--cc:${col(r)}">${esc(R[r].n)}</span>`).join('');
  const tirage = Object.keys(E.tirage).map(a => {
    const t = E.tirage[a];
    const parts = order.filter(r => t[r]).map(r => `${t[r]} % ${lower(R[r].n)}`).join(' · ');
    return `<article class="ent"><h4>Acte ${ROM[a]}</h4><p>${parts}.</p></article>`;
  }).join('');
  const slots = SL.map((x, i) => {
    const ks = Object.keys(O).filter(k => O[k].slot === x.id);
    return `<article class="ent weq-slot"><div class="weq-sh">${D.iconeVide(x.id, 'wv')}<div><h4>${ROM[i + 1]} · ${esc(x.n)}</h4><p class="k">${esc(x.d)}</p></div></div><div class="weq-row">${ks.map(k => `<a href="#eq-${k}" title="${esc(O[k].n)}">${ico(k)}</a>`).join('')}</div></article>`;
  }).join('');
  const card = id => {
    const o = O[id], st = setOf(id);
    const set = st ? `<div class="weq-set"><p class="sn">Set · ${esc(st.n)}</p>${st.items.map(i => `<p class="si">${esc(O[i].n)} <em>${esc(slotN(i))}</em></p>`).join('')}<p class="sb">(${st.items.length}) ${esc(st.d)}</p></div>` : '';
    return `<article class="ent equip weq" id="eq-${id}" data-r="${o.r}" style="--c:${col(o.r)}"><div class="weq-h">${ico(id, 'io big')}<div><h4>${esc(o.n)}</h4><p class="weq-t">${esc(slotN(id))} · ${esc(R[o.r].n)}</p></div></div>\n`
      + `<ul class="weq-l">${o.plus.map(t => line(t, 'p')).join('')}${o.moins.map(t => line(t, 'm')).join('')}</ul>${set}`
      + `${o.cls ? `<p class="weq-r">Réservé à la forme ${esc(F[o.cls].n)}</p>` : ''}${o.src ? `<p class="weq-r">Arraché ${esc(aLa(o.src))}</p>` : ''}${o.fl ? `<p class="weq-f">« ${esc(o.fl)} »</p>` : ''}</article>`;
  };
  const items = SL.map((x, i) => {
    const ks = Object.keys(O).filter(k => O[k].slot === x.id);
    return `<h5 class="grp">${ROM[i + 1]} · ${esc(x.n)} · ${ks.length} objets</h5>\n<div class="grid g3">${ks.map(card).join('\n')}</div>`;
  }).join('\n');
  const sets = Object.values(S).map(s =>
    `<article class="ent weq-st"><div class="weq-row">${s.items.map(i => `<a href="#eq-${i}" title="${esc(O[i].n)}">${ico(i)}</a>`).join('<span class="pl">+</span>')}</div><h4>${esc(s.n)}</h4><p class="k">${s.items.map(i => `${esc(O[i].n)} (${esc(slotN(i))})`).join(' + ')}</p><p>${esc(s.d)}</p></article>`).join('');

  return `<section class="sec" id="equipements" data-sec>${MARK('data/equipements.js et data/icones-objets.js')}<style>
.weq-sh{display:flex;gap:12px;align-items:center}.weq-sh h4{margin:0}.weq-sh .k{margin:2px 0 0}
.wv{flex:none;width:40px;height:40px;padding:8px;border:1px dashed #3a3f58;border-radius:8px;fill:none;stroke:var(--mute);stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}
.weq-row{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:10px}.weq-row a{display:block;line-height:0}.weq-row .io{width:40px;height:40px}.weq-row .pl{color:var(--mute);font-size:20px;padding:0 2px}
.weq{background:linear-gradient(180deg,#120f1b,#09080d);border-color:color-mix(in srgb,var(--c) 55%,transparent)}
.weq-h{display:flex;gap:12px;align-items:center;margin-bottom:8px}.weq-h h4{margin:0;color:var(--c);font-size:20px}.weq .io.big{flex:none;width:56px;height:56px;filter:drop-shadow(0 2px 5px rgba(0,0,0,.6))}
.weq-t{margin:2px 0 0;font-size:12.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--mute)}
.weq-l{list-style:none;margin:0;padding:8px 0 0;border-top:1px solid var(--line);display:flex;flex-direction:column;gap:4px}
.weq-l li{position:relative;padding-left:19px;line-height:1.4}.weq-l li::before{position:absolute;left:0;top:.35em;font-size:10.5px;line-height:1}
.weq-l li.p{color:#c6efbb}.weq-l li.p::before{content:'▲';color:var(--good)}.weq-l li.m{color:#f6b8b8}.weq-l li.m::before{content:'▼';color:var(--bad)}
.weq-l li.st b{font-size:18px;margin-right:3px}.weq-l li.p.st b{color:#a6f597}.weq-l li.m.st b{color:#ff9090}
.weq-set{margin:9px 0 0;padding-top:8px;border-top:1px solid var(--line);font-size:15px}.weq-set p{margin:0}.weq-set .sn{font-weight:700;color:#ffdf9a}.weq-set .si{padding-left:12px;color:var(--bone)}.weq-set .si em{font-style:normal;font-size:11.5px;letter-spacing:.07em;text-transform:uppercase;color:var(--mute);margin-left:5px}.weq-set .sb{margin-top:3px;color:var(--good)}
.weq-r{margin:7px 0 0;font-size:14.5px;color:#c9a8ff}.weq-f{margin:8px 0 0;font-size:15px;font-style:italic;color:#d8c38e}
.weq-st .weq-row{margin:0 0 6px}
</style><header class="sh"><p class="eyebrow">Équipement</p><h2>Équipements</h2><div class="lede"><p>Chaque équipement apporte un <b>gain</b> (▲, en vert) et un <b>coût</b> (▼, en rouge) : rien n’est gratuit. Tu as <b>quatre emplacements fixes</b>, un par type d’objet. Ils se gèrent dans le menu de pause (onglet Équipement). Les raretés vont du commun à l’unique ; la couleur du cadre de l’icône donne la rareté.</p></div></header>
<div class="chips">${chips}</div>
<h3 class="sub">Les quatre emplacements</h3>
<p>Un objet ne va que dans l’emplacement de son type. S’il est déjà occupé, la trouvaille <b>remplace</b> l’objet porté, qui disparaît pour la run : l’écran de trouvaille montre les deux fiches côte à côte pour comparer. Tu peux aussi laisser l’objet. Les équipements disparaissent à la mort, comme les reliques.</p>
<div class="grid g2">${slots}</div>
<h3 class="sub">Où les trouver</h3>
<p>Un champion (salle d’élite) laisse tomber un équipement dans ${E.chanceChampion} % des cas. La rareté dépend de l’acte : plus tu descends, plus les objets épiques et légendaires deviennent probables. Les objets uniques ne se tirent pas : ils s’arrachent à un gardien (${uniques.map(o => `<i>${esc(o.n)}</i> ${esc(aLa(o.src))}`).join(', ')}).</p>
<div class="grid g3">${tirage}</div>
<h3 class="sub">Tous les objets</h3>
${items}
<h3 class="sub">Sets</h3>
<p>Équiper les deux pièces d’un même set active un bonus supplémentaire (message « Set » en jeu). Les deux pièces sont toujours dans deux emplacements différents.</p>
<div class="grid g3">${sets}</div>
</section>`;
}

// ── Formes (nom court et couleur), lues dans data/talents.js
function formes(D) {
  return Object.fromEntries(Object.entries(D.talents.formes).map(([c, f]) => [c, { n: f.short, col: f.color }]));
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
function pactes(D, I) {
  // v16.6 : chaque pacte porte une icône (data/icones.js) et une valeur courte, comme sur la carte du jeu
  const ico = id => (I && I[id]) ? `<svg class="pic" viewBox="0 0 24 24" aria-hidden="true"><path d="${I[id]}"/></svg>` : '';
  const val = (o, k) => o.v ? `<p class="pv ${k}">${ico(o.ic)}<b>${esc(o.v)}</b></p>` : '';
  const ent = (o, k = 'good') => `<article class="ent"><h4>${esc(o.n)}</h4>${val(o, k)}<p>${esc(o.d)}</p></article>`;
  const A = D.aide;
  const offres = A.offresParRun === 1 ? 'une offre' : `${mot(A.offresParRun)} offres`;
  const refus = A.refusAvantArret === 1 ? 'un refus' : `${mot(A.refusAvantArret)} refus`;
  return `<section class="sec" id="pactes" data-sec>${MARK('data/pactes.js')}<header class="sh"><p class="eyebrow">Choix et risque</p><h2>Pactes et aides</h2><div class="lede"><p>À partir de la version 13, le <b>Brumeux</b> propose des pactes qui donnent un bénéfice et imposent une contrainte. Le jeu t’explique chaque pacte avant que tu acceptes.</p></div></header>
<h3 class="sub">Bénéfices du pacte</h3>
<div class="grid g3">${Object.values(D.benefices).map(o => ent(o, 'good')).join('')}</div>
<h3 class="sub">Contraintes</h3>
<p>Le jeu propose une contrainte qui gêne ton style, ou qui épargne ton style.</p>
<div class="grid g3">${Object.values(D.contraintes).map(c => `<article class="ent"><h4>${esc(c.n)}</h4>${val(c, 'bad')}<p>${esc(c.d)}</p><p class="k">Pénalise surtout si ${esc(c.why)}.</p></article>`).join('')}</div>
<h3 class="sub">Aides adaptatives</h3>
<p>Si tu échoues plusieurs fois au même endroit, la Brume t’offre un coup de pouce discret. Les raisons possibles : ${Object.values(D.raisons).map(w => `<i>${esc(w)}</i>`).join(', ')}</p>
<div class="grid g4">${Object.values(D.aides).map(o => ent(o, 'aid')).join('')}</div>
<p class="k">Au plus ${offres} par run, séparées d’au moins ${A.ecartS} secondes, et jamais avant le début d’un combat de gardien. Tu acceptes avec <kbd>G</kbd> ou tu refuses avec <kbd>B</kbd>. L’offre disparaît seule après ${A.dureeOffreS} secondes. Après ${refus} (ou « Ne plus proposer »), la Brume ne propose plus d’aide : tu la réactives à tout moment dans le menu de pause (bouton « Aide adaptative »).</p>
<h3 class="sub">Le Chroniqueur</h3>
<p>Pendant la run, la Brume note ce qui compte : pactes, équipements gagnés ou laissés, sets, salles à règle, aides acceptées ou refusées, gardiens vaincus. En fin de run, elle en tire une <b>chronique</b> : les neuf notes les plus marquantes, plus quelques bilans (salles sans une égratignure, coups reçus). La chronique se copie d’un clic. Les six dernières sont conservées et se relisent dans l’onglet Journal de la pause.</p>
</section>`;
}

// ── Section « Bestiaire »
const num = x => String(+x.toFixed(3)).replace('.', ',');           // 1.3 → « 1,3 »
const pct = x => `${num(x * 100)} %`;                                // 0.085 → « 8,5 % »
const pgcd = (a, b) => b ? pgcd(b, a % b) : a;
function fraction(p) { const k = pgcd(p, 100); return [p / k, 100 / k]; }  // 20 → [1, 5]
function chance(p, court) {
  const [n, d] = fraction(p);
  const nb = n === 1 ? 'une' : mot(n);
  return court ? `${nb} sur ${mot(d)}` : `${nb} chance${n > 1 ? 's' : ''} sur ${mot(d)}`;
}
function bestiaire(B, I, MQ) {
  const E = B.ennemis, C = B.champion, RS = B.reglesSalle, BR = B.breche, EF = B.efficacite;
  const nom = k => E[k].n;
  const ennemis = Object.values(E).filter(e => e.desc).map(e =>
    `<article class="ent enemy"><div class="eh"><h4>${esc(e.n)}</h4><span class="tag">${e.salle ? `Apparaît dès la salle ${e.salle}` : 'Dès le début'}</span></div><p>${esc(e.desc)}</p>\n`
    + `  <div class="stats"><span><b>${e.stats.hp}</b> PV</span><span><b>${e.stats.dmg}</b> dégâts</span><span><b>${e.stats.spd}</b> vitesse</span><span><b>${e.stats.xp}</b> XP</span></div></article>`).join('');
  const roles = Object.values(B.roles).map(r => `<article class="ent"><h4 style="color:rgb(${r.col})">${esc(r.n)}</h4><p>Il ${esc(r.d)}</p></article>`).join('');
  const themes = Object.values(B.themes).map(t => `<article class="ent"><h4>${esc(t.n)}</h4><p>${esc(t.h)}</p><p class="k">Ennemis : ${t.need.map(nom).map(esc).join(', ')}</p></article>`).join('');
  // v16.16 : icône de la contre-mesure (data/icones.js) et son escalade en pleine salle
  const ico = id => (I && I[id]) ? `<svg class="pic" viewBox="0 0 24 24" aria-hidden="true"><path d="${I[id]}"/></svg>` : '';
  const cms = Object.values(B.contreMesures).map(c => `<article class="ent"><h4>${ico(c.ic)}${esc(c.n)}</h4><p>${esc(c.what)}</p><p class="k">Déclenchée quand ${esc(c.why)}.</p>${c.esc ? `<p class="k"><b>▲ Escalade</b> : ${esc(c.esc.t)}</p>` : ''}</article>`).join('');
  const ES = B.enSalle;
  const plaf = ES.plafond === 1 ? 'une fois' : `${mot(ES.plafond)} fois`;
  const regles = Object.values(B.regles).map(r => `<article class="ent"><h4>${esc(r.n)}</h4><p>${esc(r.d)}</p></article>`).join('');
  // v16.24 : le Masqué (élite assemblé), son masque dessiné depuis data/masque.js
  const AS = B.assemble, MC = AS.masque.couleurs, E2 = B.ennemis;
  const MOUV = { approche: 'Il vient au contact', distance: 'Il garde ses distances', rodeur: 'Il rôde tout près' };
  const FORME = { disque: 'disque autour de lui', anneau: 'anneau qui s’étend, avec une brèche', couloir: 'couloir vers toi', cone: 'cône devant lui', rayons: 'rayons en éventail', croix: 'croix centrée sur lui', losanges: 'losanges autour de toi', damier: 'damier sous tes pieds' };
  const masques = [['calme', 'Au repos'], ['charge', 'Il charge un sort'], ['fissure', `Sous ${AS.masque.fissurePV} % de PV`], ['brise', 'Vaincu']]
    .map(([e, t], i) => `<figure class="msq"><span>${MQ.svg(MC, e, 'wmq' + i, 'Le masque du Masqué : ' + lower(t))}</span><figcaption>${esc(t)}</figcaption></figure>`).join('');
  const corps = Object.values(AS.corps).map(C => { const S = AS.signatures[C.signature];
    return `<article class="ent"><h4>${esc(C.n)}</h4><p>${esc(MOUV[C.mouvement] || '')}${C.salle ? ` · dès la salle ${C.salle}` : ''}.</p><p class="k">Signature : ${ico(S.ic)}<b>${esc(S.n)}</b> (${esc(FORME[S.forme])})${C.exclut && C.exclut.length ? ` · jamais : ${C.exclut.map(k => esc(AS.capacites[k].n)).join(', ')}` : ''}</p></article>`; }).join('');
  const caps = Object.values(AS.capacites).map(X => `<article class="ent"><h4>${ico(X.ic)}${esc(X.n)}</h4><p>${esc(FORME[X.forme])}.</p><p class="k">Empruntée ${E2[X.de] ? `${X.de === 'brute' ? 'à la' : 'au'} ${esc(E2[X.de].n)}` : ''} · chargement ${sec(X.chargeS)}</p></article>`).join('');
  const sigs = Object.values(AS.signatures).map(X => `<article class="ent"><h4>${ico(X.ic)}${esc(X.n)}</h4><p>${esc(FORME[X.forme])}.</p><p class="k">Chargement ${sec(Math.max(X.chargeS, AS.signatureMinS))} (jamais moins de ${sec(AS.signatureMinS)})</p></article>`).join('');
  const muts = B.mutationsInstables.map(m => `<article class="ent"><h4>${esc(m.n)}</h4><p>${esc(m.d)}</p></article>`).join('');
  return `<section class="sec" id="bestiaire" data-sec>${MARK('data/bestiaire.js')}<header class="sh"><p class="eyebrow">Ennemis</p><h2>Bestiaire</h2><div class="lede"><p>Les statistiques indiquées sont les valeurs de base (salle 1, palier 0). Elles augmentent à chaque salle de <b>${pct(B.montee.pvParSalle)} de PV</b> et de <b>${pct(B.montee.degatsParSalle)} de dégâts</b>, et avec les paliers de Brume. Un <b>champion</b> a ${num(C.pv)}× les PV, ${num(C.degats)}× les dégâts et ${num(C.taille)}× la taille.</p></div></header>
<h3 class="sub">Les ennemis communs</h3>
<p>Toutes leurs attaques de zone sont annoncées en <b>rouge</b> : disque qui se remplit (Bouffi), onde pointillée (Hurleur), cône (Voilé), couloir (Brute). Un liseré rouge entoure les tirs des Spectres. Les zones des gardiens restent orange.</p>
<div class="grid g3">${ennemis}</div>
<h3 class="sub">Les rôles</h3>
<p>Plus tard dans la descente, certains ennemis reçoivent un <b>rôle</b>, signalé par une couleur. Il faut le repérer.</p>
<div class="grid g4">${roles}</div>
<h3 class="sub">Les thèmes de vague</h3>
<p>Chaque salle de combat suit un thème qui définit les ennemis présents et la meilleure façon de les affronter.</p>
<div class="grid g3">${themes}</div>
<h3 class="sub">Contre-mesures de la Brume</h3>
<p>La Brume lit ton style et déclenche une contre-mesure adaptée dans la salle. Chacune est liée à ce que tu fais trop.</p>
<div class="grid g4">${cms}</div>
<p><b>Il juge ses contre-mesures.</b> Après chaque salle où il en a lancé une, le Brumeux compare ce qu’elle t’a coûté à tes salles ordinaires : les PV perdus (pour ${EF.partDegats} %) et le temps passé (pour le reste). Plus de ${EF.seuilEfficace} % au-dessus de ta moyenne : elle a <b>porté</b>, il la relancera plus volontiers (mais il varie : chaque nouvel usage dans la même descente la rend un peu moins tentante). Plus de ${-EF.seuilDejouee} % en dessous : tu l’as <b>déjouée</b>, il s’en détourne. Déjouée ${EF.abandonApres} fois dans la même descente, il y <b>renonce</b> jusqu’à la fin de la descente. Son jugement se garde d’une descente à l’autre. Un texte violet donne le verdict à la fin de la salle, et l’écran de fin le rappelle.</p>
<p><b>Il décide en pleine salle.</b> Dès que sa contre-mesure est sur le terrain, le Brumeux regarde ce qu’elle te coûte par tranches de ${num(ES.fenetreS)} secondes de jeu (les pauses, lectures et arrêts sur image ne comptent pas). Si tu perds moins de ${ES.mordMin} % de tes PV max sur une tranche, elle ne mord pas : il <b>insiste</b>. Une bulle violette s’affiche avec l’icône de la contre-mesure et un <b style="color:#ff6b6b">▲</b> rouge, un son montant retentit, et l’étiquette de salle affiche ▲ ; l’escalade n’agit que ${num(ES.preavisS)} s plus tard, et ses ennemis apparaissent comme les autres, marqués de l’œil violet. Une seule escalade à la fois (les ennemis de la précédente doivent être tombés), ${ES.delaiS} secondes au moins entre deux, ${plaf} au plus par salle, et jamais juste avant ou après une mutation de règle. Si tu perds ${ES.mordTrop} % de tes PV max sur une tranche, ou si tes PV passent sous ${ES.relacheSousPV} %, elle mord trop : il <b>relâche</b> (bulle au <b style="color:#8be07a">▼</b> vert, son descendant). Les ennemis de contre-mesure pas encore arrivés sont annulés, le malus de soin est levé, et il n’insiste plus de la salle ; ce qui est déjà sur le terrain reste. Une salle où il a relâché compte comme une contre-mesure qui a porté. Il ne décide jamais en pleine salle dans une salle de gardien ni dans les ${mot(ES.gardeAvantGardien)} salles qui la précèdent${ES.dansBreche ? '' : ', ni dans une Brèche'}.</p>
<h3 class="sub" id="masque">Le Masqué</h3>
<div class="msqs">${masques}</div>
<p>${AS.exigeDomination ? 'Le <b>Masqué</b> vient chercher le joueur qui domine. ' : ''}Dans une salle de combat, d’élite${AS.dansBreche ? ' ou une Brèche' : ''} (jamais face à un gardien${AS.gardeAvantGardien ? ` ni dans les ${mot(AS.gardeAvantGardien)} salles d’avant` : ''}), à partir de la ${AS.premiereSalle}e salle ${AS.desActe > 1 ? `de chaque acte dès l’acte ${ROM[AS.desActe]}` : 'de chaque acte'}, il apparaît <b>${(([n, d]) => `${n === 1 ? 'une' : mot(n)} fois sur ${mot(d)}`)(fraction(AS.chance))}</b>${AS.dansBreche && AS.chanceBreche >= 100 ? ' ; dans une <b>Brèche</b>, il est <b>toujours</b> là' : ''}${AS.exigeDomination ? `, mais seulement si tu <b>vas vite</b> (${AS.vite.salleMaxS} s par salle ou moins en moyenne, sur au moins ${mot(AS.vite.sallesMin)} salles) ou si tu <b>n’as pas perdu de PV</b> depuis ${AS.intact.sansDegatsS} s de jeu ; sinon, il ne vient pas.` : '.'} On le reconnaît à son masque, toujours le même. C’est un ennemi <b>assemblé</b> : un corps (Brute, Spectre ou Voilé), <b>deux capacités</b> empruntées à d’autres ennemis et un <b>sort signature</b> propre à son corps. Ses icônes s’affichent au-dessus de sa tête et dans une bulle à son arrivée ; une icône fermée signale la capacité qui dort encore. Sous ${AS.eveilPV} % de PV, elle <b>s’éveille</b> (masque fissuré, bulle au ▲, son) et rejoint ses sorts.</p>
${AS.montage ? `<p><b>Le montage.</b> À son arrivée, le Brumeux pousse son cri d’invocation. Le corps d’origine descend au bout de <b>fils de marionnette</b>, le masque tombe sur sa tête et y est <b>cousu de force</b> : une aiguille, tenue par un fil qui remonte jusqu’à sa croix, trace chaque point un à un et le masque se serre contre la tête à chaque point ; il grossit le temps de la couture pour qu’on la voie bien (les points restent visibles), puis les fils sont coupés et ses yeux s’allument. Le montage dure ${sec(AS.montage.descenteS + AS.montage.masqueS + AS.montage.coutureS + AS.montage.coupeS)}${AS.montage.immunise ? ' ; pendant ce temps, il ne frappe pas et ne peut pas être blessé' : ''}.</p>
` : ''}<p>Il arrive avec la <b>deuxième vague</b> : en salle d’élite à la place du champion ; en Brèche, son champion s’efface. Pendant ses sorts, les autres ennemis ne lancent pas les leurs, et il attend la fin des leurs : <b>jamais deux zones à la fois</b>. Chaque sort se <b>charge</b> : barre au-dessus de lui, zone rouge dès le début, son qui monte, yeux du masque allumés, icône du sort qui s’éclaire. Une forme correspond toujours au même sort. Il ne lance <b>qu’un sort à la fois</b>, avec ${sec(AS.pauseS)} de pause entre deux, et souffle un peu plus après sa signature. Ses sorts tournent en cycle : chaque capacité une fois, dans un ordre qui change, puis la signature. Ses étourdissements durent ${AS.etourdissement === 0.5 ? 'moitié moins' : `${pct(AS.etourdissement)} de la normale`}. Pas de contre-mesure ni de règle de salle avec lui. Brisé, il donne <b>${AS.recompense.reliques > 1 ? `${mot(AS.recompense.reliques)} reliques` : 'une relique'}</b> de plus que la salle ; hors salle d’élite, il donne aussi l’or et les éclats d’un champion.</p>
<h4 class="sub">Corps</h4>
<div class="grid g3">${corps}</div>
<h4 class="sub">Capacités empruntées</h4>
<div class="grid g4">${caps}</div>
<p class="k">Jamais ensemble : ${AS.incompatibles.map(([a, b]) => `${esc(AS.capacites[a].n)} et ${esc(AS.capacites[b].n)}`).join(' ; ')}.</p>
<h4 class="sub">Sorts signature</h4>
<div class="grid g3">${sigs}</div>
${AS.passive ? `<p><b>${ico(AS.passive.ic)}Attaque passive · ${esc(AS.passive.n)}</b> : en plus de ses sorts, il te tire un trait toutes les ${sec(AS.passive.intervalleS)} (jusqu’à ${AS.passive.portee} px). Son menton s’allume juste avant. Ce n’est pas une zone : un projectile au liseré rouge, comme ceux des Spectres, qui peut se perdre dans les autres ennemis.</p>
` : ''}<h3 class="sub">Règles de salle</h3>
<div class="grid g4">${regles}</div>
<p>À partir de la ${RS.desLaSalle}e salle, une salle de combat ou d’élite reçoit parfois une règle (${chance(RS.chanceActeI)} à l’acte I, ${chance(RS.chanceEnsuite, true)} ensuite). La règle est choisie selon tes PV : sous ${RS.seuilBrume} %, seulement la brume ; sous ${RS.seuilBrumeSol} %, la brume ou le sol ; au-dessus, les quatre. <b>La règle mute une fois</b> en plein combat, entre ${RS.mutationMinS} et ${RS.mutationMaxS} secondes après son apparition : elle est remplacée par une autre règle possible à ton niveau de PV. Purifier une salle à règle rapporte <b>une relance de talents</b> et de l’or (${RS.orBase} + ${RS.orParActe} par acte).</p>
<h3 class="sub">La Brèche</h3>
<p>À partir de la ${BR.premiereSalle}e salle, une porte de combat peut devenir une <b>Brèche</b> (${chance(BR.chance)} par porte de combat remplaçable ; jamais dans les deux dernières salles avant le gardien, ni deux fois de suite). C’est facultatif : un combat plus dur qu’un combat ordinaire, ${B.assemble && B.assemble.dansBreche && B.assemble.chanceBreche >= 100 ? `tenu par un <a href="#masque">Masqué</a> qui arrive avec la deuxième vague (pas de champion ni de règle de salle). En échange, la Brèche donne <b>une relique au choix</b> et de l’or (${BR.orBase} + ${BR.orParActe} par acte), en plus de ce que donne le Masqué.</p>` : `avec une vague de plus qui compte <b>un champion</b>, et une <b>règle de salle imposée</b> (choisie selon tes PV comme ci-dessus, avec la même mutation). En échange, la Brèche donne <b>une relique au choix</b>, de l’or (${BR.orBase} + ${BR.orParActe} par acte) et, comme toute salle à règle, <b>une relance de talents</b>.</p>`}
<h3 class="sub">Mutation Instable (talent du Gouffre)</h3>
<p>Ces mutations ne touchent pas les ennemis : c’est toi qui mutes. Le talent <b>Mutation Instable</b> du Gouffre te donne l’une d’elles au hasard toutes les 20 secondes, pendant 8 secondes.</p>
<div class="grid g4">${muts}</div>
</section>`;
}

// ── Section « Les gardiens »
function attaquesGardien(G, a) {
  const X = G.attaques[a], TEMPS = ['', 'premier', 'deuxième', 'troisième'];
  const quand = k => { const t = [1, 2, 3].filter(i => X.file[i].includes(k));
    if (!t.length) return 'Tout le combat'; if (t.length === 3) return 'Les trois temps';
    const s = t.map(i => TEMPS[i]).join(' et ') + (t.length > 1 ? ' temps' : ' temps'); return s[0].toUpperCase() + s.slice(1); };
  const cartes = Object.entries(X.liste).map(([k, x]) => `<article class="ent"><h4>${esc(x.n)}</h4><p class="k">${esc(quand(k))}</p><p>${esc(x.d)}</p></article>`).join('');
  return `<h3 class="sub">Attaques · ${esc(G.actes[a - 1].boss)}</h3>
<div class="grid g3">${cartes}</div>`;
}

function gardiens(G, F) {
  const A = G.actes;
  const cartes = A.map((a, i) => `<article class="ent boss"><span class="num">${ROM[i + 1]}</span><h3>${esc(a.boss)}</h3><p class="k">${esc(a.name)} · ${a.rooms} salles</p><p>${esc(a.done)}.</p></article>`).join('');
  const copies = Object.values(G.copies).map(c => `<article class="ent"><h4>Si tu abuses de ${esc(c.what)}</h4><p>${esc(c.hint)}</p></article>`).join('');
  const failles = Object.entries(G.failles).map(([a, f]) => `<article class="ent"><h4>${esc(A[a - 1].boss)}</h4><p><b>${esc(f.l1)}.</b></p><p><b>${esc(f.l3)}.</b> ${esc(f.t3)}</p></article>`).join('');
  const fen = Object.entries(G.fenetres).map(([c, x]) => `<article class="ent" data-cls="${c}"><h4 style="color:${F[c].col}">${esc(F[c].n)}</h4><p><b>Avertissement :</b> ${esc(x.warn)}.</p><p><b>Fenêtre :</b> ${esc(x.label)}.</p></article>`).join('');
  const titre2 = Object.keys(G.failles).map((a, i) => `${esc(i ? lower(A[a - 1].boss) : A[a - 1].boss)} · Acte ${ROM[a]}`).join(' et ');
  return `<section class="sec" id="gardiens" data-sec>${MARK('data/gardiens.js')}<header class="sh"><p class="eyebrow">Boss</p><h2>Les gardiens</h2><div class="lede"><p>Chaque acte se termine par un gardien. Tous se jouent en <b>trois temps</b> (phases) ; ils s’énervent quand leur vie baisse. Le gardien du <b>premier acte</b> observe ta forme et la reflète.</p></div></header>
<div class="grid g3">${cartes}</div>

<h3 class="sub">${esc(A[0].boss)} · Acte I</h3>
<p>Elle se déroule en trois temps : <b>Observation</b>, <b>Adaptation</b>, <b>Désespoir</b>. Elle copie ce que tu fais le plus :</p>
<div class="grid g3">${copies}</div>

<h3 class="sub">${titre2}</h3>
<p>Ces deux gardiens passent par trois temps. Lors de la troisième phase, une <b>faille</b> s’ouvre :</p>
<div class="grid g2">${failles}</div>

${[2, 3].map(a => attaquesGardien(G, a)).join('\n')}

<h3 class="sub">Fenêtres de vulnérabilité</h3>
<p>Selon ta forme, le gardien expose périodiquement une faiblesse. Un message te prévient ; tu as <b>${num(G.aNu.dureeS)} secondes</b> pour frapper avec <b>+${Math.round((G.aNu.mult - 1) * 100)} %</b> de dégâts. L’intervalle diminue avec le niveau d’Accoutumance.</p>
<div class="grid g4">${fen}</div>
<aside class="note ">Pendant le changement de phase, le gardien est brièvement verrouillé (${num(G.verrouPhase.dureeS)} s). Prends ce temps pour te replacer et te soigner.</aside>
</section>`;
}

// ── Section « Arbre des Résonances »
function resonances(R) {
  const node = n => {
    const tags = n.k === 'b'
      ? [`<span class="tag">${esc(R.genres.b)}</span>`, ...n.zones.map(z => `<span class="tag" style="--t:${R.zones[z].c}">${esc(R.zones[z].n)}</span>`)]
      : [`<span class="tag">${esc(R.genres[n.k])}</span>`, `<span class="tag">${R.couts[n.k]} ✦</span>`, ...(n.impl ? [] : ['<span class="tag">à venir</span>'])];
    return `<article class="ent rzn"><div class="eh"><h4>${esc(n.name)}</h4><div class="tags">${tags.join('')}</div></div><p class="gain"><b>＋</b> ${esc(n.eff)}</p><p class="cost"><b>－</b> ${esc(n.con)}</p>${n.k !== 'b' && n.syn ? `<p class="k">Synergies : ${esc(n.syn)}</p>` : ''}</article>`;
  };
  const branche = z => { const Z = R.zones[z];
    return `<div class="branch" id="rz-${z}" style="--c:${Z.c}"><h3 class="bh"><span class="dot"></span>${esc(Z.n)} <small>${esc(Z.p)}</small></h3><p class="k">${esc(Z.t)}</p><div class="grid g2">${R.noeuds.filter(n => n.k !== 'b' && n.id[0] === z).map(node).join('')}</div></div>`; };
  const ponts = `<div class="branch" id="rz-ponts" style="--c:#aaa"><h3 class="bh"><span class="dot"></span>Ponts <small>entre deux zones</small></h3><div class="grid g2">${R.noeuds.filter(n => n.k === 'b').map(node).join('')}</div></div>`;
  return `<section class="sec" id="resonances" data-sec>${MARK('data/resonances.js')}<header class="sh"><p class="eyebrow">Progression permanente</p><h2>Arbre des Résonances</h2><div class="lede"><p>Les <b>Résonances</b> sont un arbre permanent, dépensé chez Ismène. Elles ne donnent pas de puissance gratuite : chaque nœud <b>déplace un risque</b>, il t’offre un avantage et t’en coûte un autre. Tu peux avoir ${R.keystonesMax} keystones actifs en même temps.</p></div></header>
<dl class="kv"><dt>Gagner</dt><dd>${esc(R.gains)}</dd><dt>Types de nœuds</dt><dd>Mineur (●), Notable (◎), Keystone (◆), Pont (○). Un pont relie deux zones : il faut un nœud mineur dans chacune.</dd><dt>Respec</dt><dd>Tu peux réinitialiser, au prix de ${R.respec} éclats par point de coût et par respec déjà effectué.</dd></dl>
${R.ordre.map(branche).join('')}
${ponts}
</section>`;
}

// ── Section « Arbres de talents »
// L'arbre est dessiné par data/arbre.js, le même module que le jeu : le wiki montre l'arbre tel qu'on le voit en jeu.
function talents(T, A) {
  const N = T.noeuds, K = T.genres, X = T.exclusions;
  // incompatibilités symétriques : la liste du talent, puis ceux qui le listent
  const excl = id => { const out = [...(X[id] || [])]; for (const k in X) if (X[k].includes(id) && !out.includes(k)) out.push(k); return out.filter(k => N[k]); };
  // fiches lues par le script du wiki (panneau de détail et recherche)
  const fiches = {};
  for (const id of Object.keys(N)) {
    const n = N[id];
    const f = { n: n.name, k: n.k, b: id.split('_')[0], m: n.max, d: n.k === 'x' ? n.mod : n.desc };
    if (n.up) f.u = n.up;
    if (n.k === 'x') { f.x = id.endsWith('a') ? 'A' : 'B'; if (n.syn) f.y = n.syn; }
    const ex = excl(id); if (ex.length) f.e = ex.map(k => N[k].name);
    fiches[id] = f;
  }
  const cadres = {}; for (const c of Object.keys(T.formes)) Object.assign(cadres, Object.fromEntries(Object.entries(A.vues(c)).filter(([k]) => k !== 'tout').map(([k, v]) => [k, v])));
  const vuesTout = { tout: A.vues(Object.keys(T.formes)[0]).tout };
  const racines = Object.fromEntries(Object.entries(T.formes).map(([c, F]) => [c, { n: F.root, d: F.rootDesc, c: F.color }]));
  const json = JSON.stringify({ genres: K, cadres: Object.assign({}, vuesTout, cadres), racines, branches: Object.fromEntries(Object.entries(T.branches).map(([b, B]) => [b, { n: B.name, c: B.color, v: B.voie || '' }])), fiches }).replace(/</g, '\\u003c');
  const bloc = (c, F) => {
    const brs = A.branches(c);
    const puces = [`<button type="button" class="chip on" data-z="tout">Vue d’ensemble</button>`]
      .concat(brs.map(b => { const B = T.branches[b]; return `<button type="button" class="chip" data-z="${b}" style="--cc:${B.color}"><b>●</b> ${esc(B.name)}${B.sub ? ` <small>${esc(B.voie)}</small>` : ''}</button>`; })).join('');
    const ancres = brs.map(b => `<span class="anc" id="talents-${b}"></span>`).join('');
    return `<div class="clsblock" id="talents-${c}" data-cls="${c}" style="--c:${F.color}"><h3 class="cb" style="color:${F.color}">${esc(F.name)}</h3><p class="k">${esc(F.rootDesc)}</p>${ancres}
<div class="treebox" data-tree="${c}"><div class="tbar" role="group" aria-label="Zoomer sur une branche">${puces}</div>
<div class="tstage"><div class="tsvg">${A.dessiner({ cls: c, statique: true })}</div><aside class="tdet" aria-live="polite"><p class="hint">Survole ou clique un nœud pour lire son effet. Clique sur une branche pour zoomer dessus et lire tous les noms.</p></aside></div>
${A.legende()}</div></div>`;
  };
  const formes = Object.entries(T.formes);
  return `<section class="sec" id="talents" data-sec>${MARK('data/talents.js et data/arbre.js')}<style>${A.css}</style><header class="sh"><p class="eyebrow">Progression</p><h2>Arbres de talents</h2><div class="lede"><p>Chaque niveau te propose <b>3 talents</b> à choisir (4 avec <i>Vision élargie</i>). Chaque forme possède trois branches mineures et trois voies de sous-classe, une par branche : tu en choisis une au Rituel d’Ascension. Les <b>Majeurs</b> (losanges A et B) arrivent par paires : tu prends A <i>ou</i> B. Les <b>nœuds clés</b> (carrés) changent le style de jeu, et certains s’excluent mutuellement.</p><p>Les arbres ci-dessous sont ceux du jeu, tels que tu les vois à chaque montée de niveau : tu démarres au centre et chaque talent ouvre ses voisins.</p></div></header>
<div class="filters" id="clsfilter"><span>Afficher :</span>
<button type="button" class="chip on" data-f="all">Toutes les formes</button>
${formes.map(([c, F]) => `<button type="button" class="chip" data-f="${c}" style="--cc:${F.color}">${esc(F.short)}</button>`).join('')}
</div>
<aside class="note ">La disponibilité de certains talents dépend de ce que tu as déjà pris : un nœud incompatible apparaît barré d’un pointillé rouge en jeu, et le détail de chaque talent indique ses incompatibilités (elles sont symétriques : si A bloque B, B bloque A).</aside>
${formes.map(([c, F]) => bloc(c, F)).join('\n')}
<script type="application/json" id="tdata">${json}</script>
<script>var arbreVue=${A.vue.toString().replace(/<\/script/g, '<\\/script')};</script>
</section>`;
}


// ── Fragments générés à l'intérieur des sections écrites à la main
// Ils sont repérés par <!-- gen:nom --> … <!-- /gen:nom --> dans wiki.html.
function replaceFragment(html, name, content) {
  const a = `<!-- gen:${name} -->`, b = `<!-- /gen:${name} -->`;
  const i = html.indexOf(a), j = html.indexOf(b);
  if (i < 0 || j < i) throw new Error(`Fragment ${name} introuvable dans wiki.html`);
  return html.slice(0, i + a.length) + content + html.slice(j);
}
// Touches par défaut (clavier AZERTY), comme le jeu les affiche
const TOUCHES = { '{MOVE}': 'ZQSD', '{R}': 'R', '{A}': 'A', '{E}': 'E', '{F}': 'F' };
const touche = k => k.replace(/\{\w+\}/g, t => TOUCHES[t] || t);
const sec = x => `${num(x)} s`;

function fragments(D) {
  const T = D.talents, FO = D.formes, F = FO.fiches, ordre = FO.ordre, SA = D.sanctuaire, ME = D.memoire, HI = D.histoire;
  const out = {};
  out['intro-compte'] = `les ${mot(ordre.length)} formes, leurs ${Object.keys(T.noeuds).length} talents, les ${D.reliques.length} reliques, les ${Object.keys(D.equipements.objets).length} équipements`;
  out['intro-actes'] = D.gardiens.actes.map(a => esc(a.name)).join(', ');
  out.commandes = `<div class="tabs" data-tabs>\n${ordre.map((c, i) => `<button type="button" class="tab${i ? '' : ' on'}" data-t="k-${c}" style="--c:${T.formes[c].color}">${esc(T.formes[c].short)}</button>`).join('')}\n</div>\n`
    + ordre.map((c, i) => `<div class="tabpane${i ? '' : ' on'}" id="k-${c}"><dl class="kv">${F[c].commandes.map(([k, v]) => `<dt><kbd>${esc(touche(k))}</kbd></dt><dd>${esc(v)}</dd>`).join('')}</dl></div>`).join('');
  const branches = c => Object.keys(T.branches).filter(b => T.branches[b].cls === c);
  const carte = c => { const C = T.formes[c], f = F[c], main = branches(c).filter(b => !T.branches[b].sub), subs = branches(c).filter(b => T.branches[b].sub);
    return `<article class="ent clscard" id="forme-${c}" style="--c:${C.color}" data-cls="${c}">
  <div class="clshead"><h3 style="color:${C.color}">${esc(C.name)}</h3><span class="tag" style="--t:${C.color}">${esc(f.difficulte)}</span></div>
  <p class="pitch">${esc(f.pitch)}</p>
  <p>${esc(f.aide)}</p>
  <dl class="kv"><dt>Mécanique</dt><dd>${esc(f.mech)}</dd><dt>Éveil</dt><dd>${esc(C.rootDesc)}</dd><dt>Branches</dt><dd>${main.map(b => `<a href="#talents-${b}">${esc(T.branches[b].name)}</a>`).join(', ')}</dd><dt>Sous-classes</dt><dd>${subs.map(b => `<a href="#talents-${b}">${esc(T.branches[b].name)}</a> <small>(${esc(T.branches[b].voie)})</small>`).join(', ')}</dd></dl>
  ${(FO.apercus && FO.apercus[c]) ? `<div class="apv" data-cls="${c}"><div class="apvhead"><p class="h-sec">Aperçu · ${esc(C.short)}</p><span class="apvdiff">${esc(f.mech)} · ${esc(f.difficulte)}</span></div><div class="apvstage"><iframe title="Aperçu du gameplay : ${esc(C.short)}" data-src="index.html?demo=${c}" tabindex="-1" scrolling="no" loading="lazy"></iframe></div><ol class="apvsteps">${FO.apercus[c].map(([t, d], n) => `<li><button type="button" data-ph="${n}" data-d="${esc(touche(d))}"><i>${n + 1}</i><span>${esc(touche(t))}</span></button></li>`).join('')}</ol><p class="apvdesc">${esc(touche(FO.apercus[c][0][1]))}</p></div>` : ''}
  <p class="links"><a href="#talents-${main[0]}">Voir les talents →</a></p></article>`; };
  out.formes = `<div class="grid g2">${ordre.map(carte).join('')}</div>
<h3 class="sub">Statistiques de départ</h3>
<table class="tbl"><thead><tr><th>Forme</th><th>PV</th><th>Vitesse</th><th>Dégâts</th><th>Cadence</th><th>Esquive</th></tr></thead><tbody>
${ordre.map(c => { const d = F[c].depart; return `<tr><td>${esc(T.formes[c].short)}</td><td>${d.maxHp}</td><td>${d.speed}</td><td>${d.atkDmg}</td><td>${d.atkCd.toFixed(2).replace('.', ',')} s</td><td>${sec(d.dashCd)}</td></tr>`; }).join('\n')}</tbody></table>`;
  out.pnj = `<div class="grid g4">${Object.values(SA.pnj).map(n => `<article class="ent"><h4>${esc(n.name)}</h4><p class="k">${esc(n.role)}</p><p>${esc(n.desc)}</p></article>`).join('')}</div>`;
  const B = D.resonances.bareme, P = SA.parPalier;
  out.eclats = `<p>Tu gagnes des <b>Éclats</b> à chaque descente, réussie ou non. Une mort conserve <b>${pct(B.mort)}</b> des éclats du run, un abandon <b>${pct(B.abandon)}</b>, une victoire <b>${pct(B.victoire)}</b>. Les éclats achètent des améliorations permanentes à la flamme d’Ismène.</p>
<div class="grid g2">${SA.ameliorations.map(m => `<article class="ent"><div class="eh"><h4>${esc(m.name)}</h4><span class="tag">${m.max} rang${m.max > 1 ? 's' : ''}</span></div><p>${esc(m.desc)}</p><p class="k">Coût : ${m.cost.map(c => `${c} ✦`).join(' · ')}</p></article>`).join('')}</div>`;
  out.paliers = `<p>Après ta première victoire, tu peux redescendre plus difficilement. Chaque palier <b>s’ajoute aux précédents</b>, renforce les ennemis de ${pct(P.pvEnnemis)} de PV et ${pct(P.degatsEnnemis)} de dégâts, et rapporte <b>${pct(P.eclats)} d’éclats en plus</b>. Faire taire le Glas Originel débloque le palier suivant.</p>
<table class="tbl"><thead><tr><th>Palier</th><th>Nom</th><th>Effet</th></tr></thead><tbody>
${SA.paliers.map(p => `<tr><td>${p.n}</td><td><b>${esc(p.name)}</b></td><td>${esc(p.desc)}</td></tr>`).join('')}</tbody></table>`;
  const A = ME.accoutumance;
  out.accoutumance = `<p>Chaque descente, la Brume mesure la part de tes dégâts qui repose sur la mécanique de ta classe. Au-delà de <b>${pct(A.seuil)}</b>, elle <b>apprend</b> ; en dessous, ou avec une autre classe, elle oublie. Jusqu’à trois niveaux. Une Brume qui a appris rapporte plus d’éclats (+${pct(A.eclatsParNiveau)} par niveau). Les accoutumés encaissent mieux ton mécanisme, mais le contre-jeu t’est donné.</p>`;
  out.adaptations = `<div class="grid g2">${Object.entries(ME.adaptations).map(([c, a]) => `<article class="ent" data-cls="${c}"><h4 style="color:${T.formes[c].color}">${esc(T.formes[c].short)} · ${esc(a.name)}</h4><p>La Brume observe <b>${esc(a.what)}</b>.</p><p><b>Contre-jeu :</b> ${esc(a.counter)}</p></article>`).join('')}</div>`;
  out.traits = `<table class="tbl"><thead><tr><th>Trait</th><th>Paliers</th><th>Mesure</th></tr></thead><tbody>
${ME.traits.map(t => `<tr><td><b>${esc(t.name)}</b></td><td>${t.tiers.join(' · ')}</td><td>${esc(t.desc)}</td></tr>`).join('')}</tbody></table>`;
  out.carte = HI.chapitres.map((C, i) => { const fr = HI.fragments.filter(f => f.ch === i + 1);
    return `<article class="ent chap"><div class="eh"><h4>Chapitre ${C.n} · ${esc(C.t)}</h4><span class="tag">${fr.length} fragments</span></div><p class="k">${esc(C.hint)}</p>
<details class="spoil"><summary>Révéler la Vérité : « ${esc(C.truth)} »</summary><p>${esc(C.tx)}</p></details>
<details class="spoil"><summary>Révéler les fragments</summary>${fr.map(f => `<p><b>${esc(f.name)}</b> — ${esc(f.text)}</p>`).join('')}</details></article>`; }).join('');
  out.codex = `<table class="tbl"><thead><tr><th>Entrée</th><th>Condition</th></tr></thead><tbody>
${HI.codex.map(l => `<tr><td><b>${esc(l.t)}</b></td><td>${esc(l.h || 'Dès le début.')}</td></tr>`).join('')}</tbody></table>`;
  out.journal = `<ol class="log">${D.versions.journal.map(e => `<li><span class="d">${esc(e.d)}</span><span class="h">${esc(e.h)}</span><span class="s">${esc(e.t)}</span></li>`).join('')}</ol>`;
  return out;
}

// ── Assemblage
function replaceSection(html, id, content) {
  const re = new RegExp(`<section class="sec" id="${id}"[^>]*>[\\s\\S]*?</section>`);
  if (!re.test(html)) throw new Error(`Section #${id} introuvable dans wiki.html`);
  return html.replace(re, () => content);
}
function gameVersion(D) {
  const v = D.versions && D.versions.actuelle;
  if (!/^v\d+(\.\d+)*$/.test(v || '')) throw new Error('Version du jeu absente ou invalide dans data/versions.js');
  return v;
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
  let out = replaceSection(html, 'equipements', equipements(D.equipements, formes(D), D));
  out = replaceSection(out, 'reliques', reliques(D.reliques, formes(D)));
  out = replaceSection(out, 'pactes', pactes(D.pactes, D.icones));
  out = replaceSection(out, 'bestiaire', bestiaire(D.bestiaire, D.icones, D.masque));
  out = replaceSection(out, 'gardiens', gardiens(D.gardiens, formes(D)));
  out = replaceSection(out, 'resonances', resonances(D.resonances));
  out = replaceSection(out, 'talents', talents(D.talents, D.arbre));
  for (const [name, content] of Object.entries(fragments(D))) out = replaceFragment(out, name, content);
  return syncVersion(out, gameVersion(D));
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
