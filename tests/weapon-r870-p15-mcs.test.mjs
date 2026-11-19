import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {initialWeaponConfiguration,selectWeaponFamilyPreset,resolveWeaponAssembly}
 from '../src/equipment-weapon-assemblies.ts';
import {buildWeaponSilhouette,clearWeaponSilhouette} from '../src/breach-weapon-geometry.ts';
import {validFamilyBuild,proposeFamilyPartChange,readWeaponFamilyBuild}
 from '../src/equipment-weapon-families.ts';
import {liveMagazineCapacity,fitMagazineInventory}
 from '../src/arsenal/live-magazine-capacity.ts';
import {arsenalFactoryChoices} from '../src/arsenal/factory-recipes.ts';
import {riflePoseContacts} from '../src/breach-weapon-contact-zones.ts';
import {r870FrontCompatible,r870Barrel,r870Tube}
 from '../src/weapons/geometry/r870-front-p14.ts';
const cfg=id=>selectWeaponFamilyPreset(initialWeaponConfiguration('shotgun'),id);
const minmax=o=>new THREE.Box3().setFromObject(o);
test('P15.A compact MCS-style factory has distinctive 10-inch front with real three-shell capacity',()=>{
 const c=cfg('r870-mcs-breacher'),build=c.build;
 assert.ok(build&&validFamilyBuild(build,'shotgun'));
 assert.ok(arsenalFactoryChoices('remington870').some(x=>x.id==='r870-mcs-breacher'));
 assert.equal(liveMagazineCapacity('shotgun',c),3);
 assert.equal(resolveWeaponAssembly(c).muzzleX,11.52);
 assert.equal(r870Barrel(build.parts.barrel).nominalInches,10);
 assert.equal(r870Tube(build.parts.magazine).capacity,3);
 const m=new THREE.MeshBasicMaterial(),g=buildWeaponSilhouette('shotgun',m,m,c);
 try{
  const b=g.children.find(x=>x.userData.r870Barrel);
  const t=g.children.find(x=>x.userData.r870TubeCap);
  const pump=g.children.find(x=>x.userData.r870PumpSides===6);
  const grooves=g.children.find(x=>x.userData.r870GrooveBatch);
  assert.ok(b&&t&&pump&&grooves);
  assert.ok(Math.abs(minmax(b).max.x-11.52)<.025);
  assert.ok(Math.abs(minmax(t).max.x-8.57)<.025);
  assert.ok(Math.abs(minmax(pump).max.x-7.25)<.025);
  assert.equal(grooves.userData.r870GrooveCount,6);
  assert.ok(minmax(pump).max.x<minmax(t).max.x);
  assert.equal(g.userData.r870ShoulderStock,false);
 }finally{clearWeaponSilhouette(g);m.dispose()}
});
test('P15.A cross-length selection is atomic and rejects 10/14/18-inch mismatches',()=>{
 const base=cfg('r870-police-wood').build;
 const mini=proposeFamilyPartChange(base,'shotgun','barrel','r870-10-bead');
 assert.equal(mini.valid,true);
 assert.equal(mini.build.parts.magazine,'r870-mcs-mini-tube');
 assert.equal(mini.build.parts.handguard,'r870-mcs-mini-pump');
 assert.ok(mini.replacements.length>=3);
 assert.equal(validFamilyBuild(mini.build,'shotgun'),true);
 const mid=proposeFamilyPartChange(mini.build,'shotgun','magazine','r870-short-tube');
 assert.equal(mid.valid,true);
 assert.equal(mid.build.parts.barrel,'r870-14-bead');
 assert.equal(mid.build.parts.handguard,'r870-short-black-pump');
 const back=proposeFamilyPartChange(mid.build,'shotgun','handguard','r870-police-black-pump');
 assert.equal(back.valid,true);
 assert.equal(back.build.parts.barrel,'r870-18-bead');
 assert.equal(back.build.parts.magazine,'r870-standard-tube');
 for(const [barrel,tube,pump] of [
  ['r870-10-bead','r870-short-tube','r870-short-black-pump'],
  ['r870-14-bead','r870-mcs-mini-tube','r870-mcs-mini-pump'],
  ['r870-18-bead','r870-mcs-mini-tube','r870-police-wood-pump']])
  assert.equal(r870FrontCompatible(barrel,tube,pump),false);
 const corrupt={...base,parts:{...base.parts,barrel:'r870-10-bead'}};
 const repaired=readWeaponFamilyBuild(corrupt,'shotgun');
 assert.equal(repaired?.parts.magazine,'r870-mcs-mini-tube');
 assert.equal(repaired?.parts.handguard,'r870-mcs-mini-pump');
});
test('P15.A lower capacity preserves shells and short fore-end poses stay on actual geometry',()=>{
 const c=cfg('r870-mcs-breacher'),pose=riflePoseContacts('shotgun',c);
 assert.ok(pose);
 assert.ok(pose.support.far.x<=6.4);
 const fitted=fitMagazineInventory('unit','shotgun',c,8,12,[]);
 assert.equal(fitted.magazine,3);
 assert.equal(fitted.reserve,17);
});
