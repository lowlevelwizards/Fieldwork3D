import test from 'node:test';
import assert from 'node:assert/strict';
import {runE4Closeout} from '../scripts/verification/refactor-e4-closeout.mjs';

test('E4.I combined long-session replay, event feed and archive evidence remain bounded',()=>{
 const result=runE4Closeout();
 assert.equal(result.stage,'E4.I');
 assert.equal(result.actors,4);
 assert.equal(result.frames,1800);
 assert.equal(result.replaySteps,480);
 assert.equal(result.motionSamples,480*4);
 assert.equal(result.retainedFeedNodesAfterReset,0);
 assert.equal(result.archivesUnchanged,true);
 assert.equal(result.eventEvidenceUnchanged,true);
 assert.ok(result.feedButtonsCreated<result.replaySteps+80);
 assert.ok(result.sampledTrailPoints>0);
});
