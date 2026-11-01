import test from 'node:test';import assert from 'node:assert/strict';
import {newCampaign,buyWeapon,equipCampaignWeapon,readCampaign,
 migrateLegacyRoster} from '../src/campaign-state.ts';
import {initialRoster} from '../src/breach-roster.ts';
import {weaponOwnershipIssues} from '../src/equipment-weapon-ownership.ts';
test('27.01 new Campaign has four physical serials and no unowned guns',()=>{
 const c=newCampaign(123);
 assert.deepEqual(weaponOwnershipIssues(c),[]);
 assert.equal(c.inventory.serializedWeapons.length,4);
 assert.ok(c.operators.every(o=>o.weaponSerialId));
 assert.ok(Object.values(c.inventory.weapons).every(n=>n===0));
});
test('27.01 purchase, swap and return preserve the exact serial',()=>{
 const c=newCampaign(42),old=c.operators[0].weaponSerialId;
 const purchased=buyWeapon(c,'smg');
 assert.equal(purchased.inventory.weapons.smg,1);
 const swapped=equipCampaignWeapon(purchased,'rook','smg');
 assert.notEqual(swapped.operators[0].weaponSerialId,old);
 assert.equal(swapped.inventory.weapons.smg,0);
 assert.equal(swapped.inventory.weapons.carbine,1);
 assert.deepEqual(weaponOwnershipIssues(swapped),[]);
 const back=equipCampaignWeapon(swapped,'rook','carbine');
 assert.equal(back.operators[0].weaponSerialId,old);
 assert.deepEqual(weaponOwnershipIssues(back),[]);
});
test('27.01 pre-serial Campaign migrations are repeatable and conserve stock',()=>{
 const old=JSON.parse(JSON.stringify(newCampaign(13)));
 delete old.inventory.serializedWeapons;
 for(const o of old.operators)delete o.weaponSerialId;
 old.inventory.weapons.carbine=2;
 const first=readCampaign(JSON.stringify(old)),again=readCampaign(JSON.stringify(old));
 assert.ok(first);
 assert.deepEqual(first,again);
 assert.equal(first.inventory.serializedWeapons.length,6);
 assert.deepEqual(weaponOwnershipIssues(first),[]);
 assert.deepEqual(weaponOwnershipIssues(migrateLegacyRoster(first,initialRoster())),[]);
});
test('27.01 duplicated saved serial claims do not duplicate assets',()=>{
 const saved=JSON.parse(JSON.stringify(newCampaign(27)));
 saved.operators[1].weaponSerialId=saved.operators[0].weaponSerialId;
 const migrated=readCampaign(JSON.stringify(saved));
 assert.ok(migrated);
 assert.deepEqual(weaponOwnershipIssues(migrated),[]);
 assert.equal(new Set(migrated.operators.map(o=>o.weaponSerialId)).size,4);
});
