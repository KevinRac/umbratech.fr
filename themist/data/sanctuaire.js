// La Brume · données du Sanctuaire
// Source unique : le jeu (index.html) ET le wiki (wiki.html, via outils/wiki.mjs) lisent ce fichier.
// Modifier un texte ou une valeur ici change le jeu et le wiki. Positions, éclairage et dialogues des personnages restent dans index.html.
(function(D){D.sanctuaire={
 // Personnages : nom et rôle affichés en jeu ; desc : présentation dans le wiki
 pnj:{
  portail:{name:'Le Portail',role:'Descendre dans la Brume',desc:'Lance la descente et change de forme. Le bouton Descendre reste toujours visible.'},
  veilleuse:{name:'Sœur Ismène',role:'Autel de Mémoire',desc:'La flamme (améliorations permanentes) et l’arbre des Résonances.'},
  fondeur:{name:'Maître Corbin',role:'Forge des reliques',desc:'La forge : crée des reliques que tu pourras trouver dans la Brume.'},
  archiviste:{name:'L’Archiviste',role:'Registres et chroniques',desc:'Les registres : chroniques, Adaptations, historique de tes descentes et Carte du Glas.'},
  colporteur:{name:'Tobiah',role:'Le Colporteur',desc:'Il ne vit pas au Sanctuaire : on le croise parfois dans la Brume, où il vend des reliques et des soins contre de l’or.'}},
 // Améliorations de la flamme d'Ismène (Éclats de Mémoire) : max rangs, cost coût de chaque rang
 ameliorations:[
  {id:'vig',name:'Vigueur',desc:'+8 PV max par rang',max:5,cost:[10,15,22,30,40]},
  {id:'ard',name:'Ardeur',desc:'+5 % de dégâts par rang',max:3,cost:[15,25,40]},
  {id:'ref',name:'Réflexes',desc:'Esquive rechargée 8 % plus vite par rang',max:3,cost:[12,20,30]},
  {id:'for',name:'Fortune',desc:'+15 % d’or par rang',max:3,cost:[10,18,28]},
  {id:'mar',name:'Marchandage',desc:'Prix du Colporteur −10 % par rang',max:2,cost:[15,25]},
  {id:'rel',name:'Indécision',desc:'+1 relance par acte, par rang',max:2,cost:[20,35]},
  {id:'sav',name:'Savoir ancien',desc:'+1 niveau de départ par rang',max:2,cost:[25,45]},
  {id:'bag',name:'Bagage',desc:'Une relique de départ au choix',max:1,cost:[40]},
  {id:'cho',name:'Vision élargie',desc:'4 talents proposés au lieu de 3',max:1,cost:[60]},
  {id:'sec',name:'Seconde flamme',desc:'Une fois par run, relève-toi à 40 % de PV',max:1,cost:[70]}],
 // Paliers de Brume (0 = sans palier)
 paliers:[
  {n:0,name:'Sans palier',desc:'La Brume habituelle.'},
  {n:1,name:'Brume épaisse',desc:'Ennemis : +20 % de PV.'},
  {n:2,name:'Meute',desc:'Vagues plus fournies : +20 %.'},
  {n:3,name:'Crocs',desc:'Ennemis : +20 % de dégâts.'},
  {n:4,name:'Disette',desc:'Soins divisés par deux, prix +25 %.'},
  {n:5,name:'Gardiens enragés',desc:'Gardiens : +30 % de PV, plus rapides.'},
  {n:6,name:'Hâte',desc:'Ennemis 12 % plus rapides.'},
  {n:7,name:'Vagues sans fin',desc:'Une vague de plus par salle.'},
  {n:8,name:'Le Glas éternel',desc:'PV max −15 %, champions +40 % de PV.'}],
 // Chaque palier : PV et dégâts des ennemis en plus, éclats en plus
 parPalier:{pvEnnemis:0.04,degatsEnnemis:0.03,eclats:0.2}
};})(window.BRUME_DATA=window.BRUME_DATA||{});
