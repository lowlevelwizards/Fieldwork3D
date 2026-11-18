import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession,team} from '../src/breach-game.ts';
import {activateSite} from '../src/breach-core.ts';
import {advanceWaitOrder} from '../src/breach-order-wait.ts';
import {completeOrder} from '../src/breach-order-lifecycle.ts';

const site={
 seed:3251,name:'D3.25 LOCKED ENTRY',training:true,layout:'corridor',
 rooms:[],roomCount:0,walls:[],cover:[],windows:[],
 doors:[{id:'D8',a:{x:220,y:220},b:{x:262,y:220},
   kind:'hinged',hinge:'a',swing:1,open:false,openFraction:0,
   locked:true,openedAt:-1}],
 entrance:{x:220,y:160},
 spawn:[{x:200,y:175},{x:210,y:155},{x:190,y:145},{x:225,y:130}],
 enemies:[],objective:{x:320,y:350},extract:{x:320,y:350},
 bounds:{minX:0,minY:0,maxX:500,maxY:440}
};
const session=()=>newSession(0,undefined,'full-view','standard','intel',site);

test('D3.25B locked generated gate cancels linked ENTRY MOVE without physical arrival',()=>{
 const s=session();
 try{
  const actor=team(s)[1],before={...actor.p};
  const gate={id:301,kind:'wait',p:{...actor.p},duration:0,doorId:'D8'};
  const entry={id:302,kind:'move',p:{x:241,y:290},entryDoorId:'D8'};
  actor.plan=[gate,entry];
  advanceWaitOrder(s,actor,gate,1/60,()=>false,()=>{},completeOrder);
  assert.equal(actor.plan.length,0,'no eternal locked doorway gate');
  assert.equal(actor.failedOrders,2,'neither gate nor move is marked complete');
  assert.equal(actor.completedOrders,0);
  assert.deepEqual(actor.p,before,'cancel cannot move or teleport the operator');
  assert.match(actor.lastFailedOrder?.reason??'',/DOOR LOCKED/);
 }finally{activateSite(null);}
});

test('D3.25B ordinary player WAIT is not a generated gate cancellation',()=>{
 const s=session();
 try{
  const actor=team(s)[1],wait={id:303,kind:'wait',p:{...actor.p},duration:1};
  actor.plan=[wait];
  advanceWaitOrder(s,actor,wait,1/60,()=>false,()=>{},completeOrder);
  assert.equal(actor.plan.length,1);
  assert.equal(actor.failedOrders,0);
 }finally{activateSite(null);}
});

test('D3.25B unlocked generated gate continues ordinary physical wait',()=>{
 const s=session();
 try{
  const actor=team(s)[1];
  s.doors[0].locked=false;
  const gate={id:304,kind:'wait',p:{...actor.p},duration:0,doorId:'D8'};
  const entry={id:305,kind:'move',p:{x:241,y:290},entryDoorId:'D8'};
  actor.plan=[gate,entry];
  advanceWaitOrder(s,actor,gate,1/60,()=>false,()=>{},completeOrder);
  assert.equal(actor.plan[0].id,gate.id);
  assert.equal(actor.failedOrders,0);
 }finally{activateSite(null);}
});
