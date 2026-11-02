/**
 * La compagnie (jalon M6) : `data/company.json`.
 *
 * - `hero` : nom du héros et niveau de départ (décisions n°133, n°134).
 * - `start` : compagnons présents dès le début, au même niveau que le héros.
 * - `recruitLevels` : niveau fixé de chaque recrue (n°135) ; elle arrive au plus
 *   haut de ce niveau et de la moyenne de la compagnie moins `catchUpGap`.
 * - `bossRecruits` : recrues qui rejoignent d'office après la victoire qui lève
 *   leur drapeau (Rhyel après le Gardien de Cendre, n°136).
 *
 * Module pur : ni DOM ni Phaser.
 */
import { z } from 'zod';
import { idSchema } from './schemas';

const unitRefSchema = z.strictObject({
  id: idSchema,
  name: z.string().min(1),
  class: idSchema,
});

export const companyFileSchema = z.strictObject({
  $comment: z.string().optional(),
  hero: z.strictObject({
    id: idSchema,
    name: z.string().min(1),
    level: z.number().int().min(1),
  }),
  start: z.array(unitRefSchema),
  recruitLevels: z.record(idSchema, z.number().int().min(1)),
  catchUpGap: z.number().int().min(0),
  bossRecruits: z.array(
    z.strictObject({
      flag: idSchema,
      unit: unitRefSchema,
    }),
  ),
});

export type CompanyFile = z.infer<typeof companyFileSchema>;
export type UnitRef = z.infer<typeof unitRefSchema>;
