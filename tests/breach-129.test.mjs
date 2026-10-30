import test from 'node:test';
import assert from 'node:assert/strict';
import {LabMotionCache} from '../src/breach-lab-tracks.ts';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
test('129: ankle gap is visible and remains bounded through lateral shuffles',()=>{
 const rig=createOperatorRig('rook','blue');
 for(const kind of ['strafe-left','strafe-right','strafe-stop','strafe-reverse','mixed']){
  const cache=new LabMotionCache(kind);
  let widest=0;
  for(let i=0;i<210;i+=3){
   const t=i/60,{motion:m,feet,state}=cache.sample(t);
   rig.root.position.set(m.x,0,m.z);
   poseOperator(rig,{x:m.x,z:m.z,heading:m.heading,
     velocity:m.speed,travelYaw:m.travelYaw,pelvisYaw:state.pelvisYaw,
     seconds:t,stride:t*40,posture:m.posture,injury:0,
     weapon:'carbine',reload:0,reloadDuration:1.8,
     lastThrowAt:-100,lastDoorAt:-100,down:false,surrender:false,
     aiming:true,firing:false,turning:m.turning,aimBlend:m.aim,
     shotHeading:m.heading,replayFeet:feet,deterministic:true},0);
   widest=Math.max(widest,...rig.legGap);
   assert.ok(rig.legGap.every(Number.isFinite));
  }
  assert.ok(widest<1.5,kind+' has runaway reach '+widest);
 }
 rig.dispose();
});
