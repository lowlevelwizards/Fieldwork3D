/** D3.36 Garage Moss P2: exact real 45-second 60Hz frozen authored
 * squad with the original real D1 hinge, later operable doors and all
 * world body collision active. Existing Rook recovery already merged.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {claimColdBlockedOpenLeafContinuation}
 from '../src/breach-d336-stale-open-leaf.ts';
import {noteAcceptedColdBlockedLeafContinuation,
 protectedRehearsedFollowOnDoor}
 from '../src/breach-rehearsed-portal-continuation.ts';
const root=fileURLToPath(new URL('../',import.meta.url));

test('D3.36 stale D1 episode cannot be stolen before true cold route proof',()=>{
 const door={id:'D1',kind:'hinged',a:{x:0,y:0},b:{x:42,y:0},
  open:true,openFraction:1.55,angularVelocity:0,
  locked:false,jammed:false,wedged:false,heldBy:null};
 const goal={x:120,y:200};
 const actor={side:'blue',p:{x:0,y:0},nav:[],
  plan:[{id:17,kind:'move',p:goal}],
  blockedTime:4,recoveryAttempts:3,lastBlocker:'route',
  squeeze:false,traversal:null,traversalPending:false,
  autoSidestep:null,fireRetreatTarget:null,
  doorHandContact:null,retryRouteAt:0,
  doorTraversal:{doorId:'D1',authoredOrderId:17,
   phase:'blocked',maneuver:'direct',handContact:false,
   waypoints:[],lastProgressAt:3}};
 assert.equal(claimColdBlockedOpenLeafContinuation(
  actor,goal,door,10,0),true);
 assert.equal(claimColdBlockedOpenLeafContinuation(
  actor,goal,door,11,0),false,
  'same stationary body must never spam a new route probe');
 assert.equal(noteAcceptedColdBlockedLeafContinuation(
  actor,door,goal,10),false,
  'active old episode cannot falsely claim forwarded NAV lease');
 const fresh={...actor,nav:[{x:4,y:3},{x:120,y:200}],
  doorTraversal:null};
 assert.equal(noteAcceptedColdBlockedLeafContinuation(
  fresh,door,goal,12),true,
  'only an adopted nonempty exact route owns temporary old-leaf lease');
 assert.equal(protectedRehearsedFollowOnDoor(
  fresh,[door],12.1),'D1');
 fresh.blockedTime=.2;
 assert.equal(protectedRehearsedFollowOnDoor(
  fresh,[door],12.2),null,
  'REAL physical contact immediately revokes the lease');
 const locked={...actor,doorTraversal:{...actor.doorTraversal},
  p:{x:0,y:0}};
 assert.equal(claimColdBlockedOpenLeafContinuation(
  locked,goal,{...door,locked:true},10,0),false);
 locked.plan=[{...locked.plan[0],entryDoorId:'D1'}];
 assert.equal(claimColdBlockedOpenLeafContinuation(
  locked,goal,door,10,0),false,
  'generated entry retains its original door responsibility');
 locked.plan=[{...locked.plan[0],entryDoorId:null}];
 locked.doorHandContact={doorId:'D1',releasedAt:null};
 assert.equal(claimColdBlockedOpenLeafContinuation(
  locked,goal,door,10,0),false,
  'live support hand owns the old leaf');
});
test('D3.36 Garage 14354241 Moss reaches untouched authored GO physically',()=>{
 const r=JSON.parse(execFileSync(process.execPath,[
  '--experimental-strip-types','scripts/audit-r7-squad-execution.mjs',
  '1','2700','--site-index=5','--audit-seed=14354241',
  '--audit-scale=standard','--progress','--route-transitions',
  '--trace-actor=moss','--trace-mode=authored'
 ],{cwd:root,maxBuffer:22*1024*1024,timeout:120000,encoding:'utf8'}));
 const run=r.rows[0]?.modes.find(x=>x.mode==='authored'),
  moss=run?.operators.find(x=>x.id==='moss'),
  rook=run?.operators.find(x=>x.id==='rook');
 console.log('D336_GARAGE_MOSS_COLD_PORTAL_TRUTH',JSON.stringify({
  realSceneArrivals:run?.arrivals,moss,rook,
  byActor:run?.routeTransitions?.byActor,
  lastRouteEvents:run?.routeTransitions?.events
   ?.filter(e=>e.actorId==='moss').slice(-12)
   .map(e=>({t:e.seconds,source:e.source,at:e.position,
     first:e.next?.[0],last:e.next?.at(-1),reason:e.reason}))
 }));
 assert.equal(r.ticks,2700);
 for(const key of ['exceptions','invalidPositions','corruptedPlans',
    'physicsStepViolations','unboundedManeuverAttempts'])
  assert.equal(r.summary[key],0,'real motor integrity '+key);
 assert.equal(run?.operators.length,4);
 assert.equal(run?.arrivals,4,
  'all four Garage bodies must physically arrive at their own committed GO');
 assert.equal(rook?.outcome,'arrived',
  'previous D3.36 Garage Rook physical recovery must be preserved');
 assert.equal(moss?.outcome,'arrived',
  'Moss must truly reach GO, not just accept a route');
 assert.equal(moss?.arrived,true);
 assert.equal(moss?.failedOrders,0);
 assert.deepEqual(moss?.goal,{x:572.4,y:564.5},
  'original authoring click remains unchanged');
 assert.ok(moss?.remaining<=13,
  'Moss must reach original committed GO within existing landing projection');
 assert.ok((run.routeTransitions?.byActor?.[
  'moss:initial-portal-recovery']??0)>=1,
  'the proven next-operable-door route is actually adopted');
});
