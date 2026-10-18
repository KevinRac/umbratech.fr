/**
 * Schémas Zod des lieux, PNJ, boutiques et quêtes (jalon M2, GDD §5 et §6).
 *
 * `data/locations.json` décrit les 22 lieux de la carte du monde (décision
 * n°35) : réputation locale, PNJ visibles, boutiques, récompenses de progression.
 * `data/quests.json` décrit les quêtes (règles pures : étapes, récompenses) ; les
 * paroles des quêtes vivent dans les PNJ (options `quest`).
 *
 * Un PNJ = une salutation selon le palier de réputation + une liste d'options
 * (boutique, repos, quête, recrutement, don, sujet de conversation, choix).
 * Module pur : ni DOM ni Phaser (vérifié par tsconfig.pure.json).
 */
import { z } from 'zod';
import { idSchema } from './schemas';

const hexColor = z.string().regex(/^#[0-9a-f]{6}$/i, 'couleur attendue au format #rrggbb');
const comment = z.string().optional();
const text = z.string().min(1);

/* ---------- Constantes partagées avec la logique et le rendu ---------- */

/** Paliers de réputation (reputation.json) : l'ordre est celui de l'échelle. */
export const TIER_IDS = ['hostile', 'mefiant', 'neutre', 'amical', 'allie', 'heros_local'] as const;
export type TierId = (typeof TIER_IDS)[number];

/** Factions : les quatre jauges secondaires du GDD §6.1. */
export const FACTION_IDS = ['marees', 'couronne', 'racines', 'lanternes'] as const;
export type FactionId = (typeof FACTION_IDS)[number];

export const EXPRESSIONS = ['neutre', 'content', 'fache', 'triste'] as const;
export type Expression = (typeof EXPRESSIONS)[number];

export const NPC_HEADS = ['hood', 'short', 'long', 'bun'] as const;
export const NPC_OUTFITS = ['cloak', 'tunic', 'dress'] as const;
export const NPC_ACCESSORIES = ['none', 'sword', 'satchel', 'lantern'] as const;

export const FACINGS = ['n', 's', 'e', 'w'] as const;
export type NpcFacing = (typeof FACINGS)[number];

export const QUEST_STATUSES = ['available', 'active', 'ready', 'done'] as const;
export type QuestStatus = (typeof QUEST_STATUSES)[number];

const tierId = z.enum(TIER_IDS);

/* ---------- Texte : une ou plusieurs « pages », éventuellement selon le palier ---------- */

const pages = z.array(text).min(1);

/**
 * Paroles : soit des pages valables pour tous les paliers, soit des pages par
 * palier (au moins un). Un palier absent retombe sur le plus proche du palier
 * « neutre » (voir `pickLines`).
 */
export const linesSchema = z.union([pages, z.partialRecord(tierId, pages)]);
export type Lines = z.infer<typeof linesSchema>;

/* ---------- Conditions et effets ---------- */

/** Conditions (toutes doivent être vraies). Le palier est celui de la réputation du lieu du PNJ. */
export const conditionSchema = z.strictObject({
  tierMin: tierId.optional(),
  tierMax: tierId.optional(),
  flag: idSchema.optional(),
  notFlag: idSchema.optional(),
  quest: idSchema.optional(),
  questStatus: z.enum(QUEST_STATUSES).optional(),
  gold: z.number().int().min(0).optional(),
  recruited: idSchema.optional(),
});
export type Condition = z.infer<typeof conditionSchema>;

/** Cible d'une variation de réputation : un lieu ayant une réputation, ou une faction. */
const repTarget = idSchema;

export const effectSchema = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('rep'), target: repTarget, delta: z.number().int() }),
  z.strictObject({ type: z.literal('flag'), flag: idSchema }),
  z.strictObject({ type: z.literal('gold'), amount: z.number().int() }),
  z.strictObject({ type: z.literal('item'), item: idSchema, qty: z.number().int().min(1).default(1) }),
]);
export type Effect = z.infer<typeof effectSchema>;

/* ---------- Apparence (gabarit commun 16×28, décision n°48) ---------- */

export const lookSchema = z.strictObject({
  skin: hexColor,
  hair: hexColor,
  /** Cape, capuche ou manches. */
  top: hexColor,
  /** Tunique ou robe. */
  tunic: hexColor,
  /** Écharpe, col. */
  accent: hexColor,
  belt: hexColor,
  pants: hexColor,
  boots: hexColor,
  head: z.enum(NPC_HEADS),
  outfit: z.enum(NPC_OUTFITS),
  accessory: z.enum(NPC_ACCESSORIES),
});
export type LookDef = z.infer<typeof lookSchema>;

/* ---------- Portrait de dialogue (peint, haute définition) ---------- */

export const PORTRAIT_FACES = ['f', 'm'] as const;
export const PORTRAIT_AGES = ['enfant', 'jeune', 'adulte', 'age'] as const;
export const PORTRAIT_BEARDS = ['aucune', 'courte', 'pleine', 'moustache'] as const;
export const PORTRAIT_MARKS = ['cicatrice', 'taches'] as const;

/** Traits du visage peint (les couleurs, la coiffure et la tenue viennent de `look`). */
export const portraitSchema = z.strictObject({
  face: z.enum(PORTRAIT_FACES),
  age: z.enum(PORTRAIT_AGES),
  beard: z.enum(PORTRAIT_BEARDS).default('aucune'),
  /** Couleur de l'iris. */
  eyes: hexColor,
  marks: z.array(z.enum(PORTRAIT_MARKS)).default([]),
});
export type PortraitDef = z.infer<typeof portraitSchema>;

/* ---------- Options d'un PNJ ---------- */

const optionBase = {
  label: text.optional(),
  /** L'option n'apparaît que si cette condition est vraie. */
  when: conditionSchema.optional(),
};

export const optionSchema = z.discriminatedUnion('kind', [
  /** Ouvre une boutique du même lieu. */
  z.strictObject({ kind: z.literal('shop'), ...optionBase, shop: idSchema }),
  /** Repos à l'auberge : le « jour » suivant, gratuit à partir d'un palier. */
  z.strictObject({
    kind: z.literal('inn'),
    ...optionBase,
    cost: z.number().int().min(0),
    freeFrom: tierId.optional(),
    reply: linesSchema,
    freeReply: linesSchema.optional(),
    poorReply: linesSchema.optional(),
  }),
  /** Quête : propose, rappelle, puis récompense (les règles sont dans quests.json). */
  z.strictObject({
    kind: z.literal('quest'),
    ...optionBase,
    quest: idSchema,
    offer: linesSchema,
    remind: linesSchema,
    done: linesSchema,
    /** Dit quand la réputation est trop basse pour la quête (palier minimal de la quête). */
    locked: linesSchema.optional(),
  }),
  /** Recrutement d'une unité (rejoint la compagnie ; l'équipe arrive aux jalons M5-M6). */
  z.strictObject({
    kind: z.literal('recruit'),
    ...optionBase,
    unit: z.strictObject({ id: idSchema, name: text, class: idSchema }),
    minTier: tierId.optional(),
    gold: z.number().int().min(0).optional(),
    needsQuest: idSchema.optional(),
    /** Ce que dit la recrue en rejoignant la compagnie. */
    offer: linesSchema,
    locked: linesSchema,
  }),
  /** Don à une œuvre : de la réputation contre de l'or, plafonnée par jour. */
  z.strictObject({
    kind: z.literal('donate'),
    ...optionBase,
    amount: z.number().int().min(1),
    rep: z.strictObject({ target: repTarget, delta: z.number().int().min(1) }),
    dailyCap: z.number().int().min(1),
    reply: linesSchema,
    capReply: linesSchema,
    poorReply: linesSchema,
  }),
  /** Sujet de conversation : quelques pages, des effets éventuels. */
  z.strictObject({
    kind: z.literal('topic'),
    ...optionBase,
    lines: linesSchema,
    effects: z.array(effectSchema).optional(),
    expression: z.enum(EXPRESSIONS).optional(),
    /** Vrai : le sujet disparaît après une première écoute. */
    once: z.boolean().optional(),
  }),
  /** Choix de dialogue : une question, des réponses qui ont des conséquences. */
  z.strictObject({
    kind: z.literal('choice'),
    ...optionBase,
    prompt: linesSchema,
    choices: z
      .array(
        z.strictObject({
          label: text,
          reply: linesSchema,
          effects: z.array(effectSchema).optional(),
          expression: z.enum(EXPRESSIONS).optional(),
          when: conditionSchema.optional(),
        }),
      )
      .min(2),
    once: z.boolean().optional(),
  }),
]);
export type NpcOption = z.infer<typeof optionSchema>;
export type OptionKind = NpcOption['kind'];

export const npcSchema = z.strictObject({
  id: idSchema,
  name: text,
  /** Rôle affiché sous le nom (« Aubergiste »). */
  title: text,
  /** Case (x, y) où se tient le PNJ ; ses pieds sont au bas de la case. */
  at: z.tuple([z.number().int().min(0), z.number().int().min(0)]),
  facing: z.enum(FACINGS),
  /** Rayon (en cases) de la zone où il se promène autour de son poste ; 0 : il reste en place. */
  roam: z.number().int().min(0).max(12).default(5),
  look: lookSchema,
  portrait: portraitSchema,
  /** Ce qu'il dit en premier, selon le palier de réputation du lieu. */
  greeting: linesSchema,
  options: z.array(optionSchema),
  /** Vrai : à l'état « hostile », il ne propose plus rien (les gardes, les marchands). */
  refusesWhenHostile: z.boolean().optional(),
});
export type NpcDef = z.infer<typeof npcSchema>;

/* ---------- Boutiques ---------- */

export const shopSchema = z.strictObject({
  id: idSchema,
  name: text,
  /** Ce que dit le marchand à l'ouverture, selon le palier. */
  welcome: linesSchema,
  /** Refus de commercer (palier « hostile »). */
  refusal: linesSchema,
  stock: z
    .array(
      z.strictObject({
        item: idSchema,
        /** Palier minimal pour voir l'objet en vente (objets rares réservés aux amis). */
        minTier: tierId.optional(),
      }),
    )
    .min(1),
});
export type ShopDef = z.infer<typeof shopSchema>;

/* ---------- Lieux ---------- */

export const locationSchema = z.strictObject({
  /** Identifiant du lieu dans la couche `locations` de la carte du monde. */
  id: idSchema,
  /** Nom affiché (identique à celui de la carte du monde). */
  name: text,
  /** Une phrase : ce que c'est, ce qu'on y fait (carte et journal). */
  summary: text,
  /**
   * Réputation locale (GDD §6) : valeur de départ ; `null` pour un lieu sans habitants
   * (autel, camp, donjon…). Seuls les villages et la ville en ont une.
   */
  reputation: z.strictObject({ start: z.number().int() }).nullable(),
  npcs: z.array(npcSchema),
  shops: z.array(shopSchema),
  /** Récompenses de progression : quand le drapeau est levé (boss, camp), une fois pour toutes. */
  rewards: z.array(
    z.strictObject({
      flag: idSchema,
      text,
      effects: z.array(effectSchema).min(1),
    }),
  ),
});
export type LocationDef = z.infer<typeof locationSchema>;

export const factionSchema = z.strictObject({
  id: z.enum(FACTION_IDS),
  name: text,
  description: text,
  color: hexColor,
  start: z.number().int(),
});
export type FactionDef = z.infer<typeof factionSchema>;

export const locationsFileSchema = z.strictObject({
  $comment: comment,
  factions: z.array(factionSchema).length(FACTION_IDS.length),
  locations: z.array(locationSchema).min(1),
});
export type LocationsFile = z.infer<typeof locationsFileSchema>;

/* ---------- Quêtes ---------- */

export const questStepSchema = z.discriminatedUnion('kind', [
  /** Étape accomplie quand un drapeau est levé (boss vaincu, événement, parole d'un PNJ). */
  z.strictObject({ kind: z.literal('flag'), flag: idSchema, text }),
  /** Étape accomplie quand le lieu a été découvert. */
  z.strictObject({ kind: z.literal('visit'), location: idSchema, text }),
]);
export type QuestStep = z.infer<typeof questStepSchema>;

export const questSchema = z.strictObject({
  id: idSchema,
  name: text,
  /** PNJ qui la propose et la récompense (il doit avoir une option `quest` pour elle). */
  giver: idSchema,
  summary: text,
  /** Quête de l'histoire principale. */
  principal: z.boolean().optional(),
  /** Palier minimal de réputation du lieu du donneur pour la recevoir (étoile du GDD §6.4). */
  minTier: tierId.optional(),
  /** Refuser une quête importante coûte de la réputation (GDD §6.3). */
  refusalPenalty: z.strictObject({ target: repTarget, delta: z.number().int().max(-1) }).optional(),
  steps: z.array(questStepSchema).min(1),
  reward: z.strictObject({
    gold: z.number().int().min(0).optional(),
    rep: z.array(z.strictObject({ target: repTarget, delta: z.number().int() })),
    items: z.array(z.strictObject({ item: idSchema, qty: z.number().int().min(1) })).optional(),
    /** Drapeaux levés à la remise de la quête (ils ouvrent un recrutement, un accès…). */
    flags: z.array(idSchema).optional(),
  }),
});
export type QuestDef = z.infer<typeof questSchema>;

export const questsFileSchema = z.strictObject({
  $comment: comment,
  quests: z.array(questSchema).min(1),
});
export type QuestsFile = z.infer<typeof questsFileSchema>;
