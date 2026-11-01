import test from 'node:test';
import assert from 'node:assert/strict';
import {WEAPON_ATTACHMENT_SLOTS,WEAPON_ATTACHMENTS,initialWeaponConfiguration}
 from '../src/equipment-weapon-assemblies.ts';
import {workbenchMounts} from '../src/equipment-weapon-workbench-layout.ts';
test('21.02 picked mounting locations always have compatible native selector options',()=>{
 for(const weapon of ['carbine','smg','rifle','shotgun']){
  const slots=workbenchMounts(initialWeaponConfiguration(weapon)).map(v=>v.slot);
  assert.deepEqual(slots,WEAPON_ATTACHMENT_SLOTS);
  for(const slot of slots)
   assert.ok(Object.values(WEAPON_ATTACHMENTS)
    .some(part=>part.slot===slot&&part.compatible.includes(weapon)));
 }
});
