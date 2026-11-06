# Vaelmor — M10 : bugs, essais et sessions de test

> Fichier unique du jalon M10 (décision n°231) : barème de gravité, audit, liste des bugs, banc automatique, protocole et retours de la session de l'auteur.
> Critère du GDD §17 (n°279) : aucun bloquant ni majeur ouvert après la session de 60 min de l'auteur depuis « Nouvelle partie », sans `?debug`, et après le banc automatique.

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


## Banc automatique de session (n°279)

`npm run session-bench` (`tools/session-bench.mjs`) : un bot joue une session « depuis Nouvelle partie » dans Chrome sans interface, au clavier uniquement, sur le build de `play/` servi tel quel. Options : `--minutes 60` (temps de jeu), `--cycle 12` (minutes entre deux sauvegardes suivies d'un rechargement), `--shots dossier`, `--out rapport.json`, `--seed`, `--verbe`.

| Élément | Règle |
|---|---|
| Ce que joue le bot | Titre → « Nouvelle partie » → choix de la classe → monde : marche jusqu'à l'ennemi le plus proche par le chemin A* du jeu, parle aux PNJ rencontrés, sort des impasses ; combat : préparation, déplacements, attaques, objets et menus joués par l'IA prudente du simulateur (`logic/ai/prudentAi.ts`), par les touches ; écran de résultat ; toutes les 12 min : menu (Tab) → Sauvegarde → emplacement 1 (avec les deux confirmations d'écrasement) → rechargement de la page → « Continuer » (le titre est donc exercé aussi) |
| Contrôle du rechargement | Niveau, or et position (24 px) de la partie rechargée comparés à ceux de la partie au moment de la sauvegarde ; un écart est un échec |
| « Accéléré » | Aucune pause de lecture ni d'hésitation, combats enchaînés : une heure de bot contient bien plus de combats qu'une heure humaine. L'horloge n'est pas accélérée : le temps de jeu est celui que le jeu compte lui-même (image par image, plafonné à 250 ms par image) |
| Sans `?debug` | L'adresse est celle d'une vraie session. Seule différence : le serveur du banc réécrit à la volée la condition `?debug` de `main.ts` pour exposer `window.vaelmor` (lecture de l'état) ; aucune commande ni étiquette de debug n'existe dans la page et le bot n'appuie jamais sur F2 à F9 |
| Verdict | `logic/testkit/sessionCheck.ts` (testé : `tests/sessionCheck.test.ts`) lit le journal de session du kit de test (`vaelmor:journal`, relu toutes les 20 s et fusionné) et **échoue** sur : toute ligne « erreur » ; toute sauvegarde en échec (`ok:false` ou texte d'échec) ; tout blocage (aucune ligne de fluidité pendant plus de 90 s, session sans ligne de fluidité récente à sa fin) ; en plus, côté bot : aucune image dessinée pendant 20 s, aucun progrès pendant 6 min malgré les relances, sauvegarde manuelle non écrite, partie rechargée différente |
| Notes (sans échec) | Baisses de qualité automatique, lignes « avert », sessions précédentes interrompues hors rechargements voulus. Le navigateur sans carte graphique (SwiftShader) donne ~15 ips dans le monde : les ips ne sont pas un critère du banc, elles se jugent sur la machine de l'auteur (F3) |
| Hors du banc | Le ressenti, la lisibilité, la difficulté et tout ce qu'un bot ne voit pas : c'est la session de l'auteur |

### Résultats du banc

Exécution du 06/11/2026, build de `play/` du lot H fusionné (Chrome sans interface, rendu logiciel SwiftShader), `--minutes 60 --cycle 12`, graine 1.

| Mesure | Résultat |
|---|---|
| Temps de jeu / horloge | 60 min 08 s / 61 min 54 s |
| Verdict du journal (`checkSession`) | **OK** : 0 ligne « erreur », 0 ligne « avert », 18 sauvegardes réussies, 0 en échec, 0 blocage |
| Combats | 11 joués, 11 victoires, 0 défaite (héros niveau 1 → 11, or 150 → 1 477) |
| Sauvegardes manuelles + rechargements | 4, tous suivis de « Continuer » : niveau, or et position identiques à la partie sauvegardée |
| Erreurs vues par Chrome (exceptions, `console.error`) / fichiers introuvables | 0 / 0 (hors `favicon.ico`, ignoré) |
| Fluidité (rendu logiciel, non représentatif) | médiane 23 ips, minimum 12,5, pire image 983 ms |
| Tas JS | 94 Mo au début, 102 Mo à la fin, pic 114 Mo : pas de dérive sur 60 min (critère ±10 % du lot G tenu) |
| Notes | qualité automatique baissée 2 fois (low, off), attendu sans carte graphique ; la page rechargée par le banc n'écrit pas sa ligne de fermeture (le rechargement n'est pas une fermeture d'onglet) |

**Deux fausses alertes du banc, corrigées dans le banc, pas dans le jeu** : aux deux dernières sauvegardes, le banc a écrit « sauvegarde manuelle non écrite » alors que l'emplacement 1 avait bien été réécrit (date et temps de jeu de l'emplacement avancés, partie rechargée identique). Cause : il comptait les lignes de sauvegarde du journal, qui est circulaire (600 lignes), et une ancienne ligne sortait quand la nouvelle entrait. Le banc compare désormais la date d'écriture de l'emplacement 1 dans le stockage du navigateur ; vérifié sur une exécution courte (2 sauvegardes, 2 rechargements identiques). La longue exécution n'a pas été rejouée.

**Ce que le banc ne dit pas** : la lisibilité, la difficulté ressentie (l'IA prudente gagne 11 combats sur 11, ce qui dit seulement que les premiers actes sont jouables), les 60 ips sur une vraie carte graphique, l'audio, la souris, les écrans qu'un bot ne visite pas (boutiques, quêtes, carte de l'île, options, F10 : le bot ne les ouvre pas, un seul dialogue a été exercé). C'est le rôle de la session de l'auteur.

## Protocole de la session de l'auteur (n°247, n°248, n°273 à n°279)

### Principe

- **Une seule session**, jouée par l'auteur : **60 minutes** depuis **« Nouvelle partie »**, sur la version en ligne, **sans `?debug`**, après le banc automatique. Il n'y a pas de testeur externe.
- Il joue comme un joueur, sans guide, et note ce qui cloche avec **F10** (le jeu se fige le temps d'écrire).
- **Rien n'est envoyé tout seul** (n°247) : l'auteur exporte la session et la remet au développement (collage dans la conversation).
- Critère de réussite (GDD §17, n°230, n°279) : **aucun bloquant ni majeur ouvert** après cette session et le banc. Les mineurs restants sont listés dans « Retours de la session ».

### Avant la session (5 min)

1. Version en ligne à jour : le titre affiche la version et « M10 » ; **F10 : signaler un problème** s'affiche en bas à droite.
2. Opera GX (ou le navigateur de tous les jours), clavier, fenêtre d'au moins 960×540. Les extensions qui captent des touches (F-touches, bloqueurs) peuvent être coupées pour la session.
3. Stockage du navigateur vide pour ce site (fenêtre privée ou profil neuf) : le journal et le carnet y sont gardés, ils doivent partir de zéro. Les anciennes parties de test sont exportées d'abord si elles comptent.
4. Consigne : jouer une heure, sans `?debug`, sans lire de guide ; à chaque chose fausse, cassée, incompréhensible, ou qui plaît : **F10**, une ou deux phrases ; un signalement trop court vaut mieux qu'un oubli. À la fin : F10 puis « Exporter la session ».

### Déroulé (60 min)

| Minute | Ce qu'on attend | Ce qu'on regarde |
|---|---|---|
| 0–5 | Titre, classe, règle de mort, premier pas dans Haut-Gué | Les écrans de choix sont-ils lisibles ? Sait-on quoi faire sans guide ? |
| 5–20 | Village : dialogues, boutique, repos, premiers pas hors des murs | PNJ, boutique, sortie, réputation |
| 20–40 | Premières rencontres : détection, préparation, combats tactiques | Portée, menaces, ripostes, préparation, résultat |
| 40–55 | XP, évolution, deuxième zone, sauvegarde et rechargement | Sait-on qu'on a sauvegardé ? Retrouve-t-on sa partie ? |
| 55–60 | Fin de session | F10, « Exporter la session », questionnaire |

La session n'a pas besoin d'aller au bout du jeu : le critère porte sur l'absence de bloquant ou de majeur, pas sur la durée de vie.

### Le kit (F10)

| Élément | Ce que c'est | Ce qu'il contient |
|---|---|---|
| **F10 « Signaler un problème »** | Écran qui fige le jeu, disponible partout (titre, monde, combat, menus) ; rappel dans la pause | Un type, une gravité (pour un problème), une description libre |
| **Types** | Problème · Je ne comprends pas · Remarque ou idée · Ça m'a plu | « Problème » reprend le barème (bloquant, majeur, mineur) |
| **Rapport** | Texte brut, montré en entier avant d'être copié | Description, version, durée de session, partie (héros, niveau, lieu, or, mode), scènes ouvertes, navigateur, écran, réglages, **60 dernières lignes du journal** ; jamais la sauvegarde ni une adresse de courriel |
| **Capture** | Image PNG de l'écran au moment de F10 | À télécharger à part si utile |
| **Carnet** | Tous les signalements de la session, gardés dans le navigateur | Survit à un rechargement ou à une fermeture accidentelle |
| **Exporter la session** | Un seul texte : contexte, résumé, carnet, journal complet | Ce qui est remis à la fin de la séance |
| **Journal** | Lignes horodatées écrites par le jeu (600 au plus, circulaires) | Scènes, lieux, combats, sauvegardes, chargements, réglages, erreurs, avertissements, fluidité toutes les 20 s, baisse de qualité automatique, fermeture de page |

Si le jeu plante et que la page est rechargée, la ligne de démarrage dit « session précédente : interrompue » ou « propre » : F10 puis l'export donnent ce qui s'est passé avant.

### Carnet papier (secours)

Si F10 ne s'ouvre pas (bug du kit lui-même, navigateur qui capte la touche) : une ligne par fait.

| Heure | Où j'étais | Ce que j'ai fait | Ce qui s'est passé | Type (P / ? / ! / +) |
|---|---|---|---|---|
| | | | | |

### Questionnaire court (3 min, à la fin)

Échelle : 1 = pas du tout d'accord · 5 = tout à fait d'accord.

| # | Affirmation | Note |
|---|---|---|
| Q1 | J'ai su quoi faire dans les cinq premières minutes | |
| Q2 | Je comprenais toujours ce que mes unités pouvaient faire en combat | |
| Q3 | Les dégâts, les portées et les menaces étaient faciles à lire | |
| Q4 | Les combats étaient de la bonne difficulté | |
| Q5 | J'ai compris ce que change la réputation | |
| Q6 | Le jeu a toujours répondu vite (60 ips sur F3, pas d'à-coups) | |
| Q7 | J'ai su quand et comment j'étais sauvegardé, et ma partie est revenue intacte | |
| Q8 | Je rejouerais une heure de plus | |

Questions ouvertes : (1) Qu'est-ce qui t'a le plus plu ? (2) Qu'est-ce qui t'a le plus agacé ou perdu ? (3) À quel moment as-tu failli arrêter ?

### Lire l'export

1. **Résumé de la session** : durée, écrans parcourus, combats (victoires, défaites), sauvegardes réussies ou en échec, erreurs, fluidité, baisse de qualité.
2. **Tout ce qui est rouge** : une ligne « erreur », une sauvegarde en échec, une session précédente « interrompue », une fluidité sous 30 ips : candidat bloquant ou majeur.
3. **Carnet** : trier par type puis par gravité ; retrouver chaque signalement dans le journal à l'heure indiquée.
4. Reporter chaque constat retenu dans le tableau ci-dessous, gravité tranchée selon le barème n°230.

### Critère de sortie (n°279)

- **Aucun bloquant ni majeur ouvert** après la session de 60 min de l'auteur depuis « Nouvelle partie », sans `?debug`, et après le banc automatique (corrigés, ou refusés avec une raison écrite).
- Si un bloquant ou un majeur apparaît : correction, nouvelle exécution du banc, puis **la session est rejouée** (au moins le parcours touché).
- Les mineurs restants sont listés ici ; ceux qui touchent à la lisibilité du combat ou à la compréhension du premier quart d'heure sont traités avant la 1.0.0 (n°249).

## Retours de la session de l'auteur

*À remplir après la session : la fiche, puis le tableau des constats.*

```
Date · navigateur / machine · durée réelle · version du jeu · session précédente (propre / interrompue / aucune)
Résumé de l'export : combats · sauvegardes · erreurs · fluidité (ips F3)
Questionnaire : Q1 _ Q2 _ Q3 _ Q4 _ Q5 _ Q6 _ Q7 _ Q8 _
```

| # | Gravité | Constat | Lot ou correctif | État |
|---|---|---|---|---|
| | | | | |
