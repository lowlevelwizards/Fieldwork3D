import test from 'node:test';
import assert from 'node:assert/strict';
import {stableEntryLeafRecoveryEligible} from '../src/breach-motor-route.ts';

const door=(fraction,extra={})=>({
 id:'FRONT',a:{x:200,y:100},b:{x:242,y:100},
 open:true,openFraction:fraction,angularVelocity:0,
 locked:false,jammed:false,wedged:false,heldBy:null,...extra
});
const actor=(maneuver='grab-and-hold')=>({
 plan:[{kind:'move',id:301,entryDoorId:'FRONT',p:{x:330,y:100}}],
 doorTraversal:{doorId:'FRONT',maneuver}
});
test('D3.25C Townhouse stationary 94% entry leaf may request a world route',()=>{
 assert.equal(stableEntryLeafRecoveryEligible(actor(),door(.944)),true);
});
test('D3.25C no physical recovery through moving, locked or truly narrow hinge',()=>{
 assert.equal(stableEntryLeafRecoveryEligible(actor(),door(.89)),false);
 assert.equal(stableEntryLeafRecoveryEligible(actor(),door(.944,{angularVelocity:.4})),false);
 assert.equal(stableEntryLeafRecoveryEligible(actor(),door(.944,{locked:true})),false);
 assert.equal(stableEntryLeafRecoveryEligible(actor(),door(.944,{jammed:true})),false);
 assert.equal(stableEntryLeafRecoveryEligible(actor(),door(.944,{heldBy:'enemy'})),false);
});
test('D3.25C relaxed threshold never applies to unrelated authored route',()=>{
 assert.equal(stableEntryLeafRecoveryEligible(
  {...actor(),doorTraversal:null},door(.944)),false);
 assert.equal(stableEntryLeafRecoveryEligible(actor('direct'),door(.944)),false);
 assert.equal(stableEntryLeafRecoveryEligible(actor(),door(.944,{id:'D8'})),false);
 assert.equal(stableEntryLeafRecoveryEligible(
  {plan:[{kind:'move',id:1,p:{x:330,y:100}}],
   doorTraversal:{doorId:'FRONT',maneuver:'grab-and-hold'}},door(.944)),false);
 assert.equal(stableEntryLeafRecoveryEligible(actor('direct'),door(.98)),true,
  'old fully open recovery remains unchanged');
});
