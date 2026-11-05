// La Brume · données du Brumeux, le boss final (v18.5, chantier v18, action 5 ; cadrage Q1–Q17 validé le 1er novembre 2026)
// Action 5a : le socle technique. Action 5b (v18.6) : la phase I, « le Rappel » (partition.rappel, gestes signature, tableaux). Action 5c (v18.7) :
// la phase II, « L'Ouvrage » (partition.ouvrage, gestes signature, constructions comme système). Action 5d (v18.8) : la phase III, « La Couture »
// (partition.couture, gestes signature, couture : montages, nœuds, Masqués cousus). Action 5e (v18.9) : la phase IV, « L'Emprunt » (partition.emprunt,
// gestes signature au corps, emprunt : il joue l'arme de la Brume d'un de tes talents portés). Action 5f (v18.10) : la phase V, « L'Effacement »
// (partition.effacement, courte et entière ; effacement : un examen de ce que le combat a montré, l'arène qui se resserre, sa mort). Lu par le jeu (index.html, bloc « v18.5 · Le Brumeux » ; logique
// pure /*brx:pur*/), par outils/sim-brumeux.mjs et par _dev/bancs/banc-brumeux.mjs. Le wiki ne lit de ce fichier rien d'autre que ce que
// l'action 5g y branchera (sa carte, Q16) : ni les phases, ni la partition, ni la lecture, ni les tirages (secret).
// En jeu, rien n'est allumé : l'arène (arene.js, actif:false) reste fermée et le boss final provisoire tient sa place jusqu'à l'action 5g.
// Seul le mode d'essai ouvre le Brumeux : index.html?brumeux=<phase>[&palier=…][&graine=…][&reserve=…][&bot=2][&classe=…].
(function(D){D.brumeux={
 nom:'Le Brumeux',
 // ── Les cinq phases (Q1). id : nom de travail, jamais affiché ; presence : au-dessus de l'arène (mains, croix, fils ; haut) ou au sol (sol) ;
 // faible : ce que l'anneau ivoire entoure (G27.anneau) ; arene : l'état d'arène (data/arene.js, salles.final.etats : 0 pleine, 1 resserrée,
 // 2 bande à fosses ; 3 la phase I réelle, « le Rappel », action 5b ; 4 la phase II réelle, « L'Ouvrage », action 5c ; 5 la phase III réelle, « La Couture »,
 // action 5d ; 6 la phase IV réelle, « L'Emprunt », action 5e ; la phase V, « L'Effacement » (5f), garde l'état 6 : elle se resserre ensuite en 7 et 8, voir
// effacement.resserrements) ; libre : part improvisée visée (indicative, Q8) ;
 // pv : PV de la phase (placeholders, à calibrer au bot à l'action 5g : 50 à 70 s par phase, Q11). Pas de PV ni de dégâts en plus par palier (Q12).
 // exclut : les sortes d'éléments que cette phase ne tire jamais (I : bâtir, c'est la phase II ; V : l'arène se défait, rien n'y est bâti).
 phases:[
  {id:'rappel',presence:'haut',faible:'mains',arene:3,libre:0.25,pv:2400,exclut:['construction']},
  {id:'ouvrage',presence:'haut',faible:'mains',arene:4,libre:0.40,pv:2400},
  {id:'couture',presence:'haut',faible:'croix',arene:5,libre:0.50,pv:2400,exclut:['construction']},
  {id:'emprunt',presence:'sol',faible:'coeur',arene:6,libre:0.50,pv:2400},
  {id:'effacement',presence:'sol',faible:'coeur',arene:6,libre:0.60,pv:2400,exclut:['construction']}],
 // Les dégâts au-delà d'un seuil de phase ne passent pas à la phase suivante (même règle que les gardiens) ; le verrou de phase est celui
 // de data/gardiens.js (verrouPhase : 1,2 s à 15 %). dureeS : la transition entière (verrou, cri, transformation de l'arène, relecture).
 transition:{dureeS:3,cri:true,relecture:true},
 // ── La partition (Q8, option b) : chaque phase est une boucle de mesures, les unes fixes (socle appris), les autres libres (improvisées,
 // retirées à chaque boucle). 5a : une seule partition d'ESSAI, la même pour les cinq phases (chaque fiche 5b à 5f écrit la sienne).
 // Une mesure : {k:'fixe', g:<geste d'essai>} ou {k:'libre'} ; entre deux mesures, l'entracte (s). nu : à nu (anneau ivoire) après la boucle (s).
 // Une partition propre à une phase est un objet {entracteS, nuS, mesures} rangé sous l'id de la phase ; une mesure {k:'tableau'} (phase I) est un
 // tableau convoqué (voir tableaux), tiré à chaque boucle. nuS 0 : pas de fenêtre à nu après la boucle (la phase I l'a après chaque tableau).
 partition:{entracteS:1.6,nuS:2.2,
  essai:[{k:'fixe',g:'disque'},{k:'libre'},{k:'fixe',g:'feinte'},{k:'libre'},{k:'fixe',g:'couloir'},{k:'libre'}],
  // Phase I, « le Rappel » (fiche 5b) : une boucle d'environ 70 s, trois tableaux, trois gestes signature, la feinte, deux mesures libres
  rappel:{entracteS:1.4,nuS:0,mesures:[{k:'tableau'},{k:'fixe',g:'fils'},{k:'libre'},{k:'tableau'},{k:'fixe',g:'feinte'},{k:'fixe',g:'cadre'},{k:'tableau'},{k:'libre'},{k:'fixe',g:'toile'}]},
  // Phase II, « L'Ouvrage » (fiche 5c, § 2) : une boucle d'environ 32 s (bâtir · geste · bâtir · effondrement, avec les Manœuvres, la feinte et deux
  // mesures libres) ; à nu 2,5 s après la boucle. Une mesure {k:'batir'} bâtit une construction lue sur ton style (constructions.sortes) ; une mesure
  // qui ne peut pas se jouer (rien à effondrer, aucune construction possible, appel au plafond) saute, et l'entracte qui suit est réduit à sauteS.
  ouvrage:{entracteS:1.4,nuS:2.5,sauteS:0.6,mesures:[{k:'batir'},{k:'fixe',g:'ruee'},{k:'libre'},{k:'batir'},{k:'fixe',g:'manoeuvres'},{k:'fixe',g:'feinte'},{k:'fixe',g:'equerre'},{k:'fixe',g:'effondrement'},{k:'libre'},{k:'fixe',g:'truelle'}]},
  // Phase III, « La Couture » (fiche 5d, § 2) : une boucle d'environ 33 s, fenêtre comprise (deux Coutures, trois gestes signature, la feinte, deux mesures
  // libres) ; à nu 2,0 s après la boucle. Une mesure {k:'couture'} lance ses fils (couture, plus bas) ; une Couture qui ne peut rien lancer (trois fils
  // tendus, aucun point de montage) saute, et l'entracte qui suit est réduit à sauteS.
  couture:{entracteS:1.4,nuS:2.0,sauteS:0.6,mesures:[{k:'couture'},{k:'fixe',g:'surjet'},{k:'libre'},{k:'fixe',g:'feinte'},{k:'fixe',g:'aiguilles'},{k:'couture'},{k:'fixe',g:'de'},{k:'libre'}]},
  // Phase IV, « L'Emprunt » (fiche 5e, § 2) : une boucle d'environ 36 s (trois emprunts, trois gestes signature au corps, la feinte, deux mesures libres) ;
  // pas de fenêtre après la boucle (nuS 0) : chaque emprunt a la sienne (épuisé, emprunt.nuS). Une mesure {k:'emprunt'} joue l'arme de la Brume d'un de tes
  // talents portés (emprunt, plus bas) ; un emprunt sans empruntable, une Révérence qui renonce, un geste sans sortie sautent (entracte réduit à sauteS).
  // Entracte 1,2 s (1,4 en I à III) : le duel se joue plus serré, dans une arène quatre fois plus petite.
  emprunt:{entracteS:1.2,nuS:0,sauteS:0.6,mesures:[{k:'emprunt'},{k:'fixe',g:'passe'},{k:'libre'},{k:'emprunt'},{k:'fixe',g:'feinte'},{k:'fixe',g:'reverence'},{k:'emprunt'},{k:'fixe',g:'volte'},{k:'libre'}]},
  // Phase V, « L'Effacement » (fiche 5f, § 2) : un examen, aucun geste neuf. Son socle rejoue un geste de chaque phase, plus serré : le tableau éclair
  // ({k:'eclair'}, phase I), l'effondrement ({k:'effondrement'}, phase II : une construction restée debout tombe et devient une fosse, sinon un pan du bord),
  // le montage court ({k:'montage'}, phase III), l'emprunt ({k:'emprunt'}, phase IV), et la feinte double ({k:'double'} : deux feintes à la suite).
  // mesures : la phase COURTE (Normal, Difficile : le socle seul, une boucle d'environ 36 s) ; entiere : la phase ENTIÈRE (Extrême : le socle et trois
  // mesures libres, une boucle d'environ 45 s). Entracte 1,0 s ; pas de fenêtre après la boucle (chaque geste a la sienne, effacement.nuS) ; une mesure
  // qui saute réduit l'entracte qui suit à sauteS. La boucle commence par ce qui t'a tué en V la dernière fois, si c'est un de ses quatre gestes.
  effacement:{entracteS:1.0,nuS:0,sauteS:0.6,
   mesures:[{k:'eclair'},{k:'double'},{k:'effondrement'},{k:'montage'},{k:'double'},{k:'emprunt'}],
   entiere:[{k:'eclair'},{k:'double'},{k:'libre'},{k:'effondrement'},{k:'montage'},{k:'libre'},{k:'double'},{k:'emprunt'},{k:'libre'}]}},
 // ── Les éléments improvisables (Q8) et leur menace. sorte : zone, tir, saisie, construction (deux éléments de même sorte ne se cumulent
 // pas au-delà de cumul[sorte]). charge : préavis (s, ≥ preavis.boss) ; degats : avant la montée (dmgMul). pond : l'axe du profil qui pèse
 // (sens +1 : plus l'axe est haut, plus l'élément pèse ; −1 : l'inverse) ; sources : les ennemis de la descente dont les dégâts reçus
 // (RUN.par18) font monter l'élément. 5a : des gestes d'ESSAI aux formes connues (disque, couloir, pluie de disques, anneau, tir).
 elements:{
  disque:{menace:2,sorte:'zone',forme:'disque',r:90,charge:1.2,degats:12,vise:true,pond:{axe:'portee',sens:-1},sources:['rampant','bouffi']},
  couloir:{menace:3,sorte:'zone',forme:'couloir',w:70,len:900,charge:1.2,degats:12,vise:true,pond:{axe:'portee',sens:1},sources:['brute']},
  pluie:{menace:3,sorte:'zone',forme:'disque',n:3,r:70,charge:1.2,degats:10,vise:false,pond:{axe:'esquive',sens:-1},sources:['hurleur']},
  anneau:{menace:3,sorte:'zone',forme:'anneau',r0:60,r1:260,charge:1.0,degats:10,vise:true,pond:{axe:'esquive',sens:1},sources:['hurleur']},
  tir:{menace:2,sorte:'tir',n:1,vitesse:380,degats:8,charge:0.8,pond:{axe:'portee',sens:1},sources:['spectre','voile']},
  rafale:{menace:3,sorte:'tir',n:3,vitesse:380,degats:6,charge:0.8,pond:{axe:'rythme',sens:1},sources:['spectre']},
  // la construction d'essai de 5a (un pilier) : depuis 5c, fixe (jamais tirée) : bâtir est la mesure « batir » de la phase II ; __brumeux.poser reste pour les essais
  construction:{menace:3,sorte:'construction',fixe:true,r:34,pond:{axe:'soin',sens:1},sources:[]},
  // fixe : jamais tiré dans une mesure libre (socle appris). La feinte (v14) est le fil rouge des cinq phases.
  feinte:{menace:0,sorte:'feinte',fixe:true},
  // ── Les gestes signature de la phase I (fiche 5b, § 1), toujours les mêmes, chacun avec deux sorties lisibles. Orange TELE.zone.
  // Les Fils : rayons posés en couloirs fins (n couloirs de w px en éventail de ouverture degrés, partant de ses mains vers toi, longueur len) ;
  //   sorties : entre deux fils, ou de côté.
  fils:{menace:3,sorte:'zone',forme:'rayons',fixe:true,n:5,w:30,ouverture:70,len:1000,charge:1.0,degats:14,vise:true},
  // Le Cadre : anneau à brèche, fixe, autour de toi (r0 → r1), brèche de breche px du côté opposé à ses mains ;
  //   sorties : rester au centre, ou sortir par la brèche.
  cadre:{menace:3,sorte:'zone',forme:'cadre',fixe:true,r0:70,r1:250,breche:110,charge:1.2,degats:12,vise:true},
  // La Toile : damier de n × n cases de cote px centré sur toi ; les cases noires frappent à charge, les blanches seconde s plus tard ;
  //   sortie : changer de couleur de case entre les deux coups (ou sortir du damier).
  toile:{menace:3,sorte:'zone',forme:'damier',fixe:true,n:5,cote:90,charge:1.0,seconde:0.9,degats:10,vise:true},
  // Un tableau convoqué (phase I) : jamais tiré ; c'est l'élément noté dans la sauvegarde quand un de ses ennemis ou une de ses dalles t'a tué.
  tableau:{menace:0,sorte:'tableau',fixe:true},
  // ── Les gestes signature de la phase II (fiche 5c, § 1), toujours les mêmes, deux sorties lisibles chacun. Orange TELE.zone.
  // La Ruée : un couloir de w px, de ses mains vers toi et au-delà, jusqu'au bord de l'arène (len au plus) ; il s'arrête sur tout ce qui arrête un
  //   tir (une construction, un montant ; jamais une fosse) : sa main s'y brise, il est sonné sonneS s, et la construction perd un palier de fissure.
  //   course : la main file au bout de son fil après la charge (dessin seulement). Sorties : de côté, ou derrière une construction.
  ruee:{menace:3,sorte:'zone',forme:'ruee',fixe:true,w:90,len:1400,charge:1.2,course:0.4,degats:14,vise:true,sonneS:2},
  // L'Équerre : une croix de deux couloirs (w × len) croisés sur toi, alignés sur l'arène (tournés de 45° en variante) ; sorties : les quatre quadrants.
  equerre:{menace:3,sorte:'zone',forme:'croix',fixe:true,w:70,len:900,charge:1.0,degats:12,vise:true},
  // La Truelle : un cône d'ouverture degrés depuis ses mains vers toi, de r0 à r1 px de ses mains ; sorties : hors de l'angle, ou sous ses mains.
  truelle:{menace:3,sorte:'zone',forme:'cone',fixe:true,ouverture:70,r0:60,r1:520,charge:1.1,degats:12,vise:true},
  // L'effondrement : une construction debout tombe dans une zone annoncée (constructions.sortes.*.chute) ; ses ennemis dessous prennent ennemis × les dégâts.
  effondrement:{menace:0,sorte:'effondrement',fixe:true,charge:1.4,degats:16,ennemis:2},
  // La cloche d'un rail (constructions.sortes.rails.cloche) : noté quand elle t'a tué. Les Manœuvres (l'appel de la phase II) : noté quand un de ses ennemis t'a tué.
  rail:{menace:0,sorte:'rail',fixe:true,charge:1.0,degats:12},
  manoeuvres:{menace:0,sorte:'appel',fixe:true},
  // ── Les gestes signature de la phase III (fiche 5d, § 1), toujours les mêmes, deux sorties lisibles chacun.
  // Le Surjet : n losanges (demi-diagonale h px) tous les pas px le long d'une ligne de sa croix vers toi et au-delà, alternés à ± decale px de la ligne ;
  //   le point le plus proche de toi est centré sur ta projection. Sorties : se glisser dans un jour (le long de la couture), ou s'écarter de côté. Orange.
  surjet:{menace:3,sorte:'zone',forme:'losange',fixe:true,n:7,h:52,pas:120,decale:24,depart:40,charge:1.1,degats:12,vise:true},
  // Le Dé : un disque r sur toi (charge), puis, à son coup, un second disque r là où tu es (seconde s). Sorties : sortir du premier, puis revenir à son
  //   centre (il a déjà frappé) ou repartir plus loin. Orange.
  de:{menace:3,sorte:'zone',forme:'de',fixe:true,r:110,charge:1.0,seconde:0.9,degats:11,vise:true},
  // Les Aiguilles : n projectiles à liseré (r px) en éventail d'ouverture degrés depuis sa croix vers toi, à vitesse px/s ; ils s'arrêtent sur tout ce qui
  //   arrête un tir (jamais sur une fosse). Charge de tir violette (grammaire des tirs). Sorties : entre deux aiguilles, de côté, derrière une construction.
  aiguilles:{menace:2,sorte:'tir',forme:'aiguilles',fixe:true,n:3,r:10,ouverture:36,vitesse:420,charge:0.9,degats:10,vise:true},
  // La Couture (l'élément noté quand un Masqué cousu t'a tué : le premier fil après la némésis le recoud au combat suivant, champ cousu de la sauvegarde)
  couture:{menace:0,sorte:'couture',fixe:true},
  // ── Les gestes signature de la phase IV (fiche 5e, § 1), toujours les mêmes : pour la première fois il est au sol, et ses gestes partent de SON CORPS
  // (formes reprises : couloir, cône, anneau à brèche ; sorties neuves : derrière lui, contre lui). Orange TELE.zone. Son corps ne blesse jamais au contact.
  // La Passe : un couloir de 2 r (son diamètre), de son corps vers toi et au-delà, jusqu'au bord (len au plus) ; après la charge, son corps le parcourt en
  //   course s ; coupé au premier pilier qui arrête un tir (jamais une fosse) : son corps s'y brise, sonné sonneS s, la construction perd un palier.
  //   Sorties : de côté, ou derrière une construction restée debout.
  passe:{menace:3,sorte:'zone',forme:'passe',fixe:true,len:900,course:0.45,charge:1.1,degats:14,vise:true,sonneS:2},
  // La Révérence : un cône d'ouverture degrés, de r0 à r1 px de son centre, vers toi ; il s'approche d'abord à atteinte × r1 (règle du Masqué), attenteS s
  //   au plus, puis renonce (la mesure saute). Sorties : derrière lui ou sur ses flancs (hors de l'angle), ou reculer au-delà de r1.
  reverence:{menace:3,sorte:'zone',forme:'reverence',fixe:true,ouverture:150,r0:0,r1:190,atteinte:0.8,attenteS:2,approche:1.3,charge:0.9,degats:13,vise:true},
  // La Volte : un anneau à brèche fixe autour de lui (r0 → r1), brèche de breche px orientée à graine. Sorties : contre lui (à moins de r0 de son
  //   centre), par la brèche, ou au-delà de r1.
  volte:{menace:3,sorte:'zone',forme:'volte',fixe:true,r0:70,r1:380,breche:120,charge:1.1,degats:12,vise:false},
  // L'emprunt (l'élément noté quand sa copie d'un de tes talents t'a tué : le premier emprunt du combat suivant le rejoue, champ emp de la sauvegarde)
  emprunt:{menace:0,sorte:'emprunt',fixe:true}},
 cumul:{zone:1,saisie:1,tir:2,construction:1,feinte:1,tableau:1,effondrement:1,rail:2,appel:1,couture:1,emprunt:1},
 // ── Le budget d'une mesure libre, par phase (menace cumulée) et par palier (Q12 : ×1,25 en Difficile, ×1,5 en Extrême ; jamais de PV ni de
 // dégâts en plus). Un tirage prend des éléments tant que le budget et le non-cumul le permettent ; le premier est ce qui t'a tué (Q13).
 budget:{base:[4,5,6,6,7],palier:{normal:1,difficile:1.25,extreme:1.5}},
 paliers:{normal:{constructions:5,masques:2,phaseV:'courte'},difficile:{constructions:6,masques:2,phaseV:'courte'},extreme:{constructions:6,masques:3,phaseV:'entiere'}},
 // phase V courte (Normal, Difficile) : réduite à son socle et à cette part de ses PV ; entière (Extrême) : regles.extreme.brumeux.phaseEntiere.
 phaseV:{courte:{pv:0.5}},
 // ── La lecture du joueur (Q2) : une à l'entrée, une à chaque changement de phase ; elle devient des POIDS dans les tirages, jamais des chiffres
 // du boss. axe : poids = plancher + pente × (l'axe, ou 1 − l'axe selon le sens) ; axe inconnu : 1. verdict (SAVE.mem.prof.eff, par contre-mesure
 // et son axe) : « a porté » (score ≥ 0) pèse porte × score sur les éléments du même axe et du même sens ; déjouée deux fois (abandonnée) : × abandon.
 // par (RUN.par18) : la part des dégâts reçus dans la descente qui vient des sources de l'élément pèse × (1 + poids × part). tue : l'élément qui
 // t'a tué à cette phase au combat d'avant (SAVE.brumeux) est tiré en premier. Le moment de lecture se montre en image (regard, petit rire), sans texte.
 lecture:{axe:{plancher:0.4,pente:1.2},verdict:{porte:0.6,abandon:0.5,abandonApres:2},par:{poids:0.8},tue:{premier:true},min:0.05},
 // ── Préavis : jamais moins que celui du boss dans l'arène (arene.js, preavis.boss, 0,8 s). Première rencontre (Q8) : un élément que cette
 // sauvegarde n'a jamais vu au combat final reçoit premiere s de préavis en plus.
 preavis:{boss:0.8,premiere:0.3},
 // ── Toujours une sortie (Q8) : avant de poser une zone, une sortie à pied doit exister (même garantie que sbPlacer / sbArrivee : à ta vitesse
 // de marche si elle est plus lente que celle de la justice, avec ton vrai rayon, après le réflexe). essais : variantes tentées (rotation,
 // décalage vers le centre) avant de sauter l'élément ; pas : pas de recherche (px).
 sortie:{essais:4,pas:6,anneauMarge:10},
 // ── Les constructions, comme système (Q9) : jamais de dégât en apparaissant (annonce, puis elles poussent, après l'attente de arene.js) ;
 // connexité : après chaque construction, au moins cette part de l'aire libre reste reliée à ta position, sur la grille de la carte de
 // distances FF (cs : pas, pad : marge, les mêmes que le jeu) ; aire : part de l'aire libre qu'elles peuvent couvrir au plus ; max : par palier
 // (paliers.*.constructions, annonces comprises). couleur d'annonce : craie (ΔE ≥ 25 de toute la grammaire, ivoire compris).
 // Phase II (fiche 5c, § 3 à § 7) : six sortes, une par axe du profil, version bâtie de la contre-mesure jumelle (BE_D.contreMesures) ; chacune
 // gêne ton style et offre une réponse. Une construction est une chaîne de disques posés dans room.pillars (pilier18, ou fosse18 pour une douve) :
 // collisions, tirs arrêtés, ligne de vue, carte FF et charges sonnées s'appliquent sans retouche. PV : une part (pvPart) des PV de la phase II,
 // pour que la calibration de 5g les emporte ; fissures à 2/3 et 1/3 (intacte, fêlée, lézardée), puis détruite. Rendu en deux temps : des modules
 // cuits à l'entrée du combat (par pièce, matière et fissure), l'image de chaque construction assemblée une fois à son annonce.
 // Lecture (Q2) : une sorte n'est éligible que si son score (l'axe, ou 1 − l'axe pour une sorte « basse » ; inconnu : inconnu) vaut au moins seuil ;
 // poids = lecture.axe (plancher + pente × score), × verdict de la jumelle (a porté, abandonnée), × variete par construction de la même sorte debout.
 constructions:{connexite:0.85,aire:0.3,grille:{cs:20,pad:15},annonceS:1.5,poussee:true,
  lecture:{seuil:0.35,inconnu:0.5,variete:0.5},
  // placement : variantes essayées (rotation ±rotation degrés, glissement de glisse px) ; bord : jamais à moins de bord px des bornes ; voie : la bande
  // d'un rail (px), où rien ne se pose (et un rail ne se pose pas à travers une construction)
  placement:{variantes:4,rotation:20,glisse:60,bord:40,voie:96},
  fissures:[2/3,1/3],
  // l'annonce (1,5 s, craie) : ses mains sont à nu ; si ses PV perdent au moins part × les PV de la phase pendant l'annonce, la construction est
  // annulée (la craie s'émiette) et il reste à nu nuS s de plus ; une construction annulée ne compte pas dans le plafond et n'est pas rebâtie dans la boucle
  annulation:{part:0.05,nuS:1.5},
  sortes:{
   pilier:{r:34},   // la construction d'essai de 5a (__brumeux.poser)
   // Murailles (portée haute, Traque) : un segment de longueur(portée) px, disques r tous les pas px, en travers de la ligne toi → ses mains, à part de
   // la distance, perpendiculaire, jamais à moins de minJ px de toi ; sa Ruée s'y brise ; une charge (Brute, Masqué) qui la heurte lui ôte un palier.
   murailles:{axe:'portee',sens:1,jumelle:'traque',max:3,pvPart:0.08,disque:{r:18,pas:20},longueur:{base:160,pente:80,min:160,max:240},
    place:{part:[0.45,0.6],minJ:90},piece:'bloc',chute:{forme:'couloir',decale:90,w:150},appel:'brute'},
   // Douves (portée basse, Pétards) : un anneau de fosses (axe r, fosses fosse tous les pas px) autour d'une île ; n passerelles de l px (N, E, S, O),
   // ouvertes deux par deux en alternance toutes les basculeS s ; île à d px de toi, du côté de ses mains ; ses mains s'y retirent (mains px/s au plus)
   // et y restent tant qu'elle tient. Incassable (Q9.4) : on passe par une passerelle ouverte ; une fosse n'arrête pas les tirs ; un ennemi ordinaire
   // repoussé dedans (élan ≥ chuteVitesse px/s) tombe, une Brute qui charge aussi.
   douves:{axe:'portee',sens:-1,jumelle:'petards',max:1,pvPart:0,incassable:true,anneau:{r:200,fosse:28,pas:36},passerelles:{n:4,l:64,basculeS:2.5},
    place:{d:[340,440]},mains:300,chuteVitesse:60,appel:'bouffi'},
   // Colonnades (esquive haute, Tir de barrage) : rangees × parRangee fûts r tous les pas px (d'axe en axe), centrée à d px de toi, du côté opposé à
   // ses mains, face à lui ; pvPart par fût, la colonnade disparaît avec son dernier fût ; derrière, un abri contre ses salves.
   colonnades:{axe:'esquive',sens:1,jumelle:'barrage',max:2,pvPart:0.02,fut:{r:14,pas:64},rangees:2,parRangee:4,place:{d:150},piece:'fut',
    chute:{forme:'rayons',w:34,len:220},appel:'spectre'},
   // Rails (esquive basse, Béliers) : un rail de longueur px qui passe par toi à l'annonce, orienté vers ses mains, deux butoirs r (pvPart chacun) aux
   // bouts ; une cloche r le parcourt : toutes les toutesS s (la première premiereS s après la pose), couloir orange de w px sur tout le rail (préavis
   // elements.rail.charge), puis la cloche passe en passeS s : elements.rail.degats ; elle écrase les ennemis (ord, elite ; jamais lui). Un butoir
   // cassé : la cloche quitte le rail, le rail devient un décor inerte.
   rails:{axe:'esquive',sens:-1,jumelle:'ruee',max:2,longueur:640,butoir:{r:22,pvPart:0.05},piece:'butoir',
    cloche:{r:38,w:96,toutesS:6,premiereS:2,passeS:0.85,ennemis:{ord:60,elite:30}},appel:'rampant',appelN:2},
   // Puits avides (soin haut, Brume avide) : un puits r, liseré au sol de rayon px ; dans son rayon, tu ne gardes que garde de tes soins, le reste
   // remplit le puits (jusqu'à plein × tes PV max) ; cassé, il te rend d'un coup ce qu'il a bu ; effondré de lui-même, c'est perdu.
   puits:{axe:'soin',sens:1,jumelle:'avide',max:2,pvPart:0.06,r:34,rayon:220,garde:0.3,plein:0.4,place:{d:[160,210]},piece:'puits',
    chute:{forme:'disque',r:110,decale:0},appel:'rampant'},
   // Échafaudages (rythme haut, Renforts) : une tour r reliée à sa croix par un fil ; à dMin px de toi au moins, dans le tiers de l'arène le plus loin
   // de toi, à bord px des bornes ; tant qu'un échafaudage tient, il subit subi (jamais invulnérable) ; le faire tomber le sonne sonneS s.
   echafaudages:{axe:'rythme',sens:1,jumelle:'renforts',max:2,pvPart:0.10,r:30,subi:0.6,sonneS:2,place:{dMin:520,bord:120},piece:'tour',
    chute:{forme:'disque',r:140,decale:60},appel:'rampant'}},
  // Les matières (fiche 5c, § 7) : morceaux des actes traversés, une par décor (corps, arête), jamais une couleur de la grammaire (ΔE ≥ 25 de tout).
  // Le rail, les passerelles, le liseré du puits et le fil de l'échafaudage sont tracés dans l'arête ; la fissure, un tracé plus sombre du corps.
  matieres:{pierre:{decor:'faub',corps:'92,84,72',arete:'132,118,96'},bronze:{decor:'crypt',corps:'104,78,44',arete:'150,116,64'},
   chair:{decor:'coeur',corps:'112,50,46',arete:'152,82,76'}}},
 // ── Les Manœuvres (fiche 5c, § 6) : une fois par boucle, il descend une équipe au bout de ses fils, choisie pour éprouver ce qu'il a bâti (de la
 // construction debout la plus récente à la plus ancienne : constructions.sortes.*.appel ; un rail compte pour une place de appelN ennemis ; au-delà,
 // defaut). n places par palier ; au plus max ennemis de l'appel vivants (l'appel est tronqué, et saute s'il ne reste aucune place). Jamais de
 // champion ni de Masqué. Places à minD px de toi, dans la vue plus vue px ; cercle violet d'apparition.
 manoeuvres:{n:{normal:2,difficile:2,extreme:3},max:4,defaut:'rampant',minD:230,vue:200,apparition:[0.85,1.3]},
 // ── La Couture de la phase III (fiche 5d, § 3 à § 7). Trois fils descendent de sa croix (decalS s entre deux) vers trois points du sol ; à chacun, le
 // montage du Masqué (data/bestiaire.js, assemble.montage, ses proportions gardées), ralenti à montage.dureeS. Couper un fil : frapper son nœud (la
 // petite croix du montage, haut px au-dessus du corps ; r px ; PV : pvPart des PV de la phase III ; entité fixe comme une construction : un coup par
 // image, ni brûlures ni poisons, ni PV volés, hors du ciblage automatique). Au plus paliers.*.masques Masqués cousus vivants et filsMax fils tendus :
 // un montage qui aboutit au plafond reste suspendu jusqu'à ce qu'une place se libère. Quand plus aucun fil ne tient (au moins un coupé), sa croix
 // vacille : à nu nuS s ; un Masqué cousu brisé : à nu briseS s.
 // points : à d px de toi, à ecart px au moins l'un de l'autre, à bord px des bornes, à marge px des constructions, dans la vue plus vue px, reliés à toi ;
 // un point sur l'île d'une douve qui tient. cousus : PV en part des PV de la phase III (× le corps, × le bonus de porteur, × les points d'une némésis) ;
 // chargements jamais sous plancherS (le préavis de l'arène) ; ni escorte, ni carte d'arrivée, ni récompense. souvenirs : tirés sans remise dans le
 // combat, pondérés à la récence (recence : poids du plus ancien, du plus récent ; ceux du Glas). budget : chaque Masqué cousu vivant retire moins au
 // budget d'une mesure libre (jamais sous plancher) et compte pour une source de tir. attente : une némésis promue au fond attend là (registre, salle).
 // non-cumul : ses gestes attendent la zone d'un Masqué cousu en cours, au plus attenteZoneS s, puis c'est le Masqué qui attend.
 // ── L'emprunt de la phase IV (fiche 5e, § 3 et § 4). Il joue l'ARME DE LA BRUME (souvenirs-brume.js, familles) d'un de tes talents portés, par un
 // porteur fantôme collé à son corps (hors de enemies, mené par la file d'étapes du Masqué : sbMaj, comme le Reflet du Glas). Le talent reste à toi.
 // exclus : les ultimes (*_sk), les sous-classes (genre c), les talents classés renfort, les reliques ; variantes : gardées (elles changent la forme)
 // et ignorées (contrôles sur toi, soin du porteur, tirs qui traverseraient tes constructions) ; poids d'un empruntable = (base + rang / rang max) ×
 // (1 + gravure × gravures) ; parBoucle emprunts par boucle, sans remise tant qu'il en reste, jamais deux fois de suite la même famille s'il en reste
 // une autre ; le premier de la phase rejoue celui qui t'a tué (le talent, sinon sa famille). priseS : la prise (fil lavande, icône, liseré de la tuile) ;
 // plancherS : aucune étape ne charge moins (le préavis du boss), +premiereS à la première rencontre de la famille empruntée ; degats : une étape × 1,0
 // fait tant (échelle d'acte comprise, avant la montée) ; force par rang et gravure comme le Masqué (assemble.souvenir), sous sbPlafond ; nuS : épuisé
 // après un emprunt joué ; defaitS : à nu quand tu brûles le talent emprunté (Dernier Souvenir), de la prise au coup de la dernière étape ; dissousS :
 // la zone défaite se dissout sans frapper ; marche : sa vitesse, la distance qu'il garde, l'élan d'une approche (× vitesse).
 emprunt:{exclus:{ultimes:true,genres:['c'],renforts:true,reliques:true},variantes:{gardees:['double','elargi'],ignorees:['etourdit','repousse','vol','traverse']},
  poids:{base:0.5,gravure:5},parBoucle:3,priseS:0.6,plancherS:0.8,premiereS:0.3,degats:11,nuS:2.0,defaitS:4.0,dissousS:0.3,
  marche:{vitesse:120,distance:[180,280],approche:1.3},chute:{dureeS:0.8,minD:200}},
 // ── L'Effacement, la phase V (fiche 5f, § 1 à § 8). Il ne puise que dans ce que ce combat a déjà montré (journal X.montre du jeu) : un geste de chaque
 // phase, plus serré, jamais un préavis plus court que celui du geste d'origine. Une phase d'origine jamais jouée dans ce combat (essai) : le geste est
 // tiré comme dans sa phase ; jouée sans rien laisser (rien accroché, rien cousu, tout brûlé) : la mesure saute.
 // nuS : à nu (anneau ivoire sur son cœur) après chacun des quatre gestes (un emprunt défait par le Dernier Souvenir : emprunt.defaitS) ; aucune
 // fenêtre après une feinte ni une mesure libre.
 // eclair : le tableau éclair (phase I) : le décor qui t'a fait le plus de dégâts en phase I (sinon le dernier accroché), sans sa règle (vague seule) ; le
 //   fragment couvre la part (moitié) des bornes la plus loin de toi, à retrait px de leurs bords ; accroche accrocheS, vie au plus vieMaxS, rideau rideauS ;
 //   budget par palier (la moitié de tableaux.budget, arrondie en bas : une vague, plus une densité en Extrême ; ni règle, ni champion) ; places à minD px.
 // montage : le montage court (phase III) : fils fil(s), montage dureeS s (4,4 en III), au plus cousus Masqué(s) cousu(s) vivant(s) en V ; le cousu : celui qui t'a
 //   fait le plus de dégâts en phase III, sinon le dernier cousu, sinon le premier fil ; nœud et PV en part des PV de la phase V (couture.noeud, couture.cousus).
 // feinte : la feinte double : n feintes v14 à la suite, la suivante ecartS s après la fin de la précédente (jamais deux à la fois).
 // resserrements : déclenchés par les PV de la phase V (seuils : part des PV de la phase restants), jamais par le temps ; états d'arène (arene.js) ; il attend
 //   la fin de la mesure en cours, lève les bras brasS s, puis l'arène annonce et recule (transformation, sans dégât) ; ce qui ne tient plus entier dans les
 //   nouvelles bornes, à marge px de leurs bords (la règle de pose des constructions, placement.bord), ou au-delà de constructions.aire, s'efface en brume.
 // pan : le pan du bord (effondrement sans construction effondrable debout) : la chute d'une muraille, un couloir de w px, du bord le plus proche de toi,
 //   perpendiculaire à lui, sur len px ; décalages essayés le long du bord (px) ; sans fosse.
 // fosse : une construction effondrée en V devient une fosse de mêmes disques (la marche n'y passe pas, les tirs si) ; elle s'enfonce en enfonceS s.
 // libres (entière seulement) : éléments libres de 5a et gestes signature des phases I à IV déjà montrés ; un geste signature y vaut menace ; poids : la
 //   lecture × (1 + poids × la part des dégâts de ce combat venue de cet élément) ; un élément jamais montré pèse 0.
 // mort : la scène (dureeS s ; mouvements réduits : un fondu de rmS s) ; brume : opacité du calque de brume qui couvre le sol.
 effacement:{nuS:2.0,
  eclair:{accrocheS:0.8,vieMaxS:8,rideauS:0.6,part:0.5,retrait:30,minD:230,budget:{normal:2,difficile:2,extreme:3}},
  montage:{dureeS:2.6,fils:1,cousus:1},
  feinte:{n:2,ecartS:0.3},
  resserrements:{seuils:[2/3,1/3],etats:[7,8],brasS:0.6,marge:40},
  pan:{w:150,len:320,decalages:[0,80,-80,160]},
  fosse:{enfonceS:0.5},
  libres:{poids:2,menace:3},
  mort:{dureeS:3,rmS:1,brume:0.6}},
 couture:{fils:3,filsMax:3,decalS:0.5,montage:{dureeS:4.4},noeud:{haut:110,r:20,pvPart:0.025},nuS:3,briseS:2,
  points:{d:[300,650],ecart:420,bord:80,marge:40,vue:200,minD:230,essais:80},
  cousus:{pvPart:0.15,plancherS:0.6},recence:[1,3],budget:{moins:2,plancher:2},attente:{acte:3,salle:3},attenteZoneS:1.5},
 // ── Les tableaux de la phase I, « le Rappel » (fiche 5b, § 3 et § 4). Il « accroche » un tableau sur un tiers de l'arène : un fragment de décor
 // d'un acte traversé (peint une fois à l'entrée du combat, à la graine du combat), une vague d'un thème existant (WTHEMES : types et rôles
 // seulement ; les places sont tirées dans le fragment), au plus une règle de salle confinée au fragment (mêmes chiffres et mêmes dessins
 // qu'en descente, sans bulle ni étiquette). Vidé, le rideau tombe et il est à nu (anneau ivoire sur ses mains). Non vidé à vieMaxS : ses
 // ennemis rentrent dans le tableau et le rideau tombe sans fenêtre à nu (la seule « punition » de la lenteur).
 // accrocheS : accroche ; fonduS : fondu du fragment ; vieMaxS : vie au plus ; rideauS : rideau ; nuS : à nu après un tableau vidé ;
 // feinteApresS : une feinte (une seule) si le tableau vit encore ce temps après l'accroche ; retrait : marge du fragment dans son tiers (px) ;
 // minD : distance des places à toi (px) ; apparition : durée du cercle violet (s) ; chute : ses mains retombent de tant (px) au rideau.
 tableaux:{accrocheS:1.2,fonduS:0.8,vieMaxS:30,rideauS:0.6,nuS:3,feinteApresS:8,retrait:30,minD:230,apparition:[0.85,1.3],chute:140,cadre:{marge:12,trait:6},
  // Un décor par registre d'acte (les actes IV à IX jouent au registre de l'acte III tant que l'action 6 ne leur donne pas leur décor) ;
  // themes : les thèmes de vague qu'on rencontre dans l'acte de ce décor (champ salle du bestiaire).
  decors:{faub:{actes:[1],themes:['meute','tir','petards']},crypt:{actes:[2],themes:['meute','tir','petards','choeur']},
   coeur:{actes:[3,4,5,6,7,8,9,10],themes:['meute','tir','petards','choeur','faux','siege']}},
  // Les règles confinées au fragment (Sol : une dalle vise toi si tu es dans le fragment, sinon un ennemi du fragment ; elle reste entière dans le
  // fragment et n'est posée que si une sortie existe). Brume plombée exclue : son voile assombrit les ennemis et l'arène ne sait pas juger un coup venu
  // d'un ennemi voilé (« aucune mort sans signe »).
  regles:{sol:{r:66,annonceS:1.3,ouvertS:2.4,tickS:0.4,degatsJoueur:10,degatsEnnemis:20,max:3,premiereS:1.4,intervalle:[3.2,4.5]},
   braseros:{n:2,rayon:190,lumiere:210,subi:0.4},verre:{recu:1.4}},
  exclues:['brume'],
  // Budget d'un tableau (menace, Q12 : ×1 / ×1,25 / ×1,5 ; jamais de PV ni de dégâts en plus) ; coûts et plafonds de ce qui s'y achète ;
  // densite : chaque achat ajoute cette part au budget de la vague (budget() du jeu).
  budget:{normal:4,difficile:5,extreme:6},couts:{vague:2,regle:1,densite:1,champion:1},max:{regle:1,densite:2,champion:1},densite:0.25,
  // Pondération vers ce qui t'a coûté le plus de PV dans cette descente (même forme que la lecture : 1 + poids × part, plancher min) :
  // décor ← RUN.par18A (par acte), thème ← RUN.par18 (types du thème), règle ← RUN.par18R (par règle) ; « aucune règle » garde aucune.
  lecture:{poids:0.8,min:0.05,aucune:1}},
 // ── Couleurs (r,g,b), hors grammaire : craie = annonce d'une construction ; les autres sont la matière du Brumeux (jamais une couleur de
 // télégraphe : orange, rouge, violet, cyan ; ni la lavande des souvenirs, ni l'ivoire du point faible). Le simulateur vérifie ΔE ≥ 25.
 // braise (v18.9) : la fêlure de son masque et la copie qui se dissout quand tu brûles le talent emprunté (ΔE ≥ 25 de l'orange des zones et de l'ivoire).
 couleurs:{craie:'160,185,150',yeux:'175,185,205',fils:'170,165,185',croix:'120,110,140',capuche:'52,44,70',manteau:'70,60,95',braise:'255,214,110'},
 // ── Sauvegarde (Q13) : SAVE.brumeux, versionnée. tentatives, phase atteinte au plus haut, l'élément qui t'a tué par phase, victoires.
 // Une descente d'essai n'écrit rien. Au combat suivant, il rejoue d'abord ce qui t'a tué (lecture.tue).
 sauvegarde:{v:1},
 // ── Statistiques (Q13, Q15 point 1) : durée des images à l'acte X (moyenne et pire 5 %, sur un échantillon), temps et coups reçus par phase.
 stats:{images:{echantillon:4000,pire:0.05}},
 // ── Dessin (Q10). version : change quand le dessin se voit. Phases I–III : mains, croix de manipulation et fils en haut de l'arène, corps deviné
 // dans la brume ; IV–V : corps entier au sol à l'échelle d'un gardien (r). glyphe : croix de manipulation et œil, 24 × 24, lisible à 16 px (XML
 // valide et autonome : balise inline du wiki, image du HUD et du signe de bord). Il remplace l'œil d'essai du boss de l'arène (point ouvert (4), § 34).
 // hauteur : où ses mains pendent sous le haut de l'arène (px) ; suit : elles descendent vers toi de cette part de ce qui te sépare d'elles
 // (lissé), pour rester dans la vue quand tu te bats au milieu de l'arène ; son corps, lui, reste au bord du monde.
 // version 2 (action 5b) : fils tendus de ses mains au cadre d'un tableau, croix qui penche vers le tiers occupé, mains qui retombent et s'ouvrent au rideau.
 // version 3 (action 5c) : ses doigts tricotent au-dessus d'une construction annoncée, fils jusqu'à son contour, croix qui s'incline vers le chantier ;
 // la main de la Ruée qui se brise ; le fil d'un effondrement et celui d'un échafaudage ; les constructions dans leur matière.
 // version 4 (action 5d) : en phase III, sa croix est le corps frappable (ses mains pendent dessous) ; les fils de sa croix aux montages, les nœuds, les
 // bouts de fils coupés qui pendent, la croix qui vacille, un fil mou au-dessus de chaque construction.
 // version 5 (action 5e) : en phases IV et V, son corps entier au sol (capuchon, manteau, yeux pâles derrière le masque à ta forme et son emblème, croix à
 // la ceinture, fils au sol), le cœur sous le capuchon (point faible), la prise (fil lavande), l'épuisement (masque terni), la copie défaite (fêlure de
 // braise), la chute de la transition III → IV.
 // version 6 (action 5f) : en phase V, la brume qui monte de son manteau, les fêlures de braise de son masque (une, puis deux, à chaque resserrement), le pan
 // du bord, la construction qui s'enfonce et la fosse ourlée de sa matière, le fil d'un montage court, sa mort (le masque qui tombe et se brise, la croix, les
 // fils rompus, le corps qui se défait en brume, l'arène qui redevient brume).
 dessin:{version:6,r:{haut:30,sol:48},hauteur:200,suit:0.6,echelle:{solide:1.15},
  glyphe:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><path d="M3 8.5H21M12 2.6V14.6" fill="none" stroke="#0a0810" stroke-width="4.4" stroke-linecap="round"/><path d="M3 8.5H21M12 2.6V14.6" fill="none" stroke="#c8c0d8" stroke-width="2.2" stroke-linecap="round"/><path d="M4.6 9.4V21.6M19.4 9.4V21.6M12 15.4V21.6" fill="none" stroke="#0a0810" stroke-width="2.6" stroke-linecap="round"/><path d="M4.6 9.4V21.6M19.4 9.4V21.6M12 15.4V21.6" fill="none" stroke="#b9b0c8" stroke-width="1.2" stroke-linecap="round"/><path d="M7 8.5Q12 3.4 17 8.5Q12 13.6 7 8.5Z" fill="#eee8da" stroke="#0a0810" stroke-width="1.3" stroke-linejoin="round"/><circle cx="12" cy="8.5" r="1.9" fill="#0a0810"/></svg>'},
 // ── Le bot qui frappe (Q14, bot=2) : il attaque avec le kit de base de sa forme, sort des zones qui chargent (à sa vitesse de marche, par une
 // esquive s'il le faut), vise le Brumeux (ou l'ennemi le plus proche s'il est plus près que proche px). Il sert aussi à mesurer l'action 6.
 bot:{proche:220,portee:520,cycleS:0.5},
 // ── Mode d'essai (Q17) : phase de départ (1 à 5), palier, graine, réserve garnie (ids de talents séparés par des virgules), bot, classe.
 essai:{foule:0,dieu:true}
};})(window.BRUME_DATA=window.BRUME_DATA||{});
