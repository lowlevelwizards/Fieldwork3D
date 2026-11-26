/** ST integration runs after canonical encounter selection.
 * Try a small bounded set of cross sections. A proposal is accepted only
 * when the exact same tactical routes remain valid and no old physical
 * fixture intrudes into public road/footway. Fall back to VEH12 if needed.
 */
import type {Site} from '../breach-site.ts';
import {addExteriorProperty} from './exterior-sites.ts';
import {proposeStreetInfrastructure,streetConflicts} from './street-infrastructure.ts';
import {attachPlannedVehicles,validExteriorRetrofit} from './vehicle-site-integration.ts';
import {planVehiclePlacement} from './vehicle-placement.ts';
import {intersectsVehicleParkingReserve} from './vehicle-parking-layout.ts';
import {vehicleFamily} from './vehicle-catalog.ts';
import {planStreetFurniture} from './street-furniture.ts';
import {attachStreetJunction,proposeJunctionStop} from './street-junction.ts';
import {attachCurbsideParking,clearStreetAccess} from './street-access-final.ts';
export function attachStreetInfrastructure(site:Site,vehicles=true):Site{
 const baseline=vehicles?attachPlannedVehicles(site):site;
 const oldCount=baseline.cover.filter(c=>vehicleFamily(c.fixture??'')).length;
 const domestic=['house','townhouse'].includes(site.archetype??'');
 const reserves=vehicles?(domestic?[132,34]:[390,270,178,34]):[34];
 for(const reserve of reserves)for(const curbside of (vehicles?[true,false]:[false])){
  const plan=proposeStreetInfrastructure(site,undefined,reserve,curbside);if(!plan||curbside&&!plan.curbside)continue;
  const start={...site,streetInfrastructure:plan};
  let frontage=addExteriorProperty(start,site.seed,vehicles,true);
  if(frontage===start||!frontage.streetInfrastructure)continue;
  if(streetConflicts(frontage,frontage.streetInfrastructure).length)continue;
  if(frontage.streetInfrastructure.curbside){
   const extended=attachCurbsideParking(frontage);if(!extended)continue;
   frontage=extended;
  }
  const modern=(frontage.exteriorZones??[]).filter(z=>z.vehicleParking);
  if(modern.some(z=>frontage.cover.some(c=>intersectsVehicleParkingReserve(z,c))))continue;
  if(modern.some(z=>z.vehicleParking?.access&&!frontage.streetInfrastructure?.accessConnection))continue;
  const parked=vehicles?planVehiclePlacement(frontage,site.seed,true).vehicles:[];
  // Protect the deployed fleet density until the new lot grammar has
  // broader capacity. Constrained sites remain on the historical layout.
  if(parked.length<oldCount)continue;
  const parkedSite={...frontage,cover:[...frontage.cover,...parked]};
  const candidate={...parkedSite,streetInfrastructure:attachStreetJunction(parkedSite)};
  if(streetConflicts(candidate,candidate.streetInfrastructure!).length||!clearStreetAccess(candidate))continue;
  if(validExteriorRetrofit(site,candidate)){
   const control=proposeJunctionStop(candidate);
   let accepted:Site=candidate;
   if(control){
    const signed={...control.site,cover:[...candidate.cover,control.sign]};
    if(!streetConflicts(signed,signed.streetInfrastructure!).length&&validExteriorRetrofit(candidate,signed))accepted=signed;
   }
   const hardware=planStreetFurniture(accepted);
   if(hardware.length){
    const furnished={...accepted,cover:[...accepted.cover,...hardware]};
    if(clearStreetAccess(furnished)&&validExteriorRetrofit(accepted,furnished))return furnished;
   }
   return accepted;
  }
 }
 return baseline;
}
