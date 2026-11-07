import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession} from '../src/breach-game.ts';
import {MissionRecorder} from '../src/breach-replay.ts';
import {ReplayFrameChunkIndex,ReplayChunkWindow}
  from '../src/breach-replay-chunks.ts';
import {ReplayChunkDisclosedEventIndex}
  from '../src/breach-replay-chunk-event-index.ts';

const fixture=(options={})=>{
  const game=newSession(0,817),rec=new MissionRecorder();
  const hostile=game.operators.find(a=>a.side==='red');
  assert.ok(hostile);
  for(let i=0;i<20;i++){
    game.seconds=i*.05;rec.capture(game,true);
  }
  for(const frame of rec.frames){
    const knows=frame.t>=.4;
    // Captured frames may share unchanged knowledge object references.
    // Replace immutably; mutating fields in place would retroactively
    // insert the future observation into the earlier history fixture.
    frame.knowledge={
      ...frame.knowledge,
      visibleActorIds:knows?['rook','moss',hostile.id]:['rook','moss'],
      operatorVisibleActorIds:{
        rook:knows?[hostile.id]:[],
        moss:[]
      }
    };
  }
  const battle=[
    {id:1,t:.1,kind:'shot',actor:hostile.id,text:'HIDDEN SHOT'},
    {id:2,t:.6,kind:'shot',actor:hostile.id,text:'SEEN SHOT'},
    {id:3,t:.15,kind:'door',actor:'rook',text:'OWN DOOR'},
    {id:4,t:.2,kind:'door',actor:'moss',text:'TEAMMATE DOOR'},
    {id:5,t:.4,kind:'objective',text:'OBJECTIVE'}
  ];
  const index=new ReplayFrameChunkIndex(rec.frames,5);
  const win=new ReplayChunkWindow(index.chunks,async i=>{
    if(options.load)return options.load(i,index,rec.frames);
    const b=index.chunks[i];
    return rec.frames.slice(b.first,b.endExclusive);
  },{maxFramesPerChunk:5,maxResidentChunks:2});
  const summary={boundaries:index.chunks,
    sidecar:{battleEvents:battle,executionEvents:[]}};
  return {hostile,battle,rec,win,session:{summary,window:win}};
};
test('G4d3 exact event-time evidence prevents future-sight leaks',async()=>{
  const f=fixture();
  const rail=new ReplayChunkDisclosedEventIndex(f.session);
  const me=await rail.build({mode:'operator',observerId:'rook'},
    ['rook','moss']);
  assert.equal(me.status,'ready');
  assert.deepEqual(me.index.all.map(e=>e.text),[
    'OWN DOOR','SEEN SHOT']);
  assert.equal(me.evaluated,5);
  assert.equal(me.disclosed,2);
  assert.equal(rail.current,me.index);
  assert.ok(rail.residentChunks<=2);
  const teammate=await rail.build({mode:'operator',observerId:'moss'},
    ['rook','moss']);
  assert.deepEqual(teammate.index.all.map(e=>e.text),
    ['TEAMMATE DOOR']);
  const squad=await rail.build({mode:'squad'},['rook','moss']);
  assert.deepEqual(squad.index.all.map(e=>e.text),[
    'OWN DOOR','TEAMMATE DOOR','OBJECTIVE','SEEN SHOT']);
  const full=await rail.build({mode:'full'},['rook','moss']);
  assert.equal(full.index.all.length,5);
  rail.close();
  assert.equal(rail.current,null);
});
test('G4d3 late old event rail cannot overwrite a new disclosure policy',async()=>{
  let release;
  const blocked=new Promise(done=>release=done);
  const f=fixture({load:async(i,index,frames)=>{
    if(i===0)await blocked;
    const b=index.chunks[i];
    return frames.slice(b.first,b.endExclusive);
  }});
  const rail=new ReplayChunkDisclosedEventIndex(f.session);
  const first=rail.build({mode:'squad'},['rook','moss']);
  const second=rail.build({mode:'full'},['rook','moss']);
  const full=await second;
  assert.equal(full.status,'ready');
  assert.equal(rail.current.all.length,5);
  release();
  assert.equal((await first).status,'superseded');
  assert.equal(rail.current.all.length,5);
  rail.close();
});
test('G4d3 corrupt chunk aborts atomically and discloses no partial event list',async()=>{
  const f=fixture({load:async(i,index,frames)=>{
    if(i===2)throw Error('Missing encrypted journal');
    const b=index.chunks[i];
    return frames.slice(b.first,b.endExclusive);
  }});
  const rail=new ReplayChunkDisclosedEventIndex(f.session);
  await assert.rejects(rail.build({mode:'operator',observerId:'rook'},
    ['rook','moss']),/Missing encrypted journal/);
  assert.equal(rail.status,'error');
  assert.equal(rail.current,null);
  assert.match(rail.errorMessage,/Missing encrypted journal/);
  rail.close();
});
test('G4d3 malformed event time fails closed even in full disclosure',async()=>{
  const f=fixture();
  f.session.summary.sidecar.battleEvents[0].t=-2;
  const rail=new ReplayChunkDisclosedEventIndex(f.session);
  await assert.rejects(rail.build({mode:'full'},['rook','moss']),
    /outside recorded film bounds/);
  assert.equal(rail.current,null);
  rail.close();
});
