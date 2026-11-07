import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
 PASGT_LEAF_SHAPES,createPasgtScrimRibbonGeometry,
 createPasgtFieldDress,updatePasgtFieldDress
} from '../src/operator-pasgt-field-dress.ts';
test('three recognizable leaf shapes differ materially in width and outline',()=>{
 assert.equal(PASGT_LEAF_SHAPES.length,3);
 const signatures=PASGT_LEAF_SHAPES.map(x=>
  Array.from(x.getAttribute('position').array).map(n=>n.toFixed(2)).join(','));
 assert.equal(new Set(signatures).size,3);
 for(const g of PASGT_LEAF_SHAPES){
  g.computeBoundingBox();
  assert.ok(g.boundingBox.max.y>=1.85,'readable tall leaf');
  assert.ok(g.boundingBox.max.x-g.boundingBox.min.x>=.75,'broad leaf');
 }
});
test('scrim uses two broad folded panels, not needle outlines',()=>{
 for(let i=0;i<6;i++){
  const g=createPasgtScrimRibbonGeometry(i);
  assert.equal(g.getAttribute('position').count,12);
  assert.equal(g.userData.pasgtSegmentCount,2);
  assert.ok(g.boundingBox.max.x-g.boundingBox.min.x>.65);
  assert.ok(g.boundingBox.min.y < -1.5);
  assert.ok(g.boundingBox.max.z>.5);
 }
});
test('foliage and scrim are separate, lightweight groups and share palette',()=>{
 const root=new THREE.Group(),v=createPasgtFieldDress(root);
 assert.equal(v.foliage.children.length,6);
 assert.equal(v.scrim.children.length,6);
 assert.equal(v.scrim.children[0].children[0].geometry.userData.pasgtFoldedScrim,true);
 const options={slits:false,band:'none',concealment:'scrim'};
 updatePasgtFieldDress(v,true,options,'six-color-desert');
 assert.equal(v.scrim.visible,true);
 assert.equal(v.foliage.visible,false);
 assert.equal(v.palette,'desert');
 assert.ok(v.scrimMaterials[0].color.getHex()!==v.leafMaterials[0].color.getHex());
 updatePasgtFieldDress(v,true,{...options,concealment:'foliage'},'m81-woodland');
 assert.equal(v.foliage.visible,true);
 assert.equal(v.scrim.visible,false);
 assert.equal(v.palette,'woodland');
});
