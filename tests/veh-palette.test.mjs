import test from 'node:test';
import assert from 'node:assert/strict';
import {VEHICLE_CONFIGURATIONS,VEHICLE_FAMILIES,VEHICLE_PAINTS,VEHICLE_PAINT_NAMES,vehicleRecipe} from '../src/worldgen/vehicle-catalog.ts';
import {vehiclePaintWeights,vehicleConfigWeights,chooseVehicleArt,allowedVehiclePaint} from '../src/worldgen/vehicle-palette.ts';
import {seeded} from '../src/worldgen/seeded-rng.ts';
import {buildVehicleGeometry} from '../src/worldgen/vehicle-model.ts';
test('all curated colorways have unique valid paint indices and fit one mesh budget',()=>{
 assert.equal(VEHICLE_PAINTS.length,VEHICLE_PAINT_NAMES.length);
 for(const family of VEHICLE_FAMILIES)for(const [c,configuration] of VEHICLE_CONFIGURATIONS[family].entries()){
  const weights=vehiclePaintWeights(family,configuration);
  assert.equal(new Set(weights.map(([i])=>i)).size,weights.length);
  for(const [i,w] of weights){
   assert.ok(w>0&&allowedVehiclePaint(family,configuration,i));
   const recipe=vehicleRecipe(family,c+i*VEHICLE_CONFIGURATIONS[family].length);
   assert.equal(recipe.configuration,configuration);assert.equal(recipe.paint,VEHICLE_PAINTS[i]);
   const g=buildVehicleGeometry(recipe);
   assert.ok(g.getAttribute('position').count/3<=450,family+':'+configuration+':'+i);g.dispose();
  }
 }
});
test('contextual deterministic selection respects allowed configurations and weights',()=>{
 for(const family of VEHICLE_FAMILIES)for(const context of [{archetype:'house',role:'residential'},{archetype:'clinic'},{archetype:'office'},{archetype:'warehouse',role:'loading'},{archetype:'utility',condition:'vacant'}]){
  const rng=seeded(7183),counts={};
  const weights=vehicleConfigWeights(family,context),total=weights.reduce((n,[,w])=>n+w,0);
  for(let i=0;i<4000;i++){const r=vehicleRecipe(family,chooseVehicleArt(family,context,rng));counts[r.configuration]=(counts[r.configuration]??0)+1;assert.ok(allowedVehiclePaint(family,r.configuration,VEHICLE_PAINTS.indexOf(r.paint)));}
  for(const [c,w] of weights){if(!w)assert.equal(counts[c]??0,0);else assert.ok(Math.abs((counts[c]??0)/4000-w/total)<.035,family+':'+c);}
 }
});
test('older encoded palette indices retain their original mapping',()=>{
 for(const family of VEHICLE_FAMILIES){const n=VEHICLE_CONFIGURATIONS[family].length;for(let i=0;i<12*n;i++)assert.deepEqual(vehicleRecipe(family,i),vehicleRecipe(family,i,true));}
});
