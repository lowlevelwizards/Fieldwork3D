/** Arsenal M2.0: read-only mount census; no save, renderer or eligibility changes. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {FAMILY_PRESETS} from '../src/equipment-weapon-families.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset,
 setConfiguredFamilyPart,setWeaponAttachment,weaponAttachmentAllowed}
 from '../src/equipment-weapon-assemblies.ts';
import {auditWeaponMountInventory}
 from '../src/weapons/geometry/weapon-mount-inventory.ts';

function preset(id){
 const p=FAMILY_PRESETS.find(x=>x.id===id);
 assert.ok(p,id);
 return selectWeaponFamilyPreset(initialWeaponConfiguration(p.weapon),id);
}
const codes=inventory=>inventory.findings.map(x=>x.code);

test('M2.0 all factory configurations have reviewed, part-owned geometry reports',()=>{
 for(const factory of FAMILY_PRESETS){
  const config=preset(factory.id);
  const snapshot=JSON.stringify(config);
  const census=auditWeaponMountInventory(config);
  assert.ok(Array.isArray(census.surfaces),factory.id);
  assert.ok(Array.isArray(census.findings),factory.id);
  assert.equal(codes(census).includes('unknown-geometry'),false,factory.id);
  for(const entry of census.surfaces){
   const s=entry.surface;
   assert.ok(Number.isFinite(s.startX)&&Number.isFinite(s.endX)&&
    Number.isFinite(s.y)&&Number.isFinite(s.z),factory.id);
   assert.ok(s.endX>s.startX,factory.id);
   assert.ok([config.build.parts.receiver,config.build.parts.handguard,
    config.slots.opticMount].includes(s.ownerPartId),factory.id);
   assert.ok(entry.evidenceSource.startsWith('src/weapons/geometry/'));
   assert.equal(entry.normal,s.face==='top'?'positive-y':
    s.face==='bottom'?'negative-y':'side-unresolved');
  }
  assert.equal(JSON.stringify(config),snapshot,factory.id+' audit mutated configuration');
  assert.deepEqual(auditWeaponMountInventory(config),census,factory.id+' nondeterministic audit');
 }
});

test('M2.0 AK handguard has an authored top rail but unbuilt advertised sides/bottom',()=>{
 let c=preset('ak-ak74m');
 c=setConfiguredFamilyPart(c,'handguard','ak-rail-long');
 assert.equal(c.build.parts.handguard,'ak-rail-long');
 const audit=auditWeaponMountInventory(c);
 const owned=audit.surfaces.filter(x=>x.surface.ownerPartId==='ak-rail-long');
 assert.equal(owned.find(x=>x.surface.face==='top'&&x.surface.role==='optic')?.contact,
  'authored');
 for(const face of ['bottom','side'])
  assert.ok(owned.some(x=>x.surface.face===face&&x.contact==='declared-only'),face);
 assert.ok(codes(audit).includes('unbuilt-interface'));
 assert.ok(codes(audit).includes('ambiguous-side'));
 assert.ok(codes(audit).includes('forward-magnified-unchecked'));
 assert.equal(weaponAttachmentAllowed(c,'optic','optic-magnified'),true,
  'M2.0 must not silently change existing eligibility');
});

test('M2.0 covered AR sides are never reported as exposed side rails',()=>{
 const c=setConfiguredFamilyPart(preset('ar-mk18'),'handguard','ar-compact-rail');
 assert.equal(c.build.parts.handguard,'ar-compact-rail');
 const audit=auditWeaponMountInventory(c);
 assert.ok(audit.surfaces.some(x=>x.surface.role==='light'&&
  x.surface.face==='side'&&x.contact==='covered'));
 assert.ok(codes(audit).includes('covered-interface'));
 assert.ok(codes(audit).includes('unmounted-light-allowed'));
});

test('M2.0 real AR/MP5 side rails still require handedness resolution',()=>{
 const ar=auditWeaponMountInventory(preset('ar-m4a1'));
 assert.ok(ar.surfaces.some(x=>x.surface.role==='light'&&x.contact==='authored'));
 assert.ok(codes(ar).includes('ambiguous-side'));
 assert.ok(!codes(ar).includes('unmounted-light-allowed'));
 const mp5=preset('hk-mp5a3');
 const c=setConfiguredFamilyPart(mp5,'handguard','hk-mp5-trirail');
 assert.equal(c.build.parts.handguard,'hk-mp5-trirail');
 const audit=auditWeaponMountInventory(c);
 assert.ok(audit.surfaces.some(x=>x.surface.role==='foregrip'&&x.contact==='authored'));
 assert.ok(audit.surfaces.some(x=>x.surface.role==='light'&&x.contact==='authored'));
});

test('M2.0 HK claw exposes an adapter-top surface only after fitting adapter',()=>{
 const plain=preset('hk-g3a3');
 const before=auditWeaponMountInventory(plain);
 assert.ok(before.surfaces.some(x=>x.surface.standard==='hk-claw'&&
  x.surface.ownerSlot==='receiver'));
 assert.equal(before.surfaces.some(x=>x.surface.ownerPartId==='optic-hk-claw'),false);
 const fitted=setWeaponAttachment(plain,'opticMount','optic-hk-claw');
 const audit=auditWeaponMountInventory(fitted);
 assert.ok(audit.surfaces.some(x=>x.surface.ownerPartId==='optic-hk-claw'&&
  x.surface.standard==='picatinny'&&x.contact==='authored'));
});

test('M2.0 FAL, FNC, G36 and plain furniture have no invented mount interfaces',()=>{
 for(const family of ['fal','fnc','g36']){
  const p=FAMILY_PRESETS.find(p=>p.family===family);
  assert.ok(p);
  const c=preset(p.id),audit=auditWeaponMountInventory(c);
  assert.equal(audit.surfaces.length,0,p.id);
  if(family==='g36')assert.ok(!codes(audit).includes('unmounted-light-allowed'));
  else assert.ok(codes(audit).includes('unmounted-light-allowed'),
   family+' legacy light eligibility must be documented');
 }
 const c=preset('ak-akm');
 assert.equal(auditWeaponMountInventory(c).surfaces.length,0);
 assert.ok(codes(auditWeaponMountInventory(c)).includes('unmounted-light-allowed'));
});
