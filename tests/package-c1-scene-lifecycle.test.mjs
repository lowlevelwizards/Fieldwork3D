import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {releaseSiteSceneObjects}
  from '../src/rendering/site-scene-lifecycle.ts';
import {SiteMaterialLifetime}
  from '../src/rendering/site-material-lifetime.ts';
import {doorSweepArc}
  from '../src/rendering/breach-site-openings-builder.ts';

const source=readFileSync(new URL('../src/breach-3d.ts',import.meta.url),'utf8');
const openings=readFileSync(
 new URL('../src/rendering/breach-site-openings-builder.ts',import.meta.url),'utf8');
const builder=readFileSync(
 new URL('../src/rendering/breach-site-scene-builder.ts',import.meta.url),'utf8');
const siteSwap=source.slice(source.indexOf('  applySite(site:Site|null){'),
 source.indexOf('  /** Scene lifecycle owns all resources',source.indexOf('  applySite(site:Site|null){')));

test('C1 releases unique site geometry, line geometry and instanced buffers once',()=>{
 const root=new THREE.Group(),site=new THREE.Group();
 const shared=new THREE.BoxGeometry(1,1,1);
 const local=new THREE.BoxGeometry(2,2,2);
 const lineGeom=new THREE.BufferGeometry().setFromPoints([
  new THREE.Vector3(0,0,0),new THREE.Vector3(1,0,0)
 ]);
 const material=new THREE.MeshBasicMaterial();
 const persistentFog=new THREE.InstancedMesh(shared,material,2);
 const decorative=new THREE.InstancedMesh(local,material,3);
 const arc=new THREE.Line(lineGeom,material);
 const a=new THREE.Mesh(local,material),b=new THREE.Mesh(local,material);
 root.add(persistentFog,site);
 site.add(a,b,arc,decorative);
 const releases={local:0,line:0,shared:0,instances:0,retained:0};
 local.addEventListener('dispose',()=>releases.local++);
 lineGeom.addEventListener('dispose',()=>releases.line++);
 shared.addEventListener('dispose',()=>releases.shared++);
 decorative.addEventListener('dispose',()=>releases.instances++);
 persistentFog.addEventListener('dispose',()=>releases.retained++);
 const retained=new Set([persistentFog]),sharedGeometries=new Set([shared]);
 const result=releaseSiteSceneObjects(root,retained,sharedGeometries);
 assert.deepEqual(result,{children:1,geometries:2,instances:1});
 assert.deepEqual(releases,{local:1,line:1,shared:0,instances:1,retained:0});
 assert.equal(root.children.length,1);
 assert.equal(root.children[0],persistentFog);
 assert.equal(site.parent,null);
 assert.deepEqual(releaseSiteSceneObjects(root,retained,sharedGeometries),
  {children:0,geometries:0,instances:0});
 assert.equal(releases.local,1);
});

test('C1 shared box meshes stay alive; site batches can own separate instance data',()=>{
 const root=new THREE.Group(),site=new THREE.Group();
 const shared=new THREE.BoxGeometry(3,3,3);
 const material=new THREE.MeshBasicMaterial();
 const batch=new THREE.InstancedMesh(shared,material,4);
 root.add(site);site.add(batch);
 let geometryDisposed=0,instanceDisposed=0,materialDisposed=0;
 shared.addEventListener('dispose',()=>geometryDisposed++);
 batch.addEventListener('dispose',()=>instanceDisposed++);
 material.addEventListener('dispose',()=>materialDisposed++);
 const result=releaseSiteSceneObjects(root,new Set(),new Set([shared]));
 assert.deepEqual(result,{children:1,geometries:0,instances:1});
 assert.equal(geometryDisposed,0);
 assert.equal(instanceDisposed,1);
 assert.equal(materialDisposed,0,'material policy belongs to its real owner');
});

test('C1 generated door-swing line and hinge materials follow site lifetime',()=>{
 const materials=new SiteMaterialLifetime();
 const sweep=doorSweepArc({hinge:'a',swing:-1},55,
  material=>materials.track(material));
 const owned=[];
 sweep.traverse(node=>{
  if(node instanceof THREE.Line||node instanceof THREE.Mesh)
   owned.push(node.material);
 });
 assert.equal(owned.length,2);
 assert.equal(materials.size,2);
 const disposed=new Map(owned.map(m=>[m,0]));
 for(const material of owned)material.addEventListener('dispose',()=>{
  disposed.set(material,disposed.get(material)+1);
 });
 materials.reset();
 materials.reset();
 assert.deepEqual([...disposed.values()],[1,1]);
 assert.equal(materials.size,0);
 // Demo fixture users without a SiteMaterialLifetime retain standalone API.
 const fixture=doorSweepArc({hinge:'b',swing:1},45);
 assert.equal(fixture.children.length,2);
 fixture.traverse(obj=>{
  if(obj instanceof THREE.Mesh||obj instanceof THREE.Line){
   obj.geometry.dispose();
   obj.material.dispose();
  }
 });
});

test('C1 live map swaps release site scopes but not permanent renderer/actor/fog',()=>{
 assert.match(source,/import \{releaseSiteSceneObjects\}/);
 assert.match(siteSwap,/releaseSiteSceneObjects\(this\.root,/);
 assert.match(siteSwap,/new Set\(\[this\.fogUnknown,this\.fogExplored\]\)/);
 assert.match(siteSwap,/this\.sharedBoxGeometries\)/);
 assert.match(siteSwap,/this\.siteMaterials\.reset\(\)/);
 assert.equal((siteSwap.match(/this\.staticBatches\.clear\(\)/g)||[]).length,1);
 assert.match(siteSwap,/if\(actor\.side==='blue'\)continue/);
 assert.match(siteSwap,/this\.retireHostileActor\(id\)/);
 assert.match(siteSwap,/this\.scene\.remove\(rig\.root\)/);
 assert.match(siteSwap,/this\.fogTexture\.needsUpdate=true/);
 assert.doesNotMatch(siteSwap,/this\.renderer\.dispose\(/);
 assert.doesNotMatch(siteSwap,/this\.fogTexture\.dispose\(/);
 assert.doesNotMatch(siteSwap,/this\.pixelTextures\.dispose\(/);
});

test('C1 both generated and legacy door paths register ephemeral overlay materials',()=>{
 assert.match(openings,/doorSweepArc\(door,length,host\.track\)/);
 assert.match(openings,/trackMaterial\(new THREE\.LineDashedMaterial/);
 assert.match(openings,/trackMaterial\(new THREE\.MeshBasicMaterial/);
 assert.match(builder,/doorSweepArc\(door,width,\s*material=>host\.siteMaterials\.track\(material\)\)/);
 assert.match(source,/this\.siteMaterials\.reset\(\)/);
});

test('C1 does not move authoritative geometry, replay or actor posing into site lifetime',()=>{
 const helper=readFileSync(
  new URL('../src/rendering/site-scene-lifecycle.ts',import.meta.url),'utf8');
 assert.doesNotMatch(helper,/\bSession\b|\bposeOperator\s*\(|\bpaintFog|\bWebGLRenderer\s*\(/);
 assert.match(helper,/node instanceof THREE\.Line/);
 assert.match(helper,/node instanceof THREE\.InstancedMesh/);
 assert.match(helper,/for\(const instance of instances\)instance\.dispose\(\)/);
 assert.match(helper,/for\(const geometry of geometries\)geometry\.dispose\(\)/);
});
