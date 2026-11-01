import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,readCampaign,buyWeaponAttachment,equipCampaignWeaponAttachment,
 equipCampaignWeapon,acceptContract} from '../src/campaign-state.ts';
import {attachmentPrice,catalogStockIds} from '../src/equipment-weapon-inventory.ts';

test('19.08 campaign attachment stock and legacy inventory migrate safely',()=>{
 const fresh=newCampaign(9);
 for(const id of catalogStockIds)assert.equal(fresh.inventory.attachments[id],0);
 const legacy=structuredClone(fresh);delete legacy.inventory.attachments;
 const restored=readCampaign(JSON.stringify(legacy));
 assert.ok(restored);
 assert.deepEqual(restored.inventory.attachments,fresh.inventory.attachments);
 assert.deepEqual(readCampaign(JSON.stringify(fresh)),fresh);
});
test('19.08 buying and equipping transfers exactly one paid item',()=>{
 const base=newCampaign(9),price=attachmentPrice('optic-reflex');
 assert.equal(equipCampaignWeaponAttachment(base,'rook','optic','optic-reflex'),base);
 const purchased=buyWeaponAttachment(base,'optic-reflex');
 assert.equal(purchased.funds,base.funds-price);
 assert.equal(purchased.inventory.attachments['optic-reflex'],1);
 const equipped=equipCampaignWeaponAttachment(purchased,'rook','optic','optic-reflex');
 assert.equal(equipped.inventory.attachments['optic-reflex'],0);
 assert.equal(equipped.operators[0].weaponConfiguration.slots.optic,'optic-reflex');
 assert.equal(equipCampaignWeaponAttachment(equipped,'moss','optic','optic-reflex'),equipped);
 const returned=equipCampaignWeaponAttachment(equipped,'rook','optic','optic-irons');
 assert.equal(returned.inventory.attachments['optic-reflex'],1);
 assert.equal(returned.funds,purchased.funds);
});
test('19.08 switching weapon returns incompatible parts and locks deployed kits',()=>{
 let c=newCampaign(11);
 c=buyWeaponAttachment(c,'optic-magnified');
 c=equipCampaignWeaponAttachment(c,'rook','optic','optic-magnified');
 c={...c,inventory:{...c.inventory,weapons:{...c.inventory.weapons,smg:1}}};
 c=equipCampaignWeapon(c,'rook','smg');
 assert.equal(c.operators[0].weaponConfiguration.slots.optic,'optic-irons');
 assert.equal(c.inventory.attachments['optic-magnified'],1);
 const locked=acceptContract(c,c.contracts[0].id);
 assert.equal(buyWeaponAttachment(locked,'muzzle-brake'),locked);
 assert.equal(equipCampaignWeaponAttachment(locked,'rook','optic','optic-magnified'),locked);
});
test('19.08 invalid and free factory attachment purchases are rejected',()=>{
 const c=newCampaign(11);
 assert.equal(buyWeaponAttachment(c,'muzzle-bare'),c);
 assert.equal(buyWeaponAttachment(c,'not-an-attachment'),c);
 assert.equal(equipCampaignWeaponAttachment(c,'rook','muzzle','optic-reflex'),c);
});
