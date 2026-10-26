# La Brume · Mémoire — « Ce que tu oublies, la Brume s’en souvient »

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
