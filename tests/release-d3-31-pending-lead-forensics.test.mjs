/** D3.31 P1: exact frozen troublesome operator cases. This is a
 * measurement, not a new route controller or a relaxation of safety gates.
 * Use production 60Hz motor and unchanged authored generated ENTRY orders.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
const cases=[
 {name:'townhouse-entry',index:1,seed:13946496,scale:'small',
  target:'rook',expectedPending:4},
 {name:'retail-entry',index:3,seed:14299875,scale:'standard',
  target:'rook',expectedPending:3},
 {name:'garage-entry',index:5,seed:14354241,scale:'standard',
  target:'vale',expectedPending:1}
];
const round=n=>Number(n?.toFixed?.(2)??n);
for(const c of cases)test('D3.31 P1 physical lead forensic '+c.name,()=>{
 const stdout=execFileSync(process.execPath,[
  '--experimental-strip-types','scripts/audit-r7-squad-execution.mjs',
  '1','2700',
  '--site-index='+c.index,
  '--audit-seed='+c.seed,'--audit-scale='+c.scale,
  '--progress','--route-transitions',
  '--trace-actor='+c.target,'--trace-mode=entry'
 ],{cwd:root,maxBuffer:18*1024*1024,timeout:120000,encoding:'utf8'});
 const report=JSON.parse(stdout),entry=report.rows[0].modes.find(x=>x.mode==='entry');
 assert.equal(report.rows.length,1);
 assert.equal(report.ticks,2700);
 assert.equal(report.summary.exceptions,0);
 assert.equal(report.summary.physicsStepViolations,0);
 assert.equal(report.summary.invalidPositions,0);
 assert.equal(report.summary.corruptedPlans,0);
 assert.ok(entry,'entry mode must exist');
 const operators=entry.operators.map(o=>({
  id:o.id,outcome:o.outcome,arrived:o.arrived,
  remaining:round(o.remaining),orders:o.remainingOrders,
  failed:o.failedOrders,blocker:o.lastBlocker,
  active:o.activeOrderDetails?.kind??o.activeOrder??null,
  position:o.position??o.p??null,
  nav:o.navCount??null,blocked:round(o.blockedTime)
 }));
 const pending=operators.filter(o=>o.outcome==='pending');
 const progress=entry.progressEvidence.filter(x=>x.actor===c.target)
  .map(x=>({at:x.seconds,kind:x.kind,classification:x.classification,
   net:x.net,travel:x.travel,remaining:x.remaining,
   blocked:x.blockedSeconds,retries:x.retries,
   position:x.position,active:x.activeOrder,firstNav:x.nextNav?.[0]??null}));
 const events=entry.routeTransitions?.events??[];
 const source=Object.fromEntries(Object.entries(entry.routeTransitions?.byActor??{})
  .filter(([k])=>k.startsWith(c.target+':')));
 console.log('D331_FROZEN_LEAD',JSON.stringify({
  case:c.name,seed:c.seed,accepted:entry.accepted,
  complete:entry.complete,arrivals:entry.arrivals,
  pending:pending.map(o=>o.id),operators,
  doorId:entry.doorId,doorEvidence:entry.doorEvidence?.filter(x=>x.operator===c.target).slice(-12),
  routeSources:source,routeRejects:entry.routeTransitions?.rejectsByActor,
  progress,events:events.slice(-35)
 }));
 // First checkpoint: reproduce the real prior pending count, do not
 // mistake generated WAIT/SYNC holds for physical arrival.
 assert.ok(pending.length>=c.expectedPending,
  'baseline changed; re-triage before selecting movement fix');
});
