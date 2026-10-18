/**
 * Validation des données de jeu : schémas Zod + contrôles de cohérence
 * (identifiants uniques, références, couverture des paliers et des rôles).
 *
 * Utilisé à l'identique par le jeu (Boot), par les tests et par
 * `npm run validate-data`. Module pur : ni DOM ni Phaser.
 */
import { z } from 'zod';
import {
  BATTLE_MAP_LIMITS,
  CLASS_ROLES,
  balanceFileSchema,
  enemiesFileSchema,
  encountersFileSchema,
  itemsFileSchema,
  classesFileSchema,
  elementsFileSchema,
  reputationFileSchema,
  terrainsFileSchema,
  worldEnemiesFileSchema,
  zonesFileSchema,
  type AccessoryDef,
  type BalanceConfig,
  type ConsumableDef,
  type KeyItemDef,
  type ClassDef,
  type ElementDef,
  type EncountersFile,
  type EnemyDef,
  type ReputationConfig,
  type WeaponDef,
  type WorldFoeDef,
  type TerrainDef,
  type ZoneDef,
} from './schemas';
import {
  TIER_IDS,
  locationsFileSchema,
  questsFileSchema,
  type FactionDef,
  type LocationDef,
  type QuestDef,
} from './townSchemas';

z.config(z.locales.fr());

/** Fichiers de `vaelmor/data/` et leur schéma. Ajouter un fichier = une entrée ici. */
export const DATA_SCHEMAS = {
  elements: elementsFileSchema,
  terrains: terrainsFileSchema,
  reputation: reputationFileSchema,
  balance: balanceFileSchema,
  classes: classesFileSchema,
  zones: zonesFileSchema,
  items: itemsFileSchema,
  enemies: enemiesFileSchema,
  encounters: encountersFileSchema,
  locations: locationsFileSchema,
  quests: questsFileSchema,
  worldEnemies: worldEnemiesFileSchema,
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
  readonly zones: readonly ZoneDef[];
  readonly weapons: readonly WeaponDef[];
  readonly enemies: readonly EnemyDef[];
  /** Rencontres tactiques, légende des cartes et compagnie d'essai. */
  readonly encounters: EncountersFile;
  readonly consumables: readonly ConsumableDef[];
  readonly accessories: readonly AccessoryDef[];
  readonly keyItems: readonly KeyItemDef[];
  /** Les 22 lieux de la carte (villages avec réputation, PNJ, boutiques). */
  readonly locations: readonly LocationDef[];
  readonly factions: readonly FactionDef[];
  readonly quests: readonly QuestDef[];
  /** Ennemis visibles du monde ouvert (jalon M3). */
  readonly worldFoes: readonly WorldFoeDef[];
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
  if (b.exploration.hitboxWidth > b.exploration.tileSize || b.exploration.hitboxHeight > b.exploration.tileSize) {
    issues.push('balance.json › exploration.hitbox dépasse une tuile : le héros ne passerait plus dans les couloirs d’une case');
  }

  // Zones : identifiants et valeurs uniques, niveaux cohérents, drapeaux de déverrouillage distincts
  checkUniqueIds('zones.json', 'zone', data.zones, issues);
  const zoneValues = new Map<number, string>();
  const unlockFlags = new Map<string, string>();
  for (const zone of data.zones) {
    const sameValue = zoneValues.get(zone.value);
    if (sameValue !== undefined) issues.push(`zones.json › valeur ${zone.value} utilisée par « ${sameValue} » et « ${zone.id} »`);
    zoneValues.set(zone.value, zone.id);
    if (zone.levelMin > zone.levelMax) issues.push(`zones.json › « ${zone.id} » : levelMin > levelMax`);
    if ((zone.unlockFlag === null) !== (zone.gateMessage === null)) {
      issues.push(`zones.json › « ${zone.id} » : unlockFlag et gateMessage vont ensemble (tous deux null ou tous deux renseignés)`);
    }
    if (zone.unlockFlag !== null) {
      const sameFlag = unlockFlags.get(zone.unlockFlag);
      if (sameFlag !== undefined) issues.push(`zones.json › drapeau « ${zone.unlockFlag} » partagé par « ${sameFlag} » et « ${zone.id} »`);
      unlockFlags.set(zone.unlockFlag, zone.id);
    }
  }

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
  // Armes
  checkUniqueIds('items.json', 'arme', data.weapons, issues);
  const weapons = new Map(data.weapons.map((w) => [w.id, w]));
  for (const weapon of data.weapons) {
    if (weapon.range[0] > weapon.range[1]) issues.push(`items.json › « ${weapon.id} ».range : portée min > portée max`);
    if (weapon.element !== null && !elementIds.has(weapon.element)) {
      issues.push(`items.json › « ${weapon.id} ».element référence un élément inconnu : « ${weapon.element} »`);
    }
  }
  for (const cls of data.classes) {
    const weapon = weapons.get(cls.startingWeapon);
    if (!weapon) {
      issues.push(`classes.json › « ${cls.id} ».startingWeapon référence une arme inconnue : « ${cls.startingWeapon} »`);
      continue;
    }
    if (weapon.type !== cls.weapon.type) issues.push(`classes.json › « ${cls.id} » : l'arme de départ « ${weapon.id} » est de type « ${weapon.type} », la classe manie « ${cls.weapon.type} »`);
    if (weapon.damage !== cls.weapon.damage) issues.push(`classes.json › « ${cls.id} » : l'arme de départ « ${weapon.id} » n'inflige pas des dégâts « ${cls.weapon.damage} »`);
    if (weapon.range[0] !== cls.weapon.range[0] || weapon.range[1] !== cls.weapon.range[1]) {
      issues.push(`classes.json › « ${cls.id} » : la portée de l'arme de départ « ${weapon.id} » diffère de celle de la classe`);
    }
  }

  // Ennemis
  checkUniqueIds('enemies.json', 'ennemi', data.enemies, issues);
  for (const enemy of data.enemies) {
    if (!weapons.has(enemy.weapon)) issues.push(`enemies.json › « ${enemy.id} ».weapon référence une arme inconnue : « ${enemy.weapon} »`);
    if (enemy.element !== null && !elementIds.has(enemy.element)) {
      issues.push(`enemies.json › « ${enemy.id} ».element référence un élément inconnu : « ${enemy.element} »`);
    }
  }

  checkEncounters(data, issues);
  checkTowns(data, issues);
  checkZoneContent(data, issues);
  checkWorldFoes(data, issues);

  const roles = new Set(data.classes.map((c) => c.role));
  for (const role of CLASS_ROLES) {
    if (!roles.has(role)) issues.push(`classes.json › aucun rôle « ${role} » : les 12 rôles du GDD doivent être couverts`);
  }

  return issues;
}

/** Rencontres : cartes rectangulaires et jouables, références, déploiement, objectif. */
function checkEncounters(data: GameData, issues: string[]): void {
  const file = 'encounters.json';
  const { legend, testParty, encounters } = data.encounters;
  const terrains = new Map(data.terrains.map((t) => [t.id, t]));
  for (const [char, terrain] of Object.entries(legend)) {
    if (!terrains.has(terrain)) issues.push(`${file} › legend « ${char} » référence un terrain inconnu : « ${terrain} »`);
  }
  const classIds = new Set(data.classes.map((c) => c.id));
  testParty.forEach((member, i) => {
    if (!classIds.has(member.class)) issues.push(`${file} › testParty[${i}].class référence une classe inconnue : « ${member.class} »`);
  });
  if (testParty.filter((m) => m.hero).length !== 1) issues.push(`${file} › testParty doit compter exactement un héros`);

  checkUniqueIds(file, 'rencontre', encounters, issues);
  const zoneIds = new Set(data.zones.map((z) => z.id));
  const enemyIds = new Set(data.enemies.map((e) => e.id));
  const L = BATTLE_MAP_LIMITS;
  for (const enc of encounters) {
    const at = `${file} › « ${enc.id} »`;
    if (!zoneIds.has(enc.zone)) issues.push(`${at}.zone référence une zone inconnue : « ${enc.zone} »`);
    enc.enemies.forEach((e, i) => {
      if (!enemyIds.has(e.enemy)) issues.push(`${at}.enemies[${i}] référence un ennemi inconnu : « ${e.enemy} »`);
    });
    const bosses = enc.enemies.filter((e) => e.boss).length;
    if (enc.objective.type === 'boss' && bosses !== 1) issues.push(`${at} : l'objectif « boss » exige exactement un ennemi marqué boss (${bosses} trouvé(s))`);
    if (bosses > 1) issues.push(`${at} : un seul ennemi peut être marqué boss`);

    if ((enc.map === undefined) === (enc.sampled === undefined)) {
      issues.push(`${at} : une rencontre a soit une carte fixe (map), soit une carte tirée du monde (sampled)`);
      continue;
    }
    if (enc.sampled) {
      const { width, height } = enc.sampled;
      if (width < L.minWidth || width > L.maxWidth || height < L.minHeight || height > L.maxHeight) {
        issues.push(`${at}.sampled : ${width}×${height} cases, attendu de ${L.minWidth}×${L.minHeight} à ${L.maxWidth}×${L.maxHeight}`);
      }
      if (enc.deploy) issues.push(`${at}.deploy : inutile sur une carte tirée du monde (déploiement automatique)`);
      if (enc.enemies.some((e) => e.x !== undefined || e.y !== undefined)) issues.push(`${at}.enemies : pas de position sur une carte tirée du monde (placement automatique)`);
      continue;
    }

    const map = enc.map ?? [];
    const height = map.length;
    const width = map[0]?.length ?? 0;
    if (map.some((row) => [...row].length !== width)) {
      issues.push(`${at}.map : toutes les lignes doivent avoir la même longueur (${width})`);
      continue;
    }
    if (width < L.minWidth || width > L.maxWidth || height < L.minHeight || height > L.maxHeight) {
      issues.push(`${at}.map : ${width}×${height} cases, attendu de ${L.minWidth}×${L.minHeight} à ${L.maxWidth}×${L.maxHeight}`);
      continue;
    }
    const terrainAt = (x: number, y: number) => {
      const char = [...(map[y] ?? '')][x];
      return char === undefined ? undefined : terrains.get(legend[char] ?? '');
    };
    map.forEach((row, y) =>
      [...row].forEach((char, x) => {
        if (legend[char] === undefined) issues.push(`${at}.map : lettre « ${char} » (case ${x},${y}) absente de legend`);
      }),
    );
    const occupied = new Set<string>();
    const place = (x: number, y: number, label: string): void => {
      const terrain = terrainAt(x, y);
      if (x >= width || y >= height) issues.push(`${at} › ${label} : case ${x},${y} hors de la carte`);
      else if (terrain && terrain.moveCost === null) issues.push(`${at} › ${label} : case ${x},${y} infranchissable (${terrain.name})`);
      const key = `${x},${y}`;
      if (occupied.has(key)) issues.push(`${at} › ${label} : case ${x},${y} déjà occupée`);
      occupied.add(key);
    };
    const deploy = enc.deploy ?? [];
    if (deploy.length === 0) issues.push(`${at}.deploy : une carte fixe a besoin de cases de déploiement`);
    deploy.forEach(([x, y], i) => place(x, y, `deploy[${i}]`));
    if (enc.maxDeploy > deploy.length) issues.push(`${at}.maxDeploy (${enc.maxDeploy}) dépasse le nombre de cases de déploiement (${deploy.length})`);
    enc.enemies.forEach((e, i) => {
      if (e.x === undefined || e.y === undefined) issues.push(`${at}.enemies[${i}] : position (x, y) obligatoire sur une carte fixe`);
      else place(e.x, e.y, `enemies[${i}]`);
    });
  }
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
    zones: z.infer<typeof zonesFileSchema>;
    items: z.infer<typeof itemsFileSchema>;
    enemies: z.infer<typeof enemiesFileSchema>;
    encounters: z.infer<typeof encountersFileSchema>;
    locations: z.infer<typeof locationsFileSchema>;
    quests: z.infer<typeof questsFileSchema>;
    worldEnemies: z.infer<typeof worldEnemiesFileSchema>;
  };
  const data: GameData = {
    elements: files.elements.elements,
    terrains: files.terrains.terrains,
    reputation: files.reputation,
    balance: files.balance,
    classes: files.classes.classes,
    zones: files.zones.zones,
    weapons: files.items.weapons,
    enemies: files.enemies.enemies,
    encounters: files.encounters,
    consumables: files.items.consumables,
    accessories: files.items.accessories,
    keyItems: files.items.keyItems,
    locations: files.locations.locations,
    factions: files.locations.factions,
    quests: files.quests.quests,
    worldFoes: files.worldEnemies.foes,
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

/** Lieux, PNJ, boutiques, quêtes : identifiants uniques et références résolues. */
function checkTowns(data: GameData, issues: string[]): void {
  const file = 'locations.json';
  const tierIds = new Set<string>(data.reputation.tiers.map((t) => t.id));
  for (const id of TIER_IDS) if (!tierIds.has(id)) issues.push(`reputation.json › palier « ${id} » manquant (utilisé par les dialogues)`);

  // Objets : un seul espace d'identifiants pour tout ce qui peut être possédé
  const itemIds = new Map<string, string>();
  checkUniqueIds('items.json', 'consommable', data.consumables, issues, itemIds);
  checkUniqueIds('items.json', 'accessoire', data.accessories, issues, itemIds);
  checkUniqueIds('items.json', 'objet de quête', data.keyItems, issues, itemIds);
  for (const w of data.weapons) {
    if (itemIds.has(w.id)) issues.push(`items.json › identifiant « ${w.id} » partagé par une arme et un autre objet`);
    itemIds.set(w.id, 'arme');
  }
  const sellableIds = new Set<string>([
    ...data.weapons.filter((w) => w.price !== undefined).map((w) => w.id),
    ...data.consumables.map((c) => c.id),
    ...data.accessories.map((a) => a.id),
  ]);
  const classIds = new Set(data.classes.map((c) => c.id));
  for (const item of data.balance.economy.startingItems) {
    if (!itemIds.has(item.item)) issues.push(`balance.json › economy.startingItems référence un objet inconnu : « ${item.item} »`);
  }

  checkUniqueIds(file, 'lieu', data.locations, issues);
  checkUniqueIds(file, 'faction', data.factions, issues);
  const factionIds = new Set(data.factions.map((f) => f.id as string));
  const repTargets = new Set<string>(factionIds);
  const locationIds = new Set(data.locations.map((l) => l.id));
  for (const loc of data.locations) if (loc.reputation !== null) repTargets.add(loc.id);

  const questIds = new Set(data.quests.map((q) => q.id));
  checkUniqueIds('quests.json', 'quête', data.quests, issues);

  const npcIds = new Map<string, string>();
  const shopIds = new Set<string>();
  const checkLines = (at: string, lines: unknown): void => {
    if (Array.isArray(lines) || lines === undefined) return;
    for (const key of Object.keys(lines as object)) if (!tierIds.has(key)) issues.push(`${at} : palier inconnu « ${key} »`);
  };
  const checkEffects = (at: string, effects: readonly { type: string; target?: string; item?: string }[] | undefined): void => {
    for (const e of effects ?? []) {
      if (e.type === 'rep' && !repTargets.has(e.target ?? '')) issues.push(`${at} : réputation inconnue « ${e.target} »`);
      if (e.type === 'item' && !itemIds.has(e.item ?? '')) issues.push(`${at} : objet inconnu « ${e.item} »`);
    }
  };
  const checkCond = (at: string, c: { quest?: string; recruited?: string } | undefined): void => {
    if (c?.quest !== undefined && !questIds.has(c.quest)) issues.push(`${at}.when : quête inconnue « ${c.quest} »`);
  };

  for (const loc of data.locations) {
    const here = `${file} › ${loc.id}`;
    if (loc.reputation === null && loc.npcs.some((n) => n.options.some((o) => o.kind === 'donate' || o.kind === 'inn'))) {
      // un lieu sans réputation n'a pas de palier : les services y seraient toujours « neutres »
      issues.push(`${here} : un lieu sans réputation ne peut pas offrir de repos ni de dons`);
    }
    const localShops = new Set<string>();
    for (const shop of loc.shops) {
      if (shopIds.has(shop.id)) issues.push(`${here} : boutique « ${shop.id} » en double`);
      shopIds.add(shop.id);
      localShops.add(shop.id);
      checkLines(`${here}.shops.${shop.id}.welcome`, shop.welcome);
      checkLines(`${here}.shops.${shop.id}.refusal`, shop.refusal);
      for (const entry of shop.stock) {
        if (!itemIds.has(entry.item)) issues.push(`${here}.shops.${shop.id} : objet inconnu « ${entry.item} »`);
        else if (!sellableIds.has(entry.item)) issues.push(`${here}.shops.${shop.id} : « ${entry.item} » n'a pas de prix, il ne peut pas être vendu`);
      }
    }
    for (const r of loc.rewards) checkEffects(`${here}.rewards.${r.flag}`, r.effects);
    for (const npc of loc.npcs) {
      const at = `${here}.${npc.id}`;
      const previous = npcIds.get(npc.id);
      if (previous !== undefined) issues.push(`${file} › PNJ « ${npc.id} » en double (déjà dans ${previous})`);
      npcIds.set(npc.id, loc.id);
      checkLines(`${at}.greeting`, npc.greeting);
      npc.options.forEach((o, i) => {
        const oat = `${at}.options[${i}]`;
        checkCond(oat, o.when);
        if (o.kind === 'shop' && !localShops.has(o.shop)) issues.push(`${oat} : boutique « ${o.shop} » absente du lieu`);
        if (o.kind === 'quest' && !questIds.has(o.quest)) issues.push(`${oat} : quête inconnue « ${o.quest} »`);
        if (o.kind === 'recruit') {
          if (!classIds.has(o.unit.class)) issues.push(`${oat} : classe inconnue « ${o.unit.class} »`);
          if (o.needsQuest !== undefined && !questIds.has(o.needsQuest)) issues.push(`${oat} : quête inconnue « ${o.needsQuest} »`);
        }
        if (o.kind === 'donate' && !repTargets.has(o.rep.target)) issues.push(`${oat} : réputation inconnue « ${o.rep.target} »`);
        if (o.kind === 'topic') checkEffects(oat, o.effects);
        if (o.kind === 'choice') {
          for (const c of o.choices) {
            checkEffects(oat, c.effects);
            checkCond(oat, c.when);
          }
        }
      });
    }
  }

  for (const q of data.quests) {
    const at = `quests.json › ${q.id}`;
    const giver = npcIds.get(q.giver);
    if (giver === undefined) issues.push(`${at}.giver référence un PNJ inconnu : « ${q.giver} »`);
    else if (data.locations.find((l) => l.id === giver)?.reputation === null) issues.push(`${at} : le donneur vit dans un lieu sans réputation`);
    const offered = data.locations.some((l) =>
      l.npcs.some((n) => n.id === q.giver && n.options.some((o) => o.kind === 'quest' && o.quest === q.id)),
    );
    if (giver !== undefined && !offered) issues.push(`${at} : le PNJ « ${q.giver} » n'a pas d'option de quête pour elle`);
    for (const s of q.steps) {
      if (s.kind === 'visit' && !locationIds.has(s.location)) issues.push(`${at} : lieu inconnu « ${s.location} »`);
    }
    for (const r of q.reward.rep) if (!repTargets.has(r.target)) issues.push(`${at}.reward : réputation inconnue « ${r.target} »`);
    for (const it of q.reward.items ?? []) if (!itemIds.has(it.item)) issues.push(`${at}.reward : objet inconnu « ${it.item} »`);
    if (q.refusalPenalty && !repTargets.has(q.refusalPenalty.target)) issues.push(`${at}.refusalPenalty : réputation inconnue « ${q.refusalPenalty.target} »`);
  }
}

/** Zones : butin, tables de rencontres, drapeaux d'accès (jalon M3). */
function checkZoneContent(data: GameData, issues: string[]): void {
  const encounters = new Map(data.encounters.encounters.map((e) => [e.id, e]));
  const itemIds = new Set<string>([...data.weapons.map((w) => w.id), ...data.consumables.map((c) => c.id), ...data.accessories.map((a) => a.id), ...data.keyItems.map((k) => k.id)]);
  const consumableIds = new Set(data.consumables.map((c) => c.id));
  const sellable = new Set<string>([...data.weapons.filter((w) => w.price !== undefined).map((w) => w.id), ...data.accessories.map((a) => a.id)]);
  for (const zone of data.zones) {
    const at = `zones.json › « ${zone.id} »`;
    if (zone.goldPerEnemy.min > zone.goldPerEnemy.max) issues.push(`${at}.goldPerEnemy : min > max`);
    for (const item of zone.loot.consumables) if (!consumableIds.has(item)) issues.push(`${at}.loot.consumables : « ${item} » n'est pas un consommable`);
    for (const item of zone.loot.equipment) if (!sellable.has(item)) issues.push(`${at}.loot.equipment : « ${item} » n'est ni une arme vendable ni un accessoire`);
    for (const entry of zone.encounterTable) {
      const enc = encounters.get(entry.encounter);
      if (!enc) issues.push(`${at}.encounterTable : rencontre inconnue « ${entry.encounter} »`);
      else if (enc.objective.type === 'boss') issues.push(`${at}.encounterTable : « ${enc.id} » est une rencontre de boss, elle n'a pas sa place dans une table`);
    }
    if ((zone.access === undefined || zone.access.length === 0) !== (zone.accessMessage === undefined)) issues.push(`${at} : access et accessMessage vont ensemble`);
    if (zone.access !== undefined && zone.unlockFlag === null) issues.push(`${at}.access : une zone toujours ouverte n'a pas de passage à conditionner`);
  }
  for (const enc of data.encounters.encounters) {
    for (const item of enc.rewards?.items ?? []) if (!itemIds.has(item.item)) issues.push(`encounters.json › « ${enc.id} ».rewards : objet inconnu « ${item.item} »`);
  }
}

/** Ennemis du monde : références, forme propre à chaque type, couverture des tables (la carte est vérifiée par `checkFoesOnMap`). */
function checkWorldFoes(data: GameData, issues: string[]): void {
  const file = 'worldEnemies.json';
  checkUniqueIds(file, 'ennemi du monde', data.worldFoes, issues);
  const zones = new Map(data.zones.map((z) => [z.id, z]));
  const encounters = new Map(data.encounters.encounters.map((e) => [e.id, e]));
  const towns = new Map(data.locations.map((l) => [l.id, l]));
  const bossFlags = new Set<string>();
  for (const foe of data.worldFoes) {
    const at = `${file} › « ${foe.id} »`;
    const zone = zones.get(foe.zone);
    if (!zone) {
      issues.push(`${at}.zone référence une zone inconnue : « ${foe.zone} »`);
      continue;
    }
    const enc = foe.encounter === undefined ? undefined : encounters.get(foe.encounter);
    if (foe.encounter !== undefined && !enc) issues.push(`${at}.encounter référence une rencontre inconnue : « ${foe.encounter} »`);
    if (enc && enc.zone !== foe.zone) issues.push(`${at} : la rencontre « ${enc.id} » appartient à la zone « ${enc.zone} »`);
    if (foe.kind === 'boss') {
      if (!enc) issues.push(`${at} : un boss a une rencontre fixe (encounter)`);
      else if (enc.objective.type !== 'boss') issues.push(`${at} : la rencontre « ${enc.id} » d'un boss doit avoir l'objectif « boss »`);
      else for (const flag of enc.victoryFlags) bossFlags.add(flag);
    } else if (enc?.objective.type === 'boss') issues.push(`${at} : seul un boss peut engager une rencontre de boss`);
    if (foe.kind === 'patrouille' && foe.path === undefined) issues.push(`${at} : une patrouille a un trajet (path)`);
    if (foe.kind !== 'patrouille' && foe.path !== undefined) issues.push(`${at} : path n'a de sens que pour une patrouille`);
    if (foe.path !== undefined && (foe.path[0]?.[0] !== foe.at[0] || foe.path[0]?.[1] !== foe.at[1])) issues.push(`${at} : le trajet doit commencer à la case d'attache (at)`);
    if ((foe.kind === 'errant' || foe.kind === 'garde') !== (foe.roam !== undefined)) issues.push(`${at} : roam est réservé aux errants et aux gardes (et obligatoire pour eux)`);
    if ((foe.kind === 'sentinelle') !== (foe.facing !== undefined)) issues.push(`${at} : facing est réservé aux sentinelles (et obligatoire pour elles)`);
    if (foe.kind === 'garde') {
      const town = foe.town === undefined ? undefined : towns.get(foe.town);
      if (!town || town.reputation === null) issues.push(`${at}.town doit désigner un lieu habité (avec réputation)`);
    } else if (foe.town !== undefined) issues.push(`${at}.town n'a de sens que pour un garde`);
    if (foe.encounter === undefined && foe.kind !== 'boss' && !zone.encounterTable.some((t) => t.for.includes(foe.kind))) {
      issues.push(`${at} : aucune rencontre de « ${foe.kind} » dans la table de la zone « ${zone.id} »`);
    }
  }
  // Tout boss de quête (drapeaux boss_* des lieux et quêtes) a son ennemi dans le monde.
  const needed = new Set<string>();
  for (const q of data.quests) for (const step of q.steps) if (step.kind === 'flag' && step.flag.startsWith('boss_')) needed.add(step.flag);
  for (const flag of needed) if (!bossFlags.has(flag)) issues.push(`${file} : aucun boss du monde ne lève le drapeau « ${flag} » (attendu par une quête)`);
}
