import test from 'node:test';import assert from 'node:assert/strict';
import {PACK_PROFILES,canonicalPackEquipment} from '../src/operator-backpack-catalog.ts';
import {EQUIPMENT_CATALOG} from '../src/equipment-catalog.ts';
import {quoteBackpackChoice} from '../src/equipment-backpack-change.ts';
import {initialEquipmentLoadout,setEquipmentChoice} from '../src/equipment-loadouts.ts';
test('BP12 canonical pack stats have one authoritative source',()=>{
 for(const p of Object.values(PACK_PROFILES)){
  const e=EQUIPMENT_CATALOG[p.id];
  assert.equal(e.capacity,p.capacity);assert.equal(e.massKg,p.massKg);assert.equal(e.bulk,p.bulk);
  assert.equal(e.capability,undefined);
 }
 assert.equal(canonicalPackEquipment('admin-pack'),'backpack-panel');
});
test('BP12 incompatible mount rejects without changing source; larger pack preserves inventory',()=>{
 let kit=initialEquipmentLoadout();
 kit=setEquipmentChoice(kit,'backpack','backpack-day');
 const before=JSON.stringify(kit);
 assert.equal(quoteBackpackChoice(kit,[],'admin-pack','armor-bare','no-rig').ok,false);
 const quote=quoteBackpackChoice(kit,[],'rucksack','armor-bare','no-rig');
 assert.equal(quote.ok,true,quote.reason);
 assert.equal(quote.kit.slots.backpack,'backpack-expedition');
 assert.equal(JSON.stringify(kit),before);
});
