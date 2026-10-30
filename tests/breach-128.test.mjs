import test from 'node:test';
import assert from 'node:assert/strict';
import {LabMotionCache} from '../src/breach-lab-tracks.ts';
import {uncrossed,sideOffset} from '../src/breach-locomotion.ts';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
const tracks=['strafe-stop','strafe-reverse','mixed','pivot-reverse'];
test('128: integrated directional tracks never cross the legs',()=>{
 for(const kind of tracks){
  const cache=new LabMotionCache(kind);
  for(let i=0;i<=240;i++){
   const t=i/60,{motion,feet,state}=cache.sample(t);
   assert.ok(uncrossed(feet[0].position,feet[1].position,
     -state.pelvisYaw,3.5),
     kind+' at '+t.toFixed(3)+' stance '+state.mode+
     ' gap '+sideOffset(feet[0].position,
       feet[1].position,-state.pelvisYaw).toFixed(3));
   assert.ok(feet.some(f=>f.contact));
   assert.ok(Number.isFinite(motion.heading));
  }
 }
});
test('128: stop, reverse and mixed tracks reproduce exactly after seek',()=>{
 for(const kind of tracks){
  const cache=new LabMotionCache(kind),before=cache.sample(1.475);
  for(const time of [3.8,.25,2.65,0,1.475])cache.sample(time);
  assert.deepEqual(cache.sample(1.475),before);
 }
});
test('128: combined weapon + gait + body remains stable in hard strafe',()=>{
 const rig=createOperatorRig('rook','blue');
 for(const kind of ['strafe-left','strafe-right','strafe-stop','strafe-reverse']){
  const cache=new LabMotionCache(kind);
  for(const weapon of ['carbine','smg','rifle','shotgun']){
   for(let i=0;i<210;i+=5){
    const t=i/60,{motion:m,feet,state}=cache.sample(t);
    rig.root.position.set(m.x,0,m.z);
    poseOperator(rig,{x:m.x,z:m.z,heading:m.heading,
     velocity:m.speed,travelYaw:m.travelYaw,
     pelvisYaw:state.pelvisYaw,seconds:t,stride:t*40,
     posture:m.posture,injury:0,weapon,reload:0,reloadDuration:1.8,
     lastDoorAt:-100,lastThrowAt:-100,down:false,surrender:false,
     aiming:true,firing:false,turning:m.turning,aimBlend:1,
     shotHeading:m.heading,replayFeet:feet,deterministic:true},0);
    assert.ok(rig.gripError<.02,
     kind+' '+weapon+' grip '+rig.gripError.toFixed(3)+' at '+t);
    assert.ok(rig.hip.position.y>17&&rig.hip.position.y<21.5);
    assert.ok(rig.chest.rotation.z>=-.13&&rig.chest.rotation.z<=.13);
   }
  }
 }
 rig.dispose();
});
