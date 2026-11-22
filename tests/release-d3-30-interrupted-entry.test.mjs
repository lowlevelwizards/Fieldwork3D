import test from 'node:test';
import assert from 'node:assert/strict';
import {snapshotDoorInterruption} from '../src/breach-door-interruption.ts';
import {failCurrentOrder} from '../src/breach-order-lifecycle.ts';
import {newSession,team,resumeInterruptedDoorPlan,canResumeInterruptedDoorPlan} from '../src/breach-game.ts';
import {contextActionChoices} from '../src/ui/context-actions.ts';
import {dispatchTacticalContextCommand} from '../src/breach-tactical-context-command.ts';

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

test('D3.30B: no door opening or plan edit occurs before explicit RESUME',()=>{
 const s=newSession(0,undefined,'full-view'),a=team(s)[0],door=s.doors[0];
 const original={id:900,kind:'move',p:{...a.p}};
 a.plan=[{id:901,kind:'look',p:{...a.p},facing:.5}];
 a.interruptedDoorPlan={
  sourceOrderId:900,doorId:door.id,at:4,reason:'locked',
  original:[original]
 };
 door.locked=true;door.lockSide='both';
 const oldId=s.nextId,oldPlan=a.plan.map(n=>n.id);
 assert.equal(resumeInterruptedDoorPlan(s,a.id),false);
 assert.deepEqual(a.plan.map(n=>n.id),oldPlan);
 assert.equal(s.nextId,oldId);
 door.locked=false;door.jammed=true;
 assert.equal(resumeInterruptedDoorPlan(s,a.id),false);
 door.jammed=false;
 assert.equal(a.plan[0].id,901,
  'unlock alone never starts the preserved destination');
 assert.equal(resumeInterruptedDoorPlan(s,a.id),true,
  'only the explicit player action restores the original move');
 assert.equal(a.plan.length,2);
 assert.equal(a.plan[0].kind,'move');
 assert.deepEqual(a.plan[0].p,original.p);
 assert.equal(a.plan[1].id,901,'independent later orders survive');
 assert.notEqual(a.plan[0].id,900,'retry must get a fresh order identity');
 assert.equal(a.interruptedDoorPlan,null);
});
test('D3.30B: resuming is prohibited outside planning and without physical door',()=>{
 const s=newSession(0,undefined,'full-view'),a=team(s)[0];
 a.interruptedDoorPlan={
  sourceOrderId:1,doorId:'GHOST',at:1,reason:'locked',
  original:[{id:1,kind:'move',p:{...a.p}}]
 };
 assert.equal(resumeInterruptedDoorPlan(s,a.id),false);
 a.interruptedDoorPlan.doorId=s.doors[0].id;
 s.phase='running';s.doors[0].locked=false;
 assert.equal(resumeInterruptedDoorPlan(s,a.id),false);
 assert.equal(a.interruptedDoorPlan?.sourceOrderId,1);
});

test('D3.30C: interrupted entry recovery is internal, not a player menu button',()=>{
 const base={door:false,node:false,flashRemaining:2,
  posture:'stand',pace:'walk',firePolicy:'engage',reserve:20,magazine:20};
 for(const door of [true,false]){
  const actions=contextActionChoices({...base,door,resumeAvailable:true,
   resumeSquadAvailable:true});
  assert.ok(actions.every(x=>x.id!=='ctxResumeEntry'&&x.id!=='ctxResumeSquad'));
 }
});
test('D3.30C: palette action refuses locked door and explicitly restores after unlock',()=>{
 const s=newSession(0,undefined,'full-view'),a=team(s)[0],door=s.doors[0];
 a.interruptedDoorPlan={sourceOrderId:1,doorId:door.id,at:1,
   reason:'locked',original:[{id:1,kind:'move',p:{...a.p}}]};
 const click=()=>dispatchTacticalContextCommand({
   state:s,selected:a.id,actor:a,node:undefined,door:undefined,
   action:'ctxResumeEntry',selectedActiveWatch:false,
   medicalCandidate:()=>null
 });
 door.locked=true;door.lockSide='both';
 assert.equal(canResumeInterruptedDoorPlan(s,a.id),false);
 assert.equal(click().outcome,'rejected');
 assert.ok(a.interruptedDoorPlan);
 door.locked=false;
 assert.equal(canResumeInterruptedDoorPlan(s,a.id),true);
 assert.equal(click().outcome,'accepted');
 assert.equal(a.plan[0]?.kind,'move');
 assert.equal(a.interruptedDoorPlan,null);
});
