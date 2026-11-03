import test from 'node:test';
import assert from 'node:assert/strict';
import {bareLabEquipment} from '../src/operator-lab-baseline.ts';
import {initialWardrobe,resolvedWardrobe} from '../src/operator-wardrobe-data.ts';
import {selectWardrobeItem} from '../src/operator-wardrobe-unified.ts';
test('one real headgear selection equips and displays its exact class',()=>{
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
test('clothing, equipment and gloves are selected with one item card',()=>{
 let kit=bareLabEquipment(),wardrobe=initialWardrobe();
 const choices=[['armorStyle','plate-jpc','armor','armor-carrier'],
  ['rigStyle','full-chest','rig','rig-full'],
  ['beltStyle','battle-belt','belt','belt-standard'],
  ['packStyle','medic-pack','backpack','backpack-field'],
  ['top','bdu-shirt','top','top-uniform'],
  ['top','acu-shirt','top','top-uniform'],
  ['trousers','bdu-trousers','legs','legs-field'],
  ['trousers','acu-trousers','legs','legs-field'],
  ['footwear','field-boots','feet','feet-boots'],
  ['gloves','gloves-field','hands','hands-gloves'],
  ['armorStyle','armor-bare','armor','armor-none'],
  ['beltStyle','no-belt','belt','belt-none']];
 for(const [category,id,slot,value] of choices){
  ({kit,wardrobe}=selectWardrobeItem(kit,wardrobe,category,id));
  assert.equal(kit.slots[slot],value,category+':'+id);
  assert.equal(resolvedWardrobe(wardrobe,kit)[category],id,category+':'+id);
 }
 const result=selectWardrobeItem(kit,wardrobe,'armorStyle','does-not-exist');
 assert.equal(result.kit,kit);
 assert.equal(selectWardrobeItem(kit,wardrobe,'top','t-shirt').kit,kit);
});