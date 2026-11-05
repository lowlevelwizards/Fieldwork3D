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
