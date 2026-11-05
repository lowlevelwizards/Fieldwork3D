import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createD2Mask} from '../src/operator-d2-mask-visuals.ts';
const mat=new THREE.MeshStandardMaterial({color:0x3d433c});
const mats={rubber:mat,hardware:mat,filters:mat,lens:mat};
const count=(g,name)=>{let n=0;g.traverse(x=>{if(x.name===name)n++;});return n;};
test('D2-R16 simplified shapes preserve each mask signature with opaque overlay lenses',()=>{
 const gp=createD2Mask('gas-gp5',mats);
 const m17=createD2Mask('gas-m17',mats);
 const m40=createD2Mask('gas-m40',mats);
 const m50=createD2Mask('gas-m50',mats);
 for(const g of [gp,m17,m40,m50])
  assert.equal(g.userData.simpleShellRevision,'R16-R20');
 assert.ok(gp.getObjectByName('gp5-one-piece-rubber-hood'));
 assert.equal(count(gp,'gp5-round-eye-lens'),2);
 assert.equal(count(gp,'head-harness-back'),0);
 assert.equal(count(m17,'m17-integrated-cheek-filter'),2);
 assert.equal(count(m40,'m40-projecting-side-canister'),1);
 assert.equal(count(m50,'m50-twin-low-cheek-filter'),2);
 assert.equal(count(m50,'m50-one-piece-panoramic-visor-lens'),1);
 assert.equal(count(m40,'m40-angular-eyepiece-lens'),2);
 for(const id of ['gas-m17','gas-m40','gas-m50']){
  const g=createD2Mask(id,mats);
  let oldCutouts=0;
  g.traverse(o=>{
   if(o.isMesh&&o.geometry instanceof THREE.ExtrudeGeometry&&
    o.geometry.parameters?.shapes?.holes?.length)oldCutouts++;
  });
  assert.equal(oldCutouts,0,id+' uses overlays, not genuine eye holes');
 }
});
test('D2-R16 lower face variants preserve prebuilt modes without regeneration',()=>{
 const tactical=createD2Mask('half-mask',mats);
 const industrial=createD2Mask('respirator-half',mats);
 assert.deepEqual(tactical.children.map(x=>x.userData.d2MaskMode),['solid','mesh']);
 assert.deepEqual(industrial.children.map(x=>x.userData.d2MaskMode),
  ['twin-filter','compact-filter']);
 assert.equal(count(industrial,'dual-filter-canister'),2);
 assert.equal(count(industrial,'compact-front-filter'),1);
 assert.equal(count(tactical,'dual-filter-canister'),0);
 const before=industrial.children[0].children[0].geometry;
 industrial.children[0].visible=false;industrial.children[1].visible=true;
 industrial.children[0].visible=true;
 assert.strictEqual(industrial.children[0].children[0].geometry,before);
});
test('D2-R16 fitted models have finite bounded positions and distinct filter directions',()=>{
 for(const id of ['half-mask','respirator-half','gas-gp5',
  'gas-m17','gas-m40','gas-m50']){
  const g=createD2Mask(id,mats),b=new THREE.Box3().setFromObject(g);
  for(const n of [...b.min,...b.max])
   assert.ok(Number.isFinite(n),id+' bounds must be finite');
  assert.ok(b.max.x>b.min.x&&b.max.z>b.min.z,id+' 3D extent');
 }
 const m40=createD2Mask('gas-m40',mats);
 assert.ok(m40.getObjectByName('m40-projecting-side-canister').position.x>0);
 const m50=createD2Mask('gas-m50',mats);
 const glass=m50.getObjectByName('m50-one-piece-panoramic-visor-lens');
 assert.ok(glass.geometry instanceof THREE.BufferGeometry);
 assert.equal(glass.geometry.getAttribute('position').count,42);
});
