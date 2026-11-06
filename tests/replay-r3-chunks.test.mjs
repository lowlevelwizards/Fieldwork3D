import test from 'node:test';
import assert from 'node:assert/strict';
import {ReplayFrameChunkIndex,replaySharingFootprint,REPLAY_CHUNK_FRAMES}
  from '../src/breach-replay-chunks.ts';
import {newSession} from '../src/breach-game.ts';
import {MissionRecorder} from '../src/breach-replay.ts';
test('index locates correct samples across chunk boundaries without copying frames',()=>{
  const frames=Array.from({length:851},(_,i)=>({t:i*.05,i}));
  const index=new ReplayFrameChunkIndex(frames);
  assert.equal(REPLAY_CHUNK_FRAMES,400);
  assert.equal(index.chunks.length,3);
  assert.deepEqual(index.chunks.map(c=>c.first),[0,400,800]);
  assert.equal(index.atIndex(400),frames[400]);
  assert.equal(index.surrounding(19.975)?.previous.i,399);
  assert.equal(index.surrounding(19.975)?.next.i,400);
  assert.equal(index.surrounding(42.5)?.next.i,850);
  assert.equal(index.surrounding(-1)?.previous.i,0);
  assert.equal(index.surrounding(100)?.previous.i,850);
});
test('indexed seeking agrees with existing MissionRecorder at boundary times',()=>{
  const s=newSession(0,117),rec=new MissionRecorder();
  for(let i=0;i<45;i++){
    s.seconds=i*.05;rec.capture(s,true);
  }
  const index=new ReplayFrameChunkIndex(rec.frames,20);
  for(const t of [0,.02,.97,1,1.01,1.99,2.2]){
    const indexed=index.surrounding(t),legacy=rec.surrounding(t);
    assert.equal(indexed.previous.t,legacy.previous.t);
    assert.equal(indexed.next.t,legacy.next.t);
    assert.ok(Math.abs(indexed.alpha-legacy.alpha)<1e-8);
  }
});
test('reference diagnostics distinguish shared objects without estimating bytes',()=>{
  const sameDoors=[],firstActors=[],secondActors=[];
  const f=replaySharingFootprint([
    {actors:firstActors,doors:sameDoors},
    {actors:firstActors,doors:sameDoors},
    {actors:secondActors,doors:sameDoors}
  ]);
  assert.equal(f.frames,3);
  assert.equal(f.uniqueActorArrays,2);
  assert.equal(f.uniqueWorldArrays,1);
  assert.equal(f.worldArrayReuse,2);
});
