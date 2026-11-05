/**
 * Carte de l'île (touche N ; jalon M10, décisions n°233 et n°234).
 *
 * À gauche, le parchemin et ses repères ; à droite, le lieu du héros, la
 * légende et, quand le héros se tient à un autel ou dans un lieu habité, la
 * liste des destinations du voyage rapide. Choisir une destination (clavier ou
 * souris) place un anneau sur la carte ; Entrée ou un clic lance le voyage.
 */
import Phaser from 'phaser';
import { ActionInput } from '../core/input';
import { uiScaleFor } from '../core/viewport';
import type { ZoneDef } from '../data/schemas';
import type { WorldMap } from '../data/worldMap';
import type { MarkerContext } from '../logic/world/islandMarkers';
import type { TravelPoint } from '../logic/world/travel';
import { PALETTE } from '../render/palette';
import { IslandMapView } from '../ui/islandMapView';
import { drawPanel } from '../ui/panel';
import { addText } from '../ui/text';
import { VerticalMenu } from '../ui/VerticalMenu';
import { SCENES } from './keys';

export interface IslandMapSceneData {
  readonly map: WorldMap;
  readonly zones: readonly ZoneDef[];
  readonly discoveredZones: readonly string[];
  readonly markers: MarkerContext;
  readonly hero: { readonly x: number; readonly y: number };
  /** Lieu et zone du héros, en toutes lettres. */
  readonly here: string;
  /** Destinations du voyage (vide : pas de voyage d'ici). */
  readonly destinations: readonly TravelPoint[];
  /** Pourquoi on ne peut pas voyager d'ici (affiché à la place de la liste). */
  readonly travelNote: string | null;
  readonly onTravel: (point: TravelPoint) => void;
  readonly onClose: () => void;
}

const DEPTH = 650;
const LEGEND: readonly [string, string][] = [
  ['village', 'Lieu habité'],
  ['autel', 'Autel des Lanternes'],
  ['donjon', 'Repaire'],
  ['skull', 'Repaire vaincu'],
  ['quest', 'Quête à rendre'],
  ['hero', 'Toi'],
];

export class IslandMapScene extends Phaser.Scene {
  private actions!: ActionInput;
  private params!: IslandMapSceneData;
  private view: IslandMapView | null = null;
  private menu: VerticalMenu | null = null;
  private closed = false;

  constructor() {
    super(SCENES.islandMap);
  }

  create(params: IslandMapSceneData): void {
    this.params = params;
    this.closed = false;
    this.actions = new ActionInput(this);
    const S = uiScaleFor(this.scale.height);
    const { width, height } = this.scale;
    this.add.rectangle(0, 0, width, height, PALETTE.nuit, 0.94).setOrigin(0, 0).setDepth(DEPTH).setInteractive();
    const cell = 4 * S;
    const mapX = 16 * S;
    const mapY = Math.round((height - params.map.height * cell) / 2) - 4 * S;
    drawPanel(this, mapX - 6 * S, mapY - 6 * S, params.map.width * cell + 12 * S, params.map.height * cell + 12 * S, { scale: 2 * S, fill: PALETTE.terreSombre, fillAlpha: 1 }).setDepth(DEPTH + 1);
    this.view = new IslandMapView(this, {
      x: mapX,
      y: mapY,
      cell,
      depth: DEPTH + 2,
      map: params.map,
      zones: params.zones,
      discoveredZones: params.discoveredZones,
      markers: params.markers,
      hero: params.hero,
      labels: true,
      scale: S,
    });

    // Colonne de droite.
    const colX = mapX + params.map.width * cell + 16 * S;
    const colW = width - colX - 14 * S;
    drawPanel(this, colX, mapY - 6 * S, colW, params.map.height * cell + 12 * S, { scale: 2 * S }).setDepth(DEPTH + 1);
    const tx = colX + 12 * S;
    let y = mapY + 6 * S;
    addText(this, tx, y, 'Vaelmor', { font: 'title', scale: 2 * S, color: PALETTE.lumiereDoree }).setDepth(DEPTH + 2);
    y += 34 * S;
    addText(this, tx, y, params.here, { scale: S, color: PALETTE.cyanEclat, maxWidth: colW - 24 * S }).setDepth(DEPTH + 2);
    y += 30 * S;
    for (const [icon, label] of LEGEND) {
      this.add.image(tx + 8 * S, y + 8 * S, `islandmap:icon:${icon}`).setScale(2 * S).setDepth(DEPTH + 2);
      addText(this, tx + 22 * S, y, label, { scale: S, color: PALETTE.metalClair }).setDepth(DEPTH + 2);
      y += 19 * S;
    }
    y += 10 * S;
    this.add.rectangle(tx, y, colW - 24 * S, S, PALETTE.metal, 0.8).setOrigin(0, 0).setDepth(DEPTH + 2);
    y += 10 * S;
    addText(this, tx, y, 'VOYAGER', { font: 'small', scale: 2 * S, color: PALETTE.lumiereDoree }).setDepth(DEPTH + 2);
    y += 22 * S;
    if (params.destinations.length > 0) {
      const lineHeight = 20 * S;
      const room = Math.floor((mapY + params.map.height * cell - y) / lineHeight);
      const shown = params.destinations.slice(0, Math.max(1, room));
      this.menu = new VerticalMenu(
        this,
        tx - 4 * S,
        y,
        shown.map((p) => ({ label: p.name, onSelect: () => this.travel(p) })),
        this.actions,
        { width: colW - 16 * S, lineHeight, depth: DEPTH + 3, scale: S },
      );
      this.menu.onChange((i) => this.view?.highlight(shown[i] ?? null));
      this.view.highlight(shown[0] ?? null);
    } else {
      addText(this, tx, y, params.travelNote ?? 'Aucune destination découverte.', { scale: S, color: PALETTE.metalClair, maxWidth: colW - 24 * S }).setDepth(DEPTH + 2);
    }
    const hint = params.destinations.length > 0 ? 'Haut/Bas : destination    Entrée / clic : voyager    Échap ou N : fermer' : 'Échap ou N : fermer';
    addText(this, width / 2, height - 18 * S, hint, { scale: S, color: PALETTE.metalClair, align: 'center' }).setDepth(DEPTH + 2);
    this.actions.consume('map');
    this.cameras.main.fadeIn(150, 0, 0, 0);
  }

  override update(): void {
    if (this.closed) return;
    if (this.actions.consume('cancel') || this.actions.consume('map')) {
      this.close();
      return;
    }
    this.menu?.update();
  }

  private travel(point: TravelPoint): void {
    if (this.closed) return;
    this.closed = true;
    this.cleanup();
    this.scene.stop();
    this.params.onTravel(point);
  }

  private close(): void {
    this.closed = true;
    this.cleanup();
    this.scene.stop();
    this.params.onClose();
  }

  private cleanup(): void {
    this.menu?.destroy();
    this.menu = null;
    this.view?.destroy();
    this.view = null;
  }
}
