import test from 'node:test';
import assert from 'node:assert/strict';
import {rehearseDoorLeafBypass,ownsDoorManeuverRoute}
 from '../src/breach-door-traversal-maneuver.ts';
import {doorLeafSegment} from '../src/breach-core.ts';
import {sweptBodyClear} from '../src/breach-navigation.ts';
const p=(x,y)=>({x,y});
const door=(hinge='a',swing=1)=>({
 id:'ENTRY',a:p(290,260),b:p(332,260),kind:'hinged',
 hinge,swing,open:true,openFraction:1,openedAt:0
});
const world={passable:()=>true};
test('D2 rehearsed footwork is deterministic and never ignores real leaf sweep',()=>{
 for(const hinge of ['a','b'])for(const swing of [-1,1]){
  const d=door(hinge,swing),from=p(303,232),goal=p(307,354);
  let queries=0;
  const clear=(a,b)=>{queries++;return sweptBodyClear(a,b,[d],8,world)};
  const snapshot=structuredClone(d);
  const route=rehearseDoorLeafBypass(from,goal,d,clear);
  assert.deepEqual(route,rehearseDoorLeafBypass(from,goal,d,
   (a,b)=>sweptBodyClear(a,b,[d],8,world)));
  assert.ok(queries<=16,'fixed maneuvers must have a bounded probe budget');
  let previous=from;
  for(const point of route){
   assert.ok(clear(previous,point),'body cannot pass through hinge/leaf');
   previous=point;
  }
  assert.deepEqual(d,snapshot,'planning must not move the door');
 }
});
test('D2 no remote maneuver, closed-door bypass, or fake clearance',()=>{
 const d=door();
 assert.deepEqual(rehearseDoorLeafBypass(p(120,100),p(310,350),d,
  ()=>true),[]);
 assert.deepEqual(rehearseDoorLeafBypass(p(305,232),p(310,350),
  {...d,open:false},()=>true),[]);
 assert.deepEqual(rehearseDoorLeafBypass(p(305,232),p(310,350),d,
  ()=>false),[]);
 assert.deepEqual(rehearseDoorLeafBypass(p(305,232),p(305,220),d,
  ()=>true),[]);
});
test('D2 route ownership is stable during consumption, not other movement',()=>{
 const e={maneuver:'outside-leaf',waypoints:[p(300,230),p(320,300)]};
 const a={doorTraversal:e,nav:[p(300,230),p(320,300)]};
 assert.equal(ownsDoorManeuverRoute(a),true);
 a.nav.shift();assert.equal(ownsDoorManeuverRoute(a),true);
 a.nav=[p(390,400)];assert.equal(ownsDoorManeuverRoute(a),false);
});
