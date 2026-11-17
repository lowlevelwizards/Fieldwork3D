import test from 'node:test';
import assert from 'node:assert/strict';
import {ARSENAL_REFERENCES} from '../src/arsenal/catalog.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset,
 setWeaponAttachment,readWeaponConfiguration,sameWeaponConfiguration,
 resolveWeaponAssembly} from '../src/equipment-weapon-assemblies.ts';
import {arsenalRecipeFromLegacy,arsenalRecipeToLegacy,readArsenalRecipe}
 from '../src/arsenal/recipes.ts';
import {mountPickerState}
 from '../src/arsenal/mount-picker-model.ts';
import {chooseWeaponMountPosition}
 from '../src/weapons/geometry/weapon-mount-position-edits.ts';
import {mountedAccessorySeat,resolveMountedAccessoryLayout}
 from '../src/weapons/geometry/mounted-accessory-layout.ts';
import {weaponLightEmitter} from '../src/equipment-weapon-light-beam.ts';
import {riflePoseContacts} from '../src/breach-weapon-contact-zones.ts';
import {opticVisualSeat} from '../src/weapons/geometry/optic-visual-seating.ts';
const choices={light:['light-compact'],foregrip:['foregrip-vertical','foregrip-handstop'],
 optic:['optic-reflex','optic-magnified','optic-kashtan-p','optic-kashtan-ak']};
const recipe=c=>{const r=arsenalRecipeFromLegacy(c);assert.ok(r);return r};
test('M2.8A every offered rail step lands on that exact physical contact',()=>{
 let checked=0,groups=0;
 for(const ref of ARSENAL_REFERENCES){
  const base=selectWeaponFamilyPreset(
   initialWeaponConfiguration(ref.legacy.weapon),ref.id);
  for(const [slot,ids] of Object.entries(choices)){
   for(const id of ids){
    const config=setWeaponAttachment(base,slot,id);
    if(config.slots[slot]!==id)continue;
    const state=mountPickerState(recipe(config),slot);
    for(const rail of state.rails){
     groups++;
     for(const choice of rail.choices){
      const selected=chooseWeaponMountPosition(config,slot,choice);
      const seat=mountedAccessorySeat(selected,slot)?.placement;
      assert.ok(seat,ref.id+' '+slot+' '+id+' missing seat');
      assert.equal(seat.ownerPartId,choice.ownerPartId,ref.id+' owner');
      assert.equal(seat.surfaceId,choice.surfaceId,ref.id+' rail');
      assert.equal(seat.face,choice.face,ref.id+' face');
      assert.ok(Math.abs(seat.x-choice.x)<.001,
       ref.id+' '+slot+' '+id+' requested X '+choice.x+' got '+seat.x);
      assert.ok(!resolveMountedAccessoryLayout(selected).unresolved.length);
      const roundtrip=readWeaponConfiguration(JSON.parse(JSON.stringify(selected)),
       selected.weapon);
      assert.ok(sameWeaponConfiguration(selected,roundtrip),
       ref.id+' '+slot+' '+id+' save roundtrip');
      const parsed=readArsenalRecipe(JSON.parse(JSON.stringify(recipe(roundtrip))));
      assert.ok(parsed&&arsenalRecipeToLegacy(parsed));
      checked++;
     }
    }
   }
  }
 }
 assert.ok(checked>=15,'Insufficient cross-family candidate coverage '+checked);
 assert.ok(groups>=5,'Insufficient supported physical rail surfaces '+groups);
});
test('M2.8B saved light side and grip palm follow selected physical candidate',()=>{
 let c=selectWeaponFamilyPreset(initialWeaponConfiguration('carbine'),'ar-m4a1');
 c=setWeaponAttachment(c,'light','light-compact');
 c=setWeaponAttachment(c,'foregrip','foregrip-vertical');
 const base=recipe(c);
 for(const side of ['left','right']){
  const rail=mountPickerState(base,'light').rails.find(r=>r.face===side);
  assert.ok(rail);
  const selected=chooseWeaponMountPosition(c,'light',rail.choices.at(-1));
  const seat=mountedAccessorySeat(selected,'light');
  assert.ok(seat?.lens);
  const emission=weaponLightEmitter({x:0,z:0,yaw:0},selected);
  const gun=resolveWeaponAssembly(selected);
  const expectedSide=seat.lens.z*gun.lengthScale;
  assert.ok(Math.abs(emission.y-expectedSide)<.001);
  assert.equal(seat.placement.face,side);
 }
 const gripRail=mountPickerState(base,'foregrip').rails[0];
 assert.ok(gripRail);
 const selected=chooseWeaponMountPosition(c,'foregrip',gripRail.choices.at(-1));
 const seat=mountedAccessorySeat(selected,'foregrip');
 const hand=riflePoseContacts(selected.weapon,selected)?.support;
 assert.ok(seat?.hand&&hand);
 assert.ok(Math.abs((hand.near.x+hand.far.x)/2-seat.hand.x)<.001);
 assert.equal(hand.near.y,seat.hand.y);
});
test('M2.8B a chosen optic front/rear position updates visible seat',()=>{
 let c=selectWeaponFamilyPreset(initialWeaponConfiguration('carbine'),'ar-m4a1');
 c=setWeaponAttachment(c,'optic','optic-reflex');
 const rail=mountPickerState(recipe(c),'optic').rails.find(r=>r.face==='top');
 assert.ok(rail);
 for(const choice of rail.choices){
  const selected=chooseWeaponMountPosition(c,'optic',choice);
  const visual=opticVisualSeat(selected,
   resolveWeaponAssembly(selected).mounted.optic.mountX);
  assert.ok(Math.abs(visual.x-choice.x)<.001);
 }
});
