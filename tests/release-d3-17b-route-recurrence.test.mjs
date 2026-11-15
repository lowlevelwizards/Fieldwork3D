import test from 'node:test';
import assert from 'node:assert/strict';
import {allowPhysicalRouteReissue} from '../src/breach-route-recurrence.ts';

const actor=()=>({side:'blue',p:{x:100,y:100},
 plan:[{id:42,kind:'move',p:{x:300,y:100}}]});
const goal={x:300,y:100},route=[{x:112,y:101},{x:140,y:100}];
const check=(a,sec,family='full-body-lane',r=route,token='')=>
 allowPhysicalRouteReissue(a,family,goal,r,sec,token);

test('D3.17B: three identical cycling physical lane proposals are gated',()=>{
 const a=actor();
 assert.equal(check(a,0),true);
 assert.equal(check(a,1),true);
 assert.equal(check(a,2),false);
 assert.equal(check(a,3),false);
});
test('D3.17B: genuine displacement and GO approach reset recurrence',()=>{
 const a=actor();
 check(a,0);check(a,1);assert.equal(check(a,2),false);
 a.p={x:120,y:100};assert.equal(check(a,3),true);
 a.p={x:124,y:100};assert.equal(check(a,4),true);
 a.p={x:150,y:100};assert.equal(check(a,5),true);
});
test('D3.17B: new plan, route departure and changed door angle reset',()=>{
 const a=actor();
 assert.equal(check(a,0,'door-rehearsal',route,'COURT-1:4'),true);
 assert.equal(check(a,1,'door-rehearsal',route,'COURT-1:4'),true);
 assert.equal(check(a,2,'door-rehearsal',route,'COURT-1:4'),false);
 assert.equal(check(a,3,'door-rehearsal',route,'COURT-1:6'),true);
 a.plan=[{id:43,kind:'move',p:goal}];
 assert.equal(check(a,4,'door-rehearsal',route,'COURT-1:6'),true);
 assert.equal(check(a,5,'door-rehearsal',[{x:124,y:104}], 'COURT-1:6'),true);
});
test('D3.17B: distinct actors, route families, and goals do not share budgets',()=>{
 const a=actor(),b=actor();
 check(a,0);check(a,1);assert.equal(check(a,2),false);
 assert.equal(check(b,2),true);
 assert.equal(check(a,2,'blocked-leg-connector'),true);
 assert.equal(allowPhysicalRouteReissue(a,'full-body-lane',
  {x:200,y:200},route,2),true);
});
test('D3.17B: bounded retries can heal newly cleared physical geometry',()=>{
 const a=actor();check(a,0);check(a,1);
 assert.equal(check(a,2),false);
 assert.equal(check(a,8.1),true);
 assert.equal(check(a,8.9),true);
});
test('D3.17B: authored and non-move orders are never gated',()=>{
 const a=actor();a.plan=[{id:42,kind:'watch',p:goal}];
 for(let i=0;i<6;i++)assert.equal(check(a,i),true);
 a.side='red';
 for(let i=0;i<6;i++)assert.equal(check(a,i),true);
});
