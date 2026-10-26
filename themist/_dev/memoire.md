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

« Une ruée qui assomme donne un couloir qui étourdit » : **impossible aujourd’hui**, comme l’annonçait le § 19 (le jeu n’a pas d’état « étourdi » pour le joueur, aucune variante n’étourdit). Rien n’a été inventé : ces souvenirs gardent la version de leur famille, avec le motif en commentaire. De même pour ralentir, immobiliser, brûler, marquer, attirer. **À décider avant le palier 4** : ajouter ou non un état de ce genre au joueur (étourdi, ralenti), et lequel, avec ses règles de justice (durée maximale, jamais enchaîné, jamais pendant une autre zone) ; sans cela, ces 54 souvenirs resteront sans effet propre.

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
