import test from 'node:test';
import assert from 'node:assert/strict';
import {VEHICLE_FAMILIES,VEHICLE_DIMENSIONS,VEHICLE_CONFIGURATIONS,vehicleRecipe,vehicleRecipeKey} from '../src/worldgen/vehicle-catalog.ts';
import {buildVehicleGeometry} from '../src/worldgen/vehicle-model.ts';
test('six canonical families and at least twenty deterministic configurations',()=>{
 assert.equal(VEHICLE_FAMILIES.length,6);
 assert.ok(Object.values(VEHICLE_CONFIGURATIONS).flat().length>=20);
 for(const family of VEHICLE_FAMILIES)assert.deepEqual(vehicleRecipe(family,17),vehicleRecipe(family,17));
});
test('all compiled models have one opaque geometry, finite attributes and bounded dimensions',()=>{
 for(const family of VEHICLE_FAMILIES)for(const configuration of VEHICLE_CONFIGURATIONS[family]){
  const recipe={...vehicleRecipe(family),configuration};
  const dimensions=VEHICLE_DIMENSIONS[family];
  const geo=buildVehicleGeometry(recipe);
  try{
   const p=geo.getAttribute('position'),c=geo.getAttribute('color'),n=geo.getAttribute('normal');
   assert.equal(p.count,c.count);assert.equal(p.count,n.count);
   assert.ok(p.count/3<=450,family+': '+p.count/3);
   for(const a of [p,c,n])assert.ok(a.array.every(Number.isFinite));
   const {min,max}=geo.boundingBox;
   assert.ok(min.x>=-dimensions[0]/2-.01&&max.x<=dimensions[0]/2+.01);
   assert.ok(min.z>=-dimensions[1]/2-.01&&max.z<=dimensions[1]/2+.01);
   assert.ok(min.y>=-.01&&max.y<=dimensions[2]+.01);
   assert.equal(geo.groups.length,0);
   assert.equal(vehicleRecipeKey(recipe,...dimensions),vehicleRecipeKey(recipe,...dimensions));
  }finally{geo.dispose();}
 }
});
