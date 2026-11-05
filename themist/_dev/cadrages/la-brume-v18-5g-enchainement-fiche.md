# La Brume · v18.5 « Le Brumeux » · action 5g · fiche courte de l'enchaînement, des PV au bot, des paliers et de l'allumage de l'arène

Statut : **validée le 5 novembre 2026 (toutes les recommandations : phrase du wiki B « Ce que tu as traversé, il s'en souvient. », règle des formes hors des cibles) ; 5g-1 faite le 5 novembre 2026 (v18.11, PV au bot, mémoire § 41) ; 5g-2 faite le 5 novembre 2026 (v18.12, l'allumage, mémoire § 42).** Rédigée à partir du cadrage validé (Q2, Q10 à Q17), des fiches 5b à 5f (modèle de forme), de `_dev/memoire.md` § 31 à § 40 (points ouverts compris) et du code de la v18.10 : bloc v18 (`desPorte`, portes `mini` et `final`, `planRoom` et `createEnemy` des places provisoires, `onRoomCleared`, `openEnd` et `desFin`), bloc v18.4 (`makeRoom` qui ouvre l'arène quand `actif`, `ouvrir`, `peindre`, crochets), bloc v18.5 et ses sections v18.6 à v18.10 (`creer`, `debut`, `vers` / `transPas`, verrou, `e.seuils18`, `e.pvPlaf18`, `noter` / `brxNoter`, `mort`, `statsRun`, `images`, `pilote2`, `essai`), `data/brumeux.js`, `data/arene.js`, `data/descente.js`, `outils/wiki.mjs` (cartes des gardiens, glyphes, portraits, section « La descente ») et `_dev/bancs/banc-brumeux.mjs` (F, et les sections D de I à M).

Ce qu'il faut savoir du code avant de lire :
- **Aujourd'hui, le fond de l'acte X** : l'acte X (« Le Fond de la Brume », 3 salles, `entree:'mini'`, `miniboss:2`, `fin:'final'`) enchaîne deux salles de miniboss puis la porte `final`. Les trois sont des salles d'élite au **Masqué imposé et renforcé** (`provisoire` : ×2,2, ×2,4 puis ×3 PV, une vague de plus ; `RUN.gardeNow`, `room.gardeK`). Le boss final provisoire vaincu : `onRoomCleared` → `RUN.mem.won`, `later(2.2, openEnd(true))`.
- **L'arène sait déjà s'ouvrir seule** : `makeRoom` (bloc v18.4) ouvre `final` quand `actif()` est vrai, que `RUN.gardeNow==='final'` et que la salle est une élite. Mais elle l'ouvre **à l'état 0** (un état d'essai à quatre piliers), et `ouvrir` peint tous les états non `tard` (0 à 3) à l'entrée.
- **Le Brumeux ne sait naître qu'en essai** : `essai(phase)` → `XA.essai` (salle d'élite vidée de son Masqué) → `debut(phase)`. Rien n'appelle `debut` dans une vraie descente.
- **Sa mort** (`mort`) vide la salle, note la sauvegarde (`noter(true)` : `victoires++`, hors essai) et joue la scène de 3 s ; « hors essai : la victoire de la descente » est laissé à 5g (seul `gainXp` est appelé). La salle vidée déclenche `onRoomCleared`, qui ouvrirait la fin **à 2,2 s, en pleine scène**.
- **Une mort du joueur par le Brumeux** est notée `src.type === 'boss'`, et `foeName('boss', RUN.act)` rend le gardien du **registre 3** : la chronique dirait « face au Glas Originel ».
- **Les PV** sont des placeholders (2 400 par phase, la phase V courte à la moitié). Les durées connues viennent du bot qui frappe **au niveau 1, kit de base**, contre des vagues de l'acte X : par phase, Lumenarque ≈ 57 / 35 / 44 / 9 / 6 s, Gouffre ≈ 26 / 32 / 36 / 27 / 17 s, Héraut ≈ 14 / 12 / 16 / 11 / 6 s, Tisse-Destin ≈ 133 / 80 / 150 / 57 / 36 s (I-D, J-D, K-D, L-D, M-D). L'écart entre formes va **de 1 à 10**, et l'ordre des formes change d'une phase à l'autre (le Lumenarque est lent en I, très rapide en IV).
- **Ce qui est en part des PV de la phase** suit tout seul une recalibration : constructions (`pvPart`), seuil d'annulation (5 %), nœuds (2,5 %), cousus (15 %), plafond du Dernier Souvenir (4 à 8 %). **Ce qui ne l'est pas** : les vagues des tableaux et de l'éclair (montée de l'acte X), les Manœuvres.

---

## 1 · L'enchaînement réel

**De l'entrée de l'acte X au Brumeux** (rien ne change avant la porte `final`) :

| Étape | Ce qui se passe | Change en 5g ? |
|---|---|---|
| Porte « Acte X » | pacte d'entrée, bannière, relance de talents (bloc v18) | non |
| Salle 1 · miniboss | Masqué ×2,2 et une vague ; relique à la purge | non (provisoire jusqu'à l'action 6) |
| Salle 2 · miniboss | Masqué ×2,4 et une vague ; relique ; une seule porte : `final` | **la porte porte son glyphe** (§ 5) |
| Salle 3 · le fond | **l'arène, le Brumeux, cinq phases d'affilée** | **oui** |

**Recommandation : les deux miniboss restent provisoires** (Masqués renforcés) jusqu'à l'action 6, comme le prévoit le cadrage ; aucun soin, aucune halte de plus avant le fond (Q12 : c'est la fin, les soins du monde suivent déjà le palier).

**L'entrée** :
- `makeRoom` ouvre l'arène **à l'état 3** (le Rappel), pas à l'état 0 ; seule la peinture de l'état 3 se fait à l'entrée (les états 0 à 2, d'essai, ne sont jamais peints dans une vraie descente ; 4 à 8 restent `tard`, peints une tuile par image pendant les phases d'avant, comme aujourd'hui).
- `planRoom` d'une salle `final` arène allumée : **aucune vague, aucun Masqué** ; puis `debut(0)` à l'entrée : le Brumeux naît en haut, tu entres en bas (entrée `fx 0,5, fy 0,88`).
- Bannière « Le Brumeux · Au fond de la Brume » (celle de l'essai), **2,2 s pendant lesquelles il ne lance rien** : le premier entracte dure la bannière ; sa première lecture (regard, rire) suit.
- Pas de scène d'entrée façon `SC27` : ses mains qui descendent sont son entrée.
- La graine du combat est tirée une fois à l'entrée (comme l'essai) et notée dans les statistiques.

**Les cinq phases d'affilée.** Transitions inchangées (5a, 5f) : verrou 1,2 s à 15 %, cri, transformation de l'arène, présence, relecture ; **jamais une pause** (aucun écran, aucune bulle ; un niveau gagné en plein combat attend la touche Tab, comme en descente).

| Transition | Arène | Durée | Ce qui reste | Ce qui part |
|---|---|---|---|---|
| I → II | 3 → 4 (mêmes bornes, sol en fondu) | 3,0 s | rien de la phase I sur le sol | le tableau en cours rentre, avec ses tirs et ses ondes |
| II → III | 4 → 5 | 3,0 s | **les constructions** et leurs mécanismes | les Manœuvres rentrent |
| III → IV | 5 → 6 (bornes à 240 px/s) | ≈ 3,9 s | les constructions **filtrées** (bornes, aire 30 %) | tout se découd (cousus, nœuds, bouts) |
| IV → V | 6 gardé | 3,0 s | les constructions (elles tombent une à une en V) | la copie en cours, sans fenêtre |

Restent **pendant tout le combat** : tes PV (aucun soin entre les phases), ta braise du Dernier Souvenir (une par acte), l'Accoutumance, `RUN.par18` et le journal du combat (`X.montre`, `X.parC`) que la phase V relit, la sauvegarde lue à l'entrée. Total des transitions ≈ 13 s.

**La place provisoire du boss final** : elle devient **le repli**. `arene.actif` reste l'interrupteur (comme `dessin.actif` des gardiens) : vrai, le Brumeux ; faux, le Masqué ×3 d'aujourd'hui, **au bit et à l'image près** (prouvé par la règle d'or, § 8). `descente.js` garde `provisoire.final` ; le wiki ne le cite plus tant que l'arène est allumée.

**Recommandation : cet enchaînement, l'entrée à l'état 3, la bannière qui sert de premier entracte, et `actif` comme interrupteur de repli.**

## 2 · Les PV de chaque phase, mesurés au bot

### 2.1 Les cibles (Q11)

| | Cible (médiane des quatre formes) | Tolérance par forme |
|---|---|---|
| Phases I à IV | 50 à 70 s, médiane 60 s | 36 à 96 s (× 0,6 à × 1,6) |
| Phase V courte (Normal, Difficile) | 25 à 35 s | 18 à 48 s |
| Phase V entière (Extrême) | 50 à 70 s | 36 à 96 s |
| Combat entier (Normal) | ≈ 5 min, de 4 à 6 min | 3,5 à 7,5 min |

**Pourquoi une médiane et une tolérance** : avec les mêmes PV pour tous, les quatre formes ne peuvent pas tenir toutes dans 50–70 s quand le bot les mesure de 1 à 10 (§ 2.4). La cible du cadrage vaut pour la **médiane des quatre formes** (la moyenne des deux formes du milieu, insensible aux deux extrêmes) ; chaque forme a une bande plus large.

### 2.2 Le protocole

**Le build de référence de l'acte X** (nouveau, `brumeux.js`, `bot.reference`, hors wiki), par forme :
- **niveau** : la médiane du niveau atteint à l'entrée de l'acte X par `banc-descente` A (Normal, quatre formes), arrondie à l'entier inférieur ;
- **talents** : dix talents portés, ceux de la **sous-classe principale** de la forme (la première de `formes.*.subs`) dans l'ordre de l'arbre, rangs répartis selon le niveau, ultime [F] s'il est atteint, aucune gravure ; la liste est écrite dans les données et **montrée à l'auteur** dans le compte rendu de 5g-1 ;
- **équipement** : un objet par emplacement (I à IV), de la rareté la plus probable à l'acte X d'après `equipements.js`, le premier de chaque emplacement dans l'ordre des données ;
- **rien d'autre** : ni relique, ni pacte, ni Résonance, Accoutumance à 0. Ce qui manque est une marge : un vrai joueur ira un peu plus vite (la tolérance l'absorbe, l'action 7 recale sur des parties exportées).
- Contrôle : les deux autres sous-classes de chaque forme, mesurées une fois, pour voir l'écart **dans** une forme (non calibré).

**Le mannequin** (essai seulement, `?brumeux=<n>&ref=1&mannequin=1`) : le Brumeux à la présence de sa phase (mains en haut, ou corps au sol), qui ne lance rien et ne change pas de phase. Le bot le frappe 60 s : **le DPS de la forme**, sans ce que le combat lui fait. Il sert à séparer ce qui vient de la forme et ce qui vient du combat (§ 2.4).

**Les combats** (`?brumeux=1&ref=1&bot=2&dieu=1`, combat entier de I à V, outil `_dev/bancs/mesure-brumeux.mjs`) :

| Passe | Formes | Paliers | Graines | Combats |
|---|---|---|---|---|
| Mannequin | 4 | — | — | 4 × 2 présences × 60 s |
| Calibration (jusqu'à trois tours) | 4 | Normal | 101, 202, 303, 404, 505 | 20 par tour |
| Validation | 4 | Normal, Difficile, Extrême | 5 / 2 / 3 | 40 |

- `dieu=1` : le bot ne meurt pas, la durée n'est pas tronquée ; il esquive quand même (sorties calculées).
- Durée d'une phase : de la fin de la transition qui l'ouvre au début de la suivante (transitions à part).
- **Calibration** : `PV ← PV × cible ÷ médiane` (phases I à IV : 60 s ; V : sur l'entière, 60 s), arrondi à 100 ; la phase I n'est pas proportionnelle (ses vagues ne suivent pas ses PV) : deux ou trois tours, jusqu'à une médiane entre 57 et 63 s.
- La phase V courte reste `phaseV.courte.pv` × l'entière (0,5) ; si la courte sort de 25–35 s quand l'entière est dans 50–70 s, ce rapport s'ajuste **entre 0,4 et 0,6**, une fois.
- **Mêmes PV dans les trois paliers et pour les quatre formes** ; la seule différence reste la phase V courte ou entière (Q12, validée en 5f).
- **Pas d'enrage** (Q11 a) : aucune accélération, aucun chronomètre.

**Le bot est un instrument.** Il n'est retouché que là où il joue visiblement mal, capture à l'appui, jamais pour rapprocher les formes. Une retouche déjà prévue : **pendant un tableau, il vise les ennemis du tableau à toute distance** (aujourd'hui, au-delà de 220 px il ne vise que le Brumeux : le Tisse-Destin ne vide jamais ses tableaux, qui rentrent à 30 s). Chaque retouche est listée dans la mémoire.

### 2.3 Les sections de banc qui suivent

Les sections D de I à M (une phase au bot) et la section F passent au build de référence (`ref=1`) : sinon, avec les PV calibrés, le bot de niveau 1 y mettrait trois à cinq fois plus de temps. Leurs limites deviennent la tolérance du § 2.1.

### 2.4 Corriger les écarts entre formes, sans PV par forme

**Une règle proportionnelle ne resserre rien.** Une résistance, un multiplicateur, un « à nu » plus long changent la durée de toutes les formes dans le même rapport : l'écart reste. Seules des règles qui saturent (un plafond de dégâts, un plancher de temps) le resserrent, et elles ont chacune un coût (§ 2.5).

**La friction** : pour chaque forme et chaque phase, `durée × DPS au mannequin ÷ PV de la phase`. Elle mesure ce que le combat coûte à cette forme (gestes à esquiver, vagues, constructions, nœuds, distance), indépendamment de la force de son kit.

**Recommandation (la règle si une forme reste hors des cibles)** :
1. **Mêmes PV pour tous**, calés sur la médiane des quatre formes.
2. Une forme **dans sa tolérance** : rien à faire.
3. Une forme **hors de sa tolérance** : on regarde sa friction.
   - **Friction proche de la médiane** (× 0,75 à × 1,33) : l'écart vient **du kit de la forme**, contre tout boss, pas du Brumeux. On l'accepte et on le note pour l'**action 7** (équilibrage des formes ; le corriger ici toucherait le reste du jeu et la règle d'or).
   - **Friction hors de cette bande** : le combat traite cette forme à part. On cherche le mécanisme dans le journal (temps par sorte de mesure, à quoi vont ses dégâts : corps, constructions, nœuds, vagues ; fenêtres à nu prises) et on le corrige **pour tous** (une règle du combat, jamais une valeur lue sur la forme). Une seule passe de correction, puis on remesure.
4. Toujours hors après cette passe : **on s'arrête et on présente le cas à l'auteur**, sans forcer.
5. **Interdits** : PV, dégâts, résistance ou règle lus sur la forme ou sur le palier ; enrage ; plafond de dégâts par seconde.

Ce qu'on peut déjà attendre : le Tisse-Destin a une friction propre au combat (tableaux non vidés, échafaudage à −40 %, cousus qui aboutissent) que la retouche du bot et le réglage de l'échafaudage (§ 7) devraient réduire ; le Héraut et le Lumenarque en phase IV sont rapides par leur kit (un seul emprunt joué) : probablement « accepté, action 7 ».

### 2.5 Leviers écartés ou gardés en réserve

| Levier | Effet | Décision |
|---|---|---|
| PV par forme | resserre tout | **écarté** (consigne de l'auteur) |
| Plafond de dégâts par coup ou par seconde | ralentit les formes qui frappent fort | **écarté** : invisible, c'est un mur |
| « Le dernier coup d'une phase se porte à nu » | une forme rapide attend une fenêtre : plancher de temps lisible (l'anneau ivoire) | **en réserve, action 7**, si des parties réelles montrent des phases finies avant leur première boucle |
| Fenêtres à nu plus longues après 1,5 × la cible | aide les formes lentes | **en réserve, action 7**, avec Q11 b |

**Recommandation : ce protocole, ces cibles et cette règle.**

## 3 · Les paliers en vrai (Q12)

Ce qui change réellement, lu dans les données (aucune ligne n'ajoute de PV ni de dégâts ; aucune mutation au boss final, `desMutSalle` l'exclut déjà) :

| | Normal | Difficile | Extrême |
|---|---|---|---|
| PV des phases I à IV | identiques | identiques | identiques |
| Phase V | courte (½ PV), socle seul | courte, socle seul | **entière**, socle + 3 mesures libres par boucle |
| Budget d'une mesure libre (I à V : 4, 5, 6, 6, 7) | × 1 | × 1,25 | × 1,5 |
| Budget d'un tableau (I) | 4 | 5 | 6 |
| Constructions au plus (II) | 5 | 6 | 6 |
| Manœuvres (II) | 2 | 2 | 3 |
| Masqués cousus vivants (III) | 2 | 2 | 3 |
| Budget de l'éclair (V) | 2 | 2 | 3 |
| Préavis | grammaire | identique | identique |
| Ennemis des tableaux | montée de l'acte X | identique | identique |
| Avant le fond | soins du monde × 1 | × 0,65 | × 0,5, pas de répit de némésis |

**Une conséquence** : la règle de Difficile « un temps de plus pour les miniboss et le boss final » (`desTempsEnPlus`) ne vaut plus que pour les miniboss ; le Brumeux n'a pas de temps de plus (il n'est pas un Masqué). Le wiki corrige sa phrase.

**À vérifier en mesure** : Difficile et Extrême ajoutent du contenu (plus de budget, une construction, un cousu, une Manœuvre) : leurs phases peuvent durer un peu plus. Elles doivent rester dans la tolérance ; on ne compense pas par des PV.

**Recommandation : ce tableau, tel qu'il est déjà dans les données.**

## 4 · La victoire et la mort

**La victoire** (après la scène de mort de la phase V, 3 s) :
- **La fin de descente s'ouvre à la fin de la scène, plus 1 s** (≈ 4 s ; mouvements réduits : fondu d'1 s, puis 1 s), au lieu de 2,2 s en pleine scène. Les contrôles ne sont jamais retirés : on marche dans la brume, parmi le masque brisé et la croix.
- `openEnd(true)`, la chaîne existante : `desFin` ouvre le palier suivant (Normal → Difficile → Extrême) et compte la victoire par palier et par forme (`SAVE.descente`), chronique « est allé au fond de la Brume », statistiques (`brumeux` : temps et coups par phase, `fin:'victoire'` ; `images`), Éclats et récompenses de fin comme aujourd'hui, `nemFin`, `dsFin(true)`.
- La tuile « Combats de gardien » de l'écran de fin gagne **X** et la durée du combat entier (un seul nombre, aucune phase).
- `SAVE.brumeux` : `tentatives + 1`, `victoires + 1`, `phaseMax` 5, éléments vus. **Une victoire n'efface pas** `mort` : il garde la mémoire de tes morts (règle de 5a, inchangée). Désormais écrite **hors essai** : c'est déjà le code (`noter` n'écrit rien seulement en essai) ; 5g la prouve sur une vraie descente.
- Pas de relique (déjà : `gardeK==='final'`).

**La mort du joueur pendant le combat** :
- `SAVE.brumeux` : `tentatives + 1`, `phaseMax`, **ce qui t'a tué** par phase et son détail (`tab`, `bati`, `cousu`, `emp`) ; au combat suivant, il le rejoue d'abord (5a à 5f).
- **Un Masqué cousu qui te tue est promu** (il t'attend à l'acte III, salle 3 de la descente suivante) ; **le Brumeux lui-même ne promeut rien et ne gagne rien** (ni trophée, ni némésis, ni trace dans `SAVE.nemesis`).
- **Correction nécessaire** : une mort par le Brumeux est notée `brumeux` (et non `boss`) dans `RUN.mem.lastSrc`, les tueurs et la tombe ; `foeName('brumeux')` rend « le Brumeux ». Sans cela, la chronique dirait « face au Glas Originel ».
- La tombe d'Écho d'une mort au fond se pose dans l'arène, en coordonnées du monde, dans les bornes de l'état 3 : on la retrouve à l'entrée du combat suivant.
- L'écran de mort ne dit ni phase ni geste : « Le Brumeux » (ou le Masqué cousu, ou l'ennemi d'un tableau). Les statistiques exportées gardent la phase atteinte (outil de l'auteur, pas un texte du jeu).

**Recommandation : la fin à la fin de la scène, la chaîne existante d'`openEnd`, la source `brumeux`.**

## 5 · L'allumage

**`arene.js` : `actif:true`.** L'arène large ne sert qu'à la salle `final` d'une vraie descente (pas aux miniboss, pas aux essais `?arene=`).

**Ce qui change à l'image, et seulement là** :
1. la salle `final` entière (arène, Brumeux, HUD) ;
2. **la porte `final`** : son glyphe (croix de manipulation et œil, `dessin.glyphe`) à la place de l'icône, dans `sigil`, comme les portes des gardiens (bloc v17.27) ; elle se voit dans la salle du second miniboss, une fois purgée ;
3. **la barre de vie** : son glyphe à gauche du nom (`g27GlypheHud`, déjà enveloppé en 5a) ;
4. le wiki (§ 6).

**Les autres salles ne changent pas** : preuve par la règle d'or image par image (§ 8) ; la porte `final` est éprouvée à part (seul le rectangle de son sceau diffère).

**Le coût de rendu, avec la vraie foule de l'acte X** : la mesure appariée de 5b à 5f (une seule page, contre le boss d'essai devant la même foule, médiane de séries alternées), sur **le moment le plus chargé de chaque phase**, en Normal et en Extrême :

| Phase | Moment mesuré |
|---|---|
| I | tableau vivant aux Braseros, vague de l'acte X au budget du palier, dalles |
| II | constructions au plafond (5 / 6), Manœuvres (2 / 3), une annonce |
| III | trois montages, cousus vivants (2 / 3), constructions |
| IV | emprunt en cours, constructions filtrées |
| V | état 8, éclair au budget (2 / 3), un cousu, fosses, masque fendu |

- Limite **+1,5 ms** par moment ; la phase V est à +1,3 ms avec une foule synthétique : c'est la plus à risque.
- Si elle dépasse, ces leviers, dans l'ordre, **sans rien changer au jeu** : fosses cuites dans les tuiles du sol (comme les constructions), brume du manteau en calque plus petit, cadre de l'éclair posé par bandes.
- Peinture à l'entrée de la vraie salle (état 3 seul) ≤ 250 ms.
- À titre d'information : la salle `final` allumée contre la salle provisoire de la v18.10, au même instant de jeu.
- La durée des images en vraie partie (statistiques exportées, moyenne et pire 5 %) reste à lire sur des parties réelles (action 7).

**Recommandation : l'allumage, le glyphe à ces deux endroits, ce protocole de coût.**

## 6 · Le wiki et le journal (Q16)

**La carte « Au fond de la Brume »** :
- **une section à elle**, générée (`gen:fond`, depuis `brumeux.js` : `nom`, `dessin.glyphe`, un champ neuf `wiki.phrase`), **juste après « Les gardiens »**, et non dans cette section : son introduction dit que les gardiens « se jouent en trois temps (phases) », ce qui suggérerait un nombre ;
- son contenu : le glyphe devant le nom, « Le Brumeux », « Acte X · Au fond de la Brume », **un portrait**, **une phrase**. Ni PV (ils changeraient avec le palier), ni durée, ni barre ;
- **un seul portrait, sans survol** : le marionnettiste tel qu'on le voit en entrant (capuchon deviné dans la brume, deux yeux pâles, croix de manipulation, mains et fils qui descendent). Pas le corps au sol (il porterait le masque à ta forme), pas le corps sans masque (c'est sa mort) ;
- portrait : `img/brumeux/brumeux-v<dessin.version>.webp`, 480 × 600, capturé par `capture-portraits.mjs` (aperçu hors salle `__brumeux.apercu`), réclamé par `wiki.mjs --check` comme ceux des gardiens.

**La phrase (au choix de l'auteur)** :
- **A.** « Il a écrit chaque salle de ta descente. Au fond, il la réécrit. » (l'exemple du cadrage)
- **B.** « Ce que tu as traversé, il s'en souvient. » (l'écho de « ce que tu oublies, la Brume s'en souvient »)
- **C.** « Il t'a regardé descendre. Au fond, il t'attend. »

**Recommandation : B**, la plus courte, qui tient à l'idée centrale du jeu sans rien dire de ce qu'il fait ; C est la plus muette ; A dit le plus.

**La section « Les signes au bord de l'écran »** (lisibilité, pas un secret) :
- dans « Bien démarrer », juste après « Lire les zones et les bulles », générée (`gen:signes`) depuis `arene.js` (`indicateurs.cat`, `couleurs`) ;
- une phrase : « Quand le combat déborde de l'écran, ce qui arrive hors de vue se signale au bord, du côté d'où il vient. » ;
- six signes dessinés en SVG dans leurs couleurs : l'arc orange qui se remplit (une attaque annoncée), la flèche violette (un tir qui passera près de toi), le crochet cyan (une saisie), son glyphe dans l'anneau ivoire (lui), le chevron rouge épais (un champion ou un Masqué), le trait rouge fin avec un nombre (des ennemis regroupés) ;
- rien sur la taille de l'arène, ni sur ce qui la fait changer.

**Les autres retouches du wiki (générées)** :
- « La descente » : « le boss final (à venir…) » devient un lien vers sa carte ; l'introduction ne dit plus que le boss final arrive « dans les prochaines versions » (les miniboss et les six gardiens, si) ;
- la règle de Difficile dit « les miniboss » (plus « le boss final ») pour le temps de plus ;
- « Les portes » (fait main) : une entrée de plus, son glyphe, « Boss final : le fond de la descente ».

**Le journal** : une ligne à l'allumage, sans phase ni mécanique. Proposée : « **Au fond de la descente, il ne répète plus : il t'attend.** » (la suite des lignes v18.9 et v18.10, « il répète en coulisses »). Autre : « Le boss final est arrivé : au fond de la Brume, quelqu'un t'attend. »

**Ce que le wiki ne dit jamais** : combien il a de phases, ce qu'elles contiennent, qu'il bâtit selon ton style, comment il choisit, coud ou emprunte, ni qu'il porte ton masque. Le simulateur l'étend à la nouvelle section et à la carte.

**Recommandation : cette carte (phrase B), cette légende, ces retouches, cette ligne de journal.**

## 7 · Les points ouverts des § 34 à § 40

| Point ouvert | Décision | Où |
|---|---|---|
| La Révérence renonce souvent (une sortie dans un tiers des placements) | rien en 5g : un renoncement fait sauter la mesure (0,6 s), la calibration l'absorbe ; le banc N compte les Révérences jouées | **action 7**, si une vraie partie en voit moins d'une toutes les deux boucles |
| L'échafaudage tient 4 à 9 s au bot | sa durée suit les PV de la phase (`pvPart` 0,10) : on la remesure après calibration ; cible 3 à 5 s médiane ; au-delà de 5 s, `pvPart` 0,10 → 0,06, une fois | **5g-1** |
| La cloche des rails presque jamais jouée | rien à changer (J-B prouve son réglage) ; N la compte | **action 7** (parties réelles) |
| Les mains hors de l'île d'une douve (III) | **déjà tranché en 5d** (un point de montage sur l'île, sa croix est le corps frappable) : à retirer des points ouverts de `REPRISE.md` | fermé (5h vérifie) |
| Le Verre invisible dans un fragment | **le Verre sort des règles des fragments** (`tableaux.exclues`, avec la Brume plombée) tant qu'il n'a pas de signe : pas de modificateur caché (× 1,4) à l'allumage. Son signe, en descente comme dans un fragment, va à l'action 7 | **5g-2**, puis **action 7** |
| La dalle qui ne blesse pas hors de la vue | **déjà réglé en 5c** (`o.brx` exempté de « on ne frappe que ce qu'on voit », dalles comprises) : à retirer des points ouverts | fermé (5h vérifie) |
| L'effondrement toujours sur un pan en essai direct | un effet de l'essai `?brumeux=5` ; N-A et N-B jouent le combat entier, où une construction tombe | fermé |
| `sim-brumeux` dure environ 30 min | **découpé par section** (`node sim-brumeux.mjs 1-13`, `14`, `15` ; `SIM_TEMPS=1` garde le temps par section) ; la régression le lance entier, rien n'est retiré | **5g-2** |
| L'échec intermittent de `banc-arene` C | **stabilisé** : séries plus longues, alternance A B A B avec un témoin A A′ qui mesure le bruit ; jugé sur la médiane de cinq séries ; bruit au-delà de 0,5 ms : rejouée (deux fois au plus) au lieu d'échouer. C mesure aussi la vraie salle `final` allumée | **5g-2** |
| Un coup sans signe vu une fois (§ 36 (7)) | surveillé : N-C compte sur 24 combats entiers | **5g-2** |
| Le rire de la lecture est celui des contre-mesures | rien en 5g | **action 7** (son) |

**Recommandation : ces décisions.**

## 8 · Ce que l'implémentation devra prouver

**`sim-brumeux`, section 15** :

| Vérification | Détail |
|---|---|
| Données | PV calibrés : multiples de 100, mêmes dans les trois paliers, aucun par forme ; `phaseV.courte.pv` entre 0,4 et 0,6 ; `bot.reference` (quatre formes : niveau, dix talents au plus, tous de la sous-classe principale, existants) ; `wiki.phrase` ; `tableaux.exclues` contient `verre` ; `arene.actif` vrai |
| Paliers | le tableau du § 3 lu dans les données ; aucune valeur de PV ou de dégâts lue sur le palier hors la phase V |
| Branchements | `planRoom` d'une salle `final` allumée : ni vague ni Masqué ; `ouvrir` à l'état 3 ; repli `actif:false` : l'ancien chemin, texte inchangé ; source `brumeux` et `foeName` ; fin à la fin de la scène ; ni `Math.random` hors de la graine d'entrée, ni `murmur`, ni `showCard` dans la section v18.11 |
| Secret | la carte, la légende et le journal ne nomment ni phase, ni nombre, ni bâtir, ni style, ni choix, ni couture, ni emprunt, ni masque |

Contre-épreuves : une vague planifiée dans la salle `final` ; l'arène ouverte à l'état 0 ; une phrase du wiki qui dit « cinq » ; un PV lu sur la forme ; une mort par le Brumeux notée `boss`.

**`banc-brumeux`, section N** (le combat, depuis une vraie descente) :

| Section | Vérification |
|---|---|
| N-A | enchaînement réel : `?descente=10` → deux miniboss provisoires → porte `final` (glyphe) → arène à l'état 3, entrée en bas, rien ne frappe pendant la bannière → I à V, transitions ≤ 4,5 s, jamais un écran ni une pause → victoire → fin à la fin de la scène (≈ 4 s) |
| N-B | 24 combats entiers au bot (`ref=1`, quatre formes, trois paliers, deux graines) : chaque phase dans sa tolérance, médianes et durée totale rapportées, transitions, fenêtres à nu, mesures sautées, Révérences, cloches, échafaudages |
| N-C | 0 coup sans signe sur ces 24 combats (détail imprimé s'il y en a un) |
| N-D | victoire hors essai, sur une page jetable : `SAVE.brumeux` (victoire), `SAVE.descente` (palier ouvert, victoire par forme), statistiques, tuile X ; mort : tentative, phase, élément, cousu promu, Brumeux sans promotion, chronique « face au Brumeux », tombe dans l'arène retrouvée au combat suivant ; en essai, rien d'écrit |
| N-E | coût apparié des cinq moments du § 5 en Normal et en Extrême (≤ +1,5 ms chacun), peinture d'entrée (≤ 250 ms), salle allumée contre la salle provisoire (information) |
| N-F | règle d'or, `banc-arene` G arène allumée contre le commit de cette fiche : les 18 salles autres que le boss final identiques image par image dans les trois paliers ; la salle du second miniboss purgée : seule la zone du sceau de la porte `final` diffère ; `actif:false` : les 19 salles identiques (le repli) |
| N-G | mouvements réduits ; captures relues : porte `final`, entrée, chaque transition, glyphe de la barre, scène de mort puis écran de fin, écran de mort, carte du wiki et légende des signes rendues |

**`mesure-brumeux.mjs`** (outil, hors régression) : mannequin, calibration, validation (§ 2.2) ; il imprime le tableau par forme, phase et palier, les frictions et le verdict de la règle du § 2.4 ; ses tableaux vont dans `memoire.md`.

**Mode d'essai** : `?brumeux=<n>[&ref=1][&mannequin=1]` en plus des paramètres existants ; `?descente=10[&fin=1]` mène à la vraie salle `final` (essai : rien d'écrit) ; console `__brumeux` : `reference(cls)`, `mannequin()`, `apercu(ctx)` (portrait).

**Régression** : tous les simulateurs (`sim-arene` et `sim-descente` attendent l'arène allumée et la nouvelle phrase du wiki), tous les bancs, puis `banc-gardiens-final` seul.

## 9 · Écarts au cadrage (à valider avec la fiche)

1. **Cible par la médiane des quatre formes**, avec une tolérance par forme (× 0,6 à × 1,6), au lieu de 50–70 s pour chaque forme : le bot les mesure de 1 à 10 et les mêmes PV ne peuvent pas les tenir toutes.
2. **Un build de référence défini dans les données** (niveau mesuré, dix talents de la sous-classe principale, équipement d'une rareté probable, ni relique ni pacte), que Q11 nommait sans le définir.
3. **Un mannequin d'essai** pour mesurer le DPS de chaque forme et la **friction** du combat.
4. **La règle des formes hors des cibles** : écart venu du kit → accepté, action 7 ; écart venu du combat → corrigé pour tous ; sinon, l'auteur décide.
5. **Le bot retouché comme instrument** (il vise les ennemis d'un tableau à toute distance).
6. **Les sections D de I à M et F passent au build de référence.**
7. **L'arène s'ouvre à l'état 3** dans une vraie descente ; les états d'essai ne sont pas peints.
8. **La bannière sert de premier entracte** (2,2 s sans rien lancer).
9. **La fin de descente s'ouvre à la fin de la scène, plus 1 s**, et non à 2,2 s.
10. **`arene.actif` reste l'interrupteur de repli** vers la place provisoire.
11. **Une mort par le Brumeux devient la source `brumeux`** (chronique, tueurs, tombe).
12. **Le Verre sort des fragments** jusqu'à ce qu'il ait un signe.
13. **L'échafaudage peut passer à `pvPart` 0,06** après mesure.
14. **La carte est une section à elle**, avec un seul portrait (le marionnettiste) et sans PV ; la porte `final` entre dans la légende des portes.
15. **Les phrases du wiki sur le boss final « à venir » et sur son temps de plus changent.**
16. **`sim-brumeux` découpé par section, `banc-arene` C stabilisé.**
17. **5g est coupée en deux** (5g-1, 5g-2) et prend deux versions (v18.11, v18.12).

## Découpage de l'implémentation, modèle et effort

**5g-1 · Les mesures et les PV** (v18.11, l'arène reste éteinte, rien ne change en jeu) :
- `brumeux.js` : `bot.reference` (après lecture du niveau par `banc-descente` A), PV calibrés, `phaseV.courte.pv` si besoin, `pvPart` de l'échafaudage si besoin ;
- essai `ref=1` et `mannequin=1`, retouche du bot, outil `mesure-brumeux.mjs` ;
- sections D de I à M et F au build de référence, limites revues ;
- `sim-brumeux` : données de 5g-1 ;
- journal v18.11 (une ligne muette, du type « le Brumeux mesure ses forces ; rien ne change en jeu ») ; wiki : `--check`, rien de neuf ;
- `memoire.md` § 41 (tableaux de mesure, frictions, verdicts par forme), statuts, régression complète, commit et push.
- **Opus 5.5, élevé** : c'est un travail de jugement (lire les frictions, distinguer le kit du combat, retoucher l'instrument sans le biaiser). Le compte rendu présente à l'auteur le build de référence et chaque forme hors de sa tolérance avant 5g-2.

**5g-2 · L'allumage, la fin, le wiki et le banc N** (v18.12) :
- `arene.js` `actif:true` ; salle `final` (état 3, ni vague ni Masqué, `debut`, bannière) ; fin à la fin de la scène ; source `brumeux` ; tuile X ; glyphe de la porte `final` ;
- `exclues` + `verre` ; `sim-brumeux` section 15 et découpage par section ; `banc-arene` C stabilisé ;
- wiki : section « Au fond de la Brume » (phrase choisie), portrait capturé, légende des signes, retouches de « La descente » et des portes ; journal v18.12 ;
- `banc-brumeux` section N (A à G) ; `memoire.md` § 42, `CLAUDE.md`, `REPRISE.md` (points ouverts fermés), `bancs/README.md`, statuts ; régression complète ;
- **Opus 5.5, élevé** : l'allumage touche la vraie descente pour la première fois (règle d'or, fin de partie, sauvegardes).

**5h · Relecture indépendante** : un agent qui n'a écrit ni 5a à 5g, sur tout le combat allumé (lisibilité, aucun coup sans signe, secret, mouvements réduits, coût, sauvegardes), puis les corrections. **Opus 5.5, élevé.**

Si l'auteur préfère une seule implémentation, 5g-1 et 5g-2 peuvent se suivre dans la même conversation (Opus 5.5, élevé), mais l'arrêt entre les deux permet de valider le build de référence et les formes hors des cibles avant que le combat ne s'allume.
