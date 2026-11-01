import { defineConfig } from 'vite';
export default defineConfig({
  base: './',
  server: { host: '0.0.0.0' },
  build: {
    target: 'es2022',
    // The tactical Breach game is the GitHub Pages homepage.
    // Keep former Verdigris and all other research scenes directly accessible.
    rollupOptions: { input: {
      main: 'index.html',
      verdigris: 'verdigris.html',
      riverLab: 'river-lab.html',
      world: 'world.html',
      study: 'study.html',
      breach: 'breach.html',
      breachVisualLab: 'breach-visual-lab.html',
      operatorLab: 'operator-lab.html',
      mapLab: 'map-lab.html',
      assetLab: 'asset-lab.html',
    } },
  },
});
