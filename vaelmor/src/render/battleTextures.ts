/**
 * Textures du combat tactique (jalon M4), toutes générées par code :
 * champ de bataille (images d'eau animée), feuilles de sprites des unités
 * au gabarit commun (`unitSprites.ts`), curseur, cases colorées, marqueurs.
 */
import type Phaser from 'phaser';
import { BF_WATER_FRAMES, paintBattlefield } from './battlefield';
import { PALETTE as P, mixColor } from './palette';
import { PixelCanvas } from './pixelCanvas';
import { CHAR_POSES, type CharPose } from './characterSprite';
import { UNIT_H, UNIT_IDLE_FRAMES, UNIT_W, UNIT_WALK_FRAMES, paintUnitSprite, type UnitTeam } from './unitSprites';

export const BATTLE_TEX = {
  field: (key: string, frame: number): string => `battle:field:${key}:${frame}`,
  /** Unités : gabarit 16×28 équipé selon la classe, aux couleurs du camp (décision n°60). */
  ms: (sprite: string, team: UnitTeam): string => `battle:unit:${sprite}:${team}`,
  msFrame: (kind: 'idle' | CharPose, frame: number): string => `${kind}_${frame}`,
  msIdle: (sprite: string, team: UnitTeam): string => `battle:unit:${sprite}:${team}:idle`,
  msWalk: (sprite: string, team: UnitTeam, view: CharPose): string => `battle:unit:${sprite}:${team}:walk:${view}`,
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
 * Feuille d'une unité (décision n°60) : 2 images d'attente (respiration) puis
 * 4 images de marche par pose (face, dos, profil), et leurs animations.
 */
export function ensureMapSprite(scene: Phaser.Scene, sprite: string, team: UnitTeam): void {
  const key = BATTLE_TEX.ms(sprite, team);
  if (!scene.textures.exists(key)) {
    const rows: ['idle' | CharPose, number][] = [['idle', UNIT_IDLE_FRAMES], ...CHAR_POSES.map((v) => [v, UNIT_WALK_FRAMES] as [CharPose, number])];
    const sheet = new PixelCanvas(UNIT_W * UNIT_WALK_FRAMES, UNIT_H * rows.length);
    rows.forEach(([kind, count], row) => {
      for (let f = 0; f < count; f++) paintUnitSprite({ set: (x, y, color) => sheet.set(x, y, color) }, f * UNIT_W, row * UNIT_H, sprite, team, kind, f);
    });
    sheet.toTexture(scene, key);
    const texture = scene.textures.get(key);
    rows.forEach(([kind, count], row) => {
      for (let f = 0; f < count; f++) texture.add(BATTLE_TEX.msFrame(kind, f), 0, f * UNIT_W, row * UNIT_H, UNIT_W, UNIT_H);
    });
  }
  const idle = BATTLE_TEX.msIdle(sprite, team);
  if (!scene.anims.exists(idle)) {
    scene.anims.create({
      key: idle,
      frames: [
        { key, frame: BATTLE_TEX.msFrame('idle', 0), duration: 640 },
        { key, frame: BATTLE_TEX.msFrame('idle', 1), duration: 520 },
      ],
      repeat: -1,
    });
  }
  for (const view of CHAR_POSES) {
    const walk = BATTLE_TEX.msWalk(sprite, team, view);
    if (scene.anims.exists(walk)) continue;
    scene.anims.create({
      key: walk,
      frames: Array.from({ length: UNIT_WALK_FRAMES }, (_, f) => ({ key, frame: BATTLE_TEX.msFrame(view, f) })),
      frameRate: 8,
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
