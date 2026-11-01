import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,readCampaign,buyWeaponAttachment,equipCampaignWeaponAttachment,
 saveCampaignKitPreset,applyCampaignKitPreset,acceptContract}
 from '../src/campaign-state.ts';
import {readKitPresets} from '../src/equipment-presets.ts';

test('20.11 recipes save and restore weapon attachments without cloning paid stock',()=>{
 let c=newCampaign(115);
 c=buyWeaponAttachment(c,'optic-reflex');
 c=equipCampaignWeaponAttachment(c,'rook','optic','optic-reflex');
 c=saveCampaignKitPreset(c,'rook','ENTRY');
 const preset=c.kitPresets[0];
 assert.equal(preset.weaponConfiguration.slots.optic,'optic-reflex');
 c=equipCampaignWeaponAttachment(c,'rook','optic','optic-irons');
 assert.equal(c.inventory.attachments['optic-reflex'],1);
 c=applyCampaignKitPreset(c,'rook',preset.id);
 assert.equal(c.operators[0].weaponConfiguration.slots.optic,'optic-reflex');
 assert.equal(c.inventory.attachments['optic-reflex'],0);
 assert.deepEqual(readCampaign(JSON.stringify(c)),c);
});
test('20.11 missing paid part blocks applying recipe atomically',()=>{
 let c=newCampaign(115);
 c=buyWeaponAttachment(c,'optic-reflex');
 c=equipCampaignWeaponAttachment(c,'rook','optic','optic-reflex');
 c=saveCampaignKitPreset(c,'rook','ENTRY');
 const presetId=c.kitPresets[0].id;
 c=equipCampaignWeaponAttachment(c,'rook','optic','optic-irons');
 c=equipCampaignWeaponAttachment(c,'ash','optic','optic-reflex');
 const previous=c;
 assert.equal(applyCampaignKitPreset(c,'rook',presetId),previous);
 assert.equal(c.inventory.attachments['optic-reflex'],0);
});
test('20.11 older recipes migrate with factory configuration',()=>{
 const legacy=[{id:'kit-1',name:'Old',weapon:'rifle',kit:{version:1,slots:{}}}];
 const presets=readKitPresets(legacy);
 assert.equal(presets[0].weaponConfiguration.weapon,'rifle');
 assert.equal(presets[0].weaponConfiguration.slots.optic,'optic-irons');
 const c=newCampaign(12);
 const locked=acceptContract(c,c.contracts[0].id);
 assert.equal(applyCampaignKitPreset(locked,'rook','kit-1'),locked);
});
