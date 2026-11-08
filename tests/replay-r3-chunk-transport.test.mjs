import test from 'node:test';
import assert from 'node:assert/strict';
import {ReplayFrameChunkIndex,ReplayChunkWindow}
  from '../src/breach-replay-chunks.ts';
import {ReplayChunkTransport}
  from '../src/breach-replay-chunk-transport.ts';

const fixture=(count=12)=>{
  const film=Array.from({length:count},(_,i)=>({
    t:i*.1,actors:[],doors:[]
  }));
  const index=new ReplayFrameChunkIndex(film,3);
  const read=new ReplayChunkWindow(index.chunks,async i=>{
    const b=index.chunks[i];
    return film.slice(b.first,b.endExclusive);
  },{maxFramesPerChunk:3,maxResidentChunks:2});
  const summary={boundaries:index.chunks,frameCount:count,
    sidecar:{completeness:{complete:false,truncatedAt:2,
      reason:'memory frame limit'}}};
  return {film,index,read,summary,
    transport:new ReplayChunkTransport({summary,window:read})};
};

test('G4a seeks and reverses across chunk seams without loading the film',async()=>{
  const f=fixture();
  const t=f.transport;
  assert.equal(t.status,'idle');
  assert.equal(t.recordingComplete,false);
  assert.equal(t.truncationReason,'memory frame limit');
  assert.equal(t.current,null);
  const r=await t.seek(.25);
  assert.equal(r.status,'ready');
  assert.ok(Math.abs(r.sample.previous.t-.2)<1e-8);
  assert.ok(Math.abs(r.sample.next.t-.3)<1e-8);
  assert.ok(Math.abs(r.sample.alpha-.5)<1e-8);
  assert.equal(t.presentationTime,.25);
  assert.ok(t.residentChunks<=2);
  const forward=await t.advance(.9);
  assert.equal(forward.status,'ready');
  assert.equal(t.requestedTime,1.1);
  assert.ok(t.residentChunks<=2);
  const back=await t.advance(.35,-2);
  assert.equal(back.status,'ready');
  assert.ok(Math.abs(t.presentationTime-.4)<1e-8);
  assert.ok(t.residentChunks<=2);
  assert.equal((await t.seek(100)).status,'ready');
  assert.ok(Math.abs(t.presentationTime-1.1)<1e-8);
  assert.equal((await t.seek(-99)).status,'ready');
  assert.equal(t.presentationTime,0);
});
test('G4a ignores late results and never rewinds after a newer seek',async()=>{
  const film=Array.from({length:6},(_,i)=>({
    t:i*.1,actors:[],doors:[]
  }));
  const index=new ReplayFrameChunkIndex(film,3),pending=new Map();
  const window=new ReplayChunkWindow(index.chunks,i=>
    new Promise(resolve=>pending.set(i,resolve)),
    {maxFramesPerChunk:3,maxResidentChunks:2});
  const t=new ReplayChunkTransport({window,summary:{
    boundaries:index.chunks,sidecar:{completeness:{
      complete:true,truncatedAt:null,reason:null}}
  }});
  const earlier=t.seek(.1),later=t.seek(.4);
  for(let i=0;i<6&&pending.size<2;i++)await Promise.resolve();
  assert.equal(pending.size,2);
  pending.get(1)(film.slice(3));
  const current=await later;
  assert.equal(current.status,'ready');
  assert.equal(t.presentationTime,.4);
  pending.get(0)(film.slice(0,3));
  assert.equal((await earlier).status,'superseded');
  assert.equal(t.presentationTime,.4);
  assert.equal(t.current.t,.4);
  const next=t.seek(.45);
  t.close();
  assert.equal((await next).status,'closed');
  assert.equal(t.current,null);
  assert.equal(t.status,'closed');
  assert.equal((await t.seek(.1)).status,'closed');
});
test('G4a fails closed on corrupt chunks and rejects unsafe clock inputs',async()=>{
  const f=fixture();
  const t=f.transport;
  await assert.rejects(t.seek(NaN),/Nonfinite/);
  await assert.rejects(t.advance(-1),/unbounded/);
  await assert.rejects(t.advance(1,9),/unbounded/);
  const broken=new ReplayChunkWindow(f.index.chunks,async i=>
    i===1?[]:f.film.slice(f.index.chunks[i].first,
      f.index.chunks[i].endExclusive),
    {maxFramesPerChunk:3});
  const b=new ReplayChunkTransport({summary:f.summary,window:broken});
  await b.seek(.1);
  assert.equal(b.status,'ready');
  await assert.rejects(b.seek(.4),/missing or incomplete/);
  assert.equal(b.status,'error');
  assert.equal(b.current,null);
});

test('G5a 12k-frame random-access stress stays within three decoded chunks',async()=>{
  // Host structural stress only; intentionally not an iPhone FPS claim.
  // The underlying synthetic source demonstrates correctness and residency,
  // not yet an incremental recorder or real-world replay disk footprint.
  const count=12000,film=Array.from({length:count},(_,i)=>({
    t:i*.05,actors:[{sampleIndex:i}],doors:[]
  }));
  const index=new ReplayFrameChunkIndex(film,400),loads=[];
  const cache=new ReplayChunkWindow(index.chunks,async i=>{
    loads.push(i);
    const b=index.chunks[i];
    return film.slice(b.first,b.endExclusive);
  },{maxFramesPerChunk:400,maxResidentChunks:3});
  const view=new ReplayChunkTransport({window:cache,summary:{
    boundaries:index.chunks,sidecar:{completeness:{
      complete:true,truncatedAt:null,reason:null
    }}
  }});
  assert.equal(index.chunks.length,30);
  for(let turn=0;turn<310;turn++){
    // Full-length, nonmonotonic seeks to force real cache evictions.
    const i=(turn*6173+173)%11999;
    const time=(i+.43)*.05;
    const result=await view.seek(time);
    assert.equal(result.status,'ready');
    assert.equal(result.sample.previous.actors[0].sampleIndex,i);
    assert.equal(result.sample.next.actors[0].sampleIndex,i+1);
    assert.ok(cache.residentCount<=3,
      'Replay cache exceeded bounded resident chunk budget');
    assert.ok(cache.residentIndices.every(n=>n>=0&&n<30));
  }
  assert.ok(loads.length<=310*2,
    'Each seek must touch at most its two adjacent historical chunks');
  assert.ok(loads.length>25,'Stress should exercise actual cache eviction');
  assert.equal(view.status,'ready');
  view.close();
  assert.equal(view.residentChunks<=3,true);
});
