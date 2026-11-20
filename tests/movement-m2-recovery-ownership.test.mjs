import test from 'node:test';
import assert from 'node:assert/strict';
import {usefulFullBodyRecoveryRoute}
 from '../src/breach-recovery-route-validation.ts';
import {allowPhysicalRouteReissue}
 from '../src/breach-route-recurrence.ts';
const p=(x,y)=>({x,y});
const actor=(template=false)=>({
 side:'blue',p:p(0,0),blockedTime:2,
 plan:[{id:1,kind:'move',p:p(100,0),...(template?{stackDoorId:'D1'}:{})}]
});
const clear=()=>true;
test('M2: reject replan whose far tail differs but first obstructed waypoint is unchanged',()=>{
 assert.equal(usefulFullBodyRecoveryRoute(p(0,0),[p(10,0),p(100,0)],
  [p(10.1,0),p(80,20),p(100,0)],clear,2),false);
 assert.equal(usefulFullBodyRecoveryRoute(p(0,0),[p(10,0),p(100,0)],
  [p(0,10),p(100,0)],clear,2),true);
 assert.equal(usefulFullBodyRecoveryRoute(p(0,0),[p(10,0),p(100,0)],
  [p(10,0),p(80,20),p(100,0)],clear,.5),true,
  'still-productive first leg may be retained when only later route changes');
});
test('M2: first .3 unit actual body step must pass',()=>{
 assert.equal(usefulFullBodyRecoveryRoute(p(0,0),[p(20,0)],
  [p(0,20)],(from,to)=>to.y-from.y>=1,2),false);
 assert.equal(usefulFullBodyRecoveryRoute(p(0,0),[p(20,0)],
  [p(NaN,20)],clear,2),false);
 assert.equal(usefulFullBodyRecoveryRoute(p(0,0),[p(20,0)],
  [],clear,2),false);
});
test('M2: different ordinary stalled recovery sources share a recurrence cap',()=>{
 const a=actor(),goal=p(100,0),route=[p(12,0),goal];
 for(const family of ['full-body-lane','blocked-leg-connector','collision-replan']){
  assert.equal(allowPhysicalRouteReissue(a,family,goal,route,1+
   ['full-body-lane','blocked-leg-connector','collision-replan'].indexOf(family)),true);
 }
 assert.equal(allowPhysicalRouteReissue(a,'full-body-lane',goal,route,4),false);
 a.p=p(6,0);
 assert.equal(allowPhysicalRouteReissue(a,'collision-replan',goal,route,5),true);
});
test('M2: a new first point or authored order resets repetition',()=>{
 const a=actor(),goal=p(100,0),route=[p(12,0),goal];
 for(let i=0;i<4;i++)allowPhysicalRouteReissue(a,'collision-replan',goal,route,i+1);
 assert.equal(allowPhysicalRouteReissue(a,'collision-replan',goal,
  [p(0,20),goal],5),true);
 a.plan=[{id:2,kind:'move',p:goal}];
 assert.equal(allowPhysicalRouteReissue(a,'collision-replan',goal,route,6),true);
});
test('M2: generated STACK ownership stays independent per recovery family',()=>{
 const a=actor(true),goal=p(100,0),route=[p(12,0),goal];
 for(let i=1;i<=3;i++)assert.equal(
  allowPhysicalRouteReissue(a,'full-body-lane',goal,route,i),true);
 assert.equal(allowPhysicalRouteReissue(a,'blocked-leg-connector',goal,route,4),true);
});
