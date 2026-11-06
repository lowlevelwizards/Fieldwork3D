/** Replay R3 Plan vs Reality: actual traveled position facts.
 * Authored plans are deliberately NOT inputs — the recorder is authority.
 */
import type {ReplayFrame} from './breach-replay.ts';
import type {Pt} from './breach-core.ts';
export type ReplayTrailPoint={
  t:number;p:Pt;pace:string;posture:string
};
const copy=(p:Pt)=>({x:p.x,y:p.y});
export class ReplayMovementHistory{
  private readonly tracks=new Map<string,ReplayTrailPoint[]>();
  constructor(frames:readonly ReplayFrame[],actorIds:readonly string[]){
    const wanted=new Set(actorIds);
    for(const f of frames){
      for(const actor of f.actors){
        if(!wanted.has(actor.id))continue;
        let points=this.tracks.get(actor.id);
        if(!points){points=[];this.tracks.set(actor.id,points);}
        const last=points.at(-1);
        if(last&&Math.hypot(actor.p.x-last.p.x,actor.p.y-last.p.y)<3&&
          f.t-last.t<.5)continue;
        points.push({t:f.t,p:copy(actor.p),pace:actor.pace,
          posture:actor.posture});
      }
    }
  }
  /** Bounded renderer window; never return future positions or mutate film. */
  segment(actorId:string,time:number,seconds:number,
    maxPoints=400):ReplayTrailPoint[]{
    const all=this.tracks.get(actorId)??[];
    if(!all.length||time<all[0].t)return [];
    const before=Number.isFinite(seconds)?Math.max(0,time-seconds):0;
    let lo=0,hi=all.length;
    while(lo<hi){const mid=(lo+hi)>>>1;
      if(all[mid].t<before)lo=mid+1;else hi=mid;
    }
    const start=Math.max(0,lo-1);
    lo=0;hi=all.length;
    while(lo<hi){const mid=(lo+hi)>>>1;
      if(all[mid].t<=time)lo=mid+1;else hi=mid;
    }
    const end=lo;
    if(end<=start)return [];
    const count=end-start;
    const step=Math.max(1,Math.ceil(count/Math.max(2,maxPoints)));
    const out:ReplayTrailPoint[]=[];
    for(let i=start;i<end;i+=step)out.push(all[i]);
    if(out.at(-1)!==all[end-1])out.push(all[end-1]);
    return out;
  }
  get count(){return [...this.tracks.values()].reduce((n,a)=>n+a.length,0);}
}
