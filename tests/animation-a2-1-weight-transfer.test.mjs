import test from 'node:test';
import assert from 'node:assert/strict';
import {footBearing,contactBalance}
 from '../src/breach-contact-balance.ts';
import {bodyFromContacts} from '../src/breach-body-motion.ts';
const make=(side,phase='planted',progress=1)=>({
 position:{x:0,y:side*5.6},height:0,
 contact:phase!=='swinging',worldYaw:0,phase,progress
});
const input=(left,right,additional={})=>({
 velocity:44,heading:0,travelYaw:0,turning:0,
 injury:0,posture:'stand',feet:[left,right],
 position:{x:0,y:0},gait:'walk',...additional
});
test('A2.1: physical shoe bearing follows unloading and landing',()=>{
 const left=make(-1),right=make(1);
 const centered=contactBalance([left,right],{x:0,y:0},0);
 assert.equal(centered.support,0);
 assert.equal(centered.bearingSide,0);
 const unload=contactBalance([make(-1,'unloading',.75),right],
   {x:0,y:0},0);
 assert.ok(unload.support>0);
 assert.ok(unload.bearingSide>0);
 const airborne=contactBalance([make(-1,'swinging',.5),right],
   {x:0,y:0},0);
 assert.equal(airborne.support,1);
 assert.ok(airborne.bearingSide>unload.bearingSide);
 const land=contactBalance([left,make(1,'landing',.6)],
   {x:0,y:0},0);
 assert.ok(land.support<0&&land.bearingSide<0);
 assert.equal(footBearing(make(1,'landing',0)),0);
 assert.equal(footBearing(make(1,'landing',1)),1);
});
test('A2.1: active gait visibly transfers weight to the supporting foot',()=>{
 const centered=bodyFromContacts(input(make(-1),make(1)));
 const right=bodyFromContacts(input(make(-1,'swinging',.5),make(1)));
 const left=bodyFromContacts(input(make(-1),make(1,'swinging',.5)));
 assert.equal(centered.pelvisSide,0);
 assert.ok(right.pelvisSide>.5,'right shoe must carry body');
 assert.ok(left.pelvisSide<-.5,'left shoe must carry body');
 assert.ok(right.torsoSide>centered.torsoSide);
 assert.ok(left.torsoSide<centered.torsoSide);
 assert.ok(right.headCounter<0&&left.headCounter>0);
});
test('A2.1: no fictional rest sway, fade on interruption, bounded locomotion',()=>{
 const rest=bodyFromContacts(input(make(-1,'swinging',.5),
  make(1),{velocity:0}));
 assert.equal(rest.pelvisSide,0);
 const crouch=bodyFromContacts(input(make(-1,'swinging',.5),
  make(1),{posture:'crouch'}));
 const stand=bodyFromContacts(input(make(-1,'swinging',.5),make(1)));
 assert.ok(Math.abs(crouch.pelvisSide)<Math.abs(stand.pelvisSide));
 for(const gait of ['walk','run','pie','squeeze']){
  const result=bodyFromContacts(input(make(-1,'unloading',.4),
   make(1,'landing',.5),{velocity:120,gait}));
  assert.ok(Math.abs(result.pelvisSide)<=2);
  assert.ok(Math.abs(result.torsoSide)<=.15);
  assert.ok(Math.abs(result.headCounter)<=.1);
  assert.ok(Object.values(result).every(Number.isFinite));
 }
});
test('A2.1: pure contact balance never writes simulation shoes or timestamps',()=>{
 const feet=[make(-1,'unloading',.42),make(1)];
 const before=JSON.stringify(feet);
 const a=contactBalance(feet,{x:1,y:2},1.13);
 const b=contactBalance(feet,{x:1,y:2},1.13);
 assert.deepEqual(a,b);
 assert.equal(JSON.stringify(feet),before);
 const none=[make(-1,'swinging',.5),make(1,'swinging',.5)];
 const noSupport=contactBalance(none,{x:0,y:0},0);
 assert.equal(noSupport.support,0);
 assert.equal(noSupport.bearingSide,0);
 assert.equal(noSupport.bearingForward,0);
});
test('A2.1: load remains continuous at unloaded and landed phase borders',()=>{
 const left=make(-1),right=make(1);
 const before=contactBalance([make(-1,'unloading',.999999),right],
  {x:0,y:0},0);
 const swing=contactBalance([make(-1,'swinging',0),right],
  {x:0,y:0},0);
 assert.ok(Math.abs(before.bearingSide-swing.bearingSide)<.00001);
 const landing=contactBalance([left,make(1,'landing',.999999)],
  {x:0,y:0},0);
 const both=contactBalance([left,right],{x:0,y:0},0);
 assert.ok(Math.abs(landing.bearingSide-both.bearingSide)<.00001);
});
