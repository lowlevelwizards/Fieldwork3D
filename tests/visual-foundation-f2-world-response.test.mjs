import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {surfaceVisualRole,applyWorldSurfaceResponse}
 from '../src/rendering/material-identity.ts';
const text=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('F2.4 opaque world solids use semantic finish response at construction',()=>{
 const scene=text('src/breach-3d.ts');
 assert.match(scene,/applyWorldSurfaceResponse\(material,surface\)/);
 assert.match(scene,/solidCache\.set\(key,material\)/);
 const wood=new THREE.MeshStandardMaterial({color:0x937051,roughness:.90});
 applyWorldSurfaceResponse(wood,'furniture-wood');
 assert.equal(surfaceVisualRole('furniture-wood'),'wood');
 assert.equal(wood.metalness,0);
 assert.ok(wood.roughness>=.82);
 const steel=new THREE.MeshStandardMaterial({color:0x465958,roughness:.9});
 applyWorldSurfaceResponse(steel,'industrial-steel');
 assert.ok(steel.metalness>wood.metalness);
 assert.ok(steel.roughness<wood.roughness);
 for(const m of [wood,steel])m.dispose();
});
