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
 rempart:{n:'Rempart',col:'140,190,255',d:'protège ses voisins : −30 % de dégâts pour les ennemis près de lui. Éloigne-les ou abats-le.'},
 harceleur:{n:'Harceleur',col:'255,200,90',d:'vise l’endroit où tu vas, pas celui où tu es.'},
 soutien:{n:'Soutien',col:'130,240,160',d:'soigne et accélère ses alliés. Abats-le en premier.'},
 chasseur:{n:'Chasseur',col:'255,96,96',d:'guette ton point faible et bondit dessus.'}},
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
 // Mutations du talent Mutation Instable (Gouffre)
 mutationsInstables:[{id:'griffes',n:'Griffes',d:'+40 % de dégâts'},{id:'membres',n:'Membres allongés',d:'+35 % de portée'},{id:'pierre',n:'Peau de pierre',d:'−40 % de dégâts subis'},{id:'fievre',n:'Fièvre',d:'+30 % de vitesse'}]
};})(window.BRUME_DATA=window.BRUME_DATA||{});
