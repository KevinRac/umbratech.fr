/**
 * Alliés verts (jalon M5, GDD §7.8) : `data/allies.json`.
 *
 * - `templates` : modèles d'unités alliées (classe, apparence de combat, écart de
 *   niveau par rapport à la zone). Toujours gérés par une IA, jamais par le joueur.
 * - `villages` : pour chaque village, ses gardes (fixes, garantis à partir
 *   d'« Amical ») et ses alliés de passage (tirés au sort selon la réputation).
 * - `wanderers` : alliés errants qui parcourent l'île sur de longues routes. Ce
 *   sont des PNJ (même format que `locations.json` : apparence, portrait,
 *   salutation, sujets) qui suivent un trajet et rejoignent les combats proches.
 *
 * Module pur : ni DOM ni Phaser.
 */
import { z } from 'zod';
import { idSchema } from './schemas';
import { npcSchema } from './townSchemas';

export const allyTemplateSchema = z.strictObject({
  id: idSchema,
  /** Nom affiché en combat (« Garde de Haut-Gué »). */
  name: z.string().min(1),
  /** Classe (classes.json) : stats, croissances, arme de départ, élément, armure. */
  class: idSchema,
  /** Apparence de combat (render/unitSprites.ts), dessinée aux couleurs vertes des alliés. */
  sprite: idSchema,
  /** Niveau = milieu des niveaux de la zone + cet écart. */
  levelOffset: z.number().int().min(-5).max(5),
  /**
   * Allié vert nommé (errant, figure de village) : il a des scènes de combat
   * avec les ennemis nommés (GDD §7.9) ; son identifiant de personnage est
   * l'identifiant du modèle.
   */
  named: z.boolean().optional(),
  /**
   * Figure de village (jalon M7, n°197) : le PNJ de `locations.json` dont il
   * prend le nom, l'apparence et le portrait ; en combat il porte l'équipement
   * de sa classe. Toujours `named`.
   */
  npc: idSchema.optional(),
});

export const allyVillageSchema = z.strictObject({
  /** Lieu (locations.json) dont la réputation décide. */
  location: idSchema,
  /** Gardes du village (le premier vient seul à « Amical », deux à partir d'« Allié »). */
  guards: z.array(idSchema).min(1),
  /** Alliés de passage : un seul est tiré quand le sort le permet. */
  passers: z.array(idSchema).min(1),
  /**
   * Figures nommées du village (n°197) : quand un ennemi nommé lié à l'une
   * d'elles est du combat, elle vient d'abord (à la place d'un garde ou de
   * l'allié de passage), si le village l'aime assez et qu'elle n'est pas blessée.
   */
  figures: z.array(idSchema).optional(),
});

export const wandererSchema = npcSchema.extend({
  /** Modèle d'unité quand il rejoint un combat. */
  template: idSchema,
  /** Étapes (cases du monde) parcourues en boucle ; `at` est son point de départ. */
  route: z.array(z.tuple([z.number().int().min(0), z.number().int().min(0)])).min(2).max(16),
});

export const alliesFileSchema = z.strictObject({
  $comment: z.string().optional(),
  templates: z.array(allyTemplateSchema).min(1),
  villages: z.array(allyVillageSchema),
  wanderers: z.array(wandererSchema),
});

export type AllyTemplateDef = z.infer<typeof allyTemplateSchema>;
export type AllyVillageDef = z.infer<typeof allyVillageSchema>;
export type WandererDef = z.infer<typeof wandererSchema>;
export type AlliesFile = z.infer<typeof alliesFileSchema>;
