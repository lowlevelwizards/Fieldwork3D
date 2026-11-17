import test from 'node:test';
import assert from 'node:assert/strict';
import {initialWeaponConfiguration,selectWeaponFamilyPreset,
 setWeaponAttachment} from '../src/equipment-weapon-assemblies.ts';
import {arsenalRecipeFromLegacy}
 from '../src/arsenal/recipes.ts';
import {mountPickerState,nearestMountChoice}
 from '../src/arsenal/mount-picker-model.ts';
import {editArsenalMountPosition,createArsenalDraft,undoArsenalDraft,
 redoArsenalDraft} from '../src/arsenal/editor-state.ts';
import {arsenalRecipeToLegacy} from '../src/arsenal/recipes.ts';
import {mountedAccessorySeat} from '../src/weapons/geometry/mounted-accessory-layout.ts';
const ar=()=>selectWeaponFamilyPreset(initialWeaponConfiguration('carbine'),'ar-m4a1');
const light=()=>setWeaponAttachment(ar(),'light','light-compact');
const recipe=c=>{const r=arsenalRecipeFromLegacy(c);assert.ok(r);return r};
test('M2.7A physical side choices come from authored rails, not arbitrary mesh sockets',()=>{
 const c=light(),r=recipe(c);
 const state=mountPickerState(r,'light');
 assert.equal(state.automatic,true);
 assert.ok(state.rails.some(x=>x.face==='left'));
 assert.ok(state.rails.some(x=>x.face==='right'));
 assert.ok(state.rails.every(x=>x.choices.length>0&&
  x.choices.every(p=>p.ownerPartId===x.ownerPartId&&
   p.surfaceId===x.surfaceId&&p.face===x.face)));
 assert.equal(state.selectedKey?.includes('right'),true);
 assert.equal(state.attachmentId,'light-compact');
});
test('M2.7A every presented side choice becomes a resolved mounted seat',()=>{
 const r=recipe(light());
 for(const rail of mountPickerState(r,'light').rails){
  for(const candidate of [rail.choices[0],rail.choices.at(-1)]){
   const changed=editArsenalMountPosition(createArsenalDraft(r),'light',candidate);
   assert.equal(changed.working.mountSelections?.light?.face,rail.face);
   const config=arsenalRecipeToLegacy(changed.working);assert.ok(config);
   const seat=mountedAccessorySeat(config,'light');assert.ok(seat);
   assert.equal(seat.placement.face,rail.face);
   assert.equal(seat.placement.surfaceId,rail.surfaceId);
   assert.ok(Math.abs(seat.x-candidate.x)<.72,'candidate must not jump');
  }
 }
});
test('M2.7B step position and Automatic reset are undoable and preserve price-free identity',()=>{
 const r=recipe(light()),before=createArsenalDraft(r);
 const left=mountPickerState(r,'light').rails.find(x=>x.face==='left');
 assert.ok(left);
 const forward=nearestMountChoice(left,Infinity);
 assert.strictEqual(forward,left.choices.at(-1));
 const next=editArsenalMountPosition(before,'light',forward);
 assert.equal(next.undo.length,1);
 assert.equal(next.working.mountSelections?.light?.face,'left');
 const reversed=undoArsenalDraft(next);
 assert.deepEqual(reversed.working,r);
 assert.equal(redoArsenalDraft(reversed).working.mountSelections?.light?.face,'left');
 const auto=editArsenalMountPosition(next,'light',null);
 assert.equal(auto.working.mountSelections,undefined);
 assert.equal(auto.undo.length,2);
 assert.equal(auto.working.accessories.light,r.accessories.light);
 assert.equal(undoArsenalDraft(auto).working.mountSelections?.light?.face,'left');
});
test('M2.7B optics and grips use physical rail candidates, integral furniture hides picker',()=>{
 let c=ar();
 assert.equal(mountPickerState(recipe(c),'optic').rails.length,0);
 assert.equal(mountPickerState(recipe(c),'foregrip').rails.length,0);
 c=setWeaponAttachment(c,'optic','optic-reflex');
 c=setWeaponAttachment(c,'foregrip','foregrip-vertical');
 const r=recipe(c);
 assert.ok(mountPickerState(r,'optic').rails.some(x=>x.face==='top'));
 assert.ok(mountPickerState(r,'foregrip').rails.some(x=>x.face==='bottom'));
});
test('M2.7B unsupported face and unresolved physical rail are never displayed',()=>{
 const noRail=selectWeaponFamilyPreset(initialWeaponConfiguration('rifle'),'g36-service');
 const r=recipe(noRail);
 assert.equal(mountPickerState(r,'light').rails.length,0);
 assert.ok(mountPickerState(r,'light').reason);
 const c=light(),v=recipe(c);
 v.mountSelections={light:{attachmentId:'light-compact',
  ownerPartId:'missing-part',surfaceId:'invalid-rail',face:'left',
  standard:'picatinny',position:.5}};
 const state=mountPickerState(v,'light');
 assert.equal(state.rails.length,0);
 assert.ok(state.reason);
});
