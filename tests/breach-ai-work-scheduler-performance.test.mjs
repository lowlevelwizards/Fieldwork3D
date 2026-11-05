import test from 'node:test';
import assert from 'node:assert/strict';
import {AiWorkScheduler} from '../src/breach-ai-work-scheduler.ts';

test('enemy elective planning is deterministic, bounded and evenly staggered',()=>{
 const ids=Array.from({length:14},(_,i)=>'guard'+i);
 const run=()=>{
  const scheduler=new AiWorkScheduler(2);
  const allowances=[];
  for(let tick=1;tick<=30;tick++){
   let granted=0;
   for(const id of ids)if(scheduler.allow(id,'idle-defense',tick)){
    allowances.push(tick+':'+id);granted++;
   }
   assert.ok(granted<=2,'never more than two elective searches per tick');
  }
  return allowances;
 };
 assert.deepEqual(run(),run(),'identical actors and ticks yield exact same schedule');
 const allowances=run();
 for(const id of ids)
  assert.ok(allowances.some(entry=>entry.endsWith(':'+id)),
   id+' is never starved');
});

test('combat reactions bypass elective workload budget, including its exhaustion',()=>{
 const scheduler=new AiWorkScheduler(1);
 scheduler.allow('guard0','idle-defense',15);
 scheduler.allow('guard1','idle-defense',15);
 assert.equal(scheduler.allow('guard99','visible-fire',15,true),true);
 assert.equal(scheduler.allow('guard100','being-shot',15,true),true);
 assert.ok(scheduler.granted<=1);
});

test('elective work denied one tick eventually runs when no other actors compete',()=>{
 const scheduler=new AiWorkScheduler(1);
 const results=Array.from({length:12},(_,tick)=>
  scheduler.allow('guard-far','search-expand',tick));
 assert.ok(results.some(Boolean));
 assert.ok(results.some(allowed=>!allowed));
 assert.ok(scheduler.deferred>0);
});
