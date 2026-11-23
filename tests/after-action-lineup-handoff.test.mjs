import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('debrief samples canonical front-facing authored low ready',()=>{
 const rig=createOperatorRig('debrief-front','blue',true);
 try{
  poseOperator(rig,{
   x:0,z:0,heading:-Math.PI/2,velocity:0,seconds:0,stride:0,
   posture:'stand',injury:0,weapon:'carbine',
   reload:0,reloadDuration:1.8,lastDoorAt:-100,lastThrowAt:-100,
   down:false,surrender:false,aiming:false,firing:false,turning:0,
   handlingOverride:'low',aimBlend:0,deterministic:true
  },0);
  const forward=new THREE.Vector3(0,0,-1)
   .applyQuaternion(rig.root.quaternion);
  assert.ok(forward.z<-.97,'operator must face -Z camera: '+forward.z);
  assert.equal(rig.lastPose?.handlingOverride,'low');
 }finally{rig.dispose();}
});

test('live handoff clones rig geometry, restores tactical pose, and never reparents',()=>{
 const scene=read('src/breach-3d.ts');
 assert.match(scene,/captureAfterActionSquad\(/);
 assert.match(scene,/physical\.root\.clone\(true\)/);
 assert.match(scene,/poseOperator\(live\.physical,\{\.\.\.previous,deterministic:true\},0\)/);
 assert.doesNotMatch(scene,/scene\.remove\(live\.physical\.root\)/);
});

test('lineup has per-operator camera bearing, drag, immediate snapshots and fallback',()=>{
 const presenter=read('src/ui/breach-after-action-model.ts');
 assert.match(presenter,/handlingOverride:'low'/);
 assert.match(presenter,/individualYaw=new Map<string,number>/);
 assert.match(presenter,/model\.holder\.rotation\.y=Math\.atan2\(-dx,-dz\)/);
 assert.match(presenter,/individualYaw\.set\(dragTarget/);
 assert.match(presenter,/liveSnapshots\?\.get\(actor\.id\)/);
 assert.match(presenter,/needsBuild\(actor\.id\)/);
 assert.match(presenter,/model\.overlay\?\.update/);
 assert.doesNotMatch(presenter,/Math\.sin\(yaw\)/);
 const controller=read('src/ui/breach-after-action-controller.ts');
 assert.match(controller,/modelSnapshots:options\.modelSnapshots/);
 assert.match(controller,/owners\.get\(root\)\?\.modelSnapshots/);
});
