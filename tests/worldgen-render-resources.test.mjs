import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('generated scene reuses bounded material and box caches without disposing shared geometry',()=>{
 const source=readFileSync(new URL('../src/breach-3d.ts',import.meta.url),'utf8');
 const lifecycle=readFileSync(new URL('../src/rendering/site-scene-lifecycle.ts',
   import.meta.url),'utf8');
 assert.match(source,/boxGeometryCache\.size<384/);
 // Explicit resource owner replaced the outdated inline disposal check.
 assert.ok(source.includes('releaseSiteSceneObjects('));
 assert.ok(lifecycle.includes('!sharedGeometries.has(geometry)'));
 assert.ok(lifecycle.includes('for(const instance of instances)instance.dispose()'));
 assert.match(source,/solidCache\.get\(key\)/);
 // Window pane material is now port-owned by the site scene builder.
 assert.ok(source.includes('private windowPaneMaterial:'));
 const builder=readFileSync(new URL('../src/rendering/breach-site-scene-builder.ts',
   import.meta.url),'utf8');
 assert.ok(builder.includes('windowPaneMaterial:THREE.MeshStandardMaterial|null'));
});
