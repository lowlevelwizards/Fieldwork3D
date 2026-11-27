import test from 'node:test';import assert from 'node:assert/strict';
import * as THREE from 'three';
import {initialWeaponConfiguration,setWeaponAttachment,readWeaponConfiguration} from '../src/equipment-weapon-assemblies.ts';
import {attachmentPrice} from '../src/equipment-weapon-inventory.ts';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {buildWeaponAccessories} from '../src/breach-weapon-accessories.ts';
const pose=(config)=>({x:0,z:0,heading:0,velocity:0,seconds:0,stride:0,posture:'stand',injury:0,weapon:'carbine',reload:0,reloadDuration:0,lastThrowAt:-100,lastDoorAt:-100,down:false,surrender:false,aiming:false,firing:false,turning:0,weaponConfiguration:config,deterministic:true});
test('WR3 both sling variants survive save and generate finite straps',()=>{
 const r=createOperatorRig('rook','blue');
 for(const id of ['sling-single-point','sling-two-point','sling-traditional']){
  const c=setWeaponAttachment(initialWeaponConfiguration('carbine'),'sling',id);
  assert.equal(readWeaponConfiguration(JSON.parse(JSON.stringify(c)),c.weapon).slots.sling,id);
  assert.ok(attachmentPrice(id)>0);
  poseOperator(r,pose(c),0);
  assert.ok(r.slingStraps.every(x=>x.visible&&Number.isFinite(x.scale.y)&&x.scale.y>0),id);
 }
 r.dispose();
});
test('WR3 mounted hardware has one merged visual owner',()=>{
 const c=setWeaponAttachment(initialWeaponConfiguration('carbine'),'sling','sling-single-point');
 const m=new THREE.MeshBasicMaterial();
 const a=buildWeaponAccessories(c,m,m);
 assert.ok(a.getObjectByName('weapon-accessory-sling-rigid-mounts'));
 a.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.dispose()});m.dispose();
});
