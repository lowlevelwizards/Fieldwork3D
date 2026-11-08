/** R7 cinematic look-ahead. Event index MUST already be filtered through
 * the selected historical disclosure policy. Future event coordinates never
 * enter camera scoring; only a named friendly participant can be anticipated.
 */
import type {ReplayIndexedEvent} from './breach-replay-event-index.ts';

export type DirectorFutureCue={
  t:number;actorId:string;kind:'breach'|'contact'|'casualty'|'objective';
  lead:number;weight:number
};
const profile:Record<string,{kind:DirectorFutureCue['kind'];lead:number;weight:number}>={
  door:{kind:'breach',lead:1.7,weight:4},
  interaction:{kind:'breach',lead:1.4,weight:3},
  shot:{kind:'contact',lead:1.35,weight:6},
  wound:{kind:'contact',lead:.85,weight:7},
  down:{kind:'casualty',lead:.8,weight:8},
  flash:{kind:'breach',lead:1.45,weight:5},
  objective:{kind:'objective',lead:2,weight:6}
};
export function buildDirectorFutureCues(
  events:readonly ReplayIndexedEvent[],
  friendlyIds:ReadonlySet<string>):DirectorFutureCue[]{
  const cues:DirectorFutureCue[]=[];
  for(const event of events){
    if(!event.actor||!friendlyIds.has(event.actor))continue;
    const p=profile[event.kind];
    if(!p||!Number.isFinite(event.t))continue;
    cues.push({t:event.t,actorId:event.actor,kind:p.kind,
      lead:p.lead,weight:p.weight});
  }
  return cues.sort((a,b)=>a.t-b.t||b.weight-a.weight);
}
/** Only a short, bounded amount of look-ahead. Do not use future enemy
 * coordinates, even under Full Sight; that belongs to the visibility engine.
 */
export function directorFutureAt(time:number,
  cues:readonly DirectorFutureCue[]):DirectorFutureCue|null{
  let lo=0,hi=cues.length;
  while(lo<hi){
    const i=(lo+hi)>>>1;
    if(cues[i].t<time)lo=i+1;else hi=i;
  }
  let best:DirectorFutureCue|null=null;
  for(let i=lo;i<cues.length&&cues[i].t-time<=2.1;i++){
    const cue=cues[i];
    if(cue.t-time>cue.lead)continue;
    if(!best||cue.weight>best.weight||
      (cue.weight===best.weight&&cue.t<best.t))best=cue;
  }
  return best;
}
