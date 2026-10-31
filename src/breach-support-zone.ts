/** Pure two-foot support estimate; never directly moves an actor or shoe. */
import type {FootstepState} from './breach-footsteps.ts';
export function supportZone(feet:readonly [FootstepState,FootstepState],
 pelvis:{x:number;y:number}){
 const support=feet.filter(f=>f.contact);
 const base:readonly FootstepState[]=support.length?support:feet;
 const center={x:base.reduce((n,f)=>n+f.plantedAt.x,0)/base.length,
   y:base.reduce((n,f)=>n+f.plantedAt.y,0)/base.length};
 const offset=Math.hypot(center.x-pelvis.x,center.y-pelvis.y);
 return {center,offset,supported:support.length>0};
}
