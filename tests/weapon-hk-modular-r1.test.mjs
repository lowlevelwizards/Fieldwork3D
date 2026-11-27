/** HK R1: real modular transformations, not fake isolated model entries. */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {FAMILY_PARTS,FAMILY_PRESETS,compatibleFamilyPart,matchingFamilyPreset}
 from '../src/equipment-weapon-families.ts';
import {initialWeaponConfiguration,readWeaponConfiguration,
 selectWeaponFamilyPreset,setConfiguredFamilyPart,setWeaponAttachment,
 resolveWeaponAssembly,familyAccessoryAllowed}
 from '../src/equipment-weapon-assemblies.ts';
import {buildWeaponSilhouette,clearWeaponSilhouette}
 from '../src/breach-weapon-geometry.ts';
import {buildWeaponAccessories} from '../src/breach-weapon-accessories.ts';
import {mountedAccessorySeat} from '../src/weapons/geometry/mounted-accessory-layout.ts';
import {stocklessMP5K} from '../src/breach-weapon-pose.ts';
import {attachmentPrice,catalogStockIds} from '../src/equipment-weapon-inventory.ts';
import {lowReadyArchetype} from '../src/breach-low-ready-archetypes.ts';
import {riflePoseContacts} from '../src/breach-weapon-contact-zones.ts';

const steel=new THREE.MeshBasicMaterial(),dark=new THREE.MeshBasicMaterial();
const preset=(id)=>{
 const p=FAMILY_PRESETS.find(p=>p.id===id);assert.ok(p,id);
 return selectWeaponFamilyPreset(initialWeaponConfiguration(p.weapon),id);
};
const model=c=>{
 const g=buildWeaponSilhouette(c.weapon,steel,dark,c);
 g.updateMatrixWorld(true);return g;
};
test('HK33A2 to A3 is a true stock swap with identical receiver and 5.56 magazine',()=>{
 const a=preset('hk-hk33a2'),b=setConfiguredFamilyPart(a,'stock','hk33-retract-stock');
 assert.notEqual(b,a);
 assert.equal(matchingFamilyPreset(b.build)?.id,'hk-hk33a3');
 for(const key of ['receiver','magazine','handguard','barrel'])
  assert.equal(a.build.parts[key],b.build.parts[key]);
 assert.equal(resolveWeaponAssembly(b).stockX,-14.90);
 const g=model(b);
 assert.equal(g.children.filter(x=>x.userData.hkRetractRail).length,2);
 assert.equal(g.children.filter(x=>x.userData.hkRetractButt).length,1);
 assert.ok(Math.abs(new THREE.Box3().setFromObject(g).min.x+14.90)<.01);
 clearWeaponSilhouette(g);
 assert.equal(setConfiguredFamilyPart(a,'stock','hk-mp5k-pdw-stock'),a);
});
test('MP5K-PDW side folder is a real shoulder stock, but K cap remains stockless',()=>{
 const k=preset('hk-mp5k'),pdw=setConfiguredFamilyPart(k,'stock','hk-mp5k-pdw-stock');
 assert.equal(matchingFamilyPreset(pdw.build)?.id,'hk-mp5k-pdw');
 assert.ok(stocklessMP5K(k));assert.equal(stocklessMP5K(pdw),false);
 assert.equal(lowReadyArchetype(k)?.family,'hk-smg-stockless');
 assert.equal(lowReadyArchetype(pdw)?.family,'hk-smg');
 assert.equal(resolveWeaponAssembly(k).stockX,-6.65);
 assert.equal(resolveWeaponAssembly(pdw).stockX,-13.05);
 const gun=model(pdw);
 const frames=gun.children.filter(x=>x.userData.hkMP5PDWFrame);
 assert.equal(frames.length,1,'one contiguous sculpted frame');
 gun.updateMatrixWorld(true);
 const through=new THREE.Raycaster(new THREE.Vector3(-10.8,-.1,10),new THREE.Vector3(0,0,-1));
 const solid=new THREE.Raycaster(new THREE.Vector3(-10.8,.65,10),new THREE.Vector3(0,0,-1));
 assert.equal(through.intersectObject(frames[0]).length,0,'negative space is genuinely open');
 assert.ok(solid.intersectObject(frames[0]).length>0,'the upper silhouette remains solid');
 assert.equal(gun.children.filter(x=>x.userData.hkMP5PDWButt).length,1);
 assert.equal(gun.children.filter(x=>x.userData.hkMP5StocklessCap).length,0);
 assert.ok(Math.abs(new THREE.Box3().setFromObject(gun).min.x+13.05)<.01);
 clearWeaponSilhouette(gun);
 assert.deepEqual(readWeaponConfiguration(JSON.parse(JSON.stringify(pdw)),'smg'),pdw);
});
test('standard MP5 can morph from tropical to three-sided rail with optional grip',()=>{
 const a=preset('hk-mp5a3');
 const rail=setConfiguredFamilyPart(a,'handguard','hk-mp5-trirail');
 assert.equal(rail.build.parts.handguard,'hk-mp5-trirail');
 assert.equal(matchingFamilyPreset(rail.build),undefined,'a bespoke combination');
 const gun=model(rail);
 assert.equal(gun.children.filter(x=>x.userData.hkMP5TriRailBody).length,1);
 assert.equal(gun.children.filter(x=>x.userData.hkMP5TriRailSide).length,3);
 assert.equal(gun.children.filter(x=>x.userData.hkMP5TriRailTooth!==undefined).length,3);
 clearWeaponSilhouette(gun);
 const mounted=setWeaponAttachment(rail,'foregrip','foregrip-vertical');
 assert.equal(mounted.slots.foregrip,'foregrip-vertical');
 const grip=model(mounted);
 const extras=buildWeaponAccessories(mounted,steel,dark);
 assert.equal(grip.children.filter(x=>x.userData.hkTriRailVerticalGrip||
  x.name.startsWith('family-art-hk-trirail-vertical-grip')).length,0,
  'no duplicate grip in the body builder');
 assert.equal(extras.children.filter(x=>x.name.startsWith('weapon-accessory-foregrip-vertical')).length,2);
 const seat=mountedAccessorySeat(mounted,'foregrip');
 assert.ok(seat?.hand,'accepted grip has a shared hand anchor');
 const contacts=riflePoseContacts('smg',mounted)?.support;
 assert.ok(contacts,'support contact exists');
 assert.equal(contacts.near.y,seat.hand.y);
 assert.equal(contacts.far.y,seat.hand.y);
 assert.equal((contacts.near.x+contacts.far.x)/2,seat.hand.x);
 const gripBounds=new THREE.Box3().setFromObject(extras.getObjectByName('weapon-accessory-foregrip-vertical'));
 assert.ok(seat.hand.y>=gripBounds.min.y && seat.hand.y<=gripBounds.max.y,
  'preferred palm height falls inside visible grip height');
 extras.traverse(x=>{if(x instanceof THREE.Mesh)x.geometry.dispose()});extras.clear();
 assert.equal(resolveWeaponAssembly(mounted).supportX,7.0);
 clearWeaponSilhouette(grip);
 assert.equal(setConfiguredFamilyPart(preset('hk-mp5sd3'),'handguard','hk-mp5-trirail').build.parts.handguard,
  'hk-mp5sd-shroud','SD integral front end cannot take the standard MP5 rail');
});
test('HK claw top rail only appears when fitted to HK; keeps true muzzle geometry',()=>{
 const a=preset('hk-hk33a2'),b=setWeaponAttachment(a,'opticMount','optic-hk-claw');
 assert.equal(b.slots.opticMount,'optic-hk-claw');
 assert.equal(familyAccessoryAllowed(a.build,'opticMount','optic-hk-claw'),true);
 const gun=model(b),plain=model(a);
 const mounts=gun.children.filter(x=>x.userData.hkClawMount);
 assert.equal(mounts.length,1,'consolidated single-draw claw mount');
 const top=mounts[0];
 assert.equal(top.userData.hkClawMount,'assembly');
 assert.equal(top.userData.hkClawFeet,4);
 const topBox=new THREE.Box3().setFromObject(top);
 assert.ok(Math.abs(topBox.max.y-top.userData.hkClawSupportTopY)<.02);
 const sighted=setWeaponAttachment(b,'optic','optic-reflex');
 const extras=buildWeaponAccessories(sighted,steel,dark);
 const base=extras.getObjectByName('weapon-accessory-optic-reflex-base');
 assert.ok(base,'mounted optic base exists');
 const baseBox=new THREE.Box3().setFromObject(base);
 assert.ok(baseBox.min.y<=topBox.max.y+.02 && baseBox.min.y>=topBox.max.y-.20,
  'optic base rests on visible claw bridge');
 extras.traverse(x=>{if(x instanceof THREE.Mesh)x.geometry.dispose()});extras.clear();
 assert.equal(plain.children.filter(x=>x.userData.hkClawMount).length,0);
 assert.equal(resolveWeaponAssembly(b).muzzleX,resolveWeaponAssembly(a).muzzleX);
 clearWeaponSilhouette(gun);clearWeaponSilhouette(plain);
 const ar=preset('ar-m16a2');
 assert.equal(setWeaponAttachment(ar,'opticMount','optic-hk-claw'),ar);
 assert.equal(setWeaponAttachment(initialWeaponConfiguration('carbine'),'opticMount','optic-hk-claw')
  .slots.opticMount,'optic-mount-none');
});
test('receiver swaps obey weapon class, feed and front-end compatibility gates',()=>{
 const a=preset('hk-mp5k-pdw');
 const full=setConfiguredFamilyPart(a,'receiver','hk-mp5-standard');
 assert.equal(full.build.parts.receiver,'hk-mp5-standard');
 assert.notEqual(full.build.parts.stock,'hk-mp5k-pdw-stock');
 assert.equal(full.build.parts.barrel,'hk-mp5-standard-barrel');
 assert.equal(FAMILY_PARTS[full.build.parts.magazine].feed,'hk9');
 assert.equal(compatibleFamilyPart('hk-mp5-standard','handguard','hk-mp5-trirail','smg','mid'),true);
 assert.equal(compatibleFamilyPart('hk-mp5sd-integral','handguard','hk-mp5-trirail','smg','mid'),false);
 assert.equal(compatibleFamilyPart('hk33-556-rifle','stock','hk33-retract-stock','rifle'),true);
 assert.equal(compatibleFamilyPart('hk53-556-compact','stock','hk33-retract-stock','carbine'),false);
 assert.equal(setConfiguredFamilyPart(preset('hk-hk33a3'),'receiver','hk-mp5-standard').build.parts.receiver,
  'hk33-556-rifle','rifle may not silently become SMG');
});

test('HK claw rail participates in existing finite Campaign attachment stock',()=>{
 assert.equal(attachmentPrice('optic-hk-claw'),110);
 assert.ok(catalogStockIds.includes('optic-hk-claw'));
});
