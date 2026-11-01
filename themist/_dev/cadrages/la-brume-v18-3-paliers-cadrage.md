# La Brume · v18 · action 3 : règles des paliers Difficile et Extrême · cadrage

Statut : **validé le 1er novembre 2026** (toutes les recommandations). **3a faite : v18.2** (règles de Difficile et d'Extrême hors mutations ; détail `themist/_dev/memoire.md` § 32). **3b faite : v18.3** (les huit règles mutantes de l'Extrême, comme recommandé en Q5–Q7 et Q11 ; détail § 33). Action 3 terminée. (Action 4 faite ensuite : v18.4, § 34.)

Écart à l'implémentation (Q4) : aucune des 15 combinaisons du Masqué au registre 3 n'admet de quatrième capacité (cinq capacités, exclusions de chaque corps, explosion et onde jamais ensemble). Le temps de plus d'une place provisoire est donc **sa signature redoublée** (une fois de plus au milieu de chaque cycle, jamais deux fois de suite), sous 35 % de PV, avec le rituel de l'éveil ; la quatrième capacité reste prévue dans le code pour un futur corps ou une future capacité.
Mesure (Q13) : le modèle du simulateur donne Difficile +62 % et Extrême +101 % (hors mutations), au-dessus des cibles ; les soins du monde ×0,65 pèsent le plus. À recaler sur des parties réelles (statistiques : soins reçus par source). Le compte des Masqués par palier se vérifie depuis la v18.4 par un comptage direct (`banc-paliers` E, 800 salles par palier). Références : `la-brume-v18-descente-10-actes-cadrage.md` (V1–V8, D3, D4, D8), `CLAUDE.md`, `themist/_dev/memoire.md` § 31 et § 31 bis, état du dépôt au commit `f5c17cf`.

## Règle d'or (rappel, non négociable)
- **Normal** : `regles.normal` reste `{}` ; la descente Normal est identique, au bit près, à la v18.1 (le simulateur le prouve sur toute la descente).
- **Gardiens des actes I à III** (Mère-Brume, Héraut Noyé, Glas Originel) : leur combat (PV, dégâts, attaques, temps, rayon) ne change **dans aucun palier**. Les règles des paliers s'appliquent autour d'eux, en couches, jamais sur eux.

## Ce qui existe déjà et sur quoi on s'appuie
| Brique | Où | Valeur actuelle | Utile pour |
|---|---|---|---|
| Apparition du Masqué | `bestiaire.js`, `assemble.chance`, `premiereSalle` | 50 % par salle de combat, dès la salle 3 de chaque acte | Difficile |
| Masqué porteur de souvenir | `assemble.souvenir` | `chance:50`, `parActe:2` | Difficile |
| Némésis | `assemble.nemesis` | `parActe:1`, `repit.morts:3` | Extrême (en secret) |
| Règles de salle (v14) | `bestiaire.js`, `regles` + `reglesSalle` | Verre, Sol qui se dérobe, Brume plombée, Braseros ; 20 à 30 % des salles | à ne pas confondre avec les mutations |
| Soins | `heal(n, src)` ; une vingtaine de sources (`room`, `halte`, `boss`, `level`, `devour`, `steal`, `kill`, `pacte`…) | — | Difficile, Extrême |
| Anciens Paliers de Brume | `sanctuaire.js`, `PAL()` (vaut 0) | retirés en v18.0 | rien (on ne les réveille pas) |
| Mode dieu + bot conduit | `?brume=…&bot=1`, `dieu` | compte les dégâts subis sans mourir | mesure |

---

## Q1 · Les paliers se cumulent-ils ?
- **A. Cumul** : Extrême = règles de Difficile + règles propres à l'Extrême. Lecture simple (« Extrême, c'est Difficile et pire »), une seule table par palier, `herite:'difficile'` dans les données.
- **B. Indépendants** : chaque palier liste tout. Plus souple, mais chaque réglage de Difficile doit être recopié et peut diverger.

**Recommandation : A (cumul)**, avec une clé `herite`. Un réglage de l'Extrême peut écraser celui de Difficile (ex. soins encore plus bas).

## Q2 · Difficile : Masqués plus fréquents et porteurs de plus de souvenirs
Options :
- **A. Plus fréquents seulement** : `chance` 50 → 70 %. Simple, mais le Masqué n'est pas plus « menaçant », il est juste plus présent.
- **B. Fréquence + souvenirs** : `chance` 50 → 70 %, `souvenir.chance` 50 → 75 %, `souvenir.parActe` 2 → 3. La réserve du joueur revient plus souvent contre lui : c'est l'identité du jeu (« ce que tu oublies, la Brume s'en souvient »).
- **C. B + plus tôt** : `premiereSalle` 3 → 2. Mord sur les actes I à III (courts : 4 à 6 salles), au risque de rendre le début pénible.

Conséquences : B touche les actes I à III **comme une couche** (plus de Masqués dans leurs salles de combat), jamais leurs salles de gardien (le Masqué n'y vient déjà jamais). Le budget de menace du Masqué (`budgetMenace`) ne bouge pas : il est plus souvent là, pas plus fort.

**Recommandation : B**. C reste un levier d'équilibrage si les mesures montrent que Difficile est trop proche de Normal.

## Q3 · Difficile : moins de soins
Le jeu a deux familles de soins, à traiter différemment :
- **soins du monde** : fin de salle (`room`), halte, gardien vaincu (`boss`), montée de niveau, pacte, équipement, et les autres sources « offertes » (liste exacte arrêtée à l'implémentation, source par source, consignée dans la mémoire de dev) ;
- **soins de construction** : ceux que le joueur s'est donnés par ses talents (`devour` du Gouffre, `steal`, `kill`, `rupture`, `carapace`, `ames`…).

Options :
- **A. Tout ×0,5** (comme l'ancien palier « Disette ») : simple, mais punit surtout les builds fondés sur le soin (le Gouffre vit de `devour`) : moins de diversité.
- **B. Soins du monde seulement, ×0,65** ; les soins de construction intacts. Le palier change la gestion des PV entre les salles sans casser une forme.
- **C. B + prix des haltes/soins au colporteur +25 %**.

**Recommandation : B**, ×0,65 en Difficile (×0,5 en Extrême, Q8). Lisible sur l'icône de palier (cœur fêlé) au HUD. C écarté : l'or n'est pas le levier qu'on veut lire.

## Q4 · Difficile : les gardiens IV à IX, tant qu'ils sont provisoires
D3 dit : « gardiens (IV à IX) avec un temps de plus ou des attaques ajoutées ». Aujourd'hui ces places sont tenues par un **Masqué renforcé** (`provisoire.fin`, ×1,3 à ×2,05 PV).

Options :
- **A. Rien tant qu'ils sont provisoires** : la règle vit dans les données (`gardien.difficile`), elle ne s'applique qu'aux gardiens créés (champ `boss`). Le Difficile des actes IV à IX est alors plus doux qu'il ne le sera.
- **B. Un équivalent provisoire, mécanique** : le Masqué de fin d'acte reçoit **un temps de plus** : une quatrième capacité (tirée comme les autres, sous le plafond de menace + 1) qui s'éveille à 35 % de PV, avec son signal d'éveil habituel. Aucun PV en plus.
- **C. Des PV en plus** : écarté (D3 : jamais un simple mur de PV).

Conséquences de B : un champ générique (`gardien.tempsEnPlus:1`) que chaque futur gardien traduira à sa façon (action 6 : chaque gardien déclare ce qu'est « son » temps de plus) ; pour le provisoire, la traduction est la quatrième capacité. Les miniboss et le boss final provisoires de l'acte X reçoivent la même règle (ce sont aussi des places provisoires).

**Recommandation : B**, et la règle d'or protège les actes I à III (le champ n'est lu que pour les actes ≥ IV).

## Q5 · Extrême : la liste des règles mutantes
Principes : chaque mutation est **une mécanique lisible** (un signe dans le monde + une icône), a **une réponse** (ce que le joueur peut faire), ne touche **ni les PV ni les dégâts bruts**, et reprend la **grammaire de couleurs** existante (rouge = zone qui frappe, lavande = souvenirs). Elles sont distinctes des règles de salle v14 (Verre, Braseros…), qui continuent d'exister à côté.

Proposition de huit mutations (on en garde six à huit après validation) :

| id | Nom | Icône (idée) | Ce qui se passe | Signe dans le monde | Réponse |
|---|---|---|---|---|---|
| `echo` | Échos funèbres | crâne fendu | Un ennemi ordinaire tué laisse un écho qui éclate 1,2 s plus tard (petit disque). | cercle rouge pointillé qui se remplit | ne pas finir au contact, se déplacer |
| `presse` | Vagues pressées | double chevron | La vague suivante entre quand il reste 25 % de la précédente. | la porte de vague pulse avant d'ouvrir | purger vite, contrôle de foule |
| `serre` | Brume qui serre | anneau | L'arène se resserre de 15 % au fil de la salle ; se relâche à la purge. | anneau de brume au sol qui avance | rester mobile, ne pas s'acculer |
| `couronne` | Couronne | couronne | À chaque vague, un ennemi est couronné : tant qu'il vit, les autres subissent 50 % de dégâts en moins. | couronne + fils lumineux vers les protégés | cible prioritaire |
| `dernier` | Dernier souffle | flamme | Le dernier ennemi d'une vague enrage : +30 % de vitesse, charge plus vite. | aura rouge (celle de la rage du Masqué) | ne pas laisser traîner le dernier |
| `glas` | Glas lointain | cloche | Toutes les 9 s, un coup de cloche marque trois cercles près de toi (1 s de télégraphe). | cercles au sol, son de cloche | rythme d'esquive |
| `ombre` | Ombre | silhouette | Toutes les 12 s, ton ombre rejoue ta trajectoire des 2 dernières secondes ; la toucher blesse. | silhouette sombre au liseré rouge | ne pas répéter le même trajet |
| `differe` | Cœur fermé | cœur cadenassé | Les soins reçus en combat sont mis de côté et versés à la purge de la salle (rien n'est perdu, sauf si tu meurs). | jauge de soin en attente sur la barre de PV | jouer propre ; le Gouffre garde son soin, il arrive plus tard |

Compatibilités à écrire dans les données (`incompatibles`) : `serre` ✕ Brume plombée et Sol qui se dérobe (trois effets de terrain) ; `presse` ✕ `dernier` (le dernier ennemi n'est jamais seul) ; `glas` ✕ `ombre` dans les salles d'élite (deux zones automatiques sur le joueur). Jamais deux zones automatiques à la même seconde (même règle que le Masqué).

**Recommandation** : partir de ces huit, en garder **huit** si les mesures le permettent ; chacune passe le simulateur (lisibilité : télégraphe ≥ 0,8 s, pas de dégâts sans signe).

## Q6 · Extrême : combien de mutations, et quand
Options :
- **A. Un jeu fixe pour toute la descente** (tiré au départ) : appris vite, mais monotone sur 47 salles.
- **B. Par salle, tirées** : imprévisible, illisible (le joueur ne peut pas s'adapter), proche des règles de salle v14.
- **C. Par acte, tirées, en fenêtre glissante plafonnée** : à l'entrée de chaque acte, une mutation nouvelle entre, la plus ancienne sort si le plafond est atteint. Plafond : **1 aux actes I–III, 2 aux actes IV–VI, 3 aux actes VII–X**. Tirage par graine de descente (rejouable, compatible avec une future Partition du jour), jamais deux fois la même mutation de suite, incompatibilités respectées.
- **D. Par acte, fixes** (liste écrite acte par acte) : apprenable, mais toujours la même descente.

Où elles ne jouent jamais : **salles de gardien de tous les actes** (règle d'or pour I–III, et les nouveaux gardiens sont conçus seuls), **boss final** (D3 : en Extrême, le Brumeux a sa phase finale entière, c'est sa propre règle, action 5), haltes, autels, colporteur. Elles jouent dans les combats, élites, Brèches et **salles de miniboss** de l'acte X.

**Recommandation : C.** Le joueur lit l'acte comme « l'acte du Glas et des Échos », s'adapte, puis l'acte suivant change une carte.

## Q7 · Comment le joueur lit les mutations (image d'abord)
- **Entrée d'acte** : sous la bannière « Acte IV · Les Bas-Fonds » qui existe déjà, les icônes des mutations actives tombent comme des **sceaux** (la nouvelle s'imprime avec un éclat, celle qui sort se brise). ~1,2 s, **le jeu ne s'arrête pas**, aucune fenêtre, aucun texte bloquant.
- **HUD** : une rangée d'icônes à côté de l'icône de palier (12 à 16 px, même famille que les icônes des talents portés). Survol à la souris (ou maintien sur mobile) : une ligne. Écran de pause : icône + une ligne chacune.
- **Dans le monde** : chaque mutation a son signe (tableau Q5) ; c'est lui qui apprend, pas le texte.
- **Première rencontre** (une fois par mutation, jamais rejoué) : son icône clignote au HUD quand son effet se produit pour la première fois. Pas de bulle.

**Recommandation** : tout cela ; aucune bulle du Brumeux pour annoncer une mutation (ce n'est pas une contre-mesure à lui).

## Q8 · Extrême : soins, némésis, répit
**Soins** : soins du monde ×0,5 (écrase le ×0,65 de Difficile), soins de construction intacts.

**Némésis plus nombreuses** (options) :
- A. `parActe` 1 → 2 (jusqu'à deux némésis peuvent revenir dans le même acte) ;
- B. A + pas de répit après 3 morts (`repit` désactivé en Extrême) ;
- C. B + promotion aussi par un Masqué porteur qui t'a blessé à plus de 50 % sans te tuer.

**Recommandation : B.** C change la règle même de la némésis (« celui qui t'a tué ») : écarté. Le secret de la némésis tient : rien dans le wiki ni dans un texte du jeu (Q11).

**Aucun répit entre les actes** (options) :
- A. Les soins de fin de gardien (`boss`) passent à 0 en Extrême ; la relique et le pacte de l'acte restent (ce sont des choix, pas du repos).
- B. A + pas de halte dans l'acte qui suit un gardien avant sa dernière moitié.
- C. A + la première salle de l'acte enchaîne sans écran de porte (entrée immédiate).

**Recommandation : A + B.** C coupe le seul moment où le joueur lit ses nouvelles mutations : écarté.

## Q9 · Comment tout cela s'applique aux actes I à III
- **Normal** : rien.
- **Difficile** : couches sur les salles (soins du monde ×0,65) et sur les Masqués (plus fréquents, plus de souvenirs). Salles de gardien : la seule différence est le soin reçu **après** la victoire. Gardien IV–IX : seulement à partir de l'acte IV.
- **Extrême** : en plus, mutations (plafond 1 aux actes I–III), némésis, pas de soin de gardien ni de halte précoce. Les salles de gardien n'ont **aucune** mutation.
- Vérification : le simulateur compare les gardiens I–III (PV, dégâts, attaques, temps, rayon de touche) dans les trois paliers ; le banc les compare image par image (méthode du banc des gardiens redessinés).

## Q10 · Où vivent les réglages
`themist/data/descente.js`, `regles` (source unique, lue par le jeu, le simulateur et le wiki) :
```js
regles:{
 normal:{},
 difficile:{
  masque:{chance:70,souvenir:{chance:75,parActe:3}},
  soins:{monde:0.65},
  gardien:{tempsEnPlus:1,desActe:4,provisoire:{capacite:1,eveilPV:35}}},
 extreme:{herite:'difficile',
  soins:{monde:0.5,boss:0},
  nemesis:{parActe:2,repit:false},     // jamais affiché ni écrit au wiki
  repit:{halteAvant:0.5},
  brumeux:{phaseEntiere:true},          // lu à l'action 5
  mutations:{plafond:{1:1,4:2,7:3},jamais:['boss','final','halte','autel','marchand'],
   liste:{echo:{…},presse:{…},serre:{…},couronne:{…},dernier:{…},glas:{…},ombre:{…},differe:{…}},
   incompatibles:[…]}}}
```
Logique pure dans le bloc `/*des:pur*/` (`desRegles(palier)` qui résout l'héritage, `desMutations(graine, acte, avant)`), branchements dans le bloc v18. Les réglages du Masqué et de la némésis sont **lus via** `desRegles` au moment du tirage, pas recopiés dans `bestiaire.js`.

## Q11 · Ce que dit le wiki (D8 et le secret du Brumeux)
- **Dit** (section « La descente », générée par `wiki.mjs` depuis `descente.js`) : pour chaque palier, ses règles en clair et chiffrées (Masqués plus fréquents et porteurs de souvenirs, soins du monde réduits, gardiens IV–IX avec un temps de plus, aucun répit) ; le **catalogue des mutations** (icône, nom, une ligne, la réponse) et le fait qu'il y en a 1 à 3 selon l'acte, qui changent à chaque acte.
- **Tait** : la némésis en Extrême (le wiki ne parle pas de la némésis du tout, N-secret), la phase finale entière du Brumeux (D5), la graine et les poids du tirage, les incompatibilités.
- **Recommandation** : les mutations sont des règles du monde, pas une feinte du Brumeux : on les montre. Le gabarit change dans `wiki.mjs` (le commentaire « il n'y en a pas encore » disparaît), `--check` vérifie.

## Q12 · L'emblème par palier et par forme (D4)
- **A. Dans cette action** : dessin de 3 emblèmes × 4 formes, emplacement au Sanctuaire, banc visuel. Alourdit une action déjà grosse.
- **B. Plus tard** (action 7, lisibilité et récompenses) : les compteurs existent déjà (`SAVE.descente.victoires` par palier et par forme, v18.0) ; rien n'est perdu à attendre.

**Recommandation : B.** On vérifie seulement ici qu'une victoire en Difficile ou Extrême est bien comptée par forme.

## Q13 · Mesurer l'écart de difficulté entre paliers
Trois niveaux, du plus sûr au plus réel :
1. **Simulateur pur** (`outils/sim-descente.mjs`, étendu) : Normal identique au bit près ; règle d'or des gardiens I–III ; héritage ; tirage des mutations (10 000 descentes : plafond par acte, jamais de doublon consécutif, incompatibilités, répartition des huit mutations à ±5 % de l'égalité, graine rejouable) ; nombre attendu de Masqués et de porteurs par descente et par palier ; total des soins du monde par descente.
2. **Indice de pression** calculé par le simulateur, par acte : (Masqués attendus × menace + ennemis × montée) ÷ soins du monde. Cibles proposées : **Difficile ≈ +30 %, Extrême ≈ +70 %** par rapport à Normal, sans qu'aucun acte ne dépasse +100 %.
3. **Banc Chromium en mode dieu** (`_dev/bancs/banc-paliers.mjs`) : le bot conduit (`bot=1`) traverse les mêmes salles (même graine) dans les trois paliers ; on compte les **dégâts subis par minute** et le temps par salle. Le bot ne frappe pas : c'est une mesure de pression, pas de victoire ; on le dit dans la mémoire de dev.
4. **Statistiques de descente** : ajouter le palier (déjà noté), les mutations actives et les PV perdus par acte aux parties exportées, pour recaler les chiffres sur de vraies parties.

**Recommandation** : 1, 2 et 3 dans cette action, 4 ajouté au relevé (lu plus tard, action 7).

## Q14 · Découpage de l'étape 2
- **A. Une seule action** : règles de Difficile, de l'Extrême et huit mutations dessinées et codées.
- **B. Deux livraisons** : **3a** règles de Difficile et Extrême hors mutations (données, simulateur, banc, wiki) ; **3b** les mutations (tirage, sceaux, HUD, huit effets, signes dans le monde, banc).

**Recommandation : B.** 3a est surtout du réglage ; 3b est du jeu neuf, avec du dessin et de la lisibilité à vérifier visuellement.

---

## Décisions à valider (récapitulatif)
| # | Question | Recommandation |
|---|---|---|
| Q1 | Cumul | Extrême hérite de Difficile |
| Q2 | Masqués Difficile | 70 %, souvenirs 75 %, 3 par acte |
| Q3 | Soins Difficile | soins du monde ×0,65, construction intacte |
| Q4 | Gardiens IV–IX provisoires | un temps de plus = 4ᵉ capacité à 35 % PV, pas de PV |
| Q5 | Mutations | huit mutations (tableau), lisibles, sans PV ni dégâts bruts |
| Q6 | Imposition | par acte, tirées, fenêtre glissante 1 / 2 / 3, jamais en salle de gardien ni au boss final |
| Q7 | Lecture | sceaux à l'entrée d'acte, HUD, signes dans le monde, aucune fenêtre |
| Q8 | Extrême | soins ×0,5, pas de soin de gardien, pas de halte en début d'acte, némésis 2 par acte sans répit |
| Q9 | Actes I–III | couches seulement ; gardiens intacts ; Normal identique |
| Q10 | Données | `descente.js`, `regles`, logique pure `/*des:pur*/` |
| Q11 | Wiki | règles et mutations dites ; némésis et Brumeux tus |
| Q12 | Emblème D4 | plus tard (action 7) |
| Q13 | Mesure | simulateur + indice de pression + banc mode dieu ; stats de partie enrichies |
| Q14 | Découpage | 3a puis 3b |

## À corriger en passant (relevé pendant la lecture)
- Le commentaire d'en-tête du bloc v18 d'`index.html` décrit encore la v18.0 (« élite de fin », « antichambre, puis un gardien provisoire (le combat du Glas) ») : à aligner sur la v18.1. **Fait** (l'en-tête décrit la v18.1 et les règles des paliers).

## Modèle et effort
- 3a (règles hors mutations) : **Opus 5.5, moyen**.
- 3b (mutations) : **Opus 5.5, élevé** (jeu neuf, dessin des sceaux et des signes, lisibilité).
