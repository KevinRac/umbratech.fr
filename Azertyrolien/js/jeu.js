/* Azertyrolien — grand écran : la montagne, la souris, le pupitre de l'animateur. */
(() => {
const W = 1000, H = 560, X0 = 150, X1 = 800, EDGE = X1 + 56, N = 20, KH = 21;
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const EXEMPLES = [
  {nom:"Clé USB 3.2", detail:"128 Go", prix:14},
  {nom:"Pâte thermique", detail:"Seringue de 4 g", prix:9},
  {nom:"Câble réseau RJ45", detail:"Cat 6, 5 mètres", prix:8},
  {nom:"Souris gaming sans fil", detail:"Capteur 26 000 DPI", prix:59},
  {nom:"Tapis de souris XXL", detail:"90 × 40 cm", prix:22},
  {nom:"Ventilateur de boîtier", detail:"120 mm, éclairage RGB", prix:15},
  {nom:"SSD NVMe M.2", detail:"1 To, PCIe 4.0", prix:75},
  {nom:"Clavier mécanique AZERTY", detail:"Switches linéaires", prix:69},
  {nom:"Casque gaming filaire", detail:"Micro détachable", prix:49},
  {nom:"Webcam Full HD", detail:"1080p, 30 images/s", prix:35},
  {nom:"Kit mémoire DDR5", detail:"2 × 8 Go", prix:89},
  {nom:"Hub USB-C", detail:"7 ports", prix:29}
];
const DEF = {points:200, coef:1, lot:"Des points pour le classement général du tournoi", items:EXEMPLES};
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const clone = o => JSON.parse(JSON.stringify(o));
const pause = ms => new Promise(r => setTimeout(r, reduce ? Math.min(ms, 150) : ms));

function charger(){
  try { const s = JSON.parse(localStorage.getItem("azertyrolien-cfg") || "null");
    if (s && Array.isArray(s.items)) return Object.assign(clone(DEF), {points:s.points, coef:s.coef, lot:/goodies/i.test(s.lot||"") ? DEF.lot : s.lot, items:s.items}); } catch(e){}
  return clone(DEF);
}
function sauver(){ try { localStorage.setItem("azertyrolien-cfg", JSON.stringify(cfg)); return true; } catch(e){ return false; } }
let cfg = charger();
if (!(cfg.points > 0)) cfg.points = 200;
if (!(cfg.coef > 0)) cfg.coef = 1;
let G = null, grimpeur, corps;

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
    <defs><filter id="m-doux" filterUnits="userSpaceOnUse" x="-110" y="-200" width="190" height="230"><feGaussianBlur stdDeviation=".9" result="f"/><feDropShadow in="f" dx="0" dy="0" stdDeviation="3.2" flood-color="#ff7aa0" flood-opacity=".5"/></filter></defs>
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
  s += `<g id="grimpeur"><g transform="translate(-6 0)"><ellipse cx="4" cy="1" rx="26" ry="4" fill="#000" opacity=".28"/><g id="corps">${souris()}</g></g></g>`;
  $("#mont").innerHTML = s;
  grimpeur = $("#grimpeur"); corps = $("#corps");
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
function placer(x, y, rot=0, op=1, ang=0){
  grimpeur.setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${ang.toFixed(1)})`);
  corps.setAttribute("transform", `rotate(${rot.toFixed(1)} 0 -40)`);
  grimpeur.setAttribute("opacity", op);
}
const marcheDe = perdus => Math.min(N, perdus / cfg.points * N);
function placerPerdus(){
  if (G.tombe){ placer(EDGE+60, H+160, 180, 0); return; }
  const p = stepPt(marcheDe(G.perdus)); placer(p.x, p.y, 0, 1, p.a * .8);
}
function majJauge(){
  const reste = Math.max(0, cfg.points - G.perdus), f = marcheDe(G.perdus);
  $("#g-pts").textContent = reste;
  $("#g-max").textContent = cfg.points;
  $("#g-pas").textContent = cfg.coef === 1 ? "1 € d'écart = 1 point perdu" : `1 € d'écart = ${cfg.coef} points perdus`;
  const bar = $("#g-bar"); bar.querySelector("i").style.width = (reste / cfg.points * 100) + "%";
  bar.classList.toggle("danger", reste <= cfg.points * .2);
  document.querySelectorAll("#mont .cap").forEach(c => c.classList.toggle("lit", +c.dataset.i < Math.floor(f + 1e-9)));
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
// la souris avance d'autant de points perdus ; à 0 point restant, elle chute
async function avancer(pts){
  const de = G.perdus, vers = Math.min(de + pts, cfg.points), tombe = de + pts >= cfg.points;
  const fa = marcheDe(de), fb = marcheDe(vers);
  let cap = Math.floor(fa + 1e-9);
  if (fb > fa){
    grimpeur.classList.add("marche");
    await tween(Math.min(4200, Math.max(700, (fb - fa) * 340)), t => {
      const f = fa + (fb - fa) * t, p = stepPt(f);
      placer(p.x, p.y, 0, 1, p.a * .8);
      G.perdus = Math.round(de + (vers - de) * t);
      if (Math.floor(f + 1e-9) > cap){ cap = Math.floor(f + 1e-9); tic(cap); }
      majJauge();
    });
    grimpeur.classList.remove("marche");
  }
  G.perdus = vers; majJauge();
  if (tombe){ await chute(); return true; }
  return false;
}
async function chute(){
  const a = stepPt(N);
  grimpeur.classList.add("marche");
  await tween(420, t => placer(a.x + (EDGE + 16 - a.x)*t, a.y, 0, 1, a.a * .8 * (1 - t)));
  grimpeur.classList.remove("marche");
  await pause(380);
  grimpeur.classList.add("chute");
  glissade(900, 70, 1.3);
  await tween(1300, t => placer(EDGE + 16 + 70*t, a.y - Math.sin(Math.min(t*3,1)*Math.PI)*18 + (H + 180 - a.y)*t*t, 200*t, 1 - t*.5));
  grimpeur.classList.remove("chute");
  G.tombe = true; majJauge();
}

/* ---------- Partie ---------- */
const nouvelId = () => Math.random().toString(36).slice(2, 10);
function nouvellePartie(){
  cacherResultat();
  const pool = cfg.items.filter(i => String(i.nom||"").trim() && +i.prix > 0);
  const joueur = $("#joueur").value.trim();
  if (pool.length < 3){
    G = {id:nouvelId(), tirage:[], idx:0, perdus:0, tombe:false, saisie:"", phase:"vide", res:[], joueur};
    rendre(); placerPerdus(); majJauge();
    message("Ajoutez au moins 3 objets avec un prix dans les réglages.", "mal"); return;
  }
  const t = pool.slice();
  for (let i=t.length-1;i>0;i--){ const j = Math.floor(Math.random()*(i+1)); [t[i], t[j]] = [t[j], t[i]]; }
  G = {id:nouvelId(), tirage: t.slice(0,3).map(o => ({nom:o.nom, detail:o.detail||"", prix:Math.round(+o.prix)})), idx:0, perdus:0, tombe:false, saisie:"", phase:"saisie", res:[], joueur};
  rendre(); placerPerdus(); majJauge();
  message(`Objet 1 : ${G.tirage[0].nom}. Quel est son juste prix ?`);
}
function message(t, ton=""){ const m = $("#msg"); m.textContent = t; m.className = "msg " + ton; diffuser(); }
function rendre(){
  $("#lot-gagner").textContent = cfg.lot;
  $("#lots").innerHTML = G.tirage.map((it, i) => {
    const r = G.res[i], etat = i === G.idx && G.phase !== "fin" ? "actif" : (r ? "fait" : "attente");
    const essai = r ? `<span class="essai${r.ecart===0?" exact":""}">Proposé ${r.essai} € · ${r.ecart===0?"exact !":`écart ${r.ecart} € → −${r.pts} pt${r.pts>1?"s":""}`}</span>` : "";
    return `<li class="lot is-${etat}"><span class="num">${i+1}</span>
      <div class="lot-txt"><b>${esc(it.nom)}</b>${it.detail?`<small>${esc(it.detail)}</small>`:""}</div>
      <div class="lot-prix"><span class="reel" id="reel-${i}">${r ? it.prix + " €" : "? €"}</span>${essai}</div></li>`;
  }).join("");
  $("#saisie").textContent = (G.saisie || "---") + " €";
  const bloque = G.phase !== "saisie";
  document.querySelectorAll("#pad .key").forEach(k => k.disabled = bloque);
  $("#b-suivant").hidden = G.phase !== "revele";
  diffuser();
}
function taper(k){
  if (G.phase !== "saisie") return;
  if (k === "del"){ G.saisie = G.saisie.slice(0, -1); bip(220, .05); }
  else if (k === "ok"){ valider(); return; }
  else if (G.saisie.length < 4){ G.saisie = (G.saisie + k).replace(/^0+(?=\d)/, ""); bip(700 + (+k)*30, .05); }
  rendre();
}
async function compter(i, prix){
  const el = $("#reel-" + i);
  let last = -1;
  await tween(1100, t => { const e = 1 - Math.pow(1 - t, 3), v = Math.round(prix * e);
    if (v !== last){ el.textContent = v + " €"; last = v; } });
  el.textContent = prix + " €";
}
async function valider(){
  if (G.phase !== "saisie" || !G.saisie) { if (G.phase === "saisie") message("Tapez un prix avant de valider.", "mal"); return; }
  const it = G.tirage[G.idx], essai = +G.saisie;
  G.phase = "anim"; rendre();
  message(`Le candidat annonce ${essai} €. Le juste prix est…`);
  bip(660, .12); bip(880, .14, "square", .07, .15);
  await pause(500);
  await compter(G.idx, it.prix);
  const ecart = Math.abs(essai - it.prix), pts = ecart * cfg.coef;
  G.res[G.idx] = {essai, ecart, pts}; rendre();
  if (ecart === 0){ message("Prix exact ! Aucun point perdu, la souris reste où elle est.", "bon"); bip(1047, .3, "triangle", .12); }
  else message(`${it.prix} € ! Écart de ${ecart} € : le candidat perd ${pts} point${pts>1?"s":""}.`);
  await pause(900);
  const tombe = await avancer(pts);
  if (tombe){ G.phase = "fin"; G.gagne = false; rendre(); resultat(false); return; }
  const reste = cfg.points - G.perdus;
  if (G.idx >= G.tirage.length - 1){ G.phase = "fin"; G.gagne = true; rendre(); resultat(true); return; }
  G.phase = "revele"; rendre();
  message(`Il reste ${reste} point${reste>1?"s":""} avant la chute.`, reste <= cfg.points * .2 ? "mal" : "");
}
function suivant(){
  if (G.phase !== "revele") return;
  G.idx++; G.saisie = ""; G.phase = "saisie"; rendre();
  message(`Objet ${G.idx+1} : ${G.tirage[G.idx].nom}. Quel est son juste prix ?`);
}
function resultat(gagne, silencieux){
  const nom = G.joueur || $("#joueur").value.trim() || "Le candidat";
  const box = $("#result"); box.hidden = false; box.className = "result " + (gagne ? "win" : "lose");
  $("#r-titre").textContent = gagne ? "Au sommet !" : "La chute !";
  $("#r-texte").textContent = gagne
    ? `${nom} termine avec ${cfg.points - G.perdus} points sur ${cfg.points} et les ajoute au classement général du tournoi.`
    : `${nom} n'a plus aucun point. La souris Azerty tombe de la falaise.`;
  message(gagne ? "Gagné ! Bravo au candidat." : "Perdu… mais on applaudit quand même.", gagne ? "bon" : "mal");
  if (!silencieux){ if (gagne){ fanfare(); confettis(); } else { bip(196, .4, "sawtooth", .08, .1); bip(147, .7, "sawtooth", .08, .5); } }
}
function cacherResultat(){ $("#result").hidden = true; }
function confettis(){
  if (reduce) return;
  const c = $("#confettis"), ctx = c.getContext("2d"), r = c.getBoundingClientRect(), dpr = devicePixelRatio || 1;
  c.width = r.width * dpr; c.height = r.height * dpr; ctx.scale(dpr, dpr);
  const cols = ["#f09922", "#ff5252", "#ffffff", "#b2b2c5"];
  const ps = Array.from({length:140}, () => ({x: r.width/2 + (Math.random()-.5)*80, y: r.height*.35, vx:(Math.random()-.5)*9, vy:-Math.random()*9-3, s:Math.random()*6+4, c:cols[Math.random()*4|0], a:Math.random()*6}));
  const t0 = performance.now();
  (function f(now){
    const t = now - t0; ctx.clearRect(0, 0, r.width, r.height);
    ps.forEach(p => { p.vy += .22; p.x += p.vx; p.y += p.vy; p.a += .15; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.fillStyle = p.c; ctx.fillRect(-p.s/2, -p.s/4, p.s, p.s/2); ctx.restore(); });
    if (t < 3200 && !$("#result").hidden) requestAnimationFrame(f); else ctx.clearRect(0, 0, r.width, r.height);
  })(t0);
}

/* ---------- Réglages ---------- */
let brouillon = null;
function ouvrirReglages(){
  brouillon = clone(cfg);
  $("#s-points").value = brouillon.points; $("#s-coef").value = brouillon.coef; $("#s-lot").value = brouillon.lot;
  rendreItems(); $("#sheet").hidden = false; $("#s-lot").focus();
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
  brouillon.lot = $("#s-lot").value.trim() || DEF.lot;
  brouillon.items = brouillon.items.filter(i => String(i.nom).trim() || +i.prix > 0);
  cfg = brouillon; const ok = sauver(); fermerReglages();
  dessiner(); nouvellePartie();
  if (!ok) message("Réglages appliqués, mais ce navigateur ne peut pas les garder après rechargement.", "mal");
}

/* ---------- Évènements ---------- */
$("#pad").addEventListener("click", e => { const k = e.target.closest(".key"); if (k) taper(k.dataset.k); });
$("#b-suivant").addEventListener("click", suivant);
$("#b-nouvelle").addEventListener("click", () => { if (G.phase !== "anim") nouvellePartie(); });
$("#b-rejouer").addEventListener("click", () => { $("#joueur").value = ""; nouvellePartie(); $("#joueur").focus(); });
$("#joueur").addEventListener("input", e => { if (G) G.joueur = e.target.value.trim(); });
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
  if (e.target.matches("input")) { if (e.key === "Enter") e.target.blur(); return; }
  if (/^[0-9]$/.test(e.key)){ if (manuel) taper(e.key); }
  else if (e.key === "Backspace"){ e.preventDefault(); if (manuel) taper("del"); }
  else if (e.key === "Enter"){ e.preventDefault(); G.phase === "revele" ? suivant() : G.phase === "fin" ? nouvellePartie() : (manuel && taper("ok")); }
});

/* ---------- Liaison avec la manette téléphone (voir js/liaison.js) ---------- */
const SALLE = Liaison.salleEcran();
const LIEN_MANETTE = new URL("manette.html?salle=" + SALLE + (Liaison.brokerPerso() ? "&broker=" + encodeURIComponent(Liaison.brokerPerso()) : ""), location.href).href;
let lien = null, dernierEtat = "";
const manettes = new Map();     // cid -> dernier signe de vie
const vus = new Set();          // identifiants de messages déjà traités
const nomsManettes = new Map(); // cid -> dernier pseudo reçu
const tourCourant = () => (G && G.id ? G.id : "x") + "-" + (G ? G.idx : 0);
function etatCourant(){
  const it = G.tirage[G.idx], r = G.res[G.idx];
  return {
    tour: tourCourant(), phase: G.phase, idx: G.idx, total: G.tirage.length,
    objet: it ? {nom: String(it.nom).slice(0, 80), detail: String(it.detail || "").slice(0, 80)} : null,
    reste: Math.max(0, cfg.points - G.perdus), max: cfg.points, gagne: !!G.gagne,
    resultat: r ? {essai: r.essai, prix: it.prix, pts: r.pts} : null,
    joueur: (G.joueur || "").slice(0, 24)
  };
}
function diffuser(force){
  if (!lien || !G) return;
  const e = JSON.stringify(etatCourant());
  if (!force && e === dernierEtat) return;
  dernierEtat = e;
  lien.publierEtat(JSON.parse(e));
}
const propre = v => String(v ?? "").replace(/[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁠-⁯]/g, "").trim().slice(0, 24);
function recevoir(m){
  if (!m || typeof m !== "object" || typeof m.cid !== "string") return;
  manettes.set(m.cid, Date.now());
  // le pseudo tapé sur le téléphone remplace celui de l'écran, seulement quand il change
  const nom = propre(m.nom);
  if (nom && nom !== nomsManettes.get(m.cid)){ nomsManettes.set(m.cid, nom); $("#joueur").value = nom; if (G) G.joueur = nom; diffuser(); }
  if (m.id){ if (vus.has(m.id)) { majLiaison(); return; } vus.add(m.id); }
  if (m.type === "prix"){
    const prix = Math.round(+m.prix);
    if (G && G.phase === "saisie" && m.tour === tourCourant() && Number.isFinite(prix) && prix >= 0 && prix <= 9999){
      G.saisie = String(prix); rendre(); valider();
    }
  } else if (m.type === "suite"){
    if (G && G.phase === "revele" && m.tour === tourCourant()) suivant();
  }
  majLiaison();
}
function majLiaison(){
  const now = Date.now();
  for (const [k, t] of manettes) if (now - t > 15000) manettes.delete(k);
  const n = manettes.size;
  $("#b-manette").classList.toggle("lie", n > 0);
  $("#b-manette-txt").textContent = n ? (n > 1 ? `${n} manettes` : "Manette connectée") : "Participer";
  let txt = n ? (n > 1 ? `${n} manettes connectées.` : "1 manette connectée.") : "Aucune manette connectée.";
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
}
$("#b-manuel").addEventListener("click", () => {
  manuel = !manuel;
  try { localStorage.setItem("azertyrolien-manuel", manuel ? "1" : "0"); } catch(e){}
  majManuel();
});
majManuel();
let qrFait = false;
function ouvrirManette(){
  $("#lien-man").value = LIEN_MANETTE;
  $("#code-salle").textContent = SALLE;
  if (!qrFait && window.QRCode){
    try { new QRCode($("#qr"), {text: LIEN_MANETTE, width: 640, height: 640, colorDark: "#000000", colorLight: "#ffffff", correctLevel: QRCode.CorrectLevel.L}); qrFait = true; } catch(e){}
  }
  if (!qrFait) $("#qr").textContent = "QR code indisponible : utilisez le lien.";
  majLiaison();
  $("#sheet-man").hidden = false; $("#sm-fermer").focus();
}
$("#b-manette").addEventListener("click", ouvrirManette);
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
setInterval(() => { diffuser(true); majLiaison(); }, 8000); // signe de vie de l'écran

/* ---------- Démarrage ---------- */
function start(data){
  dessiner();
  const d = data && data.G;
  if (d && d.phase && d.phase !== "anim" && typeof d.perdus === "number"){
    G = d; rendre(); placerPerdus(); majJauge();
    if (G.phase === "fin") resultat(G.gagne, true); else message(G.phase === "revele" ? "Passez à l'objet suivant." : `Objet ${G.idx+1} : quel est son juste prix ?`);
  } else nouvellePartie();
}
start({});
})();
