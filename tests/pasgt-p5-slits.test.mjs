import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {PASGT_SLIT_ANCHORS} from '../src/operator-pasgt-drape-geometry.ts';
import {createPasgtFieldDress,createPasgtSlitGeometry} from '../src/operator-pasgt-field-dress.ts';
test('PASGT slit positions are surface-derived and clear the band',()=>{
 assert.equal(PASGT_SLIT_ANCHORS.length,8);
 assert.equal(new Set(PASGT_SLIT_ANCHORS.map(a=>a.id)).size,8);
 assert.ok(PASGT_SLIT_ANCHORS.filter(s=>s.position[1]>7.1).length>=5,
  'upper fabric slits support foliage that breaks crown silhouette');
 assert.ok(PASGT_SLIT_ANCHORS.some(s=>s.position[1]<6.6),
  'lower side slits support hanging field cloth');
 for(const slit of PASGT_SLIT_ANCHORS){
  assert.ok(slit.position[1]>6.3,'slot '+slit.id+' clear band at 5.90');
  const right=new THREE.Vector3(...slit.right),
   up=new THREE.Vector3(...slit.up),
   normal=new THREE.Vector3(...slit.normal);
  assert.ok(Math.abs(right.dot(up))<1e-5);
  assert.ok(Math.abs(right.dot(normal))<1e-5);
  assert.ok(Math.abs(up.dot(normal))<1e-5);
  assert.ok(normal.length()>0.98&&normal.length()<1.02);
 }
 const g=createPasgtSlitGeometry();
 assert.equal(g.userData.pasgtSlitCount,8);
 assert.equal(g.getAttribute('position').count,48);
});
test('slits and attachments share consistent physical mount positions',()=>{
 const root=new THREE.Group(),v=createPasgtFieldDress(root);
 assert.equal(v.slits.children.length,1);
 assert.equal(v.slits.children[0].geometry.userData.pasgtMountedOnCloth,true);
 for(const mounted of [...v.foliage.children,...v.scrim.children]){
  const id=mounted.userData.pasgtSlitId;
  const a=PASGT_SLIT_ANCHORS.find(x=>x.id===id);
  assert.ok(a,'known slot '+id);
  const distance=Math.hypot(mounted.position.x-a.position[0],
   mounted.position.y-a.position[1],mounted.position.z-a.position[2]);
  assert.ok(distance<.2,'card attached '+id);
 }
});
