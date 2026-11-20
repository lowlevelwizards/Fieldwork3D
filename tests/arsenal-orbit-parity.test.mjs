import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {inspectOrbitYaw,inspectOrbitPitch,positionInspectCamera}
 from '../src/arsenal/orbit-math.ts';

test('both Arsenal workbenches use the same signed pointer-to-camera yaw',()=>{
 const initial=.27;
 assert.equal(inspectOrbitYaw(initial,20),initial-20*.009);
 assert.equal(inspectOrbitYaw(initial,-20),initial+20*.009);
 assert.equal(inspectOrbitYaw(inspectOrbitYaw(initial,20),-20),initial);
 assert.equal(inspectOrbitPitch(.13,20,.007,-.65,.85),.13+20*.007);
 assert.equal(inspectOrbitPitch(.13,20,.008,-.85,.85),.13+20*.008);
 assert.equal(inspectOrbitPitch(.13,1000,.008,-.85,.85),.85);
 assert.equal(inspectOrbitPitch(.13,-1000,.007,-.65,.85),-.65);
});

test('one orbit projection preserves both previous workbench camera formulas',()=>{
 const camera=new THREE.PerspectiveCamera(37,1,.1,400);
 const target=new THREE.Vector3(3,5,7),distance=45,yaw=.42,pitch=.16;
 positionInspectCamera(camera,target,distance,yaw,pitch);
 const cos=Math.cos(pitch);
 const expected=new THREE.Vector3(target.x+distance*Math.sin(yaw)*cos,
  target.y+distance*Math.sin(pitch),
  target.z+distance*Math.cos(yaw)*cos);
 assert.ok(camera.position.distanceTo(expected)<1e-12);
 const backward=new THREE.Vector3().subVectors(target,camera.position).normalize();
 const forward=new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion);
 assert.ok(forward.distanceTo(backward)<1e-12);
});

test('primary and secondary viewers delegate to the same orbit policy',()=>{
 const read=path=>readFileSync(new URL('../src/arsenal/'+path,import.meta.url),'utf8');
 for(const path of ['viewport.ts','glock-viewport.ts']){
  const source=read(path);
  assert.match(source,/inspectOrbitYaw\(this\.yaw,/);
  assert.match(source,/inspectOrbitPitch\(this\.pitch,/);
  assert.match(source,/positionInspectCamera\(this\.camera,this\.target,/);
  assert.doesNotMatch(source,/this\.yaw-=|this\.yaw\s*\+=/);
 }
});
