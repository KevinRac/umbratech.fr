/*
 * Azertyrolien — liaison écran <-> téléphones.
 *
 * Passe par un serveur MQTT public (WebSocket sécurisé), sans compte ni serveur à nous.
 * Chaque grand écran a un « code de salle » ; tout se passe sous le sujet
 *   azertyrolien/v1/<salle>/etat     l'écran publie l'état de la partie (message conservé)
 *   azertyrolien/v1/<salle>/manette  les téléphones envoient pseudo, prix, « objet suivant »
 *
 * Paramètres d'URL utiles :
 *   ?salle=abc123                 force un code de salle
 *   ?broker=wss://hote:port/mqtt  utilise un autre serveur MQTT
 */
window.Liaison = (() => {
  // L'écran et les téléphones doivent utiliser le même serveur : le lien de la manette
  // reprend automatiquement le paramètre ?broker= de l'écran s'il y en a un.
  const SERVEUR = "wss://broker.emqx.io:8084/mqtt";
  const BIBLIOTHEQUES = [
    "https://unpkg.com/mqtt@5.10.1/dist/mqtt.min.js",
    "https://cdn.jsdelivr.net/npm/mqtt@5.10.1/dist/mqtt.min.js"
  ];
  const params = new URLSearchParams(location.search);
  const CLE_SALLE = "azertyrolien-salle";
  const valide = s => typeof s === "string" && /^[a-z0-9]{4,12}$/.test(s);
  const aleatoire = n => {
    const a = "abcdefghjkmnpqrstuvwxyz23456789"; let s = "";
    const r = new Uint32Array(n); crypto.getRandomValues(r);
    for (const v of r) s += a[v % a.length];
    return s;
  };

  function salleEcran(){
    let s = (params.get("salle") || "").toLowerCase();
    if (!valide(s)) { try { s = localStorage.getItem(CLE_SALLE) || ""; } catch(e){ s = ""; } }
    if (!valide(s)) s = aleatoire(6);
    try { localStorage.setItem(CLE_SALLE, s); } catch(e){}
    return s;
  }
  function nouvelleSalle(){
    const s = aleatoire(6);
    try { localStorage.setItem(CLE_SALLE, s); } catch(e){}
    if (params.has("salle")) { params.delete("salle"); history.replaceState(null, "", location.pathname + (params.toString() ? "?" + params : "")); }
    return s;
  }
  function salleManette(){
    const s = (params.get("salle") || "").toLowerCase();
    return valide(s) ? s : null;
  }

  let chargement = null;
  function chargerMqtt(){
    if (window.mqtt) return Promise.resolve(window.mqtt);
    if (chargement) return chargement;
    chargement = new Promise((ok, ko) => {
      let i = 0;
      const essai = () => {
        if (i >= BIBLIOTHEQUES.length) { ko(new Error("bibliothèque MQTT introuvable")); return; }
        const sc = document.createElement("script");
        sc.src = BIBLIOTHEQUES[i++]; sc.async = true;
        sc.onload = () => window.mqtt ? ok(window.mqtt) : essai();
        sc.onerror = essai;
        document.head.appendChild(sc);
      };
      essai();
    });
    return chargement;
  }

  /**
   * connecter({salle, role:"ecran"|"manette", onEtat(etat, ancien), onMessage(msg), onConnexion(bool)})
   * -> Promise<{cid, connecte(), publierEtat(etat), envoyer(msg)}>
   */
  async function connecter({salle, role, onEtat, onMessage, onConnexion}){
    const mqtt = await chargerMqtt();
    const base = `azertyrolien/v1/${salle}/`;
    const cid = role + "-" + aleatoire(10);
    const url = params.get("broker") || SERVEUR;
    const client = mqtt.connect(url, {
      clientId: "azr-" + cid, clean: true, keepalive: 30,
      reconnectPeriod: 2500, connectTimeout: 8000, protocolVersion: 4
    });
    let connecte = false;
    client.on("connect", () => {
      connecte = true;
      client.subscribe(role === "ecran" ? base + "manette" : base + "etat", {qos: 1});
      onConnexion && onConnexion(true);
    });
    const perdu = () => { if (connecte) { connecte = false; onConnexion && onConnexion(false); } };
    client.on("close", perdu);
    client.on("offline", perdu);
    client.on("error", () => {}); // mqtt.js se reconnecte tout seul
    client.on("message", (sujet, charge, paquet) => {
      let d; try { d = JSON.parse(charge.toString()); } catch(e){ return; }
      if (sujet.endsWith("/etat")) onEtat && onEtat(d, !!(paquet && paquet.retain));
      else onMessage && onMessage(d);
    });
    const api = {
      cid,
      connecte: () => connecte,
      publierEtat(etat){ client.publish(base + "etat", JSON.stringify({...etat, ts: Date.now()}), {qos: 0, retain: true}); },
      envoyer(msg){ client.publish(base + "manette", JSON.stringify({...msg, cid}), {qos: 1}); }
    };
    return api;
  }

  const brokerPerso = () => params.get("broker");

  // une couleur par pseudo, identique sur l'écran et sur le téléphone
  const COULEURS = ["#ff5252", "#f09922", "#ffd23f", "#8ac926", "#2ec4b6", "#00bbf9", "#3a86ff", "#9b5de5", "#ff4fd8", "#ff7b00", "#06d6a0", "#ef476f"];
  function couleur(nom){
    const n = String(nom || "").trim().toLowerCase();
    let h = 2166136261;
    for (const c of n) h = Math.imul(h ^ c.codePointAt(0), 16777619);
    return COULEURS[(h >>> 0) % COULEURS.length];
  }
  // texte lisible sur cette couleur
  function encre(hex){
    const v = parseInt(hex.slice(1), 16), r = v >> 16, g = v >> 8 & 255, b = v & 255;
    return (0.299 * r + 0.587 * g + 0.114 * b) > 165 ? "#150d4a" : "#ffffff";
  }
  return {salleEcran, nouvelleSalle, salleManette, connecter, brokerPerso, couleur, encre};
})();
