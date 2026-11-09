/** Historical replay transport state and time advancement.
 * Deterministic recorded samples are applied by the caller; this controller
 * does not simulate the game, query live sight, play audio, or touch the DOM.
 */
import {advanceIncidentPlayback} from './breach-replay-incident-playback.ts';
import {makeReplayLoop,advanceReplayLoop,type ReplayLoopRange}
 from './breach-replay-loop.ts';
import {smoothReplaySpeed} from './breach-replay-speed.ts';
import {directorTempoJump,type DirectorTempoEdit}
 from './breach-replay-director-tempo.ts';
export type PlaybackAdvanceOptions={
 director:boolean;videoActive:boolean;tempoEdits:readonly DirectorTempoEdit[];
};
export type PlaybackStep={
 previousTime:number;time:number;resetAudio:boolean;
 finishedIncident:boolean;trimmedSeconds:number;
};
export class ReplayPlaybackController{
 playing=false;time=0;rate=1;effectiveRate=1;
 incident:{range:ReplayLoopRange;loop:boolean}|null=null;
 loopIn:number|null=null;loopOut:number|null=null;
 loopEnabled=false;
 reset():void{
   this.playing=false;this.time=0;this.rate=1;this.effectiveRate=1;
   this.incident=null;this.loopIn=null;this.loopOut=null;this.loopEnabled=false;
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
   const loop=this.loopEnabled?
     makeReplayLoop(this.loopIn,this.loopOut,duration):null;
   const step=advanceReplayLoop(this.time,dt*this.effectiveRate,loop,duration);
   // Preserve authored film-time edits only during normal 1x Director play.
   // Never edit incident loops, alternate speed, or video recording.
   const trim=!loop&&director&&this.rate===1&&!videoActive?
     directorTempoJump(tempoEdits,previousTime,step.time):null;
   this.time=trim?trim.sourceEnd:step.time;
   if(!loop&&this.time>=duration)this.playing=false;
   return {previousTime,time:this.time,resetAudio:step.wrapped||!!trim,
     finishedIncident:false,
     trimmedSeconds:trim?trim.sourceEnd-trim.sourceStart:0};
 }
}
