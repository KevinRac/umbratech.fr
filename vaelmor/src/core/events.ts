/**
 * Bus d'événements typé, indépendant de Phaser.
 *
 * Usage : déclarer la carte des événements, puis émettre / écouter.
 *   const bus = new EventBus<{ 'reputation:changed': { locationId: string; delta: number } }>();
 *   const off = bus.on('reputation:changed', (e) => …);
 *   bus.emit('reputation:changed', { locationId: 'haut_gue', delta: 10 });
 *   off();
 */
export type EventMap = Record<string, unknown>;
type Handler<T> = (payload: T) => void;

export class EventBus<Events extends EventMap> {
  private readonly handlers = new Map<keyof Events, Set<Handler<never>>>();

  /** Abonne un gestionnaire ; renvoie la fonction de désabonnement. */
  on<K extends keyof Events>(event: K, handler: Handler<Events[K]>): () => void {
    let set = this.handlers.get(event);
    if (!set) {
      set = new Set();
      this.handlers.set(event, set);
    }
    set.add(handler as Handler<never>);
    return () => this.off(event, handler);
  }

  /** Abonne un gestionnaire appelé une seule fois. */
  once<K extends keyof Events>(event: K, handler: Handler<Events[K]>): () => void {
    const off = this.on(event, (payload) => {
      off();
      handler(payload);
    });
    return off;
  }

  off<K extends keyof Events>(event: K, handler: Handler<Events[K]>): void {
    this.handlers.get(event)?.delete(handler as Handler<never>);
  }

  emit<K extends keyof Events>(event: K, payload: Events[K]): void {
    const set = this.handlers.get(event);
    if (!set) return;
    // Copie : un gestionnaire peut se désabonner pendant l'émission.
    for (const handler of [...set]) (handler as Handler<Events[K]>)(payload);
  }

  clear(): void {
    this.handlers.clear();
  }
}
