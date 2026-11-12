import test from 'node:test';
import assert from 'node:assert/strict';
import {assessOperation} from '../src/breach-operations.ts';

test('V5.5 source components reconcile across all mission and scoring branches',()=>{
 for(const kind of ['clear','intel','rescue','hold','capture'])
  for(const outcome of ['success','failure'])
   for(const casualties of [0,1,4]){
    const input={kind,outcome,elapsed:205,casualties,teamSize:4,
     shots:10,hits:10,objective:outcome==='success',extracted:0,
     targetSurrendered:kind==='capture',civilianPlayerInjured:1,
     civilianPlayerDown:1};
    const old=assessOperation(input),explained=assessOperation(input,true);
    assert.deepEqual(old,{grade:explained.grade,score:explained.score,
     accuracy:explained.accuracy,survived:explained.survived});
    assert.equal(explained.scoreComponents.reduce((n,c)=>n+c.amount,0),
     explained.score);
   }
});
test('V5.5 example B / 86 excludes accuracy bonuses',()=>{
 const input={kind:'clear',outcome:'success',elapsed:49,
  teamSize:4,casualties:1,shots:10,hits:10,objective:true,extracted:3};
 const result=assessOperation(input,true);
 assert.equal(result.grade,'B');assert.equal(result.score,86);
 assert.equal(result.accuracy,100);
 assert.deepEqual(result.scoreComponents.map(c=>c.amount),[78,12,9,-13]);
});
