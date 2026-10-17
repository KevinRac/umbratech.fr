// La Brume · icônes d'interface (tracés SVG 24 × 24, en trait)
// Source unique : le jeu (index.html : bulles d'information, cartes de pacte, aides) ET le wiki (via outils/wiki.mjs).
// Chaque icône est un chemin SVG (attribut « d »). Les icônes de compétences et d'objets restent dans index.html.
// Les noms commencent par « u_ » (interface). On ajoute une icône ici, puis on la cite par son nom.
(function(D){D.icones={
 u_sword:'M20 4l-9.5 9.5M20 4h-5.5M20 4v5.5M8.5 11.5l4 4M7 17l-3.5 3.5M5.5 14.5l4 4',
 u_heart:'M12 20.5s-7.5-4.6-7.5-10.2A4.2 4.2 0 0 1 12 7.8a4.2 4.2 0 0 1 7.5 2.5c0 5.6-7.5 10.2-7.5 10.2z',
 u_heart_x:'M12 20.5s-7.5-4.6-7.5-10.2A4.2 4.2 0 0 1 12 7.8a4.2 4.2 0 0 1 7.5 2.5c0 5.6-7.5 10.2-7.5 10.2zM12.5 8.5l-2.5 4 3 2-1.5 3.5',
 u_bolt:'M13.5 3L5 13.5h6L10 21l9-11h-6.2z',
 u_coin:'M4 12a8 8 0 1 0 16 0a8 8 0 1 0-16 0M12 7v10M9.3 9.8c0-1 1.1-1.6 2.7-1.6s2.7.6 2.7 1.6-1.1 1.4-2.7 1.8-2.7.8-2.7 1.8 1.1 1.6 2.7 1.6 2.7-.6 2.7-1.6',
 u_drop:'M12 3c4 5 6.5 8.3 6.5 11.3a6.5 6.5 0 0 1-13 0C5.5 11.3 8 8 12 3z',
 u_fog:'M6.5 16.5a4 4 0 0 1-.4-8A5.3 5.3 0 0 1 16.4 7a4.3 4.3 0 0 1 1.1 9.5zM4 20.5h16',
 u_weight:'M5 19.5h14l-2-9.5H7zM9.5 10V7.5a2.5 2.5 0 0 1 5 0V10',
 u_skull:'M6 11a6 6 0 0 1 12 0v3l-2 2v3H8v-3l-2-2zM9 12.2h1.2M13.8 12.2H15M11 19v-2M13 19v-2',
 u_shield:'M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6z',
 u_shield_x:'M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6zM9 9.5l6 6M15 9.5l-6 6',
 u_fist:'M7 11V8a1.5 1.5 0 0 1 3 0v-1a1.5 1.5 0 0 1 3 0v1a1.5 1.5 0 0 1 3 0v3.5c0 4-2 7-5 7s-5-2-5-5z',
 u_warn:'M12 3.5L2.5 20h19zM12 10v5M12 17.3v.4',
 u_up:'M12 20V5M6 11l6-6 6 6',
 u_down:'M12 4v15M6 13l6 6 6-6',
 u_star:'M12 3l2.7 5.6 6.1.8-4.5 4.2 1.1 6L12 16.6 6.6 19.6l1.1-6L3.2 9.4l6.1-.8z',
 u_gem:'M12 3l7 6-7 12L5 9zM5 9h14M9 9l3 12 3-12M9 9l3-6 3 6',
 u_check:'M4.5 12.5l5 5 10-11',
 u_cross:'M6 6l12 12M18 6L6 18',
 u_book:'M5.5 4h11A2.5 2.5 0 0 1 19 6.5V20H8A2.5 2.5 0 0 1 5.5 17.5zM5.5 17.5A2.5 2.5 0 0 1 8 15h11',
 u_flask:'M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3M8 15h8',
 u_hourglass:'M7 3h10M7 21h10M8 3v3l4 6-4 6v3M16 3v3l-4 6 4 6v3',
 u_dice:'M5 5h14v14H5zM9 9h.4M14.6 9h.4M12 12h.4M9 15h.4M14.6 15h.4',
 u_target:'M4 12a8 8 0 1 0 16 0a8 8 0 1 0-16 0M12 6.5v-3.5M12 21v-3.5M6.5 12H3M21 12h-3.5',
 u_info:'M4 12a8 8 0 1 0 16 0a8 8 0 1 0-16 0M12 11v5M12 8v.4',
 u_eye:'M2 12c3-5 7-7 10-7s7 2 10 7c-3 5-7 7-10 7s-7-2-10-7zM9 12a3 3 0 1 0 6 0a3 3 0 1 0-6 0',
 u_pact:'M6 3h9l3 3v15H6zM15 3v3h3M9 11h6M9 15h4',
 u_swarm:'M5 17a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0-5 0M14 17a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0-5 0M9.5 8a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0-5 0',
 u_door:'M6 21V4h12v17M4 21h16M14.5 12.5h.4',
 u_ghost:'M5.5 20V11a6.5 6.5 0 0 1 13 0v9l-2.2-2-2.1 2-2.2-2-2.2 2-2.1-2zM9.5 11h.4M14.1 11h.4',
 u_arrow:'M4 12h15M13 6l6 6-6 6'
};})(window.BRUME_DATA=window.BRUME_DATA||{});
