import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createBreachAudioController,LIVE_MIX_PREF,ROOM_AUDIO_PREF,
  UI_SOUND_PREF} from '../src/breach-audio-controller.ts';
import {liveAudioCuesForEvent}
  from '../src/breach-audio-event-cues.ts';
import {newSession} from '../src/breach-game.ts';
import {MissionRecorder} from '../src/breach-replay.ts';

class FakeButton extends EventTarget{
 constructor(){super();this.textContent='';this.attrs=new Map();}
 setAttribute(name,value){this.attrs.set(name,value);}
 click(){this.dispatchEvent(new Event('click'));}
 getAttribute(name){return this.attrs.get(name);}
}
function createHarness(options={}){
 const values=new Map(options.initial??[]);
 const messages=[],readKeys=[],events=new EventTarget();
 const storage={
   getItem:key=>{readKeys.push(key);return values.get(key)??null;},
   setItem:(key,value)=>{values.set(key,value);}
 };
 const state=newSession(0,912);
 const selected=state.operators.find(a=>a.side==='blue')?.id??'';
 const audio=createBreachAudioController({
   getContext:()=>({state,selected,bodycamActive:false,observerId:null}),
   storage,storageEvents:events,
   showUiHelp:(message)=>messages.push(message),
   now:()=>1000
 });
 return {audio,state,selected,values,messages,readKeys,events};
}
test('semantic live event mapping preserves layered door, flash and reload cues',()=>{
 const IDs=text=>liveAudioCuesForEvent(text).map(x=>x.id);
 assert.deepEqual(IDs('DOOR-1 OPENED'),['doors.open']);
 assert.deepEqual(IDs('DOOR-1 CLOSING'),['doors.close']);
 assert.deepEqual(IDs('DOOR-1 KICK RESISTED'),
   ['doors.kick','doors.kick_resisted']);
 assert.deepEqual(IDs('DOOR-1 FORCED OPEN'),
   ['doors.kick','doors.forced_open']);
 assert.deepEqual(IDs('DOOR-1 KICKED'),['doors.kick']);
 assert.deepEqual(IDs('FLASH DETONATED'),['combat.flash']);
 assert.deepEqual(IDs('OPERATIVE RELOADED'),['equipment.reload']);
 assert.deepEqual(IDs('FLASH OUT'),['equipment.flash_throw']);
 assert.deepEqual(IDs('SUSPECT SURRENDERED'),['people.surrender']);
 assert.deepEqual(IDs('NOISE HEARD'),[]);
 assert.deepEqual(liveAudioCuesForEvent('DOOR KICK RESISTED')
   .map(x=>x.scale),[1,.30]);
});
test('audio preferences and sound pack stay owned by the controller',()=>{
 const h=createHarness({initial:[[LIVE_MIX_PREF,'off'],
   [ROOM_AUDIO_PREF,'off'],[UI_SOUND_PREF,'off']]});
 assert.equal(h.audio.liveMixEnabled,false);
 assert.equal(h.audio.roomAudioEnabled,false);
 assert.equal(h.audio.uiSoundEnabled,false);
 assert.equal(h.audio.toggleLiveMix(),true);
 assert.equal(h.audio.toggleRoomAudio(),true);
 assert.equal(h.audio.toggleUiSound(),true);
 assert.equal(h.values.get(LIVE_MIX_PREF),'on');
 assert.equal(h.values.get(ROOM_AUDIO_PREF),'on');
 assert.equal(h.values.get(UI_SOUND_PREF),'on');
 assert.ok(h.messages.some(x=>x.includes('APPROVED SOUND LAB MIX')));
 assert.equal(h.audio.toggleUiSound(),false);
 assert.equal(h.values.get(UI_SOUND_PREF),'off');
});
test('replay mute is independent from UI and live sound preferences',()=>{
 const h=createHarness();
 const rec=new MissionRecorder();
 rec.capture(h.state,true);
 h.state.seconds=.1;rec.capture(h.state,true);
 h.audio.beginReplay(rec);
 assert.equal(h.audio.replaySoundEnabled,true);
 assert.equal(h.audio.toggleReplaySound(),false);
 assert.equal(h.audio.uiSoundEnabled,true);
 assert.equal(h.audio.liveMixEnabled,true);
 h.audio.playReplayBetween(0,.1,rec,1);
 assert.equal(h.audio.toggleReplaySound(),true);
 h.audio.endReplay();
 h.audio.resetLive();
});
test('WebAudio creation is gesture-gated and video capture keeps optional stream',()=>{
 const h=createHarness();
 let opened=0,resumed=0;
 const fakeAudio={
   state:'suspended',
   resume(){resumed++;this.state='running';return Promise.resolve();},
   createMediaStreamDestination(){return {stream:{id:'capture-audio'}};}
 };
 const audio=createBreachAudioController({
   getContext:()=>({state:h.state,selected:h.selected,
     bodycamActive:false,observerId:null}),
   showUiHelp:()=>{},storage:{
     getItem:()=>null,setItem:()=>{}
   },
   createContext:()=>{opened++;return fakeAudio;}
 });
 assert.equal(opened,0,'creating controller must not unlock audio');
 audio.unlock();
 assert.equal(opened,1);assert.equal(resumed,1);
 audio.unlock();assert.equal(opened,1);
 assert.deepEqual(audio.beginVideoCapture(),{id:'capture-audio'});
 audio.endVideoCapture();
 audio.toggleReplaySound();
 assert.equal(audio.beginVideoCapture(),null,'replay mute excludes audio track');
});
test('UI toggles attach once and update pressed labels without tactical main logic',()=>{
 const h=createHarness({initial:[[UI_SOUND_PREF,'off']]});
 const buttons={liveMix:new FakeButton(),roomAudio:new FakeButton(),
   uiSound:new FakeButton()};
 h.audio.bindSettings(buttons);
 assert.equal(buttons.uiSound.textContent,'UI SOUND OFF');
 assert.equal(buttons.uiSound.getAttribute('aria-pressed'),'false');
 buttons.liveMix.click();buttons.roomAudio.click();buttons.uiSound.click();
 assert.equal(buttons.liveMix.textContent,'TEST MIX OFF');
 assert.equal(buttons.roomAudio.textContent,'ROOM ACOUSTICS OFF');
 assert.equal(buttons.uiSound.textContent,'UI SOUND ON');
 assert.equal(buttons.uiSound.getAttribute('aria-pressed'),'true');
 const replay=new FakeButton(),labels=[];
 h.audio.bindReplayMute(replay,()=>labels.push(h.audio.replaySoundEnabled));
 replay.click();assert.deepEqual(labels,[false]);
});
test('battle audio and replay synchronization are not implemented in main',()=>{
 const main=readFileSync(new URL('../src/breach-main.ts',import.meta.url),'utf8');
 const controller=readFileSync(new URL('../src/breach-audio-controller.ts',import.meta.url),'utf8');
 assert.match(main,/createBreachAudioController\(\{/);
 assert.match(main,/audioController\.consumeLiveFrame\(/);
 assert.match(main,/audioController\.playReplayBetween\(/);
 assert.match(main,/audioController\.beginReplay\(/);
 assert.match(main,/audioController\.bindSettings\(/);
 assert.doesNotMatch(main,/function playReplayAudioBetween\(/);
 assert.doesNotMatch(main,/function playApprovedCue\(/);
 assert.doesNotMatch(main,/let audio:AudioContext\|null/);
 assert.doesNotMatch(main,/function unlockAudio\(/);
 assert.match(controller,/new ReplaySoundTimeline\(/);
 assert.match(controller,/playPackSound\(/);
 assert.match(controller,/acousticResponseForCue\(/);
});
