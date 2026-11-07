# La Brume · v18 « La grande descente » · action 6.2a · fiche du gardien de l'acte V, « Les Eaux Mortes » : la Passeuse

Statut : **validée par l'auteur le 7 novembre 2026 (« Je valide », toutes les recommandations) ; 6.2b-1 faite le 7 novembre 2026 (v18.17, le socle du courant, Passeuse éteinte ; `memoire.md` § 47, avec ses écarts à la fiche)**. Rédigée le 7 novembre 2026, à la v18.16, avec Opus 5.5, effort moyen. Rien du jeu n'a changé pour l'écrire : ni `index.html`, ni `data/`, ni le wiki.

**Révision 1 du 7 novembre 2026 (après l'essai de l'auteur) : à valider.** Elle remplace une partie de Q29 à Q33 et de Q28 ; voir la section « Révision 1 » à la fin de la fiche. Ce qu'elle ne touche pas reste validé.

Lu pour l'écrire : `CLAUDE.md` ; `_dev/REPRISE.md` (§ 3 et § 5) ; le cadrage `la-brume-v18-6-gardiens-cadrage.md` (partie A entière, surtout Q3 à Q14 et Q25 ; partie B comme modèle) ; `memoire.md` § 44 (socle, échelle corrigée du Guet), § 45 (le Guet allumé, écarts, mesures) et § 46 (les 23 constats de la relecture) ; `data/gardiens-descente.js` (commun, échelle, entrée 4) ; `data/descente.js` (acte V : « Les Eaux Mortes », phrase « Les Eaux Mortes se taisent ») ; `data/histoire.js` (fragments, codex, chapitres) ; dans `index.html`, le bloc `/*gar:pur*/` et le bloc « v18.14 · Les gardiens de la descente » (moteur `pas`, `lancer`, `optSortie`, zones, contact, bot), `brxDans`, `brxSortie`, `updatePlayer`, `pMarche`, `collidePlayer`, `hitsWall`, `drawEproj`, `faceA`, et la justice de `data/souvenirs-brume.js` (joueur : rayon 14, vitesse 180 px/s, réflexe 0,05 s).

Numérotation : les questions suivent celles du cadrage (Q1 à Q25) et commencent à **Q26**, pour qu'aucun renvoi ne soit ambigu.

## Ce qu'il faut savoir du code avant de lire

- **La salle** d'un gardien est `AR0` : 56 à 1 224 × 92 à 676, soit 1 168 × 584 px. La caméra n'y bouge pas.
- **Le socle offre** : les temps et leur verrou (`garTemps`, `e.seuils18`), la file mélangée (`garFile`), les PV et les parts (`garPv`, `garDegats`), les zones des neuf formes jugées par `brxDans` et dessinées en orange, la sortie en ligne droite (`brxSortie`) ou au détour des obstacles (`garSortieGrille`), deux coups (`garSortie2`), le juge des coups (`garJuge`), l'échelle (`garEchelle`), le contact plus rare qui repousse **par pas de 10 px**, la fenêtre « à nu » de l'Accoutumance et l'anneau ivoire, le build de référence, le mannequin, le bot qui frappe, le journal des coups, l'essai `?gardien=<n>`, la console `__gardiens18`.
- **Ce qui est propre au Guet**, bien que rangé dans le même moteur `pas` : les herses (`room.pillars` marqués `herse18`, `hitsWall` enveloppé, `sansHerses`, `CAM.ff`), les Fermetures et la Relève, les Feuillets (`g18f`, dessinés à part de `drawEproj`), l'Appel par les guichets, les débris, son dessin et son glyphe.
- **Ce qui n'existe pas** : aucun mouvement imposé au joueur hors du recul du contact ; aucune sortie qui tienne compte d'un déplacement subi ; le pas du joueur (`updatePlayer`) ajoute sa vitesse en une fois puis appelle `collidePlayer` une seule fois.
- **Une zone ne frappe pas pendant une esquive** (`P.dashT>0`, règle du socle, gardée).

---

## Q26 · L'identité

Ce que `histoire.js` donne vers les Eaux Mortes : **le Marais d'Étain** (f11 : « c'est là qu'on jeta d'abord ceux que plus personne ne reconnaissait »), hors les murs ; **la Porte Basse** (f12) que garde le Guet, juste avant ; **le Puits-Murmure** (f14, l'eau des premiers malades) ; **les Fontaines Hautes** (f34, l'eau qui monte dans la tour : le fil d'Élias, déjà pris). Il manque, entre la porte et le marais, **celle qui y menait les oubliés**.

- **A. La Passeuse** (recommandé). On jetait au Marais ceux que plus personne ne reconnaissait ; il fallait quelqu'un pour les y mener. Elle les passait sur une barque plate, à la perche, par les eaux mortes de Valsonne, et elle ne leur demandait jamais leur nom : il n'y avait plus personne pour le dire. Elle passe encore, mais **elle a oublié où était l'autre rive**. Les eaux qu'elle remue, mortes depuis toujours, se sont remises à couler, et elles emportent tout ce qui a un corps. Le Guet demandait « Qui va là ? » ; elle demande **« Où dois-je te mener ? »**. Elle ne lit ni ta réserve ni ta forme.
  - Ne contredit rien : le Marais reste hors les murs, le Guet garde la Porte Basse, plus haut. Ne révèle rien : ni le Brumeux, ni l'Archiviste, ni Corbin, ni Tobiah (aucune pièce, aucun bronze, aucun registre).
- **B. La Lavandière de nuit** : celle qui lavait les linceuls des oubliés dans le canal ; elle bat l'eau et lève des vagues. Bonne image, mais l'histoire ne la porte pas (aucun fragment ne parle de linge) et « battre l'eau » se lit comme des anneaux, déjà ceux du Héraut et du Glas.
- **C. Le Grand Canal** (f46) : l'eau elle-même, un gardien-terrain sans corps. Écarté : f46 dit ce qu'est la Brume (chapitre IV, une Vérité de la Carte) ; un gardien sans corps perd le point faible, l'anneau ivoire et la barre de vie lisible ; et « le Noyé » serait un second Héraut.

**Recommandation : A, « La Passeuse »** (`nom` « La Passeuse », `un` « la Passeuse » : `faceA` écrira « face à la Passeuse » ; autres noms possibles : « La Passeuse des Eaux Mortes », « La Haleuse »).
- **Phrase de bannière** : « Où dois-je te mener ? »
- **Entrée de codex** `passeuse` (`gardien:5`, « Vaincre le gardien des Eaux Mortes ») : « Quand on jeta au Marais ceux que plus personne ne reconnaissait, il fallut quelqu'un pour les y mener. Elle les passait sans leur demander leur nom. Elle passe encore, mais elle a oublié où était l'autre rive. » (à relire par l'auteur)

## Q27 · L'idée de jeu et l'habileté neuve

Le Guet posait une question d'espace : où seras-tu quand la porte se fermera ? La Passeuse pose une question de **corps** : **où l'eau t'aura-t-elle mené quand le coup tombera ?**

- **A. Le déplacement subi, confirmé (recommandé) : le courant.** Elle plante sa perche et l'eau de la salle se met à couler dans des **biefs** (des bandes de cases alignées sur les axes) ; tout ce qui a un corps et se tient dans un bief est emporté dans son sens : toi (esquive comprise), ses invoqués. Elle, non (c'est son eau), ni les tirs, ni les débris. Ses coups visent **là où le courant t'emmène**, pas là où tu es : il faut marcher contre lui pour tenir sa place, ou se laisser porter là où l'eau sort de la zone. Habileté : `courant` (« compenser un déplacement subi : tenir sa place ou se laisser porter »). Absente des gardiens I à IV : aucun ne te déplace.
- **B. Le sol qui glisse** (inertie : tu glisses après chaque pas). Change la façon de bouger dans toute la salle, coûte cher à lire (aucune image ne dit « glisse »), et pénalise surtout les formes qui esquivent beaucoup : la difficulté se lirait sur la forme.
- **C. Le sol qui se dérobe** (cases qui tombent et te font chuter). C'est déjà la dalle du Sol du Brumeux (phase I) et ses fosses (phase II) : pas une habileté neuve.

**Recommandation : A.** L'image dit tout : des flèches sur l'eau, un coup orange là où elles vont. Le déplacement subi se joue aussi « à l'envers » : tenir sa place contre le courant est une réponse, se laisser porter en est une autre, et chaque attaque laisse les deux quand c'est possible.

## Q28 · L'échelon (Q25) : quel cran monte

Le Guet est à **{temps 3, contraintes 2, enchaînements 2, préavis 0,8, entourage 1}** (§ 44 : l'échelle validée du cadrage a été corrigée pour lui). Deux conséquences pour l'acte V :

- **La ligne V du tableau de Q25 est caduque.** Elle donnait « contraintes 2, enchaînements 2, préavis 0,9 à 1,1 s » : aucun cran ne monterait par rapport au vrai Guet, et le préavis **remonterait** (0,8 → 0,9), ce que la règle refuse (« le préavis ne monte jamais »). Le préavis de la Passeuse reste au plancher, **0,8 s** (sa Gaffe). Plus largement, **le cran « préavis » est désormais à 0,8 s pour tous les gardiens V à IX** (il ne peut ni monter ni descendre) : la colonne « préavis » du tableau de Q25 se lit « 0,8 » de V à IX. À corriger dans le cadrage avec 6.2b.
- Il faut donc qu'un autre cran monte. Options :
  - **A. Entourage 1 → 3, « un terrain qui agit » (recommandé).** C'est ce qu'est le courant, et rien d'autre ne serait honnête. Contraintes 2 (un courant et une zone à la fois), enchaînements 2 (le Ressac, le double Sillage), préavis 0,8.
  - **B. Contraintes 2 → 3** (courant, zone et invoqués qui comptent à la fois). Raide pour l'acte V, et le tableau prévoit ce cran pour l'acte VIII.
  - **C. Enchaînements 2 → 3.** Le tableau le prévoit pour l'acte VI (la mémoire d'une séquence) ; le prendre ici forcerait l'acte VI à monter ailleurs.

**Recommandation : A.** Échelon **{temps 3, contraintes 2, enchaînements 2, préavis 0,8, entourage 3}**, habiletés `['courant']`. **Conséquence pour la suite, vérifiée** : préavis et entourage sont alors à leur borne, et il reste un cran à monter pour chacun des gardiens suivants, dans l'ordre même du tableau : VI enchaînements 3 ; VII temps 4 ; VIII contraintes 3 ; IX enchaînements 4. L'échelle ne plafonne pas avant l'acte IX.

## Q29 · Le courant : ses règles

| Règle | Valeur proposée | Pourquoi |
|---|---|---|
| **Grille** | la salle en **6 × 4 cases** (≈ 195 × 146 px) | des cases alignées sur les axes (exigence de 6.1c) ; assez petites pour qu'une sortie latérale existe toujours (voir la sortie) |
| **Bief** | une rangée entière (6 cases) ou une colonne entière (4 cases), un sens (→ ← ↓ ↑) | un bief traverse la salle d'un mur à l'autre, comme une herse, mais il ne coupe rien |
| **Vitesse** | 70 px/s au temps 1, 80 au temps 2, 90 aux temps 3 et 4 ; **jamais au-delà de 0,5 × la vitesse de justice (90 px/s)** | on peut toujours tenir sa place (180 − 90 = 90 px/s contre le courant) et sortir de côté (√(180² − 90²) ≈ 156 px/s) |
| **Annonce** | **1,0 s** : les cases du bief s'éclairent de flèches vert d'eau, puis l'eau coule | un mouvement subi est un signe à part entière : préavis ≥ 0,8 s, comme une zone |
| **Durée** | 5 s au temps 1, 6 s ensuite ; puis l'eau retombe (0,3 s) | assez pour qu'une ou deux attaques tombent dessus |
| **Ce qu'il emporte** | toi (à pied et pendant l'esquive), ses invoqués | « les corps, pas les tirs », la règle des fosses du Brumeux et des herses du Guet |
| **Ce qu'il n'emporte pas** | elle (c'est son eau), les tirs, les débris, les zones (une zone ne dérive jamais) | une zone qui bouge serait illisible et sa sortie incalculable |
| **Croisement** | deux biefs ne se croisent jamais ; deux biefs parallèles peuvent être voisins (contre-courants) | une case n'a qu'un sens, lisible d'une flèche |
| **Stabilité** | un courant **ne naît, ne meurt ni ne change de sens pendant le préavis d'une zone**, sauf le Ressac (Q30), annoncé dès le départ | la sortie calculée au départ reste vraie jusqu'au coup |
| **Mouvement** | découpé en **pas de 6 px au plus**, une collision à chaque pas (`collidePlayer` pour toi, `hitsWall` pour un invoqué) | exigence de 6.1c (le recul qui traversait une herse) ; sa salle n'a aucun obstacle, mais le socle doit servir aux gardiens suivants |
| **Sortie** | calculée **avec** le courant (`garSortieCourant`, Q39) : temps de chaque pas de la grille à la vitesse au sol réellement atteignable (ta vitesse à pied moins le courant, projetée), dans le préavis moins le réflexe ; tenir sa place compte comme une sortie si l'on n'est pas dans la zone | « toujours une sortie à ta vitesse à pied » |
| **Ce que tu tiens toi-même** | la sortie se calcule à ta vitesse à pied (`pMarche`), sans le faisceau tenu, la Dévoration ni l'Absolution (règle v17.20 du Masqué) ; tenir le faisceau dans un courant de 90 px/s te laisse 30 px/s de reste : c'est ton choix, et les flèches l'ont annoncé | une règle déjà en place, gardée telle quelle |
| **Obstacles** | aucun : sa salle n'a ni piliers ni cocons (comme celle du Guet) ; la carte des chemins (`FF`) est faite une fois à l'entrée | l'idée tient dans l'eau ; les herses étaient l'idée du Guet |

**Option écartée** : des pieux d'amarrage fixes (quatre disques de 16 px) contre lesquels le courant te plaque. Jolie, mais elle mêle une seconde idée (l'abri) à la première et ajoute un cas de sortie (plaqué contre un pieu dans une zone). Gardée pour l'acte IX (« deux habiletés d'avant, jouées ensemble »).

**Recommandation : ces règles.** Vérification en logique pure (Q38, Q39) : la sortie trouvée est atteinte par un joueur simulé pas à pas, contre-épreuve à l'appui.

## Q30 · Ses attaques (les neuf formes connues)

Parts : des PV du build de référence de l'acte V (`pvRef` 100), zones principales à 25 % comme le Guet, jamais au-delà de 30 %. Préavis : jamais sous 0,8 s.

| Attaque | Forme | Ce qu'on voit, ce qui frappe | Préavis | Part | Temps |
|---|---|---|---|---|---|
| **Bief** | cases de courant (terrain, aucun dégât) | flèches vert d'eau sur une rangée ou une colonne, dans un sens ; puis l'eau coule (Q29) | 1,0 s | — | 1, 2, 3 |
| **Abordage** | case | 0,3 s après que l'eau coule : la case où le courant te mènerait si tu ne faisais rien, au moment du coup, s'emplit d'orange (si c'est la tienne, la tienne) ; on s'en sort en tenant sa place ou de côté | 1,2 s (1,0 aux temps 3 et 4) | 25 % | 1, 2, 3 |
| **Ressac** | case, en deux coups, et un courant qui s'inverse | l'Abordage, plus une seconde case **en amont**, en pointillé ; les flèches du retour sont tracées **en pointillé dès l'annonce** à côté des flèches pleines ; au premier coup, le courant repart en sens inverse et la seconde case frappe 0,6 s plus tard ; sortie vérifiée pour les deux coups avec le courant de chacun | 1,0 s puis + 0,6 s | 22 % par coup | 3, 4 |
| **Remous** | anneau à brèche | elle fait tourner sa perche : ta case devient un courant (1,0 s d'annonce, le sens qui t'éloigne le plus d'elle) et un anneau se referme autour de toi (r 70 à 200 px), **brèche de 120 px en aval** ; le centre est sûr, mais le courant t'en sort : tiens ta place au centre, ou laisse-toi porter par la brèche | 1,0 s | 22 % | 1, 2, 3 |
| **Gaffe** | cône | 110°, de 0 à 170 px devant elle ; seulement si tu es à 0,8 × 170 px (elle s'approche 2 s, puis renonce) | 0,8 s | 24 % | 1, 2, 3 |
| **Sillage** | croix (deux bandes en cases) | sa rangée et sa colonne, 60 px de large, d'un mur à l'autre ; au temps 3, une seconde croix centrée sur toi, en pointillé, 0,6 s après la première | 0,9 s (+ 0,6 s) | 20 % par croix | 2, 3 |
| **Coup de perche** | disque | elle frappe l'eau de sa perche : 130 px autour d'elle ; quand tu restes à moins de 110 px pendant 2,5 s (la réponse au corps à corps, règle de « Garde ! ») | 0,9 s | 18 % | 1, 2, 3 |
| **Les Passagers** | invocation | ceux qu'elle passe (Rampants et Voilés du registre 3 ; 2, puis 3 ; au plus 5 vivants) montent de l'eau **à l'entrée amont d'un bief qui coule** (sinon au bord, loin de toi) ; le courant les emporte comme toi | 0,9 s | — | 2, 3 |

**La Traversée** (sa signature, comme la Fermeture du Guet) : Bief, puis Abordage (ou Ressac au temps 3) ; elle enchaîne la suite de sa file **l'eau coulant encore** (deux contraintes à la fois, comme les herses debout du Guet) ; quand l'eau retombe, **l'Échouage** (Q32). Variante du temps 2, **les Contre-courants** : deux biefs parallèles voisins, de sens opposés, puis l'Abordage.

**Formes employées** : case, anneau à brèche, cône, croix, disque, invocation. L'anneau à brèche entre dans la descente ; restent pour les gardiens suivants : rayons, losanges, projectile (et le couloir, que 6.1c déconseille pour toute bande qui touche un passage). **Aucun tir** : la règle des tirs propres (Q38) vaut si l'implémentation en ajoute un.

**Réponse par forme** : les formes au corps à corps (Gouffre, Héraut) doivent l'approcher à travers ou contre le courant, et se font chasser par la Gaffe et le Coup de perche ; les formes à distance (Lumenarque, Tisse-Destin) tirent librement (le courant n'emporte pas les tirs) mais ne peuvent pas rester immobiles : l'Abordage et le Remous punissent celui qui tient son faisceau sans compenser.

**Recommandation : ce jeu d'attaques.** Les chiffres (préavis au-dessus du plancher, durées, vitesses, parts) s'ajustent au bot sans changer ni les formes ni les signes.

## Q31 · Les files et le rythme

Mélangées à chaque tour, jamais deux fois la même de suite (`garFile`) :
- **Temps 1 · « Où dois-je te mener ? »** (100 → 66 %) : traversée, gaffe, remous, traversée, gaffe.
- **Temps 2 · « L'autre rive s'efface »** (66 → 33 %) : contre (les Contre-courants), sillage, passagers, gaffe, traversée, remous.
- **Temps 3 · « Les eaux mortes coulent »** (33 → 0 %, ou → 18 % en Difficile et en Extrême) : elle va 30 % plus vite ; ressac, sillage (double), remous, traversée, passagers, gaffe.
- **Temps 4 · « La Dérive »** (Difficile et Extrême, sous 18 %) : la file du temps 3, sur la Dérive (Q33).

Rythme : entractes 0,95 / 0,75 / 0,6 / 0,5 s (ceux du Guet après sa passe de correction) ; après l'Abordage, la moitié de l'entracte, l'eau coulant encore ; pas de relâche en fin de file (sa fenêtre est l'Échouage). Elle avance vers toi au-delà de 230 px, à 58 px/s (× 1,3 au temps 3), sans que le courant la touche.

**Recommandation : ces files** ; le rythme repart de celui du Guet validé, et s'ajuste au bot.

## Q32 · Son point faible et sa fenêtre

- **Point faible : le nœud de l'amarre**, à sa taille (`faible` : « le nœud de l'amarre de la Passeuse ») : une amarre épaisse, nouée sur elle, dont le bout traîne dans l'eau et ne mène à aucune rive. Distinct du cœur-cloche, du battant, de l'œil et du registre. L'anneau ivoire l'entoure quand elle est à nu. (Autre choix possible : la figure de proue de sa barque, plus basse, moins lisible au centre de touche.)
- **Sa fenêtre propre** :
  - **A. L'Échouage** (recommandé) : quand l'eau d'une Traversée retombe, sa perche reste prise dans la vase ; elle est sonnée 2 s (`vuln`, +50 %), anneau ivoire sur le nœud. Même place dans le rythme que la Relève du Guet.
  - **B. Pas de fenêtre propre**, seulement l'Accoutumance.

**Recommandation : A.** Le rythme se lit : l'eau coule, tu tiens ; l'eau retombe, tu frappes.

## Q33 · Son temps de plus (Difficile et Extrême)

- **A. « La Dérive »** (recommandé), sous 18 % : **l'eau ne s'arrête plus**. Le tour de la salle (les 16 cases du bord) coule en permanence, dans un sens qui fait le tour (une boucle), à 45 px/s ; les 8 cases du centre restent calmes (« l'œil »). Ses biefs passent par-dessus (une case n'a qu'un sens : celui du bief tant qu'il coule). L'Échouage dure 1,5 s au lieu de 2. Toute sortie se calcule sur le champ entier. **Signe sur le corps** : l'amarre se rompt ; son bout libre flotte derrière elle, sous le voile (figé en mouvements réduits). À sa mort, l'eau retombe partout.
- **B. « La Crue »** : biefs plus rapides et plus longs. Des chiffres, pas une mécanique.
- **C. Les Passagers en continu** par un bord de la salle. De la densité, pas une habileté.

**Recommandation : A.** C'est son idée poussée d'un cran, comme le Couvre-feu du Guet : on ne joue plus jamais sur une eau immobile hors du centre, et le centre, c'est elle qui le tient.

## Q34 · Silhouette, couleurs, décor, glyphe, entrée et mort

- **Silhouette** (r 48, hauteur ≈ 3,5 × r) : une femme haute et voûtée, **debout dans une barque plate** (dont la longueur reste dans 2,2 × r ; ce qui dépasse, proue et poupe, sous le voile) ; une cape couverte de **lentilles d'eau** et de joncs ; **pas de visage**, un capuchon de joncs qui pend ; **la longue perche** tenue en biais (au-delà de 1,15 × r : sous le voile) ; l'amarre nouée à la taille, le bout dans l'eau ; les pieds et la barque dans une flaque d'eau noire. On la reconnaît de loin à la diagonale de la perche et au croissant de la barque, rien de commun avec les trois cloches, la robe ou la herse.
- **Temps visibles** : temps 1, barque sèche, amarre nouée ; temps 2, l'eau monte dans la barque, le capuchon tombe sur une chevelure d'algues (toujours sans visage) ; temps 3, **la barque se fend et reste au sol** (débris, jamais lus par le combat, comme la herse du Guet) : elle se tient debout dans l'eau, l'amarre à nu ; temps 4, l'amarre rompue flotte derrière elle.
- **Couleurs proposées** (mesurées pour cette fiche en CIE76 ; à remesurer sur le rendu) :

| Rôle | RVB | ΔE le plus proche dans la grammaire (orange, violet, cyan, lavande, ivoire, rouge) | Contraste sur le sol |
|---|---|---|---|
| manteau (lentilles d'eau) | 112, 146, 70 | ivoire 56 | 4,95 |
| chair, mains (blafardes) | 176, 168, 150 | ivoire 29,3 | 7,5 |
| bois (barque, perche) | 132, 104, 76 | ivoire 54 | 3,4 (pièce secondaire) |
| amarre | 150, 132, 96 | ivoire 44,7 | 4,8 |
| vase (ombre, bas) | 78, 70, 54 | ivoire 68 | (ombre) |
| lueur (feu follet du marais, lumière `TINT.g18_5`) | 196, 186, 120 | ivoire 36 | 8,9 |
| reflet (au lieu du blanc, règle C19) | 170, 182, 196 | ivoire 29,6 | 8,6 |
| **courant** (flèches vert d'eau, **signal neuf**) | **100, 205, 160** | cyan 44,3 (craie du Brumeux 26,1 ; son propre manteau 33,7, sa lueur 41,0) | 9,1 |

  Le corps (manteau et chair) tient le contraste ≥ 4,5 contre son sol ; le bois, plus sombre, n'en porte qu'une petite part. **Le vert d'eau du courant est une couleur de signal neuve** : à ΔE ≥ 25 de toute la grammaire et aussi de la craie du Brumeux (les deux annoncent quelque chose qui n'est pas un coup), il entre dans la grammaire du simulateur. Une flèche de courant sous une case orange reste lisible (ΔE 88 de l'orange) : les flèches se dessinent sous les zones, à 0,45 d'opacité.
- **Sol de sa salle** (thème `eauxmortes`) : des dalles noyées sous une eau noire immobile, des plaques de lentilles d'eau, quelques planches de ponton ; brume basse vert-de-gris ; teinte ≈ 18, 26, 28 (`h` 190, `s` 20, `l` 9), assez sombre pour le contraste. La grille de 6 × 4 ne se dessine pas au repos : seules les cases d'un bief s'éclairent.
- **Les flèches** : une flèche par case, épaisse, cernée d'encre ; hors mouvements réduits, des stries fines qui **glissent** lentement dans le sens du courant (translation seule, jamais de rotation ni de pulsation) ; en mouvements réduits, **flèches figées**, rien ne bouge. Les flèches du retour (Ressac) : en pointillé.
- **Glyphe** (brouillon, XML vérifié, à polir) : la Passeuse encapuchonnée dans une barque en croissant, la perche en diagonale, le nœud de l'amarre ; lisible à 16 px, sans identifiant ni filtre :
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><path d="M19.2 2.2L13.6 22" fill="none" stroke="#0a0810" stroke-width="3" stroke-linecap="round"/><path d="M19.2 2.2L13.6 22" fill="none" stroke="#84684c" stroke-width="1.4" stroke-linecap="round"/><path d="M12 3.8C9.3 3.8 8.4 6.2 8.4 8.8L7.2 17.6H16.8L15.6 8.8C15.6 6.2 14.7 3.8 12 3.8Z" fill="#70924a" stroke="#0a0810" stroke-width="1.4" stroke-linejoin="round"/><path d="M12 6.2C10.8 6.2 10.3 7.3 10.3 8.5C10.3 9.7 11.1 10.5 12 10.5C12.9 10.5 13.7 9.7 13.7 8.5C13.7 7.3 13.2 6.2 12 6.2Z" fill="#141c1e"/><circle cx="12" cy="13.4" r="1.7" fill="#96845f" stroke="#0a0810" stroke-width="1.1"/><path d="M2.4 17.2Q12 21.6 21.6 17.2L19.6 20.4Q12 23.2 4.4 20.4Z" fill="#84684c" stroke="#0a0810" stroke-width="1.4" stroke-linejoin="round"/></svg>`
- **Entrée** (bannière, 2,2 s) : un bief s'allume d'un bord de la salle jusqu'à sa place, sa barque glisse hors de la brume le long de lui ; mouvements réduits : fondu seul.
- **Mort** (1,5 s, rien n'est retardé) : la perche s'enfonce dans la vase, elle s'assied dans la barque, l'amarre se dénoue, et la barque s'en va avec le dernier courant, dans le sens de ses flèches, en se défaisant en eau noire ; tout courant retombe. Mouvements réduits : fondu seul, sur place.
- **Son** : sons existants (l'eau : `door` ou le son de la marée du Héraut pour l'annonce d'un bief, `lame` pour la Gaffe, `phase` aux changements de temps) ; aucune secousse en mouvements réduits.

**Recommandation : cette silhouette, cette palette et ce décor**, mesurés et retouchés à l'implémentation sans changer l'idée (la barque, la perche en diagonale, le capuchon sans visage, l'amarre).

## Q35 · Ce qui la distingue des gardiens I à IV

| | Mère-Brume (I) | Héraut Noyé (II) | Glas Originel (III) | Guet Sans-Nom (IV) | **Passeuse (V)** |
|---|---|---|---|---|---|
| Histoire | la mère qui refuse d'oublier | le frère qui sonne pour qu'on n'oublie pas | la cloche qui ne se tait plus | celui qu'on a oublié | **celle qui menait les oubliés** |
| Question posée | que copie-t-elle ? | quand traverser ? | quand traverser, où se mettre dans les tirs ? | où seras-tu quand la porte se ferme ? | **où l'eau t'aura-t-elle mené ?** |
| Signature | copie de ton style | anneaux, marée à brèche, cloches, ruée | anneaux, motifs de tirs, faisceaux, Reflet | herses, guichets, Contrôle, Relève | **biefs, Abordage, Ressac, Remous, Échouage** |
| L'eau | — | il s'y noie (dans la tour) | — | elle est au sol | **elle bouge et t'emporte** |
| La salle | ouverte | ouverte (piliers) | ouverte | découpée, puis rouverte | **ouverte, mais elle coule** |
| Sa fenêtre | Accoutumance | sonné contre un mur | épuisé | la Relève | **l'Échouage** |
| Point faible | cœur-cloche | battant | œil | registre | **nœud de l'amarre** |
| Ta réserve | non (copie) | non (copie au temps 2) | oui (Reflet) | non | **non, ni ta forme** |
| Habileté (Q25) | lire ce qu'elle copie | traverser au bon moment | lire des motifs de tirs | l'espace | **le courant : compenser un déplacement subi** |

Avec le Héraut Noyé, le risque est l'eau : lui est noyé, vertical, sa marée **traverse** la salle et on la passe par une brèche ; elle se tient **sur** l'eau, à l'horizontale, et c'est le sol qui bouge sous toi.

## Q36 · Ce que le wiki en dit, le codex et le journal

- **Lecture à l'œil** (`dessin.lecture`) : « Une passeuse sans visage, debout dans une barque plate, couverte de lentilles d'eau, une longue perche à la main et une amarre nouée à la taille qui ne mène à aucune rive. Au deuxième temps, l'eau monte dans la barque ; au troisième, la barque se fend et reste au sol : elle se tient dans l'eau, l'amarre à nu. »
- **Ses attaques** (au ton de celles du Guet) :
  - Bief : « Des flèches vert d'eau s'allument sur le sol : le courant va t'emporter dans leur sens. Marche contre lui, ou laisse-toi porter. »
  - Abordage : « La case où le courant t'emmène s'emplit d'orange : n'y arrive pas. »
  - Ressac : « Des flèches en pointillé montrent le retour : après le premier coup, le courant repart en sens inverse, et la case en pointillé frappe. »
  - Remous : « Un anneau se referme autour de toi et le courant t'y pousse : tiens ta place au centre, ou sors par la brèche, en aval. »
  - Gaffe : « Elle fauche de sa perche quand tu t'approches : sors du cône. »
  - Sillage : « Deux bandes orange en croix partent d'elle : quitte sa rangée et sa colonne. Plus tard, une seconde croix, sur toi, en pointillé. »
  - Coup de perche : « Reste collé à elle et elle frappe l'eau : quitte le cercle. »
  - Les Passagers : « Ceux qu'elle passe montent de l'eau en amont du courant ; il les emporte comme toi. »
  - L'Échouage : « Quand l'eau retombe, sa perche reste prise dans la vase : frappe le nœud de l'amarre. »
- **Temps de plus** : « En Difficile et en Extrême, un quatrième temps, la Dérive : l'eau fait le tour de la salle et ne s'arrête plus. »
- **Carte** : phrase `done` « La Passeuse lâche sa perche » ; la phrase de l'acte (« Les Eaux Mortes se taisent ») ne change pas.
- **Journal** (ne la nomme pas : éteinte, le wiki ne la nomme nulle part, banc H) : « Plus bas que les Bas-Fonds, les eaux mortes se sont remises à couler. »
- **Codex** : Q26 ; montré au jeu comme au wiki seulement si elle est allumée (`gardien:5`) ; débloqué en la vainquant hors essai (`SAVE.flags.g18_5`).
- **Tait** : le Brumeux, la némésis, ce que le Masqué tire de tes souvenirs ; aucun chiffre de moteur (vitesse des courants, réflexe, budget).

**Recommandation : ces textes**, à relire par l'auteur (ce sont des phrases du jeu).

## Q37 · Les chiffres

- **PV** : la règle de Q9, remesurée avec son vrai corps (DPS médian des quatre formes contre le mannequin, au build de référence de l'acte V, × 50 s). Le build de référence est le même de l'acte IV à l'acte IX (§ 44) : attendus ≈ 19 600, comme le Guet.
- **Dégâts** : parts de Q30 (zones principales 25 %, contact 8 %, plafond 30 %).
- **Rayon de touche** 48 ; vitesse 58, × 1,3 au temps 3 ; xp 100.
- **Durée visée** : la friction doit être **au moins celle du Guet** (médiane au bot 0,96 à 1,1 ; durée ≈ 71 s), et monter si possible vers ≈ 80 s. Un bot qui compense le courant par le calcul le sent peu (comme les herses à distance) : la mesure lira surtout la tendance, et l'auteur tranchera comme en 6.1b.

**Recommandation : ainsi**, les chiffres finaux sortant de la mesure (6.2b), rapportés à l'auteur.

---

## Q38 · Exigences tirées de la relecture 6.1c

Chaque constat de § 46 devient une exigence ; celles qui touchent ses mécaniques neuves sont en tête.

| Exigence | Ce que fait la Passeuse | Preuve |
|---|---|---|
| **Zones alignées sur les axes en cases, plutôt qu'en couloirs** (C1 : les bouts arrondis d'un couloir mordaient le guichet) | biefs, Abordage, Ressac et Sillage sont des **cases** de la grille (le Sillage : deux bandes en cases d'un mur à l'autre) ; le reste est centré (anneau, cône, disque) ; **aucun couloir** | `sim-gardiens` : toutes ses zones sont `case`, `anneau`, `cone` ou `disque` ; contre-épreuve : un bief en couloir est refusé |
| **Un mouvement imposé découpé en pas, une collision à chaque pas** (C6) | le courant avance par pas de 6 px au plus, `collidePlayer` à chaque pas (toi), `hitsWall` à chaque pas (un invoqué) ; le recul du contact garde ses pas de 10 px | banc I : un corps emporté contre un mur s'y arrête au pixel ; sur une salle d'essai à obstacles, jamais traversé ; contre-épreuve : un pas unique traverse |
| **Sa sortie calculée avec ce déplacement** | `garSortieCourant` (Q39) pour chaque zone, sur le champ du moment (Ressac : le champ de chaque coup) | `sim-gardiens` : 10 000 positions par attaque, la sortie trouvée est **atteinte** par un joueur simulé pas à pas qui compense ; contre-épreuve : une sortie qui ignore le courant est attrapée |
| **`CAM.ff=1` dès que des obstacles changent** (C7) | sa salle n'a aucun obstacle (ni herse, ni pilier, ni débris solide) : la carte est faite à l'entrée ; le socle pose `CAM.ff=1` à toute entrée de salle marquée, et une assertion vérifie que `room.pillars` reste vide chez elle | banc A |
| **Des tirs propres dessinés à part, avec une ligne de préavis sur tout leur vol** (C4, C5 : `drawEproj` dessine les tirs de boss au registre 3 comme ceux du Glas) | elle n'a **aucun tir** ; si l'implémentation en ajoute un, il se dessine à part (comme les Feuillets) et sa ligne court tout son vol | `sim-gardiens` : aucune attaque `projectile` sans `dessin` propre ; banc D |
| **Corps plein ≤ 1,15 × r, mesuré sur le rendu complet** (C10) | barque dans 2,2 × r ; perche, proue, poupe, bout d'amarre et feu follet sur **un seul calque voilé posé une fois** à 0,33 ; l'ombre resserrée sous elle | banc F, rendu complet, quatre temps, miroir, quatre instants |
| **Mouvements réduits** (C9, C11, C12, H2) | flèches figées (aucun courant qui tourne ni ne pulse) ; stries immobiles ; feu follet et amarre du temps 4 posés figés ; aucun éclat au changement de temps ; titres fixes (`titre`, socle 6.1c) ; à sa mort, son sens est gardé (`mir`) | banc F et I en mouvements réduits : une seule image sur douze instants, courant compris |
| **Un essai lié à sa descente, rien d'écrit en essai** (C2, C3 : déjà dans le socle) | à vérifier pour ses mécaniques neuves : le champ de courants vit dans l'état de **sa** salle (`room.g18s`) et se vide à la sortie de salle, à sa mort, à la fin d'un essai (`finEssai`) et à une nouvelle descente ; la poussée ne lit que la salle courante marquée ; `SAVE.flags.g18_5`, le codex, `bossFirst`, la Résonance : jamais en essai | banc I : essai puis vraie descente : aucune flèche, aucune poussée ; rien d'écrit |
| **La sortie ne traverse pas son corps** (C17) | son disque est un obstacle de la sortie (`optSortie(charge, corps)`) | `sim-gardiens` |
| **Le miroir a une marge** (C13) | `miroir(e)`, bascule au-delà de ±20 px | banc I |
| **Les Voilés ne clignent pas à travers** (C14) | sans objet sans obstacle ; un Voilé ne cligne pas **dans** une case orange | banc I |
| **Ses invoqués ne naissent pas au même point** (C16) | décalés de 0, +30, −30 px le long de l'entrée amont du bief | banc D |
| **Sa clé dans `V7FOE`** (C15), **`faceA`** (C23), **palier validé** (C22), **lumière qui grandit et décroît** (C21), **reflets loin de l'ivoire** (C19) | `V7FOE.g18_5` ; « face à la Passeuse » ; `couleurs.reflet` ; `computeLights` en fondu | banc I sur une vraie mort |
| **Les montants et signes lisibles sous l'orange** (C20) | les flèches vert d'eau restent lisibles sous une case orange en fin de charge (ΔE mesuré sur le rendu) | banc F |

**Recommandation : ces exigences, chacune avec sa preuve**, toutes dans `sim-gardiens` (section 10, la Passeuse) et dans la section I de `banc-gardiens18`.

## Q39 · Ce que le socle doit gagner, et ce qui reste à elle

Le moteur `pas` du bloc v18.14 mélange le commun et le Guet. Trois façons d'ajouter la Passeuse :

- **A. Le courant dans le socle, les gestes par gardien** (recommandé). Le socle gagne ce qui peut servir à d'autres (l'acte IX doit reprendre deux habiletés d'avant), le Guet ne bouge pas d'un bit, et la Passeuse vit dans une table de gestes à elle (`gestes[5]`), que `lancer` consulte avant ceux du Guet. La règle d'or du Guet est prouvée par `banc-gardiens18` G (sa salle allumée, image par image contre la v18.16).
- **B. Un second moteur copié pour elle.** Rapide, mais six copies au bout du chantier, et une correction à faire six fois.
- **C. Extraire tout le moteur commun du Guet maintenant.** Le plus propre, mais on récrit le Guet qu'on vient de relire : risque pour rien.

**Ce que le socle gagne** (A ; tout est inerte sans courant, le Guet n'en a pas) :

| Où | Quoi |
|---|---|
| `/*gar:pur*/` | `garGrilleCases(R, nx, ny)` (les cases de la salle) ; `garBief(G, axe, i, sens, v)` (les cases d'un bief) ; `garChamp(courants)` et `garVent(champ, x, y)` (le courant en un point, une case n'a qu'un sens) ; **`garSortieCourant(S, zones, p, o)`** : comme `garSortieGrille`, mais chaque pas de grille coûte la longueur ÷ la vitesse au sol atteignable dans sa case (pour une direction d et un courant c : c·d + √(v² − (c×d)²), le pas est interdit si cette vitesse est ≤ 0) ; tenir sa place est permis (|c| ≤ v / 2) ; **sans champ, exactement `garSortieGrille`** (et donc, sans obstacle, exactement `brxSortie`) ; `garSortie2` accepte un champ par coup (le Ressac) ; `garPasImpose(dx, dy, pasMax)` (le découpage d'un mouvement imposé) ; `garPassif(p, champ, t)` (où le courant mène un corps qui ne fait rien : la cible de l'Abordage) |
| jeu, moteur commun | `optSortie` reçoit le champ du moment (`o.champ`) ; la **poussée** : après `updatePlayer`, dans une salle marquée dont le champ n'est pas vide, toi puis chaque invoqué, par pas de 6 px, collision à chaque pas (`step` enveloppé, comme la chute des herses) ; le champ se vide à la sortie de salle, à la mort du gardien, en fin d'essai ; le dessin générique d'un champ (cases éclairées, flèches cernées d'encre, stries qui glissent ou figées en mouvements réduits, sous les zones) ; le journal note la vitesse du courant au moment d'un coup |
| bot qui frappe | sa vitesse voulue moins le courant (bornée à sa vitesse) : il compense ; sa sortie passe par `garSortieCourant` ; inerte sans courant (le Guet et le Brumeux inchangés) |
| simulateur | grammaire : le vert d'eau du courant ; échelle : l'habileté `courant` connue ; une section « courant » commune (égalité exacte sans champ, sortie atteinte pas à pas, contre-épreuves) |

**Ce qui reste à elle** : ses données (`gardiens-descente.js`, entrée `5`, et `commun.echelle.habiletes.courant`), ses gestes (Traversée, Contre-courants, Ressac, Remous, Gaffe, Sillage, Coup de perche, Passagers), l'Échouage, la Dérive (le champ du bord), son dessin (`peindrePasseuse`, barque, perche, débris de la barque), son décor (`eauxmortes`), son glyphe, ses portraits (`gardien-5-t<n>-v1.webp`), son entrée et sa mort, sa lumière, son codex (`histoire.js`, `passeuse`), sa carte et sa sous-section du wiki, sa ligne de journal.

**Recommandation : A.**

## Q40 · Le découpage de 6.2b et de 6.2c

| Étape | Contenu | Modèle, effort |
|---|---|---|
| **6.2a** | cette fiche | Opus 5.5, moyen (faite) |
| — | **validation par l'auteur** (toutes les recommandations, ou question par question) | — |
| **6.2b-1** | **le socle du courant** (v18.17, Passeuse **éteinte**, `essai:true` : deux gestes d'essai, Bief et Abordage, silhouette simple) : logique pure (Q39) et sa section de `sim-gardiens` avec contre-épreuves ; poussée par pas ; `optSortie` et bot avec le champ ; dessin générique d'un champ ; essai `?gardien=5` ; banc A, B, C, G (le Guet et toutes les autres salles identiques à la v18.16, image par image), H ; correction de la ligne V du tableau Q25 dans le cadrage | **Opus 5.5, élevé** (écart au plan, qui disait Sonnet : une sortie neuve dans le socle partagé avec le Guet, et sa règle d'or ; même raison que 6.1a) |
| **6.2b-2** | **la Passeuse allumée** (v18.18) : données complètes, gestes, temps, Échouage, Dérive, Passagers, dessin v17.27 (rendu complet ≤ 1,15 × r), décor, glyphe, portraits, entrée et mort, lumière, PV au bot (mannequin, quatre formes × cinq graines), codex, wiki, journal ; banc D, E, F, I et toutes les sections ; régression complète, `banc-gardiens-final` seul ; `memoire.md` § 47, `CLAUDE.md`, `REPRISE.md`, `cadrages/README.md` | **Sonnet 5.5, élevé** (le plan) |
| **6.2c** | **relecture indépendante** par trois agents séparés (comme 6.1c) : (1) aucune mort sans signe, le courant et ses sorties, le Ressac ; (2) règle d'or, fuites hors de sa salle, éteinte, essai ; (3) mouvements réduits, `e.fade`, corps plein, ΔE, contraste, bot ; tri, corrections après accord de l'auteur | **Opus 5.5, moyen** (le plan ; élevé si l'auteur veut la même profondeur que 6.1c) |

Après chaque livraison qui l'allume ou la retouche : le lien d'essai direct, `https://umbratech.fr/themist/index.html?gardien=5` (`&classe=lum|gou|her|tis`, `&temps=2|3`, `&palier=difficile&temps=4` pour la Dérive, `&attaque=traversee|contre|ressac|remous|gaffe|sillage|perche|passagers`, `&dieu=0`).

**Recommandation : ce découpage.** Étape immédiate : la validation de cette fiche, puis **6.2b-1 dans une autre conversation, Opus 5.5, élevé**.

---

## Tableau des recommandations

| Q | Sujet | Recommandation |
|---|---|---|
| Q26 | Identité | **La Passeuse**, qui menait les oubliés au Marais et a oublié l'autre rive ; bannière « Où dois-je te mener ? » ; codex `passeuse` |
| Q27 | Idée et habileté neuve | **le courant** (le déplacement subi, confirmé) : des biefs qui emportent les corps, des coups là où l'eau te mène |
| Q28 | Échelon | {3, 2, 2, 0,8, **3**} : l'entourage monte (un terrain qui agit) ; ligne V de Q25 caduque, préavis 0,8 s de V à IX ; VI à IX gardent chacun un cran à monter |
| Q29 | Règles du courant | grille 6 × 4 ; biefs en rangée ou colonne ; 70 / 80 / 90 px/s, jamais > 90 ; annonce 1,0 s ; durée 5 / 6 s ; corps oui, tirs non, elle non ; stable pendant un préavis (sauf Ressac annoncé) ; pas de 6 px ; sortie avec le courant ; aucun obstacle |
| Q30 | Attaques | Bief, Abordage, Ressac, Remous, Gaffe, Sillage, Coup de perche, Passagers ; la Traversée et les Contre-courants ; aucun couloir, aucun tir |
| Q31 | Files et rythme | trois files du cadrage de forme, plus la Dérive ; entractes du Guet ; elle enchaîne l'eau coulant encore |
| Q32 | Point faible et fenêtre | le nœud de l'amarre ; l'Échouage, sonnée 2 s quand l'eau retombe |
| Q33 | Temps de plus | **la Dérive** : le bord de la salle coule en boucle et ne s'arrête plus ; Échouage 1,5 s ; l'amarre rompue flotte |
| Q34 | Dessin | barque plate, perche en diagonale, capuchon sans visage, lentilles d'eau, amarre ; palette mesurée ; vert d'eau du courant, signal neuf ; sol `eauxmortes` ; glyphe ; entrée le long d'un bief, mort avec le dernier courant |
| Q35 | Distinctions | le sol bouge sous toi ; ni réserve ni forme lues |
| Q36 | Wiki, codex, journal | lecture, neuf lignes, temps de plus, journal sans son nom (à relire) |
| Q37 | Chiffres | PV par la règle (≈ 19 600 attendus) ; r 48 ; friction ≥ celle du Guet |
| Q38 | Exigences de 6.1c | les quatorze, chacune avec sa preuve au simulateur ou au banc |
| Q39 | Socle et propre | le courant dans le socle (`garSortieCourant`, poussée par pas, champ, bot), les gestes par gardien, le Guet inchangé au bit |
| Q40 | Découpage | 6.2b-1 socle du courant (Opus élevé), 6.2b-2 la Passeuse allumée (Sonnet élevé), 6.2c relecture (Opus moyen) |

## Risques

- **Le courant donne la nausée ou brouille la lecture** : il ne bouge ni la caméra ni rien d'autre que les corps ; les flèches sont sous les zones ; en mouvements réduits, rien ne glisse.
- **La sortie avec courant se trompe** : elle est vérifiée par un joueur simulé pas à pas, pas seulement par la recherche qui l'a trouvée ; sans courant, elle doit redonner exactement l'ancienne.
- **Une forme lente ne peut pas compenser** : le courant reste ≤ 0,5 × la vitesse de justice, en dessous de la vitesse à pied de toutes les formes ; ce que tu tiens toi-même (faisceau, Dévoration, Absolution) reste ton choix, annoncé.
- **Le bot compense trop bien** et la friction mesurée reste près de 1 (comme au Guet à distance) : la mesure en rend compte, l'auteur tranche ; jamais de PV en plus.
- **Le Ressac surprend** : les flèches du retour et la seconde case sont visibles dès l'annonce ; s'il se lit mal au banc, il passe au temps 3 seul ou se remplace par un second Abordage.
- **Le dessin dépasse 1,15 × r** (une barque est longue) : barque dans 2,2 × r, le reste sous le voile, mesuré sur le rendu complet.
- **La règle d'or du Guet** : tout le neuf du socle est inerte sans courant ; prouvé par le banc G contre la v18.16.

## Ce que cette fiche ne décide pas

Les PV exacts (mesurés au bot), les textes définitifs (relus par l'auteur), le décor des actes IV à IX hors des salles de gardien, l'équilibrage des formes contre les gardiens (action 7), les gardiens VI à IX et les miniboss.

**Pour valider : « toutes les recommandations », ou question par question (Q26 à Q40). Étape suivante : 6.2b-1, le socle du courant, Opus 5.5, élevé, dans une autre conversation.**


---

## Révision 1 · après l'essai de l'auteur (7 novembre 2026) — **à valider**

Rédigée avec Opus 5.5, effort élevé. Rien du jeu n'a changé pour l'écrire.

**Ce que l'auteur a dit, après avoir joué l'essai de 6.2b-1** : le boss est beaucoup trop simple. Les vagues sont une très bonne idée, mais elles ne sont pas assez présentes : une ligne, facile à esquiver, rien de spécial, et elle ne fait pas de dégâts. Il faut que la vague passe par des endroits complètement différents, beaucoup plus de difficulté, des capacités en synergie avec les vagues ; **les bords de la salle sont du vide, et le joueur qui y tombe est mort**.

**Le diagnostic** : l'essai n'avait que deux gestes, mais le défaut est dans la fiche elle-même. Même avec tout son jeu, ses courants restaient des bandes droites d'un mur à l'autre, une à la fois, inoffensives, et rien ne punissait celui qui se laissait porter, sauf une case orange qu'on voit venir. Le courant gênait ; il ne menaçait pas. La révision lui donne trois choses qui lui manquaient : **un endroit où il mène** (le vide), **un dessin qui change** (des motifs, pas une ligne) et **une vague qui frappe** (la Lame). Ses autres gestes sont refaits pour jouer avec eux.

Ce qui reste juste et ne change pas : l'identité (Q26), l'habileté (Q27, le courant), les règles de lecture (le courant ne dépasse jamais la moitié de ta vitesse, il s'annonce ≥ 0,8 s, il ne change pas pendant un préavis sans l'avoir annoncé, il avance par pas avec une collision à chaque pas, toute sortie se calcule avec lui), le socle de 6.2b-1 (qui sert tel quel : un champ est déjà une liste de cases, de n'importe quelle forme).

### Q41 · Le vide sur les bords

- **A. Une lisière de vide tout autour (recommandé).** La salle garde ses murs, mais le sol s'arrête avant eux : une **bande de vide de 64 px** sur les quatre côtés (le sol fait 1 040 × 456 px ; la grille des courants, 6 × 4 cases de ≈ 173 × 114 px, couvre le sol seulement). Le vide est **permanent et toujours visible** : une eau noire sans fond, un liseré de pierre pâle au bord du sol, rien qui bouge en mouvements réduits. Il n'a pas de préavis (il ne change pas), sauf quand il avance (la Marée, Q44).
- **B. Le vide sur deux côtés seulement** (les petits côtés, à gauche et à droite) : moins dur, mais la moitié des courants ne mèneraient nulle part.
- **C. Des trous dans la salle plutôt que des bords** : plus lisible au centre, mais c'est la dalle et les douves du Brumeux.

**Ce qui fait tomber** : le **centre de ton corps** passe au-dessus du vide **hors d'une esquive**. Une esquive passe au-dessus du vide (comme au-dessus d'une zone : elle ne frappe pas pendant `P.dashT`) ; si elle **finit** au-dessus du vide, tu tombes. Ce qui peut t'y mener : tes pas, et **le courant** (c'est le cœur du combat : tenir sa place près du bord). Ce qui ne t'y jette jamais : un coup. Le recul du contact, la poussée d'une Lame et la traction de la Gaffe **s'arrêtent au liseré** (« l'eau te jette au bord, pas dedans ») : aucune mort sans signe, et la mort par le vide ne vient que de ce que tu as laissé faire au courant.

**Ce que fait la chute** (décision de l'auteur) :
- **A. La mort, par la voie ordinaire (recommandé)** : la chute pose tes PV à zéro (`loseHp(P.hp)`), donc une relique ou un talent qui te sauve d'un coup mortel te sauve aussi d'une chute ; tu réapparais alors sur le sol le plus proche, 1 s intouchable. La mort se note « le vide » dans la chronique et la ligne de la mort (« emporté par les eaux mortes »).
- **B. La mort sèche** : rien ne te sauve, même ce qui sauve d'un coup mortel. Plus dur, mais un talent payé qui ne joue jamais ici serait une surprise sans signe.

Ses invoqués tombent aussi (ils meurent sans butin). Elle, jamais. Le bot évite le vide (sa sortie le compte interdit).

**Recommandation : A et A** (lisière de 64 px tout autour ; la chute tue par la voie ordinaire).

### Q42 · Les motifs du courant : « la vague passe par des endroits complètement différents »

Le courant ne coule plus seulement en bandes : elle choisit un **motif** à chaque fois (à graine, jamais deux fois le même de suite), dessiné sur la grille ; chaque case n'a toujours qu'un sens, d'une flèche.

| Motif | Ce qu'on voit | Ce qu'il fait |
|---|---|---|
| **Bief** | une rangée ou une colonne entière | l'ancien courant ; le plus simple |
| **Coude** | une bande qui tourne à angle droit (un L de 5 à 7 cases) | le passif finit loin de là où on l'attend |
| **Méandre** | un serpentin sur deux rangées (aller, puis retour) | on ne peut pas « se laisser porter » longtemps sans revenir sous elle |
| **Tourbillon** | un anneau de 8 cases qui tourne autour d'un carré de 2 × 2 cases calmes (l'œil) | on tourne autour d'elle ou d'une zone ; l'œil est l'abri |
| **Confluence** | deux bandes qui se rejoignent dans une case | tout ce qui flotte finit au même point : c'est là qu'elle frappe |
| **Fuite** | un bord entier de cases qui coule **vers le vide** (une rangée du bord, ou une colonne du bord) | tenir sa place ou tomber ; jamais avec une zone qui t'oblige à lâcher prise au même moment (voir la sortie) |
| **Cisaille** | deux rangées voisines de sens opposés | le contre-courant de la fiche, gardé |

**Présence** (la critique « pas assez présentes ») :
- **Temps 1** : un motif à la fois, mais **l'eau ne s'arrête presque jamais** : chaque motif coule 5 s, le suivant s'annonce pendant que le premier retombe (au plus 1 s de calme entre deux).
- **Temps 2** : **deux motifs à la fois**, qui ne se croisent pas (une case n'a qu'un sens) ; un sur trois est une Fuite.
- **Temps 3** : **le courant ne s'arrête plus** : un motif chasse l'autre ; le changement s'annonce **par les flèches du motif suivant, tracées en pointillé à côté des flèches pleines** 1,0 s avant (la règle du Ressac, généralisée) ; vitesse 90 px/s.
- **Toujours** : jamais plus de la moitié de ta vitesse ; jamais un changement de motif pendant le préavis d'une zone sans ce pointillé ; toute sortie se calcule sur le champ du moment, le vide compté interdit.

**Recommandation : ces sept motifs et cette présence.**

### Q43 · La vague qui frappe : la Lame

- **A. La Lame (recommandé)** : une crête d'eau parcourt un motif **dans le sens de son courant**, case après case : toutes les cases de son trajet sont cernées dès l'annonce, la première s'emplit d'orange (préavis 1,0 s), puis chaque case frappe à son tour, **0,22 s après la précédente** (une vague qui avance à ≈ 520 px/s le long d'un bief). Une case touchée : **18 %** des PV de référence et une **poussée de 70 px dans le sens du courant** (par pas, arrêtée au liseré). Pour l'éviter : sortir du trajet de côté, ou **remonter le courant** pour sortir par l'arrière avant qu'elle passe, ou **l'esquiver au moment où elle passe** (l'esquive passe à travers, comme toute zone). Le passif est puni deux fois : il est porté **vers** la crête.
- **B. Le courant lui-même fait des dégâts** (un peu à chaque seconde passée dedans) : simple, mais c'est de la difficulté par les dégâts, sans geste à lire ; écarté par la règle permanente.
- **C. Des vagues d'un mur à l'autre** (une bande qui balaie la salle entière) : impressionnant, mais un seul bon geste (l'esquive) et rien à lire du courant.

Sortie : une **séquence** de cases à des instants connus, calculée avec le courant (`garSortieSeq`, Q47) : il doit exister un chemin, à ta vitesse au sol, qui n'est dans aucune case **au moment où elle frappe**, sans passer par le vide. Une Lame sans sortie saute.

**Recommandation : A.**

### Q44 · Ses capacités, refaites pour jouer avec l'eau et le vide

Les formes restent les neuf connues ; les parts restent plafonnées à 30 %, les zones principales à 25 % ; aucun PV en plus.

| Geste | Forme | Ce qui se passe | En synergie avec | Préavis | Part | Temps |
|---|---|---|---|---|---|---|
| **Courant** (un motif, Q42) | cases de courant | s'annonce, coule, se change | tout | 1,0 s | — | 1 à 4 |
| **La Lame** (Q43) | cases en séquence | la crête suit le courant | le courant (elle va là où il porte) | 1,0 s, puis + 0,22 s par case | 18 % par case | 1 à 4 |
| **L'Abordage** | case | la case où le courant te mène, comme dans la fiche | le passif | 1,2 s (1,0 aux temps 3 et 4) | 25 % | 1 à 4 |
| **Le Ressac** | deux cases et un courant qui s'inverse | comme dans la fiche, flèches du retour en pointillé | le courant | 1,0 s puis + 0,6 s | 22 % par coup | 2 à 4 |
| **Le Reflux** | une Fuite et un disque | elle pose une Fuite (un bord coule vers le vide) **et** un disque (r 140) au milieu de la salle, loin du bord : il faut quitter le centre **et** tenir sa place près du bord ; la sortie existe toujours entre les deux (calculée) | le vide | 1,0 s | 22 % | 2 à 4 |
| **Le Remous** | anneau à brèche | ta case tourne (un petit tourbillon) et un anneau se referme ; la brèche est en aval : tiens le centre ou laisse-toi porter par la brèche | le courant | 1,0 s | 22 % | 1 à 4 |
| **La Gaffe** | cône, puis une traction | 110°, 0 à 170 px ; si elle te touche, son crochet **te tire de 110 px vers elle** (par pas, arrêté au liseré) : tu te retrouves dans son eau ; le bout de la gaffe trace la ligne de la traction pendant le préavis | le courant (elle te ramène dans son tourbillon) | 0,8 s | 16 % | 1 à 4 |
| **Le Coup de perche** | disque | 130 px autour d'elle si tu restes collé 2,5 s | — | 0,9 s | 18 % | 1 à 4 |
| **Les Passagers** | invocation | Rampants et Voilés montent de l'eau en amont d'un courant et dérivent avec lui ; **ils tombent dans le vide** (sans butin) : les attirer vers une Fuite est une réponse | le courant et le vide | 0,9 s | — | 2 à 4 |
| **La Marée** | cases qui deviennent vide | au temps 3 (une fois) et au temps 4 (une fois), **une rangée ou une colonne du bord du sol s'enfonce** : ses cases se fendillent et s'assombrissent 1,5 s (préavis), puis deviennent du vide, pour le reste du combat. Jamais deux côtés opposés (le sol garde au moins 3 × 2 cases) ; jamais là où tu te tiens au moment de l'annonce sans une sortie calculée ; jamais sous elle | le vide | 1,5 s | — | 3, 4 |
| **L'Échouage** | sa fenêtre | après une Lame qui a parcouru tout son trajet, sa perche reste prise : sonnée 2 s (1,5 au temps 4), anneau ivoire sur le nœud de l'amarre | la Lame | — | — | 1 à 4 |

Le Sillage de la fiche est retiré (une croix sans rapport avec l'eau). La Traversée devient « un motif, puis une Lame ou un Abordage ».

**Files** (mélangées, jamais deux fois la même de suite ; un courant coule presque toujours) :
- **Temps 1** : lame, abordage, remous, gaffe, lame, perche.
- **Temps 2** : lame, reflux, ressac, passagers, gaffe, lame, remous.
- **Temps 3** : marée (une fois, à l'entrée du temps), lame, ressac, reflux, gaffe, passagers, lame.
- **Temps 4, la Dérive** (Difficile et Extrême, sous 18 %) : marée (une fois), puis la file du temps 3 ; le tour du sol coule en boucle et ne s'arrête plus (la Dérive de la fiche) : avec le vide autour, chaque pas compte.

**Recommandation : ces gestes et ces files.**

### Q45 · L'échelon, avec le vide

Le vide est une contrainte de plus, présente tout le combat, en même temps que le courant et une zone : la fiche disait « contraintes 2 », ce n'est plus vrai.

- **A. {temps 3, contraintes 3, enchaînements 2, préavis 0,8, entourage 3} (recommandé)** : deux crans montent par rapport au Guet (contraintes et entourage). La Lame compte pour un coup (une crête à passer une fois), le Ressac pour deux. **Conséquence pour la suite**, vérifiée : VI enchaînements 3 ; VII temps 4 ; VIII **contraintes 4** (au lieu de 3) ; IX enchaînements 4. Les lignes VI et VII du tableau de Q25 se lisent « contraintes 3 » (aucun cran ne baisse).
- **B. Garder contraintes 2** en ne posant jamais de zone près du vide : le vide ne compterait que comme décor, et ce n'est pas ce qui a été demandé.

**Recommandation : A.**

### Q46 · Les chiffres

- PV : la règle de Q9, au bot, avec son vrai corps (≈ 19 600 attendus) ; aucune difficulté par les PV.
- **Friction visée** : nettement au-dessus du Guet (médiane au bot ≥ 1,2 ; durée ≈ 85 s) ; un combat où le bot meurt en Normal sans `dieu` est un signal à rapporter, pas un réglage à cacher.
- Vitesse du courant : 70 / 80 / 90 / 90 px/s (inchangé : au-delà, on ne peut plus tenir sa place à coup sûr).

### Q47 · Ce que le socle doit gagner (en plus de 6.2b-1)

| Où | Quoi |
|---|---|
| `/*gar:pur*/` | `garSol(R, marge)` (le sol et la lisière) ; `garVide(sol, cases tombées)` (les rectangles du vide) ; `garTombe(p, vides, dash)` (le centre au-dessus du vide, hors esquive) ; `garMotif(G, k, rng, o)` (les sept motifs, une case un sens, aucun croisement) ; **`garSortieCourant` gagne `o.interdits`** (le vide : bloqué, jamais une sortie ; sans `interdits`, exactement 6.2b-1) ; **`garSortieSeq(S, seq, p, o)`** (une suite de zones à des instants connus, le champ de chaque instant : la Lame, le Ressac, et `garSortie2` à champ) ; `garPassif` qui rend aussi « tombe à l'instant t » ; `garBorneLiseré(p, dx, dy, sol)` (une poussée ou une traction arrêtée au bord) |
| jeu, socle | le vide dessiné (eau noire, liseré pâle, rien qui bouge en mouvements réduits) ; la chute (après le pas et après la poussée, hors esquive) par `loseHp`, le relèvement au bord si quelque chose te sauve ; ses invoqués qui tombent ; la carte des chemins (`FF`) qui compte le vide comme bloqué et **`CAM.ff=1` à chaque Marée** ; la poussée d'un coup bornée au liseré ; le bot qui évite le vide ; la chronique (« le vide ») ; le journal (une chute est un coup `vide`, signé par le vide visible) |
| simulateur | les motifs (une case un sens, couverture, aucun croisement, jamais une Fuite avec une zone sans sortie) ; la sortie séquentielle atteinte par un joueur simulé pas à pas (et sa contre-épreuve) ; le vide jamais une sortie ; une poussée jamais au-delà du liseré |

Propre à elle : les gestes de Q44, la Marée, ses files, son dessin, sa salle à lisière.

### Q48 · Le nouveau découpage

| Étape | Contenu | Modèle, effort |
|---|---|---|
| **6.2b-1bis** | le socle du vide et des motifs (Q47), Passeuse **toujours éteinte**, essai à quatre gestes (motifs, Lame, Reflux, Marée) pour juger de la difficulté avant d'habiller ; règle d'or contre la v18.17 | **Opus 5.5, élevé** (des sorties neuves : séquence et vide) |
| — | **essai de l'auteur** : la difficulté est-elle là ? (un aller-retour court, avant le dessin) | — |
| **6.2b-2** | la Passeuse allumée (le reste de Q44, dessin, portraits, PV au bot, codex, wiki) | Sonnet 5.5, élevé |
| **6.2c** | relecture indépendante (aucune mort sans signe, surtout le vide et les poussées) | Opus 5.5, élevé (le vide tue : la même profondeur que 6.1c) |

### Tableau de la révision

| Q | Sujet | Recommandation |
|---|---|---|
| Q41 | Le vide | une lisière de 64 px tout autour ; on tombe si le centre passe le bord hors esquive ; un coup ne t'y jette jamais (arrêté au liseré) ; la chute tue par la voie ordinaire |
| Q42 | Les motifs | sept motifs (bief, coude, méandre, tourbillon, confluence, fuite, cisaille) ; l'eau coule presque tout le temps, deux motifs au temps 2, jamais d'arrêt au temps 3 |
| Q43 | La vague qui frappe | la Lame : une crête qui suit le courant, case après case, 18 % et une poussée par case |
| Q44 | Les capacités | Lame, Abordage, Ressac, Reflux, Remous, Gaffe qui tire, Coup de perche, Passagers qui tombent, Marée, Échouage ; Sillage retiré |
| Q45 | L'échelon | {3, 3, 2, 0,8, 3} ; VIII passe à contraintes 4 |
| Q46 | Les chiffres | PV par la règle ; friction ≥ 1,2 au bot |
| Q47 | Le socle | vide, motifs, sortie séquentielle, poussées bornées, `FF` et Marée |
| Q48 | Découpage | 6.2b-1bis (Opus élevé), essai de l'auteur, 6.2b-2, 6.2c (Opus élevé) |
