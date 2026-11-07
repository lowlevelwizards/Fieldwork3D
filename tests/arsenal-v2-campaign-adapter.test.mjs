import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign} from '../src/campaign-state.ts';
import {arsenalRecipeFromLegacy} from '../src/arsenal/recipes.ts';
import {quoteCampaignArsenalEdit,commitCampaignArsenalEdit}
 from '../src/arsenal/campaign-adapter.ts';
const fixture=()=>{
 const c=newCampaign(71),o=c.operators.find(x=>x.id==='rook');
 assert.ok(o);
 const recipe=arsenalRecipeFromLegacy(o.weaponConfiguration);
 assert.ok(recipe);
 return {c,o,recipe};
};
test('Campaign quote is pure and paid optic commits once without changing serials or magazines',()=>{
 const {c,o,recipe}=fixture(),raw=structuredClone(c);
 const desired=structuredClone(recipe);desired.accessories.optic='optic-reflex';
 const quote=quoteCampaignArsenalEdit(c,o.id,desired);
 assert.equal(quote.valid,true);assert.equal(quote.canCommit,true);
 assert.equal(quote.cost,120);assert.equal(quote.purchases[0].partId,'optic-reflex');
 assert.deepEqual(c,raw,'quote cannot mutate authority');
 const changed=commitCampaignArsenalEdit(c,o.id,desired);
 assert.equal(changed.state.funds,c.funds-120);
 const updated=changed.state.operators.find(x=>x.id===o.id);
 assert.equal(updated.weaponSerialId,o.weaponSerialId);
 assert.equal(updated.weapon,o.weapon);
 assert.equal(updated.magazine,o.magazine);
 assert.equal(updated.reserve,o.reserve);
 assert.deepEqual(updated.magazines,o.magazines);
 assert.equal(updated.weaponConfiguration.slots.optic,'optic-reflex');
 const repeat=commitCampaignArsenalEdit(changed.state,o.id,desired);
 assert.equal(repeat.state,changed.state,'identical committed recipe is a no-op');
});
test('displaced purchased accessories return once and can be re-equipped without buying again',()=>{
 const {c,o,recipe}=fixture();
 const scoped=structuredClone(recipe);scoped.accessories.optic='optic-reflex';
 const mounted=commitCampaignArsenalEdit(c,o.id,scoped).state;
 const removed=commitCampaignArsenalEdit(mounted,o.id,recipe).state;
 assert.equal(removed.inventory.attachments['optic-reflex'],1);
 const reequipped=commitCampaignArsenalEdit(removed,o.id,scoped);
 assert.equal(reequipped.quote.cost,0);
 assert.equal(reequipped.state.inventory.attachments['optic-reflex'],0);
 assert.equal(reequipped.state.funds,removed.funds);
});
test('insufficient credits or active deployment never causes partial writes',()=>{
 const {c,o,recipe}=fixture();const scoped=structuredClone(recipe);
 scoped.accessories.optic='optic-reflex';
 const poor={...c,funds:0};
 const q=quoteCampaignArsenalEdit(poor,o.id,scoped);
 assert.equal(q.valid,true);assert.equal(q.canCommit,false);
 assert.equal(commitCampaignArsenalEdit(poor,o.id,scoped).state,poor);
 const active={...c,activeContractId:'mission-live'};
 assert.equal(quoteCampaignArsenalEdit(active,o.id,scoped).valid,false);
 assert.equal(commitCampaignArsenalEdit(active,o.id,scoped).state,active);
});
test('cross-class weapon conversion requires explicit owned weapon swap',()=>{
 const {c,o,recipe}=fixture();
 const incompatible={...recipe,weapon:'smg'};
 const q=quoteCampaignArsenalEdit(c,o.id,incompatible);
 assert.equal(q.valid,false);
 assert.equal(commitCampaignArsenalEdit(c,o.id,incompatible).state,c);
});
