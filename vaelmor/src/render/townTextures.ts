/**
 * Textures procédurales des villages (jalon M2) : feuilles d'images des PNJ,
 * portraits de dialogue (créés à la demande, un par expression) et pastilles de
 * quête (« ! » à prendre, « ? » à rendre) posées au-dessus des PNJ.
 */
import type Phaser from 'phaser';
import type { Expression, NpcDef } from '../data/townSchemas';
import { NPC_H, NPC_IDLE_FRAMES, NPC_POSES, NPC_W, lookFromDef, paintNpcFrame } from './npcSprites';
import { PALETTE as P } from './palette';
import { PixelCanvas } from './pixelCanvas';
import { PORTRAIT_SIZE, paintPortrait } from './portraits';

export const TOWN_TEX = {
  npc: (id: string): string => `npc:${id}`,
  npcFrame: (pose: string, frame: number): string => `${pose}_${frame}`,
  portrait: (id: string, expression: Expression): string => `portrait:${id}:${expression}`,
  markerAvailable: 'marker:available',
  markerReady: 'marker:ready',
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

function paintMarker(scene: Phaser.Scene, key: string, rows: readonly string[], fill: number, light: number): void {
  if (scene.textures.exists(key)) return;
  const w = (rows[0]?.length ?? 0) + 2;
  const h = rows.length + 2;
  const canvas = new PixelCanvas(w, h);
  rows.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      if (ch === '.') return;
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, 1], [-1, 1], [1, -1]] as const) {
        if (canvas.get(x + 1 + dx, y + 1 + dy) === null) canvas.set(x + 1 + dx, y + 1 + dy, MARK_OUTLINE);
      }
    }),
  );
  rows.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      if (ch === '#') canvas.set(x + 1, y + 1, fill);
      else if (ch === 'o') canvas.set(x + 1, y + 1, light);
    }),
  );
  canvas.toTexture(scene, key);
}

export function ensureMarkerTextures(scene: Phaser.Scene): void {
  paintMarker(scene, TOWN_TEX.markerAvailable, ['.oo.', '.##.', '.##.', '.##.', '.##.', '....', '.##.'], P.jauneBle, P.lumiereDoree);
  paintMarker(scene, TOWN_TEX.markerReady, ['.####.', '#o..##', '....##', '...##.', '..##..', '......', '..##..'], P.cyanEclat, P.ecume);
}
