/** Replay R3 Plan vs Reality: actual traveled position facts.
 * Authored plans are deliberately NOT inputs — the recorder is authority.
 */
import type {ReplayFrame} from './breach-replay.ts';
import type {Pt} from './breach-core.ts';
export type ReplayTrailPoint={
  t:number;p:Pt;pace:string;posture:string
};
const copy=(p:Pt)=>({x:p.x,y:p.y});
type TrailWindowCursor={begin:number;end:number;ordered:boolean};
const precedes=(t:number,limit:number,inclusive:boolean)=>
  inclusive?t<=limit:t<limit;
export class ReplayMovementHistory{
  private readonly tracks=new Map<string,ReplayTrailPoint[]>();
  /** Seek positions belong to this immutable replay history, never the actor ID
   * globally. No per-frame trail array or rendered geometry is retained. */
  private readonly windowCursors=new Map<string,TrailWindowCursor>();
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
    // Histories are built once. A malformed V1 film with unordered or
    // nonfinite dates keeps the exact old binary search on every query.
    for(const [id,points] of this.tracks){
      let ordered=Number.isFinite(points[0].t);
      for(let i=1;ordered&&i<points.length;i++)
        if(!Number.isFinite(points[i].t)||
           !(points[i-1].t<=points[i].t))ordered=false;
      this.windowCursors.set(id,{begin:0,end:0,ordered});
    }
  }
  /** Original lower/upper bound is authoritative on timeline jumps and old
   * malformed histories. Nearby playback frames reuse only a locally proven
   * bracket, preserving duplicates and the first preceding trail point. */
  private windowBound(points:readonly ReplayTrailPoint[],limit:number,
    inclusive:boolean,cursor:TrailWindowCursor|undefined):number{
    const length=points.length,side=inclusive?'end':'begin';
    if(cursor?.ordered&&Number.isFinite(limit)){
      const i=cursor[side];
      if((i===0||precedes(points[i-1].t,limit,inclusive))&&
         (i===length||!precedes(points[i].t,limit,inclusive)))return i;
      if(i<length&&precedes(points[i].t,limit,inclusive)&&
         (i+1===length||!precedes(points[i+1].t,limit,inclusive)))
        return cursor[side]=i+1;
      if(i>0&&!precedes(points[i-1].t,limit,inclusive)&&
         (i===1||precedes(points[i-2].t,limit,inclusive)))
        return cursor[side]=i-1;
    }
    let lo=0,hi=length;
    while(lo<hi){
      const mid=(lo+hi)>>>1;
      if(precedes(points[mid].t,limit,inclusive))lo=mid+1;else hi=mid;
    }
    if(cursor)cursor[side]=lo;
    return lo;
  }
  /** Bounded renderer window; never return future positions or mutate film. */
  segment(actorId:string,time:number,seconds:number,
    maxPoints=400):ReplayTrailPoint[]{
    const all=this.tracks.get(actorId)??[];
    if(!all.length||time<all[0].t)return [];
    const before=Number.isFinite(seconds)?Math.max(0,time-seconds):0;
    const cursor=this.windowCursors.get(actorId);
    const start=Math.max(0,this.windowBound(all,before,false,cursor)-1);
    const end=this.windowBound(all,time,true,cursor);
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
