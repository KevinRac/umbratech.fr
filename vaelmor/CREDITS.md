# Crédits

## Musique
Pistes générées avec Suno (voir `music/README.md`). Noter ici pour chaque piste : ID, date, prompt, abonnement Suno utilisé.

## Polices (`assets/fonts/`)
Toutes sous licence SIL Open Font License 1.1 (texte complet à côté de chaque fichier). Sous-ensemble « latin » des fichiers distribués par Fontsource.

| Fichier | Police | Auteurs | Licence | Usage |
|---|---|---|---|---|
| `jersey-10.woff2` | Jersey 10 | The Soft Type Project Authors (Sarah Cadigan-Fried) | OFL 1.1 (`OFL-jersey-10.txt`) | Texte courant, menus, dialogues |
| `tiny5.woff2` | Tiny5 | The Tiny5 Project Authors (Gissio) | OFL 1.1 (`OFL-tiny5.txt`) | Petites étiquettes, chiffres d'interface |
| `jacquarda-bastarda-9.woff2` | Jacquarda Bastarda 9 | The Soft Type Project Authors (Sarah Cadigan-Fried) | OFL 1.1 (`OFL-jacquarda-bastarda-9.txt`) | Gothique décoratif (noms de lieux, en minuscules) |

## Graphismes
- Logotype « VAELMOR », décor de l'écran titre, curseur, cadres d'interface : dessinés pour le projet (pixel art procédural dans `src/render/`), aucun asset tiers.
- Personnages de la carte (`assets/personnages/*.png`) : feuilles de marche générées avec Pixellab (IA) à partir des descriptions du projet, puis converties (réduction, palette) par script ; à retoucher à la main si besoin.

## Sons
Aucun asset tiers pour l'instant. Toute source future doit être listée ici avec sa licence.

## Bibliothèques
- Phaser 4 (MIT), Zod (MIT) — incluses dans le build `play/`.
