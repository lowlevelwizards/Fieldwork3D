import {normalizeWindowCovering,type WindowCovering} from './breach-window-coverings.ts';
/** Replay R4.3b: individual observed window states, not global replay
 * hindsight. A missing observation means unknown, NOT current world truth.
 * Sparse changes are captured only from live authoritative sight, never
 * re-simulated in the replay renderer.
 */
import {team,observerPointVisible,type Session,type TeamActor}
  from './breach-game.ts';
import type {WindowState} from './breach-windows.ts';

export type ReplayWindowObservation={
  at:number;observerId:string;windowId:string;
  open:boolean;shattered:boolean;covering?:WindowCovering;
};
export class ReplayWindowObservationRecorder {
  readonly observations:ReplayWindowObservation[]=[];
  private lastSampleAt=-Infinity;
  private readonly previous=new Map<string,string>();
  capture(s:Session,
    canObserve:(s:Session,actor:TeamActor,window:WindowState)=>boolean=
      (session,actor,window)=>
        observerPointVisible(session,actor,{x:window.x,y:window.y})||
        (actor.physicalContact?.intent==='covering'&&actor.physicalContact.anchor.id==='covering:'+window.id&&
          (actor.physicalContact.releasedAt===null||session.seconds-actor.physicalContact.releasedAt<.3))
  ):void{
    if(!Number.isFinite(s.seconds)||s.seconds<0||
      s.seconds<this.lastSampleAt+.12)return;
    this.lastSampleAt=s.seconds;
    for(const observer of team(s)){
      if(observer.health<=0)continue;
      for(const window of s.windows){
        if(!canObserve(s,observer,window))continue;
        const key=observer.id+'\u0000'+window.id;
        const covering=normalizeWindowCovering(window);
        const signature=String(+window.open)+':'+String(+window.shattered)+':'+JSON.stringify(covering??null);
        if(this.previous.get(key)===signature)continue;
        this.previous.set(key,signature);
        this.observations.push({at:s.seconds,observerId:observer.id,
          windowId:window.id,open:window.open,shattered:window.shattered,...(covering?{covering}:{})});
      }
    }
  }
}
export class ReplayWindowKnowledgeHistory {
  private readonly byKey=new Map<string,ReplayWindowObservation[]>();
  constructor(events:readonly ReplayWindowObservation[]){
    for(const event of events){
      const key=event.observerId+'\u0000'+event.windowId;
      let row=this.byKey.get(key);
      if(!row){row=[];this.byKey.set(key,row);}
      row.push(event);
    }
    for(const row of this.byKey.values())row.sort((a,b)=>a.at-b.at);
  }
  at(time:number,observerId:string,windowId:string)
    :ReplayWindowObservation|null{
    if(!Number.isFinite(time)||time<0)return null;
    const events=this.byKey.get(observerId+'\u0000'+windowId);
    if(!events?.length)return null;
    let lo=0,hi=events.length;
    while(lo<hi){
      const mid=(lo+hi)>>>1;
      if(events[mid].at<=time)lo=mid+1;else hi=mid;
    }
    return lo?events[lo-1]:null;
  }
}
