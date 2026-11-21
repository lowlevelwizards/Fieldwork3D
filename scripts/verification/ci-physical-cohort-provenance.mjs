/** A7b: read-only proof of actual bodies, event-matched locked cancellations,
 * and the maximum attainable arrival count without crossing proven locked doors.
 * Legacy raw floors remain enforced independently by their original jobs.
 * This verifier NEVER converts failed/pending orders into arrivals.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';

const physicalSafety=['exceptions','invalidPositions','corruptedPlans',
 'physicsStepViolations','unboundedManeuverAttempts','arrivedDespiteCancellation'];
function verifiedDoorLock(mode,op){
 const last=op.lastFailedOrder;
 if(!last||!Number.isFinite(last.at)||last.id==null||!last.reason?.includes('DOOR LOCKED'))
  return false;
 return (mode.d329CancelDoorWitness??[]).some(w=>
  w.actor===op.id&&w.failedOrder?.id===last.id&&
  Math.abs((w.failedOrder?.at??-100)-(last.at??-200))<0.05&&
  (w.actualSelectedDoor?.locked===true||(w.lockedNearby?.length??0)>0)&&
  !(w.initialSelectedDoor?.locked===true&&
    w.initialSelectedDoor?.open===false&&w.actualSelectedDoor?.locked===true&&
    w.actualSelectedDoor?.open===true));
}
export function classifyPhysicalCohort(report,{
 sites,legacyArrivals=null,legacyFullSquads=null,requireNoPending=false
}={}){
 const errors=[],rows=report?.rows??[];
 if(!Number.isInteger(sites)||sites<1||rows.length!==sites)
  errors.push('changed site corpus: expected '+sites+', saw '+rows.length);
 if(report?.ticks!==2700)errors.push('changed 2700-tick 60Hz physical corpus');
 const s=report?.summary??{},counts={
  operators:0,arrivals:0,fullSquads:0,locked:0,pending:0,unplanned:0,
  other:0,verifiedLocked:0
 };
 for(const key of physicalSafety)if(s[key])errors.push('physical safety '+key+'='+s[key]);
 for(const row of rows){
  if(row.modes?.length!==2)errors.push('missing paired modes at '+row.seed);
  for(const mode of row.modes??[]){
   if(mode.operators?.length!==4)
    errors.push('missing four physical operators: '+row.seed+'/'+mode.mode);
   let localArrivals=0;
   const names=new Set();
   for(const op of mode.operators??[]){
    counts.operators++;
    const identifier=[row.seed,mode.mode,op.id].join('/');
    if(names.has(op.id))errors.push(identifier+': duplicate operator');
    names.add(op.id);
    if(op.arrived){
     counts.arrivals++;localArrivals++;
     if(op.failedOrders||op.outcome==='cancelled'||op.outcome!=='arrived')
      errors.push(identifier+': false physical arrival or cancelled order');
    }else if(op.outcome==='cancelled'||op.failedOrders){
     counts.locked++;
     if(op.outcome!=='cancelled'||!op.failedOrders||
        !verifiedDoorLock(mode,op))
      errors.push(identifier+': no event-matched locked-door physical witness');
     else counts.verifiedLocked++;
    }else if(op.remainingOrders>0){
     counts.pending++;
    }else if(mode.accepted===0&&op.outcome==='unreached'&&
      op.remainingOrders===0){
     counts.unplanned++;
    }else{
     counts.other++;
     errors.push(identifier+': unexplained physical non-arrival');
    }
   }
   if(mode.arrivals!==localArrivals)
    errors.push(row.seed+'/'+mode.mode+': arrival census mismatch');
   if(localArrivals===4&&mode.accepted===4)counts.fullSquads++;
  }
 }
 const expectedTotal=sites*8;
 if(counts.operators!==expectedTotal)
  errors.push('operator count '+counts.operators+' != '+expectedTotal);
 for(const [key,observed] of [
  ['physicalArrivals',counts.arrivals],['physicalCompletedFour',counts.fullSquads],
  ['cancelledAndNotArrived',counts.locked],
  ['physicallyPendingOperators',counts.pending],
  ['unreachedDrainedOperators',counts.unplanned]])
  if(s[key]!==observed)
   errors.push(key+' summary mismatch: '+s[key]+' != '+observed);
 if(requireNoPending&&(counts.pending||counts.other))
  errors.push('unresolved physically pending operators: '+counts.pending);
 const fullyVerified=counts.locked===counts.verifiedLocked;
 const maxArrivalsWithSameLockedDoors=fullyVerified?expectedTotal-counts.locked:null;
 const legacyFloorUnattainable=fullyVerified&&
  legacyArrivals!=null&&legacyArrivals>maxArrivalsWithSameLockedDoors;
 return {
  ok:errors.length===0,errors,sites:rows.length,ticks:report?.ticks,
  counts,legacy:{minArrivals:legacyArrivals,minFullSquads:legacyFullSquads,
   rawArrivalDeficit:legacyArrivals==null?null:Math.max(0,legacyArrivals-counts.arrivals),
   rawSquadDeficit:legacyFullSquads==null?null:Math.max(0,legacyFullSquads-counts.fullSquads),
   maxArrivalsWithSameLockedDoors,legacyFloorUnattainable},
  progress:{suspectedLoops:report?.progressSummary?.suspectedLoops??null,
   stalls:s.stallEpisodes??null,retries:s.retries??null}
 };
}

if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
 const [filename,sitesText,arrivalsText,fullText]=process.argv.slice(2);
 assert.ok(filename&&sitesText&&arrivalsText&&fullText,
  'Usage: ci-physical-cohort-provenance.mjs <json> <sites> <legacy arrivals> <legacy full squads>');
 const result=classifyPhysicalCohort(JSON.parse(fs.readFileSync(filename,'utf8')),{
  sites:Number(sitesText),legacyArrivals:Number(arrivalsText),
  legacyFullSquads:Number(fullText)
 });
 console.log('A7B_PHYSICAL_COHORT_PROVENANCE',JSON.stringify(result));
 if(!result.ok)throw Error('missing real physical lock/order evidence: '+result.errors.join('; '));
}
