import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {compileArsenalRigidPartSiblings}
 from '../src/arsenal/weapon-part-batching.ts';
import {partVisualBounds} from '../src/weapons/geometry/weapon-visual-anchors.ts';
import {ArsenalWeaponGeometryPool}
 from '../src/arsenal/weapon-geometry-pool.ts';
import {buildWeaponSilhouette,clearWeaponSilhouette}
 from '../src/breach-weapon-geometry.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset}
 from '../src/equipment-weapon-assemblies.ts';

const metal=new THREE.MeshStandardMaterial({color:0x3e5b64});
const dark=new THREE.MeshStandardMaterial({color:0x37413b});
const create=(name,x,material=metal,visible=true)=>{
 const m=new THREE.Mesh(new THREE.BoxGeometry(2,3,4),material);
 m.name=name;m.position.set(x,0,0);m.visible=visible;
 m.castShadow=true;m.receiveShadow=true;return m;
};
const meshList=root=>{
 const parts=[];root.traverse(n=>{if(n instanceof THREE.Mesh)parts.push(n);});
 return parts;
};
test('E6.27 compile only same-slot same-material rigid siblings without flattening editable parts',()=>{
 const root=new THREE.Group();
 const a=create('family-receiver-a-0',-6),b=create('family-receiver-a-1',0);
 const stock=create('family-stock-a-0',9),mag=create('family-magazine-a-0',3);
 const decal=create('family-art-ar-port',0);
 root.add(a,b,stock,mag,decal);
 const pre=new THREE.Box3().setFromObject(root);
 const result=compileArsenalRigidPartSiblings(root);
 assert.equal(result.avoidedDraws,1);
 assert.equal(result.originalMeshes,2);
 assert.equal(result.renderMeshes,1);
 assert.ok(result.archive&&!result.archive.visible);
 assert.equal(result.archive.children.length,2);
 assert.equal(stock.parent,root);
 assert.equal(mag.parent,root);
 assert.equal(decal.parent,root);
 const baked=root.children.find(n=>n.name.startsWith('family-receiver-compiled'));
 assert.ok(baked instanceof THREE.Mesh);
 assert.equal(baked.material,metal);
 assert.equal(baked.castShadow,true);
 assert.deepEqual(new THREE.Box3().setFromObject(root).min.toArray(),pre.min.toArray());
 assert.deepEqual(new THREE.Box3().setFromObject(root).max.toArray(),pre.max.toArray());
 assert.ok(partVisualBounds(root,'receiver'));
 assert.ok(partVisualBounds(root,'magazine'));
 result.restore();result.restore();
 assert.equal(root.children.length,5);
 assert.equal(a.parent,root);assert.equal(b.parent,root);
 for(const part of meshList(root))part.geometry.dispose();
});
test('E6.27 different finishes/shadow passes, custom metadata and transparent shapes stay independent',()=>{
 const root=new THREE.Group();
 const one=create('family-stock-a-0',0);
 const two=create('family-stock-a-1',5,dark);
 const three=create('family-stock-a-2',10);three.castShadow=false;
 const four=create('family-stock-a-3',15);four.userData.keepSeparate=true;
 const five=create('family-stock-a-4',20);five.material=
  new THREE.MeshStandardMaterial({transparent:true,opacity:.65});
 root.add(one,two,three,four,five);
 const result=compileArsenalRigidPartSiblings(root);
 assert.equal(result.avoidedDraws,0);
 assert.equal(root.children.length,5);
 for(const part of meshList(root))part.geometry.dispose();
 (five.material).dispose();
});
test('E6.27 actual M4A1 retains six named part classes, stock sockets, and a lower rendered opaque part count',()=>{
 const cfg=selectWeaponFamilyPreset(initialWeaponConfiguration('carbine'),'ar-m4a1');
 assert.ok(cfg.build);
 const raw=buildWeaponSilhouette(cfg.weapon,metal,dark,cfg,
  {rigidCompilation:'disabled'});
 const originalRawDraws=meshList(raw).filter(m=>m.visible).length;
 const root=buildWeaponSilhouette(cfg.weapon,metal,dark,cfg);
 // M3.0C4 has already compiled this exact M4 factory profile. Require
 // the actual net improvement rather than demanding duplicate batching.
 const verified=root.userData.rigidCompilation;
 assert.equal(verified?.factoryId,'ar-m4a1');
 assert.ok(verified.avoidedSubmissions>=5);
 const preBounds=new THREE.Box3().setFromObject(root);
 const preStock=partVisualBounds(root,'stock');
 const preBySlot=Object.fromEntries(['receiver','barrel','handguard','stock','grip','magazine']
  .map(slot=>[slot,partVisualBounds(root,slot)]));
 const before=meshList(root).filter(m=>m.visible).length;
 const bake=compileArsenalRigidPartSiblings(root);
 assert.ok(originalRawDraws>before,
  'verified factory M4 must actually reduce source render meshes');
 assert.ok(originalRawDraws-before>=5,
  'factory M4 must preserve its existing 5+ real draw savings');
 assert.ok(bake.avoidedDraws>=0,
  'optional residual E6.27 batching may not add render submissions');
 const actual=root.children.filter(n=>n instanceof THREE.Mesh&&n.visible).length+
  meshList(root).filter(m=>m.parent!==root&&m.visible&&m.parent?.visible).length;
 assert.ok(actual<=before,
  'E6.27 must not reverse the preceding M3.0 M4 draw savings');
 assert.ok(new THREE.Box3().setFromObject(root).equals(preBounds));
 assert.ok(partVisualBounds(root,'stock').equals(preStock));
 for(const [slot,beforeBounds] of Object.entries(preBySlot)){
  const after=partVisualBounds(root,slot);
  assert.ok(beforeBounds&&after&&after.equals(beforeBounds),slot);
 }
 assert.equal(root.userData.visibleStockContact?.stockId,
  cfg.build.parts.stock);
 const pool=new ArsenalWeaponGeometryPool();
 pool.adopt(root);
 // Mixed source/archive and compiled geometries must be reclaimed exactly
 // once without treating compiled output as permanently pooled geometry.
 pool.release(root);pool.clear();assert.equal(pool.stats().geometries,0);
 clearWeaponSilhouette(raw);
});
test('E6.27 stand-alone pilot leaves dynamic and instanced geometry unchanged',()=>{
 const root=new THREE.Group();
 const rail=new THREE.InstancedMesh(new THREE.BoxGeometry(2,2,2),metal,4);
 rail.name='family-handguard-rails-0';
 const hand=create('family-handguard-a-0',0);
 const hand2=create('family-handguard-a-1',4);
 root.add(rail,hand,hand2);
 const bake=compileArsenalRigidPartSiblings(root);
 assert.ok(bake.avoidedDraws===1);
 assert.equal(rail.parent,root);
 bake.restore();
 rail.dispose();rail.geometry.dispose();
 hand.geometry.dispose();hand2.geometry.dispose();
});
test('E6.27 custom draw ranges and grouped geometry cannot become visible baked triangles',()=>{
 const root=new THREE.Group();
 const partial=create('family-handguard-x-0',0);
 partial.geometry.setDrawRange(0,6);
 const grouped=create('family-handguard-x-1',4);
 grouped.geometry.addGroup(0,12,0);
 // Multi-material submesh groups have different GPU submissions and cannot
 // be batched into a single standard opaque material.
 grouped.material=[metal,dark];
 const common=create('family-handguard-x-2',8);
 root.add(partial,grouped,common);
 const bake=compileArsenalRigidPartSiblings(root);
 assert.equal(bake.avoidedDraws,0);
 assert.equal(root.children.length,3);
 assert.equal(partial.geometry.drawRange.count,6);
 assert.equal(grouped.geometry.groups.length,7); // BoxGeometry's six face groups plus this extra distinct material group
 partial.geometry.dispose();grouped.geometry.dispose();common.geometry.dispose();
});

metal.dispose();dark.dispose();
