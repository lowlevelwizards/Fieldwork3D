import test from 'node:test';
import assert from 'node:assert/strict';
import {allowPhysicalRouteReissue} from '../src/breach-route-recurrence.ts';

const actor=()=>({side:'blue',p:{x:100,y:100},
 plan:[{id:42,kind:'move',p:{x:300,y:100}}]});
const goal={x:300,y:100},route=[{x:112,y:101},{x:140,y:100}];
const check=(a,sec,family='full-body-lane',r=route,token='')=>
 allowPhysicalRouteReissue(a,family,goal,r,sec,token);

test('D3.17B: fourth identical route at stationary anchor is rejected',()=>{
 const a=actor();
 assert.equal(check(a,0),true);
 assert.equal(check(a,1),true);
 assert.equal(check(a,2),true);
 assert.equal(check(a,3),false);
 assert.equal(check(a,4),false);
});
test('D3.17B: genuine departure or three goalward units resets recurrence',()=>{
 const a=actor();
 check(a,0);check(a,1);check(a,2);assert.equal(check(a,3),false);
 a.p={x:104,y:100};assert.equal(check(a,4),true);
 a.p={x:106,y:100};assert.equal(check(a,5),true);
 a.p={x:110,y:100};assert.equal(check(a,6),true);
});
test('D3.17B: new plan, new first route leg and changed hinge reset',()=>{
 const a=actor(),family='door-rehearsal',token='COURT-1:4';
 assert.equal(check(a,0,family,route,token),true);
 assert.equal(check(a,1,family,route,token),true);
 assert.equal(check(a,2,family,route,token),true);
 assert.equal(check(a,2.5,family,route,token),false);
 assert.equal(check(a,3,family,route,'COURT-1:6'),true);
 a.plan=[{id:43,kind:'move',p:goal}];
 assert.equal(check(a,4,family,route,'COURT-1:6'),true);
 assert.equal(check(a,5,family,[{x:124,y:104}],'COURT-1:6'),true);
});
test('D3.17B: actors, route families and authored goals are independent',()=>{
 const a=actor(),b=actor();
 check(a,0);check(a,1);check(a,2);assert.equal(check(a,3),false);
 assert.equal(check(b,3),true);
 assert.equal(check(a,3,'blocked-leg-connector'),true);
 assert.equal(allowPhysicalRouteReissue(a,'full-body-lane',
  {x:200,y:200},route,3),true);
});
test('D3.17B: bounded expiration permits changed physical geometry',()=>{
 const a=actor();check(a,0);check(a,1);check(a,2);
 assert.equal(check(a,3),false);
 assert.equal(check(a,8.1),true);
 assert.equal(check(a,8.9),true);
});
test('D3.17B: non-MOVE, opposite team and empty routes never gated',()=>{
 const a=actor();a.plan=[{id:42,kind:'watch',p:goal}];
 for(let i=0;i<6;i++)assert.equal(check(a,i),true);
 a.side='red';
 for(let i=0;i<6;i++)assert.equal(check(a,i),true);
 a.side='blue';a.plan=[{id:42,kind:'move',p:goal}];
 for(let i=0;i<6;i++)assert.equal(check(a,i,'full-body-lane',[]),true);
});
