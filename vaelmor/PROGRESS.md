# PROGRESS — Vaelmor : Les Marées de Cendre

> Fichier de continuité entre les conversations. À mettre à jour en fin de chaque jalon.

## Reprise (prompt à coller dans une nouvelle conversation)
Nous sommes sur le projet Vaelmor (dossier `vaelmor/` du dépôt umbratech.fr). Lis `docs/GDD_Vaelmor.md` et `PROGRESS.md`, puis commence le jalon indiqué. Respecte l'architecture existante. À la fin, mets à jour `PROGRESS.md`.

## Prochain jalon
**M4 : combat de base** (GDD §5, §17) — carte tactique sur grille, tour par tour, déplacement, attaques et ripostes, triangle des éléments, victoire / défaite. Le monde ouvert (M1) est prêt à déclencher un combat : il manque les ennemis visibles (M3) pour y entrer, on peut donc lancer M4 depuis une scène de test, puis M3 branchera le contact.
Ensuite, dans l'ordre du GDD §17 : M2 (villages, PNJ, dialogues, `locations.json`), M3 (ennemis du monde), M5…

## État
- [x] M0a : GDD v0.1 rédigé, validé le 16/10/2026 (v0.2, 28 décisions)
- [x] Dossier du jeu créé dans le dépôt (page d'attente, music/, assets/, src/, data/, docs/)
- [x] **M0 : squelette technique** (16/10/2026) — voir « Livré en M0 »
- [x] **M1 : exploration** (16/10/2026) — voir « Livré en M1 »
- [ ] M4 : combat de base
- [ ] M2, M3, M5, M6, M9, M7, M8, M10 (ordre du GDD §17)

## Livré en M0
- Projet npm dans `vaelmor/` : Phaser 4.2.1, TypeScript 7, Vite 8, Vitest 5, Zod 4 (versions exactes figées). Commandes : voir `README.md`.
- Build vers `vaelmor/play/` (commité), servi sur `umbratech.fr/vaelmor/play/`. Lien « Jouer » ajouté à la page d'attente.
- Architecture du GDD §16 : `core/`, `data/`, `logic/`, `render/`, `ui/`, `scenes/` (+ `world/`, `audio/` vides). La séparation est **imposée** : `tsconfig.pure.json` compile `logic/` et `data/` sans DOM, et `tests/architecture.test.ts` interdit Phaser, les couches de rendu et `Math.random` dans la logique.
- Données (`data/`) validées par schémas Zod stricts + contrôles croisés : 12 classes et 24 évolutions (stats, croissances, armes, éléments, conditions du GDD §10), 12 terrains (§3.5), 5 éléments et le triangle (§9.7), échelle de réputation (§6.2), équilibrage (`balance.json`). `npm run validate-data` bloque le build si une donnée est cassée.
- Logique pure testée : générateur aléatoire déterministe et sérialisable (`Rng`), règles de réputation (paliers, bornes, décroissance, prix), clés de sauvegarde (§14.2).
- Affichage 480×270 (titre) / 320×180 (monde) en échelle entière **en pixels physiques** (net aussi sur écran à 125 % ou Retina), recalculé au redimensionnement.
- Polices pixel nettes générées au démarrage (glyphes seuillés → police bitmap) : Jersey 10 (texte), Tiny5 (petites étiquettes), Jacquarda Bastarda 9 (gothique décoratif).
- Scènes : Boot (chargement, validation, erreurs affichées clairement), Titre (logotype pixel « VAELMOR » fait main, décor nocturne animé : Citadelle Engloutie, mer, falaise, lanterne, brumes, cendres ; menu clavier + souris ; notifications), Debug (F3 ou `?debug` : FPS, échelle, scène).
- 48 tests Vitest au vert ; rendu vérifié dans Chromium sans interface (1080p, 125 %, petite fenêtre, clavier AZERTY/QWERTY, souris).

## Livré en M1
- **Île jouable** : « Nouvelle partie » → fondu → scène Monde (`scenes/WorldScene.ts`). Carte Tiled 160×120 cases (2560×1920 px), 5 zones (Aubemer, Forêt-Racine, Côte des Brumes, Monts de Cendre, Citadelle Engloutie), 22 lieux (5 villages dont Valcendre fortifiée, camp, 4 donjons, 3 menhirs, 6 autels, ponts, épave), rivière avec 1 gué nord, 1 vieux pont, 1 pont, 2 gués, routes tracées par A*.
- **Carte générée, éditable dans Tiled** : `npm run generate-world` écrit `assets/maps/world.json` (export Tiled standard) et `assets/tilesets/world_tiles.png` (~1 000 tuiles 16×16 peintes par code, 5 chaînes de sol à transitions et rivages, ~40 décors). Déterministe : le test compare le fichier du disque à la sortie du générateur. Options : `-- --preview <dossier>` écrit des aperçus PNG (carte entière, collisions, détails de lieux). Le générateur vit dans `tools/world/` (`layout.ts` = plan de l'île à modifier en premier).
- **Couches de la carte** (`data/worldMap.ts`) : `ground`, `decor` (sous le héros), `canopy` (sur le héros), `collision` (0 libre, 1 bloqué, 2 eau, 3 lent, 4 passage), `zones`, objets `locations`, `gates`, `spawns`. Lecture validée (dimensions, terrains, zones, passages couverts, point `start`) au chargement, dans `npm run validate-data` et dans les tests.
- **Déplacement** (`logic/world/movement.ts`) : 8 directions, accélération douce, course (Maj), boîte de collision 10×8 aux pieds, glissement le long des murs, aide dans les angles, zones lentes (marais, gués), indépendant de la fréquence d'images.
- **Caméra** (`logic/world/camera.ts`) : zone morte 24×16, lissage indépendant du framerate, limites de la carte, arrondi à l'affichage.
- **Zones et lieux** (`logic/world/zones.ts`) : bandeau d'entrée de zone et de lieu, « lieu découvert », teinte et particules d'ambiance par zone (pollen, feuilles, brume, braises, cendres), panneau de zone dans le HUD.
- **Passages verrouillés** : bandes barrières le long de chaque frontière de zone (forêt dense, marais profond, falaise) percées là où une route la traverse ; la case de passage est bloquante tant que le drapeau du boss n'est pas levé (`boss_brakk`, `boss_roi_cerf`, `boss_merrow`, `boss_gardien_cendre`), brume visible et message de la zone au contact. Chaussée de pierre vers la Citadelle (îlot Z5).
- **Héros** (`render/heroSprite.ts`) : placeholder 16×24, 3 poses (face, dos, profil retourné) × 4 images, ombre, marche 8 ips (12 en course). Profondeur : le héros passe derrière les cimes d'arbres (`canopy`).
- **Debug** (F3 ou `?debug`) : F2 téléporte au lieu suivant, F4 affiche les collisions et la boîte du héros, F9 ouvre / referme tous les passages, `?debug&at=31,58` pose le héros sur une case ; case, zone, lieu et collision affichés en direct.
- **Pause** (Échap) : reprendre / retour au titre. L'état du monde vit en mémoire (`core/session.ts`) en attendant la sauvegarde (M9).
- **Tests** : 95 au vert (dont accessibilité de la carte passages fermés → seule la zone 1, passages ouverts → tous les lieux, et un joueur simulé qui rallie 6 lieux avec le vrai code de déplacement ; marche aléatoire de 10 min sans jamais entrer dans un mur).
- **Vérifié dans Chromium** (WebGL logiciel, 960×540) : arrivée sur l'île, marche, course, collisions, passage verrouillé et son message, téléportation, pause, aucune erreur console, tas JS stable sur 40 s de marche aléatoire.

### Mesure de performance (critère « 60 FPS, 10 min »)
Non mesurable ici : la session n'a pas de GPU (Chromium en WebGL logiciel SwiftShader : ~33 ips en 960×540, ~50 ips sur l'écran titre dans les mêmes conditions). Ce qui garantit la marge : sol, décor et cimes = 3 couches GPU (3 quads, quelle que soit la taille de l'île), eau = 1 TileSprite, boucle de jeu sans allocation (`stepBody` modifie l'état en place), 1 émetteur de particules. **Reste à vérifier par l'auteur** sur sa machine : F3 puis marcher 10 min (FPS visible en haut à gauche).

### Décisions n°32 à 35 — validées par l'auteur le 16/10/2026
- **n°32 — Sprites à 4 orientations** pour un déplacement à 8 directions : face, dos, profil (retourné pour la gauche) ; les diagonales réutilisent la pose verticale ou latérale selon `spritePose`. Évite 8 jeux d'images à dessiner ; changeable plus tard (`logic/world/movement.ts` → `spritePose`).
- **n°33 — Passages fermés par défaut** : la partie démarre avec tous les drapeaux de boss à faux, donc seule la zone 1 est accessible tant qu'on n'a pas battu les boss (ils arrivent en M4/M6). Le debug (F9) les ouvre.
- **n°34 — Vallée de Valcendre dans la zone 2** (Forêt-Racine, niveaux 4-9) : la ville est accessible dès Brakk vaincu, côté est de la rivière, par le Vieux Pont. Le polygone est dans `tools/world/layout.ts`.
- **n°35 — `locations.json` reporté à M2** : les lieux ont pour l'instant `id`, nom français et genre dans la carte ; leurs PNJ, marchands, quêtes et réputation locale arrivent avec les villages (M2), où le fichier de données les décrira par `id`.
- **n°36 — Résolution du monde 320×180, direction « pixel art propre moderne »** (demandé par l'utilisateur après M1) : l'exploration passe de 480×270 à **320×180** (le titre reste en 480×270 ; `setLogicalSize` change la résolution à chaque scène). Le héros, les maisons et les arbres paraissent donc plus gros. Art refait : rampes de couleurs à décalage de teinte (ombres bleu-violet, lumières chaudes), sols plats à 3 tons au lieu du grain, maisons à toit en bardeaux/façade à pans de bois/ombre portée, contours teintés plutôt que noirs, héros plus ombré. Le GDD §12.2 et la décision n°4 sont mis à jour en conséquence.

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
- **Couches GPU Phaser 4 (`createLayer(..., true)`)** : les cases vides sont dessinées avec la tuile d'indice 0 du tileset ! La tuile n°1 du tileset est donc volontairement **transparente** (le générateur la réserve) ; sans cela tout l'écran passe en rouge (le repère de collision « bloqué »). Une seule texture par couche, tuiles nettes. Les couches `collision` et `zones` (valeurs brutes) ne sont jamais créées côté Phaser.
- Les composants d'interface créés dans une scène qui défile (`Toasts`, `VerticalMenu` avec `fixed: true`, HUD) doivent être en `setScrollFactor(0)` : sinon ils restent à leur position du monde et sortent de l'écran.
- Pour modifier la carte : soit éditer `tools/world/layout.ts` / le générateur puis `npm run generate-world` (le test d'identité échoue tant qu'on n'a pas régénéré), soit éditer `assets/maps/world.json` dans Tiled (alors supprimer ou adapter le test « identique à la sortie du générateur » : le générateur écraserait les retouches).
- Vérification visuelle dans une session Claude : `npx playwright install chromium` fonctionne (dans le dossier temporaire, pas dans `vaelmor/`) ; lancer Chromium avec `--use-angle=swiftshader --enable-unsafe-swiftshader` pour avoir WebGL, servir la racine du dépôt (`python3 -m http.server`) et ouvrir `/vaelmor/play/`.
- Accès réseau des sessions Claude : le registre npm était bloqué le 16/10/2026 au matin, ouvert le soir même. En cas de refus du proxy, autoriser les registres de paquets dans les réglages d'exécution de code.
