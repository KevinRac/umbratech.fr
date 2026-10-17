// La Brume · données de l'Accoutumance et des traits
// Source unique : le jeu (index.html) ET le wiki (wiki.html, via outils/wiki.mjs) lisent ce fichier.
// Modifier un texte ou une valeur ici change le jeu et le wiki. Les formules (ce qui compte comme « mécanique », ce que mesure chaque trait) restent dans index.html.
(function(D){D.memoire={
 // Accoutumance : part des dégâts au-delà de laquelle la Brume apprend ; éclats en plus par niveau appris
 accoutumance:{seuil:0.4,eclatsParNiveau:0.06},
 // Par forme : ce que la Brume observe, nom de l'adaptation, contre-jeu
 adaptations:{
  lum:{what:'ta lumière',name:'Paupières de cendre',counter:'Depuis l’Obscur, tu les prends au dépourvu : +15 % de dégâts. Le gardien, lui, ouvre son noyau toutes les 9 − 1,2 × niveau secondes : 3 s pour le frapper, +30 %.'},
  gou:{what:'ta corruption',name:'Bile amère',counter:'Au-delà de 67, leur garde cède : +15 % de dégâts. À toi de flirter avec la Rupture. Le gardien, lui, laisse fuir sa corruption toutes les 11 − 1,2 × niveau secondes : 3 s pour le frapper, +30 %.'},
  her:{what:'ton rythme',name:'Oreilles cousues',counter:'À Cadence maximale, la cloche perce leur silence : +15 % de dégâts. Le gardien, lui, se tait toutes les 10 − 1,2 × niveau secondes : 3 s pour le frapper, +30 %.'},
  tis:{what:'tes fils',name:'Rompt-fil',counter:'Un frémissement rouge annonce la coupe. Juste après, l’ennemi reste à vif 3 s : +30 % de dégâts.'}},
 // Traits de style du joueur : paliers (tiers) et mesure
 traits:[
  {id:'perfect',name:'Implacable',tiers:[1,3,6],desc:'Gardiens vaincus sans une égratignure.'},
  {id:'close',name:'Increvable',tiers:[1,3,6],desc:'Gardiens vaincus avec moins d’un cinquième de tes PV.'},
  {id:'abandons',name:'Fuyard',tiers:[1,3,6],desc:'Descentes abandonnées avant la fin.'},
  {id:'early',name:'Téméraire',tiers:[2,5,10],desc:'Chutes dans les trois premières salles.'},
  {id:'deep',name:'Plongeur',tiers:[1,4,10],desc:'Descentes qui ont atteint le Cœur de la Brume.'},
  {id:'acharne',name:'Acharné',tiers:[10,25,50],desc:'Descentes au total.'}]
};})(window.BRUME_DATA=window.BRUME_DATA||{});
