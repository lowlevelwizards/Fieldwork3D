import test from 'node:test';
import assert from 'node:assert/strict';
import {initialRoster,equipRoster,configureRosterWeaponPreset,
 configureRosterWeaponBodyPart,configureRosterWeapon}
 from '../src/breach-roster.ts';
import {initialWeaponConfiguration} from '../src/equipment-weapon-assemblies.ts';
import {FAMILY_PRESETS,FAMILY_PARTS} from '../src/equipment-weapon-families.ts';
import {workbenchMounts} from '../src/equipment-weapon-workbench-layout.ts';

test('mobile workbench: 11 presets are reachable without Campaign ownership changes',()=>{
 for(const preset of FAMILY_PRESETS){
  const roster=equipRoster(initialRoster(),'rook',preset.weapon);
  const equipped=configureRosterWeaponPreset(roster,'rook',preset.id);
  const member=equipped.members.find(m=>m.id==='rook');
  assert.equal(member?.weapon,preset.weapon,preset.name);
  assert.equal(member?.weaponConfiguration.build?.family,preset.family,preset.name);
  assert.deepEqual(member?.weaponConfiguration.build?.parts,preset.parts,preset.name);
  assert.equal(member?.magazine,roster.members[0].magazine);
  assert.equal(member?.reserve,roster.members[0].reserve);
  assert.deepEqual(member?.magazines,roster.members[0].magazines);
 }
});
test('mobile workbench: body sockets and compatible attachment sockets map uniquely',()=>{
 const original=initialWeaponConfiguration('carbine');
 const legacy=workbenchMounts(original);
 assert.equal(legacy.length,6);
 assert.equal(new Set(legacy.map(m=>m.slot)).size,legacy.length);
 let roster=configureRosterWeaponPreset(initialRoster(),'rook','ar-m4a1');
 const member=roster.members[0];
 const body=workbenchMounts(member.weaponConfiguration,'body');
 const accessories=workbenchMounts(member.weaponConfiguration,'attachments');
 assert.equal(body.length,6);
 assert.ok(body.every(m=>m.slot.startsWith('body-')));
 assert.equal(new Set(body.map(m=>m.slot)).size,6);
 assert.equal(accessories.length,5,'factory stock is a body socket, not generic accessory');
 assert.ok(accessories.every(m=>!m.slot.startsWith('body-')));
 roster=configureRosterWeaponBodyPart(roster,'rook','grip','ar-grip-poly');
 assert.equal(roster.members[0].weaponConfiguration.build?.parts.grip,'ar-grip-poly');
 assert.equal(FAMILY_PARTS[roster.members[0].weaponConfiguration.build.parts.grip].family,'ar');
 const unchanged=configureRosterWeaponBodyPart(roster,'rook','magazine','ak-mag545');
 assert.equal(unchanged,roster,'wrong-family magazine must not alter roster');
 const withOptic=configureRosterWeapon(roster,'rook','optic','optic-reflex');
 assert.equal(withOptic.members[0].weaponConfiguration.slots.optic,'optic-reflex');
});
