import test from 'node:test';
import assert from 'node:assert/strict';
import {weaponDetailParts,weaponSignatureParts,weaponSilhouetteParts,
 buildWeaponSilhouette} from '../src/breach-weapon-geometry.ts';
import {WEAPON_PLATFORMS} from '../src/equipment-weapon-assemblies.ts';
import * as THREE from 'three';
test('platform details add shape without changing shot-time muzzle position',()=>{
 for(const platform of ['carbine','smg','rifle','shotgun']){
  const details=weaponDetailParts(platform);
  const signature=weaponSignatureParts(platform);
  assert.ok(signature.length>=5);
  assert.ok(signature.every(([x,y,z,w,h,d])=>[x,y,z,w,h,d].every(Number.isFinite)));
  assert.ok(details.length>=5,platform);
  assert.ok(details.every(([x,y,z,w,h,d])=>
   [x,y,z,w,h,d].every(Number.isFinite)&&x+w/2<=WEAPON_PLATFORMS[platform].muzzleX));
  const dark=new THREE.MeshStandardMaterial(),steel=new THREE.MeshStandardMaterial();
  const model=buildWeaponSilhouette(platform,steel,dark);
  assert.equal(model.children.length,
   details.length+weaponSignatureParts(platform).length+weaponSilhouetteParts(platform).length);
  model.traverse(obj=>{if(obj instanceof THREE.Mesh)obj.geometry.dispose();});
  dark.dispose();steel.dispose();
 }
});
