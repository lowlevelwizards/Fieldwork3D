import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {ARSENAL_REFERENCES} from '../src/arsenal/catalog.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset}
 from '../src/equipment-weapon-assemblies.ts';
import {buildWeaponSilhouette,clearWeaponSilhouette}
 from '../src/breach-weapon-geometry.ts';
import {measureWeaponVisual,auditWeaponProduction,auditAllFactoryWeapons,
 auditRigidPartCandidates} from '../scripts/audit-weapon-production-m30.mjs';

test('M3.0A counts instance-buffer rails as one submission, not one per tooth',()=>{
 const root=new THREE.Group(),material=new THREE.MeshStandardMaterial();
 const geometry=new THREE.BoxGeometry(1,1,1);
 const teeth=new THREE.InstancedMesh(geometry,material,7);
 teeth.name='family-handguard-test-0';
 root.add(teeth);
 const hidden=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),material);
 hidden.name='family-receiver-hidden-0';hidden.visible=false;root.add(hidden);
 const stats=measureWeaponVisual(root);
 assert.equal(stats.meshes,1);
 assert.equal(stats.instances,7);
 assert.equal(stats.instancedMeshes,1);
 assert.equal(stats.submissions,1);
 assert.equal(stats.parts.handguard.meshes,1);
 assert.equal(stats.parts.receiver,undefined);
 assert.equal(stats.triangles,12*7);
 teeth.dispose();geometry.dispose();hidden.geometry.dispose();material.dispose();
});

test('M3.0A audits every authored factory, non-destructively',()=>{
 const reports=auditAllFactoryWeapons();
 assert.equal(reports.length,ARSENAL_REFERENCES.length);
 assert.equal(new Set(reports.map(r=>r.id)).size,reports.length);
 assert.ok(reports.some(r=>r.body.instancedMeshes>0),
  'must cover actual instanced rail models');
 for(const record of reports){
  assert.ok(record.body.meshes>0,record.id+' has no body');
  assert.ok(record.body.submissions>0);
  assert.equal(record.totalSubmissions,
   record.body.submissions+record.accessories.submissions);
  assert.ok(Number.isFinite(record.body.triangles)&&record.body.triangles>0);
  assert.ok(record.body.protectedComponents>0,
   'modular part identity must remain visible to Workbench picking');
  for(const k of ['min','max'])for(const n of record.bounds[k])
   assert.ok(Number.isFinite(n),record.id+' invalid bounds');
  for(let axis=0;axis<3;axis++)
   assert.ok(record.bounds.max[axis]>record.bounds.min[axis],
    record.id+' collapsed 3D silhouette');
 }
});

test('M3.0A repeated production builds preserve submission budget and silhouette',()=>{
 const ref=ARSENAL_REFERENCES.find(r=>r.id==='ar-m4a1')??ARSENAL_REFERENCES[0];
 assert.ok(ref);
 const config=selectWeaponFamilyPreset(
  initialWeaponConfiguration(ref.legacy.weapon),ref.id);
 const before=auditWeaponProduction(config,ref.id);
 const after=auditWeaponProduction(config,ref.id);
 assert.deepEqual(after,before);
});

test('M3.0B clearing weapon releases instanced buffer but not shared materials',()=>{
 const group=new THREE.Group();
 const material=new THREE.MeshStandardMaterial();
 const instanceGeometry=new THREE.BoxGeometry(1,1,1);
 const normalGeometry=new THREE.BoxGeometry(2,1,1);
 const rails=new THREE.InstancedMesh(instanceGeometry,material,3);
 const stock=new THREE.Mesh(normalGeometry,material);
 group.add(rails,stock);
 group.userData.visibleStockContact={x:0,y:0,z:0};
 let buffersDisposed=0,geometryDisposed=0,materialDisposed=0;
 rails.addEventListener('dispose',()=>buffersDisposed++);
 instanceGeometry.addEventListener('dispose',()=>geometryDisposed++);
 normalGeometry.addEventListener('dispose',()=>geometryDisposed++);
 material.addEventListener('dispose',()=>materialDisposed++);
 clearWeaponSilhouette(group);
 assert.equal(buffersDisposed,1,'release GPU instance matrix resources');
 assert.equal(geometryDisposed,2,'geometry belongs to this model');
 assert.equal(materialDisposed,0,'registry material remains shared');
 assert.equal(group.children.length,0);
 assert.equal(group.userData.visibleStockContact,null);
 material.dispose();
});

test('M3.0C0 proposes same-part opaque candidates but protects controls',()=>{
 const root=new THREE.Group(),material=new THREE.MeshStandardMaterial();
 const add=(name,options={})=>{
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(1,2,3),material);
  mesh.name=name;
  if(options.metadata)mesh.userData.liveSelector=true;
  if(options.transparent)mesh.material=new THREE.MeshStandardMaterial({
   transparent:true,opacity:.5});
  root.add(mesh);return mesh;
 };
 add('family-handguard-ar-quad-0');
 add('family-handguard-ar-quad-1');
 add('family-handguard-ar-quad-2');
 add('family-handguard-ar-quad-3',{metadata:true});
 add('family-magazine-ar-mag-0');
 add('family-magazine-ar-mag-1');
 add('family-receiver-ar-flat-0',{transparent:true});
 const instanced=new THREE.InstancedMesh(
  new THREE.BoxGeometry(1,1,1),material,6);
 instanced.name='family-handguard-ar-quad-4';root.add(instanced);
 const before=measureWeaponVisual(root);
 const candidates=auditRigidPartCandidates(root);
 assert.equal(candidates.groups.length,1);
 assert.equal(candidates.groups[0].slot,'handguard');
 assert.equal(candidates.groups[0].partId,'ar-quad');
 assert.equal(candidates.groups[0].meshes,3);
 assert.equal(candidates.potentialSavedSubmissions,2);
 assert.deepEqual(measureWeaponVisual(root),before,'inventory never bakes');
 root.traverse(o=>{
  if(o instanceof THREE.InstancedMesh)o.dispose();
  if(o instanceof THREE.Mesh)o.geometry.dispose();
 });
 material.dispose();
});
