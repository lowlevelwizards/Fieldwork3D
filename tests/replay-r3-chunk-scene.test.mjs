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
