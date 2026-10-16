/**
 * Grille de collision du monde (GDD §4.4).
 *
 * Valeurs : 0 libre · 1 bloqué · 2 eau (infranchissable à pied) · 3 zone lente
 * (marais, gué) · 4 passage verrouillé. Un passage de valeur 4 est solide
 * tant que son drapeau de déverrouillage n'est pas levé.
 */
import { COLLISION, type WorldMap } from '../../data/worldMap';

export class CollisionGrid {
  /** 1 = solide pour le héros. Recalculé quand les drapeaux changent. */
  private readonly solid: Uint8Array;
  private openFlags: ReadonlySet<string> = new Set();

  constructor(
    readonly width: number,
    readonly height: number,
    readonly tileSize: number,
    private readonly values: Uint8Array,
    private readonly gateFlagByCell: ReadonlyMap<number, string>,
  ) {
    this.solid = new Uint8Array(values.length);
    this.refresh();
  }

  static fromMap(map: WorldMap, openFlags: Iterable<string> = []): CollisionGrid {
    const grid = new CollisionGrid(map.width, map.height, map.tileSize, map.collision, map.gateFlagByCell);
    grid.setOpenFlags(openFlags);
    return grid;
  }

  /** Remplace l'ensemble des drapeaux levés (boss vaincus…). */
  setOpenFlags(flags: Iterable<string>): void {
    this.openFlags = new Set(flags);
    this.refresh();
  }

  private refresh(): void {
    for (let i = 0; i < this.values.length; i++) {
      const v = this.values[i] as number;
      let solid = v === COLLISION.blocked || v === COLLISION.water;
      if (v === COLLISION.gate) {
        const flag = this.gateFlagByCell.get(i);
        solid = flag === undefined || !this.openFlags.has(flag);
      }
      this.solid[i] = solid ? 1 : 0;
    }
  }

  inBounds(tx: number, ty: number): boolean {
    return tx >= 0 && ty >= 0 && tx < this.width && ty < this.height;
  }

  /** Valeur brute de la case (les cases hors carte sont bloquées). */
  valueAt(tx: number, ty: number): number {
    return this.inBounds(tx, ty) ? (this.values[ty * this.width + tx] as number) : COLLISION.blocked;
  }

  isSolidCell(tx: number, ty: number): boolean {
    return !this.inBounds(tx, ty) || this.solid[ty * this.width + tx] === 1;
  }

  /** Vrai si le rectangle (pixels) touche une case solide. Coordonnées : coin haut-gauche. */
  isSolidRect(x: number, y: number, w: number, h: number): boolean {
    const t = this.tileSize;
    const x0 = Math.floor(x / t);
    const y0 = Math.floor(y / t);
    const x1 = Math.floor((x + w - 1e-6) / t);
    const y1 = Math.floor((y + h - 1e-6) / t);
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        if (this.isSolidCell(tx, ty)) return true;
      }
    }
    return false;
  }

  /** Drapeau du premier passage verrouillé touché par le rectangle, sinon null. */
  closedGateInRect(x: number, y: number, w: number, h: number): string | null {
    const t = this.tileSize;
    const x0 = Math.floor(x / t);
    const y0 = Math.floor(y / t);
    const x1 = Math.floor((x + w - 1e-6) / t);
    const y1 = Math.floor((y + h - 1e-6) / t);
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        if (!this.inBounds(tx, ty)) continue;
        const i = ty * this.width + tx;
        if (this.values[i] === COLLISION.gate && this.solid[i] === 1) return this.gateFlagByCell.get(i) ?? null;
      }
    }
    return null;
  }

  /** Vrai si le point (pixels) est sur une zone lente. */
  isSlowAt(px: number, py: number): boolean {
    return this.valueAt(Math.floor(px / this.tileSize), Math.floor(py / this.tileSize)) === COLLISION.slow;
  }
}
