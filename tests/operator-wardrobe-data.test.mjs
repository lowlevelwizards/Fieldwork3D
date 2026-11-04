import test from 'node:test';
import assert from 'node:assert/strict';
import {WARDROBE_SLOTS,wardrobeItemsForSlot,
 readWardrobe,initialWardrobe,setWardrobeStyle,
 resolvedWardrobe,wardrobeConflicts} from '../src/operator-wardrobe-data.ts';
import {initialEquipmentLoadout,setEquipmentChoice} from '../src/equipment-loadouts.ts';
test('all active wardrobe categories are distinct and dropped legacy data stays dropped',()=>{
 for(const slot of WARDROBE_SLOTS){
  const entries=wardrobeItemsForSlot(slot);
  assert.ok(entries.length>0,slot);
  assert.equal(new Set(entries.map(i=>i.id)).size,entries.length);
 }
 assert.deepEqual(readWardrobe({version:900}),initialWardrobe());
 const malformed=readWardrobe({version:1,
  styles:{top:'t-shirt',trousers:'jeans',headwear:'beanie'},
  patterns:{top:'flecktarn'},palette:999});
 assert.equal(malformed.styles.top,undefined);
 assert.equal(malformed.styles.trousers,undefined);
 assert.equal(malformed.styles.headwear,'beanie');
 assert.ok(!('patterns' in malformed));
 assert.ok(!('palette' in malformed));
});
test('cosmetics never create armor or carrying capacity',()=>{
 let kit=initialEquipmentLoadout();
 let w=setWardrobeStyle(initialWardrobe(),'headwear','beanie');
 // Headwear style is cosmetic; only the equipped kit determines protection.
 assert.equal(resolvedWardrobe(w,kit).headwear,'beanie');
 assert.deepEqual(wardrobeConflicts(w,kit),[]);
 kit=setEquipmentChoice(kit,'head','head-cap');
 assert.equal(resolvedWardrobe(w,kit).headwear,'beanie');
 kit=setEquipmentChoice(kit,'armor','armor-none');
 w=setWardrobeStyle(w,'armorStyle','plate-heavy');
 assert.equal(resolvedWardrobe(w,kit).armorStyle,'armor-bare');
 assert.equal(kit.slots.armor,'armor-none');
 assert.equal(setWardrobeStyle(w,'top','flannel'),w,
  'removed garment options can no longer be selected');
});