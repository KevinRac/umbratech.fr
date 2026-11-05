/**
 * Carte de l'île posée dans une scène (jalon M10, décision n°233) : le
 * parchemin (`render/islandMap.ts`), les repères des lieux visités, le héros
 * qui clignote et, en voyage, l'anneau de la destination choisie. Utilisée par
 * l'écran de la carte (N) et l'onglet Carte du menu.
 */
import Phaser from 'phaser';
import type { ZoneDef } from '../data/schemas';
import type { WorldMap } from '../data/worldMap';
import { islandMarkers, type IslandMarker, type MarkerContext, type MarkerKind } from '../logic/world/islandMarkers';
import { cellCenter, paintIslandMap } from '../render/islandMap';
import { PALETTE } from '../render/palette';
import { PixelCanvas } from '../render/pixelCanvas';
import { addText } from './text';

export interface IslandMapViewOptions {
  readonly x: number;
  readonly y: number;
  /** Pixels par case du monde (entier). */
  readonly cell: number;
  readonly depth: number;
  readonly map: WorldMap;
  readonly zones: readonly ZoneDef[];
  readonly discoveredZones: readonly string[];
  readonly markers: MarkerContext;
  /** Pieds du héros, en pixels du monde. */
  readonly hero: { readonly x: number; readonly y: number };
  /** Noms des lieux habités écrits sur la carte. */
  readonly labels: boolean;
  /** Agrandissement entier de l'interface (texte). */
  readonly scale: number;
}

/** Icônes de 7 × 7 au plus, une lettre par couleur (o contour, puis teintes). */
const ICONS: Readonly<Record<MarkerKind | 'skull' | 'hero' | 'quest', readonly string[]>> = {
  village: ['...o...', '..oro..', '.orrro.', 'ooooooo', '.owwwo.', '.owdwo.', '.ooooo.'],
  ville: ['o.o.o.o', 'ooooooo', 'owwwwwo', 'owwdwwo', 'owwdwwo', 'ooooooo'],
  autel: ['..c..', '.ccc.', '.cwc.', '.cwc.', 'ooooo', '.opo.', 'ooooo'],
  donjon: ['.o.o.', 'ooooo', 'oppPo', 'opdpo', 'opdpo', 'ooooo'],
  camp: ['...o...', '..ooo..', '.orror.', 'orrdrro', 'ooooooo'],
  poi: ['.o.', 'oyo', '.o.'],
  skull: ['.ooo.', 'owwwo', 'odwdo', 'owwwo', '.oWo.'],
  hero: ['..o..', '.oyo.', 'oyyyo', '.oyo.', '..o..'],
  quest: ['oyo', 'oyo', 'oyo', 'ooo', 'oyo', 'ooo'],
};

const ICON_COLORS: Readonly<Record<string, number>> = {
  o: PALETTE.ombreProfonde,
  r: PALETTE.terreCuite,
  w: PALETTE.parchemin,
  W: PALETTE.pierre,
  d: PALETTE.terreSombre,
  c: PALETTE.cyanEclat,
  p: PALETTE.grisRoux,
  P: PALETTE.violetPale,
  y: PALETTE.lumiereDoree,
};

function iconKey(name: string): string {
  return `islandmap:icon:${name}`;
}

function ensureIcons(scene: Phaser.Scene): void {
  for (const [name, rows] of Object.entries(ICONS)) {
    const key = iconKey(name);
    if (scene.textures.exists(key)) continue;
    const w = Math.max(...rows.map((r) => r.length));
    const canvas = new PixelCanvas(w, rows.length);
    rows.forEach((row, y) =>
      [...row].forEach((ch, x) => {
        const c = ICON_COLORS[ch];
        if (c !== undefined) canvas.set(x, y, c);
      }),
    );
    canvas.toTexture(scene, key);
  }
}

/** Texture du parchemin (une par taille et par ensemble de zones visitées). */
function ensureParchment(scene: Phaser.Scene, o: IslandMapViewOptions): string {
  const values = o.zones.filter((z) => o.discoveredZones.includes(z.id)).map((z) => z.value);
  const key = `islandmap:${o.cell}:${values.sort().join('-')}`;
  if (scene.textures.exists(key)) return key;
  const image = paintIslandMap({ map: o.map, discoveredZones: new Set(values), cell: o.cell });
  const canvas = new PixelCanvas(image.width, image.height);
  for (let i = 0; i < image.pixels.length; i++) canvas.set(i % image.width, Math.floor(i / image.width), image.pixels[i] as number);
  canvas.toTexture(scene, key);
  return key;
}

export class IslandMapView {
  readonly width: number;
  readonly height: number;
  readonly markers: readonly IslandMarker[];
  private readonly objects: Phaser.GameObjects.GameObject[] = [];
  private readonly ring: Phaser.GameObjects.Arc;
  private readonly heroIcon: Phaser.GameObjects.Image;
  private readonly timer: Phaser.Time.TimerEvent;

  constructor(
    scene: Phaser.Scene,
    private readonly o: IslandMapViewOptions,
  ) {
    ensureIcons(scene);
    const k = o.cell >= 4 ? 2 : 1;
    const key = ensureParchment(scene, o);
    const image = scene.add.image(o.x, o.y, key).setOrigin(0, 0).setDepth(o.depth);
    this.width = image.width;
    this.height = image.height;
    this.objects.push(image);
    this.markers = islandMarkers(o.map, o.zones, o.markers);
    for (const m of this.markers) {
      const p = this.point(m.tx, m.ty);
      const icon = scene.add.image(p.x, p.y, iconKey(m.kind)).setScale(k).setDepth(o.depth + 2);
      this.objects.push(icon);
      if (m.cleared) this.objects.push(scene.add.image(p.x + 4 * k, p.y - 4 * k, iconKey('skull')).setScale(k).setDepth(o.depth + 3).setAlpha(0.9));
      if (m.quest) {
        const q = scene.add.image(p.x + 5 * k, p.y - 6 * k, iconKey('quest')).setScale(k).setDepth(o.depth + 3);
        if (m.quest === 'active') q.setAlpha(0.6);
        this.objects.push(q);
      }
      if (o.labels && (m.kind === 'village' || m.kind === 'ville')) {
        const label = addText(scene, p.x, p.y + 5 * k, m.name, { font: k > 1 ? 'body' : 'small', scale: o.scale, color: PALETTE.ombreProfonde, shadow: PALETTE.parchemin, shadowOffset: 1, align: 'center' }).setDepth(o.depth + 3);
        this.objects.push(label);
      }
    }
    const hp = this.point(o.hero.x / o.map.tileSize, o.hero.y / o.map.tileSize);
    this.heroIcon = scene.add.image(hp.x, hp.y, iconKey('hero')).setScale(k).setDepth(o.depth + 5);
    this.ring = scene.add.circle(0, 0, 8 * k).setStrokeStyle(k, PALETTE.lumiereDoree, 1).setDepth(o.depth + 4).setVisible(false);
    this.objects.push(this.heroIcon, this.ring);
    let on = true;
    this.timer = scene.time.addEvent({ delay: 400, loop: true, callback: () => this.heroIcon.setAlpha((on = !on) ? 1 : 0.35) });
  }

  /** Point de la carte (pixels de la scène) d'une case du monde (fractionnaire permis). */
  point(tx: number, ty: number): { x: number; y: number } {
    const c = cellCenter(this.o.cell, Math.floor(tx), Math.floor(ty));
    return { x: this.o.x + c.x, y: this.o.y + c.y };
  }

  /** Anneau autour d'un point du monde (en pixels du monde), ou rien. */
  highlight(at: { x: number; y: number } | null): void {
    if (!at) {
      this.ring.setVisible(false);
      return;
    }
    const p = this.point(at.x / this.o.map.tileSize, (at.y - 1) / this.o.map.tileSize);
    this.ring.setPosition(p.x, p.y).setVisible(true);
  }

  destroy(): void {
    this.timer.remove();
    for (const object of this.objects) object.destroy();
    this.objects.length = 0;
  }
}

/** Contexte des repères tiré de la partie : lieux visités, drapeaux, quêtes non terminées et lieu de leur donneur. */
export function markerContext(
  discovered: readonly string[],
  flags: readonly string[],
  quests: Readonly<Record<string, string>>,
  giverLocation: (questId: string) => string | null,
): MarkerContext {
  const list: { location: string; status: 'active' | 'ready' }[] = [];
  for (const [id, status] of Object.entries(quests)) {
    if (status !== 'active' && status !== 'ready') continue;
    const location = giverLocation(id);
    if (location) list.push({ location, status });
  }
  return { discovered, flags, quests: list };
}
