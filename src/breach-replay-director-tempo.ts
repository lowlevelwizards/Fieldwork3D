/** R9: conservative, retrospective Director-only dead-time edits.
 * No source frames/timestamps are altered. Manual transport and other replay
 * cameras continue to expose the full immutable film. */
import type {ReplayFrame} from './breach-replay.ts';
import type {ExecutionEvent} from './breach-execution-events.ts';

export type DirectorTempoEdit={
  sourceStart:number;sourceEnd:number;
  actorIds:string[];kind:'confirmed-obstruction';reason:string;
};
const distance=(a:{x:number;y:number},b:{x:number;y:number})=>
  Math.hypot(a.x-b.x,a.y-b.y);
const obstructed=(e:ExecutionEvent)=>(
  (e.kind==='blocked'||e.kind==='recovering')&&
  (e.reason==='traffic-stall'||e.reason==='movement'||
   e.reason.startsWith('collision-')));
const significant=(frame:ReplayFrame,id:string)=>frame.actors.some(a=>
  a.id===id&&(a.reload||a.treatmentActive||a.traversal||
    a.health<=0));
const actorAt=(frame:ReplayFrame,id:string)=>
  frame.actors.find(a=>a.id===id);
const movingOrder=(frame:ReplayFrame,id:string):boolean=>{
  const a=actorAt(frame,id);
  return !!a?.plan?.some(n=>['move','door'].includes(n.kind)&&
    Number.isFinite(n.p?.x)&&distance(n.p,a.p)>18);
};

/** Sparse event transitions are paired by actor/order. A blocked status
 * without a recorded resolution is NOT assumed to have ended. */
export function buildDirectorTempoEdits(
  frames:readonly ReplayFrame[],
  execution:readonly ExecutionEvent[],
  battle:readonly {t:number}[],
  friendlyIds:ReadonlySet<string>
):DirectorTempoEdit[]{
  if(frames.length<4||!execution.length)return [];
  const ordered=execution.filter(e=>Number.isFinite(e.t)).slice()
    .sort((a,b)=>a.t-b.t||a.id-b.id);
  const sorted=frames.slice().sort((a,b)=>a.t-b.t);
  const active=new Map<string,ExecutionEvent>();
  const episodes:{begin:ExecutionEvent;end:ExecutionEvent}[]=[];
  for(const e of ordered){
    const key=e.actor+'|'+String(e.orderId);
    if(obstructed(e)){
      if(!active.has(key)&&friendlyIds.has(e.actor)&&e.orderId!==null)
        active.set(key,e);
    }else if(e.kind==='resumed'||e.kind==='completed'){
      const begin=active.get(key);
      if(begin&&e.t>begin.t)episodes.push({begin,end:e});
      active.delete(key);
    }else if(e.kind==='started'||e.kind==='holding'){
      active.delete(key);
    }
  }
  const edits:DirectorTempoEdit[]=[];
  for(const {begin,end} of episodes){
    const first=begin.t+.95,last=end.t-.75;
    if(last-first<2||end.t-begin.t<3.5)continue;
    const relevant=sorted.filter(f=>f.t>=begin.t-.05&&
      f.t<=end.t+.05);
    if(relevant.length<5)continue;
    const initial=relevant[0],final=relevant.at(-1)!;
    if(!movingOrder(initial,begin.actor)||!movingOrder(final,begin.actor))
      continue;
    const startActor=actorAt(initial,begin.actor);
    const endActor=actorAt(final,begin.actor);
    if(!startActor||!endActor||
      distance(startActor.p,endActor.p)>5)continue;
    let bounds=0,path=0,lastPosition=startActor.p;
    let invalid=false;
    for(const frame of relevant){
      const actor=actorAt(frame,begin.actor);
      if(!actor||significant(frame,begin.actor)){
        invalid=true;break;
      }
      bounds=Math.max(bounds,distance(actor.p,startActor.p));
      path+=distance(actor.p,lastPosition);lastPosition=actor.p;
      if(bounds>8||path>25){invalid=true;break;}
      // An unrelated operator can make the scene meaningful while our
      // nominated protagonist is stuck. Never remove the team's action.
      for(const other of initial.actors){
        if(!friendlyIds.has(other.id)||other.id===begin.actor)continue;
        const observed=actorAt(frame,other.id);
        if(!observed||distance(other.p,observed.p)>8){
          invalid=true;break;
        }
      }
      if(invalid)break;
      for(const civilian of initial.civilians??[]){
        const observed=frame.civilians?.find(c=>c.id===civilian.id);
        if(!observed||distance(civilian.p,observed.p)>8){
          invalid=true;break;
        }
      }
      if(invalid)break;
    }
    if(invalid)continue;
    // Conservative veto: any actual battle outcome, interaction or other
    // execution transition in the interval disqualifies this time edit.
    if(battle.some(e=>e.t>=begin.t-1.5&&e.t<=end.t+.5))continue;
    if(ordered.some(e=>e.id!==begin.id&&e.id!==end.id&&
      e.t>=begin.t-.2&&e.t<=end.t+.2&&
      (e.actor!==begin.actor||!obstructed(e))))continue;
    edits.push({sourceStart:first,sourceEnd:last,
      actorIds:[begin.actor],kind:'confirmed-obstruction',
      reason:begin.reason});
  }
  // Keep distinct, non-overlapping verified intervals. The largest
  // safe removal wins when simultaneous blocked episodes overlap.
  const candidates=edits.sort((a,b)=>
    (b.sourceEnd-b.sourceStart)-(a.sourceEnd-a.sourceStart)||
    a.sourceStart-b.sourceStart);
  const kept:DirectorTempoEdit[]=[];
  for(const e of candidates){
    if(kept.every(prior=>e.sourceEnd<=prior.sourceStart||
      e.sourceStart>=prior.sourceEnd))kept.push(e);
  }
  return kept.sort((a,b)=>a.sourceStart-b.sourceStart);
}
/** Only crossing a cut boundary during normal linear playback may jump.
 * A manual seek into the middle of a skipped period stays there. */
export function directorTempoJump(
  edits:readonly DirectorTempoEdit[],from:number,to:number
):DirectorTempoEdit|null{
  if(!Number.isFinite(from)||!Number.isFinite(to)||to<=from)return null;
  return edits.find(e=>from<=e.sourceStart&&to>=e.sourceStart&&
    e.sourceEnd>to)||null;
}
