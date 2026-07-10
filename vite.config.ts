import { defineConfig } from 'vite';
import { crx } from '@crxjs/vite-plugin';
import manifest from './src/manifest.json';
import { resolve } from 'path';

export default defineConfig({
  plugins: [crx({ manifest })],
  build: {
    modulePreload: false,
    rollupOptions: {
      input: {
        main_world: resolve(__dirname, 'main_world.ts'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'main_world') return 'main_world.js';
          return 'assets/[name]-[hash].js';
        },
      },
    },
  },
});