import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {initialWeaponConfiguration,selectWeaponFamilyPreset} from '../src/equipment-weapon-assemblies.ts';
import {FAMILY_PRESETS,proposeFamilyPartChange,validFamilyBuild}
 from '../src/equipment-weapon-families.ts';
import {buildWeaponSilhouette,clearWeaponSilhouette} from '../src/breach-weapon-geometry.ts';
import {arsenalCatalogIssues} from '../src/arsenal/catalog.ts';
import {arsenalFactoryChoices} from '../src/arsenal/factory-recipes.ts';
import {r870RearPair,R870_REAR_PARTS}
 from '../src/weapons/geometry/r870-rear-p12.ts';
const config=id=>selectWeaponFamilyPreset(initialWeaponConfiguration('shotgun'),id);
function model(c){
 const m=new THREE.MeshBasicMaterial(),gun=buildWeaponSilhouette('shotgun',m,m,c);
 return {gun,dispose:()=>{clearWeaponSilhouette(gun);m.dispose()}};
}
const ext=o=>new THREE.Box3().setFromObject(o);
test('P14.B every new preset is discoverable in Arsenal, legal and actually rendered',()=>{
 assert.deepEqual(arsenalCatalogIssues(),[]);
 const refs=arsenalFactoryChoices('remington870');
 for(const id of ['r870-police-wood','r870-police-extended','r870-tac14',
   'r870-police-synthetic','r870-tactical-magpul']){
  assert.ok(FAMILY_PRESETS.some(x=>x.id===id));
  assert.ok(refs.some(x=>x.id===id),'visible factory reference '+id);
  const c=config(id);assert.ok(c.build&&validFamilyBuild(c.build,'shotgun'));
  const {gun,dispose}=model(c);
  try{
   assert.equal(gun.userData.r870FrontFamilyP14,true);
   assert.ok(gun.children.every(x=>x.name.startsWith('family-')));
   assert.ok(gun.children.some(x=>x.userData.r870RightEjectionPort));
   assert.ok(gun.children.some(x=>x.userData.r870FrontSight));
  }finally{dispose()}
 }
});
test('P14.B black synthetic and SGA are independent rear part IDs with art-readable differences',()=>{
 const old=config('r870-police-wood'),police=config('r870-police-synthetic'),sga=config('r870-tactical-magpul');
 assert.equal(r870RearPair(police.build.parts.stock,police.build.parts.grip),'poly');
 assert.equal(r870RearPair(sga.build.parts.stock,sga.build.parts.grip),'sga');
 assert.notDeepEqual(R870_REAR_PARTS.sga.gripOutline,R870_REAR_PARTS.wood.gripOutline);
 assert.notDeepEqual(R870_REAR_PARTS.sga.stockOutline,R870_REAR_PARTS.wood.stockOutline);
 const p=model(police),w=model(old),m=model(sga);
 try{
  const paint=x=>x.children.find(c=>c.userData.r870RearGrip);
  assert.equal(paint(p.gun).material.color.getHex(),0x313735);
  assert.equal(paint(w.gun).material.color.getHex(),0x896947);
  const sgaStock=m.gun.children.find(x=>x.userData.r870StockExtension);
  assert.ok(sgaStock);
  assert.ok(ext(sgaStock).max.x>ext(w.gun.children.find(x=>x.userData.r870StockExtension)).max.x);
  assert.equal(m.gun.userData.r870ShoulderStock,true);
  assert.ok(m.gun.children.filter(x=>x.userData.r870PumpPart).length>=4,'M-LOK end stops move with pump');
  assert.equal(m.gun.children.find(x=>x.userData.r870GrooveBatch).userData.r870GrooveCount,6);
 }finally{p.dispose();w.dispose();m.dispose()}
});
test('P14.B stock and pump selections reset only necessary companion parts',()=>{
 const original=config('r870-police-wood').build;
 const change=proposeFamilyPartChange(original,'shotgun','stock','r870-magpul-sga-stock');
 assert.equal(change.valid,true);
 assert.equal(change.build.parts.grip,'r870-magpul-sga-grip');
 assert.equal(change.build.parts.barrel,'r870-18-bead');
 const another=proposeFamilyPartChange(original,'shotgun','handguard','r870-magpul-mlok-pump');
 assert.equal(another.valid,true);
 assert.equal(another.build.parts.barrel,original.parts.barrel);
 assert.equal(another.build.parts.magazine,original.parts.magazine);
 assert.equal(validFamilyBuild(change.build,'shotgun'),true);
});
