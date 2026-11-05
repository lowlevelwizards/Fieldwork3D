import test from 'node:test';
import assert from 'node:assert/strict';
import {pressureAdvanceOpportunity}
 from '../src/breach-ai-initiative.ts';
const base={personality:'aggressor',directSight:true,clearFireLane:true,
 range:150,suppression:0,morale:.95,nearbyAllies:1,secondsSinceLastMove:10};
test('E3-B: only physically observed and supported advances qualify',()=>{
 assert.equal(pressureAdvanceOpportunity(base),true);
 for(const difference of [
  {directSight:false},{personality:'cautious'},
  {personality:'guard'},{clearFireLane:false},{range:240},
  {range:45},{nearbyAllies:0},{suppression:.4},
  {morale:.25},{secondsSinceLastMove:1}
 ]) assert.equal(pressureAdvanceOpportunity({...base,...difference}),false);
});
