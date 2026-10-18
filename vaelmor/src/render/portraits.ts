/**
 * Portraits de dialogue (jalon M2) : le buste du PNJ, découpé dans son sprite
 * 16×28 (16 rangées du haut) et agrandi ×4 en 64×64, sur un fond dégradé tramé.
 * L'expression (neutre, content, fâché, triste) est dessinée par-dessus : sourcils
 * et bouche repérés à partir des yeux du sprite. Module sans DOM (puits de pixels).
 */
import type { Expression } from '../data/townSchemas';
import { paintCharacterFrame, type CharacterLook } from './characterSprite';
import { PALETTE as P, mixColor } from './palette';
import { bayer } from './pixelCanvas';
import type { PixelSink } from './waterTile';

export const PORTRAIT_SIZE = 64;
const CROP_ROWS = 16;
const SRC_W = 16;

type Grid = (number | null)[];

/** Peint le sprite (pose de face) dans une grille 16×28. */
function paintBust(look: CharacterLook): Grid {
  const grid: Grid = new Array<number | null>(SRC_W * 28).fill(null);
  paintCharacterFrame({ set: (x, y, color) => { if (x >= 0 && y >= 0 && x < SRC_W && y < 28) grid[y * SRC_W + x] = color; } }, 0, 0, look, 'down', 0);
  return grid;
}

/** Positions (x, y) des pixels d'yeux du sprite. */
function findEyes(grid: Grid, eye: number): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  for (let y = 0; y < CROP_ROWS; y++) for (let x = 0; x < SRC_W; x++) if (grid[y * SRC_W + x] === eye) out.push({ x, y });
  return out;
}

/** Ajoute sourcils, bouche et larmes selon l'expression, en traits fins sur la grille 64×64. */
function applyExpression(small: Grid, big: Grid, look: CharacterLook, expression: Expression): void {
  const eyes = findEyes(small, look.eye);
  if (eyes.length === 0) return;
  const ink = mixColor(look.skin.dark, P.nuitBleue, 0.75);
  const set = (x: number, y: number, color: number): void => {
    if (x >= 0 && y >= 0 && x < PORTRAIT_SIZE && y < PORTRAIT_SIZE) big[y * PORTRAIT_SIZE + x] = color;
  };
  const hline = (x0: number, x1: number, y: number, color: number = ink): void => {
    for (let x = x0; x <= x1; x++) set(x, y, color);
  };
  const left = Math.min(...eyes.map((e) => e.x));
  const right = Math.max(...eyes.map((e) => e.x));
  const top = Math.min(...eyes.map((e) => e.y));
  const bottom = Math.max(...eyes.map((e) => e.y));
  const cx = Math.floor(((left + right + 1) / 2) * 4);
  const my = (bottom + 2) * 4 + 1;
  const lx = left * 4;
  const rx = right * 4 + 3;
  const by = top * 4 - 3;

  switch (expression) {
    case 'neutre':
      hline(cx - 3, cx + 2, my);
      break;
    case 'content':
      hline(cx - 3, cx + 2, my);
      set(cx - 4, my - 1, ink);
      set(cx + 3, my - 1, ink);
      hline(lx, lx + 3, bottom * 4 + 3, mixColor(look.eye, look.skin.base, 0.5));
      hline(rx - 3, rx, bottom * 4 + 3, mixColor(look.eye, look.skin.base, 0.5));
      break;
    case 'fache':
      hline(lx - 1, lx + 3, by + 1);
      hline(rx - 3, rx + 1, by + 1);
      set(lx + 4, by + 2, ink);
      set(rx - 4, by + 2, ink);
      hline(cx - 3, cx + 2, my + 1);
      set(cx - 4, my + 2, ink);
      set(cx + 3, my + 2, ink);
      break;
    case 'triste':
      hline(lx - 1, lx + 2, by + 2);
      hline(rx - 2, rx + 1, by + 2);
      set(lx + 3, by + 1, ink);
      set(rx - 3, by + 1, ink);
      hline(cx - 2, cx + 1, my + 1);
      set(cx - 3, my + 2, ink);
      set(cx + 2, my + 2, ink);
      set(rx, bottom * 4 + 6, mixColor(P.ciel, P.ecume, 0.4));
      set(rx, bottom * 4 + 7, mixColor(P.ciel, P.ecume, 0.4));
      break;
  }
}

/** Agrandissement ×2 à diagonales lissées (Scale2x / EPX) : les pixels ne forment plus de gros carrés. */
function scale2x(src: Grid, w: number, h: number): Grid {
  const out: Grid = new Array<number | null>(w * 2 * h * 2).fill(null);
  const at = (x: number, y: number): number | null => (x < 0 || y < 0 || x >= w || y >= h ? null : (src[y * w + x] as number | null));
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = at(x, y);
      const up = at(x, y - 1);
      const down = at(x, y + 1);
      const left = at(x - 1, y);
      const right = at(x + 1, y);
      let e0 = p;
      let e1 = p;
      let e2 = p;
      let e3 = p;
      if (up !== down && left !== right) {
        if (up === left) e0 = up;
        if (up === right) e1 = up;
        if (down === left) e2 = down;
        if (down === right) e3 = down;
      }
      const o = (y * 2) * (w * 2) + x * 2;
      out[o] = e0;
      out[o + 1] = e1;
      out[o + w * 2] = e2;
      out[o + w * 2 + 1] = e3;
    }
  }
  return out;
}

/** Peint le portrait 64×64 d'un PNJ avec l'expression donnée. */
export function paintPortrait(sink: PixelSink, look: CharacterLook, expression: Expression, ground: number = P.ardoise): void {
  const small = paintBust(look);
  // Deux passes de Scale2x : 16×16 → 64×64 aux contours doux ; l'expression est tracée ensuite en traits fins.
  const crop = small.slice(0, SRC_W * CROP_ROWS);
  const grid = scale2x(scale2x(crop, SRC_W, CROP_ROWS), SRC_W * 2, CROP_ROWS * 2);
  applyExpression(small, grid, look, expression);
  const N = PORTRAIT_SIZE;
  const at = (x: number, y: number): number | null => (x < 0 || y < 0 || x >= N || y >= N ? null : (grid[y * N + x] as number | null));
  const top = mixColor(ground, P.lumiereChaude, 0.3);
  const bottom = mixColor(ground, P.ombreProfonde, 0.6);
  const glow = mixColor(ground, P.lumiereDoree, 0.38);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const own = at(x, y);
      if (own === null) {
        // Fond : dégradé tramé, halo chaud derrière la tête, bords assombris.
        const t = y / (N - 1);
        const dx = (x - N * 0.5) / (N * 0.5);
        const dy = (y - N * 0.42) / (N * 0.5);
        const halo = Math.max(0, 1 - Math.hypot(dx, dy) * 1.25);
        let c = t > bayer(x, y) ? bottom : top;
        if (halo > bayer(x + 1, y + 2)) c = glow;
        const edge = Math.max(Math.abs(dx), Math.abs(dy));
        if (edge > 0.82 && (edge - 0.82) * 5 > bayer(x, y + 1)) c = mixColor(c, P.ombreProfonde, 0.5);
        // Ombre portée du buste, à droite.
        if (at(x - 2, y) !== null || at(x - 3, y + 1) !== null) c = mixColor(c, P.ombreProfonde, 0.28);
        // Contour sombre de la silhouette.
        if (at(x - 1, y) !== null || at(x + 1, y) !== null || at(x, y - 1) !== null || at(x, y + 1) !== null) c = P.ombreProfonde;
        sink.set(x, y, c);
        continue;
      }
      // Relief : lumière en haut à gauche, ombre en bas à droite, grain tramé léger.
      let c = own;
      const lit = at(x - 1, y) !== own || at(x, y - 1) !== own;
      const shade = at(x + 1, y) !== own || at(x, y + 1) !== own;
      if (lit && !shade) c = mixColor(own, P.lumiereChaude, 0.22);
      else if (shade && !lit) c = mixColor(own, P.ombreProfonde, 0.2);
      else if ((x + y * 2) % 7 === 0 && bayer(x, y) > 0.55) c = mixColor(own, P.ombreProfonde, 0.07);
      // Lumière chaude qui tombe de la gauche sur le haut du buste.
      if (x < N * 0.45 && y < N * 0.7 && bayer(x + 3, y) < 0.18) c = mixColor(c, P.lumiereDoree, 0.1);
      sink.set(x, y, c);
    }
  }
}
