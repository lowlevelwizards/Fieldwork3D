import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession} from '../src/breach-game.ts';
import {MissionRecorder} from '../src/breach-replay.ts';
import {notePersonalGround} from '../src/breach-replay-personal-ground.ts';
import {captureReplayArchive,replayArchiveIsValid,restoreReplayArchive}
  from '../src/breach-replay-archive.ts';
test('sparse per-observer ground survives portable archive roundtrip',()=>{
  const session=newSession(0,3411),rec=new MissionRecorder();
  rec.capture(session,true);
  assert.equal(notePersonalGround(session,'rook',0,'fine:3,4'),true);
  assert.equal(notePersonalGround(session,'moss',0,'micro:6,8'),true);
  session.seconds=.05;rec.capture(session);
  assert.equal(rec.personalGround.length,2);
  const archive=captureReplayArchive(rec,'personal-ground',12345);
  assert.ok(replayArchiveIsValid(archive));
  const restored=restoreReplayArchive(archive);
  assert.deepEqual(restored.personalGround,rec.personalGround);
  const legacy=structuredClone(archive);
  delete legacy.personalGround;
  assert.equal(replayArchiveIsValid(legacy),true);
  assert.deepEqual(restoreReplayArchive(legacy).personalGround,[]);
});
test('invalid ground histories do not enter a replay archive',()=>{
  const session=newSession(0,3411),rec=new MissionRecorder();
  rec.capture(session,true);
  session.seconds=.05;rec.capture(session);
  const original=captureReplayArchive(rec,'personal-ground',12345);
  const invalid=structuredClone(original);
  invalid.personalGround=[{at:.01,observerId:'rook',
    keys:['../../hidden-secrets']}];
  assert.equal(replayArchiveIsValid(invalid),false);
  invalid.personalGround=[{at:5,observerId:'rook',keys:['fine:1,2']}];
  assert.equal(replayArchiveIsValid(invalid),false);
  invalid.personalGround=[{at:.01,observerId:'bad actor id',
    keys:['fine:1,2']}];
  assert.equal(replayArchiveIsValid(invalid),false);
});
