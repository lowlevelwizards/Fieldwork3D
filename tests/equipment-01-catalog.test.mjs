import test from 'node:test';
import assert from 'node:assert/strict';
import {EQUIPMENT_CATALOG,DEFAULT_EQUIPMENT,LOADOUT_SLOTS,
 itemsForSlot,validEquipmentChoice,equipmentMass} from '../src/equipment-catalog.ts';
import {WEAPONS} from '../src/breach-combat.ts';

test('equipment catalog has unique stable keys and bounded physical metadata',()=>{
 for(const [id,item] of Object.entries(EQUIPMENT_CATALOG)){
  assert.equal(item.id,id);
  assert.ok(Number.isFinite(item.massKg)&&item.massKg>=0);
  assert.ok(Number.isFinite(item.bulk)&&item.bulk>=0);
  assert.ok(item.description.length);
  assert.ok(itemsForSlot(item.slot).includes(item));
  if(item.weapon)assert.ok(WEAPONS[item.weapon]);
  if(item.capacity!==undefined)assert.ok(item.capacity>=0);
 }
});
test('starter loadout choices are valid, with a single item per slot',()=>{
 for(const slot of LOADOUT_SLOTS){
  assert.ok(validEquipmentChoice(slot,DEFAULT_EQUIPMENT[slot]));
  assert.equal(validEquipmentChoice(slot,'fake'),false);
 }
 assert.equal(validEquipmentChoice('armor','head-helmet'),false);
 assert.equal(validEquipmentChoice('secondary','primary-carbine'),false);
});
test('physical carry weight derives from item metadata, not combat stats',()=>{
 const ids=['primary-carbine','armor-carrier','backpack-day'];
 assert.equal(equipmentMass(ids),3.15+6.8+1.2);
 assert.equal(equipmentMass(['unknown','head-none']),0);
});
