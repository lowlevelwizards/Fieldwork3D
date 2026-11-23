/** A real kick makes one fixed door impact; the sole follows through in
 * body space, never remains a child of the swinging leaf. */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {KICK_DURATION,kickMotion} from '../src/breach-door-actions.ts';
import {legMaximumLength} from '../src/breach-leg-geometry.ts';

const foot=(x,y)=>({
 position:{x,y},worldYaw:0,pitch:0,height:0,
 contact:true,phase:'planted',progress:1
});
const feet=[foot(100,94.4),foot(100,105.6)];
const at=(phase,extra={})=>({
 x:100,z:100,heading:0,travelYaw:0,pelvisYaw:0,
 velocity:0,turning:0,seconds:10+phase*KICK_DURATION,stride:0,
 posture:'stand',injury:0,weapon:'carbine',reload:0,
 reloadDuration:1.8,lastThrowAt:-100,lastDoorAt:10,
 doorMethod:'kick',kickFoot:1,
 kickImpactPoint:{x:114,y:105.6},
 // A render-time leaf position may change arbitrarily after impact.
 doorPoint:{x:114,y:105.6},
 down:false,surrender:false,aiming:false,firing:false,
 deterministic:true,replayFeet:feet,...extra
});
const shoe=(rig,side)=>{
 rig.root.updateMatrixWorld(true);
 return rig.feet[side].shoe.getWorldPosition(new THREE.Vector3());
};

test('kick strikes at .53, releases the leaf, follows through and replants',()=>{
 const rig=createOperatorRig('kick-release','blue',true);
 rig.root.position.set(100,0,100);
 try{
  poseOperator(rig,at(.53),0);
  const atImpact=shoe(rig,1);
  const planted=shoe(rig,0);
  assert.equal(kickMotion(KICK_DURATION*.53).contact,true);
  poseOperator(rig,at(.64,{doorPoint:{x:300,y:420}}),0);
  const afterImpact=shoe(rig,1);
  assert.ok(afterImpact.x>atImpact.x+.7,
    'kick must follow through in the ORIGINAL forward direction');
  assert.ok(planted.distanceTo(shoe(rig,0))<1e-4,
    'opposite support foot stays planted as the door swings');
  assert.ok(rig.legGap[1]<.02,'boot remains attached to real shin');
  assert.equal(kickMotion(KICK_DURATION*.64).contact,false);
  poseOperator(rig,at(.94,{doorPoint:{x:-50,y:800}}),0);
  const recovered=shoe(rig,1);
  assert.ok(Math.abs(recovered.y-1.45)<.1,
    'the kick finishes at the actual planted-boot height');
  assert.ok(rig.legGap[1]<.02,'recovery never stretches the ankle');
 }finally{rig.dispose();}
});

test('post-impact kick is invariant to moving-leaf geometry and replay seeks',()=>{
 const rig=createOperatorRig('kick-replay','blue',true);
 rig.root.position.set(100,0,100);
 try{
  poseOperator(rig,at(.70,{doorPoint:{x:114,y:105.6}}),0);
  const frame=shoe(rig,1);
  poseOperator(rig,at(.20,{doorPoint:{x:-90,y:200}}),-1);
  poseOperator(rig,at(.70,{doorPoint:{x:480,y:420}}),0);
  assert.ok(frame.distanceTo(shoe(rig,1))<1e-5,
    'a later hinge angle cannot pull the already released kick foot');
  // Old films with no captured point also use a door-independent fallback.
  poseOperator(rig,at(.70,{
   kickImpactPoint:undefined,doorPoint:{x:114,y:105.6}}),0);
  const legacy=shoe(rig,1);
  poseOperator(rig,at(.70,{
   kickImpactPoint:undefined,doorPoint:{x:420,y:420}}),0);
  assert.ok(legacy.distanceTo(shoe(rig,1))<1e-5);
 }finally{rig.dispose();}
});

test('both kicking legs have a hard anatomical reach, even for a distant door',()=>{
 for(const kickingFoot of [0,1]){
  const rig=createOperatorRig('kick-reach-'+kickingFoot,'blue',true);
  rig.root.position.set(100,0,100);
  try{
   const target={x:400,y:kickingFoot===0?94.4:105.6};
   poseOperator(rig,at(.60,{
    kickFoot:kickingFoot,kickImpactPoint:target,
    doorPoint:{x:-400,y:800}}),0);
   const gap=rig.legGap[kickingFoot];
   assert.ok(gap<.02,'no ankle bridge / stretched shin, gap '+gap);
   assert.equal(rig.feet[kickingFoot].outOfReach,false);
   assert.ok(legMaximumLength()<=22.5);
   assert.ok(Number.isFinite(shoe(rig,kickingFoot).x));
   const support=1-kickingFoot;
   assert.ok(rig.legGap[support]<1.5,
    'support side remains under normal footstep authority');
  }finally{rig.dispose();}
 }
});

test('no viable selected kicking foot does not invent a right-leg strike',()=>{
 const rig=createOperatorRig('kick-no-foot','blue',true);
 rig.root.position.set(100,0,100);
 try{
  poseOperator(rig,at(.60,{kickFoot:null}),0);
  assert.equal(rig.feet[0].swinging,false);
  assert.equal(rig.feet[1].swinging,false);
 }finally{rig.dispose();}
});
