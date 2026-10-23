/* Azertyrolien — manette du candidat, sur son téléphone. */
(() => {
const $ = s => document.querySelector(s);
const aleatoire = () => Math.random().toString(36).slice(2, 10);

let lien = null, ecran = null, ecranVu = 0, saisie = "", envoyeTour = null, suiteTour = null;
let nom = "";
try { nom = localStorage.getItem("azertyrolien-pseudo") || ""; } catch(e){}
$("#m-nom").value = nom;

const ecranPresent = () => ecran && Date.now() - ecranVu < 25000;

function statut(t, ton=""){ const m = $("#m-statut"); m.textContent = t; m.className = "man-statut " + ton; }
function rendre(){
  const e = ecran;
  $("#m-saisie").textContent = (saisie || "---") + " €";
  let actif = false;
  $("#m-suivant").hidden = true;
  if (!SALLE){
    statut("Scanne le QR code du grand écran, ou tape le code de la salle affiché dans « Manette ».");
  } else if (lien === false){
    statut("Liaison impossible : vérifie la connexion internet du téléphone.", "mal");
  } else if (!lien || !lien.connecte()){
    statut("Connexion…");
  } else if (!ecranPresent()){
    $("#m-num").textContent = "En attente"; $("#m-objet").textContent = "Le grand écran n'est pas encore détecté"; $("#m-detail").textContent = "";
    $("#m-pts").textContent = "–"; $("#m-max").textContent = "–";
    statut("Ouvre le jeu sur le grand écran, ou vérifie le code de la salle.");
  } else {
    $("#m-pts").textContent = e.reste; $("#m-max").textContent = e.max;
    if (e.objet){ $("#m-num").textContent = `Objet ${e.idx + 1} sur ${e.total}`; $("#m-objet").textContent = e.objet.nom; $("#m-detail").textContent = e.objet.detail || ""; }
    else { $("#m-num").textContent = "En attente"; $("#m-objet").textContent = "Pas d'objet en jeu"; $("#m-detail").textContent = ""; }
    if (e.phase === "saisie"){
      if (envoyeTour === e.tour) statut("Prix envoyé ! Regarde l'écran.", "bon");
      else { actif = true; statut("Tape ton prix puis appuie sur OK."); }
    } else if (e.phase === "anim"){
      statut("Regarde l'écran…");
    } else if (e.phase === "revele"){
      const r = e.resultat;
      statut(r ? `Proposé ${r.essai} € · juste prix ${r.prix} € · ${r.pts ? "−" + r.pts + " pt" + (r.pts > 1 ? "s" : "") : "exact !"}` : "Résultat affiché à l'écran.", r && !r.pts ? "bon" : "");
      if (suiteTour !== e.tour) $("#m-suivant").hidden = false;
    } else if (e.phase === "fin"){
      statut(e.gagne ? `Bravo ! ${e.reste} points gagnés pour le classement.` : "La souris est tombée… Merci d'avoir joué !", e.gagne ? "bon" : "mal");
    } else statut("La partie n'a pas encore commencé.");
  }
  document.querySelectorAll("#m-pad .key").forEach(k => k.disabled = !actif);
}

function taper(k){
  if (!ecranPresent() || ecran.phase !== "saisie" || envoyeTour === ecran.tour) return;
  if (k === "del") saisie = saisie.slice(0, -1);
  else if (k === "ok"){
    if (!saisie){ statut("Tape un prix avant de valider.", "mal"); return; }
    envoyeTour = ecran.tour;
    lien.envoyer({type: "prix", id: aleatoire(), prix: +saisie, tour: ecran.tour, nom});
    saisie = "";
    if (navigator.vibrate) try { navigator.vibrate(40); } catch(e){}
  }
  else if (saisie.length < 4) saisie = (saisie + k).replace(/^0+(?=\d)/, "");
  rendre();
}
$("#m-pad").addEventListener("click", e => { const k = e.target.closest(".key"); if (k) taper(k.dataset.k); });
$("#m-suivant").addEventListener("click", () => {
  if (!ecranPresent() || ecran.phase !== "revele") return;
  suiteTour = ecran.tour;
  lien.envoyer({type: "suite", id: aleatoire(), tour: ecran.tour, nom});
  rendre();
});
let tNom = 0;
$("#m-nom").addEventListener("input", e => {
  nom = e.target.value.trim().slice(0, 24);
  try { localStorage.setItem("azertyrolien-pseudo", nom); } catch(err){}
  clearTimeout(tNom); tNom = setTimeout(() => lien && lien.envoyer({type: "bonjour", nom}), 500);
});

// code de la salle : dans l'adresse (QR code), sinon à taper
let SALLE = Liaison.salleManette();
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
      if (!etat || typeof etat !== "object") return;
      ecran = etat;
      // un état « conservé » peut dater d'une ancienne session : on se fie alors à son horodatage
      if (!ancien) ecranVu = Date.now();
      else if (typeof etat.ts === "number") ecranVu = Math.max(ecranVu, Math.min(Date.now(), etat.ts));
      rendre();
    },
    onConnexion: c => { if (c && lien) lien.envoyer({type: "bonjour", nom}); rendre(); }
  }).then(l => { lien = l; if (l.connecte()) l.envoyer({type: "bonjour", nom}); rendre(); })
    .catch(() => { lien = false; rendre(); });
  // signe de vie : l'écran compte les manettes connectées
  setInterval(() => { if (lien && lien.connecte()) lien.envoyer({type: "bonjour", nom}); rendre(); }, 6000);
}
})();
