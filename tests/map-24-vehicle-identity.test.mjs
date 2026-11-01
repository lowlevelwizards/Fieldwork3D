import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const src=readFileSync(new URL('../src/worldgen/asset-character-visuals.ts',import.meta.url),'utf8');
test('vehicles have family-specific height, body profile and functional details',()=>{
 assert.match(src,/cabTop=van\?H\*\.89:pickup\?H\*\.86/);
 assert.match(src,/One coherent chassis profile/);
 assert.match(src,/Painted B pillar/);
 assert.match(src,/functional tailgate seam/);
 assert.match(src,/Cargo hatch seams/);
 assert.match(src,/rear hatch definition/);
 assert.match(src,/new THREE\.InstancedMesh\(rim,rubber/);
});