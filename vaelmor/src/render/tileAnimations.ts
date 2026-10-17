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
    t._animationDataTexture?.destroy();
    t._animationDataTexture = renderer.createUint8ArrayTexture(new Uint8Array(pack.data.buffer), pack.width, pack.height, false, false);
    t._animationDataIndexMap = pack.indexMap;
    t.maxAnimationLength = pack.maxLength;
  };
  t.createAnimationDataTexture = build;
  build();
}
