import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DISPATCH_PRESETS,createDispatchSetup,dispatchPresetDraft,
 dispatchSetupCustomized,dispatchSetupDisplayLabel}
 from '../src/dispatch-campaign-setup.ts';
import {dispatchCreationReview} from '../src/dispatch-campaign-review.ts';
import {dispatchDepartmentView} from '../src/dispatch-department-view.ts';
import {newDispatchPilotCampaign} from '../src/dispatch-campaign-starter.ts';
import {readCampaign} from '../src/campaign-state.ts';

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
