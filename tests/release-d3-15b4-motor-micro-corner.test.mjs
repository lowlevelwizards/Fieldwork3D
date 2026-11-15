import test from 'node:test';
import assert from 'node:assert/strict';
import {fullBodyMotorStrideClear,selectStackMicroCorner,
 stackMicroRecoveryEligible,claimStackMicroAttempt}
 from '../src/breach-stack-micro-corner.ts';
const p=(x,y)=>({x,y});
test('D3.15B4 rejects chord whose real motor-sized first step is blocked',()=>{
 const from=p(0,0),to=p(9,-7);
 // Just inside furniture corner on positive X, negative travel.
 const sweep=(_from,to)=>!(to.x>.2&&to.y>-.45);
 assert.equal(sweep(from,to),true,
  'coarse endpoint alone falsely reports passable');
 assert.equal(fullBodyMotorStrideClear(from,to,sweep),false);
 const route=selectStackMicroCorner(from,to,sweep);
 assert.equal(route.length,2,'selects one physical sidestep and unchanged goal');
 assert.deepEqual(route[1],to);
 assert.equal(fullBodyMotorStrideClear(from,route[0],sweep),true);
 assert.equal(fullBodyMotorStrideClear(route[0],to,sweep),true);
});
test('D3.15B4 refuses any blocked, fake, or overlong correction',()=>{
 assert.deepEqual(selectStackMicroCorner(p(0,0),p(10,-8),()=>false),[]);
 assert.deepEqual(selectStackMicroCorner(p(0,0),p(10,-8),()=>true),[],
  'no correction when direct motor-sized step is already clear');
 assert.deepEqual(selectStackMicroCorner(p(0,0),p(100,0),()=>false),[]);
 assert.equal(fullBodyMotorStrideClear(p(0,0),p(121,0),()=>true),false);
});
test('D3.15B4 only generated BLUE stacking collision may trigger and at most twice',()=>{
 const actor={side:'blue',squeeze:false,doorTraversal:null,blockedTime:2,
  lastBlocker:'furniture',traversal:null,traversalPending:null,
  plan:[{kind:'move',id:4,p:p(12,0),stackDoorId:'FRONT'}]};
 assert.equal(stackMicroRecoveryEligible(actor),true);
 assert.equal(claimStackMicroAttempt(actor,2),true);
 assert.equal(claimStackMicroAttempt(actor,2.1),false);
 assert.equal(claimStackMicroAttempt(actor,6),true);
 assert.equal(claimStackMicroAttempt(actor,10),false);
 actor.plan[0].id=5;
 assert.equal(claimStackMicroAttempt(actor,11),true,
  'new order has its own independent physical attempts');
 actor.plan[0].entryDoorId='FRONT';
 assert.equal(stackMicroRecoveryEligible(actor),false);
 delete actor.plan[0].entryDoorId;
 actor.side='red';
 assert.equal(stackMicroRecoveryEligible(actor),false);
 actor.side='blue';actor.squeeze=true;
 assert.equal(stackMicroRecoveryEligible(actor),false);
 actor.squeeze=false;actor.doorTraversal={doorId:'FRONT'};
 assert.equal(stackMicroRecoveryEligible(actor),false);
});
