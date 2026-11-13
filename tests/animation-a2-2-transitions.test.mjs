import test from 'node:test';
import assert from 'node:assert/strict';
import {indexMovementImpulses,sampleMovementImpulses,
 motionFromTransitions} from '../src/breach-motion-transitions.ts';
import {bodyFromContacts} from '../src/breach-body-motion.ts';
import {newSession,team} from '../src/breach-game.ts';
import {sampleLabMovementImpulse} from '../src/breach-lab-tracks.ts';
import {ReplayMotionRecorder} from '../src/breach-replay-motion.ts';

const shoe=(side,phase='planted',progress=1)=>({
 position:{x:0,y:side*5.6},height:0,
 contact:phase!=='swinging',worldYaw:0,phase,progress
});
const pose=(extras={})=>({velocity:42,acceleration:0,
 travelYaw:0,heading:0,feet:[shoe(-1),shoe(1)],
 posture:'stand',injury:0,gait:'walk',...extras});

test('A2.2 positive push-off and braking are different bounded body reactions',()=>{
 const feet=[shoe(-1,'unloading',.45),shoe(1)];
 const start=motionFromTransitions(pose({feet,
  impulse:{drive:.95,brake:0}}));
 const braking=motionFromTransitions(pose({feet,
  impulse:{drive:0,brake:.95}}));
 assert.ok(start.start>.5);
 assert.ok(start.torsoForward<0,'start inclines toward travel');
 assert.ok(braking.torsoForward>0,'braking catches the moving body');
 assert.ok(braking.pelvisY<0,'braking compresses support');
 assert.ok(start.pelvisY>0,'push-off lifts without invented foot movement');
 assert.ok(start.headPitchCounter>0);
 assert.ok(braking.headPitchCounter<0);
});

test('A2.2 lateral and reverse motion react in appropriate directions',()=>{
 const impulse={drive:0,brake:1};
 const forward=motionFromTransitions(pose({impulse}));
 const backward=motionFromTransitions(pose({travelYaw:Math.PI,impulse}));
 const sideways=motionFromTransitions(pose({travelYaw:Math.PI/2,impulse}));
 assert.ok(forward.torsoForward>0);
 assert.ok(backward.torsoForward<0);
 assert.ok(sideways.torsoSide>0);
 assert.ok(Math.abs(sideways.torsoForward)<.000001);
 assert.ok(Math.abs(backward.torsoSide)<.000001);
});

test('A2.2 landing and recovery finish a stop, then return exactly to rest',()=>{
 const atRest=pose({velocity:0});
 const receiving=motionFromTransitions({...atRest,
  feet:[shoe(-1,'landing',.5),shoe(1)]});
 const recovering=motionFromTransitions({...atRest,
  feet:[shoe(-1,'recovering',.5),shoe(1)]});
 const settled=motionFromTransitions(atRest);
 assert.ok(receiving.settle>0&&recovering.settle>0);
 assert.ok(receiving.pelvisY<0&&recovering.pelvisY<0);
 assert.ok(Object.values(settled).every(x=>x===0));
 const fast=motionFromTransitions({...atRest,gait:'run',
  feet:[shoe(-1,'recovering',.5),shoe(1)]});
 const careful=motionFromTransitions({...atRest,gait:'pie',
  feet:[shoe(-1,'recovering',.5),shoe(1)]});
 assert.ok(fast.settle>careful.settle);
});
test('A2.2 blocked, down, surrendered have no synthetic movement',()=>{
 const active=pose({acceleration:-230,velocity:78,
  impulse:{drive:1,brake:1},feet:[
   shoe(-1,'recovering',.45),shoe(1,'landing',.2)]});
 for(const flag of ['blocked','down','surrender']){
  const out=motionFromTransitions({...active,[flag]:true});
  assert.ok(Object.values(out).every(x=>x===0),flag);
 }
});
test('A2.2 holds finite bounded output under acceleration extremes',()=>{
 for(const velocity of [0,5,30,72,300]){
  for(const acceleration of [-900,-230,0,230,900]){
   for(const gait of ['run','walk','pie','squeeze']){
    const motion=motionFromTransitions(pose({
     velocity,acceleration,gait,feet:[
      shoe(-1,'unloading',.25),shoe(1,'landing',.75)]}));
    assert.ok(Object.values(motion).every(Number.isFinite));
    assert.ok(Math.abs(motion.torsoForward)<=.09);
    assert.ok(Math.abs(motion.torsoSide)<=.07);
    assert.ok(Math.abs(motion.pelvisY)<=.52);
   }
  }
 }
});
test('A2.2 Operator Lab uses the same fixed 60 Hz start/stop envelope',()=>{
 const start=sampleLabMovementImpulse('accelerate',.15);
 const stopping=sampleLabMovementImpulse('stop',1.25);
 const finished=sampleLabMovementImpulse('stop',2.9);
 assert.ok(start.drive>0,'Lab should show a visible first-step push');
 assert.ok(stopping.brake>0,'Lab should show the real braking catch');
 assert.deepEqual(finished,{drive:0,brake:0});
 assert.deepEqual(sampleLabMovementImpulse('accelerate',.15),start);
 assert.deepEqual(sampleLabMovementImpulse('stop',1.25),stopping);
});
test('A2.2 recorded impulse samples are seekable and naturally expire',()=>{
 const events=[{at:.2,acceleration:230},
  {at:.216,acceleration:0},{at:1,acceleration:-230},
  {at:1.016,acceleration:0}];
 const indexed=indexMovementImpulses(events);
 const atStart=sampleMovementImpulses(indexed.drive,indexed.brake,.25);
 const atBrake=sampleMovementImpulses(indexed.drive,indexed.brake,1.06);
 const atRest=sampleMovementImpulses(indexed.drive,indexed.brake,2);
 assert.ok(atStart.drive>0&&atStart.brake===0);
 assert.ok(atBrake.brake>0&&atBrake.drive===0);
 assert.deepEqual(atRest,{drive:0,brake:0});
 assert.deepEqual(sampleMovementImpulses(indexed.drive,indexed.brake,.25),atStart);
 assert.deepEqual(sampleMovementImpulses(indexed.drive,indexed.brake,1.06),atBrake);
});

test('A2.2 recorder replay archive preserves motion impulses without schema migration',()=>{
 const s=newSession(0,731),a=team(s)[0],rec=new ReplayMotionRecorder();
 const initial={...a.p};
 let x=initial.x;
 for(let i=0;i<=150;i++){
  const t=i/60;
  const speed=t<.2?0:t<.9?48:0;
  if(i)x+=speed/60;
  a.p={x,y:initial.y};a.velocity=speed;
  rec.record(t,s.operators,s.doors);
 }
 const id=a.id;
 const start=rec.presentation(.3,[id],false);
 const braking=rec.presentation(.98,[id],false);
 const settled=rec.presentation(2.2,[id],false);
 assert.ok(start.momentum[id].drive>0);
 assert.ok(braking.momentum[id].brake>0);
 assert.deepEqual(settled.momentum[id],{drive:0,brake:0});
 const archive=rec.toArchive();
 assert.equal(archive.schemaVersion,1);
 assert.equal(archive.actors[0].momentum,undefined,
  'motion impulses must not duplicate stored archive acceleration');
 const loaded=new ReplayMotionRecorder();
 loaded.loadArchive(archive);
 for(const time of [0,.3,.98,1.12,2.2,.3]){
  assert.deepEqual(loaded.presentation(time,[id],false).momentum[id],
   rec.presentation(time,[id],false).momentum[id]);
 }
 const original=JSON.stringify(archive);
 loaded.presentation(.31,[id],false);
 assert.equal(JSON.stringify(archive),original,
  'seeking must not mutate archived step or acceleration events');
});
test('A2.2 body movement remains a single pure shot-independent pose response',()=>{
 const feet=[shoe(-1,'recovering',.55),shoe(1)];
 const input={velocity:0,heading:0,travelYaw:0,turning:0,
  injury:0,posture:'stand',feet,position:{x:0,y:0},
  motionImpulse:{drive:0,brake:.7}};
 const before=JSON.stringify(input);
 const out=bodyFromContacts(input);
 assert.ok(out.torsoForward>0);
 assert.ok(out.pelvisY<0);
 assert.equal(JSON.stringify(input),before);
 assert.deepEqual(out,bodyFromContacts(input));
});
