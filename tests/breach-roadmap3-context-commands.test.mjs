import test from 'node:test';
import assert from 'node:assert/strict';
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
