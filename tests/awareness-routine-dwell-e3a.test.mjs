import test from 'node:test';
import assert from 'node:assert/strict';
import {routineDwellSeconds} from '../src/breach-ai-routine-dwell.ts';
test('E3-A2: pauses are deterministic, bounded and context-aware',()=>{
 const a=routineDwellSeconds('guard1','patrolling',1,5);
 const b=routineDwellSeconds('guard1','working',1,5);
 assert.equal(a,routineDwellSeconds('guard1','patrolling',1,5));
 assert.ok(a>=1.1&&a<2.7);
 assert.ok(b>=2.3&&b<3.9);
});
test('E3-A2: distinct actors and visits vary without random world state',()=>{
 const values=new Set();
 for(let visit=0;visit<21;visit++)
  values.add(routineDwellSeconds('worker-7','working',2,visit));
 assert.ok(values.size>2);
});
