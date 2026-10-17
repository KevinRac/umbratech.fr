// La Brume · données des pactes et des aides adaptatives
// Source unique : le jeu (index.html) ET le wiki (wiki.html, via outils/wiki.mjs) lisent ce fichier.
// Modifier un texte ou une valeur ici change le jeu et le wiki. Les effets codés (on/off, ok/go) restent dans index.html, rattachés par la clé.
(function(D){D.pactes={
 // Bénéfices proposés par le Brumeux
 benefices:{
  fureur:{n:'Fureur',d:'+30 % de dégâts.'},
  vigueur:{n:'Vigueur',d:'+30 % de PV max (et soin d’autant).'},
  vif:{n:'Vivacité',d:'+20 % de vitesse, esquive 20 % plus rapide à recharger.'},
  avidite:{n:'Avidité',d:'+60 % d’or et une relance de talents.'},
  sangsue:{n:'Sangsue',d:'Tes coups te soignent de 3 % des dégâts infligés.'}},
 // Contraintes. ax/hi : l'axe du profil de style visé (hi:true = pénalise si l'axe est haut) ; why : ce qui la déclenche
 contraintes:{
  brume:{n:'Brume dense',d:'La Brume s’épaissit dans chaque salle : tu vois moins loin.',ax:'portee',hi:true,why:'tu frappes de loin'},
  lourd:{n:'Pas lourds',d:'Ton esquive met 35 % plus de temps à se recharger.',ax:'esquive',hi:true,why:'tu esquives sans cesse'},
  avare:{n:'Brume avare',d:'Les soins que tu reçois sont réduits de moitié.',ax:'soin',hi:true,why:'tu te soignes beaucoup'},
  meute:{n:'Meute',d:'Chaque salle de combat compte deux Rampants de plus.',ax:'rythme',hi:true,why:'tu purges les salles vite'},
  heurts:{n:'Heurts',d:'Les coups au corps à corps te font 25 % de dégâts en plus.',ax:'portee',hi:false,why:'tu frappes au contact'},
  fragile:{n:'Fragilité',d:'Tu subis 20 % de dégâts en plus.',ax:'risque',hi:false,why:'tu restes prudent'}},
 // Aides adaptatives proposées quand tu bloques
 aides:{
  tele:{n:'Télégraphes renforcés',d:'Les zones d’attaque ressortent davantage jusqu’à la fin de la run.'},
  clem:{n:'Brume clémente',d:'−20 % de dégâts subis jusqu’à la fin de cette salle.'},
  lent:{n:'Phase ralentie',d:'Les ennemis présents sont 15 % plus lents et le gardien attaque plus lentement dans cette salle.'},
  souffle:{n:'Un souffle de lumière',d:'Tu récupères 40 % de tes PV, une seule fois.'}},
 // Raisons affichées avec l'offre d'aide
 raisons:{coups:'Tu encaisses beaucoup de coups d’affilée.',pv:'Tes forces sont presque épuisées.',spot:'Ce passage t’a déjà arrêté plusieurs fois.',hesite:'Tu sembles chercher ton souffle.'},
 // Règles des offres d'aide
 aide:{offresParRun:2,ecartS:50,dureeOffreS:14,refusAvantArret:3}
};})(window.BRUME_DATA=window.BRUME_DATA||{});
