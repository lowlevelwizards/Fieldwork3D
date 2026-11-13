/** C0 report only: same seeded corpus on exact pre-C main and candidate.
 * Times are host-relative and not admissible as iPhone FPS benchmarks.
 */
import {readFileSync,writeFileSync} from 'node:fs';
const [beforePath,afterPath,out]=process.argv.slice(2);
if(!beforePath||!afterPath)throw Error('Expected baseline and candidate JSON');
const before=JSON.parse(readFileSync(beforePath,'utf8'));
const after=JSON.parse(readFileSync(afterPath,'utf8'));
if(before.rows.length!==33||after.rows.length!==33)
 throw Error('Expected full 33-site corpus');
const key=r=>r.seed+':'+r.scale+':'+r.archetype;
const baseline=new Map(before.rows.map(r=>[key(r),r]));
const delta=[];
for(const item of after.rows){
 const old=baseline.get(key(item));
 if(!old)throw Error('A site disappeared from deterministic corpus: '+key(item));
 delta.push({seed:item.seed,scale:item.scale,archetype:item.archetype,
  qualityBefore:old.quality,qualityAfter:item.quality,
  qualityDelta:item.quality-old.quality,
  auditMsBefore:old.elapsedMs,auditMsAfter:item.elapsedMs,
  functionalPenaltyDelta:item.completenessPenalty-old.completenessPenalty,
  blockedRoutesDelta:item.blockedRoutes-old.blockedRoutes,
  coverPositionDelta:item.usableFiringCover-old.usableFiringCover});
}
const average=values=>Math.round(values.reduce((a,b)=>a+b,0)/values.length*10)/10;
const report={before:before.summary,after:after.summary,
 qualityDelta:average(delta.map(x=>x.qualityDelta)),
 hostRelativeAuditMedianRatio:Math.round(after.summary.medianMs/
   Math.max(1,before.summary.medianMs)*100)/100,
 improved:delta.filter(x=>x.qualityDelta>0).length,
 same:delta.filter(x=>x.qualityDelta===0).length,
 regressed:delta.filter(x=>x.qualityDelta<0).length,
 addedRouteBlocks:delta.filter(x=>x.blockedRoutesDelta>0).length,
 delta};
console.log('Release C0 before/after',JSON.stringify({
 before:report.before,after:report.after,qualityDelta:report.qualityDelta,
 auditMedianRatio:report.hostRelativeAuditMedianRatio,
 improved:report.improved,regressed:report.regressed,
 addedRouteBlocks:report.addedRouteBlocks}));
if(out)writeFileSync(out,JSON.stringify(report,null,2)+'\n');
if(after.summary.invalid>before.summary.invalid||
   report.qualityDelta< -2||report.addedRouteBlocks>0){
 console.error('Regression gate: physical quality, validity or blocked paths worsened');
 process.exitCode=1;
}
