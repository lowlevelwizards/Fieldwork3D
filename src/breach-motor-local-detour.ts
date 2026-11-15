/** Exact completion of the one short furniture detour already chosen
 * by the swept physical motor. Normal A* keeps 3-unit node tolerance.
 * A detour's outgoing leg was validated from its ACTUAL center; it must
 * reach that center (within 1 unit) before following the saved route.
 */
import type {TeamActor} from './breach-game.ts';
import type {Pt} from './breach-core.ts';
const detours=new WeakMap<TeamActor,Pt>();
export function notePreciseLocalDetour(a:TeamActor,target:Pt):void{
 detours.set(a,{...target});
}
export function localDetourWaypointTolerance(a:TeamActor,next:Pt):number{
 const point=detours.get(a);
 if(!point)return 3;
 if(Math.hypot(point.x-next.x,point.y-next.y)>1){
  detours.delete(a);
  return 3;
 }
 return 1;
}
export function completePreciseLocalDetour(a:TeamActor):void{
 detours.delete(a);
}
