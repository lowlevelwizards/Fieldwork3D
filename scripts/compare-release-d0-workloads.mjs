/** D0: compare authoritative world outcomes, not noisy CI CPU rates. */
import {readFileSync,writeFileSync} from 'node:fs';
const [basePath,currentPath,reportPath]=process.argv.slice(2);
const base=JSON.parse(readFileSync(basePath,'utf8'));
const current=JSON.parse(readFileSync(currentPath,'utf8'));
if(base.summary.version!==1||current.summary.version!==1||
   base.workloads.length!==current.workloads.length||!base.workloads.length)
 throw Error('Incompatible or incomplete D0 workload corpus');
const differences=[];
for(let i=0;i<base.workloads.length;i++){
 const before=base.workloads[i],after=current.workloads[i];
 if(before.label!==after.label||before.fingerprint!==after.fingerprint)
  differences.push({label:before.label,after:after.label,
    before:before.fingerprint,now:after.fingerprint,
    tickDifference:after.ticks-before.ticks,
    beforeMission:before.truth.status,afterMission:after.truth.status});
}
const advisory=base.workloads.map((before,i)=>{
 const after=current.workloads[i];
 return {label:before.label,
  beforeP95Ms:before.timing.simulation.p95,
  afterP95Ms:after.timing.simulation.p95,
  beforeMeanMs:before.timing.simulation.mean,
  afterMeanMs:after.timing.simulation.mean,
  p95Ratio:before.timing.simulation.p95>0?
   Math.round(after.timing.simulation.p95/before.timing.simulation.p95*100)/100:null};
});
const result={passed:differences.length===0,
 differences,advisory,warning:'CPU/heap comparisons vary on shared CI hosts and are not FPS.'};
console.log('D0 EXACT GAMEPLAY PARITY',JSON.stringify({passed:result.passed,
 count:base.workloads.length,differences}));
console.log('D0 TIMING ADVISORY',JSON.stringify(advisory));
if(reportPath)writeFileSync(reportPath,JSON.stringify(result,null,2)+'\n');
if(differences.length)process.exitCode=1;
