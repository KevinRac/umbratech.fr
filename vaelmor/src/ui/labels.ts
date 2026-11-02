/**
 * Libellés français partagés par les écrans (rôles de classe, stats).
 */
import type { ClassRole, StatKey } from '../data/schemas';

export const ROLE_LABELS: Readonly<Record<ClassRole, string>> = {
  tank: 'Tank',
  degats_melee: 'Dégâts mêlée',
  degats_distance: 'Dégâts à distance',
  magie_offensive: 'Magie offensive',
  soin: 'Soin',
  soutien: 'Soutien',
  controle: 'Contrôle',
  mobilite: 'Mobilité',
  invocation: 'Invocation',
  terrain: 'Terrain',
  anti_armure: 'Anti-armure',
  tueur_de_boss: 'Tueur de boss',
};

export const STAT_SHORT: Readonly<Record<StatKey, string>> = {
  pv: 'PV',
  fo: 'FO',
  mag: 'MAG',
  dex: 'DEX',
  vit: 'VIT',
  def: 'DÉF',
  res: 'RÉS',
  chc: 'CHC',
  mob: 'MOB',
};
