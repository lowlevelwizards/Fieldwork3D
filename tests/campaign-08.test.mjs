import test from 'node:test';import assert from 'node:assert/strict';
import {newCampaign,buyWeapon,equipCampaignWeapon,readCampaign} from '../src/campaign-state.ts';
test('armory purchases and equipment swaps conserve stock',()=>{
 let c=newCampaign(49);
 const bank=c.funds;
 c=buyWeapon(c,'rifle');
 assert.equal(c.funds,bank-420);
 assert.equal(c.inventory.weapons.rifle,1);
 const old=c.operators[0];
 c=equipCampaignWeapon(c,'rook','rifle');
 assert.equal(c.operators[0].weapon,'rifle');
 assert.equal(c.operators[0].magazine,0);
 assert.equal(c.operators[0].reserve,0);
 assert.equal(c.inventory.weapons.rifle,0);
 assert.equal(c.inventory.weapons[old.weapon],1);
 assert.deepEqual(equipCampaignWeapon(c,'moss','rifle'),c);
 assert.deepEqual(readCampaign(JSON.stringify(c)),c);
});
test('old campaign saves migrate to empty spare stock',()=>{
 const c=newCampaign(47);const legacy={...c};delete legacy.inventory;
 const updated=readCampaign(JSON.stringify(legacy));
 assert.deepEqual(updated.inventory.weapons,{carbine:0,smg:0,rifle:0,shotgun:0});
});