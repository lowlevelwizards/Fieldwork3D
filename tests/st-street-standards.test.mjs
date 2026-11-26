import test from 'node:test';
import assert from 'node:assert/strict';
import {STREET_DIMENSIONS as D,STREET_SECTIONS,streetKindFor} from '../src/worldgen/street-standards.ts';
import {VEHICLE_DIMENSIONS} from '../src/worldgen/vehicle-catalog.ts';
test('street standards respect existing vehicle and pedestrian scale',()=>{
 for(const [f,[length,width]] of Object.entries(VEHICLE_DIMENSIONS)){
  assert.ok(width<D.serviceLane.min,f);
  assert.ok(width+8<=D.loading.width);
  assert.ok(length+6<=D.loading.length);
 }
 assert.ok(D.parking.width>=VEHICLE_DIMENSIONS.suv[1]+8);
 assert.ok(D.parking.length>=VEHICLE_DIMENSIONS.pickup[0]+4);
 assert.ok(D.parallel.length>D.parking.length);
 assert.ok(D.aisle.twoWay>=D.lane.min*1.8);
 assert.ok(D.sidewalk.min>=D.pedestrianClear);
 for(const s of Object.values(STREET_SECTIONS))assert.ok(s.laneWidth>=D.serviceLane.min);
});
test('street types deterministic and archetype aware',()=>{
 assert.equal(streetKindFor('warehouse',7),'industrial');
 assert.equal(streetKindFor('clinic',7),'suburban');
 assert.equal(streetKindFor('office',7),'commercial');
 assert.equal(streetKindFor('house',5),'rural');
 assert.equal(streetKindFor('townhouse',5),'residential');
});
