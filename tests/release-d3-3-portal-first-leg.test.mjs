import test from 'node:test';
import assert from 'node:assert/strict';
import {routeToNextOperableDoor,routeWithSqueezeWorld}
 from '../src/breach-squeeze-route.ts';
import {sweptBodyClear} from '../src/breach-navigation.ts';
const p=(x,y)=>({x,y});
const world={bounds:{minX:0,minY:0,maxX:256,maxY:256},
 passable:(at,r=8)=>at.x>=13&&at.x<=243&&at.y>=20&&at.y<=243};
const door=(id,x)=>({id,a:p(x,40),b:p(x,216),kind:'hinged',
 hinge:'a',swing:-1,open:false,openFraction:0,
 openedAt:-1,locked:false,wedged:false,jammed:false,heldBy:null});
test('D3.3: route stages exactly one solid door contact using actual swept-safe prefix',()=>{
 const doors=[door('D1',128),door('D2',176)];
 const from=p(96,128),goal=p(208,128);
 assert.deepEqual(routeWithSqueezeWorld(from,goal,doors,world),[]);
 const staged=routeToNextOperableDoor(from,goal,doors,world);
 assert.ok(staged.length>0,'operable first leaf should admit a route approach');
 assert.ok(!sweptBodyClear(from,staged.at(-1),doors,8,world),
   'last segment is an intentional solid contact, NOT a movement exemption');
 let previous=from;
 for(const point of staged.slice(0,-1)){
   assert.ok(sweptBodyClear(previous,point,doors,8,world),
    'all previous route legs are already physically swept clear');
   previous=point;
 }
 assert.ok(staged.at(-1).x<=176,
   'never jump directly beyond the second closed portal');
 assert.deepEqual(doors.map(d=>d.openFraction),[0,0],
   'route probe does not mutate hinge physics');
});
test('D3.3: locked, wedged and held leaf never becomes a pass-through portal',()=>{
 const from=p(96,128),to=p(160,128);
 for(const state of [{locked:true},{wedged:true},{heldBy:'ash'},{jammed:true}]){
   const blocked={...door('D1',128),...state};
   assert.deepEqual(routeToNextOperableDoor(from,to,[blocked],world),[]);
 }
});
test('D3.3: same path is never emitted when no door needs opening',()=>{
 assert.deepEqual(routeToNextOperableDoor(p(96,128),p(160,128),[],world),[]);
});
