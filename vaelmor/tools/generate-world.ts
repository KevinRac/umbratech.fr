/**
 * `npm run generate-world` — régénère la carte de l'île.
 *
 * Écrit `assets/maps/world.json` (export Tiled) et `assets/tilesets/world_tiles.png`.
 * Option `--preview <dossier>` : écrit aussi des aperçus PNG de la carte entière.
 * La génération est déterministe : relancer la commande ne change rien.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { ZoneDef } from '../src/data/schemas';
import { WATER_TILE, paintWaterFrame } from '../src/render/waterTile';
import { generateWorld } from './world/generate';
import { MAP_H, MAP_W } from './world/layout';
import { encodePng } from './world/png';
import { Px } from './world/px';
import { TILE, TILESET_COLUMNS } from './world/tileset';

const root = resolve(import.meta.dirname, '..');

function composite(world: ReturnType<typeof generateWorld>): Px {
  const out = new Px(MAP_W * TILE, MAP_H * TILE);
  const water = new Px(WATER_TILE, WATER_TILE);
  paintWaterFrame({ set: (x, y, color, alpha) => water.set(x, y, color, alpha ?? 255) }, 0);
  for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) out.copy(water, 0, 0, TILE, TILE, x * TILE, y * TILE);
  const draw = (layer: Uint16Array): void => {
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        const gid = layer[y * MAP_W + x] as number;
        if (gid === 0) continue;
        const i = gid - 1;
        out.blit(world.atlas, (i % TILESET_COLUMNS) * TILE, Math.floor(i / TILESET_COLUMNS) * TILE, TILE, TILE, x * TILE, y * TILE);
      }
    }
  };
  draw(world.layers.ground);
  draw(world.layers.decor);
  draw(world.layers.canopy);
  return out;
}

function overlay(base: Px, world: ReturnType<typeof generateWorld>): Px {
  const out = new Px(base.width, base.height);
  out.copy(base, 0, 0, base.width, base.height, 0, 0);
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      const v = world.layers.collision[y * MAP_W + x] as number;
      const color = v === 1 ? 0xff2020 : v === 3 ? 0xffd020 : v === 4 ? 0xb040ff : 0;
      if (color) out.rect(x * TILE, y * TILE, TILE, TILE, color, v === 4 ? 170 : 90);
    }
  }
  return out;
}

function crop(src: Px, x: number, y: number, w: number, h: number): Px {
  const out = new Px(w, h);
  out.copy(src, x, y, w, h, 0, 0);
  return out;
}

function downscale(src: Px, factor: number): Px {
  const out = new Px(Math.floor(src.width / factor), Math.floor(src.height / factor));
  for (let y = 0; y < out.height; y++) {
    for (let x = 0; x < out.width; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      for (let j = 0; j < factor; j++) {
        for (let i = 0; i < factor; i++) {
          const c = src.colorAt(x * factor + i, y * factor + j);
          if (c < 0) continue;
          r += (c >> 16) & 0xff;
          g += (c >> 8) & 0xff;
          b += c & 0xff;
        }
      }
      const n = factor * factor;
      out.set(x, y, (Math.round(r / n) << 16) | (Math.round(g / n) << 8) | Math.round(b / n));
    }
  }
  return out;
}

async function main(): Promise<void> {
  const zones = (JSON.parse(await readFile(resolve(root, 'data', 'zones.json'), 'utf8')) as { zones: ZoneDef[] }).zones;
  const world = generateWorld(zones);

  await mkdir(resolve(root, 'assets', 'maps'), { recursive: true });
  await mkdir(resolve(root, 'assets', 'tilesets'), { recursive: true });
  await writeFile(resolve(root, 'assets', 'maps', 'world.json'), `${JSON.stringify(world.tiled)}\n`);
  await writeFile(resolve(root, 'assets', 'tilesets', 'world_tiles.png'), encodePng(world.atlas));
  console.log('✓ Carte générée :', JSON.stringify(world.stats));

  const previewIndex = process.argv.indexOf('--preview');
  if (previewIndex >= 0) {
    const dir = resolve(process.argv[previewIndex + 1] ?? '.');
    await mkdir(dir, { recursive: true });
    const full = composite(world);
    await writeFile(resolve(dir, 'world_half.png'), encodePng(downscale(full, 2)));
    await writeFile(resolve(dir, 'world_collision_half.png'), encodePng(downscale(overlay(full, world), 2)));
    // Détails à l'échelle 1:1 (480×270 = un écran de jeu) autour de quelques lieux.
    const spots: Record<string, [number, number]> = { haut_gue: [72, 80], valcendre: [122, 52], port_brume: [108, 100], citadelle: [20, 100], ronceval: [30, 46], pierre_haute: [62, 22] };
    for (const [name, [cx, cy]] of Object.entries(spots)) {
      const x = Math.max(0, Math.min(MAP_W * TILE - 640, cx * TILE - 320));
      const y = Math.max(0, Math.min(MAP_H * TILE - 400, cy * TILE - 200));
      await writeFile(resolve(dir, `detail_${name}.png`), encodePng(crop(full, x, y, 640, 400)));
    }
    console.log('✓ Aperçus écrits dans', dir);
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
