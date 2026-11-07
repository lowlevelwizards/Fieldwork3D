import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {PASGT_LEAF_SHAPES,PASGT_LEAF_CLUSTERS,
 createPasgtFieldDress,updatePasgtFieldDress}
 from '../src/operator-pasgt-field-dress.ts';
test('crossed pixel-art foliage is premerged into one mesh per slit',()=>{
 assert.equal(PASGT_LEAF_CLUSTERS.length,3);
 for(let i=0;i<3;i++){
  const original=PASGT_LEAF_SHAPES[i].index?
   PASGT_LEAF_SHAPES[i].index.count:PASGT_LEAF_SHAPES[i].getAttribute('position').count;
  const merged=PASGT_LEAF_CLUSTERS[i].getAttribute('position');
  assert.ok(merged.count>original);
  assert.equal(PASGT_LEAF_CLUSTERS[i].userData.pasgtCrossedPixelLeaf,true);
 }
 const root=new THREE.Group(),v=createPasgtFieldDress(root);
 assert.equal(v.foliage.children.length,6);
 for(const root of v.foliage.children)
  assert.equal(root.children.length,1,'one draw-call leaf cluster per slit');
});
test('scrim woodland and desert have visible, distinct textile palettes',()=>{
 const root=new THREE.Group(),v=createPasgtFieldDress(root);
 const options={slits:true,band:'elastic',concealment:'scrim'};
 updatePasgtFieldDress(v,true,options,'m81-woodland');
 const a=v.scrimMaterials.map(m=>m.color.getHex());
 updatePasgtFieldDress(v,true,options,'six-color-desert');
 const b=v.scrimMaterials.map(m=>m.color.getHex());
 assert.notDeepEqual(a,b);
 assert.ok(new Set(b).size>=3);
});
