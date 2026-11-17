import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {ArsenalWeaponGeometryPool}
 from '../src/arsenal/weapon-geometry-pool.ts';
import {buildWeaponSilhouette,clearWeaponSilhouette}
 from '../src/breach-weapon-geometry.ts';
import {partVisualBounds} from '../src/weapons/geometry/weapon-visual-anchors.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset}
 from '../src/equipment-weapon-assemblies.ts';

const steel=new THREE.MeshStandardMaterial(),dark=new THREE.MeshStandardMaterial();
function group(box=3,name='family-receiver-ar-flat-0',material=steel){
 const root=new THREE.Group();
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(box,4,5),material);
 mesh.name=name;mesh.position.x=8;mesh.castShadow=true;
 root.add(mesh);return {root,mesh};
}
test('E6.26 shares byte-identical rigid weapon part geometry, not nodes or materials',()=>{
 const pool=new ArsenalWeaponGeometryPool();
 const a=group(),b=group(3,undefined,dark);
 const aGeo=a.mesh.geometry,bGeo=b.mesh.geometry;
 let orphan=0,shared=0;
 bGeo.addEventListener('dispose',()=>orphan++);
 aGeo.addEventListener('dispose',()=>shared++);
 pool.adopt(a.root);pool.adopt(b.root);
 assert.equal(orphan,1);
 assert.equal(a.mesh.geometry,b.mesh.geometry);
 assert.notEqual(a.mesh,b.mesh);
 assert.notEqual(a.mesh.material,b.mesh.material);
 assert.equal(a.mesh.position.x,8);
 assert.equal(pool.stats().hits,1);
 assert.equal(pool.stats().activeLeases,2);
 pool.release(a.root);assert.equal(shared,0);
 pool.clear();assert.equal(shared,0);
 pool.release(b.root);assert.equal(shared,1);
 assert.equal(pool.stats().geometries,0);
});
test('E6.26 exact full-buffer verification never aliases a different silhouette',()=>{
 const pool=new ArsenalWeaponGeometryPool();
 const a=group(3),b=group(3.01),c=group(3);
 pool.adopt(a.root);pool.adopt(b.root);pool.adopt(c.root);
 assert.equal(pool.stats().geometries,2);
 assert.notEqual(a.mesh.geometry,b.mesh.geometry);
 assert.equal(a.mesh.geometry,c.mesh.geometry);
 pool.release(a.root);pool.release(b.root);pool.release(c.root);
 pool.clear();assert.equal(pool.stats().geometries,0);
});
test('E6.26 never pools decals, dynamic instancing or non-part silhouettes',()=>{
 const pool=new ArsenalWeaponGeometryPool();
 const a=group(3,'family-art-ar-port'),b=group(3,'family-art-ar-port');
 const c=group(3,'unidentified-receiver');
 const geo=a.mesh.geometry,other=b.mesh.geometry;
 pool.adopt(a.root);pool.adopt(b.root);pool.adopt(c.root);
 assert.notEqual(geo,other);
 assert.equal(pool.stats().geometries,0);
 pool.release(a.root);pool.release(b.root);pool.release(c.root);
 pool.clear();
});
test('E6.26 budget and live-lease retirement are bounded',()=>{
 const pool=new ArsenalWeaponGeometryPool(1);
 const a=group(),b=group(5);
 const original=a.mesh.geometry;
 let disposals=0;original.addEventListener('dispose',()=>disposals++);
 pool.adopt(a.root);pool.adopt(b.root);
 assert.equal(pool.stats().geometries,1);
 pool.clear();assert.equal(disposals,0);
 pool.release(a.root);assert.equal(disposals,1);
 pool.release(b.root);assert.equal(pool.stats().geometries,0);
});
test('E6.26 two actual M4A1 models keep every part/name/socket and share immutable buffers',()=>{
 const cfg=selectWeaponFamilyPreset(initialWeaponConfiguration('carbine'),'ar-m4a1');
 assert.ok(cfg.build);
 const first=buildWeaponSilhouette(cfg.weapon,steel,dark,cfg);
 const second=buildWeaponSilhouette(cfg.weapon,steel,dark,cfg);
 const boxA=new THREE.Box3().setFromObject(first);
 const boxB=new THREE.Box3().setFromObject(second);
 const names=root=>{
  const out=[];root.traverse(n=>{if(n instanceof THREE.Mesh)out.push(n.name);});
  return out;
 };
 const beforeNames=names(first),beforeStock=partVisualBounds(first,'stock');
 const pool=new ArsenalWeaponGeometryPool(512);
 pool.adopt(first);pool.adopt(second);
 assert.ok(pool.stats().hits>0,'expected actual authoring geometry reuse');
 assert.deepEqual(names(first),beforeNames);
 assert.deepEqual(names(second),beforeNames);
 assert.deepEqual(first.userData.visibleStockContact,
  second.userData.visibleStockContact);
 const afterStock=partVisualBounds(second,'stock');
 assert.ok(beforeStock&&afterStock&&beforeStock.equals(afterStock));
 assert.ok(boxA.equals(boxB));
 assert.ok(new THREE.Box3().setFromObject(second).equals(boxA));
 const common=[];
 first.traverse(n=>{if(n instanceof THREE.Mesh)common.push(n);});
 let shared=0;second.traverse(n=>{
  if(n instanceof THREE.Mesh&&common.some(m=>m.geometry===n.geometry))shared++;
 });
 assert.ok(shared>0);
 pool.release(first);pool.release(second);
 pool.clear();assert.equal(pool.stats().geometries,0);
});
test('E6.26 unpooled legacy shotgun retains original geometry ownership contract',()=>{
 const pool=new ArsenalWeaponGeometryPool();
 const raw=buildWeaponSilhouette('shotgun',steel,dark);
 assert.ok(raw.children.length>0);
 pool.adopt(raw);assert.equal(pool.stats().geometries,0);
 pool.release(raw);pool.clear();
 assert.equal(raw.children.length,0);
 // Original non-opt-in disposal still works unchanged.
 const classic=buildWeaponSilhouette('shotgun',steel,dark);
 clearWeaponSilhouette(classic);assert.equal(classic.children.length,0);
});
test('E6.26 idle eviction reclaims only unused compiled geometry',()=>{
 const pool=new ArsenalWeaponGeometryPool(4),a=group();
 pool.adopt(a.root);assert.equal(pool.stats().geometries,1);
 pool.evictIdle();assert.equal(pool.stats().geometries,1);
 pool.release(a.root);pool.evictIdle();
 assert.equal(pool.stats().geometries,0);
 assert.equal(pool.stats().evictions,1);
});
test('E6.26 overflowing budget evicts idle LRU, never a live part',()=>{
 const pool=new ArsenalWeaponGeometryPool(1);
 const a=group(3),b=group(5),c=group(7);
 pool.adopt(a.root);pool.adopt(b.root);
 // No unleased slot: a is still in a visible owner, so b must remain local.
 assert.equal(pool.stats().geometries,1);
 assert.notEqual(a.mesh.geometry,b.mesh.geometry);
 pool.release(a.root);
 pool.adopt(c.root);
 assert.equal(pool.stats().geometries,1);
 assert.equal(pool.stats().evictions,1);
 assert.ok(pool.stats().misses>=2);
 pool.release(b.root);pool.release(c.root);pool.clear();
 assert.equal(pool.stats().geometries,0);
});

steel.dispose();dark.dispose();
