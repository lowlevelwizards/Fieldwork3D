/** Deliberate opt-in (not part of quick PR gate):
 * node --experimental-strip-types --test tests/breach-roadmap2-stage1-soak.test.mjs
 * Runs longer real 60 Hz missions with recorder enabled; wall-clock measurements
 * are diagnostics, not assertions about device FPS or CPU performance.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {runStage1Scenario,stage1DoorSite,stage1ContactSite}
 from './fixtures/breach-stage1-contract-runner.mjs';
import {team,planMove,planWaitAt} from '../src/breach-game.ts';

test('long live/replay scenarios remain bounded, finite, reproducible and replay-complete',()=>{
 for(const [name,site,configure] of [
  ['door',stage1DoorSite(),s=>{
   const [rook,moss]=team(s);
   assert.ok(planWaitAt(s,rook.id,1,'here'));
   assert.ok(planMove(s,rook.id,{x:296,y:373}));
   assert.ok(planMove(s,moss.id,{x:320,y:380}));
  }],
  ['armed',stage1ContactSite(),()=>{}]
 ]){
  const config={site,mission:'hold',ticks:1200,sampleEvery:120,
   configure,record:true};
  const first=runStage1Scenario(config);
  const second=runStage1Scenario({...config,site:structuredClone(site)});
  assert.equal(first.fingerprint,second.fingerprint,name+' outcome drift');
  assert.ok(first.last.seconds>=19.5,name+' tick accounting changed');
  assert.ok(first.recorder.frames.length>20,name+' replay stopped capturing');
  assert.ok(first.recorder.frames.length<12000,name+' replay unexpectedly capped');
  assert.equal(first.recorder.completeness.complete,true,name+' replay truncated');
  assert.ok(first.recorder.motion.stepEventCount>0,name+' no movement history');
  assert.ok(first.last.shotEvidence.length<400,name+' unbounded transient shots');
  assert.ok(first.last.battle.length<2000,name+' unbounded battle evidence');
  console.log('STAGE1_SOAK',name,JSON.stringify({
   hash:first.fingerprint,frames:first.recorder.frames.length,
   steps:first.recorder.motion.stepEventCount,shots:first.shotsFired
  }));
 }
});
