/**
 * Ennemis nommés et dialogues de combat (GDD §7.9, bible narrative §9,
 * décisions n°105 à n°115 et n°174 à n°191).
 *
 * - `enemies.json › named` : les **fiches nommées**. Un nommé est un « Écho » :
 *   il reprend un modèle d'ennemi (`skinOf` : stats, arme, IA, apparence) avec
 *   un nom, un détail visible sur le sprite (`detail`, jamais une couleur :
 *   les couleurs sont celles des camps), une zone et, s'il est recrutable, sa
 *   fiche de recrutement. Le registre en tire une fiche d'ennemi complète.
 * - `battleQuotes.json` : les **scènes**. Une scène lie un ennemi (nommé ou
 *   boss) à une ou plusieurs unités (compagnie ou allié vert nommé) : citation
 *   de combat, Parler, citation de mort, de phase, de deuil.
 *
 * Module pur : ni DOM ni Phaser.
 */
import { z } from 'zod';
import { PORTRAIT_MOODS } from './skins';
import { enemiesFileSchema, idSchema } from './schemas';
import { TIER_IDS } from './townSchemas';

const comment = z.string().optional();
const tierId = z.enum(TIER_IDS);

/* ---------- Conditions ---------- */

const repCondition = z.strictObject({
  /** Lieu ou faction (reputation.json, locations.json). */
  target: idSchema,
  tierMin: tierId.optional(),
  tierMax: tierId.optional(),
});

/** Conditions d'une scène, d'un recrutement ou d'une apparition (toutes doivent être vraies). */
const conditionFields = {
  /** Quête terminée. */
  questDone: idSchema.optional(),
  /** Quête en cours (acceptée, pas encore rendue). */
  questActive: idSchema.optional(),
  /** Drapeau de progression levé (ou non). */
  flag: idSchema.optional(),
  notFlag: idSchema.optional(),
  /** Membre de la compagnie. */
  recruited: idSchema.optional(),
  /** Unité présente sur la carte (compagnie ou allié vert nommé). */
  deployed: idSchema.optional(),
  /** Palier de réputation d'un lieu ou d'une faction. */
  rep: repCondition.optional(),
  /** Or possédé. */
  gold: z.number().int().min(0).optional(),
  /** Scène déjà vue (ou non) dans la partie. */
  seen: idSchema.optional(),
  notSeen: idSchema.optional(),
  /** Tour maximal du combat. */
  maxTurn: z.number().int().min(1).optional(),
};
const simpleConditionSchema = z.strictObject(conditionFields);

export const battleConditionSchema = z.strictObject({
  ...conditionFields,
  /** Au moins une de ces conditions (« 300 or ou réputation Couronne sous Neutre »). */
  any: z.array(simpleConditionSchema).min(2).optional(),
});
export type BattleCondition = z.infer<typeof battleConditionSchema>;

/* ---------- Fiches nommées (`enemies.json › named`) ---------- */

export const recruitSchema = z.strictObject({
  /** Unités qui peuvent lui parler (compagnie, ou allié vert nommé : il parle seul, n°184). */
  talkers: z.array(idSchema).min(1),
  /** Prérequis : s'ils manquent, il refuse (n°180). */
  requires: battleConditionSchema.optional(),
  /** Délai : passé ce tour, ou sous cette part de ses PV, il refuse. */
  deadline: z.strictObject({ turn: z.number().int().min(1).optional(), hpBelow: z.number().gt(0).lt(1).optional() }).optional(),
  /** Rançon payée au succès (à la fin du combat), sauf si `waivedIf` est vrai. */
  ransom: z.strictObject({ gold: z.number().int().positive(), waivedIf: battleConditionSchema.optional() }).optional(),
  /** Classe et niveau en rejoignant la compagnie (n°181). */
  asClass: idSchema,
  level: z.number().int().min(1).max(30),
});

export const namedEnemySchema = z.strictObject({
  id: idSchema,
  name: z.string().min(1),
  /** Titre affiché sous le nom (« le Cadet ») ; par défaut, le nom du modèle. */
  title: z.string().min(1).optional(),
  /** Modèle d'ennemi (enemies.json) dont il reprend tout. */
  skinOf: idSchema,
  /** Détail visible ajouté au sprite du modèle (n°175), 1 à 6. */
  detail: z.number().int().min(1).max(6),
  /** Zone où il vit (apparition aléatoire, n°115, n°186). */
  zone: idSchema,
  /** Description du portrait (peint en M7). */
  portrait: z.string().min(1),
  /** Histoire (bible narrative). */
  story: z.string().min(1).optional(),
  /** Condition d'apparition au hasard (quête de son Écho terminée…) ; `false` : jamais au hasard. */
  pop: z.union([battleConditionSchema, z.literal(false)]).optional(),
  recruit: recruitSchema.optional(),
});
export type NamedEnemyDef = z.infer<typeof namedEnemySchema>;
export type RecruitDef = z.infer<typeof recruitSchema>;

/* ---------- Scènes (`battleQuotes.json`) ---------- */

export const SCENE_KINDS = ['battle', 'talk', 'death', 'phase', 'mourn'] as const;
export type SceneKind = (typeof SCENE_KINDS)[number];
export const SCENE_DIRECTIONS = ['ally_attacks', 'enemy_attacks', 'either'] as const;
export const SCENE_MOODS = ['neutral', ...PORTRAIT_MOODS] as const;

export const sceneLineSchema = z.strictObject({
  /** Qui parle : un personnage (« nessa », « brakk », « heros »…). */
  speaker: idSchema,
  text: z.string().min(1),
  mood: z.enum(SCENE_MOODS).optional(),
});
export type SceneLine = z.infer<typeof sceneLineSchema>;

export const sceneSchema = z.strictObject({
  id: idSchema,
  /** L'ennemi nommé ou le boss. */
  enemy: idSchema,
  /**
   * Unités liées : la scène se joue avec l'une d'elles. Obligatoire pour
   * `battle`, `talk` et `mourn` ; vide pour une citation de mort ou de phase
   * jouée quel que soit l'auteur du coup.
   */
  units: z.array(idSchema),
  /**
   * `battle` : avant l'échange de coups ; `talk` : Parler (succès, `onFail` au
   * refus) ; `death` : mort de l'ennemi ; `phase` : passage du boss en phase 2 ;
   * `mourn` : citation de deuil, quand l'allié vert lié est tombé avant sa scène.
   */
  kind: z.enum(SCENE_KINDS),
  /** Citation de combat : qui engage (défaut : les deux sens). */
  direction: z.enum(SCENE_DIRECTIONS).optional(),
  when: battleConditionSchema.optional(),
  lines: z.array(sceneLineSchema).min(1),
  /** Parler : répliques du refus. */
  onFail: z.array(sceneLineSchema).min(1).optional(),
  /** Faux : rejouable à chaque combat (une fois par combat). Défaut : une fois par partie. */
  once: z.boolean().optional(),
});
export type SceneDef = z.infer<typeof sceneSchema>;

export const battleQuotesFileSchema = z.strictObject({
  $comment: comment,
  scenes: z.array(sceneSchema),
});

/** `enemies.json` avec ses fiches nommées. */
export const enemiesWithNamedFileSchema = enemiesFileSchema.extend({
  /** Ennemis nommés (Échos) : voir `namedEnemySchema`. */
  named: z.array(namedEnemySchema),
});
