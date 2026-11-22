/** D3.37 Clinic P2: physically certified service-door crossing, no
 * synthetic ENTRY completion or bypass of the real hinge.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {OPERATOR_RADIUS,doorLeafSegment,pointToSegment,
 doorBlocksSegment} from '../src/breach-core.ts';
import {selectCertifiedFarSideEntryLanding,
 claimStalledGeneratedEntryFarSide}
 from '../src/breach-d337-entry-service-landing.ts';
const root=fileURLToPath(new URL('../',import.meta.url));
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
test('D3.37: only an actual standable, real crossing of one operable door passes',()=>{
 const service={id:'SERVICE',kind:'hinged',open:false,locked:false,
  jammed:false,wedged:false,heldBy:null,openFraction:0,
  angularVelocity:0,a:{x:436,y:80},b:{x:476,y:80}};
 const from={x:261.72,y:327.75},goal={x:423,y:351},
  proposed=[{x:264,y:320},{x:264,y:72},{x:272,y:64},
   {x:440,y:64},{x:448,y:72}];
 const stand=(at,doors)=>doors.every(door=>
  pointToSegment(at,doorLeafSegment(door))>=OPERATOR_RADIUS+1);
 const sweep=(a,b,doors)=>{
  for(let i=0;i<=Math.ceil(dist(a,b)/.5);i++){
   const steps=Math.max(1,Math.ceil(dist(a,b)/.5));
   const t=i/steps,at={x:a.x+(b.x-a.x)*t,
    y:a.y+(b.y-a.y)*t};
   if(!stand(at,doors))return false;
  }
  return true;
 };
 const operable=door=>!door.locked&&!door.jammed&&
  !door.wedged&&!door.heldBy&&door.openFraction<.72;
 assert.equal(stand(proposed.at(-1),[service]),false,
  'the old snapped terminal point overlaps real closed leaf');
 assert.equal(sweep(proposed.at(-2),proposed.at(-1),[]),true);
 assert.equal(doorBlocksSegment(service,{a:proposed.at(-2),
  b:proposed.at(-1)}),false,
  'an approach-side capsule near miss is not a true crossing');
 const route=selectCertifiedFarSideEntryLanding(
  from,goal,proposed,[service],sweep,stand,operable);
 assert.equal(route.length,5,'five-node prefix is physically certified');
 assert.deepEqual(route.slice(0,-1),proposed.slice(0,-1),
  'all four already full-body-safe original nodes retained');
 assert.equal(stand(route.at(-1),[service]),true,
  'post-door terminal waypoint genuinely fits body');
 assert.equal(doorBlocksSegment(service,{a:route.at(-2),
  b:route.at(-1)}),true,'route must CROSS original closed leaf');
 assert.equal(sweep(route.at(-2),route.at(-1),[]),true,
  'the ONLY allowed intersected object is SERVICE');
 assert.deepEqual(proposed.at(-1),{x:448,y:72},
  'original world proposal not mutated');
 for(const altered of [{locked:true},{jammed:true},{wedged:true},
   {heldBy:'operator'},{kind:'sliding'}]){
  const blocked={...service,...altered};
  assert.deepEqual(selectCertifiedFarSideEntryLanding(
   from,goal,proposed,[blocked],sweep,stand,operable),[],
   'locked or physically unavailable door cannot receive fake clearance');
 }
 assert.deepEqual(selectCertifiedFarSideEntryLanding(
  from,{x:420,y:0},proposed,[service],sweep,stand,operable),[],
  'no fake crossing if authored GO is on approach side');
});
test('D3.37: cold claim requires genuine stalled handless generated ENTRY',()=>{
 const goal={x:423,y:351};
 const door={id:'FRONT',kind:'hinged',a:{x:261.72,y:327.75},
  b:{x:289,y:345},open:true,openFraction:1.418,
  angularVelocity:0,locked:false,jammed:false,wedged:false,
  heldBy:null};
 const actor={side:'blue',p:{x:261.72,y:327.75},nav:[],
  plan:[{id:14,kind:'move',p:goal,entryDoorId:'FRONT'}],
  blockedTime:35.6,lastBlocker:'route',recoveryAttempts:14,
  retryRouteAt:0,squeeze:false,traversal:null,
  traversalPending:false,autoSidestep:null,
  fireRetreatTarget:null,doorHandContact:null,
  doorTraversal:{doorId:'FRONT',authoredOrderId:14,
   phase:'blocked',maneuver:'grab-and-hold',
   handContact:false,waypoints:[],lastProgressAt:9.38}};
 assert.equal(claimStalledGeneratedEntryFarSide(
  actor,goal,door,45,1),true);
 assert.equal(claimStalledGeneratedEntryFarSide(
  actor,goal,door,46,1),false,'stationary anchor gets one probe');
 assert.equal(claimStalledGeneratedEntryFarSide(
  {...actor,doorTraversal:{...actor.doorTraversal,
    handContact:true}},goal,door,45,2),false,
  'never retire a real support hand');
 assert.equal(claimStalledGeneratedEntryFarSide(
  {...actor,plan:[{...actor.plan[0],entryDoorId:null}]},
  goal,door,45,2),false,'no ordinary authored MOVE takeover');
 assert.equal(claimStalledGeneratedEntryFarSide(
  {...actor,nav:[{x:264,y:320}]},goal,door,45,2),false,
  'an active route keeps its own authority');
 assert.equal(claimStalledGeneratedEntryFarSide(
  {...actor,blockedTime:0},goal,door,45,2),false,
  'genuine cold failure is necessary');
 assert.equal(claimStalledGeneratedEntryFarSide(
  actor,goal,{...door,locked:true},45,2),false);
});
test('D3.37 Clinic SMALL 14191143: Ash physically reaches original ENTRY GO',()=>{
 const r=JSON.parse(execFileSync(process.execPath,[
  '--experimental-strip-types','scripts/audit-r7-squad-execution.mjs',
  '1','2700','--site-index=10','--audit-seed=14191143',
  '--audit-scale=small','--progress','--route-transitions',
  '--trace-actor=ash','--trace-mode=entry'
 ],{cwd:root,encoding:'utf8',timeout:120000,
  maxBuffer:24*1024*1024}));
 const run=r.rows[0]?.modes.find(m=>m.mode==='entry'),
  ash=run?.operators.find(a=>a.id==='ash');
 console.log('D337_CLINIC_SERVICE_TRUE_BODY',JSON.stringify({
  arrivals:run?.arrivals,operators:run?.operators,
  ashSourceCount:run?.routeTransitions?.byActor?.[
   'ash:initial-portal-recovery']??0,
  lastAshRoutes:run?.routeTransitions?.events
   ?.filter(e=>e.actorId==='ash').slice(-16)
   .map(e=>({t:e.seconds,source:e.source,from:e.position,
    first:e.next?.[0],last:e.next?.at(-1),reason:e.reason}))
 }));
 assert.equal(r.ticks,2700);
 for(const key of ['exceptions','invalidPositions','corruptedPlans',
  'physicsStepViolations','unboundedManeuverAttempts'])
  assert.equal(r.summary[key],0,'no physical motor violation '+key);
 assert.equal(run?.operators.length,4);
 assert.ok(run.arrivals>=3,'old Clinic 2 actual arrivals not lost');
 assert.equal(ash?.outcome,'arrived',
  'a new route alone cannot be counted as genuine ENTRY arrival');
 assert.equal(ash?.arrived,true);
 assert.equal(ash?.failedOrders,0);
 assert.deepEqual(ash?.goal,{x:423,y:351},
  'original authored ENTRY GO never changed');
 assert.ok(ash?.remaining<=5,'Ash body reaches ORIGINAL GO physically');
 assert.ok((run.routeTransitions?.byActor?.[
  'ash:initial-portal-recovery']??0)>=1,
  'exact cold certified route actually adopted by motor');
});
