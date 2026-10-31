import test from 'node:test';import assert from 'node:assert/strict';
import {fixedStepBudget,FIXED_DT} from '../src/breach-fixed-clock.ts';
test('30fps remains 60Hz fixed deterministic steps',()=>{
 let carry=0,count=0;
 for(let i=0;i<300;i++){const b=fixedStepBudget(carry,1/30);
  carry=b.remaining;count+=b.steps;}
 assert.equal(count,600);
 assert.ok(carry<FIXED_DT);
});
test('bad frames cannot cause unbounded simulation catchup',()=>{
 const b=fixedStepBudget(.18,.2);
 assert.equal(b.steps,3);
 assert.ok(b.remaining<=.2&&b.overloaded);
});
