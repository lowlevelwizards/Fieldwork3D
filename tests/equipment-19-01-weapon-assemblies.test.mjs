import test from 'node:test';
import assert from 'node:assert/strict';
import {WEAPON_PLATFORMS,WEAPON_ATTACHMENTS,WEAPON_ATTACHMENT_SLOTS,
 initialWeaponConfiguration,readWeaponConfiguration,setWeaponAttachment,
 changeWeaponPlatform,resolveWeaponAssembly,compatibleWeaponAttachment}
 from '../src/equipment-weapon-assemblies.ts';

const weapons=['carbine','smg','rifle','shotgun'];
test('19.01 all platforms and curated slots resolve with physical anchors',()=>{
 assert.deepEqual(Object.keys(WEAPON_PLATFORMS),weapons);
 for(const weapon of weapons){
  const resolved=resolveWeaponAssembly(initialWeaponConfiguration(weapon));
  assert.ok(resolved.massKg>2&&resolved.massKg<5);
  assert.equal(resolved.muzzleX,19.5);
  assert.ok(resolved.stockX<resolved.primaryX&&resolved.primaryX<resolved.muzzleX);
  for(const slot of WEAPON_ATTACHMENT_SLOTS)
   assert.equal(WEAPON_ATTACHMENTS[resolved.configuration.slots[slot]].slot,slot);
 }
});
test('19.01 suppressor extends muzzle, contributes front mass and is incompatible with shotgun',()=>{
 const standard=initialWeaponConfiguration('carbine');
 const chosen=setWeaponAttachment(standard,'muzzle','muzzle-suppressor');
 const a=resolveWeaponAssembly(standard),b=resolveWeaponAssembly(chosen);
 assert.ok(b.muzzleX>a.muzzleX);
 assert.ok(b.massKg>a.massKg);
 assert.ok(b.balanceX>a.balanceX);
 assert.ok(b.rotationalInertia>a.rotationalInertia);
 assert.equal(setWeaponAttachment(initialWeaponConfiguration('shotgun'),'muzzle','muzzle-suppressor').slots.muzzle,'muzzle-bare');
});
test('19.01 impossible slot, platform and malformed saves normalize safely',()=>{
 const original=initialWeaponConfiguration('carbine');
 const modified=setWeaponAttachment(original,'optic','optic-magnified');
 assert.equal(modified.slots.optic,'optic-magnified');
 assert.equal(original.slots.optic,'optic-irons');
 assert.equal(changeWeaponPlatform(modified,'smg').slots.optic,'optic-irons');
 assert.equal(compatibleWeaponAttachment('shotgun','foregrip','foregrip-vertical'),false);
 assert.deepEqual(readWeaponConfiguration({...modified,slots:{...modified.slots,optic:'not-existing',stock:'optic-reflex'}},'carbine').slots,
  {...original.slots});
 assert.deepEqual(readWeaponConfiguration({version:99},'carbine'),original);
 assert.deepEqual(readWeaponConfiguration(null,'rifle'),initialWeaponConfiguration('rifle'));
});
test('19.01 support grip and stock shift with physical parts; serialization is stable',()=>{
 let c=initialWeaponConfiguration('rifle');
 const before=resolveWeaponAssembly(c);
 c=setWeaponAttachment(c,'stock','stock-extended');
 c=setWeaponAttachment(c,'foregrip','foregrip-handstop');
 const after=resolveWeaponAssembly(c);
 assert.ok(after.stockX<before.stockX);
 assert.ok(after.supportX>before.supportX);
 assert.deepEqual(readWeaponConfiguration(JSON.parse(JSON.stringify(c)),'rifle'),c);
});
