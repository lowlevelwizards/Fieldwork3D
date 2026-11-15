import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {completePortalRouteToAuthoredGoal}
 from '../src/breach-door-maneuver-handoff.ts';
import {rehearseDoorLeafBypass,canRehearseJoinedPortalOncePerLeaf,
 noteJoinedPortalHandoff}
 from '../src/breach-door-traversal-maneuver.ts';
import {OPERATOR_RADIUS} from '../src/breach-core.ts';
import {sweptBodyClear} from '../src/breach-navigation.ts';
const p=(x,y)=>({x,y});
const text=path=>readFileSync(new URL(path,import.meta.url),'utf8');

test('D3.11D: never mistake a portal-only stage for an authored MOVE',()=>{
 const stage=[p(10,0),p(20,0)],goal=p(200,0);
 const frozen=structuredClone(stage);
 let sweeps=0;
 assert.deepEqual(completePortalRouteToAuthoredGoal(p(0,0),stage,goal,[],
  ()=>{sweeps++;return true;}),[]);
 assert.deepEqual(completePortalRouteToAuthoredGoal(p(0,0),stage,goal,[p(40,0),p(130,0)],
  ()=>true),[]);
 assert.equal(sweeps,0,'unreachable portal-only destination skips physical joins');
 assert.deepEqual(stage,frozen,'stage is never rewritten');
});
test('D3.11D: physically verified continuation retains original final goal',()=>{
 const stage=[p(10,0),p(20,0)],goal=p(200,0);
 const tail=[p(40,0),goal],sweeps=[];
 const result=completePortalRouteToAuthoredGoal(p(0,0),stage,goal,tail,(a,b)=>{
  sweeps.push([a,b]);return true;
 });
 assert.deepEqual(result,[...stage,...tail]);
 assert.deepEqual(sweeps,[[stage.at(-1),tail[0]]]);
 assert.notEqual(result[0],stage[0],'disposable route nodes are separately owned');
 assert.deepEqual(result.at(-1),goal);
});
test('D3.11D: a blocked first continuation is rejected, never ghosted',()=>{
 const route=completePortalRouteToAuthoredGoal(p(0,0),[p(10,0),p(20,0)],p(200,0),
  [p(40,0),p(200,0)],()=>false);
 assert.deepEqual(route,[]);
 assert.deepEqual(completePortalRouteToAuthoredGoal(p(0,0),[],p(5,0),[],()=>true),[]);
});
test('D3.11D: a genuinely goal-reaching staged route never needs intel A*',()=>{
 const goal=p(20,20),stage=[p(10,10),goal];
 assert.deepEqual(completePortalRouteToAuthoredGoal(p(0,0),stage,goal,[],()=>false),stage);
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

test('D3.11D2: one accepted handoff per unchanged authored door; new goal resets',()=>{
 const actor={},g=p(400,200);
 assert.equal(canRehearseJoinedPortalOncePerLeaf(actor,13,'FRONT',g,.82),true);
 noteJoinedPortalHandoff(actor,13,'FRONT',g,.82);
 assert.equal(canRehearseJoinedPortalOncePerLeaf(actor,13,'FRONT',g,.82),false);
 assert.equal(canRehearseJoinedPortalOncePerLeaf(actor,13,'FRONT',g,.90),false);
 assert.equal(canRehearseJoinedPortalOncePerLeaf(actor,13,'FRONT',g,.99),true);
 noteJoinedPortalHandoff(actor,13,'FRONT',g,.99);
 assert.equal(canRehearseJoinedPortalOncePerLeaf(actor,13,'FRONT',g,.60),false,
  'two accepted attempts exhaust bounded budget even if the leaf changes');
 assert.equal(canRehearseJoinedPortalOncePerLeaf(actor,14,'FRONT',g,.99),true,
  'a new authored order is independent');
 assert.equal(canRehearseJoinedPortalOncePerLeaf(actor,13,'SIDE',g,.99),true,
  'a different doorway is independent');
 assert.equal(canRehearseJoinedPortalOncePerLeaf(actor,13,'FRONT',p(401,200),.99),true,
  'a revised authored goal is independent');
});

test('D3.11D2: prolonged remote detour is rejected before stealing MOVE ownership',()=>{
 const source=p(0,0),goal=p(400,0);
 const stage=[p(12,25),p(30,30)];
 const tail=[p(30,300),p(300,300),goal];
 const result=completePortalRouteToAuthoredGoal(source,stage,goal,tail,()=>true);
 assert.deepEqual(result,[],'long physically lawful but unproductive detour stays with existing planner');
 const modest=[p(110,35),p(200,10),goal];
 const accepted=completePortalRouteToAuthoredGoal(source,stage,goal,modest,()=>true);
 assert.deepEqual(accepted,[...stage,...modest],'bounded valid continuation remains allowed');
});
