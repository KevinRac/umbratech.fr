/**
 * Ambiance de zone (GDD §3.4) : grains qui flottent dans l'air (pollen,
 * feuilles, brume, braises, cendres). Les émetteurs sont posés sur l'écran
 * (scrollFactor 0) et recréés à chaque changement de zone.
 */
import Phaser from 'phaser';
import type { AmbienceKind } from '../data/schemas';
import { GAME_HEIGHT, GAME_WIDTH } from '../core/config';
import { PALETTE } from './palette';
import { WORLD_TEX } from './worldTextures';

interface Recipe {
  readonly texture: string;
  readonly config: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig;
}

const FULL_WIDTH = { min: 0, max: GAME_WIDTH } as const;

const RECIPES: Record<AmbienceKind, Recipe> = {
  pollen: {
    texture: WORLD_TEX.grain,
    config: {
      x: FULL_WIDTH,
      y: { min: 0, max: GAME_HEIGHT },
      speedX: { min: 2, max: 9 },
      speedY: { min: -7, max: -1 },
      lifespan: { min: 4000, max: 7000 },
      alpha: { values: [0, 0.8, 0.8, 0] },
      scale: 0.5,
      tint: [PALETTE.jauneBle, PALETTE.parchemin, PALETTE.vertDore],
      frequency: 260,
    },
  },
  feuilles: {
    texture: WORLD_TEX.grain,
    config: {
      x: { min: -40, max: GAME_WIDTH },
      y: -4,
      speedX: { min: 10, max: 24 },
      speedY: { min: 14, max: 26 },
      lifespan: { min: 9000, max: 13000 },
      alpha: { start: 0.9, end: 0.2 },
      tint: [PALETTE.ambre, PALETTE.vertDore, PALETTE.rougeCendre, PALETTE.vertProfond],
      frequency: 420,
    },
  },
  brume: {
    texture: WORLD_TEX.mist,
    config: {
      x: { min: -60, max: 0 },
      y: { min: 20, max: GAME_HEIGHT },
      speedX: { min: 6, max: 14 },
      speedY: 0,
      lifespan: { min: 38000, max: 52000 },
      alpha: { values: [0, 0.16, 0.16, 0] },
      scale: { min: 2, max: 3.5 },
      tint: [PALETTE.ecume, PALETTE.violetPale, PALETTE.bleuGris],
      frequency: 3200,
    },
  },
  braises: {
    texture: WORLD_TEX.grain,
    config: {
      x: FULL_WIDTH,
      y: GAME_HEIGHT + 2,
      speedX: { min: -8, max: 8 },
      speedY: { min: -26, max: -10 },
      lifespan: { min: 3500, max: 6500 },
      alpha: { start: 1, end: 0 },
      scale: 0.5,
      tint: [PALETTE.braise, PALETTE.orangeForge, PALETTE.rougeCendre],
      frequency: 220,
    },
  },
  cendres: {
    texture: WORLD_TEX.grain,
    config: {
      x: { min: 0, max: GAME_WIDTH + 80 },
      y: -4,
      speedX: { min: -18, max: -6 },
      speedY: { min: 6, max: 16 },
      lifespan: 20000,
      alpha: { start: 0.8, end: 0.2 },
      scale: 0.5,
      tint: [PALETTE.pierre, PALETTE.violetPale, PALETTE.metalClair],
      frequency: 240,
    },
  },
};

export function createAmbience(scene: Phaser.Scene, kind: AmbienceKind, depth: number): Phaser.GameObjects.Particles.ParticleEmitter {
  const recipe = RECIPES[kind];
  const emitter = scene.add.particles(0, 0, recipe.texture, recipe.config);
  emitter.setScrollFactor(0).setDepth(depth);
  // Régime établi dès l'arrivée : on avance l'émetteur pour ne pas voir l'air vide se remplir.
  emitter.fastForward(6000, 100);
  return emitter;
}
