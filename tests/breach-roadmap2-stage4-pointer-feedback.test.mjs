/** Stage 4: the new controllers exercise actual pointer/event boundaries. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {dispatchTacticalPointerRelease}
 from '../src/breach-pointer-command-controller.ts';
import {createBreachTacticalFrameFeedbackController}
 from '../src/ui/breach-tactical-frame-feedback-controller.ts';
import {createBreachReplayPresentationController}
 from '../src/breach-replay-presentation-controller.ts';
function pointerFixture(){
 const actions=[];
 const s={phase:'planning',operators:[],doors:[],coverState:[],
   intel:{cover:new Set(),walls:new Set(),doors:new Set()}};
 const port={
  state:s,replaying:false,replayBodycam:{active:false},replayTraceMode:'off',
  viewMode:'plan2d',
  recorder:{ballistics:{between(){return []}}},
  replayPlayback:{time:0},
  replayAnalysisUi:{selectReplayShot(){actions.push('shot')}},
  hudController:{facing:{looking:false}},selected:'rook',
  selectedNode:null,selectedActiveWatch:false,doorFocusId:null,
  doorMenuDismissedId:null,flashMode:false,pushMode:false,firePlacement:null,
  evacMode:null,trace:null,tacticalFeedback:{emit(){actions.push('feedback')}},
  pointerAimWorld:e=>({x:e.clientX,y:e.clientY}),
  pointerWorld:e=>({x:e.clientX,y:e.clientY}),
  worldToScreen:p=>p,
  followReplayOperator:id=>actions.push('follow:'+id),
  historicalShotVisible:()=>false,
  selectUnit:id=>actions.push('select:'+id),
  useSelectedGround:()=>actions.push('place'),
  showUiHelp:()=>actions.push('help'),
  adoptPointerOwner:()=>{},
  uid:()=>undefined,
  rejectAt:()=>actions.push('reject'),
  teach:()=>{},
  insertAtRouteLine:()=>{actions.push('insert');return true;},
  selectedPlanNode:()=>undefined
 };
 return {port,actions,event:{clientX:200,clientY:200,pointerType:'touch'},
   pointer:{mode:'undecided',moved:false,pick:null,dragCommitted:false}};
}
test('cancelled, multi-touch and camera releases cannot author a tactical command',()=>{
 const {port,actions,event,pointer}=pointerFixture();
 dispatchTacticalPointerRelease(port,event,pointer,true,1);
 dispatchTacticalPointerRelease(port,event,pointer,false,2);
 dispatchTacticalPointerRelease(port,event,{...pointer,mode:'cameraMulti'},false,1);
 assert.deepEqual(actions,[]);
 dispatchTacticalPointerRelease(port,event,pointer,false,1);
 assert.deepEqual(actions,['place'],'a single unarmed tap commits once');
});
test('armed targets commit once on pointerup and not on cancelled release',()=>{
 const f=pointerFixture();
 f.port.hudController.facing.looking=true;
 dispatchTacticalPointerRelease(f.port,f.event,f.pointer,true,1);
 assert.deepEqual(f.actions,[]);
 dispatchTacticalPointerRelease(f.port,f.event,f.pointer,false,1);
 assert.deepEqual(f.actions,['place']);
});
test('replay friendly tap follows one operator and does not fire shot inspection',()=>{
 const f=pointerFixture();
 f.port.replaying=true;
 f.port.state.operators.push({id:'rook',side:'blue',health:100,
   p:{x:200,y:200}});
 f.port.replayTraceMode='recent';
 dispatchTacticalPointerRelease(f.port,f.event,f.pointer,false,1);
 assert.deepEqual(f.actions,['follow:rook']);
 f.actions.length=0;
 dispatchTacticalPointerRelease(f.port,f.event,f.pointer,true,1);
 dispatchTacticalPointerRelease(f.port,f.event,f.pointer,false,2);
 assert.deepEqual(f.actions,[]);
});
test('blocked episode emits once until cleared, then reset; rejection remains authored by HUD',()=>{
 const a={id:'rook',side:'blue',health:100,
   p:{x:20,y:30},blockedTime:1,lastBlocker:'furniture'};
 const events=[],session={operators:[a],events:[]};
 const controller=createBreachTacticalFrameFeedbackController({
  snapshot:()=>({
   state:session,replaying:false,selected:'rook',feedbackDraw:null,
   dpr:1,cssW:600,cssH:600,activePointers:new Map(),
   cursor:null,previewHover:false,
   hudController:{facing:{looking:false},
     rejectAttempt:(point,reason,warn)=>{events.push('hud:'+reason);warn();}},
   flashMode:false,firePlacement:null,evacMode:null,pushMode:false,
   uid:()=>a,selectedPlanNode:()=>undefined,
   tacticalFeedback:{emit:(kind,p,caption)=>events.push(kind+':'+caption)},
   worldToScreen:p=>p,reducedMotion:false
  }),
  warn:()=>events.push('warning')
 });
 controller.draw(true);controller.draw(true);
 assert.deepEqual(events,['error:OBSTRUCTED']);
 a.lastBlocker='clear';controller.draw(true);
 a.lastBlocker='furniture';controller.draw(true);
 assert.equal(events.filter(x=>x==='error:OBSTRUCTED').length,2);
 controller.reset();controller.draw(true);
 assert.equal(events.filter(x=>x==='error:OBSTRUCTED').length,3);
 controller.rejectAt({x:7,y:9},'ORDER BLOCKED');
 assert.deepEqual(session.events,['ORDER BLOCKED']);
 assert.ok(events.includes('hud:ORDER BLOCKED'));
 assert.ok(events.includes('warning'));
});
test('replay seek displays recorded frame and invalidates fog without ticking live simulation',()=>{
 const seen=[];
 const playback={time:0,seek(t,duration){this.time=Math.max(0,Math.min(t,duration))},
  applyRecordedFrame(recorder,state){
   seen.push('sample:'+this.time);
   return {presentation:{t:this.time}};
  }};
 let observed=null;
 const port={
  ui:{replayClusterMenu:{hidden:false},replayFeed:{hidden:true},
   replayTopHud:{},replayPanel:{},replayFollowStatus:{}},
  replayQuickVideo:{active:false,stop(){seen.push('video')}},
  audioController:{stopReplaySounds(){seen.push('audio')}},
  replayDirector:{target:{id:'prior'}},
  stage:{resetReplayBodycamSmoothing(){seen.push('smooth')}},
  replayPlayback:playback,recorder:{duration:4},state:{},
  get replayPresentation(){return observed},
  set replayPresentation(value){observed=value},
  fog2D:{invalidate(){seen.push('fog')}},
  replayAnalysisUi:{renderReplayEventFeed(){}},
  updateReplayHud(){seen.push('hud')},replayKnowledge:{observerId:null,omniscient:false},
  cssW:300,cssH:500,
  replayCamera:{advance:args=>seen.push('camera:'+args.replayTime)},
  replaying:true,viewMode:'iso',replayBodycam:{active:false},
  replayDirectorDebugPanel:null,historicalShotVisible:()=>false
 };
 const controller=createBreachReplayPresentationController(()=>port);
 controller.seekReplay(3);
 assert.deepEqual(observed,{t:3});
 assert.equal(port.replayDirector.target,null);
 assert.ok(seen.includes('audio'));assert.ok(seen.includes('fog'));
 assert.ok(seen.includes('camera:3'));
 controller.seekReplay(.25);
 assert.deepEqual(observed,{t:.25},'rewinding cannot retain future film presentation');
});

test('known reachable door tap enters exactly one contextual door selection',()=>{
 const f=pointerFixture();
 const actor={id:'rook',side:'blue',health:100,p:{x:202,y:218},plan:[]};
 f.port.state.operators.push(actor);
 const door={id:'D-TEST',open:false,openFraction:0,
  a:{x:202,y:200},b:{x:202,y:220}};
 f.port.state.doors.push(door);
 f.port.state.intel.mode='full-view';
 f.port.uid=id=>id==='rook'?actor:undefined;
 f.port.teach=(key,message)=>f.actions.push('teach:'+key+':'+message);
 const pointer={...f.pointer,pick:{kind:'door',doorId:'D-TEST'}};
 dispatchTacticalPointerRelease(f.port,f.event,pointer,false,1);
 assert.equal(f.port.doorFocusId,'D-TEST');
 assert.equal(f.port.selectedNode,null);
 assert.equal(f.actions.filter(a=>a.startsWith('teach:')).length,1);
 assert.match(f.actions.join(' '),/teach:door-selected:Door selected/);
 f.actions.length=0;
 dispatchTacticalPointerRelease(f.port,f.event,pointer,true,1);
 assert.deepEqual(f.actions,[],'cancel cannot focus a door or issue a command');
});
