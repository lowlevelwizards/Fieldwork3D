import test from 'node:test';
import assert from 'node:assert/strict';
import {assessFriendlyLane} from '../src/breach-fire-safety.ts';
import {friendIntersectsTrajectory,FRIENDLY_STAND_VOLUMES,
 FRIENDLY_CROUCH_VOLUMES,LEGACY_FRIENDLY_RADIUS}
 from '../src/breach-friendly-safety-volume.ts';
import {choosePhysicalCorrection}
 from '../src/breach-combat-reactions.ts';

const p=(x,y)=>({x,y});
const f=(x,y,posture='stand')=>({...p(x,y),posture});
const lane=(point,actor,fromHeight=32,toHeight=32)=>
 assessFriendlyLane(p(0,0),fromHeight,point,toHeight,[actor]).blocker;

test('A3.10: true near-head side lanes no longer need 25–30 degrees',()=>{
 const close=f(22,6.5);
 assert.equal(lane(p(100,0),close),'clear',
  'a barrel line beside an upright helmet is not automatically flagging');
 assert.equal(lane(p(100,0),f(22,5.8)),'friendly',
  'a helmet hit remains vetoed');
 assert.equal(lane(p(100,0),close,16,16),'friendly',
  'lower torso remains wider than helmet');
 assert.equal(lane(p(100,0),f(22,8.2),16,16),'clear',
  'nearby torso gets its true rather than inflated protection');
 assert.ok(FRIENDLY_STAND_VOLUMES[1].radius<LEGACY_FRIENDLY_RADIUS);
 assert.equal(FRIENDLY_STAND_VOLUMES[0].radius,8);
});

test('A3.10: head, crouch and unknown-posture safety remain physical vetoes',()=>{
 assert.equal(lane(p(100,0),f(22,0)),'friendly',
  'directly pointing through a head is never allowed');
 assert.equal(lane(p(100,0),f(22,0,'crouch')),'clear',
  'unobstructed over-head shot remains legal');
 assert.equal(lane(p(100,0),f(22,0,'crouch'),24,24),'friendly',
  'lower shot still hits the crouched helmet');
 assert.equal(lane(p(100,0),p(22,7)),'friendly',
  '2D callers retain the conservative legacy fallback');
 assert.equal(FRIENDLY_CROUCH_VOLUMES[1].top,26);
 assert.equal(friendIntersectsTrajectory(p(0,0),32,p(100,0),32,
   f(22,6.1)),true);
});

test('A3.10: barrel obstruction can recover sideways when a backstep cannot',()=>{
 const chosen=choosePhysicalCorrection(p(0,0),0,'muzzle',
  q=>q.x>=-.01&&Math.abs(q.y)>=3.9,
  q=>Math.abs(q.y)>=3.9);
 assert.ok(chosen);
 assert.equal(chosen.distance,4);
 assert.equal(chosen.point.x,0);
 assert.equal(chosen.point.y,-4);
 assert.equal(chosen.kind,'lateral-left');
});

test('A3.10: friendly obstruction can recover diagonally into the rear',()=>{
 const make=()=>choosePhysicalCorrection(p(0,0),0,'friendly',
  q=>q.x<-.1&&q.y<-.1,
  q=>q.x<=-2.5&&q.y<=-2.5);
 const chosen=make();
 assert.ok(chosen);
 assert.equal(chosen.kind,'back-left');
 assert.equal(chosen.distance,4);
 assert.ok(Math.abs(chosen.point.x+Math.SQRT2*2)<.001);
 assert.deepEqual(make(),chosen,'deterministic correction without jitter');
 assert.equal(choosePhysicalCorrection(p(0,0),0,'friendly',
  ()=>false,()=>true),null);
});
