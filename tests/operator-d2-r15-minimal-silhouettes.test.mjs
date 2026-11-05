import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createD2Mask} from '../src/operator-d2-mask-visuals.ts';
const mat=new THREE.MeshStandardMaterial({color:0x394640});
const m={rubber:mat,hardware:mat,filters:mat,lens:mat};
const model=id=>createD2Mask(id,m);
const count=(g,name)=>{let n=0;g.traverse(o=>{if(o.name===name)n++;});return n;};
const bounds=o=>new THREE.Box3().setFromObject(o);
test('R20: original mask IDs, options, and signature components survive replacement',()=>{
 const tactical=model('half-mask'),resp=model('respirator-half');
 assert.deepEqual(tactical.children.map(x=>x.userData.d2MaskMode),['solid','mesh']);
 assert.deepEqual(resp.children.map(x=>x.userData.d2MaskMode),
  ['twin-filter','compact-filter']);
 assert.equal(count(resp,'dual-filter-canister'),2);
 assert.equal(count(resp,'compact-front-filter'),1);
 const gp=model('gas-gp5'),m17=model('gas-m17'),
  m40=model('gas-m40'),m50=model('gas-m50');
 assert.ok(gp.getObjectByName('gp5-one-piece-rubber-hood'));
 assert.equal(count(gp,'gp5-round-eye-lens'),2);
 assert.equal(count(m17,'m17-integrated-cheek-filter'),2);
 assert.equal(count(m40,'m40-projecting-side-canister'),1);
 assert.equal(count(m50,'m50-twin-low-cheek-filter'),2);
 assert.equal(count(m50,'m50-one-piece-panoramic-visor-lens'),1);
});
test('R20: one planar connected faceted shell per mask and zero real apertures',()=>{
 for(const [id,name] of [
  ['half-mask','rigid-half-mask-face'],
  ['respirator-half','respirator-triangular-seal'],
  ['gas-m17','m17-full-facepiece'],
  ['gas-m40','m40-full-facepiece'],
  ['gas-m50','m50-facepiece-rim-and-chin']
 ]){
  const o=model(id).getObjectByName(name);
  assert.ok(o?.isMesh,id+' has one connected hero shell');
  assert.equal(o.userData.d2SimpleShell,true,id+' uses planar-strip construction');
  assert.equal(o.userData.d2CutoutCount,0,id+' does not cut eye holes');
  assert.ok(!(o.geometry instanceof THREE.ExtrudeGeometry));
  const pos=o.geometry.getAttribute('position');
  assert.ok(pos.count<=180,id+' shell kept simple');
  const b=bounds(o);
  assert.ok(b.max.z-b.min.z>2.3,id+' wraps around cheek to temple, not a front slab');
 }
 const gp=model('gas-gp5');
 const hood=gp.getObjectByName('gp5-one-piece-rubber-hood');
 assert.ok(hood);
 const crown=gp.getObjectByName('hood-crown');
 assert.ok(crown?.isMesh,'one piece 360-degree hood with roof');
 const h=bounds(crown);
 assert.ok(h.min.y<=-2.2&&h.max.y>=7.5,'hood spans crown through neck');
 assert.ok(h.min.x<=-4.4&&h.max.x>=4.4,'hood covers the skull cheek corners');
 assert.equal(count(gp,'head-harness-back'),0);
});
test('R20: distinct goggles and M50 wraparound visor are opaque surface overlays',()=>{
 for(const [id,prefix,n] of [
  ['gas-gp5','gp5-round-eye-lens',2],
  ['gas-m17','m17-round-eyepiece-lens',2],
  ['gas-m40','m40-angular-eyepiece-lens',2],
  ['gas-m50','m50-one-piece-panoramic-visor-lens',1]
 ]){
  const g=model(id);
  assert.equal(count(g,prefix),n);
 }
 const m50=model('gas-m50');
 const visor=m50.getObjectByName('m50-one-piece-panoramic-visor-lens');
 const pos=visor.geometry.getAttribute('position');
 let lo=Infinity,hi=-Infinity;
 for(let i=0;i<pos.count;i++){
  lo=Math.min(lo,pos.getZ(i));hi=Math.max(hi,pos.getZ(i));
 }
 assert.ok(hi-lo>.50,'panoramic lens wraps toward temples');
 assert.ok(bounds(visor).getSize(new THREE.Vector3()).x>7.35);
 const m17=bounds(model('gas-m17').getObjectByName('m17-full-facepiece'));
 const m40=bounds(model('gas-m40').getObjectByName('m40-full-facepiece'));
 assert.ok(m17.getSize(new THREE.Vector3()).x>
  m40.getSize(new THREE.Vector3()).x,'M17 fuller cheeks than M40');
});
test('R20: geometry complexity and bounds remain mobile friendly',()=>{
 for(const id of ['half-mask','respirator-half','gas-gp5',
  'gas-m17','gas-m40','gas-m50']){
  const g=model(id),b=bounds(g);
  assert.ok(b.min.x>-7&&b.max.x<7,id+' x');
  assert.ok(b.min.y>-4.5&&b.max.y<8.5,id+' y');
  assert.ok(b.min.z>-10&&b.max.z<6,id+' z');
  let tris=0,meshes=0;
  g.traverse(o=>{
   if(!o.isMesh)return;
   meshes++;
   tris+=(o.geometry.index?.count||
    o.geometry.getAttribute('position')?.count||0)/3;
  });
  assert.ok(tris<900,id+' total triangles '+tris);
  assert.ok(meshes<35,id+' meshes '+meshes);
 }
});
test('R20: mode switch does not rebuild preallocated geometry',()=>{
 const g=model('respirator-half');
 const a=g.children[0].children[0].geometry;
 g.children[0].visible=false;g.children[1].visible=true;
 g.children[1].visible=false;g.children[0].visible=true;
 assert.strictEqual(a,g.children[0].children[0].geometry);
});
