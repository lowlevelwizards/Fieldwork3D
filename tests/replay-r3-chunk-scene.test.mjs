import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession} from '../src/breach-game.ts';
import {MissionRecorder}
  from '../src/breach-replay.ts';
import {ReplayFrameChunkIndex,ReplayChunkWindow}
  from '../src/breach-replay-chunks.ts';
import {ReplayChunkSceneBridge}
  from '../src/breach-replay-chunk-scene.ts';

const makeScene=()=>{
  const game=newSession(0,498),rec=new MissionRecorder();
  const rook=game.operators.find(a=>a.id==='rook');
  for(let i=0;i<62;i++){
    game.seconds=i*.05;
    rook.p={x:rook.p.x+.3,y:rook.p.y+.17};
    rook.heading=i*.015;
    rec.capture(game,true);
  }
  const index=new ReplayFrameChunkIndex(rec.frames,10);
  const window=new ReplayChunkWindow(index.chunks,async i=>{
    const b=index.chunks[i];
    return rec.frames.slice(b.first,b.endExclusive);
  },{maxFramesPerChunk:10,maxResidentChunks:2});
  const archive={
    id:'qa',generation:'qa-gen',frameCount:rec.frames.length,
    boundaries:index.chunks,chunkFrames:10,publishedAt:10,
    storageComplete:true,
    sidecar:{motion:rec.motion.toArchive(),
      completeness:{...rec.completeness},battleEvents:rec.events,
      executionEvents:rec.executionEvents,
      shots:rec.ballistics.shots,planRevisions:rec.plans.revisions,
      personalGround:rec.personalGround,
      personalDoors:rec.doorKnowledge.observations,
      personalWindows:rec.windowKnowledge.observations}
  };
  return {rec,bridge:new ReplayChunkSceneBridge({
    summary:archive,window
  }),window};
};
test('G4c2 chunk scene faithfully applies authoritatively interpolated motion',async()=>{
  const {rec,bridge,window}=makeScene();
  const display=newSession(0,498);
  for(const at of [.015,.45,1.1,2.7,.3,2.99]){
    const result=await bridge.seek(at);
    assert.equal(result.status,'ready');
    assert.deepEqual(result.value.frame,rec.sample(at));
    bridge.applyToReplaySession(display,result.value);
    const actor=display.operators.find(a=>a.id==='rook');
    const reference=rec.sample(at).actors.find(a=>a.id==='rook');
    assert.deepEqual(actor.p,reference.p);
    assert.equal(display.seconds,result.value.frame.t);
    assert.deepEqual(result.value.frame.knowledge,rec.sample(at).knowledge);
    assert.ok(window.residentCount<=2);
  }
  assert.ok(Array.isArray(bridge.replaySidecar.personalWindows));
  assert.ok(Array.isArray(bridge.replaySidecar.shots));
  assert.equal(bridge.recordingComplete,true);
  bridge.close();
  assert.equal(bridge.current,null);
});
test('G4c2 never projects an observation without recorded individual evidence',async()=>{
  const {bridge}=makeScene();
  assert.equal(bridge.recordedObserverKnowledge('rook'),null);
  assert.equal((await bridge.seek(.7)).status,'ready');
  const observed=bridge.recordedObserverKnowledge('rook');
  assert.ok(observed?.operatorVisibleActorIds?.rook);
  assert.deepEqual(observed.visibleActorIds,[]);
  assert.deepEqual(observed.visibleCivilianIds,[]);
  assert.deepEqual(observed.discoveredBodyIds,[]);
  assert.deepEqual(Object.keys(observed.operatorVisibleActorIds),['rook']);
  assert.deepEqual(
    Object.keys(observed.operatorVisibleCivilianIds??{}),['rook']);
  assert.equal(observed.operatorVisibleActorIds.moss,undefined);
  assert.notEqual(observed,bridge.current.frame.knowledge,
    'Personal evidence is a restricted projection, never raw team intel');
  assert.equal(bridge.recordedObserverKnowledge('not-a-real-observer'),null);
  bridge.close();
});
test('G4c2 rejects stale display calls on rewind or close',async()=>{
  const {bridge}=makeScene();
  const display=newSession(0,498);
  const older=await bridge.seek(.2);
  const newer=await bridge.seek(1.2);
  assert.equal(newer.status,'ready');
  assert.throws(()=>bridge.applyToReplaySession(display,older.value),
    /stale|unverified/);
  bridge.applyToReplaySession(display,newer.value);
  bridge.close();
  assert.throws(()=>bridge.applyToReplaySession(display,newer.value),
    /stale|unverified/);
});

test('G4c4 forward-only audio candidates retain history without hit disclosure',async()=>{
  const {bridge}=makeScene();
  const initial=await bridge.seek(.0);
  assert.equal(initial.status,'ready');
  const sound=await bridge.advance(.15);
  assert.equal(sound.status,'ready');
  assert.deepEqual(sound.candidateSounds,[]);
  const afterSeek=await bridge.seek(1.0);
  assert.equal(afterSeek.status,'ready');
  const reverse=await bridge.advance(.25,-1);
  assert.equal(reverse.status,'ready');
  assert.deepEqual(reverse.candidateSounds,[]);
  assert.throws(()=>bridge.disclosedEventIndex(null),/disclosure/);
  assert.ok(bridge.disclosedEventIndex(()=>false).all.length===0);
  bridge.close();
});
test('G4c4 a real recorded shot only queues during continuous forward play',async()=>{
  const game=newSession(0,91),rec=new MissionRecorder();
  for(let i=0;i<6;i++){
    game.seconds=i*.05;rec.capture(game,true);
  }
  const index=new ReplayFrameChunkIndex(rec.frames,2);
  const archive={
    boundaries:index.chunks,
    sidecar:{completeness:{complete:true},
      motion:rec.motion.toArchive(),
      shots:[{id:1,recordedAt:.12,shooterId:'rook',
        start:{x:10,y:20},end:{x:20,y:30},
        weaponAtFire:'carbine',hit:true,down:true}],
      battleEvents:[],executionEvents:[]}
  };
  const cache=new ReplayChunkWindow(index.chunks,async i=>{
    const chunk=index.chunks[i];
    return rec.frames.slice(chunk.first,chunk.endExclusive);
  },{maxFramesPerChunk:2});
  const bridge=new ReplayChunkSceneBridge({summary:archive,window:cache});
  const jumped=await bridge.seek(.2);
  assert.equal(jumped.status,'ready');
  assert.equal((await bridge.advance(.05)).candidateSounds.length,0);
  await bridge.seek(.05);
  const forward=await bridge.advance(.1);
  assert.equal(forward.status,'ready');
  assert.equal(forward.candidateSounds.length,1);
  assert.equal(forward.candidateSounds[0].kind,'gunshot');
  assert.equal('hit' in forward.candidateSounds[0],false);
  assert.equal('down' in forward.candidateSounds[0],false);
  assert.equal((await bridge.advance(.1,-1)).candidateSounds.length,0);
  bridge.close();
});
