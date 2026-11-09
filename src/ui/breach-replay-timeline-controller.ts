/** Replay timeline controls. Owns transport UI events while the playback
 * controller owns time and historical film. Camera, audio and HUD updates are
 * explicitly delegated to the tactical app, never inferred from DOM state.
 */
import type {ReplayPlaybackController}
  from '../breach-replay-playback-controller.ts';
import type {TimeSample} from '../breach-replay-transport.ts';
import {REPLAY_SPEED_STOPS,speedFromIndex}
  from '../breach-replay-speed.ts';

export type ReplayTimelineElements={
 replayPlay:HTMLButtonElement;replayMiniPlay:HTMLButtonElement;
 replayBack:HTMLButtonElement;replayForward:HTMLButtonElement;
 replayPrevFrame:HTMLButtonElement;replayNextFrame:HTMLButtonElement;
 replayPrevSample:HTMLButtonElement;replayNextSample:HTMLButtonElement;
 replayLoopIn:HTMLButtonElement;replayLoopOut:HTMLButtonElement;
 replayLoopToggle:HTMLButtonElement;
 replaySpeedChoices:HTMLElement;replaySpeedRange:HTMLInputElement;
 replaySpeedValue:HTMLOutputElement;replayQuickSpeed:HTMLSelectElement;
 replaySpeed:HTMLButtonElement;replaySeek:HTMLInputElement;
 replayClusterMenu:HTMLElement;
};
export function createBreachReplayTimelineController(config:{
 ui:ReplayTimelineElements;
 playback:ReplayPlaybackController;
 duration:()=>number;
 samples:()=>readonly TimeSample[];
 isVideoActive:()=>boolean;
 seek:(time:number)=>void;
 stopAudio:()=>void;
 unlockAudio:()=>void;
 refreshHud:()=>void;
 showHelp:(message:string,duration:number)=>void;
}){
 const {ui,playback}=config;
 const togglePlay=()=>{
   if(playback.atEnd(config.duration()))config.seek(0);
   if(playback.toggle())config.unlockAudio();
   else config.stopAudio();
   config.refreshHud();
 };
 const step=(kind:'sample'|'frame',direction:-1|1)=>{
   playback.pause();
   config.seek(playback.stepTarget(kind,direction,
     config.samples(),config.duration()));
 };
 const chooseSpeed=(rate:number)=>{
   if(config.isVideoActive()||!playback.setSpeed(rate))return;
   config.stopAudio();
   config.refreshHud();
 };
 const seekFromScrubber=()=>{
   ui.replayClusterMenu.hidden=true;
   playback.pause();
   config.seek(Number(ui.replaySeek.value)/60);
 };
 ui.replayPlay.addEventListener('click',togglePlay);
 ui.replayMiniPlay.addEventListener('click',togglePlay);
 ui.replayBack.addEventListener('click',()=>config.seek(playback.time-10));
 ui.replayForward.addEventListener('click',()=>config.seek(playback.time+10));
 ui.replayPrevFrame.addEventListener('click',()=>step('frame',-1));
 ui.replayNextFrame.addEventListener('click',()=>step('frame',1));
 ui.replayPrevSample.addEventListener('click',()=>step('sample',-1));
 ui.replayNextSample.addEventListener('click',()=>step('sample',1));
 ui.replayLoopIn.addEventListener('click',()=>{
   playback.markLoopIn();config.refreshHud();
 });
 ui.replayLoopOut.addEventListener('click',()=>{
   if(!playback.markLoopOut(config.duration())){
     config.showHelp('LOOP OUT MUST BE AT LEAST 0.35S AFTER IN',3300);
     return;
   }
   config.refreshHud();
 });
 ui.replayLoopToggle.addEventListener('click',()=>{
   if(playback.toggleLoop(config.duration()))config.refreshHud();
 });
 for(const button of ui.replaySpeedChoices
   .querySelectorAll<HTMLButtonElement>('[data-speed-choice]')){
   button.addEventListener('click',()=>{
     ui.replayQuickSpeed.value=button.dataset.speedChoice??'1';
     ui.replayQuickSpeed.dispatchEvent(new Event('change'));
   });
 }
 ui.replaySpeedRange.addEventListener('input',()=>{
   const rate=speedFromIndex(Number(ui.replaySpeedRange.value));
   ui.replaySpeedValue.textContent=rate+'×';
   ui.replaySpeedRange.setAttribute('aria-valuetext',rate+'×');
   ui.replaySpeedRange.style.setProperty('--speed-progress',
     (Number(ui.replaySpeedRange.value)/
       (REPLAY_SPEED_STOPS.length-1)*100)+'%');
 });
 ui.replaySpeedRange.addEventListener('change',()=>{
   if(config.isVideoActive())return;
   ui.replayQuickSpeed.value=String(speedFromIndex(
     Number(ui.replaySpeedRange.value)));
   ui.replayQuickSpeed.dispatchEvent(new Event('change'));
 });
 ui.replayQuickSpeed.addEventListener('change',()=>{
   chooseSpeed(Number(ui.replayQuickSpeed.value));
 });
 ui.replaySpeed.addEventListener('click',()=>{
   ui.replayQuickSpeed.value=String(playback.nextSpeed());
   ui.replayQuickSpeed.dispatchEvent(new Event('change'));
 });
 ui.replaySeek.addEventListener('input',seekFromScrubber);
 return {togglePlay,step,chooseSpeed,seekFromScrubber};
}
