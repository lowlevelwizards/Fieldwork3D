import test from 'node:test';
import assert from 'node:assert/strict';
import {WARDROBE_SLOTS,wardrobeItemsForSlot,
 readWardrobe,initialWardrobe,setWardrobeStyle,setWardrobePattern,
 resolvedWardrobe,wardrobeConflicts} from '../src/operator-wardrobe-data.ts';
import {initialEquipmentLoadout,setEquipmentChoice} from '../src/equipment-loadouts.ts';
test('all wardrobe categories have unique identifiers, and malformed input is safe',()=>{
 for(const slot of WARDROBE_SLOTS){
  const entries=wardrobeItemsForSlot(slot);
  assert.ok(entries.length>0,slot);
  assert.equal(new Set(entries.map(i=>i.id)).size,entries.length);
 }
 assert.deepEqual(readWardrobe({version:900}),initialWardrobe());
 const malformed=readWardrobe({version:1,styles:{top:'fake',headwear:'beanie'},
  patterns:{top:'INVALID',pack:'woodland'},palette:999});
 assert.equal(malformed.styles.top,undefined);
 assert.equal(malformed.styles.headwear,'beanie');
 assert.equal(malformed.patterns.pack,'woodland');
 assert.equal(malformed.palette,0);
});
test('cosmetic recipes cannot silently claim protection or carrying capacity',()=>{
 let kit=initialEquipmentLoadout();
 let w=setWardrobeStyle(initialWardrobe(),'headwear','beanie');
 assert.equal(resolvedWardrobe(w,kit).headwear,'ach');
 assert.deepEqual(wardrobeConflicts(w,kit),['headwear']);
 kit=setEquipmentChoice(kit,'head','head-cap');
 assert.equal(resolvedWardrobe(w,kit).headwear,'beanie');
 kit=setEquipmentChoice(kit,'armor','armor-none');
 w=setWardrobeStyle(w,'armorStyle','plate-heavy');
 assert.equal(resolvedWardrobe(w,kit).armorStyle,'armor-bare');
 assert.equal(kit.slots.armor,'armor-none');
 assert.equal(setWardrobePattern(w,'top','flecktarn').patterns.top,'flecktarn');
});
