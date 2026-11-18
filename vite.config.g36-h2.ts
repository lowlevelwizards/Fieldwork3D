import {defineConfig} from 'vite';
// A self-contained isolated-review build, intentionally NOT added to the
// production Pages Vite input or to Arsenal/weapon-family registrations.
export default defineConfig({
 base:'./',
 build:{
  target:'es2022',
  outDir:'dist-g36-h2',
  emptyOutDir:true,
  rollupOptions:{input:{g36H2:'g36-h2-handguard-lab.html'}}
 }
});
