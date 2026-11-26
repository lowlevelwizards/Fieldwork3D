/** ST6 pilot. Opt-in only; run after canonical encounter selection.
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
export function attachStreetInfrastructure(site:Site,vehicles=true):Site{
 const baseline=vehicles?attachPlannedVehicles(site):site;
 const oldCount=baseline.cover.filter(c=>vehicleFamily(c.fixture??'')).length;
 const domestic=['house','townhouse'].includes(site.archetype??'');
 const reserves=vehicles?(domestic?[132,34]:[390,270,178,34]):[34];
 for(const reserve of reserves){
  const plan=proposeStreetInfrastructure(site,undefined,reserve);if(!plan)continue;
  const start={...site,streetInfrastructure:plan};
  const frontage=addExteriorProperty(start,site.seed,vehicles,true);
  if(frontage===start||!frontage.streetInfrastructure)continue;
  if(streetConflicts(frontage,frontage.streetInfrastructure).length)continue;
  const modern=(frontage.exteriorZones??[]).filter(z=>z.vehicleParking);
  if(modern.some(z=>frontage.cover.some(c=>intersectsVehicleParkingReserve(z,c))))continue;
  if(modern.some(z=>z.vehicleParking?.access&&!frontage.streetInfrastructure?.accessConnection))continue;
  const parked=vehicles?planVehiclePlacement(frontage,site.seed,true).vehicles:[];
  // Protect the deployed fleet density until the new lot grammar has
  // broader capacity. Constrained sites remain on the historical layout.
  if(parked.length<oldCount)continue;
  const candidate={...frontage,cover:[...frontage.cover,...parked]};
  if(streetConflicts(candidate,candidate.streetInfrastructure!).length)continue;
  if(validExteriorRetrofit(site,candidate)){
   const hardware=planStreetFurniture(candidate);
   if(hardware.length){
    const furnished={...candidate,cover:[...candidate.cover,...hardware]};
    if(validExteriorRetrofit(candidate,furnished))return furnished;
   }
   return candidate;
  }
 }
 return baseline;
}
