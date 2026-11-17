import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {renderFixtureVisual} from '../src/worldgen/fixture-visuals.ts';
import {consolidateStaticFixtureParts} from '../src/rendering/breach-fixture-draw-batching.ts';
import {mapBoxPixelUV} from '../src/rendering/pixel-materials.ts';
import {shadowEligibleBox} from '../src/rendering/breach-shadow-controller.ts';
import {StaticVisualTemplateLibrary} from '../src/rendering/fieldwork-visual-template-library.ts';
import {acquireRigidFixtureTemplate,rigidFixtureTemplateEligible}
 from '../src/rendering/breach-fixture-template.ts';

const service=['toilet','bathtub','mailbox','screened-dumpster',
 'vending-machine','wayfinding-sign','trash-bin','bollard',
 'utility-cabinet','parking-block','parking-sign','street-lamp'];
function ctx(){
 const materials=new Map();
 const solid=(hex,roughness,surface)=>{
  const key=[hex,roughness??'',surface??''].join('/');
  if(!materials.has(key))materials.set(key,
   new THREE.MeshStandardMaterial({color:hex,roughness:roughness??.8}));
  return materials.get(key);
 };
 const palette={wood:solid(0x615842,.9),steel:solid(0x686b70,.8),
  olive:solid(0x686651,.9),metal:solid(0x475560,.8)};
 const box=(parent,x,y,z,w,h,d,material,cast=true)=>{
  const mesh=new THREE.Mesh(mapBoxPixelUV(new THREE.BoxGeometry(w,h,d),w,h,d),material);
  mesh.position.set(x,y,z);mesh.castShadow=cast&&shadowEligibleBox(w,h,d);
  mesh.receiveShadow=true;parent.add(mesh);return mesh;
 };
 return {materials,port:{solid,box},palette};
}
function eachMesh(root){
 const out=[];root.traverse(n=>{if(n instanceof THREE.Mesh)out.push(n);});
 return out;
}
function snapshot(root){
 const bounds=new THREE.Box3().setFromObject(root);
 return {min:bounds.min,max:bounds.max,
  shadows:eachMesh(root).map(m=>[m.castShadow,m.receiveShadow]).sort(),
  count:eachMesh(root).length};
}
test('E6.24 twelve service/exterior families are opt-in and rigid',()=>{
 for(const fixture of service){
  const visual={x:0,y:0,w:44,h:28,fixture};
  assert.equal(rigidFixtureTemplateEligible(visual),false,fixture);
  assert.equal(rigidFixtureTemplateEligible(visual,true),true,fixture);
  assert.equal(rigidFixtureTemplateEligible({...visual,artVariant:2},true),false);
  assert.equal(rigidFixtureTemplateEligible({...visual,artCondition:'used'},true),false);
 }
 assert.equal(rigidFixtureTemplateEligible({x:0,y:0,w:44,h:28,fixture:'bike-rack'},true),false);
 assert.equal(rigidFixtureTemplateEligible({x:0,y:0,w:44,h:28,fixture:'van'},true),false);
});
test('E6.24 12 source recipes match legacy boundaries, shadow flags and mesh totals',()=>{
 for(const fixture of service)for(const variant of [0,1]){
  const c={x:0,y:0,w:44,h:28,fixture},s=ctx();
  const original=new THREE.Group();
  renderFixtureVisual(original,c,variant,s.port,
   s.palette.wood,s.palette.steel,s.palette.olive,s.palette.metal);
  consolidateStaticFixtureParts(original);
  const cache=new StaticVisualTemplateLibrary();
  const lease=acquireRigidFixtureTemplate(cache,c,variant,s.port,s.palette,true);
  assert.ok(lease,fixture);
  const legacy=snapshot(original),now=snapshot(lease.root);
  assert.ok(legacy.min.distanceTo(now.min)<1e-4,fixture);
  assert.ok(legacy.max.distanceTo(now.max)<1e-4,fixture);
  assert.deepEqual(legacy.shadows,now.shadows,fixture);
  assert.equal(legacy.count,now.count,fixture);
  assert.equal(cache.stats().geometries,
   new Set(eachMesh(lease.root).map(m=>m.geometry)).size,fixture);
  const oldGeos=new Set(eachMesh(original).map(m=>m.geometry));
  for(const g of oldGeos)g.dispose();
  lease.release();cache.clear();
  assert.equal(cache.stats().geometries,0,fixture);
  for(const m of s.materials.values())m.dispose();
 }
});
test('E6.24 new service models reuse geometry without sharing owner or finish',()=>{
 const c={x:0,y:0,w:58,h:34,fixture:'vending-machine'};
 const cache=new StaticVisualTemplateLibrary(),a=ctx(),b=ctx();
 const one=acquireRigidFixtureTemplate(cache,c,0,a.port,a.palette,true);
 const two=acquireRigidFixtureTemplate(cache,c,0,b.port,b.palette,true);
 assert.ok(one&&two);
 assert.equal(cache.stats().builds,1);assert.equal(cache.stats().hits,1);
 const first=eachMesh(one.root),second=eachMesh(two.root);
 assert.equal(first.length,second.length);
 for(let i=0;i<first.length;i++){
  assert.equal(first[i].geometry,second[i].geometry);
  assert.notEqual(first[i].material,second[i].material);
 }
 one.root.visible=false;assert.equal(two.root.visible,true);
 cache.clear();assert.ok(cache.stats().geometries>0);
 one.release();assert.ok(cache.stats().geometries>0);
 two.release();assert.equal(cache.stats().geometries,0);
 for(const s of [a,b])for(const m of s.materials.values())m.dispose();
});
