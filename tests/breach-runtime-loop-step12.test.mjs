import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runtimeFrameMode,createBreachRuntimeLoop}
 from '../src/breach-runtime-loop.ts';
import {fixedStepBudget,FIXED_DT} from '../src/breach-fixed-clock.ts';

const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('frame dispatch isolates menu, generation, live, idle and replay modes',()=>{
 const mode=(m,phase,extras={})=>runtimeFrameMode({
   mode:m,phase,quickPlayBusy:false,replaying:false,...extras});
 assert.equal(mode('menu','planning'),'suspended');
 assert.equal(mode('home','running'),'suspended');
 assert.equal(mode('quick','planning'),'idle');
 assert.equal(mode('quick','won'),'idle');
 assert.equal(mode('mission','running'),'live');
 assert.equal(mode('quick','running'),'live');
 assert.equal(mode('home','running',{replaying:true}),'replay');
 assert.equal(mode('quick','running',{replaying:true}),'replay');
 assert.equal(mode('quick','running',{quickPlayBusy:true}),'suspended');
 assert.equal(mode('menu','planning',{quickPlayBusy:true,replaying:true}),'suspended');
});

test('frame mode does not alter the 60 Hz bounded step budget',()=>{
 let carry=0,steps=0;
 for(let i=0;i<180;i++){
   const b=fixedStepBudget(carry,1/30);steps+=b.steps;carry=b.remaining;
 }
 assert.equal(steps,360);
 assert.ok(carry<FIXED_DT);
 assert.equal(fixedStepBudget(.18,.20).steps,3);
});

test('runtime remains sole RAF owner; suspension skips rendering, replay advances film',()=>{
 const saved={
   document:globalThis.document,location:globalThis.location,
   requestAnimationFrame:globalThis.requestAnimationFrame};
 const frames=[],events=[];
 let mode='menu',replaying=false,quickBusy=false;
 const state={phase:'planning',operators:[],doors:[],seconds:0};
 const video={active:false};
 const playback={playing:false,time:0,rate:1,advanceAndApply(){
   events.push('replay-advance');
   return {previousTime:0,time:.1,frame:{presentation:{sample:true}},
    resetAudio:false,finishedIncident:false,trimmedSeconds:0};
 }};
 const recorder={duration:1,frames:[],motion:{stepEventCount:0,
   presentation(){return null;}}};
 let presentation=null;
 try{
   globalThis.document={body:{append(){}},createElement:()=>({})};
   globalThis.location={search:''};
   globalThis.requestAnimationFrame=cb=>{frames.push(cb);return frames.length;};
   const runtime=createBreachRuntimeLoop({
     getSession:()=>state,getRecorder:()=>recorder,getMode:()=>mode,
     isReplaying:()=>replaying,isQuickPlayBusy:()=>quickBusy,
     getSelected:()=> 'rook',getSelectedActor:()=>undefined,
     getDoorFocusId:()=>null,getStage:()=>null,getViewMode:()=> 'plan2d',
     isMissionTerminal:()=>false,isStudioVisible:()=>false,
     getReplayPresentation:()=>presentation,
     setReplayPresentation:value=>{presentation=value;events.push('presentation');},
     invalidateFog:()=>events.push('fog'),
     advanceReplayCamera:()=>events.push('replay-camera'),
     updateHud:()=>events.push('hud'),
     updateReplayHud:()=>events.push('replay-hud'),
     updateContext:()=>events.push('context'),
     advanceContextPalette:()=>events.push('palette'),
     renderFrame:()=>events.push('render'),
     drawTacticalFrameFeedback:()=>events.push('feedback'),
     worldToScreen:p=>p,canvas:{},
     playback,camera:{mode:'free',director:{tempoEdits:[]}},
     knowledge:{},bodycam:{active:false},video,
     audio:{consumeLiveFrame:()=>events.push('audio-live'),
      playReplayBetween:()=>events.push('audio-replay'),
      stopReplaySounds:()=>events.push('audio-reset')}
   });
   runtime.start();runtime.start();
   assert.equal(frames.length,1,'start must never schedule a duplicate RAF');
   frames.shift()(performance.now()+16);
   assert.deepEqual(events,[],'menu cannot render or update live/replay systems');
   mode='quick';
   frames.shift()(performance.now()+33);
   assert.ok(events.includes('audio-live'));
   assert.ok(events.includes('render'));
   assert.ok(events.includes('feedback'));
   events.length=0;
   replaying=true;playback.playing=true;
   frames.shift()(performance.now()+50);
   assert.equal(presentation.sample,true);
   assert.ok(events.includes('replay-advance'));
   assert.ok(events.includes('fog'));
   assert.ok(events.includes('audio-replay'));
   assert.ok(events.includes('replay-camera'));
   assert.ok(events.indexOf('replay-advance')<events.indexOf('render'));
   runtime.stop();
   const pending=frames.shift();
   pending?.(performance.now()+66);
   assert.equal(frames.length,0,'stopped RAF may not queue another frame');
 }finally{
   for(const key of Object.keys(saved)){
     if(saved[key]===undefined)delete globalThis[key];
     else globalThis[key]=saved[key];
   }
 }
});

test('runtime owns only scheduling; recorded film and interpolation retain authority',()=>{
 const runtime=source('src/breach-runtime-loop.ts');
 const main=source('src/breach-main.ts');
 assert.match(runtime,/fixedStepBudget\(accum,dt\)/);
 assert.match(runtime,/stepSession\(state,1\/60/);
 assert.match(runtime,/recorder\.capture\(state,config\.isMissionTerminal\(state\)\)/);
 assert.match(runtime,/renderSnapshot\(state\.operators\)/);
 assert.match(runtime,/previousDoors:previousRenderDoors\?\?undefined/);
 assert.match(runtime,/alpha:Math\.min\(1,accum\*60\)/);
 assert.match(runtime,/replayPlayback\.advanceAndApply\(dt,recorder,state/);
 assert.match(runtime,/replayQuickVideo\.drawFrame\(/);
 assert.match(runtime,/stage\.setMiniatureFocusContext\(replaying,dt\)/);
 assert.match(runtime,/config\.drawTacticalFrameFeedback\(studioOccludesTactical\)/);
 assert.match(main,/function drawTacticalFrameFeedback\(/);
 assert.match(main,/runtimeLoop\.resetPresentation\(\)/);
 assert.match(main,/runtimeLoop\.start\(\)/);
 assert.doesNotMatch(main,/requestAnimationFrame\(tick\)|stepSession\(state,1\/60/);
 assert.doesNotMatch(runtime,/planMove\(|planDoorFlash\(|newSession\(/);
});
