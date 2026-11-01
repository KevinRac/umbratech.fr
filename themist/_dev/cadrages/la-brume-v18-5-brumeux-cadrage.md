# La Brume · v18.5 « Le Brumeux » · cadrage de l'action 5 (boss final)

Statut : **proposé le 1er novembre 2026, à valider par l'auteur.** Aucune ligne du jeu n'a été touchée. Rédigé à partir de `CLAUDE.md`, `_dev/REPRISE.md`, du cadrage v18 (D3, D5, D6, D8, V3–V8), de `_dev/memoire.md` (§ 1, § 26–28, § 31–34) et du code actuel (profil et contre-mesures v12, v16.1, v16.16 ; feinte v14 ; Masqué et montage v16.24–v16.29 ; armes de la Brume ; Glas qui se souvient ; némésis ; arène v18.4).

Hors champ : les six gardiens (IV à IX) et les deux miniboss (X), qui viennent à l'action 6 ; l'équilibrage d'ensemble et les emblèmes (action 7).

## Intention

Le Brumeux est celui qui **écrit la descente**. La fenêtre qui le présente avant le premier pacte le dit : « Ce n'est pas un monstre à abattre : c'est lui qui écrit les règles de la descente. » Au fond de l'acte X, pour la première fois, **il descend dans sa propre descente** et la réécrit sous tes yeux, autour de toi.

Le combat dure environ 5 minutes, en cinq phases distinctes. Il est très difficile de base et donne envie de recommencer, parce que chaque mort s'explique par un signe et que chaque partie le rend un peu différent.

### L'idée de l'auteur (1er novembre 2026)

> « Le Brumeux peut construire des éléments, des choses en fonction de la façon de jouer du joueur. On peut créer peut-être des décors ou autres durant des phases. »

Ce cadrage en fait **le cœur du combat**, à quatre niveaux :

1. **Une phase entière consacrée à la construction** (phase II, « L'Ouvrage », Q4). Le Brumeux bâtit l'arène contre ta façon de jouer : murailles si tu frappes de loin, douves si tu frappes au contact, colonnades si tu esquives sans cesse, et ainsi de suite.
2. **Ce qu'il bâtit reste.** Les phases III et IV se jouent dans l'arène que ton style a fait construire. La phase V l'efface.
3. **Des décors convoqués** en phase I : des fragments des actes que tu as traversés se lèvent dans l'arène, avec leurs ennemis et leurs règles de salle.
4. **Toute la part improvisée de toutes les phases** est pondérée par ce qu'il sait de toi (Q2).

Une limite est posée volontairement : **il n'invente qu'en assemblant des pièces connues du joueur**, comme il assemble déjà le Masqué (corps + capacités + souvenir). Rien n'est généré de toutes pièces : ni créature inédite, ni dessin produit au hasard. C'est ce qui garde la grammaire lisible et rend « aucune mort sans signe » vérifiable.

## Principes (rappel, ils s'appliquent à chaque question)

- **Règle d'or** : hors du combat final, rien ne change, au bit et à l'image près.
- **Image d'abord** : aucune bulle ni fenêtre qui arrête le joueur.
- **Aucune mort sans signe**, dans la grammaire de couleurs (orange `TELE.zone`, rouge `FOE`, violet `TELE.proj`, cyan `TELE.grab`, lavande, ivoire), avec un préavis du boss d'au moins 0,8 s (`arene.js`, `preavis.boss`). Toute nouvelle couleur reste à ΔE ≥ 25.
- **Secret** : rien ne dit comment il choisit, ni ce que contient chaque phase. Au plus une ligne de journal.
- **Pas de mur de PV** : un palier ajoute des mécaniques lisibles, pas de la résistance.
- **Mouvements réduits** respectés partout. Dessins vectoriels au canevas.

---

## Vue d'ensemble proposée

| Phase | Nom de travail (jamais affiché) | Son verbe | Idée de jeu | État d'arène | Part improvisée |
|---|---|---|---|---|---|
| I | **Le Rappel** | Il convoque | Il rejoue ta descente en trois tableaux : fragments de décor, ennemis, règles de salle. On vide le tableau, le rideau tombe, il est à nu. | Pleine (2 × 1,5 écrans) | ~25 % |
| II | **L'Ouvrage** | Il bâtit | Il construit l'arène contre ton style. On l'en empêche, on casse ou on retourne ses constructions contre lui. | Pleine, puis ce qu'il bâtit | ~40 % |
| III | **La Couture** | Il coud | Il assemble des Masqués sous tes yeux avec ce que tu as oublié (et ta némésis). On coupe ses fils avant la fin du montage. | Ses constructions restent ; des fils pendent | ~50 % |
| IV | **L'Emprunt** | Il imite | Duel : il descend, porte un masque à ta forme et joue ce que tu portes (ta mémoire). | Resserrée (~1 écran), constructions gardées dans les bornes | ~50 % |
| V | **L'Effacement** | Il efface | L'arène se défait, ce qu'il a bâti s'effondre, il enchaîne un geste de chaque phase. | Bande qui rétrécit, fosses | ~60 %, puisé dans ce que ce combat a déjà montré |

Le fil rouge des cinq phases est **sa feinte** (le cercle vrai ou faux, appris pendant la descente depuis v14). Elle revient dans chaque phase comme le Battement revient chez le Glas : c'est sa signature.

Sa présence suit l'arc. Phases I à III : **il est au-dessus de l'arène**, en marionnettiste ; ses mains, sa croix de manipulation et ses fils descendent, et c'est là qu'on le frappe. Phases IV et V : **il est au sol**, corps entier.

---

## Les questions

### Q1 · Le fil conducteur des cinq phases

- (a) Cinq phases sans lien, chacune une idée de boss.
- (b) **Un arc qui suit ce qu'il fait déjà dans le jeu** : convoquer (contre-mesures, Appel), bâtir (règles de salle, mutations), coudre (Masqué), imiter (ce qu'il sait de toi), effacer (la Brume). Chaque phase est un verbe, avec une présence qui descend vers le joueur.
- (c) Un arc par acte : chaque phase rappelle un gardien.

Conséquences : (a) est plus libre mais le combat ne raconte rien. (c) double la Mère-Brume, le Héraut et le Glas, qui sont intouchables (V1). (b) reprend sans doubler, et la phase V peut être un examen des quatre premières.

**Recommandation : (b), avec les cinq phases du tableau ci-dessus.** La feinte sert de fil rouge. Il est au-dessus de l'arène en I–III et au sol en IV–V.

### Q2 · Ce qu'il lit de toi, quand, et ce qu'il en fait

Ce que le jeu sait déjà de toi :

| Source | Où elle vit | Ce qu'elle dit |
|---|---|---|
| Profil de style, 6 axes | `profile()`, `RUN.prof`, `SAVE.mem.prof` (moyenne glissante entre descentes) | portée, esquive, soin, risque, rythme, puissance |
| Verdicts des contre-mesures | `SAVE.mem.prof.eff` (v16.1) | ce qui a déjà porté contre toi, et ce que tu déjoues |
| Accoutumance | `SAVE.mem.adapt` | la mécanique de ta forme sur laquelle tu t'appuies |
| Mémoire et réserve | `RUN.memoire`, `RUN.reserveBrume` | ce que tu portes, ce que tu as oublié (et quand) |
| Némésis | `SAVE.nemesis` | le Masqué qui t'a tué la dernière fois |
| Ce qui t'a tué | `stats17[].par`, `RUN.mem.lastSrc` | la source de tes dernières morts |
| Ta descente | `RUN` (actes traversés, salles) | les décors et les ennemis que tu as vus |

Moments de lecture :

- (a) une seule lecture, à l'entrée ;
- (b) **une lecture à l'entrée, puis une relecture à chaque changement de phase**, qui tient compte de ce combat ;
- (c) une adaptation continue, en pleine phase, comme le v16.16.

Conséquences : (c) brouille le socle à apprendre (le joueur ne saurait plus si un geste est fixe). (b) se voit en jeu sans rien expliquer : si tu as joué à distance en phase I, des murailles se lèvent en phase II.

**Recommandation : (b).**

- La lecture devient des **poids** dans les tirages de la part improvisée, jamais des chiffres du boss (PV, dégâts).
- Les verdicts « a porté » pèsent plus ; une contre-mesure abandonnée (déjouée deux fois) pèse moins.
- Le moment de lecture se montre en image : son regard pâle passe sur ton héros, puis son petit rire. **Aucune icône d'axe, aucun texte.**
- Les tirages suivent une graine de combat (`desRng`) : un combat se rejoue à l'identique à graine et lecture égales, ce qui rend les bancs possibles.
- Un compteur des dégâts reçus par source pendant la descente (`RUN.par18`) est à ajouter : aujourd'hui, seule la dernière source est notée.

### Q3 · Phase I, « Le Rappel » : il convoque ta descente

**Socle (fixe, appris).** Une boucle de trois tableaux. Pour chaque tableau :

1. Il « accroche » un tableau sur un tiers de l'arène : un **fragment de décor** d'un acte traversé se lève (sol, motif et couleur de cet acte, posé en calque cuit, sans peinture en combat).
2. Ses ennemis entrent dans ce fragment, selon un thème de vague existant (Meute, Tir croisé, Siège…). Une règle de salle peut couvrir le fragment seul (Verre, Sol qui se dérobe, Braseros, Brume plombée : dessins et règles déjà connus).
3. Le tableau vidé, **le rideau tombe** : ses mains retombent et il est à nu 3 s (anneau ivoire `G27.anneau`).

Entre deux tableaux, il lance un geste signature au sol (zones orange) et ses feintes.

**Part improvisée.**
- Quel acte, quel thème et quelle règle : pondérés vers ce qui t'a coûté le plus de PV dans cette descente.
- Le premier tableau rejoue ce qui t'a tué la dernière fois contre lui, s'il y en a (Q13).

Options :
- (a) **Tableaux par tiers d'arène** ;
- (b) toute l'arène change à chaque tableau ;
- (c) des vagues sans décor.

**Recommandation : (a).** C'est le « décor convoqué » de l'auteur. La règle de salle reste confinée à son fragment, et la vague du tableau garde ses règles (thème, rôles), en plus dense.

### Q4 · Phase II, « L'Ouvrage » : il bâtit contre ton style (idée de l'auteur)

**Socle.** Un cycle fixe :

1. **Bâtir** : annonce de 1,5 s (contour au sol et fils qui descendent de ses mains). Pendant l'annonce, **ses mains sont à nu** : les frapper assez fort annule la construction.
2. **Geste signature.**
3. **Bâtir.**
4. **Effondrement** : une de ses constructions, déjà debout, tombe dans une zone orange annoncée. Ce que tu n'as pas cassé peut te tomber dessus.

Feintes entre les temps.

**Part improvisée.** Quelle construction, lue sur ta façon de jouer : une par axe du profil, comme les contre-mesures, dont elles sont la version bâtie. **Chaque construction gêne ton style et offre une réponse.**

| Construction | Lue sur | Ce qu'elle gêne | La réponse qu'elle offre |
|---|---|---|---|
| **Murailles** (segments de 160–240 px) | portée haute | coupent tes lignes de tir, et les siennes | on les contourne ; une charge qui les heurte (Brute, Masqué, sa propre ruée) est sonnée ; elles se brisent |
| **Douves** (fosses en anneau, passerelles qui s'ouvrent à rythme fixe) | portée basse | tiennent le contact à distance | une fosse n'arrête pas les tirs ; un ennemi repoussé dedans tombe |
| **Colonnades** (piliers fins et serrés) | esquive haute | l'esquive en ligne droite bute | les piliers arrêtent aussi ses tirs : un abri contre les salves |
| **Rails** (une cloche roule sur un rail, préavis orange) | esquive basse | il faut esquiver de côté | le rail est fixe et lisible ; la cloche écrase aussi les ennemis |
| **Puits avides** | soin haut | tes soins sont bus dans son rayon | casse le puits : il rend d'un coup ce qu'il a bu |
| **Échafaudages** reliés à lui par des fils | rythme haut | il subit −40 % tant qu'ils tiennent (jamais invulnérable) | ~3 s de frappe chacun ; tomber un échafaudage le sonne |

Options pour le rôle des constructions :
- (a) **décor seul** : des obstacles qui ne blessent jamais ;
- (b) des pièges qui blessent ;
- (c) des obstacles plus des mécanismes annoncés : effondrement, rails.

**Recommandation : (c).** Une construction **ne blesse jamais en apparaissant** : elle repousse sans dégât, comme la transformation de l'arène. Ce qui blesse, c'est un mécanisme annoncé dans la grammaire (orange).

- Les constructions restent jusqu'à leur destruction ou jusqu'à la phase V.
- Au plus 6 en même temps, et au plus ~30 % de l'aire libre.
- Une couche « par forme » (contre la lumière du Lumenarque, la Cadence du Héraut…) est **reportée** : elle se fera après mesure, si les six axes ne suffisent pas à varier les parties.

### Q5 · Phase III, « La Couture » : il coud ce que tu as oublié

**Socle.**
- Trois fils descendent de sa croix vers trois points éloignés. À chacun, un **montage** commence : le corps descend, le masque tombe et il est cousu. C'est le montage existant (v16.28–29), ralenti à environ 4 s.
- **Couper un fil** (frapper son nœud, une cible visible) arrête ce montage-là.
- Les trois coupés, sa croix vacille et il est à nu.
- Un montage achevé donne un Masqué, qui entre dans le combat.
- La boucle reprend tant que la phase dure, avec au plus deux Masqués vivants.

**Part improvisée.**
- Corps et capacités, sous un budget de menace (`asmCombos`).
- Chaque Masqué cousu porte, s'il en reste, un souvenir de ta réserve : les plus récemment oubliés pèsent plus, et il le joue avec la justice existante (`sbMaj`, `sbPlafond`).
- **La pondération par le profil du Masqué (`poidsProfil`, coupée aujourd'hui) s'allume ici seulement.**
- Ta **némésis**, si elle n'a pas encore paru dans la descente, est le premier Masqué cousu, trousseau compris (Q13).

**Recommandation : ce socle.**
- Réserve vide : Masqués ordinaires, rien ne manque au combat.
- Les règles du Masqué ne changent pas : budget, une zone à la fois, venue au contact, renoncement.
- Un Masqué cousu ici ne lâche ni relique ni offre de reprise : la récompense du combat, c'est la victoire.

### Q6 · Phase IV, « L'Emprunt » : il joue ce que tu portes

**Socle.**
- L'arène se resserre à environ un écran : la caméra se fixe pour le duel.
- Il descend au sol, masqué à la couleur et à l'emblème de ta forme (la règle de couleur `G27.copie()` et ses exceptions s'appliquent).
- Son cycle alterne un **emprunt** et ses gestes de duel (orange). Un emprunt est un de tes talents portés, joué comme son arme de la Brume (lavande, classement de `souvenirs-brume.js` : la famille, une variante ou un renfort).
- Après chaque emprunt, il est épuisé et à nu, comme le Glas après ses Faisceaux.

**Part improvisée.** Quels talents : pondérés par rang et gravure ; un talent gravé est presque sûr d'être joué.

Options :
- (a) **il joue tes talents portés** ;
- (b) il te les prend un moment (fil vers ton héros, talent éteint tant que le fil n'est pas coupé) ;
- (c) il copie tes coups, comme la Mère-Brume.

Conséquences : (c) double la Mère-Brume. (b) est très marquant mais demande un recalcul du joueur en plein combat, et un talent qui s'éteint sans qu'on le choisisse frustre. (a) prend la Mémoire à revers : la phase III jouait ce que tu as oublié, la IV joue ce que tu portes. Elle se distingue du Reflet du Glas (une silhouette qui joue tes oublis) parce que c'est **lui**, en duel, avec ce que tu as encore.

**Recommandation : (a)**, avec un lien voulu au Dernier Souvenir : **brûler un talent qu'il est en train d'emprunter défait sa copie** (elle se dissout en braise) et le laisse à nu plus longtemps. C'est un usage de la mécanique propre au boss final, que rien n'explique.

### Q7 · Phase V, « L'Effacement »

**Socle.**
- L'arène se défait : ses bornes avancent par paliers annoncés, et ce qui a été bâti s'effondre (zones orange annoncées), puis tombe dans des fosses.
- Il enchaîne, à un rythme plus serré, un geste de chaque phase : un tableau éclair, un effondrement, un montage court (un seul fil), un emprunt.
- Feintes doublées.
- À nu après chaque geste.

**Part improvisée.** Elle ne puise **que dans ce que ce combat a déjà montré** : la phase V est un examen, rien n'y est inédit.

**Recommandation : ce socle.**
- En Normal et en Difficile, la phase est plus courte et réduite à son socle.
- En Extrême, elle est **entière**, avec toute sa part improvisée (`regles.extreme.brumeux.phaseEntiere`, Q12).
- Sa mort : la croix tombe, les fils se coupent, l'arène redevient brume. C'est une scène dans l'esprit de `SC27`, qui ne retarde rien.

### Q8 · La part improvisée : partition, budget, équité

Options :
- (a) un tirage libre à chaque instant ;
- (b) **une partition** : chaque phase est une boucle de mesures, les unes fixes (socle), les autres libres (improvisées), retirées à chaque boucle ;
- (c) des listes fixes par phase, mélangées.

**Recommandation : (b).** On apprend le rythme ; le contenu des mesures libres varie.

**Budget.**
- Chaque élément improvisable a une **menace** (zones, tirs, invoqués, Masqués, constructions), et chaque mesure libre a un budget.
- Le budget dépend du palier (Q12), jamais des PV du joueur.
- Deux éléments de même sorte ne se cumulent pas : une zone de boss à la fois au contact du joueur, au plus une saisie, au plus deux sources de tirs.

**Toujours une sortie.** Avant de poser une zone, le jeu vérifie qu'une sortie existe à ta vitesse de marche, comme `sbPlacer` / `sbArrivee` le font déjà pour les armes de la Brume. Sinon l'élément est remplacé ou sauté. Le simulateur le prouve sur des milliers de combats.

**Première rencontre.** Un élément improvisé que cette sauvegarde n'a encore jamais vu au combat final reçoit **+0,3 s de préavis**. La première mort contre lui s'explique, la suivante s'apprend.

**Signes.** Chaque zone du Brumeux est une source de signe à part entière (`arSignes`, `arJuge`). C'est le point ouvert (2) du § 34.

### Q9 · Les constructions, comme système

Règles proposées (vérifiées par simulateur et banc) :

1. Une construction ne blesse jamais en apparaissant : annonce, puis elle pousse sans dégât, avec l'attente de 1 s de `arTransObstacles`.
2. **Connexité** : après chaque construction, au moins 85 % de l'aire libre reste reliée à ta position, sur la grille de `FF` (inondation). Sinon, elle n'est pas posée.
3. Murailles, piliers et colonnades **arrêtent les tirs** (les tiens et les siens). **Les fosses non.** C'est la réponse au point ouvert (3) du § 34.
4. Toute construction se casse ou se contourne, sauf les douves, qui ont leurs passerelles. Ses PV sont modestes et lisibles (fissures dessinées par paliers), et elle ne compte ni dans le profil ni dans l'Accoutumance.
5. Une construction cassable est une entité fixe (`fixed`) hors de `enemies` pour l'IA. La règle « on ne frappe que ce qu'on voit » s'applique aussi à elle.
6. **Rendu** : une image par sorte de construction et par état de fissure, cuite à l'entrée. La carte `FF` est refaite une fois par construction, pas à chaque image. Budget à tenir : +1,5 ms (`budget.rendu`), mesuré en jeu réel.
7. **Aspect** : bâties avec des morceaux de Valsonne et des actes traversés (pierre des Faubourgs, bronze des Cryptes, chair du Cœur), jamais dans une couleur de la grammaire.
8. **Couleur d'annonce** : celle de la transformation (contour ivoire en pointillé) se confondrait avec l'ivoire du point faible quand ses mains sont à nu dans la même image. Une teinte « craie » à ΔE ≥ 25 de toute la grammaire est à choisir et mesurer à l'action 5a.

**Recommandation : ces huit règles.**

### Q10 · Son corps, son point faible, son glyphe, sa voix

- **Dessin.** Il prolonge son portrait existant (`BRX_SVG` : silhouette encapuchonnée, sans visage, deux yeux pâles, main tendue) et les fils du montage (croix de manipulation, aiguille).
  - Phases I–III : on voit ses mains et sa croix, en haut de l'arène ; son corps se devine dans la brume au bord du monde.
  - Phases IV–V : corps entier au sol, à l'échelle d'un gardien.
  - Il suit les règles des gardiens redessinés : corps plein dans 1,15 × r, `e.fade`, lumières par `ECR()`, cache par état.
- **Point faible.** Toujours l'anneau ivoire `G27.anneau` : ses mains (I, II), sa croix (III), son cœur sous le capuchon (IV, V).
- **Hors champ.** Le signe « boss » (anneau ivoire et œil) existe déjà.
- **Glyphe.** Une croix de manipulation avec un œil, en SVG 24 × 24 lisible à 16 px. Il remplace l'œil d'essai (point ouvert (4) du § 34) et va sur la porte `final`, la barre de vie et le wiki.
- **Voix.** Son cri au changement de phase, son petit rire court quand il agit (moteur de voix v16.46). Aucune parole.

**Recommandation : ce qui précède.** On garde le principe des gardiens : `dessin.version` et des portraits capturés par banc.

### Q11 · PV, durée, transitions

**PV.**
- Une barre en cinq segments marqués. Chaque phase a ses PV dans les données.
- Les dégâts au-delà d'un seuil ne passent pas à la phase suivante (même règle que le seuil de phase de `hitEnemy`).
- Calibrés pour qu'une phase dure **50 à 70 s** (médiane 60 s) pour un bot qui frappe et esquive, sur un build de référence de l'acte X, dans les quatre formes (Q14).

**Transition** (~3 s), **jamais une pause** :
- verrou (`verrouPhase` 1,2 s, il subit 15 %) ;
- son cri ;
- transformation de l'arène (`__arene.vers`) ;
- nouvelle présence ;
- relecture (Q2).

**Durée totale visée** : environ 5 min de combat plus 4 transitions.

Options en cas de lenteur :
- (a) **aucun « enrage »** ;
- (b) il accélère après 2 × la durée cible d'une phase ;
- (c) une mort au chronomètre.

**Recommandation : (a) au départ.** On mesure d'abord. (b) reste disponible pour l'action 7 si les parties exportées montrent des phases interminables. (c) est écartée : c'est un mur.

### Q12 · Les paliers

D3 dit : Extrême = « Brumeux avec sa phase finale entière ». Il n'y a pas de mutations au boss final (règle v18.3, inchangée).

| | Normal | Difficile | Extrême |
|---|---|---|---|
| Socle des phases I–IV | identique | identique | identique |
| Budget des mesures libres | base | +25 % | +50 % |
| Constructions au plus | 5 | 6 | 6 |
| Masqués vivants en III | 2 | 2 | 3 |
| Phase V | courte (≈ 50 % de ses PV), socle seul | courte, socle seul | **entière**, part improvisée comprise |
| Préavis | grammaire normale | identique | identique (jamais plus court) |

**Recommandation : ce tableau**, avec ces règles :

- **Jamais de PV ni de dégâts en plus selon le palier** : la phase V entière ajoute du contenu, pas de la résistance.
- Le soin complet d'après-gardien n'a pas lieu (c'est la fin) ; les soins du monde suivent déjà les règles du palier.
- Les chiffres sont à recaler à l'action 7.

### Q13 · Les liens avec le reste du jeu (reprendre, ne pas doubler)

- **Contre-mesures** : aucune dans la salle finale. Le combat est sa contre-mesure ultime, et leurs verdicts nourrissent ses poids (Q2).
- **Accoutumance** : elle s'applique comme pour un gardien (résistance des accoutumés, fenêtre « à nu » de ta forme). Elle n'est pas doublée par un nouveau système.
- **Mémoire et réserve** : la phase III joue ce que tu as oublié, la phase IV ce que tu portes.
- **Glas qui se souvient et Mère-Brume** : non repris tels quels. Pas de Reflet, pas de copie de capacité.
- **Dernier Souvenir** : actif. Le Brumeux est un fort (`fortE`), donc les plafonds s'appliquent, plus le lien de la phase IV (Q6).
- **Némésis** :
  - elle est le premier Masqué cousu en phase III ;
  - un Masqué cousu qui te tue est **promu normalement** (c'est un Masqué) ;
  - mort par le Brumeux lui-même : pas de promotion ;
  - la règle actuelle n'est pas changée : une némésis garde le **registre** de son acte (§ 31), donc une némésis promue à l'acte X revient dès l'acte III de la descente suivante, à sa salle ; si elle n'a pas encore paru dans la descente quand tu arrives au fond (cas rare, puisqu'elle revient dès l'acte III), elle est cousue la première en phase III.
- **Mémoire de ses victoires** : une sauvegarde `SAVE.brumeux` (versionnée `v:1`) garde le nombre de tentatives, la phase atteinte et **l'élément qui t'a tué**, par phase. Au combat suivant, il rejoue d'abord ce qui t'a tué : on peut l'apprendre. Une descente d'essai n'écrit rien.
- **Pactes** : aucun pendant le combat. Pas de fenêtre en descente ; l'acte X garde son pacte d'entrée tel quel.
- **Résonances, reliques, équipement** : inchangés.
- **Statistiques** : temps et coups reçus par phase, tentatives, durée des images à l'acte X (moyenne et pire 5 %) : c'est le point ouvert (1) du § 34.

**Recommandation : ces liens.**

### Q14 · Mesure, simulateur et bancs

**Données** : `data/brumeux.js`, nouveau. Il contient les phases, la partition, la menace de chaque élément, les constructions, les poids de lecture, les PV par phase, les paliers et le dessin. `data/arene.js` reçoit cinq états réels, à la place des trois états d'essai.

**Logique pure** : bloc `/*brx:pur*/`. Il contient la lecture vers les poids, la partition et les tirages par graine, le budget, la sortie garantie, la connexité et le placement des constructions, les seuils de PV et la mémoire `SAVE.brumeux`.

**Simulateur** : `outils/sim-brumeux.mjs`. Il vérifie :
- le déterminisme à graine égale ;
- aucune zone sans sortie, sur 10 000 combats abstraits ;
- la connexité sur 10 000 constructions ;
- le budget par palier ;
- les couleurs (ΔE ≥ 25) ;
- le secret : le wiki ne contient ni « phase », ni « tirage », ni « construit », ni « graine » dans ses sections ;
- les branchements.

Avec des contre-épreuves (erreurs introduites exprès, qui doivent être attrapées).

**Bot qui frappe** (nouveau, `bot=2`) : le pilote actuel esquive et vise, mais **ne frappe pas**. Il faut un pilote qui attaque avec le kit de base de chaque forme, sorte des zones et coupe les fils. Sans lui, aucune durée n'est mesurable.

**Banc** : `_dev/bancs/banc-brumeux.mjs`, avec ces sections :
- **A** : la lecture et les tirages en jeu égalent la logique pure ;
- **B** : le socle de chaque phase ;
- **C** : **0 coup sans signe** sur N combats conduits par forme (journal `arJuge`, zones comprises) ;
- **D** : les constructions (poussée, connexité, destruction, persistance, coût) ;
- **E** : les paliers ;
- **F** : la durée par phase (bot qui frappe) ;
- **G** : la règle d'or, image par image, toutes les salles sauf la finale dans les trois paliers, contre l'`index.html` d'avant ;
- **H** : mouvements réduits et tailles d'écran.

Captures relues à l'œil.

**Recommandation : ce dispositif.** On garde le bot qui frappe pour mesurer ensuite les gardiens de l'action 6 et la durée réelle de la descente.

### Q15 · Les points ouverts du § 34

| Point ouvert | Proposition |
|---|---|
| (1) Coût de l'arène au ras du budget | Durée des images relevée en jeu à l'acte X, dès l'action 5a ; mesure en vraie partie. |
| (2) Zones du Masqué non signées une à une | Toutes les zones du Brumeux le sont (Q8) ; celles des Masqués cousus aussi, dans l'arène. |
| (3) Une fosse arrête les tirs | Plus maintenant : les fosses laissent passer les tirs, murs et piliers les arrêtent (Q9). |
| (4) Glyphe d'essai | Son vrai glyphe (Q10) ; la légende des signes de bord au wiki, à l'allumage (Q16). |
| (5) Son des télégraphes hors champ | Reporté à l'action 7 (lisibilité), sauf si le banc C trouve des morts hors champ mal lues. |
| (6) « On ne frappe que ce qu'on voit » | Gardé. Revu en banc avec le kit complet contre lui (rebonds, ciblage automatique). Le Brumeux, au-dessus de l'arène, est toujours visible ou signalé. |

**Recommandation : ces six décisions.**

### Q16 · Wiki et journal

- (a) Rien.
- (b) **Une carte « Au fond de la Brume »** : son portrait, son glyphe et une seule phrase, dans l'esprit de la ligne du Glas (« Tu la reconnaîtras »). Par exemple : « Il a écrit chaque salle de ta descente. Au fond, il les réécrit. »
- (c) Une fiche des phases.

**Recommandation : (b)**, plus une section générale **« Les signes au bord de l'écran »** (la légende des signes de bord : ce n'est pas un secret, c'est de la lisibilité).

- Le wiki ne dit **jamais** combien il a de phases, ce qu'elles contiennent, qu'il bâtit selon ton style, ni comment il choisit.
- Une ligne de journal à l'allumage, sans phase ni mécanique.
- La phrase exacte est à choisir par l'auteur.

### Q17 · Découpage, ordre, allumage

**Recommandation.** Chaque action garde la méthode complète : données, logique pure et simulateur, bloc de jeu, essai, banc, journal, wiki, mémoire, `CLAUDE.md`, régression, commit. **L'arène reste éteinte et le boss final provisoire en jeu jusqu'à 5g** : la descente reste jouable à chaque étape, et chaque phase s'essaie par l'adresse (`index.html?brumeux=<phase>[&palier=…][&graine=…][&reserve=…][&bot=2]`, qui pose `RUN.essai`, ajouté à `ESSAI18` et `ESSAI_URL` ; console `__brumeux`).

| Action | Contenu | Modèle, effort |
|---|---|---|
| 5a | Socle technique :<br>• `brumeux.js`, bloc `/*brx:pur*/` et `sim-brumeux`<br>• lecture, partition, budget, sortie garantie<br>• présence et dessin de base, barre en segments, transitions<br>• `SAVE.brumeux`, statistiques<br>• bot qui frappe, durée des images, zones signées<br>• essai et banc de base | **Opus 5.5, élevé** |
| 5b | Phase I, Le Rappel (fragments de décor, tableaux, rideau) | **Opus 5.5, élevé** (elle fixe la méthode des phases) |
| 5c | Phase II, L'Ouvrage, et le système de constructions (Q9) | **Opus 5.5, élevé** |
| 5d | Phase III, La Couture (montage, fils, Masqués de la réserve, némésis) | Opus 5.5, moyen |
| 5e | Phase IV, L'Emprunt (duel, talents portés, Dernier Souvenir) | Opus 5.5, moyen |
| 5f | Phase V, L'Effacement, et la scène de mort | Opus 5.5, moyen |
| 5g | Enchaînement, PV et durée au bot, paliers, **allumage de l'arène** (`actif:true`), wiki, journal | **Opus 5.5, élevé** |
| 5h | Relecture indépendante (un agent qui n'a pas écrit le code) et corrections | **Opus 5.5, élevé** |

Chaque action de phase (5b à 5f) commence par une **fiche courte** validée par l'auteur : ses gestes signature (noms, formes de zone parmi les neuf connues, préavis, dégâts) et sa partition chiffrée. Ce cadrage fixe le cadre ; il ne fixe pas chaque attaque.

---

## Risques

- **Volume** : c'est le plus gros morceau du jeu. Le découpage en 8 actions, avec la descente jouable entre chacune, le contient.
- **Lisibilité sous la densité** : budget, « toujours une sortie », première rencontre et banc C, à 0 coup sans signe, sont les garde-fous. La difficulté vient de l'enchaînement, pas de l'illisible.
- **Coût de rendu** : constructions, fragments de décor, Masqués et signes dans une arène de 2 × 1,5 écrans. Images cuites, `FF` refait par construction, mesure en vraie partie.
- **Improvisation qui frustre** : le socle ne change jamais, et ce qui t'a tué revient en premier.
- **Secret contre lisibilité** : on montre tout ce qui frappe et on ne dit jamais pourquoi.
- **Cohérence** avec la Mémoire, la némésis et le Dernier Souvenir : traitée en Q13.

## Ce que ce cadrage ne décide pas

Les gestes signature de chaque phase (fiches 5b à 5f), les PV exacts (mesurés au bot), la phrase du wiki (choix de l'auteur), et la couche de constructions « par forme » (après mesure).

**Pour valider : « toutes les recommandations », ou question par question. Étape suivante : l'action 5a, Opus 5.5, élevé, dans une autre conversation.**
