/** Historical replay timeline and deterministic film application.
 * This owns transport state (time, play/pause, speed, loops, incidents and
 * recorded frame application). It does not run the simulation, direct cameras,
 * render DOM, or select audio; the app handles presentation side effects.
 */
import {advanceIncidentPlayback,incidentPlaybackWindow}
  from './breach-replay-incident-playback.ts';
import {makeReplayLoop,advanceReplayLoop,type ReplayLoopRange}
  from './breach-replay-loop.ts';
import {REPLAY_SPEED_STOPS,smoothReplaySpeed,speedFromIndex,speedIndex}
  from './breach-replay-speed.ts';
import {stepReplaySample,stepReplayPresentation,type TimeSample}
  from './breach-replay-transport.ts';
import {clampReplayTime} from './breach-replay-ui-state.ts';
import {applyReplayFrame,type ReplayFrame,type MissionRecorder}
  from './breach-replay.ts';
import type {Session} from './breach-game.ts';
import {directorTempoJump,type DirectorTempoEdit}
  from './breach-replay-director-tempo.ts';

export type PlaybackAdvanceOptions={
 director:boolean;videoActive:boolean;tempoEdits:readonly DirectorTempoEdit[];
};
export type PlaybackStep={
 previousTime:number;time:number;resetAudio:boolean;
 finishedIncident:boolean;trimmedSeconds:number;
};
export type PlaybackFrameStep=PlaybackStep&{frame:ReplayFrame|null};

export class ReplayPlaybackController{
 playing=false;time=0;rate=1;effectiveRate=1;
 incident:{range:ReplayLoopRange;loop:boolean;scoped:boolean}|null=null;
 savedIncidentRange:ReplayLoopRange|null=null;
 loopIn:number|null=null;loopOut:number|null=null;
 loopEnabled=false;

 reset():void{
   this.playing=false;this.time=0;this.rate=1;this.effectiveRate=1;
   this.incident=null;this.savedIncidentRange=null;
   this.loopIn=null;this.loopOut=null;this.loopEnabled=false;
 }
 pause():void{this.playing=false;}
 play():void{this.playing=true;}
 toggle():boolean{this.playing=!this.playing;return this.playing;}
 atEnd(duration:number):boolean{return this.time>=duration;}
 /** Seeking exits an incident but deliberately preserves play/pause status. */
 seek(time:number,duration:number):number{
   const wanted=clampReplayTime(time,duration);
   // Scoped clips remain explicitly bounded even if a full-timeline slider
   // sends a seek outside the clip. UNCLIP is the only exit from the range.
   this.time=this.incident?.scoped?
     Math.min(this.incident.range.end,Math.max(this.incident.range.start,wanted)):
     wanted;
   if(!this.incident?.scoped)this.incident=null;
   return this.time;
 }
 stepTarget(kind:'sample'|'frame',direction:-1|1,
   samples:readonly TimeSample[],duration:number):number{
   return kind==='sample'?
     stepReplaySample(samples,this.time,direction):
     stepReplayPresentation(this.time,duration,direction);
 }
 setSpeed(rate:number):boolean{
   if(!REPLAY_SPEED_STOPS.some(stop=>stop===rate))return false;
   this.rate=rate;
   return true;
 }
 setSpeedIndex(index:number):number{
   this.rate=speedFromIndex(index);
   return this.rate;
 }
 nextSpeed():number{
   return speedFromIndex((speedIndex(this.rate)+1)%REPLAY_SPEED_STOPS.length);
 }
 loopRange(duration:number):ReplayLoopRange|null{
   return makeReplayLoop(this.loopIn,this.loopOut,duration);
 }
 markLoopIn():void{
   this.loopIn=this.time;
   if(this.loopOut!==null&&this.loopOut-this.loopIn<.35)
     this.loopOut=null;
   this.loopEnabled=false;
   this.incident=null;
 }
 markLoopOut(duration:number):boolean{
   if(this.loopIn===null)this.loopIn=0;
   const proposed=makeReplayLoop(this.loopIn,this.time,duration);
   if(!proposed)return false;
   this.loopOut=proposed.end;
   this.loopEnabled=true;
   this.incident=null;
   return true;
 }
 toggleLoop(duration:number):boolean{
   if(!this.loopRange(duration))return false;
   this.loopEnabled=!this.loopEnabled;
   if(this.loopEnabled)this.incident=null;
   return true;
 }
 /** Start a bounded incident watch or repeat; the caller handles audio/UI. */
 startIncident(incident: {start:number;end:number},duration:number,
   loop:boolean,scoped=false):boolean{
   const range=incidentPlaybackWindow(incident,duration);
   if(!range)return false;
   this.seek(range.start,duration);
   this.incident={range,loop,scoped};
   this.savedIncidentRange=range;
   this.loopEnabled=false;
   this.rate=1;this.effectiveRate=1;this.playing=true;
   return true;
 }
 clearIncident():void{this.incident=null;this.savedIncidentRange=null;}
 /** Return to full film without losing the originating debrief address. */
 unclipIncident():boolean{
   if(!this.incident)return false;
   this.savedIncidentRange=this.incident.range;
   this.incident=null;return true;
 }
 reclipIncident():boolean{
   const range=this.savedIncidentRange;if(!range)return false;
   this.time=Math.max(range.start,Math.min(range.end,this.time));
   this.incident={range,loop:true,scoped:true};return true;
 }
 /** A video export is authored at 1x and must not inherit a tactical loop. */
 prepareVideoExport():void{
   this.rate=1;this.effectiveRate=1;
   this.loopEnabled=false;this.loopIn=null;this.loopOut=null;
   this.incident=null;this.savedIncidentRange=null;
 }
 /** Only recorded outcomes are ever applied; no historical simulation tick. */
 applyRecordedFrame(recorder:MissionRecorder,state:Session):ReplayFrame|null{
   const frame=recorder.sample(this.time);
   if(frame)applyReplayFrame(state,frame);
   return frame;
 }
 /** Single transport/frame boundary for the main animation loop. */
 advanceAndApply(dt:number,recorder:MissionRecorder,state:Session,
   options:PlaybackAdvanceOptions):PlaybackFrameStep|null{
   const step=this.advance(dt,recorder.duration,options);
   return step?{...step,frame:this.applyRecordedFrame(recorder,state)}:null;
 }
 advance(dt:number,duration:number,
   {director,videoActive,tempoEdits}:PlaybackAdvanceOptions):PlaybackStep|null{
   if(!this.playing)return null;
   this.effectiveRate=smoothReplaySpeed(this.effectiveRate,this.rate,dt);
   const previousTime=this.time;
   if(this.incident){
     const step=advanceIncidentPlayback(this.time,dt*this.effectiveRate,
       this.incident.range,this.incident.loop);
     this.time=step.time;
     if(step.finished){this.playing=false;this.incident=null;}
     return {previousTime,time:this.time,resetAudio:step.wrapped,
       finishedIncident:step.finished,trimmedSeconds:0};
   }
   const loop=this.loopEnabled?this.loopRange(duration):null;
   const step=advanceReplayLoop(this.time,dt*this.effectiveRate,loop,duration);
   // Use authored Director trims only for normal 1x playback, never
   // during loops, alternate speeds, or video capture.
   const trim=!loop&&director&&this.rate===1&&!videoActive?
     directorTempoJump(tempoEdits,previousTime,step.time):null;
   this.time=trim?trim.sourceEnd:step.time;
   if(!loop&&this.time>=duration)this.playing=false;
   return {previousTime,time:this.time,resetAudio:step.wrapped||!!trim,
     finishedIncident:false,
     trimmedSeconds:trim?trim.sourceEnd-trim.sourceStart:0};
 }
}
