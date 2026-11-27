import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {solveUnifiedRetentionArm} from '../src/breach-unified-upper-body.ts';
import {poseClearanceEnvelope} from '../src/breach-pose-clearance-envelope.ts';
import {createOperatorPoseScratch} from '../src/breach-operator-pose-scratch.ts';
import {neutralMannequinWrist} from '../src/operator-mannequin-pose.ts';
import {retentionHandRelease} from '../src/breach-weapon-retention-transition.ts';
test('SR9 retention uses anatomically sized arms, rear free elbow and deterministic sample',()=>{
 for(const side of [-1,1]){
  const shoulder=new THREE.Vector3(1,4,side*7),desired=neutralMannequinWrist(side);
  const req={shoulder,desired,sourcePole:new THREE.Vector3(4,-9,side),release:1,side,envelope:poseClearanceEnvelope('armor-bare','no-rig','combat-shirt'),scratch:createOperatorPoseScratch(),armIndex:side===-1?0:1};
  const a=solveUnifiedRetentionArm(req).solution;
  const joint=a.joint.clone(),wrist=a.effector.clone();
  assert.ok(Math.abs(shoulder.distanceTo(joint)-10)<1e-6);
  assert.ok(Math.abs(joint.distanceTo(wrist)-10)<1e-6);
  assert.ok(joint.x<shoulder.x+1);
  assert.ok(joint.y<shoulder.y-5);
  const b=solveUnifiedRetentionArm(req).solution;
  assert.ok(b.joint.distanceTo(joint)<1e-7);
 }
});
test('SR9 hand release remains continuous and held-one firing grip stays owned',()=>{
 for(const side of [-1,1]){
  assert.equal(retentionHandRelease('front-slung',side,0),0);
  assert.equal(retentionHandRelease('front-slung',side,1),1);
 }
 assert.equal(retentionHandRelease('held-one',1,1),0);
});
