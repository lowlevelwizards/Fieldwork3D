import test from 'node:test';
import assert from 'node:assert/strict';
import {createBreachReplayPresentationController}
 from '../src/breach-replay-presentation-controller.ts';
function fixture(){
 const events=[],state={id:'historic-session'},recording={duration:7};
 const port={
  ui:{
   replayClusterMenu:{hidden:false},replayFeed:{hidden:false},
   replayTopHud:{getBoundingClientRect:()=>({bottom:81})},
   replayPanel:{hidden:false,getBoundingClientRect:()=>({height:140,top:560})},
   replayFollowStatus:{textContent:''}
  },
  replayQuickVideo:{active:true,stop(){events.push('stop-video');this.active=false}},
  audioController:{stopReplaySounds(){events.push('stop-audio')}},
  replayDirector:{
   target:{id:99},rebuild(data){events.push('rebuild');this.last=data}
  },
  stage:{
   resetReplayBodycamSmoothing(){events.push('reset-smoothing')},
   replayCameraBaseSpan(){return 765}
  },
  replayPlayback:{
   time:0,applyRecordedFrame(recorder,session){
    events.push('apply-frame');assert.equal(recorder,recording);
    assert.equal(session,state);
    return {presentation:{frame:'historic'}};
   },
   seek(seconds,duration){events.push('seek');
    assert.equal(duration,7);this.time=seconds}
  },
  recorder:recording,state,replayPresentation:null,
  fog2D:{invalidate(){events.push('fog')}},
  replayAnalysisUi:{
   renderReplayEventFeed(){events.push('feed')},
   rebuildReplayEventIndex(){events.push('events');return {id:'index'}}
  },
  updateReplayHud(){events.push('hud')},
  replayKnowledge:{observerId:'rook',omniscient:false},
  cssW:620,cssH:700,
  replayCamera:{advance(data){events.push('camera');this.last=data}},
  replaying:true,viewMode:'iso',
  replayBodycam:{active:false},replayDirectorDebugPanel:null,
  historicalShotVisible:()=>false
 };
 return {events,port,state,recording,
  controller:createBreachReplayPresentationController(()=>port)};
}
test('seeking refreshes exactly one historical frame and all presentation consumers',()=>{
 const f=fixture();
 f.controller.seekReplay(2.75);
 assert.deepEqual(f.events,[
  'seek','stop-video','stop-audio','reset-smoothing',
  'apply-frame','fog','camera','feed','hud']);
 assert.equal(f.port.replayPlayback.time,2.75);
 assert.equal(f.port.replayPresentation.frame,'historic');
 assert.equal(f.port.ui.replayClusterMenu.hidden,true);
 assert.equal(f.port.replayDirector.target,null);
 assert.equal(f.port.replayCamera.last.instant,true);
 assert.equal(f.port.replayCamera.last.replaying,true);
 assert.equal(f.port.replayCamera.last.replayTime,2.75);
 assert.equal(f.port.replayCamera.last.state,f.state);
 assert.equal(f.port.replayCamera.last.recorder,f.recording);
 assert.equal(f.port.replayQuickVideo.active,false);
});
test('replay event index scopes director to historic evidence and current layout',()=>{
 const f=fixture();
 const previous=globalThis.document;
 try{
  globalThis.document={querySelector:()=>({getBoundingClientRect:()=>
   ({bottom:94})})};
  f.controller.rebuildReplayEventIndex();
  assert.deepEqual(f.events,['events','rebuild']);
  const args=f.port.replayDirector.last;
  assert.equal(args.state,f.state);
  assert.equal(args.recorder,f.recording);
  assert.equal(args.observerId,'rook');
  assert.equal(args.omniscient,false);
  assert.equal(args.width,620);
  assert.equal(args.height,700);
  assert.equal(args.headerBottom,94);
  assert.equal(args.dockPixels,140);
  assert.equal(args.baseSpan,765);
  assert.equal(args.isShotVisible,f.port.historicalShotVisible);
 }finally{
  if(previous===undefined)delete globalThis.document;
  else globalThis.document=previous;
 }
});
test('missing replay frame does not invent historical animation or clear fog',()=>{
 const f=fixture();
 f.port.replayPlayback.applyRecordedFrame=()=>{
   f.events.push('no-sample');return null;
 };
 f.port.replayPresentation={frame:'last-real-sample'};
 f.port.ui.replayFeed.hidden=true;
 f.controller.presentReplayAtCurrentTime();
 assert.deepEqual(f.events,[
   'stop-video','stop-audio','reset-smoothing','no-sample','camera','hud'
 ]);
 assert.deepEqual(f.port.replayPresentation,{frame:'last-real-sample'});
 assert.equal(f.port.ui.replayClusterMenu.hidden,true);
});
