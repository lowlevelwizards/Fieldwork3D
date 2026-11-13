/** Q5 per-hinge, per-approach real motor matrix and machine-readable report.
 * Fails the workflow on ANY uncovered 4-person ingress timeout.
 */
import {DOOR_RANGE_APPROACHES} from '../src/breach-door-test-cases.ts';
import {Q5_HINGE_CASES,runDoorRangeQ5,summarizeQ5}
 from '../src/door-range-q5-benchmark.ts';
const modes=process.argv.includes('--quick')?['straight','left','right']:
 DOOR_RANGE_APPROACHES.map(x=>x.id);
const rows=[];
for(const door of Q5_HINGE_CASES)
 for(const approach of modes){
  const row=runDoorRangeQ5(door,approach);
  rows.push(row);
  console.log('Q5_CASE '+JSON.stringify({
   door,approach,outcome:row.outcome,crossed:row.crossed,
   completed:row.completed,lastCross:row.lastCross,
   finish:row.finishTime,spacing:row.minSeparation
  }));
  if(!row.success)console.log('Q5_FAILURE '+JSON.stringify(row));
 }
const summary=summarizeQ5(rows);
console.log('Q5_SUMMARY '+JSON.stringify(summary));
if(summary.failed)process.exitCode=1;
