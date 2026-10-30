import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {LabMotionCache,LAB_TRACKS,TRACK_DURATION,
  sampleLabTrack} from '../src/breach-lab-tracks.ts';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
const near=(a,b,t=1e-6)=>Math.abs(a-b)<=t;
test('122: all lab tracks yield finite velocities and deterministic timestamps',()=>{
  for(const kind of LAB_TRACKS){
    const cache=new LabMotionCache(kind);
    for(const t of [0,.16,.35,.8,1.25,1.99,2.62,3.5,TRACK_DURATION]){
      const sample=cache.sample(t);
      assert.deepEqual(cache.sample(t),sample,'same timestamp must reproduce');
      for(const n of [sample.motion.x,sample.motion.z,
        sample.motion.speed,sample.motion.heading,
        sample.motion.travelYaw,sample.motion.turning])
        assert.ok(Number.isFinite(n),kind+' at '+t);
      assert.ok(sample.feet.some(f=>f.contact),kind+' unsupported');
      for(const foot of sample.feet)
        assert.ok(Number.isFinite(foot.position.x)&&
          Number.isFinite(foot.position.y)&&Number.isFinite(foot.height));
    }
  }
});
test('122: lab velocity matches actual path displacement, not a stride clock',()=>{
  for(const kind of ['walk','back','strafe-right','crouch','wounded']){
    const a=sampleLabTrack(kind,.5),b=sampleLabTrack(kind,.51);
    const measured=Math.hypot(b.x-a.x,b.z-a.z)/.01;
    assert.ok(near(measured,a.speed,.1),kind+' track speed disagrees with movement');
  }
  assert.ok(near(sampleLabTrack('idle',1).speed,0));
  assert.ok(near(sampleLabTrack('turn-180',1.3).speed,0));
});
test('122: walking, turning, wounded and PIE preview have deliberate steps',()=>{
  for(const kind of ['walk','turn','pie','strafe','wounded','crouch']){
    const cache=new LabMotionCache(kind);
    let swing=0,touchdown=0,previous=null;
    for(let i=0;i<=240;i++){
      const feet=cache.sample(i/60).feet;
      if(feet.some(x=>x.phase==='swinging'))swing++;
      const contact=feet.map(x=>x.contact);
      if(previous)for(let j=0;j<2;j++)
        if(!previous[j]&&contact[j])touchdown++;
      assert.ok(contact.some(Boolean),'one foot must support');
      previous=contact;
    }
    assert.ok(swing>0,kind+' needs actual footstep swing');
    assert.ok(touchdown>=1,kind+' needs touchdown');
  }
});
test('122: frame rate and arbitrary seeks cannot change lab foot pose',()=>{
  const cache=new LabMotionCache('accelerate');
  const exact=cache.sample(1.436);
  for(const fps of [30,60,120]){
    for(let t=0;t<TRACK_DURATION;t+=1/fps)cache.sample(t);
    for(const seek of [3.8,.4,2.8,.01,1.436])cache.sample(seek);
    assert.deepEqual(cache.sample(1.436),exact);
  }
});
test('122: full procedural rig is stable across continuous test tracks',()=>{
  const rig=createOperatorRig('rook','blue');
  const scratch=new THREE.Vector3();
  for(const kind of ['walk','turn-180','strafe-left','pie',
    'wounded','crouch-walk','aim','reload','door','down']){
    const cache=new LabMotionCache(kind);
    for(let i=0;i<=240;i+=2){
      const t=i/60,{motion:m,feet}=cache.sample(t);
      rig.root.position.set(m.x,0,m.z);
      poseOperator(rig,{x:m.x,z:m.z,heading:m.heading,velocity:m.speed,
        seconds:t,travelYaw:m.travelYaw,deterministic:true,
        replayFeet:feet,stride:t*40,posture:m.posture,injury:m.injury,
        weapon:'carbine',reload:m.reload,reloadDuration:1.8,
        lastThrowAt:m.throwAt,lastDoorAt:m.doorAt,
        doorPoint:kind==='door'?{x:25.5,y:8}:undefined,
        down:m.down,surrender:false,aiming:m.aim>.2,
        firing:false,turning:m.turning,aimBlend:m.aim,
        shotHeading:m.heading},1/60);
      rig.root.updateMatrixWorld(true);
      for(const limb of [...rig.feet,...rig.arms])
        for(const bone of [limb.upper,limb.lower]){
          const p=bone.getWorldPosition(scratch);
          assert.ok(p.toArray().every(Number.isFinite),kind+' nonfinite joint');
          assert.ok(bone.quaternion.toArray().every(Number.isFinite));
        }
      assert.ok(feet.some(x=>x.contact));
    }
  }
  rig.dispose();
});
test('122: four-operator plus enemies workload avoids unbounded foot events',()=>{
  const four=Array.from({length:8},()=>new LabMotionCache('walk'));
  let count=0;
  for(let i=0;i<240;i++){
    const t=i/60;
    for(const cache of four){
      const pose=cache.sample(t);
      count+=pose.feet.filter(x=>x.contact).length;
    }
  }
  assert.ok(count>=240*8);
});
