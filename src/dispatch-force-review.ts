/** D10.1: retrospective force accountability, not a second ROE engine.
 * Outcomes are read from immutable physical harm and battle event evidence.
 * An unrecorded firing context is NEVER assumed legally justified or unlawful.
 */
import type {CivilianHarmEvent} from './breach-civilian-harm.ts';
import {attributableCivilianHarm} from './breach-civilian-harm.ts';
import type {BattleEvent} from './breach-combat.ts';

export type DispatchHarmEvidence=Readonly<{
 shotId:number;at:number;actorId:string;victimId:string;
 sourceSide:'blue'|'red';severity:'injured'|'incapacitated';
}>;
export type DispatchChallengeEvidence=Readonly<{
 eventId:number;at:number;officerId:string|null;subjectId:string|null;
 outcome:'challenged'|'refused'|'surrendered';
}>;
export type DispatchForceReview=Readonly<{
 version:1;
 status:'civilian-harm-documented'|'no-blue-harm-in-retained-evidence';
 /** Victim counts use the same exact blue-only attribution as mission scoring. */
 blueCivilianInjured:number;blueCivilianDown:number;
 redCivilianInjured:number;redCivilianDown:number;
 challenges:number;refusals:number;surrenders:number;
 harm:readonly DispatchHarmEvidence[];
 contacts:readonly DispatchChallengeEvidence[];
 limitations:readonly string[];
}>;
export type DispatchForceHistoryV1=Readonly<{
 version:1;blueCivilianInjured:number;blueCivilianDown:number;
 challenges:number;refusals:number;surrenders:number;
}>;

const afterSide=(events:readonly CivilianHarmEvent[],side:'blue'|'red')=>
 attributableCivilianHarm(events.filter(e=>e.sourceSide===side)
  .map(e=>({...e,sourceSide:'blue' as const})));
const isSafeCount=(v:unknown):v is number=>
 Number.isSafeInteger(v)&&typeof v==='number'&&v>=0&&v<=100000;

export function validDispatchForceHistory(value:unknown):
 value is DispatchForceHistoryV1{
 if(!value||typeof value!=='object'||Array.isArray(value))return false;
 const v=value as Record<string,unknown>;
 const keys=['version','blueCivilianInjured','blueCivilianDown',
  'challenges','refusals','surrenders'];
 return Object.keys(v).length===keys.length&&
  keys.every(k=>Object.hasOwn(v,k))&&v.version===1&&
  keys.slice(1).every(k=>isSafeCount(v[k]));
}
export function dispatchForceHistory(review:DispatchForceReview):
 DispatchForceHistoryV1{
 return {version:1,blueCivilianInjured:review.blueCivilianInjured,
  blueCivilianDown:review.blueCivilianDown,challenges:review.challenges,
  refusals:review.refusals,surrenders:review.surrenders};
}
export function assessDispatchForce(
 harms:readonly CivilianHarmEvent[],events:readonly BattleEvent[]
):DispatchForceReview{
 // The same shot is one physical impact. Any duplicate imported data cannot
 // generate a second finding or double-count an individual's injury.
 const shots=new Set<number>();
 const harm:DispatchHarmEvidence[]=[];
 for(const e of harms){
  if(shots.has(e.shotId)||e.after>=e.before)continue;
  shots.add(e.shotId);
  harm.push({shotId:e.shotId,at:e.at,actorId:e.actorId,
   victimId:e.victimId,sourceSide:e.sourceSide,severity:e.severity});
 }
 harm.sort((a,b)=>a.at-b.at||a.shotId-b.shotId);
 const blue=attributableCivilianHarm(harm
  .filter(e=>e.sourceSide==='blue')
  .map(e=>({...e,id:e.shotId,before:2,after:1,p:{x:0,y:0}})));
 const red=afterSide(harm.map(e=>({...e,id:e.shotId,before:2,after:1,
  p:{x:0,y:0}})), 'red');
 const contacts:DispatchChallengeEvidence[]=[];
 let challenges=0,refusals=0,surrenders=0;
 const seenEvents=new Set<number>();
 for(const e of events){
  if(seenEvents.has(e.id))continue;
  seenEvents.add(e.id);
  const action=e.meta?.action;
  if(action==='suspect-challenge'){
   challenges++;
   contacts.push({eventId:e.id,at:e.t,
    officerId:e.meta?.contributorId??e.actor??null,
    subjectId:e.meta?.targetId??null,outcome:'challenged'});
  }else if(action==='suspect-refusal'){
   refusals++;
   contacts.push({eventId:e.id,at:e.t,
    officerId:e.meta?.contributorId??e.actor??null,
    subjectId:e.meta?.targetId??null,outcome:'refused'});
  }else if(e.kind==='surrender'){
   surrenders++;
   contacts.push({eventId:e.id,at:e.t,
    officerId:e.meta?.contributorId??null,
    subjectId:e.meta?.targetId??e.actor??null,outcome:'surrendered'});
  }
 }
 contacts.sort((a,b)=>a.at-b.at||a.eventId-b.eventId);
 return {
  version:1,
  status:blue.injured||blue.down?'civilian-harm-documented':
   'no-blue-harm-in-retained-evidence',
  blueCivilianInjured:blue.injured,blueCivilianDown:blue.down,
  redCivilianInjured:red.injured,redCivilianDown:red.down,
  challenges,refusals,surrenders,harm,contacts,
  limitations:[
   'Civilian harm attribution is confirmed by physical shot evidence; the review does not establish legal liability.',
   'The absence of recorded civilian harm is not a general finding that all uses of force were justified.',
   'Contact counts include only structured events or recorded surrenders. Older recordings may lack challenge outcomes.'
  ]
 };
}
