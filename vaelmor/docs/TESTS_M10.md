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
| A-02 | Majeur | **Aucune musique** : les 13 pistes Suno sont dans `music/` (62 Mo de MP3 à 320 kbps), rien ne les charge. | C | Ouvert |
| A-03 | Majeur | « Options » du titre affiche « Les options arrivent au jalon M10 ». | B | Corrigé : écran Options (titre, pause, menu, combat). |
| A-04 | Majeur | **Voyage rapide** (décision n°7) jamais codé ; la touche N (carte de l'île) est liée mais sans effet. | B | Corrigé : carte de l'île (N, onglet Carte) et voyage rapide. |
| A-05 | Mineur | HUD d'exploration : ni portrait, ni niveau du héros, ni blessés (GDD §13.1). | B | Corrigé : fiche du héros sous le nom de zone. |
| A-06 | Mineur | Réglages dispersés : qualité dans la pause du monde ; vitesse, vue, effets réduits et sons dans le menu de carte du combat. | B | Corrigé : tout passe par l'écran Options. |
| A-07 | Mineur | Le titre et le debug affichent « prototype M9 » (`MILESTONE`). | B | Corrigé. |
| A-08 | Majeur | Aucun son hors combat : interface, pas, détection « ! », entrée de village, ambiances. | D | Ouvert |
| A-09 | Majeur | Accessibilité (GDD §13.8) : seul « Effets réduits » existe, et seulement en combat. | E | Ouvert |
| A-10 | À mesurer | IA contre IA avec la compagnie d'essai : 100 % de victoires en Z1 et Z2, puis 0 à 50 % dès Z3 et 0 % contre tous les boss après Brakk. La compagnie d'essai (sans soigneur parmi les 5 premiers déployés, sans évolution ni équipement) n'est pas une compagnie réelle : à mesurer avec le simulateur. | F | Ouvert |
| A-11 | Mineur | « Combat d'essai » est proposé à tous sur le titre. | B | Corrigé : seulement avec `?debug`. |
| A-12 | Mineur | L'aide des touches en bas de l'écran du monde se lit mal sur l'herbe claire. | B | Corrigé : texte plus clair, touches E, Tab et N ajoutées. |
| A-14 | Majeur | L'Échap qui ferme le menu (Tab), un dialogue ou la carte ouvre aussitôt la pause ; sur une machine lente, la touche qui ferme une fenêtre peut la rouvrir. | B | Corrigé : le monde attend 250 ms **et** deux images après une fenêtre (`inputReady`). |
| A-15 | Majeur | Après un chargement depuis la partie (et un voyage), l'or et la fiche du héros disparaissent du HUD jusqu'au prochain menu. | B | Corrigé : le HUD garde ces valeurs quand il redémarre. |
| A-13 | À mesurer | Le jeu tient en un seul fichier JS de 2,2 Mo ; les musiques pèsent 62 Mo. | C, G | Ouvert |

Non reproduits (fausses alertes du banc) : la pause qui ne se ferme pas, le dialogue qui ne se ferme pas à Échap (Échap fait d'abord avancer les répliques, puis ferme le menu de réponses : comportement voulu).

## Protocole des sessions de test (n°247, n°248)

À écrire au lot H.

## Retours des testeurs

À remplir après les sessions.
