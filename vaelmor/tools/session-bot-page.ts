/**
 * Morceau injecté dans la page par le banc de session (`tools/session-bench.mjs`, n°279).
 *
 * Le banc joue au clavier, comme un joueur ; ce qu'il ne peut pas deviner de l'extérieur, il le
 * demande aux deux fonctions pures du jeu lui-même (aucune règle recopiée) :
 *  - `findPath` : le chemin A* sur la grille de collision du monde (celui des patrouilles) ;
 *  - `nextPrudentPlan` : la prochaine action de l'IA « prudente » de la compagnie (celle du
 *    simulateur d'équilibrage), qu'il rejoue ensuite par le menu de combat.
 *
 * Ce fichier est empaqueté par esbuild au lancement du banc ; il n'entre pas dans le build du jeu.
 */
import { nextPrudentPlan } from '../src/logic/ai/prudentAi';
import { findPath } from '../src/logic/world/pathfinding';

Object.assign(window, { __bot: { findPath, nextPrudentPlan } });
