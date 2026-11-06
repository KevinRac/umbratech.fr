// La Brume · données des gardiens de la descente : actes IV à IX, et plus tard les deux miniboss de l'acte X (chantier v18, action 6 ;
// cadrage _dev/cadrages/la-brume-v18-6-gardiens-cadrage.md, Q1–Q25, validé le 6 novembre 2026). Source unique : le jeu (index.html) les lit ;
// le wiki les lira quand un gardien sera allumé (rien tant que tous sont éteints).
// Les actes I à III et leurs gardiens restent dans data/gardiens.js (on n'y touche pas) ; la structure de la descente reste dans data/descente.js.
// Logique pure : bloc /*gar:pur*/ d'index.html, vérifiée par outils/sim-gardiens.mjs. Jeu : bloc « v18.14 · Les gardiens de la descente ».
// Interrupteur (Q2) : actif, gardien par gardien. Faux : sa place reste provisoire (le Masqué renforcé de descente.js, porte « garde »), au tirage près.
// Vrai : la dernière salle de son acte devient une vraie salle de gardien (porte « boss »). Le mode d'essai (?gardien=<acte>) l'ouvre même éteint.
(function(D){D.gardiensD={
 // ── Ce qui vaut pour tous les gardiens de la descente
 commun:{
  // Q9 · PV neutres : PV = DPS médian des quatre formes contre le mannequin (au build de référence de l'acte) × frappeS, arrondi à 100.
  frappeS:50,
  // Q10 · dégâts neutres : chaque coup retire une part des PV du build de référence de l'acte (pvRef ci-dessous) ; jamais plus de partMax.
  // contact : la part du coup au contact de son corps.
  partMax:0.3,contact:0.08,
  // Aucune mort sans signe : préavis d'une zone de gardien, au moins (s). Justice : la vitesse à pied et le réflexe du joueur pour chercher une sortie
  // (les mêmes que le Masqué : souvenirs-brume.js, justice) ; sortie : pas de recherche (px) et nombre de variantes essayées (comme le Brumeux).
  preavisMin:0.8,
  sortie:{pas:6,essais:4,grille:20,marge:15},
  // Q6 · trois temps en Normal (seuils de PV, fractions) ; le temps de plus de Difficile et d'Extrême se pose sous le seuil propre à chaque gardien.
  seuils:[0.66,0.33],
  // Q9 · le build de référence de chaque acte : niveau = la médiane du niveau atteint à l'entrée de la salle du gardien par une descente purgée
  // (_dev/bancs/mesure-gardiens.mjs niveau) ; talents : la liste du build de référence du Brumeux (brumeux.js, bot.reference), dans son ordre,
  // un point par niveau gagné, chaque talent pris jusqu'à son rang maximum avant le suivant ; un objet commun par emplacement (la même liste).
  // pvRef : PV médians des quatre formes au build de référence de l'acte (la base des parts de dégâts). Mesurés en 6.1a (memoire.md, § 44) :
  // 95 / 166 / 104,5 / 95 (Lumenarque, Gouffre, Héraut, Tisse-Destin) à chacun des actes IV à IX : le niveau ne les change pas, et les dix talents
  // de la liste sont déjà au rang maximum dès l'acte IV (26 points pour 22 rangs). Le build de référence est donc le même de l'acte IV à l'acte IX.
  reference:{niveaux:{4:27,5:33,6:38,7:43,8:49,9:55},pvRef:{4:100,5:100,6:100,7:100,8:100,9:100}},
  // Q25 · l'échelle : les crans de l'échelon de chaque gardien ne baissent jamais d'un acte au suivant (le préavis, lui, ne monte jamais), au moins un
  // devient plus dur, et chaque gardien demande au moins une habileté qu'aucun gardien d'avant ne demandait. Les gardiens I à III servent de repères.
  // temps : temps en Normal ; contraintes : ce qu'il fait peser à la fois ; enchainements : coups d'un geste composé ; preavis : le plus court (s) ;
  // entourage : 0 rien, 1 invoqués simples, 2 invoqués qui ont un rôle, 3 un terrain qui agit.
  echelle:{
   reperes:{
    1:{nom:'La Mère-Brume',temps:3,contraintes:1,enchainements:1,preavis:0.8,entourage:1,habiletes:['copie']},
    2:{nom:'Le Héraut Noyé',temps:3,contraintes:1,enchainements:1,preavis:0.8,entourage:1,habiletes:['traverser']},
    3:{nom:'Le Glas Originel',temps:3,contraintes:2,enchainements:1,preavis:0.8,entourage:1,habiletes:['traverser','motifs']}},
   // les habiletés connues (une habileté neuve s'ajoute ici avec son gardien)
   habiletes:{copie:'lire ce qu’il copie de toi',traverser:'traverser au bon moment',motifs:'lire des motifs de tirs',espace:'être au bon endroit : lire et franchir des obstacles'}}},
 // ── Acte IV, « Les Bas-Fonds » : le Guet Sans-Nom (partie B du cadrage). Action 6.1a : le socle seulement : ÉTEINT, et ses attaques sont encore
 // celles du gardien d'essai (essai:true : deux gestes connus, une silhouette simple) ; son combat, son dessin, ses portraits et sa ligne de wiki
 // viennent avec l'action 6.1b. Rien de lui n'est montré hors du mode d'essai tant qu'actif est faux.
 4:{actif:false,essai:true,acte:4,nom:'Le Guet Sans-Nom',un:'le Guet Sans-Nom',
  rayon:50,vitesse:58,xp:100,
  // PV (Q9, Q24) : la règle, sur la mesure de 6.1a : DPS médian contre le mannequin 383 PV/s (Lumenarque 550, Gouffre 337, Héraut 429,
  // Tisse-Destin 112) × 50 s = 19 200 (memoire.md, § 44 ; à remesurer en 6.1b si son corps ou sa présence changent le mannequin)
  pv:19200,
  temps:{titres:['Qui va là ?','Il ne te reconnaît pas','La herse tombe','Couvre-feu']},
  // Q6, Q20 : le temps de plus (Difficile, Extrême), sous ce seuil de PV
  tempsEnPlus:{seuil:0.18,n:'Couvre-feu'},
  // échelon (Q25), d'après ses attaques de la partie B du cadrage : la herse reste debout pendant le Contrôle (deux contraintes à la fois), la Croix et
  // la Rafle en deux coups, la Vouge à 0,8 s (son préavis le plus court). Le tableau de Q25 (« une contrainte, 1,0 à 1,2 s ») le plaçait sous le Glas :
  // la règle validée (aucun cran ne baisse) l'aurait refusé ; ces valeurs-ci la respectent (l'enchaînement monte). memoire.md, § 44.
  echelon:{temps:3,contraintes:2,enchainements:2,preavis:0.8,entourage:1},
  habiletes:['espace'],
  faible:'le registre du Guet Sans-Nom',
  // Q4 : le décor de sa salle seulement (le reste de l'acte garde celui du Cœur) : thème (teinte, saturation, luminosité du sol ; accent, poussières,
  // brume) ; flaques et grilles d'égout peintes une fois avec le sol
  decor:{theme:'basfonds',palette:{h:150,s:8,l:15,acc:'150,170,130',mote:'#c4d2b4',mist:'120,140,125'},flaques:9,grilles:4},
  // couleurs (Q21, à mesurer en 6.1b contre toute la grammaire) : la matière de la silhouette d'essai et sa lumière
  couleurs:{etain:[128,132,140],cire:[38,46,52],rouille:[120,72,44],lueur:[160,176,128]},
  // glyphe de travail (24 × 24, XML valide et autonome, sans identifiant ni filtre) : une herse derrière un ovale d'étain sans traits
  glyphe:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><path d="M3.5 3.5H20.5V21H3.5Z" fill="#2a2e33" stroke="#0a0810" stroke-width="1.4" stroke-linejoin="round"/><path d="M7.5 3.5V21M12 3.5V21M16.5 3.5V21M3.5 9H20.5M3.5 15H20.5" fill="none" stroke="#7a4a2c" stroke-width="1.8"/><path d="M12 6.4C9.3 6.4 8 8.7 8 11.6C8 15 9.7 17.6 12 17.6C14.3 17.6 16 15 16 11.6C16 8.7 14.7 6.4 12 6.4Z" fill="#9aa0a8" stroke="#0a0810" stroke-width="1.3"/><path d="M10 9.2Q12 8.4 14 9.2" fill="none" stroke="#e4e6ea" stroke-opacity=".6" stroke-width=".9" stroke-linecap="round"/></svg>',
  // les attaques. Gardien d'essai (6.1a) : deux gestes connus. forme : une des neuf formes ; preavis (s, ≥ preavisMin) ; part (des PV du build de
  // référence de l'acte) ; cible : 'toi' (centrée sur toi) ou 'lui' (part de lui vers toi). disque : r ; couloir : w (largeur), len (longueur).
  attaques:{
   coup:{n:'Coup d’essai',d:'Un cercle orange se remplit sous toi : sors-en.',forme:'disque',cible:'toi',r:105,preavis:1.0,part:0.15},
   trait:{n:'Trait d’essai',d:'Un couloir orange part de lui vers toi : sors de sa ligne.',forme:'couloir',cible:'lui',w:70,len:900,preavis:1.0,part:0.15}},
  // file par temps (mélangée à chaque tour, jamais deux fois la même de suite) ; 4 : le temps de plus
  file:{1:['coup','trait','coup','trait'],2:['coup','trait','coup','trait'],3:['coup','trait','coup','trait'],4:['coup','trait','coup','trait']},
  // le rythme : entracte entre deux gestes (s, par temps), et la relâche après une file entière (sonné : +50 %, l'anneau ivoire sur son point faible)
  rythme:{entracteS:[0,1.1,0.9,0.75,0.6],relacheS:2},
  dessin:{version:0}}
};})(window.BRUME_DATA=window.BRUME_DATA||{});
