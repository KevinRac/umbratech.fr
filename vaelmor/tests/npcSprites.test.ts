import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data';
import { NPC_IDLE_FRAMES, facingPose, facingToward, lookFromDef, paintNpcFrame } from '../src/render/npcSprites';
import { paintPortraitHD } from '../src/render/portraitPainter';
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

/** Contexte 2D factice : enregistre les appels de dessin (sans DOM). */
function recorder(): { ctx: CanvasRenderingContext2D; log: string[] } {
  const log: string[] = [];
  const gradient = { addColorStop: (o: number, c: string) => log.push(`stop ${o} ${c}`) };
  const target: Record<string, unknown> = {};
  const ctx = new Proxy(target, {
    get(t, key: string) {
      if (key in t) return t[key];
      if (key === 'createLinearGradient' || key === 'createRadialGradient') return () => gradient;
      return (...args: unknown[]) => {
        log.push(`${key}(${args.map((a) => (typeof a === 'number' ? a.toFixed(2) : String(a))).join(',')})`);
      };
    },
    set(t, key: string, value: unknown) {
      t[key] = value;
      log.push(`${key}=${String(value)}`);
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  return { ctx, log };
}

function painted(npc: (typeof npcs)[number], expression: (typeof EXPRESSIONS)[number]): string {
  const { ctx, log } = recorder();
  paintPortraitHD(ctx, { id: npc.id, look: lookFromDef(npc.look), traits: npc.portrait, expression }, 192);
  return log.join('\n');
}

describe('portraits peints', () => {
  it('ont quatre expressions différentes pour chaque PNJ, sans valeur invalide', () => {
    for (const npc of npcs) {
      const images = EXPRESSIONS.map((e) => painted(npc, e));
      expect(new Set(images).size, npc.id).toBe(EXPRESSIONS.length);
      for (const image of images) expect(image, npc.id).not.toMatch(/NaN|undefined|Infinity/);
    }
  });

  it('sont déterministes et propres à chaque PNJ', () => {
    const first = npcs[0] as (typeof npcs)[number];
    expect(painted(first, 'neutre')).toBe(painted(first, 'neutre'));
    expect(new Set(npcs.map((n) => painted(n, 'neutre'))).size).toBe(npcs.length);
  });
});
