# VAELMOR — Game Design Document v0.2

> RPG tactique en monde ouvert, fantasy médiévale, jouable dans le navigateur.
> Statut : **validé le 16/10/2026** (les 28 décisions du §19 sont acceptées telles quelles). Toute modification passe désormais par une nouvelle décision.
> Nom de travail du jeu : **Vaelmor : Les Marées de Cendre** (modifiable).

---

## Table des matières

1. Vision du jeu
2. Périmètre du prototype
3. Monde et île
4. Exploration en monde ouvert
5. Villages, grande ville et PNJ
6. Système de réputation
7. Ennemis dans le monde ouvert
8. Zones de niveau
9. Combat tactique
10. Classes et progression (12 classes, 24 évolutions)
11. Animations de combat
12. Direction artistique
13. UI/UX
14. Sauvegarde localStorage
15. Stack technique
16. Architecture logicielle
17. Plan de développement
18. Risques et solutions
19. Décisions validées

---

## 1. Vision du jeu

### 1.1 Pitch (5 phrases)

1. Vous incarnez un héros échoué sur **Vaelmor**, une île millénaire que la **Brume Noire** ronge depuis la Citadelle Engloutie.
2. Vous explorez librement plaines, forêts, côtes, marais et montagnes, et vous croisez des ennemis **visibles** que vous pouvez éviter, piéger ou affronter.
3. Chaque contact déclenche un **combat tactique sur grille**, au tour par tour, avec préparation de l'équipe, terrain, ripostes et boss.
4. Votre **réputation** dans chaque village décide des prix, des quêtes, des recrues et même des embuscades.
5. Douze classes originales, chacune avec deux évolutions, vous permettent de bâtir une compagnie unique et de défier le Roi-Marée Brisé.

### 1.2 Ton et ambiance

- **Ton** : fantasy médiévale mélancolique mais chaleureuse. Un monde usé par la guerre, où les petites communautés tiennent debout par solidarité.
- **Ambiance** : lumière dorée sur les plaines, brume bleutée sur la côte, lanternes dans la nuit. Références d'ambiance : Fire Emblem GBA (lisibilité, sprites expressifs), Octopath Traveler (lumière), Wargroove (clarté).
- **Expérience recherchée** :
  - Explorer sans carte surchargée : curiosité, petits secrets.
  - Chaque combat est un **petit puzzle tactique** de 5 à 12 minutes.
  - Un sentiment d'attachement à ses unités (noms, dialogues, évolutions).
  - Une boucle claire : **explorer → engager → combattre → progresser → rentrer au village**.

### 1.3 Boucle de jeu

```
Explorer le monde ─► Repérer un ennemi (indicateur de danger)
        ▲                         │
        │                         ▼
Village : soigner, acheter,   Préparer l'équipe (écran de préparation)
quêtes, réputation                │
        ▲                         ▼
        └── Récompenses ◄── Combat tactique (victoire / défaite)
              (XP, or, objets, réputation, recrues)
```

### 1.4 Piliers de design

| Pilier | Règle concrète |
|---|---|
| **Lisibilité** | Toute information de combat (portée, dégâts, précision) est visible avant de valider une action. |
| **Choix significatifs** | Terrain, classe, réputation et préparation influencent réellement le résultat. |
| **Respect du temps** | Combats courts, animations accélérables, sauvegarde automatique. |
| **Extensibilité** | Tout contenu (classe, ennemi, village, carte) est une donnée, pas du code. |
| **Beauté d'abord** | Moins de contenu, mais avec une présentation soignée (lumière, particules, UI). |

---

## 2. Périmètre du prototype

### 2.1 Inclus

| Système | Quantité / niveau d'ambition |
|---|---|
| Île | 1 île, ~160×120 tuiles (2 560×1 920 px), 5 zones de niveau |
| Villages | **4 villages** + **1 grande ville** |
| PNJ | ~30 PNJ nommés, dont 5 à 8 avec dialogues à choix |
| Réputation | Par lieu (5 jauges) + 4 factions (jauges secondaires) |
| Ennemis monde | 5 comportements, ~12 types visuels, 5 boss de zone |
| Combat tactique | Complet : préparation, déploiement, ripostes, objets, compétences, boss à 2 phases |
| Classes | 12 classes de départ, 24 évolutions |
| Animations de combat | Animation d'attaque + critique pour **12 classes de base** (24 évolutions : recoloration + variantes d'effets au début) |
| Cartes tactiques | 12 cartes sélectionnées/assemblées + génération par gabarits |
| Sauvegarde | localStorage : auto + manuelle, versionnée, export/import |
| Audio | Musique par zone (5 pistes), ~40 effets |

### 2.2 Différé (hors prototype)

- Multijoueur, cycle jour/nuit complet, météo dynamique avec effet de gameplay.
- Système de mariage/relations (« supports » de Fire Emblem), arbres de dialogue ramifiés longs.
- Artisanat complet, pêche, élevage, dresseur de bêtes comme classe jouable (idée mise de côté).
- Éditeur de niveaux intégré, mods.
- Localisation multi-langues (le français est la langue unique, mais les textes sont externalisés pour le futur).
- Animations uniques pour chacune des 24 évolutions (seulement 6 uniques au prototype, voir §11).

### 2.3 Limites assumées

- Placeholders de qualité pour l'art et l'audio (voir §12.7).
- Équilibrage « raisonnable » et non définitif ; des paramètres centralisés permettent d'itérer.
- Pas de scénario long : une quête principale de ~8 étapes + ~12 quêtes secondaires.
- Durée de jeu cible : **3 à 5 heures** pour finir le prototype, 45 minutes pour la première zone.

---

## 3. Monde et île

### 3.1 L'île de Vaelmor

**Histoire courte.** Il y a trois siècles, le **Royaume de Cendrelune** unifia l'île grâce à un pacte avec la mer : le **Roi-Marée** régnait depuis la Citadelle d'Ysmar, bâtie sur un récif. Le pacte exigeait un sacrifice annuel de lanternes (offrandes de lumière). Le dernier roi, **Orvane**, voulut garder la marée pour lui seul. La mer se retira, puis revint : la Citadelle sombra et libéra la **Brume Noire**, qui transforme la faune et rend les morts agités. Depuis, l'île est fracturée en factions rivales, chacune convaincue de détenir la solution.

**Conflit central.** La Brume avance de la côte ouest vers l'intérieur. Le joueur doit réunir une compagnie, regagner la confiance des communautés et atteindre la Citadelle Engloutie pour affronter Orvane, devenu le **Roi-Marée Brisé**.

### 3.2 Factions

| Faction | Idéologie | Territoire | Relation au joueur |
|---|---|---|---|
| **Ordre des Marées** | Rétablir le pacte, respect de la mer | Port-Brume, côte | Alliés potentiels, rigides |
| **Couronne de Cendre** | Restaurer la monarchie par la force | Valcendre (ville) | Ambigus, politiques |
| **Cercle des Racines** | La forêt doit être préservée, la Brume est un déséquilibre | Ronceval | Alliés potentiels, méfiants envers la Couronne |
| **Veilleurs des Lanternes** | Entretenir la lumière contre la Brume | Pierre-Haute, chemins | Neutres, soigneurs |
| **Brume Noire** (ennemi) | Créatures et morts corrompus, mené par Orvane | Marais, Citadelle | Hostile |
| **Écumeurs du Gué** (bandits) | Pillage | Plaines, routes | Hostiles, éliminables pour gagner de la réputation |

### 3.3 Carte schématique (échelle abstraite)

```
 N
 ▲   ┌───────────────────────────────────────────────────────────┐
     │  ▲▲▲▲ MONTS DE CENDRE (Z4: niv 12-18)                     │
     │  ▲▲▲  [Pierre-Haute]            ~~~ Fleuve Argent ~~~     │
     │  ▲▲      ║ ruines de l'Aiguille                           │
     │          ║                                                │
     │   ♣♣♣ FORÊT-RACINE (Z2: niv 4-9)      ╔═══════════════╗   │
     │   ♣♣♣ [Ronceval]  ♣♣♣  ═══route═══╗   ║  VALCENDRE    ║   │
     │   ♣♣♣ Bosquet du Roi-Cerf          ╚═══║ (grande ville)║   │
     │            ║                           ╚═══════╦═══════╝   │
     │            ║                                   ║           │
     │   ░░░ PLAINES D'AUBEMER (Z1: niv 1-5)          ║           │
     │   ░░░ [Haut-Gué]★ départ ══════ Pont des Trois Arches      │
     │   ░░░ Camp des Écumeurs                         ║          │
     │                                                 ║          │
     │  ≈≈≈ MARAIS DE BRUME (Z3: niv 8-14)    ≈≈≈ CÔTE DES BRUMES │
     │  ≈≈≈ Tour du Noyé  ≈≈≈ [Port-Brume] ══════════╝            │
     │  ≈≈≈ ≈≈≈                                                   │
     │         ◊◊◊ CITADELLE ENGLOUTIE (Z5: niv 16+) ◊◊◊          │
     │         (accessible par marée basse, falaise sud-ouest)    │
     └───────────────────────────────────────────────────────────┘
```

Légende : ★ départ, ═ routes, ≈ eau/marais, ▲ montagne, ♣ forêt, ░ plaine, ◊ zone finale.

### 3.4 Régions et zones de niveau

| Zone | Région | Niveaux | Lieux clés | Biome | Boss de zone |
|---|---|---|---|---|---|
| **Z1** | Plaines d'Aubemer | 1–5 | Haut-Gué, Camp des Écumeurs, Pont des Trois Arches | Plaine, rivière | **Brakk, chef des Écumeurs** |
| **Z2** | Forêt-Racine | 4–9 | Ronceval, Bosquet du Roi-Cerf, Ruines du Pont-Vieux | Forêt | **Le Roi-Cerf Corrompu** |
| **Z3** | Côte des Brumes et Marais | 8–14 | Port-Brume, Tour du Noyé, Plage des Épaves | Côte, marais | **Sœur Mérrow, la Noyée** |
| **Z4** | Monts de Cendre | 12–18 | Pierre-Haute, Aiguille brisée, Valcendre (accès par route sûre) | Montagne, ville | **Gardien de Cendre (golem)** |
| **Z5** | Citadelle Engloutie | 16+ | Marée basse, Salles englouties | Ruines marines | **Orvane, le Roi-Marée Brisé** |

> **Valcendre** est dans la zone Z2/Z4 (niveaux 6–12 sur la route, ville sûre). C'est un **hub neutre** : aucun combat à l'intérieur des murs.

### 3.5 Types de terrain (monde et combat)

| Terrain | Coût déplacement (inf.) | Défense | Esquive | Remarque |
|---|---|---|---|---|
| Plaine | 1 | 0 | 0 | Terrain de référence |
| Route | 1 | 0 | 0 | Mobilité +1 pour montés/éclaireurs |
| Forêt | 2 | +1 | +20 | Bloque la ligne de vue des archers à longue portée |
| Montagne | 3 | +2 | +10 | Inaccessible aux montés |
| Rivière | Infranchissable (sauf gué) | — | — | Gué : coût 3, esquive −10 |
| Pont | 1 | 0 | 0 | Goulot d'étranglement tactique |
| Ruines | 1 | +2 | +10 | Peuvent contenir un coffre |
| Village / ville | 1 | +1 | +10 | Soigne 20 % PV max/tour à l'unité qui s'y trouve (si allié) |
| Plage | 2 | 0 | −5 | Sable ralentissant |
| Marais | 3 | 0 | −10 | Applique « Enlisé » (−1 Mob au tour suivant) |
| Eau profonde | Infranchissable | — | — | Mobilité spéciale seulement (Danseur des Courants, Gardien en évolution) |

### 3.6 Points d'intérêt

| Type | Exemples | Nombre prototype |
|---|---|---|
| Marchands | Dans chaque village + marchand ambulant | 6 |
| Quêtes | Panneaux, PNJ à point d'exclamation | ~14 |
| Recrutement | 1 ou 2 recrues par lieu | 10 recrues |
| Coffres | Ruines, falaises, grottes | ~15 |
| Lieux sûrs | Autels des Lanternes (soin gratuit, sauvegarde) | 6 |
| Camps ennemis | Écumeurs, Brume | 5 |
| Donjons / repaires | Tour du Noyé, Aiguille brisée, Citadelle | 3 |

---

## 4. Exploration en monde ouvert

### 4.1 Perspective (choix et justification)

**Top-down 2D en pixel art (vue 3/4 type Zelda : Link to the Past / Fire Emblem monde)**.

- Plus simple que l'isométrique : pas de gestion de profondeur complexe, collisions faciles, outils d'édition (Tiled) standard.
- Lisible, cohérent avec la grille tactique (même vue).
- L'isométrique et la 2.5D sont exclues pour le prototype (coût d'art ×2 à ×3).
- Effet de profondeur apporté par : décalage parallaxe léger des nuages, ombres portées, arbres devant/derrière le joueur (tri par Y).

### 4.2 Déplacement et contrôles

| Action | Touches |
|---|---|
| Déplacement | ZQSD / WASD / Flèches (8 directions) |
| Interagir / parler / valider | E ou Espace |
| Annuler / retour | Échap ou Retour arrière |
| Sprint | Maj (consomme 0 ressource, vitesse ×1,5, bruit : double le rayon de détection ennemie) |
| Menu principal | Tab ou M |
| Carte de l'île | N |
| Journal de quêtes | J |
| Manette | Différé (décision n°20) |
| Souris | Menus et UI cliquables ; pas de déplacement à la souris |

**Valeurs de référence** : vitesse de marche 80 px/s, sprint 120 px/s (à 16 px/tuile = 5 / 7,5 tuiles/s), accélération douce (80 ms).

### 4.3 Caméra

- Suit le joueur avec un lissage (lerp 0,12) et une zone morte de 24×16 px.
- Limitée aux bords de la carte.
- Zoom entier uniquement (×3 à ×5 selon la fenêtre) pour garder le pixel parfait.
- Transitions : fondu au noir (300 ms) pour entrer dans un village, flash blanc + zoom (400 ms) pour un combat.

### 4.4 Collisions

- Grille de collision par couche Tiled (`collision`) avec valeurs : 0 libre, 1 bloqué, 2 eau, 3 zone lente (marais), 4 zone verrouillée conditionnelle.
- Hitbox du joueur : 10×8 px aux pieds (permet de passer derrière les arbres).
- Collisions avec bâtiments par polygones simples (rectangles).
- Les zones **verrouillées** s'affichent par des éléments diégétiques : barricade, brume épaisse, garde qui bloque.

### 4.5 Entrée dans les lieux

- Village/ville : trigger d'entrée sur la route. L'accès est fluide (la carte du village est **dans** la carte du monde, sans écran de chargement) ; la musique change et un bandeau affiche le nom et la **réputation** actuelle.
- Intérieurs (auberge, forge, maison) : mini-scènes séparées (fondu) en prototype, pour limiter la complexité.
- Zone « sûre » : pas de poursuite ennemie dans les murs.

### 4.6 Zones verrouillées

| Verrou | Condition | Exemple |
|---|---|---|
| Progression | Boss de zone précédent vaincu | Brume épaisse à l'entrée de Z3 tant que le Roi-Cerf vit |
| Réputation | Statut ≥ Amical dans un lieu | Passage de Pierre-Haute vers la Citadelle (Veilleurs) |
| Quête | Objet ou événement | Clé de l'Aiguille, marée basse (quête) |
| Niveau | Aucun verrou dur, mais avertissement visuel et indicateur de danger | Les zones sont ouvertes mais dangereuses |

### 4.7 Fuite, évitement, interactions avec les ennemis

- **Éviter** : sortir du rayon de détection, passer derrière des obstacles, utiliser la forêt (rayon réduit de 40 %).
- **Fuir** : ennemi en poursuite abandonne après 6 s hors de vue ou à 8 tuiles ; un objet (**Poudre de Brume**) le désoriente 10 s.
- **Embuscade du joueur** : toucher un ennemi qui ne vous a pas détecté (par derrière) donne un **avantage de position** : 1 tour de **Initiative** (le joueur joue deux fois la première phase) et déploiement libre.
- **Combat évitable** : ennemis mineurs fuyants (« Rôdeurs timides ») qui abandonnent si trop faibles.

### 4.8 Fast travel

**Proposé : OUI, limité.** Aux **autels des Lanternes** découverts. Conditions : être sur un autel ou dans un village ; coût 0 or ; impossible pendant une quête « poursuite ». Il économise 2 à 5 minutes de marche. À valider (décision n°7).

---

## 5. Villages, grande ville et PNJ

### 5.1 Principes

- Chaque lieu a : une **identité visuelle** (palette, architecture), une **spécialité**, **5 à 8 PNJ**, une **jauge de réputation locale** et une **musique**.
- Les dialogues sont courts (2 à 4 lignes), avec des **variantes selon la réputation**.

### 5.2 Haut-Gué (village de départ, Z1)

| | |
|---|---|
| **Ambiance** | Village de pêcheurs et de fermiers, toits de chaume, moulin, gué sur le fleuve Argent. Palette dorée et verte. |
| **Population** | ~120 habitants. |
| **Spécialité** | Soins et rations (Pain doré, Soupe du gué). |
| **Rôle** | Tutoriel : première quête, premier combat, première recrue. |

**PNJ importants**

| PNJ | Rôle | Remarque |
|---|---|---|
| **Maëlys la Tavernière** | Aubergiste | Repos (soin complet de l'équipe, 20 or), sauvegarde manuelle |
| **Thom le Meunier** | Quêteur | « Les Écumeurs ont volé ma farine. » |
| **Capitaine Ilar** | Garde | Donne la quête principale (« Éclaireur de la Brume ») |
| **Bran le Forgeron** | Forgeron | Armes basiques, réparation inutile (pas de durabilité) |
| **Nessa la Jeune** | Recrue (**Danseur des Courants**) | Recrutée après la quête « Le colporteur perdu » |
| **Vieux Garrec** | Ancien | Histoire de l'île |

**Dialogues d'exemple**

- Maëlys (Neutre) : « Assieds-toi, voyageur. Si tu cherches du travail, Thom a une affaire de farine. »
- Maëlys (Allié) : « Ta chambre habituelle est prête. Et ce soir, la soupe est offerte. »
- Garde Ilar (Hostile) : « Tu as fait du tort à notre village. Ne traîne pas près du puits. »

**Quêtes potentielles** : *La farine volée* (Z1, +10 rép), *Le colporteur perdu* (recrue, +15 rép), *Éclaireur de la Brume* (principale).
**Réputation locale** : départ à +10 (Neutre).

### 5.3 Ronceval (village forestier, Z2)

| | |
|---|---|
| **Ambiance** | Village sur pilotis, cabanes dans les arbres, lucioles. Palette verts profonds et ambre. |
| **Population** | ~90, mi-humains mi-esprits de la forêt. |
| **Spécialité** | Herbes, potions, arcs, arbres sacrés. |
| **Rôle** | Introduit le **Cercle des Racines**, la classe **Façonneur de Racines**, le premier boss de forêt. |

| PNJ | Rôle |
|---|---|
| **Sylve, Première des Racines** | Cheffe du village, donne la quête du Roi-Cerf |
| **Orin le Herboriste** | Marchand de potions |
| **Ysolde la Chasseuse** | Recrue (**Veilleur des Falaises**), exige réputation Amical |
| **Kael, ex-Couronne** | Déserteur, vend des infos sur Valcendre |
| **Pip le Gamin** | Guide (donne la position de 2 coffres) |

**Dialogues**

- Sylve (Méfiant) : « Les arbres se souviennent des haches. Prouve que tu n'en portes pas contre nous. »
- Sylve (Héros local) : « Les racines te reconnaîtront. Prends cette graine, elle ouvre la voie du Bosquet. »

**Quêtes** : *Le Roi-Cerf souffre* (boss de zone), *Les braconniers de la Couronne* (bonus réputation Racines, malus Couronne), *Graine perdue*.
**Réputation locale** : départ à 0.

### 5.4 Port-Brume (village côtier, Z3)

| | |
|---|---|
| **Ambiance** | Port de brume, quais de pierre, phare éteint, voiles grises. Palette bleu-gris, ocre, lanternes. |
| **Population** | ~150, marins et pêcheurs. |
| **Spécialité** | Armes à harpon, cartes marines, pêche. |
| **Rôle** | Siège de l'**Ordre des Marées** ; donne accès à la barque vers la Citadelle (fin de partie). |

| PNJ | Rôle |
|---|---|
| **Amiral Dorn Vessyr** | Chef de l'Ordre, donne la quête de la barque |
| **Marthe la Tisseuse de filets** | Marchande, vend des filets (objets de contrôle) |
| **Corbin « Gueule d'Os »** | Recrue (**Chasseur de Serpents de Mer**) |
| **Lia la Cartographe** | Quêteuse (révèle des POI de la carte) |
| **Frère Odo** | Prêtre, change la réputation Veilleurs |

**Dialogues**

- Dorn (Neutre) : « La mer reprend ce qu'on lui doit. La question est : de quel côté seras-tu quand elle viendra ? »
- Corbin (Allié) : « J'ai un harpon qui n'a jamais manqué. Dis-moi quel monstre tu veux. »

**Quêtes** : *Le phare éteint* (allumer le phare, +20 rép), *Les épaves de la plage* (coffres), *Sœur Mérrow* (boss de zone).
**Réputation locale** : départ à −10 (Méfiant, la Couronne a mauvaise presse).

### 5.5 Pierre-Haute (village de montagne, Z4)

| | |
|---|---|
| **Ambiance** | Village fortifié dans la roche, escaliers, braseros, forges. Palette gris-roux et orange. |
| **Population** | ~70, nains de caractère et humains (sans écarts de race en gameplay). |
| **Spécialité** | Armures, minerais, pièces d'ingénierie. |
| **Rôle** | Siège des **Veilleurs des Lanternes**, classe **Ingénieur des Ruines**, accès à l'Aiguille brisée. |

| PNJ | Rôle |
|---|---|
| **Maître Halvar Forge-Clair** | Forgeron principal, armes avancées |
| **Sœur Ilmëa** | Prêtresse des Lanternes, recrue (**Prêtresse des Lanternes** / Porte-Lanterne) |
| **Tobias Boulon** | Recrue (**Ingénieur des Ruines**) |
| **Garde-Cime Yrsa** | Contrôle l'accès à la Citadelle (réputation ≥ Amical) |

**Quêtes** : *Les lanternes éteintes* (relancer 3 lanternes, +25 rép), *L'Aiguille brisée* (donjon), *Armure de Halvar* (objet unique).
**Réputation locale** : départ à 0.

### 5.6 Valcendre (grande ville, hub)

| | |
|---|---|
| **Ambiance** | Capitale déchue, murailles, quartiers marchand et noble, cathédrale à demi-effondrée. Palette pierre claire, rouge cendre, bannières pâles. |
| **Population** | ~1 200 (représentée par ~25 PNJ visibles). |
| **Spécialité** | Tout : marchés, guilde, arène, recrues. |
| **Rôle** | Hub central, siège de la **Couronne de Cendre**, intrigue politique. |

**Quartiers** : Marché, Quartier des Forges, Cathédrale, Caserne, Auberge du Corbeau, Arène des Cendres, Quartier des pauvres.

| PNJ | Rôle |
|---|---|
| **Régente Ysmène** | Dirige la Couronne, quête politique |
| **Capitaine Voss** | Caserne ; recrutement de mercenaires |
| **Maître Lorn** | Marchand d'objets rares |
| **Sire Alden** | Recrue (**Lame du Serment**), exige quête *Le serment brisé* |
| **Cendrine la Chanteuse** | Recrue (**Héraut des Bannières**) |
| **Mère Yvonne** | Soigneuse, œuvre de charité (réputation par dons) |
| **Zéphyrin l'Alchimiste** | Recrue (**Alchimiste des Saisons**) |
| **Gérard « Pierre-Cœur »** | Recrue (**Invocateur de Pierres Anciennes**) |
| **Maître d'arène Dax** | Combats bonus (récompenses) |

**Dialogues**

- Ysmène (Neutre) : « La couronne ne se mendie pas. Elle se mérite. Aidez-nous, et nous parlerons de la mer. »
- Voss (Hostile) : « Plus un pas. La caserne est interdite aux traîtres. »

**Quêtes** : *Le serment brisé*, *Conspiration au marché*, *La Reine des Cendres* (histoire), *Arène* (série de combats).
**Réputation locale** : départ à 0. **Aucun combat dans la ville** (hors arène).

### 5.7 Recrutement : tableau récapitulatif

| Recrue | Classe | Lieu | Condition |
|---|---|---|---|
| Héros (joueur) | Au choix parmi 12 | Début | Création |
| Nessa | Danseur des Courants | Haut-Gué | Quête *Le colporteur perdu* |
| Ysolde | Veilleur des Falaises | Ronceval | Rép ≥ Amical |
| Façonneur anonyme (Mousse) | Façonneur de Racines | Ronceval | Quête *Graine perdue* |
| Corbin | Chasseur de Serpents de Mer | Port-Brume | Rép ≥ Neutre + 300 or |
| Garde de Dorn | Gardien des Marées | Port-Brume | Quête *Le phare éteint* |
| Sœur Ilmëa | Porte-Lanterne | Pierre-Haute | Quête *Les lanternes éteintes* |
| Tobias | Ingénieur des Ruines | Pierre-Haute | Rép ≥ Neutre |
| Sire Alden | Lame du Serment | Valcendre | Quête *Le serment brisé* |
| Cendrine | Héraut des Bannières | Valcendre | Rép ≥ Amical |
| Zéphyrin | Alchimiste des Saisons | Valcendre | Rép ≥ Neutre + 500 or |
| Gérard | Invocateur de Pierres Anciennes | Valcendre | Quête d'arène |
| Rhyel (secret) | Héritier des Cendres | Aiguille brisée | Boss de zone Z4 |

---

## 6. Système de réputation

### 6.1 Structure

- **Réputation locale** : une valeur par lieu (5 lieux). Pilote la boutique, les PNJ et les recrues.
- **Réputation de faction** : 4 valeurs (Marées, Couronne, Racines, Lanternes). Elles se mettent à jour à partir d'actions précises et ouvrent l'accès aux zones et à l'histoire.
- Un événement peut affecter les deux : ex. aider Ronceval **+Racines** et **−Couronne**.

### 6.2 Échelle

Valeur de −100 à +100.

| Statut | Plage | Prix boutique | Dialogue |
|---|---|---|---|
| **Hostile** | −100 à −61 | ×1,50 (ou refus de vente) | Les gardes attaquent, accès refusé |
| **Méfiant** | −60 à −21 | ×1,20 | Réponses sèches |
| **Neutre** | −20 à +20 | ×1,00 | Standard |
| **Amical** | +21 à +50 | ×0,95 | Rumeurs utiles |
| **Allié** | +51 à +80 | ×0,85 | Quêtes spéciales, recrues, repos gratuit |
| **Héros local** | +81 à +100 | ×0,75 | Cadeaux uniques, événements, soutien en combat |

### 6.3 Gains et pertes

| Action | Variation |
|---|---|
| Quête secondaire terminée | +10 à +20 |
| Quête principale locale | +25 |
| Tuer un ennemi qui menace le lieu (camp) | +5 à +15 |
| Don à l'église/charité (100 or) | +3 (max +15/jour de jeu) |
| Voler / attaquer un PNJ | −30 à −60 |
| Refuser une quête importante | −5 |
| Mauvais choix de dialogue (menace) | −5 à −10 |
| Faire le jeu de la faction rivale | −10 faction concernée, +10 pour l'autre |
| Perte d'une unité de la ville (recrue) en combat | −3 (message : « Nous pleurons nos fils ») |

**Décroissance** : au-delà de +50 ou en-deçà de −50, la valeur revient doucement de 1 point par visite si aucune action n'est faite (évite les réputations figées). À valider (décision n°10).

### 6.4 Effets concrets

| Effet | Règle |
|---|---|
| **Prix** | Multiplicateur du tableau §6.2 (achat), revente fixe à 40 % de la valeur de base. |
| **Quêtes** | Certaines nécessitent ≥ Amical (marquées d'une étoile). |
| **Recrutement** | Voir §5.7. |
| **Accès aux zones** | Pierre-Haute → Citadelle (Amical), Cathédrale de Valcendre (Allié Couronne). |
| **Réaction PNJ** | Variantes de dialogue, expression du portrait (sourire/froncement). |
| **Événements** | À Hostile : **embuscade de gardes** en sortie de village ; à Héros local : **renforts alliés** (PNJ qui rejoint un combat dans la zone). |
| **Indicateur UI** | Jauge colorée en bas du HUD à l'entrée du lieu (voir §13). |

### 6.5 Extensibilité

Chaque lieu est défini par `reputationId` et chaque action par un `reputationEffect: [{target, delta}]` dans les données. Ajouter un village = ajouter une entrée de données.

---

## 7. Ennemis dans le monde ouvert

### 7.1 Types d'apparition

| Type | Comportement hors combat | Détection | Exemple |
|---|---|---|---|
| **Fixe (Sentinelle)** | Immobile, regarde une direction | Cône 90°, 5 tuiles | Garde de camp écumeur |
| **Patrouille** | Suit un trajet (2 à 6 points), pause 2 s à chaque point | Cercle 4 tuiles + cône 6 tuiles | Loups, soldats |
| **Aléatoire (Errant)** | Marche au hasard dans une zone | Cercle 4 tuiles | Sangliers de Brume |
| **Embuscade** | Invisible (caché dans buisson/eau), s'active à 2 tuiles | Contact | Bandits dans les roseaux, Noyés |
| **Boss de zone** | Fixe dans son repaire, déclenche à 6 tuiles | Zone de repaire | Brakk, Roi-Cerf, etc. |
| **Lié à une faction/quête** | Apparaît uniquement quand la condition est vraie | Variable | Garde hostile si Hostile |

### 7.2 Machine d'état simplifiée

```
IDLE/PATROL ──(joueur vu)──► ALERTE (! 0,6 s) ──► POURSUITE
     ▲                                                │
     │                                          (perdu 6 s / 8 tuiles)
     └──────────────── RETOUR ◄───────────────────────┘
POURSUITE ──(contact)──► COMBAT
Ennemi faible ──(niveau joueur ≥ ennemi +5)──► FUITE
Vigie ──(joueur vu)──► APPEL RENFORTS (ajoute 1 à 2 ennemis proches au combat)
```

### 7.3 Détection

- Rayon de base par type (4 à 6 tuiles).
- Modificateurs : forêt −40 %, sprint +100 %, nuit (future) +0, bonus de classe (Chasseur de Serpents de Mer : −20 %).
- Les ennemis peuvent être **rendus invisibles** hors de leur champ de vision (brouillard léger).

### 7.4 Déclenchement du combat

| Déclencheur | Effet |
|---|---|
| **Contact direct** | Combat normal |
| **Attaque du joueur** (action E à portée) sur ennemi non alerté | Avantage de position (§4.7) |
| **Zone de détection** (embuscade) | Désavantage : une partie de l'équipe démarre aux positions imposées |
| **Événement scripté** | Boss, cinématique |

### 7.5 Indicateur de difficulté

Au-dessus de l'ennemi (visible à l'approche, ~10 tuiles) : icône de crâne + couleur selon le **niveau moyen ennemi vs niveau moyen de l'équipe**.

| Écart (ennemi − équipe) | Icône | Libellé |
|---|---|---|
| ≤ −4 | Vert | Facile |
| −3 à −1 | Jaune clair | Abordable |
| 0 à +2 | Jaune | Équilibré |
| +3 à +5 | Orange | Dangereux |
| ≥ +6 | Rouge | Mortel |
| Boss | Violet | Boss |

### 7.6 Récompenses

| Récompense | Formule |
|---|---|
| **XP** | Voir §9.12 |
| **Or** | 10–30 or par ennemi (×niveau de zone), boss ×5 |
| **Objets** | Tables de butin par ennemi : 20 % consommable, 5 % équipement, boss : objet garanti |
| **Réputation** | Selon la quête/le camp (§6.3) |
| **Matériaux** | Peaux, minerais (pour l'amélioration d'armes, étape future) |
| **Recrues** | Boss de zone secret (Rhyel) |

### 7.7 Réapparition

| Type | Règle |
|---|---|
| Fixe de camp | **Ne réapparaît pas** une fois le camp nettoyé (persistant). |
| Patrouille | Réapparaît après un **repos à l'auberge** (équivaut à un « jour »). |
| Aléatoire | Réapparaît après 10 minutes de jeu ou changement de zone. |
| Embuscade | Une seule fois par emplacement. |
| Boss de zone | **Jamais** (défaite → état sauvegardé). |
| Liés à quête | Dépend du script. |

---

## 8. Zones de niveau

### 8.1 Tableau général

| Zone | Niveaux | Ennemis types | Difficulté | Récompenses | Règle de progression |
|---|---|---|---|---|---|
| **Z1 Aubemer** | 1–5 | Écumeurs, loups, sangliers | Tutoriel douce | 15 or/ennemi, potions | Boss Brakk → ouvre Z2 |
| **Z2 Forêt-Racine** | 4–9 | Brigands, loups des bois, esprits corrompus | Normale | 25 or, herbes, arcs | Roi-Cerf → ouvre Z3 et route de Valcendre |
| **Z3 Côte/Marais** | 8–14 | Noyés, crabes, sirènes de Brume | Tactique (marais lent) | 40 or, filets, cartes | Sœur Mérrow → ouvre Z4 |
| **Z4 Monts de Cendre** | 12–18 | Golems, mercenaires de Cendre, harpies | Difficile | 60 or, armures | Gardien de Cendre → ouvre Citadelle |
| **Z5 Citadelle** | 16+ | Revenants, abyssaux, Orvane | Très difficile | 100 or, objets légendaires | Orvane = fin |

### 8.2 Règles de dangerosité

1. Les ennemis d'une zone **ne s'adaptent pas** au niveau du joueur (monde fixe, lisible).
2. Chaque zone contient **un camp** et **un boss**.
3. Le niveau d'un ennemi = niveau de base de la zone + variation de ±1 selon la distance au boss.
4. Un **bonus de rattrapage** : XP ×1,25 si l'unité est 3 niveaux sous la moyenne de l'équipe (pour les recrues).
5. Un **malus de sur-niveau** : XP ×0,5 si l'équipe est 5 niveaux au-dessus de la zone.

---

## 9. Combat tactique

### 9.1 Transition monde → combat

1. Contact : l'ennemi pointe un « ! », musique coupée.
2. Flash blanc 150 ms + effet de zoom radial 400 ms.
3. Chargement de la carte tactique (< 1 s attendu).
4. Écran de **préparation** (§9.3).

### 9.2 Sélection / génération de la carte

| Méthode | Usage | Détail |
|---|---|---|
| **Carte fixe** | Boss, scénario | Dessinée dans Tiled |
| **Gabarit + terrain** | Combats génériques | 3 à 4 gabarits par biome (clairière, route, rivière, ruines) |
| **Terrain échantillonné** | Combats aléatoires | On « découpe » une portion du terrain réel du monde (12×10 tuiles) autour du point de contact, avec réécriture des obstacles pour qu'elle reste jouable |

**Tailles** : Petite 10×8, Moyenne 14×10, Grande 18×14 (**paramétrables par donnée**).
**Unités** : 3–6 alliées, 3–10 ennemies (selon taille).

### 9.3 Écran de préparation

| Élément | Règle |
|---|---|
| **Équipe** | Roster jusqu'à 12 ; **déploiement max** défini par la carte (4 à 8). |
| **Emplacements** | Cases bleues de déploiement ; on glisse les unités. |
| **Formation** | Bouton « Auto » (placement tank devant, soigneur derrière). |
| **Objets** | Choix de l'équipement et des objets d'inventaire par unité (max 5 objets). |
| **Aperçu ennemi** | Liste des ennemis (type, niveau, menaces) ; affiche le terrain et le boss. |
| **Objectif** | Rappelé : « Vaincre tous les ennemis » ou « Tuer le boss ». |
| **Renforts** | Avertissement si la carte en prévoit. |

### 9.4 Déroulement du tour

```
Phase Joueur : toutes les unités peuvent agir dans l'ordre choisi par le joueur
Phase Ennemie : chaque ennemi agit dans l'ordre (priorité IA)
Renforts : en début de phase ennemie, selon script
Fin de tour : effets (poison, soin terrain, buff)
```

- Une unité par tour : **Déplacement → Action → Attente**.
- Actions : Attaquer, Compétence, Objet, Échanger, Attendre.
- Commande **Annuler le déplacement** (avant action).
- **Initiative** (avantage de position) : le joueur agit deux fois lors du premier tour de la phase joueur (l'ennemi saute son premier tour d'attaque).

### 9.5 Déplacement et portée

- Déplacement sur grille 4 directions, coût du terrain (§3.5).
- Zones de menace des ennemis affichables (case rouge).
- **Zone de contrôle** : on ne peut pas traverser une unité ennemie, mais on peut traverser un allié.

| Type d'attaque | Portée |
|---|---|
| Mêlée | 1 |
| Lance courte | 1–2 |
| Arc | 2 (3 pour Veilleur des Falaises évolué) |
| Magie | 1–2 |
| Soin | 1 (2 avec bâton) |
| Compétence | Définie par compétence |

### 9.6 Statistiques

| Stat | Rôle |
|---|---|
| **PV** | Points de vie |
| **Fo** (Force) | Dégâts physiques |
| **Mag** (Magie) | Dégâts magiques et soins |
| **Dex** (Dextérité) | Précision, critique |
| **Vit** (Vitesse) | Esquive, double attaque |
| **Déf** | Réduit les dégâts physiques |
| **Rés** | Réduit les dégâts magiques |
| **Chc** (Chance) | Esquive, critique, résistance au critique |
| **Mob** | Cases de déplacement |

### 9.7 Formules

| Élément | Formule |
|---|---|
| **Dégâts physiques** | `Fo + Puissance arme + bonus élémentaire − Déf cible − bonus terrain` (min 0) |
| **Dégâts magiques** | `Mag + Puissance sort + bonus élémentaire − Rés cible` |
| **Précision** | `Préc arme + Dex×2 + Chc/2` |
| **Esquive** | `Vit×2 + Chc/2 + bonus terrain` |
| **Chance de toucher** | `Précision − Esquive`, bornée entre 5 % et 100 % (affichée vraie, pas de double jet) |
| **Chance de critique** | `Crit arme + Dex/2 − Chc ennemie` |
| **Dégâts critique** | ×3 |
| **Double attaque** | Si `Vit attaquant ≥ Vit cible + 4` |
| **Riposte** | Si l'ennemi est à portée de l'arme défensive, sa riposte est automatique |

**Triangle élémentaire** (pour sorts et armes magiques) :
`Marée > Cendre > Racine > Marée` : avantage = +2 dégâts, +15 précision ; désavantage = −2 dégâts, −15 précision. Les éléments **Pierre** et **Lanterne** sont neutres.
**Types d'armure** (physique) : *Légère* (−), *Lourde* (+Déf, Mob −1), *Monstre* (certaines armes **anti-armure** et **chasseur** ont ×1,5 dégâts).

### 9.8 Objets

| Catégorie | Exemples | Effet |
|---|---|---|
| Consommables | Potion (soin 10), Hyper-potion (25), Antidote, Poudre de Brume, Torche | Utilisable en combat (1 action) |
| Armes | Épée de fer (Pui 5), Lance d'estoc (Pui 6), Arc de bois (Pui 5), Tome des Cendres (Pui 6) | **Pas de durabilité** au prototype (décision n°12) |
| Objets de classe | Sceau de Maîtrise (évolution), Éclat de Lanterne | Rares |
| Accessoires | Amulette de pierre (+1 Déf), Collier d'écume (+2 Vit) | 1 emplacement |

### 9.9 Compétences

- Chaque classe possède une **compétence signature** (§10) utilisable avec un coût : **Résonance** (jauge 0–100, +20 par attaque, +10 par coup reçu ; compétence coûte 40–100).
- Les compétences remplacent les durabilités d'armes comme ressource tactique.
- Une unité peut équiper **1 compétence passive** supplémentaire acquise à des niveaux fixes (5, 15).

### 9.10 Conditions de victoire et de défaite

| Type | Victoire | Défaite |
|---|---|---|
| **Éliminer tous** | Plus aucun ennemi | Mort du **héros** ou tous les alliés KO |
| **Boss** | Boss vaincu | Idem |
| **Survie (optionnel)** | Tenir N tours | Idem |
| **Défense (optionnel)** | Protéger une cible | Cible morte |

### 9.11 Boss

- **Boss à 2 phases** (changement à 50 % PV : nouvelle compétence, effet visuel, dialogue).
- Compétences uniques (ex. Brakk : « Cri de pillage » = buff d'alliés ; Roi-Cerf : « Racines enragées » = zone d'immobilisation).
- Résistances : immunité à l'étourdissement, mais **vulnérable aux classes anti-boss**.
- **Renforts** : à tour 3 et 6 selon la carte.

### 9.12 XP et montée de niveau

| Élément | Règle |
|---|---|
| XP pour un niveau | 100 |
| XP par action | Δ = niveau ennemi − niveau unité |
| Attaque non létale | `clamp(8 + 2Δ, 1, 20)` |
| Coup fatal | `clamp(20 + 4Δ, 5, 100)` (+40 si boss) |
| Soin | 15 |
| Soutien (buff) | 10 |
| Bonus de victoire | +20 XP à tous les déployés |
| Niveau maximum | 20 (classe de base) / 30 (avancée) |
| Montée de niveau | Chaque stat a un **% de croissance** ; au moins 1 stat monte (garantie) |

### 9.13 Sort des unités vaincues (règle intermédiaire)

**Règle recommandée : « Blessure »**.

- Une unité à 0 PV est **KO** et **retirée du combat**.
- À la fin du combat victorieux : elle revient avec 1 PV mais est **Blessée** (−2 Mob, −10 % stats) jusqu'au prochain repos à l'auberge ou soin.
- **Le héros** qui meurt = défaite.
- **Option « Mode Classique »** (permadeath) : activable à la nouvelle partie (décision n°13).

### 9.14 Sauvegarde après combat

Sauvegarde automatique à l'écran de résultat (XP, butin, niveaux, état de zone).
Si la page est fermée en plein combat : **pas de reprise intra-combat** au prototype (retour au dernier point stable, ennemi toujours présent).

### 9.15 IA ennemie

| Profil | Comportement |
|---|---|
| **Agressif** | Attaque la cible qui maximise les dégâts |
| **Opportuniste** | Cible le plus faible (PV bas) |
| **Défensif** | Reste jusqu'à entrée dans la portée |
| **Soutien** | Soigne ou buffe d'abord |
| **Chasseur de héros** | Va vers le héros |
| **Boss** | Script avec priorités |

Utilise un **score** simple par action (dégâts × probabilité − risque), pas d'arbre de recherche.

---

## 10. Classes et progression

### 10.1 Règles générales

- **12 classes de départ**, **2 évolutions chacune** (24 évolutions).
- **Évolution** : niveau ≥ 10, **Sceau de Maîtrise** (objet) + **condition de branche** (une condition narrative ou de jeu qui définit laquelle des deux évolutions est disponible).
- Le niveau **ne se réinitialise pas** ; les stats reçoivent un **bonus de promotion** (+3 à +5 réparties) et les croissances changent.
- **Compétences** : une signature (base), une signature évoluée, une passive niveau 5, une passive niveau 15.
- Chaque classe a un **élément** ou une **ressource** thématique.
- Les **statistiques de base** correspondent au niveau 1.

### 10.2 Couverture des rôles

| # | Classe | Rôle |
|---|---|---|
| 1 | Gardien des Marées | Tank |
| 2 | Lame du Serment | Dégâts mêlée |
| 3 | Veilleur des Falaises | Dégâts à distance |
| 4 | Héritier des Cendres | Magie offensive |
| 5 | Porte-Lanterne | Soin |
| 6 | Héraut des Bannières | Soutien / buff |
| 7 | Alchimiste des Saisons | Contrôle / debuff |
| 8 | Danseur des Courants | Mobilité / vol |
| 9 | Invocateur de Pierres Anciennes | Invocation |
| 10 | Façonneur de Racines | Manipulation du terrain |
| 11 | Ingénieur des Ruines | Anti-armure |
| 12 | Chasseur de Serpents de Mer | Tueur de boss |

### 10.3 Statistiques de base (niveau 1)

| Classe | PV | Fo | Mag | Dex | Vit | Déf | Rés | Chc | Mob |
|---|---|---|---|---|---|---|---|---|---|
| Gardien des Marées | 24 | 6 | 0 | 4 | 3 | 8 | 3 | 3 | 4 |
| Lame du Serment | 20 | 7 | 0 | 7 | 7 | 4 | 2 | 4 | 5 |
| Veilleur des Falaises | 18 | 5 | 0 | 9 | 6 | 3 | 2 | 5 | 5 |
| Héritier des Cendres | 16 | 0 | 8 | 6 | 5 | 2 | 6 | 3 | 5 |
| Porte-Lanterne | 17 | 0 | 5 | 5 | 5 | 2 | 8 | 6 | 5 |
| Héraut des Bannières | 18 | 3 | 3 | 6 | 6 | 3 | 5 | 7 | 5 |
| Alchimiste des Saisons | 16 | 2 | 6 | 6 | 5 | 2 | 6 | 4 | 5 |
| Danseur des Courants | 17 | 4 | 0 | 8 | 10 | 2 | 3 | 6 | 7 |
| Invocateur de Pierres Anciennes | 17 | 0 | 7 | 5 | 3 | 3 | 6 | 3 | 5 |
| Façonneur de Racines | 19 | 2 | 5 | 5 | 4 | 4 | 5 | 3 | 5 |
| Ingénieur des Ruines | 19 | 6 | 0 | 8 | 4 | 5 | 2 | 4 | 5 |
| Chasseur de Serpents de Mer | 21 | 8 | 0 | 5 | 4 | 4 | 1 | 3 | 5 |

### 10.4 Croissances par niveau (%)

| Classe | PV | Fo | Mag | Dex | Vit | Déf | Rés | Chc |
|---|---|---|---|---|---|---|---|---|
| Gardien des Marées | 90 | 50 | 5 | 40 | 25 | 65 | 30 | 25 |
| Lame du Serment | 80 | 60 | 0 | 55 | 55 | 30 | 20 | 35 |
| Veilleur des Falaises | 70 | 45 | 0 | 65 | 50 | 25 | 20 | 40 |
| Héritier des Cendres | 60 | 0 | 65 | 45 | 40 | 15 | 40 | 30 |
| Porte-Lanterne | 65 | 0 | 55 | 40 | 40 | 15 | 60 | 50 |
| Héraut des Bannières | 70 | 25 | 25 | 45 | 45 | 25 | 40 | 55 |
| Alchimiste des Saisons | 60 | 10 | 60 | 50 | 40 | 15 | 45 | 35 |
| Danseur des Courants | 65 | 40 | 0 | 55 | 65 | 15 | 25 | 45 |
| Invocateur de Pierres Anciennes | 65 | 0 | 60 | 40 | 25 | 25 | 45 | 25 |
| Façonneur de Racines | 75 | 15 | 45 | 40 | 30 | 35 | 40 | 25 |
| Ingénieur des Ruines | 75 | 45 | 0 | 55 | 30 | 40 | 15 | 30 |
| Chasseur de Serpents de Mer | 85 | 60 | 0 | 40 | 30 | 35 | 10 | 25 |

### 10.5 Fiches de classe

> Format : Rôle · Description · Arme/ressource · Compétence signature · Forces · Faiblesses · Évolutions (conditions) · Critique type.

#### 1. Gardien des Marées — *Tank*
- **Description** : Sentinelle des digues, formée à tenir un quai sous la tempête. Bouclier-tour et lance d'estoc courte.
- **Arme/ressource** : Lance courte (1–2), bouclier. Élément **Marée**.
- **Signature : « Rempart de Marée »** (coût 40) : les alliés adjacents reçoivent −3 dégâts physiques jusqu'à la fin de la phase ennemie.
- **Forces** : PV et Déf élevés, bloque les ponts, attire les ennemis (aggro +).
- **Faiblesses** : lent, faible Rés, peu de dégâts.
- **Évolutions** (Niv ≥ 10 + Sceau) :
  - **Rempart de Récif** : devient immobile mais Déf +6, riposte automatique sur toutes les attaques mêlée. *Condition : défendre un village (quête *Le phare éteint* ou défaite d'une embuscade avec ce Gardien à ≥ 50 % PV).*
  - **Sentinelle des Abysses** : trident, repousse les ennemis, peut traverser l'eau profonde (1 case). *Condition : avoir atteint Port-Brume Amical et vaincu Sœur Mérrow avec ce Gardien déployé.*
- **Critique** : il plante le bouclier, une vague jaillit autour, le coup d'estoc projette l'ennemi en arrière.

#### 2. Lame du Serment — *Dégâts mêlée*
- **Description** : Épéiste liée par serment à une cause ; plus elle respecte son serment, plus elle frappe fort.
- **Arme/ressource** : Épée (1). Mécanique **Serment** : choix avant combat (« Protéger », « Vaincre le boss », « Ne pas être touchée ») ; si respecté, +10 % dégâts.
- **Signature : « Estocade jurée »** (coût 60) : attaque garantie 100 % touchée, +50 % dégâts si le Serment est actif.
- **Forces** : dégâts nets, double attaque fréquente.
- **Faiblesses** : fragile, dépend du Serment.
- **Évolutions** :
  - **Champion du Serment** : duel ; +Fo, immunité aux ripostes lors d'un duel d'un contre un. *Condition : respecter le Serment 5 combats (compteur).*
  - **Exécuteur Lige** : coups critiques élargis, bonus sur cibles < 50 % PV. *Condition : tuer 3 ennemis d'un coup (kill streak) pendant un Serment brisé.*
- **Critique** : fente éclair, double entaille en croix, flash blanc, la lame rengainée avant que l'ennemi tombe.

#### 3. Veilleur des Falaises — *Dégâts à distance*
- **Description** : Archer perché des hauteurs, expert du tir précis par vent fort.
- **Arme/ressource** : Arc long (2). Bonus de **hauteur** : +10 % précision depuis forêt/montagne/ruines.
- **Signature : « Tir de Vent »** (coût 50) : traverse un obstacle et touche une cible à 3 cases, ignore 3 Déf.
- **Forces** : portée, précision, éclaireur.
- **Faiblesses** : vulnérable au corps à corps, faible Déf.
- **Évolutions** :
  - **Faucon de Vent** : portée 2–4, tire deux fois sans bouger. *Condition : 20 kills à l'arc à distance ≥ 3.*
  - **Tireur de Brume** : flèches traversantes (touche deux cibles alignées), immunité à la brume. *Condition : explorer Z3 et tuer un ennemi caché dans le brouillard.*
- **Critique** : il bande l'arc, le temps se fige, la flèche laisse une traînée de vent verte, impact et recul.

#### 4. Héritier des Cendres — *Magie offensive*
- **Description** : Mage issu des lignées de Cendrelune, héritier d'un feu froid qui consume tout.
- **Arme/ressource** : Tome des Cendres (1–2). Élément **Cendre**.
- **Signature : « Nuée de braises »** (coût 60) : zone 3×3, dégâts moyens, applique « Brûlure » (3 dégâts sur 2 tours).
- **Forces** : dégâts de zone, bonus contre Racine.
- **Faiblesses** : très fragile, faible contre Marée.
- **Évolutions** :
  - **Maître de Braise** : sorts de zone 5×5, sans friendly fire. *Condition : brûler 15 ennemis.*
  - **Spectre de Cendre** : vol de vie, dégâts ignorant Rés partiellement. *Condition : vaincre un boss avec cette unité en dessous de 5 PV.*
- **Critique** : la cendre monte en spirale, un brasier noir explose derrière l'ennemi, écran rougeâtre.

#### 5. Porte-Lanterne — *Soin*
- **Description** : Prêtre ou prêtresse des Veilleurs, soigne par la lumière et repousse la Brume.
- **Arme/ressource** : Bâton-lanterne (1–2). Élément **Lanterne**.
- **Signature : « Halo »** (coût 40) : soigne 50 % PV d'un allié et purge un statut.
- **Forces** : soin, forte Rés, bonus contre créatures de Brume.
- **Faiblesses** : peu de dégâts, dépend de ses PV.
- **Évolutions** :
  - **Archi-Lanterne** : soin de zone (3×3), **Aura de Lumière** (+Rés alliés). *Condition : soigner 500 PV au total.*
  - **Veilleuse des Âmes** : ressuscite une unité KO en combat (1 fois par combat), dégâts sacrés. *Condition : quête *Les lanternes éteintes*.*
- **Critique** : elle lève la lanterne, un éclair doré traverse l'ennemi, un halo en cercle.

#### 6. Héraut des Bannières — *Soutien / buff*
- **Description** : Porteur de bannière et de chant ; il électrise la compagnie.
- **Arme/ressource** : Bannière-lance (1). Ressource : **Fanfare**.
- **Signature : « Appel aux armes »** (coût 40) : +3 Fo/Mag et +2 Vit à tous les alliés dans un rayon de 3 pour 2 tours.
- **Forces** : amplifie toute la compagnie, bonne Chance.
- **Faiblesses** : dégâts moyens, fragile.
- **Évolutions** :
  - **Maréchal de Cendre** : donne une **action supplémentaire** à un allié (1/combat). *Condition : Réputation Couronne ≥ Amical.*
  - **Chantre des Saisons** : buffs d'éléments et résistances saisonnières. *Condition : Réputation Racines ≥ Amical.*
- **Critique** : il plante la bannière, la couleur s'embrase, il frappe d'un coup net.

#### 7. Alchimiste des Saisons — *Contrôle / debuff*
- **Description** : Il distille des fioles liées aux quatre saisons : gel, poison, éclat, vent.
- **Arme/ressource** : Fioles (1–2). Cycle **Saisons** (chaque tour change une saison dominante : bonus de +20 % sur l'effet associé).
- **Signature : « Fiole du Gel »** (coût 50) : immobilise une cible 1 tour (Étourdi), −3 Vit.
- **Forces** : contrôle, debuffs, versatilité.
- **Faiblesses** : dégâts faibles, fragile.
- **Évolutions** :
  - **Grand Alchimiste du Gel** : zone de glace 3×3, ralentit (Mob −2). *Condition : étourdir 15 ennemis.*
  - **Distillateur de Venin** : poison cumulatif, réduit Déf/Rés. *Condition : poisonner un boss.*
- **Critique** : il lance trois fioles, elles éclatent en cascade colorée (givre, poison, éclair).

#### 8. Danseur des Courants — *Mobilité / vol*
- **Description** : Il danse sur les flots et traverse l'eau sans couler ; éclaireur et harceleur.
- **Arme/ressource** : Dagues jumelles (1). Mécanique **Fil d'eau** : traverse eau et marais sans malus.
- **Signature : « Pas de marée »** (coût 30) : après attaque, se déplace de 3 cases sans provoquer (**frappe et fuite**).
- **Forces** : mobilité maximale, esquive, double attaque.
- **Faiblesses** : très fragile, faible Déf.
- **Évolutions** :
  - **Fil-de-Vent** : survole tous les terrains (coût 1), permet de **déplacer un allié** de 3 cases. *Condition : parcourir 100 cases sur l'eau.*
  - **Tempête-Dansante** : attaque 4 fois contre une cible, dégâts faibles mais précis. *Condition : 10 doubles attaques cumulées.*
- **Critique** : il glisse, pirouette, quatre coupures lumineuses bleues en croix, retour en spirale.

#### 9. Invocateur de Pierres Anciennes — *Invocation*
- **Description** : Il éveille des menhirs et des gardiens de pierre en échange d'une part de sa vitalité.
- **Arme/ressource** : Bâton-menhir (1–2). Ressource : **Pierres** (3 par combat).
- **Signature : « Éveil de pierre »** (coût 1 Pierre) : invoque un **Golem de pierre** (PV 20, Déf 8, dure 3 tours, bloque une case).
- **Forces** : blocage, nombre d'unités, résistance.
- **Faiblesses** : lent, invocation limitée.
- **Évolutions** :
  - **Éveilleur de Colosse** : invoque un **Colosse** (PV 40, attaque lourde), 1 fois par combat. *Condition : 10 invocations.*
  - **Chuchoteur de Menhirs** : invoque 2 petits menhirs-tours qui tirent. *Condition : visiter 3 menhirs sur l'île.*
- **Critique** : le sol tremble, un poing de pierre jaillit et écrase.

#### 10. Façonneur de Racines — *Manipulation du terrain*
- **Description** : Il fait croître racines et ronces pour redessiner le champ de bataille.
- **Arme/ressource** : Bâton-branche (1–2). Élément **Racine**.
- **Signature : « Mur de ronces »** (coût 40) : place jusqu'à 3 cases de ronces (bloquent le passage, infligent 4 dégâts à qui les traverse, durent 3 tours).
- **Forces** : contrôle du terrain, protège les alliés.
- **Faiblesses** : lent, dégâts modestes, dépend de la carte.
- **Évolutions** :
  - **Sylvarque** : transforme une case en forêt (défense/esquive) et soigne les alliés dessus. *Condition : quête *Le Roi-Cerf souffre*.*
  - **Tisseur de Ronces** : ronces actives qui attaquent les ennemis adjacents à chaque tour. *Condition : infliger 100 dégâts via ronces.*
- **Critique** : une racine géante perce le sol et cingle l'ennemi.

#### 11. Ingénieur des Ruines — *Anti-armure*
- **Description** : Technicien de reliques anciennes, avec arbalète à vérin et charges de pierre-foudre.
- **Arme/ressource** : Arbalète (2). Ressource : **Charges** (4 par combat).
- **Signature : « Perce-armure »** (coût 1 Charge) : ignore 6 Déf, ×1,5 contre armure lourde et golems.
- **Forces** : démolit les tanks et golems.
- **Faiblesses** : peu de PV, charges limitées.
- **Évolutions** :
  - **Artificier Sapeur** : pose des **mines** (piège 10 dégâts de zone). *Condition : détruire 10 armures lourdes.*
  - **Maître de Siège** : baliste portable (portée 3), dégâts énormes mais ne bouge pas après tir. *Condition : visiter l'Aiguille brisée.*
- **Critique** : il vise, le carreau s'allume en arc électrique, perce l'armure, éclats métalliques.

#### 12. Chasseur de Serpents de Mer — *Tueur de boss*
- **Description** : Harponneur expérimenté, spécialiste des monstres colossaux.
- **Arme/ressource** : Harpon lourd (1–2). Ressource : **Prise** (marque une cible).
- **Signature : « Harpon enchaîné »** (coût 60) : marque une cible (« Harponnée ») : elle subit +25 % de dégâts de tous les alliés et ne peut plus s'éloigner de plus de 2 cases.
- **Forces** : dégâts contre boss (+50 %), PV élevés.
- **Faiblesses** : Rés très faible, lent à manœuvrer.
- **Évolutions** :
  - **Harponneur Abyssal** : harpon-chaîne qui attire la cible. *Condition : vaincre Sœur Mérrow.*
  - **Traqueur de Léviathans** : dégâts proportionnels aux PV max de la cible (5 % max). *Condition : vaincre 3 boss.*
- **Critique** : il lance le harpon, la chaîne claque, il tire et plaque l'ennemi au sol.

### 10.6 Récapitulatif des 24 évolutions

| Classe | Évolution A | Évolution B |
|---|---|---|
| Gardien des Marées | Rempart de Récif | Sentinelle des Abysses |
| Lame du Serment | Champion du Serment | Exécuteur Lige |
| Veilleur des Falaises | Faucon de Vent | Tireur de Brume |
| Héritier des Cendres | Maître de Braise | Spectre de Cendre |
| Porte-Lanterne | Archi-Lanterne | Veilleuse des Âmes |
| Héraut des Bannières | Maréchal de Cendre | Chantre des Saisons |
| Alchimiste des Saisons | Grand Alchimiste du Gel | Distillateur de Venin |
| Danseur des Courants | Fil-de-Vent | Tempête-Dansante |
| Invocateur de Pierres Anciennes | Éveilleur de Colosse | Chuchoteur de Menhirs |
| Façonneur de Racines | Sylvarque | Tisseur de Ronces |
| Ingénieur des Ruines | Artificier Sapeur | Maître de Siège |
| Chasseur de Serpents de Mer | Harponneur Abyssal | Traqueur de Léviathans |

> Les bonus de stats par évolution et les croissances avancées seront définis dans le fichier de données (valeurs initiales : +3 à +5 stats, croissances de la branche orientées vers son spécialité).

---

## 11. Animations de combat

### 11.1 Principes

- Écran de combat **cinématique** dans l'esprit des **critiques de Fire Emblem GBA** : attaquant et défenseur de profil, sur un décor de terrain.
- **Rapide** : attaque normale ≈ 1,3 s ; critique ≈ 2,2 s ; sort ≈ 1,6 s ; double attaque ajoute ≈ 0,9 s.
- **Option « Animations rapides »** (touche Maj) : divise la durée par 2. **Option « Désactiver »** : calcul direct avec barre de PV animée seulement.

### 11.2 Séquence type (attaque physique de mêlée)

| Phase | Durée | Action |
|---|---|---|
| 1. Entrée | 200 ms | La scène se fige, bandeau de noms, barres de PV |
| 2. Préparation | 150 ms | Attaquant se baisse (anticipation), léger recul |
| 3. Dash | 120 ms | Dash vers la cible, traînée d'afterimage |
| 4. Frappe | 80 ms | Frame de frappe (ligne d'impact), **flash blanc** 2 frames |
| 5. Impact | 100 ms | Particules d'étincelles, **hit-stop** 60 ms, **secousse** 4 px, chiffre de dégâts |
| 6. Recul | 150 ms | Défenseur recule (ou esquive : glissement + « MISS ») |
| 7. Pose finale | 200 ms | Attaquant tient la pose, barre de PV descend |
| 8. Retour | 250 ms | Retour à la position, fondu retour carte |

**Total ≈ 1,25 s.**

### 11.3 Critique

| Différence | Détail |
|---|---|
| **Écran noir** | Fond obscurci, silhouette en contre-jour (200 ms) |
| **Zoom** | Zoom ×1,5 sur l'attaquant, lignes de vitesse |
| **Frappe** | 2 à 3 coupes consécutives + gros flash blanc plein écran (3 frames) |
| **Secousse** | 10 px, 300 ms |
| **Texte** | « CRITIQUE ! » gros chiffres jaunes, particules |
| **Son** | Craquement grave + cymbale |

### 11.4 Différences par type d'attaque

| Type | Spécificités |
|---|---|
| **Physique mêlée** | Dash, traînée blanche, étincelles, recul fort. |
| **Distance (arc, arbalète)** | Pas de dash : arme levée, projectile avec traînée, impact localisé, léger recul de l'ennemi. |
| **Magie** | Cercle runique sous le lanceur (150 ms), couleur par élément (Cendre rouge/orange, Marée bleu, Racine vert, Lanterne doré), projectile ou colonne, explosion de particules. |
| **Soin** | Pas de flash agressif : lueur douce, particules montantes, chiffre vert. |
| **Compétence** | Cut-in de portrait (150 ms), nom de la compétence (bandeau), effet unique. |
| **Invocation** | Sol qui tremble, rune au sol, apparition par fumée de poussière. |
| **Boss** | Intro avec nom (cut-in 400 ms), fond coloré, effet persistant (aura). |

### 11.5 Effets visuels

- **Flash** : un rectangle blanc plein écran (alpha 0,8 → 0 en 3 frames).
- **Particules** : étincelles (8–20), poussière, feuilles, braises, bulles selon élément.
- **Traînées** : copies fantômes (3 à 4) en fondu.
- **Coupures** : sprites de « slash » (3 formes : diagonal, croix, arc).
- **Projections** : l'ennemi est brièvement décalé de 6 à 12 px.
- **Secousse d'écran** : décalage de la caméra sur deux axes, amortie.
- **Chiffres de dégâts** : police pixel, blanc (normal), jaune (critique), vert (soin), gris (esquive). Montent de 12 px en 400 ms.

### 11.6 Animations spécifiques aux boss

| Boss | Animation signature |
|---|---|
| **Brakk** | Coup de hache en tournoiement, ondes de choc au sol |
| **Roi-Cerf Corrompu** | Cornes qui s'illuminent, racines jaillissantes |
| **Sœur Mérrow** | Vague qui engloutit l'écran, voix déformée |
| **Gardien de Cendre** | Poing qui s'abat, fissures dans le sol |
| **Orvane** | Phase 1 : trident aqueux ; phase 2 : brume noire envahit l'écran |

### 11.7 Format technique

- **Choix** : **spritesheets frame-by-frame** (6 à 12 frames par animation) pour l'authenticité GBA, **plus des transformations de code** (déplacement, échelle, rotation, tremblement) pour économiser des frames.
- Chaque classe : sprite de combat 64×64 px avec 5 animations de base (idle, attaque, critique, hit, esquive) ≈ 40 frames.
- Les 24 évolutions utilisent **la même base + recoloration + accessoire** au départ (6 uniques en jalon 8).

### 11.8 Animations prioritaires (prototype)

1. Idle, déplacement sur carte (4 directions, 4 frames).
2. Attaque mêlée normale + critique (3 classes pilotes : Lame, Gardien, Chasseur).
3. Attaque à distance (Veilleur).
4. Sort offensif (Héritier) et soin (Porte-Lanterne).
5. Esquive, KO, victoire.
6. Effets : flash, impact, slash, rune, soin.
7. Boss : Brakk (premier boss).

---

## 12. Direction artistique

> **Mise à jour du 17/10/2026 (décisions n°43 et suivantes).** Cette section décrit l'art *tel qu'il est généré* depuis la refonte graphique du monde ouvert, menée comme **mise à jour du jalon M1** (exploration). Légende : ✅ réalisé et validé · 🔧 prévu, étape de la refonte indiquée · ⏳ différé (M2 et après). Références : *Eastward* (pixel art dense et chaleureux) et *Octopath Traveler* (HD-2D : lumière, profondeur, atmosphère), en restant médiéval-fantastique (chaume, colombages, pierre, bois, forges, autels, ruines, forêts anciennes ; rien de moderne).

### 12.1 Style visuel (choix et justification)

**Pixel art « chaud et dense » à éclairage HD-2D allégé**, entièrement **généré par code** (`tools/world/*` pour la carte, `src/render/*` pour le reste) : aucune image tierce, tout est recoloré sur la palette globale (`render/palette.ts`).

Les sept principes de la refonte :

| # | Principe | Règle concrète | État |
|---|---|---|---|
| 1 | **Palette et étalonnage** | Tons chauds légèrement désaturés (ocres, terre cuite, olive, bleu ardoise). Ombres **violet-bleu**, jamais grises ni noires. Lumières jaune-orangé. Un étalonnage « fin d'après-midi » **par zone**. | ✅ |
| 2 | **Densité de détail** | Décors racontés : toits en rangées d'ardoises/bardeaux avec ombre sous chaque rang, colombages, volets, enseignes en fer forgé, jardinières, tonneaux, sacs, outils, lanternes, linge, herbes folles au pied des murs, mousse et fissures. Chaque bâtiment a **sa silhouette** : chaumière, forge, auberge, temple, moulin, tour de garde. | ✅ |
| 3 | **Volume et relief** | Lumière **fixe en haut à gauche** sur tout le jeu. Faces de murs plus sombres que les toits. Ombres portées douces vers le bas à droite. Occlusion ambiante au contact sol/mur. Contours sombres **colorés** (teinte du matériau assombrie), plus sombres sur les personnages que sur les décors (1 pixel d'art = 2 px à l'écran). | ✅ |
| 4 | **Sol** | Peu de bruit, **larges plaques de 3 tons**, transitions organiques sans bords droits ni escaliers (voir 12.2b). | ✅ |
| 5 | **Végétation** | Arbres volumineux en 3-4 masses de feuillage éclairées, troncs avec racines, buissons, fleurs sauvages, tournesols et lavande près des villages, légère animation au vent (le blé est déjà animé). | ✅ |
| 6 | **Atmosphère HD-2D** | Via les filtres de Phaser 4, réglables et désactivables : flou de profondeur (tilt-shift) en haut et en bas, bloom doux, vignettage, rayons de lumière obliques et poussière, halos animés (scintillement des feux), éclairage jour/soir préparé. | ✅ |
| 7 | **Personnages** | Proportions *Eastward* (tête un peu grosse), contour sombre, **3 tons par matériau**, petite ombre au sol. | 🔧 étape 6 livrée, à valider |

- Justification : coût d'art maîtrisable (tout est du code), rendu « beau » par la lumière et l'étalonnage plutôt que par le nombre de pixels, parfaitement adapté à Phaser/WebGL.
- Rejetés : 3D/HD-2D complet (trop lourd), vectoriel (moins d'identité), packs d'images libres (cohérence difficile, voir décision n°22).

### 12.2 Résolution et affichage

| Paramètre | Valeur |
|---|---|
| **Résolution** | **Canevas fixe 960×540** affiché 1:1 et centré sur tous les écrans ; pixel art zoomé ×2 (480×270 visibles) ; interface native (décision n°40, inchangée par la refonte) |
| **Tuile** | 16×16 px (grille, collisions et disposition de la carte inchangées) |
| **Affichage** | Pas d'agrandissement ; `image-rendering: pixelated` |
| **Plein écran** | Option |
| **Sprites carte** | Héros **16×28 px** (pied et boîte de collision 10×8 inchangés) ; PNJ : même gabarit, réutilisant le modèle du héros (M2) ; 32×32 (gros ennemis), 48×48 (boss) |
| **Sprites combat** | 64×64 px (personnages), jusqu'à 96×96 (boss) |
| **Portraits dialogue** | 64×64 px, 4 expressions (neutre, content, fâché, triste) |
| **Mobile** | Non ciblé au prototype (décision n°21) |

### 12.2b Sol organique (réalisé — décision n°43)

Le sol n'est plus peint case par case : le générateur **floute la présence de chaque terrain et de l'eau à l'échelle de l'île**, puis chaque pixel prend le terrain le plus présent (plus un bruit très doux, continu d'une tuile à l'autre).

| Élément | Règle |
|---|---|
| **Contours** | Rivière, côte, étangs, lisières, clairières, cours en terre et places pavées suivent des courbes ; plus de marche d'une case. Rayon de flou de 0,4 à 0,95 case selon le terrain. Les chemins d'une case de large gardent un léger avantage pour rester visibles. |
| **Plaques de ton** | 3 tons par terrain, en larges plaques (même flou), jamais de grain pixel par pixel. |
| **Herbe** | Base presque unie, touffes d'herbe groupées en massifs, tapis de fleurs, brins d'herbe folle qui débordent sur les chemins. |
| **Chemins de terre** | Deux ornières dont le sens suit le tracé de la route (rien dans les virages), cailloux rares. |
| **Pavés** | Pierres irrégulières (Voronoï sur trame de 32 px), claires et usées au centre des places, joints moussus au bord, angles arrondis. |
| **Eau** | Animée, bleu ardoise ; reflets chauds ; berges courbes avec talus sombre, face de terre quand l'eau est plus basse, écume ; eau profonde plus sombre (ombre profonde violette). Les étangs sont de l'eau animée. |
| **Relief entre terrains** | Un sol plus haut (herbe) ombre son voisin plus bas (chemin) vers le bas à droite ; son rebord s'assombrit. |
| **Forêt, marais, montagne** | Feuilles mortes et champignons en forêt, flaques en marais, dalles et fissures en montagne : détails rares et groupés. |
| **Bords volontairement nets** | Champs de blé et quais (ouvrages humains). |

Limite assumée : les **collisions restent case par case** ; le rivage dessiné peut s'écarter du bord des cases d'au plus ~½ case dans les angles.

### 12.3 Palettes et étalonnage

#### Palette globale (enrichie, rien de retiré)

| Famille | Couleurs |
|---|---|
| **Terres chaudes** (nouveau) | ocre `#C89B55`, ocre clair `#E2C07F`, terre cuite `#B8653F`, brique `#8F4A35`, terre sèche `#A98A63`, terre sombre `#6F5844` |
| **Verts** (nouveau) | olive `#7C8A46`, olive clair `#A9B061`, olive sombre `#4B5634`, mousse `#5F7A45` |
| **Bleus ardoise** (nouveau) | ardoise `#56677A`, ardoise sombre `#3A4658` |
| **Ombres** (nouveau) | ombre violette `#3D3658`, ombre profonde `#26233F` |
| **Lumières** (nouveau) | lumière chaude `#F3C97A`, lumière dorée `#FFDF9A` |
| **Biomes d'origine** | vert doré `#9CC55A`, jaune blé `#E3C36B`, ciel `#8FC7E8`, vert profond `#2F5D3A`, ambre `#D69B3C`, bleu-gris `#5D7B96`, sable `#D6C49A`, écume `#E8F1F5`, gris-roux `#7A6C66`, orange forge `#E07B39`, pierre `#C9BFA9`, rouge cendre `#A64B3C`, bleu nuit `#2C3550`, nuit `#12121F`, violet brume `#4B2E6F`, cyan éclat `#7FE0E8` |

Dans le dessin, **les rampes de couleur** (`tools/world/art.ts`) décalent la teinte : ombres vers le violet-bleu, lumières vers le jaune-orangé. Le noir pur n'est jamais utilisé dans le décor.

#### Étalonnage « fin d'après-midi » par zone (réalisé)

Chaque zone porte un champ `grade` dans `data/zones.json`, converti en matrice de couleur (`render/grade.ts`, calcul pur et testé) et appliqué par un filtre `ColorMatrix` sur la caméra du monde, avec **fondu de 1,4 s** en changeant de zone.

| Zone | Ombres | Lumières | Saturation | Contraste | Ambiance |
|---|---|---|---|---|---|
| **Z1 Plaines d'Aubemer** | violet `#3D3658` (12 %) | or pâle `#FFD9A0` (12 %) | −6 % | +6 % | Chaleureux, ouvert, fin d'après-midi |
| **Z2 Forêt-Racine** | bleu-violet `#2F3652` (14 %) | `#FFE2A8` (9 %) | −10 % | +8 % | Dense, voile vert, lucioles |
| **Z3 Côte des Brumes** | bleu `#3A4766` (16 %) | `#F4DCBC` (7 %) | −18 % | +3 % | Brumeux, venteux |
| **Z4 Monts de Cendre** | prune `#3D3050` (14 %) | orangé `#FFC890` (14 %) | −12 % | +8 % | Austère, braise |
| **Z5 Citadelle Engloutie** | indigo `#2A2A52` (20 %) | bleu froid `#C8D0E8` (5 %) | −25 % | +10 % | Froid, corrompu |

La teinte plein écran `ambient` de chaque zone est conservée, en plus léger (alpha 0 à 0,14). Garde-fou testé : l'étalonnage ne fait jamais dériver le gris moyen de plus de 40/255.

#### Biomes (couleurs repères)

| Biome | Couleurs principales | Ambiance |
|---|---|---|
| **Plaines** | olive et ocre, jaune blé `#E3C36B`, ciel `#8FC7E8` | Chaleureux, ouvert |
| **Forêts** | vert profond `#2F5D3A`, ambre `#D69B3C`, mousse | Dense, lucioles |
| **Côtes** | ardoise/bleu-gris `#5D7B96`, sable `#D6C49A`, écume `#E8F1F5` | Brumeux, venteux |
| **Montagnes** | gris-roux `#7A6C66`, orange forge `#E07B39`, neige `#EDEFF2` | Austère, braise |
| **Marais** | olive `#5B6B3A`, violet brume `#6B5A7A`, vase `#3A3A2F` | Inquiétant |
| **Ville (Valcendre)** | pierre `#C9BFA9`, rouge cendre `#A64B3C`, bleu nuit `#2C3550` | Majestueux, déchu |
| **Brume Noire** | noir bleuté `#12121F`, violet `#4B2E6F`, éclats cyan `#7FE0E8` | Corruption |

Contrainte : palette globale limitée à quelques dizaines de couleurs de base ; les variations viennent des rampes et de l'étalonnage, pas de nouvelles teintes.

### 12.4 Personnages, ennemis, bâtiments, interface

- **Personnages** 🔧 (étape 6, livrée) : sprite **16×28 px**, tête de 11 rangées sur 26 (proportions *Eastward*), contour sombre teinté (2 px à l'écran), 3 tons par matériau calculés, petite ombre au sol. **Gabarit commun** (`render/characterSprite.ts`) : une apparence = couleurs par matière + tête (capuche, courts, longs, chignon) + tenue (cape, tunique, robe) + accessoire (épée, besace, lanterne) ; le héros est l'une d'elles, les PNJ du M2 déclareront les leurs sans nouveau dessin.
- **Ennemis** ⏳ : formes distinctes par famille (Écumeurs : bandanas rouges ; Brume : silhouettes fluides violacées ; Golems : blocs de pierre).
- **Bâtiments** ✅ (étape 2) : six silhouettes de base — **chaumière, forge, auberge, temple, moulin, tour de garde** — plus grandes qu'avant si besoin (mêmes positions de village, mêmes routes, collision au pied). Toits en rangées avec ombre sous chaque rang, façades à colombages plus sombres que les toits, volets, enseignes en fer forgé, mousse et fissures ; toit coloré par village (chaume jaune, bois vert, ardoise bleue, pierre rouge).
- **Petits décors** ✅ (étape 4) : jardinières, tonneaux, sacs, outils, lampadaires, cordes à linge, caisses, bois coupé, charrette, bancs, étals, puits couvert, tableau d'affichage, poteries et filets au port, herbes folles au pied des murs ; rochers, falaises, remparts, ruines, épaves et camp refaits dans le même style. Chaque village a son jeu d'accessoires (ferme, bûcherons, pêche, montagne, ville). Feux de camp, bannières et linge animés.
- **Végétation** ✅ (étape 3) : arbres en 3-4 masses de feuillage éclairées (jusqu'à 3×3 cases), racines, buissons, fleurs sauvages, tournesols et lavande près des villages, vent léger.
- **Interface** : cadres en parchemin et métal patiné, bordures ornées, police pixel (Jersey 10 pour le bandeau de zone), couleurs de statut (vert/jaune/rouge). Texte et interface restent natifs 960×540.

### 12.5 Effets et atmosphère HD-2D

| Effet | Technique (Phaser 4) | Réglage | État |
|---|---|---|---|
| **Étalonnage par zone** | `ColorMatrix` interne sur la caméra, fondu 1,4 s | — | ✅ |
| **Vignettage** | Filtre `Vignette` externe | léger | ✅ (déjà en place) |
| **Flou de profondeur (tilt-shift)** | `ParallelFilters` : flou + masque en bandes haut/bas sur l'image nette (moitié centrale nette) ; le filtre `TiltShift` intégré est trop coûteux | Qualité Haute | 🔧 livré |
| **Bloom doux** | `ParallelFilters` + seuil (0,86) + flou, ajouté (pas de filtre Bloom dédié en Phaser 4) : fenêtres, feux, lanternes, cristaux ; intensité par zone, plus forte le soir | Qualité Haute | 🔧 livré |
| **Rayons de lumière et poussière** | 4 bandes obliques additives teintées par la zone, poussière qui flotte dans les rayons ; intensité par zone (forêt forte, côte faible) | Qualité Haute | 🔧 livré |
| **Halos ponctuels** | Sprites additifs sur lanternes, feux, runes et fenêtres (le soir), scintillement propre à chaque type ; positions écrites par le générateur | Qualité Haute | 🔧 livré |
| **Jour / soir** | Étalonnage du soir dérivé de celui du jour (`eveningGrade`), interpolé, lumière d'ensemble −45 % (`eveningDarkness`) ; fenêtres allumées, halos et bloom renforcés (préparé, non activé ; F6 en debug) | — | 🔧 livré |
| **Ombres douces et ombres portées** | Dessinées dans les sprites (bas-droite) | — | ✅ décors · 🔧 héros (étape 6) |
| **Particules** | Poussière, feuilles, braises, bulles, lucioles ; fumée de cheminée animée | — | ✅ (cheminées) · ⏳ reste |
| **Eau** | Vagues animées (TileSprite) | — | ✅ |
| **Blé** | Épis dorés animés, masse dense, bande de lumière | — | ✅ |

**Réglage « Qualité »** (menu Pause en attendant les options de M10, enregistré dans `vaelmor:settings`) : *Haute* (tous les effets), *Basse* (étalonnage et vignettage seulement), *Désactivée* (aucun filtre, sauf la teinte `ambient`). Haute coûte ~12 passes plein écran de plus que Basse : à vérifier sur GPU réel avec F3 (60 FPS visé, voir PROGRESS.md n°47).

### 12.6 Liste des assets nécessaires

| Catégorie | Contenu | Quantité | État |
|---|---|---|---|
| **Tileset du monde** | Une seule texture générée par code (≈16 000 tuiles dont ~860 animées, atlas 2048×2016 px, 128 colonnes) : sols, berges, ponts, décors | 1 atlas | ✅ |
| **Bâtiments** | 6 silhouettes × variantes de toit par village | ~6 + variantes | ✅ |
| **Végétation** | Arbres (3-4 variantes), buissons, fleurs, tournesols, lavande | ~15 | ✅ |
| **Petits décors** | Tonneaux, sacs, jardinières, lanternes, linge, outils, enseignes, rochers, falaises, remparts, ruines | ~40 | ✅ |
| **Personnages carte** | Héros 16×28 puis 12 classes × 4 directions × 4 frames (24 évolutions = recolorations) | 12 + 24 variantes | 🔧 héros et gabarit livrés · ⏳ reste |
| **Personnages combat** | 12 classes × 5 animations | 12 feuilles | ⏳ |
| **Portraits** | 30 PNJ + 12 recrues | ~40 | ⏳ |
| **Ennemis** | 12 types monde + 12 sprites combat + 5 boss | ~30 | ⏳ |
| **Icônes** | Armes, objets, compétences, statuts | ~120 | ⏳ |
| **UI** | Cadres, boutons, barres, curseurs, jauges de réputation | ~60 éléments | partiel |
| **Effets** | Slashs, flashs, runes, projectiles, soins, impacts | ~40 | ⏳ |
| **Musique** | Titre, 5 zones, ville, combat normal, combat boss, victoire, défaite | ~13 pistes | partiel (Suno) |
| **Sons** | Pas, UI, coups, magie, soins, critique, ambiance | ~60 | ⏳ |

### 12.7 Placeholders de qualité (au départ)

L'art du monde n'est plus un « placeholder » : il est généré par code selon les règles ci-dessus et se remplace en changeant le générateur, sans toucher au moteur.

| Élément | Approche |
|---|---|
| Tilesets, bâtiments, végétation | **Générés par code** (`tools/world/*`), régénérés par `npm run generate-world` ; le test d'identité garantit que la carte livrée correspond au générateur |
| Personnages | Gabarit 16×28 généré par code (`CharacterLook`), décliné en PNJ par couleurs, tête, tenue et accessoire (M2) |
| Portraits | Silhouettes colorées avec expression en texte |
| Ennemis | Formes simplifiées (blobs et silhouettes) |
| UI | Cadres générés par code (9-slice) |
| Effets | Particules et filtres générés par code |
| Musique/sons | Pistes générées (Suno, tracées dans `CREDITS.md`) + sons simples |
| Animations de combat | Transformations de code (dash, squash/stretch) sur sprites fixes |

**Règle** : jamais d'asset sous licence incertaine ; toutes les sources sont listées dans `CREDITS.md`.

### 12.8 Méthode de la refonte (rappel)

Ordre imposé, une validation de l'auteur après chaque étape (capture 960×540 + détail ×3) : **1)** palette, étalonnage, sol ✅ validé le 17/10/2026 · **2)** bâtiments ✅ validé le 17/10/2026 · **3)** végétation ✅ validé le 17/10/2026 · **4)** petits décors ✅ validé le 17/10/2026 · **5)** post-effets HD-2D ✅ validé le 17/10/2026 · **6)** héros 🔧 livré. Chaque étape : `generate-world`, tests, build, commit sur `main` avec `play/`, décision numérotée dans PROGRESS.md (n°48 à ce jour).

---

## 13. UI/UX

### 13.1 HUD d'exploration

- Haut gauche : portrait du héros, PV, niveau.
- Haut droit : or, nom de zone et niveau recommandé.
- Bas : message contextuel (« [E] Parler »), jauge de **réputation** du lieu à l'entrée (3 s).
- Mini-carte discrète (optionnelle, touche N pour grande carte).

### 13.2 Menus

| Menu | Contenu |
|---|---|
| **Principal (Tab)** | Équipe, Inventaire, Quêtes, Carte, Réputation, Sauvegarde, Options |
| **Fiche personnage** | Portrait, classe, niveau, XP, stats, croissances, équipement, compétences, évolution possible |
| **Inventaire simplifié** | Onglets Armes / Consommables / Clés ; capacité 40 ; tri auto |
| **Boutique** | Achat/vente, prix modifiés par la réputation, aperçu des stats |
| **Réputation** | Liste des lieux et factions, jauges, effets actuels |

### 13.3 Dialogues

- Boîte de dialogue en bas, portrait à gauche, nom du PNJ, effet de machine à écrire (30 car/s, accélérable).
- Choix à 2–3 options, navigables au clavier, avec icônes de conséquence (réputation +/−).
- Journal de dialogues consultable.

### 13.4 Écran de préparation

Voir §9.3. Disposition : carte au centre, roster à gauche, détails de l'unité à droite, boutons « Combattre », « Retour ».

### 13.5 Interface de combat

- **Curseur** sur grille, **info du terrain** (bas gauche), **info de l'unité survolée** (bas droite).
- Zones colorées : bleu (déplacement), rouge (attaque), vert (soin).
- **Prévision de combat** : dégâts, précision, critique, doubles, PV prévus (pour les deux unités).
- Menu d'action contextuel : Attaquer / Compétence / Objet / Attendre.
- **Fin de tour** : bouton, ou automatique quand toutes les unités ont agi.
- Bandeau « PHASE JOUEUR / PHASE ENNEMIE ».

### 13.6 Notifications

Messages brefs en haut : « +15 Réputation (Haut-Gué) », « Niveau 4 ! », « Quête mise à jour ». File d'attente, 2,5 s chacun.

### 13.7 Victoire et défaite

| Écran | Contenu |
|---|---|
| **Victoire** | Bannière, résumé (XP gagnée, niveaux, butin, réputation), bouton Continuer |
| **Niveau gagné** | Affichage des stats avant/après avec flèches vertes |
| **Défaite** | « Compagnie dispersée » : retour au dernier village visité, **perte de 10 % d'or**, ennemis conservés ; option Charger la sauvegarde |

### 13.8 Accessibilité

- Remappage des touches (extension), taille de texte ×1/×1,25, options daltoniens (formes + couleurs), réduction des flashs et secousses.

---

## 14. Sauvegarde localStorage

### 14.1 Données sauvegardées

| Groupe | Contenu |
|---|---|
| **Méta** | Version, date, durée de jeu, nom du héros |
| **Joueur** | Position (x, y), zone courante, direction |
| **Équipe** | Pour chaque unité : id, classe, niveau, XP, stats, croissances individuelles, compétences, équipement, état (Blessé) |
| **Inventaire** | Objets avec quantités, or |
| **Réputation** | Valeurs par lieu et faction |
| **Quêtes** | État par quête (non commencée, en cours, terminée), étapes |
| **Monde** | Ennemis vaincus (ids + horodatage de réapparition), coffres ouverts, boss vaincus, zones découvertes, autels débloqués |
| **PNJ** | Drapeaux de dialogue, recrues recrutées, états de boutique |
| **Options** | Volume, vitesse d'animation, touches |

### 14.2 Principes

| Élément | Règle |
|---|---|
| **Clés** | `vaelmor:save:slot1`, `…slot2`, `…slot3`, `vaelmor:save:auto`, `vaelmor:settings` |
| **Format** | JSON compressé (optionnel, LZ-string) avec **somme de contrôle** |
| **Versionnage** | Champ `saveVersion` ; **migrations** successives (v1→v2→…) |
| **Auto-sauvegarde** | Après chaque combat, entrée/sortie de village, quête terminée, repos |
| **Manuelle** | Depuis le menu et aux autels (3 emplacements) |
| **Erreurs** | Si JSON invalide ou checksum faux : message clair, tentative de restauration de la **sauvegarde précédente** (copie de secours `:backup`) ; sinon proposition de supprimer |
| **Quota** | Détection d'erreur `QuotaExceededError`, message utilisateur ; taille estimée < 200 Ko |
| **Nouvelle partie** | Confirmation à deux étapes (« Cela écrasera l'emplacement X ») |
| **Export/Import** | **Oui** : export en fichier `.json` (ou texte base64), import avec validation de schéma |
| **Sécurité** | Aucun contenu exécutable : données uniquement, validées par schéma |

---

## 15. Stack technique

### 15.1 Comparatif

| Critère | **Phaser 3 + TypeScript** | **PixiJS + moteur maison** | **Godot 4 (export web)** | **Excalibur.js (TS)** | **Kaplay / LittleJS** |
|---|---|---|---|---|---|
| **Avantages** | Moteur 2D complet (scènes, caméras, tilemaps Tiled, input, audio, tweens, particules). Énorme communauté. | Rendu WebGL très rapide, contrôle total. | Éditeur visuel, TileMap, animations, scènes très productives. | Léger, typé, bonne API. | Très rapide à prototyper. |
| **Inconvénients** | Un peu monolithique ; certaines API vieillissantes. | Tout à construire (scènes, input, audio, tilemap, UI). | Export web lourd (~30–40 Mo), contraintes d'hébergement/threads, intégration localStorage via JS bridge, pixel art parfois délicat. | Écosystème et tilemaps moins mûrs. | Moins adapté à un projet structuré de grande taille. |
| **RPG tactique web** | ★★★★★ | ★★★ | ★★★★ | ★★★ | ★★★ |
| **Animations 2D** | ★★★★ (sprites, tweens, particules) | ★★★★ (à assembler) | ★★★★★ (AnimationPlayer) | ★★★ | ★★★ |
| **Performance navigateur** | ★★★★ | ★★★★★ | ★★★ (poids, démarrage) | ★★★★ | ★★★★ |
| **Extensibilité** | ★★★★ (séparation logique/rendu possible) | ★★★★★ (si bien conçu) | ★★★★ (mais format de données propre à Godot) | ★★★ | ★★★ |
| **localStorage** | Natif (JS) | Natif | Via JavaScriptBridge, plus lourd | Natif | Natif |
| **Facilité de développement** | ★★★★★ | ★★ | ★★★★ (si familier de Godot) | ★★★ | ★★★★ |

### 15.2 Recommandation finale

**Phaser 3 + TypeScript + Vite**, avec :

- **Tiled** pour les cartes (export JSON).
- **Logique de jeu pure en TypeScript** (sans dépendance Phaser) pour le combat, la réputation, la progression et la sauvegarde : testable avec **Vitest**.
- **Zod** (ou équivalent) pour valider les données JSON.
- **Aseprite** (ou LibreSprite) pour le pixel art.
- Hébergement statique (GitHub Pages / Netlify / itch.io).

**Justification** :

1. **Performance** : WebGL, atlas de textures, tilemaps optimisés suffisent largement pour un monde 160×120 tuiles.
2. **RPG tactique 2D** : grille, curseur, tweens, caméras multiples (monde/UI) simples.
3. **Animations** : spritesheets + tweens + émetteurs de particules natifs.
4. **Extensibilité** : données JSON externes, logique découplée du rendu.
5. **Sauvegarde** : localStorage natif, pas de pont.
6. **Rapidité de développement** : documentation et exemples abondants ; l'itération par rechargement à chaud avec Vite.

**Plan B** : si le projet doit à terme devenir une application mobile/console, la logique pure en TS reste réutilisable, et un portage vers Godot ou Pixi reste faisable (c'est l'intérêt de la séparation).

> Note : version retenue au démarrage du développement : **Phaser 4.2.1** (décision n°31).

---

## 16. Architecture logicielle

### 16.1 Principe : trois couches

```
┌────────────────────────────────────────────┐
│ RENDU (Phaser) : scènes, sprites, UI, FX   │
├────────────────────────────────────────────┤
│ LOGIQUE (TS pur) : règles, IA, formules    │
├────────────────────────────────────────────┤
│ DONNÉES (JSON) : classes, ennemis, cartes  │
└────────────────────────────────────────────┘
```

Règle : **la couche logique ne connaît ni Phaser ni le DOM**. Le rendu lit l'état et émet des commandes.

### 16.2 Modules principaux

| Module | Responsabilité |
|---|---|
| **Core / Boucle** | Démarrage, horloge, bus d'événements |
| **Scènes** | Boot, Titre, Monde, Village-intérieur, Préparation, Combat, Cinématique de combat, Menus |
| **World (monde ouvert)** | Chargement de la carte Tiled, couches, zones, triggers |
| **Camera & Input** | Caméra, mappage des touches, gestion focus |
| **Collisions** | Grille de collision, résolution déplacements |
| **NPC & Dialogue** | Interactions, scripts de dialogue (JSON), choix |
| **Reputation** | Valeurs, effets, événements |
| **Enemies (monde)** | Spawn, états, détection, patrouilles, réapparition |
| **EncounterBuilder** | Construit un combat (carte, ennemis, objectifs) depuis le contexte |
| **Tactics** | Grille, déplacement, portées, tours, actions |
| **Combat résolution** | Formules, ripostes, double attaque, états |
| **Enemy AI** | Profils, évaluation d'actions |
| **Units & Stats** | Unité, classes, croissances, équipement |
| **Items & Inventory** | Objets, effets, boutiques |
| **Progression** | XP, niveaux, évolution, compétences |
| **Quests** | État, objectifs, récompenses |
| **Save** | Sérialisation, versionnage, migrations, import/export |
| **UI** | Composants (fenêtres, listes, barres), thèmes |
| **VFX** | Particules, flashs, secousses, cut-ins |
| **Audio** | Musique par zone, effets, volumes |
| **Debug** | Console développeur, outils de test (téléport, niveau) |

### 16.3 Format des données

**JSON validé par schéma** (Zod), un fichier par type de contenu. Exemple de champs (descriptif, pas d'implémentation) :

| Fichier | Contenu clé |
|---|---|
| `classes.json` | id, nom, rôle, stats de base, croissances, compétences, évolutions, conditions |
| `skills.json` | id, nom, coût, portée, zone, effets, animation |
| `items.json` | id, type, effets, prix, icône |
| `enemies.json` | id, nom, classe, niveau min/max, IA, butin, sprite |
| `encounters.json` | id, zone, ennemis, carte/gabarit, objectif, renforts |
| `zones.json` | id, niveaux, musique, tables de spawn, verrous |
| `locations.json` | villages : id, nom, PNJ, boutiques, réputation initiale |
| `npcs.json` | id, sprite, dialogues (par réputation), quêtes |
| `dialogues/*.json` | nœuds, conditions, effets (rép, quête, objets) |
| `quests.json` | étapes, conditions, récompenses |
| `reputation.json` | échelle, seuils, effets |
| `maps/*.json` | cartes Tiled (monde, villages, combat) |
| `balance.json` | constantes globales (XP, multiplicateurs…) |

**Pourquoi JSON** : natif au navigateur, compatible Tiled, validable, facile à éditer. **YAML** est possible pour les dialogues longs (décision n°14).

### 16.4 Structure de dossiers prévisionnelle

```
vaelmor/
├─ public/
│  └─ assets/            (images, audio, cartes Tiled)
├─ src/
│  ├─ core/              (boucle, événements, config)
│  ├─ data/              (JSON de contenu + schémas)
│  │   ├─ classes/ enemies/ items/ zones/ locations/ dialogues/ quests/
│  ├─ logic/             (TS pur, sans Phaser)
│  │   ├─ tactics/ combat/ ai/ units/ progression/
│  │   ├─ reputation/ quests/ inventory/ save/
│  ├─ world/             (exploration : ennemis monde, PNJ, triggers)
│  ├─ scenes/            (Phaser : Boot, World, Prep, Battle, UI…)
│  ├─ render/            (sprites, VFX, animations, caméra)
│  ├─ ui/                (composants et écrans)
│  ├─ audio/
│  └─ debug/
├─ tests/                (tests unitaires logique)
├─ tools/                (scripts de validation de données, export)
├─ docs/                 (GDD, guides d'ajout de contenu)
└─ CREDITS.md
```

### 16.5 Ajouter du contenu sans réécrire le moteur

| Contenu | Procédure |
|---|---|
| **Nouveau village** | Dessiner la zone dans Tiled → ajouter une entrée dans `locations.json` (PNJ, boutiques, réputation) → ajouter les dialogues. |
| **Nouvelle classe** | Ajouter une entrée dans `classes.json` + sprites + compétences dans `skills.json`. |
| **Nouvel ennemi** | Entrée dans `enemies.json`, placement dans la zone (`zones.json`). |
| **Nouvelle carte tactique** | Fichier Tiled dans `maps/battle/` + entrée dans `encounters.json`. |
| **Nouvelle zone** | Entrée dans `zones.json` (niveaux, spawns, musique). |
| **Nouvel effet de compétence** | Ajouter un **type d'effet** dans un registre (extension ponctuelle de code), réutilisable ensuite par données. |

Un script de validation (`validate-data`) signale toute référence cassée (ex. ennemi inexistant).

---

## 17. Plan de développement

> Durées indicatives pour un développeur travaillant à temps partiel/moyen ; à ajuster.

| # | Jalon | Objectif | Fonctionnalités livrées | Risques | Critères de validation | Priorité |
|---|---|---|---|---|---|---|
| **M0** | GDD validé | Figer le périmètre | Ce document corrigé, décisions tranchées | Dérive de périmètre | Liste de décisions signée | ★★★★★ |
| **M1** | Exploration | Île jouable | Carte Tiled, héros animé, caméra, collisions, transitions de zone, debug | Performance carte, collisions « collantes » | 60 FPS stable, aucun blocage sur 10 min de marche | ★★★★★ |
| **M2** | Villages, PNJ, réputation | Monde vivant | 2 villages, dialogues, boutique, jauge de réputation, effets sur prix | Système de dialogues trop rigide | Parler à 5 PNJ, prix changent selon réputation | ★★★★ |
| **M3** | Ennemis du monde | Menace visible | États IA monde, détection, indicateur de difficulté, déclenchement | Détection « injuste » | Les 4 comportements fonctionnent ; combat déclenché | ★★★★ |
| **M4** | Combat de base | Cœur tactique | Grille, déplacement, attaque, riposte, tours, victoire/défaite, 3 classes | Complexité de l'état de combat | Un combat complet jouable du début à la fin | ★★★★★ |
| **M5** | Préparation, objets, boss | Profondeur | Écran de préparation, objets, compétences, boss à 2 phases, renforts | Équilibrage | Boss Brakk battable, ni trivial ni injuste | ★★★★ |
| **M6** | XP, niveaux, classes | Progression | 12 classes, XP, montée de niveau, évolution (6 d'abord, puis 24) | Volume de données | Toutes les classes jouables ; évolution fonctionne | ★★★★★ |
| **M7** | Contenu monde | Île complète | 4 villages + ville, 5 zones, quêtes, recrues, boss de zone | Charge de contenu | Parcours complet de Z1 à Z5 sans bug bloquant | ★★★★ |
| **M8** | Animations de combat | Spectacle | Écran de combat cinématique, critiques, effets, boss | Pipeline d'art | Toutes classes avec attaque + critique, vitesse acceptable | ★★★★ |
| **M9** | Sauvegarde | Fiabilité | Auto + manuelle, migrations, export/import, erreurs gérées | Corruption, quota | Test : recharger après chaque type d'événement | ★★★★★ |
| **M10** | Polish | Finitions | UI, sons, équilibrage, performance, accessibilité | Retouches infinies | Session de 60 min sans bug majeur, 3 testeurs externes | ★★★ |

**Ordre conseillé** : M0 → M1 → M4 → M2 → M3 → M5 → M6 → M9 → M7 → M8 → M10.
Le combat (M4) est prototypé tôt **avant** le contenu du monde, car c'est le plus grand risque de fun.

**Jalon « vertical slice »** : après M1+M3+M4+M9, on dispose d'une boucle complète « marcher → combattre → sauvegarder ». À valider avant d'investir dans le contenu.

---

## 18. Risques et solutions

| Catégorie | Risque | Probabilité | Solution |
|---|---|---|---|
| **Technique** | État de combat complexe et bugs | Haute | Logique pure testée unitairement ; combats rejouables par script (seed) |
| **Technique** | Données incohérentes (références cassées) | Moyenne | Validation de schéma à la compilation + script `validate-data` |
| **Technique** | Sauvegarde corrompue ou migration cassée | Moyenne | Checksum, backup auto, tests de migration |
| **Technique** | Dépendance trop forte à Phaser | Faible | Couche logique indépendante |
| **Gameplay** | Combats longs ou répétitifs | Haute | Accélération, cartes petites, objectifs variés, option « résolution rapide » pour ennemis très faibles |
| **Gameplay** | Réputation sans impact perçu | Moyenne | Effets visibles (prix, dialogues, quêtes), notifications claires |
| **Gameplay** | Monde ouvert vide | Moyenne | Densité de POI (une chose tous les 15–20 s de marche), secrets, coffres |
| **Gameplay** | Classes déséquilibrées | Haute | `balance.json` central, simulateur de combat, tests automatisés |
| **Artistique** | Incohérence visuelle des placeholders | Haute | Palette globale unique, recoloration forcée, guide de style |
| **Artistique** | Coût des animations | Haute | Base commune + code (transformations) + recoloration pour les évolutions |
| **Performance** | Lourdeur de grande carte | Moyenne | Culling par caméra, atlas, couches statiques, limite d'ennemis actifs (≈ 25) |
| **Performance** | Particules excessives | Faible | Limite d'émetteurs, option « Effets réduits » |
| **Équilibrage** | Progression trop rapide/lente | Haute | Table XP/niveau externe, courbes testées (simulation), ajustements via `balance.json` |
| **Périmètre** | Dérive de contenu | Haute | Règle : tout ajout non listé au GDD passe par une décision |
| **Légal** | Ressemblance excessive avec Fire Emblem | Faible | Univers, classes, noms, règles originales (triangle élémentaire propre, Serment, Résonance) |

---

## 19. Décisions validées

> **Validées le 16/10/2026** : les 28 décisions ci-dessous sont acceptées telles quelles. Les décisions prises ensuite sont ajoutées en fin de liste avec leur date.

1. **Stack** : Phaser 3 + TypeScript + Vite + Tiled (version précise à vérifier au démarrage).
2. **Nom de l'île et du jeu** : Vaelmor, « Les Marées de Cendre ».
3. **Perspective** : top-down 2D pixel art, pas d'isométrique.
4. **Résolution** : canevas fixe 960×540 affiché 1:1 (décision n°40), tuile 16 px, pixel art ×2.
5. **Taille de l'île** : ~160×120 tuiles (paramétrable), 5 zones.
6. **Nombre de lieux** : 4 villages + 1 grande ville (Haut-Gué, Ronceval, Port-Brume, Pierre-Haute, Valcendre).
7. **Fast travel** : oui, entre autels des Lanternes découverts.
8. **Personnage jouable** : un héros choisi parmi les 12 classes, plus 12 recrues (une par classe, plus secrète).
9. **Taille de l'équipe en combat** : 4 à 8 unités selon la carte, roster jusqu'à 12.
10. **Réputation** : par lieu (5) + par faction (4), échelle −100 à +100, avec décroissance légère vers 0 au-delà de ±50.
11. **Triangle de combat** : triangle élémentaire Marée > Cendre > Racine (au lieu d'un triangle d'armes).
12. **Durabilité des armes** : aucune ; remplacée par la jauge de **Résonance** et des ressources de classe.
13. **Mort des unités** : règle « Blessure » (pas de permadeath) ; mode Classique optionnel à la nouvelle partie.
14. **Format des données** : JSON (dialogues longs éventuellement en YAML compilé).
15. **Évolution** : niveau ≥ 10, Sceau de Maîtrise + condition de branche ; pas de réinitialisation de niveau ; plafond 20/30.
16. **Défaite** : retour au dernier village, −10 % d'or, ennemis conservés, pas de game over définitif.
17. **Combat** : pas de reprise intra-combat après fermeture de page (au prototype).
18. **Animations** : spritesheets frame-by-frame + transformations de code ; 12 classes avec attaque + critique ; 6 évolutions uniques au jalon 8.
19. **Option « Animations rapides / désactivées »** : oui dès le départ.
20. **Contrôles** : clavier + souris pour menus ; manette différée.
21. **Mobile** : hors périmètre du prototype.
22. **Assets** : placeholders libres de droits recolorés à la palette globale, remplacés progressivement ; liste des crédits tenue à jour.
23. **Audio** : pistes CC0 / libres au départ (13 pistes visées).
24. **Sauvegarde** : 3 emplacements + 1 auto, export/import JSON activé, checksum + backup.
25. **Durée cible** : 3 à 5 heures de jeu complet, première zone en ~45 minutes.
26. **Ordre de développement** : M0 → M1 → M4 → M2 → M3 → M5 → M6 → M9 → M7 → M8 → M10, avec un vertical slice après M9.
27. **Langue** : français uniquement, textes externalisés pour une future localisation.
28. **Boss final** : Orvane, le Roi-Marée Brisé, boss à 2 phases ; chaque rencontre « boss » a une condition de victoire « vaincre le boss ».

### Décisions ajoutées après validation

29. **Hébergement** (16/10/2026) : le jeu compilé est servi sur `umbratech.fr/vaelmor/play/`. Le serveur fait un simple `git pull` du dépôt, sans étape de build : la sortie du build (`vaelmor/play/`) est donc commitée. La page d'attente reste sur `/vaelmor/` avec un lien « Jouer ».
30. **Musique** (précision de la n°23) : les pistes sont générées avec Suno par l'auteur (voir `music/README.md`) ; chaque piste retenue est tracée dans `CREDITS.md`.
31. **Version de Phaser** (16/10/2026, précision de la n°1) : **Phaser 4** (4.2.1). La branche 3.x n'évolue plus depuis la 3.90 (mai 2025) ; Phaser 4 est stable depuis avril 2026, garde la même API de haut niveau et apporte un nouveau moteur de rendu (filtres, éclairage) utile au pilier « Beauté d'abord ». Le reste de la pile n° 1 est inchangé (TypeScript, Vite, Tiled).

---

*Fin du document v0.2.*
