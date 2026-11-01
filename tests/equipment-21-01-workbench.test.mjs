import test from 'node:test';
import assert from 'node:assert/strict';
import {initialWeaponConfiguration,setWeaponAttachment,WEAPON_ATTACHMENT_SLOTS,
 resolveWeaponAssembly} from '../src/equipment-weapon-assemblies.ts';
import {workbenchMounts} from '../src/equipment-weapon-workbench-layout.ts';

test('21.01 every weapon has six distinct accessible mount markers',()=>{
 for(const weapon of ['carbine','smg','rifle','shotgun']){
  const mounts=workbenchMounts(initialWeaponConfiguration(weapon));
  assert.deepEqual(mounts.map(m=>m.slot),WEAPON_ATTACHMENT_SLOTS);
  for(const mount of mounts)for(const v of [mount.x,mount.y,mount.z])assert.ok(Number.isFinite(v));
 }
});
test('21.01 muzzle, stock and support anchors follow fitted config',()=>{
 let c=initialWeaponConfiguration('carbine');
 const before=workbenchMounts(c);
 c=setWeaponAttachment(c,'muzzle','muzzle-suppressor');
 c=setWeaponAttachment(c,'stock','stock-compact');
 c=setWeaponAttachment(c,'foregrip','foregrip-handstop');
 const after=workbenchMounts(c);
 const get=(mounts,slot)=>mounts.find(a=>a.slot===slot).x;
 assert.equal(get(after,'muzzle'),resolveWeaponAssembly(c).muzzleX);
 assert.ok(get(after,'muzzle')>get(before,'muzzle'));
 assert.ok(get(after,'stock')>get(before,'stock'));
 assert.ok(get(after,'foregrip')>get(before,'foregrip'));
});
