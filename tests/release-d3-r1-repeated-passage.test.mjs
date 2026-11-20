import test from 'node:test';
import assert from 'node:assert/strict';
import {planDoorSchedule,pendingPassageSlot}
 from '../src/breach-passage-plan.ts';

const p=(x,y)=>({x,y});
const door={id:'FRONT',kind:'hinged',a:p(80,100),b:p(120,100),
 hinge:'a',swing:-1,open:true,openFraction:1.2};
const nodes=[
 {id:11,kind:'move',p:p(100,60)},
 {id:12,kind:'move',p:p(100,140)},
 {id:13,kind:'move',p:p(100,60)}
];
const actor={id:'rook',side:'blue',health:4,p:p(100,140),plan:nodes,
 pace:'walk'};
test('R1.06: multiple authored crossings of one door receive independent occurrences',()=>{
 const schedule=planDoorSchedule([actor],[door],(_from,to)=>[to]);
 const slots=schedule.get(actor.id);
 assert.equal(slots.length,3,'a new authored crossing must not be deduplicated');
 const forward=slots.filter(s=>s.fromSide===1);
 assert.deepEqual(forward.map(s=>s.orderId),[11,13]);
 assert.deepEqual(forward.map(s=>s.rank),[0,1]);
 const reverse=slots.filter(s=>s.fromSide===-1);
 assert.deepEqual(reverse.map(s=>s.orderId),[12]);
});
test('R1.06: returning near-side actor uses current order, not old threshold rank',()=>{
 const schedule=planDoorSchedule([actor],[door],(_from,to)=>[to]);
 const slots=schedule.get(actor.id);
 assert.equal(pendingPassageSlot(p(100,140),slots,[door],11).orderId,11);
 assert.equal(pendingPassageSlot(p(100,140),slots,[door],13).orderId,13);
 assert.equal(pendingPassageSlot(p(100,60),slots,[door],12).orderId,12);
 assert.equal(pendingPassageSlot(p(100,140),slots,[door],999),null);
 assert.equal(pendingPassageSlot(p(100,140),slots,[door]).orderId,11,
  'legacy presentation callers without an order filter stay compatible');
});
test('R1.06: one ordinary crossing still retains its normal rank',()=>{
 const s=planDoorSchedule([{...actor,plan:[nodes[0]]}],[door],(_from,to)=>[to]);
 assert.deepEqual(s.get('rook').map(x=>({rank:x.rank,order:x.orderId})),
  [{rank:0,order:11}]);
});
