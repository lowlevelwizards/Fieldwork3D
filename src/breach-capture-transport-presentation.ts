/** D15.5F: recorded, reciprocal-custody casualty presentation.
 * Pure read-only policy used by Floor Plan and tactical 3D/live/replay.
 * Never invent a carrier from proximity or derive hidden mission outcomes.
 */
import type {Pt} from './breach-core.ts';
import type {TeamActor} from './breach-game.ts';
import type {TransportMode} from './breach-casualty-transport.ts';
type Subject=Pick<TeamActor,'id'|'p'|'health'|'heading'|'carriedById'|'transportMode'>;
type Carrier=Pick<TeamActor,'id'|'p'|'health'|'heading'|'carryingId'>;
export type DownedTransportPresentation={
 carrierId:string;mode:TransportMode;heading:number;lift:number;
 /** Real current carrier position; only used for disclosed visual connection. */
 carrierPosition:Pt;
};
export function downedTransportPresentation(
 subject:Subject,actors:readonly Carrier[]):DownedTransportPresentation|null{
 if(subject.health>0||!subject.carriedById)return null;
 const carrier=actors.find(a=>a.id===subject.carriedById&&
   a.carryingId===subject.id&&a.health>0);
 if(!carrier)return null;
 // Unknown historical mode intentionally stays ground-drag instead of
 // guessing a carry from actor separation or a later replay frame.
 const mode:TransportMode=subject.transportMode==='carry'?'carry':'drag';
 const dx=carrier.p.x-subject.p.x,dy=carrier.p.y-subject.p.y;
 const length=Math.hypot(dx,dy);
 const heading=mode==='carry'?
   carrier.heading+Math.PI/2:
   length>3?Math.atan2(dy,dx):carrier.heading;
 return {carrierId:carrier.id,mode,heading,
  // Match the established civilian shared-rig visual elevations.
  lift:mode==='carry'?18:2,
  carrierPosition:carrier.p};
}
