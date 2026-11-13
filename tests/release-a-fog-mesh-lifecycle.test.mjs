import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildExteriorKnownFogGeometry,replaceTacticalFogGeometry}
 from '../src/rendering/breach-fog-mesh-composition.ts';
import {fogUvAt} from '../src/breach-fog-domain.ts';

const site=(minX,minY,maxX,maxY)=>({
 bounds:{minX,minY,maxX,maxY},seed:13,
 // U-shaped room modules: display geometry must use one shared footprint,
 // not clip a mesh independently from the fog canvas room classification.
 rooms:[
  {id:'a',x:minX+10,y:minY+10,w:40,h:20},
  {id:'b',x:minX+10,y:minY+30,w:20,h:70},
  {id:'c',x:maxX-30,y:minY+30,w:20,h:70}
 ]
});
const vec=attribute=>Array.from(attribute.array);
test('Release A4: Exterior Known fog geometry covers the exact site bounds',()=>{
 const world=site(-85,-40,265,405);
 const geometry=buildExteriorKnownFogGeometry(world);
 const positions=vec(geometry.getAttribute('position'));
 assert.equal(geometry.getAttribute('position').count,4);
 assert.deepEqual(positions,[
  -85,1.05,-40,-85,1.05,405,265,1.05,405,265,1.05,-40]);
 const uv=vec(geometry.getAttribute('uv'));
 assert.deepEqual(uv,[0,1,0,0,1,0,1,1]);
 assert.deepEqual(fogUvAt({x:90,y:182.5},world.bounds),{u:.5,v:.5});
 assert.deepEqual(Array.from(geometry.getIndex().array),[0,1,2,0,2,3]);
 geometry.dispose();
});
test('Release A4: repeated fog site switches dispose old geometry exactly once',()=>{
 const material=new THREE.MeshBasicMaterial();
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(1,1),material);
 const exterior=new THREE.Mesh(new THREE.PlaneGeometry(1,1),material);
 const oldGround=ground.geometry,oldExterior=exterior.geometry;
 let disposedGround=0,disposedExterior=0;
 oldGround.addEventListener('dispose',()=>disposedGround++);
 oldExterior.addEventListener('dispose',()=>disposedExterior++);
 const bounds=replaceTacticalFogGeometry(ground,exterior,site(-70,-30,520,730));
 assert.deepEqual(bounds,{minX:-70,minY:-30,maxX:520,maxY:730});
 assert.equal(disposedGround,1);
 assert.equal(disposedExterior,1);
 assert.equal(ground.geometry.parameters.width,590);
 assert.equal(ground.geometry.parameters.height,760);
 assert.equal(exterior.geometry.getAttribute('position').count,4);
 const previous=exterior.geometry;
 let siteDisposed=0;
 previous.addEventListener('dispose',()=>siteDisposed++);
 replaceTacticalFogGeometry(ground,exterior,null);
 assert.equal(siteDisposed,1);
 assert.equal(exterior.geometry.getAttribute('position').count,0);
 ground.geometry.dispose();exterior.geometry.dispose();material.dispose();
});
test('Release A4: null-site mask has no triangles or stale interior cutouts',()=>{
 const geometry=buildExteriorKnownFogGeometry(null);
 assert.equal(geometry.getAttribute('position').count,0);
 assert.equal(geometry.getIndex().count,0);
 geometry.dispose();
});
