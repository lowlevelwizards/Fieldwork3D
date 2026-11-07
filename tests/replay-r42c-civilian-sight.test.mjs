import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession,observerPointVisible} from '../src/breach-game.ts';
import {captureReplayKnowledge,recordedObserverCanSeeCivilian}
  from '../src/breach-replay-visibility.ts';
import {MissionRecorder} from '../src/breach-replay.ts';
import {captureReplayArchive,replayArchiveIsValid,restoreReplayArchive}
  from '../src/breach-replay-archive.ts';

test('operator civilian sight cannot inherit the full-view/team shortcut',()=>{
  const s=newSession(0,3411);
  const blue=s.operators.filter(a=>a.side==='blue');
  assert.ok(blue.length>=2);
  blue[0].heading=0;blue[1].p={x:blue[0].p.x+900,y:blue[0].p.y+900};
  const civ={id:'civil-evidence',p:{...blue[0].p}};
  s.civilians.push(civ);
  s.intel.mode='full-view';
  assert.equal(observerPointVisible(s,blue[0],civ.p),true);
  assert.equal(observerPointVisible(s,blue[1],civ.p),false);
  const snap=captureReplayKnowledge(s);
  assert.equal(snap.visibleCivilianIds.includes(civ.id),true);
  assert.equal(recordedObserverCanSeeCivilian(snap,blue[0].id,civ.id),true);
  assert.equal(recordedObserverCanSeeCivilian(snap,blue[1].id,civ.id),false);
  assert.equal(recordedObserverCanSeeCivilian(snap,'not-an-operator',civ.id),null);
});
test('legacy civilian knowledge stays unknown rather than known/hidden',()=>{
  const old={visibleActorIds:[],visibleCivilianIds:['c1'],
    discoveredBodyIds:[]};
  assert.equal(recordedObserverCanSeeCivilian(old,'rook','c1'),null);
  assert.equal(recordedObserverCanSeeCivilian(null,'rook','c1'),null);
});
test('optional individual civilian evidence survives archive and rejects bad input',()=>{
  const s=newSession(0,3411),rec=new MissionRecorder();
  rec.capture(s,true);s.seconds=.05;rec.capture(s);
  const archive=captureReplayArchive(rec,'civilian-observer',17200);
  assert.equal(replayArchiveIsValid(archive),true);
  assert.deepEqual(restoreReplayArchive(archive).frames[0].knowledge,
    archive.frames[0].knowledge);
  const legacy=structuredClone(archive);
  for(const frame of legacy.frames)
    delete frame.knowledge.operatorVisibleCivilianIds;
  assert.equal(replayArchiveIsValid(legacy),true);
  const bad=structuredClone(archive);
  bad.frames[0].knowledge.operatorVisibleCivilianIds={rook:'unknown-all'};
  assert.equal(replayArchiveIsValid(bad),false);
  bad.frames[0].knowledge.operatorVisibleCivilianIds={
    rook:['invalid civilian identifier !']};
  assert.equal(replayArchiveIsValid(bad),false);
});
