import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newSession,team,planMove,plannedControl} from '../src/breach-game.ts';
import {activateSite} from '../src/breach-core.ts';
import {dispatchTacticalContextCommand} from '../src/breach-tactical-context-command.ts';
const setup=()=>{const s=newSession(0,19,'full-view','small');return {s,a:team(s)[0]};};
const dispatch=(s,a,action,extras={})=>
 dispatchTacticalContextCommand({state:s,selected:a.id,actor:a,
  node:undefined,door:undefined,action,selectedActiveWatch:false,
  medicalCandidate:()=>null,...extras});
test('context FIRE cycles the authoritative fire policy and PACE/STANCE modify motor intent',()=>{
 const {s,a}=setup();
 try{
  assert.equal(a.firePolicy,'engage');
  assert.equal(dispatch(s,a,'ctxFire').handled,true);
  assert.equal(a.firePolicy,'hold');
  dispatch(s,a,'ctxFire');assert.equal(a.firePolicy,'return');
  dispatch(s,a,'ctxFire');assert.equal(a.firePolicy,'engage');
  const before=plannedControl(s,a.id);
  dispatch(s,a,'ctxPace');
  assert.notEqual(plannedControl(s,a.id).pace,before.pace);
  const stance=dispatch(s,a,'ctxStance');
  assert.equal(stance.invalidateFog,true);
  assert.equal(a.posture,'crouch');
 }finally{activateSite(null);}
});
test('context WAIT writes an authored order and deleting a node clears selection',()=>{
 const {s,a}=setup();
 try{
  assert.equal(dispatch(s,a,'ctxWait').handled,true);
  assert.ok(a.plan.some(n=>n.kind==='wait'));
  const node=a.plan[0];
  const result=dispatch(s,a,'ctxDelete',{node});
  assert.equal(result.clearSelection,true);
  assert.equal(a.plan.find(n=>n.id===node.id),undefined);
 }finally{activateSite(null);}
});
test('presentation-only modes and unknown actions are not executed by command dispatcher',()=>{
 const {s,a}=setup();
 try{
  for(const mode of ['ctxLook','ctxWatch','ctxSuppress','ctxPush','ctxDoorFlash','unknown']){
   const result=dispatch(s,a,mode);
   assert.equal(result.handled,false,mode);
  }
  assert.equal(a.plan.length,0);
 }finally{activateSite(null);}
});

test('UI.7A reports actual command outcomes without inferring success from event count',()=>{
 const {s,a}=setup();
 try{
  const fire=dispatch(s,a,'ctxFire');
  assert.deepEqual({handled:fire.handled,outcome:fire.outcome},
    {handled:true,outcome:'accepted'});
  assert.equal(dispatch(s,a,'ctxWait').outcome,'accepted');
  const before=s.events.length;
  const blocked=dispatch(s,a,'ctxDelete',{node:{id:-99,kind:'move',p:a.p}});
  assert.equal(blocked.handled,true);
  assert.equal(blocked.outcome,'rejected');
  assert.equal(blocked.failureReason,'SELECTED ORDER NO LONGER AVAILABLE');
  assert.equal(s.events.length,before+1);
  const missing=dispatch(s,a,'ctxTreat');
  assert.equal(missing.outcome,'rejected');
  assert.equal(missing.failureReason,'NO REACHABLE PATIENT WITH SUITABLE SUPPLIES');
  const nothing=dispatch(s,a,'not-a-command');
  assert.equal(nothing.handled,false);
  assert.equal(nothing.outcome,undefined);
 }finally{activateSite(null);}
});

test('UI.7B contextual feedback reads the authoritative outcome, not event-log growth',()=>{
 const source=readFileSync(new URL('../src/ui/tactical-hud-controller.ts',import.meta.url),'utf8');
 assert.match(source,/result\.outcome==='rejected'/);
 assert.match(source,/result\.failureReason\?\?'ACTION BLOCKED'/);
 assert.doesNotMatch(source,/const failed=config\.state\.events\.length>beforeErrors/);
 assert.match(source,/case 'ctxFlash':[\s\S]*?targeting\.toggleFlash\(\)/);
 assert.match(source,/case 'ctxDoorFlash':[\s\S]*?feedback\.emit\('armed',doorCenter\(door\)/);
 assert.match(source,/Unrecognized actions are not confirmation-worthy commands/);
});
