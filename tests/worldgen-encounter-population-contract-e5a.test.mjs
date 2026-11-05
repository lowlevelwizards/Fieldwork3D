import test from 'node:test';
import assert from 'node:assert/strict';
import {hostileMinimumForContract,admissibleHostileCount}
 from '../src/worldgen/encounter-population-contract.ts';
test('E5-A: no zero-hostile capture, clear or high-risk contract',()=>{
 for(const mission of ['capture','clear','hold']){
  const c={mission,premise:'vacant',risk:1};
  assert.ok(hostileMinimumForContract(c)>=1);
  assert.equal(admissibleHostileCount(c,0),false);
 }
 for(const mission of ['intel','rescue']){
  const c={mission,premise:'vacant',risk:3};
  assert.equal(admissibleHostileCount(c,0),false);
 }
});
test('E5-A: truly quiet low-risk intel/rescue may legitimately have no hostiles',()=>{
 for(const mission of ['intel','rescue'])
  for(const premise of ['vacant','after-hours']){
   const c={mission,premise,risk:1};
   assert.equal(hostileMinimumForContract(c),0);
   assert.equal(admissibleHostileCount(c,0),true);
  }
});
test('E5-A: impossible and fractional counts never enter mission',()=>{
 const c={mission:'intel',premise:'vacant',risk:1};
 for(const count of [-1,1.5,NaN,Infinity])
  assert.equal(admissibleHostileCount(c,count),false);
});
