import test from 'node:test';
import assert from 'node:assert/strict';
import {dueDoorHoldMilestones,D32_HOLD_MILESTONES} from '../src/breach-d3-door-evidence.ts';
test('D3.2: capture each prolonged opening-hold milestone exactly once',()=>{
 let mask=0;const collected=[];
 for(const age of [0,.7,.75,1,1.5,3,3,6,11.9,12,25]){
  for(const i of dueDoorHoldMilestones(age,mask)){
   mask|=1<<i;collected.push(D32_HOLD_MILESTONES[i]);
  }
 }
 assert.deepEqual(collected,[.75,1.5,3,6,12]);
});
