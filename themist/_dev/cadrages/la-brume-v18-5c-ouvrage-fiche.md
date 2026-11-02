# La Brume · v18.5 « Le Brumeux » · action 5c · fiche courte de la phase II, « L'Ouvrage », et du système de constructions

Statut : **soumise à l'auteur le 2 novembre 2026, en attente de validation** (cadrage Q17 : aucune ligne de code avant la validation). Rédigée à partir du cadrage validé (Q1, Q2, Q4, Q8, Q9, Q11, Q12, Q13, Q14, Q15, Q17), de la fiche 5b (modèle de forme), de `_dev/memoire.md` § 36 (phase I : écarts, mesures, points ouverts), § 35 (socle 5a : constructions d'essai, `pilier18`, `brxPoser`, connexité, craie), § 34 (arène : piliers, fosses, transformation, tuiles, coût, signes de bord), § 32–33 (paliers), et du code actuel (`/*brx:pur*/`, bloc v18.5 et sa section v18.6, bloc v18.4, `profile()` et ses six axes, `BE_D.contreMesures`, `hitsWall`, `crashed`, `losClear`, le mannequin `fixed`).

Ce qu'il faut savoir du code avant de lire :
- Tout obstacle de salle est un **disque** de `room.pillars` (`{x, y, r, kind}`) : collisions du joueur et des ennemis (`collidePlayer`, `collideEnemy`), arrêt des tirs (`hitsWall`, pour les tirs ennemis, les tiens et ceux des armes de la Brume), ligne de vue de l'IA (`losClear`), carte de distances `FF` (`ffBlk`, refaite quand le nombre de piliers change ou sur `CAM.ff`), arrêt des charges (`crashed` : une Brute ou un Masqué qui heurte un pilier est sonné). Une fosse de l'arène est un pilier `fosse18` : **elle arrête aujourd'hui les tirs comme un mur** (§ 34, point (3)).
- Les constructions d'essai de 5a sont un seul disque `pilier18` (`brx18`), posé par `poser()` / `consPas()`, jamais cassable, effacé en V.
- Le seul objet frappable « fixe » du jeu est le mannequin du Sanctuaire : un ennemi de `enemies` avec `fixed:true` (l'Accoutumance, le profil, les exécutions, les pantins, le recul et l'IA l'ignorent ; il se soigne seul).
- Les six contre-mesures (`BE_D.contreMesures`) sont exactement les six constructions de Q4 en version « ennemis » : Traque (portée haute), Pétards (portée basse), Tir de barrage (esquive haute), Béliers (esquive basse), Brume avide (soin haut), Renforts (rythme haut). Leurs verdicts (`SAVE.mem.prof.eff`) se lisent donc une à une sur les constructions.
- En phase II, ses mains suivent ton abscisse et descendent vers toi de 60 % de ce qui vous sépare (5a) : c'est elles qu'on frappe.

---

## 1 · Gestes signature (socle, toujours les mêmes)

| Geste (nom jamais affiché) | Forme (parmi les neuf) | Où | Préavis | Dégâts avant montée |
|---|---|---|---|---|
| **La Ruée** | couloir de 90 px, de ses mains vers toi et au-delà, jusqu'au bord de l'arène (1 400 au plus) | depuis ses mains | 1,2 s | 14 |
| **L'Équerre** | croix : deux bras de 70 px de large et 900 de long, croisés sur toi, alignés sur l'arène (tournés de 45° en variante) | sur toi | 1,0 s | 12 |
| **La Truelle** | cône de 70° depuis ses mains vers toi, de 60 à 520 px de ses mains | depuis ses mains | 1,1 s | 12 |
| **La feinte** (fil rouge v14) | disque vrai ou faux, r 86 | sur toi | 1,15 s (jugée à 0,6 s, règle v14) | celle de la feinte |

- **Deux sorties lisibles par geste :**
  - La Ruée : de côté (45 px plus ton rayon), ou **derrière une construction** ;
  - L'Équerre : n'importe lequel des quatre quadrants, en diagonale ;
  - La Truelle : hors de l'angle, de côté, ou **sous ses mains** (à moins de 60 px de leur pointe : le cône ne part qu'à 60 px) ;
  - la feinte : comme partout.
- **La Ruée et les constructions** (la réponse « une charge qui les heurte est sonnée » de Q4, appliquée à sa propre ruée) :
  - le couloir **s'arrête sur tout ce qui arrête un tir** (construction, montant de l'arène ; jamais une fosse) ;
  - le télégraphe est tracé jusqu'à l'obstacle seulement : derrière, on est à l'abri, et ça se voit ;
  - sa main s'y brise : il est **sonné 2 s** (`vuln`, anneau ivoire sur ses mains) ;
  - une construction heurtée perd un palier de fissure (un tiers de ses PV).
- Tous orange `TELE.zone`. Première rencontre : +0,3 s (`brxPreavis`).
- Ils deviennent des éléments de `data/brumeux.js` marqués `fixe:true` : jamais tirés dans une mesure libre, jamais `premier` (règle 5b).
- Moteur : `brxDans` gagne la forme **`cone`** (`{x, y, a, ouv, r0, r1}`) ; la croix est deux couloirs du même geste (`grp` : un seul coup) ; la Ruée est un couloir **coupé** par `brxCoupe` (logique pure : premier pilier qui arrête un tir sur le trajet, au contact de la main).

**Recommandation : ces trois gestes et la feinte.** Formes : couloir, croix, cône (la phase I a pris rayons, anneau à brèche, damier). Dégâts dans la fourchette 5a et 5b (10 à 14), recalés en 5g et à l'action 7.

## 2 · Partition chiffrée (`partition.ouvrage`)

Le cycle de Q4 (bâtir · geste · bâtir · effondrement) est la colonne de la boucle ; la boucle dure environ **32 s**, la phase environ **deux boucles (≈ 63 s**, cible 50 à 70 s, Q11).

| # | Mesure | Nature | Durée indicative |
|---|---|---|---|
| 1 | **Bâtir** | fixe (la sorte est lue, § 3) | 1,8 s (annonce 1,5 s + pose) |
| 2 | La Ruée | fixe | 1,6 s (charge, puis course 0,4 s) |
| 3 | mesure libre | libre (budget 5 / 6,25 / 7,5) | ~1,5 s |
| 4 | **Bâtir** | fixe | 1,8 s |
| 5 | **Les Manœuvres** | fixe (§ 6) | 1,3 s |
| 6 | La feinte | fixe | 1,2 s |
| 7 | L'Équerre | fixe | 1,3 s |
| 8 | **Effondrement** | fixe (§ 5) | 1,8 s |
| 9 | mesure libre | libre | ~1,5 s |
| 10 | La Truelle | fixe | 1,4 s |

- **Entracte** : 1,4 s entre deux mesures (comme la phase I).
- **À nu après la boucle** : 2,5 s (`nuS`).
- **Fenêtres à nu dans la boucle** : ses mains pendant chaque annonce de construction (2 × 1,5 s), sa main brisée après une Ruée arrêtée (2 s), un échafaudage tombé (2 s), une construction annulée (+1,5 s). Les deux premières sont au socle ; les autres, tu les provoques.
- **Mesures libres** : les éléments de 5a (disque, couloir, pluie, anneau, tir, rafale), pondérés par la lecture. Les tirs (`tir`, `rafale`) s'arrêtent sur les murs : ce que tu as laissé debout devient ton abri.
- Une mesure qui ne peut pas se jouer (rien à effondrer, aucune construction possible, appel au plafond) **saute** : comptée, entracte réduit à 0,6 s.

**Recommandation : cette partition.**

## 3 · Les six constructions (Q4), une par axe du profil

Chaque construction est **une chaîne de disques** posés dans `room.pillars` (sorte `pilier18`, ou `fosse18` pour les douves), avec un identifiant de construction commun. Tout le moteur existant s'applique sans retouche : collisions, tirs arrêtés, ligne de vue, `FF`, charges sonnées.

PV : une **part des PV de la phase II** (`pvPart`, 2 400 en placeholder), pour que la calibration de 5g les emporte avec elle. Fissures : trois états par paliers d'un tiers (**intacte** > 2/3, **fêlée** ≤ 2/3, **lézardée** ≤ 1/3), puis détruite (gravats sans dégât, retirée, `FF` refaite).

| Construction | Lue sur (contre-mesure jumelle) | Forme et taille | Où il la pose | PV | Effet (ce qu'elle gêne) | Réponse offerte |
|---|---|---|---|---|---|---|
| **Murailles** | portée haute (Traque) | segment de 160 à 240 px (160 + 80 × (portée − 0,5) / 0,5, borné), disques r 18 tous les 20 px (≈ 36 px d'épaisseur) | en travers de la ligne toi → ses mains, à 45–60 % de la distance, perpendiculaire, jamais à moins de 90 px de toi | 8 % (192) | coupe tes lignes de tir et les siennes ; ses tirs s'y arrêtent | on la contourne ; **sa Ruée s'y brise** (sonné 2 s) ; une Brute ou un Masqué qui la charge est sonné (`crashed`) et lui ôte un palier |
| **Douves** | portée basse (Pétards) | anneau de fosses autour d'une île : axe r 200, fosses r 28 tous les 36 px ; **quatre passerelles** de 64 px (N, E, S, O), ouvertes deux par deux en alternance toutes les 2,5 s | île centrée à 340–440 px de toi, du côté de ses mains ; **ses mains s'y retirent pendant l'annonce et y restent** tant que la douve tient | aucun (incassable, Q9.4) | tient le contact à distance : pour frapper ses mains, il faut passer par une passerelle ouverte | une fosse **n'arrête pas les tirs** ; un ennemi ordinaire repoussé dedans **tombe** (et une Brute qui charge dedans aussi) ; **frapper ses mains pendant l'annonce l'empêche de se retrancher** |
| **Colonnades** | esquive haute (Tir de barrage) | 2 rangées de 4 fûts r 14, à 64 px d'axe en axe (jours de 36 px) | centrée à 150 px de toi, du côté opposé à ses mains (là où l'on recule), face à lui | 2 % par fût (48) ; la colonnade disparaît avec son dernier fût | une esquive en ligne droite bute dans les fûts | les fûts arrêtent ses tirs : **derrière, un abri contre les salves** ; casser deux fûts ouvre un passage |
| **Rails** | esquive basse (Béliers) | rail de 640 px, deux butoirs r 22 aux bouts ; une cloche r 38 le parcourt | le rail passe par ta position à l'annonce, orienté vers ses mains | butoirs 5 % chacun (120) ; un butoir cassé : la cloche quitte le rail, le rail devient un décor inerte | **toutes les 6 s**, couloir orange de 96 px sur tout le rail (préavis 1,0 s), puis la cloche passe en 0,85 s : **12 dégâts** ; la première cloche part 2 s après la pose | esquiver **de côté** (48 px plus ton rayon) ; le rail est fixe et lisible ; la cloche écrase les ennemis (60 aux ordinaires, 30 aux élites et Masqués, jamais lui) |
| **Puits avides** | soin haut (Brume avide) | puits r 34, liseré au sol de r 220 dans sa matière | à 160–240 px de toi, son rayon te couvrant | 6 % (144) | dans son rayon, **tu ne gardes que 30 % de tes soins** ; le reste remplit le puits (niveau visible), jusqu'à 40 % de tes PV max | **casse-le : il te rend d'un coup ce qu'il a bu** (où que tu sois, par un fil de lumière dans sa matière) ; s'il s'effondre de lui-même, c'est perdu |
| **Échafaudages** | rythme haut (Renforts) | tour r 30, reliée à sa croix par un fil tendu (visible d'un bout à l'autre) | à 520 px de toi au moins, dans le tiers de l'arène le plus loin de toi, à 120 px des bornes | 10 % (240, ≈ 3 s de frappe) | **il subit −40 %** tant qu'au moins un échafaudage tient (non cumulable ; à nu, 0,6 × 1,5 = 0,9 : jamais invulnérable) | aller le casser ; **le faire tomber le sonne 2 s** (sa croix vacille) ; sa Ruée qui s'y brise compte aussi |

**Au plus debout par sorte** : murailles 3, douves 1, colonnades 2, rails 2, puits 2, échafaudages 2 (sous le plafond du palier, 5 / 6 / 6).

**La lecture** (Q2 : une à l'entrée du combat, une relecture à l'entrée de chaque phase ; la phase II lit donc aussi ce que tu as fait en phase I) :
- **Seuil** : une sorte n'est éligible que si son score vaut au moins **0,35** (score = l'axe, ou 1 − l'axe pour une sorte « basse »). Un joueur de portée 0,9 ne voit jamais de douves, et un joueur de soin 0,2 jamais de puits. Axe inconnu : score 0,5 (éligible, poids neutre).
- **Poids** : 0,4 + 1,2 × score (la forme de `lecture.axe`).
- **Verdicts** de la contre-mesure jumelle : « a porté » × (1 + 0,6 × score du verdict), abandonnée (déjouée 2 fois) × 0,5 (`lecture.verdict`).
- **Variété** : × 0,5 par construction de la même sorte déjà debout ; le second bâtir d'une boucle ne reprend pas la sorte du premier s'il existe une autre sorte éligible.
- **Ce qui t'a tué d'abord** (Q13) : si ta dernière mort en phase II venait d'une construction (§ 9), le **premier bâtir** de la phase rejoue sa sorte, avant toute lecture, si elle est encore possible.
- **Placement** : quatre variantes (rotation ±20°, glissement de 60 px) passées à `brxPoser` ; si aucune ne passe, il bâtit la sorte suivante dans l'ordre des poids ; si aucune sorte ne passe, la mesure saute (comptée).
- La **matière** de chaque construction est tirée à graine parmi les décors traversés (§ 7), en évitant celle de la construction précédente.

**Recommandation : ces six constructions, cette lecture et ces chiffres.**

## 4 · L'annonce en craie et les mains à nu

- **Annonce, 1,5 s** : le contour de la construction en craie (pointillé, `couleurs.craie`), les fils qui descendent de ses mains jusqu'au contour, ses mains **à nu** (`vuln`, ×1,5, anneau ivoire). Pour une douve, ses mains glissent vers l'île pendant l'annonce (300 px/s au plus).
- **Annulation** : si ses PV perdent, pendant l'annonce, **au moins 5 % des PV de la phase II** (120 en placeholder ; comptés après plafond du Dernier Souvenir, verrou et Accoutumance, comme ses PV les perdent vraiment) :
  - la construction n'est pas posée et la craie s'émiette ;
  - il reste à nu **1,5 s de plus** ;
  - un rire étranglé, sans parole.
  - Une construction annulée ne compte pas dans le plafond et n'est pas rebâtie dans la boucle.
- **Pose** (Q9.1) : jamais de dégât en apparaissant. Une créature sous le contour attend au plus 1 s (`transformation.attenteMax`), puis elle est **poussée hors du contour, du côté le plus proche, sans dégât**. Une passerelle qui se ferme sous une créature fait de même.

**Recommandation : 5 % des PV de la phase pendant l'annonce**, un seuil qu'un joueur qui se jette sur ses mains atteint (au rythme moyen d'une phase de 60 s, avec ×1,5, environ 7 %), et qu'un coup isolé n'atteint pas. Le banc J le mesure par forme et 5g le recale.

## 5 · L'effondrement

- **Laquelle** : la construction debout et effondrable (murailles, colonnades, échafaudages, puits ; jamais une douve ni un rail) **la plus proche de toi** dont la chute laisse une sortie. S'il n'y en a aucune, la mesure saute : **tout casser, c'est aussi ne rien recevoir sur la tête**.
- **Préavis 1,4 s** (+0,3 s à la première rencontre), zone orange, **16 dégâts**. Un fil tendu de sa croix à la construction, qui penche vers toi pendant le préavis (fondu en mouvements réduits).
- **Zone par sorte** :

| Sorte | Zone (forme) | Sorties |
|---|---|---|
| Muraille | **couloir** parallèle à la muraille, du côté où tu es : axe décalé de 90 px vers toi, 150 px de large, sa longueur | au-delà d'un bout, ou reculer au-delà de 165 px |
| Colonnade | **rayons** : un couloir de 34 px et 220 px de long par fût restant, vers toi | de côté, au-delà de la colonnade, ou reculer au-delà de 220 px |
| Échafaudage | **disque** r 140, centré à 60 px de lui vers toi | sortir du disque, d'un côté ou de l'autre |
| Puits | **disque** r 110 sur lui (ce qu'il avait bu est perdu) | sortir du disque |

- La construction tombée est retirée au coup, `FF` refaite ; une chute d'échafaudage par l'effondrement **ne le sonne pas** (c'est lui qui l'a voulue).
- Les ennemis sous la chute : 2 × les dégâts pour toi (32). Lui n'est jamais touché.

**Recommandation : cet effondrement.**

## 6 · Les Manœuvres (l'appel de la phase II)

Sans ennemis, trois des six réponses de Q4 resteraient lettre morte en phase II (une charge qui se brise sur un mur, un ennemi qui tombe dans une douve, la cloche qui écrase). Une fois par boucle, il descend donc **une équipe au bout de ses fils**, choisie pour **éprouver ce qu'il a bâti** :

| Construction la plus récente debout | Ennemi descendu |
|---|---|
| muraille | Brute (sa charge s'y brise) |
| douve | Bouffi (repoussé dedans, il tombe) |
| colonnade | Spectre (ses tirs s'arrêtent sur les fûts) |
| rail | deux Rampants (une place ; la cloche les écrase) |
| puits, échafaudage, aucune | Rampant |

- **2 / 2 / 3 ennemis** (Normal / Difficile / Extrême), pris dans l'ordre des constructions de la plus récente à la plus ancienne, puis des Rampants.
- Jamais de champion ni de Masqué (ils viennent en phase III).
- Places tirées par `brxPlaces`, à 230 px de toi au moins, dans la vue plus 200 px (règle de l'arène). Cercle violet de 0,85 à 1,3 s, fil qui descend de ses mains.
- Au plus **4 ennemis de l'appel vivants** ; au-delà, la mesure saute.
- Ce sont des pièces connues assemblées (règle de l'auteur), au socle : la composition se lit sur ce qu'il a bâti, pas sur un tirage caché.

**Recommandation : cette mesure** (écart 1).

## 7 · Le système de constructions (Q9, règles 1 à 8)

1. **Jamais de dégât en apparaissant** : annonce en craie 1,5 s, attente 1 s au plus, poussée sans dégât (§ 4). Ce qui blesse est un mécanisme annoncé en orange : la cloche, l'effondrement.
2. **Connexité et aire** (`brxPoser`, étendu aux chaînes de disques) :
   - au moins **85 %** de l'aire libre reste reliée à toi sur la grille de `FF` (pas 20, marge 15), une douve étant comptée **dans son état le plus fermé** (deux passerelles ouvertes sur quatre : il y en a toujours deux) ;
   - les constructions couvrent au plus **30 %** de l'aire libre de l'état d'arène ;
   - au plus **5 / 6 / 6** debout (Normal / Difficile / Extrême), annonces comprises ;
   - jamais sur toi ;
   - jamais sur la voie d'un rail (bande de 96 px), et un rail ne se pose pas à travers une construction ;
   - jamais à moins de 40 px des bornes.
   - Ordre de grandeur : les six sortes à la fois couvrent environ 13 % de l'aire libre.
3. **Tirs** : murailles, colonnes, échafaudages, puits, butoirs et montants de l'arène arrêtent tous les tirs (les tiens, les siens, ceux des ennemis et des armes de la Brume). **Les fosses non** (douves, et les fosses des états d'arène).
   - La règle change dans le bloc v18.4 par deux enveloppes : `hitsWall` et `losClear` ignorent un pilier `fosse18` **seulement quand l'arène est allumée** (`CAM.on`). Les fosses arrêtent toujours la marche.
   - **Preuve que rien hors du combat ne change** :
     - un pilier `fosse18` n'est créé que par `piliers()` du bloc v18.4 ;
     - hors de l'arène, `CAM.on` est faux et les deux enveloppes rendent l'ancien résultat au bit près (le simulateur le vérifie sur 10 000 appels avec et sans fosse) ;
     - le banc G compare image par image toutes les salles hors finale dans les trois paliers.
   - L'essai de l'arène (`?arene=final`, états 1 et 2, qui ont des fosses) change, lui : c'est voulu, et noté.
4. **Casser** : tout se casse, sauf les douves (incassables, elles ont leurs passerelles ; elles disparaissent en V).
   - Fissures à 2/3 et 1/3 ; destruction à 0.
   - Ni le profil, ni l'Accoutumance, ni les exécutions, ni les pantins, ni les PV volés, ni le butin ne voient une construction.
   - Les brûlures, poisons et marques n'y prennent pas ; les coups directs, les zones, les tirs et le Dernier Souvenir oui.
   - Un tir du joueur qui s'arrête sur une construction la frappe (dégâts du tir).
   - Une même attaque qui touche plusieurs disques d'une construction ne compte qu'une fois par image (le plus gros coup).
5. **Entité fixe** : chaque disque cassable est une entrée `fixed` de `enemies` (comme le mannequin, sans se soigner seul), reliée à sa construction, qui porte les PV. Pour l'IA ce n'est pas un ennemi : ni jeton, ni recul, ni cible du ciblage automatique (rebonds, tête chercheuse, `nearestFoe`). Une construction ne compte pas pour vider une salle.
   - **« On ne frappe que ce qu'on voit »** s'applique : un coup du joueur sur une construction au-delà de la vue plus 60 px est retenu, comme pour un ennemi.
6. **Rendu** :
   - des **modules** par sorte, par matière et par état de fissure (3 × 3 par sorte), **cuits à l'entrée du combat** avec les calques de la phase I (peinture ≤ 250 ms en tout) ;
   - l'image d'une construction est **assemblée une fois, à son annonce**, dans sa propre toile (≤ 3 ms, mesuré) : une image par état, déjà tournée à son orientation ;
   - posée **recadrée sur la vue et calée au pixel** (`poseVue`, leçons de 5b), jamais tournée ni mise à l'échelle à l'image ;
   - la grille de `FF` est refaite à chaque pose, chute, destruction et bascule de passerelle (`CAM.ff`), donc au plus toutes les 2,5 s, jamais à chaque image.
7. **Aspect** : bâties avec des morceaux des actes traversés, une matière par décor (corps, arête) :

| Matière | Décor | Corps | Arête | ΔE minimal à la grammaire, à la craie, à l'ivoire et aux couleurs du Brumeux |
|---|---|---|---|---|
| **pierre** | Faubourgs | 92,84,72 | 132,118,96 | 27,8 (croix, craie) |
| **bronze** | Cryptes | 104,78,44 | 150,116,64 | 35,9 (craie) |
| **chair** | Cœur | 112,50,46 | 152,82,76 | 36,2 (capuche) |

   - Le Masqué et les ennemis sont dessinés sur ces matières : leur rouge `FOE` en reste à plus de 60.
   - Le rail, les passerelles, le liseré du puits et le fil de l'échafaudage sont tracés dans l'arête de leur matière.
   - La fissure est un tracé plus sombre du corps, jamais une couleur de la grammaire.
8. **Couleur d'annonce** : la craie de 5a (160,185,150), déjà à ΔE ≥ 25 de toute la grammaire, ivoire compris ; le simulateur vérifie aussi les six nouvelles teintes (≥ 25 de tout).

**Recommandation : ces huit règles**, dont les deux enveloppes de la règle 3 dans le bloc v18.4.

## 8 · Ce qui reste, ce qui passe, ce qui s'efface

- **De la phase I, rien** : les montants de l'état 3 disparaissent à la transformation, et aucun fragment, règle ni dalle ne survit au rideau.
- **Vers la phase III** : tout reste, mécanismes compris. Les passerelles battent, la cloche roule, le puits boit, et un échafaudage garde son −40 %.
  - Il ne bâtit plus et n'effondre plus : l'élément `construction` (le pilier d'essai de 5a) devient `fixe:true`, la mesure « bâtir » de la phase II.
  - Si un obstacle du nouvel état d'arène tombe sur une construction, elle **cède** (retirée sans dégât, en fondu).
  - La place des mains au-dessus d'une île se décidera dans la fiche 5d.
- **Vers la phase IV** : restent celles qui tiennent **entières dans les bornes de l'état IV** ; les autres s'effacent en brume, sans dégât, pendant l'annonce de la transformation.
  - La connexité est revérifiée ; si elle manque, il retire d'abord les plus éloignées du centre.
- **Phase V** : effacées (5a) ; leur chute annoncée vient avec la fiche 5f.

**Recommandation : ce partage.**

## 9 · État d'arène réel de la phase II (`data/arene.js`)

**Ajouté en cinquième position (index 4)**. Les états 0 à 3 gardent leurs places : `banc-arene` A et C et `sim-arene` comptent sur les trois premiers, la phase I sur le quatrième. Seule la phase II pointe vers lui (`phases[1].arene:4`).

```js
{id:'ouvrage',bornes:{fx0:0,fy0:0,fx1:1,fy1:1},sol:'cendre',
 obstacles:[],vides:[],brume:[{fx:0.5,fy:0.04,r:320,a:0.14}]}
```

- Arène pleine. **Le chantier est nu** : c'est lui qui le remplit.
- Sol `cendre` (existant) : il se distingue de la pierre de la phase I sans nouvelle peinture.
- Brume de décor en haut, là où son corps se devine.
- Essai : `?arene=final&etat=4`.

**Recommandation : cet état, en index 4.**

## 10 · `SAVE.brumeux` et « ce qui t'a tué »

- Reste **v:1**. Nouveaux éléments qu'on peut y noter :
  - `rail` (la cloche) ;
  - `effondrement` ;
  - les trois gestes (`ruee`, `equerre`, `truelle`) ;
  - `manoeuvres` (un ennemi de l'appel).
- **Un seul champ facultatif**, `bati:{2:'murailles'}` : la sorte qui s'est effondrée sur toi, écrite **seulement** quand `mort[phase]` vaut `effondrement`, validée par `brxLireSauve` (sorte connue, effondrable), effacée quand une autre mort la remplace (même schéma que `tab` en 5b). Pour `rail`, la sorte se déduit de l'élément : pas de champ.
- Au combat suivant, le **premier bâtir** de la phase II rejoue cette sorte (§ 3). Une mort par un geste signature ou par l'appel ne change rien au socle (règle 5b : préavis normal, il est déjà là).
- Une descente d'essai n'écrit rien.

**Recommandation : ce champ, et lui seul.**

## 11 · Dessin (`dessin.version` 2 → 3)

- **Bâtir** :
  - ses doigts tricotent au-dessus du contour (petit va-et-vient) ;
  - deux fils par main descendent jusqu'aux coins du contour en craie ;
  - la croix s'incline vers le chantier ;
  - à la pose, les fils se détendent et remontent.
- **Annulation** : les fils claquent et pendent, la craie s'émiette, les mains s'ouvrent (anneau ivoire).
- **La Ruée** : une main se détache, poing fermé, file au bout de son fil sur la fin de la charge. Arrêtée : elle se tord contre l'obstacle, étincelles dans la matière de la construction, anneau ivoire.
- **Effondrement** : un fil tendu de la croix à la construction, qui penche puis s'abat.
- **Échafaudage** : son fil reste tendu jusqu'à la croix, qui vacille quand il tombe.
- **Puits** : niveau qui monte. **Passerelles** : planches qui glissent. **Cloche** : roule et tinte (son existant du Glas, plus grave).
- Corps, glyphe et portrait : rien d'autre ne change (portrait à 5g).
- **Mouvements réduits** :
  - pas de va-et-vient des doigts ni de balancement des fils ;
  - la bascule de l'effondrement et la chute d'une construction sont des fondus ;
  - la main de la Ruée glisse sans traînée ;
  - les passerelles basculent en fondu ;
  - la cloche roule (c'est du jeu) sans secousse ;
  - le niveau du puits monte sans ondulation.

**Recommandation : ce dessin.**

## 12 · Simulateur et banc

**`sim-brumeux`, section 11** :

| Vérification | Détail |
|---|---|
| Données | gestes et leurs chiffres ; `partition.ouvrage` (boucle de 30 à 34 s, deux bâtir et un effondrement par boucle) ; six sortes ; plafonds par sorte ; `pvPart` ; matières à ΔE ≥ 25 de tout ; état `ouvrage` en index 4, états 0 à 3 inchangés (empreinte) |
| Lecture des sortes | seuil 0,35, poids, verdicts jumeaux, variété, premier bâtir = `bati` ou rails |
| Placement | 10 000 positions par sorte : dans les bornes, jamais sur toi, distances de chaque sorte, voie de rail libre, aire ≤ 30 %, connexité ≥ 85 % (douve au pire) |
| Persistance | 10 000 phases abstraites : plafond 5 / 6 / 6 tenu, plafond par sorte, filtre des bornes de l'état IV, connexité revérifiée |
| Gestes | Ruée coupée au premier pilier qui arrête un tir, jamais par une fosse ; Ruée, Équerre, Truelle (forme `cone`), 10 000 positions chacune : sortie libre atteinte à pied à temps ; abri derrière une construction et sous ses mains |
| Effondrement | 10 000 par sorte : la plus proche avec une sortie ; aucune quand il n'y a rien |
| Cloche | 10 000 passages : sortie de côté toujours |
| Fissures et annulation | seuils exacts |
| Appel | composition lue sur les constructions, plafond de 4 |
| Tirs et fosses | les deux enveloppes rendent l'ancien résultat au bit près hors de l'arène ; dans l'arène, un tir traverse une fosse et s'arrête sur un mur |
| Sauvegarde `bati` | écrite, relue, effacée, invalide ignorée, essai muet |
| Branchements | ni `Math.random`, ni `setRule`, ni `murmur` dans la section v18.7 |

Contre-épreuves (une erreur introduite exprès, qui doit être attrapée) : douve aux quatre passerelles fermées acceptée ; Ruée qui traverse une construction ; fosse qui arrête un tir ; construction posée sur toi ; douve à 200 px ; cône sans abri sous ses mains ; effondrement sans sortie posé ; `bati` invalide accepté ; état 3 déplacé.

**`banc-brumeux`, section J** :

| Section | Vérification |
|---|---|
| J-A | la lecture des sortes, les places, la partition et la boucle en jeu égalent la logique pure (même graine, même lecture) |
| J-B | constructions en jeu : annonce en craie 1,5 s et mains à nu ; annulation au seuil, pas en dessous ; poussée sans dégât (PV intacts) ; connexité et plafond ; fissures aux paliers ; destruction ; Ruée arrêtée → sonné 2 s ; échafaudage −40 % puis sonné ; puits qui boit puis rend ; passerelles jamais toutes fermées ; le joueur ne tombe jamais ; un ennemi repoussé tombe, une Brute qui charge aussi ; cloche qui écrase ; appel ; persistance en III, filtre en IV, effacement en V |
| J-C | ses tirs et les tiens arrêtés par muraille, fût et échafaudage, traversant une douve et une fosse d'état ; un tir du joueur casse ce qu'il touche |
| J-D | phase II conduite par le bot qui frappe dans les quatre formes, deux graines : **0 coup sans signe** (détail imprimé de tout coup suspect), durée de la phase, constructions bâties, annulées, cassées, effondrées ; temps pour casser chaque sorte |
| J-E | coût **apparié dans une seule page** : phase II avec une construction de chaque sorte debout, cloche et passerelles, contre le boss d'essai devant la même foule : **≤ +1,5 ms** ; peinture à l'entrée (calques de la phase I plus modules) **≤ 250 ms** ; assemblage d'une construction **≤ 3 ms** |
| J-F | mouvements réduits ; captures relues : annonce et mains à nu, annulation, chaque sorte (planche des trois matières et des trois fissures), Ruée arrêtée, Équerre, Truelle, effondrement par sorte, cloche, passerelles, puits plein |

- Le bot (`bot=2`) frappe ses mains pendant une annonce, puis l'échafaudage le plus proche, puis le Brumeux ; contre une douve, il longe l'anneau jusqu'à une passerelle ouverte ; il casse un butoir quand la cloche l'a frappé deux fois.
- **G** (règle d'or) compare contre **le commit de cette fiche** (défaut de `BANC_AVANT` mis à jour).
- `banc-arene` est rejoué entier : les fosses de ses états d'essai laissent désormais passer les tirs (F peut compter autrement, G ne doit pas bouger).

**Recommandation : ce simulateur et ce banc.**

## 13 · Points ouverts de § 36 que la phase II touche

| Point | Proposition |
|---|---|
| (7) Coup sans signe vu une fois en F (Lumenarque) | J-D et F impriment le détail de chaque coup suspect (source, durée de signe, à l'écran ou hors champ). S'il revient, on teste d'abord l'hypothèse (8). Rien n'est livré avec un coup sans signe reproduit. |
| (8) Tirs d'un ennemi resté hors de vue | Dans le combat du Brumeux seulement : un ennemi qui tire ne prend un jeton **qu'à l'intérieur de la vue** (marge 0 au lieu de 200 px), par un crochet de l'arène inerte hors de ce combat. Cela vaut pour les Spectres des tableaux (phase I) comme pour ceux de l'appel. |
| (3) et § 34 (6) : « on ne frappe que ce qu'on voit » | La règle reste pour **tes** coups, constructions comprises (§ 7.5). Les coups venus **de lui ou de ses mécanismes** (dalles, cloche, effondrement, chute dans une douve) sur ses ennemis en sont exemptés (`o.brx`) : ils ne te concernent pas, et la règle empêchait une dalle de blesser un ennemi de tableau hors de vue. |
| (1) PV placeholders | La phase II garde 2 400 PV ; les PV des constructions et le seuil d'annulation sont des **parts des PV de la phase**, donc recalibrés avec elle en 5g. J-D note la durée de la phase et le temps pour casser chaque sorte par forme. Cible indicative : un échafaudage en 2,5 à 4 s. |

**Recommandation : ces quatre décisions.**

---

## Écarts au cadrage (à valider avec la fiche)

1. **Les Manœuvres** (§ 6) : une mesure d'appel par boucle, absente de Q4, pour que les réponses « charge brisée », « tombe dans la douve » et « écrasé par la cloche » existent dès la phase II.
2. **Ses mains se retirent sur l'île d'une douve** et y restent : sans cela, ses mains te suivant, une douve ne « tiendrait » rien à distance.
3. **L'élément `construction` devient `fixe:true`** : il ne bâtit qu'en phase II, ce que les phases III et IV d'essai tiraient encore en 5a. `banc-brumeux` B et D sont adaptés : plus de construction tirée en IV, et `__brumeux.poser` reste pour les essais.
4. **Les rails ont des butoirs cassables** : Q9.4 dit que tout se casse sauf les douves ; le rail se « casse » par ses butoirs.
5. **Rendu en deux temps** : les modules sont cuits à l'entrée du combat, l'image de chaque construction est assemblée une fois à son annonce (≤ 3 ms). La règle 6 disait « une image par sorte et par état, cuite à l'entrée », ce qui ne permet pas une muraille de longueur et d'orientation lues sur toi.
6. **PV des constructions et seuil d'annulation en parts des PV de la phase** (et non en PV fixes), pour survivre à la calibration de 5g.
7. **Fosses et tirs** : en plus de `hitsWall` (Q9.3), `losClear` (la ligne de vue de l'IA) ignore les fosses, pour qu'un Spectre tire par-dessus une douve.
8. **Point (8)** : jeton de tir seulement dans la vue, dans le combat du Brumeux (phase I comprise).
9. **Point (3)** : les coups de ses mécanismes sur ses ennemis sont exemptés de la règle « on ne frappe que ce qu'on voit ».
10. **`SAVE.brumeux` reste v:1**, avec le champ facultatif `bati`.
11. **L'état réel de la phase II est ajouté en index 4.**

## Modèle et effort

Implémentation après validation : **Opus 5.5, élevé** (cadrage Q17 : 5c porte le système de constructions, dont la retouche des fosses dans le bloc de l'arène). Elle sera la v18.7 (section « v18.7 · Phase II » du bloc v18.5, mémoire § 37).
