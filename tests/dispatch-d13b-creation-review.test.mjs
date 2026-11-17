import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DISPATCH_PRESETS,createDispatchSetup,dispatchPresetDraft,
 dispatchSetupCustomized,dispatchSetupDisplayLabel}
 from '../src/dispatch-campaign-setup.ts';
import {dispatchCreationReview} from '../src/dispatch-campaign-review.ts';
import {dispatchDepartmentView} from '../src/dispatch-department-view.ts';
import {newDispatchPilotCampaign} from '../src/dispatch-campaign-starter.ts';
import {readCampaign,acceptContract,resolveOperation,hireRecruit} from '../src/campaign-state.ts';
import {weaponOwnershipIssues} from '../src/equipment-weapon-ownership.ts';

const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('D13.4 all five untouched presets review as their actual independent rule bundles',()=>{
 for(const preset of DISPATCH_PRESETS){
  const draft=dispatchPresetDraft(preset),review=dispatchCreationReview(draft);
  assert.equal(review.valid,true,preset);
  assert.equal(review.problem,'');
  assert.equal(dispatchSetupCustomized(draft),false);
  assert.equal(review.title,dispatchSetupDisplayLabel(draft));
  assert.ok(review.reference.length>0&&review.access.length>0&&review.armory.length>0);
  assert.equal(createDispatchSetup(draft).preset,preset);
 }
 assert.match(dispatchCreationReview(dispatchPresetDraft('decades')).time,/10 completed operations/);
 assert.match(dispatchCreationReview(dispatchPresetDraft('creative')).procurement,/No-charge.*finite stock/);
 assert.match(dispatchCreationReview(dispatchPresetDraft('historical')).reference,/MP5/);
});

test('D13.4 individual edits are not reset or mislabeled as unchanged presets',()=>{
 const original=dispatchPresetDraft('career');
 const customized={...original,referenceId:'russian-omon-2002',
  timeMode:'fixed',equipmentScope:'dispatch',unlockMode:'all'};
 assert.equal(dispatchSetupCustomized(customized),true);
 assert.equal(dispatchSetupCustomized(original),false);
 const view=dispatchCreationReview(customized);
 assert.equal(view.valid,true);
 assert.equal(view.title,'Customized Department Career');
 assert.match(view.reference,/OMON/);
 assert.match(view.access,/curated Dispatch/);
 assert.match(view.time,/Fixed starting reference/);
 const campaign=newDispatchPilotCampaign(4242,customized);
 assert.equal(dispatchDepartmentView(campaign).preset,view.title);
 assert.equal(campaign.name,'Dispatch Customized Department Career');
 const restored=readCampaign(JSON.stringify(campaign));
 assert.ok(restored);
 assert.equal(dispatchDepartmentView(restored).preset,view.title);
 assert.equal(restored.dispatchSetup?.referenceId,'russian-omon-2002');
 assert.equal(restored.dispatchSetup?.unlockMode,'all');
});

test('D13.4 reviews reject unsupported progressive references and stock combinations',()=>{
 const foreign={...dispatchPresetDraft('decades'),referenceId:'russian-omon-2002'};
 const foreignReview=dispatchCreationReview(foreign);
 assert.equal(foreignReview.valid,false);
 assert.match(foreignReview.problem,/1995 US SWAT/);
 assert.throws(()=>createDispatchSetup(foreign));
 const impossible={...dispatchPresetDraft('historical'),startingInventory:'all'};
 const stockReview=dispatchCreationReview(impossible);
 assert.equal(stockReview.valid,false);
 assert.match(stockReview.problem,/global equipment catalog/);
 assert.throws(()=>createDispatchSetup(impossible));
 assert.equal(foreign.timeMode,'progressive');
 assert.equal(impossible.equipmentScope,'department');
});

test('D13.4 creator previews choices before save without altering the rule authority',()=>{
 const ui=source('src/ui/dispatch-campaign-creator.ts');
 const css=source('src/ui/campaign-creator.css');
 assert.match(ui,/dispatchCreationReview\(draft\)/);
 assert.match(ui,/createDispatchSetup\(draft\)/);
 assert.match(ui,/projection\.problem/);
 assert.match(ui,/CAMPAIGN REVIEW/);
 assert.match(ui,/for\(const select of selects\)select\.addEventListener\('change',refresh\)/);
 assert.match(css,/campaign-creator-review-row/);
 assert.match(source('src/dispatch-department-view.ts'),/dispatchSetupDisplayLabel\(setup\)/);
});

test('D13.5 two-chapter service continuity survives round-trip with original owners intact',()=>{
 let c=newDispatchPilotCampaign(1342,dispatchPresetDraft('decades'));
 const oldSerials=c.operators.map(o=>o.weaponSerialId);
 const startingIds=c.operators.map(o=>o.id);
 for(let i=0;i<10;i++){
  const job=c.contracts.find(x=>x.status==='available'&&x.deadline>=c.day);
  assert.ok(job);
  const accepted=acceptContract(c,job.id);
  c=resolveOperation(accepted,{id:'d13b-'+i,contractId:job.id,
   day:accepted.day,outcome:'success',grade:'B',elapsed:45,
   participatingIds:startingIds.slice(0,1),casualties:[],objective:true,events:[]});
 }
 const before=dispatchDepartmentView(c);
 assert.equal(before.completed,10);
 assert.equal(before.chapterJustUnlocked,true);
 assert.match(before.chapterLabel,/2015/);
 const saved=readCampaign(JSON.stringify(c));
 assert.ok(saved);
 assert.equal(saved.history.length,10);
 assert.deepEqual(saved.operators.map(o=>o.weaponSerialId),oldSerials);
 assert.deepEqual(saved.dispatchDepartment,c.dispatchDepartment);
 assert.equal(dispatchDepartmentView(saved).chapterLabel,before.chapterLabel);
 const recruit=hireRecruit({...saved,funds:5000});
 assert.equal(recruit.operators.at(-1).weapon,'carbine');
 assert.equal(recruit.operators[0].weapon,'smg');
 assert.deepEqual(recruit.operators.slice(0,oldSerials.length).map(o=>o.weaponSerialId),
  oldSerials);
 assert.deepEqual(weaponOwnershipIssues(recruit),[]);
});
