import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,acceptContract,equipCampaignFieldInventory,
 equipCampaignPreGoFieldInventory} from '../src/campaign-state.ts';
import {fieldQuantity,initialFieldInventory,replaceFieldQuantity}
 from '../src/equipment-field-inventory.ts';

test('accepted-contract field preparation is assigned-only and stock-aware',()=>{
 const initial=newCampaign(73),accepted=acceptContract(initial,initial.contracts[0].id);
 const id=accepted.squadIds[0],operator=accepted.operators.find(o=>o.id===id);
 assert.ok(operator);
 const inventory=operator.loadout.fieldInventory??initialFieldInventory(operator.loadout);
 const changed=replaceFieldQuantity(inventory,'flashbang',2);
 assert.equal(equipCampaignFieldInventory(accepted,id,changed),accepted);
 const prepared=equipCampaignPreGoFieldInventory(accepted,id,changed);
 assert.notEqual(prepared,accepted);
 assert.equal(fieldQuantity(prepared.operators.find(o=>o.id===id).loadout.fieldInventory,'flashbang'),2);
 assert.equal(prepared.supplies.flash,accepted.supplies.flash);
 assert.equal(prepared.inventory.weapons.carbine,accepted.inventory.weapons.carbine);
});
test('pre-GO API cannot alter an unaccepted contract or an unassigned operator',()=>{
 const initial=newCampaign(72);
 const id=initial.squadIds[0],target=initial.operators.find(o=>o.id===id);
 const inventory=replaceFieldQuantity(target.loadout.fieldInventory??initialFieldInventory(target.loadout),'flashbang',2);
 assert.equal(equipCampaignPreGoFieldInventory(initial,id,inventory),initial);
 const accepted=acceptContract(initial,initial.contracts[0].id);
 assert.equal(equipCampaignPreGoFieldInventory(accepted,'nonexistent',inventory),accepted);
 const reserve=accepted.operators.find(o=>!accepted.squadIds.includes(o.id));
 if(reserve)assert.equal(equipCampaignPreGoFieldInventory(accepted,reserve.id,inventory),accepted);
});
test('pre-GO supply quotation rejects a squad over-allocation atomically',()=>{
 const initial=newCampaign(88),accepted=acceptContract(initial,initial.contracts[0].id);
 const id=accepted.squadIds[0],operator=accepted.operators.find(o=>o.id===id);
 const inventory=operator.loadout.fieldInventory??initialFieldInventory(operator.loadout);
 const over=replaceFieldQuantity(inventory,'flashbang',4);
 const result=equipCampaignPreGoFieldInventory({...accepted,supplies:{...accepted.supplies,flash:1}},id,over);
 assert.equal(result.supplies.flash,1);
 assert.equal(fieldQuantity(result.operators.find(o=>o.id===id).loadout.fieldInventory,'flashbang'),
  fieldQuantity(inventory,'flashbang'));
});
