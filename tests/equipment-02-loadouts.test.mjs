import test from 'node:test';
import assert from 'node:assert/strict';
import {initialEquipmentLoadout,readEquipmentLoadout,setEquipmentChoice,
 syncPrimaryWeapon,totalEquipmentMass} from '../src/equipment-loadouts.ts';
import {newCampaign,readCampaign,equipCampaignGear,buyWeapon,equipCampaignWeapon}
 from '../src/campaign-state.ts';

test('loadout normalization rejects invalid and wrong-slot choices',()=>{
 const original=initialEquipmentLoadout('smg');
 assert.equal(original.slots.primary,'primary-smg');
 const edited=setEquipmentChoice(original,'armor','armor-carrier');
 assert.equal(original.slots.armor,'armor-soft');
 assert.equal(edited.slots.armor,'armor-carrier');
 assert.equal(setEquipmentChoice(edited,'armor','head-helmet'),edited);
 assert.equal(readEquipmentLoadout({version:1,slots:{armor:'primary-rifle',
  head:'head-cap',primary:'primary-shotgun'}},'smg').slots.primary,'primary-smg');
 assert.equal(readEquipmentLoadout({version:1,slots:{head:'head-cap'}},'smg').slots.head,'head-cap');
 assert.equal(syncPrimaryWeapon(original,'rifle').slots.primary,'primary-rifle');
 assert.ok(totalEquipmentMass(original)>0);
});
test('campaign loadouts remain independent and survive v1 save migration',()=>{
 const c=newCampaign(21),rook=c.operators[0],moss=c.operators[1];
 assert.equal(rook.loadout.slots.primary,'primary-carbine');
 assert.equal(moss.loadout.slots.primary,'primary-smg');
 const changed=equipCampaignGear(c,'rook','armor','armor-carrier');
 assert.equal(changed.operators[0].loadout.slots.armor,'armor-carrier');
 assert.equal(c.operators[0].loadout.slots.armor,'armor-soft');
 assert.equal(changed.operators[1].loadout.slots.armor,'armor-soft');
 assert.deepEqual(readCampaign(JSON.stringify(changed)),changed);
 const legacy=JSON.parse(JSON.stringify(c));
 for(const member of legacy.operators)delete member.loadout;
 const migrated=readCampaign(JSON.stringify(legacy));
 assert.equal(migrated.operators[1].loadout.slots.primary,'primary-smg');
});
test('weapon swaps preserve campaign ownership and synchronize catalog choice',()=>{
 let c=newCampaign(9);
 assert.equal(equipCampaignGear(c,'rook','primary','primary-rifle'),c);
 c=buyWeapon(c,'rifle');
 const before=c.inventory.weapons.rifle;
 const swapped=equipCampaignWeapon(c,'rook','rifle');
 assert.equal(swapped.inventory.weapons.rifle,before-1);
 assert.equal(swapped.operators[0].weapon,'rifle');
 assert.equal(swapped.operators[0].loadout.slots.primary,'primary-rifle');
 assert.equal(swapped.operators[0].magazine,0);
 assert.equal(swapped.operators[0].reserve,0);
});
