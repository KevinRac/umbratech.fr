# La Brume · v18 « La grande descente » · cadrage de l'action 6 (gardiens des actes IV à IX, miniboss de l'acte X) · A. la méthode commune · B. le gardien de l'acte IV

Statut : **validé le 6 novembre 2026, toutes les recommandations** (rédigé le 6 novembre 2026, à la v18.13, avec Opus 5.5 ; révisé le même jour à la demande de l'auteur : la difficulté monte d'acte en acte par des habiletés neuves, pas par les PV ni les dégâts : Q9 et Q10 révisées, Q25 ajoutée). **Action 6.1b faite et validée le 6 novembre 2026** (v18.15, friction au bot acceptée telle quelle ; le Guet Sans-Nom allumé, avec les décisions de l'auteur : zones principales à 25 %, contact plus rare qui repousse ; memoire.md § 45). **Action 6.1a faite le 6 novembre 2026** (v18.14, le socle commun, gardiens éteints ; mémoire § 44 : écarts, mesures, et l'échelle de Q25 corrigée pour le Guet : deux contraintes, préavis 0,8 s, deux coups). Rien du jeu n'a changé pour l'écrire : ni `index.html`, ni `data/`, ni le wiki.

Lu pour l'écrire : `CLAUDE.md` ; `_dev/REPRISE.md` ; le cadrage de la descente (V1 à V8, et le point 6 du plan) ; le cadrage des paliers (Q4 : le « temps de plus » que chaque gardien déclare) ; `memoire.md` § 29 et § 30 (gardiens redessinés), § 31 à § 33 (descente, paliers, mutations), § 35 et § 41 à § 43 (socle du Brumeux, bot qui frappe, build de référence, PV au bot, relecture) ; `data/descente.js`, `data/gardiens.js`, `data/histoire.js` ; dans `index.html`, `createBoss`, `updateBoss`, le bloc des gardiens II et III (v13), l'Accoutumance, les blocs v17.22 (Glas), v17.27 (gardiens redessinés), v18 (descente) et v18.5 (Brumeux) ; `outils/wiki.mjs` (sections « Les gardiens » et « La descente »).

Hors champ : l'équilibrage des formes contre les boss, les emblèmes par palier et par forme (action 7) ; le décor complet des actes IV à IX hors des salles de gardien (voir Q4) ; les gestes des gardiens V à IX et des deux miniboss (une fiche courte chacun).

## Intention

Les actes IV à IX finissent aujourd'hui sur un **Masqué renforcé** (porte « garde », `data/descente.js`, `provisoire.fin`, PV ×1,3 à ×2,05). L'action 6 les remplace, un par un, par six gardiens qui ont **chacun une idée de jeu**, lisible au premier coup d'œil, et une **histoire** prise dans Valsonne ; puis elle fait de même pour les deux miniboss de l'acte X. La descente reste jouable à chaque livraison : un gardien allumé remplace sa place provisoire, un gardien éteint la rend.

Ce cadrage fait deux choses : il fixe **la méthode commune** (partie A, Q1 à Q15, et Q25 : l'échelle de difficulté d'un acte à l'autre), pour que les gardiens suivants n'aient besoin que d'une fiche courte ; et il propose **le premier gardien**, celui de l'acte IV, « Les Bas-Fonds » (partie B, Q16 à Q24).

## Principes (rappel, ils s'appliquent à chaque question)

- **Règle d'or** : rien d'autre que la salle du gardien concerné ne change, au bit et à l'image près ; **éteindre un gardien rend sa place provisoire**, à l'image près. Les gardiens des actes I à III ne changent dans aucun palier.
- **Aucune mort sans signe**, dans la grammaire de couleurs : orange `TELE.zone` (zones de gardien), rouge `FOE` (ennemis ordinaires), violet `TELE.proj` (tirs), cyan `TELE.grab` (saisie), lavande (souvenirs), ivoire (point faible). Préavis d'une zone de gardien ≥ 0,8 s. Toute nouvelle couleur à ΔE ≥ 25 (CIE76) de chacune.
- **Toujours une sortie** : une zone qui ne laisse aucune sortie atteignable à temps **saute** (règle du Brumeux).
- **Image d'abord**, aucune bulle ni fenêtre qui arrête le joueur ; **mouvements réduits** tenus (pas de secousse, pas de pulsation, chutes en fondu).
- **Chaque palier ajoute des mécaniques lisibles, jamais un mur de PV.**
- **Chaque acte ajoute des habiletés, pas seulement des PV ou des dégâts** (demande de l'auteur, 6 novembre 2026) : d'un gardien à l'autre, la difficulté monte par des capacités neuves et par leur combinaison ; les PV et les dégâts restent **neutres**, rapportés au build de référence de l'acte (Q9, Q10, Q25).
- **Secrets** : le Brumeux, la némésis et l'origine des capacités du Masqué ne sont jamais expliqués ; un gardien n'en parle pas.

---

# Partie A · La méthode commune

## Ce qui existe et ce qui piège

Trois constats tirés du code orientent toute la méthode.

1. **Le jeu ne connaît que trois gardiens, et il les reconnaît par le registre.** `RUN.act` rend le registre de l'acte (1 à 3 ; les actes IV à X jouent au registre 3). Or presque tout ce qui touche un gardien teste `RUN.act` : `createBoss` (nom `ACTS[RUN.act].boss`, PV, dégâts, rayon 62 et position du cœur au registre 3), `updateBoss` (registre 3 → `updateHeart`, l'IA du Glas), le bloc v13 (temps, copies, tutos `B13[RUN.act]`, `fogBoost`), `glasInit` (le Glas se souvient : répertoire et Reflet), le dessin (`drawEnemyBody` → `drawHeart`, `drawHeartPost`, `eyePts`, `drawCoeurPost` et ses vaisseaux), la lumière (`computeLights` : battement et teinte `glas`), la scène d'entrée et de mort (`SC27`, `fantome(act)`), le glyphe de la porte (`sigil`) et de la barre (`g27GlypheHud(…, RUN.act)`), la musique (`musicKey` : `boss3`), le décor (`themeOf` : `coeur`), le Dernier Souvenir (`reserveGlas` noté à l'entrée d'une salle de gardien du registre 3), les compteurs de la Mémoire (`bossHurt`, `bossFirst`, `R.perfect`, sous la clé du registre). **Une salle « boss » à l'acte IV serait aujourd'hui un second Glas Originel**, avec ses vaisseaux, son Reflet et son glyphe. Le Brumeux a contourné cela par une marque (`e.brx18`) et des enveloppes ; la méthode le généralise (Q3).
2. **La voie de remplacement est prévue, pas branchée.** `desPorte` (bloc `/*des:pur*/`) donne la porte `boss` quand l'acte a un champ `boss` dans `descente.js`, sinon `garde` (la place provisoire) ; `onRoomCleared` donne déjà, après une salle de gardien des actes IV à IX, la relique et la phrase `done` de l'acte (« Les Bas-Fonds se taisent »). Il manque l'interrupteur (Q2) et tout ce qui fait le gardien.
3. **Beaucoup s'hérite gratuitement d'un ennemi `boss`** : barre de vie, verrou de changement de temps (1,2 s à 15 %), Accoutumance (anneau de runes, fenêtres « à nu » par forme `BOSSX`, fils tranchés du Tisse-Destin), bonus contre un gardien, plafond du Dernier Souvenir (`fortE`), survie du Gouffre contre un fort, et la retouche v18.5 de `hitEnemy` qui lit `e.seuils18` (des seuils de temps propres) quand ils existent. Le Masqué, la némésis et les mutations ne viennent jamais dans une salle de gardien (déjà vrai).

---

## Q1 · Où vivent les données

- **A. Dans `data/gardiens.js`**, à côté des gardiens I à III (index 4 à 9). Le wiki le lit déjà. Mais ce fichier est indexé 1 à 3 partout (`pv`, `pvMul`, `dessin.actif`, `failles`, `attaques`), et le simulateur de la descente compare les gardiens I à III à partir de lui : chaque ajout frôle la règle d'or.
- **B. Dans `data/descente.js`**, sous chaque acte. Il mélangerait la structure de la descente (actes, paliers, mutations, vérifiée au bit par `sim-descente`) et le contenu des combats.
- **C. Un fichier neuf, `data/gardiens-descente.js`** (`BRUME_DATA.gardiensD`), une entrée par adversaire, clé `4` à `9` pour les gardiens, `mini1` et `mini2` pour les miniboss. Chaque entrée : `actif`, `nom`, `acte`, `histoire` (lien vers `histoire.js`), `rayon`, `pv` (Normal), `degats` (parts, Q10), `echelon` et `habiletes` (Q25), `temps` (titres, seuils, vitesse), `tempsEnPlus` (ce qu'il est, son seuil), `attaques` (nom, ligne du wiki, forme parmi les neuf, préavis, dégâts ×, réglages), `file` par temps, `faible`, `dessin` (même grammaire que `gardiens.js` : `version`, `matiere`, `lueur`, `echelle`, `glyphe`, `lecture`, `entree`, `mort`), `decor`, `bot` (mesures). Le jeu et le wiki le lisent tous les deux ; `descente.js` garde seulement le nom de l'acte.

**Recommandation : C.** `gardiens.js` et `descente.js` ne bougent pas (règle d'or des gardiens I à III prouvée au fichier près), et un gardien vit en un seul endroit.

## Q2 · L'interrupteur et le repli

- **A. Le champ `boss` écrit dans `descente.js`** : l'allumer, c'est l'écrire ; l'éteindre, l'effacer. Deux fichiers à garder d'accord (nom et contenu).
- **B. `actif` dans `gardiens-descente.js`**, gardien par gardien. Au chargement, le bloc de jeu pose `ACTD[n].boss = nom` pour chaque gardien actif (une ligne ; `desPorte` reste pur et inchangé) ; éteint, `ACTD[n].boss` reste absent, la porte redevient `garde` et le Masqué renforcé revient, **au tirage près**. Même modèle que `dessin.actif` (v17.27) et `arene.actif` (v18.4).

**Recommandation : B.** Un booléen par gardien, et le banc prouve les deux sens : allumé, seule sa salle diffère ; éteint, tout est identique à l'`index.html` d'avant (Q14, section G).

## Q3 · Le type de salle et l'aiguillage

- **A. Une salle d'élite, porte `garde`, comme le Brumeux** (salle `elite`, `room.gardeK`). Elle évite le code des salles « boss » ; mais un gardien y perd la bannière, le soin de fin de gardien, le temps de gardien, et il faut garder un à un ce que l'élite donne (butin du champion, défi D6, pari P6, fragment d'élite, relique « Le champion tombe », Masqué imposé) : la relecture 5h en a trouvé quatre oubliés pour le Brumeux.
- **B. Une vraie salle `boss`, avec un aiguillage.** La salle et l'ennemi portent une marque (`room.g18`, `e.g18` : l'entrée de `gardiens-descente.js`) ; un bloc de jeu daté en fin d'`index.html` (« v18.14 · Les gardiens de la descente », enveloppes les plus extérieures) fait passer **chacun des points d'entrée du constat 1** par le gardien marqué, et seulement lui. La liste à envelopper, arrêtée ici et vérifiée par le simulateur (motifs lus dans `index.html`) :

| Point d'entrée | Aujourd'hui au registre 3 | Avec un gardien marqué |
|---|---|---|
| `createBoss` | Glas : nom, PV, dégâts, r 62, cœur | ses données (Q1), position d'entrée |
| `createBoss` enveloppé par v17.22 (`glasInit`) | répertoire de souvenirs, Reflet | rien (Q8) |
| `updateBoss`, bloc v13 (`b13Init`, `b13Phase`, `copyStep`) | IA du Glas, copies, tutos du Cœur, `fogBoost` | son moteur (Q5), ses temps (Q6) |
| `drawEnemyBody`, `drawEnemyPost`, `drawBossPost`, `drawHeartPost`, `eyePts` | cloche-cœur du Glas | son dessin (Q7) |
| `drawCoeurPost` | vaisseaux du Cœur au sol | rien dans sa salle |
| `computeLights` | battement, teinte `glas` | sa lumière, sans battement |
| `SC27` (`fantome(act)`, `debut`) | entrée et mort du Glas | les siennes |
| `sigil` (porte `boss`), `g27GlypheHud` | glyphe du Glas | son glyphe |
| `themeOf`, `renderFloor` | sol du Cœur | Q4 |
| `musicKey` | `boss3` | `boss3` gardé (Q4) |
| Dernier Souvenir (`reserveGlas`) | noté à l'entrée | non noté |
| Mémoire : `bossHurt`, `bossFirst`, `R.perfect` | clé du registre (3) | clé de l'acte (`ACTE()`) |
| mort du joueur (`RUN.mem.lastSrc`, `V7FOE1`) | « le Glas Originel » | son nom |

**Recommandation : B.** Un gardien est un boss : bannière, barre, soin de fin (Q11), relique et phrase de l'acte, fenêtres de l'Accoutumance, temps de gardien, tout cela vient de la salle `boss` ; l'aiguillage est explicite, listé, et chaque ligne est éprouvée par le banc (« aucune trace du Glas » : ni vaisseaux, ni Reflet, ni glyphe, ni `reserveGlas`, ni tuto du Cœur, section A). Les miniboss, eux, restent dans leur salle d'élite (porte `mini`) : les mutations de l'Extrême y jouent par décision v18.3 ; ils auront la même marque `e.g18`, pas `room.g18`.

## Q4 · Le registre de décor des actes IV à IX

Aujourd'hui, les actes IV à X se jouent au décor du Cœur (sol, brume, musique, ennemis du registre 3).

- **A. Rien ne change** : le gardien des Bas-Fonds se bat sur la chair du Cœur. Incohérent, et chaque gardien serait dessiné contre un sol qui n'est pas le sien (la lisibilité se règle contre un sol).
- **B. La salle du gardien seule reçoit le décor de son acte** : un thème neuf (`THEMES` : teinte, accent, poussières, brume) et un peintre de sol propre, déclarés dans `gardiens-descente.js` (`decor`), peints une fois à l'entrée de sa salle comme tout sol (`room.canvas`). Le reste de l'acte garde le Cœur ; la musique reste celle du registre (`boss3`) ; les ennemis invoqués restent ceux du registre 3.
- **C. Tout l'acte prend son décor maintenant** (salles, brume, musique). Cela change toutes les salles de l'acte (règle d'or de l'action rompue), touche les fragments de décor que le Brumeux convoque en phase I (« décors par registre d'acte »), et demande des ennemis et une musique par acte : c'est un chantier en soi.

**Recommandation : B**, avec le thème écrit dans les données pour qu'une action ultérieure (« le décor des actes IV à IX », à cadrer après l'action 6 ou dans l'action 7) l'étende aux autres salles d'un seul geste. Le gardien est dessiné et ses couleurs mesurées contre **son** sol.

## Q5 · Le moteur des attaques

- **A. Du code propre à chaque gardien**, comme les gardiens I à III (états, minuteurs, `hurtPlayer` direct, `fx`). Libre, mais rien de vérifiable hors navigateur, et « toujours une sortie » à refaire six fois.
- **B. Le moteur du Brumeux lui-même** (son état `X`, sa partition, sa lecture). Trop lié à lui : lecture du joueur, budget, constructions, sauvegarde.
- **C. Un moteur commun aux gardiens, en logique pure** (bloc `/*gar:pur*/`, simulateur `outils/sim-gardiens.mjs`), qui **réutilise la géométrie pure du Brumeux** sans la modifier (`brxDans` pour les formes disque, couloir, anneau à brèche, case, cône, losange ; `brxSeg` ; `brxSortie`, `brxPlacer` ; `brxGrille`, `brxConnexe`) : une **file par temps** (les clés d'attaque, mélangées à chaque tour, jamais deux fois la même de suite, comme la file du Héraut et du Glas), un **geste** = une suite d'étapes (zones, tirs, invocations, obstacles), placé seulement s'il laisse une sortie, sinon il saute (compté) ; une seule zone de gardien à la fois sauf les gestes en deux coups déclarés (comme la Toile du Brumeux) ; pendant une zone du gardien, ses invoqués n'ouvrent pas la leur (règle du Glas, `glasZone`) ; un geste au contact (cône, disque centré sur lui) ne part que si tu es à 0,8 × sa portée ; il s'approche 2 s au plus, puis renonce (règle du Masqué et de la Révérence).
  - **Ajout nécessaire** : une sortie **au détour d'un obstacle** (la sortie du Brumeux ne cherche qu'en ligne droite). Une fonction pure `garSortieGrille` (distance sur la grille de `FF` contournant les obstacles, à ta vitesse, dans le temps du préavis moins le réflexe) ; le premier gardien en a besoin (Q18).
  - **Les zones se dessinent** par `drawZone` (orange `TELE.zone`), les tirs par le chemin des tirs de gardien (violet).

**Recommandation : C.** Le moteur sert les six gardiens et les deux miniboss ; le bot qui frappe lit les mêmes zones (Q9) ; le journal des coups (Q14, section C) en juge chaque coup.

## Q6 · Les temps et le « temps de plus »

Les gardiens I à III ont trois temps (seuils 0,66 / 0,33, `bossPhase`), un verrou de 1,2 s au changement, et un titre par temps (`failles` : l1, l3). Le cadrage des paliers (Q4) a posé que **chaque gardien des actes IV à IX déclare ce qu'est son temps de plus** en Difficile et en Extrême (`regles.difficile.gardien`, `desTempsEnPlus`, jamais sous l'acte IV) ; tant qu'il est provisoire, c'est la signature redoublée du Masqué.

- **A. Trois temps, et en Difficile une attaque de plus ajoutée à la file des temps 2 et 3.** Simple, mais peu visible : une attaque de plus se perd dans le mélange.
- **B. Trois temps en Normal ; en Difficile et en Extrême, un quatrième temps**, sous un seuil propre au gardien (par défaut 0,18), avec **une mécanique neuve** qui le signe (pas de PV en plus, pas d'accélération seule). Seuils Normal 0,66 / 0,33 ; Difficile et Extrême 0,66 / 0,33 / 0,18 : les trois premiers temps restent ceux du Normal. Les seuils passent par `e.seuils18` (la retouche v18.5 de `hitEnemy` les lit déjà ; ses gardes de seuil aussi). Le changement de temps a son signal (verrou, son `phase`, titre du temps dans le HUD), et le quatrième, en plus, un **signe visible sur le gardien** (Q7).
- **C. Un temps de plus = le troisième temps qui commence plus tôt.** Lisible, mais ce n'est pas une mécanique neuve.

**Recommandation : B**, avec le nombre de temps en Normal fixé par l'échelle (Q25 : trois aux actes IV à VI, quatre aux actes VII à IX ; toujours un de plus en Difficile et en Extrême). Durées visées : chaque temps assez long pour être appris (Q9). L'Extrême n'ajoute rien de plus au combat d'un gardien (il hérite de Difficile ; ses propres règles jouent autour : soins nuls après un gardien, aucune mutation dans sa salle).

## Q7 · Le dessin (grammaire v17.27)

Chaque gardien suit la grammaire des gardiens redessinés, sans exception :

- **Corps** vectoriel au canevas, cuit hors écran par temps (cache `G27`, une image par temps, à la densité de l'écran) ; corps plein dans **1,15 × r** ; ce qui dépasse (traînes, chaînes, brume, débris) sous **35 %** d'opacité ; hauteur visée 3,5 × r.
- **Couleurs** : `matiere` et `lueur` à **ΔE ≥ 25** de l'orange des zones, du violet des tirs, du cyan de saisie, de la lavande, de l'ivoire du point faible, **et lisibles contre le sol de sa salle** (contraste corps / sol ≥ 4,5 au repos, mesuré temps par temps ; le Glas, à 3,0, est la limite qu'on ne veut plus).
- **Point faible** : un élément du corps, nommé (`faible`), entouré de l'anneau ivoire commun `G27.anneau` quand il est à nu (`G27.aNu` : sonné `vuln` ou fenêtre `rawT`), pas pendant un fondu ; aucune nouvelle couleur de point faible.
- **Chaque temps se voit sur le corps** (comme la corde cassée, le voile tombé, les plaques) ; le quatrième temps de Difficile a son propre signe.
- **Glyphe** 24 × 24 (`dessin.glyphe`), XML valide et autonome, sans identifiant ni filtre, lisible à 16 px ; posé sur la porte `boss`, la barre de vie et la carte du wiki.
- **Portraits** `img/gardiens/gardien-<n>-t<temps>-v<version>.webp` (480 × 600, n = 4 à 9, trois temps), capturés hors salle par un aperçu (`__gardiens18.<id>.apercu`) ; `wiki.mjs --check` les exige pour un gardien actif ; un changement visible du dessin passe `version` à n + 1.
- **Entrée** pendant la bannière (2,2 s, fantôme jamais dans `enemies`), **mort** en 1,5 s sans rien retarder (`SC27`), mouvements réduits : fondu seul.
- **Mouvements réduits** : rien ne balance, ne pulse ni ne clignote ; ce qui flotte est posé figé ; aucune secousse.
- **Tout ce qui se dessine à sa position suit `e.fade`** (yeux et halos compris) ; un nouveau halo ou trait reste à ΔE ≥ 25 et suit le fondu.
- **Coût** : ≤ 1 ms par image de plus que la place provisoire, salle chargée (mesure appariée dans une seule page, comme `banc-brumeux` I-E).

**Recommandation : cette grammaire, telle quelle**, plus le contraste contre son sol (Q4) et le signe du quatrième temps (Q6).

## Q8 · L'Accoutumance, le Dernier Souvenir, la Mémoire contre un gardien neuf

- **Accoutumance** : héritée telle quelle (type `boss`) : anneau de runes, résistance de 12 % par niveau, fenêtre « à nu » par forme (`BOSSX`, 3 s, +30 %), fils tranchés du Tisse-Destin. L'anneau ivoire entoure **son** point faible pendant la fenêtre. Rien à écrire, tout à vérifier (Q14, section B).
- **Dernier Souvenir** : hérité tel quel contre un fort (`fortE`) : valeurs `vf`, plafond par le crochet `o.plaf` de `hitEnemy` après le seuil de temps, cadence de Fureur payée sur le plafond, coups `o.ds` hors de l'Accoutumance. Ses obstacles éventuels (Q18) ne sont **pas** des ennemis : aucun effet du Dernier Souvenir ne les vise.
- **Mémoire et copie** :
  - **A. Chaque gardien neuf se souvient aussi** (réserve, comme le Glas). Cela doublerait le Glas, la Couture et l'Emprunt du Brumeux.
  - **B. Aucun gardien neuf ne lit ta réserve ni ne te copie** : la copie reste l'idée de la Mère-Brume (reprise aux temps 2 des gardiens II et III), la réserve celle du Masqué, du Glas, de la némésis et du Brumeux. Un gardien neuf peut, s'il le veut, **lire ta forme** (sa fiche le dira), jamais tes souvenirs.

**Recommandation : héritage tel quel pour l'Accoutumance et le Dernier Souvenir ; B pour la Mémoire.** Le bloc v17.22 (`glasInit`) n'est jamais appelé pour un gardien marqué.

## Q9 · Les PV, mesurés au bot (révisée le 6 novembre 2026 : PV neutres)

Méthode de l'action 5g-1 (§ 41), étendue aux actes IV à IX :

- **Build de référence de l'acte** (`gardiens-descente.js`, `bot.reference`) : niveau = la médiane du niveau atteint **à l'entrée de la salle du gardien** par une descente purgée (outil `mesure-brumeux.mjs niveau` généralisé : `mesure-gardiens.mjs niveau <acte>`) ; talents : **la règle du Brumeux tronquée** (sous-classe principale dans l'ordre de l'arbre, puis la branche voisine, rangs donnés dans cet ordre selon les points du niveau ; à l'acte X, la règle redonne exactement la liste de `brumeux.js`, le simulateur le vérifie) ; un objet commun par emplacement ; ni gravure, ni relique, ni pacte.
- **Mannequin** (essai `mannequin=1`) : le gardien garde sa présence, ne lance rien, sans seuil : le DPS de chaque forme contre lui.
- **Bot qui frappe** (`bot=2`) : aujourd'hui dans le bloc du Brumeux (`pilote2`, lit `X`). **Écart proposé** : l'extraire en un pilote commun qui lit une liste de zones et d'obstacles fournie par un crochet (le Brumeux et les gardiens), sans changer son jeu contre le Brumeux (`banc-brumeux` F et N le prouvent) ; une seule retouche prévue pour les gardiens : passer par une ouverture quand sa sortie est derrière un obstacle (Q5).
- **Combats** (`?gardien=<acte>&ref=1&bot=2&dieu=1`) : quatre formes × cinq graines en Normal, puis validation dans les trois paliers. **Mêmes PV pour les quatre formes et les trois paliers.** Pas d'enrage, pas de chronomètre.
- **Ce qui fixe les PV** :
  - **A. Une durée cible qui monte avec l'acte** (80 s à l'acte IV, +8 s par acte), PV calés dessus. La difficulté monterait surtout par la durée, donc par les PV : **écarté** (demande de l'auteur).
  - **B. PV neutres : un temps de frappe constant.** PV = DPS médian des quatre formes contre le mannequin (au build de référence de l'acte) × **50 s**, le même temps de frappe pour les six gardiens, arrondi à 100. Un gardien de l'acte IX n'est donc pas « plus épais » qu'un gardien de l'acte IV au regard de ta puissance du moment. Ce qui allonge et durcit le combat, c'est sa **friction** (durée réelle ÷ 50 s) : esquiver, se placer, franchir, couper, mémoriser, c'est-à-dire **ses habiletés** (Q25).
  - **La friction doit monter d'un acte à l'autre** (médiane des quatre formes, Normal) : visée ≈ 1,5 à l'acte IV (≈ 75 s), ≈ 2,3 à l'acte IX (≈ 115 s), jamais moins que celle du gardien précédent. Un gardien sous sa fourchette se corrige **par sa partition** (enchaînements, contraintes à la fois, préavis jusqu'au plancher de 0,8 s), **jamais par ses PV**.
  - Avant de calibrer, le même protocole mesure **une fois** les gardiens I à III (Mère-Brume, Héraut, Glas), au build de référence de leur acte : leur friction situe l'instrument et le bas de l'échelle (mesure seulement, rien ne change pour eux).
- **Règle des formes hors des cibles** : celle de 5g (friction = durée × DPS au mannequin ÷ PV ; friction dans la bande × 0,75 à × 1,33 → l'écart vient du kit, accepté et noté pour l'action 7 ; hors de la bande → une seule passe de correction **pour toutes les formes**, puis on présente le cas à l'auteur). Interdits : PV, dégâts ou règle lus sur la forme.

**Recommandation : B, et toute la méthode ci-dessus.** Six gardiens de 75 à 115 s font environ 10 min sur les 40 visées de la descente : elle reste rapide (le tryhard repose dessus), et chaque seconde de plus vient d'une mécanique de plus.

## Q10 · Les dégâts (révisée le 6 novembre 2026 : dégâts neutres)

- **A. Au jugé, par gardien.**
- **B. La montée** : 26 (le Glas) × la montée des dégâts de la salle du gardien ÷ celle de la salle du Glas (≈ 27 à l'acte IV). C'est encore du scaling, qui grossit d'acte en acte.
- **C. Une part des PV du build de référence de l'acte**, la même d'un acte à l'autre : chaque attaque déclare la part qu'elle retire (zone principale ≈ 15 à 18 %, au plus 30 % pour un coup, 12 % pour un tir isolé). Un coup du gardien de l'acte IX pèse ce que pèse un coup du gardien de l'acte IV ; la difficulté vient de ce qu'il en enchaîne et de ce qu'il faut savoir faire pour les éviter.

**Recommandation : C.** Le simulateur recalcule les parts sur le build de chaque acte et refuse un coup au-delà de 30 %.

## Q11 · Le soin après la victoire

Un gardien vaincu dans une salle `boss` donne aujourd'hui le soin complet (`heal(…, 'boss')`), réduit par les paliers (×0,65 en Difficile, rien en Extrême : la règle v18.2 le repère déjà dans `heal`). La place provisoire (une élite) ne soigne pas.

- **A. Comme les gardiens I à III** : soin complet, modulé par les paliers, sans rien écrire.
- **B. Pas de soin** (comme la place provisoire).

**Recommandation : A.** Un gardien est un palier de la descente ; le palier Extrême garde « aucun répit ». À noter au journal de la livraison : en Normal, la descente devient un peu plus douce après chaque acte allumé (c'est voulu).

## Q12 · Ce que le wiki en dit

- **Dit** (section « Les gardiens », générée depuis `gardiens-descente.js`, seulement pour un gardien actif) : une carte (numéro de l'acte, portrait du premier temps et du troisième au survol, glyphe, nom, acte, PV en Normal, phrase `done`) ; une sous-section « <Nom> · Acte <n> » : les titres de ses temps, ses attaques (carte : nom, quand, une ligne qui dit le signe et la réponse), son point faible (repris dans la phrase de l'anneau ivoire), sa lecture à l'œil (`dessin.lecture`, entrée, mort), et **son temps de plus** (« En Difficile et en Extrême, un quatrième temps : … »). La section « La descente » le nomme et le lie (`#gardiens`) à la place de « Gardien à venir ». Le chapeau de la section dit « Les actes I à IX… » au lieu de « I à III » dès le premier gardien actif.
- **Tait** : le Brumeux, la némésis, ce que le Masqué tire de tes souvenirs (déjà tus) ; aucun chiffre interne de moteur (budget, réflexe).
- Éteint, le wiki redevient exactement celui d'avant (le simulateur compare la section).

**Recommandation : ainsi.** Une ligne de journal par gardien allumé (`versions.js`), sans mécanique cachée.

## Q13 · L'histoire

Chaque gardien a **une histoire prise dans `data/histoire.js`** (Valsonne, le Mal d'oubli, Mémoire, les fragments de la Carte du Glas) sans contredire aucun texte existant, ni révéler un secret (le Brumeux, l'Archiviste, Corbin, Tobiah restent ce qu'ils sont).

- **A. Rien d'écrit** : l'histoire ne vit que dans le dessin.
- **B. Une entrée de codex par gardien** (Archiviste, `histoire.js`, `codex`), débloquée en le vainquant (comme « La Mère-Brume », « Le Héraut Noyé »), et une phrase d'entrée de la bannière. Les chapitres de la Carte du Glas (I à V) ne changent pas.

**Recommandation : B.** La condition de déblocage vit dans `index.html` (rattachée par id, comme les autres) ; une descente d'essai ne débloque rien.

## Q14 · Le banc type et le simulateur

**Simulateur** `outils/sim-gardiens.mjs` (Node seul), une section par gardien plus le commun : données (formes parmi les neuf, préavis ≥ 0,8 s, ΔE, glyphe XML valide et lisible, parts de dégâts Q10) ; **échelle** (Q25 : chaque gardien apporte au moins une habileté absente de tous les gardiens d'avant, I à III compris ; aucun cran de l'échelon ne baisse, au moins un monte ; ses contraintes à la fois ne dépassent pas son échelon) ; files (jamais deux fois de suite, chaque attaque jouable à son temps) ; seuils (Normal 0,66 / 0,33 ; quatrième temps seulement en Difficile et en Extrême, jamais sous l'acte IV, même avec une règle mal écrite) ; **10 000 combats abstraits** (chaque zone rendue a une sortie atteinte à temps, en ligne droite ou au détour ; aucune zone sans sortie) ; obstacles (connexité ≥ 85 %, jamais sur toi) ; interrupteur (éteint : `ACTD[n].boss` absent, `desPorte` rend `garde`) ; branchements (chaque ligne de l'aiguillage Q3 lue dans `index.html`). Contre-épreuves à chaque fois : une erreur introduite exprès est attrapée.

**Banc Chromium** `_dev/bancs/banc-gardiens18.mjs <port> [sections] [dossier]`, sections par gardien :

| Section | Ce qu'elle prouve |
|---|---|
| A · aiguillage | nom, PV, dégâts, rayon ; **aucune trace du Glas** (vaisseaux, Reflet, glyphe, `reserveGlas`, tuto du Cœur, lumière qui bat) ; porte et barre à son glyphe ; temps de gardien et Mémoire sous la clé de l'acte ; relique et phrase `done` ; soin selon le palier |
| B · temps | seuils et verrou ; quatrième temps en Difficile et en Extrême seulement ; Accoutumance (fenêtre, anneau ivoire sur le point faible) ; Dernier Souvenir sous plafond |
| C · aucun coup sans signe | **journal des coups du gardien** (nouveau, hors arène, dans le bloc des gardiens : chaque coup reçu rattaché à sa source et à l'âge de son signe) ; quatre formes × trois paliers au bot : 0 coup sans signe, 0 zone sans sortie |
| D · attaques | chacune jouée seule (essai `attaque=`), sortie atteinte, sautes comptées, règles propres (obstacles, tirs, invocations) |
| E · PV au bot | niveau, mannequin, combats (Q9) ; durées par temps ; **friction médiane au-dessus de celle du gardien précédent** (Q25) |
| F · dessin | planche (trois temps, quatrième, six états : repos, attaque, à nu, sonné, fondu, mort) ; corps plein ≤ 1,15 × r ; ΔE relevés ; contraste contre son sol ; mouvements réduits (12 instants, rien ne bouge) ; coût ≤ 1 ms |
| G · règle d'or | méthode de `banc-arene` G (copie instrumentée, graine, horloge à la main, polices chargées, 180 images par salle, 19 salles, trois paliers) contre l'`index.html` d'avant : allumé, **seule sa salle** diffère ; éteint, **aucune** image ne diffère |
| H · repli et wiki | éteint : porte `garde`, Masqué renforcé, wiki d'avant ; allumé : `wiki.mjs --check`, portraits |

Captures relues à l'œil (planche, porte, barre, wiki). Régression complète à chaque livraison (méthode du § 3 de `REPRISE.md`), `banc-gardiens-final` seul à la fin.

**Recommandation : ainsi**, un seul banc qui grandit d'un gardien à l'autre (sections A à H paramétrées par l'acte), plutôt que six bancs.

## Q25 · L'échelle des gardiens : des habiletés neuves d'un acte à l'autre (ajoutée le 6 novembre 2026)

Demande de l'auteur : plus on descend, plus les boss doivent être difficiles, **et pas seulement par les PV et les dégâts : par des habiletés nouvelles**. Q9 et Q10 rendent les PV et les dégâts neutres ; il faut donc que la montée vienne d'ailleurs, et qu'elle se vérifie.

- **A. Libre** : chaque fiche choisit, l'auteur juge à l'œil. Risque : six gardiens différents mais de même niveau, ou un gardien de l'acte VIII plus simple que celui de l'acte V.
- **B. Une échelle écrite dans les données et vérifiée** : chaque gardien déclare son **échelon** (les crans ci-dessous) et les **habiletés** qu'il demande au joueur. Deux règles : (1) chaque gardien apporte **au moins une habileté qu'aucun gardien d'avant ne demandait** (I à III compris) ; (2) **aucun cran ne baisse** d'un acte au suivant, et **au moins un monte**. Le simulateur vérifie les deux ; le banc E vérifie que la friction mesurée monte (Q9).

**Les crans de l'échelon** (aucun ne touche aux PV ni aux dégâts) :
- **Temps en Normal** : trois, puis quatre (et toujours un de plus en Difficile et en Extrême, Q6).
- **Contraintes à la fois** : ce que le gardien fait peser en même temps (une zone, un obstacle qui dure, une cible à couper, un courant, un écho…).
- **Enchaînements** : le nombre de coups d'un geste composé (deux coups : la Rafle ; trois coups ; quatre).
- **Préavis** : il descend vers le plancher de 0,8 s, jamais en dessous (aucune mort sans signe).
- **Ce qui l'entoure** : invoqués simples, puis invoqués qui ont un rôle (ils protègent, ils relaient ses zones), puis un terrain qui agit.

**L'échelle proposée** (l'habileté neuve est une **direction** : la fiche de chaque gardien la confirme ou la remplace, dans le respect des deux règles) :

| Acte | Temps (Normal) | Contraintes à la fois | Enchaînements | Préavis | Habileté neuve |
|---|---|---|---|---|---|
| III · Glas (repère) | 3 | 1 à 2 | — | 0,8 à 1,1 s | traverser au bon moment, lire des motifs de tirs |
| **IV · Bas-Fonds** | 3 | 1 (+ des obstacles brefs) | 2 coups | 1,0 à 1,2 s | **l'espace** : lire et franchir des obstacles, être au bon endroit avant que la porte se ferme (le Guet) |
| V · Eaux Mortes | 3 | 2 | 2 coups | 0,9 à 1,1 s | **le déplacement subi** : courants et sol qui t'emportent, à compenser pendant l'esquive |
| VI · Nef Muette | 3 | 2 | 3 coups | 0,9 à 1,0 s | **la mémoire d'une séquence** : il montre une suite de gestes en entier, puis la rejoue plus vite (toujours télégraphiée, au préavis plancher) |
| VII · Racines du Cœur | 4 | 2 | 3 coups | 0,8 à 1,0 s | **la priorité** : des cibles à couper (racines qui le protègent ou le nourrissent) pendant qu'il attaque |
| VIII · Puits des Échos | 4 | 3 | 3 coups | 0,8 à 1,0 s | **la double lecture** : chaque geste revient en écho, décalé, d'une autre origine |
| IX · Cloches Englouties | 4 | 3 | 4 coups | 0,8 s | **la synthèse et le rythme** : deux habiletés des gardiens IV à VIII jouées ensemble, sur une cadence à suivre |

- **Chaque gardien garde son idée propre** : l'échelle dit ce qu'il doit ajouter, pas ce qu'il est. À partir de l'acte VI, un gardien peut **reprendre une habileté d'un gardien d'avant**, mais seulement combinée à la sienne (jamais seule).
- **Le temps de plus de Difficile** est, lui aussi, une habileté (ou une contrainte de plus) propre au gardien, pas une hausse de chiffres.
- **Les deux miniboss de l'acte X** se placent au-dessus du gardien de l'acte IX sur au moins un cran (cadrage 6.7).
- **Le Guet est le premier barreau** : une contrainte à la fois (plus ses herses), deux coups au plus (Croix, Rafle), les préavis les plus longs de l'échelle ; son Couvre-feu de Difficile ajoute la seconde contrainte (des obstacles qui restent).

**Recommandation : B, avec cette échelle.** Elle rend la demande vérifiable : un gardien plus profond qui ne demande rien de neuf, ou qui se joue plus vite que le précédent, échoue au simulateur ou au banc.

## Q15 · Le découpage, l'ordre, le modèle et l'effort

- **Ordre** : dans l'ordre des actes (IV, puis V… IX), puis les deux miniboss : la descente se remplit du haut vers le bas et chaque livraison est jouable.
- **Le premier gardien porte la méthode** : comme le Brumeux (5a puis 5b), on sépare le socle et le gardien.

| Action | Contenu | Modèle, effort |
|---|---|---|
| **6.1a** | **Socle commun** (v18.14, gardien **éteint**) : `gardiens-descente.js` (entrée de l'acte IV, `actif:false`), interrupteur, aiguillage complet (Q3), bloc `/*gar:pur*/` et `sim-gardiens`, sortie au détour (`garSortieGrille`), pilote commun du bot (extrait sans changer le Brumeux), build de référence par acte et mannequin, journal des coups hors arène, thème et sol de la salle (Q4), essai `?gardien=<acte>[&temps=n][&attaque=…][&palier=…][&ref=1][&bot=2][&mannequin=1][&dieu=1][&classe=…]` (dans `ESSAI18` et `ESSAI_URL`), console `__gardiens18`, banc A, B, C, G, H sur un **gardien d'essai** (silhouette simple, deux gestes connus), mesure des gardiens I à III (Q9) | **Opus 5.5, élevé** |
| **6.1b** | **Le gardien de l'acte IV** (v18.15, **allumé**) : fiche B validée, attaques, temps, temps de plus, obstacles, dessin, entrée et mort, glyphe, portraits, PV au bot, wiki, codex, journal ; banc D, E, F et toutes les sections | **Opus 5.5, élevé** |
| **6.1c** | Relecture indépendante (un agent qui n'a écrit ni 6.1a ni 6.1b), corrections | **Opus 5.5, élevé** (elle valide la méthode) |
| 6.2 à 6.6 | Gardiens V à IX, un par un : **fiche courte** (identité, histoire, silhouette, **son échelon et son habileté neuve (Q25)**, temps, attaques, temps de plus, point faible, distinctions), puis implémentation, puis relecture courte | fiche : **Opus 5.5, moyen** ; implémentation : **Sonnet 5.5, élevé** (dessin et combat dans un fichier de 15 000 lignes) ; relecture : **Opus 5.5, moyen** |
| 6.7 | **Cadrage des miniboss** (salle d'élite et mutations, deux temps, temps de plus, durée 45–60 s, ce qui les distingue des gardiens) et fiche du premier | **Opus 5.5, élevé** |
| 6.8 | Premier miniboss | **Opus 5.5, élevé** |
| 6.9 | Second miniboss, relecture des deux | **Sonnet 5.5, élevé** ; relecture **Opus 5.5, moyen** |

**Recommandation : ce découpage.** Étape immédiate : la validation de ce cadrage par l'auteur, puis **6.1a dans une autre conversation, Opus 5.5, élevé**.

---

# Partie B · Le gardien de l'acte IV, « Les Bas-Fonds »

## Ce que dit l'histoire

`histoire.js` donne trois fils qui mènent aux Bas-Fonds :

- **La Porte Basse** (fragment f12, chapitre I) : « Le registre des gardes de la Porte Basse s'interrompt au milieu d'une phrase : “Aujourd'hui, ma fille m'a demandé qui j'étais.” » C'est **le premier oublié** de Valsonne qu'on lit dans le jeu : un garde que sa propre fille n'a pas reconnu.
- **Le Marais d'Étain** (f11) : « C'est là qu'on jeta d'abord ceux que plus personne ne reconnaissait. » Les oubliés sont jetés hors les murs, au plus bas.
- **Le Mal d'oubli** (chapitre I, f14 « Le Puits-Murmure ») : les noms, puis les visages.

En face, les trois premiers gardiens : **Mahaut**, la mère qui a refusé d'oublier son enfant ; **Élias**, le frère qui a sonné pour que personne n'oublie ; **la cloche**, qui ne sait plus se taire. Il manque **celui qu'on a oublié**.

## Q16 · L'identité

- **A. Le Guet Sans-Nom** (recommandé) : le garde de la Porte Basse. Sa fille lui a demandé qui il était ; il a fini son registre au milieu d'une phrase, et il est descendu garder la dernière porte de la ville, aux Bas-Fonds, là où l'eau du Marais d'Étain emporte ceux qu'on ne reconnaît plus. Il garde encore, mais il ne sait plus qui il attend ; son visage s'est usé comme une pièce trop frottée ; personne ne se souvient de son nom, et son registre l'a raturé. **Il te demande « Qui va là ? »**, comme sa fille le lui a demandé. Son idée de jeu est **la porte** : il ferme, il contrôle, il rouvre.
- **B. La Fosse aux Sans-Nom** : un corps fait des oubliés jetés au marais, plusieurs corps qui se séparent et se rejoignent. Fort, mais plusieurs entités compliquent la barre, l'Accoutumance, le point faible et le dessin ; mieux pour un miniboss ou un gardien plus profond.
- **C. Le Receleur du bronze** (f21, f52) : celui qui racheta le bronze des familles. Ce fil mène à Tobiah, un secret de la Carte du Glas (chapitre V) : écarté.

**Recommandation : A, « Le Guet Sans-Nom »** (autres noms possibles : « Le Portier oublié », « L'Homme de la Porte Basse »). Phrase de bannière : « Qui va là ? ». Entrée de codex « Le Guet Sans-Nom » (vaincre le gardien des Bas-Fonds) : « Le registre de la Porte Basse s'arrêtait au milieu d'une phrase. Celui qui l'écrivait est descendu la finir. Il garde encore la dernière porte, mais il ne sait plus qui il attend. » (texte à relire par l'auteur ; il ne révèle rien de la Carte du Glas).

## Q17 · L'idée de jeu : la herse

Les trois premiers gardiens posent des questions de **temps** : quand traverser l'anneau (Héraut, Glas), quand sortir du cercle, que copie-t-elle (Mère-Brume). Le Guet pose une question d'**espace** : **où seras-tu quand la porte se fermera ?**

- **A. La herse** (recommandé) : il porte sur son dos la herse de la Porte Basse. Il en fait tomber les barreaux à travers la salle : une ligne orange annonce la chute, **un guichet** reste ouvert dans chaque herse ; tombée, la herse devient un **obstacle de quelques secondes** qui **arrête les corps** (toi, ses invoqués) **mais pas les tirs** (les tiens comme les leurs passent entre les barreaux). La salle est découpée en sections ; puis il **contrôle** une section : celle où tu te tiens s'emplit d'orange, et tu dois avoir passé un guichet avant qu'elle se ferme. Puis il relève la herse (et se découvre).
- **B. Le registre** : il note où tu passes, et ce qu'il a noté frappe plus tard. Trop proche de la mutation « Ombre » (ta trace qui blesse) et de la lecture du Brumeux.
- **C. Le contrôle d'identité** : il « appelle » une forme et punit qui ne lui répond pas. Lisible seulement avec du texte : contraire à « image d'abord ».

**Recommandation : A.** Ce qui le distingue des autres murs du jeu : la marée du Héraut **traverse** la salle (une brèche à prendre au bon instant) ; ses herses **restent** et redessinent la salle quelques secondes ; les constructions du Brumeux sont lues sur ton style, durent tout le combat et cassent ; celles du Guet sont toujours les mêmes, brèves, et se relèvent seules. « Les corps, pas les tirs » est la règle déjà lue au Brumeux pour les fosses.

## Q18 · Ses attaques (les neuf formes connues)

Chiffres de fiche (préavis, dégâts ×, tailles) : l'implémentation les ajuste au bot sans changer les formes ni les signes.

| Attaque | Forme | Ce qu'on voit, ce qui frappe | Temps |
|---|---|---|---|
| **Herse** | couloir | une ligne orange de 30 px traverse la salle d'un mur à l'autre, un guichet de 120 px y reste clair ; préavis 1,0 s ; × 1,2 à la chute (sous la herse : touché, poussé du côté du guichet le plus proche) ; obstacle 4,5 s (5,5 s aux temps 2 et 3) | 1, 2, 3 |
| **Croix de herses** | croix | deux herses à la fois (une en long, une en travers), un guichet chacune : quatre sections | 2, 3 (au 3, l'une après l'autre à 0,5 s) |
| **Contrôle** | case (le damier, à l'échelle d'une section) | après une herse, la section où tu te tiens s'emplit d'orange ; préavis 1,2 s (1,0 au temps 3) ; × 1,4 ; la sortie par le guichet est vérifiée **au détour** (Q5) ; sans sortie, il contrôle une autre section ou rien | 1, 2, 3 |
| **Rafle** | case, en deux coups | deux sections annoncées ensemble (la seconde en pointillé), la seconde frappe 0,6 s après la première ; on vérifie qu'une sortie tient pour les deux (règle de la Toile du Brumeux) | 2, 3 |
| **Vouge** | cône | 110°, de 0 à 160 px devant lui ; préavis 0,8 s ; × 1,3 ; seulement si tu es à 0,8 × 160 px (il s'approche 2 s, puis renonce) ; au temps 3, aller et retour (second cône 0,5 s après, de l'autre côté) | 1, 2, 3 |
| **Garde !** | disque | il plante la vouge : disque de 130 px autour de lui ; préavis 0,9 s ; × 1,0 ; quand tu restes collé à lui (moins de 110 px pendant 2,5 s) : la réponse au corps à corps | 1, 2, 3 |
| **Feuillets** | projectile à trajectoire annoncée | les pages du registre partent en éventail vers toi (5 au temps 2, 7 au temps 3), lignes violettes de préavis 0,6 s, 210 px/s ; elles passent entre les barreaux | 2, 3 |
| **Appel du guet** | invocation | les Sans-Nom (Rampants et Voilés du registre 3, au plus 5 vivants) entrent **par les guichets** ; les herses les arrêtent comme toi | 2, 3 |

**Files** (mélangées, jamais deux fois la même de suite ; une Fermeture = Herse ou Croix, puis Contrôle ou Rafle, puis la Relève) :
- Temps 1 · « Qui va là ? » (100 → 66 %) : Fermeture (une herse + Contrôle), Vouge, Garde !, Fermeture, Vouge.
- Temps 2 · « Il ne te reconnaît pas » (66 → 33 %) : Fermeture (Croix + Rafle), Feuillets, Appel, Vouge, Fermeture (Herse + Contrôle), Garde !
- Temps 3 · « La herse tombe » (33 → 0 %, ou → 18 % en Difficile) : il va 30 % plus vite ; Fermeture (Croix en deux temps + Rafle), Feuillets, Vouge aller et retour, Fermeture, Appel, Garde !

Formes employées : couloir, croix, case (damier), cône, disque, projectile ; les autres (anneau à brèche, rayons, losanges) restent pour les gardiens suivants.

**Recommandation : ce jeu d'attaques et ces files.** Il répond à chaque forme : le corps à corps (Gouffre, Héraut) doit passer les guichets et se fait chasser par Garde ! ; la distance (Lumenarque, Tisse-Destin) tire à travers les barreaux mais doit bouger pour le Contrôle et éviter les Feuillets.

## Q19 · Son point faible et sa fenêtre

- **Point faible : le registre**, enchaîné sur sa poitrine (`faible` : « le registre du Guet Sans-Nom ») : un livre épais, fermoir de fer au temps 1, ouvert ensuite. L'anneau ivoire l'entoure quand il est à nu. Distinct du cœur-cloche, du battant et de l'œil.
- **Sa fenêtre propre, la Relève** :
  - **A. Après chaque Fermeture, il relève la herse : sonné 2 s** (`vuln`, même règle que le Héraut sonné contre un mur), anneau ivoire sur le registre. Elle s'ajoute aux fenêtres de l'Accoutumance.
  - **B. Pas de fenêtre propre**, seulement celles de l'Accoutumance.

**Recommandation : A.** Le rythme du combat devient lisible : la porte se ferme, on survit, la porte se rouvre, on frappe.

## Q20 · Son temps de plus (Difficile et Extrême)

- **A. « Couvre-feu »** (recommandé), sous 18 % : **ses herses ne se relèvent plus toutes** : chaque Fermeture en laisse une debout (au plus deux à la fois ; la plus ancienne se relève quand une troisième tomberait), et la salle devient un dédale à guichets ; connexité toujours ≥ 85 % et toujours un guichet par herse ; la Relève dure 1,5 s au lieu de 2. Signe sur le corps : la page de la phrase interrompue se détache du registre et flotte au-dessus de lui (figée en mouvements réduits). À sa mort, les herses tombent.
- **B. « La porte s'ouvre »** : le Guet ouvre la Porte Basse, les Sans-Nom affluent en continu par un côté de la salle. Plus de densité que de mécanique.
- **C. Une attaque de plus** (Rafle au temps 1). Peu visible.

**Recommandation : A.** C'est sa propre idée poussée d'un cran : la salle se referme sur toi, lisible, sans PV de plus.

## Q21 · Silhouette, couleurs, entrée et mort

- **Silhouette** (r 50, hauteur ≈ 3,5 × r) : grand, étroit, en long ciré sombre ; épaules carrées par une brigandine de plaques d'étain ; **la herse sur le dos**, une grille de barreaux rouillés qui dépasse au-dessus de sa tête comme une cage (la forme qu'on reconnaît de loin, différente des trois cloches et de la robe) ; un **visage lisse d'étain, sans traits**, usé comme une pièce ; le registre enchaîné sur la poitrine ; la vouge dans la main droite ; les pieds dans une eau trouble.
- **Temps visibles** : temps 1, herse au dos, registre fermé par son fermoir ; temps 2, le fermoir saute, le registre s'ouvre, quelques feuillets tournent autour de lui (figés en mouvements réduits) ; temps 3, la herse lui glisse des épaules et **reste au sol** derrière lui (débris, comme les plaques du Glas, jamais lus par le combat), une rature apparaît sur son visage ; quatrième temps : la page qui flotte.
- **Couleurs proposées** (à mesurer : ΔE ≥ 25 de toute la grammaire, contraste contre son sol ≥ 4,5) : étain 128,132,140 ; ciré 38,46,52 ; rouille 120,72,44 ; eau trouble 62,84,70 ; parchemin vieilli 170,150,110 (assez sombre pour rester loin de l'ivoire du point faible) ; **lueur** verdâtre des égouts 160,176,128 (lumière `TINT.guet`). Ses herses tombées sont de la même rouille que celle de son dos : on voit qu'il plante ce qu'il porte.
- **Sol de sa salle** (Q4) : pavés mouillés des Bas-Fonds, grilles d'égout, flaques d'eau trouble, brume basse verdâtre ; thème `basfonds`.
- **Glyphe** : une herse (trois barreaux, deux traverses) derrière un ovale d'étain sans traits, trait d'encre épais, lisible à 16 px.
- **Entrée** (bannière, 2,2 s) : une herse remonte du sol de la salle, il est derrière et passe le guichet. **Mort** (1,5 s) : le registre tombe ouvert, il pose le genou, la herse s'abat derrière lui, il se défait en eau trouble. Mouvements réduits : fondu seul.
- **Son** : sons existants (chute lourde de la herse, `lame` pour la vouge, `phase` aux changements de temps) ; aucune secousse en mouvements réduits.

**Recommandation : cette silhouette et cette palette**, mesurées et retouchées à l'implémentation sans changer l'idée (herse au dos, visage effacé, registre).

## Q22 · Ce qui le distingue du Glas, du Héraut et de la Mère-Brume

| | Mère-Brume (I) | Héraut Noyé (II) | Glas Originel (III) | **Guet Sans-Nom (IV)** |
|---|---|---|---|---|
| Histoire | la mère qui refuse d'oublier | le frère qui sonne pour qu'on n'oublie pas | la cloche qui ne se tait plus | **celui qu'on a oublié** |
| Question posée | que copie-t-elle de toi ? | quand traverser ? | quand traverser, où se mettre dans les tirs ? | **où seras-tu quand la porte se ferme ?** |
| Signature | copie de ton style (salves, balayage, esquive) | anneaux de glas, marée mobile à brèche, cloches sur toi, ruée contre les murs | anneaux qui se resserrent, motifs de tirs, faisceaux, Dévoreuse, Reflet de tes souvenirs | **herses qui restent, guichets, contrôle d'une section, relève** |
| La salle | ouverte | ouverte (piliers) | ouverte | **découpée, puis rouverte** |
| Sa fenêtre | Accoutumance | sonné contre un mur | épuisé après les faisceaux | **la Relève, après chaque Fermeture** |
| Point faible | cœur-cloche | battant | œil | **registre** |
| Ta réserve | non (copie) | non (copie au temps 2) | oui (le Reflet) | **non, et pas de copie** |
| Habileté demandée (Q25) | lire ce qu'elle copie | traverser au bon moment | traverser, lire des motifs de tirs | **l'espace : être au bon endroit** |

## Q23 · Sa lecture au wiki

- **Lecture à l'œil** (`dessin.lecture`, proposée) : « Un guet sans visage, la herse de la Porte Basse sur le dos, un registre enchaîné sur la poitrine. Au deuxième temps, le registre s'ouvre et ses feuillets s'envolent ; au troisième, la herse lui glisse des épaules et reste au sol : le registre est à nu. » Entrée et mort comme Q21.
- **Ses attaques** (lignes du wiki, au ton de celles du Héraut) : Herse : « Une ligne orange traverse la salle : une herse va tomber. Un guichet y reste ouvert. Tombée, elle arrête les corps quelques secondes, pas les tirs. » Contrôle : « La section où tu te tiens s'emplit d'orange : passe un guichet avant qu'elle se ferme. » Rafle : « Deux sections, l'une après l'autre : la seconde est en pointillé. » Vouge : « Il fauche devant lui quand tu t'approches : sors du cône. » Garde ! : « Reste collé à lui et il plante sa vouge : quitte le cercle. » Feuillets : « Les pages de son registre partent en éventail : les lignes violettes montrent où. » Appel du guet : « Les Sans-Nom entrent par les guichets ; les herses les arrêtent comme toi. » La Relève : « Quand il relève la herse, il est sonné : frappe le registre. »
- **Temps de plus** : « En Difficile et en Extrême, un quatrième temps, le Couvre-feu : ses herses ne se relèvent plus toutes. »
- **Journal** (proposé) : « Au fond des Bas-Fonds, quelqu'un garde encore la porte. »

**Recommandation : ces textes**, à relire par l'auteur (ce sont des phrases du jeu).

## Q24 · PV, durées, dégâts du Guet

- **PV** : par la règle Q9, DPS médian des quatre formes contre le mannequin au build de l'acte IV × 50 s ; durée visée ≈ 75 s en Normal (friction ≈ 1,5, le bas de l'échelle), soit environ 28 s / 26 s / 21 s par temps ; en Difficile, le Couvre-feu prend les 18 derniers pour cent.
- **Dégâts** (parts des PV du build de l'acte IV, Q10 ; elles remplacent les multiplicateurs de Q18) : Herse 15 %, Contrôle 18 %, Rafle 15 % par coup, Vouge 16 %, Garde ! 12 %, Feuillets 5 % par page.
- **Échelon** (Q25) : 3 temps, une contrainte à la fois plus ses herses, deux coups au plus, préavis de 1,0 à 1,2 s ; habileté neuve : l'espace.
- **Rayon de touche** 50 ; vitesse 58 (comme les gardiens I à III), × 1,3 au temps 3.

**Recommandation : ainsi**, les chiffres finaux sortant de la mesure (6.1b), rapportés à l'auteur.

---

## Tableau des recommandations

| Q | Sujet | Recommandation |
|---|---|---|
| Q1 | Données | fichier neuf `data/gardiens-descente.js` |
| Q2 | Interrupteur | `actif` par gardien ; éteint = place provisoire, au tirage près |
| Q3 | Salle | vraie salle `boss`, aiguillage `room.g18` / `e.g18` sur la liste des points d'entrée ; miniboss en salle d'élite |
| Q4 | Décor | la salle du gardien seule prend le décor de son acte ; musique du registre ; le reste plus tard |
| Q5 | Moteur | `/*gar:pur*/` commun, géométrie du Brumeux réutilisée, sortie au détour ajoutée |
| Q6 | Temps | trois temps (quatre à partir de l'acte VII) ; un temps de plus à 18 % en Difficile et Extrême, mécanique neuve et signe sur le corps |
| Q7 | Dessin | grammaire v17.27 telle quelle, contraste contre son sol ≥ 4,5 |
| Q8 | Accoutumance, Dernier Souvenir, Mémoire | hérités tels quels ; aucun gardien neuf ne lit ta réserve ni ne copie |
| Q9 | PV | neutres : DPS médian au mannequin (build de l'acte) × 50 s pour tous ; la friction mesurée doit monter d'acte en acte (≈ 75 s à l'acte IV, ≈ 115 s à l'acte IX) |
| Q10 | Dégâts | neutres : une part des PV du build de l'acte, la même d'un acte à l'autre (≤ 30 % par coup) |
| Q11 | Soin | comme les gardiens I à III, modulé par les paliers |
| Q12 | Wiki | carte, sous-section, temps de plus dit ; éteint = wiki d'avant |
| Q13 | Histoire | une entrée de codex par gardien |
| Q14 | Bancs | `sim-gardiens` (échelle comprise), `banc-gardiens18` (A à H, friction qui monte), règle d'or allumé et éteint |
| Q25 | Échelle | chaque gardien apporte une habileté neuve ; crans (temps, contraintes à la fois, enchaînements, préavis, entourage) qui ne baissent jamais ; vérifiée au simulateur et au banc |
| Q15 | Découpage | 6.1a socle (Opus élevé), 6.1b Guet (Opus élevé), 6.1c relecture (Opus élevé), puis V à IX et miniboss |
| Q16 | Identité | le Guet Sans-Nom, garde de la Porte Basse, « Qui va là ? » |
| Q17 | Idée de jeu | la herse : couper la salle, contrôler une section, rouvrir |
| Q18 | Attaques | Herse, Croix, Contrôle, Rafle, Vouge, Garde !, Feuillets, Appel du guet |
| Q19 | Point faible | le registre ; la Relève, sonné 2 s après chaque Fermeture |
| Q20 | Temps de plus | Couvre-feu : ses herses ne se relèvent plus toutes |
| Q21 | Dessin | herse au dos, visage d'étain effacé, registre enchaîné ; étain, ciré, rouille, lueur des égouts |
| Q22 | Distinctions | une question d'espace, pas de temps ; ni copie ni réserve |
| Q23 | Wiki | lecture, lignes d'attaque, temps de plus, journal (à relire) |
| Q24 | Chiffres | PV par la règle Q9 (≈ 75 s) ; dégâts en parts des PV du build (12 à 18 %) ; r 50 ; premier barreau de l'échelle |

## Risques

- **L'aiguillage oublie un point d'entrée** et un morceau du Glas paraît à l'acte IV : la liste de Q3 est vérifiée par le simulateur et par la section A du banc ; la relecture 6.1c la reprend une à une.
- **Les herses enferment** : guichet de 120 px au moins, connexité ≥ 85 %, sortie vérifiée au détour, et une zone sans sortie saute.
- **Le bot passe mal les guichets** et la mesure des PV dérive : la retouche du pilote est la seule prévue, capture à l'appui, et le Gouffre et le Tisse-Destin suivent la règle des formes hors des cibles.
- **Le Contrôle punit l'imprévu** : la section visée est la tienne au moment de l'annonce, la sortie est calculée à ta vitesse à pied, et la Rafle annonce ses deux coups ensemble.
- **Coût** : les herses sont des disques d'obstacle, dessinés depuis une image cuite ; ≤ 1 ms.
- **Une échelle qui plafonne** : six habiletés neuves à trouver, chacune lisible ; si une fiche n'en trouve pas une qui tienne, elle le dit et l'auteur tranche (plutôt que de compenser par des chiffres).
- **Volume** : huit adversaires. La méthode posée ici, et une fiche courte par adversaire, le contiennent.

## Ce que ce cadrage ne décide pas

Les gestes des gardiens V à IX et des deux miniboss (une fiche chacun), le décor des actes IV à IX hors des salles de gardien, les PV exacts (mesurés au bot), les textes définitifs (relus par l'auteur), l'équilibrage des formes contre les gardiens (action 7).

**Pour valider : « toutes les recommandations », ou question par question. Étape suivante : 6.1a, le socle commun, Opus 5.5, élevé, dans une autre conversation.**
