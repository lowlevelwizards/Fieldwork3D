import test from 'node:test';
import assert from 'node:assert/strict';
import {VEHICLE_FAMILIES,VEHICLE_DIMENSIONS,vehicleRecipe} from '../src/worldgen/vehicle-catalog.ts';
import {vehicleShape} from '../src/worldgen/vehicle-shape.ts';
import {buildVehicleGeometry} from '../src/worldgen/vehicle-model.ts';
test('vehicle identity has distinct silhouettes and stable physical proportions',()=>{
 const shapes=VEHICLE_FAMILIES.map(f=>JSON.stringify(vehicleShape(f).cabin));
 assert.equal(new Set(shapes).size,6);
 assert.equal(new Set(VEHICLE_FAMILIES.map(f=>VEHICLE_DIMENSIONS[f].join(':'))).size,6);
 for(const f of VEHICLE_FAMILIES){
  const geometry=buildVehicleGeometry(vehicleRecipe(f));
  assert.ok(geometry.getAttribute('position').count/3<=450);
  assert.equal(geometry.groups.length,0);
  geometry.dispose();
 }
});
