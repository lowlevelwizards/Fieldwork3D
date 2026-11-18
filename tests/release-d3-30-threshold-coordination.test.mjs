import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession,team} from '../src/breach-game.ts';
import {advanceWaitOrder} from '../src/breach-order-wait.ts';
import {completeOrder} from '../src/breach-order-lifecycle.ts';
import {generatedEntryInterruptedByTeammate} from '../src/breach-entry-interruption-group.ts';
const gate=(actor,door,id)=>({id,kind:'wait',p:{...actor.p},
 duration:0,doorId:door.id});
const entry=(actor,door,id)=>({id,kind:'move',
 p:{x:actor.p.x+50,y:actor.p.y+30},entryDoorId:door.id});
const tick=(s,a)=>advanceWaitOrder(s,a,a.plan[0],1/60,
 ()=>false,()=>{},completeOrder);
test('D3.30E: interrupted teammate blocks later generated crossing even after unlock',()=>{
 const s=newSession(0,undefined,'full-view'),[lead,follower]=team(s),
  door=s.doors[0];
 door.locked=false;door.jammed=false;door.wedged=false;door.heldBy=null;
 lead.interruptedDoorPlan={sourceOrderId:101,doorId:door.id,
  at:3,reason:'locked',original:[entry(lead,door,101)]};
 const wait=gate(follower,door,201),move=entry(follower,door,202);
 const independent={id:203,kind:'look',p:{...follower.p},facing:.5};
 follower.plan=[wait,move,independent];
 const p={...follower.p};
 tick(s,follower);
 assert.deepEqual(follower.p,p,'no physical reposition or ghost crossing');
 assert.equal(follower.failedOrders,2);
 assert.deepEqual(follower.plan,[independent],
  'unrelated authored look survives group interruption');
 assert.deepEqual(follower.interruptedDoorPlan.original.map(x=>x.id),[201,202]);
 assert.equal(follower.interruptedDoorPlan.reason,'coordinated');
 assert.equal(lead.interruptedDoorPlan.sourceOrderId,101);
});
test('D3.30E: another threshold never inherits this team interruption',()=>{
 const s=newSession(0,undefined,'full-view'),[lead,follower]=team(s),
  door=s.doors[0];
 lead.interruptedDoorPlan={sourceOrderId:1,doorId:'OTHER',
  at:3,reason:'locked',original:[{...entry(lead,door,1),entryDoorId:'OTHER'}]};
 assert.equal(generatedEntryInterruptedByTeammate(s,follower,door.id),false);
});
test('D3.30E: manual WAIT and WATCH are not cancelled by teammate incident',()=>{
 const s=newSession(0,undefined,'full-view'),[lead,follower]=team(s),
  door=s.doors[0];
 lead.interruptedDoorPlan={sourceOrderId:1,doorId:door.id,
  at:3,reason:'locked',original:[entry(lead,door,1)]};
 follower.plan=[{id:2,kind:'wait',duration:2,p:{...follower.p}}];
 tick(s,follower);
 assert.equal(follower.plan.length,1);assert.equal(follower.failedOrders,0);
});
test('D3.30E: unrelated authored locked MOVE is not a generated squad halt',()=>{
 const s=newSession(0,undefined,'full-view'),[lead,follower]=team(s),
  door=s.doors[0];
 lead.interruptedDoorPlan={sourceOrderId:1,doorId:door.id,
  at:3,reason:'locked',original:[{id:1,kind:'move',p:{...lead.p}}]};
 assert.equal(generatedEntryInterruptedByTeammate(s,follower,door.id),false);
});
test('D3.30E: generated follower requires its immediate linked MOVE',()=>{
 const s=newSession(0,undefined,'full-view'),follower=team(s)[1],
  door=s.doors[0];
 door.locked=true;door.lockSide='both';
 const w=gate(follower,door,6),later=entry(follower,door,8);
 follower.plan=[w,{id:7,kind:'look',p:{...follower.p}},later];
 tick(s,follower);
 assert.equal(follower.failedOrders,0,
  'a different authored order may not be skipped to cancel the later move');
});
