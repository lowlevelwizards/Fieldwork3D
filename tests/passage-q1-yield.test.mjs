import test from 'node:test';
import assert from 'node:assert/strict';
import {openingYieldAllowed,commitOpeningYield,
 idleYieldAllowed,commitIdleYield} from '../src/breach-passage-yield.ts';
const s={};
const door={id:'D',open:true,openFraction:.5};
test('Q1 one physical opening yield per actor, then stable, reset only fully closed',()=>{
 assert.equal(openingYieldAllowed(s,door,'a'),true);
 commitOpeningYield(s,door,'a');
 for(let i=0;i<1800;i++)assert.equal(openingYieldAllowed(s,door,'a'),false);
 assert.equal(openingYieldAllowed(s,door,'b'),true);
 door.open=false;door.openFraction=.5;
 assert.equal(openingYieldAllowed(s,door,'a'),false);
 door.openFraction=.01;
 assert.equal(openingYieldAllowed(s,door,'a'),true);
});
test('Q1 idle yield cannot perpetually move away from same approaching actor',()=>{
 const session={};
 assert.equal(idleYieldAllowed(session,'idle',['one']),true);
 commitIdleYield(session,'idle',['one']);
 for(let i=0;i<1800;i++)
  assert.equal(idleYieldAllowed(session,'idle',['one']),false);
 assert.equal(idleYieldAllowed(session,'idle',['two']),true);
 idleYieldAllowed(session,'idle',[]);
 assert.equal(idleYieldAllowed(session,'idle',['one']),true);
});