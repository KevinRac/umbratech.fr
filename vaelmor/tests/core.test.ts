import { describe, expect, it, vi } from 'vitest';
import { assetUrl } from '../src/core/config';
import { titleZoomFor, uiScaleFor, worldZoomFor, zoomOrigin } from '../src/core/viewport';
import { EventBus } from '../src/core/events';
import { ANIM_SPEED_FACTOR, nextAnimSpeed, parseAnimSpeed } from '../src/core/settings';

describe('tailles d’affichage (canevas non étiré)', () => {
  it('zoom du monde entier, croissant avec la hauteur, borné', () => {
    expect(worldZoomFor(1080)).toBe(4);
    expect(worldZoomFor(720)).toBe(2);
    expect(worldZoomFor(1440)).toBe(5);
    expect(worldZoomFor(100)).toBe(2);
    expect(worldZoomFor(10000)).toBe(8);
    for (const h of [600, 768, 900, 1080, 1200, 1440, 2160]) expect(Number.isInteger(worldZoomFor(h))).toBe(true);
  });

  it('échelle d’interface entière, au moins ×1', () => {
    expect(uiScaleFor(1080)).toBe(2);
    expect(uiScaleFor(540)).toBe(1);
    expect(uiScaleFor(768)).toBe(1);
    expect(uiScaleFor(100)).toBe(1);
    expect(uiScaleFor(2160)).toBe(4);
  });

  it('zoom du titre : plus grand entier qui tient', () => {
    expect(titleZoomFor(1920, 1080, 480, 270)).toBe(4);
    expect(titleZoomFor(1000, 2000, 480, 270)).toBe(2);
    expect(titleZoomFor(300, 200, 480, 270)).toBe(1);
  });

  it('origine de caméra : nulle sans zoom, et alignement exact des pixels avec zoom', () => {
    expect(zoomOrigin(1920, 1080, 1)).toEqual({ x: 0, y: 0 });
    const o = zoomOrigin(1920, 1080, 4);
    // Position écran d'un point du monde x pour un défilement (cam - origine) : (x - cam) * zoom.
    const cam = 123;
    const scroll = cam - o.x;
    const screenX = (50 - scroll - 1920 / 2) * 4 + 1920 / 2;
    expect(screenX).toBe((50 - cam) * 4);
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

describe('vitesse des animations de combat (GDD §11.1)', () => {
  it('lecture prudente, cycle Normales → Rapides → Désactivées, facteurs', () => {
    expect(parseAnimSpeed('fast')).toBe('fast');
    expect(parseAnimSpeed('turbo')).toBe('normal');
    expect(parseAnimSpeed(undefined)).toBe('normal');
    expect(nextAnimSpeed('normal')).toBe('fast');
    expect(nextAnimSpeed('fast')).toBe('off');
    expect(nextAnimSpeed('off')).toBe('normal');
    expect(ANIM_SPEED_FACTOR).toEqual({ normal: 1, fast: 0.5, off: 0 });
  });
});
