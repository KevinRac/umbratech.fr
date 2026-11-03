# La Brume · v18.5 « Le Brumeux » · action 5d · fiche courte de la phase III, « La Couture »

Statut : **validée le 2 novembre 2026 (toute la fiche : recommandations, écarts compris, choix recommandés sur les six questions partagées, et les 17 écarts d'implémentation de 5c) ; **faite le 3 novembre 2026 (v18.8, Opus 5.5, élevé, en une fois ; `_dev/memoire.md` § 38, avec ses écarts d'implémentation à valider).** Soumise à l'auteur le 2 novembre 2026 (cadrage Q17 : aucune ligne de code avant la validation). Rédigée à partir du cadrage validé (Q1, Q2, Q5, Q8 à Q14, Q16, Q17), des fiches 5b et 5c (modèle de forme), de `_dev/memoire.md` § 37 (phase II : écarts, mesures, points ouverts), § 36, § 35, § 34 (arène, signes de bord, « on ne frappe que ce qu'on voit »), § 28 (némésis), § 19 à § 25 (armes de la Brume, Masqué porteur, justice, sortie, venue au contact), et du code actuel (`data/brumeux.js`, `data/arene.js`, `data/bestiaire.js` (`assemble`, `nemesis`, `montage`), `data/souvenirs-brume.js`, `data/gardiens.js` (`souvenirs.recence` du Glas) ; dans `index.html` : bloc du Masqué (`asmCombos`, `asmTirage`, `asmSouvenir`, `asmPas`, `sbPas`, `sbForce`, `sbPlafond`, `sbRenfort`, montage `montStep` / `montPost`, `createEnemy` enveloppé), section « v17.25 · La némésis » (`nemIci`, `nemStats`, `nemPromo`, `ncM`), bloc « v17 · La Mémoire » (`RUN.reserveBrume`), bloc v18.4 (sources de signe, juge, crochets), bloc v18.5 et ses sections v18.6 et v18.7 (`versCons`, `effacerCons`, `X.mainsC`, douve)).

Ce qu'il faut savoir du code avant de lire :
- **Un Masqué ordinaire** naît par `planRoom` (tirage `asmTirage` sous le budget de menace de l'acte, `asmCombos`) puis `createEnemy` enveloppé, qui lit `room.asm` (un seul Masqué par salle) : PV, souvenir porté (`asmSouvenir` : arme de la Brume `sb:<famille>` ou renfort), carte d'arrivée (`showCard`, DOM, avec le nom du souvenir), son d'arrivée (`asm_in`, le rire théâtral du Brumeux), montage. À la registre III (actes III à X), le budget est 13, plus 2 pour un porteur.
- **Le montage** (`assemble.montage`, v16.28) dure 3,85 s (descente 1,1 · masque 0,5 · couture 1,7 · coupe 0,55) ; le Masqué y est **intouchable** (`immunise`) et ne frappe pas ; `montPost` dessine une petite croix de manipulation **250 px au-dessus** du corps, d'où partent les fils (couleur `205,180,255`).
- **Ses zones** sont rouges (`assemble.couleurs`, la couleur `FOE`), armes de la Brume comprises. Un Masqué et les autres ennemis ne chargent jamais deux zones à la fois (`asmZone`, `zoneAutre`) ; la feinte attend de même. Ses chargements ne descendent jamais sous `chargeMinS` (0,5 s), sous le préavis de l'arène (`preavis.coup`, 0,6 s). Dans l'arène, ses coups sont rattachés **au Masqué** par le juge (§ 34 : « ses zones ne sont pas énumérées une à une »).
- **La promotion** de la némésis (`nemPromo`) lit `room.asm` : le Masqué de la salle où tu meurs est promu, même si c'est son escorte qui t'a tué ; `ncM()` dit seulement si le dernier coup (moins de 1,5 s) venait de lui. Sa fiche attend `{acte: RUN.act (le registre), salle: RUN.roomIdx}`.
- **La réserve** (`RUN.reserveBrume`) : `{id, source, rang, g, oublie:{acte, salle}, porte}`. Le Glas tire déjà dans la réserve à la récence (`glasRecence`, poids 1 → 3 du plus ancien au plus récent, usure ignorée).
- **En phase III d'essai** (5a), la partition d'essai joue ; le point faible est dessiné sur la croix (`faible()` : 70 px au-dessus des mains) mais **on frappe ses mains** (l'entité est à leur hauteur). Les constructions de II restent, mécanismes compris (5c § 8) ; ses mains ne restent pas sur l'île d'une douve (5c, écart d'implémentation 12 : à trancher ici).

---

## 1 · Gestes signature (socle, toujours les mêmes)

Les phases I et II ont pris rayons, anneau à brèche, damier, couloir, croix et cône. Restent pour la III : **losanges, disque, projectile à liseré**, qui sont aussi les gestes de l'aiguille.

| Geste (nom jamais affiché) | Forme (parmi les neuf) | Où | Préavis | Dégâts avant montée |
|---|---|---|---|---|
| **Le Surjet** | losanges : 7 points de couture de 52 px (demi-diagonale), tous les 120 px le long d'une ligne de sa croix vers toi et au-delà, alternés à ± 24 px de la ligne ; le point le plus proche de toi est centré sur ta projection | depuis sa croix | 1,1 s | 12 |
| **Le Dé** | disque, en deux coups : r 110 sur toi, puis, au premier coup, r 110 là où tu es | sur toi | 1,0 s, puis 0,9 s | 11 par coup |
| **Les Aiguilles** | projectile à liseré : 3 aiguilles (r 10) en éventail de 36° depuis sa croix vers toi, 420 px/s, portée jusqu'au bord ; trajectoires tracées en pointillé violet pendant la charge | depuis sa croix | 0,9 s (charge de tir) | 10 chacune |
| **La feinte** (fil rouge v14) | disque vrai ou faux, r 86 | sur toi | 1,15 s (jugée à 0,6 s, règle v14) | celle de la feinte |

- **Deux sorties lisibles par geste :**
  - le Surjet : **se glisser dans un jour** (avancer ou reculer d'environ 40 px le long de la couture : entre deux points, la ligne est libre sur 64 px), ou **s'écarter de côté** (90 px) ;
  - le Dé : sortir du premier disque de n'importe quel côté, puis **revenir au centre du premier** (il a déjà frappé) ou repartir plus loin ;
  - les Aiguilles : **entre deux aiguilles** (au-delà de 250 px de sa croix, le jour dépasse 30 px), **de côté**, ou **derrière une construction** (elles s'arrêtent sur tout ce qui arrête un tir ; jamais sur une fosse) ;
  - la feinte : comme partout.
- Le Surjet et le Dé sont orange `TELE.zone` ; les Aiguilles suivent la grammaire des tirs (charge violette `TELE.proj`, comme le `tir` de 5a), avec le liseré des projectiles du boss. Première rencontre : +0,3 s (`brxPreavis`).
- Ils deviennent des éléments de `data/brumeux.js` marqués **`fixe:true`** : jamais tirés dans une mesure libre, jamais `premier` (règle 5b). Mort par un geste signature : préavis normal, il est déjà au socle.
- Moteur : rien de neuf dans `brxDans` pour le disque ; la forme **`losanges`** y entre (même test que `inZone` du Masqué, marge 0,5 × rayon) ; le Dé suit le modèle de la Toile (deux coups, `brxSortieToile` généralisé : une sortie du premier avant sa charge, puis, d'où l'on en sort, une sortie du second avant 0,9 s) ; les Aiguilles sont des tirs du Brumeux (`X.tirs`), coupés par `brxCoupe` (premier pilier qui arrête un tir).

**Recommandation : ces trois gestes et la feinte.** Dégâts dans la fourchette de 5a à 5c (10 à 14), recalés en 5g et à l'action 7.

## 2 · Partition chiffrée (`partition.couture`)

| # | Mesure | Nature | Durée indicative |
|---|---|---|---|
| 1 | **Couture** | fixe (§ 3) ; ce qu'il coud est lu (§ 6) | ≈ 5,4 s (trois fils décalés de 0,5 s, montage 4,4 s) |
| 2 | Le Surjet | fixe | 1,5 s |
| 3 | mesure libre | libre (budget 6 / 7,5 / 9, réduit par les Masqués vivants, § 7) | ~1,5 s |
| 4 | La feinte | fixe | 1,2 s |
| 5 | Les Aiguilles | fixe | 1,4 s |
| 6 | **Couture** | fixe | ≈ 5,4 s |
| 7 | Le Dé | fixe | 2,2 s |
| 8 | mesure libre | libre | ~1,5 s |

- **Entracte** : 1,4 s entre deux mesures. **À nu après la boucle** : 2,0 s (`nuS`). Boucle ≈ 33 s, fenêtre comprise ; la phase dure environ **deux boucles** (cible 50 à 70 s, Q11), plus les fenêtres à nu qu'on provoque.
- **Pendant une Couture**, ses mains tiennent les fils : il ne lance rien d'autre (comme pendant un tableau de la phase I, sans même la feinte). Les Masqués déjà cousus, eux, continuent.
- **Fenêtres à nu** : après la boucle (2,0 s, au socle) ; **quand plus aucun fil ne tient** (3 s, § 3) ; **un Masqué cousu brisé** (2 s, sa croix vacille). Les deux dernières, tu les provoques.
- **Mesures qui sautent** (comptées, entracte réduit à `sauteS` 0,6 s, comme en phase II) : une Couture quand trois fils tiennent déjà (§ 3) ou qu'aucun point de montage n'est possible ; un geste sans sortie.
- Mesures libres : les éléments de 5a (disque, couloir, pluie, anneau, tir, rafale), pondérés par la lecture. Ni bâtir ni effondrement : la phase III ne bâtit plus (5c § 8 ; `construction` est déjà `fixe:true`).

**Recommandation : cette partition.**

## 3 · La Couture : le montage sous tes yeux

**Ce qui se voit.** Trois fils descendent de **sa croix** vers trois points du sol, un toutes les 0,5 s. À chacun, le montage existant (v16.28) commence, **ralenti** : le corps descend au bout du fil, le masque tombe, il est cousu point par point, puis les fils sont coupés. Le fil qui part de sa croix est tracé dans sa matière (`fils`, 170,165,185) ; les fils courts du montage gardent leur couleur (`montage.fil`). Rien de neuf dans la grammaire.

| Temps du montage | Montage de salle (v16.28) | Montage de la Couture |
|---|---|---|
| descente | 1,1 s | 1,3 s |
| masque | 0,5 s | 0,6 s |
| couture (6 points) | 1,7 s | 2,0 s |
| coupe | 0,55 s | 0,5 s |
| **total** | 3,85 s | **4,4 s** |

**Couper un fil** (Q5 : « frapper son nœud, une cible visible ») :
- **Le nœud** est la petite croix de manipulation du montage, rapprochée à **110 px au-dessus du corps** (au lieu de 250), sur le fil qui monte vers sa croix : une bobine de r 20 dans sa matière (`croix`, `fils`), qui grossit d'un cran à chaque point cousu (le compte à rebours se lit sur la couture elle-même : six points).
- Il a des PV : **2,5 % des PV de la phase III** (60 en placeholder ; part, pour suivre la calibration de 5g). Fissures et nombre affiché comme une construction.
- C'est une **entité fixe**, comme une construction (5c § 7.5) : un coup par image (le plus gros), ni brûlures ni poisons, ni PV volés, **hors du ciblage automatique** (rebonds, tête chercheuse, `nearestFoe`) ; « on ne frappe que ce qu'on voit » s'applique ; les zones du Dernier Souvenir le touchent, ses effets ciblés non ; ni le profil, ni l'Accoutumance, ni le butin ne le voient. Pas une source de signe (il ne frappe pas).
- Le corps qui descend reste **intouchable** (règle du montage) : on coupe le fil, pas le pantin.

**Coupé** avant la fin : le fil claque et remonte vers sa croix, le corps retombe et se défait en brume, le masque tombe et se brise (sans butin, sans ligne de chronique, sans compte de Masqués vaincus) ; un **bout de fil pend** de sa croix jusqu'à la Couture suivante (mémoire de ce que tu as coupé, dessin seulement). Son court (`asm_coupe`), un rire étranglé quand c'est le dernier.

**Abouti** : il coupe lui-même les fils (la fin du montage existant) et le Masqué entre au combat (§ 4).

**Plafond.** Au plus **2 / 2 / 3 Masqués cousus vivants** (Normal / Difficile / Extrême, `paliers.*.masques`) et au plus **trois fils tendus** à la fois :
- un montage qui aboutit quand le plafond est atteint **reste suspendu** : cousu, au bout de son fil, immobile et intouchable, nœud toujours frappable ; il tombe dans le combat dès qu'une place se libère ;
- une Couture ne lance que les fils qui manquent pour arriver à trois (trois suspendus : la mesure saute).
- **Quand plus aucun fil ne tient** (tous coupés, suspendus compris, et au moins un coupé dans cette Couture), sa croix vacille : **à nu 3 s** (anneau ivoire sur la croix).

**Les points de montage** (logique pure, à graine, comme `brxPlaces`) :
- à 300–650 px de toi, à 420 px au moins l'un de l'autre, dans les bornes à 80 px du bord, dans la vue plus 200 px (règle des apparitions de l'arène) ;
- jamais sur une construction (40 px de marge), ni sur la voie d'un rail, ni dans l'anneau de fosses d'une douve ; reliés à toi sur la grille de `FF` (une douve comptée au pire de ses états) ;
- **si une douve tient, un des trois points est sur son île** (§ 5) ;
- si trois points ne tiennent pas, il en prend moins ; aucun : la Couture saute.

**Hors de vue** : le corps qui descend est déjà le Masqué (intouchable) : il a son signe de bord d'élite ; le fil qui part de sa croix (presque toujours à l'écran) montre où il va.

**Recommandation : ce montage, ce nœud et ce plafond.** Q5 disait « environ 4 s » : 4,4 s, parce qu'il faut traverser 420 px entre deux points (écart 1) ; le montage suspendu répond au cas « plafond atteint » que Q5 ne tranchait pas (écart 2).

## 4 · Les Masqués cousus

**Ce qu'il coud** (Q5), à la descente de chaque fil (on voit donc le corps descendre, puis l'icône du souvenir porté dès que le masque tombe : de quoi choisir quel fil couper d'abord) :
- **Corps et capacités** : `asmTirage` sous le budget de menace de la registre III (13, plus 2 pour un porteur), jamais la même base que le Masqué cousu juste avant ; **`poidsProfil` allumé ici seulement** (une copie des réglages avec `actif:true`, passée au tirage : `bestiaire.js` ne change pas) ;
- **Le souvenir** : s'il en reste, un talent de ta réserve dont la famille a une arme de la Brume (`asmSouvenir` avec `peut` : il faut qu'un assemblage puisse la porter), tiré **sans remise dans le combat**, pondéré **à la récence** comme le Glas (`souvenirs.recence` : 1 pour le plus ancien, 3 pour le plus récent ; usure ignorée) ; il donne l'arme de la Brume de sa famille (`sb:<famille>`, avec ses variantes), ou, s'il est classé renfort, un Masqué ordinaire renforcé (`sbRenfort`) ; force par rang et gravure sous `sbForce` et `sbPlafond`, justice existante (`sbMaj`, `sbPlacer`, sortie à ta vitesse) ;
- **réserve vide, ou plus rien de portable** : des Masqués ordinaires ; rien ne manque au combat.

**Ce qui ne change pas** (Q5) : le budget, une zone à la fois, la venue au contact (`atteinte`, `attenteS`), le renoncement, l'éveil, la rage, le Trait passif, ses couleurs.

**Ce qui change pour un Masqué cousu** (écart 3) :
- **PV** : une part des PV de la phase III, **15 %** par Masqué (360 en placeholder), × le corps (`corps.*.pv`), × le bonus de porteur (+10 % par rang au-delà du premier et par gravure) : un Masqué de salle à l'acte X pèse plus que la phase entière ;
- **ni escorte, ni carte d'arrivée** (la carte DOM dit le nom du souvenir : il se lit sur ses icônes, au-dessus de lui ; image d'abord), **un seul** rire d'arrivée par Couture ;
- **ni relique, ni offre de reprise, ni Éclats** : la récompense du combat, c'est la victoire ; brisé, il compte comme un Masqué vaincu (`SAVE.asm18`, chronique), comme partout ;
- **brisé, il met le Brumeux à nu 2 s** (sa croix vacille : son ouvrage déchiré) (écart 5) ;
- **ses chargements ne descendent jamais sous 0,6 s** (le préavis de l'arène), étapes d'arme de la Brume comprises (`chargeMinS` et plancher de `sbPlancher` portés à `arene.preavis.coup` pour lui seul) (écart 4) ;
- **chacune de ses zones est une source de signe à part entière** (Q15 (2)) : zone d'une capacité ou d'une signature, étape d'une arme de la Brume, onde, ruée ; le juge les reconnaît (`masque:<capacité>`, `masque:sb:<famille>`) au lieu de rattacher le coup au Masqué ; inerte hors de l'arène.

**Les mécanismes de la phase II sur eux** : une Brute ou une charge de Masqué qui heurte une construction est sonnée et lui ôte un palier (5c, inchangé) ; la cloche les écrase (30, comme les élites) ; ils ne tombent jamais dans une douve (règle 5c : on brise un masque, on ne le pousse pas) ; leurs zones n'abîment pas les constructions.

**Recommandation : cette composition et ces règles.**

## 5 · Ce qui reste de la phase II

5c § 8 l'a déjà décidé : **tout reste, mécanismes compris**, et il ne bâtit ni n'effondre plus. Ce que cela donne en III :

| Construction | En phase III |
|---|---|
| Murailles, colonnades | arrêtent les tirs (les siens, les Aiguilles comprises, ceux des Masqués et les tiens) : abris contre les Aiguilles et les salves ; une charge de Masqué s'y brise |
| Douves | les passerelles battent ; **un des trois points de montage est sur l'île** : le contact passe par une passerelle ouverte, les tirs passent par-dessus la fosse |
| Rails | la cloche roule toutes les 6 s (couloir orange, sortie vérifiée) ; elle écrase les Masqués cousus et les corps suspendus non (intouchables) |
| Puits | boit tes soins ; cassé, rend ce qu'il a bu |
| Échafaudages | −40 % sur lui tant qu'un tient ; le casser le sonne 2 s |

- **Des fils pendent** (Q1) : les bouts coupés de la Couture, de sa croix ; et, au-dessus de chaque construction, le fil mou qui l'a posée (dessin seulement, cuit avec elle : aucun coût par image).
- **Ses mains au-dessus d'une douve** (point ouvert § 37 (4), écart d'implémentation 12 de 5c). Trois possibilités :
  - (a) **un des trois points de montage sur l'île ; ses mains et sa croix ne s'y retirent plus** : la douve garde son sens (« tenir le contact à distance ») sur ce qu'il faut atteindre en III, les fils ;
  - (b) sa croix se retire sur l'île tant que la douve tient, comme en II ; la fenêtre à nu « plus aucun fil » (3 s) serait alors inatteignable au contact depuis un point de montage lointain (4 à 5 s de chemin) ;
  - (c) rien : la douve n'est plus qu'un obstacle.
- **Recommandation : (a)** (écart 8).

## 6 · La némésis

- **Première cousue** (Q5, Q13) : si une némésis active (ni brisée, ni en répit, `nemValide`) **n'a pas paru dans cette descente** (`RUN.nemVenus`), elle est le **premier fil de la première Couture**, 0,5 s avant les deux autres. S'il y en a plusieurs (une par registre, deux par acte en Extrême), **une seule** : la plus forte (points, puis la plus récente) (écart 7).
- **Elle-même** : son assemblage figé, son nom, son souvenir (ses variantes, sa force, `sbForce`), ses PV de points (`nemStats.pv`, appliqués aux PV d'un Masqué cousu), ses renforts en un seul `sbRenfort`. Elle compte comme venue (`RUN.nemVenus`, `vu`, hors essai).
- **Elle se reconnaît** à son **trousseau** : les crânes s'accrochent un par un à sa hanche après la couture, comme en salle (`trouMaj`, `asm_crane`), et elle descend seule en tête. Aucun texte.
- **Son fil se coupe** comme les autres : coupée avant la fin, elle n'est ni brisée ni vaincue, sa fiche reste (elle reviendra) ; elle ne revient pas dans la même phase.
- **Brisée** dans le combat : `nemBrise` (sa fiche est effacée), **sans `offreNemesis`** (aucune fenêtre ne s'ouvre pendant le combat ; la récompense, c'est la victoire).
- **La promotion** (Q13 : « un Masqué cousu qui te tue est promu normalement ; mort par le Brumeux lui-même : pas de promotion ») :
  - est promu **le Masqué cousu dont le coup t'a tué** (le dernier coup reçu venait de lui, il y a moins de 1,5 s : `ncM` étendu à chaque cousu) ; un coup du Brumeux, d'un de ses gestes, d'une construction ou d'une Aiguille : personne. C'est plus étroit que la règle de salle (« le Masqué de la salle, même tué par son escorte ») : il y a plusieurs Masqués et le Brumeux lui-même (écart 6) ;
  - la décision est celle de toujours (`nemDecision` : nouvelle, point, ou acte occupé) ; la némésis cousue qui te tue gagne un point ;
  - **elle attend à l'acte III, salle 3** (`assemble.premiereSalle`) : la salle du boss final n'a pas d'équivalent à la registre III, et une fiche qui attendrait la salle 12 ne reviendrait qu'au fond (écart 6) ; le cadrage voulait qu'elle revienne « dès l'acte III » ;
  - **une descente d'essai ne promeut personne** (`RUN.essai`, posé par `?brumeux=` ; `brumeux` est déjà dans `ESSAI18` et `ESSAI_URL`).

**Recommandation : ces règles.**

## 7 · Paliers, lecture, budget, non-cumul

**Paliers** (Q12 : jamais de PV ni de dégâts en plus) :

| | Normal | Difficile | Extrême |
|---|---|---|---|
| Socle (Couture, trois fils, gestes, montage de 4,4 s) | identique | identique | identique |
| Budget d'une mesure libre | 6 | 7,5 | 9 |
| Masqués cousus vivants au plus | 2 | 2 | 3 |
| Fils tendus au plus | 3 | 3 | 3 |
| Préavis | grammaire | identique | identique (jamais plus court) |

Les règles du Masqué par palier (`desMasque` : chance, souvenir, porteurs par acte) ne jouent pas ici : la Couture coud toujours, et porte un souvenir dès qu'il en reste.

**La lecture** (Q2 : une à l'entrée de la phase, sans texte ; son regard passe sur ton héros, puis son petit rire) :

| Ce qu'il lit | Ce qu'il en fait en phase III |
|---|---|
| ton profil (six axes) | les assemblages des Masqués cousus (`poidsProfil`, ici seulement) ; les poids des mesures libres (5a) |
| ta réserve et ses dates d'oubli | les souvenirs cousus, les plus récents d'abord |
| ta némésis | le premier fil |
| ce qui t'a tué à la phase III la dernière fois | voir ci-dessous |
| les verdicts des contre-mesures, `RUN.par18` | les poids des mesures libres (5a, inchangé) |

**Ce qui t'a tué d'abord** (Q13). `SAVE.brumeux` **reste v:1**. Nouveaux éléments qu'on peut y noter : `couture` (un Masqué cousu), `surjet`, `de`, `aiguilles`. **Un seul champ facultatif**, `cousu:{3:{corps, cle, id}}` (son corps, la clé de son assemblage, l'id du talent porté ou `null`), écrit seulement quand `mort[3]` vaut `couture`, validé par `brxLireSauve` (corps connu, clé et id en chaînes courtes), effacé quand une autre mort le remplace (même schéma que `tab` et `bati`). Au combat suivant, le **premier fil après la némésis** recoud ce Masqué, si son assemblage tient encore (`asmCombos`) et, pour son souvenir, s'il est encore dans la réserve (sinon le même corps et la même clé, sans souvenir). Utile quand il n'a pas été promu (acte occupé, némésis éteinte). Mort par un geste : rien en premier (il est au socle).

**Budget et non-cumul** :
- **chaque Masqué cousu vivant retire 2 au budget d'une mesure libre**, plancher 2 (écart 14) : avec deux Masqués en Normal, une mesure libre ne tire plus qu'un disque ou un tir ;
- chaque Masqué cousu vivant compte comme **une source de tir** (son Trait) dans le non-cumul des mesures libres (au plus deux sources) ;
- **jamais deux zones à la fois au contact du joueur** : ses gestes et ses mesures libres attendent qu'une zone de Masqué en cours finisse (`asmZone`), au plus 1,5 s ; passé ce délai, c'est le Masqué qui attend (`zoneAutre` voit les zones du Brumeux, comme il voit déjà la feinte) (écart 15) ;
- les mécanismes des constructions (cloche, passerelles, puits) gardent leurs règles de 5c et ne comptent pas dans le budget ; la sortie garantie tient déjà compte des zones en cours (`X.zones`) ;
- un montage ne frappe pas et ne compte pas dans le budget ; un Masqué cousu ne compte pas comme « invoqué » de la mesure libre.

**Recommandation : ces paliers, cette lecture, ce champ et ce budget.**

## 8 · État d'arène, corps, point faible, transitions

**État d'arène** (`data/arene.js`), **ajouté en sixième position (index 5)** ; les états 0 à 4 gardent leurs places (`banc-arene`, phases I et II). Seule la phase III pointe vers lui (`phases[2].arene:5`).

```js
{id:'couture',tard:true,bornes:{fx0:0,fy0:0,fx1:1,fy1:1},sol:'cendre',
 obstacles:[],vides:[],brume:[{fx:0.5,fy:0.04,r:380,a:0.18}]}
```

- Arène pleine, **ni obstacle ni fosse** : rien de neuf ne tombe sur ses constructions (aucune ne cède à la transformation) ; ce qu'il a bâti reste le terrain.
- Sol `cendre` (le chantier reste le chantier) ; brume de décor plus dense en haut, d'où pendent ses fils.
- **`tard:true`** comme l'état `ouvrage` : son calque n'est pas peint à l'entrée d'une arène ; le Brumeux le peint une tuile par image pendant la phase II (`peindreTard`), `vers()` finit ce qui manquerait. Les constructions sont recuites dans ses tuiles à la transition (`cuisson`, déjà prévu à chaque changement d'état).
- Alternative : un sol nouveau (`toile`, dans la matière du Brumeux) pour que la transition se voie au sol ; une ligne de plus dans `SOLS`, inerte hors de cet état. **Recommandation : `cendre`** : la phase se lit à ses fils, et un sol neuf repeint sous les constructions n'apporte rien au jeu.

**Corps et point faible** :
- Au-dessus de l'arène (Q1), comme en I et II : sa croix suit ton abscisse et descend vers toi de 60 % de ce qui vous sépare (`suit`, 5a) ; plus de retrait sur l'île d'une douve (§ 5).
- **En phase III, l'entité frappable est sa croix** : `e.x, e.y` sont ceux de la croix, ses mains sont dessinées 70 px plus bas et ne se frappent pas (5a frappait ses mains et dessinait l'anneau sur la croix : la cible et le signe ne coïncidaient pas) (écart 9).
- Point faible : **l'anneau ivoire `G27.anneau` sur la croix**, seulement à nu (`e.vuln`) : après la boucle, quand plus aucun fil ne tient, quand un Masqué cousu est brisé.

**Transition II → III** (≈ 3 s, jamais une pause : verrou 1,2 s, cri, transformation vers l'état 5, relecture) :
- une annonce de construction en cours s'efface (`versCons`, 5c) ; ses mains quittent l'île d'une douve ;
- **les ennemis des Manœuvres encore vivants rentrent dans la brume** (sans butin, tirs et ondes compris, règle de 5b pour les tableaux) : la Couture commence sur un terrain propre (écart 10) ;
- les constructions restent, mécanismes compris.

**Transition III → IV** :
- les montages en cours s'arrêtent (corps en brume) ; **les Masqués cousus et les corps suspendus se décousent** : le masque tombe et se brise, le corps se défait en brume, avec leurs tirs en vol et leurs ondes ; ni récompense, ni promotion ; la némésis décousue garde sa fiche (écart 11) ;
- les bouts de fils tombent ; les constructions sont filtrées par les bornes de l'état IV (`brxFiltreBornes`, 5c) ;
- il descend au sol (présence `sol`, 5a).

**Recommandation : cet état en index 5, ce corps et ces transitions.**

## 9 · Règles transverses

- **Aucun coup sans signe** : le Surjet, le Dé et la feinte sont des sources de signe du Brumeux (jugées au préavis du boss, 0,8 s) ; les Aiguilles sont des tirs du boss ; chaque zone d'un Masqué cousu est une source à part entière, jugée à 0,6 s (§ 4) ; un Masqué cousu ne frappe qu'après son montage (intouchable et inoffensif jusque-là) et naît d'un corps visible ou signalé depuis 4,4 s.
- **Toujours une sortie** : chaque geste passe par `brxPlacer` (sinon il saute, compté) ; les Masqués cousus gardent la justice des armes de la Brume (`sbPlacer`, sortie à ta vitesse et à ton rayon, dans la vue sûre `CAM.sbAr`) ; le Dé et le Surjet sont vérifiés avec les constructions debout.
- **Image d'abord** : ni bulle, ni carte d'arrivée, ni fenêtre (pas d'`offreNemesis` pendant le combat) ; la composition d'un Masqué se lit sur son corps, son masque et ses icônes.
- **Mouvements réduits** : le corps apparaît en fondu au lieu de descendre (règle du montage), pas de balancement, pas de zoom de la couture, le fil coupé disparaît en fondu au lieu de claquer, la croix ne vacille pas (l'anneau suffit), le trousseau est figé (règle de la némésis).
- **Dessins vectoriels sur canevas**, `dessin.version` 3 → 4 : fils de sa croix aux montages, nœuds, bouts de fils qui pendent, croix qui vacille, mains sous la croix, fils mous au-dessus des constructions. Corps, glyphe et portrait : rien d'autre (portrait à 5g).
- **Coût de rendu** : ≤ +1,5 ms en mesure appariée (trois montages, deux Masqués cousus, six constructions debout, contre le fantôme d'essai devant la même foule) ; le fil mou d'une construction est cuit avec elle ; la peinture de l'état 5 se fait une tuile par image en phase II.
- **Secret** : le wiki et le journal ne disent rien des phases ni de sa façon de coudre ; la ligne de journal de la version (v18.8) ne nomme ni couture, ni fil, ni Masqué, ni phase (proposition : « Préparation du combat final : le Brumeux reprend un vieil ouvrage. Il ne t'attend pas encore au fond : rien ne change en jeu. », à choisir par l'auteur) ; le simulateur le vérifie.
- **Règle d'or** : l'arène reste éteinte (`actif:false`), le boss final provisoire garde sa place ; les retouches du bloc du Masqué, de la némésis et du bloc v18.4 sont inertes hors du combat du Brumeux (le Masqué de salle, sa promotion, ses chargements et son juge ne changent pas, au bit et à l'image près).

## 10 · Ce que l'implémentation devra prouver

**`sim-brumeux`, section 12** :

| Vérification | Détail |
|---|---|
| Données | gestes et leurs chiffres ; `partition.couture` (boucle de 31 à 35 s, fenêtre comprise, deux Coutures) ; montage de la Couture (4,4 s) ; nœud (part de PV) ; plafonds (Masqués, fils) ; PV des cousus ; état `couture` en index 5 et `tard` ; états 0 à 4 inchangés (empreinte) |
| Gestes | Surjet (forme `losanges`), Dé (deux coups), Aiguilles (coupées au premier pilier qui arrête un tir, jamais par une fosse) : 10 000 positions chacun, avec et sans constructions ; sortie libre atteinte à pied à temps ; jour du Surjet, centre du premier Dé, abri derrière une construction |
| Points de montage | 10 000 tirages : bornes, distances (à toi, entre eux), hors constructions, voie et fosses, reliés à toi (douve au pire), un point sur l'île quand une douve tient, moins de trois quand ils ne tiennent pas |
| Composition | 10 000 Coutures : assemblages permis sous le budget de la registre III (+2 porteur), base différente du précédent, `poidsProfil` appliqué ici et `bestiaire.js` inchangé (`actif:false`) ; souvenirs sans remise, pondérés à la récence (fréquences contre les poids), renforts ; réserve vide : ordinaires |
| Plafond | 10 000 phases abstraites : jamais plus de 2 / 2 / 3 cousus vivants, jamais plus de trois fils tendus, suspendus lâchés à la place libérée, Couture sautée à trois suspendus |
| À nu | plus aucun fil → 3 s ; cousu brisé → 2 s ; pas de fenêtre quand aucun fil n'a été coupé |
| Budget | réduit de 2 par cousu vivant (plancher 2), source de tir par cousu, non-cumul |
| Némésis | première, la plus forte, une seule, jamais deux fois ; promotion : le cousu dont le coup t'a tué, jamais le Brumeux, jamais en essai ; attente à l'acte III salle 3 |
| Sauvegarde `cousu` | écrite, relue, effacée, invalide ignorée, essai muet ; recousu en premier après la némésis, seulement s'il tient |
| Plancher des cousus | chargements ≥ 0,6 s, étapes comprises ; Masqué de salle inchangé |
| Branchements | ni `Math.random`, ni `setRule`, ni `murmur`, ni `showCard`, ni `offreNemesis` dans la section v18.8 ; juge des zones du Masqué inerte hors de l'arène ; journal sans un mot des phases |

Contre-épreuves (une erreur introduite exprès, qui doit être attrapée) : quatre fils tendus acceptés ; point de montage dans une fosse ; troisième cousu vivant en Normal ; souvenir cousu deux fois ; némésis cousue après un autre ; chargement de cousu à 0,5 s accepté ; promotion par un coup du Brumeux ; `cousu` invalide accepté ; Surjet sans jour ; état 4 déplacé.

**`banc-brumeux`, section K** :

| Section | Vérification |
|---|---|
| K-A | lecture, points, composition, souvenirs, premier fil (némésis, puis `cousu`) en jeu égaux à la logique pure (même graine, même lecture) |
| K-B | montage de 4,4 s et ses temps ; nœud : PV, un coup par image, hors du ciblage automatique, retenu hors de vue ; coupé → corps en brume, rien de compté ; abouti → Masqué au combat ; plafond → suspendu puis lâché ; plus aucun fil → à nu 3 s ; cousu brisé → à nu 2 s ; réserve vide → ordinaires ; point sur l'île d'une douve ; cloche, passerelles, puits et échafaudage vivants en III ; transitions II → III (appel rentré, mains libérées) et III → IV (décousus, constructions filtrées) ; l'entité frappable est la croix |
| K-C | la némésis : première, trousseau accroché après la couture, PV de ses points ; coupée → fiche gardée ; brisée → fiche effacée, aucune fenêtre ; promotion (par la console, sur une copie jetable de la sauvegarde, comme `banc-nemesis`) : le cousu qui t'a tué, point pour la némésis, personne par un coup du Brumeux, personne en essai, attente à l'acte III salle 3 |
| K-D | phase III conduite par le bot qui frappe dans les quatre formes, deux graines : **0 coup sans signe** (détail imprimé de tout coup suspect : source, durée de signe, à l'écran ou hors champ), durée de la phase, fils lancés, coupés, aboutis, suspendus, cousus brisés, fenêtres à nu ; chargements de cousus ≥ 0,6 s |
| K-E | coût **apparié dans une seule page** ≤ +1,5 ms (trois montages, deux cousus, six constructions) ; peinture de l'état 5 une tuile par image en II, ≤ 250 ms à l'entrée d'un essai `?brumeux=3` |
| K-F | mouvements réduits ; captures relues : trois fils qui descendent, nœud qui grossit, coupe, montage suspendu, à nu sur la croix, Surjet, Dé (deux coups), Aiguilles derrière une muraille, némésis et son trousseau, point sur l'île |

- Le bot (`bot=2`) coupe d'abord le nœud le plus proche (puis le suivant), frappe un Masqué cousu à moins de 220 px de lui, puis la croix, en priorité à nu ; vers un point sur une île, il passe par une passerelle ouverte (logique de 5c).
- **G** (règle d'or) compare contre **le commit de cette fiche** ; `banc-arene` est rejoué entier ; `sim-masque`, `sim-nemesis`, `banc-nemesis`, `banc-nemesis-complet`, `banc-complet` vérifient que le Masqué de salle et sa promotion ne bougent pas.

**Mode d'essai** : `index.html?brumeux=3[&palier=…][&graine=n][&reserve=id,id][&nem=<id de talent>[&points=1..5]][&bot=2][&classe=…][&dieu=0]` : `nem` construit une némésis **en mémoire** (comme `?nemesis=`, rien d'écrit) pour l'éprouver en première cousue ; console `__brumeux` (`coudre()`, `etat().cou` : fils, nœuds, cousus, suspendus ; `couper(i)` pour le banc). `RUN.essai` posé : personne n'est promu.

**Régression** : tous les simulateurs, tous les bancs, puis `banc-gardiens-final` seul (méthode habituelle).

## 11 · Écarts au cadrage (à valider avec la fiche)

1. **Montage de 4,4 s** et fils décalés de 0,5 s (Q5 : « environ 4 s ») : il faut traverser 420 px entre deux points, et trois fils lancés au même instant se liraient mal.
2. **Montage suspendu** quand le plafond de Masqués vivants est atteint, et **au plus trois fils tendus** : Q5 fixe le plafond sans dire ce que devient un montage qui aboutit au-delà ; suspendu, son fil garde un sens (le couper prépare la fenêtre à nu).
3. **Masqués cousus à 15 % des PV de la phase**, sans escorte, sans carte d'arrivée, un seul rire par Couture : un Masqué de salle à l'acte X pèserait plus que la phase ; la carte DOM dit le nom du souvenir (image d'abord, secret). Leurs règles de combat ne changent pas (Q5).
4. **Chargements des cousus ≥ 0,6 s et leurs zones sources de signe une à une** : sans cela, le juge de l'arène ne peut pas les juger (Q15 (2)), et un chargement de 0,5 s serait sous le préavis de l'arène.
5. **Un Masqué cousu brisé le met à nu 2 s** : sans fenêtre, tuer un Masqué ne rapporte rien dans un combat où il n'y a pas de récompense.
6. **Promotion par le seul cousu dont le coup t'a tué, et attente à l'acte III salle 3** : la règle de salle (le Masqué de la salle, même tué par son escorte) n'a pas de sens avec plusieurs Masqués et le Brumeux ; la salle du boss final n'a pas d'équivalent à la registre III (une fiche à la salle 12 ne reviendrait qu'au fond, contre l'intention de Q13).
7. **Une seule némésis cousue**, la plus forte : Q13 dit « elle », mais l'Extrême en permet deux par acte et il y a trois registres.
8. **Douve : un point de montage sur l'île, ses mains ne s'y retirent plus** (point ouvert § 37 (4)).
9. **L'entité frappable de la phase III est sa croix** : 5a frappait ses mains et dessinait le point faible sur la croix.
10. **Les ennemis des Manœuvres rentrent à la transition II → III**.
11. **Les Masqués cousus se décousent à la transition III → IV**, sans récompense ni promotion ; la némésis décousue garde sa fiche.
12. **L'état réel de la phase III est ajouté en index 5**, `tard`, sans obstacle ni fosse.
13. **`SAVE.brumeux` reste v:1**, avec le champ facultatif `cousu`.
14. **Budget d'une mesure libre réduit de 2 par Masqué cousu vivant** (plancher 2), et chaque cousu compte comme une source de tir.
15. **Ses gestes attendent la zone d'un Masqué en cours (1,5 s au plus), puis c'est le Masqué qui attend** : le non-cumul « une zone à la fois au contact du joueur » (Q8) entre deux systèmes qui ne se voyaient pas.

## 12 · À valider aussi : les 17 écarts d'implémentation de 5c (§ 37)

1. `losClear` est locale : l'enveloppe porte sur `keepRange` et retire les fosses le temps de l'appel quand elles seules coupent la ligne de tir.
2. Les parties fixes des constructions sont cuites dans les tuiles du sol de l'arène (+0,8 ms par image au lieu de +1,6 à +1,8 ; ≤ 3,7 ms par changement).
3. L'île d'une douve est ramenée dans les bornes, et la douve refusée si tu serais à moins de 268 px de son centre.
4. Puits à 160–210 px de toi (et non 240 : son rayon de 220 ne t'aurait pas couvert).
5. Murailles à max(part × distance, 90 px) et à 40 px au moins avant ses mains ; impossibles quand ses mains sont à moins de ~130 px de toi.
6. Échafaudages : les variantes sont d'autres places dans le tiers le plus loin (une tour ronde ne se tourne pas).
7. Rails : glissés le long d'eux-mêmes pour tenir dans les bornes en passant par toi.
8. Manœuvres : l'appel est tronqué au plafond de 4 vivants et ne saute que si rien n'y tient.
9. « Un coup par image » : le plus gros coup de l'image, par élément.
10. Dernier Souvenir : ses effets ciblés ne visent pas une construction ; ses zones la touchent.
11. Ruée : sonné seulement si l'obstacle tient encore à la fin de la charge.
12. Phase III : ses mains ne restaient pas sur l'île d'une douve (tranché ici, § 5 et écart 8).
13. Cloche : on est frappé quand elle passe à ta hauteur pendant les 0,85 s ; son couloir reste une source de signe jusqu'au bout.
14. Un tir du joueur qui meurt sur une construction la frappe par `hitEnemy` (les effets propres des projectiles, `projHit`, ne sont pas rejoués).
15. `brxGrille` réécrite (même grille, plus vite) ; `poseVue` accepte la transformation lue une fois.
16. L'état `ouvrage` est `tard:true` (peint pendant la phase I ; douze tuiles de moins à l'entrée de toute autre arène).
17. Les zones des mutations (Glas, Écho, Ombre) sont des sources de signe de l'arène.

## Découpage de l'implémentation, modèle et effort

Une seule implémentation, dans une autre conversation, dans l'ordre de la méthode : données (`brumeux.js` : gestes, `partition.couture`, `couture` : montage, nœud, points, PV des cousus, plancher ; `arene.js` : état 5) ; logique pure (`/*brx:pur*/` : Surjet, Dé, Aiguilles, points de montage, composition et souvenirs, plafond et suspendus, à nu, budget, némésis et promotion, `cousu`) et `sim-brumeux` section 12 ; section « v18.8 · Phase III » du bloc v18.5 (Couture, nœuds, cousus, transitions, dessin) ; **retouches inertes** dans le bloc du Masqué (plancher, carte, escorte, PV, zones sources de signe), la némésis (promotion par le cousu, attente, `nem` d'essai) et le bloc v18.4 (juge) ; essai `?brumeux=3&nem=…` ; `banc-brumeux` section K ; journal v18.8, wiki (`--check`, rien de neuf), `memoire.md` § 38, `CLAUDE.md`, `REPRISE.md`, `bancs/README.md`, statuts ; régression complète.

**Modèle et effort : Opus 5.5, élevé** (le cadrage prévoyait moyen pour 5d) : la phase touche trois systèmes qui ont leurs propres simulateurs et bancs et qui vivent en jeu normal (le Masqué : `sim-masque`, 3,6 millions de contrôles ; la promotion de la némésis ; le juge de l'arène) ; une erreur là casse les descentes ordinaires, pas seulement le combat d'essai. Si l'auteur préfère « moyen », la couper en deux conversations : **5d-1** (Masqués cousus, némésis, juge, plancher : Opus 5.5, élevé) puis **5d-2** (gestes, partition, état d'arène, dessin, banc K : Opus 5.5, moyen).
