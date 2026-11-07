import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {solveTwoBone,ARM_LIMITS}
 from '../src/breach-ik.ts';
import {createOperatorPoseScratch}
 from '../src/breach-operator-pose-scratch.ts';
import {solveUnifiedFallbackArm}
 from '../src/breach-unified-upper-body.ts';
const V=(x,y,z)=>new THREE.Vector3(x,y,z);
const empty={armor:'armor-bare',rig:'no-rig',top:'bdu-shirt',
 front:5,boxes:[]};
const common=()=>({
 shoulder:V(1,4,-7),wrist:V(8,-5,-6),desired:V(8,-5,-6),
 preferredPole:V(3,-9,-1.5),previousBend:V(3,-9,-1),
 side:-1,neutral:false,down:false,surrender:false,
 firing:false,sourceContinuity:false,envelope:empty,
 mode:'carry',allowVisualOverlap:false,
 curatedSupport:false,familyLow:null,legacyFront:7.1,
 scratch:createOperatorPoseScratch(),armIndex:0
});
test('UOP fallback preserves original two-bone anatomy without clearance proxy',()=>{
 const req={...common(),neutral:true,envelope:null};
 const expected=solveTwoBone(req.shoulder,req.wrist,10,10,
   req.preferredPole,ARM_LIMITS);
 const result=solveUnifiedFallbackArm(req);
 assert.equal(result.used,'generic');
 assert.equal(result.dynamic,null);
 assert.ok(result.solution.joint.distanceTo(expected.joint)<1e-7);
 assert.ok(result.solution.effector.distanceTo(expected.effector)<1e-7);
 assert.ok(result.solution.reached);
});
test('UOP fallback keeps valid interpolation elbow without rerunning search',()=>{
 const req={...common(),sourceContinuity:true};
 const result=solveUnifiedFallbackArm(req);
 assert.equal(result.used,'authored');
 assert.equal(result.dynamic,null);
 assert.ok(result.solution.reached);
});
test('UOP fallback uses bounded equipment-aware IK when authored pole is not locked',()=>{
 const req=common();
 const result=solveUnifiedFallbackArm(req);
 assert.equal(result.used,'dynamic');
 assert.equal(result.dynamic.status,'clear');
 assert.ok(result.dynamic.candidates<=12);
 assert.ok(result.solution.effector.distanceTo(req.wrist)<1e-5);
});
test('UOP fallback does not invent a reachable door interaction',()=>{
 const req={...common(),wrist:V(60,0,-7),desired:V(60,0,-7)};
 const result=solveUnifiedFallbackArm(req);
 assert.equal(result.dynamic.reason,'out-of-reach');
 assert.equal(result.solution.reached,false);
 assert.ok(result.solution.requestedReach>19.92);
});
