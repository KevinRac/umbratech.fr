import { describe, expect, it, vi } from 'vitest';
import { assetUrl } from '../src/core/config';
import { computeDisplayScale } from '../src/core/displayScale';
import { EventBus } from '../src/core/events';

describe('mise à l’échelle entière', () => {
  it('écran 1080p : ×4', () => {
    const s = computeDisplayScale(1920, 1080, 1, 480, 270);
    expect(s.pixelsPerGamePixel).toBe(4);
    expect(s.cssZoom).toBe(4);
    expect([s.cssWidth, s.cssHeight]).toEqual([1920, 1080]);
  });

  it('écran à 125 % : entier en pixels physiques, fractionnaire en CSS', () => {
    // 1536×864 CSS × 1,25 = 1920×1080 physiques → ×4 physique = zoom CSS 3,2.
    const s = computeDisplayScale(1536, 864, 1.25, 480, 270);
    expect(s.pixelsPerGamePixel).toBe(4);
    expect(s.cssZoom).toBeCloseTo(3.2);
  });

  it('écran Retina : ×6 physique pour une fenêtre de 1440×900', () => {
    const s = computeDisplayScale(1440, 900, 2, 480, 270);
    expect(s.pixelsPerGamePixel).toBe(6);
    expect(s.cssZoom).toBe(3);
  });

  it('prend la contrainte la plus forte (fenêtre étroite)', () => {
    expect(computeDisplayScale(1000, 2000, 1, 480, 270).pixelsPerGamePixel).toBe(2);
  });

  it('ne descend jamais sous ×1 et ignore un devicePixelRatio invalide', () => {
    expect(computeDisplayScale(300, 200, 1, 480, 270).pixelsPerGamePixel).toBe(1);
    expect(computeDisplayScale(1920, 1080, 0, 480, 270).pixelsPerGamePixel).toBe(4);
    expect(computeDisplayScale(1920, 1080, Number.NaN, 480, 270).pixelsPerGamePixel).toBe(4);
  });
});

describe('EventBus', () => {
  type Events = { ping: { n: number }; done: undefined };

  it('transmet les événements aux abonnés et permet de se désabonner', () => {
    const bus = new EventBus<Events>();
    const handler = vi.fn();
    const off = bus.on('ping', handler);
    bus.emit('ping', { n: 1 });
    off();
    bus.emit('ping', { n: 2 });
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({ n: 1 });
  });

  it('once ne se déclenche qu’une fois', () => {
    const bus = new EventBus<Events>();
    const handler = vi.fn();
    bus.once('done', handler);
    bus.emit('done', undefined);
    bus.emit('done', undefined);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('un gestionnaire peut se désabonner pendant l’émission sans perturber les autres', () => {
    const bus = new EventBus<Events>();
    const second = vi.fn();
    const off = bus.on('ping', () => off());
    bus.on('ping', second);
    bus.emit('ping', { n: 1 });
    expect(second).toHaveBeenCalledTimes(1);
  });
});

describe('assetUrl', () => {
  it('construit un chemin relatif sans double barre', () => {
    expect(assetUrl('assets/fonts/tiny5.woff2')).toBe('./assets/fonts/tiny5.woff2');
    expect(assetUrl('/music/mus_title.mp3')).toBe('./music/mus_title.mp3');
  });
});
