// La Brume · données des actes et des gardiens
// Source unique : le jeu (index.html) ET le wiki (wiki.html, via outils/wiki.mjs) lisent ce fichier.
// Modifier un texte ou une valeur ici change le jeu et le wiki. Les attaques et l'IA des gardiens restent dans index.html.
(function(D){D.gardiens={
 // Actes I, II, III : nom, nombre de salles, gardien, phrase de victoire
 actes:[
  {name:'Les Faubourgs Engloutis',rooms:7,boss:'La Mère-Brume',done:'La Mère-Brume est vaincue'},
  {name:'Les Cryptes Chantantes',rooms:6,boss:'Le Héraut Noyé',done:'Le Héraut Noyé est vaincu'},
  {name:'Le Cœur de la Brume',rooms:7,boss:'Le Glas Originel',done:'Le Glas Originel se tait'}],
 // Mère-Brume (acte I), deuxième temps : elle copie ce que tu fais le plus
 copies:{
  volee:{what:'tes coups à distance',hint:'Elle tire des salves visées : les lignes violettes montrent où elles partent.'},
  balayage:{what:'ton corps à corps',hint:'Elle fond sur toi et balaie devant elle : sors du cône orange.'},
  esquive:{what:'ton esquive',hint:'Elle se dérobe à tes coups et resurgit près de toi : quitte le cercle orange.'}},
 // Héraut Noyé (2) et Glas Originel (3) : couleurs (p1 premier temps, p3 troisième), titres des temps 1 et 3, faille du troisième temps
 failles:{
  2:{p1:[90,220,210],p3:[255,96,96],l1:'Il t’écoute',l3:'La cloche se fend',t3:'La cloche se fend et la brume se retire : son battant est à nu, +25 % de dégâts. Il sonne plus vite.'},
  3:{p1:[210,170,255],p3:[255,90,120],l1:'Il bat pour toi',l3:'La Brume se retire',t3:'La Brume se retire du Cœur : il est à nu, +25 % de dégâts. Il bat plus vite.'}},
 // Fenêtres de vulnérabilité par forme : cd intervalle de base (s), warn avertissement, label étiquette, toast explication
 fenetres:{
  lum:{cd:9,warn:'Il s’apprête à ouvrir son noyau',label:'Noyau exposé · +30 %',toast:'Il ouvre son noyau à la lumière. Frappe pendant 3 secondes : +30 % de dégâts.'},
  gou:{cd:11,warn:'Sa corruption s’apprête à fuir',label:'Corruption à nu · +30 %',toast:'Sa corruption fuit par à-coups. Frappe pendant 3 secondes : +30 % de dégâts.'},
  her:{cd:10,warn:'Il va se taire : ton rythme peut le percer',label:'Silence rompu · +30 %',toast:'Son silence se fend. Frappe pendant 3 secondes : +30 % de dégâts.'},
  tis:{warn:'Il s’apprête à trancher tes fils',label:'À vif : +30 % de dégâts'}},
 // Fenêtre « à nu » : durée (s) et multiplicateur de dégâts
 aNu:{dureeS:3,mult:1.3},
 // Changement de phase : le gardien se protège (durée en s, part des dégâts subis)
 verrouPhase:{dureeS:1.2,degats:0.15}
};})(window.BRUME_DATA=window.BRUME_DATA||{});
