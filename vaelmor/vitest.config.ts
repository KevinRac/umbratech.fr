import { defineConfig } from 'vitest/config';

export default defineConfig({
  define: {
    __ASSET_BASE__: JSON.stringify('./'),
    __GAME_VERSION__: JSON.stringify('test'),
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
