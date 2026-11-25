/** Explicit generation pilot. Vehicles are appended after the encounter
 * director, so existing fixture indices, spawns and mission objectives
 * are not renumbered or randomized. No changes to loaded site snapshots.
 */
import type {Site} from '../breach-site.ts';
import {passable,route,withTemporarySiteGeometry} from '../breach-core.ts';
import {planVehiclePlacement} from './vehicle-placement.ts';
export function attachPlannedVehicles(site:Site):Site{
 if(!site.exteriorZones?.some(z=>z.vehicleParking))return site;
 const planned=planVehiclePlacement(site,site.seed,true).vehicles;
 if(!planned.length)return site;
 // Generation-only bounded validation. Use the same navigation contract
 // as ordinary generation. Never pay this cost on a rendering frame.
 const candidate={...site,cover:[...site.cover,...planned]};
 const valid=withTemporarySiteGeometry(candidate,()=>{
  const from=candidate.spawn[0];
  if(!from)return false;
  const points=[...candidate.spawn,...candidate.enemies,candidate.objective,candidate.extract];
  return points.every(p=>passable(p))&&
   [candidate.objective,candidate.extract,...candidate.enemies].every(p=>route(from,p).length>0);
 });
 // Fail closed, retaining the empty but valid lot rather than retrying the
 // whole building until a vehicle can be made to fit.
 return valid?candidate:site;
}
