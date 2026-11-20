import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {renderFixtureVisual} from '../src/worldgen/fixture-visuals.ts';
import {CHARACTER_FIXTURE_IDS} from '../src/worldgen/asset-character-visuals.ts';
import {mapBoxPixelUV} from '../src/rendering/pixel-materials.ts';
import {shadowEligibleBox} from '../src/rendering/breach-shadow-controller.ts';
import {consolidateStaticFixtureParts}
 from '../src/rendering/breach-fixture-draw-batching.ts';
import {StaticVisualTemplateLibrary}
 from '../src/rendering/fieldwork-visual-template-library.ts';
import {acquireRigidFixtureTemplate,rigidFixtureTemplateEligible,
 fixtureTemplateMissesResolvedBatch}
 from '../src/rendering/breach-fixture-template.ts';

const families=[
 'bed','exam-bed','sofa','armchair','chair',
 'dining-table','meeting-table','coffee-table','desk','workbench',
 'counter','kitchen-island','cart',
 'wardrobe','dresser','cabinet','locker','filing-cabinet',
 'bookcase','shelf','rack','gondola-shelf','wall-shelf','display-rack',
 'fridge','cooler','stove','sink','microwave','laundry-machine',
 'generator','control-panel','tool-chest','vehicle-lift',
 'tank','barrel','tire-stack','tv-stand',
 'shed','dumpster','grill','shipping-container','picnic-table','lamp'
];
function makeSite(){
 const materials=new Map();
 const solid=(hex,roughness,surface)=>{
  const key=[hex,roughness??'',surface??''].join(':');
  if(!materials.has(key))materials.set(key,
   new THREE.MeshStandardMaterial({color:hex,roughness:roughness??.8}));
  return materials.get(key);
 };
 const palette={wood:solid(0x715947,.9),steel:solid(0x586b73,.8),
  olive:solid(0x626747,.9),metal:solid(0x39454a,.8)};
 const box=(parent,x,y,z,w,h,d,material,cast=true)=>{
  const mesh=new THREE.Mesh(mapBoxPixelUV(new THREE.BoxGeometry(w,h,d),w,h,d),material);
  mesh.position.set(x,y,z);mesh.castShadow=cast&&shadowEligibleBox(w,h,d);
  mesh.receiveShadow=true;parent.add(mesh);return mesh;
 };
 return {ctx:{box,solid},palette,materials};
}
function parts(root){
 const out=[];root.traverse(node=>{if(node instanceof THREE.Mesh)out.push(node);});
 return out;
}
function finish(s){for(const m of s.materials.values())m.dispose();}
function disposeOriginal(root){
 const geometries=new Set(parts(root).map(m=>m.geometry));
 for(const geometry of geometries)geometry.dispose();
}
test('E6.25 only known immutable character models opt into caching',()=>{
 assert.equal(families.length,44);
 for(const fixture of families){
  assert.ok(CHARACTER_FIXTURE_IDS.has(fixture),fixture);
  const visual={x:0,y:0,w:48,h:32,fixture};
  assert.equal(rigidFixtureTemplateEligible(visual,true),false,fixture);
  assert.equal(rigidFixtureTemplateEligible(visual,true,true),true,fixture);
  assert.equal(rigidFixtureTemplateEligible({...visual,artVariant:2},true,true),false);
  assert.equal(rigidFixtureTemplateEligible({...visual,artSurface:'wood'},true,true),false);
 }
 for(const fixture of ['vehicle','sedan','pickup','van','suv','planter']){
  assert.equal(rigidFixtureTemplateEligible({x:0,y:0,w:48,h:32,fixture},true,true),
   false,fixture);
 }
});
test('E6.25 source character models retain legacy geometry bounds, shadows and material groups',()=>{
 for(const fixture of families)for(const index of [0,1,2]){
  const site=makeSite(),visual={x:0,y:0,w:48,h:32,fixture};
  const legacy=new THREE.Group(),boxRecipes=[];
  const tracedCtx={...site.ctx,
   box:(...args)=>{
    boxRecipes.push(args.slice(4,7));
    return site.ctx.box(...args);
   }};
  renderFixtureVisual(legacy,visual,index,tracedCtx,
   site.palette.wood,site.palette.steel,site.palette.olive,site.palette.metal);
  consolidateStaticFixtureParts(legacy);
  const cache=new StaticVisualTemplateLibrary();
  const lease=acquireRigidFixtureTemplate(cache,visual,index,
   site.ctx,site.palette,true,true);
  assert.ok(lease,fixture);
  assert.deepEqual(lease.root.userData.fieldworkFixtureLegacyBoxRecipes,
   boxRecipes,fixture+' exact legacy box-cache lookup sequence');
  const legacyBox=new THREE.Box3().setFromObject(legacy);
  const cacheBox=new THREE.Box3().setFromObject(lease.root);
  assert.ok(legacyBox.min.distanceTo(cacheBox.min)<.0001,fixture+' min');
  assert.ok(legacyBox.max.distanceTo(cacheBox.max)<.0001,fixture+' max');
  const flags=root=>parts(root).map(mesh=>
   [mesh.castShadow,mesh.receiveShadow,mesh.material.type]).sort();
  assert.deepEqual(flags(legacy),flags(lease.root),fixture+' flags');
  assert.equal(cache.stats().geometries,
   new Set(parts(lease.root).map(m=>m.geometry)).size,fixture+' retained geometry');
  disposeOriginal(legacy);
  lease.release();cache.clear();
  assert.equal(cache.stats().geometries,0,fixture+' teardown');
  finish(site);
 }
});
test('E6.25 first character model authoring is reused but site finishes and visibility isolate',()=>{
 const cache=new StaticVisualTemplateLibrary(),a=makeSite(),b=makeSite();
 const v={x:0,y:0,w:50,h:32,fixture:'bookcase'};
 const one=acquireRigidFixtureTemplate(cache,v,0,a.ctx,a.palette,true,true);
 const two=acquireRigidFixtureTemplate(cache,v,3,b.ctx,b.palette,true,true);
 assert.ok(one&&two);
 assert.equal(cache.stats().builds,1);
 assert.equal(cache.stats().hits,1);
 const m=parts(one.root),n=parts(two.root);
 assert.equal(m.length,n.length);
 for(let i=0;i<m.length;i++){
  assert.equal(m[i].geometry,n[i].geometry);
  assert.notEqual(m[i].material,n[i].material);
 }
 one.root.visible=false;assert.equal(two.root.visible,true);
 cache.clear();assert.ok(cache.stats().geometries>0);
 one.release();assert.ok(cache.stats().geometries>0);
 two.release();assert.equal(cache.stats().geometries,0);
 finish(a);finish(b);
});

test('E6.25 site-resolved material aliasing does not increase legacy opaque draws',()=>{
 const root=new THREE.Group();
 const m=new THREE.MeshStandardMaterial({color:0x65746e});
 const other=new THREE.MeshStandardMaterial({color:0xaabbcc});
 const make=(x,mat)=>{
  const node=new THREE.Mesh(new THREE.BoxGeometry(2,2,2),mat);
  node.position.x=x;node.castShadow=true;node.receiveShadow=true;
  root.add(node);return node;
 };
 const a=make(0,m),b=make(4,other);
 assert.equal(fixtureTemplateMissesResolvedBatch(root),false);
 // A site-specific ageing/palette quantizer can make two template slots
 // resolve to the SAME physical material even when original placeholders
 // were distinct. Legacy batching would then combine these two draws.
 b.material=m;
 assert.equal(fixtureTemplateMissesResolvedBatch(root),true);
 b.castShadow=false;
 assert.equal(fixtureTemplateMissesResolvedBatch(root),false);
 b.castShadow=true;b.userData.keepSeparate=true;
 assert.equal(fixtureTemplateMissesResolvedBatch(root),false);
 b.userData={};
 a.geometry.dispose();b.geometry.dispose();m.dispose();other.dispose();
});
