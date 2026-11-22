/** D3.35 Garage narrow release: EXACT physical 45-second acceptance,
 * using original generated 4-person ENTRY, unchanged hidden-world
 * collision, authentic locked-door failures and original GO locations.
 *
 * The old lead already completed; Vale repeatedly crossed FRONT,
 * shoved two actual cover items, threw away the physically valid
 * next-door route, and walked ~1746u without arriving. After each
 * real shove preserve that already-certified transient route only
 * while its next four FULL-BODY motor units are swept clear.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
test('D3.35 Garage 14354241 ENTRY Vale must physically arrive after live cover shoves',()=>{
 const r=JSON.parse(execFileSync(process.execPath,[
  '--experimental-strip-types','scripts/audit-r7-squad-execution.mjs',
  '1','2700','--site-index=5','--audit-seed=14354241',
  '--audit-scale=standard','--progress','--route-transitions'
 ],{cwd:root,maxBuffer:16*1024*1024,timeout:120000,encoding:'utf8'}));
 const run=r.rows[0]?.modes.find(x=>x.mode==='entry');
 const vale=run?.operators.find(x=>x.id==='vale');
 console.log('D335_GARAGE_POST_SHOVE_TRUTH',JSON.stringify({
  realArrivals:run?.arrivals,pending:run?.operators.filter(x=>x.outcome==='pending')
   .map(x=>x.id),vale,transitionCounts:run?.routeTransitions?.byActor
 }));
 assert.equal(r.ticks,2700);
 for(const key of ['exceptions','invalidPositions','corruptedPlans',
   'physicsStepViolations','unboundedManeuverAttempts'])
  assert.equal(r.summary[key],0,'no live movement safety regression: '+key);
 assert.equal(run?.operators.length,4);
 assert.equal(run.arrivals,3,
  'original Garage scene gains EXACTLY one real body-arrival');
 assert.equal(vale?.outcome,'arrived');
 assert.equal(vale?.arrived,true);
 assert.equal(vale?.failedOrders,0);
 assert.ok(vale?.remaining<=5,
  'Vale must end at the original authored generated-entry GO');
 assert.ok(vale.progressDistance<900,
  'the former ~1746-unit cycle must be physically eliminated');
 assert.ok((run.routeTransitions?.byActor?.[
  'vale:initial-portal-recovery']??0)>=1,
  'must obtain the physically proven next-door prefix before real arrival');
});
