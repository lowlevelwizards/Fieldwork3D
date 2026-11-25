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

import {proposeVehicleParkingLayout,proposedVehicleParkingSite} from '../src/worldgen/vehicle-parking-layout.ts';
import {parkingStallCandidates} from '../src/worldgen/parking-stalls.ts';
import {planPropertySurfaces} from '../src/worldgen/property-surfaces.ts';
test('shallow private parking uses parallel vehicles and one real clear aisle, with matching markings',()=>{
 const site={seed:11,archetype:'motel',condition:'busy',entrySide:'south',bounds:{minX:0,minY:0,maxX:800,maxY:800},rooms:[{x:160,y:130,w:480,h:170}],doors:[],entrance:{x:400,y:300},spawn:[],enemies:[],objective:{x:400,y:170},extract:{x:400,y:750},cover:[],exteriorZones:[{id:'arrival-forecourt',kind:'parking',x:400,y:370,w:440,h:124}]};
 const zone=site.exteriorZones[0],p=proposeVehicleParkingLayout(site,zone);
 assert.equal(p.mode,'parallel');assert.equal(p.aisleDepth,48);
 const next=proposedVehicleParkingSite(site),z=next.exteriorZones[0];
 const slots=parkingStallCandidates(z,96,39);
 assert.ok(slots.length>=2);assert.ok(slots.every(v=>v.orientation===0&&v.w===96&&v.h===39));
 const marks=planPropertySurfaces(next).filter(m=>m.kind==='parking-divider');
 assert.equal(marks.length,p.count+1);
 for(const v of slots){
  assert.ok(Math.abs(v.y-p.aisleCenter)>=(v.h+p.aisleDepth)/2);
  assert.ok(marks.every(m=>Math.abs(m.x-v.x)>v.w/2));
 }
 assert.equal(site.exteriorZones[0].vehicleParking,undefined);
 assert.ok(planVehiclePlacement(next).vehicles.length>0);
});
test('insufficient private depth fails closed',()=>{
 const site={seed:1,entrySide:'south',bounds:{minX:0,minY:0,maxX:400,maxY:450},rooms:[{x:50,y:80,w:300,h:270}],doors:[],entrance:{x:200,y:350},exteriorZones:[{id:'arrival-forecourt',kind:'parking',x:200,y:390,w:280,h:70}]};
 assert.equal(proposeVehicleParkingLayout(site,site.exteriorZones[0]),null);
});

import {intersectsVehicleParkingReserve} from '../src/worldgen/vehicle-parking-layout.ts';
import {auditTacticalMobility} from '../src/worldgen/tactical-mobility-audit.ts';
import {passable,route,withTemporarySiteGeometry} from '../src/breach-core.ts';
test('opt-in generation retains deterministic navigation and keeps original default retired',()=>{
 for(const seed of [3,5,6,8,10,14,19,21]){
  const legacy=generateSite(seed,'large');
  assert.ok(!legacy.cover.some(o=>o.fixture in VEHICLE_DIMENSIONS));
  const site=generateSite(seed,'large',undefined,{}, {vehiclePlacement:true});
  assert.deepEqual(site,generateSite(seed,'large',undefined,{}, {vehiclePlacement:true}));
  const vehicles=site.cover.filter(o=>o.fixture in VEHICLE_DIMENSIONS);
  if(vehicles.length){
   const baseline={...site,cover:site.cover.filter(o=>!(o.fixture in VEHICLE_DIMENSIONS))};
   assert.deepEqual(auditTacticalMobility(site).issues,auditTacticalMobility(baseline).issues);
   assert.ok(withTemporarySiteGeometry(site,()=>site.spawn.every(p=>passable(p))&&route(site.spawn[0],site.objective).length>0));
   for(const v of vehicles)assert.ok(site.exteriorZones.some(z=>z.vehicleParking&&intersectsVehicleParkingReserve(z,v)));
  }
 }
});

import {proposeResidentialDriveway} from '../src/worldgen/vehicle-parking-layout.ts';
import {planPublicStreet} from '../src/worldgen/public-street-layout.ts';
test('residential driveway preserves a separate yard and moves the curb cut away from the front door',()=>{
 const front={id:'arrival-forecourt',kind:'yard',x:400,y:395,w:300,h:176};
 const site={seed:11,archetype:'house',condition:'occupied',entrySide:'south',bounds:{minX:0,minY:0,maxX:800,maxY:800},rooms:[{x:250,y:130,w:300,h:170}],doors:[],entrance:{x:400,y:300},spawn:[],enemies:[],objective:{x:400,y:170},extract:{x:400,y:750},cover:[],exteriorZones:[front]};
 const plan=proposeResidentialDriveway(site,front);
 assert.ok(plan);assert.equal(plan.driveway.vehicleParking.role,'residential');
 assert.equal(plan.yard.w+plan.driveway.w,front.w);
 const next={...site,exteriorZones:[plan.yard,plan.driveway]};
 const street=planPublicStreet(next);assert.equal(street.curbRamp.x,plan.driveway.x);
 assert.ok(Math.abs(street.curbRamp.x-site.entrance.x)>80);
 assert.equal(planVehiclePlacement(next,11,true).vehicles.length,1);
});
test('wide industrial forecourt has actual loading bays that fit commercial trucks',()=>{
 const zone={id:'arrival-forecourt',kind:'driveway',x:400,y:410,w:470,h:204};
 const site={seed:9,archetype:'warehouse',entrySide:'south',bounds:{minX:0,minY:0,maxX:850,maxY:850},rooms:[{x:165,y:130,w:470,h:170}],doors:[],entrance:{x:400,y:300},spawn:[],enemies:[],objective:{x:400,y:170},extract:{x:400,y:800},cover:[],exteriorZones:[zone]};
 const plan=proposeVehicleParkingLayout(site,zone);assert.equal(plan.role,'loading');
 const next={...site,exteriorZones:[{...zone,vehicleParking:plan}]};
 assert.ok(parkingStallCandidates(next.exteriorZones[0],128,48).length>0);
 assert.ok(planPropertySurfaces(next).some(m=>m.kind==='loading-zone'));
 assert.ok(planVehiclePlacement(next,9,true).vehicles.length>0);
});
