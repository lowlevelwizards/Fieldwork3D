import {generateSite} from '../src/breach-site.ts';
import {planVehiclePlacement} from '../src/worldgen/vehicle-placement.ts';
import {proposedVehicleParkingSite} from '../src/worldgen/vehicle-parking-layout.ts';
import {writeFileSync} from 'node:fs';
import {vehicleRecipe,VEHICLE_PAINT_NAMES,VEHICLE_PAINTS} from '../src/worldgen/vehicle-catalog.ts';
const rows=[];
for(const scale of ['standard','large'])for(let seed=1;seed<=22;seed++){
 const site=generateSite(seed,scale,undefined,{}, {vehiclePlacement:false});
 const result=planVehiclePlacement(site),modern=proposedVehicleParkingSite(site),proposed=planVehiclePlacement(modern);
 const pilot=generateSite(seed,scale);
 const pilotVehicles=pilot.cover.filter(v=>['sedan','hatchback','pickup','suv','van','light-truck'].includes(v.fixture));
 rows.push({seed,scale,archetype:site.archetype,condition:site.condition,zones:site.exteriorZones,vehicles:result.vehicles,diagnostics:result.diagnostics,proposedZones:modern.exteriorZones,proposedVehicles:proposed.vehicles,proposedDiagnostics:proposed.diagnostics,pilotZones:pilot.exteriorZones,pilotVehicles});
}
const eligible=rows.filter(r=>r.diagnostics.length);
const families=Object.fromEntries(['sedan','hatchback','pickup','suv','van','light-truck'].map(id=>[id,rows.reduce((n,r)=>n+r.pilotVehicles.filter(v=>v.fixture===id).length,0)]));
const configs={},paints={},byArchetype={};
for(const row of rows)for(const v of row.pilotVehicles){const r=vehicleRecipe(v.fixture,v.artVariant),k=v.fixture+':'+r.configuration,p=VEHICLE_PAINT_NAMES[VEHICLE_PAINTS.indexOf(r.paint)];configs[k]=(configs[k]??0)+1;paints[p]=(paints[p]??0)+1;const a=byArchetype[row.archetype]??={};a[k]=(a[k]??0)+1;}
const summary={families,configs,paints,byArchetype,sites:rows.length,parkingSites:eligible.length,occupiedSites:eligible.filter(r=>r.vehicles.length).length,vehicles:rows.reduce((s,r)=>s+r.vehicles.length,0),modernLayouts:rows.filter(r=>r.proposedZones?.some(z=>z.vehicleParking)).length,proposedOccupied:rows.filter(r=>r.proposedVehicles.length).length,proposedVehicles:rows.reduce((s,r)=>s+r.proposedVehicles.length,0),pilotOccupied:rows.filter(r=>r.pilotVehicles.length).length,pilotVehicles:rows.reduce((s,r)=>s+r.pilotVehicles.length,0)};
console.log(JSON.stringify(summary));writeFileSync('veh-parking-baseline.json',JSON.stringify({summary,rows},null,2));
