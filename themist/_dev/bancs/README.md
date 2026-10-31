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
| `capture-heraut.mjs` | v17.27, action 3 : le Héraut Noyé redessiné (planche avant/après et moments, corps plein, couleurs ΔE, coût, mouvements réduits) |
| `capture-mere.mjs` | v17.27, action 4 : la Mère-Brume redessinée (planche avant/après et moments : l'enfant se défait, la couronne se brise, étreinte, ruée, copie des quatre formes, à nu, fondu ; corps plein, couleurs ΔE, coût, mouvements réduits) ; référence : `mere-planche.png` |
| `capture-lisibilite.mjs` | v17.27, action 5 : lisibilité des trois gardiens (G3, G5, G13) : ΔE ≥ 25 de chaque lueur dessinée (halos et traits espionnés, données, lumières de salle, copies des quatre formes) contre orange, violet, cyan et lavande ; un même anneau (`G27.anneau`) sur le point faible, seulement à nu ; lueur de copie à la couleur de la forme ; fondu d'esquive : alpha effectif de chaque tracé ≤ × fondu (cache compris) ; planches `lisibilite-copies.png` et `lisibilite-nu-fondu.png` |
| `capture-scene.mjs` | v17.27, action 6 : entrées (G9, fantôme dessiné pendant la bannière, jamais dans `enemies`, né dans les 2,2 s, pose pleine à la naissance) et morts (G10, ~1,5 s, salle déjà vidée et purgée pendant la scène, `e.fade` rendu, seules les cinq explosions remplacées) des trois gardiens ; mouvements réduits (fondu seul, G14) ; coût ≤ gardien vivant + 1 ms ; planche `scene-entrees-morts.png` (rendu hors écran) |
| `banc-nemesis.mjs` | némésis (v17.25), actions 1-4 (revanche : souvenir repris, laissé, Éclats, rang, mémoire pleine, brûlé) : promotion à la mort, porteur et ordinaire, une par acte, refus (brisé, absent, essai, démo, Phénix), sauvegarde versionnée ; retour à sa salle (une fois, son acte, halte), assemblage, souvenir, force et PV de ses points, répit, fiche périmée |
| `capture-crane.mjs` | captures du crâne de la némésis (action 5a) : planche des tailles et crânes posés sur les trois corps (`node capture-crane.mjs 8765 <dossier> [zoom]`) ; références : `crane-*.png` |
| `capture-trousseau.mjs` | vidéo du trousseau animé (action 5b) : marche, arrêt, ruée, mort (`node capture-trousseau.mjs 8765 <dossier> [n] [corps]`) ; référence : `trousseau-etapes.png` |

Détail et résultats : `../memoire.md`, § 27 (Dernier Souvenir) et § 28 (némésis).
- `banc-essai-nemesis.mjs` : le mode d'essai `?nemesis=` (némésis en mémoire, rien d'écrit dans SAVE, reprise à sa mort). `capture-5b.mjs` : captures de la porte, de la carte d'arrivée et de l'écran de mort.
- `banc-nemesis-complet.mjs` : N18 en temps réel (promotion par chaque chemin, trousseau accroché/côté/figé, mouvements réduits, plafond, modes d'essai, régressions des quatre formes). `mesure-nemesis.mjs <port> [acte] [dps]` : PV, temps pour la briser et force selon les points.
- `banc-nemesis-revue.mjs` : un test par défaut trouvé à la relecture indépendante (reprise en double, statistiques de reprise, infobulle hors 16:9, fiche abîmée).
- `capture-gardiens.mjs` (v17.27, gardiens redessinés, actions 1-2) : `node capture-gardiens.mjs 8765 <dossier> [zoom]` ; planche avant/après du Glas aux trois temps (référence : `glas-planche.png`), chute des plaques, téléportation, fondu, à nu, Reflet qui sort par la fente, mouvements réduits ; vérifie que l'interrupteur `dessin.actif` ne change rien du combat, le corps plein (≤ 1,15 × r) et le coût du dessin (≤ 1 ms de plus par image).
