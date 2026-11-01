import test from 'node:test';import assert from 'node:assert/strict';
import {doubleSidedWallWear} from '../src/rendering/wear-wall-geometry.ts';
import {readFileSync} from 'node:fs';
test('one reusable geometry contains both exposed wall faces',()=>{
 const g=doubleSidedWallWear(80,39.6);
 const p=g.getAttribute('position');
 assert.equal(p.count,8);
 assert.equal(g.getIndex().count,12);
 assert.ok(Math.abs(p.getZ(0)-4.64)<.0001);
 assert.ok(Math.abs(p.getZ(4)+4.64)<.0001);
 assert.equal(p.getX(0),-40);
 g.dispose();
});
test('wall patina creates one mesh rather than two transparent planes',()=>{
 const src=readFileSync(new URL('../src/breach-3d.ts',import.meta.url),'utf8');
 assert.ok(src.includes('new THREE.Mesh(doubleSidedWallWear(len,39.6),material)'));
 assert.ok(!src.includes('for(const face of [-1,1])'));
});
