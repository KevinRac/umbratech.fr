/**
 * Textures du combat tactique (jalon M4), toutes générées par code :
 * champ de bataille (images d'eau animée), feuilles de sprites des unités
 * (gabarit commun des personnages), curseur, cases colorées, marqueurs.
 */
import type Phaser from 'phaser';
import { BF_WATER_FRAMES, paintBattlefield } from './battlefield';
import { CHAR_H, CHAR_POSES, CHAR_W, CHAR_WALK_FRAMES, paintCharacterFrame, type CharPose } from './characterSprite';
import { PALETTE as P, mixColor } from './palette';
import { PixelCanvas } from './pixelCanvas';
import { unitLook } from './unitLooks';

export const BATTLE_TEX = {
  field: (key: string, frame: number): string => `battle:field:${key}:${frame}`,
  unit: (sprite: string): string => `battle:unit:${sprite}`,
  unitFrame: (pose: CharPose, frame: number): string => `${pose}_${frame}`,
  walk: (sprite: string, pose: CharPose): string => `battle:${sprite}:walk:${pose}`,
  idle: (sprite: string): string => `battle:${sprite}:idle`,
  cursor: (frame: number): string => `battle:cursor:${frame}`,
  tile: 'battle:tile',
  ring: 'battle:ring',
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

/** Feuille 4 × 3 images d'une apparence d'unité, et ses animations (marche, attente). */
export function ensureUnitSheet(scene: Phaser.Scene, sprite: string): void {
  const key = BATTLE_TEX.unit(sprite);
  if (!scene.textures.exists(key)) {
    const look = unitLook(sprite);
    const sheet = new PixelCanvas(CHAR_W * CHAR_WALK_FRAMES, CHAR_H * CHAR_POSES.length);
    CHAR_POSES.forEach((pose, row) => {
      for (let frame = 0; frame < CHAR_WALK_FRAMES; frame++) {
        paintCharacterFrame({ set: (x, y, color, alpha) => sheet.set(x, y, color, alpha ?? 255) }, frame * CHAR_W, row * CHAR_H, look, pose, frame);
      }
    });
    sheet.toTexture(scene, key);
    const texture = scene.textures.get(key);
    CHAR_POSES.forEach((pose, row) => {
      for (let frame = 0; frame < CHAR_WALK_FRAMES; frame++) texture.add(BATTLE_TEX.unitFrame(pose, frame), 0, frame * CHAR_W, row * CHAR_H, CHAR_W, CHAR_H);
    });
  }
  for (const pose of CHAR_POSES) {
    const anim = BATTLE_TEX.walk(sprite, pose);
    if (!scene.anims.exists(anim)) {
      scene.anims.create({
        key: anim,
        frames: Array.from({ length: CHAR_WALK_FRAMES }, (_, frame) => ({ key, frame: BATTLE_TEX.unitFrame(pose, frame) })),
        frameRate: 10,
        repeat: -1,
      });
    }
  }
  // Attente : le haut du corps respire (images 0 et 1 du gabarit, face).
  const idle = BATTLE_TEX.idle(sprite);
  if (!scene.anims.exists(idle)) {
    scene.anims.create({
      key: idle,
      frames: [
        { key, frame: BATTLE_TEX.unitFrame('down', 0), duration: 520 },
        { key, frame: BATTLE_TEX.unitFrame('down', 1), duration: 420 },
      ],
      repeat: -1,
    });
  }
}

/** Curseur, cases colorées, anneaux d'équipe, couronne du boss, étincelle. */
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

  // Anneau d'équipe sous les pieds (teinté bleu ou rouge).
  const ring = new PixelCanvas(14, 6);
  for (let y = 0; y < 6; y++) {
    for (let x = 0; x < 14; x++) {
      const dx = (x + 0.5 - 7) / 7;
      const dy = (y + 0.5 - 3) / 3;
      const d = dx * dx + dy * dy;
      if (d <= 1) ring.set(x, y, 0xffffff, d > 0.5 ? 230 : 90);
    }
  }
  ring.toTexture(scene, BATTLE_TEX.ring);

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
