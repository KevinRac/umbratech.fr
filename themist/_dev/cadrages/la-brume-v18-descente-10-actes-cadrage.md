# La Brume · v18 « La grande descente » · cadrage (décisions validées le 1er novembre 2026)

Statut : cadrage validé par l'auteur. Faites : action 2 (charpente, v18.0, corrigée en v18.1 selon V8), action 3 (règles des paliers : v18.2 et v18.3), action 4 (arène large et caméra, éteinte : v18.4). **Prochaine étape : l'action 5 (le Brumeux), en commençant par son document de conception.** Détail de chaque livraison : `themist/_dev/memoire.md` § 31 à § 34.

## Intention
Une descente de **10 actes**, rejouable en **trois paliers** (Normal, Difficile, Extrême), qui se termine par le **Brumeux** : un boss final en 5 phases, d'environ 5 minutes, sur une arène plus grande, très difficile de base, qui donne envie de tryhard.

## Décisions validées
- V1 **Actes I à III : on n'y touche pas** (gardiens Mère-Brume, Héraut Noyé et Glas Originel, redessinés en v17.27, inchangés). Les actes IV à IX reçoivent **six nouveaux gardiens** ; l'acte X est le Brumeux.
- V2 Paliers : **déblocage par victoire** (gagner en Normal ouvre Difficile, puis Extrême) ; chaque palier ajoute des règles, pas seulement des PV.
- V3 Boss final : **le Brumeux**, qui invente, convoque des éléments de tout le jeu et n'est jamais le même.
- V4 Carte : **arène plus grande avec caméra**, qui change entre les phases.
- V5 Le Brumeux a **5 phases** pour environ **5 minutes** de combat (soit environ 1 minute par phase pour un joueur qui tient).
- V6 Le palier **Extrême impose des règles mutantes** (le joueur ne les choisit pas).
- V7 **Pas de mode d'entraînement** du Brumeux : on le rejoue en refaisant la descente.
- V8 (précisé le 1er novembre 2026, après l'action 2) : **le Glas Originel reste le gardien de l'acte III** et n'est repris nulle part ailleurs ; **chaque acte IV à IX se termine par un gardien** ; **l'acte X enchaîne deux salles de miniboss, puis le boss final**. Tant qu'un gardien, un miniboss ou le boss final n'existe pas, sa place est tenue par un Masqué renforcé (v18.1, `data/descente.js`, `provisoire`).

## Décisions de l'action 2 (validées le 1er novembre 2026)
- Durée visée : environ 40 minutes en Normal hors combat final (30 pour un joueur rapide) ; la durée réelle reste à mesurer sur des parties exportées.
- Actes IV à IX : 3 salles libres puis le gardien ; acte X : deux miniboss puis le boss final (47 salles en tout).
- Montée des ennemis inchangée jusqu'à la fin de l'acte III, puis divisée par deux (+4 % de PV, +1,5 % de dégâts par salle).
- Les Paliers de Brume sont remplacés par Normal, Difficile et Extrême ; sélecteur sur l'écran titre et au Portail ; le raccourci du Portail reste limité aux actes II et III.

## Conséquences de ces décisions
- Les actes I à III restent identiques dans leur dessin et leur combat. Les règles des paliers Difficile et Extrême s'y appliquent comme des couches (Masqués, mutations), sans modifier les gardiens eux-mêmes ; en Normal, ils sont exactement ce qu'ils étaient (vérifié aux actions 3 et 4).
- Sans mode d'entraînement, le tryhard repose sur la **rapidité de la descente** (les actes avant le Brumeux ne doivent pas être une corvée) et sur la **lisibilité** : on apprend le Brumeux en mourant, donc chaque mort doit s'expliquer par un signe visible. Cela rend le socle appris de chaque phase indispensable.
- 5 minutes de combat très difficile : à bien doser avec des bots de test (`bot=1`) ; une phase doit durer assez pour être apprise, assez peu pour que la répétition reste supportable.
- V8 ajoute deux miniboss à concevoir (acte X), en plus des six gardiens.

## Règles de conception (inchangées)
### D3 · Ce que change chaque palier
- **Normal** : la descente telle que conçue ; on peut la finir en apprenant.
- **Difficile** : Masqués plus fréquents et porteurs de plus de souvenirs, gardiens (IV à IX) avec un temps de plus ou des attaques ajoutées, moins de soins.
- **Extrême** : règles mutantes imposées, némésis plus nombreuses, Brumeux avec sa phase finale entière, aucun répit entre actes.
Principe : chaque palier ajoute des mécaniques lisibles, jamais un simple mur de PV.

### D4 · Récompense
Un palier terminé ouvre le suivant ; un emblème par palier et par forme, visible au Sanctuaire. Rien qui rende le jeu plus facile.

### D5 · Le Brumeux
Cinq phases **distinctes**, chacune avec son idée de jeu ; un **socle fixe appris** par phase (reconnaissable d'une partie à l'autre) plus une **part improvisée** (tirage de combinaisons à partir de tout le jeu : zones, tirs, invoqués, Masqués, armes de la Brume, souvenirs de ta réserve, némésis). Il garde ses secrets : aucun texte n'explique ses mécaniques. Équité : tout est lisible (grammaire de couleurs des télégraphes du reste du jeu), aucune mort sans signe ; la difficulté vient de la densité et de l'enchaînement.

### D6 · Arène et caméra
2 à 3 écrans de large, caméra qui suit, arène qui se transforme entre les phases (sol, obstacles, brume). Points techniques : indicateurs de bord pour ce qui arrive hors champ, télégraphes lisibles, coût de rendu (cache par zone). **Fait à l'action 4 (v18.4), éteint jusqu'à l'action 5.**

### D7 · Sauvegarde
Progression de palier dans `SAVE` (versionnée). Une descente d'essai ne débloque rien (`RUN.essai=1`).

### D8 · Wiki
Dit : actes, paliers et déblocage, gardiens et points faibles. Tait : la mécanique d'invention du Brumeux.

## Plan d'actions (modèle et effort)
1. **Cadrage** : fait.
2. **Charpente de la descente** : faite (v18.0, corrigée en v18.1 selon V8).
3. **Règles des paliers** (D3) et règles mutantes de l'Extrême : faites (v18.2, v18.3).
4. **Arène large et caméra** : faite (v18.4, éteinte : `data/arene.js`, `actif:false`).
5. **Le Brumeux, phase par phase** : un document de conception des 5 phases, puis une action par phase, puis l'enchaînement et la durée (~5 min) ; l'action allume l'arène. Opus 5.5, élevé.
6. **Six gardiens (actes IV à IX) et deux miniboss (acte X)** : une action par adversaire (cadrage court, dessin, combat, banc). Opus 5.5, élevé pour le premier gardien et le premier miniboss ; Sonnet 5.5, moyen ensuite si la méthode est posée.
7. **Équilibrage, lisibilité, wiki, journal** : Sonnet 5.5, moyen.

## Risques
- Volume de contenu : six gardiens, deux miniboss et un boss à 5 phases. On livre dans l'ordre 3, 4, 5, puis les gardiens et les miniboss un par un, avec la descente jouable à chaque étape.
- Difficulté « très difficile de base » : mesure par bots ; le Brumeux doit rester battable.
- Cohérence avec la Mémoire, la némésis et le Dernier Souvenir : le Brumeux les reprend, ne les double pas.
- Longueur de la descente : 10 actes allongent chaque partie ; durée réelle à mesurer (heure d'entrée de chaque acte notée dans les statistiques de descente).
