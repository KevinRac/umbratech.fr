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
 justice:{joueur:{rayon:14,vitesse:180},marge:4,reflexeS:0.05,verrouMinS:0.22,entracteS:0.25,flashS:0.2,
  degatsEtapeMax:2.4,degatsMax:3.6,suiviMax:0.6,essais:8,arene:{x0:56,y0:92,x1:1224,y1:676}},
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
 //  repousse : touché, tu es repoussé de px (en dureeS, sans perdre la main ni traverser un mur).
 variantes:{
  traverse:{n:'Perçant',formes:['projectile','rayons']},
  rapide:{n:'Rapide',formes:['projectile','rayons','anneau','couloir'],fois:1.2},
  elargi:{n:'Large',formes:['disque','cone','losanges','damier','croix','couloir','projectile','rayons'],fois:1.15},
  double:{n:'Redoublé',formes:['disque','cone','couloir','croix','losanges','damier','projectile','rayons','anneau']},
  vol:{n:'Vorace',formes:['disque','cone','croix','losanges','damier','couloir'],part:0.5},
  repousse:{n:'Massif',formes:['disque','cone','croix','losanges','damier','couloir'],px:90,dureeS:0.2}},
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
 // Palier 3b : rattachement talent par talent et relique par relique. Forme d’une entrée : id → {v:[variantes]} ou {renfort:'pv'}.
 // La famille vient de data/souvenirs.js ; ne rien recopier ici d’autre que ce qui change la version ennemie.
 talents:{},
 reliques:{}
};})(window.BRUME_DATA=window.BRUME_DATA||{});
