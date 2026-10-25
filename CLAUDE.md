# umbratech.fr

## La Brume (`themist/`)

- `themist/index.html` : le jeu. `themist/wiki.html` : son wiki.
- Les données du jeu (noms, raretés, textes, taux) vivent dans `themist/data/*.js`. Le jeu et le wiki les lisent tous les deux.
- Toute modification du jeu doit être reflétée dans le wiki :
  - si elle touche `themist/data/`, lancer `node themist/outils/wiki.mjs` (la CI le fait aussi avant le déploiement) ;
  - sinon, mettre à jour la section du wiki à la main dans le même commit.
- Les sections générées portent un commentaire « Section générée par outils/wiki.mjs », et les fragments générés sont entourés de `<!-- gen:nom -->` … `<!-- /gen:nom -->` : ne pas les modifier à la main, modifier les données ou le gabarit dans `outils/wiki.mjs`. Le reste du wiki (explications, FAQ, conseils) se modifie à la main.
- Version et journal : à chaque évolution du jeu, ajouter une ligne en tête du journal dans `themist/data/versions.js` (et changer `actuelle` pour une nouvelle version : l'écran titre et le wiki suivent).
- Talents : noms, descriptions, améliorations, rangs et exclusions se modifient dans `themist/data/talents.js`. Les textes écrits dans les `N(…)` d'index.html sont remplacés au chargement par ceux des données ; les effets (`apply`) et la structure de l'arbre restent dans index.html.
- Sous-classes : trois par forme, une par branche principale (angles 0, 180 et 90 dans `data/talents.js`, listées dans `formes.*.subs`). Les troisièmes voies (pha, aby, val, bro) et leurs ultimes [F] sont codées dans le bloc « v16.42 » d’index.html ; un nouveau nœud doit aussi être ajouté au graphe (`ADJ`/`EDGES`).
- `node themist/outils/wiki.mjs --check` vérifie que le wiki est à jour.
- Équipements : emplacements fixes (`emplacements` : un seul type d'objet par emplacement), objets et fiches (`plus` / `moins` : lignes courtes, `fl` : texte d'ambiance) dans `themist/data/equipements.js` ; icônes peintes dans `themist/data/icones-objets.js` (`BRUME_DATA.iconeObjet(id, {col, r})`, utilisé par le jeu et le wiki ; matières et halos = filtres communs `fx_*` ; le SVG doit rester du XML valide, car le HUD l’affiche en image). Un set doit toujours réunir deux emplacements différents.
- Le Masqué (élite assemblé) : réglages dans `themist/data/bestiaire.js` (`assemble`), dessin du masque dans `themist/data/masque.js`. `node themist/outils/sim-masque.mjs` vérifie le tirage et la file de sorts ; en jeu, `__asm.essai()` dans la console ouvre une salle avec un Masqué.
- La Mémoire (v17.1) : 10 talents actifs ; les reliques et l’équipement sont hors mémoire. Gravure (v17.3) : `gravure` et `gr` des familles dans `souvenirs.js` ; un talent porté au rang max se grave sans prendre de place (D11). Éveils (v17.4, compétences en v17.6) : texte dans `souvenirs.js` (`eveils`), effet lu en jeu par `EVL(id)` ; une nouvelle compétence, un nouveau nœud clé ou un nouvel ultime doit recevoir un éveil. Plafond et familles dans `themist/data/souvenirs.js` ; logique dans le bloc « v17 · La Mémoire » à la fin d’index.html (état `RUN.memoire`, réserve `RUN.reserveBrume`, rien d’affiché). Un nouveau talent doit recevoir une famille dans `souvenirs.js`. Décisions : `themist/_dev/memoire.md`. En console : `__memoire`.

## Azertyrolien (`Azertyrolien/`)

- Jeu de la Tyrolienne façon Juste Prix pour l'Azerty Party 2026 : `index.html` (grand écran), `manette.html?salle=CODE` (téléphone du candidat).
- Partie à plusieurs : salle d'attente → chrono par objet (tous les joueurs répondent) → révélation → classement. État `G` (joueurs, réponses `rep`, résultats `res`) sauvé dans le navigateur de l'écran ; chaque téléphone a un identifiant `pid` persistant.
- Le jeu est dans `js/jeu.js`, la manette dans `js/manette.js`, la liaison écran/téléphones (MQTT public, code de salle) dans `js/liaison.js`. Mode d'emploi : `Azertyrolien/README.md`.

## Publication

- Push direct sur `main` (déploiement automatique sur IONOS).
