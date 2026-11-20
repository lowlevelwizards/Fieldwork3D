import test from 'node:test';
import assert from 'node:assert/strict';
import {firstFullBodyMotorStrideClear}
 from '../src/breach-recovery-route-validation.ts';
import {allowPhysicalRouteReissue}
 from '../src/breach-route-recurrence.ts';
const p=(x,y)=>({x,y});
const actor=()=>({
 side:'blue',p:p(0,0),plan:[{id:1,kind:'move',p:p(100,0)}]
});

test('R1.04: coarse clear chord cannot excuse a blocked first real footstep',()=>{
 const coarse=(a,b)=>Math.abs(b.x-a.x)>=1;
 assert.equal(coarse(p(0,0),p(40,0)),true);
 assert.equal(firstFullBodyMotorStrideClear(p(0,0),p(40,0),coarse),false);
 assert.equal(firstFullBodyMotorStrideClear(p(0,0),p(40,0),
   (a,b)=>b.x-a.x>=0),true);
 assert.equal(firstFullBodyMotorStrideClear(p(0,0),p(0,0),()=>true),false);
 assert.equal(firstFullBodyMotorStrideClear(p(0,0),p(Infinity,0),()=>true),false);
});

test('R1.04: world/intel collision replan sources share one stationary recurrence cap',()=>{
 const a=actor(),goal=p(100,0),route=[p(10,0),goal];
 assert.equal(allowPhysicalRouteReissue(a,'collision-replan',goal,route,1),true);
 assert.equal(allowPhysicalRouteReissue(a,'collision-replan',goal,route,2),true);
 assert.equal(allowPhysicalRouteReissue(a,'collision-replan',goal,route,3),true);
 assert.equal(allowPhysicalRouteReissue(a,'collision-replan',goal,route,4),false);
 a.p=p(5,0);
 assert.equal(allowPhysicalRouteReissue(a,'collision-replan',goal,route,5),true,
  'actual physical relocation reopens a safe recovery proposal');
});

test('R1.04: unchanged blocked replan budget never leaks into new authored order',()=>{
 const a=actor(),goal=p(100,0),route=[p(10,0),goal];
 for(let i=1;i<=4;i++)allowPhysicalRouteReissue(a,'collision-replan',goal,route,i);
 a.plan=[{id:2,kind:'move',p:goal}];
 assert.equal(allowPhysicalRouteReissue(a,'collision-replan',goal,route,4.5),true);
});
