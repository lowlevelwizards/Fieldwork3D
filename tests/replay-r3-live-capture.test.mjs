import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession,toggling,stepSession} from '../src/breach-game.ts';
import {MissionRecorder} from '../src/breach-replay.ts';
import {ReplayChunkCaptureSpool}
  from '../src/breach-replay-chunk-spool.ts';
import {ReplayLiveCaptureTap}
  from '../src/breach-replay-live-capture.ts';

const make=(size=8,options={})=>{
  const written=[];
  const spool=new ReplayChunkCaptureSpool(async(index,frames,final)=>{
    if(options.sink)return options.sink(index,frames,final,written);
    written.push({index,frames,final});
  },{chunkFrames:size,maxQueuedChunks:2});
  const recorder=new MissionRecorder();
  const s=newSession(0,441);
  recorder.capture(s,true);
  const tap=new ReplayLiveCaptureTap(recorder,spool);
  return {s,recorder,tap,spool,written};
};
test('G5c1 observes actual 60 Hz mission motor via 20 Hz capture cadence',async()=>{
  const {s,recorder,tap,written,spool}=make();
  toggling(s);
  for(let n=0;n<180;n++){
    if(s.phase!=='running')s.phase='running';
    stepSession(s,1/60);
    recorder.capture(s);
    if(n%20===0)await new Promise(resolve=>setImmediate(resolve));
  }
  const result=await tap.finish();
  assert.ok(recorder.frames.length>40&&recorder.frames.length<80,
    'Capture should remain approximately 20 Hz, not 60 Hz');
  const stored=written.flatMap(x=>x.frames);
  assert.equal(stored.length,recorder.frames.length);
  assert.deepEqual(stored,recorder.frames,
    'Real motor outcomes must be stored without reconstruction');
  assert.ok(written.every((w,i)=>w.index===i));
  assert.equal(written.at(-1).final,true);
  assert.equal(tap.deliveredNotices,recorder.frames.length-1);
  assert.equal(result.persistedFrames,recorder.frames.length);
  assert.equal(result.sourceComplete,true);
  assert.ok(spool.residentFrames<=spool.maximumResidentFrames);
  assert.equal(tap.status,'complete');
});
test('G5c1 forced same-timestamp correction replaces only the unsealed tail',async()=>{
  const {s,recorder,tap,written}=make(3);
  const first=s.operators.find(a=>a.id==='rook');
  const start=first.p.x;
  first.p={...first.p,x:start+13};
  recorder.capture(s,true);
  assert.equal(tap.pendingTailTime,0);
  assert.equal(recorder.frames.length,1);
  s.seconds=.05;recorder.capture(s,true);
  s.seconds=.1;recorder.capture(s,true);
  const initial=recorder.frames[2].actors.find(a=>a.id==='rook').p.x;
  first.p={...first.p,x:start+27};
  recorder.capture(s,true);
  assert.equal(recorder.frames.length,3);
  assert.ok(recorder.frames[2].actors.find(a=>a.id==='rook').p.x>initial);
  s.seconds=.15;recorder.capture(s,true);
  const result=await tap.finish();
  const stored=written.flatMap(x=>x.frames);
  assert.equal(stored.length,recorder.frames.length);
  assert.deepEqual(stored,recorder.frames);
  assert.equal(result.recordingComplete,true);
  assert.equal(tap.deliveredNotices,5);
});
test('G5c1 late attachment must fail, not hide earlier recording evidence',()=>{
  const s=newSession(0,23),rec=new MissionRecorder();
  rec.capture(s,true);s.seconds=.05;rec.capture(s,true);
  const spool=new ReplayChunkCaptureSpool(async()=>{});
  assert.throws(()=>new ReplayLiveCaptureTap(rec,spool),
    /before second frame/);
});
test('G5c1 storage backpressure is explicitly partial, V1 stays intact',async()=>{
  let release;
  const gate=new Promise(resolve=>release=resolve);
  const {s,recorder,tap,written}=make(3,{
    sink:async(i,frames,final,out)=>{
      if(i===0)await gate;
      out.push({index:i,frames,final});
    }
  });
  for(let i=1;i<15;i++){
    s.seconds=i*.05;recorder.capture(s,true);
  }
  assert.equal(tap.status,'truncated');
  assert.match(tap.fault,/backlog|truncat/);
  release();
  const result=await tap.finish();
  assert.equal(result.recordingComplete,false);
  assert.equal(result.sourceComplete,false);
  assert.ok(recorder.frames.length>result.persistedFrames,
    'Original V1 capture continues even after isolated stream stops');
  assert.equal(written.flatMap(x=>x.frames).length,
    result.persistedFrames);
});
test('G5c1 observer failure cannot crash live tactical recorder',()=>{
  const s=newSession(0,64),rec=new MissionRecorder();
  rec.capture(s,true);
  const stop=rec.observeRecordedFrames(()=>{throw Error('sink broken');});
  s.seconds=.05;
  assert.doesNotThrow(()=>rec.capture(s,true));
  assert.equal(rec.frames.length,2);
  assert.equal(rec.frameCaptureListenerError,'sink broken');
  stop();
});
