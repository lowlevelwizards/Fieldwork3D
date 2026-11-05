import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {solveTwoBone,LEG_LIMITS,ARM_LIMITS}
  from '../src/breach-ik.ts';
import {createOperatorPoseScratch}
  from '../src/breach-operator-pose-scratch.ts';
import {createOperatorRig,poseOperator}
  from '../src/breach-operator-rig.ts';

const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`expected ${a} === ${b}`);
const sameVector=(a,b)=>{near(a.x,b.x);near(a.y,b.y);near(a.z,b.z);};

test('reuseable two-bone IK gives the exact same joints and constraints',()=>{
 const scratch=createOperatorPoseScratch();
 for(let i=0;i<240;i++){
  const start=new THREE.Vector3(Math.sin(i)*8,12,Math.cos(i)*4);
  const end=new THREE.Vector3(2+Math.sin(i*.15)*22,
    Math.cos(i*.23)*19,Math.sin(i*.2)*12);
  const pole=new THREE.Vector3(3,-7,i%2?-1:1);
  const previous=new THREE.Vector3(2,-2,1);
  const lim=i%2?ARM_LIMITS:LEG_LIMITS;
  const fresh=solveTwoBone(start,end,10,10,pole,lim,previous);
  const reused=solveTwoBone(start,end,10,10,pole,lim,previous,
    scratch.arms[0]);
  assert.strictEqual(reused,scratch.arms[0]);
  sameVector(reused.joint,fresh.joint);
  sameVector(reused.effector,fresh.effector);
  sameVector(reused.bendPlane,fresh.bendPlane);
  near(reused.angle,fresh.angle);
  near(reused.requestedReach,fresh.requestedReach);
  assert.equal(reused.reached,fresh.reached);
 }
});
test('scratch state is isolated per operator, including all limb result vectors',()=>{
 const first=createOperatorPoseScratch(),second=createOperatorPoseScratch();
 assert.notStrictEqual(first.bodyInverse,second.bodyInverse);
 assert.notStrictEqual(first.legs[0].joint,first.legs[1].joint);
 assert.notStrictEqual(first.legs[0].joint,second.legs[0].joint);
 first.arms[0].joint.set(99,13,41);
 assert.equal(second.arms[0].joint.x,0);
});
test('repeated live IK posing keeps finite planted-leg diagnostics',()=>{
 const rig=createOperatorRig('p6-scratch','blue');
 const input={x:0,z:0,heading:0,velocity:0,seconds:0,stride:0,
  posture:'stand',injury:0,weapon:'carbine',reload:0,reloadDuration:0,
  lastThrowAt:-100,lastDoorAt:-100,down:false,surrender:false,
  aiming:false,firing:false,turning:0,deterministic:true};
 try{
  for(let i=0;i<80;i++){
   poseOperator(rig,{...input,x:i*.8,z:i*.15,velocity:48,
     seconds:i/60,stride:i*.06,heading:Math.sin(i*.02)*.2},1/60);
   for(const gap of rig.legGap)assert.ok(Number.isFinite(gap));
   assert.ok(Number.isFinite(rig.gripError));
  }
 }finally{rig.dispose();}
});
