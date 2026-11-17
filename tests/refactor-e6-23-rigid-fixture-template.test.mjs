import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {renderFixtureVisual} from '../src/worldgen/fixture-visuals.ts';
import {mapBoxPixelUV} from '../src/rendering/pixel-materials.ts';
import {shadowEligibleBox} from '../src/rendering/breach-shadow-controller.ts';
import {consolidateStaticFixtureParts}
 from '../src/rendering/breach-fixture-draw-batching.ts';
import {acquireRigidFixtureTemplate,adoptRigidFixtureVisual,rigidFixtureTemplateEligible}
 from '../src/rendering/breach-fixture-template.ts';
import {StaticVisualTemplateLibrary}
 from '../src/rendering/fieldwork-visual-template-library.ts';
import {RepeatedFixtureBatches}
 from '../src/rendering/breach-repeated-fixture-batches.ts';
import {releaseSiteSceneObjects}
 from '../src/rendering/site-scene-lifecycle.ts';

const visual=(fixture='bar-stool',w=22,h=22)=>({x:0,y:0,w,h,fixture});
const box=(parent,x,y,z,w,h,d,material,cast=true)=>{
 const mesh=new THREE.Mesh(mapBoxPixelUV(new THREE.BoxGeometry(w,h,d),w,h,d),material);
 mesh.position.set(x,y,z);
 mesh.castShadow=cast&&shadowEligibleBox(w,h,d);
 mesh.receiveShadow=true;parent.add(mesh);return mesh;
};
function site(color=0x677a76){
 const materials=new Map();
 const solid=(hex,roughness,surface)=>{
  const key=[hex,roughness??'',surface??''].join(':');
  if(!materials.has(key))materials.set(key,new THREE.MeshStandardMaterial({color:hex,roughness:roughness??.85}));
  return materials.get(key);
 };
 const palette={wood:solid(0x777777,.9),steel:solid(color,.8),
  olive:solid(0x334455,.9),metal:solid(0x606060,.8)};
 return {ctx:{box,solid},palette,materials};
}
function meshes(root){
 const found=[];root.traverse(node=>{if(node instanceof THREE.Mesh)found.push(node);});
 return found;
}
function bounds(root){return new THREE.Box3().setFromObject(root);}
function release(root,s,cache){
 releaseSiteSceneObjects(root,new Set(),cache.sharedGeometries());
 for(const material of s.materials.values())material.dispose();
}
test('E6.23 selected rigid fixtures have exact legacy dimensions and shadow groups',()=>{
 for(const kind of ['bar-stool','entry-bench','diner-booth','queue-stanchion','public-bench','window-boards']){
  const fixture=visual(kind,48,24),cache=new StaticVisualTemplateLibrary(),s=site();
  const legacy=new THREE.Group();
  renderFixtureVisual(legacy,fixture,3,s.ctx,s.palette.wood,s.palette.steel,
   s.palette.olive,s.palette.metal);
  consolidateStaticFixtureParts(legacy);
  const lease=acquireRigidFixtureTemplate(cache,fixture,3,s.ctx,s.palette);
  assert.ok(lease,kind);
  // After the source boxes are merged, cache ownership must exclude all
  // detached authoring-only geometries; otherwise the 128 recipe budget
  // accumulates unused CPU arrays and unnecessary cleanup work.
  assert.equal(cache.stats().geometries,
   new Set(meshes(lease.root).map(mesh=>mesh.geometry)).size,kind);
  const a=bounds(legacy),b=bounds(lease.root);
  assert.ok(a.min.distanceTo(b.min)<1e-4,kind+' min');
  assert.ok(a.max.distanceTo(b.max)<1e-4,kind+' max');
  assert.deepEqual(meshes(legacy).map(m=>[m.castShadow,m.receiveShadow]).sort(),
   meshes(lease.root).map(m=>[m.castShadow,m.receiveShadow]).sort(),kind);
  release(legacy,s,new StaticVisualTemplateLibrary());
  lease.release();cache.clear();
  assert.equal(cache.stats().geometries,0);
 }
});
test('E6.23 geometry is shared across sites, but finishes and owners are not',()=>{
 const cache=new StaticVisualTemplateLibrary(),fixture=visual('diner-booth',64,31);
 const a=site(0x777777),b=site(0xbbbbbb);
 const one=acquireRigidFixtureTemplate(cache,fixture,1,a.ctx,a.palette);
 const two=acquireRigidFixtureTemplate(cache,fixture,1,b.ctx,b.palette);
 assert.ok(one&&two);
 assert.equal(cache.stats().builds,1);
 assert.equal(cache.stats().hits,1);
 assert.equal(meshes(one.root).length,meshes(two.root).length);
 for(let i=0;i<meshes(one.root).length;i++){
  assert.equal(meshes(one.root)[i].geometry,meshes(two.root)[i].geometry);
  assert.notEqual(meshes(one.root)[i].material,meshes(two.root)[i].material);
 }
 one.root.visible=false;
 assert.equal(two.root.visible,true);
 const gpu=meshes(two.root)[0].geometry;
 let disposals=0;gpu.addEventListener('dispose',()=>disposals++);
 const owned=new THREE.Group();owned.add(one.root);
 releaseSiteSceneObjects(owned,new Set(),cache.sharedGeometries());
 one.release();
 cache.clear();assert.equal(disposals,0);
 two.release();assert.equal(disposals,1);
 assert.equal(cache.stats().geometries,0);
 for(const m of [...a.materials.values(),...b.materials.values()])m.dispose();
});
test('E6.23 material/geometry variants fail closed rather than sharing a wrong prototype',()=>{
 const cache=new StaticVisualTemplateLibrary(),s=site();
 for(const c of [{...visual(),artCondition:'worn'},
  {...visual(),artSurface:'fabric'},
  {...visual(),artVariant:2},visual('chair'),visual('bar-stool',NaN,18)]){
  assert.equal(rigidFixtureTemplateEligible(c),false);
  assert.equal(acquireRigidFixtureTemplate(cache,c,0,s.ctx,s.palette),null);
 }
 for(const i of [0,1,2,3]){
  const l=acquireRigidFixtureTemplate(cache,visual(),i,s.ctx,s.palette);
  assert.ok(l);l.release();
 }
 assert.equal(cache.stats().builds,3);
 for(const m of s.materials.values())m.dispose();
 cache.clear();
});
test('E6.23 repeated fixture instancing cannot dispose live cache-owned buffers',()=>{
 const cache=new StaticVisualTemplateLibrary(),s=site();
 const root=new THREE.Group(),batches=new RepeatedFixtureBatches(),leases=[];
 for(let i=0;i<2;i++){
  const owner=new THREE.Group(),phase=new THREE.Group();
  owner.position.x=i*70;root.add(owner);owner.add(phase);
  const lease=acquireRigidFixtureTemplate(cache,visual('bar-stool',30,20),0,s.ctx,s.palette);
  assert.ok(lease);phase.add(...[...lease.root.children]);leases.push(lease);
  batches.collect(i,owner,phase);
 }
 const geo=meshes(root)[0].geometry;let disposed=0;
 geo.addEventListener('dispose',()=>disposed++);
 batches.flush(root,new Set(cache.sharedGeometries()));
 assert.equal(disposed,0);
 batches.clear();
 releaseSiteSceneObjects(root,new Set(),cache.sharedGeometries());
 for(const l of leases)l.release();
 assert.equal(disposed,0);
 cache.clear();assert.equal(disposed,1);
 for(const m of s.materials.values())m.dispose();
});

test('E6.23 throwing custom palette resolver rolls back lease and frees template',()=>{
 const cache=new StaticVisualTemplateLibrary(),root=new THREE.Group();
 const geometry=new THREE.BoxGeometry(3,4,5);
 const material=new THREE.MeshStandardMaterial();
 root.add(new THREE.Mesh(geometry,material));
 let disposed=0;geometry.addEventListener('dispose',()=>disposed++);
 assert.throws(()=>cache.acquire('failing-palette:v1',
  ()=>({root,ownedGeometries:[geometry]}),{
   resolveMaterial:()=>{throw Error('bad palette');}
  }),/bad palette/);
 assert.equal(cache.stats().leases,0);
 cache.clear();
 assert.equal(cache.stats().geometries,0);
 assert.equal(disposed,1);
 material.dispose();
});

test('E6.23 adopted direct meshes detach on lease retirement without site teardown',()=>{
 const cache=new StaticVisualTemplateLibrary(),s=site(),owner=new THREE.Group();
 const lease=acquireRigidFixtureTemplate(cache,visual('entry-bench',41,21),
  0,s.ctx,s.palette);
 assert.ok(lease);
 const adopted=adoptRigidFixtureVisual(owner,lease);
 assert.ok(owner.children.length>0);
 assert.equal(lease.root.children.length,0);
 assert.equal(cache.stats().leases,1);
 adopted.release();adopted.release();
 assert.equal(owner.children.length,0);
 assert.equal(cache.stats().leases,0);
 cache.clear();
 assert.equal(cache.stats().geometries,0);
 for(const m of s.materials.values())m.dispose();
});
