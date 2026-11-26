/** Final-site vehicle retrofit. The authoritative architecture and encounter
 * have already been selected; a parking proposal may not cause a retry,
 * change the room program or reroll actors. Fail closed to the original site.
 */
import type {Site} from '../breach-site.ts';
import {passable,route,withTemporarySiteGeometry} from '../breach-core.ts';
import {planVehiclePlacement} from './vehicle-placement.ts';
import {addExteriorProperty} from './exterior-sites.ts';
import {auditTacticalMobility} from './tactical-mobility-audit.ts';
import {intersectsVehicleParkingReserve} from './vehicle-parking-layout.ts';
export function attachPlannedVehicles(site:Site):Site{
 const frontage=addExteriorProperty(site,site.seed,true,true);
 if(frontage===site)return site;
 const modern=(frontage.exteriorZones??[]).filter(z=>z.vehicleParking);
 if(modern.some(z=>frontage.cover.some(c=>intersectsVehicleParkingReserve(z,c))))return site;
 const planned=planVehiclePlacement(frontage,site.seed,true).vehicles;
 if(!planned.length)return site;
 const candidate={...frontage,cover:[...frontage.cover,...planned]};
 const from=candidate.spawn[0];if(!from)return site;
 const civilians=(site.encounter?.neutrals??[]).flatMap(a=>[a.position,...(a.routine??[])]);
 const routines=(site.encounter?.actors??[]).flatMap(a=>a.routine??[]);
 const points=[...candidate.spawn,...candidate.enemies,candidate.objective,candidate.extract,...civilians,...routines];
 // Existing routine waypoints may be approximate; reject only newly
 // obstructed points, while mandatory mission points remain strictly valid.
 const baseline=withTemporarySiteGeometry(site,()=>points.map(p=>passable(p)));
 const valid=withTemporarySiteGeometry(candidate,()=>
  points.every((p,i)=>!baseline[i]||passable(p))&&
  [candidate.objective,candidate.extract,...candidate.enemies].every(p=>passable(p)&&route(from,p).length>0));
 if(!valid)return site;
 const before=new Set(auditTacticalMobility(site).issues.map(x=>JSON.stringify(x)));
 if(auditTacticalMobility(candidate).issues.some(x=>!before.has(JSON.stringify(x))))return site;
 return candidate;
}
