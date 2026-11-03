# Umbratech · refonte du thème (novembre 2026)

Dossier de direction artistique de la nouvelle page d'accueil et du thème commun. Code : `index.html`, `assets/umbra.css`, `assets/umbra.js`, `assets/umbra-bar.css`, `assets/fonts/`. Planche vivante (tokens, composants, trois variantes de hero) : `/dev/design-system.html` (non indexée).

Cadrage validé avant le travail : positionnement **hub personnel guides + jeux** (aucune offre, aucun client, aucun chiffre inventé) ; périmètre **accueil + thème commun** (les guides et les jeux gardent leur identité) ; action principale **Jouer à La Brume** ; livraison **branche + pull request**.

## 1. Analyse du site actuel

**Structure** : barre (logo, deux ancres), hero centré « Mes projets du moment », deux rangées de deux tuiles (Builds GW1 / D4, puis La Brume / Vaelmor), pied de page. Pas de section services, preuves, équipe, FAQ ni contact : ce n'est pas une vitrine d'entreprise, et la refonte ne fait pas semblant d'en être une.

**À garder** : le fond très sombre et le couple violet / cyan (déjà dans la bonne direction) ; les couleurs d'identité par projet (or GW1, braise D4, turquoise Brume, lavande Vaelmor) ; les illustrations des tuiles ; un SEO propre (title, description, canonical, Open Graph, JSON-LD) ; le respect de `prefers-reduced-motion`.

**Faiblesses** :
- Hiérarchie plate : quatre tuiles de même poids, rien ne dit quoi faire en premier.
- Le hero parle de l'auteur (« Mes projets du moment ») au lieu de dire au visiteur ce qu'il peut faire.
- Typographie : Fraunces (serif) en titres et Inter en texte, deux familles génériques, sans tension.
- Aucun CTA hors des tuiles ; barre de navigation masquée sous 560 px, sans action principale.
- Aucun signe que les projets vivent (le journal de La Brume change presque chaque jour, la page n'en montre rien).
- Les guides `/gw1/` et `/d4/` n'ont **aucun lien** vers l'accueil ni vers les jeux.
- Polices chargées depuis Google Fonts (requête tierce, RGPD).

## 2. Direction artistique : « la lanterne dans la brume »

**Idée** : le site est un lieu sombre et calme ; la lumière y guide le regard comme la lanterne du voyageur de La Brume. Une seule chose est spectaculaire, la scène du hero ; tout le reste est discipliné, éditorial, très lisible.

**Moodboard textuel** : nuit d'encre bleutée, brume basse qui dérive lentement, une lueur ambre chaude au ras du sol, des lettres massives qui s'enfoncent dans le brouillard, des filets de lumière violet-cyan comme des reflets sur du verre, des cartes en verre fumé, beaucoup de noir autour.

**Palette** (contrastes WCAG mesurés sur `#05060A`) :

| Rôle | Token | Valeur | Contraste |
|---|---|---|---|
| Fond | `--ut-void` | `#05060A` | |
| Cartes | `--ut-night` | `#0B0D12` | |
| Champ actif | `--ut-deep` | `#11141B` | |
| Texte | `--ut-text` | `#EEF1F6` | 17,9:1 |
| Texte secondaire | `--ut-soft` | `#C6CCD8` | 12,6:1 |
| Texte discret | `--ut-muted` | `#A3ACBC` | 8,9:1 |
| Accent dégradé | `--ut-grad` | `#9C84FF` → `#3EDBF0` → `#F3F6FF` | |
| Accent seul (focus) | `--ut-cyan` | `#3EDBF0` | 12,1:1 |
| La Brume | `--ut-brume` | `#4FE3D0` | 12,8:1 |
| Lanterne | `--ut-lantern` | `#F2B65A` | |
| GW1 / D4 / Vaelmor | `--ut-gw` `--ut-d4` `--ut-vaelmor` | `#F0B94A` `#FF6A5C` `#B48CFF` | ≥ 6,9:1 |

Le dégradé ne sert qu'à trois endroits : le halo du bouton principal, la marque, la ligne de la descente. **Variante sobre** : `<html data-accent="sobre">` remplace le dégradé par le cyan seul (bouton « Accent seul » sur la planche).

**Typographie** (auto-hébergée, OFL, sous-ensemble latin + français, ~20 Ko par fichier) :
- Titres : **Outfit 700**, géométrique et franche ; approche serrée (−0,025 em, −0,055 em pour le hero).
- Texte : **Instrument Sans 400/700**, lisible et un peu plus humaine qu'Inter.
- Échelle : hero `clamp(4.25rem → 10rem)`, H2 `2rem → 3.25rem`, H3 `1.5rem → 1.875rem`, chapeau 1,25 rem, texte 1,0625 rem (interligne 1,6), labels 0,8125 rem en capitales espacées de 0,14 em, **réservés au statut** (« Aussi en chantier », nom du jeu sur une carte).

**Style d'images** : illustrations vectorielles peintes, nocturnes, une source de lumière par image ; jamais de photo, jamais de capture brute non retouchée. Les visuels se fondent dans le fond (masques radiaux) au lieu d'être posés dans des cadres.

**Ton** : tutoiement, comme les jeux ; phrases courtes, verbes d'action ; on dit ce que fait le bouton (« Jouer à La Brume », « Ouvrir le constructeur »). Aucun superlatif.

**Système** : rayons croissants avec la taille (6 px chips, 12 px champs, 20 px cartes, 32 px panneaux, pilule pour les boutons) ; espacements en base 4 (4 → 144 px) ; sections à `clamp(72px, 6vw + 40px, 160px)` ; grille de 12 colonnes, contenu ≤ 1 240 px (1 440 px au-delà de 1 800 px d'écran).

## 3. Maquette, section par section (textes en place)

1. **Barre sticky floutée** : marque · La Brume · Builds & guides · Vaelmor · Questions · bouton « Jouer à La Brume » (toujours visible, y compris sur mobile où la navigation se replie).
2. **Hero** (à gauche le texte, à droite la scène) : badge « En développement · v18.8 » (lu en direct dans `themist/data/versions.js`) ; H1 « La Brume » ; « Un roguelite d'action à jouer dans ton navigateur. Chaque descente te rapproche du cœur de la Brume, chaque retour au Sanctuaire te rend plus fort. » ; devise « Ce que tu oublies, la Brume s'en souvient. » ; CTA « Jouer à La Brume » + « Lire le wiki » ; repères : 4 formes jouables, 3 sous-classes par forme, 10 actes, 3 paliers.
3. **Bandeau des destinations** (remplace le bandeau de logos clients) : La Brume, Guild Wars 1 (1 442 compétences, 10 professions), Diablo IV, Vaelmor.
4. **La descente** (remplace « méthode / processus » : c'est une vraie séquence, donc numérotée) : Choisis ta forme → Descends → Choisis ce que tu oublies → Reviens plus fort. Aucun secret du jeu n'y est expliqué.
5. **Le jeu change presque chaque jour** (remplace « preuves ») : les quatre dernières versions du journal, chargées quand la section approche ; lien vers le journal complet du wiki.
6. **Builds et guides, en français** : grande carte GW1 (constructeur), carte D4 (Grimoire de Sanctuaire), bandeau Vaelmor.
7. **Fait pour jouer, pas pour attendre** (différenciation) : Rien à installer · Tout en français · Suivi de près.
8. **Appel final** : « Garde ta lanterne allumée. » + Jouer / Voir les builds.
9. **FAQ** (5 questions réelles : installation, téléphone, état du jeu, sources des données, caractère non officiel).
10. **Pied de page** : marque, Jeux, Guides, Sur cette page, mention de marques.

**Sous-pages** : `/gw1/` et `/d4/` reçoivent une barre commune (52 px, autonome, `assets/umbra-bar.css`) : retour à l'accueil, liens entre projets, « Jouer à La Brume ». Leur propre identité (Marcellus SC et or pour GW1, IM Fell et braise pour D4) n'est pas touchée.

## 4. Code et intégration

- **Stack** : HTML statique, CSS natif (custom properties, `color-mix`, `clamp`), ~4 Ko de JavaScript sans dépendance, comme le reste du dépôt. Aucun build, aucune bibliothèque. Le déploiement IONOS existant publie tel quel.
- **Nouvelle page** : `<link rel="stylesheet" href="/assets/umbra.css">`, la ligne `document.documentElement.classList.add("ut-js")` en tête, puis `<script src="/assets/umbra.js" defer>`. Réutiliser les classes `ut-*` de la planche.
- **Sous-page avec sa propre identité** : `<link rel="stylesheet" href="/assets/umbra-bar.css">` et le bloc `<nav class="ut-bar">` juste après `<body>` (copier celui de `gw1/index.html`, mettre `aria-current="page"` sur le bon lien ; ajouter `ut-bar--bleed` si la page garde la marge de 8 px du navigateur, comme `/d4/`).
- **Sans JavaScript** : tout est visible (les animations ne s'activent que sous `.ut-js`), le journal affiche les trois versions écrites dans le HTML, la FAQ fonctionne (`<details>`).
- **Pas de WebGL** : la brume et la lanterne sont en CSS (dégradés, masques, `transform`), donc rien à remplacer quand WebGL manque.
- **Accessibilité** : lien d'évitement, un seul H1, H2 par section, focus cyan visible partout, cibles ≥ 44 px, `prefers-reduced-motion`, `prefers-contrast: more`, `forced-colors`, textes alternatifs sur les visuels porteurs de sens.
- **Performance** : polices locales préchargées (2 × 20 Ko), image du hero préchargée en priorité haute (31 Ko), journal (47 Ko) chargé seulement à l'approche de sa section ou après le chargement complet, animations sur `transform` / `opacity` uniquement. Les polices sont mises en cache un an (`.htaccess`).
- **SEO** : title et description réécrits pour inclure La Brume ; JSON-LD `VideoGame` ajouté à côté de `WebSite` et `Organization` ; `/dev/` exclu de l'indexation (`robots.txt` et `noindex`).

## 5. Animations et objectif UX

| Animation | Où | Objectif |
|---|---|---|
| Ouverture « la lanterne s'allume » (1re visite de la session, ~1,4 s, passable) : noir, point de lumière à la lanterne, halo qui grandit jusqu'à dévoiler la page, titre qui sort de la brume (flou, lettres qui se resserrent) | Toute la page | Le premier contact raconte l'idée du site : la lumière qui guide dans la brume |
| Ouverture en cascade (fondu + flou qui se lève, 0 → 760 ms) | Hero | Lire dans l'ordre : statut, titre, promesse, action |
| Lanterne qui suit le pointeur, puis revient à la lanterne | Scène du hero | Le moment mémorable ; dit « jeu d'exploration nocturne » sans un mot |
| Carrousel du hero (7 s par projet : La Brume, Vaelmor, Guild Wars 1, Diablo IV) : fondu enchaîné, lent travelling avant, lumière qui glisse vers la source de chaque image, barre de progression | Hero | Montrer les quatre projets sans quitter la disposition du hero ; pause au survol du texte, au clavier et sur bouton (WCAG 2.2.2) |
| Brume qui dérive (34 s et 52 s) | Scène, fond de page | Profondeur et vie, sans attirer l'œil |
| Halo du bouton principal qui s'intensifie au survol | CTA | Désigner l'action principale |
| Point « en direct » qui respire | Badge de version | Signaler que le projet vit |
| Ligne qui se dessine au défilement | La descente | Montrer que les quatre étapes forment une boucle |
| Apparition au défilement (28 px, 0,9 s, une fois) | Titres de section, cartes | Rythme de lecture |
| Compteur 0 → 1 442 | Bandeau GW1 | Donner du poids au seul grand chiffre réel |
| Lumière au pointeur + inclinaison ≤ 1,5° | Cartes de guides | Confirmer que la carte est cliquable |
| Croix → × et soulignement qui se dessine | FAQ, liens tertiaires | Retour immédiat d'une action |

En mouvements réduits : rien ne bouge, tout est affiché, la lumière reste sur la lanterne.

## 6. Trois variantes de hero (visibles sur `/dev/design-system.html#heros`)

- **A · Sobre corporate** : centré, sans image, accent cyan seul. « Des jeux et des guides, à ouvrir dans le navigateur. » Pour un site qui voudrait mettre les quatre projets à égalité.
- **B · Futuriste** : sol en grille perspective qui défile, aurore violet-cyan, titre en dégradé « Chaque descente change. ». Plus spectaculaire, mais plus proche du registre « gaming » que le brief voulait éviter.
- **C · Éditorial premium (retenue)** : titre massif à gauche, scène de La Brume voilée à droite, éclairée par la lanterne. C'est le seul des trois qui parle du jeu lui-même.

## 7. Images, icônes et vidéos à créer

1. **Scène du hero en haute définition** : `la-brume-tuile.jpg` fait 538 × 660 px ; la scène s'affiche jusqu'à ~600 × 740 px, donc légèrement floue sur écran Retina. Exporter la même illustration en **1 076 × 1 320** (et une version 4/3 pour mobile) en WebP + AVIF, et la servir en `srcset`.
2. **Calques séparés** (ciel, citadelle, brume, voyageur) en PNG/WebP transparents : ils permettraient une vraie parallaxe en profondeur à la place du voile actuel.
3. **Boucle vidéo courte** (6–8 s, muette, < 1,5 Mo, WebM + MP4, avec `poster`) : une salle de La Brume en jeu, pour la section « La descente » ou en fond du bloc final, désactivée en mouvements réduits.
4. **Image Open Graph propre à La Brume** (1 200 × 630) pour le partage de `/themist/`.
5. **Icônes** : un jeu de 12 pictogrammes au trait 1,6 px sur grille 36 px, dans l'esprit des trois de « Fait pour jouer » (navigateur, langue, journal, manette, clavier, carte, épée…), en SVG inline.
6. **Emblèmes des quatre formes** (Lumenarque, Gouffre, Héraut du Glas, Tisse-Destin), tirés du jeu, pour illustrer l'étape « Choisis ta forme ».

## Points ouverts (à décider par l'auteur)

- **Mentions légales** : le site n'en a pas ; la loi française les impose à tout site édité en France (éditeur, hébergeur IONOS). Une page `/mentions-legales/` est à écrire avec tes informations.
- **Contact** : le thème a un formulaire prêt (planche), mais aucun moyen de contact n'est publié et l'envoi demande un traitement côté serveur (PHP sur IONOS, comme l'API de `/gw1/`). À brancher quand tu voudras un canal.
- **Réseaux sociaux** : aucun lien connu ; la colonne du pied de page est prête à les recevoir.
- **Trouvé pendant les captures** (déjà présent avant la refonte, non corrigé ici) : à 390 px de large, `/gw1/` déborde horizontalement (431 px).
