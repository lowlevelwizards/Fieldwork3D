import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {armoryShotPreset,frameArmoryObject}
 from '../src/equipment-thumbnail-camera.ts';

test('weapons render in a wide side profile; other categories use a distinct object angle',()=>{
 const weapon=armoryShotPreset('weapon');
 const head=armoryShotPreset('head');
 assert.ok(weapon.width/weapon.height>1.7);
 assert.ok(Math.abs(weapon.direction.z)>.95);
 assert.ok(Math.abs(head.direction.x)>.5);
 assert.ok(head.width/head.height<1.25);
});

test('all eight world-space corners fit the projected thumbnail with generous margin',()=>{
 const examples=[
  [new THREE.Box3(new THREE.Vector3(-52,-3,-2),
   new THREE.Vector3(52,3,2)),'weapon'],
  [new THREE.Box3(new THREE.Vector3(-4,-10,-4),
   new THREE.Vector3(5,10,4)),'small'],
  [new THREE.Box3(new THREE.Vector3(-8,-5,-13),
   new THREE.Vector3(6,7,13)),'belt'],
  [new THREE.Box3(new THREE.Vector3(-15,-18,-6),
   new THREE.Vector3(14,18,9)),'armor']
 ];
 for(const [bounds,category] of examples){
  const shot=frameArmoryObject(bounds,category);
  const camera=new THREE.PerspectiveCamera(34,
   shot.width/shot.height,.1,1200);
  camera.position.copy(shot.position);
  camera.lookAt(shot.center);
  camera.updateMatrixWorld(true);
  camera.updateProjectionMatrix();
  const point=new THREE.Vector3();
  for(let bits=0;bits<8;bits++){
   point.set((bits&1)?bounds.max.x:bounds.min.x,
    (bits&2)?bounds.max.y:bounds.min.y,
    (bits&4)?bounds.max.z:bounds.min.z).project(camera);
   assert.ok(Math.abs(point.x)<.88&&Math.abs(point.y)<.88,
    category+' corner '+bits+' clipped: '+JSON.stringify(point));
  }
 }
});
