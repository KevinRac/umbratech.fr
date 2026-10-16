/**
 * Ambiance de zone (GDD §3.4) : grains qui flottent dans l'air (pollen,
 * feuilles, brume, braises, cendres). Les émetteurs sont posés sur l'écran
 * (scrollFactor 0) et recréés à chaque changement de zone.
 */
import Phaser from 'phaser';
import type { AmbienceKind } from '../data/schemas';
import { PALETTE } from './palette';
import { WORLD_TEX } from './worldTextures';

interface Recipe {
  readonly texture: string;
  readonly config: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig;
}

const FULL_WIDTH = { min: 0, max: 320 } as const;

const RECIPES: Record<AmbienceKind, Recipe> = {
  pollen: {
    texture: WORLD_TEX.grain,
    config: {
      x: FULL_WIDTH,
      y: { min: 0, max: 180 },
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
      x: { min: -40, max: 320 },
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
      y: { min: 20, max: 180 },
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
      y: 182,
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
      x: { min: 0, max: 400 },
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

export interface AmbienceView {
  /** Taille du canevas en pixels d'écran. */
  readonly width: number;
  readonly height: number;
  /** Pixels d'écran par pixel d'art (les grains et leur vitesse suivent). */
  readonly zoom: number;
}

const SCALED_KEYS = ['x', 'y', 'speedX', 'speedY'] as const;

/** Les recettes sont écrites pour un écran de 320×180 pixels d'art : on les adapte au canevas réel. */
function scaledConfig(config: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig, view: AmbienceView): Phaser.Types.GameObjects.Particles.ParticleEmitterConfig {
  const out: Record<string, unknown> = { ...config };
  const grow = (value: unknown, factor: number): unknown => {
    if (typeof value === 'number') return value * factor;
    if (value && typeof value === 'object' && 'min' in value && 'max' in value) {
      const range = value as { min: number; max: number };
      return { min: range.min * factor, max: range.max * factor };
    }
    return value;
  };
  const fx = view.width / 320;
  const fy = view.height / 180;
  if ('x' in out) out['x'] = grow(out['x'], fx);
  if ('y' in out) out['y'] = grow(out['y'], fy);
  for (const key of SCALED_KEYS) if (key === 'speedX' || key === 'speedY') if (key in out) out[key] = grow(out[key], view.zoom);
  out['scale'] = grow(config.scale ?? 1, view.zoom);
  return out as Phaser.Types.GameObjects.Particles.ParticleEmitterConfig;
}

export function createAmbience(scene: Phaser.Scene, kind: AmbienceKind, depth: number, view: AmbienceView): Phaser.GameObjects.Particles.ParticleEmitter {
  const recipe = RECIPES[kind];
  const emitter = scene.add.particles(0, 0, recipe.texture, scaledConfig(recipe.config, view));
  emitter.setScrollFactor(0).setDepth(depth);
  // Régime établi dès l'arrivée : on avance l'émetteur pour ne pas voir l'air vide se remplir.
  emitter.fastForward(6000, 100);
  return emitter;
}
