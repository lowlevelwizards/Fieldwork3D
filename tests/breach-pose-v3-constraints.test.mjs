import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {solveTwoBone,ARM_LIMITS} from '../src/breach-ik.ts';
import {evaluateArmConstraint,pickViableArm}
 from '../src/breach-pose-v3-constraints.ts';
const V=(x,y,z)=>new THREE.Vector3(x,y,z);
const clear={armor:'armor-bare',rig:'no-rig',top:'bdu-shirt',front:5,boxes:[]};
const blocked={...clear,boxes:[{label:'torso',material:'rigid',
 min:{x:-30,y:-30,z:-30},max:{x:30,y:30,z:30}}]};
const shoulder=V(1,4,7),wrist=V(12,-4,5);
const solved=pole=>solveTwoBone(shoulder,wrist,10,10,pole,ARM_LIMITS);
const report=(pole,envelope=clear,mode='carry')=>evaluateArmConstraint({
 shoulder,arm:solved(pole),side:1,envelope,mode
});
test('V3: hard penetration cannot be purchased with aesthetic score',()=>{
 const good=report(V(0,-1,.3));
 const blockedReport=report(V(0,-1,.3),blocked);
 assert.equal(good.valid,true);
 assert.equal(blockedReport.valid,false);
 assert.ok(blockedReport.reasons.includes('equipment-contact'));
 assert.equal(pickViableArm([{report:blockedReport},{report:good}]).report,good);
});
test('V3: action-specific silhouette ranking prefers relaxed elbow',()=>{
 const down=report(V(0,-1,.2));
 const raised=report(V(0,1,.2));
 assert.equal(down.valid,true);
 assert.equal(raised.valid,true);
 assert.ok(down.quality<raised.quality,
  'downward carry elbow should score better than raised elbow');
 const aiming=report(V(0,-1,.2),clear,'aim');
 assert.ok(Number.isFinite(aiming.quality));
});
test('V3: impossible and nonfinite joint states are rejected',()=>{
 const bad=solved(V(0,-1,.2));
 bad.joint=bad.joint.clone().add(V(4,0,0));
 const r=evaluateArmConstraint({shoulder,arm:bad,side:1,envelope:clear,
  mode:'carry'});
 assert.equal(r.valid,false);
 assert.ok(r.reasons.includes('bone-length'));
 assert.equal(pickViableArm([{report:r}]),null);
});
