/** Replay R2: stable once-built timeline indexes. No per-RAF sorting. */
import type {BattleEvent} from './breach-combat.ts';
import type {ExecutionEvent} from './breach-execution-events.ts';
import type {Pt} from './breach-core.ts';

export type ReplayIndexedEvent={
  key:string;source:'battle'|'execution';
  t:number;kind:string;actor?:string;p?:Pt;text:string;
  order:number;
};
const isSignificant=(e:ExecutionEvent)=>
  e.kind==='blocked'||e.kind==='resumed'||e.kind==='completed';
type EventSeekCursor={index:number;ordered:boolean};
const eventBefore=(items:readonly ReplayIndexedEvent[],index:number,
  target:number,strict:boolean)=>strict?
  items[index].t<target:items[index].t<=target;
/** Original binary bounds are authoritative on jumps, rewinds, nonfinite
 * queries and unusual historical archives. A cursor only skips them when the
 * exact bound is proven by a local chronological bracket. */
function eventBound(items:readonly ReplayIndexedEvent[],target:number,
  strict:boolean,cursor:EventSeekCursor):number{
  const length=items.length;
  if(cursor.ordered&&Number.isFinite(target)){
    const i=cursor.index;
    if((i===0||eventBefore(items,i-1,target,strict))&&
       (i===length||!eventBefore(items,i,target,strict)))return i;
    if(i<length&&eventBefore(items,i,target,strict)&&
       (i+1===length||!eventBefore(items,i+1,target,strict)))
      return cursor.index=i+1;
    if(i>0&&!eventBefore(items,i-1,target,strict)&&
       (i===1||eventBefore(items,i-2,target,strict)))
      return cursor.index=i-1;
  }
  let lo=0,hi=length;
  while(lo<hi){
    const mid=(lo+hi)>>>1;
    if(strict?items[mid].t<target:items[mid].t<=target)lo=mid+1;
    else hi=mid;
  }
  cursor.index=lo;
  return lo;
}
function orderedFinite(items:readonly ReplayIndexedEvent[]):boolean{
  for(let i=0;i<items.length;i++)
    if(!Number.isFinite(items[i].t)||
       (i>0&&!(items[i-1].t<=items[i].t)))return false;
  return true;
}

export class ReplayEventIndex{
  private readonly latestCursor:EventSeekCursor={index:0,ordered:false};
  private readonly nextCursor:EventSeekCursor={index:0,ordered:false};
  private readonly previousCursor:EventSeekCursor={index:0,ordered:false};
  readonly all:readonly ReplayIndexedEvent[];
  readonly navigation:readonly ReplayIndexedEvent[];
  readonly markers:readonly ReplayIndexedEvent[];
  constructor(battle:readonly BattleEvent[],execution:readonly ExecutionEvent[],
    allow?:(event:ReplayIndexedEvent)=>boolean){
    const records:ReplayIndexedEvent[]=[
      ...battle.map((e,i)=>({
        key:'battle:'+e.id,source:'battle' as const,
        t:e.t,kind:e.kind,actor:e.actor,p:e.p,text:e.text,order:i
      })),
      ...execution.filter(isSignificant).map((e,i)=>({
        key:'execution:'+e.id,source:'execution' as const,
        t:e.t,kind:e.kind,actor:e.actor,p:e.p,text:e.text,
        order:battle.length+i
      }))
    ];
    records.sort((a,b)=>a.t-b.t||a.order-b.order);
    const displayed=allow?records.filter(allow):records;
    this.all=displayed;
    this.navigation=displayed.filter(e=>e.kind!=='shot');
    let lastShot=-Infinity;
    this.markers=displayed.filter(e=>{
      if(e.kind!=='shot')return true;
      if(e.t-lastShot<3)return false;
      lastShot=e.t;return true;
    });
    // Sorted normal recordings seek locally. Nonfinite legacy event times
    // preserve original binary-search results without repair or reordering.
    this.latestCursor.ordered=orderedFinite(this.all);
    this.nextCursor.ordered=this.previousCursor.ordered=
      orderedFinite(this.navigation);
  }
  /** Greatest event with t <= time. */
  latest(time:number):ReplayIndexedEvent|null{
    const items=this.all;
    return items[eventBound(items,time,false,this.latestCursor)-1]??null;
  }
  next(time:number,tolerance=.15):ReplayIndexedEvent|null{
    const items=this.navigation;
    return items[eventBound(items,time+tolerance,false,this.nextCursor)]??null;
  }
  previous(time:number,tolerance=.15):ReplayIndexedEvent|null{
    const items=this.navigation;
    return items[eventBound(items,time-tolerance,true,this.previousCursor)-1]??null;
  }
}
