import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession} from '../src/breach-game.ts';
import {MissionRecorder} from '../src/breach-replay.ts';
import {ReplayDoorObservationRecorder,ReplayDoorKnowledgeHistory}
  from '../src/breach-replay-door-knowledge.ts';
import {captureReplayArchive,replayArchiveIsValid,restoreReplayArchive}
  from '../src/breach-replay-archive.ts';

test('door state only changes in a named operator history after observation',()=>{
  const s=newSession(0,3411),op=s.operators.filter(a=>a.side==='blue');
  const door=s.doors[0];assert.ok(door&&op.length>=2);
  let visible=true;
  const recorder=new ReplayDoorObservationRecorder();
  const isVisible=(_s,observer,check)=>
    visible&&observer.id===op[0].id&&check.id===door.id;
  recorder.capture(s,isVisible);
  assert.equal(recorder.observations.length,1);
  const initial=recorder.observations[0];
  assert.equal(initial.observerId,op[0].id);
  door.open=true;door.openFraction=1;door.glassShattered=true;
  s.seconds=.14;visible=false;recorder.capture(s,isVisible);
  assert.equal(recorder.observations.length,1,
    'unseen change must not update historical personal door memory');
  s.seconds=.28;visible=true;recorder.capture(s,isVisible);
  assert.equal(recorder.observations.length,2);
  const h=new ReplayDoorKnowledgeHistory(recorder.observations);
  assert.equal(h.at(-1,op[0].id,door.id),null);
  assert.equal(h.at(.20,op[0].id,door.id).openFraction,
    initial.openFraction,'never disclose an unobserved opening');
  assert.equal(h.at(.27,op[0].id,door.id).glassShattered,
    initial.glassShattered);
  assert.equal(h.at(.28,op[0].id,door.id).openFraction,1);
  assert.equal(h.at(.28,op[0].id,door.id).glassShattered,true);
  assert.equal(h.at(.28,op[1].id,door.id),null,
    'squadmates must not receive that observation');
  assert.equal(h.at(.20,op[0].id,door.id).openFraction,initial.openFraction,
    'rewind is authoritative, not last mutable live door state');
});
test('unchanged observations are sparse, not repeated every tick',()=>{
  const s=newSession(0,3411),op=s.operators.find(a=>a.side==='blue');
  const door=s.doors[0],record=new ReplayDoorObservationRecorder();
  const canSee=(_s,observer,d)=>observer.id===op.id&&d.id===door.id;
  for(let i=0;i<30;i++){
    s.seconds=i/20;
    record.capture(s,canSee);
  }
  assert.equal(record.observations.length,1);
});
test('archived door history restores and corrupt optional records fail closed',()=>{
  const s=newSession(0,3411),rec=new MissionRecorder();
  rec.capture(s,true);s.seconds=.05;rec.capture(s);
  const original=captureReplayArchive(rec,'personal-doors',17100);
  assert.ok(replayArchiveIsValid(original));
  assert.deepEqual(restoreReplayArchive(original).doorKnowledge.observations,
    rec.doorKnowledge.observations);
  const legacy=structuredClone(original);delete legacy.personalDoors;
  assert.equal(replayArchiveIsValid(legacy),true);
  const bad=structuredClone(original);
  bad.personalDoors=[{at:.01,observerId:'rook',doorId:'FRONT',
    openFraction:NaN,glassShattered:false,wedged:false,locked:false}];
  assert.equal(replayArchiveIsValid(bad),false);
  bad.personalDoors=[{at:.01,observerId:'rook',doorId:'FRONT',
    openFraction:0,glassShattered:'invalid',wedged:false,locked:false}];
  assert.equal(replayArchiveIsValid(bad),false);
});
