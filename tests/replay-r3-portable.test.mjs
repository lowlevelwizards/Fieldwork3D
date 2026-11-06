import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession} from '../src/breach-game.ts';
import {MissionRecorder} from '../src/breach-replay.ts';
import {captureReplayArchive,restoreReplayArchive}
  from '../src/breach-replay-archive.ts';
import {exportPortableReplay,importPortableReplay,portableReplaySupported,
  REPLAY_FILE_SUFFIX} from '../src/breach-replay-portable.ts';
test('compressed portable recording round-trips historical film and motion',async()=>{
  assert.equal(portableReplaySupported(),true);
  const s=newSession(0,28913),rec=new MissionRecorder();
  rec.capture(s,true);
  s.seconds=.05;rec.capture(s,true);
  const archive=captureReplayArchive(rec,'portable-test',123456);
  const blob=await exportPortableReplay(archive);
  assert.ok(blob.size>16);
  assert.equal(REPLAY_FILE_SUFFIX,'.fieldwork-replay.json.gz');
  const back=await importPortableReplay(blob);
  const restored=restoreReplayArchive(back);
  assert.equal(restored.duration,rec.duration);
  // JSON omits optional fields with undefined values; resolved geometry stays exact.
  assert.deepEqual(restored.manifest.site.rooms,
    JSON.parse(JSON.stringify(rec.manifest.site.rooms)));
  assert.deepEqual(restored.frames.map(f=>f.actors[0].p),
    rec.frames.map(f=>f.actors[0].p));
  assert.equal(restored.motion.toArchive().actors.length,
    rec.motion.toArchive().actors.length);
});
test('portable import rejects non-gzip and malformed payloads',async()=>{
  await assert.rejects(importPortableReplay(new Blob(['not a replay file'])),
    /Not a compressed/);
  await assert.rejects(importPortableReplay(new Blob([])),/size is invalid/);
});
