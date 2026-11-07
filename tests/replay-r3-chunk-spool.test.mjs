import test from 'node:test';
import assert from 'node:assert/strict';
import {ReplayChunkCaptureSpool}
  from '../src/breach-replay-chunk-spool.ts';

test('G5b1 chunks 12000 authoritative frames without per-frame writes',async()=>{
  const writes=[];
  const spool=new ReplayChunkCaptureSpool(async(i,frames,final)=>{
    writes.push({i,length:frames.length,first:frames[0].t,
      last:frames.at(-1).t,final});
  });
  for(let i=0;i<12000;i++){
    assert.equal(spool.append({t:i*.05,actors:[{i}]}),true);
    assert.ok(spool.residentFrames<=spool.maximumResidentFrames);
  }
  const result=await spool.finish();
  assert.equal(writes.length,30);
  assert.equal(writes[0].length,400);
  assert.equal(writes.at(-1).i,29);
  assert.equal(writes.at(-1).final,false);
  assert.equal(result.acceptedFrames,12000);
  assert.equal(result.persistedFrames,12000);
  assert.equal(result.chunks,30);
  assert.equal(result.recordingComplete,true);
  assert.equal(spool.state,'complete');
  assert.throws(()=>spool.append({t:1000}),/after.*seal/);
});

test('G5b1 slow IDB sink applies hard memory backpressure, never drops history',async()=>{
  let release;
  const gate=new Promise(resolve=>release=resolve),writes=[];
  const spool=new ReplayChunkCaptureSpool(async(i,frames,final)=>{
    if(i===0)await gate;
    writes.push({i,length:frames.length,final});
  },{chunkFrames:4,maxQueuedChunks:2});
  for(let i=0;i<11;i++){
    assert.equal(spool.append({t:i*.05,seq:i}),true);
    assert.ok(spool.residentFrames<=spool.maximumResidentFrames);
  }
  assert.equal(spool.append({t:.55,seq:11}),false);
  assert.equal(spool.state,'truncated');
  assert.equal(spool.result.truncationReason,'bounded chunk write backlog');
  assert.equal(spool.result.truncatedAt,.5);
  assert.equal(spool.append({t:.6,seq:12}),false);
  release();
  const result=await spool.finish();
  assert.deepEqual(writes.map(x=>x.length),[4,4,3]);
  assert.deepEqual(writes.map(x=>x.i),[0,1,2]);
  assert.equal(writes.at(-1).final,true);
  assert.equal(result.acceptedFrames,11);
  assert.equal(result.persistedFrames,11);
  assert.equal(result.recordingComplete,false);
});

test('G5b1 transaction failure retains same chunk for explicit retry',async()=>{
  let fail=true;const writes=[];
  const spool=new ReplayChunkCaptureSpool(async(i,frames,final)=>{
    if(i===1&&fail){fail=false;throw Error('QuotaExceededError');}
    writes.push({i,len:frames.length,final});
  },{chunkFrames:4});
  for(let i=0;i<8;i++)assert.equal(spool.append({t:i*.1}),true);
  await assert.rejects(spool.finish(),/QuotaExceededError/);
  assert.equal(spool.state,'failed');
  assert.equal(spool.persistedFrames,4);
  assert.throws(()=>spool.append({t:1}),/after.*seal/);
  assert.equal(spool.retry(),true);
  const result=await spool.finish();
  assert.equal(result.persistedFrames,8);
  assert.deepEqual(writes.map(x=>x.i),[0,1]);
  assert.equal(writes[1].final,false);
  assert.equal(result.recordingComplete,true);
});
