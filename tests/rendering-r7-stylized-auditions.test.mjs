import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {operatorHeightBrightness,applyOperatorHeightLighting,
 requestedOperatorGradient} from '../src/operator-height-lighting.ts';
import {requestedStudioShadowColor,studioShadowFill,
 STUDIO_INSPECTION_LIGHT} from '../src/operator-studio-lighting.ts';

const fixture=(y=0)=>{
 const root=new THREE.Group();
 const material=new THREE.MeshStandardMaterial({vertexColors:true});
 material.userData.fieldworkBakedEquipmentAO=true;
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(2,2,2),material);
 mesh.position.y=y;root.add(mesh);
 const count=mesh.geometry.getAttribute('position').count;
 mesh.geometry.setAttribute('color',new THREE.Uint8BufferAttribute(
  new Uint8Array(count*3).fill(255),3,true));
 return {root,mesh,material};
};

test('R7 gradient auditions are opt-in and root-relative',()=>{
 assert.equal(requestedOperatorGradient(''),'current');
 assert.equal(requestedOperatorGradient('?operatorGradient=sculptural'),'sculptural');
 assert.equal(requestedOperatorGradient('?operatorGradient=strong'),'strong');
 assert.equal(requestedOperatorGradient('?operatorGradient=bogus'),'current');
 assert.equal(operatorHeightBrightness(0,'neutral'),1);
 assert.equal(operatorHeightBrightness(50,'neutral'),1);
 assert.deepEqual([0,25,50].map(operatorHeightBrightness),
  [0,25,50].map(y=>operatorHeightBrightness(y,'current')),
  'legacy callbacks with Array.map must not treat the index as a profile');
 assert.ok(operatorHeightBrightness(0,'sculptural')<
  operatorHeightBrightness(0,'current'));
 assert.ok(operatorHeightBrightness(50,'sculptural')>1);
 assert.ok(operatorHeightBrightness(25,'strong')<
  operatorHeightBrightness(50,'strong'));
});

test('R7 gradient rebakes from baseline, never wraps 8-bit bright top',()=>{
 const {root,mesh,material}=fixture(50);
 const color=mesh.geometry.getAttribute('color');
 const current=applyOperatorHeightLighting(root,'same','current');
 assert.equal(current.cached,false);
 const baseline=Array.from(color.array);
 const strong=applyOperatorHeightLighting(root,'same','strong');
 assert.equal(strong.cached,false);
 assert.ok(Array.from(color.array).every(x=>x>200),
  'top highlight saturates, never overflows to black');
 assert.equal(applyOperatorHeightLighting(root,'same','strong').cached,true);
 assert.equal(applyOperatorHeightLighting(root,'same','current').cached,false);
 assert.deepEqual(Array.from(color.array),baseline,
  'returning to current must not double-darken');
 mesh.geometry.dispose();material.dispose();
});

test('R7 colored shadow-side fill is shared and neutral by default',()=>{
 assert.equal(requestedStudioShadowColor(''),'neutral');
 assert.equal(requestedStudioShadowColor('?operatorShadowColor=steel'),'steel');
 assert.equal(requestedStudioShadowColor('?operatorShadowColor=plum'),'plum');
 assert.equal(requestedStudioShadowColor('?operatorShadowColor=bogus'),'neutral');
 assert.deepEqual(studioShadowFill(''),{
  ground:STUDIO_INSPECTION_LIGHT.ground,
  fill:STUDIO_INSPECTION_LIGHT.fill
 });
 assert.notEqual(studioShadowFill('?operatorShadowColor=steel').ground,
  studioShadowFill('?operatorShadowColor=plum').ground);
});
