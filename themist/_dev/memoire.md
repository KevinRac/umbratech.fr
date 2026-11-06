# La Brume · Mémoire — « Ce que tu oublies, la Brume s’en souvient »

> **Ce fichier est le journal de conception de tout le jeu depuis la v17** (décisions, écarts, mesures, points ouverts : une section par livraison, la plus récente en fin de fichier). Il commence par le cadrage de la Mémoire (§ 0 à § 7). Pour reprendre le projet sans le connaître : `REPRISE.md` (même dossier), qui donne aussi l'index des sections ; cadrages du chantier en cours : `cadrages/`.

Document de cadrage interne. **Aucun comportement du jeu n’est modifié par ce palier.**
Base lue : v16.47, commit `9ed3077` (les numéros de ligne d’`index.html` cités ici valent pour ce commit).
Rédigé le 22 octobre 2026.

## 0. En bref

- Le joueur ne garde plus que **6 souvenirs actifs** (talents et reliques). Chaque nouveau gain oblige à en oublier un.
- Les souvenirs oubliés vont dans **la réserve de la Brume**, qui les retourne contre lui : d’abord le Masqué, puis le Glas Originel, puis le « Dernier Souvenir » (le joueur brûle un souvenir en combat).
- Le code actuel n’a **aucun moyen de retirer un talent ou une relique** : chaque `apply` modifie les statistiques sur place, sans réciproque. Oublier exigera de recalculer le joueur de zéro (§ 1.2). C’est le chantier technique principal.
- À 6 souvenirs, **un majeur de troisième rang demande aujourd’hui 8 nœuds de la même branche**, un nœud clé 5 et un ultime 4 : les règles d’accès de l’arbre doivent changer (décisions D3 et D4).
- Un run actuel compte de l’ordre de 15 à 25 choix de talents et 5 à 10 reliques (§ 1.4, § 1.6) : le plafond de 6 transforme presque chaque gain en oubli à partir de la fin de l’acte I.

### Où vit ce document

Le site n’est pas servi par GitHub Pages : le workflow `deploy.yml` fait un `git pull` de tout le dépôt sur IONOS. Il n’y a pas de `.nojekyll` dans le dépôt, et le préfixe `_` ne protège rien sur IONOS. Depuis la décision D0, le `.htaccess` racine renvoie une 404 pour tout chemin en `/_dev/` : le document n’est plus servi par le site. Le dépôt étant public, il reste lisible sur GitHub. `outils/wiki.mjs` ne lit que `data/`, le document n’entre donc pas dans le wiki.

### Décisions retenues (22 octobre 2026)

Toutes les recommandations du § 3 sont adoptées :

| # | Décision retenue |
|---|---|
| D0 | `.htaccess` : `RedirectMatch 404 /_dev/` (fait). |
| D1 | Mémoire commune de 6 (talents et reliques) ; équipement à part (4 emplacements) ; toute relique offerte peut être refusée contre un soin ou de l’or. |
| D2 | La racine de la voie doit rester en mémoire ; le chemin vers l’ultime ne compte qu’à l’acquisition ; oublier la racine éteint la voie (avertissement fort). |
| D3 | Un talent = un souvenir ; un rang de plus le renforce sans oubli ; le rang part avec lui dans la réserve. |
| D4 | Pas de cascade ; voisinage et seuils des majeurs comptés sur les traces de la run ; un talent sans sa compétence liée s’éteint ; exclusions lues sur la mémoire ; une paire A/B déjà prise ne se rouvre pas. |
| D5 | Accoutumance inchangée ; mesure avant/après ; dégâts sur un Masqué porteur de souvenir non comptés. |
| D6 | Boussole brisée consommable (hors mémoire et réserve) ; Mèche de Phénix se consume quand elle sert et libère sa place. |
| D7 | Écran d’oubli : gain d’abord, puis oublier / renoncer / plus tard ; icône, rang et version ennemie affichés. |
| D8 | Contre-mesures liées au profil de jeu seulement ; références remises à zéro à la mise en service. |
| D9 | Au palier Masqué : sa mort propose de reprendre le souvenir qu’il porte, à la place de la relique. |
| D10 | Réserve par run pour commencer. |

---

## 1. Ce que fait le code aujourd’hui

### 1.1 L’arbre de talents

**240 nœuds**, 60 par forme : 12 branches principales de 20 nœuds (6 « mineurs » `n1`–`n6`, 3 paires de majeurs A/B `x1`–`x3`, 2 nœuds clés `k1`/`k2`) et 12 voies de 6 nœuds (racine `s1`, `s2`–`s5`, ultime `sk`).
Par genre : 63 mineurs, 57 compétences, 72 majeurs, 24 nœuds clés de branche, 12 ultimes [F], 12 racines de voie. 120 nœuds ont plusieurs rangs (2 ou 3).
Données : `data/talents.js` (textes, rangs, exclusions) et `data/arbre.js` (géométrie et liens). Effets et verrous : `index.html`.

Règles d’accès actuelles (toutes évaluées sur `P.ranks`, c’est-à-dire sur ce que le joueur possède) :

| Règle | Où | Effet |
|---|---|---|
| Voisinage | `nodeAvailable` (l. 1662) + `ADJ` | Un nœud non possédé n’est proposé que si un voisin est possédé. La racine (Éveil) est toujours possédée et ne coûte rien. |
| Seuils des majeurs | `NEED10=[2,4,5]` (l. 5039), `nodeAvailable` v10 (l. 5044) | Majeur de rang 1, 2, 3 : il faut 2, 4, 5 mineurs de la branche, et un majeur du rang précédent. Les majeurs ne tiennent pas compte du voisinage. |
| Compétence liée | `reqS` (17 conditions, l. 4092–4300, dont une levée l. 6849 pour Fil de lumière) | Certains majeurs exigent une compétence : Nova, Lame de Nuit, Pas d’Ombre, Gardienne, rappel, Festin, Carapace, Bile Acide, Carillon, Point d’orgue, Cortège, Pluie d’aiguilles, Aiguilles Chercheuses, Toile, Pantin. |
| Nœuds clés de branche | `keyMaj` (l. 4307, 5054) | `k1`/`k2` exigent au moins un majeur de leur branche (et leur voisin `n4` ou `n5`). |
| Paires A/B | `EXCL` (l. 4079) | Les deux options d’un majeur s’excluent. |
| Exclusions de nœuds clés | `EXCL` (l. 2919, 4079, 6851) | Cœur de Soleil ⟂ Lanterne Vivante / Constellation / Enfant de la Nuit, Estomac sans Fond ⟂ Rupture Maîtrisée, Bourdon ⟂ Tocsin / Accord Parfait, Destin Lié ⟂ Fil Rouge, Cloche majeure ⟂ Timbre clair. |
| États bloquants | `KFLAG`, `blk`, `SUBKEY`, `SUBWHY` (l. 6826) | Un nœud clé pose un état (`coeur`, `vivante`, `enfant`, `colosse`, `canon`, `filRouge`, `faim`) qui verrouille des talents, dans les deux sens, et parfois une voie (Ombrelame, Saint Dévorant, Gardien du Phare). |
| Voies scellées | `isSealed` (l. 1660) | Un nœud de voie n’est accessible que si `P.s.sub` vaut cette voie. `P.s.sub` est posé par l’`apply` de la racine `s1`. |

Coût minimal en nœuds possédés, avec les règles actuelles :

| Objectif | Chemin minimal | Nœuds |
|---|---|---|
| Majeur de rang 1 | 2 mineurs + le majeur | 3 |
| Majeur de rang 2 | 4 mineurs + majeur 1 + majeur 2 | 6 |
| Majeur de rang 3 | 5 mineurs + majeurs 1, 2, 3 | **8** |
| Nœud clé `k1` | `n1` → `n2` → `n4` + un majeur + `k1` | 5 |
| Ultime [F] | `s1` → `s2`/`s3` → `s4`/`s5` → `sk` | 4 (dont `s1`, donnée par le Rituel) |

### 1.2 Rangs et effets : rien ne se retire

- `takeNode` (l. 1671, enveloppé l. 5075) incrémente `P.ranks[id]` et appelle `n.apply(P.s, rang)`. Selon le talent, `apply` additionne, **multiplie** (`s.atkDmg*=1.08` pour Acier fin) ou pose un drapeau (`s.ronde=r`). Il n’existe aucune fonction inverse.
- `takeNode` et `applyRelic` (l. 1676) soignent la différence de PV max et ajoutent la différence de charges d’esquive. Retirer puis reprendre un talent de PV soignerait donc gratuitement.
- Effets de bord hors `P.s` : état de la lanterne (`fan_k1`, `ray_k1`, l. 1673), `P.s.sub` (voie), compteurs `sinceSkill` / `sinceMaj`.
- Les équipements, eux, sont réversibles : `equip` (l. 5886) appelle `off` sur l’ancien objet.
- Conséquence : oublier un souvenir demandera **un recalcul complet** : `baseStats` → méta (Sanctuaire, `applyMeta`, sans ses effets de départ) → talents dans l’ordre d’acquisition, rang par rang → reliques (sans leurs effets instantanés) → équipements (`on`) → bornage des PV et des charges, sans soin.

### 1.3 Les offres de talents

- `rollOffers` v10 (l. 5057) tire `RUN.offerCount` cartes (3, ou 4 avec Vision élargie) parmi les nœuds disponibles. Poids : nœud clé 0,5 ; compétence 1,4 (0,8 si déjà prise) ; mineur 1 (0,7).
- Une compétence est forcée après 2 mineurs (`sinceSkill`). Une paire de majeurs A/B est insérée avec 30 % de chances, ou d’office après 2 choix sans majeur (`sinceMaj`).
- Relances : 1 par acte (+1 par rang d’Indécision), +1 à la halte « Méditer », +2 avec la Boussole brisée, et la provision « relance » (Résonance C1).
- « Plus tard » (l. 5205) garde les niveaux en attente (`pendingLv`). Si rien n’est disponible : « Braise intérieure » (+10 PV max, soin complet).

### 1.4 Combien de gains par run

- XP : `xpNeed(l)=10+7(l−1)`, donc 10(L−1)+3,5(L−1)(L−2) pour atteindre le niveau L : 777 XP au niveau 15, 1 387 au niveau 20, 2 172 au niveau 25. Sources : ennemis (`e.xp`), salle purifiée (4 + numéro de salle), gardiens.
- Niveaux hors XP : Savoir ancien (+1 ou +2 dès le départ), halte « Contempler la flamme » (+1), niveaux vendus par le Colporteur (`levelsBought`).
- Ordre de grandeur, à mesurer : 15 à 25 choix de talents par run complet, dont une bonne part de rangs supplémentaires. **Il faudra instrumenter la fin de run** (niveau, talents distincts, rangs, reliques) avant de régler les nombres.

### 1.5 Voies, Rituel d’Ascension, ultimes

- Après la Mère-Brume (fin de l’acte I), `openAscension` (l. 1766, enveloppé l. 6881) fait choisir une des trois voies de la forme. La racine `s1` est donnée d’office (rang 1, jamais proposée en carte) ; son `apply` pose `P.s.sub`. Le choix est définitif pour la run.
- Une voie peut être grisée si un nœud clé déjà pris la contredit (`SUBWHY`, l. 6829 ; Gardien du Phare, l. 7941).
- Les 12 ultimes [F] (Zénith, Nuit Éternelle, Phare Tournant, Absolution, Métamorphose, Gueule du Monde, Glas Funèbre, Requiem, Bal des Morts, Grande Toile, Grand Guignol, Temps Suspendu) sont le dernier nœud de chaque voie. Un seul se joue à la fois (touche F, `ult()`, l. 1069).
- Les compétences actives des branches principales (Nova [A], Lame de Nuit [E], Festin [A], Carapace [E], Carillon [A], Point d’orgue [E], Pluie d’aiguilles [E], Toile [A]) occupent les touches A et E.

### 1.6 Les reliques

- **34 reliques** (`data/reliques.js`) : 22 communes, 12 réservées à une forme (3 par forme) ; 9 se débloquent à la forge de Corbin (30 à 50 Éclats, `SAVE.relics`).
- Sources dans une run : autel (l. 934 ; la Résonance R2 permet de prendre un soin à la place), champion (l. 960), Héraut Noyé (l. 961), Brèche (l. 7465), Masqué (« Le masque se brise », l. 9014), Colporteur (`genShop`, 4 reliques, 5 avec la Clé), Bagage d’Ismène au départ (l. 1851).
- Tirage : 4 reliques parmi celles non possédées, de la forme, débloquées ; 1 relance. S’il n’en reste aucune : +30 PV.
- `applyRelic` pousse l’id dans `P.relics` ; comme les talents, aucun retrait possible.
- Ordre de grandeur : 5 à 10 reliques par run complet (le Masqué apparaît une fois sur deux dès la salle 3 de chaque acte et donne une relique de plus).

### 1.7 Boussole brisée, Vision élargie, Savoir ancien, Bagage

| Élément | Nature | Effet actuel | Rapport avec la mémoire |
|---|---|---|---|
| Boussole brisée `boussole` | relique commune | +2 relances, tout de suite (`RUN.rerolls+=2`), puis plus rien | Effet instantané : la garder en mémoire n’a aucun sens. |
| Vision élargie `cho` | Sanctuaire, 60 ✦ | 4 cartes au lieu de 3 | Plus de choix, pas plus de place. |
| Savoir ancien `sav` | Sanctuaire, 25 + 45 ✦ | +1 / +2 niveaux au départ (`pendingLv`) | Remplit la mémoire plus tôt. |
| Bagage `bag` | Sanctuaire, 40 ✦ | Une relique au choix avant la salle 1 | Premier souvenir de la run si les reliques comptent. |
| Mèche de Phénix, Seconde flamme | relique / Sanctuaire | Une renaissance par run | La Mèche a servi : que devient-elle ? |

### 1.8 Le Masqué (élite assemblé)

Réglages : `data/bestiaire.js` (`assemble`). Code : bloc v16.24 (l. 8650 et suivantes), logique pure vérifiée par `outils/sim-masque.mjs`.

- **Corps** (3) : Brute, Spectre, Voilé (dès la salle 14). Chacun a ses PV, sa taille, son déplacement, sa menace, les capacités qu’il refuse et **un sort signature** (Fracas en croix, Éclats en losanges, Damier).
- **Capacités empruntées** (5) : Explosion (disque, du Bouffi), Onde (anneau, du Hurleur), Charge (couloir, de la Brute), Lame (cône, du Voilé), Salve (rayons, du Spectre). Chaque capacité a une forme de zone qui lui est propre et toujours la même, un adjectif (masculin et féminin) pour le nom composé (« Brute hurlante et tranchante »), une menace, des durées.
- **Tirage** (`asmCombos`, `asmTirage`) : corps + paire de départ + capacité d’éveil, sous un plafond de menace par acte (11, 11, 13), sans paire incompatible, jamais la même base que la fois précédente. Pondération par le profil prévue mais coupée (`poidsProfil.actif:false`).
- **Cycle** (`asmCycle`) : chaque capacité une fois dans un ordre tiré, la signature en dernier, une seule zone à la fois dans la salle, pause fixe entre deux sorts.
- **Éveil** (`asmPas`) : à 50 % de PV, la troisième capacité s’ajoute et passe en tête du cycle.
- Attaque passive : un trait tiré vers le joueur toutes les 1,4 s.
- Il vient dès l’acte I, salle 3, une fois sur deux (toujours en Brèche), avec la deuxième vague, et donne une relique.

### 1.9 Le jugement des contre-mesures

- Le Brumeux dispose de 6 contre-mesures (Traque, Pétards, Tir de barrage, Brume avide, Renforts, Béliers), chacune visant un axe du profil (`portee`, `esquive`, `soin`, `rythme` ; `risque` est mesuré mais aucune contre-mesure ne le vise).
- v16.1 (l. 7593) : après une salle à contre-mesure, il compare tes PV perdus et ton temps à tes salles ordinaires (`score`, 70 % dégâts / 30 % temps). Verdict « a porté », « nulle » ou « déjouée » ; mémoire d’une run à l’autre (`SAVE.mem.prof.eff`) ; abandon après 2 échecs dans la run ; pénalité de répétition.
- v16.16 (l. 7647) : en pleine salle, il escalade si elle ne mord pas, relâche si elle mord trop.

### 1.10 Les attaques du Glas Originel

- `data/gardiens.js` (`attaques[3]`), code l. 7470. Trois temps ; file mélangée à chaque tour :
  - temps 1 : Battement inverse, Spirale, Appel ;
  - temps 2 : Couronne, Battement inverse, Spirale, Appel, Faisceaux, Dévoreuse ;
  - temps 3 : Spirale, Battement inverse ×2, Faisceaux ×2, Dévoreuse.
- S’y ajoutent le Battement (anneau violet régulier, plus rapide au troisième temps) et la fenêtre « à nu » de l’Accoutumance.

### 1.11 L’Accoutumance

- Elle mesure la part de tes dégâts qui repose sur **la mécanique de ta forme** (`sigHit`, l. 3057) : lumière (Lumenarque), Corruption ≥ 34 (Gouffre), Cadence > 0 (Héraut), cible attachée ou dans une toile (Tisse-Destin).
- Au-delà de 40 % (`data/memoire.js`), la Brume apprend : niveau 0 à 3 par forme, gardé d’une run à l’autre (`SAVE.mem.adapt`). Les ennemis accoutumés résistent de 12 % par niveau ; contre-jeu (+15 %) et fenêtre « à nu » du gardien. Prime d’Éclats de 6 % par niveau.
- Elle ne regarde ni les talents ni les reliques : seulement la façon de faire mal.
- Plusieurs Résonances en dépendent (L1 Variation, L3 Mécanique pure, L5 Contre-jeu appris, L7 Acier nu, B6 Pillard aguerri).

### 1.12 Ce qui reste hors de la mémoire

- **Équipement** : 4 emplacements fixes (Arme, Main gauche, Armure, Talisman), réversibles, 5 sets. Il garde ses 4 emplacements (consigne).
- Améliorations du Sanctuaire, Résonances, pactes, règles de salle : hors mémoire.

---

## 2. Inventaire : ce que touche le plafond de 6

| # | Élément | Où | Ce qui change | Gravité |
|---|---|---|---|---|
| 1 | Prise de talent | `takeNode`, `openLevelUp` | Un nouveau talent, mémoire pleine : écran d’oubli. | Cœur du chantier |
| 2 | Rang supplémentaire | `takeNode` | Renforcer un souvenir déjà présent : oubli ou non (D3). | Fort |
| 3 | Recalcul du joueur | `apply` partout, `baseStats`, `applyMeta`, `applyRelic`, `equip` | Aucun retrait possible aujourd’hui : recalcul complet à écrire, sans soin ni effets de départ rejoués. | Technique, bloquant |
| 4 | Voisinage | `nodeAvailable`, `ADJ` | Oublier un nœud au milieu d’un chemin coupe l’accès à ses voisins (D4). | Fort |
| 5 | Seuils des majeurs | `NEED10` | Majeur 3 : 8 nœuds, impossible ; majeur 2 : toute la mémoire (D4). | Bloquant |
| 6 | Majeurs liés à une compétence | `reqS` | Oublier Nova laisse Triple pulsation sans objet (D4). | Fort |
| 7 | Nœuds clés | `keyMaj`, `EXCL`, `KFLAG`/`blk` | Un nœud clé oublié lève ses verrous : talents rouverts, voie rouverte ? (D4). | Moyen |
| 8 | Paires A/B | `EXCL` | Oublier A : B devient-il proposable ? (D4). | Moyen |
| 9 | Racine de voie, Rituel | `openAscension`, `P.s.sub`, `isSealed` | Le Rituel est un gain : il peut forcer un oubli. Oublier `s1` scelle toute la voie (D2). | Fort |
| 10 | Ultimes [F] | voies, `ult()` | 4 nœuds pour l’atteindre ; doit-il garder son chemin ? (D2). | Fort |
| 11 | Compétences [A]/[E] | `aCd`, `eCd` | Touche libérée à l’oubli ; HUD des emplacements (`buildSlots`). | Faible |
| 12 | Offres | `rollOffers`, `offerCount`, `sinceSkill`, `sinceMaj`, relances | Les poids doivent distinguer « renforcer » et « nouveau » ; Braise intérieure quand tout est au maximum. | Moyen |
| 13 | Niveaux en attente | « Plus tard », `pendingLv` | Permet de garder un niveau pour choisir l’oubli au calme. À garder. | Faible |
| 14 | Reliques : toutes les sources | autel, champion, Héraut, Brèche, Masqué, Colporteur, Bagage | Chaque relique devient un gain qui peut forcer un oubli (D1). | Fort |
| 15 | Colporteur | `genShop` | Acheter une relique pleine mémoire : payer pour oublier. | Moyen |
| 16 | Boussole brisée | relique `boussole` | Effet instantané : consommable, pas un souvenir (D6). | Faible |
| 17 | Mèche de Phénix | relique `phoenix` | Une fois utilisée, elle ne fait plus rien (D6). | Faible |
| 18 | Vision élargie | `cho`, `offerCount` | Inchangée ; 4 cartes. | Faible |
| 19 | Savoir ancien | `sav`, `pendingLv` | Remplit la mémoire plus vite. Inchangé. | Faible |
| 20 | Bagage | `bag` | Premier souvenir si les reliques comptent (D1). | Faible |
| 21 | Forge de Corbin | `SAVE.relics`, `lock` | Débloquer une relique garde son sens (elle entre dans le tirage), mais sa valeur perçue baisse si les reliques coûtent une place. | Moyen |
| 22 | Masqué | `assemble`, `asmCombos`, `asmCycle` | Plus tard : une capacité tirée de la réserve. Chaque famille doit avoir une forme de zone unique, un adjectif, une menace (§ 4, § 5). | Palier suivant |
| 23 | Récompense du Masqué | `recompense.reliques` | Plus tard : reprendre le souvenir qu’il porte, à la place d’une relique ? | Palier suivant |
| 24 | Contre-mesures | `CMS`, `profile`, `efficacite` | Le profil reste celui du jeu ; la mémoire ajoute une lecture du build (D8). Les références (`base`, `eff`) d’avant la mémoire ne seront plus comparables. | Moyen |
| 25 | Glas Originel | `attaques[3]` | Plus tard : jouer des souvenirs de la réserve dans sa file. | Palier ultérieur |
| 26 | Accoutumance | `sigHit`, `adapt` | Builds plus resserrés : part de la mécanique en hausse probable (D5). | Moyen |
| 27 | Écrans | HUD (`renderRelics` l. 1599, `buildSlots` l. 1575), pause (`treeBlock`, `relicsHTML`), fin de run (puces talents et reliques) | 6 emplacements lisibles en icônes ; réserve visible ou non. | Moyen |
| 28 | Sauvegarde | `RUN`, `P.ranks`, `P.relics` | Nouvel état de run : mémoire, réserve, traces. Rien de persistant pour ce palier. | Faible |
| 29 | Wiki | `outils/wiki.mjs`, sections talents, reliques, Sanctuaire, Masqué | Une section « Mémoire », la famille de chaque talent et relique, les règles d’oubli. | À chaque palier |
| 30 | Outils | `sim-masque.mjs` | À étendre aux capacités de souvenir. | Palier suivant |

---

## 3. Décisions proposées

Chaque décision : la question, les options, la recommandation, ses avantages et ses risques.

### D0. Ce document doit-il être servi par le site ?

- Constat : le site est un `git pull` du dépôt ; `_dev/` sera public sur umbratech.fr (et l’est sur GitHub, dépôt public).
- Options : (a) laisser tel quel ; (b) ajouter `RedirectMatch 404 /_dev/` au `.htaccess` racine ; (c) déplacer les notes hors de `themist/`, par exemple `dev/` à la racine (qui existe déjà et contient `read.me`), avec la même ligne.
- **Recommandation : (b).** Une ligne, aucun effet sur le jeu, protège tous les futurs `_dev/`.
- Risque : aucun pour le jeu. Le contenu reste lisible sur GitHub.

### D1. Les reliques comptent-elles dans les 6 souvenirs ?

- Options :
  - (a) **mémoire commune** : 6 places pour talents et reliques ;
  - (b) mémoire de talents seule (6), reliques sans plafond ;
  - (c) deux mémoires : 6 talents + 2 ou 3 reliques ;
  - (d) mémoire commune, mais une relique peut toujours être refusée (soin ou or), comme la Résonance R2 le fait déjà aux autels.
- **Recommandation : (a) + (d).** Mémoire commune de 6, l’équipement garde ses 4 emplacements à part, et chaque relique offerte se refuse contre un petit soin ou de l’or.
- Avantages : une seule économie, lisible ; chaque relique devient une vraie décision contre un talent ; la réserve de la Brume reçoit aussi des reliques, d’où des Masqués plus variés ; le refus évite que les champions et autels « punissent ».
- Risques : la plupart des reliques sont des bonus de statistiques plus faibles qu’un talent (Plume de corbeau +12 % de vitesse contre Nova) : elles seront refusées ou serviront de monnaie d’oubli. Il faudra sans doute renforcer les reliques communes ou les rendre plus « gestuelles ». La forge de Corbin perd de sa valeur perçue. Les Masqués, qui donnent une relique, deviennent moins attrayants (voir D9).

### D2. Comment un ultime reste-t-il accessible ?

- Constat : l’ultime est au bout de 4 nœuds (`s1`, `s2`/`s3`, `s4`/`s5`, `sk`) ; `s1` porte `P.s.sub`, sans lequel toute la voie est scellée.
- Options :
  - (a) tout le chemin doit rester en mémoire : 4 places sur 6, intenable ;
  - (b) **la racine `s1` doit rester en mémoire** ; le chemin compte à l’acquisition seulement ;
  - (c) `s1` hors mémoire (comme l’Éveil) et l’ultime seul compte ;
  - (d) l’ultime remplace sa racine (il porte la voie à lui seul).
- **Recommandation : (b).** `s1` est un souvenir comme les autres ; tant qu’il est en mémoire, la voie est ouverte. On passe par `s2` et `s4` pour atteindre l’ultime, puis on peut les oublier. Coût permanent d’un ultime : 2 places (racine + ultime). Oublier `s1` scelle la voie : ses talents restent en mémoire mais s’éteignent (D4), et le Rituel ne se rejoue pas.
- Avantages : correspond au code (`P.s.sub` vient de `s1`) ; les nœuds intermédiaires deviennent des marchepieds, donc des souvenirs qu’on donne à la Brume en connaissance de cause ; le Rituel, s’il arrive mémoire pleine, devient un vrai moment d’oubli.
- Risques : 2 places pour une voie pèsent lourd à côté de 4 talents de branche ; oublier `s1` par erreur ruine la run (il faut un avertissement fort, voire interdire de l’oublier) ; les voies dont les nœuds intermédiaires sont forts (Ombrelame, Saint Dévorant) seront moins « traversées » que gardées.

### D3. Un talent à rangs : un souvenir ou plusieurs ?

- Options :
  - (a) **un talent = un souvenir**, quel que soit son rang ; un rang de plus renforce le souvenir sans oubli ;
  - (b) chaque rang occupe une place ;
  - (c) un talent = un souvenir, mais un rang de plus force aussi un oubli.
- **Recommandation : (a).** Le rang voyage avec le souvenir : oublié, il part dans la réserve avec son rang (la version ennemie est d’autant plus forte).
- Avantages : un vrai choix « profondeur ou nouveauté » à chaque niveau ; les mineurs à 3 rangs (63) gardent un rôle ; lisible (6 icônes, chacune avec son rang).
- Risques : renforcer devient le choix sûr et dominant une fois la mémoire pleine, et les runs se figent ; il faudra baisser le poids des rangs dans `rollOffers` ou garantir au moins une carte « nouveau » par tirage. Quand les 6 souvenirs sont au rang maximum, tout gain est un oubli : prévoir une issue (Braise intérieure existe déjà).

### D4. Que deviennent les prérequis d’un talent oublié ?

- Options :
  - (a) cascade : oublier un prérequis fait oublier ce qui en dépend ;
  - (b) **prérequis vérifiés à l’acquisition seulement, sur l’histoire de la run** (« traces ») ; un talent dont la compétence liée a été oubliée s’éteint ;
  - (c) prérequis vérifiés sur la mémoire, sans cascade : ce qui est pris reste, mais l’arbre se referme derrière l’oubli.
- **Recommandation : (b).**
  - Une **trace** = un talent pris pendant la run, oublié ou non. Le voisinage (`ADJ`) et les seuils des majeurs (`NEED10`) se comptent sur les traces : on peut traverser une branche et n’en garder que l’essentiel. Le majeur 3 redevient atteignable.
  - Les dépendances de fonctionnement (`reqS` : un majeur qui modifie Nova sans Nova) ne se lisent pas sur les traces : le talent reste en mémoire mais **s’éteint** (icône grisée, aucun effet) tant que la compétence n’est pas en mémoire. Même règle pour une voie dont la racine a été oubliée.
  - Les exclusions (`EXCL`, `blk`, `KFLAG`) se lisent sur la mémoire : oublier Cœur de Soleil rouvre la lanterne lancée ; oublier l’option A d’un majeur rouvre l’option B.
  - Pas de cascade : un oubli ne coûte jamais qu’un souvenir.
- Avantages : l’arbre reste une carte de ce qu’on a vécu, la mémoire ce qu’on porte ; aucun oubli en chaîne ; les règles actuelles changent de source (traces ou mémoire), pas de forme.
- Risques : on peut « faire tourner » une branche pour gagner un majeur puis oublier ses mineurs : c’est voulu, mais les majeurs deviennent plus faciles qu’aujourd’hui. Rouvrir l’option B d’un majeur permet de prendre A puis B dans la même run (à interdire si on veut garder le dilemme : une paire « tracée » reste close). Un talent éteint est une place morte : l’écran d’oubli doit le signaler.

### D5. Quel effet sur l’Accoutumance ?

- Options :
  - (a) **inchangée** : elle regarde comment tu fais mal, la réserve regarde ce que tu as laissé ;
  - (b) Accoutumance par famille de souvenirs actifs ;
  - (c) un souvenir donné à la Brume fait baisser l’Accoutumance (elle « digère »).
- **Recommandation : (a) pour ce chantier**, avec deux garde-fous : mesurer la part de mécanique avant/après la mémoire, et ne pas compter dans l’Accoutumance les dégâts infligés à un Masqué qui porte un souvenir (pour ne pas punir deux fois la même salle).
- Avantages : deux systèmes lisibles et distincts ; les Résonances de la zone L ne changent pas.
- Risques : avec 6 souvenirs, les builds se resserrent sur la mécanique de la forme ; l’Accoutumance montera plus vite et s’ajoutera au Masqué et aux contre-mesures. Si la mesure le confirme, abaisser le gain (`clamp((part − seuil) × 1,25 …)`) ou relever le seuil de 40 %.

### D6. Effets à usage unique : Boussole brisée, Mèche de Phénix

- **Recommandation :** la Boussole brisée devient un consommable : son effet s’applique et elle n’entre ni en mémoire ni dans la réserve. La Mèche de Phénix est un souvenir tant qu’elle n’a pas servi ; quand elle te relève, elle se consume et libère sa place (elle ne va pas dans la réserve).
- Avantages : pas de place morte ; un moment fort à la renaissance.
- Risques : la Boussole devient un choix gratuit (+2 relances) : à rééquilibrer si elle est toujours prise.

### D7. L’écran d’oubli

- **Recommandation :** on choisit d’abord le gain (cartes de talents, reliques), puis le souvenir à oublier parmi les 6, avec trois issues : oublier un souvenir, **renoncer au gain** (le gain est perdu, rien ne part dans la réserve), ou « Plus tard » pour un niveau. Chaque souvenir affiche son icône de famille, son rang, et ce qu’il deviendra dans la Brume (« Le Masqué pourra lancer ta Nova »). Un souvenir éteint est signalé.
- Risques : un écran de plus à chaque niveau ; il doit se lire d’un coup d’œil (icônes, une ligne par souvenir).

### D8. Le Brumeux lit-il la mémoire ?

- Options : (a) non, les contre-mesures restent liées au profil de jeu ; (b) la mémoire active pèse sur leur choix (trois souvenirs de projectile : Traque) ; (c) la réserve seule y pèse.
- **Recommandation : (a) pour ce palier**, (b) à étudier quand le Masqué puisera dans la réserve. Remettre à zéro les références (`base`) des contre-mesures à la mise en service de la mémoire, car les builds ne seront plus comparables.
- Risque : trois systèmes (contre-mesures, Accoutumance, réserve) qui visent le même joueur ; à garder distincts dans les messages.

### D9. Le Masqué rend-il le souvenir qu’il porte ?

- Pour le palier « Masqué » : quand un Masqué porte un de tes souvenirs, sa mort te propose de le **reprendre** (gain normal, donc oubli si la mémoire est pleine) à la place de la relique.
- **Recommandation : oui, à ce palier-là**, et le souvenir repris sort de la réserve.
- Avantages : une boucle « perdre, affronter, reprendre » ; une raison de chasser le Masqué au lieu de le subir.
- Risques : boucle d’oubli/reprise pour soigner (voir § 6) ; récompense qui ne vaut rien si le souvenir était faible.

### D10. La réserve de la Brume : par run ou persistante ?

- **Recommandation : par run pour commencer** (`RUN.reserve`), vidée à la fin. La persistance (némésis, Masqué promu) viendra avec l’idée « némésis » déjà notée.
- Risque : sans persistance, la réserve est vide en début de run : le Masqué de l’acte I puise encore dans ses capacités d’origine. C’est une montée en charge naturelle.

---

## 4. Schéma de données « souvenir »

Proposition : un fichier `data/souvenirs.js` (même modèle que les autres données : lu par le jeu et le wiki), qui **ne recopie pas** les talents et les reliques mais les rattache par leur id. Les ids des talents (`br_slot`) et des reliques ne se recouvrent pas aujourd’hui (vérifié sur les 240 talents et 34 reliques) ; le champ `source` lève toute ambiguïté future.

```js
// data/souvenirs.js · à venir (palier « mémoire »), exemple de forme
(function(D){D.souvenirs={
 plafond:6,                                  // souvenirs actifs
 // Familles : nom, icône (data/icones.js), forme de zone de la version ennemie (unique par famille)
 familles:{
  onde:{n:'Onde',ic:'u_wave',forme:'anneau',adj:{m:'vibrant',f:'vibrante'}},
  // …
 },
 // Rattachement : id du talent ou de la relique → famille (et réglages propres, au besoin)
 talents:{ray_n4:{f:'onde'}, /* … les 240 */},
 reliques:{bell:{f:'onde'}, boussole:{f:'fortune',consommable:true}, phoenix:{f:'soin',seConsume:true}, /* … les 34 */},
 // Version ennemie (palier Masqué) : ce que la Brume fait d’un souvenir oublié
 ennemi:{
  ray_n4:{capacite:'nova',n:'Nova volée',forme:'anneau',menace:2,chargeS:0.7,degats:1.3,parRang:{degats:0.2},
   glas:null,           // palier Glas Originel : attaque qu’il en tire
   dernier:null}        // palier Dernier Souvenir : effet quand le joueur le brûle
 }
};})(window.BRUME_DATA=window.BRUME_DATA||{});
```

Champs d’un souvenir (vue calculée en jeu, à partir des données ci-dessus et de `talents.js` / `reliques.js`) :

| Champ | Type | Origine | Rôle |
|---|---|---|---|
| `id` | texte | `talents.noeuds` ou `reliques` | Clé du talent ou de la relique. |
| `source` | `'talent'` \| `'relique'` | — | Où lire nom, texte, effet. |
| `forme` | `lum` \| `gou` \| `her` \| `tis` \| `null` | `branches[br].cls`, `reliques.cls` | Une relique commune n’a pas de forme. |
| `genre` | `m` `s` `x` `k` `c` `u` (ultime) `r` (relique) | `noeuds.k` | Règles d’oubli (racine de voie, ultime). |
| `famille` | id de famille | `souvenirs.talents` / `.reliques` | Icône, version ennemie, regroupements. |
| `icone` | nom `u_*` | famille (icône propre en option) | Affichage image d’abord. |
| `rangs` | `{max, actuel}` | `noeuds.max`, `P.ranks` | Le rang voyage avec le souvenir (D3). |
| `etat` | `actif` \| `eteint` \| `oublie` | calculé | Éteint : compétence liée ou racine de voie absente (D4). |
| `ennemi` | objet ou `null` | `souvenirs.ennemi` | Capacité de Masqué, puis attaque du Glas, puis Dernier Souvenir. |
| `consommable`, `seConsume` | booléens | `souvenirs.reliques` | Hors mémoire (Boussole) ; libère sa place après usage (Mèche de Phénix). |

État de run proposé (rien n’est persistant pour l’instant) :

```js
RUN.memoire={
 actifs:[{id:'ray_n4',source:'talent',rang:2,depuis:{acte:1,salle:3}}],   // 6 au plus, dans l’ordre d’acquisition
 traces:['ray_n1','ray_n2','ray_n4'],                                      // tout ce qui a été pris (D4)
 reserve:[{id:'ray_n2',source:'talent',rang:3,oublie:{acte:1,salle:6},porte:0}],  // porte : fois où la Brume l’a joué
 renonces:0                                                                // gains refusés (statistique)
};
```

Recalcul (voir § 1.2) : une fonction unique `recalculer()` reconstruit `P.s` à partir de `baseStats`, de la méta, de `RUN.memoire.actifs` (ordre et rangs), puis de l’équipement porté, sans soin ni effet de départ. Elle remplace les mises à jour incrémentales de `takeNode` et `applyRelic` dès qu’un oubli a lieu, et doit donner exactement les mêmes statistiques que le chemin incrémental tant qu’aucun oubli n’a eu lieu (test à écrire, comme `sim-masque.mjs`).

---

## 5. Familles de souvenirs

Le critère : **une famille regroupe ce que la Brume pourra en faire contre toi.** Elle décide de l’icône, de la forme de zone de la version ennemie (une forme par capacité, règle du Masqué) et, plus tard, de l’attaque du Glas et de l’effet du Dernier Souvenir. Le talent est rangé selon ce qu’il **fait**, pas selon ce qui le déclenche (Digestion explosive : une explosion, donc Onde).

| Famille | Icône | Ce qu’elle regroupe | Version ennemie candidate (Masqué) | Glas Originel (plus tard) |
|---|---|---|---|---|
| Projectile | `u_volley` | Ce qui part de toi et voyage : aiguilles, éclats, lancers et rappels de lanterne, Recracher, crachats | Salve (rayons) : capacité existante, nourrie de ta forme (aiguilles, globs) | Spirale aux projectiles du joueur |
| Faisceau | à dessiner | Rayons continus ou en ligne : Faisceau, rayons, Lance de jour, Jet pénétrant, Ventre-Canon, phares | Nouvelle forme « ligne » : un rayon fixe qui pivote lentement | Faisceaux qui reprennent le tracé du joueur |
| Lame | `u_blade` | Corps à corps : taillade, Mâchoire, Coup de cloche, coups de lanterne | Lame (cône) : existante | — |
| Ruée | `u_charge` | Mouvement offensif : esquive qui blesse, Ruée, Lame de Nuit, Pas de danse | Charge (couloir) : existante | — |
| Onde | `u_wave` | Zone autour de soi : Nova, ondes, Volée, explosions, Rupture | Onde (anneau) ou Explosion (disque) : existantes | Couronne |
| Sol | `u_grid` | Zones posées qui durent : flaques, toiles, pistes de danse, lanterne posée, sol funèbre | Nouvelle forme « taches » : flaques qui restent (le damier est déjà la signature du Voilé) | Sol du Cœur qui se couvre de tes zones |
| Fil | à dessiner | Attacher, tirer, pantins | Nouvelle forme « fil » : un lien vers toi, qui te tire au lâcher | — |
| Cloche | à dessiner | Rythme : cloches posées, Grand Glas, temps forts, Cadence, Résonance, choristes | Nouvelle forme « cercles » : cloches qui tombent sur ta position, au rythme | Il sonne avec tes cloches |
| Dévoration | à dessiner | Dévorer, attirer, engloutir, Corruption | Nouvelle forme « tourbillon » : il t’aspire vers lui | Dévoreuse renforcée |
| Lumière | `u_star` | Aura, exposition, Lueur, brûlure de lumière | État : il t’expose (tu subis +X %) dans un halo visible | — |
| Ombre | `u_ghost` | Obscur, invisibilité, critiques dans l’ombre | État : il disparaît par instants (comme un Voilé), reparaît pour frapper | — |
| Soin | `u_heart` | Soins, vol de vie, renaissance | État : il se soigne (halo vert annoncé) ou réduit tes soins (Brume avide) | — |
| Garde | `u_shield` | Boucliers, réduction de dégâts, PV max, épines | État : carapace (dégâts subis réduits, signal visible) | — |
| Fureur | `u_fist` | Statistiques offensives brutes : dégâts, vitesse d’attaque, critique, mutations | Passif : enragé (plus rapide, plus fort), icône sur son nom | — |
| Fortune | `u_coin` | Or, relances, Colporteur | Passif : il vole ton or au contact ou garde une relance | — |

Les neuf premières familles ont un **geste** (une zone à lire) ; Lumière, Ombre, Soin et Garde posent un **état** ; Fureur et Fortune sont **sans geste** : leur version ennemie ne peut être qu’un passif, et elles sont de bonnes candidates pour le « Dernier Souvenir » (brûler un bonus de statistique pour un effet instantané).

Répartition (talents par forme, reliques) :

| Famille | Lumenarque | Gouffre | Héraut | Tisse-Destin | Talents | Reliques |
|---|---|---|---|---|---|---|
| Projectile | 10 | 8 | 1 | 20 | 39 | 2 |
| Faisceau | 8 | 2 | 0 | 0 | 10 | 1 |
| Lame | 3 | 5 | 6 | 0 | 14 | 0 |
| Ruée | 7 | 3 | 5 | 0 | 15 | 3 |
| Onde | 4 | 5 | 7 | 2 | 18 | 1 |
| Sol | 8 | 3 | 8 | 11 | 30 | 0 |
| Fil | 0 | 0 | 0 | 25 | 25 | 2 |
| Cloche | 0 | 0 | 27 | 0 | 27 | 3 |
| Dévoration | 0 | 19 | 0 | 0 | 19 | 0 |
| Lumière | 10 | 0 | 0 | 0 | 10 | 2 |
| Ombre | 10 | 0 | 0 | 0 | 10 | 0 |
| Soin | 0 | 1 | 2 | 1 | 4 | 5 |
| Garde | 0 | 8 | 3 | 1 | 12 | 5 |
| Fureur | 0 | 6 | 1 | 0 | 7 | 6 |
| Fortune | 0 | 0 | 0 | 0 | 0 | 4 |
| **Total** | 60 | 60 | 60 | 60 | 240 | 34 |

Lecture : Fil, Cloche, Dévoration, Lumière et Ombre n’existent que dans une forme ; c’est cohérent (la Brume retourne *tes* souvenirs), mais un Masqué ne montrera ces familles qu’à la forme concernée. Soin et Fortune sont presque vides côté talents : ces familles vivent surtout des reliques.

### 5.1 Classement des talents

#### Le Lumenarque

| Branche | Talent | Genre | Rangs | Famille |
|---|---|---|---|---|
| Rayonnement | Faisceau chargé `ray_n1` | mineur | 3 | Faisceau |
| Rayonnement | Lueur d’aplomb `ray_n2` | mineur | 3 | Lumière |
| Rayonnement | Aube Brûlante `ray_n3` | compétence | 2 | Lumière |
| Rayonnement | Nova `ray_n4` | compétence | 2 | Onde |
| Rayonnement | Aura vive `ray_n5` | mineur | 3 | Lumière |
| Rayonnement | Plein feu `ray_n6` | mineur | 3 | Lumière |
| Rayonnement | Prisme vivant `ray_x1a` | majeur A | 1 | Faisceau |
| Rayonnement | Lance de jour `ray_x1b` | majeur B | 1 | Faisceau |
| Rayonnement | Triple pulsation `ray_x2a` | majeur A | 1 | Onde |
| Rayonnement | Soleil posé `ray_x2b` | majeur B | 1 | Sol |
| Rayonnement | Coup d’aurore `ray_x3a` | majeur A | 1 | Projectile |
| Rayonnement | Frappe solaire `ray_x3b` | majeur B | 1 | Lame |
| Rayonnement | Cœur de Soleil `ray_k1` | nœud clé | 1 | Lumière |
| Rayonnement | Surcharge `ray_k2` | nœud clé | 1 | Lumière |
| Pénombre | Estoc `pen_n1` | mineur | 3 | Lame |
| Pénombre | Image rémanente `pen_n2` | mineur | 3 | Ruée |
| Pénombre | Pas d’Ombre `pen_n3` | compétence | 2 | Ruée |
| Pénombre | Lame de Nuit `pen_n4` | compétence | 2 | Ruée |
| Pénombre | Souffle d’ombre `pen_n5` | mineur | 3 | Ombre |
| Pénombre | Silhouette `pen_n6` | compétence | 2 | Ombre |
| Pénombre | Taillade croisée `pen_x1a` | majeur A | 1 | Lame |
| Pénombre | Onde d’ombre `pen_x1b` | majeur B | 1 | Projectile |
| Pénombre | Lame en chaîne `pen_x2a` | majeur A | 1 | Ruée |
| Pénombre | Lame fantôme `pen_x2b` | majeur B | 1 | Ruée |
| Pénombre | Danse d’ombre `pen_x3a` | majeur A | 1 | Ruée |
| Pénombre | Fente d’ombre `pen_x3b` | majeur B | 1 | Ruée |
| Pénombre | Enfant de la Nuit `pen_k1` | nœud clé | 1 | Ombre |
| Pénombre | Marque du Crépuscule `pen_k2` | nœud clé | 1 | Ombre |
| Fanal | Atterrissage `fan_n1` | mineur | 3 | Projectile |
| Fanal | Lanterne brûlante `fan_n2` | mineur | 3 | Sol |
| Fanal | Lanterne Ricochante `fan_n3` | compétence | 2 | Projectile |
| Fanal | Gardienne `fan_n4` | compétence | 2 | Projectile |
| Fanal | Rappel vif `fan_n5` | mineur | 3 | Projectile |
| Fanal | Rappel Fracassant `fan_n6` | compétence | 2 | Projectile |
| Fanal | Boomerang `fan_x1a` | majeur A | 1 | Projectile |
| Fanal | Lanterne-mine `fan_x1b` | majeur B | 1 | Sol |
| Fanal | Gardienne en rafale `fan_x2a` | majeur A | 1 | Projectile |
| Fanal | Phare `fan_x2b` | majeur B | 1 | Lumière |
| Fanal | Rappel brûlant `fan_x3a` | majeur A | 1 | Sol |
| Fanal | Fil de lumière `fan_x3b` | majeur B | 1 | Faisceau |
| Fanal | Lanterne Vivante `fan_k1` | nœud clé | 1 | Onde |
| Fanal | Constellation `fan_k2` | nœud clé | 1 | Faisceau |
| Soleil Noir (voie) | Soleil Noir `sol_s1` | racine de voie | 1 | Lumière |
| Soleil Noir (voie) | Feu sombre `sol_s2` | mineur | 3 | Lumière |
| Soleil Noir (voie) | Solstice `sol_s3` | mineur | 3 | Lumière |
| Soleil Noir (voie) | Rayons Jumeaux `sol_s4` | compétence | 2 | Faisceau |
| Soleil Noir (voie) | Couronne Solaire `sol_s5` | compétence | 2 | Onde |
| Soleil Noir (voie) | Zénith `sol_sk` | ultime [F] | 1 | Faisceau |
| Ombrelame (voie) | Ombrelame `omb_s1` | racine de voie | 1 | Ombre |
| Ombrelame (voie) | Lame fantôme `omb_s2` | mineur | 3 | Ombre |
| Ombrelame (voie) | Voile `omb_s3` | mineur | 3 | Ombre |
| Ombrelame (voie) | Danse des Ombres `omb_s4` | compétence | 2 | Ombre |
| Ombrelame (voie) | Ombres Jumelles `omb_s5` | compétence | 2 | Ombre |
| Ombrelame (voie) | Nuit Éternelle `omb_sk` | ultime [F] | 1 | Ombre |
| Gardien du Phare (voie) | Gardien du Phare `pha_s1` | racine de voie | 1 | Sol |
| Gardien du Phare (voie) | Huile de baleine `pha_s2` | mineur | 3 | Sol |
| Gardien du Phare (voie) | Lentille de Fresnel `pha_s3` | mineur | 3 | Sol |
| Gardien du Phare (voie) | Feu de position `pha_s4` | compétence | 2 | Projectile |
| Gardien du Phare (voie) | Corne de brume `pha_s5` | compétence | 2 | Sol |
| Gardien du Phare (voie) | Phare Tournant `pha_sk` | ultime [F] | 1 | Faisceau |

#### Le Gouffre

| Branche | Talent | Genre | Rangs | Famille |
|---|---|---|---|---|
| Voracité | Gorgée `vor_n1` | mineur | 3 | Dévoration |
| Voracité | Digestion rapide `vor_n2` | mineur | 3 | Dévoration |
| Voracité | Gueule Béante `vor_n3` | compétence | 2 | Dévoration |
| Voracité | Festin `vor_n4` | compétence | 2 | Dévoration |
| Voracité | Bouche pleine `vor_n5` | mineur | 3 | Dévoration |
| Voracité | Sucs Gastriques `vor_n6` | compétence | 2 | Dévoration |
| Voracité | Tourbillon `vor_x1a` | majeur A | 1 | Dévoration |
| Voracité | Mâchoire profonde `vor_x1b` | majeur B | 1 | Dévoration |
| Voracité | Banquet `vor_x2a` | majeur A | 1 | Dévoration |
| Voracité | Gourmandise `vor_x2b` | majeur B | 1 | Dévoration |
| Voracité | Digestion explosive `vor_x3a` | majeur A | 1 | Onde |
| Voracité | Gueule blindée `vor_x3b` | majeur B | 1 | Garde |
| Voracité | Faim Éternelle `vor_k1` | nœud clé | 1 | Dévoration |
| Voracité | Estomac sans Fond `vor_k2` | nœud clé | 1 | Dévoration |
| Difformité | Mâchoire de fer `dif_n1` | mineur | 3 | Lame |
| Difformité | Ruée dévorante `dif_n2` | mineur | 3 | Ruée |
| Difformité | Bras de Brume `dif_n3` | compétence | 2 | Lame |
| Difformité | Carapace `dif_n4` | compétence | 2 | Garde |
| Difformité | Peau épaisse `dif_n5` | mineur | 3 | Garde |
| Difformité | Frénésie `dif_n6` | compétence | 2 | Fureur |
| Difformité | Double croc `dif_x1a` | majeur A | 1 | Lame |
| Difformité | Morsure arrachée `dif_x1b` | majeur B | 1 | Lame |
| Difformité | Ruée-carapace `dif_x2a` | majeur A | 1 | Ruée |
| Difformité | Ruée écrasante `dif_x2b` | majeur B | 1 | Ruée |
| Difformité | Carapace conquérante `dif_x3a` | majeur A | 1 | Garde |
| Difformité | Carapace explosive `dif_x3b` | majeur B | 1 | Onde |
| Difformité | Colosse `dif_k1` | nœud clé | 1 | Garde |
| Difformité | Mutation Instable `dif_k2` | nœud clé | 1 | Fureur |
| Régurgitation | Reflux `reg_n1` | mineur | 3 | Projectile |
| Régurgitation | Crachat collant `reg_n2` | mineur | 3 | Projectile |
| Régurgitation | Bile Acide `reg_n3` | compétence | 2 | Sol |
| Régurgitation | Jet précis `reg_n4` | mineur | 3 | Projectile |
| Régurgitation | Acidité durable `reg_n5` | mineur | 3 | Sol |
| Régurgitation | Crachats `reg_n6` | compétence | 2 | Projectile |
| Régurgitation | Gerbe `reg_x1a` | majeur A | 1 | Projectile |
| Régurgitation | Jet pénétrant `reg_x1b` | majeur B | 1 | Faisceau |
| Régurgitation | Bile persistante `reg_x2a` | majeur A | 1 | Sol |
| Régurgitation | Rupture contrôlée `reg_x2b` | majeur B | 1 | Onde |
| Régurgitation | Salive acide `reg_x3a` | majeur A | 1 | Projectile |
| Régurgitation | Crachat balistique `reg_x3b` | majeur B | 1 | Projectile |
| Régurgitation | Rupture Maîtrisée `reg_k1` | nœud clé | 1 | Onde |
| Régurgitation | Ventre-Canon `reg_k2` | nœud clé | 1 | Faisceau |
| Saint Dévorant (voie) | Saint Dévorant `sai_s1` | racine de voie | 1 | Garde |
| Saint Dévorant (voie) | Sainte Bile `sai_s2` | mineur | 3 | Projectile |
| Saint Dévorant (voie) | Jeûne `sai_s3` | mineur | 3 | Garde |
| Saint Dévorant (voie) | Halo de Purification `sai_s4` | compétence | 2 | Onde |
| Saint Dévorant (voie) | Communion `sai_s5` | compétence | 2 | Soin |
| Saint Dévorant (voie) | Absolution `sai_sk` | ultime [F] | 1 | Dévoration |
| Aberration (voie) | Aberration `abe_s1` | racine de voie | 1 | Fureur |
| Aberration (voie) | Chair malléable `abe_s2` | mineur | 3 | Fureur |
| Aberration (voie) | Os saillants `abe_s3` | mineur | 3 | Garde |
| Aberration (voie) | Tentacules `abe_s4` | compétence | 2 | Lame |
| Aberration (voie) | Yeux multiples `abe_s5` | compétence | 2 | Fureur |
| Aberration (voie) | Métamorphose `abe_sk` | ultime [F] | 1 | Fureur |
| Gueule-Abîme (voie) | Gueule-Abîme `aby_s1` | racine de voie | 1 | Dévoration |
| Gueule-Abîme (voie) | Estomac sans fond `aby_s2` | mineur | 3 | Dévoration |
| Gueule-Abîme (voie) | Mâchoires larges `aby_s3` | mineur | 3 | Dévoration |
| Gueule-Abîme (voie) | Avaleur de Brume `aby_s4` | compétence | 2 | Dévoration |
| Gueule-Abîme (voie) | Engloutir `aby_s5` | compétence | 2 | Dévoration |
| Gueule-Abîme (voie) | Gueule du Monde `aby_sk` | ultime [F] | 1 | Dévoration |

#### Le Héraut du Glas

| Branche | Talent | Genre | Rangs | Famille |
|---|---|---|---|---|
| Carillon | Résonance prolongée `car_n1` | mineur | 3 | Onde |
| Carillon | Cloche vive `car_n2` | mineur | 3 | Cloche |
| Carillon | Ondes Rebondissantes `car_n3` | compétence | 2 | Onde |
| Carillon | Carillon `car_n4` | compétence | 2 | Cloche |
| Carillon | Timbre clair `car_n5` | mineur | 2 | Cloche |
| Carillon | Accord Parfait `car_n6` | compétence | 2 | Onde |
| Carillon | Cascade `car_x1a` | majeur A | 1 | Onde |
| Carillon | Volée sourde `car_x1b` | majeur B | 1 | Onde |
| Carillon | Cloches orbitales `car_x2a` | majeur A | 1 | Cloche |
| Carillon | Cloche majeure `car_x2b` | majeur B | 1 | Cloche |
| Carillon | Écho de bronze `car_x3a` | majeur A | 1 | Cloche |
| Carillon | Résonance de garde `car_x3b` | majeur B | 1 | Cloche |
| Carillon | Bourdon `car_k1` | nœud clé | 1 | Onde |
| Carillon | Tocsin `car_k2` | nœud clé | 1 | Cloche |
| Cadence | Attaque nette `cad_n1` | mineur | 3 | Cloche |
| Cadence | Pas léger `cad_n2` | mineur | 3 | Ruée |
| Cadence | Pas de Valse `cad_n3` | compétence | 2 | Ruée |
| Cadence | Point d’orgue `cad_n4` | compétence | 2 | Cloche |
| Cadence | Oreille fine `cad_n5` | mineur | 3 | Cloche |
| Cadence | Syncope `cad_n6` | compétence | 2 | Cloche |
| Cadence | Frappe jumelée `cad_x1a` | majeur A | 1 | Lame |
| Cadence | Onde longue `cad_x1b` | majeur B | 1 | Projectile |
| Cadence | Pas glissé `cad_x2a` | majeur A | 1 | Ruée |
| Cadence | Pas-écho `cad_x2b` | majeur B | 1 | Ruée |
| Cadence | Orgue étendu `cad_x3a` | majeur A | 1 | Cloche |
| Cadence | Orgue de combat `cad_x3b` | majeur B | 1 | Garde |
| Cadence | Furioso `cad_k1` | nœud clé | 1 | Lame |
| Cadence | Danse Macabre `cad_k2` | nœud clé | 1 | Ruée |
| Requiem | Glas rapide `req_n1` | mineur | 3 | Cloche |
| Requiem | Deuil `req_n2` | mineur | 3 | Cloche |
| Requiem | Chant des Morts `req_n3` | compétence | 2 | Onde |
| Requiem | Sonnerie aux Morts `req_n4` | compétence | 2 | Soin |
| Requiem | Âmes errantes `req_n5` | mineur | 3 | Cloche |
| Requiem | Cortège `req_n6` | compétence | 2 | Sol |
| Requiem | Glas double `req_x1a` | majeur A | 1 | Cloche |
| Requiem | Glas ancré `req_x1b` | majeur B | 1 | Cloche |
| Requiem | Glas protecteur `req_x2a` | majeur A | 1 | Garde |
| Requiem | Tocsin vengeur `req_x2b` | majeur B | 1 | Cloche |
| Requiem | Fosse commune `req_x3a` | majeur A | 1 | Sol |
| Requiem | Glas de guerre `req_x3b` | majeur B | 1 | Soin |
| Requiem | Glas des Âmes `req_k1` | nœud clé | 1 | Cloche |
| Requiem | Pacte du Sonneur `req_k2` | nœud clé | 1 | Fureur |
| Dernier Glas (voie) | Dernier Glas `dgl_s1` | racine de voie | 1 | Lame |
| Dernier Glas (voie) | Glas sourd `dgl_s2` | mineur | 3 | Cloche |
| Dernier Glas (voie) | Main lourde `dgl_s3` | mineur | 3 | Lame |
| Dernier Glas (voie) | Coup de Grâce `dgl_s4` | compétence | 2 | Lame |
| Dernier Glas (voie) | Temps Fort `dgl_s5` | compétence | 2 | Lame |
| Dernier Glas (voie) | Glas Funèbre `dgl_sk` | ultime [F] | 1 | Cloche |
| Chœur des Damnés (voie) | Chœur des Damnés `chd_s1` | racine de voie | 1 | Cloche |
| Chœur des Damnés (voie) | Voix d’outre-tombe `chd_s2` | mineur | 3 | Cloche |
| Chœur des Damnés (voie) | Chœur nombreux `chd_s3` | mineur | 3 | Cloche |
| Chœur des Damnés (voie) | Unisson `chd_s4` | compétence | 2 | Cloche |
| Chœur des Damnés (voie) | Contre-chant `chd_s5` | compétence | 2 | Garde |
| Chœur des Damnés (voie) | Requiem `chd_sk` | ultime [F] | 1 | Cloche |
| Valseur Funèbre (voie) | Valseur Funèbre `val_s1` | racine de voie | 1 | Sol |
| Valseur Funèbre (voie) | Talons ferrés `val_s2` | mineur | 3 | Sol |
| Valseur Funèbre (voie) | Grand salon `val_s3` | mineur | 3 | Sol |
| Valseur Funèbre (voie) | Ronde `val_s4` | compétence | 2 | Sol |
| Valseur Funèbre (voie) | Révérence `val_s5` | compétence | 2 | Sol |
| Valseur Funèbre (voie) | Bal des Morts `val_sk` | ultime [F] | 1 | Sol |

#### Le Tisse-Destin

| Branche | Talent | Genre | Rangs | Famille |
|---|---|---|---|---|
| Trame | Fil d’amorce `trm_n1` | mineur | 3 | Fil |
| Trame | Fil souple `trm_n2` | mineur | 3 | Fil |
| Trame | Fil Tranchant `trm_n3` | compétence | 2 | Fil |
| Trame | Tension croissante `trm_n4` | mineur | 3 | Fil |
| Trame | Ourdissoir `trm_n5` | mineur | 2 | Fil |
| Trame | Fil de Vie `trm_n6` | compétence | 2 | Soin |
| Trame | Fil étendu `trm_x1a` | majeur A | 1 | Fil |
| Trame | Fil explosif `trm_x1b` | majeur B | 1 | Fil |
| Trame | Arrachage en chaîne `trm_x2a` | majeur A | 1 | Fil |
| Trame | Rembobinage `trm_x2b` | majeur B | 1 | Fil |
| Trame | Bobine généreuse `trm_x3a` | majeur A | 1 | Fil |
| Trame | Tisserand fou `trm_x3b` | majeur B | 1 | Fil |
| Trame | Destin Lié `trm_k1` | nœud clé | 1 | Fil |
| Trame | Fil Rouge `trm_k2` | nœud clé | 1 | Fil |
| Aiguilles | Cadence tressée `aig_n1` | mineur | 3 | Projectile |
| Aiguilles | Pelote `aig_n2` | mineur | 3 | Projectile |
| Aiguilles | Piqûre ricochet `aig_n3` | mineur | 3 | Projectile |
| Aiguilles | Pluie d’aiguilles `aig_n4` | compétence | 2 | Projectile |
| Aiguilles | Saignée `aig_n5` | mineur | 3 | Projectile |
| Aiguilles | Aiguilles Chercheuses `aig_n6` | compétence | 2 | Projectile |
| Aiguilles | Éventail `aig_x1a` | majeur A | 1 | Projectile |
| Aiguilles | Aiguille perçante `aig_x1b` | majeur B | 1 | Projectile |
| Aiguilles | Double salve `aig_x2a` | majeur A | 1 | Projectile |
| Aiguilles | Pluie ciblée `aig_x2b` | majeur B | 1 | Projectile |
| Aiguilles | Essaim `aig_x3a` | majeur A | 1 | Projectile |
| Aiguilles | Chasseresse `aig_x3b` | majeur B | 1 | Projectile |
| Aiguilles | Mille Points `aig_k1` | nœud clé | 1 | Projectile |
| Aiguilles | Aiguille du Destin `aig_k2` | nœud clé | 1 | Projectile |
| Pantins | Soie vive `pnt_n1` | mineur | 3 | Sol |
| Pantins | Pantin tenace `pnt_n2` | mineur | 3 | Fil |
| Pantins | Pantin `pnt_n3` | compétence | 2 | Fil |
| Pantins | Toile `pnt_n4` | compétence | 2 | Sol |
| Pantins | Étranglement `pnt_n5` | compétence | 2 | Fil |
| Pantins | Bouclier de Chair `pnt_n6` | compétence | 2 | Garde |
| Pantins | Toile aimantée `pnt_x1a` | majeur A | 1 | Sol |
| Pantins | Toile-piège `pnt_x1b` | majeur B | 1 | Sol |
| Pantins | Théâtre de marionnettes `pnt_x2a` | majeur A | 1 | Fil |
| Pantins | Pantin explosif `pnt_x2b` | majeur B | 1 | Onde |
| Pantins | Atterrissage tissé `pnt_x3a` | majeur A | 1 | Sol |
| Pantins | Toile mortelle `pnt_x3b` | majeur B | 1 | Sol |
| Pantins | Danse des Pendus `pnt_k1` | nœud clé | 1 | Fil |
| Pantins | Contrôle Total `pnt_k2` | nœud clé | 1 | Fil |
| Grande Tisseuse (voie) | Grande Tisseuse `gts_s1` | racine de voie | 1 | Sol |
| Grande Tisseuse (voie) | Soie durable `gts_s2` | mineur | 3 | Sol |
| Grande Tisseuse (voie) | Soie collante `gts_s3` | mineur | 3 | Sol |
| Grande Tisseuse (voie) | Toile Piégée `gts_s4` | compétence | 2 | Sol |
| Grande Tisseuse (voie) | Araignée `gts_s5` | compétence | 2 | Fil |
| Grande Tisseuse (voie) | Grande Toile `gts_sk` | ultime [F] | 1 | Sol |
| Maître des Pantins (voie) | Maître des Pantins `mdp_s1` | racine de voie | 1 | Fil |
| Maître des Pantins (voie) | Cordes neuves `mdp_s2` | mineur | 3 | Fil |
| Maître des Pantins (voie) | Troupe `mdp_s3` | mineur | 3 | Fil |
| Maître des Pantins (voie) | Fils de Commande `mdp_s4` | compétence | 2 | Fil |
| Maître des Pantins (voie) | Sacrifice `mdp_s5` | compétence | 2 | Onde |
| Maître des Pantins (voie) | Grand Guignol `mdp_sk` | ultime [F] | 1 | Fil |
| Brodeuse d’Âmes (voie) | Brodeuse d’Âmes `bro_s1` | racine de voie | 1 | Projectile |
| Brodeuse d’Âmes (voie) | Acier fin `bro_s2` | mineur | 3 | Projectile |
| Brodeuse d’Âmes (voie) | Point serré `bro_s3` | mineur | 3 | Projectile |
| Brodeuse d’Âmes (voie) | Dé à coudre `bro_s4` | compétence | 2 | Projectile |
| Brodeuse d’Âmes (voie) | Faufilage `bro_s5` | compétence | 2 | Projectile |
| Brodeuse d’Âmes (voie) | Temps Suspendu `bro_sk` | ultime [F] | 1 | Projectile |

### 5.2 Classement des reliques

| Relique | Réservée à | Forge | Effet | Famille |
|---|---|---|---|---|
| Mèche de Phénix `phoenix` | toutes | 50 ✦ | Une fois par run, tu renais avec 50 % de tes PV. | Soin |
| Cloche fêlée `bell` | toutes | d’emblée | Tous les 5 coups de base, une onde de choc (30 dégâts) autour de toi. | Onde |
| Œil de verre `eye` | toutes | d’emblée | +10 % de critique et +25 % de dégâts critiques. | Fureur |
| Cœur de cire `wax` | toutes | d’emblée | +25 PV max. | Garde |
| Sablier d’ombre `sand` | toutes | d’emblée | Ton esquive gagne une charge supplémentaire. | Ruée |
| Plume de corbeau `feather` | toutes | d’emblée | +12 % de vitesse de déplacement. | Ruée |
| Prisme de garde `prismg` | toutes | d’emblée | Les projectiles ennemis ralentissent de 45 % dans ta lumière. | Lumière |
| Calice de Brume `calice` | toutes | 40 ✦ | 3 % des dégâts infligés te soignent. | Soin |
| Braise éternelle `ember` | toutes | 35 ✦ | Toutes les brûlures infligent +50 % de dégâts. | Fureur |
| Huile sainte `oil` | Lumenarque | d’emblée | Le Faisceau embrase les ennemis : 12 dégâts par seconde pendant 3 s. | Faisceau |
| Cendre d’étoile `ash` | Lumenarque | d’emblée | Chaque ennemi vaincu rend 6 Lueur. | Lumière |
| Chaîne du geôlier `chain` | Lumenarque | d’emblée | La lanterne lancée ou rappelée étourdit 0,7 s. | Projectile |
| Dent de Léviathan `dent` | Gouffre | d’emblée | +25 % de dégâts de Recracher. | Projectile |
| Cerclage de fer `cercle` | Gouffre | d’emblée | La Rupture ne t’inflige plus que la moitié de ses dégâts. | Garde |
| Moelle noire `moelle` | Gouffre | d’emblée | Chaque ennemi vaincu te rend 3 PV. | Soin |
| Crâne de rat `crane` | toutes | 30 ✦ | Chaque ennemi vaincu laisse 2 pièces d’or de plus. | Fortune |
| Couronne d’épines `epine` | toutes | 40 ✦ | +20 % de dégâts, mais −15 PV max. | Fureur |
| Clé du Colporteur `clef` | toutes | 35 ✦ | Le Colporteur propose une relique de plus, et ta première relance chez lui est gratuite. | Fortune |
| Bourse du Pendu `bourse` | toutes | 45 ✦ | +1 % de dégâts par tranche de 15 or en poche (+30 % max). | Fortune |
| Diapason d’argent `diapason` | Héraut | d’emblée | Ta fenêtre de mesure s’élargit de 30 ms. | Cloche |
| Battant de fer `battantr` | Héraut | d’emblée | +25 % de dégâts des ondes, des cloches et des choristes. | Cloche |
| Métronome du sonneur `metro` | Héraut | d’emblée | +2 Cadence max. Tu entres dans chaque salle avec au moins 3 de Cadence. | Cloche |
| Ciseaux de la Parque `ciseaux` | Tisse-Destin | d’emblée | +40 % de dégâts d’Arracher et des chocs. | Fil |
| Dé à coudre `dea` | Tisse-Destin | d’emblée | −20 % de dégâts subis tant qu’au moins un fil est noué. | Garde |
| Fuseau d’os `fuseau` | Tisse-Destin | d’emblée | +40 % de régénération de Bobine. | Fil |
| Gantelet du sonneur `gant` | toutes | d’emblée | +15 % de vitesse d’attaque. | Fureur |
| Fiole de sang tiède `fiole` | toutes | d’emblée | Chaque ennemi vaincu te rend 2 PV. | Soin |
| Ancre de brume `ancre` | toutes | d’emblée | −12 % de dégâts subis. | Garde |
| Pendule du beffroi `pendule` | toutes | d’emblée | Ton esquive se recharge 25 % plus vite. | Ruée |
| Os creux `os` | toutes | d’emblée | +10 PV max et +8 % de vitesse de déplacement. | Garde |
| Lacrymatoire `lacry` | toutes | d’emblée | +25 % de soins reçus. | Soin |
| Boussole brisée `boussole` | toutes | d’emblée | +2 relances de talents, tout de suite. | Fortune |
| Cierge votif `cierge` | toutes | 40 ✦ | +15 % de dégâts contre les gardiens. | Fureur |
| Chaîne de glas `chaineg` | toutes | 35 ✦ | Les ennemis étourdis subissent +25 % de dégâts. | Fureur |

---

## 6. Risques d’équilibrage

1. **Puissance plafonnée, ennemis qui montent.** Les ennemis gagnent 8,5 % de PV et 3 % de dégâts par salle (`montee`), plus les paliers (jusqu’à 8). Un build de 6 souvenirs sera bien plus faible qu’un build actuel en acte III : il faudra soit rendre chaque souvenir plus fort (rangs, valeurs), soit adoucir la montée. À mesurer avant de toucher aux nombres.
2. **Les mineurs perdent leur intérêt.** Beaucoup des 63 mineurs sont des pourcentages (+8 à +20 %) : à côté d’une compétence, ils ne valent pas une place, sauf comme marchepieds (D4) ou comme rangs (D3).
3. **Renforcer domine.** Si un rang ne coûte rien, les runs se figent sur 6 souvenirs montés au maximum ; si les rangs sont rares, on oublie sans cesse. Le réglage des poids de `rollOffers` est central.
4. **Inégalité entre formes.** Le Tisse-Destin vit de synergies (fil + aiguilles + toile + pantins : 25 talents Fil, 20 Projectile, 11 Sol) ; le Gouffre et ses 19 talents de Dévoration est plus autonome. Six places ne pèsent pas pareil sur chaque forme.
5. **Reliques déclassées.** 19 reliques sur 34 sont rangées en Fureur, Garde, Ruée ou Soin, presque toutes des bonus de statistiques. Contre un talent, elles seront refusées : les champions, autels, Brèches et le Colporteur perdent leur attrait, et la forge de Corbin aussi.
6. **Boucles d’abus.** Prendre puis oublier un talent de PV (le soin de `takeNode`), la Boussole (+2 relances), la Mèche de Phénix, et plus tard reprendre un souvenir au Masqué. Le recalcul ne doit jamais soigner ni rejouer un effet instantané.
7. **Majeurs trop faciles avec les traces.** Compter les traces rend le majeur 3 atteignable : bien, mais l’option B d’une paire déjà tracée ne doit pas se rouvrir (sinon A puis B dans la même run).
8. **Triple pression.** Accoutumance, contre-mesures et Masqué nourri de la réserve visent le même joueur ; un bon joueur rapide (que le Masqué vient chercher) qui oublie beaucoup (parce qu’il monte vite en niveau) affrontera beaucoup de ses propres souvenirs. La boucle doit rester un défi, pas une spirale : plafonner la part de la réserve dans le tirage du Masqué par acte.
9. **Réserve trop faible ou trop forte.** On oublie d’abord ce qui sert le moins : la version ennemie risque d’être faible et sans intérêt. Inversement, un ultime oublié deviendrait une capacité énorme. Il faudra un budget de menace par souvenir (comme `budgetMenace`) et un plafond par acte.
10. **Lisibilité.** Six souvenirs + quatre équipements + les compétences + l’ultime : le HUD doit rester une lecture d’icônes. Et chaque capacité de Masqué tirée d’un souvenir doit garder la règle « une forme = une capacité, toujours », zones rouges, chargement visible.
11. **Références du Brumeux.** Les verdicts des contre-mesures (`SAVE.mem.prof.eff`) et la référence des salles ordinaires ont été appris sans mémoire limitée : ils fausseront les premiers jugements.
12. **Ascension mémoire pleine.** Le Rituel arrive après le gardien de l’acte I, souvent mémoire pleine : un oubli forcé à ce moment-là peut être vécu comme une punition plutôt qu’une transformation. Le texte et l’écran doivent l’assumer (« ta nature change, quelque chose doit partir »).

---

## 7. Paliers suivants (indicatif)

1. **Mémoire** : plafond de 6, écran d’oubli, traces, recalcul, réserve vide de conséquences (on la voit se remplir). Instrumentation de fin de run. Wiki : section « Mémoire », familles dans les fiches de talents et de reliques.
2. **Masqué** : capacités tirées de la réserve (formes nouvelles : ligne, taches, fil, cercles, tourbillon), reprise du souvenir à sa mort, `sim-masque.mjs` étendu.
3. **Glas Originel** : attaques nourries de la réserve dans les temps 2 et 3.
4. **Dernier Souvenir** : brûler un souvenir en combat pour un effet unique ; il est perdu (ni mémoire ni réserve).

Chaque palier met à jour le wiki dans le même commit (`node themist/outils/wiki.mjs`, ou la section écrite à la main).

---

## 8. Palier 1 livré : v17.0 (22 octobre 2026)

Code : bloc « v17 · La Mémoire » à la fin d’`index.html` (enveloppe extérieure de `takeNode`, `applyRelic`, `buyItem`, `openAscension`, `nodeAvailable`, `rollOffers`, `treeState`, `nodeCaption`, `closeOverlay`, `playerDown`, `renderRelics`, `openPause`, `openEnd`). Données : `data/souvenirs.js` (plafond, consommables, refus, 15 familles avec leurs 240 talents et 34 reliques, d’après le § 5). Icônes nouvelles : `u_beam`, `u_thread`, `u_bell`, `u_maw`, `u_off`, `u_swap`. Arbre : états `t` (oublié, pointillé) et `off` (éteint) dans `data/arbre.js`.

État de run : `RUN.memoire` (`actifs`, `traces`, `eff` = souvenirs qui agissent, `base` = copie de `P.s` au départ, compteurs) et `RUN.reserveBrume` (`{id, source, rang, oublie:{acte,salle}, porte}`). Le jeu n’a pas d’objet `state` (c’est une chaîne : `'play'`, `'over'`…), d’où `RUN.reserveBrume`. Rien n’est affiché de la réserve, rien n’est persistant.

Recalcul : à chaque changement des souvenirs efficaces, équipement et sets ôtés, `P.s += rejeu(nouveaux) − rejeu(anciens)` clé par clé, puis équipement remis ; aucun soin. Test : rejeu sans effet de bord sur `P` pour les 240 talents et 34 reliques ; oubli comparé à une reconstruction complète (48 essais, avec et sans équipement) : identique.

Choix de ce palier non tranchés par D0–D10 :
- un souvenir oublié ne revient pas dans les offres de niveau ni dans les tirages de reliques (il appartient à la réserve ; D9 le rendra par le Masqué) ;
- renoncer à une relique sur l’écran d’oubli donne le soin du refus ; renoncer à un talent ne donne rien ;
- au Rituel mémoire pleine : oubli obligatoire, pas de renoncement (§ 6.12) ;
- mémoire pleine, chaque tirage de niveau contient au moins un talent nouveau quand il en existe (D3) ;
- D7 : la « version ennemie » n’est pas affichée (consigne : rien de visible pour la réserve, le Brumeux garde ses secrets) ;
- D8 : `SAVE.mem.prof.eff` et `base` remis à zéro une fois (`SAVE.flags.mem17`) ;
- D5 : l’exclusion des dégâts sur un Masqué porteur de souvenir attend le palier Masqué (aucun Masqué ne porte encore de souvenir).

Équilibrage, première passe (chaque chiffre changé ; effet par rang pour les mineurs) :

| Souvenir | Avant | v17.0 |
|---|---|---|
| Feu sombre `sol_s2` | +20 % lumière | +30 % |
| Solstice `sol_s3` | +12 % rayon | +15 % |
| Lame fantôme `omb_s2` | +20 % crit. dmg, +4 % crit | +30 %, +6 % |
| Voile `omb_s3` | +10 % vitesse Obscur | +15 % |
| Sainte Bile `sai_s2` | +15 % Recracher | +22 % |
| Jeûne `sai_s3` | +10 PV, −5 % subis | +15 PV, −7 % |
| Chair malléable `abe_s2` | +8 % par palier | +12 % |
| Os saillants `abe_s3` | 8 dégâts | 12 |
| Glas sourd `dgl_s2` | +15 % | +22 % |
| Main lourde `dgl_s3` | +10 % | +15 % |
| Voix d’outre-tombe `chd_s2` | +15 % | +22 % |
| Soie durable `gts_s2` | +1,5 s | +2 s |
| Soie collante `gts_s3` | +0,25 s | +0,35 s |
| Cordes neuves `mdp_s2` | +15 % | +22 % |
| Troupe `mdp_s3` | +10 % / +10 % | +15 % / +15 % |
| Huile de baleine `pha_s2` | +15 % | +22 % |
| Lentille de Fresnel `pha_s3` | +10 % | +14 % |
| Estomac sans fond `aby_s2` | +10 % | +15 % |
| Mâchoires larges `aby_s3` | +8 % | +12 % |
| Talons ferrés `val_s2` | +15 % | +22 % |
| Grand salon `val_s3` | +12 % | +15 % |
| Acier fin `bro_s2` | +8 % | +12 % |
| Œil de verre `eye` | +10 % crit, +25 % crit. dmg | +15 %, +40 % |
| Cœur de cire `wax` | +25 PV | +40 PV |
| Plume de corbeau `feather` | +12 % vitesse | +18 % |
| Calice de Brume `calice` | 3 % vol de vie | 5 % |
| Moelle noire `moelle` | 3 PV par ennemi | 5 |
| Fiole de sang tiède `fiole` | 2 PV par ennemi | 4 |
| Crâne de rat `crane` | +2 or | +3 |
| Couronne d’épines `epine` | +20 % dégâts | +28 % (−15 PV inchangé) |
| Gantelet du sonneur `gant` | +15 % vitesse d’attaque | +22 % |
| Ancre de brume `ancre` | −12 % subis | −18 % |
| Pendule du beffroi `pendule` | recharge −25 % | −35 % |
| Os creux `os` | +10 PV, +8 % vitesse | +20 PV, +12 % |
| Lacrymatoire `lacry` | +25 % soins | +40 % |
| Cierge votif `cierge` | +15 % sur gardiens | +25 % |
| Chaîne de glas `chaineg` | +25 % sur étourdis | +35 % |

Non touchés : mineurs des branches principales (effets de jeu, à rangs), compétences, majeurs, nœuds clés, ultimes, reliques de forme, montée des ennemis.

## 9. Retour de jeu : v17.1 (22 octobre 2026)

Retour du joueur : la mémoire à 6 bridait trop la diversité, et l’écran d’oubli revenait à presque chaque talent.

- **D1 révisée** : les reliques sortent de la mémoire. Plus de refus contre soin ou or, plus d’écran d’oubli pour une relique (autel, champion, Colporteur, Bagage), plus de cas Boussole / Phénix. Les reliques ne vont jamais dans la réserve ; leur classement en familles reste dans `souvenirs.js` pour les paliers suivants.
- **Plafond** : 10 talents (`souvenirs.js`, `plafond`). Repère : un run complet compte environ 13 talents distincts à la fin de l’acte II et 17 à la fin de l’acte III ; l’oubli commence donc vers le milieu de l’acte II.
- **Clavier** : 1 à 9, puis 0 pour le dixième ; R (ou Retour arrière) renonce ; Échap garde le niveau.
- **HUD** : deux rangées de cinq tuiles ; les reliques retrouvent leurs icônes à côté de l’équipement.
- **Équilibrage** : les 15 reliques renforcées en v17.0 reviennent à leurs valeurs de la v16.47 (le renfort compensait la place qu’elles prenaient). Les 22 mineurs des voies gardent leur renfort du § 8.

## 10. D11 · Après le build : graver, muer, fusionner (v17.3, 23 octobre 2026)

Question du joueur : au début de l’acte III, le build est presque fait. Avec une suite (acte IV et au-delà), les niveaux n’offriront plus que des talents d’arbres inutilisés. Principe retenu : **passé un certain niveau, monter approfondit le build au lieu de l’élargir.** Trois mécaniques, livrées dans cet ordre.

### D11a. La gravure (livrée en v17.3)

- Mémoire pleine, l’écran de niveau ajoute une carte de gravure (une seule ; jusqu’à trois si l’arbre n’offre plus rien). Elle vise un talent porté **au rang max** et non éteint. Elle ne prend pas de place.
- Un talent se grave au plus `gravure.max` fois (2). Tuile : liseré doré, un losange par gravure.
- **Effet, cas 1 : le talent a des effets chiffrés.** Chaque gravure intensifie de `gravure.part` (40 %) la différence qu’il apporte aux statistiques, au moment où il est rejoué (`amp` dans le bloc v17). Les entiers partis de 0 (niveau de compétence, compteur de rang `v10.*`, interrupteur, mode) ne bougent pas : beaucoup de codes de jeu lisent ces compteurs dans des tableaux indexés par rang, un rang 4 donnerait `undefined`. Un entier déjà non nul (PV max, charges d’esquive) gagne au moins 1.
- **Effet, cas 2 : rien de chiffré** (environ 85 % des talents, car les mineurs v10 et les compétences passent par des compteurs) : le bonus `gr` de la famille, multiplié par le poids du genre (mineur 1, compétence et majeur 1,5, nœud clé, racine et ultime 2). Les phrases viennent de `gravure.texte` (jeu et wiki).
- Les gravures voyagent avec le souvenir : oublié, il part dans la réserve avec `g`.
- Recalcul : `g` fait partie de la mémoire efficace ; graver puis dégraver redonne exactement les statistiques d’avant (testé sur les quatre formes).

**Bonus de famille par gravure** (avant le poids) : Projectile, Faisceau, Onde, Sol, Fil, Cloche, Dévoration, Lumière, Fureur : +5 % de dégâts. Lame : +4 % de dégâts, +10 % de dégâts critiques. Ruée : −0,06 s de recharge d’esquive, +6 de vitesse. Ombre : +3 % de critique. Soin : +12 PV max. Garde : +10 PV max, −3 % de dégâts subis.

**Éveil (livré en v17.4).** Les 36 nœuds clés et ultimes ont un éveil (`eveils` dans `souvenirs.js` pour le texte ; effet dans index.html). Pour eux, la Gravure I donne le bonus de famille (pas d’intensification : leurs chiffres sont souvent des contreparties, comme les PV du Pacte ou les dégâts de Mille Points), et la Gravure II pose `P.s.ev[id]=1`, lu par le jeu avec `EVL(id)`. Trois façons de brancher un éveil :
- une ligne du jeu qui lit `EVL(id)` (Surtension, Couronne solaire, Fils de l’ombre, Crépuscule partout, Astre errant, Ciel étoilé, Festin sans fin, Chimère avec `mutHas`, Gueule à trois, Glas des morts, Bourdon grave, Tocsin d’alarme, Con fuoco, Danse de mort, Ossuaire, Pluie d’acier, Éventail du destin, Chute des pendus, Main de fer) ;
- une enveloppe dans le bloc v17 : lancement d’ultime (`ult` : Grand bal, Éternité, Toile vivante, Rideau), fin d’effet suivie image par image (`updatePlayer` : Midi, Grâce, Seconde bouchée, Dernier chant, Phare errant, Gouffre, Chute des pendus), mort d’un ennemi (`killEnemy` : Nuit sans fin, Bête sans fin, Couronne solaire, Destin commun, Fil de sang), `stomp` (Titan), `rupture` (Rupture en chaîne) ;
- un effet de statistique (`EVA` : Pacte scellé rend les 20 % de PV max).

**Éveils des compétences (v17.6).** Les 57 compétences ont aussi un éveil (93 éveils en tout), branchés de la même façon : lignes `EVL(id)` dans le code des compétences, enveloppes de lancement dans le bloc v17 (`wrapCd` sur `nova`, `lame`, `festin`, `tisPluie`, `tisToile`, et `tryDash`), fins d’effet suivies image par image (Carapace, Point d’orgue), mort d’un ennemi (Sucs voraces, Toile qui tisse). Les mineurs et les majeurs n’ont pas d’éveil : leur Gravure II double la Gravure I, et ce choix est assumé (ce sont des chiffres, pas des comportements).

### D11b. La mue d’acte (palier Masqué)

- En entrant dans un nouvel acte, la Brume prend un souvenir que le joueur choisit (jamais la racine de voie ni un ultime). Il part dans la réserve ; le Masqué et le Glas Originel s’en serviront.
- En échange : une gravure gratuite ou un ultime d’une autre voie.
- But : un rythme d’acte, un build qui bouge un peu, et une réserve nourrie sans forcer l’oubli à chaque niveau.
- Risque : frustration ; à tester avec une option « garder tout, sans échange ».

### D11c. La fusion (contenu de fin de run)

- Certaines paires de talents portés, de familles différentes, fusionnent en un talent hybride qui n’occupe qu’une place (exemple : Lanterne-mine + Phare donnent une lanterne qui explose en lumière).
- Proposée au Sanctuaire ou en carte rare à l’écran de niveau, mémoire pleine.
- Coût : une quinzaine de fusions à écrire au départ, prises parmi les paires les plus jouées (instrumenter les fins de run d’abord).

### À surveiller

- La gravure ajoute de la puissance tardive alors que les ennemis montent déjà de 8,5 % de PV par salle : mesurer si elle rend l’acte III trop facile pour les builds rapides.
- Les cartes de gravure viennent en plus des trois talents ; si l’écran devient trop long sur petit écran, remplacer un talent au lieu d’ajouter.

## 11. Clôture du palier 1 : mesure (v17.7, 26 octobre 2026)

Livré depuis v17.0 : mémoire de 10 talents (reliques hors mémoire), écran « prendre / oublier », gravure, 93 éveils (36 nœuds clés et ultimes, 57 compétences), statistiques de fin de run (`SAVE.stats17`, 80 descentes, export chez l’Archiviste ; `__memoire.stats()` en console).

**Mesure au bot** (`bal10.mjs` : 4 formes × 3 graines, jusqu’à l’acte III salle 7 ; mémoire 10 contre mémoire sans limite). Le bot tue les ennemis d’un coup et choisit au hasard : il mesure la puissance de la fiche, pas la difficulté. Indice offensif = dmg × vitesse d’attaque × (1 + crit × (critMult − 1)) ; PV effectifs = PV max / dégâts subis. Moyennes :

| Forme | Acte II (illimité → 10) | Acte III | Fin (acte III, salle 7) |
|---|---|---|---|
| Lumenarque | 1,14 / 112 → 1,05 / 111 | 1,16 / 125 → 1,26 / 141 | 1,16 / 142 → 1,38 / 143 |
| Gouffre | 1,03 / 134 → 1,10 / 154 | 1,03 / 129 → 1,12 / 162 | 1,10 / 142 → 1,30 / 188 |
| Héraut | 1,16 / 123 → 1,05 / 124 | 1,16 / 157 → 1,25 / 159 | 1,21 / 142 → 1,30 / 143 |
| Tisse-Destin | 1,40 / 161 → 1,11 / 132 | 1,53 / 143 → 1,29 / 119 | 1,58 / 137 → 1,78 / 143 |

Lecture : avec la gravure, la fiche à 10 talents rattrape puis dépasse la fiche sans limite en fin de run (les bonus de famille portent surtout sur les dégâts). Seul Tisse-Destin est nettement en dessous aux actes II et III (−20 % d’indice offensif, −10 à −18 % de PV effectifs) ; trois graines seulement, à confirmer sur de vraies parties avant de toucher aux chiffres. Ce que l’indice ne voit pas : les compétences, les éveils, la synergie des builds resserrés.

Le bot n’avait atteint aucun éveil (1 à 5 gravures par run, rarement deux fois le même talent) : v17.7 fait viser de préférence un talent déjà gravé une fois (poids 3, 4 s’il a un éveil ; mesuré : 25 % des cartes de gravure, contre 10 % avant).

**Ce qui reste ouvert, à trancher sur les descentes exportées** (pas au bot) : difficulté réelle avec la montée des ennemis (+8,5 % de PV par salle, inchangée), part de l’Accoutumance (D5, champ `accoutumance` de l’export), Tisse-Destin au milieu de run, éveils trop forts éventuels (Pacte scellé, Pluie d’acier, Ciel étoilé, Grand bal, Marionnettiste, Clocher). Le palier 2 (Masqué) peut démarrer ; ces réglages se feront en parallèle, sur données.

## 12. L’oubli se voit et s’entend (v17.8, 26 octobre 2026)

Consigne : la réserve reste secrète (D7), mais l’oubli lui-même doit se voir et s’entendre. Rien ne change dans les règles ni dans les chiffres.

- **Volute** (`oubliFx`, bloc v17 d’`index.html`) : à l’instant où `forget()` retire le souvenir, avant que le HUD soit redessiné, l’icône est copiée dans un calque du DOM à sa place exacte. Elle s’éclaire, se trouble, s’étire dans le sens du départ et se dissout, pendant que neuf bouffées de brume partent un peu de travers. Durée ≈ 1 s (`OUBLI_MS`), retirée ensuite ; l’effet n’est pas dans la boucle de jeu, il ne bloque rien (vérifié : le temps de jeu avance pendant l’effet, et l’écran « Prendre ou oublier » se ferme aussitôt).
- **Destination** (`oubliCible`) : le plus proche des quatre bords de l’écran et des bancs de brume de la salle (`room.mists`, aux positions que `drawMists` leur donne à cet instant). Un banc plus proche que le bord l’emporte ; la volute y entre et s’éteint, elle ne traverse pas l’écran.
- **Mouvements réduits** : `prefers-reduced-motion`, lu au chargement (`RM`) et à chaque oubli. L’icône reste en place et s’efface en fondu (0,7 s) ; aucune bouffée, aucun déplacement ; la réserve voilée ne « respire » plus.
- **Bruitage** : `sfx('oubli')` appelle `__brumeOubli`, dans le moteur de voix (v16.46–47). Un souffle de brume léger et deux chuchotements (« o→u », puis « e→i ») très réverbérés, ≈ 1 s. Il n’a ni grondement grave, ni chœur, ni coup sourd. Mesuré hors ligne : pic 0,27, centre spectral ≈ 2 700 Hz, aucune énergie sous 150 Hz (le Brumeux en a 55 %, l’invocation du Masqué 23 %), 1,1 s audibles ; l’escalade du Brumeux (≈ 1,2 s) garde son sous-son grave.
- **Réserve voilée** : en tête de l’onglet Personnage de la pause (sous le pli du panneau, on ne la voyait pas), une icône par souvenir oublié de la descente, grisée et floutée. Pas de texte, pas d’infobulle, pas de nom, ni rang ni gravure : on voit que la Brume garde quelque chose, pas quoi. Vide, elle n’affiche rien (pas même un cadre).
- **Wiki** : une seule phrase dans « La Mémoire » (gabarit `memoire()` d’`outils/wiki.mjs`), « Ce que tu oublies, la Brume le garde. », et l’entrée du journal. Rien sur ce que la Brume en fera.

## 13. Palier 2, première tranche : le Masqué porte un souvenir (v17.9, 26 octobre 2026)

Réglages : `data/bestiaire.js`, `assemble.souvenir` et la capacité `taches` (`souvenir:true`). Logique pure dans le bloc `/*asm:pur*/` (`asmSouvenir`, `asmCombos` avec `ctx.porte`), vérifiée par `outils/sim-masque.mjs`. Jeu : bloc v16.24 (tirage en salle, zone, bulle, récompense, D5) et bloc v17 (`offreReprise`, `restore`, écran d’oubli au contexte `rep`).

- **Quels souvenirs** : un talent de la réserve dont la famille a déjà un geste chez le Masqué. Projectile → Salve (`tirs`), Lame → Lame (`cone`), Ruée → Charge, Onde → Onde, et Sol → **Taches**, la seule capacité nouvelle de cette tranche. Sol est la famille la plus répandue entre les formes (8, 3, 8, 11 talents) : c’est elle qui touche le plus de joueurs. Faisceau, Fil, Cloche, Dévoration (formes « ligne », « fil », « cercles », « tourbillon ») et les familles d’état (Lumière, Ombre, Soin, Garde) attendent les tranches suivantes ; leurs souvenirs ne sont jamais portés.
- **Tirage** : la réserve a un souvenir portable → `chance` (50 %) que le Masqué en porte un, au plus `parActe` (2) porteurs par acte. Choix pondéré par l’usure : poids 1 / (1 + `usure` × fois déjà porté). La capacité portée prend **une des deux places de départ** (jamais l’éveil), sous le même budget de menace, avec les mêmes exclusions et incompatibilités ; aucune combinaison possible → un Masqué ordinaire. Une capacité `souvenir:true` n’apparaît jamais sans souvenir. Le tirage ordinaire est inchangé (mêmes fréquences au simulateur).
- **Force** : la capacité portée fait `1 + parRang × (rang − 1) + parGravure × gravures` (×1,15 par rang au-delà du premier et par gravure) de ses dégâts (D3 : le rang voyage avec le souvenir).
- **Taches** (forme `taches`, menace 2, adjectif « suintant / suintante ») : trois flaques de rayon 46, une sous toi et deux à 105 px, posées au début du chargement (0,75 s), visibles en rouge comme toutes les zones. Impact ×1,3, puis elles restent 2,4 s et blessent de ×0,4 toutes les 0,7 s (au-dessus de l’invulnérabilité par ennemi de 0,65 s de la v17.5, sinon un tic sur deux serait perdu). Pendant ce temps, il peut se déplacer, et les autres ennemis attendent (une zone à la fois). Mouvements réduits : bords fixes, pas de bulles.
- **Lisibilité** : la capacité portée est cerclée de lavande au-dessus de sa tête et dans la bulle d’arrivée, qui affiche aussi le nom du talent (et reste 3,6 s au lieu de 2,8). Rien n’est annoncé avant son arrivée.
- **Reprise (D9)** : brisé, il remplace sa relique par un choix. « Reprendre » rend le talent avec son rang et ses gravures, sans soin ni effet rejoué ; mémoire pleine, l’écran d’oubli s’ouvre (« Souvenir repris · mémoire pleine ») et y renoncer laisse le souvenir à la Brume. « Le laisser » ouvre le choix de relique habituel, et le souvenir reste dans la réserve (il pourra revenir, usé d’une fois). Un souvenir ne revient toujours jamais par l’écran de niveau.
- **Accoutumance (D5)** : les dégâts infligés à un porteur ne comptent ni dans la part de mécanique ni dans les résistances.
- **Traces** : chronique (« Un Masqué portait … », « tu as repris … ») ; statistiques de descente : `repris`, `porteurs`.
- **Wiki** : une phrase dans « Le Masqué » : « Parfois, il porte autre chose. Tu le reconnaîtras. » Taches n’est pas listée parmi les capacités empruntées.
- **Essai** : `__asm.essai(null, 2, true, 'fan_n2')` ouvre une salle avec un Masqué qui porte `fan_n2` (il doit être dans `__memoire.reserve`).

À surveiller sur les descentes exportées : le nombre de reprises par rapport aux reliques choisies, et si les Taches (2,4 s de sol interdit) pèsent trop au milieu des vagues de l’acte II.

## 14. Trophées et Masqués renforcés (v17.10, 26 octobre 2026)

Retour du joueur : la reprise mémoire pleine ne valait qu’un échange ; le souvenir repris doit être un trophée hors limite, et en contrepartie tous les Masqués (et les gardiens) doivent être bien plus durs.

- **Trophée** (`souvenirs.js`, `trophees.parActe` : 1) : la première reprise d’un acte ne prend pas de place (`a.trophee` dans `RUN.memoire.actifs`, compteur `M.trophees[acte]`). Au-delà, la reprise redevient normale (écran d’oubli si la mémoire est pleine). Garde-fous contre la boucle « oublier exprès, reprendre gratis » : un par acte (trois par descente au plus), figé (l’arbre ne le propose plus en rang, `gravables` l’écarte), inoubliable (`forget` le refuse, l’écran d’oubli ne le montre pas), et il s’éteint comme les autres (D2, D4). HUD : dernière ligne du cadre de la Mémoire, sous un filet lavande ; pause : ligne à part ; statistiques : `trophees`.
- **Tous les Masqués** (`bestiaire.js`, `assemble`) : PV 460 → 736 (×1,6) ; `stats.vitesse` ×1,2 ; `pauseS` 0,25 → 0,12 ; `apresSignatureS` 0,6 → 0,3 ; `attenteS` 1,2 → 0,5 ; trait passif 1,4 → 1 s ; éveil à 70 % (50 avant) ; `bougeCharge` (losanges, damier, taches) : il te poursuit pendant les chargements posés sur toi, pas pendant ceux centrés sur lui (sinon la zone ne serait plus là où il est). **Rage** (`rage`) : sous 30 % de PV, après l’éveil, une fois ; pause 0,05 s et aucun souffle après la signature ; aura rouge (fixe en mouvements réduits). Porteur : `souvenir.pv` +10 % de PV par rang au-delà du premier et par gravure. Planchers de chargement inchangés (0,5 s, signature 0,8 s) ; une zone à la fois. `sim-masque.mjs` vérifie la rage (une fois, après l’éveil, sous 30 %) et la pause plancher de rage.
- **Gardiens** : PV dans `gardiens.js` (`pv`, `pvMul`), au lieu de `BAL.bossMul` codé en dur ; ×1,4 : 2 650, 5 750, 9 000 au palier 0 (mesuré en jeu). Le wiki affiche ces PV sur les fiches des gardiens.
- **Wiki** : règle « Trophées » dans « La Mémoire » (« un souvenir arraché de haute lutte », sans nommer le Masqué), rage et poursuite dans « Le Masqué ».

À surveiller : le temps passé contre les gardiens (`RUN.bossT`) et les morts contre les Masqués dans les descentes exportées ; si la rage rend l’acte I trop dur, la réserver aux actes II et III.

## 15. Palier 2, deuxième tranche : Tourbillon et Cercles (v17.11, 26 octobre 2026)

Les familles **Dévoration** (Gouffre, 19 talents) et **Cloche** (Héraut, 27 talents) donnent désormais une capacité au Masqué porteur, comme Sol donne les Taches. Avec elles, sept familles sur quinze sont portables (Projectile, Lame, Ruée, Onde, Sol, Dévoration, Cloche).

| Famille | Capacité | Forme | Ce que ça fait |
|---|---|---|---|
| Dévoration | `tourbillon` (`u_maw`) | `tourbillon` | Disque de 140 px posé sous toi au chargement, figé. Pendant 1,7 s il t’attire vers son centre (120 px/s, jamais pendant une esquive) ; son cœur (34 px) blesse de 0,3 × dégâts toutes les 0,5 s (plus de tic dans les 0,7 dernières secondes : l’invulnérabilité de 0,65 s après un coup avalait sinon le coup final) ; à la fermeture, un dernier coup de 1,5 × dégâts si tu es resté dans le cœur. |
| Cloche | `cercles` (`u_bell`) | `cercles` | Un disque (34 px) et deux anneaux (34 px de large, pas de 74 px) posés sous toi, figés. Après 0,8 s de chargement ils frappent du centre vers l’extérieur toutes les 0,45 s (1,4 × dégâts chacun, son de cloche). L’espace entre deux anneaux (40 px) est sûr. Le chargement se lit de l’intérieur vers l’extérieur, comme l’ordre des coups. |

Réglages : `data/bestiaire.js`, `assemble.capacites.tourbillon` / `cercles` et `assemble.souvenir.familles`. Les deux formes rejoignent `bougeCharge` (il te poursuit pendant le chargement) et, comme les Taches, il peut bouger pendant leur effet.

Garde-fous (vérifiés par `outils/sim-masque.mjs`, section 1 ter) : l’attraction reste sous 70 % de la vitesse la plus basse envisagée (Gouffre en dévoration) ; on peut sortir du disque avant la fin ; l’espace entre anneaux laisse passer le joueur ; la battue des cercles reste au-dessus de l’invulnérabilité du joueur (0,65 s : à 0,45 s, un deuxième anneau touché juste après le premier ne blesse pas deux fois).

Wiki : inchangé (il ne liste pas les capacités de souvenir), seule la version suit. Journal : v17.11.

À surveiller : si le tourbillon est trop facile à quitter (il n’attire que 120 px/s) ou si les Cercles tuent surtout au premier coup (le disque central, quand on ne bouge pas pendant le chargement).

## 16. Survie du Gouffre contre les gardiens et les Masqués (v17.12, 26 octobre 2026)

Constat du joueur : depuis v17.10, le Gouffre (corps à corps obligé pour son DPS) ne passe pas l’acte III : un Masqué lance un sort toutes les 0,7 s environ et le Gouffre paie toutes ses zones sans fenêtre pour frapper. Demande : de la survie pour le Gouffre, mais seulement contre gardien ou Masqué.

Réglage (`data/gardiens.js`, `survieGouffre`) : × 0,8 sur les dégâts reçus, et vol de 5 % des dégâts infligés à un gardien ou à un Masqué (hors dégâts sur la durée). Actif tant qu’un gardien (`type==='boss'`) ou un Masqué (`e.asm`) est en vie dans la salle (`gouGrand()`), donc aussi contre leur escorte. Le soin passe par `heal(…, 'boss')`, source déjà autorisée sous Famine. Il s’ajoute à la Carapace et aux mutations (multiplicatif).

Non fait (à mesurer d’abord sur des descentes exportées) : respiration de fin de cycle (apresSignatureS), rage limitée aux actes I–II.
Wiki : une phrase dans « Les gardiens » et dans « Le Masqué », générée depuis les données.

## 17. Palier 2, troisième tranche : Fil et Faisceau (v17.13, 26 octobre 2026)

Les familles **Fil** (Tisse-Destin, 25 talents) et **Faisceau** (10 talents, surtout Lumenarque) donnent une capacité au Masqué porteur. Neuf familles sur quinze sont portables (Projectile, Lame, Ruée, Onde, Sol, Dévoration, Cloche, Fil, Faisceau) ; restent les familles d’état (Lumière, Ombre, Soin, Garde) et les passifs (Fureur, Fortune).

| Famille | Capacité | Forme | Ce que ça fait |
|---|---|---|---|
| Fil | `fil` (`u_thread`) | `fil` | Couloir de 34 px sur 400 px qui te suit pendant les 55 % premiers du chargement (0,8 s), puis se fige. S’il te touche au lâcher : dégâts (1,3 × dégâts), puis il te tire vers lui à 180 px/s pendant 1 s (arrêt au contact). Une esquive coupe le fil. S’il te rate, le trait se dissipe. `portee` 320 : il s’approche avant de le lancer. |
| Faisceau | `faisceau` (`u_beam`) | `faisceau` | Secteur de 90° et de 340 px centré sur toi, qui te suit jusqu’à la moitié du chargement (0,9 s), puis se fige. Un rayon de 26 px le balaie d’un bord à l’autre en 1,2 s, dans un sens tiré au hasard : le bord de départ est un trait clair avec une flèche. Il blesse une fois (1,6 × dégâts). `portee` 300. |

Réglages : `data/bestiaire.js`, `assemble.capacites.fil` / `faisceau` et `assemble.souvenir.familles`. Contrairement aux zones posées sur toi (taches, tourbillon, cercles), elles partent de lui : il ne te poursuit pas pendant le chargement (elles ne sont pas dans `bougeCharge`).

Garde-fous (sim-masque.mjs, section 1 quater) : le fil est plus étroit qu’un joueur mais plus large que lui ; la traction reste sous la vitesse la plus basse (on peut toujours résister) et sous la longueur du fil ; la pire fuite du secteur du faisceau (≈ 141 px, quand fuir sur le côté coûte autant que fuir en arrière) tient dans le chargement le plus court plus 0,3 s ; le balayage dure au moins 1 s.

Mesures en jeu (Chromium) : fil, joueur immobile : 22 PV, distance 201 → 49 px ; avec une esquive 0,3 s après l’accroche : 201 → 147 px ; faisceau, joueur dans le secteur : 27 PV ; joueur hors du secteur : 0.

Wiki : inchangé (il ne liste pas les capacités de souvenir), seule la version suit. Journal : v17.13.

À surveiller : la traction du Fil pour un corps à corps (elle ramène au contact du Masqué : bon pour un Gouffre, moins pour un Lumenarque) ; la lisibilité du balayage du Faisceau sur un fond sombre.

## 18. Palier 2, quatrième tranche : les états (v17.14, 26 octobre 2026)

Les familles **Lumière, Ombre, Soin, Garde et Fureur** donnent au Masqué porteur un **état** au lieu d’une capacité : il garde un tirage ordinaire (ses deux capacités de départ, sa capacité d’éveil, sa signature) et l’état s’y ajoute. L’état est montré par son icône cerclée de lavande, après la signature (au-dessus de lui et dans sa bulle d’arrivée). Avec elles, quatorze familles sur quinze sont portables.

**Fortune n’est pas faite** : la famille n’a aucun talent (seulement 4 reliques : crâne, clef, bourse, boussole), et le Masqué ne porte que des talents oubliés. Elle attend que le Masqué puisse porter une relique (ou qu’un talent Fortune existe). Idée gardée : il vole de l’or à chaque coup et le rend, majoré, à sa mort.

| Famille | État | Effet | Signal |
|---|---|---|---|
| Lumière | `halo` (`u_star`) | Dans 150 px autour de lui, tu subis +25 % de dégâts (toutes les sources) | Cercle doré pointillé au sol, plus vif quand tu y es, lueur dorée sur toi |
| Ombre | `voile` (`u_ghost`) | Toutes les 5,5 s (première à 3 s), entre deux sorts, il s’efface 1,1 s : intouchable, immobile, sans contact ni tir ; il reparaît à 140 px de toi | Bouffée sombre, corps, masque et icônes à 15 % d’opacité, étincelles violettes au retour |
| Soin | `regen` (`u_heart`) | Sous 85 % de PV, toutes les 6 s : canalise 1,2 s puis se soigne de 8 % de ses PV max. Lui infliger 6 % de ses PV max pendant la canalisation, ou l’étourdir, l’interrompt | Anneau vert qui se resserre, « +N » vert, « Interrompu » |
| Garde | `carapace` (`u_shield`) | 3 s toutes les 7 s : −40 % de dégâts subis (au plus −60 % avec la force du souvenir) | Six arcs gris-bleu qui tournent autour de lui |
| Fureur | `fureur` (`u_fist`) | Permanent : +15 % de dégâts (× force), +20 % de vitesse | Lueur et anneau orangés sous lui |

Réglages : `data/bestiaire.js`, `assemble.etats` et `assemble.souvenir.etats` (famille → état). Logique pure : `asmSouvenir` renvoie `{x, cap, etat, force}` (une famille donne soit une capacité, soit un état). Jeu : bloc v16.24 (`etatInit`, `etatPas`, `etatSol`, `etatSurLui`, enveloppes de `hitEnemy` et `hurtPlayer`, `immun` étendu au Voile, opacité du Voile sur le corps et le masque).

Garde-fous (sim-masque.mjs, 1 quinquies et 2 bis) : chaque état a sa famille, son nom et son icône ; aucune famille n’est à la fois capacité et état ; durées sous le cycle ; réduction bornée sous 100 % ; exposition au plus +50 % ; soin au plus 15 % et interruptible ; un porteur d’état ne tire jamais de capacité de souvenir.

Mesures en jeu (Chromium, normal et mouvements réduits) : halo 125 dedans / 100 dehors ; voile 0 dégât une fois effacé, retour à 136–144 px ; régénération +8 %, interrompue par 7 % ; carapace 60 / 100 ; fureur dégâts ×1,15. Corrigé pendant les tests : le masque restait opaque pendant le Voile (`drawMask` imposait l’opacité, elle est maintenant multipliée) ; près d’un mur, le Voile reparaissait trop près (on garde le point le plus proche de 140 px).

Wiki : inchangé (il ne liste pas ce que porte le Masqué), seule la version suit. Journal : v17.14.

À surveiller : le Halo contre un corps à corps (+25 % en permanence au contact : il se cumule avec la survie du Gouffre, −20 %, ce qui fait un net +0 % environ) ; le Voile contre les classes qui ont besoin d’une cible (il est intouchable 1,1 s toutes les 5,5 s, soit environ 20 % du temps).

## 19. Palier 3a : les armes de la Brume, le système (v17.15, 26 octobre 2026)

Consigne : chaque famille de souvenirs reçoit une **version ennemie** construite uniquement avec les formes que le joueur connaît déjà, sous des règles de justice **codées**. Données dans un fichier à part, mode d’essai réservé au développement. **Rien ne change pour le joueur** : aucun Masqué ordinaire ne s’en sert, le tirage du Masqué et ses capacités de souvenir (v17.9 à v17.14) sont intacts, le wiki n’en dit rien.

### Ce qui est construit

| Où | Quoi |
|---|---|
| `data/souvenirs-brume.js` (`BRUME_DATA.souvenirsBrume`) | Vocabulaire (9 formes), règles de justice, bornes des formes, variantes, renforts, les 15 familles (attaque en étapes, forme principale, icône, adjectif, menace, échelle d’acte, incompatibilités), réglage du mode d’essai, tables `talents` et `reliques` **vides** (palier 3b). |
| `data/bestiaire.js`, `assemble.couleurs` | Les couleurs des zones du Masqué sortent du code (`zone`, `bord`, `charge`, `signature`) : le Masqué et les armes les lisent au même endroit. Valeurs inchangées. |
| `index.html`, bloc `/*sb:pur*/` (dans le bloc v16.24 du Masqué) | Logique pure : `sbEtapes`, `sbCharge`/`sbPlancher`/`sbVerrou`, `sbPieces` (géométrie au format `drawZone`), `sbDans` (touché, mêmes règles que le jeu), `sbArrivee`/`sbEffet`, `sbSortie`, `sbPlacer`, `sbPlafond`/`sbCoup`, `sbIncompatibles`, `sbNouveau`/`sbPas` (file d’étapes), `sbVerifier`. |
| `index.html`, section « v17.15 · Les armes de la Brume, en salle » | Exécution sur un Masqué qui porte `e.asm.sb` : `sbMaj` (file, suivi puis figement, déplacements, ruée, repousse), `sbLache` (anneau dans `ZR`, ruée, projectiles dans `eproj`, zones instantanées), `sbDessin` (`drawZone` du Masqué ; projectiles : trajet en pointillé et orbe au liseré qui grossit), navette et perçant dans une enveloppe d’`updateProjectiles`, `sbRenfort`. Branchements : `update` (une ligne), `drawTelegraphs`, icônes au-dessus de lui et carte d’arrivée (l’icône de la famille, cerclée de lavande), `annule`, brisure. |
| `index.html`, mode d’essai | `index.html?brume=<famille>|tout[&classe=lum|gou|her|tis][&acte=1|2|3][&variante=…][&renfort=…][&dieu=0][&bot=1]`. Aucune touche. Salle vide (sans la feinte du Brumeux), Masqué d’essai (pas de trait passif, ni éveil ni rage, pas d’XP, pas de récompense ; brisé, il revient, ou passe à la famille suivante en mode `tout`). Barre en haut : 15 icônes pour choisir, ▶, « PV ∞ » (par défaut : jamais sous 1 PV), étape en cours, chargement contre celui du Masqué, sortie trouvée (px), étapes sautées, dégâts subis, et `sbVerifier` rejoué sur la famille montrée. `bot=1` : conduit le joueur vers la sortie calculée à 180 px/s (contact du porteur coupé) pour voir qu’elle existe. Console : `__asm.sb`. |
| `outils/sim-brume.mjs` | Juge les données hors navigateur (même `sbVerifier`), vérifie la file d’étapes et fait neuf contre-épreuves (données injustes qui doivent être refusées). |

### Une attaque, des étapes

Une version ennemie est une **attaque** de 2 ou 3 étapes. Une étape = **une** zone d’**une** forme (plusieurs pièces de la même forme sont permises, comme les cinq losanges d’Éclats). L’étape suivante ne charge qu’une fois la précédente **finie** (onde arrivée au bout, projectiles disparus, ruée terminée), plus un silence `entracteS` (0,25 s). Champs : `f`, `sur` (`lui`, `toi`, `ancre` = centre de l’étape précédente), `vise`, `suivi` (part du chargement où la zone te suit, puis se fige), `chargeS` (acte I), `degats` (× dégâts du porteur), `portee`, `v` (variantes propres), et les mesures de la forme.

| Famille | Attaque | Forme principale | Étapes | Dégâts I / III (attaque entière) | Incompatibles |
|---|---|---|---|---|---|
| Projectile | Rafale | projectile | 2 volées de 3 orbes au liseré, visées | 1,53 / 2,07 | Fil |
| Faisceau | Rais | couloir | 3 rais instantanés (34 px de large), chacun revisé | 2,04 / 2,76 | Ruée, cap. Charge |
| Lame | Taillades | cône | 2 cônes (110°, puis 140°), il s’approche | 1,87 / 2,53 | Dévoration, Garde, cap. Lame |
| Ruée | Aller-retour | couloir | 2 ruées (corps du porteur, 700 px/s) | 2,04 / 2,76 | Faisceau, cap. Charge |
| Onde | Échos | anneau à brèche | 2 ondes, la seconde brèche à l’opposé de la première | 1,70 / 2,30 | Cloche, Garde, cap. Explosion, Onde |
| Sol | Dalles | damier | damier en +, puis en × sur la même grille (les cases sûres s’inversent) | 1,87 / 2,53 | Fortune, corps Voilé |
| Fil | Navette | projectile | 2 navettes en V puis 1 navette : elles reviennent sur leur trajet | 2,55 / 3,45 | Projectile |
| Cloche | Glas | disque | la cloche tombe sur toi, son onde part de là, puis une deuxième cloche | 2,55 / 3,45 | Garde, Onde, cap. Explosion, Onde |
| Dévoration | Mâchoire | cône | deux mâchoires sur les côtés (le milieu est sûr), puis la morsure (vol) | 1,79 / 2,42 | Garde, Lame, cap. Lame |
| Lumière | Aube | rayons | 2 étoiles de 8 rayons, un rayon sur toi | 1,53 / 2,07 | cap. Salve |
| Ombre | Croix d’ombre | croix | croix en × sur toi, puis en + | 2,04 / 2,76 | corps Brute |
| Soin | Saignée | losanges | 3 losanges sur toi et en ligne (vol), deux fois | 1,87 / 2,53 | Fureur, corps Spectre |
| Garde | Bastion | disque | le bouclier éclate autour de lui, puis coup de bouclier en cône (repousse) | 2,13 / 2,88 | Cloche, Dévoration, Lame, Onde, cap. Lame, Explosion, Onde |
| Fureur | Martèlement | losanges | 3 losanges sur toi, de plus en plus vite (0,6 → 0,5 s) | 2,29 / 3,10 | Soin, corps Spectre |
| Fortune | Coup de dés | damier | 5 cases tirées sur 9, deux fois | 1,87 / 2,53 | Sol, corps Voilé |

Fortune n’a toujours aucun talent : sa version existe (complète et jouable en essai) pour le Glas Originel ou un Masqué qui porterait une relique, plus tard.

### Les règles de justice, et où le code les tient

1. **Formes connues seulement.** `sbVerifier` refuse toute étape dont `f` n’est pas l’une des neuf formes (`formes`), une variante interdite sur une forme, une mesure hors `bornes`.
2. **Chargement.** `sbCharge` = `chargeS` × `accelerationActe` par acte, **jamais sous `sbPlancher`** : la plus courte des capacités actuelles du Masqué à cet acte, lue par `asmDuree` (0,55 / 0,50 / 0,50 s) ; une étape aussi lourde que la plus légère signature ne descend pas sous la plus courte signature (0,85 s). Le plancher suit le Masqué : s’il charge plus lentement, ses armes aussi. Entre le figement et le coup : au moins `verrouMinS` (0,22 s), et `suivi` ≤ 0,6.
3. **Toujours une sortie.** `sbSortie` cherche, depuis ta position au figement, un point libre (dans la salle, hors des piliers en jeu, hors du corps du porteur, hors de toute pièce plus une marge de 4 px) que tu atteins **à pied, en ligne droite, à 180 px/s, sans esquive**, sans jamais être sur une pièce au moment où elle y frappe (instantanée : au lâcher ; anneau, ruée, projectiles : à leur arrivée), réflexe de 0,05 s retiré. En jeu, `sbPlacer` l’exige **avant chaque zone** (au chargement pour une zone fixe, au figement pour une zone qui suit) ; sinon il retourne la zone, tourne la brèche, décale vers le centre de la salle ou tire à nouveau ce qui est tiré au hasard (8 essais) ; sinon **l’étape saute** : aucune zone sans sortie n’est jamais posée. Hors jeu, `sbVerifier` l’éprouve depuis 4 positions du porteur (centre, mur, deux coins) × 6 distances × 16 angles, à l’acte III, seule et avec chaque variante. Un saut n’est toléré que porteur dans un coin (au plus 10 % des placements) : aujourd’hui Ruée et Bastion sautent dans 2 et 6 cas sur 472, contre un coin.
4. **Jamais deux zones à la fois.** `sbPas` est une file à une place : chargement, lâcher, effet tant que la zone vit, silence, étape suivante. Le porteur garde la priorité de zone de sa première charge à la fin de l’attaque (`st.ph` vaut `charge` ou `effet` : `asmZone` fait attendre les Brutes, Hurleurs, Voilés et Bouffis) et attend lui-même que les zones des autres soient finies (`zoneAutre`). Le simulateur tire des pas de temps, des attentes et des durées de zone au hasard et vérifie qu’il n’y a jamais deux zones ouvertes.
5. **Mêmes couleurs.** Les données n’ont pas de couleur (`sbVerifier` refuse tout champ `col`/`couleur` ou toute valeur `#…`/`rgb…`) ; tout est dessiné par `drawZone` du Masqué avec `assemble.couleurs` ; les projectiles sont des projectiles ennemis ordinaires, au liseré `FOE`, que le simulateur compare à `assemble.couleurs.zone`.
6. **Dégâts.** Une étape ≤ `degatsEtapeMax` (2,4, comme Fracas) ; une attaque entière, échelle d’acte comprise, ≤ `degatsMax` (3,6). Les données doivent tenir sans aide ; avec des variantes, le code **plafonne** (`sbPlafond` baisse toutes les étapes d’autant ; 16 cas aujourd’hui, × 0,70 à × 0,98). Navette : deux passages comptés.
7. **Incompatibilités** (comme Explosion et Onde). Règle : deux familles sont incompatibles si la forme principale de l’une apparaît dans l’attaque de l’autre, **formes voisines comprises** (le Masqué rend voisines les formes de deux capacités incompatibles : disque et anneau). Même règle contre les capacités du Masqué, et contre un corps dont la signature a une forme de l’attaque (le corps ne peut pas la porter). Les listes écrites dans les données doivent être exactement celles que donne la règle, et réciproques.

Choix de ce palier non tranchés par la consigne :
- **Pas d’accélération de salle** (`spdMul`) sur les projectiles, l’onde et la ruée des armes : la sortie est jugée sur ces vitesses-là. Les capacités actuelles du Masqué gardent la leur.
- Le cône part du **bord** du porteur (comme la Lame du Masqué) ; la vérification prend le plus gros corps (Brute, 32 px).
- Variantes possibles (une seule étape doublée par `double`, la dernière qui s’y prête) : `traverse`, `rapide` (× 1,2), `elargi` (× 1,15, brèche inchangée), `double`, `vol` (50 % des dégâts infligés rendus au porteur), `repousse` (90 px en 0,2 s, sans perdre la main ni traverser un mur). Aucune n’étourdit le joueur : le jeu n’a pas d’état « étourdi » pour lui, et ce palier n’en invente pas.
- **Renforts** (souvenir purement statistique → porteur renforcé, jamais le chargement) : `pv` +15 %, `degats` +12 %, `vitesse` +12 %, `armure` −10 % de dégâts subis (au plus −30 %), deux au plus (`renfortMax`). Appliqués par `sbRenfort` ; essai : `&renfort=pv,armure`.
- Le Masqué d’essai n’a **pas son trait passif** (projectile tiré toutes les secondes, qui n’est pas une zone) pour qu’on lise l’attaque seule.

### Mesures

- `node themist/outils/sim-brume.mjs` : 0 manquement sur 15 familles × leurs variantes × 3 actes ; les neuf contre-épreuves (disque géant, damier plein, anneau sans brèche, forme inconnue, couleur, incompatibilité oubliée, dégâts, zone qui suit jusqu’au coup, hors bornes) sont refusées.
- En jeu (Chromium sans affichage, acte III, Héraut, 20 s par famille) : avec `bot=1`, **0 coup sur 87 attaques** des 15 familles, aucune étape sautée ; joueur immobile, chaque forme le touche (projectiles, navette, rayons, onde, ruée, disque…), 16 à 28 PV par coup. Les seuls coups parasites venaient de la feinte du Brumeux (`endBluff`), désormais coupée dans la salle d’essai. Le Masqué ordinaire (`?masque=`) et l’écran titre tournent sans erreur ; la barre d’essai n’existe pas hors du paramètre `brume`.
- `node themist/outils/sim-masque.mjs` : inchangé (le Masqué ordinaire n’est pas touché) ; `node themist/outils/wiki.mjs --check` : à jour, la génération charge le nouveau fichier sans s’en servir.

### Ce que le palier 3b doit remplir

1. **`talents`** dans `souvenirs-brume.js` : les 240 talents (la famille vient de `souvenirs.js`, ne pas la recopier). Pour chacun : rien (la version de sa famille telle quelle), ou `{v:[…]}` (variantes : par exemple une aiguille perçante → `traverse`, une ruée qui assomme → `repousse`, un talent de dévoration qui soigne → `vol`, un talent « de plus » → `double`), ou `{renfort:'pv'|'degats'|'vitesse'|'armure'}` pour un souvenir purement statistique (+PV, +vitesse…). Une variante n’existe que si elle est dans `variantes` ; **ne pas en inventer** : si un talent demande autre chose (étourdir le joueur, ralentir, une forme nouvelle), le signaler dans ce document au lieu de le coder.
2. **`reliques`** : les 34 reliques, même forme (la plupart des reliques de statistiques → `renfort`). Elles ne sont jamais portées aujourd’hui (le Masqué ne porte que des talents) : c’est pour le Glas Originel et Fortune.
3. **Vérifier chaque famille en mode d’essai**, avec les variantes et renforts utilisés : `index.html?brume=<famille>&acte=3&variante=…&renfort=…` (et `&bot=1` pour voir la sortie). `node themist/outils/sim-brume.mjs` vérifie que chaque entrée pointe vers un talent, une variante et un renfort qui existent, et repasse la justice avec chaque variante.
4. Ne pas brancher encore les armes sur le Masqué ordinaire : c’est le palier 4. Pour lui, il faudra : faire de l’attaque d’une famille une capacité du cycle (`asmPas` doit savoir qu’une capacité `sb:<famille>` dure plusieurs étapes : déléguer à `sbPas` pendant ce temps), compter sa `menace` dans `budgetMenace`, respecter ses `incompatibles` dans `asmCombos` (familles, capacités, corps), remplacer ou non les capacités de souvenir v17.9–v17.14 (décision à prendre : elles utilisent des formes que le joueur ne connaissait pas avant, taches, tourbillon, cercles, fil, faisceau), et appliquer `sbRenfort` au porteur. Attention : la **feinte du Brumeux** (`bluffTick`, un cercle posé sur toi, vrai ou faux, en salle de combat dès l’acte II ou la salle 6) tourne aussi dans les salles du Masqué ordinaire et ne consulte pas `asmZone` : aujourd’hui elle peut se superposer à une zone du Masqué. Pour tenir « une zone à la fois » au palier 4, elle doit attendre comme les autres ennemis.

À surveiller : Fil et Cloche sont les plus lourdes (3,45 à l’acte III, sous le plafond de 3,6) ; Martèlement enchaîne trois losanges sur toi au plancher de 0,5 s ; la recherche de sortie en jeu coûte quelques millisecondes par zone (rien par image).

## 20. Palier 3b : les souvenirs rattachés aux armes de la Brume (v17.16, 26 octobre 2026)

Consigne : classer chacun des **240 talents** et des **34 reliques** (la famille vient de `data/souvenirs.js`, champs `t` et `r`) : la version ennemie de sa famille telle quelle, ou affinée par une **variante** déjà prévue, ou, pour un souvenir purement statistique, un **renfort** du porteur. Rien d’inventé : ni nouvelle forme, ni nouvelle variante, ni nouveau renfort. Données dans `data/souvenirs-brume.js` (`talents`, `reliques`). **Rien ne change pour le joueur** : aucun code du jeu ne lit encore ces tables (palier 4).

### Résultat

| | Talents + reliques |
|---|---|
| Variante | 40 (Perçant `traverse` 7, Redoublé `double` 19, Large `elargi` 11, Massif `repousse` 2, Vorace `vol` 1) |
| Renfort | 37 (Brutal `degats` 28, Vif `vitesse` 3, Blindé `armure` 3, Robuste `pv` 3) |
| La version de la famille telle quelle (elle suffit) | 41 |
| La version de la famille telle quelle, **mais le souvenir demande autre chose que le système ne sait pas traduire** | 156 |

Chaque entrée est `{}` (la famille telle quelle), `{v:['…']}` ou `{renfort:'…'}`, jamais les deux, une seule variante au plus. Les entrées de la dernière ligne portent un commentaire qui dit ce qui manque.

### Règles de classement (appliquées partout de la même façon)

1. **Variante**, seulement si le texte du souvenir la demande **et** si la forme de sa famille l’accepte : *perce, transperce* → `traverse` (projectile, rayons) ; *répète, écho, second coup, deux fois, double* → `double` (toute répétition, deux ou trois fois) ; *+ rayon, + portée de zone, + taille* → `elargi` ; *repousse* → `repousse` ; *soigne en frappant* → `vol`. Une variante déjà présente dans la famille (Saignée, Mâchoire et Bastion portent déjà `vol`, `vol` et `repousse` sur l’une de leurs étapes) ne se réécrit pas : sur Soin, `vol` ne change rien, le simulateur le refuse.
2. **Renfort**, seulement si le souvenir n’est qu’un bonus chiffré, même conditionnel ou croissant : *dégâts, critique, cadence* → `degats` (approximation : le chargement du porteur n’est jamais touché, la cadence devient des dégâts) ; *PV max* → `pv` ; *vitesse de déplacement* → `vitesse` ; *dégâts subis en moins, bouclier* → `armure`. Quand il y a deux bonus, le premier cité l’emporte (le format n’en admet qu’un). Un bonus mêlé à une autre mécanique (étourdir, ressource, invisibilité, souvenirs à compter…) n’est pas un renfort.
3. Sinon : la version de la famille telle quelle. Quand le souvenir demandait un effet que le système ne traduit pas, l’entrée le dit en commentaire.

Choix de ce palier à connaître : un talent « répété trois fois » (Triple pulsation) devient `double` ; « +20 % de portée » devient `elargi` (× 1,15) quel que soit le pourcentage ; `rapide` n’est demandé par aucun souvenir (aucun ne parle de la vitesse d’un projectile ou d’une onde).

### Ce que la consigne demandait et que le système ne permet pas

« Une ruée qui assomme donne un couloir qui étourdit » : **impossible aujourd’hui** (décidé et codé en v17.18 : le joueur a un état « étourdi », § 22), comme l’annonçait le § 19 (le jeu n’a pas d’état « étourdi » pour le joueur, aucune variante n’étourdit). Rien n’a été inventé : ces souvenirs gardent la version de leur famille, avec le motif en commentaire. De même pour ralentir, immobiliser, brûler, marquer, attirer. **À décider avant le palier 4** : ajouter ou non un état de ce genre au joueur (étourdi, ralenti), et lequel, avec ses règles de justice (durée maximale, jamais enchaîné, jamais pendant une autre zone) ; sans cela, ces 54 souvenirs resteront sans effet propre.

### Souvenirs que je n’ai pas pu classer proprement (156)

Tous ont une entrée `{}` (la famille telle quelle). Ils sont groupés par ce qui manque.

**A. Un état ou un contrôle que le jeu n’a pas pour le joueur**

- Étourdir (le joueur n’a pas d’état « étourdi ») : 12. fan_n1 (Atterrissage), fan_n6 (Rappel Fracassant), dgl_s5 (Temps Fort), dif_x2b (Ruée écrasante), dif_x3b (Carapace explosive), car_x1b (Volée sourde), val_sk (Bal des Morts), pnt_x1b (Toile-piège), trm_x2b (Rembobinage), vor_x2b (Gourmandise) ; reliques : chain (Chaîne du geôlier), chaineg (Chaîne de glas).
- Ralentir : 12. reg_n2 (Crachat collant), bro_s5 (Faufilage), cad_x2a (Pas glissé), car_n1 (Résonance prolongée), pha_s5 (Corne de brume), req_n6 (Cortège), val_s4 (Ronde), gts_sk (Grande Toile), pnt_n5 (Étranglement), car_x3a (Écho de bronze), vor_n5 (Bouche pleine) ; reliques : prismg (Prisme de garde).
- Immobiliser : 5. pnt_n1 (Soie vive), pnt_n4 (Toile), pnt_x3a (Atterrissage tissé), gts_s3 (Soie collante), vor_x1b (Mâchoire profonde).
- Brûlure, saignée : 14. aig_n5 (Saignée), fan_x3b (Fil de lumière), dif_x1b (Morsure arrachée), sai_s4 (Halo de Purification), ray_x2b (Soleil posé), fan_n2 (Lanterne brûlante), fan_x3a (Rappel brûlant), trm_n3 (Fil Tranchant), vor_n6 (Sucs Gastriques), ray_n3 (Aube Brûlante), ray_n5 (Aura vive), sol_s1 (Soleil Noir) ; reliques : oil (Huile sainte), ember (Braise éternelle).
- Marquer, exposer, faire subir plus de dégâts : 7. pen_n3 (Pas d’Ombre), pen_x3b (Fente d’ombre), reg_n5 (Acidité durable), pnt_x3b (Toile mortelle), gts_s4 (Toile Piégée), trm_n4 (Tension croissante), pen_k2 (Marque du Crépuscule).
- Attirer, aspirer : 4. req_x3a (Fosse commune), vor_n1 (Gorgée), vor_x1a (Tourbillon), aby_s1 (Gueule-Abîme).
- Variante voulue mais refusée par la forme de la famille : 2. reg_x1b (Jet pénétrant), ray_n4 (Nova).

**B. Ce qui n’a pas de sens pour un porteur**

- Ressources et charges du joueur (Lueur, Bobine, Corruption, Résonance, Cadence, charges d’esquive, or, relances) : 21. fan_n5 (Rappel vif), reg_n1 (Reflux), aig_n2 (Pelote), bro_s3 (Point serré), pen_x3a (Danse d’ombre), cad_n2 (Pas léger), trm_x3a (Bobine généreuse), car_x3b (Résonance de garde), cad_n5 (Oreille fine), cad_n6 (Syncope), req_n2 (Deuil), req_n5 (Âmes errantes), vor_k2 (Estomac sans Fond), ray_n2 (Lueur d’aplomb) ; reliques : sand (Sablier d’ombre), fuseau (Fuseau d’os), metro (Métronome du sonneur), ash (Cendre d’étoile), crane (Crâne de rat), clef (Clé du Colporteur), boussole (Boussole brisée).
- Recharges, durées, fenêtres de temps : 8. gts_s2 (Soie durable), pnt_k2 (Contrôle Total), cad_n1 (Attaque nette), req_n1 (Glas rapide), chd_s3 (Chœur nombreux), omb_s4 (Danse des Ombres) ; reliques : pendule (Pendule du beffroi), diapason (Diapason d’argent).
- Invisibilité : 4. pen_n5 (Souffle d’ombre), pen_n6 (Silhouette), omb_s1 (Ombrelame), omb_sk (Nuit Éternelle).
- Renaissance : 1. reliques : phoenix (Mèche de Phénix).

**C. Une mécanique propre au joueur que la forme de la famille ne rend pas**

- Alliés, pantins, choristes, lanternes ou toiles à lui : 10. fan_k2 (Constellation), fan_k1 (Lanterne Vivante), pnt_n3 (Pantin), pnt_x2a (Théâtre de marionnettes), mdp_s1 (Maître des Pantins), mdp_s4 (Fils de Commande), mdp_sk (Grand Guignol), chd_s1 (Chœur des Damnés), chd_s4 (Unisson), chd_sk (Requiem).
- Capacité active, ultime ou mécanique d’attache : 31. bro_sk (Temps Suspendu), sol_sk (Zénith), pha_sk (Phare Tournant), reg_k2 (Ventre-Canon), dif_n3 (Bras de Brume), pen_n4 (Lame de Nuit), dif_x2a (Ruée-carapace), sol_s5 (Couronne Solaire), trm_n5 (Ourdissoir), trm_x1a (Fil étendu), trm_x1b (Fil explosif), trm_x2a (Arrachage en chaîne), trm_k1 (Destin Lié), trm_k2 (Fil Rouge), pnt_k1 (Danse des Pendus), gts_s5 (Araignée), car_n4 (Carillon), car_n5 (Timbre clair), car_x2a (Cloches orbitales), cad_n4 (Point d’orgue), cad_x3a (Orgue étendu), dgl_sk (Glas Funèbre), sai_sk (Absolution), aby_s4 (Avaleur de Brume), aby_sk (Gueule du Monde), dif_x3a (Carapace conquérante), cad_x3b (Orgue de combat), chd_s5 (Contre-chant), pnt_n6 (Bouclier de Chair), dif_k2 (Mutation Instable), abe_sk (Métamorphose).
- Rebonds : 3. fan_n3 (Lanterne Ricochante), pen_x2a (Lame en chaîne), car_n3 (Ondes Rebondissantes).
- Guidage : 4. aig_n6 (Aiguilles Chercheuses), aig_x3a (Essaim), aig_x3b (Chasseresse), pnt_x1a (Toile aimantée).
- Exécutions : 5. dgl_s1 (Dernier Glas), dgl_s4 (Coup de Grâce), vor_n4 (Festin), vor_x2a (Banquet), aby_s5 (Engloutir).
- Statistiques mêlées à une mécanique (donc pas un simple renfort) : 13. aig_k1 (Mille Points), ray_x3b (Frappe solaire), reg_k1 (Rupture Maîtrisée), trm_x3b (Tisserand fou), pnt_n2 (Pantin tenace), req_x2b (Tocsin vengeur), req_k1 (Glas des Âmes), ray_k1 (Cœur de Soleil), ray_k2 (Surcharge), pen_k1 (Enfant de la Nuit), dif_k1 (Colosse), req_k2 (Pacte du Sonneur) ; reliques : cercle (Cerclage de fer).

Cas particuliers : `reg_x1b` (Jet pénétrant : perçant voulu, mais `traverse` n’existe pas sur le couloir), `ray_n4` (Nova : « repousse » au rang 2, absent de l’anneau), `car_x1b` (Volée sourde : étourdit et repousse, ni l’un ni l’autre sur l’anneau), `dif_x2b` (Ruée écrasante : l’exemple de la consigne, étourdit).

### Variantes et renforts retenus

- **Perçant** (`traverse`) : ray_x3a (Coup d’aurore) → Rafale ; pen_x1b (Onde d’ombre) → Rafale ; reg_x3a (Salive acide) → Rafale ; cad_x1b (Onde longue) → Rafale ; aig_x1b (Aiguille perçante) → Rafale ; aig_k2 (Aiguille du Destin) → Rafale ; bro_s1 (Brodeuse d’Âmes) → Rafale.
- **Redoublé** (`double`) : fan_x1a (Boomerang) → Rafale ; aig_x2a (Double salve) → Rafale ; sol_s4 (Rayons Jumeaux) → Rais ; pen_x1a (Taillade croisée) → Taillades ; dif_x1a (Double croc) → Taillades ; abe_s4 (Tentacules) → Taillades ; cad_x1a (Frappe jumelée) → Taillades ; cad_k1 (Furioso) → Taillades ; pen_n2 (Image rémanente) → Aller-retour ; pen_x2b (Lame fantôme) → Aller-retour ; cad_n3 (Pas de Valse) → Aller-retour ; cad_x2b (Pas-écho) → Aller-retour ; ray_x2a (Triple pulsation) → Échos ; car_x1a (Cascade) → Échos ; car_n2 (Cloche vive) → Glas ; car_k2 (Tocsin) → Glas ; req_x1a (Glas double) → Glas ; req_x1b (Glas ancré) → Glas ; omb_s5 (Ombres Jumelles) → Croix d’ombre.
- **Large** (`elargi`) : ray_x1a (Prisme vivant) → Rais ; pen_n1 (Estoc) → Taillades ; dif_n1 (Mâchoire de fer) → Taillades ; pha_s3 (Lentille de Fresnel) → Dalles ; reg_x2a (Bile persistante) → Dalles ; val_s3 (Grand salon) → Dalles ; car_x2b (Cloche majeure) → Glas ; vor_n3 (Gueule Béante) → Mâchoire ; aby_s3 (Mâchoires larges) → Mâchoire ; fan_x2b (Phare) → Aube ; sol_s3 (Solstice) → Aube.
- **Massif** (`repousse`) : val_s5 (Révérence) → Dalles ; vor_x3b (Gueule blindée) → Bastion.
- **Vorace** (`vol`) : vor_k1 (Faim Éternelle) → Mâchoire.
- **Brutal** (`degats`) : reg_n4 (Jet précis), sai_s2 (Sainte Bile), aig_n1 (Cadence tressée), bro_s2 (Acier fin), ray_n1 (Faisceau chargé), dgl_s3 (Main lourde), pha_s2 (Huile de baleine), val_s2 (Talons ferrés), trm_n1 (Fil d’amorce), mdp_s2 (Cordes neuves), dgl_s2 (Glas sourd), chd_s2 (Voix d’outre-tombe), aby_s2 (Estomac sans fond), ray_n6 (Plein feu), sol_s2 (Feu sombre), omb_s2 (Lame fantôme), dif_n6 (Frénésie), abe_s1 (Aberration), abe_s2 (Chair malléable), abe_s5 (Yeux multiples) ; reliques : dent (Dent de Léviathan), ciseaux (Ciseaux de la Parque), battantr (Battant de fer), eye (Œil de verre), epine (Couronne d’épines), gant (Gantelet du sonneur), cierge (Cierge votif), bourse (Bourse du Pendu).
- **Vif** (`vitesse`) : mdp_s3 (Troupe), omb_s3 (Voile) ; reliques : feather (Plume de corbeau).
- **Blindé** (`armure`) : dif_n5 (Peau épaisse) ; reliques : dea (Dé à coudre), ancre (Ancre de brume).
- **Robuste** (`pv`) : sai_s3 (Jeûne) ; reliques : wax (Cœur de cire), os (Os creux).

### Vérification

- `node themist/outils/sim-brume.mjs` : **3051 vérifications, 0 échec** (justice sur 15 familles × leurs variantes × 3 actes, file d’étapes, neuf contre-épreuves). Trois contrôles ajoutés : chaque talent et chaque relique de `souvenirs.js` a une entrée ; une variante change réellement sa famille ; une entrée n’est pas à la fois variante et renfort, avec une seule variante. Éprouvés en cassant le tableau à dessein (entrée retirée, variante sans effet, variante et renfort ensemble) : les quatre fautes sont refusées. Chaque variante employée ayant été jugée seule par `sbVerifier`, la justice couvre toutes les entrées.
- **Mode d’essai en navigateur** (`index.html?brume=<famille>&acte=3[&variante=…][&renfort=…]&bot=1`, Chromium sans affichage, 24 s par cas, joueur conduit vers la sortie à 180 px/s sans esquive) : **48 cas** = les 15 familles de base, les 17 couples famille + variante et les 16 couples famille + renfort que le tableau emploie. Justice ✓ dans les 48 ; aucune étape sautée ; les variantes sont bien appliquées en jeu (`double` produit des étapes bis, `elargi`, `traverse`, `vol`, `repousse` sont portés par les zones) ; les renforts aussi (dégâts × 1,12, vitesse × 1,12, PV × 1,15, armure 0,1). Aucune erreur de script ; la seule ligne rouge de la console est un chargement réseau refusé par le bac à sable.
- **Un défaut rare de la version 3a, antérieur à ce palier** (diagnostiqué et corrigé en v17.17, § 21) (aucun code du jeu ne lit les tables) : sur Cloche de base, le joueur conduit vers la sortie a reçu **un coup (18 PV) sur environ 91 attaques** à 60 pas par seconde (le journal de ce coup n’a pas été relevé) ; Onde : aucun coup sur 36 attaques à pleine cadence. Avec six pages en parallèle (une vingtaine de pas par seconde), un coup sur Onde (23 PV, anneau de la 1re étape, en 896 × 647) et un sur Cloche (18 PV, anneau de la 2e étape, en 1184 × 661, près du coin bas droit) : dans les deux cas le joueur se trouvait déjà au point de sortie calculé. Les anneaux sont dans les deux familles touchées : la garantie « toujours une sortie » n’est donc pas absolue sur l’anneau ; **à comprendre avant le palier 4** (piste : l’écart entre la sortie calculée par `sbSortie` et le test de touche en jeu sur l’anneau, de près à un mur, ou à faible cadence).

### Pour le palier 4

Inchangé (§ 19, point 4), avec de plus : lire `talents[id]` / `reliques[id]` du souvenir porté pour obtenir ses variantes (`sbEtapes(J, famille, variantes)`) ou son renfort (`sbRenfort`) ; le porteur d’un souvenir classé « renfort » n’a **pas** l’attaque de sa famille, seulement le renforcement.

## 21. Diagnostic de l’anneau : deux écarts entre la sortie calculée et le jeu (v17.17, 26 octobre 2026)

Constat (§ 20) : sur Onde et Cloche, le joueur conduit vers la sortie calculée était parfois touché par l’onde, rarement à 60 images/s, plus souvent quand le jeu ralentit.

### Méthode

Copie de travail d’`index.html` (non versionnée, supprimée ensuite) qui relève, à chaque coup d’onde, la distance au centre, le rayon de l’onde, son maximum, la bande de touche, l’angle à la brèche, le pas de temps et la sortie calculée. Chromium sans affichage, processeur ralenti (× 4, six pages : le jeu tombe à son pas maximal de 0,05 s), `?brume=onde|cloche[&variante=…]&acte=3&bot=1`.

### Cause 1 (celle des coups observés) : l’onde dépassait son cercle annoncé

Six coups relevés, tous identiques : le joueur **arrêté sur la sortie calculée**, hors de la brèche, à 6 à 8 px **au-delà** de la bande extérieure de l’onde (`d − (max + bande)` = 6,2 à 7,8 px) ; l’onde, elle, avait un rayon de **7,5 à 7,9 px au-delà de son maximum** au moment du coup. Dans la boucle des ondes (`ZR`, bloc v16.24 du Masqué), le rayon avançait de `v × dt`, puis la touche était testée, puis seulement l’onde retirée (`g.r < g.max`) : la dernière image dépassait le maximum d’au plus `v × dt` (14 px à 280 px/s et 0,05 s ; 4,7 px à 60 images/s). La recherche de sortie, elle, tient pour sûr tout point au-delà de `max + bande + 4 px`. Dès que `v × dt` dépasse la marge de 4 px, ce qui arrive même à 60 images/s (4,7 px), une sortie au bord peut être touchée. C’est aussi un défaut visible : l’onde sortait du cercle pointillé qui l’annonce. Il touchait l’Onde du Masqué ordinaire autant que les armes de la Brume.

**Correction** (dans le jeu) : `g.r = min(g.max, g.r + v × dt)`. L’onde frappe une dernière fois exactement à son maximum, puis disparaît. Le Masqué ordinaire en profite (un correctif, noté au journal).

### Cause 2 (trouvée en cherchant la première) : le temps d’arrivée était compté au centre des zones

`sbArrivee` disait quand une zone atteint un point par son **centre**. Le jeu, lui, touche dès que son **bord** arrive :
- onde : la bande de touche fait 10 + 0,6 × PR (18,4 px) devant le front, soit 0,066 s à 280 px/s, 0,074 s à 250 px/s ;
- projectiles et rayons : partis du bord du porteur (à `er` du centre, jusqu’à 32 px) et touchant à `rayon + PR − 3`, ils arrivaient jusqu’à 0,1 s plus tôt qu’annoncé ;
- ruée : le corps du porteur touche à `er + PR`, 0,02 s plus tôt.

Le réflexe retiré au joueur (`reflexeS`, 0,05 s) était donc mangé, et au-delà, par ces bords : la sortie pouvait passer, au mauvais moment, sur une zone qui arrivait plus tôt que prévu. Aucun coup observé n’en venait (les six venaient de la cause 1), mais l’écart est réel.

**Correction** (logique pure, `/*sb:pur*/`) : `sbArrivee(z, x, y, er, PR)` rend le premier instant où la zone peut toucher le point, avec les rayons de touche du jeu (et de `sbDans`). Le réflexe redevient une vraie marge. Le temps d’effet (`sbEffet`) et la touche sur place (`sbDans`) étaient justes.

### Vérification

- `node themist/outils/sim-brume.mjs` : **3054 vérifications, 0 échec**. Étapes sautées et placements retouchés inchangés (Ruée 2 et Bastion 6 sur 472, contre un coin). Épreuve ajoutée (§ 7 du simulateur) : elle rejoue pas à pas, à 20 et 60 images/s, les règles de touche du jeu sur 1181 points touchés (onde, ruée, projectiles, rayons) et exige qu’aucun ne soit touché plus tôt que `sbArrivee` ne l’annonce. Elle vérifie aussi qu’au-delà de la bande extérieure l’onde ne touche jamais, et que le jeu borne bien l’onde. Contre-épreuve sur l’ancien `index.html` : **2 échecs** (516 points sur 1181 touchés plus tôt qu’annoncé, jusqu’à 0,101 s ; onde non bornée).
- Mode d’essai ralenti (pas de 0,05 s), après correction : **0 coup sur 135 ondes lâchées** (Onde, Onde + rapide, Cloche, Cloche + double, environ 115 s de jeu chacune), plus 12 passages courts sans coup. Avant la correction, dans les mêmes conditions : 6 coups sur 6 passages.
- Mode d’essai à cadence normale, les 48 cas du § 20 : **0 coup** (avant : 2), aucune étape sautée, aucune erreur de script.
- `node themist/outils/sim-masque.mjs` : tout est bon. Masqué ordinaire (`?masque=`), écran titre et wiki : sans erreur.

### Ce qui reste

La garantie « toujours une sortie » repose maintenant sur des règles de touche écrites deux fois : dans le jeu, et dans `sbDans` / `sbArrivee`. L’épreuve du simulateur recopie celles du jeu : si l’on change un rayon de touche ou la boucle des ondes dans le jeu, il faut changer les trois. Au palier 4, la feinte du Brumeux (§ 19, point 4) reste à faire attendre.

## 22. L’état « étourdi » du joueur et la variante Assommant (v17.18, 27 octobre 2026)

Décision de l’auteur (27 octobre) : le joueur peut être **étourdi** (pas « ralenti »). Comme le reste des armes de la Brume, il ne sert qu’au mode d’essai tant que le palier 4 n’est pas fait : **rien ne change en partie**.

### Les règles, et où le code les tient

| Règle | Valeur | Où |
|---|---|---|
| Une variante, pas un état libre : seule `etourdit` (« Assommant ») étourdit | — | `souvenirs-brume.js`, `variantes.etourdit` |
| Court | `dureeS` 0,35 s, jamais plus que `justice.etourdi.maxS` (0,4 s ; `sbVerifier` refuse au-delà de 0,5) | `sbEtourdit`, `sbVerifier` |
| Seul un coup qui t’a vraiment blessé étourdit : une esquive, une invulnérabilité ou un bouclier qui absorbe tout l’évitent | — | `sbTouche` (après `hurtPlayer`, seulement si des PV ont été perdus) |
| Intouchable pendant tout l’étourdissement, **par tous** (le porteur, ses projectiles, les autres ennemis, la feinte du Brumeux) : personne n’en profite | `P.iT ≥ durée + 0,05 s` (le jeu donne déjà 0,65 s après un coup) | `sbTouche` |
| Au plus une fois par attaque | `parAttaque` 1 | `sbEtourdit` (`B.etAtt`, remis à zéro au premier chargement) |
| Jamais enchaîné : une immunité commence à la fin de l’étourdissement | `immuniteS` 3 s (au moins 2) | `sbEtourdit` |
| La suite attend : l’étape suivante ne charge qu’une fois l’étourdissement fini **et** un entracte entier écoulé | `entracteS` 0,25 s | `sbPas` (`env.etourdi`) |
| Jamais sur une forme qui frappe en plusieurs morceaux dans le temps (une volée : les autres orbes trouveraient un joueur sans défense) | `interdites` : projectile, rayons | `sbEtourdit`, `sbVerifier` |
| Formes permises | disque, cône, croix, losanges, damier, couloir (rai et ruée), anneau | `variantes.etourdit.formes` |

Étourdi, le joueur ne se déplace plus (`moveInput`), n’esquive plus (`tryDash`), n’attaque plus et ne lance plus de compétence (clics masqués pendant `updatePlayer` ; touches d’action avalées en capture, sauf déplacement, pause, son, talents et guide). Il reprend la main dès la fin, touches tenues comprises. Le pilote du mode d’essai ne le bouge pas non plus. Lisibilité : « Étourdi » s’affiche au-dessus de lui, avec les trois points dorés qui tournent, comme sur un ennemi étourdi (immobiles en mouvements réduits). Le dessin passe par `drawNums`, commun aux quatre formes. Changer de salle efface l’état.

Choix de ce palier à connaître : la durée est celle de la variante, pas celle du talent (Ruée écrasante étourdit 0,8 s chez le joueur, 0,35 s chez le porteur) ; Assommant n’a pas de télégraphe propre (la zone est la même ; la carte d’arrivée montre la famille).

### Reclassement (palier 3b)

Sept souvenirs passent à `{v:['etourdit']}` : Temps Fort `dgl_s5` (Taillades), Ruée écrasante `dif_x2b` (Aller-retour, l’exemple de la consigne), Carapace explosive `dif_x3b` et Volée sourde `car_x1b` (Échos ; sa « repousse » reste sans équivalent sur l’anneau), Bal des Morts `val_sk` et Toile-piège `pnt_x1b` (Dalles), Gourmandise `vor_x2b` (Mâchoire).

Restent sans équivalent : Atterrissage `fan_n1`, Rappel Fracassant `fan_n6`, Rembobinage `trm_x2b` et la Chaîne du geôlier `chain`, parce que leur famille frappe en volée de projectiles (Rafale, Navette) ; la Chaîne de glas `chaineg`, qui fait plus de dégâts aux étourdis mais n’étourdit pas.

Nouveau total : variante 47 (dont `etourdit` 7), renfort 37, famille telle quelle 41, sans équivalent 149 (au lieu de 156).

### Vérification

- `node themist/outils/sim-brume.mjs` : **3337 vérifications, 0 échec**. Épreuve ajoutée (§ 8 du simulateur) : les règles de `sbEtourdit` une à une ; la file d’étapes de chaque famille avec Redoublé, étourdi au hasard à 60 % des lâchers : 240 chargements, jamais pendant un étourdissement, le plus tôt 0,27 s après sa fin (entracte 0,25 s) ; quatre contre-épreuves refusées (étourdissement trop long, sur une volée, immunité trop courte, deux par attaque) ; les branchements du jeu. Contre-épreuve sur le code : sans l’attente de la file ni les interdits, l’épreuve donne 95 échecs.
- **En jeu**, joueur immobile pour être touché, variante Assommant, acte III, 40 s, les quatre formes de joueur : Taillades, Aller-retour, Échos, Dalles, Mâchoire, Glas. **14 étourdissements**, chacun de 0,35 s ; **aucun coup reçu pendant** ; l’étape suivante charge 0,28 à 1,07 s après la fin (jamais moins qu’un entracte) ; deux étourdissements toujours séparés de plus de 3,35 s (4,03 s au plus court) ; pendant l’étourdissement, Espace, clic gauche, A, E, F et D tenu : **0 px de déplacement, 0 esquive, 0 attaque** ; après, D tenu le fait repartir (14 fois sur 14). Aucune erreur de script.
- Régression : mode d’essai avec le pilote sur les six mêmes familles sans la variante, 0 coup ; `sim-masque.mjs` tout bon ; Masqué ordinaire et écran titre sans erreur.

### Pour le palier 4

L’intouchabilité règle d’avance la question des autres ennemis et de la feinte du Brumeux pendant l’étourdissement. Reste à garder une seule source d’étourdissement à la fois : si un autre système du jeu devait un jour étourdir le joueur, il devra passer par `sbEtourdit` (ou partager `P.sbEt`) pour que l’immunité tienne.

## 23. Palier 4 : les armes de la Brume sur le Masqué ordinaire (v17.19, 27 octobre 2026)

Décisions de l’auteur (27 octobre) : un souvenir porté donne l’arme de la Brume de sa famille (ou son renfort) **à la place** des capacités de souvenir v17.9–v17.14 ; même place dans le cycle, même budget, même fréquence ; la hausse de rang et de gravure reste, sous le plafond des armes ; le wiki garde ses secrets (« Parfois, il porte autre chose. Tu le reconnaîtras. »).

### Ce qui a été retiré

- **Données** (`bestiaire.js`, `assemble`) : les capacités `souvenir:true` Taches (Sol), Tourbillon (Dévoration), Cercles (Cloche), Fil (Fil), Faisceau (Faisceau) ; la table `souvenir.familles` (famille → capacité) ; `souvenir.etats` et `assemble.etats` (Halo, Voile, Régénération, Carapace, Fureur) ; `bougeCharge` ne garde que losanges et damier. Restent dans `souvenir` : `chance` 50, `parActe` 2, `usure` 1, `parRang` / `parGravure` 0,15, `pv` 0,1.
- **Jeu** (`index.html`, bloc du Masqué) : géométrie, test de touche et dessin des cinq formes (`zoneDe`, `inZone`, `drawZone`, `dansAnneau`, `anneauPath`, `spirales`, `drawTaches`, `drawTourb`, `drawCercles`, `drawBeam`, `drawFil`), leurs effets au lâcher et pendant l’effet (flaques, attraction, anneaux successifs, fil qui tire, balayage) ; les états (`etatInit`, `etatPas`, `etatSol`, `etatSurLui`, `pointPres`, le halo qui augmentait les dégâts subis, la carapace qui les réduisait, l’effacement du Voile et son immunité) ; leurs champs dans `annule` et `killEnemy`.
- **Wiki** (`wiki.mjs`) : la forme « taches » de la table des formes ; le filtre `!X.souvenir` devenu inutile. Le wiki n’affichait déjà aucune de ces capacités ; seul le journal (v17.9 à v17.14) en garde la trace, comme historique.
- **Simulateur** (`sim-masque.mjs`) : les épreuves 1 ter, 1 quater, 1 quinquies (géométrie de ces formes, états).
- Gardé tel quel : la reprise (D9, `offreReprise` lit toujours `room.asm.sv.x`), les trophées (v17.10), la chronique (`asmSv`, `repris`), les statistiques de descente (`porteurs`), l’Accoutumance (D5 : les dégâts au porteur n’y comptent pas), les PV du porteur (`souvenir.pv`), la bulle d’arrivée (icône cerclée de lavande, nom du talent). `RUN.reserveBrume` ne change pas de forme.

### Comment l’attaque entre dans le cycle

- **Tirage** (`asmSouvenir`) : tout talent de la réserve dont la famille a une arme peut être porté ; l’entrée `souvenirsBrume.talents[id]` dit s’il donne l’attaque telle quelle (`{}`, souvenirs sans équivalent compris), avec variantes (`{v:[…]}`) ou un renfort (`{renfort:…}`). Un souvenir dont l’arme ne tient dans **aucune** combinaison ici (budget de l’acte, incompatibilités) n’est pas choisi (`peut`), pour qu’un autre le soit ; fréquence, `parActe` et usure inchangés. Les reliques ne se portent toujours pas.
- **Place** (`asmCombos`) : l’arme est la capacité `sb:<famille>`, toujours une des deux places de départ, jamais l’éveil. Sa menace est celle de la famille (`asmMenace`) ; ses incompatibilités (familles, capacités, corps) passent par `asmIncomp` et le filtre des corps. Le nom composé prend l’adjectif de la famille (« Brute explosive et vorace »).
- **Renfort** : pas d’attaque ; tirage ordinaire, puis `sbRenfort` sur le porteur (au plus `renfortMax`). Icône du renfort (`renforts.*.ic`, nouveau champ) cerclée de lavande après la signature, au-dessus de lui et dans sa bulle ; nom du talent dans la bulle.
- **Minutage** (`asmPas`) : quand la file arrive à `sb:<famille>`, `st.sb = sbNouveau(…)` ; tant qu’elle existe, `asmPas` délègue à `sbPas` (évènements `sbdebut`, `sbcharge`, `sblache`, `sbfin`, puis `fin` à la fin de l’attaque entière). `st.ph` reflète la file (`charge`, `effet` tant qu’il tient la zone, sinon `attente`), donc `asmZone` et les autres ennemis voient l’attaque comme une seule zone qui dure. `env.vivant` : ce qu’il a lâché (onde, projectiles, ruée) vit encore ; `env.etourdi` : la file attend la fin de l’étourdissement et un entracte. L’éveil arrivé pendant une attaque attend sa fin (`eveilDu`).
- **Dégâts** : `sbForce` remplace `sbPlafond` au début de l’attaque : la force du souvenir (1 + 0,15 par rang au-delà du premier et par gravure) multiplie les dégâts, mais jamais au-delà de `degatsMax / dégâts bruts` ; `sbCoup` borne toujours chaque étape à `degatsEtapeMax`.
- **Pas de `spdMul`** sur les armes (projectiles, onde, ruée) ; le trait passif du Masqué se tait pendant une attaque (la sortie a été jugée sans lui) ; le contact reste.
- **Feinte du Brumeux** : `bluffTick` ne pose plus de feinte pendant `asmZone()` ni pendant un étourdissement (elle se reporte de 0,05 s) ; le Masqué la compte dans `zoneAutre`. Les deux s’attendent.
- **Interruption** (tiré, mis en orbite, pantin) : l’attaque entière s’arrête ; ce qui est lâché va au bout et il attend que ce soit fini.
- Partagé avec le Masqué d’essai (`?brume=`, qui garde `B.seul`) : `sbSuivi`, `sbRuee`, `sbSaute`.

### Un défaut trouvé et corrigé : étourdi mais touché

Avec des vagues présentes, le joueur étourdi recevait des coups des autres ennemis (au premier passage : 30 coups, pendant 24 des 50 étourdissements). Cause : depuis la v17.5, l’invulnérabilité qui suit un coup ne protège que de l’ennemi qui l’a donné (`P.hitIT`), et le coup qui étourdit pose 0,65 s d’invulnérabilité « de coup », plus longue que l’étourdissement (0,4 s) ; la règle § 22 « intouchable par tous » n’avait été mesurée que sans autres ennemis. Correction : `hurtPlayer` ne fait rien pendant `sbEtourdi()` (ennemis, projectiles, feinte) ; seuls les coûts que tu t’infliges (`loseHp` direct : corruption, Rupture, Furioso) passent. `sim-brume.mjs` vérifie ce branchement, et qu’une seule source pose l’étourdissement (`sbTouche` → `sbEtourdit`).

### Deux autres écarts entre la sortie calculée et le jeu, corrigés

- **La ruée poussée hors de sa ligne.** En jeu, après le pas du Masqué, `updateEnemies` applique le recul (`kbx`, `kby`) et la séparation entre ennemis (`collideEnemy`) : dans une salle pleine, le corps du porteur s’écartait de quelques pixels de la ligne sur laquelle la sortie avait été calculée, et touchait un joueur posé sur la sortie (2 à 3 coups par essai de Ruée, quatre formes, dès qu’une vague est là ; rien dans le mode d’essai, qui n’a pas d’autres ennemis). Correction : la ruée part de l’origine de sa zone (`x0`, `y0`) et suit exactement sa ligne (`fait`), recul annulé pendant ce temps (`sbRuee`). Après : 24 essais de Ruée, Redoublé et Assommant, quatre formes, actes I et III, **0 coup**.
- **Le joueur plus gros que celui de la justice.** `sbSortie` cherchait la sortie pour un joueur de rayon `justice.joueur.rayon` (14), alors que le jeu teste la touche avec `P.r`, et que le Gouffre grossit (× 1,12 puis × 1,25 avec la corruption, Colosse, métamorphose). En jeu, la sortie est maintenant cherchée avec le plus grand des deux (`o.pr`, passé par `sbOrigine`) ; une étape qui n’a plus de sortie pour un gros Gouffre saute, comme les autres. Le simulateur garde le rayon de référence. La vitesse, elle, reste celle de la justice (180 px/s) : voir les limites.

### Mesures

- `sim-brume.mjs` : **3339 vérifications, 0 échec** (deux de plus : le refus des coups pendant l’étourdissement, une seule source d’étourdissement). `sim-masque.mjs` : **3 045 841 contrôles, tout est bon** ; 216 souvenirs donnent une attaque (47 avec variante), 24 un renfort ; tirage avec réserve à **50,0 %** de porteurs (réglé à 50) ; aucune capacité retirée tirée ; 2019 combats, 12 101 attaques, 31 201 étapes intégrées au cycle, jamais deux zones à la fois, éveil compris.
- **En jeu**, Chromium sans affichage, horloge d’images à 60 par seconde, page instrumentée (une copie servie au navigateur ; le fichier n’a rien en plus) : salle d’élite par `__asm.essai(null, acte, true, id, forme)`, plus une Brute, un Hurleur, un Voilé, un Bouffi et un Spectre immortels en plus de l’escorte ; PV du porteur tenus à 100 %, puis 60 % (éveil), puis 25 % (rage) ; 42 s par essai. 26 souvenirs (14 familles telles quelles ; 8 variantes : Assommant sur Ruée, Onde et Dévoration, Perçant, Redoublé, Vorace, Repousse, Large ; 4 renforts : Brutal, Blindé, Robuste, Vif) aux actes I à III, les quatre formes (23 ou 24 essais chacune), plus Assommant, Redoublé, un renfort et Cloche aux quatre formes à l’acte III : **94 essais**, 90 porteurs (les 4 autres : Cloche et Garde aux actes I et II, voir limites). Version finale (après les trois corrections ci-dessus, série rejouée entière) : 279 attaques, 602 étapes, **0 étape sautée**, 1010 sorts ordinaires autour. Le joueur conduit vers la sortie calculée (vitesse de référence 180 px/s, contact du porteur coupé) : **0 coup de l’arme**. **Jamais une zone du Masqué ouverte en même temps qu’une zone d’un autre ennemi ni qu’une feinte** (sur 273 290 images), jamais plus d’une zone du Masqué à la fois. (Premier passage, avant les corrections : 305 attaques, 0 coup hors Ruée ; 4 coups d’abord comptés étaient des tirs de Spectre, mal attribués par le banc.) 16 renforts sur 16 : aucune capacité `sb:`, icône et nom dans la bulle. **Aucune erreur de script.**
- **Étourdi**, joueur immobile, ennemis à zones présents (escorte au contact retirée pour que les coups portent), 60 s, 13 essais (Ruée, Onde et Dévoration Assommantes, actes I à III, quatre formes) : version finale, **42 étourdissements**, de 0,33 à 0,37 s (à l’image près), **0 coup reçu pendant**, au moins 3,80 s entre deux, aucun chargement pendant, l’étape suivante charge au plus tôt 0,27 s après la fin (entracte 0,25 s), aucune superposition, aucune erreur.
- **Reprise** (D9) : porteur brisé (attaque Gourmandise, renfort Jet précis, Fil souple) : offre après la relique du champion, reprise en trophée hors limite, sortie de la réserve, chronique « Un Masqué portait… » puis « tu as repris… », compteur de porteurs.
- **Feinte** : une à deux feintes en 80 s avec un porteur, avec un Masqué ordinaire et sans Masqué ; attente cumulée au plus 1,1 s.
- **Écran titre et descente ordinaire** sans réserve, les quatre formes, 24 salles d’acte I chacune : 11 Masqués apparus d’eux-mêmes, capacités ordinaires seulement, aucune superposition, aucune erreur. **Fortune** (aucun talent, jamais portée) : `?brume=fortune&bot=1` aux actes I à III, 0 coup, 0 saut.

### Limites et ce qui reste à surveiller

- **Cloche et Garde ne sont jamais portées aux actes I et II** : leur menace (3) ne tient dans aucune combinaison sous le budget 11 ; Ruée et Ombre (menace 3) n’y ont que 2 combinaisons. Avant, Cloche donnait Cercles (menace 2) et Garde un état hors budget. Le Masqué prend alors un autre souvenir de la réserve. **À décider** : budget propre au porteur, ou menace de ces familles.
- Fortune n’a aucun talent : le Masqué ne la porte jamais (inchangé).
- Hors du Masqué, rien n’a changé : les ennemis ordinaires de types différents peuvent toujours lancer leurs zones ensemble (jetons par type, `tokMax`), et la feinte n’attend pas les ennemis ordinaires. Mesuré : environ un quart des images avec deux zones ordinaires ouvertes, dans ces salles chargées d’ennemis immortels.
- Le Gouffre n’a pas grossi pendant ces essais (rayon 14 au plus) : la recherche de sortie au vrai rayon est en place mais n’a pas été éprouvée sur un gros Gouffre.
- Le pilote n’est pas un joueur : il va droit à la sortie, à la vitesse de référence, sans esquive. Une forme plus lente que 180 px/s (Gouffre en Dévoration) n’a pas la garantie de sortie à pied (la recherche ne connaît que la vitesse de la justice), et un joueur qui frappe pendant l’attaque n’a pas été mesuré.
- Ce qui reste sans équivalent (étourdir sur une volée, ralentir, brûler…) garde l’attaque de la famille telle quelle (§ 20, § 22).
- Les rayons de touche restent écrits à trois endroits (jeu, `sbDans` / `sbArrivee`, épreuve § 7) : non modifiés.

## 24. Budget du porteur, sortie à ta vitesse (v17.20, 27 octobre 2026)

Suite des limites du § 23.

### Budget du porteur

- `assemble.budgetPorteur` (bestiaire.js) : **+2** de menace pour un Masqué qui porte une arme de la Brume (`asmCombos`, seulement quand `ctx.porte` est une `sb:<famille>` ; ni pour un renfort, ni pour un Masqué ordinaire, dont le budget ne bouge pas).
- Pourquoi +2 et pas +3 : aucune combinaison ne dépasse 13 de menace (corps 1–2 + signature 3 + trois capacités 2–3). À +2, le porteur des actes I et II a le plafond de l’acte III ; à +3 la liste est **identique** (mesuré). L’acte III n’est pas touché (13 + 2 ne débloque rien).
- Le Glas et le Bastion étaient sans place aux actes I et II à cause de leurs incompatibilités : Glas (pas d’explosion ni d’onde) et Bastion (ni lame, ni explosion, ni onde) ne tenaient que sur le Spectre, avec Salve (2) et Charge (3) : 1 + 3 + 3 + 2 + 3 = 12.
- Combinaisons (bases) avec un porteur, actes I et II, avant → après : Glas 0 → 4, Bastion 0 → 2, Ruée 2 → 6, Ombre 2 → 3 ; les autres inchangées. Menace moyenne d’un porteur : 10,9 → 11,0 (acte I), 10,9 → 11,3 (acte II, avec le Voilé à partir de la salle 14) ; les Masqués ordinaires restent à 11,0 / 11,4.
- Le Bastion n’a toujours que 2 combinaisons (Spectre, avec Salve et Charge dans un sens ou dans l’autre), à tous les actes : c’est le prix de ses incompatibilités, pas du budget.
- `sim-masque.mjs` : le budget recompté tient compte de `budgetPorteur` ; **chaque famille doit trouver une place à chaque acte** (avant, seulement à l’acte III) ; un Masqué ordinaire reste sous le budget de l’acte.

### Sortie à ta vitesse

- `pMarche(obs)` (index.html, avant `updatePlayer`) : ta vitesse à pied, sortie du calcul de déplacement (même formule : élan, transe de l’Hérault, obscurité de la Lanterne, palier et Fièvre du Gouffre), **sans** ce que tu tiens toi-même et relâches quand tu veux : faisceau de la Lanterne tenu (× 0,55), Dévoration (× 0,6), Absolution (× 0,3). `updatePlayer` applique ces trois-là après.
- `sbOrigine` passe `pv: pMarche()` ; `sbSortie` cherche à `min(justice.joueur.vitesse, o.pv)` : jamais plus vite que la justice (180 px/s), plus lentement si tu l’es. Si rien n’est à ta portée, `sbPlacer` essaie ses autres placements, puis l’étape saute (règle inchangée). Le simulateur, `sbVerifier` et le tableau de lecture gardent la vitesse de référence.
- Le pilote du mode d’essai (`bot=1`) roule à la même vitesse (`min(180, pMarche())`).
- Choix : la Dévoration et l’Absolution ne comptent pas. Les compter ferait sauter une bonne part des étapes chaque fois que le Gouffre dévore ; le joueur peut relâcher, comme il peut s’arrêter de frapper.
- `sim-brume.mjs` § 9 : 99 placements ; plus vite que la justice, même sortie ; à 150 et 120 px/s, toute sortie trouvée est à ta portée, 9 cas sur 198 sans sortie (en jeu, l’étape essaierait un autre placement puis sauterait). **3629 vérifications, 0 échec.**

### Trait passif

- Rappel : le trait passif du Masqué est **suspendu** pendant une attaque de la Brume (v17.19, `!sst`), parce que la sortie est jugée sans lui. Ce n’est pas un défaut de son : on n’y touche pas (le réactiver casserait la garantie de sortie).

### Mesures

- En jeu (Chromium, horloge à 60 images par seconde, même banc qu’au § 23, 30 s par essai, vagues à zones et Spectre immortels autour) :
  - Gouffre acte III, 14 familles (Fortune n’est jamais portée), à 4 réglages : vitesse normale (≈ 184 px/s, pilote à 180), **150**, **120** px/s, et **gros** (rayon × 1,3 = 18,2 px) à 150 : **56 essais, 56 porteurs, 150 attaques, 319 étapes, 0 étape sautée, 0 coup de l’arme**, aucune zone du Masqué en même temps qu’une autre ou qu’une feinte, aucune erreur.
  - Glas et Bastion aux actes I (Lanterne) et II (Tisse-Destin), deux souvenirs chacun : **8 essais, 8 porteurs** (Brute ou Spectre), 21 attaques, 0 étape sautée, 0 coup de l’arme.
  - Descente ordinaire (réserve vide), les quatre formes, 24 salles d’acte I : 7 Masqués ordinaires, aucune superposition, **aucune erreur** (le calcul de vitesse a été déplacé dans `pMarche`).
- `sim-masque.mjs` : tout passe ; tirage avec réserve à 50,0 % de porteurs ; le Glas passe de 486 à 1490 porteurs sur le tirage complet, le Bastion de 215 à 639.

### Ce qui reste à surveiller

- Les zones ordinaires simultanées (ennemis de types différents) et la feinte qui n’attend pas les ennemis ordinaires : inchangé, à corriger seulement sur un cas vu en jeu (§ 23).
- Sous ≈ 120 px/s, certaines étapes sauteront plus souvent : le Masqué semblera moins dangereux avec une forme très lente. Aucune forme n’y descend aujourd’hui sans ralentissement tenu.

## 25. Le Masqué vient au contact (v17.21, 27 octobre 2026)

Retour de l’auteur : un Masqué qui a un sort au corps à corps (zone centrée sur lui) doit aller au contact ; un Spectre qui reste à distance et lâche sa zone dans le vide ne sert à rien.

### Diagnostic

- Avant un sort court, il ne s’approchait que **0,5 s** (`attenteS`), puis lançait quand même. Un Spectre (garde-distance 210–300 px, ≈ 164 px/s en approche) parcourt ≈ 80 px en 0,5 s : il lançait loin.
- Les portées écrites dépassaient souvent ce que la zone couvre : Explosion lancée à 150 px pour un disque de 100 ; Lame 120 pour 95 + son corps ; cône du Bastion 140 pour 85 + son corps ; Taillades 110 et 100 pour 80 et 66 + son corps ; le disque du Bastion (centré sur lui) n’avait **aucune** portée : lancé à n’importe quelle distance.

### Règle

- `assemble.atteinte` (0,8) : un sort ou une étape **au contact** (disque ou cône posé sur lui) ne part que si tu es à 0,8 × ce que la zone couvre (cône : son rayon + le corps du Masqué ; disque : son rayon), même si la portée écrite est plus grande ou absente. `asmPortee` (capacités) et `sbPortee` (étapes) ; le jeu passe la taille du Masqué (`env.er`). Les autres formes gardent leur `portee` (projectiles : c’est aussi leur course).
- `attenteS` 0,5 → **2 s** : il fonce sur toi (× 1,3, comme avant) ; s’il ne t’a pas atteint à temps, il **renonce** : événement `renonce` (capacité ordinaire : comptée comme lancée pour le cycle, aucune zone, pause normale) ou `sbrenonce` (arme de la Brume : **toute l’attaque** est abandonnée, pour ne pas enchaîner deux poursuites). La signature n’a pas de portée : jamais abandonnée.
- Fuir reste une défense : toutes les formes marchent plus vite que lui en approche (205 à 232 px/s contre ≈ 164).
- Le corps garde sa façon de bouger hors de ces approches : le Spectre revient à distance après son sort.

### Mesures

- `sim-masque.mjs` : dans la file de sorts simulée, **22 738 sorts au contact, tous à portée** ; joueur toujours à 600 px, 40 s par combinaison : aucune zone au contact lancée, 322 sorts et 153 attaques abandonnés ; portées de lancement ≤ 0,8 × couverture pour chaque capacité et chaque étape au contact ; la taille du porteur est bien passée par le jeu. `sim-brume.mjs` : 3584 vérifications, 0 échec (la file aléatoire abandonne quelques attaques, d’où moins d’étapes comptées).
- En jeu (Chromium, même banc, 30 s par essai) : Voilé (Explosion, Lame), Brute (Explosion, Lame), Spectre porteur de Bastion, Taillades, Mâchoire, Voilé porteur de Taillades, joueur immobile puis joueur qui fuit à 230 px/s (12 essais) : immobile, toutes les zones au contact partent avec toi dedans (au plus 0,81 × leur rayon, contre 210–300 px avant pour le Spectre) ; en fuite, 4 à 5 renoncements par essai, aucune zone lancée dans le vide. Série des 14 familles (Gouffre et trois autres formes, 21 essais) : 51 attaques, 110 étapes, **0 étape sautée, 0 coup de l’arme**, 45 zones au contact toutes à portée, aucune superposition, aucune erreur. Descente ordinaire, quatre formes, 24 salles : 9 Masqués ordinaires, aucune erreur.

### À surveiller

- Un joueur qui fuit sans cesse rend les sorts au contact inoffensifs (2 s de poursuite puis abandon) : c’est voulu, mais si le Masqué paraît trop passif contre un kiteur, raccourcir `attenteS` ou lui faire tirer son trait pendant la poursuite.
- Plus près de toi, le Masqué inflige plus souvent ses dégâts de contact pendant l’approche (contact × 0,8 de ses dégâts).


## 26. Palier 3 : le Glas Originel se souvient (v17.22, 27 octobre 2026)

Cadrage : document `claude/la-brume-v17-22-glas-cadrage.md` du projet claude.ai (décisions G1 à G18). L'auteur a demandé d'appliquer toutes les recommandations telles quelles (27 octobre).

### Ce qui est construit

| Où | Quoi |
|---|---|
| `data/gardiens.js`, `attaques[3].souvenirs` | Réglages : `max` 3 gestes, `recence` [1, 3], `repertoire` [—, 0, 2, 3] par temps, `file` (temps 2 : +1 ; temps 3 : un Battement inverse remplacé, +1), `degats` 0,6, `reflet` (r 18, naissance 0,6 s, fin 0,4 s, naît à 180–220 px de toi, 126 px/s, ×1,3 quand il vient te chercher), `attenteMaxS` 5, `renforts` (max 2, −10 % par Robuste ou Blindé pendant un geste), `copie` faux. Hors de `file` et `liste` : le wiki ne les lit pas. |
| `index.html`, bloc `/*glas:pur*/` (dans le bloc du Masqué) | `glasRepertoire` (tirage sans remise à la récence, familles différentes et compatibles, renforts à part), `glasEnJeu`, `glasFile`, `glasMelange` (jamais deux gestes de suite ni juste après un Appel), `glasBulle` / `glasPas` (naissance, jeu, fin, entracte, reprise ; coupure, abandon, étourdi). |
| `index.html`, section « v17.22 · Le Glas Originel se souvient » (fin du bloc du Masqué) | Répertoire à la création du Glas (`createBoss`), clés `brume` dans `heartPattern` (les autres clés passent par `nextKey` du bloc v16), le Reflet (`refletNouveau`, `refletMaj` → `sbMaj`), la bulle (`glasTick`), coupure au changement de temps (`b13Phase`), mort (`bossDefeated`), dessin (silhouette de ta forme dessinée hors écran puis teintée, icônes cerclées de lavande, barre de chargement), carte d'arrivée, chronique, mode d'essai `?glas=`, accès de développement `__glas`. |
| Branchements ailleurs | `sbOrigine` : le corps du gardien bloque la sortie. `sbMaj` : `B.force` passe par `sbForce` ; `S.autre()` fait attendre le Reflet. `tryTok`, la mèche du Bouffi et la feinte attendent aussi `glasZone()`. Bloc v16 : `window.__glasHZ`. Moteur de voix : `brumeSouvenir` (le chuchotement de l'oubli, voyelles inversées, sans grave). Statistiques de descente : champ `glas` (`reserve`, `rep`, `renforts`, `ids`, `joues`, `sauts`, `renonces`, `abandons`, `coupes`). |
| `outils/sim-brume.mjs`, section 10 | Répertoire, récence, file, mélange, bulle, justice dans la salle du Glas, dégâts, branchements. |
| `outils/wiki.mjs` | Une phrase sous les attaques du Glas : « À partir du deuxième temps, une silhouette sort parfois du Cœur. Tu la reconnaîtras. » |

### Comment un geste se joue

1. À l'entrée de la salle, le répertoire est tiré dans `RUN.reserveBrume` (talents seulement). Réserve sans arme : `room.glas.rep.gestes` est vide et `heartPattern` appelle la version d'avant sans rien toucher (aucun tirage aléatoire de plus).
2. Aux temps 2 et 3, la file du Glas est `glasFile` mélangée par `glasMelange`. Une clé `brume` lance le geste suivant du répertoire, à tour de rôle parmi les `repertoire[temps]` premiers.
3. La bulle commence : le Glas reste `idle`, `patT` est tenu, le Battement ne bat plus (`beatT` tenu à 0,5 s). Le Reflet naît dans un filet de brume parti du Cœur (0,6 s ; rien en mouvements réduits), au chuchotement `sfx('souvenir')`.
4. Le Reflet joue l'attaque de la famille par `sbMaj` (porteur seul, corps « rôdeur » 110–170 px). Avant chaque chargement, il attend `zoneAutre` (anneaux du Battement, zones des invoqués) et `glasOccupe` (`HZ`, tirs du gardien, Dévoreuse). S'il attend plus de 5 s, il renonce.
5. L'attaque finie (ou abandonnée), il se dissout (0,4 s). Le Glas attend que ce qu'il a lâché soit fini, puis un entracte (0,25 s), puis reprend (`patT = bossGap`).

Le Reflet est hors de la liste `enemies` : rien ne le vise, ne l'attache ni ne le tue (`hitEnemy`, `friendlyHit`, `rawHit` le refusent). Il a `type:'boss'`, si bien qu'une mort pendant un geste est attribuée au Glas. Variante Vorace : ce qu'il te prend soigne le Cœur.

### Choix de l'implémentation à connaître

- Renfort Brutal : il passe par la force, donc sous le plafond (le cadrage le prévoyait sur les dégâts du Reflet, ce qui aurait dépassé le plafond annoncé de 1,44 par étape). Vif : vitesse d'approche du Reflet. Robuste et Blindé : le Cœur subit −10 % chacun pendant un geste.
- Le message du deuxième temps : les messages de tutoriel (`tuto`) sont éteints depuis la v15. Effacer la copie ne retire donc aucun texte.
- La fenêtre « à nu » : pendant un geste, son signal est gelé et son minuteur bloqué juste sous le seuil ; elle s'ouvre après le geste. Le Tisse-Destin (fils tranchés) n'est pas concerné.
- Étourdi : pendant un étourdissement et l'entracte qui suit, le Glas ne lance rien de neuf (`patT` tenu), geste ou non.
- Le mode d'essai démarre le Glas à 60 % (temps 2) ou 30 % (temps 3) de PV et le tient dans ce temps ; `&appel=0` retire l'Appel de la file pour mesurer les gestes seuls.

### Mesures

- `sim-brume.mjs` : **46 602 vérifications, 0 échec** (`--vite`). Section 10 :
  - 2000 répertoires tirés au hasard (0 à 3 gestes : 25 / 301 / 451 / 1223), jamais deux familles égales ni incompatibles, jamais un renfort comme geste ;
  - récence : premier geste du plus ancien au plus récent 16,6 / 33,5 / 49,9 % (attendu 16,7 / 33,3 / 50) ;
  - file : sans geste, identique à la v17.21 ; chaque attaque du Glas reste dans son temps ; 10 000 files mélangées sans deux gestes de suite ni geste après un Appel ;
  - bulle : ordinaire, coupée, abandonnée, étourdi (rien ne reprend avant la fin de l'étourdissement plus un entracte) ;
  - justice dans la salle du Glas (Reflet r 18, Cœur et piliers de cristal en obstacle) : 52 200 placements, 25 étapes sautées (au plus 0,6 %, Bastion) ;
  - dégâts au pire (rang 3, deux gravures, Brutal) : 1,23 × les dégâts du Glas par étape, 2,16 par attaque (plafonds 1,44 et 2,16).
- `sim-masque.mjs` : 3 583 218 contrôles, tout est bon (le contrôle de la feinte lit maintenant aussi `glasZone()`). `wiki.mjs --check` : à jour.
- En jeu (Chromium sans affichage, horloge à 60 images par seconde, une image sur six dessinée, pilote vers la sortie à 180 px/s ou à ta vitesse si elle est plus lente, mode `?glas=`) :
  - **14 familles × 4 formes** (temps 2 et 3 en alternance, 35 s, sans Appel) : 56 essais, **80 gestes joués, 0 coup reçu pendant un geste, 0 image où une zone du Reflet est ouverte en même temps qu'une zone du Glas ou d'un invoqué, 0 étape sautée, 0 renoncement, 0 abandon, aucune erreur**. Le Glas passe 21 % du temps des temps 2 et 3 dans un geste ; un geste dure 3 à 6 s, attente des tirs de la Spirale comprise.
  - **Étourdi** (Assommant sur Aller-retour, Échos, Mâchoire, Taillades, Dalles, Croix d'ombre, Bastion, Saignée ; joueur immobile, quatre formes, temps 2 et 3 ; 16 essais) : 12 étourdissements, **0 coup reçu pendant**, aucun chargement pendant, le suivant au plus tôt 0,28 s après la fin, le Glas n'a rien lancé pendant ni dans l'entracte. Les gestes touchent bien un joueur immobile (2 à 6 coups par essai).
  - **Variantes** (Redoublé ×3, Perçant, Large ×2, Massif, Vorace) et **renforts** (Brutal, Vif, Robuste, Blindé, Brutal + Blindé) : 13 essais, 0 coup, 0 superposition, 0 saut.
  - **Avec l'Appel** (4 essais, 60 s) : 0 superposition ; les coups reçus pendant un geste (1 à 5) sont le contact des Rampants invoqués autour du pilote immobile (toutes les 0,66 s, 10 à 14 PV, à toutes les phases), pas des zones.
  - **Coupures** : 4 changements de temps pendant un geste, aucun chargement après la coupure, 0 superposition. **Mort du Glas** pendant un geste : 3 essais, la ligne de chronique écrite (« Le Glas sonnait encore Nova. »), aucun projectile du Reflet restant, aucune erreur.
  - **Gouffre** (Dalles, Glas, Croix d'ombre, Échos, Martèlement, Saignée) à 150 px/s, 120 px/s et gros (r 18,2) à 150 : 18 essais, 36 gestes, **0 coup, 0 saut**.
  - **Mouvements réduits** (trois gestes) : 3 gestes, 0 coup, aucune erreur. **Réserve sans geste** : aucun Reflet, aucune erreur.
  - **Régressions** : écran titre, Masqué porteur (`?masque=`), arme seule (`?brume=onde`), Héraut Noyé (acte II), Glas sans réserve hors mode d'essai : aucune erreur.
  - Captures : la silhouette de chaque forme se lit (translucide, grisée de lavande), icône et barre au-dessus, carte avec le nom du talent.

### À surveiller

- **La durée du combat** n'a pas été mesurée sur de vraies parties : le pilote ne frappe pas. Estimation du cadrage : +8 à +15 % sur les temps 2 et 3. Le champ `glas` des statistiques de descente et `RUN.bossT` diront si `pvMul[3]` doit passer de 2,5 à 2,3.
- **L'attente des tirs de la Spirale** allonge certains gestes (jusqu'à 2 s avant la première zone). Si la bulle paraît molle, le Reflet pourrait ne pas attendre les tirs déjà loin de toi.
- **La lisibilité** se juge en jouant : on doit reconnaître sa propre silhouette, pas un ennemi invoqué.
- Le pilote n'esquive pas et ne frappe pas ; un joueur qui frappe le Cœur pendant un geste n'a pas été mesuré.
- Une relecture du code par un second agent, prévue au découpage (action 7), n'a pas été faite.

## 27. Palier 5 : le Dernier Souvenir (28-29 octobre 2026, actif depuis v17.23, équilibré en v17.24)

Cadrage : document `claude/la-brume-v17-23-dernier-souvenir-cadrage.md` du projet claude.ai (décisions DS1 à DS19). L'auteur a demandé les actions 1 et 2, puis 3, du découpage (DS19) ; les recommandations du cadrage sont appliquées telles quelles. **Le jeu ne montre encore rien** : `dernier.actif` est faux dans `souvenirs.js` tant que la touche X (action 4) n'est pas branchée ; les effets existent, mais seule la console peut brûler (`__dernier.bruler`). Pas de numéro de version ni de ligne de journal : rien ne change pour le joueur.

### Ce qui est construit

| Où | Quoi |
|---|---|
| `data/souvenirs.js`, `dernier` | Réglages : `actif`, `parActe` 1, `touche` KeyX, `maintienS` 0,35, `invulS` 0,5, `dureeMaxS` 5, `interdits` (racine de voie, trophée), `force` (0,15 par rang, 0,25 par gravure, poids du genre de la gravure), `plafonds` (4 % des PV d'un gardien ou d'un Masqué par point de force, 8 % au plus ; soin et bouclier ≤ 40 % des PV max), `controles`, et les 14 effets de famille (`n`, `d`, `v`, `monte`, `max`, `fort`). Fortune n'a pas de talent, donc pas d'effet. |
| `data/icones.js` | `u_braise` (la flamme du Dernier Souvenir). |
| `data/arbre.js` | État `b` (brûlé : tracé, cendre, pointillé braise), classe `bru`, légende « Brûlé » sur demande (`legende({etats, brule})`). Le wiki reçoit la feuille de style (régénéré), pas la légende. |
| `index.html`, bloc `/*ds:pur*/` (dans « v17 · La Mémoire ») | `dsGenre`, `dsForce`, `dsRefus` (relique, trophée, genre, famille, effet en cours), `dsBraises` / `dsDepense` (une par acte, non cumulable), `dsCombat`, `dsValeurs` (force, bornes, contrôles remplacés contre un gardien ou un Masqué), `dsPlafond`, `dsMaintien`. |
| `index.html`, bloc v17 | `burn()` à côté de `forget()` : retire le talent sans le pousser dans la réserve, `M.brules`, braise dépensée, recalcul sans soin (`resync`), ce qui en dépendait s'éteint, trace gardée, chronique « tu as brûlé … ». `nodeAvailable` refuse un talent brûlé (jamais reproposé ; jamais gravé ni repris, puisqu'il n'est ni en mémoire ni dans la réserve). `DS_COURS` : la brûlure attend la fin d'un effet en cours (12 ultimes, Carapace, Point d'orgue). Désignation (`M.designe`) : clic sur une tuile de la Mémoire dans la pause (une seule, second clic retire ; la racine refuse), liseré de braise sur la tuile au HUD et dans la pause, fêlure sur ce qui s'éteindrait avec elle, braise de l'acte au bout de la rangée ; la désignation tombe si le talent part autrement. Arbre : état brûlé, légende « Brûlé » quand il y en a. |
| `outils/sim-dernier.mjs` | Vérification hors navigateur (voir Mesures). |
| Console | `__dernier` : `activer()` (montre la désignation sans toucher aux données), `designer(id)`, `bruler(id?, {libre})`, `refus(id)`, `force(id)`, `braises()`, `enCombat()`, `valeurs(famille, force, fort)`, `plafond(force, pv)`, et pour les essais `prendre(id, rang, gravures)` (passe par `restore` : il compte comme « repris » dans les statistiques), `dispo`, `offres`, `gravables`, `arbre`, `legende`. |

### Écart avec le cadrage

- Ombre (« Dernière ombre ») : le cadrage ne lui donnait rien qui monte avec la force ; `critMult` +0,3 (au plus +0,9) a été ajouté pour que le rang et la gravure comptent pour toutes les familles. À valider.

### Mesures

- `sim-dernier.mjs` : **3 988 vérifications, 0 échec**. 228 talents brûlables sur 240 (les 12 racines non) : 63 mineurs, 57 compétences, 72 majeurs, 24 nœuds clés, 12 ultimes ; force de 1 à 3 ; trois brûlures au plus par descente ; plafonds au palier 0 (force 1 · 2 et 3) : Mère-Brume 106 · 212, Héraut Noyé 230 · 460, Glas 360 · 720, Masqué 29 · 59. Contre-épreuves faites à la main : une durée qui monte avec la force et un ultime retiré de `DS_COURS` sont attrapés.
- `sim-brume.mjs --vite` : 46 602, 0 échec. `sim-masque.mjs` : 3 583 218 contrôles, tout est bon. `wiki.mjs --check` : à jour.
- Chromium sans affichage (`?masque=fan_n2&classe=…&acte=2`, quatre formes, 117 vérifications, 0 échec, aucune erreur de script) : inerte tant que `actif` est faux ; racine refusée, ultime brûlable, ultime en cours refusé ; désignation par clic dans la pause, marque au HUD, fêlure sur le majeur lié, second clic qui retire ; brûlure en combat : place libérée, rien dans la réserve, rang retiré et trace gardée, aucun soin, `P.s` identique à la mémoire efficace rejouée, jamais reproposé (300 tirages) ni gravable, arbre « brûlé » et légende, majeur lié éteint ; deuxième brûlure du même acte refusée, braise rendue à l'acte suivant, refus hors combat, désignation tombée à l'oubli, trophée ni brûlé ni désigné, ligne de chronique.

### Action 3 : l'embrasement (28 octobre 2026)

`burn()` calcule deux jeux de valeurs à la force de la brûlure, `v` (contre un ennemi ordinaire) et `vf` (contre un gardien ou un Masqué : `fortE`, c'est-à-dire `type:'boss'` ou `e.asm`), puis lance `embraser(rec)` **après** le recalcul. Ce qui dure vit dans `DSX` et avance image par image dans `updatePlayer` (l'étourdissement ne l'arrête pas, la pause oui) ; un changement de salle l'éteint (`DSR`).

| Famille | Ce que fait le jeu | Contre un fort |
|---|---|---|
| Projectile | 12 traits partent en gerbe et fondent chacun sur une cible (réparties de la plus proche à la plus loin ; une cible morte : le plus proche) ; virage de plus en plus serré, droit au but sous 150 px (sans quoi ils orbitaient). | Dégâts sous le plafond. |
| Faisceau | Un rayon de 420 px fait un tour complet autour de toi en 0,8 s, en partant de ta visée ; chaque ennemi touché une fois. | Idem. |
| Lame | Coup de 140 px autour de toi ; achève les ennemis ordinaires (pas les champions) sous 20 % de PV. | Pas d'achèvement ni de recul. |
| Ruée | 3 s : charges d'esquive toujours pleines ; chaque esquive blesse une fois chaque ennemi qu'elle traverse. | Dégâts sous le plafond. |
| Onde | Une onde part de toi jusqu'au coin le plus loin de la salle (0,7 s) ; chacun est touché quand le front passe, et repoussé. | Pas de recul. |
| Sol | Le sol brûle 3 s sous chaque ennemi (taches fixes, r = e.r + 26, au moins 42) : 20 par seconde, ralenti de 40 %. | Pas de ralenti. |
| Fil | Chaque ennemi ordinaire est immobile 2,5 s (étourdi, × 0,6 pour un champion), relié à toi par un fil. | 40 dégâts. |
| Cloche | Toute la salle : 30 dégâts, ennemis ordinaires étourdis 1,2 s (× 0,6 pour un champion). | Pas d'étourdi. |
| Dévoration | Dans 260 px : les ennemis ordinaires (pas les champions) sous 25 % de PV sont avalés (+4 PV chacun), les autres attirés vers toi. | 45 dégâts, pas d'attraction. |
| Lumière | Tous exposés 4 s (+25 % de dégâts subis) ; les tirs des ennemis ordinaires en vol sont dissipés (ceux des gardiens, des Masqués, du Reflet et des armes de la Brume restent). | Exposition gardée, son surplus sous le plafond. |
| Ombre | 3 s invisible (les ennemis perdent ta trace ; frapper ne la rompt pas), tous tes coups sont critiques avec +0,3 de dégâts critiques. | Surplus sous le plafond. |
| Soin | Soin de 25 % des PV max, comptés après la brûlure (au plus 40 %). | — |
| Garde | Bouclier de 30 % des PV max (au plus 40 %), qui tient 5 s puis s'use à 25 PV/s (le Héraut et le Tisse-Destin n'avaient aucune usure de bouclier : elle est faite par l'effet). | — |
| Fureur | 5 s : +40 % de dégâts, +30 % de vitesse d'attaque (`atkCooldown`). | Surplus sous le plafond. |

Règles communes :
- **Dégâts de base**, comme ceux des éveils : tes bonus de dégâts s'y appliquent, jamais de critique (`crit:false`).
- **Invulnérabilité** de 0,5 s à l'embrasement, contre tout : `P.iT` et `P.hitIT = 0` (sinon la règle v17.5 laissait passer les autres ennemis).
- **Plafond** : chaque fiche de brûlure tient, par ennemi fort, ce qu'elle peut encore lui faire perdre (`dsPlafond`, dans une `WeakMap`). Il est appliqué **au plus près du coup**, par un crochet générique ajouté au cœur de `hitEnemy` : `o.plaf(e, dmg)`, juste après le seuil de phase, donc après tous les multiplicateurs (verrou de phase, « à nu » du Glas, Robuste et Blindé, Accoutumance). Les coups de la brûlure passent par `dsHit`. Ses surplus sur tes propres coups (Fureur, exposition, Ombre) passent par l'enveloppe extérieure de `hitEnemy` : la part qui vient de la brûlure (pour l'Ombre : critique forcé et bonus, contre ce que tu aurais fait en moyenne sans elle) est retirée au-delà du plafond.
- **Accoutumance** : un coup marqué `o.ds` laisse `RUN.mem` (tot, sig, resisted) tel qu'il l'a trouvé.
- **Couleurs** : celles du joueur (or, braise, blanc, et la teinte de la famille), jamais de rouge. Mouvements réduits : pas de scintillement ni de particules, les zones gardent leur dessin fixe.
- **Fiche** (`M.brules`, pour les statistiques de l'action 6) : `degats`, `surFort`, `boost`, `plafonne`, `touches`, `acheves`, `avales`, `soin`, `bouclier`, `dissipes`.

Ce que je n'ai pas bouché, faute de raison forte :
- Destin Lié (Tisse-Destin) répercute 40 % d'un coup sur les autres ennemis attachés par `rawHit`, hors du plafond : une brûlure sur un ennemi ordinaire attaché peut donc toucher un gardien attaché de 40 % de ce coup. C'est la mécanique du joueur, pas l'effet ; à surveiller.
- Les coups de la brûlure comptent dans la mesure de portée du profil (contre-mesures, `hitN`/`hitD`) : le cadrage ne demandait que l'Accoutumance. Une brûlure par acte.
- Une brûlure pendant le montage d'un Masqué (3,85 s, intouchable) ne lui fait rien : c'est l'immunité existante.

Mesures de l'action 3 :
- `sim-dernier.mjs` : **4 013 vérifications, 0 échec** (en plus : un effet par famille dans `embraser`, le crochet `o.plaf`, l'Accoutumance épargnée, l'invulnérabilité contre tout, l'effet après le recalcul ; contre-épreuve : une famille retirée d'`embraser` est attrapée). `sim-brume.mjs --vite` : 46 602, 0 échec. `sim-masque.mjs` : 3 583 218 contrôles, tout est bon. `wiki.mjs --check` : à jour. Banc des actions 1 et 2 : 117, 0 échec.
- Chromium sans affichage, **520 vérifications, 0 échec, aucune erreur de script** :
  - **vagues** (quatre formes, chaque famille de la forme, six ennemis dont un affaibli et un champion affaibli) : invulnérabilité (un coup reçu juste après est paré), Accoutumance intacte, aucun effet qui dure après 5 s ; traits (10 à 12 touchent sur 12), rayon (tous ceux à portée), achèvement (l'affaibli oui, le champion non), esquive (charges pleines, ennemi traversé touché), recul de l'onde (172 px/s au départ), ralenti 0,4, immobiles 2,5 s (champion 1,5), étourdis 1,2 s, avalés (champion épargné) et attirés, exposés (+25 % exactement), tir ordinaire dissipé et tir de gardien gardé, critique forcé (× 2,1), invisible de 0 à 3 s, soin (25 % × force), bouclier (30 % × force, tient 5 s puis s'use), Fureur (× 1 + 0,4 × force sur les dégâts, cadence plus courte) ;
  - **Masqué** (quatre formes, chaque famille au plus fort talent de la forme, gravé deux fois : force 2,25 à 3) : PV perdus ≤ plafond partout (93 PV à l'acte II pour 1 157 PV, force 3), ni étourdi, ni repoussé, ni attiré, ni ralenti, ni achevé, ni avalé ; surplus de Fureur, d'exposition et d'Ombre sur 60 coups ≤ plafond ;
  - **gardiens** (Mère-Brume au Gouffre, Héraut Noyé au Héraut, Glas temps 2 au Lumenarque et temps 3 au Tisse-Destin, force 3) : PV perdus ≤ plafond (212, 460, 720), aucun étourdi ; Fureur et Ombre plafonnées pile au plafond sur 60 coups ; verrou de phase tenu (une Dernière taille juste au-dessus du seuil s'y arrête) ; le Reflet n'est jamais dans `enemies` ;
  - **salle** : un changement de salle éteint la Fureur en cours et rend la cadence normale.
- Captures prises à mi-effet (traits, rayon, sol, fils, cloche, exposition, aura de Fureur, rempart) : chaque effet se lit, aucun rouge ajouté.

### Action 4 : la touche X (29 octobre 2026, toujours pas active)

Tout est dans le bloc « v17.23 (palier 5, action 4) » d'index.html, avant « Accès à l'arbre (D4) ». `dernier.actif` reste faux : rien ne se voit, l'essai se fait par `__dernier.activer()`.
- **Geste** : X maintenue 0,35 s (`dsMaintien`, `DS.maintienS`) en combat (`dsEnCombat`) avec un souvenir désigné et la braise de l'acte. État `DSH` ; le temps avance dans `updatePlayer` (la pause l'arrête). Lâcher, la pause ou tout écran qui s'ouvre (`openOverlay`), `blur`, la fin du combat, l'étourdissement ou la mort l'annulent ; une fois brûlé, il faut relâcher pour recommencer. Refus : d'abord un message court, remplacé à l'action 7 par une image (voir plus bas).
- **HUD** : `#hBraise` sous la mémoire (icône `u_braise` + touche X) : éteinte si la braise est consumée, allumée si un souvenir est désigné, jauge conique autour de l'icône et halo qui grandit sur la tuile désignée pendant le maintien (`--h`). Au-dessus du héros (`drawPproj`) : un anneau qui se ferme et une petite flamme. La ligne d'aide du bas ajoute « X maintenir : brûler » une fois un souvenir désigné ; l'écran titre et le guide (page Commandes) listent X quand `dernier.actif` est vrai (`window.__dsAide`).
- **Embrasement** (`dsTuileFx`, avant le retrait de la tuile) : elle s'éclaire en orange, monte et se défait en braises (11 points) ; en « mouvements réduits », un simple fondu sans braises. Son : `sfx('brule')` → `__brumeBrule` (le chuchotement de l'oubli, brisé en trois éclats, avec des craquements de braise ; toujours sans grondement ni chœur).
- Banc Chromium (`banc-touche.mjs`, 33 vérifications, 0 échec, aucune erreur de script) : inactif (X ne fait rien, aucun HUD) ; sans désignation ; maintien en cours et jauge ; lâcher qui annule ; maintien complet (brûlé, braise consumée, tuile qui s'embrase puis disparaît) ; seconde brûlure refusée ; pause en plein maintien ; salle purifiée ; mouvements réduits. Simulateurs et bancs des actions 1 à 3 inchangés (4 013, 46 602, 3 583 218, 117, 520).

### Actions 5 et 6 : mode d'essai, chronique, statistiques, fin de run (29 octobre 2026, toujours pas actif)

- **Mode d'essai** (action 5) : `index.html?dernier=<id de talent>[&acte=1|2|3][&gardien=1][&masque=1][&classe=lum|gou|her|tis][&rang=n][&grave=n][&dieu=0]`. Il lance une descente (la classe du talent, ou `classe=` si elle va avec), te donne le talent (rang, gravures), ouvre une salle d'essai (une vague ; `gardien=1` : la salle du gardien de l'acte ; `masque=1` : un Masqué via `__asm.essai`), désigne le talent, active le Dernier Souvenir (`DSDEV`) et te garde à 1 PV minimum (`dieu=0` pour l'enlever ; crochet sur `loseHp`). Il reste à maintenir X une fois la salle ouverte (~2 s d'annonce). Un talent qu'on ne peut pas brûler (racine, compétence clé, trophée) est donné mais pas désigné : le message le dit. Console : `__dernier.essai(id, {acte, gardien, masque, classe, rang, grave, dieu})`, `__dernier.essaiEtat()`.
- **Chronique** (action 6) : la note « tu as brûlé … » existait ; elle a maintenant un poids de 3 (`CW.brule`), comme les événements rares, pour qu'elle passe dans le récit de l'Archiviste.
- **Statistiques** : `SAVE.stats17` gagne `brules` (forme définitive à l'action 7, voir plus bas). `M.fin.brules` (nombre) aussi.
- **Fin de run** (onglet Build) : sous les souvenirs portés, les souvenirs brûlés, en tuiles pointillées, désaturées, avec la petite flamme (`tile(…, {bru:true})`) et l'infobulle « Brûlé · nom · acte ».
- Banc Chromium (`banc-essai.mjs`, 42 vérifications, 0 échec, aucune erreur de script) : vague, gardien (actes 1 et 3), Masqué ; X brûle dans chacun ; Tisse-Destin avec rang et gravure ; racine refusée, id inconnu, mauvaise classe ; chronique, `stats17`, `M.fin`, tuile brûlée à la fin de run.

### Action 7 : banc complet, écarts, mesures (29 octobre 2026, toujours pas actif)

**Écarts avec le cadrage trouvés et corrigés** (les actions 4 et 6 avaient pris des raccourcis) :
- DS2, DS13 : un refus ne s'écrit plus. Sans désignation, braise consumée ou hors combat, la braise du HUD **palpite** une fois (`dsPalpite`, `dsRefusFx`) ; X ne fait rien d'autre. `dsPourquoi` rend un code (`designe`, `braise`, `combat`, ou le code de `dsRefus`).
- DS17 : un souvenir désigné dont l'effet tourne encore porte un **sablier** (`u_hourglass`, `.mt.ds.attend .dsh`, suivi toutes les 0,2 s par `dsVeille`) ; au refus, la tuile palpite.
- DS13 : la braise palpite à l'entrée de chaque acte (une braise neuve) ; un redessin du HUD ne coupe pas la palpitation. L'**icône de la famille** brûlée monte au-dessus du héros pendant 0,8 s (`DSI`, `drawIcon`), liseré d'or, lavande si le souvenir était éveillé. Les **braises de la tuile volent vers le héros** (position écran du héros, comme `oubliCible`) : l'inverse de la volute de l'oubli.
- DS14 : `stats17.brules` est la **liste** des brûlures `{id, famille, genre, rang, g, force, acte, salle, contre, degats, surFort, plafonne}` (l'ancien `bruleDet` disparaît) ; `stats17.reserveGlas` = taille de la réserve à l'entrée de la salle du Glas (`M.reserveGlas`, mesurée même quand le Dernier Souvenir est éteint, pour comparer avant / après). En fin de run, les brûlés ont **leur propre ligne** (`.endbru`).
- DS17 : mode `?demo=` : jamais de brûlure (`DSDEMO` dans `dsActif`), aucune braise affichée.
- Le banc d'avant mesurait mal l'étourdi des gardiens : il lisait `e.stun` 5 s après, et les autres talents du Héraut (cloches, Volée sourde) étourdissent un gardien. Un espion sur `e.stun` ne retient plus que ce que pose la brûlure (pile d'appels dans `embraser`, `dsTick` ou `dsHit`) : **0 partout** ; l'étourdi « autre » vu (1,1 s) vient du jeu ordinaire.

**Bancs** (Chromium sans affichage ; copies dans `_dev/bancs/`, serveur local sur `themist/`, `node <banc> 8765`) :
- `banc-dernier.mjs` (actions 1-2) : 117 vérifications, 0 échec.
- `banc-effets.mjs` (action 3, étendu) : **740, 0 échec** : les 14 familles × les formes contre une vague ; le Masqué **porteur et ordinaire** (quatre formes chacun, force max de chaque famille) ; Mère-Brume, Héraut Noyé, Glas temps 2 et 3, verrou de phase, Reflet intact ; changement de salle.
- `banc-touche.mjs` (action 4) : 34, 0 échec. `banc-essai.mjs` (actions 5-6) : 43, 0 échec.
- `banc-complet.mjs` (action 7) : A. les **14 effets en cours lancés pour de bon** (F ou E) : sablier, refus, palpitation, fin de l'effet, brûlure, icône, touche vidée et qui ne relance rien ; B. Nova brûlée : touche A vidée, ses majeurs liés (`ray_x2a`, `ray_x2b`) éteints ; C. démo ; D. oubli par Tab, mémoire pleine, la désignation tombe ; E. reprise au Masqué porteur ; F. **descente des quatre formes** jusqu'à la victoire (trois actes, braise rendue et palpitante à chaque acte, une brûlure par acte, `reserveGlas` mesurée, statistiques et ligne des brûlés en fin de run). **228 vérifications, 0 échec, aucune erreur de script.** Deux faux échecs du banc lui-même, corrigés : la touche « E » confondue avec « Espace », et l'écran d'oubli qui s'arme 0,4 s après son ouverture.
- `mesure-vagues.mjs` : les mesures ci-dessous.

**Mesures** :
- Durée des effets qui bloquent la brûlure (de l'appui à la fin, en jeu) : Zénith 4,5 s, Nuit Éternelle 5, Phare Tournant 6,4, Absolution 0,3, Métamorphose 7,6, Gueule du Monde 2,2, Carapace 2,2, Glas Funèbre 3,7, Requiem 7,4, Bal des Morts 3,9, Point d'orgue 0,7, Grande Toile 5,2, Grand Guignol 4, Temps Suspendu 1,5 (mesures en temps réel, à ± 0,2 s).
- **Une vague ordinaire de l'acte II** (6 ennemis, 37 à 44 PV chacun, 285 PV en tout ; la brûlure seule, 5 s ; base sans brûlure ≈ 8 à 11 % par la lanterne et le contact) :

| Famille | Force 1 à 1,5 | Force max (2 à 3) |
|---|---|---|
| Onde | 92 à 100 % (5-6 morts) | 100 % |
| Faisceau | 97 à 100 % | 100 % |
| Projectile | 70 à 89 % | 95 à 100 % |
| Sol | 65 à 85 %, 9-10 s de ralenti cumulé | 100 % |
| Cloche | 73 %, 7 s d'étourdi cumulé | 100 % |
| Lame | 34-37 % (2 morts : les achevés) | 34-37 % |
| Fil | 3 %, 15 s d'immobilité cumulée (6 × 2,5) | idem |
| Dévoration, Ruée, Lumière, Ombre, Fureur | ≈ la base (leur effet passe par tes coups, ton esquive, tes PV) | idem |
| Garde | bouclier 30 % des PV max | 40 % (plafond) |

  Lecture : à l'acte II, **Onde et Faisceau vident une vague dès la force 1** (50 et 60 dégâts contre des ennemis de 37 à 44 PV ; à l'acte III, 51 à 61 PV, l'Onde de force 1 ne tue plus). Le cadrage craignait Lumière, Fil et Cloche ; ce sont plutôt les dégâts de zone qui écrasent les vagues. Ce n'est pas corrigé : une brûlure par acte, et DS12 dit de juger sur les descentes réelles (familles choisies). Si besoin : des dégâts proportionnels à l'acte, ou plus bas pour Onde et Faisceau. **Tranché à l'action 10 (v17.24)** : 26 dégâts pour les deux, voir plus bas.
- `reserveGlas` : le banc prend ses talents par la console (sans oubli), sa réserve est vide (0) ; la vraie mesure viendra des descentes exportées (avec et sans brûlure).
- Gardiens et Masqués : plafond tenu partout (93 PV au Masqué de l'acte II, 212 / 460 / 720 aux gardiens à force 3) ; aucun contrôle posé par la brûlure.

### Action 8 : relecture par deux agents séparés (29 octobre 2026)

Deux relecteurs qui n'avaient pas vu le travail : l'un pour le Dernier Souvenir, l'autre pour le Glas (v17.22, relecture oubliée à l'époque). Lecture seule ; les correctifs ci-dessous sont les miens. Aucun bloquant.

**Dernier Souvenir, corrigé :**
- **Fureur contre un fort** : la cadence (+60 % à force 3) donnait des coups en plus hors plafond (≈ trois fois le plafond en 5 s au Masqué de l'acte I). Contre un fort, la part des coups due à la cadence (vitesse / (1 + vitesse)) se paie maintenant sur le plafond, comme le surplus de dégâts (parts de `o2.plaf`). Mesuré : 150 coups « de référence » contre 240 sous Fureur, surplus total = plafond pile.
- **Rempart** : `dsFin` vidait l'entrée `garde` au changement de salle, et le bouclier des trois formes autres que le Gouffre ne s'usait plus jamais. `dsFin()` garde le rempart (il continue de s'user) ; `dsFin(true)` éteint tout (nouvelle descente, mort, hub).
- **Fureur jusqu'au hub** : à la mort ou au hub, tout s'éteint (`dsFin(true)` dans `updatePlayer`) ; une nouvelle descente remet à zéro `DSH` (palpitation de l'acte I), `DSI` et `DSX`.
- **Critiques forcés de l'Ombre** : l'estimation du surplus suit le cœur (Enfant de la Nuit dans l'Obscur : ×(critMult + 1,2) ; Œil de la Bête dans la chance) ; un critique forcé n'étourdit plus un fort (`o.dsCrit`, éveil `abe_s5`).
- **Carillon brûlé** : ses cloches (12 s, 600 s éveillé, sans fin avec `car2A`) restaient. Elles n'existent que par lui : elles s'éteignent avec lui (D4). La Toile, elle, a des toiles venues d'autres sources (sous-classe, Piège, Point) : les siennes finissent leurs 6 s.
- **Console et essai** : `__dernier.prendre` refuse un talent brûlé ; le mode d'essai (« dieu ») ne vaut que pour la descente qu'il a lancée ; la touche est lue dans `DS.touche` ; `DSH.fait` (jamais lu) retiré.

**Dernier Souvenir, laissé tel quel (à trancher par l'auteur ; Ombre et Élan tranchés à l'action 10, v17.24) :**
- **L'Ombre contre un Masqué** : invisible, il perd ta trace 3 s (il vise ta lanterne ou erre). C'est un contrôle sur un fort ; le cadrage (DS6) ne le range pas parmi les contrôles retirés et dit seulement « leurs zones déjà posées te touchent toujours ». Les gardiens, eux, visent toujours `P.x`.
- **Élan contre un fort** : les charges pleines nourrissent aussi tes esquives qui blessent (Gouffre, Pas d'ombre, Macabre) sans plafond. DS8 compte la Ruée parmi les effets de survie voulus contre un gardien.
- Hors plafond, déjà connus : Destin Lié (`rawHit`), les explosions à la mort des ennemis achevés ou avalés, le vol de vie. Une brûlure de dégâts pendant la Furie d'un gardien (immunité) est perdue, comme pendant le montage du Masqué.

**Glas (v17.22), corrigé :**
- **Temps Suspendu** : le crochet du Glas enveloppait celui qui fige les ennemis ; le Reflet continuait de bouger et de lâcher ses zones pendant l'arrêt, et ses minuteurs avançaient. `glasTick` ne tourne plus pendant `P.stopT`.
- **Fenêtre « à nu »** : le minuteur était tenu sous le seuil après l'image, si bien que le signal (anneau, son) partait à l'image suivante pendant un geste. Il est tenu avant et après, à `seuil − dt`.
- **Marge implicite** : un Battement inverse lancé juste avant le passage au temps 3 n'était évité que parce que `naissanceS` (0,6 s) couvrait l'écart des anneaux. Les anneaux prévus mais pas encore poussés (`later`) sont comptés (`room.prevus`, Battement inverse et anneau double) et le Reflet les attend (`glasOccupe`).
- **Mode d'essai** : `EG.essai` restait actif dans l'onglet, si bien que tout gardien des descentes suivantes avait ses PV bloqués. Il ne vaut plus que pour la descente qu'il a lancée (`essaiG`).

**Glas, remarques sans changement :** `cutThreads` (Tisse-Destin) peut tracer son anneau pendant la bulle (assumé au § 26) ; `ZR` avance pendant le Temps Suspendu, comme pour le Masqué depuis toujours.

**Vérifications** : `banc-relecture.mjs` (Fureur au plafond en temps de combat, rempart après changement de salle, Carillon, hub, console) : 12, 0 échec. `banc-glas-relecture.mjs` (40 s de combat au temps 2 et 3, trois formes, Temps Suspendu en plein geste, aucune zone du Glas pendant une zone du Reflet, aucun signal « à nu » pendant une bulle, essai oublié à la descente suivante) : 16, 0 échec. Le contrôle « à nu » est faible : l'essai n'a pas forcément d'Accoutumance. Simulateurs inchangés.

### Action 10 : équilibrage, les trois points ouverts (v17.24, 29 octobre 2026)

L'auteur a demandé de trancher, mesures à l'appui, les trois points laissés par l'action 8. Recommandations appliquées.

**1. Onde et Faisceau vident une vague.** Mesure élargie (`mesure-vagues.mjs` prend maintenant l'acte, les familles et des valeurs d'essai posées dans la page ; il mesure aussi la force max quand une forme n'a qu'un talent dans la famille, ce que l'ancien banc refusait : talent déjà brûlé). Vague de 6 ennemis, brûlure seule, 5 s ; base sans brûlure ≈ 3 à 14 %.

| Acte (PV de la vague) | Onde / Faisceau avant (50 / 60) | Onde / Faisceau après (26) | Repères inchangés : Salve · Glas |
|---|---|---|---|
| I (180, ennemis de 23 à 49 PV) | force 1 : 100 %, force 1,5 : 100 % | force 1 : 88-90 %, 1,5 : 97-99 % | force 1 : 89-90 % · 91-92 % |
| II (285, 37 à 78) | force 1 : 92-96 % (5 morts), 1,5 : 100 % | force 1 : 70-73 % (2 morts), 1,5 : 83-89 % | force 1 : 64-72 % · 68-73 % ; force 1,5 : 86-89 % |
| III (390, 51 à 106) | force 1 : 86-90 %, 1,5 : 94-98 % | force 1 : 52-53 %, 1,5 : 70-74 % | force 1 : 49-56 % · 51-54 % ; force 1,5 : 74 % |
| Force max (2,25 à 3) | 100 % partout | 89 à 100 % | 87 à 100 % |

Lecture : l'écart n'était **pas** propre à l'acte II (il restait entier à l'acte III, les PV montent comme les dégâts de base) ; c'était la valeur. Essais à 26, 30 et 34 : 26 met les deux familles exactement au niveau de la Salve et du Glas, à chaque acte et à chaque force (34 laissait 79 % et 94 % à l'acte II). **Retenu : `degats` 26 pour l'Onde et le Faisceau** (`souvenirs.js`) ; portée, rayon et plafond par acte inchangés (inutiles une fois la valeur alignée). L'acte I reste vidé par toutes les familles de dégâts de zone, Salve et Glas compris : une braise par acte, c'est le grand moment voulu. Contre un fort, l'effet était déjà borné : à force 3, 78 dégâts de base au lieu de 150, sous le plafond du Masqué de l'acte II (93) et très loin de celui des gardiens (212 à 720) ; au Masqué de l'acte I (plafond 29 à 59), rien ne change.

**2. L'Ombre contre un Masqué.** `mesure-forts.mjs` A (Dernière ombre force 3, lanterne immobile qui « attaque » pour que l'invisibilité de son kit n'entre pas en jeu, 12 fenêtres de 3 s, Masqué entre 50 et 60 % de PV) :
- avant : **0 sort lancé en 3 s** (1,25 à 1,67 sans brûlure à l'acte II, 2,2 à l'acte III), dégâts reçus divisés par deux (58 contre 123). L'invisibilité fait passer `tg.pl` à faux, et `autre:!tg.pl` suspend toute la file du Masqué : c'est un silence complet, donc un contrôle sur un fort.
- après : 2 sorts en 3 s à l'acte II (1,25 sans), 2,3 à l'acte III (2,2 sans) ; dégâts reçus 98 contre 115 (l'écart restant : l'invulnérabilité de 0,5 s).

Choix : **exclure plutôt que raccourcir**. Toute durée d'invisibilité arrête la file du Masqué (raccourcir à 1 s, c'est encore 1 s de silence garanti), les gardiens visent toujours `P.x`, et DS6 veut qu'un fort ne subisse aucun contrôle. Le Masqué garde ta trace pendant l'invisibilité **due à la brûlure** (`P.dsOmbre`, posé quand tu n'étais pas déjà invisible ; `enemyTarget` enveloppé pour `e.asm`). L'invisibilité de ton kit (Nuit Éternelle, Pas fantôme, Silhouette) le trompe toujours ; les ennemis ordinaires (escorte comprise) perdent toujours ta trace ; les critiques forcés restent, sous le plafond.

**3. Dernier élan contre un fort.** `mesure-forts.mjs` B (Gouffre, Charge brutale rang 3, aller-retour à travers le Masqué en esquive pendant 3 s) :

| | Plafond | Sans brûlure | Avec, avant | Avec, après |
|---|---|---|---|---|
| Acte II, force 1 | 48 | 57 PV (3 esquives) | 345 (17 esquives) : **+288** | 103 : **+45** |
| Acte II, force 2,25 | 97 | 55 | 387 : **+332** | 153 : **+100** |
| Acte III, force 1 | 65 | 58 | — | 122 : **+64** |
| Acte III, force 2,25 | 131 | 53 | — | 188 : **+135** |

Avant, les coups de kit des esquives en plus dépassaient le plafond jusqu'à 6 fois. Choix : **plafonner, mais seulement les esquives offertes**. Une recharge ordinaire est suivie à côté (`X.nat`, `X.natT`, depuis tes charges au moment de la brûlure) ; une esquive prise sur une charge que tu n'aurais pas eue sans l'élan est marquée (`tryDash` enveloppé → `P.dsElan`), et ses coups de kit (`o.dash`, posé sur les trois coups d'esquive : Gouffre, Pas d'Ombre, Danse Macabre) sur un gardien ou un Masqué passent par `o.plaf`, sur le même budget que la brûlure (`reste`, `charge`, comptés dans `rec.boost`). Tes esquives ordinaires blessent comme avant ; contre un ennemi ordinaire, rien ne change. Le surplus mesuré tombe sur le plafond (l'écart de 3 ou 4 PV vient du bruit de la référence sans brûlure). DS8 (l'élan comme effet de survie contre un gardien) est intact : les charges restent pleines.

**Vérifications** : `sim-dernier.mjs` **4 021, 0 échec** (section 10 : Onde, Faisceau et Glas ≤ 30 à force 1 ; enveloppe d'`enemyTarget` et `P.dsOmbre` ; `dash:1` sur les trois coups ; crochet de l'élan ; `tryDash` qui distingue `X.nat` ; contre-épreuve : l'Onde remise à 50 est attrapée). `sim-brume.mjs --vite` : 46 602, 0 échec. `banc-effets.mjs` : 740, 0 échec. `banc-complet.mjs` : 228, 0 échec (un premier passage lancé en même temps que `banc-effets` a raté une fois le sablier de Nuit Éternelle, attente en temps réel de 450 ms sous charge ; seul, trois fois sur trois puis le banc entier : 0 échec). `banc-relecture.mjs` : 12, 0 échec. Aucune erreur de script. `wiki.mjs --check` : à jour (la puce « contre un gardien ou un Masqué » du gabarit dit les deux nouvelles règles).

### Ce qui reste (DS19)

Action 9 faite (v17.23) : section générée du wiki, journal, `actif:true`. Action 10 faite (v17.24) : les trois points ouverts de l'action 8. Restent à juger sur les descentes exportées : `reserveGlas` avec et sans brûlure, les familles réellement brûlées (`stats17.brules`).

## 28. La némésis, actions 1 et 2 : promotion et sauvegarde (30 octobre 2026, pas encore active)

Cadrage : document `claude/la-brume-v17-25-nemesis-cadrage.md` du projet claude.ai (décisions N1 à N19 ; révision du 30 octobre : le trousseau de crânes, N10). L'auteur a demandé les actions 1 et 2 du découpage (N19) ; les recommandations du cadrage sont appliquées telles quelles. **Le jeu ne montre rien** : `assemble.nemesis.actif` est faux, aucune fiche n'est écrite hors essai de console (`__nemesis.activer()`, jamais gardé au rechargement). Pas de numéro de version ni de ligne de journal : rien ne change pour le joueur ; le wiki est inchangé (`wiki.mjs --check` à jour).

### Ce qui est construit

| Où | Quoi |
|---|---|
| `data/bestiaire.js`, `assemble.nemesis` | `actif`, `parActe` 1 (N6), `souvenir` (racine exclue, attaque de préférence, N3), `points` (max 5, PV +8 %, force +0,15 par point, renforts Robuste au point 2 et Brutal au point 4, N4), `repit` (3 morts de suite, N7), `retour` (100 %, N5), `reprise` (gravures gardées par le masque, relique en plus, Éclats 15 + 10 par point, N8). |
| `data/masque.js`, `crane` | Réglages du trousseau (N10a) : 5 crânes au plus, taille 0,35 rayon (9 à 14 px), hanche, éventail, chaîne, balancement, lueur lavande. Le dessin du crâne viendra à l'action 5a. Le masque garde ses 6 points de couture. |
| `index.html`, bloc `/*nem:pur*/` (dans le bloc du Masqué, après `/*glas:pur*/`) | `nemRefus` (N2), `nemDecision` (N6), `nemForce` (DS7), `nemArrache` (N3), `nemCombo` (son assemblage avec l'arme : même corps, budget de l'acte, le plus de capacités gardées), `nemPromotion` (la fiche, N1), `nemPoint` (N4, N7), `nemStats` (N4), `nemSalle` (N5), `nemFin` (N7), `nemReprise` (N8), `nemLire` / `nemEcrire` / `nemForme` (sauvegarde versionnée), `nemValide` (relecture contre les données du moment). |
| `index.html`, section « v17.25 · La némésis » (fin du bloc du Masqué) | Promotion dans une enveloppe d'`openEnd` (`nemFinRun`, une fois par descente, avant la Tombe d'Écho et les statistiques) ; `SAVE.nemesis` ; attribution du coup (`NC`, pour les statistiques) ; console `__nemesis`. |
| Branchements ailleurs | `RUN.essai` posé par `__asm.essai` (donc `?masque=` et `__dernier.essai(…,{masque})`), le Glas d'essai (`EG.lancer`) et `__dernier.essai` ; la navette et le perçant des armes de la Brume posent `NEMSRC` le temps de leur coup. |
| `outils/sim-nemesis.mjs` | Vérification hors navigateur (voir Mesures). |
| `_dev/bancs/banc-nemesis.mjs` | Banc Chromium de la promotion. |

### Les règles telles que codées

- **Promu** (N2, N17) : mort réelle (`openEnd(false)` avec `P.dead` : Phénix, Seconde flamme, Rançon et Larme n'y arrivent pas), ni victoire ni abandon, ni démo, ni descente d'essai (`RUN.essai`, ou une adresse `?masque=`, `?brume=`, `?glas=`, `?dernier=`, `?nemesis=`), ni Masqué d'essai (`room.asm.test`), ni Reflet ; le Masqué de la salle est **arrivé** (`room.asm.e`, montage compris) et n'est pas brisé. Le cadrage disait « monté » en N2 et « mort pendant son montage : promu » en N17 ; c'est N17 qui est appliqué (il est là, son masque à moitié cousu).
- **Une par acte** (N6) : la némésis de l'acte qui t'a eu (`room.asm.nem`, posé par l'action 3) gagne un point ; un autre Masqué dans un acte occupé n'est pas promu.
- **Le souvenir** (N3) : un porteur garde le sien (id, rang, gravures, variantes ou renfort) et son assemblage. Un Masqué ordinaire t'arrache ton talent le plus fort au sens de DS7 (égalité : le plus récent), jamais une racine de voie ; d'abord une attaque que son corps peut porter, et son assemblage est refait avec l'arme (`nemCombo`), sinon un renfort, sinon le plus fort sans geste (`sansGeste` : il le garde pour la reprise, ses capacités ne bougent pas). Le nom composé suit (« Brute hurlante et tranchante » → « Brute tranchante et radieuse »).
- **La fiche** : `{uid, corps, co, nom, sv, points, morts, ne, attend, vu, repit, coup}` dans `SAVE.nemesis = {v:1, liste}`. Une sauvegarde d'une version future n'est ni lue ni écrasée (`nemLire` → null) ; une fiche abîmée est ignorée.
- **Le coup mortel** (`coup`) : la source du coup, sinon un projectile du Masqué ou une de ses ondes qui te touche à cet instant ; il n'entre pas dans la décision. Le jeu ne passe toujours pas de source sur les projectiles : en passer une déclencherait les épines du Gouffre sur un tir.

### Ce que les actions suivantes trouveront

- Action 3 : `nemSalle` (première salle de combat, d'élite ou Brèche ≥ `attend.salle` dans son acte, jamais le gardien, pas en répit, une fois par descente), `nemValide` à la lecture, `nemStats` (PV, force à passer à `sbForce`, renforts), et poser `room.asm.nem = uid` pour que sa victoire suivante soit un point.
- Action 4 : `nemReprise` (talent sans gravures, trophée si libre ; rang ou gravure si tu le portes ; Éclats pour une autre forme, un talent brûlé ou disparu), puis effacer la fiche ; `nemFin` en fin de descente (répit, compte des morts).

### Mesures

- `sim-nemesis.mjs` : **46 050 vérifications, 0 échec**. Données ; les 2 048 combinaisons de conditions de promotion (une seule promeut) ; une par acte ; souvenir arraché sur 3 982 morts tirées au hasard (3 889 attaques, 51 renforts, 42 sans geste ; jamais une racine, toujours le plus fort, égalité au plus récent) ; assemblage avec l'arme sur 495 cas (3 actes × 33 assemblages × 15 familles ; 423 portés, chacun permis sous le budget, même corps, le plus de capacités gardées) ; 600 promotions ; points, répit et plafond ; force au pire 3,60 sous `sbForce` (plafond 3,6) pour chaque famille, variante, rang, gravure, point et acte, PV × 1,40 au plus ; salle du retour ; matrice de reprise ; sauvegarde (aller-retour, abîmée, version future) ; relecture (33 assemblages gardés, capacité retirée réassemblée, corps inconnu abandonné, talent disparu) ; branchements du jeu.
- `sim-masque.mjs` : 3 583 218 contrôles, tout est bon. `sim-brume.mjs --vite` : 46 602, 0 échec. `sim-dernier.mjs` : 4 021, 0 échec. `wiki.mjs --check` : à jour.
- `banc-nemesis.mjs` (Chromium, descentes ordinaires, une page neuve par cas) : **35 vérifications, 0 échec, aucune erreur de script**. Masqué ordinaire tué par son tir : promu, nœud clé gravé arraché et porté en arme, rendez-vous à la salle de la mort, coup mortel attribué ; porteur : il garde son souvenir et son assemblage ; deuxième mort face à la même némésis : point 2 ; autre Masqué dans un acte occupé : rien ; un autre acte a la sienne ; Masqué brisé, salle sans Masqué : rien ; mort pendant son montage : promu ; tué par son escorte : promu, coup pas de lui ; inactif : rien écrit ; descente d'essai et `?masque=` : refus ; Mèche de Phénix : pas de mort, rien ; démo : jamais actif ; relecture de la fiche écrite inchangée ; version future intacte.
- Régressions : `banc-essai` 43, `banc-relecture` 12, `banc-glas-relecture` 16, `banc-touche` 34, `banc-complet` F (descente des quatre formes jusqu'à la victoire) 60 : 0 échec. `banc-dernier` : 4 échecs, **les mêmes sur v17.24 sans ce travail** (ce banc des actions 1-2 du Dernier Souvenir attend encore `dernier.actif` faux, vrai depuis v17.23).

### Action 3 : le retour en salle (30 octobre 2026, toujours pas active)

- **Où** (N5) : dans le tirage du Masqué (`planRoom`), avant tout tirage ordinaire, `nemIci` relit chaque fiche de l'acte (`nemValide`) et demande à `nemSalle` si elle vient : première salle de combat, d'élite ou Brèche dont le numéro est ≥ `attend.salle`, jamais le gardien, pas en répit, une fois par descente (`RUN.nemVenus`). Une salle d'une autre sorte (halte, autel, Colporteur) à sa place : elle attend la salle de combat suivante. Jamais inactive, au hub, en démo ni en descente d'essai.
- **Comment** : comme tout Masqué, avec la deuxième vague, à la place du champion, escorte comprise ; `room.asm` reçoit son assemblage figé, son nom, son souvenir (`sv.x.nem`, ses variantes, sa force), `nem` (son identifiant, qui fait de sa victoire suivante un point) et `nemStats`. Elle compte comme une apparition de Masqué (`RUN.asm.dernier`, `salle`), pas comme un porteur de la réserve (`porteurs`). `vu` monte d'un.
- **Ses points** (N4) : à la création, PV × (1 + 0,08 × points) ; renforts de ses points (Robuste au point 2, Brutal au point 4) avec celui de son souvenir, **en un seul appel** de `sbRenfort` (au plus `renfortMax`) ; la force de son souvenir monte de 0,15 par point et passe, comme celle de tout porteur, par `sbForce` au début de chaque attaque. Le bonus de porteur existant (+10 % de PV par rang au-delà du premier et par gravure) s'applique aussi : au pire (rang 3, deux gravures, 5 points, Robuste), × 2,25 les PV d'un Masqué ordinaire, × 1,61 ceux du même porteur.
- **Fiche relue** : si les données ont changé (capacité retirée, budget), l'assemblage est refait avec le même corps et la fiche réécrite ; corps inconnu : la fiche est abandonnée.
- **Fin de descente** (N7, avancé de l'action 4, sans quoi un répit ne passerait jamais) : pour chaque némésis qui n'a rien gagné cette fois, `nemFin` fait passer le répit, et remet le compte des morts à zéro si tu as franchi sa salle (acte plus loin, salle plus loin, ou victoire).
- **Pas encore** (action 4) : brisée, elle donne seulement la relique ordinaire (`offreReprise` ne trouve pas son souvenir dans la réserve) et sa fiche reste : elle reviendrait. Le trousseau, l'icône de porte et l'écran de mort sont les actions 5a et 5b ; le montage est celui de tout Masqué (N10b).

**Mesures** : `sim-nemesis.mjs` 46 061 vérifications, 0 échec (branchements de l'action 3 ajoutés). `banc-nemesis.mjs` **69 vérifications, 0 échec**, aucune erreur de script. Nouveaux cas :
- R1 : née à l'acte III salle 4 : à la descente suivante, là et seulement là (une fois, pas aux salles 5 et 6), jamais dans les actes I et II ; `vu` = 1.
- R2-R3 : une halte à sa salle, elle vient à la suivante, avec la deuxième vague ; même assemblage et même nom (« Brute tireuse et balafreuse », Furioso gravé deux fois arraché au Héraut), même souvenir, force 1,45 comme `nemStats` ; elle se bat (18 sorts en 30 s, son arme de la Brume jouée, force bornée par `sbForce` à 1,28).
- R4 : contre le même porteur ordinaire (même assemblage, même souvenir, même salle) : PV × 1,080 et force + 0,15 au point 1 ; elle te tue dans sa salle : point 2, Robuste, PV × 1,334 (1,16 × 1,15), dégâts inchangés.
- R5-R6 : deuxième et troisième morts face à elle : points ; répit ; la descente suivante elle n'est pas là, puis elle revient ; sa salle franchie, mort ailleurs : compte remis à zéro.
- R7-R8 : inactive ou descente d'essai : pas là ; fiche périmée (Taches, retirée en v17.19) : réassemblée avec le même corps, sauvegarde réécrite.
- Le cas D a changé avec l'action 3 : un Masqué forcé à sa salle ou après est désormais **elle** ; l'« autre Masqué » se teste avant sa salle.

Régressions : `sim-masque` 3 583 218 contrôles ; `banc-essai` 43, `banc-relecture` 12, `banc-glas-relecture` 16, `banc-touche` 34, `banc-complet` F 60 : 0 échec. `wiki.mjs --check` : à jour.

### Action 4 : la revanche (30 octobre 2026, toujours pas active)

- **Brisée** : à sa mort (`killEnemy`, pas à la purge de la salle), sa fiche est effacée de `SAVE.nemesis` (`nemBrise`) et gardée dans `room.asm.nemFiche` pour la récompense. Si tu meurs ensuite dans sa salle (escorte), elle ne revient pas et personne n'est promu (`brise`).
- **Deux récompenses** (N8) : la salle purgée, la reprise ordinaire ne joue pas (`!R.nem`) ; à la place, `offreNemesis` (bloc de la Mémoire), **puis** la relique ordinaire, toujours.
- **Ce que rend `offreNemesis`** (matrice de `nemReprise`, joueur décrit par `nemJoueur`) :
  - même forme, talent absent de ta mémoire : un écran « Sous ses éclats, un souvenir » ; « Reprendre » le rend **à son rang, sans ses gravures**, en trophée si celui de l'acte est libre, sinon dans une place (mémoire pleine : écran d'oubli, contexte `nem`, `rendre`) ; « Le laisser » (« Il retourne à la Brume. ») : rien de plus que la relique. Il arrive éteint si sa voie ou sa compétence n'est pas prise (D4). Chronique : la ligne existante « tu as repris … », rien de plus (N10). Il ne passe jamais par la réserve ;
  - tu le portes plus bas : ton rang monte à son rang (sans écran, une bulle) ;
  - tu le portes aussi haut et il est gravable : une gravure (`grave`) ;
  - sinon (autre forme, brûlé dans cette descente, disparu des données, trophée figé, rien à graver) : **des Éclats pour ce run**, 15 + 10 par point, ajoutés à `RUN.sh.elites` (ligne « Champions vaincus » de la fin de run), avec la bulle déjà utilisée ailleurs, « +N éclats pour ce run. ».
- Choix de cette action, non tranchés par le cadrage : « Le laisser » ne donne rien (la relique reste) ; un trophée ne monte pas de rang (il est figé) ; rang, gravure et Éclats sans écran. `RUN.nemRevanche` (`uid`, `points`, `type`, `id`, `eclats`, `pris`, `laisse`) attend les statistiques (action 7).

**Mesures** : `sim-nemesis.mjs` 46 070, 0 échec (branchements de l'action 4). `banc-nemesis.mjs` **92 vérifications, 0 échec**, aucune erreur de script. Nouveaux cas : V1 même forme (Lanterne brûlante rang 2 gravée une fois → reprise au rang 2, sans gravure, en trophée ; fiche effacée dès sa mort ; puis la relique) ; V2 « Le laisser » (rien en mémoire, la relique) ; V3 autre forme (aucun écran de souvenir, +25 éclats en plus des 6 du Masqué, puis la relique) ; V4 porté au rang 1, son rang 3 : ton rang passe à 3 ; V5 mémoire pleine et trophée de l'acte pris : écran d'oubli, un souvenir oublié, le sien à sa place, puis la relique ; V6 brûlé dans la descente : Éclats ; V7 brisée puis mort dans sa salle : aucune fiche. (Le banc marque la présentation de la Mémoire comme vue : sur une sauvegarde neuve, elle passe avant le premier écran d'oubli.)

Régressions : `sim-masque`, `sim-brume --vite`, `sim-dernier`, `wiki.mjs --check` ; `banc-essai` 43, `banc-relecture` 12, `banc-glas-relecture` 16, `banc-touche` 34, `banc-complet` D, E (reprise au Masqué porteur) et F : 68 : 0 échec.

### Action 5a : le dessin du crâne (30 octobre 2026, toujours pas active)

- **Dessin** (`data/masque.js`, `crane`) : repère 40 × 46, un peu de trois quarts (orbite gauche plus grande, nez décalé) ; tête et **mâchoire séparée** par un trait ; ivoire ombré par un dégradé radial, lumière en haut à gauche ; orbites et nez sombres, **lueur lavande** au fond des orbites ; reflet blanc sur le haut du crâne ; ombre portée. Couleurs dans `crane.couleurs`, jamais de rouge.
- **Deux rendus, un dessin** : `svgCrane(id, label)` (carte d'arrivée, porte, écran de mort, à brancher en 5b) et `peindreCrane(c, x, y, h)` (jeu). En jeu, `craneImg(h)` peint chaque hauteur **une fois hors écran** (× 2), `poseCrane` la pose (`drawImage`) : aucun dégradé par image. Sous 12 px, les dents ne sont pas tracées.
- **Taille, tranchée sur capture** : la consigne était « petit mais distinguable ». À 9–11 px (réglage du cadrage), un crâne se lit comme une tache et trois crânes collés sur un Spectre ne se comptent pas. Nouveau réglage : `taille` 0,5 rayon, **12 à 16 px** (Voilé et Spectre 12, Brute 16), `eventail` 24°. L'aperçu pose les crânes **en quinconce** (une chaîne sur deux plus longue) : cinq crânes se comptent d'un coup d'œil. Le simulateur refuse désormais un minimum sous 12 px.
- **Aperçu de développement** : `__nemesis.crane.essai(n, px)` pose n crânes à la hanche de chaque Masqué (sans balancement), `arret()`, `img(h)`, `taille(e)`. Le vrai trousseau (côté qui suit le déplacement, balancement, figé pendant les chargements, chute à sa mort, accroche après la couture) est l'action 5b.
- **Captures** : `_dev/bancs/capture-crane.mjs <port> <dossier> [zoom]` ; références dans `_dev/bancs/` : `crane-planche.png` (SVG et rendu du jeu de 10 à 16 px, deux fonds), `crane-brute-5.png`, `crane-spectre-3.png` (loupe × 3).

Mesures : `sim-nemesis.mjs` 46 085, 0 échec (dessin : parties, couleurs sans rouge, identifiants de dégradés, étiquette, taille minimale ; branchements de `craneImg`) ; `sim-masque` ; `wiki.mjs --check` à jour (la galerie des masques du wiki n'utilise pas le crâne) ; `banc-nemesis` 92, `banc-complet` F 60, `banc-touche` 34 : 0 échec, aucune erreur de script.

### Action 5b, première partie : le trousseau en volume et animé (30 octobre 2026, toujours pas active)

Demande de l'auteur : « un système d'animation en 3D, un trousseau de crânes 3D avec des mouvements légers ». Fait avec Opus 5.5, effort élevé (le découpage prévoyait Sonnet moyen pour 5b ; la physique et le volume le justifiaient).

- **Le crâne en volume** (`masque.js`, `peindreCrane3d`, `crane.face`) : la calotte est une sphère ; orbites, nez et dents y sont posés à leur angle et glissent quand il tourne (`x = 20 + R sin(a + yaw)`, largeur × `cos(a + yaw)`, cachés de l'autre côté) ; la lumière reste en haut à gauche, le côté qui s'en détourne s'assombrit, le reflet glisse. 13 cadres de -0,62 à +0,62 rad, peints une fois par hauteur et par plan (`crane3d`), puis posés : aucun dégradé par image.
- **Le trousseau** (`index.html`, `trouEtat`, `trouMaj`, `trouDessin`, réglages `crane.anim`) :
  - un anneau à la hanche, **du côté opposé à sa marche** (bascule amortie, 0,3 s) ; un crâne par point (au plus 5), seulement sur la némésis (ou l'aperçu de console) ;
  - chaque crâne est un **pendule** au bout de sa chaîne (pas de 1/120 s) : rappelé vers sa place dans l'éventail (19°), mené par les secousses de la hanche (marche, arrêt, ruée), amorti, écart borné (0,85 rad) ; il **tourne sur lui-même**, entraîné par son balancement, rappelé, avec un souffle lent au repos (0,07 rad) ;
  - un crâne sur deux pend plus bas, **au fond** : dessiné d'abord, plus petit (× 0,88) et assombri ; jamais derrière le corps (une première version les cachait derrière la Brute : on ne pouvait plus compter) ;
  - deux crânes du même plan se repoussent ; heurtés assez vite, un **tic d'os** à peine audible (`crane_tic`, au plus un toutes les 0,12 s) ;
  - **figé pendant ses chargements** (on lit sa zone) et en mouvements réduits ;
  - après la couture du montage, les crânes **s'accrochent un par un** (0,2 s, `asm_crane`, cliquetis sans grave) ;
  - à sa mort, le trousseau **tombe**, rebondit une fois et se défait en brume (0,75 s ; fondu sur place en mouvements réduits).
- Console : `__nemesis.crane.essai(n)` donne un trousseau de n crânes à chaque Masqué ; `etat()`, `chutes()`, `img3d(h, yaw, fond)`.
- Vidéo : `_dev/bancs/capture-trousseau.mjs <port> <dossier> [n] [corps]` (marche, arrêt, ruée, arrêt, puis mort) ; référence `trousseau-etapes.png`.

### Action 5b, suite : la porte, la carte d'arrivée, l'écran de mort (30 octobre 2026, toujours pas active)

Fait avec Sonnet 5.5, effort moyen (comme prévu). Aucun texte, nulle part.
- **Porte** (N11) : `nemPorte(d)` applique **la même règle que la salle** (`nemSalle`, chance 100) à la salle suivante : porte de combat, d'élite ou Brèche, son acte, rang d'attente atteint, pas déjà venue, pas en répit. Le résultat est gardé sur la porte (`d.nemF`). Un seul crâne (17 px, léger balancement du yaw, fixe en mouvements réduits) à droite du sigil, posé après `drawDoorsPost`. Survol : `#nemTip` (DOM, en dessous de la porte) montre son masque et son trousseau en SVG, sans texte.
- **Carte d'arrivée** : `showCard` ajoute `trousseauSvg` (n crânes en quinconce) entre le masque et le nom, pour la némésis seulement (jamais le Reflet).
- **Écran de mort** : `window.__nemEcran`, appelé par le wrapper `openEnd` de la némésis *après* l'ouverture de l'écran de fin (celui-ci est refait par `tidyEnd` : l'écran se construit dans plusieurs wrappers, ne pas s'accrocher à un autre). Masque + trousseau en haut à droite du panneau ; le crâne gagné (`decision==='nouveau'`, ou `'point'` avec point gagné) apparaît après 0,9 s avec `asm_crane` puis `__rire`. Au maximum : un tintement (`crane_tic`), pas de rire. Mouvements réduits : fondu, sans rire.
- Bancs : `_dev/bancs/capture-5b.mjs` (mort, porte + survol, carte) ; sim-nemesis : 46 107 contrôles, banc-nemesis 92, essai 43, relecture 12, sim-masque 3 583 218, wiki à jour.
- Reste du palier : 7 (statistiques), 8 (mesures, bancs complets), 9 (revue par un autre agent), 10 (journal du wiki, version v17.25, `actif:true`, CLAUDE.md).

Mesures : `sim-nemesis.mjs` 46 099, 0 échec (volume, cadres, écart et souffle bornés, pendule simulé qui revient à sa place en 4 s après la secousse d'une ruée, branchements) ; `banc-nemesis` 92, `banc-complet` F 60, `banc-glas-relecture` 16 : 0 échec ; `sim-masque`, `wiki.mjs --check` à jour ; aucune erreur de script pendant la vidéo (chute comprise).

### Action 6 : le mode d'essai `?nemesis=` (30 octobre 2026, développement seulement)

Fait avec Sonnet 5.5, effort moyen. `index.html?nemesis=<id de talent>[&points=1..5][&acte=1|2|3][&corps=…][&combo=<clé>][&classe=…][&dieu=0]` ; console : `__nemesis.essai(id, opt)`, `__nemesis.essaiEtat()`.
- La fiche est construite **en mémoire** (`NES.f`, par `nemPromotion` avec ton souvenir seul comme réserve) : `nemIci` la prend à la place de `SAVE.nemesis` (aucune écriture, pas de `vu++`) ; `nemBrise` ne touche pas non plus à `SAVE`. Sa mort donne la reprise et l'offre « Reprendre / Le laisser » comme en vrai.
- La descente est d'essai (`RUN.essai`) : aucune promotion à ta mort. Toi : jamais sous 1 PV (`dieu`, sauf `dieu=0`). `points=0` vaut 1 (le minimum d'une promue). Pas de `bot=1` : il n'y a rien à conduire ici. Salle de combat de l'acte, rang d'attente 3 ; elle n'est pas écartée par `?demo=`.
- Refus clairs : talent inconnu ou sans arme de la Brume, aucun assemblage pour ce corps/cette clé à l'acte.
- Banc : `_dev/bancs/banc-essai-nemesis.mjs` (15 contrôles). Sim-nemesis : 46 113.
- Reste : 10.

### Action 7 : les statistiques (30 octobre 2026)

Fait avec Sonnet 5.5, effort faible. `SAVE.stats17` (80 dernières descentes, export de l'Archiviste) reçoit :
- `par:'asm:<corps>'` quand un Masqué t'a tué (dernier coup de lui, ni Reflet ni Masqué d'essai) ; avant, il tombait dans le type d'ennemi le plus proche. Les autres valeurs de `par` ne changent pas.
- `nemesis` : `null` si aucune némésis ne s'est montrée ; sinon `{promu:'nouveau'|'point'|null, points, coup, rencontree, vaincue, mortContre, reprise:'talent'|'rang'|'gravure'|'eclats'|'laisse'|null, eclats, essai}`. `mortContre` : tu es mort dans sa salle, elle déjà promue (une promue neuve n'est pas « contre »). `coup` : le coup mortel venait d'elle (promue seulement). Lu dans `RUN` (`nemBilan`, `nemVenus`, `nemBrisees`, `nemRevanche`) à l'écriture de la fiche ; rien d'autre n'est écrit.
- Hooks : `__nemesis.parAsm()`, `__nemesis.statsRun()`. Banc : cas S1 à S3 de `banc-nemesis.mjs` (99 contrôles). Sim-nemesis : 46 117.
- Reste : 8 (mesures, bancs complets), 9 (revue par un autre agent), 10 (journal du wiki, version, `actif:true`).

### Action 8 : bancs complets et mesures (30 octobre 2026)

Fait avec Opus 5.5, effort élevé (prévu). Nouveau banc `banc-nemesis-complet.mjs` (46 contrôles) pour ce que N18 demande en plus de `banc-nemesis.mjs` :
- **P** : promue par contact, tir du Masqué, tir d'un autre, perte sans source, contact d'un escorte ; le coup mortel n'est noté (`coup`) que pour les deux premiers.
- **Q / Q-RM** (en temps réel : le trousseau se met à jour au dessin) : à 5 points, 5 crânes, accrochés un par un (0 → 5, sans saut) après la couture ; le trousseau bouge ; figé pendant un chargement ; côté opposé à la marche ; en mouvements réduits, aucun mouvement.
- **X** : points 1 → 5 puis plafond. **M** : `?brume=`, `?glas=`, `?dernier=` : aucune fiche, aucune apparition. **Z** : les quatre formes, trois salles chacune, némésis active sans fiche : aucune fiche, aucune erreur de script.
- **Bogue trouvé et corrigé** : le côté du trousseau comparait la position de l'ennemi à celle de la *hanche* au lieu de sa position précédente : il se verrouillait du côté où il était et ne suivait jamais la marche. Maintenant `T.ex` (position précédente de l'ennemi). Sans le banc en temps réel, il aurait passé.
- **Mesures** (`mesure-nemesis.mjs`, brute / spectre / voile, souvenir ray_n1 qui porte déjà un renfort de dégâts) : PV d'une némésis, acte III : brute 2 286 → 3 852 de 1 à 5 points (Masqué ordinaire : 2 048) ; spectre 2 111 → 3 490 (1 902) ; voilé 2 745 → 4 475 (2 482). Soit × 1,12 au premier point et × 1,88 au cinquième face à un Masqué ordinaire du même souvenir, sous le pire cas du simulateur (× 2,25). À 120 PV/s : 19 à 32 s pour briser une brute (14 à 25 s à l'acte I/II). Force de son souvenir : 1,15 → 1,75 (plafond 3,6 jamais approché avec ce souvenir). Renfort Robuste dès 2 points. Acte I et acte II donnent les mêmes PV avec l'essai (le profil d'acte II est le minimum de `__asm.essai`) ; à lire sur de vraies descentes. Voilé : aucun assemblage aux actes I et II.
- **À lire sur des descentes exportées** (le bot ne les donne pas) : part des morts face à un Masqué (`par:'asm:…'`), taux de victoire contre elle selon ses points, combien la contournent par les portes, ce que vaut la reprise en trophée à l'acte I. Les mesures de justice (§ 23 à 25) : `sim-brume.mjs --vite` inchangé, 0 échec ; le plafond de force est vérifié par `sim-nemesis.mjs`.
- Régressions : banc-complet 228, sim-nemesis 46 118, sim-masque 3 583 218, sim-brume 46 602, sim-dernier 4 021, wiki à jour ; bancs némésis 99, essai némésis 15, essai 43, relecture 12, Glas relecture 16, touche 34. `banc-dernier.mjs` : les 4 échecs d'avant (il attend un Dernier Souvenir inactif), inchangés.
- Reste : 9 (revue par un autre agent), 10 (journal du wiki, version v17.25, `actif:true`, CLAUDE.md).

### Action 9 : la relecture indépendante et ses corrections (30 octobre 2026)

Relecture par un agent séparé (Opus 5.5, effort moyen) qui n'avait pas vu le travail : rien de bloquant (promotion, sauvegarde, ordre des enveloppes d'`openEnd`, retour, mode d'essai : corrects). Corrigé avec Sonnet 5.5, effort moyen :
- **Talent en double** : `rendre` retire le talent repris de `RUN.reserveBrume` (il ne peut plus être à la fois en mémoire et dans la réserve, puis rendu une seconde fois par un Masqué porteur).
- **Statistiques de reprise** : `pris` est posé pour les Éclats, la gravure et le rang ; pour le talent, seulement une fois reçu (`x.nemr`, dans `rendre`) : renoncer à l'écran d'oubli n'est plus noté.
- **Infobulle de la porte** : placée avec le cadrage de l'écran (`offX`, `offY`, `scale`, `dpr`) ; la lettre-boîte la décalait de 40 à 90 px hors 16:9. Banc en 1280×900 et 1920×900.
- **Coup mortel** : `ncM()` : le dernier coup reçu doit venir d'un Masqué et dater de moins de 1,5 s (un drain qui t'achève ensuite n'est plus de sa main). `mortContre` ne dépend plus de `NC`.
- **Protections** : fiche dont `sv.vars` n'est pas un tableau écartée à la lecture ; `nemPorte` passe par `nemValide` (pas de crâne pour une fiche que `nemIci` abandonnerait) ; crânes qui tombent liés à leur descente (`z.run`) ; un `data/masque.js` en cache sans `crane` efface le trousseau sans casser le reste du bloc.
- **Laissé tel quel, noté** : le mode d'essai `?nemesis=` n'écrit jamais `SAVE.nemesis`, mais écrit comme les autres modes d'essai (`runs`, Éclats, `stats17` marquée `essai:true`, `asm18.vaincus`) : le texte de N15 est corrigé en conséquence. `reprise.relique` (bestiaire.js) n'est lu nulle part : la relique est toujours donnée. Le repli « renfort du souvenir le plus fort » de N3 donne un souvenir sans geste, sans renfort (noté depuis l'action 1).
- Bancs : `banc-nemesis-revue.mjs` (17 contrôles : R1 à R5). Sim-nemesis : 46 129.
- Reste : 10 (journal du wiki, version v17.25, `actif:true`, CLAUDE.md).

### Action 10 : l'activation (30 octobre 2026)

Fait avec Sonnet 5.5, effort faible. `assemble.nemesis.actif:true` ; version v17.25 (`data/versions.js`), une seule ligne au journal du wiki : « Certains Masqués portent un trousseau. » (aucun texte ne décrit la mécanique) ; `wiki.html` régénéré, `wiki.mjs --check` à jour ; ligne de `CLAUDE.md`.
- La console reste maîtresse : `__nemesis.activer(true)` force, `activer(false)` éteint, `activer(null)` rend la main aux données (`NDEV.on` vaut `null` par défaut ; les bancs éteignent la némésis par `activer(false)`).
- Contrôle final : une vraie mort contre un Masqué, sans rien activer en console, écrit une fiche et ouvre l'écran avec le masque et le crâne.
- Régressions : sim-nemesis 46 129, sim-masque 3 583 218, sim-brume 46 602, sim-dernier 4 021 ; bancs némésis 99, complet 46, revue 17, essai 15, banc-complet 228, essai 43, relecture 12, Glas 16, touche 34. `banc-dernier.mjs` : les 4 échecs d'avant, inchangés.
- À lire sur de vraies descentes (export de l'Archiviste) : la part des morts face à un Masqué (`par:'asm:…'`), le taux de victoire contre elle selon ses points, combien la contournent par les portes, la valeur de la reprise en trophée à l'acte I.

## 29. Les gardiens redessinés (v17.27), action 8 : le banc final et les mesures (1er novembre 2026)

Fait avec Opus 5.5, effort élevé (cadrage G18). Rien du jeu n'a changé : ni `index.html`, ni `render`, ni `SC27`, ni les fonctions de dessin, ni les données. Base : commit `074bdab`.

### Le banc

`_dev/bancs/banc-gardiens-final.mjs <port> <dossier hors dépôt> [RDBPCM]` reprend les neuf points de G17 :

- **R** rejoue les sept bancs des gardiens (`capture-gardiens`, `-heraut`, `-mere`, `-lisibilite`, `-scene`, `-glyphes`, `-portraits`) en sous-processus, sans les recopier, et relit leurs mesures (corps plein, couleurs, durées, portraits). `capture-lisibilite` reçoit une option `BANC_JSON` pour écrire les couleurs qu'il relève et leur origine.
- **D** descente des quatre formes jusqu'à la victoire sur le Glas (deux salles par acte, puis le gardien joué par un pilote qui frappe et tourne autour, toutes les images dessinées), `dessin.actif` vrai puis faux sur une même graine, comparée image par image.
- **B** Glas d'essai conduit (`bot=1`, Nova, Soleil posé, Atterrissage ; temps 2 et 3 ; quatre formes ; sans l'Appel, comme au § 26), vrai puis faux.
- **P** planche finale (§ « Captures ») et lisibilité mesurée sur ses cases.
- **C** coût de l'image entière (`render`) sur une salle chargée, et des parties qui changent avec l'interrupteur, mesurées en place ; porte et barre de vie avec glyphe.
- **M** mouvements réduits : le corps (aperçu hors salle) à 12 instants sur 2 s, silhouette pleine (alpha > 200) et voilée (alpha > 64), lueurs à mi-éclat, lumière de salle ; un témoin sans réduction.

Comment il tient : le jeu vit dans une fermeture stricte, donc la page est servie en **copie instrumentée** (interception de Playwright ; le harnais est injecté juste avant le démarrage du jeu, le fichier du dépôt n'est pas touché). L'horloge est à la main (`requestAnimationFrame` retenu, `frame()` appelé à 60 images par seconde, `performance.now()` suit cette horloge sauf pendant les mesures de coût : sans cela, le délai de 400 ms des boutons d'écran rendait la descente non rejouable). Le hasard est une graine ; `render` tire dans une suite à part. Les cinq explosions de l'ancienne mort d'un gardien (minuteurs `later`, posés par `bossDefeated`) tirent aussi dans la suite du dessin (voir « Le hasard après la mort »). Témoin A/A : deux passages avec le dessin final sont identiques image par image.

### Résultats

- **Combat inchangé** (G17.9) : 4 formes × 3 gardiens, 12 combats identiques image par image entre dessin final et ancien dessin (PV, position, temps, état, vulnérabilité, PV du héros, invoqués, tirs, anneaux) ; mêmes PV (2 650, 5 750, 9 000 avec ces réglages), mêmes rayons de touche (48, 48, 62 ; invoqués 14 à 16), mêmes durées (22 à 43 s par gardien), mêmes dégâts subis et infligés, mêmes temps aux mêmes images ; même héros après chaque mort ; aucune erreur de script. Glas d'essai conduit : 8 essais identiques sur 35 s, le Reflet sort (1 geste au temps 2, 2 au temps 3), 0 coup pendant un geste, 0 superposition.
- **Bancs rejoués** : `capture-heraut` 31, `capture-lisibilite` 399, `capture-scene` 58, `capture-glyphes` 45, `capture-portraits` 42 : tout passe. `capture-gardiens` : son coût isolé du Glas a dépassé une fois (+1,165 ms, puis +0,41 au passage suivant). `capture-mere` : une fois sur trois, « rien du combat ne change » au temps 3 échoue (deux lectures à 150 ms d'écart en temps réel pendant que le jeu tourne ; `mk` converge encore) : défaut du banc, pas du dessin (D le prouve image par image).
- **Portraits** : ceux du dépôt sont ceux que le dessin final produit (écart moyen 0,4 à 1,3 / 255 par portrait).
- **Régressions** : `sim-brume` 46 602, `sim-dernier` 4 021, `sim-masque` 3 583 218, `sim-nemesis` 46 129, tout est bon ; `wiki.mjs --check` à jour (portraits compris). Bancs : complet 228, effets 740, touche 34, essai 43 (une fois sur trois « Masqué acte 2 : la bonne salle » a échoué, sans asm ; repassé deux fois sans échec), relecture 12, Glas relecture 16, némésis 99, némésis complet 46, revue 17, essai némésis 15 ; captures du crâne, de la porte et du trousseau sans erreur ; `banc-dernier.mjs` : les 4 échecs d'avant, inchangés. Deux bancs (`banc-touche`, `banc-essai`) réécrivent leurs images de référence dans `_dev/bancs/` : rendues telles qu'elles étaient.

### Mesures

Coût : rendu logiciel (Chromium sans carte graphique, deux cœurs) : l'image entière varie de plusieurs ms d'un passage à l'autre (bruit mesuré : l'ancien dessin mesuré deux fois). Ce qui tranche est la somme des parties qui changent avec l'interrupteur, mesurées en place (gardien : `drawEnemyBody` + `drawEnemyPost` ; scène : `drawScene27` ; Glas : `drawCoeurPost`) ; le brouillard (teinte de lumière seulement) sert de témoin du bruit. Quatre passages, valeurs du dernier.

| | Mère-Brume | Héraut Noyé | Glas Originel |
|---|---|---|---|
| Coût en place ×1 (ms, avant → après) | 2,22 → 2,34 (**+0,12**) | 2,16 → 2,22 (**+0,06**) | gardien 2,05 → 2,55, vaisseaux 2,23 → 3,02 (**+1,29**) |
| Coût en place ×2 | +0,06 | −0,17 | gardien +1,50, vaisseaux +1,63 (**+3,13**) |
| Sur quatre passages, ×1 / ×2 | −0,21 à +0,12 / +0,05 à +0,76 | −0,11 à +0,06 / −0,34 à +0,21 | **+1,11 à +2,32 / +2,78 à +4,21** |
| Dessin seul (banc de l'action, temps 3) | +0,38 | +0,58 | +0,41 à +1,17 |
| Scène d'entrée / de mort contre gardien vivant (ms) | 1,86 / 1,87 | 1,97 / 2,63 | 2,28 / 2,68 |
| Porte du gardien, deux portes (ms, icône → glyphe ; écart sur quatre passages) | −0,29 à −0,01 | −0,24 à +0,48 | −0,26 à +0,13 |
| Barre de vie (`updateHud` + mise en page, ms) | 0,060 → 0,063 | 0,065 → 0,067 | 0,070 → 0,063 |
| ΔE min. lueurs (données, halos, traits, lumière) : orange / violet / cyan / lavande | 41,2 / 69,7 / **30,7** / 42,9 | **29,3** / 87,1 / 45,9 / 65,6 | 46,1 / 82,8 / 44,2 / 62,8 |
| ΔE min. matière (même ordre) | 41,8 / 69,7 / 34,7 / 42,9 | 54,8 / 90,9 / 43,8 / 66,0 | 58,1 / 80,4 / 48,4 / 66,3 |
| Corps plein / rayon de touche (max. des bancs) | 1,075 à 1,111 | 1,141 | 1,137 |
| Entrée (naissance après la bannière, s) | 2,25 à 2,27 | 2,22 à 2,27 | 2,22 à 2,30 |
| Mort (s) | 1,52 à 1,55 | 1,52 à 1,53 | 1,53 |
| Contraste corps / sol au repos, temps 1 / 2 / 3 (avant → après) | 4,9 → 5,9 / 5,7 → 6,4 / 5,1 → 5,8 | 6,7 → 5,4 / 6,3 → 5,3 / 5,6 → 5,2 | **6,6 → 4,2 / 7,8 → 3,7 / 7,5 → 3,0** |
| Ce qui change à l'écran en copie / à nu (écart moyen /255, temps 2) | 13,3 → 11,2 / 16,6 → 13,9 | 4,9 → 3,5 / 5,6 → 6,5 | 9,2 → 4,5 / 12,9 → 8,2 |

Couleurs de copie (les quatre formes, communes aux trois) : 26,3 contre orange et cyan, 58,0 contre violet, 38,1 contre lavande. Toutes les couleurs relevées restent ≥ 25 (G3). Entrée : la bannière dure 2,2 s de jeu par règle (`room.bannerT`) ; le banc la lit à l'image près.

### Défauts pour l'action 9 (rien n'a été réparé ici)

1. **Coût du Glas Originel** (G14, ≤ 1 ms par gardien) : temps 3, salle chargée (5 invoqués, 3 anneaux, 24 tirs), +1,11 à +2,32 ms à densité ×1 et +2,78 à +4,21 ms à ×2 sur quatre passages (Mère-Brume et Héraut : dans le bruit, ≤ +0,76). La plus grosse part est l'enveloppe de `drawCoeurPost` (vaisseaux du sol découpés autour de la cloche par une découpe `evenodd` sur toute la salle) : +0,79 à +1,12 ms (×1), +1,63 à +3,10 ms (×2) ; le corps lui-même +0,29 à +1,25 ms (×1), +0,74 à +1,50 (×2). Les bancs des actions 1 à 7 mesuraient le corps seul sur un canevas isolé et ne voyaient pas la découpe. Piste : couper les vaisseaux sans découpe plein écran (masque de la cloche seulement dans sa boîte, ou vaisseaux mis en cache et posés sous le corps).
2. **Mouvements réduits, Héraut Noyé, temps 1** (G14 : rien ne balance) : la partie voilée du corps (alpha 64 à 200 : bas de robe, eau, brume autour) bouge encore : 577 px changent sur 9 126 (6,3 % ; 909 sans réduction). Le corps plein ne bouge pas (8 px). Temps 2 : 41 px (0,5 %), temps 3 : 3 px. Image : `rm-ecarts64-reduits-2-t1.png` (rouge et cyan sur les bords de la robe).
3. **Mouvements réduits, Glas Originel, temps 1 et 2** : même chose sur la frange voilée de la cloche (bosses alternées des deux côtés) : 925 px sur 22 598 (4,1 %) au temps 1, 1 129 sur 21 221 (5,3 %) au temps 2 ; temps 3 : 5 px. Corps plein immobile (10 et 13 px). Images : `rm-ecarts64-reduits-3-t1.png`, `-t2.png`.
4. **Mouvements réduits, lumière de salle du Glas** : `computeLights` donne au gardien de l'acte III une lumière de rayon `r × 2,4 × (1 + 0,35 × beatK())`, même en mouvements réduits : 148,8 → 160,2 px au temps 1, → 182,3 au temps 2, → 197,2 au temps 3, au fil du battement. La ligne est antérieure à v17.27 (seule sa teinte a changé) ; G14 demande « une variation de lumière sans changement de taille ». À trancher : hors du dessin du corps.
5. **Banc `capture-mere`** (pas le dessin) : la vérification « rien du combat ne change » du temps 3 lit deux fois l'état à 150 ms d'écart pendant que le jeu tourne ; elle échoue parfois (`mk` converge encore). À rendre déterministe ou à confier à la descente comparée.

### Observations (à juger en relecture, sans seuil au cadrage)

- **Le Glas se lit moins contre le sol** : contraste corps / sol au repos 6,6 → 4,2 (temps 1), 7,8 → 3,7 (temps 2), 7,5 → 3,0 (temps 3) ; luminance du corps 101 → 65, 138 → 63, 119 → 46. La Mère-Brume gagne (4,9 → 5,9), le Héraut perd un peu (6,7 → 5,4).
- **Copie et point faible du Héraut moins visibles** : écart à l'écran en copie 6,9 → 3,8 (temps 1), 8,3 → 4,7 (temps 3) ; à nu, plus visible au temps 3 (10,6 → 13,1). Le Glas en copie au temps 2 : 9,2 → 4,5.
- **Le hasard après la mort** : l'ancienne mort pose cinq minuteurs d'explosion qui tirent au hasard quand ils partent ; la nouvelle (SC27) n'en pose aucun (1 minuteur contre 6). Aucune règle ne change, mais la suite du hasard décale : sans graine dans le jeu, aucun effet ; avec une graine (Partition du jour), les récompenses tirées juste après la mort d'un gardien ne seraient plus les mêmes selon le dessin. C'est ce qui faisait diverger les premières descentes du banc (Gouffre, puis Lanterne, au Glas) avant que les explosions ne tirent dans la suite du dessin.
- Le rendu tire aussi au hasard (suite à part dans le banc) : 4 900 à 10 400 tirages par combat avec le nouveau dessin, 5 000 à 12 200 avec l'ancien. Sans effet aujourd'hui (même remarque que ci-dessus pour une graine).
- Contrôle : quatre formes et mouvements réduits non touchés, `render`, `SC27` et les fonctions de dessin inchangés (`git diff` : seuls les bancs, leur README, ce document et `CLAUDE.md`).

### Captures

Hors dépôt (jointes au compte rendu) : `gardien-<n>-planche-finale.png` (trois gardiens × trois temps × six états : repos, chant ou salve, ruée / saisie / faisceaux, copie, à nu, fondu ; avant et après au même instant, télégraphes par-dessus), `rm-reduits-<n>.png` et `rm-temoin-<n>.png`, `rm-ecarts64-reduits-<n>-t<t>.png` (écarts des parties voilées), les planches des sept bancs rejoués (`bancs/<banc>/`) et `mesures-gardiens.json`.

### Reste

Action 9 (relecture par un agent séparé, Opus 5.5, effort moyen ; corriger les défauts 1 à 4 si la relecture les confirme, avec Sonnet 5.5, effort moyen) ; action 10 (wiki, journal, version v17.27, `CLAUDE.md`, retrait des anciennes fonctions, push ; Sonnet 5.5, effort faible).

## 30. Les gardiens redessinés (v17.27), action 9 : relecture indépendante et corrections (1er novembre 2026)

Relecture par un agent séparé (Opus 5.5, effort moyen) qui n'avait vu ni le travail ni le § 29 : lecture du bloc v17.27, captures en combat (nouveau et ancien dessin au même instant), mesures. Aucune erreur de script ; rien du combat ne passe par le dessin (il n'écrit que `e.g27`, `EYE.boss`, `TINT.*`). Corrections faites ensuite (Opus 5.5), sans rien changer du combat :

| # | Constat (relecture et § 29) | Correction |
|---|---|---|
| 1 | Héraut, temps 1 et 2 : le corps se fond dans le dallage teal (contraste corps / sol 5,4 et 5,3 contre 6,7 et 6,3 avant) | `dessin[2].matiere.bronze` 110,96,60 → 140,122,78 et `robe` 28,44,38 → 60,96,82 : 6,0 / 5,8 / 5,7 (temps 1 / 2 / 3 ; avant le chantier 6,7 / 6,3 / 5,6). ΔE toujours ≥ 25. |
| 2 | Glas : sa lumière de salle grossit avec le battement en mouvements réduits (148,8 → 197,2 px) | `computeLights` : en mouvements réduits, rayon fixe quand le Glas redessiné est actif (`RM&&g27Actif(3)`). |
| 3 | Glas et Héraut : le linceul (`shroud`, ancien, partagé) tourne avec `T` et `e.wob` en mouvements réduits (Héraut 577 px, Glas 925 et 1 129 px de voile qui bougent) | `linceul()` dans le bloc v17.27 : pose `shroud` à `T = 0` et `e.wob = 0` sous `RM` (les quatre appels du nouveau dessin). Mesure : 0 à 23 px sur 8 000 à 23 000, partout. |
| 4 | L'anneau du point faible clignote à 3,8 Hz en mouvements réduits | `G27.anneau` : opacité fixe 0,8 sous `RM`. |
| 5 | Les yeux du gardien (`eyePts`, `drawEnemyPost`) ignorent le fondu d'esquive (G13) : on voit encore où est la Mère-Brume | Opacité des yeux × `e.fade` pour un gardien redessiné (ancien dessin inchangé). |
| 6 | Coût du Glas (§ 29) : la découpe `evenodd` plein écran de `drawCoeurPost` à chaque image | Les segments de vaisseaux loin de la cloche sont tracés sans découpe ; ceux qui passent près d'elle, sous une découpe limitée à leur boîte. Vaisseaux : +1,9 → +0,5 à +0,7 ms (×1), +3,1 → +1,1 ms (×2). Un premier essai (vaisseaux peints dans un cache plein écran) coûtait plus cher en rendu logiciel (+11 ms à ×2) : abandonné. |
| 7 | Traînée lavande de naissance du Reflet redessinée pendant la mort du Glas | Pas de traînée si `e.dead`. |
| 8 | `etat` du Glas accepte n'importe quel `e.g27` | Marque `glas:1`, vérifiée. |
| 9 | Halo de brume de la Mère-Brume, additif par-dessus les télégraphes, rayon 1,5 r | 1,1 r. |
| 10 | Banc `capture-mere` : « rien du combat ne change » échouait parfois (`mk` converge entre deux lectures) | `calme` pose `mk` à sa cible. |

Le dessin du Héraut a changé à l'œil : `dessin.version` 2 → 3, portraits refaits (`img/gardiens/*-v3.webp`, les v2 retirés), wiki régénéré, `--check` à jour.

**Laissé tel quel, noté** :
- **Glas plus sombre qu'avant** (contraste corps / sol 4,2 / 3,7 / 3,0 contre 6,6 / 7,8 / 7,5) : la relecture le juge lisible (encre, bronze, anneau du point faible bien visible ; au temps 1, sous l'anneau-télégraphe, mieux qu'avant). À juger en jeu ; piste : plus de lumière dans la chair du temps 3.
- **Corde cassée du Héraut au temps 2** peu visible à l'échelle du jeu (c'est le bras qui pend qui dit le temps 2) : conforme à G4.
- **Coût du Glas à densité ×2** : parties en place encore +1,1 à +2,4 ms en rendu logiciel (corps +0,7 à +1,5, vaisseaux +1,1) ; à ×1, +0,5 à +0,85 ms, image entière dans le bruit (trois passages). La relecture mesure +0,18 ms avec `mesure()`. À confirmer sur une vraie carte graphique.
- Le hasard après la mort (§ 29) : inchangé, sans effet sans graine.

**Vérification** : banc final complet après corrections (avant le changement des vaisseaux) : combat identique (12 combats, 8 essais du Glas), mouvements réduits tous verts, couleurs ≥ 25, bancs rejoués verts ; puis, après les vaisseaux, coût du Glas repassé trois fois à ×1, descente comparée (Lanterne) et bancs des gardiens, simulateurs et `wiki.mjs --check`.

Reste : action 10 (journal, version v17.27, retrait des anciennes fonctions, push ; Sonnet 5.5, effort faible).

## 31. La grande descente (v18.0), action 2 : la charpente (1er novembre 2026)

Cadrage : `claude/la-brume-v18-descente-10-actes-cadrage.md` (projet), décisions V1–V7 validées le 1er novembre 2026. Proposition de l'action 2, validée le même jour : durée visée **40 min en Normal hors combat final (30 pour un rapide)** ; actes I à III inchangés ; IV à IX courts (3 salles + élite de fin) ; X = antichambre + gardien provisoire ; montée divisée par deux après l'acte III ; les Paliers de Brume sont remplacés ; Portail limité aux actes II et III.

**Données** : `data/descente.js` (nouveau). `actes` (IV à X : nom, salles fin comprise, `fin` élite ou gardien, `antichambre`, `entree`), `registre` (3), `fin` (élite de fin : `pv` et `vague` par acte), `gardien` (acte X : × PV et × dégâts du Glas), `montee` (`apresActe`, pentes), `dureeCible`, `ordre` et `paliers` (nom, icône, ligne, `ouvrePar`), `regles` (vides : action 3). Les actes I à III restent dans `gardiens.js` (`actes`), que le wiki lit toujours pour les gardiens.

**Le registre.** Le reste du jeu ne connaît que trois actes (une centaine de lectures de `RUN.act` : décor, musique, ennemis, IA des gardiens, tableaux `[0,16,22,26][RUN.act]`, Masqué, némésis…). Plutôt que de les reprendre une à une, `RUN.acteD` porte l'acte de la descente (1 à 10) et **`RUN.act` devient un accesseur** (`newRun`) qui rend le *registre* de cet acte (`ACTD[n].registre` : 1, 2, 3, puis 3 pour IV à X) ; l'écrire (`RUN.act=2`, les modes d'essai) écrit `acteD`. `ACTE()` lit l'acte de la descente. Ont été basculés sur `ACTD[ACTE()]` / `ROM[ACTE()]` : tout ce qui **compte les salles** (portes, antichambre, Brèche, bulles v17, Masqué `actRooms`, raccourci et gardien direct v9), tout ce qui **affiche** l'acte (HUD, pause, fin de run, chronique, journal des oublis, `bestLabel`), les **tombes d'Écho** (acte stocké et comparé), les temps de gardien (`RUN.bossT`), le nom et la bannière du gardien. La **némésis** garde le registre (`acte:RUN.act`, `ACTS[RUN.act].rooms`) : une némésis promue en acte VII revient au registre 3, à sa salle.

**Ce qui se compte par acte.** Les compteurs indexés par `RUN.act` (colporteur, raccourci et gardien direct v9, souvenirs portés par les Masqués, budget et répit des contre-mesures du Brumeux) repartent à zéro à chaque acte IV+ (`desNouvelActe`, sous la clé du registre). Les enveloppes v9 et v13 qui réagissent à un changement de `RUN.act` (pacte, fiole, larme, flasque R4, « palier gagné » D4) ne le voient pas (il reste 3) : le bloc v18 les rejoue sur la porte `acte`. **Laissés tels quels, notés** : les trophées de souvenir (`M.trophees[RUN.act]`, un par acte) ne repartent **pas** à zéro (sinon jusqu'à 7 trophées hors limite de plus) ; `R.perfect`, `bossFirst`, `bossHurt` comptent le gardien de l'acte X sous la clé 3.

**Logique pure** (bloc `/*des:pur*/`, juste après `ACTS`) : `desActes`, `desSeuil`, `desMontee` (pour g ≤ seuil, **exactement** `1 + base × (g − 1)` : `ap = 0`, et `a × 0 = 0`), `desPorte` (porte imposée : `suite`, `fin`, `garde`, `boss`, `halte` ou rien), `desPorteActe` (`act`, `act3` comme avant, puis `acte`), `desLire`/`desEcrire`/`desNeuf` (sauvegarde `SAVE.descente`, versionnée `v:1` : absente ou abîmée → état neuf, version future → `null` et on n'y touche pas, pas de trou dans les paliers ouverts, victoires nettoyées), `desChoix`, `desFin` (seule une victoire hors essai, à un palier ouvert, ouvre le palier dont `ouvrePar` est celui joué ; compte la victoire par palier et par forme, pour les emblèmes de D4).

**Branchements** (fonctions de base, avant toute enveloppe) : `makeDoors` lit `desPorte` ; `onRoomCleared` : après le Glas de l'acte III, une relique (`ACTD[3].done`) et la porte de l'acte IV au lieu de la fin ; `openEnd(true)` seulement au dernier gardien ; `doEnter` : `acte` (→ `desNouvelActe`, première salle `entree`) et `garde` (→ élite, `RUN.gardeNow`) ; `createBoss` : nom de l'acte, ×1,25 PV et ×1,15 dégâts au gardien provisoire (`desGardienX`) ; `hpMul`/`dmgMul` : `desMontee` ; mémoire : `R.won` seulement au dernier acte. **Bloc v18** (fin d'`index.html`, enveloppes les plus extérieures) : portes `acte` et `garde` (`DOOR`, `ICONS`), sauvegarde migrée au chargement, sélecteur (écran titre sous la progression, Portail à la place des Paliers de Brume), palier choisi au départ (`RUN.palierD`), HUD (« Élite de l'acte », palier hors Normal), effets du changement d'acte, élite de fin (`planRoom` : Masqué forcé via `__asm.forcer`, vague de plus ; `createEnemy` : × PV, `e.garde`), déblocage dans `openEnd` (garde : `RUN.essai` ou un paramètre d'essai `masque|brume|glas|dernier|nemesis|demo|descente`), essai, console.

**Paliers de Brume retirés** : `newRun` pose `palier:0` (`PAL()` vaut 0 partout : rien de leurs effets ne joue) ; plus de déblocage (`palUp` faux, `palierMax` n'est plus écrit) ni de rappel au Sanctuaire ; `sanctuaire.js` les garde, le wiki ne les liste plus. Un joueur qui jouait au palier 3 rejoue la descente au palier 0 : c'est voulu (les paliers de la descente les remplacent), à dire au journal (fait). Ses anciennes victoires (3 actes) n'ouvrent pas Difficile.

**Essai** : `index.html?descente=<acte>[&fin=1][&classe=…]` ; console `__descente` (`essai(n,{fin,cls})`, `dbg()`, `etat()`, `choisir(p)`, `effacer()`, `porte()`, `montee(g)`, `vider()`/`file()` pour les bancs). Un nouveau mode d'essai doit poser `RUN.essai=1` (ou entrer dans `ESSAI18`).

**Vérification.** `node themist/outils/sim-descente.mjs` : **283 vérifications, 0 échec** (données et secret, actes, montée salle par salle, portes acte par acte contre l'ancienne règle, sauvegarde, déblocage, branchements lus dans `index.html`). Contre-épreuves faites à la main : pente qui change après l'acte II, montée décalée d'une salle, antichambre imposée partout, garde de l'essai retirée : toutes attrapées. Banc `_dev/bancs/banc-descente.mjs` (A descente complète, B règle d'or, C essai, D sélecteur, E sauvegardes) : **117 vérifications, 0 échec** (46 salles parcourues, un pacte à chacun des 9 nouveaux actes, Masqué imposé aux 6 élites de fin, Difficile ouvert par la victoire, rien par l'essai).

**Régression** : simulateurs `sim-brume` 46 602, `sim-dernier` 4 021, `sim-masque` 3 583 218 contrôles, `sim-nemesis` 46 129 : 0 échec. Bancs : `banc-effets` 740, `banc-touche` 34, `banc-essai` 43, `banc-relecture` 12, `banc-glas-relecture` 16, `banc-nemesis` 99, `banc-essai-nemesis` 15, `banc-nemesis-complet` 46, `banc-nemesis-revue` 17 : 0 échec. `banc-dernier` : 4 échecs « inerte tant que dernier.actif est faux », **identiques sur le commit d'avant** (servi à part et rejoué) : le banc date d'avant l'activation du Dernier Souvenir (v17.23). Deux bancs supposaient que le Glas de l'acte III termine la descente, et ont été adaptés : `banc-complet` F (après le Glas, il saute au gardien de l'acte X et l'abat ; 60 vérifications, 0 échec) et `banc-gardiens-final` D (la fin, c'est l'écran de fin ou la seule porte vers l'acte IV ; 92 vérifications, 0 échec ; le reste du banc final, dont les 12 combats identiques image par image entre ancien et nouveau dessin et le Glas d'essai conduit, passe : 219 / 223 avant l'adaptation, les 4 échecs étant ce point D).

**Mesures** (simulateur et banc) : 46 salles, dont 10 fins d'acte (36 hors fins) ; montée ×2,615 PV et ×1,57 dégâts en fin d'acte III (inchangé), ×3,575 et ×1,93 en fin d'acte IX (l'ancienne pente prolongée donnait ×4,66) ; gardiens I à III : 2 650, 5 750, 9 000 PV, 16, 22, 26 dégâts, rayon du Glas 62 (règle d'or) ; gardien provisoire de l'acte X : 11 250 PV, 29,9 dégâts. **La durée réelle n'est pas mesurée** (le bot ne frappe pas) : les statistiques de descente notent maintenant l'heure d'entrée de chaque acte (`actesT`), l'acte de la descente (`acte`), le registre et le palier : c'est sur des parties exportées qu'on recalera le nombre de salles des actes IV à IX.

**Points ouverts** : durée réelle à mesurer ; trophées par acte (voir plus haut) ; le raccourci du Portail reste limité aux actes II et III ; quelques textes de fin de run (Carte du Glas, Archiviste) parlent encore du Glas en fin de descente (la ligne de la chronique dit le nom du gardien vaincu) ; l'emblème par palier et par forme (D4) a ses compteurs (`victoires`) mais pas encore d'affichage.

### 31 bis. Correction v18.1 : un gardien par acte, deux miniboss avant le boss final (1er novembre 2026)

L'auteur a précisé la structure après la v18.0 : **le Glas Originel reste à l'acte III** (il n'est plus repris comme gardien provisoire de l'acte X) ; **chaque acte, du IV au IX, se termine par un gardien** (les six nouveaux gardiens du cadrage) ; **l'acte X enchaîne deux salles de miniboss, puis le boss final du jeu**.

- Données (`descente.js`) : actes IV à IX `fin:'gardien'` sans `boss` (gardien pas encore créé) ; acte X `fin:'final'`, `miniboss:2`, `entree:'mini'`, 3 salles (47 salles en tout, 37 hors fins). `provisoire` remplace `fin` et `gardien` : ce qui tient les places vides (Masqué imposé, PV et vague en plus) : `fin` (par acte, ×1,3 à ×2,05), `mini` (×2,2 puis ×2,4), `final` (×3).
- `desPorte(A, {…, fin})` : `fin` vrai quand la salle quittée était la fin de l'acte ; dernière salle : `final` (acte X), `boss` (un gardien nommé, `A.boss`), sinon `garde` (sa place provisoire) ; les `miniboss` salles d'avant : `mini`. Quand un gardien des actes IV à IX sera créé, lui donner `boss` dans `descente.js` fera venir la salle « boss » (il faudra alors que `createBoss` et l'IA sachent qui il est).
- `createBoss` est revenu **exactement** à sa ligne d'avant la v18 (le simulateur le lit). Les portes `garde`, `mini`, `final` passent par une salle d'élite (`RUN.gardeNow` = le genre ; `room.gardeK`) ; le boss final provisoire vaincu termine la descente (`onRoomCleared` : `RUN.mem.won`, `openEnd(true)`, sans relique). HUD et portes : « Gardien », « Miniboss », « Boss final ». Chronique de victoire : « est allé au fond de la Brume ».
- Vérification : `sim-descente` **300 vérifications, 0 échec** ; `banc-descente` **117, 0 échec** (47 salles : … | CCCG ×6 | mmF ; Masqués de l'acte X de plus en plus endurants ; le Glas jamais repris après l'acte III) ; `banc-complet` F adapté (il saute au boss final) : 60, 0 échec.
- Régression après la correction : simulateurs `sim-brume`, `sim-dernier`, `sim-masque`, `sim-nemesis` à 0 échec ; bancs `effets`, `touche`, `essai`, `complet` (228), `relecture`, `glas-relecture`, `nemesis`, `essai-nemesis`, `nemesis-complet`, `nemesis-revue` à 0 échec ; `banc-dernier` : les 4 échecs anciens (voir § 31) ; `banc-gardiens-final` : 222 / 223, le seul échec est une mesure de coût de rendu (Héraut ×2, image entière +3,4 ms avec la machine chargée), qui passe rejouée seule (section C : 27, 0 échec).

## 32. Les règles des paliers (v18.2), action 3a : Difficile et Extrême, hors règles mutantes (1er novembre 2026)

Cadrage : `claude/la-brume-v18-3-paliers-cadrage.md` (projet), Q1–Q14, validé le 1er novembre 2026 ; Q14 coupe l'action en deux : **3a** (ici) les règles de Difficile et d'Extrême, **3b** les règles mutantes de l'Extrême. Règle d'or : en Normal rien ne change, et le combat des gardiens des actes I à III ne change dans aucun palier.

**Données** (`descente.js`, `regles`) : `normal:{}` (vide, et le simulateur exige qu'il le reste) ; `difficile` : `masque` (chance 70, souvenir 75, 3 porteurs par acte), `soins` (`sources` room, level, halte ; `monde` ×0,65 ; `gardien` ×0,65), `gardien` (`desActe` 4, `tempsEnPlus` : pv 35, `margeMenace` 1) ; `extreme` : `herite:'difficile'` (Q1), `soins` (monde ×0,5, gardien ×0), `nemesis` (parActe 2, `repit:false`), `repit` (`halteDes` 0,5), `brumeux` (`phaseEntiere`, lu à l'action 5).

**Logique pure** (bloc `/*des:pur*/`) : `desFusion` (fusion profonde, les tableaux remplacent), `desRegles(DS,p)` (héritage résolu, copie neuve, boucle arrêtée, palier inconnu = `{}`), `desMasque`, `desNemesis` (`repit:false` → `repitMorts` Infinity), `desSoin(R,src,gardien)`, `desHalteOk(R,next,rooms)` (`next ≥ ⌈rooms × halteDes⌉`), `desTempsEnPlus(R,acte)` (jamais sous l'acte IV, même si `desActe` le permettait : la règle d'or est dans le code), `desCapEnPlus`.

**Branchements** (fin du bloc v18, enveloppes les plus extérieures) :
- Masqué et némésis : `bestiaire.js` garde les valeurs de Normal ; `appliquer(p)` les pose à chaque `startRun` sur l'objet `assemble` (et `assemble.nemesis`) depuis une copie faite au chargement (`BASE18`) : en Normal, les valeurs d'origine, au chiffre près. Le Masqué lit `A.chance`, `A.souvenir`, la némésis `NM.parActe`, `NM.repit.morts` au moment du tirage ou de la mort : rien d'autre à brancher. Une fiche de némésis déjà en répit (gagné en Normal ou Difficile) le reste en Extrême : `repit:false` empêche seulement d'en gagner un nouveau.
- Soins : le jeu classe déjà ses soins (`['boss','level','halte','room']` ne comptent pas dans le profil, v12) ; les soins du monde sont `room`, `level`, `halte` (la halte, la tisane, la fiole, les tombes, le « palier gagné » et l'aide « Souffle » passent par `halte`). `boss` n'en est pas : il porte aussi la survie du Gouffre contre un fort, le soin du Dernier Souvenir et un talent. Le soin complet qui suit un gardien (`bossDefeated` : `heal(P.s.maxHp,'boss')`) est repéré dans l'enveloppe de `heal` : source `boss`, salle de gardien, `room.bossDead`, PV max entiers, une fois par salle (`room.soinG18`). Son message suit (`toast` enveloppé) : « Tes PV sont en partie restaurés. » (Difficile), « La Brume ne te rend rien. » (Extrême). Les soins reçus sont comptés par source (`RUN.soins18`, dans les statistiques : `soins`).
- Répit : `makeDoors` enveloppé : une halte au choix avant `halteDes` de l'acte devient un combat (ou disparaît si un combat est déjà proposé). L'antichambre imposée (salle `rooms − 1`) est toujours dans la seconde moitié. Aux actes IV à IX, il n'y a déjà pas de halte au choix (4 salles) : seuls les actes I à III changent.
- Temps de plus (Q4) : `createEnemy` enveloppé, pour le Masqué d'une place provisoire (`room.gardeK` : garde, mini, final) à partir de l'acte IV : `st.temps = {cap, pv, on}`. **Écart avec le cadrage** : il prévoyait une quatrième capacité ; avec cinq capacités, les exclusions de chaque corps (Brute sans Charge, Spectre sans Explosion ni Lame, Voilé sans Salve) et l'incompatibilité explosion / onde, **aucune des 15 combinaisons du registre 3 n'en admet une** (le simulateur le compte). Le temps de plus est donc, à défaut, **sa signature redoublée** : elle revient une fois au milieu de chaque cycle (`asmCycle` : jamais en tête, jamais juste avant la signature finale, jamais deux fois de suite ; sans signature redoublée, le cycle est tiré exactement comme avant, tirage pour tirage). `desCapEnPlus` reste : un futur corps ou une future capacité qui tient sous le plafond + `margeMenace` passera avant la signature. Rituel de l'éveil (`asmPas` : signal, `eveilS`, carte avec l'icône neuve, `st.nouv`) ; un second sablier sur la carte tant que le temps de plus dort.
- Console `__descente` : `regles(p)`, `appliquer(p)`, `palier(p)` (pose le palier de la descente en cours), `masque()`, `soin(n,src)`, `halte(next,rooms)`, `tirer(next)` (bancs). `RUN.msgGardien18` (bancs).

**Wiki** (Q11, généré par `wiki.mjs`, `lignesPalier`) : chaque carte de palier dit ses règles (Extrême : « Tout ce que change Difficile, et : »), avec les chiffres des données. Il tait la némésis, la phase finale du boss final et les règles mutantes (le simulateur le vérifie sur la section).

**Mesures.** Modèle du simulateur (indice charge ÷ soin, poids supposés : un Masqué = 2 vagues, 60 % des soins viennent du monde) : Difficile **+62 %**, Extrême **+101 %** hors mutations, au-dessus des cibles du cadrage (+30 %, +70 % mutations comprises) ; les soins du monde ×0,65 pèsent le plus. Le simulateur ne juge plus l'équilibre sur ce modèle (ses poids sont des hypothèses) : il garde l'ordre des paliers et un plafond (+120 %). Banc E (actes I à V, 3 descentes par palier, joueur immobile, 15 s par salle de combat) : voir la ligne de résultats ci-dessous ; les dégâts subis par minute d'un joueur immobile ne départagent pas les paliers (le bruit domine), le banc sert surtout à compter les Masqués, les temps de plus et les soins reçus.

**Vérification.** `sim-descente` : **40 706 vérifications, 0 échec** (§ 7 nouveau : Normal vide, héritage, copie neuve, Masqué et némésis par palier, les 18 sources de soin du jeu classées, haltes acte par acte, temps de plus jamais aux actes I à III même avec une règle mal écrite, 15 combinaisons du Masqué, `asmPas` avec temps de plus sur 300 combats : l'éveil puis le temps de plus sous 35 %, jamais deux zones à la fois, jamais deux fois le même sort de suite, signature redoublée ; `asmCycle` sans signature redoublée identique à l'ancien tirage pour tirage ; wiki : règles dites, némésis, Brumeux et mutations tus ; branchements). Contre-épreuves à la main : signature redoublée posée en fin de cycle (60 échecs), soin du gardien non réduit (attrapé). Banc `banc-paliers` : **57 vérifications, 0 échec**. Mesure E (une passe) : Masqués 13 / 21 / 26 en Normal / Difficile / Extrême, temps de plus 0 / 6 / 6, soins du monde 13,1 / 8,8 / 6,6 PV par salle ; dégâts subis par minute 1 445 / 1 632 / 1 518 (bruit : une autre passe donnait 1 497 / 1 445 / 1 428). Aucun porteur de souvenir dans ce banc (la réserve est vide : rien n'y est oublié).

**Régression** : simulateurs `sim-brume` 46 602, `sim-dernier` 4 021, `sim-masque` 3 583 218 contrôles, `sim-nemesis` 46 129 : 0 échec (comptes inchangés). Bancs : `effets` 740, `touche` 34, `essai` 43, `relecture` 12, `glas-relecture` 16, `nemesis` 99, `essai-nemesis` 15, `nemesis-revue` 17, `nemesis-complet` 46, `complet` 228, `descente` 117 : 0 échec ; `banc-dernier` : les 4 échecs anciens (§ 31). `banc-descente` A avait échoué une fois (« acte X, des Masqués de plus en plus endurants » [5561, 5488, 8974]) : fragilité ancienne, indépendante des paliers (un Spectre, PV ×0,85, tiré après une Brute, ×1,1, l'emporte sur la hausse ×2,2 → ×2,4) ; le banc compare désormais les PV à corps égal.

**Points ouverts** : modèle de pression au-dessus des cibles (à recaler sur des parties réelles : `stats17[].soins`) ; la quatrième capacité n'existe pour aucune combinaison d'aujourd'hui ; une némésis déjà en répit le reste en Extrême ; l'icône « cœur fêlé » au HUD évoquée au cadrage (Q3) n'est pas faite : le palier se lit au HUD par son nom, comme en v18.0.

## 33. Les règles mutantes de l'Extrême (v18.3), action 3b (1er novembre 2026)

Cadrage : `claude/la-brume-v18-3-paliers-cadrage.md`, Q5–Q7 et Q11 (validés). Règle d'or inchangée : rien en Normal ni en Difficile, jamais dans la salle d'un gardien (actes I à IX, places provisoires comprises) ni au boss final.

**Données** (`descente.js`, `regles.extreme.mutations`) : `plafond` {1:1, 4:2, 7:3}, `salles` (combat, élite), `incompatibles` (presse / dernier), `suspend` (la brume qui serre se tait sous Brume plombée et Sol qui se dérobe), `suspendElite` (glas puis ombre : l'ombre se tait en élite quand le glas est là), `sceauS` 2,4, et les huit mutations (`n`, `ic`, `d`, `r` : nom, icône, ligne, réponse, lus par le HUD, la pause et le wiki ; puis leurs réglages). Icônes `u_m_*` dans `icones.js`.

**Logique pure** (`/*des:pur*/`) : `desRng` (mulberry32), `desPlafond`, `desMutIncomp`, `desMutActe` (au plafond la plus ancienne sort ; la nouvelle n'était pas là à l'acte d'avant, n'est pas celle qui sort, n'est incompatible avec aucune de celles qui restent), `desMutDescente(M, graine, n)` (la descente rejouée depuis la graine : un essai qui saute à l'acte VII retrouve la même liste), `desMutSalle`.

**Jeu** (bloc « v18.3 · Les règles mutantes », après le bloc v18) : `RUN.mut18` (graine, acte, liste, entre, sort, `hist` par acte → statistiques `mutations`, `vu`). Chaque pas (enveloppe d'`updateEnemies`) : la liste de l'acte (recalculée au changement d'acte → sceaux), `room.mut18A` (celles qui jouent ici), puis :
- **Échos funèbres** : `killEnemy` enveloppé ; un ennemi ordinaire (ni élite, ni Masqué, ni gardien, ni fixe) laisse une zone `echo` (56 px, 1,2 s, 8 × montée), qui ne touche que toi.
- **Vagues pressées** : la vague suivante entre quand il reste au plus 50 % de la précédente (après 1,2 s), ou après 7 s (11 s d'ordinaire).
- **Brume qui serre** : `room.serre18` monte jusqu'à 15 % en 25 s de combat, retombe en 1,2 s à la purge ; toi, les ennemis (hors gardien et fixes) et les apparitions sont gardés dans le rectangle intérieur (aucun dégât : la brume prend la place). Dessin : bande de brume grise-violette, bord pointillé.
- **Couronne** : chaque vague entière d'au moins 3 ennemis ordinaires couronne l'un d'eux (`e.couronne18`) ; `hitEnemy` enveloppé : les autres (hors Masqué et gardien) prennent ×0,5 tant qu'il vit. Couronne dorée au-dessus de lui, fils et anneaux légers vers les protégés.
- **Dernier souffle** : vague d'au moins 3 (taille comptée à la création, `e.vague18`, `room.taille18`) ; le dernier vivant de sa vague (hors Masqué) : ×1,3 de vitesse, aura rouge (la couleur de la rage du Masqué).
- **Glas lointain** : toutes les 9 s de combat, trois zones `glas` (60 px, 1 s de préavis, 12 × montée), une sur toi et deux à 115 px de part et d'autre, cloche tracée au centre, `sfx('bell')` ; il attend si l'ombre vient d'apparaître.
- **Ombre** : ta trace (positions de jeu) ; toutes les 12 s, elle apparaît au début de la trace (0,6 s, silhouette sombre au liseré orange, le chemin à venir en pointillé), puis refait tes 2 dernières secondes ; la toucher blesse une fois (10 × montée). Elle attend si un glas est au sol.
- **Cœur fermé** : `heal` enveloppé (le plus extérieur) : en combat, chaque soin est mis de côté par source (`room.diff18`) et rendu à la purge par le même chemin (les facteurs du palier s'y appliquent alors) ; perdu si tu meurs. Barre de PV : segment hachuré vert pâle (`.d18`) ; à la purge, un nombre vert.
Les zones sont orange (`TELE.zone`, la grammaire des télégraphes), jamais rouges ni lavande ; elles disparaissent à la purge. Première fois qu'une mutation agit dans la descente : son icône clignote au HUD (`premiere`).

**Lecture** : sceaux (`#sceaux18`, sous la bannière d'acte, 2,4 s, la nouvelle s'imprime, celle qui sort se brise ; aucune pause), HUD (`#hMut18`, sous la salle, une icône par mutation de l'acte, éteinte là où elle ne joue pas, une ligne au survol), pause (`.mut18p`, une ligne et la réponse par mutation). Aucune bulle ni fenêtre de texte. Mouvements réduits : pas d'animation des sceaux, pas de pulsation.

**Wiki** (Q11) : la carte Extrême renvoie aux règles mutantes ; sous les paliers, « Les règles mutantes (Extrême) » : leur nombre par acte, comment elles entrent et sortent, où elles ne jouent pas, et le catalogue (icône, nom, ligne, réponse). Il ne dit pas comment elles sont choisies (le simulateur interdit « tirage » et « graine » dans la section).

**Console** : `__mutations` (`etat()`, `actives()`, `forcer([ids])`, `rejouer(graine, n)`, `salle()`, `attente()`, `frapper(e, base)`).

**Vérification** : `sim-descente` **40 772 vérifications, 0 échec** (§ 8 : les huit, icônes, lignes courtes, préavis, coups légers, plafond acte par acte, générateur, **10 000 descentes** : plafond, une nouvelle par acte, la plus ancienne sort, jamais deux incompatibles, ordre gardé, rejouable d'où qu'on arrive ; répartition : chacune à ±8 % de l'égalité, presse et dernier, incompatibles entre elles, à 87–88 % ; salles et suspensions ; branchements ; aucune bulle). Contre-épreuves : mutations permises dans la salle d'un gardien provisoire, fenêtre qui ne fait plus sortir la plus ancienne : attrapées. Banc `banc-mutations` (A Normal et Difficile, B listes, sceaux, HUD, pause, statistiques, C les huit effets un par un, D salles, E captures) : **61 vérifications, 0 échec** ; captures relues (sceaux sous la bannière, icônes au HUD, bande de brume, cercles du glas, couronne, ombre et son chemin, soin en attente sur la barre).

**Régression (v18.3)** : simulateurs `sim-brume` 46 602, `sim-dernier` 4 021, `sim-masque` 3 583 218 contrôles, `sim-nemesis` 46 129, `sim-descente` 40 772 : 0 échec. Bancs `mutations` 61, `descente` 117, `effets` 740, `touche` 34, `essai` 43, `relecture` 12, `glas-relecture` 16, `nemesis` 99, `essai-nemesis` 15, `nemesis-revue` 17, `nemesis-complet` 46, `complet` 228 : 0 échec ; `banc-dernier` : les 4 échecs anciens (§ 31). `banc-paliers` : 56 / 57, l'échec est la section E (mesure) : « plus de Masqués hors Normal » [23, 25, 21] sur trois descentes par palier ; les trois passes faites donnent 13 / 21 / 26, 20 / 26 / 25 et 23 / 25 / 21 : le compte est trop petit pour juger un écart de 50 à 70 % ; cette vérification est à remplacer par un comptage direct (beaucoup de salles tirées au même acte), point ouvert. `banc-gardiens-final` : 222 / 223, l'échec est la mesure de coût (Glas ×2, « parties en place » +1,13 ms pour ≤ 1) ; rejouée seule : +1,14 ms puis **+0,35 ms** (passe) ; sur le commit d'avant la v18.2 (f5c17cf), la même section donne +0,85 ms : bruit de la machine, rien de ce chantier ne dessine dans la salle d'un gardien (aucune mutation n'y joue). `capture-heraut` (corps plein, pose « charge ») avait aussi échoué une fois à 1,154 × r (≤ 1,15) pendant que la machine était chargée ; sur f5c17cf, la même mesure varie de 1,125 à 1,146 : même fragilité, ancienne, près du seuil.

## 34. L'arène large (v18.4), action 4 : le terrain du boss final, la caméra, les signes de bord (1er novembre 2026)

Cadrage : `claude/la-brume-v18-4-arene-cadrage.md` (projet), Q1–Q12, validé le 1er novembre 2026 (toutes les recommandations). Hors champ : le combat du Brumeux (action 5). Règle d'or : **en jeu, aucune salle ne change**, boss final compris ; l'arène est **éteinte** (`actif:false`, Q6) et seul le mode d'essai l'ouvre.

**Données** (`data/arene.js`, nouveau, Q8) : `actif`, `salles.final` (2 × 1,5 écrans, entrée, trois états d'**essai** : plein, resserré plus petit que l'écran, bande avec fosses), `mur` (bornes dures à la distance d'`AR`), `camera` (zone morte 200 × 120, τ 0,15 s, avance 70 px lissée à 0,3 s, visée 0, biais boss 30 %, garde-fou 180 / 140 px, mouvements réduits : zone 320 × 180, τ 0,25 s, ni avance ni biais), `vue.marges` (bandes du HUD à 1 280 × 720 : 16 / 124 / 16 / 122), `indicateurs` (catégories, couleurs de la grammaire recopiées d'`index.html`, distances 900 / 600 px, horizon 1,5 s, frôlement 60 px, retrait 24, coin 40, fusion 28, segment 120, plafond 10), `preavis` (0,6 / 0,8 s), `horsVue` (jeton 200, coup 60, apparition 200, minD 230), `tuiles` (640 × 360, ≤ 9), `transformation` (annonce 1,2 s, 120 px/s, attente 1 s, fondu 0,6 s), `budget` (+1,5 ms, 250 ms), `essai` (foule, boss d'essai, tirs).

**Les deux repères** (Q2). `W`, `H` restent la vue. Nouveaux, près d'`AR` : `AR0` (copie figée), `MONDE` (`{w, h}`, l'écran hors de l'arène), `CAM` (`x`, `y`, `on`, crochets `sol`, `sbAr`, `ff`), `ECR()`. Retouches de base, **chacune réduite à l'identité quand `CAM` est nul** (le simulateur le vérifie au bit près et le banc G image par image) :
- `render` : `offX+(sx-CAM.x)*scale`, découpe `rect(CAM.x, CAM.y, W, H)`, sol `CAM.on ? CAM.sol() : drawImage(room.canvas)`, vignette (et ses enveloppes) et voile `drainT` dans le repère de l'écran (`translate(CAM)` seulement si `CAM.on`) ;
- `updMouse` : position écran gardée (`mouse.sx`, `mouse.sy`), `mouse.x = sx + CAM.x` ; dans l'arène, recalculée à chaque pas après la caméra ;
- `ECR()` sur les lumières « plein écran » : **sept** lignes et non six (Zénith, Grande Toile ×2, cris du Brumeux ×3, Balancier) : le cadrage comptait les trois cris pour une.
- **Écart avec le cadrage** (deux crochets de plus, aussi réduits à l'identité) : `sbOrigine` passe `CAM.sbAr()` (AR ∩ vue sûre) au lieu d'`AR` quand l'arène est allumée (le Masqué est dans un bloc fermé, sans autre point d'entrée) ; la carte de distances `FF` (bloc v17.5) dimensionne sa grille par `MONDE` (mêmes tableaux hors de l'arène) et se refait sur `CAM.ff` (bornes qui bougent).
Tout le reste vit dans le bloc « v18.4 · L'arène » (enveloppes les plus extérieures) : `makeRoom` remet `AR`, `MONDE`, `CAM` avant **toute** salle (Sanctuaire, titre, essai compris) et ouvre l'arène quand on la demande ; assertion à chaque `enterRoom` hors arène (`journal().assertions`) ; apparitions (`findSpawn`, `themePos`) dans la vue + 200 px, à 230 px du joueur ; aucune règle de salle v14 (`setRule`) ; pas de jeton d'attaque hors de la vue + 200 px (`tryTok`, boss exclu) ; le joueur frappe ce qu'il voit : **tout** coup du joueur sur un ennemi au-delà de la vue + 60 px est retenu (`hitEnemy`, brûlures et poisons exclus), pas seulement les effets « de toute la salle » (règle plus simple et vérifiable ; compté dans `journal().horsVue`) ; brouillard à la taille de l'écran, lumières hors vue sautées (`drawFog` remplacé dans l'arène) ; brumes de passage, particules, nombres et ennemis ordinaires hors vue ni tracés ni coûteux ; bulles d'aide converties par `versEcran` (`arrowPos`). La bulle de la porte de némésis n'est pas convertie (pas de porte dans l'arène).

**Logique pure** (`/*arene:pur*/`, près d'`AR`) : `arCamR`, `arMonde`, `arEtat`, `arVue`, `arSure`, `versEcran`, `versMonde`, `arLimites` (bornes de la phase + leurs murs, dans le monde : bornes = `AR0` donne exactement l'écran), `arCible`, `arPas` (avance → zone morte → lissage → garde-fou → limites ; limites plus étroites que l'écran : caméra centrée, fixe ; `saut` à l'entrée), `arDistRect`, `arApproche`, `arBord`, `arIndic`, `arSignes`, `arJuge`, `arTransNouveau`, `arTransPas`, `arTransObstacles`, `arTuiles`.

**Signes de bord** (Q4) : tracés après la vignette, dans le repère de l'écran : arc qui se remplit (télégraphe), flèche (tir), crochet (saisie), anneau ivoire et œil (boss), chevron épais (élite, Masqué), trait fin avec nombre (ordinaires regroupés). **Écart** : la vue sûre des signes est **remesurée en jeu** toutes les demi-secondes (bandes `.hud-tl`, `.hud-bl`, `#hSkills`, `#hState`, bloc `.hud-tr`), car la taille du HUD suit la fenêtre, pas les unités de jeu ; un signe glisse le long de son bord hors du bloc de droite, et sur un petit écran où le HUD couvre tout le bord, il se pose juste devant le bloc. Le garde-fou de la caméra garde les marges des données. Deux signes fusionnés gardent la liste de leurs sortes (`ks`) : un boss proche d'un télégraphe se lit dans le signe du télégraphe.

**Aucun coup sans signe** : chaque pas, les sources signalées (à l'écran ou par un signe) sont notées (`arSignes`) ; chaque coup reçu dans l'arène est jugé (`arJuge`) sur sa chaîne : la source donnée, sinon le projectile qui touche (et son tireur), l'anneau qui passe (et l'ennemi qui l'a lancé, retenu à sa naissance), l'explosion (le Bouffi qui vient de mourir), l'ennemi au contact, enfin le Masqué (ses zones ne sont pas énumérées une à une : point ouvert pour l'action 5, où les zones du Brumeux le seront).

**Transformation** (Q5) : `__arene.vers(n)` : annonce (contours ivoire en pointillé, nouvelles bornes au sol), bascule (`AR` suit les bornes à 120 px/s, les créatures sont repoussées par les collisions, sans dégât ; obstacles posés quand la place est libre, ou poussant après 1 s ; `CAM.ff`), fondu du calque d'arrivée. Le boss d'essai ne lance rien pendant l'annonce et la bascule. Les obstacles et les fosses sont des piliers (`pilier18`, `fosse18`) : **une fosse arrête les tirs comme un pilier** (à revoir avec le combat).

**Sol** (Q7) : un calque **par état** (et non par sol : la brume de décor y est cuite, le fondu passe d'un calque à l'autre, rien n'est peint en combat) ; 12 tuiles de 640 × 360 par calque, seule la part visible de chaque tuile est posée (rectangle source recadré).

**Essai** (Q10) : `index.html?arene=final[&etat=n][&w=2][&h=1.5][&foule=n][&boss=1][&tirs=1][&bot=1][&dieu=1][&classe=…]` : `RUN.essai`, acte X, salle d'élite au Masqué forcé, foule répartie dans le monde (renouvelée), boss d'essai (fantôme hors d'`enemies` : disque sur toi, couloir vers toi, pluie autour de lui, 1,2 s de charge), tirs depuis le hors-champ, pilote (coins de l'arène, sort des zones, vise le plus proche), `dieu` ; `arene` est dans `ESSAI18` et `ESSAI_URL`. Allumage (action 5) : `actif:true` ouvre l'arène dans la salle `final` (vérifié en banc avec `__arene.activer(true)`). Console : `__arene` (`etat`, `cam`, `vers`, `indic`, `journal`, `mesure`, `activer`, `essai`, `dbg`).

**Wiki** (Q9) : rien hors du journal ; la ligne v18.4 ne dit ni phase, ni invention, ni nom d'état (vérifié).

**Vérification.** `sim-arene` : **125 vérifications, 0 échec** (identité au bit près sur 10 000 pas ; 10 000 trajets, 1,2 million de pas : garde-fou et limites, sans dépassement sur 2 000 arrêts, rejouable, avance ≤ 70 px et nulle en mouvements réduits ; 4 000 tirages de signes ; préavis : 1 500 scénarios ; 400 transformations ; 40 000 vues pour les tuiles ; branchements ; ΔE minimal entre couleurs de signes 30,5). Contre-épreuves : garde-fou retiré, obstacle posé sans attendre, fusion retirée, coins non évités : chacune attrapée.

**Banc** `_dev/bancs/banc-arene.mjs` : **129 vérifications, 0 échec** (passe finale). A caméra : centre, quatre coins, ruée, boss loin, marche ; bornes de l'état 1 plus petites que l'écran : caméra fixe ; salle suivante : `AR = AR0`, monde = écran, `CAM` nul, aucune assertion ; éteinte, le boss final reste d'un écran ; allumée à la main, il ouvre l'arène (2 560 × 1 080, porte `final`), pas le miniboss. B signes : télégraphe, tir, boss, élite, ordinaires vus au bord, au plus 10, tous dans la vue sûre et hors des blocs du HUD. C coût (arène pleine : 20 ennemis dont 10 hors de vue, 30 lumières, boss d'essai et ses zones, 10 signes ; contre la salle du boss final provisoire au même contenu ; mesures appariées et alternées, médiane) : **+0,7 à +2,6 ms selon la charge de la machine** sur les passes faites, la série retenue passe à +1,0 puis +1,5 ms (≤ +1,5) ; tuiles 9 posées sur 12 ; peinture à l'entrée 49 à 103 ms pour 36 tuiles (≤ 250). Les premières mesures donnaient +2,5 ms : la brume de décor cuite dans les calques, les tuiles recadrées sur la vue et les brumes de passage hors vue non tracées ont ramené l'écart. D mouvements réduits : aucune avance, la zone morte 320 × 180 tient ; tailles d'écran 640 × 360 (HUD remesuré : haut 184, bas 216, le bloc de droite couvre tout le bord : signes posés devant lui), 1 280 × 720, 2 560 × 1 440, portrait 390 × 844 : aucun signe sous le HUD, aucun coup sans signe. À 640 × 360, le HUD couvre déjà presque tout l'écran dans n'importe quelle salle : ce n'est pas propre à l'arène. E souris : la visée suit le point sous le curseur après un glissement de caméra horizontal et vertical, regard du héros à 0,000 rad. F journal des coups, 3 combats conduits de 70 s (Lumenarque, Gouffre, Tisse-Destin ; foule de 20, boss d'essai, tirs, trois transformations chacun) : **31, 31 et 53 coups reçus, 0 sans signe**, 0 coup du joueur retenu hors vue. Une passe précédente avait trouvé un coup sans signe (Tisse-Destin, un Rampant né à côté du pilote, signalé depuis 0,32 s) : le cercle d'apparition (violet, ~1 s) n'était pas compté comme le signe de l'ennemi qui en naît ; il l'est désormais (l'ennemi hérite du début de signe de son cercle). G règle d'or : `index.html` d'avant (`9e92de2`) et d'après, copie instrumentée, graine, horloge à la main, polices chargées, 180 images par salle, 19 salles (titre, Sanctuaire, combat, élite, Brèche, halte, autel, colporteur, gardiens I à III, combats II à IV, élite III, gardien provisoire IV, deux miniboss, boss final provisoire) dans les trois paliers (Lumenarque en Normal, Gouffre en Difficile, Tisse-Destin en Extrême) : **10 260 images comparées, 0 différente**. Contre-épreuve : une copie dont la découpe perd une ligne de pixels est attrapée dans toutes les salles (57 échecs sur 57).

**Annexe : `banc-paliers` E en comptage direct** (Q12) : 800 salles de combat à l'acte IV par palier (salle `premiereSalle`, réserve garnie de quatre talents à arme de la Brume) : Normal 48,8 %, Difficile 70,4 %, Extrême 70,4 % de Masqués, pour 48,8 / 68,3 / 68,3 % attendus (chance × part d'éligibles mesurée en Normal, bornée à 1 : 98 %), tolérance de 4 écarts-types (compte et part) ; porteurs de souvenir par acte 2 / 3 / 3, jamais au-delà de `parActe`. La part d'éligibles est bornée à 1 depuis qu'une passe l'avait mesurée à 107 % (53,6 % de Masqués en Normal pour 50 % : 2 écarts-types). Les dégâts par minute, les temps de plus et les soins restent dans E comme mesure indicative. `banc-paliers` complet : 71 vérifications, 0 échec ; E seule, refaite : 26, 0 échec.

**Régression (v18.4)** : simulateurs `sim-brume` 46 602, `sim-dernier` 4 021, `sim-masque` 3 583 218 contrôles, `sim-nemesis` 46 129, `sim-descente` 40 772, `sim-arene` 125 : 0 échec (`sim-nemesis` et `sim-descente` lisaient les deux gardes d'essai : `arene` y est ajouté). Bancs : `paliers` 71, `mutations` 61, `descente` 117, `effets` 740, `touche` 34, `essai` 43, `relecture` 12, `glas-relecture` 16, `nemesis` 99, `essai-nemesis` 15, `nemesis-revue` 17, `nemesis-complet` 46, `complet` 228 : 0 échec ; `banc-dernier` : les 4 échecs anciens (§ 31). `banc-gardiens-final`, seul : 222 / 223, l'échec est encore la mesure de coût du Glas ×2 (« parties en place » +1,83 ms, puis +1,39 ms rejouée seule, pour ≤ 1) : elle compare l'ancien et le nouveau dessin du gardien dans le **même** `index.html`, où rien de l'arène ne joue (`CAM` éteint) ; rejouée sur le commit d'avant (`9e92de2`, servi à part), la même section échoue de la même façon (+1,91 ms) : c'est la fragilité déjà notée aux § 31 bis et § 33 (le coût des vaisseaux du Cœur passe de 3,2 à 4,2–4,4 ms entre l'ancien et le nouveau dessin sur cette machine chargée), indépendante de ce chantier ; à recaler (seuil ou mesure) lors d'une prochaine relecture des gardiens.

**Points ouverts** : (1) coût de l'arène au ras du budget sur la machine du banc (+0,7 à +2,6 ms selon la charge) : à remesurer sur une vraie partie (le jeu ne relève pas encore la durée de ses images : l'ajouter aux statistiques de l'acte X à l'action 5, moyenne et pire 5 %) ; (2) les zones du Masqué et des armes de la Brume ne sont pas des sources de signe une à une (leurs coups sont rattachés au Masqué) : à faire pour les zones du Brumeux à l'action 5 ; (3) une fosse arrête les tirs comme un pilier ; (4) le boss d'essai a un glyphe d'essai (un œil) : le vrai glyphe et la légende des signes (wiki, Q9) viennent à l'action 5 ; (5) le panoramique sonore des télégraphes hors champ (Q4, option) n'est pas fait ; (6) règle « le joueur frappe ce qu'il voit » appliquée à tous ses coups (sauf brûlures et poisons) : 0 coup retenu dans les combats d'essai, à revoir avec le kit complet contre le Brumeux (rebonds, ciblage automatique).

## 35. Le Brumeux (v18.5), action 5a : le socle technique du boss final (1er novembre 2026)

Cadrage : `_dev/cadrages/la-brume-v18-5-brumeux-cadrage.md` (et `claude/la-brume-v18-5-brumeux-cadrage.md` dans le projet), Q1–Q17, **validé le 1er novembre 2026, toutes les recommandations**. L'action 5a prend le périmètre technique (Q2, Q8, Q9 règles techniques, Q10 présence de base, Q11, Q13 sauvegarde et statistiques, Q14, Q15 points 1, 2 et 4) : **aucune des cinq phases n'est écrite** (5b à 5f), le moteur joue des **gestes d'essai** aux formes connues. Règle d'or : l'arène reste **éteinte** (`arene.js`, `actif:false`), le boss final provisoire (Masqué ×3) tient sa place en jeu ; seul `?brumeux=` ouvre le Brumeux.

**Données** (`data/brumeux.js`, nouveau) : `phases` (cinq : id de travail jamais affiché, présence `haut` I–III / `sol` IV–V, point faible `mains` / `croix` / `coeur`, état d'arène d'essai 0 / 0 / 0 / 1 / 2 de `arene.js`, part improvisée indicative, **PV placeholders 2 400 par phase**, V `exclut:['construction']`), `transition` (3 s, cri, relecture), `partition` (entracte 1,6 s, à nu 2,2 s, une partition d'ESSAI commune : disque · libre · feinte · libre · couloir · libre), `elements` (disque, couloir, pluie, anneau, tir, rafale, construction, feinte : menace, sorte, forme, charge ≥ 0,8 s, dégâts, `pond` {axe, sens}, `sources`), `cumul` (zone 1, saisie 1, tir 2, construction 1), `budget` (base 4 / 5 / 6 / 6 / 7, ×1 / ×1,25 / ×1,5 par palier), `paliers` (constructions 5 / 6 / 6, Masqués 2 / 2 / 3, phase V courte / courte / entière), `phaseV.courte.pv` 0,5, `lecture` (plancher 0,4, pente 1,2 ; verdict « a porté » ×(1 + 0,6 × score), abandonnée ×0,5 ; dégâts reçus ×(1 + 0,8 × part) ; ce qui t'a tué en premier), `preavis` (boss 0,8 = `arene.js`, première rencontre +0,3), `sortie` (4 variantes, pas 6 px), `constructions` (connexité 0,85, aire 0,3, grille 20 / 15 de `FF`, annonce 1,5 s), `couleurs` (craie 160,185,150 ; yeux, fils, croix, capuche, manteau : toutes à ΔE ≥ 30,1 de la grammaire, ivoire compris), `sauvegarde` v:1, `stats`, `dessin` (version 1, rayons 30 / 48, mains à 200 px sous le haut, `suit` 0,6, glyphe SVG 24 × 24 : croix de manipulation et œil), `bot`, `essai`.

**Logique pure** (bloc `/*brx:pur*/`, dans le bloc « v18.5 · Le Brumeux » ; `desRng` du bloc `/*des:pur*/` fournit la graine) : `brxPalier`, `brxPv` (phase V courte hors Extrême), `brxSeuils` (bornes basses des phases : en Normal 0,778 / 0,556 / 0,333 / 0,111, la phase V courte donnant des segments inégaux), `brxPhase`, `brxLire` (S → poids par élément, premier), `brxBudget`, `brxTirer` (premier = ce qui t'a tué s'il tient ; puis tirage au poids tant que budget et non-cumul le permettent, ce qui est déjà en jeu compris ; feinte jamais tirée ; `exclut` de la phase), `brxMesures`, `brxBoucle`, `brxPreavis`, `brxSeg`, `brxDans` (mêmes marges que `sbDans` : 0,5 × rayon), `brxSortie` (point libre atteint en ligne droite à ta vitesse avant `charge − réflexe`, piliers contournés ; anneaux de 6 px, ≥ 24 points par anneau), `brxPlacer`, `brxGrille` (la grille de `FF` : pas 20, marge 15, bornes et piliers), `brxConnexe` (inondation 8-connexe, diagonales coupées comme `FF`), `brxPoser` (plafond du palier, jamais sur toi, aire ≤ 30 %, ≥ 85 % reliés), `brxNeuf` / `brxLireSauve` / `brxEcrireSauve` / `brxNoter` (`SAVE.brumeux` v:1 : tentatives, victoires, phase atteinte, l'élément qui t'a tué par phase, éléments vus ; version future → null ; essai → rien), `brxPire`.

**Jeu** (bloc « v18.5 · Le Brumeux », enveloppes les plus extérieures) : le Brumeux est un **ennemi `boss`** (`createEnemy('boss')` puis `e.brx18`) : il hérite gratuitement de la barre de vie, de l'Accoutumance (`e.adapt`, fenêtre à nu), des bonus contre un gardien, du plafond du Dernier Souvenir (`fortE`), du biais de caméra et du signe de bord de l'arène. **Retouche de base** : le seuil de phase de `hitEnemy` (v11, 0,66 / 0,33) lit `e.seuils18` quand il existe (ses quatre seuils) et reste exactement l'ancien sinon (le simulateur le lit). Enveloppes : `updateBoss` (sa partition, jamais l'IA du Glas, que `RUN.act === 3` aurait appelée), `hitEnemy` (changement de phase au seuil), `bossDefeated` (sa mort, pas la scène `SC27` du Glas), `drawEnemyBody` / `drawEnemyPost` (mains, croix et fils en haut de l'arène, corps deviné dans la brume au bord du monde en I–III ; corps entier au sol en IV–V ; anneau ivoire `G27.anneau` sur ses mains / sa croix / son cœur, seulement à nu), `drawTelegraphs` (zones orange, charge de tir violette, annonce de construction en craie, regard de lecture, scène de mort), `computeLights` (sa lumière dans sa matière, `TINT.brume18`, sans battement), `g27GlypheHud` (son glyphe sur la barre, à la place de celui de l'acte), `endBluff` (le coup de la feinte jugé sur son cercle), `hurtPlayer` (`RUN.par18` : dégâts reçus par source dans la descente ; coups par phase ; `X.tue`), `step` (bot, mort du joueur notée, regard, scène), `render` (durée des images à l'acte X), `makeRoom` (tout rendu à la salle suivante). **Partition en jeu** : entracte → mesure (fixe : un geste ; libre : les éléments tirés) → … → à nu (`e.vuln`) après la boucle → boucle neuve (nouveaux tirages). Une zone n'est lancée que si `brxPlacer` lui trouve une sortie (sinon elle **saute**, compté) ; chaque zone (et la feinte) est une **source de signe à part entière** de l'arène (`A.sourcesPlus`), jugée au préavis du boss (0,8 s ; la feinte à 0,6 s, règle v14 inchangée). Transition (`vers(n)`) : zones et feinte effacées, verrou `e.lockT` (1,2 s à 15 %, celui des gardiens), cri (`__brumeAction`), état d'arène de la phase (`__arene.vers`), présence (haut → sol : téléportation au centre, jamais sur toi), relecture et boucle neuve une fois l'arène transformée ; jamais une pause. En V, les constructions sont effacées et plus rien n'est bâti. Mort : salle vidée tout de suite, scène de 1,6 s (la croix tombe, les fils se coupent ; au sol, le manteau s'étale), `SAVE.brumeux` notée (hors essai).

**Crochets ajoutés à l'arène** (bloc v18.4, éteint en jeu) : `A.sourcesPlus` (sources de signe de plus), `A.bossCam` (biais de caméra vers le Brumeux), `A.glypheBoss` (son glyphe dans le signe de bord, à la place de l'œil d'essai : point ouvert (4) du § 34 réglé), `A.bossCharge` (pulsation du signe), `A.zoneCourante.boss` (une zone de boss se juge à 0,8 s) ; `__arene.crochets()`, `__arene.coup(z, fn)`.

**Constructions, comme système** (Q9, règles techniques) : annonce en craie (pointillé, 1,5 s), puis pose quand la place est libre, sinon attente (`attenteMax` de l'arène, 1 s) puis **poussée sans dégât** ; posées comme piliers de l'arène (`pilier18`, `brx18`), donc dessinées par le sol de l'arène et bloquantes pour `FF` (`CAM.ff = 1`) ; refusées par `brxPoser`. Leur destruction, leurs fissures et leur aspect par acte (Q9 règles 4, 6, 7) viennent avec la phase II (5c).

**Bot qui frappe** (`bot=2`) : sort des zones à sa sortie calculée (esquive s'il est pris de court), garde la distance de sa forme (Lumenarque 260, Gouffre 80, Héraut 75, Tisse-Destin 240), vise le Brumeux (ou l'ennemi le plus proche à moins de 220 px), tient l'attaque de base (le Héraut frappe au battement, le Tisse-Destin noue ses fils au clic droit), joue R puis A et E dès que prêts. Il servira à mesurer l'action 6.

**Statistiques** : `RUN.par18` ; `statRun` reçoit `images` (acte X : moyenne et pire 5 % de la durée de `render`, intervalle entre deux images, échantillon réservoir de 4 000 sans `Math.random`) et `brumeux` (temps et coups reçus par phase, palier, graine, lancers, sautes, constructions, fin, élément mortel).

**Essai** : `index.html?brumeux=<phase 1..5>[&palier=…][&graine=n][&reserve=id,id][&bot=2][&classe=…][&dieu=0]` (`brumeux` dans `ESSAI18` et `ESSAI_URL` ; les simulateurs `sim-arene`, `sim-descente`, `sim-nemesis` lisent les deux gardes) ; console `__brumeux` (`essai`, `vers`, `lire`, `etat`, `sauve`, `noter`, `lancer`, `poser(x, y, r, {annonce})`, `images`, `statsRun`, `dbg`).

**Écarts avec le cadrage et le prompt.** (1) `data/arene.js` ne reçoit pas encore « cinq états réels » : les phases pointent les trois états d'essai (I–III : plein ; IV : resserré ; V : bande à fosses), les états réels viennent avec chaque fiche 5b–5f (et `banc-arene` A et C comptent sur ces trois états). (2) La phase V a un `exclut` (pas de construction) que le cadrage ne nommait pas : « l'arène se défait ». (3) Ses mains descendent vers toi de 60 % de ce qui vous sépare (lissé) : à hauteur fixe, elles passaient sous le bandeau du HUD dès que tu te battais au milieu de l'arène. (4) Le préavis d'un verdict pèse même quand l'axe du profil est inconnu (le verdict est un signal en soi). (5) Le glyphe ne va pas encore sur la porte `final` (règle d'or : la porte se voit en jeu ; à l'allumage, 5g).

**Vérification.** `sim-brumeux` : **243 vérifications, 0 échec** (données ; PV, seuils et phase par palier ; lecture ; 10 000 tirages à graine : déterminisme, budget, non-cumul, feinte jamais tirée, premier en tête, couverture, biais ; préavis ; **10 000 combats abstraits** : chaque sortie rendue est libre, hors des piliers et atteinte à temps, aucun point libre n'existe quand il n'y en a pas, hors 17 poches plus étroites que le pas de recherche (côté sûr : la zone saute) ; **10 000 constructions** : 7 705 posées, 1 886 refusées au plafond, 408 sur le joueur, 1 pour la connexité, un mur percé d'un seul passage ne se ferme pas ; sauvegarde ; branchements). Contre-épreuves : seuils inversés, trois couloirs au-dessus du budget, sortie sans réflexe (des sorties trop lointaines seraient acceptées), passage fermé compté ouvert, sauvegarde d'essai écrite : attrapées. `banc-brumeux` (A à H) : voir la ligne de résultats ci-dessous.

**Banc** `_dev/bancs/banc-brumeux.mjs` : **94 vérifications, 0 échec** (A à H ; G rejouée seule après un faux pas, voir ci-dessous). A : les poids en jeu égalent `brxLire` sur les mêmes entrées (profil portée 0,9 et Traque qui a porté : couloir 3,36, disque 0,26 après deux Pétards déjoués ; l'anneau qui t'a tué en premier) ; mesures libres sous le budget 4 et le non-cumul ; même graine 777 → même boucle et mêmes zones. B : gestes dans l'ordre de la partition (disque → feinte → couloir…), à nu 2,2 s après la boucle ; le seuil de la phase I ne se traverse pas (PV à l'instant du passage = seuil − 1), verrou 1,20 s ; transition IV (au sol, r 48, arène à l'état 1), construction posée en IV, V (état 2, constructions effacées, relue) ; jamais de pause ; mort (scène, salle vidée, barre rendue, **rien d'écrit dans `SAVE.brumeux` en essai**). C : quatre combats conduits (Lumenarque Normal, Gouffre Difficile, Héraut Extrême, Tisse-Destin Normal) : 19 / 18 / 7 / 17 coups reçus, **0 sans signe**, 0 zone sautée, phase 5 / 5 / 5 / 3 en 170 s. D : jamais sur toi, annonce en craie puis pose (pilier de l'arène), attente puis poussée sans dégât (à 49 px ≥ 47, PV intacts), plafond de Normal (5 : ok ok ok plafond plafond plafond), fermer le seul passage refusé (56 % reliés), la même ailleurs posée ; coût de cinq constructions **+0,0 à +0,5 ms** par image (≤ +1,5). E : PV par phase 2 400 ×4 + 1 200 en Normal et Difficile, 2 400 ×5 en Extrême (10 800 / 10 800 / 12 000, jamais de PV en plus), menace maximale tirée 4 / 5 / 6, constructions 5 / 6 / 6. F (bot qui frappe, PV placeholders, niveau 1, kit de base) : Lumenarque **126 s** (33 / 29 / 29 / 26 / 9), Gouffre **108 s**, Héraut **≈ 40 s** (14 / 9 / 9 / 5 / 0 : il bat le socle au battement), Tisse-Destin **294 s** (62 / 60 / 70 / 77 / 25) ; aucun coup sans signe ; durée des images relevée (moyenne 9,8 à 12,3 ms, pire 5 % 180 à 214 ms : celle d'un Chromium sans écran qui rend à la demande, pas une mesure de jeu). G : `banc-arene` G contre `4aa788c`, trois paliers : **10 260 images comparées, 0 différente** (rejouée seule : la passe faite pendant `sim-masque` avait trouvé 360 images différentes sur le Sanctuaire et le colporteur en Normal, les deux salles qui écrivent des noms au canevas : les polices n'étaient pas prêtes au même instant dans les deux copies ; à rejouer seule avant de conclure, comme les mesures de coût). H : mouvements réduits (les mains descendent vers toi sans changer de sens, rien ne flotte) ; 640 × 360, 2 560 × 1 440, 390 × 844 : aucun coup sans signe, barre de vie visible. Captures relues : phase I (mains, croix et fils sous le bandeau, corps deviné au bord), phase V (corps au sol dans la bande à fosses, regard de lecture), mort, constructions (annonce en craie, piliers posés), mouvements réduits, 640 × 360.

**Mesures à retenir pour 5g** : avec 2 400 PV par phase, les durées vont de 40 s (Héraut) à 294 s (Tisse-Destin) pour le kit de base au niveau 1 : la cible de 50 à 70 s par phase demandera des PV par forme ou un build de référence de l'acte X (Q11), et un bot moins inégal (le Héraut touche au battement à 1,4 ×, le Tisse-Destin dépend de ses fils). Les constructions coûtent moins de 0,5 ms par image ; le Brumeux lui-même (mains, croix, fils, corps deviné, zones) n'a pas été mesuré contre le boss d'essai : à faire avec la phase I.

**Régression (v18.5)** : simulateurs `sim-brume` 46 602, `sim-dernier` 4 021, `sim-masque` 3 583 218 contrôles, `sim-nemesis` 46 129, `sim-descente` 40 772, `sim-arene` 125, `sim-brumeux` 243 : 0 échec (`sim-arene`, `sim-descente` et `sim-nemesis` lisent les gardes d'essai avec `brumeux` ; `sim-arene` accepte une version actuelle ≥ v18.4). Bancs : `effets` 740, `touche` 34, `essai` 43, `complet` 228 (une première passe avait 2 échecs sur l'oubli par Tab, un écran resté ouvert pendant que la machine était chargée ; rejoué seul : 0), `relecture` 12, `glas-relecture` 16, `nemesis` 99, `essai-nemesis` 15, `nemesis-complet` 46, `nemesis-revue` 17, `descente` 117, `paliers` 71, `mutations` 61, `arene` A–F 69 puis G seule contre `9e92de2` (10 260 images, 0 différente ; le clone peu profond du banc n'avait pas ce commit à la première passe), `brumeux` 94 : 0 échec ; `banc-dernier` : les 4 échecs anciens (§ 31). `banc-gardiens-final`, seul : 223 / 223 moins 2 : la mesure de coût du Glas ×2 (« parties en place » +1,49 ms pour ≤ 1, image entière −1,3 ms) et le corps plein du Héraut en pose « charge » à 1,153 × r (≤ 1,15) : les deux fragilités déjà notées aux § 31 bis, § 33 et § 34 (bruit de mesure, seuil au ras), rien de ce chantier ne dessine dans la salle d'un gardien (la règle d'or image par image le prouve).

**Points ouverts** : (1) PV des phases en placeholders, durées très inégales entre formes (voir les mesures) ; (2) le coût de rendu du Brumeux lui-même contre le boss d'essai, à mesurer avec la phase I ; (3) les cinq états réels d'`arene.js` viennent avec les fiches (les trois états d'essai servent en attendant ; `banc-arene` A et C comptent sur eux) ; (4) le glyphe sur la porte `final`, la carte du wiki et la légende des signes de bord : à l'allumage (5g) ; (5) la durée des images en vraie partie reste à lire sur des parties exportées ; (6) la règle « une fosse arrête les tirs » (Q9.3) n'est pas encore changée (5c) ; (7) la phrase de la fenêtre de lecture (regard, rire) se voit mais son rire est celui des contre-mesures (`__rire`) : à distinguer si l'auteur le souhaite.

## 36. Le Brumeux (v18.6), action 5b : la phase I, « le Rappel » (2 novembre 2026)

Fiche : `_dev/cadrages/la-brume-v18-5b-rappel-fiche.md` (et `claude/la-brume-v18-5b-rappel-fiche.md` dans le projet), **validée le 2 novembre 2026, toutes les recommandations, écarts compris** ; cadrage Q3, Q8, Q10, Q11, Q13, Q14. Règle d'or : l'arène reste **éteinte** (`arene.js`, `actif:false`), le boss final provisoire tient sa place ; seul `?brumeux=1` ouvre la phase I (les phases II à V jouent encore la partition d'essai de 5a).

**Données** (`data/brumeux.js`) : gestes signature `fils` (rayons : 5 couloirs de 30 px en éventail de 70°, longueur 1 000, de ses mains vers toi, 1,0 s, 14), `cadre` (anneau 70 → 250 autour de toi, brèche de 110 px du côté opposé à ses mains, 1,2 s, 12), `toile` (damier 5 × 5 de 90 px centré sur toi, noires à 1,0 s puis blanches 0,9 s après, 10 par moitié), `tableau` (l'élément noté quand un tableau t'a tué) ; tous **`fixe:true`**, comme la `feinte` (`brxTirer` écarte les éléments fixes : jamais tirés). `partition.rappel` : un objet `{entracteS:1.4, nuS:0, mesures}` (tableau · Fils · libre · tableau · feinte · Cadre · tableau · libre · Toile ; une partition sous forme de tableau reste lue comme en 5a). `phases[0]` : `arene:3`, `exclut:['construction']`. `tableaux` : accroche 1,2 s, fondu 0,8 s, vie ≤ 30 s, rideau 0,6 s, à nu 3 s, feinte après 8 s, retrait 30 px, places à 230 px, apparition 0,85–1,3 s, chute des mains 140 px, cadre (marge 12, trait 6) ; `decors` par registre d'acte (Faubourgs : acte 1, Meute / Tir croisé / Pétards ; Cryptes : acte 2, plus Chœur ; Cœur : actes 3 à 10, les six) ; `regles` confinées (Sol : dalles de 66 px annoncées 1,3 s, ouvertes 2,4 s, 10 pour toi, 20 pour les ennemis, au plus 3 ; Braseros : deux, 190 px, 40 % ; Verre : ×1,4) ; `exclues:['brume']` ; budget 4 / 5 / 6, coûts (vague 2, règle 1, densité 1 au plus deux fois, champion 1), densité +25 % ; lecture (1 + 0,8 × part, plancher 0,05, « aucune règle » 1). `dessin.version` 2. `data/arene.js` : l'état réel `rappel` **ajouté en index 3** (arène pleine, sol pierre, quatre montants r 26 aux frontières des tiers, pas de fosse, brume de décor en haut) ; les états d'essai 0 à 2 restent à leurs places.

**Logique pure** (`/*brx:pur*/`) : `brxPartition` (mesures, entracte, fenêtre à nu de la phase) ; `brxDans` gagne la **brèche** de l'anneau (un couloir de largeur `l` du centre vers l'extérieur ; à l'abri à pr/2 de ses bords) et la forme **`case`** ; `brxFils`, `brxCadre`, `brxToile`, `brxSortieToile` (deux coups : une sortie des noires avant la charge, puis, d'où l'on en sort, une sortie des blanches avant 0,9 s) ; `brxTiers` (trois colonnes, fragment = tiers moins 30 px), `brxTiersLoin` (le plus loin de toi parmi ceux qui n'ont pas servi), `brxDansRect`, `brxPlaces` (dans le fragment, à 230 px de toi, sinon la plus loin trouvée), `brxDalle` (entière dans le fragment) ; `brxDecors`, `brxTabOk`, `brxPoidsTab` (décor ← `parA`, thème ← `par` des types que le thème demande, règle ← `parR` en part de tous les dégâts reçus), `brxPick`, `brxTableau` (décor hors de ceux déjà pendus dans la boucle tant qu'il en reste, thème permis, règle ou aucune, puis densité et champion jusqu'au budget ; `o.premier` rejoué tel quel s'il est encore possible) ; `brxBoucle(…, o)` tire ses tableaux et rejoue le tableau qui t'a tué au premier tableau de la première boucle de la phase (`o.premiere`) ; `brxLire` rend aussi `tab` (seulement si l'élément mortel de la phase est `tableau`), `par`, `parA`, `parR`, `acte`, `themes` ; un élément fixe n'est jamais `premier` (mort par un geste signature : préavis normal, il est au socle). Sauvegarde : `SAVE.brumeux` **reste v:1** ; `tab:{phase:{decor, theme, regle}}` facultatif, gardé seulement là où `mort[phase]` vaut `tableau` et validé par `brxTabOk` (thème permis, Brume exclue) ; `brxNoter` l'écrit quand `par` vaut `tableau` et l'efface quand une autre mort le remplace ; `brxEcrireSauve` ne l'écrit que s'il n'est pas vide.

**Jeu** (section « v18.6 · Phase I » du bloc v18.5 ; enveloppes les plus extérieures) :
- **Partition** : `mesure()` lit la partition de la phase (`brxPartition` : entracte 1,4 s, pas de fenêtre à nu après la boucle en phase I) ; une mesure `tableau` **accroche** un tableau (`X.ph='tableau'`, `tabPas`) ; `boucleNeuve` passe `{premiere: !X.nb++}` et remet les tiers servis à zéro ; `vers()` rentre un tableau en cours (`tabFin`) et remet `X.nb` à zéro.
- **Tableau** : accroche (1,2 s ; fils qui descendent de ses mains aux coins hauts du cadre, fondu du fragment) → vie (vague convoquée : `WTHEMES[thème].build(budget() × (1 + 0,25 × densité))`, types et rôles seulement — clé, garde, chœur, siège —, un champion parmi les non-clés, places tirées par `brxPlaces`, cercles violets ; la règle naît) → vidé : rideau (0,6 s, le drapé tombe) → à nu 3 s (`e.vuln`, anneau ivoire `G27.anneau` sur ses mains, qui retombent vers toi et s'ouvrent) ; non vidé à 30 s : ses ennemis **rentrent** (ils disparaissent sans butin, **avec leurs tirs en vol et leurs ondes**) et le rideau tombe sans fenêtre. Pendant un tableau il ne lance qu'**une feinte**, une fois, après 8 s de vie. Ses mains restent frappables (sans la fenêtre).
- **Calques cuits à l'entrée** (`cuire()`, appelé par `debut` quand la phase a des tableaux) : un sol par décor, **opaque** (`alpha:false`) et à la taille exacte du fragment, peint par les peintres de `renderFloor` (`floorCobbles`, `floorSlabs`, `floorHex`, puis `floorDecor` d'une salle de type `tableau`, sans le cercle des salles de combat) avec `AR` et `Math.random` **prêtés** le temps de la peinture (graine du combat ; rendus dans un `finally`) ; le cadre (matière `croix`, fil intérieur `fils`, nœuds aux coins) et le drapé (`manteau`, plis, ourlet), un calque chacun. Rien n'est peint en combat.
- **Dessin** : le fragment au sol (`CAM.sol` enveloppé, sous la brume) ; le cadre (ses quatre bandes seulement), les braseros, les dalles et le drapé par-dessus la brume, comme les télégraphes ; la croix penche vers le tiers occupé (`X.pench`) ; la Toile : les cases blanches restent en pointillé, sans remplissage, tant que les noires n'ont pas frappé ; la brèche du Cadre est retirée de l'anneau par une découpe pair-impair. **Mouvements réduits** : le rideau est un fondu (le drapé paraît en entier et s'efface), ses mains ne tombent pas, les fils ne descendent pas à l'accroche, les braseros et les dalles ne pulsent pas.
- **Règles confinées**, sans `setRule`, sans bulle ni étiquette : Sol (`dallesPas` : la dalle vise toi si tu es dans le fragment, sinon un ennemi du fragment ; posée seulement si `brxPlacer` trouve une sortie, sinon comptée sautée ; chaque dalle est une source de signe de l'arène et son coup est jugé sur elle, au préavis du boss) ; Braseros (deux dans le fragment, leur lumière dans `computeLights`) ; Verre (enveloppes `hurtPlayer` et `hitEnemy`).
- **`hurtPlayer`** (enveloppe extérieure) : Verre (+40 % reçus quand tu es dans le fragment) ; `RUN.par18A[acte]` et `RUN.par18R[règle de la salle]` (écrits seulement, rien d'autre ne les lit) ; « ce qui t'a tué » vaut `tableau` (et `X.tueTab`) quand le coup vient d'une dalle ou d'un ennemi pendant un tableau (ni une zone du Brumeux, ni sa feinte, ni ses tirs). **`hitEnemy`** : Verre (×1,4 dans le fragment), Braseros (×0,4 pour un ennemi hors de leur lumière). **`endBluff`** : marque le coup de la feinte et **remet `room.blT` à l'infini** (le minuteur de la feinte de la salle se réarmait à 8–13 s et, des ennemis de tableau présents, la salle aurait relancé des feintes d'elle-même) ; `debut` le pose aussi.
- **Gestes** : `lancer` place les Fils et le Cadre par `variantes` (les Fils tournent de 0,15 rad par variante, la brèche du Cadre de 0,6 rad) et la Toile par `toile()` (décalage d'une demi-case par variante, les deux coups vérifiés) ; un geste ne frappe qu'une fois (`grp` : deux fils qui se croisent sous toi, une case à cheval) ; une zone sans sortie saute (comptée).
- **Bot** (`bot=2`) : il évite aussi les dalles et cherche sa sortie contre les zones qui frappent les premières (la Toile a deux coups).
- **Coût** : chaque image posée est recadrée sur la vue (`poseVue`) et, sans mise à l'échelle, calée sur un pixel entier (la caméra a des positions fractionnaires : une image posée entre deux pixels se filtre, ce qui coûtait en rendu logiciel autant qu'un second sol : 1,4 à 1,8 ms mesurés en alternant image par image) ; sous un fragment plein, l'arène ne pose pas son sol (crochet `A.solTrou` dans `solCalque`, ajouté au bloc v18.4 et inerte sans le Brumeux : il serait couvert) ; le **corps deviné** du Brumeux (5a le peignait à chaque image, dégradé radial compris) est cuit une fois (`corpsImg`).
- Console : `__brumeux.etat()` montre le tableau (`tab`), les tiers servis, `chute`, `ouvre`, `pench` ; la boucle s'écrit `{décor/thème/règle}` ; `statsRun` reçoit `tableaux`, `vides`, `rentres`, `dallesSautees` ; `dbg()` expose les fonctions pures de la phase I, `hurt`, `hit`, `cuire`, `fragAlpha`.

**Écarts** (validés avec la fiche) : (1) Brume plombée exclue des fragments ; (2) deux compteurs nouveaux, `RUN.par18A` et `RUN.par18R` ; (3) `SAVE.brumeux` reste v:1, champ facultatif `tab` ; (4) l'état réel de la phase I est ajouté en index 3 ; (5) la fenêtre à nu suit chaque tableau vidé. **Écarts de l'implémentation** (validés avec la fiche 5c, le 2 novembre 2026) : (6) ce qu'un tableau reprend (« ses ennemis rentrent ») comprend leurs tirs en vol et leurs ondes : sinon un tir lancé juste avant la transition frappait au nom d'un ennemi parti (1 coup sans signe trouvé au Gouffre par I-D, 0,43 s de signe) ; (7) la salle ne relance plus de feinte d'elle-même pendant le combat du Brumeux (`room.blT`) ; (8) la Toile montre sa seconde moitié en pointillé tant que la première n'a pas frappé (lisibilité ; la fiche disait « cases noires puis cases blanches ») ; (9) un geste ne frappe qu'une fois ; (10) coût : les sols des fragments sont opaques et sans marge, le cadre se pose par bandes, les images sont calées au pixel, l'arène ne pose pas son sol sous un fragment plein (crochet `solTrou`, une retouche du bloc v18.4, inerte hors du combat du Brumeux), le corps deviné de 5a est cuit ; (11) dans le combat du Brumeux, toute naissance en plein combat a au moins le cercle d'une apparition (0,85 s) : la Nourrice d'un Siège pond ses Rampants à 42 px d'elle avec un cercle de 0,5 s, sous le préavis de l'arène (0,6 s) ; au contact de la Nourrice, un Rampant né contre toi frappait avec 0,52 s de signe (2 coups sans signe trouvés par C au Lumenarque, reproduits par un diagnostic qui relevait, image par image, la vue et le signe de chaque ennemi ; un coup sans signe vu une fois par H à 390 × 844, non reproduit en cinq passes, avait très probablement la même cause) ; l'arène d'essai de v18.4 écartait la Nourrice de sa foule, d'où ce cas jamais vu ; (12) le Verre n'a pas de dessin en descente (seulement l'étiquette, interdite ici) : un fragment au Verre ne se distingue pas encore à l'œil (point ouvert).

**Vérification.** `sim-brumeux` : **359 vérifications, 0 échec** (5a : 243 ; 5b ajoute la section 10 et les branchements) : données (partition, gestes fixes et leurs chiffres, tableaux, règles et leurs chiffres égaux à ceux de la descente, thèmes de chaque décor recalculés depuis le champ `salle` du bestiaire et la fin de l'acte, état d'arène en index 3 et ses montants hors des fragments) ; brèche et case ; les trois gestes sur 10 000 positions chacun (Fils 9 928 placés / 0 sautés, Cadre 9 928 / 0, Toile 9 928 / 0 ; chaque sortie rendue libre et atteinte à pied à temps, la Toile en deux coups) ; tiers (10 000 boucles : le plus loin d'abord, jamais deux fois le même) ; 10 000 boucles de tableaux (déterministes, trois décors distincts, thème permis, jamais la Brume, budget et coûts tenus ; règles Sol 7 445, Braseros 7 669, Verre 7 510, aucune 7 376) ; pondérations (Faubourgs, Tir croisé, Verre montent avec `par18A`, `par18`, `par18R` ; poids exacts) ; premier tableau rejoué 2 000 / 2 000, jamais aux boucles suivantes ni s'il n'est plus possible ; mort par un geste signature : rien en premier ; 40 000 places et 10 000 dalles (toutes dans le fragment, posées seulement avec une sortie) ; champ `tab` (écrit, relu, effacé, invalide ignoré, essai muet) ; branchements de la section v18.6 (ni `setRule`, ni `murmur`, ni bandeau, ni Brume, ni `Math.random` ; ennemis qui rentrent avec leurs tirs, feinte de la salle muette, trou du sol, cercle des naissances). Contre-épreuves : brèche fermée, damier plein (deux moitiés d'un coup : pas de sortie), dalle hors fragment, tiers répété, thème interdit, sauvegarde `tab` invalide acceptée : attrapées.

**Banc** `banc-brumeux` : **143 vérifications, 1 échec** (passe complète finale ; l'échec est en F, voir ci-dessous) (A à I ; A et B éprouvent maintenant le moteur sur la phase II, C, F et H conduisent des combats entiers depuis la phase I). A : les poids en jeu égalent `brxLire` (écart 0), sur la phase II maintenant (premier élément « anneau » à la phase II ; mesures libres sous le budget 5). B (phase II) : mesures fixes dans l'ordre (seules les zones venues d'une mesure fixe comptent : la phase II peut tirer un disque libre), à nu 2,2 s après la boucle, seuil de la phase II (PV au passage = seuil − 1), verrou 1,20 s, IV au sol, V (état 2, constructions effacées), mort, rien d'écrit en essai. C : quatre combats depuis la phase I, **0 coup sans signe** (Lumenarque 26 coups, Gouffre 29, Héraut 10, Tisse-Destin 155) ; le seuil d'avancée passe de la phase III à la phase II en 170 s (le Tisse-Destin ne vide pas ses tableaux). D : constructions, coût de cinq +0,1 à +0,9 ms. E : paliers inchangés. F (bot qui frappe, depuis la phase I) : Lumenarque **160 s** (phase I 67 s), Gouffre **99 s** (28 s), Héraut **40 s** (13 s), Tisse-Destin **329 s** (110 s), toutes ≤ 400 s et chaque phase ≤ 150 s ; **un coup sans signe vu une fois** au Lumenarque dans cette passe (F n'imprimait pas encore le détail ; quatre combats entiers rejoués ensuite, deux au banc, deux au diagnostic, 0 coup sans signe : non reproduit, point ouvert ; F imprime maintenant le détail). G : `banc-arene` G contre `791c44e` : **10 260 images comparées, 0 différente** (trois passes). H : mouvements réduits, 640 × 360, 2 560 × 1 440, 390 × 844 : 0 coup sans signe. I-A : la boucle en jeu égale `brxBoucle` (même graine, même lecture) ; premier tableau rejoué (Cryptes, Chœur, Braseros) ; trois tiers distincts, le plus loin d'abord ; déterministe. I-B : fragments dans les bornes, hors des montants ; Verre ×1,40 dedans (ennemi : 14,0 contre 10,0 ; toi : 14,0 contre 10,0) ; Braseros 40 % hors de leur lumière (5,0 contre 12,5) ; dalles toujours dans le fragment, jamais sur toi quand tu es dehors, sur toi quand tu es dedans (3 / 3) ; Siège au contact de la Nourrice : 10 naissances, cercle ≥ 0,83 s, 48 coups reçus, 0 sans signe. I-C : vidé → à nu 3,02 s ; non vidé → ses 12 ennemis rentrent à 31,2 s, sans fenêtre ; une feinte, 8,02 s après l'accroche. I-D (bot qui frappe, phase I seule) : Lumenarque 57 s (2 tableaux vidés), Gouffre 26 s (1 rentré : il finit la phase sur les mains), Héraut 14 s (1 vidé), Tisse-Destin 133 s (4 rentrés) ; 0 dalle sautée, 0 zone sautée, **0 coup sans signe** dans les quatre formes. I-E : **+0,2 ms** (passes : +0,2 / +0,4 / +0,5 ; mesure appariée, image par image, Brumeux en phase I contre le fantôme d'essai devant la même foule de 13 ennemis), Braseros +0,4 à +0,8 ms, peinture des calques 21 à 42 ms (≤ 250). L'ancienne mesure à deux pages donnait de −2,3 à +4,4 ms d'une passe à l'autre (bruit de deux pages sur deux cœurs chargés), d'où la mesure appariée ; elle a d'abord montré, avant les corrections de coût, +1,8 à +4,4 ms : l'image de fragment posée entre deux pixels (filtrée), le sol de l'arène peint dessous, le cadre en calque entier, le corps deviné repeint à chaque image. I-F : mains qui retombent de 47 px et s'ouvrent, drapé sans fondu ; en mouvements réduits : chute 0, rideau en fondu (1,00 → 0,03), rien ne flotte ; gestes 5 / 1 / 25 zones. **Captures relues** (accroche, tableau vivant avec le Sol, les Braseros et le Verre, rideau, à nu et anneau, les trois gestes, en mouvements réduits aussi) : le cadre et le fragment se lisent, la brèche du Cadre se voit, la Toile montre ses deux moitiés ; le bandeau d'entrée « Au fond de la Brume » reste dans les captures (son minuteur suit l'horloge du navigateur, figée par le banc), comme en 5a.

**Régression (v18.6)** : simulateurs `sim-brume` 46 602, `sim-dernier` 4 021, `sim-masque` 3 583 218 contrôles, `sim-nemesis` 46 129, `sim-descente` 40 772, `sim-arene` 125, `sim-brumeux` 359 : 0 échec. Bancs : `effets` 740, `touche` 34, `essai` 43, `complet` 228, `relecture` 12, `glas-relecture` 16, `nemesis` 99, `essai-nemesis` 15, `nemesis-complet` 46, `nemesis-revue` 17, `descente` 117, `paliers` 71, `mutations` 61 : 0 échec ; `dernier` : les 4 échecs anciens (§ 31) ; `brumeux` 143, 1 échec (F, le coup sans signe vu une fois, voir plus haut) ; `arene` 129 dont 3 échecs : C comptait trois calques (un par état d'arène : il y en a quatre, le banc lit maintenant leur nombre dans `arene.js` ; C rejouée seule : 5 / 5, +1,1 ms) et G (Sanctuaire et colporteur en Extrême, 180 images chacun : les polices, la fragilité connue ; G rejouée seule contre `9e92de2` : **10 260 images, 0 différente**). `banc-gardiens-final`, seul : 222 / 223, l'échec est la mesure de coût du Glas ×2 (« parties en place » +1,73 ms pour ≤ 1), la fragilité notée aux § 31 bis à § 35 (rien de ce chantier ne dessine dans la salle d'un gardien : la règle d'or image par image le prouve).

**Points ouverts** : (1) PV placeholders : la phase I dure de 14 à 153 s selon la forme au bot qui frappe (cible 50 à 70 s) ; le Gouffre et le Héraut la finissent sur ses mains avant le premier tableau vidé, le Tisse-Destin ne vide pas ses tableaux (ils rentrent à 30 s) : la calibration (5g) devra peser la part des mains et la part des tableaux ; les vagues de l'acte X sont denses (budget de salle à la fin de la descente : 8 à 13 ennemis par tableau) ; (2) un fragment au Verre ne se voit pas (la descente ne le montre que par son étiquette) : un signe à proposer (5g ou action 7) ; (3) une dalle qui vise un ennemi du tableau hors de la vue ne le blesse pas (la règle de l'arène « on ne frappe que ce qu'on voit » retient tout coup passant par `hitEnemy` au-delà de la vue, sauf brûlures et poisons) : à trancher avec cette règle (§ 34, point (6)) ; (4) les Braseros coûtent ~2 ms par image en rendu logiciel (deux lumières : le même coût qu'en descente) ; (5) les décors des actes IV à IX : le tirage puisera dans tous les actes traversés quand l'action 6 leur donnera leur décor, sans autre changement ; (6) le rire de l'accroche est celui des contre-mesures (`__rire`, comme la lecture de 5a) ; (7) **un coup sans signe vu une fois** en F (Lumenarque, combat entier de 160 s), non reproduit en quatre combats entiers rejoués : F imprime désormais le détail (source, depuis combien de temps elle était signalée) ; à surveiller dans les passes suivantes (5c) ; (8) les tirs d'un Spectre de tableau resté hors de vue ne sont signalés que s'ils passent près de toi dans l'horizon des signes (1,5 s) : un pas de côté dans leur trajectoire, au bord de la vue, peut réduire ce préavis (règle de l'arène, v18.4) : hypothèse à vérifier si le coup de (7) revient.

## 37. Le Brumeux (v18.7), action 5c : la phase II, « L'Ouvrage », et le système de constructions (2 novembre 2026)

Fiche : `_dev/cadrages/la-brume-v18-5c-ouvrage-fiche.md` (et `claude/la-brume-v18-5c-ouvrage-fiche.md` dans le projet), **validée le 2 novembre 2026, toutes les recommandations, écarts compris** ; cadrage Q1, Q2, Q4, Q8, Q9, Q11 à Q15, Q17. Règle d'or : l'arène reste **éteinte** (`arene.js`, `actif:false`), le boss final provisoire tient sa place ; seul `?brumeux=2` (ou une transition depuis la phase I d'un essai) ouvre la phase II ; les phases III à V jouent encore la partition d'essai.

**Données** (`data/brumeux.js`) : gestes signature `ruee` (couloir de 90 px de ses mains vers toi, jusqu'au bord, 1 400 au plus ; 1,2 s ; course de la main 0,4 s ; 14 ; sonné 2 s quand elle se brise), `equerre` (croix de deux couloirs de 70 × 900 sur toi, 1,0 s, 12), `truelle` (cône de 70° de 60 à 520 px de ses mains, 1,1 s, 12), `effondrement` (1,4 s, 16, ses ennemis ×2), `rail` (la cloche : 1,0 s, 12), `manoeuvres` (l'appel), tous **`fixe:true`** ; `construction` (le pilier d'essai de 5a) devient `fixe:true` : plus jamais tiré (bâtir est la mesure `batir` de la phase II ; `__brumeux.poser(x, y, r)` le pose encore). `cumul` gagne `effondrement`, `rail`, `appel`. `partition.ouvrage` : `{entracteS:1.4, nuS:2.5, sauteS:0.6, mesures}` (bâtir · Ruée · libre · bâtir · Manœuvres · feinte · Équerre · effondrement · libre · Truelle ; boucle de 31,5 s au compte de la fiche). `constructions` : `lecture` (seuil 0,35, axe inconnu 0,5, variété ×0,5), `placement` (quatre variantes : telle quelle, ±20°, glissée de 60 px ; bord 40 px ; voie des rails 96 px), `fissures` (2/3 et 1/3, en fractions exactes), `annulation` (5 % des PV de la phase, +1,5 s à nu), six `sortes` avec leurs tailles, places, PV (`pvPart` des PV de la phase II : muraille 8 %, fût 2 %, butoir 5 %, puits 6 %, échafaudage 10 % ; douve incassable), plafonds par sorte (3 / 1 / 2 / 2 / 2 / 2), jumelle, pièce, zone de chute et ennemi d'appel ; `matieres` pierre (Faubourgs), bronze (Cryptes), chair (Cœur). `manoeuvres` : 2 / 2 / 3 places, au plus 4 vivants, Rampant par défaut, places à 230 px de toi dans la vue + 200 px. `phases[1].arene:4`. `dessin.version` 3 (sans portrait : 5g). `data/arene.js` : l'état réel `ouvrage` **ajouté en index 4** (arène pleine, chantier nu, sol cendre, brume de décor en haut ; `tard:true`, écart 16) ; les états 0 à 3 gardent leurs places (empreinte vérifiée par le simulateur).

**Logique pure** (`/*brx:pur*/`) : `brxDans` gagne le **cône** ; `brxCoupe` (premier pilier qui arrête un tir, jamais une fosse, au contact d'un couloir de largeur w), `brxBord`, `brxRuee`, `brxEquerre`, `brxTruelle` ; `brxSorteScore`, `brxSortesPoids` (seuil, poids `lecture.axe`, verdict de la contre-mesure jumelle, variété, plafond par sorte), `brxOrdreSortes` (premier = la sorte qui t'a tué ; `eviter` : la sorte du premier bâtir de la boucle, s'il en reste une autre ; `exclus` : les sortes annulées dans la boucle ; une tirée au poids, puis les autres éligibles par poids) ; `brxGeo` (géométrie et variantes de chaque sorte) ; `brxBatir` (la première sorte de l'ordre dont une variante passe `brxPoser`) ; `brxPoser` étendu aux chaînes de disques (`brxDisques`, `brxEtats`, `brxTous` : une douve a deux états, deux passerelles ouvertes sur quatre, et la pire combinaison des états compte ; refus `sorte`, `bord`, `voie` en plus) ; `brxGrille` réécrite (chaque pilier marque les cases de sa boîte : **même grille**, plus vite ; les 10 000 constructions de la section 6 donnent exactement les mêmes comptes qu'en 5a) ; `brxPvPart`, `brxFissure`, `brxAnnule`, `brxFiltreBornes` (état IV : celles qui tiennent entières dans les bornes, connexité revérifiée, les plus éloignées du centre retirées d'abord), `brxChute`, `brxEffondrement`, `brxCloche`, `brxAppel`. `brxLire` rend aussi `bati` (la sorte effondrée sur toi, ou `rails` quand la cloche t'a tué) et `prof`, `eff`, `ko`, `cms`. Sauvegarde : `SAVE.brumeux` **reste v:1** ; champ facultatif `bati:{phase:sorte}`, gardé seulement là où `mort[phase]` vaut `effondrement` et la sorte s'effondre (jamais douve ni rail) ; `brxNoter` l'écrit et l'efface quand une autre mort le remplace.

**Jeu** (section « v18.7 · Phase II » du bloc v18.5 ; enveloppes les plus extérieures du bloc) :
- **Bâtir** : `batir()` (une graine par bâtir : `graine ^ n × 0x85EBCA6B`, pour que le banc refasse le calcul) → `brxBatir` → `construire()` : matière tirée parmi les décors traversés (jamais celle de la construction d'avant), image assemblée (`assembler`, ≤ 3 ms), annonce en craie 1,5 s (contours pointillés, fils de ses mains), **ses mains à nu** (`e.vuln`), ses doigts tricotent (pas en mouvements réduits), la croix s'incline vers le chantier ; une douve retire ses mains sur l'île (`X.mainsC`, 300 px/s au plus) tant qu'elle tient. **Annulation** : ses PV perdus pendant l'annonce ≥ 5 % des PV de la phase II → la craie s'émiette, +1,5 s à nu, rire étranglé, sa sorte écartée de la boucle. **Pose** : une créature dessus attend 1 s au plus (`attenteMax`), puis est poussée hors des disques sans dégât ; disques dans `room.pillars` (`pilier18`, `fosse18` ; `brx18`, `cons18`) ; `CAM.ff`.
- **Entités fixes** : un disque cassable = un `mannequin` `fixed` de `enemies` (`cons18`), PV gardés par **élément** de la construction (muraille, puits, échafaudage : un élément ; colonnade : un par fût ; rail : un par butoir) ; **un coup par image et par élément, le plus gros** (appliqué après le pas, un seul nombre affiché) ; ni brûlures ni poisons (`o.dot`), ni PV volés (le vol de vie est coupé le temps du coup) ; profil, Accoutumance, exécutions, pantins et butin les ignorent déjà (`fixed`) ; hors du ciblage automatique (`nearestFoe`, `nearestEnemy` enveloppés) ; ni corps ni barre de vie dessinés ; pas une source de signe (bloc v18.4) ; « on ne frappe que ce qu'on voit » s'y applique. Un **tir du joueur** qui meurt sur une construction la frappe (`updateProjectiles` enveloppé).
- **Gestes** : la Ruée (`ruee` : quatre variantes, sortie vérifiée ; sa fin `finRuee` : si l'obstacle coupé tient encore, sonné 2 s, étincelles dans sa matière, une construction perd un tiers de ses PV) ; l'Équerre et la Truelle par `variantes` (formes `croix` et `cone`) ; le cône dessiné en orange et source de signe.
- **Effondrement** (`effondrer`, `finChute`) : la plus proche avec une sortie, un fil de sa croix, elle penche vers toi (fondu en mouvements réduits), tombe : toi dessous, 16 ; ses ennemis, 32 (`o.brx`) ; jamais lui ; un échafaudage effondré ne le sonne pas, un puits effondré perd ce qu'il a bu ; rien à effondrer : la mesure saute.
- **Cloche** (`clochePas`) : toutes les 6 s (la première 2 s après la pose), le couloir de 96 px sur la voie (source de signe, jugée au préavis du boss) ne part que si une sortie existe ; puis la cloche passe en 0,85 s (son `bigbell`) : toi sous elle, 12 ; ennemis écrasés 60 / 30 (élites, Masqués ; jamais lui) ; un butoir cassé : rail inerte.
- **Passerelles** (`basculer`) : toutes les 2,5 s, deux par deux, d'un coup (jamais toutes fermées), après l'attente d'une créature dessus.
- **Puits** : `heal` enveloppé (dans son rayon, 30 % gardés, le reste bu jusqu'à 40 % de tes PV max) ; cassé, il rend d'un coup (`heal(…, 'puits')`, fil de lumière).
- **Échafaudage** : −40 % sur le Brumeux tant qu'un tient (`hitEnemy` enveloppé, non cumulable) ; tombé par toi, sonné 2 s, la croix vacille.
- **Chutes** : un ennemi ordinaire repoussé dans une douve (élan ≥ 60 px/s au contact d'une de ses fosses) ou une Brute qui y charge (`crashed` enveloppé) tombe ; le joueur, jamais. Une charge qui heurte une construction lui ôte un palier (une fois par 0,5 s et par ennemi).
- **Manœuvres** (`manoeuvres`) : lues sur les constructions debout de la plus récente à la plus ancienne (`brxAppel`), cercles violets, fils de ses mains ; `appel18` ; un ennemi de l'appel qui te tue est noté `manoeuvres`.
- **Mesures qui sautent** : bâtir sans place, effondrement sans cible, appel au plafond : entracte réduit à 0,6 s (`X.j.mesuresSautees`).
- **Transitions** (`versCons`) : une annonce en cours s'efface ; un obstacle du nouvel état qui tombe sur une construction la fait céder ; en IV, `brxFiltreBornes` ; en V, toutes effacées (`effacerCons`, qui efface aussi les entités) ; à sa mort aussi. Les constructions traversent la transformation de l'arène (bloc v18.4 : `room.pillars` garde les piliers `brx18`).
- **Rendu** : modules cuits à l'entrée (`cuireModules` : cinq pièces × trois matières × trois fissures, une fosse par matière, puis une mise en train : une muraille et une douve assemblées et jetées) ; image de chaque construction assemblée à son annonce (muraille : une par fissure ; douve : quatre quarts d'anneau et, par passerelle, une image ouverte et une fermée ; rail et liseré du puits : des tracés `Path2D`) ; **les parties fixes sont cuites dans les tuiles du sol de l'arène** (`cuisson` : à chaque changement — pose, fissure, destruction, effondrement, état d'arène — seules les tuiles dont le contenu change sont rendues intactes depuis leur copie d'origine puis repeintes) ; ce qui bouge est dessiné à chaque image (passerelles, niveau du puits, construction qui penche, cloche, fils, main de la Ruée), posé par `poseVue` (qui accepte maintenant la transformation lue une fois par l'appelant).
- **Bot** (`bot=2`) : `cible2()` : ses mains pendant une annonce, puis un butoir quand la cloche l'a frappé deux fois, puis l'échafaudage le plus proche, puis le Brumeux ; contre une douve qui retient ses mains, une forme au contact longe l'anneau jusqu'à une passerelle ouverte ; il fuit aussi les cloches. `X.essai.cible` : une cible imposée (banc).
- Console : `__brumeux.etat().bat`, `poser('<sorte>', {p, h, annonce, mat})`, `batir()` ; `statsRun` gagne `bati`, `annulees`, `cassees`, `effondrees`, `ruees`, `brisees`, `cloches`, `appels`, `mesuresSautees`.

**Retouches du bloc v18.4** (chacune inerte hors du combat du Brumeux, le simulateur et le banc G le prouvent) : `hitsWall` enveloppé (une fosse `fosse18` n'arrête plus un tir **seulement quand l'arène est allumée** ; hors de l'arène, l'ancien résultat au bit près sur 10 000 appels) ; `keepRange` enveloppé (la ligne de tir des tireurs : quand seules des fosses la coupent, elles sont retirées le temps de l'appel) ; crochet `jetonTir` dans `tryTok` (point ouvert (8) du § 36 : dans le combat du Brumeux, un tireur ne prend son jeton qu'à l'intérieur de la vue ; nul ailleurs) ; `o.brx` exempté de « on ne frappe que ce qu'on voit » (point ouvert (3) du § 36 : les dalles de la phase I, l'effondrement, la cloche) ; les constructions ne sont pas des sources de signe ni « l'ennemi au contact » d'un coup jugé ; la transformation garde les piliers `brx18`.

**Écarts** (validés avec la fiche) : (1) les Manœuvres ; (2) ses mains se retirent sur l'île d'une douve ; (3) `construction` devient `fixe:true` ; (4) les rails ont des butoirs cassables ; (5) rendu en deux temps ; (6) PV et seuil d'annulation en parts des PV de la phase ; (7) `losClear` ignore les fosses ; (8) jeton de tir dans la vue ; (9) `o.brx` ; (10) `SAVE.brumeux` v:1 et `bati` ; (11) l'état réel en index 4.

**Écarts de l'implémentation** (validés avec la fiche 5d, le 2 novembre 2026) :
1. `losClear` est locale au bloc v17.5 (on ne peut pas l'envelopper) : l'enveloppe porte sur `keepRange`, son seul appel de ligne de tir, et retire les fosses de `room.pillars` le temps de l'appel quand elles seules coupent la ligne (la marche reste bloquée par les collisions et la carte FF).
2. **Cuisson au sol** : dessinées à chaque image, six constructions coûtaient +1,1 à +1,4 ms à elles seules et la phase II mesurait +1,6 à +1,8 ms contre le boss d'essai (> +1,5) ; les parties fixes sont donc peintes dans les tuiles du sol de l'arène (une copie d'origine par tuile touchée, rendue avant de repeindre) : le coût par image tombe à +0,8 (médiane, +0,7 à +1,0 d'une passe à l'autre) ms, chaque changement coûte au plus 3,7 ms une fois. La fiche disait « posée par `poseVue` à chaque image » ; seul ce qui bouge l'est.
3. Douve : l'île, tirée à 340–440 px vers ses mains (qui sont au-dessus de toi), est ramenée dans les bornes quand elle en sortirait ; refusée si tu serais à moins de 268 px de son centre (anneau, fosse et 40 px).
4. Puits à 160–210 px (et non 240) : à 240, son rayon de 220 ne te couvrirait pas.
5. Murailles : à max(part × distance, 90 px) et au moins 40 px avant ses mains ; impossibles quand ses mains sont à moins d'environ 130 px de toi (tu te bats près du haut de l'arène) : la sorte suivante est bâtie.
6. Échafaudages : les variantes sont d'autres places tirées dans le tiers le plus loin (une tour ronde ne se tourne pas).
7. Rails : le rail glisse le long de lui-même pour tenir dans les bornes en passant par toi ; la variante « glissée » glisse le long du rail.
8. Manœuvres : l'appel est **tronqué** au plafond de 4 vivants et ne saute que si rien n'y tient (la fiche : « au-delà, la mesure saute ») ; chaque ennemi a sa place (un rail : deux Rampants, deux places).
9. « Un coup par image » : le plus gros coup de l'image par élément (le jeu ne sait pas distinguer deux attaques dans la même image).
10. Le Dernier Souvenir : ses effets qui choisissent une cible (`dsCibles`) excluent déjà les entités fixes et ne visent donc pas une construction ; ses zones la touchent.
11. Ruée : sonné seulement si l'obstacle tient encore à la fin de la charge.
12. Phase III : ses mains ne restent pas sur l'île d'une douve (la fiche 5d décidera) ; la douve, ses passerelles et la cloche continuent.
13. Cloche : on est frappé quand elle passe à ta hauteur sur la voie (son rayon) pendant les 0,85 s ; son couloir reste une source de signe jusqu'au bout.
14. Les projectiles du joueur qui meurent sur une construction la frappent avec leurs dégâts (par `hitEnemy` ; les effets propres des projectiles v6, `projHit`, ne sont pas rejoués).
15. `brxGrille` réécrite (même grille, plus vite) ; `poseVue` accepte la transformation lue une fois.
16. L'état `ouvrage` est **`tard:true`** (`data/arene.js`) : son calque de sol n'est pas peint à l'entrée d'une arène (sauf s'il est l'état d'entrée : `?arene=final&etat=4`) ; le Brumeux le peint une tuile par image pendant la phase I (`__arene.peindreTard`), et `vers()` finit d'un coup ce qui manquerait (un calque n'est posé qu'entier). Douze tuiles de moins à l'entrée de toute autre arène (peinture 75 → 60 ms environ). Ce n'était pas la cause des échecs de `banc-arene` C (voir Régression).
17. **Zones des mutations dans l'arène** (bloc v18.4) : un Glas (et un Écho, même chemin) qui éclatait sur toi dans l'arène était jugé « sans signe » (vu deux fois au Héraut, palier Extrême, en phase I : `banc-brumeux` C et I-D ; c'est très probablement aussi le coup sans signe du Lumenarque en F du § 36, point ouvert (7)). Leurs cercles orange (`room.z18`) et l'Ombre (`room.ombre18`) deviennent des sources de signe de l'arène, et le juge les reconnaît (`mutation:glas`, `mutation:echo`, `mutation:ombre`). Inerte hors de l'arène (`banc-arene` G, `banc-brumeux` G). `banc-brumeux` J-G : un Glas posé sur toi est jugé signalé (contre 888578f : sans signe).

**Vérification.** `sim-brumeux` : **558 vérifications, 0 échec** (5b : 359 ; 5c ajoute la section 11 et les branchements v18.7) : données (gestes fixes et leurs chiffres, partition `ouvrage`, six sortes, plafonds, matières, `manoeuvres`, état `ouvrage` en index 4 et `tard`, états 0 à 3 inchangés à l'empreinte près) ; lecture (`brxSortesPoids`, `brxOrdreSortes` : la sorte qui t'a tué d'abord, l'évitement, les exclues) ; placement : 10 000 bâtir par sorte (au pire : échafaudages 9 999 posés, 1 impossible ; toujours une sortie, connexité ≥ 85 %, aire ≤ 30 %, voie des rails libre, douve vérifiée au pire de ses deux états) ; persistance (10 000 suites de bâtir sans jamais fermer l'arène) ; gestes (Ruée 10 000 / Équerre 10 000 / Truelle 9 994 avec sortie sur 10 000, 314 Ruées coupées) ; effondrement, cloche, fissures exactes, annulation, appel tronqué au plafond ; tirs et fosses (`hitsWall` au bit près hors de l'arène sur 10 000 appels, `keepRange`) ; sauvegarde `bati` ; branchements ; journal v18.7 sans un mot des phases ni de sa façon de bâtir. `sim-arene` : 128 (crochet `jetonTir`, enveloppes, zones des mutations sources de signe).

**Banc** `banc-brumeux` : **216 vérifications, 1 échec** à la passe complète (C, Héraut : 4 coups reçus pour 5 demandés, la graine des mutations est tirée au hasard ; C rejouée seule : 18 vérifications, 0 échec), sections A à J (A, B et D éprouvent maintenant le moteur sur la phase III). **J-A** données en page = logique pure ; **J-B** chaque sorte posée, cassée (temps pour casser au bot, une pièce : Lumenarque muraille 2,2 s, fût 1,2, butoir 1,7, puits 1,6, échafaudage 3,3 ; Gouffre 3,4 / 0,7 / 2,4 / 3,1 / 6 ; Héraut 2,7 / 1,1 / 1,3 / 1,5 / 5,9 ; Tisse-Destin 4,4 / 2 / 2,8 / 3,1 / 9), fissures, effondrement par sorte, cloche, passerelles, puits qui boit et rend, échafaudage qui protège et sonne, douve qui retient ses mains, annulation, Manœuvres ; **J-C** tirs : arrêtés par une muraille, un fût, un échafaudage, ils traversent une douve et une fosse d'état ; un tir du joueur casse ce qu'il touche ; **J-D** huit combats au bot (deux graines par forme) : phase II finie en 35 / 34 s (Lumenarque), 32 / 32 s (Gouffre), 12 / 12 s (Héraut), 64 / 95 s (Tisse-Destin ; 66 / 112 s à la passe d'avant) ; bâties 2 à 6 par combat (6 au Tisse-Destin : colonnades, échafaudages ×3, douves, murailles), annulées 0 à 2, cassées 0 à 4, effondrées 0 à 2, Ruées 1 à 3 (1 brisée), cloches 0, appels 0 à 3 ; **0 coup sans signe** dans les huit ; **J-E** coût apparié +0,8 ms (≤ +1,5) avec les six sortes debout, peinture à l'entrée 24 ms (calques de la phase I et modules ; ≤ 250), assemblage ≤ 1,7 ms (≤ 3), cuisson ≤ 3,7 ms par changement ; **J-F** mouvements réduits (les mains ne tricotent pas, la bascule devient un fondu), planche des matières et des fissures, captures relues (annonce, annulation, six sortes, Ruée arrêtée, Équerre, Truelle, effondrements) ; **J-G** un Glas qui éclate sur toi est jugé signalé. C : 0 coup sans signe aux quatre formes (Lumenarque 30 coups, Gouffre 21, Héraut 8, Tisse-Destin 159). F : victoire du bot en 155 s (Lumenarque ; phase II 28 s), 110 s (Gouffre ; 30 s), 38 s (Héraut ; 8 s), 415 s (Tisse-Destin ; phase II 102 s). G (règle d'or contre 888578f) : identique. I-E : phase I +0,4 ms.

**Régression (v18.7)** : simulateurs `sim-brume` 46 602, `sim-dernier` 4 021, `sim-masque` 3 583 218 contrôles, `sim-nemesis` 46 129, `sim-descente` 40 775, `sim-arene` 128, `sim-brumeux` 558 : 0 échec. Bancs : `effets` 740, `touche` 34, `essai` 43, `complet` 228, `relecture` 12, `glas-relecture` 16, `nemesis` 99, `essai-nemesis` 15, `nemesis-complet` 46, `nemesis-revue` 17, `descente` 117, `paliers` 71, `mutations` 61 : 0 échec ; `dernier` 117, les 4 échecs anciens ; `arene` 129 : C passe (+1,3 ms), G : deux salles (sanctuaire, colporteur du Gouffre) différentes dès l'image 0 (les polices), G rejouée seule : 10 260 images, 0 différente ; `brumeux` 216 (voir Banc) ; `gardiens-final` seul à la fin : 223 vérifications, 1 échec : le coût du Glas Originel ×2 (+1,8 ms pour +1), l'échec intermittent connu (à la passe de la régression : Glas ×2, Héraut ×2 et `capture-heraut`, tous trois connus ou reproduits sur 888578f). **`banc-arene` C** : vue en échec plusieurs fois pendant la régression (+2,0 à +3,4 ms) ; le commit d'avant (888578f), rejoué aux mêmes heures, mesure aussi +2,3 et +2,5 ms (et +0,6 aux heures calmes) : c'est la charge de la machine, pas la phase II (l'état `tard` a été essayé à cette occasion et gardé pour les douze tuiles qu'il épargne). `capture-heraut` (dans `gardiens-final`) : « corps plein charge » 1,154 × r pour 1,15, à l'identique sur 888578f (trois passes chacun) : ancien et indépendant de 5c.

**Points ouverts** : (1) PV placeholders (5g) : la phase II dure 12 s (Héraut) à 95–112 s (Tisse-Destin) au bot qui frappe, pour 50 à 70 s visés ; le Héraut annule souvent ses bâtir (il frappe fort pendant l'annonce). (2) Un échafaudage tient 6 à 9 s au bot du Gouffre et du Tisse-Destin (à regarder avec les PV). (3) La cloche des rails ne passe presque jamais dans un combat de bot (rails rarement bâtis, cloches 0 en J-D) : son réglage ne sera éprouvé qu'en vraie partie ou au banc (J-B). (4) Phase III : ses mains ne restent pas sur l'île d'une douve (écart 12) ; la fiche 5d tranche, ainsi que ce que deviennent les constructions en III. (5) Le juge de l'arène reconnaît maintenant les zones des mutations (écart 17) ; les zones du Masqué restent à rendre sources de signe une à une. (6) `banc-arene` C et `banc-gardiens-final` (coût du Glas ×2, du Héraut ×2) restent sensibles à la charge de la machine : les rejouer seuls avant de conclure.

## 38. Le Brumeux (v18.8), action 5d : la phase III, « La Couture » (3 novembre 2026)

Fiche : `_dev/cadrages/la-brume-v18-5d-couture-fiche.md` (et `claude/la-brume-v18-5d-couture-fiche.md` dans le projet), **validée le 2 novembre 2026 : toute la fiche** (recommandations, les quinze écarts au cadrage, les choix recommandés sur les six questions partagées, et les 17 écarts d'implémentation de 5c, § 37). Implémentée en une fois (Opus 5.5, élevé). Règle d'or : l'arène reste **éteinte** (`arene.js`, `actif:false`), le boss final provisoire tient sa place ; seul `?brumeux=3` (ou une transition depuis la phase II d'un essai) ouvre la phase III. Secret : ni le wiki ni le journal ne disent ce qu'il coud ni comment (ligne de journal v18.8 : « le Brumeux reprend un vieil ouvrage »).

**Données** (`data/brumeux.js`) : `phases[2]` = `{id:'couture', presence:'haut', faible:'croix', arene:5, libre:0.50, pv:2400, exclut:['construction']}` ; gestes signature, tous `fixe:true` (jamais tirés) : `surjet` (losanges : 7 de 52 px tous les 120 px en ligne de sa croix vers toi, décalés de 24 px, à partir de 40 px ; 1,1 s ; 12), `de` (disque de 110 px sur toi, puis un second 0,9 s après là où tu es ; 1,0 s ; 11), `aiguilles` (trois tirs de 10 px en éventail de 36°, 420 px/s, trajectoires annoncées en pointillé violet ; 0,9 s ; 10) et la mesure `couture` (menace 0) ; `cumul.couture:1` ; `partition.couture` (`entracteS` 1,4, `nuS` 2, `sauteS` 0,6 ; couture · surjet · libre · feinte · aiguilles · couture · dé · libre) ; bloc `couture` : 3 fils (au plus 3 tendus), décalés de 0,5 s, montage 4,4 s, nœud à 110 px au-dessus du corps (r 20, PV 2,5 % de ceux de la phase), à nu 3 s quand plus aucun fil ne tient, 2 s quand un cousu est brisé, points de montage (230 à 650 px de toi, 420 px l'un de l'autre, 80 px du bord, 40 px des obstacles, jusqu'à 200 px hors de la vue, 80 essais par point), PV des cousus 15 % de ceux de la phase, plancher de chargement 0,6 s, récence de la réserve 1 → 3, budget d'une mesure libre −2 par cousu vivant (plancher 2), attente d'une némésis promue acte III salle 3, attente de ses gestes 1,5 s ; `dessin.version` 4. `data/arene.js` : état réel `couture` **en index 5** (`tard`, sans obstacle ni fosse, sol cendre, une nappe de brume en haut) ; les états 0 à 4 gardent leurs places (empreintes vérifiées).

**Logique pure** (`/*brx:pur*/`) : `brxDans` gagne le **losange** ; `brxTirer` accepte `o.moins` / `o.plancher` (budget réduit) ; `brxLire` rend `cousu` ; gestes `brxSurjet`, `brxDe`, `brxSortieDe` (une sortie pour les deux coups), `brxAiguilles` (coupées au premier pilier qui arrête un tir, `brxCoupe`, largeur 2r), `brxVolAiguille` ; points `brxPointsCouture` (un point sur l'île d'une douve debout, si tu n'y es pas), `brxRelie` (les cases de la grille reliées à toi) ; composition `brxSouvenirCouture` (tirage dans la réserve à la récence, sans remise, seulement un souvenir qui tient dans un assemblage ou un renfort), `brxCoudre` (assemblage sous le budget de l'acte avec `poidsProfil` allumé, sans répéter la base du fil d'avant), `brxNemCouture` (la plus forte par ses points, puis la plus récente ; jamais une némésis en répit ni déjà venue) ; `brxFilsALancer`, `brxAboutit` (plafond `paliers.*.masques` vivants), `brxNuCouture`, `brxBudgetCouture`, `brxActifsCouture`, `brxPvCousu`, `brxPvNoeud`, `brxPlancherCharge`, `brxPromu`, `brxAttente`, `brxCousuOk` ; sauvegarde : champ facultatif `cousu` (seulement quand la mort de la phase est `couture` ; corps et clé validés ; toujours `v:1`).

**Jeu** (section « v18.8 · Phase III » du bloc v18.5, juste avant l'essai) :
- **La Couture** (`coudre`) : les fils qui manquent pour trois, leurs points, ce qu'il coud : la némésis (si elle n'a pas paru : `nemesisCousue`, son souvenir n'est recousu sur aucun autre fil), puis le Masqué cousu qui t'a tué au combat d'avant (`cousuRejoue`, champ `cousu`), puis un Masqué lu sur toi et ta réserve (`coudreUn`) ; une Couture qui ne peut rien lancer saute (entracte réduit) ; son petit rire, une fois par Couture.
- **Un fil** (`lancerFil`) : le Masqué naît par `createEnemy` avec `room.asm` prêté le temps de l'appel (`R.cousu18` : ni carte ni rire d'arrivée ; `R.acte18`, `R.salle18` : l'attente d'une promotion), PV `brxPvCousu` (Robuste gardé), montage de la salle avec `mont.haut` 110 ; son nœud est une entité `fixed` (`mannequin`, `cons18:{c, el, noeud}`) : les règles des constructions (un coup par image, le plus gros ; ni brûlures ni poisons ; ni PV volés ; hors du ciblage automatique ; coup retenu hors de vue sauf `o.brx`).
- **Pas** (`couPas`) : le montage ralenti (`M.t -= dt × (1 − 3,85 / 4,4)` : ses proportions gardées), **suspendu** juste avant la coupe quand le plafond est atteint, relâché quand une place se libère ; les coups au nœud, les fissures, la coupe (`couper` : le corps se défait en brume, un bout de fil pend de sa croix ; plus aucun fil tendu et au moins un coupé : à nu 3 s, la croix vacille) ; un montage abouti donne un **Masqué cousu** ; le plancher de chargement (une étape d'arme de la Brume comprise) ; un tir de cousu né hors de la vue se perd.
- **Non-cumul** : un cousu attend les zones et tirs du Brumeux et ceux des autres cousus, et ne lance rien hors de la vue (`zoneAutre18`, par le crochet `window.__zoneAutre18`) ; les mesures du Brumeux attendent la zone d'un cousu en cours (1,5 s au plus), puis c'est le cousu qui attend (`X.prio`) ; le budget d'une mesure libre baisse de 2 par cousu vivant.
- **Gestes** : le Surjet par `variantes` (rotation 0,12 rad par variante), le Dé et les Aiguilles par `lancer` enveloppé (sortie vérifiée ; le second disque du Dé est tiré là où tu es, s'il a une sortie).
- **Signe** : les zones des cousus sont des sources de signe une à une (`zonesCousus`, couleur `foe`), et un coup de cousu par une zone est jugé au préavis de l'arène (`XA.coup`) ; `hurtPlayer` enveloppé prête `room.asm` au cousu le temps du coup (la promotion le lit : seul le cousu dont le coup t'a tué est promu) et note `X.tue = 'couture'`, `X.tueCousu`.
- **Brisé** : un cousu tué le met à nu 2 s (`killEnemy` enveloppé) ; sans récompense, sans offre de reprise ; la némésis brisée perd sa fiche (`nemBrise`, comme en salle), sans fenêtre.
- **Transitions** (`vers` enveloppé) : en entrant en III, ce qui reste des Manœuvres rentre dans la brume (tirs et ondes compris) ; en quittant III (et à sa mort), tout se découd (`decoudre` : sans récompense ni promotion ; la némésis décousue garde sa fiche). Le calque de l'état 5 est peint une tuile par image pendant la phase II.
- **Corps** : en phase III, l'entité frappable est **sa croix** (`croixDy` 70 ; `corpsHaut` décale `e.y` le temps du dessin ; `faible()` pose l'anneau sur l'entité).
- **Dessin** (`dessinCouture`, par `drawTelegraphs`) : fils de sa croix aux nœuds (deux chemins pour tous les fils), bouts coupés qui pendent, un fil mou au-dessus de chaque construction, nœuds (bobine dans la matière de la croix, anneau de PV, pointillé quand le montage est suspendu), traces des Aiguilles. Mouvements réduits : rien ne se balance, les fils ne descendent pas, la croix ne vacille pas.
- **Bot** (`bot=2`) : `cible2` coupe d'abord le nœud le plus proche (une île : par une passerelle ouverte), puis la croix.
- **Essai** : `?brumeux=3[&nem=<talent>[&points=n]]` : `__nemesis.fiche(id, {points, rnd, corps})` construit une némésis **en mémoire** (rien n'est écrit), cousue en premier fil ; console `__brumeux` : `coudre()`, `couper(id)`, `fils()`, `decoudre()`, `etat().cou` ; `statsRun` gagne `couture`.

**Retouches hors du bloc** (chacune inerte hors du combat du Brumeux) : `createEnemy` du Masqué (`if(!R.cousu18){showCard…;sfx('asm_in');}`) ; `onEvent` éveil (`if(!e.cou18)showCard`) ; `zoneAutre` (crochet `window.__zoneAutre18`, nul hors de son combat, remis à `null` par `makeRoom`) ; `montPost` (`M.haut||250`) ; `nemPromo` (`R.acte18||RUN.act`, `R.salle18`) ; console `__nemesis.fiche` et `__nemesis.venue(uid)` (`vu++` hors essai) ; bloc v18.4 : **un tir hérite du signe de son tireur** (`indicateurs` : le journal seulement ; rien ne se dessine ni ne change en jeu).

**Écarts de l'implémentation** (validés avec la fiche 5e, le 3 novembre 2026) :
1. Le montage n'est pas réécrit : son horloge est ralentie (`M.t` reculé chaque pas), ses proportions gardées (descente, masque, couture, coupe) ; « suspendu » = tenu 0,02 s avant la coupe.
2. Le nœud réutilise l'entité fixe des constructions (`cons18` avec un seul élément) : toutes leurs règles s'appliquent sans code de plus (un coup par image, ni brûlures ni PV volés, ciblage, Dernier Souvenir).
3. Le cousu naît par le `createEnemy` du Masqué avec `room.asm` prêté le temps de l'appel ; il n'est jamais `room.asm` en dehors de ses coups (la salle du boss n'a pas de Masqué).
4. Le plancher de chargement (0,6 s) prolonge un chargement trop court au lieu de changer l'assemblage (`X.cou.j.prolonges`).
5. **Rien hors de la vue** (trouvé par K-D, Tisse-Destin, qui se bat de loin) : un cousu ne commence rien quand son centre est hors de la vue, et un tir de cousu né hors de la vue (tireur ou tir) se perd (`tirsPerdus`).
6. **Un tir hérite du signe de son tireur** (bloc v18.4 ; trouvé par K-D : un cousu tué pendant que son tir vole laissait un tir signalé depuis 0,1 à 0,2 s seulement) : comme un ennemi né d'un cercle d'apparition signalé ; le journal seulement.
7. L'île d'une douve : la grille de `coudre` compte toutes les fosses (le pire des deux états), donc l'île n'y est jamais reliée à toi ; le point de l'île ignore `G.relie` (on l'atteint par une passerelle ouverte, le bot aussi).
8. Le Surjet commence à 40 px de sa croix même quand tu es plus près (`tp = max(depart, projection)`) : sinon tu étais hors de la ligne.
9. Les Aiguilles s'arrêtent au premier pilier qui arrête un tir (une muraille, un fût, un échafaudage), pas à une fosse.
10. `banc-brumeux` A, B et D éprouvent maintenant le moteur sur la phase IV (partition d'essai) : la phase III a sa partition.
11. La promotion par un cousu passe par `nemPromo` tel quel (le cousu est `room.asm` le temps du coup mortel, `brxPromu`) ; un coup du Brumeux qui te tue ne promeut personne (`sansMasque`) ; une descente d'essai non plus (`essai`).

**Vérification.** `sim-brumeux` : **642 vérifications, 0 échec** (5c : 558 ; section 12 : données, empreintes des états 0 à 4, gestes et sorties (Surjet, Dé, Aiguilles : 10 000 / 10 000 avec sortie, 387 aiguilles coupées), points de montage sur 10 000 Coutures (29 092 points, 9 097 Coutures à trois points, l'île prise 3 116 fois sur 3 116), composition par le bloc `/*asm:pur*/` extrait, plafond, budget, némésis, plancher, sauvegarde `cousu`, branchements v18.8 et contre-épreuves).

**Banc** `banc-brumeux` section K : **K-A** ce qu'il coud en jeu égale la logique pure (trois fils : la némésis d'essai, puis le Masqué cousu qui t'a tué, puis un souvenir de la réserve sans remise ; points dans les distances, l'écart et les bornes ; même graine, même Couture) ; **K-B** sa croix est l'entité frappable, montage de 4,4 s, cousus sans carte, montage suspendu au plafond puis lâché, cousu brisé → à nu 2 s, nœud (60 PV, deux coups dans l'image : le plus gros seul, hors du ciblage automatique, coup retenu hors de vue), plus aucun fil → à nu 3 s et bouts qui pendent ; II → III (l'appel rentre, arène à l'état 5, calque tardif peint pendant II, constructions vivantes : passerelles, échafaudage ×0,6), réserve vide → Masqués ordinaires, un point de montage sur l'île d'une douve, chargements des cousus ≥ 0,6 s, III → IV (décousus, plus aucun nœud) ; **K-C** némésis cousue (trousseau de ses trois points, PV ×points), brisée : fiche partie et aucune fenêtre ; promotion sur une page jetable : tué par un cousu → promu, attend acte III salle 3 ; par le Brumeux → personne ; en essai → personne ; **K-D** huit combats au bot (deux graines par forme ; dernière passe) : phase III finie en 43 / 45 s (Lumenarque), 38 / 35 s (Gouffre, Difficile), 16 / 17 s (Héraut, Extrême), 172 / 135 s (Tisse-Destin) ; 1 à 9 Coutures, 3 à 25 fils, 2 à 17 coupés, 0 à 8 aboutis, 0 à 5 suspendus, 0 à 8 cousus brisés, 0 à 5 fenêtres à nu, 0 à 28 zones de cousus jugées, 0 à 66 chargements prolongés ; **0 coup sans signe** dans les huit ; **K-E** coût apparié +0,8 ms (médiane ; +0,6 à +0,9, ≤ +1,5) avec trois montages, deux cousus et six constructions contre le fantôme d'essai à foule égale, cuisson figée (à la première passe, cuisson non figée : +1,4 à +1,7 ms : la mesure repeignait les tuiles cuites à chaque bascule), dont environ +0,25 ms pour le dessin de la Couture ; peinture à l'entrée d'un essai en III 45 à 60 ms (≤ 250) ; **K-F** mouvements réduits (la croix ne vacille pas) et captures relues (fils, nœuds, coupe, némésis et son trousseau, à nu, Surjet, Dé, Aiguilles arrêtées par une muraille).

**Régression (v18.8)** : simulateurs `sim-brume` 46 602, `sim-dernier` 4 021, `sim-masque` 3 583 218 contrôles (le crochet de `zoneAutre` placé après la ligne que le simulateur relit), `sim-nemesis` 46 129, `sim-descente` 40 775, `sim-arene` 128, `sim-brumeux` 642 : 0 échec. Bancs : `effets` 740, `touche` 34, `essai` 43, `relecture` 12, `glas-relecture` 16, `nemesis` 99, `essai-nemesis` 15, `nemesis-complet` 46, `nemesis-revue` 17, `descente` 117, `paliers` 71, `mutations` : 0 échec ; `dernier` 117, les 4 échecs anciens ; `complet` 228, 2 échecs (D, « oubli par Tab » : selon le tirage, l'écran qui s'ouvre après Tab est l'arbre et non les cartes de niveau, et le banc presse ses chiffres sur l'écran de principe qui suit ; la section D rejouée cinq fois de chaque côté échoue 3 fois sur 5 sur 407a1d1 comme ici : ancien, indépendant de 5d, à fiabiliser dans le banc) ; `arene` 129 : C passe, G : les deux salles des polices (sanctuaire, colporteur) dès l'image 0, G rejouée seule : 10 260 images, 0 différente ; `brumeux` 292, 1 échec (F, Lumenarque : un coup sans signe dans un combat entier, l'échec intermittent connu du § 36 (7) ; F rejouée seule : 18, 0 échec ; K rejouée seule : 78, 0 échec), G contre 407a1d1 : 10 260 images, 0 différente ; `gardiens-final` seul à la fin : 223 vérifications, 1 échec (le coût du Glas Originel ×2, +1,06 ms pour +1 : l'échec intermittent connu).

**Points ouverts** : (1) PV placeholders (5g) : la phase III dure 16 s (Héraut) à 130–220 s (Tisse-Destin) au bot qui frappe, pour 50 à 70 s visés ; le Tisse-Destin, qui se bat de loin, coupe moins de nœuds et laisse aboutir 5 à 11 cousus. (2) Un coup sans signe « au contact » d'un cousu (source `brute` ou `voile`, jamais signalée) a été vu deux fois au Tisse-Destin avant les retouches 5 et 6, non reproduit après (plus de quarante combats de phase III au bot) : à surveiller. (3) Les zones de cousus jugées par l'arène sont peu nombreuses au bot (0 à 54 par combat) : le juge les reconnaît, mais un vrai joueur en verra plus. (4) Le coût apparié de la phase III (+0,8 ms) est à remesurer en 5g avec la vraie foule de l'acte X. (5) Le bot du Héraut termine la phase en 16 s : il coupe tous les nœuds avant qu'un montage aboutisse ; les Masqués cousus n'y sont presque jamais au combat. (6) `banc-complet` D (« oubli par Tab ») échoue une fois sur deux, sur 407a1d1 aussi : à fiabiliser (attendre l'écran de niveau au lieu de 400 ms).

## 39. Le Brumeux (v18.9), action 5e : la phase IV, « L'Emprunt » (4 novembre 2026)

Fiche : `_dev/cadrages/la-brume-v18-5e-emprunt-fiche.md` (et `claude/la-brume-v18-5e-emprunt-fiche.md` dans le projet), **validée le 3 novembre 2026 : toute la fiche** (recommandations, les quinze écarts au cadrage, les choix recommandés : formes reprises depuis son corps, zones orange au liseré lavande, plafond du Dernier Souvenir sur les PV de la phase en cours, bascule à 240 px/s, sol `pierre`, sous-classes exclues ; et les 11 écarts d'implémentation de 5d, § 38). Implémentée en une fois (Opus 5.5, élevé). Règle d'or : l'arène reste **éteinte** (`arene.js`, `actif:false`), le boss final provisoire tient sa place ; seul `?brumeux=4` (ou une transition depuis la phase III d'un essai) ouvre la phase IV. Secret : ni le wiki ni le journal ne disent ce qu'il emprunte ni comment (ligne de journal v18.9 : « le Brumeux répète en coulisses »).

**Données** (`data/brumeux.js`) : `phases[3]` = `{id:'emprunt', presence:'sol', faible:'coeur', arene:6, libre:0.50, pv:2400}` ; gestes au corps, tous `fixe:true` : `passe` (couloir de 2 r, len ≤ 900, course du corps 0,45 s ; 1,1 s ; 14 ; sonné 2 s sur une construction), `reverence` (cône de 150°, 0–190 px ; approche à 0,8 × 190 px en 2 s au plus, élan 1,3 ; 0,9 s ; 13), `volte` (anneau à brèche fixe r0 70 → r1 380, brèche 120 px à graine ; 1,1 s ; 12) et l'élément `emprunt` (menace 0) ; `cumul.emprunt:1` ; `partition.emprunt` (`entracteS` 1,2, `nuS` 0, `sauteS` 0,6 ; emprunt · Passe · libre · emprunt · feinte · Révérence · emprunt · Volte · libre : une boucle d'environ 36 s) ; bloc `emprunt` (exclusions : ultimes `*_sk`, genre `c`, renforts, reliques ; variantes gardées `double`, `elargi`, ignorées `etourdit`, `repousse`, `vol`, `traverse` ; poids (0,5 + rang / rang max) × (1 + 5 × gravures) ; trois par boucle ; prise 0,6 s ; plancher 0,8 s, +0,3 s à la première rencontre de la famille ; une étape × 1,0 = 11 ; à nu 2,0 s, défait 4,0 s ; dissolution 0,3 s ; marche 120 px/s à 180–280 px, approche × 1,3 ; chute 0,8 s à 200 px au moins) ; `couleurs.braise` (255,214,110 : la fêlure du masque et la copie qui se dissout ; ΔE 34,6 de l'orange des zones, 49,5 de l'ivoire) ; `dessin.version` 5. `data/arene.js` : état réel `emprunt` **en index 6** (bornes 0,2614–0,7386 × 0,1907–0,8093 : 1 168 × 584 au centre du monde, la caméra se fixe ; ni obstacle ni fosse ; sol pierre ; brume de décor sur les côtés, hors des bornes ; `tard`) ; `transformation.parEtat.emprunt.vitesse` 240 (la vitesse générale reste 120). Les états 0 à 5 ne bougent pas (empreintes 2f47b641 et b79785c9).

**Logique pure** (`/*brx:pur*/`) : `brxRefusEmprunt` (relique, ultime, genre, renfort, sans arme) et `brxEmpruntables` (`T` = familles, genres, rangs max, `souvenirs-brume.js`) ; `brxPoidsEmprunt` ; `brxEmprunts` (tirage à graine `desRng`, sans remise tant qu'il en reste puis tout le pool à nouveau, jamais deux fois de suite la même famille s'il en reste une autre, d'une boucle à l'autre aussi ; `premier` : le talent, sinon le plus lourd de sa famille, sinon rien) ; `brxEtapesEmprunt` (par les fonctions pures des armes de la Brume passées en argument, `sbEtapes` et `sbCharge` : variantes gardées seulement, variantes ignorées retirées des étapes, `chargeS` relevé pour que `sbCharge` ne rende jamais moins que le plancher, dégâts du porteur = 11 / échelle d'acte) ; `brxPasse` (comme `brxRuee`, origine au corps, largeur 2 r, son corps s'arrête à r du bord), `brxReverence`, `brxReverenceOk`, `brxVolte`, `brxVariantesIV` (les variantes que `brxPlacer` essaie) ; `brxFiltreAire` (≤ 30 % de l'aire libre de l'état IV, les plus éloignées du centre d'abord) ; `brxPlafondDs` (le plafond de `dsPlafond` avec le crochet `e.pvPlaf18`) ; `brxPointChute` ; `brxDefaitable` (de la prise au coup de la dernière étape) ; `brxEmpOk` ; sauvegarde : champ facultatif `emp:{4:{id, fam}}` (seulement quand la mort de la phase est `emprunt` ; id court, famille connue de `souvenirs-brume.js` quand on la donne à `brxLireSauve` / `brxNoter`) ; `vus` garde aussi `emprunt:<famille>` (`brxVu`) ; toujours `v:1`.

**Jeu** (section « v18.9 · Phase IV » du bloc v18.5, juste avant l'essai) :
- **Le corps** : r 48, cuit par forme et par état (normal, terni) dans `G27.image` : ombre et manteau dans 1,15 × r, traîne et fils au sol au-delà sous 35 % (0,18 et 0,18 superposés), capuchon, masque à ta couleur (`G27.copie()`) et à l'emblème de ta forme (`embleme` de la Mère-Brume, exporté), yeux pâles, croix de manipulation à la ceinture, cœur deviné sous le capuchon ; par-dessus, sa main tournée vers toi et, après une défaite, la fêlure de braise. Point faible : son cœur (0,25 × r au-dessus du centre, `faible()` enveloppé) ; l'entité frappable est son corps. Il marche à 120 px/s en gardant 180 à 280 px de toi, s'approche (× 1,3) pour la Révérence et pendant l'attente d'une étape au contact, reste immobile pendant un geste au corps qui charge, une étape posée sur lui ou la course de la Passe ; ton héros ne traverse pas son corps (repoussé, sans dégât) ; aucun dégât de contact.
- **L'emprunt** (`emprunter`) : le talent tiré pour cette mesure (s'il est encore porté et empruntable, sinon la mesure saute), ses étapes (`brxEtapesEmprunt`), sa force par rang et gravure (`assemble.souvenir`) ; un **porteur fantôme** `brx18e` (hors d'`enemies`, `sansContact`, collé à son corps, mené par `__asm.sb.maj` enraciné : la file d'étapes du Masqué, `sbPlacer` avec ton rayon et ta vitesse, son corps pour obstacle par `er`) ; la prise (0,6 s : fil lavande, icône de la famille cerclée de lavande, liseré `.emp18` de la tuile), puis l'arme, puis **épuisé** (masque terni, anneau ivoire, à nu 2 s) ; aucune étape chargée (toutes renoncées, toutes sautées) : la mesure saute. Une ruée empruntée déplace son corps avec le porteur et se brise sur une construction comme la Passe.
- **Signe** : chaque étape est une source de signe à part entière (de son chargement à la fin de ce qu'elle a lâché, `sources` enveloppé) ; un coup venu du porteur (zone, onde, ruée, projectile) est jugé par `XA.coup` sur la source de son étape, au préavis du boss ; « ce qui t'a tué » : `emprunt` et `X.tueEmp` ; ses tirs portent la grammaire des tirs (`boss`, `TELE.proj`), ses ondes l'orange au liseré lavande (`fo18`, `ed18`) ; ses zones sont dessinées par `drawZone` du Masqué avec `ZCOL` (orange `TELE.zone`, liseré lavande plein de 2 px).
- **Le Dernier Souvenir** : de la prise au coup de la dernière étape, brûler le talent emprunté défait la copie au pas suivant (avant toute zone) : la zone qui charge se dissout en 0,3 s sans frapper (braises ; mouvements réduits : un fondu), ses ondes et ses tirs disparaissent, les étapes sont annulées, l'icône s'embrase et tombe, le masque se fend ; à nu 4 s ; un coup d'une copie défaite est refusé ; l'embrasement joue normalement sur lui, en fort. Le plafond se calcule sur `e.pvPlaf18` (les PV de la phase en cours, posé à l'entrée et à chaque transition, dans ses cinq phases).
- **Gestes** : `lancer` enveloppé pour les trois (`brxVariantesIV`, `brxPlacer` avec son corps pour obstacle) ; la Passe : à son coup, son corps parcourt le couloir en 0,45 s, se brise s'il a été coupé (sonné 2 s, un palier de fissure, `briser`) ; la Révérence : approche (`revPas`), puis le cône à 152 px, ou renoncement à 2 s (mesure sautée) ; un geste sans sortie saute (entracte réduit).
- **Transitions** : III → IV : à 0,6 s, il tombe (0,8 s ; mouvements réduits : un fondu sur place) sur `brxPointChute` (bornes de l'état 6, relié à toi, hors des constructions et de l'île d'une douve, à 200 px de toi au moins) ; bascule à 240 px/s ; les constructions passent `brxFiltreBornes` puis `brxFiltreAire` (retirées en brume) ; le calque de l'état 6 est peint une tuile par image pendant la phase III. IV → V : la copie en cours s'arrête sans fenêtre (zone dissoute sans coup, liseré effacé), le masque reste (le corps de la phase V est le même), `X.emp.joues` est gardé pour 5f ; sa mort arrête aussi la copie.
- **Bot** (`bot=2`) : pendant une étape d'emprunt, il va à la sortie calculée par la file (`B.fuiteQ`), comme le Reflet du Glas.
- **Essai** : `?brumeux=4[&portes=id[:rang[:g]],…][&emp=<id>][&ds=1]` (`portes` par `__dernier.prendre`, `emp` force le premier emprunt, `ds=1` active la braise et désigne `emp`) ; console `__brumeux` : `emprunter(id)` (le prochain emprunt), `defaire()`, `etat().emp` ; `statsRun` gagne `emprunt`.

**Retouches hors du bloc** (chacune inerte hors du combat du Brumeux, prouvée par `banc-brumeux` G et les simulateurs) : bloc du Masqué : `drawZone(c,z,k,fl,col)` et `sbDessinProj(c,z,k,e,col)` (couleur facultative ; sans elle, les mêmes chaînes qu'avant), `drawRings` (`g.fo18`, `g.ed18`), exports `__asm.sb.maj`, `.zone`, `.proj`, `.sbDans`, `.sbVerrou` et `__asm.zr` ; bloc de la Mémoire : `reste()` et `__dernier.plafondDe` lisent `e.pvPlaf18||e.maxHp`, `renderMem` lit le crochet `window.__emp18` (nul hors de son combat) et pose la classe `emp18` (contour lavande, sans texte, sans animation), `window.__memRender` ; bloc v18.4 : vitesse de bascule `transformation.parEtat[id de l'état d'arrivée]` (sans entrée : `DA.transformation` tel quel) ; bloc de la Mère-Brume : `embleme` exporté dans `__gardiens.mere` ; socle v18.5 : `noter` écrit `emp`, `sauveLire` et `brxNoter` reçoivent les familles de `souvenirs-brume.js`.

**Écarts de l'implémentation** (validés avec la fiche 5f, le 5 novembre 2026) :
1. Le porteur fantôme est un objet `brx18e` (ni boss ni Masqué) mené par `sbMaj` **enraciné** : c'est la marche du Brumeux qui le porte (approche × 1,3 pendant l'attente d'une étape au contact), pas le `move` du Masqué ; pendant une ruée empruntée, son corps suit le porteur.
2. Le plancher de chargement (0,8 s, +0,3 s) est tenu en relevant `chargeS` des étapes copiées (`brxEtapesEmprunt`) : `sbCharge` le rend tel quel (5d prolongeait un chargement trop court).
3. Un emprunt dont aucune étape n'a chargé (renoncement faute d'approche, ou toutes sautées) n'ouvre pas de fenêtre à nu : la mesure saute (compté « renoncé »).
4. La Volte : la brèche est d'abord orientée à graine, puis vers toi, puis à ±0,6 rad de toi (variantes de `brxPlacer`) ; la sortie « contre lui » (sous 70 px de son centre) n'existe que pour un rayon de joueur d'au plus 14 à 15 px (son corps fait 48 + ton rayon) : pour un Gouffre grossi, ce sont la brèche et l'au-delà qui garantissent la sortie.
5. La Passe est un couloir aux bouts ronds (`brxDans`) : son bout d'arrivée est dessiné arrondi (rien ne frappe hors du dessin) ; son corps s'arrête à r du bord de l'arène.
6. Les tirs d'un emprunt sont dessinés comme les siens (grammaire des tirs, `boss`) et ses ondes orange au liseré lavande ; la trajectoire annoncée d'une étape de projectiles est orange au liseré lavande (`sbDessinProj` avec couleur).
7. Le premier emprunt est réglé à la première boucle de la phase ; le talent forcé par l'essai (`emp`) passe avant celui de la sauvegarde.
8. Un trophée porté reste empruntable (la fiche ne l'exclut pas ; la brûlure le refuse) ; son liseré se pose aussi sur la ligne des trophées.
9. `window.__asm.zr` est maintenant exporté : `decoudre` (5d) le cherchait déjà sans le trouver, si bien que les ondes des Masqués décousus survivaient à la décousure ; elles sont retirées avec eux (changement de comportement en phase III, dans le combat du Brumeux seulement).
10. La couleur `braise` (255,214,110) est ajoutée à `brumeux.js` pour la fêlure et la dissolution (la braise du HUD, 255,154,74, tombait à moins de ΔE 25 de l'orange des zones).
11. La défaite est détectée au pas qui suit la brûlure (la brûlure se fait dans `updatePlayer`, avant les ennemis) ; un coup d'une copie défaite est en plus refusé dans `hurtPlayer`.

12. La règle de famille (« jamais deux fois de suite la même famille s'il en reste une autre ») se juge parmi les talents **pas encore tirés** de la boucle (le sans-remise passe d'abord) : quand tous les restants sont de la famille du précédent, elle cède ; la reprise de tout le pool ne vient qu'une fois la boucle épuisée. (Vérifié par `sim-brumeux` § 13 sur 10 000 tirages.)
13. `banc-brumeux` F : la phase IV ajoute environ 60 s au combat du Tisse-Destin au bot ; la limite du combat entier passe de 480 à 600 s (fenêtre de 620 s ; une passe à 477 s frôlait l'ancienne limite). Aucune phase ne dépasse toujours 200 s. A, B et D éprouvent le moteur d'essai sur la phase V (comme demandé).

**Vérification.** `sim-brumeux` : **744 vérifications, 0 échec** (5d : 642 ; section 13 : données et empreintes des états 0 à 5 inchangées, empruntables et refus, étapes copiées (plancher, variantes, dégâts), contre-épreuves, tirage sur 10 000 boucles (cas de référence gravé une fois : 84,1 % des boucles le contiennent, deux fois : 94,6 % ; la fiche disait ≈ 82 % et ≈ 93 %), justice des 14 familles × 10 000 : 339 999 étapes, 0 sautée, gestes (Passe 10 000 / Révérence 3 227 (sinon : trop loin, elle renonce) / Volte 10 000 avec sortie, sur 10 000 chacun ; 1 282 Passes coupées), plafond du Dernier Souvenir, défaite, constructions sur 10 000 phases (17 222 gardées, 1,72 par phase, 0 retirée par l'aire), point de chute, sauvegarde `emp`, branchements v18.9 et journal ; ΔE minimal des couleurs du Brumeux contre la grammaire 30,1).

**Banc** `banc-brumeux` section L (**92 vérifications, 0 échec**) : **L-A** empruntables, poids et première boucle en jeu = logique pure (même graine) ; le premier emprunt rejoue la copie qui t'a tué (`emp`), sinon le plus lourd de sa famille ; variantes gardées, perçant ignoré ; **L-B** corps r 48 plein dans 1,15 × r (0 pixel plein au-delà), point faible au cœur, caméra fixe, prise (0,6 s, liseré de tuile), zones orange au liseré lavande de 2 px, aucune étape sous 0,8 s, épuisé (à nu 2,00 s), Passe brisée sur une muraille (sonné 2 s), Révérence (approche de 320 à 152 px puis cône ; renoncement à 2 s), Volte ; immobile sous cinq copies : 8 coups d'emprunt, tous jugés signalés ; « ce qui t'a tué » ; mémoire sans empruntable (6 emprunts sautés en 40 s) ; calque de l'état 6 peint pendant III ; III → IV (décousus, chute à 289 px, bascule ≤ 240 px/s, constructions 5 → 3) ; IV → V (copie arrêtée sans fenêtre, `joues` gardé) ; **L-C** brûlure pendant la prise (à nu 3,98 s, 0 coup après) et pendant une étape qui charge (zone dissoute, 0 coup), plafond sur les PV de la phase (2 400), autre talent brûlé : copie intacte, talent brûlé jamais réemprunté, gardien de l'acte III et Masqué : plafond d'avant ; **L-D** huit combats au bot : phase IV finie en 8 / 9 s (Lumenarque), 30 / 24 s (Gouffre, Difficile), 9 / 14 s (Héraut, Extrême), 58 / 56 s (Tisse-Destin) ; 1 à 5 emprunts, 2 à 7 étapes ; phase tenue 90 s dans chaque forme : 5 à 8 coups reçus, 6 à 7 emprunts, 13 à 14 étapes ; **0 coup sans signe** partout ; **L-E** coût apparié +0,70 ms (médiane ; +0,6 à +0,8, ≤ +1,5) avec une copie qui charge et trois constructions ; peinture à l'entrée d'un essai en IV 92 ms (≤ 250) ; calque de l'état 6 une tuile par image ; **L-F** mouvements réduits (chute en fondu sur place) et captures relues (prise, copies de six familles (lame, ombre, onde, projectile, ruée, sol), épuisé et son anneau, défaite et dissolution, Passe et Passe brisée, Révérence, Volte, chute, masques des quatre formes, normaux et ternis, phase V).

**Régression (v18.9)** : simulateurs `sim-brume` 46 602, `sim-dernier` 4 021, `sim-masque` 3 583 218 contrôles, `sim-nemesis` 46 129, `sim-descente` 40 775, `sim-arene` 128, `sim-brumeux` 744 : 0 échec. Bancs : `effets` 740, `touche` 34, `essai` 43, `relecture` 12, `glas-relecture` 16, `nemesis` 99, `essai-nemesis` 15, `nemesis-complet` 46, `nemesis-revue` 17, `descente` 117, `paliers` 71, `mutations` 61, `complet` 228 : 0 échec ; `dernier` 117, les 4 échecs anciens ; `brumeux` 330 en sections (A–E 78, F–H 30, I 51, J 73, K 78, L 92 : 0 échec ; F rejouée après le relèvement de sa limite : 18, 0 échec, Tisse-Destin 462 s), G contre 7f50cb0 : 10 260 images, 0 différente ; `arene` 129 (`BANC_AVANT=7f50cb0`) : C passe (+0,20 ms ; à la première passe +1,80 ms, l'échec de charge connu), G : les deux salles des polices (sanctuaire, colporteur) dès l'image 0, dans un seul palier, trois passes sur trois ; contre-épreuves : 7f50cb0 contre lui-même, 10 260 images, 0 différente ; copie de diagnostic qui garde l'image 0 des deux salles, cinq passes : quatre identiques, la cinquième diffère par le seul texte du canevas (« Tobiah », les noms du Sanctuaire en Grenze Gotisch), et c'est l'image de **7f50cb0** qui change, celle de v18.9 restant la même à chaque passe : la tramée des polices de Chromium, pas le jeu ; `gardiens-final` seul à la fin : 223 vérifications, 1 échec (le coût du Glas Originel ×2, +2,1 ms pour +1 : l'échec intermittent connu) ; section C rejouée seule : Héraut ×2 passe (−0,02 ms), Glas ×2 +1,76 ms (même échec connu ; rien de ce qui est dessiné au Glas n'a changé en v18.9).

**Points ouverts** : (1) PV placeholders (5g) : la phase IV dure 8 à 14 s (Lumenarque, Héraut) à 56–63 s (Tisse-Destin) au bot qui frappe, pour 50 à 70 s visés ; au bot, les copies frappent peu (0 coup d'emprunt dans les huit combats : le bot suit la sortie de la file). (2) La Révérence n'a de sortie que dans un tiers des placements abstraits : ailleurs tu es trop loin et elle renonce (la mesure saute) ; à rééquilibrer en 5g si elle se voit trop peu. (3) `X.emp.joues` est gardé pour 5f (la phase V). (4) Le coût apparié de la phase IV (+0,7 ms) est à remesurer en 5g avec la vraie foule de l'acte X. (5) Un trophée porté reste empruntable (écart 8) : à confirmer. (6) `banc-arene` G lit par défaut 888578f, absent d'un clone superficiel : `BANC_AVANT=7f50cb0` le remplace (aucun changement de code) ; ses deux salles des polices diffèrent souvent dès l'image 0 (tramée du texte du canevas, d'un côté ou de l'autre) : à fiabiliser dans le banc (par exemple dessiner une fois chaque texte avant la comparaison).

## 40. Le Brumeux (v18.10), action 5f : la phase V, « L'Effacement », et sa mort (5 novembre 2026)

Fiche : `_dev/cadrages/la-brume-v18-5f-effacement-fiche.md` (et `claude/la-brume-v18-5f-effacement-fiche.md` dans le projet), **validée le 5 novembre 2026 : toute la fiche** (recommandations, les dix-huit écarts au cadrage du § 11, et les 13 écarts d'implémentation de 5e du § 12, qui restent tels quels). Implémentée en une fois (Opus 5.5, élevé). Règle d'or : l'arène reste **éteinte** (`arene.js`, `actif:false`), le boss final provisoire tient sa place ; seul `?brumeux=5` (ou une transition depuis la phase IV d'un essai) ouvre la phase V. Secret : ni le wiki ni le journal ne disent ce qu'il fait en V ni que l'arène se resserre (ligne de journal v18.10 : « Préparation du combat final : le Brumeux répète en coulisses. Il ne t'attend pas encore au fond : rien ne change en jeu. »).

**Données** (`data/brumeux.js`) : `phases[4].arene:6` (la phase V garde l'état de la IV) ; `partition.effacement` : `mesures` (la phase **courte**, Normal et Difficile : éclair · double · effondrement · montage · double · emprunt) et `entiere` (l'**Extrême** : éclair · double · libre · effondrement · montage · libre · double · emprunt · libre), `entracteS` 1,0, `nuS` 0, `sauteS` 0,6 ; le bloc `effacement` : `nuS` 2,0 (à nu après chacun des quatre gestes), `eclair` (accroche 0,8, vie ≤ 8, rideau 0,6, `part` 0,5 des bornes, retrait 30, places à 230 px, budget 2 / 2 / 3), `montage` (2,6 s, un fil, au plus un cousu vivant), `feinte` (deux, la seconde 0,3 s après la fin de la première), `resserrements` (seuils 2/3 et 1/3 des PV de la phase, états 7 et 8, bras levés 0,6 s, marge 40 px), `pan` (150 × 320, décalages 0, ±80, 160 le long du bord), `fosse` (0,5 s), `libres` (poids 2, menace 3 pour un geste signature), `mort` (3 s, fondu 1 s en mouvements réduits, brume 0,6) ; `dessin.version` 6. `data/arene.js` : `effacement` **en index 7** (bornes 0,2876–0,7124 × 0,2246–0,7754 : 1 040 × 520) et `effacement-2` **en index 8** (0,3121–0,6879 × 0,2564–0,7436 : 920 × 460), au centre du monde (la caméra reste fixe), sol pierre, ni obstacle ni fosse, `tard`, brume de décor plus grosse et plus dense à chaque resserrement, hors des bornes. Les états 0 à 6 ne bougent pas (empreinte a27df5c7).

**Logique pure** (`/*brx:pur*/`) : `brxPartition(D, phase, o)` et `brxMesures` reçoivent `o = {palier, essai}` (la partition entière au palier dont la phase V est entière ; `essai` rejoue la partition d'essai de 5a ; sans `o`, comme avant) et `brxBoucle` les passe ; `BRX_SIGN` (les douze gestes signature et leur phase d'origine), `BRX_V5` (geste → élément de la sauvegarde) ; `brxMontre` (copie propre du journal) ; `brxCandidatsV` (la règle commune : phase d'origine jamais jouée → repli, tiré comme dans sa phase ; jouée sans rien laisser → saute ; sinon le candidat : le décor qui t'a fait le plus de dégâts en I, sinon le dernier accroché ; le cousu qui t'a fait le plus de dégâts en III, sinon le dernier cousu, sinon le premier fil ; les talents empruntés en IV encore portés et empruntables ; le détail de ce qui t'a tué en V choisit s'il a été montré ; un cousu vivant : le montage saute) ; `brxPremierV` (la boucle tourne pour commencer par le geste qui t'a tué en V) ; `brxEclairFrag`, `brxEclair` (vague seule, budget du palier, densités tant qu'il reste) ; `brxPanGeo`, `brxPanBord`, `brxEffondreV` (la construction effondrable la plus proche avec une sortie, la sorte de `bati[5]` d'abord ; aucune effondrable debout : un pan du bord ; aucune avec une sortie : saute) ; `brxFosse` ; `brxVariantesV`, `brxSortieV`, `brxPlacerV` (les gestes signature lancés en V : les variantes de leur phase, deux coups pour la Toile et le Dé, le vol des Aiguilles) ; `brxLibreV`, `brxLibresV` (montrés seulement, poids × (1 + 2 × part de `X.parC`), budget de la phase × palier, −2 par cousu vivant, non-cumul) ; `brxResserrement` (PV seulement), `brxResserrePret`, `brxFiltreV` ; `brxPvCousu` et `brxPvNoeud` prennent la phase (`ph`, 2 par défaut). La sauvegarde ne change pas (v:1, aucun champ neuf).

**Jeu** (section « v18.10 · Phase V » du bloc v18.5, juste avant l'essai) :
- **Le journal du combat** : `X.montre` (phases jouées ; tableaux accrochés en I et les dégâts que chacun t'a faits ; fils de III avec leur assemblage, leur souvenir, leurs dégâts et s'ils ont abouti ; talents empruntés en IV ; éléments et gestes chargés) et `X.parC` (dégâts reçus par élément dans ce combat), tenus par des enveloppes d'`accrocher`, `lancerFil`, `emprunter`, `hurtPlayer` et par le pas ; rien du combat ne change.
- **La partition** : courte ou entière selon le palier (`partO`) ; la première boucle commence par le geste qui t'a tué en V (`brxPremierV`) ; un Masqué cousu en train de frapper passe d'abord (non-cumul de 5d, 1,5 s au plus).
- **Le tableau éclair** (`eclairV`, `eclairPas`) : la moitié des bornes la plus loin de toi ; le sol du décor, cuit une fois à la taille du plus grand fragment (l'état 6) par les peintres de la phase I (`solDecor`, autre graine), un décor par image pendant la transition IV → V (ou à l'entrée d'un essai en V), recadré à l'accroche ; cadre et drapé tracés à la taille du fragment (`dessinTableau` enveloppé) ; les constructions sous le fragment redessinées par-dessus ; une vague seule (places dans le fragment, à 230 px) ; vidée : rideau, à nu 2 s ; non vidée à 8 s : ses ennemis rentrent, rideau sans fenêtre.
- **La feinte double** (`doubleV`) : deux feintes v14 à la suite, vraies ou fausses à la graine du combat, la seconde 0,3 s après la fin de la première ; une feinte dont le disque ne laisse aucune sortie à pied saute ; aucune fenêtre après.
- **L'effondrement** (`effondreV`) : `brxEffondreV` ; une construction tombe (sa chute de 5c, 1,4 s + 0,3 à la première rencontre, 16 dégâts, ses ennemis dessous × 2), puis s'enfonce (0,5 s) et devient des piliers `fosse18` de mêmes disques (`fosse5`, survivent aux transformations, dessinés ourlés de leur matière) ; sans construction effondrable : un pan du bord (couloir de 150 × 320 du bord le plus proche, une pierre qui penche, son bout intérieur arrondi, sans fosse) ; à nu 2 s.
- **Le montage court** (`montageV`) : un fil `v5` (montage 2,6 s, `f.dureeS`, le montage du Masqué accéléré), nœud et cousu en part des PV de la phase V (30 / 60 et 180 / 360 × le corps) ; coupé : à nu 2 s, un bout pend de sa ceinture ; abouti : à nu 2 s ; le fil part de sa croix, à la ceinture.
- **L'emprunt** (`empruntV`) : `brxEmprunts` sur les candidats (un par mesure, jamais deux fois de suite la même famille s'il en reste une autre), puis `emprunter` et tout le reste de 5e (prise, porteur fantôme, zones orange au liseré lavande, épuisé 2 s, défait 4 s).
- **Les libres** (Extrême) : `brxLibresV` à chaque mesure libre ; un geste signature passe par `brxVariantesV` / `brxPlacerV`, depuis son corps, son corps pour obstacle ; la Passe, la Révérence et la Volte par la section v18.9.
- **Les resserrements** : dus aux PV de la phase V seulement ; il attend la fin de la mesure (`brxResserrePret`) ; un cousu attend dès qu'un resserrement est dû ; il s'arrête, lève les bras (0,6 s), son masque se fend (une fêlure de braise, puis deux), puis `XA.vers(7|8)` (annonce, bascule à 120 px/s, sans dégât) ; à la bascule, `filtrerV` efface en brume ce qui ne tient plus (constructions et fosses) ; compté comme un entracte.
- **Sa présence** : la marche de la phase IV (120 px/s, 180 à 280 px), immobile pendant un resserrement, gardé dans les bornes ; la brume qui monte de son manteau (cuite une fois, au-delà de 1,15 × r sous 35 %).
- **Sa mort** (`mort` enveloppé) : la scène de 3 s (`X.scene.v5`, `dureeS`) : le masque se détache, tombe, se brise en deux (braise) ; la croix tombe ; les fils se rompent ; le corps sans masque (`imgCorps(…, 'm')`) se défait du bas vers le haut, le cœur s'éteint en dernier ; l'arène redevient brume (calque cuit une fois, depuis sa place, 0,6), les constructions et les fosses fondent, les bords pâlissent, une lumière pâle monte de sa place ; masque brisé et croix restent au sol (`X.eff.debris`). Mouvements réduits : un fondu d'1 s, masque et croix posés sans chute.
- **Essai** : `?brumeux=5[&montre=tab:<décor>[/<thème>],cou:<talent|->,emp:<talent>,el:<élément>,joue:<phase>][&essai=1]` (`montre` : ce que le combat aurait montré ; `essai=1` : la partition d'essai de 5a, rien de cette section ne joue) ; console `__brumeux` : `etat().eff`, `resserrer()`, `montrer({…})`, `mourir()` ; `statsRun` gagne `effacement`.

**Retouches hors de la section** (dans le bloc v18.5, chacune inerte hors de la phase V, prouvée par les simulateurs et `banc-brumeux` G) : socle : `partO` (`ent`, `mesure`, `boucleNeuve` lisent la partition au palier), `vers` n'efface plus les constructions en entrant en V, `bloque` lit `X.corpsV` (son corps, en V seulement), la scène dure `X.scene.dureeS || 2,2`, `dessinZones` laisse la scène de V à sa section, l'état de la boucle affiche les mesures de V ; v18.6 : `solDecor` (le peintre du sol d'un décor, extrait de `cuire`, même peinture) et `garderAnneau` (écart 19 : `rentrer`, `rentrerV` et le départ des Manœuvres retirent aussi l'onde sans auteur de l'ennemi qui part) ; v18.8 : `couPas` (durée par fil) ; v18.9 : les crochets de la phase IV (`presence`, `pas`, `__emp18`, `clochePas`, `pilote2`) valent aussi pour `enV()`, `marcheIV` immobile pendant un resserrement, `imgCorps` gagne l'état `m`. Hors du bloc du Brumeux, une seule ligne, dans le bloc v18.4 (écart 20) : le journal de l'arène fait hériter une onde du signe de l'ennemi qui l'a poussée (journal seulement, `CAM.on` seulement ; `banc-brumeux` G : 10 260 images, 0 différente).

**Écarts de l'implémentation** (validés par l'auteur le 5 novembre 2026, tous les vingt, avant la fiche 5g) :
1. **Repli des libres** : un élément libre de 5a reste tirable si aucune des phases I à IV n'a été jouée (essai direct en V) ; un geste signature dont la phase n'a jamais été jouée passe par le repli (tiré comme dans sa phase), comme les quatre gestes.
2. **`mort[5]`** : la règle de 5a (ce qui t'a tué en V ouvre chaque libre) vaut aussi pour les gestes signature tirés en libre.
3. **Filtre d'un resserrement** : marge de 40 px (`placement.bord`) autour des bornes neuves ; pour la connexité, ta position est ramenée dans les bornes neuves (sinon une construction gardée pouvait être jugée sur un point dehors).
4. **Fosses de V** : filtrées comme les constructions à chaque resserrement (effacées en brume si elles ne tiennent plus) ; une construction brisée avant la fin de sa chute ne laisse pas de fosse.
5. **Feinte double** : une feinte dont le disque ne laisse aucune sortie à pied saute (≈ 0,01 % des feintes dans l'état 8 au simulateur, toléré à 0,1 %) ; vraie ou fausse se tire à la graine du combat, après `startBluff`.
6. **Cousu et resserrement** : un Masqué cousu attend dès qu'un resserrement est dû (`X.eff.dueT`), pas seulement pendant (sinon le resserrement attendait jusqu'à 8 s la fin de ses attaques).
7. **Sol de l'éclair** : cuit une fois à la taille du plus grand fragment (l'état 6) par `solDecor` (le peintre de la phase I extrait de `cuire`, même peinture), avec une autre graine, puis recadré ; cadre et drapé tracés, non cuits ; les constructions sous le fragment sont redessinées par-dessus.
8. **Cuisson de l'éclair** : un décor par image pendant la transition IV → V, ou à l'entrée d'un essai en V (pas de cuisson au moment de l'accroche).
9. **Éclair non vidé à 8 s** : ses ennemis rentrent avec ce qu'ils ont lancé, rideau sans fenêtre (règle de la phase I) ; sont « de l'éclair » tous les ennemis qui ne sont ni le Brumeux, ni une construction, ni un cousu.
10. **Montage court** : le montage du Masqué est accéléré (3,85 → 2,6 s, `f.dureeS`) plutôt que raccourci ; PV du cousu et du nœud recalculés sur les PV de la phase V (`brxPvCousu` / `brxPvNoeud` prennent la phase).
11. **Le fil de V** part de sa croix, à la ceinture ; coupé, son bout pend de la ceinture.
12. **Pan du bord** : une pierre qui penche est dessinée, son bout intérieur arrondi ; tué par un pan, « ce qui t'a tué » est l'effondrement (sans `bati`).
13. **Son corps** est un obstacle pour toutes les sorties en V, libres de 5a comprises (`X.corpsV`, lu par `bloque`).
14. **Sa marche en V** est celle de la phase IV ; immobile pendant un resserrement ; gardé dans les bornes.
15. **Sa mort** : une lumière pâle monte de sa place (sans elle la scène était illisible) ; le corps sans masque (état `m` d'`imgCorps`) ; la brume reste après la scène, avec le masque brisé et la croix au sol.
16. **`essai=1`** : la partition d'essai de 5a ; rien de la section v18.10 ne joue, sauf la brume de son manteau et la scène de mort de V.
17. **Banc** : `TAIRE` abandonne aussi l'éclair, le geste et l'emprunt en cours (sinon un resserrement restait bloqué derrière un éclair figé) ; J-B pose une muraille dans les bornes de IV quand aucune construction n'y tenait (la persistance en V se lisait sur rien).
18. **Simulateur** : plus long (≈ 30 min sur deux cœurs chargés ; `SIM_TEMPS=1` affiche le temps par section).
19. **Ondes sans auteur** (trouvé par la régression, M-D Gouffre) : le cri d'un Hurleur (`rings.push` de la v1, sans `g.src`) frappait encore 0,5 s après que le Hurleur était rentré dans l'éclair : un coup sans signe. `garderAnneau(S)` (section v18.6, près de `rentrer`) retire aussi l'onde sans auteur dont l'ennemi le plus proche de son centre, à 120 px (la règle du journal de l'arène), vient de rentrer ; elle sert à `rentrer` (phase I), `rentrerV` (V) et au départ des Manœuvres (II → III). Avant : 1 coup sans signe sur 2 essais du Gouffre ; après : 0 sur 4 graines.
20. **Journal de l'arène** (bloc v18.4, journal seulement, comme l'héritage des tirs de v18.8) : une onde hérite du signe de l'ennemi qui l'a poussée (`A.parent`, noté à sa naissance) ; un Hurleur tué juste après son cri laisse une onde signalée.

**Vérification.** `sim-brumeux` : **839 vérifications, 0 échec** (5e : 744 ; section 14 : données (partitions courte et entière, bloc `effacement`, états 7 et 8 au pixel de la fiche, empreinte des états 0 à 6 inchangée a27df5c7), partitions par palier, premier geste (`brxPremierV`), candidats sur 10 000 combats tirés (éclair : montré 5 235, repli 3 044, saute 1 721 ; montage : montré 4 445, repli 2 486, saute 3 069 ; emprunt : montré 6 273, repli 2 995, saute 732), éclair sur 10 000 (100 % des places à 230 px au moins), libres sur 10 000 (jamais un élément non montré, non-cumul, budget), **justice dans l'état 8** (920 × 460) : 339 999 étapes, 16 sautées, au plus **0,04 %** par famille (onde ; ombre 0,02, sol 0,01, les autres 0) : sous le 1 %, l'état 8 garde 920 × 460 ; les douze gestes signature placés dans l'état 8 (Fils, Cadre, Toile, Surjet, Aiguilles, Passe, Volte 10 000 / 10 000 ; Ruée 9 998, Équerre 9 997, Dé 9 997, Truelle 9 989 ; Révérence 3 787 / 3 788, sinon trop loin, elle renonce) ; feinte double dans l'état 8 : 1 sautée sur 9 241 (sans sortie à pied) ; effondrement et pan, fosses, resserrements sur 10 000 phases (43 251 constructions gardées, 17 933 effacées) ; plafond du Dernier Souvenir (48 / 96 en courte, 96 / 192 en entière) ; PV du montage ; sauvegarde inchangée ; branchements v18.10 et journal ; contre-épreuves de la fiche (chacune fait échouer sa vérification) ; ΔE minimal des couleurs du Brumeux contre la grammaire 30,1).

**Banc** `banc-brumeux` section M (**89 vérifications, 0 échec**) : **M-A** (7) ce qui t'a tué en V ouvre la boucle ; montage, éclair, emprunt et six mesures libres en jeu = la logique pure (même graine, même `X.montre`, même `X.parC`) ; jamais un élément non montré ; **M-B** (22) partitions courte et entière ; éclair (le décor accroché en I, la moitié des bornes la plus loin, une vague de 12 dans le fragment ; vidé : rideau, à nu 2 s ; non vidé à 8,8 s : ses ennemis rentrent, sans fenêtre) ; effondrement d'une muraille (préavis 1,7 s à la première rencontre) puis 9 fosses que les tirs traversent ; pan du bord (150 × 320, 1 coup, 0 sans signe, « effondrement ») ; montage court coupé (nœud 30 PV) et abouti en 2,63 s (cousu 198 PV ; un second montage, un cousu vivant : sauté) ; feinte double (deux à la suite, jamais à la fois, aucune fenêtre) ; IV → V (état 6 gardé, au sol, constructions debout, plafond du Dernier Souvenir sur 1 200) ; emprunt de V pris dans ce qu'il a emprunté en IV ; premier resserrement après la fin de la feinte double (2,40 → 2,45 s), 1 040 × 520, poussé sans dégât, il ne lance rien ; second à 1/3 : 920 × 460, masque fendu deux fois ; ce qui ne tient plus s'efface ; 60 s au-dessus de 2/3 : aucun resserrement, 16 coups, 0 sans signe ; **M-C** (5) brûler le talent emprunté défait la copie (à nu 3,98 s, aucun coup ensuite), plafond tenu, cousu d'un montage court promu (acte III, salle 3), le Brumeux ne promeut personne ; **M-D** (42) huit combats au bot (quatre formes, courte et entière) : phase V finie en 6 / 10 s (Lumenarque), 17 / 25 s (Gouffre), 6 / 10 s (Héraut), 36 / 82 s (Tisse-Destin) ; phase tenue 90 s dans chaque forme (4 à 27 coups, tous les gestes joués) ; combat entier depuis la phase I (Gouffre, Extrême) : victoire, 23 / 24 / 15 / 28 / 21 s, ce que le combat a montré relu en V ; **0 coup sans signe** partout (après l'écart 19) ; **M-E** (5) coût apparié **+1,30 ms** (médiane ; +1,0 à +1,7 ; ≤ +1,5 ; état 8, une construction, une vague d'éclair, un cousu, foule 25, masque fendu deux fois), entrée d'un essai en V 116,5 ms (≤ 250), calques des états 7 puis 8 une tuile par image pendant IV ; **M-F** (8) captures relues (éclair et son accroche, effondrement, fosse qui s'enfonce et fosse, pan, montage, emprunt, feinte double, bras levés, deux resserrements, mort à 0,1 / 0,5 / 0,9 / 1,8 / 3,2 s), mouvements réduits (mort en fondu d'1 s, débris au sol).

**Régression (v18.10)** : simulateurs `sim-brume` 46 602, `sim-dernier` 4 021, `sim-masque` 3 583 218 contrôles, `sim-nemesis` 46 129, `sim-descente` 40 775, `sim-arene` 128, `sim-brumeux` 839 : 0 échec (`sim-brumeux` : une première passe complète à 838, 0 échec, puis la vérification de `garderAnneau` ajoutée ; une passe intermédiaire arrêtée à son premier échec, l'ancien texte de `rentrer` cherché par le branchement (5b), corrigé). Bancs : `effets` 740, `touche` 34, `essai` 43, `relecture` 12, `glas-relecture` 16, `nemesis` 99, `essai-nemesis` 15, `nemesis-complet` 46, `nemesis-revue` 17, `descente` 117, `paliers` 71, `mutations` 61 : 0 échec ; `complet` 228 : 2 échecs (« sablier sur la tuile pendant l'effet », gou/aby_sk et tis/mdp_sk : une attente à l'horloge murale, pendant que `sim-brumeux` tournait), section A rejouée seule : 154, 0 échec ; `dernier` 117 : les 4 échecs anciens (« inerte tant que dernier.actif est faux ») ; `brumeux` **471** (A 10, B 14, C 16, D 11, E 15, F 16, G 1, H 11, I 49, J 73, K 76, L 90, M 89 : 0 échec à la dernière passe de chaque section), en trois passes (complète : 471, 4 échecs : J-B (persistance en V lue sur zéro construction : le banc pose désormais une muraille dans les bornes de IV), K-E +1,60 ms (pendant `sim-brumeux` ; rejouée : +1,30), M-D Gouffre ×2 (un coup sans signe : l'onde d'un Hurleur rentré, écart 19, corrigé) ; puis C, G, J, K, M : 255, 1 échec (J-B, la muraille posée hors des bornes au premier essai) ; J seule : 73, 0 échec à la troisième passe (J-E « assemblage d'une construction » : 4,3 puis 3,1 ms pour ≤ 3, puis 2,4 : une mesure du pire cas, bruitée, sur du code de 5c que 5f ne touche pas) ; puis A, B, D, E, F, H, I, L : 218, 0 échec), G contre 0899b5e : 10 260 images, 0 différente ; `arene` 129 (`BANC_AVANT=0899b5e`) : G passe (10 260 images, 0 différente, les deux salles des polices comprises), C échoue (+2,30 ms ; l'échec de charge connu) ; C rejouée seule six fois : +3,10, +3,40, +1,10, +3,10, +3,50, +1,20, et sur 0899b5e servi à côté, neuf fois : +1,30, +1,40, +1,90, +1,10, +2,70, +2,50, +1,90, +1,20, +0,70 ; mesure directe du rendu de l'arène pleine, pages alternées dans un même Chromium (0899b5e, v18.10, v18.10 avec l'`arene.js` d'avant) : l'écart change de signe d'une passe à l'autre (v18.10 −1,0 à +1,1 ms contre 0899b5e ; v18.10 −1,0 à +0,7 contre la copie sans les états 7 et 8) : rien de ce que v18.10 change ne tourne hors du combat du Brumeux (toutes les enveloppes de la section lisent `X.on`), le bruit de la machine domine ; à remesurer sur une machine calme ; `gardiens-final` seul à la fin : 223 vérifications, 1 échec (le coût du Glas Originel ×2, +2,27 ms pour +1 : l'échec intermittent connu) ; section C rejouée seule deux fois : Glas ×2 +1,08 puis +1,83 ms (même échec connu ; rien de ce qui est dessiné au Glas n'a changé en v18.10), Mère-Brume ×1 +1,31 ms d'image entière à la première (parties en place −0,10 ms), +0,87 à la seconde (passe).

**Points ouverts** : (1) PV placeholders (5g) : au bot qui frappe, la phase V dure 6 à 36 s en courte et 10 à 82 s en entière (Tisse-Destin la plus longue), pour 25–35 s et 50–70 s visés. (2) En essai direct (`?brumeux=5`), aucune construction n'est debout : l'effondrement est toujours un pan du bord ; l'effondrement d'une construction se voit dans un combat entier ou après `?brumeux=2…4`. (3) Le coût apparié de la phase V (+1,3 ms, sous la limite de +1,5) est à remesurer en 5g avec la vraie foule de l'acte X ; il est proche de la limite. (4) La Révérence n'a de sortie que dans un tiers des placements, dans l'état 8 comme dans l'état 6 : elle renonce souvent. (5) Les captures du banc gardent le bandeau d'entrée et, en Extrême, les sceaux des mutations : M-F prend le palier Normal et retire le bandeau. (6) Les écarts 19 et 20 touchent la phase I et le journal de l'arène (onde d'un Hurleur) : validés avec les autres le 5 novembre 2026. (7) `sim-brumeux` dure environ 30 minutes : à découper par section en 5g si besoin (`SIM_TEMPS=1` donne le temps par section). (8) `banc-arene` C échoue plus souvent qu'avant (six passes : trois au-dessus de +1,5 ms) sans écart mesurable par la comparaison directe des pages : à remesurer sur une machine calme, ou à stabiliser dans le banc (plus d'images par série).

## 41. Le Brumeux (v18.11), action 5g-1 : le build de référence, les PV au bot et la règle des formes hors des cibles (5 novembre 2026)

Fiche : `_dev/cadrages/la-brume-v18-5g-enchainement-fiche.md` (et `claude/la-brume-v18-5g-enchainement-fiche.md` dans le projet), **validée le 5 novembre 2026** par l'auteur (« Go 5g 1 2 et 5h » : toutes les recommandations, phrase B du wiki). 5g-1 est la première moitié de l'action 5g (§ 2 de la fiche, et les points ouverts du § 7 qui en dépendent). Règle d'or : l'arène reste **éteinte** (`actif:false`) ; tout ce qui change ici ne joue que dans un essai `?brumeux=` (le build de référence, le mannequin, le bot) ou dans le journal de l'arène (sous `CAM.on`) ; les PV et les parts de la Couture sont des données du combat final, que la descente ne voit pas encore.

**Le build de référence** (`brumeux.js`, `bot.reference`, essai `ref=1`, console `__brumeux.reference(cls)`) : niveau **57**, la médiane du niveau atteint à l'entrée de l'acte X par une descente purgée comme `banc-descente` A (`mesure-brumeux.mjs niveau` : Lumenarque 59, Gouffre 58, Héraut 57, Tisse-Destin 57 ; tout est tué, portes de combat d'abord) ; dix talents portés au rang max : la sous-classe principale (Soleil Noir, Saint Dévorant, Dernier Glas, Grande Tisseuse) dans l'ordre de l'arbre, puis les quatre premiers nœuds de la branche principale voisine (angle 45 : Fanal, Régurgitation, Requiem, Pantins), soit 22 rangs pour 56 niveaux gagnés (ni gravure, ni relique, ni pacte : une marge, un vrai joueur au niveau 57 a tout gravé) ; un objet commun par emplacement (lame, lanterne pour le Lumenarque ou pièce, gilet, amulette). **Écart de l'implémentation** : la fiche disait « dix talents de la sous-classe principale » ; une sous-classe n'en a que six, les quatre autres viennent de la branche voisine.

**Le mannequin** (essai `mannequin=1`) : il garde la présence de sa phase, ne lance rien, n'a pas de seuil (PV sans fin). DPS du bot au build de référence, 60 s par phase (`mesure-brumeux.mjs mannequin`, `MPH=1,2,3,4,5`) : Lumenarque 462 / 452 / 461 / 555 / 562 PV/s, Gouffre 250 / 252 / 246 / 335 / 329, Héraut 434 / 439 / 431 / 437 / 438, **Tisse-Destin 111 / 112 / 111 / 113 / 112**. Le kit du Tisse-Destin (et la Grande Tisseuse, une voie de contrôle) frappe **quatre fois moins** qu'un Lumenarque contre un boss seul ; au niveau 1, l'écart n'était que de 2,3.

**Le bot, l'instrument** (deux retouches, chacune vue en mesure) : (1) pendant un tableau (phase I, éclair de V), il vise les ennemis du tableau à toute distance (au-delà de 220 px, il ne visait que le Brumeux : les tableaux du Tisse-Destin rentraient sans être vidés) ; (2) en phase III, sans nœud à couper, il vise la cible de la phase II (un échafaudage resté debout le réduisait de 40 % toute la phase, et toute la phase IV ensuite). Le Dernier Souvenir et les ultimes [F] ne sont pas joués (une marge).

**Calibration** (`mesure-brumeux.mjs combat`, combat entier I → V, `ref=1`, `bot=2`, dieu, graines 101 à 505) : quatre tours en Normal (20 combats chacun), puis la validation. Le temps d'une phase **n'est pas proportionnel** à ses PV (exposant mesuré 2,3 à 2,6 en II, III, IV) : une phase plus longue voit plus de constructions, de Coutures et de cousus, qui prennent le temps du bot ; et la médiane de quatre formes partagées en deux groupes (Lumenarque et Héraut rapides, Gouffre et Tisse-Destin lents) saute d'un groupe à l'autre d'une passe à l'autre (II : 75 s puis 46 s à PV presque égaux). Les combats ne sont pas rejouables à l'identique : la graine fixe le Brumeux, pas le reste du jeu (`Math.random`).
- **PV retenus** : I 13 900, II 12 500, III 15 800, IV 14 500, V 15 400 (entière ; la courte en prend 0,6 : 9 240). Mêmes PV pour les quatre formes et les trois paliers (seule la phase V courte ou entière diffère). `phaseV.courte.pv` 0,5 → **0,6** (la règle de la fiche, 0,4 à 0,6) : sans cela la courte tombait sous 25 s quand l'entière tenait 50–70 s.
- **Validation** (médianes des quatre formes ; I / II / III / IV / V ; total) : Normal, passe avec II à 13 700 : 66,8 / 75,4 / 59,8 / 52,9 / 28,9 s, 317 s ; passe finale (II à 12 500) : 71,5 / 46,3 / 48,8 / 48,4 / 28,7 s, 311 s ; Difficile (II à 13 700) : 71,7 / 58,2 / 66,9 / 51,1 / 31,6 s, 296 s ; Extrême, passe finale : 73,1 / 55,9 / 48,9 / 47,9 / **50,6** s (V entière), 293 s. Combat entier ≈ 5 min dans les trois paliers. Les médianes oscillent de ± 15 s d'une passe à l'autre : la cible 50–70 s est tenue en moyenne, pas à chaque passe.
- **Par forme** (Normal, passe finale) : Lumenarque 36 / 19 / 36 / 22 / 16 s (2 min 20 s), Gouffre 102 / 138 / 58 / 63 / 36 s (7 min 30 s), Héraut 41 / 22 / 40 / 34 / 21 s (2 min 50 s), Tisse-Destin 105 / 70 / 370 / 128 / 83 s (12 min 50 s).

**Frictions** (durée × DPS au mannequin ÷ PV de la phase ; Normal, passe finale) et verdicts de la règle (§ 2.4 de la fiche : bande × 0,75 à × 1,33 de la médiane) :

| Phase | Lumenarque | Gouffre | Héraut | Tisse-Destin | Médiane |
|---|---|---|---|---|---|
| I | 1,21 | **1,84** | 1,27 | 0,84 | 1,24 |
| II | 0,70 | **2,78** | 0,78 | 0,63 | 0,74 |
| III | 1,06 | 0,90 | 1,08 | **2,60** | 1,07 |
| IV | 0,85 | **1,46** | 1,02 | 0,99 | 1,00 |
| V | 0,97 | 1,29 | 1,01 | 1,00 | 1,00 |

- **Lumenarque** (trop court partout) et **Héraut** (II trop courte) : friction normale, l'écart vient du kit → **accepté, action 7**.
- **Tisse-Destin**, phases I, II, IV, V : friction normale, l'écart vient du kit (un quart du DPS) → accepté, action 7. **Phase III : friction × 2,4**, propre au combat.
- **Gouffre**, phases I, II, IV : friction × 1,5 à × 3,8, propre au combat (au contact : en II, il lit ta portée basse et bâtit des douves, ses mains se retirent sur l'île ; un combat a duré 425 s en II) ; III et V dans la bande.
- **La passe de correction** (une seule, comme le veut la règle) a porté sur la phase III, la seule dont le mécanisme est commun à toutes les formes : le montage dure un temps fixe (4,4 s) quand le nœud et le cousu sont des parts des PV de la phase ; une forme qui frappe peu ne coupe pas à temps et les cousus s'empilent (Tisse-Destin : 18 à 20 Coutures, 14 à 23 cousus aboutis par combat). **Nœud 2,5 % → 1 %, cousus 15 % → 10 % des PV de la phase**, pour toutes les formes. Effet mesuré, phase III seule à PV égaux : Gouffre 298 → 190 s, Tisse-Destin 535 → 389 s, Lumenarque 62 → 41 s, Héraut 67 → 53 s (l'écart se resserre peu : la phase III reste celle où une forme lente s'enlise).
- **Restent hors des cibles après cette passe, présentés à l'auteur** : le Gouffre (I, II, IV) et le Tisse-Destin (III, et tout le combat par son kit). Rien d'autre n'est forcé : ni PV par forme, ni plafond de dégâts, ni enrage.

**Échafaudage** (point ouvert de § 37) : `pvPart` 0,10 gardé : à PV calibrés, 1 250 PV, environ 3 s pour le Lumenarque et le Héraut, 5 s pour le Gouffre, 11 s pour le Tisse-Destin : la médiane (≈ 4 s) est dans la cible de la fiche (3 à 5 s).

**Aucun coup sans signe : trois corrections du journal de l'arène** (bloc v18.4, sous `CAM.on` seulement, rien ne se dessine ni ne change en jeu, comme les écarts 19 et 20 de 5f). Les combats longs du Gouffre et du Tisse-Destin ont montré des coups jugés « sans signe » (4 sur 80 combats ; une chasse de 30 phases III en a retrouvé 6, avec le détail de la source) : (1) **le porteur du coup** (le tir qui touche, l'onde qui passe) s'ajoute à la chaîne même quand le coup nomme sa source : un Masqué cousu tué pendant que son tir vole n'était plus une source ; (2) **un ennemi mort garde son signe 1,5 s** (l'horizon des signes) : son tir, son onde ou son explosion le nomment encore ; (3) **le coup d'un Masqué cousu** que la section v18.8 rattache à sa zone en cours (même quand il frappe au contact) compte aussi le cousu, vu. Dans chaque cas, la source avait été vue ou signalée plus de 0,6 s. Le journal garde maintenant, pour chaque coup sans signe, l'état de sa source (`ex` : morte, encore dans la liste, distance, signalée).

**Ce qui reste** : un combat du Tisse-Destin en Extrême (graine 303, avant les corrections de la Couture) n'a pas fini sa phase III en 1 500 s (trois cousus vivants en Extrême).

**Bancs** : `banc-brumeux` joue désormais ses sections de mécanique (A à M, sauf F) sur les **PV d'essai** de 5a à 5f (2 400 par phase, phase V courte à moitié, nœud 2,5 %, cousus 15 % : `PV_ESSAI`, posé dans la page et côté Node), car leurs chiffres attendus en dépendent, pas la mécanique ; **F** prend les vraies données et le build de référence (limites : combat ≤ 1 250 s, phase ≤ 450 s ; fenêtre 1 300 s). **Écart avec la fiche** : elle faisait passer les sections D de I à M au build de référence ; elles gardent le kit de base sur les PV d'essai, et les durées réelles se lisent en F et dans le futur banc N (5g-2). Outil `_dev/bancs/mesure-brumeux.mjs` (niveau, mannequin, combat ; `PH`, `SEUL`, `PATCH` pour essayer un réglage sans toucher aux données).

**Points ouverts** : (1) le Gouffre et le Tisse-Destin hors de leur tolérance (voir ci-dessus) : décision de l'auteur, et équilibrage des formes contre les boss à l'action 7 ; (2) la médiane de quatre formes partagées en deux groupes est instable (± 15 s) : une autre statistique (moyenne géométrique) ou plus de graines pour l'action 7 ; (3) le build de référence n'a ni gravure ni relique : un vrai joueur au niveau 57 ira plus vite ; recaler sur des parties exportées (action 7) ; (4) les ultimes [F] et le Dernier Souvenir ne sont pas joués par le bot.

## 42. Le Brumeux (v18.12), action 5g-2 : l'allumage de l'arène (5 novembre 2026)

Fiche : `_dev/cadrages/la-brume-v18-5g-enchainement-fiche.md`, validée le 5 novembre 2026 (§ 3 à § 8 ; § 41 pour 5g-1). **L'arène est allumée** : `arene.js` `actif:true`. La salle « final » d'une vraie descente (porte `final`, après les deux miniboss provisoires de l'acte X) est l'arène, et le Brumeux y combat, cinq phases d'affilée aux PV calibrés en 5g-1. `actif:false` reste le repli : la place provisoire revient, rien d'autre ne change (banc-arene G avec `BANC_ETEINTE=1`). Aucune autre salle ne change (banc-arene G allumée : seule la salle « final » diffère, dans les trois paliers).

**La vraie salle** (`arene.js`, `salles.final.reel` 3 ; section « v18.12 · L'allumage » du bloc v18.5) : `makeRoom` (bloc v18.4) ouvre l'arène quand la descente entre dans la salle « final » hors essai, à l'état 3 (`rappel`, celui de la phase I) ; `A.reel` : seul cet état est peint à l'entrée (les autres sont cuits à leur transition, comme dans l'essai). `planRoom` ne pose ni vague ni Masqué (`RUN.gardeNow` consommé, `room.gardeK='final'`, `room.renfort=null`). À l'entrée (`enterRoom`), `debutReel` : phase I, palier de la descente (`RUN.palierD`), graine au hasard (le combat réel n'est pas rejouable, l'essai garde `graine=`), `X.reel` ; sa bannière (« Le Brumeux · Au fond de la Brume », `fin.banniereS` 2,2 s) sert de premier entracte : il ne lance rien pendant ce temps (N-A). Les quatre transitions passent sans pause ni écran (3,0 / 3,0 / 4,5 / 3,0 s, N-A).

**Sa mort et la fin de la descente** : `onRoomCleared` ouvrait la fin à 2,2 s, en pleine scène de mort ; elle s'ouvre maintenant à la fin de la scène (`X.scene.dureeS`, 3 s) plus `fin.apresS` (1 s) : 4,1 s (N-A) ; mouvements réduits : la scène est un fondu d'1 s, la fin 2 s après (N-G). `bossDefeated` note `RUN.bossT[10]` (la tuile « Combats de gardien » gagne l'acte X). La victoire écrit `SAVE.brumeux` (`victoires`, `phaseMax`) et `SAVE.descente` (Difficile s'ouvre ; la victoire compte pour la forme), par les chemins existants (`openEnd`, `desFin`, `noter`) ; une descente d'essai n'écrit rien (N-D, et `?descente=10` dans N-A). Une mort par lui (ses zones, ses mécanismes, son corps) se note « brumeux » (`RUN.mem.lastSrc`, `V7FOE1.brumeux`) : la chronique, les tueurs et la tombe ne disent plus « le Glas Originel » ; une mort par un ennemi de tableau garde le nom de cet ennemi (N-D : « bouffi »).

**Écarts de l'implémentation** (à valider par l'auteur) :
1. **L'écran de victoire** gardait le texte de la v17 (« Le dernier glas », « Le Glas Originel se tait… ») : `openEnd` est enveloppé pour la victoire sur le Brumeux, titre et texte dans `brumeux.js`, `fin.titre` « Au fond de la Brume » et `fin.texte` « Le Brumeux s'efface. Pour la première fois, la descente n'a plus personne pour l'écrire. La Brume, elle, se souviendra de toi. » (écrit ici, sans rien dire de ses phases : **à relire par l'auteur**).
2. **Le portrait du wiki** est son portrait de présentation (le SVG `BRX_SVG` de la fenêtre d'avant le premier pacte : silhouette encapuchonnée, deux yeux pâles, main tendue), capturé à 480 × 600 par `_dev/bancs/capture-brumeux.mjs` (`img/brumeux/brumeux-v6.webp`, `v<dessin.version>`), et non une capture de son corps en combat (le corps au sol de IV et V dirait qu'il change de présence) ; une seule image, pas de survol au troisième temps comme les gardiens. `wiki.mjs --check` l'exige quand l'arène est allumée.
3. **Le Verre sort des règles des tableaux** (`tableaux.exclues : ['brume','verre']`, § 7 de la fiche : il n'a pas de signe dans un fragment ; son signe va à l'action 7).
4. **`sim-brumeux` n'est pas découpé par section** (§ 7 de la fiche) : il reste entier (environ 30 min) ; à faire si la régression doit raccourcir.
5. **Les sections D de I à M** gardent le kit de base sur les PV d'essai (déjà noté au § 41) ; les durées réelles se lisent en F et en N.
6. **Le journal de l'arène lit la chaîne des sources avant le coup** (`chaine184`, bloc v18.4, sous `CAM.on` seulement, rien ne se dessine) : trois coups « sans source » du Tisse-Destin (un sur 24 combats dans N-C, deux dans des chasses de 30 combats), au début d'une transition ou de la phase V, ne trouvaient plus ce qui les avait portés (rien à moins de 14 px, aucune zone en cours) ; ce que le coup déclenche (une riposte du kit, un tir qui se brise) ne doit pas effacer ce qui touchait. Vérifié par N-C (ci-dessous).
7. **La porte « final »** porte le glyphe du Brumeux (`sigil` lit `__glypheFinal18` ; le glyphe est chargé dès l'ouverture du jeu quand l'arène est allumée, sinon la première image de la porte n'avait pas encore son image) ; éteinte, l'ancienne icône revient (N-F : allumée puis éteinte dans la même image, seule la zone du sceau change).
8. **Banc N-B** : le Tisse-Destin qui s'enlise en phase III (hors de sa tolérance, § 41) est signalé « ATTENTION », sans échec ; tout autre combat non fini échoue.
9. **Le disque d'un Masqué cousu** éclate par `explosion()`, sans source : le coup n'était pas rattaché à sa zone (un coup « sans signe » dans N-C, Extrême, Tisse-Destin, sorte « explosion:brute », le corps du cousu étant une Brute). L'enveloppe de `hurtPlayer` de la section v18.8 cherche maintenant, quand le coup n'a pas de source, le cousu dont le disque (encore posé à cet instant) touche le joueur, et juge le coup sur cette zone (`XA.coup`), comme ses autres coups.

**Mesures** (banc N-B, 24 combats entiers au bot, build de référence, vrais PV, deux graines par forme et par palier ; I / II / III / IV / V, médianes des quatre formes) : Normal 59 / 74 / 48 / 51 / 32 s, combat **264 s** ; Difficile 66 / 54 / 68 / 72 / 41 s, **302 s** ; Extrême 70 / 51 / 74 / 62 / 57 s (les deux combats du Tisse-Destin sans leur phase III : voir ci-dessous). Seconde passe (après les corrections) : Normal 61 / 75 / 64 / 51 / 61 s, **316 s** ; Difficile 72 / 39 / 95 / 48 / 28 s, **283 s** ; Extrême 70 / 76 / 77 / 50 / 56 s, **330 s** ; 24 victoires, aucun coup sans signe. Le combat dure environ 5 min dans les trois paliers (de 4 min à 5 min 30 s selon la passe). Par forme : Lumenarque ≈ 2 min 10 s dans les trois paliers ; Héraut 2 min 40 s à 5 min 30 s ; Gouffre 4 min à 7 min 30 s (sa phase II de 63 à 177 s) ; Tisse-Destin 12 min 40 s à 14 min en Normal et Difficile, sa phase III de 314 à 420 s. **En Extrême, le Tisse-Destin s'enlise en phase III** : sur six combats (trois passes du banc), trois n'ont pas fini cette phase dans la fenêtre (plus de 1 200 s de phase III), les trois autres l'ont finie en 341 à 428 s ; en essai direct `?brumeux=3`, la même phase a pris 270 à 390 s. Trois cousus vivants en Extrême, un montage toutes les quelques secondes, des cousus à 10 % des PV de la phase (1 580 PV, 14 s chacun au DPS du Tisse-Destin) : il coupe à peine plus vite qu'il ne coud. **Décision de l'auteur** (règle de la fiche : une seule passe de correction, faite en 5g-1) ; pistes pour l'action 7 : deux cousus vivants au plus en Extrême pendant la phase III, ou un montage qui attend tant que deux cousus vivent, ou rien (un vrai Tisse-Destin au niveau 57 a gravures et reliques). N-E : coût de rendu de la phase V en Extrême, état 8, une construction, un cousu, l'éclair de l'Extrême (12 ennemis) : **+0,9 ms** (≤ 1,5). Peinture de la vraie salle à l'entrée : 11 à 14 ms (état 3 seul).

**Régression (v18.12)** : simulateurs `sim-brume` 46 602, `sim-dernier` 4 021, `sim-masque` 3 583 218 contrôles, `sim-nemesis` 46 129, `sim-descente` 40 775, `sim-arene` 128 (un motif du branchement de `makeRoom`, plus long depuis la v18.12, élargi), `sim-brumeux` 889 (trois motifs de branchement suivis : `peindre` et `A.reel`, les sections v18.9 et v18.10 qui s'arrêtent maintenant à la section v18.12, qui tire sa graine au hasard). Bancs : `effets` 740, `touche` 34, `essai` 43, `relecture` 12, `glas-relecture` 16, `nemesis` 99, `essai-nemesis` 15, `nemesis-complet` 46, `nemesis-revue` 17, `descente` 117, `mutations` 61 : 0 échec ; `paliers` 71 : B suit l'allumage (la salle « final » de l'acte X est le Brumeux, plus la place provisoire ; éteinte, l'ancienne vérification revient), C a échoué une fois (soins nuls : une mutation tirée au hasard), rejoué : 0 échec ; `arene` 129 : G allumée, 10 260 images, 540 différentes (la salle « final », 180 images × 3 paliers), 0 échec (deux échecs à la première passe, sanctuaire et colporteur de l'Extrême différents dès la première image, pendant que `banc-brumeux` tournait : G rejoué seul, 0 échec) ; `arene` éteinte (`BANC_ETEINTE=1`) : G identique ; `complet` 228 : « sablier sur la tuile pendant l'effet » (attente à l'horloge murale, comme au § 40) ; `dernier` 117 : les 4 échecs anciens (« inerte tant que dernier.actif est faux ») ; `brumeux` 543 : C (le build de référence pour le Tisse-Destin seul : les trois autres, contre les PV d'essai, finissaient sans être touchés), G (la salle « final » diffère quand l'arène est allumée), I-D (vrais PV : fenêtre de 300 s pour la phase I du Tisse-Destin), N-C (le disque du cousu, écart 9) corrigés et rejoués : seconde passe de G, I et N, 126 vérifications, 0 échec ; `sim-brumeux` rejoué entier, 889, 0 échec ; `complet` A rejoué seul, 154, 0 échec.

**Le wiki** (Q16) : carte « Au fond de la Brume » (section `fond`, générée depuis `brumeux.js` : portrait, glyphe, nom, acte, la phrase `wiki.phrase` « Ce que tu as traversé, il s'en souvient. » ; ni PV, ni phases, ni ce qu'il fait), la porte « final » (`gen:porte-final`) et la légende des signes de bord (`gen:signes`, depuis les catégories et couleurs de `arene.js` : de la lisibilité, pas un secret). La section « La descente » le lie (`#fond`) ; les miniboss restent « à venir ». Journal v18.12 : « Au fond de la descente, il ne répète plus : il t'attend. » (ni phase ni mécanique : `sim-brumeux` § 16).

**Points ouverts des § 34 à § 40, fermés ou reportés** (§ 7 de la fiche) : les mains hors de l'île d'une douve (tranché en 5d) et la dalle qui ne blessait pas hors de la vue (réglée en 5c) sortent des points ouverts de `REPRISE.md` (5h les vérifie) ; l'effondrement toujours sur un pan était un effet de l'essai direct (N-B joue le combat entier) ; `banc-arene` C stabilisé (cinq séries de onze paires au plus, témoin, bruit au-delà de 0,5 ms : série rejouée) ; le coup sans signe vu une fois (§ 36 (7)) : surveillé par N-C.


## 43. Le Brumeux (v18.13), action 5h : la relecture indépendante du combat allumé (5 novembre 2026)

Un agent qui n'avait écrit ni 5a à 5g a relu tout le combat allumé (bloc v18.4 et ses enveloppes, bloc v18.5 et ses sections v18.6 à v18.12, données, wiki, journal), sans rien exécuter, sur neuf axes : aucun coup sans signe, lisibilité, secret, mouvements réduits, règle d'or, sauvegardes, coût, les deux points déclarés fermés, les bugs ordinaires. **Ce qui tient** : tous les chemins de dégâts suivis sont annoncés (zones, Toile et Dé, dalles, cloche, effondrement, Passe, Révérence, Volte, étapes d'emprunt, disque d'un cousu) ; ni son corps, ni le porteur, ni les entités fixes ne blessent au contact ; rien ne frappe pendant la bannière ni pendant la scène de mort ; avec `actif:false`, toutes les enveloppes v18.12 sont inertes ; `openEnd` est protégé contre une double fin (`RUN.final`, `RUN.fin18`) ; le secret tient (carte, légende, porte, journal, bannière, écran de victoire). **Les deux points fermés sont vérifiés** : le point de montage sur l'île d'une douve (`brxPointsCouture`) est dans l'île, atteignable par une passerelle ou un tir au-dessus des fosses, et l'entité frappée est la croix (`croixDy`) ; une dalle de la phase I qui vise un ennemi de tableau hors de la vue passe `{brx:1}`, exempté de « on ne frappe que ce qu'on voit ».

**Onze constats, corrigés** (tous inertes hors de la salle « final » allumée, sauf 6 et 9) :
1. **Un écran de butin pendant sa scène de mort** (6 victoires sur 10 : la vraie salle est du type `elite`) : « Le champion portait quelque chose » (v13, `chanceChampion` 60 %), le pari du glas de la Résonance P6, le « Défier l'élite » de D6 à l'entrée, et le fragment d'élite posé en coordonnées d'écran. Les quatre gardes sautent quand `room.arene && room.gardeK==='final'` (la place provisoire, arène éteinte, les garde).
2. **Mourir après l'avoir vaincu** : la fin attend sa scène (4 s) ; la corruption du Gouffre ou le furioso du Héraut pouvaient tuer le joueur entre-temps (« Englouti par la Brume », `SAVE.brumeux` victorieuse, `SAVE.descente` vaincue). Vaincu, il ne te tue plus : `loseHp` ne retire rien tant que `vaincu()` ; une fin ouverte pendant ce temps (l'abandon depuis la pause) reste une victoire.
3. **Des morts mal nommées** : une étape d'emprunt (le porteur `brx18e`, `brx18p`) et ses tirs sans source (l'ennemi le plus proche était nommé) se notent maintenant « brumeux » (`tirBrx`).
4. **Les tuiles de l'arène restaient en mémoire** (environ 11 Mo par état, six états) : `remettre()` les libère à la salle suivante.
5. **Une sauvegarde `SAVE.brumeux` d'une version plus récente était écrasée** par une neuve à son premier combat (`brxLireSauve` la rend nulle) : `noter` ne l'écrit plus.
6. **Les détecteurs d'essai** de la némésis (`ESSAI_URL`) et du Brumeux (`ESSAI_URL18`) prennent la liste d'`ESSAI18` (`demo`, `descente`) : une descente relancée depuis `?descente=10` n'écrit plus `SAVE.brumeux` ni `SAVE.nemesis`.
7. **Le remplacement de `later` retardait toute la purge** (le message « talents à attribuer » s'affichait sur l'écran de fin) : l'enveloppe d'`onRoomCleared` est retirée ; seule l'ouverture de la fin attend (`openEnd` se reporte à la fin de sa scène, plus `fin.apresS`, `X.finDiff`).
8. **Le contour des fosses** (`CAM.sol`, `fosse18`) était à ΔE 14,8 de la lavande des emprunts : l'arête de la pierre (132, 118, 96), ΔE 67 de la lavande, 61 de l'orange des zones.
9. **Deux répliques de la Veilleuse** parlaient du Glas après une victoire (« Le Glas s'est tu ») : une victoire est désormais la fin de la descente, elles disent « Le fond s'est tu » (**à relire par l'auteur**). Le journal ancien (v18.2, « les miniboss et le boss final ont un temps de plus ») est laissé tel quel : il dit ce qui changeait à cette version.
10. **La scène de mort des phases I à III** (essai seulement : en vrai, il meurt en V) faisait tomber la croix et les fils en mouvements réduits : fondu seul.
11. **Son regard et son rire** (la première lecture) couvraient sa bannière : ils la suivent (`debutReel`), comme le veut la fiche (§ 1).

**Bancs** : `banc-brumeux` N-H (le premier écran après sa mort est la fin, butin de champion forcé à 100 % ; aucune perte de PV entre sa mort et la fin, la victoire compte ; les tuiles libérées ; une sauvegarde v:99 gardée) ; `banc-arene` C prend pour salle d'élite de référence la place provisoire, arène éteinte dans sa page (allumée, `__descente.essai(10, {fin:true})` ouvrait l'arène du Brumeux : C comparait deux arènes) ; son écart reste au bord du budget (+1,4 à +1,5 ms, comme en 5g-1 : à surveiller). Simulateurs : motifs de `ESSAI_URL` (`sim-brumeux`, `sim-arene`, `sim-nemesis`), de la fin reportée, de `vaincu` et de `tirBrx` (`sim-brumeux` § 16). Journal v18.13 : « Le fond de la descente, relu : sa fin ne se laisse plus interrompre. »

**Régression ciblée (v18.13)** : `sim-arene` 128, `sim-nemesis` 46 129, `sim-descente` 40 775 : 0 échec ; `sim-brumeux` 891 : deux motifs de branchement suivis (l'écriture de `SAVE.brumeux` et la naissance dans la vraie salle), corrigés et vérifiés ; `wiki --check` à jour. Bancs : `brumeux` N 82 (24 combats : Normal 257 s, Difficile 267 s, Extrême 271 s, médianes des formes ; 24 victoires, aucun coup sans signe ; N-H 6), `nemesis` 99, `essai-nemesis` 15, `nemesis-complet` 46, `descente` 117, `paliers` 71, `effets` 740, `essai` 43, `arene` A, B, D, E, F, G 124 (G allumée : 540 images différentes, la salle « final » seule), `arene` G éteinte 60 (0 image différente) : 0 échec ; `arene` C seul : +1,50 ms (au bord du budget).


## 44. Les gardiens de la descente (v18.14), action 6.1a : le socle commun (6 novembre 2026)

Cadrage : `_dev/cadrages/la-brume-v18-6-gardiens-cadrage.md` (et `claude/la-brume-v18-6-gardiens-cadrage.md` dans le projet), Q1–Q25, **validé le 6 novembre 2026** (« Je valide », toutes les recommandations, avec l'échelle Q25 ajoutée à la demande de l'auteur : la difficulté monte d'acte en acte par des habiletés neuves, pas par les PV ni les dégâts). Fait avec Opus 5.5. Règle d'or : **tous les gardiens sont éteints** ; en jeu rien ne change (les places provisoires restent) ; seul l'essai `?gardien=<acte>` ouvre un gardien.

**Données** (`data/gardiens-descente.js`, nouveau, `BRUME_DATA.gardiensD`, Q1) : `commun` (temps de frappe 50 s, part maximale 30 %, contact 8 %, préavis ≥ 0,8 s, sortie et grille de `FF`, seuils 0,66 / 0,33, build de référence des actes IV à IX : niveaux et PV de référence mesurés, l'échelle : repères des gardiens I à III et habiletés connues) ; entrée `4` : le Guet Sans-Nom, **éteint** (`actif:false`), `essai:true` : ses attaques sont encore celles du **gardien d'essai** (un disque sur toi, un couloir de lui vers toi), silhouette simple, glyphe de travail ; son échelon, ses habiletés, son décor (`basfonds`), ses titres de temps et son temps de plus (seuil 0,18) sont déjà ceux de la partie B. `gardiens.js` et `descente.js` ne bougent pas.

**Logique pure** (bloc `/*gar:pur*/`, juste avant le bloc de jeu ; réutilise sans les changer `brxDans`, `brxSortie`, `brxGrille` du bloc `/*brx:pur*/`) : `garEntree`, `garActifs` (seul `actif === true`, seulement aux actes IV à IX), `garSeuils` (temps de plus sous le dernier seuil quand `desTempsEnPlus` l'accorde), `garTemps`, `garFile` (mélange à graine, jamais deux fois la même de suite, la première différente de la dernière ; repli glouton), `garPv`, `garDegats` (part plafonnée à `partMax`), `garReference` (la liste du Brumeux tronquée : un point par niveau gagné, chaque talent à son rang maximum avant le suivant), `garGeste` / `garVariantes` (disque, couloir, cône, anneau à brèche), **`garSortieGrille`** (la sortie au détour, Q5 : plus court chemin sur la grille de `FF` autour des obstacles, à ta vitesse, dans le préavis moins le réflexe ; sans obstacle, exactement `brxSortie`), `garPlacer`, `garJuge` (un coup est signé : zone au préavis entier ≥ 0,8 s, contact, tir, ennemi ordinaire ; source inconnue : non), **`garEchelle`** (Q25 : habileté neuve, aucun cran qui baisse, au moins un qui monte, préavis jamais sous 0,8 s).

**Jeu** (bloc « v18.14 · Les gardiens de la descente », avant `DEMO_CLS`, enveloppes les plus extérieures) :
- **Interrupteur** (Q2) : au chargement, `ACTD[n].boss = nom` pour chaque gardien allumé ; `desPorte` (inchangé) donne alors la porte `boss`. Éteint : rien.
- **Aiguillage** (Q3, la liste du cadrage, ligne par ligne) : `makeRoom` marque la salle (`room.g18`, état `room.g18s`) avant de peindre le sol ; `themeOf` (son thème), `layoutFor` (pas de cocons), `floorFlags` (pavés, flaques, grilles d'égout : `decorSol`) ; `createBoss` le crée lui (ses PV × M5 et `V.bossHp` du joueur, `RUN.bossStart`), jamais le Glas : `glasInit` n'est pas appelé, ni `updateHeart`, ni les temps v13, ni les copies ; `drawHeart` (son corps), `drawBossPost` (l'anneau ivoire `G27.anneau` sur son point faible quand `G27.aNu`), `eyePts` (un visage sans traits) ; `computeLights` (sa lumière, `TINT.g18_4`, sans battement) ; `g27GlypheImg` (porte) et `g27GlypheHud` (barre) ; `SC27.scene` (entrée en fondu pendant la bannière, mort : il s'enfonce en 1,5 s, fondu seul en mouvements réduits) et `SC27.debut` ; les vaisseaux du Cœur ne sont tracés que sur le thème `coeur` (rien à envelopper) ; la musique reste `boss3`.
- **Retouches de base, inertes hors d'une salle marquée** : `ACTG()` (le registre, sauf dans la salle d'un gardien de la descente : l'acte) pour `bossHurt`, `perfect`, `close`, `bossFirst` et la Résonance du premier gardien vaincu ; `nomG(a)` dans « Sans une égratignure » (`ACTS` n'a que trois actes : `ACTS[4].boss` aurait planté) ; la réserve à l'entrée du Glas (DS12) n'est pas notée chez lui (`&&!room.g18`) ; « gardien » ajouté aux trois gardes d'essai (`ESSAI_URL`, `ESSAI18`, `ESSAI_URL18`).
- **Moteur** (Q5) : entracte → geste (une file par temps, variantes, `garPlacer` ; sans sortie, le geste saute et c'est compté) → … → après une file entière, la **relâche** (sonné `vuln` 2 s : +50 %, anneau ivoire, « · sonné » dans la barre) ; il marche vers toi au-delà de 230 px (× 1,3 au temps 3) ; contact (8 % des PV du build). Temps : `e.seuils18` (la retouche v18.5 de `hitEnemy` arrête le coup au seuil et pose le verrou de 1,2 s) ; temps de plus en Difficile et en Extrême (`desTempsEnPlus`) ; au changement de temps : zones effacées, son, titre du temps flottant au-dessus de lui (aucune bulle).
- **Journal des coups hors arène** : chaque coup reçu dans sa salle, sa source (`zone`, `contact`, `ennemi`, `autre`), son préavis et son âge ; `garJuge` ; une mort par lui se note `g18_4` (`V7FOE1` : « le Guet Sans-Nom »).
- **Bot qui frappe** (`bot=2`) : les règles de celui du Brumeux, sur ses zones, sortie au détour. **Écart au cadrage** : il est **copié**, pas extrait (le pilote du Brumeux ne change pas d'un bit, et `banc-brumeux` n'a pas à être rejoué pour lui).
- **Build de référence de l'acte** (`ref=1`), **mannequin** (`mannequin=1` : ne lance rien, PV sans fin, sans seuil), **dieu** (jamais sous 1 PV, `dieu=0` pour mourir).
- Essai : `index.html?gardien=<4..9>[&temps=n][&attaque=<id>][&palier=…][&ref=1][&bot=2][&mannequin=1][&dieu=0][&classe=…]` (passe par `__descente.essai(n, {fin:true})` : une descente d'essai, rien d'écrit) ; jamais confondu avec `?dernier=…&gardien=1` (le mode d'essai du Dernier Souvenir garde son paramètre). Console `__gardiens18` (`essai`, `reference`, `etat`, `journal`, `actifs`, `glyphe`, `bot`, `dieu`, `dbg`).

**Mesures** (`_dev/bancs/mesure-gardiens.mjs`, nouveau) :
- **Niveau à l'entrée de la salle du gardien** (descente purgée, Normal ; Lumenarque / Gouffre / Héraut / Tisse-Destin) : acte IV 27 / 29 / 28 / 24, V 32 / 34 / 34 / 31, VI 38 / 40 / 39 / 37, VII 43 / 45 / 43 / 43, VIII 50 / 51 / 49 / 48, IX 56 / 56 / 55 / 54 ; médianes retenues **27, 33, 38, 43, 49, 55** (le Brumeux : 57 à l'entrée de l'acte X).
- **Le build de référence est le même de l'acte IV à l'acte IX** : dès le niveau 27, 26 points couvrent les 22 rangs de la liste (dix talents au rang maximum) ; et **les PV du joueur ne dépendent pas du niveau** : 95 / 166,25 / 104,5 / 95 à chaque acte (médiane ≈ 100, `pvRef` 100). Conséquence de Q9 et Q10 : les six gardiens auront des PV et des coups du même ordre ; toute la montée de difficulté viendra de leurs habiletés (Q25), comme l'auteur l'a demandé. Un vrai joueur, lui, gagne gravures, reliques, pactes et équipement d'un acte à l'autre (absents du build de référence : une marge).
- **DPS contre le mannequin de l'acte IV** : Lumenarque 550, Gouffre 337, Héraut 429, Tisse-Destin 112 PV/s ; médiane 383 → **PV du gardien de l'acte IV : 19 200** (× 50 s ; contre 9 000 au Glas Originel). Au bot, le gardien d'essai (deux gestes) tombe en 32 à 35 s (Lumenarque), 58 à 64 s (Gouffre, Héraut), et le Tisse-Destin en est à 43 % de PV à 90 s : l'écart de kit du Tisse-Destin (un quart du DPS du Lumenarque) se retrouve ici, comme contre le Brumeux (§ 41).
- **Les dégâts des gardiens I à III, rapportés au build** : le Glas frappe pour 26 × 1,1 à 1,2 (≈ 29 à 31 PV, soit **près de 30 % des PV du build**) ; les parts du cadrage (zone principale 15 à 18 %) feraient frapper le gardien de l'acte IV deux fois moins fort que celui de l'acte III. À trancher dans la fiche 6.1b (proposition : zone principale 25 %, plafond 30 % inchangé).

**L'échelle, tenue par le simulateur, a attrapé une incohérence du cadrage** : le tableau de Q25 donnait au Guet « une contrainte, préavis 1,0 à 1,2 s », soit moins que le Glas (deux contraintes, 0,8 s) : la règle validée (aucun cran ne baisse) le refusait. Ses vraies valeurs, d'après ses attaques de la partie B (la herse debout pendant le Contrôle : deux contraintes ; la Vouge à 0,8 s ; la Croix et la Rafle en deux coups), la respectent : `echelon` {temps 3, contraintes 2, enchaînements 2, préavis 0,8, entourage 1} ; c'est l'enchaînement qui monte. Le simulateur exige désormais (hors gardien d'essai) que le cran « préavis » soit le préavis le plus court de ses attaques.

**Écarts au cadrage** : (1) le pilote du bot est copié, pas extrait (voir plus haut) ; (2) **la mesure des gardiens I à III au même protocole n'est pas faite** (Q9, prévue en 6.1a) : elle demande un mannequin et un pilote dans leurs salles, dont les zones ne passent pas par le moteur commun (le bot ne saurait pas les éviter) ; reportée à 6.1b, où le pilote saura lire leurs télégraphes ou se contentera de `dieu` ; (3) le banc G compare **20** salles (les 19 de `banc-arene` G plus la salle « boss » de l'acte IV, entrée par `doEnter('boss')`), deux fois : gardien éteint, puis allumé (`gardiens-descente.js` servi avec `actif:true`) ; (4) le titre d'un temps flotte au-dessus du gardien (`addNum`) : les gardiens I à III ouvrent une bulle (`tuto`), interdite ici (image d'abord) ; (5) la bannière d’un essai est celle de `__descente.essai` (« Acte IV · essai ») ; en vraie descente, c'est « Gardien de l'acte · <nom> ».

**Vérification.** `sim-gardiens` (nouveau) : **176 vérifications, 0 échec** (données ; interrupteur et `desPorte` ; temps par palier, jamais sous l'acte IV même avec une règle mal écrite ; 10 000 files ; PV, parts, build de référence : à l'acte X, exactement la liste du Brumeux ; 10 000 positions par attaque : sortie libre et atteinte à temps, et égale à `brxSortie` sans obstacle ; 10 000 salles à obstacles : sortie au détour libre et reliée ; un mur contourné ; une zone sans sortie qui saute ; juge ; échelle et ses contre-épreuves ; 23 branchements). Contre-épreuves sur des copies modifiées d'`index.html` : une file qui laisse répéter (2 échecs), une sortie qui ignore les zones (3), une échelle qui ne cherche plus l'habileté neuve (1), une part non plafonnée (1) : toutes attrapées. Banc `_dev/bancs/banc-gardiens18.mjs` (nouveau) : **A** 27 vérifications (vraie salle de gardien à l'acte IV au registre 3, 19 200 PV, rayon 50, contact 8 ; ni la mémoire du Glas, ni sa réserve notée ; thème `basfonds` sans cocons, le reste de l'acte au Cœur ; sa lumière `g18_4` de 120 px sans battement ; son glyphe sur la porte et la barre ; un coup de zone signé, la mort nommée `g18_4` ; victoire en Normal et en Difficile : temps de gardien, `bossFirst` et « sans une égratignure » sous la clé IV, rien sous la clé III, soin complet en Normal et ×0,65 en Difficile, relique « Les Bas-Fonds se taisent », sa scène de mort), **B** 11 (trois temps en Normal, quatre en Difficile et en Extrême, chaque seuil arrête le coup au PV près, verrou 1,2 s ; au dernier seuil du Normal, le garde v11 à 0,33 arrête déjà le coup au même PV, sans verrou, comme pour les gardiens I à III ; relâche après quatre gestes, sonné 2 s ; Accoutumance niveau 1 : la fenêtre « à nu » s'ouvre), **C** 24 (12 combats au bot, `ref`, `dieu`, 90 s : **798 coups reçus, 0 sans signe**, 0 geste sauté), **G** 126 (**21 600 images comparées contre `e397615`** : gardien éteint, les 20 salles identiques dans les trois paliers, la salle « boss » de l'acte IV comprise (un second Glas, comme avant) ; allumé, seule cette salle change : 540 images), **H** 6 (éteint : place provisoire `elite garde` ; allumé : porte « boss », sa salle ; `wiki.mjs --check`).

**Régression (v18.14)** : simulateurs `sim-gardiens` 176, `sim-descente` 40 775, `sim-arene` 128, `sim-nemesis` 46 129, `sim-dernier` 4 021, `sim-brume` 46 602, `sim-masque` 3 583 218 contrôles : 0 échec (« gardien » ajouté aux motifs des gardes d'essai de `sim-arene`, `sim-brumeux`, `sim-descente`, `sim-nemesis`) ; `sim-brumeux` : deux vérifications comptaient sur l'état du fichier entier (les `reference(` comptés jusqu'au bloc des gardiens de la descente, qui a son propre build de référence ; la version actuelle acceptée ≥ v18.11) : corrigées, puis `sim-brumeux` rejoué entier : **892 vérifications, 0 échec**. Bancs : `descente` 117, `paliers` 71, `glas-relecture` 16, `relecture` 12, `effets` 740, `nemesis` 99, `mutations` 61, `complet` 228, `arene` A, B, D, E, F 64 : 0 échec ; `essai` 43 : un échec à la première passe pendant que d'autres bancs tournaient, rejoué seul : 0 (la fragilité notée au § 29) ; `dernier` : les 4 échecs anciens (§ 31). Non rejoués : `banc-brumeux` (rien de son combat ne change : seuls ses motifs de simulateur ont bougé), `banc-arene` C (coût, au bord de son budget depuis 5g-1) et G (ses 19 salles sont dans la section G de `banc-gardiens18`, contre le commit d'avant), `banc-gardiens-final` (rien ne dessine dans la salle des gardiens I à III : section G).

**Points ouverts** : (1) les parts de dégâts (voir les mesures) ; (2) le contact : au bot, le Gouffre reçoit environ trois coups de contact par seconde au corps à corps (187 coups en 60 s, tous signés) : à régler avec le corps du Guet en 6.1b (un contact plus rare, ou repoussant) ; (3) la mesure des gardiens I à III (écart 2) ; (4) le décor de la salle (pavés, flaques, grilles) est un premier jet, à reprendre avec le dessin du Guet (contraste corps / sol ≥ 4,5, Q7) ; (5) le glyphe et la silhouette sont de travail (6.1b : dessin v17.27, portraits, `dessin.version` 1).

## 45. Le Guet Sans-Nom (v18.15), action 6.1b : le gardien de l'acte IV, allumé (6 novembre 2026)

Cadrage : `_dev/cadrages/la-brume-v18-6-gardiens-cadrage.md`, partie B (Q16–Q24), validée le 6 novembre 2026 avec les deux décisions de l'auteur sur les points ouverts de § 44 : **zones principales à 25 %** des PV du build (plafond de 30 % inchangé) et **un contact plus rare, qui repousse**. Fait avec Opus 5.5. Le Guet est **allumé** (`actif:true`, `essai:false`) : la dernière salle de l'acte IV est sa salle (porte « boss ») ; les gardiens V à IX restent des places provisoires.

**Données** (`data/gardiens-descente.js`, entrée `4`) : PV 19 600 (règle Q9 remesurée avec son vrai corps : DPS médian au mannequin 391,9 PV/s — Lumenarque 553,6, Gouffre 333,6, Héraut 450,2, Tisse-Destin 112,3 — × 50 s ; 6.1a mesurait 383 → 19 200, l'écart vient du Héraut) ; bannière « Qui va là ? » ; temps « Qui va là ? », « Il ne te reconnaît pas », « La herse tombe », « Couvre-feu » (temps de plus, sous 18 %) ; `herse` (couloir de préavis 30 px, barreaux r 10 au pas de 16 px : jointifs, guichet clair de 120 px par tronçon, durées 4,5 / 5,5 s, bords 240 / 160 px, écart de 240 px entre herses parallèles, tombe à ±110 / ±80 px de toi, guichet à 40–200 px de ta projection, Couvre-feu : deux gardées, trois au plus, connexité ≥ 85 %) ; `attaques` : Herse (couloir, 1,0 s, 22 %), Croix (deux herses, la seconde 0,5 s plus tard aux temps 3 et 4, 22 %), Contrôle (case, 1,2 s / 1,0 s au temps 3, **25 %**), Rafle (deux cases, +0,6 s, 22 % par coup), Vouge (cône 110°, 0–160 px, 0,8 s, 24 %, à portée 0,8 × 160 px, s'approche 2 s puis renonce, aller et retour à ±35° au temps 3), Garde ! (disque de 130 px autour de lui, 0,9 s, 18 %, quand tu restes à moins de 110 px pendant 2,5 s), Feuillets (5 / 7 pages, lignes violettes 0,6 s, 210 px/s, 8 % la page), Appel du guet (2 / 3 Sans-Nom, Rampants et Voilés, au plus 5 vivants, par les guichets) ; `fermetures` (fermeture = Herse + Contrôle ; croisée = Croix + Rafle) ; `releve` (sonné 2 s, 1,5 s au Couvre-feu) ; files du cadrage ; `rythme` (entractes 0,95 / 0,75 / 0,6 / 0,5, pas de relâche en fin de file, `apresFermeture` 0,5) ; couleurs mesurées ; décor assombri (sol l 9) ; glyphe final ; `wiki` (phrase de la carte, journal) ; `dessin` (version 1, lecture, entrée, mort, signe du quatrième temps). `commun` gagne `contactS` 1,2 et `contactRecul` 40 (le contact, décision de l'auteur), `preavisTir` 0,6 (la ligne d'un tir annoncé). `histoire.js` gagne l'entrée de codex `guet` (champ `gardien:4` : montrée au jeu comme au wiki seulement si ce gardien est allumé ; débloquée en le vainquant hors essai, `SAVE.flags.g18_4`).

**Logique pure** (`/*gar:pur*/`) : `garTroncons`, `garHerse` (tronçons pleins, barreaux, couloirs), `garHerseC`, `garGuichets` (un guichet par tronçon), `garFermeture`, `garFermer` (pose parmi les herses debout ; si rien ne tient, la plus ancienne se relève et on recommence), `garCoupes` / `garSection` / `garVoisines` (la salle découpée en sections par les herses debout), `garSortie2` (deux coups : d'un coup hors des deux, ou l'un après l'autre), `garRafle`, `garVouge`, `garFeuillets`, `garVolPage`, `garCouvreAvant` / `garCouvreApres`, `garConnexe`, `garParTemps` ; `garJuge` : un tir est signé si sa ligne a duré `preavisTir`.

**Jeu** (bloc v18.14, étendu) :
- **Les Fermetures** : la herse (ou la Croix) est annoncée (couloirs orange, deux montants rouille à chaque guichet), tombe (obstacle : des disques `herse18` dans `room.pillars` ; sous la herse : touché et poussé hors de la ligne du côté où l'on se tenait), puis 0,3 s plus tard le Contrôle (ta section : la case entre les herses debout et les murs, sortie au détour par le guichet, sinon rien) ou la Rafle (ta section puis une voisine, la seconde en pointillé ; sans sortie pour les deux, un Contrôle) ; il enchaîne la suite de sa file, herses encore debout ; quand leur durée est passée (ou qu'une nouvelle Fermeture vient), **la Relève** : elles remontent (0,45 s), il est sonné (`vuln`, +50 %, anneau ivoire sur le registre). Au Couvre-feu : avant une Fermeture, les plus anciennes se relèvent (trois au plus) ; à la Relève, il garde la plus récente de la Fermeture, deux au plus en tout.
- **La herse arrête les corps, pas les tirs** : `hitsWall` enveloppé (seulement dans sa salle, quand une herse est debout : les tirs, les tiens comme les siens, passent entre les barreaux) ; **il traverse ses herses** (`collideEnemy` et ses pas sans elles : c'est sa porte) ; ses invoqués et toi êtes arrêtés (`collidePlayer`, `collideEnemy`, la carte `FF` se refait quand le nombre d'obstacles change) ; `renderFloor` ne les peint jamais (elles sont dessinées à part).
- La **Vouge** (phase `approche`), **Garde !** (réactif : `s.colle`, hors de la file ; dans la file, seulement si tu es à moins de 220 px), les **Feuillets** (`s.tirs` : lignes violettes, puis des `eproj` marqués `g18f` ; le journal les reconnaît : coup `tir`), l'**Appel** (`room.spawning` aux guichets des herses debout, sinon `findSpawn`).
- **Le contact** : une fois par 1,2 s au plus, et il te repousse de 40 px (`collidePlayer` ensuite). Sa phrase d'entrée (« Qui va là ? », `banniere`) flotte au-dessus de lui quand le combat commence (la bannière de la salle garde « Gardien de l'acte » et son nom).
- **Les temps** : à chaque changement, ses herses se relèvent (sans fenêtre) ; au troisième, la herse de son dos tombe et reste au sol (`s.debris`, dessin seul). Sa mort : les herses s'affaissent (elles finissent dans le pas du jeu, `step` enveloppé, même boss mort) ; hors essai, `SAVE.flags.g18_4`.
- **Le dessin** (grammaire v17.27) : `peindreGuet` cuit par temps (`G27.image`, clé avec rayon et version) ; corps plein dans 1,12 × r ; ce qui dépasse (la herse au-dessus de sa tête, le fer de la vouge) est peint sur un calque puis posé à 33 % d'un coup (des traits qui se croisent ne s'additionnent pas au-delà du voile : peints directement à 33 %, quatre couches dépassaient 200 d'opacité) ; miroir vers toi ; temps 1 : herse au dos, registre fermé (fermoir) ; temps 2 : registre ouvert, quatre feuillets voilés tournent autour de lui ; temps 3 : plus de herse au dos, une rature sur le visage ; Couvre-feu : une page manque au registre et flotte au-dessus de lui (lueur) ; mouvements réduits : rien ne tourne ni ne flotte. Le point faible (anneau ivoire) : le registre (0,15 × r au-dessus du centre). Herses debout : une rangée de barreaux rouille (vue de face pour une herse horizontale, de profil pour une verticale), chute en 0,15 s (figée en mouvements réduits). Entrée : une herse remonte du sol devant lui, il passe le guichet ; mort : la herse s'abat derrière lui, le registre tombe ouvert, il pose le genou et se défait en eau trouble ; mouvements réduits : fondu seul.
- **Bot** (`bot=2`) : les lignes des Feuillets comptent comme des zones ; derrière une herse debout, il passe par le guichet le plus commode (`via`).
- Console `__gardiens18.guet` (`apercu`, `img`, `herse`, `debris`) ; `dbg` gagne `ens`, `eproj`, `hitsWall`, `collide`, `creer`. L'essai `attaque=` accepte une attaque, une Fermeture ou l'une de ses moitiés (la Fermeture entière).

**Codex et wiki** : l'entrée « Le Guet Sans-Nom » (texte du cadrage, Q16) ; `LORE` ne garde une entrée de gardien que s'il est allumé (base, une ligne). `wiki.mjs` : `GARD_D` (les gardiens de la descente allumés) : carte dans « Les gardiens » (portrait premier temps, troisième au survol, glyphe, PV, phrase), sous-section « Le Guet Sans-Nom · Acte IV » (temps, temps de plus, cartes d'attaque et la Relève, lecture, entrée, mort, signe du quatrième temps), son point faible dans la phrase de l'anneau ivoire, son nom (lié) dans « La descente » et dans le temps de plus de Difficile, le codex filtré ; `portraitsManquants` réclame `img/gardiens/gardien-4-t1..3-v1.webp` (capturés par `capture-portraits.mjs`, `PORTRAITS=4`, cadre 176 × 220 px du monde ; au troisième temps, la herse tombée à ses pieds). Éteint, les sections redeviennent exactement celles de la v18.14 (banc H). Journal : « Au fond des Bas-Fonds, quelqu’un garde encore la porte. »

**Mesures au bot** (Normal, build de référence de l'acte IV, `dieu`) :
- Première mesure (entractes du cadrage, 19 200 PV) : Lumenarque 32 s, Gouffre 63–67 s, Héraut 42–100 s, Tisse-Destin 119–121 s ; friction (durée × DPS ÷ PV) 0,92 / 1,13 / 0,98 / 0,70, **médiane ≈ 0,95**, sous la fourchette visée (≈ 1,5).
- **Une passe de correction, par la partition et pour toutes les formes** (la règle de Q9) : entractes raccourcis de 0,15 s, et après le Contrôle (ou la Rafle) il enchaîne à la moitié de l'entracte, herses encore debout (deux contraintes à la fois plus souvent). Avec 19 600 PV : Lumenarque 33,6–34,6 s, Gouffre 68,7–69,8 s, Héraut 44–79 s, Tisse-Destin 107–146 s ; durée médiane **≈ 71 s** (la visée du cadrage : ≈ 75 s), friction 0,96 / 1,18 / 1,70 (bimodal : 44 s → 1,0) / 0,63, **médiane ≈ 1,1**. Banc E (une course par forme) : 0,93 / 1,09 / 0,98 / 0,88.
- Lecture : le bot connaît chaque zone à l'instant et tire en esquivant ; contre le Guet, il ne perd presque rien à distance (les herses laissent passer les tirs : c'est la règle). La friction mesurée par ce bot reste près de 1 pour toutes les formes à distance ; seules les formes au corps à corps la sentent (Vouge, Garde !, guichets). Le Tisse-Destin bat le mannequin (les Sans-Nom invoqués lui donnent des cibles à relier). **Cas présenté à l'auteur** (règle de Q9 : hors de la bande après une passe) : la durée visée est atteinte, la friction visée ne l'est pas ; la mesure des gardiens I à III au même protocole (écart 2 de § 44, toujours reportée) dirait si 1,5 est atteignable par ce bot, ou si l'échelle de friction doit se lire relativement (≥ celle du gardien précédent).

**Écarts au cadrage** : (1) le ciré est **délavé** (150, 162, 156) et non sombre : sombre, il tombait sous le contraste 4,5 du sol des Bas-Fonds, lui-même assombri (l 15 → 9) ; contraste mesuré 5,0 ; (2) la Croix a **un guichet par tronçon** (quatre guichets) : un seul par herse isolait une section ; (3) le Contrôle sans sortie ne vise pas « une autre section » : il ne fait rien (une section où tu n'es pas ne demande rien) ; (4) le contact, les parts et l'entracte suivent les décisions et la passe ci-dessus ; (5) la herse dure au moins sa durée : la Relève attend la fin du geste en cours (contre « obstacle 4,5 s » pile) ; (6) au changement de temps, ses herses se relèvent sans fenêtre ; (7) le Guet traverse ses propres herses (le cadrage ne le disait pas : sinon une herse tombée sur lui le poussait d'un côté) ; (8) la mesure des gardiens I à III n'est toujours pas faite (voir les mesures).

**Vérification.** `sim-gardiens` : **252 vérifications, 0 échec** (section 9 nouvelle : 10 000 Fermetures — d'un mur à l'autre, un guichet clair par tronçon, aucun barreau dans un guichet, barreaux jointifs, jamais la salle coupée ; 2 000 suites de six Fermetures au Couvre-feu — jamais plus de trois debout ni plus de deux après une Relève, jamais coupée, posées à 99 % ; le Contrôle — la sortie passe toujours par le guichet ; la Rafle ; la Vouge ; les Feuillets ; les parts ; la Relève ; sept branchements ; contre-épreuves : un tir à 0,3 s non signé, une Fermeture qui ne tient pas fait relever la plus ancienne puis saute). Banc `banc-gardiens18` : sections D (attaques, une à une), E (PV au bot), F (corps plein 1,141 × r à chaque temps, contraste 5,0, mouvements réduits : une seule image sur douze instants, coût 0,05 ms) nouvelles ; A, B, G, H adaptées (le Guet allumé ; B : la Relève au lieu de la relâche ; G contre 3f1dc75, chaque côté avec ses données, servies éteintes puis allumées ; H : éteint, le wiki de la v18.14 au caractère près). `banc-descente` : l'acte IV finit par son gardien.

**Régression (v18.15)** : simulateurs `sim-gardiens` 252, `sim-descente` 40 775, `sim-arene` 128, `sim-brumeux` 892, `sim-nemesis` 46 129, `sim-dernier` 4 021, `sim-brume` 46 602, `sim-masque` 3 583 218 contrôles : 0 échec. Bancs : `banc-gardiens18` A à H 126 + 123 vérifications, 0 échec ; `banc-descente` 117 (adapté : l'acte IV finit par son gardien) ; `banc-paliers` 71 (adapté : la place provisoire testée est celle de l'acte V ; la section C a échoué une fois sur trois — soins nuls : une règle mutante de l'Extrême tirée au hasard — puis passé deux fois seule) ; `banc-mutations` 61, `banc-essai` 43, `banc-complet` 228, `banc-relecture` 12, `banc-touche` 34, `banc-effets` 740, `banc-nemesis` 99, `banc-essai-nemesis` 15, `banc-nemesis-revue` 17, `banc-nemesis-complet` 46, `banc-glas-relecture` 16 : 0 échec ; `banc-dernier` : les 4 échecs anciens connus ; `banc-arene` : C (coût) au-dessus de son budget pendant que d'autres bancs tournaient, puis +0,80 ms seule (≤ 1,5 : le résultat connu) ; `banc-brumeux` : un plantage du Tisse-Destin pendant la section F (`landYank` : `e.yank` déjà vide, une course ancienne du kit, hors de tout ce qui change ici), rejoué : F passe ; I-D (un tableau sans vague, au tirage) a échoué une fois puis passé ; N-C : un coup sans signe dans l'arène (Extrême, Gouffre, graine 11, une phase III anormalement longue de 652 s), hors de tout ce qui change ici (le bloc des gardiens est inerte hors de `room.g18s`) : à surveiller ; G ne pouvait pas lire `banc-arene` G (le dépôt cloné sans historique n'avait pas le commit 7f50cb0 ; dépôt complété) ; rejoué, `banc-arene` G voit le sanctuaire et le colporteur différer dès l'image 0, contre 7f50cb0 comme contre 3f1dc75 (la v18.14) : le résultat connu des polices (`banc-gardiens18` G, qui attend les polices, trouve ces deux salles identiques à la v18.14 dans les trois paliers, gardien éteint comme allumé). `banc-gardiens-final` seul : les deux résultats connus (`capture-heraut` et son corps plein 1,154 × r).
**Un vrai défaut trouvé par `banc-descente`** : la chronique de fin de descente lisait `ACTS[a].boss` pour le dernier gardien battu sans une égratignure ; avec un gardien de la descente (acte 4, `ACTG`), `ACTS[4]` n'existe pas et `openEnd` plantait. Corrigé par `nomG` (une ligne de base, inerte pour les actes I à III).
