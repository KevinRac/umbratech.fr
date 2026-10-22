import { describe, expect, it } from 'vitest';
import { SKINS, SKIN_ROWS } from '../src/data/skins';
import { skinFrameIndex, skinWalkFrames } from '../src/logic/skinFrames';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('apparences', () => {
  it('indexe sud/nord/est avec 4 ou 8 images', () => {
    expect(skinFrameIndex('down', 0, 4)).toBe(0);
    expect(skinFrameIndex('up', 1, 4)).toBe(5);
    expect(skinFrameIndex('side', 3, 8)).toBe(19);
    expect(skinFrameIndex('side', 9, 8)).toBe(17);
    expect(skinWalkFrames('up', 8)).toEqual([8, 9, 10, 11, 12, 13, 14, 15]);
    expect(SKIN_ROWS).toEqual(['down', 'up', 'side']);
  });
  it('chaque feuille existe et a la bonne taille (PNG)', () => {
    for (const s of SKINS) {
      const file = resolve(__dirname, `../assets/personnages/${s.id}.png`);
      expect(existsSync(file), s.id).toBe(true);
      const b = readFileSync(file);
      expect(b.readUInt32BE(16), s.id).toBe(34 * s.frames);
      expect(b.readUInt32BE(20), s.id).toBe(34 * 3);
      const c = readFileSync(resolve(__dirname, `../assets/personnages/combat/${s.id}.png`));
      expect(c.readUInt32BE(16), s.id).toBe(24 * s.frames);
      expect(c.readUInt32BE(20), s.id).toBe(24 * 3);
    }
  });
});
