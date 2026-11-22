/** D3.36 Garage P1: strict original 45s, 60Hz real physical GO gate.
 * The original authored Garage scene has 2/4 genuine arrivals. Rook's
 * current first grid leg intersects a real wall at (672,224); an exact
 * six-waypoint full-size rejoin to a LATER existing node is feasible.
 * This test forbids crediting a route proposal as physical arrival.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {claimColdExactExistingRouteRejoin,
 selectColdExactExistingRouteRejoin}
 from '../src/breach-d336-cold-route-rejoin.ts';
const root=fileURLToPath(new URL('../',import.meta.url));
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);

test('D3.36 cold exact rejoin: only a real wall-stalled authored MOVE may claim',()=>{
 const goal={x:80,y:0},old=[{x:10,y:0},{x:32,y:0},goal];
 const a={side:'blue',p:{x:0,y:0},
  plan:[{id:8,kind:'move',p:goal}],nav:old,
  blockedTime:3.2,lastBlocker:'wall',squeeze:false,
  traversal:null,traversalPending:false,autoSidestep:null,
  fireRetreatTarget:null,doorTraversal:null,
  doorHandContact:null,retryRouteAt:0};
 const firstClear=false;
 assert.equal(claimColdExactExistingRouteRejoin(
  a,goal,10,0,[],firstClear),true);
 assert.equal(claimColdExactExistingRouteRejoin(
  a,goal,15,0,[],firstClear),false,
  'same stationary body/world cannot spam cold exact A*');
 assert.equal(claimColdExactExistingRouteRejoin(
  a,goal,16,0,[],true),false,'a clear first chord needs NO repair');
 a.plan=[{...a.plan[0],entryDoorId:'FRONT'}];
 assert.equal(claimColdExactExistingRouteRejoin(
  a,goal,17,1,[],firstClear),false,
  'generated entry retains its own door selector');
 a.plan=[{...a.plan[0],entryDoorId:null}];
 a.blockedTime=0;
 assert.equal(claimColdExactExistingRouteRejoin(
  a,goal,18,1,[],firstClear),false,
  'real cold stall required');
 a.blockedTime=4;a.doorHandContact={releasedAt:null,doorId:'D1'};
 assert.equal(claimColdExactExistingRouteRejoin(
  a,goal,19,1,[],firstClear),false,
  'never steal a live support-hand door crossing');
});
test('D3.36 selector keeps original GO and every later route node',()=>{
 const obstacle=p=>p.x>=4&&p.x<=18&&Math.abs(p.y)<=5;
 const stand=p=>!obstacle(p);
 const swept=(a,b)=>{
  for(let t=0;t<=1.00001;t+=.02){
   const p={x:a.x+(b.x-a.x)*Math.min(1,t),
    y:a.y+(b.y-a.y)*Math.min(1,t)};
   if(!stand(p))return false;
  }
  return true;
 };
 const from={x:0,y:0},goal={x:80,y:0},
  old=[{x:10,y:0},{x:32,y:0},goal];
 const route=selectColdExactExistingRouteRejoin(
  from,goal,old,stand,swept);
 assert.ok(route.length>=3,'a real local bend finds later original NAV');
 assert.deepEqual(route.at(-1),goal,'never rewrite authored GO');
 assert.ok(route.some(p=>dist(p,old[1])<.1),
  'must preserve the existing later route join');
 assert.notDeepEqual(route[0],old[0],'old blocked first step is bypassed');
 let at=from;
 for(const p of route.slice(0,-1)){
  assert.ok(swept(at,p),'every exact connector step full-body clear');
  at=p;
 }
 assert.deepEqual(old[0],{x:10,y:0},
  'selector never mutates original transient route');
});

test('D3.36 frozen Garage authored Rook must physically reach his original GO',()=>{
 const r=JSON.parse(execFileSync(process.execPath,[
  '--experimental-strip-types','scripts/audit-r7-squad-execution.mjs',
  '1','2700','--site-index=5','--audit-seed=14354241',
  '--audit-scale=standard','--progress','--route-transitions',
  '--trace-actor=rook','--trace-mode=authored'
 ],{cwd:root,encoding:'utf8',maxBuffer:20*1024*1024,timeout:120000}));
 const run=r.rows[0]?.modes.find(m=>m.mode==='authored'),
  rook=run?.operators.find(a=>a.id==='rook'),
  moss=run?.operators.find(a=>a.id==='moss');
 console.log('D336_GARAGE_EXACT_REJOIN_TRUTH',JSON.stringify({
  realArrivals:run?.arrivals,rook,moss,
  sources:run?.routeTransitions?.byActor,
  lastRouteEvents:run?.routeTransitions?.events
   ?.filter(e=>e.actorId==='rook').slice(-16)
   .map(e=>({t:e.seconds,source:e.source,from:e.position,
    first:e.next?.[0],last:e.next?.at(-1),reason:e.reason}))
 }));
 assert.equal(r.ticks,2700);
 for(const key of ['exceptions','physicsStepViolations','invalidPositions',
   'corruptedPlans','unboundedManeuverAttempts'])
  assert.equal(r.summary[key],0,'no physical motor integrity regression: '+key);
 assert.equal(run.operators.length,4);
 assert.ok(run.arrivals>=3,'the former Garage 2/4 must gain true body arrival');
 assert.equal(rook?.outcome,'arrived','no synthetic goal completion');
 assert.equal(rook?.arrived,true);
 assert.equal(rook?.failedOrders,0);
 // D3.22 authoring preserves the clicked (615.6,564.5) in audit truth
 // but explicitly permits a <=13-unit full-body STANDABLE projection.
 // Its committed authored MOVE is (608.6,564.5), observed unchanged
 // in the baseline motor's blocked-route goal and the original NAV tail.
 // Require BOTH the original mouse-click provenance and actual feet at
 // the committed full-body-valid GO; do not reinterpret a raw click as a
 // physically parkable motor target or award a virtual arrival.
 assert.deepEqual(rook?.goal,{x:615.6,y:564.5},
  'the original requested click must not be rewritten');
 assert.ok(rook?.remaining<=13,
  'the existing bounded full-body authoring projection remains intact');
 assert.ok(dist(rook?.position,{x:608.6,y:564.5})<=5,
  'actual feet must park at the original legally committed MOVE target');
 assert.ok((run.routeTransitions?.byActor?.['rook:blocked-leg-connector']??0)>=1,
  'Rook must have been physically rejoined to existing route');
 assert.ok(moss?.outcome==='pending'||moss?.outcome==='arrived',
  'original Moss MOVE must never be silently cancelled');
});
