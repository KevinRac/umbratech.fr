/**
 * Textures procédurales des villages (jalon M2) : feuilles d'images des PNJ,
 * portraits de dialogue (créés à la demande, un par expression) et pastilles de
 * quête (« ! » à prendre, « ? » à rendre) posées au-dessus des PNJ.
 */
import type Phaser from 'phaser';
import type { Expression, NpcDef } from '../data/townSchemas';
import { NPC_H, NPC_IDLE_FRAMES, NPC_POSES, NPC_W, lookFromDef, paintNpcFrame } from './npcSprites';
import { PALETTE as P, mixColor } from './palette';
import { PixelCanvas, bayer } from './pixelCanvas';
import { PORTRAIT_SIZE, paintPortrait } from './portraits';

export const TOWN_TEX = {
  npc: (id: string): string => `npc:${id}`,
  npcFrame: (pose: string, frame: number): string => `${pose}_${frame}`,
  portrait: (id: string, expression: Expression): string => `portrait:${id}:${expression}`,
  markerAvailable: 'marker:available',
  markerReady: 'marker:ready',
  questGlow: 'marker:glow',
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

/** Portrait d'un PNJ avec une expression (créé une fois). */
export function ensurePortrait(scene: Phaser.Scene, npc: NpcDef, expression: Expression): string {
  const key = TOWN_TEX.portrait(npc.id, expression);
  if (scene.textures.exists(key)) return key;
  const canvas = new PixelCanvas(PORTRAIT_SIZE, PORTRAIT_SIZE);
  paintPortrait({ set: (x, y, color, alpha) => canvas.set(x, y, color, alpha ?? 255) }, lookFromDef(npc.look), expression, P.ardoise);
  canvas.toTexture(scene, key);
  return key;
}

const MARK_OUTLINE = P.ombreProfonde;

/** Pastille ronde (liseré clair, fond plein) portant un glyphe sombre : se lit de loin. */
function paintBadge(scene: Phaser.Scene, key: string, glyph: readonly string[], fill: number, rim: number): void {
  if (scene.textures.exists(key)) return;
  const N = 13;
  const canvas = new PixelCanvas(N, N + 3);
  const c = (N - 1) / 2;
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const d = Math.hypot(x - c, y - c);
      if (d <= c + 0.3) canvas.set(x, y, d > c - 1 ? MARK_OUTLINE : d > c - 2 ? rim : y < c - 1 && x < c ? mixColor(fill, P.ecume, 0.35) : fill);
    }
  }
  // Pointe vers le PNJ.
  for (const [x, y] of [[5, N], [6, N], [7, N], [6, N + 1]] as const) canvas.set(x, y, MARK_OUTLINE);
  canvas.set(6, N - 1, rim);
  const ox = Math.floor((N - (glyph[0]?.length ?? 0)) / 2);
  glyph.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === '#') canvas.set(ox + x, 2 + y, MARK_OUTLINE); }));
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
  paintBadge(scene, TOWN_TEX.markerAvailable, ['..#..', '..#..', '..#..', '..#..', '.....', '..#..'].map((r) => r), P.jauneBle, P.lumiereDoree);
  paintBadge(scene, TOWN_TEX.markerReady, ['.###.', '#...#', '....#', '...#.', '..#..', '.....', '..#..'], P.cyanEclat, P.ecume);
  paintGlow(scene);
}
