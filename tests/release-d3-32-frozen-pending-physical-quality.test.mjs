/** D3.32 P2: retain exact remaining D3.31 frozen physical non-arrival
 * witnesses. No motor, door, collision, queue, authored orders or fixtures
 * are changed. Pending operators are observations to improve, not successes.
 * A NEW pending actor is a real regression.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
const cases=[
 {name:'clinic-small entry leaf / route',index:10,seed:14191143,
  scale:'small',mode:'entry',pending:['ash'],arrivals:2},
 {name:'retail-standard ENTRY lead and SYNC dependents',index:3,
  seed:14299875,scale:'standard',mode:'entry',
  pending:['rook','moss','vale'],arrivals:0},
 {name:'garage-standard authored wall/route block',index:5,
  seed:14354241,scale:'standard',mode:'authored',
  pending:['rook','moss'],arrivals:2},
 {name:'garage-standard entry productive-looking route loop',index:5,
  seed:14354241,scale:'standard',mode:'entry',
  pending:['vale'],arrivals:2},
 {name:'warehouse-standard authored perpetual route loop',index:6,
  seed:14381424,scale:'standard',mode:'authored',
  pending:['rook'],arrivals:3},
 {name:'clinic-standard authored blocked lead / passage queue',index:10,
  seed:14490156,scale:'standard',mode:'authored',
  pending:['rook','moss','vale'],arrivals:1}
];
const round=n=>Number.isFinite(n)?Number(n.toFixed(2)):n;
function cause(actor,windows){
 const last=windows.at(-1);
 if(actor.activeOrderDetails?.kind==='sync')return 'authored-sync-hold';
 if(actor.motorPause==='passage'&&
    last?.classification==='waiting-for-passage')return 'passage-queue';
 if(last?.classification==='physical-obstruction'&&
    (last.travel??Infinity)<1)return 'physical-block';
 if(windows.slice(-4).some(x=>x.classification==='movement-loop')&&
    windows.slice(-4).reduce((n,x)=>n+(x.travel??0),0)>150)
  return 'route-cycle';
 if(last?.classification==='moving-goalward')return 'still-moving';
 return 'unclassified';
}
for(const c of cases)test('D3.32 physical pending witness: '+c.name,()=>{
 const stdout=execFileSync(process.execPath,[
  '--experimental-strip-types','scripts/audit-r7-squad-execution.mjs',
  '1','2700','--site-index='+c.index,'--audit-seed='+c.seed,
  '--audit-scale='+c.scale,'--progress','--route-transitions'
 ],{cwd:root,maxBuffer:18*1024*1024,timeout:120000,encoding:'utf8'});
 const report=JSON.parse(stdout),row=report.rows[0];
 assert.equal(report.rows.length,1);
 assert.equal(report.ticks,2700);
 assert.equal(row.seed,c.seed);
 assert.equal(row.scale,c.scale);
 assert.equal(row.archetype,c.name.split('-')[0]);
 assert.equal(report.summary.exceptions,0);
 assert.equal(report.summary.physicsStepViolations,0);
 assert.equal(report.summary.invalidPositions,0);
 assert.equal(report.summary.corruptedPlans,0);
 const mode=row.modes.find(x=>x.mode===c.mode);
 assert.ok(mode,'authored and ENTRY retain separate physical outcomes');
 assert.equal(mode.operators.length,4,'exact physical squad cardinality');
 assert.ok(mode.arrivals>=c.arrivals,
  'never reduce genuinely arrived operators on frozen holdout');
 const observed=mode.operators.filter(x=>x.outcome==='pending');
 const known=new Set(c.pending);
 const newlyPending=observed.filter(x=>!known.has(x.id));
 assert.deepEqual(newlyPending.map(x=>x.id),[],
  'a formerly arrived/terminal operator cannot become newly pending');
 const witnesses=observed.map(actor=>{
  const windows=mode.progressEvidence.filter(x=>x.actor===actor.id);
  const routes=Object.fromEntries(Object.entries(
    mode.routeTransitions?.byActor??{}).filter(
      ([key])=>key.startsWith(actor.id+':')));
  return {actor:actor.id,cause:cause(actor,windows),
   order:actor.activeOrderDetails?.kind??actor.activeOrder,
   remaining:round(actor.remaining),blocker:actor.lastBlocker,
   secondsBlocked:round(actor.blockedSeconds),
   passageWait:round(actor.waitSeconds),
   motorPause:actor.motorPause,retries:actor.retries,
   travelled:round(actor.progressDistance),
   lastWindow:windows.at(-1)?.classification??null,
   lastNet:windows.at(-1)?.net??null,
   lastTravel:windows.at(-1)?.travel??null,
   doorEpisode:actor.doorEpisode,firstRouteNode:actor.nextNav,
   routeSources:routes};
 });
 console.log('D332_PHYSICAL_PENDING',JSON.stringify({
  case:c.name,seed:c.seed,mode:c.mode,
  actualArrivals:mode.arrivals,remainingPending:witnesses.length,
  witnesses
 }));
});
