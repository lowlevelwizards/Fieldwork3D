import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {FAMILY_PART_SLOTS,FAMILY_PARTS,initialWeaponFamilyBuild,
 validFamilyBuild,compatibleFamilyPart} from '../src/equipment-weapon-families.ts';
import {ARSENAL_PLATFORMS,arsenalCatalogIssues,arsenalReferencesForPlatform}
 from '../src/arsenal/catalog.ts';
import {arsenalRecipeFromLegacy,readArsenalRecipe,arsenalRecipeToLegacy}
 from '../src/arsenal/recipes.ts';
import {arsenalFactoryChoices} from '../src/arsenal/factory-recipes.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset,resolveWeaponAssembly,
 readWeaponConfiguration,weaponAttachmentAllowed,setWeaponAttachment}
 from '../src/equipment-weapon-assemblies.ts';
import {buildWeaponSilhouette,clearWeaponSilhouette}
 from '../src/breach-weapon-geometry.ts';
import {riflePoseContacts} from '../src/breach-weapon-contact-zones.ts';
import {R870_P07} from '../src/weapons/geometry/r870-art-contract.ts';
import {liveMagazineCapacity} from '../src/arsenal/live-magazine-capacity.ts';
import {WEAPONS} from '../src/breach-combat.ts';
import {reloadMechanismFor} from '../src/breach-reload-performance.ts';

const cfg=()=>selectWeaponFamilyPreset(initialWeaponConfiguration('shotgun'),
 'r870-police-wood');
const mat=()=>new THREE.MeshBasicMaterial();
const bounds=o=>new THREE.Box3().setFromObject(o);
test('R870 P07: one authentic six-slot tube-fed factory model, browseable in Arsenal',()=>{
 const b=initialWeaponFamilyBuild('r870-police-wood');
 assert.ok(b);assert.equal(b.family,'r870');
 assert.ok(validFamilyBuild(b,'shotgun'));
 assert.equal(validFamilyBuild(b,'rifle'),false);
 assert.deepEqual(arsenalCatalogIssues(),[]);
 assert.equal(ARSENAL_PLATFORMS.find(x=>x.id==='remington870')?.name,'Remington 870');
 assert.deepEqual(arsenalReferencesForPlatform('remington870').map(x=>x.id),
  ['r870-police-wood']);
 assert.equal(arsenalFactoryChoices('remington870').length,1);
 assert.deepEqual(FAMILY_PART_SLOTS.map(slot=>FAMILY_PARTS[b.parts[slot]].slot),
  [...FAMILY_PART_SLOTS]);
 assert.equal(FAMILY_PARTS[b.parts.magazine].feed,'tube12');
 assert.equal(compatibleFamilyPart(b.parts.receiver,'magazine','ar-mag30','shotgun'),false);
});
test('R870 P07: selection and recipe persist; no class or ammunition migration',()=>{
 const c=cfg();assert.equal(c.weapon,'shotgun');assert.equal(c.build?.family,'r870');
 assert.deepEqual(readWeaponConfiguration(JSON.parse(JSON.stringify(c)),'shotgun'),c);
 const r=arsenalRecipeFromLegacy(c);assert.ok(r);
 assert.equal(r.platformId,'remington870');assert.equal(r.weapon,'shotgun');
 const read=readArsenalRecipe(JSON.parse(JSON.stringify(r)));
 assert.deepEqual(read,r);
 assert.deepEqual(arsenalRecipeToLegacy(read)?.build,c.build);
 assert.equal(liveMagazineCapacity('shotgun',c),WEAPONS.shotgun.capacity);
 assert.equal(reloadMechanismFor('shotgun',c),'shell-tube');
 const legacy=initialWeaponConfiguration('shotgun');
 assert.equal(legacy.build,undefined,'existing class-only shotgun remains unchanged');
 assert.equal(readWeaponConfiguration(legacy,'shotgun').build,undefined);
});
test('R870 P07: plain shotgun rejects generic rifle attachments',()=>{
 const c=cfg();
 for(const [slot,id] of [['optic','optic-reflex'],['muzzle','muzzle-brake'],
  ['muzzle','muzzle-hider'],['foregrip','foregrip-vertical'],
  ['light','light-compact'],['opticMount','optic-hk-claw']]){
  assert.equal(weaponAttachmentAllowed(c,slot,id),false,slot+': '+id);
  assert.strictEqual(setWeaponAttachment(c,slot,id),c);
 }
 assert.equal(weaponAttachmentAllowed(c,'optic','optic-irons'),true);
 assert.equal(weaponAttachmentAllowed(c,'muzzle','muzzle-bare'),true);
});
test('R870 P07: real builder, six named slots, truthful muzzle and no detachable magazine',()=>{
 const c=cfg(),a=resolveWeaponAssembly(c),m=mat();
 const g=buildWeaponSilhouette('shotgun',m,m,c);
 try{
  assert.ok(g.userData.r870P07,'shared production renderer is used');
  assert.ok(g.children.every(o=>o.name.startsWith('family-')));
  for(const slot of FAMILY_PART_SLOTS)assert.ok(
   g.children.some(o=>o.name.startsWith('family-'+slot+'-')),slot);
  const box=bounds(g);
  assert.ok(Math.abs(box.min.x-R870_P07.stockX)<.025);
  assert.ok(Math.abs(box.max.x-R870_P07.muzzleX)<.025);
  assert.equal(a.muzzleX,R870_P07.muzzleX);
  assert.equal(a.muzzleY,R870_P07.muzzleY);
  assert.equal(a.stockX,R870_P07.stockX);
  const tube=g.children.filter(o=>o.userData.r870FixedTube);
  assert.equal(tube.length,1,'one fixed tube, no detachable box-mag');
  assert.equal(tube[0].name.startsWith('family-magazine-'),true);
  assert.equal(g.children.filter(o=>o.userData.r870RightEjectionPort).length,1);
  assert.equal(g.children.filter(o=>o.userData.r870PumpPart).length,9);
  const triangles=g.children.reduce((sum,o)=>{
   if(!(o instanceof THREE.Mesh))return sum;
   return sum+(o.geometry.index?.count??o.geometry.getAttribute('position').count)/3;
  },0);
  assert.ok(triangles<650,'review silhouette topology when over budget: '+triangles);
 }finally{clearWeaponSilhouette(g);m.dispose();}
});
test('R870 P07: physical hold uses wrist and under-pump geometry',()=>{
 const c=cfg(),a=resolveWeaponAssembly(c);
 const h=riflePoseContacts('shotgun',c);
 assert.ok(h);assert.equal(h.family,'r870');
 assert.equal(h.stock.x,a.stockX);
 assert.equal(h.primary.x,R870_P07.primaryX);
 assert.ok(h.primary.y<-2.5&&h.primary.y> -3.6);
 assert.ok(h.support.near.x>=R870_P07.pumpStartX);
 assert.ok(h.support.far.x<=R870_P07.pumpEndX);
 assert.ok(h.support.near.y< -2.82,'support palm stays below the visual pump');
});
