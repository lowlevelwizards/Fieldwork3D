/** D3.14D eighth independent paired holdout report.
 * Exactly the SAME fixed 22 maps and 60Hz motor workload for base/head.
 * Never silently drop rejected orders, incomplete runs or suspicious loops.
 */
import fs from 'node:fs';
import {D314D_HOLDOUT_22,D314D_HOLDOUT_ID}
 from './lib/d3-14d-eighth-blind22.mjs';
const [baseFile,headFile]=process.argv.slice(2);
if(!baseFile||!headFile)
 throw Error('usage: node scripts/report-d3-14d-blind22.mjs base.json head.json');
const load=file=>{
 const result=JSON.parse(fs.readFileSync(file,'utf8'));
 if(result.corpus!==D314D_HOLDOUT_ID||result.ticks!==2700||
    result.rows?.length!==22)throw Error('wrong cohort: '+file);
 for(let i=0;i<22;i++){
  const row=result.rows[i],expected=D314D_HOLDOUT_22[i];
  for(const key of ['seed','archetype','scale'])
   if(row?.[key]!==expected[key])
    throw Error('replaced seed/map: '+file+' '+i+' '+key);
  if(row.modes?.length!==2||row.modes[0].mode!=='authored'||
     row.modes[1].mode!=='entry')
    throw Error('missing movement mode: '+file+' '+i);
 }
 if(result.summary.exceptions||result.summary.invalidPositions||
    result.summary.corruptedPlans||result.summary.physicsStepViolations||
    result.summary.unboundedManeuverAttempts)
  throw Error('invalid physics, authored plans or infrastructure: '+file);
 return result;
};
const base=load(baseFile),head=load(headFile);
const names=['physicalArrivals','physicalCompletedFour','completedFour',
 'stallEpisodes','retries','doorStateFlips','invalidPositions',
 'physicsStepViolations'];
const stats=report=>Object.fromEntries(names.map(k=>[k,report.summary[k]]));
const modeRows=(report)=>report.rows.flatMap(row=>
 row.modes.map(m=>({seed:row.seed,type:row.archetype,scale:row.scale,
   mode:m.mode,arrivals:m.arrivals,stalls:m.stallEpisodes,
   retries:m.retries,complete:m.complete})));
const rowsBase=modeRows(base),rowsHead=modeRows(head);
const differences=rowsHead.map((r,i)=>({
 ...r,baselineArrivals:rowsBase[i].arrivals,
 deltaArrivals:r.arrivals-rowsBase[i].arrivals,
 deltaStalls:r.stalls-rowsBase[i].stalls,
 deltaRetries:r.retries-rowsBase[i].retries
})).filter(r=>r.deltaArrivals||r.deltaStalls||r.deltaRetries);
const summary={corpus:D314D_HOLDOUT_ID,
 baseline:stats(base),candidate:stats(head),
 progress:{baseline:base.progressSummary,candidate:head.progressSummary},
 route:{baseline:base.routeQualitySummary,candidate:head.routeQualitySummary},
 changedCases:differences};
console.log('D314D_PAIRED22 '+JSON.stringify(summary));
fs.writeFileSync(headFile.replace(/\.json$/,'-comparison.json'),
 JSON.stringify(summary,null,2)+'\n');
const bs=base.summary,cs=head.summary;
const bp=base.progressSummary,cp=head.progressSummary;
if(cs.physicalArrivals<bs.physicalArrivals||
   cs.physicalCompletedFour<bs.physicalCompletedFour||
   cs.completedFour<bs.completedFour||
   cs.stallEpisodes>bs.stallEpisodes||
   cp.suspectedLoops>bp.suspectedLoops||
   cp.sustainedStill>bp.sustainedStill)
 throw Error('D3.14D2 fails unseen cohort no-regression gate — do not merge');
if(differences.some(r=>r.deltaArrivals<0))
 throw Error('D3.14D2 loses an arrival on an unseen individual squad — reject');
if(head.routeQualitySummary.searches>base.routeQualitySummary.searches*1.12+50)
 throw Error('D3.14D2 excessive search work on unseen maps — do not merge');
