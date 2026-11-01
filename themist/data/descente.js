// La Brume · données de la descente (v18 « La grande descente », cadrage validé le 1er novembre 2026)
// Source unique : le jeu (index.html) ET le wiki (wiki.html, via outils/wiki.mjs) lisent ce fichier.
// Les actes I à III et leurs gardiens restent dans data/gardiens.js (actes) : on n'y touche pas.
// Ici : les actes IV à X, la montée des ennemis après l'acte III, les trois paliers de difficulté et leur déblocage.
// Logique pure : bloc /*des:pur*/ d'index.html, vérifiée par outils/sim-descente.mjs.
(function(D){D.descente={
 // Nombre d'actes de la descente (I à III de gardiens.js, puis la liste ci-dessous, dans l'ordre)
 nombre:10,
 // Les actes IV à X se jouent dans le registre de l'acte III (décor, musique, ennemis, IA) en attendant leurs propres gardiens et décors.
 registre:3,
 // Actes IV à X. rooms : salles de l'acte, fin comprise (la première salle est imposée, comme aux actes II et III).
 // fin : 'gardien' = un gardien en dernière salle ; 'final' = le boss final du jeu (acte X).
 // boss : nom du gardien quand il existe. Sans boss, la place du gardien est tenue par une élite provisoire (provisoire.fin ci-dessous),
 // en attendant les six nouveaux gardiens (actes IV à IX) et le boss final (acte X), créés plus tard dans le chantier v18.
 // miniboss : nombre de salles de miniboss imposées juste avant la fin. antichambre : la salle avant la fin est une halte imposée.
 // entree : type de la première salle (défaut : combat ; 'mini' : un miniboss).
 actes:[
  {name:'Les Bas-Fonds',rooms:4,fin:'gardien',antichambre:false,done:'Les Bas-Fonds se taisent'},
  {name:'Les Eaux Mortes',rooms:4,fin:'gardien',antichambre:false,done:'Les Eaux Mortes se taisent'},
  {name:'La Nef Muette',rooms:4,fin:'gardien',antichambre:false,done:'La Nef Muette se tait'},
  {name:'Les Racines du Cœur',rooms:4,fin:'gardien',antichambre:false,done:'Les Racines se taisent'},
  {name:'Le Puits des Échos',rooms:4,fin:'gardien',antichambre:false,done:'Le Puits se tait'},
  {name:'Les Cloches Englouties',rooms:4,fin:'gardien',antichambre:false,done:'Les Cloches se taisent'},
  {name:'Le Fond de la Brume',rooms:3,fin:'final',miniboss:2,antichambre:false,entree:'mini',done:'La Brume se tait'}],
 // Ce qui tient les places encore vides : un Masqué imposé (l'élite assemblé de bestiaire.js, assemble), au registre de l'acte III,
 // plus endurant que d'ordinaire, avec une vague d'ennemis ordinaires en plus (part du budget d'une vague).
 // fin : à la place d'un gardien qui n'existe pas encore (pv et vague par acte) ; mini : les miniboss de l'acte X, dans l'ordre ;
 // final : à la place du boss final. Si aucun Masqué ne peut être assemblé, la salle garde son champion ordinaire.
 provisoire:{
  fin:{pv:{4:1.3,5:1.45,6:1.6,7:1.75,8:1.9,9:2.05},vague:{4:0.5,5:0.6,6:0.7,7:0.8,8:0.9,9:1}},
  mini:{pv:[2.2,2.4],vague:[0.8,1]},
  final:{pv:3,vague:1.2}},
 // Montée des ennemis. Jusqu'à la fin de l'acte apresActe, la règle de bestiaire.js (montee) ne change pas ;
 // ensuite, chaque salle ajoute pvParSalle et degatsParSalle (pente plus douce : la Mémoire plafonne la puissance du joueur).
 montee:{apresActe:3,pvParSalle:0.04,degatsParSalle:0.015},
 // Durée visée d'une descente en Normal, hors combat final (minutes) : joueur qui connaît le jeu, joueur rapide.
 dureeCible:{normale:40,rapide:30},
 // Paliers de difficulté. Ils remplacent les Paliers de Brume (sanctuaire.js, paliers : gardés pour l'histoire, plus proposés).
 // ouvrePar : gagner une descente à ce palier ouvre celui-ci (une descente d'essai n'ouvre rien). Le premier de l'ordre est toujours ouvert.
 // ic : icône (data/icones.js). court : ligne du sélecteur et du wiki.
 ordre:['normal','difficile','extreme'],
 paliers:{
  normal:{n:'Normal',ic:'u_fog',court:'La descente telle qu’elle est conçue : on la finit en apprenant.'},
  difficile:{n:'Difficile',ic:'u_warn',ouvrePar:'normal',court:'Pour qui a déjà vu le fond.'},
  extreme:{n:'Extrême',ic:'u_skull',ouvrePar:'difficile',court:'Pour qui veut y laisser sa peau.'}},
 // Règles propres à chaque palier : posées à l'action 3 du chantier v18. Vides : les trois paliers jouent la même descente.
 regles:{normal:{},difficile:{},extreme:{}}
};})(window.BRUME_DATA=window.BRUME_DATA||{});
