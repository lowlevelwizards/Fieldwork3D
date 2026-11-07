import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
 createPasgtFieldDress,createPasgtNetGeometry,
 updatePasgtFieldDress,pasgtConcealmentPalette
} from '../src/operator-pasgt-field-dress.ts';
import {PASGT_SLIT_ANCHORS} from '../src/operator-pasgt-drape-geometry.ts';
test('all PASGT leaf and scrim cards really attach to slit anchors',()=>{
 const root=new THREE.Group(),v=createPasgtFieldDress(root);
 assert.equal(PASGT_SLIT_ANCHORS.length,12);
 assert.equal(v.foliage.children.length,10);
 assert.equal(v.scrim.children.length,10);
 for(const g of [...v.foliage.children,...v.scrim.children]){
  assert.ok(PASGT_SLIT_ANCHORS.some(a=>
   a.position[0]===g.position.x&&a.position[2]===g.position.z));
  assert.ok(g.children.some(x=>x instanceof THREE.Mesh));
 }
});
test('effective foliage/scrim auto-enables cuts, removal restores saved OFF',()=>{
 const root=new THREE.Group(),v=createPasgtFieldDress(root);
 const saved={slits:false,band:'elastic',concealment:'foliage'};
 updatePasgtFieldDress(v,true,saved,'m81-woodland');
 assert.equal(v.foliage.visible,true);
 assert.equal(v.slits.visible,true);
 assert.equal(v.band.visible,true);
 assert.equal(saved.slits,false);
 updatePasgtFieldDress(v,true,{...saved,concealment:'none'},'m81-woodland');
 assert.equal(v.slits.visible,false);
 updatePasgtFieldDress(v,true,{...saved,concealment:'scrim'},'six-color-desert');
 assert.equal(v.scrim.visible,true);
 assert.equal(v.slits.visible,true);
 assert.equal(v.palette,'desert');
 updatePasgtFieldDress(v,false,{...saved,concealment:'scrim'},'six-color-desert');
 assert.equal(v.scrim.visible,false);
 assert.equal(v.slits.visible,false);
 assert.equal(v.band.visible,true);
});
test('net extends from crown to brow, ear/side and nape',()=>{
 const g=createPasgtNetGeometry();
 assert.equal(g.userData.pasgtNetCordCount,6);
 assert.ok(g.boundingBox.max.y>=9);
 // P6 net terminates at the retaining band instead of long floating
 // poles extending through and below the lower PASGT skirt.
 assert.ok(g.boundingBox.min.y>5.18&&g.boundingBox.min.y<5.7);
 assert.ok(g.boundingBox.min.z<-5.7);
 assert.ok(g.boundingBox.max.z>5.5);
 assert.ok(g.boundingBox.min.x<-5.0);
 assert.ok(g.boundingBox.max.x>5.0);
});
test('concealment palettes are intentionally simple and consistent',()=>{
 assert.equal(pasgtConcealmentPalette('six-color-desert'),'desert');
 assert.equal(pasgtConcealmentPalette('m81-woodland'),'woodland');
 assert.equal(pasgtConcealmentPalette('ucp'),'urban');
});
