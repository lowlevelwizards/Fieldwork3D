/** D3.26A: inspect FINAL physical failed arrivals in the unchanged
 * independent 22-map/45-second production motor replay.
 * Read-only, offline-only; it does not declare a cancellation an arrival.
 *
 * Usage: node scripts/report-d3-26-last-failures.mjs fresh22.json
 */
import fs from 'node:fs';

const source=process.argv[2];
if(!source)throw Error('Usage: report-d3-26-last-failures.mjs fresh22.json');
const audit=JSON.parse(fs.readFileSync(source,'utf8'));
if(audit.ticks!==2700||audit.rows?.length!==22||!audit.corpus)
 throw Error('D3.26 requires the exact 22-map, 45-second fresh cohort');
if(!audit.progressSummary||!audit.routeQualitySummary)
 throw Error('D3.26 requires --progress and --route-quality evidence');
const summary=audit.summary;
if(summary.exceptions||summary.invalidPositions||summary.physicsStepViolations||
 summary.corruptedPlans||summary.unboundedManeuverAttempts||
 summary.arrivedDespiteCancellation||summary.unreachedDrainedOperators)
 throw Error('D3.26 physical truth/position/plan integrity failed');
const rounded=n=>Number.isFinite(n)?Math.round(n*100)/100:null;
const distance=(a,b)=>a&&b?rounded(Math.hypot(a.x-b.x,a.y-b.y)):null;
const unarrived=[],rejected=[],loops=[];
let arrivals=0,completed=0,operators=0;
for(const [siteIndex,row] of audit.rows.entries()){
 if(!Array.isArray(row.modes)||row.modes.length!==2)
  throw Error('Missing authored/entry results at site '+siteIndex);
 for(const mode of row.modes){
  if(!Array.isArray(mode.operators)||mode.operators.length!==4)
   throw Error('Missing four physical operators at '+siteIndex);
  operators+=4;arrivals+=mode.arrivals;
  if(mode.accepted===4&&mode.arrivals===4)completed++;
  if(mode.rejected)rejected.push({siteIndex,archetype:row.archetype,
   seed:row.seed,scale:row.scale,mode:mode.mode,
   accepted:mode.accepted,reason:mode.reason});
  for(const op of mode.operators){
   if(op.arrived)continue;
   const activeDoor=mode.endDoorStates?.find(d=>
    d.id===(op.doorEpisode?.doorId??op.activeOrderDetails?.doorId??
      mode.doorId))??null;
   const record={siteIndex,archetype:row.archetype,seed:row.seed,
    scale:row.scale,mode:mode.mode,accepted:mode.accepted,
    doorId:mode.doorId??null,operator:op.id,outcome:op.outcome,
    goalDistance:distance(op.position,op.goal),
    startGoalDistance:op.startingGoalDistance??null,
    progressDistance:op.progressDistance,
    stillSeconds:op.longestStillSeconds,
    blockedSeconds:op.blockedSeconds,waitSeconds:op.waitSeconds,
    retries:op.retries,lastBlocker:op.lastBlocker,
    activeOrder:op.activeOrderDetails,remainingOrders:op.remainingOrders,
    failedOrders:op.failedOrders,
    nextNav:op.nextNav,position:op.position,goal:op.goal,
    doorEpisode:op.doorEpisode,activeDoor,
    routeActor:mode.routeTransitions?.byActor?.[op.id]??null,
    routeRejects:mode.routeTransitions?.rejectsByActor?.[op.id]??null,
    suspicious:(mode.progressEvidence??[]).filter(e=>e.actor===op.id&&e.suspicious)
      .map(e=>({seconds:e.seconds,classification:e.classification,
       state:e.state,displacement:e.displacement})).slice(-4)};
   unarrived.push(record);
   if(record.suspicious.length)loops.push(record);
  }
 }
}
if(operators!==176||arrivals!==summary.physicalArrivals||
 completed!==summary.physicalCompletedFour||
 unarrived.length!==176-summary.physicalArrivals)
 throw Error('D3.26 derived arrival numbers contradict original physical audit');
const counts={};
for(const op of unarrived){
 const key=[op.mode,op.outcome,op.lastBlocker??'none',
   op.activeOrder?.kind??'none'].join(' / ');
 counts[key]=(counts[key]??0)+1;
}
console.log('D326_COUNTS',JSON.stringify({
 corpus:audit.corpus,operators,arrivals,
 fullSquads:completed,notArrived:unarrived.length,
 suspectedLoops:audit.progressSummary.suspectedLoops,
 routeSearches:audit.routeQualitySummary.searches,
 routeCpuMs:audit.routeQualitySummary.cpuMs,
 outcomeGroups:counts,rejectedPreflight:rejected.length}));
for(const row of unarrived)
 console.log('D326_NONARRIVAL',JSON.stringify(row));
for(const row of rejected)
 console.log('D326_REJECTION',JSON.stringify(row));
for(const mode of audit.rows.flatMap(r=>r.modes))
 for(const event of mode.progressEvidence??[])
  if(event.suspicious&&event.classification==='movement-loop')
   console.log('D326_LOOP',JSON.stringify({
    mode:mode.mode,operator:event.actor,seconds:event.seconds,
    classification:event.classification,state:event.state,
    nav:event.nav,blocker:event.lastBlocker}));
