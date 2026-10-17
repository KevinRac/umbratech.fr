// La Brume · données des équipements
// Source unique : le jeu (index.html) ET le wiki (wiki.html, via outils/wiki.mjs) lisent ce fichier.
// Modifier un nom, une rareté, un texte ou un taux ici change le jeu et le wiki.
// Les effets codés (fonctions on/off) restent dans index.html, rattachés par la clé de l'objet.
(function(D){D.equipements={
 // Chance (%) qu'un champion (salle d'élite) laisse tomber un équipement
 chanceChampion:60,
 // Raretés : nom affiché et couleur (r,g,b)
 raretes:{commun:{n:'Commun',col:'207,198,176'},rare:{n:'Rare',col:'111,178,255'},epique:{n:'Épique',col:'196,128,255'},legendaire:{n:'Légendaire',col:'255,140,64'},unique:{n:'Unique',col:'255,198,92'}},
 // Tirage par acte (%), du plus rare au plus commun
 tirage:{
  1:{rare:30,commun:70},
  2:{legendaire:3,epique:12,rare:30,commun:55},
  3:{legendaire:6,epique:14,rare:30,commun:50}},
 // Objets, dans l'ordre du codex. cls = réservé à une forme ; src = gardien qui le porte (objets uniques)
 objets:{
  lame:{n:'Lame émoussée',r:'commun',slot:'arme',up:'+15 % de dégâts.',down:'−10 % de vitesse d’attaque.'},
  gilet:{n:'Gilet de lin brumeux',r:'commun',slot:'armure',up:'−10 % de dégâts subis.',down:'Ton esquive met 8 % plus de temps à se recharger.'},
  lanterne:{n:'Lanterne fêlée',r:'commun',slot:'relique',cls:'lum',up:'+20 % de rayon de lumière.',down:'Ta lumière s’éteint 2 s après chaque coup reçu.'},
  piece:{n:'Pièce trouée',r:'commun',slot:'talisman',up:'+20 % d’or.',down:'Les portes d’élite apparaissent plus souvent.'},
  bottes:{n:'Bottes de cendre',r:'commun',slot:'armure',up:'+10 % de vitesse de déplacement.',down:'−10 % de PV max.'},
  dague:{n:'Dague du guetteur',r:'commun',slot:'arme',up:'+25 % de dégâts dans le dos.',down:'−15 % de dégâts de face.'},
  amulette:{n:'Amulette de ficelle',r:'commun',slot:'talisman',up:'Te soigne de 4 PV par salle purifiée.',down:'−5 % de PV max.'},
  fiole:{n:'Fiole de brume',r:'commun',slot:'relique',up:'Annule le premier coup reçu de chaque acte.',down:'En se brisant, elle enrage tous les ennemis de la salle pendant 4 s.'},
  coeur:{n:'Cœur de lanterne',r:'rare',slot:'relique',up:'+1 % de dégâts par ennemi vaincu, jusqu’à +25 %.',down:'Tout le bonus est perdu dès que tu es touché.'},
  anneau:{n:'Anneau du pari',r:'rare',slot:'talisman',up:'À chaque salle : une chance sur deux d’avoir +20 % de dégâts…',down:'…et une chance sur deux d’avoir −20 %. Tirage non annulable.'},
  brassard:{n:'Brassard d’épines',r:'rare',slot:'armure',up:'Renvoie 50 % des dégâts de contact à l’attaquant.',down:'Soins reçus −30 %.'},
  murmure:{n:'Le Premier Murmure',r:'unique',slot:'relique',src:'La Mère-Brume',up:'Une salle sur deux, le Brumeux te propose un pacte de salle. Chaque pacte accepté renforce l’objet : +4 % de dégâts par rang (5 rangs).',down:'Chaque pacte de salle impose sa contrainte pour la salle.'},
  larme:{n:'Larme du Gardien',r:'unique',slot:'talisman',src:'Le Héraut Noyé',up:'Protège ton dernier PV une fois par acte.',down:'Le gardien suivant t’identifie : il copie ta façon de jouer dès son premier temps.'},
  sablier:{n:'Sablier fendu',r:'epique',slot:'talisman',up:'+1 charge d’esquive.',down:'−15 % de PV max.'},
  faux:{n:'Faux de la Brume',r:'epique',slot:'arme',up:'+30 % de dégâts sur les ennemis sous la moitié de leurs PV.',down:'−20 % de dégâts sur ceux qui sont au-dessus.'},
  egide:{n:'Égide de givre',r:'epique',slot:'armure',up:'−25 % de dégâts subis.',down:'−15 % de vitesse de déplacement.'},
  chaine:{n:'Chaîne d’âmes',r:'epique',slot:'relique',up:'Chaque ennemi vaincu te rend 1 PV.',down:'+12 % de dégâts subis.'},
  couronne:{n:'Couronne de la Brume',r:'legendaire',slot:'talisman',up:'+45 % de dégâts.',down:'La Brume s’épaissit durablement : tu vois moins loin.'},
  phenix:{n:'Plume du Phénix noir',r:'legendaire',slot:'relique',up:'Une fois par run, la mort te relève avec 60 % de PV et une onde de feu frappe la salle.',down:'−20 % de PV max.'}},
 // Sets : deux pièces portées ensemble
 sets:{
  guet:{n:'Duo du guetteur',items:['dague','lame'],d:'+10 % de chances de coup critique.'},
  cendre:{n:'Marche de cendre',items:['bottes','egide'],d:'−10 % de dégâts subis.'},
  serment:{n:'Serment brisé',items:['murmure','larme'],d:'+20 % de dégâts.'},
  joueur:{n:'Mains de joueur',items:['piece','anneau'],d:'+30 % d’or.'},
  roi:{n:'Cendres du roi',items:['couronne','phenix'],d:'Le Phénix noir te relève avec 85 % de PV au lieu de 60 %.'}}
};})(window.BRUME_DATA=window.BRUME_DATA||{});
