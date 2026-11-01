import test from 'node:test';
import assert from 'node:assert/strict';
import {weaponSilhouetteParts} from '../src/breach-weapon-geometry.ts';
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
const within=(x,y,part)=>Math.abs(x-part[0])<=part[3]/2+.25&&
 Math.abs(y-part[1])<=part[4]/2+1.2;
test('24.00 both hand sockets actually touch modeled furniture on every platform',()=>{
 for(const [id,loc] of Object.entries(platforms)){
  const parts=weaponSilhouetteParts(id);
  const g=weaponGrips(id);
  assert.ok(within(g.primaryX,g.primaryY,parts[loc.pistol]),id+' firing hand misses pistol grip');
  assert.ok(within(g.supportX,g.supportY,parts[loc.guard]),id+' support hand misses handguard/pump');
  assert.ok(g.supportX>g.primaryX+4,id+' hands overlap receiver');
  assert.ok(Math.abs(1.8-parts[loc.pistol][5]/2)<1,id+' firing hand too far from grip side');
  assert.ok(Math.abs(-1.6+parts[loc.guard][5]/2)<1,id+' support hand too far from guard');
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
