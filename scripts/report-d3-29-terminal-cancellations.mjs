/** D3.29A forensic only: distinguish valid locked-door cancellations
 * from other terminal outcomes without claiming any phantom arrivals.
 * Usage: node scripts/report-d3-29-terminal-cancellations.mjs fresh22.json
 */
import {readFileSync} from 'node:fs';
import {analyzeD329CancellationAudit}
 from './lib/d3-29-cancellation-classifier.mjs';
const path=process.argv[2];
if(!path)throw Error('Supply frozen22 replay path');
const data=JSON.parse(readFileSync(path,'utf8'));
const r=analyzeD329CancellationAudit(data);
console.log('D329_COUNTS',JSON.stringify(r.summary));
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
if(r.summary.arrivals<161||r.summary.fullSquads<37||
 r.summary.suspectedLoops!==0||
 r.cases.some(c=>c.family==='not-terminally-cancelled'))
 throw Error('D3.29 replay regressed the verified D3.28 physical baseline');
