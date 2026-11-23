/** D3.36 P1: exact 45s / 60Hz read-only remaining body non-arrivals.
 * Release baseline on merged D3.35: 143/176 arrived, 30/44 squads,
 * 3 genuinely pending. Never credit a lock, WAIT, route change or
 * stationary near-goal as a physical arrival. No live motor modification.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const cases=[
 {name:'clinic-small-entry',index:10,seed:14191143,
  scale:'small',mode:'entry',actors:['ash'],minArrivals:2,
  extra:'--entry-settle-witness'},
 {name:'garage-standard-authored',index:5,seed:14354241,
  scale:'standard',mode:'authored',actors:['rook','moss'],
  minArrivals:2,extra:'--d327-garage-probe'}
];
const near=p=>p&&({x:+p.x.toFixed(2),y:+p.y.toFixed(2)});
const slimEvent=e=>({
 t:e.seconds,source:e.source,at:near(e.position),
 first:near(e.next?.[0]),last:near(e.next?.at(-1)),
 prior:near(e.prior?.[0]),door:e.doorId,phase:e.doorPhase,
 blocked:e.blockedTime,reason:e.reason??null
});
for(const c of cases)test('D3.36 exact frozen remaining bodies '+c.name,()=>{
 const raw=execFileSync(process.execPath,[
  '--experimental-strip-types','scripts/audit-r7-squad-execution.mjs',
  '1','2700','--site-index='+c.index,'--audit-seed='+c.seed,
  '--audit-scale='+c.scale,'--progress','--route-transitions',
  '--leaf-rejoin-diagnostic','--d336-three-body-proof',c.extra
 ],{cwd:root,encoding:'utf8',timeout:120000,maxBuffer:24*1024*1024});
 const data=JSON.parse(raw),row=data.rows[0],run=row?.modes.find(m=>m.mode===c.mode);
 assert.equal(data.ticks,2700);
 assert.equal(row?.seed,c.seed);
 assert.equal(row?.scale,c.scale);
 assert.ok(run,'same originally requested physical execution mode');
 assert.equal(run.operators.length,4,'same four real bodies');
 assert.ok(run.arrivals>=c.minArrivals,'never lose prior real arrivals');
 for(const key of ['exceptions','invalidPositions','corruptedPlans',
   'physicsStepViolations','unboundedManeuverAttempts'])
  assert.equal(data.summary[key],0,'preserve real-world motor integrity: '+key);
 assert.ok(Array.isArray(run.d336BodyProof),
  'exact physical-body feasibility must be reported');
 assert.equal(run.d336BodyProof.length,c.actors.length,
  'all genuinely pending operator centers have independent proof');
  const witnesses=c.actors.map(name=>{
  const a=run.operators.find(x=>x.id===name);
  assert.ok(a,'frozen original operator still exists: '+name);
  assert.ok(a.outcome==='pending'||a.outcome==='arrived',
    'physical obstruction must never become fake success/cancellation');
  assert.equal(a.failedOrders,0,'authored or linked GO unchanged');
  const windows=(run.progressEvidence??[]).filter(w=>w.actor===name);
  const sources=Object.fromEntries(Object.entries(
    run.routeTransitions?.byActor??{}).filter(([k])=>k.startsWith(name+':')));
  const transitions=(run.routeTransitions?.events??[])
    .filter(e=>e.actorId===name).slice(-16).map(slimEvent);
  return {
   actor:name,outcome:a.outcome,arrived:a.arrived,
   originalGoal:a.goal,position:a.position,remaining:a.remaining,
   actualTravel:a.progressDistance,blocked:a.blockedSeconds,
   blocker:a.lastBlocker,pause:a.motorPause,
   order:a.activeOrderDetails,retries:a.retries,
   nextNav:a.nextNav,doorEpisode:a.doorEpisode,
   windows:windows.map(w=>({
    t:w.seconds,pos:near(w.position),remaining:w.remaining,
    travel:w.travel,net:w.net,type:w.classification,
    blocker:w.blocker,door:w.doorEpisode,next:near(w.nextNav)
   })),
   routeSources:sources,lastTransitions:transitions,
   physicalBlocks:(run.physicalBlockEvidence??[])
    .filter(e=>e.operator===name).slice(-6),
   doorEvents:(run.doorEvidence??[])
    .filter(e=>e.operator===name).slice(-6)
  };
 });
 console.log('D336_TRUE_BODY_WITNESS',JSON.stringify({
  case:c.name,seed:c.seed,mode:c.mode,
  arrivals:run.arrivals,pending:run.operators.filter(x=>x.outcome==='pending').map(x=>x.id),
  witnesses,leafRecovery:run.leafRecoveryEvidence??[],
  bodyProof:run.d336BodyProof??[],
  ...(c.name.startsWith('garage')?{
    garageMotorEvidence:run.d327GarageEvidence?
     {position:run.d327GarageEvidence.position,
      actualOrder:run.d327GarageEvidence.actualOrder,
      originalGoalDistance:run.d327GarageEvidence.originalGoalDistance,
      physicalCommittedArrival:run.d327GarageEvidence.physicalCommittedArrival,
      samples:run.d327GarageEvidence.samples?.slice(-10),
      actualGoalRoutes:run.d327GarageEvidence.actualGoalRoutes}:null
  }: {entryLanding:run.entryLandingEvidence??null})
 }));
});
