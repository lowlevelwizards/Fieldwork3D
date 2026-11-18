/** G36 core family: only 4 curated presets, genuine parts, real mounts. */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {FAMILY_PRESETS,validFamilyBuild,initialWeaponFamilyBuild,
 readWeaponFamilyBuild,proposeFamilyPartChange} from '../src/equipment-weapon-families.ts';
import {addG36Family} from '../src/weapons/geometry/g36-family-silhouettes.ts';
import {G36_E0_FACTORY} from '../src/weapons/geometry/g36-family-contract.ts';
import {g36FrontEnd,g36SupportRange,g36HandguardEnd}
 from '../src/weapons/geometry/g36-variant-parts.ts';
import {g36PixelAtlas} from '../src/weapons/geometry/g36-pixel-details.ts';
import {clearWeaponSilhouette} from '../src/breach-weapon-geometry.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset,
 setConfiguredFamilyPart,setWeaponAttachment,readWeaponConfiguration,
 resolveWeaponAssembly,familyAccessoryAllowed}
 from '../src/equipment-weapon-assemblies.ts';
import {riflePoseContacts} from '../src/breach-weapon-contact-zones.ts';
import {physicalWeaponMountSlots} from '../src/weapons/geometry/weapon-physical-mount-slots.ts';
const originals=['g36-service','g36-k-dual','g36-c-classic','g36-ka4'];
const preset=id=>{
 const p=FAMILY_PRESETS.find(p=>p.id===id);
 assert.ok(p,'factory preset '+id);
 const c=selectWeaponFamilyPreset(initialWeaponConfiguration(p.weapon),id);
 assert.ok(c.build,'select '+id);
 return c;
};
const model=c=>{
 const g=new THREE.Group();addG36Family(g,c.build);
 return g;
};
const all=(g,key)=>g.children.filter(x=>x.userData[key]);
const near=(x,y,t=.04)=>Math.abs(x-y)<t;
const tri=g=>g.children.reduce((s,m)=>s+
 ((m.geometry.index?.count??m.geometry.getAttribute('position').count)/3),0);
const bounds=g=>new THREE.Box3().setFromObject(g);

test('only four official factory G36 presets, original IDs and saved service untouched',()=>{
 const presets=FAMILY_PRESETS.filter(p=>p.family==='g36');
 assert.deepEqual(presets.map(p=>p.id),originals);
 for(const p of presets)assert.ok(validFamilyBuild({family:p.family,parts:p.parts},p.weapon),p.id);
 assert.equal(G36_E0_FACTORY.parts.receiver,'g36-dual-receiver');
 assert.equal(G36_E0_FACTORY.parts.barrel,'g36-barrel-480');
 assert.equal(G36_E0_FACTORY.parts.handguard,'g36-handguard-long');
 assert.equal(G36_E0_FACTORY.feedVisualId,'g36-polymer-556');
 const original=preset('g36-service'),live=model(original);
 assert.equal(original.slots.optic,'optic-g36-integrated');
 assert.equal(live.userData.g36OriginalFactory,true);
 assert.equal(live.userData.g36IntegratedDualOptic,true);
 assert.equal(live.children.length,23);
 assert.equal(tri(live),476);
 assert.equal(all(live,'g36LongHandguard').length,1);
 assert.equal(all(live,'g36Magazine').length,1);
 assert.equal(all(live,'g36SelectorMarkings').length,1);
 clearWeaponSilhouette(live);
});

test('G36K 318mm and G36C 228mm have real distinct front ends and matching shot-time muzzle endpoints',()=>{
 const specs=[
  ['g36-service',19.50,13.45,4],
  ['g36-k-dual',15.50,11.00,3],
  ['g36-c-classic',12.15,8.80,2],
  ['g36-ka4',15.50,11.00,3]
 ];
 for(const [id,muzzleX,guardX] of specs){
  const c=preset(id),g=model(c);
  const front=g36FrontEnd(c.build.parts.barrel);
  assert.ok(front);
  assert.equal(front.muzzleX,muzzleX,id+' art muzzle');
  assert.equal(g36HandguardEnd(c.build.parts.handguard),guardX);
  const box=bounds(g),assembly=resolveWeaponAssembly(c);
  assert.ok(near(assembly.muzzleX,muzzleX),id+' shot endpoint');
  assert.ok(near(box.max.x,muzzleX,.05),id+' rendered tip');
  const guard=all(g,'g36LongHandguard')[0];
  assert.ok(guard,id+' drawn fore-end');
  assert.ok(near(guard.userData.g36GuardFrontX,guardX));
  assert.ok(near(new THREE.Box3().setFromObject(guard).max.x,guardX,.07));
  assert.ok(assembly.stockX< -13.5);
  assert.ok(tri(g)<650,'small low-poly variant budget');
  assert.ok(g.children.length<31,'small mesh budget');
  const contact=riflePoseContacts(c.weapon,c),[start,end]=g36SupportRange(c.build.parts.handguard);
  assert.ok(contact&&near(contact.support.near.x,start)&&near(contact.support.far.x,end));
  assert.ok(contact.support.far.x<guardX);
  assert.ok(contact.support.near.x<contact.support.far.x);
  assert.ok(near(assembly.supportX,(start+end)/2));
  assert.equal(all(g,'g36SelectorMarkings').length,1);
  assert.equal(all(g,'g36Magazine').length,1);
  assert.equal(all(g,'g36FactoryMuzzle').length,1);
  clearWeaponSilhouette(g);
 }
});
test('G36C flat bridge has backup irons, G36K original integral optics remain, KA4 has real railed fore-end',()=>{
 const k=preset('g36-k-dual'),c=preset('g36-c-classic'),a=preset('g36-ka4');
 assert.equal(k.slots.optic,'optic-g36-integrated');
 assert.equal(c.slots.optic,'optic-irons');
 assert.equal(a.slots.optic,'optic-irons');
 for(const [config,expected] of [[k,'dual-optic'],[c,'flat-rail'],[a,'flat-rail']]){
  const g=model(config);
  assert.equal(g.userData.g36IntegratedDualOptic,expected==='dual-optic');
  assert.equal(all(g,'g36PicatinnyTop').length,expected==='flat-rail'?1:0);
  assert.equal(all(g,'g36BackupIron').length,expected==='flat-rail'?2:0);
  assert.equal(all(g,'g36HandleOpening').length,expected==='flat-rail'?0:1);
  assert.equal(all(g,'g36LowerOptic').length,expected==='flat-rail'?0:1);
  clearWeaponSilhouette(g);
 }
 const ka4=model(a);
 assert.equal(all(ka4,'g36ModernHandguardRail').length,4);
 assert.equal(all(ka4,'g36AdjustableStock').length,1);
 assert.equal(all(ka4,'g36AdjustableCheek').length,1);
 assert.equal(all(ka4,'g36Buttpad').length,1);
 clearWeaponSilhouette(ka4);
 const short=model(c);
 assert.equal(all(short,'g36ModernHandguardRail').length,0);
 assert.equal(all(short,'g36MasterStock').length,1,'shorter original two-opening stock');
 clearWeaponSilhouette(short);
});
test('rail mounts exist only where actual model contains rails; optics and lights do not appear on integral scopes',()=>{
 const k=preset('g36-k-dual'),c=preset('g36-c-classic'),a=preset('g36-ka4');
 assert.equal(physicalWeaponMountSlots(k.build).length,0);
 assert.equal(physicalWeaponMountSlots(c.build).filter(x=>x.role==='optic').length,3);
 const mounts=physicalWeaponMountSlots(a.build);
 assert.ok(mounts.filter(x=>x.role==='optic').length===3);
 assert.ok(mounts.some(x=>x.role==='foregrip'&&x.face==='bottom'));
 assert.ok(mounts.some(x=>x.role==='light'&&x.face==='left'));
 assert.ok(mounts.some(x=>x.role==='light'&&x.face==='right'));
 assert.equal(familyAccessoryAllowed(k.build,'optic','optic-reflex'),false);
 assert.equal(familyAccessoryAllowed(c.build,'optic','optic-reflex'),true);
 assert.equal(familyAccessoryAllowed(c.build,'foregrip','foregrip-vertical'),false);
 assert.equal(familyAccessoryAllowed(a.build,'foregrip','foregrip-vertical'),true);
 assert.equal(familyAccessoryAllowed(k.build,'opticMount','optic-hk-claw'),false);
 const reflex=setWeaponAttachment(c,'optic','optic-reflex');
 assert.equal(reflex.slots.optic,'optic-reflex');
});
test('single-scope upper is an optional part, never another preset, and cannot turn into G36C',()=>{
 const k=preset('g36-k-dual');
 const result=proposeFamilyPartChange(k.build,k.weapon,'receiver','g36-single-receiver');
 assert.equal(result.valid,true);
 const cfg=setConfiguredFamilyPart(k,'receiver','g36-single-receiver');
 assert.equal(cfg.build.parts.receiver,'g36-single-receiver');
 assert.equal(cfg.slots.optic,'optic-g36-single');
 const g=model(cfg);
 assert.equal(all(g,'g36LowerOptic').length,1);
 assert.equal(all(g,'g36UpperReflex').length,0);
 assert.equal(all(g,'g36PicatinnyTop').length,0);
 assert.equal(g.userData.g36SingleOptic,true);
 clearWeaponSilhouette(g);
 assert.equal(proposeFamilyPartChange(cfg.build,cfg.weapon,'barrel','g36-barrel-228').valid,false);
 assert.equal(FAMILY_PRESETS.filter(x=>x.family==='g36').length,4);
 const loaded=readWeaponConfiguration(cfg,cfg.weapon);
 assert.equal(loaded.build.parts.receiver,'g36-single-receiver');
});
test('only valid barrel/handguard lengths; saved G36 service still normalizes identically',()=>{
 const k=preset('g36-k-dual'),c=preset('g36-c-classic');
 assert.equal(proposeFamilyPartChange(k.build,k.weapon,'handguard','g36-handguard-c').valid,false);
 assert.equal(proposeFamilyPartChange(c.build,c.weapon,'barrel','g36-barrel-318').valid,true);
 const changed=setConfiguredFamilyPart(c,'barrel','g36-barrel-318');
 assert.equal(changed.build.parts.handguard,'g36-handguard-k');
 const saved=readWeaponFamilyBuild({family:'g36',parts:G36_E0_FACTORY.parts},'rifle');
 assert.deepEqual(saved.parts,G36_E0_FACTORY.parts);
 const invalid=readWeaponFamilyBuild({family:'g36',
  parts:{...G36_E0_FACTORY.parts,barrel:'g36-barrel-228'}},'rifle');
 assert.equal(invalid.parts.barrel,'g36-barrel-480');
});
