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
- Personnages de la carte (`assets/personnages/*.png`) : feuilles de marche générées avec Pixellab (IA) à partir des descriptions du projet, puis converties (réduction, palette) par script ; à retoucher à la main si besoin. Les autres personnages d'une classe (`*_v1`) sont générés par l'API Pixellab à partir de ces personnages.
- Ennemis du monde ouvert (`assets/ennemis/*.png`, n°281, 07/11/2026) : feuilles de marche (sud, nord, est × 8 images) générées avec l'API Pixellab (mode d'animation v3) à partir des personnages Pixellab des feuilles de combat (`assets/combat/<sprite>.png`), réduites au format des personnages de la carte par script (couleurs d'origine, noir pur remplacé par l'ombre profonde de la palette). Cimier du Milicien retiré à la main ; touche de rouge cendre recolorée par script sur l'Esprit des ronces, la Voilée de brume, l'Abyssal, le Garde englouti, le Revenant, le Noyé, le Roi-Cerf, Sœur Mérrow et Orvane. Coût : 99 générations (20 ennemis et l'essai : 73 ; 6 boss : 26 ; reprises comprises). Solde après la série : 491 / 2 000.
- Portraits de la compagnie (`assets/portraits/*.png`) : générés avec Pixellab (IA) à partir de ces mêmes personnages (portrait du héros : fourni par l'auteur) ; leurs expressions (`assets/portraits/expressions/`) aussi.
- Portraits des boss et des ennemis nommés (`assets/portraits/ennemis/*.png`, jalon M7) : générés avec l'API Pixellab (IA, *Pro Flash*) à partir des descriptions de la bible, dans le style des portraits de la compagnie.

## Sons
Aucun asset tiers pour l'instant. Toute source future doit être listée ici avec sa licence.

## Bibliothèques
- Phaser 4 (MIT), Zod (MIT) — incluses dans le build `play/`.
