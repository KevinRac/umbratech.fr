/**
 * Catalogue des objets : armes, consommables, accessoires, objets de quête
 * rassemblés sous un seul identifiant, avec nom, prix et description.
 */
import type { AccessoryDef, ConsumableDef, KeyItemDef, WeaponDef } from '../../data/schemas';

export type ItemKind = 'weapon' | 'consumable' | 'accessory' | 'key';

export interface ItemInfo {
  readonly id: string;
  readonly name: string;
  readonly kind: ItemKind;
  /** Prix de base chez un marchand ; null = ni acheté ni revendu. */
  readonly price: number | null;
  readonly description: string;
}

export interface CatalogSource {
  readonly weapons: readonly WeaponDef[];
  readonly consumables: readonly ConsumableDef[];
  readonly accessories: readonly AccessoryDef[];
  readonly keyItems: readonly KeyItemDef[];
}

const KIND_LABEL: Record<ItemKind, string> = { weapon: 'Arme', consumable: 'Consommable', accessory: 'Accessoire', key: 'Objet de quête' };
export const itemKindLabel = (kind: ItemKind): string => KIND_LABEL[kind];

function describeWeapon(w: WeaponDef): string {
  const [min, max] = w.range;
  const range = min === max ? `${min}` : `${min}-${max}`;
  return `Puissance ${w.power} · portée ${range} · précision ${w.hit}${w.crit > 0 ? ` · critique ${w.crit}` : ''}`;
}

export function buildCatalog(source: CatalogSource): Map<string, ItemInfo> {
  const catalog = new Map<string, ItemInfo>();
  for (const w of source.weapons) catalog.set(w.id, { id: w.id, name: w.name, kind: 'weapon', price: w.price ?? null, description: describeWeapon(w) });
  for (const c of source.consumables) catalog.set(c.id, { id: c.id, name: c.name, kind: 'consumable', price: c.price, description: c.description });
  for (const a of source.accessories) catalog.set(a.id, { id: a.id, name: a.name, kind: 'accessory', price: a.price, description: a.description });
  for (const k of source.keyItems) catalog.set(k.id, { id: k.id, name: k.name, kind: 'key', price: null, description: k.description });
  return catalog;
}
