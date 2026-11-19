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
const bound=o=>new THREE.Box3().setFromObject(o);
test('P16.A field barrel creates a genuinely longer vent-rib profile with a smooth slender pump',()=>{
 const c=cfg('r870-field-26'),police=cfg('r870-police-wood');
 assert.ok(c.build&&validFamilyBuild(c.build,'shotgun'));
 assert.ok(arsenalFactoryChoices('remington870').some(x=>x.id==='r870-field-26'));
 assert.equal(liveMagazineCapacity('shotgun',c),6,'field barrel is not fictitious extra capacity');
 assert.equal(resolveWeaponAssembly(c).muzzleX,26.88);
 assert.ok(resolveWeaponAssembly(c).rotationalInertia>resolveWeaponAssembly(police).rotationalInertia);
 assert.ok(resolveWeaponAssembly(c).massKg>resolveWeaponAssembly(police).massKg);
 const recipe=arsenalRecipeFromLegacy(c);
 assert.deepEqual(arsenalRecipeToLegacy(recipe)?.build,c.build);
 const material=new THREE.MeshBasicMaterial(),g=buildWeaponSilhouette('shotgun',material,material,c);
 try{
  assert.equal(g.userData.r870P16Sport,true);
  const barrel=g.children.find(x=>x.userData.r870Barrel);
  const pump=g.children.find(x=>x.userData.r870PumpSides===6);
  assert.ok(barrel&&pump);
  assert.ok(Math.abs(bound(barrel).max.x-26.88)<.03);
  assert.ok(Math.abs(bound(pump).max.x-12.50)<.03);
  assert.equal(g.children.filter(x=>x.userData.r870VentilatedRib).length,1);
  assert.equal(g.children.filter(x=>x.userData.r870VentRibSupport).length,3);
  assert.equal(g.children.filter(x=>x.userData.r870GrooveBatch).length,0,
    'sporting fore-end is smooth, no empty decorative groove draw call');
  assert.equal(g.children.filter(x=>x.userData.r870PumpPart).length,1);
  const tris=g.children.reduce((sum,m)=>sum+
   (m.geometry.index?.count??m.geometry.getAttribute('position').count)/3,0);
  assert.ok(tris<300,'sporting model stays budgeted: '+tris);
 }finally{clearWeaponSilhouette(g);material.dispose()}
});
test('P16.A long sporting barrel auto-pairs field pump, preserves 6-round tube, and rejects tactical extensions',()=>{
 const base=cfg('r870-police-wood').build;
 const change=proposeFamilyPartChange(base,'shotgun','barrel','r870-26-ventrib');
 assert.equal(change.valid,true);
 assert.equal(change.build.parts.magazine,'r870-standard-tube');
 assert.equal(change.build.parts.handguard,'r870-sport-wood-pump');
 const extended=proposeFamilyPartChange(change.build,'shotgun','magazine','r870-extended-tube');
 assert.equal(extended.valid,true);
 assert.equal(extended.build.parts.barrel,'r870-18-bead');
 assert.equal(extended.build.parts.handguard,'r870-police-wood-pump');
 assert.equal(r870FrontCompatible('r870-26-ventrib','r870-extended-tube','r870-sport-wood-pump'),false);
 const damaged={...base,parts:{...base.parts,barrel:'r870-26-ventrib'}};
 const normalized=readWeaponFamilyBuild(damaged,'shotgun');
 assert.equal(normalized?.parts.handguard,'r870-sport-wood-pump');
 assert.equal(normalized?.parts.magazine,'r870-standard-tube');
});
