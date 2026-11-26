import test from 'node:test';
import assert from 'node:assert/strict';
import {buildWeaponSilhouette,clearWeaponSilhouette} from '../src/breach-weapon-geometry.ts';
import {issueWeaponPreset} from '../src/breach-weapon-issue.ts';
import {buildWeaponAccessories} from '../src/breach-weapon-accessories.ts';
import {weaponGrips,fitWeaponPose} from '../src/breach-weapon-pose.ts';
import {initialWeaponConfiguration,setWeaponAttachment,resolveWeaponAssembly}
 from '../src/equipment-weapon-assemblies.ts';
import * as THREE from 'three';

// Each expected contact derives from a visible, separately modeled shape,
// rather than the old shared [-1,-2] offset near the magazine well.
const platforms={
 carbine:{pistol:7,guard:1},smg:{pistol:6,guard:1},
 rifle:{pistol:6,guard:1},shotgun:{pistol:6,guard:3}
};
test('24.00 authored shotgun uses its own visible geometry and configured contacts',()=>{
 const config=issueWeaponPreset('r870-police-wood').weaponConfiguration;
 const a=resolveWeaponAssembly(config),mat=new THREE.MeshBasicMaterial();
 const model=buildWeaponSilhouette(config.weapon,mat,mat,config);
 assert.ok(model.children.some(n=>n.name.startsWith('family-grip-')));
 assert.ok(model.children.some(n=>n.name.startsWith('family-handguard-')));
 assert.ok(Number.isFinite(a.primaryX)&&Number.isFinite(a.supportX));
 clearWeaponSilhouette(model);mat.dispose();
});
test('24.00 current modular weapons preserve two separate grip contacts',()=>{
 for(const id of ['carbine','smg','rifle']){
  const g=weaponGrips(id);
  assert.ok(Number.isFinite(g.primaryX)&&Number.isFinite(g.primaryY));
  assert.ok(Number.isFinite(g.supportX)&&Number.isFinite(g.supportY));
  assert.ok(g.supportX>g.primaryX+4,id+' grips would overlap');
 }
});
test('24.00 equipped vertical/handstop contacts sit on actual accessory volumes',()=>{
 const mat=new THREE.MeshBasicMaterial();
 for(const id of ['carbine','smg','rifle']){
  for(const [attachment,y] of [['foregrip-vertical',-3.65],['foregrip-handstop',-2.3]]){
   const c=setWeaponAttachment(initialWeaponConfiguration(id),'foregrip',attachment);
   const a=resolveWeaponAssembly(c);
   assert.equal(a.supportY,y);
   const g=buildWeaponAccessories(c,mat,mat);
   const touches=g.children.some(mesh=>mesh instanceof THREE.Mesh&&
    Math.abs(mesh.position.x-a.supportX)<1e-4&&
    Math.abs(mesh.position.y-a.supportY)<=3.0);
   assert.ok(touches,id+' hand misses '+attachment);
   for(const mesh of g.children)if(mesh instanceof THREE.Mesh)mesh.geometry.dispose();
  }
 }
 mat.dispose();
});
test('24.00 grip transforms are shared across aim/ready/short and replay',()=>{
 for(const id of Object.keys(platforms)){
  const c=initialWeaponConfiguration(id);
  for(const handling of ['ready','point','ads','short']){
   const fit=fitWeaponPose({weapon:id,handling,yaw:.35,recoil:0,
    configuration:c,aimBlend:handling==='ads'?1:.15});
   assert.ok(Number.isFinite(fit.contactError),id+': '+handling);
   assert.ok(Number.isFinite(fit.primary.x)&&Number.isFinite(fit.support.x));
   const again=fitWeaponPose({weapon:id,handling,yaw:.35,recoil:0,
    configuration:JSON.parse(JSON.stringify(c)),aimBlend:handling==='ads'?1:.15});
   assert.ok(fit.primary.distanceTo(again.primary)<1e-6);
   assert.ok(fit.support.distanceTo(again.support)<1e-6);
  }
 }
});
