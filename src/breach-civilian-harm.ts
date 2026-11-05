/** E5-C3: simulation-authoritative civilian harm and shooter attribution.
 * This metadata is for debrief/replay, never a live fog contact. */
import type {Pt} from './breach-core.ts';
export type CivilianHarmEvent={
 id:number;shotId:number;at:number;victimId:string;actorId:string;
 sourceSide:'blue'|'red';before:number;after:number;
 severity:'injured'|'incapacitated';p:Pt;
};
export function recordCivilianHarm(events:CivilianHarmEvent[],
 candidate:CivilianHarmEvent):boolean{
 if(candidate.after>=candidate.before||
    events.some(e=>e.shotId===candidate.shotId))return false;
 events.push({...candidate,p:{...candidate.p}});
 if(events.length>160)events.splice(0,events.length-160);
 return true;
}
export function attributableCivilianHarm(events:readonly CivilianHarmEvent[]){
 const states=new Map<string,CivilianHarmEvent['severity']>();
 for(const e of events){
  if(e.sourceSide!=='blue')continue;
  const before=states.get(e.victimId);
  if(before!=='incapacitated')
    states.set(e.victimId,e.severity);
 }
 return {
  injured:[...states.values()].filter(x=>x==='injured').length,
  down:[...states.values()].filter(x=>x==='incapacitated').length
 };
}
