import test from 'node:test';
import assert from 'node:assert/strict';
import {ReplayFrameChunkIndex,ReplayChunkWindow,replaySharingFootprint,REPLAY_CHUNK_FRAMES}
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
  const sameDoors=[],first={id:'rook'},second={id:'moss'};
  const firstActors=[first],secondActors=[first,second];
  const f=replaySharingFootprint([
    {actors:firstActors,doors:sameDoors},
    {actors:firstActors,doors:sameDoors},
    {actors:secondActors,doors:sameDoors}
  ]);
  assert.equal(f.frames,3);
  assert.equal(f.uniqueActorArrays,2);
  assert.equal(f.uniqueWorldArrays,1);
  assert.equal(f.worldArrayReuse,2);
  assert.equal(f.uniqueActorRecords,2);
  assert.equal(f.sharedActorRecords,2);
});

test('read-side replay window loads only needed chunks and interpolates boundaries',async()=>{
  const frames=Array.from({length:11},(_,i)=>({t:i*.1,i}));
  const index=new ReplayFrameChunkIndex(frames,3);
  const reads=[];
  const window=new ReplayChunkWindow(index.chunks,async chunk=>{
    reads.push(chunk);
    const b=index.chunks[chunk];
    return frames.slice(b.first,b.endExclusive);
  },{maxFramesPerChunk:3,maxResidentChunks:2});
  const edge=await window.surrounding(.25);
  assert.equal(edge.previous.i,2);
  assert.equal(edge.next.i,3);
  assert.ok(Math.abs(edge.alpha-.5)<1e-10);
  assert.deepEqual(reads,[0,1]);
  const later=await window.surrounding(.99);
  assert.equal(later.previous.i,9);
  assert.equal(later.next.i,10);
  assert.equal(window.residentCount,2);
  assert.deepEqual(window.residentIndices,[1,3]);
  assert.equal(window.totalFrames,11);
});
test('parallel requests deduplicate loading and a failed read never poisons cache',async()=>{
  const frames=[{t:0},{t:1},{t:2},{t:3}];
  const index=new ReplayFrameChunkIndex(frames,2);
  let calls=0,corrupt=true;
  const window=new ReplayChunkWindow(index.chunks,async i=>{
    calls++;
    if(corrupt&&i===1)return [];
    return frames.slice(i*2,i*2+2);
  },{maxFramesPerChunk:2});
  const pair=await Promise.all([window.surrounding(.2),window.surrounding(.4)]);
  assert.equal(calls,1);
  assert.equal(pair[0].previous.t,0);
  await assert.rejects(window.surrounding(2.1),/missing or incomplete/);
  assert.deepEqual(window.residentIndices,[0]);
  corrupt=false;
  const good=await window.surrounding(2.1);
  assert.equal(good.previous.t,2);
  assert.equal(good.next.t,3);
  assert.equal(calls,3);
});
test('chunk catalog never accepts gaps, overlap, corrupt clocks or unlimited residents',()=>{
  const chunks=[{index:0,first:0,endExclusive:2,fromTime:0,toTime:1}];
  const loader=async()=>[{t:0},{t:1}];
  assert.throws(()=>new ReplayChunkWindow(
    [...chunks,{index:1,first:3,endExclusive:5,fromTime:2,toTime:3}],
    loader),/noncontiguous/);
  assert.throws(()=>new ReplayChunkWindow(
    [{...chunks[0],toTime:-1}],loader),/noncontiguous/);
  assert.throws(()=>new ReplayChunkWindow(chunks,loader,
    {maxResidentChunks:100}),/memory bounds/);
});
