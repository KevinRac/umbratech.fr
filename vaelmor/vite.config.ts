import { rename } from 'node:fs/promises';
import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';

/**
 * Vaelmor — configuration Vite.
 *
 * - Racine : le dossier `vaelmor/`. L'entrée du jeu est `game.html` ; la page
 *   d'attente `index.html` n'est pas touchée par le build.
 * - Build : `vaelmor/play/` (commité, servi tel quel par le serveur, décision n°29),
 *   avec des chemins relatifs (`base: './'`).
 * - Les assets restent dans `vaelmor/assets/` et `vaelmor/music/` : ils ne sont
 *   pas copiés dans `play/`. Le chemin de base est injecté via `__ASSET_BASE__`
 *   (`./` en développement, `../` une fois servi depuis `play/`).
 */
const OUT_DIR = 'play';
const ENTRY = 'game.html';

/** Renomme `play/game.html` en `play/index.html` après le build. */
function entryAsIndex(): Plugin {
  return {
    name: 'vaelmor-entry-as-index',
    apply: 'build',
    async closeBundle() {
      const outDir = resolve(import.meta.dirname, OUT_DIR);
      await rename(resolve(outDir, ENTRY), resolve(outDir, 'index.html'));
    },
  };
}

export default defineConfig(({ command }) => ({
  root: import.meta.dirname,
  base: './',
  publicDir: false,
  define: {
    __ASSET_BASE__: JSON.stringify(command === 'build' ? '../' : './'),
    __GAME_VERSION__: JSON.stringify(process.env.npm_package_version ?? '0.0.0'),
  },
  build: {
    outDir: OUT_DIR,
    emptyOutDir: true,
    assetsDir: 'js',
    target: 'es2022',
    chunkSizeWarningLimit: 2000,
    rolldownOptions: {
      input: resolve(import.meta.dirname, ENTRY),
    },
  },
  server: {
    open: `/${ENTRY}`,
  },
  plugins: [entryAsIndex()],
}));
