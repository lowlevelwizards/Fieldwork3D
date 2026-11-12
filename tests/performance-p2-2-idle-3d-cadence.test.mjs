import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {shouldSubmitIdle3D,IDLE_3D_TARGET_FRAME_MS}
 from '../src/rendering/breach-idle-3d-cadence.ts';
import {createBreachRuntimeLoop}
 from '../src/breach-runtime-loop.ts';
import {parseBreachBootConfig}
 from '../src/breach-boot-config.ts';

const baseline={
 enabled:true,mode:'idle',viewMode:'iso',studioOccludes:false,
 now:1000,lastSceneAt:983,lastSceneMode:'idle',
 sameSession:true,lastInputAt:-Infinity
};
test('P2.2 30fps idle submit opt-in is immutable for active, replay and input',()=>{
 assert.ok(IDLE_3D_TARGET_FRAME_MS>=32);
 assert.equal(shouldSubmitIdle3D({...baseline,enabled:false}),true);
 for(const mode of ['live','replay','suspended'])
  assert.equal(shouldSubmitIdle3D({...baseline,mode}),true,mode);
 assert.equal(shouldSubmitIdle3D({...baseline,viewMode:'plan2d'}),true);
 assert.equal(shouldSubmitIdle3D({...baseline,studioOccludes:true}),true);
 assert.equal(shouldSubmitIdle3D({...baseline,sameSession:false}),true);
 assert.equal(shouldSubmitIdle3D({...baseline,lastSceneMode:'live'}),true);
 assert.equal(shouldSubmitIdle3D({...baseline,lastSceneAt:-Infinity}),true);
 assert.equal(shouldSubmitIdle3D(baseline),false);
 assert.equal(shouldSubmitIdle3D({...baseline,lastSceneAt:965}),true);
 assert.equal(shouldSubmitIdle3D({...baseline,lastInputAt:500}),true);
 assert.equal(shouldSubmitIdle3D({...baseline,lastInputAt:199}),false);
});
test('P2.2 tactical RAF, UI and camera responsiveness survive skipped idle 3D',()=>{
 const saved={document:globalThis.document,location:globalThis.location,
  window:globalThis.window,requestAnimationFrame:globalThis.requestAnimationFrame};
 const frames=[],events=[],inputs=new Map(),sceneDeltas=[];
 const session={phase:'planning',operators:[],doors:[],seconds:0};
 const stage={setMiniatureFocusContext(){events.push('focus');},
  update(_s,_selected,dt){events.push('3d');sceneDeltas.push(dt);}};
 const recorder={duration:1,frames:[],motion:{stepEventCount:0,
  presentation(){return null;}}};
 const before=performance.now(),base=before+10;
 let runtime;
 try{
  globalThis.document={body:{append(){}},createElement:()=>({})};
  globalThis.location={search:'?idle3d=30'};
  globalThis.window={addEventListener:(event,callback)=>inputs.set(event,callback)};
  globalThis.requestAnimationFrame=cb=>{frames.push(cb);return frames.length;};
  runtime=createBreachRuntimeLoop({
   boot:parseBreachBootConfig('?idle3d=30'),
   getSession:()=>session,getRecorder:()=>recorder,getMode:()=> 'quick',
   isReplaying:()=>false,isQuickPlayBusy:()=>false,
   getSelected:()=> 'rook',getSelectedActor:()=>undefined,
   getDoorFocusId:()=>null,getStage:()=>stage,getViewMode:()=> 'iso',
   isMissionTerminal:()=>false,isStudioVisible:()=>false,
   getReplayPresentation:()=>null,setReplayPresentation:()=>{},
   invalidateFog:()=>{},advanceReplayCamera:()=>{},
   updateHud:()=>events.push('hud'),updateReplayHud:()=>{},
   updateContext:()=>events.push('context'),
   advanceContextPalette:()=>events.push('palette'),
   renderFrame:()=>events.push('overlay'),
   drawTacticalFrameFeedback:()=>events.push('feedback'),
   worldToScreen:p=>p,canvas:{},
   playback:{playing:false,time:0,rate:1},
   camera:{mode:'free',director:{tempoEdits:[]}},
   knowledge:{},bodycam:{active:false},video:{active:false},
   audio:{consumeLiveFrame:()=>events.push('audio'),
    playReplayBetween:()=>{},stopReplaySounds:()=>{}}
  });
  runtime.start();
  frames.shift()(base);
  frames.shift()(base+17);
  frames.shift()(base+34);
  assert.equal(events.filter(x=>x==='3d').length,2,
   'only the costly 3D update is skipped');
  assert.equal(events.filter(x=>x==='overlay').length,3,
   'all RAF ticks retain tactical 2D order overlays');
  assert.equal(events.filter(x=>x==='audio').length,3);
  assert.ok(sceneDeltas[1]>.03,'idle presentation clock accumulates skipped dt');
  assert.equal(typeof inputs.get('pointermove'),'function');
  inputs.get('pointermove')();
  frames.shift()(base+51);
  assert.equal(events.filter(x=>x==='3d').length,3,
   'camera/pointer activity bypasses idle 3D throttle immediately');
 }finally{
  runtime?.stop();
  for(const key of Object.keys(saved))
   if(saved[key]===undefined)delete globalThis[key];
   else globalThis[key]=saved[key];
 }
});
test('P2.2 preserves authoritative 60Hz step and avoids stale profiler slices',()=>{
 const code=readFileSync(
  new URL('../src/breach-runtime-loop.ts',import.meta.url),'utf8');
 assert.match(code,/stepSession\(state,1\/60/);
 assert.match(code,/if\(frameMode==='live'\)/);
 assert.match(code,/const updated3d=stageAvailable&&shouldSubmitIdle3D/);
 assert.match(code,/if\(updated3d&&stage\)/);
 assert.match(code,/if\(!studioOccludesTactical\)config\.renderFrame\(dt\)/);
 assert.match(code,/currentSceneCosts=\{\s*\.\.\.\(updated3d\?/);
 assert.match(code,/draws:updated3d\?stats\?\.calls\?\?0:0/);
});
