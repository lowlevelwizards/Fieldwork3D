import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession,team} from '../src/breach-game.ts';
import {activateSite} from '../src/breach-core.ts';
import {initDoor,kickDoor} from '../src/breach-door.ts';
import {advanceWaitOrder} from '../src/breach-order-wait.ts';
import {completeOrder} from '../src/breach-order-lifecycle.ts';
import {refreshRouteAfterForcedDoor,forcedDoorShortcutWorthTaking}
 from '../src/breach-motor-route.ts';
import {sweptBodyClear} from '../src/breach-navigation.ts';
import {sessionWorldGeometry} from '../src/breach-world-context.ts';
const makeDoor=()=>initDoor({id:'KICKED',a:{x:220,y:220},b:{x:262,y:220},
 open:false,openedAt:-1,kind:'hinged',hinge:'a',swing:-1,
 locked:true,lockSide:'both',latchIntegrity:2.2},0);
const site=()=>({
 seed:313100,name:'D3.31F breached portal',training:true,
 layout:'corridor',rooms:[],roomCount:0,
 walls:[
  {a:{x:0,y:220},b:{x:220,y:220}},
  {a:{x:262,y:220},b:{x:455,y:220}}
 ],cover:[],windows:[],doors:[makeDoor()],
 entrance:{x:240,y:160},
 spawn:[{x:240,y:168},{x:212,y:168},{x:194,y:168},{x:260,y:160}],
 enemies:[],objective:{x:240,y:295},extract:{x:240,y:168},
 bounds:{minX:0,minY:0,maxX:500,maxY:450}
});
const correctSide={x:240,y:198};
const kickThrough=(door,seconds=3)=>{
 for(let i=0;i<4&&!door.open;i++)kickDoor(door,correctSide);
 assert.equal(door.latchBroken,true,'real correct-side impact broke the latch');
 assert.equal(door.locked,false);
 assert.equal(door.open,true);
 door.hardwareDetachedAt=seconds;
};
test('D3.31F force-open releases still-live squad WAIT but never resurrects the older failed order',()=>{
 const s=newSession(0,undefined,'full-view','standard','intel',site());
 try{
  const [lead,follower]=team(s),door=s.doors[0];
  lead.interruptedDoorPlan={sourceOrderId:4,doorId:door.id,
   at:1,reason:'locked',original:[{id:4,kind:'move',p:{x:240,y:300},entryDoorId:door.id}]};
  const gate={id:5,kind:'wait',duration:0,p:{...follower.p},doorId:door.id};
  const enter={id:6,kind:'move',p:{x:240,y:297},entryDoorId:door.id};
  follower.plan=[gate,enter];
  kickThrough(door);
  door.openFraction=.3;
  let warnings=0;
  const notice=()=>{warnings++};
  advanceWaitOrder(s,follower,gate,1/60,()=>false,notice,completeOrder);
  assert.equal(follower.failedOrders,0,'no inherited LOCKED cancellation while leaf swings');
  assert.equal(follower.plan[0].id,gate.id,'a still-rotating leaf retains the wait');
  assert.equal(warnings,0);
  door.openFraction=1.2;
  advanceWaitOrder(s,follower,gate,1/60,()=>false,notice,completeOrder);
  assert.equal(follower.failedOrders,0);
  assert.equal(lead.interruptedDoorPlan.sourceOrderId,4,'past failure is still held for manual resume');
  assert.equal(warnings,0);
 }finally{activateSite(null);}
});
test('D3.31F a still-closed blocked door retains existing deterministic squad cancellation',()=>{
 const s=newSession(0,undefined,'full-view','standard','intel',site());
 try{
  const [lead,follower]=team(s),door=s.doors[0];
  lead.interruptedDoorPlan={sourceOrderId:4,doorId:door.id,at:1,reason:'locked',
   original:[{id:4,kind:'move',p:{x:240,y:297},entryDoorId:door.id}]};
  const gate={id:5,kind:'wait',duration:0,p:{...follower.p},doorId:door.id};
  follower.plan=[gate,{id:6,kind:'move',p:{x:240,y:297},entryDoorId:door.id}];
  advanceWaitOrder(s,follower,gate,1/60,()=>false,()=>{},completeOrder);
  assert.equal(follower.failedOrders,2);
 }finally{activateSite(null);}
});
test('D3.31F shortcut requires substantial improvement over current transient detour',()=>{
 const start={x:0,y:0},end={x:0,y:120};
 assert.equal(forcedDoorShortcutWorthTaking(start,
  [{x:160,y:0},{x:160,y:120},end],[end]),true);
 assert.equal(forcedDoorShortcutWorthTaking(start,[end],[end]),false);
 assert.equal(forcedDoorShortcutWorthTaking(start,[end],[]),false);
});
test('D3.31F real kicked-open door replaces only stale navigation, with full swept shoulders',()=>{
 const s=newSession(0,undefined,'full-view','standard','intel',site());
 try{
  const actor=team(s)[0],door=s.doors[0],goal={x:240,y:295};
  actor.plan=[{id:70,kind:'move',p:goal}];
  const prior=[{x:473,y:168},{x:473,y:295},{...goal}];
  actor.nav=prior.map(x=>({...x}));
  const original=JSON.stringify(actor.plan);
  assert.equal(refreshRouteAfterForcedDoor(actor,goal,s),false,'closed lock is not a shortcut');
  kickThrough(door);
  door.openFraction=1.3;door.angularVelocity=0;
  assert.equal(refreshRouteAfterForcedDoor(actor,goal,s),true,
   'actual opened hinge yields shorter real-world route');
  assert.ok(actor.nav.length);
  assert.notDeepEqual(actor.nav,prior);
  assert.deepEqual(actor.nav.at(-1),goal);
  assert.equal(JSON.stringify(actor.plan),original,'authored MOVE remains unchanged');
  let prev=actor.p;
  for(const next of actor.nav){
    assert.ok(sweptBodyClear(prev,next,s.doors,9,sessionWorldGeometry(s)),
      'every route step physically passes with real door leaf');prev=next;
  }
  assert.equal(refreshRouteAfterForcedDoor(actor,goal,s),false,'no repeated expensive replan');
  actor.plan=[{id:71,kind:'move',p:goal}];
  actor.nav=prior.map(point=>({...point}));
  assert.equal(refreshRouteAfterForcedDoor(actor,goal,s),true,
   'a newly authored order to the SAME destination must not inherit an old shortcut budget');
 }finally{activateSite(null);}
});
test('D3.31F must not replan via a kicked door if unseen or physically still blocked',()=>{
 const s=newSession(0,undefined,'full-view','standard','intel',site());
 try{
  const actor=team(s)[0],door=s.doors[0],goal={x:240,y:295};
  actor.plan=[{id:70,kind:'move',p:goal}];
  actor.nav=[{x:470,y:168},{x:470,y:295},goal];
  kickThrough(door);
  door.openFraction=.15;
  assert.equal(refreshRouteAfterForcedDoor(actor,goal,s),false);
  door.openFraction=1.3;
  s.intel.doors.delete(door.id);
  assert.equal(refreshRouteAfterForcedDoor(actor,goal,s),false,
   'no shortcut from a door outside discovered player intel');
 }finally{activateSite(null);}
});
