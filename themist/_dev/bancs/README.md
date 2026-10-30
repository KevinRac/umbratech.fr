# Bancs Chromium du Dernier Souvenir (v17.23)

Outils de développement, pas du jeu. Ils ouvrent `index.html` dans Chromium sans affichage (Playwright) et vérifient le Dernier Souvenir en jeu.

1. Servir `themist/` : `python3 -m http.server 8765` (depuis `themist/`).
2. Lancer un banc : `node themist/_dev/bancs/<banc>.mjs 8765`.

Les chemins de Playwright (`/opt/npm-tools/node_modules/`) et de Chromium (`/opt/pw-browsers/…`) sont ceux de l'environnement de travail de Claude : à adapter ailleurs.

| Banc | Ce qu'il vérifie |
|---|---|
| `banc-dernier.mjs` | actions 1-2 : brûler, désigner, état « brûlé » de l'arbre, D4, recalcul |
| `banc-effets.mjs` | action 3 : les 14 effets contre une vague, Masqué porteur et ordinaire, gardiens, verrou de phase, Reflet |
| `banc-touche.mjs` | action 4 : touche X, braise du HUD, embrasement, mouvements réduits |
| `banc-essai.mjs` | actions 5-6 : `?dernier=`, chronique, statistiques, fin de run |
| `banc-complet.mjs` | action 7 : 14 effets en cours, touches vidées, démo, oubli par Tab, reprise au Masqué, descente des quatre formes (sections A à F en argument : `node banc-complet.mjs 8765 AB`) |
| `banc-relecture.mjs` | action 8 : correctifs de la relecture du Dernier Souvenir (Fureur au plafond, rempart, Carillon, hub) |
| `banc-glas-relecture.mjs` | action 8 : correctifs de la relecture du Glas v17.22 (Temps Suspendu, « à nu », justice, essai) |
| `mesure-vagues.mjs` | mesure : ce que chaque brûlure fait à une vague (`node mesure-vagues.mjs 8765 [acte] [familles] ['{"onde":{"degats":26}}']` : acte 1 à 3, familles séparées par des virgules, valeurs d'essai posées dans la page sans toucher aux données) |
| `mesure-forts.mjs` | mesure (action 10) : Dernière ombre et Dernier élan contre un Masqué, avec et sans brûlure (`node mesure-forts.mjs 8765 [acte] [essais]`) |
| `banc-nemesis.mjs` | némésis (v17.25), actions 1-4 (revanche : souvenir repris, laissé, Éclats, rang, mémoire pleine, brûlé) : promotion à la mort, porteur et ordinaire, une par acte, refus (brisé, absent, essai, démo, Phénix), sauvegarde versionnée ; retour à sa salle (une fois, son acte, halte), assemblage, souvenir, force et PV de ses points, répit, fiche périmée |
| `capture-crane.mjs` | captures du crâne de la némésis (action 5a) : planche des tailles et crânes posés sur les trois corps (`node capture-crane.mjs 8765 <dossier> [zoom]`) ; références : `crane-*.png` |
| `capture-trousseau.mjs` | vidéo du trousseau animé (action 5b) : marche, arrêt, ruée, mort (`node capture-trousseau.mjs 8765 <dossier> [n] [corps]`) ; référence : `trousseau-etapes.png` |

Détail et résultats : `../memoire.md`, § 27 (Dernier Souvenir) et § 28 (némésis).
- `banc-essai-nemesis.mjs` : le mode d'essai `?nemesis=` (némésis en mémoire, rien d'écrit dans SAVE, reprise à sa mort). `capture-5b.mjs` : captures de la porte, de la carte d'arrivée et de l'écran de mort.
