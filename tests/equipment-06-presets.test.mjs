import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,readCampaign,saveCampaignKitPreset,applyCampaignKitPreset,
 deleteCampaignKitPreset,renameCampaignOperator,cycleCampaignAppearance,buyWeapon,
 equipCampaignGear,equipCampaignWeapon} from '../src/campaign-state.ts';
import {readKitPresets} from '../src/equipment-presets.ts';

test('loadout presets are durable recipes and never duplicate weapon stock',()=>{
 let c=newCampaign(33);
 c=equipCampaignGear(c,'rook','armor','armor-carrier');
 c=saveCampaignKitPreset(c,'rook','Heavy entry');
 assert.equal(c.kitPresets[0].kit.slots.armor,'armor-carrier');
 assert.equal(c.kitPresets[0].weapon,'carbine');
 assert.deepEqual(readCampaign(JSON.stringify(c)),c);
 const beforeStock=JSON.stringify(c.inventory.weapons);
 const next=applyCampaignKitPreset(c,'moss',c.kitPresets[0].id);
 assert.equal(next,c,'unavailable primary should atomically block recipe');
 assert.equal(JSON.stringify(next.inventory.weapons),beforeStock);
 c=buyWeapon(c,'carbine');
 const stock=c.inventory.weapons.carbine;
 c=applyCampaignKitPreset(c,'moss',c.kitPresets[0].id);
 assert.equal(c.operators[1].weapon,'carbine');
 assert.equal(c.operators[1].loadout.slots.armor,'armor-carrier');
 assert.equal(c.inventory.weapons.carbine,stock-1);
 assert.equal(c.inventory.weapons.smg,1);
 c=deleteCampaignKitPreset(c,'kit-1');
 assert.deepEqual(c.kitPresets,[]);
 assert.equal(c.operators[1].weapon,'carbine');
});
test('legacy saves receive empty presets and corrupted preset records are dropped',()=>{
 const c=newCampaign(1);
 const old=JSON.parse(JSON.stringify(c));delete old.kitPresets;
 assert.deepEqual(readCampaign(JSON.stringify(old)).kitPresets,[]);
 assert.deepEqual(readKitPresets([{id:'x',name:'No',weapon:'bad'},
  {id:'kit-1',name:' Good ',weapon:'rifle',kit:{version:1,slots:{armor:'head-helmet'}}}])
 .map(p=>({id:p.id,name:p.name,armor:p.kit.slots.armor})),
 [{id:'kit-1',name:'Good',armor:'armor-soft'}]);
});
test('callsign and appearance edits are bounded and do not damage identity',()=>{
 const c=newCampaign(2);
 const next=renameCampaignOperator(c,'rook','  HAWK  ');
 assert.equal(next.operators[0].callsign,'HAWK');
 assert.equal(next.operators[0].id,'rook');
 assert.equal(renameCampaignOperator(c,'rook','MOSS'),c);
 assert.equal(renameCampaignOperator(c,'rook','   '),c);
 assert.notEqual(cycleCampaignAppearance(c,'rook').operators[0].appearanceSeed,
  c.operators[0].appearanceSeed);
});
