/**
 * Liaisons clavier et remappage (GDD §13.8, décision n°241). Logique pure :
 * les touches sont désignées par leur nom de code Phaser (`UP`, `Z`, `ENTER`…),
 * `core/input.ts` les traduit en codes clavier.
 *
 * Règles (n°257) :
 * - chaque action remappable a au plus `SLOTS` touches ;
 * - les directions gardent les flèches, « valider » Entrée et « retour » Échap
 *   dans leur première case (touches verrouillées) : les menus restent
 *   utilisables quoi qu'on fasse ;
 * - une touche ne sert qu'à une action (conflit refusé, avec le nom de l'action
 *   qui l'utilise) ; les touches de fonction restent au debug ;
 * - on ne peut pas retirer la dernière touche d'une action ;
 * - seules les actions modifiées sont enregistrées (`vaelmor:settings › keys`).
 */

export const SLOTS = 3;

/** Actions que le joueur peut remapper, dans l'ordre de l'écran des touches. */
export const REMAPPABLE = ['up', 'down', 'left', 'right', 'confirm', 'cancel', 'sprint', 'menu', 'map', 'journal', 'threat', 'nextUnit'] as const;
export type RemappableAction = (typeof REMAPPABLE)[number];

/** Actions du debug : touches fixes, jamais montrées au joueur. */
export const DEBUG_BINDINGS = {
  debug: ['F3'],
  debugTeleport: ['F2'],
  debugCollision: ['F4'],
  debugGates: ['F9'],
  debugEvening: ['F6'],
  debugBattle: ['F7'],
  debugBattleBoss: ['F8'],
} as const;
export type DebugAction = keyof typeof DEBUG_BINDINGS;
export type Action = RemappableAction | DebugAction;

/** Liaisons d'origine (ZQSD et WASD en même temps : AZERTY comme QWERTY). */
export const DEFAULT_BINDINGS: Readonly<Record<RemappableAction, readonly string[]>> = {
  up: ['UP', 'Z', 'W'],
  down: ['DOWN', 'S'],
  left: ['LEFT', 'Q', 'A'],
  right: ['RIGHT', 'D'],
  confirm: ['ENTER', 'SPACE', 'E'],
  cancel: ['ESC', 'BACKSPACE'],
  sprint: ['SHIFT'],
  menu: ['TAB', 'M'],
  map: ['N'],
  journal: ['J'],
  threat: ['R'],
  nextUnit: ['F'],
};

/** Première case verrouillée : la touche qui garantit qu'on ne se bloque jamais. */
export const LOCKED_KEY: Readonly<Partial<Record<RemappableAction, string>>> = { up: 'UP', down: 'DOWN', left: 'LEFT', right: 'RIGHT', confirm: 'ENTER', cancel: 'ESC' };

export const ACTION_LABEL: Readonly<Record<RemappableAction, string>> = {
  up: 'Haut',
  down: 'Bas',
  left: 'Gauche',
  right: 'Droite',
  confirm: 'Valider / parler',
  cancel: 'Retour / pause',
  sprint: 'Courir / accélérer',
  menu: 'Menu',
  map: 'Carte de l’île',
  journal: 'Journal',
  threat: 'Zones de menace',
  nextUnit: 'Unité suivante',
};

const letters = Object.fromEntries('ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((c) => [c, c]));
const digitNames = ['ZERO', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE'];
const digits = Object.fromEntries(digitNames.map((n, i) => [n, String(i)]));
const numpad = Object.fromEntries(digitNames.map((n, i) => [`NUMPAD_${n}`, `Pavé ${i}`]));
const fkeys = Object.fromEntries(Array.from({ length: 12 }, (_, i) => [`F${i + 1}`, `F${i + 1}`]));

/** Touches connues et leur nom à l'écran (police du jeu : pas de flèches dessinées). */
export const KEY_LABEL: Readonly<Record<string, string>> = {
  UP: 'Flèche haut',
  DOWN: 'Flèche bas',
  LEFT: 'Flèche gauche',
  RIGHT: 'Flèche droite',
  ENTER: 'Entrée',
  SPACE: 'Espace',
  ESC: 'Échap',
  BACKSPACE: 'Retour arr.',
  TAB: 'Tab',
  SHIFT: 'Maj',
  CTRL: 'Ctrl',
  ALT: 'Alt',
  DELETE: 'Suppr',
  INSERT: 'Inser',
  HOME: 'Début',
  END: 'Fin',
  PAGE_UP: 'Page préc.',
  PAGE_DOWN: 'Page suiv.',
  COMMA: ',',
  PERIOD: '.',
  SEMICOLON: ';',
  COLON: ':',
  QUOTES: '’',
  MINUS: '-',
  PLUS: '+',
  OPEN_BRACKET: '[',
  CLOSED_BRACKET: ']',
  BACK_SLASH: '\\',
  FORWARD_SLASH: '/',
  BACKTICK: '²',
  NUMPAD_ADD: 'Pavé +',
  NUMPAD_SUBTRACT: 'Pavé -',
  ...letters,
  ...digits,
  ...numpad,
  ...fkeys,
};

/** Réservées : touches de fonction (debug, F10 « Signaler un problème » au lot H). */
export const isReservedKey = (key: string): boolean => /^F\d+$/.test(key);

export type KeyBindings = Readonly<Record<RemappableAction, readonly string[]>>;

export const isRemappable = (action: string): action is RemappableAction => (REMAPPABLE as readonly string[]).includes(action);

/** Liaisons d'origine (copie modifiable). */
export function defaultBindings(): Record<RemappableAction, string[]> {
  return Object.fromEntries(REMAPPABLE.map((a) => [a, [...DEFAULT_BINDINGS[a]]])) as Record<RemappableAction, string[]>;
}

/**
 * Liaisons effectives à partir de ce qui est enregistré : une action absente ou
 * illisible garde ses touches d'origine ; une touche inconnue, réservée ou déjà
 * prise par une action précédente est ignorée ; la touche verrouillée revient
 * toujours en tête.
 */
export function resolveBindings(stored: unknown): KeyBindings {
  const out = defaultBindings();
  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return out;
  const custom = stored as Record<string, unknown>;
  for (const action of REMAPPABLE) {
    const raw = custom[action];
    if (!Array.isArray(raw)) continue;
    const keys = raw.filter((k): k is string => typeof k === 'string' && k in KEY_LABEL && !isReservedKey(k));
    const locked = LOCKED_KEY[action];
    const list = [...(locked ? [locked] : []), ...keys.filter((k) => k !== locked)];
    const unique = [...new Set(list)].slice(0, SLOTS);
    if (unique.length > 0) out[action] = unique;
  }
  // Une touche enregistrée deux fois (fichier modifié à la main) : la première action la garde,
  // sauf si l'autre n'aurait plus aucune touche (elle garde alors les siennes).
  const seen = new Set<string>();
  for (const action of REMAPPABLE) {
    const kept = out[action].filter((k) => !seen.has(k));
    if (kept.length > 0) out[action] = kept;
    for (const k of out[action]) seen.add(k);
  }
  return out;
}

/** Ce qu'il faut enregistrer : seulement les actions qui diffèrent de l'origine. */
export function storedBindings(bindings: KeyBindings): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const action of REMAPPABLE) {
    const keys = bindings[action];
    const def = DEFAULT_BINDINGS[action];
    if (keys.length !== def.length || keys.some((k, i) => k !== def[i])) out[action] = [...keys];
  }
  return out;
}

/** Action qui utilise déjà une touche (null : libre). */
export function actionUsing(bindings: KeyBindings, key: string): RemappableAction | null {
  return REMAPPABLE.find((a) => bindings[a].includes(key)) ?? null;
}

export type BindResult =
  | { readonly ok: true; readonly bindings: KeyBindings }
  | { readonly ok: false; readonly reason: 'locked' | 'reserved' | 'unknown' | 'conflict' | 'last'; readonly message: string };

const refuse = (reason: Exclude<BindResult, { ok: true }>['reason'], message: string): BindResult => ({ ok: false, reason, message });

/** Case verrouillée (la touche de secours d'une action) ? */
export const isLockedSlot = (action: RemappableAction, slot: number): boolean => slot === 0 && LOCKED_KEY[action] !== undefined;

/** Pose `key` dans la case `slot` de l'action (remplace ce qui s'y trouvait). */
export function bindKey(bindings: KeyBindings, action: RemappableAction, slot: number, key: string): BindResult {
  if (isLockedSlot(action, slot)) return refuse('locked', `${KEY_LABEL[LOCKED_KEY[action] as string]} reste liée à « ${ACTION_LABEL[action]} ».`);
  if (!(key in KEY_LABEL)) return refuse('unknown', 'Cette touche n’est pas prise en charge.');
  if (isReservedKey(key)) return refuse('reserved', 'Les touches F1 à F12 sont réservées.');
  const current = bindings[action];
  if (current[slot] === key) return { ok: true, bindings };
  const owner = actionUsing(bindings, key);
  if (owner && owner !== action) return refuse('conflict', `${KEY_LABEL[key]} sert déjà à « ${ACTION_LABEL[owner]} ».`);
  const next = current.filter((k) => k !== key);
  const at = Math.min(slot, next.length);
  if (at < next.length) next[at] = key;
  else next.push(key);
  return { ok: true, bindings: { ...bindings, [action]: next.slice(0, SLOTS) } };
}

/** Vide la case `slot` de l'action. */
export function clearKey(bindings: KeyBindings, action: RemappableAction, slot: number): BindResult {
  if (isLockedSlot(action, slot)) return refuse('locked', `${KEY_LABEL[LOCKED_KEY[action] as string]} reste liée à « ${ACTION_LABEL[action]} ».`);
  const current = bindings[action];
  if (slot >= current.length) return { ok: true, bindings };
  if (current.length <= 1) return refuse('last', `« ${ACTION_LABEL[action]} » doit garder au moins une touche.`);
  return { ok: true, bindings: { ...bindings, [action]: current.filter((_, i) => i !== slot) } };
}

/**
 * Libellé d'une touche de l'action pour les aides à l'écran (« E : parler ») :
 * la première, ou `'last'` la dernière (celle que le joueur a posée en dernier
 * recours : E pour parler), ou `'free'` la première qui n'est pas verrouillée
 * (Z pour monter, plutôt que la flèche).
 */
export function keyHint(bindings: KeyBindings, action: RemappableAction, pick: 'first' | 'last' | 'free' = 'first'): string {
  const keys = bindings[action];
  const locked = LOCKED_KEY[action];
  const key = (pick === 'last' ? keys[keys.length - 1] : pick === 'free' && locked ? keys.find((k) => k !== locked) : undefined) ?? keys[0] ?? '';
  return KEY_LABEL[key] ?? key;
}
