/** M1 mounted-interface contract: no saved IDs or ballistic datum changed. */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {FAMILY_PRESETS,FAMILY_PARTS} from '../src/equipment-weapon-families.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset,
 setWeaponAttachment,setConfiguredFamilyPart,weaponAttachmentAllowed,
 readWeaponConfiguration,resolveWeaponAssembly}
 from '../src/equipment-weapon-assemblies.ts';
import {buildWeaponSilhouette,clearWeaponSilhouette}
 from '../src/breach-weapon-geometry.ts';
import {buildWeaponAccessories} from '../src/breach-weapon-accessories.ts';
import {weaponPartMountSurfaces,preferredOpticMountSurface}
 from '../src/weapons/geometry/weapon-part-mount-surfaces.ts';
import {opticVisualSeat} from '../src/weapons/geometry/optic-visual-seating.ts';
import {workbenchVisualAnchors}
 from '../src/weapons/geometry/weapon-visual-anchors.ts';
const cfg=id=>{
 const p=FAMILY_PRESETS.find(p=>p.id===id);
 assert.ok(p,id);
 return selectWeaponFamilyPreset(initialWeaponConfiguration(p.weapon),id);
};
const testCases=[
 ['ar-m4a1','optic-reflex','optic-mount-none','ar-flat'],
 ['ar-m4a1','optic-magnified','optic-mount-none','ar-flat'],
 ['ak-ak74m','optic-reflex','optic-mount-none','ak-rail-long'],
 ['ak-ak74m','optic-magnified','optic-mount-none','ak-rail-long'],
 ['hk-g3a3','optic-reflex','optic-hk-claw','optic-hk-claw'],
 ['hk-g3a3','optic-magnified','optic-hk-claw','optic-hk-claw'],
 ['hk-hk33a2','optic-reflex','optic-hk-claw','optic-hk-claw'],
 ['hk-hk53a3','optic-magnified','optic-hk-claw','optic-hk-claw'],
 ['hk-mp5a3','optic-reflex','optic-hk-claw','optic-hk-claw']
];
test('M1 installed parts advertise real interfaces and not fantasy universal rails',()=>{
 assert.ok(FAMILY_PARTS['ar-flat'].mounts.some(x=>x.role==='optic'&&x.standard==='picatinny'));
 for(const receiver of ['ar-a1','ar-a2','ar-retro','akm','ak74m'])
  assert.ok(!(FAMILY_PARTS[receiver].mounts??[]).some(x=>
   x.role==='optic'&&x.face==='top'),
   receiver+' no invented receiver top rail');
 for(const receiver of ['hk-g3-drum','hk33-556-rifle','hk-mp5-standard'])
  assert.ok(FAMILY_PARTS[receiver].mounts.some(x=>x.role==='opticMount'&&x.standard==='hk-claw'));
 assert.ok(FAMILY_PARTS['ak-rail-long'].mounts.some(x=>x.role==='optic'));
 assert.ok(!FAMILY_PARTS['ak-wood-long'].mounts,'no invented rail on plain AK furniture');
});
test('M1 part swaps govern optic and foregrip compatibility without save version 2',()=>{
 let a=cfg('ak-ak74m');
 assert.equal(weaponAttachmentAllowed(a,'optic','optic-reflex'),false);
 a=setConfiguredFamilyPart(a,'handguard','ak-rail-long');
 assert.equal(a.build.parts.handguard,'ak-rail-long');
 assert.equal(weaponAttachmentAllowed(a,'optic','optic-reflex'),true);
 a=setWeaponAttachment(a,'optic','optic-reflex');
 assert.equal(a.slots.optic,'optic-reflex');
 const oldSight=resolveWeaponAssembly(a).sightHeight;
 const saved=JSON.parse(JSON.stringify(a));
 const roundtrip=readWeaponConfiguration(saved,a.weapon);
 assert.equal(roundtrip.version,1);
 assert.equal(roundtrip.slots.optic,'optic-reflex');
 assert.equal(resolveWeaponAssembly(roundtrip).sightHeight,oldSight);
 // A part swap that removes the only mounted optical interface must drop
 // the now invalid optic, not leave a free-floating scope in a saved build.
 const back=setConfiguredFamilyPart(a,'handguard','ak-poly-long');
 if(back!==a&&back.build.parts.handguard==='ak-poly-long')
  assert.equal(back.slots.optic,'optic-irons');
 const ar=cfg('ar-m16a2'),hk=cfg('hk-g3a3');
 assert.equal(weaponAttachmentAllowed(ar,'optic','optic-reflex'),false);
 assert.equal(weaponAttachmentAllowed(hk,'optic','optic-reflex'),false);
 const claw=setWeaponAttachment(hk,'opticMount','optic-hk-claw');
 assert.equal(weaponAttachmentAllowed(claw,'optic','optic-reflex'),true);
 const removed=setWeaponAttachment(
  setWeaponAttachment(claw,'optic','optic-reflex'),
  'opticMount','optic-mount-none');
 assert.equal(removed.slots.optic,'optic-irons');
});
test('M1 mount resolver is read-only across every factory recipe and does not allocate meshes',()=>{
 for(const p of FAMILY_PRESETS){
  const c=cfg(p.id);
  const before=JSON.stringify(c);
  const a=weaponPartMountSurfaces(c.build,c.slots.opticMount);
  assert.ok(Array.isArray(a)&&a.length<12,p.id);
  for(const s of a){
   assert.ok(s.endX>s.startX,p.id+' valid surface span');
   assert.ok(Number.isFinite(s.y)&&Number.isFinite(s.z));
   assert.ok(s.ownerPartId===c.slots.opticMount||
    s.ownerPartId===c.build.parts.receiver||
    s.ownerPartId===c.build.parts.handguard);
  }
  assert.equal(JSON.stringify(c),before,p.id+' pure catalog query');
 }
});
for(const [id,optic,adapter,expectedOwner] of testCases){
 test('M1 physically seated part-owned optic '+id+' / '+optic,()=>{
  let c=cfg(id);
  if(id.startsWith('ak-'))c=setConfiguredFamilyPart(c,'handguard','ak-rail-long');
  if(adapter==='optic-hk-claw')c=setWeaponAttachment(c,'opticMount',adapter);
  c=setWeaponAttachment(c,'optic',optic);
  assert.equal(c.slots.optic,optic,'valid accessory choice');
  const before=resolveWeaponAssembly(c);
  const surface=preferredOpticMountSurface(c.build,c.slots.opticMount);
  assert.equal(surface?.ownerPartId,expectedOwner);
  assert.equal(surface?.role,'optic');
  assert.equal(surface?.face,'top');
  const seat=opticVisualSeat(c,before.mounted.optic.mountX);
  assert.equal(seat.supportY,surface.y);
  assert.ok(seat.x>=surface.startX&&seat.x<=surface.endX,
   'optic sits within real part rail footprint');
  const body=buildWeaponSilhouette(c.weapon,new THREE.MeshBasicMaterial(),
   new THREE.MeshBasicMaterial(),c);
  const extras=buildWeaponAccessories(c,new THREE.MeshBasicMaterial(),
   new THREE.MeshBasicMaterial());
  const supports=extras.children.filter(x=>x.name.includes(
   optic==='optic-magnified'?'optic-magnified-mounts':'optic-reflex-base'));
  assert.equal(supports.length,1);
  const bb=new THREE.Box3().setFromObject(supports[0]);
  assert.ok(Math.abs(bb.min.y-surface.y)<.01);
  assert.equal(resolveWeaponAssembly(c).sightHeight,before.sightHeight,
   'cosmetic rail has no ballistic sight effect');
  clearWeaponSilhouette(body);
  extras.traverse(x=>{if(x instanceof THREE.Mesh)x.geometry.dispose()});
  extras.clear();
 });
}

test('M1.5 Workbench optic hotspots follow actual installed part surface',()=>{
 for(const [id,optic,adapter] of testCases){
  let c=cfg(id);
  if(id.startsWith('ak-'))
   c=setConfiguredFamilyPart(c,'handguard','ak-rail-long');
  if(adapter==='optic-hk-claw')
   c=setWeaponAttachment(c,'opticMount',adapter);
  c=setWeaponAttachment(c,'optic',optic);
  const steel=new THREE.MeshBasicMaterial(),dark=new THREE.MeshBasicMaterial();
  const body=buildWeaponSilhouette(c.weapon,steel,dark,c);
  const visual=opticVisualSeat(c,resolveWeaponAssembly(c).mounted.optic.mountX);
  const mounts=workbenchVisualAnchors(c,body,'attachments');
  const spot=mounts.find(x=>x.slot==='optic');
  assert.ok(spot);
  assert.ok(Math.abs(spot.x-visual.x)<.001,id+' Workbench X matches mounted sight');
  assert.ok(Math.abs(spot.y-visual.supportY-1.70)<.001,
   id+' Workbench Y uses actual optic support surface');
  if(adapter==='optic-hk-claw'){
   const claw=mounts.find(x=>x.slot==='opticMount');
   assert.ok(claw&&claw.y>0,'HK adapter hotspot on its lugs');
  }
  clearWeaponSilhouette(body);steel.dispose();dark.dispose();
 }
});
