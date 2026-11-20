import test from 'node:test';
import assert from 'node:assert/strict';
import {eligibleFrameActorDetour}
 from '../src/breach-frame-actor-recovery.ts';

const actor=()=>({
 side:'blue',plan:[{kind:'move',id:12,p:{x:80,y:70}}],
 lastBlocker:'actor',blockedTime:1.4,lastNavRepairAt:0,
 squeeze:false,traversal:null,traversalPending:null,doorTraversal:null,
 fireRetreatTarget:null,motorPause:null
});
test('R1.03b: only actual prolonged coupled-frame actor blockage is eligible',()=>{
 const a=actor();
 assert.equal(eligibleFrameActorDetour(a,2),true);
 assert.equal(eligibleFrameActorDetour({...a,blockedTime:1.24},2),false);
 assert.equal(eligibleFrameActorDetour({...a,lastBlocker:'clear'},2),false);
 assert.equal(eligibleFrameActorDetour({...a,lastNavRepairAt:1.6},2),false);
 assert.equal(eligibleFrameActorDetour({...a,side:'red'},2),false);
});
test('R1.03b: no generated squad entry, stack, WAIT, squeeze, traversal or door episode can be bypassed',()=>{
 const a=actor();
 for(const order of [
  {kind:'wait',id:12,p:{x:80,y:70}},
  {kind:'move',id:12,entryDoorId:'D',p:{x:80,y:70}},
  {kind:'move',id:12,stackDoorId:'D',p:{x:80,y:70}}
 ])assert.equal(eligibleFrameActorDetour({...a,plan:[order]},2),false);
 for(const k of ['squeeze','traversal','traversalPending','doorTraversal',
                 'fireRetreatTarget','motorPause']){
  assert.equal(eligibleFrameActorDetour({...a,[k]:k==='squeeze'?true:
    k==='motorPause'?'passage':{id:'D'}},2),false,k);
 }
});
