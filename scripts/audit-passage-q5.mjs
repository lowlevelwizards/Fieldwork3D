/** Q5 per-hinge, per-approach real motor matrix and machine-readable report.
 * Fails the workflow on ANY uncovered 4-person ingress timeout.
 */
import {DOOR_RANGE_APPROACHES} from '../src/breach-door-test-cases.ts';
import {Q5_HINGE_CASES,runDoorRangeQ5,summarizeQ5}
 from '../src/door-range-q5-benchmark.ts';
const extended=process.argv.includes('--extended');
const fixtures=process.argv.includes('--fixtures');
const strict=process.argv.includes('--strict')||!extended&&!fixtures;
const modes=process.argv.includes('--quick')?['straight','left','right']:
 DOOR_RANGE_APPROACHES.map(x=>x.id);
const rows=[];
const cases=[];
if(!fixtures)for(const door of Q5_HINGE_CASES)
 for(const approach of modes)cases.push({door,approach,program:'squad'});
if(fixtures)for(const approach of modes)
 cases.push({door:'swing-furniture',approach,program:'squad'});
if(extended){
 for(const door of Q5_HINGE_CASES)
  for(const approach of modes)cases.push({door,approach,program:'independent'});
 for(const door of ['ajar-outward','wide-open',
   'swing-furniture','near-frame','locked','wedged'])
  for(const approach of modes)cases.push({door,approach,program:'squad'});
}
for(const {door,approach,program} of cases){
 const row=runDoorRangeQ5(door,approach,program);
 rows.push(row);
 console.log('Q5_CASE '+JSON.stringify({
  door,approach,program,outcome:row.outcome,crossed:row.crossed,
  completed:row.completed,first:row.firstCross,
  lastCross:row.lastCross,crossingSpan:row.crossingSpan,
  finish:row.finishTime,spacing:row.minSeparation,
  settledSpacing:row.settledMinSeparation,closeFrames:row.closeFrames,
  doorState:row.doorState
 }));
 if(!row.success&&row.outcome!=='expected-blocked')
  console.log('Q5_FAILURE '+JSON.stringify(row));
}
const summary=summarizeQ5(rows);
console.log('Q5_SUMMARY '+JSON.stringify(summary));
if(strict&&summary.failed)process.exitCode=1;
