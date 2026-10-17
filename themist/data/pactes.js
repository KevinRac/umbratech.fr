// La Brume · données des pactes et des aides adaptatives
// Source unique : le jeu (index.html) ET le wiki (wiki.html, via outils/wiki.mjs) lisent ce fichier.
// Modifier un texte ou une valeur ici change le jeu et le wiki. Les effets codés (on/off, ok/go) restent dans index.html, rattachés par la clé.
(function(D){D.pactes={
 // Bénéfices proposés par le Brumeux. ic : icône (data/icones.js) ; v : valeur courte affichée en gros sur la carte
 benefices:{
  fureur:{n:'Fureur',ic:'u_sword',v:'+30 % de dégâts',d:'+30 % de dégâts.'},
  vigueur:{n:'Vigueur',ic:'u_heart',v:'+30 % de PV max',d:'+30 % de PV max (et soin d’autant).'},
  vif:{n:'Vivacité',ic:'u_bolt',v:'+20 % de vitesse',d:'+20 % de vitesse, esquive 20 % plus rapide à recharger.'},
  avidite:{n:'Avidité',ic:'u_coin',v:'+60 % d’or · +1 relance',d:'+60 % d’or et une relance de talents.'},
  sangsue:{n:'Sangsue',ic:'u_drop',v:'3 % de vol de vie',d:'Tes coups te soignent de 3 % des dégâts infligés.'}},
 // Contraintes. ax/hi : l'axe du profil de style visé (hi:true = pénalise si l'axe est haut) ; why : ce qui la déclenche
 contraintes:{
  brume:{n:'Brume dense',ic:'u_fog',v:'Vue réduite',d:'La Brume s’épaissit dans chaque salle : tu vois moins loin.',ax:'portee',hi:true,why:'tu frappes de loin'},
  lourd:{n:'Pas lourds',ic:'u_weight',v:'Esquive 35 % plus lente',d:'Ton esquive met 35 % plus de temps à se recharger.',ax:'esquive',hi:true,why:'tu esquives sans cesse'},
  avare:{n:'Brume avare',ic:'u_heart_x',v:'Soins réduits de moitié',d:'Les soins que tu reçois sont réduits de moitié.',ax:'soin',hi:true,why:'tu te soignes beaucoup'},
  meute:{n:'Meute',ic:'u_swarm',v:'+2 Rampants par salle',d:'Chaque salle de combat compte deux Rampants de plus.',ax:'rythme',hi:true,why:'tu purges les salles vite'},
  heurts:{n:'Heurts',ic:'u_fist',v:'Corps à corps : +25 % reçus',d:'Les coups au corps à corps te font 25 % de dégâts en plus.',ax:'portee',hi:false,why:'tu frappes au contact'},
  fragile:{n:'Fragilité',ic:'u_shield_x',v:'+20 % de dégâts subis',d:'Tu subis 20 % de dégâts en plus.',ax:'risque',hi:false,why:'tu restes prudent'}},
 // Aides adaptatives proposées quand tu bloques
 aides:{
  tele:{n:'Télégraphes renforcés',ic:'u_target',v:'Zones plus visibles',d:'Les zones d’attaque ressortent davantage jusqu’à la fin de la run.'},
  clem:{n:'Brume clémente',ic:'u_shield',v:'−20 % de dégâts subis',d:'−20 % de dégâts subis jusqu’à la fin de cette salle.'},
  lent:{n:'Phase ralentie',ic:'u_hourglass',v:'Ennemis plus lents',d:'Les ennemis présents sont 15 % plus lents et le gardien attaque plus lentement dans cette salle.'},
  souffle:{n:'Un souffle de lumière',ic:'u_heart',v:'+40 % de PV, une fois',d:'Tu récupères 40 % de tes PV, une seule fois.'}},
 // Raisons affichées avec l'offre d'aide
 raisons:{coups:'Tu encaisses beaucoup de coups d’affilée.',pv:'Tes forces sont presque épuisées.',spot:'Ce passage t’a déjà arrêté plusieurs fois.',hesite:'Tu sembles chercher ton souffle.'},
 // Règles des offres d'aide
 aide:{offresParRun:2,ecartS:50,dureeOffreS:14,refusAvantArret:3}
};})(window.BRUME_DATA=window.BRUME_DATA||{});
