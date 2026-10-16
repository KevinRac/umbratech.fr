# PROGRESS — Vaelmor : Les Marées de Cendre

> Fichier de continuité entre les conversations. À mettre à jour en fin de chaque jalon.

## Reprise (prompt à coller dans une nouvelle conversation)
Nous sommes sur le projet Vaelmor (dossier `vaelmor/` du dépôt umbratech.fr). Lis `docs/GDD_Vaelmor.md` et `PROGRESS.md`, puis commence le jalon indiqué. Respecte l'architecture existante. À la fin, mets à jour `PROGRESS.md`.

## Prochain jalon
**M1 : exploration** (GDD §4, §17) — île jouable : carte Tiled, héros animé 8 directions, caméra avec lissage et zone morte, collisions par couche, transitions de zone, outils de debug (téléport). Critère : 60 FPS stables, aucun blocage sur 10 min de marche.
Brancher « Nouvelle partie » de l'écran titre sur la scène Monde.

## État
- [x] M0a : GDD v0.1 rédigé, validé le 16/10/2026 (v0.2, 28 décisions)
- [x] Dossier du jeu créé dans le dépôt (page d'attente, music/, assets/, src/, data/, docs/)
- [x] **M0 : squelette technique** (16/10/2026) — voir « Livré en M0 »
- [ ] M1 : exploration
- [ ] M4 : combat de base
- [ ] M2, M3, M5, M6, M9, M7, M8, M10 (ordre du GDD §17)

## Livré en M0
- Projet npm dans `vaelmor/` : Phaser 4.2.1, TypeScript 7, Vite 8, Vitest 5, Zod 4 (versions exactes figées). Commandes : voir `README.md`.
- Build vers `vaelmor/play/` (commité), servi sur `umbratech.fr/vaelmor/play/`. Lien « Jouer » ajouté à la page d'attente.
- Architecture du GDD §16 : `core/`, `data/`, `logic/`, `render/`, `ui/`, `scenes/` (+ `world/`, `audio/` vides). La séparation est **imposée** : `tsconfig.pure.json` compile `logic/` et `data/` sans DOM, et `tests/architecture.test.ts` interdit Phaser, les couches de rendu et `Math.random` dans la logique.
- Données (`data/`) validées par schémas Zod stricts + contrôles croisés : 12 classes et 24 évolutions (stats, croissances, armes, éléments, conditions du GDD §10), 12 terrains (§3.5), 5 éléments et le triangle (§9.7), échelle de réputation (§6.2), équilibrage (`balance.json`). `npm run validate-data` bloque le build si une donnée est cassée.
- Logique pure testée : générateur aléatoire déterministe et sérialisable (`Rng`), règles de réputation (paliers, bornes, décroissance, prix), clés de sauvegarde (§14.2).
- Affichage 480×270 en échelle entière **en pixels physiques** (net aussi sur écran à 125 % ou Retina), recalculé au redimensionnement.
- Polices pixel nettes générées au démarrage (glyphes seuillés → police bitmap) : Jersey 10 (texte), Tiny5 (petites étiquettes), Jacquarda Bastarda 9 (gothique décoratif).
- Scènes : Boot (chargement, validation, erreurs affichées clairement), Titre (logotype pixel « VAELMOR » fait main, décor nocturne animé : Citadelle Engloutie, mer, falaise, lanterne, brumes, cendres ; menu clavier + souris ; notifications), Debug (F3 ou `?debug` : FPS, échelle, scène).
- 48 tests Vitest au vert ; rendu vérifié dans Chromium sans interface (1080p, 125 %, petite fenêtre, clavier AZERTY/QWERTY, souris).

## Modèle / effort conseillés
Opus 5.5 élevé pour M4, M5, M9 ; Sonnet 5.5 moyen pour M1, M2, M3, M10 (élevé pour M8) ; Haiku 5.5 pour le remplissage de données (M6, M7).

## Décisions prises
- Les 28 décisions du GDD §19 sont validées telles quelles (16/10/2026).
- n°29 Hébergement : jeu compilé servi sur `umbratech.fr/vaelmor/play/` ; la sortie du build `vaelmor/play/` est commitée (le serveur IONOS fait un `git pull` sans build).
- n°30 Musique : pistes générées avec Suno (`music/README.md`), tracées dans `CREDITS.md`.
- n°31 Version de Phaser : **Phaser 4.2.1** (16/10/2026, validée par l’auteur). La 3.x n'évolue plus depuis mai 2025 ; la décision n°1 laissait la version ouverte. Ajoutée au GDD §19.

## Conventions
- **Langue** : textes du jeu, commentaires et messages d'erreur en français ; identifiants de code (fonctions, classes, variables) en anglais.
- **Identifiants de contenu** : `snake_case` ASCII sans accents (`gardien_des_marees`, `heros_local`). Clés de stats : `pv fo mag dex vit def res chc mob` (comme le GDD).
- **Données** : tout réglage chiffré va dans `data/*.json`, jamais en dur dans le code. Objets stricts (une clé inconnue est une erreur) ; `$comment` autorisé en tête de fichier.
- **Logique** : fonctions pures dans `src/logic/`, qui reçoivent la config en paramètre ; hasard uniquement via `Rng` (graine) pour des combats rejouables.
- **Rendu pixel art** : coordonnées entières, échelles entières (×2, ×3), couleurs de `render/palette.ts`. Texte uniquement via `addText()` (`ui/text.ts`). Placeholders dessinés par code avec `PixelCanvas` (tramage de Bayer, deux teintes max par transition).
- **Entrées** : les scènes lisent des actions (`ActionInput`, `core/input.ts`), jamais des touches. ZQSD et WASD sont liés ensemble.
- **Scènes** : clé dans `scenes/keys.ts`, enregistrement dans `main.ts`. La scène Debug reste au-dessus de toutes.
- **Assets** : dans `assets/` et `music/`, référencés avec `assetUrl('assets/…')` (marche en dev et depuis `play/`). Toute source tierce est listée dans `CREDITS.md` avec sa licence.
- **Avant chaque commit touchant le jeu** : `npm run build` (valide, teste, compile), puis commiter `play/` avec le code.

## Pièges connus
- L'hébergement est statique : le serveur IONOS fait `git pull` de `main` à chaque push (`.github/workflows/deploy.yml`). Tout ce qui est poussé sur `main` part en ligne ; le build doit donc être commité. Les noms de fichiers de `play/js/` changent à chaque build (hachage) : commiter la suppression de l'ancien.
- Phaser 4 : `Scale.MAX_ZOOM` n'est calculé qu'au démarrage → l'échelle est gérée par `render/displayScaler.ts`. Le type `BitmapFontCharacterData` omet `xAdvance` (pourtant lu par le moteur). `Geom.Point` n'existe plus (utiliser `Vector2`), `Math.TAU` vaut 2π. Guides officiels dans `node_modules/phaser/skills/` (dont `v3-to-v4-migration`).
- `Phaser.Input.Keyboard.JustDown` perd les appuis très brefs (enfoncé et relâché dans la même image) : passer par `ActionInput`, qui écoute les événements `keydown`.
- Vite 8 : l'option de build s'appelle `build.rolldownOptions` (et non `rollupOptions`). Le plugin `vaelmor-entry-as-index` renomme `play/game.html` en `play/index.html`.
- Vérification visuelle dans une session Claude : `npx playwright install chromium` fonctionne (dans le dossier temporaire, pas dans `vaelmor/`) ; lancer Chromium avec `--use-angle=swiftshader --enable-unsafe-swiftshader` pour avoir WebGL, servir la racine du dépôt (`python3 -m http.server`) et ouvrir `/vaelmor/play/`.
- Accès réseau des sessions Claude : le registre npm était bloqué le 16/10/2026 au matin, ouvert le soir même. En cas de refus du proxy, autoriser les registres de paquets dans les réglages d'exécution de code.
