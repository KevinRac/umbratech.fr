/**
 * Ennemis du monde ouvert peints (n°281) : chaque feuille de `FOE_SKINS` existe au bon format
 * (3 rangées × `frames` cellules carrées, fond transparent), chaque apparence du monde en a une,
 * et un ennemi qui marche à la verticale montre bien sa face ou son dos.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FOE_SKINS, SKIN_CELL, SKIN_ROWS } from '../src/data/skins';
import { foeFacing, type FoeSim } from '../src/logic/world/foes';
import { spritePose } from '../src/logic/world/movement';

const ROOT = resolve(import.meta.dirname, '..');

/** Largeur, hauteur et type de couleur d'un PNG (en-tête IHDR). */
function pngHeader(path: string): { width: number; height: number; colorType: number } {
  const b = readFileSync(path);
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20), colorType: b[25] as number };
}

describe('ennemis peints du monde ouvert', () => {
  it('chaque feuille existe, en RGBA, à 3 rangées × images de la cellule déclarée', () => {
    for (const skin of FOE_SKINS) {
      const path = resolve(ROOT, 'assets', 'ennemis', `${skin.id}.png`);
      expect(existsSync(path), skin.id).toBe(true);
      const cell = skin.cell ?? SKIN_CELL;
      const head = pngHeader(path);
      expect(head, skin.id).toEqual({ width: cell * skin.frames, height: cell * SKIN_ROWS.length, colorType: 6 });
    }
  });

  it('chaque apparence posée dans le monde a sa feuille', () => {
    const world = JSON.parse(readFileSync(resolve(ROOT, 'data', 'worldEnemies.json'), 'utf8')) as { enemies?: { sprite: string }[]; foes?: { sprite: string }[] };
    const sprites = new Set((world.enemies ?? world.foes ?? []).map((f) => f.sprite));
    const ids = new Set(FOE_SKINS.map((s) => s.id));
    expect([...sprites].filter((s) => !ids.has(s))).toEqual([]);
  });

  it('un ennemi qui monte ou descend montre son dos ou sa face, pas son profil', () => {
    const at = (aim: number): string => spritePose(foeFacing({ aim } as FoeSim)).pose;
    expect(at(Math.atan2(1, 0))).toBe('down');
    expect(at(Math.atan2(-1, 0))).toBe('up');
    expect(at(0)).toBe('side');
    expect(at(Math.PI)).toBe('side');
    expect(at(Math.atan2(1, 1))).toBe('side');
  });
});
