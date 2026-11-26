import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildWeaponSilhouette,clearWeaponSilhouette}
 from '../src/breach-weapon-geometry.ts';
import {WEAPON_PLATFORMS} from '../src/equipment-weapon-assemblies.ts';
import {GRIPS} from '../src/breach-weapon-pose.ts';

const ids=['carbine','smg','rifle','shotgun'];
test('19.02 current catalog artwork replaces all placeholder silhouettes',()=>{
 const steel=new THREE.MeshBasicMaterial(),dark=new THREE.MeshBasicMaterial();
 for(const id of ids){
  const g=buildWeaponSilhouette(id,steel,dark);
  const box=new THREE.Box3().setFromObject(g);
  assert.ok(Number.isFinite(box.min.x)&&Number.isFinite(box.max.x),
   id+' needs actual visible firearm geometry');
  assert.ok(box.max.x>box.min.x+15,id+' lost its recognizable length');
  assert.ok(g.children.some(n=>n.name.startsWith('family-')),id+' named authored geometry');
  clearWeaponSilhouette(g);
  assert.equal(g.children.length,0);
  assert.deepEqual({...GRIPS[id]},Object.fromEntries(
   ['lengthScale','stockX','primaryX','primaryY','supportX','supportY']
    .map(k=>[k,WEAPON_PLATFORMS[id][k]])));
 }
 steel.dispose();dark.dispose();
});
