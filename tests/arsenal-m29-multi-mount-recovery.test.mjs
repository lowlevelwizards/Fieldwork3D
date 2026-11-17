/** M2.9: stale saves may contain several invalid explicit mounts at once.
 * Repair is incremental; no paid equipment is silently removed or moved.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {initialWeaponConfiguration,selectWeaponFamilyPreset,
 setWeaponAttachment,readWeaponConfiguration,sameWeaponConfiguration}
 from '../src/equipment-weapon-assemblies.ts';
import {arsenalRecipeFromLegacy} from '../src/arsenal/recipes.ts';
import {mountPickerState} from '../src/arsenal/mount-picker-model.ts';
import {chooseWeaponMountPosition}
 from '../src/weapons/geometry/weapon-mount-position-edits.ts';
import {resolveMountedAccessoryLayout,mountedAccessorySeat}
 from '../src/weapons/geometry/mounted-accessory-layout.ts';

const base=()=>{
 let config=selectWeaponFamilyPreset(initialWeaponConfiguration('carbine'),'ar-m4a1');
 config=setWeaponAttachment(config,'light','light-compact');
 config=setWeaponAttachment(config,'foregrip','foregrip-vertical');
 assert.equal(config.slots.light,'light-compact');
 assert.equal(config.slots.foregrip,'foregrip-vertical');
 return config;
};
const recipe=c=>{
 const r=arsenalRecipeFromLegacy(c);
 assert.ok(r,'weapon and saved mounts remain representable');
 return r;
};
const obsolete=(c,slot,face)=>({
 attachmentId:c.slots[slot],ownerPartId:'removed-owner',
 surfaceId:'removed-surface-'+slot,face,
 standard:'picatinny',position:.5
});

test('M2.9A two stale contacts repair one at a time without losing ownership',()=>{
 const original=base();
 assert.equal(resolveMountedAccessoryLayout(original).unresolved.length,0);
 const damaged=readWeaponConfiguration({...original,mountSelections:{
  light:obsolete(original,'light','left'),
  foregrip:obsolete(original,'foregrip','bottom')
 }},original.weapon);
 assert.equal(resolveMountedAccessoryLayout(damaged).unresolved.length,2);
 const lightRails=mountPickerState(recipe(damaged),'light').rails;
 assert.ok(lightRails.length>0,'valid light contacts offered despite stale grip');
 const light=lightRails.find(x=>x.face==='left')??lightRails[0];
 const fixedLight=chooseWeaponMountPosition(damaged,'light',light.choices[0]);
 assert.notStrictEqual(fixedLight,damaged,'light can be repaired independently');
 assert.deepEqual(fixedLight.mountSelections?.foregrip,
  damaged.mountSelections?.foregrip,'unrelated stale grip stays untouched');
 assert.equal(mountedAccessorySeat(fixedLight,'light')?.placement.face,light.face);
 assert.equal(resolveMountedAccessoryLayout(fixedLight).unresolved.length,1);
 assert.equal(resolveMountedAccessoryLayout(fixedLight).unresolved[0].attachmentId,
  'foregrip-vertical');
 const gripRails=mountPickerState(recipe(fixedLight),'foregrip').rails;
 assert.ok(gripRails.length>0,'remaining grip can be repaired');
 const repaired=chooseWeaponMountPosition(fixedLight,'foregrip',
  gripRails[0].choices[0]);
 assert.notStrictEqual(repaired,fixedLight);
 assert.equal(resolveMountedAccessoryLayout(repaired).unresolved.length,0);
 assert.equal(repaired.slots.light,original.slots.light);
 assert.equal(repaired.slots.foregrip,original.slots.foregrip);
 assert.ok(sameWeaponConfiguration(readWeaponConfiguration(
  JSON.parse(JSON.stringify(repaired)),repaired.weapon),repaired));
});

test('M2.9A repairing one mount must never hide a newly unresolved one',()=>{
 const original=base();
 const lightRail=mountPickerState(recipe(original),'light').rails[0];
 assert.ok(lightRail);
 const chosen=chooseWeaponMountPosition(original,'light',lightRail.choices[0]);
 assert.ok(mountedAccessorySeat(chosen,'light'));
 assert.equal(resolveMountedAccessoryLayout(chosen).unresolved.length,0);
 // An explicit stale grip is retained as owned hardware. Repairing the
 // valid light is permissible only if the light stays physically mounted.
 const gripStale=readWeaponConfiguration({...chosen,mountSelections:{
  ...chosen.mountSelections,foregrip:obsolete(chosen,'foregrip','bottom')
 }},chosen.weapon);
 const alternative=mountPickerState(recipe(gripStale),'light').rails
  .flatMap(r=>r.choices).find(p=>
   Math.abs(p.x-mountedAccessorySeat(gripStale,'light').x)>.001);
 if(alternative){
  const updated=chooseWeaponMountPosition(gripStale,'light',alternative);
  if(updated!==gripStale){
   assert.ok(mountedAccessorySeat(updated,'light'));
   assert.deepEqual(updated.mountSelections?.foregrip,
    gripStale.mountSelections?.foregrip);
   assert.equal(resolveMountedAccessoryLayout(updated).unresolved.length,1);
  }
 }
});
