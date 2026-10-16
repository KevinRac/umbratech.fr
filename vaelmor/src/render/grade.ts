/**
 * Étalonnage des couleurs du monde (décision n°43) : une matrice 4×5 par zone,
 * appliquée par le filtre `ColorMatrix` de la caméra. Calcul pur (sans Phaser),
 * testé dans `tests/grade.test.ts`.
 *
 * Ordre des opérations (comme un étalonnage « lift / gain ») :
 * 1. saturation, 2. contraste et luminosité,
 * 3. ombres teintées : `c + (1 − c) × a × teinte` (les noirs deviennent violet-bleu),
 * 4. lumières réchauffées : `c × (1 − a + a × teinte × 1,25)` (les clairs tirent vers l'orangé).
 */
import type { ZoneDef } from '../data/schemas';
import { rgb } from './palette';

export type Grade = ZoneDef['grade'];

/** Matrice 5×5 homogène (ligne par ligne) ; les 4 premières lignes forment la matrice de Phaser. */
type M5 = number[];

const identity = (): M5 => [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1];

/** Produit b × a : applique `a` puis `b`. */
function then(a: M5, b: M5): M5 {
  const out = new Array<number>(25).fill(0);
  for (let i = 0; i < 5; i++) {
    for (let j = 0; j < 5; j++) {
      let s = 0;
      for (let k = 0; k < 5; k++) s += (b[i * 5 + k] as number) * (a[k * 5 + j] as number);
      out[i * 5 + j] = s;
    }
  }
  return out;
}

/** Matrice diagonale (échelle par canal) avec décalage (en 0..1). */
function scaleOffset(sr: number, sg: number, sb: number, or: number, og: number, ob: number): M5 {
  return [sr, 0, 0, 0, or, 0, sg, 0, 0, og, 0, 0, sb, 0, ob, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1];
}

function saturation(amount: number): M5 {
  // Luminance Rec. 709 ; `amount` = 0 neutre, −1 gris, +1 deux fois plus saturé.
  const s = 1 + amount;
  const lr = 0.2126 * (1 - s);
  const lg = 0.7152 * (1 - s);
  const lb = 0.0722 * (1 - s);
  return [lr + s, lg, lb, 0, 0, lr, lg + s, lb, 0, 0, lr, lg, lb + s, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1];
}

const unit = (hex: string): [number, number, number] => {
  const [r, g, b] = rgb(Number.parseInt(hex.slice(1), 16));
  return [r / 255, g / 255, b / 255];
};

/** Matrice de Phaser (20 nombres, décalages en 0..255) pour un étalonnage. */
export function gradeMatrix(grade: Grade): number[] {
  let m = identity();
  m = then(m, saturation(grade.saturation));
  const c = 1 + grade.contrast;
  const off = 0.5 * (1 - c) + grade.brightness;
  m = then(m, scaleOffset(c, c, c, off, off, off));
  const [sr, sg, sb] = unit(grade.shadow);
  const a = grade.shadowAmount;
  m = then(m, scaleOffset(1 - a * sr, 1 - a * sg, 1 - a * sb, a * sr, a * sg, a * sb));
  const [lr, lg, lb] = unit(grade.light);
  const g = grade.lightAmount;
  m = then(m, scaleOffset(1 - g + g * lr * 1.25, 1 - g + g * lg * 1.25, 1 - g + g * lb * 1.25, 0, 0, 0));
  const out = m.slice(0, 20);
  for (const i of [4, 9, 14, 19]) out[i] = (out[i] as number) * 255;
  return out;
}

/** Interpolation linéaire entre deux matrices (fondu entre deux zones). */
export function lerpMatrix(a: readonly number[], b: readonly number[], t: number): number[] {
  return a.map((v, i) => v + ((b[i] as number) - v) * t);
}

/** Applique une matrice à une couleur 0..255 (outil de test et d'aperçu). */
export function applyMatrix(m: readonly number[], color: readonly [number, number, number]): [number, number, number] {
  const [r, g, b] = color;
  const row = (i: number): number => Math.max(0, Math.min(255, (m[i] as number) * r + (m[i + 1] as number) * g + (m[i + 2] as number) * b + (m[i + 4] as number)));
  return [row(0), row(5), row(10)];
}
