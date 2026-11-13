/** Q5 instrumentation: reproduce 2 traced stalls without full matrix. */
import {runDoorRangeTrial} from '../src/breach-door-range-benchmark.ts';
const cases=[
 ['inward-left','diagonal-left','south'],
 ['outward-left','diagonal-left','north']
];
for(const [door,formation,face] of cases){
 const result=runDoorRangeTrial(door,formation,face,'squad',1800);
 console.log('Q5_STALL '+JSON.stringify(result));
}
