import test from 'node:test';
import assert from 'node:assert/strict';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {PoseTemporalMonitor} from '../src/breach-pose-temporal-diagnostics.ts';

const pose={
 x:0,z:0,heading:.6,travelYaw:.6,pelvisYaw:-.6,
 seconds:4,idleLifeSeconds:2,stride:0,velocity:0,turning:0,
 posture:'stand',injury:0,weapon:'carbine',
 reload:0,reloadDuration:1.8,lastThrowAt:-100,lastDoorAt:-100,
 down:false,surrender:false,aiming:false,firing:false,aimBlend:0
};
test('UOP temporal probe recognizes unchanged pose and measured wrist jitter',()=>{
 const rig=createOperatorRig('uop-probe','blue',true);
 const probe=new PoseTemporalMonitor();
 try{
  poseOperator(rig,pose,0);
  assert.equal(probe.sample(rig,'idle',4).firstSample,true);
  poseOperator(rig,pose,0);
  const unchanged=probe.sample(rig,'idle',4);
  assert.equal(unchanged.unchangedIntent,true);
  assert.equal(unchanged.sameTimestamp,true);
  assert.equal(unchanged.frozenDrift,false);
  assert.ok(unchanged.maxTranslation<1e-4);
  assert.ok(unchanged.maxRotation<1e-4);
  // Instrumentation must compare actual rendered geometry rather than a
  // solver flag that could report success across oscillating arm solutions.
  rig.arms[0].hand.position.x+=.35;
  const disturbed=probe.sample(rig,'idle',4);
  assert.equal(disturbed.frozenDrift,true);
  assert.ok(disturbed.wristTranslation[0]>.34);
  assert.ok(disturbed.maxTranslation>.34);
  probe.reset(rig);
  assert.equal(probe.sample(rig,'idle',4).firstSample,true);
 }finally{rig.dispose();}
});
test('UOP temporal probe is per-operator and does not mistake an intent change for frozen drift',()=>{
 const rigs=[0,1].map(i=>createOperatorRig('uop-probe-'+i,'blue',true));
 const probe=new PoseTemporalMonitor();
 try{
  for(const r of rigs)poseOperator(r,pose,0);
  probe.sample(rigs[0],'hold',4);
  probe.sample(rigs[1],'hold',4);
  rigs[0].weapon.position.x+=.5;
  assert.equal(probe.sample(rigs[0],'hold',4).frozenDrift,true);
  const other=probe.sample(rigs[1],'hold',4);
  assert.equal(other.frozenDrift,false);
  assert.equal(other.weaponTranslation,0);
  const changed=probe.sample(rigs[0],'aim',4);
  assert.equal(changed.unchangedIntent,false);
  assert.equal(changed.frozenDrift,false);
 }finally{for(const r of rigs)r.dispose();}
});
