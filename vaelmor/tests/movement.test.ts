import { describe, expect, it } from 'vitest';
import { Rng } from '../src/logic/rng';
import { createBody, facingFromVector, isFreeAt, spritePose, stepBody, type BodyState, type MoveInput } from '../src/logic/world/movement';
import { GATE_FLAG, TILE, cellFeet, gridFromRows, movementConfig } from './helpers/fixtures';

const config = movementConfig();
const OPEN_ROOM = Array.from({ length: 12 }, (_, y) => (y === 0 || y === 11 ? '#'.repeat(40) : `#${'.'.repeat(38)}#`));

function run(body: BodyState, input: MoveInput, seconds: number, fps: number, grid = gridFromRows(OPEN_ROOM)): BodyState {
  const frames = Math.round(seconds * fps);
  for (let i = 0; i < frames; i++) stepBody(body, input, 1 / fps, grid, config);
  return body;
}

describe('vitesse de déplacement', () => {
  it('marche à ~80 px/s (l’accélération douce coûte ~2 px par seconde)', () => {
    const start = cellFeet(2, 5);
    const body = run(createBody(start.x, start.y), { dx: 1, dy: 0, sprint: false }, 1, 60);
    expect(body.x - start.x).toBeGreaterThan(76);
    expect(body.x - start.x).toBeLessThan(80);
    expect(body.y).toBe(start.y);
  });

  it('court à ~120 px/s avec Maj', () => {
    const start = cellFeet(2, 5);
    const body = run(createBody(start.x, start.y), { dx: 1, dy: 0, sprint: true }, 1, 60);
    expect(body.x - start.x).toBeGreaterThan(114);
    expect(body.x - start.x).toBeLessThan(120);
  });

  it('ne va pas plus vite en diagonale', () => {
    const start = cellFeet(2, 2);
    const body = run(createBody(start.x, start.y), { dx: 1, dy: 1, sprint: false }, 1, 60);
    const distance = Math.hypot(body.x - start.x, body.y - start.y);
    expect(distance).toBeGreaterThan(76);
    expect(distance).toBeLessThan(80);
  });

  it('est indépendante du nombre d’images par seconde', () => {
    const start = cellFeet(2, 5);
    const at30 = run(createBody(start.x, start.y), { dx: 1, dy: 0, sprint: false }, 1, 30);
    const at144 = run(createBody(start.x, start.y), { dx: 1, dy: 0, sprint: false }, 1, 144);
    expect(Math.abs(at30.x - at144.x)).toBeLessThan(1.5);
  });

  it('ralentit sur une zone lente (marais, gué)', () => {
    const rows = Array.from({ length: 5 }, (_, y) => (y === 0 || y === 4 ? '#'.repeat(30) : `#${','.repeat(28)}#`));
    const grid = gridFromRows(rows);
    const start = cellFeet(2, 2);
    const body = run(createBody(start.x, start.y), { dx: 1, dy: 0, sprint: false }, 1, 60, grid);
    expect(body.onSlowZone).toBe(true);
    expect(body.x - start.x).toBeLessThan(80 * config.slowZoneMultiplier + 1);
  });

  it('s’arrête en douceur : plus de vitesse 80 ms après le relâchement', () => {
    const start = cellFeet(2, 5);
    const body = run(createBody(start.x, start.y), { dx: 1, dy: 0, sprint: false }, 0.5, 60);
    run(body, { dx: 0, dy: 0, sprint: false }, 0.1, 60);
    expect(body.vx).toBe(0);
    expect(body.intent).toBe(false);
  });
});

describe('collisions', () => {
  it('se colle exactement au mur sans le traverser', () => {
    const grid = gridFromRows(OPEN_ROOM);
    const start = cellFeet(30, 5);
    const body = run(createBody(start.x, start.y), { dx: 1, dy: 0, sprint: true }, 2, 60, grid);
    // Mur à droite : le bord droit de la boîte touche x = 39 × 16 = 624.
    expect(body.x + config.hitboxWidth / 2).toBeGreaterThan(623.9);
    expect(body.x + config.hitboxWidth / 2).toBeLessThan(624);
    expect(isFreeAt(grid, body.x, body.y, config)).toBe(true);
  });

  it('les pieds, pas la tête, heurtent un mur au nord : la boîte fait 8 px de haut', () => {
    const grid = gridFromRows(OPEN_ROOM);
    const start = cellFeet(10, 5);
    const body = run(createBody(start.x, start.y), { dx: 0, dy: -1, sprint: false }, 3, 60, grid);
    // Le haut de la boîte (y - 8) touche le bas du mur (y = 16).
    expect(body.y - config.hitboxHeight).toBeGreaterThan(15.99);
    expect(body.y - config.hitboxHeight).toBeLessThan(16.1);
  });

  it('glisse le long d’un mur en diagonale', () => {
    const grid = gridFromRows(OPEN_ROOM);
    const start = cellFeet(30, 5);
    const body = run(createBody(start.x, start.y), { dx: 1, dy: 1, sprint: false }, 0.6, 60, grid);
    run(body, { dx: 1, dy: 1, sprint: false }, 0.4, 60, grid);
    expect(body.y).toBeGreaterThan(start.y + 20);
  });

  it('ne traverse jamais un obstacle, même avec des images très longues', () => {
    const grid = gridFromRows(OPEN_ROOM);
    const start = cellFeet(30, 5);
    const body = createBody(start.x, start.y);
    for (let i = 0; i < 20; i++) stepBody(body, { dx: 1, dy: 0, sprint: true }, 1, grid, config); // 1 s d'un coup (plafonné à 50 ms)
    expect(isFreeAt(grid, body.x, body.y, config)).toBe(true);
  });

  it('un déplacement aléatoire de 10 minutes ne place jamais le héros dans un solide', () => {
    const rows = [
      '########################################',
      '#......#.......#...........~~~~~.......#',
      '#......#..###..#..####.....~~~~~..,,,..#',
      '#..........#.......#.......~~~~~..,,,..#',
      '#...###....#...##..#...........G.......#',
      '#...#......#...##..####....##..#...#...#',
      '#...#..........................#...#...#',
      '#...#####..#######.............#.......#',
      '#...............#..............#######.#',
      '#..####..####...#....####..............#',
      '#..#..#..#..#...#....#..#...........#..#',
      '########################################',
    ];
    const grid = gridFromRows(rows);
    const rng = Rng.fromSeed('marche-10-minutes');
    const start = cellFeet(1, 1);
    const body = createBody(start.x, start.y);
    let input: MoveInput = { dx: 0, dy: 0, sprint: false };
    const frames = 60 * 60 * 10;
    for (let i = 0; i < frames; i++) {
      if (i % 30 === 0) input = { dx: rng.int(-1, 1), dy: rng.int(-1, 1), sprint: rng.chance(30) };
      stepBody(body, input, 1 / 60, grid, config);
      if (!isFreeAt(grid, body.x, body.y, config)) throw new Error(`Héros dans un solide à l'image ${i} (${body.x}, ${body.y})`);
    }
    expect(true).toBe(true);
  });
});

describe('aide dans les angles', () => {
  const WALL_WITH_GAP = ['###########', '#.........#', '#.........#', '#####.#####', '#.........#', '#.........#', '###########'];

  it('contourne un coin touché sur quelques pixels au lieu de rester bloqué', () => {
    // Ouverture d'une case à la colonne 5 ; le héros descend avec 3 px d'écart par rapport à elle.
    const grid = gridFromRows(WALL_WITH_GAP);
    const body = createBody(5 * TILE + 3 + config.hitboxWidth / 2, 2 * TILE + 15);
    expect(isFreeAt(grid, body.x, body.y, config)).toBe(true);
    for (let i = 0; i < 90; i++) stepBody(body, { dx: 0, dy: 1, sprint: false }, 1 / 60, grid, config);
    expect(body.y).toBeGreaterThan(4 * TILE); // a franchi l'ouverture
  });

  it('ne s’applique pas quand le décalage dépasse l’aide : le mur reste un mur', () => {
    const grid = gridFromRows(WALL_WITH_GAP);
    // Boîte entièrement à gauche de l'ouverture.
    const body = createBody(3 * TILE + 8, 2 * TILE + 15);
    for (let i = 0; i < 90; i++) stepBody(body, { dx: 0, dy: 1, sprint: false }, 1 / 60, grid, config);
    expect(body.y).toBeLessThan(3 * TILE + 1);
  });
});

describe('passages verrouillés', () => {
  const rows = ['#######', '#..G..#', '#######'];

  it('bloque tant que le drapeau n’est pas levé et signale le heurt', () => {
    const grid = gridFromRows(rows);
    const start = cellFeet(1, 1);
    const body = createBody(start.x, start.y);
    let bumped: string | null = null;
    for (let i = 0; i < 120; i++) {
      stepBody(body, { dx: 1, dy: 0, sprint: false }, 1 / 60, grid, config);
      bumped ??= body.bumpedGate;
    }
    expect(bumped).toBe(GATE_FLAG);
    expect(body.x).toBeLessThan(3 * TILE);
  });

  it('s’ouvre quand le drapeau est levé', () => {
    const grid = gridFromRows(rows, [GATE_FLAG]);
    const start = cellFeet(1, 1);
    const body = createBody(start.x, start.y);
    for (let i = 0; i < 120; i++) stepBody(body, { dx: 1, dy: 0, sprint: false }, 1 / 60, grid, config);
    expect(body.x).toBeGreaterThan(4 * TILE);
  });
});

describe('direction', () => {
  it('donne 8 directions et rien à l’arrêt', () => {
    expect(facingFromVector(0, 0)).toBeNull();
    expect(facingFromVector(0, -1)).toBe('n');
    expect(facingFromVector(1, -1)).toBe('ne');
    expect(facingFromVector(1, 0)).toBe('e');
    expect(facingFromVector(1, 1)).toBe('se');
    expect(facingFromVector(0, 1)).toBe('s');
    expect(facingFromVector(-1, 1)).toBe('sw');
    expect(facingFromVector(-1, 0)).toBe('w');
    expect(facingFromVector(-1, -1)).toBe('nw');
  });

  it('associe 3 poses de sprite, la gauche étant la droite retournée', () => {
    expect(spritePose('n')).toEqual({ pose: 'up', flipX: false });
    expect(spritePose('s')).toEqual({ pose: 'down', flipX: false });
    expect(spritePose('ne')).toEqual({ pose: 'side', flipX: false });
    expect(spritePose('sw')).toEqual({ pose: 'side', flipX: true });
  });
});
