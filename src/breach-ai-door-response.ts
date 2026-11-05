/** E4-B — small environmental response: a defender at the end of
 * a real retreat may close a reachable open hinged door. This module
 * decides whether to TRY; interaction and hinge physics still own success.
 */
import type {Pt,Door} from './breach-core.ts';
import {doorReachable} from './breach-door.ts';

export function retreatDoorClosureEligible(
 actor:Pt,door:Door,now:number,lastCloseAt:number,
 directContact:boolean,threat:Pt|null
):boolean{
 if(directContact||!Number.isFinite(now)||now-lastCloseAt<10||
    !door.open||door.kind==='sliding'||door.kind==='shutter'||
    door.wedged||door.heldBy||
    (door.openFraction??1)<.72||!doorReachable(actor,door))
  return false;
 if(threat){
  const center={x:(door.a.x+door.b.x)/2,y:(door.a.y+door.b.y)/2};
  const threatDistance=Math.hypot(threat.x-center.x,threat.y-center.y);
  // Do not reach into an opponent's immediate, known contact space.
  if(threatDistance<62)return false;
 }
 return true;
}
