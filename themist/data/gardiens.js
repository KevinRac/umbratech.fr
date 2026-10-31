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
  version:2,
  actif:{1:true,2:true,3:true},
  echelle:{solide:1.15,silhouette:3.5,prolongements:0.35},
  // copie (G13, G3) : la couleur de ta forme que prend la lueur d'un gardien quand il te copie (masque de la Mère-Brume, battant du Héraut, œil du Glas). Par défaut
  // la couleur de la forme (CRGB). Deux formes tombaient à moins de ΔE 25 d'un télégraphe : Lumière (or, 23,5 de l'orange des zones) et Héraut (bleu clair, 20,7 du cyan
  // de saisie) ; leur teinte est éclaircie (même famille de couleur, ΔE ≈ 26 de chaque télégraphe). Le banc vérifie les quatre (capture-lisibilite.mjs).
  copie:{lum:[244,191,91],her:[190,215,255]},
  // scène (action 6, G9, G10, G14) : mortS = durée de la mort d'un gardien, en secondes (la purge de la salle et l'écran de victoire ne l'attendent pas). L'entrée tient dans la bannière
  // (2,2 s, 0,3 s en mode d'essai), rien de plus. Mouvements réduits : fondu seul.
  scene:{mortS:1.5},
  // glyphes (action 7, G11) : un SVG par gardien, 24 × 24, lisible à 16 px (trait d'encre épais, aplats, aucun détail fin ni identifiant ni filtre : il sert de
  // balise inline dans le wiki et d'image dans le HUD, donc XML valide et autonome). 1 : couronne-masque (Mère-Brume) ; 2 : cloche-tête (Héraut Noyé : la cloche
  // sur une robe verte, la lampe d'Ismène dessous) ; 3 : cloche-cœur (Glas Originel : la cloche fendue, la chair dans la fente, l'œil). Ils servent à trois
  // endroits : la porte du gardien (à la place de l'icône), la barre de vie du gardien (à gauche du nom) et les cartes « Les gardiens » du wiki.
  glyphes:{
   1:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><path d="M4.6 10.4L5.4 3.2L9 6.6L12 2.2L15 6.6L18.6 3.2L19.4 10.4Z" fill="#c4aa6e" stroke="#0a0810" stroke-width="1.4" stroke-linejoin="round"/><path d="M5.6 10.2Q12 8.4 18.4 10.2L17.4 17Q16.6 21.4 12 22.6Q7.4 21.4 6.6 17Z" fill="#ded6be" stroke="#0a0810" stroke-width="1.4" stroke-linejoin="round"/><path d="M8.2 12.6H10.9L10.4 16.2H8.8ZM13.1 12.6H15.8L15.2 16.2H13.6Z" fill="#161220"/><path d="M12 17.6V20.4" fill="none" stroke="#161220" stroke-width="1.2" stroke-linecap="round"/><path d="M7.4 11.4Q12 10 16.6 11.4" fill="none" stroke="#fff8e8" stroke-opacity=".7" stroke-width=".8" stroke-linecap="round"/></svg>',
   2:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><path d="M10.2 4.4a1.8 1.8 0 1 1 3.6 0" fill="none" stroke="#0a0810" stroke-width="2.8" stroke-linecap="round"/><path d="M10.2 4.4a1.8 1.8 0 1 1 3.6 0" fill="none" stroke="#b08a4a" stroke-width="1.2" stroke-linecap="round"/><path d="M12 4.6C8.2 4.6 7 8.2 7 11.6C7 14.4 5.8 15.8 4.4 17.4H19.6C18.2 15.8 17 14.4 17 11.6C17 8.2 15.8 4.6 12 4.6Z" fill="#a88a52" stroke="#0a0810" stroke-width="1.4" stroke-linejoin="round"/><path d="M4.4 17.4H19.6V19.4H4.4Z" fill="#6e5a34" stroke="#0a0810" stroke-width="1.3" stroke-linejoin="round"/><path d="M9.2 7.6C8.5 9 8.4 11 8.5 13" fill="none" stroke="#54806a" stroke-width="1.3" stroke-linecap="round"/><path d="M10.6 6.4C9.9 6.9 9.4 7.6 9.2 8.4" fill="none" stroke="#f1e2b0" stroke-opacity=".8" stroke-width=".9" stroke-linecap="round"/><path d="M6 19.4Q12 22 18 19.4L19.6 22.4Q12 23.6 4.4 22.4Z" fill="#2c4a3e" stroke="#0a0810" stroke-width="1.2" stroke-linejoin="round"/><circle cx="12" cy="20.7" r="1.5" fill="#ffc878" stroke="#0a0810" stroke-width=".8"/></svg>',
   3:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><path d="M12 2.4C8 2.4 6.8 6.4 6.8 10.4C6.8 13.8 4.8 15.8 3.4 17.6H20.6C19.2 15.8 17.2 13.8 17.2 10.4C17.2 6.4 16 2.4 12 2.4Z" fill="#6a5430" stroke="#0a0810" stroke-width="1.4" stroke-linejoin="round"/><path d="M3.4 17.6H20.6V20.2Q12 22 3.4 20.2Z" fill="#43331a" stroke="#0a0810" stroke-width="1.3" stroke-linejoin="round"/><path d="M12 3.6C14.8 7.4 15.4 12.4 12 20.4C8.6 12.4 9.2 7.4 12 3.6Z" fill="#b02848" stroke="#0a0810" stroke-width="1" stroke-linejoin="round"/><circle cx="12" cy="11.2" r="2.5" fill="#eee8da" stroke="#0a0810" stroke-width="1.1"/><circle cx="12" cy="11.2" r="1" fill="#0a0810"/><path d="M8.2 6.8C7.8 8.4 7.9 10 8 11.4" fill="none" stroke="#caa56a" stroke-opacity=".7" stroke-width=".9" stroke-linecap="round"/></svg>'},
  // Mère-Brume (G6) : Mahaut et son enfant. brume : sa matière (gris-bleu perle, plus de mauve : loin du violet de ses tirs) ; os : masque, côtes,
  // doigts ; or : la couronne, or pâle terni. lueur : nacrée, seulement le cœur-cloche et le ballot ; yeux : ses sept yeux, perle froide ; nu : le rouge du troisième temps (cœur-cloche
  // et ses fissures). enfant : le ballot de brume sans visage, bercé au premier temps (faux : sans enfant). pointes : les deux pointes de couronne
  // qui tombent au troisième temps (0 à 6, de gauche à droite) et restent au sol. transS : durée d'une transformation.
  // faible (les trois gardiens, G5) : le point faible, tel que le wiki le nomme ; un même anneau ivoire l'entoure quand le gardien est à nu.
  1:{matiere:{brume:[150,160,180],os:[222,214,190],or:[196,170,110]},lueur:[245,240,230],yeux:[214,226,250],nu:[255,96,96],enfant:true,pointes:[1,5],transS:0.6,
   entree:'la brume se condense et la silhouette se forme de bas en haut',
   mort:'elle tombe à genoux, bras vides, et se défait en brume qui monte',
   faible:'le cœur-cloche de la Mère-Brume',
   lecture:'Mahaut berce son enfant, un ballot de brume sans visage. Au deuxième temps, le voile tombe et l’enfant se défait en filets de brume autour d’elle ; quand elle te copie, son masque prend la couleur et l’emblème de ta forme. Au troisième, les bras vides, la couronne brisée : son cœur-cloche est à nu.'},
  // Héraut Noyé (G7) : Élias sous sa cloche. La cloche est sa tête, fondue sur ses épaules ; sa robe ruisselle ; il tire les cordes qui montent au
  // haut de la salle ; à sa ceinture, la lampe d'Ismène (lueur, ambre). eau : vert d'algue, loin du cyan de la saisie. reflets : les trois yeux sous
  // la lèvre (eyePts, même place). fente : ouverture des deux moitiés de la cloche au troisième temps (radians). transS : durée d'une transformation.
  2:{matiere:{bronze:[110,96,60],eau:[70,190,150],chair:[104,130,116],patine:[84,128,100],robe:[28,44,38],corde:[134,116,80]},lueur:[255,200,120],
   entree:'il est hissé de l’ombre, cloche en avant, un coup de cloche sourd à l’arrivée',
   mort:'il s’enfonce ; la lampe d’Ismène reste allumée un instant, puis s’éteint doucement',
   faible:'le battant du Héraut Noyé',
   reflets:[214,236,196],fente:0.15,transS:0.6,
   lecture:'Élias sous sa cloche : elle est devenue sa tête, il en tire encore les cordes, la lampe d’Ismène à la ceinture. Au deuxième temps, une corde casse ; au troisième, la cloche se fend sur son visage noyé et le battant pend à nu. Quand il te copie, le battant luit de la couleur de ta forme.'},
  // Glas Originel (G8) : la cloche devenue cœur. plaques : morceaux de bronze (2 éclatent au deuxième temps, les autres tombent au troisième et
  // restent au sol, éteints, jusqu'à sa mort). arteres : nombre d'artères qui le suspendent au haut de la salle. transS : durée d'une transformation.
  3:{matiere:{bronze:[90,70,40],chair:[110,24,40],sang:[34,6,12],os:[220,206,180],patine:[86,124,104]},lueur:[200,40,60],oeil:[238,232,218],
   entree:'la cloche descend du haut de la salle au premier battement',
   mort:'le cœur bat trois fois, de plus en plus lentement, et s’arrête',
   faible:'l’œil du Glas Originel',
   plaques:7,arteres:4,transS:0.6,
   // wiki (section « Les gardiens », carte de la faille) : ce qu'on lit à l'œil, temps par temps ; affiché seulement si actif
   lecture:'Une cloche de bronze fendue, l’œil dans la fente. Au deuxième temps, le bronze éclate et la chair se voit ; au troisième, les plaques tombent : le cœur est à nu. Quand il te copie, son œil luit de la couleur de ta forme.'}
 }
};})(window.BRUME_DATA=window.BRUME_DATA||{});
