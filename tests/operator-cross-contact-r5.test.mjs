import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {crossEquipmentContact,CROSS_CONTACT_RADIUS,
 CROSS_CONTACT_STRENGTH,bakeCastOnGear}
 from '../src/operator-baked-gear-cast.ts';
import {enableBakedGearAO} from '../src/operator-baked-gear-ao.ts';

test('R5 proximity makes backpack contacts behind operator without fake rear light',()=>{
 const p=new THREE.Vector3(-3,0,0),n=new THREE.Vector3(-1,0,0);
 const pack=new THREE.Box3(new THREE.Vector3(-4.4,-1,-2),
  new THREE.Vector3(-3.2,1,2));
 const near=crossEquipmentContact(p,n,[pack]);
 const far=crossEquipmentContact(p,n,[pack.clone().translate(
  new THREE.Vector3(-6,0,0))]);
 assert.ok(near>.5);
 assert.equal(far,0);
 assert.ok(CROSS_CONTACT_STRENGTH>0&&CROSS_CONTACT_RADIUS<1.5);
});
test('R5 contact respects outward-facing surface; rear pack cannot darken front',()=>{
 const p=new THREE.Vector3(3,0,0),n=new THREE.Vector3(1,0,0);
 const pack=new THREE.Box3(new THREE.Vector3(-4.4,-1,-2),
  new THREE.Vector3(-3.2,1,2));
 assert.equal(crossEquipmentContact(p,n,[pack]),0);
 const backFace=new THREE.Vector3(-1,0,0);
 assert.equal(crossEquipmentContact(new THREE.Vector3(-3,0,0),
  backFace,[new THREE.Box3(new THREE.Vector3(1,-1,-1),
   new THREE.Vector3(2,1,1))]),0);
});
test('R5 retains separate neutral cross-contact and directional masks',()=>{
 const m=new THREE.MeshStandardMaterial({color:0xffffff});
 enableBakedGearAO(m);
 const root=new THREE.Group(),receiver=new THREE.Group(),
  source=new THREE.Group();
 const shell=new THREE.Mesh(new THREE.BoxGeometry(2,8,8,6,6,6),m);
 receiver.add(shell);
 const pack=new THREE.Mesh(new THREE.BoxGeometry(.8,4,3),m);
 pack.position.x=-1.7;source.add(pack);root.add(receiver,source);
 const result=bakeCastOnGear(receiver,[source],root,'rear-contact-r5');
 assert.ok(result.vertices>0);
 const g=shell.geometry;
 const proximity=g.userData.fieldworkInterContactMask;
 const cast=g.userData.fieldworkDirectionalCastMask;
 assert.ok(proximity instanceof Uint8Array&&cast instanceof Uint8Array);
 assert.equal(proximity.length,g.getAttribute('position').count);
 assert.ok(proximity.some(v=>v>0));
 const first=Array.from(g.getAttribute('color').array);
 bakeCastOnGear(receiver,[source],root,'rear-contact-r5');
 assert.deepEqual(Array.from(g.getAttribute('color').array),first);
});
