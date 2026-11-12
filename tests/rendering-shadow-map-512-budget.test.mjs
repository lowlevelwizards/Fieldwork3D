import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DEFAULT_SHADOW_MAP_SIZE}
 from '../src/rendering/shadow-map-budget.ts';
import {graphicsBudget} from '../src/breach-graphics-budget.ts';
import {requestedStudioRenderQuality}
 from '../src/operator-studio-render-quality.ts';
import {studioShadowSize} from '../src/operator-studio-lighting.ts';

const source=(path)=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('P2 shadow maps default to 512 in tactical, Studio and inspection scenes',()=>{
 assert.equal(DEFAULT_SHADOW_MAP_SIZE,512);
 for(const touch of [true,false]){
  for(const mode of [null,'balanced','performance','quality']){
   assert.equal(graphicsBudget(mode,touch).shadowSize,512,
    'tactical '+mode+' touch='+touch);
  }
 }
 assert.equal(requestedStudioRenderQuality('',3).shadowSize,512);
 assert.equal(studioShadowSize(''),512);
 assert.equal(requestedStudioRenderQuality(
  '?studioShadowSize=invalid',3).shadowSize,512);
 // Higher resolutions remain intentional, explicit Studio diagnostic overrides.
 for(const n of [1024,2048]){
  assert.equal(requestedStudioRenderQuality(
   '?studioShadowSize='+n,3).shadowSize,n);
  assert.equal(studioShadowSize('?studioShadowSize='+n),n);
 }
});

test('P2 every direct runtime light uses shared 512 shadow budget',()=>{
 const files=['src/main.ts','src/study-main.ts',
  'src/breach-operator-lab.ts','src/operator-pose-workbench-ui.ts'];
 for(const path of files){
  const code=source(path);
  assert.match(code,/DEFAULT_SHADOW_MAP_SIZE/,path);
  assert.match(code,/shadow\.mapSize\.set\(\s*DEFAULT_SHADOW_MAP_SIZE,\s*DEFAULT_SHADOW_MAP_SIZE\)/,path);
  assert.doesNotMatch(code,/shadow\.mapSize\.set\(\s*(?:768|1024|1536|2048)/,
   path+' has an unbudgeted high-resolution live shadow');
 }
 const tactical=source('src/breach-3d.ts');
 assert.match(tactical,/shadow\.mapSize\.set\(this\.quality\.shadowSize/);
 assert.match(tactical,/shadowMapSize:this\.sun\.shadow\.mapSize\.x/);
 const studio=source('src/operator-studio-lighting.ts');
 assert.match(studio,/shadow\.mapSize\.set\(this\.shadowSize,this\.shadowSize\)/);
 const control=source('operator-studio.html');
 assert.match(control,/<option value="512">512 · default miniature<\/option>/);
});

test('P2 preserves baked shadow and fog textures independently of GPU maps',()=>{
 const baked=source('src/operator-baked-shadow-maps.ts');
 assert.match(baked,/const CELL=64,COLS=4,ROWS=2/);
 const fog=source('src/breach-fog-mask.ts');
 assert.doesNotMatch(fog,/DEFAULT_SHADOW_MAP_SIZE/);
});
