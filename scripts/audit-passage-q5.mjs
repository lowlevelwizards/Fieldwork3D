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
 if(!row.success&&row.outcome!=='expected-blocked'&&
    row.outcome!=='expected-obstructed')
  console.log('Q5_FAILURE '+JSON.stringify(row));
}
const core=rows.filter(r=>r.program==='squad'&&
 Q5_HINGE_CASES.includes(r.door));
const baseline=summarizeQ5(core);
console.log('Q5_CORE_SUMMARY '+JSON.stringify(baseline));
const summary=summarizeQ5(rows);
console.log('Q5_SUMMARY '+JSON.stringify(summary));
if(strict){
 if(summary.failed||summary.expectationsMet!==summary.cases)
  process.exitCode=1;
 // All 55 traversable cases matter, including pre-opened doors. Q5's
 // original speed gate guarded only the 20 hinge/approach core cases.
 // Compare the extended physical tail against Q5's verified production
 // 15.883s fourth-cross and 18.483s full-finish baseline.
 if(extended&&((summary.lastCrossWorst??Infinity)>15.9||
    (summary.finishWorst??Infinity)>18.5)){
  console.error('Q6_EXTENDED_TAIL_REGRESSION '+JSON.stringify(summary));
  process.exitCode=1;
 }
 if(extended&&(summary.cases!==70||summary.pass!==55||
    summary.expectedBlocked!==10||summary.expectedObstructed!==5)){
  console.error('Q5_INCOMPLETE_COVERAGE '+JSON.stringify(summary));
  process.exitCode=1;
 }
 // Q5 pinned baseline before travel-aware allocation:
 // fourth-cross P90 15.53s / worst 17.73s, finish worst 20.35s.
 // These gates require measurable improvement without timing shortcuts.
 if(core.length===20&&
  ((baseline.lastCrossP90??Infinity)>14.5||
   (baseline.lastCrossWorst??Infinity)>16||
   (baseline.finishWorst??Infinity)>19.5)){
  console.error('Q5_SPEED_REGRESSION '+JSON.stringify(baseline));
  process.exitCode=1;
 }
}
