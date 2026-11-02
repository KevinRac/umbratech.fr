# La Brume · v18.5 « Le Brumeux » · action 5b · fiche courte de la phase I, « Le Rappel »

Statut : **fiche validée le 2 novembre 2026 (toutes les recommandations, écarts compris) ; implémentée le 2 novembre 2026 (v18.6, action 5b, mémoire § 36, écarts de l'implémentation notés en § 36).** Soumise à l'auteur le 2 novembre 2026 (cadrage Q17 : aucune ligne de code avant la validation). Rédigée à partir du cadrage validé (Q3, Q8, Q10, Q11, Q13, Q14), de `_dev/memoire.md` § 35 (socle 5a), § 34 (arène), § 31–33, § 19–21, et du code actuel (`WTHEMES`, `setRule` / `holesTick` / `nearBrazier`, `renderFloor` et ses sols, bloc v18.4, bloc v18.5).

Ce qu'il faut savoir du code avant de lire :
- Les actes IV à IX jouent **au registre de l'acte III** (décor du Cœur) tant que l'action 6 ne leur donne pas leur décor. Il n'existe donc aujourd'hui que **trois décors** : Faubourgs (pavés, flaques, `faub`), Cryptes (dalles, os, bougies, `crypt`), Cœur (hexagones, `coeur`).
- L'arène **interdit les règles de salle** (`setRule` refusé, v18.4) et les règles existantes couvrent toute la salle, avec une bulle (`murmur`). Une règle « confinée au fragment » est donc une **réécriture locale** dans le bloc du Brumeux, avec les mêmes dessins et les mêmes chiffres, sans bulle.
- `RUN.par18` compte les dégâts reçus **par source** (type d'ennemi, `brumeux:<élément>`, `brume`), pas par acte ni par règle.
- `SAVE.brumeux.mort` n'accepte que des identifiants d'éléments (`brxLireSauve`).
- `brxDans` / `brxSortie` ne connaissent que le disque, le couloir et l'anneau plein.

---

## 1 · Gestes signature (socle, toujours les mêmes)

| Geste (nom jamais affiché) | Forme (parmi les neuf) | Où | Préavis | Dégâts avant montée |
|---|---|---|---|---|
| **Les Fils** | rayons, posés en couloirs fins : 5 couloirs de 30 px en éventail de 70°, partant de ses mains vers toi, longueur 1 000 | depuis ses mains | 1,0 s | 14 |
| **Le Cadre** | anneau à brèche, fixe : anneau r0 70 → r1 250 autour de toi, brèche de 110 px côté opposé à ses mains | sur toi | 1,2 s | 12 |
| **La Toile** | damier : grille 5 × 5 de cases de 90 px centrée sur toi, cases noires puis cases blanches | sur toi | 1,0 s, puis 0,9 s pour la seconde moitié | 10 par moitié |
| **La feinte** (fil rouge v14) | disque vrai ou faux, r 86 | sur toi | 1,15 s (jugée à 0,6 s, règle v14) | celle de la feinte |

- Chaque geste a deux sorties lisibles : Les Fils (entre deux fils, ou de côté), Le Cadre (rester au centre, ou sortir par la brèche), La Toile (changer de couleur de case entre les deux coups).
- Tous orange `TELE.zone`. Première rencontre : +0,3 s (règle Q8, déjà dans `brxPreavis`).
- Ils deviennent des éléments de `data/brumeux.js` marqués **`fixe:true`** : jamais tirés dans une mesure libre (comme la feinte).
- Moteur : `brxDans` / `brxSortie` gagnent la **brèche** de l'anneau et la forme **case** (rectangle) ; les rayons restent des couloirs (déjà connus du moteur).

**Recommandation : ces trois gestes et la feinte.** Leurs dégâts sont dans la fourchette des éléments 5a (10 à 14) ; 5g et l'action 7 les recalent.

## 2 · Partition chiffrée (`partition.rappel`)

Une boucle, environ 70 s (cible de la phase : 50 à 70 s, Q11) :

| # | Mesure | Nature | Durée indicative |
|---|---|---|---|
| 1 | **Tableau 1** | fixe (sa structure) ; son contenu est libre | 12–18 s |
| 2 | Les Fils | fixe | 1,3 s |
| 3 | mesure libre | libre (budget 4 / 5 / 6) | ~1,5 s |
| 4 | **Tableau 2** | fixe ; contenu libre | 12–18 s |
| 5 | La feinte | fixe | 1,2 s |
| 6 | Le Cadre | fixe | 1,5 s |
| 7 | **Tableau 3** | fixe ; contenu libre | 12–18 s |
| 8 | mesure libre | libre | ~1,5 s |
| 9 | La Toile | fixe | 2,2 s |

- **Entracte** : 1,4 s entre deux mesures.
- **Un tableau** : accroche 1,2 s → vie (jusqu'à ce qu'il soit vidé, **30 s au plus**) → rideau 0,6 s → **à nu 3 s** (anneau ivoire `G27.anneau` sur ses mains). Ces trois fenêtres remplacent le « à nu après la boucle » de l'essai 5a (2,2 s).
- **Pendant un tableau**, il ne lance rien d'autre qu'**une feinte**, une seule fois, si le tableau vit encore 8 s après l'accroche. Ses mains tiennent le tableau : on peut les frapper, mais sans la fenêtre à nu.
- **Tableau non vidé à 30 s** : ses ennemis rentrent dans le tableau (fondu, ils disparaissent) et le rideau tombe **sans fenêtre à nu**. C'est la seule « punition » de la lenteur : pas d'enrage, pas de PV en plus.
- Mesures libres : les éléments de l'essai 5a (disque, couloir, pluie, anneau, tir, rafale), pondérés par la lecture. **La construction est exclue de la phase I** (`exclut:['construction']`) : bâtir, c'est la phase II.

**Recommandation : cette partition.**

## 3 · Les trois tableaux par tiers d'arène (Q3 a)

**Les tiers.** L'arène (2 × 1,5 écrans, partie jouable ≈ 2 450 × 945 px) est coupée en trois colonnes d'environ 815 px. Un fragment occupe une colonne, avec 30 px de retrait. Un seul tableau à la fois : jamais de chevauchement.

**L'accroche.** Le tableau se pend **au tiers le plus loin de toi** parmi ceux qui n'ont pas encore servi dans la boucle. Chaque tiers sert une fois par boucle. C'est une règle de socle, apprise sans texte : ses ennemis marchent vers toi, et tu choisis de te battre dans le fragment ou dehors.

**Les fragments de décor.** Un par décor traversé : Faubourgs, Cryptes, Cœur. Chacun est peint **une fois à l'entrée du combat** dans un calque hors écran (mêmes peintres que `renderFloor`, à graine du combat, sans `Math.random`). En combat, on ne fait que poser le calque, en fondu de 0,8 s. Il est encadré d'un cadre aux couleurs de sa matière (`croix`, `fils`), jamais une couleur de la grammaire. Ses fils descendent de ses mains aux deux coins hauts du cadre. Une boucle montre trois décors différents tant qu'il y en a trois ; quand l'action 6 donnera leur décor aux actes IV à IX, le tirage puisera dans tous les actes traversés, sans autre changement.

**Les thèmes de vague**, existants (`WTHEMES`), limités à ce qu'on rencontre dans l'acte du décor (champ `salle` du bestiaire) :

| Décor | Thèmes possibles |
|---|---|
| Faubourgs | Meute, Tir croisé, Pétards |
| Cryptes | les mêmes, plus Chœur |
| Cœur | les six (plus Faux-semblants et Siège) |

Seuls les types et les rôles de la vague viennent de `WTHEMES.build` (ennemis clés, garde du Siège, chœur). Les places sont tirées **dans le fragment**, par le Brumeux, à graine, à 230 px de toi au moins, et posées comme apparitions explicites (cercle violet de 0,85 à 1,3 s, comme aujourd'hui). Elles peuvent naître hors de la vue : l'arène ne leur donne pas de jeton tant qu'elles sont loin (règle v18.4), et le signe de bord les montre.

**Densité.** Une seule vague par tableau, de budget `budget()` × 1,0, qui monte par paliers de +25 % (voir § 4).

**Les règles de salle confinées au fragment.** Mêmes chiffres et mêmes dessins qu'en descente, sans bulle ni étiquette :

| Règle | Dans le fragment seulement |
|---|---|
| **Sol qui se dérobe** | dalles de 66 px annoncées 1,3 s en orange (cible : toi si tu es dedans, sinon un ennemi du fragment) ; 10 dégâts pour toi, 20 pour les ennemis ; chaque dalle est une source de signe, posée seulement si une sortie existe (`brxPlacer`) |
| **Braseros** | deux braseros dans le fragment ; un ennemi **du fragment** hors de leur lumière ne subit que 40 % |
| **Verre** | toi ou un ennemi **dans le fragment** : +40 % de dégâts reçus |
| Brume plombée | **exclue** : son voile assombrit les ennemis, et l'arène ne sait pas juger un coup venu d'un ennemi voilé (« aucune mort sans signe ») |

La règle naît avec le fragment et meurt avec son rideau.

**Le rideau.** Quand le dernier ennemi du tableau tombe :
1. un drapé (couleur `manteau`) tombe du haut du cadre en 0,6 s et le fragment s'efface ;
2. ses fils se détendent, ses mains retombent d'environ 140 px vers toi et s'ouvrent ;
3. l'anneau ivoire paraît sur ses mains pour 3 s ;
4. puis elles remontent.

En mouvements réduits : simple fondu, aucune chute.

**Recommandation : ces règles**, et la Brume plombée exclue tant que l'arène ne sait pas juger un ennemi voilé.

## 4 · Part improvisée

**Ce que chaque tableau tire** (graine de combat `desRng`, relu à chaque boucle) : son décor, son thème, sa règle, sa densité, un éventuel champion.

**Pondération vers ce qui t'a coûté le plus de PV** (même forme que la lecture 5a : poids = 1 + 0,8 × part, plancher 0,05) :

| Choix | Part lue | Compteur |
|---|---|---|
| Décor | dégâts reçus dans les actes de ce décor | **nouveau** `RUN.par18A` (par acte) |
| Thème | dégâts reçus des types d'ennemis du thème (`need`) | `RUN.par18` (existe) |
| Règle | dégâts reçus dans les salles à cette règle | **nouveau** `RUN.par18R` (par règle) |

« Aucune règle » garde un poids fixe de 1. Les deux nouveaux compteurs s'ajoutent dans l'enveloppe `hurtPlayer` du bloc v18.5 : ils ne font qu'écrire dans `RUN`, rien d'autre ne les lit (règle d'or).

**Premier tableau = ce qui t'a tué.**
- Si ta dernière mort contre lui en phase I venait d'un ennemi d'un tableau, ou d'une dalle, la sauvegarde garde ce tableau (décor, thème, règle) et le **premier tableau** de la phase le rejoue tel quel, s'il est encore possible.
- Si elle venait d'un geste ou d'un élément libre, l'élément libre passe en premier (règle 5a), ou le geste signature reçoit son préavis normal (il est déjà au socle).
- Format : `SAVE.brumeux` reste **v:1**. `mort[1]` vaut l'élément `tableau`, et un champ facultatif `tab:{1:{decor,theme,regle}}` est validé par `brxLireSauve` (les champs inconnus sont ignorés).

**Budget par tableau** (menace, Q12 : ×1 / ×1,25 / ×1,5, jamais de PV ni de dégâts en plus) :

| Palier | Budget | Exemple |
|---|---|---|
| Normal | 4 | vague (2) + règle (1) + densité ou champion (1) |
| Difficile | 5 | vague + règle + densité + champion |
| Extrême | 6 | vague + règle + densité ×2 + champion |

Coûts : vague 2 (toujours), règle 1 (au plus une), densité +25 % de vague pour 1 (au plus deux), champion 1 (un ennemi non clé devient champion, au plus un). Mesures libres : le budget 5a de la phase I (4 / 5 / 6).

**Recommandation : cette pondération, ces deux compteurs et ce budget.**

## 5 · État d'arène réel de la phase I (`data/arene.js`)

**Ajouté en quatrième position** (index 3). Les trois états d'essai restent tels quels, à leurs places 0, 1 et 2 : `banc-arene` A et C et `sim-arene` comptent sur eux. Seule la phase I du Brumeux pointe vers lui (`phases[0].arene:3`).

```js
{id:'rappel',bornes:{fx0:0,fy0:0,fx1:1,fy1:1},sol:'pierre',
 obstacles:[{fx:0.3333,fy:0.18,r:26},{fx:0.3333,fy:0.82,r:26},{fx:0.6667,fy:0.18,r:26},{fx:0.6667,fy:0.82,r:26}],
 vides:[],brume:[{fx:0.5,fy:0.04,r:320,a:0.14}]}
```

- Arène pleine. Quatre montants aux frontières des tiers : ils marquent les colonnes sans texte et donnent un abri, toujours hors des fragments.
- Pas de fosse : les fragments ont besoin de tout leur sol, et les dalles du Sol qui se dérobe jouent ce rôle.
- La brume de décor est en haut, là où son corps se devine.
- Sol `pierre` (existant) : aucune nouvelle peinture dans le bloc de l'arène.
- L'essai de l'arène peut ouvrir cet état (`?arene=final&etat=3`).

**Recommandation : cet état, en index 3.**

## 6 · Dessin, et ce que le banc mesurera

**Dessin** (`dessin.version` 1 → 2) :
- Pendant un tableau : deux fils tendus de ses mains aux coins du cadre ; la croix penche vers le tiers occupé.
- Au rideau : les mains retombent et s'ouvrent, les fils mollissent, puis l'anneau ivoire.
- Le cadre et le drapé sont dans sa matière (`croix`, `manteau`), calques cuits à l'entrée.
- Rien d'autre ne change à son corps ni à son glyphe.
- Pas de portrait du Brumeux avant 5g.

**Banc** `banc-brumeux.mjs`, nouvelle **section I** (et `sim-brumeux` étendu) :

| Vérification | Où |
|---|---|
| Tirage des tableaux à graine : déterministe ; trois tiers distincts ; décors distincts tant qu'il y en a ; thème permis par le décor ; budget et coûts ; premier tableau = celui qui t'a tué ; poids qui suivent `par18`, `par18A`, `par18R` | sim, plus égalité jeu = logique pure (I-A) |
| Fragments dans les bornes, hors des montants, jamais deux à la fois ; dalles toujours avec une sortie (10 000 tirages) ; confinement des règles (dedans / dehors) | sim, plus en jeu : ennemi hors fragment non touché par le Verre ni les Braseros, joueur hors fragment jamais visé par une dalle (I-B) |
| Gestes signature : formes, brèche et cases dans `brxDans` / `brxSortie`, sortie toujours trouvée | sim (avec contre-épreuves : brèche fermée, damier plein, dalle hors fragment, tiers répété, thème interdit, sauvegarde `tab` invalide acceptée) |
| Rideau quand le tableau est vidé → à nu 3 s ; tableau non vidé à 30 s → pas de fenêtre ; une feinte au plus par tableau | jeu (I-C) |
| Phase I conduite par le bot qui frappe dans les quatre formes : **0 coup sans signe**, durée de la phase, tableaux vidés, dalles sautées | jeu (I-D) |
| Coût de rendu du Brumeux en phase I (fragment, cadre, fils, ennemis) contre le boss d'essai de l'arène, même foule : **≤ +1,5 ms** ; peinture des trois calques à l'entrée ≤ 250 ms | jeu (I-E ; point ouvert (2) du § 35) |
| Mouvements réduits (rideau en fondu, rien ne tombe ni ne flotte) ; captures relues : accroche, tableau vivant avec règle, rideau et anneau, chaque geste signature | jeu (I-F) |

Le banc G (règle d'or) compare contre `659067a` : défaut de `BANC_AVANT` mis à jour.

**Recommandation : ce dessin et ce banc.**

---

## Écarts au cadrage (à valider avec la fiche)

1. Règle « Brume plombée » exclue des fragments (lisibilité).
2. Deux compteurs nouveaux (`RUN.par18A`, `RUN.par18R`), parce que `RUN.par18` ne connaît que les sources.
3. `SAVE.brumeux` reste v:1, avec un champ facultatif `tab`.
4. L'état réel de la phase I est ajouté en index 3 au lieu de remplacer un état d'essai.
5. La fenêtre à nu suit chaque tableau (3 × 3 s par boucle) au lieu de suivre la boucle.

## Modèle et effort

Implémentation après validation : **Opus 5.5, élevé** (cadrage Q17 : 5b fixe la méthode des phases).
