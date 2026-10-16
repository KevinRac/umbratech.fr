# PROGRESS — Vaelmor : Les Marées de Cendre

> Fichier de continuité entre les conversations. À mettre à jour en fin de chaque jalon.

## Reprise (prompt à coller dans une nouvelle conversation)
Nous sommes sur le projet Vaelmor (dossier `vaelmor/` du dépôt umbratech.fr). Lis `docs/GDD_Vaelmor.md` et `PROGRESS.md`, puis commence le jalon indiqué. Respecte l'architecture existante. À la fin, mets à jour `PROGRESS.md`.

## Prochain jalon
**M0 : squelette technique** — pas encore commencé côté code (voir « Pièges connus » : accès réseau).

## État
- [x] Jalon M0a : GDD v0.1 rédigé (`docs/GDD_Vaelmor.md`)
- [x] Dossier du jeu créé dans le dépôt (index.html d'attente, music/, assets/, src/, data/, docs/)
- [x] GDD validé (16/10/2026) : 28 décisions acceptées telles quelles, GDD passé en v0.2
- [ ] M0 : squelette technique (Vite, TypeScript, Phaser, schémas Zod, tests Vitest, build vers `play/`)
- [ ] M1 : exploration
- [ ] M4 : combat de base
- [ ] M2, M3, M5, M6, M9, M7, M8, M10 (ordre du GDD §17)

## Modèle / effort conseillés
Voir la conversation de planification : Opus 5.5 élevé pour M0, M4, M5, M9 ; Sonnet 5.5 moyen pour M1, M2, M3, M10 (élevé pour M8) ; Haiku 5.5 pour le remplissage de données (M6, M7).

## Décisions prises
- Les 28 décisions du GDD §19 sont validées telles quelles (16/10/2026).
- n°29 Hébergement : jeu compilé servi sur `umbratech.fr/vaelmor/play/` ; la sortie du build `vaelmor/play/` est commitée (le serveur IONOS fait un `git pull` sans build). La page d'attente `vaelmor/index.html` reste en place et recevra un lien « Jouer ».
- n°30 Musique : pistes générées avec Suno (`music/README.md`), tracées dans `CREDITS.md`.

## Plan de M0 (à exécuter dès que le réseau est ouvert)
- Projet npm dans `vaelmor/` (package.json, tsconfig, vite.config), sans toucher au reste du dépôt.
- Entrée de développement séparée de la page d'attente ; build Vite avec `base: './'` vers `vaelmor/play/`.
- Les assets restent dans `vaelmor/assets/` et `vaelmor/music/` (non dupliqués dans `play/`) : chemin de base des assets injecté au build.
- `src/` organisé selon le GDD §16.4 (core, logic, world, scenes, render, ui, audio, debug) ; la couche `logic/` n'importe jamais Phaser.
- Schémas Zod + données d'exemple dans `data/`, script `validate-data`, tests Vitest de la logique pure.
- Scènes minimales : Boot (chargement, mise à l'échelle entière 480×270) et Titre.
- `.gitignore` pour `node_modules/` ; `play/` est commité.

## Conventions
À définir en M0.

## Pièges connus
- L'hébergement est statique : le serveur IONOS fait `git pull` de `main` à chaque push (`.github/workflows/deploy.yml`). Tout ce qui est poussé sur `main` part en ligne ; le build doit donc être commité.
- **Accès réseau des sessions Claude** : le 16/10/2026, le registre npm (et tout site hors GitHub) était refusé par le proxy de la session, ce qui bloque `npm install`. Il faut autoriser l'accès aux registres de paquets dans les réglages d'exécution de code avant de relancer M0.
