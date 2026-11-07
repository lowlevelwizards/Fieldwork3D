import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {headwearCuboidVolumes} from '../src/operator-headwear-silhouettes.ts';
import {createPasgtFieldDress,createPasgtCatEyesGeometry,
 createPasgtRetentionGeometry,updatePasgtFieldDress}
 from '../src/operator-pasgt-field-dress.ts';

test('new PASGT proportions remain the same low-detail iconic six-volume family',()=>{
 const shapes=headwearCuboidVolumes('pasgt');
 assert.equal(shapes.length,7); // crown, brow, nape and two temple/ear pairs
 const crown=shapes.find(x=>x.name==='pasgt-single-protective-crown');
 const peak=shapes.find(x=>x.name==='pasgt-integrated-front-peak');
 const rear=shapes.find(x=>x.name==='pasgt-low-rear-skirt');
 assert.ok(crown&&peak&&rear);
 assert.ok(crown.width<peak.width,'intentionally broad brow below one crown');
 assert.ok(crown.depth<10,'one shallow upper mass, not a long rectangular box');
 assert.ok(peak.width>=10,'chunky front peak preserved');
 assert.ok(rear.height>crown.height,'deep PASGT protective nape retained');
});
test('chinstrap is two broad diagonal sides and one shared chin cup',()=>{
 const g=createPasgtRetentionGeometry();
 assert.equal(g.getAttribute('position').count,30);
 assert.equal(g.userData.pasgtSimpleTwoPointRetention,true);
 assert.ok(g.boundingBox.min.y < -1);
 assert.ok(g.boundingBox.max.y > 3);
 assert.ok(g.boundingBox.max.x > 4.5&&g.boundingBox.min.x < -4.5);
});
test('two flat cat eyes stay connected to both band sizes',()=>{
 const bare=createPasgtCatEyesGeometry(false);
 const covered=createPasgtCatEyesGeometry(true);
 for(const g of [bare,covered]){
  assert.equal(g.userData.pasgtRearCatEyes,2);
  assert.equal(g.getAttribute('position').count,12);
  assert.ok(g.boundingBox.min.y>5.25&&g.boundingBox.max.y<5.8);
 }
 assert.ok(covered.boundingBox.min.z>bare.boundingBox.min.z);
 const root=new THREE.Group(),v=createPasgtFieldDress(root);
 assert.equal(v.band.children.length,2);
 for(const child of v.band.children){
  assert.equal(child.children.length,1);
  assert.equal(child.children[0].geometry.userData.pasgtRearCatEyes,2);
 }
});
test('retention masks out on bulk facewear without changing saved PASGT details',()=>{
 const root=new THREE.Group(),v=createPasgtFieldDress(root);
 const details={slits:true,band:'elastic',concealment:'none'};
 updatePasgtFieldDress(v,true,details,'m81-woodland',true);
 assert.equal(v.retention.visible,true);
 updatePasgtFieldDress(v,true,details,'m81-woodland',false);
 assert.equal(v.retention.visible,false);
 assert.deepEqual(details,{slits:true,band:'elastic',concealment:'none'});
});
