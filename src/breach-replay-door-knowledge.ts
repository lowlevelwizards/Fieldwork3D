/** R4.2c: observed door state is not omniscient live door state.
 * Sparse changes are sampled only by a real operator through simulation LOS.
 * History can be queried at any playback time without future knowledge.
 */
import {doorCenter} from './breach-core.ts';
import {team,observerPointVisible,type Session,type TeamActor} from './breach-game.ts';
import type {Door} from './breach-core.ts';

export type ReplayDoorObservation={
  at:number;observerId:string;doorId:string;
  openFraction:number;glassShattered:boolean;wedged:boolean;locked:boolean;
};
const signature=(o:ReplayDoorObservation)=>
  [Math.round(o.openFraction*20),+o.glassShattered,+o.wedged,+o.locked].join(':');
/** At most one LOS pass per 0.12 simulation seconds; no extra render queries. */
export class ReplayDoorObservationRecorder {
  readonly observations:ReplayDoorObservation[]=[];
  private lastSampleAt=-Infinity;
  private readonly prior=new Map<string,string>();
  capture(s:Session,
    canObserve:(s:Session,observer:TeamActor,door:Door)=>boolean=
      (session,observer,door)=>
        observerPointVisible(session,observer,doorCenter(door))
  ):void{
    if(!Number.isFinite(s.seconds)||s.seconds<0||
      s.seconds<this.lastSampleAt+.12)return;
    this.lastSampleAt=s.seconds;
    for(const observer of team(s)){
      if(observer.health<=0)continue;
      for(const door of s.doors){
        if(!canObserve(s,observer,door))continue;
        const record:ReplayDoorObservation={
          at:s.seconds,observerId:observer.id,doorId:door.id,
          openFraction:door.openFraction??(door.open?1:0),
          glassShattered:!!door.glassShattered,
          wedged:!!door.wedged,locked:!!door.locked
        };
        const key=observer.id+'\u0000'+door.id,now=signature(record);
        if(this.prior.get(key)===now)continue;
        this.prior.set(key,now);
        this.observations.push(record);
      }
    }
  }
}
/** Per-observer, per-door binary seek never reveals the next observation. */
export class ReplayDoorKnowledgeHistory {
  private readonly byKey=new Map<string,ReplayDoorObservation[]>();
  constructor(events:readonly ReplayDoorObservation[]){
    for(const event of events){
      const key=event.observerId+'\u0000'+event.doorId;
      let row=this.byKey.get(key);
      if(!row){row=[];this.byKey.set(key,row);}
      row.push(event);
    }
    for(const row of this.byKey.values())row.sort((a,b)=>a.at-b.at);
  }
  at(time:number,observerId:string,doorId:string):ReplayDoorObservation|null{
    if(!Number.isFinite(time)||time<0)return null;
    const events=this.byKey.get(observerId+'\u0000'+doorId);
    if(!events?.length)return null;
    let lo=0,hi=events.length;
    while(lo<hi){
      const mid=(lo+hi)>>>1;
      if(events[mid].at<=time)lo=mid+1;
      else hi=mid;
    }
    return lo?events[lo-1]:null;
  }
}
