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

import * as THREE from 'three';
import {renderVehicleFixture,acquireVehicleTemplate,createVehicleMaterial} from '../src/worldgen/vehicle-visual.ts';
import {StaticVisualTemplateLibrary} from '../src/rendering/fieldwork-visual-template-library.ts';
import {propDefinition} from '../src/worldgen/asset-catalog.ts';
test('shared scene preview and cached vehicle mesh agree; cache owns one geometry',()=>{
 const cache=new StaticVisualTemplateLibrary();
 const mat=createVehicleMaterial();
 try{
  for(const family of VEHICLE_FAMILIES){
   const asset=propDefinition(family);assert.ok(asset);
   assert.deepEqual([asset.width,asset.depth,asset.height],VEHICLE_DIMENSIONS[family]);
   const c={x:4,y:6,w:asset.width,h:asset.depth,fixture:family,artVariant:2};
   const group=new THREE.Group();
   assert.equal(renderVehicleFixture(group,c,0,()=>mat),true);
   const a=acquireVehicleTemplate(cache,c,0,()=>mat),b=acquireVehicleTemplate(cache,c,0,()=>mat);
   assert.ok(a&&b);assert.equal(group.children.length,1);
   const model=group.children[0],cached=a.root.children[0];
   assert.equal(cached.geometry,b.root.children[0].geometry);
   assert.deepEqual(cached.position.toArray(),model.position.toArray());
   assert.deepEqual(cached.geometry.getAttribute('position').array,model.geometry.getAttribute('position').array);
   model.geometry.dispose();a.release();b.release();
  }
  assert.equal(cache.stats().geometries,6);
  assert.equal(cache.stats().leases,0);
 }finally{cache.clear();mat.dispose();}
});

import {materialForFixture} from '../src/breach-materials.ts';
import {fixturePixelSurface} from '../src/worldgen/pixel-surface-selection.ts';
test('all vehicle families share metal physical and visual substrate contracts',()=>{
 for(const family of ['vehicle',...VEHICLE_FAMILIES]){
  assert.equal(materialForFixture(family),'sheet-metal');
  assert.equal(fixturePixelSurface(family),'metal');
 }
});

import {damageCover} from '../src/breach-reactive-cover.ts';
import {traversalSurface} from '../src/breach-traversal-surfaces.ts';
test('static vehicles keep their footprint under generic furniture collapse',()=>{
 for(const family of ['vehicle',...VEHICLE_FAMILIES]){
  const asset=propDefinition(family),c={x:0,y:0,w:asset.width,h:asset.depth,fixture:family};
  const before={...c};
  assert.equal(damageCover(c,100), 'immune');
  assert.deepEqual(c,before);assert.equal(traversalSurface(c),'solid');
 }
});

import {coverImpactFraction} from '../src/breach-cover-height.ts';
test('new vehicle cover follows coarse shared body and roof; archived box behavior is unchanged',()=>{
 const car={x:0,y:0,w:96,h:39,fixture:'sedan',vehicleProfile:{version:1,configuration:'civilian'}};
 const through=(x,z,c=car)=>coverImpactFraction({x,y:-50},{x,y:50},z,z,c);
 assert.notEqual(through(0,27),null);
 assert.equal(through(40,27),null);
 assert.notEqual(through(40,10),null);
 const {vehicleProfile,...legacy}=car;
 assert.notEqual(through(40,27,legacy),null);
 const rotated={...car,w:39,h:96,orientation:1};
 assert.equal(coverImpactFraction({x:-50,y:-40},{x:50,y:-40},27,27,rotated),null);
 assert.notEqual(coverImpactFraction({x:-50,y:0},{x:50,y:0},27,27,rotated),null);
});
