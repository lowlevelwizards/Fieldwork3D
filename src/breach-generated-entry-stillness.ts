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
    episode?.doorId!==order.entryDoorId||
    episode.maneuver!=='grab-and-hold'){
  episodes.delete(peer);return;
 }
 const doorId=order.entryDoorId,old=episodes.get(peer);
 if(!old||old.orderId!==order.id||old.doorId!==doorId||
    now<old.lastAt||now-old.lastAt>.18||
    gap(peer.p,old.last)>.20||gap(peer.p,old.anchor)>1){
  episodes.set(peer,{orderId:order.id,doorId,
   since:now,lastAt:now,anchor:{...peer.p},last:{...peer.p}});
  return;
 }
 old.lastAt=now;old.last={...peer.p};
}

/** Read a body-truth witness for the very same generated entry.
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
