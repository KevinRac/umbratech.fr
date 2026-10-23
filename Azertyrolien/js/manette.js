/* Azertyrolien — manette du joueur, sur son téléphone (partie à plusieurs). */
(() => {
const $ = s => document.querySelector(s);
const aleatoire = () => Math.random().toString(36).slice(2, 10);

// identifiant du joueur : garde sa place même si la page est rechargée
let PID = "";
try { PID = localStorage.getItem("azertyrolien-pid") || ""; } catch(e){}
if (!/^[a-z0-9]{8,16}$/.test(PID)){ PID = aleatoire() + aleatoire().slice(0, 4); try { localStorage.setItem("azertyrolien-pid", PID); } catch(e){} }

let lien = null, ecran = null, ecranVu = 0, finLocale = 0, saisie = "";
const envoye = {};   // tour -> prix envoyé
// pseudo obligatoire : tant qu'il n'est pas validé, rien d'autre n'est affiché
let nom = "";
try { nom = (localStorage.getItem("azertyrolien-pseudo") || "").trim().slice(0, 16); } catch(e){}
$("#m-nom").value = nom;
let nomValide = false;

const ecranPresent = () => ecran && Date.now() - ecranVu < 25000;
const moi = () => ecran && Array.isArray(ecran.joueurs) ? ecran.joueurs.find(j => j.pid === PID) : null;
const restant = () => Math.max(0, finLocale - Date.now());

function statut(t, ton=""){ const m = $("#m-statut"); m.textContent = t; m.className = "man-statut " + ton; }
function couleurs(){
  const c = Liaison.couleur(nom);
  document.documentElement.style.setProperty("--joueur", c);
  document.documentElement.style.setProperty("--joueur-encre", Liaison.encre(c));
}
function majChrono(){
  const r = restant(), s = Math.ceil(r / 1000);
  $("#m-chrono-txt").textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  $("#m-chrono").classList.toggle("urgent", s <= 10);
  const d = (ecran && ecran.duree || 60) * 1000;
  $("#m-chrono-bar").style.width = Math.min(100, r / d * 100) + "%";
}
function rendre(){
  const e = ecran, j = moi();
  $("#m-saisie").textContent = (saisie || "---") + " €";
  let pad = false, voirJeu = false, voirChrono = false;
  $("#m-pseudo-zone").hidden = !SALLE || nomValide;
  $("#m-moi").hidden = !nomValide;
  $("#m-modifier").hidden = !!(e && e.phase !== "attente" && j);
  if (!SALLE){
    statut("Scanne le QR code du grand écran, ou tape le code de la salle.");
  } else if (!nomValide){
    statut("");
  } else if (lien === false){
    statut("Liaison impossible : vérifie la connexion internet du téléphone.", "mal");
  } else if (!lien || !lien.connecte()){
    statut("Connexion…");
  } else if (!ecranPresent()){
    statut("Le grand écran n'est pas encore détecté. Vérifie le code de la salle.");
  } else if (e.phase === "attente"){
    const n = e.joueurs.length;
    statut(j ? `Tu es inscrit ! Attends que l'animateur lance la partie. (${n} joueur${n > 1 ? "s" : ""})` : "Inscription en cours…", j ? "bon" : "");
  } else if (!j){
    statut("Une partie est en cours. Tu pourras participer à la prochaine !");
  } else {
    voirJeu = true;
    $("#m-pts").textContent = j.reste; $("#m-max").textContent = e.max;
    if (e.objet){ $("#m-num").textContent = `Objet ${e.idx + 1} sur ${e.total}`; $("#m-objet").textContent = e.objet.nom; $("#m-detail").textContent = e.objet.detail || ""; }
    const r = e.resultat && e.resultat.par ? e.resultat.par[PID] : null;
    if (e.phase === "fin"){
      const cl = e.joueurs.slice().sort((a, b) => b.reste - a.reste);
      const rang = cl.findIndex(x => x.reste === j.reste) + 1;
      statut(j.reste ? `Partie terminée ! Tu finis ${rang === 1 ? "1er" : rang + "e"} sur ${cl.length} avec ${j.reste} points.` : "Partie terminée. Ta souris est tombée… merci d'avoir joué !", j.reste ? "bon" : "mal");
    } else if (j.tombe && e.phase !== "anim"){
      statut("Ta souris est tombée de la falaise… Regarde la suite sur l'écran !", "mal");
    } else if (e.phase === "saisie"){
      voirChrono = true;
      const deja = envoye[e.tour];
      pad = restant() > 0;
      if (!pad) statut("Temps écoulé ! Regarde l'écran…");
      else if (deja !== undefined) statut(`Prix envoyé : ${deja} €. Tu peux encore le changer jusqu'à la fin du chrono.`, "bon");
      else statut("Tape ton prix puis appuie sur OK.");
    } else if (e.phase === "anim"){
      statut("Regarde l'écran…");
    } else if (e.phase === "revele"){
      statut(r ? (r.essai === null ? `Pas de réponse : −${r.pts} pts. Juste prix : ${e.resultat.prix} €.` : `Juste prix ${e.resultat.prix} € · tu as dit ${r.essai} € · ${r.pts ? "−" + r.pts + " pt" + (r.pts > 1 ? "s" : "") : "exact !"}`) : "Résultat à l'écran.", r && !r.pts ? "bon" : "");
    }
  }
  $("#m-jeu").hidden = !voirJeu;
  $("#m-chrono").hidden = !voirChrono;
  majChrono();
  document.querySelectorAll("#m-pad .key").forEach(k => k.disabled = !pad);
}

function taper(k){
  const e = ecran, j = moi();
  if (!nomValide || !ecranPresent() || e.phase !== "saisie" || !j || j.tombe || restant() <= 0) return;
  if (k === "del") saisie = saisie.slice(0, -1);
  else if (k === "ok"){
    if (!saisie){ statut("Tape un prix avant de valider.", "mal"); return; }
    envoye[e.tour] = +saisie;
    lien.envoyer({type: "prix", id: aleatoire(), pid: PID, prix: +saisie, tour: e.tour, nom});
    saisie = "";
    if (navigator.vibrate) try { navigator.vibrate(40); } catch(err){}
  }
  else if (saisie.length < 4) saisie = (saisie + k).replace(/^0+(?=\d)/, "");
  rendre();
}
$("#m-pad").addEventListener("click", e => { const k = e.target.closest(".key"); if (k) taper(k.dataset.k); });

function validerNom(){
  const v = $("#m-nom").value.trim().replace(/\s+/g, " ").slice(0, 16);
  if (v.length < 2){ statut("Ton pseudo doit faire au moins 2 caractères.", "mal"); $("#m-nom").focus(); return; }
  nom = v; nomValide = true;
  try { localStorage.setItem("azertyrolien-pseudo", nom); } catch(err){}
  couleurs();
  $("#m-moi-nom").textContent = nom;
  if (lien && lien.connecte()) lien.envoyer({type: "joueur", id: aleatoire(), pid: PID, nom});
  if (navigator.vibrate) try { navigator.vibrate(30); } catch(e){}
  rendre();
}
$("#m-nom-ok").addEventListener("click", validerNom);
$("#m-nom").addEventListener("keydown", e => { if (e.key === "Enter"){ e.preventDefault(); validerNom(); } });
$("#m-modifier").addEventListener("click", () => { nomValide = false; rendre(); $("#m-nom").focus(); $("#m-nom").select(); });
const bonjour = () => lien && lien.connecte() && lien.envoyer({type: "bonjour", pid: PID, nom: nomValide ? nom : ""});

// code de la salle : dans l'adresse (QR code), sinon à taper
const SALLE = Liaison.salleManette();
if (!SALLE){
  $("#m-salle-zone").hidden = false;
  $("#m-salle-ok").addEventListener("click", () => {
    const v = $("#m-salle").value.trim().toLowerCase();
    if (!/^[a-z0-9]{4,12}$/.test(v)) { statut("Code invalide : 4 à 12 lettres ou chiffres.", "mal"); return; }
    const p = new URLSearchParams(location.search); p.set("salle", v);
    location.search = p.toString();
  });
}
rendre();

if (SALLE){
  Liaison.connecter({
    salle: SALLE, role: "manette",
    onEtat: (etat, ancien) => {
      if (!etat || typeof etat !== "object" || !Array.isArray(etat.joueurs)) return;
      const nouveauTour = !ecran || ecran.tour !== etat.tour;
      ecran = etat;
      // un état « conservé » peut dater d'une ancienne session : on se fie alors à son horodatage
      if (!ancien) ecranVu = Date.now();
      else if (typeof etat.ts === "number") ecranVu = Math.max(ecranVu, Math.min(Date.now(), etat.ts));
      const age = ancien && typeof etat.ts === "number" ? Math.max(0, Date.now() - etat.ts) : 0;
      finLocale = etat.phase === "saisie" ? Date.now() + (etat.restant || 0) - age : 0;
      if (nouveauTour) saisie = "";
      // l'écran a été relancé sans nous : on se réinscrit
      if (etat.phase === "attente" && nomValide && !moi()) bonjour();
      rendre();
    },
    onConnexion: c => { if (c) bonjour(); rendre(); }
  }).then(l => { lien = l; bonjour(); rendre(); })
    .catch(() => { lien = false; rendre(); });
  // signe de vie (et inscription si un message s'est perdu)
  setInterval(() => { bonjour(); rendre(); }, 6000);
  // le chrono tourne aussi sur le téléphone
  setInterval(() => { if (ecran && ecran.phase === "saisie"){ const avant = !$("#m-pad .key").disabled; majChrono(); if (avant !== (restant() > 0)) rendre(); } }, 250);
}
})();
