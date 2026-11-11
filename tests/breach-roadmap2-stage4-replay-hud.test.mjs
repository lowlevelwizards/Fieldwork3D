import test from 'node:test';
import assert from 'node:assert/strict';
import {createBreachReplayHudController}
 from '../src/ui/breach-replay-hud-controller.ts';
import {createReplayPresentationOptions}
 from '../src/breach-replay-presentation-options.ts';

/** No browser needed: the extracted HUD consumes existing DOM elements. */
function fakeElement(){
 const listeners=new Map();
 const attrs=new Map();
 const el={
  dataset:{},style:{setProperty(){}},options:[],
  hidden:false,disabled:false,textContent:'',
  title:'',value:'',querySelector(){return fakeElement()},
  querySelectorAll(){return []},
  setAttribute(key,value){attrs.set(key,value)},
  getAttribute(key){return attrs.get(key)},
  replaceChildren(){},
  addEventListener(key,handler){
   if(!listeners.has(key))listeners.set(key,[]);
   listeners.get(key).push(handler);
  },
  fire(key){for(const cb of listeners.get(key)??[])cb()},
  listenerCount(key){return (listeners.get(key)??[]).length}
 };
 return el;
}
function fixture(){
 const ui=new Proxy({},{
  get(target,key){return target[key]??(target[key]=fakeElement())}
 });
 const overlayNames=fakeElement(),overlayPlans=fakeElement();
 overlayNames.dataset.overlayChoice='names';
 overlayPlans.dataset.overlayChoice='plans';
 ui.replayOverlayChoices.querySelectorAll=()=>[overlayNames,overlayPlans];
 ui.replayPlay.dataset.mode='replayPlay'; // initial static DOM icon
 ui.replayPlay.setAttribute('aria-label','Play replay');
 ui.replayQuickCamera.options=[];
 const presentation=createReplayPresentationOptions();
 const state={operators:[
  {id:'rook',name:'Rook',side:'blue',health:100},
  {id:'moss',name:'Moss',side:'blue',health:100}
 ]};
 const playback={time:1.25,playing:false,rate:1,incident:null,
  loopIn:null,loopOut:null,loopEnabled:false,loopRange:()=>null};
 const director={target:null,camEligibleObservers:[],
   editNoticeUntil:-1,editNoticeSeconds:0};
 const camera={mode:'operator',lens:'ortho',followId:'rook',follow:true,
  camMount:'chest',director,directorCamActor:null};
 const knowledge={omniscient:false,observerId:null,hasContactEvidence:false,
  groundLensOn:false,personalGround:null};
 const bodycam={active:false,mount:'chest',observers:[],
  groundObservers:new Set()};
 const recorder={duration:14.5,completeness:{complete:true}};
 const events=[];
 const analysisUi={replayPreset:'custom',replayEventIndex:null,
  syncReplayOverlayChoices(){events.push('sync-overlays')},
  syncReplayEventFeed(){events.push('sync-feed')}};
 const config={
  ui,
  snapshot:()=>({
   state,recorder,replayPlayback:playback,replayCamera:camera,
   replayKnowledge:knowledge,replayBodycam:bodycam,
   videoActive:false,library:{activeSavedReplayId:null,busy:false,
    isRecorderSaved:()=>false},analysisUi,
   viewMode:'iso',stageAvailable:true,selected:'rook',replaying:true,
   presentationOptions:presentation.options,
   audioSoundEnabled:true
  }),
  onOverlayChoice(choice){
   events.push('choice:'+choice);
   if(choice==='names')
    presentation.patch({replayNameTags:!presentation.options.replayNameTags});
   if(choice==='plans')
    presentation.patch({replayPlanScope:presentation.options.replayPlanScope==='none'?
      'selected':'none'});
  }
 };
 return {ui,overlayNames,overlayPlans,config,camera,knowledge,
  bodycam,playback,events};
}
test('Stage 4 replay HUD listeners bind once across repeated updates',()=>{
 const f=fixture(),hud=createBreachReplayHudController(f.config);
 hud.bind();hud.bind();
 for(let n=0;n<12;n++)hud.update();
 hud.bind();
 assert.equal(f.overlayNames.listenerCount('click'),1);
 assert.equal(f.overlayPlans.listenerCount('click'),1);
 f.overlayNames.fire('click');
 assert.equal(f.events.filter(x=>x==='choice:names').length,1,
  'a single click must not toggle an overlay multiple times');
 assert.equal(f.ui.replayNames.textContent,'NAMES OFF');
 f.overlayPlans.fire('click');
 assert.equal(f.events.filter(x=>x==='choice:plans').length,1);
 assert.equal(f.ui.replayPlans.textContent,'PLANS NONE');
});

test('replay HUD reads live snapshots, preserves accessibility and camera guards',()=>{
 const f=fixture(),hud=createBreachReplayHudController(f.config);
 hud.bind();hud.update();
 assert.match(f.ui.replayClock.textContent,/00:01/);
 assert.equal(f.ui.replayPlay.getAttribute('aria-label'),'Play replay');
 assert.equal(f.ui.replayFollowStatus.textContent,'FOLLOWING · ROOK');
 assert.equal(f.ui.replayDirectBodycam.disabled,true,
  'unrecorded personal camera is unavailable');
 f.knowledge.omniscient=true;f.camera.mode='director';f.camera.lens='cam';
 f.camera.directorCamActor='moss';f.camera.director.camEligibleObservers=['moss'];
 hud.update();
 assert.equal(f.ui.replaySight.textContent,'FULL VIEW');
 assert.equal(f.ui.replayDirectXray.disabled,true);
 assert.match(f.ui.replayFollowStatus.textContent,/DIRECTOR CAM/);
 f.ui.replayPlay.dataset.mode='pause'; // static icon already reflects play
 f.playback.rate=2;f.playback.playing=true;hud.update();
 assert.equal(f.ui.replaySpeedValue.textContent,'2×');
 assert.equal(f.ui.replayPlay.dataset.caption,'PAUSE');
});
