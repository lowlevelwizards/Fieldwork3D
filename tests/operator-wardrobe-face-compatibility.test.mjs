import test from 'node:test';
import assert from 'node:assert/strict';
import {initialWardrobe,setWardrobeStyle,
 resolvedWardrobe,wardrobeConflicts} from '../src/operator-wardrobe-data.ts';
import {initialEquipmentLoadout,setEquipmentChoice} from '../src/equipment-loadouts.ts';
test('face and headset assembly refuses incompatible combinations',()=>{
 const kit=initialEquipmentLoadout();
 let w=initialWardrobe();
 w=setWardrobeStyle(w,'facewear','gas-mask');
 w=setWardrobeStyle(w,'eyewear','sunglasses');
 w=setWardrobeStyle(w,'headset','helmet-ears');
 const resolved=resolvedWardrobe(w,kit);
 assert.equal(resolved.eyewear,'eyes-none');
 assert.ok(wardrobeConflicts(w,kit).includes('eyewear'));
 assert.ok(wardrobeConflicts(w,kit).includes('headset'));
 const cap=setEquipmentChoice(kit,'head','head-cap');
 w=setWardrobeStyle(w,'facewear','face-none');
 w=setWardrobeStyle(w,'headwear','beanie');
 assert.equal(resolvedWardrobe(w,cap).headset,'comms-none');
});
