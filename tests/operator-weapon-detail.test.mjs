import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildWeaponSilhouette,clearWeaponSilhouette} from '../src/breach-weapon-geometry.ts';
import {issueWeaponPreset,resolveCatalogConfiguration} from '../src/breach-weapon-issue.ts';
test('every compatibility-only appearance resolves to actual named catalog artwork',()=>{
 const steel=new THREE.MeshStandardMaterial(),dark=new THREE.MeshStandardMaterial();
 for(const [id,preset] of [['carbine','ar-m4a1'],['smg','hk-mp5a3'],['rifle','ar-m16a2'],['shotgun','r870-police-wood']]){
  const g=buildWeaponSilhouette(id,steel,dark);
  const config=issueWeaponPreset(preset).weaponConfiguration;
  const actual=buildWeaponSilhouette(id,steel,dark,config,{rigidCompilation:'disabled'});
  assert.ok(g.children.length>0);
  assert.deepEqual(g.children.map(n=>n.name),actual.children.map(n=>n.name));
  assert.ok(g.children.some(n=>n.name.startsWith('family-')));
  clearWeaponSilhouette(g);clearWeaponSilhouette(actual);
 }
 assert.equal(resolveCatalogConfiguration(undefined,'shotgun','ar-m4a1').build.family,'r870');
 steel.dispose();dark.dispose();
});
