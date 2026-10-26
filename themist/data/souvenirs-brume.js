// La Brume · Les armes de la Brume (palier 3a) : la version ennemie de chaque famille de souvenirs
// Source unique : le jeu (index.html, bloc « v17.15 · Les armes de la Brume ») et ses outils (outils/sim-brume.mjs) lisent ce fichier.
// Le wiki ne l’affiche pas (le Brumeux garde ses secrets) ; outils/wiki.mjs le charge sans s’en servir.
// Rien de ce fichier n’agit encore en jeu normal : seul le mode d’essai (index.html?brume=<famille>) s’en sert.
//
// Une version ennemie est une ATTAQUE en plusieurs étapes. Chaque étape est UNE zone, d’UNE forme que le joueur connaît déjà
// (formes ci-dessous). Les étapes se suivent : la suivante ne commence à charger qu’une fois la précédente finie.
// Les règles de justice (justice) sont vérifiées par le code, pas seulement écrites ici :
//  - en jeu : chargement plancher (sbCharge), une sortie cherchée avant chaque zone (sbPlacer, sinon l’étape saute), une seule zone à la fois ;
//  - hors jeu : node themist/outils/sim-brume.mjs refuse toute donnée qui les enfreint.
// Les couleurs ne sont PAS ici : toutes les zones sont dessinées par le code du Masqué, avec ses couleurs (bestiaire.js, assemble.couleurs).
//
// Champs d’une étape : f (forme) ; sur : où elle se pose (lui : sur le porteur, toi : sur ta position, ancre : au centre de l’étape précédente) ;
// vise : orientée vers toi ; suivi : part du chargement pendant laquelle elle te suit (puis se fige) ; chargeS : chargement à l’acte I
// (×accelerationActe par acte, jamais sous le plancher) ; degats : × dégâts du porteur ; portee : il s’approche à cette distance avant de charger ;
// v : variantes propres à l’étape (voir variantes). Angles en degrés.
(function(D){D.souvenirsBrume={
 // Le vocabulaire : les neuf formes que le joueur a déjà vues sur le Masqué et ses ennemis. Aucune autre forme n’est acceptée.
 formes:{
  disque:{n:'Disque',de:'Explosion (Bouffi)'},
  anneau:{n:'Anneau à brèche',de:'Onde (Hurleur)'},
  couloir:{n:'Couloir',de:'Charge (Brute)'},
  cone:{n:'Cône',de:'Lame (Voilé)'},
  rayons:{n:'Rayons',de:'Salve (Spectre)'},
  croix:{n:'Croix',de:'Fracas'},
  losanges:{n:'Losanges',de:'Éclats'},
  damier:{n:'Damier',de:'Damier'},
  projectile:{n:'Projectile à liseré',de:'Trait du Masqué, tirs des Spectres'}},
 // Règles de justice.
 // joueur : rayon et vitesse les plus défavorables retenus pour chercher une sortie (à pied, sans esquive) ;
 // marge : px de plus autour de chaque zone pour qu’une sortie compte ; reflexeS : temps retiré au joueur ;
 // verrouMinS : temps minimal entre le moment où la zone se fige et le coup ; entracteS : silence entre deux étapes ;
 // flashS : durée de l’éclat d’une zone instantanée ; degatsEtapeMax / degatsMax : dégâts possibles d’une étape / d’une attaque entière,
 // × dégâts du porteur, échelle d’acte comprise (Fracas, la plus lourde signature, fait 2,4) ;
 // suiviMax : une zone ne te suit jamais plus que cette part de son chargement ; essais : placements tentés avant de faire sauter une étape ;
 // arene : salle de référence pour la vérification hors jeu (celle du jeu : 1280 × 720, marges comprises).
 // etourdi (v17.18) : l’état « étourdi » du joueur, que seule la variante « etourdit » pose. Règles, tenues par le code (sbEtourdit, sbPas, jeu) :
 //  maxS : il ne dure jamais plus ; tu es intouchable tout ce temps, par tous (personne n’en profite) ; seul un coup qui t’a vraiment blessé
 //  étourdit (une esquive, une invulnérabilité ou un bouclier qui absorbe tout l’évitent) ; parAttaque : au plus une fois par attaque ;
 //  immuniteS : après, plus aucun étourdissement pendant ce temps ; l’étape suivante ne commence à charger qu’une fois l’étourdissement fini
 //  et un entracte entier écoulé ; interdites : formes qui frappent en plusieurs morceaux dans le temps (une volée : les autres orbes trouveraient
 //  un joueur sans défense), où la variante est refusée.
 justice:{joueur:{rayon:14,vitesse:180},marge:4,reflexeS:0.05,verrouMinS:0.22,entracteS:0.25,flashS:0.2,
  degatsEtapeMax:2.4,degatsMax:3.6,suiviMax:0.6,essais:8,arene:{x0:56,y0:92,x1:1224,y1:676},
  etourdi:{maxS:0.4,parAttaque:1,immuniteS:3,interdites:['projectile','rayons']}},
 // Bornes de chaque forme (variantes comprises) : [min, max]
 bornes:{
  disque:{rayon:[40,150]},
  anneau:{rayonMax:[160,400],vitesse:[180,350],breche:[60,120],depart:[0,80]},
  couloir:{longueur:[200,680],largeur:[24,80],vitesse:[400,880]},
  cone:{rayon:[50,130],arc:[30,160]},
  rayons:{nombre:[3,8],longueur:[200,560],vitesse:[200,420],rayon:[6,9]},
  croix:{longueur:[150,420],largeur:[36,72]},
  losanges:{nombre:[1,5],taille:[30,72],ecart:[80,140]},
  damier:{cote:[60,90],allumees:[3,5]},
  projectile:{nombre:[1,4],vitesse:[200,400],rayon:[7,13],portee:[250,640]}},
 // Variantes (palier 3b : un talent peut affiner la version ennemie de sa famille). Chacune ne s’applique qu’à certaines formes,
 // et la vérification repasse toutes les règles avec elle. Aucune ne crée de forme nouvelle.
 //  traverse : les projectiles passent à travers les piliers (pas les murs) ; rapide : vitesse × fois ; elargi : taille × fois (brèche inchangée) ;
 //  double : l’étape est jouée deux fois de suite ; vol : le porteur se soigne d’une part des dégâts infligés ;
 //  repousse : touché, tu es repoussé de px (en dureeS, sans perdre la main ni traverser un mur) ;
 //  etourdit (v17.18) : touché, tu es étourdi dureeS (ni déplacement, ni attaque, ni esquive, ni compétence ; intouchable), selon justice.etourdi.
 variantes:{
  traverse:{n:'Perçant',formes:['projectile','rayons']},
  rapide:{n:'Rapide',formes:['projectile','rayons','anneau','couloir'],fois:1.2},
  elargi:{n:'Large',formes:['disque','cone','losanges','damier','croix','couloir','projectile','rayons'],fois:1.15},
  double:{n:'Redoublé',formes:['disque','cone','couloir','croix','losanges','damier','projectile','rayons','anneau']},
  vol:{n:'Vorace',formes:['disque','cone','croix','losanges','damier','couloir'],part:0.5},
  repousse:{n:'Massif',formes:['disque','cone','croix','losanges','damier','couloir'],px:90,dureeS:0.2},
  etourdit:{n:'Assommant',formes:['disque','cone','croix','losanges','damier','couloir','anneau'],dureeS:0.35}},
 // Renforts (palier 3b) : un souvenir purement statistique (+PV, +vitesse…) renforce le porteur au lieu de lui donner une attaque.
 // Un porteur n’en cumule jamais plus que renfortMax. Le chargement n’est jamais touché.
 renforts:{pv:{n:'Robuste',pv:0.15},degats:{n:'Brutal',degats:0.12},vitesse:{n:'Vif',vitesse:0.12},armure:{n:'Blindé',reduit:0.1}},
 renfortMax:2,
 // Familles (mêmes ids que data/souvenirs.js). n : nom de l’attaque ; ic : icône (data/icones.js) ; forme : sa forme principale ;
 // adj : adjectif pour un nom composé (m, f) ; menace : poids dans le budget du Masqué (comme ses capacités) ;
 // acte : × dégâts aux actes I, II, III ; incompatibles : ce qu’un même porteur ne peut pas avoir avec elle, calculé selon la règle
 // « une famille dont la forme principale apparaît dans l’attaque d’une autre » (comme Explosion et Onde) — familles, capacités du Masqué,
 // corps dont la signature a la même forme ; etapes : l’attaque.
 familles:{
  projectile:{n:'Rafale',ic:'u_volley',forme:'projectile',adj:{m:'criblant',f:'criblante'},menace:2,acte:[0.85,1,1.15],
   incompatibles:{familles:['fil'],capacites:[],corps:[]},
   etapes:[
    {f:'projectile',sur:'lui',vise:1,suivi:0.5,chargeS:0.65,nombre:3,ecart:16,vitesse:290,rayon:9,portee:600,degats:0.9},
    {f:'projectile',sur:'lui',vise:1,suivi:0.5,chargeS:0.55,nombre:3,ecart:16,vitesse:290,rayon:9,portee:600,degats:0.9}]},
  faisceau:{n:'Rais',ic:'u_beam',forme:'couloir',adj:{m:'perçant',f:'perçante'},menace:2,acte:[0.85,1,1.15],
   incompatibles:{familles:['ruee'],capacites:['charge'],corps:[]},
   etapes:[
    {f:'couloir',mode:'rai',sur:'lui',vise:1,suivi:0.55,chargeS:0.7,longueur:560,largeur:34,degats:0.8},
    {f:'couloir',mode:'rai',sur:'lui',vise:1,suivi:0.55,chargeS:0.6,longueur:560,largeur:34,degats:0.8},
    {f:'couloir',mode:'rai',sur:'lui',vise:1,suivi:0.55,chargeS:0.55,longueur:560,largeur:34,degats:0.8}]},
  lame:{n:'Taillades',ic:'u_blade',forme:'cone',adj:{m:'balafreur',f:'balafreuse'},menace:2,acte:[0.85,1,1.15],
   incompatibles:{familles:['devoration','garde'],capacites:['cone'],corps:[]},
   etapes:[
    {f:'cone',sur:'lui',vise:1,suivi:0.3,chargeS:0.6,rayon:80,arc:110,portee:110,degats:1.1},
    {f:'cone',sur:'lui',vise:1,suivi:0.3,chargeS:0.55,rayon:66,arc:140,portee:100,degats:1.1}]},
  ruee:{n:'Aller-retour',ic:'u_charge',forme:'couloir',adj:{m:'fonceur',f:'fonceuse'},menace:3,acte:[0.85,1,1.15],
   incompatibles:{familles:['faisceau'],capacites:['charge'],corps:[]},
   etapes:[
    {f:'couloir',mode:'ruee',sur:'lui',vise:1,suivi:0.3,chargeS:0.7,longueur:380,vitesse:700,degats:1.2},
    {f:'couloir',mode:'ruee',sur:'lui',vise:1,suivi:0.3,chargeS:0.6,longueur:380,vitesse:700,degats:1.2}]},
  onde:{n:'Échos',ic:'u_wave',forme:'anneau',adj:{m:'grondant',f:'grondante'},menace:2,acte:[0.85,1,1.15],
   incompatibles:{familles:['cloche','garde'],capacites:['explosion','onde'],corps:[]},
   etapes:[
    {f:'anneau',sur:'lui',chargeS:0.7,rayonMax:360,vitesse:280,breche:70,brecheVers:'hasard',degats:1},
    {f:'anneau',sur:'lui',chargeS:0.6,rayonMax:360,vitesse:280,breche:70,brecheVers:'oppose',degats:1}]},
  sol:{n:'Dalles',ic:'u_grid',forme:'damier',adj:{m:'dallé',f:'dallée'},menace:2,acte:[0.85,1,1.15],
   incompatibles:{familles:['fortune'],capacites:[],corps:['voile']},
   etapes:[
    {f:'damier',sur:'toi',motif:'plus',cote:74,chargeS:0.75,degats:1.1},
    {f:'damier',sur:'ancre',motif:'x',cote:74,chargeS:0.6,degats:1.1}]},
  fil:{n:'Navette',ic:'u_thread',forme:'projectile',adj:{m:'tisseur',f:'tisseuse'},menace:2,acte:[0.85,1,1.15],
   incompatibles:{familles:['projectile'],capacites:[],corps:[]},
   etapes:[
    {f:'projectile',sur:'lui',vise:1,suivi:0.5,chargeS:0.7,nombre:2,ecart:24,vitesse:260,rayon:10,portee:380,navette:1,degats:0.75},
    {f:'projectile',sur:'lui',vise:1,suivi:0.5,chargeS:0.6,nombre:1,ecart:0,vitesse:260,rayon:11,portee:420,navette:1,degats:0.75}]},
  cloche:{n:'Glas',ic:'u_bell',forme:'disque',adj:{m:'tintant',f:'tintante'},menace:3,acte:[0.85,1,1.15],
   incompatibles:{familles:['garde','onde'],capacites:['explosion','onde'],corps:[]},
   etapes:[
    {f:'disque',sur:'toi',chargeS:0.8,rayon:70,degats:1.1},
    {f:'anneau',sur:'ancre',chargeS:0.55,rayonMax:300,vitesse:250,breche:80,brecheVers:'hasard',depart:20,degats:0.8},
    {f:'disque',sur:'toi',chargeS:0.6,rayon:70,degats:1.1}]},
  devoration:{n:'Mâchoire',ic:'u_maw',forme:'cone',adj:{m:'vorace',f:'vorace'},menace:2,acte:[0.85,1,1.15],
   incompatibles:{familles:['garde','lame'],capacites:['cone'],corps:[]},
   etapes:[
    {f:'cone',sur:'lui',vise:1,suivi:0.3,chargeS:0.7,nombre:2,ecart:140,rayon:110,arc:50,portee:120,degats:0.9},
    {f:'cone',sur:'lui',vise:1,suivi:0.3,chargeS:0.55,rayon:80,arc:80,portee:110,degats:1.2,v:['vol']}]},
  lumiere:{n:'Aube',ic:'u_star',forme:'rayons',adj:{m:'radieux',f:'radieuse'},menace:2,acte:[0.85,1,1.15],
   incompatibles:{familles:[],capacites:['tirs'],corps:[]},
   etapes:[
    {f:'rayons',sur:'lui',vise:1,etoile:1,nombre:8,chargeS:0.75,longueur:460,vitesse:330,rayon:7,degats:0.9},
    {f:'rayons',sur:'lui',vise:1,etoile:1,nombre:8,decale:22.5,chargeS:0.6,longueur:460,vitesse:330,rayon:7,degats:0.9}]},
  ombre:{n:'Croix d’ombre',ic:'u_ghost',forme:'croix',adj:{m:'obscur',f:'obscure'},menace:3,acte:[0.85,1,1.15],
   incompatibles:{familles:[],capacites:[],corps:['brute']},
   etapes:[
    {f:'croix',sur:'toi',rot:45,chargeS:0.8,longueur:300,largeur:56,degats:1.2},
    {f:'croix',sur:'toi',rot:0,chargeS:0.6,longueur:300,largeur:56,degats:1.2}]},
  soin:{n:'Saignée',ic:'u_heart',forme:'losanges',adj:{m:'avide',f:'avide'},menace:2,acte:[0.85,1,1.15],
   incompatibles:{familles:['fureur'],capacites:[],corps:['spectre']},
   etapes:[
    {f:'losanges',sur:'toi',nombre:3,ecart:96,taille:50,chargeS:0.75,degats:1.1,v:['vol']},
    {f:'losanges',sur:'toi',nombre:3,ecart:96,taille:50,chargeS:0.6,degats:1.1,v:['vol']}]},
  garde:{n:'Bastion',ic:'u_shield',forme:'disque',adj:{m:'cuirassé',f:'cuirassée'},menace:3,acte:[0.85,1,1.15],
   incompatibles:{familles:['cloche','devoration','lame','onde'],capacites:['cone','explosion','onde'],corps:[]},
   etapes:[
    {f:'disque',sur:'lui',chargeS:0.8,rayon:100,degats:1.3},
    {f:'cone',sur:'lui',vise:1,suivi:0.3,chargeS:0.6,rayon:85,arc:90,portee:140,degats:1.2,v:['repousse']}]},
  fureur:{n:'Martèlement',ic:'u_fist',forme:'losanges',adj:{m:'forcené',f:'forcenée'},menace:2,acte:[0.85,1,1.15],
   incompatibles:{familles:['soin'],capacites:[],corps:['spectre']},
   etapes:[
    {f:'losanges',sur:'toi',nombre:1,taille:58,chargeS:0.6,degats:0.9},
    {f:'losanges',sur:'toi',nombre:1,taille:58,chargeS:0.55,degats:0.9},
    {f:'losanges',sur:'toi',nombre:1,taille:58,chargeS:0.5,degats:0.9}]},
  // Fortune n’a aucun talent (seulement des reliques) : sa version existe pour le Glas Originel et les reliques, plus tard.
  fortune:{n:'Coup de dés',ic:'u_coin',forme:'damier',adj:{m:'joueur',f:'joueuse'},menace:2,acte:[0.85,1,1.15],
   incompatibles:{familles:['sol'],capacites:[],corps:['voile']},
   etapes:[
    {f:'damier',sur:'toi',motif:'hasard',allumees:5,cote:70,chargeS:0.8,degats:1.1},
    {f:'damier',sur:'toi',motif:'hasard',allumees:5,cote:70,chargeS:0.65,degats:1.1}]}},
 // Mode d’essai (développement seulement : index.html?brume=<famille>|tout) : pause entre deux attaques du Masqué d’essai.
 essai:{reposS:1.2},
 // Palier 3b : rattachement talent par talent et relique par relique (v17.16 ; étourdissement en v17.18). Forme d’une entrée : id → {} | {v:[variante]} | {renfort:'pv'|'degats'|'vitesse'|'armure'}.
 // La famille vient de data/souvenirs.js (champs t et r) : ne rien en recopier ici. {} : la version ennemie de la famille telle quelle.
 // Les commentaires disent ce que le talent demande et que le système ne sait pas traduire : rien n’a été inventé pour le coder.
 // Règles : une variante seulement si le texte du talent la demande (perce → traverse ; répète, écho, second coup → double ; +rayon ou +portée de zone → elargi ;
 // repousse → repousse ; soigne en frappant → vol ; étourdit, assomme → etourdit) et si la forme de la famille l’accepte ; un renfort seulement si le talent n’est qu’un bonus chiffré
 // (dégâts, critique, cadence → degats ; PV max → pv ; vitesse de déplacement → vitesse ; dégâts subis, bouclier → armure), le premier cité s’il y en a deux.
 // node themist/outils/sim-brume.mjs refuse une entrée qui ne pointe pas vers un talent, une variante et un renfort qui existent, une variante sans effet
 // sur sa famille, et tout talent ou relique laissé sans entrée.
 talents:{
  // Projectile (Rafale)
  ray_x3a:{v:['traverse']},
  pen_x1b:{v:['traverse']},
  fan_n1:{}, // étourdit, mais sa famille frappe en volée de projectiles : « etourdit » y est interdit (les autres orbes trouveraient un joueur sans défense)
  fan_n3:{}, // rebonds : pas de variante
  fan_n4:{},
  fan_n5:{}, // ressource ou charge du joueur : sans objet pour le porteur
  fan_n6:{}, // étourdit, mais sa famille frappe en volée de projectiles : « etourdit » y est interdit (les autres orbes trouveraient un joueur sans défense)
  fan_x1a:{v:['double']},
  fan_x2a:{},
  pha_s4:{},
  reg_n1:{}, // ressource ou charge du joueur : sans objet pour le porteur
  reg_n2:{}, // ralentit : pas de ralentissement du joueur
  reg_n4:{renfort:'degats'},
  reg_n6:{},
  reg_x1a:{},
  reg_x3a:{v:['traverse']},
  reg_x3b:{},
  sai_s2:{renfort:'degats'},
  cad_x1b:{v:['traverse']},
  aig_n1:{renfort:'degats'},
  aig_n2:{}, // ressource ou charge du joueur : sans objet pour le porteur
  aig_n3:{},
  aig_n4:{},
  aig_n5:{}, // brûlure ou saignée : pas de dégâts sur la durée
  aig_n6:{}, // guidage : pas de variante
  aig_x1a:{},
  aig_x1b:{v:['traverse']},
  aig_x2a:{v:['double']},
  aig_x2b:{},
  aig_x3a:{}, // guidage : pas de variante
  aig_x3b:{}, // guidage : pas de variante
  aig_k1:{}, // statistiques mêlées à une mécanique
  aig_k2:{v:['traverse']},
  bro_s1:{v:['traverse']},
  bro_s2:{renfort:'degats'},
  bro_s3:{}, // ressource ou charge du joueur : sans objet pour le porteur
  bro_s4:{},
  bro_s5:{}, // ralentit : pas de ralentissement du joueur
  bro_sk:{}, // capacité active ou mécanique propre au joueur
  // Faisceau (Rais)
  ray_n1:{renfort:'degats'},
  ray_x1a:{v:['elargi']},
  ray_x1b:{},
  fan_x3b:{}, // brûlure ou saignée : pas de dégâts sur la durée
  fan_k2:{}, // alliés, pantins, choristes, lanternes ou toiles à lui
  sol_s4:{v:['double']},
  sol_sk:{}, // capacité active ou mécanique propre au joueur
  pha_sk:{}, // capacité active ou mécanique propre au joueur
  reg_x1b:{}, // perçant voulu, mais « traverse » n’existe pas sur le couloir
  reg_k2:{}, // capacité active ou mécanique propre au joueur
  // Lame (Taillades)
  ray_x3b:{}, // statistiques mêlées à une mécanique
  pen_n1:{v:['elargi']},
  pen_x1a:{v:['double']},
  dif_n1:{v:['elargi']},
  dif_n3:{}, // capacité active ou mécanique propre au joueur
  dif_x1a:{v:['double']},
  dif_x1b:{}, // brûlure ou saignée : pas de dégâts sur la durée
  abe_s4:{v:['double']},
  cad_x1a:{v:['double']},
  cad_k1:{v:['double']},
  dgl_s1:{}, // exécution : pas de variante
  dgl_s3:{renfort:'degats'},
  dgl_s4:{}, // exécution : pas de variante
  dgl_s5:{v:['etourdit']},
  // Ruée (Aller-retour)
  pen_n2:{v:['double']},
  pen_n3:{}, // marque, exposé ou dégâts subis en plus : pas d’état sur le joueur
  pen_n4:{}, // capacité active ou mécanique propre au joueur
  pen_x2a:{}, // rebonds : pas de variante
  pen_x2b:{v:['double']},
  pen_x3a:{}, // ressource ou charge du joueur : sans objet pour le porteur
  pen_x3b:{}, // marque, exposé ou dégâts subis en plus : pas d’état sur le joueur
  dif_n2:{},
  dif_x2a:{}, // capacité active ou mécanique propre au joueur
  dif_x2b:{v:['etourdit']}, // étourdit 0,8 s chez toi : la variante dure 0,35 s (justice)
  cad_n2:{}, // ressource ou charge du joueur : sans objet pour le porteur
  cad_n3:{v:['double']},
  cad_x2a:{}, // ralentit : pas de ralentissement du joueur
  cad_x2b:{v:['double']},
  cad_k2:{},
  // Onde (Échos)
  ray_n4:{}, // repousse voulu (rang 2), mais « repousse » n’existe pas sur l’anneau
  ray_x2a:{v:['double']},
  fan_k1:{}, // alliés, pantins, choristes, lanternes ou toiles à lui
  sol_s5:{}, // capacité active ou mécanique propre au joueur
  vor_x3a:{},
  dif_x3b:{v:['etourdit']},
  reg_x2b:{},
  reg_k1:{}, // statistiques mêlées à une mécanique
  sai_s4:{}, // brûlure ou saignée : pas de dégâts sur la durée
  car_n1:{}, // ralentit : pas de ralentissement du joueur
  car_n3:{}, // rebonds : pas de variante
  car_n6:{},
  car_x1a:{v:['double']},
  car_x1b:{v:['etourdit']}, // étourdit et repousse : seul l’étourdissement existe sur l’anneau
  car_k1:{},
  req_n3:{},
  pnt_x2b:{},
  mdp_s5:{},
  // Sol (Dalles)
  ray_x2b:{}, // brûlure ou saignée : pas de dégâts sur la durée
  fan_n2:{}, // brûlure ou saignée : pas de dégâts sur la durée
  fan_x1b:{},
  fan_x3a:{}, // brûlure ou saignée : pas de dégâts sur la durée
  pha_s1:{},
  pha_s2:{renfort:'degats'},
  pha_s3:{v:['elargi']},
  pha_s5:{}, // ralentit : pas de ralentissement du joueur
  reg_n3:{},
  reg_n5:{}, // marque, exposé ou dégâts subis en plus : pas d’état sur le joueur
  reg_x2a:{v:['elargi']},
  req_n6:{}, // ralentit : pas de ralentissement du joueur
  req_x3a:{}, // attire ou aspire : pas d’attraction du joueur
  val_s1:{},
  val_s2:{renfort:'degats'},
  val_s3:{v:['elargi']},
  val_s4:{}, // ralentit : pas de ralentissement du joueur
  val_s5:{v:['repousse']},
  val_sk:{v:['etourdit']},
  pnt_n1:{}, // immobilise : pas d’immobilisation du joueur
  pnt_n4:{}, // immobilise : pas d’immobilisation du joueur
  pnt_x1a:{}, // guidage : pas de variante
  pnt_x1b:{v:['etourdit']},
  pnt_x3a:{}, // immobilise : pas d’immobilisation du joueur
  pnt_x3b:{}, // marque, exposé ou dégâts subis en plus : pas d’état sur le joueur
  gts_s1:{},
  gts_s2:{}, // recharge, durée ou fenêtre : sans objet pour le porteur
  gts_s3:{}, // immobilise : pas d’immobilisation du joueur
  gts_s4:{}, // marque, exposé ou dégâts subis en plus : pas d’état sur le joueur
  gts_sk:{}, // ralentit : pas de ralentissement du joueur
  // Fil (Navette)
  trm_n1:{renfort:'degats'},
  trm_n2:{},
  trm_n3:{}, // brûlure ou saignée : pas de dégâts sur la durée
  trm_n4:{}, // marque, exposé ou dégâts subis en plus : pas d’état sur le joueur
  trm_n5:{}, // capacité active ou mécanique propre au joueur
  trm_x1a:{}, // capacité active ou mécanique propre au joueur
  trm_x1b:{}, // capacité active ou mécanique propre au joueur
  trm_x2a:{}, // capacité active ou mécanique propre au joueur
  trm_x2b:{}, // étourdit, mais sa famille frappe en volée de projectiles : « etourdit » y est interdit (les autres orbes trouveraient un joueur sans défense)
  trm_x3a:{}, // ressource ou charge du joueur : sans objet pour le porteur
  trm_x3b:{}, // statistiques mêlées à une mécanique
  trm_k1:{}, // capacité active ou mécanique propre au joueur
  trm_k2:{}, // capacité active ou mécanique propre au joueur
  pnt_n2:{}, // statistiques mêlées à une mécanique
  pnt_n3:{}, // alliés, pantins, choristes, lanternes ou toiles à lui
  pnt_n5:{}, // ralentit : pas de ralentissement du joueur
  pnt_x2a:{}, // alliés, pantins, choristes, lanternes ou toiles à lui
  pnt_k1:{}, // capacité active ou mécanique propre au joueur
  pnt_k2:{}, // recharge, durée ou fenêtre : sans objet pour le porteur
  gts_s5:{}, // capacité active ou mécanique propre au joueur
  mdp_s1:{}, // alliés, pantins, choristes, lanternes ou toiles à lui
  mdp_s2:{renfort:'degats'},
  mdp_s3:{renfort:'vitesse'},
  mdp_s4:{}, // alliés, pantins, choristes, lanternes ou toiles à lui
  mdp_sk:{}, // alliés, pantins, choristes, lanternes ou toiles à lui
  // Cloche (Glas)
  car_n2:{v:['double']},
  car_n4:{}, // capacité active ou mécanique propre au joueur
  car_n5:{}, // capacité active ou mécanique propre au joueur
  car_x2a:{}, // capacité active ou mécanique propre au joueur
  car_x2b:{v:['elargi']},
  car_x3a:{}, // ralentit : pas de ralentissement du joueur
  car_x3b:{}, // ressource ou charge du joueur : sans objet pour le porteur
  car_k2:{v:['double']},
  cad_n1:{}, // recharge, durée ou fenêtre : sans objet pour le porteur
  cad_n4:{}, // capacité active ou mécanique propre au joueur
  cad_n5:{}, // ressource ou charge du joueur : sans objet pour le porteur
  cad_n6:{}, // ressource ou charge du joueur : sans objet pour le porteur
  cad_x3a:{}, // capacité active ou mécanique propre au joueur
  req_n1:{}, // recharge, durée ou fenêtre : sans objet pour le porteur
  req_n2:{}, // ressource ou charge du joueur : sans objet pour le porteur
  req_n5:{}, // ressource ou charge du joueur : sans objet pour le porteur
  req_x1a:{v:['double']},
  req_x1b:{v:['double']},
  req_x2b:{}, // statistiques mêlées à une mécanique
  req_k1:{}, // statistiques mêlées à une mécanique
  dgl_s2:{renfort:'degats'},
  dgl_sk:{}, // capacité active ou mécanique propre au joueur
  chd_s1:{}, // alliés, pantins, choristes, lanternes ou toiles à lui
  chd_s2:{renfort:'degats'},
  chd_s3:{}, // recharge, durée ou fenêtre : sans objet pour le porteur
  chd_s4:{}, // alliés, pantins, choristes, lanternes ou toiles à lui
  chd_sk:{}, // alliés, pantins, choristes, lanternes ou toiles à lui
  // Dévoration (Mâchoire)
  vor_n1:{}, // attire ou aspire : pas d’attraction du joueur
  vor_n2:{},
  vor_n3:{v:['elargi']},
  vor_n4:{}, // exécution : pas de variante
  vor_n5:{}, // ralentit : pas de ralentissement du joueur
  vor_n6:{}, // brûlure ou saignée : pas de dégâts sur la durée
  vor_x1a:{}, // attire ou aspire : pas d’attraction du joueur
  vor_x1b:{}, // immobilise : pas d’immobilisation du joueur
  vor_x2a:{}, // exécution : pas de variante
  vor_x2b:{v:['etourdit']},
  vor_k1:{v:['vol']},
  vor_k2:{}, // ressource ou charge du joueur : sans objet pour le porteur
  sai_sk:{}, // capacité active ou mécanique propre au joueur
  aby_s1:{}, // attire ou aspire : pas d’attraction du joueur
  aby_s2:{renfort:'degats'},
  aby_s3:{v:['elargi']},
  aby_s4:{}, // capacité active ou mécanique propre au joueur
  aby_s5:{}, // exécution : pas de variante
  aby_sk:{}, // capacité active ou mécanique propre au joueur
  // Lumière (Aube)
  ray_n2:{}, // ressource ou charge du joueur : sans objet pour le porteur
  ray_n3:{}, // brûlure ou saignée : pas de dégâts sur la durée
  ray_n5:{}, // brûlure ou saignée : pas de dégâts sur la durée
  ray_n6:{renfort:'degats'},
  ray_k1:{}, // statistiques mêlées à une mécanique
  ray_k2:{}, // statistiques mêlées à une mécanique
  fan_x2b:{v:['elargi']},
  sol_s1:{}, // brûlure ou saignée : pas de dégâts sur la durée
  sol_s2:{renfort:'degats'},
  sol_s3:{v:['elargi']},
  // Ombre (Croix d’ombre)
  pen_n5:{}, // invisibilité : sans objet pour le porteur
  pen_n6:{}, // invisibilité : sans objet pour le porteur
  pen_k1:{}, // statistiques mêlées à une mécanique
  pen_k2:{}, // marque, exposé ou dégâts subis en plus : pas d’état sur le joueur
  omb_s1:{}, // invisibilité : sans objet pour le porteur
  omb_s2:{renfort:'degats'},
  omb_s3:{renfort:'vitesse'},
  omb_s4:{}, // recharge, durée ou fenêtre : sans objet pour le porteur
  omb_s5:{v:['double']},
  omb_sk:{}, // invisibilité : sans objet pour le porteur
  // Soin (Saignée)
  sai_s5:{},
  req_n4:{},
  req_x3b:{},
  trm_n6:{},
  // Garde (Bastion)
  vor_x3b:{v:['repousse']},
  dif_n4:{},
  dif_n5:{renfort:'armure'},
  dif_x3a:{}, // capacité active ou mécanique propre au joueur
  dif_k1:{}, // statistiques mêlées à une mécanique
  sai_s1:{},
  sai_s3:{renfort:'pv'},
  abe_s3:{},
  cad_x3b:{}, // capacité active ou mécanique propre au joueur
  req_x2a:{},
  chd_s5:{}, // capacité active ou mécanique propre au joueur
  pnt_n6:{}, // capacité active ou mécanique propre au joueur
  // Fureur (Martèlement)
  dif_n6:{renfort:'degats'},
  dif_k2:{}, // capacité active ou mécanique propre au joueur
  abe_s1:{renfort:'degats'},
  abe_s2:{renfort:'degats'},
  abe_s5:{renfort:'degats'},
  abe_sk:{}, // capacité active ou mécanique propre au joueur
  req_k2:{}, // statistiques mêlées à une mécanique
 },
 reliques:{
  // Projectile (Rafale)
  chain:{}, // étourdit, mais sa famille frappe en volée de projectiles : « etourdit » y est interdit (les autres orbes trouveraient un joueur sans défense)
  dent:{renfort:'degats'},
  // Faisceau (Rais)
  oil:{}, // brûlure ou saignée : pas de dégâts sur la durée
  // Ruée (Aller-retour)
  sand:{}, // ressource ou charge du joueur : sans objet pour le porteur
  feather:{renfort:'vitesse'},
  pendule:{}, // recharge, durée ou fenêtre : sans objet pour le porteur
  // Onde (Échos)
  bell:{},
  // Fil (Navette)
  ciseaux:{renfort:'degats'},
  fuseau:{}, // ressource ou charge du joueur : sans objet pour le porteur
  // Cloche (Glas)
  diapason:{}, // recharge, durée ou fenêtre : sans objet pour le porteur
  battantr:{renfort:'degats'},
  metro:{}, // ressource ou charge du joueur : sans objet pour le porteur
  // Lumière (Aube)
  prismg:{}, // ralentit : pas de ralentissement du joueur
  ash:{}, // ressource ou charge du joueur : sans objet pour le porteur
  // Soin (Saignée)
  phoenix:{}, // renaissance : sans objet pour le porteur
  calice:{},
  moelle:{},
  fiole:{},
  lacry:{},
  // Garde (Bastion)
  wax:{renfort:'pv'},
  cercle:{}, // statistiques mêlées à une mécanique
  dea:{renfort:'armure'},
  ancre:{renfort:'armure'},
  os:{renfort:'pv'},
  // Fureur (Martèlement)
  eye:{renfort:'degats'},
  ember:{}, // brûlure ou saignée : pas de dégâts sur la durée
  epine:{renfort:'degats'},
  gant:{renfort:'degats'},
  cierge:{renfort:'degats'},
  chaineg:{}, // dégâts en plus contre un étourdi : ce n’est pas un étourdissement
  // Fortune (Coup de dés)
  crane:{}, // ressource ou charge du joueur : sans objet pour le porteur
  clef:{}, // ressource ou charge du joueur : sans objet pour le porteur
  bourse:{renfort:'degats'},
  boussole:{}, // ressource ou charge du joueur : sans objet pour le porteur
 }
};})(window.BRUME_DATA=window.BRUME_DATA||{});
