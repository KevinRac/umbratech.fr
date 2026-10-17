/**
 * Textures du combat tactique (jalon M4), toutes générées par code :
 * champ de bataille (images d'eau animée), feuilles de sprites des unités
 * façon GBA (`mapSprites.ts`), curseur, cases colorées, marqueurs.
 */
import type Phaser from 'phaser';
import { BF_WATER_FRAMES, paintBattlefield } from './battlefield';
import { PALETTE as P, mixColor } from './palette';
import { PixelCanvas } from './pixelCanvas';
import { MS_H, MS_IDLE_FRAMES, MS_VIEWS, MS_W, MS_WALK_FRAMES, mapSpriteSpec, paintMapSprite, type MsTeam, type MsView } from './mapSprites';

export const BATTLE_TEX = {
  field: (key: string, frame: number): string => `battle:field:${key}:${frame}`,
  /** Sprites de carte façon GBA (décision n°58), aux couleurs du camp. */
  ms: (sprite: string, team: MsTeam): string => `battle:ms:${sprite}:${team}`,
  msFrame: (kind: 'idle' | MsView, frame: number): string => `${kind}_${frame}`,
  msIdle: (sprite: string, team: MsTeam): string => `battle:ms:${sprite}:${team}:idle`,
  msWalk: (sprite: string, team: MsTeam, view: MsView): string => `battle:ms:${sprite}:${team}:walk:${view}`,
  cursor: (frame: number): string => `battle:cursor:${frame}`,
  tile: 'battle:tile',
  crown: 'battle:crown',
  heroMark: 'battle:heroMark',
  spark: 'battle:spark',
  px: 'battle:px',
} as const;

/** Peint les images du champ de bataille d'une carte (une par image d'eau). */
export function ensureBattlefield(scene: Phaser.Scene, key: string, rows: readonly (readonly string[])[], seed: number): void {
  if (scene.textures.exists(BATTLE_TEX.field(key, 0))) return;
  for (let frame = 0; frame < BF_WATER_FRAMES; frame++) {
    const field = paintBattlefield(rows, frame, seed);
    const canvas = new PixelCanvas(field.width, field.height);
    for (let i = 0; i < field.pixels.length; i++) {
      const c = field.pixels[i] as number;
      if (c >= 0) canvas.set(i % field.width, Math.floor(i / field.width), c);
    }
    canvas.toTexture(scene, BATTLE_TEX.field(key, frame));
  }
}

/**
 * Feuille d'un sprite de carte (décision n°58) : 3 images d'attente puis
 * 4 images de marche par vue (face, dos, profil), et leurs animations.
 * L'attente « respire » comme sur GBA : 0 → 1 → 2, la deuxième plus brève.
 */
export function ensureMapSprite(scene: Phaser.Scene, sprite: string, team: MsTeam): void {
  const key = BATTLE_TEX.ms(sprite, team);
  if (!scene.textures.exists(key)) {
    const spec = mapSpriteSpec(sprite);
    const rows: ['idle' | MsView, number][] = [['idle', MS_IDLE_FRAMES], ...MS_VIEWS.map((v) => [v, MS_WALK_FRAMES] as [MsView, number])];
    const sheet = new PixelCanvas(MS_W * MS_WALK_FRAMES, MS_H * rows.length);
    rows.forEach(([kind, count], row) => {
      for (let f = 0; f < count; f++) paintMapSprite({ set: (x, y, color) => sheet.set(x, y, color) }, f * MS_W, row * MS_H, spec, team, kind, f);
    });
    sheet.toTexture(scene, key);
    const texture = scene.textures.get(key);
    rows.forEach(([kind, count], row) => {
      for (let f = 0; f < count; f++) texture.add(BATTLE_TEX.msFrame(kind, f), 0, f * MS_W, row * MS_H, MS_W, MS_H);
    });
  }
  const idle = BATTLE_TEX.msIdle(sprite, team);
  if (!scene.anims.exists(idle)) {
    scene.anims.create({
      key: idle,
      frames: [
        { key, frame: BATTLE_TEX.msFrame('idle', 0), duration: 420 },
        { key, frame: BATTLE_TEX.msFrame('idle', 1), duration: 160 },
        { key, frame: BATTLE_TEX.msFrame('idle', 2), duration: 420 },
        { key, frame: BATTLE_TEX.msFrame('idle', 1), duration: 160 },
      ],
      repeat: -1,
    });
  }
  for (const view of MS_VIEWS) {
    const walk = BATTLE_TEX.msWalk(sprite, team, view);
    if (scene.anims.exists(walk)) continue;
    scene.anims.create({
      key: walk,
      frames: Array.from({ length: MS_WALK_FRAMES }, (_, f) => ({ key, frame: BATTLE_TEX.msFrame(view, f) })),
      frameRate: 10,
      repeat: -1,
    });
  }
}

/** Curseur, cases colorées, couronne du boss, étoile du héros, étincelle. */
export function ensureBattleFxTextures(scene: Phaser.Scene): void {
  if (scene.textures.exists(BATTLE_TEX.tile)) return;

  // Curseur : quatre coins dorés qui « respirent » (2 images, 20 × 20).
  for (const frame of [0, 1]) {
    const size = 20;
    const c = new PixelCanvas(size, size);
    const inset = frame === 0 ? 0 : 1;
    const ink = mixColor(P.ombreProfonde, P.nuit, 0.4);
    const corner = (x: number, y: number, sx: number, sy: number): void => {
      for (let i = 0; i < 6; i++) {
        c.set(x + sx * i, y, P.lumiereDoree);
        c.set(x, y + sy * i, P.lumiereDoree);
        c.set(x + sx * i, y + sy, i < 5 ? P.ambre : ink);
        c.set(x + sx, y + sy * i, i < 5 ? P.ambre : ink);
      }
      c.set(x, y, 0xfff8ee);
    };
    corner(inset, inset, 1, 1);
    corner(size - 1 - inset, inset, -1, 1);
    corner(inset, size - 1 - inset, 1, -1);
    corner(size - 1 - inset, size - 1 - inset, -1, -1);
    c.toTexture(scene, BATTLE_TEX.cursor(frame));
  }

  // Case colorée (teintée par le moteur) : fond translucide, liseré plus franc, coins arrondis.
  const tile = new PixelCanvas(16, 16);
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const edge = x === 0 || y === 0 || x === 15 || y === 15;
      const corner = (x === 0 || x === 15) && (y === 0 || y === 15);
      if (corner) continue;
      const inner = x === 1 || y === 1 || x === 14 || y === 14;
      tile.set(x, y, 0xffffff, edge ? 200 : inner ? 120 : 90);
    }
  }
  tile.toTexture(scene, BATTLE_TEX.tile);

  // Couronne du boss (7 × 5).
  const crown = new PixelCanvas(7, 5);
  ['y.y.y.y', 'yyyyyyy', 'yryyyry', 'yyyyyyy', 'ddddddd'].forEach((row, y) =>
    [...row].forEach((ch, x) => {
      if (ch === 'y') crown.set(x, y, x < 3 ? P.lumiereDoree : P.jauneBle);
      if (ch === 'r') crown.set(x, y, P.rougeCendre);
      if (ch === 'd') crown.set(x, y, P.ambre);
    }),
  );
  crown.toTexture(scene, BATTLE_TEX.crown);

  // Marque du héros : petite étoile (5 × 5).
  const star = new PixelCanvas(5, 5);
  ['..y..', '.yyy.', 'yyyyy', '.yyy.', '.y.y.'].forEach((row, y) => [...row].forEach((ch, x) => ch === 'y' && star.set(x, y, x < 2 ? P.lumiereDoree : P.cyanEclat)));
  star.toTexture(scene, BATTLE_TEX.heroMark);

  // Étincelle d'impact (croix 5 × 5, blanche, teintée par l'émetteur).
  const spark = new PixelCanvas(5, 5);
  for (const [x, y, a] of [[2, 0, 160], [2, 1, 255], [0, 2, 160], [1, 2, 255], [2, 2, 255], [3, 2, 255], [4, 2, 160], [2, 3, 255], [2, 4, 160]] as const) spark.set(x, y, 0xffffff, a);
  spark.toTexture(scene, BATTLE_TEX.spark);

  const px = new PixelCanvas(1, 1);
  px.set(0, 0, 0xffffff);
  px.toTexture(scene, BATTLE_TEX.px);
}
