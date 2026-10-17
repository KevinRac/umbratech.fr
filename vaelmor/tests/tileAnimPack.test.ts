import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ANIM_TEXTURE_WIDTH, packTileAnimations, shaderFrameAt, type TileAnimFrame } from '../src/render/tileAnimPack';

interface TiledTileset {
  tilecount: number;
  tiles?: { id: number; animation?: TileAnimFrame[] }[];
}

const map = JSON.parse(readFileSync(resolve(import.meta.dirname, '..', 'assets/maps/world.json'), 'utf8')) as { tilesets: TiledTileset[] };
const tileset = map.tilesets[0] as TiledTileset;
const tileData: Record<number, { animation?: TileAnimFrame[] }> = {};
for (const t of tileset.tiles ?? []) if (t.animation) tileData[t.id] = { animation: t.animation };

describe('tuiles animées (couches GPU)', () => {
  const pack = packTileAnimations(tileData, tileset.tilecount);

  it('la carte contient des animations (vent, moulin) sur plusieurs lignes de texture', () => {
    expect(pack.indexMap.size).toBeGreaterThan(100);
    expect(pack.height).toBeGreaterThan(1); // cas qui révélait le défaut de Phaser 4.2.1
    expect(pack.width).toBe(ANIM_TEXTURE_WIDTH);
  });

  it('le shader retrouve, pour chaque tuile animée et à tout instant, la bonne image', () => {
    for (const [tile, header] of pack.indexMap) {
      const anim = tileData[tile]?.animation as TileAnimFrame[];
      let start = 0;
      for (const frame of anim) {
        expect(shaderFrameAt(pack, header, start + 1)).toBe(frame.tileid);
        expect(shaderFrameAt(pack, header, start + frame.duration - 1)).toBe(frame.tileid);
        start += frame.duration;
      }
    }
  });

  it('les images référencées existent dans le tileset', () => {
    for (const t of tileset.tiles ?? []) for (const f of t.animation ?? []) expect(f.tileid).toBeLessThan(tileset.tilecount);
  });
});
