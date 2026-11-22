/** D3.35 P1 — ONLY real 45-second movement forensic witnesses.
 * Freeze the source-level route transitions behind Garage Vale and
 * Warehouse Rook's path cycles. No motor, plan, physics or gate changed.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const cases=[
 {site:'garage',index:5,seed:14354241,scale:'standard',mode:'entry',
  actor:'vale',maxGoalDistance:110,minTravel:1700},
 {site:'warehouse',index:6,seed:14381424,scale:'standard',mode:'authored',
  actor:'rook',maxGoalDistance:500,minTravel:2100}
];
const d=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const fix=p=>p&&({x:Math.round(p.x*100)/100,
 y:Math.round(p.y*100)/100});
for(const c of cases)test('D3.35 frozen path-cycle forensic '+c.site+
  ' '+c.mode+' '+c.actor,()=>{
 const r=JSON.parse(execFileSync(process.execPath,[
  '--experimental-strip-types','scripts/audit-r7-squad-execution.mjs',
  '1','2700','--site-index='+c.index,'--audit-seed='+c.seed,
  '--audit-scale='+c.scale,'--progress','--route-transitions',
  '--trace-actor='+c.actor,'--trace-mode='+c.mode
 ],{cwd:root,encoding:'utf8',timeout:120000,maxBuffer:24*1024*1024}));
 const row=r.rows[0],run=row.modes.find(x=>x.mode===c.mode);
 const a=run?.operators.find(o=>o.id===c.actor);
 const events=(run?.routeTransitions?.events??[]).filter(e=>e.actorId===c.actor);
 const transitions=events.map(e=>({
  t:e.seconds,src:e.source,at:fix(e.position),door:e.doorId,
  phase:e.doorPhase,maneuver:e.doorManeuver,fraction:e.doorFraction,
  first:fix(e.next[0]),last:fix(e.next.at(-1)),
  old:fix(e.prior[0]),blocked:e.blockedTime,
  goal:e.goalKey,reason:e.reason??null
 }));
 const windows=run.progressEvidence.filter(w=>w.actor===c.actor).map(w=>({
  t:w.seconds,pos:fix(w.position),next:fix(w.nextNav),
  remaining:w.remaining,travel:w.travel,net:w.net,
  type:w.classification,door:w.doorEpisode
 }));
 const suspect=windows.slice(1).filter(w=>w.travel>140&&w.net<70).length;
 console.log('D335_PHYSICAL_ROUTE_CYCLE',JSON.stringify({
  site:c.site,mode:c.mode,seed:c.seed,actor:c.actor,
  outcome:a.outcome,goal:a.goal,end:a.position,
  totalTravel:a.progressDistance,remaining:a.remaining,
  actualArrivals:run.arrivals,fullCase:run.successful,
  door:a.doorEpisode,sourceCounts:run.routeTransitions.byActor,
  suspectWindows:suspect,windowTrace:windows,
  routeTransitions:transitions.slice(0,95)
 }));
 assert.equal(r.summary.physicsStepViolations,0);
 assert.equal(r.summary.invalidPositions,0);
 assert.equal(r.summary.corruptedPlans,0);
 assert.equal(a.outcome,'pending','exact source-loop still pending in P1');
 assert.ok(a.progressDistance>=c.minTravel,'real feet travel remains measured');
 assert.ok(a.remaining<=c.maxGoalDistance);
 assert.ok(suspect>=3,'high travelled distance with recurrent poor net GO');
});
