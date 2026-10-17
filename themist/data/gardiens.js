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
 // Attaques des gardiens II et III. file : ordre des attaques par temps (1, 2, 3), mélangé à chaque tour.
 // Clés reprises du code : glas (anneaux du Héraut), charge, summon, ring, spiral, sweep, drain. Nouvelles : maree, maree2, cloches, implosion.
 // degats : multiplicateur des dégâts du gardien. Durées en secondes, distances en pixels.
 attaques:{
  2:{file:[null,['glas','maree','cloches','charge'],['glas','maree','cloches','charge','summon','cloches'],['maree2','cloches','glas','charge','maree','summon']],
   liste:{
    maree:{n:'Marée noire',d:'Un mur d’eau noire à crête d’écume traverse la salle d’un bord à l’autre. Une brèche y reste ouverte, signalée par un halo clair : glisse-toi dedans ou esquive au travers.',vitesse:320,largeur:56,breche:160,preavisS:1.1,degats:1.2},
    maree2:{n:'Double marée',d:'Au troisième temps, deux vagues se suivent, l’une en travers de l’autre. Chacune a sa brèche.',ecartS:1.3},
    cloches:{n:'Cloches noyées',d:'Des cercles orange marquent où tombent les cloches, là où tu vas. Sors-en. Elles écrasent aussi les ennemis : attire-les dessous.',nombre:[0,3,4,6],intervalleS:0.35,preavisS:0.95,rayon:72,degats:1.1},
    glas:{n:'Glas',d:'Il sonne : des anneaux s’élargissent depuis sa cloche. Esquive au travers au moment où l’anneau passe.'},
    charge:{n:'Ruée',d:'Il se fige, puis fonce vers toi. S’il heurte un mur ou un pilier, il est sonné et subit +50 % de dégâts.'},
    summon:{n:'Appel',d:'Il appelle Rampants, Hurleur et Bouffis.'}}},
  3:{file:[null,['implosion','spiral','summon'],['ring','implosion','spiral','summon','sweep','drain'],['spiral','implosion','sweep','sweep','drain','implosion']],
   liste:{
    implosion:{n:'Battement inverse',d:'Des anneaux orange partent des murs et se resserrent vers le Cœur. Esquive au travers quand ils te rejoignent.',nombre:[0,1,2,3],ecartS:0.6,rayon:640,vitesse:250,degats:0.8},
    battement:{n:'Battement',d:'À chaque battement, un anneau violet part du Cœur. Il bat plus vite au troisième temps.'},
    ring:{n:'Couronne',d:'Deux couronnes de tirs violets, l’une après l’autre.'},
    spiral:{n:'Spirale',d:'Trois bras de tirs violets tournent autour du Cœur.'},
    sweep:{n:'Faisceaux',d:'Des lignes orange pointillées annoncent des faisceaux qui balaient la salle. Quand ils s’arrêtent, le Cœur s’épuise : frappe.'},
    drain:{n:'Dévoreuse',d:'La Brume dévore ta lumière quelques secondes.'},
    summon:{n:'Appel',d:'Il appelle Voilés, Rampants et Bouffis.'}}}},
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
