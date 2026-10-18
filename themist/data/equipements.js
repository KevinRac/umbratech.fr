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
 // v16.33 · emplacements fixes : un seul type d'objet par emplacement, dans cet ordre (I à IV).
 // Un objet trouvé ne peut aller que dans l'emplacement de son type ; il remplace celui qui s'y trouve.
 emplacements:[
  {id:'arme',n:'Arme',d:'Main droite : lames et armes de frappe.'},
  {id:'main',n:'Main gauche',d:'Ce qu’on tient de l’autre main : bouclier, dague, lanterne, fiole…'},
  {id:'armure',n:'Armure',d:'Ce qu’on porte sur soi : tête, torse, bras, pieds.'},
  {id:'talisman',n:'Talisman',d:'Bijoux et charmes : anneau, pendentif, amulette.'}],
 // Objets, dans l'ordre du codex. slot = emplacement (voir ci-dessus) ; cls = réservé à une forme ; src = gardien qui le porte (objets uniques)
 // Fiche (lisible d'un coup d'œil) : plus = lignes de gain, moins = lignes de coût. Une ligne qui commence par un chiffre signé
 // (« +15 % », « −10 % », « +1 ») s'affiche comme une statistique (valeur en gras) ; sinon comme un effet.
 // fl = texte d'ambiance (italique, en bas de la fiche). up / down (phrases complètes) sont reconstruits à partir de plus / moins.
 objets:{
  lame:{n:'Lame émoussée',r:'commun',slot:'arme',plus:['+15 % dégâts'],moins:['−10 % vitesse d’attaque'],fl:'Le fil est parti. Le poids, lui, est resté.'},
  gilet:{n:'Gilet de lin brumeux',r:'commun',slot:'armure',plus:['−10 % dégâts subis'],moins:['+8 % recharge de l’esquive'],fl:'La Brume s’est prise dans la trame et n’en est jamais ressortie.'},
  lanterne:{n:'Lanterne fêlée',r:'commun',slot:'main',cls:'lum',plus:['+20 % rayon de lumière'],moins:['Touché : ta lumière s’éteint 2 s'],fl:'La fêlure laisse passer le froid.'},
  piece:{n:'Pièce trouée',r:'commun',slot:'main',plus:['+20 % or'],moins:['Portes d’élite plus fréquentes'],fl:'Pile, tu gagnes. Face, quelqu’un vient la reprendre.'},
  bottes:{n:'Bottes de cendre',r:'commun',slot:'armure',plus:['+10 % vitesse de déplacement'],moins:['−10 % PV max'],fl:'Elles laissent des traces grises qui ne refroidissent pas.'},
  dague:{n:'Dague du guetteur',r:'commun',slot:'main',plus:['+25 % dégâts dans le dos'],moins:['−15 % dégâts de face'],fl:'Le guetteur ne regardait jamais en face.'},
  amulette:{n:'Amulette de ficelle',r:'commun',slot:'talisman',plus:['+4 PV par salle purifiée'],moins:['−5 % PV max'],fl:'Nouée par une main qui tremblait.'},
  fiole:{n:'Fiole de brume',r:'commun',slot:'main',plus:['Annule le 1er coup reçu de chaque acte'],moins:['En se brisant : ennemis de la salle enragés 4 s'],fl:'Ce qu’elle contient voudrait sortir.'},
  coeur:{n:'Cœur de lanterne',r:'rare',slot:'talisman',plus:['+1 % dégâts par ennemi vaincu (max +25 %)'],moins:['Touché : tout le bonus est perdu'],fl:'Il bat plus fort à chaque mort.'},
  anneau:{n:'Anneau du pari',r:'rare',slot:'talisman',plus:['À chaque salle, 1 chance sur 2 : +20 % dégâts'],moins:['Sinon : −20 % dégâts (tirage non annulable)'],fl:'Il tourne seul au doigt, comme une roue.'},
  brassard:{n:'Brassard d’épines',r:'rare',slot:'armure',plus:['Renvoie 50 % des dégâts de contact'],moins:['−30 % soins reçus'],fl:'Il mord aussi celui qui le porte.'},
  murmure:{n:'Le Premier Murmure',r:'unique',slot:'main',src:'La Mère-Brume',plus:['1 salle sur 2 : un pacte de salle t’est offert','+4 % dégâts par pacte accepté (5 rangs)'],moins:['Chaque pacte impose sa contrainte pour la salle'],fl:'Porte-le à l’oreille : quelqu’un y répond.'},
  larme:{n:'Larme du Gardien',r:'unique',slot:'talisman',src:'Le Héraut Noyé',plus:['Protège ton dernier PV, 1 fois par acte'],moins:['Le gardien suivant copie ton style dès son 1er temps'],fl:'Elle n’a jamais séché.'},
  sablier:{n:'Sablier fendu',r:'epique',slot:'talisman',plus:['+1 charge d’esquive'],moins:['−15 % PV max'],fl:'Le sable s’écoule vers le haut, par la fente.'},
  faux:{n:'Faux de la Brume',r:'epique',slot:'arme',plus:['+30 % dégâts sur les cibles sous 50 % PV'],moins:['−20 % dégâts sur les cibles au-dessus'],fl:'Elle ne fauche que ce qui penche déjà.'},
  egide:{n:'Égide de givre',r:'epique',slot:'main',plus:['−25 % dégâts subis'],moins:['−15 % vitesse de déplacement'],fl:'Le givre repousse plus vite qu’on ne le brise.'},
  chaine:{n:'Chaîne d’âmes',r:'epique',slot:'arme',plus:['+1 PV par ennemi vaincu'],moins:['+12 % dégâts subis'],fl:'Chaque maillon a été quelqu’un.'},
  couronne:{n:'Couronne de la Brume',r:'legendaire',slot:'armure',plus:['+45 % dégâts'],moins:['La Brume s’épaissit : tu vois moins loin'],fl:'Qui la porte règne sur ce qu’il ne voit plus.'},
  phenix:{n:'Plume du Phénix noir',r:'legendaire',slot:'talisman',plus:['1 fois par run, la mort te relève à 60 % PV','Une onde de feu frappe toute la salle'],moins:['−20 % PV max'],fl:'Elle brûle sans jamais se consumer.'}},
 // Sets : deux pièces portées ensemble
 sets:{
  guet:{n:'Duo du guetteur',items:['dague','lame'],d:'+10 % de chances de coup critique.'},
  cendre:{n:'Marche de cendre',items:['bottes','egide'],d:'−10 % de dégâts subis.'},
  serment:{n:'Serment brisé',items:['murmure','larme'],d:'+20 % de dégâts.'},
  joueur:{n:'Mains de joueur',items:['piece','anneau'],d:'+30 % d’or.'},
  roi:{n:'Cendres du roi',items:['couronne','phenix'],d:'Le Phénix noir te relève avec 85 % de PV au lieu de 60 %.'}}
};
 // Phrases complètes (bulle du HUD, chronique, anciens affichages) reconstruites depuis les lignes de la fiche
 const phr=a=>a.map(t=>t.replace(/\s*\.$/,'')+'.').join(' ');
 for(const k in D.equipements.objets){const o=D.equipements.objets[k];o.up=phr(o.plus);o.down=phr(o.moins);}
})(window.BRUME_DATA=window.BRUME_DATA||{});
