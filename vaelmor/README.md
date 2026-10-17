# Vaelmor : Les Marées de Cendre — code du prototype

RPG tactique en monde ouvert, jouable dans le navigateur. Conception : `docs/GDD_Vaelmor.md`. Suivi des jalons : `PROGRESS.md`.

## Commandes (depuis `vaelmor/`, Node ≥ 22)

| Commande | Effet |
|---|---|
| `npm install` | Installe les dépendances |
| `npm run dev` | Serveur de développement avec rechargement à chaud (ouvre `game.html`) |
| `npm test` | Tests Vitest de la logique pure, des données et de l'architecture |
| `npm run validate-data` | Valide `data/*.json` (schémas + références) |
| `npm run generate-world` | Régénère la carte de l'île (`assets/maps/world.json` + tileset) ; `-- --preview <dossier>` écrit des aperçus PNG |
| `npm run typecheck` | Vérifie les types (dont la règle « logique sans DOM ni Phaser ») |
| `npm run build` | Tout ce qui précède, puis compile le jeu dans `play/` |

`play/` est **commité** : le serveur publie le dépôt tel quel (`umbratech.fr/vaelmor/play/`). Toujours lancer `npm run build` avant de commiter une modification du jeu.

Outil de debug : touche **F3**, ou `?debug` dans l'URL. Dans le monde : **F2** téléportation au lieu suivant, **F4** collisions, **F9** passages ouverts / fermés, **F7** combat d'essai (Embuscade au gué), **F8** Camp des Écumeurs (boss Brakk), `?debug&at=31,58` pose le héros sur une case. En combat : **F2** victoire immédiate.

Combat (jalon M4) : écran titre › « Combat d'essai ». Flèches ou souris pour le curseur, Entrée / clic pour choisir, Échap / clic droit pour annuler, **R** zones de menace, **F** unité suivante, **Tab** menu (fin du tour, vitesse des animations, retraite), **Maj** maintenue accélère les animations.

## Organisation

```
vaelmor/
├─ index.html        page d'attente publique (lien « Jouer »)
├─ game.html         entrée du jeu (devient play/index.html au build)
├─ play/             jeu compilé (généré, commité)
├─ assets/           images, polices… (servis tels quels, non copiés dans play/)
├─ music/            pistes Suno
├─ data/             contenu du jeu en JSON (classes, terrains, réputation…)
├─ src/
│  ├─ core/          configuration, entrées, échelle d'affichage, stockage, bus d'événements
│  ├─ data/          schémas Zod, validation, registre des données
│  ├─ logic/         règles du jeu en TypeScript pur (ni DOM ni Phaser), testées :
│  │                 world/ (exploration), tactics/ (grille, tours, rencontres), combat/ (formules),
│  │                 ai/ (IA ennemie), units/ (stats), reputation/, save/
│  ├─ render/        palette, polices pixel, dessin procédural, décors
│  ├─ ui/            texte, cadres, menus, notifications
│  ├─ scenes/        scènes Phaser (Boot, Titre, Monde, Combat, Debug…)
│  ├─ world/ audio/  modules des jalons suivants
├─ tests/            tests Vitest
└─ tools/            scripts (validation des données, générateur de la carte du monde)
```

## Ajouter du contenu

- **Une entrée dans un fichier existant** (classe, terrain, arme, ennemi, rencontre…) : modifier le JSON de `data/`, puis `npm run validate-data`.
- **Une nouvelle carte de combat** : une rencontre dans `data/encounters.json` ; la carte s'écrit en texte, une lettre par case (`legend` en tête du fichier), avec ses cases de déploiement, ses ennemis et son objectif. Le champ de bataille est peint automatiquement. Un nouvel ennemi demande aussi son apparence dans `src/render/unitLooks.ts` (le test le vérifie).
- **Un nouveau fichier de données** : son schéma dans `src/data/schemas.ts`, une entrée dans `DATA_SCHEMAS` (`src/data/validate.ts`), son import dans `src/data/index.ts`. Les tests vérifient que rien n'est oublié.
- **Une nouvelle scène** : une clé dans `src/scenes/keys.ts`, la classe dans `src/scenes/`, l'enregistrer dans `src/main.ts`.
