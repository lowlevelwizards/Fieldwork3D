import test from 'node:test';
import assert from 'node:assert/strict';
import {BELT_PROFILES,BELT_STYLES,canonicalBeltStyle,beltStyleForEquipment} from '../src/operator-belt-profile.ts';
import {EQUIPMENT_CATALOG} from '../src/equipment-catalog.ts';
import {initialWardrobe,readWardrobe,wardrobeItemsForSlot,resolvedWardrobe} from '../src/operator-wardrobe-data.ts';
import {initialEquipmentLoadout,readEquipmentLoadout} from '../src/equipment-loadouts.ts';
import {selectWardrobeItem} from '../src/operator-wardrobe-unified.ts';
test('BT0: four physical belts and none; stable identifiers and catalog stats',()=>{
 assert.equal(BELT_STYLES.length,5);
 assert.equal(wardrobeItemsForSlot('beltStyle').length,5);
 for(const style of BELT_STYLES){
  const p=BELT_PROFILES[style],e=EQUIPMENT_CATALOG[p.equipment];
  assert.equal(e.capacity,p.capacity);assert.equal(e.massKg,p.massKg);assert.equal(e.bulk,p.bulk);
  const selected=selectWardrobeItem(initialEquipmentLoadout(),initialWardrobe(),'beltStyle',style);
  assert.equal(selected.kit.slots.belt,p.equipment);
  assert.equal(resolvedWardrobe(selected.wardrobe,selected.kit).beltStyle,style);
  assert.equal(readEquipmentLoadout(selected.kit,'carbine').slots.belt,p.equipment);
 }
});
test('BT0: legacy identifiers and appearances remain readable without issuing equipment',()=>{
 assert.equal(canonicalBeltStyle('light-belt'),'plain-belt');
 assert.equal(readWardrobe({version:1,styles:{beltStyle:'light-belt'}}).styles.beltStyle,'plain-belt');
 assert.equal(beltStyleForEquipment('belt-standard','padded-belt'),'padded-belt');
 assert.equal(beltStyleForEquipment('belt-none','battle-belt'),'no-belt');
 assert.equal(canonicalBeltStyle('__proto__'),undefined);
});
