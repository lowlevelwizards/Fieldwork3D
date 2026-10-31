import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createFootstepScheduler,advanceFootsteps}
  from '../src/breach-footsteps.ts';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {footAnchorClear,footAnchorReachable} from '../src/breach-navigation.ts';
import {activateSite,initialDoors} from '../src/breach-core.ts';

const input=(time,x=100,y=100,extra={})=>({
  time,position:{x,y},rootYaw:0,facingYaw:0,travelYaw:0,
  speed:0,turning:0,posture:'stand',injury:0,down:false,...extra
});
const pose=(x,z,seconds,extra={})=>({
  x,z,seconds,heading:0,velocity:0,stride:0,
  posture:'stand',injury:0,weapon:'carbine',reload:0,reloadDuration:1.8,
  lastThrowAt:-100,lastDoorAt:-100,down:false,surrender:false,
  aiming:false,firing:false,turning:0,...extra
});

test('156: a blocked collision recovers through an animated step, never a teleport',()=>{
  const s=createFootstepScheduler();
  advanceFootsteps(s,input(0,100,100,{speed:48}));
  advanceFootsteps(s,input(.12,105,100,{speed:48}));
  const previous=s.resets;
  let last=null,largest=0,sawSwing=false;
  for(let i=0;i<45;i++){
    const p=input(.14+i/60,116,100,{speed:48,blocked:true});
    const feet=advanceFootsteps(s,p);
    if(last)for(let k=0;k<2;k++)
      largest=Math.max(largest,Math.hypot(
        feet[k].position.x-last[k].position.x,
        feet[k].position.y-last[k].position.y));
    sawSwing ||= feet.some(f=>!f.contact);
    last=feet;
  }
  assert.ok(sawSwing,'a contact recovery should have a visible swing');
  assert.ok(largest<6,'one 60 Hz frame must not jump a whole boot width');
  assert.equal(s.resets,previous,
    'only real teleports or timeline discontinuities reset the scheduler');
});
test('145: planted anchors and planned landings obey physical clearance',()=>{
  const safe=point=>point.y<=100;
  const s=createFootstepScheduler();
  for(let i=0;i<60;i++){
    const f=advanceFootsteps(s,input(i/60,100+i*.3,100,
      {speed:18,footAllowed:safe}));
    assert.ok(f.every(t=>safe(t.position)));
  }
});
test('145: door leaves and walls invalidate unsafe foot contact',()=>{
  activateSite(null);
  const doors=initialDoors();
  assert.equal(footAnchorClear({x:300,y:532},doors),false);
  assert.equal(footAnchorClear({x:330,y:560},doors),true);
  // The endpoint is valid floor, but the hip-to-foot segment goes through
  // an actual wall: this is not a legal planted stance.
  const hip={x:366,y:200},foot={x:396,y:200};
  assert.equal(footAnchorClear(foot,doors),true);
  assert.equal(footAnchorReachable(hip,foot,doors),false);
  activateSite(null);
});
test('145: even a corrupt replay foot target cannot stretch the leg',()=>{
  const rig=createOperatorRig('rook','blue');
  const bad=(x,y)=>({
    position:{x,y},height:0,worldYaw:0,phase:'planted',
    contact:true,reason:'locomotion',pitch:0,progress:1
  });
  rig.root.position.set(100,0,100);
  const scenePose=pose(100,100,2,{deterministic:true,
    replayFeet:[bad(-200,100),bad(100,340)],
    blocked:true});
  poseOperator(rig,scenePose,1/60);
  rig.root.updateMatrixWorld(true);
  for(const foot of rig.feet){
    assert.ok(foot.shoe.position.length()<19);
    assert.ok(!foot.ankleLink.visible||
      foot.ankleLink.scale.y<1.5);
    assert.ok(foot.upper.scale.y<=9.70001);
    assert.ok(foot.lower.scale.y<=9.70001);
    assert.ok(foot.shoe.getWorldPosition(new THREE.Vector3())
      .distanceTo(foot.anchor)<1e-4);
  }
  assert.ok(rig.legGap.every(v=>v<1.5));
  // Recovery is independent of previous pose or render-frame history.
  const before=rig.feet.map(f=>f.shoe.position.toArray());
  poseOperator(rig,pose(100,100,1,{deterministic:true,
    replayFeet:[bad(140,100),bad(100,-90)]}),1/60);
  poseOperator(rig,scenePose,1/60);
  assert.deepEqual(rig.feet.map(f=>f.shoe.position.toArray()),before);
  rig.dispose();
});
test('145: ordinary walking still uses intentional planted step contacts',()=>{
  const s=createFootstepScheduler();
  for(let i=0;i<220;i++)
    advanceFootsteps(s,input(i/60,i/60*37,0,{speed:37}));
  assert.equal(s.resets,1,'normal movement should never force stance reset');
  assert.ok(s.feet.some(f=>f.lastTouchdown>0));
});
