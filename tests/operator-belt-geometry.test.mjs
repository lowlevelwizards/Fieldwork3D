import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createBeltSilhouettes} from '../src/operator-belt-visuals.ts';
import {BELT_STYLES} from '../src/operator-belt-profile.ts';
test('BT1: one geometry per style, increasing silhouette volume; no belt is empty',()=>{
 const root=new THREE.Group(),material=new THREE.MeshStandardMaterial();
 const groups=createBeltSilhouettes(root,material,material,material);
 assert.deepEqual(Object.keys(groups),BELT_STYLES);
 assert.equal(groups['no-belt'].children.length,0);
 let height=0,width=0;
 for(const style of BELT_STYLES.slice(1)){
  const g=groups[style];g.updateMatrixWorld(true);
  const size=new THREE.Box3().setFromObject(g).getSize(new THREE.Vector3());
  assert.ok(size.y>height,style+' height');assert.ok(size.z>width,style+' width');
  height=size.y;width=size.z;
  assert.ok(g.children.every(c=>c.geometry.attributes.position.count>0));
  for(const c of g.children)c.geometry.dispose();
 }
 material.dispose();
});
