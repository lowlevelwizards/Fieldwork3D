import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {equipmentExterior} from '../src/operator-equipment-exterior.ts';
import {createSlingRoute,createSlingContactRoute,routeSlingRibbon,fitSlingContactRoute} from '../src/operator-sling-route.ts';
import {slingArtProfile} from '../src/operator-sling-profile.ts';
import {sampleRetentionPose} from '../src/breach-weapon-retention-pose.ts';
import {solveUnifiedRetentionArm} from '../src/breach-unified-upper-body.ts';
import {poseClearanceEnvelope} from '../src/breach-pose-clearance-envelope.ts';
import {createOperatorPoseScratch} from '../src/breach-operator-pose-scratch.ts';
const fit=equipmentExterior('plate-heavy','full-chest','combat-shirt');
test('SR19 contact ribbon reuses 19 knots, preserves sockets, and clears sampled face bends',()=>{
 const path=createSlingRoute(),out=createSlingContactRoute();
 const a=new THREE.Vector3(12,2,-1),b=new THREE.Vector3(12,-5,2);
 routeSlingRibbon(path,a,b,fit,'front-slung',1.05);
 fitSlingContactRoute(out,path,fit,1.05,undefined,.2);
 assert.equal(out.length,19);assert.deepEqual(out[0].point.toArray(),a.toArray());assert.deepEqual(out.at(-1).point.toArray(),b.toArray());
 assert.ok(out.every(k=>k.point.toArray().every(Number.isFinite)&&k.normal.length()>.9));
 for(const k of out.slice(1,-1)){
  const p=k.point,n=k.normal;
  if(p.y< -9||p.y>fit.shoulder(-1)[1]+.65||Math.abs(n.x)<.90)continue;
  const edge=n.x>0?fit.front(p.y,p.z):fit.back(p.y,p.z);
  assert.ok(n.x>0?p.x>=edge-.01:p.x<=edge+.01);
 }
});
test('SR19 single point has a shared short connector before its two loop branches',()=>{
 const path=createSlingRoute(),a=new THREE.Vector3(12,0,2),profile=slingArtProfile('sling-single-point');
 routeSlingRibbon(path,a,a,fit,'front-slung',profile.width,undefined,profile);
 assert.ok(path[1].point.distanceTo(path[8].point)<.2);
 assert.ok(path[1].point.y>a.y);
 assert.deepEqual(path[0].point.toArray(),path[9].point.toArray());
});
test('SR19 one hand keeps exact grip and a dedicated low elbow pole',()=>{
 const p={mode:'held-one',sling:'single',scale:new THREE.Vector3(1,1,1),heldPosition:new THREE.Vector3(8,0,0),heldQuaternion:new THREE.Quaternion(),primaryGrip:new THREE.Vector3(6,-3,1),supportGrip:new THREE.Vector3(15,-2,-1),balanceX:1,armorPush:0,pack:false,chestHeight:35,muzzleX:19.5,stockX:-13.5,exterior:fit};
 const pose=sampleRetentionPose(p),shoulder=new THREE.Vector3(1,4,7);
 const result=solveUnifiedRetentionArm({shoulder,desired:pose.right,sourcePole:new THREE.Vector3(4,-2,7),release:0,side:1,oneHandHold:true,poseWeight:1,envelope:poseClearanceEnvelope('plate-heavy','full-chest','combat-shirt'),scratch:createOperatorPoseScratch(),armIndex:1}).solution;
 assert.ok(pose.right.y<-8);
 assert.ok(result.joint.y<shoulder.y-2);
 assert.ok(result.effector.distanceTo(pose.right)<1e-5);
 assert.ok(Math.abs(result.joint.distanceTo(shoulder)-10)<1e-6);
 assert.ok(Math.abs(result.effector.distanceTo(result.joint)-10)<1e-6);
});
