import test from 'node:test';
import assert from 'node:assert/strict';
import {initialWeaponConfiguration,selectWeaponFamilyPreset,setWeaponAttachment}
 from '../src/equipment-weapon-assemblies.ts';
import {physicalAttachmentFitOptions} from '../src/weapons/geometry/weapon-physical-mount-fit.ts';
import {arsenalRecipeFromLegacy,arsenalRecipeToLegacy}
 from '../src/arsenal/recipes.ts';
import {createArsenalDraft,editArsenalMountPosition,
 undoArsenalDraft,redoArsenalDraft,arsenalDraftDirty}
 from '../src/arsenal/editor-state.ts';
import {proposeArsenalPartChange} from '../src/arsenal/compatibility.ts';
import {newCampaign} from '../src/campaign-state.ts';
import {quoteCampaignArsenalEdit,commitCampaignArsenalEdit}
 from '../src/arsenal/campaign-adapter.ts';
const setup=()=>{
 let c=selectWeaponFamilyPreset(initialWeaponConfiguration('carbine'),'ar-m4a1');
 c=setWeaponAttachment(c,'light','light-compact');
 const recipe=arsenalRecipeFromLegacy(c);assert.ok(recipe);
 const options=physicalAttachmentFitOptions(c,'light-compact').options;
 const left=options.find(x=>x.face==='left'),right=options.find(x=>x.face==='right');
 assert.ok(left&&right);
 return {c,recipe,left,right};
};
test('M2.6G position changes group as one free undo/redo and dirty state',()=>{
 const {recipe,left,right}=setup();
 const draft=createArsenalDraft(recipe);
 const placed=editArsenalMountPosition(draft,'light',left);
 assert.equal(placed.undo.length,1);
 assert.equal(placed.working.mountSelections?.light?.face,'left');
 assert.ok(arsenalDraftDirty(placed));
 const reversed=undoArsenalDraft(placed);
 assert.ok(!arsenalDraftDirty(reversed));
 assert.deepEqual(reversed.working,draft.working);
 const redone=redoArsenalDraft(reversed);
 assert.equal(redone.working.mountSelections?.light?.face,'left');
 const moved=editArsenalMountPosition(redone,'light',right);
 assert.equal(moved.undo.length,2);
 const reset=editArsenalMountPosition(moved,'light',null);
 assert.equal(reset.working.mountSelections,undefined);
 assert.ok(arsenalRecipeToLegacy(reset.working));
});
test('M2.6D installed explicit rail choice prevents silent destructive furniture edit',()=>{
 const {recipe,left}=setup();
 const placed=editArsenalMountPosition(createArsenalDraft(recipe),'light',left);
 const switchRail=proposeArsenalPartChange(placed.working,'handguard','ar-round');
 // No silent light relocation, purchase, or loss; if dependent removal is
 // offered, the transaction must explicitly ask for acceptance.
 assert.ok(!switchRail.valid||switchRail.requiresConfirmation);
 if(switchRail.valid)assert.ok(switchRail.changes.some(c=>c.slot==='light'));
});
test('M2.6E same owned light can move without cost, inventory mutation or serial change',()=>{
 const c=newCampaign(74),op=c.operators.find(x=>x.id==='rook');assert.ok(op);
 const original=arsenalRecipeFromLegacy(op.weaponConfiguration);assert.ok(original);
 const first={...original,accessories:{...original.accessories,light:'light-compact'}};
 const purchase=quoteCampaignArsenalEdit(c,op.id,first);
 assert.equal(purchase.valid,true);assert.equal(purchase.cost,135);
 const paid=commitCampaignArsenalEdit(c,op.id,first);
 assert.equal(paid.state.funds,c.funds-135);
 const paidOp=paid.state.operators.find(x=>x.id===op.id);assert.ok(paidOp);
 const options=physicalAttachmentFitOptions(paidOp.weaponConfiguration,
  'light-compact').options;
 const left=options.find(x=>x.face==='left');assert.ok(left);
 const existing=arsenalRecipeFromLegacy(paidOp.weaponConfiguration);
 assert.ok(existing);
 const selected=editArsenalMountPosition(createArsenalDraft(existing),'light',left).working;
 assert.equal(selected.mountSelections?.light?.face,'left');
 const q=quoteCampaignArsenalEdit(paid.state,op.id,selected);
 assert.equal(q.valid,true);assert.equal(q.canCommit,true);
 assert.equal(q.cost,0);
 assert.deepEqual(q.purchases,[]);
 const moved=commitCampaignArsenalEdit(paid.state,op.id,selected);
 assert.notStrictEqual(moved.state,paid.state);
 assert.equal(moved.state.funds,paid.state.funds);
 assert.deepEqual(moved.state.inventory,paid.state.inventory);
 const now=moved.state.operators.find(x=>x.id===op.id);
 assert.equal(now.weaponSerialId,paidOp.weaponSerialId);
 assert.deepEqual(now.magazines,paidOp.magazines);
 assert.equal(now.weaponConfiguration.mountSelections?.light?.face,'left');
 assert.strictEqual(commitCampaignArsenalEdit(moved.state,op.id,selected).state,
  moved.state,'repeat apply cannot double charge');
});
test('M2.6E stale or invalid physical location cannot charge credits',()=>{
 const c=newCampaign(75),o=c.operators[0];
 const r=arsenalRecipeFromLegacy(o.weaponConfiguration);assert.ok(r);
 const desired={...r,accessories:{...r.accessories,light:'light-compact'},
  mountSelections:{light:{
   attachmentId:'light-compact',ownerPartId:'fictional-rail',
   surfaceId:'fictional-rail:light:side',standard:'picatinny',
   face:'left',position:.5
  }}};
 const q=quoteCampaignArsenalEdit(c,o.id,desired);
 assert.equal(q.valid,false);
 assert.strictEqual(commitCampaignArsenalEdit(c,o.id,desired).state,c);
});
