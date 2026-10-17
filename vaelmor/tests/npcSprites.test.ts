import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data';
import { NPC_IDLE_FRAMES, facingPose, facingToward, lookFromDef, paintNpcFrame } from '../src/render/npcSprites';
import { PORTRAIT_SIZE, paintPortrait } from '../src/render/portraits';
import { EXPRESSIONS } from '../src/data/townSchemas';

const data = loadGameData();
const npcs = data.locations.flatMap((l) => l.npcs);

function sheet(paint: (set: (x: number, y: number, c: number) => void) => void, w: number, h: number): number[] {
  const out = new Array<number>(w * h).fill(-1);
  paint((x, y, c) => {
    if (x >= 0 && y >= 0 && x < w && y < h) out[y * w + x] = c;
  });
  return out;
}

describe('sprites de PNJ', () => {
  it('chaque PNJ se peint dans les trois poses, avec des pixels et une respiration', () => {
    for (const npc of npcs) {
      const look = lookFromDef(npc.look);
      for (const pose of ['down', 'up', 'side'] as const) {
        const a = sheet((set) => paintNpcFrame({ set }, 0, 0, look, pose, 0), 16, 28);
        const b = sheet((set) => paintNpcFrame({ set }, 0, 0, look, pose, 1), 16, 28);
        expect(a.filter((c) => c >= 0).length, `${npc.id} ${pose}`).toBeGreaterThan(80);
        expect(a, `${npc.id} ${pose} respire`).not.toEqual(b);
      }
    }
    expect(NPC_IDLE_FRAMES).toBe(2);
  });

  it('donne à chaque PNJ une apparence distincte', () => {
    const seen = new Map<string, string>();
    for (const npc of npcs) {
      const key = sheet((set) => paintNpcFrame({ set }, 0, 0, lookFromDef(npc.look), 'down', 0), 16, 28).join(',');
      expect(seen.get(key), `${npc.id} ressemble à ${seen.get(key)}`).toBeUndefined();
      seen.set(key, npc.id);
    }
  });

  it('convertit un regard en pose', () => {
    expect(facingPose('w')).toEqual({ pose: 'side', flipX: true });
    expect(facingPose('e')).toEqual({ pose: 'side', flipX: false });
    expect(facingToward(5, 1)).toBe('e');
    expect(facingToward(-5, 1)).toBe('w');
    expect(facingToward(0, -3)).toBe('n');
  });
});

describe('portraits', () => {
  it('ont quatre expressions différentes pour chaque PNJ', () => {
    for (const npc of npcs) {
      const look = lookFromDef(npc.look);
      const images = EXPRESSIONS.map((e) => sheet((set) => paintPortrait({ set }, look, e), PORTRAIT_SIZE, PORTRAIT_SIZE).join(','));
      expect(new Set(images).size, npc.id).toBe(EXPRESSIONS.length);
    }
  });

  it('remplissent tout le cadre 64×64', () => {
    const look = lookFromDef((npcs[0] as (typeof npcs)[number]).look);
    const image = sheet((set) => paintPortrait({ set }, look, 'neutre'), PORTRAIT_SIZE, PORTRAIT_SIZE);
    expect(image.every((c) => c >= 0)).toBe(true);
  });
});
