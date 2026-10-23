import { defineConfig } from 'vite';

// Relative output paths work both at localhost and /Fieldwork3D/ on GitHub Pages.
export default defineConfig({
  base: './',
  server: { host: '0.0.0.0' },
  build: { target: 'es2022' },
});
