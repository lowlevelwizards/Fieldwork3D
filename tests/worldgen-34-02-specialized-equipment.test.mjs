import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {propDefinition} from '../src/worldgen/asset-catalog.ts';
import {CANONICAL_ASSET_DIMENSIONS} from '../src/worldgen/world-scale.ts';
import {assetLibrary} from '../src/worldgen/asset-library.ts';
import {renderDetailedFixture} from '../src/worldgen/detailed-fixture-visuals.ts';
const ids=['ice-machine','chest-freezer','upright-freezer','refrigerated-display',
 'dish-rack','utility-sink','tool-rack','linen-cart'];
test('specialist fixtures have canonical collision and showroom definitions',()=>{
 const library=assetLibrary();
 for(const id of ids){
  const asset=propDefinition(id);
  assert.ok(asset?.solid,id);
  assert.ok(asset.rooms.length,id);
  assert.deepEqual([asset.width,asset.depth,asset.height],
   CANONICAL_ASSET_DIMENSIONS[id],id);
  assert.equal(library.find(a=>a.id===id)?.presentation,'bespoke',id);
 }
});
test('each new machine renders actual pieces in the shared renderer',()=>{
 const material=new THREE.MeshStandardMaterial();
 const ctx={solid:()=>material,box:(parent,x,y,z,w,h,d,mat)=>{
  const object=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);
  object.position.set(x,y,z);parent.add(object);return object;
 }};
 for(const id of ids){
  const asset=propDefinition(id),group=new THREE.Group();
  assert.ok(renderDetailedFixture(group,{x:0,y:0,w:asset.width,h:asset.depth,
   fixture:id},id,ctx,material,material,material,material),id);
  assert.ok(group.children.length>=3,id);
 }
});
