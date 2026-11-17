import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildWeaponSilhouette,clearWeaponSilhouette,
 weaponSilhouetteParts,weaponDetailParts,weaponSignatureParts}
 from '../src/breach-weapon-geometry.ts';
import {compileLegacyShotgunBody}
 from '../src/weapons/geometry/legacy-shotgun-rigid-compile.ts';
import {mapBoxPixelUV} from '../src/rendering/pixel-materials.ts';
import {measureWeaponVisual} from '../scripts/audit-weapon-production-m30.mjs';

function originalShotgun(steel,dark){
 const root=new THREE.Group();
 // Mirror the untouched legacy builder's authored parts for an independent
 // comparison. This includes the special butt-plate default stock socket.
 for(const [baseX,y,z,baseW,h,d,mat] of weaponSilhouetteParts('shotgun')){
  let x=baseX,w=baseW;
  if(baseX< -12)x=-13.5+baseW/2;
  else if(baseX< -8){
   const front=baseX+baseW/2;
   w=Math.max(1.2,front+13.5);x=(front-13.5)/2;
  }
  const mesh=new THREE.Mesh(mapBoxPixelUV(new THREE.BoxGeometry(w,h,d),
   w,h,d),mat===0?steel:dark);
  mesh.position.set(x,y,z);
  mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);
 }
 for(const [x,y,z,w,h,d,mat] of
  [...weaponDetailParts('shotgun'),...weaponSignatureParts('shotgun')]){
  const mesh=new THREE.Mesh(mapBoxPixelUV(new THREE.BoxGeometry(w,h,d),
   w,h,d),mat===0?steel:dark);
  mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;
  root.add(mesh);
 }
 return root;
}
const bounds=root=>{
 root.updateMatrixWorld(true);
 const box=new THREE.Box3().setFromObject(root);
 return [box.min.toArray(),box.max.toArray()];
};
function triangleSignature(root,material){
 const signatures=[];
 root.updateMatrixWorld(true);
 root.traverse(mesh=>{
  if(!(mesh instanceof THREE.Mesh)||mesh.material!==material)return;
  const geometry=mesh.geometry;
  const pos=geometry.getAttribute('position');
  const normals=geometry.getAttribute('normal');
  const uv=geometry.getAttribute('uv');
  const indices=geometry.getIndex();
  const vertex=(idx)=>{
   const p=new THREE.Vector3().fromBufferAttribute(pos,idx)
    .applyMatrix4(mesh.matrixWorld);
   const n=new THREE.Vector3().fromBufferAttribute(normals,idx)
    .transformDirection(mesh.matrixWorld);
   const tex=uv?[uv.getX(idx),uv.getY(idx)]:[0,0];
   return [...p.toArray(),...n.toArray(),...tex]
    .map(v=>v.toFixed(5)).join(',');
  };
  for(let i=0;i<(indices?.count??pos.count);i+=3){
   const ids=[i,i+1,i+2].map(k=>indices?indices.getX(k):k);
   signatures.push(ids.map(vertex).join('|'));
  }
 });
 return signatures.sort();
}

test('M3.0C1 compiles real shotgun from 20 submissions to two',()=>{
 const steel=new THREE.MeshBasicMaterial(),dark=new THREE.MeshBasicMaterial();
 const original=originalShotgun(steel,dark);
 const optimized=buildWeaponSilhouette('shotgun',steel,dark);
 const origStats=measureWeaponVisual(original);
 const newStats=measureWeaponVisual(optimized);
 assert.equal(origStats.submissions,20);
 assert.equal(newStats.submissions,2);
 assert.equal(origStats.triangles,240);
 assert.equal(newStats.triangles,origStats.triangles);
 const optimizedBounds=bounds(optimized),originalBounds=bounds(original);
 for(let end=0;end<2;end++)for(let axis=0;axis<3;axis++)
  assert.ok(Math.abs(optimizedBounds[end][axis]-
   originalBounds[end][axis])<.00001,
   'baking f32 geometry should preserve world bounds within 1e-5');
 for(const mat of [steel,dark])
  assert.deepEqual(triangleSignature(optimized,mat),triangleSignature(original,mat),
   'all world-space triangles, outward normals and pixel UVs must match');
 assert.equal(new Set(optimized.children.map(m=>m.material)).size,2);
 assert.ok(optimized.children.every(m=>m.castShadow&&m.receiveShadow));
 clearWeaponSilhouette(original);clearWeaponSilhouette(optimized);
 steel.dispose();dark.dispose();
});

test('M3.0C1 compiler refuses metadata, independent visibility and material mismatch',()=>{
 const root=new THREE.Group(),steel=new THREE.MeshBasicMaterial();
 const make=(id)=>{const m=new THREE.Mesh(
  new THREE.BoxGeometry(1,1,1),steel);m.name=id;root.add(m);return m;};
 const a=make(''),b=make(''),c=make('live-selection');
 const d=make('');d.visible=false;
 const e=make('');e.userData.ownedByMagazine=true;
 const f=make('');f.material=new THREE.MeshBasicMaterial({
  transparent:true,opacity:.4});
 const ret=compileLegacyShotgunBody(root);
 assert.equal(ret.sourceMeshes,2);
 assert.equal(ret.compiledMeshes,1);
 assert.equal(ret.avoidedSubmissions,1);
 for(const mesh of [c,d,e,f])assert.ok(root.children.includes(mesh));
 assert.equal(root.children.length,5,'one merged plus four protected');
 clearWeaponSilhouette(root);steel.dispose();f.material.dispose();
});
