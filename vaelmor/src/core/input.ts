/**
 * Actions de jeu et liaisons clavier (GDD §4.2). Les scènes raisonnent en
 * actions (« confirmer », « haut »…), jamais en touches : le remappage
 * (accessibilité, §13.8) ne touchera que ce fichier.
 *
 * ZQSD et WASD sont liés en même temps : un clavier AZERTY comme QWERTY
 * fonctionne sans réglage.
 *
 * Les appuis sont lus sur les événements `keydown` (et non sur l'état des
 * touches à chaque image) : un appui très bref, enfoncé et relâché entre deux
 * images, n'est jamais perdu.
 */
import Phaser from 'phaser';

type KeyName = keyof typeof Phaser.Input.Keyboard.KeyCodes;

export const ACTION_BINDINGS = {
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
  debug: ['F3'],
  debugTeleport: ['F2'],
  debugCollision: ['F4'],
  debugGates: ['F9'],
  debugEvening: ['F6'],
  /** Combat : afficher toutes les zones de menace ennemies (GDD §9.5). */
  threat: ['R'],
  /** Combat : passer à l'unité prête suivante. */
  nextUnit: ['F'],
  debugBattle: ['F7'],
  debugBattleBoss: ['F8'],
} as const satisfies Record<string, readonly KeyName[]>;

export type Action = keyof typeof ACTION_BINDINGS;

/** Actions qui se répètent quand la touche reste enfoncée (navigation dans les menus). */
const REPEATABLE: ReadonlySet<Action> = new Set<Action>(['up', 'down', 'left', 'right']);

export class ActionInput {
  private readonly actionsByCode = new Map<number, Action[]>();
  private readonly keys = new Map<Action, Phaser.Input.Keyboard.Key[]>();
  private readonly pressed = new Set<Action>();

  constructor(scene: Phaser.Scene) {
    const keyboard = scene.input.keyboard;
    if (!keyboard) throw new Error('Clavier indisponible : le jeu nécessite un clavier.');

    for (const [action, names] of Object.entries(ACTION_BINDINGS) as [Action, readonly KeyName[]][]) {
      const keys = names.map((name) => keyboard.addKey(Phaser.Input.Keyboard.KeyCodes[name]));
      this.keys.set(action, keys);
      for (const key of keys) this.actionsByCode.set(key.keyCode, [...(this.actionsByCode.get(key.keyCode) ?? []), action]);
    }

    const onKeyDown = (event: KeyboardEvent): void => {
      for (const action of this.actionsByCode.get(event.keyCode) ?? []) {
        if (!event.repeat || REPEATABLE.has(action)) this.pressed.add(action);
      }
    };
    // Les événements clavier sont traités avant `update` ; on oublie les appuis non lus après.
    const onPostUpdate = (): void => this.pressed.clear();

    keyboard.on('keydown', onKeyDown);
    scene.events.on(Phaser.Scenes.Events.POST_UPDATE, onPostUpdate);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      keyboard.off('keydown', onKeyDown);
      scene.events.off(Phaser.Scenes.Events.POST_UPDATE, onPostUpdate);
    });
  }

  /** Vrai tant qu'une des touches de l'action est enfoncée (déplacements, sprint). */
  isDown(action: Action): boolean {
    return this.keys.get(action)?.some((key) => key.isDown) ?? false;
  }

  /** Vrai pendant l'image où l'action a été déclenchée (appui, ou répétition pour les directions). */
  justPressed(action: Action): boolean {
    return this.pressed.has(action);
  }

  /** Consomme un appui (pour qu'un seul composant y réagisse). */
  consume(action: Action): boolean {
    return this.pressed.delete(action);
  }
}
