import test from 'node:test';
import assert from 'node:assert/strict';
import {createFootstepScheduler,advanceFootsteps}
  from '../src/breach-footsteps.ts';
import {bodyFromContacts} from '../src/breach-body-motion.ts';
import {uncrossed} from '../src/breach-locomotion.ts';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
const input=(time,z,speed,sign=1)=>({
  time,position:{x:100,y:100+z},rootYaw:0,facingYaw:0,
  travelYaw:sign*Math.PI/2,speed,turning:0,
  posture:'stand',injury:0,down:false
});
test('157: both lateral shuffles remain continuous and inside usable leg reach',()=>{
  for(const sign of [-1,1]){
    const s=createFootstepScheduler();
    let prev=null,maxFrameDisplacement=0,stepFrames=0,maxReach=0;
    for(let frame=0;frame<=210;frame++){
      const time=frame/60,moving=time<2.5;
      const z=sign*38*Math.min(time,2.5);
      const feet=advanceFootsteps(s,input(time,z,moving?38:0,sign));
      if(prev)for(let i=0;i<2;i++)
        maxFrameDisplacement=Math.max(maxFrameDisplacement,Math.hypot(
          feet[i].position.x-prev[i].position.x,
          feet[i].position.y-prev[i].position.y));
      for(const foot of feet){
        maxReach=Math.max(maxReach,Math.hypot(
          foot.position.x-100,foot.position.y-(100+z)));
      }
      if(feet.some(f=>!f.contact))stepFrames++;
      assert.ok(uncrossed(feet[0].position,feet[1].position,0,3.6));
      prev=feet;
    }
    assert.ok(stepFrames>60,'shuffle should have meaningful swinging steps');
    assert.ok(maxReach<14,'lateral stance must not demand teleport recovery: '+maxReach);
    assert.ok(maxFrameDisplacement<4,
      'a single 60 Hz frame must not skip the boot across the floor: '+
      maxFrameDisplacement);
    assert.equal(s.resets,1,'strafe must not reset planted contacts');
  }
});
test('157: rig feet do not visibly snap under sustained 38-unit lateral travel',()=>{
  for(const sign of [-1,1]){
    const rig=createOperatorRig('rook','blue');
    let previous=null,largest=0,fallBacks=0;
    for(let frame=0;frame<=130;frame++){
      const seconds=frame/60,z=100+sign*38*seconds;
      rig.root.position.set(100,0,z);
      poseOperator(rig,{
        x:100,z,seconds,heading:0,travelYaw:sign*Math.PI/2,
        velocity:38,stride:38*seconds,turning:0,posture:'stand',
        injury:0,weapon:'carbine',reload:0,reloadDuration:1.8,
        lastThrowAt:-100,lastDoorAt:-100,down:false,
        surrender:false,aiming:false,firing:false,
      },1/60);
      const positions=rig.feet.map(f=>({x:f.anchor.x,y:f.anchor.z}));
      if(previous)for(let i=0;i<2;i++)
        largest=Math.max(largest,Math.hypot(
          positions[i].x-previous[i].x,positions[i].y-previous[i].y));
      if(rig.legGap.some(g=>g>1.5))fallBacks++;
      previous=positions;
    }
    assert.ok(largest<4,'IK forced a strafe boot jump: '+largest);
    assert.equal(fallBacks,0,'strafe stance requested unreachable leg geometry');
    rig.dispose();
  }
});
const foot=(phase,progress)=>({
  position:{x:0,y:0},height:0,worldYaw:0,phase,
  contact:phase!=='swinging',progress,pitch:0
});
test('157: support weight and pelvis are continuous through foot phase boundaries',()=>{
  const pose=f=>bodyFromContacts({velocity:38,heading:0,
    travelYaw:Math.PI/2,turning:0,injury:0,posture:'stand',
    feet:[foot('planted',0),f]});
  for(const [before,after] of [
    [foot('unloading',1),foot('swinging',0)],
    [foot('swinging',1),foot('landing',0)],
    [foot('landing',1),foot('recovering',0)]
  ]){
    const a=pose(before),b=pose(after);
    assert.ok(Math.abs(a.support-b.support)<.001,
      'support jumps at transition '+before.phase+' -> '+after.phase);
    assert.ok(Math.abs(a.pelvisY-b.pelvisY)<.001,
      'pelvis pops at transition '+before.phase+' -> '+after.phase);
  }
});
