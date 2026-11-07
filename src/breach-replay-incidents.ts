/** R4.1: bounded, deterministic incidents from already-disclosed film events.
 * This module never asks the live simulation about historical visibility.
 * Proximity is association, not proof of causation.
 */
import type {ReplayIndexedEvent} from './breach-replay-event-index.ts';

export type ReplayIncident={
  id:string;start:number;end:number;eventKeys:string[];
  actorIds:string[];kind:string;label:string;summary:string;
  score:number;eventCount:number;
};
type Working={
  start:number;end:number;events:ReplayIndexedEvent[];
  x:number;y:number;positionCount:number;actors:Set<string>;
};
export const INCIDENT_GAP_SECONDS=3;
export const INCIDENT_RADIUS=140;
export const INCIDENT_MAX_SECONDS=12;
const priorities:Record<string,number>={
  down:10,wound:9,objective:9,intel:8,flash:7,surrender:7,
  blocked:6,recovering:5,door:4,shot:3,completed:2,
  reload:1,interaction:2
};
const kinds=new Set(Object.keys(priorities));
const tags=(events:readonly ReplayIndexedEvent[])=>{
  const counts=new Map<string,number>();
  for(const e of events)counts.set(e.kind,(counts.get(e.kind)??0)+1);
  return counts;
};
const count=(m:ReadonlyMap<string,number>,kind:string)=>m.get(kind)??0;
function nameFor(m:ReadonlyMap<string,number>):{kind:string;label:string}{
  if(count(m,'objective'))return {kind:'objective',label:'OBJECTIVE REACHED'};
  if(count(m,'down')||count(m,'wound')){
    return {kind:'casualty',label:count(m,'shot')?
      'CASUALTY DURING ENGAGEMENT':'CASUALTY REPORTED'};
  }
  if(count(m,'intel')&&count(m,'door'))return {kind:'contact',label:'CONTACT AT ENTRY'};
  if(count(m,'intel'))return {kind:'contact',label:'CONTACT REPORTED'};
  if(count(m,'door')&&count(m,'shot'))return {kind:'engagement',label:'ENTRY FIREFIGHT'};
  if(count(m,'shot'))return {kind:'engagement',label:'GUNFIRE'};
  if(count(m,'flash'))return {kind:'flash',label:'FLASHBANG'};
  if(count(m,'surrender'))return {kind:'surrender',label:'SURRENDER'};
  if(count(m,'blocked')||count(m,'recovering'))
    return {kind:'movement',label:'MOVEMENT INTERRUPTION'};
  if(count(m,'door'))return {kind:'door',label:'DOOR INTERACTION'};
  return {kind:'orders',label:'ORDER ACTIVITY'};
}
function summaryFor(m:ReadonlyMap<string,number>):string{
  const labels:[string,string,string][]=[
    ['intel','contact','contacts'],['door','door action','door actions'],
    ['shot','shot','shots'],['wound','wound','wounds'],
    ['down','downed','downed'],['flash','flashbang','flashbangs'],
    ['blocked','block','blocks'],['surrender','surrender','surrenders'],
    ['objective','objective','objectives']
  ];
  const items=labels.filter(([kind])=>count(m,kind)>0)
    .map(([kind,one,many])=>{
      const n=count(m,kind);
      return n+' '+(n===1?one:many);
    });
  return items.slice(0,4).join(' · ')||'Recorded operator activity';
}
/** Each event is assigned once; far-apart simultaneous events stay separate.
 * A shared actor is only a fallback if one event lacks a world position.
 */
export function indexReplayIncidents(
  disclosed:readonly ReplayIndexedEvent[],duration:number
):ReplayIncident[]{
  if(!Number.isFinite(duration)||duration<=0)return [];
  const ordered=disclosed.filter(e=>kinds.has(e.kind)&&
    Number.isFinite(e.t)&&e.t>=0&&e.t<=duration)
    .slice().sort((a,b)=>a.t-b.t||a.order-b.order||a.key.localeCompare(b.key));
  const clusters:Working[]=[];
  for(const event of ordered){
    const located=!!event.p&&Number.isFinite(event.p.x)&&
      Number.isFinite(event.p.y);
    let chosen:Working|null=null;
    for(let i=clusters.length-1;i>=0;i--){
      const c=clusters[i];
      if(event.t-c.start>INCIDENT_MAX_SECONDS||
        event.t-c.end>INCIDENT_GAP_SECONDS)continue;
      const near=located&&c.positionCount>0&&
        Math.hypot(event.p!.x-c.x,event.p!.y-c.y)<=INCIDENT_RADIUS;
      const sameActor=!!event.actor&&c.actors.has(event.actor);
      if((located&&c.positionCount>0?near:sameActor)&&
        (!chosen||c.end>chosen.end))chosen=c;
    }
    if(!chosen){
      clusters.push({start:event.t,end:event.t,events:[event],
        x:located?event.p!.x:0,y:located?event.p!.y:0,
        positionCount:located?1:0,
        actors:new Set(event.actor?[event.actor]:[])});
    }else{
      chosen.events.push(event);chosen.end=event.t;
      if(event.actor)chosen.actors.add(event.actor);
      if(located){
        // Rolling centroid prevents an unrelated nearby room from joining
        // purely through a first distant point.
        chosen.x=(chosen.x*chosen.positionCount+event.p!.x)/
          (chosen.positionCount+1);
        chosen.y=(chosen.y*chosen.positionCount+event.p!.y)/
          (chosen.positionCount+1);
        chosen.positionCount++;
      }
    }
  }
  return clusters.map(c=>{
    const m=tags(c.events),named=nameFor(m);
    const uniqueKinds=[...m.keys()];
    const score=Math.max(...uniqueKinds.map(k=>priorities[k]??0))+
      Math.min(4,uniqueKinds.length-1)*1.3+
      Math.min(2,Math.log2(c.events.length+1))*.45;
    return {
      id:'incident:'+c.events[0].key,start:c.start,end:c.end,
      eventKeys:c.events.map(e=>e.key),actorIds:[...c.actors].sort(),
      kind:named.kind,label:named.label,summary:summaryFor(m),
      score,eventCount:c.events.length
    };
  }).sort((a,b)=>a.start-b.start||a.id.localeCompare(b.id));
}
export function featuredReplayIncidents(
  incidents:readonly ReplayIncident[],limit=5
):ReplayIncident[]{
  if(limit<=0)return [];
  // A highlight is an actual tactical development, not routine movement,
  // a door click or a solitary administrative order. Keep varied moments
  // rather than five nearly identical shots in one engagement.
  const valuable=new Set(['casualty','objective','contact','engagement',
    'flash','surrender']);
  const ranked=incidents.filter(i=>valuable.has(i.kind))
    .slice().sort((a,b)=>b.score-a.score||
      a.start-b.start||a.id.localeCompare(b.id));
  const chosen:ReplayIncident[]=[];
  for(const incident of ranked){
    if(chosen.length>=Math.floor(limit))break;
    if(chosen.some(other=>Math.abs(other.start-incident.start)<6))continue;
    if(chosen.filter(other=>other.kind===incident.kind).length>=2)continue;
    chosen.push(incident);
  }
  return chosen.sort((a,b)=>a.start-b.start||a.id.localeCompare(b.id));
}
