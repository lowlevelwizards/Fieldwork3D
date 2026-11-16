/** FNC P30: the two chunky front sight ears must sit within their gas-block shoulders. */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {FNC_FRONT_P13 as F} from '../src/weapons/geometry/fnc-front-layout.ts';
import {buildFNCStage1Silhouette,FNC_P1} from '../src/weapons/geometry/fnc-stage1-blockout.ts';
import {buildWeaponSilhouette,clearWeaponSilhouette} from '../src/breach-weapon-geometry.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset} from '../src/equipment-weapon-assemblies.ts';
import {countGeometry} from '../scripts/audit-weapon-geometry.mjs';
const near=(a,b,t=.005)=>Math.abs(a-b)<t;
const bb=x=>new THREE.Box3().setFromObject(x);
const one=(g,k)=>g.children.find(x=>x.userData[k]);
const both=(g,k)=>g.children.filter(x=>x.userData[k]);

test('P30 twin front sight posts are narrower than the gas-block sides with positive inset',()=>{
 const m=new THREE.MeshBasicMaterial(),g=buildFNCStage1Silhouette(m);
 const ears=both(g,'fncP20SimpleSightEar'),gas=one(g,'fncP22ContinuousGasBlock');
 assert.equal(ears.length,2);assert.ok(gas);
 assert.ok(near(F.sight.earDepth,.60));
 assert.ok(near(F.sight.earHalfSpacing,.65),'spacing stays at approved P29 setting');
 const gasSideHalfZ=.98; // P29 gasCross forward shoulder's half-width
 const outerZ=F.sight.earHalfSpacing+F.sight.earDepth/2;
 assert.ok(gasSideHalfZ-outerZ>=.025,
  'sight post outer sides sit inside the broad gas-block mount shoulders');
 assert.ok(outerZ<gasSideHalfZ);
 const ordered=ears.slice().sort((a,b)=>bb(a).min.z-bb(b).min.z);
 assert.ok(near(bb(ordered[0]).min.z,-outerZ));
 assert.ok(near(bb(ordered[1]).max.z,outerZ));
 assert.ok(ordered.every(e=>near(bb(e).max.z-bb(e).min.z,.60)));
 assert.ok(bb(ordered[0]).max.z<bb(ordered[1]).min.z-.50,
  'open negative space stays legible');
 assert.ok(ordered.every(e=>bb(e).intersectsBox(bb(gas))));
 // The roof is narrower than the shoulder. Each post must still overlap
 // the actual flat roof footprint as well, not merely touch a bounding box.
 assert.ok(F.sight.earHalfSpacing-F.sight.earDepth/2<.73,
  'posts remain physically supported by the gas-block upper surface');
 clearWeaponSilhouette(g);m.dispose();
});

test('P30 reduces only sight post cross-width, not height, length or anchors',()=>{
 const m=new THREE.MeshBasicMaterial(),g=buildFNCStage1Silhouette(m);
 const ears=both(g,'fncP20SimpleSightEar'),base=one(g,'fncP24RearwardLowerGasBlock');
 assert.ok(base);
 for(const e of ears){
  const b=bb(e);
  assert.ok(near(b.min.y,F.sight.earBottomY));
  assert.ok(near(b.max.y,F.sight.earTopY));
  assert.ok(near(b.max.x-b.min.x,F.sight.earLength));
  assert.ok(near((b.max.x+b.min.x)/2,F.sight.earX));
  assert.equal(e.geometry.getAttribute('position').count,36,
   'retain original simple four-corner ear without any detail mesh');
 }
 assert.ok(near(F.sight.earTopY,2.42));
 assert.ok(near(F.sight.earX,14.26));
 assert.ok(near(F.barrel.axisY,0));
 assert.ok(near(F.muzzle.centerX+F.muzzle.length/2,FNC_P1.muzzleX));
 clearWeaponSilhouette(g);m.dispose();
});

test('P30 keeps factory silhouette at 536 triangles and 23 meshes',()=>{
 const mat=new THREE.MeshBasicMaterial();
 const cfg=selectWeaponFamilyPreset(initialWeaponConfiguration('rifle'),'fnc-service');
 const gun=buildWeaponSilhouette('rifle',mat,mat,cfg);
 const audit=countGeometry(gun);
 assert.equal(audit.triangles,536);
 assert.equal(audit.meshes,23);
 const gas=one(gun,'fncP22ContinuousGasBlock');
 assert.deepEqual(gas.userData.fncPixelVentCounts,{left:4,right:4,top:4});
 assert.ok(one(gun,'fncSharedARStanag'));
 const noFactoryMuzzle=buildFNCStage1Silhouette(mat,{},false);
 assert.equal(both(noFactoryMuzzle,'fncP20SimpleSightEar').length,2);
 assert.ok(!one(noFactoryMuzzle,'fncMuzzle'));
 clearWeaponSilhouette(noFactoryMuzzle);clearWeaponSilhouette(gun);mat.dispose();
});
