import test from 'node:test';
import assert from 'node:assert/strict';
import {shouldProbeCircularFullBodyLane,alternateFullBodyLaneFromCycle,
 noteCircularWorldRoute,ownsCircularWorldRoute}
 from '../src/breach-cycle-lane-recovery.ts';
const p=(x,y)=>({x,y});
test('D3.14C2: three physically repeated lane choices require cold alternative',()=>{
 const a={p:p(494,498),squeeze:false,plan:[{kind:'move',id:81,
  p:p(133,340)}]};
 const goal=p(133,340);
 assert.equal(shouldProbeCircularFullBodyLane(a,goal,'FRONT',1),false);
 a.p=p(494.5,497.7);
 assert.equal(shouldProbeCircularFullBodyLane(a,goal,'FRONT',2),false);
 assert.equal(shouldProbeCircularFullBodyLane(a,goal,'FRONT',3),true);
 assert.equal(shouldProbeCircularFullBodyLane(a,goal,'FRONT',4),false,
  'unchanged failed cycle cannot repeatedly consume expensive A*');
 noteCircularWorldRoute(a,3);
 assert.equal(ownsCircularWorldRoute(a,5),true);
 assert.equal(ownsCircularWorldRoute(a,7),false);
 a.p=p(535,498);
 assert.equal(shouldProbeCircularFullBodyLane(a,goal,'FRONT',8),false,
  'real departure starts a fresh physical evidence episode');
 a.plan[0]={kind:'move',id:82,p:p(133,340)};
 assert.equal(shouldProbeCircularFullBodyLane(a,goal,'FRONT',9),false);
});

test('D3.14C2: only swept opposite-side stage joined to original GO',()=>{
 const from=p(494,498),goal=p(133,340),old=p(460,500);
 let calls=0;
 const route=alternateFullBodyLaneFromCycle(from,goal,old,
  ()=>true,(stage,g)=>{calls++;return [p(500,448),{...g}];});
 assert.equal(calls,2,'two cold world-route alternatives is the cap');
 assert.ok(route.length===3);
 assert.ok(route[0].x>from.x,'escape starts AWAY from the circular left detour');
 assert.deepEqual(route.at(-1),goal,'cannot replace the authored destination');
});

test('D3.14C2: physically blocked or incomplete alternate route is refused',()=>{
 const from=p(494,498),goal=p(133,340),old=p(460,500);
 assert.deepEqual(alternateFullBodyLaneFromCycle(from,goal,old,
  ()=>false,()=>[goal]),[],'solid full-body walls never pass');
 assert.deepEqual(alternateFullBodyLaneFromCycle(from,goal,old,
  ()=>true,()=>[p(500,450)]),[],'no short fake goal');
});
