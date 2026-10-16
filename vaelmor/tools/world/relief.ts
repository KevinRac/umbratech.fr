/**
 * Passes de relief communes (décision n°42) : donnent du volume aux textures.
 *
 * - `groundRelief` : éclairage « bump » du sol (carte de hauteur périodique,
 *   lumière venant du haut à gauche) : petits bombements clairs/sombres.
 * - `propRelief` : biseau des décors — liseré clair sur les bords haut/gauche,
 *   ombre sur les bords bas/droite, contre le contour ou le vide.
 */
import { mix, type Px } from './px';
import { SHADE, SUN } from './art';

const N = 16;

/** Carte de hauteur périodique 16×16 (bruit de valeur lissé), identique pour toutes les tuiles. */
const HEIGHT: number[] = (() => {
  const lattice: number[] = [];
  let s = 1234567;
  for (let i = 0; i < 16; i++) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    lattice.push(s / 4294967296);
  }
  const g = (x: number, y: number): number => lattice[(y & 3) * 4 + (x & 3)] as number;
  const smooth = (t: number): number => t * t * (3 - 2 * t);
  const out: number[] = [];
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const fx = x / 4;
      const fy = y / 4;
      const x0 = Math.floor(fx);
      const y0 = Math.floor(fy);
      const tx = smooth(fx - x0);
      const ty = smooth(fy - y0);
      const a = g(x0, y0) * (1 - tx) + g(x0 + 1, y0) * tx;
      const b = g(x0, y0 + 1) * (1 - tx) + g(x0 + 1, y0 + 1) * tx;
      out.push(a * (1 - ty) + b * ty);
    }
  }
  return out;
})();

const h = (x: number, y: number, ox: number, oy: number): number => HEIGHT[(((y + oy) % N) + N) % N * N + ((((x + ox) % N) + N) % N)] as number;

/** Relief du sol : `strength` 1 = normal. `shift` décale la carte (variantes). */
export function groundRelief(px: Px, shift: number, strength = 1): void {
  const ox = (shift * 5) % N;
  const oy = (shift * 3) % N;
  const edits: [number, number, number][] = [];
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const c = px.colorAt(x, y);
      if (c < 0 || px.alphaAt(x, y) < 255) continue;
      const slope = h(x - 1, y - 1, ox, oy) - h(x + 1, y + 1, ox, oy);
      if (slope > 0.17) edits.push([x, y, mix(c, SUN, 0.17 * strength)]);
      else if (slope < -0.17) edits.push([x, y, mix(c, SHADE, 0.22 * strength)]);
    }
  }
  for (const [x, y, c] of edits) px.set(x, y, c);
}

const luminance = (c: number): number => 0.299 * ((c >> 16) & 255) + 0.587 * ((c >> 8) & 255) + 0.114 * (c & 255);

/** Vrai si (x, y) est du vide, une ombre portée ou un contour sombre. */
function isEdge(px: Px, x: number, y: number): boolean {
  if (px.alphaAt(x, y) < 200) return true;
  return luminance(px.colorAt(x, y)) < 60;
}

/** Biseau des décors : lumière en haut à gauche, ombre en bas à droite. */
export function propRelief(px: Px): void {
  const edits: [number, number, number][] = [];
  for (let y = 0; y < px.height; y++) {
    for (let x = 0; x < px.width; x++) {
      if (px.alphaAt(x, y) < 255 || isEdge(px, x, y)) continue;
      const c = px.colorAt(x, y);
      const lit = isEdge(px, x - 1, y) || isEdge(px, x, y - 1);
      const dark = isEdge(px, x + 1, y) || isEdge(px, x, y + 1);
      if (lit && !dark) edits.push([x, y, mix(c, SUN, 0.3)]);
      else if (dark && !lit) edits.push([x, y, mix(c, SHADE, 0.32)]);
    }
  }
  for (const [x, y, c] of edits) px.set(x, y, c);
}
