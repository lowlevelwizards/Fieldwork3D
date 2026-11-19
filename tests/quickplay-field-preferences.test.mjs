import test from 'node:test';
import assert from 'node:assert/strict';
import {initialRoster} from '../src/breach-roster.ts';
import {replaceFieldQuantity,fieldQuantity} from '../src/equipment-field-inventory.ts';
import {serializeQuickPlayKitPreferences,applyQuickPlayKitPreferences,
 refreshQuickPlayPreparedRoster} from '../src/breach-quickplay-kit-preferences.ts';
import {loadQuickPlayRoster,saveQuickPlayRoster} from '../src/breach-persistence.ts';
test('round reset keeps planned equipment but not wounds, used ammo or mission progression',()=>{
 const previous=initialRoster();
 const operator=previous.members[0];
 operator.loadout={...operator.loadout,
  fieldInventory:replaceFieldQuantity(operator.loadout.fieldInventory,'flashbang',2)};
 operator.injuries=2;operator.recovery=3;operator.magazine=1;operator.reserve=0;
 operator.missions=10;operator.callsign='NEW CALLSIGN';
 const next=refreshQuickPlayPreparedRoster(previous);
 const prepared=next.members[0];
 assert.equal(fieldQuantity(prepared.loadout.fieldInventory,'flashbang'),2);
 assert.equal(prepared.injuries,0);
 assert.equal(prepared.recovery,0);
 assert.equal(prepared.missions,0);
 assert.equal(prepared.callsign,'NEW CALLSIGN');
 assert.ok(prepared.magazine>1);
 assert.ok(prepared.reserve>0);
});
test('physical field kit preferences round-trip independently of live ammo and health',()=>{
 const roster=initialRoster();
 const m=roster.members[0];
 m.loadout={...m.loadout,fieldInventory:
  replaceFieldQuantity(m.loadout.fieldInventory,'flashbang',3)};
 m.injuries=2;m.magazine=0;m.reserve=0;
 const serialized=serializeQuickPlayKitPreferences(roster);
 assert.ok(!serialized.includes('injuries'));
 const applied=applyQuickPlayKitPreferences(initialRoster(),serialized);
 assert.equal(fieldQuantity(applied.members[0].loadout.fieldInventory,'flashbang'),3);
 assert.equal(applied.members[0].injuries,0);
 assert.ok(applied.members[0].magazine>0);
 assert.ok(applied.members[0].reserve>0);
});
test('browser adapter saves cosmetics and independent gear preference keys',()=>{
 const map=new Map();
 const storage={
  getItem:key=>map.get(key)??null,setItem:(key,value)=>{map.set(key,value);},
  removeItem:key=>{map.delete(key);}
 };
 const roster=initialRoster();
 const m=roster.members[0];m.callsign='CUSTOM';
 m.loadout={...m.loadout,fieldInventory:
  replaceFieldQuantity(m.loadout.fieldInventory,'flashbang',2)};
 assert.equal(saveQuickPlayRoster(roster,storage),true);
 const loaded=loadQuickPlayRoster(storage);
 assert.equal(loaded.members[0].callsign,'CUSTOM');
 assert.equal(fieldQuantity(loaded.members[0].loadout.fieldInventory,'flashbang'),2);
 assert.equal(loaded.members[0].injuries,0);
 assert.equal(map.size,2);
});
test('malformed persisted preferences cannot inject invalid inventory',()=>{
 const applied=applyQuickPlayKitPreferences(initialRoster(),'{ invalid');
 assert.equal(fieldQuantity(applied.members[0].loadout.fieldInventory,'flashbang'),1);
});
