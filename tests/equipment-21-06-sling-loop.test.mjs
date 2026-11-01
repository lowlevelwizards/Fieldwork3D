import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {initialWeaponConfiguration,setWeaponAttachment} from '../src/equipment-weapon-assemblies.ts';
import {buildWeaponAccessories} from '../src/breach-weapon-accessories.ts';

const pose=(config,overrides={})=>({x:0,z:0,heading:0,velocity:0,seconds:0,
 stride:0,posture:'stand',injury:0,weapon:'carbine',
 reload:0,reloadDuration:0,lastThrowAt:-100,lastDoorAt:-100,
 down:false,surrender:false,aiming:false,firing:false,turning:0,
 weaponConfiguration:config,deterministic:true,...overrides});
test('21.06 sling loop is absent with no sling and has three finite fabric spans when equipped',()=>{
 const rig=createOperatorRig('rook','blue');
 const base=initialWeaponConfiguration('carbine');
 poseOperator(rig,pose(base),0);
 assert.equal(rig.slingStraps.length,3);
 assert.ok(rig.slingStraps.every(mesh=>!mesh.visible));
 const sling=setWeaponAttachment(base,'sling','sling-two-point');
 poseOperator(rig,pose(sling,{seconds:.1}),0);
 assert.ok(rig.slingStraps.every(mesh=>mesh.visible));
 for(const mesh of rig.slingStraps){
  assert.ok(mesh.scale.y>0&&mesh.scale.y<55);
  assert.ok(Number.isFinite(mesh.position.x));
  assert.ok(Number.isFinite(mesh.position.y));
 }
 rig.dispose();
});
test('21.06 downed operator keeps sling fabric, surrender unhooks it',()=>{
 const rig=createOperatorRig('rook','blue');
 const sling=setWeaponAttachment(initialWeaponConfiguration('carbine'),'sling','sling-two-point');
 poseOperator(rig,pose(sling,{seconds:2,down:true,downProgress:1}),0);
 assert.ok(rig.droppedGun.visible);
 assert.ok(rig.slingStraps.every(mesh=>mesh.visible));
 poseOperator(rig,pose(sling,{seconds:2.3,surrender:true,downProgress:1}),0);
 assert.ok(rig.slingStraps.every(mesh=>!mesh.visible));
 rig.dispose();
});
test('21.06 receiver accessory only contains hardware, not phantom static straps',()=>{
 const c=setWeaponAttachment(initialWeaponConfiguration('carbine'),'sling','sling-two-point');
 const m=new THREE.MeshBasicMaterial();
 const g=buildWeaponAccessories(c,m,m);
 assert.equal(g.children.length,2);
 for(const obj of g.children)if(obj instanceof THREE.Mesh)obj.geometry.dispose();
 m.dispose();
});
