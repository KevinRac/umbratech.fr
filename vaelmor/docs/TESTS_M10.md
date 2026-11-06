# Vaelmor — M10 : bugs, essais et sessions de test

> Fichier unique du jalon M10 (décision n°231) : barème de gravité, audit, liste des bugs, protocole et retours des testeurs.
> Critère du GDD §17 : session de 60 min sans bug majeur, 3 testeurs externes.

## Barème de gravité (n°230)

| Gravité | Définition | Exemples |
|---|---|---|
| **Bloquant** | On ne peut plus avancer, ou une sauvegarde est perdue. | Écran figé, passage qui ne s'ouvre jamais, sauvegarde illisible. |
| **Majeur** | Une règle est fausse, le jeu plante mais peut repartir, ou de la progression est perdue. | XP non versée, combat qui ne finit pas, fonction validée absente, fuite qui ralentit une session. |
| **Mineur** | Défaut de visuel, de texte ou de confort. | Texte coupé, contraste faible, libellé périmé. |

M10 est tenu quand **aucun bloquant ni majeur** n'est ouvert après les trois sessions. Les mineurs restants sont listés.

## Lot A — audit (05/11/2026)

### Ce qui a été essayé

| Essai | Méthode | Résultat |
|---|---|---|
| Suite de tests | `npm test` | 823 / 823 au vert |
| Parcours du titre au monde | Chrome sans interface (SwiftShader), clavier : titre → classe → règle → monde → marche → menu (5 onglets) → pause | Sans erreur |
| 30 allers-retours monde ↔ combat | F8 (Camp des Écumeurs), F2 (victoire), retour ; tas JS après ramasse-miettes tous les 5 combats | Aucun blocage ; **fuite mémoire** (A-01), corrigée |
| Écran rapproché | Banc `?debug&closeup=` : héros et 12 classes, contre 17 ennemis et boss, critique + coup fatal et double attaque (26 échanges) | Sans erreur console |
| Toutes les rencontres | IA contre IA, 34 rencontres × 20 graines, compagnie d'essai au niveau moyen de la zone | Aucune exception, aucun combat sans fin (60 tours) ; taux de victoire à reprendre au lot F (A-10) |
| Villages | Dialogues de Maëlys (repos payé), Bran (achat en boutique), Thom, Capitaine Ilar | Sans erreur |
| Pause | Échap ouvre et ferme, « Reprendre » | Correct |
| Fenêtre | 960×540, 1366×768 à 125 %, 800×500 | Canevas fixe centré (n°40), réduit en petite fenêtre |
| Textes | Recherche des textes provisoires visibles par le joueur | « Les options arrivent au jalon M10 » (A-03) |

### Liste des bugs et manques

| # | Gravité | Constat | Lot | État |
|---|---|---|---|---|
| A-01 | Majeur | **Fuite mémoire** : +0,6 Mo par aller-retour monde ↔ combat (111 → 132 Mo en 30 combats). Cause : Phaser 4.2.1 ne rend pas les textures de données des couches GPU (`TilemapGPULayer.layerDataTexture`), ni celle des tuiles animées ; `destroy()` seul laisse l'enveloppe dans la liste du moteur. | A | **Corrigé** : `releaseGpuTilemapOnShutdown` (`render/tileAnimations.ts`), appelé par le monde et le combat ; tas stable (116 Mo après 15 combats) ; garde-fou dans `tests/architecture.test.ts`. |
| A-02 | Majeur | **Aucune musique** : les 13 pistes Suno sont dans `music/` (62 Mo de MP3 à 320 kbps), rien ne les charge. | C | Corrigé : lecteur de musique, boucles trouvées et cuites, Opus/AAC chargés à la demande. |
| A-03 | Majeur | « Options » du titre affiche « Les options arrivent au jalon M10 ». | B | Corrigé : écran Options (titre, pause, menu, combat). |
| A-04 | Majeur | **Voyage rapide** (décision n°7) jamais codé ; la touche N (carte de l'île) est liée mais sans effet. | B | Corrigé : carte de l'île (N, onglet Carte) et voyage rapide. |
| A-05 | Mineur | HUD d'exploration : ni portrait, ni niveau du héros, ni blessés (GDD §13.1). | B | Corrigé : fiche du héros sous le nom de zone. |
| A-06 | Mineur | Réglages dispersés : qualité dans la pause du monde ; vitesse, vue, effets réduits et sons dans le menu de carte du combat. | B | Corrigé : tout passe par l'écran Options. |
| A-07 | Mineur | Le titre et le debug affichent « prototype M9 » (`MILESTONE`). | B | Corrigé. |
| A-08 | Majeur | Aucun son hors combat : interface, pas, détection « ! », entrée de village, ambiances. | D | Corrigé : bruitages d'interface et du monde, pas selon le sol, 5 ambiances, sons de combat refaits, mixage ; planche d'écoute validée par l'auteur. |
| A-09 | Majeur | Accessibilité (GDD §13.8) : seul « Effets réduits » existe, et seulement en combat. | E | Corrigé : remappage des touches, texte ×1 / ×1,25, vitesse du texte, mode daltonien (motifs, formes de camp, crans), effets réduits étendus au monde, aux menus et à la carte de combat, `prefers-reduced-motion` ; captures validées par l'auteur. |
| A-10 | Majeur | IA contre IA avec la compagnie d'essai : 100 % de victoires en Z1 et Z2, puis 0 à 50 % dès Z3 et 0 % contre tous les boss après Brakk. La compagnie d'essai n'était pas une compagnie réelle. | F | Corrigé : simulateur (`npm run simulate`) et compagnie réaliste par zone ; avant retouches ordinaires 66 %, boss 17 % ; après, ordinaires 82 % en 6,7 tours, boss 50 %, aucune classe de héros sous 66 % (`docs/EQUILIBRAGE_M10.md`). Restent hors cible quelques rencontres (§4 du rapport), à valider. |
| A-11 | Mineur | « Combat d'essai » est proposé à tous sur le titre. | B | Corrigé : seulement avec `?debug`. |
| A-12 | Mineur | L'aide des touches en bas de l'écran du monde se lit mal sur l'herbe claire. | B | Corrigé : texte plus clair, touches E, Tab et N ajoutées. |
| A-14 | Majeur | L'Échap qui ferme le menu (Tab), un dialogue ou la carte ouvre aussitôt la pause ; sur une machine lente, la touche qui ferme une fenêtre peut la rouvrir. | B | Corrigé : le monde attend 250 ms **et** deux images après une fenêtre (`inputReady`). |
| A-15 | Majeur | Après un chargement depuis la partie (et un voyage), l'or et la fiche du héros disparaissent du HUD jusqu'au prochain menu. | B | Corrigé : le HUD garde ces valeurs quand il redémarre. |
| A-13 | À mesurer | Le jeu tient en un seul fichier JS de 2,2 Mo ; les musiques pèsent 62 Mo. | C, G | Corrigé : musiques en webm / m4a à la demande (lot C) ; JS en trois fichiers hachés, Phaser à part, retour après mise à jour −57 % (lot G, `docs/PERF_M10.md`). Reste le poids des feuilles de combat au démarrage (n°272). |
| A-16 | Majeur | L'écran rapproché du combat fuit deux tweens en boucle par échange (+26 Ko de tas chacun ; +12,6 % sur 100 échanges). | G | Corrigé : tweens retirés à la fermeture ; tas à −0,5 % sur 100 échanges. |

Non reproduits (fausses alertes du banc) : la pause qui ne se ferme pas, le dialogue qui ne se ferme pas à Échap (Échap fait d'abord avancer les répliques, puis ferme le menu de réponses : comportement voulu).

## Protocole des sessions de test (n°247, n°248, n°273 à n°278)

### Principe

- **Trois testeurs**, recrutés par l'auteur, une session de **60 minutes** chacune, **depuis « Nouvelle partie »**, sur la version en ligne, **sans `?debug`**.
- Le testeur joue seul, sans aide ; l'auteur observe s'il est présent (voir « Observer ») ou lit le carnet après coup.
- **Rien n'est envoyé tout seul** (n°247) : le testeur copie ou télécharge ses signalements et les remet à l'auteur (message, courriel, dépôt de fichier : au choix de l'auteur).
- Critère de réussite (GDD §17, n°230) : **aucun bloquant ni majeur ouvert** après les trois sessions. Les mineurs restants sont listés dans « Retours des testeurs ».

### Avant la session (5 min, par l'auteur)

1. Version en ligne à jour : le titre affiche la version et « M10 » ; **F10 : signaler un problème** s'affiche en bas à droite.
2. Navigateur récent (Chrome, Edge, Firefox) sur ordinateur, clavier, fenêtre d'au moins 960×540. Une autre machine et un autre navigateur par testeur si possible.
3. Stockage du navigateur vide pour ce site (fenêtre privée ou profil neuf) : le journal et le carnet y sont gardés, ils doivent partir de zéro.
4. Consigne donnée au testeur, mot pour mot :
   > « Joue comme tu veux pendant une heure, sans lire de guide. Quand quelque chose te paraît faux, cassé, incompréhensible, ou au contraire te plaît, appuie sur **F10** et note-le en une ou deux phrases : le jeu se fige le temps que tu écris, tu ne perds rien. Ne cherche pas à bien faire : un signalement trop court vaut mieux qu'un oubli. À la fin, F10 puis « Exporter la session », et envoie-moi le texte. »

### Déroulé (60 min)

| Minute | Ce qu'on attend | Ce qu'on regarde |
|---|---|---|
| 0–5 | Titre, classe, règle de mort, premier pas dans Haut-Gué | A-t-il compris ce qu'il doit faire sans qu'on le lui dise ? Les écrans de choix sont-ils lisibles ? |
| 5–20 | Village : dialogues, boutique, repos, premiers pas hors des murs | Trouve-t-il les PNJ, la boutique, la sortie ? Comprend-il la réputation ? |
| 20–40 | Premières rencontres : détection, préparation, combats tactiques | Lit-il la portée, les menaces, les ripostes ? Comprend-il l'écran de préparation et le résultat ? |
| 40–55 | XP, évolution, deuxième zone, sauvegarde et rechargement | Sait-il qu'il a sauvegardé ? Retrouve-t-il sa partie ? |
| 55–60 | Fin de session | F10, « Exporter la session », questionnaire |

Le testeur n'a pas besoin de finir le jeu : le critère porte sur l'absence de bloquant ou de majeur, pas sur la durée de vie.

### Observer (si l'auteur est présent)

- Ne pas aider, ne pas expliquer. Noter l'heure et la phrase du testeur quand il hésite plus de 20 secondes ou dit « je ne comprends pas ».
- Ne pas toucher à la fenêtre du jeu : tout ce qui sert au diagnostic est déjà dans le journal.

### Le kit du testeur (F10)

| Élément | Ce que c'est | Ce qu'il contient |
|---|---|---|
| **F10 « Signaler un problème »** | Écran qui fige le jeu, disponible partout (titre, monde, combat, menus) | Un type, une gravité (pour un problème), une description libre |
| **Types** | Problème · Je ne comprends pas · Remarque ou idée · Ça m'a plu | Le type « Problème » reprend le barème (bloquant, majeur, mineur : avis du testeur, l'auteur tranche) |
| **Rapport** | Texte brut, montré en entier avant d'être copié | Description, version, durée de session, partie (héros, niveau, lieu, or, mode), scènes ouvertes, navigateur, écran, réglages, **60 dernières lignes du journal** ; jamais la sauvegarde ni une adresse de courriel |
| **Capture** | Image PNG de l'écran au moment de F10 | À télécharger à part si utile |
| **Carnet** | Tous les signalements de la session, gardés dans le navigateur | Survit à un rechargement ou à une fermeture accidentelle |
| **Exporter la session** | Un seul texte : contexte, résumé, carnet, journal complet | C'est ce que le testeur envoie en fin de séance |
| **Journal** | Lignes horodatées écrites par le jeu (600 au plus, circulaires) | Scènes, lieux, combats, sauvegardes, chargements, réglages, erreurs, avertissements, fluidité toutes les 20 s, baisse de qualité automatique, fermeture de page |

Si le jeu plante et que la page est rechargée, le journal de la session précédente est relu : la ligne de démarrage indique « session précédente : interrompue » ou « propre ». Le testeur peut alors ouvrir F10 et exporter ce qui s'est passé avant le plantage.

### Carnet papier (secours)

Si F10 ne s'ouvre pas (bug du kit lui-même, navigateur qui capte la touche) : le testeur note à la main, une ligne par fait, et en fin de séance l'auteur recopie.

| Heure | Où j'étais | Ce que j'ai fait | Ce qui s'est passé | Type (P / ? / ! / +) |
|---|---|---|---|---|
| | | | | |

### Questionnaire de fin de session (5 min)

Échelle : 1 = pas du tout d'accord · 5 = tout à fait d'accord.

| # | Affirmation | 1 | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|---|
| Q1 | J'ai su quoi faire dans les cinq premières minutes | | | | | |
| Q2 | Je comprenais toujours ce que mes unités pouvaient faire en combat | | | | | |
| Q3 | Les dégâts, les portées et les menaces étaient faciles à lire | | | | | |
| Q4 | Les combats étaient de la bonne difficulté | | | | | |
| Q5 | J'ai compris ce que change la réputation | | | | | |
| Q6 | Le monde m'a donné envie d'explorer | | | | | |
| Q7 | Le jeu a toujours répondu vite (pas de ralentissement) | | | | | |
| Q8 | J'ai su quand et comment j'étais sauvegardé | | | | | |
| Q9 | Les textes étaient clairs et agréables à lire | | | | | |
| Q10 | Je rejouerais une heure de plus | | | | | |

Questions ouvertes :

1. Qu'est-ce qui t'a le plus plu ?
2. Qu'est-ce qui t'a le plus agacé ou perdu ?
3. À quel moment as-tu failli arrêter ?
4. Qu'est-ce qui manque pour que tu y rejoues demain ?
5. Qui d'autre y jouerait, selon toi, et pourquoi ?

Profil (facultatif) : habitude des jeux tactiques (jamais · un peu · beaucoup), navigateur, machine, durée réelle de la session.

### Lire l'export

1. **Résumé de la session** : durée, écrans parcourus, combats (victoires, défaites), sauvegardes réussies ou en échec, erreurs, fluidité (images par seconde, pire image, part d'images lentes), baisse de qualité.
2. **Tout ce qui est rouge** : une ligne « erreur » dans le journal, une sauvegarde en échec, une session précédente « interrompue », ou une fluidité sous 30 ips est un candidat bloquant ou majeur.
3. **Carnet** : trier par type puis par gravité proposée ; retrouver chaque signalement dans le journal à l'heure indiquée (« mm:ss de session »).
4. Reporter chaque constat retenu dans le tableau ci-dessous, avec une gravité tranchée par l'auteur selon le barème n°230.

### Fiche de session (à copier pour T1, T2, T3)

```
Testeur : T_  · date · navigateur / machine · durée réelle
Version du jeu · session précédente (propre / interrompue / aucune)
Résumé : combats · sauvegardes · erreurs · fluidité
Questionnaire : Q1 _ Q2 _ Q3 _ Q4 _ Q5 _ Q6 _ Q7 _ Q8 _ Q9 _ Q10 _
Constats retenus : (n° T_-01, gravité, description, état)
Ouvert / corrigé / refusé : décompte
```

### Critère de sortie

- Aucun bloquant ni majeur **ouvert** après les trois sessions (corrigés, ou refusés avec une raison écrite).
- Si un bloquant ou un majeur apparaît : on le corrige, puis **la même session est rejouée** par un testeur qui n'a pas vu le correctif (les deux autres n'ont pas à rejouer sauf si la correction touche leur parcours).
- Les mineurs restants sont listés ici ; ceux qui touchent à la lisibilité du combat ou à la compréhension du premier quart d'heure sont traités avant la 1.0.0 (n°249).

## Retours des testeurs

*À remplir après les sessions : une fiche par testeur (modèle ci-dessus), puis le tableau des constats.*

| # | Gravité | Testeur | Constat | Lot ou correctif | État |
|---|---|---|---|---|---|
| | | | | | |

| Testeur | Date | Navigateur / machine | Durée | Session précédente | Q1 à Q10 | Remarque principale |
|---|---|---|---|---|---|---|
| T1 | | | | | | |
| T2 | | | | | | |
| T3 | | | | | | |
