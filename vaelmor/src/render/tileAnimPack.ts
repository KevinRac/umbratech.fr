/**
 * Données des tuiles animées pour les couches GPU de Phaser (décision n°45),
 * calcul pur (sans Phaser) testé dans `tests/tileAnimPack.test.ts`.
 *
 * Disposition attendue par le shader `TilemapGPULayer.frag` : une suite de
 * texels de 32 bits, deux par entrée. D'abord une entrée par animation
 * (durée totale, texel de sa première image), puis une entrée par image
 * (durée, index de tuile). La couche donne au shader le TEXEL de l'en-tête.
 *
 * Phaser 4.2.1 se trompe à deux endroits (voir `tileAnimations.ts`) ; ce module
 * produit la disposition correcte.
 */

export interface TileAnimFrame {
  readonly tileid: number;
  readonly duration: number;
}

export interface TileAnimPack {
  readonly data: Uint32Array;
  readonly width: number;
  readonly height: number;
  /** Index de tuile (0-based dans le tileset) → texel de l'en-tête de son animation. */
  readonly indexMap: Map<number, number>;
  readonly maxLength: number;
}

export const ANIM_TEXTURE_WIDTH = 4096;

export function packTileAnimations(tileData: Readonly<Record<number, { readonly animation?: readonly TileAnimFrame[] } | undefined>>, total: number): TileAnimPack {
  const headers: [number, number][] = [];
  const frames: [number, number][] = [];
  const indexMap = new Map<number, number>();
  let maxLength = 0;
  for (let i = 0; i < total; i++) {
    const anim = tileData[i]?.animation;
    if (!anim || anim.length === 0) continue;
    indexMap.set(i, headers.length * 2);
    headers.push([anim.reduce((s, f) => s + f.duration, 0), frames.length]);
    for (const f of anim) frames.push([f.duration, f.tileid]);
    maxLength = Math.max(maxLength, anim.length);
  }
  const texels = (headers.length + frames.length) * 2;
  const width = Math.max(1, Math.min(texels, ANIM_TEXTURE_WIDTH));
  const height = Math.max(1, Math.ceil(texels / ANIM_TEXTURE_WIDTH));
  const data = new Uint32Array(width * height);
  let o = 0;
  for (const [duration, first] of headers) {
    data[o++] = duration;
    data[o++] = (first + headers.length) * 2;
  }
  for (const [duration, tileid] of frames) {
    data[o++] = duration;
    data[o++] = tileid;
  }
  return { data, width, height, indexMap, maxLength };
}

/** Lecture telle que la fait le shader (sert aux tests) : index de tuile affiché au temps `ms`. */
export function shaderFrameAt(pack: TileAnimPack, headerTexel: number, ms: number): number {
  const read = (texel: number): number => pack.data[texel] as number;
  const duration = read(headerTexel);
  let index = read(headerTexel + 1);
  const t = ms % duration;
  let acc = 0;
  for (let i = 0; i < pack.maxLength; i++) {
    acc += read(index);
    if (t <= acc) break;
    index += 2;
  }
  return read(index + 1);
}
