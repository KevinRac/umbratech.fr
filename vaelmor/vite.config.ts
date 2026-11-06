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

/** Renomme `play/game.html` en `play/index.html` après le build (dans le dossier de sortie réellement utilisé). */
function entryAsIndex(): Plugin {
  let outDir = resolve(import.meta.dirname, OUT_DIR);
  return {
    name: 'vaelmor-entry-as-index',
    apply: 'build',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir);
    },
    async closeBundle() {
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
      output: {
        // Lot G (n°246) : Phaser dans son propre fichier. Son contenu ne change qu'avec sa version
        // (4.2.1) : le navigateur le garde en cache d'une mise à jour du jeu à l'autre, et git ne
        // le réécrit pas à chaque build de `play/`.
        codeSplitting: {
          groups: [
            { name: 'phaser', test: /node_modules[\\/]phaser[\\/]/ },
            { name: 'vendor', test: /node_modules[\\/](?!phaser[\\/])/ },
          ],
        },
      },
    },
  },
  server: {
    open: `/${ENTRY}`,
  },
  plugins: [entryAsIndex()],
}));
