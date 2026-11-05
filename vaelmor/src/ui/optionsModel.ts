/**
 * Contenu de l'écran Options (jalon M10, décision n°232) : une ligne par
 * réglage, rangée dans une section. Chaque ligne sait lire sa valeur et
 * l'enregistrer ; l'écran (`ui/OptionsPanel.ts`) ne fait que l'afficher.
 *
 * Ajouter un réglage : une ligne ici (lecture et écriture dans `core/settings.ts`),
 * puis, si une scène ouverte doit l'appliquer aussitôt, l'écouter avec
 * `onSettingsChange` dans cette scène.
 */
import { loadVolume, saveVolume, type Bus } from '../audio/engine';
import {
  ANIM_SPEED_LABEL,
  ANIM_SPEEDS,
  BATTLE_VIEW_LABEL,
  BATTLE_VIEWS,
  loadAnimSpeed,
  loadBattleView,
  loadQuality,
  loadReducedEffects,
  saveAnimSpeed,
  saveBattleView,
  saveQuality,
  saveReducedEffects,
} from '../core/settings';
import { QUALITIES, QUALITY_LABEL } from '../render/atmosphere';

export type OptionSection = 'affichage' | 'combat' | 'son' | 'texte' | 'commandes' | 'accessibilite';

/** Ordre et titres des sections (une section sans ligne n'est pas montrée). */
export const OPTION_SECTIONS: readonly { readonly id: OptionSection; readonly label: string }[] = [
  { id: 'affichage', label: 'Affichage' },
  { id: 'combat', label: 'Combat' },
  { id: 'son', label: 'Son' },
  { id: 'texte', label: 'Texte' },
  { id: 'commandes', label: 'Commandes' },
  { id: 'accessibilite', label: 'Accessibilité' },
];

export interface OptionValue {
  readonly id: string;
  readonly label: string;
}

export interface OptionRow {
  readonly id: string;
  readonly section: OptionSection;
  readonly label: string;
  /** Une ou deux phrases sous la liste quand la ligne est choisie. */
  readonly help: string;
  readonly values: readonly OptionValue[];
  /** Faux : Gauche/Droite s'arrêtent aux extrémités (volumes) au lieu de boucler. */
  readonly wrap?: boolean;
  get(): string;
  set(id: string): void;
}

const onOff = (on: string, off: string): readonly OptionValue[] => [
  { id: 'on', label: on },
  { id: 'off', label: off },
];

/** Volumes de 0 à 100 par pas de 10 (0 : coupé). */
export const VOLUME_STEPS: readonly OptionValue[] = Array.from({ length: 11 }, (_, i) => ({ id: String(i * 10), label: i === 0 ? 'Coupé' : `${i * 10} %` }));

function volumeRow(id: string, bus: Bus, label: string, help: string): OptionRow {
  return {
    id,
    section: 'son',
    label,
    help,
    values: VOLUME_STEPS,
    wrap: false,
    get: () => String(Math.round(loadVolume(bus) / 10) * 10),
    set: (v) => saveVolume(bus, Number(v)),
  };
}

/** Les réglages, dans l'ordre d'affichage. */
export function optionRows(): OptionRow[] {
  return [
    {
      id: 'quality',
      section: 'affichage',
      label: 'Qualité des effets',
      help: 'Haute : lumière, halos, flou de profondeur. Basse : couleurs et vignettage seulement, pour une machine modeste. Désactivée : aucun filtre.',
      values: QUALITIES.map((q) => ({ id: q, label: QUALITY_LABEL[q] })),
      get: () => loadQuality(),
      set: (id) => saveQuality(QUALITIES.find((q) => q === id) ?? 'high'),
    },
    {
      id: 'battleView',
      section: 'combat',
      label: 'Échanges',
      help: 'Rapproché : chaque échange se joue dans l’écran de combat rapproché. Carte : les coups sont montrés sur la carte.',
      values: BATTLE_VIEWS.map((v) => ({ id: v, label: BATTLE_VIEW_LABEL[v] })),
      get: () => loadBattleView(),
      set: (id) => saveBattleView(BATTLE_VIEWS.find((v) => v === id) ?? 'closeup'),
    },
    {
      id: 'battleAnim',
      section: 'combat',
      label: 'Animations',
      help: 'Rapides : deux fois plus courtes. Désactivées : les dégâts s’affichent sans animation. Maj maintenue accélère à tout moment.',
      values: ANIM_SPEEDS.map((v) => ({ id: v, label: ANIM_SPEED_LABEL[v] })),
      get: () => loadAnimSpeed(),
      set: (id) => saveAnimSpeed(ANIM_SPEEDS.find((v) => v === id) ?? 'normal'),
    },
    volumeRow('musicVolume', 'music', 'Musique', 'Volume de la musique.'),
    volumeRow('sfxVolume', 'sfx', 'Effets sonores', 'Volume des bruitages des combats et de l’interface.'),
    {
      id: 'reducedFx',
      section: 'accessibilite',
      label: 'Effets réduits',
      help: 'Flashs atténués, secousses légères, pas de zoom sur les coups critiques.',
      values: onOff('Oui', 'Non'),
      get: () => (loadReducedEffects() ? 'on' : 'off'),
      set: (id) => saveReducedEffects(id === 'on'),
    },
  ];
}

/** Valeur voisine (`step` = +1 ou −1) : en boucle, sauf pour une ligne `wrap: false` quand `wrap` n'est pas forcé. */
export function stepValue(row: OptionRow, step: number, wrap = row.wrap !== false): string {
  const values = row.values;
  const i = Math.max(0, values.findIndex((v) => v.id === row.get()));
  const j = wrap ? (i + step + values.length) % values.length : Math.max(0, Math.min(values.length - 1, i + step));
  return (values[j] as OptionValue).id;
}

/** Libellé de la valeur actuelle. */
export function valueLabel(row: OptionRow): string {
  const id = row.get();
  return row.values.find((v) => v.id === id)?.label ?? id;
}
