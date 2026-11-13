import test from 'node:test';
import assert from 'node:assert/strict';
import {openingYieldBudget,commitOpeningYield,
 MAX_OPENING_YIELD_TRAVEL,idleYieldAllowed,commitIdleYield}
 from '../src/breach-passage-yield.ts';
test('Q1 physical opening-yield finishes a short maneuver then reaches a hard budget',()=>{
 const s={},door={id:'D',open:true,openFraction:.5};
 assert.equal(openingYieldBudget(s,door,'a'),MAX_OPENING_YIELD_TRAVEL);
 for(let i=0;i<MAX_OPENING_YIELD_TRAVEL;i++){
  assert.ok(openingYieldBudget(s,door,'a')>0);
  commitOpeningYield(s,door,'a',{x:0,y:i},{x:0,y:i+1});
 }
 for(let i=0;i<1800;i++)assert.equal(openingYieldBudget(s,door,'a'),0);
 assert.equal(openingYieldBudget(s,door,'b'),MAX_OPENING_YIELD_TRAVEL);
 door.open=false;door.openFraction=.6;
 assert.equal(openingYieldBudget(s,door,'a'),0);
 door.openFraction=.01;
 assert.equal(openingYieldBudget(s,door,'a'),MAX_OPENING_YIELD_TRAVEL);
});
test('Q1 idle yield cannot perpetually move away from same approaching actor',()=>{
 const s={};
 assert.equal(idleYieldAllowed(s,'idle',['one']),true);
 commitIdleYield(s,'idle',['one']);
 for(let i=0;i<1800;i++)assert.equal(idleYieldAllowed(s,'idle',['one']),false);
 assert.equal(idleYieldAllowed(s,'idle',['two']),true);
 idleYieldAllowed(s,'idle',[]);
 assert.equal(idleYieldAllowed(s,'idle',['one']),true);
});