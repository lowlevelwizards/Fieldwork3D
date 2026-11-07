import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {weaponDetailParts,weaponSignatureParts,weaponSilhouetteParts,
  buildWeaponSilhouette,clearWeaponSilhouette} from '../src/breach-weapon-geometry.ts';
import {WEAPON_PLATFORMS} from '../src/equipment-weapon-assemblies.ts';

test('retired class art is absent; unconfigured classes use real current weapons',()=>{
 const dark=new THREE.MeshStandardMaterial(),steel=new THREE.MeshStandardMaterial();
 for(const id of ['smg','carbine','rifle']){
  assert.equal(weaponDetailParts(id).length,0);
  assert.equal(weaponSignatureParts(id).length,0);
  assert.equal(weaponSilhouetteParts(id).length,0);
  const model=buildWeaponSilhouette(id,steel,dark);
  let namedFamilyPieces=0;
  model.traverse(child=>{
   if(child.name.startsWith('family-'))namedFamilyPieces++;
  });
  assert.ok(namedFamilyPieces>0,id+' should render a current authored weapon');
  clearWeaponSilhouette(model);
 }
 dark.dispose();steel.dispose();
});

test('pump shotgun retains its dedicated detailed silhouette and muzzle',()=>{
 const id='shotgun',details=weaponDetailParts(id);
 const signature=weaponSignatureParts(id);
 assert.ok(signature.length>=5);
 assert.ok(details.length>=5);
 assert.ok(signature.every(part=>part.every(Number.isFinite)));
 assert.ok(details.every(([x,y,z,w,h,d])=>
  [x,y,z,w,h,d].every(Number.isFinite)&&
  x+w/2<=WEAPON_PLATFORMS[id].muzzleX));
 const steel=new THREE.MeshStandardMaterial(),dark=new THREE.MeshStandardMaterial();
 const model=buildWeaponSilhouette(id,steel,dark);
 assert.equal(model.children.length,
  details.length+signature.length+weaponSilhouetteParts(id).length);
 clearWeaponSilhouette(model);
 steel.dispose();dark.dispose();
});
