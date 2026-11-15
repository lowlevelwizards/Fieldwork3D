/** D3.17A — offline-only case aggregation of ALREADY RECORDED real-motor
 * five-second windows. This module does not import the game or touch movement.
 * A repeated low-net-distance window is a real oscillation signal, NOT
 * proof that a door, waypoint, or routing subsystem caused it.
 */
const r2=n=>Math.round(n*100)/100;
const episodeWindow=w=>w?.classification==='movement-loop';
const keyOf=(row,mode,id)=>[row.seed,row.archetype,row.scale,mode.mode,id].join('|');
function completeEpisode(row,mode,id,bucket,results){
 if(!bucket.length||!bucket.some(w=>w.suspicious))return;
 const total=key=>r2(bucket.reduce((sum,w)=>sum+(w[key]??0),0));
 const minNet=bucket.reduce((v,w)=>Math.min(v,w.net??Infinity),Infinity);
 const elapsed=5*bucket.length;
 const travelled=total('travel'),net=total('net');
 const op=mode.operators?.find(o=>o.id===id);
 const typed=mode.routeTransitions?.byActor??{};
 const routeCounts=Object.fromEntries(Object.entries(typed)
  .filter(([key])=>key.startsWith(id+':'))
  .map(([key,value])=>[key.slice(id.length+1),value]));
 // Full-run transition totals alone cannot attribute a specific 5s loop.
 // Only the opt-in, time-stamped trace can support local route evidence.
 const routeEvents=(mode.routeTransitions?.events??[]).filter(e=>
  e.actorId===id&&e.seconds>=bucket[0].seconds-5&&
  e.seconds<=bucket.at(-1).seconds);
 const episodeRouteCounts={};
 for(const e of routeEvents)
  episodeRouteCounts[e.source]=(episodeRouteCounts[e.source]??0)+1;
 const firstPosition=bucket[0].position,lastPosition=bucket.at(-1).position;
 const sampledReturnDistance=firstPosition&&lastPosition?
  r2(Math.hypot(lastPosition.x-firstPosition.x,
    lastPosition.y-firstPosition.y)):null;
 const waypointKeys=bucket.map(w=>w.nextNav?
  [Math.round(w.nextNav.x),Math.round(w.nextNav.y)].join(','):null);
 const uniqueWaypoints=[...new Set(waypointKeys.filter(Boolean))];
 const doorEpisodes=[...new Set(bucket.map(w=>w.doorEpisode).filter(Boolean))];
 const pauses=[...new Set(bucket.map(w=>w.motorPause).filter(Boolean))];
 results.push({
  key:keyOf(row,mode,id),seed:row.seed,archetype:row.archetype,
  scale:row.scale,mode:mode.mode,actor:id,
  firstWindow:bucket[0].seconds,lastWindow:bucket.at(-1).seconds,
  intervalStart:r2(bucket[0].seconds-5),intervalEnd:bucket.at(-1).seconds,
  elapsedSeconds:elapsed,windows:bucket.length,
  evidenceClass:bucket.length>=2?'consecutive-loop-windows':
   'isolated-flagged-window-check-prior-state',
  flaggedWindows:bucket.filter(w=>w.suspicious).length,
  travel:travelled,sumWindowNet:net,minWindowNet:r2(minNet),
  lowNetTravel:r2(Math.max(0,travelled-net)),
  goalReduction:total('goalReduction'),
  remainingAtLastWindow:bucket.at(-1).remaining??null,
  blockedSeconds:total('blockedSeconds'),
  passageSeconds:total('passageSeconds'),
  openingSeconds:total('openingSeconds'),
  squeezeSeconds:total('squeezeSeconds'),retries:total('retries'),
  distinctNextWaypoints:uniqueWaypoints,doorEpisodes,pauses,
  // routeCounts is the WHOLE actor run, retained for historical comparison;
  // episodeRouteCounts and routeEvents are restricted to this incident.
  routeCounts,episodeRouteCounts,routeEvents,
  sampledReturnDistance,finalOutcome:op?.outcome??null,
  finallyArrived:op?.arrived??null,
  endOrder:op?.activeOrder??null,
  endRemaining:op?.remaining??null,
  // Raw evidence so follow-on B reproduces the exact physical coordinates,
  // not a guessed nearest door or a synthetic geometry situation.
  windowsEvidence:bucket.map(w=>({
   seconds:w.seconds,position:w.position,travel:w.travel,net:w.net,
   goalReduction:w.goalReduction,remaining:w.remaining,
   nextNav:w.nextNav,doorEpisode:w.doorEpisode,
   motorPause:w.motorPause,blockedSeconds:w.blockedSeconds,
   squeezeSeconds:w.squeezeSeconds,passageSeconds:w.passageSeconds,
   openingSeconds:w.openingSeconds,retries:w.retries,
   orderIssue:w.orderIssue,classification:w.classification,
   suspicious:w.suspicious
  }))
 });
}
export function analyzeD317LoopIncidents(report){
 if(!Array.isArray(report?.rows))throw Error('D3.17A requires complete real audit rows');
 const incidents=[],stateCounts={},siteModes=new Set();
 let flagged=0,loopWindows=0,physicalBlocks=0,sustainedStill=0;
 for(const row of report.rows)for(const mode of row.modes??[]){
  const byActor=new Map();
  for(const w of mode.progressEvidence??[]){
   stateCounts[w.classification]=(stateCounts[w.classification]??0)+1;
   if(episodeWindow(w))loopWindows++;
   if(episodeWindow(w)&&w.suspicious)flagged++;
   if(w.classification==='physical-obstruction'&&w.suspicious)physicalBlocks++;
   if(w.classification==='sustained-still'&&w.suspicious)sustainedStill++;
   if(!byActor.has(w.actor))byActor.set(w.actor,[]);
   byActor.get(w.actor).push(w);
  }
  for(const [id,windows] of byActor){
   windows.sort((a,b)=>a.seconds-b.seconds);
   let bucket=[];
   for(const w of windows){
    if(!episodeWindow(w)){
     completeEpisode(row,mode,id,bucket,incidents);
     bucket=[];continue;
    }
    if(bucket.length&&w.seconds-bucket.at(-1).seconds>5.01){
     completeEpisode(row,mode,id,bucket,incidents);bucket=[];
    }
    bucket.push(w);
   }
   completeEpisode(row,mode,id,bucket,incidents);
  }
 }
 incidents.sort((a,b)=>b.lowNetTravel-a.lowNetTravel||
  b.flaggedWindows-a.flaggedWindows||
  a.seed-b.seed||a.mode.localeCompare(b.mode)||a.actor.localeCompare(b.actor));
 for(const episode of incidents)siteModes.add(
  [episode.seed,episode.mode].join(':'));
 const covered=incidents.reduce((n,x)=>n+x.flaggedWindows,0);
 const summary={
  corpus:report.corpus??'historical',sites:report.rows.length,
  ticks:report.ticks,flaggedWindows:flagged,
  classifiedLoopWindows:loopWindows,
  incidents:incidents.length,
  consecutiveLoopIncidents:incidents.filter(x=>x.evidenceClass==='consecutive-loop-windows').length,
  isolatedFlaggedIncidents:incidents.filter(x=>x.evidenceClass!=='consecutive-loop-windows').length,
  distinctOperators:new Set(incidents.map(x=>x.key)).size,
  affectedSiteModes:siteModes.size,
  flaggedWindowsInIncidents:covered,
  orphanFlaggedWindows:flagged-covered,
  recoveredEpisodes:incidents.filter(x=>x.finallyArrived===true).length,
  physicallyUnreachedEpisodes:incidents.filter(x=>x.finallyArrived===false).length,
  totalLowNetTravel:r2(incidents.reduce((n,x)=>n+x.lowNetTravel,0)),
  incidentsWithTimedRoutes:incidents.filter(x=>x.routeEvents.length>0).length,
  timedRouteEvents:incidents.reduce((n,x)=>n+x.routeEvents.length,0),
  suspiciousPhysicalBlockWindows:physicalBlocks,
  suspiciousStillWindows:sustainedStill,classifiedWindows:stateCounts,
  realPhysicsSummary:report.summary??null
 };
 if(report.progressSummary?.suspectedLoops!==undefined&&
    report.progressSummary.suspectedLoops!==flagged)
  throw Error('D3.17A window count mismatches canonical auditor');
 if(summary.orphanFlaggedWindows!==0)
  throw Error('D3.17A lost actual flagged movement-loop windows');
 return {summary,incidents};
}
