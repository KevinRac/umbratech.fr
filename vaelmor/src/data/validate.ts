/**
 * Validation des données de jeu : schémas Zod + contrôles de cohérence
 * (identifiants uniques, références, couverture des paliers et des rôles).
 *
 * Utilisé à l'identique par le jeu (Boot), par les tests et par
 * `npm run validate-data`. Module pur : ni DOM ni Phaser.
 */
import { z } from 'zod';
import {
  CLASS_ROLES,
  balanceFileSchema,
  classesFileSchema,
  elementsFileSchema,
  reputationFileSchema,
  terrainsFileSchema,
  type BalanceConfig,
  type ClassDef,
  type ElementDef,
  type ReputationConfig,
  type TerrainDef,
} from './schemas';

z.config(z.locales.fr());

/** Fichiers de `vaelmor/data/` et leur schéma. Ajouter un fichier = une entrée ici. */
export const DATA_SCHEMAS = {
  elements: elementsFileSchema,
  terrains: terrainsFileSchema,
  reputation: reputationFileSchema,
  balance: balanceFileSchema,
  classes: classesFileSchema,
} as const;

export type DataKey = keyof typeof DATA_SCHEMAS;
export const DATA_KEYS = Object.keys(DATA_SCHEMAS) as DataKey[];
export const dataFileName = (key: DataKey): string => `${key}.json`;

/** Contenu brut des fichiers JSON, avant validation. */
export type RawGameData = Record<DataKey, unknown>;

/** Données validées, prêtes pour la logique. */
export interface GameData {
  readonly elements: readonly ElementDef[];
  readonly terrains: readonly TerrainDef[];
  readonly reputation: ReputationConfig;
  readonly balance: BalanceConfig;
  readonly classes: readonly ClassDef[];
}

export type ValidationResult =
  | { readonly ok: true; readonly data: GameData; readonly issues: readonly [] }
  | { readonly ok: false; readonly issues: readonly string[] };

function formatPath(path: readonly PropertyKey[]): string {
  let out = '';
  for (const part of path) {
    out += typeof part === 'number' ? `[${part}]` : out === '' ? String(part) : `.${String(part)}`;
  }
  return out === '' ? '(racine)' : out;
}

function checkUniqueIds(
  file: string,
  label: string,
  items: readonly { id: string }[],
  issues: string[],
  seen: Map<string, string> = new Map(),
): void {
  for (const item of items) {
    const previous = seen.get(item.id);
    if (previous !== undefined) {
      issues.push(`${file} › identifiant « ${item.id} » en double (${label}, déjà utilisé par ${previous})`);
    } else {
      seen.set(item.id, label);
    }
  }
}

function crossCheck(data: GameData): string[] {
  const issues: string[] = [];

  // Éléments
  const elementIds = new Set(data.elements.map((e) => e.id));
  checkUniqueIds('elements.json', 'élément', data.elements, issues);
  for (const element of data.elements) {
    if (element.beats !== null && !elementIds.has(element.beats)) {
      issues.push(`elements.json › « ${element.id} ».beats référence un élément inconnu : « ${element.beats} »`);
    }
  }

  // Terrains
  checkUniqueIds('terrains.json', 'terrain', data.terrains, issues);

  // Réputation : paliers triés, contigus, couvrant [min, max]
  const rep = data.reputation;
  if (rep.min >= rep.max) issues.push('reputation.json › min doit être inférieur à max');
  checkUniqueIds('reputation.json', 'palier', rep.tiers, issues);
  rep.tiers.forEach((tier, i) => {
    if (tier.min > tier.max) issues.push(`reputation.json › palier « ${tier.id} » : min > max`);
    const next = rep.tiers[i + 1];
    if (next && tier.max + 1 !== next.min) {
      issues.push(`reputation.json › trou ou chevauchement entre « ${tier.id} » (max ${tier.max}) et « ${next.id} » (min ${next.min})`);
    }
  });
  const first = rep.tiers[0];
  const last = rep.tiers[rep.tiers.length - 1];
  if (first && first.min !== rep.min) issues.push(`reputation.json › le premier palier doit commencer à ${rep.min}`);
  if (last && last.max !== rep.max) issues.push(`reputation.json › le dernier palier doit finir à ${rep.max}`);

  // Équilibrage
  const b = data.balance;
  if (b.combat.hitChanceMin > b.combat.hitChanceMax) issues.push('balance.json › combat.hitChanceMin > hitChanceMax');
  if (b.xp.nonLethal.min > b.xp.nonLethal.max) issues.push('balance.json › xp.nonLethal.min > max');
  if (b.xp.kill.min > b.xp.kill.max) issues.push('balance.json › xp.kill.min > max');
  if (b.levels.baseClassCap > b.levels.advancedClassCap) issues.push('balance.json › levels.baseClassCap > advancedClassCap');
  if (b.levels.promotionMinLevel > b.levels.baseClassCap) issues.push('balance.json › levels.promotionMinLevel > baseClassCap');
  if (b.exploration.sprintSpeed < b.exploration.walkSpeed) issues.push('balance.json › exploration.sprintSpeed < walkSpeed');

  // Classes : identifiants uniques (classes + évolutions), références, rôles
  const classAndEvolutionIds = new Map<string, string>();
  checkUniqueIds('classes.json', 'classe', data.classes, issues, classAndEvolutionIds);
  for (const cls of data.classes) {
    checkUniqueIds('classes.json', `évolution de « ${cls.id} »`, cls.evolutions, issues, classAndEvolutionIds);
    if (cls.element !== null && !elementIds.has(cls.element)) {
      issues.push(`classes.json › « ${cls.id} ».element référence un élément inconnu : « ${cls.element} »`);
    }
    const [minRange, maxRange] = cls.weapon.range;
    if (minRange > maxRange) issues.push(`classes.json › « ${cls.id} ».weapon.range : portée min > portée max`);
  }
  const roles = new Set(data.classes.map((c) => c.role));
  for (const role of CLASS_ROLES) {
    if (!roles.has(role)) issues.push(`classes.json › aucun rôle « ${role} » : les 12 rôles du GDD doivent être couverts`);
  }

  return issues;
}

/** Valide l'ensemble des fichiers. Ne lève jamais : renvoie la liste des problèmes. */
export function validateGameData(raw: RawGameData): ValidationResult {
  const issues: string[] = [];
  const parsed: Partial<Record<DataKey, unknown>> = {};

  for (const key of DATA_KEYS) {
    const result = DATA_SCHEMAS[key].safeParse(raw[key]);
    if (result.success) {
      parsed[key] = result.data;
    } else {
      for (const issue of result.error.issues) {
        issues.push(`${dataFileName(key)} › ${formatPath(issue.path)} : ${issue.message}`);
      }
    }
  }
  if (issues.length > 0) return { ok: false, issues };

  const files = parsed as {
    elements: z.infer<typeof elementsFileSchema>;
    terrains: z.infer<typeof terrainsFileSchema>;
    reputation: z.infer<typeof reputationFileSchema>;
    balance: z.infer<typeof balanceFileSchema>;
    classes: z.infer<typeof classesFileSchema>;
  };
  const data: GameData = {
    elements: files.elements.elements,
    terrains: files.terrains.terrains,
    reputation: files.reputation,
    balance: files.balance,
    classes: files.classes.classes,
  };

  const crossIssues = crossCheck(data);
  if (crossIssues.length > 0) return { ok: false, issues: crossIssues };
  return { ok: true, data, issues: [] };
}

/** Erreur levée quand les données embarquées sont invalides. */
export class GameDataError extends Error {
  constructor(readonly issues: readonly string[]) {
    super(`Données de jeu invalides (${issues.length} problème(s)) :\n- ${issues.join('\n- ')}`);
    this.name = 'GameDataError';
  }
}
