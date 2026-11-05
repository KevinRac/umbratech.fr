/**
 * Secousses et flashs de caméra qui respectent « Effets réduits » (GDD §13.8,
 * n°221, étendu au monde, aux menus et à la carte de combat par n°244) : tout
 * `camera.shake` / `camera.flash` du jeu passe par ici, avec les mêmes
 * facteurs que l'écran rapproché (secousses ÷ 3, flashs à 30 %).
 */
import type Phaser from 'phaser';
import { loadReducedEffects } from '../core/settings';
import { flashStrength, shakeIntensity } from '../logic/settings/accessibility';

/** Secousse de la caméra (intensité Phaser : fraction de la taille de la vue). */
export function shakeCamera(camera: Phaser.Cameras.Scene2D.Camera, ms: number, intensity: number, reduced = loadReducedEffects()): void {
  camera.shake(ms, shakeIntensity(intensity, reduced));
}

/** Flash de la caméra, atténué en « Effets réduits ». */
export function flashCamera(camera: Phaser.Cameras.Scene2D.Camera, ms: number, red: number, green: number, blue: number, reduced = loadReducedEffects()): void {
  camera.flashEffect.alpha = flashStrength(reduced);
  camera.flash(ms, red, green, blue);
}
