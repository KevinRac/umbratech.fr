// La Brume · version du jeu et journal des versions
// Source unique : l'écran titre du jeu (index.html) et le wiki (wiki.html, via outils/wiki.mjs) lisent ce fichier.
// À chaque évolution du jeu : ajouter une ligne EN TÊTE du journal (et changer « actuelle » pour une nouvelle version).
(function(D){D.versions={
 actuelle:'v16.6',
 // Journal, du plus récent au plus ancien. d : date · h : version ou commit · t : ce qui change
 journal:[
  {d:'2026-10-17',h:'v16.6',t:'Lisibilité : les zones d’attaque des ennemis communs (explosion du Bouffi, cri du Hurleur, coup du Voilé, charge de la Brute) sont rouges, avec contour pointillé, pour ne plus les confondre avec tes effets ; les tirs des Spectres ont un liseré rouge. Les bulles d’information en run portent une icône colorée (vert gain, rouge danger, doré info, violet Brumeux, bleu butin) et mettent les chiffres en relief. Les cartes de pacte et d’aide montrent une icône et la valeur en gros. Nouvel écran d’accueil : un gros bouton avec la forme choisie, progression en pastilles, quatre formes en tuiles à icônes (touches 1 à 4) et aperçu animé sans défiler. Nouveau fichier data/icones.js.'},
  {d:'2026-10-17',h:'v16.5',t:'Marée noire du Héraut Noyé, nouveau rendu : masse d’eau profonde en dégradé, crête d’écume ondulante avec bulles, courants sombres, remous derrière la vague, gerbes aux bords de la brèche ; avant l’impact, la vague se lève au bord de départ et des chevrons clairs défilent dans le couloir balayé.'},
  {d:'2026-10-17',h:'v16.4',t:'Le rectangle jaune d’information (niveau atteint, salle nettoyée) est collé en haut de l’écran. La Marée noire du Héraut Noyé est redessinée : mur d’eau noire à crête d’écume, brèche signalée par un halo clair, plus aucun tiret.'},
  {d:'2026-10-17',h:'v16.3',t:'Palier 0 : plus aucune bulle jaune ni texte violet, c’est au joueur de découvrir les capacités et les ennemis. Quand le Brumeux agit (contre-mesure, pacte, règle de salle, feinte), il pousse seulement un cri démoniaque. Les fenêtres de principe ne parlent plus de « texte violet ».'},
  {d:'2026-10-17',h:'v16.2',t:'Interface refaite : l’arbre de talents (jeu et wiki, même rendu) se déplie branche par branche avec zoom, fiche épinglable et onglets ; le récap de fin de run tient en un écran à trois onglets ; le Portail et l’écran titre montrent un aperçu animé du gameplay de chaque forme en trois gestes.'},
  {d:'2026-10-17',h:'v16.1',t:'Le Brumeux juge ses contre-mesures : il compare ce qu’elles te coûtent (PV perdus, temps) à tes salles ordinaires, relance celles qui portent, se détourne de celles que tu déjoues et y renonce après deux échecs. Deux nouvelles contre-mesures : Renforts et Béliers.'},
  {d:'2026-10-17',h:'v16.0',t:'Gardiens refaits : le Héraut Noyé a ses propres attaques (Marée noire avec sa brèche, Cloches noyées qui écrasent aussi les ennemis, Double marée au troisième temps) et le Glas Originel gagne le Battement inverse. Toutes leurs attaques sont décrites dans le wiki.'},
  {d:'2026-10-17',h:'v15.9',t:'La Brèche : une porte facultative (à partir de la 3e salle) mène à un combat plus dur avec un champion et une règle de salle imposée ; elle donne une relique au choix, de l’or et une relance de talents.'},
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
