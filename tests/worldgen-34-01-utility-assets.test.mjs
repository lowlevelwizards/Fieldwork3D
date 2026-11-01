import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {propDefinition} from '../src/worldgen/asset-catalog.ts';
import {assetLibrary,assetLibraryProblems} from '../src/worldgen/asset-library.ts';
import {CANONICAL_ASSET_DIMENSIONS} from '../src/worldgen/world-scale.ts';
import {renderDetailedFixture} from '../src/worldgen/detailed-fixture-visuals.ts';
const all=['trash-bag','recycling-bin','tipped-trash-bin','mop-bucket',
 'step-ladder','fire-extinguisher','supply-cart','storage-tote'];
test('each new asset has canonical dimensions and live catalog provenance',()=>{
 const library=assetLibrary();
 for(const id of all){
  const asset=propDefinition(id);
  assert.ok(asset?.solid,id);
  assert.deepEqual([asset.width,asset.depth,asset.height],
   CANONICAL_ASSET_DIMENSIONS[id],id);
  assert.ok(library.some(x=>x.id===id&&x.presentation==='bespoke'),id);
 }
 assert.ok(!assetLibraryProblems().some(x=>all.some(id=>x.includes(id))));
});
test('every new asset renders distinct geometry within one shared renderer',()=>{
 const wood=new THREE.MeshStandardMaterial(),steel=new THREE.MeshStandardMaterial();
 const olive=new THREE.MeshStandardMaterial(),metal=new THREE.MeshStandardMaterial();
 const ctx={solid:()=>new THREE.MeshStandardMaterial(),box:(group,x,y,z,w,h,d,mat)=>{
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);
  mesh.position.set(x,y,z);group.add(mesh);return mesh;
 }};
 for(const id of all){
  const group=new THREE.Group(),asset=propDefinition(id);
  const o={x:0,y:0,w:asset.width,h:asset.depth,fixture:id};
  assert.equal(renderDetailedFixture(group,o,id,ctx,wood,steel,olive,metal),true,id);
  assert.ok(group.children.length>=3,id+' has insufficient silhouette detail');
 }
});
