/** Surgical A1 vent-surface regression: no floating planes or AK changes. */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {FAMILY_PRESETS} from '../src/equipment-weapon-families.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset}
 from '../src/equipment-weapon-assemblies.ts';
import {buildWeaponSilhouette,clearWeaponSilhouette}
 from '../src/breach-weapon-geometry.ts';
const material=new THREE.MeshBasicMaterial();
function model(id){
 const p=FAMILY_PRESETS.find(x=>x.id===id);
 assert.ok(p,id);
 const config=selectWeaponFamilyPreset(initialWeaponConfiguration(p.weapon),id);
 const group=buildWeaponSilhouette(p.weapon,material,material,config);
 group.updateMatrixWorld(true);
 return group;
}
function nearestDistance(point,mesh){
 const index=mesh.geometry.getIndex(),attr=mesh.geometry.getAttribute('position');
 const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3();
 const nearest=new THREE.Vector3(),triangle=new THREE.Triangle();
 let min=Infinity;
 for(let i=0;i<index.count;i+=3){
  for(const [dest,k] of [[a,index.getX(i)],[b,index.getX(i+1)],
   [c,index.getX(i+2)]]){
   dest.fromBufferAttribute(attr,k).applyMatrix4(mesh.matrixWorld);
  }
  triangle.set(a,b,c).closestPointToPoint(point,nearest);
  min=Math.min(min,nearest.distanceTo(point));
 }
 return min;
}
test('A1 uses 4 dark vents on each genuine sloping face, never flat cards',()=>{
 const group=model('ar-m16a1');
 const body=group.children.find(x=>x.userData.arForearmProfile==='a1-triangle');
 assert.ok(body&&body.userData.arForearmCrossSection);
 const vents=group.children.filter(x=>x.name==='family-art-a1-vents');
 assert.equal(vents.length,2,'exactly one batched vent surface per side');
 assert.deepEqual(vents.map(x=>x.userData.arVentSide).sort((a,b)=>a-b),[-1,1]);
 for(const vent of vents){
  assert.equal(vent.userData.arA1FaceAligned,true);
  assert.equal(vent.userData.arVentCount,4);
  assert.equal(vent.geometry.type,'BufferGeometry');
  assert.equal(vent.geometry.getIndex().count,24,'four rectangles, two triangles each');
  assert.equal(vent.geometry.getAttribute('position').count,16);
  assert.equal(vent.material.type,'MeshBasicMaterial');
  assert.equal(vent.material.map,null,'matte geometric openings, not painted sprites');
  assert.ok(vent.material.color.r<.02&&vent.material.color.g<.02,
   'vents are extremely dark and unlit');
  assert.ok(!vent.castShadow&&!vent.receiveShadow);
  const pos=vent.geometry.getAttribute('position');
  for(let i=0;i<pos.count;i++){
   const point=new THREE.Vector3().fromBufferAttribute(pos,i)
    .applyMatrix4(vent.matrixWorld);
   const distance=nearestDistance(point,body);
   assert.ok(distance>.007&&distance<.055,
    'vent vertex '+i+' lies flush against the actual sloped surface (distance '+distance+')');
   assert.ok(point.z*vent.userData.arVentSide>0,
    'vents stay on their matching side of the triangular fore-end');
  }
 }
 assert.ok(!group.children.some(x=>x.name==='family-art-a1-vents'&&
  x.geometry.type==='PlaneGeometry'),'old flat floating card removed');
 assert.ok(group.children.length<=36,'mesh budget not inflated');
 clearWeaponSilhouette(group);
});
test('A1 vent change remains exclusive to triangular A1 furniture',()=>{
 for(const id of ['ar-m16a2','ar-m16a4','ar-car15','ar-m4a1','ar-mk12mod0',
  'ar-mk18','ak-akm']){
  const g=model(id);
  assert.equal(g.children.filter(x=>x.name==='family-art-a1-vents').length,0,
   id+' should not receive triangular A1 face vents');
  clearWeaponSilhouette(g);
 }
});
