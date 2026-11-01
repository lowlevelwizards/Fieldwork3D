import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,readCampaign,equipCampaignWeapon} from '../src/campaign-state.ts';
import {initialRoster,readRoster,equipRoster,configureRosterWeapon}
 from '../src/breach-roster.ts';

test('19.04 new and legacy campaigns have one compatible configuration per soldier',()=>{
 const c=newCampaign(19);
 for(const person of c.operators)assert.equal(person.weaponConfiguration.weapon,person.weapon);
 const legacy=structuredClone(c);
 for(const p of legacy.operators)delete p.weaponConfiguration;
 const migrated=readCampaign(JSON.stringify(legacy));
 assert.ok(migrated);
 for(const person of migrated.operators){
  assert.equal(person.weaponConfiguration.weapon,person.weapon);
  assert.equal(person.weaponConfiguration.slots.optic,'optic-irons');
 }
 assert.deepEqual(readCampaign(JSON.stringify(migrated)),migrated);
});
test('19.04 Quick Play persists attachments without mutating ammunition or magazines',()=>{
 const base=initialRoster(),magazines=structuredClone(base.members[0].magazines);
 const configured=configureRosterWeapon(base,'rook','muzzle','muzzle-suppressor');
 assert.notEqual(configured,base);
 assert.equal(configured.members[0].weaponConfiguration.slots.muzzle,'muzzle-suppressor');
 assert.deepEqual(configured.members[0].magazines,magazines);
 assert.deepEqual(readRoster(JSON.stringify(configured)),configured);
 assert.equal(configureRosterWeapon(configured,'rook','optic','muzzle-brake'),configured);
});
test('19.04 platform change preserves only compatible attachments',()=>{
 let roster=initialRoster();
 roster=configureRosterWeapon(roster,'rook','optic','optic-magnified');
 roster=configureRosterWeapon(roster,'rook','light','light-compact');
 roster=equipRoster(roster,'rook','smg');
 assert.equal(roster.members[0].weaponConfiguration.slots.optic,'optic-irons');
 assert.equal(roster.members[0].weaponConfiguration.slots.light,'light-compact');
 assert.equal(roster.members[0].weaponConfiguration.weapon,'smg');
 let c=newCampaign(5);c.inventory.weapons.smg=1;
 c=equipCampaignWeapon(c,'rook','smg');
 assert.equal(c.operators[0].weaponConfiguration.weapon,'smg');
});
