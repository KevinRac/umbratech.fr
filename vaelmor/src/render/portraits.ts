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
const SCALE = 4;
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

/** Ajoute sourcils, bouche et larmes selon l'expression. */
function applyExpression(grid: Grid, look: CharacterLook, expression: Expression): void {
  const eyes = findEyes(grid, look.eye);
  if (eyes.length === 0) return;
  const ink = mixColor(look.skin.dark, P.nuitBleue, 0.7);
  const set = (x: number, y: number, color: number): void => {
    if (x >= 0 && y >= 0 && x < SRC_W && y < CROP_ROWS) grid[y * SRC_W + x] = color;
  };
  const left = Math.min(...eyes.map((e) => e.x));
  const right = Math.max(...eyes.map((e) => e.x));
  const top = Math.min(...eyes.map((e) => e.y));
  const bottom = Math.max(...eyes.map((e) => e.y));
  const mouthY = bottom + 2;
  const cx = Math.floor((left + right) / 2);

  switch (expression) {
    case 'neutre':
      set(cx, mouthY, ink);
      set(cx + 1, mouthY, ink);
      break;
    case 'content': {
      set(cx, mouthY, ink);
      set(cx + 1, mouthY, ink);
      set(cx - 1, mouthY - 1, ink);
      set(cx + 2, mouthY - 1, ink);
      // Yeux plissés : un trait de peau sous le regard.
      for (const e of eyes) if (e.y === bottom) set(e.x, e.y, mixColor(look.eye, look.skin.base, 0.45));
      break;
    }
    case 'fache': {
      // Sourcils en V, bouche tombante.
      set(left - 1, top - 1, ink);
      set(left, top - 1, ink);
      set(right + 1, top - 1, ink);
      set(right, top - 1, ink);
      set(left + 1, top - 2, ink);
      set(right - 1, top - 2, ink);
      set(cx, mouthY, ink);
      set(cx + 1, mouthY, ink);
      set(cx - 1, mouthY + 1, ink);
      set(cx + 2, mouthY + 1, ink);
      break;
    }
    case 'triste': {
      // Sourcils relevés vers l'intérieur, petite larme, bouche basse.
      set(left - 1, top - 1, ink);
      set(left, top - 2, ink);
      set(right + 1, top - 1, ink);
      set(right, top - 2, ink);
      set(cx, mouthY + 1, ink);
      set(cx + 1, mouthY + 1, ink);
      set(right, bottom + 1, mixColor(P.ciel, P.ecume, 0.4));
      break;
    }
  }
}

/** Peint le portrait 64×64 d'un PNJ avec l'expression donnée. */
export function paintPortrait(sink: PixelSink, look: CharacterLook, expression: Expression, ground: number = P.ardoise): void {
  const grid = paintBust(look);
  applyExpression(grid, look, expression);
  const top = mixColor(ground, P.lumiereChaude, 0.25);
  const bottom = mixColor(ground, P.ombreProfonde, 0.55);
  for (let y = 0; y < PORTRAIT_SIZE; y++) {
    const t = y / (PORTRAIT_SIZE - 1);
    for (let x = 0; x < PORTRAIT_SIZE; x++) {
      const sx = Math.floor(x / SCALE);
      const sy = Math.floor(y / SCALE);
      const own = grid[sy * SRC_W + sx];
      const back = t > bayer(x, y) ? bottom : top;
      sink.set(x, y, own ?? back);
    }
  }
}
