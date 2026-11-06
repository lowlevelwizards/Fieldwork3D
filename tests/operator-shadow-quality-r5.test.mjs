import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {operatorShadowDetail,projectedOperatorHeightPx,
 applyOperatorShadowLod,cavityQualityForDetail}
 from '../src/operator-shadow-quality.ts';

test('R5.5-B quality depends on screen footprint, not guessed distance',()=>{
 const camera=new THREE.OrthographicCamera(-100,100,200,-200,.1,1000);
 assert.equal(projectedOperatorHeightPx(camera,800),100);
 assert.equal(operatorShadowDetail(200,'quality'),'high');
 assert.equal(operatorShadowDetail(70,'balanced'),'medium');
 assert.equal(operatorShadowDetail(25,'balanced'),'distant');
 assert.equal(operatorShadowDetail(70,'performance'),'distant');
 assert.equal(operatorShadowDetail(200,'performance'),'medium');
 assert.ok(cavityQualityForDetail('high')>
  cavityQualityForDetail('distant'));
});
test('R5.5-B reduces only original casters and restores on zoom',()=>{
 const root=new THREE.Group();
 const material=new THREE.MeshStandardMaterial();
 const body=new THREE.Mesh(new THREE.BoxGeometry(10,15,12),material);
 const buckle=new THREE.Mesh(new THREE.BoxGeometry(.5,.5,.5),material);
 const hidden=new THREE.Mesh(new THREE.BoxGeometry(9,10,10),material);
 body.castShadow=true;
 buckle.castShadow=true;
 hidden.castShadow=false;
 root.add(body,buckle,hidden);
 const before=Array.from(body.geometry.getAttribute('position').array);
 const low=applyOperatorShadowLod(root,'distant','wardrobe-a');
 assert.equal(low.changed,true);
 assert.equal(body.castShadow,true);
 assert.equal(buckle.castShadow,false);
 assert.equal(hidden.castShadow,false,'no new caster for previously unlit mesh');
 assert.equal(applyOperatorShadowLod(root,'distant','wardrobe-a').changed,false);
 assert.equal(root.userData.fieldworkCavityQuality,.5);
 const high=applyOperatorShadowLod(root,'high','wardrobe-a');
 assert.equal(high.changed,true);
 assert.equal(buckle.castShadow,true);
 assert.equal(hidden.castShadow,false);
 assert.deepEqual(Array.from(body.geometry.getAttribute('position').array),before);
 for(const mesh of [body,buckle,hidden])mesh.geometry.dispose();
 material.dispose();
});
test('R5.5-B wardrobe revision invalidates tier without toggling camera',()=>{
 const group=new THREE.Group(),mat=new THREE.MeshBasicMaterial();
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(3,4,4),mat);
 group.add(mesh);
 assert.equal(applyOperatorShadowLod(group,'medium','style-a').changed,true);
 assert.equal(applyOperatorShadowLod(group,'medium','style-a').changed,false);
 assert.equal(applyOperatorShadowLod(group,'medium','style-b').changed,true);
 mesh.geometry.dispose();mat.dispose();
});
