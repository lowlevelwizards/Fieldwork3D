/** C5: exercise actual replay HUD controls against a recorded-only owner graph.
 * No browser/GPU: final Stage 6 acceptance covers WebGL and Bodycam.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ReplayCameraController} from '../src/breach-replay-camera-controller.ts';
import {ReplayKnowledgeController} from '../src/breach-replay-knowledge-controller.ts';
import {createReplayPresentationOptions} from '../src/breach-replay-presentation-options.ts';
import {createBreachReplayHudController} from '../src/ui/breach-replay-hud-controller.ts';
const read=p=>readFileSync(new URL('../src/'+p,import.meta.url),'utf8');

function element(){
 const callbacks=new Map(),attrs=new Map();
 return {
  dataset:{},style:{setProperty(){}},options:[],hidden:false,disabled:false,
  value:'',textContent:'',title:'',
  querySelector(){return element()},querySelectorAll(){return []},
  addEventListener(name,handler){
   const list=callbacks.get(name)??[];list.push(handler);callbacks.set(name,list);
  },
  fire(name){for(const cb of callbacks.get(name)??[])cb()},
  listeners(name){return (callbacks.get(name)??[]).length},
  setAttribute(k,v){attrs.set(k,v)},getAttribute(k){return attrs.get(k)},
  replaceChildren(){},remove(){},append(){}
 };
}
function fixture(){
 const events=[],count=name=>events.filter(e=>e===name).length;
 const ui=new Proxy({},{
  get(target,key){return target[key]??(target[key]=element())}
 });
 ui.replayPlay.dataset.mode='replayPlay';
 const presentation=createReplayPresentationOptions();
 const state={operators:[
  {id:'rook',name:'Rook',health:100,side:'blue'},
  {id:'moss',name:'Moss',health:100,side:'blue'},
  {id:'ash',name:'Ash',health:0,side:'blue'},
  {id:'vale',name:'Vale',health:100,side:'blue'}
 ]};
 const recorder={duration:12,completeness:{complete:true},frames:[{
  knowledge:{operatorVisibleActorIds:{rook:['red-1'],moss:['red-2'],vale:['red-3']}}
 }]};
 const camera=new ReplayCameraController();
 camera.mode='operator';camera.followId='rook';camera.follow=true;
 camera.director.camEligibleObservers=['rook','moss','vale'];
 const knowledge=new ReplayKnowledgeController();
 knowledge.observerId='rook';knowledge.omniscient=false;knowledge.hasContactEvidence=true;
 knowledge.personalGround={at:()=>new Set(['micro:1,1'])};
 const bodycam={active:false,mount:'chest',
  observers:['rook','moss'],groundObservers:new Set(['rook','moss'])};
 const playback={time:2,playing:false,rate:1,incident:null,
  loopIn:null,loopOut:null,loopEnabled:false,loopRange:()=>null};
 const analysis={
  replayEventIndex:null,
  renderReplayEventMarkers(){events.push('markers')},
  renderReplayEventFeed(){events.push('feed')},
  refreshReplayShotInspector(){events.push('inspector')},
  closeReplayShotInspector(){events.push('close-inspector')},
  syncReplayOverlayChoices(){},syncReplayEventFeed(){}
 };
 let viewMode='iso';
 const port={
  state,recorder,stage:{},replaying:true,
  get viewMode(){return viewMode},
  selected:'rook',cssW:900,cssH:620,
  replayKnowledge:knowledge,replayPlayback:playback,replayCamera:camera,
  replayBodycam:bodycam,replayDirector:camera.director,
  replayAnalysisUi:analysis,
  replayQuickVideo:{active:false,audioTrackCount:0,stop(){}},
  audio:{unlock(){},beginVideoCapture(){return null},endVideoCapture(){}},
  stopReplayBodycam(){bodycam.active=false;events.push('stop-bodycam')},
  startReplayBodycam(){bodycam.active=true;events.push('start-bodycam');return true},
  applyReplayBodycamMount(){events.push('apply-bodycam')},
  chooseReplayCamera(mode){
   events.push('choose:'+mode);
   camera.selectMode(mode,viewMode,true,bodycam.active);
  },
  cameraMode(mode){
   events.push('perspective:'+mode);
   viewMode=mode;
   camera.selectMode(camera.mode,viewMode,true,bodycam.active);
  },
  advanceReplayCamera(dt,instant){events.push('advance:'+dt+':'+!!instant)},
  rebuildReplayEventIndex(){events.push('rebuild')},
  seekReplay(){},exitReplay(){},
  invalidateFog(){events.push('fog')},
  showUiHelp(){},applyReplayPreset(){}
 };
 const config={
  ui,snapshot:()=>({
   state,recorder,replayPlayback:playback,replayCamera:camera,
   replayKnowledge:knowledge,replayBodycam:bodycam,videoActive:false,
   library:{activeSavedReplayId:null,busy:false,isRecorderSaved:()=>false},
   analysisUi:analysis,viewMode,stageAvailable:true,selected:port.selected,
   replaying:true,presentationOptions:presentation.options,audioSoundEnabled:true
  }),
  interactions:port,presentation:{options:presentation,setXray(){}},
  onOverlayChoice(){},followReplayOperator(){}
 };
 const hud=createBreachReplayHudController(config);
 return {ui,port,hud,camera,knowledge,bodycam,playback,state,recorder,
  events,count,get viewMode(){return viewMode}};
}
test('C5 inspector follow and actor selector share one observer-safe transition',()=>{
 const f=fixture();f.hud.bindQuickInteractions();
 f.ui.replayInspectActor.value='moss';
 f.ui.replayInspectFollow.fire('click');
 assert.equal(f.port.selected,'moss');
 assert.equal(f.camera.followId,'moss');
 assert.equal(f.camera.mode,'operator');
 assert.equal(f.knowledge.observerId,'moss');
 assert.deepEqual(f.knowledge.disclosure(),{mode:'operator',observerId:'moss'});
 assert.equal(f.count('rebuild'),1);assert.equal(f.count('fog'),1);
 assert.equal(f.count('markers'),1);assert.equal(f.count('feed'),1);
 assert.equal(f.count('advance:0:true'),1);
 f.ui.replayInspectActor.value='rook';
 f.ui.replayInspectActor.fire('change');
 assert.equal(f.camera.followId,'rook');
 assert.equal(f.knowledge.observerId,'rook');
 assert.equal(f.count('rebuild'),2);
});
test('C5 quick camera operator switch updates personal evidence or fails closed',()=>{
 const f=fixture();f.hud.bindQuickInteractions();
 f.ui.replayQuickCamera.value='operator:moss';
 f.ui.replayQuickCamera.fire('change');
 assert.equal(f.knowledge.observerId,'moss');
 assert.equal(f.port.selected,'moss');
 assert.equal(f.camera.mode,'operator');
 assert.equal(f.count('rebuild'),1);
 // Vale is alive but this recording has no personal camera eligibility.
 f.ui.replayQuickCamera.value='operator:vale';
 f.ui.replayQuickCamera.fire('change');
 assert.equal(f.camera.followId,'vale');
 assert.equal(f.knowledge.observerId,null);
 assert.equal(f.knowledge.omniscient,false);
 assert.deepEqual(f.knowledge.disclosure(),{mode:'squad'});
 assert.equal(f.count('rebuild'),2);
 f.ui.replayQuickCamera.value='operator:ash'; // dead actor unavailable
 f.ui.replayQuickCamera.fire('change');
 assert.equal(f.camera.followId,'vale');
 assert.equal(f.count('rebuild'),2);
});
test('C5 legacy FOLLOW cycles only living actors through the same observer policy',()=>{
 const f=fixture();f.hud.bindLateInteractions();
 f.ui.replayFollow.fire('click');assert.equal(f.camera.followId,'moss');
 assert.equal(f.knowledge.observerId,'moss');
 f.ui.replayFollow.fire('click');assert.equal(f.camera.followId,'vale');
 assert.equal(f.knowledge.observerId,null);
 assert.deepEqual(f.knowledge.disclosure(),{mode:'squad'});
 f.ui.replayFollow.fire('click');
 assert.equal(f.camera.mode,'free');
 assert.equal(f.camera.follow,false);
 f.ui.replayFollow.fire('click');
 assert.equal(f.camera.mode,'operator');
 assert.equal(f.camera.followId,'vale');
 assert.equal(f.count('rebuild'),2,'squad fallback stays unchanged on later nonpersonal follow');
});
test('C5 view dropdown and legacy view button each delegate exactly once',()=>{
 const f=fixture();f.hud.bindQuickInteractions();f.hud.bindLateInteractions();
 f.ui.replayQuickView.value='plan2d';
 f.ui.replayQuickView.fire('change');
 assert.equal(f.viewMode,'plan2d');
 assert.equal(f.camera.mode,'free');
 assert.equal(f.count('perspective:plan2d'),1);
 assert.equal(f.events.some(e=>e.startsWith('choose:')),false,
  'cameraMode is already the replay camera policy owner');
 f.ui.replayView.fire('click');
 assert.equal(f.viewMode,'iso');
 assert.equal(f.count('perspective:iso'),1);
 assert.equal(f.events.some(e=>e.startsWith('choose:')),false);
 assert.equal(f.knowledge.observerId,'rook','perspective does not rewrite recorded sight');
});
test('C5 both Director controls share explicit mode transition without a second film',()=>{
 const f=fixture();f.hud.bindDirectInteractions();f.hud.bindLateInteractions();
 f.camera.director.storyboard={sample:()=>null};
 f.camera.director.target={id:'old'};
 f.ui.replayDirectDirector.fire('click');
 assert.equal(f.camera.mode,'director');
 assert.equal(f.camera.follow,false);
 assert.equal(f.camera.director.target,null);
 assert.equal(f.count('advance:'+1/60+':false'),1);
 f.ui.replayDirectDirector.fire('click');
 assert.equal(f.camera.mode,'free');
 f.camera.director.target={id:'stale'};
 f.ui.replayDirector.fire('click');
 assert.equal(f.camera.mode,'director');
 assert.equal(f.camera.director.target,null);
 assert.equal(f.count('advance:0:true'),1);
 assert.deepEqual(f.knowledge.disclosure(),{mode:'operator',observerId:'rook'},
  'a Director choice cannot grant full historical visibility');
});
test('C5 historical disclosure change does one coherent refresh, not a duplicate rebuild',()=>{
 const f=fixture();f.hud.bindDirectInteractions();
 f.ui.replayDirectSight.value='full';
 f.ui.replayDirectSight.fire('change');
 assert.deepEqual(f.knowledge.disclosure(),{mode:'full'});
 assert.equal(f.count('fog'),1);assert.equal(f.count('rebuild'),1);
 assert.equal(f.count('markers'),1);assert.equal(f.count('feed'),1);
 assert.equal(f.count('inspector'),1);
 f.ui.replayDirectSight.value='operator';
 f.ui.replayDirectSight.fire('change');
 assert.deepEqual(f.knowledge.disclosure(),{mode:'operator',observerId:'rook'});
 assert.equal(f.count('rebuild'),2);
 assert.equal(f.count('inspector'),2);
 assert.equal(f.playback.time,2,'disclosure refresh cannot seek transport');
});
test('C5 Bodycam exit uses one follow/visibility rebuild',()=>{
 const f=fixture();f.hud.bindDirectInteractions();
 f.bodycam.active=true;f.camera.mode='free';f.camera.follow=false;
 f.ui.replayDirectBodycam.fire('click');
 assert.equal(f.bodycam.active,false);
 assert.equal(f.camera.mode,'operator');
 assert.equal(f.knowledge.observerId,'rook');
 assert.equal(f.count('rebuild'),1,'Bodycam exit must not refresh twice');
 assert.equal(f.count('fog'),1);
});
test('C5 ground cache invalidation is complete and archive evidence untouched',()=>{
 const f=fixture();f.hud.bindLateInteractions();
 const evidence=new Set(['micro:1,1']);
 f.knowledge.groundCacheObserver='rook';
 f.knowledge.groundCacheEvidence=evidence;
 f.knowledge.groundCacheCount=1;
 f.knowledge.groundCacheSite={id:'old'};
 f.ui.replayGroundLens.fire('click');
 assert.equal(f.knowledge.groundLensOn,true);
 assert.equal(f.viewMode,'plan2d');
 assert.equal(f.knowledge.groundCacheObserver,null);
 assert.equal(f.knowledge.groundCacheEvidence,null);
 assert.equal(f.knowledge.groundCacheCount,-1);
 assert.equal(f.knowledge.groundCacheSite,null);
 assert.equal(evidence.size,1);
 f.knowledge.groundCacheEvidence=evidence;
 f.knowledge.reset();
 assert.equal(f.knowledge.groundCacheEvidence,null);
 assert.equal(f.knowledge.personalGround,null);
});
test('C5 no additional Director, clock, archive, LOS or camera authority',()=>{
 const hud=read('ui/breach-replay-hud-controller.ts');
 const mode=read('breach-replay-mode-controller.ts');
 const knowledge=read('breach-replay-knowledge-controller.ts');
 const main=read('breach-main.ts');
 assert.match(hud,/function refreshHistoricalViews\(/);
 assert.match(hud,/function toggleDirector\(/);
 assert.match(hud,/followReplayOperator\(choice\.slice\('operator:'\.length\)\)/);
 assert.match(hud,/port\.replayKnowledge\.invalidateGroundCache\(\)/);
 assert.match(knowledge,/invalidateGroundCache\(\):void/);
 assert.match(mode,/config\.knowledge\.prepare\(recorder\)/);
 assert.match(main,/function cameraMode\(mode:ViewMode\)/);
 assert.doesNotMatch(hud,/stepSession\(|new MissionRecorder\(|new ReplayDirectorController\(/);
 assert.doesNotMatch(knowledge,/inSight\(|stepSession\(/);
 assert.equal((hud.match(/function toggleDirector\(/g)??[]).length,1);
});
