import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession} from '../src/breach-game.ts';
import {MissionRecorder} from '../src/breach-replay.ts';
import {applyReplayKnowledge,recordedObserverCanSeeBody,
  recordedObserverDiscoveredBody,replayActorDisclosed}
  from '../src/breach-replay-visibility.ts';
import {captureReplayArchive,replayArchiveIsValid,restoreReplayArchive}
  from '../src/breach-replay-archive.ts';

test('each observer discovers corpses independently without full-view shortcut',()=>{
  const s=newSession(0,3411);
  const blue=s.operators.filter(a=>a.side==='blue');
  const dead=s.operators.find(a=>a.side==='red');
  assert.ok(dead&&blue.length>=2);
  // A clear exterior test ray, not a zero-length observer/body vector
  // (the optical slab test is allowed to reject that degenerate ray).
  blue[0].p={x:-10000,y:-10000};blue[0].heading=0;
  dead.health=0;dead.p={x:-9980,y:-10000};
  blue[1].p={x:-9000,y:-9000};
  s.intel.mode='full-view';
  const rec=new MissionRecorder();
  rec.capture(s,true);
  const first=rec.frames[0].knowledge;
  assert.equal(recordedObserverCanSeeBody(first,blue[0].id,dead.id),true);
  assert.equal(recordedObserverCanSeeBody(first,blue[1].id,dead.id),false);
  assert.equal(recordedObserverDiscoveredBody(first,blue[0].id,dead.id),true);
  assert.equal(recordedObserverDiscoveredBody(first,blue[1].id,dead.id),false);

  dead.p={x:blue[0].p.x+1000,y:blue[0].p.y+1000};
  s.seconds=.05;rec.capture(s);
  const second=rec.frames.at(-1).knowledge;
  assert.equal(recordedObserverCanSeeBody(second,blue[0].id,dead.id),false);
  assert.equal(recordedObserverDiscoveredBody(second,blue[0].id,dead.id),true);
  const playback=newSession(0,3411);
  applyReplayKnowledge(playback,second);
  const rendered={...dead};
  assert.equal(replayActorDisclosed(playback,rendered,
    {mode:'operator',observerId:blue[0].id}),false,
    'remembering a corpse may not display its changed off-screen location');
});
test('archived discoveries persist and missing legacy evidence remains unknown',()=>{
  const s=newSession(0,3411),rec=new MissionRecorder();
  rec.capture(s,true);s.seconds=.05;rec.capture(s);
  const original=captureReplayArchive(rec,'body-observation',17100);
  assert.ok(replayArchiveIsValid(original));
  const roundtrip=restoreReplayArchive(original);
  assert.deepEqual(roundtrip.frames[0].knowledge,
    rec.frames[0].knowledge);
  const legacy=structuredClone(original);
  for(const frame of legacy.frames){
    delete frame.knowledge.operatorVisibleBodyIds;
    delete frame.knowledge.operatorDiscoveredBodyIds;
  }
  assert.ok(replayArchiveIsValid(legacy));
  assert.equal(recordedObserverCanSeeBody(legacy.frames[0].knowledge,
    'rook','red'),null);
  assert.equal(recordedObserverDiscoveredBody(legacy.frames[0].knowledge,
    'rook','red'),null);
  const bad=structuredClone(original);
  bad.frames[0].knowledge.operatorDiscoveredBodyIds={rook:['invalid id!']};
  assert.equal(replayArchiveIsValid(bad),false);
  bad.frames[0].knowledge.operatorVisibleBodyIds={rook:'all'};
  assert.equal(replayArchiveIsValid(bad),false);
});
