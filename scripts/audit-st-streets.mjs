import {generateSite} from '../src/breach-site.ts';
import {proposeStreetInfrastructure,streetConflicts} from '../src/worldgen/street-infrastructure.ts';
import {planStreetFinishes} from '../src/worldgen/street-finish.ts';
import {planStreetMarkings} from '../src/worldgen/street-markings.ts';
import {writeFileSync} from 'node:fs';
const rows=[];
for(const scale of ['small','standard','large'])for(let seed=1;seed<=22;seed++){
 const legacyStart=performance.now();
 const s=generateSite(seed,scale,undefined,{}, {streetInfrastructure:false}),legacyMs=performance.now()-legacyStart,p=proposeStreetInfrastructure(s);
 const modernStart=performance.now(),pilot=generateSite(seed,scale),modernMs=performance.now()-modernStart;
 const semantic=s=>JSON.stringify([s.rooms,s.doors,s.walls,s.windows,s.spawn,s.enemies,s.objective,s.extract,s.encounter]);
 if(semantic(pilot)!==semantic(s))throw Error('ST pilot changed mission semantics '+seed+':'+scale);
 if(pilot.streetInfrastructure&&streetConflicts(pilot,pilot.streetInfrastructure).length)throw Error('ST pilot public conflict');
 rows.push({pilot:!!pilot.streetInfrastructure,actualLanes:pilot.streetInfrastructure?.completeLanes??0,actualFull:!!pilot.streetInfrastructure&&!pilot.streetInfrastructure.cropped,junction:!!pilot.streetInfrastructure?.junction,stopControlled:pilot.streetInfrastructure?.junction?.stopAt!==undefined,legacyMs:Math.round(legacyMs),modernMs:Math.round(modernMs),doubleRows:(pilot.exteriorZones??[]).filter(z=>z.vehicleParking?.secondRowCenter!==undefined).length,pilotVehicles:pilot.cover.filter(c=>['sedan','hatchback','pickup','suv','van','light-truck'].includes(c.fixture)).length,legacyVehicles:s.cover.filter(c=>['sedan','hatchback','pickup','suv','van','light-truck'].includes(c.fixture)).length,seed,scale,archetype:s.archetype,entry:s.entrySide,kind:p?.kind??null,visible:p?.visibleRoadWidth??0,nominal:p?p.nominalLanes*p.nominalLaneWidth:0,lanes:p?.completeLanes??0,cropped:p?.cropped??false,sidewalk:!!p?.frontage.sidewalk,conflicts:p?streetConflicts(s,p):[],marks:planStreetFinishes(pilot).length+planStreetMarkings(pilot).length});
}
const summary={sites:rows.length,actualFull:rows.filter(r=>r.actualFull).length,actualCompleteLane:rows.filter(r=>r.actualLanes>0).length,junctions:rows.filter(r=>r.junction).length,stopControlled:rows.filter(r=>r.stopControlled).length,doubleRows:rows.reduce((n,r)=>n+r.doubleRows,0),byScale:Object.fromEntries(['small','standard','large'].map(scale=>[scale,{sites:rows.filter(r=>r.scale===scale).length,accepted:rows.filter(r=>r.scale===scale&&r.pilot).length}])),pilotAccepted:rows.filter(r=>r.pilot).length,pilotVehicles:rows.reduce((n,r)=>n+r.pilotVehicles,0),legacyVehicles:rows.reduce((n,r)=>n+r.legacyVehicles,0),proposed:rows.filter(r=>r.kind).length,full:rows.filter(r=>r.kind&&!r.cropped).length,withSidewalk:rows.filter(r=>r.sidewalk).length,withConflicts:rows.filter(r=>r.conflicts.length).length,withCompleteLane:rows.filter(r=>r.lanes>0).length};
console.log('ST shadow audit '+JSON.stringify(summary));writeFileSync('st-street-baseline.json',JSON.stringify({summary,rows},null,2)+'\n');
