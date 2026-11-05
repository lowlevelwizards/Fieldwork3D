import test from 'node:test';
import assert from 'node:assert/strict';
import {retreatDoorClosureEligible}
 from '../src/breach-ai-door-response.ts';
const door={id:'x',a:{x:20,y:20},b:{x:20,y:55},
 open:true,openedAt:0,openFraction:1,kind:'hinged'};
test('E4-B: closure requires real door reach and no direct contact',()=>{
 const actor={x:28,y:38};
 assert.equal(retreatDoorClosureEligible(actor,door,25,0,false,null),true);
 assert.equal(retreatDoorClosureEligible(actor,door,25,0,true,null),false);
 assert.equal(retreatDoorClosureEligible({x:250,y:38},door,25,0,false,null),false);
 assert.equal(retreatDoorClosureEligible(actor,{...door,open:false},25,0,false,null),false);
 assert.equal(retreatDoorClosureEligible(actor,{...door,wedged:true},25,0,false,null),false);
 assert.equal(retreatDoorClosureEligible(actor,{...door,kind:'shutter'},25,0,false,null),false);
});
test('E4-B: known close threat and closure cooldown prevent opportunistic abuse',()=>{
 const p={x:28,y:38};
 assert.equal(retreatDoorClosureEligible(p,door,25,0,false,{x:45,y:40}),false);
 assert.equal(retreatDoorClosureEligible(p,door,25,21,false,null),false);
});
