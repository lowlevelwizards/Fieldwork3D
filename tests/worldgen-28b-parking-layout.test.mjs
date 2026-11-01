import test from 'node:test';
import assert from 'node:assert/strict';
import {parkingStallCandidates,parkingStallCount,PARKING_VEHICLES}
 from '../src/worldgen/parking-stalls.ts';
import {addExteriorProperty} from '../src/worldgen/exterior-sites.ts';
import {planPropertySurfaces} from '../src/worldgen/property-surfaces.ts';

const zone={id:'arrival-forecourt',kind:'parking',x:350,y:500,w:222,h:118};
test('parking bodies rotate with their footprints and align between marked bays',()=>{
 const spots=parkingStallCandidates(zone,61,30);
 assert.equal(parkingStallCount(zone),3);
 assert.equal(spots.length,3);
 assert.ok(spots.every(p=>p.w===30&&p.h===61&&p.orientation===1));
 const another=parkingStallCandidates({...zone,w:118,h:222},61,30);
 assert.ok(another.every(p=>p.w===61&&p.h===30&&p.orientation===0));
 const s={doors:[{id:'FRONT',a:{x:326,y:430},b:{x:374,y:430}}],
  entrySide:'south',entrance:{x:350,y:430},exteriorZones:[zone]};
 const dividers=planPropertySurfaces(s).filter(m=>m.kind==='parking-divider');
 assert.equal(dividers.length,2);
 assert.ok(spots.every(p=>dividers.every(m=>Math.abs(p.x-m.x)>14)));
});
test('real exterior parking uses marked stalls without obstructing front access',()=>{
 const site={seed:21,archetype:'clinic',entrySide:'south',
  rooms:[{id:'R',kind:'room',purpose:'waiting',x:225,y:230,w:250,h:200}],
  bounds:{minX:0,minY:0,maxX:700,maxY:700},cover:[],doors:[
   {id:'FRONT',a:{x:326,y:430},b:{x:374,y:430}}],
  entrance:{x:350,y:430},spawn:[],enemies:[],
  objective:{x:-50,y:-50},extract:{x:-50,y:-50}};
 const a=addExteriorProperty(site,21),b=addExteriorProperty(site,21);
 assert.deepEqual(a.cover,b.cover);
 const parking=a.exteriorZones.find(z=>z.id==='arrival-forecourt');
 const cars=a.cover.filter(o=>PARKING_VEHICLES.has(o.fixture)&&
  o.x>parking.x-parking.w/2&&o.x<parking.x+parking.w/2&&
  o.y>parking.y-parking.h/2&&o.y<parking.y+parking.h/2);
 assert.ok(cars.length>=1);
 for(const car of cars){
  const dimensions=car.orientation===1?{width:car.h,depth:car.w}:
   {width:car.w,depth:car.h};
  const slots=parkingStallCandidates(parking,dimensions.width,dimensions.depth);
  assert.ok(slots.some(p=>p.x===car.x&&p.y===car.y&&
   p.w===car.w&&p.h===car.h&&p.orientation===car.orientation));
 }
});
