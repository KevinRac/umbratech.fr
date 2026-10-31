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
    summon:{n:'Appel',d:'Il appelle Voilés, Rampants et Bouffis.'}},
   // v17.22 · Le Glas se souvient (palier 3 de la Mémoire). Hors de file et de liste : le wiki ne les lit pas et ne dit pas d'où cela vient.
   // Quand ta réserve contient des souvenirs qui ont une arme de la Brume, il en tire un répertoire à l'entrée de sa salle (max gestes de familles
   // différentes et compatibles, pondérés vers les plus récemment oubliés : recence = [poids du plus ancien, du plus récent] ; usure ignorée).
   // repertoire[temps] : gestes joués à ce temps (les premiers du répertoire, à tour de rôle). file[temps] : une clé « brume » à la place
   // d'une occurrence de chaque attaque de remplace, plus ajoute (jamais deux de suite, ni juste après un Appel). Réserve sans geste : rien ne change.
   // Un geste est joué par le Reflet : ta silhouette sortie du Cœur, qui fait l'attaque de la famille (data/souvenirs-brume.js) comme un Masqué
   // porteur, sous la même justice. degats : × les dégâts du Glas (avant la force du souvenir et le plafond). reflet : r (px), naissanceS, finS,
   // distance [min, max] à toi où il naît, vitesse (px/s ; ×1,3 quand il vient te chercher). attenteMaxS : s'il attend plus longtemps qu'une zone
   // du Glas se termine, il renonce. renforts : au plus max souvenirs classés renfort ; Brutal et Vif renforcent le Reflet, Robuste et Blindé
   // retirent reduitBulle des dégâts que le Cœur subit pendant un geste (au plus max × reduitBulle). copie : la copie de la Mère-Brume reste-t-elle
   // aux temps 2 et 3 quand le répertoire existe (faux : le Glas se souvient au lieu d'imiter).
   souvenirs:{max:3,recence:[1,3],repertoire:[0,0,2,3],file:{2:{ajoute:1},3:{remplace:['implosion'],ajoute:1}},degats:0.6,
    reflet:{r:18,naissanceS:0.6,finS:0.4,distance:[180,220],vitesse:126},attenteMaxS:5,renforts:{max:2,reduitBulle:0.1},copie:false}}},
 // Fenêtres de vulnérabilité par forme : cd intervalle de base (s), warn avertissement, label étiquette, toast explication
 fenetres:{
  lum:{cd:9,warn:'Il s’apprête à ouvrir son noyau',label:'Noyau exposé · +30 %',toast:'Il ouvre son noyau à la lumière. Frappe pendant 3 secondes : +30 % de dégâts.'},
  gou:{cd:11,warn:'Sa corruption s’apprête à fuir',label:'Corruption à nu · +30 %',toast:'Sa corruption fuit par à-coups. Frappe pendant 3 secondes : +30 % de dégâts.'},
  her:{cd:10,warn:'Il va se taire : ton rythme peut le percer',label:'Silence rompu · +30 %',toast:'Son silence se fend. Frappe pendant 3 secondes : +30 % de dégâts.'},
  tis:{warn:'Il s’apprête à trancher tes fils',label:'À vif : +30 % de dégâts'}},
 // Fenêtre « à nu » : durée (s) et multiplicateur de dégâts
 aNu:{dureeS:3,mult:1.3},
 // Changement de phase : le gardien se protège (durée en s, part des dégâts subis)
 verrouPhase:{dureeS:1.2,degats:0.15},
 // PV des gardiens (index 1 à 3 = actes I à III). pv : base ; pvMul : multiplicateur d’équilibrage (avant les paliers et les Résonances).
 // v17.10 : plus longs à tuer, ×1,4 (multiplicateurs avant : 1,9 · 1,8 · 1,8). PV au palier 0 : 2 650 · 5 750 · 9 000.
 pv:[0,1000,2300,3600],
 pvMul:[1,2.65,2.5,2.5],
 // v17.12 · Survie du Gouffre, seulement quand un gardien ou un Masqué est en vie dans la salle (son corps à corps l'expose à leurs zones).
 // degatsRecus : × les dégâts qu'il reçoit ; vol : part des dégâts qu'il inflige à un gardien ou à un Masqué qui lui revient en PV (pas sur les dégâts sur la durée).
 survieGouffre:{degatsRecus:0.8,vol:0.05},
 // v17.27 · Les gardiens redessinés (cadrage G1–G18, G15). Dessin seulement : rien du combat ne lit cette clé (PV, attaques, rayon de touche inchangés).
 // actif : gardien par gardien (1 Mère-Brume, 2 Héraut Noyé, 3 Glas Originel) ; faux = l'ancien dessin. version : change quand un portrait doit être refait (G11).
 // echelle (G2, × le rayon de touche) : solide = le corps plein tient dans ce disque ; silhouette = hauteur visée ; prolongements = opacité maximale
 // de ce qui dépasse du corps (artères, cordes, brume, plaques tombées), pour qu'on ne le prenne jamais pour le corps.
 // matiere / lueur (G3) : couleurs [r,g,b] loin des télégraphes (orange zone, violet tirs, cyan saisie) et de la lavande des souvenirs.
 // La couleur de temps (failles.p1 / p3) ne sert plus qu'aux reflets ; le rouge du troisième temps reste sur le point faible.
 dessin:{
  version:1,
  actif:{1:false,2:true,3:true},
  echelle:{solide:1.15,silhouette:3.5,prolongements:0.35},
  1:{matiere:{brume:[150,160,180],os:[222,214,190],or:[196,170,110]},lueur:[245,240,230],enfant:true},
  // Héraut Noyé (G7) : Élias sous sa cloche. La cloche est sa tête, fondue sur ses épaules ; sa robe ruisselle ; il tire les cordes qui montent au
  // haut de la salle ; à sa ceinture, la lampe d'Ismène (lueur, ambre). eau : vert d'algue, loin du cyan de la saisie. reflets : les trois yeux sous
  // la lèvre (eyePts, même place). fente : ouverture des deux moitiés de la cloche au troisième temps (radians). transS : durée d'une transformation.
  2:{matiere:{bronze:[110,96,60],eau:[70,190,150],chair:[104,130,116],patine:[84,128,100],robe:[28,44,38],corde:[134,116,80]},lueur:[255,200,120],
   reflets:[214,236,196],fente:0.15,transS:0.6,
   lecture:'Élias sous sa cloche : elle est devenue sa tête, il en tire encore les cordes, la lampe d’Ismène à la ceinture. Au deuxième temps, une corde casse ; au troisième, la cloche se fend sur son visage noyé et le battant pend à nu.'},
  // Glas Originel (G8) : la cloche devenue cœur. plaques : morceaux de bronze (2 éclatent au deuxième temps, les autres tombent au troisième et
  // restent au sol, éteints, jusqu'à sa mort). arteres : nombre d'artères qui le suspendent au haut de la salle. transS : durée d'une transformation.
  3:{matiere:{bronze:[90,70,40],chair:[110,24,40],sang:[34,6,12],os:[220,206,180],patine:[86,124,104]},lueur:[200,40,60],oeil:[238,232,218],
   plaques:7,arteres:4,transS:0.6,
   // wiki (section « Les gardiens », carte de la faille) : ce qu'on lit à l'œil, temps par temps ; affiché seulement si actif
   lecture:'Une cloche de bronze fendue, l’œil dans la fente. Au deuxième temps, le bronze éclate et la chair se voit ; au troisième, les plaques tombent : le cœur est à nu.'}
 }
};})(window.BRUME_DATA=window.BRUME_DATA||{});
