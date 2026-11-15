/** D3.17A forensic ranking of already-observed real-motor 5s windows.
 * Usage: node scripts/report-d3-17a-loop-forensics.mjs input.json output.json
 * This reads evidence. It does not simulate movement, edit goals, or replan.
 */
import fs from 'node:fs';
import {analyzeD317LoopIncidents} from './lib/d3-17a-loop-incidents.mjs';
const [input,output]=process.argv.slice(2);
if(!input||!output)throw Error('usage: node scripts/report-d3-17a-loop-forensics.mjs input.json output.json');
const data=JSON.parse(fs.readFileSync(input,'utf8'));
if(data.ticks!==2700||data.rows.length!==22||
   data.summary.exceptions||data.summary.physicsStepViolations||
   data.summary.invalidPositions||data.summary.corruptedPlans)
 throw Error('D3.17A requires safe 22-map x 45s physics evidence');
if(data.rows.some(r=>r.modes?.length!==2||
 r.modes.some(m=>!Array.isArray(m.progressEvidence))))
 throw Error('missing exact authored/entry progress evidence');
const report=analyzeD317LoopIncidents(data);
fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
const top=report.incidents.slice(0,15).map(e=>({
 seed:e.seed,site:e.archetype,scale:e.scale,mode:e.mode,
 actor:e.actor,at:e.intervalStart+'-'+e.intervalEnd,
 windows:e.windows,flagged:e.flaggedWindows,
 evidenceClass:e.evidenceClass,travel:e.travel,
 lowNetTravel:e.lowNetTravel,goalReduction:e.goalReduction,
 endRemaining:e.endRemaining,finalOutcome:e.finalOutcome,
 pause:e.pauses,doorEpisode:e.doorEpisodes,
 nextNav:e.distinctNextWaypoints,route:e.routeCounts
}));
console.log('D317A_LOOP_FORENSICS '+JSON.stringify({
 summary:report.summary,top
}));
