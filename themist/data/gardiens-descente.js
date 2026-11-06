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
  // contact (décision de l'auteur en 6.1b) : plus rare (une fois par contactS au plus) et il te repousse (contactRecul px), pour qu'on ne reste pas collé
  contactS:1.2,contactRecul:40,
  // Aucune mort sans signe : préavis d'une zone de gardien, au moins (s). Justice : la vitesse à pied et le réflexe du joueur pour chercher une sortie
  // (les mêmes que le Masqué : souvenirs-brume.js, justice) ; sortie : pas de recherche (px) et nombre de variantes essayées (comme le Brumeux).
  preavisMin:0.8,
  // un tir à trajectoire annoncée (ligne violette, la grammaire des tirs) : sa ligne dure au moins preavisTir avant le départ (il vole ensuite)
  preavisTir:0.6,
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
 // ── Acte IV, « Les Bas-Fonds » : le Guet Sans-Nom (partie B du cadrage, Q16–Q24 ; action 6.1b, v18.15 : allumé). Le garde de la Porte Basse : sa
 // fille lui a demandé qui il était ; il est descendu garder la dernière porte de la ville. Son idée de jeu : la porte (il ferme, il contrôle, il
 // rouvre). Habileté neuve (Q25) : l'espace, être au bon endroit avant que la porte se ferme.
 4:{actif:true,essai:false,acte:4,nom:'Le Guet Sans-Nom',un:'le Guet Sans-Nom',
  rayon:50,vitesse:58,xp:100,
  // PV (Q9, Q24) : la règle, remesurée en 6.1b avec son vrai corps : DPS médian contre le mannequin 391,9 PV/s (Lumenarque 553,6, Gouffre 333,6,
  // Héraut 450,2, Tisse-Destin 112,3) × 50 s = 19 600 (6.1a : 383 → 19 200 ; l'écart vient du Héraut). memoire.md, § 45.
  pv:19600,
  banniere:'Qui va là ?',
  temps:{titres:['Qui va là ?','Il ne te reconnaît pas','La herse tombe','Couvre-feu']},
  // Q6, Q20 : le temps de plus (Difficile, Extrême), sous ce seuil de PV : le Couvre-feu (ses herses ne se relèvent plus toutes)
  tempsEnPlus:{seuil:0.18,n:'Couvre-feu',d:'ses herses ne se relèvent plus toutes'},
  // échelon (Q25) : la herse reste debout pendant le Contrôle (deux contraintes à la fois), la Croix, la Rafle et la Vouge du troisième temps en deux
  // coups, la Vouge à 0,8 s (son préavis de zone le plus court). memoire.md, § 44.
  echelon:{temps:3,contraintes:2,enchainements:2,preavis:0.8,entourage:1},
  habiletes:['espace'],
  faible:'le registre du Guet Sans-Nom',
  // Q4 : le décor de sa salle seulement (le reste de l'acte garde celui du Cœur) : thème (teinte, saturation, luminosité du sol ; accent, poussières,
  // brume) ; flaques et grilles d'égout peintes une fois avec le sol. Sol assombri en 6.1b (l 15 → 9) : contraste du corps ≥ 4,5 (Q7).
  decor:{theme:'basfonds',palette:{h:150,s:8,l:9,acc:'150,170,130',mote:'#c4d2b4',mist:'110,130,115'},flaques:9,grilles:4},
  // couleurs (Q21, mesurées en 6.1b : ΔE ≥ 25 de toute la grammaire, sim-gardiens ; contraste contre son sol, banc F). Le ciré est délavé par l'eau
  // (plus clair que « ciré sombre » du cadrage : sombre, il tombait sous le contraste 4,5 du sol des Bas-Fonds). eau : ce qu'il devient à sa mort.
  // reflet (6.1c) : les rivets, le fil du fer de la vouge, le reflet du visage (écrits en blanc dans le dessin, ils tombaient à ΔE 15 à 19 de l'ivoire du
  // point faible)
  couleurs:{etain:[150,156,166],visage:[172,178,186],cire:[150,162,156],rouille:[132,80,50],parchemin:[170,150,110],eau:[62,84,70],lueur:[160,176,128],reflet:[176,188,204]},
  // glyphe (24 × 24, XML valide et autonome, sans identifiant ni filtre ; lisible à 16 px) : une herse derrière un ovale d'étain sans traits
  glyphe:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><path d="M3.5 3.5H20.5V20.5H3.5Z" fill="#23282b" stroke="#0a0810" stroke-width="1.5" stroke-linejoin="round"/><path d="M7.5 3.5V22M12 3.5V22M16.5 3.5V22M3.5 9H20.5M3.5 15H20.5" fill="none" stroke="#a0603a" stroke-width="2"/><path d="M12 6.2C9.2 6.2 7.9 8.6 7.9 11.6C7.9 15.1 9.6 17.8 12 17.8C14.4 17.8 16.1 15.1 16.1 11.6C16.1 8.6 14.8 6.2 12 6.2Z" fill="#aab0b8" stroke="#0a0810" stroke-width="1.4"/><path d="M10 9.1Q12 8.3 14 9.1" fill="none" stroke="#eef0f2" stroke-opacity=".7" stroke-width="1" stroke-linecap="round"/></svg>',
  // ── la herse (Q17) : une ligne d'un mur à l'autre, verticale ('v', x fixe) ou horizontale ('h', y fixe), un guichet (passage clair, entre les bords des
  // barreaux) par tronçon (un tronçon : la ligne entre deux herses qui la croisent). Tombée, elle arrête les corps (toi, ses invoqués ; lui la
  // traverse : c'est sa porte), pas les tirs. w : largeur du couloir de préavis ; disque : barreaux (rayon, pas) ; dureeS : debout, par temps ;
  // bord : distance minimale aux murs ; ecart : entre deux herses parallèles ; autour : la herse tombe à ±autour de toi ; guichet : passage clair ;
  // gDe : distance (le long de la herse) entre ta projection et le guichet de ton tronçon ; coin : marge du guichet aux bouts du tronçon ;
  // couvreFeu : herses debout au plus après une Relève (Couvre-feu), et au plus au total quand une Fermeture tombe ; connexite : part de la salle libre
  // atteinte depuis toi, au moins.
  herse:{w:30,disque:{r:10,pas:16},dureeS:{1:4.5,2:5.5,3:5.5,4:5.5},bord:{v:240,h:160},ecart:240,autour:{v:110,h:80},guichet:120,gDe:[40,200],coin:20,
   chuteS:0.15,releveS:0.45,hauteur:38,couvreFeu:{garde:2,total:3},connexite:0.85},
  // ── les attaques (Q18). forme : une des neuf formes (ou invocation) ; preavis (s) ; part (des PV du build de référence de l'acte, Q10 ; décision de
  // l'auteur en 6.1b : zones principales à 25 %, jamais au-delà du plafond de 30 %) ; T : réglages par temps. n, d : le nom et la ligne du wiki.
  attaques:{
   herse:{n:'Herse',d:'Une ligne orange traverse la salle : une herse va tomber. Un guichet y reste ouvert. Tombée, elle arrête les corps quelques secondes, pas les tirs.',forme:'couloir',preavis:1.0,part:0.22},
   croix:{n:'Croix de herses',d:'Deux herses à la fois, une en long, une en travers : quatre sections, un guichet dans chaque bout de herse.',forme:'croix',preavis:1.0,part:0.22,decaleT:{3:0.5,4:0.5}},
   controle:{n:'Contrôle',d:'La section où tu te tiens s’emplit d’orange : passe un guichet avant qu’elle se ferme.',forme:'case',preavis:1.2,preavisT:{3:1.0,4:1.0},part:0.25,apresS:0.3},
   rafle:{n:'Rafle',d:'Deux sections, l’une après l’autre : la seconde est en pointillé.',forme:'case',preavis:1.2,preavisT:{3:1.0,4:1.0},seconde:0.6,part:0.22,apresS:0.3},
   vouge:{n:'Vouge',d:'Il fauche devant lui quand tu t’approches : sors du cône.',forme:'cone',ouv:110,r0:0,r1:160,preavis:0.8,part:0.24,atteinte:0.8,approcheS:2,retourT:{3:0.5,4:0.5},decale:35},
   garde:{n:'Garde !',d:'Reste collé à lui et il plante sa vouge : quitte le cercle.',forme:'disque',cible:'lui',r:130,preavis:0.9,part:0.18,colle:{d:110,s:2.5},pres:220},
   feuillets:{n:'Feuillets',d:'Les pages de son registre partent en éventail : les lignes violettes montrent où.',forme:'projectile',nT:{2:5,3:7,4:7},ecart:12,preavis:0.6,v:210,r:8,len:900,part:0.08},
   appel:{n:'Appel du guet',d:'Les Sans-Nom entrent par les guichets ; les herses les arrêtent comme toi.',forme:'invocation',nT:{2:2,3:3,4:3},max:5,types:['rampant','voile','rampant'],preavis:0.9}},
  // ── les Fermetures : une herse (ou une Croix), puis le Contrôle (ou la Rafle) ; puis, quand ses herses se relèvent, la Relève : sonné (Q19)
  fermetures:{fermeture:{herse:'herse',suite:'controle'},croisee:{herse:'croix',suite:'rafle'}},
  releve:{n:'La Relève',d:'Quand il relève la herse, il est sonné : frappe le registre.',sonneS:2,sonneT:{4:1.5}},
  // file par temps (mélangée à chaque tour, jamais deux fois la même de suite) ; 4 : le Couvre-feu (le temps de plus)
  file:{1:['fermeture','vouge','garde','fermeture','vouge'],2:['croisee','feuillets','appel','vouge','fermeture','garde'],3:['croisee','feuillets','vouge','fermeture','appel','garde'],4:['croisee','feuillets','vouge','fermeture','appel','garde']},
  // le rythme : entracte entre deux gestes (s, par temps) ; relacheS 0 : pas de relâche en fin de file (sa fenêtre est la Relève)
  // apresFermeture : la part de l'entracte après le Contrôle (ou la Rafle), herses encore debout (la passe de correction de la friction, § 45)
  rythme:{entracteS:[0,0.95,0.75,0.6,0.5],relacheS:0,apresFermeture:0.5},
  // Q12, Q23 : ce que le wiki en dit (phrase de la carte, lecture à l'œil, entrée et mort) ; Q13 : son entrée de codex est dans histoire.js (id guet)
  wiki:{done:'Le Guet Sans-Nom relève sa herse pour la dernière fois',journal:'Au fond des Bas-Fonds, quelqu’un garde encore la porte.'},
  // Q7, Q21 : le dessin (version : un changement visible la passe à n + 1 et refait les portraits img/gardiens/gardien-4-t<temps>-v<version>.webp)
  // version 2 (6.1c) : un seul calque voilé, ombre resserrée, page du Couvre-feu cuite, reflets loin de l'ivoire, montants des guichets en étain
  dessin:{version:2,
   lecture:'Un guet sans visage, la herse de la Porte Basse sur le dos, un registre enchaîné sur la poitrine. Au deuxième temps, le registre s’ouvre et ses feuillets s’envolent ; au troisième, la herse lui glisse des épaules et reste au sol : le registre est à nu.',
   entree:'une herse remonte du sol, il passe le guichet',mort:'le registre tombe ouvert, il pose le genou, la herse s’abat derrière lui et il se défait en eau trouble',
   quatrieme:'la page de la phrase interrompue se détache du registre et flotte au-dessus de lui'}}
};})(window.BRUME_DATA=window.BRUME_DATA||{});
