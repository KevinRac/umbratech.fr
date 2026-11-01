// La Brume · données du Brumeux, le boss final (v18.5, chantier v18, action 5 ; cadrage Q1–Q17 validé le 1er novembre 2026)
// Action 5a : le socle technique seulement. Les cinq phases ne sont PAS écrites ici (5b à 5f) : le moteur est éprouvé avec des gestes
// d'ESSAI (formes de zone déjà connues, comme le boss d'essai de l'arène). Lu par le jeu (index.html, bloc « v18.5 · Le Brumeux » ; logique
// pure /*brx:pur*/), par outils/sim-brumeux.mjs et par _dev/bancs/banc-brumeux.mjs. Le wiki ne lit de ce fichier rien d'autre que ce que
// l'action 5g y branchera (sa carte, Q16) : ni les phases, ni la partition, ni la lecture, ni les tirages (secret).
// En jeu, rien n'est allumé : l'arène (arene.js, actif:false) reste fermée et le boss final provisoire tient sa place jusqu'à l'action 5g.
// Seul le mode d'essai ouvre le Brumeux : index.html?brumeux=<phase>[&palier=…][&graine=…][&reserve=…][&bot=2][&classe=…].
(function(D){D.brumeux={
 nom:'Le Brumeux',
 // ── Les cinq phases (Q1). id : nom de travail, jamais affiché ; presence : au-dessus de l'arène (mains, croix, fils ; haut) ou au sol (sol) ;
 // faible : ce que l'anneau ivoire entoure (G27.anneau) ; arene : l'état d'arène (data/arene.js, salles.final.etats : 0 pleine, 1 resserrée,
 // 2 bande à fosses ; les cinq états réels viennent avec les fiches 5b à 5f) ; libre : part improvisée visée (indicative, Q8) ;
 // pv : PV de la phase (placeholders, à calibrer au bot à l'action 5g : 50 à 70 s par phase, Q11). Pas de PV ni de dégâts en plus par palier (Q12).
 // exclut : les sortes d'éléments que cette phase ne tire jamais (V : l'arène se défait, rien n'y est bâti).
 phases:[
  {id:'rappel',presence:'haut',faible:'mains',arene:0,libre:0.25,pv:2400},
  {id:'ouvrage',presence:'haut',faible:'mains',arene:0,libre:0.40,pv:2400},
  {id:'couture',presence:'haut',faible:'croix',arene:0,libre:0.50,pv:2400},
  {id:'emprunt',presence:'sol',faible:'coeur',arene:1,libre:0.50,pv:2400},
  {id:'effacement',presence:'sol',faible:'coeur',arene:2,libre:0.60,pv:2400,exclut:['construction']}],
 // Les dégâts au-delà d'un seuil de phase ne passent pas à la phase suivante (même règle que les gardiens) ; le verrou de phase est celui
 // de data/gardiens.js (verrouPhase : 1,2 s à 15 %). dureeS : la transition entière (verrou, cri, transformation de l'arène, relecture).
 transition:{dureeS:3,cri:true,relecture:true},
 // ── La partition (Q8, option b) : chaque phase est une boucle de mesures, les unes fixes (socle appris), les autres libres (improvisées,
 // retirées à chaque boucle). 5a : une seule partition d'ESSAI, la même pour les cinq phases (chaque fiche 5b à 5f écrit la sienne).
 // Une mesure : {k:'fixe', g:<geste d'essai>} ou {k:'libre'} ; entre deux mesures, l'entracte (s). nu : à nu (anneau ivoire) après la boucle (s).
 partition:{entracteS:1.6,nuS:2.2,
  essai:[{k:'fixe',g:'disque'},{k:'libre'},{k:'fixe',g:'feinte'},{k:'libre'},{k:'fixe',g:'couloir'},{k:'libre'}]},
 // ── Les éléments improvisables (Q8) et leur menace. sorte : zone, tir, saisie, construction (deux éléments de même sorte ne se cumulent
 // pas au-delà de cumul[sorte]). charge : préavis (s, ≥ preavis.boss) ; degats : avant la montée (dmgMul). pond : l'axe du profil qui pèse
 // (sens +1 : plus l'axe est haut, plus l'élément pèse ; −1 : l'inverse) ; sources : les ennemis de la descente dont les dégâts reçus
 // (RUN.par18) font monter l'élément. 5a : des gestes d'ESSAI aux formes connues (disque, couloir, pluie de disques, anneau, tir).
 elements:{
  disque:{menace:2,sorte:'zone',forme:'disque',r:90,charge:1.2,degats:12,vise:true,pond:{axe:'portee',sens:-1},sources:['rampant','bouffi']},
  couloir:{menace:3,sorte:'zone',forme:'couloir',w:70,len:900,charge:1.2,degats:12,vise:true,pond:{axe:'portee',sens:1},sources:['brute']},
  pluie:{menace:3,sorte:'zone',forme:'disque',n:3,r:70,charge:1.2,degats:10,vise:false,pond:{axe:'esquive',sens:-1},sources:['hurleur']},
  anneau:{menace:3,sorte:'zone',forme:'anneau',r0:60,r1:260,charge:1.0,degats:10,vise:true,pond:{axe:'esquive',sens:1},sources:['hurleur']},
  tir:{menace:2,sorte:'tir',n:1,vitesse:380,degats:8,charge:0.8,pond:{axe:'portee',sens:1},sources:['spectre','voile']},
  rafale:{menace:3,sorte:'tir',n:3,vitesse:380,degats:6,charge:0.8,pond:{axe:'rythme',sens:1},sources:['spectre']},
  construction:{menace:3,sorte:'construction',r:34,pond:{axe:'soin',sens:1},sources:[]},
  feinte:{menace:0,sorte:'feinte'}},
 cumul:{zone:1,saisie:1,tir:2,construction:1,feinte:1},
 // ── Le budget d'une mesure libre, par phase (menace cumulée) et par palier (Q12 : ×1,25 en Difficile, ×1,5 en Extrême ; jamais de PV ni de
 // dégâts en plus). Un tirage prend des éléments tant que le budget et le non-cumul le permettent ; le premier est ce qui t'a tué (Q13).
 budget:{base:[4,5,6,6,7],palier:{normal:1,difficile:1.25,extreme:1.5}},
 paliers:{normal:{constructions:5,masques:2,phaseV:'courte'},difficile:{constructions:6,masques:2,phaseV:'courte'},extreme:{constructions:6,masques:3,phaseV:'entiere'}},
 // phase V courte (Normal, Difficile) : réduite à son socle et à cette part de ses PV ; entière (Extrême) : regles.extreme.brumeux.phaseEntiere.
 phaseV:{courte:{pv:0.5}},
 // ── La lecture du joueur (Q2) : une à l'entrée, une à chaque changement de phase ; elle devient des POIDS dans les tirages, jamais des chiffres
 // du boss. axe : poids = plancher + pente × (l'axe, ou 1 − l'axe selon le sens) ; axe inconnu : 1. verdict (SAVE.mem.prof.eff, par contre-mesure
 // et son axe) : « a porté » (score ≥ 0) pèse porte × score sur les éléments du même axe et du même sens ; déjouée deux fois (abandonnée) : × abandon.
 // par (RUN.par18) : la part des dégâts reçus dans la descente qui vient des sources de l'élément pèse × (1 + poids × part). tue : l'élément qui
 // t'a tué à cette phase au combat d'avant (SAVE.brumeux) est tiré en premier. Le moment de lecture se montre en image (regard, petit rire), sans texte.
 lecture:{axe:{plancher:0.4,pente:1.2},verdict:{porte:0.6,abandon:0.5,abandonApres:2},par:{poids:0.8},tue:{premier:true},min:0.05},
 // ── Préavis : jamais moins que celui du boss dans l'arène (arene.js, preavis.boss, 0,8 s). Première rencontre (Q8) : un élément que cette
 // sauvegarde n'a jamais vu au combat final reçoit premiere s de préavis en plus.
 preavis:{boss:0.8,premiere:0.3},
 // ── Toujours une sortie (Q8) : avant de poser une zone, une sortie à pied doit exister (même garantie que sbPlacer / sbArrivee : à ta vitesse
 // de marche si elle est plus lente que celle de la justice, avec ton vrai rayon, après le réflexe). essais : variantes tentées (rotation,
 // décalage vers le centre) avant de sauter l'élément ; pas : pas de recherche (px).
 sortie:{essais:4,pas:6,anneauMarge:10},
 // ── Les constructions, comme système (Q9) : jamais de dégât en apparaissant (annonce, puis elles poussent, après l'attente de arene.js) ;
 // connexité : après chaque construction, au moins cette part de l'aire libre reste reliée à ta position, sur la grille de la carte de
 // distances FF (cs : pas, pad : marge, les mêmes que le jeu) ; aire : part de l'aire libre qu'elles peuvent couvrir au plus ; max : par palier
 // (paliers.*.constructions). couleur d'annonce : craie (ΔE ≥ 25 de toute la grammaire, ivoire compris). Rendu : une image par sorte et par état.
 constructions:{connexite:0.85,aire:0.3,grille:{cs:20,pad:15},annonceS:1.5,poussee:true,sortes:{pilier:{r:34}}},
 // ── Couleurs (r,g,b), hors grammaire : craie = annonce d'une construction ; les autres sont la matière du Brumeux (jamais une couleur de
 // télégraphe : orange, rouge, violet, cyan ; ni la lavande des souvenirs, ni l'ivoire du point faible). Le simulateur vérifie ΔE ≥ 25.
 couleurs:{craie:'160,185,150',yeux:'175,185,205',fils:'170,165,185',croix:'120,110,140',capuche:'52,44,70',manteau:'70,60,95'},
 // ── Sauvegarde (Q13) : SAVE.brumeux, versionnée. tentatives, phase atteinte au plus haut, l'élément qui t'a tué par phase, victoires.
 // Une descente d'essai n'écrit rien. Au combat suivant, il rejoue d'abord ce qui t'a tué (lecture.tue).
 sauvegarde:{v:1},
 // ── Statistiques (Q13, Q15 point 1) : durée des images à l'acte X (moyenne et pire 5 %, sur un échantillon), temps et coups reçus par phase.
 stats:{images:{echantillon:4000,pire:0.05}},
 // ── Dessin (Q10). version : change quand le dessin se voit. Phases I–III : mains, croix de manipulation et fils en haut de l'arène, corps deviné
 // dans la brume ; IV–V : corps entier au sol à l'échelle d'un gardien (r). glyphe : croix de manipulation et œil, 24 × 24, lisible à 16 px (XML
 // valide et autonome : balise inline du wiki, image du HUD et du signe de bord). Il remplace l'œil d'essai du boss de l'arène (point ouvert (4), § 34).
 // hauteur : où ses mains pendent sous le haut de l'arène (px) ; suit : elles descendent vers toi de cette part de ce qui te sépare d'elles
 // (lissé), pour rester dans la vue quand tu te bats au milieu de l'arène ; son corps, lui, reste au bord du monde.
 dessin:{version:1,r:{haut:30,sol:48},hauteur:200,suit:0.6,echelle:{solide:1.15},
  glyphe:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><path d="M3 8.5H21M12 2.6V14.6" fill="none" stroke="#0a0810" stroke-width="4.4" stroke-linecap="round"/><path d="M3 8.5H21M12 2.6V14.6" fill="none" stroke="#c8c0d8" stroke-width="2.2" stroke-linecap="round"/><path d="M4.6 9.4V21.6M19.4 9.4V21.6M12 15.4V21.6" fill="none" stroke="#0a0810" stroke-width="2.6" stroke-linecap="round"/><path d="M4.6 9.4V21.6M19.4 9.4V21.6M12 15.4V21.6" fill="none" stroke="#b9b0c8" stroke-width="1.2" stroke-linecap="round"/><path d="M7 8.5Q12 3.4 17 8.5Q12 13.6 7 8.5Z" fill="#eee8da" stroke="#0a0810" stroke-width="1.3" stroke-linejoin="round"/><circle cx="12" cy="8.5" r="1.9" fill="#0a0810"/></svg>'},
 // ── Le bot qui frappe (Q14, bot=2) : il attaque avec le kit de base de sa forme, sort des zones qui chargent (à sa vitesse de marche, par une
 // esquive s'il le faut), vise le Brumeux (ou l'ennemi le plus proche s'il est plus près que proche px). Il sert aussi à mesurer l'action 6.
 bot:{proche:220,portee:520,cycleS:0.5},
 // ── Mode d'essai (Q17) : phase de départ (1 à 5), palier, graine, réserve garnie (ids de talents séparés par des virgules), bot, classe.
 essai:{foule:0,dieu:true}
};})(window.BRUME_DATA=window.BRUME_DATA||{});
