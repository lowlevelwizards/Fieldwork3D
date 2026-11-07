/** HK family growth: one staged cosmetic expansion with legacy preservation. */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {FAMILY_PRESETS,FAMILY_PARTS,compatibleFamilyPart,matchingFamilyPreset}
 from '../src/equipment-weapon-families.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset,
 readWeaponConfiguration,resolveWeaponAssembly,setWeaponAttachment,
 setConfiguredFamilyPart}
 from '../src/equipment-weapon-assemblies.ts';
import {buildWeaponSilhouette,clearWeaponSilhouette}
 from '../src/breach-weapon-geometry.ts';
import {carriedMagazineGeometry,carriedMagazineProfile}
 from '../src/operator-carried-magazines.ts';
import {HK_BARREL_ART} from '../src/weapons/geometry/hk-barrel-profiles.ts';
import {HK556_MAG_LENGTHS,hk556MagazineOutline}
 from '../src/weapons/geometry/hk-556-magazine-profiles.ts';
import {riflePoseContacts} from '../src/breach-weapon-contact-zones.ts';
import {lowReadyArchetype} from '../src/breach-low-ready-archetypes.ts';
import {partVisualBounds} from '../src/weapons/geometry/weapon-visual-anchors.ts';
const ids=['hk-g3a4','hk-hk33a2','hk-hk53a3'];
const steel=new THREE.MeshBasicMaterial(),dark=new THREE.MeshBasicMaterial();
const create=id=>{
 const p=FAMILY_PRESETS.find(x=>x.id===id);
 assert.ok(p,id+' factory registration');
 const config=selectWeaponFamilyPreset(initialWeaponConfiguration(p.weapon),id);
 const group=buildWeaponSilhouette(p.weapon,steel,dark,config);
 group.updateMatrixWorld(true);
 return {config,group};
};
test('catalog: 8 AR, 9 AK and 12 distinct HK factory models',()=>{
 assert.equal(FAMILY_PRESETS.length,29);
 assert.equal(FAMILY_PRESETS.filter(x=>x.family==='hk').length,12);
 for(const id of ids){
  const {config,group}=create(id);
  assert.equal(matchingFamilyPreset(config.build).id,id);
  assert.deepEqual(readWeaponConfiguration(
   JSON.parse(JSON.stringify(config)),config.weapon),config);
  assert.ok(group.children.length<=28,id+' clean miniature mesh budget');
  clearWeaponSilhouette(group);
 }
});
test('G3A4: frozen G3A3 front architecture with chunky extended twin rails',()=>{
 const a=create('hk-g3a3'),b=create('hk-g3a4');
 for(const slot of ['receiver','grip','magazine','handguard','barrel']){
  const grab=g=>g.children.filter(c=>c.name.startsWith('family-'+slot+'-'))
   .map(c=>({name:c.name,shape:c.geometry.type,
    points:Array.from(c.geometry.getAttribute('position').array),
    xyz:c.position.toArray()}));
  assert.deepEqual(grab(a.group),grab(b.group),slot+' locked G3A3 family geometry');
 }
 assert.equal(b.group.children.filter(x=>x.userData.hkRetractRail).length,2);
 assert.equal(b.group.children.filter(x=>x.userData.hkRetractButt).length,1);
 assert.equal(b.group.children.filter(x=>x.userData.hkRetractCoupling).length,1);
 const stock=partVisualBounds(b.group,'stock');
 assert.ok(Math.abs(stock.min.x+15.15)<.001,'G3A4 preserved extended rear landmark');
 assert.ok(stock.max.x> -6.1 && stock.min.z< -1.7,
  'stock parts are seated and spread across receiver sides');
 clearWeaponSilhouette(a.group);clearWeaponSilhouette(b.group);
});
test('5.56 HK33/HK53 are distinct, separated from G3 magazine family',()=>{
 const a=create('hk-hk33a2'),b=create('hk-hk53a3');
 assert.equal(a.config.weapon,'rifle');
 assert.equal(b.config.weapon,'carbine');
 assert.equal(FAMILY_PARTS[a.config.build.parts.magazine].feed,'hk556');
 assert.equal(FAMILY_PARTS[b.config.build.parts.magazine].feed,'hk556');
 for(const cfg of [a.config,b.config]){
  const receiver=cfg.build.parts.receiver;
  assert.equal(compatibleFamilyPart(receiver,'magazine','hk-g3-mag20',cfg.weapon),false);
  assert.equal(compatibleFamilyPart(receiver,'barrel','hk-g3-service',cfg.weapon),false);
  assert.equal(compatibleFamilyPart(receiver,'stock','hk-g3-poly-stock',cfg.weapon),false);
  assert.equal(compatibleFamilyPart(receiver,'magazine','ar-mag30',cfg.weapon),false);
  assert.ok(setConfiguredFamilyPart(cfg,'magazine','hk-g3-mag20')===cfg);
 }
 const swap=setConfiguredFamilyPart(b.config,'magazine','hk556-mag30');
 assert.equal(swap.build.parts.magazine,'hk556-mag30',
  'the two HK 5.56 variants share magazine feed, not geometry scales');
 assert.ok(setConfiguredFamilyPart(b.config,'handguard','hk33-poly-slim')===b.config);
 const m33=partVisualBounds(a.group,'magazine'),m53=partVisualBounds(b.group,'magazine');
 assert.ok(m33.min.y<m53.min.y,'HK33 30-rounder longer than HK53 25-rounder');
 clearWeaponSilhouette(a.group);clearWeaponSilhouette(b.group);
});
test('authoritative muzzle landmarks and width hierarchy match live meshes',()=>{
 const target=[['hk-g3a4',22.40,-15.15],
  ['hk-hk33a2',20.00,-13.88],['hk-hk53a3',12.90,-14.90]];
 for(const [id,tip,rear] of target){
  const {config,group}=create(id);
  const box=new THREE.Box3().setFromObject(group);
  const a=resolveWeaponAssembly(config);
  assert.ok(Math.abs(box.max.x-tip)<.01,id+' outer muzzle tip');
  assert.ok(Math.abs(a.muzzleX-tip)<.01,id+' gameplay muzzle tip');
  assert.ok(Math.abs(a.stockX-rear)<.01,id+' stock socket');
  assert.ok(group.children.some(x=>x.userData.hkRearSight==='diopter-drum'),
   id+' HK rotary drum');
  assert.ok(group.children.some(x=>x.geometry.type==='TorusGeometry'),
   id+' open hood');
  assert.ok(group.children.some(x=>x.userData.hkFactoryFlashHider));
  assert.ok(box.max.x-box.min.x>=25,id+' substantial, not shrunken chassis');
  clearWeaponSilhouette(group);
 }
});
test('HK compact hand contact uses actual short handguard; no rifle-length pose',()=>{
 const {config,group}=create('hk-hk53a3');
 const art=HK_BARREL_ART['hk53-short'];
 const contact=riflePoseContacts('carbine',config);
 const a=resolveWeaponAssembly(config);
 assert.equal(lowReadyArchetype(config)?.family,'hk-carbine');
 assert.ok(a.supportX>art.handguardStartX&&a.supportX<art.handguardEndX);
 assert.ok(contact.support.far.x<art.handguardEndX);
 const wanted=contact.support.near.x+
  (contact.support.far.x-contact.support.near.x)*contact.support.preferredFraction;
 assert.ok(wanted>art.handguardStartX&&wanted<art.handguardEndX,
  'support palm sits on the very short fore-end');
 const guard=partVisualBounds(group,'handguard');
 assert.ok(guard.min.x<=wanted&&guard.max.x>=wanted);
 clearWeaponSilhouette(group);
});
test('all new magazine profiles are visible in weapon and carried inventory',()=>{
 for(const id of ['hk556-mag25','hk556-mag30']){
  const outline=hk556MagazineOutline(id);
  assert.ok(outline.length<=8,'few strong curve corners');
  const carry=carriedMagazineProfile(id);
  assert.equal(carry?.family,'hk');
  assert.equal(carry.length,HK556_MAG_LENGTHS[id]);
  const geo=carriedMagazineGeometry(id);
  assert.ok(geo?.getAttribute('position').count>0,id+' real carried silhouette');
  geo.dispose();
 }
});
test('factory muzzle is excluded when an accessory owns the tip',()=>{
 for(const id of ids){
  const {config,group}=create(id);
  const changed=setWeaponAttachment(config,'muzzle','muzzle-suppressor');
  const other=buildWeaponSilhouette(config.weapon,steel,dark,changed);
  assert.ok(!other.children.some(x=>x.userData.hkFactoryFlashHider),id);
  const box=new THREE.Box3().setFromObject(other);
  assert.ok(box.max.x>=resolveWeaponAssembly(config).muzzleX);
  clearWeaponSilhouette(group);clearWeaponSilhouette(other);
 }
});
