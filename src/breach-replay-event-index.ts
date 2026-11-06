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

export class ReplayEventIndex{
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
  }
  /** Greatest event with t <= time. */
  latest(time:number):ReplayIndexedEvent|null{
    const items=this.all;
    let lo=0,hi=items.length;
    while(lo<hi){
      const mid=(lo+hi)>>>1;
      if(items[mid].t<=time)lo=mid+1;else hi=mid;
    }
    return items[lo-1]??null;
  }
  next(time:number,tolerance=.15):ReplayIndexedEvent|null{
    const items=this.navigation,target=time+tolerance;
    let lo=0,hi=items.length;
    while(lo<hi){
      const mid=(lo+hi)>>>1;
      if(items[mid].t<=target)lo=mid+1;else hi=mid;
    }
    return items[lo]??null;
  }
  previous(time:number,tolerance=.15):ReplayIndexedEvent|null{
    const items=this.navigation,target=time-tolerance;
    let lo=0,hi=items.length;
    while(lo<hi){
      const mid=(lo+hi)>>>1;
      if(items[mid].t<target)lo=mid+1;else hi=mid;
    }
    return items[lo-1]??null;
  }
}
