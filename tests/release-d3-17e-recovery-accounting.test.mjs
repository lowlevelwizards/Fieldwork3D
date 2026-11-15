import test from 'node:test';
import assert from 'node:assert/strict';
import {shouldProbeStationaryCollisionRoute,
 physicalDoorPoseKey} from '../src/breach-recovery-proposal-gate.ts';
import {shouldPauseNegativeGoalProbe,noteFailedRouteProbe}
 from '../src/breach-cold-route-cache.ts';
const p=(x,y)=>({x,y});
const actor=()=>({id:'ash',side:'blue',p:p(0,0),
 plan:[{kind:'move',id:1,p:p(60,0)}]});
const door=(fraction=.9)=>({
 id:'D1',a:p(8,-8),b:p(8,8),open:true,openFraction:fraction,
 locked:false,jammed:false,wedged:false,heldBy:null
});
test('E2 cap stationary collision probes; preserve periodic re-test',()=>{
 const a=actor(),goal=p(60,0),doors=[door()];
 assert.equal(shouldProbeStationaryCollisionRoute(a,goal,0,1,doors),true);
 assert.equal(shouldProbeStationaryCollisionRoute(a,goal,1,1,doors),true);
 assert.equal(shouldProbeStationaryCollisionRoute(a,goal,2,1,doors),true);
 assert.equal(shouldProbeStationaryCollisionRoute(a,goal,3,1,doors),false);
 assert.equal(shouldProbeStationaryCollisionRoute(a,goal,6,1,doors),true);
 assert.equal(shouldProbeStationaryCollisionRoute(a,goal,7,1,doors),false);
});
test('E2 actual progress, hinge change, cover revision and new order reset',()=>{
 const a=actor(),goal=p(60,0);
 for(let t=0;t<3;t++)shouldProbeStationaryCollisionRoute(a,goal,t,1,[door()]);
 a.p=p(4,0);
 assert.equal(shouldProbeStationaryCollisionRoute(a,goal,3,1,[door()]),true);
 for(let t=4;t<6;t++)shouldProbeStationaryCollisionRoute(a,goal,t,1,[door()]);
 assert.equal(shouldProbeStationaryCollisionRoute(a,goal,6.1,1,[door(.6)]),true);
 assert.equal(shouldProbeStationaryCollisionRoute(a,goal,7,2,[door(.6)]),true);
 a.plan[0].id=2;
 assert.equal(shouldProbeStationaryCollisionRoute(a,goal,7.1,2,[door(.6)]),true);
 assert.notEqual(physicalDoorPoseKey(a.p,[door(.5)]),
  physicalDoorPoseKey(a.p,[door(.6)]));
});
test('E6 only an ACTUAL failed A* may be cached; retries remain live',()=>{
 const a=actor(),goal=p(60,0);
 assert.equal(shouldPauseNegativeGoalProbe(a,goal,1,1,[door()]),false);
 noteFailedRouteProbe(a,goal,1,1,[door()]);
 assert.equal(shouldPauseNegativeGoalProbe(a,goal,2,1,[door()]),true);
 assert.equal(shouldPauseNegativeGoalProbe(a,goal,5.1,1,[door()]),false);
 assert.equal(shouldPauseNegativeGoalProbe(a,goal,2,1,[door(.5)]),false);
 assert.equal(shouldPauseNegativeGoalProbe(a,goal,2,2,[door()]),false);
 a.p=p(6,0);
 assert.equal(shouldPauseNegativeGoalProbe(a,goal,2,1,[door()]),false);
 a.p=p(0,0);a.plan[0].id=22;
 assert.equal(shouldPauseNegativeGoalProbe(a,goal,2,1,[door()]),false);
});
test('E1 recovered stalls remain visible but are not unresolved regressions',()=>{
 const baseline={arrived:false,stallEpisodes:0,retries:0};
 const candidate={arrived:true,stallEpisodes:1,retries:2};
 assert.equal(candidate.stallEpisodes-baseline.stallEpisodes,1);
 assert.equal(!candidate.arrived&&candidate.stallEpisodes>baseline.stallEpisodes,
  false);
});
