import test from 'node:test';
import assert from 'node:assert/strict';
import {ReplayCameraController} from '../src/breach-replay-camera-controller.ts';
test('replay camera controller owns mode, follows only operator mode, and resets director',()=>{
  const camera=new ReplayCameraController();
  assert.equal(camera.mode,'free');
  assert.equal(camera.selectMode('operator','iso',true,false),'operator');
  assert.equal(camera.follow,true);
  assert.equal(camera.selectMode('director','plan2d',true,false),'free');
  assert.equal(camera.follow,false);
  assert.equal(camera.selectMode('director','iso',true,false),'free');
  camera.director.storyboard={sample:()=>null};
  assert.equal(camera.selectMode('director','iso',true,false),'director');
  camera.director.gradeKey='stale';
  camera.reset();
  assert.equal(camera.mode,'free');
  assert.equal(camera.follow,false);
  assert.equal(camera.director.gradeKey,'');
  assert.equal(camera.director.target,null);
  assert.equal(camera.director.storyboard,null);
});
test('missing Director shot safely returns to free camera and clears its scene anchor',()=>{
  const controller=new ReplayCameraController();
  controller.director.storyboard={sample:()=>null};
  assert.equal(controller.selectMode('director','iso',true,false),'director');
  const calls=[];
  const stage={
    setReplayDirectorCameraAnchor:(value)=>calls.push(['anchor',value]),
    setReplayDirectorFocus:(value)=>calls.push(['focus',value]),
    setReplayDirectorSubjects:(value)=>calls.push(['subjects',value])
  };
  const status={dataset:{grade:'A'},title:'old'};
  controller.advance({
    dt:1/60,instant:true,replaying:true,stage,viewMode:'iso',
    state:{operators:[]},recorder:{},replayTime:1,
    replayContactObserverId:null,replayOmniscient:false,
    cssW:390,cssH:844,replayFollowStatus:status,debugPanel:null
  });
  assert.equal(controller.mode,'free');
  assert.equal(status.dataset.grade,undefined);
  assert.deepEqual(calls,[['anchor',null],['focus',null],['subjects',[]]]);
});
