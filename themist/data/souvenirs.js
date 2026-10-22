// La Brume · La Mémoire : ce que tu portes, ce que tu oublies
// Source unique : le jeu (index.html, bloc « v17 · La Mémoire ») ET le wiki (wiki.html, via outils/wiki.mjs) lisent ce fichier.
// Un souvenir = un talent ou une relique. Les effets restent dans index.html ; ce fichier dit combien on en porte et à quelle famille chacun appartient.
// Les familles décident de l’icône d’un talent dans le HUD et l’écran d’oubli (les reliques gardent leur propre icône).
(function(D){D.souvenirs={
 // Souvenirs actifs en même temps (talents et reliques ; l’équipement garde ses 4 emplacements à part)
 plafond:6,
 // Reliques hors mémoire : leur effet s’applique tout de suite, elles ne prennent aucune place
 consommables:['boussole'],
 // Reliques qui se consument quand elles servent : elles libèrent leur place
 seConsume:['phoenix'],
 // Refuser une relique (autel, champion, gardien, Brèche…) : un soin (part des PV max) ou de l’or
 refus:{soin:0.2,or:20},
 // Familles : nom, icône (data/icones.js), ce qu’elles regroupent ; t : talents, r : reliques
 familles:{
  projectile:{n:'Projectile',ic:'u_volley',d:'Ce qui part de toi et voyage : aiguilles, éclats, lancers de lanterne, crachats.',
   t:['ray_x3a','pen_x1b','fan_n1','fan_n3','fan_n4','fan_n5','fan_n6','fan_x1a','fan_x2a','pha_s4','reg_n1','reg_n2','reg_n4','reg_n6','reg_x1a','reg_x3a','reg_x3b','sai_s2','cad_x1b','aig_n1','aig_n2','aig_n3','aig_n4','aig_n5','aig_n6','aig_x1a','aig_x1b','aig_x2a','aig_x2b','aig_x3a','aig_x3b','aig_k1','aig_k2','bro_s1','bro_s2','bro_s3','bro_s4','bro_s5','bro_sk'],
   r:['chain','dent']},
  faisceau:{n:'Faisceau',ic:'u_beam',d:'Rayons continus ou en ligne.',
   t:['ray_n1','ray_x1a','ray_x1b','fan_x3b','fan_k2','sol_s4','sol_sk','pha_sk','reg_x1b','reg_k2'],
   r:['oil']},
  lame:{n:'Lame',ic:'u_blade',d:'Le corps à corps : taillades, Mâchoire, coups de cloche.',
   t:['ray_x3b','pen_n1','pen_x1a','dif_n1','dif_n3','dif_x1a','dif_x1b','abe_s4','cad_x1a','cad_k1','dgl_s1','dgl_s3','dgl_s4','dgl_s5'],
   r:[]},
  ruee:{n:'Ruée',ic:'u_charge',d:'Le mouvement qui frappe : esquives qui blessent, ruées, pas de danse.',
   t:['pen_n2','pen_n3','pen_n4','pen_x2a','pen_x2b','pen_x3a','pen_x3b','dif_n2','dif_x2a','dif_x2b','cad_n2','cad_n3','cad_x2a','cad_x2b','cad_k2'],
   r:['sand','feather','pendule']},
  onde:{n:'Onde',ic:'u_wave',d:'Les zones autour de toi : Nova, ondes, explosions.',
   t:['ray_n4','ray_x2a','fan_k1','sol_s5','vor_x3a','dif_x3b','reg_x2b','reg_k1','sai_s4','car_n1','car_n3','car_n6','car_x1a','car_x1b','car_k1','req_n3','pnt_x2b','mdp_s5'],
   r:['bell']},
  sol:{n:'Sol',ic:'u_grid',d:'Les zones posées qui durent : flaques, toiles, pistes, lanterne posée.',
   t:['ray_x2b','fan_n2','fan_x1b','fan_x3a','pha_s1','pha_s2','pha_s3','pha_s5','reg_n3','reg_n5','reg_x2a','req_n6','req_x3a','val_s1','val_s2','val_s3','val_s4','val_s5','val_sk','pnt_n1','pnt_n4','pnt_x1a','pnt_x1b','pnt_x3a','pnt_x3b','gts_s1','gts_s2','gts_s3','gts_s4','gts_sk'],
   r:[]},
  fil:{n:'Fil',ic:'u_thread',d:'Attacher, tirer, faire danser les pantins.',
   t:['trm_n1','trm_n2','trm_n3','trm_n4','trm_n5','trm_x1a','trm_x1b','trm_x2a','trm_x2b','trm_x3a','trm_x3b','trm_k1','trm_k2','pnt_n2','pnt_n3','pnt_n5','pnt_x2a','pnt_k1','pnt_k2','gts_s5','mdp_s1','mdp_s2','mdp_s3','mdp_s4','mdp_sk'],
   r:['ciseaux','fuseau']},
  cloche:{n:'Cloche',ic:'u_bell',d:'Le rythme : cloches, Grand Glas, temps forts, choristes.',
   t:['car_n2','car_n4','car_n5','car_x2a','car_x2b','car_x3a','car_x3b','car_k2','cad_n1','cad_n4','cad_n5','cad_n6','cad_x3a','req_n1','req_n2','req_n5','req_x1a','req_x1b','req_x2b','req_k1','dgl_s2','dgl_sk','chd_s1','chd_s2','chd_s3','chd_s4','chd_sk'],
   r:['diapason','battantr','metro']},
  devoration:{n:'Dévoration',ic:'u_maw',d:'Dévorer, attirer, engloutir, la Corruption.',
   t:['vor_n1','vor_n2','vor_n3','vor_n4','vor_n5','vor_n6','vor_x1a','vor_x1b','vor_x2a','vor_x2b','vor_k1','vor_k2','sai_sk','aby_s1','aby_s2','aby_s3','aby_s4','aby_s5','aby_sk'],
   r:[]},
  lumiere:{n:'Lumière',ic:'u_star',d:'L’aura, l’exposition, la Lueur.',
   t:['ray_n2','ray_n3','ray_n5','ray_n6','ray_k1','ray_k2','fan_x2b','sol_s1','sol_s2','sol_s3'],
   r:['prismg','ash']},
  ombre:{n:'Ombre',ic:'u_ghost',d:'L’Obscur, l’invisibilité, les critiques dans l’ombre.',
   t:['pen_n5','pen_n6','pen_k1','pen_k2','omb_s1','omb_s2','omb_s3','omb_s4','omb_s5','omb_sk'],
   r:[]},
  soin:{n:'Soin',ic:'u_heart',d:'Soins, vol de vie, renaissance.',
   t:['sai_s5','req_n4','req_x3b','trm_n6'],
   r:['phoenix','calice','moelle','fiole','lacry']},
  garde:{n:'Garde',ic:'u_shield',d:'Boucliers, réduction de dégâts, PV max, épines.',
   t:['vor_x3b','dif_n4','dif_n5','dif_x3a','dif_k1','sai_s1','sai_s3','abe_s3','cad_x3b','req_x2a','chd_s5','pnt_n6'],
   r:['wax','cercle','dea','ancre','os']},
  fureur:{n:'Fureur',ic:'u_fist',d:'Les statistiques brutes : dégâts, vitesse, critique, mutations.',
   t:['dif_n6','dif_k2','abe_s1','abe_s2','abe_s5','abe_sk','req_k2'],
   r:['eye','ember','epine','gant','cierge','chaineg']},
  fortune:{n:'Fortune',ic:'u_coin',d:'L’or et les relances.',
   t:[],
   r:['crane','clef','bourse','boussole']}
 }
};})(window.BRUME_DATA=window.BRUME_DATA||{});
