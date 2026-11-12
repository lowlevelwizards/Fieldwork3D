/** Regression coverage for player-authored door interaction semantics. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {activateSite} from '../src/breach-core.ts';
import {initDoor,doorReachable,lockpickReachable,lockpickApproach}
 from '../src/breach-door.ts';
import {newSession,team} from '../src/breach-game.ts';
import {createDoorOrderHandler} from '../src/breach-order-door.ts';
import {createEntryOrderHandler} from '../src/breach-order-entry.ts';
import {handleMotorDoor} from '../src/breach-motor-door.ts';
const fixture=()=>initDoor({id:'TEST-LOCK',a:{x:200,y:250},b:{x:238,y:250},
  open:false,openedAt:-1,locked:true,hinge:'a',swing:1},0);
const hooks=(messages,approaches=[])=>({
  notify:(_s,message)=>messages.push(message),
  approach:(_a,p)=>{approaches.push(p);return true;},
  hear:()=>{},battleEvent:()=>{},pairedLeaves:(_s,d)=>[d]
});
test('explicit OPEN on a locked door cancels without eating the next order',()=>{
 const s=newSession(),a=team(s)[0],messages=[];
 try{
  const door=fixture();s.doors=[door];a.p={x:226,y:271};
  const open={id:90001,kind:'door',p:{...a.p},doorId:door.id,method:'open'};
  const next={id:90002,kind:'wait',p:{...a.p},duration:.5};
  a.plan=[open,next];a.completedOrders=0;
  const handle=createDoorOrderHandler(hooks(messages));
  assert.equal(handle(s,a,open,1/60),true);
  assert.equal(a.plan[0].id,next.id);
  assert.equal(a.completedOrders,0);
  assert.equal(door.open,false);
  assert.match(messages[0],/LOCKED.*ORDER CANCELLED/);
 }finally{activateSite(null);}
});
test('implicit locked door on MOVE cancels the blocked movement',()=>{
 const s=newSession(),a=team(s)[0],messages=[];
 try{
  const door=fixture();s.doors=[door];a.p={x:219,y:271};
  const move={id:90003,kind:'move',p:{x:219,y:230}};
  const next={id:90004,kind:'wait',p:{...a.p},duration:.5};
  a.plan=[move,next];a.completedOrders=0;
  const result=handleMotorDoor(a,{x:219,y:251},{x:219,y:230},
    {x:219,y:250},1/60,s,hooks(messages));
  assert.equal(result.paused,true);
  assert.equal(a.plan[0].id,next.id);
  assert.equal(a.completedOrders,0);
  assert.match(messages[0],/DOOR LOCKED.*ORDER CANCELLED/);
 }finally{activateSite(null);}
});
test('lockpick near hinge corrects to a real handle stance without teleporting',()=>{
 activateSite({walls:[],doors:[],cover:[]});
 try{
  const door=fixture(),from={x:201,y:272};
  assert.equal(doorReachable(from,door),true);
  assert.equal(lockpickReachable(from,door),false);
  const target=lockpickApproach(from,door);
  assert.ok(target,'there is a navigable handle-side stance');
  assert.equal(lockpickReachable(target,door),true);
  assert.ok(Math.hypot(target.x-from.x,target.y-from.y)<48,
    'correction is short and is applied by the physical motor');
  assert.ok(target.y>250,'the actor stays on the same side of the closed door');
 }finally{activateSite(null);}
});
test('successful picking unlocks but never opens or moves the door',()=>{
 const s=newSession(),a=team(s)[0],messages=[];
 try{
  const door=fixture();s.doors=[door];a.p={x:231,y:272};
  const pick={id:90005,kind:'tool',p:{...a.p},doorId:door.id,toolMethod:'pick'};
  a.plan=[pick];a.actionTimer=5.45;a.lastHitAt=-100;
  a.equipment=undefined;
  const handle=createEntryOrderHandler(hooks(messages));
  assert.equal(handle(s,a,pick,.1),true);
  assert.equal(door.locked,false);
  assert.equal(door.open,false);
  assert.equal(door.openFraction,0);
  assert.equal(door.openedAt,-1);
  assert.equal(a.plan.length,0);
  assert.match(messages[0],/UNLOCKED/);
 }finally{activateSite(null);}
});
