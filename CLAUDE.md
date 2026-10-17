# umbratech.fr

## La Brume (`themist/`)

- `themist/index.html` : le jeu. `themist/wiki.html` : son wiki.
- Les données du jeu (noms, raretés, textes, taux) vivent dans `themist/data/*.js`. Le jeu et le wiki les lisent tous les deux.
- Toute modification du jeu doit être reflétée dans le wiki :
  - si elle touche `themist/data/`, lancer `node themist/outils/wiki.mjs` (la CI le fait aussi avant le déploiement) ;
  - sinon, mettre à jour la section du wiki à la main dans le même commit.
- Les sections générées portent un commentaire « Section générée par outils/wiki.mjs » : ne pas les modifier à la main, modifier les données ou le gabarit dans `outils/wiki.mjs`.
- Talents : noms, descriptions, améliorations, rangs et exclusions se modifient dans `themist/data/talents.js`. Les textes écrits dans les `N(…)` d'index.html sont remplacés au chargement par ceux des données ; les effets (`apply`) et la structure de l'arbre restent dans index.html.
- `node themist/outils/wiki.mjs --check` vérifie que le wiki est à jour.
- Publication : push direct sur `main` (déploiement automatique sur IONOS).
