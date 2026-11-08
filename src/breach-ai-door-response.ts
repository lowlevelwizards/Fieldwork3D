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

/** Routine occupants may close a recently used door while settling after a
 * real local journey. No blind door-spamming, no reopening locked geometry,
 * and no attempt while another actor is clearing the passage. */
export function routineDoorClosureEligible(actor:Pt,door:Door,
 now:number,lastCloseAt:number,nearbyActiveActors:readonly Pt[]):boolean{
 if(!retreatDoorClosureEligible(actor,door,now,lastCloseAt,
   false,null)||now-lastCloseAt<12)return false;
 const m={x:(door.a.x+door.b.x)/2,y:(door.a.y+door.b.y)/2};
 if(Math.hypot(actor.x-m.x,actor.y-m.y)>55)return false;
 if(door.locked||door.jammed)return false;
 if(nearbyActiveActors.some(p=>Math.hypot(p.x-m.x,p.y-m.y)<40))
   return false;
 return true;
}
