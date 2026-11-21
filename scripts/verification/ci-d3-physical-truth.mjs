/** CI A3: current truthful physical gate for the frozen D3.15B4 corpus.
 *
 * Historical D3.14/D3.17 thresholds counted goals later proved to cross
 * physically locked doors. This gate never grants arrival credit for a
 * cancelled order. Every cancellation must have an event-matched locked-door
 * witness; unfinished/rejected attempts stay visible as separate outcomes.
 * It is deliberately read-only: no game import, goal changes or motor edits.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {verifyD330Mainline} from '../lib/d3-30-physical-gate.mjs';
import {analyzeD317LoopIncidents} from '../lib/d3-17a-loop-incidents.mjs';

export const FROZEN_D315B4_TRUTH=Object.freeze({
 corpus:'d3-15b4-tenth-blind22-20261115',
 sites:22,operators:176,acceptedSquads:42,drainedSquads:35,
 physicalArrivals:131,physicalSquads:27,
 maxLockedCancellations:22,maxPending:15,maxRejectedUnplanned:8,
 maxStalls:8,maxRetries:72,maxRecoveredLoopIncidents:1
});

function goodPhysicalSummary(report, errors, label){
 const s=report?.summary??{};
 for(const key of ['exceptions','invalidPositions','physicsStepViolations',
  'corruptedPlans','unboundedManeuverAttempts','arrivedDespiteCancellation'])
  if(s[key])errors.push(label+': physical integrity '+key+'='+s[key]);
 return s;
}
function witnessAtCancel(mode,operator){
 const failure=operator.lastFailedOrder;
 if(!failure)return null;
 return (mode.d329CancelDoorWitness??[]).findLast(w=>
  w.actor===operator.id&&w.failedOrder?.id===failure.id&&
  Math.abs((w.failedOrder?.at??-100)-(failure.at??-200))<.05)??null;
}
function provenLock(mode,operator,errors,identifier){
 const failure=operator.lastFailedOrder;
 if(operator.outcome!=='cancelled'||!operator.failedOrders||
    !/DOOR LOCKED/.test(failure?.reason??'')){
  errors.push(identifier+': missing terminal DOOR LOCKED outcome');
  return;
 }
 const witness=witnessAtCancel(mode,operator);
 if(!witness||!witness.actualSelectedDoor?.locked&&
    !(witness.lockedNearby?.length>0)){
  errors.push(identifier+': cancellation lacks actual locked-door witness');
  return;
 }
 if(witness.initialSelectedDoor?.locked&&
    !witness.initialSelectedDoor.open&&
    witness.actualSelectedDoor?.locked&&witness.actualSelectedDoor.open)
  errors.push(identifier+': locked leaf physically opened');
}
function census(report,errors){
 let total=0,arrivals=0,full=0,accepted=0,drained=0;
 let locked=0,pending=0,unplanned=0;
 const pendingActors=[];
 for(const row of report.rows??[]){
  if(row.modes?.length!==2)errors.push(row.seed+': expected authored + entry pair');
  for(const mode of row.modes??[]){
   if(mode.operators?.length!==4)errors.push(row.seed+': incomplete operator census');
   if(mode.accepted===4)accepted++;
   if(mode.complete)drained++;
   let actualArrived=0;
   for(const operator of mode.operators??[]){
    total++;
    const id=[row.seed,mode.mode,operator.id].join('/');
    if(operator.arrived){
     arrivals++;actualArrived++;
     if(operator.failedOrders||operator.outcome==='cancelled')
      errors.push(id+': cancelled order counted as physical arrival');
     continue;
    }
    if(operator.failedOrders||operator.outcome==='cancelled'){
     locked++;
     provenLock(mode,operator,errors,id);
    }else if(mode.accepted===0&&operator.outcome==='unreached'&&
      operator.remainingOrders===0){
     unplanned++;
    }else if(operator.remainingOrders>0){
     pending++;
     pendingActors.push({site:row.archetype,seed:row.seed,mode:mode.mode,
      operator:operator.id,remaining:operator.remaining,
      blocker:operator.lastBlocker??null,
      order:operator.activeOrderDetails?.kind??operator.activeOrder??null});
    }else errors.push(id+': unexplained drained-but-unreached authored goal');
   }
   if(mode.arrivals!==actualArrived)
    errors.push(row.seed+'/'+mode.mode+': mode arrivals mismatch');
   if(actualArrived===4&&mode.accepted===4)full++;
  }
 }
 return {total,arrivals,full,accepted,drained,locked,pending,unplanned,
  pendingActors};
}
export function verifyFrozenD315B4(report){
 const errors=[],expected=FROZEN_D315B4_TRUTH;
 const s=goodPhysicalSummary(report,errors,'frozen22');
 if(report?.ticks!==2700||report?.rows?.length!==expected.sites)
  errors.push('changed frozen 22-site / 2700-tick corpus');
 if(report?.corpus!==expected.corpus)
  errors.push('wrong frozen D3.15B4 manifest');
 const counts=census(report,errors);
 for(const [field,min] of [['total',expected.operators],
  ['arrivals',expected.physicalArrivals],
  ['full',expected.physicalSquads],
  ['accepted',expected.acceptedSquads],
  ['drained',expected.drainedSquads]])
  if(counts[field]<min)errors.push(field+' below physically measured baseline');
 for(const [field,max] of [['locked',expected.maxLockedCancellations],
  ['pending',expected.maxPending],
  ['unplanned',expected.maxRejectedUnplanned]])
  if(counts[field]>max)errors.push(field+' exceeded evidenced limit');
 if(counts.total!==expected.operators)
  errors.push('unexpected number of physical operators');
 if(s.physicalArrivals!==counts.arrivals||
    s.physicalCompletedFour!==counts.full||
    s.cancelledAndNotArrived!==counts.locked||
    s.physicallyPendingOperators!==counts.pending||
    s.unreachedDrainedOperators!==counts.unplanned)
  errors.push('summary disagrees with true operator census');
 if(s.stallEpisodes>expected.maxStalls||s.retries>expected.maxRetries)
  errors.push('new stalls or recovery retries');
 let loops=null;
 try {
  const info=analyzeD317LoopIncidents(report);
  loops=info.summary;
  if(loops.incidents>expected.maxRecoveredLoopIncidents||
     loops.physicallyUnreachedEpisodes>0||
     loops.orphanFlaggedWindows>0||
     report.progressSummary?.suspectedLoops!==loops.flaggedWindows)
   errors.push('new or unrecovered physical movement loop');
 }catch(err){errors.push('incomplete loop evidence: '+err.message);}
 return {ok:errors.length===0,errors,expected,
  observed:{...counts,loopIncidents:loops?.incidents??null,
   recoveredLoops:loops?.recoveredEpisodes??null}};
}

export function verifyCourtPhysicalTruth(report){
 const errors=[];
 const s=goodPhysicalSummary(report,errors,'COURT-1');
 if(report?.rows?.length!==1||report.rows[0]?.seed!==14462973||
    report.rows[0]?.archetype!=='utility'||report.ticks!==2700)
  errors.push('changed exact COURT-1 world');
 const mode=report?.rows?.[0]?.modes?.find(x=>x.mode==='authored');
 if(!mode||mode.operators?.length!==4)
  errors.push('missing four authored COURT-1 operators');
 const ash=mode?.operators?.find(x=>x.id==='ash');
 if(!ash?.arrived||ash.failedOrders||ash.remainingOrders)
  errors.push('Ash failed authentic authored GO or order outcome');
 if((mode?.routeTransitions?.byActor?.['ash:door-rehearsal-joined-waypoint']??0)<1)
  errors.push('physically swept local waypoint join absent');
 let blocked=0;
 for(const operator of mode?.operators??[]){
  if(operator.arrived)continue;
  blocked++;
  provenLock(mode,operator,errors,'COURT-1/'+operator.id);
 }
 if((mode?.operators??[]).filter(x=>x.arrived).length!==mode?.arrivals)
  errors.push('COURT-1 arrival census mismatch');
 if(report.progressSummary?.suspectedLoops)
  errors.push('COURT-1 has unrecovered movement loops');
 if(s.cancelledAndNotArrived!==blocked)
  errors.push('COURT-1 cancellation census mismatch');
 return {ok:errors.length===0,errors,
  observed:{arrivals:mode?.arrivals??0,verifiedLocks:blocked,
   ashJoined:mode?.routeTransitions?.byActor?.['ash:door-rehearsal-joined-waypoint']??0}};
}

export function verifyCurrentD3PhysicalRelease(historical,frozen,court){
 const main=verifyD330Mainline(historical);
 const wide=verifyFrozenD315B4(frozen);
 const focused=verifyCourtPhysicalTruth(court);
 return {ok:main.ok&&wide.ok&&focused.ok,
  mainline:main,frozen:wide,court:focused};
}

if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
 const [historical,frozen,court]=process.argv.slice(2);
 assert.ok(historical&&frozen&&court,'Expected 11-site, frozen22 and COURT-1 JSON paths');
 const result=verifyCurrentD3PhysicalRelease(...[historical,frozen,court]
  .map(path=>JSON.parse(fs.readFileSync(path,'utf8'))));
 console.log('Current D3 physical truth',JSON.stringify(result,null,2));
 if(!result.ok)throw Error('D3 physical gate: '+[
  ...result.mainline.errors,...result.frozen.errors,...result.court.errors].join('; '));
}
