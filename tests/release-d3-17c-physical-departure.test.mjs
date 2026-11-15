import test from 'node:test';
import assert from 'node:assert/strict';
import {allowPhysicalRouteReissue} from '../src/breach-route-recurrence.ts';
import {claimRepeatedFurnitureDeparture,
 selectMotorVerifiedFurnitureDeparture}
 from '../src/breach-d317c-micro-departure.ts';

const p=(x,y)=>({x,y});
const actor=()=>({id:'ash',side:'blue',p:p(0,0),plan:[{kind:'move',
 id:7,p:p(30,0)}],squeeze:false,doorTraversal:null,traversal:null,
 traversalPending:null,lastBlocker:'furniture',blockedTime:.3});

test('D3.17C: backward-only portal stages have a longer recurrence guard',()=>{
 const a=actor(),goal=p(30,0),retreat=[p(-4,0)];
 assert.equal(allowPhysicalRouteReissue(a,'door-rehearsal',goal,retreat,0,'D:6'),true);
 assert.equal(allowPhysicalRouteReissue(a,'door-rehearsal',goal,retreat,3,'D:6'),true);
 assert.equal(allowPhysicalRouteReissue(a,'door-rehearsal',goal,retreat,6,'D:6'),false);
 assert.equal(allowPhysicalRouteReissue(a,'door-rehearsal',goal,retreat,9,'D:6'),false);
 assert.equal(allowPhysicalRouteReissue(a,'door-rehearsal',goal,retreat,19,'D:6'),true);
});
test('D3.17C: goal-reaching portal and changed hinge remain independently permitted',()=>{
 const a=actor(),goal=p(30,0);
 for(let t=0;t<4;t++)assert.equal(allowPhysicalRouteReissue(
  a,'door-rehearsal',goal,[goal],t,'D:6'),t<3);
 assert.equal(allowPhysicalRouteReissue(
  a,'door-rehearsal',goal,[p(-4,0)],4,'D:7'),true);
});
test('D3.17C: only distinct real recurrent furniture collisions earn two cold attempts',()=>{
 const a=actor(),goal=p(30,0),next=p(10,0);
 assert.equal(claimRepeatedFurnitureDeparture(a,goal,next,1),false);
 assert.equal(claimRepeatedFurnitureDeparture(a,goal,next,1.05),false);
 assert.equal(claimRepeatedFurnitureDeparture(a,goal,next,2),false);
 assert.equal(claimRepeatedFurnitureDeparture(a,goal,next,3),true);
 assert.equal(claimRepeatedFurnitureDeparture(a,goal,next,4),false);
 assert.equal(claimRepeatedFurnitureDeparture(a,goal,next,6.6),true);
 assert.equal(claimRepeatedFurnitureDeparture(a,goal,next,11),false);
 a.plan[0].id=8;
 assert.equal(claimRepeatedFurnitureDeparture(a,goal,next,12),false);
});
test('D3.17C: physical departure requires the full-size motor sweep, not endpoint alone',()=>{
 const from=p(0,0),goal=p(10,0),route=[p(5,0),goal];
 const sweep=(a,b)=>!(a.x<2.1&&b.x>=2.1&&Math.abs(b.y)<1);
 const selected=selectMotorVerifiedFurnitureDeparture(from,goal,route,
  sweep,()=>[]);
 assert.ok(selected.length>2,'should choose a swept first sidestep');
 assert.deepEqual(selected.at(-1),goal);
});
test('D3.17C: no candidate when every microstride or final GO is blocked',()=>{
 assert.deepEqual(selectMotorVerifiedFurnitureDeparture(p(0,0),p(30,0),
  [p(10,0),p(30,0)],()=>false,()=>[]),[]);
 assert.deepEqual(selectMotorVerifiedFurnitureDeparture(p(0,0),p(30,0),
  [p(10,0),p(30,0)],()=>true,()=>[]),[]);
});
test('D3.17C: route search budget never exceeds four cold world searches',()=>{
 let searches=0;
 selectMotorVerifiedFurnitureDeparture(p(0,0),p(30,0),
  [p(10,0),p(30,0)],(a,b)=>Math.abs(b.x)>1,
  ()=>{searches++;return []});
 assert.ok(searches<=4);
});
