# La Brume · v18.5 « Le Brumeux » · action 5f · fiche courte de la phase V, « L'Effacement », et de sa mort

Statut : **à valider** (soumise à l'auteur le 5 novembre 2026 ; cadrage Q17 : aucune ligne de code avant la validation). Rédigée à partir du cadrage validé (Q1, Q2, Q7, Q8, Q10 à Q14, Q17), des fiches 5b à 5e (modèle de forme), de `_dev/memoire.md` § 35 à § 39, et du code actuel : `data/brumeux.js` (`phases[4]` d'essai, `paliers.*.phaseV`, `phaseV.courte.pv`, `budget.base[4]`, `elements`, `cumul`, `tableaux`, `couture`, `emprunt`, `constructions.sortes.*.chute`), `data/arene.js` (`salles.final.etats` 0 à 6, `transformation`), `data/descente.js` (`regles.extreme.brumeux.phaseEntiere`) ; dans `index.html`, le bloc v18.5 : `brxPv` (phase V courte), `vers` / `transPas` (transitions), `mort` (scène d'essai de 5a), `effacerCons`, puis les sections v18.6 (tableaux), v18.7 (effondrement, fosses, `brxFiltreBornes`), v18.8 (montage, nœud, cousus, promotion) et v18.9 (emprunt, `X.emp.joues`, corps au sol).

Ce qu'il faut savoir du code avant de lire :
- **La phase V d'essai** (5a) : `phases[4]` = `{id:'effacement', presence:'sol', faible:'coeur', arene:2, libre:0.60, pv:2400, exclut:['construction']}` ; elle joue la partition d'essai sur l'état d'essai 2 (« braise »). En entrant en V, `vers` appelle `effacerCons()` : **toutes les constructions disparaissent d'un coup**.
- **Courte ou entière** : `brxPv` donne déjà à la phase V la moitié de ses PV en Normal et en Difficile (`phaseV.courte.pv` 0,5 : 1 200 PV) et tous ses PV en Extrême (2 400 PV, `paliers.extreme.phaseV:'entiere'`, `regles.extreme.brumeux.phaseEntiere`). Budget d'une mesure libre en V : `budget.base[4]` 7, × 1,5 en Extrême = **10,5**.
- **Sa mort** (5a) : `mort(e)` vide la salle tout de suite (ennemis, tirs, ondes, constructions), note la sauvegarde, et dessine une scène de 2,2 s pensée pour les phases I à III (« sa croix tombe »). Hors essai, la victoire de la descente est laissée à 5g.
- **La sauvegarde** : `tab`, `bati`, `cousu` et `emp` sont **déjà rangés par phase** (`{<phase>:…}`) et `brxLireSauve` accepte les phases 1 à 5. La phase V n'a besoin d'aucun champ neuf.
- **Ce que le combat a déjà montré** : la phase IV garde `X.emp.joues` (talents empruntés) ; les tableaux de la phase I et les Masqués cousus de la phase III ne sont pas encore gardés pour la suite du combat (seulement comptés dans les journaux `X.j`, `X.cou.j`).
- **L'arène** : l'état 6 (`emprunt`) fait 1 168 × 584 au centre du monde (2 448 × 944) : la caméra est fixe. Une fosse (`fosse18`) arrête la marche mais pas les tirs ; une transformation annonce (1,2 s), puis pousse sans dégât (120 px/s, `parEtat` pour une vitesse propre).

---

## 1 · Le principe : un examen, pas une phase neuve

Q7 : la phase V **ne puise que dans ce que ce combat a déjà montré**. Elle n'a **aucun geste signature neuf** : son socle est un geste de chaque phase, rejoué plus serré, et l'arène qui se défait autour. Ce qui est neuf, c'est seulement **la manière** : l'arène recule, ses abris s'effondrent dans des fosses, son masque se fend.

| Geste du socle (nom jamais affiché) | Reprise de | Ce qui change en V |
|---|---|---|
| **Le tableau éclair** | phase I (tableau) | un décor déjà accroché dans ce combat ; demi-arène ; vague seule, budget réduit de moitié ; vie ≤ 8 s |
| **L'effondrement** | phase II (effondrement) | une construction restée debout tombe, puis son emprise devient une fosse |
| **Le montage court** | phase III (Couture) | un seul fil, montage de 2,6 s, un Masqué déjà cousu dans ce combat |
| **L'emprunt** | phase IV (emprunt) | un talent qu'il a déjà emprunté en IV |
| **La feinte double** | fil rouge (v14) | deux feintes à la suite dans la même mesure |

Préavis : ceux de chaque geste d'origine, **jamais plus courts** (Q12). Ce qui est « plus serré », c'est l'entracte (1,0 s), les vies et les montages raccourcis, et l'absence de mesure creuse.

**Recommandation : ce socle, sans geste neuf.**

## 2 · Partition chiffrée (`partition.effacement`)

**Courte** (Normal, Difficile : socle seul, 1 200 PV) :

| # | Mesure | Nature | Durée indicative |
|---|---|---|---|
| 1 | **Tableau éclair** | fixe | ≤ 11,4 s (accroche 0,8, vie ≤ 8, rideau 0,6, à nu 2,0) |
| 2 | **Feinte double** | fixe | 2,6 s (1,15 + 0,3 + 1,15) |
| 3 | **Effondrement** | fixe | 3,4 s (chute 1,4, à nu 2,0) |
| 4 | **Montage court** | fixe | 4,9 s (descente 0,3, montage 2,6, à nu 2,0) ; le cousu se bat ensuite |
| 5 | **Feinte double** | fixe | 2,6 s |
| 6 | **Emprunt** | fixe | ≈ 5,5 s (prise 0,6, attaque 2,5 à 3,2, à nu 2,0) |

**Entière** (Extrême, 2 400 PV) : la même boucle avec **trois mesures libres** (après 2, après 4, après 6) : tableau éclair · feinte double · **libre** · effondrement · montage court · **libre** · feinte double · emprunt · **libre**.

- **Entracte 1,0 s** (1,2 en IV, 1,4 en I à III). `nuS` 0 (chaque geste a sa fenêtre), `sauteS` 0,6.
- **Boucle courte ≈ 36 s** (mesures ≈ 30 s, six entractes 6 s) : la phase courte tient en **une boucle environ** (cible ≈ 25 à 35 s, la moitié de 50 à 70 s). **Boucle entière ≈ 45 s** (+ trois libres d'≈ 1,5 s, trois entractes) : environ **1,3 boucle** pour 50 à 70 s. Les PV restent provisoires (5g).
- **Fenêtres à nu** (anneau ivoire sur son cœur, × 1,5 comme toujours) : **2,0 s** après chacun des quatre gestes de phase ; **4,0 s** pour un emprunt défait par le Dernier Souvenir (§ 6) ; **2,0 s** pour un montage coupé. **Aucune** après une feinte ou une mesure libre. Au socle : **8 s à nu par boucle courte**, soit ≈ 22 % du temps (IV : 6 s pour ≈ 36 s).
- **Mesures qui sautent** (comptées, entracte réduit à 0,6 s) : un tableau sans décor disponible, un effondrement sans sortie, un montage quand un cousu vit encore, un emprunt sans talent disponible (§ 3).
- **Le premier de la boucle** : si ce qui t'a tué en V la dernière fois (`mort[5]`) est l'un des quatre gestes, la boucle **commence par lui** (la partition tourne, l'ordre reste le même), et son détail (`tab[5]`, `bati[5]`, `cousu[5]`, `emp[5]`) le choisit s'il fait partie de ce que ce combat a montré.

**Recommandation : ces deux partitions.**

## 3 · Ce que le combat a montré, et chaque geste

Un journal neuf du combat, **`X.montre`**, garde ce que les phases I à IV ont montré : les décors des tableaux accrochés (avec les dégâts que chacun t'a faits), les Masqués cousus (clé d'assemblage, id du talent, dégâts faits), les talents empruntés (`X.emp.joues`, déjà là), les éléments et gestes signature lancés (au moins une fois chargés devant toi), et **`X.parC`**, les dégâts reçus par élément dans ce combat.

**Règle commune des quatre gestes** :
1. le candidat est **dans `X.montre`** ;
2. si la phase d'origine n'a **jamais été jouée** dans ce combat (essai `?brumeux=5`), il est tiré **comme dans sa phase** (repli de l'essai, qui sert aussi aux bancs) ;
3. si la phase a été jouée mais que rien n'en reste (tout brûlé, rien cousu), **la mesure saute** : tu as déjà défait ce qu'elle rejouerait.

**Le tableau éclair** (phase I) :
- le décor qui t'a fait le plus de dégâts en phase I, sinon le dernier accroché ; thème et règle d'origine **sans la règle confinée** (vague seule) ;
- le fragment couvre **la moitié des bornes la plus loin de toi** (gauche ou droite) ; accroche 0,8 s (1,2 en I), puis la vague (places à 230 px de toi au moins, dans le fragment) ;
- budget **2 / 2 / 3** (Normal, Difficile, Extrême : la moitié de 4 / 5 / 6, arrondi bas) : une vague (coût 2), plus une densité en Extrême ; ni règle, ni champion ;
- vie **≤ 8 s** (30 s en I) ; rideau 0,6 s dès que sa vague est morte ; puis **à nu 2,0 s** ;
- cadre, drapé et calques : ceux de la phase I, cuits à l'entrée du combat (rien de neuf à peindre).

**L'effondrement** (phase II) :
- la construction debout effondrable **la plus proche de toi dont la chute laisse une sortie** (règle de 5c, `brxEffondrement`) ; sa chute est celle de sa sorte (`constructions.sortes.*.chute`), **1,4 s**, **16** dégâts, ses ennemis dessous × 2 ;
- **puis elle tombe dans une fosse** : son emprise devient une fosse `fosse18` de mêmes disques (dessin : la matière qui s'enfonce en 0,5 s, puis un trou ourlé de sa matière). La marche n'y passe toujours pas, **les tirs si** (règle Q9.3) : l'abri disparaît, le passage ne change pas, la connexité non plus ;
- **sans construction debout** (toutes tombées, ou essai) : **un pan du bord** tombe : la chute d'une muraille (couloir de 150 px) du bord le plus proche de toi, perpendiculaire à lui, sur 320 px, 1,4 s, 16 dégâts, sans fosse ;
- puis **à nu 2,0 s**.

**Le montage court** (phase III) :
- **un seul fil**, montage de **2,6 s** (4,4 en III), un nœud (2,5 % des PV de la phase : 30 / 60) ; couper le nœud défait le montage, **à nu 2,0 s** ; le montage abouti : il lâche le fil, **à nu 2,0 s** pendant que le cousu tombe ;
- le cousu : celui qui t'a fait **le plus de dégâts en phase III**, sinon le dernier cousu, sinon le premier fil de III (son assemblage est tiré au lancement du fil) ; PV 15 % de la phase (180 / 360), plancher de chargement 0,6 s, ses règles de 5d (rien hors de la vue, zones signées au préavis de l'arène, promotion s'il te tue) ;
- **au plus un cousu vivant** en V (sinon la mesure saute) ; la némésis est un cousu comme les autres ici (elle a déjà paru en III).

**L'emprunt** (phase IV) :
- candidats : `X.emp.joues` **encore portés et empruntables** (brûlés, oubliés : exclus), au poids de 5e ; jamais deux fois de suite la même famille s'il en reste une autre ;
- tout le reste comme en IV : prise 0,6 s, porteur fantôme, zones orange au liseré lavande, plancher 0,8 s, étape × 1,0 = 11, **à nu 2,0 s**, **défait 4,0 s**.

**La feinte double** : deux feintes v14 à la suite (disque r 86, vrai ou faux à graine, jugé à 0,6 s), la seconde **0,3 s après la fin de la première** (jamais deux à la fois : non-cumul `feinte:1`).

**Les mesures libres (entière seulement)** :
- elles tirent dans **ce que le combat a montré** : les éléments libres de 5a et les **gestes signature des phases I à IV** déjà lancés (fils, cadre, toile, ruée, équerre, truelle, surjet, dé, aiguilles, Passe, Révérence, Volte) ; jamais un tableau, un bâtir, une Couture, un emprunt (ils sont au socle) ;
- les gestes des mains ou de la croix partent **de son corps** (il est au sol) ; mêmes formes, mêmes préavis, mêmes sorties garanties (`brxPlacer`) ;
- menace d'un geste signature : **3** ; budget 10,5 ; non-cumul inchangé ;
- poids : la lecture (5a) × **(1 + 2 × la part des dégâts de ce combat venue de cet élément)** : ce qui t'a le plus blessé revient le plus ; un élément jamais montré pèse 0.

**Recommandation : ces quatre gestes, la feinte double, ces libres, et le journal `X.montre`.**

## 4 · L'arène se défait : deux resserrements

**L'état de départ** : la phase V **garde l'état 6** (`phases[4].arene:6`) : pas de transformation à la transition IV → V, le duel continue dans la même salle.

**Deux resserrements**, déclenchés **par les PV de la phase V** (jamais par le temps : Q11, aucun « enrage ») :

| | Seuil (PV de la phase V restants) | État | Bornes | Aire | Recul par côté |
|---|---|---|---|---|---|
| départ | 100 % | 6 `emprunt` | 1 168 × 584 | 100 % | — |
| 1ᵉʳ | **2/3** | **7 `effacement`** | **1 040 × 520** | 79 % | 64 px, 32 px |
| 2ᵉ | **1/3** | **8 `effacement-2`** | **920 × 460** | 62 % | 60 px, 30 px |

```js
{id:'effacement',tard:true,bornes:{fx0:0.2876,fy0:0.2246,fx1:0.7124,fy1:0.7754},sol:'pierre',obstacles:[],vides:[],
 brume:[{fx:0.16,fy:0.5,r:380,a:0.28},{fx:0.84,fy:0.5,r:380,a:0.28},{fx:0.5,fy:0.12,r:300,a:0.2},{fx:0.5,fy:0.88,r:300,a:0.2}]},
{id:'effacement-2',tard:true,bornes:{fx0:0.3121,fy0:0.2564,fx1:0.6879,fy1:0.7436},sol:'pierre',obstacles:[],vides:[],
 brume:[{fx:0.18,fy:0.5,r:420,a:0.36},{fx:0.82,fy:0.5,r:420,a:0.36},{fx:0.5,fy:0.15,r:340,a:0.28},{fx:0.5,fy:0.85,r:340,a:0.28}]}
```

- **Ajoutés en index 7 et 8** ; les états 0 à 6 gardent leurs places (empreintes vérifiées). `tard:true` : peints une tuile par image pendant la phase IV.
- **Sol `pierre`** (celui du duel) ; la brume de décor grossit et s'épaissit à chaque resserrement, toujours **hors des bornes** : c'est elle qui « mange » l'arène. Aucun sol neuf, aucune retouche de `SOLS`.
- **Déroulé** : le seuil franchi, il **attend la fin de la mesure en cours** (aucune zone en cours, aucun montage, aucun tableau) ; puis il s'arrête, lève les bras (0,6 s), l'arène annonce (1,2 s, l'annonce de la transformation) et recule à **120 px/s** (≈ 0,5 s) : tu es poussé **sans dégât**, comme toute créature. Pendant ce temps il ne lance rien ; on peut le frapper (pas à nu). Compté comme un entracte. Durée totale ≈ 2,3 s.
- **Ce qui reste dehors** : les constructions qui ne tiennent plus entières dans les nouvelles bornes, ou au-delà de 30 % de l'aire libre (`brxFiltreBornes`, `brxFiltreAire`), s'effacent en brume, sans dégât ; les fosses dehors aussi. Le cousu et la vague sont poussés.
- **Son masque se fend** à chaque resserrement (une fêlure de braise, puis deux) : la progression se lit sur lui, sans barre ni texte.
- **La justice dans la plus petite salle** : 920 × 460 est plus petit que la salle où `sim-brume` prouve les armes de la Brume (1 168 × 584) ; la section 14 du simulateur reprouve, dans l'état 8, les quatorze familles et leurs variantes gardées, les gestes signature et les feintes. **Si une famille ou un geste n'y a pas de sortie dans 100 % des placements, l'étape ou le geste saute (règle commune)** ; si plus de 1 % des étapes d'une famille sautent dans l'état 8, l'implémentation le note en écart et propose 960 × 480.

**Recommandation : l'état 6 au départ, deux resserrements par PV, ces bornes.**

## 5 · Les constructions : elles tombent une à une

- **Changement du socle de 5a** : en entrant en V, `vers` **n'efface plus** les constructions (`effacerCons` n'est plus appelé à la transition IV → V ; `phases[4].exclut` reste : il ne bâtit jamais en V). Celles qui restent de IV (0 à 3, 1,72 en moyenne au simulateur de 5e) restent debout, avec leurs mécanismes (passerelles, cloche, puits, échafaudage) et leurs règles de 5c.
- **Chaque effondrement** en fait tomber une (§ 3), qui devient **une fosse**.
- **Chaque resserrement** efface ce qui ne tient plus (§ 4).
- **À sa mort**, tout s'efface (§ 8).
- Douves et rails ne s'effondrent pas (règle de 5c) : ils restent jusqu'à ce qu'un resserrement les efface.

**Recommandation : ces règles.**

## 6 · Le Dernier Souvenir en V

- Le plafond se calcule sur **les PV de la phase V** (`e.pvPlaf18`, déjà posé à chaque transition) : **48 à 96 PV** en courte (4 à 8 % de 1 200), **96 à 192 PV** en entière.
- Le lien de la phase IV vaut pour l'emprunt de V : brûler le talent emprunté, de la prise au coup de sa dernière étape, défait la copie, **à nu 4,0 s**.
- La braise est une par acte : si tu l'as dépensée en IV, il n'y a pas de lien en V. C'est voulu.

**Recommandation : rien de neuf, la règle de 5e s'applique.**

## 7 · Paliers, lecture, budget, sauvegarde

**Paliers** (Q12 : jamais de dégâts en plus selon le palier) :

| | Normal | Difficile | Extrême |
|---|---|---|---|
| Phase V | courte : **1 200 PV**, socle seul | courte : 1 200 PV, socle seul | **entière** : 2 400 PV, socle + 3 libres |
| Tableau éclair (budget) | 2 | 2 | 3 |
| Mesures libres (budget) | — | — | 10,5 |
| Resserrements | 2 | 2 | 2 |
| Préavis | grammaire | identique | identique |

La différence de PV entre courte et entière est **la seule de tout le combat**, et elle vient du cadrage (Q12 : « phase V courte, ≈ 50 % de ses PV ») ; elle ajoute du contenu, pas de la résistance par seconde.

**La lecture** (relecture à l'entrée de V : son regard, son rire, sans texte) :

| Ce qu'il lit | Ce qu'il en fait en V |
|---|---|
| `X.montre`, `X.parC` (ce combat) | les candidats et les poids de chaque geste ; les poids des libres |
| ce qui t'a tué en V la dernière fois (`mort[5]` et son détail) | le premier de la boucle (§ 2) ; le premier libre (règle 5a) |
| ton profil, les verdicts, `RUN.par18` | les poids des libres (5a, inchangé) |

**Budget et non-cumul** : inchangés (une zone de boss à la fois au contact, deux sources de tir, une feinte, un tableau, un effondrement, une Couture, un emprunt) ; un cousu vivant compte −2 sur le budget d'une libre (règle de 5d).

**`SAVE.brumeux`** : reste **v:1**, **aucun champ neuf** : `mort[5]` et les détails `tab[5]`, `bati[5]`, `cousu[5]`, `emp[5]` existent déjà (rangés par phase). Une mort par un pan du bord note `effondrement` sans `bati`. Une descente d'essai n'écrit rien.

**Recommandation : ces paliers, cette lecture, et aucun champ neuf.**

## 8 · Les transitions et la mort

**IV → V** (≈ 3 s, jamais une pause) : verrou 1,2 s à 15 %, cri, **pas de transformation de l'arène** (état 6 gardé), relecture ; la copie en cours s'arrête sans fenêtre (5e) ; les constructions restent ; il ne se déplace pas (même présence). Signe de la phase : la brume monte de son manteau (prolongement au-delà de 1,15 × r, sous 35 %) et ne le quitte plus.

**Sa mort** (Q7 : « la croix tombe, les fils se coupent, l'arène redevient brume » ; une scène dans l'esprit de `SC27`, **qui ne retarde rien**) :

| t (s) | Ce qu'on voit |
|---|---|
| 0 | gel 0,12 s, cri étranglé, secousse ; la salle est vidée tout de suite (5a) : cousu, vague et tirs en brume |
| 0 → 0,6 | **son masque** (ta couleur, ton emblème) se détache, tombe et se brise en deux (braise) |
| 0,2 → 0,8 | **la croix** de sa ceinture tombe ; **tous les fils** (ceux du sol, les bouts coupés, celui d'un montage) se rompent et retombent |
| 0,4 → 2,0 | son corps se défait en brume, du bas vers le haut ; le cœur s'éteint en dernier |
| 0,6 → 3,0 | **l'arène redevient brume** : depuis sa place, la brume couvre le sol (calque à 0,6 d'opacité), les fosses et les constructions fondent, les bords pâlissent ; les bornes ne bougent pas, rien ne pousse |

- Durée **3,0 s** ; le masque brisé et la croix restent au sol (débris, hors `e.fade`) tant que tu es dans la salle.
- Les contrôles ne sont jamais retirés ; en essai, la salle reste ouverte. Hors essai, la victoire de la descente (écran, déblocages, `SAVE.descente`) reste à **5g**.
- **Mouvements réduits** : fondu seul (1,0 s), masque et croix posés au sol sans chute, pas de secousse.

**Recommandation : cette transition et cette scène.**

## 9 · Règles transverses

- **Aucun coup sans signe** : chaque geste garde la source de signe de sa phase d'origine (zones du Brumeux au préavis du boss ; cousu et vague au préavis de l'arène ; étapes d'emprunt sur leur source) ; un pan du bord est une source à part entière ; un resserrement ne blesse jamais.
- **Toujours une sortie** : chaque zone passe par `brxPlacer` (ou `sbPlacer`), dans les bornes **courantes** et avec les fosses ; sinon elle saute.
- **Image d'abord** : ni bulle ni fenêtre ; le resserrement se lit à la brume qui avance et au masque qui se fend.
- **Dessin** : `dessin.version` 5 → 6 : brume du manteau en V, fêlures du masque (deux), pan du bord, construction qui s'enfonce et fosse ourlée, scène de mort (masque qui tombe et se brise, croix, fils rompus, corps en brume, arène en brume). Glyphe et portrait : rien (5g).
- **Coût** : ≤ +1,5 ms en mesure appariée (son corps, un cousu, une vague d'éclair, deux constructions, la brume des resserrements) ; états 7 et 8 peints une tuile par image en phase IV ; calque de brume de la mort cuit une fois.
- **Secret** : ni wiki ni journal ne disent ce qu'il fait en V, ni que l'arène se resserre. Ligne de journal proposée pour la v18.10 : « Préparation du combat final : le Brumeux répète en coulisses. Il ne t'attend pas encore au fond : rien ne change en jeu. » (la même qu'en v18.9, à choisir par l'auteur) ; le simulateur vérifie qu'elle ne nomme ni phase, ni effacement, ni resserrement, ni masque.
- **Règle d'or** : l'arène reste éteinte (`actif:false`), le boss final provisoire garde sa place ; toute retouche hors du bloc reste inerte hors de son combat.

## 10 · Ce que l'implémentation devra prouver

**`sim-brumeux`, section 14** :

| Vérification | Détail |
|---|---|
| Données | `partition.effacement` (courte et entière, entracte 1,0, `nuS` 0) ; bloc `effacement` (éclair : accroche 0,8, vie 8, moitié, budgets 2 / 2 / 3 ; montage 2,6 s, un fil, un cousu ; feinte double 0,3 s ; à nu 2,0 ; seuils 2/3 et 1/3 ; pan du bord 150 × 320) ; `phases[4].arene:6` ; états 7 et 8 (bornes, `tard`, hors des bornes pour la brume) ; états 0 à 6 inchangés (empreintes) ; `dessin.version` 6 |
| Candidats | sur 10 000 combats abstraits : chaque geste ne prend que dans `X.montre` (phase jouée), tire comme sa phase (phase jamais jouée), saute (phase jouée, rien n'en reste) ; emprunt : jamais un talent brûlé ou oublié |
| Libres | jamais un élément ou un geste non montré ; budget 10,5 tenu ; non-cumul ; poids × (1 + 2 × part de dégâts) |
| Premier | `mort[5]` → la boucle commence par ce geste ; son détail choisit s'il est montré ; sinon ignoré |
| Justice | dans l'état 8 (920 × 460), avec 0 à 3 constructions et fosses, son corps pour obstacle : les 14 familles × 10 000 positions, les 12 gestes signature, la feinte double, l'éclair (places de la vague), l'effondrement et le pan du bord : sortie libre atteinte à pied à temps, ou saut compté |
| Resserrements | seuils par PV seulement (jamais au temps) ; attente de la fin de mesure ; filtre des constructions (bornes, aire 30 %) ; connexité ≥ 85 % |
| Fosses | une construction tombée devient des fosses de mêmes disques ; les tirs passent ; la connexité ne change pas |
| Dernier Souvenir | plafond sur les PV de V (48–96 en courte) ; défaite de l'emprunt en V : à nu 4,0 |
| Sauvegarde | aucun champ neuf ; `tab[5]`, `bati[5]`, `cousu[5]`, `emp[5]` lus et écrits ; pan du bord : `effondrement` sans `bati` ; essai muet |
| Branchements | ni `Math.random`, ni `setRule`, ni `murmur`, ni `showCard` dans la section v18.10 ; journal sans un mot de la phase |

Contre-épreuves : un emprunt d'un talent jamais emprunté en IV (phase IV jouée) ; un tableau éclair avec une règle confinée ; deux feintes à la fois ; un resserrement déclenché au temps ; un état 6 déplacé ; une fosse qui arrête un tir ; un deuxième cousu vivant ; une libre en Normal ; un `bati` écrit pour un pan du bord.

**`banc-brumeux`, section M** :

| Section | Vérification |
|---|---|
| M-A | lecture, candidats, premier et libres en jeu égaux à la logique pure (même graine, même `X.montre` injecté) |
| M-B | partitions courte (Normal) et entière (Extrême) ; les quatre gestes : éclair (demi-arène, vague, rideau, à nu 2 s), effondrement → fosse (un tir la traverse), pan du bord, montage court (coupé → à nu 2 s ; abouti → cousu, à nu 2 s), emprunt (de `joues` seulement), feinte double ; deux resserrements (seuils, attente de fin de mesure, poussée sans dégât, constructions filtrées, masque fendu) ; IV → V (état 6 gardé, constructions gardées) |
| M-C | Dernier Souvenir en V (plafond, défaite de l'emprunt) ; promotion d'un cousu de V qui te tue (et pas d'une mort par le Brumeux) |
| M-D | phase V conduite par le bot qui frappe, quatre formes, deux graines, courte et entière : **0 coup sans signe**, durée, gestes joués et sautés, fenêtres à nu, resserrements ; combat entier depuis `?brumeux=1` dans une forme (enchaînement I → V) |
| M-E | coût **apparié dans une seule page** ≤ +1,5 ms ; peinture des états 7 et 8 une tuile par image en IV ; entrée d'un essai `?brumeux=5` ≤ 250 ms |
| M-F | mouvements réduits (mort en fondu, resserrement sans secousse) ; captures relues : éclair, effondrement et fosse, pan du bord, montage court, emprunt de V, feinte double, deux resserrements et masque fendu, mort (cinq moments) |

- **A, B, D** n'ont plus de phase d'essai à éprouver : elles éprouvent le moteur sur un essai `?brumeux=5&essai=1` (la partition d'essai de 5a, gardée sous `partition.essai`).
- **F** (durée du combat entier) : limite revue avec la phase V réelle.
- **G** (règle d'or) contre **le commit de cette fiche** ; `banc-arene` rejoué entier (`BANC_AVANT` = ce commit).

**Mode d'essai** : `index.html?brumeux=5[&palier=…][&graine=n][&montre=tab:<décor>,cou:<id>,emp:<id>,…][&portes=…][&reserve=…][&ds=1][&bot=2][&classe=…][&dieu=0][&essai=1]` : `montre` injecte ce que le combat aurait montré (sinon les replis de l'essai), `essai=1` rejoue la partition d'essai de 5a ; console `__brumeux` : `etat().eff` (montré, candidats, resserrements, gestes joués et sautés), `resserrer()`, `montrer({…})`, `mourir()` (la scène, sans gagner).

**Régression** : tous les simulateurs, tous les bancs, puis `banc-gardiens-final` seul.

## 11 · Écarts au cadrage (à valider avec la fiche)

1. **Aucun geste signature neuf en V** : son socle ne rejoue que les quatre gestes de phase et la feinte (Q7 le disait pour la part improvisée ; la fiche l'étend au socle).
2. **L'état de départ de V est l'état 6** (pas de transformation IV → V) ; **deux états neufs, 7 et 8**, pour les resserrements (Q14 parlait de cinq états réels : il y en a six, plus les trois d'essai).
3. **Resserrements déclenchés par les PV** de la phase (2/3, 1/3), jamais par le temps.
4. **Les constructions ne sont plus effacées en entrant en V** (5a) : elles tombent une à une, et leur emprise devient une fosse (les tirs y passent).
5. **Effondrement sans construction : un pan du bord** (couloir de 150 × 320, sans fosse).
6. **« Feintes doublées » = deux feintes à la suite dans une mesure**, deux fois par boucle (quatre feintes par boucle, une en I à IV).
7. **« À nu après chaque geste » = après les quatre gestes de phase** (2,0 s ; emprunt défait 4,0 s), pas après une feinte ni une libre.
8. **Replis** : phase d'origine jamais jouée (essai) → tirage comme dans sa phase ; phase jouée mais rien n'en reste → la mesure saute.
9. **Tableau éclair** : demi-arène, budget moitié (2 / 2 / 3), vague seule, vie ≤ 8 s, accroche 0,8 s.
10. **Montage court** : un fil, 2,6 s, au plus un cousu vivant.
11. **Entracte 1,0 s**.
12. **Mesures libres en entière** : éléments et gestes signature des phases I à IV déjà montrés, lancés depuis son corps ; poids × (1 + 2 × part des dégâts reçus de cet élément dans ce combat).
13. **Un journal neuf du combat**, `X.montre` et `X.parC`.
14. **La scène de mort ajoute son masque** qui tombe et se brise (Q7 : la croix, les fils, l'arène).
15. **« L'arène redevient brume » est un dessin** (calque de brume), sans sol neuf ni mouvement des bornes.
16. **Son masque se fend à chaque resserrement** (braise).
17. **`SAVE.brumeux` reste v:1, sans champ neuf** (les détails sont déjà rangés par phase).
18. **Bancs A, B, D** sur la partition d'essai gardée (`&essai=1`).

## 12 · À valider aussi : les 13 écarts d'implémentation de 5e (§ 39)

1. Le porteur fantôme `brx18e` est mené par `sbMaj` enraciné : c'est la marche du Brumeux qui le porte (approche × 1,3), pas le `move` du Masqué ; pendant une ruée empruntée, son corps suit le porteur.
2. Le plancher de chargement (0,8 s, +0,3 s) est tenu en relevant `chargeS` des étapes copiées (5d prolongeait un chargement trop court).
3. Un emprunt dont aucune étape n'a chargé n'ouvre pas de fenêtre à nu : la mesure saute (« renoncé »).
4. La Volte : brèche à graine, puis vers toi, puis à ±0,6 rad ; la sortie « contre lui » n'existe que pour un rayon de joueur d'au plus 14 à 15 px (un Gouffre grossi sort par la brèche ou au-delà).
5. La Passe est un couloir aux bouts ronds ; son corps s'arrête à r du bord.
6. Les tirs d'un emprunt ont la grammaire des tirs ; ses ondes et ses trajectoires annoncées sont orange au liseré lavande.
7. Le premier emprunt est réglé à la première boucle ; le talent forcé par l'essai (`emp`) passe avant celui de la sauvegarde.
8. **Un trophée porté reste empruntable** (la brûlure le refuse) ; son liseré se pose aussi sur la ligne des trophées.
9. **`__asm.zr` exporté : les ondes des Masqués décousus disparaissent avec eux** (changement de comportement en phase III, dans son combat seulement).
10. La couleur `braise` (255, 214, 110) est ajoutée pour la fêlure et la dissolution (ΔE 34,6 de l'orange des zones).
11. La défaite est détectée au pas qui suit la brûlure ; un coup d'une copie défaite est en plus refusé dans `hurtPlayer`.
12. « Jamais deux fois de suite la même famille » se juge parmi les talents pas encore tirés de la boucle (le sans-remise passe d'abord) ; gravé une fois : 84,1 % des boucles, deux fois : 94,6 % (la fiche disait ≈ 82 et ≈ 93 %).
13. `banc-brumeux` F : limite du combat entier de 480 à 600 s (Tisse-Destin à 477 s).

## Découpage de l'implémentation, modèle et effort

Une seule implémentation, dans une autre conversation, dans l'ordre de la méthode : données (`brumeux.js` : `partition.effacement` (courte, entière), bloc `effacement`, `phases[4].arene:6`, `dessin.version` 6 ; `arene.js` : états 7 et 8) ; logique pure (`/*brx:pur*/` : `brxMontre` (ce que le combat a montré), `brxCandidatsV` (les quatre gestes et leurs replis), `brxPremierV`, `brxLibresV` (montrés, poids × dégâts), `brxResserrement` (seuils), `brxPanBord`, `brxFosse` (construction → fosses), `brxEclair` (moitié, budget)) et `sim-brumeux` section 14 ; section « v18.10 · Phase V » du bloc v18.5 (gestes rejoués en réutilisant les sections v18.6 à v18.9 avec leurs paramètres courts, resserrements, fosses, masque fendu, scène de mort) ; **retouches** : `vers` n'efface plus les constructions en V, `mort` dessine la scène de V, journal `X.montre` / `X.parC` alimenté par les sections v18.6 à v18.9 ; essai `?brumeux=5[&montre][&essai=1]` ; `banc-brumeux` section M (A, B, D sur `&essai=1`, F revue) ; journal v18.10, wiki (`--check`, rien de neuf), `memoire.md` § 40, `CLAUDE.md`, `REPRISE.md`, `bancs/README.md`, statuts ; régression complète.

**Modèle et effort : Opus 5.5, élevé** (le cadrage prévoyait moyen pour 5f) : la phase V rejoue les quatre phases précédentes avec des paramètres courts, ce qui touche chacune des sections v18.6 à v18.9, leurs bancs I à L, la transformation de l'arène en pleine phase et la fin du combat. Si l'auteur préfère « moyen », la couper en deux : **5f-1** (journal `X.montre`, les quatre gestes rejoués, feinte double, libres, partitions : Opus 5.5, élevé) puis **5f-2** (resserrements, fosses, masque fendu, scène de mort, banc M-E et M-F : Opus 5.5, moyen).
