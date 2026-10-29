import { defineConfig } from 'vite';
export default defineConfig({
  base: './',
  server: { host: '0.0.0.0' },
  build: {
    target: 'es2022',
    // Build the isolated prototype on GitHub Pages without ever replacing
    // the production Verdigris view in index.html.
    rollupOptions: { input: {
      main: 'index.html',
      riverLab: 'river-lab.html',
      world: 'world.html',
      study: 'study.html',
      breach: 'breach.html',
      breachVisualLab: 'breach-visual-lab.html',
    } },
  },
});
