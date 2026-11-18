/** D3.29A: read-only triage for terminally cancelled physical orders.
 * No execution authority, route knowledge, or inferred successful arrival.
 * "investigate" labels are questions, not proof that a failure is wrong.
 */
const round=n=>Number.isFinite(n)?Math.round(n*100)/100:null;
const distance=(a,b)=>a&&b?round(Math.hypot(a.x-b.x,a.y-b.y)):null;
export function classifyD329Cancellation(mode,op){
 if(op.arrived)return null;
 const doorId=op.lastFailedOrder?.doorId??op.doorEpisode?.doorId??
  op.activeOrderDetails?.doorId??mode.doorId??null;
 const door=mode.endDoorStates?.find(d=>d.id===doorId)??null;
 const failure=op.lastFailedOrder??null;
 const reason=String(failure?.reason??'');
 const witness=(mode.d329CancelDoorWitness??[]).findLast(e=>
  e.actor===op.id&&e.failedOrder?.id===failure?.id&&
  Math.abs((e.failedOrder?.at??-100)-(failure?.at??-200))<.05);
 const motorSelectedDoor=witness?.actualSelectedDoor??null;
 const lockedRouteDoor=!!motorSelectedDoor?.locked;
 const intermediary=!!motorSelectedDoor&&!!mode.doorId&&
   motorSelectedDoor.id!==mode.doorId;
 let family='other-cancelled';
 if(op.outcome!=='cancelled'||!op.failedOrders)
  family='not-terminally-cancelled';
 else if(door?.locked)family='physically-locked-door';
 else if(door?.jammed)family='physically-jammed-door';
 else if(mode.mode==='entry'&&door?.open&&door.fraction>=.95)
  family='entry-cancelled-after-open-door';
 else if(mode.mode==='authored'&&mode.doorId===null)
  family='authored-door-order-cancellation';
 else if(door&&(!door.open||door.fraction<.95))
  family='entry-incomplete-door-cancellation';
 return {id:op.id,site:mode.site??null,mode:mode.mode,
  outcome:op.outcome,family,doorId,
  lastFailedOrder:failure,failedOrders:op.failedOrders??0,
  remainingOrders:op.remainingOrders??0,
  originalGoal:op.goal??null,finalPosition:op.position??null,
  distanceToOriginalGoal:distance(op.position,op.goal),
  lastBlocker:op.lastBlocker??null,
  door:door?{id:door.id,open:door.open,fraction:door.fraction,
    locked:door.locked,jammed:door.jammed,wedged:door.wedged}:null,
  selectedMotorDoor:motorSelectedDoor,interveningDoor:intermediary,
  initialSelectedDoor:witness?.initialSelectedDoor??null,
  legalWorldRouteAtCancellation:witness?.legalWorldRoute??null,
  coldFineMotorRouteAtCancellation:witness?.coldFineWorld??null,
  lockedLeafMovedAfterClosedStart:!!witness?.initialSelectedDoor?.locked&&
   !witness.initialSelectedDoor.open&&!!motorSelectedDoor?.locked&&
   !!motorSelectedDoor.open,
  lockedMotorDoorVerified:lockedRouteDoor,
  lockedDoorAtFailure:witness?.lockedNearby??[],
  cancellationAt:witness?.seconds??failure?.at??null,
  reason,
  physicallyArrived:false};
}
export function analyzeD329CancellationAudit(audit){
 if(audit.ticks!==2700||audit.rows?.length!==22||
    !audit.progressSummary||!audit.routeQualitySummary)
  throw Error('D3.29 requires actual independent 22-map 45s physical replay');
 const summary=audit.summary??{};
 if(summary.exceptions||summary.invalidPositions||
    summary.physicsStepViolations||summary.corruptedPlans||
    summary.arrivedDespiteCancellation||summary.unreachedDrainedOperators)
  throw Error('D3.29 physical-integrity failure');
 let arrivals=0,full=0,operators=0;
 const cases=[];
 for(const [siteIndex,row] of audit.rows.entries()){
  if(row.modes?.length!==2)throw Error('Missing authored/entry pair');
  for(const mode of row.modes){
   if(mode.operators?.length!==4)throw Error('Missing actual four-person squad');
   arrivals+=mode.arrivals;
   if(mode.arrivals===4&&mode.accepted===4)full++;
   operators+=mode.operators.length;
   for(const op of mode.operators){
    const record=classifyD329Cancellation(mode,op);
    if(record)cases.push({...record,siteIndex,archetype:row.archetype,
      seed:row.seed,scale:row.scale,accepted:mode.accepted,
      cancelEvents:mode.orderCancelledEvents??[]});
   }
  }
 }
 if(operators!==176||arrivals!==summary.physicalArrivals||
    full!==summary.physicalCompletedFour||
    cases.length!==operators-arrivals)
  throw Error('D3.29 derived case counts disagree with authoritative motor');
 const byFamily={},byLockedProvenance={};
 for(const c of cases){
  byFamily[c.family]=(byFamily[c.family]??0)+1;
  const provenance=c.lockedMotorDoorVerified?
   c.interveningDoor?'locked-intervening-door':'locked-selected-door':
   c.door?.locked?'locked-selected-entry-door':
   'unattributed-lock-message';
  byLockedProvenance[provenance]=(byLockedProvenance[provenance]??0)+1;
 }
 const ordered=['entry-cancelled-after-open-door',
   'authored-door-order-cancellation',
   'entry-incomplete-door-cancellation','physically-jammed-door',
   'physically-locked-door','other-cancelled','not-terminally-cancelled'];
 cases.sort((a,b)=>ordered.indexOf(a.family)-ordered.indexOf(b.family)||
   a.siteIndex-b.siteIndex||a.id.localeCompare(b.id));
 return {summary:{corpus:audit.corpus,operators,arrivals,fullSquads:full,
   cancelledCases:cases.length,byFamily,byLockedProvenance,
   suspectedLoops:audit.progressSummary.suspectedLoops,
   routeSearches:audit.routeQualitySummary.searches},
   cases};
}

/** D3.29F: explicitly version the physically honest baseline.
 * The earlier 161 / 37 counted seven physically prohibited locked-door
 * crossings. This gate preserves all 154 genuinely reached goals, all 35
 * complete squads, zero loops, and requires every non-arrival to be a real,
 * terminal lock encounter. No cancelled order is credited as an arrival.
 */
export const D329_PHYSICAL_BASELINE=Object.freeze({
  operators:176,arrivals:154,fullSquads:35,
  maxLockCancellations:22,suspectedLoops:0
});
export function validateD329PhysicalRelease(result){
 const s=result.summary??{},cases=result.cases??[];
 const errors=[];
 if(s.operators!==D329_PHYSICAL_BASELINE.operators)
  errors.push('operator corpus changed');
 if(s.arrivals<D329_PHYSICAL_BASELINE.arrivals)
  errors.push('physically valid arrivals regressed');
 if(s.fullSquads<D329_PHYSICAL_BASELINE.fullSquads)
  errors.push('complete squads regressed');
 if(s.suspectedLoops!==0)
  errors.push('movement loops detected');
 if(cases.length>D329_PHYSICAL_BASELINE.maxLockCancellations)
  errors.push('new operator non-arrivals beyond the documented locked-door set');
 for(const c of cases){
  if(c.outcome!=='cancelled'||c.physicallyArrived!==false)
   errors.push('non-arrival lacks authoritative terminal cancellation: '+c.id);
  if(!/DOOR LOCKED/.test(c.reason))
   errors.push('non-lock cancellation: '+c.site+'/'+c.id+'/'+c.reason);
  if(!c.lockedMotorDoorVerified&&!c.door?.locked&&
     !(c.lockedDoorAtFailure?.length>0))
   errors.push('locked obstruction has no physical door witness: '+c.site+'/'+c.id);
  if(c.lockedLeafMovedAfterClosedStart)
   errors.push('closed locked leaf illegally opened: '+c.site+'/'+c.id);
 }
 return {ok:errors.length===0,errors,expected:D329_PHYSICAL_BASELINE};
}
