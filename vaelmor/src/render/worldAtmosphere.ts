/**
 * Atmosphère HD-2D du monde ouvert (refonte graphique, étape 5 — décision n°47),
 * à la manière d'*Octopath Traveler* : la lumière et la profondeur font la beauté
 * de l'image, le pixel art reste net au centre.
 *
 * Filtres de la caméra (Phaser 4), dans l'ordre :
 * 1. étalonnage de la zone (`ColorMatrix`, n°43), fondu entre zones, jour → soir ;
 * 2. bloom doux : `ParallelFilters` (seuil + flou, ajouté à l'image) — Phaser 4
 *    n'a pas de filtre Bloom, c'est la recette de `Phaser.Actions.AddEffectBloom` ;
 * 3. flou de profondeur (tilt-shift) : `ParallelFilters` (flou + masque en
 *    bandes haut/bas, posé sur l'image nette) ; bien moins coûteux que le
 *    filtre `TiltShift` intégré (100 échantillons par pixel) ;
 * 4. vignettage (externe).
 *
 * Objets additifs dans le monde : rayons de lumière obliques, poussière qui
 * flotte dans les rayons, halos scintillants sur les lanternes, feux, runes et
 * (le soir) fenêtres. Le réglage « Qualité » choisit ce qui s'applique (`effectsFor`).
 */
import Phaser from 'phaser';
import type { BalanceConfig, ZoneDef } from '../data/schemas';
import type { MapObject } from '../data/worldMap';
import { effectsFor, gradeMatrixAt, type EffectPlan, flicker, haloStrength, parseLightKind, tiltMaskAlpha, type LightKind, type Quality } from './atmosphere';
import { lerpMatrix } from './grade';
import { PALETTE } from './palette';

type Visuals = BalanceConfig['visuals'];

export const ATMOSPHERE_DEPTH = { halos: 10.6, rays: 10.8, dust: 10.9 } as const;

const TEX = { tiltMask: 'world:tiltMask', halo: 'world:halo', ray: 'world:ray', mote: 'world:mote' } as const;

const HALO_COLOR: Readonly<Record<LightKind, number>> = {
  lamp: PALETTE.lumiereDoree,
  fire: PALETTE.orangeForge,
  window: PALETTE.braise,
  rune: PALETTE.cyanEclat,
};

/** Lumière de zone en cours de fondu. */
interface ZoneLight {
  rays: number;
  dust: number;
  bloom: number;
  tint: number;
}

interface Halo {
  readonly image: Phaser.GameObjects.Image;
  readonly kind: LightKind;
  readonly seed: number;
  readonly x: number;
  readonly y: number;
}

interface Ray {
  readonly image: Phaser.GameObjects.Image;
  readonly u: number;
  readonly drift: number;
  readonly width: number;
}

/** Crée une texture lissée (filtrage linéaire) à partir d'une fonction d'opacité. */
function softTexture(scene: Phaser.Scene, key: string, w: number, h: number, alpha: (x: number, y: number) => number): void {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const img = ctx.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      img.data[i] = 255;
      img.data[i + 1] = 255;
      img.data[i + 2] = 255;
      img.data[i + 3] = Math.round(Math.max(0, Math.min(1, alpha(x, y))) * 255);
    }
  }
  ctx.putImageData(img, 0, 0);
  scene.textures.addCanvas(key, canvas)?.setFilter(Phaser.Textures.FilterMode.LINEAR);
}

const hexToColor = (hex: string): number => Number.parseInt(hex.slice(1), 16);

export class WorldAtmosphere {
  private readonly camera: Phaser.Cameras.Scene2D.Camera;
  private readonly grade: Phaser.Filters.ColorMatrix;
  private readonly bloom: Phaser.Filters.ParallelFilters;
  private readonly tilt: Phaser.Filters.ParallelFilters;
  private readonly vignette: Phaser.Filters.Vignette;
  private readonly halos: Halo[] = [];
  private readonly rays: Ray[] = [];
  private readonly dust: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly dustTimer: Phaser.Time.TimerEvent;

  private quality: Quality = 'high';
  private zone: ZoneDef | null = null;
  private evening: number;
  private gradeNow: number[] | null = null;
  private gradeTween: Phaser.Tweens.Tween | null = null;
  private lightTween: Phaser.Tweens.Tween | null = null;
  private eveningTween: Phaser.Tweens.Tween | null = null;
  private readonly light: ZoneLight = { rays: 0, dust: 0, bloom: 0, tint: PALETTE.lumiereChaude };
  private clock = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly visuals: Visuals,
    lights: readonly MapObject[],
  ) {
    this.camera = scene.cameras.main;
    this.evening = visuals.evening;
    this.buildTextures();

    const v = visuals;
    this.grade = this.camera.filters.internal.addColorMatrix();
    this.bloom = this.camera.filters.internal.addParallelFilters();
    this.bloom.top.addThreshold(v.bloom.threshold, 1);
    this.bloom.top.addBlur(0, v.bloom.blur, v.bloom.blur, 1, 0xffffff, 2);
    this.bloom.blend.blendMode = Phaser.BlendModes.ADD;
    this.bloom.blend.amount = 0;
    this.tilt = this.camera.filters.internal.addParallelFilters();
    this.tilt.top.addBlur(1, v.tiltShift.blur, v.tiltShift.blur, 1, 0xffffff, 2);
    this.tilt.top.addMask(TEX.tiltMask);
    this.tilt.blend.blendMode = Phaser.BlendModes.NORMAL;
    this.tilt.blend.amount = 1;
    this.vignette = this.camera.filters.external.addVignette(0.5, 0.5, v.vignette.radius, v.vignette.strength);

    for (const [i, o] of lights.entries()) {
      const kind = parseLightKind(o.props['kind']);
      if (!kind) continue;
      const k = v.halos[kind];
      const image = scene.add
        .image(o.x, o.y, TEX.halo)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setTint(HALO_COLOR[kind])
        .setScale((k.radius * 2) / 64)
        .setDepth(ATMOSPHERE_DEPTH.halos)
        .setVisible(false);
      this.halos.push({ image, kind, seed: (i * 7919) % 1000, x: o.x, y: o.y });
    }

    for (let i = 0; i < v.rays.count; i++) {
      const image = scene.add.image(0, 0, TEX.ray).setBlendMode(Phaser.BlendModes.ADD).setDepth(ATMOSPHERE_DEPTH.rays).setRotation(-0.5).setVisible(false);
      this.rays.push({ image, u: (i + 0.5) / v.rays.count + (((i * 37) % 10) - 5) / 60, drift: 2 + ((i * 13) % 5), width: 0.7 + ((i * 29) % 7) / 8 });
    }

    this.dust = scene.add.particles(0, 0, TEX.mote, {
      emitting: false,
      lifespan: { min: 3200, max: 5600 },
      speedX: { min: -2, max: 6 },
      speedY: { min: -5, max: 2 },
      scale: { min: 0.5, max: 1.1 },
      alpha: { values: [0, v.dust.alpha, v.dust.alpha * 0.8, 0] },
      blendMode: Phaser.BlendModes.ADD,
    });
    this.dust.setDepth(ATMOSPHERE_DEPTH.dust);
    this.dustTimer = scene.time.addEvent({ delay: v.dust.periodMs, loop: true, callback: () => this.emitDust() });
  }

  /* ---------- Réglages ---------- */

  /** `without` : effets coupés en plus (outil de mesure : `?debug&fxoff=bloom,tiltShift`). */
  setQuality(quality: Quality, without: readonly string[] = []): void {
    this.quality = quality;
    this.without = without;
    const plan = this.plan();
    this.grade.active = plan.grade;
    this.vignette.active = plan.vignette;
    this.bloom.active = plan.bloom;
    this.tilt.active = plan.tiltShift;
    for (const ray of this.rays) ray.image.setVisible(plan.rays);
    if (!plan.halos) for (const halo of this.halos) halo.image.setVisible(false);
    if (!plan.dust) this.dust.killAll();
  }

  private without: readonly string[] = [];

  private plan(): EffectPlan {
    const plan = { ...effectsFor(this.quality) };
    for (const key of Object.keys(plan) as (keyof EffectPlan)[]) if (this.without.includes(key)) plan[key] = false;
    return plan;
  }

  getQuality(): Quality {
    return this.quality;
  }

  /** Entrée dans une zone : fondu de l'étalonnage et de la lumière (instantané à l'arrivée). */
  setZone(zone: ZoneDef): void {
    const first = this.zone === null;
    this.zone = zone;
    this.applyGrade(first ? 0 : 1400);
    const target: ZoneLight = { ...zone.light, tint: hexToColor(zone.grade.light) };
    this.lightTween?.stop();
    this.light.tint = target.tint;
    if (first) {
      Object.assign(this.light, target);
    } else {
      this.lightTween = this.scene.tweens.add({ targets: this.light, rays: target.rays, dust: target.dust, bloom: target.bloom, duration: 1400, ease: 'Sine.easeInOut' });
    }
  }

  /** Moment de la journée : 0 jour, 1 soir (préparé pour le cycle jour/soir, décision n°47). */
  setEvening(evening: number, durationMs = 0): void {
    this.eveningTween?.stop();
    if (durationMs <= 0) {
      this.evening = evening;
      this.applyGrade(0);
      return;
    }
    const state = { e: this.evening };
    this.eveningTween = this.scene.tweens.add({
      targets: state,
      e: evening,
      duration: durationMs,
      ease: 'Sine.easeInOut',
      onUpdate: () => {
        this.evening = state.e;
        this.applyGrade(0);
      },
    });
  }

  getEvening(): number {
    return this.evening;
  }

  private applyGrade(durationMs: number): void {
    if (!this.zone) return;
    const target = gradeMatrixAt(this.zone.grade, this.evening, this.visuals.eveningDarkness);
    const from = this.gradeNow;
    this.gradeTween?.stop();
    if (!from || durationMs <= 0) {
      this.gradeNow = target;
      this.grade.colorMatrix.set(target);
      return;
    }
    const state = { t: 0 };
    this.gradeTween = this.scene.tweens.add({
      targets: state,
      t: 1,
      duration: durationMs,
      ease: 'Sine.easeInOut',
      onUpdate: () => {
        this.gradeNow = lerpMatrix(from, target, state.t);
        this.grade.colorMatrix.set(this.gradeNow);
      },
    });
  }

  /* ---------- Image par image ---------- */

  update(dt: number): void {
    this.clock += dt;
    const plan = this.plan();
    const v = this.visuals;
    // Le soir, le bloom s'intensifie un peu (lumières plus présentes).
    this.bloom.blend.amount = v.bloom.amount * this.light.bloom * (1 + 0.8 * this.evening);
    const view = this.camera.worldView;
    if (plan.rays) this.updateRays(view);
    if (plan.halos) this.updateHalos(view);
  }

  private updateRays(view: Phaser.Geom.Rectangle): void {
    const v = this.visuals;
    const margin = 120;
    const span = view.width + margin * 2;
    // Les rayons faiblissent le soir (soleil bas).
    const strength = v.rays.alpha * this.light.rays * (1 - 0.6 * this.evening);
    for (const [i, ray] of this.rays.entries()) {
      const sx = ((((ray.u * span + this.clock * ray.drift - this.camera.scrollX * 0.15) % span) + span) % span) - margin;
      const pulse = 0.6 + 0.4 * Math.sin(this.clock * 0.35 + i * 1.7);
      ray.image
        .setPosition(Math.round(view.x + sx), Math.round(view.y + view.height * 0.42))
        .setScale(ray.width, (view.height * 1.7) / 256)
        .setTint(this.light.tint)
        .setAlpha(strength * pulse)
        .setVisible(strength > 0.005);
    }
  }

  private updateHalos(view: Phaser.Geom.Rectangle): void {
    const v = this.visuals.halos;
    const margin = 40;
    for (const halo of this.halos) {
      const inView = halo.x > view.x - margin && halo.x < view.right + margin && halo.y > view.y - margin && halo.y < view.bottom + margin;
      const strength = haloStrength(halo.kind, this.evening, v.dayFactor);
      if (!inView || strength <= 0.01) {
        if (halo.image.visible) halo.image.setVisible(false);
        continue;
      }
      const f = flicker(this.clock, halo.seed, halo.kind);
      halo.image.setVisible(true).setAlpha(Math.min(1, v[halo.kind].alpha * strength * f * (1 + this.visuals.eveningDarkness * 1.6 * this.evening)));
      if (halo.kind === 'fire') halo.image.setScale(((v.fire.radius * 2) / 64) * (0.94 + 0.08 * f));
    }
  }

  /** Une poussière naît dans un rayon visible, au hasard le long de son axe. */
  private emitDust(): void {
    if (!this.plan().dust || this.rays.length === 0) return;
    if (Math.random() > this.light.dust * (1 - 0.5 * this.evening)) return;
    const ray = this.rays[Math.floor(Math.random() * this.rays.length)];
    if (!ray || !ray.image.visible) return;
    const len = (Math.random() - 0.5) * this.camera.worldView.height * 1.2;
    const side = (Math.random() - 0.5) * 18 * ray.width;
    const rot = ray.image.rotation;
    const x = ray.image.x - Math.sin(rot) * len + Math.cos(rot) * side;
    const y = ray.image.y + Math.cos(rot) * len + Math.sin(rot) * side;
    this.dust.setParticleTint(this.light.tint);
    this.dust.emitParticleAt(x, y);
  }

  /* ---------- Textures ---------- */

  private buildTextures(): void {
    const t = this.visuals.tiltShift;
    softTexture(this.scene, TEX.tiltMask, 4, 256, (_x, y) => tiltMaskAlpha((y + 0.5) / 256, t.focus, t.fade));
    softTexture(this.scene, TEX.halo, 64, 64, (x, y) => {
      const d = Math.hypot(x + 0.5 - 32, y + 0.5 - 32) / 32;
      return d >= 1 ? 0 : (1 - d) ** 2;
    });
    softTexture(this.scene, TEX.ray, 48, 256, (x, y) => {
      const across = Math.exp(-(((x + 0.5 - 24) / 11) ** 2));
      const along = Math.sin(((y + 0.5) / 256) * Math.PI) ** 1.5;
      return across * along;
    });
    softTexture(this.scene, TEX.mote, 6, 6, (x, y) => {
      const d = Math.hypot(x + 0.5 - 3, y + 0.5 - 3) / 3;
      return d >= 1 ? 0 : 1 - d * d;
    });
  }

  destroy(): void {
    this.dustTimer.remove();
    this.gradeTween?.stop();
    this.lightTween?.stop();
    this.eveningTween?.stop();
  }
}
