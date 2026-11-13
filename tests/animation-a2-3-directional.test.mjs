import test from 'node:test';
import assert from 'node:assert/strict';
import {directionalFootPlan,supportedPivotYaw,directionalBodyCue}
 from '../src/breach-directional-gait.ts';
import {LabDistanceMotionCache} from '../src/breach-lab-tracks.ts';
import {createDistanceGait,advanceDistanceGait}
 from '../src/breach-distance-gait.ts';
import {plannedBootYaw,angleDifference,BOOT_MAX_STEP_YAW}
 from '../src/breach-foot-yaw.ts';
import {bodyFromContacts} from '../src/breach-body-motion.ts';
import {horizontalLegReach,LEG_HIP_SIDE}
 from '../src/breach-leg-geometry.ts';
const input=(travelYaw=0,gait='walk')=>({
 time:0,position:{x:0,y:0},rootYaw:0,facingYaw:0,
 travelYaw,speed:34,turning:0,posture:'stand',
 injury:0,down:false,gait,footAllowed:()=>true
});
test('A2.3: left/right lead and follow use mirrored, bounded lateral foot intent',()=>{
 for(const [mode,dir,leader] of [
  ['strafe-right',Math.PI/2,1],['strafe-left',-Math.PI/2,0]]){
  const lead=directionalFootPlan(input(dir),mode,leader,0);
  const follow=directionalFootPlan(input(dir),mode,1-leader,0);
  assert.equal(lead.lead,true);assert.equal(follow.lead,false);
  assert.equal(lead.lateral,true);
  assert.ok(Math.abs(lead.sideBias)>Math.abs(follow.sideBias));
  assert.equal(Math.sign(lead.sideBias),Math.sign(dir));
  assert.equal(Math.sign(follow.sideBias),Math.sign(dir));
 }
});
test('A2.3: backpedal is not a forward sprint step',()=>{
 const normal=directionalFootPlan(input(0),'forward',0,0);
 const back=directionalFootPlan(input(Math.PI),'backward',0,0);
 const pie=directionalFootPlan(input(.3,'pie'),'forward',0,0);
 assert.ok(back.travelProjection<normal.travelProjection);
 assert.ok(back.travelLead<normal.travelLead);
 assert.ok(pie.travelProjection<=normal.travelProjection);
 assert.equal(back.reverse,true);assert.equal(normal.reverse,false);
});
test('A2.3: pivot yaw remains supported by boots until they replant',()=>{
 const left=0,right=0;
 const turn=supportedPivotYaw(0,-Math.PI,left,right,true);
 assert.ok(Math.abs(turn)<=.10+1e-9);
 let pelvis=0;
 for(let k=0;k<120;k++)
  pelvis=supportedPivotYaw(pelvis,-Math.PI,0,0,true);
 assert.ok(Math.abs(pelvis)<=.48+1e-7,
  'pelvis cannot rotate through stationary boots');
 const after=supportedPivotYaw(pelvis,-Math.PI,-.52,-.52,true);
 assert.ok(after<pelvis,'replanted boots let hips continue the pivot');
 assert.ok(Math.abs(angleDifference(0,plannedBootYaw(0,-Math.PI)))<=
  BOOT_MAX_STEP_YAW+1e-9);
});
test('A2.3: lateral and reverse body cues never invent time-driven bob',()=>{
 const neutral=directionalBodyCue(.5,1,0,1,0,'walk');
 const lateral=directionalBodyCue(.5,0,1,1,0,'walk');
 const reverse=directionalBodyCue(.5,-1,0,1,0,'walk');
 const pie=directionalBodyCue(.5,0,1,1,1,'pie');
 assert.equal(neutral.stanceDrop,0);
 assert.ok(lateral.stanceDrop>neutral.stanceDrop);
 assert.ok(reverse.stanceDrop>lateral.stanceDrop);
 assert.ok(lateral.torsoYaw>0);
 assert.ok(Math.abs(pie.torsoYaw)<Math.abs(lateral.torsoYaw));
 const feet=[-1,1].map(side=>({position:{x:0,y:side*5.6},
  phase:'planted',progress:1,contact:true,height:0,worldYaw:0}));
 const body=direction=>bodyFromContacts({velocity:36,
  heading:0,travelYaw:direction,turning:0,
  injury:0,posture:'stand',feet,position:{x:0,y:0},gait:'walk'});
 assert.ok(body(Math.PI).pelvisY<body(0).pelvisY);
 assert.ok(body(Math.PI/2).pelvisY<body(0).pelvisY);
 assert.deepEqual(body(Math.PI/2),body(Math.PI/2));
});
test('A2.3: hybrid directional corpus keeps single support and finite contacts',()=>{
 const tracks=['strafe-left','strafe-right','strafe-stop',
  'strafe-reverse','back','turn-90','turn-180','pivot-reverse',
  'pie','crouch-walk','squeeze','mixed','restart','stop'];
 for(const name of tracks){
  const lab=new LabDistanceMotionCache(name);
  assert.equal(lab.frames.length,241);
  let lastEvents=0;
  for(let k=0;k<lab.targets.length;k++){
   const f=lab.targets[k],m=lab.sample(k/60).motion;
   assert.ok(f.some(foot=>foot.contact),name+' both shoes airborne '+k);
   assert.ok(f.every(foot=>Number.isFinite(foot.position.x)&&
     Number.isFinite(foot.position.y)&&Number.isFinite(foot.worldYaw)),
     name+' nonfinite shoe '+k);
   const s=lab.frames[k];
   assert.ok(s.stepsTaken>=lastEvents,name+' step count reversed');
   assert.ok(s.stepsTaken-lastEvents<=1,name+' double-step tick');
   lastEvents=s.stepsTaken;
   assert.ok(Number.isFinite(s.pelvisYaw)&&Number.isFinite(m.heading));
  }
  const last=lab.frames.at(-1);
  assert.ok(last.stepsTaken<32,name+' frantic corrective steps');
  assert.ok(last.starvations<=10,name+' repeated blocked footholds: '+last.starvations);
 }
});
test('A2.3: a live lateral reversal never cancels or teleports airborne boots',()=>{
 const s=createDistanceGait();let prior;
 for(let tick=0;tick<=170;tick++){
  const t=tick/60,v=t<1.15?34:-34,
    y=t<1.15?34*t:34*1.15-34*(t-1.15);
  const feet=advanceDistanceGait(s,{...input(v>0?Math.PI/2:-Math.PI/2),
   time:t,position:{x:0,y},speed:34});
  if(prior)for(let index=0;index<2;index++){
   const a=prior[index],b=feet[index];
   if(a.contact&&a.phase!=='swinging'&&
      b.phase!=='landing'&&b.phase!=='recovering'&&b.phase!=='planted'){
    assert.deepEqual(b.position,a.position,
     'unloading foot must not drift from planted anchor');
   }
  }
  assert.ok(feet.some(f=>f.contact));
  assert.ok(s.feet.filter(f=>f.phase==='swinging').length<=1);
  prior=feet;
 }
 assert.equal(s.resets,1,'reversal must not reset world contacts');
 assert.ok(s.stepsTaken>5);
});
test('A2.3: replay lab seeks backwards reproduce the same complete gait',()=>{
 for(const name of ['strafe-reverse','turn-180',
  'pivot-reverse','back','pie']){
  const cache=new LabDistanceMotionCache(name);
  const reference=cache.sample(1.475);
  for(const t of [3.75,.15,2.91,.7,1.475])cache.sample(t);
  assert.deepEqual(cache.sample(1.475),reference);
  const last=cache.frames.at(-1);
  assert.ok(last.stepsTaken>0);
 }
});
test('A2.3: conservative stationary turning remains a bounded correction',()=>{
 const track=new LabDistanceMotionCache('turn-180');
 for(let k=0;k<track.frames.length;k++){
  const s=track.frames[k],feet=track.targets[k];
  assert.ok(s.feet.every(f=>Math.abs(angleDifference(
   f.fromYaw,f.targetYaw))<=BOOT_MAX_STEP_YAW+.0001));
  const speed=track.sample(k/60).motion.speed;
  if(speed<5){
   const left=s.feet[0].worldYaw,right=s.feet[1].worldYaw;
   const average=s.pelvisYaw+
    (angleDifference(s.pelvisYaw,left)+angleDifference(s.pelvisYaw,right))*.5;
   assert.ok(Math.abs(angleDifference(average,s.pelvisYaw))<.65,
    'hip yaw got ahead of both supporting boots at '+k);
  }
  const m=track.sample(k/60).motion;
  for(let index=0;index<2;index++){
   if(!feet[index].contact)continue;
   const side=index===0?-1:1;
   const h={x:m.x-Math.sin(m.heading)*side*LEG_HIP_SIDE,
    y:m.z+Math.cos(m.heading)*side*LEG_HIP_SIDE};
   const d=Math.hypot(feet[index].position.x-h.x,
    feet[index].position.y-h.y);
   assert.ok(Number.isFinite(d)&&d<horizontalLegReach()+12);
  }
 }
});
