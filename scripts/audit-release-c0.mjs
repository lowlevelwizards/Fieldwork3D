/** C0 bounded real-site baseline. Measurements are environment-specific,
 * not mobile FPS. Never modifies generated maps or runtime state. */
import {writeFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {auditGeneratedSite} from '../src/breach-site-audit.ts';
const seeds=[110,111,112,113,114,115,116,117,118,119,120];
const scales=['small','medium','large'];
const rows=[];
for(const scale of scales)for(const seed of seeds){
 const started=performance.now();
 const result=auditGeneratedSite(seed,scale);
 const elapsed=Math.round((performance.now()-started)*10)/10;
 const ballistic=result.ballisticQuality??[];
 const sight=result.sightlineQuality??[];
 rows.push({seed,scale,archetype:result.archetype,
   family:result.planFamily??result.layout,
   entry:result.entrySide,elapsedMs:elapsed,
   errors:result.errors,
   completenessPenalty:result.designQuality.score,
   quality:result.compositeQuality.score,
   alternateEntries:result.tacticalOpportunities.alternativeDoors,
   windowEntries:result.tacticalOpportunities.potentialWindowEntries,
   roomCoverAndDoor:result.tacticalOpportunities.roomsWithCoverAndDoor,
   usableFiringCover:ballistic.reduce((n,r)=>n+r.usableFiringCoverPositions,0),
   usefulSightlineRooms:sight.filter(r=>r.thresholds>0&&r.exposedSamples>0).length,
   blockedRoutes:result.mobilityQuality.blockedApproaches+
     result.mobilityQuality.blockedFlow,
   physicalProps:result.typedProps,
   rooms:result.rooms});
}
const sorted=rows.map(r=>r.elapsedMs).sort((a,b)=>a-b);
const summary={sampled:rows.length,archetypes:new Set(rows.map(r=>r.archetype)).size,
 invalid:rows.filter(r=>r.errors.length).length,
 medianMs:sorted[Math.floor(sorted.length/2)],
 p90Ms:sorted[Math.floor((sorted.length-1)*.9)],
 maxMs:sorted.at(-1),
 meanQuality:Math.round(rows.reduce((n,r)=>n+r.quality,0)/rows.length*10)/10};
const payload={context:'CI/Node host-relative only; baseline is a generated map audit, not a gameplay simulation or iPhone FPS',summary,rows};
const output=process.argv[2];
if(output)writeFileSync(output,JSON.stringify(payload,null,2)+'\n');
console.log('Release C0 map corpus',JSON.stringify(summary));
for(const row of rows.filter(r=>r.errors.length))
 console.error('Invalid site',row.seed,row.scale,row.errors);
if(summary.invalid)process.exitCode=1;
if(summary.archetypes!==11)process.exitCode=1;
