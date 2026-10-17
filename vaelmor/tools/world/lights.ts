/**
 * Points de lumière des tampons (refonte graphique, étape 5 — décision n°47).
 *
 * Les peintres signalent leurs sources de lumière là où ils les dessinent
 * (fenêtre éclairée, lanterne, foyer, rune) ; `getStamp` les recueille pendant
 * la peinture de la première image. Le générateur les écrit dans la couche
 * d'objets `ambient` de la carte (type `light`) et le jeu y pose un halo
 * additif qui scintille.
 */
export type LightKind = 'lamp' | 'fire' | 'window' | 'rune';

export interface StampLight {
  /** Position en pixels dans le tampon. */
  readonly x: number;
  readonly y: number;
  readonly kind: LightKind;
}

let sink: StampLight[] | null = null;

/** Exécute `paint` en recueillant les lumières qu'il signale. */
export function captureLights(paint: () => void): StampLight[] {
  const previous = sink;
  const lights: StampLight[] = [];
  sink = lights;
  try {
    paint();
  } finally {
    sink = previous;
  }
  return lights;
}

/** Signale une source de lumière (sans effet hors de `captureLights`). */
export function emitLight(x: number, y: number, kind: LightKind): void {
  sink?.push({ x: Math.round(x), y: Math.round(y), kind });
}

/* ---------- Portes (décision n°59) ---------- */

/** Porte d'un tampon : milieu du bas du vantail, en pixels dans le tampon. */
export interface StampDoor {
  readonly x: number;
  readonly y: number;
}

let doorSink: StampDoor[] | null = null;

/** Exécute `paint` en recueillant les portes qu'il dessine (le combat en fait des cases visitables). */
export function captureDoors(paint: () => void): StampDoor[] {
  const previous = doorSink;
  const doors: StampDoor[] = [];
  doorSink = doors;
  try {
    paint();
  } finally {
    doorSink = previous;
  }
  return doors;
}

/** Signale une porte (sans effet hors de `captureDoors`). */
export function emitDoor(x: number, y: number): void {
  doorSink?.push({ x: Math.round(x), y: Math.round(y) });
}
