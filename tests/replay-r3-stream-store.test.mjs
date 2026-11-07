import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as stream from '../src/breach-replay-chunk-store.ts';

test('G5b2 adds streaming drafts without touching V1 complete publications',()=>{
  assert.equal(typeof stream.beginStreamingReplayV2,'function');
  assert.equal(typeof stream.appendStreamingReplayChunkV2,'function');
  assert.equal(typeof stream.sealStreamingReplayV2,'function');
  assert.equal(typeof stream.commitStreamingReplayV2,'function');
  assert.equal(typeof stream.listInterruptedStreamingReplaysV2,'function');
  assert.equal(typeof stream.discardStreamingReplayV2,'function');
  assert.equal(typeof stream.openChunkedReplayV2,'function');
  assert.equal(typeof stream.stageExistingReplayAsChunksV2,'function');
  assert.equal(stream.REPLAY_V2_MAX_FRAMES,12000,
    'Existing live archive cap must not silently increase');
  const source=readFileSync(new URL(
    '../src/breach-replay-chunk-store.ts',import.meta.url),'utf8');
  assert.match(source,/const VERSION=2/);
  assert.match(source,/const STREAMING='stream-drafts'/);
  assert.match(source,/db\.createObjectStore\(STREAMING/);
  assert.match(source,/transaction\(\[STREAMING,CHUNKS,PUBLISHED\]/);
  assert.match(source,/replayArchiveIsValid\(\{/);
});
