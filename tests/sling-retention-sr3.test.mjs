import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {equipmentExterior} from '../src/operator-equipment-exterior.ts';
import {createSlingRoute,routeSlingRibbon} from '../src/operator-sling-route.ts';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {initialWeaponConfiguration,setWeaponAttachment} from '../src/equipment-weapon-assemblies.ts';
test('SR3 routes keep socket endpoints and run around both body faces',()=>{
 const r=createSlingRoute(),a=new THREE.Vector3(10,4,0),b=new THREE.Vector3(10,-4,1);
 const bare=equipmentExterior('armor-bare','no-rig','combat-shirt');
 const heavy=equipmentExterior('plate-heavy','full-chest','combat-shirt');
 routeSlingRibbon(r,a,b,bare,'front-slung');
 assert.deepEqual(r[0].point.toArray(),a.toArray());assert.deepEqual(r.at(-1).point.toArray(),b.toArray());
 assert.ok(r[4].point.x<0);
 const previous=r[5].point.x;
 routeSlingRibbon(r,a,b,heavy,'front-slung');
 assert.ok(r[5].point.x<=previous+.01);
 assert.ok(r[7].point.x>heavy.front(-3.5,0));
 assert.ok(r[2].point.y>heavy.shoulder(-1)[1]);
 routeSlingRibbon(r,a,b,heavy,'back-slung');
 assert.ok(r[4].point.x>0);
 assert.ok(r[7].point.x<0);
});
test('SR3 live rig publishes one reusable visible mesh and hides it on surrender',()=>{
 const r=createOperatorRig('sr3','blue');
 try{
  const config=setWeaponAttachment(initialWeaponConfiguration('carbine'),'sling','sling-two-point');
  const p={x:0,z:0,heading:0,velocity:0,seconds:0,stride:0,posture:'stand',injury:0,weapon:'carbine',reload:0,reloadDuration:0,lastThrowAt:-100,lastDoorAt:-100,down:false,surrender:false,aiming:false,firing:false,turning:0,weaponConfiguration:config,deterministic:true};
  poseOperator(r,p,0);
  const g=r.slingStraps[0].geometry,positions=g.getAttribute('position');
  assert.equal(r.slingStraps.filter(m=>m.visible).length,1);assert.equal(g.drawRange.count,108);
  poseOperator(r,{...p,seconds:1,retentionPreview:'back-slung'},0);
  assert.equal(r.slingStraps[0].geometry,g);assert.equal(g.getAttribute('position'),positions);
  assert.ok(Array.from(positions.array).every(Number.isFinite));
  poseOperator(r,{...p,surrender:true},0);
  assert.ok(r.slingStraps.every(m=>!m.visible));assert.equal(g.drawRange.count,0);
 }finally{r.dispose();}
});
