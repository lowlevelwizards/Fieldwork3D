import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {collectWeaponArtGeometry,inspectWeaponArt} from '../scripts/audit-weapon-art-geometry.mjs';
import {collectWeaponArtInventory} from '../scripts/audit-weapon-art-inventory.mjs';

test('WA0.2 counts real artwork across every reference and fallback',()=>{
 const report=collectWeaponArtGeometry();
 const inventory=collectWeaponArtInventory();
 assert.deepEqual(report.references.map(r=>r.id),inventory.references.map(r=>r.id));
 assert.deepEqual(report,collectWeaponArtGeometry(),'deterministic census without timing or UUID noise');
 for(const r of report.references){
  assert.ok(r.meshes>0&&r.triangles>0&&r.uniqueGeometries>0&&r.uniqueMaterials>0,r.id);
  assert.ok(r.visibleMeshes>0&&r.visibleMeshes<=r.meshes,r.id);
  assert.ok(r.visibleTriangles>0&&r.visibleTriangles<=r.triangles,r.id);
  assert.ok(r.bounds.size.every(v=>Number.isFinite(v)&&v>0),r.id);
  assert.equal(Object.values(r.owners).reduce((n,p)=>n+p.meshes,0),r.meshes,r.id);
  assert.equal(r.materials.length,r.uniqueMaterials);
  assert.equal(r.textures.length,r.uniqueTextures);
  assert.ok(r.knownCpuTextureBytes>=0);
  if(r.status==='preview-only'||r.status==='issued-sidearm-appearance')
   assert.match(r.scale.basis,/native-sidearm-preview/);
 }
 assert.equal(report.totals.references,inventory.references.length);
 assert.equal(report.totals.meshes,report.references.reduce((n,r)=>n+r.meshes,0));
 assert.equal(Object.values(report.byPlatform).reduce((n,p)=>n+p.references,0),report.totals.references);
});
test('WA0.2 distinguishes hidden meshes, instances, shared identities and CPU texture bytes',()=>{
 const root=new THREE.Group(),g=new THREE.BoxGeometry(1,1,1);
 const tex=new THREE.DataTexture(new Uint8Array(16),2,2);
 const mat=new THREE.MeshStandardMaterial({map:tex});
 const a=new THREE.Mesh(g,mat),b=new THREE.InstancedMesh(g,mat,3),hidden=new THREE.Group();
 for(let i=0;i<3;i++)b.setMatrixAt(i,new THREE.Matrix4().makeTranslation(i,0,0));
 hidden.visible=false;hidden.add(new THREE.Mesh(g,mat));root.add(a,b,hidden);
 try{
  const r=inspectWeaponArt(root);
  assert.equal(r.meshes,3);assert.equal(r.visibleMeshes,2);
  assert.equal(r.triangles,60);assert.equal(r.visibleTriangles,48);
  assert.equal(r.instances,3);assert.equal(r.estimatedVisibleSubmissions,2);
  assert.equal(r.uniqueGeometries,1);assert.equal(r.uniqueMaterials,1);assert.equal(r.uniqueTextures,1);
  assert.equal(r.knownCpuTextureBytes,16);assert.equal(r.unknownCpuTextureCount,0);
  assert.deepEqual(r.bounds.size,[3,1,1]);
 }finally{b.dispose();g.dispose();mat.dispose();tex.dispose();}
});
