/** Build 121: replay pose facts recorded at fixed simulation time.
 * A bounded step-event stream reconstructs contacts from *time*, not render dt.
 * No frame-by-frame bone transforms or duplicate gait implementation.
 */
import type {TeamActor} from './breach-game.ts';
import type {Door} from './breach-core.ts';
import {advanceFootsteps,createFootstepScheduler,gaitBounds,
  type FootTarget,type FootstepScheduler,type FootstepInput} from './breach-footsteps.ts';

export type ReplayFeet=[FootTarget,FootTarget];
type FootEvent={
  at:number;from:{x:number;y:number};to:{x:number;y:number};
  fromYaw:number;toYaw:number;unload:number;swing:number;lift:number;
};
type ActorTrack={
  gait:FootstepScheduler;
  events:[FootEvent[],FootEvent[]];last:{x:number;y:number;t:number};
  travelYaw:number;lastStepAt:number;
};
export type ReplayPresentation={
  feet:Record<string,ReplayFeet>;
  travelYaw:Record<string,number>;
  doors:Record<string,number>;
};
const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
const angular=(a:number,b:number)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
const smooth=(x:number)=>x*x*(3-2*x);
const footMark=(t:number,point:{x:number;y:number},yaw:number):FootEvent=>({
  at:t,from:{...point},to:{...point},fromYaw:yaw,toYaw:yaw,
  unload:0,swing:0,lift:0
});
export function sampleFootEvents(events:readonly FootEvent[],time:number):FootTarget{
  if(!events.length)throw Error('Replay foot has no initial contact');
  let lo=0,hi=events.length-1;
  while(lo<hi){
    const mid=Math.ceil((lo+hi)/2);
    if(events[mid].at<=time)lo=mid;else hi=mid-1;
  }
  const e=events[lo];
  if(e.swing===0)return {position:{...e.to},height:0,
    worldYaw:e.toYaw,phase:'planted',contact:true};
  const elapsed=Math.max(0,time-e.at);
  if(elapsed<e.unload)return {position:{...e.from},height:0,
    worldYaw:e.fromYaw,phase:'unloading',contact:true};
  const progress=(elapsed-e.unload)/e.swing;
  if(progress<1){
    const t=clamp(progress,0,1),k=smooth(t);
    return {position:{x:e.from.x+(e.to.x-e.from.x)*k,
      y:e.from.y+(e.to.y-e.from.y)*k},
      height:Math.sin(Math.PI*t)*e.lift,
      worldYaw:e.fromYaw+angular(e.fromYaw,e.toYaw)*k,
      phase:'swinging',contact:false};
  }
  return {position:{...e.to},height:0,worldYaw:e.toYaw,
    phase:elapsed<e.unload+e.swing+.035?'landing':'planted',
    contact:true};
}
export class ReplayMotionRecorder{
  private actors=new Map<string,ActorTrack>();
  private doors=new Map<string,{at:number;open:boolean}[]>();
  record(time:number,actors:readonly TeamActor[],doors:readonly Door[]):void{
    for(const actor of actors){
      const position={x:actor.p.x,y:actor.p.y};
      let track=this.actors.get(actor.id);
      if(!track){
        track={gait:createFootstepScheduler(),events:[[],[]],
          last:{...position,t:time},travelYaw:actor.heading,
          lastStepAt:-100};
        this.actors.set(actor.id,track);
      }
      const distance=Math.hypot(position.x-track.last.x,
        position.y-track.last.y);
      if(distance>1e-4&&time>track.last.t){
        track.travelYaw=Math.atan2(position.y-track.last.y,
          position.x-track.last.x);
      }
      // Track the true motor direction, not the displacement between
      // unrelated rendered frames (often identical in the 20Hz film).
      const moving=actor.velocity/72;
      const rootYaw=-(moving>.22?track.travelYaw:actor.heading);
      const input:FootstepInput={time,position,rootYaw,
        travelYaw:track.travelYaw,speed:actor.velocity,
        turning:actor.turning,posture:actor.posture,
        injury:actor.injuryStage,down:actor.health<=0,
        cautious:actor.aim>.20&&moving<.35};
      const previousResets=track.gait.resets;
      const previousStep=track.gait.lastStepAt;
      advanceFootsteps(track.gait,input);
      if(track.gait.resets!==previousResets){
        for(let i=0;i<2;i++){
          const foot=track.gait.feet[i];
          track.events[i].push(footMark(time,foot.plantedAt,foot.worldYaw));
        }
      }
      if(track.gait.lastStepAt!==previousStep&&
        track.gait.lastStepAt===time){
        const bounds=gaitBounds(input),i=track.gait.lastStepFoot;
        const foot=track.gait.feet[i];
        track.events[i].push({at:time,from:{...foot.swingFrom},
          to:{...foot.swingTo},fromYaw:foot.fromYaw,
          toYaw:foot.targetYaw,unload:bounds.unloadDuration,
          swing:bounds.swingDuration,lift:input.cautious?2.1:3.4});
      }
      track.last={...position,t:time};
    }
    for(const door of doors){
      let events=this.doors.get(door.id);
      if(!events){events=[];this.doors.set(door.id,events);}
      if(!events.length||events[events.length-1].open!==door.open)
        events.push({at:time,open:door.open});
    }
  }
  direction(id:string):number|undefined{return this.actors.get(id)?.travelYaw;}
  presentation(time:number,ids:readonly string[]):ReplayPresentation{
    const feet:Record<string,ReplayFeet>={};
    const travelYaw:Record<string,number>={};
    for(const id of ids){
      const track=this.actors.get(id);
      if(!track||!track.events[0].length)continue;
      feet[id]=[sampleFootEvents(track.events[0],time),
        sampleFootEvents(track.events[1],time)];
      // Travel is reconstructed from the recorded frame motion for a
      // particular timestamp in replay.ts; this is a fallback only.
      travelYaw[id]=track.travelYaw;
    }
    const doors:Record<string,number>={};
    for(const [id,events] of this.doors){
      let lo=0,hi=events.length-1;
      while(lo<hi){
        const mid=Math.ceil((lo+hi)/2);
        if(events[mid].at<=time)lo=mid;else hi=mid-1;
      }
      const e=events[lo];if(!e)continue;
      const previous=lo>0?Number(events[lo-1].open):Number(e.open);
      doors[id]=previous+(Number(e.open)-previous)*
        smooth(clamp((time-e.at)/.18,0,1));
    }
    return {feet,travelYaw,doors};
  }
  /** Approximate memory accounting for perf diagnostics, not a byte profiler. */
  get stepEventCount(){
    let count=0;for(const t of this.actors.values())
      count+=t.events[0].length+t.events[1].length;
    return count;
  }
}
