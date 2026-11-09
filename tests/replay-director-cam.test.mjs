import test from 'node:test';
import assert from 'node:assert/strict';
import {ReplayDirectorSubjectTimeline}
  from '../src/breach-replay-director-subject-timeline.ts';
import {ReplayCameraController}
  from '../src/breach-replay-camera-controller.ts';

const bid=(actorId,score,kind='follow',firstEntry=false)=>({
  primaryActorId:actorId,subjectImportance:score,
  subjectReason:kind+' recorded action',kind,
  priority:score,firstEntry
});

test('CAM follows a more active operator after a brief purposeful hold',()=>{
  const timeline=new ReplayDirectorSubjectTimeline(5,t=>t<.5?
    [bid('rook',4.0)]:[bid('rook',.6),bid('ash',4.3)],
    {step:.5,minResidence:1.5,switchAdvantage:1.6});
  assert.equal(timeline.sample(0).actorId,'rook');
  assert.equal(timeline.sample(1).actorId,'rook');
  assert.equal(timeline.sample(1.5).actorId,'ash');
  assert.equal(timeline.sample(2).actorId,'ash');
  assert.match(timeline.sample(1.5).cutReason,/more-important-operator/);
});

test('new recorded contact can override residence but no future action is invented',()=>{
  const timeline=new ReplayDirectorSubjectTimeline(4,t=>t<1?
    [bid('rook',4),bid('ash',2.5)]:
    [bid('rook',3.4),bid('ash',9.2,'engage')],
    {step:.5,minResidence:1.5,switchAdvantage:1.6});
  assert.equal(timeline.sample(.75).actorId,'rook');
  assert.equal(timeline.sample(1).actorId,'ash');
  assert.match(timeline.sample(1).cutReason,/urgent-action/);
  assert.equal(timeline.sample(.75).actorId,'rook');
});

test('near-equal camera subjects never bounce due to changing framing grades',()=>{
  const timeline=new ReplayDirectorSubjectTimeline(8,t=>t<.5?
    [bid('rook',4.1)]:[
      bid('rook',4.1),bid('ash',t%1<.5?4.5:4.2)
    ],{step:.5,minResidence:1.5,switchAdvantage:1.6});
  for(const t of [0,.75,2,3,5,8])
    assert.equal(timeline.sample(t).actorId,'rook');
});

test('CAM retains a valid subject during a sparse recorded evidence knot',()=>{
  const timeline=new ReplayDirectorSubjectTimeline(5,t=>t<.5?
    [bid('moss',3.8)]:[],{step:.5});
  assert.equal(timeline.sample(0).actorId,'moss');
  assert.equal(timeline.sample(3).actorId,'moss');
  assert.match(timeline.sample(3).cutReason,/recorded-gap/);
});

test('CAM subject selection is deterministic regardless of seek order',()=>{
  const create=()=>new ReplayDirectorSubjectTimeline(5,t=>t<1?
    [bid('rook',2.5)]:t<2?
    [bid('rook',.6),bid('moss',4.3)]:
    [bid('moss',4.3),bid('rook',9.2,'engage')],{step:.5});
  const sequential=create();
  const expected=[0,.5,1,1.5,2,2.5,3].map(t=>sequential.sample(t));
  const jumped=create();
  jumped.sample(4.5);jumped.sample(.2);
  assert.deepEqual([0,.5,1,1.5,2,2.5,3].map(t=>jumped.sample(t)),
    expected);
});

const createStage=()=>{
  const mounts=[];
  const anchors=[];
  return {
    mounts,anchors,
    setReplayBodycam:x=>mounts.push(x),
    setReplayDirectorCameraAnchor:x=>anchors.push(x),
    setReplayDirectorFocus:()=>{},
    setReplayDirectorSubjects:()=>{},
    view:{focus:{x:0,y:0},zoom:1,yaw:0,pitch:0}
  };
};
const cameraContext=(stage,t,manualBodycamActive=false)=>({
  dt:1/60,instant:false,replaying:true,manualBodycamActive,stage,
  viewMode:'iso',recorder:{at:()=>null},replayTime:t,
  state:{operators:[
    {id:'rook',p:{x:1,y:1},side:'blue',health:3,heading:0},
    {id:'moss',p:{x:2,y:1},side:'blue',health:3,heading:0}
  ]},
  replayContactObserverId:null,replayOmniscient:false,
  cssW:400,cssH:750,
  replayFollowStatus:{dataset:{},title:''},debugPanel:null
});

test('Director CAM uses bodycam socket and hard-cuts operators, never OTS geometry',()=>{
  const controller=new ReplayCameraController();
  const stage=createStage();
  controller.director.camEligibleObservers=['rook','moss'];
  controller.director.subjectTimeline={
    sample:t=>({actorId:t<2?'rook':'moss',
      reason:'live filmed subject',cutReason:'cut:recorded-action'})
  };
  controller.director.storyboard={
    sample:()=>{throw Error('CAM must not ask for an OTS camera position');}
  };
  controller.mode='director';controller.lens='cam';
  controller.advance(cameraContext(stage,0));
  assert.equal(stage.mounts.at(-1).actorId,'rook');
  assert.equal(stage.mounts.at(-1).mount,'chest');
  assert.equal(controller.directorCamDisclosure().observerId,'rook');
  assert.equal(stage.anchors.at(-1),null);
  controller.camMount='helmet';
  controller.advance(cameraContext(stage,.5));
  assert.equal(stage.mounts.at(-1).mount,'helmet');
  const mountCalls=stage.mounts.length;
  controller.advance(cameraContext(stage,1));
  assert.equal(stage.mounts.length,mountCalls,
    'unchanged mount should not reset bodycam smoothing every frame');
  controller.advance(cameraContext(stage,2));
  assert.equal(stage.mounts.at(-1).actorId,'moss');
  assert.equal(stage.mounts.at(-1).mount,'helmet',
    'mount preference persists on an automatic Director cut');
  assert.equal(controller.directorCamDisclosure().observerId,'moss');
  controller.mode='free';
  controller.advance(cameraContext(stage,2.5));
  assert.equal(stage.mounts.at(-1),null,
    'leaving auto CAM releases its bodycam camera');
  assert.equal(controller.directorCamDisclosure(),null);
});

test('manual Bodycam takes ownership on exiting Director CAM',()=>{
  const controller=new ReplayCameraController(),stage=createStage();
  controller.director.camEligibleObservers=['rook'];
  controller.director.subjectTimeline={
    sample:()=>({actorId:'rook',reason:'recorded',cutReason:'establish'})
  };
  controller.mode='director';controller.lens='cam';
  controller.advance(cameraContext(stage,0));
  controller.mode='free';
  const before=stage.mounts.length;
  controller.advance(cameraContext(stage,.5,true));
  assert.equal(stage.mounts.length,before,
    'auto Camera must not clear an explicitly active manual Bodycam');
});

test('missing personal sight evidence fails closed without deactivating Director',()=>{
  const controller=new ReplayCameraController(),stage=createStage();
  controller.director.camEligibleObservers=[];
  controller.director.subjectTimeline=null;
  controller.director.storyboard={
    sample:()=>{throw Error('must not stage cinematic OTS on CAM');}
  };
  controller.mode='director';controller.lens='cam';
  const ctx=cameraContext(stage,1);
  controller.advance(ctx);
  assert.equal(controller.mode,'director');
  assert.equal(controller.directorCamDisclosure(),null);
  assert.equal(stage.mounts.length,0);
  assert.match(ctx.replayFollowStatus.title,/unavailable/i);
});
