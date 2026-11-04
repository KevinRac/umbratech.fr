# La Brume · v18.5 « Le Brumeux » · action 5e · fiche courte de la phase IV, « L'Emprunt »

Statut : **validée le 3 novembre 2026 (toute la fiche : recommandations, les quinze écarts au cadrage, les choix recommandés, et les 11 écarts d'implémentation de 5d) ; faite le 4 novembre 2026 (v18.9, Opus 5.5, élevé, en une fois ; `_dev/memoire.md` § 39, avec ses écarts d'implémentation à valider).** Soumise à l'auteur le 3 novembre 2026. Rédigée à partir du cadrage validé (Q1, Q2, Q6, Q8 à Q15, Q17), des fiches 5b, 5c et 5d (modèle de forme), de `_dev/memoire.md` § 27 (Dernier Souvenir), § 28 (némésis), § 34 (arène), § 35 à § 38 (socle, phases I à III, écarts et points ouverts), et du code actuel : `data/brumeux.js` (`phases[3]` d'essai, `elements`, `budget`, `cumul`, `dessin.r.sol` 48), `data/arene.js` (états 0 à 5), `data/souvenirs.js` (`familles`, `dernier`), `data/souvenirs-brume.js` (`justice`, `familles`, `variantes`, `renforts`, `talents`), `data/talents.js` (genres) ; dans `index.html` : bloc « v17 · La Mémoire » (`RUN.memoire`, `M.actifs`, `burn`, `DS_COURS`, `dsPlafond`, `fortE`, `embraser`, `dsHit`), bloc du Masqué (`/*sb:pur*/` : `sbCharge`, `sbPlacer`, `sbForce`, `sbPlafond`, `sbMaj` ; le Reflet du Glas), bloc v18.4 (juge, transformation), bloc v18.5 et ses sections v18.6 à v18.8 (`vers`, `brxFiltreBornes`, `versCons`, `decoudre`, présence `sol`).

Ce qu'il faut savoir du code avant de lire :
- **Les talents portés** sont `RUN.memoire.actifs` (`M.actifs`) : `{id, src:'t', rang, g, depuis, repris?, trophee?, nem?}` ; au plus 10. Chacun a une famille (`souvenirs.js`, `familles.*.t` : les 240 talents en ont une) et un classement d'arme de la Brume (`souvenirs-brume.js`, `talents`) : **169 la famille telle quelle, 47 une variante, 24 un renfort**. Variantes rencontrées : `double` 19, `elargi` 11, `traverse` 7, `etourdit` 7, `repousse` 2, `vol` 1.
- **Genres** (`talents.js`) : mineur `m` (63), compétence `s` (57), majeur `x` (72), nœud clé `k` (36, dont les 12 ultimes `*_sk`), sous-classe `c` (12). La némésis exclut déjà le genre `c` (`assemble.nemesis.souvenir.exclus`), le Dernier Souvenir aussi (`dernier.interdits`).
- **Une arme de la Brume** est une attaque de 1 à 3 étapes, chacune une zone d'une des neuf formes ; chargements `chargeS` 0,5 à 0,8 s à l'acte I, × 0,9 par acte (à la registre III : × 0,81) ; dégâts d'étape `degats` × dégâts du porteur (0,75 à 1,3), attaque entière ≤ `degatsMax` 3,6 ×, force sous `sbPlafond`. La justice (`justice.arene` : 56, 92, 1 224, 676) vérifie tout dans **une salle de 1 168 × 584**. Sur le Masqué, ses zones sont rouges (`assemble.couleurs`) ; l'icône de la famille, au-dessus du porteur, est cerclée de lavande. Le Glas fait déjà jouer une arme de la Brume à un **porteur fantôme** hors d'`enemies` (le Reflet), par `sbMaj`, avec la même justice.
- **Le Dernier Souvenir** : `burn(a)` retire le talent (ni mémoire ni réserve), lance `embraser(rec)` ; contre un fort (`fortE` : `type:'boss'` ou `e.asm`), ses coups passent sous un plafond `dsPlafond` = min(0,04 × force, 0,08) × **`e.maxHp`**. Une braise par acte. Le Brumeux est `type:'boss'` et son `e.maxHp` est **la somme de ses cinq phases** (10 800 en Normal) : une brûlure peut aujourd'hui lui ôter 432 à 864 PV, soit 18 à 36 % d'une phase de 2 400.
- **Les neuf formes sont déjà toutes prises** par les gestes signature des phases I à III : rayons, anneau à brèche, damier (I) ; couloir, croix, cône (II) ; losanges, disque, projectile (III). La consigne « des formes pas encore prises » ne peut donc pas être tenue telle quelle (écart 1, § 1).
- **En phase IV d'essai** (5a) : présence `sol` (`dessin.r.sol` 48, téléporté au centre, jamais sur toi), point faible `coeur`, état d'arène d'essai 1 (resserré), partition d'essai ; à l'entrée, `brxFiltreBornes` garde les constructions entières dans les bornes (connexité revérifiée) ; les Masqués cousus se décousent (5d).

---

## 1 · Gestes signature (socle, toujours les mêmes)

Aucune forme n'est libre. Ce qui est neuf en phase IV, c'est **l'origine** : pour la première fois, il est au sol, et ses gestes partent **de son corps**. Les trois gestes reprennent les trois formes dont l'usage des phases I à III est le plus loin de celui-ci (un cône au contact au lieu d'un cône lancé de haut ; un couloir que son corps parcourt au lieu d'une main ; un anneau autour de lui au lieu d'autour de toi), et chacun ouvre une sortie qui n'existait pas tant qu'il était au-dessus de l'arène : **derrière lui, contre lui**.

| Geste (nom jamais affiché) | Forme (reprise) | Où | Préavis | Dégâts avant montée |
|---|---|---|---|---|
| **La Passe** | couloir de 96 px (son diamètre), de son corps vers toi et au-delà, jusqu'au bord de l'arène (900 au plus) ; **son corps le parcourt** en 0,45 s après la charge | depuis son corps | 1,1 s | 14 |
| **La Révérence** | cône de 150°, de 0 à 190 px de son centre, vers toi ; il s'approche d'abord à 0,8 × 190 = 152 px (règle `atteinte` du Masqué), 2 s au plus, puis renonce (mesure sautée, comptée) | sur lui | 0,9 s | 13 |
| **La Volte** | anneau à brèche fixe autour de lui : r0 70 → r1 380, brèche de 120 px, orientée à graine | sur lui | 1,1 s | 12 |
| **La feinte** (fil rouge v14) | disque vrai ou faux, r 86 | sur toi | 1,15 s (jugée à 0,6 s, règle v14) | celle de la feinte |

- **Deux sorties lisibles par geste au moins :**
  - la Passe : **de côté** (48 + ton rayon + 4 px, soit ≈ 66 px de l'axe), ou **derrière une construction** restée debout ;
  - la Révérence : **derrière lui ou sur ses flancs** (hors des 150°), ou **reculer** au-delà de 190 px ;
  - la Volte : **contre lui** (à moins de 70 px de son centre), **par la brèche**, ou **au-delà de 380 px** ;
  - la feinte : comme partout.
- **La Passe et les constructions** (Q4, « sa propre ruée ») : le couloir est coupé au premier pilier qui arrête un tir (`brxCoupe`, jamais une fosse), tracé jusqu'à lui seulement ; son corps s'y brise : **sonné 2 s** (`vuln`, anneau ivoire sur son cœur), la construction perd un palier de fissure. Même règle que la Ruée de 5c, appliquée au corps.
- Tous orange `TELE.zone`. Première rencontre : +0,3 s (`brxPreavis`).
- Ils deviennent des éléments de `data/brumeux.js` marqués `fixe:true` : jamais tirés dans une mesure libre, jamais `premier` (règle 5b). Mort par un geste signature : préavis normal, il est déjà au socle.
- **Pas de dégâts de contact** : son corps te repousse (collision) mais ne blesse pas ; il ne blesse que par ce qu'il annonce (écart 11).
- Moteur : rien de neuf dans `brxDans` (couloir, cône, anneau à brèche y sont) ; la Passe est `brxRuee` avec une origine au corps et une largeur de 2 r ; la Révérence prend l'approche de `sbPortee` ; la Volte, la brèche de l'anneau (5b).

**Recommandation : ces trois gestes et la feinte**, formes reprises avec une origine neuve (écart 1). Dégâts dans la fourchette 10 à 14, recalés en 5g et à l'action 7.

## 2 · Partition chiffrée (`partition.emprunt`)

| # | Mesure | Nature | Durée indicative |
|---|---|---|---|
| 1 | **Emprunt** | fixe (ce qu'il emprunte est lu, § 3) | ≈ 5,5 s (prise 0,6 + attaque 2,5 à 3,2 + à nu 2,0) |
| 2 | La Passe | fixe | 1,6 s (charge 1,1, course 0,45) |
| 3 | mesure libre | libre (budget 6 / 7,5 / 9) | ~1,5 s |
| 4 | **Emprunt** | fixe | ≈ 5,5 s |
| 5 | La feinte | fixe | 1,2 s |
| 6 | La Révérence | fixe | 1,3 s (plus l'approche, 2 s au plus) |
| 7 | **Emprunt** | fixe | ≈ 5,5 s |
| 8 | La Volte | fixe | 1,4 s |
| 9 | mesure libre | libre | ~1,5 s |

- **Entracte** : **1,2 s** (1,4 en I à III : le duel se joue plus serré, dans une arène quatre fois plus petite) (écart 14). **À nu après la boucle : 0** (`nuS`) : les fenêtres suivent chaque emprunt, comme celles de la phase I suivent chaque tableau (écart 13). `sauteS` 0,6.
- **Boucle ≈ 36 s** (mesures ≈ 25 s, neuf entractes 10,8 s) ; la phase dure environ **1,7 boucle** (cible 50 à 70 s, Q11), plus les fenêtres qu'on provoque.
- **Fenêtres à nu** :
  - après chaque emprunt, il est **épuisé** : **2,0 s** (au socle : 6 s par boucle, comme le Glas après ses Faisceaux) ;
  - une Passe brisée sur une construction : **2 s** (sonné) ;
  - un emprunt **défait** par le Dernier Souvenir : **4,0 s** au lieu de 2,0 (§ 4).
- **Pendant un emprunt**, il ne lance rien d'autre (une zone à la fois) ; il marche (§ 5) mais ne frappe que par sa copie.
- **Mesures qui sautent** (comptées, entracte réduit à 0,6 s) : un emprunt quand aucun talent porté n'est empruntable (§ 3), une Révérence qui renonce, un geste sans sortie.
- **Mesures libres** : les éléments de 5a (disque, couloir, pluie, anneau, tir, rafale), pondérés par la lecture ; ni bâtir, ni effondrement, ni Couture.

**Recommandation : cette partition.**

## 3 · L'emprunt : il joue ce que tu portes (Q6, option a)

**Ce qu'il peut emprunter** (un « empruntable ») : un talent porté (`M.actifs`, `src:'t'`), **sauf** :

| Exclu | Combien | Pourquoi |
|---|---|---|
| les **ultimes** (`*_sk`) | 12 | consigne : ce que tu as de plus grand reste à toi |
| les **sous-classes** (genre `c`) | 12 | ta voie, c'est toi : la némésis et le Dernier Souvenir les excluent déjà |
| les talents classés **renfort** | 24 | une copie qui ne serait qu'un chiffre (PV, armure) est invisible, et un renfort de PV serait un mur de PV |
| les **reliques** (`src:'r'`) | — | hors mémoire, comme partout |

Reste au plus 10 talents portés, en pratique 4 à 9. Le talent **reste à toi** : rien ne s'éteint, rien ne se recalcule (l'option (b) du cadrage est écartée).

**Ce qu'il en fait** : l'**arme de la Brume de la famille** du talent (`souvenirs-brume.js`, `familles.<famille>.etapes`), telle que le classement la donne, avec ces règles :
- **variantes gardées** : `double` (19 talents) et `elargi` (11) ; elles changent la forme sans rien casser ;
- **variantes ignorées** (la famille est jouée telle quelle) : `etourdit` et `repousse` (des contrôles sur toi), `vol` (il se soignerait : un mur de PV), `traverse` (ses tirs passeraient à travers ce que tu as laissé debout : Q9.3 dit que les murs arrêtent les tirs) ;
- **porteur** : un **porteur fantôme** collé à son corps, hors d'`enemies`, mené par `sbMaj` (le modèle du Reflet du Glas) ; son corps bloque les sorties (`sbOrigine`) ; une étape `sur:'lui'` part de son centre ; une étape de Ruée (`Aller-retour`) déplace son corps avec le porteur, de 2 r de large, et s'arrête sur une construction (sonné 2 s, comme la Passe) ;
- **chargement** : jamais sous **0,8 s** (le préavis du boss), **+0,3 s** à la première rencontre de cette famille empruntée dans la sauvegarde (élément `emprunt:<famille>` dans `SAVE.brumeux.vus`) ; à la registre III, `sbCharge` donne 0,40 à 0,65 s : en pratique, **toutes ses étapes chargent 0,8 s** (écart 4) ;
- **dégâts** : dégâts du porteur fixés pour qu'une étape ×1,0 fasse **11** (échelle d'acte comprise) : étapes de **8 à 14** ; force par rang et gravure **comme le Masqué** (`assemble.souvenir.parRang` 0,15, `parGravure` 0,15, `sbForce`), attaque entière sous `sbPlafond` (**≤ 3,6 × 11 ≈ 40**) ; jamais de dégâts en plus selon le palier ;
- **justice** : `sbPlacer` cherche la sortie de chaque étape à ta vitesse et à ton rayon (`pMarche`, `sbOrigine` → `o.pr`), dans la vue sûre de l'arène (`CAM.sbAr`) et avec les constructions debout ; une étape sans sortie **saute** ; une seule zone à la fois ; une étape au contact attend `atteinte` (0,8) et renonce après `attenteS` (2 s), comme le Masqué. La salle du duel fait **1 168 × 584** (§ 5) : la taille même où `sim-brume` prouve déjà la justice de chaque famille.

**Comment cela se voit** (image d'abord, aucun texte) :
1. **La prise (0,6 s)** : il tourne son masque vers toi ; un fil lavande part de sa main vers ton héros et se retire (dessin seulement, rien ne te touche) ; au-dessus de lui paraît **l'icône de la famille cerclée de lavande** (celle du Masqué porteur) ; dans ton HUD, **la tuile du talent emprunté** prend un liseré lavande (comme la désignation du Dernier Souvenir prend un liseré de braise) : tu sais exactement ce qu'il te prend, et quelle tuile désigner.
2. **L'attaque** : ses zones sont **orange `TELE.zone`** (c'est lui qui frappe, jugé au préavis du boss), cernées d'un **liseré lavande de 2 px** (c'est un souvenir) (écart 3) ; la barre de chargement de l'étape sous l'icône, comme au Masqué.
3. **L'épuisement (2,0 s)** : son masque se ternit, l'icône s'éteint, l'anneau ivoire paraît sur son cœur ; le liseré de la tuile s'efface.
- **Son masque**, toute la phase : **à la couleur et à l'emblème de ta forme** (`G27.copie()`, avec ses exceptions pour le Lumenarque et le Héraut, `masqueCopie`, `embleme`).
- Mouvements réduits : le fil apparaît et disparaît en fondu, le liseré de la tuile ne palpite pas, le masque ne tremble pas.

**Ce qu'il choisit** (tirage à graine `desRng`, relu à chaque boucle) :
- **poids** d'un empruntable = (0,5 + rang / rang max) × (1 + 5 × gravures) ;
- **trois emprunts par boucle, sans remise** tant qu'il reste des empruntables ; jamais deux fois de suite la même famille s'il en reste une autre ;
- ordre de grandeur, face à neuf talents au rang max : un talent **gravé une fois** est joué dans **≈ 82 %** des boucles, **deux fois** dans **≈ 93 %** (« un talent gravé est presque sûr d'être joué », Q6) ;
- **le premier emprunt de la phase** rejoue le talent qui t'a tué la dernière fois en IV (§ 7), s'il est encore porté et empruntable ;
- **aucun empruntable** (cas rare : mémoire faite d'ultimes, de sous-classes et de renforts) : chaque emprunt saute, la phase se joue sur ses gestes et ses mesures libres.

**Recommandation : cet emprunt, ces exclusions, cette image et ce tirage.**

## 4 · Le lien au Dernier Souvenir

**Quand** : de la prise jusqu'au coup de sa dernière étape, le talent est « en train d'être emprunté ». Si tu **brûles ce talent** (X maintenue 0,35 s, désigné, braise de l'acte X disponible) :
- **sa copie se défait** : la zone qui charge se dissout en braises en 0,3 s **sans frapper**, les étapes suivantes sont annulées, l'icône au-dessus de lui s'embrase et tombe, son masque se fend d'un trait de braise (dessin) ;
- il reste **à nu 4,0 s** au lieu de 2,0 (anneau ivoire sur son cœur, ×1,5 comme toujours) ;
- **l'embrasement de ta brûlure** (`embraser`) joue normalement sur lui, en fort : valeurs `vf`, sans contrôle, sous le plafond ;
- le talent brûlé n'est plus porté : il ne sera plus jamais emprunté (pas d'autre règle à écrire) ;
- son court de braise brisée (`sfx('brule')` existe), un rire étranglé.

**Rien ne l'explique** (secret) : ni wiki, ni journal, ni bulle. Ce qui le rend découvrable : la tuile au liseré lavande est celle-là même qu'on désigne.

**Chiffres et plafond** :
- Le plafond actuel se calcule sur `e.maxHp` (la somme des cinq phases : 10 800 en Normal et Difficile, 12 000 en Extrême) : une brûlure ôterait **432 à 864 PV** (4 à 8 %), soit **18 à 36 % d'une phase** de 2 400 ; contre un gardien de l'acte III (3 600 PV, une seule barre), c'est 4 à 8 % du combat.
- **Proposition** : contre le Brumeux, le plafond se calcule sur **les PV de la phase en cours** : **96 à 192 PV** (4 à 8 % d'une phase), c'est-à-dire la même part d'un combat qu'un gardien de l'acte III, rapportée à la phase. Une retouche du crochet : `dsPlafond(DS, force, e.pvPlaf18 || e.maxHp)`, où `e.pvPlaf18` n'existe que sur le Brumeux ; inerte hors de son combat, valable pour ses cinq phases (écart 6).
- La brûlure garde son invulnérabilité de 0,5 s, sa braise unique par acte (si tu l'as dépensée sur un miniboss de l'acte X, le lien n'existe pas pour ce combat : c'est voulu), et le verrou de phase (un coup au-delà du seuil s'y arrête).
- Ce que rapporte la défaite d'une copie : 2 s de fenêtre de plus, soit ≈ 3 à 5 % de la phase au rythme du bot (à mesurer en L-D) ; plus l'effet de la brûlure, sous 4 à 8 % de la phase.

**Recommandation : ce lien, ces chiffres, et le plafond calculé sur la phase.**

## 5 · Le corps, la présence, l'état d'arène, les constructions

**Corps** (Q10) : entier au sol, à l'échelle d'un gardien : **r 48** (`dessin.r.sol`, déjà en 5a), corps plein dans **1,15 × r = 55 px**, manteau et brume au-delà sous 35 % d'opacité, `e.fade` sur tout ce qui se dessine à sa position, lumières par `ECR()`, cache par état (`G27`). Silhouette encapuchonnée de son portrait (`BRX_SVG`), deux yeux pâles derrière **le masque à ta forme** ; sa croix de manipulation pend à sa ceinture, ses fils traînent au sol (souvenir des phases I à III).
- **Point faible** : **son cœur sous le capuchon** (à 0,25 × r au-dessus de son centre), `G27.anneau`, seulement à nu. L'entité frappable est son corps (`e.x`, `e.y`) ; plus de décalage `croixDy`.
- **Il marche** : 120 px/s, il garde 180 à 280 px de toi entre deux mesures ; il s'approche pour la Révérence et les étapes au contact (§ 1, § 3) ; il ne marche jamais dans une fosse, ne pousse jamais une construction.

**Présence** : il est **au sol** (5a), visible tout le duel (caméra fixe, § ci-dessous) : plus de signe de bord pour lui en IV.

**État d'arène réel de la phase IV** (`data/arene.js`), **ajouté en septième position (index 6)** ; les états 0 à 5 gardent leurs places (`banc-arene` A et C, phases I à III). Seule la phase IV pointe vers lui (`phases[3].arene:6`).

```js
{id:'emprunt',tard:true,bornes:{fx0:0.2614,fy0:0.1907,fx1:0.7386,fy1:0.8093},sol:'pierre',
 obstacles:[],vides:[],brume:[{fx:0.13,fy:0.5,r:300,a:0.2},{fx:0.87,fy:0.5,r:300,a:0.2}]}
```

- Bornes : (0,7386 − 0,2614) × 2 448 = **1 168 px**, (0,8093 − 0,1907) × 944 = **584 px** : exactement l'arène d'une salle ordinaire d'un écran (et celle de la justice des armes de la Brume). Avec ses murs, la vue entière : la **caméra se fixe** (limites plus étroites que l'écran : `arPas` centre et fige), le duel se joue sans signe de bord.
- **Ni obstacle ni fosse** : l'abri, c'est ce qui reste de ses constructions.
- Sol **`pierre`** (existant) : il tranche avec la cendre du chantier des phases II et III, et dit sans texte qu'on est ailleurs. Alternative : `cendre` (le chantier continue). **Recommandation : `pierre`.**
- Brume de décor sur les côtés, **hors des bornes** : la brume reprend ce qu'il a lâché ; elle ne couvre jamais l'aire du duel.
- **`tard:true`** : peint une tuile par image pendant la phase III ; `vers()` finit ce qui manquerait.

**Ce qui reste des constructions** (5c § 8) :
- `brxFiltreBornes` garde celles qui tiennent **entières** dans les bornes de l'état IV, revérifie la connexité (≥ 85 %), et retire d'abord les plus éloignées du centre ;
- **en plus**, elles ne couvrent pas plus de **30 % de l'aire libre de l'état IV** (la règle Q9.2 valait sur l'arène pleine ; une salle quatre fois plus petite garderait sinon un labyrinthe) : au-delà, retrait des plus éloignées du centre (écart 10) ;
- celles qui restent gardent **leurs mécanismes** (passerelles, cloche, puits, échafaudage à −40 %) et leurs règles de 5c ; la Passe et une Ruée empruntée s'y brisent ;
- ordre de grandeur attendu : 0 à 3 constructions (murailles et colonnades proches du centre, un puits ; un échafaudage presque jamais, il est bâti dans le tiers le plus loin) ; L-D le comptera.

**Recommandation : ce corps, cet état en index 6, et ce filtre.**

## 6 · Paliers, lecture, budget, non-cumul

**Paliers** (Q12 : jamais de PV ni de dégâts en plus) :

| | Normal | Difficile | Extrême |
|---|---|---|---|
| Socle (trois emprunts, trois gestes, feinte, à nu) | identique | identique | identique |
| Budget d'une mesure libre | 6 | 7,5 | 9 |
| Variantes empruntées (`double`, `elargi`) | oui | oui | oui |
| Préavis | grammaire | identique | identique (jamais plus court) |

Les variantes sont à toi (ton talent), pas au palier : elles jouent partout.

**La lecture** (Q2 : une relecture à l'entrée de la phase ; son regard passe sur ton héros, puis son petit rire, sans texte) :

| Ce qu'il lit | Ce qu'il en fait en phase IV |
|---|---|
| tes talents portés (rang, gravures) | les poids des emprunts (§ 3) |
| ce qui t'a tué à la phase IV la dernière fois | le premier emprunt (§ 7) |
| ton profil (six axes), les verdicts des contre-mesures, `RUN.par18` | les poids des mesures libres (5a, inchangé) |
| ta réserve, ta némésis | **rien** : la phase III jouait ce que tu as oublié, la IV joue ce que tu portes |

**Budget et non-cumul** :
- un emprunt est une source `emprunt` (`cumul.emprunt:1`) : jamais deux zones à la fois au contact du joueur ; ses gestes et ses mesures libres attendent la fin de l'emprunt ;
- une famille à projectiles (Rafale, Navette, Aube) compte comme **une source de tir** dans le non-cumul (au plus deux) ;
- les mécanismes des constructions restantes (cloche, passerelles, puits) gardent leurs règles de 5c, hors budget ; la sortie garantie tient compte des zones en cours ;
- l'emprunt ne compte pas dans le budget d'une mesure libre (il est au socle).

**Recommandation : ces paliers, cette lecture et ce budget.**

## 7 · `SAVE.brumeux` et « ce qui t'a tué »

- Reste **v:1**. Nouveaux éléments qu'on peut y noter : `emprunt` (sa copie de l'un de tes talents), `passe`, `reverence`, `volte`.
- **Un seul champ facultatif**, `emp:{4:{id, fam}}` (l'id du talent dont la copie t'a tué, sa famille), écrit **seulement** quand `mort[4]` vaut `emprunt`, validé par `brxLireSauve` (id en chaîne courte, famille connue de `souvenirs-brume.js`), effacé quand une autre mort le remplace (même schéma que `tab`, `bati`, `cousu`).
- Au combat suivant, le **premier emprunt** de la phase IV rejoue :
  1. ce talent, s'il est porté et empruntable ;
  2. sinon un autre talent porté et empruntable **de la même famille** (le plus haut en poids) ;
  3. sinon rien de particulier (tirage ordinaire).
- Une mort par un geste signature ou une mesure libre ne change rien au socle (règle 5b). Une descente d'essai n'écrit rien.

**Recommandation : ce champ, et lui seul.**

## 8 · Transitions

**III → IV** (≈ 4,4 s, jamais une pause : verrou 1,2 s à 15 %, cri, transformation vers l'état 6, relecture) :
- 5d, inchangé : les montages s'arrêtent, les Masqués cousus et les corps suspendus se décousent (sans récompense ni promotion ; la némésis décousue garde sa fiche), les bouts de fils tombent ;
- **il descend** : ses fils se tendent une dernière fois puis lâchent, il tombe au centre des nouvelles bornes (0,8 s ; en mouvements réduits, fondu), **à 200 px de toi au moins** sur un point relié à toi (jamais sur une île de douve, jamais dans une construction) ; son masque se pose à ta couleur ;
- l'arène se resserre : les bornes avancent de **640 px** de chaque côté ; à la vitesse de l'arène (120 px/s), la bascule prendrait **5,3 s**. **Proposition : 240 px/s pour cette transition** (2,7 s, plus l'annonce de 1,2 s) (écart 9) ; tu es poussé sans dégât, comme toute créature ;
- les constructions sont filtrées pendant l'annonce (§ 5) ; elles s'effacent en brume, sans dégât ;
- pendant l'annonce et la bascule, il ne lance rien (règle de l'arène) ; on peut le frapper (pas à nu).

**IV → V** (la fiche 5f décidera l'état V et ce qui tombe) :
- un emprunt en cours s'arrête : zone dissoute sans frapper, icône éteinte, liseré de la tuile effacé, **sans fenêtre à nu** ;
- **le masque reste** : en V, il joue « un emprunt » parmi ses gestes (Q7) ; il ne puise que dans **ce que la phase IV a déjà montré** : `X.emp.joues` (familles et talents empruntés pendant la phase) est gardé pour 5f ;
- les constructions restantes passent à 5f (effondrées, Q7) ;
- un talent brûlé en IV n'est plus là pour V (rien à écrire).

**Recommandation : ces transitions.**

## 9 · Règles transverses

- **Aucun coup sans signe** : ses trois gestes et la feinte sont des sources de signe du Brumeux, jugées au préavis du boss (0,8 s) ; **chaque étape d'un emprunt** est une source de signe à part entière (`emprunt:<famille>`), jugée au même préavis ; les tirs d'un emprunt héritent du signe de leur porteur (bloc v18.4, 5d) ; sa marche ne blesse pas.
- **Toujours une sortie** : chaque geste passe par `brxPlacer`, chaque étape par `sbPlacer` (avec les constructions debout et son corps) ; sinon elle saute, comptée.
- **Image d'abord** : ni bulle ni fenêtre ; l'emprunt se lit à l'icône au-dessus de lui, au liseré de ta tuile, au masque à ta forme.
- **Mouvements réduits** : chute en fondu, ni fil qui ondule, ni masque qui tremble, ni tuile qui palpite ; la copie défaite se dissout en fondu au lieu d'éclater en braises.
- **Dessin** vectoriel au canevas, `dessin.version` 4 → 5 : corps entier au sol (capuchon, manteau, yeux, masque à ta forme et emblème), croix à la ceinture, fils au sol, cœur et anneau, prise (fil lavande), épuisement (masque terni), copie défaite (fêlure de braise), chute de la transition. Glyphe et portrait : rien (portrait à 5g).
- **Coût de rendu** : ≤ +1,5 ms en mesure appariée (son corps, une copie en cours, trois constructions restantes, contre le fantôme d'essai à foule égale) ; corps cuit par état et par fondu (`G27`), masque cuit une fois à l'entrée de la phase ; peinture de l'état 6 une tuile par image en phase III.
- **Secret** : le wiki et le journal ne disent rien des phases ni de ce qu'il emprunte ; ligne de journal proposée pour la v18.9 : « Préparation du combat final : le Brumeux répète en coulisses. Il ne t'attend pas encore au fond : rien ne change en jeu. » (à choisir par l'auteur) ; le simulateur vérifie qu'elle ne nomme ni emprunt, ni copie, ni phase, ni masque.
- **Règle d'or** : l'arène reste éteinte (`actif:false`), le boss final provisoire garde sa place ; les retouches hors du bloc (plafond du Dernier Souvenir, marque de la tuile au HUD, porteur fantôme dans le bloc du Masqué) sont **inertes hors du combat du Brumeux**, au bit et à l'image près.

## 10 · Ce que l'implémentation devra prouver

**`sim-brumeux`, section 13** :

| Vérification | Détail |
|---|---|
| Données | gestes et leurs chiffres ; `partition.emprunt` (boucle de 34 à 38 s, trois emprunts, `nuS` 0, entracte 1,2) ; bloc `emprunt` (exclusions, variantes gardées et ignorées, poids, plancher 0,8, dégâts 11, à nu 2 / 4, prise 0,6) ; état `emprunt` en index 6, `tard`, bornes = 1 168 × 584 ; états 0 à 5 inchangés (empreintes) |
| Empruntables | sur les 240 talents : ultimes, sous-classes, renforts exclus (exactement 12, 12, 24 ; recoupements comptés une fois) ; chaque empruntable a une famille et une arme ; variantes `etourdit`, `repousse`, `vol`, `traverse` jamais jouées, `double` et `elargi` gardées |
| Tirage | 10 000 boucles à graine : déterministe ; trois emprunts sans remise ; jamais deux fois de suite la même famille quand il en reste une autre ; fréquences contre les poids (gravé une fois ≈ 82 %, deux fois ≈ 93 % dans le cas de référence) ; mémoire sans empruntable : trois emprunts sautés |
| Justice | chaque famille (14), chaque variante gardée, sur 10 000 positions dans les bornes de l'état IV, avec et sans constructions, son corps comme obstacle : chaque étape a une sortie libre atteinte à pied à temps, ou saute ; chargements ≥ 0,8 s (≥ 1,1 s à la première rencontre) ; attaque ≤ 3,6 × 11 |
| Gestes | Passe (coupée au premier pilier qui arrête un tir, jamais par une fosse ; sonné), Révérence (abri derrière lui, approche et renoncement), Volte (contre lui, brèche, au-delà) : 10 000 positions chacun, sortie libre atteinte à temps |
| Dernier Souvenir | plafond calculé sur la phase (96 à 192 PV en Normal), inchangé pour tout autre fort ; défaite : zone sans coup, étapes annulées, à nu 4,0 s ; talent brûlé jamais réemprunté |
| Constructions | 10 000 phases abstraites : filtre des bornes, connexité ≥ 85 %, aire ≤ 30 % de l'état IV, retrait des plus éloignées d'abord |
| Sauvegarde `emp` | écrite, relue, effacée, invalide ignorée, essai muet ; premier emprunt : le talent, sinon la famille, sinon rien |
| Branchements | ni `Math.random`, ni `setRule`, ni `murmur`, ni `showCard` dans la section v18.9 ; la retouche du plafond inerte hors du Brumeux ; journal sans un mot des phases |

Contre-épreuves (une erreur introduite exprès, qui doit être attrapée) : un ultime empruntable ; la variante `etourdit` jouée ; une étape chargée à 0,6 s ; un renfort emprunté ; deux fois de suite la même famille ; un plafond calculé sur `e.maxHp` pour le Brumeux ; une défaite qui laisse frapper la zone ; un état 5 déplacé ; `emp` invalide accepté ; une Passe qui traverse une construction.

**`banc-brumeux`, section L** :

| Section | Vérification |
|---|---|
| L-A | lecture, poids, tirage et premier emprunt en jeu égaux à la logique pure (même graine, mêmes talents portés) |
| L-B | corps au sol (r 48, plein dans 1,15 × r, frappable au corps, anneau sur le cœur à nu) ; caméra fixe, bornes de l'état 6 ; les trois gestes et leurs sorties (abri derrière une construction, derrière lui, contre lui) ; Passe brisée → sonné 2 s ; emprunt : prise, icône, liseré de la tuile, zones orange au liseré lavande, chargement ≥ 0,8 s, épuisé → à nu 2,0 s ; variantes ignorées ; mémoire sans empruntable → emprunts sautés ; III → IV (décousus, chute à 200 px au moins, bascule à 240 px/s, constructions filtrées) ; IV → V (copie arrêtée sans fenêtre, masque gardé, `X.emp.joues` transmis) |
| L-C | Dernier Souvenir (par la console, `__dernier`) : brûler le talent emprunté pendant la prise et pendant une étape → zone sans coup, étapes annulées, à nu 4,0 s ; dégâts de la brûlure ≤ plafond de la phase ; brûler un autre talent → copie intacte ; un gardien de l'acte III et un Masqué gardent leur plafond d'avant (inertie de la retouche) |
| L-D | phase IV conduite par le bot qui frappe dans les quatre formes, deux graines, mémoires de référence : **0 coup sans signe** (détail imprimé de tout coup suspect), durée de la phase, emprunts joués, sautés, étapes sautées, fenêtres à nu, constructions restantes |
| L-E | coût **apparié dans une seule page** ≤ +1,5 ms ; peinture de l'état 6 une tuile par image en III, ≤ 250 ms à l'entrée d'un essai `?brumeux=4` |
| L-F | mouvements réduits ; captures relues : chute, corps et masque à chaque forme, prise et liseré de la tuile, une copie de chaque forme d'arme, épuisement et anneau, Passe brisée, Révérence vue de derrière, Volte et sa brèche, copie défaite en braises |

- Le bot (`bot=2`) frappe le Brumeux, contourne une construction pour la Passe ; il ne brûle pas (la brûlure s'éprouve en L-C).
- **G** (règle d'or) compare contre **le commit de cette fiche** ; `banc-arene` est rejoué entier ; `banc-effets`, `banc-complet` et `sim-dernier` vérifient que le Dernier Souvenir ne bouge pas hors du Brumeux ; `sim-brume` et `sim-masque` que l'arme de la Brume du Masqué ne bouge pas.

**Mode d'essai** : `index.html?brumeux=4[&palier=…][&graine=n][&portes=id[:rang[:g]],…][&emp=<id>][&ds=1][&bot=2][&classe=…][&dieu=0]` : `portes` donne les talents portés (par `prendre`, comme `__dernier.essai`), `emp` force le premier emprunt, `ds=1` active la braise et désigne le talent `emp` pour éprouver le lien ; `RUN.essai` posé (rien n'est écrit). Console `__brumeux` : `emprunter(id)`, `etat().emp` (empruntables, poids, en cours, joués, défaites), `defaire()` pour le banc.

**Régression** : tous les simulateurs, tous les bancs, puis `banc-gardiens-final` seul.

## 11 · Écarts au cadrage (à valider avec la fiche)

1. **Aucune des neuf formes n'est libre** (prises par les phases I à III) : les trois gestes du duel reprennent le couloir, le cône et l'anneau à brèche, avec une origine que rien n'avait encore : son corps au sol (sorties neuves : derrière lui, contre lui).
2. **Empruntables** : ultimes, sous-classes, renforts et reliques exclus ; variantes `etourdit`, `repousse`, `vol`, `traverse` ignorées, `double` et `elargi` gardées. Q6 disait « un de tes talents portés ».
3. **Zones d'un emprunt orange au liseré lavande** (Q6 disait « lavande ») : c'est lui qui frappe, le juge le traite comme une zone de boss ; la lavande dit « souvenir ».
4. **Chargement plancher 0,8 s** pour toutes ses étapes (+0,3 s à la première rencontre), au lieu des 0,40 à 0,65 s que `sbCharge` donne à la registre III.
5. **Le talent emprunté est marqué dans ton HUD** (liseré lavande sur sa tuile, sans texte) : sans cela, le lien au Dernier Souvenir ne se découvre pas.
6. **Plafond du Dernier Souvenir calculé sur les PV de la phase en cours** contre le Brumeux (96 à 192 PV), dans ses cinq phases : sur `e.maxHp`, une brûlure ôtait 18 à 36 % d'une phase.
7. **Copie défaite → à nu 4,0 s** (le cadrage disait « plus longtemps » sans chiffre).
8. **L'état réel de la phase IV est ajouté en index 6**, aux bornes d'une salle ordinaire (1 168 × 584), caméra fixe.
9. **Bascule de l'arène à 240 px/s** pour la transition III → IV (à 120 px/s, 5,3 s).
10. **Constructions restantes ≤ 30 % de l'aire libre de l'état IV**, en plus du filtre des bornes et de la connexité de 5c.
11. **Pas de dégâts de contact** de son corps.
12. **`SAVE.brumeux` reste v:1**, avec le champ facultatif `emp`.
13. **Pas de fenêtre après la boucle** (`nuS` 0) : chaque emprunt a la sienne (3 × 2 s par boucle).
14. **Entracte 1,2 s** (1,4 en I à III).
15. **Le porteur de ses emprunts est un fantôme collé à son corps**, comme le Reflet du Glas (et non un `e.asm` sur le Brumeux, qui ferait de lui un Masqué pour tout le code : promotion, `enemyTarget`, Dernière ombre).

## 12 · À valider aussi : les 11 écarts d'implémentation de 5d (§ 38)

1. Le montage n'est pas réécrit : son horloge est ralentie (`M.t` reculé chaque pas), ses proportions gardées ; « suspendu » = tenu 0,02 s avant la coupe.
2. Le nœud réutilise l'entité fixe des constructions (`cons18` avec un seul élément) : toutes leurs règles s'appliquent sans code de plus.
3. Le cousu naît par le `createEnemy` du Masqué avec `room.asm` prêté le temps de l'appel ; il n'est jamais `room.asm` en dehors de ses coups.
4. Le plancher de chargement (0,6 s) prolonge un chargement trop court au lieu de changer l'assemblage (`X.cou.j.prolonges`).
5. Rien hors de la vue : un cousu ne commence rien quand son centre est hors de la vue, et un tir de cousu né hors de la vue se perd (`tirsPerdus`).
6. Un tir hérite du signe de son tireur (bloc v18.4 ; le journal seulement).
7. L'île d'une douve : la grille de `coudre` compte toutes les fosses, l'île n'y est jamais reliée à toi ; le point de l'île ignore `G.relie` (on l'atteint par une passerelle ouverte).
8. Le Surjet commence à 40 px de sa croix même quand tu es plus près.
9. Les Aiguilles s'arrêtent au premier pilier qui arrête un tir, pas à une fosse.
10. `banc-brumeux` A, B et D éprouvent le moteur sur la phase IV (partition d'essai) : **avec 5e, ils passeront à la phase V** (la phase IV aura sa partition).
11. La promotion par un cousu passe par `nemPromo` tel quel (le cousu est `room.asm` le temps du coup mortel) ; un coup du Brumeux ne promeut personne ; une descente d'essai non plus.

## Découpage de l'implémentation, modèle et effort

Une seule implémentation, dans une autre conversation, dans l'ordre de la méthode : données (`brumeux.js` : gestes `passe`, `reverence`, `volte`, mesure `emprunt`, `partition.emprunt`, bloc `emprunt` (exclusions, variantes, poids, plancher, dégâts, prise, à nu 2 / 4), `cumul.emprunt`, `phases[3].arene:6`, `dessin.version` 5 ; `arene.js` : état 6, vitesse de bascule de la transition) ; logique pure (`/*brx:pur*/` : `brxEmpruntables`, `brxPoidsEmprunt`, `brxEmprunts` (tirage de la boucle, premier), `brxEtapesEmprunt` (variantes, plancher, dégâts), `brxPasse`, `brxReverence`, `brxVolte`, `brxFiltreAire`, `brxPlafondDs`, champ `emp`) et `sim-brumeux` section 13 ; section « v18.9 · Phase IV » du bloc v18.5 (corps au sol, marche, gestes, porteur fantôme et `sbMaj`, prise, liseré de la tuile, défaite par la brûlure, transitions, dessin) ; **retouches inertes** : crochet du plafond dans le bloc de la Mémoire (`e.pvPlaf18`), marque de tuile du HUD (`.emp18`), porteur fantôme et couleur de zone dans le bloc du Masqué ; essai `?brumeux=4&portes=…&emp=…&ds=1` ; `banc-brumeux` section L (A, B et D passent à la phase V) ; journal v18.9, wiki (`--check`, rien de neuf), `memoire.md` § 39, `CLAUDE.md`, `REPRISE.md`, `bancs/README.md`, statuts ; régression complète.

**Modèle et effort : Opus 5.5, élevé** (le cadrage prévoyait moyen pour 5e) : la phase touche trois systèmes vivants en descente ordinaire, chacun avec ses simulateurs et ses bancs : le Dernier Souvenir (`sim-dernier`, `banc-effets`, `banc-complet`), l'arme de la Brume du Masqué (`sim-brume`, `sim-masque`) et le HUD de la Mémoire. Si l'auteur préfère « moyen », la couper en deux conversations : **5e-1** (empruntables, porteur fantôme, prise, marque de la tuile, lien et plafond du Dernier Souvenir : Opus 5.5, élevé) puis **5e-2** (gestes, partition, état d'arène, corps et dessin, transitions, banc L : Opus 5.5, moyen).
