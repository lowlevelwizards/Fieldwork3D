import test from 'node:test';
import assert from 'node:assert/strict';
import {snapshotDoorInterruption} from '../src/breach-door-interruption.ts';
import {failCurrentOrder} from '../src/breach-order-lifecycle.ts';
import {newSession,team} from '../src/breach-game.ts';

const pt=(x,y)=>({x,y});
const wait={id:3,kind:'wait',p:pt(20,22),duration:0,doorId:'D8'};
const move={id:4,kind:'move',p:pt(140,166),entryDoorId:'D8',
 facing:.7};
const unrelated={id:5,kind:'look',p:pt(13,13),facing:1.2};
test('D3.30A: generated WAIT preserves only linked MOVE, not unrelated player orders',()=>{
 const plan=[wait,move,unrelated];
 const snap=snapshotDoorInterruption(wait,plan,
  'SQUAD ENTRY CANCELLED · DOOR LOCKED',7.5,'D8');
 assert.equal(snap?.doorId,'D8');
 assert.equal(snap?.reason,'locked');
 assert.deepEqual(snap?.original.map(n=>n.id),[3,4]);
 assert.deepEqual(snap?.original[1].p,pt(140,166));
 plan[1].p.x=400;
 assert.equal(snap.original[1].p.x,140,'stored retry must be deep copied');
});
test('D3.30A: failing linked MOVE cannot overwrite the same interrupted entry snapshot',()=>{
 const plan=[wait,move,unrelated];
 const first=snapshotDoorInterruption(wait,plan,
  'SQUAD ENTRY CANCELLED · DOOR LOCKED',7.5,'D8');
 const second=snapshotDoorInterruption(move,[move,unrelated],
  'SQUAD ENTRY CANCELLED · DOOR LOCKED',7.6,'D8',first);
 assert.equal(second,first);
});
test('D3.30A: unrelated cancellations never create a door recovery offer',()=>{
 const actual=snapshotDoorInterruption(move,[move],
  'PATH BLOCKED · PHYSICAL GEOMETRY',3,'D8');
 assert.equal(actual,null);
 const previous=snapshotDoorInterruption(wait,[wait,move],
  'SQUAD ENTRY CANCELLED · DOOR JAMMED',2,'D8');
 assert.equal(snapshotDoorInterruption(unrelated,[unrelated],
  'NO CONTACT',3,undefined,previous),previous);
});
test('D3.30A: original MOVE keeps goal and real encountered door even without authored doorId',()=>{
 const snap=snapshotDoorInterruption(
  {id:22,kind:'move',p:pt(250,320)},[], 'PATH BLOCKED · DOOR LOCKED',12,'COURT-2');
 assert.equal(snap?.doorId,'COURT-2');
 assert.equal(snap?.original[0].p.y,320);
 assert.equal(snap?.sourceOrderId,22);
});
test('D3.30A: live terminal cancellation stores offer but never silently resumes',()=>{
 const s=newSession(),a=team(s)[0],notes=[];
 a.plan=[{...wait,p:{...wait.p}},{...move,p:{...move.p}},
  {...unrelated,p:{...unrelated.p}}];
 s.seconds=5;
 failCurrentOrder(s,a,a.plan[0],
  'SQUAD ENTRY CANCELLED · DOOR LOCKED',(_s,msg)=>notes.push(msg),'D8');
 assert.deepEqual(a.interruptedDoorPlan?.original.map(n=>n.id),[3,4]);
 assert.equal(a.plan[0].id,4);
 failCurrentOrder(s,a,a.plan[0],
  'SQUAD ENTRY CANCELLED · DOOR LOCKED',(_s,msg)=>notes.push(msg),'D8');
 assert.equal(a.interruptedDoorPlan?.sourceOrderId,3);
 assert.deepEqual(a.plan.map(n=>n.id),[5]);
 assert.equal(a.failedOrders,2);
 assert.equal(notes.length,2);
 assert.equal(a.interruptedDoorPlan?.at,5);
});
