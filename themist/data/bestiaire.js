// La Brume · données du bestiaire
// Source unique : le jeu (index.html) ET le wiki (wiki.html, via outils/wiki.mjs) lisent ce fichier.
// Modifier un texte ou une valeur ici change le jeu et le wiki. Le comportement (IA, vagues, effets) reste dans index.html.
(function(D){D.bestiaire={
 // Montée en puissance des ennemis, par salle franchie dans la run (0,085 = +8,5 %)
 montee:{pvParSalle:0.085,degatsParSalle:0.03},
 // Champion (salle d'élite) : multiplicateurs appliqués à l'ennemi de base
 champion:{pv:4,degats:1.3,taille:1.4,vitesse:0.92,xp:4},
 // Ennemis. salle : première salle de la run où il peut apparaître (sans salle : dès le début)
 // stats : r rayon, hp PV, spd vitesse, dmg dégâts, xp expérience, cost poids dans le budget d'une vague
 ennemis:{
  rampant:{n:'Rampant',un:'un Rampant',desc:'L’ennemi de base. Il fonce au corps à corps. Seul, il est inoffensif ; en meute, il t’accule.',stats:{r:14,hp:24,spd:92,dmg:8,xp:3,cost:1}},
  spectre:{n:'Spectre',un:'un Spectre',salle:2,desc:'il tire à distance. Approche-toi, ou renvoie ses tirs d’un coup.',stats:{r:14,hp:20,spd:78,dmg:10,xp:4,cost:2}},
  bouffi:{n:'Bouffi',un:'un Bouffi',salle:3,desc:'il gonfle puis explose. Recule dès qu’il pulse.',stats:{r:16,hp:30,spd:108,dmg:20,xp:3,cost:1.5}},
  brute:{n:'Brute',un:'une Brute',salle:4,desc:'elle charge en ligne droite. Esquive-la, elle s’assomme contre les murs.',stats:{r:22,hp:85,spd:62,dmg:12,xp:7,cost:3.5}},
  hurleur:{n:'Hurleur',un:'un Hurleur',salle:8,desc:'ses cris forment des ondes et accélèrent ses alliés. Esquive à travers l’onde.',stats:{r:15,hp:42,spd:70,dmg:12,xp:6,cost:2.5}},
  boss:{stats:{r:48,hp:1000,spd:58,dmg:16,xp:70,cost:99}},
  mannequin:{stats:{r:18,hp:600,spd:0,dmg:0,xp:0,cost:99}},
  voile:{n:'Voilé',un:'un Voilé',salle:14,desc:'presque invisible et quasi invulnérable dans l’ombre. Garde-le dans ta lumière pour le blesser.',stats:{r:14,hp:46,spd:96,dmg:14,xp:8,cost:3}},
  nourrice:{n:'Nourrice',un:'une Nourrice',salle:15,desc:'elle pond des Rampants sans fin. Abats-la en priorité.',stats:{r:24,hp:150,spd:38,dmg:12,xp:13,cost:4.5}}},
 // Rôles donnés à certains ennemis plus tard dans la descente (col : couleur r,g,b)
 roles:{
 // v17.5 : rôles bien plus marqués. k : ce que fait le rôle, en un mot. Valeurs lues par le jeu (index.html) et le wiki.
 rempart:{n:'Rempart',k:'Tank',col:'140,190,255',pv:2,taille:1.15,subi:0.75,aura:170,reduc:0.5,
  d:'a 2× PV et subit −25 %. Ses voisins (170) subissent −50 %. Abats-le ou éloigne-les.'},
 harceleur:{n:'Harceleur',k:'Vitesse',col:'255,200,90',vitesse:1.5,bondCd:2.6,bondVise:0.3,bondT:0.28,bondVit:640,bondPortee:380,bondDeg:1.3,
  d:'va 1,5× plus vite, vise où tu vas et bondit sur toi toutes les 2,6 s.'},
 soutien:{n:'Soutien',k:'Soin',col:'130,240,160',pv:1.3,cd:2.5,rayon:260,soin:0.12,hate:2.5,
  d:'soigne de 12 % tous ses alliés proches (260) toutes les 2,5 s et les accélère. Abats-le en premier.'},
 chasseur:{n:'Chasseur',k:'Assassin',col:'255,96,96',bondCd:2.6,bondForce:5,bondDeg:1.6,
  d:'bondit sur ton point faible, et au moins toutes les 5 s (×1,6 dégâts).'}},
 // Tirage des rôles : dès la salle « salle », dans « chance » % des salles de combat ; un rôle pour « parEnnemis » ennemis de la plus grosse vague (max « max »)
 rolesTirage:{salle:3,chance:85,parEnnemis:3,max:3},
 // Thèmes de vague. need : ennemis requis pour que le thème soit tiré
 themes:{
  meute:{n:'La Meute',h:'Une meute simple. Garde de l’espace et ne te laisse pas acculer.',need:['rampant']},
  tir:{n:'Tir croisé',h:'Les Rampants font écran : les tirs des Spectres s’y perdent. Force le corps à corps ou coupe leur ligne de tir.',need:['spectre','rampant']},
  petards:{n:'Pétards',h:'Les explosions des Bouffis blessent aussi les Brutes. Place-les, et reste hors de portée.',need:['bouffi','brute']},
  choeur:{n:'Chœur',h:'Tant que le Hurleur vit, les Rampants sont enragés. Abats-le en premier : toute la salle retombe.',need:['hurleur','rampant']},
  faux:{n:'Faux-semblants',h:'Un Voilé se cache dans la meute. Garde les ennemis dans ta lumière pour le blesser.',need:['voile','rampant']},
  siege:{n:'Siège',h:'Les Brutes protègent la Nourrice. Attire-les contre un mur : sonnées, elles la laissent à découvert.',need:['nourrice','brute']}},
 // Contre-mesures du Brumeux. ax/hi : axe du profil visé ; cost : coût dans le budget de l'acte ; ic : icône (data/icones.js)
 // esc : son escalade en pleine salle (t : la phrase de la bulle ; ajout : ennemis ajoutés, des/jusqua : à partir de / jusqu'à telle salle,
 //   place 'fond' : au fond de la salle ; soins : part des soins que tu gardes, pour la Brume avide)
 contreMesures:{
  traque:{n:'Traque',ax:'portee',hi:true,cost:2,why:'tu frappes de loin',what:'La Brume s’épaissit et lâche des traqueurs qui chargent.',ic:'u_target',
   esc:{t:'D’autres traqueurs sortent de la Brume.',ajout:[{e:'rampant',n:2,jusqua:5},{e:'brute',n:1,des:6}]}},
  petards:{n:'Pétards',ax:'portee',hi:false,cost:2,why:'tu frappes au contact',what:'Des Bouffis rampent vers toi : ils explosent au corps à corps.',ic:'u_bolt',
   esc:{t:'Deux Bouffis de plus rampent vers toi.',ajout:[{e:'bouffi',n:2}]}},
  barrage:{n:'Tir de barrage',ax:'esquive',hi:true,cost:2.5,why:'tu esquives tout ce qui charge',what:'Des Spectres se postent au fond et tirent de loin.',ic:'u_arrow',
   esc:{t:'Un Spectre de plus se poste au fond.',ajout:[{e:'spectre',n:1,place:'fond'}]}},
  avide:{n:'Brume avide',ax:'soin',hi:true,cost:1.5,why:'tu te soignes beaucoup',what:'Dans cette salle, tes soins sont réduits de 40 %.',ic:'u_heart_x',
   esc:{t:'Tes soins tombent à 35 %, et deux Rampants viennent te chercher.',ajout:[{e:'rampant',n:2}],soins:0.35}},
  renforts:{n:'Renforts',ax:'rythme',hi:true,cost:2.5,why:'tu purges les salles vite',what:'Une vague de plus arrive quand tu crois la salle finie.',ic:'u_swarm',
   esc:{t:'Encore des renforts : trois Rampants.',ajout:[{e:'rampant',n:3}]}},
  ruee:{n:'Béliers',ax:'esquive',hi:false,cost:2,why:'tu esquives rarement',what:'Des Brutes chargent en ligne droite : il faudra esquiver.',ic:'u_fist',
   esc:{t:'Une Brute de plus charge.',ajout:[{e:'brute',n:1}]}}},
 // Le Brumeux juge ses contre-mesures. Après chaque salle où il en a lancé une, il compare les PV que tu y as perdus
 // et le temps passé à tes salles ordinaires (en %). Au-delà de seuilEfficace, elle a porté ; en deçà de seuilDejouee, tu l'as déjouée.
 // poids : influence du verdict sur ses choix suivants. Il abandonne une contre-mesure déjouée abandonApres fois dans la run.
 // repetition : attrait perdu chaque fois qu'il relance la même contre-mesure dans la descente (il varie ses coups).
 // memoire : part du nouveau verdict dans sa mémoire d'une descente à l'autre. degatsMin : PV perdus de référence minimum (% des PV max).
 // v16.16 · Le Brumeux décide en pleine salle. Dès que sa contre-mesure est sur le terrain, il observe par fenêtres de fenetreS secondes
 // (temps de jeu : rien ne compte pendant une pause, une lecture ou un arrêt sur image).
 // Escalade : moins de mordMin % de tes PV max perdus sur la fenêtre (elle ne mord pas). Il l'annonce, puis agit preavisS secondes après.
 //   Une seule à la fois (les ennemis de l'escalade précédente doivent être tombés), delaiS secondes au moins entre deux, plafond par salle,
 //   jamais à moins de calmeS secondes d'une mutation de règle.
 // Relâche : mordTrop % de PV max perdus sur la fenêtre, ou PV sous relacheSousPV % : il annule les ennemis de contre-mesure pas encore arrivés
 //   (ceux qui sont sur le terrain restent) et lève le malus de soin.
 //   Une fois par salle, et il n'escalade plus ensuite. Une salle relâchée compte comme une contre-mesure qui a porté.
 // Jamais : salles de gardien et les gardeAvantGardien salles qui les précèdent, Brèche (si dansBreche est faux), aperçu ?demo=.
 // bulleS : durée d'affichage de la bulle (après le préavis). L'escalade de chaque contre-mesure est dans contreMesures (esc).
 enSalle:{fenetreS:8,mordMin:3,mordTrop:25,relacheSousPV:35,preavisS:1.5,delaiS:12,plafond:2,calmeS:3,gardeAvantGardien:2,dansBreche:false,bulleS:2.6,
  relache:{t:'Il n’insistera plus ici : ce qui n’est pas encore arrivé est annulé, ses malus sont levés.'}},
 efficacite:{seuilEfficace:15,seuilDejouee:-15,poids:0.25,repetition:0.12,abandonApres:2,memoire:0.4,degatsMin:4,partDegats:70},
 // Règles de salle
 regles:{
 verre:{n:'Verre',d:'Tout est fragile : tes coups et les leurs font 40 % de dégâts en plus.'},
 sol:{n:'Sol qui se dérobe',d:'Des dalles cèdent après un instant et écrasent tout ce qu’elles couvrent. Attire-y les ennemis.'},
 brume:{n:'Brume plombée',d:'La moitié de la salle est voilée, mais tu frappes 25 % plus fort.'},
 braseros:{n:'Braseros',d:'Hors de la lumière des braseros, les ennemis ne subissent que 40 % des dégâts.'}},
 // Quand une salle reçoit une règle. Chances et seuils en %
 reglesSalle:{desLaSalle:3,chanceActeI:20,chanceEnsuite:30,seuilBrume:45,seuilBrumeSol:75,mutationMinS:14,mutationMaxS:18,orBase:20,orParActe:10},
 // La Brèche : porte facultative, un combat plus dur pour une relique. chance en % par porte de combat remplaçable
 breche:{n:'Brèche',chance:40,premiereSalle:3,vaguesEnPlus:1,budgetVague:0.9,budgetChampion:0.5,orBase:30,orParActe:15},
 // v16.24 · Le Masqué : un élite « assemblé » pour qui va vite. Un corps (ennemi existant : silhouette, déplacement, PV)
 // + deux capacités empruntées à d'autres ennemis + un sort signature propre au corps ; une troisième capacité s'éveille à mi-vie.
 // Une forme = une capacité, toujours (zones rouges). Il porte un masque, toujours le même (dessin : data/masque.js).
 // v16.25 · Il vient chercher le joueur qui domine : dans toute salle de combat (combat, élite, Brèche ; jamais au gardien),
 //   il apparaît chance % du temps à partir de la salle premiereSalle de chaque acte (v16.31).
 //   chanceBreche : % dans une Brèche (v16.32 : 100, il tient toujours la Brèche, sans condition de salle ni d'écart).
 //   exigeDomination vrai : seulement si tu vas vite OU si tu n'as pas perdu de PV depuis longtemps (vite, intact) ; faux : partout.
 //   desActe / premiereSalle : premier acte et première salle de l'acte où il peut venir ;
 //   vite : tu as purgé au moins sallesMin salles de combat dans la run en salleMaxS secondes en moyenne ou moins ;
 //   intact : tu n'as perdu aucun PV depuis sansDegatsS secondes de jeu ; ecartSalles : salles sans lui après une apparition ;
 //   gardeAvantGardien : salles juste avant le gardien où il ne vient pas ; dansBreche : il peut tenir une Brèche. Jamais en ?demo=.
 //   Il arrive avec la deuxième vague (en salle d'élite, à la place du champion ; en Brèche, son champion s'efface).
 //   Pendant ses sorts, les autres ennemis ne lancent pas les leurs, et il attend la fin des leurs : jamais deux zones à la fois.
 // recompense : ce qu'il donne en plus (reliques) ; hors salle d'élite, il donne aussi l'or et les éclats d'un champion.
 // stats : pv et degats de base (avant la montée par salle et les paliers), multipliés par le corps ; xp ; contact : part des dégâts au toucher.
 // escorte : nombre de Rampants qui entrent avec lui, par acte, seulement si sa vague n'a pas d'autres ennemis.
 // annonceS : il apparaît, montre son masque et ses icônes, et ne frappe pas pendant ce temps.
 // pauseS : pause fixe entre la fin d'un sort de zone et le chargement du suivant (jamais deux zones à la fois).
 // prioriteS : s'il attend depuis ce temps que les zones des autres ennemis finissent, les autres n'en lancent plus de nouvelles avant lui.
 // apresSignatureS : souffle en plus après le sort signature. signatureMinS : durée minimale du chargement de la signature
 //   (aucune combinaison ni aucun acte ne la raccourcit). chargeMinS : plancher pour les autres capacités.
 // accelerationActe : chargement des capacités (pas de la signature) multiplié par ce facteur par acte au-delà de desActe.
 // eveilPV : % de PV où la troisième capacité s'éveille ; eveilS : temps de lecture du signal avant le sort suivant.
 // etourdissement : durée des étourdissements subis (1 = normale). attenteS : temps qu'il prend pour s'approcher avant un sort court.
 // budgetMenace : plafond de menace par acte (corps + signature + les trois capacités).
 // incompatibles : paires de capacités jamais ensemble (explosion et onde : deux zones rondes centrées sur lui).
 //   La Brute ne prend pas la Charge : son Fracas en est déjà une, dans quatre directions.
 // poidsProfil : pondération du tirage selon ton profil (profile()) ; désactivée tant que actif est faux.
 //   Pour chaque capacité : ax (axe du profil), hi (vrai : plus probable si l'axe est haut), force (poids × (1 + force × écart)).
 assemble:{n:'Masqué',desActe:1,premiereSalle:3,chance:50,chanceBreche:100,exigeDomination:false,vite:{sallesMin:2,salleMaxS:25},intact:{sansDegatsS:60},ecartSalles:0,gardeAvantGardien:0,dansBreche:true,
  recompense:{reliques:1,titre:'Le masque se brise',texte:'Sous ses éclats, une relique de plus. Choisis-en une.'},
  // v17.10 : tous les Masqués renforcés (pv 460 → 736, ×1,6 ; vitesse : × la vitesse de son corps)
  stats:{pv:736,degats:13,xp:30,contact:0.8,vitesse:1.2},
  escorte:{1:2,2:3,3:4},
  // v17.10 · plus agressif : pause 0,25 → 0,12 s, souffle après la signature 0,6 → 0,3 s, il attend 0,5 s au plus d'être à portée (1,2 avant),
  // éveil à 70 % de PV (50 avant). Planchers inchangés : chargeMinS et signatureMinS (on lit toujours ses zones).
  // rage : sous pv % de PV, il ne souffle presque plus (pauseS, apresSignatureS) et une aura rouge le signale.
  // bougeCharge : formes posées sur toi (pas sur lui) : il continue de te poursuivre pendant leur chargement.
  annonceS:1,pauseS:0.12,prioriteS:0.5,apresSignatureS:0.3,signatureMinS:0.8,chargeMinS:0.5,accelerationActe:0.9,
  eveilPV:70,eveilS:0.5,etourdissement:0.5,attenteS:0.5,
  rage:{pv:30,pauseS:0.05,apresSignatureS:0},bougeCharge:['losanges','damier','taches','tourbillon','cercles'],
  budgetMenace:{1:11,2:11,3:13},
  incompatibles:[['explosion','onde']],
  poidsProfil:{actif:false,regles:{
   explosion:{ax:'portee',hi:false,force:0.8},tirs:{ax:'portee',hi:true,force:0.8},
   onde:{ax:'esquive',hi:false,force:0.6},charge:{ax:'esquive',hi:false,force:0.6},cone:{ax:'risque',hi:true,force:0.6}}},
  // Corps. pv / taille / vitesse : multiplicateurs ; mouvement : approche, distance ou rodeur ([près, loin] en px) ;
  // salle : première salle de la run où ce corps peut servir ; exclut : capacités qu'il ne prend jamais ; signature : son sort.
  // adj : forme de l'adjectif (m : masculin, f : féminin) pour le nom composé.
  corps:{
   brute:{n:'Brute',g:'f',pv:1.1,taille:1.45,vitesse:1.45,mouvement:'approche',menace:2,signature:'fracas',exclut:['charge']},
   spectre:{n:'Spectre',g:'m',pv:0.85,taille:1.6,vitesse:1.35,mouvement:'distance',distance:[210,300],menace:1,signature:'eclats',exclut:['explosion','cone']},
   voile:{n:'Voilé',g:'m',salle:14,pv:0.95,taille:1.6,vitesse:1.45,mouvement:'rodeur',distance:[110,170],menace:2,signature:'damier',exclut:['tirs']}},
  // Capacités empruntées. de : l'ennemi qui la prête ; ic : icône (data/icones.js) ; forme : sa zone (toujours la même) ;
  // chargeS : durée du chargement ; effetS : durée de la zone après le chargement ; degats : × ses dégâts de base ;
  // portee : il s'approche à cette distance avant un sort court (au plus attenteS secondes).
  capacites:{
   explosion:{n:'Explosion',de:'bouffi',ic:'u_burst',forme:'disque',adj:{m:'explosif',f:'explosive'},menace:2,chargeS:0.7,effetS:0.25,rayon:100,degats:1.6,portee:150},
   onde:{n:'Onde',de:'hurleur',ic:'u_wave',forme:'anneau',adj:{m:'hurlant',f:'hurlante'},menace:2,chargeS:0.65,rayonMax:340,vitesse:300,breche:70,degats:1.2},
   charge:{n:'Charge',de:'brute',ic:'u_charge',forme:'couloir',adj:{m:'furieux',f:'furieuse'},menace:3,chargeS:0.7,suivi:0.45,longueur:380,vitesse:720,degats:1.9,sonne:0.6},
   cone:{n:'Lame',de:'voile',ic:'u_blade',forme:'cone',adj:{m:'tranchant',f:'tranchante'},menace:2,chargeS:0.55,effetS:0.2,rayon:95,arc:2.2,degats:1.8,portee:120},
   tirs:{n:'Salve',de:'spectre',ic:'u_volley',forme:'rayons',adj:{m:'tireur',f:'tireuse'},menace:2,chargeS:0.6,effetS:0.15,nombre:5,ecart:0.2,vitesse:250,longueur:420,degats:0.9},
   // v17.9 · capacité de souvenir (souvenir:true) : jamais tirée seule, seulement quand il porte un souvenir de la famille qui la donne (voir souvenir).
   // Taches : nombre flaques (rayon) sous toi et autour (ecart), posées au chargement ; à l'impact degats, puis elles restent effetS secondes
   // et blessent de degatsTic toutes les tic secondes tant que tu y es. Il peut bouger pendant qu'elles restent.
   taches:{n:'Taches',ic:'u_drop',forme:'taches',souvenir:true,adj:{m:'suintant',f:'suintante'},menace:2,chargeS:0.75,effetS:2.4,nombre:3,rayon:46,ecart:105,degats:1.3,tic:0.7,degatsTic:0.4},
   // v17.11 · Tourbillon (famille Dévoration) : un disque de rayon posé sous toi au chargement. Pendant effetS secondes il t'attire vers son centre
   // (attire px/s, moins que ta vitesse : tu peux sortir en t'éloignant ; tu le sens surtout si tu restes immobile) ; son cœur (coeur px) blesse de
   // degatsTic toutes les tic secondes (sauf pendant les finS dernières secondes : ton invulnérabilité après un coup durerait plus que l'intervalle et avalerait le coup final), et à sa fermeture un dernier coup de degats si tu es resté dans le cœur.
   tourbillon:{n:'Tourbillon',ic:'u_maw',forme:'tourbillon',souvenir:true,adj:{m:'aspirant',f:'aspirante'},menace:2,chargeS:0.8,effetS:1.7,rayon:140,coeur:34,attire:120,degats:1.5,tic:0.5,degatsTic:0.3,finS:0.7},
   // v17.11 · Cercles (famille Cloche) : nombre anneaux concentriques posés sous toi au chargement (le premier est un disque), de largeur px,
   // espacés de pas px. Ils frappent l'un après l'autre, du centre vers l'extérieur, toutes les battueS secondes : reste entre deux anneaux.
   cercles:{n:'Cercles',ic:'u_bell',forme:'cercles',souvenir:true,adj:{m:'sonnant',f:'sonnante'},menace:2,chargeS:0.8,effetS:1.45,nombre:3,largeur:34,pas:74,battueS:0.45,degats:1.4},
   // v17.13 · Fil (famille Fil, Tisse-Destin) : un couloir étroit (largeur px, longueur px) te vise pendant le chargement (il te suit jusqu'à suivi du chargement,
   // puis se fige). S'il te touche au lâcher, il t'accroche : dégâts, puis il te tire vers lui à tire px/s pendant effetS secondes. Une esquive coupe le fil.
   fil:{n:'Fil',ic:'u_thread',forme:'fil',souvenir:true,adj:{m:'tisseur',f:'tisseuse'},menace:2,chargeS:0.8,effetS:1,longueur:400,largeur:34,suivi:0.55,tire:180,degats:1.3,portee:320},
   // v17.13 · Faisceau (famille Faisceau) : un secteur de balayage degrés, de longueur px, centré sur toi au début du chargement (il te suit jusqu'à la moitié).
   // Au lâcher, un rayon (largeur px) le balaie d'un bord à l'autre en effetS secondes, dans un sens tiré au hasard (le bord de départ est marqué, avec une flèche) ;
   // il te blesse une fois quand il te passe dessus. Sors du secteur ou esquive.
   faisceau:{n:'Faisceau',ic:'u_beam',forme:'faisceau',souvenir:true,adj:{m:'rayonnant',f:'rayonnante'},menace:2,chargeS:0.9,effetS:1.2,longueur:340,largeur:26,balayage:90,degats:1.6,portee:300}},
  // v17.9 · Le Masqué porte parfois un souvenir de ta réserve (data/souvenirs.js, familles). chance : % des Masqués qui en portent un
  // quand la réserve a un souvenir portable ; parActe : au plus autant de porteurs par acte ; familles : famille → capacité qu'il en tire
  // (elle prend une des deux places de départ, sous le même budget de menace) ; parRang / parGravure : dégâts de cette capacité en plus,
  // par rang au-delà du premier et par gravure ; usure : un souvenir déjà porté est moins souvent repris (poids 1 / (1 + usure × fois)).
  // Brisé, il propose de reprendre le souvenir à la place de la relique (D9). Les dégâts infligés à un porteur ne comptent pas dans l'Accoutumance (D5).
  // pv (v17.10) : PV du porteur en plus, par rang au-delà du premier et par gravure du souvenir (voler un talent fort coûte cher).
  souvenir:{chance:50,parActe:2,parRang:0.15,parGravure:0.15,usure:1,pv:0.1,
   familles:{projectile:'tirs',lame:'cone',ruee:'charge',onde:'onde',sol:'taches',devoration:'tourbillon',cloche:'cercles',fil:'fil',faisceau:'faisceau'},
   // v17.14 · familles d'état : pas de zone, pas de place de départ ; le porteur garde ses capacités tirées et gagne un état (voir etats).
   // Fortune n'a aucun talent (seulement des reliques, que le Masqué ne porte pas) : pas d'état pour elle tant que c'est le cas.
   etats:{lumiere:'halo',ombre:'voile',soin:'regen',garde:'carapace',fureur:'fureur'}},
  // v17.14 · États portés (un seul par porteur). ic : icône (data/icones.js), montrée cerclée de lavande après sa signature.
  // force (rang et gravure du souvenir, voir souvenir) multiplie expose, soin et degats ; reduit est borné par reduitMax.
  etats:{
   // Halo : un cercle doré au sol autour de lui (rayon px) ; tant que tu y es, tu subis expose de dégâts en plus (de toutes les sources).
   halo:{n:'Halo',ic:'u_star',rayon:150,expose:0.25},
   // Voile : toutes les cycleS secondes, entre deux sorts, il s'efface dureeS secondes (presque invisible et intouchable), puis reparaît à reparait px de toi.
   voile:{n:'Voile',ic:'u_ghost',cycleS:5.5,premierS:3,dureeS:1.1,alpha:0.15,reparait:140},
   // Régénération : sous seuil % de PV, toutes les cycleS secondes, il canalise canalS secondes (anneau vert qui se resserre) puis se soigne de soin × PV max.
   // Lui infliger rupture × PV max pendant la canalisation, ou l'étourdir, l'interrompt.
   regen:{n:'Régénération',ic:'u_heart',cycleS:6,premierS:2,canalS:1.2,soin:0.08,seuil:85,rupture:0.06},
   // Carapace : dureeS secondes sur cycleS, il subit reduit de dégâts en moins (arcs gris-bleu autour de lui).
   carapace:{n:'Carapace',ic:'u_shield',cycleS:7,premierS:2,dureeS:3,reduit:0.4,reduitMax:0.6},
   // Fureur : en permanence, degats de dégâts et vitesse de vitesse en plus (lueur orangée sous lui).
   fureur:{n:'Fureur',ic:'u_fist',degats:0.15,vitesse:0.2}},
  // Attaque passive : un trait tiré vers toi toutes les intervalleS secondes, en parallèle de ses sorts (ce n'est pas une zone :
  // un projectile au liseré rouge, comme ceux des Spectres). preavisS : son menton s'allume juste avant. portee : distance de tir max.
  // Couleurs de toutes ses zones (et de celles des armes de la Brume, data/souvenirs-brume.js, qui n'en ont pas d'autres) :
  // zone : remplissage (r,g,b) ; bord : liseré pointillé (r,g,b) ; charge / signature : barre de chargement au-dessus de lui.
  couleurs:{zone:'255,58,52',bord:'255,96,84',charge:'#ff5a50',signature:'#ff3d5a'},
  passive:{n:'Trait',ic:'u_arrow',intervalleS:1,preavisS:0.25,degats:0.6,vitesse:320,portee:560},
  // Sorts signature (un par corps), chacun avec une forme qu'aucun autre sort n'utilise.
  signatures:{
   fracas:{n:'Fracas',ic:'u_cross4',forme:'croix',menace:3,chargeS:0.9,effetS:0.3,longueur:420,largeur:60,degats:2.4},
   eclats:{n:'Éclats',ic:'u_diamonds',forme:'losanges',menace:3,chargeS:0.85,effetS:0.25,nombre:5,ecart:118,taille:46,degats:2},
   damier:{n:'Damier',ic:'u_grid',forme:'damier',menace:3,chargeS:0.85,effetS:0.25,cote:74,degats:2.2}},
  // Montage (v16.28) : à son arrivée, le Brumeux pousse son cri d'invocation, descend le corps d'origine au bout de fils de marionnette,
  // fait tomber le masque sur sa tête et le coud de force (points un par un), puis coupe les fils. Il ne frappe pas et ne peut pas être
  // blessé pendant le montage (si immunise). Durées des quatre temps en secondes ; hauteur : d'où le corps descend (px) ;
  // balancement : vitesse du balancement pendant la descente ; zoomCouture : le masque grossit d'autant pendant la couture pour qu'on la voie ; fil : couleur des fils (r,g,b). Avec « mouvements réduits », le corps apparaît en fondu au lieu de descendre.
  montage:{descenteS:1.1,masqueS:0.5,coutureS:1.7,coupeS:0.55,hauteur:230,balancement:5,zoomCouture:1.7,fil:'205,180,255',immunise:true},
  // Le masque. couleurs : jamais de rouge (les zones le sont) ; taille : hauteur du masque en rayons du corps, bornée en px.
  // Ses états : calme, yeux allumés pendant un chargement, fissures sous fissurePV % de PV, brisé à la mort (brisureS secondes).
  masque:{couleurs:{haut:'#e4dcf4',bas:'#8f7fb8',trait:'#120c20',creux:'#160f28',oeil:'#b892ff',oeilVif:'#f1e6ff',fissure:'#c9a8ff',fil:'#cdb4ff'},
   taille:1.3,min:36,max:50,fissurePV:50,brisureS:0.7}},
 // Mutations du talent Mutation Instable (Gouffre)
 mutationsInstables:[{id:'griffes',n:'Griffes',d:'+40 % de dégâts'},{id:'membres',n:'Membres allongés',d:'+35 % de portée'},{id:'pierre',n:'Peau de pierre',d:'−40 % de dégâts subis'},{id:'fievre',n:'Fièvre',d:'+30 % de vitesse'}]
};})(window.BRUME_DATA=window.BRUME_DATA||{});
