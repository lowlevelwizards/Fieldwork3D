import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {completePortalRouteToAuthoredGoal}
 from '../src/breach-door-maneuver-handoff.ts';
import {rehearseDoorLeafBypass}
 from '../src/breach-door-traversal-maneuver.ts';
import {OPERATOR_RADIUS} from '../src/breach-core.ts';
import {sweptBodyClear} from '../src/breach-navigation.ts';
const p=(x,y)=>({x,y});
const text=path=>readFileSync(new URL(path,import.meta.url),'utf8');

test('D3.11D: never mistake a portal-only stage for an authored MOVE',()=>{
 const stage=[p(10,0),p(20,0)],goal=p(200,0);
 const frozen=structuredClone(stage);
 let sweeps=0;
 assert.deepEqual(completePortalRouteToAuthoredGoal(stage,goal,[],
  ()=>{sweeps++;return true;}),[]);
 assert.deepEqual(completePortalRouteToAuthoredGoal(stage,goal,[p(40,0),p(130,0)],
  ()=>true),[]);
 assert.equal(sweeps,0,'unreachable portal-only destination skips physical joins');
 assert.deepEqual(stage,frozen,'stage is never rewritten');
});
test('D3.11D: physically verified continuation retains original final goal',()=>{
 const stage=[p(10,0),p(20,0)],goal=p(200,0);
 const tail=[p(40,0),goal],sweeps=[];
 const result=completePortalRouteToAuthoredGoal(stage,goal,tail,(a,b)=>{
  sweeps.push([a,b]);return true;
 });
 assert.deepEqual(result,[...stage,...tail]);
 assert.deepEqual(sweeps,[[stage.at(-1),tail[0]]]);
 assert.notEqual(result[0],stage[0],'disposable route nodes are separately owned');
 assert.deepEqual(result.at(-1),goal);
});
test('D3.11D: a blocked first continuation is rejected, never ghosted',()=>{
 const route=completePortalRouteToAuthoredGoal([p(10,0),p(20,0)],p(200,0),
  [p(40,0),p(200,0)],()=>false);
 assert.deepEqual(route,[]);
 assert.deepEqual(completePortalRouteToAuthoredGoal([],p(5,0),[],()=>true),[]);
});
test('D3.11D: a genuinely goal-reaching staged route never needs intel A*',()=>{
 const goal=p(20,20),stage=[p(10,10),goal];
 assert.deepEqual(completePortalRouteToAuthoredGoal(stage,goal,[],()=>false),stage);
});
test('D3.11D: original hinge/body physics validates portal stage',()=>{
 const world={passable:()=>true};
 for(const hinge of ['a','b'])for(const swing of [-1,1]){
  const door={id:'ENTRY',a:p(290,260),b:p(332,260),
   kind:'hinged',hinge,swing,open:true,openFraction:1};
  const start=p(303,232),goal=p(307,354);
  const stage=rehearseDoorLeafBypass(start,goal,door,
   (a,b)=>sweptBodyClear(a,b,[door],OPERATOR_RADIUS,world));
  let at=start;
  for(const next of stage){
   assert.ok(sweptBodyClear(at,next,[door],OPERATOR_RADIUS,world),
    'physical rehearsal never intersects hinge');
   at=next;
  }
 }
});
test('D3.11D: only real leaf escape may attempt proactive joined route',()=>{
 const motor=text('../src/breach-motor-route.ts');
 const collision=text('../src/breach-motor-collision.ts');
 const maneuver=text('../src/breach-door-traversal-maneuver.ts');
 for(const source of [motor,collision])
  assert.match(source,/if\(tryGoalCompleteDoorHandoffAfterEscape\(a,s,p\)\)/);
 assert.match(maneuver,/order\.kind!=='move'/);
 assert.match(maneuver,/e\.authoredOrderId!==order\.id/);
 assert.match(maneuver,/s\.seconds<e\.nextManeuverAt/);
 assert.match(maneuver,/e\.maneuverAttempts>=4/);
 assert.match(maneuver,/completePortalRouteToAuthoredGoal\(stage,goal,tail,clear\)/);
 assert.match(maneuver,/routeWithSqueezeIntel\(s\.intel,end,goal\)/);
 assert.match(maneuver,/sweptBodyClear\(from,to,s\.doors,OPERATOR_RADIUS,world\)/);
 assert.match(collision,/if\(!restoreAfterOpenLeafEscape\(a,s,p\)\)a\.retryRouteAt=0/);
});
