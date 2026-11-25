import {generateSite} from '../src/breach-site.ts';
import {planVehiclePlacement} from '../src/worldgen/vehicle-placement.ts';
import {proposedVehicleParkingSite} from '../src/worldgen/vehicle-parking-layout.ts';
import {writeFileSync} from 'node:fs';
const rows=[];
for(const scale of ['standard','large'])for(let seed=1;seed<=22;seed++){
 const site=generateSite(seed,scale);
 const result=planVehiclePlacement(site),modern=proposedVehicleParkingSite(site),proposed=planVehiclePlacement(modern);
 const pilot=generateSite(seed,scale,undefined,{}, {vehiclePlacement:true});
 const pilotVehicles=pilot.cover.filter(v=>['sedan','hatchback','pickup','suv','van','light-truck'].includes(v.fixture));
 rows.push({seed,scale,archetype:site.archetype,condition:site.condition,zones:site.exteriorZones,vehicles:result.vehicles,diagnostics:result.diagnostics,proposedZones:modern.exteriorZones,proposedVehicles:proposed.vehicles,proposedDiagnostics:proposed.diagnostics,pilotZones:pilot.exteriorZones,pilotVehicles});
}
const eligible=rows.filter(r=>r.diagnostics.length);
const summary={sites:rows.length,parkingSites:eligible.length,occupiedSites:eligible.filter(r=>r.vehicles.length).length,vehicles:rows.reduce((s,r)=>s+r.vehicles.length,0),modernLayouts:rows.filter(r=>r.proposedZones?.some(z=>z.vehicleParking)).length,proposedOccupied:rows.filter(r=>r.proposedVehicles.length).length,proposedVehicles:rows.reduce((s,r)=>s+r.proposedVehicles.length,0),pilotOccupied:rows.filter(r=>r.pilotVehicles.length).length,pilotVehicles:rows.reduce((s,r)=>s+r.pilotVehicles.length,0)};
console.log(JSON.stringify(summary));writeFileSync('veh-parking-baseline.json',JSON.stringify({summary,rows},null,2));
