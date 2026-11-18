/** D3.30D: physical release truth, not historical ghost-arrival thresholds.
 * This is an audit-only gate. It does not modify motor collision or gameplay.
 * The 11-site, 88-operator baseline is D3.29 lock-respecting physical truth.
 */
export const D330_MAINLINE_BASELINE=Object.freeze({
 sites:11,operators:88,acceptedFour:22,arrivals:75,fullSquads:16,
 maxTerminalLocked:13,loops:0,maxStalls:9,maxRetries:6,maxSearches:4070
});
export function verifyD330Mainline(data){
 const s=data?.summary??{},p=data?.progressSummary??{},
  q=data?.routeQualitySummary??{},expected=D330_MAINLINE_BASELINE;
 const errors=[];
 if(data?.ticks!==2700||data?.rows?.length!==expected.sites)
  errors.push('changed 11-site / 2700-tick physical corpus');
 if(s.acceptedFour!==expected.acceptedFour||s.completedFour<expected.acceptedFour)
  errors.push('missing accepted or completed operator squads');
 if(s.physicalArrivals<expected.arrivals||s.physicalCompletedFour<expected.fullSquads)
  errors.push('real physical arrival regression');
 if(s.exceptions||s.invalidPositions||s.corruptedPlans||s.physicsStepViolations||
    s.unboundedManeuverAttempts||s.arrivedDespiteCancellation||
    s.unreachedDrainedOperators||s.physicallyPendingOperators)
  errors.push('physical integrity, false arrival, or unresolved order');
 if(p.sustainedStill||p.suspectedLoops||s.stallEpisodes>expected.maxStalls||
    s.retries>expected.maxRetries)
  errors.push('new physical stall or movement loop');
 if(q.searches>expected.maxSearches)
  errors.push('route-search performance regression');
 const missing=[];
 for(const row of data?.rows??[]){
  if(row.modes?.length!==2)errors.push('missing paired authored/entry mode');
  for(const mode of row.modes??[]){
   if(mode.operators?.length!==4)errors.push('missing complete four-person census');
   for(const op of mode.operators??[]){
    if(op.arrived)continue;
    missing.push({site:row.archetype,seed:row.seed,mode:mode.mode,actor:op.id});
    const failed=op.lastFailedOrder;
    if(op.outcome!=='cancelled'||!op.failedOrders||
       !/DOOR LOCKED/.test(failed?.reason??''))
     errors.push('non-arrival without terminal locked-door witness: '+row.seed+'/'+op.id);
    const evidence=(mode.d329CancelDoorWitness??[]).findLast(w=>
      w.actor===op.id&&w.failedOrder?.id===failed?.id&&
      Math.abs((w.failedOrder?.at??-100)-(failed?.at??-200))<.05);
    if(!evidence||evidence.lockedNearby?.length===0&&
       !evidence.actualSelectedDoor?.locked)
     errors.push('locked-door cancellation without physical obstruction evidence: '+row.seed+'/'+op.id);
    if(evidence?.initialSelectedDoor?.locked&&
       !evidence.initialSelectedDoor.open&&
       evidence.actualSelectedDoor?.locked&&evidence.actualSelectedDoor.open)
     errors.push('illegally opened locked door: '+row.seed+'/'+op.id);
   }
  }
 }
 if(missing.length!==expected.operators-s.physicalArrivals||
    missing.length>expected.maxTerminalLocked||
    missing.length!==s.cancelledAndNotArrived)
  errors.push('non-arrival census disagrees with physical summary');
 return {ok:errors.length===0,errors,missing,
  observed:{arrivals:s.physicalArrivals,fullSquads:s.physicalCompletedFour,
   terminalLocked:missing.length,loops:p.suspectedLoops,searches:q.searches},
  expected};
}