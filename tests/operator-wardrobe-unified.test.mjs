import test from 'node:test';
import assert from 'node:assert/strict';
import {bareLabEquipment} from '../src/operator-lab-baseline.ts';
import {initialWardrobe,resolvedWardrobe} from '../src/operator-wardrobe-data.ts';
import {selectWardrobeItem} from '../src/operator-wardrobe-unified.ts';
test('one headgear selection equips and displays that exact class',()=>{
 const bare=bareLabEquipment();
 let result=selectWardrobeItem(bare,initialWardrobe(),'headwear','high-cut-rails');
 assert.equal(result.kit.slots.head,'head-helmet');
 assert.equal(resolvedWardrobe(result.wardrobe,result.kit).headwear,'high-cut-rails');
 result=selectWardrobeItem(result.kit,result.wardrobe,'headwear','beanie');
 assert.equal(result.kit.slots.head,'head-cap');
 assert.equal(resolvedWardrobe(result.wardrobe,result.kit).headwear,'beanie');
 result=selectWardrobeItem(result.kit,result.wardrobe,'headwear','bare');
 assert.equal(result.kit.slots.head,'head-none');
});
test('clothing, protection, carry and gloves are chosen with one control',()=>{
 let kit=bareLabEquipment(),wardrobe=initialWardrobe();
 const choices=[['armorStyle','plate-jpc','armor','armor-carrier'],
  ['rigStyle','full-chest','rig','rig-full'],
  ['beltStyle','battle-belt','belt','belt-standard'],
  ['packStyle','medic-pack','backpack','backpack-field'],
  ['top','combat-shirt','top','top-uniform'],
  ['trousers','jeans','legs','legs-light'],
  ['footwear','sneakers','feet','feet-light'],
  ['gloves','gloves-heavy','hands','hands-gloves'],
  ['armorStyle','armor-bare','armor','armor-none'],
  ['beltStyle','no-belt','belt','belt-none']];
 for(const [category,id,slot,value] of choices){
  ({kit,wardrobe}=selectWardrobeItem(kit,wardrobe,category,id));
  assert.equal(kit.slots[slot],value,category+':'+id);
  assert.equal(resolvedWardrobe(wardrobe,kit)[category],id,category+':'+id);
 }
 const result=selectWardrobeItem(kit,wardrobe,'armorStyle','does-not-exist');
 assert.equal(result.kit,kit);
});
