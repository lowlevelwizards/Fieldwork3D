import test from 'node:test';import assert from 'node:assert/strict';
import {graphicsBudget} from '../src/breach-graphics-budget.ts';
test('mobile presets constrain GPU pixel/shadow budgets',()=>{
 const low=graphicsBudget('performance',true);
 const medium=graphicsBudget(null,true);
 const high=graphicsBudget('quality',true);
 assert.equal(low.shadowSize,512);
 assert.ok(low.pixelRatio<medium.pixelRatio);
 assert.ok(medium.pixelRatio<=high.pixelRatio);
 assert.equal(high.shadowSize,1024);
});
