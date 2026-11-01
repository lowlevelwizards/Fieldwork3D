import test from 'node:test';import assert from 'node:assert/strict';
import * as THREE from 'three';
import {propCatalog} from '../src/worldgen/asset-catalog.ts';
import {assetLibrary,assetLibraryProblems} from '../src/worldgen/asset-library.ts';
import {assetReviewInventory} from '../src/worldgen/asset-review.ts';
import {renderFixtureVisual} from '../src/worldgen/fixture-visuals.ts';
test('every catalog fixture produces finite geometry at its real dimensions',()=>{
 const catalog=propCatalog(),materials=new Map();
 const solid=(hex)=>{if(!materials.has(hex))materials.set(hex,new THREE.MeshStandardMaterial({color:hex}));
  return materials.get(hex)};
 const ctx={solid,box:(parent,x,y,z,w,h,d,mat)=>{
   const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);
   mesh.position.set(x,y,z);parent.add(mesh);return mesh;}};
 const wood=solid(0x75644f),steel=solid(0x77817e),olive=solid(0x68796e),metal=solid(0x414b4b);
 let drawn=0;
 for(const [index,asset] of catalog.entries()){
   const group=new THREE.Group();
   const obstacle={x:0,y:0,w:asset.width,h:asset.depth,
      fixture:asset.id,low:asset.cover==='low'};
   renderFixtureVisual(group,obstacle,index,ctx,wood,steel,olive,metal);
   assert.ok(group.children.length>0,'no geometry '+asset.id);
   assert.ok(group.children.length<190,'mesh budget '+asset.id);
   const bounds=new THREE.Box3().setFromObject(group);
   assert.ok([...bounds.min.toArray(),...bounds.max.toArray()].every(Number.isFinite),
      'non-finite '+asset.id);
   drawn++;
 }
 assert.equal(drawn,catalog.length);
});
test('all library entries retain valid scale and explicit review status',()=>{
 const entries=assetLibrary(),audit=assetReviewInventory();
 assert.equal(entries.length,audit.length);
 assert.deepEqual(assetLibraryProblems(),[]);
 assert.ok(entries.length>=132);
 assert.ok(audit.some(x=>x.status!=='approved'),
    'Art review must not be silently auto-approved');
});
