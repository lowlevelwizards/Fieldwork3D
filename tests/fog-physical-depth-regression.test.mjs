import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {spatialSurfaceKnown} from '../src/breach-presentation.ts';
import {roofShouldShow} from '../src/worldgen/roof-cutaways.ts';

const scene=readFileSync(new URL('../src/breach-3d.ts',import.meta.url),'utf8');

test('3D fog uses physical depth, shared ground coordinates and proper sRGB',()=>{
 assert.match(scene,/this\.fogTexture=new THREE\.CanvasTexture\(this\.fogCanvas\)/);
 assert.match(scene,/this\.fogTexture\.colorSpace=THREE\.SRGBColorSpace/);
 assert.match(scene,/map:this\.fogTexture,transparent:true,depthTest:true,opacity:1/);
 assert.match(scene,/depthWrite:false,toneMapped:false,side:THREE\.DoubleSide/);
 assert.match(scene,/this\.smoothFog\.position\.set\(W\/2,1\.05,H\/2\)/);
 assert.match(scene,/positions\.push\(p\.x,1\.05,p\.y\)/);
 assert.match(scene,/this\.smoothFog\.renderOrder=1000/);
 assert.match(scene,/this\.exteriorKnownFog\.renderOrder=1000/);
 assert.match(scene,/this\.exteriorKnownFog\.visible=clippedExteriorFog/);
 assert.doesNotMatch(scene,/map:this\.fogTexture,transparent:true,depthTest:false/);
});

// In both camera types, a ground point can share the same projected screen
// pixel as an exterior operator's torso. Forced screen-space fog covers the
// operator there. Real depth testing correctly rejects that nearer pixel.
for(const kind of ['orthographic','perspective']){
 test(kind+': ground fog behind a friendly cannot occlude their silhouette',()=>{
  const camera=kind==='orthographic'?
   new THREE.OrthographicCamera(-100,100,100,-100,.1,900):
   new THREE.PerspectiveCamera(60,1,.1,900);
  camera.position.set(100,150,125);
  camera.lookAt(0,8,0);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
  const friendlyTorso=new THREE.Vector3(-17,23,-13);
  const screen=friendlyTorso.clone().project(camera);
  const raycaster=new THREE.Raycaster();
  raycaster.setFromCamera(new THREE.Vector2(screen.x,screen.y),camera);
  const ground=new THREE.Plane(new THREE.Vector3(0,1,0),-1.05);
  const atGround=raycaster.ray.intersectPlane(ground,new THREE.Vector3());
  assert.ok(atGround,'projected line must reach the physical ground');
  const fogScreen=atGround.project(camera);
  assert.ok(Math.abs(fogScreen.x-screen.x)<1e-6);
  assert.ok(Math.abs(fogScreen.y-screen.y)<1e-6);
  assert.ok(screen.z<fogScreen.z,
    'actor surface writes a closer depth than the fog ground pixel');
 });
}
test('hidden room geometry does not become revealed when depth-tested',()=>{
 const s={intel:{mode:'exterior-known',walls:new Set([1]),
  doors:new Set(['exterior']),cover:new Set(),rooms:new Set()}};
 assert.equal(spatialSurfaceKnown(s,'room','unvisited'),false);
 assert.equal(spatialSurfaceKnown(s,'wall',0),false);
 assert.equal(spatialSurfaceKnown(s,'door','hidden'),false);
 assert.equal(spatialSurfaceKnown(s,'door','exterior'),true);
 assert.equal(spatialSurfaceKnown(s,'wall',1),true);
 assert.equal(roofShouldShow(false,false,false),false);
 assert.match(scene,/item\.obj\.visible=item\.kind==='wall'&&physicalDirector\?true:/);
 assert.match(scene,/personalDecorVisible\(/);
 assert.match(scene,/this\.staticBatches\.setVisible\(detail\.obj,detail\.obj\.visible\)/);
});
