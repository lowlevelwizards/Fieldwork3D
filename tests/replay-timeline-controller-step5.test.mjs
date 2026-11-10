import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createBreachReplayTimelineController}
  from '../src/ui/breach-replay-timeline-controller.ts';
import {ReplayPlaybackController}
  from '../src/breach-replay-playback-controller.ts';

class FakeElement extends EventTarget{
 constructor(){
   super();this.value='';this.dataset={};this.hidden=false;
   this.style={values:new Map(),setProperty:(k,v)=>this.style.values.set(k,v)};
   this.attributes=new Map();this.textContent='';
   this.children=[];
 }
 setAttribute(key,value){this.attributes.set(key,String(value));}
 querySelectorAll(){return this.children;}
 click(){this.dispatchEvent(new Event('click'));}
}
function setup(){
 const names=['replayPlay','replayMiniPlay','replayBack','replayForward',
  'replayPrevFrame','replayNextFrame','replayPrevSample','replayNextSample',
  'replayLoopIn','replayLoopOut','replayLoopToggle','replaySpeedChoices',
  'replaySpeedRange','replaySpeedValue','replayQuickSpeed','replaySpeed',
  'replaySeek','replayClusterMenu'];
 const ui=Object.fromEntries(names.map(name=>[name,new FakeElement()]));
 const speedChoice=new FakeElement();speedChoice.dataset.speedChoice='2';
 ui.replaySpeedChoices.children.push(speedChoice);
 const playback=new ReplayPlaybackController();
 const actions=[];
 let videoActive=false;
 const controls=createBreachReplayTimelineController({
  ui,playback,duration:()=>8,
  samples:()=>[0,.05,.10,.15].map(t=>({t})),
  isVideoActive:()=>videoActive,
  seek:t=>{playback.seek(t,8);actions.push('seek:'+t);},
  stopAudio:()=>actions.push('stop'),
  unlockAudio:()=>actions.push('unlock'),
  refreshHud:()=>actions.push('hud'),
  showHelp:message=>actions.push('help:'+message)
 });
 return {ui,playback,actions,controls,speedChoice,video:value=>{videoActive=value;}};
}
test('timeline buttons control play/pause, relative seeks and recorded step positions',()=>{
 const s=setup();
 s.playback.seek(8,8);
 s.ui.replayPlay.click();
 assert.equal(s.playback.time,0);
 assert.equal(s.playback.playing,true);
 assert.deepEqual(s.actions.slice(0,3),['seek:0','unlock','hud']);
 s.ui.replayMiniPlay.click();
 assert.equal(s.playback.playing,false);
 assert.ok(s.actions.includes('stop'));
 s.ui.replayForward.click();
 assert.equal(s.playback.time,8);
 s.ui.replayBack.click();
 assert.equal(s.playback.time,0);
 s.ui.replayNextSample.click();
 assert.equal(s.playback.time,.05);
 s.ui.replayPrevSample.click();
 assert.equal(s.playback.time,0);
 s.ui.replayNextFrame.click();
 assert.equal(s.playback.time,1/60);
});
test('loop button errors are descriptive; valid loops update transport state',()=>{
 const s=setup();
 s.playback.seek(2,8);
 s.ui.replayLoopIn.click();
 s.ui.replayLoopOut.click();
 assert.ok(s.actions.some(v=>v.startsWith('help:LOOP OUT')));
 assert.equal(s.playback.loopEnabled,false);
 s.playback.seek(3,8);
 s.ui.replayLoopOut.click();
 assert.equal(s.playback.loopEnabled,true);
 assert.deepEqual(s.playback.loopRange(8),{start:2,end:3});
 s.ui.replayLoopToggle.click();
 assert.equal(s.playback.loopEnabled,false);
});
test('speed detents, menu selections and video gating share the same controller',()=>{
 const s=setup();
 s.speedChoice.click();
 assert.equal(s.playback.rate,2);
 s.ui.replaySpeed.click();
 assert.equal(s.playback.rate,2.5);
 s.ui.replaySpeedRange.value='3';
 s.ui.replaySpeedRange.dispatchEvent(new Event('input'));
 assert.equal(s.ui.replaySpeedValue.textContent,'1×');
 s.ui.replaySpeedRange.dispatchEvent(new Event('change'));
 assert.equal(s.playback.rate,1);
 s.video(true);
 s.ui.replayQuickSpeed.value='4';
 s.ui.replayQuickSpeed.dispatchEvent(new Event('change'));
 assert.equal(s.playback.rate,1);
});
test('scrubbing pauses and hides the event menu before seeking',()=>{
 const s=setup();
 s.playback.play();
 s.ui.replaySeek.value='90';
 s.ui.replaySeek.dispatchEvent(new Event('input'));
 assert.equal(s.playback.playing,false);
 assert.equal(s.playback.time,1.5);
 assert.equal(s.ui.replayClusterMenu.hidden,true);
});
test('playback and timeline responsibilities are no longer implemented inline in main',()=>{
 const main=readFileSync(new URL('../src/breach-main.ts',import.meta.url),'utf8');
 const playback=readFileSync(new URL('../src/breach-replay-playback-controller.ts',import.meta.url),'utf8');
 const timeline=readFileSync(new URL('../src/ui/breach-replay-timeline-controller.ts',import.meta.url),'utf8');
  const runtime=readFileSync(new URL('../src/breach-runtime-loop.ts',import.meta.url),'utf8');
 const presenter=readFileSync(new URL('../src/breach-replay-presentation-controller.ts',import.meta.url),'utf8');
 assert.match(main,/createBreachReplayTimelineController\(\{/);
 assert.match(runtime,/replayPlayback\.advanceAndApply\(/);
  assert.match(main,/playback:replayPlayback/);
 assert.match(presenter,/replayPlayback\.applyRecordedFrame\(/);
 assert.doesNotMatch(main,/function applyReplayFrameAt\(/);
 assert.doesNotMatch(main,/ui\.replayPlay\.addEventListener\(/);
 assert.doesNotMatch(main,/ui\.replaySeek\.addEventListener\(/);
 assert.doesNotMatch(main,/ui\.replayLoopIn\.addEventListener\(/);
 assert.match(playback,/startIncident\(/);
 assert.match(playback,/markLoopIn\(/);
 assert.match(timeline,/replaySpeedRange\.addEventListener\('change'/);
});
