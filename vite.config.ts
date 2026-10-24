import { resolve } from 'node:path';
import { defineConfig } from 'vite';
export default defineConfig({
  base: './',
  server: { host: '0.0.0.0' },
  build: {
    target: 'es2022',
    // Build the isolated prototype on GitHub Pages without ever replacing
    // the production Verdigris view in index.html.
    rollupOptions: { input: {
      main: resolve(import.meta.dirname,'index.html'),
      riverLab: resolve(import.meta.dirname,'river-lab.html'),
    } },
  },
});
