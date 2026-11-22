/** D3.33: source-independent, actual fixed-step stillness evidence for
 * generated ENTRY bodies. Neither route nor WAIT ownership can infer a
 * physical stall from its transient lastBlocker or blockedTime flags:
 * those may be reset by earlier stages of the same authoritative tick.
 *
 * Read-only; no movement, route-writing, plan edits, or inferred success.
 */
import type {Pt} from './breach-core.ts';
import type {TeamActor} from './breach-game.ts';
type LeadStillEpisode={orderId:number;doorId:string;since:number;
 lastAt:number;anchor:Pt;last:Pt};
const episodes=new WeakMap<TeamActor,LeadStillEpisode>();
/** Exact-test-only reset census. Disabled in normal gameplay and never
 * observed by movement/AI. */
let resetRecording=false;
const resetCounters=new WeakMap<TeamActor,Record<string,number>>();
export function enableEntryStillnessResetRecording(enabled:boolean):void{
 resetRecording=enabled;
}
export function entryStillnessResetCensus(a:TeamActor){
 return {...resetCounters.get(a)};
}
function noteReset(a:TeamActor,reason:string):void{
 if(!resetRecording)return;
 let c=resetCounters.get(a);
 if(!c){c={};resetCounters.set(a,c);}
 c[reason]=(c[reason]??0)+1;
}

const gap=(x:Pt,y:Pt)=>Math.hypot(x.x-y.x,x.y-y.y);

/** Each real 60Hz motor tick supplies a physical-position sample.
 * A transient route proposal can be repeatedly rejected before motion,
 * briefly populating nav. That is NOT evidence that the body moved.
 * Measure real continuous stillness independently from route occupancy;
 * only the existing no-nav motor branch may ACT on the completed witness.
 *
 * Never grants an arrival, collision authority, route, or movement.
 */
export function observeGeneratedEntryPhysicalStillness(
 peer:TeamActor,now:number
):void{
 const order=peer.plan[0],episode=peer.doorTraversal;
 if(order?.kind!=='move'||!order.entryDoorId||
    episode&&episode.doorId!==order.entryDoorId){
  noteReset(peer,order?.kind!=='move'?'not-entry-move':
   !order.entryDoorId?'missing-entry-door':'other-door-episode');
  episodes.delete(peer);return;
 }
 const doorId=order.entryDoorId,old=episodes.get(peer);
 const reason=!old?'new-sample':
  old.orderId!==order.id?'new-order':
  old.doorId!==doorId?'different-door':
  now<old.lastAt?'time-reversed':
  now-old.lastAt>.18?'sample-gap':
  gap(peer.p,old.last)>.20?'instant-physical-step':
  gap(peer.p,old.anchor)>1?'net-physical-step':null;
 if(reason){
  noteReset(peer,reason);
  episodes.set(peer,{orderId:order.id,doorId,
   since:now,lastAt:now,anchor:{...peer.p},last:{...peer.p}});
  return;
 }
 old.lastAt=now;old.last={...peer.p};
}

/** Read a body-truth witness for the very same generated entry.
 * A transient maneuver reclassification or nav array is not a physical
 * displacement. Only the EXISTING stable-open-leaf, same-order,
 * grab-and-hold and no-nav motor release gates can act on the witness.
 * A transient nav array is not a physical displacement. Callers have no
 * permission to move unless their own motor/door collision gates pass.
 */
export function witnessedGeneratedEntryStillness(
 peer:TeamActor,doorId:string,now:number
):boolean{
 observeGeneratedEntryPhysicalStillness(peer,now);
 const recorded=episodes.get(peer);
 return !!recorded&&recorded.doorId===doorId&&
  now-recorded.since>=1.25;
}

/** Read-only, cold test instrumentation of the authoritative 60Hz witness.
 * This does not create a witness, mutate clocks, or select any movement.
 */
export function inspectGeneratedEntryStillness(peer:TeamActor,now:number){
 const e=episodes.get(peer);
 return e?{age:now-e.since,sampleGap:now-e.lastAt,
  displacement:gap(peer.p,e.anchor),
  doorId:e.doorId,orderId:e.orderId}:null;
}

/** The same generated ENTRY may own at most six previously swept, real
 * narrow-body exit strides. This is an ownership witness, NOT clearance.
 * Motor route and embedded-cover fallback share it to avoid undoing an
 * earlier physically certified step during the next fixed frame. */
export type GeneratedEntryPinch={orderId:number;doorId:string;
 at:Pt;since:number;steps:number};
const pinches=new WeakMap<TeamActor,GeneratedEntryPinch>();
export const readGeneratedEntryPinch=(a:TeamActor)=>
 pinches.get(a);
export function noteGeneratedEntryPinch(a:TeamActor,e:GeneratedEntryPinch):void{
 pinches.set(a,e);
}
export function ownsLiveGeneratedEntryPinch(
 a:TeamActor,doorId:string,now:number
):boolean{
 const e=pinches.get(a),order=a.plan[0],episode=a.doorTraversal;
 return !!e&&a.squeeze&&order?.kind==='move'&&
  order.id===e.orderId&&order.entryDoorId===doorId&&
  episode?.doorId===doorId&&
  episode.maneuver==='grab-and-hold'&&e.doorId===doorId&&
  e.steps<6&&now>=e.since&&now-e.since<2&&
  gap(a.p,e.at)<5;
}
