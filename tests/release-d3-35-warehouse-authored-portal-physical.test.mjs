/** D3.35 Warehouse authored MOVE: exact 45-second 60Hz physical gate.
 * This is NOT generated ENTRY: Rook's original player GO remains fixed.
 * Before the cold forward handoff, the real actor repeatedly rehearsed
 * already-open FRONT and acquired a backwards intel path. No synthetic
 * arrival, disabled collision or door-lock reinterpretation is allowed.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
test('D3.35 Warehouse 14381424 authored Rook reaches ORIGINAL GO physically',()=>{
 const r=JSON.parse(execFileSync(process.execPath,[
  '--experimental-strip-types','scripts/audit-r7-squad-execution.mjs',
  '1','2700','--site-index=6','--audit-seed=14381424',
  '--audit-scale=standard','--progress','--route-transitions',
  '--trace-actor=rook','--trace-mode=authored'
 ],{cwd:root,maxBuffer:16*1024*1024,timeout:120000,encoding:'utf8'}));
 const run=r.rows[0]?.modes.find(x=>x.mode==='authored');
 const rook=run?.operators.find(x=>x.id==='rook');
 const counted=run?.routeTransitions?.byActor??{};
 console.log('D335_WAREHOUSE_AUTHORED_TRUE_BODY',JSON.stringify({
  originalGoal:rook?.goal,finalPosition:rook?.position,
  remaining:rook?.remaining,outcome:rook?.outcome,
  actualTravel:rook?.progressDistance,failedOrders:rook?.failedOrders,
  realSceneArrivals:run?.arrivals,ownership:counted,
  lastRoutes:run?.routeTransitions?.events?.filter(x=>x.actorId==='rook')
    .slice(-12).map(x=>({at:x.position,source:x.source,door:x.doorId}))
 }));
 assert.equal(r.ticks,2700);
 for(const key of ['exceptions','invalidPositions','corruptedPlans',
   'physicsStepViolations','unboundedManeuverAttempts'])
  assert.equal(r.summary[key],0,'physical safety invariant '+key);
 assert.equal(run?.operators.length,4,'original full authored squad');
 assert.equal(rook?.outcome,'arrived','NO pending/cancelled masked as arrived');
 assert.equal(rook?.arrived,true,'real final-goal arrival required');
 assert.equal(rook?.failedOrders,0,'the original MOVE was never cancelled');
 assert.ok(rook?.remaining<=5,'body reaches the original authored GO');
 assert.ok(rook?.progressDistance<1750,
   'the old >2100-unit repeated FRONT rehearsal must stop');
 assert.ok((counted['rook:initial-portal-recovery']??0)>=1,
   'witnessed opened FRONT crossing leads to a real forward motor route');
});
