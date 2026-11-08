import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession} from '../src/breach-game.ts';
import {MissionRecorder,applyReplayFrame}
  from '../src/breach-replay.ts';
import {ReplayFrameChunkIndex,ReplayChunkWindow}
  from '../src/breach-replay-chunks.ts';
import {sampleReplaySpan}
  from '../src/breach-replay-frame-sampling.ts';
import {ReplayMotionRecorder}
  from '../src/breach-replay-motion.ts';

test('G4c1 shared sampling exactly equals V1 throughout authoritative film',async()=>{
  const s=newSession(0,2711),rec=new MissionRecorder();
  const rook=s.operators.find(a=>a.id==='rook');
  assert.ok(rook);
  for(let i=0;i<70;i++){
    s.seconds=i*.05;rook.p={x:rook.p.x+.13,y:rook.p.y+.11};
    rook.heading=i*.016;rook.velocity=21+i*.05;
    rook.weaponYaw=i*.021;
    rec.capture(s,true);
  }
  const chunkIndex=new ReplayFrameChunkIndex(rec.frames,9);
  const window=new ReplayChunkWindow(chunkIndex.chunks,async i=>{
    const b=chunkIndex.chunks[i];
    return rec.frames.slice(b.first,b.endExclusive);
  },{maxFramesPerChunk:9,maxResidentChunks:3});
  const motion=new ReplayMotionRecorder();
  motion.loadArchive(rec.motion.toArchive());
  for(let t=0;t<3.45;t+=.037){
    const original=rec.sample(t);
    const span=await window.surrounding(t);
    const chunked=sampleReplaySpan(span,motion);
    assert.deepEqual(chunked,original,
      'V2 render drift at '+t.toFixed(4));
    assert.ok(window.residentCount<=3);
  }
  // Idempotent nonmutating interpolation, including personal knowledge.
  const first=structuredClone(rec.frames[0]);
  const early=await window.surrounding(.025);
  sampleReplaySpan(early,motion);
  assert.deepEqual(rec.frames[0],first);
  assert.equal(rec.frames.length,70);
});
test('G4c1 recorded knowledge survives scene hydration and rewind',()=>{
  const s=newSession(0,39),rec=new MissionRecorder();
  const enemy=s.operators.find(a=>a.side==='red');
  assert.ok(enemy);
  rec.capture(s,true);
  s.seconds=.05;rec.capture(s,true);
  const frame=sampleReplaySpan(rec.surrounding(.01),rec.motion);
  const original=structuredClone(frame.knowledge);
  const scene=newSession(0,39);
  applyReplayFrame(scene,frame);
  assert.equal(scene.seconds,frame.t);
  assert.deepEqual(frame.knowledge,original);
  const last=sampleReplaySpan(rec.surrounding(.05),rec.motion);
  applyReplayFrame(scene,last);
  applyReplayFrame(scene,frame);
  assert.equal(scene.seconds,frame.t);
  assert.deepEqual(frame.knowledge,original);
});
test('G4c1 rejects tampered or impossible interpolation spans',()=>{
  const s=newSession(0,41),rec=new MissionRecorder();
  rec.capture(s,true);s.seconds=.1;rec.capture(s,true);
  const span=rec.surrounding(.05);
  assert.throws(()=>sampleReplaySpan({...span,alpha:1.2},rec.motion),
    /interpolation/);
  assert.throws(()=>sampleReplaySpan({...span,
    previous:span.next,next:span.previous},rec.motion),/nonmonotonic/);
});
