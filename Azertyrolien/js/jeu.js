/* Azertyrolien — grand écran : la montagne, la souris, le pupitre de l'animateur. */
(() => {
const W = 1000, H = 560, X0 = 150, X1 = 800, EDGE = X1 + 56, N = 20, KH = 21;
// Le spectacle doit être identique sur tous les PC : le réglage Windows « réduire les animations » est ignoré,
// sauf si l'adresse contient ?calme=1 (animations raccourcies).
const reduce = new URLSearchParams(location.search).get("calme") === "1";
if (reduce) document.documentElement.classList.add("calme");
// prix arrondis à l'euro (les joueurs tapent des prix entiers) ; indicatifs, à vérifier
const EXEMPLES = [
  {nom:"Câble HDMI", detail:"2 mètres", prix:8},
  {nom:"Clé USB", detail:"64 Go", prix:13},
  {nom:"Ventilateur PC RGB", detail:"120 mm", prix:15},
  {nom:"Bombe à air sec pour PC", detail:"Dépoussiérant", prix:10},
  {nom:"Switch réseau Netgear", detail:"24 ports", prix:100},
  {nom:"Souris Logitech G Pro X Superlight", detail:"Sans fil", prix:100},
  {nom:"Manette Xbox One", detail:"Sans fil", prix:60},
  {nom:"Casque HyperX Cloud II Wireless", detail:"Sans fil", prix:120},
  {nom:"Clavier mécanique RGB", detail:"Rétroéclairé", prix:70},
  {nom:"Alimentation PC", detail:"650 W", prix:90},
  {nom:"SSD NVMe Samsung 990 Pro", detail:"1 To", prix:99},
  {nom:"Écran gaming 24 pouces", detail:"180 Hz", prix:180},
  {nom:"Multiprise électrique", detail:"5 prises, 1 m", prix:6}
];
const DEF = {points:200, coef:1, temps:60, lot:"Des points pour le classement général du tournoi", items:EXEMPLES};
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const clone = o => JSON.parse(JSON.stringify(o));
const pause = ms => new Promise(r => setTimeout(r, reduce ? Math.min(ms, 150) : ms));

function charger(){
  try { const s = JSON.parse(localStorage.getItem("azertyrolien-cfg") || "null");
    if (s && Array.isArray(s.items)) return Object.assign(clone(DEF), {points:s.points, coef:s.coef, temps:s.temps || DEF.temps, lot:/goodies/i.test(s.lot||"") ? DEF.lot : s.lot, items:s.items}); } catch(e){}
  return clone(DEF);
}
function sauver(){ try { localStorage.setItem("azertyrolien-cfg", JSON.stringify(cfg)); return true; } catch(e){ return false; } }
let cfg = charger();
if (!(cfg.points > 0)) cfg.points = 200;
if (!(cfg.coef > 0)) cfg.coef = 1;
if (!(cfg.temps >= 10)) cfg.temps = 60;
let G = null;

/* ---------- Son ---------- */
let ac = null, son = true;
function audio(){ if(!son) return null; try { ac = ac || new (window.AudioContext||window.webkitAudioContext)(); if(ac.state==="suspended") ac.resume(); } catch(e){ return null; } return ac; }
function bip(f, d=.07, type="square", vol=.07, when=0){
  const a = audio(); if(!a) return;
  const o = a.createOscillator(), g = a.createGain(), t = a.currentTime + when;
  o.type = type; o.frequency.value = f;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + d);
  o.connect(g).connect(a.destination); o.start(t); o.stop(t + d + .03);
}
function glissade(f1, f2, d){
  const a = audio(); if(!a) return;
  const o = a.createOscillator(), g = a.createGain(), t = a.currentTime;
  o.type = "sawtooth"; o.frequency.setValueAtTime(f1, t); o.frequency.exponentialRampToValueAtTime(f2, t + d);
  g.gain.setValueAtTime(.08, t); g.gain.exponentialRampToValueAtTime(.0001, t + d);
  o.connect(g).connect(a.destination); o.start(t); o.stop(t + d + .05);
}
function fanfare(){ [523,659,784,1047].forEach((f,i) => bip(f,.22,"triangle",.12,i*.14)); bip(1047,.7,"triangle",.12,.62); bip(1319,.7,"triangle",.08,.62); }
// petit « yodel » : deux notes qui alternent et montent avec l'altitude
function tic(i){ const k = 1 + i/30; bip((i%2 ? 392 : 587) * k, .09, "triangle", .1); }

/* ---------- La souris Azerty : redessinée d'après le logo (silhouette blanche douce, fins traits rosés, légère lueur) ---------- */
const OREILLE = `<path class="m-line PEAU" d="M-8 0 C-15 -12,-13 -31,-2 -37 C9 -41,15 -26,10 0 Z"/><path class="m-trait" d="M-2 -6 C-6 -15,-5 -27,0 -32 C6 -27,6 -16,4 -6"/>`;
const BRAS = `<path class="PEAU" d="M-5 -6 C-3 8,3 16,12 20 C17 22,20 18,16 15 C10 11,6 6,5 -6 Z"/><path class="m-trait" d="M-4 -1 C-3 8,3 16,12 20 C17 22,20 18,16 15 C10 11,6 6,4 -1"/>`;
function souris(){
  const piv = (cls, x, y, src) => `<g transform="translate(${x} ${y})"><g class="${cls}">${src}</g></g>`;
  return `<g transform="scale(.6)">
    <g filter="url(#m-doux)"><g class="m-anim">
    ${piv("m-queue", -30, -8, `<path d="M0 0 C-16 7,-36 9,-50 3 C-60 -1,-64 -12,-57 -19" fill="none" stroke="var(--m-edge)" stroke-width="6" stroke-linecap="round"/>
      <path d="M0 0 C-16 7,-36 9,-50 3 C-60 -1,-64 -12,-57 -19" fill="none" stroke="var(--m-fill)" stroke-width="3.6" stroke-linecap="round"/>`)}
    <path class="m-line m-fill" d="M-52 -10 C-60 -6,-58 3,-47 3 L-26 2 L-28 -9 Z"/>
    <path class="m-trait" d="M-52 -3 C-48 -1,-44 -2,-42 -5" stroke-width="1.4"/>
    ${piv("m-bras2", 16, -72, BRAS.replace("PEAU","m-line m-shade"))}
    <path class="m-line m-fill" d="M-30 -3 C-50 -9,-54 -38,-38 -54 C-28 -64,-22 -78,-14 -92 C-9 -100,0 -103,8 -99 L16 -92 C21 -82,22 -68,18 -58 C14 -48,22 -38,24 -26 C25 -14,16 -4,2 -4 Z"/>
    <path class="m-trait" d="M-4 -6 C-34 -6,-42 -40,-18 -47 C2 -52,15 -40,14 -24"/>
    <path class="m-trait" d="M-12 -84 C-14 -72,-18 -62,-26 -54" stroke-width="1.4"/>
    <path class="m-line m-fill" d="M-14 -6 C-2 -8,16 -6,32 -4 C39 -3,40 2,33 2 L-12 2 C-19 2,-20 -4,-14 -6 Z"/>
    <path class="m-trait" d="M24 -4 L24 1 M30 -4 L30 1" stroke-width="1.3"/>
    <g class="m-echarpe">
      <path d="M-12 -80 C-20 -70,-28 -58,-36 -48 C-31 -44,-26 -43,-22 -44 C-16 -55,-9 -66,-3 -77 Z"/>
      <path d="M-18 -95 C-6 -88,10 -88,23 -94 L25 -79 C12 -73,-6 -73,-19 -80 Z"/>
      <path class="m-trait" d="M-17 -87 C-5 -81,10 -81,24 -86" stroke="rgba(0,0,0,.22)"/>
    </g>
    ${piv("m-tete", 4, -98, `
      ${piv("m-oreille2", -3, -16, OREILLE.replace("PEAU","m-shade"))}
      ${piv("m-oreille", 9, -16, OREILLE.replace("PEAU","m-fill"))}
      <path class="m-line m-fill" d="M-12 2 C-14 -10,-3 -19,9 -19 C21 -19,34 -11,50 4 C53 7,51 10,46 10 C34 11,22 14,10 15 C0 16,-10 11,-12 2 Z"/>
      <path class="m-trait" d="M-9 4 C-3 10,4 12,9 11"/>
      ${piv("m-oeil", 19, -5, `<ellipse rx="2.5" ry="3.3" fill="var(--m-line)"/>`)}
      <path class="m-trait" d="M47 10 C37 9,29 12,20 10" stroke-width="1.5"/>
      <circle cx="50" cy="5" r="2.8" fill="var(--m-line)"/>
      <g stroke="var(--m-line)" stroke-width="1" stroke-linecap="round" opacity=".8">
        <line x1="40" y1="4" x2="55" y2="-1"/><line x1="40" y1="6" x2="57" y2="7"/><line x1="40" y1="8" x2="55" y2="14"/>
      </g>
    `)}
    ${piv("m-bras", 10, -74, BRAS.replace("PEAU","m-line m-fill"))}
  </g></g></g>`;
}

/* ---------- Montagne ---------- */
// relief : une seule fonction de hauteur ; la montagne, les touches et la souris la suivent
const lin = x => 483 + (170 - 483) * (Math.min(x, X1) - X0) / (X1 - X0);
const ground = x => lin(x) + (x >= X1 ? 0 : Math.max(0, Math.min(1, (X1 - 10 - x) / 110)) * (11 * Math.sin((x - X0) / 78) + 6 * Math.sin((x - X0) / 33 + 1.3)));
const angDe = x => Math.atan2(ground(x + 8) - ground(x - 8), 16) * 180 / Math.PI;
const LT = [0]; let SLONG = 0;
for (let x = X0 + 1; x <= X1; x++){ SLONG += Math.hypot(1, ground(x) - ground(x - 1)); LT[x - X0] = SLONG; }
function xAt(f){
  const s = Math.max(0, Math.min(N, f)) / N * SLONG; let i = 1;
  while (i < LT.length - 1 && LT[i] < s) i++;
  const d = LT[i] - LT[i-1] || 1; return X0 + i - 1 + (s - LT[i-1]) / d;
}
const KW = SLONG / N * .94;
// point d'appui (dessus de la touche) et point au sol, à l'abscisse curviligne f (0 = départ, N = bord)
function stepPt(f){
  const x = xAt(f), g = ground(x), a = angDe(x), r = a * Math.PI / 180;
  return {gx:x, gy:g, a, x:x + KH * Math.sin(r), y:g - KH * Math.cos(r)};
}
function rnd(seed){ let s = seed; return () => (s = (s*16807) % 2147483647) / 2147483647; }
const valeurTouche = i => Math.round(cfg.points * (1 - i / N));

function dessiner(){
  const r = rnd(42), gE = ground(EDGE);
  const haut = []; for (let x = 0; x <= EDGE; x += 4) haut.push(`${x} ${ground(x).toFixed(1)}`);
  const falaise = [[EDGE+8, gE+60], [EDGE-2, gE+130], [EDGE+14, gE+215], [EDGE+4, gE+295], [EDGE+20, H]];
  const mont = `M0 ${H} L${haut.join(" L")} L${falaise.map(p => p.join(" ")).join(" L")} Z`;
  let s = `<defs>
    <linearGradient id="ciel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0a053a"/><stop offset=".5" stop-color="#241470"/><stop offset=".85" stop-color="#5a2480"/><stop offset="1" stop-color="#7d2f80"/></linearGradient>
    <radialGradient id="halo" cx=".84" cy=".2" r=".55"><stop offset="0" stop-color="#ff5252" stop-opacity=".32"/><stop offset="1" stop-color="#ff5252" stop-opacity="0"/></radialGradient>
    <radialGradient id="lune" cx=".5" cy=".5" r=".5"><stop offset=".55" stop-color="#f4efff" stop-opacity=".35"/><stop offset="1" stop-color="#f4efff" stop-opacity="0"/></radialGradient>
    <linearGradient id="roche" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6b5cc8"/><stop offset=".55" stop-color="#43379d"/><stop offset="1" stop-color="#271d78"/></linearGradient>
    <radialGradient id="vide" cx="1" cy="1" r=".6"><stop offset="0" stop-color="#020118" stop-opacity=".85"/><stop offset="1" stop-color="#020118" stop-opacity="0"/></radialGradient>
    <filter id="m-doux" filterUnits="userSpaceOnUse" x="-110" y="-200" width="190" height="230"><feGaussianBlur stdDeviation=".9" result="f"/><feDropShadow in="f" dx="0" dy="0" stdDeviation="3.2" flood-color="#ff7aa0" flood-opacity=".5"/></filter>
    <clipPath id="mclip"><path d="${mont}"/></clipPath>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#ciel)"/><rect width="${W}" height="${H}" fill="url(#halo)"/>`;
  for (let i=0;i<80;i++){ const x=r()*W, y=r()*H*.55, rr=r()*1.4+.3; s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${rr.toFixed(2)}" fill="#fff" opacity="${(.25+r()*.6).toFixed(2)}"/>`; }
  s += `<circle cx="170" cy="92" r="58" fill="url(#lune)"/><circle cx="170" cy="92" r="27" fill="#f4efff"/>
        <circle cx="160" cy="84" r="6" fill="#ddd5f5"/><circle cx="181" cy="100" r="4.5" fill="#ddd5f5"/><circle cx="176" cy="79" r="3" fill="#ddd5f5"/>`;
  s += `<path d="M0 430 L110 335 L205 385 L330 262 L455 365 L560 296 L700 385 L840 320 L1000 355 L1000 ${H} L0 ${H} Z" fill="#2c1d7c"/>
        <path d="M330 262 L309 288 L322 283 L331 297 L343 283 L355 291 Z M560 296 L543 316 L554 312 L562 322 L572 311 L581 317 Z M110 335 L94 352 L104 349 L111 358 L120 348 Z M840 320 L822 340 L834 336 L842 346 L853 335 L862 341 Z" fill="#fff" opacity=".6"/>
        <path d="M0 478 L160 414 L300 452 L420 404 L560 456 L1000 424 L1000 ${H} L0 ${H} Z" fill="#20146a"/>
        <ellipse cx="420" cy="392" rx="270" ry="20" fill="#fff" opacity=".05"/><ellipse cx="720" cy="338" rx="210" ry="16" fill="#fff" opacity=".06"/>
        <rect width="${W}" height="${H}" fill="url(#vide)"/>`;
  // la montagne, ses strates, ses éclats de roche
  s += `<path d="${mont}" fill="url(#roche)"/><g clip-path="url(#mclip)">`;
  for (let j=0;j<10;j++){ const x = 30 + j*88, c = j%2 ? "#1c1360" : "#9a8cf0", o = j%2 ? .3 : .12;
    s += `<path d="M${x} ${(ground(x)+24).toFixed(1)} L${x+38} ${(ground(x+38)+20).toFixed(1)} L${x+14} ${(ground(x+14)+100+r()*60).toFixed(1)} Z" fill="${c}" opacity="${o}"/>`; }
  for (let k=1;k<=6;k++){ let d = ""; for (let x=0;x<=EDGE;x+=12){ const y = ground(x) + 24*k + 5*Math.sin(x/45 + k*1.7); d += (x ? " L" : "M") + x + " " + y.toFixed(1); }
    s += `<path d="${d}" fill="none" stroke="#0a0540" stroke-opacity=".22" stroke-width="3"/><path d="${d}" transform="translate(0 4)" fill="none" stroke="#fff" stroke-opacity=".07" stroke-width="2"/>`; }
  s += `<path d="M${EDGE-80} ${gE+30} L${EDGE} ${gE} L${falaise.map(p => p.join(" ")).join(" L")} L${EDGE-40} ${H} L${EDGE-56} ${gE+210} Z" fill="#150d55" opacity=".75"/></g>`;
  // neige
  const hn = x => Math.min(1, (x - 520) / 130) * (13 + 9*Math.abs(Math.sin(x/19)) + 4*Math.sin(x/7.3));
  let hautN = "", basN = [];
  for (let x=520;x<=EDGE;x+=6){ hautN += (x===520 ? "M" : " L") + x + " " + (ground(x)-1).toFixed(1); basN.unshift(`${x} ${(ground(x)+hn(x)).toFixed(1)}`); }
  s += `<path d="${hautN} L${basN.map(p => p.replace(/ (\S+)$/, (m,y) => " " + (+y+4))).join(" L")} Z" fill="#b9b0ec" opacity=".8"/>
        <path d="${hautN} L${basN.join(" L")} Z" fill="#f4f1ff"/>`;
  // touches (0 = départ ; N = bord), posées sur le relief et inclinées avec lui
  for (let i=0;i<=N;i++){
    const p = stepPt(i), danger = i > N-4;
    s += `<g class="cap${danger?" danger":""}" data-i="${i}" transform="translate(${p.gx.toFixed(1)} ${p.gy.toFixed(1)}) rotate(${p.a.toFixed(1)})">
      <rect class="cap-base" x="${(-KW/2).toFixed(1)}" y="-${KH}" width="${KW.toFixed(1)}" height="${KH+3}" rx="4"/>
      <rect class="cap-top" x="${(-KW/2+3).toFixed(1)}" y="-${KH-2}" width="${(KW-6).toFixed(1)}" height="${KH-6}" rx="3"/>
      <text class="cap-l" x="0" y="-${KH-14.5}">${valeurTouche(i)}</text></g>`;
  }
  // panneau de départ, drapeau d'arrivée, bord
  const sx = 70, sy = ground(sx);
  s += `<g transform="translate(${sx} ${sy.toFixed(1)}) rotate(${angDe(sx).toFixed(1)})"><rect x="-3" y="-62" width="6" height="64" fill="#7a4a2c"/><rect x="-38" y="-78" width="76" height="32" rx="4" fill="#c98b4e" stroke="#6b3f24" stroke-width="2"/>
        <text x="0" y="-62" text-anchor="middle" font-family="Barlow Condensed, Arial Narrow, sans-serif" font-weight="800" font-size="16" fill="#3a1f10" letter-spacing="1">DÉPART</text>
        <text x="0" y="-50" text-anchor="middle" font-family="Barlow Condensed, Arial Narrow, sans-serif" font-weight="700" font-size="12" fill="#3a1f10">${cfg.points} PTS</text></g>`;
  s += drapeau(X1 + 34, ground(X1 + 34));
  s += `<g id="souris-zone"></g>`;
  $("#mont").innerHTML = s;
  construireSouris(true);
}
// drapeau Azerty qui flotte au vent : la toile ondule (images clés SVG), le texte suit la vague
function drapeau(fx, fy){
  const FW = 66, FH = 34, haut = fy - 90, A = 4.2, N = 12, IMG = 8;
  const vague = (x, p) => A * (x / FW) * Math.sin(2 * Math.PI * (x / FW) * 1.15 - p);
  const toile = p => {
    let d = "", bas = [];
    for (let i = 0; i <= N; i++){
      const x = FW * i / N, w = vague(x, p);
      d += (i ? " L" : "M") + (fx + x).toFixed(1) + " " + (haut + w).toFixed(1);
      bas.unshift((fx + x - 1.2 * (x / FW)).toFixed(1) + " " + (haut + FH + w * .9).toFixed(1));
    }
    return d + " L" + bas.join(" L") + " Z";
  };
  const ph = [...Array(IMG + 1).keys()].map(k => 2 * Math.PI * k / IMG);
  const anim = !reduce;
  const dTxt = ph.map(p => `0 ${vague(FW / 2, p).toFixed(2)}`).join(";");
  return `<line x1="${fx}" y1="${fy}" x2="${fx}" y2="${haut - 6}" stroke="#fff" stroke-width="3" stroke-linecap="round"/>
    <circle cx="${fx}" cy="${haut - 7}" r="3.6" fill="#f09922"/>
    <path d="${toile(0)}" fill="#ff5252">${anim ? `<animate attributeName="d" dur="1.6s" repeatCount="indefinite" values="${ph.map(toile).join(";")}"/>` : ""}</path>
    <g>${anim ? `<animateTransform attributeName="transform" type="translate" dur="1.6s" repeatCount="indefinite" values="${dTxt}"/>` : ""}
      <text x="${fx + FW / 2}" y="${haut + FH / 2}" text-anchor="middle" dominant-baseline="central" font-family="Barlow Condensed, Arial Narrow, sans-serif" font-weight="800" font-size="14" letter-spacing=".5" fill="#fff">AZERTY</text>
    </g>`;
}
/* ---------- Les souris des joueurs ---------- */
// une souris par joueur inscrit, avec son pseudo au-dessus et une écharpe à sa couleur
const SOURIS = new Map();               // pid -> {g, gr, corps, et, k}
const enScene = () => (G && G.joueurs.length) ? G.joueurs : [{pid: "_", nom: "", perdus: 0, tombe: false}];
const echelle = n => n > 12 ? .66 : n > 6 ? .8 : 1;
const nomCourt = n => n.length > 16 ? n.slice(0, 15) + "…" : n;
const marcheDe = perdus => Math.min(N, perdus / cfg.points * N);
// léger décalage pour que les souris d'un même palier ne se cachent pas toutes
const decal = k => (k % 5) * .4;
function construireSouris(force){
  const zone = $("#souris-zone"); if (!zone) return;
  const js = enScene(), sc = echelle(js.length);
  const cle = js.map(j => j.pid + ":" + j.nom).join("|") + "@" + sc;
  if (!force && zone.dataset.cle === cle){ placerTous(); return; }
  const avant = new Set(SOURIS.keys());
  zone.dataset.cle = cle;
  zone.innerHTML = js.map(j => {
    const c = j.nom ? Liaison.couleur(j.nom) : "";
    return `<g class="joueur${j.nom ? " a-nom" : ""}" data-pid="${esc(j.pid)}"${c ? ` style="--joueur:${c}"` : ""}>
      <g class="grimpeur"><g transform="scale(${sc}) translate(-6 0)"><ellipse cx="4" cy="1" rx="26" ry="4" fill="#000" opacity=".28"/><g class="corps">${souris()}</g></g></g>
      ${j.nom ? `<g class="etiquette"><g class="et-in"><line class="et-tige"/><path class="et-fond" fill="${c}"/><text class="et-txt" x="0" text-anchor="middle" dominant-baseline="central" font-family="Barlow Condensed, Arial Narrow, sans-serif" font-weight="800" font-size="${(19 * Math.max(sc, .8)).toFixed(1)}" fill="${Liaison.encre(c)}">${esc(nomCourt(j.nom))}</text></g></g>` : ""}
    </g>`;
  }).join("");
  SOURIS.clear();
  zone.querySelectorAll(".joueur").forEach((g, k) => {
    const o = {g, gr: g.querySelector(".grimpeur"), corps: g.querySelector(".corps"), et: g.querySelector(".etiquette"), k};
    SOURIS.set(g.dataset.pid, o);
    if (!o.et) return;
    o.sc = sc; o.fs = 19 * Math.max(sc, .8); o.niv = -1;
    const txt = o.et.querySelector(".et-txt");
    let w = 0; try { w = txt.getComputedTextLength(); } catch(e){}
    o.w = (w || txt.textContent.length * o.fs * .48) + o.fs * 1.2;
    niveau(o, 0);
    if (!avant.has(g.dataset.pid) && avant.size){ const e = o.et.querySelector(".et-in"); e.classList.add("pop"); }
  });
  placerTous();
}
// hauteur de l'étiquette : un cran plus haut quand elle chevaucherait celle d'une voisine
function niveau(o, niv){
  if (!o.et || o.niv === niv) return;
  o.niv = niv;
  const sc = o.sc, fs = o.fs, tete = 0, B = tete - 8 - niv * fs * 1.55, T = B - fs * 1.45, L = o.w / 2, r = 7;
  o.et.querySelector(".et-txt").setAttribute("y", ((T + B) / 2).toFixed(1));
  o.et.querySelector(".et-fond").setAttribute("d", `M${-L} ${T + r} Q${-L} ${T} ${-L + r} ${T} L${L - r} ${T} Q${L} ${T} ${L} ${T + r} L${L} ${B - r} Q${L} ${B} ${L - r} ${B} L6 ${B} L0 ${B + 7} L-6 ${B} L${-L + r} ${B} Q${-L} ${B} ${-L} ${B - r} Z`);
  const tige = o.et.querySelector(".et-tige");
  tige.setAttribute("x1", 0); tige.setAttribute("x2", 0); tige.setAttribute("y1", B + 6); tige.setAttribute("y2", tete);
  tige.style.display = niv ? "" : "none";
}
function etager(){
  const vis = [...SOURIS.values()].filter(o => o.et && o.x !== undefined && !o.cache).sort((a, b) => a.x - b.x);
  const pris = [];   // par niveau : bords droits déjà occupés
  vis.forEach(o => {
    let n = 0;
    while ((pris[n] ?? -1e9) > o.x - o.w / 2 - 4) n++;
    pris[n] = o.x + o.w / 2;
    niveau(o, Math.min(n, 4));
  });
}
function placer(o, x, y, rot=0, op=1, ang=0){
  if (!o) return;
  o.gr.setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${ang.toFixed(1)})`);
  o.corps.setAttribute("transform", `rotate(${rot.toFixed(1)} 0 -40)`);
  o.gr.setAttribute("opacity", op);
  // l'étiquette se pose pile au-dessus des oreilles : on suit l'inclinaison de la souris sur la pente
  const a = ang * Math.PI / 180, lx = 0, ly = -86 * (o.sc || 1);
  const ax = x + lx * Math.cos(a) - ly * Math.sin(a), ay = y + lx * Math.sin(a) + ly * Math.cos(a);
  if (o.et){ o.et.setAttribute("transform", `translate(${ax.toFixed(1)} ${ay.toFixed(1)})`); o.et.setAttribute("opacity", op < 1 ? 0 : 1); }
  o.x = ax; o.cache = op < 1;
}
const pos = (perdus, k) => stepPt(Math.min(N, marcheDe(perdus) + decal(k)));
function placerTous(){
  enScene().forEach(j => {
    const o = SOURIS.get(j.pid); if (!o) return;
    if (j.tombe){ placer(o, EDGE + 60, H + 160, 180, 0); return; }
    const p = pos(j.perdus, o.k); placer(o, p.x, p.y, 0, 1, p.a * .8);
  });
  etager();
}
const enLice = () => G.joueurs.filter(j => !j.tombe);
function majJauge(){
  const vivants = enLice(), tete = vivants.slice().sort((a, b) => a.perdus - b.perdus)[0];
  $("#g-pts").textContent = vivants.length;
  $("#g-max").textContent = G.joueurs.length;
  $("#g-tete").innerHTML = tete && G.phase !== "attente" ? `En tête : <b style="color:${Liaison.couleur(tete.nom)}">${esc(tete.nom)}</b> · ${cfg.points - tete.perdus} pts` : "";
  $("#g-pas").textContent = cfg.coef === 1 ? "1 € d'écart = 1 point perdu" : `1 € d'écart = ${cfg.coef} points perdus`;
}
// image suivante : requestAnimationFrame, avec un minuteur de secours si le navigateur
// suspend les animations (onglet réduit, écran en veille) pour que la partie ne se bloque jamais
function imageSuivante(cb){
  let fait = false;
  const go = () => { if (!fait){ fait = true; cb(performance.now()); } };
  requestAnimationFrame(go); setTimeout(go, 60);
}
function tween(ms, fn){
  if (reduce) ms = Math.min(ms, 40);
  return new Promise(res => { const t0 = performance.now();
    (function f(now){ const t = Math.min(1, (now - t0) / ms); fn(t); t < 1 ? imageSuivante(f) : res(); })(t0); });
}
// toutes les souris avancent ensemble, chacune des points qu'elle a perdus ; à 0 point, elle chute
async function animerTour(par){
  const mv = enLice().map(j => {
    const o = SOURIS.get(j.pid), pts = par[j.pid] ? par[j.pid].pts : 0;
    const vers = Math.min(j.perdus + pts, cfg.points);
    return {j, o, vers, tombe: j.perdus + pts >= cfg.points,
      fa: Math.min(N, marcheDe(j.perdus) + decal(o.k)), fb: Math.min(N, marcheDe(vers) + decal(o.k))};
  });
  const dmax = Math.max(0, ...mv.map(m => m.fb - m.fa));
  if (dmax > 0){
    const bougent = mv.filter(m => m.fb > m.fa);
    bougent.forEach(m => m.o.gr.classList.add("marche"));
    let cap = Math.floor(Math.max(...bougent.map(m => m.fa)) + 1e-9);
    await tween(Math.min(4200, Math.max(800, dmax * 340)), t => {
      let tete = 0;
      bougent.forEach(m => { const f = m.fa + (m.fb - m.fa) * t, p = stepPt(f); placer(m.o, p.x, p.y, 0, 1, p.a * .8); tete = Math.max(tete, f); });
      if (Math.floor(tete + 1e-9) > cap){ cap = Math.floor(tete + 1e-9); tic(cap); }
      etager();
    });
    bougent.forEach(m => m.o.gr.classList.remove("marche"));
  }
  mv.forEach(m => m.j.perdus = m.vers);
  etager();
  const chutent = mv.filter(m => m.tombe);
  if (chutent.length){ glissade(900, 70, 1.3); await Promise.all(chutent.map(m => chute(m.o))); chutent.forEach(m => { m.j.tombe = true; m.j.tour = G.idx; }); }
  majJauge();
}
async function chute(o){
  const a = stepPt(N);
  o.gr.classList.add("marche");
  await tween(420, t => placer(o, a.x + (EDGE + 16 - a.x)*t, a.y, 0, 1, a.a * .8 * (1 - t)));
  o.gr.classList.remove("marche");
  await pause(300);
  o.gr.classList.add("chute");
  const dx = 50 + Math.random() * 50;
  await tween(1300, t => placer(o, EDGE + 16 + dx*t, a.y - Math.sin(Math.min(t*3,1)*Math.PI)*18 + (H + 180 - a.y)*t*t, 200*t, 1 - t*.5));
  o.gr.classList.remove("chute");
}

/* ---------- Partie à plusieurs ---------- */
// attente (salle d'attente) → saisie (chrono, chacun propose un prix) → anim → revele → … → fin (classement)
const nouvelId = () => Math.random().toString(36).slice(2, 10);
let chrono = null, selPid = null, saisieMan = "";
function nouvelleSalle(garder){
  cacherResultat(); clearInterval(chrono);
  const joueurs = garder && G ? G.joueurs.map(j => ({pid: j.pid, nom: j.nom, perdus: 0, tombe: false})) : [];
  G = {id: nouvelId(), phase: "attente", tirage: [], idx: 0, joueurs, res: [], rep: {}, fin: 0, exclus: garder && G ? G.exclus || [] : []};
  selPid = null; saisieMan = "";
  construireSouris(); rendre();
  message(joueurs.length ? "Les joueurs sont prêts : lancez la partie quand vous voulez." : "Scannez le QR code pour rejoindre la partie !");
}
function inscrire(pid, nom, explicite){
  if (G.phase !== "attente") return;
  if (G.exclus.includes(pid)){ if (!explicite) return; G.exclus = G.exclus.filter(p => p !== pid); }
  const j = G.joueurs.find(j => j.pid === pid);
  if (j){ if (j.nom === nom) return; j.nom = nom; }
  else { if (G.joueurs.length >= 40) return; G.joueurs.push({pid, nom, perdus: 0, tombe: false}); bip(880, .08, "triangle", .1); bip(1175, .12, "triangle", .1, .08); }
  construireSouris(); rendre();
  message(`${nom} rejoint la partie !`, "bon");
}
function retirer(pid){
  if (G.phase !== "attente") return;
  G.joueurs = G.joueurs.filter(j => j.pid !== pid);
  if (!pid.startsWith("m-")) G.exclus.push(pid);
  construireSouris(); rendre();
}
function lancer(){
  if (G.phase !== "attente") return;
  if (!G.joueurs.length){ message("Aucun joueur inscrit pour l'instant.", "mal"); return; }
  const pool = cfg.items.filter(i => String(i.nom||"").trim() && +i.prix > 0);
  if (pool.length < 3){ message("Ajoutez au moins 3 objets avec un prix dans les réglages.", "mal"); return; }
  // les objets passent dans l'ordre de la liste ; la partie suivante reprend à la suite. On joue jusqu'à ce qu'il ne reste qu'un joueur.
  let debut = 0; try { debut = +localStorage.getItem("azertyrolien-suite") || 0; } catch(e){}
  G.suite = debut >= pool.length ? 0 : debut;
  G.depart = G.joueurs.length;
  G.tirage = [prochainObjet()];
  G.idx = 0; G.res = [];
  G.joueurs.forEach(j => { j.perdus = 0; j.tombe = false; });
  $("#sheet-man").hidden = true;
  fanfareCourte();
  ouvrirSaisie();
}
// objet suivant de la liste (on reboucle au début si la liste est épuisée)
function prochainObjet(){
  const pool = cfg.items.filter(i => String(i.nom||"").trim() && +i.prix > 0);
  const o = pool[(G.suite || 0) % pool.length];
  G.suite = ((G.suite || 0) + 1) % pool.length;
  try { localStorage.setItem("azertyrolien-suite", String(G.suite)); } catch(e){}
  return {nom: o.nom, detail: o.detail || "", prix: Math.round(+o.prix)};
}
// fin de partie : il ne reste qu'un joueur (ou plus personne) ; seul, on joue 3 objets ; plafond de sécurité à 40 objets
const partieFinie = vivants => vivants === 0 || (G.depart >= 2 ? vivants <= 1 : G.idx >= 2) || G.idx >= 39;
function fanfareCourte(){ [523, 659, 784].forEach((f, i) => bip(f, .16, "triangle", .11, i * .11)); }
function ouvrirSaisie(){
  G.phase = "saisie"; G.rep = {}; G.fin = Date.now() + cfg.temps * 1000;
  selPid = null; saisieMan = "";
  rendre(); placerTous();
  message(`À vos téléphones : ${cfg.temps} secondes pour donner votre prix !`);
  bip(660, .12); bip(880, .14, "square", .07, .15);
  minuteur();
}
let dernierBip = 0;
function minuteur(){
  clearInterval(chrono);
  chrono = setInterval(() => {
    if (G.phase !== "saisie"){ clearInterval(chrono); return; }
    const reste = Math.max(0, G.fin - Date.now()), s = Math.ceil(reste / 1000);
    majChrono();
    if (s <= 5 && s > 0 && s !== dernierBip){ dernierBip = s; bip(s === 1 ? 990 : 740, .08, "square", .06); }
    if (reste <= 0) reveler();
  }, 200);
}
function majChrono(){
  const reste = Math.max(0, G.fin - Date.now()), s = Math.ceil(reste / 1000);
  $("#chrono-txt").textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  $("#chrono").classList.toggle("urgent", s <= 10);
  if (G.phase === "saisie") majMusique();
  $("#chrono-bar").querySelector("i").style.width = Math.min(100, reste / (cfg.temps * 1000) * 100) + "%";
  $("#chrono-bar").classList.toggle("danger", s <= 10);
}
function enregistrerPrix(pid, prix){
  if (G.phase !== "saisie" || Date.now() > G.fin + 500) return false;
  const j = G.joueurs.find(j => j.pid === pid);
  if (!j || j.tombe || !Number.isFinite(prix) || prix < 0 || prix > 9999) return false;
  const neuf = !(pid in G.rep);
  G.rep[pid] = prix;
  if (neuf) bip(1320, .06, "triangle", .08);
  // tout le monde a répondu : il ne reste que 5 secondes pour changer d'avis
  if (enLice().every(j => j.pid in G.rep)) G.fin = Math.min(G.fin, Date.now() + 5000);
  rendre();
  return true;
}
async function compter(prix){
  const el = $("#reel");
  let last = -1;
  await tween(1100, t => { const e = 1 - Math.pow(1 - t, 3), v = Math.round(prix * e);
    if (v !== last){ el.textContent = v + " €"; last = v; } });
  el.textContent = prix + " €";
}
async function reveler(){
  if (G.phase !== "saisie") return;
  clearInterval(chrono);
  const it = G.tirage[G.idx];
  G.phase = "anim"; rendre();
  message("Temps écoulé ! Le juste prix est…");
  bip(660, .12); bip(880, .14, "square", .07, .15);
  await pause(700);
  $("#reel-box").classList.remove("vide");
  await compter(it.prix);
  const par = {};
  enLice().forEach(j => {
    const essai = j.pid in G.rep ? G.rep[j.pid] : null;
    const ecart = essai === null ? it.prix : Math.abs(essai - it.prix);   // sans réponse : comme s'il avait dit 0 €
    par[j.pid] = {essai, ecart, pts: ecart * cfg.coef};
  });
  G.res[G.idx] = {prix: it.prix, par};
  rendre();
  const tri = Object.entries(par).sort((a, b) => a[1].ecart - b[1].ecart);
  const exacts = tri.filter(([, r]) => r.ecart === 0).map(([p]) => nomDe(p));
  if (exacts.length){ message(`${it.prix} € ! Prix exact pour ${exacts.join(", ")} !`, "bon"); bip(1047, .3, "triangle", .12); }
  else if (tri.length) message(`${it.prix} € ! Le plus proche : ${nomDe(tri[0][0])} (${tri[0][1].ecart} € d'écart).`);
  await pause(1200);
  await animerTour(par);
  rendre();
  const vivants = enLice().length;
  if (partieFinie(vivants)){ G.phase = "fin"; rendre(); resultat(); return; }
  G.phase = "revele"; rendre();
  const tombes = Object.keys(par).filter(p => G.joueurs.find(j => j.pid === p).tombe).map(nomDe);
  message(tombes.length ? `${tombes.join(", ")} ${tombes.length > 1 ? "tombent" : "tombe"} de la falaise ! ${vivants} joueur${vivants > 1 ? "s" : ""} encore en lice.` : `${vivants} joueur${vivants > 1 ? "s" : ""} encore en lice.`, tombes.length ? "mal" : "");
}
const nomDe = pid => { const j = G.joueurs.find(j => j.pid === pid); return j ? j.nom : "?"; };
function suivant(){
  if (G.phase !== "revele") return;
  G.idx++;
  if (!G.tirage[G.idx]) G.tirage.push(prochainObjet());
  ouvrirSaisie();
}
function classement(){
  return G.joueurs.map(j => ({...j, reste: j.tombe ? 0 : cfg.points - j.perdus}))
    .sort((a, b) => b.reste - a.reste || (b.tour ?? 0) - (a.tour ?? 0) || a.nom.localeCompare(b.nom));
}
function resultat(silencieux){
  const box = $("#result"); box.hidden = false;
  const cl = classement();
  let rang = 0, prec = null;
  $("#r-titre").textContent = cl.some(j => j.reste > 0) ? "Classement" : "Tout le monde est tombé !";
  $("#r-sur").textContent = "Azertyrolien · " + (cfg.lot || "fin de la partie");
  $("#r-classement").classList.toggle("deux-col", cl.length > 8);
  $("#r-classement").innerHTML = cl.map((j, i) => {
    const cle = j.reste + "-" + (j.reste ? 0 : j.tour ?? 0);
    if (cle !== prec){ rang = i + 1; prec = cle; }
    const c = Liaison.couleur(j.nom);
    return `<li class="${rang <= 3 && j.reste > 0 ? "podium p" + rang : ""}${j.reste ? "" : " zero"}" style="--joueur:${c}">
      <span class="rang">${rang}</span><span class="pt" style="background:${c}"></span><b>${esc(j.nom)}</b>
      <span class="score">${j.reste ? j.reste + " pts" : "tombé"}</span></li>`;
  }).join("");
  const vivants = cl.filter(j => j.reste > 0);
  message(G.depart >= 2 && vivants.length === 1 ? `${vivants[0].nom} est le dernier en lice : bravo !` : "Partie terminée ! Bravo à tous.", "bon");
  if (!silencieux){ if (cl.some(j => j.reste > 0)){ fanfare(); confettis(); } else { bip(196, .4, "sawtooth", .08, .1); bip(147, .7, "sawtooth", .08, .5); } }
}
function cacherResultat(){ $("#result").hidden = true; }
function confettis(){
  if (reduce) return;
  const c = $("#confettis"), ctx = c.getContext("2d"), r = c.getBoundingClientRect(), dpr = devicePixelRatio || 1;
  c.width = r.width * dpr; c.height = r.height * dpr; ctx.scale(dpr, dpr);
  const cols = ["#f09922", "#ff5252", "#ffffff", "#b2b2c5"];
  const ps = Array.from({length:180}, () => ({x: r.width/2 + (Math.random()-.5)*160, y: r.height*.3, vx:(Math.random()-.5)*12, vy:-Math.random()*11-3, s:Math.random()*7+4, c:cols[Math.random()*4|0], a:Math.random()*6}));
  const t0 = performance.now();
  (function f(now){
    const t = now - t0; ctx.clearRect(0, 0, r.width, r.height);
    ps.forEach(p => { p.vy += .22; p.x += p.vx; p.y += p.vy; p.a += .15; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.fillStyle = p.c; ctx.fillRect(-p.s/2, -p.s/4, p.s, p.s/2); ctx.restore(); });
    if (t < 3600 && !$("#result").hidden) requestAnimationFrame(f); else ctx.clearRect(0, 0, r.width, r.height);
  })(t0);
}

/* ---------- Affichage du pupitre ---------- */
function message(t, ton=""){ const m = $("#msg"); m.textContent = t; m.className = "msg " + ton; diffuser(); }
function rendre(){
  const ph = G.phase, n = G.joueurs.length;
  // gauche : salle d'attente ou objet en cours
  if (ph === "attente"){
    $("#lots").innerHTML = `<div class="etapes"><i class="actif"></i><span>Salle d'attente</span></div>
      <h2>Rejoignez la partie !</h2>
      <p class="detail">Scannez le QR code avec votre téléphone, choisissez un pseudo et attendez le lancement.</p>
      <p class="question">${n ? `${n} joueur${n > 1 ? "s" : ""} inscrit${n > 1 ? "s" : ""}` : "En attente des joueurs…"}</p>`;
  } else {
    const cur = Math.min(G.idx, G.tirage.length - 1), it = G.tirage[cur];
    const nbV = enLice().length, multi = G.depart >= 2;
    const pts = multi ? "" : [0, 1, 2].map(i => `<i class="${i < cur ? "fait" : i === cur ? "actif" : ""}"></i>`).join("");
    $("#lots").innerHTML = `<div class="etapes">${pts}<span>Objet ${cur+1}${multi ? ` · ${nbV} joueur${nbV > 1 ? "s" : ""} en lice` : " sur 3"}</span></div>
      <h2>${esc(it.nom)}</h2>${it.detail ? `<p class="detail">${esc(it.detail)}</p>` : ""}
      <p class="question">Quel est son juste prix ?</p>`;
  }
  // droite : QR code, chrono ou juste prix
  $("#d-qr").hidden = ph !== "attente";
  $("#d-chrono").hidden = ph !== "saisie";
  $("#d-prix").hidden = !["anim", "revele", "fin"].includes(ph);
  const vivants = G.phase === "attente" ? [] : enLice();
  if (ph === "saisie"){
    const nb = vivants.filter(j => j.pid in G.rep).length;
    $("#reponses").textContent = `${nb} / ${vivants.length} réponse${vivants.length > 1 ? "s" : ""}`;
    majChrono();
  }
  const res = G.res[G.idx];
  if (ph !== "anim"){
    $("#reel-box").classList.toggle("vide", !res);
    $("#reel").textContent = res ? res.prix + " €" : "? €";
  }
  if (res){
    const tri = Object.entries(res.par).sort((a, b) => a[1].ecart - b[1].ecart);
    $("#meilleur").innerHTML = tri.length ? `Le plus proche : <b>${esc(nomDe(tri[0][0]))}</b> · ${tri[0][1].essai === null ? "sans réponse" : tri[0][1].essai + " €"}` : "";
  } else $("#meilleur").textContent = "";
  // tableau des joueurs
  rendreTableau();
  $("#b-lancer").hidden = ph !== "attente";
  $("#b-lancer").disabled = !n;
  $("#b-reveler").hidden = ph !== "saisie";
  $("#b-fin").hidden = ph === "attente" || ph === "fin";
  $("#b-suivant").hidden = ph !== "revele";
  // saisie manuelle
  const sel = G.joueurs.find(j => j.pid === selPid);
  $("#sel-nom").textContent = sel && ph === "saisie" ? sel.nom : (ph === "saisie" ? "clique sur un joueur" : "pendant le chrono");
  $("#saisie").textContent = (saisieMan || "---") + " €";
  document.querySelectorAll("#pad .key").forEach(k => k.disabled = !(ph === "saisie" && sel && !sel.tombe));
  $("#m-ajout").disabled = $("#b-ajout").disabled = ph !== "attente";
  majJauge();
  majMusique();
  sauverPartie();
  diffuser();
  ajusterScene();
}
// ambiance : calme en salle d'attente et au classement, rythmée pendant la partie, plus discrète pendant les révélations
function majMusique(){
  const ph = G.phase, tendu = ph === "saisie" && Math.ceil(Math.max(0, G.fin - Date.now()) / 1000) <= 10;
  if (ph === "attente") Ambiance.jouer("attente", 1);
  else if (ph === "saisie") Ambiance.jouer("partie", 1, tendu);
  else if (ph === "anim" || ph === "revele") Ambiance.jouer("partie", .3);
  else Ambiance.jouer("attente", .6);
}
function rendreTableau(){
  const ph = G.phase, res = G.res[G.idx];
  let js = G.joueurs.slice();
  if ((ph === "revele" || ph === "fin") && res) js.sort((a, b) => (a.tombe - b.tombe) || ((res.par[a.pid] || {ecart: 1e9}).ecart - (res.par[b.pid] || {ecart: 1e9}).ecart));
  else if (ph !== "attente") js.sort((a, b) => (a.tombe - b.tombe) || (a.perdus - b.perdus));
  $("#tableau").hidden = !js.length;
  $("#tableau").classList.toggle("serre", js.length > 10);
  $("#tableau").innerHTML = js.map(j => {
    const c = Liaison.couleur(j.nom), r = res && res.par[j.pid];
    let etat = "", cls = j.tombe ? " tombe" : "";
    if (ph === "attente") etat = "prêt";
    else if (ph === "saisie"){
      if (j.tombe) etat = "tombé";
      else { const ok = j.pid in G.rep; etat = ok ? "✓ a répondu" : "réfléchit…"; cls = ok ? " ok" : " attend"; }
    } else if (r) etat = r.essai === null ? `pas de réponse · −${r.pts}` : r.ecart === 0 ? `${r.essai} € · exact !` : `${r.essai} € · −${r.pts}`;
    else if (j.tombe) etat = "tombé";
    const pts = j.tombe ? 0 : cfg.points - j.perdus;
    const choisi = selPid === j.pid ? " choisi" : "";
    return `<div class="puce${cls}${choisi}" data-pid="${esc(j.pid)}" style="--joueur:${c}">
      <span class="pt"></span><span class="nom">${esc(j.nom)}</span><span class="etat">${esc(etat)}</span>
      ${ph === "attente" ? "" : `<b class="pts">${pts}</b>`}
      ${ph === "attente" && manuel ? `<button class="x" data-retirer="${esc(j.pid)}" aria-label="Retirer ${esc(j.nom)}">✕</button>` : ""}</div>`;
  }).join("");
}
// la scène prend toute la hauteur disponible : tout tient sur l'écran sans défiler
function ajusterScene(){
  const svg = $("#mont");
  if (innerWidth < 900){ svg.style.height = ""; return; }
  imageSuivante(() => {
    const cur = svg.getBoundingClientRect().height;
    const surplus = document.documentElement.scrollHeight - innerHeight;
    const larg = svg.parentElement.clientWidth * .56;
    const h = Math.max(innerHeight * .28, Math.min(cur - surplus, larg, innerHeight * .62));
    if (Math.abs(h - cur) > 2) svg.style.height = h.toFixed(0) + "px";
  });
}
addEventListener("resize", () => { $("#mont").style.height = ""; ajusterScene(); });
function sauverPartie(){ try { localStorage.setItem("azertyrolien-partie", JSON.stringify(G)); } catch(e){} }

/* ---------- Saisie manuelle (animateur) ---------- */
function taper(k){
  if (G.phase !== "saisie" || !selPid) return;
  if (k === "del"){ saisieMan = saisieMan.slice(0, -1); bip(220, .05); }
  else if (k === "ok"){
    if (!saisieMan) return;
    if (enregistrerPrix(selPid, +saisieMan)){ message(`Prix enregistré pour ${nomDe(selPid)}.`, "bon"); saisieMan = ""; selPid = null; }
  }
  else if (saisieMan.length < 4){ saisieMan = (saisieMan + k).replace(/^0+(?=\d)/, ""); bip(700 + (+k)*30, .05); }
  rendre();
}
$("#tableau").addEventListener("click", e => {
  const x = e.target.closest("[data-retirer]");
  if (x){ retirer(x.dataset.retirer); return; }
  const p = e.target.closest(".puce");
  if (p && manuel && G.phase === "saisie"){ selPid = p.dataset.pid; saisieMan = ""; rendre(); }
});
$("#b-ajout").addEventListener("click", () => {
  const v = propre($("#m-ajout").value).slice(0, 16);
  if (v.length < 2) return;
  inscrire("m-" + nouvelId(), v, true); $("#m-ajout").value = ""; $("#m-ajout").focus();
});
$("#m-ajout").addEventListener("keydown", e => { if (e.key === "Enter"){ e.preventDefault(); $("#b-ajout").click(); } });

/* ---------- Réglages ---------- */
let brouillon = null;
function ouvrirReglages(){
  brouillon = clone(cfg);
  $("#s-points").value = brouillon.points; $("#s-coef").value = brouillon.coef; $("#s-temps").value = brouillon.temps; $("#s-lot").value = brouillon.lot;
  rendreItems(); $("#sheet").hidden = false; $("#s-points").focus();
}
function rendreItems(){
  $("#s-items").innerHTML = `<div class="item item-h"><span>Objet</span><span class="d">Précision</span><span>Prix €</span><span></span></div>` +
    brouillon.items.map((it, i) => `<div class="item" data-i="${i}">
      <input id="it-n-${i}" data-f="nom" value="${esc(it.nom)}" placeholder="Nom de l'objet" aria-label="Objet ${i+1}">
      <input id="it-d-${i}" class="d" data-f="detail" value="${esc(it.detail)}" placeholder="Précision" aria-label="Précision ${i+1}">
      <input id="it-p-${i}" data-f="prix" type="number" min="1" step="1" value="${esc(it.prix)}" aria-label="Prix ${i+1}">
      <button class="x" data-del="${i}" aria-label="Supprimer l'objet ${i+1}">✕</button></div>`).join("");
}
function lireItems(){
  document.querySelectorAll("#s-items .item[data-i]").forEach(row => {
    const it = brouillon.items[+row.dataset.i];
    row.querySelectorAll("input").forEach(inp => it[inp.dataset.f] = inp.dataset.f === "prix" ? Math.round(+inp.value || 0) : inp.value);
  });
}
function fermerReglages(){ $("#sheet").hidden = true; brouillon = null; }
function enregistrer(){
  lireItems();
  brouillon.points = Math.min(10000, Math.max(20, Math.round(+$("#s-points").value || 200)));
  brouillon.coef = Math.min(20, Math.max(1, Math.round(+$("#s-coef").value || 1)));
  brouillon.temps = Math.min(300, Math.max(10, Math.round(+$("#s-temps").value || 60)));
  brouillon.lot = $("#s-lot").value.trim() || DEF.lot;
  brouillon.items = brouillon.items.filter(i => String(i.nom).trim() || +i.prix > 0);
  cfg = brouillon; const ok = sauver(); fermerReglages();
  try { localStorage.setItem("azertyrolien-suite", "0"); } catch(e){}
  dessiner(); nouvelleSalle(true);
  if (!ok) message("Réglages appliqués, mais ce navigateur ne peut pas les garder après rechargement.", "mal");
}

/* ---------- Évènements ---------- */
$("#pad").addEventListener("click", e => { const k = e.target.closest(".key"); if (k) taper(k.dataset.k); });
$("#b-lancer").addEventListener("click", lancer);
$("#b-reveler").addEventListener("click", () => { if (G.phase === "saisie") G.fin = Date.now(); });
$("#b-suivant").addEventListener("click", suivant);
let confFin = 0;
$("#b-fin").addEventListener("click", e => {
  const b = e.currentTarget;
  if (G.phase === "anim" || G.phase === "attente" || G.phase === "fin") return;
  if (Date.now() - confFin > 3000){ confFin = Date.now(); b.textContent = "Confirmer la fin ?"; setTimeout(() => { b.textContent = "Fin de partie"; confFin = 0; }, 3000); return; }
  confFin = 0; b.textContent = "Fin de partie";
  clearInterval(chrono); G.phase = "fin"; rendre(); resultat();
});
let confirmer = 0;
$("#b-nouvelle").addEventListener("click", e => {
  if (G.phase === "anim") return;
  if (Date.now() - confirmer > 3000){ confirmer = Date.now(); e.currentTarget.textContent = "Confirmer ? (vide la liste)"; setTimeout(() => $("#b-nouvelle").textContent = "Nouvelle salle d'attente", 3000); return; }
  confirmer = 0; e.currentTarget.textContent = "Nouvelle salle d'attente"; nouvelleSalle(false);
});
$("#b-rejouer").addEventListener("click", () => { nouvelleSalle(true); lancer(); });
$("#b-salle").addEventListener("click", () => nouvelleSalle(false));
function majBoutonMusique(){ const b = $("#b-musique"), on = Ambiance.est(); b.setAttribute("aria-pressed", on); b.textContent = on ? "Musique activée" : "Musique coupée"; }
$("#b-musique").addEventListener("click", () => { Ambiance.activer(!Ambiance.est()); majBoutonMusique(); majMusique(); });
majBoutonMusique();
$("#b-son").addEventListener("click", e => { son = !son; e.currentTarget.setAttribute("aria-pressed", son); e.currentTarget.textContent = son ? "Son activé" : "Son coupé"; });
$("#b-reglages").addEventListener("click", () => { if (G.phase !== "anim") ouvrirReglages(); });
$("#s-annuler").addEventListener("click", fermerReglages);
$("#s-ok").addEventListener("click", enregistrer);
$("#s-add").addEventListener("click", () => { lireItems(); brouillon.items.push({nom:"", detail:"", prix:""}); rendreItems(); $(`#it-n-${brouillon.items.length-1}`).focus(); });
$("#s-exemples").addEventListener("click", () => { brouillon.items = clone(EXEMPLES); rendreItems(); });
$("#s-items").addEventListener("click", e => { const b = e.target.closest("[data-del]"); if (!b) return; lireItems(); brouillon.items.splice(+b.dataset.del, 1); rendreItems(); });
document.addEventListener("keydown", e => {
  if (!$("#sheet").hidden){ if (e.key === "Escape") fermerReglages(); return; }
  if (!$("#sheet-man").hidden) return;
  if (e.target.matches("input")) return;
  if (/^[0-9]$/.test(e.key)){ if (manuel) taper(e.key); }
  else if (e.key === "Backspace"){ e.preventDefault(); if (manuel) taper("del"); }
  else if (e.key === "Enter"){ e.preventDefault(); if (G.phase === "revele") suivant(); else if (manuel) taper("ok"); }
});

/* ---------- Liaison avec les manettes (voir js/liaison.js) ---------- */
const SALLE = Liaison.salleEcran();
const LIEN_MANETTE = new URL("manette.html?salle=" + SALLE + (Liaison.brokerPerso() ? "&broker=" + encodeURIComponent(Liaison.brokerPerso()) : ""), location.href).href;
let lien = null, dernierEtat = "";
const manettes = new Map();     // cid -> dernier signe de vie
const vus = new Set();          // identifiants de messages déjà traités
const tourCourant = () => (G && G.id ? G.id : "x") + "-" + (G ? G.idx : 0);
function etatCourant(){
  const it = G.tirage[G.idx], res = G.res[G.idx];
  return {
    tour: tourCourant(), phase: G.phase, idx: G.idx, total: G.depart >= 2 ? 0 : 3,
    objet: it && G.phase !== "attente" ? {nom: String(it.nom).slice(0, 80), detail: String(it.detail || "").slice(0, 80)} : null,
    max: cfg.points, duree: cfg.temps,
    restant: G.phase === "saisie" ? Math.max(0, G.fin - Date.now()) : 0,
    joueurs: G.joueurs.map(j => ({pid: j.pid, nom: j.nom, reste: j.tombe ? 0 : cfg.points - j.perdus, tombe: !!j.tombe, ok: G.phase === "saisie" && j.pid in G.rep})),
    resultat: res && G.phase !== "anim" ? {prix: res.prix, par: Object.fromEntries(Object.entries(res.par).map(([p, r]) => [p, {essai: r.essai, pts: r.pts}]))} : null
  };
}
function diffuser(force){
  if (!lien || !G) return;
  const e = etatCourant(), cle = JSON.stringify({...e, restant: 0});
  if (!force && cle === dernierEtat) return;
  dernierEtat = cle;
  lien.publierEtat(e);
}
const propre = v => String(v ?? "").replace(/[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁠-⁯]/g, "").replace(/\s+/g, " ").trim().slice(0, 24);
const pidOk = v => typeof v === "string" && /^[a-z0-9-]{4,24}$/.test(v) ? v : "";
function recevoir(m){
  if (!m || typeof m !== "object" || typeof m.cid !== "string") return;
  manettes.set(m.cid, Date.now());
  if (m.id){ if (vus.has(m.id)) { majLiaison(); return; } vus.add(m.id); }
  const pid = pidOk(m.pid), nom = propre(m.nom).slice(0, 16);
  if (pid && nom.length >= 2 && (m.type === "joueur" || m.type === "bonjour")) inscrire(pid, nom, m.type === "joueur");
  if (pid && m.type === "prix" && m.tour === tourCourant()) enregistrerPrix(pid, Math.round(+m.prix));
  majLiaison();
}
function majLiaison(){
  const now = Date.now();
  for (const [k, t] of manettes) if (now - t > 15000) manettes.delete(k);
  const n = manettes.size;
  $("#b-manette").classList.toggle("lie", n > 0);
  $("#b-manette-txt").textContent = "Participer";
  let txt = n ? (n > 1 ? `${n} téléphones connectés.` : "1 téléphone connecté.") : "Aucun téléphone connecté.";
  if (!lien) txt = "Liaison indisponible : vérifiez la connexion internet de cet écran.";
  else if (!lien.connecte()) txt = "Connexion au serveur de liaison…";
  $("#etat-lien").textContent = txt;
}
let manuel = false;
try { manuel = localStorage.getItem("azertyrolien-manuel") === "1"; } catch(e){}
function majManuel(){
  $("#manuel").hidden = !manuel;
  const b = $("#b-manuel");
  b.setAttribute("aria-pressed", manuel);
  b.textContent = manuel ? "Masquer la saisie manuelle" : "Saisie manuelle";
  $("#tableau").classList.toggle("manuel-actif", manuel);
}
$("#b-manuel").addEventListener("click", () => {
  manuel = !manuel;
  try { localStorage.setItem("azertyrolien-manuel", manuel ? "1" : "0"); } catch(e){}
  majManuel(); if (!manuel){ selPid = null; saisieMan = ""; } rendre();
});
majManuel();
function faireQR(el, taille){
  if (!window.QRCode){ el.textContent = "QR code indisponible : utilisez le lien."; return false; }
  try { new QRCode(el, {text: LIEN_MANETTE, width: taille, height: taille, colorDark: "#000000", colorLight: "#ffffff", correctLevel: QRCode.CorrectLevel.L}); return true; }
  catch(e){ el.textContent = "QR code indisponible"; return false; }
}
$("#code-salle-mini").textContent = SALLE;
faireQR($("#qr-salle"), 480);
let qrFait = false;
function ouvrirManette(){
  $("#lien-man").value = LIEN_MANETTE;
  $("#code-salle").textContent = SALLE;
  if (!qrFait) qrFait = faireQR($("#qr"), 640);
  majLiaison();
  $("#sheet-man").hidden = false; $("#sm-fermer").focus();
}
$("#b-manette").addEventListener("click", ouvrirManette);
$("#b-agrandir").addEventListener("click", ouvrirManette);
$("#qr-salle").addEventListener("click", ouvrirManette);
$("#qr-salle").style.cursor = "zoom-in";
$("#sm-fermer").addEventListener("click", () => $("#sheet-man").hidden = true);
$("#b-code").addEventListener("click", () => { Liaison.nouvelleSalle(); location.reload(); });
$("#b-copier").addEventListener("click", () => {
  const inp = $("#lien-man");
  const ok = () => { $("#b-copier").textContent = "Copié"; setTimeout(() => $("#b-copier").textContent = "Copier", 1600); };
  try { navigator.clipboard.writeText(LIEN_MANETTE).then(ok, () => inp.select()); } catch(e){ inp.select(); }
});
document.addEventListener("keydown", e => { if (e.key === "Escape" && !$("#sheet-man").hidden) $("#sheet-man").hidden = true; });
Liaison.connecter({
  salle: SALLE, role: "ecran",
  onMessage: recevoir,
  onConnexion: () => { diffuser(true); majLiaison(); }
}).then(l => { lien = l; diffuser(true); majLiaison(); }).catch(() => { lien = null; majLiaison(); });
// signe de vie de l'écran (plus fréquent pendant le chrono, pour que les téléphones restent synchronisés)
setInterval(() => { diffuser(true); majLiaison(); }, 8000);
setInterval(() => { if (G && G.phase === "saisie") diffuser(true); }, 3000);

/* ---------- Démarrage ---------- */
// une partie en cours est reprise après un rechargement de la page
function start(){
  let d = null;
  try { d = JSON.parse(localStorage.getItem("azertyrolien-partie") || "null"); } catch(e){}
  if (d && Array.isArray(d.joueurs) && typeof d.phase === "string" && (d.phase === "attente" || (Array.isArray(d.tirage) && d.tirage.length))){
    G = Object.assign({rep: {}, res: [], exclus: [], fin: 0}, d);
    dessiner();
    if (G.phase === "anim" || G.phase === "saisie"){ delete G.res[G.idx]; ouvrirSaisie(); }
    else { rendre(); placerTous(); if (G.phase === "fin") resultat(true); else message(G.phase === "revele" ? "Passez à l'objet suivant." : "Scannez le QR code pour rejoindre la partie !"); }
  } else { G = {id: nouvelId(), phase: "attente", tirage: [], idx: 0, joueurs: [], res: [], rep: {}, fin: 0, exclus: []}; dessiner(); nouvelleSalle(false); }
}
start();
})();
