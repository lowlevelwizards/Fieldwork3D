import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {route} from '../src/breach-core.ts';
import {routeWithIntel,knownFurnitureBlocksSnappedStart} from '../src/breach-intel.ts';
const windowSill={x:602,y:305.5,w:10,h:52};
function passableWithSill(p,r=8,sill=windowSill){
 return p.x>24+r&&p.x<720-r&&p.y>24+r&&p.y<690-r&&
  !(Math.abs(p.x-sill.x)<sill.w/2+r&&
    Math.abs(p.y-sill.y)<sill.h/2+r);
}
function physicallyClear(a,b,canStand){
 const steps=Math.max(1,Math.ceil(Math.hypot(a.x-b.x,a.y-b.y)/2.5));
 for(let i=1;i<=steps;i++){
  const t=i/steps;
  if(!canStand({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t}))return false;
 }
 return true;
}
test('D3.2.10: legal actor beside seeded garage window sill can route from an obstructed snapped start',()=>{
 const from={x:613.07,y:339.61},goal={x:115,y:164};
 const canStand=p=>passableWithSill(p);
 const snap={x:Math.round(from.x/16)*16,y:Math.round(from.y/16)*16};
 assert.equal(canStand(from),true,'real actor body is legal');
 assert.equal(canStand(snap),false,'old A* snapped into the sill');
 const path=route(from,goal,canStand,true);
 assert.ok(path.length>0,'single A* must find a physical grid entry without teleporting');
 let prior=from;
 for(const point of path){
  assert.equal(physicallyClear(prior,point,canStand),true,
   'first and later route segments must remain physically clear');
  prior=point;
 }
 assert.deepEqual(path.at(-1),goal);
});
test('D3.2.10: mirrored furniture-edge starts still use fully swept anchors',()=>{
 const seeds=[{x:613.07,y:339.61},{x:590.93,y:339.61},
  {x:613.07,y:271.39},{x:590.93,y:271.39}];
 const goals=[{x:700,y:150},{x:500,y:150},
  {x:700,y:450},{x:500,y:450}];
 for(let i=0;i<seeds.length;i++){
  const from=seeds[i],goal=goals[i],canStand=p=>passableWithSill(p);
  assert.equal(canStand(from),true,'seed '+i+' has legal body');
  const path=route(from,goal,canStand,true);
  assert.ok(path.length>0,'expected feasible route seed '+i);
  assert.equal(physicallyClear(from,path[0],canStand),true,
   'first segment must be clear seed '+i);
 }
});
test('D3.2.10: impossible world remains impossible; no ghost start anchor',()=>{
 const canStand=p=>p.x>=300&&p.x<=390&&p.y>=300&&p.y<=390;
 const from={x:351,y:351},goal={x:100,y:100};
 assert.deepEqual(route(from,goal,canStand),[]);
});

test('D3.2.12: only known furniture routing opts into rescued grid starts',()=>{
 const collision=readFileSync(new URL('../src/breach-motor-collision.ts',import.meta.url),'utf8');
 assert.doesNotMatch(collision,/repairBlockedStart|a\.lastBlocker==='furniture'&&a\.blockedTime>=\.85/);
 const intel=readFileSync(new URL('../src/breach-intel.ts',import.meta.url),'utf8');
 assert.match(intel,/knownFurnitureBlocksSnappedStart\(intel,from,owner\)/);
 const core=readFileSync(new URL('../src/breach-core.ts',import.meta.url),'utf8');
 assert.match(core,/repairBlockedStart=false/);
});

test('D3.2.12: known sill enables start rescue but unknown sill never leaks into planning',()=>{
 const from={x:613.07,y:339.61},goal={x:115,y:164};
 const obstacle={...windowSill,id:'pt',fixture:'window-sill'};
 const world={
  bounds:{minX:0,minY:0,maxX:740,maxY:740},
  someWallNearPoint:()=>false,
  someCoverNearPoint(_p,_r,cb){return cb(obstacle,0);},
  passable:p=>passableWithSill(p)
 };
 const intel={mode:'full-view',walls:new Set(),doors:new Set(),
  cover:new Set([0]),rooms:new Set(),doorMemory:new Map()};
 assert.equal(knownFurnitureBlocksSnappedStart(intel,from,world),true);
 const path=routeWithIntel(intel,from,goal,world);
 assert.ok(path.length>0,'known furniture should have a legal start anchor');
 assert.equal(physicallyClear(from,path[0],p=>passableWithSill(p)),true);
 const unknown={...intel,cover:new Set()};
 assert.equal(knownFurnitureBlocksSnappedStart(unknown,from,world),false);
});
