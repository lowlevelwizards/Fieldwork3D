import test from 'node:test';
import assert from 'node:assert/strict';
import {crossingDoor,passageWait} from '../src/breach-passage.ts';

const left={id:'LEFT',a:{x:40,y:100},b:{x:80,y:100},
 open:true,pairedWith:'RIGHT'};
const right={id:'RIGHT',a:{x:80,y:100},b:{x:120,y:100},
 open:true,pairedWith:'LEFT'};
const unit=(id,x,y=88,goalY=170)=>({
 id,side:'blue',p:{x,y},goal:{x,y:goalY},health:4,
 blockedTime:0,active:true
});
test('R3a: crossing a left-hand double leaf does not claim the right lane',()=>{
 const leftUnit=unit('left',60);
 assert.equal(crossingDoor(leftUnit,left),true);
 assert.equal(crossingDoor(leftUnit,right),false);
});
test('R3b: paired doors retain independent leases for parallel squad lanes',()=>{
 const a=unit('a',60),b=unit('b',100),leases={};
 assert.equal(passageWait(a,[left,right],[a,b],leases,2),false);
 assert.equal(passageWait(b,[left,right],[a,b],leases,2),false);
 assert.equal(leases['blue:LEFT'].actorId,'a');
 assert.equal(leases['blue:RIGHT'].actorId,'b');
});
test('R3b: shoulder overlap at center seam only claims nearest leaf',()=>{
 const a=unit('a',79),b=unit('b',81),leases={};
 assert.equal(crossingDoor(a,right),true,
  'a capsule can physically brush both leaves near the seam');
 assert.equal(crossingDoor(b,left),true);
 passageWait(a,[left,right],[a,b],leases,3);
 passageWait(b,[left,right],[a,b],leases,3);
 assert.equal(leases['blue:LEFT'].actorId,'a');
 assert.equal(leases['blue:RIGHT'].actorId,'b');
});
test('R3c: an operator stalled inside the throat keeps exit priority',()=>{
 const first={...unit('first',60,105),blockedTime:2.1};
 const counter=unit('counter',60,115,40),leases={};
 assert.equal(passageWait(first,[left],[first,counter],leases,5),false);
 assert.equal(passageWait(counter,[left],[first,counter],leases,5.1),true);
 assert.equal(leases['blue:LEFT'].actorId,'first');
 first.p.y=145;
 assert.equal(passageWait(counter,[left],[first,counter],leases,5.6),false,
  'the owner must release after actually clearing the opening');
});

test('R3d: reserve an upcoming follower body gap before stepping into it',()=>{
 const lead=unit('lead',60,100),follower=unit('follower',60,78);
 const leases={};
 assert.equal(passageWait(follower,[left],[lead,follower],leases,1,
   {x:60,y:82}),true,
  '22 units of gap must not allow a 4-unit step into a 20-unit buffer');
 assert.equal(passageWait(follower,[left],[lead,follower],leases,1.1,
   {x:64,y:78}),false,
  'lateral yielding must remain an available physical escape');
});
test('R3e: opposing claimant can sidestep or reverse without losing their plan',()=>{
 const lead=unit('lead',60,95),counter=unit('counter',60,117,40);
 const leases={};
 passageWait(lead,[left],[lead,counter],leases,1);
 assert.equal(passageWait(counter,[left],[lead,counter],leases,1.1,
   {x:64,y:117}),false);
 assert.equal(passageWait(counter,[left],[lead,counter],leases,1.2,
   {x:60,y:114}),true);
});
