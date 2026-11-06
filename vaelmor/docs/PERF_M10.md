# Vaelmor — M10, lot G : performance (n°246)

> Lot **en attente de validation** (branche `vaelmor-m10-lot-g`). Mesures avant / après, décisions proposées (n°269 à n°272), reproduction.
> Reproduire : `npm run build`, puis `npm run perf -- --combats 30` (poids chargé + tas) et `npm run perf -- --combats 0 --rapproche 200 --query "?debug&closeup=heros:&crit=1&double=1"` (écran rapproché).

## Méthode et limites

- Banc `tools/perf-bench.mjs` : sert `vaelmor/` en gzip (comme un hébergeur ordinaire, sans cache navigateur), pilote Chrome sans interface (SwiftShader, `--expose-gc`), tas JS mesuré **après ramasse-miettes forcé**. Logique de verdict pure : `src/logic/perf/heap.ts` (référence = premier échantillon après 5 combats, tolérance ±10 %).
- **Les images par seconde ne se mesurent pas ici** (rendu logiciel, 6 à 18 ips quelle que soit la qualité). Le contrôle des 60 ips sur une vraie carte graphique reste à faire par l'auteur (F3, n°246).
- « Avant » = build `play/` de `main` (`bb9611f`). « Après » = même jeu, branche du lot G.

## Résultats

### Poids chargé (jusqu'au titre, serveur en gzip)

| | Avant | Après |
|---|---|---|
| Fichiers JS | 1 (2 372 490 o ; 658 Ko en gzip) | 3 : Phaser 1 374 100 o, jeu 901 070 o, zod 98 165 o |
| JS transféré au titre | 664 422 o | 665 718 o (+0,2 %) |
| Requêtes jusqu'au titre | 241 | 243 |
| Octets jusqu'au titre | 9 794 911 | 9 796 260 |
| dont images (114 fichiers) | 8 967 750 (91 %) | 8 967 750 |
| Octets jusqu'au monde (musique comprise, 4 pistes) | 15 548 710 | 15 550 059 |
| **Visite de retour après une mise à jour du jeu** | 664 Ko de JS à retélécharger | **~283 Ko** (le jeu seul ; Phaser et zod restent en cache) : −57 % |

Le découpage ne réduit pas la première visite (tout le code sert dès le titre) : son gain est le cache d'une mise à jour à l'autre, et un dossier `play/` qui ne réécrit plus 1,4 Mo de Phaser à chaque build. Le nom de fichier de Phaser est identique d'un build à l'autre tant que sa version ne change pas (vérifié : modifier le code du jeu change `game-*.js` seul).

**Musiques (A-13)** : les 62 Mo sont les 13 MP3 d'origine de `music/`, que le jeu ne demande jamais. Le joueur ne reçoit que `music/web/` : 20 Mo en WebM ou 18 Mo en AAC pour les 13 pistes, **une piste à la fois, à la demande** (2,3 Mo au plus). Rien à changer côté joueur ; les originaux restent dans le dépôt (n°237).

**À savoir (non traité dans ce lot)** : le poids du démarrage est dominé par les images. `BootScene` charge les 39 feuilles de combat (`assets/combat/`, 6,9 Mo) avant le titre. Voir la décision n°272.

### Tas JS (ramasse-miettes forcé)

| Scénario | Avant | Après |
|---|---|---|
| 30 allers-retours monde ↔ combat (F8, F2), tas à 5 → 30 combats | 42,6 → 44,1 Mo (**+3,5 %**, plateau) | 42,4 → 43,9 Mo (**+3,5 %**, plateau) |
| Écran rapproché, 10 → 100 échanges critiques | 39,5 → 42,5 Mo (+7,6 %) | 38,4 → 38,3 Mo (**−0,5 %**) |
| Écran rapproché, 10 → 200 échanges | 39,5 → 44,5 Mo (**+12,6 %**, ≈ +26 Ko par échange, sans plateau) | — (100 échanges mesurés) |

**Fuite trouvée et corrigée** (A-16) : `BattleCloseupScene.teardown()` détruisait les objets de l'échange mais pas leurs tweens qui bouclent (`repeat: -1` : respiration des combattants, aura d'un boss, lignes de vitesse des cut-ins). Chaque échange en laissait deux de plus, qui continuaient d'animer des objets détruits (tweens actifs : 4 → 44 sur 20 échanges ; après correction : 1 → 0). Le test des 30 combats ne la voyait pas, car F2 gagne sans jouer d'échange. Garde-fou : `tests/architecture.test.ts`.

### Qualité automatique (rendu logiciel lent, 40 s dans le monde)

| Réglage | Cran appliqué | Images/s |
|---|---|---|
| Automatique (rien d'enregistré) | Haute → Basse → Désactivée en ~10 s | ~14 à 18 |
| Haute choisie par le joueur | reste Haute | ~6 à 9 |

Sur une machine rapide, rien ne bouge (testé en simulation, `tests/perf.test.ts` : 120 s à 60 ips sans aucun changement ; pas mesuré sur une vraie carte graphique). Les valeurs de la règle sont des points de départ à régler avec le retour des testeurs.

## Décisions proposées (à valider)

- **n°269 — Découpage** : Phaser et zod dans leurs propres fichiers à nom haché (`vite.config.ts › codeSplitting`) ; `vaelmor/.htaccess` leur donne un cache d'un an (`immutable`), le HTML et le reste sont revalidés comme avant. Le build écrit toujours dans `play/` (n°29).
- **n°270 — Qualité des effets « Automatique »**, par défaut pour toute personne n'ayant rien choisi (les choix déjà enregistrés sont gardés) : fenêtres de 3 s ; lente si la médiane des images dépasse 28 ms (moins de ~36 ips) ou si plus de 10 % des images dépassent 50 ms ; deux fenêtres lentes de suite pour baisser d'un cran (Haute → Basse → Désactivée) ; 4 s de répit après chaque baisse ; images de plus d'une seconde (onglet caché, chargement) ignorées ; **jamais de remontée seule**. Le cran atteint est retenu (`qualityAuto`) ; choisir de nouveau « Automatique » repart de Haute. F3 affiche `EFFETS AUTO → <cran>`. Logique pure : `logic/perf/autoQuality.ts`.
- **n°271 — Tas stable** : critère ±10 % après 30 combats **et** après 200 échanges rapprochés (`logic/perf/heap.ts`, banc `npm run perf`) ; le combat applique désormais aussi un changement de qualité en cours de partie.
- **n°272 — À trancher, non fait** : charger les feuilles de combat (6,9 Mo) à la demande, ou en tâche de fond après le titre, plutôt qu'avant le titre. Gain attendu : de ~9,8 Mo à ~3 Mo avant le titre. Touche `BootScene` et le premier combat : à faire dans un lot à part si tu veux.
