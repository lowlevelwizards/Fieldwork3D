import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {initialWeaponConfiguration,selectWeaponFamilyPreset,resolveWeaponAssembly}
 from '../src/equipment-weapon-assemblies.ts';
import {validFamilyBuild,proposeFamilyPartChange,readWeaponFamilyBuild}
 from '../src/equipment-weapon-families.ts';
import {buildWeaponSilhouette,clearWeaponSilhouette} from '../src/breach-weapon-geometry.ts';
import {arsenalFactoryChoices} from '../src/arsenal/factory-recipes.ts';
import {arsenalRecipeFromLegacy,arsenalRecipeToLegacy} from '../src/arsenal/recipes.ts';
import {liveMagazineCapacity} from '../src/arsenal/live-magazine-capacity.ts';
import {r870FrontCompatible} from '../src/weapons/geometry/r870-front-p14.ts';
const cfg=id=>selectWeaponFamilyPreset(initialWeaponConfiguration('shotgun'),id);
const box=o=>new THREE.Box3().setFromObject(o);
test('P16.B 20-inch rifle-sighted variant has distinctive physical sights, unchanged shell feed',()=>{
 const c=cfg('r870-rifle-sighted-20');
 assert.ok(c.build&&validFamilyBuild(c.build,'shotgun'));
 assert.ok(arsenalFactoryChoices('remington870').some(x=>x.id==='r870-rifle-sighted-20'));
 assert.equal(liveMagazineCapacity('shotgun',c),6);
 assert.equal(resolveWeaponAssembly(c).muzzleX,21.12);
 const recipe=arsenalRecipeFromLegacy(c);
 assert.deepEqual(arsenalRecipeToLegacy(recipe)?.build,c.build);
 const material=new THREE.MeshBasicMaterial();
 const gun=buildWeaponSilhouette('shotgun',material,material,c);
 try{
  assert.equal(gun.userData.r870P16RifleSight,true);
  const barrel=gun.children.find(x=>x.userData.r870Barrel);
  const front=gun.children.find(x=>x.userData.r870FrontSight);
  const rear=gun.children.find(x=>x.userData.r870RearRifleSight);
  assert.ok(barrel&&front&&rear);
  assert.ok(Math.abs(box(barrel).max.x-21.12)<.025);
  assert.ok(box(front).max.y>2.2,'oversized front blade above barrel');
  assert.ok(box(rear).max.y>2.4,'distinct rear sight silhouette');
  assert.equal(gun.children.filter(x=>x.userData.r870VentilatedRib).length,0,
    'rifle sights must not silently add sporting rib');
  assert.equal(gun.children.filter(x=>x.userData.r870PumpPart).length,2);
  const triangles=gun.children.reduce((n,mesh)=>n+
   (mesh.geometry.index?.count??mesh.geometry.getAttribute('position').count)/3,0);
  assert.ok(triangles<=280,'single rear sight remains low poly: '+triangles);
 }finally{clearWeaponSilhouette(gun);material.dispose()}
});
test('P16.B mid-length rifle sight is a legal, saved, atomic front choice',()=>{
 const factory=cfg('r870-police-wood').build;
 const change=proposeFamilyPartChange(factory,'shotgun','barrel','r870-20-rifle-sight');
 assert.equal(change.valid,true);
 assert.equal(change.build.parts.magazine,'r870-standard-tube');
 assert.equal(change.build.parts.handguard,'r870-police-wood-pump');
 assert.equal(validFamilyBuild(change.build,'shotgun'),true);
 assert.equal(r870FrontCompatible('r870-20-rifle-sight','r870-extended-tube','r870-police-black-pump'),false);
 const black=proposeFamilyPartChange(change.build,'shotgun','handguard','r870-police-black-pump');
 assert.equal(black.valid,true);
 assert.equal(black.build.parts.barrel,'r870-20-rifle-sight');
 const mlok=proposeFamilyPartChange(black.build,'shotgun','handguard','r870-magpul-mlok-pump');
 assert.equal(mlok.valid,true);
 assert.equal(mlok.build.parts.barrel,'r870-18-bead');
 const corrupt={...factory,parts:{...factory.parts,barrel:'r870-20-rifle-sight',magazine:'r870-short-tube'}};
 const repaired=readWeaponFamilyBuild(corrupt,'shotgun');
 assert.ok(repaired);
 assert.equal(repaired.parts.magazine,'r870-standard-tube');
});
