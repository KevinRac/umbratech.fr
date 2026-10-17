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
