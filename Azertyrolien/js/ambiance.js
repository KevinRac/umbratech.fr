/* Azertyrolien — ambiance musicale, entièrement synthétisée (WebAudio) : aucun fichier, aucun droit d'auteur.
   Deux pistes : « attente » (chill synthwave, la). « partie » (rythmée, ré mineur), plus tendue pendant les 10 dernières secondes. */
window.Ambiance = (() => {
  let ctx = null, out = null, bruit = null, actif = true, piste = null, niveau = 1, urgent = false;
  let pas = 0, prochain = 0, timer = null;
  const P = {};   // pistes : {gain}
  const mtof = n => 440 * Math.pow(2, (n - 69) / 12);

  try { actif = localStorage.getItem("azertyrolien-musique") !== "0"; } catch(e){}

  function init(){
    if (ctx) return true;
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e){ return false; }
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18; comp.ratio.value = 4;
    out = ctx.createGain(); out.gain.value = actif ? .55 : 0;
    out.connect(comp).connect(ctx.destination);
    // écho d'ambiance (réverbération simple)
    const ret = ctx.createGain(); ret.gain.value = .32;
    const dl = ctx.createDelay(1); dl.delayTime.value = .34;
    const fb = ctx.createGain(); fb.gain.value = .38;
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 2600;
    dl.connect(lp); lp.connect(fb); fb.connect(dl); lp.connect(ret); ret.connect(out);
    ["attente", "partie"].forEach(nom => {
      const g = ctx.createGain(); g.gain.value = 0;
      const send = ctx.createGain(); send.gain.value = .5;
      g.connect(out); g.connect(send); send.connect(dl);
      P[nom] = {gain: g};
    });
    // bruit blanc pour charleston et caisse claire
    bruit = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = bruit.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return true;
  }

  /* ----- briques sonores ----- */
  function note(type, f, t, dur, vol, dest, {filtre = 0, attaque = .008, detune = 0, fin = null} = {}){
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = f; o.detune.value = detune;
    let n = o;
    if (filtre){ const bq = ctx.createBiquadFilter(); bq.type = "lowpass"; bq.frequency.value = filtre; bq.Q.value = .8; o.connect(bq); n = bq; }
    g.gain.setValueAtTime(.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + attaque);
    g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    if (fin) o.frequency.exponentialRampToValueAtTime(fin, t + dur);
    n.connect(g).connect(dest);
    o.start(t); o.stop(t + dur + .05);
  }
  function souffle(t, dur, vol, dest, hz, type = "highpass"){
    const s = ctx.createBufferSource(); s.buffer = bruit;
    const bq = ctx.createBiquadFilter(); bq.type = type; bq.frequency.value = hz;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    s.connect(bq).connect(g).connect(dest);
    s.start(t, Math.random() * .5); s.stop(t + dur + .02);
  }
  const grosseCaisse = (t, vol, dest) => note("sine", 130, t, .22, vol, dest, {attaque: .002, fin: 42});
  const claque = (t, vol, dest) => { souffle(t, .16, vol, dest, 1400); note("triangle", 190, t, .09, vol * .6, dest, {attaque: .002, fin: 120}); };
  const charley = (t, vol, dest, long = false) => souffle(t, long ? .12 : .045, vol, dest, 7000);
  // accord tenu : plusieurs oscillateurs légèrement désaccordés, attaque lente
  function nappe(notes, t, dur, vol, dest, filtre){
    notes.forEach(m => [-7, 7].forEach(dt => note("sawtooth", mtof(m), t, dur, vol, dest, {filtre, attaque: Math.min(.9, dur * .35), detune: dt})));
  }

  /* ----- piste 1 : salle d'attente — la mineur, 92 BPM ----- */
  const ACC_A = [[57, 60, 64, 67], [53, 57, 60, 64], [55, 60, 64, 67], [55, 59, 62, 67]];   // Am, F, C, G
  const RAC_A = [45, 41, 48, 43];
  const ARP_A = [0, 1, 2, 3, 2, 1, 2, 1];
  function stepAttente(i, t, g){
    const s = 60 / 92 / 4, bar = Math.floor(i / 16) % 4, k = i % 16, ac = ACC_A[bar];
    if (k === 0){ nappe(ac, t, s * 16.5, .018, g, 1100); note("sine", mtof(RAC_A[bar]), t, s * 7.5, .22, g, {attaque: .02}); }
    if (k === 10) note("sine", mtof(RAC_A[bar] + (bar % 2 ? 7 : 12)), t, s * 5, .14, g, {attaque: .02});
    if (k % 2 === 0){
      const n = ac[ARP_A[(k / 2) % 8] % ac.length] + 12;
      note("triangle", mtof(n), t, s * 3.2, .07, g, {filtre: 3200});
    }
    if (k === 0 || k === 8) grosseCaisse(t, .16, g);
    if (k === 4 || k === 12) charley(t, .02, g);
    if (k % 4 === 2) charley(t, .008, g);
  }

  /* ----- piste 2 : partie — ré mineur, 126 BPM ----- */
  const ACC_G = [[62, 65, 69, 74], [58, 62, 65, 70], [57, 60, 65, 69], [60, 64, 67, 72]];   // Dm, Bb, F, C
  const RAC_G = [38, 34, 41, 36];
  function stepPartie(i, t, g){
    const s = 60 / (urgent ? 140 : 126) / 4, bar = Math.floor(i / 16) % 4, k = i % 16, ac = ACC_G[bar], rac = RAC_G[bar];
    if (k % 4 === 0) grosseCaisse(t, .42, g);
    if (k === 4 || k === 12) claque(t, urgent ? .13 : .09, g);
    if (k % 2 === 0) charley(t, k % 4 === 2 ? .04 : .02, g, k % 4 === 2);
    if (urgent && k % 2 === 1) charley(t, .015, g);
    // basse ronde
    if (k % 2 === 0) note("sawtooth", mtof(rac + (k === 6 || k === 14 ? 12 : 0)), t, s * 1.7, .2, g, {filtre: 520});
    // arpège rapide
    const pat = [0, 2, 1, 3, 2, 3, 1, 2];
    note("square", mtof(ac[pat[k % 8]] + (k >= 8 ? 12 : 0)), t, s * 1.4, urgent ? .05 : .035, g, {filtre: 2600, attaque: .004});
    // accords courts sur les temps forts
    if (k === 0 || k === 6 || k === 10) nappe(ac.slice(0, 3), t, s * 2.2, .012, g, 1800);
    // tension : montée de note sur les 4 dernières mesures de chaque cycle, ou toujours en urgence
    if (urgent && k % 4 === 0) note("sine", mtof(ac[3] + 24), t, s * 1.5, .035, g, {fin: mtof(ac[3] + 26)});
  }
  const PISTES = {attente: stepAttente, partie: stepPartie};
  const LONGUEUR = nom => nom === "attente" ? 60 / 92 / 4 : 60 / (urgent ? 140 : 126) / 4;

  /* ----- séquenceur ----- */
  function tic(){
    if (!ctx || !piste) return;
    const now = ctx.currentTime;
    if (prochain < now - .3) prochain = now + .05;   // onglet endormi : on repart proprement
    while (prochain < now + .25){
      PISTES[piste](pas, prochain, P[piste].gain);
      prochain += LONGUEUR(piste); pas++;
    }
  }
  function regler(){
    if (!ctx) return;
    const now = ctx.currentTime;
    out.gain.setTargetAtTime(actif ? .55 : 0, now, .15);
    Object.entries(P).forEach(([nom, p]) => p.gain.gain.setTargetAtTime(nom === piste && actif ? niveau : 0, now, nom === piste ? .5 : .9));
  }

  /* ----- API ----- */
  // jouer("attente" | "partie" | null, niveau 0..1, urgent)
  function jouer(nom, vol = 1, tendu = false){
    if (!init()) return;
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    urgent = !!tendu;
    if (nom !== piste){ piste = nom; pas = 0; prochain = ctx.currentTime + .1; }
    niveau = vol;
    if (nom && !timer) timer = setInterval(tic, 60);
    if (!nom && timer){ clearInterval(timer); timer = null; }
    regler();
  }
  function activer(oui){
    actif = oui;
    try { localStorage.setItem("azertyrolien-musique", oui ? "1" : "0"); } catch(e){}
    if (ctx) regler();
    return actif;
  }
  // les navigateurs n'autorisent le son qu'après un geste : on déverrouille au premier clic ou à la première touche
  function deverrouiller(){ if (init() && ctx.state === "suspended") ctx.resume().catch(() => {}); }
  ["pointerdown", "keydown", "touchstart"].forEach(e => addEventListener(e, deverrouiller, {passive: true}));
  return {jouer, activer, est: () => actif, etat: () => ctx ? ctx.state : "absent", _ctx: () => ctx, _sortie: () => out};
})();
