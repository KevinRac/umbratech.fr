import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data';
import { centerOn, followTarget, type CameraConfig } from '../src/logic/world/camera';
import { findPath, nearestFreeCell, reachableCells } from '../src/logic/world/pathfinding';
import { ZoneTracker, locationAtPoint, terrainAtCell, zoneValueAtCell } from '../src/logic/world/zones';
import { GATE_FLAG, gridFromRows, makeObject, makeWorldMap } from './helpers/fixtures';

const CAMERA: CameraConfig = { view: { width: 480, height: 270 }, world: { width: 2560, height: 1920 }, deadzone: { width: 24, height: 16 }, lerp: 0.12 };

describe('caméra', () => {
  it('ne bouge pas tant que la cible reste dans la zone morte', () => {
    const camera = { x: 1000, y: 800 };
    const target = { x: 1000 + 240 + 11, y: 800 + 135 - 7 };
    const next = followTarget(camera, target, 1 / 60, CAMERA);
    expect(next).toEqual(camera);
  });

  it('suit la cible dès qu’elle sort de la zone morte, puis la rattrape sans dépasser', () => {
    let camera = { x: 1000, y: 800 };
    const target = { x: 1000 + 240 + 100, y: 800 + 135 };
    for (let i = 0; i < 300; i++) camera = followTarget(camera, target, 1 / 60, CAMERA);
    // La cible finit au bord de la zone morte (12 px du centre), pas au centre.
    expect(target.x - (camera.x + 240)).toBeCloseTo(12, 0);
    expect(camera.y).toBeCloseTo(800, 5);
  });

  it('reste dans les limites de la carte', () => {
    let camera = { x: 0, y: 0 };
    for (let i = 0; i < 200; i++) camera = followTarget(camera, { x: -500, y: -500 }, 1 / 60, CAMERA);
    expect(camera).toEqual({ x: 0, y: 0 });
    for (let i = 0; i < 2000; i++) camera = followTarget(camera, { x: 9999, y: 9999 }, 1 / 60, CAMERA);
    expect(camera.x).toBeCloseTo(2560 - 480, 5);
    expect(camera.y).toBeCloseTo(1920 - 270, 5);
  });

  it('se rapproche à la même vitesse quelle que soit la fréquence d’affichage', () => {
    const target = { x: 1400, y: 900 };
    const at = (fps: number): number => {
      let camera = { x: 1000, y: 800 };
      for (let i = 0; i < fps / 4; i++) camera = followTarget(camera, target, 1 / fps, CAMERA);
      return camera.x;
    };
    // 32, 64 et 128 images par seconde : un quart de seconde = 8, 16 et 32 images entières.
    expect(Math.abs(at(32) - at(64))).toBeLessThan(0.01);
    expect(Math.abs(at(128) - at(64))).toBeLessThan(0.01);
  });

  it('centre la caméra (téléportation) en respectant les bords', () => {
    expect(centerOn({ x: 10, y: 10 }, CAMERA)).toEqual({ x: 0, y: 0 });
    expect(centerOn({ x: 1280, y: 960 }, CAMERA)).toEqual({ x: 1040, y: 825 });
    expect(centerOn({ x: 99999, y: 99999 }, CAMERA)).toEqual({ x: 2080, y: 1650 });
  });

  it('gère une carte plus petite que l’écran', () => {
    const small: CameraConfig = { ...CAMERA, world: { width: 320, height: 200 } };
    expect(centerOn({ x: 160, y: 100 }, small)).toEqual({ x: 0, y: 0 });
  });
});

describe('zones et lieux', () => {
  const map = makeWorldMap(
    ['1111222', '1111222', '1111222'],
    [makeObject({ id: 'village', x: 16, y: 16, width: 32, height: 32 }), makeObject({ id: 'autel', kind: 'autel', x: 24, y: 24, width: 8, height: 8 })],
  );
  const zones = loadGameData().zones;

  it('lit la zone d’une case et renvoie 0 hors carte', () => {
    expect(zoneValueAtCell(map, 0, 0)).toBe(1);
    expect(zoneValueAtCell(map, 5, 1)).toBe(2);
    expect(zoneValueAtCell(map, -1, 0)).toBe(0);
    expect(zoneValueAtCell(map, 7, 0)).toBe(0);
  });

  it('lit le terrain d’une case', () => {
    expect(terrainAtCell(map, 2, 2)).toBe('plaine');
    expect(terrainAtCell(map, 99, 2)).toBeNull();
  });

  it('préfère le plus petit lieu quand ils se superposent', () => {
    expect(locationAtPoint(map, 20, 20)?.props['id']).toBe('village');
    expect(locationAtPoint(map, 26, 26)?.props['id']).toBe('autel');
    expect(locationAtPoint(map, 100, 100)).toBeNull();
  });

  it('annonce le changement de zone une seule fois', () => {
    const tracker = new ZoneTracker(map, zones);
    const first = tracker.update(8, 8);
    expect(first.zone?.id).toBe('z1');
    expect(first.zoneChanged).toBe(true);
    expect(tracker.update(9, 9).zoneChanged).toBe(false);
    const crossing = tracker.update(4 * 16 + 4, 8);
    expect(crossing.zoneChanged).toBe(true);
    expect(crossing.zone?.id).toBe('z2');
    expect(crossing.previousZone?.id).toBe('z1');
    expect(tracker.update(4 * 16 + 5, 9).zoneChanged).toBe(false);
  });

  it('annonce l’entrée dans un lieu', () => {
    const tracker = new ZoneTracker(map, zones);
    expect(tracker.update(8, 8).locationChanged).toBe(false);
    const enter = tracker.update(20, 20);
    expect(enter.locationChanged).toBe(true);
    expect(enter.location?.props['id']).toBe('village');
    expect(tracker.update(22, 22).locationChanged).toBe(false);
    expect(tracker.update(60, 40).locationChanged).toBe(true);
  });

  it('re-déclenche les annonces après une réinitialisation (téléportation)', () => {
    const tracker = new ZoneTracker(map, zones);
    tracker.update(8, 8);
    tracker.reset();
    expect(tracker.update(8, 8).zoneChanged).toBe(true);
  });
});

describe('recherche de chemin', () => {
  const rows = ['#########', '#...#...#', '#.#.#.#.#', '#.#...#.#', '#.#####.#', '#.......#', '#########'];

  it('trouve le plus court chemin autour des obstacles', () => {
    const grid = gridFromRows(rows);
    const path = findPath(grid, { x: 1, y: 1 }, { x: 7, y: 1 });
    expect(path).not.toBeNull();
    expect(path?.[0]).toEqual({ x: 1, y: 1 });
    expect(path?.at(-1)).toEqual({ x: 7, y: 1 });
    for (const cell of path ?? []) expect(grid.isSolidCell(cell.x, cell.y)).toBe(false);
  });

  it('renvoie null quand l’arrivée est inaccessible', () => {
    const grid = gridFromRows(['#####', '#.#.#', '#####']);
    expect(findPath(grid, { x: 1, y: 1 }, { x: 3, y: 1 })).toBeNull();
    expect(findPath(grid, { x: 1, y: 1 }, { x: 2, y: 1 })).toBeNull();
  });

  it('évite les zones lentes quand un détour raisonnable existe', () => {
    const grid = gridFromRows(['#######', '#.....#', '#.,,,.#', '#.....#', '#######']);
    const path = findPath(grid, { x: 1, y: 2 }, { x: 5, y: 2 }, 5) ?? [];
    expect(path.some((c) => grid.valueAt(c.x, c.y) === 3)).toBe(false);
  });

  it('les passages verrouillés coupent les chemins jusqu’à leur ouverture', () => {
    const rowsGate = ['#######', '#..G..#', '#######'];
    expect(findPath(gridFromRows(rowsGate), { x: 1, y: 1 }, { x: 5, y: 1 })).toBeNull();
    expect(findPath(gridFromRows(rowsGate, [GATE_FLAG]), { x: 1, y: 1 }, { x: 5, y: 1 })).not.toBeNull();
  });

  it('calcule les cases atteignables', () => {
    const grid = gridFromRows(['#######', '#..#..#', '#######']);
    const seen = reachableCells(grid, { x: 1, y: 1 });
    expect(seen[1 * 7 + 2]).toBe(1);
    expect(seen[1 * 7 + 4]).toBe(0);
  });
});

describe('nearestFreeCell', () => {
  const grid = gridFromRows(['#####', '#.#.#', '#####', '#...#', '#####']);
  it('renvoie la case elle-même si elle est libre', () => {
    expect(nearestFreeCell(grid, 1, 1)).toEqual({ x: 1, y: 1 });
  });
  it('cherche la case libre la plus proche autour d’un obstacle', () => {
    expect(nearestFreeCell(grid, 2, 1)).toEqual({ x: 1, y: 1 });
    expect(nearestFreeCell(grid, 2, 2)?.y).not.toBe(2);
  });
  it('renvoie null si rien n’est libre dans le rayon', () => {
    expect(nearestFreeCell(gridFromRows(['###', '###', '###']), 1, 1, 3)).toBeNull();
  });
});
