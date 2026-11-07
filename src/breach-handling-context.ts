/** C4: player-order-aware VISUAL handling intent, not a new movement order.
 * This classifier is pure and stateless for deterministic replay. It must
 * never edit a plan, discover unseen contacts, or authorize a shot.
 */
import type {HandlingIntent} from './breach-weapon-pose.ts';
export type HandlingOrder={
 kind:string;moveMode?:string;stackDoorId?:string;
 entryDoorId?:string;doorId?:string;
};
export type HandlingContext={
 order?:HandlingOrder|null;
 running:boolean;squeezing:boolean;traversing:boolean;
 reloading:boolean;treating:boolean;
 hasContact:boolean;hasAuthoredWatch:boolean;
 speed:number;
};
export function handlingIntentForMovement(p:HandlingContext):HandlingIntent{
 // Real squeeze and traversal outrank a stale aim meter.
 if(p.squeezing)return 'squeeze';
 if(p.traversing)return 'traverse';
 if(p.running||p.order?.moveMode==='sprint')return 'run';
 // Support hands are already busy; the reload/treatment animations remain
 // the authority for their exact contact poses.
 if(p.treating)return 'treat';
 if(p.reloading)return 'reload';
 // Existing confirmed tactical contact keeps the combat-facing posture.
 // This is merely presentation; acquisition and ignition are separate.
 if(p.hasContact)return 'engage';
 if(p.hasAuthoredWatch)return 'look';
 if(p.order?.kind==='door'||p.order?.kind==='wait'&&
   !!p.order.doorId)return 'door';
 // Authored squad templates use different muzzle presentation while
 // stacking versus advancing into distinct clearing sectors.
 if(p.order?.stackDoorId)return 'stack';
 if(p.order?.entryDoorId)return 'entry';
 if(p.order?.kind==='pie')return 'pie';
 return p.speed>10?'move':'hold';
}

/** Directional, near-body muzzle courtesy for passive visual stances.
 * Uses torso heading rather than a stale destination; actual firing still
 * calls assessFireLane from the authoritative shot-time muzzle.
 */
export type HandlingTeammate={
 p:{x:number;y:number};side:string;health:number
};
/** Accept the authoritative actor list directly on the render path.
 * No transient filter/map arrays per frame or actor. The point-only
 * form is retained for tiny pure geometric tests and Lab previews. */
export function teammateAheadForHandling(
 p:{x:number;y:number},heading:number,
 others:readonly ({x:number;y:number}|HandlingTeammate)[],
 self?:HandlingTeammate):boolean{
 const fx=Math.cos(heading),fy=Math.sin(heading);
 for(const other of others){
  if('p' in other&&(other===self||
     self!==undefined&&(other.side!==self.side||other.health<=0)))continue;
  const pt='p' in other?other.p:other;
  const dx=pt.x-p.x,dy=pt.y-p.y;
  const forward=dx*fx+dy*fy;
  const across=Math.abs(dx*fy-dy*fx);
  if(forward>=4&&forward<48&&across<20)return true;
 }
 return false;
}
