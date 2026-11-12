import test from 'node:test';
import assert from 'node:assert/strict';
import {doorLeafBypass} from '../src/breach-door-leaf-bypass.ts';
import {sweptBodyClear} from '../src/breach-navigation.ts';
const pt=(x,y)=>({x,y});
const base=()=>({id:'OUT',a:pt(0,0),b:pt(40,0),
 kind:'hinged',hinge:'a',swing:1,open:true,openedAt:0,
 openFraction:1});
test('R7.2b outside leaf chooses three physically swept waypoints around free tip',()=>{
 const door=base(),from=pt(-13,-20),goal=pt(18,25);
 const clear=(a,b)=>sweptBodyClear(a,b,[door]);
 assert.equal(clear(from,goal),false,'direct route intersects real panel');
 const authored={id:41,kind:'move',p:{...goal},aimMode:'fixed',facing:1.4};
 const unchanged=structuredClone(authored);
 const detour=doorLeafBypass(from,goal,door,clear);
 assert.equal(detour.length,3,'must go around free edge, not teleport');
 assert.deepEqual(detour.at(-1),goal);
 let last=from;
 for(const point of detour){
  assert.ok(clear(last,point),
   'every segment of the detour must pass a real full-radius sweep');
  last=point;
 }
 assert.deepEqual(authored,unchanged,'temporary footwork never changes LOOK');
 assert.deepEqual(door,base(),'planning does not move or reverse the leaf');
});
test('R7.2b refuse closed, jammed or impossible physical bypasses',()=>{
 const door=base(),from=pt(-13,-20),goal=pt(18,25);
 assert.deepEqual(doorLeafBypass(from,goal,{...door,open:false},
  ()=>true),[]);
 assert.deepEqual(doorLeafBypass(from,goal,{...door,openFraction:.1},
  ()=>false),[]);
 assert.deepEqual(doorLeafBypass(from,goal,door,()=>false),[],
  'no collision override when the real route is obstructed');
});
