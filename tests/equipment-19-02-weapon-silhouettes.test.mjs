import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {weaponSilhouetteParts,buildWeaponSilhouette,clearWeaponSilhouette}
 from '../src/breach-weapon-geometry.ts';
import {WEAPON_PLATFORMS} from '../src/equipment-weapon-assemblies.ts';
import {GRIPS} from '../src/breach-weapon-pose.ts';

const ids=['carbine','smg','rifle','shotgun'];
test('19.02 four readable silhouettes with muzzle aligned to shot-time x',()=>{
 const keys=new Set();
 const steel=new THREE.MeshBasicMaterial(),dark=new THREE.MeshBasicMaterial();
 for(const id of ids){
  const parts=weaponSilhouetteParts(id);
  assert.ok(parts.length>=8);
  keys.add(JSON.stringify(parts));
  const g=buildWeaponSilhouette(id,steel,dark);
  const box=new THREE.Box3().setFromObject(g);
  assert.ok(Math.abs(box.max.x-WEAPON_PLATFORMS[id].muzzleX)<.01,
   id+' muzzle shape extends past physical muzzle');
  assert.ok(box.min.x<=-13.48,id+' missing stock');
  assert.equal(g.children.length,parts.length);
  clearWeaponSilhouette(g);
  assert.equal(g.children.length,0);
  assert.deepEqual({...GRIPS[id]},Object.fromEntries(
   ['lengthScale','stockX','primaryX','primaryY','supportX','supportY'].map(k=>[k,WEAPON_PLATFORMS[id][k]])));
 }
 assert.equal(keys.size,4);
 steel.dispose();dark.dispose();
});
