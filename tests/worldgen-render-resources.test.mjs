import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('generated scene reuses bounded material and box caches without disposing shared geometry',()=>{
 const source=readFileSync(new URL('../src/breach-3d.ts',import.meta.url),'utf8');
 const lifecycle=readFileSync(new URL('../src/rendering/site-scene-lifecycle.ts',
   import.meta.url),'utf8');
 assert.match(source,/boxGeometryCache\.size<384/);
 // Explicit resource owner replaced the outdated inline disposal check.
 assert.match(source,/releaseSiteSceneObjects\\(/);
 assert.match(lifecycle,/!sharedGeometries\\.has\\(geometry\\)/);
 assert.match(lifecycle,/for\\(const instance of instances\\)instance\\.dispose\\(\\)/);
 assert.match(source,/solidCache\.get\(key\)/);
 assert.match(source,/this\.windowPaneMaterial/);
});
