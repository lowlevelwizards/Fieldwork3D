import test from 'node:test';
import assert from 'node:assert/strict';
import {createOperatorRig,poseOperator}
 from '../src/breach-operator-rig.ts';
import {captureAnimationQuality,compareAnimationFrames,
 ANIMATION_QA_SCENARIOS} from '../src/breach-animation-quality.ts';

const base={x:0,z:0,heading:0,velocity:0,seconds:4,stride:0,
 posture:'stand',injury:0,weapon:'carbine',reload:0,
 reloadDuration:1.8,lastDoorAt:-100,lastThrowAt:-100,down:false,
 surrender:false,aiming:false,firing:false,turning:0,
 poseV3Preview:true,poseV4ReloadPreview:true,
 deterministic:true,poseDiagnostics:false};
test('A0 scenario census is stable and includes critical combat/interaction modes',()=>{
 assert.ok(ANIMATION_QA_SCENARIOS.length>=16);
 for(const name of ['pivot','strafe','reverse','short-stock','reload',
 'door-reach','down','surrender'])
  assert.ok(ANIMATION_QA_SCENARIOS.includes(name));
});
test('A0 output has 30 finite, uniquely owned slots; identical pose is stable',()=>{
 const rig=createOperatorRig('a0-integrity','blue',true);
 try{
  poseOperator(rig,base,0);
  const first=captureAnimationQuality(rig,4);
  poseOperator(rig,base,0);
  const second=captureAnimationQuality(rig,4);
  assert.equal(first.slotCount,30);
  assert.equal(first.invalidSlots,0);
  assert.equal(Object.keys(first.slots).length,30);
  assert.equal(compareAnimationFrames(first,second).frozenDrift,false);
 }finally{rig.dispose();}
});
test('A0 independent rigs, action seek and return do not corrupt pose output',()=>{
 const a=createOperatorRig('a0-replay-a','blue',true);
 const b=createOperatorRig('a0-replay-b','red',true);
 try{
  // Deterministic replay consumes the recorded contact targets. Without
  // these, the fallback live step scheduler legitimately keeps history and
  // is not a valid seek-parity fixture.
  const replayFeet=[
   {position:{x:0,y:-5.6},worldYaw:0,height:0,
    contact:true,phase:'planted',progress:1,pitch:0},
   {position:{x:0,y:5.6},worldYaw:0,height:0,
    contact:true,phase:'planted',progress:1,pitch:0}
  ];
  const recorded={...base,replayFeet};
  poseOperator(a,recorded,0);
  const expected=captureAnimationQuality(a,4);
  poseOperator(b,{...base,weapon:'rifle',posture:'crouch'},0);
  poseOperator(a,{...recorded,seconds:6,reload:.6,
   reloadMode:'emergency'},0);
  poseOperator(a,recorded,-1);
  const after=captureAnimationQuality(a,4);
  const continuity=compareAnimationFrames(expected,after);
  assert.equal(continuity.frozenDrift,false,
   'Recorded-contact seek drift: '+JSON.stringify(continuity));
  assert.equal(captureAnimationQuality(b,4).slotCount,30);
 }finally{a.dispose();b.dispose();}
});
