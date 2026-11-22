/** A8c P1: read-only, exact-current-MAIN D3.15 generated ENTRY
 * 3-fixture 2700-tick/60Hz physical witness.
 *
 * Deliberately DOES NOT claim 4/4 unless the actual motor proves it:
 * still-pending bodies, authored WAIT, and genuine door cancellations
 * remain separate physical outcomes. No actor, goal or geometry mutation.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const fixtures=[
 {site:'restaurant',index:7,seed:9473230,scale:'small'},
 {site:'townhouse',index:1,seed:9568385,scale:'standard'},
 {site:'motel',index:8,seed:9492261,scale:'small'}
];
test('A8c P1: all three D3.15 45s motor fixtures report COMPLETE original real-body truth',()=>{
 const observed=[];
 for(const f of fixtures){
  const r=JSON.parse(execFileSync(process.execPath,[
   '--experimental-strip-types','scripts/audit-r7-squad-execution.mjs',
   '11','2700','--site-index='+f.index,'--audit-seed='+f.seed,
   '--audit-scale='+f.scale,'--progress','--route-transitions'
  ],{cwd:root,encoding:'utf8',timeout:180000,
   maxBuffer:35*1024*1024}));
  assert.equal(r.ticks,2700);
  assert.equal(r.rows.length,1);
  assert.equal(r.rows[0].seed,f.seed);
  const m=r.rows[0].modes.find(x=>x.mode==='entry');
  assert.equal(m.operators.length,4);
  for(const key of ['exceptions','invalidPositions','corruptedPlans',
   'physicsStepViolations','unboundedManeuverAttempts',
   'arrivedDespiteCancellation'])
   assert.equal(r.summary[key]??0,0,f.site+' integrity '+key);
  assert.equal(m.arrivals,m.operators.filter(o=>o.arrived).length,
   f.site+' actual arrived body census');
  for(const o of m.operators)if(o.arrived){
   assert.equal(o.outcome,'arrived');
   assert.equal(o.failedOrders,0);
   assert.equal(o.remainingOrders,0);
   assert.ok(o.remaining<=5,
    f.site+'/'+o.id+' cannot be credited outside original GO');
  }
  observed.push({
   site:f.site,seed:f.seed,scale:f.scale,
   arrivals:m.arrivals,accepted:m.accepted,
   crossed:m.crossed,worldSummary:r.summary,
   actors:m.operators.map(o=>({
    id:o.id,outcome:o.outcome,arrived:o.arrived,
    position:o.position,goal:o.goal,remaining:o.remaining,
    failedOrders:o.failedOrders,remainingOrders:o.remainingOrders,
    activeOrder:o.activeOrder,activeDetails:o.activeOrderDetails,
    blocker:o.lastBlocker,blockedSeconds:o.blockedSeconds,
    still:o.longestStillSeconds,retries:o.retries,door:o.doorEpisode,
    progress:o.progressDistance,wait:o.waitSeconds
   })),sources:m.routeTransitions?.byActor??{}
  });
 }
 console.log('A8C_D315_EXACT_MAIN_THREE',JSON.stringify(observed));
 // This first P1 is ONLY attribution. A 4/4 goal will be added as an
 // independent gate in P2 once actual current world evidence is known.
});
