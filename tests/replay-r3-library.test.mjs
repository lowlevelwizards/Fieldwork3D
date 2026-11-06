import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession} from '../src/breach-game.ts';
import {MissionRecorder} from '../src/breach-replay.ts';
import {captureReplayArchive} from '../src/breach-replay-archive.ts';
import {replayLibrarySummary,sortReplayLibrary,replayLibrarySupported,
  REPLAY_LIBRARY_LIMIT,saveReplayArchive}
  from '../src/breach-replay-library.ts';
test('library metadata stays small and never embeds the film',()=>{
  const s=newSession(0,417),r=new MissionRecorder();
  r.capture(s,true);s.seconds=.1;r.capture(s,true);
  const archive=captureReplayArchive(r,'metadata-test',42);
  const index=replayLibrarySummary(archive);
  assert.equal(index.id,'metadata-test');
  assert.equal(index.duration,.1);
  assert.equal(index.frameCount,2);
  assert.equal(index.favorite,false);
  assert.equal('frames' in index,false);
  assert.ok(JSON.stringify(index).length<400);
  assert.equal(REPLAY_LIBRARY_LIMIT,24);
});
test('favorite-first library order is deterministic and non-mutating',()=>{
  const rows=[
    {id:'older',favorite:false,createdAt:1},
    {id:'newer',favorite:false,createdAt:5},
    {id:'starred',favorite:true,createdAt:2}
  ];
  assert.deepEqual(sortReplayLibrary(rows).map(x=>x.id),
    ['starred','newer','older']);
  assert.equal(rows[0].id,'older');
});
test('unavailable IndexedDB fails explicitly and cannot pretend to save',async()=>{
  assert.equal(replayLibrarySupported(),false);
  await assert.rejects(saveReplayArchive({}),/invalid or incompatible/);
});
