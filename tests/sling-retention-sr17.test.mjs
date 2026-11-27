import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {retentionShape} from '../src/operator-retention-shape.ts';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {initialWeaponConfiguration,setWeaponAttachment} from '../src/equipment-weapon-assemblies.ts';
test('SR17 support cache is absent without a sling and reused while moving',()=>{
 const r=createOperatorRig('sr17','blue');
 const config=initialWeaponConfiguration('carbine');
 const p={x:0,z:0,heading:0,velocity:0,seconds:0,stride:0,posture:'stand',injury:0,weapon:'carbine',reload:0,reloadDuration:1,lastThrowAt:-100,lastDoorAt:-100,down:false,surrender:false,aiming:false,firing:false,turning:0,weaponConfiguration:config,deterministic:true};
 try{
  poseOperator(r,p,0);
  assert.equal(r.weaponBody.userData.retentionShape.length,0);
  const slung=setWeaponAttachment(config,'sling','sling-two-point');
  const stowed={...p,weaponConfiguration:slung,retentionPreview:'front-slung'};
  poseOperator(r,stowed,0);
  const cloud=r.weaponBody.userData.retentionShape,geometry=r.slingStraps[0].geometry;
  assert.ok(cloud.length>0);
  for(let i=1;i<=6;i++)poseOperator(r,{...stowed,velocity:40,stride:i*.1,seconds:i*.1},0);
  assert.equal(r.weaponBody.userData.retentionShape,cloud);assert.equal(r.slingStraps[0].geometry,geometry);
 }finally{r.dispose();}
});
test('SR17 repeated support corners are deduplicated',()=>{
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,0,0,0,0,0,0],3));
 const material=new THREE.MeshBasicMaterial(),mesh=new THREE.Mesh(g,material);
 assert.equal(retentionShape([mesh],new THREE.Box3().setFromObject(mesh)).length,1);
 g.dispose();material.dispose();
});
