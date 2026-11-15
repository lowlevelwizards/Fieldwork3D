import test from 'node:test';
import assert from 'node:assert/strict';
import {coldSweptDoorWaypointJoin} from '../src/breach-d317d-door-route-join.ts';
const pt=(x,y)=>({x,y});
const from=pt(0,0),goal=pt(110,40),original=[pt(60,0),goal];
test('D3.17D: physically verified rejoin preserves remote authored GO',()=>{
 const search=()=>[pt(20,15),pt(40,15),pt(60,0)];
 const result=coldSweptDoorWaypointJoin(from,goal,original,
  [pt(-10,-5),pt(-10,20)],search,()=>true);
 assert.deepEqual(result,[...search(),goal]);
});
test('D3.17D: fallback joins existing route only after a swept portal stage',()=>{
 let calls=0;
 const search=(a)=>{calls++;return a.x<0?
  [pt(35,20),pt(60,0)]:[];};
 const stage=[pt(-10,-5),pt(-10,20)];
 const result=coldSweptDoorWaypointJoin(from,goal,original,stage,
  search,()=>true);
 assert.deepEqual(result,[...stage,pt(35,20),pt(60,0),goal]);
 assert.equal(calls,2,'at most two cold world probes');
});
test('D3.17D: never accepts a route violating a real microstride',()=>{
 const sweep=(a,b)=>!(a.x<9.9&&b.x>=9.9&&Math.abs(b.y)<1);
 const search=()=>[pt(60,0)];
 const result=coldSweptDoorWaypointJoin(from,goal,original,[],search,sweep);
 assert.deepEqual(result,[]);
});
test('D3.17D: must reach the exact disposable route join; no fake GO',()=>{
 assert.deepEqual(coldSweptDoorWaypointJoin(from,goal,original,[],
  ()=>[pt(45,0)],()=>true),[]);
 assert.deepEqual(coldSweptDoorWaypointJoin(from,goal,[pt(60,0)],[],
  ()=>[pt(60,0)],()=>true),[]);
 assert.deepEqual(coldSweptDoorWaypointJoin(from,goal,[pt(60,0),pt(109,40)],[],
  ()=>[pt(60,0)],()=>true),[pt(60,0),pt(109,40)]);
});
test('D3.17D: rejected unsafe stage does not trigger second search',()=>{
 let calls=0;
 const result=coldSweptDoorWaypointJoin(from,goal,original,
  [pt(10,0)],()=>{calls++;return []},()=>false);
 assert.deepEqual(result,[]);
 assert.equal(calls,1);
});
test('D3.17D: never joins an implausibly long portal route',()=>{
 const search=()=>[pt(-90,80),pt(-90,0),pt(60,0)];
 assert.deepEqual(coldSweptDoorWaypointJoin(from,goal,original,[],
  search,()=>true),[]);
});
