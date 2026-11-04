import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=(path)=>readFileSync(new URL(path,import.meta.url),'utf8');
test('thumbnail viewer keeps single renderer, reused rig, one GPU readback per visible card',()=>{
 const source=read('../src/operator-appearance-grid.ts');
 assert.match(source,/new THREE\.WebGLRenderTarget\(/);
 assert.match(source,/readRenderTargetPixels\(/);
 assert.match(source,/renderer\.setRenderTarget\(oldTarget\)/);
 assert.match(source,/this\.cache\.size>=90/);
 assert.match(source,/this\.token!==token/);
 assert.match(source,/IntersectionObserver/);
 assert.match(source,/thumbnailRigFor\(/);
 assert.match(source,/entry\.readyKey===key/);
 assert.match(source,/this\.grid\.dataset\.thumbnailRigBuilds/);
 assert.match(source,/this\.grid\.dataset\.thumbnailRenders/);
 assert.equal(source.includes('new THREE.WebGLRenderer('),false);
 assert.equal(source.includes('rig.dispose();\n  }\n }\n dispose()'),false,
  'disposal must not occur at the end of every card');
});
test('editor paints the current category once per wardrobe change',()=>{
 const studio=read('../src/operator-studio.ts');
 assert.match(studio,/thumbBrowser\.setCategory\(activeCategory,true\)/);
 assert.match(studio,/thumbBrowser\.refresh\(p\.loadout,previewWardrobe\(\),p\.id\)/);
});
