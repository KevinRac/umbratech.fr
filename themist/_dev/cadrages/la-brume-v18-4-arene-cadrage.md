# La Brume · v18 · action 4 : l'arène large et la caméra du boss final · cadrage

Statut : **validé le 1er novembre 2026** (toutes les recommandations, Q1 à Q12). **Étape 2 faite : v18.4** (commit `c5d888d`), arène **éteinte** (`actif:false`) ; détail, écarts et mesures : `themist/_dev/memoire.md` § 34. Prochaine étape du chantier v18 : l'action 5 (le Brumeux), qui allume l'arène.
Références : `la-brume-v18-descente-10-actes-cadrage.md` (V1–V8, D5, D6, D8), `la-brume-v18-3-paliers-cadrage.md` (action 3 faite), `CLAUDE.md`, `themist/_dev/memoire.md` § 31 à § 33, dépôt au commit `9e92de2` (v18.3).
Hors champ : le combat du Brumeux (ses 5 phases, ce qu'il invente), qui vient à l'action 5. Ici : le **terrain** (arène, caméra, indicateurs de bord, mécanisme de transformation, coût) et ses **outils de vérification**.

Écarts à l'implémentation (détail § 34) : sept lignes `ECR()` et non six ; deux crochets de base de plus, eux aussi réduits à l'identité hors de l'arène (`sbOrigine`, carte de distances `FF`) ; vue sûre des signes remesurée en jeu (le HUD suit la taille de la fenêtre) ; un calque de sol par état (brume de décor cuite) ; « le joueur frappe ce qu'il voit » appliqué à tous ses coups (sauf brûlures et poisons) ; le cercle d'apparition compte comme le signe de l'ennemi qui en naît.

## Règle d'or (rappel, non négociable)
Seules les salles qui reçoivent l'arène large changent. Toutes les autres salles, et les combats des gardiens des actes I à III, restent **identiques image par image**, dans les trois paliers. Le banc le prouve (Q11).

## Ce qui existe aujourd'hui (relevé dans `index.html`, v18.3)
| Brique | Où | Ce qu'elle suppose |
|---|---|---|
| Taille du monde | `const W=1280,H=720` | le monde **est** l'écran ; 121 lignes lisent `W` ou `H` |
| Arène | `const AR={x0:56,y0:92,x1:1224,y1:676}` | rectangle fixe ; **518 lectures** (`hitsWall`, `collidePlayer`, `collideEnemy`, `findSpawn`, `themePos`, `sbOrigine`, mutations…) |
| Rendu | `render()` : une seule transformation `setTransform(scale,0,0,scale,offX+sx·scale,offY+sy·scale)`, découpe `rect(0,0,W,H)` | tout est dessiné en coordonnées monde = écran |
| Sol | `renderFloor` : un canevas `W × H` par salle (`room.canvas`), murs tracés de 0 à `W` | une salle = un écran |
| Brouillard | `fogCv` (`W·FS × H·FS`), `drawFog` : un trou par lumière, posé en `0,0,W,H` | lumières en coordonnées écran |
| Premier plan | `drawVignette` et ses enveloppes (Temps Suspendu, rideaux et éclairs du Brumeux en salle, Transe, Brume plombée), voile `drainT` | `fillRect(0,0,W,H)` = l'écran |
| Lumières « plein écran » | Zénith, Grande Toile, cris du Brumeux, Balancier | centre de salle = `W/2,H/2` |
| Entrée, portes, décor | `enterRoom` (`P.x=W/2`), `makeDoors` (`W/2±320`), `layoutFor` (`W-p.x`), `makeMists` | positions écran |
| Carte de distances | `FF` (bloc v17.5) : `COLS=⌈W/20⌉`, `ROWS=⌈H/20⌉`, tableaux fixes | grille d'un écran |
| Souris | `updMouse` : écran → monde par `offX`, `scale` | monde = écran |
| Aides et bulles | `arrowPos`, bulle de la porte de némésis : monde → écran sans décalage | idem |
| Secousses | `shake` → décalage dans `render` (rien en mouvements réduits, `RM`) | décalage de l'écran |
| Masqué, armes de la Brume | `sbPlacer(…, o.arene)`, `o.arene = AR` (`sbOrigine`) | la sortie peut être n'importe où dans `AR` |
| Brume qui serre (mutation) | rectangle intérieur | bornes rétrécies : déjà un précédent de « bornes qui bougent » |
| Jetons d'attaque | `tryTok(e,k)`, `tokMax` | un plafond d'attaquants simultanés |
| Places de l'acte X | `doEnter` pose `RUN.gardeNow` (`mini`, `final`) **avant** `enterRoom` ; `planRoom` enveloppé (bloc v18) | on sait, dès la création de la salle, qu'elle est le boss final |

Conséquence clé : `W` et `H` sont des constantes (taille de l'écran) et doivent le rester ; `AR` est un objet `const` **dont on peut changer les champs**. C'est la porte d'entrée la moins invasive (Q2).

---

## Q1 · Où l'arène large sert, sa taille, sa forme
**Où** :
- **A. Le boss final seulement.** Une seule salle à concevoir et à vérifier ; les deux miniboss (action 6) restent des combats d'un écran, comme les gardiens.
- **B. Le boss final et le second miniboss** (arène moyenne, 1,5 écran) : il « apprend » la caméra au joueur avant le Brumeux. Mais il impose une contrainte de conception à un adversaire qui n'existe pas encore, et les mutations de l'Extrême jouent en salle de miniboss : il faudrait les adapter aussi.
- **C. Les trois salles de l'acte X.**

**Recommandation : A**, avec la liste des salles dans les données (`salles:{final:{…}}`). Ajouter `mini` plus tard ne demandera qu'une entrée, à décider au cadrage du second miniboss (action 6).

**Taille** (vitesse de base 220 px/s ; l'arène actuelle fait 1 168 × 584 px intérieurs, traversée en 5,3 s) :
| Option | Monde | Traversée en largeur | Commentaire |
|---|---|---|---|
| 2 × 1 | 2 560 × 720 | 11 s | couloir : la caméra ne bouge qu'à l'horizontale ; plus simple, mais l'arène se lit comme une bande |
| **2 × 1,5** | **2 560 × 1 080** | **11 s** | **vraie surface (3 écrans), on peut tourner autour du boss ; la caméra suit dans les deux sens** |
| 2,5 × 1,5 | 3 200 × 1 080 | 14 s | plus de place pour des phases très différentes, mais des trajets morts |
| 3 × 2 | 3 840 × 1 440 | 17 s | trop : on marche plus qu'on ne joue |

**Recommandation : 2 × 1,5** comme taille maximale ; le banc mesure aussi 2,5 × 1,5 pour garder la marge. Surtout, **chaque phase déclare ses bornes jouables** à l'intérieur de ce maximum (Q5) : une phase peut se jouer sur un seul écran, la suivante ouvrir l'arène entière. La caméra suit les bornes de la phase (fixe quand elles tiennent dans l'écran).

**Forme** :
- **A. Rectangle**, les formes viennent des obstacles (piliers du jeu : des disques) et de zones « vides » (fosses) : tout le moteur reste valable.
- **B. Contour quelconque** (polygone) : collisions, sorties du Masqué, apparitions, brume qui serre, tout serait à reprendre.

**Recommandation : A.** Le rectangle reste la borne dure ; l'arène se dessine par ses obstacles, son sol et sa brume.

## Q2 · Ce qui suppose une salle de la taille de l'écran, et comment l'adapter sans toucher aux autres salles
Principe : **deux repères**. Le **monde** (taille de l'arène) et la **vue** (l'écran, 1 280 × 720, inchangé). Un état `CAM = {x, y}` vaut **0, 0 dans toutes les autres salles**, et le monde y vaut l'écran : toutes les formules ci-dessous redonnent alors exactement les valeurs d'avant.

| Ce qui change | Comment | Dans une salle ordinaire |
|---|---|---|
| `W`, `H` | **inchangés** (taille de la vue) ; un nouvel objet `MONDE = {w, h}` | `MONDE = {1280, 720}` |
| `AR` | à l'entrée de l'arène, ses champs reçoivent les bornes de la phase ; **remis à `AR0`** (copie figée au chargement) à toute nouvelle salle | une assertion de développement vérifie `AR == AR0` à chaque `enterRoom` hors arène |
| Rendu | `render` : la transformation retire `CAM` ; découpe à la vue ; ce qui est « écran » (brouillard posé, `drawVignette` et ses enveloppes, voile `drainT`) est dessiné après un `translate(CAM.x, CAM.y)`, **seulement si `CAM` est allumé** | aucune instruction de plus |
| Sol | un **peintre propre à l'arène** (Q7, cache par zone) ; `renderFloor` n'est pas touché | inchangé |
| Apparitions | dans l'arène, restreintes à **la vue élargie** (vue + 200 px) et à 230 px du joueur au moins | inchangé |
| Bornes du joueur et des ennemis | `collidePlayer`, `collideEnemy`, `hitsWall` lisent `AR` : rien à faire | inchangé |
| Zones et sorties du Masqué | dans l'arène, `arene = AR ∩ vue sûre` : **la zone et sa sortie sont toujours à l'écran** | `AR` comme aujourd'hui |
| Règles de salle, mutations | aucune règle de salle v14 ni mutation dans l'arène | inchangé |
| Portes | la salle du boss final n'en a pas ; si une arène en a un jour, au mur du haut, au centre du monde | inchangé |
| Brouillard | `fogCv` **reste à la taille de l'écran** ; lumières posées à `x − CAM.x`, celles entièrement hors vue sautées | inchangé |
| Lumières « plein écran » | `ECR()` = centre de la vue remplace `W/2, H/2` | `ECR()` vaut `W/2, H/2` |
| Nombres, particules, effets | dans l'arène, ceux qui sont hors vue ne sont pas dessinés (ils sont mis à jour) | inchangé |
| Secousses | décalage d'écran ajouté **après** la caméra | inchangé |
| Carte de distances `FF` | grille dimensionnée par `MONDE` | mêmes tableaux qu'avant |
| Souris | position **écran** gardée ; chaque image, `mouse.x = mouse.sx + CAM.x` (Q3) | `mouse.x` identique |
| Aides et bulles | conversion monde → écran par `versEcran(x, y)` | identique |
| Entrée du joueur | point d'entrée donné par les données de l'arène | `W/2, AR.y1 − 60` |
| Effets du joueur « sur toute la salle » | **ce qui est à l'écran** (vue + 60 px) : le joueur frappe ce qu'il voit | inchangé |
| Ennemis hors vue | **pas de jeton d'attaque** hors de la vue élargie (le boss n'est pas concerné) | inchangé |

Toutes ces adaptations vivent dans **un bloc « v18.4 · L'arène »** en fin d'`index.html`, sauf quelques retouches de base, chacune réduite à l'identité quand `CAM` est nul.

**Recommandation : ce tableau.** Alternative écartée : faire de `W`/`H` des variables et tout recalculer (121 lignes).

## Q3 · La caméra
| Réglage | Recommandation |
|---|---|
| Suivi | **cible composée** : joueur + avance + biais vers le boss |
| Zone morte | **rectangle 200 × 120** |
| Lissage | **exponentiel, τ = 0,15 s**, sans dépassement (jamais de rebond) |
| Garde-fou | **le joueur reste toujours à ≥ 180 px des bords gauche et droit et ≥ 140 px du haut et du bas** de la vue sûre, même pendant une ruée |
| Avance (mouvement) | **jusqu'à 70 px** dans le sens du déplacement, lissée (τ 0,3 s) |
| Avance (visée) | **0 au départ** (réglage dans les données), calculée sur la position *écran* de la souris si on l'active |
| Boss loin | **cadrage partagé** : la cible glisse vers le boss de 30 % de l'écart au plus, sans jamais violer le garde-fou ; **pas de zoom** |
| Bornes | **bornée aux bornes de la phase** (fixe et centrée si elles tiennent dans l'écran) |
| Entrée, changement de phase | **saut** à l'entrée ; changement de phase : la cible suit les nouvelles bornes, lissée |
| Secousses | **après** la caméra ; rien en mouvements réduits |
| Mouvements réduits | **même caméra sans avance, zone morte 320 × 180, τ 0,25 s**, ni secousse ni biais animé |
| Petits écrans | **champ de vue fixe** (1 280 × 720 unités) |
| Souris | position écran gardée, monde recalculé à **chaque image** après la caméra |

Logique pure (bloc `/*arene:pur*/`) : `arCible`, `arPas`, `arVue`, `versEcran`, `versMonde`. Aucun accès au jeu : tout passe en argument.

## Q4 · Les indicateurs de bord (ce qui arrive hors champ)
Principe D5 : **aucune mort sans signe**. Règle vérifiable : **aucun coup ne touche le joueur si sa source n'a pas été visible (à l'écran ou par un indicateur de bord) depuis au moins 0,6 s** (0,8 s pour une attaque du boss).

| Quoi | Quand | Signe | Couleur |
|---|---|---|---|
| Télégraphe | dès qu'il touche la vue élargie ou qu'il vise le joueur | arc de bord qui **se remplit** comme la zone | orange `TELE.zone` (boss), rouge `FOE` (ennemis ordinaires), lavande (arme de la Brume) |
| Projectile | si sa trajectoire passe à moins de 60 px du joueur dans les 1,5 s | trait-flèche qui grossit quand il approche | violet `TELE.proj` |
| Saisie | idem | crochet | cyan `TELE.grab` |
| Le boss | toujours, quand il est hors vue | son **glyphe** dans un anneau ivoire, flèche vers lui ; pulse à la charge | ivoire |
| Élite, Masqué, invocation forte | à moins de 900 px de la vue | chevron épais | rouge `FOE` |
| Ennemis ordinaires | à moins de 600 px de la vue | trait fin, **regroupés** par segment de bord avec leur nombre | rouge `FOE` atténué |

**Placement** : sur le bord de la **vue sûre** (vue moins les bandes du HUD), rentré de 24 px, sur le rayon joueur → source ; jamais dans un coin (glissé de 40 px) ; deux indicateurs à moins de 28 px fusionnent (le plus dangereux devant). Taille 14 à 22 px.
**Priorité** (au plus 10 visibles) : télégraphe > projectile > saisie > boss > élite > ordinaires.
**Mouvements réduits** : pas de pulsation.
**Son** (option, pas dans cette action) : panoramique des télégraphes hors champ.

**Recommandation : ce tableau**, plus la règle des jetons. Logique pure : `arBord`, `arIndic`. Un nouvel indicateur reste à ΔE ≥ 25 des autres.

## Q5 · La transformation de l'arène entre les phases (le mécanisme seulement)
Une phase déclare son **état d'arène** ; le contenu de chaque état vient à l'action 5.
```js
etat:{bornes:{x0,y0,x1,y1},          // sous-rectangle du monde jouable
      obstacles:[{x,y,r,kind}],        // piliers (disques)
      vides:[{x,y,r}],                 // fosses : on n'y marche pas, rien n'y apparaît
      sol:'calque',                    // calque de sol (peint et mis en cache, Q7)
      brume:[{x,y,r,a}]}               // brume de décor : ne cache jamais un télégraphe ni un indicateur
```
**Passage** en trois temps :
1. **Annonce** (≥ 1,2 s) : futurs obstacles et fosses en contour ivoire neutre ; nouvelles bornes au sol ; indicateurs de bord si c'est hors vue.
2. **Bascule** : bornes à 120 px/s au plus (créatures repoussées sans dégât) ; un obstacle ne sort pas de terre sous une créature (il attend, ou la pousse) ; `FF` recalculée.
3. **Fondu** du sol et de la brume (0,6 s), à partir de calques **peints à l'entrée de la salle**.
Pendant l'annonce et la bascule, aucune attaque du boss ne part : règle à confirmer à l'action 5.

**Recommandation : ce mécanisme**, en logique pure et avec un mode d'essai qui enchaîne des états factices (Q10).

## Q6 · Les ennemis, le Masqué et le provisoire en attendant l'action 5
- **A. L'arène joue tout de suite** pour le boss final provisoire.
- **B. L'arène existe mais reste éteinte** (`actif:false`) : seul le mode d'essai l'ouvre ; l'action 5 l'allume avec le Brumeux.

**Recommandation : B.** En jeu, rien ne change dans aucune salle à la v18.4 ; le banc le prouve image par image. Le mode d'essai remplit l'arène d'ennemis ordinaires, d'un Masqué et d'un boss d'essai (un fantôme qui charge des télégraphes factices).

## Q7 · Le coût de rendu
| Poste | Recommandation |
|---|---|
| Sol | **cache par zone** (D6) : tuiles de 640 × 360 (12 par calque), peintes à l'entrée ; au plus 9 posées par image |
| Brouillard | **taille de l'écran**, lumières hors vue sautées |
| Lumières colorées | celles de la vue seulement |
| Brumes, particules, nombres, effets | mise à jour partout, dessin dans la vue |
| Indicateurs | ≤ 10 tracés simples |

**Budget** (machine du banc) : une image de l'arène pleine (boss d'essai, 20 ennemis, 10 indicateurs, 30 lumières) ne dépasse pas de plus de **1,5 ms** une salle d'élite ordinaire au même contenu ; le peintre de tuiles tient en **≤ 250 ms à l'entrée**. Mesures rejouées si la machine est chargée.

## Q8 · Où vivent les réglages
**Recommandation : un nouveau fichier `data/arene.js`** (`actif`, `salles`, `camera`, `vue`, `indicateurs`, `preavis`, `tuiles`, `transformation`, `budget`). Logique pure : bloc `/*arene:pur*/` ; jeu : bloc « v18.4 · L'arène ».

## Q9 · Ce que dit le wiki (D8)
**Recommandation : rien** tant que l'arène est éteinte, sauf la ligne du journal ; à l'action 5, une ligne dans « La descente » et la **légende des indicateurs de bord** (couleurs), générées depuis `arene.js`. Le wiki ne dira jamais ce que contient chaque phase, comment l'arène change ni pourquoi.

## Q10 · Mode d'essai
`index.html?arene=<salle>[&etat=0..n][&w=2][&h=1.5][&foule=n][&boss=1][&tirs=1][&bot=1][&dieu=1][&classe=…]` : pose `RUN.essai=1`, ajoute `arene` aux deux gardes d'essai (`ESSAI18` et `ESSAI_URL`), ouvre l'arène même `actif:false`, peuple la salle, enchaîne les états ; console `__arene` (`etat()`, `cam()`, `vers(n)`, `indic()`, `journal()`, `mesure()`).

## Q11 · Comment le vérifier
1. **Simulateur pur** (`outils/sim-arene.mjs`) : identité au bit près quand le monde vaut l'écran ; caméra sur 10 000 trajets ; bords ; préavis ; transformation ; tuiles ; données et secret du wiki ; branchements lus dans `index.html`.
2. **Banc Chromium** `_dev/bancs/banc-arene.mjs` : A caméra ; B bords ; C coût ; D mouvements réduits et tailles d'écran ; E souris ; F journal des coups sur 3 combats d'essai conduits ; G **règle d'or**.
3. **Règle d'or (G)** : le commit d'avant et celui d'après rejouent la même descente (copie instrumentée, même graine, horloge à la main) et comparent **chaque image** de toutes les sortes de salles dans **les trois paliers** ; aucune différence de pixel tolérée. Puis tous les simulateurs et bancs de régression, `banc-gardiens-final` seul.

## Q12 · Annexe : le compte des Masqués de `banc-paliers` (section E)
**Recommandation : comptage direct** : pour chaque palier, entrer **800 salles de combat** à l'acte IV avec la réserve garnie ; comparer à la chance attendue avec une tolérance de 4 écarts-types ; l'écart Difficile − Normal au-dessus de zéro ; les porteurs par acte ne dépassent jamais `parActe`.

---

## Décisions validées (récapitulatif)
| # | Question | Décision |
|---|---|---|
| Q1 | Où, taille, forme | boss final seulement ; 2 × 1,5 écrans au plus, bornes par phase ; rectangle + obstacles et fosses |
| Q2 | Adapter sans toucher aux autres salles | monde et vue séparés, `CAM` nul ailleurs ; `AR` réécrit puis remis ; retouches de base réduites à l'identité ; le reste en enveloppes |
| Q3 | Caméra | zone morte 200 × 120, τ 0,15 s, avance 70 px, cadrage partagé 30 %, garde-fou dur, pas de zoom ; mouvements réduits sans avance |
| Q4 | Indicateurs | six sortes ; grammaire de couleurs ; « aucun coup sans signe depuis 0,6 / 0,8 s » vérifié |
| Q5 | Transformation | états déclarés ; annonce ≥ 1,2 s, bascule douce, fondu depuis des calques préparés |
| Q6 | Provisoire | arène éteinte jusqu'à l'action 5 ; essai seulement |
| Q7 | Coût | tuiles 640 × 360, brouillard à la taille de l'écran ; ≤ +1,5 ms par image, ≤ 250 ms de peinture |
| Q8 | Données | `data/arene.js` ; logique pure `/*arene:pur*/` |
| Q9 | Wiki | journal seulement ; ligne et légende à l'activation |
| Q10 | Essai | `?arene=…`, `RUN.essai`, gardes, console `__arene` |
| Q11 | Vérification | `sim-arene.mjs` ; `banc-arene.mjs` (A à G) ; règle d'or image par image |
| Q12 | `banc-paliers` E | comptage direct, tolérance statistique |

## Risques
- **Un chemin oublié qui garde l'`AR` de l'arène** : assertion à chaque `enterRoom`, contrôle du simulateur, règle d'or du banc.
- **Lignes de base qui lisent `W/2`** pour un centre de salle : le mode d'essai les fait apparaître.
- **Effets du kit à longue portée** qui iraient chercher un ennemi hors vue : relevés par le banc.
- **Coût sur une machine modeste** : seuils mesurés sur la machine du banc ; à recaler sur une partie réelle (durée des images à ajouter aux statistiques de l'acte X).

## Modèle et effort
- Étape 2 : **Opus 5.5, élevé** (faite).
