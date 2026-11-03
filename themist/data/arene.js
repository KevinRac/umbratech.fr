// La Brume · données de l'arène large (v18.4, chantier v18, action 4 ; cadrage Q1–Q12 validé le 1er novembre 2026)
// C'est du moteur : le terrain du boss final (une salle plus grande que l'écran), sa caméra, les signes au bord de l'écran pour ce qui arrive
// hors de vue, la transformation de l'arène entre les phases et son coût. Le combat lui-même (le Brumeux, ses phases) vient à l'action 5.
// Lu par le jeu (index.html, bloc « v18.4 · L'arène » ; logique pure /*arene:pur*/), par outils/sim-arene.mjs et par _dev/bancs/banc-arene.mjs.
// Le wiki n'en dit rien tant que l'arène est éteinte (une ligne du journal seulement, Q9) ; il ne dira jamais ce que contient chaque phase.
(function(D){D.arene={
 // Éteinte jusqu'à l'action 5 (Q6) : en jeu, aucune salle ne change. Seul le mode d'essai l'ouvre : index.html?arene=final[&…].
 actif:false,
 // Salles qui reçoivent l'arène (Q1 : le boss final seulement). w × h : taille du monde en écrans (1 280 × 720) ; entree : point d'entrée
 // du joueur, en fractions du monde. etats : états d'arène (Q5) : 0 à 2 d'ESSAI (banc-arene A et C comptent sur eux, à leurs places) ; les états
// réels des phases du Brumeux s'ajoutent après eux (3 : phase I, action 5b ; 4 : phase II, action 5c ; 5 : phase III, action 5d).
 // Un état : bornes jouables (fractions des bornes dures), obstacles (piliers, disques), vides (fosses : on n'y marche pas, rien n'y apparaît),
 // sol (calque peint à l'entrée), brume de décor (ne cache jamais un télégraphe ni un signe de bord). fx, fy : fractions des bornes dures ; r en px.
 salles:{
  final:{w:2,h:1.5,entree:{fx:0.5,fy:0.88},
   etats:[
    {bornes:{fx0:0,fy0:0,fx1:1,fy1:1},sol:'pierre',
     obstacles:[{fx:0.22,fy:0.3,r:34},{fx:0.78,fy:0.3,r:34},{fx:0.22,fy:0.72,r:34},{fx:0.78,fy:0.72,r:34}],vides:[],
     brume:[{fx:0.1,fy:0.15,r:220,a:0.12},{fx:0.9,fy:0.85,r:240,a:0.12}]},
    {bornes:{fx0:0.27,fy0:0.22,fx1:0.73,fy1:0.8},sol:'cendre',
     obstacles:[{fx:0.4,fy:0.5,r:30},{fx:0.6,fy:0.5,r:30}],vides:[{fx:0.5,fy:0.32,r:46}],
     brume:[{fx:0.5,fy:0.7,r:200,a:0.1}]},
    {bornes:{fx0:0,fy0:0.1,fx1:1,fy1:0.9},sol:'braise',
     obstacles:[{fx:0.15,fy:0.5,r:40},{fx:0.85,fy:0.5,r:40},{fx:0.5,fy:0.2,r:28}],vides:[{fx:0.35,fy:0.65,r:52},{fx:0.65,fy:0.65,r:52}],
     brume:[]},
    // 3 · phase I réelle du Brumeux, « le Rappel » (fiche 5b, § 5) : arène pleine ; quatre montants aux frontières des tiers (ils marquent les
    // colonnes sans texte et donnent un abri, toujours hors des fragments) ; pas de fosse ; brume de décor en haut, où son corps se devine.
    {id:'rappel',bornes:{fx0:0,fy0:0,fx1:1,fy1:1},sol:'pierre',
     obstacles:[{fx:0.3333,fy:0.18,r:26},{fx:0.3333,fy:0.82,r:26},{fx:0.6667,fy:0.18,r:26},{fx:0.6667,fy:0.82,r:26}],
     vides:[],brume:[{fx:0.5,fy:0.04,r:320,a:0.14}]},
    // 4 · phase II réelle du Brumeux, « L'Ouvrage » (fiche 5c, § 9) : arène pleine, le chantier est nu (c'est lui qui le remplit) ; sol cendre (il se
    // distingue de la pierre de la phase I sans nouvelle peinture) ; brume de décor en haut, où son corps se devine. tard : son calque n'est pas peint
    // à l'entrée (une arène sans le Brumeux ne le porte jamais : 12 tuiles de plus pesaient sur chaque image, banc-arene C) ; le Brumeux le peint une
    // tuile par image pendant la phase I, et vers() finit d'un coup ce qui manquerait.
    {id:'ouvrage',tard:true,bornes:{fx0:0,fy0:0,fx1:1,fy1:1},sol:'cendre',
     obstacles:[],vides:[],brume:[{fx:0.5,fy:0.04,r:320,a:0.14}]},
    // 5 · phase III réelle du Brumeux, « La Couture » (fiche 5d, § 8) : arène pleine, ni obstacle ni fosse (rien ne tombe sur ses constructions : ce
    // qu'il a bâti reste le terrain) ; sol cendre (le chantier reste le chantier) ; brume de décor plus dense en haut, d'où pendent ses fils.
    // tard : son calque n'est pas peint à l'entrée d'une arène ; le Brumeux le peint une tuile par image pendant la phase II.
    {id:'couture',tard:true,bornes:{fx0:0,fy0:0,fx1:1,fy1:1},sol:'cendre',
     obstacles:[],vides:[],brume:[{fx:0.5,fy:0.04,r:380,a:0.18}]}]}},
 // Bornes dures dans le monde : à la même distance des bords que l'arène d'un écran (AR : 56, 92, 56, 44).
 mur:{g:56,h:92,d:56,b:44},
 // La caméra (Q3). zone : zone morte (rectangle centré) ; tau : lissage exponentiel (s), jamais de dépassement ; avance : jusqu'à px dans le sens
 // du déplacement, lissée (tau), pleine à vRef px/s ; vise : avance vers la souris (0 au départ) ; biaisBoss : la cible glisse vers le boss
 // de cette part de l'écart (cadrage partagé, sans zoom) ; garde : le joueur reste au moins à x px des bords gauche et droit et y px du haut
 // et du bas de la vue sûre, même pendant une ruée. rm : mouvements réduits (sans avance ni biais, zone morte plus grande, lissage plus lent).
 camera:{zone:{w:200,h:120},tau:0.15,avance:{px:70,tau:0.3,vRef:220,vise:0},biaisBoss:0.3,garde:{x:180,y:140},
  rm:{zone:{w:320,h:180},tau:0.25,avance:0,biais:0}},
 // La vue sûre : la vue moins les bandes du HUD (unités de jeu, mesurées à 1 280 × 720). Le garde-fou de la caméra s'en sert ; les signes de bord
 // remesurent les bandes et les blocs du HUD en jeu (la taille du HUD suit celle de la fenêtre), au plus toutes les demi-secondes.
 vue:{marges:{g:16,h:124,d:16,b:122}},
 // Les signes de bord (Q4). cat : par sorte de source, couleur (clé de la grammaire : TELE.zone, TELE.proj, TELE.grab, FOE, lavande, ivoire),
 // distance à la vue en deçà de laquelle le signe apparaît (élites et ordinaires), taille (px). marge : un télégraphe qui touche la vue élargie
 // de cette marge (ou qui vise le joueur) a son signe ; horizon/frole : un projectile qui passera à moins de frole px du joueur dans horizon s.
 // retrait : rentré du bord de la vue sûre ; coin : jamais à moins de coin px d'un coin ; fusion : deux signes plus proches fusionnent (le plus
 // dangereux devant) ; segment : les ordinaires d'un même segment de bord ne font qu'un signe, avec leur nombre ; max : signes visibles au plus.
 indicateurs:{marge:200,horizon:1.5,frole:60,retrait:24,coin:40,fusion:28,segment:120,max:10,
  cat:{tele:{c:'zone',min:16,max:22},proj:{c:'proj',min:14,max:22},saisie:{c:'grab',min:16,max:20},boss:{c:'ivoire',min:22,max:22},
   elite:{c:'foe',dist:900,min:18,max:18},ord:{c:'foeDoux',dist:600,min:14,max:14}},
  // couleurs de la grammaire (r,g,b), recopiées d'index.html : TELE (zone, proj, grab), FOE, lavande des souvenirs, ivoire du point faible
  couleurs:{zone:'255,150,60',foe:'255,58,52',foeDoux:'255,58,52',proj:'205,120,255',grab:'90,220,255',lavande:'180,160,255',ivoire:'255,250,235'}},
 // Aucun coup sans signe : la source d'un coup doit avoir été visible (à l'écran ou par un signe de bord) depuis au moins coup s (boss s pour le boss).
 preavis:{coup:0.6,boss:0.8},
 // Hors de vue : un ennemi au-delà de la vue + jeton px ne prend pas de jeton d'attaque (il approche, il ne frappe pas ; le boss n'est pas concerné) ;
 // un coup du joueur ne touche que ce qui est à l'écran (vue + coup px) ; les apparitions restent dans la vue + apparition px, à minD px du joueur au moins.
 horsVue:{jeton:200,coup:60,apparition:200,minD:230},
 // Le sol (Q7) : cache par zone, tuiles de w × h px (au plus max posées par image), peintes à l'entrée de la salle, un calque par état.
 tuiles:{w:640,h:360,max:9},
 // La transformation entre deux états (Q5) : annonce (s, au moins), bascule (bornes à vitesse px/s au plus ; un obstacle attend qu'une créature
 // parte, au plus attenteMax s, puis la pousse), fondu du sol et de la brume (s). Pendant l'annonce et la bascule, le boss ne lance rien.
 transformation:{annonceS:1.2,vitesse:120,attenteMax:1,fonduS:0.6},
 // Ce que le banc mesure (Q7) : une image de l'arène pleine ne coûte pas plus de rendu ms de plus qu'une salle d'élite au même contenu ;
 // la peinture des tuiles à l'entrée tient en peinture ms.
 budget:{rendu:1.5,peinture:250},
 // Mode d'essai (Q10) : foule d'ennemis ordinaires, boss d'essai (un fantôme qui charge des télégraphes de la grammaire), tirs depuis le hors-champ.
 essai:{foule:20,boss:{r:44,vitesse:70,charge:1.2,pause:1.6,degats:12},tirs:{toutes:1.6,vitesse:380,degats:8}}
};})(window.BRUME_DATA=window.BRUME_DATA||{});
