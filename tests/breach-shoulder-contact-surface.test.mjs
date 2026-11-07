import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {sampleVisibleShoulderSurfaces}
 from '../src/breach-shoulder-contact-surface.ts';
test('shoulder sampler measures actual local triangles and ignores chest pouches',()=>{
 const chest=new THREE.Group();
 const armSurface=new THREE.Group();
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(1.4,3,2),
   new THREE.MeshBasicMaterial());
 mesh.position.set(2,4.2,6.8);
 armSurface.add(mesh);chest.add(armSurface);
 const pouch=new THREE.Group();
 const unrelated=new THREE.Mesh(new THREE.BoxGeometry(1.5,2,2),
   new THREE.MeshBasicMaterial());
 unrelated.position.set(8,-2,0);pouch.add(unrelated);chest.add(pouch);
 const surfaces=sampleVisibleShoulderSurfaces(chest,[
  {id:'fitted-shoulder',layer:'armor-shoulder',
   material:'structured',object:armSurface},
  {id:'chest-pouch',layer:'rig-shoulder',
   material:'soft',object:pouch}
 ],1);
 assert.ok(surfaces.length>0);
 assert.ok(surfaces.every(p=>p.id==='fitted-shoulder'));
 assert.ok(surfaces.every(p=>p.normal[0]>=.25));
 assert.ok(surfaces.some(p=>Math.abs(p.center[0]-2.7)<.01));
 assert.deepEqual(sampleVisibleShoulderSurfaces(chest,[],1),[]);
 assert.deepEqual(sampleVisibleShoulderSurfaces(chest,[{
  id:'opposite',layer:'garment',material:'soft',object:armSurface
 }],-1),[]);
});
test('hidden groups cannot become phantom stock seating candidates',()=>{
 const chest=new THREE.Group(),shoulder=new THREE.Group();
 shoulder.add(new THREE.Mesh(new THREE.BoxGeometry(2,4,2),
  new THREE.MeshBasicMaterial()));
 shoulder.position.set(2,4,6.5);chest.add(shoulder);
 shoulder.visible=false;
 assert.equal(sampleVisibleShoulderSurfaces(chest,[{
  id:'hidden',layer:'armor-shoulder',material:'soft',object:shoulder
 }],1).length,0);
});
