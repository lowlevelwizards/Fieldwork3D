import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession} from '../src/breach-game.ts';
import {MissionRecorder} from '../src/breach-replay.ts';
import {captureReplayArchive,replayArchiveIsValid,restoreReplayArchive}
  from '../src/breach-replay-archive.ts';
import {recordedObserverCanSee} from '../src/breach-replay-visibility.ts';

test('new operator-sight evidence round-trips, old film remains readable',()=>{
  const s=newSession(0);
  const rec=new MissionRecorder();
  rec.capture(s,true);s.seconds=.05;rec.capture(s);
  const archive=captureReplayArchive(rec,'operator-sight',12345);
  assert.equal(replayArchiveIsValid(archive),true);
  const key=s.operators.find(x=>x.side==='blue').id;
  assert.ok(Object.prototype.hasOwnProperty.call(
    archive.frames[0].knowledge.operatorVisibleActorIds,key));
  const loaded=restoreReplayArchive(archive);
  assert.deepEqual(loaded.frames[0].knowledge,
    archive.frames[0].knowledge);
  const old=structuredClone(archive);
  for(const frame of old.frames)
    delete frame.knowledge.operatorVisibleActorIds;
  assert.equal(replayArchiveIsValid(old),true);
  assert.equal(recordedObserverCanSee(old.frames[0].knowledge,key,'guard'),null);
});
test('malformed optional observation evidence cannot enter saved replay',()=>{
  const s=newSession(0),rec=new MissionRecorder();
  rec.capture(s,true);s.seconds=.05;rec.capture(s);
  const archive=captureReplayArchive(rec,'replay-bounds',12345);
  const invalid=structuredClone(archive);
  invalid.frames[0].knowledge.operatorVisibleActorIds={rook:'all'};
  assert.equal(replayArchiveIsValid(invalid),false);
  invalid.frames[0].knowledge.operatorVisibleActorIds={
    rook:Array.from({length:200},(_,i)=>'hostile-'+i)};
  assert.equal(replayArchiveIsValid(invalid),false);
  invalid.frames[0].knowledge.operatorVisibleActorIds={rook:['not allowed space']};
  assert.equal(replayArchiveIsValid(invalid),false);
});
