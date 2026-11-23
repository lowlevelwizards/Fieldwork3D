/** D3.16B: source-owned non-regression gate over true 60 Hz motor outcomes.
 *
 * The frozen November 17 historical quality target (80 arrivals / 7
 * cancellations / 18 successful fours) is still a documented recovery goal.
 * It is NOT a valid assertion of today's current main. A UI-only PR must
 * match the same-head main physical outcomes, not an older authored waypoint
 * policy. This tool does not modify gameplay, thresholds or replay evidence.
 */
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

export const D316B_HISTORICAL_TARGET=Object.freeze({
 physicalArrivals:80,terminallyCancelledOrders:7,successfulFour:18
});
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const round=(p)=>p&&({x:p.x,y:p.y});
const witness=(operator)=>({
 id:operator.id,arrived:operator.arrived,failedOrders:operator.failedOrders,
 reason:operator.lastFailedOrder?.reason??null,
 remainingOrders:operator.remainingOrders,
 activeOrder:operator.activeOrder,
 goal:round(operator.goal),position:round(operator.position),
 orderIssue:operator.orderIssue??null
});
export function d316bPhysicalWitness(report){
 if(!report||!Array.isArray(report.rows)||!report.summary)
  throw new Error('D3.16B missing real 60 Hz report');
 const rows=report.rows.map(row=>({
  seed:row.seed,scale:row.scale,archetype:row.archetype,
  modes:(row.modes??[]).map(mode=>({
   mode:mode.mode,successful:mode.successful,accepted:mode.accepted,
   cancelledOrders:mode.cancelledOrders,
   arrivals:mode.arrivals,
   orderCancelledEvents:mode.orderCancelledEvents,
   operators:(mode.operators??[]).map(witness)
  }))
 }));
 return {summary:report.summary,rows};
}
export function compareD316BPhysicalReports(base,candidate){
 const b=d316bPhysicalWitness(base),c=d316bPhysicalWitness(candidate);
 const problems=[];
 if(!equal(b.summary,c.summary))
  problems.push('R6.3 changed same-main 88-actor physical summary');
 if(!equal(b.rows,c.rows))
  problems.push('R6.3 changed same-main per-operator GO/cancellation/position outcomes');
 for(const [name,w] of [['main',b],['candidate',c]]){
  const s=w.summary;
  if(s.sites!==11||s.attempted!==22||s.triageCounts?.completed!==88)
   problems.push(name+': expected full 11-site, 88-operator real simulation');
  if(s.exceptions||s.physicsStepViolations||s.invalidPositions||
    s.corruptedPlans||s.arrivedDespiteCancellation||
    s.unreachedDrainedOperators||s.cancelledAndNotArrived!==s.cancelledOperators||
    s.cancelledOperators!==s.terminallyCancelledOrders)
   problems.push(name+': false arrival, corrupt plan, or unjustified cancellation');
  const cancelled=w.rows.flatMap(row=>row.modes.flatMap(
   mode=>mode.operators.filter(a=>a.failedOrders>0)));
  if(cancelled.length!==s.cancelledOperators||
     cancelled.some(a=>a.arrived||a.remainingOrders||a.activeOrder||
       a.reason!=='PATH BLOCKED · DOOR LOCKED'))
   problems.push(name+': cancelled orders do not match real locked-door evidence');
 }
 return {pass:problems.length===0,problems,
  candidate:c.summary,baseline:b.summary,
  historicalQualityTarget:D316B_HISTORICAL_TARGET,
  historicalGap:{
   arrivals:c.summary.physicalArrivals-D316B_HISTORICAL_TARGET.physicalArrivals,
   cancellations:c.summary.terminallyCancelledOrders-
     D316B_HISTORICAL_TARGET.terminallyCancelledOrders,
   successfulFours:c.summary.successfulFour-
     D316B_HISTORICAL_TARGET.successfulFour
  }
 };
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [baseFile,candidateFile]=process.argv.slice(2);
 if(!baseFile||!candidateFile)throw new Error(
  'Usage: node d3-16b-physical-parity.mjs main.json pr.json');
 const result=compareD316BPhysicalReports(
  JSON.parse(readFileSync(baseFile,'utf8')),
  JSON.parse(readFileSync(candidateFile,'utf8')));
 process.stdout.write(JSON.stringify(result,null,2)+'\n');
 if(!result.pass)process.exitCode=1;
}
