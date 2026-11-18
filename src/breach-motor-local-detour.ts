/** Exact completion of the one short furniture detour already chosen
 * by the swept physical motor. Normal A* keeps 3-unit node tolerance.
 * A detour's outgoing leg was validated from its ACTUAL center; it must
 * reach that center (within 1 unit) before following the saved route.
 */
import type {TeamActor} from './breach-game.ts';
import type {Pt} from './breach-core.ts';
import {preciseNarrowExitWaypoint} from './breach-squeeze-leaf-exit.ts';
import {ownsD326FineMotorRoute} from './breach-d326-fine-route-gate.ts';
const detours=new WeakMap<TeamActor,Pt>();
export function notePreciseLocalDetour(a:TeamActor,target:Pt):void{
 detours.set(a,{...target});
}
export function localDetourWaypointTolerance(a:TeamActor,next:Pt):number{
 // D3.26G2: each fine world edge was certified FROM its exact 4-unit\n // grid center. The default 3-unit arrival radius skipped the center,\n // changing the next turn into a wall collision (Motel 19143269 Moss).\n // Complete the REAL motor movement within one ~0.3-unit stride first.\n // Four-unit fully swept narrow stages require actual local arrival.
 // Ordinary A* and existing furniture-detour tolerances are unchanged.
 if(ownsD326FineMotorRoute(a))return .35;
 if(preciseNarrowExitWaypoint(a,next))return .85;
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
