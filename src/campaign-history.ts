/** Retrospective campaign history; never leaks hidden mission events into live intel. */
import type {CampaignState,CareerEvent} from './campaign-state.ts';
import type {BattleEvent} from './breach-combat.ts';
const NOTE_KINDS=new Set<BattleEvent['kind']>(['wound','down','objective','intel','surrender','door']);
export function careerEventsForOperation(c:CampaignState,operationId:string,
 events:readonly BattleEvent[],slotToCareer:Record<string,string>={}):CareerEvent[]{
 const friendly=new Set(c.operators.map(o=>o.id));
 const counts=new Map<string,number>();
 const found:CareerEvent[]=[];
 for(const event of events){
  const id=event.actor?slotToCareer[event.actor]??event.actor:undefined;
  if(!id||!friendly.has(id)||!NOTE_KINDS.has(event.kind))continue;
  const key=id+':'+event.kind,prior=counts.get(key)??0;
  if(prior>=2)continue;
  counts.set(key,prior+1);
  found.push({id:operationId+'-event-'+event.id,day:c.day,
   operatorId:id,operationId,kind:event.kind,detail:event.text.slice(0,140)});
 }
 return found.slice(0,18);
}
export function sharedService(c:CampaignState,id:string):{id:string;count:number}[]{
 const connections=new Map<string,number>();
 for(const r of c.history){
  if(!r.participatingIds.includes(id))continue;
  for(const other of r.participatingIds){
   if(other===id)continue;
   connections.set(other,(connections.get(other)??0)+1);
  }
 }
 return [...connections.entries()].filter(([,count])=>count>=2)
  .map(([person,count])=>({id:person,count})).sort((a,b)=>b.count-a.count);
}
