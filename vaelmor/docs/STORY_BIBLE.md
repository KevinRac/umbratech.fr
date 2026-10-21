# VAELMOR — Bible narrative v0.1

> Statut : **brouillon à valider** (21/10/2026). Aucun code. Les règles de fonctionnement des dialogues de combat sont dans `GDD_Vaelmor.md` **§7.9** ; ce document porte l'histoire, les personnages, les liens entre unités et ennemis nommés, et des scènes d'exemple.
> Il s'appuie sur ce qui existe déjà dans `data/` (PNJ de `locations.json`, ennemis de `enemies.json`, quêtes de `quests.json`, alliés de `allies.json`) : les ids cités sont ceux du dépôt. Tout ce qui est marqué **(nouveau)** reste à créer en M7.

---

## 1. Ton et thèmes

- **Ton** : mélancolique, avec une lueur d'espoir (décision n°112). Les méchants ont des raisons, les bons ont des dettes. L'humour vient des petites gens (Maëlys, Corbin, Pip), jamais des boss.
- **Thèmes** :
  1. **La lumière offerte** : chaque lanterne allumée est un don. Rien n'est gratuit sur Vaelmor.
  2. **La dette** : le pacte avec la mer est une dette que chaque génération paie ou fuit.
  3. **La mémoire** : la Brume efface les noms. Se souvenir, c'est résister.
  4. **Ceux qu'on laisse derrière** : presque tous les personnages ont perdu quelqu'un à cause du pacte brisé.
- **Règle d'écriture** : une réplique = une idée, 90 caractères en moyenne, jamais plus de 140 (la boîte de dialogue est compacte). Une scène = 2 à 5 répliques.

---

## 2. Chronologie (avant le jeu)

| Époque | Événement |
|---|---|
| **An 0** | Le **Royaume de Cendrelune** unifie l'île par un pacte avec la mer. Le **Roi-Marée** règne depuis la Citadelle d'Ysmar, bâtie sur un récif. Chaque année, un **porteur de lanterne** descend au récif à marée basse et y dépose une lanterne allumée : l'offrande. |
| **~300 ans** | La marée est docile, les ports prospèrent, la Couronne grandit. Les Racines (forêt), les Veilleurs (lanternes) et l'Ordre des Marées (ports) naissent de trois façons de servir le pacte. |
| **Il y a 41 ans, « la Nuit Basse »** | Le roi **Orvane** refuse l'offrande : la mer réclamait cette année-là le porteur désigné, **sa fille Elwen**. Il garde la marée pour lui seul. La mer se retire, puis revient d'un coup : la Citadelle sombre, la **Brume Noire** monte des salles englouties. Elwen disparaît. |
| **Depuis** | La Brume avance de la côte ouest vers l'intérieur. La Couronne se replie sur Valcendre. Les Écumeurs pillent les plaines. Les noyés marchent sur la côte. |
| **Il y a 20 ans** | Naissance de **Rhyel**, fils d'Elwen (recueilli par des Veilleurs), donc **petit-fils d'Orvane**. Il l'ignore. |
| **Début du jeu** | Le héros échoue sur la rive de Haut-Gué avec une **lanterne éteinte** qu'il ne sait pas expliquer. |

---

## 3. Le héros

- **Nom** : choisi par le joueur. Les PNJ disent « l'éclaireur » (Ilar), « voyageur » (Maëlys), « toi » (Corbin).
- **Classe de départ** : au choix parmi les 12.
- **Secret (à valider, n°113)** : la lanterne éteinte est **la dernière lanterne-offrande** forgée du temps du pacte. Le héros n'en est pas l'héritier par le sang : la lanterne l'a **choisi**, parce qu'il est celui qui l'a ramassée. C'est la clé de la Citadelle (flags `acces_citadelle` + `barque_de_dorn`) et la seule chose qu'Orvane reconnaît.
- **Arc** : d'étranger sans passé à porteur de lanterne. Le héros ne parle presque jamais en dialogue libre ; il agit. Ses répliques de combat sont courtes et neutres, pour que le joueur y projette ce qu'il veut.

---

## 4. Intrigue principale en trois actes

Calée sur les quêtes `principal: true` existantes (`eclaireur_de_la_brume`, `roi_cerf_souffre`, `soeur_merrow`, `aiguille_brisee`).

### Acte I — Les plaines et la forêt (Z1-Z2, niveaux 1-9)
1. **Haut-Gué** : le héros est recueilli. Le colporteur, père de Nessa, n'est pas revenu du Pont des Trois Arches. Les Écumeurs de **Brakk** rançonnent la région.
2. **Brakk** : ancien soldat de la garnison de la Citadelle, rescapé de la Nuit Basse. Il pille parce qu'il pense que « personne ne viendra » (la Couronne a abandonné la côte). Vaincu, il laisse un indice : la Brume sort de la **mer**, pas de la terre.
3. **Éclaireur de la Brume** : le Vieux Pont mène à la forêt. **Ronceval** : le **Roi-Cerf**, gardien du Cercle des Racines, a été touché par la Brume. **Mousse**, sa jeune gardienne, veut le sauver, pas le tuer.
4. **Fin d'acte** : le Roi-Cerf libéré murmure un mot : « **Ysmar** ». La forêt s'ouvre vers la côte et vers Valcendre.

### Acte II — La côte et la capitale (Z3 et hub Valcendre, niveaux 8-14)
1. **Port-Brume** : l'**Amiral Dorn** tient la côte avec peu de moyens. Le phare de la Tour du Noyé est éteint, les noyés marchent.
2. **Sœur Mérrow**, prêtresse de l'Ordre des Marées, a tenté de **renouveler le pacte en s'offrant elle-même**. La Brume l'a prise. La libérer (quête `soeur_merrow`) révèle que l'offrande doit être **une lanterne, pas une vie**.
3. **Valcendre** : la **Régente Ysmène** veut **contraindre la mer** (barrages, canons de cendre) au lieu de l'honorer. `conspiration_au_marche` : une faction de la Couronne conspire pour refuser l'aide de l'Ordre. Le joueur arbitre entre Couronne et Marées (réputations de faction).
4. **Fin d'acte** : Dorn offre la **barque** (`barque_de_dorn`) contre l'accord de la Régente. Sans l'un des deux, la route de la Citadelle reste fermée.

### Acte III — Les monts et la Citadelle (Z4-Z5, niveaux 12-18+)
1. **Pierre-Haute** : les Veilleurs ont laissé s'éteindre les lanternes des cols (`lanternes_eteintes`). Les rallumer, c'est préparer la remontée de la marée.
2. **L'Aiguille Brisée** : le **Gardien de Cendre**, golem forgé par les ingénieurs royaux pour garder une salle des archives. Derrière : **Rhyel**, qui cherche la vérité sur sa lignée. Il rejoint la compagnie (recrue secrète).
3. **La Citadelle Engloutie** : accessible à marée basse, par la barque, avec la lanterne. **Ser Maëlis**, premier garde d'Orvane, interdit l'entrée.
4. **Orvane, le Roi-Marée Brisé** : il n'est pas un tyran. Il attend sa fille. La Brume est la mer qui n'a jamais reçu son dû.
   - **Phase 1** : trident d'eau, le roi se bat pour qu'on parte.
   - **Phase 2** : la Brume l'envahit. Rhyel et le héros doivent le **rappeler à lui-même**.

### Fins (à écrire en M7, n°114)
| Fin | Condition | Résultat |
|---|---|---|
| **La lanterne** (juste) | Réputation Marées ≥ Amical **et** Rhyel dans l'équipe | Le héros dépose la lanterne : le pacte est renouvelé sans sacrifice. La Brume reflue. |
| **La digue** | Réputation Couronne ≥ Allié, Marées < Amical | La Couronne scelle la Citadelle. La Brume est contenue, pas vaincue. Fin amère. |
| **La nuit basse** | Orvane tué sans Rhyel | La mer se retire de nouveau. Fin sombre, mais le jeu reste jouable après le générique. |

---

## 5. Personnages jouables

> Les 12 recrues sont celles de `GDD §5.7`. « Lié à » liste les ennemis nommés qui déclenchent des scènes pour elles (voir §7).

| # | Personnage | Classe | Passé | Motivation | Lié à |
|---|---|---|---|---|---|
| 0 | **Le héros** | au choix | Échoué sans mémoire, lanterne éteinte | Comprendre qui il est | Orvane, Ser Maëlis, Brakk |
| 1 | **Nessa** (Haut-Gué) | Danseur des Courants | Fille du colporteur disparu au Pont des Trois Arches ; a grandi à danser sur le gué | Retrouver son père, ne plus avoir peur du pont | Brakk, Gorm, **Rik** |
| 2 | **Ysolde** (Ronceval) | Veilleur des Falaises | Chasseuse formée par le maître-chasseur Oswin, qui a disparu dans la forêt | Retrouver son mentor, protéger le Bosquet | Roi-Cerf, Hakon, **Oswin** |
| 3 | **Mousse** (Ronceval) | Façonneur de Racines | Orpheline recueillie par le Roi-Cerf, qui l'a nommée gardienne des graines | Sauver le Roi-Cerf sans le tuer | Roi-Cerf, Hakon, Oswin |
| 4 | **Corbin « Gueule d'Os »** (Port-Brume) | Chasseur de Serpents de Mer | Seul survivant de l'équipage du capitaine Hobb, avalé par un serpent de Brume | Venger son équipage, mais surtout savoir ce qu'est devenu Hobb | Aldo Vessyr, Mérrow, **Hobb** |
| 5 | **Tiphaine** (Port-Brume) | Gardien des Marées | Garde de l'Amiral ; elle tenait le phare le soir où il s'est éteint | Réparer sa faute | Aldo Vessyr, Mérrow |
| 6 | **Sœur Ilmëa** (Pierre-Haute) | Porte-Lanterne | Veilleuse qui a vu sa sœur de l'ordre, Ilse, partir dans la Brume | Ramener Ilse ou la libérer | Mère-Harpie, **Ilse** |
| 7 | **Tobias Boulon** (Pierre-Haute) | Ingénieur des Ruines | Il a participé à relever les plans du golem de l'Aiguille, sans savoir à quoi ils serviraient | Défaire ce qu'il a contribué à bâtir | Gardien de Cendre, Veilleur de Pierre, Mère-Harpie |
| 8 | **Sire Alden** (Valcendre) | Lame du Serment | Chevalier déchu : il a rompu son serment à la Couronne le jour où le régiment de Brakk a été sacrifié | Retrouver les mots de son serment (`serment_brise`) | Brakk, Aldéric, Drak, Orvane |
| 9 | **Cendrine** (Valcendre) | Héraut des Bannières | Chanteuse de la Cour ; sa voix a ouvert les portes au coup d'État de la Régente | Racheter sa chanson | Drak, Ysmène (politique), Orvane |
| 10 | **Zéphyrin** (Valcendre) | Alchimiste des Saisons | Ses formules ont été volées par son ancien maître, Orsen | Reprendre ce qui est à lui, ou lui pardonner | **Orsen** |
| 11 | **Gérard « Pierre-Cœur »** (Valcendre) | Invocateur de Pierres Anciennes | Maçon qui entend les menhirs ; il en a réveillé un qui l'a suivi | Comprendre ce que les pierres veulent | Veilleur de Pierre, Gardien de Cendre |
| 12 | **Rhyel** (Aiguille Brisée, secret) | Héritier des Cendres | Petit-fils d'Orvane, élevé par des Veilleurs ; porte un feu qui consume la Brume | Savoir d'où il vient | Orvane, Ser Maëlis |

---

## 6. Ennemis nommés

### 6.1 Boss de zone (jamais recrutables)

| Boss | `enemies.json` | Zone | Histoire | Phase 2 |
|---|---|---|---|---|
| **Brakk**, chef des Écumeurs | `brakk` | Z1 | Ancien soldat de la garnison de la Citadelle, survivant de la Nuit Basse. Pille « parce que personne ne viendra » | Quitte son trône, s'énerve : « Alors viens me chercher ! » |
| **Le Roi-Cerf Corrompu** | `roi_cerf` | Z2 | Gardien des Racines lié au pacte, touché par la Brume. Se bat contre son gré | Les cornes s'illuminent, il lutte contre la Brume : des moments de lucidité |
| **Sœur Mérrow, la Noyée** | `soeur_merrow` | Z3 | Prêtresse de l'Ordre. S'est offerte au récif pour renouveler le pacte. Sa lanterne était le mauvais objet | Sa voix se déforme ; elle demande qu'on éteigne sa lanterne |
| **La Mère-Harpie** | `mere_harpie` | Z4 | Créature des cols, corrompue ; protège un nid de petits qui, eux, ne le sont pas | Appelle ses petits ; le joueur choisit sa priorité |
| **Le Gardien de Cendre** | `gardien_de_cendre` | Z4 | Golem royal gardant les archives de Rhyel | Poing qui s'abat, fissures dans le sol ; sa voix répète les ordres qu'on lui a donnés |
| **Orvane, le Roi-Marée Brisé** | **(nouveau)** | Z5 | Voir §4, acte III | Brume noire, voix de la mer |

### 6.2 Ennemis nommés **recrutables** (6)

Ce sont des **Échos** : un modèle d'ennemi existant (`enemies.json`), avec un autre skin, un nom, un portrait et une histoire.

| Nom | Modèle de base | Zone | Histoire | Peut parler | Condition de recrutement | Classe suggérée |
|---|---|---|---|---|---|---|
| **Rik « le Cadet »** | `ecumeur_sabreur` | Z1 | Ami d'enfance de Nessa, parti chez les Écumeurs après la mort de ses parents | Nessa ; Ilar (allié vert, scène de rappel) | Quête `colporteur_perdu` terminée, avant le tour 8 | Lame du Serment |
| **Oswin, maître-chasseur** | `chasseur_de_ronces` | Z2 | Mentor d'Ysolde, touché par la Brume en poursuivant un braconnier | Ysolde ; Mousse (scène différente) | Réputation Racines ≥ Amical | Veilleur des Falaises |
| **Capitaine Hobb** | `harponneur` | Z3 | Capitaine de Corbin, rescapé du serpent, la Brume lui fait oublier ses hommes | Corbin ; Dorn (allié vert) | Corbin déployé ; réputation Port-Brume ≥ Neutre | Chasseur de Serpents de Mer |
| **Ilse, la Veilleuse** | `voilee_de_brume` | Z3-Z4 | Sœur d'ordre d'Ilmëa, partie dans la Brume en voulant la rallumer | Ilmëa | Quête `lanternes_eteintes` terminée, avant qu'Ilse tombe sous 50 % PV | Porte-Lanterne |
| **Maître Orsen** | `mercenaire_de_cendre` | Z4 | Ancien maître de Zéphyrin, a vendu ses formules à la Couronne | Zéphyrin | 300 or de rançon **ou** réputation Couronne < Neutre | Alchimiste des Saisons |
| **Aldéric Vance** | `mercenaire_de_cendre` | Z4 | Capitaine d'un régiment de la Couronne, ancien frère d'armes d'Alden | Alden | Quête `serment_brise` terminée | Gardien des Marées |

> **Apparition en dehors des rencontres prévues** : les nommés de §6.2 et §6.3 peuvent aussi surgir **au hasard** dans un combat ordinaire de leur zone, avec un faible taux (4 % de base, voir GDD §7.9 et décision n°115). Cela rend chaque combat un peu imprévisible et récompense d'avoir recruté les bonnes unités.

### 6.3 Ennemis nommés **non recrutables** (6)

| Nom | Modèle | Zone | Histoire | Unités liées |
|---|---|---|---|---|
| **Gorm l'Incendiaire** | `ecumeur_incendiaire` | Z1 | Lieutenant de Brakk. Il a brûlé la grange de Thom | Nessa, Ilar (vert) |
| **Hakon le Bûcheron** | `bucheron_corrompu` | Z2 | Il coupait le bois du Bosquet quand la Brume l'a pris | Mousse, Ysolde |
| **Aldo Vessyr, le Noyé** | `noye` | Z3 | Frère de l'Amiral, noyé la Nuit Basse, marche sur le quai | Tiphaine, Dorn (vert), Corbin |
| **Sergent Drak** | `arbaletrier_de_cendre` | Z4 | Conspirateur de la Couronne, il a tendu l'embuscade qui a tué un ami d'Alden | Alden, Cendrine |
| **Le Veilleur de Pierre** | `golem_de_pierre` | Z4 | Menhir éveillé qui garde un col. Il ne fait que son travail | Gérard, Tobias |
| **Ser Maëlis** | `garde_englouti` | Z5 | Premier garde d'Orvane, resté à son poste. Il ne laisse passer que la lanterne | Le héros, Rhyel, Alden |

> **Nécessaire côté données (M7)** : champs `named`, `skinOf`, `portrait` sur les ennemis (voir §9), et un **portrait** pour chaque nommé (même format que celui des PNJ).

---

## 7. Qui déclenche quoi : table des liens

Chaque ligne = une ou plusieurs **scènes** : **B** = citation de combat, **P** = Parler, **M** = citation de mort, **Ph** = citation de phase. « (v) » = allié vert nommé (scénarisé, jamais commandé).

### 7.1 Boss

| Ennemi | Unités liées | B | P | M | Ph |
|---|---|---|---|---|---|
| **Brakk** | Nessa, Alden, Ilar (v), Rik (si recruté) | ✔ chacun | — | variante selon qui frappe | Alden, Nessa |
| **Roi-Cerf** | Mousse, Ysolde, Oswin (si recruté), Sylve (v) | ✔ | — | Mousse, Sylve | Mousse |
| **Mérrow** | Corbin, Tiphaine, Ilmëa, Dorn (v), Odo (v) | ✔ | — | Dorn, Odo | Ilmëa, Odo |
| **Mère-Harpie** | Yrsa (v), Tobias, Ilmëa | ✔ | — | Yrsa | Yrsa |
| **Gardien de Cendre** | Tobias, Gérard, Yrsa (v) | ✔ | — | Tobias | Tobias |
| **Orvane** | Le héros, Rhyel, Alden, Cendrine, Dorn (v) | ✔ | — | Le héros, Rhyel | Rhyel, le héros |

### 7.2 Nommés recrutables

| Ennemi | Parler | B | M (si tué) |
|---|---|---|---|
| **Rik** | Nessa | Nessa, Ilar (v) | Nessa |
| **Oswin** | Ysolde, Mousse | Ysolde, Mousse | Ysolde |
| **Hobb** | Corbin, Dorn (v scripté) | Corbin | Corbin |
| **Ilse** | Ilmëa | Ilmëa | Ilmëa |
| **Orsen** | Zéphyrin | Zéphyrin | Zéphyrin |
| **Aldéric** | Alden | Alden | Alden |

### 7.3 Nommés non recrutables

| Ennemi | B | M |
|---|---|---|
| **Gorm** | Nessa, Ilar (v) | Nessa |
| **Hakon** | Mousse, Ysolde | Mousse |
| **Aldo Vessyr** | Tiphaine, Dorn (v), Corbin | Tiphaine, Dorn (v) |
| **Drak** | Alden, Cendrine | Alden |
| **Veilleur de Pierre** | Gérard, Tobias | Gérard |
| **Ser Maëlis** | Le héros, Rhyel, Alden | Rhyel |

**Total prévu** : environ **45 scènes** de combat et de mort, plus **6 scènes de Parler**, plus les phases. Toutes courtes (2 à 5 répliques).

### 7.4 Alliés verts nommés à prévoir (M7)

Aujourd'hui `allies.json` contient des modèles **sans nom** (gardes, miliciens) et 5 errants nommés (Aldric, Brune, Sire Gauvain, Frère Anselme, Garance). Pour les scènes de la bible, on **promeut en alliés verts nommés toutes les figures combattantes des villages** (décision n°109 révisée). Ils apparaissent comme renforts selon le §7.8 du GDD, avec leur nom et leur portrait ; leurs scènes sont **scriptées**.

| Lieu | Allié vert nommé | Lien prévu (ennemi : idée de scène) |
|---|---|---|
| Haut-Gué | **Capitaine Ilar** | Brakk (ses hommes tués), Gorm, Rik (le fils du charron) |
| Haut-Gué | **Bran** (forgeron) | Gorm : a forgé les haches des Écumeurs sans le savoir |
| Haut-Gué | **Vieux Garrec** | Brakk : l'a connu soldat de la garnison |
| Ronceval | **Sylve** | Roi-Cerf (mort et phase), Hakon, Oswin |
| Ronceval | **Orin** (herboriste) | Hakon, Oswin : il soignait les deux avant la Brume |
| Ronceval | **Kael** (déserteur) | Drak : ancien camarade de la Couronne, Aldéric |
| Port-Brume | **Amiral Dorn** | Mérrow, Aldo Vessyr (son frère), Hobb, Orvane |
| Port-Brume | **Frère Odo** | Mérrow (sa mentore), Ilse |
| Port-Brume | **Marthe** (tisseuse de filets) | Hobb : c'est son mari, qu'elle croit mort |
| Port-Brume | **Lia** (cartographe) | Aldo Vessyr : elle a cartographié la côte avec lui |
| Pierre-Haute | **Garde-Cime Yrsa** | Mère-Harpie, Gardien de Cendre, Veilleur de Pierre |
| Pierre-Haute | **Maître Halvar** | Gardien de Cendre : il en a forgé les plaques |
| Pierre-Haute | **Hild** | Ilse (elle a veillé avec elle) |
| Valcendre | **Capitaine Voss** | Drak, Aldéric (ses anciens officiers) |
| Valcendre | **Maître d'arène Dax** | Aldéric, Orsen (anciens combattants de l'arène) |
| Valcendre | **Mère Yvonne** | Orsen (elle a soigné ses victimes), Ilse |
| Valcendre | **Maître Lorn** (marchand) | Orsen : lui a acheté les formules volées |
| Errants | **Aldric, Brune, Sire Gauvain, Frère Anselme, Garance** | Liens secondaires, un nommé chacun selon leur trajet |

Ceux qui sont déjà recrues (Nessa, Ysolde, Mousse, Corbin, Tiphaine, Ilmëa, Tobias, Alden, Cendrine, Zéphyrin, Gérard) ne sont pas alliés verts : ils sont de la compagnie. La Régente Ysmène reste hors combat. Toute unité nommée qui n'a pas de lien dans cette table peut en recevoir un en M7 sans changer le moteur.

---

## 8. Scènes d'exemple

> Format : `[Locuteur] réplique`. Une scène par ligne de table. Ce sont des textes de travail.

### 8.1 Brakk × Nessa (B, avant l'échange)
```
[Nessa]  C'est toi qui as arrêté mon père au pont.
[Brakk]  Un péage, gamine. Il a refusé de payer.
[Nessa]  Alors je viens récupérer ce qu'il t'a laissé.
```

### 8.2 Brakk × Alden (B)
```
[Brakk]  Sire Alden. Tu as encore ton épée, à ce que je vois.
[Alden]  Et toi, toujours ce bout de cape de la garnison. Tu devrais avoir honte.
[Brakk]  Honte ? Elle ne m'a pas défendu quand la mer est montée.
```

### 8.3 Brakk, phase 2 (déclenchée par Nessa ou Alden)
```
[Brakk]  Assez ! Vous croyez que je pille pour le plaisir ?
[Brakk]  Personne ne viendra ! Alors viens me chercher !
```

### 8.4 Rik × Nessa (P, Parler, succès)
```
[Nessa]  Rik ? C'est toi, sous cette cagoule ?
[Rik]    Nessa... Je ne savais pas que c'était ton père, au pont.
[Nessa]  Tu le sais maintenant. Reviens avec moi.
[Rik]    ...Je n'ai plus de maison. Mais j'ai encore mes jambes.
→ Rik rejoint la compagnie (classe Lame du Serment, niveau 4).
```
**Refus** (condition manquante) : `[Rik] Va-t'en, Nessa. Pas encore.` et l'action est perdue pour ce tour.

### 8.5 Rik × Ilar (allié vert, B, si Nessa absente)
```
[Ilar]  Rik ? Le fils du charron ?
[Rik]   Capitaine... Ne me regardez pas comme ça.
```

### 8.6 Aldo Vessyr (groupe : Tiphaine, Dorn (v), Corbin)
```
[Tiphaine] Aldo... Je tenais le phare, ce soir-là. Pardon.
```
```
[Dorn]     Mon frère. Je t'ai cherché pendant quarante ans.
[Aldo]     (un murmure, sans pouvoir répondre)
```
```
[Corbin]   Il me rappelle quelqu'un. Ça fait mal de voir les noyés comme ça.
```
Chaque unité liée a sa propre scène. Si les trois sont présentes, elles se jouent **une par une** à leur premier contact avec Aldo (maximum de 3 scènes par combat).

### 8.7 Roi-Cerf × Mousse (Ph, phase 2)
```
[Mousse]   Je suis là. C'est moi, la petite qui ramassait tes graines.
[Roi-Cerf] ...Ma... gardienne. Éloigne-toi. La Brume me tient.
[Mousse]   Alors tiens-toi à moi.
```

### 8.8 Orvane × Rhyel × le héros (Ph, phase 2)
```
[Orvane]   Vous ne comprenez pas. Elle a le droit de revenir.
[Rhyel]    C'est ma mère. Et elle n'est plus là. Père... grand-père... arrête.
[Orvane]   Elwen ?
[Rhyel]    Non. Moi. Regarde-moi.
```
Mort d'Orvane, si **Rhyel** porte le coup final :
```
[Orvane]   Elle... avait tes yeux.
```
Si **le héros** porte le coup final : `[Orvane] La dernière lanterne. Enfin.`

### 8.9 Mérrow, mort (si Dorn (v) l'achève)
```
[Mérrow]   Éteignez ma lanterne, amiral. Ce n'était pas la bonne.
[Dorn]     Repose-toi, Mérrow. C'est fini.
```

### 8.10 Cas où l'allié vert est mort avant sa scène
Remplacement par une **citation de deuil** de 1 réplique : `[Brakk] Où est le capitaine ? Il a fini par tomber, lui aussi ?`

---

## 9. Données (rappel, voir GDD §7.9)

### 9.1 Champs ajoutés aux ennemis (`enemies.json`)
| Champ | Rôle |
|---|---|
| `named` | `true` pour un nommé ou un boss |
| `skinOf` | id du modèle de base dont le skin est dérivé |
| `portrait` | description du portrait (comme les PNJ) |
| `recruit` | `{ talkers: [ids], requires: {...}, deadline: tour, asClass, level }` |

### 9.2 Nouveau fichier `data/battleQuotes.json`
Une entrée par scène :
| Champ | Valeurs |
|---|---|
| `id` | Identifiant de la scène |
| `enemyId` | L'ennemi nommé ou le boss |
| `unitId` | L'unité liée (compagnie ou allié vert nommé) |
| `unitStatus` | `company`, `green` |
| `kind` | `battle`, `talk`, `death`, `phase` |
| `direction` | `ally_attacks`, `enemy_attacks`, `either` |
| `conditions` | Quête, réputation, scène précédente vue, tour maximal |
| `lines` | Liste de `{speaker, text}` |
| `once` | Joué une seule fois (défaut : oui) |
| `effects` | `recruit`, réputation, objet, drapeau |

Les scènes de `talk` ont un champ de plus : `onFail` (lignes jouées en cas de refus).

---

## 10. Ce que cela implique pour la suite

| Jalon | Travail |
|---|---|
| **Avant M7** | Moteur de dialogues de combat (déclencheurs, Parler, recrutement d'un ennemi, journal). À faire entre M6 et M7 (voir PROGRESS). |
| **M6** | Un ennemi recruté reçoit une fiche d'unité complète (classe, niveau, équipement). Pas de changement du travail de M6, seulement des données. |
| **M7** | Écriture des ~50 scènes, portraits des nommés, promotion des alliés verts nommés, nouveau boss Orvane, fins. |
| **M9** | La sauvegarde retient les scènes vues, les recrutables recrutés ou perdus, les nommés vaincus. |
| **M8** | Cut-ins de phase et de mort dans l'écran de combat cinématique. |

---

## 11. Points ouverts (à écrire plus tard)

- Les dialogues libres de village (déjà dans `data/locations.json`) devront évoluer pour refléter l'arc de chaque recrue (par exemple, Nessa change de ton après avoir retrouvé son père).
- Les conversations de camp et soutiens entre alliés, **abandonnés** (décision du 21/10/2026) : seuls les dialogues avec ennemis nommés et alliés verts nommés existent.
- La **Régente Ysmène** et le **Capitaine Voss** n'ont pas de lien de combat prévu ; ils jouent dans les quêtes politiques.
- Une fin supplémentaire liée à Mousse et au Roi-Cerf pourra être ajoutée si le budget le permet.
