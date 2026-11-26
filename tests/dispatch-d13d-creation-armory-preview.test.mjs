import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DISPATCH_PRESETS,dispatchPresetDraft,currentDispatchReference}
 from '../src/dispatch-campaign-setup.ts';
import {dispatchCreationReview} from '../src/dispatch-campaign-review.ts';
import {dispatchCatalogAccessReview,dispatchCatalogWeaponAccess}
 from '../src/dispatch-weapon-access.ts';
import {mayChooseCampaignContent,mayChooseDispatchSetupContent}
 from '../src/dispatch-campaign-eligibility.ts';
import {newDispatchPilotCampaign} from '../src/dispatch-campaign-starter.ts';
import {catalogWeaponQuote} from '../src/campaign-weapon-procurement.ts';
import {buyCatalogWeapon} from '../src/campaign-state.ts';
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('D13.7 all five presets preview the exact same initial authorization as live Dispatch',()=>{
 for(const preset of DISPATCH_PRESETS){
  const draft=dispatchPresetDraft(preset),campaign=newDispatchPilotCampaign(1377,draft);
  const view=dispatchCreationReview(draft);
  assert.equal(view.valid,true);
  const named=dispatchCatalogAccessReview(draft,draft.referenceId,50);
  assert.ok(named.length>4);
  for(const model of named){
   const expected=model.status==='offered'?'ready':model.status;
   assert.equal(catalogWeaponQuote(campaign,model.id).status,expected,model.id);
  }
  assert.ok(view.weaponAccess.includes(named.filter(p=>p.status==='offered').length+' OFFERED'));
  assert.ok(view.weaponAccess.includes(named.filter(p=>p.status==='standing-locked').length+' STANDING 70'));
 }
});

test('D13.7 custom OMON and standing changes project the same live authorization',()=>{
 const draft={...dispatchPresetDraft('historical'),referenceId:'russian-omon-2002'};
 const c=newDispatchPilotCampaign(1378,draft);
 assert.equal(dispatchCatalogWeaponAccess(draft,draft.referenceId,50,'ak-aks74u'),'offered');
 assert.equal(dispatchCatalogWeaponAccess(draft,draft.referenceId,50,'hk-mp5a3'),'reference-locked');
 assert.match(dispatchCreationReview(draft).weaponAccess,/RESTRICTED/);
 const career=newDispatchPilotCampaign(1379,dispatchPresetDraft('career'));
 const at70={...career,dispatchDepartment:{...career.dispatchDepartment,standing:70}};
 assert.equal(dispatchCatalogWeaponAccess(career.dispatchSetup,currentDispatchReference(career),
  70,'hk-mp5a3'),'offered');
 assert.equal(catalogWeaponQuote(at70,'hk-mp5a3').status,'ready');
 const before=catalogWeaponQuote(career,'hk-mp5a3');
 assert.equal(before.status,'standing-locked');
 assert.strictEqual(buyCatalogWeapon(career,'hk-mp5a3'),career);
});

test('D13.7 1995-to-2015 progression changes future policy without altering current owned kit',()=>{
 const draft=dispatchPresetDraft('decades');
 const initial=newDispatchPilotCampaign(1380,draft);
 assert.equal(dispatchCatalogWeaponAccess(draft,currentDispatchReference(initial),50,'hk-mp5a3'),'offered');
 const latter={...initial,history:Array.from({length:10},(_,i)=>({id:'d13d-'+i}))};
 const reference=currentDispatchReference(latter);
 assert.equal(reference,'us-swat-2015');
 for(const model of dispatchCatalogAccessReview(draft,reference,50)){
  const live=catalogWeaponQuote(latter,model.id);
  assert.equal(live.status,model.status==='offered'?'ready':model.status,model.id);
 }
 assert.equal(latter.operators[0].weapon,'smg');
});

test('D13.7 dynamic preview contains no simulated campaign, new selection bypass or acquisition',()=>{
 const ui=source('src/ui/dispatch-campaign-creator.ts');
 const access=source('src/dispatch-campaign-eligibility.ts');
 const preview=source('src/dispatch-campaign-review.ts');
 assert.match(ui,/\['WEAPON ACCESS · STANDING 50','weaponAccess'\]/);
 assert.match(access,/mayChooseDispatchSetupContent\(effectiveDispatchSetup\(campaign\)/);
 assert.match(preview,/STARTING_DISPATCH_STANDING/);
 for(const name of ['newDispatchPilotCampaign','buyWeapon','reconcileCampaignWeaponOwnership']){
  assert.ok(!preview.includes(name));
 }
 assert.equal(mayChooseDispatchSetupContent(dispatchPresetDraft('historical'),
  'us-swat-mp5-1995',50,'equipment','primary-smg','primary'),true);
});
