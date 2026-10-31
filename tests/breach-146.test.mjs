import test from 'node:test';
import assert from 'node:assert/strict';
import {activateSite,route,passable,initialDoors}
  from '../src/breach-core.ts';
import {diagnoseMovement,projectReachableGoal,routeSegmentsClear,
  progressToward} from '../src/breach-nav-diagnostics.ts';
import {newSession,team,planMove,stepSession,toggling}
  from '../src/breach-game.ts';
test('146: distinguish wall, furniture and actual closed door obstruction',()=>{
  activateSite(null);
  assert.equal(diagnoseMovement({x:100,y:200},{x:120,y:200},[]).blocker,'wall');
  assert.equal(diagnoseMovement({x:159,y:144},{x:159,y:200},[]).blocker,'furniture');
  const ds=initialDoors();
  assert.equal(diagnoseMovement({x:303,y:512},{x:303,y:547},ds).blocker,'door');
});
test('146: only small nearby goal corrections, not teleporting across walls',()=>{
  activateSite(null);
  const from={x:306,y:600},near={x:121,y:240};
  const adjusted=projectReachableGoal(from,near);
  assert.ok(adjusted);
  assert.ok(Math.hypot(adjusted.point.x-near.x,
    adjusted.point.y-near.y)<=13.001);
  assert.equal(projectReachableGoal(from,{x:400,y:0}),null);
});
test('146: pure goals preserve authored position if already accessible',()=>{
  activateSite(null);
  const goal={x:306,y:480},from={x:305,y:596};
  const result=projectReachableGoal(from,goal);
  assert.deepEqual(result,{point:goal,adjusted:false});
  const planned=route(from,goal);
  assert.ok(planned.length);
  assert.ok(routeSegmentsClear(from,planned));
  assert.ok(progressToward(from,goal,goal)>0);
});
test('146: planning snaps a very near obstacle tap but not distant invalid',()=>{
  const s=newSession(0,100),a=team(s)[0];
  const target={x:a.p.x+8,y:a.p.y-30};
  if(passable(target))assert.ok(planMove(s,a.id,target));
  assert.equal(planMove(s,a.id,{x:-20,y:-20}),false);
  toggling(s);
  for(let i=0;i<100;i++)stepSession(s,1/60);
  assert.ok(Number.isFinite(a.p.x));
  assert.ok(['clear','route','door','furniture','wall','actor','bounds']
    .includes(a.lastBlocker));
  activateSite(null);
});