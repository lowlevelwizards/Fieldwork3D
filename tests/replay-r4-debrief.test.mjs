import test from 'node:test';
import assert from 'node:assert/strict';
import {buildReplayDebrief,buildReplayExecutionInsights}
  from '../src/breach-replay-debrief.ts';

const event=(id,t,kind,actor='rook')=>({
  key:'battle:'+id,source:'battle',t,kind,actor,p:{x:10,y:20},
  text:'OBSERVED '+kind,order:id
});
const execute=(id,t,kind,reason='door',orderId=12,actor='rook')=>({
  id,t,kind,reason,orderId,actor,p:{x:10,y:20},text:kind.toUpperCase()
});
test('after-action uses only the already disclosed event list',()=>{
  const all=[event(1,2,'door'),event(2,4,'intel','hostile'),
    event(3,7,'shot'),event(4,8,'shot'),event(5,10,'blocked'),
    event(6,12,'wound'),event(7,12.5,'down'),event(8,22,'objective')];
  const disclosed=all.filter(e=>e.actor!=='hostile');
  const moments=buildReplayDebrief(disclosed,30);
  assert.equal(moments.some(m=>m.kind==='intel'),false);
  assert.equal(moments.some(m=>m.kind==='down'),true);
  assert.equal(moments.some(m=>m.kind==='wound'),false,
    'more consequential casualty event represents the category');
  assert.deepEqual(moments.map(m=>m.t),[2,7,10,12.5,22]);
  assert.ok(moments.every(m=>m.detail.startsWith('OBSERVED')));
  assert.equal(buildReplayDebrief([],30).length,0);
});
test('highlights are bounded, chronological, and never extrapolate future',()=>{
  const input=[event(1,-2,'door'),event(2,2,'shot'),event(3,3,'door'),
    event(4,5,'flash'),event(5,11,'objective'),event(6,200,'down')];
  const result=buildReplayDebrief(input,20,2);
  assert.deepEqual(result.map(e=>e.t),[5,11]);
  assert.equal(buildReplayDebrief(input,0).length,0);
  assert.equal(buildReplayDebrief(input,20,-2).length,0);
});
test('movement interruptions resolve only by same actor and order',()=>{
  const e=[execute(1,2,'blocked'),execute(2,3,'resumed','door',12,'moss'),
    execute(3,3.5,'waiting'),execute(4,5,'resumed'),
    execute(5,7,'blocked','collision',13),
    execute(6,9,'completed','done',12)];
  const r=buildReplayExecutionInsights(e,15);
  assert.equal(r.length,2);
  assert.deepEqual(r.map(x=>[x.t,x.end,x.seconds]),[
    [2,5,3],[7,null,null]
  ]);
  assert.equal(r[0].detail,'BLOCKED');
  assert.equal(buildReplayExecutionInsights(e,0).length,0);
});
test('temporary wait and repeated same-order blocked events do not multiply stalls',()=>{
  const e=[execute(1,1,'waiting'),execute(2,1.2,'blocked'),
    execute(3,2,'recovering'),execute(4,4,'resumed'),
    execute(5,7,'waiting','contact',null,'moss')];
  const r=buildReplayExecutionInsights(e,10);
  assert.equal(r.length,2);
  assert.equal(r[0].seconds,3);
  assert.equal(r[1].seconds,null);
});
