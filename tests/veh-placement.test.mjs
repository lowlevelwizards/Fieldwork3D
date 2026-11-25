import test from 'node:test';
import assert from 'node:assert/strict';
import {planVehiclePlacement} from '../src/worldgen/vehicle-placement.ts';
import {generateSite} from '../src/breach-site.ts';
import {VEHICLE_DIMENSIONS} from '../src/worldgen/vehicle-catalog.ts';
test('shadow planning does not mutate sites and uses deterministic rotated dimensions',()=>{
 for(const seed of [3,8,10,14,19,21]){
  const site=generateSite(seed,'large');
  const before=JSON.stringify(site);
  const a=planVehiclePlacement(site),b=planVehiclePlacement(site);
  assert.deepEqual(a,b);assert.equal(JSON.stringify(site),before);
  for(const v of a.vehicles){
   const [length,depth]=VEHICLE_DIMENSIONS[v.fixture];
   assert.deepEqual([v.w,v.h],v.orientation%2?[depth,length]:[length,depth]);
   assert.ok(site.exteriorZones.some(z=>z.kind==='parking'&&Math.abs(v.x-z.x)+v.w/2<=z.w/2&&Math.abs(v.y-z.y)+v.h/2<=z.h/2));
  }
 }
});
test('viable synthetic parking produces contextual cars, leaves capacity and reserves pedestrian approach',()=>{
 const site={seed:11,archetype:'motel',condition:'busy',entrySide:'south',bounds:{minX:0,minY:0,maxX:800,maxY:800},rooms:[{x:220,y:100,w:360,h:140}],doors:[],entrance:{x:400,y:240},spawn:[],enemies:[],objective:{x:400,y:170},extract:{x:400,y:750},cover:[],exteriorZones:[{id:'arrival-forecourt',kind:'parking',x:400,y:390,w:360,h:150}]};
 const a=planVehiclePlacement(site);
 assert.ok(a.vehicles.length>0);
 assert.ok(a.vehicles.length<5);
 for(const v of a.vehicles)assert.ok(Math.abs(v.x-400)>v.w/2+20);
});
