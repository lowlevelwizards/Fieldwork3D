/** D3.37 P1: one read-only 45s / 60Hz original Clinic SMALL
 * ENTRY seed 14191143. Classify the real world-space first rejected
 * full-body edge; never declare route discovery as a physical arrival.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));

test('D3.37 Clinic Ash: exact immutable first failed portal edge and alternatives',()=>{
 const r=JSON.parse(execFileSync(process.execPath,[
  '--experimental-strip-types','scripts/audit-r7-squad-execution.mjs',
  '1','2700','--site-index=10','--audit-seed=14191143',
  '--audit-scale=small','--progress','--route-transitions',
  '--trace-actor=ash','--trace-mode=entry',
  '--d337-clinic-edge-proof'
 ],{cwd:root,encoding:'utf8',timeout:120000,maxBuffer:24*1024*1024}));
 const run=r.rows[0]?.modes.find(m=>m.mode==='entry'),
  ash=run?.operators.find(a=>a.id==='ash'),e=run?.d337ClinicProof;
 assert.equal(r.ticks,2700);
 assert.ok(run&&e,'read-only Clinic original frozen evidence');
 assert.equal(run.operators.length,4);
 for(const key of ['exceptions','invalidPositions','corruptedPlans',
  'physicsStepViolations','unboundedManeuverAttempts'])
  assert.equal(r.summary[key],0,'real physical invariant: '+key);
 assert.equal(run.arrivals,2,'original Clinic already arrived bodies unchanged');
 assert.equal(ash.outcome,'pending','no fabricated arrival on diagnostic');
 assert.equal(ash.failedOrders,0);
 assert.equal(e.actor,'ash');
 assert.equal(e.lastBlocker,'route');
 assert.ok(e.route.length>=2,'original first-door prefix exists');
 assert.equal(e.certifiedCount,0,
  'the current five-node prefix is not lawfully certified');
 assert.equal(e.edges[0].fullBodySweep,true,
  'first legal footstep is not proof of the entire route');
 assert.ok(e.edges.some(x=>!x.fullBodySweep),
  'at least one real later geometric obstruction exists');
 const firstFailed=e.edges.find(x=>!x.fullBodySweep);
 console.log('D337_CLINIC_ASH_EXACT_EDGE_PROOF',JSON.stringify({
  actor:e.actor,pos:e.start,goal:e.goal,remaining:ash.remaining,
  blocker:e.lastBlocker,blocked:e.blocked,episode:e.episode,
  route:e.route,certifiedCount:e.certifiedCount,
  firstFailedEdge:firstFailed,
  edges:e.edges.map(x=>({index:x.index,from:x.from,to:x.to,
   length:x.length,fullBodySweep:x.fullBodySweep,
   withoutAllDoors:x.withoutAllDoors,
   standableEndpoint:x.standableEndpoint,
   motorFirstStepClear:x.motorFirstStepClear,
   culpritDoors:x.culpritDoors,wallNear:x.wallNear,
   coverNear:x.coverNear})),
  alternatives:e.alternatives,doors:e.doors,
  routeSources:Object.fromEntries(Object.entries(
   run.routeTransitions?.byActor??{}).filter(([k])=>k.startsWith('ash:')))
 }));
});
