// La Brume · version du jeu et journal des versions
// Source unique : l'écran titre du jeu (index.html) et le wiki (wiki.html, via outils/wiki.mjs) lisent ce fichier.
// À chaque évolution du jeu : ajouter une ligne EN TÊTE du journal (et changer « actuelle » pour une nouvelle version).
(function(D){D.versions={
 actuelle:'v15.8',
 // Journal, du plus récent au plus ancien. d : date · h : version ou commit · t : ce qui change
 journal:[
  {d:'2026-10-17',h:'v15.8',t:'Jouabilité : l’esquive est mise en mémoire 0,18 s (une pression un peu trop tôt n’est plus perdue) et un très bref arrêt sur image souligne chaque coup reçu.'},
  {d:'2026-10-17',h:'v15.7',t:'Base technique : les textes et réglages du jeu (équipements, reliques, pactes, bestiaire, gardiens, Résonances, talents, formes, Sanctuaire, chroniques) sont rassemblés dans des fichiers de données, et le wiki est généré automatiquement à partir d’eux.'},
  {d:'2026-10-17',h:'5da259d',t:'Menus allégés : Portail (paliers en pastilles, commandes réduites), Sanctuaire, Colporteur'},
  {d:'2026-10-17',h:'8ec452a',t:'La Brume — portails texturés : arches en pierre taillée, brume animée, herse, sigils en relief, icônes redessinées'},
  {d:'2026-10-17',h:'4669f55',t:'Résonances : aperçu au survol et double-clic pour apprendre ; palier 0 : flèche et anneau vers l\'élément cité dans les bulles jaunes'},
  {d:'2026-10-16',h:'e4ccc9c',t:'v15.7 : wiki complet (themist/wiki.html) et bouton Wiki en jeu (HUD, titre, pause, touche K)'},
  {d:'2026-10-16',h:'17e85de',t:'v15.6 : portail en trois colonnes, bouton Descendre toujours visible'},
  {d:'2026-10-16',h:'08cc5f9',t:'v15.5 : fenêtres de principe au premier palier (Brumeux, pacte, contre-mesures, règles de salle, feinte, gardiens, talents, équipement)'},
  {d:'2026-10-16',h:'b148579',t:'v15.4 : pause à onglets (Personnage / Équipement / Journal), gestionnaire d\'équipement à 4 emplacements avec détail au survol, barre d\'actions fixe, messages violets alignés'},
  {d:'2026-10-16',h:'a2ea65c',t:'Affiche la version v15.3 sur l\'écran titre'},
  {d:'2026-10-16',h:'5471a70',t:'v15.3 : lisibilité des messages jaunes/violets (une info par ligne, mots-clés colorés, lecture plus longue) et des fiches équipement/pacte (texte plus grand, gain/coût séparés)'},
  {d:'2026-10-16',h:'8eb0c8a',t:'v15.2 : cohérence des talents (exclusions bidirectionnelles lanterne vivante/enfant/cœur/canon/fil rouge, ascension, solstice)'},
  {d:'2026-10-16',h:'8855503',t:'v15.1 : file de messages sans chevauchement, pause et cri démoniaque pour le texte violet, tutos limités au palier 0, effets visuels de compétences et cercle de boss retravaillés'},
  {d:'2026-10-16',h:'81c0869',t:'v15 : IA qui contourne les piliers, Rampants en mêlée, messages lisibles avec pause, icônes de compétences retravaillées, textes agrandis, guide condensé, phases de boss sans temps mort'},
  {d:'2026-10-16',h:'fc99d4c',t:'v14 : équipements épiques et légendaires, deuxième emplacement et sets, bluff du Brumeux, salles mutantes, Chroniqueur, aide adaptative'},
  {d:'2026-10-16',h:'054aa0a',t:'v13.1 : panneau Équipement dans la pause, pacte en cours, codex consultable'},
  {d:'2026-10-16',h:'9181905',t:'La Brume v13 : Pacte de la Brume, ennemis à rôles, équipements, gardiens II et III en trois temps'},
  {d:'2026-10-16',h:'6a4d24a',t:'La Brume v12 : le Brumeux et la Mère-Brume en trois temps'},
  {d:'2026-10-15',h:'0a9fa9b',t:'La Brume : points de Cadence du Héraut sous la barre de vie'},
  {d:'2026-10-15',h:'624a62f',t:'La Brume v11 : lisibilité, rythme et équilibrage'},
  {d:'2026-10-15',h:'b1dacbe',t:'Rename la-brume-v10-talents.html to index.html'}]
};})(window.BRUME_DATA=window.BRUME_DATA||{});
