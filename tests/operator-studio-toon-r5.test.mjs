import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {requestedOperatorToonBands,operatorToonRamp,
 applyOperatorStudioToon} from '../src/operator-studio-toon-lighting.ts';

test('R5.4-B smooth remains default; 2/3 band request strictly opt-in',()=>{
 assert.equal(requestedOperatorToonBands(''),0);
 assert.equal(requestedOperatorToonBands('?operatorLightingToon=3'),3);
 assert.equal(requestedOperatorToonBands('?operatorLightingToon=2'),2);
 assert.equal(requestedOperatorToonBands('?operatorLightingToon=4'),0);
 for(const bands of [2,3]){
  const ramp=operatorToonRamp(bands);
  assert.equal(ramp.image.width,bands);
  assert.equal(ramp.image.height,1);
  assert.equal(ramp.minFilter,THREE.NearestFilter);
  assert.equal(ramp.magFilter,THREE.NearestFilter);
  assert.equal(ramp.colorSpace,THREE.NoColorSpace);
  assert.equal(ramp.image.data.length,bands*4);
  assert.equal(operatorToonRamp(bands),ramp,'shared ramp, no per-mesh map');
 }
});
test('R5.4-B applies shared gear toon without changing camo UV, AO, geometry',()=>{
 const root=new THREE.Group();
 const fabric=new THREE.MeshStandardMaterial({
  color:0x87876e,vertexColors:true
 });
 fabric.userData.fieldworkBakedEquipmentAO=true;
 const ordinary=new THREE.MeshStandardMaterial({color:0xcabf8a});
 const a=new THREE.Mesh(new THREE.BoxGeometry(2,2,2),fabric);
 const b=new THREE.Mesh(new THREE.BoxGeometry(3,3,3),fabric);
 const skin=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),ordinary);
 root.add(a,b,skin);
 const uv=Array.from(a.geometry.getAttribute('uv').array);
 const p=Array.from(a.geometry.getAttribute('position').array);
 assert.deepEqual(applyOperatorStudioToon(root,0),{meshes:0,materials:0});
 let result=applyOperatorStudioToon(root,3);
 assert.deepEqual(result,{meshes:2,materials:1});
 assert.ok(a.material instanceof THREE.MeshToonMaterial);
 assert.equal(a.material,b.material,'reuse one material per source fabric');
 assert.equal(a.material.gradientMap,operatorToonRamp(3));
 assert.equal(a.material.vertexColors,true);
 assert.equal(skin.material,ordinary,'head/skin/other materials unchanged');
 assert.deepEqual(Array.from(a.geometry.getAttribute('uv').array),uv);
 assert.deepEqual(Array.from(a.geometry.getAttribute('position').array),p);
 fabric.color.setHex(0x516153);
 result=applyOperatorStudioToon(root,3);
 assert.equal(result.materials,1,'no duplicate shader per wardrobe update');
 assert.ok(a.material.color.equals(fabric.color));
 a.material.dispose();fabric.dispose();ordinary.dispose();
 for(const mesh of [a,b,skin])mesh.geometry.dispose();
});
