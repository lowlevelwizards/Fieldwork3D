/** A8: one truthful, immutable 45s/60Hz physical acceptance oracle.
 * HISTORICAL and FRESH never credit a terminal locked cancellation as
 * an arrival. FROZEN retains its distinct real recovered-loop incident
 * and unplanned-order outcomes, with their original event-matched
 * DOOR LOCKED evidence. No game/motor import and no altered orders.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {verifyA7BLockAwareQuality} from './ci-lock-aware-physical-acceptance.mjs';
import {verifyFrozenD315B4} from './ci-d3-physical-truth.mjs';

export const A8_CURRENT_FROZEN_TRUTH=Object.freeze({
 sites:22,total:176,accepted:42,drained:41,
 minArrivals:146,minSquads:31,locked:22,
 pending:0,unplanned:8,maxRecoveredLoops:1,
 maxStalls:8,maxRetries:72,maxSearches:9000
});
export function verifyA8PhysicalCohort(report,profile){
 if(profile==='historical11'||profile==='fresh22')
  return verifyA7BLockAwareQuality(report,profile);
 assert.equal(profile,'frozen22','Unknown physical cohort profile');
 const base=verifyFrozenD315B4(report);
 const c=base.observed,s=report?.summary??{},
  q=report?.routeQualitySummary??{},
  e=A8_CURRENT_FROZEN_TRUTH;
 const errors=[...base.errors];
 for(const [key,actual,want] of [
  ['sites',report?.rows?.length,e.sites],
  ['operators',c.total,e.total],
  ['accepted squads',c.accepted,e.accepted],
  ['locked cancellations',c.locked,e.locked],
  ['pending operators',c.pending,e.pending],
  ['unplanned/rejected operators',c.unplanned,e.unplanned]])
  if(actual!==want)errors.push(key+': '+actual+' != '+want);
 if(c.arrivals<e.minArrivals||c.full<e.minSquads||
    c.drained<e.drained)
  errors.push('real arrivals, full squads or drained squads regressed');
 if(c.recoveredLoops===null||c.recoveredLoops>e.maxRecoveredLoops||
    c.recoveredLoops!==c.loopIncidents)
  errors.push('a flagged frozen movement loop is not physically recovered');
 if(!Number.isFinite(s.stallEpisodes)||s.stallEpisodes>e.maxStalls||
    !Number.isFinite(s.retries)||s.retries>e.maxRetries)
  errors.push('frozen physical stalls or retries regressed');
 if(!Number.isFinite(q.searches)||q.searches>e.maxSearches)
  errors.push('missing route-search evidence or excess frozen query work');
 return {ok:errors.length===0,profile,errors,
  expected:e,observed:{...c,
   stalls:s.stallEpisodes,retries:s.retries,searches:q.searches},
  provenance:base};
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
 const [profile,path]=process.argv.slice(2);
 assert.ok(profile&&path,
  'Usage: ci-a8-physical-acceptance.mjs historical11|fresh22|frozen22 report.json');
 const result=verifyA8PhysicalCohort(
  JSON.parse(readFileSync(path,'utf8')),profile);
 console.log('A8_TRUE_PHYSICAL_ACCEPTANCE',JSON.stringify(result));
 if(!result.ok)throw Error(
  'A8 genuine physical regression: '+result.errors.join('; '));
}
