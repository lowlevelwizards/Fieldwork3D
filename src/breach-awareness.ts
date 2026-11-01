/** Per-actor evidence. World truth never enters this store without observation. */
import type {Pt} from './breach-core.ts';
export type ObservationSource='visual'|'auditory'|'reported'|'physical';
export type AwarenessObservation={
 id:string;observerId:string;source:ObservationSource;at:number;
 estimate:Pt;uncertainty:number;subjectId?:string;kind:string;
};
export type ContactBelief={
 id:string;estimate:Pt;lastAt:number;lastSeenAt:number|null;
 confidence:number;uncertainty:number;source:ObservationSource;
};
export type ActorAwareness={
 observations:AwarenessObservation[];
 contacts:Record<string,ContactBelief>;
 lastAssessmentAt:number;
 visualProgress:Record<string,number>;
};
export function newAwareness():ActorAwareness{
 return {observations:[],contacts:{},visualProgress:{},lastAssessmentAt:-1};
}
export function addObservation(memory:ActorAwareness,event:AwarenessObservation):boolean{
 if(!Number.isFinite(event.at)||!Number.isFinite(event.estimate.x)||
    !Number.isFinite(event.estimate.y))return false;
 if(memory.observations.some(e=>e.id===event.id))return false;
 memory.observations.push({...event,estimate:{...event.estimate}});
 if(memory.observations.length>48)memory.observations.shift();
 if(event.subjectId){
  const old=memory.contacts[event.subjectId];
  // Only a direct visual observation establishes a precisely known position.
  const visual=event.source==='visual';
  if(!old||event.at>=old.lastAt)
   memory.contacts[event.subjectId]={
    id:event.subjectId,estimate:{...event.estimate},lastAt:event.at,
    lastSeenAt:visual?event.at:old?.lastSeenAt??null,
    confidence:visual?1:Math.min(.8,old?.confidence??.45),
    uncertainty:visual?0:Math.max(event.uncertainty,old?.uncertainty??0),
    source:event.source};
 }
 return true;
}
export function visibleObservation(observerId:string,subjectId:string,
 position:Pt,at:number):AwarenessObservation{
 return {id:'visual/'+observerId+'/'+subjectId+'/'+Math.floor(at*10),
  observerId,subjectId,estimate:{...position},uncertainty:0,
  source:'visual',kind:'contact',at};
}

/** Memory becomes imprecise when a contact is no longer observed. */
export function ageAwareness(memory:ActorAwareness,dt:number,at:number):void{
 for(const belief of Object.values(memory.contacts)){
  if(at-belief.lastAt<.10)continue;
  belief.uncertainty=Math.min(240,belief.uncertainty+dt*13);
  belief.confidence=Math.max(0,belief.confidence-dt*.007);
  if(belief.confidence<.04)delete memory.contacts[belief.id];
 }
}
/** A legitimately inspected empty position invalidates its old estimate. */
export function clearObservedPosition(memory:ActorAwareness,id:string):void{
 const belief=memory.contacts[id];if(!belief)return;
 belief.confidence=Math.max(0,belief.confidence-.48);
 belief.uncertainty=Math.max(belief.uncertainty,48);
 if(belief.confidence<.04)delete memory.contacts[id];
}
export function bestBelief(memory:ActorAwareness):ContactBelief|null{
 return Object.values(memory.contacts).filter(c=>c.confidence>.1)
  .sort((a,b)=>b.confidence-a.confidence||b.lastAt-a.lastAt)[0]??null;
}
