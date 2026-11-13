import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {chooseCarry} from '../src/breach-carry-policy.ts';
import {teammateAheadForHandling} from '../src/breach-handling-context.ts';
import {resolvePoseLocomotionFrame}
 from '../src/breach-pose-locomotion-frame.ts';
import {blendPoseTransform,poseContinuityAlpha}
 from '../src/breach-pose-continuity.ts';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {inspectOperatorPoseOutput}
 from '../src/breach-operator-pose-output.ts';

const base={x:0,z:0,heading:0,travelYaw:0,velocity:0,seconds:2,
 stride:0,posture:'stand',injury:0,weapon:'carbine',
 reload:0,reloadDuration:1.8,lastThrowAt:-100,lastDoorAt:-100,
 down:false,surrender:false,aiming:false,firing:false,
 turning:0,aimBlend:0,poseV3Preview:true};
const snapshot=(rig,id)=>Array.from(inspectOperatorPoseOutput(rig).slots
 .find(s=>s.id===id).values);
const pose=(rig,values)=>poseOperator(rig,{...base,...values},1/60);
const vecDiff=(a,b)=>Math.hypot(...a.slice(0,3).map((n,i)=>n-b[i]));
const finite=rig=>assert.ok(inspectOperatorPoseOutput(rig).slots.every(
 s=>s.values.every(Number.isFinite)),'every published transform finite');

test('A2.5 rear-stack high, deliberate WATCH freedom, running priority',()=>{
 const f={aim:0,moving:.22,obstruction:false,
  friendlyNear:true,friendlyAhead:true,weapon:'carbine'};
 assert.deepEqual(chooseCarry({...f,intent:'stack'}),{
  handling:'high',reason:'friendly-courtesy',urgent:true});
 assert.equal(chooseCarry({...f,intent:'hold'}).handling,'high');
 assert.equal(chooseCarry({...f,intent:'look'}).handling,'ready');
 assert.equal(chooseCarry({...f,intent:'pie'}).handling,'ready');
 assert.equal(chooseCarry({...f,intent:'look',aim:1}).handling,'ads');
 assert.equal(chooseCarry({...f,intent:'run',aim:1}).handling,'low');
 assert.equal(chooseCarry({...f,obstruction:true,aim:1}).handling,'short');
 const self={x:0,y:0};
 assert.equal(teammateAheadForHandling(self,0,[{x:20,y:12}]),true);
 assert.equal(teammateAheadForHandling(self,0,[{x:20,y:16}]),false,
  'lateral open weapon sector must not count as centered ally');
 assert.equal(teammateAheadForHandling(self,Math.PI/2,[{x:12,y:20}]),
  true,'heading-rotated check must be symmetric');
});

test('A2.5 pose presentation blending is bounded, shortest arc, interruptible',()=>{
 assert.equal(poseContinuityAlpha(0,'carry'),0,
  'unchanged pose time must not advance interpolation');
 assert.equal(poseContinuityAlpha(-1,'head'),0);
 assert.equal(poseContinuityAlpha(.36,'carry'),1,
  'replay gap must not smear previous pose');
 const t=poseContinuityAlpha(1/60,'carry');
 assert.ok(t>0&&t<1);
 const prev=Float64Array.from([0,0,0,0,0,0,1,1,1,1,1]);
 const goal=Float64Array.from([10,8,-4,0,1,0,0,1,1,1,1]);
 blendPoseTransform(prev,goal,.25);
 assert.ok(Math.abs(goal[0]-2.5)<1e-9);
 assert.ok(Math.abs(goal[1]-2)<1e-9);
 assert.ok(Math.abs(Math.hypot(...goal.slice(3,7))-1)<1e-10);
 const reverse=Float64Array.from([10,0,0,0,0,0,-1,1,1,1,1]);
 blendPoseTransform(prev,reverse,.5);
 assert.ok(Math.abs(reverse[6]-1)<1e-9,
  'antipodal quaternion signs are identical orientations');
 const invisible=Float64Array.from([10,0,0,0,0,0,1,1,1,1,0]);
 blendPoseTransform(prev,invisible,.1);
 assert.equal(invisible[0],10,'visibility changes never ghost');
});

test('A2.5 any ready pose can walk, reverse and strafe independently of feet',()=>{
 const lateral=resolvePoseLocomotionFrame({...base,velocity:52,
  travelYaw:Math.PI/2,heading:0},null);
 const reverse=resolvePoseLocomotionFrame({...base,velocity:52,
  travelYaw:Math.PI,heading:0},null);
 assert.equal(lateral.hipTarget,0);
 assert.equal(reverse.hipTarget,0);
 assert.ok(lateral.moving>.1&&reverse.moving>.1);
 const feet=[
  {position:{x:3,y:-5},height:0,worldYaw:0,phase:'planted',contact:true},
  {position:{x:6,y:6},height:0,worldYaw:0,phase:'planted',contact:true}
 ];
 const baseline=[];
 for(const mode of ['low','high','ready','point','ads','short']){
  const rig=createOperatorRig('a25-walk-'+mode,'blue');
  try{
   pose(rig,{seconds:4,velocity:50,travelYaw:Math.PI/2,
    handlingOverride:mode,deterministic:true,replayFeet:feet});
   finite(rig);
   const shoes=[snapshot(rig,'leg-0-shoe').slice(0,3),
    snapshot(rig,'leg-1-shoe').slice(0,3)];
   if(baseline.length===0)baseline.push(...shoes);
   else assert.deepEqual(shoes,baseline,mode+' changed planted shoe targets');
  }finally{rig.dispose();}
 }
});

test('A2.5 interrupted live transitions blend displayed arms/weapon, not feet',()=>{
 const rig=createOperatorRig('a25-interrupt','blue');
 const endpoint=createOperatorRig('a25-endpoint','blue');
 try{
  pose(rig,{seconds:3,handlingOverride:'low'});
  const old=snapshot(rig,'held-weapon');
  const oldHand=snapshot(rig,'arm-1-hand');
  const oldShoe=snapshot(rig,'leg-0-shoe');
  pose(rig,{seconds:3+1/60,handlingOverride:'high'});
  pose(endpoint,{seconds:3+1/60,handlingOverride:'high',
   deterministic:true});
  const high=snapshot(rig,'held-weapon');
  assert.ok(vecDiff(high,old)<vecDiff(snapshot(endpoint,'held-weapon'),old),
   'interrupted carry must begin between previous and new position');
  assert.ok(vecDiff(snapshot(rig,'arm-1-hand'),oldHand)<
   vecDiff(snapshot(endpoint,'arm-1-hand'),oldHand)+.001,
   'wrist should not teleport straight to authored destination');
  assert.deepEqual(snapshot(rig,'leg-0-shoe'),snapshot(endpoint,'leg-0-shoe'),
   'planted boot is not interpolated by presentation');
  pose(rig,{seconds:3+2/60,handlingOverride:'ads',
   aiming:true,aimBlend:1});
  assert.ok(rig.head.position.y>=9.45-1e-8);
  assert.ok(Number.isFinite(vecDiff(oldShoe,snapshot(rig,'leg-0-shoe'))));
  finite(rig);
  assert.equal(inspectOperatorPoseOutput(rig).generation,3);
  const unchanged=snapshot(rig,'held-weapon');
  pose(rig,{seconds:3+2/60,handlingOverride:'ads',
   aiming:true,aimBlend:1});
  assert.deepEqual(snapshot(rig,'held-weapon'),unchanged,
   'repeated time must not advance visual interpolation');
  assert.equal(inspectOperatorPoseOutput(rig).generation,4,
   'one complete output commit per evaluated frame');
 }finally{rig.dispose();endpoint.dispose();}
});

test('A2.5 deterministic seek bypasses smoothing and restores exact endpoints',()=>{
 const rig=createOperatorRig('a25-seek','blue');
 const source={seconds:4,handlingOverride:'ads',aiming:true,aimBlend:1,
  deterministic:true};
 try{
  pose(rig,source);
  const first=snapshot(rig,'head');
  assert.ok(rig.head.position.y>=9.45-1e-8,
   'ADS cannot bury head/neck below collar');
  pose(rig,{...source,seconds:8,handlingOverride:'short'});
  pose(rig,source);
  assert.deepEqual(snapshot(rig,'head'),first);
  finite(rig);
 }finally{rig.dispose();}
});
