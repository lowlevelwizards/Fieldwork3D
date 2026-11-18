/** D3.25A: read-only full-motor evidence for an accepted generated ENTRY
 * that produces zero real operator arrivals. Does not reclassify
 * drained plans as arrivals or modify a runtime move/door/route. */
import fs from 'node:fs';
const filename=process.argv[2];
if(!filename)throw Error('Usage: report-d3-25-entry-stalls.mjs audit.json');
const audit=JSON.parse(fs.readFileSync(filename,'utf8'));
if(audit.ticks!==2700||audit.rows?.length!==1)
 throw Error('D3.25 requires one exact-site 45s physical audit');
const row=audit.rows[0],entry=row.modes?.find(m=>m.mode==='entry');
if(!entry||!Array.isArray(entry.operators)||entry.operators.length!==4)
 throw Error('D3.25 requires all four generated-entry physical operators');
const target={
 site:row.archetype,seed:row.seed,scale:row.scale,mode:'entry',
 accepted:entry.accepted,physicalArrivals:entry.arrivals,
 selectedDoor:entry.doorId,reason:entry.reason,
 operators:entry.operators.map(op=>({
  id:op.id,arrived:op.arrived,outcome:op.outcome,
  position:op.position,goal:op.goal,remaining:op.remaining,
  activeOrder:op.activeOrderDetails,
  nextNav:op.nextNav,blocker:op.lastBlocker,
  doorEpisode:op.doorEpisode,motorPause:op.motorPause,
  blocked:op.blockedSeconds,wait:op.waitSeconds,
  longestStill:op.longestStillSeconds,
  progress:op.progressDistance,syncReady:op.syncReady,
  doorHand:op.doorHand,remainingOrders:op.remainingOrders
 })),
 doors:entry.endDoorStates?.filter(d=>d.id===entry.doorId||
  entry.operators.some(o=>o.doorEpisode?.doorId===d.id||
    o.activeOrderDetails?.doorId===d.id)),
 transitions:{
  counts:entry.routeTransitions?.counts??{},
  byActor:entry.routeTransitions?.byActor??{},
  rejectReasons:entry.routeTransitions?.rejectReasons??{},
  escapeReacquirePairs:entry.routeTransitions?.escapeReacquirePairs??0,
  finalEvents:(entry.routeTransitions?.events??[]).slice(-35)
 },
 feasibility:entry.d325Feasibility??null,
 entrySettles:entry.entryLandingEvidence?.slice(-16)??[],
 queueMoves:entry.queueMotionEvidence?.slice(-20)??[],
 doorBlocks:entry.physicalBlockEvidence?.slice(-22)??[],
 doorWitness:entry.doorEvidence?.slice(-20)??[],
 progressWindows:entry.progressEvidence?.slice(-12)??[]
};
if(audit.summary?.exceptions||audit.summary?.invalidPositions||
 audit.summary?.physicsStepViolations||audit.summary?.corruptedPlans)
 throw Error('D3.25 physical integrity violated');
console.log('D325_ENTRY_STALL',JSON.stringify(target));
