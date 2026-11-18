/** D3.29A forensic only: distinguish valid locked-door cancellations
 * from other terminal outcomes without claiming any phantom arrivals.
 * Usage: node scripts/report-d3-29-terminal-cancellations.mjs fresh22.json
 */
import {readFileSync} from 'node:fs';
import {analyzeD329CancellationAudit,validateD329PhysicalRelease}
 from './lib/d3-29-cancellation-classifier.mjs';
const path=process.argv[2];
if(!path)throw Error('Supply frozen22 replay path');
const data=JSON.parse(readFileSync(path,'utf8'));
const r=analyzeD329CancellationAudit(data);
console.log('D329_COUNTS',JSON.stringify(r.summary));
console.log('D329_NEW_LOCK_ROUTE_FEASIBILITY',JSON.stringify(
 r.cases.filter(c=>c.legalWorldRouteAtCancellation)
 .map(c=>({seed:c.seed,site:c.archetype,actor:c.id,
  blockedDoor:c.selectedMotorDoor?.id,
  route:c.legalWorldRouteAtCancellation,
  coldFine:c.coldFineMotorRouteAtCancellation}))));
const invalidLocks=r.cases.filter(c=>c.lockedLeafMovedAfterClosedStart);
console.log('D329_LOCK_INTEGRITY',JSON.stringify({
 count:invalidLocks.length,
 leaves:invalidLocks.map(c=>({site:c.archetype,actor:c.id,
  door:c.selectedMotorDoor?.id,initial:c.initialSelectedDoor,
  atFailure:c.selectedMotorDoor}))
}));
if(invalidLocks.length)throw Error('D3.29 locked door opened without unlock');

for(const c of r.cases)
 console.log('D329_CANCELLED',JSON.stringify(c));
const verdict=validateD329PhysicalRelease(r);
console.log('D329_PHYSICAL_ACCEPTANCE',JSON.stringify(verdict));
if(!verdict.ok)throw Error('D3.29F physical acceptance failed: '+
 verdict.errors.join('; '));
