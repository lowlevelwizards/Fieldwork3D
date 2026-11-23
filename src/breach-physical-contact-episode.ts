/** R6.2: one pure contact-episode geometry and duration contract.
 * The GO handler supplies witnessed target, real body sweep, occupancy,
 * physical-world legality and action status. NO actor movement or effects
 * happen here. `ready` means a validated hand lane, not completed work.
 */
import type {Pt} from './breach-core.ts';
import type {PlanNode} from './breach-plan.ts';
import {PERSON_CONTACT_REACH,PERSON_CONTACT_STANDOFF,
 PERSON_CONTACT_OFFSETS,contactStandpointAtRadius}
 from './breach-person-contact-standpoint.ts';

export type PhysicalContactAction=Extract<NonNullable<PlanNode['interaction']>,
 'restrain-suspect'|'secure-civilian'|'restrain-civilian'|
 'search-suspect'|'secure-firearm'>;
export type PhysicalContactProfile=Readonly<{
 handReach:number;
 approachLimit:number;
 standOff:number;
 offsets:readonly number[];
 anchorLimit:number|null;
}>;
/** Contact distance is per action. GO never silently expands hand reach. */
const OBJECT_OFFSETS=Object.freeze([0,.65,-.65,1.3,-1.3]);
export const PHYSICAL_CONTACT_PROFILES:Readonly<Record<
 PhysicalContactAction,PhysicalContactProfile>>=Object.freeze({
 'restrain-suspect':{
  handReach:PERSON_CONTACT_REACH,approachLimit:45,
  standOff:PERSON_CONTACT_STANDOFF,offsets:PERSON_CONTACT_OFFSETS,anchorLimit:45},
 'secure-civilian':{
  handReach:PERSON_CONTACT_REACH,approachLimit:45,
  standOff:PERSON_CONTACT_STANDOFF,offsets:PERSON_CONTACT_OFFSETS,anchorLimit:45},
 'restrain-civilian':{
  handReach:PERSON_CONTACT_REACH,approachLimit:45,
  standOff:PERSON_CONTACT_STANDOFF,offsets:PERSON_CONTACT_OFFSETS,anchorLimit:45},
 'search-suspect':{
  handReach:28,approachLimit:45,
  standOff:25,offsets:PERSON_CONTACT_OFFSETS,anchorLimit:45},
 'secure-firearm':{
  handReach:34,approachLimit:58,
  standOff:25,offsets:OBJECT_OFFSETS,anchorLimit:null}
});

export type PhysicalContactEpisodeFacts=Readonly<{
 action:PhysicalContactAction;
 from:Pt;
 target:Pt;
 authoredAt:Pt;
 targetVisible:boolean;
 handLaneClear:boolean;
 /** The existing GO owner checks actual Session geometry and body occupancy.
  * This callback may not execute movement or commit an interaction.
  */
 canStand:(p:Pt)=>boolean;
}>;
export type PhysicalContactEpisode=
 | Readonly<{kind:'ready';distance:number}>
 | Readonly<{kind:'approach';distance:number;goal:Pt}>
 | Readonly<{kind:'blocked';distance:number;reason:'invalid-geometry'|
   'contact-obstructed'|'out-of-approach'|'stale-target'|
   'unobserved'|'no-standpoint'}>;
const distance=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
const finitePoint=(p:Pt)=>Number.isFinite(p.x)&&Number.isFinite(p.y);

/** Use real from/target, not a waypoint as arrival proof. First a legally
 * reached contact, otherwise a candidate side-of-target stance; never
 * propose the target's occupied body center. */
export function resolvePhysicalContactEpisode(f:PhysicalContactEpisodeFacts):
 PhysicalContactEpisode{
 if(!finitePoint(f.from)||!finitePoint(f.target)||!finitePoint(f.authoredAt))
  return {kind:'blocked',distance:Infinity,reason:'invalid-geometry'};
 const profile=PHYSICAL_CONTACT_PROFILES[f.action];
 const range=distance(f.from,f.target);
 if(!f.handLaneClear)
  return {kind:'blocked',distance:range,reason:'contact-obstructed'};
 if(range<=profile.handReach)return {kind:'ready',distance:range};
 if(range>profile.approachLimit)
  return {kind:'blocked',distance:range,reason:'out-of-approach'};
 if(profile.anchorLimit!==null&&
    distance(f.target,f.authoredAt)>profile.anchorLimit)
  return {kind:'blocked',distance:range,reason:'stale-target'};
 if(!f.targetVisible)
  return {kind:'blocked',distance:range,reason:'unobserved'};
 const goal=contactStandpointAtRadius(f.from,f.target,profile.standOff,
  profile.offsets,f.canStand);
 if(goal)return {kind:'approach',distance:range,goal};
 return {kind:'blocked',distance:range,reason:'no-standpoint'};
}

export type PhysicalContactTime=Readonly<{elapsed:number;complete:boolean}>;
/** Called only after live target, clearance, real hand reach and facing
 * have passed. No mutation and no independent clock. */
export function advancePhysicalContactTime(
 elapsed:number,dt:number,duration:number):PhysicalContactTime{
 if(!Number.isFinite(elapsed)||elapsed<0||
    !Number.isFinite(dt)||dt<=0||
    !Number.isFinite(duration)||duration<=0)
  throw new RangeError('Invalid fixed-tick physical contact duration');
 const next=elapsed+dt;
 return {elapsed:next,complete:next>=duration};
}
