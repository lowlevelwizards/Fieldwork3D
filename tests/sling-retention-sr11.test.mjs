import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {sampleRetentionTransition,retentionHandRelease} from '../src/breach-weapon-retention-transition.ts';
import {createSlingRoute,routeSlingTransition} from '../src/operator-sling-route.ts';
import {equipmentExterior} from '../src/operator-equipment-exterior.ts';
const p={mode:'front-slung',sling:'two',scale:new THREE.Vector3(1,1,1),heldPosition:new THREE.Vector3(8,3,0),heldQuaternion:new THREE.Quaternion(),primaryGrip:new THREE.Vector3(6,-3,1),supportGrip:new THREE.Vector3(15,-2,-1),balanceX:1,armorPush:0,pack:false,chestHeight:35,muzzleX:19.5,stockX:-13.5};
test('SR11 reversible paths are continuous and release before moving behind the body',()=>{
 for(const mode of ['front-slung','side-slung','back-slung']){
  const input={...p,mode};
  let previous=sampleRetentionTransition(input,0);
  for(let i=1;i<=100;i++){
   const a=sampleRetentionTransition(input,i/100);
   assert.ok(a.position.distanceTo(previous.position)<2,mode);
   assert.ok(a.quaternion.angleTo(previous.quaternion)<.2,mode);
   assert.deepEqual(a,sampleRetentionTransition(input,i/100));
   previous=a;
  }
 }
 assert.equal(retentionHandRelease('back-slung',1,.5),1);
 assert.equal(retentionHandRelease('back-slung',-1,.5),1);
});
test('SR11 early back transition keeps the held body route and exact sockets',()=>{
 const fit=equipmentExterior('armor-bare','no-rig','combat-shirt');
 const a=new THREE.Vector3(9,3,0),b=new THREE.Vector3(8,-3,2);
 const path=createSlingRoute(),alt=createSlingRoute();
 routeSlingTransition(path,alt,a,b,fit,'back-slung',1,undefined,.1);
 assert.ok(path[1].point.x>0);
 routeSlingTransition(path,alt,a,b,fit,'back-slung',1,undefined,.75);
 assert.deepEqual(path[0].point.toArray(),a.toArray());assert.deepEqual(path.at(-1).point.toArray(),b.toArray());
 assert.ok(path.every(k=>k.point.toArray().every(Number.isFinite)&&k.normal.length()>.9));
 routeSlingTransition(path,alt,a,b,fit,'back-slung',1,undefined,1);
 assert.ok(path[1].point.x<0);
});
