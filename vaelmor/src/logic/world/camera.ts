/**
 * Caméra du monde ouvert (GDD §4.3) : suit le héros avec une zone morte et un
 * lissage, limitée aux bords de la carte.
 *
 * Le lissage est indépendant de la fréquence d'affichage : `lerp` est la part
 * de l'écart rattrapée par image *à 60 Hz*, convertie selon la durée réelle.
 */
export interface Vec2 {
  x: number;
  y: number;
}

export interface Size {
  readonly width: number;
  readonly height: number;
}

export interface CameraConfig {
  /** Taille de l'écran logique (320×180 dans le monde). */
  readonly view: Size;
  /** Taille de la carte en pixels. */
  readonly world: Size;
  readonly deadzone: Size;
  /** Part de l'écart rattrapée par image à 60 Hz (0 < lerp ≤ 1). */
  readonly lerp: number;
}

const clamp = (v: number, min: number, max: number): number => Math.min(max, Math.max(min, v));

/** Coin haut-gauche maximal de la caméra (la carte peut être plus petite que l'écran). */
function limits(config: CameraConfig): { maxX: number; maxY: number } {
  return {
    maxX: Math.max(0, config.world.width - config.view.width),
    maxY: Math.max(0, config.world.height - config.view.height),
  };
}

/** Position de caméra qui centre la cible, sans zone morte ni lissage (téléportation, chargement). */
export function centerOn(target: Vec2, config: CameraConfig): Vec2 {
  const { maxX, maxY } = limits(config);
  return {
    x: Math.round(clamp(target.x - config.view.width / 2, 0, maxX)),
    y: Math.round(clamp(target.y - config.view.height / 2, 0, maxY)),
  };
}

/**
 * Nouvelle position de caméra (coin haut-gauche, en pixels, valeurs non
 * arrondies : l'arrondi se fait à l'affichage pour garder un lissage doux).
 */
export function followTarget(camera: Vec2, target: Vec2, dtSeconds: number, config: CameraConfig): Vec2 {
  const { maxX, maxY } = limits(config);
  const halfDeadX = config.deadzone.width / 2;
  const halfDeadY = config.deadzone.height / 2;
  const centerX = camera.x + config.view.width / 2;
  const centerY = camera.y + config.view.height / 2;

  // Position idéale : la plus proche de la caméra actuelle qui garde la cible dans la zone morte.
  let desiredX = camera.x;
  let desiredY = camera.y;
  if (target.x < centerX - halfDeadX) desiredX = target.x + halfDeadX - config.view.width / 2;
  else if (target.x > centerX + halfDeadX) desiredX = target.x - halfDeadX - config.view.width / 2;
  if (target.y < centerY - halfDeadY) desiredY = target.y + halfDeadY - config.view.height / 2;
  else if (target.y > centerY + halfDeadY) desiredY = target.y - halfDeadY - config.view.height / 2;

  // Lissage indépendant du nombre d'images par seconde.
  const k = 1 - Math.pow(1 - config.lerp, Math.max(0, dtSeconds) * 60);
  return {
    x: clamp(camera.x + (desiredX - camera.x) * k, 0, maxX),
    y: clamp(camera.y + (desiredY - camera.y) * k, 0, maxY),
  };
}
