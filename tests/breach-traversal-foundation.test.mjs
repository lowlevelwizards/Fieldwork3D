import test from 'node:test';
import assert from 'node:assert/strict';
import {WALLS,COVER,activateSite,passable} from '../src/breach-core.ts';
import {traversalSurface} from '../src/breach-traversal-surfaces.ts';
import {intelPassable} from '../src/breach-intel.ts';
import {sweptBodyClear,sweptProfileClear,squeezeFacing,SQUEEZE_RADIUS}
 from '../src/breach-navigation.ts';
import {routeWithSqueezeIntel} from '../src/breach-squeeze-route.ts';
import {autoShoveLightCover} from '../src/breach-movable-cover.ts';
import {diagnoseMovement} from '../src/breach-nav-diagnostics.ts';
const box=(x,y,w,h,fixture,low=true)=>({x,y,w,h,fixture,low});
const visibleIntel=()=>({
 mode:'full-view',walls:new Set(WALLS.map((_,i)=>i)),
 cover:new Set(COVER.map((_,i)=>i)),doors:new Set(),rooms:new Set(),
 doorMemory:new Map()
});
test('ankle-high pallet and parking stop are foot-passable in both authorities',()=>{
 const originals=[...COVER];
 try{
  COVER.splice(0,COVER.length,box(200,190,56,42,'pallet'),
    box(300,190,38,9,'parking-block'));
  assert.equal(traversalSurface(COVER[0]),'step-over');
  assert.equal(traversalSurface(COVER[1]),'step-over');
  for(const p of [{x:200,y:190},{x:300,y:190}]){
   assert.equal(passable(p),true);
   assert.equal(intelPassable(p,visibleIntel()),true);
  }
  assert.equal(diagnoseMovement({x:190,y:190},{x:210,y:190},[],[]).blocker,'clear');
 }finally{COVER.splice(0,COVER.length,...originals);}
});
test('low cover label never makes a window, half-wall or crate walkable',()=>{
 const originals=[...COVER];
 try{
  for(const fixture of ['window-sill','glass-barrier','half-wall','crate']){
   COVER.splice(0,COVER.length,box(200,190,32,12,fixture));
   assert.notEqual(traversalSurface(COVER[0]),'step-over');
   assert.equal(passable({x:200,y:190}),false,fixture);
   assert.equal(intelPassable({x:200,y:190},visibleIntel()),false,fixture);
  }
 }finally{COVER.splice(0,COVER.length,...originals);}
});
test('narrow torso squeezes through an actual gap where full body cannot',()=>{
 const savedWalls=[...WALLS],savedCover=[...COVER];
 try{
  WALLS.splice(0,WALLS.length,
   {a:{x:92,y:85},b:{x:92,y:210}},
   {a:{x:108,y:85},b:{x:108,y:210}});
  COVER.splice(0,COVER.length);
  const a={x:100,y:100},b={x:100,y:180};
  assert.equal(sweptBodyClear(a,b,[]),false);
  assert.ok(SQUEEZE_RADIUS>=3.4&&SQUEEZE_RADIUS<=4.4);
  const angle=squeezeFacing(Math.atan2(b.y-a.y,b.x-a.x));
  assert.equal(sweptProfileClear(a,b,[],angle,'squeeze'),true);
  const route=routeWithSqueezeIntel(visibleIntel(),a,b);
  assert.deepEqual(route.at(-1),b);
  assert.ok(route.length<=2,'should not loop around a reachable tight gap');
 }finally{
  WALLS.splice(0,WALLS.length,...savedWalls);
  COVER.splice(0,COVER.length,...savedCover);
 }
});
test('auto-shove moves only eligible light furniture using a real clear sweep',()=>{
 const chair=box(120,120,24,24,'chair');
 const obstacles=[chair];
 const hit=autoShoveLightCover(obstacles,{x:99,y:120},{x:102,y:120},
   [],[],[]);
 assert.equal(hit,0);
 assert.ok(obstacles[0].x>120&&obstacles[0].x<=138);
 assert.equal(autoShoveLightCover([box(120,120,24,24,'fridge')],
   {x:99,y:120},{x:102,y:120},[],[],[]),null);
 assert.equal(autoShoveLightCover([box(120,120,38,9,'parking-block')],
   {x:95,y:120},{x:99,y:120},[],[],[]),null,
   'ankle-high stepping is not a furniture shoving action');
});
test('surrounded loose clutter topples in place; fixed furniture stays solid',()=>{
 const barriers=[
  {a:{x:132,y:85},b:{x:132,y:155}},
  {a:{x:85,y:108},b:{x:155,y:108}},
  {a:{x:85,y:132},b:{x:155,y:132}}
 ];
 const obstacles=[box(120,120,24,24,'chair')];
 assert.equal(autoShoveLightCover(obstacles,{x:99,y:120},{x:102,y:120},
   barriers,[],[]),0);
 assert.equal(obstacles[0].x,120);
 assert.equal(obstacles[0].toppled,true);
 const fixed=[box(120,120,24,24,'fridge')];
 assert.equal(autoShoveLightCover(fixed,{x:99,y:120},{x:102,y:120},
   barriers,[],[]),null);
 assert.equal(fixed[0].toppled,undefined);
});

test('a true impossibly narrow gap remains an obstacle, not a ghost shortcut',()=>{
 const savedWalls=[...WALLS],savedCover=[...COVER];
 try{
  WALLS.splice(0,WALLS.length,
   {a:{x:96,y:85},b:{x:96,y:210}},
   {a:{x:104,y:85},b:{x:104,y:210}});
  COVER.splice(0,COVER.length);
  const a={x:100,y:100},b={x:100,y:180};
  const sideways=squeezeFacing(Math.PI/2);
  assert.equal(sweptProfileClear(a,b,[],sideways,'squeeze'),false);
  assert.equal(routeWithSqueezeIntel(visibleIntel(),a,b).length,0,
   'route planner must not invent a path through solid walls');
 }finally{
  WALLS.splice(0,WALLS.length,...savedWalls);
  COVER.splice(0,COVER.length,...savedCover);
 }
});
