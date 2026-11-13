/** Reproducible real motor Q5 matrix:
 * node --experimental-strip-types scripts/audit-passage-q5.mjs [core|full] [squad|independent] [ticks]
 * Exit !=0 for any unblocked 4-body failure or blocked-door penetration.
 */
import {DOOR_RANGE_CASES} from '../src/breach-door-test-cases.ts';
import {DOOR_RANGE_FORMATIONS} from '../src/breach-door-range-formations.ts';
import {runDoorRangeTrial,summarizeDoorRangeTrials}
 from '../src/breach-door-range-benchmark.ts';
const mode=process.argv[2]??'core',protocol=process.argv[3]??'squad';
const ticks=Math.max(60,Math.min(3600,Number(process.argv[4]??1800)||1800));
const cases=mode==='core'?DOOR_RANGE_CASES.slice(0,4):DOOR_RANGE_CASES;
const formations=mode==='baseline'?DOOR_RANGE_FORMATIONS.slice(0,1):
 DOOR_RANGE_FORMATIONS;
const faces=['north','south'];
const trials=[];
for(const door of cases)for(const f of formations)for(const face of faces){
 const result=runDoorRangeTrial(door.id,f.id,face,protocol,ticks);
 trials.push(result);
 console.log('Q5_TRIAL '+JSON.stringify({door:door.id,formation:f.id,face,
  protocol,ok:result.ok,reason:result.reason,
  crossed:result.crossed,finished:result.finished,
  fourth:result.fourthCrossSeconds,all:result.allOrdersSeconds,
  minGap:result.minActorGap}));
}
const summary=summarizeDoorRangeTrials(trials);
console.log('Q5_SUMMARY '+JSON.stringify({mode,protocol,ticks,...summary}));
if(summary.failed)process.exitCode=1;
