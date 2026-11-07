import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {PASGT_SLIT_ANCHORS,PASGT_COVER_TOP_Y} from '../src/operator-pasgt-drape-geometry.ts';
import {
 createPasgtFieldDress,createPasgtSlitGeometry,
 PASGT_LEAF_CLUSTERS,createPasgtScrimRibbonGeometry
} from '../src/operator-pasgt-field-dress.ts';
test('twelve bold slits include four true crown slots and clear the elastic',()=>{
 assert.equal(PASGT_SLIT_ANCHORS.length,12);
 const crowns=PASGT_SLIT_ANCHORS.filter(s=>s.id.startsWith('crown-'));
 assert.equal(crowns.length,4);
 for(const s of crowns){
  assert.ok(Math.abs(s.position[1]-PASGT_COVER_TOP_Y)<.12);
  assert.deepEqual([...s.normal],[0,1,0]);
 }
 const geometry=createPasgtSlitGeometry();
 assert.equal(geometry.getAttribute('position').count,72);
 assert.ok(geometry.boundingBox.max.y>PASGT_COVER_TOP_Y);
 for(const slit of PASGT_SLIT_ANCHORS)
  assert.ok(slit.position[1]>5.9);
});
test('at least ten physically attached large foliage and hanging fabric options',()=>{
 const group=new THREE.Group(),v=createPasgtFieldDress(group);
 assert.equal(v.foliage.children.length,10);
 assert.equal(v.scrim.children.length,10);
 assert.equal(new Set(v.foliage.children.map(m=>m.userData.pasgtSlitId)).size,10);
 for(const mesh of PASGT_LEAF_CLUSTERS)
  assert.equal(mesh.userData.pasgtBunchCardCount,3);
 for(let i=0;i<10;i++){
  const strip=createPasgtScrimRibbonGeometry(i);
  assert.ok(strip.boundingBox.min.y<-2.5,'scrim must hang meaningfully');
  assert.ok(strip.boundingBox.max.x-strip.boundingBox.min.x>1.3,
   'scrim broad fabric shape, not a needle');
 }
});
