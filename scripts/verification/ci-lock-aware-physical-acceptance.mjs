/** A7b: evidence-backed replacement for raw goals proved impossible by
 * event-matched terminal DOOR LOCKED outcomes. This is an additional hard
 * release gate, never a conversion of cancelled operators into arrivals.
 * Frozen 22-site pending/loop goals are deliberately NOT covered.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {classifyPhysicalCohort} from './ci-physical-cohort-provenance.mjs';

export const A7B_LOCK_AWARE_POLICIES=Object.freeze({
 historical11:Object.freeze({
  sites:11,operators:88,accepted:22,completed:22,
  arrivals:76,fullSquads:17,locked:12,
  maxPending:0,maxUnplanned:0,maxLoops:0,maxStalls:8,maxRetries:6,
  maxSearches:2850,corpus:null,legacyArrivalFloors:[80,81]
 }),
 fresh22:Object.freeze({
  sites:22,operators:176,accepted:44,completed:44,
  arrivals:154,fullSquads:35,locked:22,
  maxPending:0,maxUnplanned:0,maxLoops:0,maxStalls:11,maxRetries:15,
  maxSearches:10800,corpus:'d3-18-eleventh-fresh22-20261115',
  legacyArrivalFloors:[158]
 })
});

export function verifyA7BLockAwareQuality(report,profile){
 const policy=A7B_LOCK_AWARE_POLICIES[profile];
 assert.ok(policy,'Unknown lock-aware profile: '+profile);
 const proof=classifyPhysicalCohort(report,{
  sites:policy.sites,legacyArrivals:Math.max(...policy.legacyArrivalFloors),
  legacyFullSquads:policy.fullSquads,requireNoPending:true
 });
 const s=report?.summary??{},p=report?.progressSummary??{},
  q=report?.routeQualitySummary??{},c=proof.counts;
 const errors=[...proof.errors];
 // Frozen site manifests and 2700-tick contexts are immutable.
 if(policy.corpus!==null&&report?.corpus!==policy.corpus)
  errors.push('wrong exact fresh site corpus: '+report?.corpus);
 if(c.operators!==policy.operators)
  errors.push('body count changed');
 if(s.acceptedFour!==policy.accepted||s.completedFour!==policy.completed)
  errors.push('accepted/completed authored squads changed');
 // Exact lock counts are intentional: a newly introduced locked
 // cancellation must never become a cheap substitute for a pending actor.
 if(c.locked!==policy.locked||c.verifiedLocked!==policy.locked)
  errors.push('locked-door cancellation census changed');
 if(c.arrivals<policy.arrivals||c.fullSquads<policy.fullSquads)
  errors.push('real arrivals or physically complete four-person squads regressed');
 if(c.pending>policy.maxPending||c.unplanned>policy.maxUnplanned||c.other)
  errors.push('new unresolved authored plan or pending operator');
 if(p.suspectedLoops!==0||p.sustainedStill)
  errors.push('unresolved physical loop or sustained stillness');
 if(!Number.isFinite(s.stallEpisodes)||s.stallEpisodes>policy.maxStalls||
    !Number.isFinite(s.retries)||s.retries>policy.maxRetries)
  errors.push('new stalls or retries');
 if(!Number.isFinite(q.searches)||q.searches>policy.maxSearches)
  errors.push('route-search budget exceeded or missing evidence');
 if(proof.legacy.maxArrivalsWithSameLockedDoors!==policy.arrivals)
  errors.push('operator census no longer proves lock-aware physical maximum');
 if(!policy.legacyArrivalFloors.every(n=>
    n>proof.legacy.maxArrivalsWithSameLockedDoors))
  errors.push('historical raw-floor impossibility no longer evidenced');
 return {ok:errors.length===0,errors,profile,policy,
  observed:{...c,loops:p.suspectedLoops,
   stalls:s.stallEpisodes,retries:s.retries,searches:q.searches},
  provenance:proof};
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
 const [profile,path]=process.argv.slice(2);
 assert.ok(profile&&path,'Usage: ci-lock-aware-physical-acceptance.mjs historical11|fresh22 report.json');
 const result=verifyA7BLockAwareQuality(JSON.parse(readFileSync(path,'utf8')),profile);
 console.log('A7B_LOCK_AWARE_PHYSICAL',JSON.stringify(result));
 if(!result.ok)throw Error('evidence-backed physical regression: '+result.errors.join('; '));
}
