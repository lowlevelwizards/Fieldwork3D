import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newSession} from '../src/breach-game.ts';
import {MissionRecorder} from '../src/breach-replay.ts';
import {captureReplayArchive}
  from '../src/breach-replay-archive.ts';
import {
  beginChunkedReplayV2,appendReplayChunkV2,commitChunkedReplayV2,
  openChunkedReplayV2,discardChunkedReplayDraftV2,
  listInterruptedChunkedReplaysV2,stageExistingReplayAsChunksV2
} from '../src/breach-replay-chunk-store.ts';

test('G3 keeps chunk storage isolated from V1 live library and recorder',()=>{
  const src=readFileSync(new URL('../src/breach-replay-chunk-store.ts',
    import.meta.url),'utf8');
  const v1=readFileSync(new URL('../src/breach-replay-library.ts',
    import.meta.url),'utf8');
  assert.match(src,/fieldwork-breach-replay-chunks/);
  assert.match(v1,/fieldwork-breach-replay-library/);
  assert.match(src,/storageComplete:true/);
  assert.match(src,/ReplayChunkWindow/);
  assert.match(src,/Cannot publish an incomplete replay/);
  assert.match(src,/transaction\(\[DRAFTS,CHUNKS,PUBLISHED\],'readwrite'\)/);
  assert.equal(typeof beginChunkedReplayV2,'function');
  assert.equal(typeof appendReplayChunkV2,'function');
  assert.equal(typeof commitChunkedReplayV2,'function');
  assert.equal(typeof stageExistingReplayAsChunksV2,'function');
  assert.equal(typeof openChunkedReplayV2,'function');
  assert.equal(typeof discardChunkedReplayDraftV2,'function');
  assert.equal(typeof listInterruptedChunkedReplaysV2,'function');
});
test('G3 V1 source archive still carries complete authoritative journals',()=>{
  const s=newSession(0,3948),rec=new MissionRecorder();
  rec.capture(s,true);s.seconds=.1;rec.capture(s,true);
  const archive=captureReplayArchive(rec,'g3-archive',1712345678900);
  assert.equal(archive.frames.length,2);
  assert.equal(archive.format,'fieldwork-breach-replay');
  assert.ok(archive.motion.actors.length>0);
  assert.ok(Array.isArray(archive.battleEvents));
  assert.ok(Array.isArray(archive.executionEvents));
  assert.ok(Array.isArray(archive.shots));
  assert.ok(Array.isArray(archive.planRevisions));
  // The V2 sidecar uses object rest, preserving optional personal evidence.
  const {frames,...sidecar}=archive;
  assert.equal(frames.length,2);
  assert.equal(sidecar.manifest.site.seed,3948);
});
