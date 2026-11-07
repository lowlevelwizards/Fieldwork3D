import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {weaponSilhouetteParts,weaponDetailParts,weaponSignatureParts,
 buildWeaponSilhouette,clearWeaponSilhouette}
 from '../src/breach-weapon-geometry.ts';
import {WEAPON_PLATFORMS} from '../src/equipment-weapon-assemblies.ts';
import {GRIPS} from '../src/breach-weapon-pose.ts';

const ids=['carbine','smg','rifle','shotgun'];
test('19.02 current weapon models replace the three retired class silhouettes',()=>{
 const steel=new THREE.MeshBasicMaterial(),dark=new THREE.MeshBasicMaterial();
 for(const id of ids){
  const g=buildWeaponSilhouette(id,steel,dark);
  const box=new THREE.Box3().setFromObject(g);
  assert.ok(Number.isFinite(box.min.x)&&Number.isFinite(box.max.x),
   id+' needs actual visible firearm geometry');
  assert.ok(box.max.x>box.min.x+15,id+' lost its recognizable length');
  if(id!=='shotgun'){
   assert.equal(weaponSilhouetteParts(id).length,0,id+' retired mesh remains');
   assert.equal(weaponDetailParts(id).length,0);
   assert.equal(weaponSignatureParts(id).length,0);
   let realFamily=false;
   g.traverse(child=>{if(child.name.startsWith('family-'))realFamily=true;});
   assert.ok(realFamily,id+' missing authored family receiver/barrel');
  }else{
   assert.ok(weaponSilhouetteParts(id).length>=8);
   assert.ok(Math.abs(box.max.x-WEAPON_PLATFORMS[id].muzzleX)<.01);
  }
  clearWeaponSilhouette(g);
  assert.equal(g.children.length,0);
  assert.deepEqual({...GRIPS[id]},Object.fromEntries(
   ['lengthScale','stockX','primaryX','primaryY','supportX','supportY']
    .map(k=>[k,WEAPON_PLATFORMS[id][k]])));
 }
 steel.dispose();dark.dispose();
});
