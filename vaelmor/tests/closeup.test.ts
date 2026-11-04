/**
 * Écran de combat rapproché (jalon M8, décisions n°204 à n°222) : logique pure.
 * Chronologie du GDD §11.2 et §11.3, critère « vitesse acceptable » (n°209),
 * découpage des événements (n°205), gestes, projectiles et fonds (n°208, n°210).
 */
import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data';
import {
  attackKind,
  backdropFor,
  castFrameAt,
  choreoDuration,
  critStyleFor,
  critSlashes,
  slashFor,
  exchangeDuration,
  exchangeShapes,
  frameAt,
  planSegments,
  projectileFor,
  stepAt,
  strikeDuration,
  strikeSteps,
  type StrikeShape,
} from '../src/logic/anim/closeup';
import type { BattleEvent, Strike } from '../src/logic/tactics/types';
import { BACKDROP_IDS } from '../src/data/schemas';
import { BACKDROP_H, BACKDROP_W, PLATFORM_W, paintBackdrop, paintPlatform } from '../src/render/closeupBackdrop';

const data = loadGameData();
const t = data.balance.closeup;
const anims = data.battleAnims;
const weapon = (id: string) => {
  const w = data.weapons.find((x) => x.id === id);
  if (!w) throw new Error(id);
  return w;
};
const shape = (kind: StrikeShape['kind'], over: Partial<StrikeShape> = {}): StrikeShape => ({ kind, crit: false, hit: true, repeat: false, ...over });
const strike = (attackerId: string, targetId: string, over: Partial<Strike> = {}): Strike => ({ attackerId, targetId, counter: false, hit: true, crit: false, damage: 5, targetHp: 10, ...over });

describe('chronologie d’un coup (GDD §11.2, §11.3)', () => {
  it('le coup de mêlée suit les huit phases du GDD, environ 1,25 s avec l’entrée', () => {
    const steps = strikeSteps(shape('melee'), t);
    expect(steps.map((s) => s.name)).toEqual(['prep', 'dash', 'strike', 'impact', 'recoil', 'pose', 'back']);
    const total = t.entry + strikeDuration(shape('melee'), t);
    expect(total).toBeGreaterThanOrEqual(1150);
    expect(total).toBeLessThanOrEqual(1350);
  });

  it('les étapes s’enchaînent sans trou ni chevauchement', () => {
    for (const s of [shape('melee'), shape('ranged'), shape('magic', { crit: true }), shape('melee', { repeat: true })]) {
      const steps = strikeSteps(s, t);
      steps.forEach((step, i) => {
        if (i > 0) expect(step.at).toBe((steps[i - 1]?.at ?? 0) + (steps[i - 1]?.ms ?? 0));
      });
    }
  });

  it('un critique de mêlée assombrit l’écran, enchaîne les coupes et dure environ 2,2 s avec les transitions', () => {
    const steps = strikeSteps(shape('melee', { crit: true }), t);
    expect(steps[0]?.name).toBe('dark');
    expect(steps.filter((s) => s.name === 'cut')).toHaveLength(t.critCuts);
    expect(steps.some((s) => s.name === 'strike')).toBe(false);
    const total = t.entry + strikeDuration(shape('melee', { crit: true }), t) + t.exit;
    expect(total).toBeGreaterThanOrEqual(2000);
    expect(total).toBeLessThanOrEqual(2400);
  });

  it('un critique raté n’a ni écran assombri ni coupes', () => {
    const steps = strikeSteps(shape('melee', { crit: true, hit: false }), t);
    expect(steps.map((s) => s.name)).toEqual(['prep', 'dash', 'strike', 'impact', 'recoil', 'pose', 'back']);
  });

  it('un sort passe par le cercle runique puis se joue à la cible ; environ 1,6 à 1,9 s avec les transitions', () => {
    const steps = strikeSteps(shape('magic'), t);
    expect(steps.map((s) => s.name)).toEqual(['prep', 'rune', 'spell', 'impact', 'recoil', 'pose', 'settle']);
    const total = t.entry + strikeDuration(shape('magic'), t) + t.exit;
    expect(total).toBeGreaterThanOrEqual(1400);
    expect(total).toBeLessThanOrEqual(1900);
  });

  it('un sort critique est plus grand et commence par l’écran assombri', () => {
    const steps = strikeSteps(shape('magic', { crit: true }), t);
    expect(steps[0]?.name).toBe('dark');
    expect(steps.find((s) => s.name === 'spell')?.ms).toBe(t.spell.crit);
    expect(t.spell.crit).toBeGreaterThan(t.spell.cast);
  });

  it('les critiques « tourbillon » et « bond » remplacent dash et coupes par leur chorégraphie, sans dépasser 3 s', () => {
    for (const style of ['tourbillon', 'bond'] as const) {
      const steps = strikeSteps(shape('melee', { crit: true, style }), t);
      expect(steps.map((s) => s.name)).toEqual(['dark', 'prep', 'choreo', 'impact', 'recoil', 'pose', 'back']);
      expect(steps.find((s) => s.name === 'choreo')?.ms).toBe(choreoDuration(style, t));
      expect(t.entry + strikeDuration(shape('melee', { crit: true, style }), t) + t.exit).toBeLessThanOrEqual(3000);
    }
    // Un coup ordinaire ne change pas avec le style.
    expect(strikeSteps(shape('melee', { style: 'bond' }), t).map((s) => s.name)).toEqual(['prep', 'dash', 'strike', 'impact', 'recoil', 'pose', 'back']);
  });

  it('un tir lève l’arme puis lance le projectile, sans dash', () => {
    expect(strikeSteps(shape('ranged'), t).map((s) => s.name)).toEqual(['prep', 'draw', 'fly', 'impact', 'recoil', 'pose', 'settle']);
  });

  it('la double attaque ajoute environ 0,9 s (pas de préparation)', () => {
    const repeat = strikeDuration(shape('melee', { repeat: true }), t);
    expect(repeat).toBeGreaterThanOrEqual(800);
    expect(repeat).toBeLessThanOrEqual(1000);
    expect(strikeSteps(shape('melee', { repeat: true }), t)[0]?.name).toBe('dash');
  });

  it('stepAt donne l’étape en cours', () => {
    const steps = strikeSteps(shape('melee'), t);
    expect(stepAt(steps, 0)?.name).toBe('prep');
    expect(stepAt(steps, t.prep + 1)?.name).toBe('dash');
    expect(stepAt(steps, 99999)?.name).toBe('back');
  });
});

describe('critère « vitesse acceptable » (n°209)', () => {
  const ordinary = exchangeShapes([strike('a', 'b'), strike('b', 'a', { counter: true })], () => 'melee');

  it('coup + riposte de mêlée : sous le budget en « Normales » et en « Rapides »', () => {
    expect(exchangeDuration(ordinary, t, 1)).toBeLessThanOrEqual(t.budget.normal);
    expect(exchangeDuration(ordinary, t, 0.5)).toBeLessThanOrEqual(t.budget.fast);
  });

  it('tous les gestes tiennent le budget pour un échange ordinaire', () => {
    for (const a of ['melee', 'ranged', 'magic'] as const) {
      for (const b of ['melee', 'ranged', 'magic'] as const) {
        const shapes = exchangeShapes([strike('a', 'b'), strike('b', 'a', { counter: true })], (id) => (id === 'a' ? a : b));
        expect(exchangeDuration(shapes, t, 1)).toBeLessThanOrEqual(t.budget.normal);
        expect(exchangeDuration(shapes, t, 0.5)).toBeLessThanOrEqual(t.budget.fast);
      }
    }
  });

  it('Rapides divise la durée par deux ; rien à jouer sans coup', () => {
    expect(exchangeDuration(ordinary, t, 0.5)).toBe(Math.round(exchangeDuration(ordinary, t, 1) / 2));
    expect(exchangeDuration([], t, 1)).toBe(0);
  });

  it('le second coup d’une même unité est répété, même après la riposte', () => {
    const shapes = exchangeShapes([strike('a', 'b'), strike('b', 'a', { counter: true }), strike('a', 'b')], () => 'melee');
    expect(shapes.map((s) => s.repeat)).toEqual([false, false, true]);
  });
});

describe('images d’une animation peinte', () => {
  const steps = strikeSteps(shape('melee'), t);
  const hitAt = steps.find((s) => s.name === 'strike')?.at ?? 0;

  it('l’image d’impact tombe au début de la frappe, la dernière à la fin de la pose', () => {
    expect(frameAt(steps, 0, 9, 5)).toBe(0);
    expect(frameAt(steps, hitAt - 1, 9, 5)).toBeLessThan(5);
    expect(frameAt(steps, hitAt, 9, 5)).toBe(5);
    expect(frameAt(steps, 99999, 9, 5)).toBe(8);
  });

  it('les images avancent sans jamais reculer', () => {
    let last = 0;
    for (let ms = 0; ms < strikeDuration(shape('melee'), t); ms += 10) {
      const f = frameAt(steps, ms, 9, 5);
      expect(f).toBeGreaterThanOrEqual(last);
      last = f;
    }
  });

  it('incantation : élan, boucle en aller-retour pendant le sort, puis lancement', () => {
    const cast = strikeSteps(shape('magic'), t);
    const spell = cast.find((s) => s.name === 'spell');
    if (!spell) throw new Error('pas de sort');
    const loop: [number, number] = [5, 9];
    expect(castFrameAt(cast, 0, 16, loop, 11)).toBe(0);
    expect(castFrameAt(cast, spell.at - 1, 16, loop, 11)).toBeLessThanOrEqual(5);
    const during = Array.from({ length: Math.floor(spell.ms / 20) }, (_, i) => castFrameAt(cast, spell.at + i * 20, 16, loop, 11));
    expect(Math.min(...during)).toBe(5);
    expect(Math.max(...during)).toBe(9);
    expect(castFrameAt(cast, spell.at + spell.ms, 16, loop, 11)).toBe(11);
    expect(castFrameAt(cast, 99999, 16, loop, 11)).toBe(15);
  });

  it('une seule image : toujours la même', () => {
    expect(frameAt(steps, 500, 1, 0)).toBe(0);
  });
});

describe('styles de critique', () => {
  it('l’arme décide, une feuille peinte peut imposer le sien', () => {
    expect(critStyleFor(weapon('epee_de_fer'), null, anims)).toBe('tourbillon');
    expect(critStyleFor(weapon('hache_de_brakk'), null, anims)).toBe('bond');
    expect(critStyleFor(weapon('lance_d_estoc'), null, anims)).toBe('assaut');
    expect(critStyleFor(weapon('epee_de_fer'), anims.fighters['heros'] ?? null, anims)).toBe('bond');
  });
});

describe('coupures (GDD §11.5)', () => {
  it('la coupure suit le type d’arme', () => {
    expect(slashFor(weapon('epee_de_fer'), anims)).toBe('diagonale');
    expect(slashFor(weapon('dagues_jumelles'), anims)).toBe('croix');
    expect(slashFor(weapon('hache_de_brakk'), anims)).toBe('arc');
  });

  it('un critique enchaîne la coupure de l’arme puis les deux autres', () => {
    expect(critSlashes('arc', 3)).toEqual(['arc', 'diagonale', 'croix']);
    expect(critSlashes('diagonale', 2)).toEqual(['diagonale', 'croix']);
    expect(new Set(critSlashes('croix', 3)).size).toBe(3);
  });
});

describe('gestes, projectiles et fonds', () => {
  it('l’arme et la distance décident du geste', () => {
    expect(attackKind(weapon('epee_de_fer'), 1)).toBe('melee');
    expect(attackKind(weapon('lance_d_estoc'), 2)).toBe('ranged');
    expect(attackKind(weapon('arc_long'), 2)).toBe('ranged');
    expect(attackKind(weapon('tome_des_cendres'), 1)).toBe('magic');
    expect(attackKind(weapon('trident_de_maree'), 2)).toBe('magic');
  });

  it('les projectiles suivent le type d’arme', () => {
    expect(projectileFor(weapon('epee_de_fer'), 'melee', anims)).toBeNull();
    expect(projectileFor(weapon('arc_long'), 'ranged', anims)).toBe('fleche');
    expect(projectileFor(weapon('arbalete_a_verin'), 'ranged', anims)).toBe('carreau');
    expect(projectileFor(weapon('harpon_lourd'), 'ranged', anims)).toBe('harpon');
    expect(projectileFor(weapon('tome_des_cendres'), 'magic', anims)).toBe('orbe');
    expect(projectileFor(weapon('fioles_d_automne'), 'magic', anims)).toBe('fiole');
  });

  it('chaque terrain a un fond ; la Citadelle impose le sien', () => {
    for (const terrain of data.terrains) expect(backdropFor(terrain.id, 'z1', anims)).toBeTruthy();
    expect(backdropFor('foret', 'z2', anims)).toBe('foret');
    expect(backdropFor('village', 'z1', anims)).toBe('village');
    expect(backdropFor('plaine', 'z5', anims)).toBe('citadelle');
  });
});

describe('découpage des événements (n°205)', () => {
  const combat = (a: string, d: string, skillId?: string): BattleEvent => ({ type: 'combat', attackerId: a, defenderId: d, strikes: [strike(a, d)], ...(skillId ? { skillId } : {}) });
  const all = () => true;

  it('un échange ouvre l’écran rapproché ; le KO d’une unité de l’échange qui suit s’y joue', () => {
    const events: BattleEvent[] = [{ type: 'move', unitId: 'a', path: [] }, combat('a', 'b'), { type: 'ko', unitId: 'b' }, { type: 'outcome', outcome: 'victory' }];
    const segs = planSegments(events, all);
    expect(segs.map((s) => s.kind)).toEqual(['event', 'closeup', 'event']);
    const close = segs[1];
    expect(close?.kind === 'closeup' && close.falls).toEqual(['b']);
  });

  it('un soin au bâton passe dans l’écran rapproché ; un soin de terrain reste sur la carte', () => {
    const staff: BattleEvent = { type: 'heal', unitId: 'b', amount: 8, sourceId: 'a' };
    const village: BattleEvent = { type: 'heal', unitId: 'b', amount: 4 };
    expect(planSegments([staff, village], all).map((s) => s.kind)).toEqual(['heal', 'event']);
  });

  it('une compétence de zone reste sur la carte', () => {
    const segs = planSegments([combat('a', 'b', 'nuee_de_braises')], (c) => c.skillId !== 'nuee_de_braises');
    expect(segs[0]?.kind).toBe('event');
  });

  it('une citation de mort entre l’échange et la chute garde son ordre', () => {
    const scene: BattleEvent = { type: 'scene', sceneId: 's', kind: 'death', enemyId: 'gorm', unitId: null, failed: false };
    const segs = planSegments([combat('a', 'b'), scene, { type: 'ko', unitId: 'b' }], all);
    expect(segs.map((s) => s.kind)).toEqual(['closeup', 'event', 'event']);
    expect(segs[0]?.kind === 'closeup' && segs[0].falls).toEqual([]);
  });

  it('le KO d’une autre unité n’entre pas dans l’écran', () => {
    const segs = planSegments([combat('a', 'b'), { type: 'ko', unitId: 'c' }], all);
    expect(segs.map((s) => s.kind)).toEqual(['closeup', 'event']);
  });

  it('les deux unités de l’échange peuvent tomber', () => {
    const segs = planSegments([combat('a', 'b'), { type: 'ko', unitId: 'a' }, { type: 'ko', unitId: 'b' }], all);
    expect(segs).toHaveLength(1);
    expect(segs[0]?.kind === 'closeup' && segs[0].falls).toEqual(['a', 'b']);
  });

  it('rien n’est perdu ni réordonné', () => {
    const events: BattleEvent[] = [combat('a', 'b'), { type: 'ko', unitId: 'b' }, { type: 'xp', unitId: 'a', amount: 30, bonus: 0, before: { level: 1, xp: 0 }, after: { level: 1, xp: 30 }, levelUps: [] }];
    const segs = planSegments(events, all);
    const replay = segs.flatMap((s): BattleEvent[] => (s.kind === 'event' ? [s.event] : s.kind === 'heal' ? [s.heal] : [s.combat, ...s.falls.map((unitId): BattleEvent => ({ type: 'ko', unitId }))]));
    expect(replay).toEqual(events);
  });
});

describe('fonds et socles peints par code (n°208)', () => {
  const luminance = (c: number): number => 0.299 * ((c >> 16) & 255) + 0.587 * ((c >> 8) & 255) + 0.114 * (c & 255);

  for (const id of BACKDROP_IDS) {
    it(`« ${id} » : 320×180 entièrement peint, sombres teintés, identique d'un appel à l'autre`, () => {
      const img = paintBackdrop(id);
      expect([img.width, img.height]).toEqual([BACKDROP_W, BACKDROP_H]);
      for (const c of img.pixels) {
        expect(c).toBeGreaterThanOrEqual(0);
        if (luminance(c) >= 60) continue;
        const r = (c >> 16) & 255;
        const g = (c >> 8) & 255;
        const b = c & 255;
        expect(Math.max(r, g, b) - Math.min(r, g, b)).toBeGreaterThan(8);
      }
      expect(paintBackdrop(id).pixels).toEqual(img.pixels);
    });

    it(`socle « ${id} » : dessus éclairé à gauche, bords transparents`, () => {
      const img = paintPlatform(id);
      expect(img.width).toBe(PLATFORM_W);
      expect(img.pixels[0]).toBe(-1);
      expect(img.pixels.some((c) => c >= 0)).toBe(true);
    });
  }

  it('chaque fond de battleAnims.json existe', () => {
    for (const id of [anims.backdrops.default, ...Object.values(anims.backdrops.terrains), ...Object.values(anims.backdrops.zones)]) expect(BACKDROP_IDS).toContain(id);
  });
});
