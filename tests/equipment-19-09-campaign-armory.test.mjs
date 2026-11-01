import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,readCampaign,purchaseAndEquipWeaponAttachment,
 buyWeaponAttachment,equipCampaignWeaponAttachment,acceptContract}
 from '../src/campaign-state.ts';
import {attachmentPrice} from '../src/equipment-weapon-inventory.ts';

test('19.09 purchase-and-equip keeps stock, funds and ammunition consistent',()=>{
 const base=newCampaign(77),p=base.operators[0];
 const price=attachmentPrice('optic-reflex');
 const c=purchaseAndEquipWeaponAttachment(base,p.id,'optic','optic-reflex');
 assert.equal(c.funds,base.funds-price);
 assert.equal(c.operators[0].weaponConfiguration.slots.optic,'optic-reflex');
 assert.equal(c.inventory.attachments['optic-reflex'],0);
 assert.deepEqual(c.operators[0].magazines,p.magazines);
 assert.equal(c.operators[0].reserve,p.reserve);
 assert.deepEqual(readCampaign(JSON.stringify(c)),c);
});
test('19.09 existing stock installs without a second charge and returns previous unit',()=>{
 let c=newCampaign(79);
 c=buyWeaponAttachment(c,'optic-reflex');
 const funded=c.funds;
 c=purchaseAndEquipWeaponAttachment(c,'rook','optic','optic-reflex');
 assert.equal(c.funds,funded);
 assert.equal(c.inventory.attachments['optic-reflex'],0);
 c=equipCampaignWeaponAttachment(c,'rook','optic','optic-irons');
 assert.equal(c.inventory.attachments['optic-reflex'],1);
});
test('19.09 atomic failures never spend credits',()=>{
 let c=newCampaign(80);c={...c,funds:0};
 assert.equal(purchaseAndEquipWeaponAttachment(c,'rook','muzzle','muzzle-suppressor'),c);
 assert.equal(purchaseAndEquipWeaponAttachment(c,'rook','optic','muzzle-brake'),c);
 assert.equal(purchaseAndEquipWeaponAttachment(c,'unknown','optic','optic-reflex'),c);
 const locked=acceptContract(newCampaign(80),newCampaign(80).contracts[0].id);
 assert.equal(purchaseAndEquipWeaponAttachment(locked,'rook','optic','optic-reflex'),locked);
});
