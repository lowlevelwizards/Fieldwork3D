import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession} from '../src/breach-game.ts';
import {MissionRecorder} from '../src/breach-replay.ts';
import {ReplayFrameChunkIndex,ReplayChunkWindow}
  from '../src/breach-replay-chunks.ts';
import {ReplayChunkSceneBridge}
  from '../src/breach-replay-chunk-scene.ts';
import {ReplayChunkPlaybackController}
  from '../src/breach-replay-chunk-controller.ts';

const make=(options={})=>{
  const game=newSession(0,191),rec=new MissionRecorder();
  const actor=game.operators.find(a=>a.id==='rook');
  for(let i=0;i<24;i++){
    game.seconds=i*.05;
    actor.p={x:actor.p.x+.5,y:actor.p.y+.25};
    actor.heading=i*.02;
    rec.capture(game,true);
  }
  const index=new ReplayFrameChunkIndex(rec.frames,5);
  const chunks=new ReplayChunkWindow(index.chunks,async i=>{
    if(options.load)return options.load(i,index,rec.frames);
    const b=index.chunks[i];
    return rec.frames.slice(b.first,b.endExclusive);
  },{maxFramesPerChunk:5,maxResidentChunks:2});
  const summary={id:'g4d',generation:'g4d',boundaries:index.chunks,
    chunkFrames:5,frameCount:24,publishedAt:1,storageComplete:true,
    sidecar:{manifest:rec.manifest,motion:rec.motion.toArchive(),
      shots:[],battleEvents:[],executionEvents:[],completeness:{
        complete:options.complete??true,truncatedAt:null,
        reason:null}}};
  const bridge=new ReplayChunkSceneBridge({summary,window:chunks});
  const screen=newSession(0,191);
  const controller=new ReplayChunkPlaybackController(bridge,screen);
  return {controller,screen,rec,chunks,bridge,index};
};
test('G4d1 playback clock advances only after chunk and scene commits',async()=>{
  const {controller,screen,rec,chunks}=make();
  assert.equal(controller.status,'idle');
  assert.equal(controller.play(),false);
  assert.equal((await controller.seek(.025)).status,'ready');
  assert.equal(controller.time,.025);
  assert.equal(controller.frame.frame.t,.025);
  assert.deepEqual(screen.operators[0].p,rec.sample(.025).actors[0].p);
  controller.setRate(2);
  assert.equal(controller.play(),true);
  const stepped=await controller.tick(.05);
  assert.equal(stepped.status,'ready');
  assert.ok(Math.abs(controller.time-.125)<1e-8);
  assert.deepEqual(stepped.candidateSounds,[]);
  assert.deepEqual(screen.operators[0].p,rec.sample(.125).actors[0].p);
  assert.ok(chunks.residentCount<=2);
  controller.pause();
  assert.equal(controller.status,'paused');
  assert.equal((await controller.tick(1)).status,'idle');
  assert.ok(Math.abs(controller.time-.125)<1e-8);
  const scrub=await controller.seek(.2);
  assert.equal(scrub.status,'ready');
  assert.deepEqual(scrub.candidateSounds,[]);
  assert.equal(controller.play(),true);
  await controller.tick(1);
  assert.ok(controller.time<=.5+1e-9,
    'A huge tab-resume delta must not fast-forward beyond the bounded step');
  assert.throws(()=>controller.setRate(10),/speed/);
  controller.close();
  assert.equal(controller.frame,null);
  assert.equal((await controller.tick(.01)).status,'closed');
});
test('G4d1 latest seek wins; interrupted seek never overwrites newer view',async()=>{
  let release;
  const gate=new Promise(resolve=>release=resolve);
  const {controller,screen,rec}=make({load:async(i,index,frames)=>{
    if(i===0)await gate;
    const b=index.chunks[i];
    return frames.slice(b.first,b.endExclusive);
  }});
  const first=controller.seek(.05);
  const later=controller.seek(.75);
  assert.equal((await later).status,'ready');
  assert.equal(controller.time,.75);
  const before=screen.operators[0].p;
  release();
  assert.equal((await first).status,'superseded');
  assert.equal(controller.time,.75);
  assert.deepEqual(screen.operators[0].p,before);
  assert.deepEqual(screen.operators[0].p,rec.sample(.75).actors[0].p);
  controller.close();
});
test('G4d1 pause while buffering cannot leak a future scene; restart resyncs',async()=>{
  let release,delay=true;
  const gate=new Promise(resolve=>release=resolve);
  const {controller,screen,rec}=make({load:async(i,index,frames)=>{
    if(i===1&&delay)await gate;
    const b=index.chunks[i];
    return frames.slice(b.first,b.endExclusive);
  }});
  await controller.seek(.19);
  controller.setRate(1);
  controller.play();
  const moving=controller.tick(.12); // crosses chunk 0->1
  assert.equal(controller.status,'buffering');
  assert.equal((await controller.tick(.12)).status,'buffering');
  controller.pause();
  assert.equal(controller.time,.19);
  assert.equal(controller.status,'paused');
  delay=false;release();
  assert.equal((await moving).status,'superseded');
  assert.equal(controller.time,.19);
  assert.deepEqual(screen.operators[0].p,rec.sample(.19).actors[0].p);
  controller.play();
  const next=await controller.tick(.03);
  assert.equal(next.status,'ready');
  assert.ok(Math.abs(controller.time-.22)<1e-8);
  assert.deepEqual(screen.operators[0].p,rec.sample(.22).actors[0].p);
  controller.close();
});
test('G4d1 corrupt chunk fails closed and does not advance displayed time',async()=>{
  const {controller,screen}=make({load:async(i,index,frames)=>{
    if(i===2)throw Error('Disk chunk missing');
    const b=index.chunks[i];
    return frames.slice(b.first,b.endExclusive);
  }});
  await controller.seek(.15);
  const oldPosition={...screen.operators[0].p};
  await assert.rejects(controller.seek(.57),/Disk chunk missing/);
  assert.equal(controller.status,'error');
  assert.equal(controller.frame,null);
  assert.match(controller.errorMessage,/Disk chunk missing/);
  assert.deepEqual(screen.operators[0].p,oldPosition);
  assert.equal(controller.play(),false);
  controller.close();
});
test('G4d1 explicit closure while read pending suppresses late scene mutation',async()=>{
  let release;
  const gate=new Promise(r=>release=r);
  const {controller,screen}=make({load:async(i,index,frames)=>{
    await gate;
    const b=index.chunks[i];
    return frames.slice(b.first,b.endExclusive);
  }});
  const request=controller.seek(.5);
  const before=screen.seconds;
  controller.close();release();
  assert.ok(['closed','superseded'].includes((await request).status));
  assert.equal(controller.status,'closed');
  assert.equal(screen.seconds,before);
});
test('G4d1 incomplete archive is visibly identified but not hidden',async()=>{
  const {controller}=make({complete:false});
  await controller.seek(0);
  assert.equal(controller.recordingComplete,false);
  assert.equal(controller.disclosureLabel,'PARTIAL RECORDED FILM');
  controller.close();
});
