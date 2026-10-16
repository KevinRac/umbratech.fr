/**
 * Générateur pseudo-aléatoire déterministe (sfc32), sérialisable.
 *
 * Toute la logique de jeu tire ses aléas d'un `Rng` (jamais de Math.random) :
 * un combat est ainsi rejouable à l'identique à partir de sa graine (GDD §18),
 * et l'état peut être sauvegardé puis restauré.
 */
export type RngState = readonly [number, number, number, number];

/** Hache une graine texte ou numérique en état initial (cyrb128). */
function seedState(seed: string | number): [number, number, number, number] {
  const str = String(seed);
  let h1 = 1779033703;
  let h2 = 3144134277;
  let h3 = 1013904242;
  let h4 = 2773480762;
  for (let i = 0; i < str.length; i++) {
    const k = str.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  return [(h1 ^ h2 ^ h3 ^ h4) >>> 0, (h2 ^ h1) >>> 0, (h3 ^ h1) >>> 0, (h4 ^ h1) >>> 0];
}

export class Rng {
  private a: number;
  private b: number;
  private c: number;
  private d: number;

  private constructor(state: RngState) {
    [this.a, this.b, this.c, this.d] = state;
  }

  static fromSeed(seed: string | number): Rng {
    const rng = new Rng(seedState(seed));
    // Écarte les premières valeurs, moins bien mélangées.
    for (let i = 0; i < 15; i++) rng.nextUint32();
    return rng;
  }

  static fromState(state: RngState): Rng {
    return new Rng(state);
  }

  getState(): RngState {
    return [this.a, this.b, this.c, this.d];
  }

  /** Entier non signé sur 32 bits. */
  nextUint32(): number {
    this.a >>>= 0;
    this.b >>>= 0;
    this.c >>>= 0;
    this.d >>>= 0;
    const t = (this.a + this.b + this.d) | 0;
    this.d = (this.d + 1) | 0;
    this.a = this.b ^ (this.b >>> 9);
    this.b = (this.c + (this.c << 3)) | 0;
    this.c = (this.c << 21) | (this.c >>> 11);
    this.c = (this.c + t) | 0;
    return t >>> 0;
  }

  /** Réel dans [0, 1[. */
  next(): number {
    return this.nextUint32() / 4294967296;
  }

  /** Entier dans [min, max] (bornes incluses). */
  int(min: number, max: number): number {
    if (!Number.isInteger(min) || !Number.isInteger(max) || max < min) {
      throw new RangeError(`Rng.int : bornes invalides [${min}, ${max}]`);
    }
    return min + Math.floor(this.next() * (max - min + 1));
  }

  /** Vrai avec une probabilité de `percent` % (0–100). Un seul jet : la chance affichée est la vraie (GDD §9.7). */
  chance(percent: number): boolean {
    if (percent <= 0) return false;
    if (percent >= 100) return true;
    return this.next() * 100 < percent;
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new RangeError('Rng.pick : liste vide');
    return items[this.int(0, items.length - 1)] as T;
  }

  /** Mélange de Fisher-Yates (nouvelle liste). */
  shuffle<T>(items: readonly T[]): T[] {
    const out = [...items];
    for (let i = out.length - 1; i > 0; i--) {
      const j = this.int(0, i);
      [out[i], out[j]] = [out[j] as T, out[i] as T];
    }
    return out;
  }
}
