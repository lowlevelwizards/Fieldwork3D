/** Auto-acquisition is permitted only among already confirmed live
 * contacts. Favor an actual safe firing opportunity over a nearer contact
 * hidden behind solid cover; preserve the current target when still valid.
 * The authoritative muzzle/shot safety gates MUST still run before ignition.
 */
import {combatCostDiagnosticsEnabled,combatCostCounts}
 from './breach-combat-cost-counters.ts';
export type ObservableTarget={id:string;p:{x:number;y:number}};
export function selectFireableContact<T extends ObservableTarget>(
 origin:{x:number;y:number},visible:readonly T[],currentId:string|null,
 clearLane:(target:T)=>boolean
):T|null{
 if(!visible.length)return null;
 // A lone observed contact remains tracked even while its shot is blocked.
 // No sort or clearLane side effects on this existing fast path.
 if(visible.length===1)return visible[0];
 const near=[...visible].sort((a,b)=>{
  const ad=Math.hypot(a.p.x-origin.x,a.p.y-origin.y);
  const bd=Math.hypot(b.p.x-origin.x,b.p.y-origin.y);
  return ad-bd||a.id.localeCompare(b.id);
 });
 let firstSafe:T|null=null,currentSafe:T|null=null,currentVisible:T|null=null;
 // Evaluate EVERY sorted candidate, just as near.filter(clearLane) did.
 // The callback can record a civilian safety warning. Short-circuiting
 // after finding a target would change those game-side observations.
 for(const candidate of near){
  if(currentVisible===null&&candidate.id===currentId)
   currentVisible=candidate;
  if(combatCostDiagnosticsEnabled)combatCostCounts.multiTargetLaneChecks++;
  if(!clearLane(candidate))continue;
  if(firstSafe===null)firstSafe=candidate;
  if(currentSafe===null&&candidate.id===currentId)currentSafe=candidate;
 }
 // Same priority as valid.find(current) ?? valid[0] ??
 // near.find(current) ?? near[0], without a second valid[] allocation.
 return currentSafe??firstSafe??currentVisible??near[0];
}
