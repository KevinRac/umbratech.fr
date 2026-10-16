/**
 * Garde-fous d'architecture (GDD §16.1) : la logique et les données ne
 * dépendent ni de Phaser ni des couches de rendu. (L'absence d'API du DOM est
 * vérifiée à la compilation par tsconfig.pure.json.)
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
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

const FORBIDDEN_FROM_PURE = /^phaser$|\/(core|render|scenes|ui|world|audio|debug)\//;

describe('architecture en couches', () => {
  for (const layer of ['logic', 'data']) {
    it(`src/${layer} n'importe ni Phaser ni les couches de rendu`, () => {
      const offenders = tsFiles(join(SRC, layer)).flatMap((file) =>
        imports(file)
          .filter((spec) => FORBIDDEN_FROM_PURE.test(spec))
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
