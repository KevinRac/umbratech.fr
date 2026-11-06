# Équilibrage M10 — lot F (n°245, n°263 et suivantes)

Mesures faites avec `npm run simulate -- --n=6` (6 graines × 12 classes de héros = 72 combats par rencontre, IA prudente). Un écart de ±5 points entre deux lancements est du bruit : les rencontres à 1 ou 2 points d'une borne sont à lire comme « dans la cible ».

## 1. Méthode

**Le simulateur** (`src/logic/sim/`, `tools/simulate.ts`) joue chaque rencontre des données avec les vraies règles (formules, renforts aux tours 3 et 6, boss à deux phases, XP) :
- la carte est tirée du monde réel (`assets/maps/world.json`), le déploiement et la formation passent par la préparation du jeu (« Auto ») ;
- le camp ennemi joue avec l'IA du jeu ; la compagnie joue avec l'**IA prudente** (`src/logic/ai/prudentAi.ts`).

**L'IA prudente** imite un joueur attentif. Pour chaque case d'arrêt, elle estime les dégâts que la phase ennemie y infligera (coups répartis entre les cibles à portée), retranche ce danger au score de l'action (plus lourd pour le héros, un blessé, un coup mortel), garde la compagnie groupée, soigne (sort ou objet sous 55 % des PV), invoque, profite du terrain, et avance par le chemin réel quand les ennemis ne viennent pas. Au tour 6 elle force la décision pour qu'aucun combat ne s'éternise.

**La compagnie simulée** (`src/logic/sim/company.ts`, hypothèses modifiables en clair) :
- niveau = niveau moyen des soldats de la conception d'origine (table `PARTY_LEVEL` de `tools/simulate.ts`, figée pour que retoucher les ennemis ne déplace pas la compagnie) ;
- compagnons de la zone ou du niveau, choisis par rôle (tank, soin, tir, magie, mêlée…) : 3 en zone 1, jusqu'à 13 en zone 5 ;
- évolutions de branche A à partir du niveau 10 (1 membre en zone 3, 2 en zone 4, 3 en zone 5) ; accessoires (0 à 4) ; convoi d'objets de soin par zone, 5 objets au plus par membre.

Cela remplace la « compagnie d'essai » du lot A (A-10) : sans soigneur, sans évolution ni équipement, elle n'était pas une compagnie réelle.

## 2. Résultats

Moyennes : **ordinaires 82 % de victoires en 6,7 tours** (cible 70–90 % et ≤ 8 tours), **boss 50 %** (cible 45–70 %), **aucune classe de héros sous 50 %** (le pire : héritier des cendres, 66 %). Avant retouches, avec la même IA : ordinaires 66 %, boss 17 %, 31 rencontres sur 33 hors cible.

| Rencontre | Zone | Niv. | Victoires | Tours (victoires) | Héros à terre | PV restants | Combats / niveau | Cible |
|---|---|---|---|---|---|---|---|---|
| embuscade_du_gue | z1 | 3 | 85 % | 4.8 | 15 % | 75 % | 1.6 | ✔ |
| brigands_foret_racine | z2 | 4 | 89 % | 7.6 | 11 % | 72 % | 1.2 | ✔ |
| ★ camp_des_ecumeurs | z1 | 3 | 53 % | 11.9 | 47 % | 57 % | - | ✔ |
| rodeurs_aubemer | z1 | 2 | 83 % | 3.5 | 17 % | 79 % | 2.5 | ✔ |
| patrouille_ecumeurs | z1 | 3 | 86 % | 5.9 | 14 % | 72 % | 1.5 | ✔ |
| sentinelles_ecumeurs | z1 | 3 | 92 % | 5.5 | 8 % | 81 % | 1.7 | ✘ trop facile |
| embuscade_roseaux | z1 | 2 | 79 % | 4.2 | 21 % | 74 % | 1.8 | ✔ |
| milice_aubemer | z1 | 3 | 90 % | 4.5 | 10 % | 79 % | 1.8 | ✘ trop facile |
| chasseurs_de_ronces | z2 | 5 | 93 % | 8.0 | 7 % | 83 % | 1.4 | ✘ trop facile |
| betes_de_la_foret | z2 | 5 | 92 % | 6.7 | 8 % | 83 % | 1.7 | ✘ trop facile |
| sentinelles_de_ronces | z2 | 5 | 93 % | 5.3 | 7 % | 86 % | 1.6 | ✘ trop facile |
| embuscade_sous_bois | z2 | 5 | 86 % | 9.1 | 14 % | 81 % | 1.1 | ✘ trop long |
| milice_racine | z2 | 6 | 94 % | 6.0 | 6 % | 80 % | 1.5 | ✘ trop facile |
| ★ roi_cerf_corrompu | z2 | 6 | 46 % | 8.8 | 54 % | 52 % | - | ✔ |
| pillards_de_greve | z3 | 9 | 65 % | 7.1 | 35 % | 68 % | 2.9 | ✘ trop dur |
| marees_mortes | z3 | 9 | 83 % | 5.2 | 17 % | 72 % | 2.1 | ✔ |
| sentinelles_du_noye | z3 | 10 | 86 % | 6.4 | 14 % | 79 % | 1.7 | ✔ |
| embuscade_noyes | z3 | 10 | 76 % | 6.0 | 24 % | 62 % | 3.3 | ✔ |
| milice_brume | z3 | 10 | 96 % | 6.6 | 4 % | 75 % | 1.6 | ✘ trop facile |
| ★ soeur_merrow | z3 | 10 | 68 % | 10.3 | 31 % | 57 % | - | ✔ |
| mercenaires_de_cendre | z4 | 13 | 90 % | 10.9 | 10 % | 84 % | 1.5 | ✘ trop facile |
| eboulis_vivants | z4 | 13 | 74 % | 11.2 | 25 % | 79 % | 2.3 | ✘ trop long |
| sentinelles_de_cendre | z4 | 14 | 90 % | 13.2 | 10 % | 89 % | 1.6 | ✘ trop facile |
| embuscade_harpies | z4 | 14 | 57 % | 7.3 | 43 % | 61 % | 2.8 | ✘ trop dur |
| milice_cendre | z4 | 14 | 93 % | 8.5 | 7 % | 91 % | 1.6 | ✘ trop facile |
| ★ mere_harpie | z4 | 14 | 36 % | 13.5 | 64 % | 60 % | - | ✘ trop dur |
| ★ gardien_de_cendre | z4 | 15 | 61 % | 10.5 | 39 % | 87 % | - | ✔ |
| revenants_de_la_citadelle | z5 | 17 | 78 % | 5.4 | 22 % | 82 % | 2.3 | ✔ |
| gardes_engloutis | z5 | 18 | 82 % | 7.4 | 18 % | 87 % | 2.1 | ✔ |
| embuscade_abysses | z5 | 18 | 57 % | 6.2 | 43 % | 61 % | 2.8 | ✘ trop dur |
| arene_serie_1 | z2 | 7 | 69 % | 5.2 | 31 % | 75 % | 2.5 | ✘ trop dur |
| arene_serie_2 | z2 | 12 | 67 % | 6.0 | 33 % | 64 % | 2.1 | ✘ trop dur |
| arene_serie_3 | z2 | 17 | 63 % | 4.7 | 38 % | 60 % | 5.0 | ✘ trop dur |
| ★ roi_maree_brise | z5 | 18 | 38 % | 13.2 | 58 % | 53 % | - | ✘ trop dur |

| Classe de héros | Victoires (rencontres ordinaires) |
|---|---|
| gardien_des_marees | 98 % |
| lame_du_serment | 95 % |
| veilleur_des_falaises | 88 % |
| heritier_des_cendres | 66 % |
| porte_lanterne | 74 % |
| heraut_des_bannieres | 87 % |
| alchimiste_des_saisons | 68 % |
| danseur_des_courants | 72 % |
| invocateur_de_pierres_anciennes | 76 % |
| faconneur_de_racines | 90 % |
| ingenieur_des_ruines | 84 % |
| chasseur_de_serpents_de_mer | 84 % |

## 3. Retouches (données seulement)

Règles tenues : niveaux d'une rencontre à ±1 de l'original (et dans leur zone, test `foes.test.ts`) ; vagues de renforts de boss conservées (tours 3 et 6, GDD §7) ; barème d'XP du GDD §9.12 inchangé.

**`data/encounters.json`** (soldats : nombre, niveau moyen)
- Trop faciles, rendues plus rudes (+1 niveau, parfois +1 soldat) : embuscade du gué 2,6 → 3,6 ; brigands de la forêt 7 → 8 soldats, niv. 3,6 → 4,6 ; patrouille d'Écumeurs 4 → 5, niv. 2,8 → 3,8 ; sentinelles d'Écumeurs niv. 3,8 ; chasseurs de ronces, bêtes de la forêt, sentinelles de ronces, sous-bois, milice de la racine : +1 niveau et +1 soldat ; sentinelles du Noyé niv. 10,8 ; milice de la brume 4 → 6 ; sentinelles de cendre 4 → 5 ; milice de cendre 4 → 5.
- Trop dures, allégées (−1 niveau, parfois −1 à −2 soldats) : rôdeurs d'Aubemer niv. 1 ; pillards de la grève 5 → 4 ; marées mortes, embuscade de noyés, mercenaires, éboulis (4 → 3), harpies (5 → 3), revenants (5 → 3), gardes engloutis (4 → 3), abysses (5 → 3), arènes 1 (5 → 3), 2 et 3 (6 → 4).
- Boss : soldats d'escorte 5 → 3 (Roi cerf, Sœur Merrow, Gardien de cendre), 5 → 2 (Mère-Harpie, Roi de la marée brisée) ; niveau du boss −1 (−2 pour le Roi de la marée brisée) ; vagues de renforts conservées mais d'un ennemi (sauf Brakk et le Roi cerf, qui gardent leurs 4).

**`data/enemies.json`** (croissances par niveau, valeurs de base légèrement réduites pour les boss)
- Familles brume, cendre et citadelle : croissance PV/Force/Magie réduite de 20 à 25 points au total (ex. harpie 65/45 → 40/20, golem de cendre 80/40 → 55/15, abyssal magie 50 → 25).
- Boss : Roi cerf (PV 90 → 75, Force 55 → 40), Sœur Merrow (PV de base 41 → 33, croissances 80/60 → 50/30), Mère-Harpie (PV de base 50 → 38, croissances 90/55 → 55/20), Gardien de cendre (PV 90 → 65, Force 55 → 30), Orvane (PV de base 56 → 42, croissances 90/45/60 → 55/10/25).
- Les ennemis des zones 1 et 2 (écumeurs, miliciens, racine) ne sont pas touchés.

## 4. Ce qui reste hors cible (à valider)

- **Ordinaires trop faciles (90–96 %)** : sentinelles d'Écumeurs, milice d'Aubemer, chasseurs de ronces, bêtes de la forêt, sentinelles de ronces, milice de la racine, milice de la brume, mercenaires, sentinelles et milice de cendre. La plupart sont à 1–6 points de la borne ; il faudrait monter leurs niveaux au-delà de ±1 de l'original ou leur ajouter des soldats.
- **Trop longues (> 8 tours)** : sous-bois (9,1), éboulis vivants (11,2), mercenaires (10,9), sentinelles de cendre (13,2). Les golems et mercenaires de cendre sont lourds à abattre ; il faut baisser leur défense plutôt que leurs PV.
- **Trop dures** : embuscade de harpies et d'abysses (57 %), pillards de la grève (65 %), les trois arènes (63–69 %), Mère-Harpie (36 %), Roi de la marée brisée (38 %).
- **Rythme d'XP** : 1,1 à 2 combats par niveau en zones 1 et 2 pour 2 à 4 visés ; en zones 3 à 5 on est dans la cible (1,5 à 3). Le barème vient du GDD §9.12 et ses valeurs sont protégées par les tests : je n'y ai pas touché.
- **Héros les plus faibles** : héritier des cendres (66 %), alchimiste (68 %) ; les plus forts : gardien des marées (98 %) et lame du serment (95 %). L'écart de 30 points est un sujet de classes (n°245 demande ≥ 50 % pour chacune : tenu).

## 5. Décisions à valider

263. **Le simulateur et sa compagnie** (§1) sont la référence d'équilibrage ; hypothèses de compagnie modifiables dans `company.ts`. Accepter ? 
264. **Niveau de la compagnie** figé par rencontre au niveau d'origine des soldats (`PARTY_LEVEL`).
265. **Retouches de données** du §3, avec les bornes ±1 niveau / vagues conservées.
266. **Tolérance** : ±5 points de bruit ; une rencontre à 90–94 % ou 65–69 % n'est pas retouchée dans ce lot.
267. **Rythme d'XP** : (a) laisser le barème du GDD (z1–z2 rapides) ; (b) baisser l'XP de base d'un ordinaire en zones 1–2 (nécessite de modifier le GDD §9.12 et ses tests) ; (c) ajouter des rencontres en zones 1–2. Je recommande (a) pour M10 et (c) plus tard.
268. **Suite** : lot de finitions sur les rencontres du §4 (défense des golems de cendre, embuscades de harpies et d'abysses, arènes, Mère-Harpie, Roi de la marée brisée), après vos retours sur le rythme de jeu réel.
