import test from 'node:test';
import assert from 'node:assert/strict';
import {isSupersededQueuedRun,classifyPendingPagesRuns} from '../scripts/verification/pages-queued-run-classification.mjs';
const time=Date.parse('2026-11-12T02:00:00Z');
const queued={
 id:43098274766,status:'queued',head_sha:'abd0dd14',
 created_at:'2026-11-11T20:49:18Z',updated_at:'2026-11-11T20:49:18Z'
};
const success={
 id:43129618363,status:'completed',conclusion:'success',
 head_sha:'abd0dd14',created_at:'2026-11-12T00:45:27Z'
};
test('stale pre-run Pages record is superseded by verified later same-SHA publish',async()=>{
 assert.equal(isSupersededQueuedRun(queued,[success,queued],time),true);
 const result=await classifyPendingPagesRuns([success,queued],async()=>0,time);
 assert.deepEqual(result.blocking,[]);
 assert.deepEqual(result.superseded,[queued]);
});
test('a queued run with even one job is still blocking',async()=>{
 const result=await classifyPendingPagesRuns([success,queued],async()=>1,time);
 assert.deepEqual(result.blocking,[queued]);
});
test('never waive a new, changed, running, or different-SHA queued deployment',async()=>{
 const recent={...queued,created_at:'2026-11-12T01:50:00Z',updated_at:'2026-11-12T01:50:00Z'};
 const changed={...queued,updated_at:'2026-11-11T21:00:00Z'};
 const running={...queued,status:'in_progress'};
 const otherSha={...queued,head_sha:'different'};
 for(const run of [recent,changed,running,otherSha]){
  assert.equal(isSupersededQueuedRun(run,[success,run],time),false);
  const result=await classifyPendingPagesRuns([success,run],async()=>0,time);
  assert.deepEqual(result.blocking,[run]);
 }
});
test('never waive when the later run failed or targets a different commit',async()=>{
 const failed={...success,conclusion:'failure'};
 const otherSha={...success,head_sha:'other'};
 assert.equal(isSupersededQueuedRun(queued,[failed,queued],time),false);
 assert.equal(isSupersededQueuedRun(queued,[otherSha,queued],time),false);
});
test('job query errors stop the release instead of silently ignoring a pending run',async()=>{
 await assert.rejects(()=>classifyPendingPagesRuns([success,queued],async()=>{throw Error('API unavailable')},time),/API unavailable/);
});
