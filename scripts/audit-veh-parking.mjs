import {generateSite} from '../src/breach-site.ts';
import {planVehiclePlacement} from '../src/worldgen/vehicle-placement.ts';
import {writeFileSync} from 'node:fs';
const rows=[];
for(const scale of ['standard','large'])for(let seed=1;seed<=22;seed++){
 const site=generateSite(seed,scale);
 const result=planVehiclePlacement(site);
 rows.push({seed,scale,archetype:site.archetype,condition:site.condition,zones:site.exteriorZones,vehicles:result.vehicles,diagnostics:result.diagnostics});
}
const eligible=rows.filter(r=>r.diagnostics.length);
const summary={sites:rows.length,parkingSites:eligible.length,occupiedSites:eligible.filter(r=>r.vehicles.length).length,vehicles:rows.reduce((s,r)=>s+r.vehicles.length,0)};
console.log(JSON.stringify(summary));writeFileSync('veh-parking-baseline.json',JSON.stringify({summary,rows},null,2));
