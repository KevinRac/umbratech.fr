/**
 * Schémas Zod des fichiers de données (`vaelmor/data/*.json`).
 *
 * Règles :
 * - Objets stricts : une clé inconnue est une erreur (attrape les fautes de frappe).
 * - Identifiants en snake_case ASCII (`gardien_des_marees`).
 * - Chaque fichier peut porter un `$comment` libre.
 * Ce module est « pur » : ni DOM ni Phaser (vérifié par tsconfig.pure.json).
 */
import { z } from 'zod';

export const idSchema = z
  .string()
  .regex(/^[a-z][a-z0-9_]*$/, 'identifiant attendu en snake_case ASCII (ex. « gardien_des_marees »)');

const hexColor = z.string().regex(/^#[0-9a-f]{6}$/i, 'couleur attendue au format #rrggbb');
const percent = z.number().int().min(0).max(100);
const comment = z.string().optional();

/* ---------- Éléments ---------- */

export const elementSchema = z.strictObject({
  id: idSchema,
  name: z.string().min(1),
  beats: idSchema.nullable(),
  color: hexColor,
});

export const elementsFileSchema = z.strictObject({
  $comment: comment,
  elements: z.array(elementSchema).min(1),
});

/* ---------- Terrains ---------- */

export const terrainSchema = z.strictObject({
  id: idSchema,
  name: z.string().min(1),
  moveCost: z.number().int().min(1).nullable(),
  defense: z.number().int(),
  avoid: z.number().int(),
  heal: z.number().min(0).max(1),
  tags: z.array(idSchema),
});

export const terrainsFileSchema = z.strictObject({
  $comment: comment,
  terrains: z.array(terrainSchema).min(1),
});

/* ---------- Réputation ---------- */

export const reputationTierSchema = z.strictObject({
  id: idSchema,
  name: z.string().min(1),
  min: z.number().int(),
  max: z.number().int(),
  priceMultiplier: z.number().positive(),
  refusesTrade: z.boolean(),
  color: hexColor,
});

export const reputationFileSchema = z.strictObject({
  $comment: comment,
  min: z.number().int(),
  max: z.number().int(),
  tiers: z.array(reputationTierSchema).min(1),
  decay: z.strictObject({
    threshold: z.number().int().min(0),
    stepPerVisit: z.number().int().min(0),
  }),
  sellRatio: z.number().min(0).max(1),
});

/* ---------- Équilibrage ---------- */

const clampedGain = z.strictObject({
  base: z.number(),
  perLevelGap: z.number(),
  min: z.number(),
  max: z.number(),
});

const unit01 = z.number().min(0).max(1);
const haloKind = z.strictObject({ radius: z.number().positive(), alpha: unit01 });

export const balanceFileSchema = z.strictObject({
  $comment: comment,
  exploration: z.strictObject({
    tileSize: z.number().int().positive(),
    walkSpeed: z.number().positive(),
    sprintSpeed: z.number().positive(),
    accelerationMs: z.number().min(0),
    sprintDetectionMultiplier: z.number().positive(),
    forestDetectionMultiplier: z.number().positive(),
    /** Multiplicateur de vitesse sur les zones lentes (marais, gué). */
    slowZoneMultiplier: z.number().positive().max(1),
    /** Boîte de collision du héros, aux pieds (GDD §4.4), en pixels. */
    hitboxWidth: z.number().int().positive(),
    hitboxHeight: z.number().int().positive(),
    /** Aide dans les angles : décalage maximal (px) pour contourner un coin de tuile. */
    cornerAssist: z.number().int().min(0),
    /** Lissage de la caméra (GDD §4.3), par image à 60 Hz. */
    cameraLerp: z.number().gt(0).max(1),
    cameraDeadzoneWidth: z.number().int().min(0),
    cameraDeadzoneHeight: z.number().int().min(0),
    /** Distance (px) à laquelle on peut parler à un PNJ, du pied du héros au pied du PNJ. */
    interactRange: z.number().int().positive(),
  }),
  combat: z.strictObject({
    hitChanceMin: percent,
    hitChanceMax: percent,
    critMultiplier: z.number().positive(),
    doubleAttackSpeedGap: z.number().int().min(1),
    elementAdvantage: z.strictObject({ damage: z.number().int(), hit: z.number().int() }),
    effectiveMultiplier: z.number().positive(),
    resonance: z.strictObject({
      max: z.number().int().positive(),
      perAttack: z.number().int().min(0),
      perHitTaken: z.number().int().min(0),
    }),
  }),
  xp: z.strictObject({
    perLevel: z.number().int().positive(),
    nonLethal: clampedGain,
    kill: clampedGain,
    bossKillBonus: z.number().int().min(0),
    heal: z.number().int().min(0),
    support: z.number().int().min(0),
    victoryBonus: z.number().int().min(0),
    catchUp: z.strictObject({ levelsBelowTeamAverage: z.number().int().positive(), multiplier: z.number().positive() }),
    overLevel: z.strictObject({ levelsAboveZone: z.number().int().positive(), multiplier: z.number().positive() }),
  }),
  levels: z.strictObject({
    baseClassCap: z.number().int().positive(),
    advancedClassCap: z.number().int().positive(),
    promotionMinLevel: z.number().int().positive(),
  }),
  defeat: z.strictObject({ goldLossRatio: z.number().min(0).max(1) }),
  /** Économie de départ (jalon M2) : or, capacité du sac (nombre de lignes), pile maximale. */
  economy: z.strictObject({
    startingGold: z.number().int().min(0),
    inventoryCapacity: z.number().int().positive(),
    maxStack: z.number().int().positive(),
    startingItems: z.array(z.strictObject({ item: idSchema, qty: z.number().int().positive() })),
  }),
  /** Dialogues : vitesse de la machine à écrire (GDD §13.3), facteur quand on l'accélère. */
  dialogue: z.strictObject({ charsPerSecond: z.number().positive(), fastMultiplier: z.number().min(1) }),
  injury: z.strictObject({ mobilityPenalty: z.number().int().min(0), statPenaltyRatio: z.number().min(0).max(1) }),
  /** Effets HD-2D du monde ouvert (décision n°47) ; le réglage « Qualité » choisit lesquels s'appliquent. */
  visuals: z.strictObject({
    /** Flou de profondeur : bande nette centrée de hauteur `focus` (fraction d'écran), fondu `fade`, force `blur`. */
    tiltShift: z.strictObject({ focus: unit01, fade: unit01, blur: z.number().min(0).max(8) }),
    /** Bloom : seuil de luminance, rayon du flou, intensité de l'ajout. */
    bloom: z.strictObject({ threshold: unit01, blur: z.number().min(0).max(8), amount: z.number().min(0).max(2) }),
    vignette: z.strictObject({ radius: z.number().min(0).max(2), strength: unit01 }),
    /** Rayons de lumière obliques : nombre de bandes et opacité maximale. */
    rays: z.strictObject({ count: z.number().int().min(0).max(8), alpha: unit01 }),
    /** Poussière dans la lumière : une particule toutes les `periodMs`, opacité maximale. */
    dust: z.strictObject({ periodMs: z.number().int().min(16), alpha: unit01 }),
    /** Halos des sources de lumière ; `dayFactor` = part de l'intensité gardée en plein jour. */
    halos: z.strictObject({ dayFactor: unit01, lamp: haloKind, fire: haloKind, window: haloKind, rune: haloKind }),
    /** Moment de la journée : 0 jour, 1 soir (préparé, non activé : 0 par défaut). */
    evening: unit01,
    /** Part de la lumière retirée au soir complet (l'image s'assombrit, les halos restent vifs). */
    eveningDarkness: unit01,
    /** Pixels du bas du héros cachés par les épis quand il traverse un champ (décision n°50). */
    wheatHide: z.strictObject({ dense: z.number().int().min(0).max(20), edge: z.number().int().min(0).max(20) }),
  }),
});

/* ---------- Zones de niveau (GDD §3.4, §8) ---------- */

export const AMBIENCE_KINDS = ['pollen', 'feuilles', 'brume', 'braises', 'cendres'] as const;

export const zoneSchema = z.strictObject({
  id: idSchema,
  /** Valeur écrite dans la couche `zones` de la carte du monde (1, 2, 3…). */
  value: z.number().int().min(1).max(255),
  /** Nom de la région, affiché dans le HUD (« Plaines d'Aubemer »). */
  name: z.string().min(1),
  /** Niveaux recommandés (GDD §3.4). */
  levelMin: z.number().int().min(1),
  levelMax: z.number().int().min(1),
  /** Drapeau qui ouvre les passages vers cette zone ; null = toujours ouverte. */
  unlockFlag: idSchema.nullable(),
  /** Message affiché quand le joueur heurte un passage verrouillé de cette zone. */
  gateMessage: z.string().min(1).nullable(),
  /** Teinte douce posée sur l'écran dans la zone (ambiance). */
  ambient: z.strictObject({ color: hexColor, alpha: z.number().min(0).max(0.5) }),
  ambience: z.enum(AMBIENCE_KINDS),
  /**
   * Étalonnage de la zone (décision n°43) : appliqué au monde par une matrice de
   * couleur. Les ombres sont teintées (`shadow`), les lumières réchauffées (`light`),
   * la saturation et le contraste ajustés (0 = neutre).
   */
  grade: z.strictObject({
    shadow: hexColor,
    shadowAmount: z.number().min(0).max(0.5),
    light: hexColor,
    lightAmount: z.number().min(0).max(0.5),
    saturation: z.number().min(-0.6).max(0.6),
    contrast: z.number().min(-0.4).max(0.4),
    brightness: z.number().min(-0.3).max(0.3),
  }),
  /**
   * Lumière HD-2D de la zone (décision n°47), de 0 (aucun) à 1 (plein) :
   * rayons obliques, poussière en suspension, intensité du bloom.
   */
  light: z.strictObject({ rays: unit01, dust: unit01, bloom: unit01 }),
});

export const zonesFileSchema = z.strictObject({
  $comment: comment,
  zones: z.array(zoneSchema).min(1),
});

/* ---------- Classes ---------- */

/** Les 12 rôles exigés par le GDD (§10.2) : chacun doit être couvert. */
export const CLASS_ROLES = [
  'tank',
  'degats_melee',
  'degats_distance',
  'magie_offensive',
  'soin',
  'soutien',
  'controle',
  'mobilite',
  'invocation',
  'terrain',
  'anti_armure',
  'tueur_de_boss',
] as const;

export const STAT_KEYS = ['pv', 'fo', 'mag', 'dex', 'vit', 'def', 'res', 'chc', 'mob'] as const;
export const GROWTH_KEYS = ['pv', 'fo', 'mag', 'dex', 'vit', 'def', 'res', 'chc'] as const;

const statBlock = z.strictObject({
  pv: z.number().int().min(1),
  fo: z.number().int().min(0),
  mag: z.number().int().min(0),
  dex: z.number().int().min(0),
  vit: z.number().int().min(0),
  def: z.number().int().min(0),
  res: z.number().int().min(0),
  chc: z.number().int().min(0),
  mob: z.number().int().min(1),
});

const growthBlock = z.strictObject({
  pv: percent,
  fo: percent,
  mag: percent,
  dex: percent,
  vit: percent,
  def: percent,
  res: percent,
  chc: percent,
});

export const classSchema = z.strictObject({
  id: idSchema,
  name: z.string().min(1),
  role: z.enum(CLASS_ROLES),
  description: z.string().min(1),
  weapon: z.strictObject({
    type: idSchema,
    name: z.string().min(1),
    range: z.tuple([z.number().int().min(1), z.number().int().min(1)]),
    damage: z.enum(['physique', 'magique']),
  }),
  element: idSchema.nullable(),
  armor: z.enum(['legere', 'lourde']),
  /** Arme de départ (data/items.json) : même type, même portée et même nature de dégâts que `weapon`. */
  startingWeapon: idSchema,
  resource: z
    .strictObject({
      id: idSchema,
      name: z.string().min(1),
      perBattle: z.number().int().positive().optional(),
    })
    .optional(),
  baseStats: statBlock,
  growths: growthBlock,
  evolutions: z
    .array(
      z.strictObject({
        id: idSchema,
        name: z.string().min(1),
        condition: z.string().min(1),
      }),
    )
    .length(2, 'chaque classe doit avoir exactement 2 évolutions'),
});

export const classesFileSchema = z.strictObject({
  $comment: comment,
  classes: z.array(classSchema).min(1),
});

/* ---------- Objets : armes (GDD §9.8) ---------- */

export const DAMAGE_KINDS = ['physique', 'magique'] as const;
/** Cibles des armes « efficaces » : type d'armure (`lourde`, `monstre`) ou boss. */
export const EFFECTIVE_TAGS = ['lourde', 'monstre', 'boss'] as const;

const range = z.tuple([z.number().int().min(1).max(6), z.number().int().min(1).max(6)]);

export const weaponSchema = z.strictObject({
  id: idSchema,
  name: z.string().min(1),
  type: idSchema,
  range,
  damage: z.enum(DAMAGE_KINDS),
  power: z.number().int().min(0),
  hit: z.number().int().min(0).max(150),
  crit: z.number().int().min(0).max(100),
  /** Élément offensif (armes magiques) : entre dans le triangle élémentaire (décision n°51). */
  element: idSchema.nullable(),
  effective: z.array(z.enum(EFFECTIVE_TAGS)),
  /** Prix de base chez un marchand (sans modulation de réputation) ; absent = non vendue (armes d'ennemis). */
  price: z.number().int().min(1).optional(),
});

/* ---------- Objets : consommables, accessoires, objets de quête (jalon M2 ; effets en combat au M5) ---------- */

/** Effets des consommables ; leur application en combat arrive au jalon M5. */
export const CONSUMABLE_EFFECTS = ['soin', 'soin_statut', 'fuite', 'lumiere', 'ration'] as const;

export const consumableSchema = z.strictObject({
  id: idSchema,
  name: z.string().min(1),
  description: z.string().min(1),
  /** Prix de base chez un marchand. */
  price: z.number().int().min(1),
  effect: z.strictObject({ kind: z.enum(CONSUMABLE_EFFECTS), amount: z.number().int().min(0).optional() }),
});

export const accessorySchema = z.strictObject({
  id: idSchema,
  name: z.string().min(1),
  description: z.string().min(1),
  price: z.number().int().min(1),
  /** Bonus de stats portés (un seul emplacement d'accessoire par unité, GDD §9.8). */
  bonus: z.partialRecord(z.enum(STAT_KEYS), z.number().int()),
});

/** Objets de quête et rares : ni achetés ni revendus. */
export const keyItemSchema = z.strictObject({
  id: idSchema,
  name: z.string().min(1),
  description: z.string().min(1),
});

export const itemsFileSchema = z.strictObject({
  $comment: comment,
  weapons: z.array(weaponSchema).min(1),
  consumables: z.array(consumableSchema),
  accessories: z.array(accessorySchema),
  keyItems: z.array(keyItemSchema),
});

/* ---------- Ennemis (GDD §7, §9.15) ---------- */

/** Profils d'IA des ennemis (GDD §9.15) ; « soutien » arrivera avec les soins (M5). */
export const AI_PROFILES = ['agressif', 'opportuniste', 'defensif', 'chasseur_heros', 'boss'] as const;
export const ARMOR_KINDS = ['legere', 'lourde', 'monstre'] as const;

export const enemySchema = z.strictObject({
  id: idSchema,
  name: z.string().min(1),
  /** Titre affiché sous le nom (« Chef des Écumeurs ») ; par défaut, le nom. */
  title: z.string().min(1).optional(),
  family: idSchema,
  /** Apparence dessinée par `render/unitLooks.ts`. */
  sprite: idSchema,
  weapon: idSchema,
  element: idSchema.nullable(),
  armor: z.enum(ARMOR_KINDS),
  ai: z.enum(AI_PROFILES),
  baseStats: statBlock,
  growths: growthBlock,
});

export const enemiesFileSchema = z.strictObject({
  $comment: comment,
  enemies: z.array(enemySchema).min(1),
});

/* ---------- Rencontres tactiques (GDD §9.2, §9.10) ---------- */

/** Limites des cartes de combat (GDD §9.2 : petite 10×8 … grande 18×14). */
export const BATTLE_MAP_LIMITS = { minWidth: 6, maxWidth: 32, minHeight: 5, maxHeight: 24 } as const;

const cellSchema = z.tuple([z.number().int().min(0), z.number().int().min(0)]);
const level = z.number().int().min(1).max(30);

export const partyMemberSchema = z.strictObject({
  name: z.string().min(1),
  class: idSchema,
  level,
  /** Le héros : sa chute est une défaite (GDD §9.10). */
  hero: z.boolean(),
});

export const encounterSchema = z.strictObject({
  id: idSchema,
  name: z.string().min(1),
  /** Zone de niveau où la rencontre a lieu (zones.json). */
  zone: idSchema,
  objective: z.strictObject({ type: z.enum(['rout', 'boss']) }),
  /**
   * Carte tirée du monde (décision n°57) : fenêtre de `width` × `height` cases
   * autour du point de contact. `site` : point de contact par défaut (en cases
   * du monde ; un contact dans le monde le remplace) ; `anchor` : qui s'y tient,
   * la compagnie (« player ») ou l'ennemi (« enemy », un repaire).
   */
  sampled: z
    .strictObject({
      width: z.number().int(),
      height: z.number().int(),
      site: cellSchema,
      anchor: z.enum(['player', 'enemy']),
    })
    .optional(),
  /** Carte fixe en texte (scénario) : une ligne par rangée, une lettre par case (voir `legend`). */
  map: z.array(z.string().min(1)).min(1).optional(),
  /** Cases de déploiement d'une carte fixe. */
  deploy: z.array(cellSchema).min(1).optional(),
  maxDeploy: z.number().int().min(1).max(8),
  enemies: z
    .array(
      z.strictObject({
        enemy: idSchema,
        level,
        /** Case sur une carte fixe ; sur une carte tirée du monde, les ennemis sont placés automatiquement. */
        x: z.number().int().min(0).optional(),
        y: z.number().int().min(0).optional(),
        boss: z.boolean().optional(),
        /** Remplace le profil d'IA de l'ennemi pour cette rencontre. */
        ai: z.enum(AI_PROFILES).optional(),
      }),
    )
    .min(1),
  victoryFlags: z.array(idSchema),
});

export const encountersFileSchema = z.strictObject({
  $comment: comment,
  legend: z.record(z.string().length(1), idSchema),
  testParty: z.array(partyMemberSchema).min(1).max(12),
  encounters: z.array(encounterSchema).min(1),
});

/* ---------- Types dérivés ---------- */

export type ElementDef = z.infer<typeof elementSchema>;
export type ZoneDef = z.infer<typeof zoneSchema>;
export type AmbienceKind = (typeof AMBIENCE_KINDS)[number];
export type TerrainDef = z.infer<typeof terrainSchema>;
export type ReputationTier = z.infer<typeof reputationTierSchema>;
export type ReputationConfig = z.infer<typeof reputationFileSchema>;
export type BalanceConfig = z.infer<typeof balanceFileSchema>;
export type ClassDef = z.infer<typeof classSchema>;
export type ClassRole = (typeof CLASS_ROLES)[number];
export type StatKey = (typeof STAT_KEYS)[number];
export type StatBlock = z.infer<typeof statBlock>;
export type GrowthBlock = z.infer<typeof growthBlock>;
export type WeaponDef = z.infer<typeof weaponSchema>;
export type ConsumableDef = z.infer<typeof consumableSchema>;
export type AccessoryDef = z.infer<typeof accessorySchema>;
export type KeyItemDef = z.infer<typeof keyItemSchema>;
export type DamageKind = (typeof DAMAGE_KINDS)[number];
export type EffectiveTag = (typeof EFFECTIVE_TAGS)[number];
export type EnemyDef = z.infer<typeof enemySchema>;
export type AiProfile = (typeof AI_PROFILES)[number];
export type ArmorKind = (typeof ARMOR_KINDS)[number];
export type EncounterDef = z.infer<typeof encounterSchema>;
export type PartyMemberDef = z.infer<typeof partyMemberSchema>;
export type EncountersFile = z.infer<typeof encountersFileSchema>;
