// La Brume · données des reliques
// Source unique : le jeu (index.html) ET le wiki (wiki.html, via outils/wiki.mjs) lisent ce fichier.
// Modifier un texte ou une valeur ici change le jeu et le wiki. Les effets codés (apply) restent dans index.html, rattachés par l'id.
// id : clé de l'effet · lock : prix en Éclats à la forge de Corbin (sans lock : disponible d'emblée)
// cls : réservée à une forme (lum, gou, her, tis) · g : glyphe · name : nom · desc : effet affiché
(function(D){D.reliques=[
  {id:'phoenix',lock:50,g:'✶',name:'Mèche de Phénix',desc:'Une fois par run, tu renais avec 50 % de tes PV.'},
  {id:'bell',g:'◬',name:'Cloche fêlée',desc:'Tous les 5 coups de base, une onde de choc (30 dégâts) autour de toi.'},
  {id:'eye',g:'◉',name:'Œil de verre',desc:'+10 % de critique et +25 % de dégâts critiques.'},
  {id:'wax',g:'❦',name:'Cœur de cire',desc:'+25 PV max.'},
  {id:'sand',g:'⧗',name:'Sablier d’ombre',desc:'Ton esquive gagne une charge supplémentaire.'},
  {id:'feather',g:'⟡',name:'Plume de corbeau',desc:'+12 % de vitesse de déplacement.'},
  {id:'prismg',g:'◇',name:'Prisme de garde',desc:'Les projectiles ennemis ralentissent de 45 % dans ta lumière.'},
  {id:'calice',lock:40,g:'♁',name:'Calice de Brume',desc:'3 % des dégâts infligés te soignent.'},
  {id:'ember',lock:35,g:'✺',name:'Braise éternelle',desc:'Toutes les brûlures infligent +50 % de dégâts.'},
  {id:'oil',cls:'lum',g:'◆',name:'Huile sainte',desc:'Le Faisceau embrase les ennemis : 12 dégâts par seconde pendant 3 s.'},
  {id:'ash',cls:'lum',g:'✧',name:'Cendre d’étoile',desc:'Chaque ennemi vaincu rend 6 Lueur.'},
  {id:'chain',cls:'lum',g:'⌘',name:'Chaîne du geôlier',desc:'La lanterne lancée ou rappelée étourdit 0,7 s.'},
  {id:'dent',cls:'gou',g:'⩚',name:'Dent de Léviathan',desc:'+25 % de dégâts de Recracher.'},
  {id:'cercle',cls:'gou',g:'◎',name:'Cerclage de fer',desc:'La Rupture ne t’inflige plus que la moitié de ses dégâts.'},
  {id:'moelle',cls:'gou',g:'⚘',name:'Moelle noire',desc:'Chaque ennemi vaincu te rend 3 PV.'},
  {id:'crane',lock:30,g:'☠',name:'Crâne de rat',desc:'Chaque ennemi vaincu laisse 2 pièces d’or de plus.'},
  {id:'epine',lock:40,g:'✠',name:'Couronne d’épines',desc:'+20 % de dégâts, mais −15 PV max.'},
  {id:'clef',lock:35,g:'⚷',name:'Clé du Colporteur',desc:'Le Colporteur propose une relique de plus, et ta première relance chez lui est gratuite.'},
  {id:'bourse',lock:45,g:'◈',name:'Bourse du Pendu',desc:'+1 % de dégâts par tranche de 15 or en poche (+30 % max).'},
  {id:'diapason',cls:'her',g:'♆',name:'Diapason d’argent',desc:'Ta fenêtre de mesure s’élargit de 30 ms.'},
  {id:'battantr',cls:'her',g:'♁',name:'Battant de fer',desc:'+25 % de dégâts des ondes, des cloches et des choristes.'},
  {id:'metro',cls:'her',g:'⧖',name:'Métronome du sonneur',desc:'+2 Cadence max. Tu entres dans chaque salle avec au moins 3 de Cadence.'},
  {id:'ciseaux',cls:'tis',g:'✂',name:'Ciseaux de la Parque',desc:'+40 % de dégâts d’Arracher et des chocs.'},
  {id:'dea',cls:'tis',g:'◒',name:'Dé à coudre',desc:'−20 % de dégâts subis tant qu’au moins un fil est noué.'},
  {id:'fuseau',cls:'tis',g:'⌇',name:'Fuseau d’os',desc:'+40 % de régénération de Bobine.'},
  {id:'gant',g:'✋',name:'Gantelet du sonneur',desc:'+15 % de vitesse d’attaque.'},
  {id:'fiole',g:'⚱',name:'Fiole de sang tiède',desc:'Chaque ennemi vaincu te rend 2 PV.'},
  {id:'ancre',g:'⚓',name:'Ancre de brume',desc:'−12 % de dégâts subis.'},
  {id:'pendule',g:'⏚',name:'Pendule du beffroi',desc:'Ton esquive se recharge 25 % plus vite.'},
  {id:'os',g:'⚚',name:'Os creux',desc:'+10 PV max et +8 % de vitesse de déplacement.'},
  {id:'lacry',g:'◌',name:'Lacrymatoire',desc:'+25 % de soins reçus.'},
  {id:'boussole',g:'⌖',name:'Boussole brisée',desc:'+2 relances de talents, tout de suite.'},
  {id:'cierge',lock:40,g:'♰',name:'Cierge votif',desc:'+15 % de dégâts contre les gardiens.'},
  {id:'chaineg',lock:35,g:'⛓',name:'Chaîne de glas',desc:'Les ennemis étourdis subissent +25 % de dégâts.'}];
})(window.BRUME_DATA=window.BRUME_DATA||{});
