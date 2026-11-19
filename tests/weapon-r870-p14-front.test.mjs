import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {initialWeaponConfiguration,selectWeaponFamilyPreset,resolveWeaponAssembly}
 from '../src/equipment-weapon-assemblies.ts';
import {proposeFamilyPartChange,validFamilyBuild,readWeaponFamilyBuild}
 from '../src/equipment-weapon-families.ts';
import {buildWeaponSilhouette,clearWeaponSilhouette} from '../src/breach-weapon-geometry.ts';
import {liveMagazineCapacity,fitMagazineInventory}
 from '../src/arsenal/live-magazine-capacity.ts';
import {riflePoseContacts} from '../src/breach-weapon-contact-zones.ts';
import {arsenalRecipeFromLegacy,arsenalRecipeToLegacy} from '../src/arsenal/recipes.ts';
import {r870Barrel,r870Tube,r870FrontCompatible} from '../src/weapons/geometry/r870-front-p14.ts';
const preset=id=>selectWeaponFamilyPreset(initialWeaponConfiguration('shotgun'),id);
function render(c){
 const m=new THREE.MeshBasicMaterial(),gun=buildWeaponSilhouette('shotgun',m,m,c);
 return {gun,dispose:()=>{clearWeaponSilhouette(gun);m.dispose()}};
}
const box=o=>new THREE.Box3().setFromObject(o);
test('P14.A factory presets share the same 870 renderer and original police setup',()=>{
 for(const [id,capacity,muzzle] of [
  ['r870-police-wood',6,19.20],
  ['r870-police-extended',8,19.20],
  ['r870-tac14',4,15.36]]){
  const config=preset(id);assert.ok(config.build,id);
  assert.equal(validFamilyBuild(config.build,'shotgun'),true,id);
  assert.equal(liveMagazineCapacity('shotgun',config),capacity,id);
  assert.equal(resolveWeaponAssembly(config).muzzleX,muzzle,id);
  const recipe=arsenalRecipeFromLegacy(config);
  assert.deepEqual(arsenalRecipeToLegacy(recipe)?.build,config.build,'save round trip');
  const {gun,dispose}=render(config);
  try{
   const barrel=gun.children.find(x=>x.userData.r870Barrel);
   const cap=gun.children.find(x=>x.userData.r870TubeCap);
   const sight=gun.children.find(x=>x.userData.r870FrontSight);
   assert.ok(barrel&&cap&&sight);
   assert.ok(Math.abs(box(barrel).max.x-muzzle)<.02,id+' barrel muzzle');
   assert.ok(Math.abs(sight.position.x-(muzzle-.42))<.02);
   assert.ok(Math.abs(box(cap).max.x-r870Tube(config.build.parts.magazine).capEnd)<.02);
   assert.equal(Boolean(gun.children.find(x=>x.userData.r870BarrelClamp)),capacity===8);
  }finally{dispose()}
 }
});
test('P14.A component selection replaces physically incompatible tube/barrel/pump as one proposal',()=>{
 const base=preset('r870-police-wood').build;
 let next=proposeFamilyPartChange(base,'shotgun','barrel','r870-14-bead');
 assert.equal(next.valid,true);
 assert.equal(next.build.parts.magazine,'r870-short-tube');
 assert.equal(next.build.parts.handguard,'r870-short-black-pump');
 assert.ok(next.replacements.some(x=>x.slot==='magazine'));
 assert.ok(next.replacements.some(x=>x.slot==='handguard'));
 assert.equal(validFamilyBuild(next.build,'shotgun'),true);
 next=proposeFamilyPartChange(next.build,'shotgun','magazine','r870-extended-tube');
 assert.equal(next.valid,true);
 assert.equal(next.build.parts.barrel,'r870-18-bead');
 assert.equal(validFamilyBuild(next.build,'shotgun'),true);
 assert.equal(r870FrontCompatible('r870-14-bead','r870-extended-tube','r870-short-black-pump'),false);
 const corrupt={...base,parts:{...base.parts,barrel:'r870-14-bead',magazine:'r870-extended-tube'}};
 assert.equal(validFamilyBuild(corrupt,'shotgun'),false);
 const repaired=readWeaponFamilyBuild(corrupt,'shotgun');
 assert.ok(repaired);
 assert.equal(repaired.parts.magazine,'r870-short-tube');
 assert.equal(repaired.parts.handguard,'r870-short-black-pump');
});
test('P14.A tube capacity transitions preserve all owned shells and adjust physical support reach',()=>{
 const full=preset('r870-police-wood'),short=preset('r870-tac14');
 const fitted=fitMagazineInventory('operator','shotgun',short,6,18,[]);
 assert.equal(fitted.magazine,4);
 assert.equal(fitted.reserve,20,'excess loaded shells move into reserve');
 const fullPose=riflePoseContacts('shotgun',full),shortPose=riflePoseContacts('shotgun',short);
 assert.ok(fullPose&&shortPose);
 assert.ok(shortPose.support.far.x<fullPose.support.far.x);
 assert.ok(shortPose.support.far.x<10);
 assert.equal(r870Barrel('r870-14-bead').nominalInches,14);
 assert.equal(r870Tube('r870-extended-tube').capacity,8);
});
