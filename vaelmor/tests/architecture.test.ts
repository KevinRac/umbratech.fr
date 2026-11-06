/**
 * Garde-fous d'architecture (GDD §16.1) : la logique et les données ne
 * dépendent ni de Phaser ni des couches de rendu. (L'absence d'API du DOM est
 * vérifiée à la compilation par tsconfig.pure.json.)
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC = resolve(import.meta.dirname, '..', 'src');

function tsFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return tsFiles(path);
    return path.endsWith('.ts') ? [path] : [];
  });
}

function imports(file: string): string[] {
  const source = readFileSync(file, 'utf8');
  return [...source.matchAll(/(?:import|export)[^'"]*?from\s*['"]([^'"]+)['"]/g)].map((m) => m[1] as string);
}

/** Couches de rendu et d'entrées-sorties, interdites à la logique et aux données. `src/logic/world` est de la logique, pas `src/world`. */
const FORBIDDEN_LAYERS = new Set(['core', 'render', 'scenes', 'ui', 'world', 'audio', 'debug']);

/** Vrai si l'import vise Phaser ou une couche interdite (le chemin relatif est résolu : `../world/x` depuis `logic/game` est `logic/world`, autorisé). */
function isForbiddenImport(file: string, spec: string): boolean {
  if (spec === 'phaser') return true;
  if (!spec.startsWith('.')) return false;
  const target = relative(SRC, resolve(dirname(file), spec));
  const layer = target.split(/[\\/]/)[0] ?? '';
  return FORBIDDEN_LAYERS.has(layer);
}

describe('architecture en couches', () => {
  for (const layer of ['logic', 'data']) {
    it(`src/${layer} n'importe ni Phaser ni les couches de rendu`, () => {
      const offenders = tsFiles(join(SRC, layer)).flatMap((file) =>
        imports(file)
          .filter((spec) => isForbiddenImport(file, spec))
          .map((spec) => `${relative(SRC, file)} → ${spec}`),
      );
      expect(offenders).toEqual([]);
    });
  }

  it('aucun Math.random dans la logique (utiliser Rng)', () => {
    const offenders = tsFiles(join(SRC, 'logic')).filter((file) => /Math\.random\s*\(/.test(readFileSync(file, 'utf8')));
    expect(offenders.map((f) => relative(SRC, f))).toEqual([]);
  });
});

describe('ressources du moteur (audit M10)', () => {
  it('chaque scène qui crée une carte à couches GPU la libère à son arrêt', () => {
    // Phaser 4.2.1 ne rend pas les textures de données des couches GPU : sans
    // `releaseGpuTilemapOnShutdown`, chaque aller-retour monde ↔ combat gardait ~0,6 Mo.
    const offenders = tsFiles(join(SRC, 'scenes')).filter((file) => {
      const source = readFileSync(file, 'utf8');
      return source.includes('.createLayer(') && !source.includes('releaseGpuTilemapOnShutdown(this, ');
    });
    expect(offenders.map((f) => relative(SRC, f))).toEqual([]);
  });

  it('l\u2019écran rapproché arrête ses tweens qui bouclent en démontant la scène (lot G)', () => {
    // La respiration des combattants, l'aura d'un boss et les lignes de vitesse tournent avec `repeat: -1` :
    // sans `killTweensOf` au démontage, chaque échange en laissait deux de plus (+26 Ko de tas par échange).
    const source = readFileSync(join(SRC, 'scenes', 'BattleCloseupScene.ts'), 'utf8');
    const teardown = /private teardown\(\): void \{[\s\S]*?\n  \}\n/.exec(source)?.[0] ?? '';
    expect(teardown).toContain('this.tweens.killTweensOf(');
    expect(teardown).toContain('breath?.remove()');
  });

  it('une texture du moteur se rend par deleteTexture (destroy seul la laisse dans la liste du moteur)', () => {
    const offenders = tsFiles(SRC).filter((file) => /_animationDataTexture\?\.destroy\(|layerDataTexture\?\.destroy\(/.test(readFileSync(file, 'utf8')));
    expect(offenders.map((f) => relative(SRC, f))).toEqual([]);
  });
});
