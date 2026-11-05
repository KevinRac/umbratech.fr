/**
 * Contournement de deux défauts de Phaser 4.2.1 sur les tuiles animées des
 * couches GPU (`TilemapGPULayer`), constatés à l'étape 3 de la refonte
 * graphique (décision n°45) :
 *
 * 1. `Tileset.createAnimationDataTexture` range chaque animation sur DEUX
 *    texels, mais la table « tuile → animation » donne le NUMÉRO d'animation :
 *    le shader lit l'en-tête au mauvais endroit (seule la première animation
 *    tombe juste) ;
 * 2. la texture est envoyée retournée (`flipY`) alors que le shader la lit à
 *    l'endroit : dès qu'elle dépasse une ligne de 4096 texels, les lignes sont
 *    interverties.
 *
 * On remplace donc, sur le tileset, la construction de cette texture par
 * `packTileAnimations` (calcul pur, testé), à appeler AVANT de créer les couches.
 */
import Phaser from 'phaser';
import { packTileAnimations, type TileAnimFrame } from './tileAnimPack';

/** Version de Phaser pour laquelle les défauts ont été constatés (à revérifier à chaque mise à jour). */
const BUGGY_VERSION = '4.2.1';

interface TilesetInternals {
  tileData: Record<number, { animation?: TileAnimFrame[] } | undefined>;
  total: number;
  maxAnimationLength: number;
  _animationDataTexture: Phaser.Renderer.WebGL.Wrappers.WebGLTextureWrapper | null;
  _animationDataIndexMap: Map<number, number> | null;
  createAnimationDataTexture: (renderer?: Phaser.Renderer.WebGL.WebGLRenderer) => void;
}

export function fixGpuTileAnimations(tileset: Phaser.Tilemaps.Tileset, renderer: Phaser.Renderer.Canvas.CanvasRenderer | Phaser.Renderer.WebGL.WebGLRenderer): void {
  if (!(renderer instanceof Phaser.Renderer.WebGL.WebGLRenderer)) return;
  if (Phaser.VERSION !== BUGGY_VERSION) {
    console.warn(`Phaser ${Phaser.VERSION} : vérifier si le contournement des tuiles animées (render/tileAnimations.ts) est encore utile.`);
    return;
  }
  const t = tileset as unknown as TilesetInternals;
  const build = (): void => {
    const pack = packTileAnimations(t.tileData, t.total);
    // `deleteTexture` et non `destroy()` : seul le premier retire l'enveloppe de la liste du moteur (sinon elle fuit).
    if (t._animationDataTexture) renderer.deleteTexture(t._animationDataTexture);
    t._animationDataTexture = renderer.createUint8ArrayTexture(new Uint8Array(pack.data.buffer), pack.width, pack.height, false, false);
    t._animationDataIndexMap = pack.indexMap;
    t.maxAnimationLength = pack.maxLength;
  };
  t.createAnimationDataTexture = build;
  build();
}

interface GpuLayerInternals {
  layerDataTexture?: Phaser.Renderer.WebGL.Wrappers.WebGLTextureWrapper | null;
}

/**
 * Libère, à l'arrêt de la scène, les textures de données que Phaser 4.2.1 laisse
 * derrière une carte à couches GPU (audit M10 : chaque aller-retour monde ↔ combat
 * gardait ~0,6 Mo). `TilemapGPULayer` n'a pas de `destroy` qui rende sa
 * `layerDataTexture`, et le tileset garde sa texture d'animations : les deux
 * restent dans la liste des textures du moteur. À appeler juste après la création
 * des couches.
 */
export function releaseGpuTilemapOnShutdown(scene: Phaser.Scene, tilemap: Phaser.Tilemaps.Tilemap): void {
  const renderer = scene.renderer;
  if (!(renderer instanceof Phaser.Renderer.WebGL.WebGLRenderer)) return;
  // Les couches sont retenues dès maintenant : à l'arrêt, la scène les détruit avant ce rappel
  // et la carte ne les connaît plus.
  const layers = tilemap.layers.map((data) => data.tilemapLayer as unknown as GpuLayerInternals | null);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    for (const layer of layers) {
      if (layer?.layerDataTexture) {
        renderer.deleteTexture(layer.layerDataTexture);
        layer.layerDataTexture = null;
      }
    }
    for (const tileset of tilemap.tilesets) {
      const t = tileset as unknown as TilesetInternals;
      if (t._animationDataTexture) {
        renderer.deleteTexture(t._animationDataTexture);
        t._animationDataTexture = null;
      }
    }
    tilemap.destroy();
  });
}
