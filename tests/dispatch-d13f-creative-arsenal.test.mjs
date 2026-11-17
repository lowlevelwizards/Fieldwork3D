import test from 'node:test';
import assert from 'node:assert/strict';
import {dispatchPresetDraft} from '../src/dispatch-campaign-setup.ts';
import {newDispatchPilotCampaign} from '../src/dispatch-campaign-starter.ts';
import {newCampaign,readCampaign,acceptContract} from '../src/campaign-state.ts';
import {arsenalRecipeFromLegacy} from '../src/arsenal/recipes.ts';
import {quoteCampaignArsenalEdit,commitCampaignArsenalEdit}
 from '../src/arsenal/campaign-adapter.ts';
import {attachmentPrice} from '../src/equipment-weapon-inventory.ts';

const proposal=campaign=>{
 const op=campaign.operators.find(x=>x.id==='rook');
 assert.ok(op);
 const recipe=arsenalRecipeFromLegacy(op.weaponConfiguration);
 assert.ok(recipe,'authored starter weapon has a supported Arsenal family build');
 return {op,recipe:{...recipe,accessories:{...recipe.accessories,optic:'optic-reflex'}}};
};

test('D13.9 Creative global Arsenal quoted payment is zero, purchase remains physical',()=>{
 const campaign={...newDispatchPilotCampaign(1391,dispatchPresetDraft('creative')),funds:0};
 const {op,recipe}=proposal(campaign);
 const raw=structuredClone(campaign);
 const quote=quoteCampaignArsenalEdit(campaign,op.id,recipe);
 assert.equal(quote.valid,true);
 assert.equal(quote.canCommit,true);
 assert.equal(quote.cost,0,'payable amount is zero in Creative');
 assert.deepEqual(quote.purchases.map(p=>p.partId),['optic-reflex']);
 assert.equal(quote.purchases[0].price,attachmentPrice('optic-reflex'));
 assert.deepEqual(campaign,raw,'quote is read-only');
 const {state:next,quote:committed}=commitCampaignArsenalEdit(campaign,op.id,recipe);
 assert.notStrictEqual(next,campaign);
 assert.equal(committed.cost,0);
 assert.equal(next.funds,0);
 const updated=next.operators.find(x=>x.id==='rook');
 assert.equal(updated.weaponConfiguration.slots.optic,'optic-reflex');
 assert.equal(updated.weaponSerialId,op.weaponSerialId);
 assert.deepEqual(updated.magazines,op.magazines);
 assert.equal(next.inventory.attachments['optic-reflex']??0,0);
 assert.deepEqual(readCampaign(JSON.stringify(next)),next);
 assert.strictEqual(commitCampaignArsenalEdit(next,op.id,recipe).state,next,
  'reapplying an already equipped build changes no ownership');
});

test('D13.9 global catalog with standard economy still pays actual credits',()=>{
 const draft={...dispatchPresetDraft('open'),equipmentScope:'global'};
 const c=newDispatchPilotCampaign(1392,draft);
 const {op,recipe}=proposal(c);
 const q=quoteCampaignArsenalEdit(c,op.id,recipe);
 assert.equal(q.valid,true);
 assert.equal(q.canCommit,true);
 assert.equal(q.cost,attachmentPrice('optic-reflex'));
 const {state:next}=commitCampaignArsenalEdit(c,op.id,recipe);
 assert.equal(next.funds,c.funds-q.cost);
 const poor={...c,funds:0};
 assert.equal(quoteCampaignArsenalEdit(poor,op.id,recipe).canCommit,false);
 assert.strictEqual(commitCampaignArsenalEdit(poor,op.id,recipe).state,poor);
});

test('D13.9 restricted Dispatch and active deployments retain mandatory guards',()=>{
 for(const preset of ['career','historical','decades','open']){
  const c=newDispatchPilotCampaign(1393,dispatchPresetDraft(preset));
  const {op,recipe}=proposal(c);
  const q=quoteCampaignArsenalEdit(c,op.id,recipe);
  assert.equal(q.canCommit,false,preset);
  assert.match(q.reason,/requires global equipment scope/);
  assert.strictEqual(commitCampaignArsenalEdit(c,op.id,recipe).state,c);
 }
 const creative=newDispatchPilotCampaign(1394,dispatchPresetDraft('creative'));
 const {op,recipe}=proposal(creative);
 const active=acceptContract(creative,creative.contracts[0].id);
 assert.notStrictEqual(active,creative);
 assert.match(quoteCampaignArsenalEdit(active,op.id,recipe).reason,/Finish the current contract/);
 assert.strictEqual(commitCampaignArsenalEdit(active,op.id,recipe).state,active);
 const original=newCampaign(1395);
 const {op:legacy,recipe:legacyRecipe}=proposal(original);
 assert.equal(quoteCampaignArsenalEdit(original,legacy.id,legacyRecipe).cost,
  attachmentPrice('optic-reflex'));
});
