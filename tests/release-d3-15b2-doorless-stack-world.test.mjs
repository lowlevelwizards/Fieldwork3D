import test from 'node:test';
import assert from 'node:assert/strict';
import {shouldProbeDoorlessStackLane,sweptGoalRouteFromStackCycle,
 noteCircularWorldRoute,ownsCircularWorldRoute}
 from '../src/breach-cycle-lane-recovery.ts';
const p=(x,y)=>({x,y});
const make=()=>({side:'blue',p:p(569,456),squeeze:false,
 doorTraversal:null,
 plan:[{kind:'move',id:4,p:p(569.73,426),stackDoorId:'FRONT'}]});
test('D3.15B2: three genuinely repeated doorless STACK-lane choices',()=>{
 const a=make(),goal=a.plan[0].p;
 assert.equal(shouldProbeDoorlessStackLane(a,goal,1),false);
 a.p=p(568.96,456.5);
 assert.equal(shouldProbeDoorlessStackLane(a,goal,1.7),false);
 a.p=p(568.94,456.52);
 assert.equal(shouldProbeDoorlessStackLane(a,goal,2.4),true);
 assert.equal(shouldProbeDoorlessStackLane(a,goal,3.1),false);
 noteCircularWorldRoute(a,2.4);
 assert.equal(ownsCircularWorldRoute(a,2.7),true);
 assert.equal(ownsCircularWorldRoute(a,6.5),false);
});
test('D3.15B2: never auto-recover explicit WATCH, non-stack or active leaf',()=>{
 const goal=p(570,426),a=make();
 a.doorTraversal={doorId:'FRONT',maneuver:'grab-and-hold'};
 assert.equal(shouldProbeDoorlessStackLane(a,goal,1),false);
 a.doorTraversal=null;a.plan[0]={kind:'wait',id:4,p:goal,stackDoorId:'FRONT'};
 assert.equal(shouldProbeDoorlessStackLane(a,goal,2),false);
 a.plan[0]={kind:'move',id:4,p:goal};
 assert.equal(shouldProbeDoorlessStackLane(a,goal,3),false);
 a.plan[0]={kind:'move',id:4,p:goal,entryDoorId:'FRONT',stackDoorId:'FRONT'};
 assert.equal(shouldProbeDoorlessStackLane(a,goal,4),false);
 a.plan[0]={kind:'move',id:4,p:goal,stackDoorId:'FRONT'};
 a.squeeze=true;
 assert.equal(shouldProbeDoorlessStackLane(a,goal,5),false);
});
test('D3.15B2: every full-body leg to the original STACK GO physically validated',()=>{
 const from=p(564.45,461.24),goal=p(569.73,426);
 const world=[p(560,456),p(560,432),{...goal}];
 assert.deepEqual(sweptGoalRouteFromStackCycle(from,goal,world,()=>true),world);
 let called=0;
 assert.deepEqual(sweptGoalRouteFromStackCycle(from,goal,world,
  (_a,b)=>{called++;return b.y!==432}),[]);
 assert.equal(called,2);
 assert.deepEqual(sweptGoalRouteFromStackCycle(from,goal,world.slice(0,2),
  ()=>true),[],'cannot complete only a transient portal instead of authored STACK GO');
 assert.deepEqual(sweptGoalRouteFromStackCycle(from,goal,
  [p(900,900),goal],()=>true),[],'reject unbounded detour');
 assert.deepEqual(sweptGoalRouteFromStackCycle(from,goal,[],()=>true),[]);
});
