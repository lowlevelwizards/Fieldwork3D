import test from 'node:test';
import assert from 'node:assert/strict';
import {dispatchPresetDraft} from '../src/dispatch-campaign-setup.ts';
import {newDispatchPilotCampaign} from '../src/dispatch-campaign-starter.ts';
import {newCampaign,readCampaign,purchaseAndEquipWeaponAttachment,
 buyWeaponAttachment,equipCampaignWeaponAttachment,acceptContract}
 from '../src/campaign-state.ts';
import {attachmentPrice} from '../src/equipment-weapon-inventory.ts';

test('D13.8 creative direct buy-and-equip has no charge and preserves owned identity',()=>{
 const fresh=newDispatchPilotCampaign(1318,dispatchPresetDraft('creative'));
 const c={...fresh,funds:0};
 const before=c.operators.find(x=>x.id==='rook');
 assert.ok(before);
 const purchased=purchaseAndEquipWeaponAttachment(c,'rook','optic','optic-reflex');
 assert.notStrictEqual(purchased,c);
 assert.equal(purchased.funds,0);
 const operator=purchased.operators.find(x=>x.id==='rook');
 assert.equal(operator.weaponConfiguration.slots.optic,'optic-reflex');
 assert.equal(operator.weaponSerialId,before.weaponSerialId);
 assert.deepEqual(operator.magazines,before.magazines);
 assert.equal(purchased.inventory.attachments['optic-reflex']??0,0);
 assert.deepEqual(readCampaign(JSON.stringify(purchased)),purchased);
 assert.strictEqual(purchaseAndEquipWeaponAttachment(purchased,'rook','optic','optic-reflex'),
  purchased,'a mounted accessory is not bought twice');
});

test('D13.8 Creative stock purchase and attachment transfer remain finite and free',()=>{
 const fresh={...newDispatchPilotCampaign(1319,dispatchPresetDraft('creative')),funds:0};
 const stock=buyWeaponAttachment(fresh,'optic-reflex');
 assert.equal(stock.funds,0);
 assert.equal(stock.inventory.attachments['optic-reflex'],1);
 const installed=purchaseAndEquipWeaponAttachment(stock,'rook','optic','optic-reflex');
 assert.equal(installed.funds,0);
 assert.equal(installed.inventory.attachments['optic-reflex'],0);
 const returned=equipCampaignWeaponAttachment(installed,'rook','optic','optic-irons');
 assert.equal(returned.inventory.attachments['optic-reflex'],1);
 assert.equal(returned.funds,0);
});

test('D13.8 ordinary campaigns still pay and insufficient funds still block',()=>{
 const normal=newCampaign(1320);
 const paid=purchaseAndEquipWeaponAttachment(normal,'rook','optic','optic-reflex');
 assert.equal(paid.funds,normal.funds-attachmentPrice('optic-reflex'));
 const poor={...normal,funds:0};
 assert.strictEqual(purchaseAndEquipWeaponAttachment(poor,'rook','optic','optic-reflex'),poor);
 const historical=newDispatchPilotCampaign(1321,dispatchPresetDraft('historical'));
 assert.strictEqual(purchaseAndEquipWeaponAttachment(historical,'rook','optic','optic-reflex'),
  historical,'curated Dispatch continues denying unclassified editing');
 const creative=newDispatchPilotCampaign(1322,dispatchPresetDraft('creative'));
 const active=acceptContract(creative,creative.contracts[0].id);
 assert.notStrictEqual(active,creative);
 assert.strictEqual(purchaseAndEquipWeaponAttachment(active,'rook','optic','optic-reflex'),
  active,'active deployment still freezes the armory');
});
