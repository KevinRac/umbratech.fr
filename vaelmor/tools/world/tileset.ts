/**
 * Construction du tileset du monde : atlas de tuiles 16×16 généré à la demande.
 *
 * Chaque tuile est identifiée par une clé textuelle ; une même clé donne la
 * même tuile (dédoublonnage) et le hasard de sa peinture est ensemencé par la
 * clé, donc la génération est déterministe. La première tuile est vide, les 4 suivantes sont les
 * repères de collision (visibles dans Tiled, jamais dessinés par le jeu).
 */
import { createHash } from 'node:crypto';
import { hashString, mulberry32 } from './noise';
import { Px } from './px';
import type { Rnd } from './art';

export const TILE = 16;
export const TILESET_COLUMNS = 128;
export const TILESET_NAME = 'world_tiles';

export interface TilesetResult {
  readonly atlas: Px;
  readonly tileCount: number;
  readonly columns: number;
  /** Tuiles portant un terrain : `id` est l'index 0-based dans le tileset. */
  readonly terrains: readonly { readonly id: number; readonly terrain: string }[];
  /** Tuiles animées (format Tiled) : `id` et `frames` sont des index 0-based. */
  readonly animations: readonly { readonly id: number; readonly frames: readonly number[]; readonly durations: readonly number[] }[];
}

const MARKERS: readonly { name: string; color: number }[] = [
  { name: 'blocked', color: 0xd04a3a },
  { name: 'water', color: 0x3a7ad0 },
  { name: 'slow', color: 0xd0b03a },
  { name: 'gate', color: 0x9a4ad0 },
];

export class TilesetBuilder {
  private readonly tiles: { px: Px; terrain: string | undefined }[] = [];
  private readonly byKey = new Map<string, number>();
  private readonly animations = new Map<number, { frames: number[]; durations: number[] }>();

  constructor() {
    // Tuile 0 : transparente. Les couches GPU de Phaser dessinent la tuile d'indice 0 pour les cases vides ;
    // elle doit donc être invisible.
    this.tiles.push({ px: new Px(TILE, TILE), terrain: undefined });
    this.byKey.set('empty', this.tiles.length);
    for (const marker of MARKERS) {
      const px = new Px(TILE, TILE);
      px.rect(0, 0, TILE, TILE, marker.color, 90);
      for (let i = 0; i < TILE; i++) {
        px.set(i, 0, marker.color, 200);
        px.set(i, TILE - 1, marker.color, 200);
        px.set(0, i, marker.color, 200);
        px.set(TILE - 1, i, marker.color, 200);
      }
      this.tiles.push({ px, terrain: undefined });
      this.byKey.set(`marker:${marker.name}`, this.tiles.length);
    }
  }

  /** Identifiant de tuile (gid, firstgid = 1) d'une tuile peinte par `paint`. */
  tile(key: string, paint: (px: Px, rnd: Rnd) => void, terrain?: string): number {
    const known = this.byKey.get(key);
    if (known !== undefined) return known;
    const px = new Px(TILE, TILE);
    paint(px, mulberry32(hashString(key)));
    return this.register(key, px, terrain);
  }

  /** Enregistre une tuile déjà peinte (découpe d'un décor). */
  fromPx(key: string, px: Px, terrain?: string): number {
    const known = this.byKey.get(key);
    if (known !== undefined) return known;
    return this.register(key, px, terrain);
  }

  /** Tuile dédoublonnée par son contenu (composition de végétation, images d'animation). */
  fromContent(px: Px): number {
    const key = `c:${createHash('sha1').update(px.data).digest('base64')}`;
    return this.fromPx(key, px);
  }

  /**
   * Tuile animée : une tuile de base propre à la séquence (Tiled attache
   * l'animation à la tuile posée sur la carte), qui joue les images `frames`.
   */
  animated(frames: readonly number[], durations: readonly number[], first: Px): number {
    const key = `a:${frames.join(',')}:${durations.join(',')}`;
    const known = this.byKey.get(key);
    if (known !== undefined) return known;
    const copy = new Px(TILE, TILE);
    copy.copy(first, 0, 0, TILE, TILE, 0, 0);
    const gid = this.register(key, copy, undefined);
    this.animations.set(gid, { frames: [...frames], durations: [...durations] });
    return gid;
  }

  private register(key: string, px: Px, terrain: string | undefined): number {
    this.tiles.push({ px, terrain });
    const gid = this.tiles.length;
    this.byKey.set(key, gid);
    return gid;
  }

  get size(): number {
    return this.tiles.length;
  }

  build(): TilesetResult {
    const rows = Math.ceil(this.tiles.length / TILESET_COLUMNS);
    const atlas = new Px(TILESET_COLUMNS * TILE, rows * TILE);
    const terrains: { id: number; terrain: string }[] = [];
    this.tiles.forEach((tile, index) => {
      atlas.copy(tile.px, 0, 0, TILE, TILE, (index % TILESET_COLUMNS) * TILE, Math.floor(index / TILESET_COLUMNS) * TILE);
      if (tile.terrain !== undefined) terrains.push({ id: index, terrain: tile.terrain });
    });
    const animations = [...this.animations.entries()].map(([gid, a]) => ({ id: gid - 1, frames: a.frames.map((g) => g - 1), durations: a.durations }));
    return { atlas, tileCount: this.tiles.length, columns: TILESET_COLUMNS, terrains, animations };
  }
}
