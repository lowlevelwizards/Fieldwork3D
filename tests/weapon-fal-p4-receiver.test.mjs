/** The low-poly receiver must have VISIBLE front and rear endcaps. */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildWeaponSilhouette,clearWeaponSilhouette} from '../src/breach-weapon-geometry.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset,resolveWeaponAssembly}
 from '../src/equipment-weapon-assemblies.ts';
const cfg=(id='fal-5000')=>selectWeaponFamilyPreset(initialWeaponConfiguration('rifle'),id);
const bb=x=>new THREE.Box3().setFromObject(x);
const create=()=>{const mat=new THREE.MeshBasicMaterial();return {mat,root:buildWeaponSilhouette('rifle',mat,mat,cfg())};};

import {FAL_UPPER_STATIONS,falUpperSideHalfZ} from '../src/weapons/geometry/fal-receiver-form.ts';
import {FAL_VISUAL_ANATOMY} from '../src/weapons/geometry/weapon-receiver-anatomy.ts';
test('strong P7 triangular crown with just two longitudinal stations',()=>{
 const {root,mat}=create();
 assert.equal(FAL_UPPER_STATIONS.length,2);
 const upper=root.getObjectByName('family-receiver-fal-50-receiver-0');
 assert.ok(upper&&upper.userData.falCrownedUpper);
 assert.ok(FAL_UPPER_STATIONS[0].roofHalfZ/FAL_UPPER_STATIONS[0].sideHalfZ<.4);
 assert.equal(upper.geometry.getAttribute('position').count,72);
 assert.ok(falUpperSideHalfZ(1.4)<falUpperSideHalfZ(-.1)-.5);
 clearWeaponSilhouette(root);mat.dispose();
});
test('rear receiver cap faces OUTWARD and is not culled in the Workbench',()=>{
 const {root,mat}=create(),mesh=root.getObjectByName('family-receiver-fal-50-receiver-0');
 const p=mesh.geometry.getAttribute('position');
 const vec=i=>new THREE.Vector3(p.getX(i),p.getY(i),p.getZ(i));
 const triNormal=i=>{
  const a=vec(i),b=vec(i+1),c=vec(i+2);
  return b.sub(a).cross(c.sub(a)).normalize();
 };
 assert.ok(triNormal(36).x<-.9,'rear cap must face toward the stock');
 assert.ok(triNormal(39).x>.9,'front cap must face toward the barrel');
 clearWeaponSilhouette(root);mat.dispose();
});
test('ejection port is down at the barrel line without changing actual bore/socket coordinates',()=>{
 const {root,mat}=create();
 const port=root.children.find(x=>x.userData.falEjectionPort);
 assert.equal(FAL_VISUAL_ANATOMY.portX,.92);
 assert.equal(FAL_VISUAL_ANATOMY.portY,.47);
 assert.ok(bb(port).min.y>=.1&&bb(port).max.y<=.85);
 assert.ok(bb(port).min.z>0);
 const pivot=root.children.filter(x=>x.userData.falPivotSide);
 assert.deepEqual(pivot.map(x=>x.userData.falPivotSide).sort(),[-1,1]);
 assert.equal(resolveWeaponAssembly(cfg()).stockX,-15);
 const g3=buildWeaponSilhouette('rifle',mat,mat,cfg('hk-g3a3'));
 assert.ok(g3.children.every(x=>!x.userData.falCrownedUpper));
 clearWeaponSilhouette(root);clearWeaponSilhouette(g3);mat.dispose();
});
