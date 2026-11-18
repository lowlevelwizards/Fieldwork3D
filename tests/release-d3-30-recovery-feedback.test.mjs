import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession,team} from '../src/breach-game.ts';
import {executionStatus} from '../src/breach-execution-state.ts';
import {compactExecutionStatus} from '../src/ui/tactical-hud-density.ts';
import {contextActionChoices} from '../src/ui/context-actions.ts';
const base={door:false,node:false,flashRemaining:1,posture:'stand',
 pace:'walk',firePolicy:'engage',reserve:10,magazine:10};
const incident=(a,door,reason='locked')=>({
 sourceOrderId:1,doorId:door.id,at:3,reason,
 original:[{id:1,kind:'move',p:{...a.p}}]});
test('D3.30F: planning HUD shows previous interrupted entry',()=>{
 const s=newSession(),a=team(s)[0];
 a.interruptedDoorPlan=incident(a,s.doors[0]);
 a.plan=[{id:55,kind:'look',p:{...a.p},facing:0}];
 const status=executionStatus(a,{phase:'planning'});
 assert.equal(status.reason,'entry-interrupted');
 assert.equal(status.label,'ENTRY INTERRUPTED');
 const compact=compactExecutionStatus(status,
  {selected:true,phase:'planning',down:false});
 assert.equal(compact.label,'ENTRY HELD');
 assert.equal(compact.priority,'attention');
});
test('D3.30F: unseen lock changes never alter historic status or retry offer',()=>{
 const s=newSession(),a=team(s)[0],door=s.doors[0];
 a.interruptedDoorPlan=incident(a,door);
 const previous=executionStatus(a,{phase:'planning'});
 const menu=contextActionChoices({...base,resumeAvailable:true,resumeReason:'locked'});
 door.locked=!door.locked;door.jammed=!door.jammed;door.open=!door.open;
 assert.deepEqual(executionStatus(a,{phase:'planning'}),previous);
 assert.deepEqual(contextActionChoices({...base,resumeAvailable:true,
  resumeReason:'locked'}),menu);
});
test('D3.30F: coordinated status does not hide an unrelated live order',()=>{
 const s=newSession(),a=team(s)[0];
 a.interruptedDoorPlan=incident(a,s.doors[0],'coordinated');
 assert.match(executionStatus(a,{phase:'planning'}).detail,/SQUAD ENTRY HELD/);
 a.plan=[{id:9,kind:'look',p:{...a.p},facing:0}];
 assert.notEqual(executionStatus(a,{phase:'running'}).reason,'entry-interrupted');
 a.interruptedDoorPlan=null;
 assert.notEqual(executionStatus(a,{phase:'planning'}).reason,'entry-interrupted');
});
