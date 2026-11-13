import test from 'node:test';
import assert from 'node:assert/strict';
import {THROW_SUPPORT_GESTURE,throwSupportGesture,
 sampleChoreography,validateChoreography,
 choreographyMarkersBetween} from '../src/breach-animation-choreography.ts';
import {createWorkbenchChoreography,upsertWorkbenchKey,
 removeWorkbenchKey,sampleWorkbenchChoreography,
 addWorkbenchMarker,readWorkbenchChoreography}
 from '../src/operator-workbench-choreography.ts';
import {createOperatorRig,poseOperator}
 from '../src/breach-operator-rig.ts';
import {captureWorkbenchPose,cloneWorkbenchPose}
 from '../src/operator-pose-workbench.ts';
import {captureAnimationQuality,compareAnimationFrames}
 from '../src/breach-animation-quality.ts';

test('A1 pure throw support gesture: bounded, seekable, no action authority',()=>{
 validateChoreography(THROW_SUPPORT_GESTURE);
 const before=JSON.stringify(THROW_SUPPORT_GESTURE);
 assert.deepEqual(throwSupportGesture(-1),{forward:0,lift:0});
 assert.deepEqual(throwSupportGesture(.70),{forward:0,lift:0});
 assert.ok(throwSupportGesture(.36).forward>7);
 const peak=throwSupportGesture(.36);
 throwSupportGesture(.69);throwSupportGesture(.1);
 assert.deepEqual(throwSupportGesture(.36),peak);
 assert.equal(JSON.stringify(THROW_SUPPORT_GESTURE),before);
 assert.equal(choreographyMarkersBetween(THROW_SUPPORT_GESTURE,0,.35).length,0);
 assert.equal(choreographyMarkersBetween(THROW_SUPPORT_GESTURE,.35,.37).length,1);
 assert.equal(choreographyMarkersBetween(THROW_SUPPORT_GESTURE,.37,.35).length,0);
});
test('A1 interpolation handles hold/smooth, endpoint and duplicate failures',()=>{
 const clip={version:1,id:'test',duration:1,keys:[
  {at:0,value:0,ease:'hold'},{at:.5,value:2,ease:'smooth'},
  {at:1,value:4}
 ]};
 validateChoreography(clip);
 assert.equal(sampleChoreography(clip,.25,(a,b,t)=>a+(b-a)*t),0);
 assert.equal(sampleChoreography(clip,.5,(a,b,t)=>a+(b-a)*t),2);
 assert.equal(sampleChoreography(clip,2,(a,b,t)=>a+(b-a)*t),4);
 assert.throws(()=>validateChoreography({...clip,keys:[
  {at:0,value:0},{at:0,value:1},{at:1,value:2}
 ]}));
});
test('A1 Workbench sequence editor preserves independent IK recipes',()=>{
 const rig=createOperatorRig('a1-workbench','blue',true);
 try{
  const pose={x:0,z:0,heading:0,velocity:0,seconds:1,stride:0,
   posture:'stand',injury:0,weapon:'carbine',
   reload:0,reloadDuration:1,lastThrowAt:-100,lastDoorAt:-100,
   down:false,surrender:false,aiming:false,firing:false,
   turning:0,deterministic:true};
  poseOperator(rig,pose,0);
  const base=captureWorkbenchPose(rig,'carbine','ar-m4a1');
  const edited=cloneWorkbenchPose(base);
  edited.targets.supportHand[1]+=2;
  let clip=createWorkbenchChoreography(base,edited);
  const mid=sampleWorkbenchChoreography(clip,.6);
  assert.ok(mid.targets.supportHand[1]>base.targets.supportHand[1]);
  clip=upsertWorkbenchKey(clip,.4,mid);
  clip=addWorkbenchMarker(clip,.4,'contact','support-hand-release');
  const saved=JSON.stringify(clip);
  const loaded=readWorkbenchChoreography(saved);
  assert.deepEqual(sampleWorkbenchChoreography(loaded,.4),
   sampleWorkbenchChoreography(clip,.4));
  assert.equal(loaded.keys.length,3);
  assert.equal(loaded.markers.length,1);
  assert.equal(JSON.stringify(base),
   JSON.stringify(createWorkbenchChoreography(base,edited).keys[0].value));
  assert.equal(removeWorkbenchKey(loaded,.4).keys.length,2);
  assert.throws(()=>readWorkbenchChoreography(
   JSON.stringify({...loaded,keys:[...loaded.keys].reverse()})));
 }finally{rig.dispose();}
});
test('A1 production throw remains deterministic and separate from physical aim',()=>{
 const rig=createOperatorRig('a1-live','blue',true);
 try{
  const p={x:0,z:0,heading:0,velocity:0,seconds:7,stride:0,
   posture:'stand',injury:0,weapon:'carbine',reload:0,
   reloadDuration:1,lastDoorAt:-100,lastThrowAt:6.7,
   down:false,surrender:false,aiming:false,firing:false,
   turning:0,poseV3Preview:true,poseV4ReloadPreview:true,
   poseDiagnostics:false,deterministic:true};
  poseOperator(rig,p,0);
  const first=captureAnimationQuality(rig,p.seconds);
  poseOperator(rig,{...p,seconds:7.5},0);
  poseOperator(rig,p,-1);
  const repeat=captureAnimationQuality(rig,p.seconds);
  assert.equal(compareAnimationFrames(first,repeat).frozenDrift,false);
  assert.equal(repeat.slotCount,30);
 }finally{rig.dispose();}
});
