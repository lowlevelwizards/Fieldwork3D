import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const code=readFileSync(new URL('../src/operator-appearance-grid.ts',import.meta.url),'utf8');
test('R7.7 one shared framebuffer and one outstanding readback per card',()=>{
 assert.match(code,/private reading=false/);
 assert.match(code,/this\.scheduled\|\|this\.reading/);
 assert.match(code,/this\.reading=true/);
 assert.match(code,/this\.reading=false/);
 assert.match(code,/void this\.renderThumbnail\(entry,token\)\.finally/);
 assert.match(code,/this\.renderer\.readRenderTargetPixelsAsync\(/);
 assert.match(code,/this\.renderer\.readRenderTargetPixels\(/);
 assert.match(code,/thumbnailReadback'\)\s*!==\s*'sync'/);
 assert.equal(code.includes('new THREE.WebGLRenderer('),false);
});
test('R7.7 restores shared GPU render state before awaiting readback',()=>{
 const start=code.indexOf('private async renderThumbnail(');
 const stop=code.indexOf('\n dispose(){',start);
 const section=code.slice(start,stop);
 const awaitAt=section.indexOf('await readback;');
 assert.ok(awaitAt>0);
 assert.ok(section.indexOf('this.renderer.setRenderTarget(oldTarget)')<awaitAt);
 assert.ok(section.indexOf('this.renderer.setClearColor(oldClear,oldAlpha)')<awaitAt);
 assert.ok(section.indexOf('this.scene.remove(rig.root)')<awaitAt);
 assert.match(section,/token!==this\.token\|\|this\.suspended/);
 assert.match(section,/this\.cards\.get\(item\.id\)!==entry/);
 assert.match(section,/entry\.key!==key/);
 assert.match(section,/this\.pixels\[src\]/);
 assert.match(section,/THUMB_LINEAR_TO_SRGB/);
});
test('R7.7 async pipeline preserves bounded cache and error recovery',()=>{
 assert.match(code,/if\(this\.cache\.size>=90\)/);
 assert.match(code,/this\.cache\.set\(key,image\)/);
 assert.match(code,/canvas\.dataset\.previewError='true'/);
 assert.match(code,/this\.grid\.dataset\.readbackMode='async'/);
 assert.match(code,/this\.grid\.dataset\.readbackMode='sync-fallback'/);
 assert.match(code,/if\(!suspended\)this\.scheduleThumb\(\)/);
});
