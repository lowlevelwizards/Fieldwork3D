/** Concise factual report for frozen D3 movement holdout. No pass-rate
 * threshold: genuinely poor navigation on novel maps is a FINDING, not a
 * reason to cherry-pick different seeds. Only malformed/unsafe runs fail CI.
 */
import fs from 'node:fs';
import {D3_HOLDOUT_22,D3_HOLDOUT_22_ID}
 from './lib/d3-holdout-22-manifest.mjs';

const file=process.argv[2];
if(!file)throw Error('usage: node scripts/report-d3-holdout-22.mjs <audit.json>');
const data=JSON.parse(fs.readFileSync(file,'utf8'));
if(data.corpus!==D3_HOLDOUT_22_ID||data.ticks!==2700||
   data.rows?.length!==22)
 throw Error('wrong/incomplete holdout corpus, duration or count');
const rows=data.rows;
for(let i=0;i<D3_HOLDOUT_22.length;i++){
 const expected=D3_HOLDOUT_22[i],row=rows[i];
 for(const key of ['seed','archetype','scale'])
  if(row?.[key]!==expected[key])
   throw Error('holdout manifest mismatch at '+i+': '+key);
 if(row.error)continue;
 if(row.modes?.length!==2||
    row.modes[0].mode!=='authored'||row.modes[1].mode!=='entry')
  throw Error('missing authored/entry run at seed '+row.seed);
}
const modes=rows.flatMap(r=>(r.modes??[]).map(m=>({...m,seed:r.seed,
 archetype:r.archetype,scale:r.scale})));
const sum=(arr,key)=>arr.reduce((n,r)=>n+(r[key]??0),0);
function summarize(arr){
 const operators=arr.flatMap(x=>x.operators??[]);
 const progress=arr.flatMap(x=>x.progressEvidence??[]);
 const bad=progress.filter(x=>x.suspicious);
 const episodes=arr.flatMap(x=>x.doorFlipDetails?.map(d=>({
  seed:x.seed,mode:x.mode,door:d.id,flips:d.flips}))??[]);
 return {
  runs:arr.length,acceptedFour:arr.filter(x=>x.accepted===4).length,
  rejected:sum(arr,'rejected'),operatorsExpected:arr.length*4,
  physicalArrivals:sum(arr,'arrivals'),
  fullyArrivedSquads:arr.filter(x=>x.accepted===4&&x.arrivals===4).length,
  logicalCompletions:arr.filter(x=>x.complete).length,
  logicallyDoneButNotArrived:operators.filter(x=>!x.arrived&&x.remainingOrders===0).length,
  stallEpisodes:sum(arr,'stallEpisodes'),retries:sum(arr,'retries'),
  doorStateFlips:sum(arr,'doorStateFlips'),
  nearDoorDirectionReversals:sum(arr,'reversalsNearDoor'),
  suspiciousWindows:bad.length,
  suspectedLoops:bad.filter(x=>x.classification==='movement-loop').length,
  sustainedStill:bad.filter(x=>x.classification==='sustained-still').length,
  invalidPositions:sum(arr,'invalidPositions'),
  physicalStepViolations:sum(arr,'physicsStepViolations'),
  corruptedPlans:arr.filter(x=>!x.planIntact).length,
  unboundedManeuverAttempts:sum(arr,'unboundedManeuverAttempts'),
  worstDoorFlips:episodes.sort((a,b)=>b.flips-a.flips).slice(0,6)
 };
}
const all=summarize(modes);
const byMode={
 authored:summarize(modes.filter(m=>m.mode==='authored')),
 entry:summarize(modes.filter(m=>m.mode==='entry'))
};
const triageCounts={};
for(const mode of modes)for(const t of mode.triage??[]){
 triageCounts[t.state]=(triageCounts[t.state]??0)+1;
}
const incidents=modes.flatMap(mode=>(mode.operators??[])
 .filter(a=>!a.arrived||a.stallEpisodes||a.orderIssue)
 .map(a=>({
  seed:mode.seed,archetype:mode.archetype,scale:mode.scale,
  mode:mode.mode,actor:a.id,arrived:a.arrived,
  remaining:a.remaining,goalDistance:a.startingGoalDistance,
  progressDistance:a.progressDistance,
  activeOrder:a.activeOrder,issue:a.orderIssue,
  motorPause:a.motorPause,doorId:a.doorEpisode?.doorId??null,
  stalled:a.stallEpisodes,blockedSeconds:a.blockedSeconds,
  longestStillSeconds:a.longestStillSeconds,retries:a.retries,
  status:mode.triage?.find(x=>x.actor===a.id)?.state??null
 })));
const siteOverview=rows.map(r=>({
 seed:r.seed,type:r.archetype,scale:r.scale,
 rooms:r.rooms??null,doors:r.doors??null,
 authored:r.modes?.find(x=>x.mode==='authored')?.arrivals??null,
 entry:r.modes?.find(x=>x.mode==='entry')?.arrivals??null,
 stalls:sum(r.modes??[],'stallEpisodes'),
 rejected:sum(r.modes??[],'rejected'),
 error:r.error??null
}));
const report={
 id:D3_HOLDOUT_22_ID,baseBuild:process.env.GITHUB_SHA??null,
 protocol:'22 unseen seeds; 11 archetypes x two sizes; 4 operators; 45s; quiet movement and door test',
 summary:all,byMode,triageCounts,
 routeQuality:data.routeQualitySummary,
 progress:data.progressSummary,
 exceptions:data.summary.exceptions,
 siteOverview,
 incidents:incidents.sort((a,b)=>b.stalled-a.stalled||
  Number(a.arrived)-Number(b.arrived)||
  b.blockedSeconds-a.blockedSeconds)
};
console.log('HOLDOUT_22_REPORT '+JSON.stringify(report));
console.log('\nSite (type/size)           MOVE  ENTRY  stalls  rejected');
for(const s of siteOverview)console.log(
 String(s.seed).padEnd(8)+' '+
 (s.type+'/'+s.scale).padEnd(24)+' '+
 String(s.authored??'-').padStart(4)+'  '+
 String(s.entry??'-').padStart(5)+'  '+
 String(s.stalls).padStart(6)+'  '+
 String(s.rejected).padStart(8));
console.log('\nSUMMARY '+JSON.stringify({summary:all,byMode,triageCounts},null,2));
fs.writeFileSync(file.replace(/\.json$/,'-report.json'),JSON.stringify(report,null,2)+'\n');
if(data.summary.exceptions||all.invalidPositions||all.physicalStepViolations||
   all.corruptedPlans||all.unboundedManeuverAttempts)
 throw Error('holdout exposed a physical safety or test infrastructure regression');
