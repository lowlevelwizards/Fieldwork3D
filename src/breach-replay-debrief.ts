/** Replay R4: concise after-action moments and friendly execution diagnostics.
 * All highlights are selected from a caller-disclosed event index. Never
 * query live simulation state or infer an unseen threat from future frames.
 */
import type {ReplayIndexedEvent} from './breach-replay-event-index.ts';
import type {ExecutionEvent} from './breach-execution-events.ts';

export type ReplayDebriefMoment={
  key:string;t:number;kind:string;label:string;detail:string;
  actor?:string;weight:number;
};
export type ReplayExecutionInsight={
  actor:string;orderId:number|null;t:number;end:number|null;
  reason:string;detail:string;kind:'blocked'|'waiting'|'recovering';
  seconds:number|null;
};
const categories:Record<string,{label:string;weight:number;bucket:string}>={
  intel:{label:'FIRST CONTACT',weight:10,bucket:'contact'},
  down:{label:'OPERATOR / THREAT DOWN',weight:10,bucket:'casualty'},
  wound:{label:'WOUND',weight:9,bucket:'casualty'},
  objective:{label:'OBJECTIVE',weight:9,bucket:'objective'},
  blocked:{label:'MOVEMENT BLOCKED',weight:8,bucket:'movement'},
  flash:{label:'FLASHBANG',weight:7,bucket:'flash'},
  surrender:{label:'SURRENDER',weight:7,bucket:'surrender'},
  door:{label:'ENTRY / DOOR',weight:6,bucket:'door'},
  shot:{label:'FIRST SHOTS',weight:5,bucket:'gunfire'},
  completed:{label:'ORDERS COMPLETE',weight:3,bucket:'orders'}
};
/** A maximum of one representative per category. Coverage matters more than
 * a flood of shots; ties favor the earliest historical event.
 * The start marker and outcome are deliberately not invented.
 */
export function buildReplayDebrief(
  disclosed:readonly ReplayIndexedEvent[],duration:number,limit=6
):ReplayDebriefMoment[]{
  if(!Number.isFinite(duration)||duration<=0||limit<=0)return [];
  const representative=new Map<string,ReplayDebriefMoment>();
  for(const e of disclosed){
    const kind=categories[e.kind];
    if(!kind||!Number.isFinite(e.t)||e.t<0||e.t>duration)continue;
    const candidate:ReplayDebriefMoment={
      key:e.key,t:e.t,kind:e.kind,label:kind.label,
      detail:e.text,actor:e.actor,weight:kind.weight
    };
    const prior=representative.get(kind.bucket);
    if(!prior||candidate.weight>prior.weight||
      candidate.weight===prior.weight&&candidate.t<prior.t)
      representative.set(kind.bucket,candidate);
  }
  return [...representative.values()]
    .sort((a,b)=>b.weight-a.weight||a.t-b.t)
    .slice(0,Math.max(0,Math.floor(limit)))
    .sort((a,b)=>a.t-b.t||b.weight-a.weight);
}
/** Execution stalls are paired ONLY with same-actor, same-order resolutions.
 * An absent resolution means "not recorded", not that an operator was stuck
 * forever. All durations are observational, never hypothetical route delays.
 */
export function buildReplayExecutionInsights(
  events:readonly ExecutionEvent[],duration:number,limit=4
):ReplayExecutionInsight[]{
  if(!Number.isFinite(duration)||duration<0||limit<=0)return [];
  const sorted=events.filter(e=>Number.isFinite(e.t)&&e.t>=0&&e.t<=duration)
    .slice().sort((a,b)=>a.t-b.t||a.id-b.id);
  const result:ReplayExecutionInsight[]=[];
  const active=new Map<string,number>();
  for(const e of sorted){
    const key=e.actor+'|'+String(e.orderId);
    if(e.kind==='blocked'||e.kind==='waiting'||e.kind==='recovering'){
      const previous=active.get(key);
      if(previous!==undefined){
        const prior=result[previous];
        // Different reason/state at the same moment still belongs to
        // the same unresolved interruption rather than double-counting.
        if(prior.end===null)continue;
      }
      active.set(key,result.length);
      result.push({actor:e.actor,orderId:e.orderId,t:e.t,
        end:null,reason:e.reason,detail:e.text,kind:e.kind,
        seconds:null});
    }else if(e.kind==='resumed'||e.kind==='completed'){
      const index=active.get(key);
      if(index===undefined)continue;
      const prior=result[index];
      if(prior.end!==null)continue;
      prior.end=e.t;prior.seconds=Math.max(0,e.t-prior.t);
      active.delete(key);
    }
  }
  return result.sort((a,b)=>{
    // Unresolved interruption is worth inspection, not a fabricated duration.
    const score=(x:ReplayExecutionInsight)=>x.end===null?1e9:x.seconds??0;
    return score(b)-score(a)||a.t-b.t;
  }).slice(0,Math.max(0,Math.floor(limit))).sort((a,b)=>a.t-b.t);
}
