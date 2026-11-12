import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {pixelPattern,pixelRepeats,TILE_WORLD_SIZE}
 from '../src/rendering/pixel-recipes.ts';
import {mapBoxPixelUV,mapPlanePixelUV}
 from '../src/rendering/pixel-materials.ts';
import {readableMipChain} from '../src/rendering/texture-lod.ts';

test('F3.1 adjacent floor UVs share world-anchored seam locations',()=>{
 const make=(cx)=>mapPlanePixelUV(new THREE.PlaneGeometry(32,32),32,32,cx,0);
 const left=make(16),right=make(48);
 const a=left.getAttribute('uv'),b=right.getAttribute('uv');
 assert.equal(a.getX(1),b.getX(0));
 assert.equal(a.getX(3),b.getX(2));
 assert.equal(pixelRepeats(64,64)[0],64/TILE_WORLD_SIZE);
 left.dispose();right.dispose();
});
test('F3.1 metric UVs do not stretch on an elongated box',()=>{
 const box=mapBoxPixelUV(new THREE.BoxGeometry(8,12,24),8,12,24);
 const uv=box.getAttribute('uv');
 assert.ok(uv.getX(1)>uv.getX(9));
 box.dispose();
});
test('F3.1 directional construction survives intermediate mips without permanent noise',()=>{
 const base=pixelPattern('corrugated-metal',0,32);
 const mips=readableMipChain(base,32,'directional');
 assert.deepEqual(mips.map(m=>m.width),[32,16,8,4,2,1]);
 assert.equal(mips[mips.length-1].data[0],255);
 const midpoint=mips[2].data;
 assert.ok(Math.min(...midpoint)<255,'mid LOD should retain directional contrast');
 const again=readableMipChain(base,32,'directional');
 assert.deepEqual(again.map(m=>Array.from(m.data)),mips.map(m=>Array.from(m.data)));
});
