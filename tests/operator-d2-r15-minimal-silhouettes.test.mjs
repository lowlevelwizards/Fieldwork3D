import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createD2Mask} from '../src/operator-d2-mask-visuals.ts';
const one=new THREE.MeshStandardMaterial({color:0x3f4842});
const mat={rubber:one,hardware:one,filters:one,lens:one};
const make=id=>createD2Mask(id,mat);
const items=(g,name)=>{const found=[];g.traverse(x=>{if(x.name===name)found.push(x);});return found;};
const bound=o=>new THREE.Box3().setFromObject(o);
test('R15: six categories retain original saved IDs, modes and distinct hero forms',()=>{
 const half=make('half-mask'),resp=make('respirator-half');
 assert.deepEqual(half.children.map(x=>x.userData.d2MaskMode),['solid','mesh']);
 assert.deepEqual(resp.children.map(x=>x.userData.d2MaskMode),
  ['twin-filter','compact-filter']);
 assert.equal(items(resp,'dual-filter-canister').length,2);
 assert.equal(items(resp,'compact-front-filter').length,1);
 assert.equal(items(half,'dual-filter-canister').length,0);
 const gp=make('gas-gp5'),m17=make('gas-m17'),
  m40=make('gas-m40'),m50=make('gas-m50');
 assert.ok(gp.getObjectByName('gp5-one-piece-rubber-hood'));
 assert.equal(items(gp,'head-harness-back').length,0);
 assert.equal(items(gp,'gp5-round-eye-lens').length,2);
 assert.equal(items(m17,'m17-integrated-cheek-filter').length,2);
 assert.equal(items(m40,'m40-projecting-side-canister').length,1);
 assert.equal(items(m50,'m50-twin-low-cheek-filter').length,2);
 assert.equal(items(m50,'m50-one-piece-panoramic-visor-lens').length,1);
});
test('R15: true eye/visor apertures, integrated bulging cheeks and no generic front slab',()=>{
 const specs=[
  ['half-mask','rigid-half-mask-face',0],
  ['respirator-half','respirator-triangular-seal',0],
  ['gas-gp5','gp5-hood-front',2],
  ['gas-m17','m17-full-facepiece',2],
  ['gas-m40','m40-full-facepiece',2],
  ['gas-m50','m50-facepiece-rim-and-chin',1]
 ];
 for(const [id,hero,n] of specs){
  const g=make(id),primary=g.getObjectByName(hero);
  assert.ok(primary?.isMesh,id+' hero shell exists');
  assert.equal(primary.userData.d2SculptedShell,true,id+' has sculpted shell');
  assert.equal(primary.userData.eyeApertures,n,id+' has true holes');
  assert.ok(primary.geometry instanceof THREE.ExtrudeGeometry);
 }
 const m17=make('gas-m17'),m40=make('gas-m40');
 const m17Body=bound(m17.getObjectByName('m17-full-facepiece'));
 const m40Body=bound(m40.getObjectByName('m40-full-facepiece'));
 assert.ok(m17Body.getSize(new THREE.Vector3()).x>
  m40Body.getSize(new THREE.Vector3()).x,
  'inflated M17 rubber cheek silhouette wider than angular M40');
});
test('R15: M50 panoramic visor wraps visibly, unlike separate M40 eyepieces',()=>{
 const m50=make('gas-m50');
 const v=m50.getObjectByName('m50-one-piece-panoramic-visor-lens');
 assert.ok(v?.geometry instanceof THREE.ShapeGeometry);
 const pos=v.geometry.getAttribute('position');
 let minZ=Infinity,maxZ=-Infinity;
 for(let i=0;i<pos.count;i++){
  minZ=Math.min(minZ,pos.getZ(i));maxZ=Math.max(maxZ,pos.getZ(i));
 }
 assert.ok(maxZ-minZ>.60,'panoramic visor turns toward temples');
 const visorBox=bound(v).getSize(new THREE.Vector3());
 assert.ok(visorBox.x>7,'single broad panorama');
 assert.equal(items(make('gas-m40'),'m40-angular-eyepiece-lens').length,2);
});
test('R15: all models fit canonical skull with bounded major silhouette complexity',()=>{
 for(const id of ['half-mask','respirator-half','gas-gp5',
  'gas-m17','gas-m40','gas-m50']){
  const g=make(id),bounds=bound(g);
  assert.ok(bounds.min.x>-7&&bounds.max.x<7,id+' lateral bounds');
  assert.ok(bounds.min.y>-4.5&&bounds.max.y<8.5,id+' height bounds');
  assert.ok(bounds.min.z>-10&&bounds.max.z<6,id+' depth bounds');
  let tris=0,meshes=0;
  g.traverse(o=>{
   if(!o.isMesh)return;
   meshes++;
   const geo=o.geometry;
   const count=geo.index?geo.index.count:geo.getAttribute('position')?.count||0;
   tris+=count/3;
  });
  assert.ok(tris<2000,id+' triangles '+tris);
  assert.ok(meshes<46,id+' renderable pieces '+meshes);
 }
});
test('R15: retained model geometry is stable across prebuilt cosmetic mode changes',()=>{
 const r=make('respirator-half');
 const geom=r.children[0].children.find(o=>o.isMesh).geometry;
 r.children[0].visible=false;r.children[1].visible=true;
 r.children[0].visible=true;r.children[1].visible=false;
 assert.equal(r.children[0].children.find(o=>o.isMesh).geometry,geom);
});
