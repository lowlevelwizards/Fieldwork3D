import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createPasgtBandGeometry} from '../src/operator-pasgt-drape-geometry.ts';
import {createPasgtFieldDress,updatePasgtFieldDress}
 from '../src/operator-pasgt-field-dress.ts';
test('band is vertically substantial but does not cross the sloping shoulder',()=>{
 const covered=createPasgtBandGeometry(true),bare=createPasgtBandGeometry(false);
 for(const geometry of [covered,bare]){
  assert.ok(geometry.boundingBox.max.y<=5.91);
  assert.ok(geometry.boundingBox.min.y>=5.17);
  assert.ok(Math.abs(geometry.userData.pasgtBandHeight-.72)<1e-7);
  assert.ok(geometry.getAttribute('position').count>60);
 }
 assert.notEqual(covered.boundingBox.min.z,bare.boundingBox.min.z);
 assert.equal(bare.userData.pasgtBandFit,'bare-shell');
});
test('bare vs covered uses separate prebuilt stable meshes',()=>{
 const root=new THREE.Group(),v=createPasgtFieldDress(root);
 assert.equal(v.band.children.length,2);
 const setup={slits:false,band:'elastic',concealment:'none'};
 updatePasgtFieldDress(v,true,setup,'m81-woodland');
 assert.equal(v.band.children.filter(x=>x.visible).length,1);
 assert.equal(v.band.children.find(x=>x.visible).name,'pasgt-covered-fit-elastic');
 updatePasgtFieldDress(v,false,setup,'m81-woodland');
 assert.equal(v.band.children.filter(x=>x.visible).length,1);
 assert.equal(v.band.children.find(x=>x.visible).name,'pasgt-bare-fit-elastic');
});
