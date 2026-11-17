import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {compileRigidWeaponPartPilot}
 from '../src/weapons/geometry/rigid-weapon-part-pilot.ts';
import {partVisualBounds} from '../src/weapons/geometry/weapon-visual-anchors.ts';
import {ARSENAL_REFERENCES} from '../src/arsenal/catalog.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset}
 from '../src/equipment-weapon-assemblies.ts';
import {buildWeaponSilhouette,clearWeaponSilhouette}
 from '../src/breach-weapon-geometry.ts';
import {auditAllFactoryWeapons,measureWeaponVisual}
 from '../scripts/audit-weapon-production-m30.mjs';

const vec=box=>[...box.min.toArray(),...box.max.toArray()];
function approxBounds(a,b,label){
 assert.ok(a&&b,label+' needs actual part geometry');
 for(const [i,x] of vec(a).entries())
  assert.ok(Math.abs(x-vec(b)[i])<.00002,
   label+' changed bounds at '+i+': '+x+' / '+vec(b)[i]);
}
test('M3.0C2 opt-in compiler preserves slot picking and independent magazines',()=>{
 const root=new THREE.Group(),metal=new THREE.MeshStandardMaterial();
 const add=(name,x)=>{
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(2,2,2),metal);
  mesh.position.x=x;mesh.name=name;
  mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);return mesh;
 };
 const receiver=[add('family-receiver-ar-flat-0',0),
  add('family-receiver-ar-flat-1',3),
  add('family-receiver-ar-flat-2',6)];
 const magazine=add('family-magazine-ar-mag30-0',4);
 const other=add('family-stock-ar-m4-0',-5);
 const before=measureWeaponVisual(root);
 const partBounds=partVisualBounds(root,'receiver');
 const change=compileRigidWeaponPartPilot(root,'receiver','ar-flat');
 assert.equal(change.sourceMeshes,3);
 assert.equal(change.compiledMeshes,1);
 assert.equal(change.avoidedSubmissions,2);
 assert.equal(measureWeaponVisual(root).submissions,before.submissions-2);
 assert.ok(root.children.includes(magazine)&&root.children.includes(other));
 approxBounds(partVisualBounds(root,'receiver'),partBounds,'receiver');
 const camera=new THREE.PerspectiveCamera(50,1,.1,100);
 camera.position.set(3,0,20);camera.lookAt(3,0,0);
 camera.updateProjectionMatrix();root.updateWorldMatrix(true,true);
 const raycaster=new THREE.Raycaster();
 raycaster.setFromCamera(new THREE.Vector2(0,0),camera);
 const hits=raycaster.intersectObject(root,true);
 assert.ok(hits.some(x=>x.object.name.startsWith('family-receiver-ar-flat-')),
  'Workbench must still ray-pick a canonical receiver part');
 change.restore();
 assert.deepEqual(measureWeaponVisual(root),before);
 assert.ok(receiver.every(x=>root.children.includes(x)));
 change.restore(); // idempotent
 clearWeaponSilhouette(root);metal.dispose();
});

test('M3.0C2 actual factory pilot is reversible without touching saved builds',()=>{
 const candidates=auditAllFactoryWeapons()
  .filter(r=>r.family!=='legacy'&&r.rigidPartCandidates.groups.length)
  .sort((a,b)=>b.rigidPartCandidates.potentialSavedSubmissions-
   a.rigidPartCandidates.potentialSavedSubmissions);
 assert.ok(candidates.length,'need at least one actual repeated rigid body part');
 const candidate=candidates[0];
 const group=candidate.rigidPartCandidates.groups[0];
 const ref=ARSENAL_REFERENCES.find(r=>r.id===candidate.id);
 assert.ok(ref);
 const config=selectWeaponFamilyPreset(
  initialWeaponConfiguration(ref.legacy.weapon),ref.id);
 const snapshot=structuredClone(config);
 const steel=new THREE.MeshBasicMaterial(),dark=new THREE.MeshBasicMaterial();
 const body=buildWeaponSilhouette(config.weapon,steel,dark,config);
 const before=measureWeaponVisual(body);
 const mount=partVisualBounds(body,group.slot);
 const changed=compileRigidWeaponPartPilot(body,group.slot,group.partId);
 assert.ok(changed.avoidedSubmissions>=1,
  candidate.id+' must benefit from trial compile');
 assert.ok(measureWeaponVisual(body).submissions<before.submissions);
 approxBounds(partVisualBounds(body,group.slot),mount,'factory '+candidate.id);
 changed.restore();
 assert.deepEqual(measureWeaponVisual(body),before,
  'restoring production model must recover all distinct part names');
 assert.deepEqual(config,snapshot,'no loadout/save mutation');
 clearWeaponSilhouette(body);steel.dispose();dark.dispose();
});

test('M3.0C2 refuses animated magazines, metadata and instanced rail teeth',()=>{
 const g=new THREE.Group(),metal=new THREE.MeshStandardMaterial();
 for(let i=0;i<2;i++){
  const m=new THREE.Mesh(new THREE.BoxGeometry(1,2,1),metal);
  m.name='family-magazine-ar-mag-0';g.add(m);
 }
 assert.throws(()=>compileRigidWeaponPartPilot(g,'magazine','ar-mag'),
  /Dynamic magazine bodies/,'JS call cannot bypass live reload ownership');
 const c=compileRigidWeaponPartPilot(g,'receiver','ar-flat');
 assert.equal(c.avoidedSubmissions,0);
 c.commit();c.restore();
 assert.equal(g.children.length,2);
 const rail=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),metal,5);
 rail.name='family-receiver-ar-flat-0';g.add(rail);
 const metadata=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),metal);
 metadata.name='family-receiver-ar-flat-1';
 metadata.userData.operatorContact=true;g.add(metadata);
 const c2=compileRigidWeaponPartPilot(g,'receiver','ar-flat');
 assert.equal(c2.avoidedSubmissions,0);
 clearWeaponSilhouette(g);metal.dispose();
});
