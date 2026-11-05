/**
 * Actions de jeu et liaisons clavier (GDD §4.2). Les scènes raisonnent en
 * actions (« confirmer », « haut »…), jamais en touches. Les liaisons et leurs
 * règles de remappage (§13.8, n°241, n°257) vivent dans `logic/input/keymap.ts` ;
 * ce fichier les traduit en touches Phaser et suit leurs changements.
 *
 * ZQSD et WASD sont liés en même temps par défaut : un clavier AZERTY comme
 * QWERTY fonctionne sans réglage.
 *
 * Les appuis sont lus sur les événements `keydown` (et non sur l'état des
 * touches à chaque image) : un appui très bref, enfoncé et relâché entre deux
 * images, n'est jamais perdu.
 */
import Phaser from 'phaser';
import { DEBUG_BINDINGS, KEY_LABEL, keyHint, type Action, type RemappableAction } from '../logic/input/keymap';
import { loadKeyBindings, onSettingsChange } from './settings';

type KeyName = keyof typeof Phaser.Input.Keyboard.KeyCodes;

export type { Action } from '../logic/input/keymap';

/** Liaisons en vigueur : celles du joueur (remappables) et celles du debug (fixes). */
function currentBindings(): Record<Action, readonly string[]> {
  return { ...loadKeyBindings(), ...DEBUG_BINDINGS };
}

/** Libellé de la première touche d'une action, pour les aides à l'écran (« E : parler »). */
export function keyLabel(action: RemappableAction, pick: 'first' | 'last' | 'free' = 'first'): string {
  return keyHint(loadKeyBindings(), action, pick);
}

/** Nom Phaser d'une touche à partir d'un événement clavier (null : touche inconnue du jeu). */
export function keyNameOf(event: KeyboardEvent): string | null {
  const codes = Phaser.Input.Keyboard.KeyCodes as Record<string, number>;
  for (const name of Object.keys(KEY_LABEL)) if (codes[name] === event.keyCode) return name;
  return null;
}

/** Actions qui se répètent quand la touche reste enfoncée (navigation dans les menus). */
const REPEATABLE: ReadonlySet<Action> = new Set<Action>(['up', 'down', 'left', 'right']);
/**
 * Répétition maison, identique sur tous les systèmes (la répétition du clavier
 * dépend de l'OS : long délai, et elle s'arrête quand on appuie sur une autre
 * touche) : premier pas tout de suite, puis un pas toutes les 70 ms au bout de 200 ms.
 */
export const REPEAT_DELAY_MS = 200;
export const REPEAT_INTERVAL_MS = 70;

export class ActionInput {
  private readonly actionsByCode = new Map<number, Action[]>();
  private readonly keys = new Map<Action, Phaser.Input.Keyboard.Key[]>();
  private readonly pressed = new Set<Action>();
  /** Heure du prochain pas pour chaque direction maintenue. */
  private readonly nextRepeat = new Map<Action, number>();

  constructor(scene: Phaser.Scene) {
    const keyboard = scene.input.keyboard;
    if (!keyboard) throw new Error('Clavier indisponible : le jeu nécessite un clavier.');

    const bind = (): void => {
      this.keys.clear();
      this.actionsByCode.clear();
      for (const [action, names] of Object.entries(currentBindings()) as [Action, readonly string[]][]) {
        const keys = names.flatMap((name) => {
          const code = Phaser.Input.Keyboard.KeyCodes[name as KeyName];
          return code === undefined ? [] : [keyboard.addKey(code)];
        });
        this.keys.set(action, keys);
        for (const key of keys) this.actionsByCode.set(key.keyCode, [...(this.actionsByCode.get(key.keyCode) ?? []), action]);
      }
    };
    bind();
    // Touches changées dans l'écran des commandes : les scènes déjà ouvertes suivent aussitôt.
    const offSettings = onSettingsChange((key) => {
      if (key === 'keys') bind();
    });

    const onKeyDown = (event: KeyboardEvent): void => {
      for (const action of this.actionsByCode.get(event.keyCode) ?? []) {
        if (event.repeat) continue; // les directions se répètent par `onPreUpdate`, les autres actions une seule fois
        this.pressed.add(action);
        if (REPEATABLE.has(action)) this.nextRepeat.set(action, performance.now() + REPEAT_DELAY_MS);
      }
    };
    const onPreUpdate = (): void => {
      const now = performance.now();
      for (const action of REPEATABLE) {
        const due = this.nextRepeat.get(action);
        if (due === undefined) continue;
        if (!this.isDown(action)) {
          this.nextRepeat.delete(action);
        } else if (now >= due) {
          this.pressed.add(action);
          this.nextRepeat.set(action, now + REPEAT_INTERVAL_MS);
        }
      }
    };
    // Les événements clavier sont traités avant `update` ; on oublie les appuis non lus après.
    const onPostUpdate = (): void => this.pressed.clear();

    keyboard.on('keydown', onKeyDown);
    scene.events.on(Phaser.Scenes.Events.POST_UPDATE, onPostUpdate);
    scene.events.on(Phaser.Scenes.Events.PRE_UPDATE, onPreUpdate);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      offSettings();
      keyboard.off('keydown', onKeyDown);
      scene.events.off(Phaser.Scenes.Events.PRE_UPDATE, onPreUpdate);
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
