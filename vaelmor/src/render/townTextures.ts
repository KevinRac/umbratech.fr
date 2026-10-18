/**
 * Textures procédurales des villages (jalon M2) : feuilles d'images des PNJ,
 * portraits de dialogue (créés à la demande, un par expression) et pastilles de
 * quête (« ! » à prendre, « ? » à rendre) posées au-dessus des PNJ.
 */
import Phaser from 'phaser';
import type { Expression, NpcDef } from '../data/townSchemas';
import { NPC_H, NPC_IDLE_FRAMES, NPC_POSES, NPC_W, lookFromDef, paintNpcFrame } from './npcSprites';
import { PALETTE as P, mixColor } from './palette';
import { PixelCanvas, bayer } from './pixelCanvas';
import { paintPortraitHD } from './portraitPainter';

export const TOWN_TEX = {
  npc: (id: string): string => `npc:${id}`,
  npcFrame: (pose: string, frame: number): string => `${pose}_${frame}`,
  portrait: (id: string, expression: Expression): string => `portrait:${id}:${expression}`,
  markerAvailable: 'marker:available',
  markerReady: 'marker:ready',
  questGlow: 'marker:glow',
  questSpark: 'marker:spark',
} as const;

/** Une feuille 2 × 3 (images d'attente × poses) par PNJ. */
export function ensureNpcTexture(scene: Phaser.Scene, npc: NpcDef): string {
  const key = TOWN_TEX.npc(npc.id);
  if (scene.textures.exists(key)) return key;
  const look = lookFromDef(npc.look);
  const sheet = new PixelCanvas(NPC_W * NPC_IDLE_FRAMES, NPC_H * NPC_POSES.length);
  NPC_POSES.forEach((pose, row) => {
    for (let frame = 0; frame < NPC_IDLE_FRAMES; frame++) {
      paintNpcFrame({ set: (x, y, color, alpha) => sheet.set(x, y, color, alpha ?? 255) }, frame * NPC_W, row * NPC_H, look, pose, frame);
    }
  });
  sheet.toTexture(scene, key);
  const texture = scene.textures.get(key);
  NPC_POSES.forEach((pose, row) => {
    for (let frame = 0; frame < NPC_IDLE_FRAMES; frame++) texture.add(TOWN_TEX.npcFrame(pose, frame), 0, frame * NPC_W, row * NPC_H, NPC_W, NPC_H);
  });
  return key;
}

/** Côté des portraits peints, en pixels de texture (affichés à 108 × échelle de l'interface). */
export const PORTRAIT_TEX_SIZE = 216;

/** Portrait peint d'un PNJ avec une expression (créé une fois, filtré en douceur). */
export function ensurePortrait(scene: Phaser.Scene, npc: NpcDef, expression: Expression): string {
  const key = TOWN_TEX.portrait(npc.id, expression);
  if (scene.textures.exists(key)) return key;
  const canvas = document.createElement('canvas');
  canvas.width = PORTRAIT_TEX_SIZE;
  canvas.height = PORTRAIT_TEX_SIZE;
  const ctx = canvas.getContext('2d');
  if (ctx) paintPortraitHD(ctx, { id: npc.id, look: lookFromDef(npc.look), traits: npc.portrait, expression }, PORTRAIT_TEX_SIZE);
  scene.textures.addCanvas(key, canvas)?.setFilter(Phaser.Textures.FilterMode.LINEAR);
  return key;
}

/**
 * Emblèmes de quête en pixel art, au relief biseauté (lumière en haut à gauche) :
 * « ! » doré (quête à prendre) et « ? » argent-cyan (quête à rendre), avec une
 * gemme en guise de point et une aura translucide autour du contour.
 * Lettres : O contour, H reflet, L clair, M teinte, D ombre.
 */
const QUEST_MARK = [
  '..OOOOO..',
  '.OHLLMDO.',
  '.OHLMMDO.',
  '.OLLMMDO.',
  '.OLMMDDO.',
  '..OLMDO..',
  '..OLMDO..',
  '..OLMDO..',
  '...ODO...',
  '....O....',
  '.........',
  '...OOO...',
  '..OHLDO..',
  '..OLMDO..',
  '..OMDDO..',
  '...OOO...',
];

const READY_MARK = [
  '...OOOOO...',
  '..OHHLLMO..',
  '.OHLOOOMDO.',
  '.OLO...OMDO',
  '..O....OMDO',
  '......OLMDO',
  '.....OLMDO.',
  '....OLMDO..',
  '....OLDO...',
  '....OMDO...',
  '.....OO....',
  '...........',
  '....OOO....',
  '...OHLDO...',
  '...OLMDO...',
  '...OMDDO...',
  '....OOO....',
];

const SPARK = ['..L..', '..H..', 'LHHHL', '..H..', '..L..'];

function paintEmblem(scene: Phaser.Scene, key: string, rows: readonly string[], tones: Record<string, number>, aura: number): void {
  if (scene.textures.exists(key)) return;
  const w = (rows[0]?.length ?? 0) + 2;
  const h = rows.length + 2;
  const canvas = new PixelCanvas(w, h);
  const at = (x: number, y: number): string => rows[y]?.[x] ?? '.';
  for (let y = -1; y <= rows.length; y++) {
    for (let x = -1; x <= w - 2; x++) {
      if (at(x, y) !== '.') continue;
      let near = false;
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) if (at(x + dx, y + dy) === 'O') near = true;
      if (near) canvas.set(x + 1, y + 1, aura, 90);
    }
  }
  rows.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      const tone = tones[ch];
      if (tone !== undefined) canvas.set(x + 1, y + 1, tone);
    }),
  );
  canvas.toTexture(scene, key);
}

/** Halo doré tramé posé au sol sous un PNJ de quête. */
function paintGlow(scene: Phaser.Scene): void {
  if (scene.textures.exists(TOWN_TEX.questGlow)) return;
  const w = 44;
  const h = 20;
  const canvas = new PixelCanvas(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const d = Math.hypot((x - (w - 1) / 2) / (w / 2), (y - (h - 1) / 2) / (h / 2));
      const a = Math.max(0, 1 - d);
      if (a > bayer(x, y) * 0.9) canvas.set(x, y, P.lumiereDoree, Math.round(60 + 150 * a));
    }
  }
  canvas.toTexture(scene, TOWN_TEX.questGlow);
}

export function ensureMarkerTextures(scene: Phaser.Scene): void {
  const outline = mixColor(P.ombreProfonde, P.terreSombre, 0.35);
  paintEmblem(
    scene,
    TOWN_TEX.markerAvailable,
    QUEST_MARK,
    { O: outline, H: 0xfffbe8, L: 0xffe58a, M: 0xf2bf3a, D: 0xc77d22 },
    P.lumiereDoree,
  );
  paintEmblem(
    scene,
    TOWN_TEX.markerReady,
    READY_MARK,
    { O: mixColor(P.ombreProfonde, P.nuitBleue, 0.4), H: P.ecume, L: mixColor(P.cyanEclat, P.ecume, 0.5), M: P.cyanEclat, D: mixColor(P.cyanEclat, P.nuitBleue, 0.45) },
    P.cyanEclat,
  );
  paintEmblem(scene, TOWN_TEX.questSpark, SPARK, { H: P.ecume, L: P.lumiereDoree }, P.lumiereDoree);
  paintGlow(scene);
}
